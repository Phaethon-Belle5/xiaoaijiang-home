import './cf-dns-fix.mjs';   // api.cloudflare.com 的 DNS 被污染，这里强制用正确 IP
// 可靠的 Worker 部署：multipart 上传 + 回读校验（deploy.mjs 的兜底分支会静默不生效）
import { readFile } from 'node:fs/promises';

const SRC = process.argv[2] || 'B:/dell/Documents/harness/main-worker/worker.js';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const SCRIPT = 'xiaoaijiang-api';
const BASE = 'https://api.cloudflare.com/client/v4';

const cfg = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8');
const tok = cfg.match(/oauth_token\s*=\s*"([^"]+)"/)[1];
const H = { Authorization: 'Bearer ' + tok };

const code = await readFile(SRC, 'utf8');
console.log(`源码: ${SRC}  (${code.length} bytes)`);

const bindings = [
  { type: 'kv_namespace', name: 'STORE', namespace_id: '14330ec39ac64891be778253e78e1cf7' },
  { type: 'r2_bucket', name: 'BUCKET', bucket_name: 'home1xiaoaijiangcloud' },
  // D1：getGallery() 用它把 photos.city_key 补成照片的 location（主站地图靠 location 点亮城市）
  { type: 'd1', name: 'DB', id: '8e2355cf-b432-4145-916f-dc7620ac6ae0' },
];
for (const [file, name] of [['.site_password', 'SITE_PASSWORD'], ['.github_client_id', 'GITHUB_CLIENT_ID'], ['.github_client_secret', 'GITHUB_CLIENT_SECRET'], ['.netease_cookie', 'NETEASE_COOKIE']]) {
  try { bindings.push({ type: 'plain_text', name, text: (await readFile('C:/Users/dell/Desktop/web/03-后端Worker/主站-worker/' + file, 'utf8')).trim() }); }
  catch (e) { console.log('  (缺少 ' + file + '，跳过绑定 ' + name + ')'); }
}
console.log('绑定: ' + bindings.map(b => b.name).join(', '));

const metadata = {
  main_module: 'worker.js',
  compatibility_date: '2025-01-01',
  bindings,
};

const form = new FormData();
form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
form.set('worker.js', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');

const put = await fetch(`${BASE}/accounts/${ACCT}/workers/scripts/${SCRIPT}`, {
  method: 'PUT', headers: H, body: form,
});
const putJson = await put.json();
console.log('PUT HTTP ' + put.status + ' success=' + putJson.success);
if (putJson.errors && putJson.errors.length) console.log('  errors: ' + JSON.stringify(putJson.errors).slice(0, 300));
if (putJson.result) console.log('  deployment_id=' + putJson.result.deployment_id + '  modified=' + putJson.result.modified_on);

// 回读校验：确认线上代码就是我们上传的这份
await new Promise(r => setTimeout(r, 3000));
const back = await fetch(`${BASE}/accounts/${ACCT}/workers/scripts/${SCRIPT}/content/v2`, {
  headers: { ...H, 'CF-WORKER-BODY-PART': 'worker' },
});
const live = await back.text();
const ok = live.includes('async function getGallery(') && !live.includes('await getGalleryWithR2()');
console.log('\n=== 回读校验 ===');
console.log('  线上 bytes=' + live.length + '  本地 bytes=' + code.length + '  (差异来自行尾规范化)');
console.log('  含 getGallery(     : ' + live.includes('async function getGallery('));
console.log('  仍调用 WithR2      : ' + live.includes('await getGalleryWithR2()'));
console.log(ok ? '\n✅ 部署已生效' : '\n❌ 部署未生效');
