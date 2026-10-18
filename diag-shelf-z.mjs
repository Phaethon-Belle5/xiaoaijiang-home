// 查：是什么 canvas 盖在书上？真实用户能点到书吗？
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?z=' + Date.now() });
await sleep(11000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 160));

await evalJs(c, `(function(){ if(typeof openMemPop==='function')openMemPop(); else { var b=document.getElementById('memBtn'); if(b)b.click(); } return 1; })()`);
await sleep(3500);
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(4000);

console.log('=== 页面上所有 canvas ===');
const canvases = JSON.parse(await evalJs(c, `(function(){
  return JSON.stringify([].slice.call(document.querySelectorAll('canvas')).map(function(cv){
    var r=cv.getBoundingClientRect();var st=getComputedStyle(cv);
    return {id:cv.id,cls:String(cv.className),z:st.zIndex,pos:st.position,pointer:st.pointerEvents,
      rect:Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height),
      parent:cv.parentElement?(cv.parentElement.id||cv.parentElement.className||cv.parentElement.tagName):''};
  }));
})()`));
canvases.forEach(cv => console.log('  ' + JSON.stringify(cv)));

console.log('\n=== 书所在位置的层叠（从最上层往下翻）===');
const stack = JSON.parse(await evalJs(c, `(function(){
  var b=document.querySelector('.shelf3d');
  var r=b.getBoundingClientRect();
  var cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
  var out=[]; var els=document.elementsFromPoint(cx,cy);
  els.slice(0,8).forEach(function(e){
    var st=getComputedStyle(e);
    out.push(e.tagName+(e.id?'#'+e.id:'')+(e.className?'.'+String(e.className).split(' ')[0]:'')+' z='+st.zIndex+' pos='+st.position);
  });
  return JSON.stringify(out);
})()`));
stack.forEach((s, i) => console.log('  ' + (i + 1) + '. ' + s));

console.log('\n=== 记忆面板本体 ===');
const pop = JSON.parse(await evalJs(c, `(function(){
  var p=document.getElementById('memPop');
  if(!p)return JSON.stringify({err:'没有 memPop'});
  var st=getComputedStyle(p);var r=p.getBoundingClientRect();
  return JSON.stringify({z:st.zIndex,pos:st.position,rect:Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height),
    显示:st.display,main的z:getComputedStyle(document.querySelector('main')||document.body).zIndex});
})()`));
console.log('  ' + JSON.stringify(pop));

console.log('\n=== 用真实鼠标点书（走完整命中测试）===');
const pt = JSON.parse(await evalJs(c, `(function(){var b=document.querySelector('.shelf3d');var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`));
line('点击点', pt.x + ',' + pt.y);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y, button: 'none' });
await sleep(900);
line('  悬停后 --lift', await evalJs(c, `(function(){var b=document.querySelector('.shelf3d');return getComputedStyle(b).getPropertyValue('--lift')})()`));
await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await sleep(1600);
line('  阅读层是否打开', await evalJs(c, 'document.getElementById("bookLayer") && document.getElementById("bookLayer").classList.contains("show")'));
line('  opening 类', await evalJs(c, 'document.querySelectorAll(".shelf3d.opening").length'));

ws2.close();
await closeTab(t.id);
