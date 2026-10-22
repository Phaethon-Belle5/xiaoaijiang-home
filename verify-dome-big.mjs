import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?df=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('images'), 1");
await sleep(8000);
const st = JSON.parse(await evalJs(c, `(function(){
  var tiles=document.querySelectorAll('.dg-item');
  var stage=document.querySelector('.life-photo-dome-stage');
  var r0=tiles[0]?tiles[0].getBoundingClientRect():null;
  var sr=stage?stage.getBoundingClientRect():null;
  return JSON.stringify({瓦片:tiles.length, 首块:r0?Math.round(r0.width)+'x'+Math.round(r0.height):'-',
    舞台:sr?Math.round(sr.width)+'x'+Math.round(sr.height):'-'});
})()`));
console.log(JSON.stringify(st));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/dome-bigger.png', Buffer.from(data, 'base64'));
console.log('截图已存: shots/dome-bigger.png');
ws2.close(); await closeTab(t.id);
