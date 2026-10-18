import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 2, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?anim=' + Date.now() });
await sleep(11000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()");
await sleep(600);
await evalJs(c, "(function(){ if(typeof openMemPop==='function')openMemPop(); return 1; })()");
await sleep(3000);
await evalJs(c, 'setMemTab("shelf"), 1');
await sleep(4000);

const pt = JSON.parse(await evalJs(c, "(function(){var b=document.querySelectorAll('.shelf3d')[1]||document.querySelector('.shelf3d');var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()"));
console.log('点书: ' + pt.x + ',' + pt.y);

// 先把封面动画定格在中间某帧，再截图
await evalJs(c, "(function(){var all=document.getAnimations?document.getAnimations():[];return all.length})()");

await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await sleep(420);

// 定格所有动画到 60%
const frozen = await evalJs(c, `(function(){
  try{
    var all=document.getAnimations?document.getAnimations():[];
    all.forEach(function(a){ try{ a.pause(); a.currentTime=Math.min((a.effect&&a.effect.getComputedTiming().duration||600)*0.72, 900); }catch(e){} });
    return all.length+' 个动画已定格';
  }catch(e){ return '❌ '+e.message; }
})()`);
console.log('定格: ' + frozen);
await sleep(300);
const { data } = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/book-opening-mid.png', Buffer.from(data, 'base64'));
console.log('已保存 shots/book-opening-mid.png');
ws2.close(); await closeTab(t.id);
