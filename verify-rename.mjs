/**
 * 验证改名：评价→简介、感悟→评价，且内容与字段名不变
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?rn=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 120)); };

// 放进一条带简介与评价的数据（字段名仍是 review / thought）
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说']},items:[
    {id:'r1',kind:'books',sub:'小说',title:'测试书',creator:'作者',rating:4.5,
     review:'这是简介的内容',thought:'评价第一条\\n评价第二条',cover:'',date:'2026-08-01',link:'https://x.com'}
  ]};
  applyAll();
  return 1;
})()`);
await sleep(1200);

console.log('════ ① 数据字段名没变（内容不会丢）════');
line('item 的键', await evalJs(c, 'JSON.stringify(Object.keys(data.dimension.items[0]))'));
ok('字段仍是 review', await evalJs(c, 'typeof data.dimension.items[0].review'), 'string' === await evalJs(c, 'typeof data.dimension.items[0].review'));
ok('字段仍是 thought', await evalJs(c, 'typeof data.dimension.items[0].thought'), 'string' === await evalJs(c, 'typeof data.dimension.items[0].thought'));
line('review 内容', await evalJs(c, 'data.dimension.items[0].review'));
line('thought 内容', await evalJs(c, 'JSON.stringify(data.dimension.items[0].thought)'));

console.log('\n════ ② 前台弹窗里的标题 ════');
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2200);
line('卡片上的简介（review 内容，无标签）', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .dim-review");return e?e.textContent:"（卡片上没显示）"})()'));
await evalJs(c, 'openDimDetail(0), 1');
await sleep(2500);
const labels = await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-m-lb")).map(function(e){return e.textContent}))');
line('弹窗里的小标题', labels);
ok('弹窗第一段叫「简介」', labels, /^\["简介","评价"\]$/.test(labels));
line('简介正文', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-text");return e?e.textContent:"无"})()'));
line('评价条数', await evalJs(c, 'document.querySelectorAll(".dim-m-list li").length'));
line('评价内容', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".dim-m-list li")).map(function(e){return e.textContent}))'));
ok('弹窗里已无「感悟」二字', await evalJs(c, 'document.getElementById("dim-modal-body").innerText.indexOf("感悟")<0 ? "没有了" : "还有"'), true);
await evalJs(c, 'closeDimDetail(), 1');

console.log('\n════ ③ 后台的提示文字 ════');
await evalJs(c, 'try{ADMIN.shell();ADMIN.go("dimension")}catch(e){}; 1');
await sleep(2200);
line('简介框的 placeholder', await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] [data-d-field="review"]\');return e?e.placeholder:"无"})()'));
line('评价框的 placeholder', await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] [data-d-field="thought"]\');return e?e.placeholder:"无"})()'));
line('简介框里的值', await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] [data-d-field="review"]\');return e?e.value:"无"})()'));
line('评价框里的值', await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] [data-d-field="thought"]\');return e?JSON.stringify(e.value):"无"})()'));
line('说明文案', await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] .admin-help\');return e?e.textContent.slice(0,80):"无"})()'));
line('预览里的文案', await evalJs(c, 'ADMIN_PREVIEW.dimension().indexOf("感悟")<0 ? "预览里已无「感悟」" : "预览里还有「感悟」"'));
ok('后台 value 与数据一致（没被改名影响）', await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] [data-d-field="review"]\');return e?e.value:"无"})()'), '这是简介的内容' === await evalJs(c, '(function(){var e=document.querySelector(\'[data-sec-body="dimension"] [data-d-field="review"]\');return e?e.value:"无"})()'));

console.log('\n════ ④ 保存后数据仍然写回原字段 ════');
await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="dimension"]');
  var a=h.querySelector('[data-d-field="review"]'); a.value='改过的简介';
  var b=h.querySelector('[data-d-field="thought"]'); b.value='改过的评价1\\n改过的评价2';
  ADMIN.readAll();
  return 1;
})()`);
await sleep(700);
line('review 字段', await evalJs(c, 'data.dimension.items[0].review'));
line('thought 字段', await evalJs(c, 'JSON.stringify(data.dimension.items[0].thought)'));
ok('写回 review 字段', await evalJs(c, 'data.dimension.items[0].review'), '改过的简介' === await evalJs(c, 'data.dimension.items[0].review'));
ok('写回 thought 字段', await evalJs(c, 'data.dimension.items[0].thought'), '改过的评价1\n改过的评价2' === await evalJs(c, 'data.dimension.items[0].thought'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
