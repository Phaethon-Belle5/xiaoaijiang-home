import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?mi=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(600);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(8000);
console.log('typeof memoryInfoHtml (裸标识符): ' + await evalJs(c, '(function(){try{return typeof memoryInfoHtml}catch(e){return "不可读"}})()'));
console.log('typeof window.memoryInfoHtml: ' + await evalJs(c, 'typeof window.memoryInfoHtml'));
console.log('memShelfProvinces()[2].name: ' + await evalJs(c, '(function(){try{return memShelfProvinces()[2].name}catch(e){return "❌ "+e.message}})()'));
console.log('手动渲染第3个: ' + await evalJs(c, `(function(){
  try{
    var ps=memShelfProvinces();
    var fn=(typeof memoryInfoHtml==='function')?memoryInfoHtml:window.memoryInfoHtml;
    if(typeof fn!=='function')return 'memoryInfoHtml 不可用';
    var host=document.getElementById('memoryProvinceInfo');
    var tmp=document.createElement('div');tmp.innerHTML=fn(ps,2);
    var n=tmp.firstElementChild;if(n)host.replaceWith(n);
    return '渲染了 第3个='+ps[2].name+' 现在面板='+((document.querySelector('.memory-info-name')||{}).textContent);
  }catch(e){return '❌ '+e.message}
})()`));
ws2.close(); await closeTab(t.id);
