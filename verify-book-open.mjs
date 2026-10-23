/**
 * 验收：① 封面只有图片 ② 点击书本 → 书翻开成两页（不弹模态框）
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

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
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?bk=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(28) + ' = ' + String(v).slice(0, 120)); };

await evalJs(c, `(function(){
  var CV='https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
  var T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4.5,
      review:'这是《'+t+'》的简介正文，用来检查翻开后的右页排版是否正常显示。',
      thought:'评价一\\n评价二\\n评价三',cover:CV,date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3500);

console.log('════ ① 封面只有图片 ════');
line('封面里的文字', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  return cv?('"'+cv.innerText.replace(/\\s+/g,'')+'"'):'无';
})()`));
line('封面里还剩哪些元素', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  if(!cv)return '无';
  return JSON.stringify([].slice.call(cv.children).map(function(e){return e.className||e.tagName}));
})()`));
ok('封面上没有任何文字', '', (await evalJs(c, `(function(){var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');return cv?cv.innerText.replace(/\\s+/g,''):'x'})()`)) === '');
line('封面 padding', await evalJs(c, 'getComputedStyle(document.querySelector("#dim-grid .memory-book.active .memory-book-cover")).padding'));
line('照片框 vs 封面框', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  var ph=cv.querySelector('.memory-book-photo');
  if(!ph)return '无照片层';
  var a=cv.getBoundingClientRect(), b=ph.getBoundingClientRect();
  return '封面 '+Math.round(a.width)+'x'+Math.round(a.height)+' / 照片 '+Math.round(b.width)+'x'+Math.round(b.height);
})()`));
ok('照片铺满整本书（无文字遮挡）', '', await evalJs(c, `(function(){
  var cv=document.querySelector('#dim-grid .memory-book.active .memory-book-cover');
  var ph=cv.querySelector('.memory-book-photo');
  if(!ph)return false;
  var a=cv.getBoundingClientRect(), b=ph.getBoundingClientRect();
  return Math.abs(a.width-b.width)<2&&Math.abs(a.height-b.height)<2;
})()`) === true);
await screenshot(c, 'B:/dell/Documents/harness/shots/real-cover-only.png');

console.log('\n════ ② 点击 → 书翻开 ════');
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[1].click();return 1})()`);
await sleep(900);
line('第一次点击后 active 索引', await evalJs(c, `(function(){var a=[].slice.call(document.querySelectorAll('#dim-grid .memory-book'));return String(a.findIndex(function(b){return b.classList.contains('active')}))})()`));
ok('第一次点击只选中', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length')) === 0);

await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[1].click();return 1})()`);
await sleep(300);
line('点击后 opening 数量', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length'));
line('viewport 是否进入 opening', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("opening")'));
ok('书翻开了（.opening）', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length')) === 1);
await sleep(3200);
line('是否弹了模态框', await evalJs(c, '!!document.querySelector("#dim-modal.show")'));
ok('没有弹模态框（书自己翻开）', '', (await evalJs(c, '!!document.querySelector("#dim-modal.show")')) === false);
line('左页（封内）标题', await evalJs(c, `(function(){var s=document.querySelector('#dim-grid .memory-book.opening .memory-book-opening-summary');return s?s.innerText.replace(/\\s+/g,'|').slice(0,70):'无'})()`));
line('右页（简介）正文', await evalJs(c, `(function(){var t=document.querySelector('#dim-grid .memory-book.opening .dim-page-text');return t?t.textContent.slice(0,40):'无'})()`));
line('右页评价条数', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening .dim-page-list span").length'));
ok('翻开后能读到简介', '', (await evalJs(c, `(function(){var t=document.querySelector('#dim-grid .memory-book.opening .dim-page-text');return !!(t&&t.textContent.length>5)})()`)) === true);
ok('翻开后能读到评价', '', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening .dim-page-list span").length')) >= 1);
await screenshot(c, 'B:/dell/Documents/harness/shots/real-book-open.png');
console.log('  截图: shots/real-book-open.png');

console.log('\n  --- 再点一次 → 合上 ---');
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book.opening')[0].click();return 1})()`);
await sleep(900);
ok('再点合上', await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length') + ' 个 opening', (await evalJs(c, 'document.querySelectorAll("#dim-grid .memory-book.opening").length')) === 0);
ok('viewport 的 opening 也移除', await evalJs(c, 'document.getElementById("dim-grid").classList.contains("opening")'), (await evalJs(c, 'document.getElementById("dim-grid").classList.contains("opening")')) === false);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
