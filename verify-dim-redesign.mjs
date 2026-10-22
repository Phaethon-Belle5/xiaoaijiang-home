/**
 * 次元柜改版验收 + 截图
 *  ① 奶白玻璃面板 / 档案式页眉是否到位
 *  ② 立体书架：书脊竖立、有编号、竖排书名、悬停抽出翻成封面
 *  ③ 书架下方的档案条目随悬停更新
 *  ④ 点击后的详情弹窗排版
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?shelf=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(28) + ' = ' + String(v).slice(0, 120)); };

// 造 6 本带封面的书 + 2 部影视 + 2 个游戏
await evalJs(c, `(function(){
  const CV='https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
  const titles=['月光航线','玻璃海纪事','风起青山','三体','万历十五年','人类简史'];
  data.dimension={subs:{books:['小说','科普'],films:['电影'],games:['单机']},items:[]};
  titles.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:i%2?'科普':'小说',title:t,creator:'作者'+(i+1),rating:(i%5)+0.5,
      review:'这是《'+t+'》的简介文字，用来测试详情排版的显示效果。',thought:'评价第一条\\n评价第二条\\n评价第三条',
      cover:i%2?CV:'',date:'2026-0'+(i%9+1)+'-01',link:'https://example.com'});
  });
  data.dimension.items.push({id:'f1',kind:'films',sub:'电影',title:'海上钢琴师',creator:'朱塞佩',rating:5,review:'一部关于选择的电影',thought:'钢琴与大海',cover:CV,date:'2026-07-01',link:''});
  data.dimension.items.push({id:'g1',kind:'games',sub:'单机',title:'空洞骑士',creator:'Team Cherry',rating:4.5,review:'手感极好',thought:'地图设计',cover:'',date:'2026-06-01',link:''});
  applyAll();
  return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);
await sleep(500);

console.log('════ ① 奶白玻璃 + 档案式页眉 ════');
line('纸面板存在', await evalJs(c, '!!document.querySelector(".dim-paper")'));
line('面板背景色', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-paper")).backgroundImage.slice(0,70)'));
line('面板圆角/描边', await evalJs(c, '(function(){var s=getComputedStyle(document.querySelector(".dim-paper"));return s.borderRadius+" | "+s.borderColor})()'));
line('档案编号小标', await evalJs(c, '(function(){var e=document.querySelector(".dim-kicker");return e?e.textContent.replace(/\\s+/g," ").trim():"无"})()'));
line('大标题', await evalJs(c, '(function(){var e=document.querySelector(".dim-h2");return e?e.textContent:"无"})()'));
line('英文副标', await evalJs(c, '(function(){var e=document.querySelector(".dim-en");return e?e.textContent:"无"})()'));
ok('页眉是档案式（编号 + 大写拉丁）', '', /01.*CATALOG/i.test(await evalJs(c, '(function(){var e=document.querySelector(".dim-kicker");return e?e.textContent:"无"})()')));

console.log('\n════ ② 立体书架 ════');
line('书脊数量', await evalJs(c, 'document.querySelectorAll(".spine-book").length'));
line('书脊宽度（未悬停）', await evalJs(c, '(function(){var e=document.querySelector(".spine-book");return Math.round(e.getBoundingClientRect().width)+"px"})()'));
line('书脊上的编号', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".sp-no")).map(function(e){return e.textContent}))'));
line('竖排是不是 writing-mode', await evalJs(c, 'getComputedStyle(document.querySelector(".sp-title")).writingMode'));
line('三本书的书名', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".sp-title")).slice(0,3).map(function(e){return e.textContent}))'));
line('书架有透视', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-shelf")).perspective'));
line('书的初始旋转', await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book")).transform.slice(0,42)'));
line('封面初始透明度', await evalJs(c, 'getComputedStyle(document.querySelector(".sp-cover")).opacity'));
line('书投阴影', await evalJs(c, '!!document.querySelector(".sp-shadow")'));

console.log('\n  --- 悬停第一本书（应该抽出来并翻成封面）---');
const g = JSON.parse(await evalJs(c, '(function(){document.querySelector(".dim-shelf").scrollIntoView({block:"center",behavior:"instant"});var r=document.querySelector(".spine-book").getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await sleep(600);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y, button: 'none' });
await sleep(200);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x + 1, y: g.y, button: 'none' });
await sleep(1200);
line('悬停后书宽', await evalJs(c, '(function(){var e=document.querySelector(".spine-book");return Math.round(e.getBoundingClientRect().width)+"px"})()'));
line('悬停后旋转', await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book")).transform.slice(0,42)'));
line('悬停后封面透明度', await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book .sp-cover")).opacity'));
line('悬停后书脊透明度', await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book .sp-spine")).opacity'));
ok('悬停会抽出（宽度变大）', '', (await evalJs(c, '(function(){var e=document.querySelector(".spine-book");return Math.round(e.getBoundingClientRect().width)})()')) > 60);
ok('悬停会显示封面', '', (await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book .sp-cover")).opacity')) === '1');

console.log('\n════ ③ 书架下方的档案条目 ════');
line('条目内容', await evalJs(c, '(function(){var e=document.getElementById("dim-feat");return e?e.innerText.replace(/\\s+/g," ").trim().slice(0,80):"无"})()'));
line('编号徽标', await evalJs(c, '(function(){var e=document.querySelector(".df-no");return e?e.textContent:"无"})()'));
line('标题', await evalJs(c, '(function(){var e=document.querySelector(".df-title");return e?e.textContent:"无"})()'));
line('元信息', await evalJs(c, '(function(){var e=document.querySelector(".df-meta");return e?e.textContent:"无"})()'));
line('箭头', await evalJs(c, '(function(){var e=document.querySelector(".df-arrow");return e?e.textContent:"无"})()'));

console.log('\n  --- 悬停第 3 本，条目应跟着变 ---');
const g3 = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".spine-book")[2].getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g3.x, y: g3.y, button: 'none' });
await sleep(200);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g3.x + 1, y: g3.y, button: 'none' });
await sleep(1000);
line('第 3 本的条目标题', await evalJs(c, '(function(){var e=document.querySelector(".df-title");return e?e.textContent:"无"})()'));
ok('条目跟随悬停更新', '', (await evalJs(c, '(function(){var e=document.querySelector(".df-title");return e?e.textContent:""})()')) === '三体');

// 截「书架」图
await sleep(600);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-shelf-new.png');
console.log('  截图: shots/dim-shelf-new.png');

console.log('\n════ ④ 详情弹窗 ════');
await evalJs(c, 'openDimDetail(0), 1');
await sleep(3000);
line('弹窗已开', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'));
line('弹窗底色', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-modal-box")).backgroundImage.slice(0,64)'));
line('档案编码', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-code");return e?e.textContent:"无"})()'));
line('标题', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-title");return e?e.textContent:"无"})()'));
line('分节小标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-m-lb")).map(function(e){return e.textContent}))'));
line('简介正文', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-text");return e?e.textContent.slice(0,44):"无"})()'));
line('评价条数', await evalJs(c, 'document.querySelectorAll(".dim-m-list li").length'));
line('小标题有发丝线', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-lb");var s=getComputedStyle(e,"::after");return s.width+"/"+s.height})()'));
await sleep(500);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-detail-new.png');
console.log('  截图: shots/dim-detail-new.png');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
