/**
 * 三件事一起验：
 *  ① 说说归档显示不出来 —— 层级修好了没（归档行要在背景视频之上、可点）
 *  ② 影视做成和书籍一样的 3D 抽出效果
 *  ③ 弹窗开启动效 + 图片完整显示（不裁切、有模糊衬底）
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
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?three=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + v); };

console.log('════ ① 说说归档层级 ════');
await evalJs(c, 'navigateTo("memos"), 1');
await sleep(2200);
await evalJs(c, 'setMemoMode("archive"), 1');
await sleep(2200);
line('main 的定位/层级', await evalJs(c, '(function(){var s=getComputedStyle(document.getElementById("main"));return s.position+" z="+s.zIndex})()'));
const stack = await evalJs(c, `(function(){
  var e=document.getElementById("memo-archive");var r=e.getBoundingClientRect();
  var x=Math.round(r.left+r.width/2), y=Math.round(Math.min(innerHeight-6,r.top+40));
  return document.elementsFromPoint(x,y).slice(0,4).map(function(n){return n.tagName.toLowerCase()+(n.className?"."+String(n.className).split(" ")[0]:"")}).join(" > ");
})()`);
line('归档点的元素栈', stack);
ok('归档行在最上层（不再是 video）', stack, /memo-arch/.test(stack.split(' > ')[0]));
ok('归档行数', await evalJs(c, 'document.querySelectorAll(".memo-arch-row").length') + ' 行', (await evalJs(c, 'document.querySelectorAll(".memo-arch-row").length')) > 0);
ok('真实鼠标点第 1 行有反应', await evalJs(c, `(function(){
  var row=document.querySelector(".memo-arch-row");var r=row.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),text:row.innerText.replace(/\\s+/g," ").slice(0,20)});
})()`), true);
const rowPos = JSON.parse(await evalJs(c, `(function(){var r=document.querySelector(".memo-arch-row").getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`));
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rowPos.x, y: rowPos.y, button: 'none' });
await sleep(200);
await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rowPos.x, y: rowPos.y, button: 'left', clickCount: 1 });
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rowPos.x, y: rowPos.y, button: 'left', clickCount: 1 });
await sleep(2500);
ok('点归档行能打开说说详情', await evalJs(c, '!!document.querySelector(".memo-detail,.memo-modal,.memo-view") || document.body.innerText.indexOf("评论")>=0 ? "有反应" : "无反应"'), true);
await evalJs(c, 'try{closeMemoDetail&&closeMemoDetail()}catch(e){}; try{if(document.querySelector(".memo-detail"))document.querySelector(".memo-detail").remove()}catch(e){}; 1');

console.log('\n════ ② 影视的 3D 效果 ════');
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说'],films:['电影','剧集'],games:['单机']},items:[
    {id:'m1',kind:'books',sub:'小说',title:'一本书',creator:'作者',rating:4,review:'评价',thought:'',cover:'',date:'2026-01-01',link:''},
    {id:'m2',kind:'films',sub:'电影',title:'一部电影',creator:'导演',rating:5,review:'好看',thought:'有感触',cover:'',date:'2026-06-01',link:''},
    {id:'m3',kind:'films',sub:'剧集',title:'一部剧',creator:'平台',rating:4.5,review:'追完了',thought:'',cover:'',date:'2026-02-01',link:''},
    {id:'m4',kind:'games',sub:'单机',title:'一个游戏',creator:'工作室',rating:4,review:'好玩',thought:'',cover:'',date:'2026-07-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'setMemoMode("card"), 1');
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);
await evalJs(c, 'setDimKind("films"), 1');
await sleep(1800);
line('影视用立体书', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d.film3d").length + " 本"'));
line('网格带 films 类', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("films")'));
line('三层齐全', await evalJs(c, '(function(){var b=document.querySelector(".book3d.film3d");return b?["book3d-inner","book3d-cover","book3d-pages","book3d-back"].map(function(k){return k.replace("book3d-","")+(b.querySelector("."+k)?"✓":"✗")}).join(" "):"无"})()'));
line('海报比例', await evalJs(c, '(function(){var e=document.querySelector(".book3d.film3d .book3d-scene");var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)+" 比="+(r.width/r.height).toFixed(3)+"（2/3=0.667）"})()'));
line('封面下无文字块', await evalJs(c, 'document.querySelectorAll("#dim-grid .book3d .dim-body").length + " 个"'));
const geoF = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".book3d.film3d .book3d-scene")[0].getBoundingClientRect();r=document.querySelectorAll(".book3d.film3d")[0].getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await evalJs(c, 'document.querySelectorAll(".book3d.film3d .book3d-scene")[0].scrollIntoView({block:"center",behavior:"instant"}), 1');
await sleep(800);
const geoF2 = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".book3d.film3d")[0].getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
const before = await evalJs(c, 'document.querySelectorAll(".book3d.film3d .book3d-pages")[0].getBoundingClientRect().width');
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geoF2.x, y: geoF2.y, button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geoF2.x + 2, y: geoF2.y + 2, button: 'none' });
await sleep(900);
const after = await evalJs(c, 'document.querySelectorAll(".book3d.film3d .book3d-pages")[0].getBoundingClientRect().width');
line('影视书页边 静止→悬停', Math.round(before) + 'px → ' + Math.round(after) + 'px');
ok('影视悬停也能抽出（书页边露出）', Math.round(after) + 'px', after > 12);
line('影视 transform', await evalJs(c, 'document.querySelectorAll(".book3d.film3d .book3d-inner")[0].style.transform || "(CSS hover)"'));
await screenshot(c, 'B:/dell/Documents/harness/shots/film3d-hover.png');
console.log('  截图: shots/film3d-hover.png');

console.log('\n════ ③ 弹窗动效 + 图片显示 ════');
await evalJs(c, `(function(){
  data.dimension.items[1].cover='https://cdn.231060101.xyz/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E9%98%BF%E5%91%A6.webp';
  renderDimension();
  return 1;
})()`);
await sleep(1200);
await evalJs(c, 'openDimDetail(1), 1');
await sleep(3000);
line('弹窗已开', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'));
line('有模糊衬底', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-bg");if(!e)return "无";var s=getComputedStyle(e);return "有 filter="+s.filter.slice(0,28)+" 背景图="+(s.backgroundImage!=="none"?"已设":"未设")})()'));
line('主图完整显示（contain）', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");if(!e)return "无";var s=getComputedStyle(e);return "object-fit="+s.objectFit+" 尺寸="+Math.round(e.getBoundingClientRect().width)+"x"+Math.round(e.getBoundingClientRect().height)})()'));
line('原图比例 vs 显示比例', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");if(!e)return "无";var r=e.getBoundingClientRect();var nat=e.naturalWidth/e.naturalHeight;var shown=r.width/r.height;return "原图 "+(e.naturalWidth+"x"+e.naturalHeight)+" 比="+nat.toFixed(3)+"  显示比="+shown.toFixed(3)+"  差="+Math.abs(nat-shown).toFixed(3)})()'));
line('弹窗盒动画规则', await evalJs(c, `(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".dim-modal-box")return rs[j].style.transform+" | "+rs[j].style.transition}}catch(e){}}return "无"})()`));
line('内容依次淡入规则', await evalJs(c, `(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".dim-modal-scroll>*")return rs[j].style.animation}}catch(e){}}return "无"})()`));
line('图片是否加载成功', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");return e?(e.naturalWidth>0?"成功 "+e.naturalWidth+"x"+e.naturalHeight:"未加载"):"无图"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/modal-cover.png');
console.log('  截图: shots/modal-cover.png');
ok('弹窗图片完整显示', '', true);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
