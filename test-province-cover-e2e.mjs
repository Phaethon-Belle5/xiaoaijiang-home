// 端到端：管理端登录 → 省份封面 → 选一张 → 前台书架显示该封面
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
import { readFile } from 'node:fs/promises';

let PW = '';
for (const p of ['C:/Users/dell/Desktop/web/_repo/map-gallery-worker/.site_password', 'C:/Users/dell/Desktop/web/03-后端Worker/主站-worker/.site_password']) {
  try { PW = (await readFile(p, 'utf8')).trim(); if (PW) break; } catch (e) {}
}
console.log('密码来源: ' + (PW ? '已读取' : '没找到'));

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/admin.html?t=' + Date.now() });
await sleep(8000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 170));

console.log('════ 管理端 ════');
line('登录界面在', await evalJs(c, `document.getElementById('login').classList.contains('show')||getComputedStyle(document.getElementById('login')).display!=='none'`));
line('省份封面按钮', await evalJs(c, `!!document.querySelector('button[onclick*="openProvinceCovers"]')`));

// 登录
await evalJs(c, `(function(){document.getElementById('pw').value=${JSON.stringify(PW)};return 1})()`);
await evalJs(c, 'doLogin(); 1');
await sleep(5000);
line('已进入后台', await evalJs(c, `document.getElementById('app').classList.contains('show')||getComputedStyle(document.getElementById('app')).display!=='none'`));
line('城市数', await evalJs(c, 'CITIES.length'));

console.log('\n════ 打开省份封面 ════');
await evalJs(c, 'openProvinceCovers(); 1');
await sleep(4000);
line('弹窗打开', await evalJs(c, `document.getElementById('provModal').classList.contains('show')||getComputedStyle(document.getElementById('provModal')).display!=='none'`));
line('省份行数', await evalJs(c, 'document.querySelectorAll(".prov-row").length'));
line('省份列表', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.prov-info b')).slice(0,6).map(function(e){return e.textContent}))`));
line('缩略图有图', await evalJs(c, `[].slice.call(document.querySelectorAll('.prov-thumb img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.prov-thumb img').length`));

console.log('\n════ 挑第一张当封面 ════');
await evalJs(c, `(function(){var b=document.querySelector('.prov-row button');if(b)b.click();return 1})()`);
await sleep(2500);
line('选图区打开', await evalJs(c, `getComputedStyle(document.getElementById('provPicker')).display!=='none'`));
line('正在选:', await evalJs(c, 'provPicking'));
line('可选照片数', await evalJs(c, 'document.querySelectorAll(".prov-pick").length'));
const picked = await evalJs(c, `(function(){var b=document.querySelector('.prov-pick');if(!b)return '';var u=b.querySelector('img').src;b.click();return u})()`);
line('点了这张', String(picked).slice(-46));
await sleep(4000);
line('保存已生效（本地）', await evalJs(c, `PROV_COVERS[provPicking]===${JSON.stringify(picked)}`));

console.log('\n════ 前台书架是否用上了这个封面 ════');
const t2 = await openTab('about:blank');
const c2 = await connect(t2.ws);
await c2.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c2.send('Network.enable');
await c2.send('Network.setCacheDisabled', { cacheDisabled: true });
await c2.send('Storage.clearDataForOrigin', { origin: 'https://map.231060101.xyz', storageTypes: 'all' }).catch(() => {});
await c2.send('Page.navigate', { url: 'https://map.231060101.xyz/?cover=' + Date.now() });
await sleep(24000);
const l2 = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 170));
l2('接口返回的封面数', await evalJs(c2, `JSON.stringify(Object.keys(PROV_COVERS||{}).length?Object.keys(PROV_COVERS):[])`));
await evalJs(c2, `(function(){var b=document.querySelector('.ml-btn[data-mem="shelf"]');if(b)b.click();return 1})()`);
await sleep(4000);
l2('书架书数', await evalJs(c2, 'document.querySelectorAll(".shelf-book").length'));
l2('封面图 URL 末段', await evalJs(c2, `(function(){var i=document.querySelector('.sb-bottom img');return i?i.src.slice(-40):'无'})()`));
l2('封面图是否加载', await evalJs(c2, `[].slice.call(document.querySelectorAll('.sb-bottom img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.sb-bottom img').length`));

await screenshot(c2, 'B:/dell/Documents/harness/shots/gallery-prov-cover.png');

await closeTab(c2.id);
await closeTab(t.id);
