// 验收：连续打开多本书（点开 → 关闭 → 再点开第二本 → 第三本）
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(() => {});
await c.send('Page.navigate', { url: 'https://map-gallery-ewt.pages.dev/?bk=' + Date.now() });
await sleep(24000);
const line = (n, v) => console.log('  ' + String(n).padEnd(22) + ' = ' + String(v).slice(0, 150));

await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="shelf"]');if(b)b.click();return 1})()`);
await sleep(4000);
line('书架本数(3D)', await evalJs(c, 'document.querySelectorAll(".shelf3d").length'));
line('省份顺序', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.sb-prov')).map(function(e){return e.textContent}))`));

for (let i = 0; i < 3; i++) {
  console.log('\n--- 第 ' + (i + 1) + ' 本书 ---');
  await evalJs(c, `(function(){var bs=document.querySelectorAll('.shelf3d');if(bs[${i}])bs[${i}].click();return !!bs[${i}]})()`);
  await sleep(4500);
  line('弹层打开', await evalJs(c, `document.getElementById('bookLayer').classList.contains('show')`));
  line('标题', await evalJs(c, `document.getElementById('bkTitle').textContent`));
  line('容器元素', await evalJs(c, `(function(){var b=document.getElementById('bkBook');return b?('存在 页数='+b.querySelectorAll('.book-page').length+' 库包装='+(b.className.indexOf('stf')>=0?'有':'无')):'容器没了'})()`));
  line('翻页库实例', await evalJs(c, `__flip ? '已创建' : '不存在'`));
  line('页码', await evalJs(c, `document.getElementById('bkPage').textContent`));
  // 翻一页验证可用
  await evalJs(c, 'bookNext(); 1'); await sleep(1400);
  line('翻页后', await evalJs(c, `document.getElementById('bkPage').textContent`));
  await evalJs(c, 'closeBook(); 1'); await sleep(1500);
  line('关闭后 弹层', await evalJs(c, `document.getElementById('bookLayer').classList.contains('show')`));
}

await screenshot(c, 'B:/dell/Documents/harness/shots/book-reopen.png');
console.log('\n  截图: shots/book-reopen.png');
await closeTab(t.id);
