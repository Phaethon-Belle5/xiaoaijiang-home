// 最终确认：两个站的图片能正常显示
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

for (const [label, url, prep, wait] of [
  ['主站（内容分区）', 'https://home.xiaoaijiang.cloud/', 'try{navigateTo("content")}catch(e){}; 1', 21000],
  ['映像馆（记忆书架弹层）', 'https://map.231060101.xyz/', 'try{openMemPop("shelf")}catch(e){}; 1', 21000],
]) {
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.navigate', { url: url + '?f=' + Date.now() });
  await sleep(wait);
  await evalJs(c, prep);
  await sleep(5000);
  // 逐张滚进视口，触发懒加载
  const n = await evalJs(c, 'document.querySelectorAll("img").length');
  for (let i = 0; i < Math.min(n, 20); i++) {
    await evalJs(c, `(function(){var a=document.querySelectorAll('img');if(a[${i}])a[${i}].scrollIntoView({block:'center',behavior:'instant'});return 1})()`);
    await sleep(350);
  }
  await sleep(4000);
  const r = JSON.parse(await evalJs(c, `(function(){
    var a=[].slice.call(document.querySelectorAll('img')).filter(function(i){return i.src&&i.src.indexOf('data:')!==0});
    return JSON.stringify({n:a.length, ok:a.filter(function(i){return i.naturalWidth>0}).length,
      bad:a.filter(function(i){return i.complete&&i.naturalWidth===0&&i.src.indexOf(location.host)<0}).length});
  })()`));
  console.log('  ' + (r.ok === r.n ? '✅' : '⚠ ') + ' ' + label.padEnd(24) + ' 图片 ' + r.ok + '/' + r.n + ' 张成功' + (r.bad ? '，失败 ' + r.bad + ' 张' : ''));
  await closeTab(t.id);
}
