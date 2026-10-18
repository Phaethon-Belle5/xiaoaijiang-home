import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 130)); } } catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?sh=' + Date.now() });
await sleep(11000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()");
await sleep(600);
await evalJs(c, "(function(){ if(typeof openMemPop==='function')openMemPop(); return 1; })()");
await sleep(3000);
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(5000);
const info = JSON.parse(await evalJs(c, `(function(){
  var vp=document.getElementById('memoryShelfViewport');
  var books=document.querySelectorAll('.memory-book');
  var b0=books[0];
  return JSON.stringify({
    视口:vp?Math.round(vp.getBoundingClientRect().width)+'x'+Math.round(vp.getBoundingClientRect().height):'-',
    书数:books.length,
    第一本尺寸:b0?Math.round(b0.getBoundingClientRect().width)+'x'+Math.round(b0.getBoundingClientRect().height):'-',
    六面:!!(b0&&b0.querySelector('.memory-book-cover')&&b0.querySelector('.memory-book-spine-face')&&b0.querySelector('.memory-book-back')&&b0.querySelector('.memory-book-page-face')&&b0.querySelector('.memory-book-cover-inside')&&b0.querySelector('.memory-book-page-edge')),
    封面标题:b0&&b0.querySelector('.memory-book-title')?b0.querySelector('.memory-book-title').textContent:'-',
    书脊:b0&&b0.querySelector('.memory-book-spine-copy')?b0.querySelector('.memory-book-spine-copy').innerText.replace(/\s+/g,' ').slice(0,30):'-',
    元信息:b0&&b0.querySelector('.memory-book-meta')?b0.querySelector('.memory-book-meta').innerText.replace(/\s+/g,' '):'-',
    轨道宽:document.getElementById('memoryShelfTrack')?Math.round(document.getElementById('memoryShelfTrack').getBoundingClientRect().width):0
  });
})()`));
console.log(JSON.stringify(info, null, 1));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-ref-port.png', Buffer.from(data, 'base64'));
console.log('截图: shots/shelf-ref-port.png');
console.log('异常: ' + (errs.length ? errs.slice(0,4).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
