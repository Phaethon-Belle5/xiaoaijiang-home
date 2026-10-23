import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?rv2=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(9000);
console.log(await evalJs(c, `(function(){
  var info=document.getElementById('memoryProvinceInfo');
  if(!info)return '没有信息面板';
  var rv=info.querySelector('.memory-info-review');
  var blk=info.querySelector('.memory-info-review-block');
  return JSON.stringify({
    评价块:!!blk,
    评价文字:rv?rv.textContent.trim():'(没有 .memory-info-review)',
    是否空:rv?rv.classList.contains('is-empty'):'-',
    城市城市:(function(){var c=info.querySelector('.memory-info-cities');return c?c.innerText.replace(/\\s+/g,' ').slice(0,80):'-'})()
  });
})()`));
const fs = await import('node:fs/promises');
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-review.png', Buffer.from(data, 'base64'));
console.log('截图已存');
ws2.close(); await closeTab(t.id);
