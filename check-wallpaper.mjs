// 检查背景轮播：间隔是否 20 秒、是否随机、当前云端配置
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?wp=' + Date.now() });
await sleep(16000);

const q = async (label, expr) => {
  try { console.log('  ' + label.padEnd(28) + ' = ' + String(await evalJs(c, expr)).slice(0, 120)); }
  catch (e) { console.log('  ' + label.padEnd(28) + ' = ❌ ' + e.message.slice(0, 60)); }
};

await q('WP_INTERVAL_SEC', 'typeof WP_INTERVAL_SEC==="undefined" ? "(未定义)" : WP_INTERVAL_SEC');
await q('wpIntervalSec()', 'typeof wpIntervalSec==="function" ? wpIntervalSec() : "(无此函数)"');
await q('轮播定时器', 'typeof wpTimer!=="undefined" && wpTimer ? "运行中" : "未运行"');
await q('云端 type', 'data.wallpaper.type');
await q('云端 interval', 'String(data.wallpaper.interval)');
await q('云端 images', 'String((data.wallpaper.images||[]).length)');
await q('云端 videos', 'String((data.wallpaper.videos||[]).length)');
await q('页面 .wp-img 数量', 'document.querySelectorAll("#wp-stage .wp-img").length');
await q('页面有 video 元素', 'document.querySelectorAll("#wp-stage video").length');

// 看 startWpTimer 源码里是不是随机
await q('startWpTimer 是随机吗',
  '(function(){var s=String(startWpTimer);return s.indexOf("Math.random")>=0 ? "✅ 随机（Math.random）" : "❌ 顺序轮播"})()');

// 看 getWallpaperImages 拿到什么
await q('getWallpaperImages()', '(function(){try{var a=getWallpaperImages();return a.length+" 张："+JSON.stringify(a.slice(0,3))}catch(e){return "❌ "+e.message}})()');
await closeTab(t.id);
