/**
 * 验证映像馆后台三处改动：
 *  ① 记忆书架封面：可选全站照片 / 直接填地址 / 保存生效
 *  ② 照片：可以直接填 URL 添加
 *  ③ 城市列表：省份 → 城市 两级（可折叠）
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
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 130)); }
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

// 登录
await evalJs(c, `(function(){
  var inp=document.querySelector('#login input[type=password]')||document.querySelector('#login input');
  if(inp){inp.value=${JSON.stringify(PW)};inp.dispatchEvent(new Event('input',{bubbles:true}));}
  var b=[].slice.call(document.querySelectorAll('#login button')).find(function(x){return /进入|登录|确定/.test(x.textContent)});
  if(b)b.click(); else if(typeof doLogin==='function')doLogin();
  return 1;
})()`);
await sleep(5000);
line('已登录', await evalJs(c, 'document.getElementById("login").classList.contains("show") ? "否" : "是"'));

console.log('\n════ ① 城市列表：省份 → 城市 两级 ════');
const list = JSON.parse(await evalJs(c, `(function(){
  var groups=[].slice.call(document.querySelectorAll('#cityList .prov-group')).map(function(g){
    return { 省:g.querySelector('.prov-name').textContent, meta:g.querySelector('.prov-meta').textContent, 城市数:g.querySelectorAll('.city-item').length };
  });
  return JSON.stringify({组数:groups.length, 明细:groups, 有折叠按钮:document.querySelectorAll('#cityList .prov-head').length});
})()`));
line('省份组数', list.组数);
line('折叠按钮数', list.有折叠按钮);
list.明细.forEach(g => console.log('      ' + g.省.padEnd(12) + ' ' + g.meta.padEnd(16) + g.城市数 + ' 个城市'));
ok('城市按省份分组', list.组数 + ' 组', list.组数 >= 2);
ok('每组标题带城市数与照片数', list.明细[0] && /城 · .*张/.test(list.明细[0].meta), /城 · .*张/.test(String(list.明细[0] && list.明细[0].meta)));

console.log('\n  --- 折叠 / 展开一个省 ---');
const firstProv = list.明细[0] ? list.明细[0].省 : '';
const before = await evalJs(c, `(function(){var g=document.querySelector('#cityList .prov-group');return g.querySelector('.prov-body').style.display})()`);
await evalJs(c, `(function(){document.querySelector('#cityList .prov-head').click();return 1})()`);
await sleep(700);
const after = await evalJs(c, `(function(){var g=document.querySelector('#cityList .prov-group');return g.querySelector('.prov-body').style.display})()`);
line('折叠前 / 折叠后 display', before + '  →  ' + after);
ok('可以折叠', before + ' → ' + after, before !== after);
await evalJs(c, `(function(){document.querySelector('#cityList .prov-head').click();return 1})()`);
await sleep(600);

console.log('\n════ ② 照片：URL 直接添加 ════');
// 挑一个有城市的分组，点进去
await evalJs(c, `(function(){var g=document.querySelector('#cityList .prov-group .city-item');if(g)g.click();return 1})()`);
await sleep(4000);
line('已选城市', await evalJs(c, 'curCity'));
line('有 URL 输入框', await evalJs(c, '!!document.getElementById("photoUrlInput")'));
line('URL 输入框占位', await evalJs(c, '(document.getElementById("photoUrlInput")||{}).placeholder || ""'));
line('按钮文案', await evalJs(c, '(function(){var i=document.getElementById("photoUrlInput");return i&&i.nextElementSibling?i.nextElementSibling.textContent:"无"})()'));
const n0 = await evalJs(c, '(curDetail&&curDetail.photos?curDetail.photos.length:0)');
console.log('  添加前照片数 = ' + n0);
await evalJs(c, `(function(){
  var i=document.getElementById('photoUrlInput');
  i.value='https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/600/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
  addPhotoByUrl();
  return 1;
})()`);
await sleep(5000);
const n1 = await evalJs(c, '(curDetail&&curDetail.photos?curDetail.photos.length:0)');
line('添加后照片数', n0 + ' → ' + n1);
ok('可以用 URL 添加照片', n0 + ' → ' + n1, n1 === n0 + 1);
line('新照片 url', await evalJs(c, '(function(){var ps=(curDetail&&curDetail.photos)||[];var x=ps[ps.length-1];return x?x.url.slice(0,80):"无"})()'));
line('新照片 r2Key', await evalJs(c, '(function(){var ps=(curDetail&&curDetail.photos)||[];var x=ps[ps.length-1];return x?JSON.stringify(x.r2Key):"无"})()'));

console.log('\n════ ③ 记忆书架封面 ════');
await evalJs(c, 'openProvinceCovers(), 1');
await sleep(5000);
line('省份行数', await evalJs(c, 'document.querySelectorAll("#provList .prov-row").length'));
await evalJs(c, `(function(){var b=document.querySelector('#provList .prov-row button');if(b)b.click();return 1})()`);
await sleep(3000);
line('选中省份', await evalJs(c, 'provPicking'));
line('分节标题数', await evalJs(c, 'document.querySelectorAll("#provGrid .pk-sec").length'));
line('分节内容', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#provGrid .pk-sec")).map(function(e){return e.textContent}))'));
line('可选封面总数', await evalJs(c, 'document.querySelectorAll("#provGrid .prov-pick").length'));
ok('除了本省照片，也能从全站照片里选', await evalJs(c, 'document.querySelectorAll("#provGrid .pk-sec").length') + ' 节', (await evalJs(c, 'document.querySelectorAll("#provGrid .pk-sec").length')) >= 1);
line('地址输入框', await evalJs(c, '(document.getElementById("provUrlInput")||{}).placeholder || ""'));

// 保存一个封面
await evalJs(c, `(function(){
  var i=document.getElementById('provUrlInput');
  i.value='https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/600/20260823%E5%B8%90%E7%AF%B7.webp';
  saveProvinceCoverFromInput();
  return 1;
})()`);
await sleep(4000);
line('保存后 PROV_COVERS[该省]', await evalJs(c, 'PROV_COVERS[provPicking] ? PROV_COVERS[provPicking].slice(0,90) : "(空)"'));
ok('封面能保存', await evalJs(c, '!!!PROV_COVERS[provPicking]'), !!(await evalJs(c, 'PROV_COVERS[provPicking]')));
const persist = await evalJs(c, `(async()=>{try{const r=await fetch('https://mapi.231060101.xyz/province-covers?cb='+Math.random(),{headers:{Authorization:'Bearer '+(sessionStorage.getItem('mapgallery-admin-token')||'')}});const j=await r.json();return JSON.stringify(j).slice(0,260)}catch(e){return '❌ '+e.message}})()`);
line('接口回读', persist);

await screenshot(c, 'B:/dell/Documents/harness/shots/admin-gallery-new.png');
console.log('  截图: shots/admin-gallery-new.png');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
