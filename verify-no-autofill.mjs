/**
 * 验证「新增后是空白条目、且在最上面、光标落在它上面」+「自动填充已关闭」
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?af=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(28) + ' = ' + v); };

console.log('════ ① 自动填充开关是否已关 ════');
await evalJs(c, `(function(){
  data.portfolio=[
    {image:'',title:'旧作品',url:'https://old.com',tags:'工具',date:'2026-08-01'},
    {image:'',title:'新作品',url:'https://new.com',tags:'工具',date:'2026-09-01'}
  ];
  ADMIN.shell();ADMIN.go('works');
  return 1;
})()`);
await sleep(2200);
const af = JSON.parse(await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var ins=[].slice.call(h.querySelectorAll('input,textarea'));
  return JSON.stringify({
    总数:ins.length,
    有autocomplete:ins.filter(function(x){return x.getAttribute('autocomplete')==='off'}).length,
    有唯一name:ins.filter(function(x){return x.name&&x.name.indexOf('adm-')===0}).length,
    name样例:ins.slice(0,2).map(function(x){return x.name}),
    名字是否互不相同:new Set(ins.map(function(x){return x.name})).size===ins.length
  });
})()`));
line('输入框总数', af.总数);
ok('全部 autocomplete=off', af.有autocomplete + ' / ' + af.总数, af.有autocomplete === af.总数);
ok('全部有唯一 name', af.有唯一name + ' / ' + af.总数, af.有唯一name === af.总数);
ok('name 互不相同（浏览器才会当成不同字段）', String(af.名字是否互不相同), af.名字是否互不相同 === true);
line('name 样例', JSON.stringify(af.name样例));

console.log('\n════ ② 点「添加作品」：新条目必须是空的、在最上面、光标在它上面 ════');
console.log('  先在第一条里打字（模拟你填过内容）…');
await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var f=h.querySelector('[data-p-field="title"]');
  f.value='我上次填的标题';
  f.dispatchEvent(new Event('input',{bubbles:true}));
  return 1;
})()`);
await sleep(500);

console.log('  点「+ 添加作品」…');
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0});b.click();return 1})()`);
await sleep(2200);

const after = JSON.parse(await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var titles=[].slice.call(h.querySelectorAll('[data-p-field="title"]'));
  var a=document.activeElement;
  return JSON.stringify({
    显示顺序:titles.map(function(x){return '"'+x.value+'"@'+x.dataset.pIdx}),
    第一张是空的:titles[0].value==='',
    焦点在第几张:(function(){var i=titles.indexOf(a);return i<0?('不在标题框（'+a.tagName+'）'):(i+1)})()
  });
})()`));
line('后台显示顺序', JSON.stringify(after.显示顺序));
ok('最新的一条（空白）在最上面', String(after.第一张是空的), after.第一张是空的 === true);
line('光标位置', after.焦点在第几张);
ok('光标落在最上面那张（新条目）', String(after.焦点在第几张), String(after.焦点在第几张) === '1');

line('data 里新条目', await evalJs(c, 'JSON.stringify(data.portfolio[data.portfolio.length-1])'));
ok('数据层新条目是空的', await evalJs(c, 'data.portfolio[data.portfolio.length-1].title'), (await evalJs(c, 'data.portfolio[data.portfolio.length-1].title')) === '');
ok('上一条保留了原有内容', await evalJs(c, 'data.portfolio.filter(function(x){return x.title==="旧作品"||x.title==="我上次填的标题"}).length'), (await evalJs(c, 'data.portfolio.filter(function(x){return x.title==="旧作品"||x.title==="我上次填的标题"}).length')) >= 1);

console.log('\n════ ③ 次元柜同样验证 ════');
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说']},items:[
    {id:'a',kind:'books',sub:'小说',title:'旧书',creator:'作者',rating:4,review:'',thought:'',cover:'',date:'2026-08-01',link:''}
  ]};
  ADMIN.go('dimension');
  return 1;
})()`);
await sleep(2000);
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');var f=h.querySelector('[data-d-field="title"]');f.value='上次填的书名';f.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
await sleep(500);
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0});b.click();return 1})()`);
await sleep(2200);
const dimAfter = JSON.parse(await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="dimension"]');
  var ins=[].slice.call(h.querySelectorAll('[data-d-field="title"]'));
  var a=document.activeElement;
  return JSON.stringify({顺序:ins.map(function(x){return '"'+x.value+'"@'+x.dataset.dIdx}),第一张空:ins[0].value==='',焦点第几张:(function(){var i=ins.indexOf(a);return i<0?'不在':(i+1)})()});
})()`));
line('次元柜显示顺序', JSON.stringify(dimAfter.顺序));
ok('次元柜：新条目空且在最上', String(dimAfter.第一张空), dimAfter.第一张空 === true);
ok('次元柜：光标在最上面那张', String(dimAfter.焦点第几张), String(dimAfter.焦点第几张) === '1');
ok('次元柜：全部关闭自动填充', await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');var ins=[].slice.call(h.querySelectorAll('input,textarea'));return ins.filter(function(x){return x.getAttribute('autocomplete')==='off'}).length+'/'+ins.length})()`), /^(\d+)\/\1$/.test(await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');var ins=[].slice.call(h.querySelectorAll('input,textarea'));return ins.filter(function(x){return x.getAttribute('autocomplete')==='off'}).length+'/'+ins.length})()`)));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
