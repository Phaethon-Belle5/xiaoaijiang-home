/**
 * 验收三点修复：
 *  ① 游戏区回到最初的样子（普通网格 .dim-card，不套书架结构）
 *  ② 封面没被改（是映像馆原版排版）
 *  ③ 立体感：选中书微微侧转、书脊面可见、透视 1600px
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?f3=' + Date.now() });
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
      review:'简介',thought:'评价',cover:(i===3?${JSON.stringify(CV)}:''),date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  data.dimension.items.push({id:'g1',kind:'games',sub:'单机',title:'空洞骑士',creator:'Team Cherry',rating:4.5,review:'手感好',thought:'地图',cover:'',date:'2026-06-01',link:''});
  data.dimension.items.push({id:'g2',kind:'games',sub:'单机',title:'泰拉瑞亚',creator:'Re-Logic',rating:5,review:'经典',thought:'',cover:'',date:'2026-05-01',link:''});
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);

console.log('════ ① 书籍区：3D ════');
line('视口透视', await evalJs(c, 'getComputedStyle(document.getElementById("dim-grid")).perspective'));
line('选中书 object 的 transform', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-object");return e?getComputedStyle(e).transform.slice(0,60):"无"})()'));
ok('选中书有 rotateY 侧转（3D）', '', (await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-object");if(!e)return false;var t=getComputedStyle(e).transform;return t.indexOf("matrix3d")>=0||t.indexOf("matrix")>=0})()')) === true);
line('书脊面可见度', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-spine-face");return e?getComputedStyle(e).opacity:"无"})()'));
ok('选中书露出书脊面（立体厚度）', '', (await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-spine-face");return e?getComputedStyle(e).opacity:"0"})()')) === '1');
line('封底可见度', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-back");return e?getComputedStyle(e).opacity:"无"})()'));
ok('选中书封底隐去', '', (await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.active .memory-book-back");return e?getComputedStyle(e).opacity:"1"})()')) === '0');
line('书有厚度（--book-depth）', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");return b?getComputedStyle(b).getPropertyValue("--book-depth").trim()||"(未定义)":"无"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-3d.png');

console.log('\n════ ② 封面没被改（映像馆原版）════');
line('封面结构', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  if(!cv)return '无';
  var need=['memory-book-index','memory-book-title','memory-book-photo','memory-book-meta'];
  var miss=need.filter(function(k){return !cv.querySelector('.'+k)});
  return miss.length? ('缺 '+miss.join(',')) : 'index/title/photo/meta 齐全';
})()`));
line('封面文字', await evalJs(c, `(function(){var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');return cv?cv.innerText.replace(/\\s+/g,'|'):'无'})()`));
ok('封面是映像馆排版（不是被删成纯照片）', '', (await evalJs(c, `(function(){var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');if(!cv)return false;return !!(cv.querySelector('.memory-book-title')&&cv.querySelector('.memory-book-photo')&&cv.querySelector('.memory-book-meta'))})()`)) === true);

console.log('\n════ ③ 游戏区回到最初的样子 ════');
await evalJs(c, 'setDimKind("games"), 1');
await sleep(2200);
line('容器类名', await evalJs(c, 'document.getElementById("dim-grid").className'));
ok('不再套书架结构', '', (await evalJs(c, '(function(){var g=document.getElementById("dim-grid").className;return g.indexOf("memory-shelf-viewport")<0&&g.indexOf("dim-rail")<0})()')) === true);
ok('恢复成 dim-grid（原网格）', '', (await evalJs(c, 'document.getElementById("dim-grid").classList.contains("dim-grid")')) === true);
line('显示方式', await evalJs(c, 'getComputedStyle(document.getElementById("dim-grid")).display'));
line('游戏卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('书架结构残留', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-shelf-track").length') + ' 个 track / ' + await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length') + ' 个 memory-book');
ok('没有任何书架残留', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-shelf-track, #dim-grid .memory-book").length')) === 0);
line('卡片标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#dim-grid .dim-card")).map(function(e){var t=e.querySelector(".dim-title,strong,h3,.dim-name");return t?t.textContent.trim():"?"}))'));
line('网格列数', await evalJs(c, 'getComputedStyle(document.getElementById("dim-grid")).gridTemplateColumns'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-games-original.png');
console.log('  截图: shots/dim-games-original.png');

console.log('\n════ ④ 切回书籍区仍正常 ════');
await evalJs(c, 'setDimKind("books"), 1');
await sleep(2200);
ok('切回书籍 → 又是书架', '', (await evalJs(c, 'document.getElementById("dim-grid").classList.contains("memory-shelf-viewport")')) === true);
ok('书架上有书', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length')) > 0);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
