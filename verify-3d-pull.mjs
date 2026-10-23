// 用真实封面 + 开启动画，看"书被抽出"的 3D 效果 + 确认弹窗恢复
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?x3=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 125));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(26) + ' = ' + String(v).slice(0, 115)); };

// 不用注入，直接用真实数据
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3500);

console.log('════ ① 书被抽出的 3D ════');
line('reduced-motion', await evalJs(c, 'String(window.matchMedia("(prefers-reduced-motion: reduce)").matches)'));
line('选中书的 transform', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-object");return e?getComputedStyle(e).transform:"无"})()'));
line('书脊面尺寸', await evalJs(c, `(function(){
  var e=document.querySelector('#dim-grid .memory-book.active .memory-book-spine-face');
  if(!e)return '无';
  var r=e.getBoundingClientRect();
  return Math.round(r.width)+' x '+Math.round(r.height)+'  opacity='+getComputedStyle(e).opacity;
})()`));
line('书页边尺寸', await evalJs(c, `(function(){
  var e=document.querySelector('#dim-grid .memory-book.active .memory-book-page-edge');
  if(!e)return '无';
  var r=e.getBoundingClientRect();
  return Math.round(r.width)+' x '+Math.round(r.height);
})()`));
const tf = await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-object");return e?getComputedStyle(e).transform:"none"})()');
ok('书有 3D 变换（matrix3d）', String(tf).slice(0, 30), String(tf).indexOf('matrix3d') === 0);
const tr = String(tf).match(/matrix3d\(([^)]+)\)/);
if (tr) {
  const p = tr[1].split(',').map(Number);
  line('侧转角（acos m11）', Math.round(Math.acos(Math.max(-1, Math.min(1, p[0]))) * 180 / Math.PI) + '°');
  line('朝观者推近（m43）', Math.round(p[14]) + 'px');
}
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-3d-pull.png');
console.log('  截图: shots/dim-3d-pull.png');

console.log('\n════ ② 弹窗是否恢复 ════');
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[2].click();return 1})()`);
await sleep(900);
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[2].click();return 1})()`);
await sleep(1400);
ok('再点已选中的书 → 弹窗', await evalJs(c, '!!document.querySelector("#dim-modal.show")'), (await evalJs(c, '!!document.querySelector("#dim-modal.show")')) === true);
ok('没有走翻书那套', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length') + ' 个 opening', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length')) === 0);
line('弹窗标题', await evalJs(c, '(function(){var e=document.querySelector(".dm-title");return e?e.textContent:"无"})()'));
line('弹窗里有简介', await evalJs(c, '(function(){var e=document.querySelector(".dm-text");return e?e.textContent.slice(0,28):"无"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-modal-back.png');
console.log('  截图: shots/dim-modal-back.png');
await evalJs(c, 'closeDimDetail(), 1');
await sleep(600);

console.log('\n════ ③ 封面仍是纯图片 ════');
ok('封面上无文字', await evalJs(c, `(function(){var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');return cv?'"'+cv.innerText.replace(/\\s+/g,'')+'"':'无'})()`), (await evalJs(c, `(function(){var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');return cv?cv.innerText.replace(/\\s+/g,''):'x'})()`)) === '');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
