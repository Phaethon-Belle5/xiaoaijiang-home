/**
 * 抓出映像馆里到底哪个请求证书失败 —— 这决定问题出在谁身上
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));

const reqs = new Map();       // requestId → {url, type}
const failures = [];          // 证书类失败
const allFailed = [];
const responses = new Map();  // url → status

ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Network.requestWillBeSent') {
      reqs.set(m.params.requestId, { url: m.params.request.url, type: m.params.type });
    }
    if (m.method === 'Network.responseReceived') {
      responses.set(m.params.response.url, m.params.response.status);
    }
    if (m.method === 'Network.loadingFailed') {
      const info = reqs.get(m.params.requestId) || { url: '(未知)', type: '?' };
      const rec = { url: info.url, type: info.type, err: m.params.errorText, canceled: !!m.params.canceled };
      allFailed.push(rec);
      if (/CERT|SSL|cert/i.test(m.params.errorText || '')) failures.push(rec);
    }
  } catch (e) {}
});
const wait = (id) => new Promise(res => { const h = (ev) => { try { const m = JSON.parse(ev.data); if (m.id === id) { ws2.removeEventListener('message', h); res(); } } catch (e) {} }; ws2.addEventListener('message', h); });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' })); await wait(1);
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' })); await wait(2);
ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' })); await wait(3);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });

await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?cert=' + Date.now() });
await sleep(26000);

console.log('════ 证书类失败 (' + failures.length + ') ════');
const byHost = {};
for (const f of failures) {
  let host = '?'; try { host = new URL(f.url).host; } catch (e) {}
  byHost[host] = byHost[host] || [];
  byHost[host].push(f);
}
for (const [host, list] of Object.entries(byHost)) {
  console.log('  ⚠ ' + host + '  共 ' + list.length + ' 个请求失败  错误=' + list[0].err);
  list.slice(0, 4).forEach(x => console.log('      ' + x.type.padEnd(10) + ' ' + x.url.slice(0, 108)));
  if (list.length > 4) console.log('      …还有 ' + (list.length - 4) + ' 个');
}

console.log('\n════ 所有失败（含非证书，共 ' + allFailed.length + '）════');
const seen = new Set();
for (const f of allFailed) {
  const k = f.err + '|' + f.url.slice(0, 60);
  if (seen.has(k)) continue; seen.add(k);
  console.log('  ' + String(f.err).padEnd(32) + f.type.padEnd(10) + f.url.slice(0, 90));
}

console.log('\n════ 各域名响应统计 ════');
const stat = {};
for (const [u, s] of responses) { let h = '?'; try { h = new URL(u).host; } catch (e) {} stat[h] = stat[h] || {}; stat[h][s] = (stat[h][s] || 0) + 1; }
for (const [h, s] of Object.entries(stat)) console.log('  ' + h.padEnd(28) + Object.entries(s).map(([k, v]) => k + '×' + v).join('  '));

console.log('\n════ 图片是否真的显示出来 ════');
const q = async (l, e) => { try { console.log('  ' + l.padEnd(24) + ' = ' + String(await evalJs(c, e)).slice(0, 120)); } catch (x) { console.log('  ' + l.padEnd(24) + ' = 取不到'); } };
await q('页面上的 img 数', 'document.querySelectorAll("img").length');
await q('已加载成功的 img', '[].slice.call(document.querySelectorAll("img")).filter(function(i){return i.naturalWidth>0}).length');
await q('加载失败的 img', '[].slice.call(document.querySelectorAll("img")).filter(function(i){return i.complete&&i.naturalWidth===0}).length');
await q('失败图片样例', '(function(){var a=[].slice.call(document.querySelectorAll("img")).filter(function(i){return i.complete&&i.naturalWidth===0});return a.length?a[0].src.slice(0,100):"无"})()');

ws2.close();
await closeTab(t.id);
