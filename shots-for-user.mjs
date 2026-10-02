// 用用户视口(1528x746)截图 + 验证入场动画兜底
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/home?shot=' + Date.now() });
await sleep(21000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);

console.log('════ 兜底是否生效（不滚动的情况下）════');
line('音乐/日志/热点区块 opacity', await evalJs(c, 'getComputedStyle(document.querySelector(".music-card-section")).opacity'));
line('日志卡 opacity', await evalJs(c, 'getComputedStyle(document.querySelector(".log-card")).opacity'));
line('日志卡条目数', await evalJs(c, 'document.querySelectorAll(".log-item").length'));

console.log('\n════ 截图 1：首页滚到日志卡 ════');
await evalJs(c, 'document.querySelector(".log-card").scrollIntoView({block:"center"}); 1');
await sleep(2500);
await screenshot(c, 'B:/dell/Documents/harness/shots/for-user-1-home-changelog.png');
line('已存', 'shots/for-user-1-home-changelog.png');

console.log('\n════ 截图 2：说说页（标签栏在最上面）════');
await evalJs(c, 'navigateTo("memos"); 1');
await sleep(3000);
await evalJs(c, 'window.scrollTo(0,0); 1');
await sleep(1200);
await screenshot(c, 'B:/dell/Documents/harness/shots/for-user-2-memos-tags.png');
line('已存', 'shots/for-user-2-memos-tags.png');
line('标签栏位置', await evalJs(c, '(function(){var r=document.getElementById("memo-tagbar").getBoundingClientRect();return "top="+Math.round(r.top)+" 尺寸="+Math.round(r.width)+"x"+Math.round(r.height)})()'));
line('标签文字', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#memo-tagbar .memo-tag")).map(function(e){return e.textContent}))'));

console.log('\n════ 截图 3：归档 + 按标签分组 ════');
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-tab")).find(function(x){return x.dataset.memoMode==="archive"});if(b)b.click();return 1})()');
await sleep(2200);
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-gbtn")).find(function(x){return x.dataset.memoGroup==="tag"});if(b)b.click();return 1})()');
await sleep(2200);
await evalJs(c, 'window.scrollTo(0,0); 1');
await sleep(1200);
line('分组名', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".memo-arch-label")).map(function(e){return e.textContent}))'));
await screenshot(c, 'B:/dell/Documents/harness/shots/for-user-3-archive-by-tag.png');
line('已存', 'shots/for-user-3-archive-by-tag.png');

await closeTab(t.id);
