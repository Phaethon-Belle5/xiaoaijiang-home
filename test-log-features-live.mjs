/**
 * 线上验收：更新日志的 类别检索 / 时间排序 / 置顶
 * 并且验证置顶能持久化（写入云端后刷新仍在）
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/home?lf=' + Date.now() });
await sleep(22000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);
const order = `JSON.stringify([].slice.call(document.querySelectorAll('.log-item')).map(function(e){
  return (e.querySelector('.log-pin')?'[★]':'')+e.querySelector('.log-date').textContent+' '+e.querySelector('.log-name').textContent.slice(0,18);
}))`;

await evalJs(c, `(function(){var e=document.querySelector('.log-card'); if(e) e.scrollIntoView({block:'center'}); return 1})()`);
await sleep(2000);

console.log('════ ① 界面元素 ════');
line('日志条数', await evalJs(c, 'document.querySelectorAll(".log-item").length'));
line('类别 chip', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-chip')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));
line('排序按钮', await evalJs(c, 'document.querySelector(".log-sortbtn").textContent.trim()'));

console.log('\n════ ② 默认顺序（新→旧，置顶最前）════');
console.log('  ' + await evalJs(c, order));

console.log('\n════ ③ 类别检索（逐个点）════');
const tags = JSON.parse(await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-chip')).map(function(e){return e.textContent.replace(/[0-9*]/g,'')}))`));
for (const tag of tags) {
  await evalJs(c, `setLogFilter(${JSON.stringify(tag === '全部' ? '' : tag)}); 1`);
  await sleep(900);
  const inList = await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-item .log-tag')).map(function(e){return e.textContent}))`);
  const uniq = [...new Set(JSON.parse(inList))];
  console.log('  点「' + tag + '」→ ' + JSON.parse(inList).length + ' 条，标签集合=' + JSON.stringify(uniq) + (tag === '全部' || uniq.length <= 1 ? ' ✅' : ' ❌'));
}

console.log('\n════ ④ 时间排序切换 ════');
await evalJs(c, 'setLogFilter(""); setLogSort("asc"); 1');
await sleep(1200);
line('按钮', await evalJs(c, 'document.querySelector(".log-sortbtn").textContent.trim()'));
console.log('  ' + await evalJs(c, order));
await evalJs(c, 'setLogSort("desc"); 1');
await sleep(1200);
line('切回按钮', await evalJs(c, 'document.querySelector(".log-sortbtn").textContent.trim()'));

console.log('\n════ ⑤ 置顶（写入云端 + 刷新验证持久化）════');
const before = await evalJs(c, 'JSON.stringify((data.changelog||[]).map(function(x){return (x.pinned?1:0)+x.title.slice(0,10)}))');
line('置顶前', before);
const targetIdx = await evalJs(c, '(data.changelog||[]).findIndex(function(x){return !x.pinned})');
line('要置顶的索引', targetIdx);
await evalJs(c, 'toggleLogPin(' + targetIdx + '); 1');
await sleep(3000);
line('置顶后该条 pinned', await evalJs(c, 'data.changelog[' + targetIdx + '].pinned === true ? "true" : "false"'));
line('置顶后星标数', await evalJs(c, 'document.querySelectorAll(".log-item.pinned").length'));
console.log('  ' + await evalJs(c, order));
await screenshot(c, 'B:/dell/Documents/harness/shots/log-features.png');

// 刷新，验证置顶是否已写入云端
console.log('\n--- 刷新页面，验证置顶是否持久化 ---');
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/home?lf2=' + Date.now() });
await sleep(22000);
line('刷新后该条 pinned', await evalJs(c, 'data.changelog[' + targetIdx + '] ? String(data.changelog[' + targetIdx + '].pinned) : "索引失效"'));
line('刷新后星标数', await evalJs(c, 'document.querySelectorAll(".log-item.pinned").length'));

console.log('\n════ ⑥ 渲染错误 ════');
line('RENDER_ERRORS', await evalJs(c, 'JSON.stringify(RENDER_ERRORS)'));

await closeTab(t.id);
