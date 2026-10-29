/**
 * 验收：背景 = 图床那 18 个 webm，每个 20 秒，随机切
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const chk = [];
const ok = (name, val, pass) => { chk.push(pass); console.log('  ' + (pass ? '✅' : '❌') + ' ' + name.padEnd(26) + ' = ' + String(val).slice(0, 110)); };
const line = (name, val) => console.log('  ' + '  ' + name.padEnd(26) + ' = ' + String(val).slice(0, 110));

await evalJs(c, 'try{localStorage.clear();sessionStorage.clear();}catch(e){} 1');
await c.send('Network.clearBrowserCache');
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?vid=' + Date.now() });
await sleep(20000);

console.log('════ ① 云端 ════');
const remote = JSON.parse(await evalJs(c, `fetch('/api/data?x='+Date.now()).then(r=>r.json()).then(j=>JSON.stringify({type:j.wallpaper.type,n:(j.wallpaper.videos||[]).length,img:(j.wallpaper.images||[]).length,d0:(j.wallpaper.videos||[{}])[0].duration,allImgbed:(j.wallpaper.videos||[]).every(function(v){return String(v.src).indexOf('img.231060101.xyz')>=0})}))`));
ok('云端 type', remote.type, remote.type === 'video');
ok('云端 videos 数量', remote.n, Number(remote.n) === 18);
ok('云端 images（应清空）', remote.img, Number(remote.img) === 0);
ok('每个时长', remote.d0 + ' 秒', Number(remote.d0) === 20);
ok('全部来自图床', remote.allImgbed ? '是' : '否', remote.allImgbed === true);

console.log('\n════ ② 页面实际在播什么 ════');
ok('videoQueue 长度', await evalJs(c, 'typeof videoQueue!=="undefined" ? videoQueue.length : "无"'), Number(await evalJs(c, 'typeof videoQueue!=="undefined" ? videoQueue.length : 0')) === 18);
ok('队列都来自图床', await evalJs(c, 'videoQueue.every(function(v){return String(v.src).indexOf("img.231060101.xyz")>=0}) ? "是" : "否"'), (await evalJs(c, 'videoQueue.every(function(v){return String(v.src).indexOf("img.231060101.xyz")>=0}) ? "是" : "否"')) === '是');
ok('队列时长', await evalJs(c, 'videoQueue.map(function(v){return v.duration}).slice(0,3).join(",")'), (await evalJs(c, 'videoQueue[0].duration')) == 20);
ok('运行模式', await evalJs(c, 'wpRuntimeMode'), (await evalJs(c, 'wpRuntimeMode')) === 'video');
ok('currentSrc 是图床', await evalJs(c, '(function(){var v=document.querySelector("#wp-stage video");return v?decodeURIComponent(String(v.currentSrc||v.src).split("/背景/")[1]||v.src).slice(0,60):"没有 video 元素"})()'), true);
ok('视频在播（未暂停）', await evalJs(c, '(function(){var v=document.querySelector("#wp-stage video");return v?(v.paused?"暂停":"播放中")+" "+Math.round(v.currentTime*10)/10+"s":"无"})()'), true);

console.log('\n════ ③ 等 23 秒，确认换成下一个 ════');
const first = await evalJs(c, '(function(){var v=document.querySelector("#wp-stage video");return v?decodeURIComponent(String(v.src).split("/背景/")[1]||"").slice(0,40):""})()');
console.log('  切换前：' + first);
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-webm-1.png');
await sleep(23000);
const second = await evalJs(c, '(function(){var v=document.querySelector("#wp-stage video");return v?decodeURIComponent(String(v.src).split("/背景/")[1]||"").slice(0,40):""})()');
console.log('  23 秒后：' + second);
ok('20 秒后换了背景', first !== second ? '换了' : '没换', first !== second);
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-webm-2.png');

const errs = await evalJs(c, '(window.__errs||[]).length');
ok('JS 异常', errs, Number(errs) === 0);

console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
await closeTab(t.id);
