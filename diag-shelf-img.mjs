// 把映像馆书架封面图的真实 URL 抓出来，逐个测试
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?' + Date.now() });
await sleep(20000);
await evalJs(c, 'try{setMemTab("shelf")}catch(e){}; 1');
await sleep(4000);

const info = await evalJs(c, `(function(){
  var imgs=[].slice.call(document.querySelectorAll('.shelf3d img, .sb-bottom img'));
  return JSON.stringify(imgs.slice(0,6).map(function(i){
    return { src:i.src, w:i.naturalWidth, complete:i.complete, loading:i.loading, display:getComputedStyle(i).display, rect:Math.round(i.getBoundingClientRect().width)+'x'+Math.round(i.getBoundingClientRect().height) };
  }));
})()`);
console.log('════ 书架封面图实际状态 ════');
let first = null;
JSON.parse(info).forEach((x, i) => {
  if (i === 0 && x.src) first = x.src;
  console.log('  ' + (i + 1) + '. naturalWidth=' + x.w + '  complete=' + x.complete + '  ' + x.rect + '  display=' + x.display);
  console.log('     ' + String(x.src).slice(0, 130));
});

if (first) {
  console.log('\n════ 在浏览器里测这张图 ════');
  console.log('  Image 加载: ' + await evalJs(c, `(async()=>{return await new Promise(res=>{const i=new Image();i.onload=()=>res('✅ 成功 '+i.naturalWidth+'x'+i.naturalHeight);i.onerror=()=>res('❌ onerror');i.src=${JSON.stringify(first)};setTimeout(()=>res('⏱ 超时'),15000)})})()`));
  console.log('  fetch 加载: ' + await evalJs(c, `(async()=>{try{const r=await fetch(${JSON.stringify(first)});const b=await r.blob();return 'HTTP '+r.status+'  '+b.size+' 字节  type='+b.type}catch(e){return '❌ '+e.message}})()`));
  console.log('  DNS 解析成: ' + await evalJs(c, `(function(){try{var u=new URL(${JSON.stringify(first)});return u.host}catch(e){return '解析失败'}})()`));
}

console.log('\n════ 页面里所有 img（含未加载的）════');
const all = await evalJs(c, `(function(){
  var imgs=[].slice.call(document.querySelectorAll('img'));
  return JSON.stringify({总数:imgs.length, 有src:imgs.filter(function(i){return i.src&&i.src.indexOf('data:')!==0}).length,
    成功:imgs.filter(function(i){return i.naturalWidth>0}).length,
    带loading属性:imgs.filter(function(i){return i.getAttribute('loading')}).length,
    样例:imgs.slice(0,3).map(function(i){return (i.src||'(无src)').slice(0,80)})});
})()`);
console.log('  ' + all);

console.log('\n════ 直接从 Node 拉同一张图（走系统解析）════');
if (first) {
  try {
    const r = await fetch(first, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://map.231060101.xyz/' }, signal: AbortSignal.timeout(25000) });
    const b = await r.arrayBuffer();
    console.log('  HTTP ' + r.status + '  ' + (b.byteLength / 1024).toFixed(0) + ' KB  type=' + (r.headers.get('content-type') || '-'));
  } catch (e) { console.log('  ❌ ' + (e.cause ? (e.cause.code || e.cause.message) : e.message).toString().slice(0, 80)); }
}
await closeTab(t.id);
