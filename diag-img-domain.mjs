// 查 img / cdn 两个子域名在 Cloudflare 上的状态
import { readFile } from 'node:fs/promises';
import { lookup } from 'node:dns/promises';
import tls from 'node:tls';

const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
if (!TOK) { const c = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8'); TOK = (c.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
const H = { Authorization: 'Bearer ' + TOK };
const ZONE = '951c1dcbe9b2fb1b914c2515cd8d5b5c';   // 231060101.xyz

console.log('════ DNS 解析 ════');
for (const h of ['img.231060101.xyz', 'cdn.231060101.xyz', 'map.231060101.xyz', 'mapi.231060101.xyz']) {
  try { const r = await lookup(h, { all: true }); console.log('  ' + h.padEnd(24) + ' → ' + r.map(x => x.address).join(', ')); }
  catch (e) { console.log('  ' + h.padEnd(24) + ' ❌ ' + e.code); }
}

console.log('\n════ 证书对比（直连 443）════');
for (const h of ['img.231060101.xyz', 'cdn.231060101.xyz', 'map.231060101.xyz']) {
  await new Promise(res => {
    const s = tls.connect({ host: h, port: 443, servername: h, rejectUnauthorized: false, timeout: 12000 }, () => {
      const c = s.getPeerCertificate(false);
      const san = String(c.subjectaltname || '');
      const covered = san.includes(h) ? '✅ 覆盖' : '❌ 不覆盖';
      console.log('  ' + h.padEnd(24) + ' CN=' + String(c.subject && c.subject.CN).padEnd(22) + covered);
      console.log('      SAN = ' + san.slice(0, 150));
      s.end(); res();
    });
    s.on('error', e => { console.log('  ' + h.padEnd(24) + ' ❌ ' + e.code); res(); });
    s.on('timeout', () => { console.log('  ' + h.padEnd(24) + ' ❌ 超时'); s.destroy(); res(); });
  });
}

console.log('\n════ Cloudflare 上的 Pages 项目与自定义域名 ════');
const pj = await (await fetch(`${BASE}/accounts/${ACCT}/pages/projects`, { headers: H })).json();
if (pj.success) {
  for (const p of pj.result) {
    console.log('  ' + p.name.padEnd(20) + ' 子域=' + p.subdomain);
    for (const d of (p.domains || [])) if (d !== p.subdomain) {
      const dz = await (await fetch(`${BASE}/accounts/${ACCT}/pages/projects/${p.name}/domains/${d}`, { headers: H })).json();
      if (dz.success) console.log('       ' + d.padEnd(26) + ' status=' + dz.result.status + '  cert=' + (dz.result.certificate_authority || '-') + '  validation=' + JSON.stringify(dz.result.validation_data || {}).slice(0, 70));
      else console.log('       ' + d.padEnd(26) + ' 详情取不到: ' + JSON.stringify(dz.errors).slice(0, 80));
    }
  }
} else console.log('  项目列表取不到: ' + JSON.stringify(pj.errors).slice(0, 100));

console.log('\n════ Workers 自定义域名（图床可能是 worker）════');
const wd = await (await fetch(`${BASE}/accounts/${ACCT}/workers/domains`, { headers: H })).json();
if (wd.success) {
  for (const d of wd.result) console.log('  ' + String(d.hostname).padEnd(28) + ' 服务=' + d.service + '  环境=' + d.environment + '  zone=' + d.zone_name);
} else console.log('  取不到: ' + JSON.stringify(wd.errors).slice(0, 100));
