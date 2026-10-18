// 实测线上省份封面接口
const API = 'https://mapi.231060101.xyz';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';

console.log('=== GET /province-covers ===');
try {
  const r = await fetch(API + '/province-covers?cb=' + Math.random(), { headers: { 'User-Agent': UA, Origin: 'https://map.231060101.xyz' }, signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  console.log('  HTTP ' + r.status + '  ' + t.slice(0, 400));
} catch (e) { console.log('  ❌ ' + (e.cause ? e.cause.code : e.message)); }

console.log('\n=== POST /province-cover（不带 token，应 401）===');
try {
  const r = await fetch(API + '/province-cover', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Origin: 'https://map.231060101.xyz' },
    body: JSON.stringify({ province: '山东省', url: 'https://x/y.jpg' }),
    signal: AbortSignal.timeout(20000),
  });
  console.log('  HTTP ' + r.status + '  ' + (await r.text()).slice(0, 200));
} catch (e) { console.log('  ❌ ' + (e.cause ? e.cause.code : e.message)); }

console.log('\n=== 对照：其它接口在不在 ===');
for (const p of ['/cities', '/photos', '/unlocated', '/stats']) {
  try {
    const r = await fetch(API + p + '?cb=' + Math.random(), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    console.log('  ' + p.padEnd(14) + ' HTTP ' + r.status + '  ' + t.length + ' 字节  ' + t.slice(0, 80));
  } catch (e) { console.log('  ' + p.padEnd(14) + ' ❌ ' + (e.cause ? e.cause.code : e.message)); }
}
