/**
 * 修完后验证：两个站的图片是否真的能显示了
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

async function checkImages(label, url, waitMs) {
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));
  const certFails = [];
  const reqs = new Map();
  ws2.addEventListener('message', (ev) => {
    try { const m = JSON.parse(ev.data);
      if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, m.params.request.url);
      if (m.method === 'Network.loadingFailed' && /CERT|SSL/i.test(m.params.errorText || '')) certFails.push((reqs.get(m.params.requestId) || '?') + '  →  ' + m.params.errorText);
    } catch (e) {}
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url });
  await sleep(waitMs);

  const r = await evalJs(c, `(function(){
    var imgs=[].slice.call(document.querySelectorAll('img'));
    return JSON.stringify({
      总数: imgs.length,
      成功: imgs.filter(function(i){return i.naturalWidth>0}).length,
      失败: imgs.filter(function(i){return i.complete&&i.naturalWidth===0}).length,
      失败样例: (imgs.filter(function(i){return i.complete&&i.naturalWidth===0})[0]||{}).src||''
    });
  })()`);
  const o = JSON.parse(r);
  console.log('\n  ' + label);
  console.log('    图片总数 = ' + o.总数 + '   成功 = ' + o.成功 + '   失败 = ' + o.失败);
  if (o.失败样例) console.log('    失败样例 = ' + o.失败样例.slice(0, 100));
  console.log('    证书类失败 = ' + (certFails.length ? certFails.length + ' 个\n      ' + certFails.slice(0, 3).join('\n      ') : '无 ✅'));
  ws2.close();
  await closeTab(t.id);
  return o;
}

console.log('════ 映像馆 ════');
const g = await checkImages('映像馆 map.231060101.xyz', 'https://map.231060101.xyz/?v=' + Date.now(), 22000);
// 再进记忆书架看照片
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?' + Date.now() });
await sleep(20000);
await evalJs(c, 'try{setMemTab("shelf")}catch(e){}; 1');
await sleep(3000);
console.log('  记忆书架里的封面图：' + await evalJs(c, `(function(){
  var imgs=[].slice.call(document.querySelectorAll('.shelf3d img, .sb-bottom img'));
  if(!imgs.length)return '没有找到';
  return '共 '+imgs.length+' 张，成功 '+imgs.filter(function(i){return i.naturalWidth>0}).length+' 张';
})()`));
await closeTab(t.id);

console.log('\n════ 主站 ════');
const h = await checkImages('主站 home.xiaoaijiang.cloud', 'https://home.xiaoaijiang.cloud/?v=' + Date.now(), 22000);
console.log('  头像：' + h.成功 + '/' + h.总数 + ' 张成功');

console.log('\n════ 结论 ════');
if (g.失败 === 0 && h.失败 === 0) console.log('  ✅ 两个站的图片全部加载成功，问题已解决');
else console.log('  ⚠ 仍有失败：映像馆 ' + g.失败 + ' 张，主站 ' + h.失败 + ' 张');
