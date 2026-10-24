import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?geo=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('shelf'), 1");
await sleep(9000);
console.log(await evalJs(c, `(function(){
  var p=document.getElementById('memoryProvinceInfo');
  if(!p)return '没有面板';
  var pr=p.getBoundingClientRect();
  var out={面板:{x:Math.round(pr.left),y:Math.round(pr.top),w:Math.round(pr.width),h:Math.round(pr.height)},
           面板样式:{display:getComputedStyle(p).display,overflow:getComputedStyle(p).overflowY,pos:getComputedStyle(p).position}};
  function box(sel){
    var e=p.querySelector(sel);
    if(!e)return '不存在';
    var r=e.getBoundingClientRect();
    var cs=getComputedStyle(e);
    return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
            可见:cs.visibility!=='hidden'&&cs.display!=='none'&&r.width>0&&r.height>0,
            相对面板顶部:Math.round(r.top-pr.top),
            超出:r.top>pr.bottom?'超出底部':(r.bottom<pr.top?'在顶部之上':'在框内')};
  }
  out.计数=box('.memory-info-count');
  out.标题=box('.memory-info-heading');
  out.统计=box('.memory-info-stats');
  out.日期=box('.memory-info-date');
  out.评价块=box('.memory-info-review-block');
  out.城市容器=box('.memory-info-cities');
  out.说明=box('.memory-info-note');
  out.面板子元素=[].slice.call(p.children).map(function(e){return e.className+':'+Math.round(e.getBoundingClientRect().height)});
  return JSON.stringify(out,null,1);
})()`));
ws2.close(); await closeTab(t.id);
