// 诊断：书架上那本书的实际位置，以及鼠标落点命中了什么
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?d=' + Date.now() });
await sleep(11000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 150));

await evalJs(c, `(function(){ if(typeof openMemPop==='function')openMemPop(); else { var b=document.getElementById('memBtn'); if(b)b.click(); } return 1; })()`);
await sleep(3500);
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(4000);

const info = JSON.parse(await evalJs(c, `(function(){
  var b=document.querySelector('.shelf3d');
  if(!b)return JSON.stringify({err:'没有书'});
  var r=b.getBoundingClientRect();
  var cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
  var el=document.elementFromPoint(cx,cy);
  var pop=document.getElementById('memPop');
  return JSON.stringify({
    视口:innerWidth+'x'+innerHeight,
    书rect:{left:Math.round(r.left),top:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)},
    中心点:cx+','+cy,
    命中:el?(el.tagName+'.'+String(el.className).split(' ').slice(0,2).join('.')):'null',
    命中是这本书:!!(el&&b.contains(el)),
    pop显示:pop?pop.classList.contains('show'):false,
    popzIndex:pop?getComputedStyle(pop).zIndex:'',
    书zIndex:getComputedStyle(b).zIndex,
    书可见:getComputedStyle(b).display+' / '+getComputedStyle(b).visibility,
    inner变换:getComputedStyle(b.querySelector('.shelf3d-inner')).transform,
    lift变量:getComputedStyle(b).getPropertyValue('--lift')+' / '+getComputedStyle(b).getPropertyValue('--liftz')
  });
})()`));
console.log('  ' + JSON.stringify(info, null, 0));

console.log('\n=== 直接派发事件测试（不依赖坐标）===');
line('mouseover 派发', await evalJs(c, `(function(){
  var b=document.querySelector('.shelf3d');
  b.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));
  b.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:100,clientY:100}));
  return 1;
})()`));
await sleep(800);
line('  派发后 --lift', await evalJs(c, `(function(){var b=document.querySelector('.shelf3d');return getComputedStyle(b).getPropertyValue('--lift')+' / '+getComputedStyle(b).getPropertyValue('--liftz')})()`));
line('  派发后 inner transform', await evalJs(c, `getComputedStyle(document.querySelector('.shelf3d-inner')).transform`));
line('  是否加了 following', await evalJs(c, 'document.querySelectorAll(".shelf3d.following").length'));

console.log('\n=== 试强制 hover（用 CDP 的 CSS 伪类）===');
try {
  const { root } = await c.send('DOM.getDocument', {});
  const { nodeId } = await c.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.shelf3d' });
  await c.send('CSS.enable');
  await c.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
  await sleep(1200);
  line('  强制 hover 后 --lift', await evalJs(c, `(function(){var b=document.querySelector('.shelf3d');return getComputedStyle(b).getPropertyValue('--lift')+' / '+getComputedStyle(b).getPropertyValue('--liftz')})()`));
  line('  强制 hover 后 inner', await evalJs(c, `getComputedStyle(document.querySelector('.shelf3d-inner')).transform`));
} catch (e) { console.log('  强制 hover 失败: ' + e.message); }

console.log('\n=== 直接调 openBook 看动画 ===');
await evalJs(c, `(function(){
  var b=document.querySelector('.shelf3d');
  var prov=b.querySelector('.shelf3d-spine b').textContent;
  openBook(prov,b);
  return 1;
})()`);
await sleep(300);
line('opening 类', await evalJs(c, 'document.querySelectorAll(".shelf3d.opening").length'));
line('封面 animation', await evalJs(c, `(function(){var v=document.querySelector('.shelf3d-cover');return v?getComputedStyle(v).animationName:''})()`));
await sleep(1500);
line('阅读层 show', await evalJs(c, 'document.getElementById("bookLayer").classList.contains("show")'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
