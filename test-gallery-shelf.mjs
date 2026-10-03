// 映像馆「记忆书架」验收
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?shelf=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 190));

await evalJs(c, 'setMemTab("shelf"); 1');
await sleep(2500);

console.log('════ 书架 ════');
line('书的本数', await evalJs(c, 'document.querySelectorAll(".shelf-book").length'));
line('第一本尺寸', await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');if(!e)return '无';var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' opacity='+getComputedStyle(e).opacity})()`));
line('书脊标题', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.sb-title')).slice(0,6).map(function(e){return e.textContent}))`));
line('书脊信息', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.sb-meta')).slice(0,3).map(function(e){return e.textContent}))`));
line('封面图已加载', await evalJs(c, `[].slice.call(document.querySelectorAll('.sb-face img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.sb-face img').length`));

console.log('\n════ 点第一本书 ════');
await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');if(e)e.click();return 1})()`);
await sleep(4000);
line('弹层 .show', await evalJs(c, `document.getElementById('bookLayer').classList.contains('show')`));
line('标题', await evalJs(c, `document.getElementById('bkTitle').textContent`));
line('页数', await evalJs(c, `document.querySelectorAll('.book-page').length`));
line('翻页库是否就绪', await evalJs(c, `(window.St && St.PageFlip) ? "已加载" : "未加载"`));
line('是否退化为滚动', await evalJs(c, `document.getElementById('bkBook').classList.contains('bk-fallback') ? "是（翻页库失败）" : "否（正常翻页）"`));
line('页码显示', await evalJs(c, `document.getElementById('bkPage').textContent`));
line('书容器尺寸', await evalJs(c, `(function(){var e=document.getElementById('bkBook');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)})()`));
line('首页内容', await evalJs(c, `(function(){var e=document.querySelector('.book-page');return e?e.textContent.replace(/\\s+/g,' ').slice(0,70):'无'})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-shelf-book.png');
console.log('\n  截图: shots/gallery-shelf-book.png');

console.log('\n════ 翻页 ════');
const before = await evalJs(c, 'document.getElementById("bkPage").textContent');
await evalJs(c, 'bookNext(); 1');
await sleep(2000);
const after = await evalJs(c, 'document.getElementById("bkPage").textContent');
line('翻页前/后', before + ' → ' + after + (before !== after ? '  ✅ 翻页生效' : '  ⚠ 页码未变'));
await evalJs(c, 'bookPrev(); 1');
await sleep(1500);
line('翻回后', await evalJs(c, 'document.getElementById("bkPage").textContent'));

console.log('\n════ 关闭 ════');
await evalJs(c, 'closeBook(); 1');
await sleep(1200);
line('弹层 .show', await evalJs(c, `document.getElementById('bookLayer').classList.contains('show')`));
line('body 滚动恢复', await evalJs(c, `document.body.style.overflow === '' ? '已恢复' : document.body.style.overflow`));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-shelf.png');
console.log('\n  截图: shots/gallery-shelf.png');

await closeTab(t.id);
