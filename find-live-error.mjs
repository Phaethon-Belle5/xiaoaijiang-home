// 抓当前线上页面的异常详情（含行列号）
import { openTab, connect, closeTab, sleep } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const hits = [];
ws2.addEventListener('message', (ev) => {
  try {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      hits.push({
        文本: String(d.exception && d.exception.description || d.text).split('\n').slice(0, 3).join(' | '),
        行: d.lineNumber, 列: d.columnNumber, 脚本: (d.url || '(内联)').slice(-40), scriptId: d.scriptId,
      });
    }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?diag2=' + Date.now() });
await sleep(15000);
console.log('=== 异常 (' + hits.length + ') ===');
hits.forEach(h => console.log('  ' + JSON.stringify(h)));

if (hits.length && hits[0].scriptId) {
  try {
    const r = await c.send('Debugger.getScriptSource', { scriptId: hits[0].scriptId });
    const lines = String(r.scriptSource).split('\n');
    const ln = hits[0].行;
    console.log('\n=== 出错行附近（脚本内第 ' + (ln + 1) + ' 行，共 ' + lines.length + ' 行）===');
    for (let i = Math.max(0, ln - 5); i < Math.min(lines.length, ln + 4); i++) {
      console.log('  ' + String(i + 1).padStart(5) + (i === ln ? ' >> ' : '    ') + lines[i].slice(0, 170));
    }
  } catch (e) { console.log('  取源码失败: ' + e.message); }
}
ws2.close();
await closeTab(t.id);
