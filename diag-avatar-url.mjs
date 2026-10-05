// 查 cdn 域名状态 + 给头像找一个能用的地址
import { lookup } from 'node:dns/promises';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

console.log('=== DNS 解析 ===');
for (const h of ['cdn.231060101.xyz', 'img.231060101.xyz', 'home.xiaoaijiang.cloud', 'map.231060101.xyz']) {
  try { const r = await lookup(h, { all: true }); console.log('  ' + h.padEnd(26) + ' → ' + r.map(x => x.address).join(', ')); }
  catch (e) { console.log('  ' + h.padEnd(26) + ' ❌ ' + e.code); }
}

console.log('\n=== 头像文件在各个域名下试试 ===');
const PATH = '/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E9%98%BF%E5%91%A6.webp';
for (const base of ['https://cdn.231060101.xyz', 'https://img.231060101.xyz/file', 'https://img.231060101.xyz']) {
  for (const p of [PATH, '/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/阿呦.webp']) {
    const u = base + p;
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://home.xiaoaijiang.cloud/' }, signal: AbortSignal.timeout(12000) });
      const b = await r.arrayBuffer();
      console.log('  ' + (r.status === 200 && b.byteLength > 1000 ? '✅' : '⚠ ') + ' ' + u.slice(0, 78) + '  → ' + r.status + '  ' + (b.byteLength / 1024).toFixed(0) + ' KB');
    } catch (e) { console.log('  ❌ ' + u.slice(0, 78) + '  → ' + e.message.slice(0, 44)); }
  }
}

console.log('\n=== 图床索引里有没有「说说图片/阿呦」 ===');
try {
  const r = await fetch('https://img.231060101.xyz/file/', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  console.log('  图床首页 HTTP ' + r.status);
  const t = await r.text();
  console.log('  页面长度 ' + t.length);
  const hit = t.match(/[^"'\s]*阿呦[^"'\s]*/g);
  console.log('  含「阿呦」的路径: ' + (hit ? hit.slice(0, 5).join(' , ') : '（没找到）'));
} catch (e) { console.log('  ❌ ' + e.message.slice(0, 60)); }
