// 看清主站那几张"未成功"的图到底是什么
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?img=' + Date.now() });
await sleep(21000);
await evalJs(c, 'try{navigateTo("content")}catch(e){}; 1');
await sleep(4000);

const n = await evalJs(c, 'document.querySelectorAll("img").length');
for (let i = 0; i < Math.min(n, 20); i++) {
  await evalJs(c, `(function(){var a=document.querySelectorAll('img');if(a[${i}])a[${i}].scrollIntoView({block:'center',behavior:'instant'});return 1})()`);
  await sleep(400);
}
await sleep(4000);

const list = JSON.parse(await evalJs(c, `(function(){
  return JSON.stringify([].slice.call(document.querySelectorAll('img')).map(function(i,idx){
    return { i:idx, ok:i.naturalWidth>0, complete:i.complete, w:i.naturalWidth,
      cls:String(i.className||''), alt:String(i.alt||'').slice(0,12),
      src:(i.getAttribute('src')||'(无src属性)').slice(0,96),
      sameAsPage: i.src.indexOf(location.origin)===0 };
  }));
})()`));

const line = (x) => console.log('  ' + String(x.i).padStart(2) + '. ' + (x.ok ? '✅' : '❌') +
  '  ' + String(x.w).padStart(4) + 'px  ' + (x.cls || '(无class)').padEnd(22) + '  ' + x.src);

console.log('════ 主站所有 img ════');
list.forEach(line);

const bad = list.filter(x => !x.ok);
console.log('\n════ 未成功的 ' + bad.length + ' 张分析 ════');
if (!bad.length) console.log('  （没有）');
bad.forEach(x => {
  const isPlaceholder = x.src.indexOf('home.xiaoaijiang.cloud') >= 0 || x.src === '(无src属性)';
  console.log('  ' + (isPlaceholder ? '⚠ 占位/未设置（不是加载失败）' : '❌ 真的加载失败') + '  ' + x.src.slice(0, 90));
});

console.log('\n════ 结论 ════');
const realFail = bad.filter(x => x.src.indexOf('home.xiaoaijiang.cloud') < 0 && x.src !== '(无src属性)');
console.log(realFail.length ? '  ❌ 有 ' + realFail.length + ' 张真的失败' : '  ✅ 没有真正加载失败的图片（其余是未设置 src 的占位）');
await closeTab(t.id);
