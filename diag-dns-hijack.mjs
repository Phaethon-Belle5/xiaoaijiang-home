/**
 * 坐实「DNS 被篡改 / 透明代理拦截」：
 *  ① 系统解析 vs DoH(1.1.1.1) 解析，对比同一域名的 IP
 *  ② 代理环境变量
 *  ③ 直连 Cloudflare 官方 IP 能否正常拿到证书（判断拦截在哪一层）
 */
import { lookup } from 'node:dns/promises';
import tls from 'node:tls';

async function doh(host) {
  try {
    const r = await fetch('https://1.1.1.1/dns-query?name=' + encodeURIComponent(host) + '&type=A', { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(12000) });
    const j = await r.json();
    return (j.Answer || []).filter(a => a.type === 1).map(a => a.data);
  } catch (e) { return ['DoH 失败: ' + (e.cause ? e.cause.code : e.message).toString().slice(0, 30)]; }
}
async function dohGoogle(host) {
  try {
    const r = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(host) + '&type=A', { signal: AbortSignal.timeout(12000) });
    const j = await r.json();
    return (j.Answer || []).filter(a => a.type === 1).map(a => a.data);
  } catch (e) { return ['失败']; }
}

const HOSTS = ['img.231060101.xyz', 'cdn.231060101.xyz', 'map.231060101.xyz', 'home.xiaoaijiang.cloud', 'api.cloudflare.com'];

console.log('════ 系统解析 vs DoH(Cloudflare) vs DoH(Google) ════');
for (const h of HOSTS) {
  let sys = [];
  try { sys = (await lookup(h, { all: true })).map(x => x.address); } catch (e) { sys = ['❌' + e.code]; }
  const c1 = await doh(h);
  const c2 = await dohGoogle(h);
  const same = JSON.stringify([...sys].sort()) === JSON.stringify([...c1].sort());
  console.log('\n  ' + h + '   ' + (same ? '✅ 一致' : '❌ 不一致（系统解析被改动了）'));
  console.log('      系统   : ' + sys.join(', '));
  console.log('      1.1.1.1: ' + c1.join(', '));
  console.log('      Google : ' + c2.join(', '));
}

console.log('\n════ 代理相关环境变量 ════');
for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'NODE_USE_ENV_PROXY', 'NODE_EXTRA_CA_CERTS']) {
  const v = process.env[k];
  if (v) console.log('  ' + k + ' = ' + v);
}
console.log('  （以上没列出的就是没设）');

console.log('\n════ 直连 Cloudflare 官方 IP，看证书是谁给的 ════');
for (const [label, ip, sni] of [['Cloudflare 1.1.1.1', '1.1.1.1', 'cloudflare-dns.com'], ['Cloudflare 104.21.85.119', '104.21.85.119', 'img.231060101.xyz']]) {
  await new Promise(res => {
    const s = tls.connect({ host: ip, port: 443, servername: sni, rejectUnauthorized: false, timeout: 10000 }, () => {
      const c = s.getPeerCertificate(false);
      console.log('  ' + label.padEnd(26) + ' CN=' + String(c.subject && c.subject.CN).slice(0, 44) + '   颁发者=' + String(c.issuer && (c.issuer.O || c.issuer.CN)).slice(0, 30));
      s.end(); res();
    });
    s.on('error', e => { console.log('  ' + label.padEnd(26) + ' ❌ ' + e.code); res(); });
    s.on('timeout', () => { console.log('  ' + label.padEnd(26) + ' ❌ 超时'); s.destroy(); res(); });
  });
}

console.log('\n════ 判定 ════');
console.log('  若「系统解析 ≠ DoH」→ 本机 DNS 被改动（代理的 fake-ip / DNS 劫持）');
console.log('  若直连 Cloudflare 官方 IP 也拿到陌生证书 → 存在透明中间人');
