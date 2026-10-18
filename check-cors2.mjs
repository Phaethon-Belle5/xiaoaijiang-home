const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36';
const photos = await (await fetch('https://mapi.231060101.xyz/photos?cb=' + Math.random(), { headers: { 'User-Agent': UA } })).json();
console.log('照片数: ' + photos.length);
const u = photos[0].url;
console.log('样例: ' + u.slice(0, 110));
const r = await fetch(u, { headers: { Origin: 'https://map.231060101.xyz', 'User-Agent': UA } });
console.log('\nHTTP ' + r.status + '  ' + (r.headers.get('content-type') || ''));
console.log('  access-control-allow-origin = ' + (r.headers.get('access-control-allow-origin') || '(无) ⚠'));
console.log('  各位主机统计:');
const hosts = {};
for (const p of photos) { try { const h = new URL(p.url).host; hosts[h] = (hosts[h] || 0) + 1; } catch (e) {} }
console.log('  ' + JSON.stringify(hosts));
