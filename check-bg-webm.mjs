// 校验用户给的 18 个 webm 地址是否真的能取到视频
const URLS = [
  'https://img.231060101.xyz/file/背景/1793280395608_世界很温柔—《龙族》上杉绘梨衣.webm',
  'https://img.231060101.xyz/file/背景/1793280391212_雷姆.webm',
  'https://img.231060101.xyz/file/背景/1793280385822_小鸟游六花.webm',
  'https://img.231060101.xyz/file/背景/1793280388190_要被借钱的波奇酱.webm',
  'https://img.231060101.xyz/file/背景/1793280382704_初音未来.webm',
  'https://img.231060101.xyz/file/背景/1793280389154_宵宫.webm',
  'https://img.231060101.xyz/file/背景/1793280386227_洛天依.webm',
  'https://img.231060101.xyz/file/背景/1793280375465_薇尔莉特.webm',
  'https://img.231060101.xyz/file/背景/1793280366334_山田凉.webm',
  'https://img.231060101.xyz/file/背景/1793280363854_麻衣学姐.webm',
  'https://img.231060101.xyz/file/背景/1793280363039_风起地.webm',
  'https://img.231060101.xyz/file/背景/1793280355590_流萤.webm',
  'https://img.231060101.xyz/file/背景/1793280351014_哥伦比亚.webm',
  'https://img.231060101.xyz/file/背景/1793280335223_孤独摇滚星空下的合影.webm',
  'https://img.231060101.xyz/file/背景/1793280336200_胡桃.webm',
  'https://img.231060101.xyz/file/背景/1793280325049_孤独摇滚ps最终成品.webm',
  'https://img.231060101.xyz/file/背景/1793280318016_Ellen-Joe-Zenless-Zone-Zero-getlivewall-com.webm',
  'https://img.231060101.xyz/file/背景/1793280226026_000.webm',
];
const good = [], bad = [];
for (const u of URLS) {
  const enc = u.replace(/[^\x00-\x7f]/g, ch => encodeURIComponent(ch));
  let line = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(enc, { method: 'GET', headers: { Range: 'bytes=0-4095' }, signal: AbortSignal.timeout(25000) });
      const ct = (r.headers.get('content-type') || '').split(';')[0];
      const cr = r.headers.get('content-range') || '';
      const total = cr ? cr.split('/')[1] : (r.headers.get('content-length') || '?');
      const ok = r.ok && /video|octet-stream/.test(ct);
      line = (ok ? '✅' : '❌') + ' HTTP ' + r.status + ' ' + ct.padEnd(16) + ' ' + String(total).padStart(9) + ' B  ' + decodeURIComponent(u.split('/背景/')[1]);
      if (ok) { good.push({ url: enc, name: decodeURIComponent(u.split('/背景/')[1]), bytes: Number(total) || 0 }); break; }
    } catch (e) {
      line = '❌ ' + (e.cause ? e.cause.code : e.message).toString().slice(0, 26) + '  ' + decodeURIComponent(u.split('/背景/')[1]) + (attempt < 3 ? '（重试）' : '');
    }
  }
  console.log('  ' + line);
}
console.log('\n  可用 ' + good.length + ' / ' + URLS.length + ' 个');
console.log('  总大小 ' + (good.reduce((s, g) => s + g.bytes, 0) / 1024 / 1024).toFixed(1) + ' MB');
