// 查 Cloudflare 侧：Pages 自定义域名状态 + 区域 SSL 设置 + 证书列表
import { readFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
const ZONE_X = '3330eca5ca46b2968b3b6bd833dc5b1e';   // xiaoaijiang.cloud
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
if (!TOK) { const c = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8'); TOK = (c.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
const H = { Authorization: 'Bearer ' + TOK };

console.log('=== 区域 SSL/TLS 设置 ===');
for (const s of ['ssl', 'always_use_https', 'min_tls_version', 'tls_1_3', 'automatic_https_rewrites', 'opportunistic_encryption']) {
  const r = await (await fetch(`${BASE}/zones/${ZONE_X}/settings/${s}`, { headers: H })).json();
  console.log('  ' + s.padEnd(28) + ' = ' + (r.success ? JSON.stringify(r.result && r.result.value) : '取不到'));
}

console.log('\n=== 区域上的证书 ===');
const certs = await (await fetch(`${BASE}/zones/${ZONE_X}/ssl/certificate_packs?status=all`, { headers: H })).json();
if (certs.success) {
  for (const p of certs.result) {
    console.log('  类型=' + p.type + ' 状态=' + p.status + ' 主机=' + (p.hosts || []).join(', ').slice(0, 90));
    for (const c of (p.certificates || [])) console.log('     CN=' + c.hosts + ' 到期=' + c.expires_on);
  }
} else console.log('  取不到: ' + JSON.stringify(certs.errors).slice(0, 120));

console.log('\n=== Pages 项目的自定义域名 ===');
const pj = await (await fetch(`${BASE}/accounts/${ACCT}/pages/projects`, { headers: H })).json();
if (pj.success) {
  for (const p of pj.result) {
    if (!['home-v2', 'map-gallery'].includes(p.name)) continue;
    console.log('  ' + p.name + '  子域=' + p.subdomain + '  生产分支=' + p.production_branch + '  最新部署=' + (p.latest_deployment && p.latest_deployment.created_on));
    console.log('     domains 字段: ' + JSON.stringify(p.domains));
    const dz = await (await fetch(`${BASE}/accounts/${ACCT}/pages/projects/${p.name}/domains`, { headers: H })).json();
    if (dz.success) {
      for (const d of dz.result) {
        console.log('     ' + String(d.name).padEnd(30) + ' status=' + d.status +
          '  zone=' + (d.zone_name || '-') + '  cert=' + (d.certificate_authority || '-') +
          '  validation=' + (d.validation_data ? JSON.stringify(d.validation_data).slice(0, 80) : '-') +
          '  verification=' + (d.verification_data ? d.verification_data.status : '-'));
      }
    } else console.log('     域名详情取不到: ' + JSON.stringify(dz.errors).slice(0, 100));
  }
} else console.log('  取项目失败: ' + JSON.stringify(pj.errors).slice(0, 120));
