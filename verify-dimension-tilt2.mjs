/**
 * 补验两项：
 *  A) 用真实鼠标（CDP Input）移动，证明倾斜是真实输入触发的，不是只有派发事件才动
 *  B) 鼠标移出卡片/移出网格后，transform、封面视差、高光都复原
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?tilt2=' + Date.now() });
await sleep(19000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);

await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说'],films:[],games:[]},items:[
    {id:'z1',kind:'books',sub:'小说',title:'倾斜测试书',creator:'作者',rating:4,review:'评价',thought:'感悟',cover:'',date:'2026-05-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
// 关掉平滑滚动，避免 scrollIntoView 的动画让坐标漂移
await evalJs(c, `(function(){var e=document.documentElement;e.style.scrollBehavior='auto';document.body.style.scrollBehavior='auto';return 1})()`);
await evalJs(c, '(function(){var el=document.querySelector("#dim-grid .dim-card.tilt");el.scrollIntoView({block:"center",behavior:"instant"});return 1})()');
await sleep(1200);

const geo = JSON.parse(await evalJs(c, '(function(){var r=document.querySelector("#dim-grid .dim-card.tilt").getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
console.log('════ A. 真实鼠标（CDP Input.dispatchMouseEvent）════');
console.log('  卡片: ' + geo.l + ',' + geo.t + ' ' + geo.w + 'x' + geo.h);
const readT = async () => await evalJs(c, `(function(){var el=document.querySelector("#dim-grid .dim-card.tilt");var t=el.style.transform||"(空)";var m=t.match(/rotateX\\(([-\\d.]+)deg\\) rotateY\\(([-\\d.]+)deg\\)/);return m?(m[1]+" / "+m[2]):"(空)"})()`);

// 先把鼠标挪到网格外面，避免"第一次移动算进入"的问题
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + 5, y: geo.t - 60, button: 'none' });
await sleep(300);
line('移入前', await readT());
// 真实移动到卡片右下角附近
for (const [fx, fy, lb] of [[0.78, 0.75, '右下 0.78/0.75'], [0.22, 0.25, '左上 0.22/0.25']]) {
  const x = geo.l + Math.round(geo.w * fx), y = geo.t + Math.round(geo.h * fy);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none' });
  await sleep(120);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 1, y: y + 1, button: 'none' });
  await sleep(500);
  line('真实鼠标 ' + lb, await readT());
}

console.log('\n════ B. 移出后复原 ════');
line('移出前 卡片', await readT());
line('移出前 封面', await evalJs(c, '(function(){var i=document.querySelector("#dim-grid .dim-card.tilt .dim-poster");return (i&&i.style.transform)||"(空)"})()'));
line('移出前 高光', await evalJs(c, 'document.querySelector("#dim-grid .dim-card.tilt .dim-sheen").style.opacity'));

// 真实鼠标移到网格外面
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, button: 'none' });
await sleep(400);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 6, y: 6, button: 'none' });
await sleep(700);
line('真实移出 卡片', await readT());
line('真实移出 封面', await evalJs(c, '(function(){var i=document.querySelector("#dim-grid .dim-card.tilt .dim-poster");return (i&&i.style.transform)||"（已清空）"})()'));
line('真实移出 高光', await evalJs(c, 'document.querySelector("#dim-grid .dim-card.tilt .dim-sheen").style.opacity'));

// 再补一次：在网格内但不在卡片上移动（走 mouseleave 之外的复位分支）
await evalJs(c, `(function(){
  var el=document.querySelector("#dim-grid .dim-card.tilt");
  el.dispatchEvent(new MouseEvent('mousemove',{clientX:0,clientY:0,bubbles:true}));
  var g=document.getElementById("dim-grid");
  var r=g.getBoundingClientRect();
  g.dispatchEvent(new MouseEvent('mousemove',{clientX:r.right-2,clientY:r.bottom-2,bubbles:true}));
  return 1;
})()`);
await sleep(600);
line('网格内空白处移动后', await readT());
line('高光', await evalJs(c, 'document.querySelector("#dim-grid .dim-card.tilt .dim-sheen").style.opacity'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
