// 用站点真实数据看三个分类，不做任何注入
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?real=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 130));

await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3500);

console.log('════ 标题区有没有重叠 ════');
const hd = JSON.parse(await evalJs(c, `(function(){
  var h2=document.querySelector('.dim-h2'), en=document.querySelector('.dim-en'), k=document.querySelector('.dim-kicker');
  if(!h2||!en)return JSON.stringify({err:'缺元素'});
  function r(e){var q=e.getBoundingClientRect();return {y:Math.round(q.top),h:Math.round(q.height),bottom:Math.round(q.bottom)}}
  return JSON.stringify({kicker:r(k), 标题:r(h2), 副标:r(en), 重叠:(r(h2).bottom>r(en).y+1)});
})()`));
console.log('  ' + JSON.stringify(hd));

console.log('\n════ 真实数据：书籍 ════');
line('书数', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book").length'));
line('选中书尺寸', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");if(!b)return "无";var r=b.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
line('选中书的书名', await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .memory-book.active");if(!b)return "无";var t=b.querySelector(".memory-book-title");return t?t.textContent:"无"})()'));
line('有封面的书', await evalJs(c, `(function(){
  var bs=[].slice.call(document.querySelectorAll('#dim-grid .memory-book'));
  var withImg=bs.filter(function(b){var p=b.querySelector('.memory-book-photo');return p&&/url\\(/.test(getComputedStyle(p).backgroundImage||'')}).length;
  return withImg+' / '+bs.length;
})()`));
line('封面照片是否真的加载', await evalJs(c, `(function(){
  var p=document.querySelector('#dim-grid .memory-book.active .memory-book-photo');
  if(!p)return '无';
  var bg=getComputedStyle(p).backgroundImage;
  return bg.slice(0,80);
})()`));
line('书脊面可见度', await evalJs(c, 'getComputedStyle(document.querySelector("#dim-grid .memory-book.active .memory-book-spine-face")).opacity'));
line('object transform', await evalJs(c, 'getComputedStyle(document.querySelector("#dim-grid .memory-book.active .memory-book-object")).transform.slice(0,40)'));
await screenshot(c, 'B:/dell/Documents/harness/shots/real-books.png');
console.log('  截图: shots/real-books.png');

console.log('\n════ 真实数据：游戏 ════');
await evalJs(c, 'setDimKind("games"), 1');
await sleep(2500);
line('容器类名', await evalJs(c, 'document.getElementById("dim-grid").className'));
line('display / 列数', await evalJs(c, 'getComputedStyle(document.getElementById("dim-grid")).display + " / " + getComputedStyle(document.getElementById("dim-grid")).gridTemplateColumns.split(" ").length + " 列"'));
line('游戏卡数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card").length'));
line('卡片标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#dim-grid .dim-title")).map(function(e){return e.textContent}))'));
line('有封面的卡', await evalJs(c, `(function(){
  var cs=[].slice.call(document.querySelectorAll('#dim-grid .dim-card'));
  var withImg=cs.filter(function(c){var i=c.querySelector('.dim-thumb img');return i&&i.naturalWidth>0}).length;
  return withImg+' / '+cs.length;
})()`));
await screenshot(c, 'B:/dell/Documents/harness/shots/real-games.png');
console.log('  截图: shots/real-games.png');

console.log('\n════ 异常 ════');
ws2.send(JSON.stringify({ id: 99, method: 'Runtime.evaluate', params: { expression: '1' } }));
ws2.close();
await closeTab(t.id);
