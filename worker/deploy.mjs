import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const configPath = join(homedir(), '.wrangler', 'config', 'default.toml');
const configRaw = readFileSync(configPath, 'utf-8');
const tokenMatch = configRaw.match(/oauth_token\s*=\s*"([^"]+)"/);
const TOKEN = tokenMatch ? tokenMatch[1] : '';
const ACCOUNT_ID = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const headers = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/javascript+module' };
const KV_ID = '14330ec39ac64891be778253e78e1cf7';

const script = readFileSync(join(import.meta.dirname || '.', 'worker.js'), 'utf-8');

// ── SITE_PASSWORD 从本地文件读取（.site_password），只存在服务端，绝不下发前端 ──
let SITE_PASSWORD = process.env.SITE_PASSWORD || '';
if (!SITE_PASSWORD) {
  try {
    SITE_PASSWORD = readFileSync(join(import.meta.dirname || '.', '.site_password'), 'utf-8').trim();
  } catch (e) { /* ignore */ }
}
if (!SITE_PASSWORD) {
  console.error('⚠️  未找到 SITE_PASSWORD（环境变量或 .site_password 文件）。部署后管理登录将不可用。');
}

// ── GitHub OAuth（评论登录）从本地文件读取，只存服务端，绝不下发前端 ──
let GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
let GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
if (!GITHUB_CLIENT_ID) {
  try { GITHUB_CLIENT_ID = readFileSync(join(import.meta.dirname || '.', '.github_client_id'), 'utf-8').trim(); } catch (e) { /* ignore */ }
}
if (!GITHUB_CLIENT_SECRET) {
  try { GITHUB_CLIENT_SECRET = readFileSync(join(import.meta.dirname || '.', '.github_client_secret'), 'utf-8').trim(); } catch (e) { /* ignore */ }
}
if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.error('⚠️  未找到 GITHUB_CLIENT_ID/SECRET（环境变量或 .github_client_id / .github_client_secret 文件）。评论的 GitHub 登录将不可用。');
}
// ── 网易云会员 Cookie（可选）：从本地 .netease_cookie 文件读取，只存服务端 ──
let NETEASE_COOKIE = process.env.NETEASE_COOKIE || '';
if (!NETEASE_COOKIE) {
  try { NETEASE_COOKIE = readFileSync(join(import.meta.dirname || '.', '.netease_cookie'), 'utf-8').trim(); } catch (e) { /* optional */ }
}
if (NETEASE_COOKIE) {
  console.log('✅ 已配置网易云会员 Cookie（VIP 歌曲可直链播放）');
}
const bindings = [
  { type: 'kv_namespace', name: 'STORE', namespace_id: KV_ID },
];
if (SITE_PASSWORD) {
  bindings.push({ type: 'plain_text', name: 'SITE_PASSWORD', text: SITE_PASSWORD });
}
if (GITHUB_CLIENT_ID) {
  bindings.push({ type: 'plain_text', name: 'GITHUB_CLIENT_ID', text: GITHUB_CLIENT_ID });
}
if (GITHUB_CLIENT_SECRET) {
  bindings.push({ type: 'plain_text', name: 'GITHUB_CLIENT_SECRET', text: GITHUB_CLIENT_SECRET });
}
if (NETEASE_COOKIE) {
  bindings.push({ type: 'plain_text', name: 'NETEASE_COOKIE', text: NETEASE_COOKIE });
}

// Upload with metadata in header
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/xiaoaijiang-api`;
const metaHeader = JSON.stringify({
  body_part: 'worker',
  bindings,
  compatibility_date: '2025-01-01',
  main_module: 'worker.js',
});

console.log('Uploading worker...');
const resp = await fetch(url, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/javascript',
    'CF-WORKER-BODY-PART': 'worker',
    'CF-WORKER-MAIN-MODULE': 'worker.js',
  },
  body: script,
});
const data = await resp.json();
console.log(`HTTP ${resp.status}:`, JSON.stringify(data, null, 2));

if (data.success) {
  // Enable workers.dev subdomain
  console.log('\nEnabling workers.dev subdomain...');
  const enableResp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/xiaoaijiang-api/subdomain`,
    { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) }
  );
  const enableData = await enableResp.json();
  console.log('Subdomain:', JSON.stringify(enableData, null, 2));

  console.log('\n✅ Done! API should be at: https://xiaoaijiang-api.2918762608.workers.dev');
} else {
  console.log('\nTrying alternative upload method...');

  // Try with multipart
  const form = new FormData();
  const metadata = {
    main_module: 'worker.js',
    bindings,
    compatibility_date: '2025-01-01',
  };
  form.set('metadata', JSON.stringify(metadata));
  form.set('worker.js', new File([script], 'worker.js', { type: 'application/javascript+module' }));

  const resp2 = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${TOKEN}` },
    body: form,
  });
  const data2 = await resp2.json();
  console.log(`HTTP ${resp2.status}:`, JSON.stringify(data2, null, 2));
}
