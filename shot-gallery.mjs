// 打开映像馆 → 记忆书架 → 截图，作为"要一模一样"的基准
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?m=' + Date.now() });
await sleep(18000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));

line('页面标题', await evalJs(c, 'document.title'));
line('是否有"记忆书架"入口', await evalJs(c, 'document.querySelectorAll("[data-mem=\\"shelf\\"]").length') + ' 个按钮');

// ① 先进映像馆
await evalJs(c, `(function(){
  var bs=[].slice.call(document.querySelectorAll('button,a'));
  var enter=bs.find(function(b){return /进入映像馆/.test(b.textContent||'')});
  if(enter){enter.click();return 1}
  return 0;
})()`);
await sleep(4000);
line('进入后页面状态', await evalJs(c, '(function(){var e=document.querySelector("#memPop.show,.mem-pop.show,#memPop");return e?e.className:"无 memPop"})()'));
// ② 打开记忆书架弹窗
await evalJs(c, `(function(){
  var b=document.querySelector('[data-mem="shelf"]');
  if(b){b.click();return 1}
  return 0;
})()`);
await sleep(4500);
line('弹窗是否可见', await evalJs(c, `(function(){
  var p=document.getElementById('memPanel');
  if(!p)return '无';
  var r=p.getBoundingClientRect();
  return r.width>50&&r.height>50 ? ('可见 '+Math.round(r.width)+'x'+Math.round(r.height)) : '不可见 '+Math.round(r.width)+'x'+Math.round(r.height);
})()`));
line('memPanel 存在', await evalJs(c, '!!document.getElementById("memPanel")'));
line('memory-book 数量', await evalJs(c, 'document.querySelectorAll("#memPanel .memory-book").length'));
line('active 数量', await evalJs(c, 'document.querySelectorAll("#memPanel .memory-book.active").length'));
line('viewport', await evalJs(c, '!!document.querySelector("#memPanel .memory-shelf-viewport")'));
line('书本尺寸', await evalJs(c, `(function(){
  var a=document.querySelector('#memPanel .memory-book.active')||document.querySelector('#memPanel .memory-book');
  if(!a)return '无';
  var r=a.getBoundingClientRect();
  return Math.round(r.width)+' x '+Math.round(r.height);
})()`));
line('有照片的书占比', await evalJs(c, `(function(){
  var bs=[].slice.call(document.querySelectorAll('#memPanel .memory-book'));
  var withPhoto=bs.filter(function(b){
    var p=b.querySelector('.memory-book-photo');
    return p && /url\\(/.test(getComputedStyle(p).backgroundImage||'');
  }).length;
  return withPhoto+' / '+bs.length;
})()`));
line('封面里的文字', await evalJs(c, `(function(){
  var c=document.querySelector('#memPanel .memory-book.active .memory-book-cover')||document.querySelector('#memPanel .memory-book-cover');
  return c?c.innerText.replace(/\\s+/g,'|').slice(0,90):'无';
})()`));
line('书架下方有无信息面板', await evalJs(c, '!!document.querySelector("#memPanel .memory-province-info")'));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-memshelf.png');
console.log('  截图: shots/gallery-memshelf.png');
console.log('\n异常: ' + (exceptions.length ? exceptions.slice(0,4).join(' / ') : '无'));
ws2.close();
await closeTab(t.id);
