import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?ck=' + Date.now() });
await sleep(24000);
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="shelf"]');if(b)b.click();return 1})()`);
await sleep(4500);
console.log('  PROV_COVERS = ' + (await evalJs(c, 'JSON.stringify(PROV_COVERS)')).slice(0, 130));
console.log('\n  每本书的省份 → 封面来源:');
console.log(await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.shelf-book')).map(function(b){
  var prov=b.querySelector('.sb-prov').textContent;
  var img=b.querySelector('.sb-bottom img');
  var u=img?(img.src.indexOf('20260824')>=0?'★后台选定的封面':'城市照片兜底'):'(无图)';
  return prov+' → '+u;
}), null, 1)`));
console.log('\n  内蒙古那本是否用了后台封面 = ' + await evalJs(c, `(function(){
  var bs=[].slice.call(document.querySelectorAll('.shelf-book'));
  var b=bs.find(function(x){return x.querySelector('.sb-prov').textContent==='内蒙古自治区'});
  if(!b)return '没找到';
  var i=b.querySelector('.sb-bottom img');
  return i?(i.src.indexOf('20260824')>=0?'✅ 是（后台选的那张）':'❌ 不是'):'无图';
})()`));
console.log('  封面图加载 = ' + await evalJs(c, `[].slice.call(document.querySelectorAll('.sb-bottom img')).filter(function(i){return i.complete&&i.naturalWidth>0}).length + ' / ' + document.querySelectorAll('.sb-bottom img').length`));
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-shelf-prov.png');
await closeTab(t.id);
