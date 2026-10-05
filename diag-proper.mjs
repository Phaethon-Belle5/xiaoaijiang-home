// 正确时序抓异常 + 看脚本在浏览器里执行到哪一步
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));

const hits = [];
const reqFail = [];
ws2.addEventListener('message', (ev) => {
  let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    hits.push({ 文本: String(d.exception && d.exception.description || d.text).split('\n').slice(0, 3).join(' | '), 行: d.lineNumber, 列: d.columnNumber, scriptId: d.scriptId, url: (d.url || '(内联)').slice(-46) });
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    hits.push({ 文本: '[console.' + m.params.type + '] ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 150), 行: -1 });
  }
  if (m.method === 'Network.loadingFailed') reqFail.push(m.params.errorText + ' ' + (m.params.blockedReason || ''));
});

// 等 enable 的 ack，确保先于导航生效
const wait = (id) => new Promise(res => {
  const h = (ev) => { try { const m = JSON.parse(ev.data); if (m.id === id) { ws2.removeEventListener('message', h); res(); } } catch (e) {} };
  ws2.addEventListener('message', h);
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' })); await wait(1);
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' })); await wait(2);
ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' })); await wait(3);
console.log('  已开启 Runtime/Page/Network 监听，再导航');

await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?t=' + Date.now() });
await sleep(16000);

console.log('\n=== 异常 / 控制台 (' + hits.length + ') ===');
hits.slice(0, 10).forEach(h => console.log('  ' + JSON.stringify(h)));
console.log('\n=== 请求失败 (' + reqFail.length + ') ===');
reqFail.slice(0, 6).forEach(r => console.log('  ' + r));

console.log('\n=== 页面状态 ===');
const state = [
  ['location', 'location.href'],
  ['readyState', 'document.readyState'],
  ['script 标签数', 'document.scripts.length'],
  ['第2个脚本字符数', 'document.scripts[1] ? document.scripts[1].textContent.length : -1'],
  ['第2个脚本前 60 字', 'document.scripts[1] ? JSON.stringify(document.scripts[1].textContent.slice(0,60)) : "无"'],
  ['typeof DEFAULT_DATA', 'typeof DEFAULT_DATA'],
  ['typeof VIEW_MAP', 'typeof VIEW_MAP'],
  ['typeof API_URL', 'typeof API_URL'],
  ['typeof escHtml', 'typeof escHtml'],
  ['typeof data', 'typeof data'],
  ['body 长度', 'document.body ? document.body.innerHTML.length : -1'],
];
for (const [n, expr] of state) {
  try { console.log('  ' + n.padEnd(20) + ' = ' + String(await evalJs(c, expr)).slice(0, 90)); }
  catch (e) { console.log('  ' + n.padEnd(20) + ' = ❌ ' + e.message.slice(0, 70)); }
}

if (hits.length && hits[0].scriptId) {
  try {
    const r = await c.send('Debugger.getScriptSource', { scriptId: hits[0].scriptId });
    const lines = String(r.scriptSource).split('\n');
    const ln = hits[0].行;
    console.log('\n=== 出错行附近 ===');
    for (let i = Math.max(0, ln - 4); i < Math.min(lines.length, ln + 4); i++) {
      console.log('  ' + String(i + 1).padStart(5) + (i === ln ? ' >> ' : '    ') + lines[i].slice(0, 165));
    }
  } catch (e) { console.log('  取源码失败: ' + e.message); }
}
ws2.close();
await closeTab(t.id);
