import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?ct=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('time'), 1");
await sleep(4000);
console.log(await evalJs(c, `(function(){
  var tr=document.getElementById('tlTrack');
  var wrap=tr?tr.parentElement:null;
  if(!tr||!wrap)return '无';
  var wr=wrap.getBoundingClientRect(), trr=tr.getBoundingClientRect();
  var n0=document.querySelector('#memPanel .tl-node').getBoundingClientRect();
  var ns=document.querySelectorAll('#memPanel .tl-node');
  var lastRow=ns[6].getBoundingClientRect();   // 第一行最后一个
  return JSON.stringify({
    容器宽:Math.round(wr.width), 轨道宽:Math.round(trr.width),
    左留白:Math.round(trr.left-wr.left),
    右留白:Math.round(wr.right-trr.right),
    有缩放:tr.style.transform||'(无)',
    首节点左:Math.round(n0.left-wr.left),
    第一行末节点右:Math.round(wr.right-lastRow.right)
  });
})()`));
const fs = await import('node:fs/promises');
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/timeline-center.png', Buffer.from(data, 'base64'));
console.log('截图已存');
ws2.close(); await closeTab(t.id);
