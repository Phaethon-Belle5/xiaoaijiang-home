// 查清为什么页面拿到的是旧 wallpaper：清掉本地库再加载，看是否变 image
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
const line = (n, v) => console.log('  ' + String(n).padEnd(32) + ' = ' + String(v).slice(0, 130));

await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?probe=' + Date.now() });
await sleep(15000);

console.log('════ 页面里直接问接口 ════');
line('接口 type', await evalJs(c, `fetch('/api/data?x='+Date.now()).then(r=>r.json()).then(j=>j.wallpaper.type)`));
line('接口 images 数', await evalJs(c, `fetch('/api/data?x='+Date.now()).then(r=>r.json()).then(j=>(j.wallpaper.images||[]).length)`));
line('页面 data.wallpaper.type', await evalJs(c, 'data.wallpaper.type'));
line('页面 data.wallpaper.interval', await evalJs(c, 'data.wallpaper.interval'));
line('API_URL', await evalJs(c, 'typeof API_URL!=="undefined"?API_URL:"无"'));

console.log('\n════ 清掉本地库 + 缓存，重新加载 ════');
await evalJs(c, `(async function(){
  try{ indexedDB.deleteDatabase('xiaoaijiang'); }catch(e){}
  try{ if(window.dbClear) await dbClear(); }catch(e){}
  try{ localStorage.clear(); }catch(e){}
  try{ sessionStorage.clear(); }catch(e){}
  return 1;
})()`);
await sleep(1500);
await c.send('Network.clearBrowserCache');
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?fresh=' + Date.now() });
await sleep(18000);
line('刷新后 type', await evalJs(c, 'data.wallpaper.type'));
line('刷新后 interval', await evalJs(c, 'data.wallpaper.interval'));
line('刷新后 images 数', await evalJs(c, '(data.wallpaper.images||[]).length)'));
line('刷新后 .wp-img 数量', await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img").length'));
line('刷新后 video 数量', await evalJs(c, 'document.querySelectorAll("#wp-stage video").length'));
line('轮播定时器', await evalJs(c, '(typeof wpTimer!=="undefined"&&wpTimer)?"运行中":"未运行"'));
line('当前背景图', await evalJs(c, `(function(){var e=document.querySelector('#wp-stage .wp-img.on');return e?String(e.style.backgroundImage).slice(0,110):'无'})()`));
await closeTab(t.id);
