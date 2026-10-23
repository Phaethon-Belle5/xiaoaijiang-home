/**
 * 验收「记忆书架（搬映像馆）」：
 *  ① 结构：viewport > floor + track > .memory-book（六面书）
 *  ② 选中态：只有一本 .active；点另一本 → 它变 active（且不打开）
 *  ③ 点已选中的那本 → 弹出详情
 *  ④ 封面：整张照片铺满、封面里没有标题/编号/元信息文字
 *  ⑤ 拖动/滚轮能横向滑
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?ms=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 120)); };

const CV = 'https://img.231060101.xyz/logo.png';
await evalJs(c, `(function(){
  const T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年','人类简史','百年孤独','房思琪'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4,
      review:'简介文字',thought:'评价一\\n评价二',cover:${JSON.stringify(CV)},date:'2026-0'+((i%9)+1)+'-01',link:'https://example.com'});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);

console.log('════ ① 结构（映像馆那套）════');
line('viewport', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("memory-shelf-viewport")'));
line('floor', await evalJs(c, '!!document.querySelector("#dim-grid .memory-shelf-floor")'));
line('track', await evalJs(c, '!!document.querySelector("#dim-grid .memory-shelf-track")'));
line('书本数量', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length'));
line('六面是否齐全', await evalJs(c, `(function(){
  var b=document.querySelector('#dim-grid .memory-book');
  if(!b)return '无';
  var faces=['memory-book-shadow','memory-book-object','memory-book-back','memory-book-page-face','memory-book-page-edge','memory-book-edge-top','memory-book-edge-bottom','memory-book-spine-face','memory-book-cover-inside','memory-book-cover'];
  return faces.filter(function(f){return !b.querySelector('.'+f)}).length===0 ? '10 个面全在' : ('缺 '+faces.filter(function(f){return !b.querySelector('.'+f)}).join(','));
})()`));
ok('结构与映像馆一致（viewport+floor+track+六面书）', '', await evalJs(c, '!!(document.querySelector("#dim-grid.memory-shelf-viewport .memory-shelf-floor")&&document.querySelector("#dim-grid .memory-shelf-track .memory-book .memory-book-object .memory-book-cover"))'));

console.log('\n════ ② 选中态 ════');
line('active 数量', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.active").length') + ' / ' + await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length'));
ok('只有一本 active', '', '1' === await evalJs(c, 'String(document.querySelectorAll("#dim-grid .memory-book.active").length)'));
line('active 的宽度', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");return b?Math.round(b.getBoundingClientRect().width)+"px":"无"})()'));
line('非 active 的宽度', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book:not(.active)");return b?Math.round(b.getBoundingClientRect().width)+"px":"无"})()'));
ok('选中是完整书、其余是书脊', '', (await evalJs(c, '(function(){var a=document.querySelector("#dim-grid .memory-book.active").getBoundingClientRect().width;var n=document.querySelector("#dim-grid .memory-book:not(.active)").getBoundingClientRect().width;return a>150&&n<80})()')) === true);

console.log('\n  --- 点第 3 本（未选中）→ 应变 active，且不打开弹窗 ---');
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[2].click();return 1})()`);
await sleep(900);
line('弹窗是否被打开', await evalJs(c, '!!document.querySelector("#dim-modal.show")'));
ok('点未选中的书：只选中、不打开', '', (await evalJs(c, '!!document.querySelector("#dim-modal.show")')) === false);
line('现在第几本是 active', await evalJs(c, `(function(){var a=[].slice.call(document.querySelectorAll('#dim-grid .memory-book'));return a.findIndex(function(b){return b.classList.contains('active')})})()`));
ok('第 3 本变成 active（索引 2）', '', '2' === await evalJs(c, `(function(){var a=[].slice.call(document.querySelectorAll('#dim-grid .memory-book'));return String(a.findIndex(function(b){return b.classList.contains('active')}))})()`));

console.log('\n  --- 再点这本（已选中）→ 应打开详情 ---');
const thirdTitle = await evalJs(c, `(function(){var a=document.querySelectorAll('#dim-grid .memory-book')[2];return a?a.querySelector('.memory-book-spine-copy b').textContent:''})()`);
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[2].click();return 1})()`);
await sleep(1200);
ok('再点已选中的书：打开详情', '', (await evalJs(c, '!!document.querySelector("#dim-modal.show")')) === true);
line('弹窗标题', await evalJs(c, '(function(){var e=document.querySelector(".dm-title");return e?e.textContent:"无"})()'));
ok('打开的是第 3 本该本（' + thirdTitle + '）', '', thirdTitle === await evalJs(c, '(function(){var e=document.querySelector(".dm-title");return e?e.textContent:""})()'));
await evalJs(c, 'closeDimDetail(), 1');
await sleep(700);
ok('关闭后 .opening 清干净', await evalJs(c, 'document.querySelectorAll(".memory-book.opening").length') + ' 个', (await evalJs(c, 'document.querySelectorAll(".memory-book.opening").length')) === 0);
ok('关闭后 viewport 的 opening 也移除', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("opening")'), (await evalJs(c, 'document.getElementById("dim-grid").classList.contains("opening")')) === false);

console.log('\n════ ③ 封面改动 ════');
line('封面里的文字', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active .memory-book-cover");return b?b.innerText.replace(/\\s+/g,""):"无"})()'));
ok('封面里没有任何文字（只有照片）', '', (await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active .memory-book-cover");return b?b.innerText.replace(/\\s+/g,""):"x"})()')) === '');
line('封面照片元素', await evalJs(c, 'document.querySelectorAll("#dim-grid .mbc-photo").length') + ' / ' + await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length'));
line('照片铺满封面', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  var ph=document.querySelector('#dim-grid .memory-book.active .mbc-photo');
  if(!cv||!ph)return '无';
  var a=cv.getBoundingClientRect(), b=ph.getBoundingClientRect();
  return '封面 '+Math.round(a.width)+'x'+Math.round(a.height)+' / 照片 '+Math.round(b.width)+'x'+Math.round(b.height);
})()`));
ok('照片与封面尺寸一致（铺满、无黑边）', '', await evalJs(c, '(function(){var cv=document.querySelector("#dim-grid .memory-book.active .memory-book-cover");var ph=document.querySelector("#dim-grid .memory-book.active .mbc-photo");if(!cv||!ph)return false;var a=cv.getBoundingClientRect(),b=ph.getBoundingClientRect();return Math.abs(a.width-b.width)<2&&Math.abs(a.height-b.height)<2})()') === true);
line('封面内边距', await evalJs(c, 'getComputedStyle(document.querySelector("#dim-grid .memory-book.active .memory-book-cover")).padding'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-memshelf.png');
console.log('  截图: shots/dim-memshelf.png');

console.log('\n════ ④ 滚动 ════');
line('可滚宽度', await evalJs(c, '(function(){var s=document.getElementById("dim-grid");return s.scrollWidth+" / "+s.clientWidth})()'));
const sr = JSON.parse(await evalJs(c, '(function(){var s=document.getElementById("dim-grid");s.scrollLeft=0;var r=s.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await sleep(400);
await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: sr.x, y: sr.y, deltaX: 0, deltaY: 260, button: 'none' });
await sleep(700);
const sl = await evalJs(c, 'Math.round(document.getElementById("dim-grid").scrollLeft)');
line('滚轮后 scrollLeft', sl);
ok('滚轮能横向滑书架', sl + 'px', Number(sl) > 40);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
