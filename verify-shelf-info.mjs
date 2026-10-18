import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); } } catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?info=' + Date.now() });
await sleep(12000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(5500);
const info = JSON.parse(await evalJs(c, `(function(){
  var p=document.getElementById('memoryProvinceInfo');
  var scene=document.querySelector('.memory-shelf-scene');
  return JSON.stringify({
    有面板:!!p,
    面板宽度:p?Math.round(p.getBoundingClientRect().width):0,
    场景列:scene?getComputedStyle(scene).gridTemplateColumns:'-',
    文案:p?p.innerText.replace(/\\s+/g,' ').slice(0,150):'-'
  });
})()`));
console.log(JSON.stringify(info, null, 1));
// 点第二本书脊看面板是否跟着换
await evalJs(c, 'memShelfSetActive(document.querySelectorAll("#memPanel .memory-book")[1]), 1');
await sleep(1200);
console.log('\n切换后: ' + await evalJs(c, '(function(){var p=document.getElementById("memoryProvinceInfo");return p?p.innerText.replace(/\\s+/g," ").slice(0,90):"无"})()'));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-info.png', Buffer.from(data, 'base64'));
console.log('截图: shots/shelf-info.png');
console.log('异常: ' + (errs.length ? errs.slice(0,4).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
