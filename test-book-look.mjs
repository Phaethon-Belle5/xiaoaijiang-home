// 验收新书封外观（照参考项目的纸质书）+ 截图
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 2, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?bk=' + Date.now() });
await sleep(24000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 160));

await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="shelf"]');if(b)b.click();return 1})()`);
await sleep(4500);

console.log('════ 书架外观 ════');
line('书数', await evalJs(c, 'document.querySelectorAll(".shelf-book").length'));
line('书的背景色', await evalJs(c, `getComputedStyle(document.querySelector('.shelf-book')).backgroundColor`));
line('书的圆角', await evalJs(c, `getComputedStyle(document.querySelector('.shelf-book')).borderRadius`));
line('书中文字颜色', await evalJs(c, `getComputedStyle(document.querySelector('.sb-prov')).color`));
line('省份名字体', await evalJs(c, `getComputedStyle(document.querySelector('.sb-prov')).fontFamily.slice(0,40)`));
line('封面图区域起点', await evalJs(c, `(function(){
  var b=document.querySelector('.shelf-book'),img=b.querySelector('.sb-bottom');
  var br=b.getBoundingClientRect(),ir=img.getBoundingClientRect();
  return '图从书的 ' + Math.round((ir.top-br.top)/br.height*100) + '% 处开始（参考项目是 26%）';
})()`));
line('省份名位置', await evalJs(c, `(function(){
  var b=document.querySelector('.shelf-book'),tp=b.querySelector('.sb-top');
  var br=b.getBoundingClientRect(),tr=tp.getBoundingClientRect();
  return 'top ' + Math.round((tr.top-br.top)/br.height*100) + '% / left ' + Math.round((tr.left-br.left)/br.width*100) + '%';
})()`));
line('封面图加载', await evalJs(c, `[].slice.call(document.querySelectorAll('.sb-bottom img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.sb-bottom img').length`));

// 打开一本书看内页
await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');if(e)e.click();return 1})()`);
await sleep(4500);
line('内页页数', await evalJs(c, 'document.querySelectorAll(".book-page").length'));
line('内页背景', await evalJs(c, `getComputedStyle(document.querySelectorAll('.book-page')[2]||document.querySelector('.book-page')).backgroundImage.slice(0,60)`));
line('书封页省份名', await evalJs(c, `(function(){var e=document.querySelector('.bp-prov-name');return e?e.textContent:'无'})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/book-cover-new.png');
console.log('\n  截图: shots/book-cover-new.png（书封页）');
await evalJs(c, 'closeBook(); 1'); await sleep(1500);
await screenshot(c, 'B:/dell/Documents/harness/shots/shelf-new.png');
console.log('  截图: shots/shelf-new.png（书架）');
await closeTab(t.id);
