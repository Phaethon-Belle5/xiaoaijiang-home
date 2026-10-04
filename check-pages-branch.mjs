import './cf-dns-fix.mjs';
import { readFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
const H = { Authorization: 'Bearer ' + TOK };

for (const proj of ['map-gallery', 'home-v2']) {
  const r = await (await fetch(`${BASE}/accounts/${ACCT}/pages/projects/${proj}`, { headers: H })).json();
  if (!r.success) { console.log(proj + ': 读取失败 ' + JSON.stringify(r.errors).slice(0, 120)); continue; }
  const p = r.result;
  console.log('=== ' + proj + ' ===');
  console.log('  生产分支 production_branch = ' + p.production_branch);
  console.log('  自定义域名 domains         = ' + JSON.stringify(p.domains));
  console.log('  pages.dev                  = ' + p.subdomain);
  const d = p.canonical_deployment || {};
  console.log('  当前生产部署               = ' + (d.short_id || '?') + '  分支=' + (d.deployment_trigger && d.deployment_trigger.metadata && d.deployment_trigger.metadata.branch) + '  创建=' + d.created_on);
  console.log('  生产部署所属分支是否等于 production_branch = ' + ((d.deployment_trigger && d.deployment_trigger.metadata && d.deployment_trigger.metadata.branch) === p.production_branch ? '✅ 是' : '❌ 否 ← 域名服务的是另一个分支的部署'));
  // 最近几次部署
  const dr = await (await fetch(`${BASE}/accounts/${ACCT}/pages/projects/${proj}/deployments?per_page=6`, { headers: H })).json();
  if (dr.success) {
    console.log('  最近部署:');
    (dr.result || []).slice(0, 6).forEach(x => {
      const m = (x.deployment_trigger && x.deployment_trigger.metadata) || {};
      console.log('    ' + String(x.short_id).padEnd(10) + ' 分支=' + String(m.branch).padEnd(8) +
        ' 环境=' + (x.environment || m.environment || '?') + '  ' + x.created_on);
    });
  }
  console.log('');
}
