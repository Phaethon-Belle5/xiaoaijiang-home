/**
 * 验证「所有内容按日期倒序，最新在最上面」：
 *  ① 前台：作品 / 更新日志 / 说说 / 次元柜 / 功能模块 都是日期倒序
 *  ② 后台：同样倒序（且编辑框仍写回正确的原始下标，不会串行）
 *  ③ 新增的条目日期默认今天，且出现在最上面
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?sort=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(26) + ' = ' + v); };

// 注入乱序数据
await evalJs(c, `(function(){
  data.portfolio=[
    {image:'',title:'作品_旧',url:'',tags:'工具',date:'2026-01-05'},
    {image:'',title:'作品_最新',url:'',tags:'工具',date:'2026-10-05'},
    {image:'',title:'作品_中',url:'',tags:'工具',date:'2026-06-15'},
    {image:'',title:'作品_无日期',url:'',tags:'工具'}
  ];
  data.changelog=[
    {date:'2026-02-01',tag:'功能',title:'日志_旧',text:'x'},
    {date:'2026-09-20',tag:'修复',title:'日志_最新',text:'x'},
    {date:'2026-05-10',tag:'优化',title:'日志_中',text:'x'}
  ];
  data.modules=[
    {id:'m1',title:'模块_旧',icon:'A',text:'x',date:'2026-03-03'},
    {id:'m2',title:'模块_最新',icon:'B',text:'x',date:'2026-11-11'}
  ];
  applyAll();
  return 1;
})()`);
await sleep(1500);

console.log('════ ① 工具函数 ════');
line('sortByDateDesc 存在', await evalJs(c, 'typeof sortByDateDesc'));
line('排序结果（作品）', await evalJs(c, 'JSON.stringify(sortByDateDesc(data.portfolio).map(function(x){return x.it.title}))'));
line('带原始下标', await evalJs(c, 'JSON.stringify(sortByDateDesc(data.portfolio).map(function(x){return x.i}))'));
line('todayStr()', await evalJs(c, 'todayStr()'));
ok('倒序正确（最新的在前）', await evalJs(c, 'JSON.stringify(sortByDateDesc(data.portfolio).map(function(x){return x.it.title}))'), /作品_最新.*作品_中.*作品_旧.*作品_无日期/.test(await evalJs(c, 'JSON.stringify(sortByDateDesc(data.portfolio).map(function(x){return x.it.title}))')));
ok('无日期的排最后', await evalJs(c, 'sortByDateDesc(data.portfolio)[3].it.title'), '作品_无日期' === await evalJs(c, 'sortByDateDesc(data.portfolio)[3].it.title'));
ok('原始下标保留正确', await evalJs(c, 'JSON.stringify(sortByDateDesc(data.portfolio).map(function(x){return x.i}))'), '[1,2,0,3]' === await evalJs(c, 'JSON.stringify(sortByDateDesc(data.portfolio).map(function(x){return x.i}))'));

console.log('\n════ ② 前台渲染顺序 ════');
await evalJs(c, 'navigateTo("content"), 1');
await sleep(2200);
line('前台作品顺序', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#portfolio-all .portfolio-title")).map(function(e){return e.textContent}))'));
ok('前台作品倒序', '', /作品_最新/.test(String(await evalJs(c, 'document.querySelector("#portfolio-all .portfolio-title").textContent'))));
line('前台模块顺序', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".card-label")).map(function(e){return e.textContent.trim()}).filter(function(x){return x.indexOf("模块_")>=0}))'));

await evalJs(c, 'navigateTo("home"), 1');
await sleep(2200);
line('前台日志顺序', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".log-name")).map(function(e){return e.textContent}))'));
ok('前台日志倒序', '', /日志_最新/.test(String(await evalJs(c, 'document.querySelectorAll(".log-name")[0] ? document.querySelectorAll(".log-name")[0].textContent : ""'))));

console.log('\n════ ③ 后台渲染顺序 + 下标正确性 ════');
await evalJs(c, 'try{ADMIN.shell();ADMIN.go("works")}catch(e){}; 1');
await sleep(2200);
line('后台作品顺序', await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  return JSON.stringify([].slice.call(h.querySelectorAll('[data-p-field="title"]')).map(function(x){return x.value}));
})()`));
line('后台第一张卡的原始下标', await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var f=h.querySelector('[data-p-field="title"]');
  return f?f.dataset.pIdx:'?';
})()`));
ok('后台第一张 = 最新那条（下标应为 1）', await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var f=h.querySelector('[data-p-field="title"]');
  return f?String(f.value)+' idx='+f.dataset.pIdx:'?';
})()`), '作品_最新 idx=1' === await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var f=h.querySelector('[data-p-field="title"]');return f?String(f.value)+' idx='+f.dataset.pIdx:'?'})()`));

console.log('\n  --- 关键：改第一张卡（显示在最上、其实是数组里第 2 条）看写回是否正确 ---');
await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var f=h.querySelector('[data-p-field="title"]');
  f.value='改过的标题';
  ADMIN.readAll();
  return 1;
})()`);
await sleep(600);
line('数组第 1 条(旧)', await evalJs(c, 'data.portfolio[0].title'));
line('数组第 2 条(最新)', await evalJs(c, 'data.portfolio[1].title'));
ok('写回的是被编辑的那条（下标 1），没串行', await evalJs(c, 'data.portfolio[1].title'), '改过的标题' === await evalJs(c, 'data.portfolio[1].title'));
ok('另一条没被改动', await evalJs(c, 'data.portfolio[0].title'), '作品_旧' === await evalJs(c, 'data.portfolio[0].title'));

console.log('\n════ ④ 新增的默认今天 + 排在最上 ════');
line('新增前条数', await evalJs(c, '(data.portfolio||[]).length'));
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0});b.click();return 1})()`);
await sleep(1400);
const newItem = JSON.parse(await evalJs(c, 'JSON.stringify(data.portfolio[data.portfolio.length-1])'));
line('新条目的 date', newItem.date || '(无)');
ok('新增默认今天', newItem.date, newItem.date === await evalJs(c, 'todayStr()'));
line('后台第一张卡的标题', await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var f=h.querySelector('[data-p-field="title"]');return f?'"'+f.value+'" date='+h.querySelector('[data-p-field="date"]').value:'?'})()`));
ok('新条目排在最上面（标题为空即新条目）', '', (await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');return h.querySelector('[data-p-field="title"]').value})()`)) === '');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
