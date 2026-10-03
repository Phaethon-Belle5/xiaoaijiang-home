// 确认图床的缩略图尺寸可用性：600 / 200 / 1600 各取一张试试
import './cf-dns-fix.mjs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const r = await fetch('https://mapi.231060101.xyz/photos', { headers: { 'User-Agent': UA } });
const list = await r.json();
console.log('照片数: ' + list.length);
const p = list[0];
console.log('样本 url: ' + p.url);
const base = p.url.replace(/\.[^.]+$/, '');
const dir = base.slice(0, base.lastIndexOf('/') + 1);
const stem = decodeURIComponent(base.slice(base.lastIndexOf('/') + 1));
console.log('目录: ' + dir);
console.log('文件名: ' + stem);
console.log('\n各尺寸可用性：');
for (const size of [200, 600, 1600]) {
  // 还原 optUrl 的拼法
  let d = dir.replace(/\/webp\/\d+\/$/, '/webp/');
  if (/\/webp\/$/.test(d)) d = d + size + '/';
  const url = d + encodeURIComponent(stem + '_' + size + '.webp');
  try {
    const rr = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA, 'Referer': 'https://map.231060101.xyz/' } });
    console.log('  ' + size + ': HTTP ' + rr.status + '  ' + (rr.headers.get('content-length') || '?') + ' B   ' + url.slice(-52));
  } catch (e) { console.log('  ' + size + ': 失败 ' + e.message.slice(0, 40)); }
}
