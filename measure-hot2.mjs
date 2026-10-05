// 逐个源测耗时 + 模拟真实首屏（无缓存）看热榜多久出来
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

console.log('════ ① 各源的服务端接口耗时（各测 3 次取最好）════');
const SRCS = ['github', 'weibo', 'zhihu', 'bilibili', 'douyin', 'baidu', 'toutiao', '36kr', 'juejin', 'v2ex', 'hackernews', 'sspai'];
const results = [];
for (const s of SRCS) {
  const best = [];
  let label = '', n = 0, err = '';
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    try {
      const r = await fetch(`https://home.xiaoaijiang.cloud/api/hot?src=${s}&cb=${Math.random()}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
      const j = await r.json();
      best.push(Date.now() - t0);
      label = j.label || label;
      n = (j.items || []).length;
      if (j.error) err = j.error;
      if ((j.items || []).length) break;
    } catch (e) { best.push(-1); err = e.name === 'TimeoutError' ? '超时' : e.message.slice(0, 30); }
  }
  const good = best.filter(x => x >= 0);
  const ms = good.length ? Math.min(...good) : -1;
  results.push({ s, label, n, ms, err });
}
results.sort((a, b) => (b.ms < 0 ? 99999 : b.ms) - (a.ms < 0 ? 99999 : a.ms));
for (const r of results) {
  console.log('  ' + (r.n > 0 ? '✅' : '❌') + ' ' + String(r.label || r.s).padEnd(12) + String(r.ms >= 0 ? r.ms + ' ms' : '失败').padStart(8) + '  ' + String(r.n).padStart(3) + ' 条' + (r.err ? '  ' + r.err : ''));
}

console.log('\n════ ② 真实首屏（清空 localStorage，模拟第一次访问）════');
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Storage.clearDataForOrigin', { origin: 'https://home.xiaoaijiang.cloud', storageTypes: 'all' }).catch(() => {});
await sleep(600);
const T0 = Date.now();
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?hot=' + Date.now() });
let appeared = -1;
for (let i = 0; i < 60; i++) {
  await sleep(500);
  try {
    const n = await evalJs(c, 'document.querySelectorAll("#hot-list .hot-item").length');
    if (n > 0) { appeared = Date.now() - T0; console.log('  ✅ 热榜出现：' + appeared + ' ms（' + n + ' 条）'); break; }
  } catch (e) {}
}
if (appeared < 0) console.log('  ❌ 20 秒内没出现');

console.log('\n  首屏各阶段：');
for (const [name, expr] of [
  ['热榜项数', 'document.querySelectorAll("#hot-list .hot-item").length'],
  ['热榜状态文本', '(document.querySelector("#hot-list .hot-state")||{}).textContent || "(无)"'],
  ['当前源', 'typeof _hotSrc!=="undefined"?_hotSrc:"?"'],
  ['更新时间徽标', '(document.getElementById("hot-updated")||{}).textContent||"(无)"'],
  ['localStorage 里的热榜缓存', '(function(){try{var a=JSON.parse(localStorage.getItem("xiaoaijiang-hot-cache-v1")||"{}");return Object.keys(a).map(function(k){return k+":"+(a[k].list||[]).length+"条"}).join(" ")||"(空)"}catch(e){return "读取失败"}})()'],
]) {
  try { console.log('    ' + name.padEnd(22) + ' = ' + String(await evalJs(c, expr)).slice(0, 110)); } catch (e) {}
}
await sleep(6000);
console.log('\n  再等 6 秒（预取其它源之后）：');
try { console.log('    ' + 'localStorage 缓存'.padEnd(20) + ' = ' + String(await evalJs(c, '(function(){try{var a=JSON.parse(localStorage.getItem("xiaoaijiang-hot-cache-v1")||"{}");return Object.keys(a).map(function(k){return k+":"+(a[k].list||[]).length}).join(" ")||"(空)"}catch(e){return "失败"}})()')).slice(0, 120)); } catch (e) {}
await closeTab(t.id);
