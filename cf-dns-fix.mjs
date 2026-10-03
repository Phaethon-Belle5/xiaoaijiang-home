/**
 * DNS 修正：api.cloudflare.com 在当前网络下被解析到污染的地址
 * （182.16.61.x，连上去必然超时），正确的应是 104.19.192.x/104.19.193.x。
 *
 * 用法：在需要访问 Cloudflare API 的脚本顶部 `import './cf-dns-fix.mjs';`
 * 它只覆盖 api.cloudflare.com 这一个域名的解析，其余一律走系统 DNS。
 *
 * 自动获取正确 IP：优先读缓存文件，否则用 DoH(dns.google) 查一次并缓存。
 */
import dns from 'node:dns';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CACHE = 'B:/dell/Documents/harness/.cf-api-ips.json';
const TARGET = 'api.cloudflare.com';
const FALLBACK = ['104.19.193.29', '104.19.192.175', '104.19.192.29', '104.19.192.176'];

async function resolveGoodIps() {
  try {
    if (existsSync(CACHE)) {
      const j = JSON.parse(readFileSync(CACHE, 'utf8'));
      if (Array.isArray(j.ips) && j.ips.length && Date.now() - j.at < 86400000) return j.ips;
    }
  } catch (e) {}
  try {
    const r = await fetch('https://dns.google/resolve?name=' + TARGET + '&type=A', { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const ips = (j.Answer || []).filter(a => a.type === 1).map(a => a.data).filter(ip => /^104\./.test(ip) || /^172\./.test(ip));
    if (ips.length) {
      try { writeFileSync(CACHE, JSON.stringify({ ips, at: Date.now() })); } catch (e) {}
      return ips;
    }
  } catch (e) {}
  return FALLBACK;
}

const ips = await resolveGoodIps();
let rr = 0;

const origLookup = dns.lookup;
function patched(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (hostname === TARGET) {
    const ip = ips[rr++ % ips.length];
    if (options && options.all) return process.nextTick(() => callback(null, [{ address: ip, family: 4 }]));
    return process.nextTick(() => callback(null, ip, 4));
  }
  return origLookup.call(dns, hostname, options, callback);
}
dns.lookup = patched;
try { dns.promises.lookup = async (hostname, options) => {
  if (hostname === TARGET) {
    const ip = ips[rr++ % ips.length];
    return (options && options.all) ? [{ address: ip, family: 4 }] : { address: ip, family: 4 };
  }
  return dns.promises.lookup(hostname, options);
}; } catch (e) {}

if (process.env.CF_DNS_FIX_VERBOSE) console.log('[DNS 修正] ' + TARGET + ' → ' + ips.join(', '));
export default ips;
