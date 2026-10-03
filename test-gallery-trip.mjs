// 映像馆「旅行轨迹（回放 + 路线清单）」验收
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?trip=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 190));

console.log('════ 点「轨迹回放」前 ════');
line('面板显示', await evalJs(c, `getComputedStyle(document.getElementById('tripPanel')).display`));
line('轨迹序列长度', await evalJs(c, 'typeof tripSeq!=="undefined" ? tripSeq.length : "未初始化"'));

await evalJs(c, `(function(){document.getElementById('tripBtn').click();return 1})()`);
await sleep(2500);

console.log('\n════ 回放中 ════');
line('按钮文字', await evalJs(c, `document.getElementById('tripBtn').textContent.trim()`));
line('tripOn / tripN', await evalJs(c, 'tripOn + " / " + tripN'));
line('面板 display', await evalJs(c, `getComputedStyle(document.getElementById('tripPanel')).display`));
line('面板尺寸', await evalJs(c, `(function(){var e=document.getElementById('tripPanel');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' @'+Math.round(r.left)+','+Math.round(r.top)})()`));
line('标题', await evalJs(c, `document.querySelector('.tp-title').textContent`));
line('副标题', await evalJs(c, `document.querySelector('.tp-sub').textContent`));
line('路线行数', await evalJs(c, `document.querySelectorAll('.tp-row').length`));
line('当前高亮行', await evalJs(c, `(function(){var e=document.querySelector('.tp-row.now');return e?e.textContent.trim():'无'})()`));
line('已完成行数', await evalJs(c, `document.querySelectorAll('.tp-row.done').length`));
console.log('  路线前 6 行: ' + await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.tp-row')).slice(0,6).map(function(e){return e.querySelector('.i').textContent+'.'+e.querySelector('.n').textContent+' '+e.querySelector('.d').textContent}))`));
console.log('  地图上轨迹图层: ' + await evalJs(c, `(function(){try{var s=mapChart.getOption().series.filter(function(x){return x.name==='trip-path'||x.name==='trip-nodes'});return s.map(function(x){return x.name+':'+(x.data||[]).length}).join(' | ')}catch(e){return '取不到 '+e.message}})()`));

console.log('\n════ 再跑一会儿，看是否推进 ════');
const before = await evalJs(c, 'tripN');
await sleep(5000);
const after = await evalJs(c, 'tripN');
line('tripN 变化', before + ' → ' + after + (after > before ? '  ✅ 在推进' : '  ❌ 没动'));
line('当前高亮行', await evalJs(c, `(function(){var e=document.querySelector('.tp-row.now');return e?e.textContent.trim():'无'})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-trip.png');
console.log('\n  截图: shots/gallery-trip.png');

console.log('\n════ 清除轨迹 ════');
await evalJs(c, `(function(){document.getElementById('tripBtn').click();return 1})()`);
await sleep(2000);
line('面板 display', await evalJs(c, `getComputedStyle(document.getElementById('tripPanel')).display`));
line('tripOn', await evalJs(c, 'tripOn'));

await closeTab(t.id);
