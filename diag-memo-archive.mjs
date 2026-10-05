/**
 * 复现「说说点归档后不显示内容」
 * 逐步检查：点归档 → 状态 → 两个容器的 hidden/尺寸 → 归档区 innerHTML → 有没有异常
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n').slice(0, 2).join(' / ').slice(0, 200)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/memos?bug=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 140));

line('currentView', await evalJs(c, 'currentView'));
line('说说条数', await evalJs(c, '(data.memos||[]).length'));
line('每条有 text 吗', await evalJs(c, '(data.memos||[]).filter(function(m){return m&&typeof m.text==="string"&&m.text.trim()}).length + " 条有文字"'));

console.log('\n--- 点击「归档」前 ---');
line('memoMode', await evalJs(c, 'memoMode'));
line('wall hidden', await evalJs(c, 'document.getElementById("memo-wall").hidden'));
line('archive hidden', await evalJs(c, 'document.getElementById("memo-archive").hidden'));
line('可见卡片数', await evalJs(c, '[].slice.call(document.querySelectorAll("#memo-wall .memo-card")).filter(function(e){return !e.hidden}).length'));

console.log('\n--- 点击「归档」（真实鼠标）---');
const geo = JSON.parse(await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-tab")).find(function(x){return x.dataset.memoMode==="archive"});if(!b)return "null";b.scrollIntoView({block:"center",behavior:"instant"});var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
console.log('  归档按钮位置: ' + JSON.stringify(geo));
if (geo && geo.x) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.x, y: geo.y, button: 'none' });
  await sleep(120);
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: geo.x, y: geo.y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: geo.x, y: geo.y, button: 'left', clickCount: 1 });
}
await sleep(2500);

line('memoMode', await evalJs(c, 'memoMode'));
line('wall hidden', await evalJs(c, 'document.getElementById("memo-wall").hidden'));
line('archive hidden', await evalJs(c, 'document.getElementById("memo-archive").hidden'));
line('archive 尺寸', await evalJs(c, '(function(){var e=document.getElementById("memo-archive");var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
line('archive 子元素数', await evalJs(c, 'document.getElementById("memo-archive").children.length'));
line('archive innerHTML 长度', await evalJs(c, 'document.getElementById("memo-archive").innerHTML.length'));
line('archive 文本', await evalJs(c, '(document.getElementById("memo-archive").innerText||"").replace(/\\s+/g," ").slice(0,90)'));
line('月份组数', await evalJs(c, 'document.querySelectorAll(".memo-arch-month").length'));
line('归档行数', await evalJs(c, 'document.querySelectorAll(".memo-arch-row").length'));
line('分组标签', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".memo-arch-label")).map(function(e){return e.textContent}))'));
line('归档区 display', await evalJs(c, 'getComputedStyle(document.getElementById("memo-archive")).display'));
line('归档区可见高度', await evalJs(c, 'Math.round(document.getElementById("memo-archive").getBoundingClientRect().height)'));

console.log('\n--- 直接调函数试试（排除是不是点击没生效）---');
line('调 setMemoMode 后', await evalJs(c, '(function(){try{setMemoMode("archive");return "mode="+memoMode+" 行数="+document.querySelectorAll(".memo-arch-row").length}catch(e){return "❌ "+e.message}})()'));
await sleep(1500);
line('重调后行数', await evalJs(c, 'document.querySelectorAll(".memo-arch-row").length'));
line('renderMemoArchive 直接调', await evalJs(c, '(function(){try{renderMemoArchive();return "行数="+document.querySelectorAll(".memo-arch-row").length}catch(e){return "❌ "+e.message}})()'));

console.log('\n--- 逐块检查可能抛错的地方 ---');
line('memoTags 可用', await evalJs(c, 'typeof memoTags'));
line('第一条 memoTags', await evalJs(c, '(function(){try{return JSON.stringify(memoTags(data.memos[0]))}catch(e){return "❌ "+e.message}})()'));
line('memoFilter/memoGroup', await evalJs(c, 'memoFilter+" / "+memoGroup'));
line('归档用到的函数', await evalJs(c, 'JSON.stringify({renderMemoArchive:typeof renderMemoArchive,renderMemoTagbar:typeof renderMemoTagbar,setMemoFilter:typeof setMemoFilter})'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
