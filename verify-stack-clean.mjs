import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?sb=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('images'), 1");
await sleep(3500);
await evalJs(c, 'memOpenWall(), 1');
await sleep(3000);
await evalJs(c, "(function(){var p=document.querySelectorAll('#pwViewer .curtain-panel')[2];if(p)p.click();return 1})()");
await sleep(2500);
console.log(await evalJs(c, `(function(){
  var v=document.getElementById('pwViewer');
  var wall=v?v.querySelector('.pw-wall'):null;
  return JSON.stringify({
    模式:v?v.className:'-',
    墙display:wall?getComputedStyle(wall).display:'-',
    墙hidden:wall?wall.hidden:'-',
    主卡有图:(function(){var i=v?v.querySelector('.photo-card.main img'):null;return !!(i&&i.naturalWidth>0)})()
  });
})()`));
const fs = await import('node:fs/promises');
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/wall-stack-clean.png', Buffer.from(data, 'base64'));
console.log('截图已存');
ws2.close(); await closeTab(t.id);
