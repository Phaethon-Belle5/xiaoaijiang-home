/**
 * 复现「新增后自动填入上一条的内容」
 * 模拟用户真实操作：在已有条目里打字 → 点添加 → 看新条目和旧条目分别变成什么
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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?dup=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));

const dumpPortfolio = async (tag) => {
  console.log('\n  --- ' + tag + ' ---');
  line('data.portfolio', await evalJs(c, 'JSON.stringify((data.portfolio||[]).map(function(x){return {t:x.title,d:x.date,url:x.url}}))'));
  line('后台显示顺序', await evalJs(c, `(function(){
    var h=document.querySelector('[data-sec-body="works"]');if(!h)return '(面板未开)';
    return JSON.stringify([].slice.call(h.querySelectorAll('[data-p-field="title"]')).map(function(x){return x.value+'@'+x.dataset.pIdx}));
  })()`));
};

console.log('════ 复现：作品 ════');
await evalJs(c, `(function(){
  data.portfolio=[{image:'',title:'原有作品A',url:'https://a.com',tags:'工具',date:'2026-08-01'}];
  applyAll();
  return 1;
})()`);
await sleep(800);
await evalJs(c, 'try{ADMIN.shell();ADMIN.go("works")}catch(e){}; 1');
await sleep(2000);
await dumpPortfolio('初始状态');

console.log('\n  --- 模拟：在第一张卡里打字（还没保存）---');
await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var f=h.querySelector('[data-p-field="title"]');
  f.value='我改过的标题';
  f.dispatchEvent(new Event('input',{bubbles:true}));
  var u=h.querySelector('[data-p-field="url"]');
  if(u){u.value='https://changed.com';u.dispatchEvent(new Event('input',{bubbles:true}));}
  return 1;
})()`);
await sleep(600);
await dumpPortfolio('打字后（未保存）');

console.log('\n  --- 点「添加作品」---');
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0});b.click();return 1})()`);
await sleep(1600);
await dumpPortfolio('点添加之后');

console.log('\n  ⚠ 看新条目是不是"空的"');
line('新条目（数组末尾）', await evalJs(c, 'JSON.stringify(data.portfolio[data.portfolio.length-1])'));
line('最上面那张卡的标题', await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var f=h.querySelector('[data-p-field="title"]');return f?('"'+f.value+'" idx='+f.dataset.pIdx):'?'})()`));
line('焦点在', await focusInfo());

console.log('\n════ 复现：次元柜 ════');
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说'],films:[],games:[]},items:[
    {id:'x1',kind:'books',sub:'小说',title:'原有书A',creator:'作者甲',rating:4,review:'评价A',thought:'',cover:'',date:'2026-08-01',link:''}
  ]};
  ADMIN.shell();ADMIN.go('dimension');
  return 1;
})()`);
await sleep(2000);
line('初始 data', await evalJs(c, 'JSON.stringify(dimKit().items.map(function(x){return {t:x.title,c:x.creator}}))'));
line('初始界面', await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');return JSON.stringify([].slice.call(h.querySelectorAll('[data-d-field="title"]')).map(function(x){return x.value+'@'+x.dataset.dIdx}))})()`));

console.log('\n  --- 在标题里打字 ---');
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');var f=h.querySelector('[data-d-field="title"]');f.value='我改过的书名';f.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
await sleep(600);

console.log('\n  --- 点「+ 添加一条」---');
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0});b.click();return 1})()`);
await sleep(1600);
line('之后 data', await evalJs(c, 'JSON.stringify(dimKit().items.map(function(x){return {t:x.title,c:x.creator}}))'));
line('之后界面', await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="dimension"]');return JSON.stringify([].slice.call(h.querySelectorAll('[data-d-field="title"]')).map(function(x){return x.value+'@'+x.dataset.dIdx}))})()`));
line('新条目（数组末尾）', await evalJs(c, 'JSON.stringify(dimKit().items[dimKit().items.length-1])'));
line('焦点在', await focusInfo());

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
