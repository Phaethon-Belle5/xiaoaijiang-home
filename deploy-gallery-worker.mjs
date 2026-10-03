import './cf-dns-fix.mjs';   // api.cloudflare.com 的 DNS 被污染，这里强制用正确 IP
// 映像馆后端（map-gallery-api）部署：multipart 上传 + 回读校验
import { readFile } from 'node:fs/promises';

const SRC = process.argv[2] || 'C:/Users/dell/Desktop/web/_repo/map-gallery-worker/worker.js';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const SCRIPT = 'map-gallery-api';
const BASE = 'https://api.cloudflare.com/client/v4';

const cfg = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8');
const tok = cfg.match(/oauth_token\s*=\s*"([^"]+)"/)[1];
const H = { Authorization: 'Bearer ' + tok };

const code = await readFile(SRC, 'utf8');
console.log('源码: ' + SRC + '  (' + code.length + ' bytes)');

const bindings = [
  { type: 'd1', name: 'DB', id: '8e2355cf-b432-4145-916f-dc7620ac6ae0' },
  { type: 'r2_bucket', name: 'BUCKET', bucket_name: 'home1xiaoaijiangcloud' },
];
for (const [file, name] of [['.site_password', 'SITE_PASSWORD']]) {
  for (const base of ['C:/Users/dell/Desktop/web/03-后端Worker/主站-worker/', 'C:/Users/dell/Desktop/web/_repo/map-gallery-worker/']) {
    try { bindings.push({ type: 'plain_text', name, text: (await readFile(base + file, 'utf8')).trim() }); break; }
    catch (e) {}
  }
}
console.log('绑定: ' + bindings.map(b => b.name).join(', '));

const metadata = { main_module: 'worker.js', compatibility_date: '2025-01-01', bindings };
const form = new FormData();
form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
form.set('worker.js', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');

const put = await fetch(`${BASE}/accounts/${ACCT}/workers/scripts/${SCRIPT}`, { method: 'PUT', headers: H, body: form });
const pj = await put.json();
console.log('PUT HTTP ' + put.status + ' success=' + pj.success);
if (pj.errors && pj.errors.length) console.log('  errors: ' + JSON.stringify(pj.errors).slice(0, 300));

await new Promise(r => setTimeout(r, 3000));
const back = await fetch(`${BASE}/accounts/${ACCT}/workers/scripts/${SCRIPT}/content/v2`, { headers: { ...H, 'CF-WORKER-BODY-PART': 'worker' } });
const live = await back.text();
const ok = live.includes('/province-covers') && live.includes('/province-cover');
console.log('\n=== 回读校验 ===');
console.log('  线上 bytes=' + live.length + '  本地 bytes=' + code.length);
console.log('  含 /province-covers : ' + live.includes('/province-covers'));
console.log('  含 /province-cover  : ' + live.includes('/province-cover'));
console.log(ok ? '\n✅ 部署已生效' : '\n❌ 部署未生效');
