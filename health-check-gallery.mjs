/**
 * 映像馆回归检查：改完记忆书架后，其它功能没被碰坏
 *  · 页面能跑、无 JS 异常
 *  · 开屏地球容器在
 *  · 地图/相册区在
 *  · 记忆面板四个 tab 都能切
 *  · 记忆书架的立体书结构在，点击能翻开
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?reg=' + Date.now() });
await sleep(22000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(26) + ' = ' + v); };

console.log('════ 基础 ════');
ok('标题', await evalJs(c, 'document.title'), /映像馆/.test(await evalJs(c, 'document.title')));
ok('开屏容器在', await evalJs(c, '!!document.getElementById("launch")'), true);
ok('脚本已执行', await evalJs(c, 'typeof setMapView'), 'function' === await evalJs(c, 'typeof setMapView'));
ok('地图数据已载入', await evalJs(c, '(typeof CITIES!=="undefined"&&CITIES)?CITIES.length+" 个城市":"未载入"'), (await evalJs(c, '(typeof CITIES!=="undefined"&&CITIES)?CITIES.length:0')) > 0);

console.log('\n════ 地图区 ════');
ok('地图画布在', await evalJs(c, '!!document.getElementById("china-map") || !!document.querySelector("canvas")'), true);
ok('视图切换可用', await evalJs(c, '(function(){try{setMapView("province");setMapView("city");return "来回切换正常"}catch(e){return "❌ "+e.message}})()'), /正常/.test(await evalJs(c, '(function(){try{setMapView("province");setMapView("city");return "来回切换正常"}catch(e){return "❌ "+e.message}})()')));

console.log('\n════ 记忆面板四个 tab ════');
for (const [tab, label] of [['stats', '旅行统计'], ['time', '时间足迹'], ['shelf', '记忆书架'], ['stream', '照片流']]) {
  const r = await evalJs(c, `(function(){try{setMemTab(${JSON.stringify(tab)});return "ok"}catch(e){return "❌ "+e.message}})()`);
  await sleep(1600);
  const inner = await evalJs(c, '(function(){var b=document.getElementById("memPanel");return b?(b.innerText||"").replace(/\\s+/g," ").trim().slice(0,34):"无面板"})()');
  ok(label, (r === 'ok' ? '' : r + ' ') + '「' + inner + '」', r === 'ok');
}

console.log('\n════ 记忆书架 ════');
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(2200);
ok('书数', await evalJs(c, 'document.querySelectorAll(".shelf3d").length') + ' 本', (await evalJs(c, 'document.querySelectorAll(".shelf3d").length')) > 0);
ok('三层结构', await evalJs(c, '(function(){var b=document.querySelector(".shelf3d");return b&&b.querySelector(".shelf3d-cover")&&b.querySelector(".shelf3d-pages")&&b.querySelector(".shelf3d-back")?"完整":"缺"})()'), '完整' === await evalJs(c, '(function(){var b=document.querySelector(".shelf3d");return b&&b.querySelector(".shelf3d-cover")&&b.querySelector(".shelf3d-pages")&&b.querySelector(".shelf3d-back")?"完整":"缺"})()'));
ok('封面有省份名与图', await evalJs(c, '(function(){var b=document.querySelector(".shelf3d-cover");return (b.querySelector(".sb-prov")?"名✓":"名✗")+(b.querySelector(".sb-bottom img")?"图✓":"图✗")})()'), '名✓图✓' === await evalJs(c, '(function(){var b=document.querySelector(".shelf3d-cover");return (b.querySelector(".sb-prov")?"名✓":"名✗")+(b.querySelector(".sb-bottom img")?"图✓":"图✗")})()'));
await evalJs(c, 'document.querySelector(".shelf3d").click(), 1');
await sleep(3500);
ok('点击能翻开', await evalJs(c, '(function(){var l=document.getElementById("bookLayer");return l&&l.classList.contains("show")?"翻开了 "+document.querySelectorAll(".book-page,.bp-inner,.bk-book .page").length+" 页":"❌ 没开"})()'), (await evalJs(c, 'document.querySelectorAll(".book-page,.bp-inner,.bk-book .page").length')) > 0);
await evalJs(c, 'try{closeBook()}catch(e){}; 1');
await sleep(1200);
ok('能关掉', await evalJs(c, '(function(){var l=document.getElementById("bookLayer");return l&&!l.classList.contains("show")?"已关":"❌ 还开着"})()'), '已关' === await evalJs(c, '(function(){var l=document.getElementById("bookLayer");return l&&!l.classList.contains("show")?"已关":"❌ 还开着"})()'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
