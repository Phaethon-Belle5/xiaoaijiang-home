// 查省份封面到底存进去没有
import './cf-dns-fix.mjs';
import { readFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const DB = '8e2355cf-b432-4145-916f-dc7620ac6ae0';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();

console.log('=== 接口 GET /province-covers ===');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const r = await fetch('https://mapi.231060101.xyz/province-covers', { headers: { 'User-Agent': UA } });
console.log('  HTTP ' + r.status + '  ' + JSON.stringify(await r.json()).slice(0, 260));

console.log('\n=== D1 site_stats 里 pc: 开头的键 ===');
const q = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/d1/database/${DB}/query`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql: "SELECT key, substr(val,1,70) AS val FROM site_stats WHERE key LIKE 'pc:%'" }),
});
const j = await q.json();
if (!j.success) console.log('  查询失败: ' + JSON.stringify(j.errors).slice(0, 200));
else console.log('  ' + JSON.stringify((j.result[0] && j.result[0].results) || []).slice(0, 400));

console.log('\n=== site_stats 表结构（看 key 有没有唯一约束）===');
const q2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/d1/database/${DB}/query`, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql: "SELECT sql FROM sqlite_master WHERE name='site_stats' OR name LIKE 'sqlite_autoindex_site_stats%'" }),
});
const j2 = await q2.json();
if (j2.success) (j2.result[0].results || []).forEach(x => console.log('  ' + String(x.sql).slice(0, 220)));
else console.log('  失败: ' + JSON.stringify(j2.errors).slice(0, 160));
