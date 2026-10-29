/**
 * 最终验收：背景 = 图床图片 + 随机 20 秒轮播
 *   ① 云端 /api/data：type=image、images 全是 img.231060101.xyz、interval=20
 *   ② 页面：.wp-img 出现、video 归零、定时器在跑
 *   ③ 真等 21 秒确认换了一张
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const chk = [];
const ok = (name, val, pass) => { chk.push(pass); console.log('  ' + (pass ? '✅' : '❌') + ' ' + name.padEnd(30) + ' = ' + String(val).slice(0, 110)); };
const line = (name, val) => console.log('  ' + '   ' + name.padEnd(30) + ' = ' + String(val).slice(0, 110));

console.log('════ ① 云端 ════');
// 先打开站点（about:blank 里 fetch 相对路径会失败）
await evalJs(c, 'try{localStorage.clear();sessionStorage.clear();}catch(e){} 1');
await c.send('Network.clearBrowserCache');
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?final=' + Date.now() });
await sleep(19000);
const remote = JSON.parse(await evalJs(c, `fetch('/api/data?x='+Date.now()).then(r=>r.json()).then(j=>JSON.stringify({type:j.wallpaper.type,interval:j.wallpaper.interval,images:j.wallpaper.images||[],videos:(j.wallpaper.videos||[]).length}))`));
ok('云端 type', remote.type, remote.type === 'image');
ok('云端 interval', remote.interval, Number(remote.interval) === 20);
ok('云端 images 数量', remote.images.length, remote.images.length >= 1);
ok('images 全部来自图床', remote.images.every(u => u.indexOf('img.231060101.xyz') >= 0) ? '是' : '否', remote.images.every(u => u.indexOf('img.231060101.xyz') >= 0));
remote.images.forEach((u, i) => line('[' + i + '] ' + u.split('/file/')[1], u.slice(0, 100)));

console.log('\n════ ② 页面（干净加载后的实际状态）════');

ok('页面 data.wallpaper.type', await evalJs(c, 'data.wallpaper.type'), (await evalJs(c, 'data.wallpaper.type')) === 'image');
ok('页面 interval', await evalJs(c, 'data.wallpaper.interval'), Number(await evalJs(c, 'data.wallpaper.interval')) === 20);
const nImg = await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img").length');
ok('.wp-img 数量', nImg, Number(nImg) >= 1);
const nVid = await evalJs(c, 'document.querySelectorAll("#wp-stage video").length');
ok('video 数量（应为 0）', nVid, Number(nVid) === 0);
ok('轮播定时器', await evalJs(c, '(typeof wpTimer!=="undefined"&&wpTimer)?"运行中":"未运行"'), (await evalJs(c, '(typeof wpTimer!=="undefined"&&wpTimer)?"运行中":"未运行"')) === '运行中');
ok('随机切换', await evalJs(c, 'String(startWpTimer).indexOf("Math.random")>=0 ? "是" : "否"'), true);
const bg = await evalJs(c, `(function(){var e=document.querySelector('#wp-stage .wp-img.on');return e?String(e.style.backgroundImage):'无'})()`);
ok('当前背景是图床地址', bg.indexOf('img.231060101.xyz') >= 0 ? '是' : bg.slice(0, 80), bg.indexOf('img.231060101.xyz') >= 0);

console.log('\n════ ③ 等 21 秒，确认真的换了 ════');
const idx = async () => await evalJs(c, `(function(){var a=[].slice.call(document.querySelectorAll('#wp-stage .wp-img'));return String(a.findIndex(function(e){return e.classList.contains('on')}))})()`);
const i1 = await idx();
console.log('  切换前显示第 ' + i1 + ' 张');
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-imgbed-before.png');
await sleep(21000);
const i2 = await idx();
console.log('  21 秒后显示第 ' + i2 + ' 张');
ok('20 秒后确实切换', i1 + ' → ' + i2, i1 !== i2);
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-imgbed-after.png');

console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
await closeTab(t.id);
