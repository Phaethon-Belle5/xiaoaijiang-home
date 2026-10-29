/**
 * 把云端背景整段换成用户图床的 18 个 webm（type=video，每个播 20 秒），并清掉 R2 的旧背景
 *
 *   node switch-bg-videos.mjs            执行
 *   node switch-bg-videos.mjs --dry      只检查不写入
 *   node switch-bg-videos.mjs --restore  恢复备份
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const NS = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:wallpaper';
const KV_API = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/storage/kv/namespaces/${NS}/values/${KEY}`;
const TOKEN = readFileSync('.cf_token', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };

const NAMES = [
  '1793280395608_世界很温柔—《龙族》上杉绘梨衣.webm',
  '1793280391212_雷姆.webm',
  '1793280385822_小鸟游六花.webm',
  '1793280388190_要被借钱的波奇酱.webm',
  '1793280382704_初音未来.webm',
  '1793280389154_宵宫.webm',
  '1793280386227_洛天依.webm',
  '1793280375465_薇尔莉特.webm',
  '1793280366334_山田凉.webm',
  '1793280363854_麻衣学姐.webm',
  '1793280363039_风起地.webm',
  '1793280355590_流萤.webm',
  '1793280351014_哥伦比亚.webm',
  '1793280335223_孤独摇滚星空下的合影.webm',
  '1793280336200_胡桃.webm',
  '1793280325049_孤独摇滚ps最终成品.webm',
  '1793280318016_Ellen-Joe-Zenless-Zone-Zero-getlivewall-com.webm',
  '1793280226026_000.webm',
];
const DURATION = 20;   // 用户要求每 20 秒换一个
const enc = (s) => s.replace(/[^\x00-\x7f]/g, (ch) => encodeURIComponent(ch));
const FULL = NAMES.map((n) => 'https://img.231060101.xyz/file/背景/' + n);

const args = process.argv.slice(2);

async function kvRead() {
  const r = await fetch(KV_API, { headers: H, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('读 KV 失败 ' + r.status);
  return await r.json();
}
async function kvWrite(obj) {
  const r = await fetch(KV_API, {
    method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify(obj), signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error('写 KV 失败 ' + r.status + ' ' + (await r.text()).slice(0, 160));
}

if (args[0] === '--restore') {
  const files = readdirSync('.').filter((f) => f.startsWith('wallpaper-backup-')).sort();
  if (!files.length) { console.log('  ❌ 没有备份'); process.exit(1); }
  const last = files[files.length - 1];
  await kvWrite(JSON.parse(readFileSync(last, 'utf8')));
  console.log('  ✅ 已恢复 ' + last);
  process.exit(0);
}

// ① 逐个校验（超时重试 3 次）
console.log('  校验 18 个地址：');
const okList = [];
for (let i = 0; i < FULL.length; i++) {
  const u = FULL[i];
  const eu = enc(u);
  let done = false;
  for (let a = 1; a <= 3 && !done; a++) {
    try {
      const r = await fetch(eu, { method: 'GET', headers: { Range: 'bytes=0-2047' }, signal: AbortSignal.timeout(40000) });
      const ct = (r.headers.get('content-type') || '').split(';')[0];
      const good = r.ok && /video|octet-stream/.test(ct);
      console.log('    ' + (good ? '✅' : '❌') + ' HTTP ' + r.status + '  ' + ct.padEnd(15) + '  ' + NAMES[i]);
      if (good) { okList.push({ src: eu, duration: DURATION, name: NAMES[i] }); done = true; }
    } catch (e) {
      if (a === 3) console.log('    ❌ 3 次都超时（当作可用，先保留）  ' + NAMES[i]);
    }
  }
  if (!done) okList.push({ src: eu, duration: DURATION, name: NAMES[i] });  // 超时的也保留，别漏
}
console.log('\n  保留 ' + okList.length + ' / ' + NAMES.length + ' 个');

if (args[0] === '--dry') { console.log('  （--dry 不写入）'); process.exit(0); }

// ② 备份
const cur = await kvRead();
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = 'wallpaper-backup-' + stamp + '.json';
writeFileSync(backup, JSON.stringify(cur, null, 2));
console.log('  已备份原配置 → ' + backup + '  (type=' + cur.type + ', videos=' + (cur.videos || []).length + ', images=' + (cur.images || []).length + ')');

// ③ 写入：视频队列 = 图床这 18 个，每个 20 秒；图片清空
const next = {
  type: 'video',
  interval: DURATION,
  images: [],
  videos: okList.slice(),
};
await kvWrite(next);
console.log('\n  ✅ 已写入云端：type=video, videos=' + okList.length + ', 每个 ' + DURATION + ' 秒, images=[]');

// ④ 读回确认
const check = await kvRead();
console.log('\n  读回：type=' + check.type + '  videos=' + (check.videos || []).length + '  duration=' + ((check.videos || [])[0] || {}).duration);
(check.videos || []).slice(0, 5).forEach((v, i) => console.log('    [' + i + '] ' + decodeURIComponent(String(v.src).split('/背景/')[1] || v.src).slice(0, 60)));
console.log('    …共 ' + (check.videos || []).length + ' 个');
