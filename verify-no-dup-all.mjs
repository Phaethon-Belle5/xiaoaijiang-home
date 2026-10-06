// 确认说说 / 更新日志 / 功能模块 也没有"新条目被填上旧内容"
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 100)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?all=' + Date.now() });
await sleep(21000);
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 110)); };

// 通用检查：在第一条打字 → 点添加 → 看新条目是否为空、在最上、光标在其上
async function check(sec, field, inputSel, addBtnText, listExpr, scrollExpr) {
  console.log('\n════ ' + sec + ' ════');
  const typed = '我填过的内容_' + sec;
  await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="${sec}"]');var f=h.querySelector('${inputSel}');if(f){f.value=${JSON.stringify(typed)};f.dispatchEvent(new Event('input',{bubbles:true}));}return 1})()`);
  await sleep(500);
  await evalJs(c, `(function(){var h=document.querySelector('[data-sec-body="${sec}"]');var b=[].slice.call(h.querySelectorAll('.admin-sticky button')).find(function(x){return x.textContent.indexOf('添加')>=0||x.textContent.indexOf('新增')>=0});if(b)b.click();return 1})()`);
  await sleep(2200);
  const r = JSON.parse(await evalJs(c, `(function(){
    var h=document.querySelector('[data-sec-body="${sec}"]');
    var ins=[].slice.call(h.querySelectorAll('${inputSel}'));
    var a=document.activeElement;
    // 说说用 .memo-item，其它用 .admin-card
    var cards=[].slice.call(h.querySelectorAll('.admin-card'));
    if(!cards.length)cards=[].slice.call(h.querySelectorAll('.memo-item'));
    var firstCard=cards[0];
    return JSON.stringify({
      第一条值: ins.length?ins[0].value:'(无)',
      条数: ins.length,
      第一条为空: ins.length?ins[0].value==='':false,
      光标在第几条: (function(){var i=ins.indexOf(a);return i<0?'不在输入框':(i+1)})(),
      光标是否在新条目内: !!(firstCard&&a&&firstCard.contains(a)),
      光标元素: a?a.tagName:'无'
    });
  })()`));
  ok('新条目是空的（没被填上旧内容）', '"' + r.第一条值 + '"', r.第一条为空 === true);
  ok('光标落在最上面那张卡里', r.光标是否在新条目内 + '（' + r.光标元素 + '）', r.光标是否在新条目内 === true);
}

// 说说：先放两条数据
await evalJs(c, `(function(){
  data.memos=[{id:'p1',text:'旧说说内容',date:'2026-08-01',tags:'建站'},{id:'p2',text:'第二条',date:'2026-09-01',tags:'折腾'}];
  ADMIN.shell();ADMIN.go('memos');
  return 1;
})()`);
await sleep(2200);
await check('memos', 'text', '.memo-fields input, .memo-fields textarea', '新增', '', '');
console.log('  data.memos 前两条 = ' + await evalJs(c, 'JSON.stringify(data.memos.slice(0,2).map(function(x){return x.text}))'));

// 更新日志
await evalJs(c, `(function(){
  data.changelog=[{date:'2026-08-01',tag:'功能',title:'旧日志',text:'x'},{date:'2026-09-01',tag:'修复',title:'第二条',text:'y'}];
  ADMIN.go('changelog');
  return 1;
})()`);
await sleep(2200);
await check('changelog', 'title', '[data-l-field="title"]', '添加', '', '');
console.log('  data.changelog 前两条 = ' + await evalJs(c, 'JSON.stringify(data.changelog.slice(0,2).map(function(x){return x.title}))'));

// 功能模块
await evalJs(c, `(function(){
  data.modules=[{id:'m1',title:'旧模块',icon:'A',text:'x',date:'2026-08-01'}];
  ADMIN.go('content');
  return 1;
})()`);
await sleep(2200);
await check('content', 'title', '[data-m-field="title"]', '添加', '', '');
console.log('  data.modules 前两条 = ' + await evalJs(c, 'JSON.stringify(data.modules.slice(0,2).map(function(x){return x.title}))'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
