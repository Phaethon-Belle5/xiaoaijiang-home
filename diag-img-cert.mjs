/**
 * 分辨：img.231060101.xyz 是「代理抖动」还是「证书本身有问题」
 *  ① Node 直连看它的证书（不走代理）
 *  ② 浏览器里反复加载那张图，统计失败率（走系统设置）
 *  ③ 同一张图直接 fetch 测试
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
import tls from 'node:tls';

const IMG = 'https://img.231060101.xyz/file/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/1791208705411_%E9%98%BF%E5%91%A6.jpg';
const HOST = 'img.231060101.xyz';

console.log('════ ① Node 直连（不走代理）看证书 ════');
await new Promise(res => {
  const s = tls.connect({ host: HOST, port: 443, servername: HOST, rejectUnauthorized: false, timeout: 15000 }, () => {
    const c = s.getPeerCertificate(false);
    console.log('  CN        = ' + (c.subject && c.subject.CN));
    console.log('  SAN       = ' + String(c.subjectaltname || '').slice(0, 220));
    console.log('  颁发者    = ' + (c.issuer && (c.issuer.O || c.issuer.CN)));
    console.log('  有效期    = ' + c.valid_from + ' → ' + c.valid_to);
    console.log('  授权状态  = ' + s.authorized + (s.authorizationError ? ('  错误=' + s.authorizationError) : ''));
    s.end(); res();
  });
  s.on('error', e => { console.log('  ❌ ' + e.code + ' ' + e.message); res(); });
  s.on('timeout', () => { console.log('  ❌ 超时'); s.destroy(); res(); });
});

console.log('\n════ ② Node 直连拉这张图 ════');
for (let i = 1; i <= 3; i++) {
  try {
    const t0 = Date.now();
    const r = await fetch(IMG, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://map.231060101.xyz/' }, signal: AbortSignal.timeout(20000) });
    const b = await r.arrayBuffer();
    console.log('  ' + i + '. HTTP ' + r.status + '  ' + (b.byteLength / 1024).toFixed(0) + ' KB  ' + (Date.now() - t0) + ' ms  type=' + (r.headers.get('content-type') || '-'));
  } catch (e) { console.log('  ' + i + '. ❌ ' + (e.cause ? (e.cause.code || e.cause.message) : e.message).toString().slice(0, 60)); }
}

console.log('\n════ ③ 浏览器里反复加载（走系统设置，含绕过规则）════');
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?' + Date.now() });
await sleep(15000);

let ok = 0, fail = 0; const errs = [];
for (let i = 1; i <= 10; i++) {
  const r = await evalJs(c, `(async()=>{return await new Promise(res=>{const im=new Image();im.onload=()=>res('ok '+im.naturalWidth);im.onerror=()=>res('err');im.src=${JSON.stringify(IMG)} + '?r=' + ${i};setTimeout(()=>res('timeout'),12000)})})()`);
  if (String(r).startsWith('ok')) ok++; else { fail++; errs.push(String(r)); }
  await sleep(300);
}
console.log('  成功 ' + ok + '/10   失败 ' + fail + '/10' + (errs.length ? '  样例: ' + [...new Set(errs)].join(',') : ''));

console.log('\n════ ④ 浏览器里 fetch 这张图（能拿到具体错误）════');
console.log('  ' + await evalJs(c, `(async()=>{try{const r=await fetch(${JSON.stringify(IMG)});const b=await r.blob();return 'HTTP '+r.status+'  '+b.size+' 字节'}catch(e){return '❌ '+e.message}})()`));

console.log('\n════ ⑤ 对比：同域名下另一张老图 ════');
const OLD = 'https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
let ok2 = 0;
for (let i = 1; i <= 6; i++) {
  const r = await evalJs(c, `(async()=>{return await new Promise(res=>{const im=new Image();im.onload=()=>res('ok');im.onerror=()=>res('err');im.src=${JSON.stringify(OLD)} + '?r=' + ${i};setTimeout(()=>res('timeout'),12000)})})()`);
  if (r === 'ok') ok2++;
  await sleep(200);
}
console.log('  老图 成功 ' + ok2 + '/6');

ws2close();
await closeTab(t.id);
function ws2close() {}
