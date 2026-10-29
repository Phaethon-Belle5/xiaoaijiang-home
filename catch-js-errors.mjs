// 抓页面加载时的 JS 异常，定位为什么 moveVideo 没被定义
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', (ev) => {
  try {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errs.push({
        line: d.lineNumber, col: d.columnNumber,
        text: (d.exception && d.exception.description ? d.exception.description : d.text || '').split('\n').slice(0, 3).join(' | '),
      });
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errs.push({ line: m.params.entry.lineNumber, col: 0, text: '[console] ' + m.params.entry.text });
    }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?err=' + Date.now() });
await sleep(18000);

console.log('════ 页面加载期间的异常 ════');
if (!errs.length) console.log('  （没有捕获到异常）');
errs.slice(0, 10).forEach((e, i) => console.log('  [' + i + '] line ' + e.line + ':' + e.col + '\n      ' + e.text.slice(0, 300)));

console.log('\n════ 关键函数是否定义 ════');
for (const fn of ['moveVideo', 'deleteVideo', 'uploadVideo', 'wpFileName', 'wpCommit', 'addWpUrl', 'initWallpapers', 'ADMIN']) {
  const v = await evalJs(c, `typeof ${fn}`);
  console.log('  ' + (v === 'undefined' ? '❌' : '✅') + ' ' + fn.padEnd(16) + ' = ' + v);
}
await closeTab(t.id);
