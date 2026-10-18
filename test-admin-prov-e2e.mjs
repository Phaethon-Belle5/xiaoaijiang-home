/**
 * 实测：登录后台 → 打开「省份封面」→ 看能不能改
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
import { readFile } from 'node:fs/promises';

let PW = '';
for (const p of ['C:/Users/dell/Desktop/web/_repo/map-gallery-worker/.site_password',
                 'C:/Users/dell/Desktop/web/03-后端Worker/主站-worker/.site_password',
                 'B:/dell/Documents/harness/.site_password']) {
  try { PW = (await readFile(p, 'utf8')).trim(); if (PW) { console.log('密码来源: ' + p); break; } } catch (e) {}
}
if (!PW) { console.log('❌ 找不到密码'); process.exit(1); }

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
const failed = [];
const reqs = new Map();
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n').slice(0, 2).join(' / ').slice(0, 200)); }
    if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, m.params.request.method + ' ' + m.params.request.url);
    if (m.method === 'Network.responseReceived') { const u = m.params.response.url; if (/province/.test(u)) failed.push('[响应] ' + m.params.response.status + ' ' + u.slice(-40)); }
    if (m.method === 'Network.loadingFailed') failed.push('[失败] ' + m.params.errorText + ' ' + (reqs.get(m.params.requestId) || '').slice(-50));
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/admin.html?v=' + Date.now() });
await sleep(8000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 130));
line('页面标题', await evalJs(c, 'document.title'));
line('登录框在吗', await evalJs(c, 'document.getElementById("login") ? "在" : "无"'));

console.log('\n--- 登录 ---');
await evalJs(c, `(function(){
  var inp=document.querySelector('#login input[type=password]')||document.querySelector('#login input');
  if(!inp)return 0;
  inp.value=${JSON.stringify(PW)};
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  var b=[].slice.call(document.querySelectorAll('#login button')).find(function(x){return /进入|登录|确定/.test(x.textContent)});
  if(b)b.click(); else if(typeof doLogin==='function')doLogin();
  return 1;
})()`);
await sleep(5000);
line('是否已登录', await evalJs(c, 'document.getElementById("login").classList.contains("show") ? "登录框还在" : "已进入后台"'));
line('城市列表条数', await evalJs(c, 'document.querySelectorAll("#cityList .city-item").length'));
line('ALL_PHOTOS', await evalJs(c, 'typeof ALL_PHOTOS!=="undefined" ? (Array.isArray(ALL_PHOTOS)?ALL_PHOTOS.length+" 张":"非数组") : "未定义"'));

console.log('\n--- 打开「省份封面」---');
await evalJs(c, 'openProvinceCovers(), 1');
await sleep(5000);
line('弹层是否显示', await evalJs(c, 'document.getElementById("provModal").classList.contains("show")'));
line('省份行数', await evalJs(c, 'document.querySelectorAll("#provList .prov-row").length'));
line('省份列表', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#provList .prov-row")).map(function(r){return r.querySelector("b").textContent+"("+r.querySelector("small").textContent+")"}))'));
line('PROV_COVERS', await evalJs(c, 'JSON.stringify(PROV_COVERS)'));
line('PROV_CITIES 省份数', await evalJs(c, 'Object.keys(PROV_CITIES).length'));

console.log('\n--- 挑第一个省份，看选择器 ---');
await evalJs(c, `(function(){var b=document.querySelector('#provList .prov-row button');var p=b?b.getAttribute('onclick'):'';if(b)b.click();return 1})()`);
await sleep(3000);
line('选择器是否显示', await evalJs(c, 'getComputedStyle(document.getElementById("provPicker")).display'));
line('正在编辑的省份', await evalJs(c, 'provPicking'));
line('可用照片数', await evalJs(c, 'document.querySelectorAll("#provGrid .prov-pick").length'));
line('提示文字', await evalJs(c, '(document.getElementById("provPicker")||{}).innerText ? document.getElementById("provPicker").innerText.replace(/\\s+/g," ").slice(0,120) : ""'));

console.log('\n--- 试一次保存（用输入框里的地址）---');
await evalJs(c, `(function(){
  var i=document.getElementById('provUrlInput');
  i.value='https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/600/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
  saveProvinceCoverFromInput();
  return 1;
})()`);
await sleep(4000);
line('保存后 PROV_COVERS', await evalJs(c, 'JSON.stringify(PROV_COVERS)'));
line('toast 内容', await evalJs(c, '(document.getElementById("toastHost")||{}).innerText || "(无)"'));

console.log('\n--- 直接查接口，看是否真的存进去了 ---');
line('接口返回', await evalJs(c, `(async()=>{try{const r=await fetch('https://mapi.231060101.xyz/province-covers?cb='+Math.random(),{headers:{Authorization:'Bearer '+(sessionStorage.getItem('mapgallery-admin-token')||'')}});return (await r.text()).slice(0,300)}catch(e){return '❌ '+e.message}})()`));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n════ 网络（省份相关）════');
console.log(failed.length ? failed.slice(-10).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
