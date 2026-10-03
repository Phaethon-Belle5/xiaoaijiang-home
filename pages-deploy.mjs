import './cf-dns-fix.mjs';   // api.cloudflare.com 的 DNS 被污染，这里强制用正确 IP
// 通过 Pages Direct Upload API 部署：先取项目 upload-token，再上传 assets，最后创建部署
import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

// Pages Direct Upload 的资源 key 不是 sha256，而是：
//   blake3(base64(文件内容) + 扩展名).hex().slice(0,32)
// 见 wrangler hashFile() 实现；用 wrangler 自带的 blake3-wasm。
const require = createRequire(import.meta.url);
const blake3 = require('C:/Users/dell/AppData/Roaming/npm/node_modules/wrangler/node_modules/blake3-wasm');

function hashFile(buf, filepath) {
  const base64Contents = buf.toString('base64');
  const extension = path.extname(filepath).substring(1);
  return blake3.hash(base64Contents + extension).toString('hex').slice(0, 32);
}

// token 优先从 wrangler 配置读取（避免命令行/控制台传递导致编码破坏）
let TOK = '';
try {
  const cfg = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8');
  TOK = (cfg.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1] || '';
} catch (e) {}
if (!TOK || TOK === 'unused') TOK = process.argv[2] || TOK;
console.log('token 已加载 (len=' + TOK.length + ')');
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const PROJECT = process.argv[3] || 'map-gallery';
const DIR = process.argv[4] || 'B:/dell/Documents/harness/gallery-deploy';
const BRANCH = process.env.PAGES_BRANCH || 'main';
const BASE = 'https://api.cloudflare.com/client/v4';
const AUTH = { Authorization: 'Bearer ' + TOK };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8',
};

async function walk(dir, base = dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, base, out);
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

// 1) 取项目级 upload-token（asset 接口需要它，account token 会被拒）
const tokRes = await fetch(`${BASE}/accounts/${ACCT}/pages/projects/${PROJECT}/upload-token`, { headers: AUTH });
const tokJson = await tokRes.json();
if (!tokJson.success) { console.error('取 upload-token 失败: ' + JSON.stringify(tokJson.errors)); process.exit(1); }
const JWT = tokJson.result.jwt;
console.log('拿到 upload-token (jwt) OK');
const JH = { Authorization: 'Bearer ' + JWT, 'Content-Type': 'application/json' };

// 2) 计算文件 hash（_headers / _redirects 不作为 asset：它们必须走表单文件字段，
//    否则会被当成普通资源返回 500）
const SPECIAL = ['_headers', '_redirects'];
const files = (await walk(DIR)).filter(f => !SPECIAL.includes(f));
const specials = {};
for (const s of SPECIAL) {
  try { specials[s] = await readFile(path.join(DIR, s), 'utf8'); } catch (e) { /* 不存在则跳过 */ }
}
const entries = [];
for (const rel of files) {
  const buf = await readFile(path.join(DIR, rel));
  const hash = hashFile(buf, rel);
  const ext = path.extname(rel).toLowerCase();
  entries.push({ rel, buf, hash, contentType: MIME[ext] || 'application/octet-stream' });
}
console.log(`本地文件 ${entries.length} 个: ` + entries.map(e => e.rel).join(', '));

// 3) check-missing：只上传服务端缺失的
const cmRes = await fetch(`${BASE}/pages/assets/check-missing`, {
  method: 'POST', headers: JH, body: JSON.stringify({ hashes: entries.map(e => e.hash) }),
});
const cmJson = await cmRes.json();
if (!cmJson.success) { console.error('check-missing 失败: ' + JSON.stringify(cmJson.errors)); process.exit(1); }
const missing = new Set(cmJson.result || []);
const toUpload = entries.filter(e => missing.has(e.hash));
console.log(`check-missing: ${missing.size} 个需要上传，${entries.length - toUpload.length} 个已存在`);

// 4) 上传缺失资源（分批，单批上限 40MB / 5000 文件）
const BUCKET_MAX = 38 * 1024 * 1024;
let batch = [], batchSize = 0, uploaded = 0;
const flush = async () => {
  if (!batch.length) return;
  const payload = batch.map(e => ({
    key: e.hash,
    value: e.buf.toString('base64'),
    metadata: { contentType: e.contentType },
    base64: true,
  }));
  const r = await fetch(`${BASE}/pages/assets/upload`, { method: 'POST', headers: JH, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({ success: false, errors: [{ message: 'non-json HTTP ' + r.status }] }));
  if (!j.success) { console.error('上传失败: ' + JSON.stringify(j.errors)); process.exit(1); }
  uploaded += batch.length;
  console.log(`  上传批次 OK (${uploaded}/${toUpload.length})`);
  batch = []; batchSize = 0;
};
for (const e of toUpload) {
  if (batchSize + e.buf.length > BUCKET_MAX && batch.length) await flush();
  batch.push(e); batchSize += e.buf.length;
}
await flush();

// 5) 创建部署：manifest 必须是 multipart 表单字段，且值为 JSON 字符串
//    格式为 { "/路径": "<sha256-hex>" }（不带扩展名，asset 按 hash 存储，MIME 取自上传时的 metadata）
const manifest = {};
for (const e of entries) manifest['/' + e.rel] = e.hash;

const form = new FormData();
form.append('manifest', JSON.stringify(manifest));
form.append('branch', BRANCH);
for (const [name, content] of Object.entries(specials)) {
  form.append(name, new File([content], name));
  console.log('附上特殊文件字段: ' + name);
}
const depRes = await fetch(`${BASE}/accounts/${ACCT}/pages/projects/${PROJECT}/deployments`, {
  method: 'POST', headers: AUTH, body: form,
});
const depJson = await depRes.json();
if (!depJson.success) { console.error('创建部署失败: ' + JSON.stringify(depJson.errors)); process.exit(1); }
const dep = depJson.result;
console.log(`\n=== 部署完成 ===`);
console.log('URL: ' + dep.url);
console.log('ID : ' + dep.id);
console.log('阶段: ' + (dep.latest_stage ? dep.latest_stage.name + '/' + dep.latest_stage.status : 'n/a'));
console.log('\nmanifest 条目:');
for (const [k, v] of Object.entries(manifest)) console.log('   ' + k + '  ->  ' + v.slice(0, 16) + '...');

// 6) upsert-hashes：标记已上传，加速下次部署（失败无影响）
try {
  const uh = await fetch(`${BASE}/pages/assets/upsert-hashes`, {
    method: 'POST', headers: JH, body: JSON.stringify({ hashes: entries.map(e => e.hash) }),
  });
  console.log('\nupsert-hashes: HTTP ' + uh.status);
} catch (e) { console.log('\nupsert-hashes 跳过: ' + e.message); }

