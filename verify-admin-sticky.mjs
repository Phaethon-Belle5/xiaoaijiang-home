/**
 * 验证「不用再划到底才能点添加」：
 *  ① 每个长列表分区顶部都有吸顶工具条（添加按钮 + 筛选框）
 *  ② 往下滚动后，添加按钮仍然在可视区域内（position:sticky 生效）
 *  ③ 筛选框能即时过滤条目
 *  ④ 点击吸顶的添加按钮能真的新增
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

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
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?sticky=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(28) + ' = ' + v); };

// 造足够多的条目，才能滚起来
await evalJs(c, `(function(){
  data.portfolio=Array.from({length:25},function(_,i){return {image:'',title:'作品'+i,url:'',tags:i%3===0?'工具':'我的项目',desc:'说明'+i};});
  data.memos=Array.from({length:25},function(_,i){return {id:'m'+i,text:'说说内容'+i,date:'2026-0'+((i%9)+1)+'-01',tags:i%2?'折腾':'建站'};});
  applyAll();
  return 1;
})()`);
await sleep(1500);

console.log('════ 打开面板各分区，检查吸顶条 ════');
const SECTIONS = [['works', '作品', '添加作品'], ['memos', '说说', '新增说说'], ['dimension', '次元柜', '添加一条'], ['changelog', '更新日志', '添加更新记录'], ['content', '功能模块', '添加模块']];
for (const [sec, label, btnText] of SECTIONS) {
  await evalJs(c, `try{ADMIN.shell();ADMIN.go("${sec}")}catch(e){}; 1`);
  await sleep(1600);
  const info = JSON.parse(await evalJs(c, `(function(){
    var host=document.querySelector('[data-sec-body="${sec}"]');
    if(!host)return JSON.stringify({err:'没有该分区'});
    var bar=host.querySelector('.admin-sticky');
    if(!bar)return JSON.stringify({err:'没有吸顶条'});
    var btn=[].slice.call(bar.querySelectorAll('button')).find(function(b){return b.textContent.indexOf('添加')>=0||b.textContent.indexOf('新增')>=0});
    var st=getComputedStyle(bar);
    return JSON.stringify({
      sticky:st.position, top:st.top,
      btn:btn?btn.textContent.trim():'(无)',
      filter:!!bar.querySelector('.admin-filter'),
      count:(bar.querySelector('.admin-sticky-count')||{}).textContent||'',
      cards:host.querySelectorAll('.admin-card').length
    });
  })()`));
  if (info.err) { ok(label, info.err, false); continue; }
  ok(label + ' 吸顶条', 'position=' + info.sticky + '  按钮=' + info.btn + '  筛选框=' + (info.filter ? '有' : '无') + '  ' + info.count,
     info.sticky === 'sticky' && info.filter === true && typeof info.cards === 'number');
}

console.log('\n════ 关键：滚到最底后，添加按钮还在视野里吗 ════');
await evalJs(c, 'try{ADMIN.go("works")}catch(e){}; 1');
await sleep(1800);
const beforeScroll = JSON.parse(await evalJs(c, `(function(){
  var host=document.querySelector('[data-sec-body="works"]');
  var bar=host.querySelector('.admin-sticky');
  var btn=[].slice.call(bar.querySelectorAll('button')).find(function(b){return b.textContent.indexOf('添加')>=0});
  var r=btn.getBoundingClientRect();
  return JSON.stringify({top:Math.round(r.top), visible:(r.top>=0&&r.bottom<=innerHeight)});
})()`));
line('滚动前 按钮位置', 'top=' + beforeScroll.top + '  可见=' + beforeScroll.visible);

// 把分区内容滚到底
await evalJs(c, `(function(){
  var body=document.getElementById('admin-body');
  var host=document.querySelector('[data-sec-body="works"]');
  if(body)body.scrollTop=host.offsetTop+host.offsetHeight;
  return 1;
})()`);
await sleep(1500);
const afterScroll = JSON.parse(await evalJs(c, `(function(){
  var host=document.querySelector('[data-sec-body="works"]');
  var bar=host.querySelector('.admin-sticky');
  var btn=[].slice.call(bar.querySelectorAll('button')).find(function(b){return b.textContent.indexOf('添加')>=0});
  var r=btn.getBoundingClientRect();
  var body=document.getElementById('admin-body');
  return JSON.stringify({top:Math.round(r.top), visible:(r.top>=0&&r.bottom<=innerHeight), scrollTop:Math.round(body?body.scrollTop:0)});
})()`));
line('滚到底后 按钮位置', 'top=' + afterScroll.top + '  可见=' + afterScroll.visible + '  （已滚动 ' + afterScroll.scrollTop + 'px）');
ok('滚到最底后添加按钮仍可见', String(afterScroll.visible), afterScroll.visible === true);
ok('确实滚动了一段距离', afterScroll.scrollTop + 'px', afterScroll.scrollTop > 200);

await screenshot(c, 'B:/dell/Documents/harness/shots/admin-sticky-scrolled.png');
console.log('  截图: shots/admin-sticky-scrolled.png');

console.log('\n════ 筛选框是否即时过滤 ════');
const before = await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');return [].slice.call(h.querySelectorAll('.admin-card')).filter(function(x){return !x.hidden}).length})()`);
await evalJs(c, `(function(){
  var h=document.querySelector('[data-sec-body="works"]');
  var f=h.querySelector('.admin-filter');
  f.value='作品7';
  f.dispatchEvent(new Event('input',{bubbles:true}));
  return 1;
})()`);
await sleep(900);
const after = await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');return [].slice.call(h.querySelectorAll('.admin-card')).filter(function(x){return !x.hidden}).length})()`);
line('筛选前可见', before + ' 条');
line('输入「作品7」后可见', after + ' 条');
line('计数文字', await evalJs(c, 'document.querySelector(\'[data-sec-body="works"] .admin-sticky-count\').textContent'));
ok('筛选生效', before + ' → ' + after, after < before && after > 0);

// 清空筛选
await evalJs(c, `(function(){var f=document.querySelector('[data-sec-body="works"] .admin-filter');f.value='';f.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`);
await sleep(700);
line('清空后可见', await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');return [].slice.call(h.querySelectorAll('.admin-card')).filter(function(x){return !x.hidden}).length})()`) + ' 条');

console.log('\n════ 点吸顶的添加按钮 ════');
const n0 = await evalJs(c, '(data.portfolio||[]).length');
await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="works"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0});b.click();return 1})()`);
await sleep(1200);
const n1 = await evalJs(c, '(data.portfolio||[]).length');
line('条目数', n0 + ' → ' + n1);
ok('吸顶按钮能新增', n0 + ' → ' + n1, n1 === n0 + 1);
line('焦点元素', await evalJs(c, '(function(){var a=document.activeElement;return a?(a.tagName+" 值=\\""+(a.value||"").slice(0,10)+"\\""):"无"})()'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
