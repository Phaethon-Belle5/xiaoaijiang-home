/**
 * 把云端背景切成图床图片 + 随机 20 秒轮播（直接写 KV，不经过站内登录）
 *
 *   node switch-bg.mjs "https://img.231060101.xyz/file/背景/1.jpg" "https://…/2.jpg" …
 *   node switch-bg.mjs --restore          # 恢复成切换前的样子（视频）
 *   node switch-bg.mjs --show             # 只看当前云端配置
 *
 * 会先把原值备份到 wallpaper-backup-<时间>.json
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const NS = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:wallpaper';
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/storage/kv/namespaces/${NS}/values/${KEY}`;
const TOKEN = readFileSync('.cf_token', 'utf8').trim();
const H = { Authorization: 'Bearer ' + TOKEN };

const args = process.argv.slice(2);

async function read() {
  const r = await fetch(API, { headers: H, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('读 KV 失败 HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return await r.json();
}
async function write(obj) {
  const r = await fetch(API, {
    method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify(obj), signal: AbortSignal.timeout(25000),
  });
  const t = await r.text();
  if (!r.ok) throw new Error('写 KV 失败 HTTP ' + r.status + ' ' + t.slice(0, 200));
  return t;
}

if (args[0] === '--show' || args.length === 0) {
  const cur = await read();
  console.log('  当前云端 site:wallpaper：');
  console.log('    type     =', cur.type);
  console.log('    interval =', cur.interval);
  console.log('    images   =', (cur.images || []).length, '张');
  (cur.images || []).forEach((u, i) => console.log('      [' + i + '] ' + u));
  console.log('    videos   =', (cur.videos || []).length, '个');
  process.exit(0);
}

if (args[0] === '--restore') {
  const files = readdirSync('.').filter(f => f.startsWith('wallpaper-backup-')).sort();
  if (!files.length) { console.log('  ❌ 没有备份文件'); process.exit(1); }
  const last = files[files.length - 1];
  const obj = JSON.parse(readFileSync(last, 'utf8'));
  await write(obj);
  console.log('  ✅ 已恢复到 ' + last + '（type=' + obj.type + ', images=' + (obj.images || []).length + ', videos=' + (obj.videos || []).length + '）');
  process.exit(0);
}

const urls = args.flatMap(a => String(a).split(/[\s,，、]+/)).map(s => s.trim()).filter(Boolean);
const bad = urls.filter(u => !/^https?:\/\//i.test(u));
if (bad.length || !urls.length) { console.log('  ❌ 参数里不是合法地址：' + JSON.stringify(bad)); process.exit(1); }

// ① 先探每个地址真的能取到图片
console.log('  逐个检查地址是否可用：');
const good = [];
for (const u of urls) {
  try {
    const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-2047' }, signal: AbortSignal.timeout(20000) });
    const ct = (r.headers.get('content-type') || '').split(';')[0];
    const ok = r.ok && /^image\//.test(ct);
    console.log('    ' + (ok ? '✅' : '❌') + ' HTTP ' + r.status + '  ' + ct.padEnd(14) + '  ' + u.slice(0, 90));
    if (ok) good.push(u);
  } catch (e) {
    console.log('    ❌ 取不到  ' + (e.cause ? e.cause.code : e.message).toString().slice(0, 40) + '  ' + u.slice(0, 80));
  }
}
if (!good.length) { console.log('\n  ❌ 没有一个是能用的图片地址，未修改云端'); process.exit(1); }

// ② 备份原值
const cur = await read();
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = 'wallpaper-backup-' + stamp + '.json';
writeFileSync(backup, JSON.stringify(cur, null, 2));
console.log('\n  已备份原配置 → ' + backup);
console.log('    (type=' + cur.type + ', images=' + (cur.images || []).length + ', videos=' + (cur.videos || []).length + ')');

// ③ 写入新配置：图片轮播 + 20 秒
const next = {
  ...cur,
  type: 'image',
  images: good,
  interval: 20,
  videos: cur.videos || [],   // 保留视频列表，随时可以切回去
};
await write(next);
console.log('\n  ✅ 已写入云端：type=image, images=' + good.length + ', interval=20');

// ④ 读回来确认
const check = await read();
console.log('\n  读回确认：type=' + check.type + '  interval=' + check.interval + '  images=' + (check.images || []).length);
(check.images || []).forEach((u, i) => console.log('    [' + i + '] ' + u));
