import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 160)); }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { errs.push('[console] ' + (m.params.args||[]).map(a=>a.value||a.description||'').join(' ').slice(0, 160)); }
} catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?rig=' + Date.now() });
await sleep(13000);
console.log('THREE 已加载: ' + await evalJs(c, 'typeof window.THREE'));
console.log('renderMemoryShelf: ' + await evalJs(c, 'typeof window.renderMemoryShelf'));
console.log('memoryInitThreeShelf: ' + await evalJs(c, 'typeof window.memoryInitThreeShelf'));
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(9000);
const st = JSON.parse(await evalJs(c, `(function(){
  var box=document.getElementById('memPanel');
  return JSON.stringify({
    面板有内容:(box?box.innerHTML.length:0)>200,
    memoryBook数:document.querySelectorAll('.memory-book').length,
    有canvas:!!document.querySelector('.memory-shelf-webgl'),
    有viewport:!!document.querySelector('.memory-shelf-viewport'),
    有信息面板:!!document.querySelector('.memory-province-info'),
    文案:box?box.innerText.replace(/\\s+/g,' ').slice(0,120):''
  });
})()`));
console.log(JSON.stringify(st, null, 1));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-rig.png', Buffer.from(data, 'base64'));
console.log('截图: shots/shelf-rig.png');
console.log('错误: ' + (errs.length ? errs.slice(0,6).join('\n  ') : '无'));
ws2.close(); await closeTab(t.id);
