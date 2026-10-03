// 映像馆「城市记忆（相册排版）」验收
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?city=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 190));

// 打开照片最多的城市
const city = await evalJs(c, `(function(){
  var c=mapCityPoints.slice().sort(function(a,b){return b.photos.length-a.photos.length})[0];
  if(!c)return '无城市';
  openCityDetail(c);
  return c.cityName+' ('+c.photos.length+' 张)';
})()`);
console.log('  打开城市: ' + city);
await sleep(3000);

console.log('\n════ 详情面板 ════');
line('面板已展开', await evalJs(c, `document.getElementById('city-detail').classList.contains('show')`));
line('照片排版切换器', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.vseg-b')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));
line('相册容器 display', await evalJs(c, `getComputedStyle(document.getElementById('detAlbum')).display`));
line('网格容器 display', await evalJs(c, `getComputedStyle(document.getElementById('detPhotos')).display`));
line('相册分组数', await evalJs(c, `document.querySelectorAll('.alb-group').length`));
line('相册照片数', await evalJs(c, `document.querySelectorAll('.alb-ph').length`));
line('分组标题', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.alb-head')).slice(0,5).map(function(e){return e.querySelector('.alb-date').textContent+' / '+e.querySelector('.alb-n').textContent}))`));
line('排版类别分布', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.alb-grid')).reduce(function(m,e){var k=e.className.replace('alb-grid ','');m[k]=(m[k]||0)+1;return m},{}))`));
line('相册图已加载', await evalJs(c, `[].slice.call(document.querySelectorAll('.alb-ph img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.alb-ph img').length`));
line('相册图 src 后缀', await evalJs(c, `(function(){var i=document.querySelector('.alb-ph img');return i?i.src.slice(-14):'无'})()`));
line('相册容器尺寸', await evalJs(c, `(function(){var e=document.getElementById('detAlbum');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' opacity='+getComputedStyle(e).opacity})()`));

console.log('\n════ 切到网格模式 ════');
await evalJs(c, 'setDetAlbum(false); 1');
await sleep(1500);
line('相册 display', await evalJs(c, `getComputedStyle(document.getElementById('detAlbum')).display`));
line('网格 display', await evalJs(c, `getComputedStyle(document.getElementById('detPhotos')).display`));
line('网格照片数', await evalJs(c, `document.querySelectorAll('#detPhotos .dp').length`));

console.log('\n════ 切回相册 ════');
await evalJs(c, 'setDetAlbum(true); 1');
await sleep(1500);
line('相册 display', await evalJs(c, `getComputedStyle(document.getElementById('detAlbum')).display`));
line('切换器选中态', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.vseg-b')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));

console.log('\n════ 点相册照片能否打开查看器 ════');
await evalJs(c, `(function(){var e=document.querySelector('.alb-ph');if(e)e.click();return 1})()`);
await sleep(3500);
line('查看器 .show', await evalJs(c, `(function(){var v=document.querySelector('.img-viewer');return v?(v.classList.contains('show')?'已打开':'未打开'):'找不到'})()`));

await evalJs(c, `(function(){try{closeViewer()}catch(e){} setDetAlbum(true); return 1})()`);
await sleep(1500);
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-city-album.png');
console.log('\n  截图: shots/gallery-city-album.png');

await closeTab(t.id);
