// 直接盯 videoIdx 与 video 元素，确认 20 秒真的切换到下一个
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?seq=' + Date.now() });
await sleep(20000);

const snap = async () => JSON.parse(await evalJs(c, `(function(){
  var v=document.querySelector('#wp-stage video');
  var src=v?(v.currentSrc||v.src||''):'';
  var name='';
  try{ name=decodeURIComponent(String(src).split('/背景/')[1]||''); }catch(e){ name=String(src).slice(-40); }
  return JSON.stringify({
    idx: (typeof videoIdx!=='undefined'?videoIdx:'?'),
    queue: (typeof videoQueue!=='undefined'?videoQueue.length:'?'),
    name: name.slice(0,44),
    t: v?(Math.round(v.currentTime*10)/10):'?',
    paused: v?v.paused:'?',
    vids: document.querySelectorAll('#wp-stage video').length
  });
})()`));

const a = await snap();
console.log('  t=0s   videoIdx=' + a.idx + '  ' + a.name + '  currentTime=' + a.t + 's  paused=' + a.paused + '  video元素=' + a.vids);
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-webm-1.png');
await sleep(11000);
const b = await snap();
console.log('  t=11s  videoIdx=' + b.idx + '  ' + b.name + '  currentTime=' + b.t + 's');
await sleep(12000);
const cc = await snap();
console.log('  t=23s  videoIdx=' + cc.idx + '  ' + cc.name + '  currentTime=' + cc.t + 's');
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-webm-2.png');

const changed = (a.idx !== cc.idx) || (a.name && cc.name && a.name !== cc.name);
console.log('  ' + (changed ? '✅ 20 秒后确实切到了下一个背景' : '❌ 没切换'));
if (changed) console.log('     ' + a.name + '  →  ' + cc.name);
await closeTab(t.id);
