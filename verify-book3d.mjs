/**
 * 验证书籍做成「立体书」：
 *  · 结构：.book3d > .book3d-scene > .book3d-inner > (cover / pages / back)
 *  · 下面没有文字块（用户要的"不要拖一个大尾椎"）
 *  · 悬停抽出来：rotateY(-30deg) scale(1.09) translateX(-14px)
 *  · 抽出来后跟随鼠标微调
 *  · 影视/游戏仍是原来的卡片（不受影响）
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?book=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);

await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术'],films:['电影'],games:['单机']},items:[
    {id:'b1',kind:'books',sub:'小说',title:'救世主',creator:'某作者',rating:4.5,review:'很好看',thought:'感悟一\\n感悟二',cover:'',date:'2026-05-01',link:''},
    {id:'b2',kind:'books',sub:'技术',title:'图解 HTTP',creator:'上野宣',rating:4,review:'入门友好',thought:'',cover:'',date:'2026-03-01',link:''},
    {id:'f1',kind:'films',sub:'电影',title:'某电影',creator:'导演',rating:5,review:'',thought:'',cover:'',date:'2026-06-01',link:''},
    {id:'g1',kind:'games',sub:'单机',title:'某游戏',creator:'工作室',rating:4,review:'好玩',thought:'',cover:'',date:'2026-07-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);

console.log('════ 1. 立体书结构 ════');
line('书籍用 .book3d', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d").length'));
line('三层都在', await evalJs(c, '(function(){var b=document.querySelector(".book3d");return ["book3d-cover","book3d-pages","book3d-back","book3d-inner","book3d-scene"].map(function(k){return k+(b.querySelector("."+k)?"✓":"✗")}).join(" ")})()'));
line('网格带 books 类', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("books")'));

console.log('\n════ 2. "不要拖一个大尾椎" —— 下面没有文字块 ════');
line('书籍卡片里有 .dim-body', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d .dim-body").length + " 个（应为 0）"'));
line('书籍卡片里有 .dim-title', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d .dim-title").length + " 个（应为 0）"'));
line('书籍卡片里有 .dim-meta/.dim-stars', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d .dim-meta, #dim-grid .book3d .dim-stars").length + " 个（应为 0）"'));
line('卡片里可见文字', await evalJs(c, '(function(){var b=document.querySelector(".book3d");var t=b.innerText.replace(/\\s+/g," ").trim();return t?("「"+t.slice(0,40)+"」"):"（空 —— 只有封面）"})()'));
line('书名去哪了', await evalJs(c, 'document.querySelector(".book3d").getAttribute("title")'));

console.log('\n════ 3. 封面兜底（没有图片时自己画一个封面）════');
line('兜底封面在', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d-fallback").length'));
line('兜底上的书名', await evalJs(c, '(function(){var e=document.querySelector(".book3d-fb-title");return e?e.textContent:"无"})()'));
line('封面上有子分类标签', await evalJs(c, '(function(){var e=document.querySelector(".book3d-tag");return e?e.textContent:"无"})()'));
line('封面上有评分', await evalJs(c, '(function(){var e=document.querySelector(".book3d-score");return e?e.textContent:"无"})()'));

console.log('\n════ 4. 悬停抽出来 ════');
const geo = JSON.parse(await evalJs(c, '(function(){var el=document.querySelector("#dim-grid .book3d-scene");el.scrollIntoView({block:"center",behavior:"instant"});var r=el.getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
console.log('  书的区域: ' + geo.l + ',' + geo.t + ' ' + geo.w + 'x' + geo.h);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + 20, y: geo.t + 20, button: 'none' });
await sleep(200);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.3), y: geo.t + Math.round(geo.h * 0.3), button: 'none' });
await sleep(700);
line('悬停后内层 transform', await evalJs(c, '(function(){var e=document.querySelector(".book3d-inner");return e.style.transform||"(CSS hover 生效)"})()'));
line('CSS hover 规则', await evalJs(c, `(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".book3d:hover .book3d-inner")return rs[j].style.transform}}catch(e){}}return "❌ 无"})()`));
line('书页边几何', await evalJs(c, '(function(){var p=document.querySelector(".book3d-pages");var r=p.getBoundingClientRect();var s=getComputedStyle(p);return "尺寸 "+Math.round(r.width)+"x"+Math.round(r.height)+"  transform="+s.transform.slice(0,42)})()'));
line('封底 Z 位移', await evalJs(c, 'getComputedStyle(document.querySelector(".book3d-back")).transform'));

console.log('\n════ 5. 抽出来后跟随鼠标 ════');
await sleep(500);   // 等 following 类（280ms 后加）
const p1 = await evalJs(c, `(function(){var el=document.querySelector("#dim-grid .book3d");var r=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent("mousemove",{clientX:r.left+r.width*0.15,clientY:r.top+r.height*0.2,bubbles:true}));
  return document.querySelector(".book3d-inner").style.transform})()`);
await sleep(250);
const p2 = await evalJs(c, `(function(){var el=document.querySelector("#dim-grid .book3d");var r=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent("mousemove",{clientX:r.left+r.width*0.85,clientY:r.top+r.height*0.8,bubbles:true}));
  return document.querySelector(".book3d-inner").style.transform})()`);
line('鼠标偏左上', p1);
line('鼠标偏右下', p2);
line('两者不同（真的跟手）', p1 !== p2 ? '✅ 不同' : '❌ 一样');
line('仍保持"抽出来"姿态', /-30/.test(p1) || /rotateY\(-2/.test(p1) ? '✅ 基准 -30° 附近' : '⚠ ' + p1);
line('following 类', await evalJs(c, 'document.querySelector(".book3d").classList.contains("following")'));

console.log('\n════ 6. 移出复原 ════');
await evalJs(c, 'document.getElementById("dim-grid").dispatchEvent(new MouseEvent("mouseleave",{bubbles:false})), 1');
await sleep(500);
line('内层 transform', await evalJs(c, 'document.querySelector(".book3d-inner").style.transform || "（已清空）"'));
line('following 类', await evalJs(c, 'document.querySelector(".book3d").classList.contains("following")'));

console.log('\n════ 7. 影视/游戏不受影响 ════');
await evalJs(c, 'setDimKind("films"), 1'); await sleep(1200);
line('影视用老卡片', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length + " 个 dim-card / " + document.querySelectorAll("#dim-grid .book3d").length + " 个 book3d"'));
line('影视有文字块', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card .dim-body").length'));
line('网格 books 类已移除', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("books")'));
await evalJs(c, 'setDimKind("games"), 1'); await sleep(1200);
line('游戏仍是小图标', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-icon");var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
