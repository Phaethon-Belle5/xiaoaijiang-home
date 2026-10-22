import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type==='error'||m.params.type==='warning')) errs.push((m.params.args||[]).map(a=>a.value||'').join(' ').slice(0,140));
} catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?wg=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(600);
await evalJs(c, "openMemPop('images'), 1");
await sleep(4000);
await evalJs(c, 'memOpenWall(), 1');
await sleep(4000);
const grid = JSON.parse(await evalJs(c, `(function(){
  var v=document.getElementById('pwViewer');
  return JSON.stringify({模式:window.PhotoWall.getMode(), 类:v.className,
    相框数:v.querySelectorAll('.curtain-panel').length, 有挂杆:v.querySelectorAll('.curtain-rod').length,
    切换按钮:(v.querySelector('.pw-toggle')||{}).textContent||''});
})()`));
console.log('网格态: ' + JSON.stringify(grid));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/wall-grid.png', Buffer.from(data, 'base64'));
console.log('截图: shots/wall-grid.png');
// 点第 3 张 → 应切到堆叠
await evalJs(c, "(function(){var p=document.querySelectorAll('#pwViewer .curtain-panel')[2];if(p)p.click();return 1})()");
await sleep(2500);
const stack = JSON.parse(await evalJs(c, `(function(){
  var v=document.getElementById('pwViewer');
  return JSON.stringify({模式:window.PhotoWall.getMode(), 类:v.className,
    墙隐藏:v.querySelector('[data-pw-wall]').hidden, 计数:(v.querySelector('.pw-count')||{}).textContent||''});
})()`));
console.log('点第3张后: ' + JSON.stringify(stack));
const { data: d2 } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/wall-stack.png', Buffer.from(d2, 'base64'));
console.log('截图: shots/wall-stack.png');
// 切回网格
await evalJs(c, "(function(){var b=document.querySelector('#pwViewer .pw-toggle');if(b)b.click();return 1})()");
await sleep(2000);
console.log('切回后模式: ' + await evalJs(c, 'window.PhotoWall.getMode()'));
console.log('错误: ' + (errs.length ? errs.slice(0,3).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
