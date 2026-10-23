import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?hd=' + Date.now() });
await sleep(20000);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);
console.log(await evalJs(c, `(function(){
  var head=document.querySelector('.dim-head');
  var out={头部结构:[]};
  if(head){
    [].slice.call(head.children).forEach(function(el){
      var r=el.getBoundingClientRect(), s=getComputedStyle(el);
      out.头部结构.push({
        标签: el.tagName+'.'+el.className,
        文字: (el.textContent||'').trim().slice(0,20),
        y: Math.round(r.top), h: Math.round(r.height),
        display: s.display, position: s.position,
        margin: s.marginTop+'/'+s.marginBottom,
        lineHeight: s.lineHeight, fontSize: s.fontSize
      });
    });
  }
  out.头部自身 = head? (function(){var s=getComputedStyle(head);var r=head.getBoundingClientRect();return {display:s.display, position:s.position, h:Math.round(r.height)}})() : null;
  out.有旧sectionHeader = !!document.querySelector('#dimension-section .section-header');
  return JSON.stringify(out,null,2);
})()`));
ws2.close();
await closeTab(t.id);
