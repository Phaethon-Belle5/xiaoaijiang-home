import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs=[];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data);
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errs.push(String(d.exception&&d.exception.description||d.text).split('\n')[0].slice(0,140));}
} catch(e){} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?loop=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(9000);
function st(){ return evalJs(c, `(function(){
  var p=document.getElementById('memoryProvinceInfo');
  return JSON.stringify({active:memoryShelfState.active, 省:(p&&p.querySelector('.memory-info-name')||{}).textContent||'-'});
})()`); }
console.log('初始:     ' + await st());
// 模拟滚轮向下(下一本)
async function wheel(dy){
  await evalJs(c, `(function(){
    var vp=document.getElementById('memoryShelfViewport');
    if(!vp)return 0;
    vp.dispatchEvent(new WheelEvent('wheel',{deltaY:${dy},bubbles:true,cancelable:true}));
    return 1;
  })()`);
  await sleep(400);
}
for (let i=0;i<9;i++){ await wheel(120); }
console.log('向下滚9次: ' + await st() + '   ← 8 本应该绕回第 1 本附近');
for (let i=0;i<3;i++){ await wheel(-120); }
console.log('向上滚3次: ' + await st());
const fs = await import('node:fs/promises');
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-loop.png', Buffer.from(data, 'base64'));
console.log('错误: ' + (errs.length ? errs.slice(0,2).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
