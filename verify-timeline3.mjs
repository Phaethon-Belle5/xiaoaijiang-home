import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs=[];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data);
  if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;errs.push(String(d.exception&&d.exception.description||d.text).split('\n')[0].slice(0,140));}
} catch(e){} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?tc=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('time'), 1");
await sleep(4000);
const st = JSON.parse(await evalJs(c, `(function(){
  var tr=document.getElementById('tlTrack');
  var wrap=tr?tr.parentElement:null;
  var n0=document.querySelector('#memPanel .tl-node');
  var r0=n0?n0.getBoundingClientRect():null;
  var trr=tr?tr.getBoundingClientRect():null;
  var wr=wrap?wrap.getBoundingClientRect():null;
  var ns=document.querySelectorAll('#memPanel .tl-node');
  var last=ns[ns.length-1];
  return JSON.stringify({
    轨道宽:trr?Math.round(trr.width):'-',
    容器宽:wr?Math.round(wr.width):'-',
    首个节点左:r0?Math.round(r0.left):'-',
    容器左:wr?Math.round(wr.left):'-',
    左留白:r0&&wr?Math.round(r0.left-wr.left):'-',
    节点:ns.length,
    末节点左:last?Math.round(last.getBoundingClientRect().left):'-',
    可点:(function(){var cs=n0?getComputedStyle(n0).pointerEvents:'-';return cs})(),
    光标:(function(){var cs=n0?getComputedStyle(n0).cursor:'-';return cs})()
  });
})()`));
console.log(JSON.stringify(st, null, 1));
const fs = await import('node:fs/promises');
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/timeline-3.png', Buffer.from(data, 'base64'));
console.log('截图: shots/timeline-3.png');
// 点第一个城市
await evalJs(c, "(function(){var n=document.querySelector('#memPanel .tl-node');if(n)n.click();return 1})()");
await sleep(3500);
const after = await evalJs(c, `(function(){
  var box=document.querySelector('#cityDetail,.det-layer,.city-detail,.detail-layer');
  var any=[].slice.call(document.querySelectorAll('[id]')).filter(function(e){return /detail|city/i.test(e.id)}).map(function(e){return e.id+':'+(getComputedStyle(e).display!=='none')});
  return JSON.stringify({详情层:!!box, 可能元素:any.slice(0,8)});
})()`);
console.log('点击后: ' + after);
const { data: d2 } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/timeline-click.png', Buffer.from(d2, 'base64'));
console.log('错误: ' + (errs.length ? errs.slice(0,2).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
