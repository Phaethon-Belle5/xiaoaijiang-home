/**
 * 验证省份封面弹窗完整交互（只读，不保存任何数据）
 *  ① 点按钮 → 弹窗真正显示（display=flex）
 *  ② 点 x → 弹窗关闭
 *  ③ 点某个省的「选封面」→ 选择器出现、候选照片加载
 *  ④ 点「收起」→ 选择器隐藏
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
import { readFile } from 'node:fs/promises';

let PW = '';
for (const p of ['C:/Users/dell/Desktop/web/_repo/map-gallery-worker/.site_password',
                 'C:/Users/dell/Desktop/web/03-后端Worker/主站-worker/.site_password']) {
  try { PW = (await readFile(p, 'utf8')).trim(); if (PW) break; } catch (e) {}
}

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/admin.html?v=' + Date.now() });
await sleep(8000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 120)); };

await evalJs(c, `(function(){
  var inp=document.querySelector('#login input[type=password]')||document.querySelector('#login input');
  if(inp){inp.value=${JSON.stringify(PW)};inp.dispatchEvent(new Event('input',{bubbles:true}));}
  var b=[].slice.call(document.querySelectorAll('#login button')).find(function(x){return /进入|登录|确定/.test(x.textContent)});
  if(b)b.click(); else if(typeof doLogin==='function')doLogin();
  return 1;
})()`);
await sleep(5000);

const clickBtn = async (selText) => {
  const g = JSON.parse(await evalJs(c, `(function(){
    var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.textContent.replace(/\\s+/g,'').indexOf(${JSON.stringify(selText)})>=0})[0];
    if(!b)return JSON.stringify({err:'没找到按钮'});
    b.scrollIntoView({block:'center',behavior:'instant'});
    var r=b.getBoundingClientRect();
    return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});
  })()`));
  if (g.err) return false;
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y, button: 'none' });
  await sleep(120);
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g.x, y: g.y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.x, y: g.y, button: 'left', clickCount: 1 });
  return true;
};

console.log('════ ① 点「📚 省份封面」════');
await clickBtn('省份封面');
await sleep(4000);
const d1 = await evalJs(c, 'getComputedStyle(document.getElementById("provModal")).display');
ok('弹窗真正显示', 'display=' + d1, d1 === 'flex');
line('弹窗尺寸', await evalJs(c, '(function(){var r=document.getElementById("provModal").getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
line('省份行数', await evalJs(c, 'document.querySelectorAll("#provList .prov-row").length'));
line('省份列表', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#provList .prov-row")).map(function(r){return r.querySelector("b").textContent}))'));

console.log('\n════ ③ 点某省的「选封面」════');
await clickBtn('选封面');
await sleep(3500);
const pv = await evalJs(c, 'getComputedStyle(document.getElementById("provPicker")).display');
ok('选择器出现', 'display=' + pv, pv !== 'none');
line('正在编辑的省份', await evalJs(c, 'provPicking'));
line('候选照片数', await evalJs(c, 'document.querySelectorAll("#provGrid .prov-pick").length'));
line('分节标题', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#provGrid .pk-sec")).map(function(e){return e.textContent}))'));
line('地址输入框占位', await evalJs(c, '(document.getElementById("provUrlInput")||{}).placeholder||""'));
await screenshot(c, 'B:/dell/Documents/harness/shots/admin-prov-open.png');
console.log('  截图: shots/admin-prov-open.png');

console.log('\n════ ④ 点「收起」════');
await clickBtn('收起');
await sleep(1500);
const pv2 = await evalJs(c, 'getComputedStyle(document.getElementById("provPicker")).display');
ok('选择器收起', 'display=' + pv2, pv2 === 'none');

console.log('\n════ ② 点 × 关闭弹窗 ════');
await evalJs(c, '(function(){var x=document.querySelector("#provModal .x");if(x)x.click();return 1})()');
await sleep(1500);
const d2 = await evalJs(c, 'getComputedStyle(document.getElementById("provModal")).display');
ok('弹窗已关闭', 'display=' + d2, d2 === 'none');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
