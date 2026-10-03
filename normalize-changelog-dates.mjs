/**
 * 只在必要时规范化 changelog 的日期格式（2026-9-01 → 2026-09-01），
 * 其它字段一律原样保留（用户可能已在后台改过内容）。
 */
import './cf-dns-fix.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
const KV = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:changelog';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
const H = { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };

const url = `${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(KEY)}`;
const cur = await (await fetch(url, { headers: H })).json();
if (!Array.isArray(cur)) { console.log('读不到数组，放弃'); process.exit(1); }
await writeFile('B:/dell/Documents/harness/kv-changelog-before-norm.json', JSON.stringify(cur, null, 2));

let changed = 0;
const norm = d => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(d || '').trim());
  return m ? (m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)) : String(d || '').trim();
};
const fixed = cur.map(it => {
  const o = Object.assign({}, it);
  const before = String(o.date || '');
  const after = norm(before);
  if (after !== before) { console.log('  修正 ' + before + ' → ' + after + '  [' + (o.title || '').slice(0, 26) + ']'); changed++; o.date = after; }
  return o;
});

if (!changed) { console.log('  所有日期格式都规范，无需改动'); process.exit(0); }
const put = await fetch(url, { method: 'PUT', headers: H, body: JSON.stringify(fixed) });
const pj = await put.json().catch(() => ({}));
console.log('  写入: HTTP ' + put.status + '  success=' + pj.success + '  共修 ' + changed + ' 条 / ' + fixed.length + ' 条');

console.log('\n  当前顺序（规范化后按时间倒序应为）：');
[...fixed].sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach((it, i) =>
  console.log('   ' + (i + 1) + '. ' + it.date + ' [' + (it.tag || '') + '] ' + String(it.title).slice(0, 30) + (it.pinned ? '  ★置顶' : '')));
