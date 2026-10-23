/**
 * 验收三件事：
 *  ① 鼠标在书上滚动 → 横向滑书架 + 停下吸附到最近一本
 *  ② 点击 → 弹窗从这本书的位置长出来（不是屏幕中央凭空出现）
 *  ③ 弹窗内容是新版（顶栏 / 大封面 / 01·02 编号分节 / 底栏）
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?w=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(28) + ' = ' + String(v).slice(0, 110)); };

// 放 12 本书，足够宽才能横向滚
const CV = 'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
await evalJs(c, `(function(){
  const T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年','人类简史','百年孤独','房思琪','茶花女','悲惨世界','鼠疫','看不见的城市'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),
      rating:(i%5)+0.5, review:'《'+t+'》的简介。这里是一段稍长的文字，用来看详情页的排版效果。',
      thought:'评价一\\n评价二', cover:i%3?${JSON.stringify(CV)}:'', date:'2026-0'+((i%9)+1)+'-01', link:'https://example.com'});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);

console.log('════ ① 滚轮横向滑书架 ════');
line('书架可滚宽度', await evalJs(c, '(function(){var s=document.getElementById("dim-grid");return s.scrollWidth+" / 可视 "+s.clientWidth})()'));
const before = await evalJs(c, '(function(){var s=document.getElementById("dim-grid");s.scrollLeft=0;return 0})()');
await sleep(400);
// 在书架上发一个竖向滚轮
const sr = JSON.parse(await evalJs(c, '(function(){document.getElementById("dim-grid").scrollIntoView({block:"center",behavior:"instant"});var r=document.getElementById("dim-grid").getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await sleep(500);
await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: sr.x, y: sr.y, deltaX: 0, deltaY: 300, button: 'none' });
await sleep(700);
const afterWheel = await evalJs(c, '(function(){return Math.round(document.getElementById("dim-grid").scrollLeft)})()');
line('滚动前 scrollLeft', before);
line('滚轮后 scrollLeft', afterWheel);
ok('竖向滚轮让书架横向滑动了', afterWheel + 'px', Number(afterWheel) > 50);
line('页面是否被带着滚了', await evalJs(c, 'Math.round(window.scrollY)') + 'px（书架区域滚动时不该动页面）');
await sleep(900);
const snapped = await evalJs(c, `(function(){
  var s=document.getElementById('dim-grid');
  var pad=parseFloat(getComputedStyle(s).paddingLeft)||0;
  var books=[].slice.call(s.querySelectorAll('.spine-book'));
  var sl=s.scrollLeft;
  var best=1e9;
  books.forEach(function(b){var d=Math.abs(b.offsetLeft-pad-sl);if(d<best)best=d;});
  return Math.round(best);
})()`);
ok('停下后吸附到某本书（偏差 < 3px）', snapped + 'px', Number(snapped) < 3);

console.log('\n════ ② 弹窗从书里长出来 ════');
const target = JSON.parse(await evalJs(c, `(function(){
  var b=document.querySelectorAll('.spine-book')[4];
  b.scrollIntoView({block:'center',behavior:'instant'});
  var r=b.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),t:b.querySelector('.sp-title').textContent});
})()`));
line('要点第 5 本', target.t);
await evalJs(c, `(function(){document.querySelectorAll('.spine-book')[4].click();return 1})()`);
await sleep(700);
line('弹窗已出', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'));
const origin = await evalJs(c, `(function(){
  var p=document.querySelector('.dim-modal-box');
  var pr=p.getBoundingClientRect();
  var want='calc(50% + '+Math.round((${target.x}-(pr.left+pr.width/2)))+'px) calc(50% + '+Math.round((${target.y}-(pr.top+pr.height/2)))+'px)';
  return p.style.transformOrigin||'（未设置）';
})()`);
line('面板缩放原点', origin);
ok('原点设在被点的书上（不是 50% 50%）', origin, origin.indexOf('calc(') >= 0);
line('面板当前缩放', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-modal-box")).transform'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-popup-new.png');
console.log('  截图: shots/dim-popup-new.png');

console.log('\n════ ③ 新弹窗内容结构 ════');
line('顶栏标题', await evalJs(c, '(function(){var e=document.querySelector(".dm-bar-lb");return e?e.textContent:"无"})()'));
line('档案编码', await evalJs(c, '(function(){var e=document.querySelector(".dm-code");return e?e.textContent:"无"})()'));
line('大封面区', await evalJs(c, '!!document.querySelector(".dm-hero")'));
line('主信息区', await evalJs(c, '!!document.querySelector(".dm-main")'));
line('标题', await evalJs(c, '(function(){var e=document.querySelector(".dm-title");return e?e.textContent:"无"})()'));
line('编号分节', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dm-sec-h")).map(function(h){return h.innerText.replace(/\\s+/g," ").trim()}))'));
line('分节发丝线', await evalJs(c, '(function(){var i=document.querySelector(".dm-sec-h i");var s=getComputedStyle(i);return s.width+"/"+s.height})()'));
line('简介正文', await evalJs(c, '(function(){var e=document.querySelector(".dm-text");return e?e.textContent.slice(0,40):"无"})()'));
line('评价条数', await evalJs(c, 'document.querySelectorAll(".dm-list li").length'));
line('底栏按钮', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dm-foot > *")).map(function(e){return e.textContent.trim()}))'));
ok('结构齐全（顶栏+封面+主信息+分节+底栏）', '', await evalJs(c, '!!(document.querySelector(".dm-bar")&&document.querySelector(".dm-hero")&&document.querySelector(".dm-main")&&document.querySelector(".dm-sec-h")&&document.querySelector(".dm-foot"))'));
ok('分节带编号 01/02', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dm-sec-h span")).map(function(e){return e.textContent}))'), /\["01","02"\]/.test(await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dm-sec-h span")).map(function(e){return e.textContent}))')));

console.log('\n  --- 点底栏「关闭」---');
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".dm-foot button")).find(function(x){return x.textContent.indexOf("关闭")>=0});if(b)b.click();return 1})()');
await sleep(700);
ok('关闭可用', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'), (await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")')) === false);
ok('书合回去了', await evalJs(c, 'document.querySelectorAll(".spine-book.opening").length') + ' 个', (await evalJs(c, 'document.querySelectorAll(".spine-book.opening").length')) === 0);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
