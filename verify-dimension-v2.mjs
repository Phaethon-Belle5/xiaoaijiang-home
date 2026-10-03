/**
 * 验证这次的三点修改：
 *  1) 三个分类 tab 用线性 SVG 图标（不再是 emoji）
 *  2) 切换有按钮互动：:active 缩放、hover 图标动效、切换时网格错落入场
 *  3) 卡片改成「点击展开」：默认只显示封面/标题/星级，点整张卡展开评价与感悟
 * 注意：后台标签里 CSS 过渡/动画不推进，量高度前先禁用动画。
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?v2=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + v);

// 注入测试数据
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术'],films:['电影'],games:['单机']},items:[
    {id:'c1',kind:'books',sub:'小说',title:'有详情的书',creator:'作者甲',rating:4.5,review:'这是一段评价文字',thought:'感悟第一条\\n感悟第二条',cover:'',date:'2026-05-01',link:''},
    {id:'c2',kind:'books',sub:'技术',title:'没详情的书',creator:'作者乙',rating:3,review:'',thought:'',cover:'',date:'2026-03-01',link:''},
    {id:'c3',kind:'books',sub:'小说',title:'只有链接的书',creator:'作者丙',rating:5,review:'',thought:'',cover:'',date:'2026-01-01',link:'https://example.com'}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
// 禁掉过渡/动画，后台标签里它们不推进，会量到假值
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);

console.log('════ 1. 图标（不能是 emoji）════');
line('tab 里的 SVG 数', await evalJs(c, 'document.querySelectorAll(".dim-tab svg.dim-tab-ic").length'));
line('tab 文本', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-tab")).map(e=>e.textContent.trim()))'));
line('还有 emoji 吗', await evalJs(c, '(function(){var t=[].slice.call(document.querySelectorAll(".dim-tab")).map(e=>e.textContent).join("");return /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(t)?"❌ 还有":"✅ 没有了"})()'));
line('图标路径数', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-tab svg")).map(s=>s.querySelectorAll("path").length))'));

console.log('\n════ 2. 按钮互动 ════');
line('tab:active 规则', await evalJs(c, '(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".dim-tab:active")return "有 "+rs[j].style.transform}}catch(e){}}return "❌ 没有"})()'));
line('hover 图标动效', await evalJs(c, '(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".dim-tab:hover .dim-tab-ic")return "有 "+rs[j].style.transform}}catch(e){}}return "❌ 没有"})()'));
line('入场动画规则', await evalJs(c, '(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".dim-anim .dim-card")return "有 "+rs[j].style.animation}}catch(e){}}return "❌ 没有"})()'));
console.log('  — 模拟点击「影视」 —');
await evalJs(c, 'document.querySelector(\'.dim-tab[data-dim-kind="films"]\').click(), 1');
await sleep(1200);
line('切换后 dimKind', await evalJs(c, 'dimKind'));
line('active 类转移', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-tab")).map(e=>e.dataset.dimKind+(e.classList.contains("active")?"*":"")))'));
line('网格加了入场类', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("dim-anim")'));
await evalJs(c, 'setDimKind("books"), 1');
await sleep(1200);

console.log('\n════ 3. 卡片点击展开 ════');
line('卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('可点击的卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card.clickable").length'));
line('不可点击（无详情）', await evalJs(c, '(function(){var cs=[].slice.call(document.querySelectorAll("#dim-grid .dim-card"));return cs.filter(x=>!x.classList.contains("clickable")).map(x=>x.querySelector(".dim-title").textContent).join(",")||"无"})()'));
line('默认收起：more 高度', await evalJs(c, '(function(){var e=document.querySelector(".dim-card .dim-more");return e?Math.round(e.getBoundingClientRect().height)+"px":"无"})()'));
line('评价在收起区内', await evalJs(c, '(function(){var e=document.querySelector(".dim-card .dim-more .dim-review");return e?"是（默认看不见）":"评价不在收起区"})()'));
line('提示文字', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-toggle-lb")).map(e=>e.textContent))'));
line('aria-expanded 初值', await evalJs(c, 'document.querySelector(".dim-card.clickable").getAttribute("aria-expanded")'));
console.log('  — 点第一张卡 —');
await evalJs(c, 'document.querySelector("#dim-grid .dim-card.clickable").click(), 1');
await sleep(900);
line('展开后 more 高度', await evalJs(c, '(function(){var card=document.querySelector(".dim-card.open");if(!card)return "❌ 没展开";var e=card.querySelector(".dim-more");return Math.round(e.getBoundingClientRect().height)+"px"})()'));
line('展开后有评价', await evalJs(c, '(function(){var card=document.querySelector(".dim-card.open");var e=card.querySelector(".dim-review");return e?"✅ "+e.textContent:"❌ 无"})()'));
line('展开后有感悟条数', await evalJs(c, '(function(){var card=document.querySelector(".dim-card.open");return card.querySelectorAll(".dim-thought li").length+" 条"})()'));
line('按钮文字变化', await evalJs(c, 'document.querySelector(".dim-card.open .dim-toggle-lb").textContent'));
line('aria-expanded 变化', await evalJs(c, 'document.querySelector(".dim-card.open").getAttribute("aria-expanded")'));
line('箭头旋转', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-card.open .dim-chev")).transform'));
await evalJs(c, 'document.querySelector(".dim-card.open").click(), 1');
await sleep(900);
line('再点收起', await evalJs(c, 'document.querySelectorAll(".dim-card.open").length===0?"✅ 已收起":"❌ 还开着"'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
