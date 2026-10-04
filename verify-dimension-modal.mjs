/**
 * 验证次元柜改成「弹出式」：
 *  · 点卡片 → 弹出居中详情窗（不是页面内展开，页面内容不变）
 *  · 弹窗里有封面/标题/子分类/作者/星级/评价/感悟/链接
 *  · 关闭：右上 ×、点遮罩、Esc 三条路都行
 *  · 打开时锁滚动，关闭后解锁
 * 关键：确认点开后「页面本身没有被改动」（不回到网站内容里）
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?modal=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);

await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术'],films:['电影'],games:['单机']},items:[
    {id:'m1',kind:'books',sub:'小说',title:'弹窗测试书',creator:'作者甲',rating:4.5,review:'这是一段评价文字',thought:'感悟第一条\\n感悟第二条\\n感悟第三条',cover:'',date:'2026-05-01',link:'https://example.com'},
    {id:'m2',kind:'books',sub:'技术',title:'没详情的书',creator:'作者乙',rating:3,review:'',thought:'',cover:'',date:'2026-03-01',link:''},
    {id:'m3',kind:'games',sub:'单机',title:'弹窗测试游戏',creator:'工作室',rating:4,review:'好玩',thought:'关卡不错',cover:'',date:'2026-07-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);

console.log('════ 1. 打开前：页面上没有弹窗 ════');
line('弹窗元素存在', await evalJs(c, 'document.getElementById("dim-modal")?"在":"还没有（懒创建）"'));
line('卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('卡片里有评价文字吗', await evalJs(c, '(function(){var g=document.getElementById("dim-grid");return /评价文字/.test(g.innerText)?"❌ 还在页面上":"✅ 不在（收进弹窗）"})()'));
line('页面高度', await evalJs(c, 'document.body.scrollHeight'));

console.log('\n════ 2. 点卡片 → 弹窗 ════');
const before = await evalJs(c, 'document.body.scrollHeight');
await evalJs(c, 'document.querySelector("#dim-grid .dim-card.clickable").click(), 1');
await sleep(1000);
line('弹窗已创建', await evalJs(c, '!!document.getElementById("dim-modal")'));
line('弹窗 show 类', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'));
line('弹窗可见尺寸', await evalJs(c, '(function(){var b=document.querySelector(".dim-modal-box");var r=b.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)+" @ "+Math.round(r.left)+","+Math.round(r.top)})()'));
line('是否居中', await evalJs(c, '(function(){var r=document.querySelector(".dim-modal-box").getBoundingClientRect();var dx=Math.abs((r.left+r.right)/2-innerWidth/2),dy=Math.abs((r.top+r.bottom)/2-innerHeight/2);return (dx<3&&dy<3)?"✅ 居中":"⚠ dx="+Math.round(dx)+" dy="+Math.round(dy)})()'));
line('遮罩存在', await evalJs(c, '!!document.querySelector(".dim-modal-mask")'));
line('body 锁滚动', await evalJs(c, 'document.body.classList.contains("dim-modal-open")'));
line('页面内容未被改动', await evalJs(c, '(function(){var after=document.body.scrollHeight;return after===' + before + '?"✅ 高度不变 " + after:"⚠ 变了 " + after})()'));

console.log('\n════ 3. 弹窗内容 ════');
line('标题', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-title");return e?e.textContent:"无"})()'));
line('类型 + 子分类', await evalJs(c, '(function(){var k=document.querySelector(".dim-m-kind"),s=document.querySelector("#dim-modal-body .dim-chip");return (k?k.textContent.trim():"?")+" / "+(s?s.textContent:"?")})()'));
line('作者·日期', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-meta");return e?e.textContent:"无"})()'));
line('星级', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-stars");return e?e.textContent.trim():"无"})()'));
line('评价段', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-text");return e?e.textContent:"无"})()'));
line('感悟条数', await evalJs(c, 'document.querySelectorAll(".dim-m-list li").length'));
line('感悟内容', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-m-list li")).map(e=>e.textContent))'));
line('链接', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-link");return e?e.getAttribute("href"):"无"})()'));
line('关闭按钮', await evalJs(c, '!!document.querySelector(".dim-modal-x")'));

console.log('\n════ 4. 三种关闭方式 ════');
await evalJs(c, 'document.querySelector(".dim-modal-x").click(), 1');
await sleep(800);
line('① 点 × 关闭', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")?"❌ 还开着":"✅ 已关"'));
line('   滚动已解锁', await evalJs(c, 'document.body.classList.contains("dim-modal-open")?"❌ 还锁着":"✅ 已解锁"'));
await evalJs(c, 'document.querySelector("#dim-grid .dim-card.clickable").click(), 1');
await sleep(700);
await evalJs(c, 'document.querySelector(".dim-modal-mask").click(), 1');
await sleep(800);
line('② 点遮罩关闭', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")?"❌ 还开着":"✅ 已关"'));
await evalJs(c, 'document.querySelector("#dim-grid .dim-card.clickable").click(), 1');
await sleep(700);
await evalJs(c, 'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"})), 1');
await sleep(800);
line('③ Esc 关闭', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")?"❌ 还开着":"✅ 已关"'));

console.log('\n════ 5. 游戏那条也能弹 ════');
await evalJs(c, 'setDimKind("games"), 1');
await sleep(1200);
line('游戏卡片可点', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card.clickable").length'));
await evalJs(c, 'document.querySelector("#dim-grid .dim-card.clickable").click(), 1');
await sleep(900);
line('弹窗标题', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-title");return e?e.textContent:"无"})()'));
line('类型标签', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-kind");return e?e.textContent.trim():"无"})()'));
line('评价', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-text");return e?e.textContent:"无"})()'));
await evalJs(c, 'closeDimDetail(), 1');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
