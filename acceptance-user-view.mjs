/**
 * 端到端验收（用户视角）：
 *  ① 更新日志卡：今天是 2026-10-02，第一条应该是今天的
 *  ② 说说：点标签只显示该标签的卡片；点「全部」恢复
 *  ③ 归档：切到归档时卡片墙真的隐藏
 *  ④ 全程无渲染错误
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/home?acc=' + Date.now() });
await sleep(21000);

const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + v);
const visibleCards = `(function(){
  var cards=[].slice.call(document.querySelectorAll('#memo-wall .memo-card'));
  var vis=cards.filter(function(e){var s=getComputedStyle(e);return s.display!=='none'&&e.getBoundingClientRect().height>1});
  return JSON.stringify({总数:cards.length,可见:vis.length,标签:vis.map(function(e){return e.dataset.tags||'无'})});
})()`;

console.log('════ ① 更新日志（今天）════');
line('条目数', await evalJs(c, 'document.querySelectorAll(".log-item").length'));
line('日期', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".log-date")).map(function(e){return e.textContent}))'));
line('标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".log-name")).map(function(e){return e.textContent.slice(0,26)}))'));
line('今天(10-02)的条数', await evalJs(c, '[].slice.call(document.querySelectorAll(".log-date")).filter(function(e){return /10-02/.test(e.textContent)}).length'));
line('卡片可见', await evalJs(c, '(function(){var e=document.querySelector(".log-card");var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)+" opacity="+getComputedStyle(e).opacity})()'));

console.log('\n════ ② 说说：点标签筛选 ════');
await evalJs(c, 'navigateTo("memos"); 1');
await sleep(3000);
console.log('  未筛选: ' + await evalJs(c, visibleCards));
for (const tag of ['折腾', '建站', '测试']) {
  await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll("#memo-tagbar .memo-tag")).find(function(x){return x.textContent.indexOf(${JSON.stringify(tag)})===0});if(b)b.click();return 1})()`);
  await sleep(1500);
  console.log('  点「' + tag + '」: ' + await evalJs(c, visibleCards));
}
await evalJs(c, '(function(){var b=document.querySelector("#memo-tagbar .memo-tag");if(b)b.click();return 1})()');
await sleep(1500);
console.log('  点「全部」: ' + await evalJs(c, visibleCards));

console.log('\n════ ③ 归档切换 ════');
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-tab")).find(function(x){return x.dataset.memoMode==="archive"});if(b)b.click();return 1})()');
await sleep(2200);
line('卡片墙 display', await evalJs(c, 'getComputedStyle(document.getElementById("memo-wall")).display'));
line('归档区 display', await evalJs(c, 'getComputedStyle(document.getElementById("memo-archive")).display'));
line('分组切换器可见', await evalJs(c, 'getComputedStyle(document.getElementById("memo-grouping")).display'));
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-gbtn")).find(function(x){return x.dataset.memoGroup==="tag"});if(b)b.click();return 1})()');
await sleep(2000);
line('按标签分组', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".memo-arch-label")).map(function(e){return e.textContent}))'));
await screenshot(c, 'B:/dell/Documents/harness/shots/final-archive-tag.png');

await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-tab")).find(function(x){return x.dataset.memoMode==="card"});if(b)b.click();return 1})()');
await sleep(1800);
line('切回卡片后 卡片墙 display', await evalJs(c, 'getComputedStyle(document.getElementById("memo-wall")).display'));
line('切回卡片后 分组器 display', await evalJs(c, 'getComputedStyle(document.getElementById("memo-grouping")).display'));

console.log('\n════ ④ 渲染错误 ════');
line('RENDER_ERRORS', await evalJs(c, 'JSON.stringify(RENDER_ERRORS)'));
line('错误条', await evalJs(c, 'document.getElementById("render-err")?"有":"无"'));

await closeTab(t.id);
