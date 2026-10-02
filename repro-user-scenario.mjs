/**
 * 复现用户场景：手机视口打开说说 → 真的"点击"分类标签 → 看筛选有没有生效、有没有报错
 * 注意：用真实鼠标点击（Input.dispatchMouseEvent），不是 element.click()，
 *      因为用户是手点的，事件路径可能不同。
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const VP = process.argv[2] ? process.argv[2].split('x').map(Number) : [390, 844];

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      exceptions.push('行' + d.lineNumber + ':' + d.columnNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120));
    }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

await c.send('Emulation.setDeviceMetricsOverride', { width: VP[0], height: VP[1], deviceScaleFactor: 1, mobile: VP[0] < 800 });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/memos?click=' + Date.now() });
await sleep(19000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);
console.log('════ 视口 ' + VP[0] + 'x' + VP[1] + ' ════');
line('说说条数', await evalJs(c, '(data.memos||[]).length'));
line('导航到说说', await evalJs(c, 'navigateTo("memos"), currentView'));
await sleep(2500);

console.log('\n--- 标签栏 ---');
line('chip 数量', await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length'));
line('chip 文字', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#memo-tagbar .memo-tag")).map(e=>e.textContent))'));
line('chip 有 onclick 吗', await evalJs(c, '(function(){var e=document.querySelector("#memo-tagbar .memo-tag:not(:first-child)");return e?(e.getAttribute("onclick")?"有":"无"):"没有 chip"})()'));
line('卡片上的标签 chip 数', await evalJs(c, 'document.querySelectorAll(".memo-tag-chip").length'));

// 真的用鼠标点第一个非「全部」的标签
const box = await evalJs(c, `(function(){
  var e=document.querySelector("#memo-tagbar .memo-tag:not(:first-child)");
  if(!e)return null;
  e.scrollIntoView({block:"center"});
  var r=e.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), text:e.textContent});
})()`);
console.log('\n--- 真实鼠标点击 ---');
console.log('  目标: ' + box);
if (box) {
  const b = JSON.parse(box);
  const before = await evalJs(c, 'JSON.stringify({filter:memoFilter,mode:memoMode})');
  console.log('  点击前状态: ' + before);
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(1800);
  const after = await evalJs(c, 'JSON.stringify({filter:memoFilter,mode:memoMode})');
  console.log('  点击后状态: ' + after);
  line('筛选是否生效', before === after ? '❌ 没变化（点了没反应）' : '✅ 变了');
  line('标签栏选中态', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#memo-tagbar .memo-tag")).map(e=>e.textContent+(e.classList.contains("on")?"*":"")))'));
}

// 再点卡片上的标签 chip
console.log('\n--- 点卡片上的标签 chip ---');
const box2 = await evalJs(c, `(function(){
  var e=document.querySelector(".memo-tag-chip");
  if(!e)return null;
  e.scrollIntoView({block:"center"});
  var r=e.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), text:e.textContent});
})()`);
console.log('  目标: ' + box2);
if (box2) {
  const b2 = JSON.parse(box2);
  const before2 = await evalJs(c, 'memoFilter');
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b2.x, y: b2.y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b2.x, y: b2.y, button: 'left', clickCount: 1 });
  await sleep(1800);
  const after2 = await evalJs(c, 'memoFilter');
  line('卡片 chip 点击', before2 === after2 ? ('❌ 没反应（还是 "' + after2 + '"）') : ('✅ 变成 "' + after2 + '"'));
}

console.log('\n--- 归档模式 ---');
await evalJs(c, 'setMemoMode("archive"), 1');
await sleep(1800);
line('归档组数', await evalJs(c, 'document.querySelectorAll(".memo-arch-month").length'));
line('分组名', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".memo-arch-label")).map(e=>e.textContent))'));

console.log('\n--- 首页日志卡（同视口）---');
await evalJs(c, 'navigateTo("home"), 1');
await sleep(2200);
line('日志卡条目', await evalJs(c, 'document.querySelectorAll(".log-item").length'));
line('日志卡可见', await evalJs(c, '(function(){var e=document.querySelector(".log-card");if(!e)return "不存在";var r=e.getBoundingClientRect();return (r.width>10&&r.height>10)?"✅ "+Math.round(r.width)+"x"+Math.round(r.height):"❌ 不可见"})()'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
