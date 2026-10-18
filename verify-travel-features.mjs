/**
 * 验证三件事：
 *  ① 记忆书架：真 3D 书（6 面齐备）+ 悬停浮起 + 点击抽出并翻封面
 *  ② 旅途影像：照片环渲染、可拖动、点开大图
 *  ③ 旅行年轮：SVG 年轮、每年一圈、每段一月、悬停提示
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 130)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?v=' + Date.now() });
await sleep(11000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 120)); };

// 无头标签页是后台标签，启动页的 rAF 动画不推进 → 它不会自己 remove()，会挡住所有点击。
// 真实浏览器里它会淡出并被移除，这里直接摘掉（等价于等它自然结束）。
await evalJs(c, `(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()`);
await sleep(700);

// 打开记忆面板
await evalJs(c, `(function(){ if(typeof openMemPop==='function')openMemPop(); else { var b=document.getElementById('memBtn'); if(b)b.click(); } return 1; })()`);
await sleep(4000);
line('记忆面板已打开', await evalJs(c, 'document.getElementById("memPop") ? document.getElementById("memPop").classList.contains("show") : "无面板"'));
line('tab 数', await evalJs(c, 'document.querySelectorAll(".mp-tab[data-mem]").length'));
line('tab 列表', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".mp-tab[data-mem]")).map(function(b){return b.textContent.trim()}))'));

console.log('\n════ ① 记忆书架：3D 书结构 ════');
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(3500);
const book = JSON.parse(await evalJs(c, `(function(){
  var b=document.querySelector('.shelf3d');
  if(!b)return JSON.stringify({err:'没有书'});
  var inner=b.querySelector('.shelf3d-inner');
  return JSON.stringify({
    书数:document.querySelectorAll('.shelf3d').length,
    封面:!!b.querySelector('.shelf3d-cover'),
    封内:!!b.querySelector('.shelf3d-inside'),
    书脊:!!b.querySelector('.shelf3d-spine'),
    书口:!!b.querySelector('.shelf3d-pages'),
    封底:!!b.querySelector('.shelf3d-back'),
    书脊文字:b.querySelector('.shelf3d-spine b')?b.querySelector('.shelf3d-spine b').textContent:'',
    inner透视:inner?getComputedStyle(inner).transformStyle:'',
    封面变换:b.querySelector('.shelf3d-cover')?getComputedStyle(b.querySelector('.shelf3d-cover')).transform.slice(0,60):''
  });
})()`));
console.log('  ' + JSON.stringify(book));
ok('书是 6 面结构（封面/封内/书脊/书口/封底）', '', !!(book.封面 && book.封内 && book.书脊 && book.书口 && book.封底));
ok('书脊上有竖排省份名', book.书脊文字, !!book.书脊文字);
ok('inner 是 preserve-3d', book.inner透视, book.inner透视 === 'preserve-3d');

console.log('\n  --- 悬停：书应该朝观者浮起 ---');
const before = await evalJs(c, '(function(){var i=document.querySelector(".shelf3d-inner");return getComputedStyle(i).transform})()');
const box = JSON.parse(await evalJs(c, '(function(){var b=document.querySelector(".shelf3d");var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' });
await sleep(1200);
const after = await evalJs(c, '(function(){var i=document.querySelector(".shelf3d-inner");return getComputedStyle(i).transform})()');
line('悬停前 transform', before);
line('悬停后 transform', after);
ok('悬停时书浮起来了（有 Z 位移）', '', before !== after);
const z = (m) => {
  const s = String(m);
  const m4 = s.match(/matrix3d\(([^)]+)\)/);
  if (m4) { const p = m4[1].split(',').map(Number); return p.length >= 15 ? p[14] : null; }
  const m2 = s.match(/matrix\(([^)]+)\)/);          // 2D 矩阵：Z 恒为 0
  if (m2) return 0;
  return null;
};
line('  悬停前 Z', z(before)); line('  悬停后 Z', z(after));
ok('Z 值确实增大（朝镜头推近）', String(z(after)), z(before) !== null && z(after) !== null && z(after) > z(before));

console.log('\n  --- 点击：抽出 + 封面翻开 → 阅读层出现 ---');
await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await sleep(260);
line('刚点下是否加了 opening 类', await evalJs(c, 'document.querySelectorAll(".shelf3d.opening").length + " 个"'));
line('  封面正在播动画', await evalJs(c, '(function(){var v=document.querySelector(".shelf3d-cover");if(!v)return "无";var a=getComputedStyle(v);return a.animationName+" "+a.animationDuration})()'));
await sleep(1400);
line('阅读层是否出现', await evalJs(c, 'document.getElementById("bookLayer").classList.contains("show")'));
line('  阅读层里页数', await evalJs(c, 'document.getElementById("bkBook").children.length'));
ok('点书能抽出并打开阅读层', '', await evalJs(c, 'document.getElementById("bookLayer").classList.contains("show")') === true);
await screenshot(c, 'B:/dell/Documents/harness/shots/book-pull-out.png');
console.log('  截图: shots/book-pull-out.png');
await evalJs(c, 'closeBook(), 1');
await sleep(1200);

console.log('\n════ ② 旅途影像 ════');
await evalJs(c, 'setMemTab("images"), 1');
await sleep(3500);
const ti = JSON.parse(await evalJs(c, `(function(){
  var ring=document.getElementById('tiRing'), stage=document.getElementById('tiStage');
  return JSON.stringify({
    有舞台:!!stage, 有环:!!ring,
    卡片数:document.querySelectorAll('#tiRing .ti-card').length,
    环变换:ring?(ring.style.transform||'').slice(0,60):'',
    环透视:ring?getComputedStyle(ring).transformStyle:'',
    舞台透视:stage?getComputedStyle(stage).perspective:'',
    第一张:document.querySelector('#tiRing .ti-card img')?document.querySelector('#tiRing .ti-card img').getAttribute('src').slice(-40):''
  });
})()`));
console.log('  ' + JSON.stringify(ti));
ok('照片环渲染出卡片', ti.卡片数 + ' 张', ti.卡片数 > 0);
ok('环是 preserve-3d', ti.环透视, ti.环透视 === 'preserve-3d');
ok('舞台有透视', ti.舞台透视, !!ti.舞台透视 && ti.舞台透视 !== 'none');

console.log('\n  --- 点一张看大图 ---');
// 注意：上面的拖动会让"拖动距离"保持在阈值以上，所以这里必须走真实按下-抬起（moved 会被重置），
// 直接 dispatch 一个 click 会被正确判定为"拖动结束"而不触发。
const cardPt = JSON.parse(await evalJs(c, `(function(){
  var d=document.querySelector('#tiRing .ti-card');if(!d)return JSON.stringify({err:'无卡片'});
  var r=d.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});
})()`));
line('卡片中心点', cardPt.x + ',' + cardPt.y);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cardPt.x, y: cardPt.y, button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cardPt.x, y: cardPt.y, button: 'left', clickCount: 1 });
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cardPt.x, y: cardPt.y, button: 'left', clickCount: 1 });
await sleep(1400);
line('灯箱是否显示', await evalJs(c, 'document.getElementById("memBig") ? document.getElementById("memBig").classList.contains("show") : "无灯箱"'));
line('  大图 src', await evalJs(c, '(function(){var b=document.getElementById("memBig");return b?b.querySelector("img").getAttribute("src").slice(-40):""})()'));
ok('点照片能看大图', '', await evalJs(c, '!!(document.getElementById("memBig") && document.getElementById("memBig").classList.contains("show"))') === true);
await evalJs(c, '(function(){var b=document.getElementById("memBig");if(b)b.classList.remove("show");return 1})()');
await sleep(400);
console.log('\n  --- 拖动 ---');
const r0 = await evalJs(c, 'document.getElementById("tiRing").style.transform');
const st = JSON.parse(await evalJs(c, '(function(){var s=document.getElementById("tiStage");var r=s.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: st.x, y: st.y, button: 'left', clickCount: 1 });
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: st.x + 180, y: st.y, button: 'left' });
await sleep(400);
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: st.x + 180, y: st.y, button: 'left', clickCount: 1 });
await sleep(500);
const r1 = await evalJs(c, 'document.getElementById("tiRing").style.transform');
line('拖动前 rot', String(r0).slice(0, 60));
line('拖动后 rot', String(r1).slice(0, 60));
ok('拖动能让环转动', '', r0 !== r1);
await screenshot(c, 'B:/dell/Documents/harness/shots/travel-images.png');
console.log('  截图: shots/travel-images.png');



console.log('\n════ ③ 旅行年轮 ════');
await evalJs(c, 'setMemTab("rings"), 1');
await sleep(3500);
const rings = JSON.parse(await evalJs(c, `(function(){
  var s=document.querySelector('.ring-svg');
  return JSON.stringify({
    有SVG:!!s,
    底圈数:document.querySelectorAll('.ring-base').length,
    弧段数:document.querySelectorAll('.ring-arc').length,
    年份标签:document.querySelectorAll('.ring-year').length,
    年份:document.querySelectorAll('.ring-year').length?[].slice.call(document.querySelectorAll('.ring-year')).map(function(e){return e.textContent}):[],
    第一条提示:(document.querySelector('.ring-arc')||{}).dataset?(document.querySelector('.ring-arc').dataset.tip||''):'' ,
    viewBox:s?s.getAttribute('viewBox'):''
  });
})()`));
console.log('  ' + JSON.stringify(rings));
ok('年轮 SVG 渲染出来了', rings.viewBox, !!rings.有SVG);
ok('每年一圈', rings.底圈数 + ' 圈 / ' + rings.年份.length + ' 个年份', rings.底圈数 > 0 && rings.底圈数 === rings.年份.length);
ok('每段是一个月（弧段有提示）', rings.弧段数 + ' 段', rings.弧段数 > 0 && !!rings.第一条提示);
line('第一条提示文字', rings.第一条提示);

console.log('\n  --- 悬停弧段出提示 ---');
await evalJs(c, `(function(){
  var a=document.querySelector('.ring-arc');
  if(!a)return 1;
  var r=a.getBoundingClientRect();
  a.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
  return 1;
})()`);
await sleep(800);
line('提示框是否可见', await evalJs(c, '(function(){var t=document.getElementById("ringTip");return t?(t.hidden?"隐藏":"显示："+t.textContent):"无"})()'));
ok('悬停能显示年月提示', '', await evalJs(c, '(function(){var t=document.getElementById("ringTip");return !!(t&&!t.hidden)})()') === true);
await screenshot(c, 'B:/dell/Documents/harness/shots/travel-rings.png');
console.log('  截图: shots/travel-rings.png');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
