/**
 * 本地验证「更新日志：类别检索 + 时间排序 + 置顶」
 * 本地服务没有 /api，所以自己灌一份日志数据再测。
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'http://127.0.0.1:8793/index.html?v=' + Date.now() });
await sleep(6000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + v);

// 灌测试数据
const seeded = await evalJs(c, `(function(){
  data.changelog=[
    {date:'2026-10-02',tag:'修复',title:'第三条-修复-早',text:'a\\nb'},
    {date:'2026-10-05',tag:'功能',title:'第一条-功能-晚',text:'c'},
    {date:'2026-10-01',tag:'优化',title:'第四条-优化-最早',text:'d'},
    {date:'2026-10-04',tag:'修复',title:'第二条-修复-中',text:'e'},
    {date:'2026-10-03',tag:'功能',title:'置顶-功能',text:'f',pinned:true}
  ];
  logFilter=''; logSort='desc';
  renderLogCard();
  return '已灌入 5 条';
})()`);
console.log('  ' + seeded + '\n');

const order = `JSON.stringify([].slice.call(document.querySelectorAll('.log-item')).map(function(e){
  var pin=e.querySelector('.log-pin')?'[★]':'';
  return pin+e.querySelector('.log-date').textContent+' '+e.querySelector('.log-name').textContent;
}))`;

console.log('════ ① 界面元素 ════');
line('类别 chip', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-chip')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));
line('排序按钮', await evalJs(c, 'document.querySelector(".log-sortbtn").textContent.trim()'));
line('总条数徽标', await evalJs(c, 'document.querySelector(".log-count").textContent'));
line('置顶星标存在', await evalJs(c, 'document.querySelectorAll(".log-pin").length + " 个"'));

console.log('\n════ ② 默认排序（新→旧，置顶在最前）════');
console.log('  ' + await evalJs(c, order));

console.log('\n════ ③ 切换时间排序 ════');
await evalJs(c, 'setLogSort("asc"); 1');
await sleep(700);
line('按钮文字', await evalJs(c, 'document.querySelector(".log-sortbtn").textContent.trim()'));
console.log('  ' + await evalJs(c, order));
await evalJs(c, 'setLogSort("desc"); 1');
await sleep(700);
line('切回后按钮', await evalJs(c, 'document.querySelector(".log-sortbtn").textContent.trim()'));

console.log('\n════ ④ 类别检索 ════');
for (const tag of ['修复', '功能', '优化']) {
  await evalJs(c, `setLogFilter(${JSON.stringify(tag)}); 1`);
  await sleep(600);
  console.log('  点「' + tag + '」→ ' + await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-item')).map(function(e){return e.querySelector('.log-name').textContent}))`));
}
line('筛选时 chip 选中态', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-chip')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));
line('底部提示', await evalJs(c, 'document.querySelector(".log-foot").textContent.trim()'));
await evalJs(c, 'setLogFilter(""); 1');
await sleep(600);
console.log('  点「全部」→ ' + await evalJs(c, "document.querySelectorAll('.log-item').length + ' 条'"));

console.log('\n════ ⑤ 置顶开关 ════');
await evalJs(c, 'toggleLogPin(2); 1');   // 把「第四条-优化-最早」置顶
await sleep(800);
console.log('  ' + await evalJs(c, order));
line('现在置顶条数', await evalJs(c, 'document.querySelectorAll(".log-item.pinned").length'));
line('data 里的 pinned', await evalJs(c, 'JSON.stringify(data.changelog.map(function(x){return (x.pinned?1:0)+(x.tag||"")+"|"+x.title.slice(0,6)}))'));

console.log('\n════ ⑥ 展开/收起仍正常 ════');
await evalJs(c, 'document.querySelectorAll(".log-row")[0].click(); 1');
await sleep(900);
line('展开后 open 数', await evalJs(c, 'document.querySelectorAll(".log-item.open").length'));
line('aria-expanded', await evalJs(c, 'document.querySelectorAll(".log-row")[0].getAttribute("aria-expanded")'));
await evalJs(c, 'document.querySelectorAll(".log-row")[0].click(); 1');
await sleep(900);
line('再点收回', await evalJs(c, 'document.querySelectorAll(".log-item.open").length === 0 ? "已收回" : "没收回"'));

console.log('\n════ ⑦ 后台面板 ════');
line('置顶复选框数', await evalJs(c, '(ADMIN_RENDER.changelog().match(/data-l-field="pinned"/g)||[]).length'));
line('主渲染无错', await evalJs(c, 'try{return "OK "+ADMIN_RENDER.changelog().length+" 字符"}catch(e){return "抛错 "+e.message}'));
line('RENDER_ERRORS', await evalJs(c, 'JSON.stringify(RENDER_ERRORS)'));

await closeTab(t.id);
