import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const logs = [];
ws2.addEventListener('message', ev => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map(a => a.value || a.description || a.preview && a.preview.description || '').join(' ');
      if (m.params.type === 'warning' || m.params.type === 'error') logs.push('[' + m.params.type + '] ' + txt.slice(0, 300));
    }
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; logs.push('[throw] ' + String(d.exception && d.exception.description || d.text).split('\n').slice(0,3).join(' / ').slice(0, 300)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?warn=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(600);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(9000);
console.log('viewport class: ' + await evalJs(c, '(function(){var v=document.getElementById("memoryShelfViewport");return v?v.className:"无"})()'));
console.log('canvas opacity: ' + await evalJs(c, '(function(){var v=document.querySelector(".memory-shelf-webgl");return v?getComputedStyle(v).opacity:"无"})()'));
console.log('track opacity:   ' + await evalJs(c, '(function(){var v=document.querySelector(".memory-shelf-track");return v?getComputedStyle(v).opacity:"无"})()'));
console.log('\n=== 控制台 warn/error ===');
console.log(logs.length ? logs.slice(0, 10).map(l => '  ' + l).join('\n') : '  （无）');
ws2.close(); await closeTab(t.id);
