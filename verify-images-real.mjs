/**
 * 正确的图片测试：先把每个 <img> 滚进视口触发懒加载，再统计成功/失败
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

async function realImageCheck(label, url, waitMs, prep) {
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));
  const certFails = [];
  const reqs = new Map();
  ws2.addEventListener('message', (ev) => {
    try { const m = JSON.parse(ev.data);
      if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, m.params.request.url);
      if (m.method === 'Network.loadingFailed' && /CERT|SSL/i.test(m.params.errorText || '')) certFails.push(reqs.get(m.params.requestId) || '?');
    } catch (e) {}
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url });
  await sleep(waitMs);
  if (prep) { await evalJs(c, prep); await sleep(4000); }

  // 逐个滚进视口，强制触发懒加载
  console.log('\n  ' + label);
  const total = await evalJs(c, 'document.querySelectorAll("img").length');
  for (let i = 0; i < total; i++) {
    await evalJs(c, `(function(){var a=document.querySelectorAll('img');if(a[${i}])a[${i}].scrollIntoView({block:'center',behavior:'instant'});return 1})()`);
    await sleep(450);
  }
  await sleep(4000);

  const r = JSON.parse(await evalJs(c, `(function(){
    var imgs=[].slice.call(document.querySelectorAll('img')).filter(function(i){return i.src && i.src.indexOf('data:')!==0});
    var bad=imgs.filter(function(i){return i.complete && i.naturalWidth===0});
    return JSON.stringify({总数:imgs.length, 成功:imgs.filter(function(i){return i.naturalWidth>0}).length,
      失败:bad.length, 未加载完:imgs.filter(function(i){return !i.complete}).length,
      失败样例:bad.slice(0,3).map(function(i){return i.src.slice(0,95)})});
  })()`));
  console.log('    有 src 的图片 = ' + r.总数 + '   成功 = ' + r.成功 + '   失败 = ' + r.失败 + '   还在加载 = ' + r.未加载完);
  if (r.失败样例.length) r.失败样例.forEach(s => console.log('      ❌ ' + s));
  console.log('    证书类失败 = ' + (certFails.length ? certFails.length + ' 个: ' + [...new Set(certFails)].slice(0, 2).join(' , ') : '无 ✅'));
  ws2.close();
  await closeTab(t.id);
  return r;
}

const g = await realImageCheck('映像馆（含记忆书架）', 'https://map.231060101.xyz/?' + Date.now(), 20000, 'try{setMemTab("shelf")}catch(e){}; 1');
const h = await realImageCheck('主站（全部视图）', 'https://home.xiaoaijiang.cloud/?' + Date.now(), 20000,
  'try{navigateTo("content")}catch(e){}; 1');

console.log('\n════ 结论 ════');
if (g.失败 === 0 && h.失败 === 0) console.log('  ✅ 两个站的图片全部加载成功');
else console.log('  ⚠ 映像馆失败 ' + g.失败 + ' 张，主站失败 ' + h.失败 + ' 张');
