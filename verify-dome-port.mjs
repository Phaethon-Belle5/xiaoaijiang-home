import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 140)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?dome=' + Date.now() });
await sleep(11000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()");
await sleep(600);
console.log('DomeGallery 已加载: ' + await evalJs(c, "typeof window.DomeGallery"));
await evalJs(c, "(function(){ if(typeof openMemPop==='function')openMemPop(); return 1; })()");
await sleep(3000);
await evalJs(c, 'setMemTab("images"), 1');
await sleep(6000);
const info = JSON.parse(await evalJs(c, `(function(){
  var host=document.getElementById('lifePhotoDome');
  return JSON.stringify({
    有容器:!!host,
    容器尺寸:host?Math.round(host.getBoundingClientRect().width)+'x'+Math.round(host.getBoundingClientRect().height):'-',
    有dg根:!!document.querySelector('.dg-root'),
    穹顶瓦片:document.querySelectorAll('.dg-item').length,
    有stage:!!document.querySelector('.dg-stage'),
    有sphere:!!document.querySelector('.dg-sphere'),
    是否已实例:!!window.__domeGallery,
    头部文字:(document.querySelector('.life-photo-dome-head')||{}).innerText?document.querySelector('.life-photo-dome-head').innerText.replace(/\s+/g,' ').slice(0,80):''
  });
})()`));
console.log(JSON.stringify(info, null, 1));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/dome-ref-port.png', Buffer.from(data, 'base64'));
console.log('截图: shots/dome-ref-port.png');
console.log('异常: ' + (errs.length ? errs.slice(0,4).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
