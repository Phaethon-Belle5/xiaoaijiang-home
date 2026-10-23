/**
 * 终验：
 *  ① 书架结构与映像馆一致（viewport 660 / 书 308×484 / 十层标记）
 *  ② 封面是映像馆的排版：分类名 + 大字书名 + 照片 + 作者/日期，且文字是深墨可见
 *  ③ 选中/拖动/滚轮/打开详情
 *  ④ 游戏区没被改动（仍然是原来的 .dim-card 渲染，且能正常切换）
 */
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
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?fin=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 120)); };

const CV = 'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
await evalJs(c, `(function(){
  var T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年'];
  data.dimension={subs:{books:['小说'],films:['电影'],games:['单机']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4,
      review:'简介文字',thought:'评价一\\n评价二',cover:(i===3?${JSON.stringify(CV)}:''),date:'2026-0'+((i%9)+1)+'-01',link:'https://example.com'});
  });
  data.dimension.items.push({id:'f1',kind:'films',sub:'电影',title:'海上钢琴师',creator:'朱塞佩',rating:5,review:'选择',thought:'钢琴',cover:'',date:'2026-07-01',link:''});
  data.dimension.items.push({id:'g1',kind:'games',sub:'单机',title:'空洞骑士',creator:'Team Cherry',rating:4.5,review:'手感好',thought:'地图',cover:'',date:'2026-06-01',link:''});
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);

console.log('════ ① 结构与尺寸 ════');
line('viewport 尺寸', await evalJs(c, '(function(){var r=document.getElementById("dim-grid").getBoundingClientRect();return Math.round(r.width)+" x "+Math.round(r.height)})()'));
line('viewport 圆角', await evalJs(c, 'getComputedStyle(document.getElementById("dim-grid")).borderRadius'));
line('书尺寸（active）', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");if(!b)return "无";var r=b.getBoundingClientRect();return Math.round(r.width)+" x "+Math.round(r.height)})()'));
line('书尺寸（spine）', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book:not(.active)");if(!b)return "无";return Math.round(b.getBoundingClientRect().width)+" 宽"})()'));
ok('视口够高（≥600px），书不被裁', '', (await evalJs(c, 'Math.round(document.getElementById("dim-grid").getBoundingClientRect().height)')) >= 600);
ok('选中书 308×484（同映像馆）', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");var r=b.getBoundingClientRect();return String(Math.round(r.width===308&&r.height===484))})()'), 'true' === await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");var r=b.getBoundingClientRect();return String(Math.round(r.width)===308&&Math.round(r.height)===484)})()'));

console.log('\n════ ② 封面是映像馆的排版 ════');
line('封面文字', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  return cv?cv.innerText.replace(/\\s+/g,'|'):'无';
})()`));
line('书名颜色', await evalJs(c, `(function(){var e=document.querySelector('#dim-grid .memory-book.active .memory-book-title');return e?getComputedStyle(e).color:'无'})()`));
ok('封面有分类名+书名+作者+日期', '', (await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  if(!cv)return false;
  var t=cv.innerText;
  return /书籍/.test(t) && /万历十五年/.test(t) && /作者/.test(t) && /2026-/.test(t);
})()`)) === true);
ok('书名是深墨色（可见）', await evalJs(c, `(function(){var e=document.querySelector('#dim-grid .memory-book.active .memory-book-title');if(!e)return '无';var m=getComputedStyle(e).color.match(/\\d+/g);return m?('rgb('+m[0]+','+m[1]+','+m[2]+') 亮度'+Math.round((+m[0]+ +m[1]+ +m[2])/3)):'无'})()`), (await evalJs(c, `(function(){var e=document.querySelector('#dim-grid .memory-book.active .memory-book-title');if(!e)return false;var m=getComputedStyle(e).color.match(/\\d+/g);return m?(((+m[0])+(+m[1])+(+m[2]))/3)<120:false})()`)) === true);
line('照片层数', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.active .memory-book-photo").length'));
ok('封面有照片层（映像馆同款）', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.active .memory-book-photo").length')) >= 1);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-shelf-final.png');

console.log('\n════ ③ 交互 ════');
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[2].click();return 1})()`);
await sleep(900);
const idx = await evalJs(c, `(function(){var a=[].slice.call(document.querySelectorAll('#dim-grid .memory-book'));return String(a.findIndex(function(b){return b.classList.contains('active')}))})()`);
ok('点第 3 本 → 它变 active（且未打开）', idx, idx === '2' && (await evalJs(c, '!!document.querySelector("#dim-modal.show")')) === false);
const t3 = await evalJs(c, `(function(){var b=document.querySelectorAll('#dim-grid .memory-book')[2];return b.querySelector('.memory-book-title').textContent})()`);
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[2].click();return 1})()`);
await sleep(1300);
ok('再点 → 打开详情', '', (await evalJs(c, '!!document.querySelector("#dim-modal.show")')) === true);
ok('打开的是同一本（' + t3 + '）', await evalJs(c, '(function(){var e=document.querySelector(".dm-title");return e?e.textContent:"无"})()'), t3 === await evalJs(c, '(function(){var e=document.querySelector(".dm-title");return e?e.textContent:""})()'));
await evalJs(c, 'closeDimDetail(), 1');
await sleep(700);
const sr = JSON.parse(await evalJs(c, '(function(){var s=document.getElementById("dim-grid");s.scrollLeft=0;var r=s.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await sleep(400);
await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: sr.x, y: sr.y, deltaX: 0, deltaY: 260, button: 'none' });
await sleep(700);
ok('滚轮能横向滑', await evalJs(c, 'Math.round(document.getElementById("dim-grid").scrollLeft)') + 'px', Number(await evalJs(c, 'Math.round(document.getElementById("dim-grid").scrollLeft)')) > 40);

console.log('\n════ ④ 游戏区没被动 ════');
await evalJs(c, 'setDimKind("games"), 1');
await sleep(2000);
line('游戏渲染容器', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length') + ' 个 .dim-card');
ok('游戏仍是原来的 .dim-card 渲染', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length')) >= 1);
ok('游戏里没有 memory-book（没被换成书架）', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length')) === 0);
line('游戏标题', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-card .dim-title, #dim-grid .dim-card strong, #dim-grid .dim-card h3");return e?e.textContent:"（取不到，看卡片数）"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-games-check.png');
console.log('  截图: shots/dim-games-check.png');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
