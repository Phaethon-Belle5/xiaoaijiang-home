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
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?sw=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(9000);
function info(){ return evalJs(c, `(function(){
  var p=document.getElementById('memoryProvinceInfo');
  if(!p)return '-';
  return JSON.stringify({
    省:(p.querySelector('.memory-info-name')||{}).textContent||'-',
    城市:(p.querySelector('.memory-info-cities')||{}).innerText||'-',
    时间:(p.querySelector('.memory-info-date strong')||{}).textContent||'-',
    编辑按钮:(function(){var b=p.querySelector('.memory-province-edit');return b?getComputedStyle(b).display:'无'})()
  });
})()`); }
console.log('切换前: ' + await info());
await evalJs(c, 'memorySetActive(1, true), 1');
await sleep(2000);
console.log('切到第2本: ' + await info());
await evalJs(c, 'memorySetActive(2, true), 1');
await sleep(2000);
console.log('切到第3本: ' + await info());
const fs = await import('node:fs/promises');
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-switch.png', Buffer.from(data, 'base64'));
console.log('截图已存');
console.log('错误: ' + (errs.length ? errs.slice(0,3).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
