// 测那两张说说配图到底能不能取到
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const urls = [
  'https://img.231060101.xyz/file/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E7%AB%B9%E7%AC%9B%E4%B8%8E%E9%9D%92%E7%93%A6.webp',
  'https://img.231060101.xyz/file/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E7%88%B1%E9%85%B1.webp',
];
// 从站点数据里取真实 URL，避免我手抄出错
const UA2 = UA;
const d = await (await fetch('https://home.xiaoaijiang.cloud/api/data?cb=' + Math.random(), { headers: { 'User-Agent': UA2, Referer: 'https://home.xiaoaijiang.cloud/' } })).json();
const memoImgs = (d.memos || []).filter(m => m && m.image).map(m => ({ id: m.id, text: String(m.text || '').slice(0, 14), image: m.image }));
console.log('════ 说说里带图的条目（' + memoImgs.length + ' 条）════');
memoImgs.forEach(m => console.log('  ' + m.text.padEnd(16) + ' ' + m.image));

console.log('\n════ 逐个拉取 ════');
const list = memoImgs.length ? memoImgs.map(m => m.image) : urls;
for (const u of list) {
  try {
    const t0 = Date.now();
    const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://home.xiaoaijiang.cloud/' }, signal: AbortSignal.timeout(25000) });
    const b = await r.arrayBuffer();
    const ok = r.status === 200 && b.byteLength > 200;
    console.log('  ' + (ok ? '✅' : '❌') + ' HTTP ' + r.status + '  ' + (b.byteLength / 1024).toFixed(0) + ' KB  ' + (Date.now() - t0) + ' ms  ' + u.slice(0, 88));
    if (!ok) console.log('       内容开头: ' + Buffer.from(b).toString('utf8').replace(/\s+/g, ' ').slice(0, 100));
  } catch (e) {
    console.log('  ❌ ' + u.slice(0, 88) + '\n       ' + (e.cause ? (e.cause.code || e.cause.message) : e.message).toString().slice(0, 70));
  }
}

console.log('\n════ 对照：能用的那张头像 ════');
const av = 'https://img.231060101.xyz/file/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/1791208705411_%E9%98%BF%E5%91%A6.jpg';
try {
  const r = await fetch(av, { headers: { 'User-Agent': UA, Referer: 'https://home.xiaoaijiang.cloud/' }, signal: AbortSignal.timeout(25000) });
  const b = await r.arrayBuffer();
  console.log('  ' + (r.status === 200 ? '✅' : '❌') + ' HTTP ' + r.status + '  ' + (b.byteLength / 1024).toFixed(0) + ' KB');
} catch (e) { console.log('  ❌ ' + e.message.slice(0, 60)); }
