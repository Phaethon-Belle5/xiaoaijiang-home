// 查图床的 CORS 头 —— 决定照片流能不能用这些图做 WebGL 纹理
import './cf-dns-fix.mjs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const url = 'https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/600/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0_600.webp';

console.log('=== 普通 GET ===');
const r = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://map.231060101.xyz/' } });
console.log('  HTTP ' + r.status);
for (const h of ['access-control-allow-origin', 'access-control-allow-methods', 'cross-origin-resource-policy', 'content-type', 'cache-control', 'server']) {
  console.log('  ' + h.padEnd(32) + ' = ' + (r.headers.get(h) || '(无)'));
}

console.log('\n=== 带 Origin 的请求（浏览器跨域读图时会带）===');
const r2 = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://map.231060101.xyz/', 'Origin': 'https://map.231060101.xyz' } });
console.log('  HTTP ' + r2.status);
console.log('  access-control-allow-origin  = ' + (r2.headers.get('access-control-allow-origin') || '(无) ← 缺这个就做不了 WebGL 纹理'));

console.log('\n=== 预检 OPTIONS ===');
try {
  const r3 = await fetch(url, { method: 'OPTIONS', headers: { 'User-Agent': UA, 'Origin': 'https://map.231060101.xyz', 'Access-Control-Request-Method': 'GET' } });
  console.log('  HTTP ' + r3.status + '  allow-origin=' + (r3.headers.get('access-control-allow-origin') || '(无)'));
} catch (e) { console.log('  OPTIONS 失败: ' + e.message.slice(0, 50)); }
