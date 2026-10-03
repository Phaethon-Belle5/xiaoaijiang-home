import './cf-dns-fix.mjs';   // api.cloudflare.com 的 DNS 被污染，这里强制用正确 IP
// 安全刷新 wrangler OAuth token
// 教训：refresh_token 是一次性的——上次先用掉了 refresh、再写文件时被沙箱拒绝（EPERM），
// 结果新 token 拿在内存里却写不进去，差点把凭据彻底弄丢。
// 所以顺序改成：① 先探测目标目录可写 ② 备份 ③ 才消耗 refresh_token ④ 立刻写回。
import { readFile, writeFile, copyFile, rename, unlink } from 'node:fs/promises';

const CFG = 'C:/Users/dell/.wrangler/config/default.toml';
const raw = await readFile(CFG, 'utf8');

// ── ① 可写性探测：不通过就直接退出，绝不消耗 refresh_token ──
const probe = CFG + '.writeprobe';
try {
  await writeFile(probe, 'ok', 'utf8');
  await unlink(probe);
} catch (e) {
  console.error('目标目录不可写（' + String(e.code || e.message) + '）：' + CFG);
  console.error('refresh_token 尚未被消耗。请以更大的沙箱权限重跑本脚本（如 danger-full-access）。');
  process.exit(3);
}

const mRt = raw.match(/refresh_token\s*=\s*"([^"]+)"/);
if (!mRt) { console.error('配置里没有 refresh_token，请先运行 wrangler login'); process.exit(2); }

// ── ② 先备份（此时 refresh_token 还有效，可随时回滚）──
await copyFile(CFG, CFG + '.bak');

// ── ③ 消耗 refresh_token ──
const r = await fetch('https://dash.cloudflare.com/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: mRt[1],
    client_id: '54d11594-84e4-41aa-b438-e81b8fa78ee7',
  }),
});
const j = await r.json();

if (!j.access_token || !j.refresh_token) {
  console.error('REFRESH_FAILED ' + JSON.stringify(j).slice(0, 300));
  console.error('备份在 ' + CFG + '.bak，旧 refresh_token 仍有效');
  process.exit(1);
}

// ── ④ 立刻写回：先写临时文件再原子替换，避免中途失败留下半截配置 ──
const updated = raw
  .replace(/oauth_token\s*=\s*"[^"]*"/, `oauth_token = "${j.access_token}"`)
  .replace(/refresh_token\s*=\s*"[^"]*"/, `refresh_token = "${j.refresh_token}"`)
  .replace(/expiration_time\s*=\s*"[^"]*"/, `expiration_time = "${new Date(Date.now() + j.expires_in * 1000).toISOString()}"`);
await writeFile(CFG + '.tmp', updated, 'utf8');
await rename(CFG + '.tmp', CFG);

// access token 单独落盘给迁移脚本用（文件方式，不经过控制台）
await writeFile('B:/dell/Documents/harness/.cf_token', j.access_token, 'utf8');

const scopes = String(j.scope || '').split(/\s+/);
console.log('REFRESH_OK access_token_len=' + j.access_token.length);
console.log('expires_at=' + new Date(Date.now() + j.expires_in * 1000).toISOString());
console.log('has d1:write         = ' + scopes.includes('d1:write'));
console.log('has workers_kv:write = ' + scopes.includes('workers_kv:write'));
console.log('备份已存至 ' + CFG + '.bak');
