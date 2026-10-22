import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type==='error'||m.params.type==='warning')) errs.push((m.params.args||[]).map(a=>a.value||'').join(' ').slice(0,140));
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push('[throw] ' + String(d.exception&&d.exception.description||d.text).split('\n')[0].slice(0,140)); }
} catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?j=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('images'), 1");
await sleep(7000);
const st = JSON.parse(await evalJs(c, `(function(){
  var wrap=document.querySelector('#memPanel .life-archive-layout');
  var pane=document.querySelector('#memPanel .life-timeline-pane');
  return JSON.stringify({
    两栏:!!wrap,
    栏宽:wrap?getComputedStyle(wrap).gridTemplateColumns:'-',
    时间轴在:!!pane,
    年份数:document.querySelectorAll('#memPanel .life-year').length,
    城市按钮数:document.querySelectorAll('#memPanel .life-city-entry').length,
    穹顶瓦片:document.querySelectorAll('.dg-item').length,
    按钮:JSON.stringify([].slice.call(document.querySelectorAll('.ti-actions button')).map(function(b){return b.textContent.trim()})),
    还有全屏按钮:document.body.innerText.indexOf('穹顶全屏')>=0
  });
})()`));
console.log(JSON.stringify(st, null, 1));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/journey-images.png', Buffer.from(data, 'base64'));
console.log('截图: shots/journey-images.png');
// 点第一个城市
const before = await evalJs(c, '(function(){var d=document.querySelector("#memPanel .city-detail, #cityDetail");return d?"有详情层":"无"})()');
await evalJs(c, "(function(){var b=document.querySelector('#memPanel .life-city-entry');if(b)b.click();return 1})()");
await sleep(3000);
console.log('点城市后: ' + await evalJs(c, '(function(){var d=document.querySelector(".city-detail,.cd-panel,#cityDetail,.cd-overlay");return d?"详情层出现 ✓":"没找到详情层"}）'.replace('）',')')));
console.log('错误: ' + (errs.length ? errs.slice(0,3).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
