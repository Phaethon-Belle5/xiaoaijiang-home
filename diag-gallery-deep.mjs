/**
 * 映像馆深度诊断：是否卡住、有没有报错、加载了多重的东西
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
const failed = [];
const big = [];
let totalBytes = 0;
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 140)); }
    if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText + ' ' + (m.params.blockedReason || ''));
    if (m.method === 'Network.responseReceived') { const r = m.params.response; if (r.encodedDataLength > 50000) big.push({ u: r.url.split('/').pop().slice(0, 42), kb: Math.round(r.encodedDataLength / 1024) }); }
  } catch (e) {}
});
const wait = (id) => new Promise(res => { const h = (ev) => { try { const m = JSON.parse(ev.data); if (m.id === id) { ws2.removeEventListener('message', h); res(); } } catch (e) {} }; ws2.addEventListener('message', h); });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' })); await wait(1);
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' })); await wait(2);
ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' })); await wait(3);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

const T0 = Date.now();
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?diag=' + Date.now() });

console.log('════ 加载过程（每 3 秒探一次响应性）════');
for (let i = 1; i <= 8; i++) {
  await sleep(3000);
  let alive = '无响应', title = '-', ready = '-';
  try {
    const r = await Promise.race([
      (async () => { const a = await evalJs(c, 'document.readyState'); const b = await evalJs(c, 'document.title'); return a + '|' + b; })(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    [ready, title] = r.split('|');
    alive = '✅ 有响应';
  } catch (e) { alive = '❌ 卡住（4 秒无响应）'; }
  console.log('  ' + String(Math.round((Date.now() - T0) / 1000)).padStart(3) + 's  ' + alive + '  readyState=' + ready + '  title=' + title);
}

console.log('\n════ 页面状态 ════');
const q = async (label, expr) => { try { console.log('  ' + label.padEnd(26) + ' = ' + String(await Promise.race([evalJs(c, expr), new Promise((_, r) => setTimeout(() => r(new Error('t')), 5000))])).slice(0, 120)); } catch (e) { console.log('  ' + label.padEnd(26) + ' = ❌ 取不到'); } };
await q('开屏遮罩是否还在', 'document.getElementById("launch") ? "还在" : "已移除"');
await q('地图画布', 'document.querySelectorAll("canvas").length + " 个"');
await q('城市数据', 'typeof CITIES!=="undefined"&&CITIES ? CITIES.length+" 个" : "未载入"');
await q('body 内容长度', 'document.body ? document.body.innerText.length : -1');
await q('可见文本前 60 字', '(document.body.innerText||"").replace(/\\s+/g," ").trim().slice(0,60)');

console.log('\n════ 大文件（>50KB）════');
big.sort((a, b) => b.kb - a.kb).slice(0, 12).forEach(b => console.log('  ' + String(b.kb).padStart(5) + ' KB  ' + b.u));

console.log('\n════ 异常 (' + exceptions.length + ') ════');
exceptions.slice(0, 8).forEach(e => console.log('  ' + e));
console.log('════ 请求失败 (' + failed.length + ') ════');
[...new Set(failed)].slice(0, 8).forEach(e => console.log('  ' + e));

ws2.close();
await closeTab(t.id);
