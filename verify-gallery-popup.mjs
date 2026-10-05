/**
 * 最终验证：真正打开记忆弹层，让书架图进入视口，再统计
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?' + Date.now() });
await sleep(22000);

const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 110));

console.log('════ 打开记忆书架弹层 ════');
line('调用 openMemPop', await evalJs(c, 'try{openMemPop("shelf");"ok"}catch(e){"❌ "+e.message}'));
await sleep(5000);
line('弹层是否可见', await evalJs(c, `(function(){
  var p=document.getElementById('memPanel');
  if(!p)return '没有面板';
  var r=p.getBoundingClientRect();
  return '尺寸 '+Math.round(r.width)+'x'+Math.round(r.height)+'  可见='+(r.width>0&&r.height>0);
})()`));
line('书架书数', await evalJs(c, 'document.querySelectorAll(".shelf3d").length'));

// 逐本滚进视口
const n = await evalJs(c, 'document.querySelectorAll(".shelf3d").length');
for (let i = 0; i < n; i++) {
  await evalJs(c, `(function(){var a=document.querySelectorAll('.shelf3d');if(a[${i}])a[${i}].scrollIntoView({block:'center',behavior:'instant'});return 1})()`);
  await sleep(600);
}
await sleep(5000);

const r = JSON.parse(await evalJs(c, `(function(){
  var imgs=[].slice.call(document.querySelectorAll('.shelf3d img, .sb-bottom img'));
  var done=imgs.filter(function(i){return i.complete});
  return JSON.stringify({
    总数:imgs.length,
    成功:imgs.filter(function(i){return i.naturalWidth>0}).length,
    失败:imgs.filter(function(i){return i.complete&&i.naturalWidth===0}).length,
    未完成:imgs.filter(function(i){return !i.complete}).length,
    尺寸样例:imgs.slice(0,3).map(function(i){return i.naturalWidth+'x'+i.naturalHeight})
  });
})()`));
console.log('\n  书架封面图：共 ' + r.总数 + ' 张，成功 ' + r.成功 + ' 张，失败 ' + r.失败 + ' 张，未加载完 ' + r.未完成 + ' 张');
if (r.尺寸样例.length) console.log('  尺寸样例：' + r.尺寸样例.join('  '));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-shelf-images.png');
console.log('  截图: shots/gallery-shelf-images.png');

console.log('\n════ 再进相册看城市照片 ════');
await evalJs(c, 'try{closeMemPop&&closeMemPop()}catch(e){}; try{openCityDetail&&openCityDetail(CITIES[0])}catch(e){}; 1');
await sleep(6000);
const g = JSON.parse(await evalJs(c, `(function(){
  var imgs=[].slice.call(document.querySelectorAll('img')).filter(function(i){return i.src&&i.src.indexOf('data:')!==0});
  return JSON.stringify({总数:imgs.length, 成功:imgs.filter(function(i){return i.naturalWidth>0}).length, 未完成:imgs.filter(function(i){return !i.complete}).length});
})()`));
console.log('  页面图片：共 ' + g.总数 + ' 张，成功 ' + g.成功 + ' 张，未加载完 ' + g.未完成 + ' 张');
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-album-images.png');
console.log('  截图: shots/gallery-album-images.png');

console.log('\n════ 结论 ════');
console.log(r.成功 > 0 && r.失败 === 0 ? '  ✅ 书架封面图正常加载' : (r.失败 > 0 ? '  ❌ 仍有 ' + r.失败 + ' 张失败' : '  ⚠ 未加载完（可能仍在加载中）'));
await closeTab(t.id);
