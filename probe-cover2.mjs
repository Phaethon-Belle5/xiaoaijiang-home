// 探测：书架视口高度、书的位置、封面上各元素
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?probe=' + Date.now() });
await sleep(20000);
await evalJs(c, `(function(){
  var CV='https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
  var T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4,
      review:'简介',thought:'评价',cover:(i===3?CV:''),date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);

const out = JSON.parse(await evalJs(c, `(function(){
  var vw=document.getElementById('dim-grid');
  var b=vw.querySelector('.memory-book.active');
  var vr=vw.getBoundingClientRect();
  var s=getComputedStyle(vw);
  var r={};
  r.viewport={w:Math.round(vr.width),h:Math.round(vr.height),radius:s.borderRadius,height:s.height};
  if(b){
    var br=b.getBoundingClientRect();
    r.book={w:Math.round(br.width),h:Math.round(br.height),top:Math.round(br.top)};
    ['memory-book-index','memory-book-title','memory-book-photo','memory-book-meta'].forEach(function(cls){
      var e=b.querySelector('.'+cls);
      if(!e){r[cls]='缺';return}
      var q=e.getBoundingClientRect(), cs=getComputedStyle(e);
      r[cls]={y:Math.round(q.top),h:Math.round(q.height),color:cs.color,text:(e.textContent||'').trim().slice(0,14)};
    });
  }
  return JSON.stringify(r);
})()`));
console.log(JSON.stringify(out, null, 2));
await sleep(600);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-shelf-final.png');
console.log('  截图: shots/dim-shelf-final.png');
ws2.close();
await closeTab(t.id);
