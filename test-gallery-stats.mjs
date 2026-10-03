/**
 * 映像馆「记忆区」验收：旅行统计面板
 * 重点：元素真的在屏幕上吗（宽高、可见性），而不只是"代码执行了"
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?mem=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);

console.log('════ 记忆区是否渲染 ════');
line('地图城市数', await evalJs(c, 'typeof mapCityPoints!=="undefined" ? mapCityPoints.length : "未加载"'));
line('照片数', await evalJs(c, 'typeof GALLERY!=="undefined" ? GALLERY.length : "未加载"'));
line('mem-zone 存在', await evalJs(c, '!!document.getElementById("memZone")'));
line('tab 数量', await evalJs(c, 'document.querySelectorAll(".mem-tab").length'));
line('tab 文字', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-tab')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));
line('面板内容长度', await evalJs(c, 'document.getElementById("memPanel").innerHTML.length'));
line('面板可见尺寸', await evalJs(c, `(function(){var e=document.getElementById('memPanel');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' opacity='+getComputedStyle(e).opacity})()`));
line('统计卡片数', await evalJs(c, 'document.querySelectorAll(".mem-card").length'));
line('内存块数', await evalJs(c, 'document.querySelectorAll(".mem-block").length'));

console.log('\n════ 统计数值 ════');
console.log('  ' + await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-card')).map(function(e){return e.querySelector('.k').textContent+'='+e.querySelector('.v').textContent.trim()}))`));
console.log('  时间跨度: ' + await evalJs(c, `(function(){var b=document.querySelectorAll('.mem-block p');return b[0]?b[0].textContent.trim():'无'})()`));
console.log('  顶部排行: ' + await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-block')[1].querySelectorAll('.mem-bar')).map(function(e){return e.querySelector('.n').textContent+':'+e.querySelector('.c').textContent}))`));
console.log('  标签区块: ' + await evalJs(c, `(function(){var blocks=[].slice.call(document.querySelectorAll('.mem-block'));var t=blocks.find(function(b){return /标签/.test(b.querySelector('h3').textContent)});return t?t.querySelectorAll('.mem-chip').length+' 个 chip':'无'})()`));
console.log('  按年足迹: ' + await evalJs(c, `(function(){var blocks=[].slice.call(document.querySelectorAll('.mem-block'));var t=blocks.find(function(b){return /年份/.test(b.querySelector('h3').textContent)});return t?JSON.stringify([].slice.call(t.querySelectorAll('.mem-bar')).map(function(e){return e.querySelector('.n').textContent+':'+e.querySelector('.c').textContent})):'无'})()`));

console.log('\n════ 切到其它标签（应显示占位，不报错）════');
for (const [key, label] of [['time', '时间足迹'], ['shelf', '记忆书架'], ['stream', '照片流'], ['stats', '旅行统计']]) {
  await evalJs(c, `setMemTab(${JSON.stringify(key)}); 1`);
  await sleep(900);
  const on = await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll('.mem-tab')).find(function(e){return e.classList.contains('on')});return b?b.textContent:'无'})()`);
  const len = await evalJs(c, 'document.getElementById("memPanel").innerHTML.length');
  console.log('  点「' + label + '」→ 选中=' + on + '  内容长度=' + len);
}

console.log('\n════ 渲染错误 ════');
line('RENDER 错误', await evalJs(c, 'typeof RENDER_ERRORS!=="undefined" ? JSON.stringify(RENDER_ERRORS) : "(无该变量)"'));
line('页面异常', await evalJs(c, `(function(){try{return window.__lastErr||'无'}catch(e){return '?'}})()`));

await evalJs(c, 'setMemTab("stats"); document.getElementById("memZone").scrollIntoView({block:"start"}); 1');
await sleep(2000);
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-stats.png');
console.log('\n  截图: shots/gallery-stats.png');

await closeTab(t.id);
