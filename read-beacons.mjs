// 读取 /beacon 回传（从 KV 直接读），看每台设备实际跑的是什么版本
import { readFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
const KV = '14330ec39ac64891be778253e78e1cf7';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
if (!TOK) { const c = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8'); TOK = (c.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
const H = { Authorization: 'Bearer ' + TOK };

const list = await (await fetch(`${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/keys?prefix=beacon%3A&limit=100`, { headers: H })).json();
if (!list.success) { console.log('读取失败: ' + JSON.stringify(list.errors).slice(0, 160)); process.exit(1); }
const keys = (list.result || []).map(k => k.name).sort();
console.log('共 ' + keys.length + ' 条回传\n');
if (!keys.length) { console.log('（还没有回传 —— 说明这段时间内没有浏览器加载过页面，或页面还是旧版没有 beacon 代码）'); process.exit(0); }

const UA = 'Mozilla/5.0';
for (const k of keys.slice(-25)) {
  const r = await fetch(`${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(k)}`, { headers: H });
  let j; try { j = JSON.parse(await r.text()); } catch (e) { continue; }
  console.log('────────────────────────────────────────');
  console.log('  时间      ' + j.ts);
  console.log('  构建      ' + (j.构建 || '(空)'));
  console.log('  视口      ' + j.视口 + '   国家 ' + j.国家);
  console.log('  数据      说说 ' + j.说说条数 + ' 条 / 带标签 ' + j.带标签 + ' / 更新日志 ' + j.更新日志条数 + ' 条 / 云同步:' + j.云同步);
  console.log('  渲染      日志卡 ' + j.日志卡条目 + ' 条 / 标签chip ' + j.标签chip数 + ' 个');
  if (j.渲染错误 && j.渲染错误.length) console.log('  渲染错误  ' + JSON.stringify(j.渲染错误));
  console.log('  UA        ' + String(j.UA || '').slice(0, 120));
}
