// 三级层级验收：全部省份 → 某省所有城市 → 单个城市照片
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(() => {});
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?lv=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 160));
const W = `(function(){try{return document.querySelector('.stream-frame').contentWindow}catch(e){return null}})()`;

await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stream"]');if(b)b.click();return 1})()`);
await sleep(18000);

console.log('════ 数据桥 ════');
line('层级数', await evalJs(c, `(async()=>{const c=await TravelPhotoStreamBridge.readCatalog();return (c.levels||[]).length})()`));
line('第一层条目', await evalJs(c, `(async()=>{const c=await TravelPhotoStreamBridge.readCatalog();return JSON.stringify((c.levels[0]||[]).map(function(g){return g.title+'('+g.photoIds.length+')'}))})()`));
line('第二层键', await evalJs(c, `(async()=>{const c=await TravelPhotoStreamBridge.readCatalog();return JSON.stringify(Object.keys(c.levels[1]||{}))})()`));

console.log('\n════ 第一层：省份光线 ════');
line('记忆流初始化', await evalJs(c, `(function(){try{var w=document.querySelector('.stream-frame').contentWindow;return w.__undertow?'✅':'未初始化'}catch(e){return 'ERR'}})()`));
line('当前层级', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentWindow.__undertow.level}catch(e){return 'ERR'}})()`));
line('线条标签', await evalJs(c, `(function(){try{var w=document.querySelector('.stream-frame').contentWindow;return JSON.stringify([].slice.call(w.document.querySelectorAll('#city-labels span')).map(function(e){return e.textContent}).filter(Boolean))}catch(e){return 'ERR'}})()`));
line('顶部计数文案', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentDocument.getElementById('photo-count').textContent}catch(e){return 'ERR'}})()`));
line('返回按钮隐藏', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentDocument.getElementById('level-back').hidden}catch(e){return 'ERR'}})()`));
line('前 8 条线的 x 坐标', await evalJs(c, `(function(){try{var w=document.querySelector('.stream-frame').contentWindow;return JSON.stringify([].slice.call(w.__undertow.fib.x0.slice(0,8)).map(function(v){return Math.round(v*100)/100}))}catch(e){return 'ERR'}})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/stream-lv1.png');
console.log('  截图: shots/stream-lv1.png');

console.log('\n════ 点击第一条（省份）线 → 应下钻到城市层 ════');
await evalJs(c, `(function(){
  var w=document.querySelector('.stream-frame').contentWindow;
  w.__undertow.showThreads(w.__undertow.LEVEL2[Object.keys(w.__undertow.LEVEL2)[0]], 2, Object.keys(w.__undertow.LEVEL2)[0]);
  return 1;
})()`);
await sleep(3000);
line('当前层级', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentWindow.__undertow.level}catch(e){return 'ERR'}})()`));
line('城市线条标签', await evalJs(c, `(function(){try{var w=document.querySelector('.stream-frame').contentWindow;return JSON.stringify([].slice.call(w.document.querySelectorAll('#city-labels span')).map(function(e){return e.textContent}).filter(Boolean))}catch(e){return 'ERR'}})()`));
line('返回按钮可见', await evalJs(c, `(function(){try{return !document.querySelector('.stream-frame').contentDocument.getElementById('level-back').hidden}catch(e){return 'ERR'}})()`));
line('顶部计数文案', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentDocument.getElementById('photo-count').textContent}catch(e){return 'ERR'}})()`));
line('线条 x 坐标已重排', await evalJs(c, `(function(){try{var w=document.querySelector('.stream-frame').contentWindow;return JSON.stringify([].slice.call(w.__undertow.fib.x0.slice(0,6)).map(function(v){return v>1000?'屏外':Math.round(v*100)/100}))}catch(e){return 'ERR'}})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/stream-lv2.png');
console.log('  截图: shots/stream-lv2.png');

console.log('\n════ 点返回 ════');
await evalJs(c, `(function(){document.querySelector('.stream-frame').contentWindow.__undertow.goBackLevel();return 1})()`);
await sleep(2500);
line('当前层级', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentWindow.__undertow.level}catch(e){return 'ERR'}})()`));
line('标签恢复', await evalJs(c, `(function(){try{var w=document.querySelector('.stream-frame').contentWindow;return JSON.stringify([].slice.call(w.document.querySelectorAll('#city-labels span')).map(function(e){return e.textContent}).filter(Boolean))}catch(e){return 'ERR'}})()`));
line('返回按钮又隐藏', await evalJs(c, `(function(){try{return document.querySelector('.stream-frame').contentDocument.getElementById('level-back').hidden}catch(e){return 'ERR'}})()`));

await closeTab(t.id);
