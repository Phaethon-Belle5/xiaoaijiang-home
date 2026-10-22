import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?w2=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('images'), 1");
await sleep(3500);
await evalJs(c, 'memOpenWall(), 1');
await sleep(3500);
const info = JSON.parse(await evalJs(c, `(function(){
  var wall=document.querySelector('#pwViewer .pw-wall');
  if(!wall)return JSON.stringify({err:'无墙'});
  var r=wall.getBoundingClientRect();
  var panels=wall.querySelectorAll('.curtain-panel');
  var p0=panels[0]?panels[0].getBoundingClientRect():null;
  var cs=getComputedStyle(wall);
  return JSON.stringify({
    墙宽:Math.round(r.width),
    grid列:cs.gridTemplateColumns,
    列数:cs.gridTemplateColumns.split(' ').filter(Boolean).length,
    相框:panels.length,
    首个: p0?Math.round(p0.width)+'x'+Math.round(p0.height):'-'
  });
})()`));
console.log(JSON.stringify(info, null, 1));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/shrink-wall.png', Buffer.from(data, 'base64'));
console.log('截图已存');
ws2.close(); await closeTab(t.id);
