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
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?q=' + Date.now() });
await sleep(11000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.classList.add('hide');return 1})()");
await sleep(800);
await evalJs(c, "(function(){ if(typeof openMemPop==='function')openMemPop(); else { var b=document.getElementById('memBtn'); if(b)b.click(); } return 1; })()");
await sleep(3500);
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(4000);
console.log('splash 状态: ' + await evalJs(c, "(function(){var l=document.getElementById('launch');return l?(l.className+` pointer=`+getComputedStyle(l).pointerEvents+` opacity=`+getComputedStyle(l).opacity):`无`})()"));
const st = JSON.parse(await evalJs(c, `(function(){
  var b=document.querySelector('.shelf3d');var r=b.getBoundingClientRect();
  var cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
  return JSON.stringify({点:cx+','+cy, 栈:document.elementsFromPoint(cx,cy).slice(0,7).map(function(e){
    var s=getComputedStyle(e);return e.tagName+(e.id?'#'+e.id:'')+(e.className?'.'+String(e.className).split(' ')[0]:'')+' z='+s.zIndex+' pe='+s.pointerEvents;})});
})()`));
console.log(JSON.stringify(st, null, 1));
ws2.close(); await closeTab(t.id);
