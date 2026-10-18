import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?dbg=' + Date.now() });
await sleep(11000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()");
await sleep(600);
await evalJs(c, "(function(){ if(typeof openMemPop==='function')openMemPop(); return 1; })()");
await sleep(3000);
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(4000);
const info = JSON.parse(await evalJs(c, `(function(){
  var rail=document.querySelector('.shelf-rail'), wrap=document.getElementById('shelfWrap');
  var books=document.querySelectorAll('.shelf3d');
  var out={ 有rail:!!rail, 有wrap:!!wrap, 书数:books.length };
  if(wrap){
    out.wrap子元素=[].slice.call(wrap.children).map(function(e){return e.tagName+'.'+String(e.className).split(' ')[0]});
    out.wrap的display=getComputedStyle(wrap).display;
    out.wrap宽度=Math.round(wrap.getBoundingClientRect().width);
  }
  out.每本书 = [].slice.call(books).slice(0,4).map(function(b){
    var r=b.getBoundingClientRect();
    return {父:b.parentElement?(b.parentElement.id||b.parentElement.className):'?', 宽:Math.round(r.width), 高:Math.round(r.height),
      flex:getComputedStyle(b).flex};
  });
  return JSON.stringify(out);
})()`));
console.log(JSON.stringify(info, null, 1));
ws2.close(); await closeTab(t.id);
