// 测热榜接口的耗时与结构
const URL_ = 'https://home.xiaoaijiang.cloud/api/hot';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

console.log('=== 连测 5 次 ===');
const times = [];
for (let i = 1; i <= 5; i++) {
  const t0 = Date.now();
  try {
    const r = await fetch(URL_ + '?cb=' + Math.random(), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
    const txt = await r.text();
    const ms = Date.now() - t0;
    times.push(ms);
    let shape = '';
    try {
      const j = JSON.parse(txt);
      const keys = Object.keys(j);
      shape = 'keys=' + keys.join(',') + '  条数=' + (Array.isArray(j.items) ? j.items.length : (Array.isArray(j) ? j.length : '?'));
    } catch (e) { shape = '不是 JSON: ' + txt.slice(0, 60); }
    console.log('  ' + i + '.  HTTP ' + r.status + '  ' + ms + ' ms  ' + (txt.length / 1024).toFixed(1) + ' KB  ' + shape);
    console.log('     cache-control = ' + (r.headers.get('cache-control') || '-') + '   cf-cache=' + (r.headers.get('cf-cache-status') || '-'));
  } catch (e) {
    console.log('  ' + i + '.  ❌ ' + (e.name === 'TimeoutError' ? '超时' : e.message.slice(0, 50)) + '  ' + (Date.now() - t0) + ' ms');
  }
  await new Promise(s => setTimeout(s, 800));
}
if (times.length) {
  console.log('\n  最快 ' + Math.min(...times) + ' ms  最慢 ' + Math.max(...times) + ' ms  平均 ' + Math.round(times.reduce((a, b) => a + b, 0) / times.length) + ' ms');
}

console.log('\n=== 看返回内容 ===');
try {
  const r = await fetch(URL_, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60000) });
  const j = await r.json();
  console.log(JSON.stringify(j, null, 1).slice(0, 1200));
} catch (e) { console.log('  ❌ ' + e.message.slice(0, 60)); }
