/**
 * 真实点击「📚 省份封面」按钮，看有没有反应
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
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n').slice(0, 2).join(' / ').slice(0, 180)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/admin.html?v=' + Date.now() });
await sleep(8000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 140));

await evalJs(c, `(function(){
  var inp=document.querySelector('#login input[type=password]')||document.querySelector('#login input');
  if(inp){inp.value=${JSON.stringify(PW)};inp.dispatchEvent(new Event('input',{bubbles:true}));}
  var b=[].slice.call(document.querySelectorAll('#login button')).find(function(x){return /进入|登录|确定/.test(x.textContent)});
  if(b)b.click(); else if(typeof doLogin==='function')doLogin();
  return 1;
})()`);
await sleep(5000);
line('已登录', await evalJs(c, 'document.getElementById("login").classList.contains("show") ? "否" : "是"'));

console.log('\n════ 找「省份封面」按钮 ════');
const btn = JSON.parse(await evalJs(c, `(function(){
  var all=[].slice.call(document.querySelectorAll('button'));
  var hit=all.filter(function(b){return b.textContent.indexOf('省份封面')>=0});
  if(!hit.length)return JSON.stringify({数量:0, 所有按钮:all.map(function(b){return b.textContent.trim().slice(0,14)}).slice(0,40)});
  var b=hit[0];var r=b.getBoundingClientRect();var st=getComputedStyle(b);
  return JSON.stringify({数量:hit.length, 文本:b.textContent.trim(), onclick:b.getAttribute('onclick'),
    尺寸:Math.round(r.width)+'x'+Math.round(r.height), 位置:Math.round(r.left)+','+Math.round(r.top),
    可见:st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0,
    在视口内:(r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth),
    命中元素:(function(){var e=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));return e?(e.tagName+'.'+String(e.className).split(' ')[0]):'null'})(),
    父容器:b.parentElement?(b.parentElement.className||b.parentElement.tagName):'?'});
})()`));
console.log('  ' + JSON.stringify(btn));

console.log('\n════ 点它（真实鼠标）════');
if (btn.数量) {
  const g = JSON.parse(await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.textContent.indexOf('省份封面')>=0})[0];var r=b.getBoundingClientRect();b.scrollIntoView({block:'center',behavior:'instant'});r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()`));
  console.log('  点击坐标: ' + g.x + ',' + g.y);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y, button: 'none' });
  await sleep(150);
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g.x, y: g.y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.x, y: g.y, button: 'left', clickCount: 1 });
  await sleep(4000);
  line('modal 有 show 类', await evalJs(c, 'document.getElementById("provModal").classList.contains("show")'));
  line('modal 的 display', await evalJs(c, 'getComputedStyle(document.getElementById("provModal")).display'));
  line('modal 尺寸', await evalJs(c, '(function(){var r=document.getElementById("provModal").getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
  line('省份行数', await evalJs(c, 'document.querySelectorAll("#provList .prov-row").length'));
  line('provList 内容开头', await evalJs(c, '(document.getElementById("provList").innerText||"").replace(/\\s+/g," ").slice(0,100)'));
} else {
  console.log('  按钮不存在！线上所有按钮: ' + JSON.stringify(btn.所有按钮));
}

console.log('\n════ 也试试直接调函数 ════');
line('openProvinceCovers 类型', await evalJs(c, 'typeof openProvinceCovers'));
line('直接调后 modal.show', await evalJs(c, 'try{openProvinceCovers();"已调用"}catch(e){"❌ "+e.message}'));
await sleep(3000);
line('  调后 show 类', await evalJs(c, 'document.getElementById("provModal").classList.contains("show")'));
line('  调后 display', await evalJs(c, 'getComputedStyle(document.getElementById("provModal")).display'));
line('  调后行数', await evalJs(c, 'document.querySelectorAll("#provList .prov-row").length'));
line('  页面里「省份封面」按钮总数', await evalJs(c, '[].slice.call(document.querySelectorAll("button")).filter(function(x){return x.textContent.indexOf("省份封面")>=0}).length'));

await screenshot(c, 'B:/dell/Documents/harness/shots/admin-prov-click.png');
console.log('  截图: shots/admin-prov-click.png');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
