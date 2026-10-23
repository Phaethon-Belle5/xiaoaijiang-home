import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?d=' + Date.now() });
await sleep(20000);
await evalJs(c, `(function(){
  var T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4,
      review:'简介',thought:'评价',cover:(i<4?'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp':''),date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);
const r = JSON.parse(await evalJs(c, `(function(){
  var b=document.querySelector('#dim-grid .memory-book.active');
  var obj=b.querySelector('.memory-book-object');
  var out={};
  function m(name,sel){
    var e=b.querySelector(sel);
    if(!e){out[name]='缺';return}
    var r=e.getBoundingClientRect(), s=getComputedStyle(e);
    out[name]={w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.left),
      opacity:s.opacity,transform:(s.transform||'none').slice(0,44),bg:(s.backgroundImage||'').slice(0,40),z:s.zIndex};
  }
  m('object','.memory-book-object');
  m('cover','.memory-book-cover');
  m('spine','.memory-book-spine-face');
  m('pageEdge','.memory-book-page-edge');
  m('edgeTop','.memory-book-edge-top');
  m('back','.memory-book-back');
  out.objectStyle={transformStyle:getComputedStyle(obj).transformStyle, transform:getComputedStyle(obj).transform.slice(0,44)};
  out.viewport={perspective:getComputedStyle(document.getElementById('dim-grid')).perspective};
  out.变量={cover:getComputedStyle(b).getPropertyValue('--book-cover').trim(), depth:getComputedStyle(b).getPropertyValue('--book-depth').trim()||'(无)'};
  return JSON.stringify(out);
})()`));
console.log(JSON.stringify(r.spine, null, 2));
await sleep(2500);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-3d-real.png');
console.log('  截图: shots/dim-3d-real.png');
ws2.close();
await closeTab(t.id);
