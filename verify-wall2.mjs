import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type==='error'||m.params.type==='warning')) errs.push((m.params.args||[]).map(a=>a.value||'').join(' ').slice(0,130));
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push('[throw] ' + String(d.exception&&d.exception.description||d.text).split('\n')[0].slice(0,130)); }
} catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?wall=' + Date.now() });
await sleep(13000);
console.log('PhotoWall 已加载: ' + await evalJs(c, 'typeof window.PhotoWall'));
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(600);
await evalJs(c, "openMemPop('images'), 1");
await sleep(4000);
console.log('按钮: ' + await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".ti-actions button")).map(function(b){return b.textContent.trim()}))'));
await evalJs(c, 'memOpenWall(), 1');
await sleep(3500);
const st = JSON.parse(await evalJs(c, `(function(){
  var v=document.getElementById('pwViewer');
  if(!v) return JSON.stringify({err:'没有查看器'});
  var main=v.querySelector('.photo-card.main img');
  return JSON.stringify({
    显示:v.classList.contains('show'),
    模式:v.className,
    卡片数:v.querySelectorAll('.photo-card').length,
    主卡有图:!!(main&&main.src&&main.naturalWidth>0),
    主卡尺寸:main?main.naturalWidth+'x'+main.naturalHeight:'-',
    计数:(v.querySelector('.pw-count')||{}).textContent||'',
    上一张:!!v.querySelector('.nav-prev'), 下一张:!!v.querySelector('.nav-next')
  });
})()`));
console.log(JSON.stringify(st, null, 1));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/photo-wall.png', Buffer.from(data, 'base64'));
console.log('截图: shots/photo-wall.png');
// 点下一张
await evalJs(c, "(function(){var b=document.querySelector('.img-viewer .nav-next');if(b)b.click();return 1})()");
await sleep(1500);
console.log('下一张后计数: ' + await evalJs(c, "(document.querySelector('.pw-count')||{}).textContent||'无'"));
await evalJs(c, 'window.PhotoWall.close(), 1');
await sleep(800);
console.log('关闭后 show: ' + await evalJs(c, "(document.getElementById('pwViewer')||{}).classList ? document.getElementById('pwViewer').classList.contains('show') : '无'"));
console.log('错误: ' + (errs.length ? errs.slice(0,3).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
