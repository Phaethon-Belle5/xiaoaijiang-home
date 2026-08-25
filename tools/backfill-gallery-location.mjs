// 把改名前 jpg 条目上的「地点」标注回填到改名后的 webp 条目。
//
// 背景：映像馆照片由 jpg 转成 webp 并重命名，旧 KV 条目按旧文件名索引，
// 与新文件名对不上，导致 62 条人工地点标注在页面上消失。
//
// 匹配依据是文件名里的拍摄日期（旧名 IMG_YYYYMMDD_HHMMSS 为安卓相机命名，
// 新名以 YYYYMMDD 开头）。同一天地点唯一时可直接判定；
// 同一天跨越两地的用 MANUAL 逐张指定。
//
// 用法（worker/ 目录下）：
//   node ../tools/backfill-gallery-location.mjs --dry
//   node ../tools/backfill-gallery-location.mjs --write

import { execFileSync } from 'node:child_process';

const NS = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:gallery';
const R2 = 'https://pub-1a72165d30ad42fc81dae51cefb3cdfc.r2.dev/';
const GALLERY_PREFIX = '映像馆/webp/';
const WRITE = process.argv.includes('--write');

// 同日跨两地、或旧数据里没有对应日期的，逐张指定。
const MANUAL = {
  '20260824武功山不知名观景台': '萍乡',
  '20260720朋友拍的青岛1': '青岛',
  '20260720朋友拍的青岛': '青岛',
  '20260405老舍故居': '济南',
  '20260405大明湖畔的夏雨荷': '济南',
  '20260405大明湖的夕阳': '济南',
  '20260405超然楼': '济南',
  '20260405趵突泉景区内': '济南',
  '20260405艺术品': '济南',
  '20260405画': '济南',
  '20260405黎明前的等待': '泰安',
  '20260405黎明前的等待1': '泰安',
  '20260120朋友拍的万国建筑群': '上海',
  '20260120朋友拍的陆家嘴三件套': '上海',
  '20250824祝融峰前的彩云': '衡阳',
  '20250824祝融殿前的等待': '衡阳',
  '20250824祝融殿前的等待1': '衡阳',
  '20250824夕阳下发光的红旗': '衡阳',
  '20250824红旗': '衡阳',
  '20250824武功山的小鹿': '萍乡',
  '20240504朋友带我赛博云游的赛里木湖': '博尔塔拉蒙古自治州',
  '20240504朋友带我赛博云游的赛里木湖1': '博尔塔拉蒙古自治州',
};

// 改名前 62 条 jpg 标注中，同一天地点唯一的日期→地点对照表。
// 直接固化在此，不再依赖 KV 里是否还留着旧 jpg 条目。
const BY_DATE = {
  '17122429': '大同', '17147526': '博尔塔拉蒙古自治州', '17561644': '长沙',
  '20230619': '渭南', '20230811': '安康', '20240404': '大同', '20240506': '朔州',
  '20240930': '朔州', '20250404': '朔州', '20250501': '呼和浩特', '20250502': '包头',
  '20250503': '鄂尔多斯', '20250504': '乌兰察布', '20250628': '安康', '20250808': '安康',
  '20250822': '长沙', '20250823': '衡阳', '20250825': '萍乡', '20260211': '上海',
  '20260212': '上海', '20260214': '上海', '20260403': '太原', '20260404': '泰安',
  '20260823': '吉安',
};

const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };
const stem = u => dec(String(u || '').split('/').pop() || '').replace(/\.[^.]+$/, '');
const kv = args => execFileSync('npx', ['wrangler', 'kv', ...args], {
  encoding: 'utf8', maxBuffer: 1 << 26, shell: process.platform === 'win32',
});

const current = JSON.parse(kv(['key', 'get', KEY, '--namespace-id', NS, '--remote']));
const live = await (await fetch('https://home.xiaoaijiang.cloud/api/data/gallery')).json();
const isGalleryWebp = x => x && String(x.image).includes('/webp/')
  && String(x.image).startsWith(R2);

// KV 里已有的人工标注优先，不覆盖你手填过的内容
const kept = new Map(current.filter(isGalleryWebp).map(x => [stem(x.image), x]));

const filled = [], blank = [];
const overlay = live.filter(isGalleryWebp).map(x => {
  const name = stem(x.image);
  const prev = kept.get(name) || {};
  const d = (name.match(/^(\d{8})/) || [])[1];
  let location = prev.location || MANUAL[name] || '';
  let how = prev.location ? 'kv' : (MANUAL[name] ? 'manual' : '');
  if (!location && d && BY_DATE[d]) {
    location = BY_DATE[d];
    how = 'date';
  }
  (location ? filled : blank).push([name, location, how]);
  return {
    image: x.image,
    caption: prev.caption || x.caption || '',
    date: prev.date || x.date || '',
    location,
  };
});

// 非映像馆条目（外链图片等）原样保留
const keep = current.filter(x => !isGalleryWebp(x));
const next = keep.concat(overlay);

console.log(`webp 条目 ${overlay.length} | 已填地点 ${filled.length} | 仍空白 ${blank.length}`);
console.log(`  按日期判定 ${filled.filter(f => f[2] === 'date').length} | 逐张指定 ${filled.filter(f => f[2] === 'manual').length}`);
if (blank.length) {
  console.log('仍空白：');
  for (const [n] of blank) console.log('  ', n);
}
console.log(`KV 保留旧条目 ${keep.length} 条，写入后共 ${next.length} 条`);

if (!WRITE) {
  console.log('\n(dry-run，未写入；加 --write 生效)');
  process.exit(0);
}
const tmp = new URL('./.gallery-next.json', import.meta.url);
const { writeFileSync, unlinkSync } = await import('node:fs');
writeFileSync(tmp, JSON.stringify(next), 'utf8');
try {
  kv(['key', 'put', KEY, '--namespace-id', NS, '--remote', '--path', decodeURIComponent(tmp.pathname.replace(/^\//, ''))]);
  console.log('已写入 KV');
} finally {
  try { unlinkSync(tmp); } catch {}
}
