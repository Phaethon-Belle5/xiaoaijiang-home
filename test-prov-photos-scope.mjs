// 验证：省份封面候选只包含该省自己的照片
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
import { readFile } from 'node:fs/promises';

let PW = '';
try { PW = (await readFile('C:/Users/dell/Desktop/web/_repo/map-gallery-worker/.site_password', 'utf8')).trim(); } catch (e) {}

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/admin.html?t=' + Date.now() });
await sleep(8000);
await evalJs(c, `(function(){document.getElementById('pw').value=${JSON.stringify(PW)};return 1})()`);
await evalJs(c, 'doLogin(); 1');
await sleep(5000);

console.log('════ 各省自己的照片数（应远小于全站 66）════');
await evalJs(c, 'openProvinceCovers(); 1');
await sleep(4500);
console.log(await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.prov-info')).map(function(e){
  return e.querySelector('b').textContent + ' → ' + e.querySelector('small').textContent;
}), null, 1)`));
console.log('\n  全站照片数 = ' + await evalJs(c, 'ALL_PHOTOS.length'));

console.log('\n════ 逐个省份：候选张数 vs 该省真实张数 ════');
const res = await evalJs(c, `(function(){
  var out=[];
  document.querySelectorAll('.prov-row').forEach(function(row,i){
    var prov=row.querySelector('.prov-info b').textContent;
    openProvPicker(prov);
    var n=document.querySelectorAll('.prov-pick').length;
    var real=provPhotos(prov).length;
    out.push(prov+' → 候选 '+n+' 张 / 实际该省 '+real+' 张 '+(n===real?'✅':'❌')+(n>=66?' ← 明显含全站照片':''));
  });
  return JSON.stringify(out,null,1);
})()`);
console.log(res);

console.log('\n════ 抽查：候选里的照片确实属于该省城市吗 ════');
console.log(await evalJs(c, `(function(){
  var prov='内蒙古自治区';
  openProvPicker(prov);
  var keys=new Set(PROV_CITIES[prov].map(function(c){return c.cityKey}));
  var urls=[].slice.call(document.querySelectorAll('.prov-pick img')).map(function(i){return decodeURIComponent(i.src)});
  var all=ALL_PHOTOS.map(function(p){return {u:decodeURIComponent(p.url),k:p.cityKey}});
  var bad=urls.filter(function(u){
    var hit=all.find(function(p){return p.u===u});
    return hit && !keys.has(hit.k);
  });
  return '内蒙古候选 '+urls.length+' 张；其中不属于内蒙古的: '+bad.length+(bad.length?' → '+bad.slice(0,2).join(' | ').slice(0,90):' ✅');
})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/admin-prov-picker.png');
console.log('\n  截图: shots/admin-prov-picker.png');
await closeTab(t.id);
