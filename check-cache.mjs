const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36';
const r = await fetch('https://map.231060101.xyz/', { headers: { 'User-Agent': UA } });
console.log('=== 响应头 ===');
for (const h of ['cache-control', 'expires', 'etag', 'last-modified', 'cf-cache-status', 'server']) {
  console.log('  ' + h.padEnd(18) + ' = ' + (r.headers.get(h) || '(无)'));
}
const t = await r.text();
console.log('\n=== 页面缓存相关 ===');
console.log('  serviceWorker 注册: ' + (/serviceWorker/.test(t) ? '有 ⚠' : '没有 ✓'));
const m = t.match(/<script[^>]*src="[^"]+"/g) || [];
console.log('  外部脚本: ' + (m.slice(0, 6).join(' | ') || '（无）'));
console.log('\n=== 版本标记 ===');
const v = t.match(/BUILD[^<]{0,80}|构建[^<]{0,60}|VERSION[^<]{0,40}/gi);
console.log('  ' + (v ? v.slice(0, 4).join(' | ') : '（没有版本标记）'));
