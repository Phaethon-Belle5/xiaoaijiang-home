/**
 * 针对照参考源码校准后的三处细节做验证：
 *  ① 书脊底部有小圆点（参考 Icon(cupertino.circle, size:6)）
 *  ② 页码是 ArchiveCode 的 "NN / MM" 格式，并随悬停更新
 *  ③ 点书架靠右的书时，书会被滑到中间（参考 _tap 的居中手感）
 *  ④ 配色对齐源码：书脊面 #F2F0E9、渐变起点 #E3DFD3、次要文字 #8A806B
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

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
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?cal=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(26) + ' = ' + String(v).slice(0, 110)); };

await evalJs(c, `(function(){
  const T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年','人类简史','百年孤独','房思琪','茶花女','悲惨世界'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4,
      review:'简介',thought:'评价',cover:'',date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);

console.log('════ ① 书脊底部圆点 ════');
line('圆点数量', await evalJs(c, 'document.querySelectorAll(".sp-dot").length'));
line('圆点尺寸', await evalJs(c, '(function(){var d=document.querySelector(".sp-dot");if(!d)return "无";var s=getComputedStyle(d);return s.width+"x"+s.height+" 圆角"+s.borderRadius})()'));
ok('每本书脊都有圆点', await evalJs(c, 'document.querySelectorAll(".sp-dot").length') + ' 个 / ' + await evalJs(c, 'document.querySelectorAll(".spine-book").length') + ' 本',
   (await evalJs(c, 'document.querySelectorAll(".sp-dot").length')) === (await evalJs(c, 'document.querySelectorAll(".spine-book").length')));

console.log('\n════ ② 页码 NN / MM ════');
line('初始页码', await evalJs(c, '(function(){var e=document.getElementById("dim-count");return e?e.textContent:"无"})()'));
// 悬停第 6 本，页码应变
const g = JSON.parse(await evalJs(c, '(function(){document.getElementById("dim-grid").scrollIntoView({block:"center",behavior:"instant"});var b=document.querySelectorAll(".spine-book")[5];var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),t:b.querySelector(".sp-title").textContent})})()'));
await sleep(500);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y, button: 'none' });
await sleep(120);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x + 2, y: g.y, button: 'none' });
await sleep(900);
const pager = await evalJs(c, '(function(){var e=document.getElementById("dim-count");return e?e.textContent:"无"})()');
line('悬停「' + g.t + '」后页码', pager);
ok('页码是 "NN / MM" 格式', pager, /^\d{2} \/ \d{2}$/.test(String(pager)));
ok('页码随悬停更新到第 06 本', pager, String(pager).indexOf('06') === 0);

console.log('\n════ ③ 点靠右的书 → 书架滑到它 ════');
await evalJs(c, '(function(){document.getElementById("dim-grid").scrollLeft=0;return 1})()');
await sleep(600);
const beforeLeft = await evalJs(c, 'Math.round(document.getElementById("dim-grid").scrollLeft)');
const target = JSON.parse(await evalJs(c, `(function(){
  var s=document.getElementById('dim-grid');
  var b=document.querySelectorAll('.spine-book')[8];
  var pad=parseFloat(getComputedStyle(s).paddingLeft)||0;
  var exp=Math.max(0,Math.min(s.scrollWidth-s.clientWidth, b.offsetLeft-pad));
  b.click();
  return JSON.stringify({title:b.querySelector('.sp-title').textContent, 期望left:Math.round(exp)});
})()`));
await sleep(1400);
const afterLeft = await evalJs(c, 'Math.round(document.getElementById("dim-grid").scrollLeft)');
line('点击前 scrollLeft', beforeLeft);
line('点击「' + target.title + '」后', afterLeft + '  期望 ' + target.期望left);
ok('书架滑到了这本书（偏差 < 6px）', Math.abs(afterLeft - target.期望left) + 'px', Math.abs(afterLeft - target.期望left) < 6);
await evalJs(c, 'closeDimDetail(), 1');
await sleep(700);

console.log('\n════ ④ 配色对齐源码 ════');
line('书脊背景（含 #F2F0E9 / #E3DFD3）', await evalJs(c, '(function(){var s=getComputedStyle(document.querySelector(".sp-spine")).backgroundImage;return (/242, 240, 233/.test(s)||/227, 223, 211/.test(s))?"命中源码色":"未命中: "+s.slice(0,60)})()'));
line('次要文字色', await evalJs(c, 'getComputedStyle(document.documentElement).getPropertyValue("--dp-ink2") || (function(){var e=document.querySelector(".dim-kicker");return e?getComputedStyle(e).color:"无"})()'));
line('面板上的 --dp-ink2', await evalJs(c, '(function(){var p=document.querySelector(".dim-paper");return getComputedStyle(p).getPropertyValue("--dp-ink2").trim()||"未定义（看实际颜色）"})()'));
ok('书脊面/渐变用了源码里的暖灰纸色', await evalJs(c, '(function(){var s=getComputedStyle(document.querySelector(".sp-spine")).backgroundImage;return String(/242, 240, 233/.test(s)||/227, 223, 211/.test(s))})()'), 'true' === await evalJs(c, '(function(){var s=getComputedStyle(document.querySelector(".sp-spine")).backgroundImage;return String(/242, 240, 233/.test(s)||/227, 223, 211/.test(s))})()'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
