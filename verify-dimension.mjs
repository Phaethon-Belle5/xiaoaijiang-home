/**
 * 次元柜端到端验证：
 *  1) 导航里有「次元柜」
 *  2) 进入视图、三个分类切换、空状态
 *  3) 注入测试数据后卡片渲染：书籍/影视大封面、游戏小图标（对比实际尺寸）
 *  4) 子分类筛选、评分星级、感悟展开
 *  5) 后台面板能渲染、字段齐全
 *  注意：注入只在浏览器内存里，不写服务器 —— 不污染真实数据。
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?dim=' + Date.now() });
await sleep(20000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);

console.log('════ 1. 导航 ════');
line('导航项', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".pill-nav-item")).map(e=>e.textContent.trim()))'));
line('次元柜按钮在', await evalJs(c, '!!document.querySelector(\'.pill-nav-item[data-nav="dimension"]\')'));
line('图标已渲染', await evalJs(c, '(function(){var e=document.querySelector(\'.pill-nav-item[data-nav="dimension"] svg\');return e?"有 "+e.querySelectorAll("path").length+" 条路径":"无"})()'));

console.log('\n════ 2. 进入视图（空状态）════');
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2000);
line('currentView', await evalJs(c, 'currentView'));
line('视图可见', await evalJs(c, '(function(){var v=document.getElementById("view-dimension");return v&&v.classList.contains("active")?"是":"否"})()'));
line('三个分类 tab', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-tab")).map(e=>e.textContent.trim()))'));
line('空状态文案', await evalJs(c, '(function(){var e=document.querySelector(".dim-empty");return e?e.textContent.trim().slice(0,50):"没有空状态"})()'));

console.log('\n════ 3. 注入测试数据后渲染 ════');
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术'],films:['电影','剧集'],games:['单机','手游']},items:[
    {id:'t1',kind:'books',sub:'小说',title:'测试书籍甲',creator:'某作者',rating:4.5,review:'很好看的评价文字',thought:'第一条感悟\\n第二条感悟',cover:'',date:'2026-05-01',link:''},
    {id:'t2',kind:'books',sub:'技术',title:'测试书籍乙',creator:'另一作者',rating:3,review:'工具书',thought:'',cover:'',date:'2026-03-02',link:''},
    {id:'t3',kind:'films',sub:'电影',title:'测试电影',creator:'某导演',rating:5,review:'年度最佳',thought:'镜头语言很讲究',cover:'',date:'2026-06-01',link:'https://example.com'},
    {id:'t4',kind:'games',sub:'单机',title:'测试游戏甲',creator:'某工作室',rating:4,review:'手感不错',thought:'关卡设计有想法',cover:'',date:'2026-07-01',link:''},
    {id:'t5',kind:'games',sub:'手游',title:'测试游戏乙',creator:'某平台',rating:2.5,review:'一般',thought:'',cover:'',date:'2026-02-01',link:''}
  ]};
  renderDimension();
  return 1;
})()`);
await sleep(1500);
line('书籍卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('书籍卡片标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#dim-grid .dim-title")).map(e=>e.textContent))'));
line('子分类 chips', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-sub")).map(e=>e.textContent.trim()))'));
line('星级渲染', await evalJs(c, '(function(){var s=document.querySelector(".dim-card .dim-stars");return s?s.textContent.trim()+"（满星 "+s.querySelectorAll(".dim-star.full").length+" 半星 "+s.querySelectorAll(".dim-star.half").length+"）":"无"})()'));
line('评价显示', await evalJs(c, '(function(){var e=document.querySelector(".dim-review");return e?e.textContent:"无"})()'));
line('感悟默认收起', await evalJs(c, '(function(){var e=document.querySelector(".dim-thought");return e?Math.round(e.getBoundingClientRect().height)+"px":"无"})()'));
await evalJs(c, 'document.querySelector(".dim-thought-btn").click(), 1');
await sleep(900);
line('点开后展开', await evalJs(c, '(function(){var card=document.querySelector(".dim-card.open");if(!card)return "❌ 没展开";var e=card.querySelector(".dim-thought");return "✅ "+e.querySelectorAll("li").length+" 条 / "+Math.round(e.getBoundingClientRect().height)+"px"})()'));
line('按钮文字变化', await evalJs(c, 'document.querySelector(".dim-card.open .dim-thought-lb").textContent'));

console.log('\n════ 4. 子分类筛选 ════');
await evalJs(c, '[].slice.call(document.querySelectorAll(".dim-sub")).find(e=>e.textContent.indexOf("小说")>=0).click(), 1');
await sleep(1200);
line('筛选后卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('筛选后标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#dim-grid .dim-title")).map(e=>e.textContent))'));
line('计数文字', await evalJs(c, 'document.getElementById("dim-count").textContent'));

console.log('\n════ 5. 切到影视 / 游戏，对比图标尺寸 ════');
await evalJs(c, 'setDimKind("films"), 1');
await sleep(1200);
line('影视卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('影视封面尺寸', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-poster");if(!e)return "无";var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
const filmW = await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-poster");return e?Math.round(e.getBoundingClientRect().width):0})()');
await evalJs(c, 'setDimKind("games"), 1');
await sleep(1200);
line('游戏卡片数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('游戏图标尺寸', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-icon");if(!e)return "无";var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
const gameW = await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-icon");return e?Math.round(e.getBoundingClientRect().width):0})()');
line('网格类名', await evalJs(c, 'document.getElementById("dim-grid").className'));
line('游戏是否横向排布', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-card.is-game")).flexDirection'));
line('图标更小（关键要求）', (filmW > gameW) ? ('✅ 影视封面 ' + filmW + 'px > 游戏图标 ' + gameW + 'px') : ('❌ 影视 ' + filmW + ' 游戏 ' + gameW));

console.log('\n════ 6. 后台面板 ════');
line('导航含 dimension', await evalJs(c, 'ADMIN_SECTIONS.some(s=>s.id==="dimension") ? "是" : "否"'));
line('主渲染', await evalJs(c, 'try{return "正常 "+ADMIN_RENDER.dimension().length+" 字符"}catch(e){return "❌ 抛错 "+e.message}'));
line('预览', await evalJs(c, 'try{return "正常 "+ADMIN_PREVIEW.dimension().length+" 字符"}catch(e){return "❌ 抛错 "+e.message}'));
line('可编辑字段数', await evalJs(c, 'try{return (ADMIN_RENDER.dimension().match(/data-d-idx=/g)||[]).length+" 个"}catch(e){return "err"}'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
