import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?multi=' + Date.now() });
await sleep(15000);
await evalJs(c, 'ADMIN.shell();ADMIN.go("wallpaper"); 1');
await sleep(2200);
// 用 String.fromCharCode(10) 造真换行，避免转义问题
const r = JSON.parse(await evalJs(c, `(function(){
  var inp=document.getElementById('e-wp-new-url');
  var NL=String.fromCharCode(10);
  inp.value='https://img.231060101.xyz/file/背景/a.jpg'+NL+'https://img.231060101.xyz/file/背景/b.jpg'+NL+'https://img.231060101.xyz/file/背景/c.jpg';
  addWpUrl();
  return JSON.stringify({n:(data.wallpaper.images||[]).length, list:data.wallpaper.images, type:data.wallpaper.type});
})()`));
console.log('  三个地址用真换行粘贴 →');
console.log('    张数      =', r.n);
console.log('    type      =', r.type);
console.log('    列表      =', JSON.stringify(r.list));
console.log('  ' + (r.n === 3 ? '✅ 三行都进去了' : '❌ 没拆开'));
await closeTab(t.id);
