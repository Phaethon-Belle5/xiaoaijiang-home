// 只在内存里验证：把类型切成 image + 塞几张图，看背景是否变成图片轮播、是否 20 秒随机切换
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?img=' + Date.now() });
await sleep(16000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 120));

line('改动前 type', await evalJs(c, 'data.wallpaper.type'));
line('改动前 .wp-img', await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img").length'));
line('改动前 video', await evalJs(c, 'document.querySelectorAll("#wp-stage video").length'));

// ★ 只在内存里改，不调用 saveData，不会影响云端
const r = JSON.parse(await evalJs(c, `(function(){
  var imgs=[
    'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp',
    'https://img.231060101.xyz/logo.png',
    'https://img.231060101.xyz/favicon.png'
  ];
  data.wallpaper.type='image';
  data.wallpaper.images=imgs.slice();
  initWallpapers();
  return JSON.stringify({
    type: data.wallpaper.type,
    images: data.wallpaper.images.length,
    wpImg: document.querySelectorAll('#wp-stage .wp-img').length,
    video: document.querySelectorAll('#wp-stage video').length,
    有on: document.querySelectorAll('#wp-stage .wp-img.on').length,
    间隔秒: wpIntervalSec(),
    定时器: (typeof wpTimer!=='undefined'&&wpTimer)?'运行中':'未运行',
    随机: String(startWpTimer).indexOf('Math.random')>=0
  });
})()`));
line('改成 image 后 type', r.type);
line('images 数量', r.images);
line('页面 .wp-img 数量', r.wpImg);
line('页面 video 数量', r.video);
line('当前显示中的张数', r.有on);
line('轮播间隔（秒）', r.间隔秒);
line('轮播定时器', r.定时器);
line('是否随机', r.随机);

// 等 21 秒看是否换了
const before = await evalJs(c, '(function(){var a=[].slice.call(document.querySelectorAll("#wp-stage .wp-img"));return String(a.findIndex(function(e){return e.classList.contains("on")}))})()');
line('切换前是哪一张', before);
await sleep(21000);
const after = await evalJs(c, '(function(){var a=[].slice.call(document.querySelectorAll("#wp-stage .wp-img"));return String(a.findIndex(function(e){return e.classList.contains("on")}))})()');
line('21 秒后是哪一张', after);
console.log('  ' + (before !== after ? '✅ 20 秒后确实换了' : '❌ 没换'));

console.log('\n  ⚠ 只改了内存，没调用 saveData，云端数据未变');
line('云端 type（未变）', await evalJs(c, 'data.wallpaper.type'));
await closeTab(t.id);
