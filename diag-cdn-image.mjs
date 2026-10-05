// 查 CDN 为什么加载不了图片
const U = 'https://cdn.231060101.xyz/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E9%98%BF%E5%91%A6.webp';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const cases = [
  ['不带头', {}],
  ['只带 UA', { 'User-Agent': UA }],
  ['带 UA + Referer', { 'User-Agent': UA, Referer: 'https://home.xiaoaijiang.cloud/' }],
  ['带 UA + Origin', { 'User-Agent': UA, Origin: 'https://home.xiaoaijiang.cloud' }],
];
for (const [name, headers] of cases) {
  try {
    const r = await fetch(U, { headers, redirect: 'follow' });
    const b = await r.arrayBuffer();
    console.log('  ' + name.padEnd(18) + ' HTTP ' + r.status + '  ' + (b.byteLength / 1024).toFixed(0) + ' KB  ' +
      'ACAO=' + (r.headers.get('access-control-allow-origin') || '-') +
      '  type=' + (r.headers.get('content-type') || '-') +
      '  cf-cache=' + (r.headers.get('cf-cache-status') || '-'));
  } catch (e) {
    console.log('  ' + name.padEnd(18) + ' ❌ ' + e.message.slice(0, 70));
  }
}

console.log('\n=== 站点当前用的头像 URL ===');
const UA2 = UA;
const html = await (await fetch('https://home.xiaoaijiang.cloud/api/data?cb=' + Math.random(), { headers: { 'User-Agent': UA2, Referer: 'https://home.xiaoaijiang.cloud/' } })).text();
try {
  const j = JSON.parse(html);
  console.log('  头像: ' + (j.profile && j.profile.avatar || '(空)'));
  const gal = (j.gallery || []).slice(0, 3).map(g => g.image);
  console.log('  画廊前 3 张: \n    ' + gal.join('\n    '));
} catch (e) { console.log('  解析失败: ' + e.message.slice(0, 60)); }

console.log('\n=== 测一张真实画廊图 ===');
try {
  const j = JSON.parse(html);
  const g = (j.gallery || [])[0];
  if (g && g.image) {
    const r = await fetch(g.image, { headers: { 'User-Agent': UA, Referer: 'https://home.xiaoaijiang.cloud/' } });
    const b = await r.arrayBuffer();
    console.log('  ' + g.image.slice(0, 80) + '  → HTTP ' + r.status + ' ' + (b.byteLength / 1024).toFixed(0) + ' KB  ACAO=' + (r.headers.get('access-control-allow-origin') || '-'));
  } else console.log('  没有画廊图');
} catch (e) { console.log('  ❌ ' + e.message.slice(0, 70)); }
