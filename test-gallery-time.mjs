// 映像馆「时间足迹」验收
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?time=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 200));

await evalJs(c, 'setMemTab("time"); 1');
await sleep(2500);

console.log('════ 时间足迹 ════');
line('年份节点数', await evalJs(c, 'document.querySelectorAll(".mem-year").length'));
line('年份', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-year')).map(function(e){return e.textContent}))`));
line('月份节点数', await evalJs(c, 'document.querySelectorAll(".mem-node").length'));
line('面板微缩图数', await evalJs(c, 'document.querySelectorAll(".mem-thumb").length'));
line('+N 更多按钮', await evalJs(c, 'document.querySelectorAll(".mem-more").length'));
line('节点可见尺寸', await evalJs(c, `(function(){var e=document.querySelector('.mem-node');if(!e)return '无';var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' opacity='+getComputedStyle(e).opacity})()`));
line('前 6 个月份', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-node')).slice(0,6).map(function(e){return e.querySelector('.mem-node-m').textContent+' / '+e.querySelector('.mem-node-n').textContent+' / '+e.querySelector('.mem-node-city').textContent.slice(0,22)}))`));
line('时间轴竖线可见', await evalJs(c, `(function(){var e=document.querySelector('.mem-time');return e?getComputedStyle(e,'::before').width:'无'})()`));

console.log('\n════ 缩略图能加载吗（src 抽查）════');
line('前 3 张 src', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-thumb')).slice(0,3).map(function(e){return e.src.slice(-40)}))`));
line('已完成加载的图数', await evalJs(c, `[].slice.call(document.querySelectorAll('.mem-thumb')).filter(function(e){return e.complete&&e.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.mem-thumb').length`));

console.log('\n════ 点缩略图是否能打开查看器 ════');
await evalJs(c, `(function(){var e=document.querySelector('.mem-thumb');if(e)e.click();return 1})()`);
await sleep(3500);
line('查看器 .show', await evalJs(c, `(function(){var v=document.querySelector('.img-viewer');return v?(v.classList.contains('show')?'已打开':'未打开 ('+v.className+')'):'找不到查看器元素'})()`));
line('ringOn', await evalJs(c, 'typeof ringOn!=="undefined"?ringOn:"?"'));
line('可见卡片数', await evalJs(c, `document.querySelectorAll('.carousel-card,.ring-card').length`));

console.log('\n════ 渲染错误 ════');
line('面板内容长度', await evalJs(c, 'document.getElementById("memPanel").innerHTML.length'));
line('面板是否有报错文案', await evalJs(c, `/出错了/.test(document.getElementById('memPanel').innerHTML) ? '有' : '没有'`));

await evalJs(c, `(function(){try{closeViewer()}catch(e){} setMemTab('time'); document.getElementById('memZone').scrollIntoView({block:'start'}); return 1})()`);
await sleep(2000);
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-time.png');
console.log('\n  截图: shots/gallery-time.png');

await closeTab(t.id);
