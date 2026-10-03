// 映像馆「照片流」验收（WebGL 光瀑，含数据桥）
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(()=>{});
await c.send('Storage.clearDataForOrigin', { origin: 'https://map.231060101.xyz', storageTypes: 'all' }).catch(()=>{});
// 无头环境默认没有 GPU，这里开软件渲染，否则 WebGL 拿不到上下文
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?stream=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 190));

console.log('════ 切到照片流 ════');
await evalJs(c, 'setMemTab("stream"); 1');
await sleep(3000);
line('streamHost 存在', await evalJs(c, '!!document.getElementById("streamHost")'));
line('iframe 已创建', await evalJs(c, `!!document.querySelector('.stream-frame')`));
line('iframe src', await evalJs(c, `(function(){var f=document.querySelector('.stream-frame');return f?f.src.slice(-40):'无'})()`));
line('数据桥已暴露', await evalJs(c, 'typeof window.TravelPhotoStreamBridge==="object" && typeof window.TravelPhotoStreamBridge.readCatalog==="function"'));
line('host 尺寸', await evalJs(c, `(function(){var e=document.getElementById('streamHost');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)})()`));

console.log('\n════ 数据桥内容 ════');
const cat = await evalJs(c, `(async()=>{try{const c=await TravelPhotoStreamBridge.readCatalog();const p=c.photos||[];return JSON.stringify({总数:p.length,字段:Object.keys(p[0]||{}),样本:p[0],城市数:new Set(p.map(function(x){return x.cityKey})).size,有avg:p.filter(function(x){return Array.isArray(x.avg)&&x.avg.length===3}).length})}catch(e){return '失败: '+e.message}})()`);
console.log('  ' + String(cat).slice(0, 420));

console.log('\n════ iframe 内部状态（跨域同源，可读）════');
await sleep(6000);
const inner = await evalJs(c, `(function(){
  try{
    var f=document.querySelector('.stream-frame');
    var d=f.contentDocument;
    if(!d)return '拿不到 contentDocument';
    var cv=d.getElementById('stream');
    return JSON.stringify({
      标题:d.title,
      画布存在:!!cv,
      画布尺寸:cv?(cv.width+'x'+cv.height):'无',
      照片计数文案:(d.getElementById('photo-count')||{}).textContent,
      目录按钮:!!d.getElementById('directory-toggle'),
      目录项数:d.querySelectorAll('.directory-grid button').length,
      错误提示:(function(){var e=d.getElementById('error');return e&&!e.hidden?e.textContent:'(无)'})(),
      加载中:(function(){var l=d.getElementById('loader');return l?getComputedStyle(l).opacity:'?'})()
    });
  }catch(e){return '读取失败: '+e.message}
})()`);
console.log('  ' + String(inner).slice(0, 400));

console.log('\n════ WebGL 是否拿到上下文 ════');
line('页面 WebGL2 支持', await evalJs(c, `(function(){try{var c=document.createElement('canvas');return !!c.getContext('webgl2')}catch(e){return false}})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-stream.png');
console.log('\n  截图: shots/gallery-stream.png');

console.log('\n════ 离开照片流应释放 ════');
await evalJs(c, 'setMemTab("stats"); 1');
await sleep(2000);
line('iframe 已移除', await evalJs(c, `!document.querySelector('.stream-frame')`));

await closeTab(t.id);
