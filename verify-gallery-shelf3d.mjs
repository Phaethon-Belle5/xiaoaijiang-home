/**
 * 验证映像馆「记忆书架」改成 3D 立体书：
 *  · 结构：.shelf3d > .shelf3d-scene > .shelf3d-inner > (cover / pages / back)
 *  · 静止：书页边 edge-on（几乎看不见）
 *  · 悬停：书左旋抽出、书页边露出厚度、只有被指的那本动
 *  · 移出复原
 *  · 点书仍然能翻开（原来的翻页书功能没坏）
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
await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?shelf=' + Date.now() });
await sleep(22000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);

// 打开「记忆书架」
await evalJs(c, `(function(){
  var b=[].slice.call(document.querySelectorAll('.mp-tab,.ml-btn')).find(function(x){return x.dataset.mem==='shelf'});
  if(!b)return 'no-btn';
  b.click(); return 'clicked';
})()`);
await sleep(3500);
line('书架是否出现', await evalJs(c, 'document.querySelectorAll(".shelf3d").length + " 本书"'));
if (!(await evalJs(c, 'document.querySelectorAll(".shelf3d").length'))) {
  console.log('  书架没打开，尝试直接调 openMemPop/setMemTab');
  console.log('  ' + await evalJs(c, '(function(){try{if(typeof openMemPop==="function")openMemPop("shelf");else if(typeof setMemTab==="function")setMemTab("shelf");return "已调用"}catch(e){return e.message}})()'));
  await sleep(3000);
  line('重试后书数', await evalJs(c, 'document.querySelectorAll(".shelf3d").length'));
}

await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);
// 无头浏览器的后台标签里 rAF 不跑，开屏地球的遮罩不会自动收起，会挡住真实鼠标。
// 真实用户前台打开时它是正常消失的（否则地图也点不了）。这里把它移掉，好让真实鼠标能落到书上。
await evalJs(c, `(function(){var l=document.getElementById('launch');if(l)l.remove();var g=document.getElementById('launchGl');if(g)g.remove();return 1})()`);
await sleep(300);
await evalJs(c, '(function(){var e=document.querySelector(".shelf-wrap");if(e)e.scrollIntoView({block:"center",behavior:"instant"});return 1})()');
await sleep(1000);
line('遮罩已移除', await evalJs(c, '!document.getElementById("launch")'));
line('书中心点命中书', await evalJs(c, '(function(){var b=document.querySelector(".shelf3d");var r=b.getBoundingClientRect();var e=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));return e&&e.closest(".shelf3d")?"✅ 命中":"❌ 命中 "+(e?e.tagName:"null")})()'));

console.log('\n════ 1. 结构 ════');
line('三层齐全', await evalJs(c, '(function(){var b=document.querySelector(".shelf3d");if(!b)return "无书";return ["shelf3d-scene","shelf3d-inner","shelf3d-cover","shelf3d-pages","shelf3d-back"].map(function(k){return k.replace("shelf3d-","")+(b.querySelector("."+k)?"✓":"✗")}).join(" ")})()'));
line('封面里还有省份名', await evalJs(c, '(function(){var e=document.querySelector(".shelf3d-cover .sb-prov");return e?e.textContent:"无"})()'));
line('封面里还有封面图/徽标', await evalJs(c, '(function(){var b=document.querySelector(".shelf3d-cover");return "img="+(b.querySelector(".sb-bottom img")?"有":"无")+" 徽标="+(b.querySelector(".sb-badge")?b.querySelector(".sb-badge").textContent:"无")})()'));

const snap = async () => JSON.parse(await evalJs(c, `(function(){
  var out=[];
  document.querySelectorAll(".shelf3d").forEach(function(b,i){
    var card=b.getBoundingClientRect();
    var scene=b.querySelector(".shelf3d-scene").getBoundingClientRect();
    var cover=b.querySelector(".shelf3d-cover").getBoundingClientRect();
    var pages=b.querySelector(".shelf3d-pages").getBoundingClientRect();
    var back=b.querySelector(".shelf3d-back").getBoundingClientRect();
    out.push({i:i,card:[Math.round(card.width),Math.round(card.height)],scene:[Math.round(scene.width),Math.round(scene.height)],
      cover:[Math.round(cover.width),Math.round(cover.height),Math.round(cover.left),Math.round(cover.top)],
      pages:[Math.round(pages.width),Math.round(pages.left)],back:[Math.round(back.width)]});
  });
  return JSON.stringify(out.slice(0,4));
})()`));

console.log('\n════ 2. 静止 ════');
const rest = await snap();
rest.forEach(b => console.log('  第' + (b.i + 1) + '本 卡片' + b.card.join('x') + ' 场景' + b.scene.join('x') +
  ' 封面' + b.cover[0] + 'x' + b.cover[1] + ' 书页边宽' + b.pages[0] + 'px 封底w' + b.back[0]));

console.log('\n════ 3. 悬停第 1 本（真实鼠标）════');
const geo = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".shelf3d-scene")[0].getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
console.log('  书区域: ' + geo.l + ',' + geo.t + ' ' + geo.w + 'x' + geo.h);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.4), y: geo.t + Math.round(geo.h * 0.4), button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.42), y: geo.t + Math.round(geo.h * 0.4), button: 'none' });
await sleep(900);
const hov = await snap();
hov.forEach(b => console.log('  第' + (b.i + 1) + '本 封面' + b.cover[0] + 'x' + b.cover[1] + ' @左' + b.cover[2] +
  ' 书页边宽' + b.pages[0] + 'px @左' + b.pages[1] + ' 封底w' + b.back[0]));
line('内层 transform', await evalJs(c, 'document.querySelectorAll(".shelf3d-inner")[0].style.transform || "(CSS hover)"'));
line('following 类', await evalJs(c, 'document.querySelectorAll(".shelf3d")[0].classList.contains("following")'));

console.log('\n════ 4. 判定 ════');
const ok = (n, v) => console.log('  ' + (v ? '✅' : '❌') + ' ' + n);
const h1 = hov[0], r1 = rest[0], r2 = rest[1];
ok('静止时书页边 edge-on（几乎看不见）', r1.pages[0] <= 4 && r2.pages[0] <= 4);
ok('悬停后书页边露出厚度', h1.pages[0] > 12);
ok('悬停后封面旋转（宽高变化）', h1.cover[0] !== r1.cover[0] || h1.cover[1] !== r1.cover[1]);
ok('悬停后封面左移（抽出来）', h1.cover[2] < r1.cover[2]);
ok('封底跟着旋转', h1.back[0] !== r1.back[0]);
ok('只有被指那本动（第 2 本不变）', hov[1].cover[2] === rest[1].cover[2] && hov[1].cover[0] === rest[1].cover[0]);
ok('卡片高度 == 场景高度', r1.card[1] === r1.scene[1]);

console.log('\n════ 5. 移出复原 ════');
await evalJs(c, 'document.getElementById("memPanel").dispatchEvent(new MouseEvent("mouseleave")), 1');
await sleep(500);
line('内层 transform', await evalJs(c, 'document.querySelectorAll(".shelf3d-inner")[0].style.transform || "（已清空）"'));
line('following 类', await evalJs(c, 'document.querySelectorAll(".shelf3d")[0].classList.contains("following")'));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-shelf-hover.png');
console.log('  截图: shots/gallery-shelf-hover.png');

console.log('\n════ 6. 点书仍能翻开（原功能）════');
await evalJs(c, '(function(){var b=document.querySelector(".shelf3d");b.click();return 1})()');
await sleep(3500);
line('翻页层出现', await evalJs(c, 'document.getElementById("bookLayer") && document.getElementById("bookLayer").classList.contains("show")'));
line('书里有页', await evalJs(c, 'document.querySelectorAll(".book-page,.bp-inner,.bk-book .page").length'));
line('标题', await evalJs(c, '(function(){var e=document.getElementById("bkTitle");return e?e.textContent:"无"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-book-open.png');
console.log('  截图: shots/gallery-book-open.png');
await evalJs(c, 'try{closeBook()}catch(e){}; 1');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
