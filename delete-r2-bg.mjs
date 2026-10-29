/**
 * 真删 R2 桶里 MP4/ 下的旧背景视频，并验证删干净
 *   node delete-r2-bg.mjs --dry   只列不删
 *   node delete-r2-bg.mjs         执行删除
 */
import { readFileSync } from 'node:fs';

const TOKEN = readFileSync('.cf_token', 'utf8').trim();
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BUCKET = 'home1xiaoaijiangcloud';
const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/r2/buckets/${BUCKET}/objects`;
const H = { Authorization: 'Bearer ' + TOKEN };
const dry = process.argv.includes('--dry');

async function list() {
  const out = [];
  let cursor = '';
  for (let page = 0; page < 20; page++) {
    const u = BASE + '?prefix=MP4/&per_page=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(40000) });
    const j = await r.json();
    if (!j.success) throw new Error('列对象失败: ' + JSON.stringify(j.errors));
    out.push(...j.result);
    cursor = (j.result_info && j.result_info.cursor) || '';
    if (!cursor || !j.result.length) break;
  }
  return out;
}

const objs = await list();
console.log('  MP4/ 下共 ' + objs.length + ' 个对象：');
objs.forEach((o, i) => console.log('    [' + i + '] ' + o.key + '   ' + (o.size / 1024 / 1024).toFixed(1) + ' MB'));
console.log('  合计 ' + (objs.reduce((s, o) => s + (o.size || 0), 0) / 1024 / 1024).toFixed(1) + ' MB');

if (dry) { console.log('\n  （--dry 不删除）'); process.exit(0); }
if (!objs.length) { console.log('\n  已经是空的'); process.exit(0); }

console.log('\n  开始删除：');
let okN = 0, failN = 0;
for (const o of objs) {
  // key 里的 / 要编码，中文也要编码
  const enc = o.key.split('/').map(encodeURIComponent).join('%2F');
  let done = false;
  for (let a = 1; a <= 3 && !done; a++) {
    try {
      const r = await fetch(BASE + '/' + enc, { method: 'DELETE', headers: H, signal: AbortSignal.timeout(60000) });
      const j = await r.json();
      if (j.success) { console.log('    ✅ 已删 ' + o.key); okN++; done = true; }
      else { console.log('    ❌ ' + o.key + '  ' + JSON.stringify(j.errors).slice(0, 120)); }
    } catch (e) {
      if (a === 3) { console.log('    ❌ ' + o.key + '  ' + (e.cause ? e.cause.code : e.message).toString().slice(0, 40)); failN++; }
    }
  }
}
console.log('\n  删除结果：成功 ' + okN + ' / 失败 ' + failN);

// 再列一次确认
const after = await list();
console.log('\n  复查 MP4/ 剩余 ' + after.length + ' 个对象');
if (after.length) after.forEach(o => console.log('    仍存在: ' + o.key));
else console.log('  ✅ MP4/ 已清空');
