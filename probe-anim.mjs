import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?anim=' + Date.now() });
await sleep(20000);

const CV = 'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
await evalJs(c, `(function(){
  var T=['月光航线','玻璃海纪事','风起青山','三体'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4.5,
      review:'这是《'+t+'》的简介正文。',thought:'评价一\\n评价二\\n评价三',
      cover:${JSON.stringify(CV)},date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);

console.log('  reduced-motion = ' + await evalJs(c, 'String(window.matchMedia("(prefers-reduced-motion: reduce)").matches)'));

// 走真实点击路径
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[1].click();return 1})()`);
await sleep(800);
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[1].click();return 1})()`);
await sleep(1800);

console.log('  ' + await evalJs(c, `(function(){
  var b=document.querySelector('#dim-grid .memory-book.opening');
  if(!b)return '没有 opening 的书';
  var cv=b.querySelector('.memory-book-cover');
  var ci=b.querySelector('.memory-book-cover-inside');
  var op=b.querySelector('.memory-book-opening-page');
  function st(e,label){
    if(!e)return label+': 缺';
    var s=getComputedStyle(e);
    return label+': anim='+s.animationName+' dur='+s.animationDuration+' op='+s.opacity+' tf='+s.transform.slice(0,30);
  }
  return [st(cv,'封面'), st(ci,'封内'), st(op,'右页')].join(' | ');
})()`));
await screenshot(c, 'B:/dell/Documents/harness/shots/book-open-anim.png');
console.log('  截图: shots/book-open-anim.png');
ws2.close();
await closeTab(t.id);
