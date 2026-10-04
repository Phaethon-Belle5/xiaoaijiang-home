// 记忆流调整后验收 + 截图（书封 + 书架 + 记忆流）
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(() => {});
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?fin=' + Date.now() });
await sleep(24000);
const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 150));

// 书架
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="shelf"]');if(b)b.click();return 1})()`);
await sleep(4500);
line('书数', await evalJs(c, 'document.querySelectorAll(".shelf-book").length'));
line('书封背景', await evalJs(c, `getComputedStyle(document.querySelector('.shelf-book')).backgroundColor`));
line('书封圆角', await evalJs(c, `getComputedStyle(document.querySelector('.shelf-book')).borderRadius`));
line('封面图加载', await evalJs(c, `[].slice.call(document.querySelectorAll('.sb-bottom img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length+' / '+document.querySelectorAll('.sb-bottom img').length`));
await screenshot(c, 'B:/dell/Documents/harness/shots/shelf-paper.png');
console.log('  截图: shots/shelf-paper.png');

// 书封页
await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');if(e)e.click();return 1})()`);
await sleep(5000);
line('页数', await evalJs(c, 'document.querySelectorAll(".book-page").length'));
line('书封页背景', await evalJs(c, `getComputedStyle(document.querySelector('.bp-prov')).backgroundColor`));
await screenshot(c, 'B:/dell/Documents/harness/shots/book-paper.png');
console.log('  截图: shots/book-paper.png');
await evalJs(c, 'closeBook(); 1'); await sleep(1500);

// 记忆流
await evalJs(c, `(function(){var b=document.querySelector('.mp-tab[data-mem="stream"]');if(b)b.click();return 1})()`);
await sleep(16000);
line('记忆流初始化', await evalJs(c, `(function(){try{var d=document.querySelector('.stream-frame').contentDocument;return d.defaultView.__undertow?'✅ 已初始化':'未初始化'}catch(e){return 'ERR'}})()`));
line('线条数（=城市数）', await evalJs(c, `(function(){try{var d=document.querySelector('.stream-frame').contentDocument;return d.defaultView.NF||'(取不到)'}catch(e){return 'ERR'}})()`));
line('幕布宽度 CW', await evalJs(c, `(function(){try{var d=document.querySelector('.stream-frame').contentDocument;return d.defaultView.CW||'(取不到)'}catch(e){return 'ERR'}})()`));
line('线条粗细 PHOTO_W', await evalJs(c, `(function(){try{var d=document.querySelector('.stream-frame').contentDocument;return d.defaultView.PHOTO_W||'(取不到)'}catch(e){return 'ERR'}})()`));
await screenshot(c, 'B:/dell/Documents/harness/shots/stream-wide.png');
console.log('  截图: shots/stream-wide.png');
await closeTab(t.id);
