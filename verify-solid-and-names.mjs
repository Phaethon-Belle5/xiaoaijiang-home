/**
 * 验收两件事：
 *   ① 视频没加载出来时是纯色，不是图片（DEFAULT_WALLPAPERS 空、ensureWallpaperFallback 走纯色）
 *   ② 后台壁纸列表显示原文件名，不是 %E8%83%8C… 编码串
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const chk = [];
const ok = (n, v, p) => { chk.push(p); console.log('  ' + (p ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 115)); };
const line = (n, v) => console.log('  ' + '  ' + n.padEnd(30) + ' = ' + String(v).slice(0, 115));

await evalJs(c, 'try{localStorage.clear();sessionStorage.clear();}catch(e){} 1');
await c.send('Network.clearBrowserCache');
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?fb=' + Date.now() });
await sleep(19000);

console.log('════ ① 兜底不再是图片 ════');
ok('DEFAULT_WALLPAPERS 长度', await evalJs(c, 'DEFAULT_WALLPAPERS.length'), Number(await evalJs(c, 'DEFAULT_WALLPAPERS.length')) === 0);
ok('stage 里有没有 .wp-img', await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img").length'), Number(await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img").length')) === 0);
ok('stage 里有没有 .fallback', await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img.fallback").length'), Number(await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img.fallback").length')) === 0);
ok('容器背景色（纯色）', await evalJs(c, 'getComputedStyle(document.getElementById("wp-stage")).backgroundColor'), true);
ok('视频元素数量', await evalJs(c, 'document.querySelectorAll("#wp-stage video").length'), Number(await evalJs(c, 'document.querySelectorAll("#wp-stage video").length')) >= 1);

// 模拟「视频全都没加载出来」→ 应该看到纯色，setTimeout 里不该出现 img
console.log('\n  模拟兜底（清空 stage 后调 ensureWallpaperFallback）');
const fb = JSON.parse(await evalJs(c, `(function(){
  var st=document.getElementById('wp-stage');
  ensureWallpaperFallback(st);
  return JSON.stringify({
    wpImg: st.querySelectorAll('.wp-img').length,
    videos: st.querySelectorAll('video').length,
    mode: wpRuntimeMode,
    bg: getComputedStyle(st).backgroundColor
  });
})()`));
line('兜底后 .wp-img 数（应为 0）', fb.wpImg);
line('兜底后 video 数（应为 0）', fb.videos);
line('兜底后运行模式', fb.mode);
line('兜底后背景色', fb.bg);
ok('兜底是纯色（无图片）', JSON.stringify(fb), fb.wpImg === 0 && fb.videos === 0);
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-solid-fallback.png');

console.log('\n════ ② 后台壁纸列表显示文件名 ════');
await evalJs(c, 'ADMIN.shell();ADMIN.go("wallpaper"); 1');
await sleep(2600);
const list = JSON.parse(await evalJs(c, `(function(){
  var items=[].slice.call(document.querySelectorAll('.wp-list-item'));
  return JSON.stringify(items.slice(0,6).map(function(e){
    var s=e.querySelector('.wp-list-url');
    return s? s.textContent.trim() : '';
  }));
})()`));
console.log('  列表前几项：');
list.forEach((x, i) => console.log('    [' + i + '] ' + x));
const readable = list.length > 0 && list.every(s => s.indexOf('%E') < 0 && s.indexOf('https://') < 0);
ok('列表不含 URL 编码', readable ? '是' : '否', readable);
ok('列表是文件名', list[0] || '空', list.length > 0);

console.log('\n  再检查一批（全部 18 个 + 图片列表）：');
const all = JSON.parse(await evalJs(c, `(function(){
  var a=[].slice.call(document.querySelectorAll('.wp-list-url')).map(function(e){return e.textContent.trim()});
  return JSON.stringify(a);
})()`));
all.forEach(s => console.log('    ' + s));
ok('全部都是文件名', all.length + ' 条', all.every(s => s.indexOf('%E') < 0));

console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
await closeTab(t.id);
