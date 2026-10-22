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
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?fs=' + Date.now() });
await sleep(13000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 0})()");
await sleep(700);
await evalJs(c, "openMemPop('images'), 1");
await sleep(7000);
console.log('① 全屏按钮: ' + await evalJs(c, '(function(){var b=document.querySelector(".dome-fs-btn");return b?b.textContent.trim():"❌ 没有"})()'));
const fs = await import('node:fs/promises');
// 点全屏
await evalJs(c, 'memDomeFullscreen(), 1');
await sleep(3500);
const st = JSON.parse(await evalJs(c, `(function(){
  var d=document.querySelector('#memPanel .life-photo-dome');
  var b=document.querySelector('.dome-fs-btn');
  var r=d?d.getBoundingClientRect():null;
  var br=b?b.getBoundingClientRect():null;
  return JSON.stringify({全屏类:d?d.classList.contains('dome-fs'):false,
    尺寸:r?Math.round(r.width)+'x'+Math.round(r.height):'-',
    按钮文字:b?b.textContent.trim():'-',
    按钮位置:br?Math.round(br.left)+','+Math.round(br.top):'-',
    在右上角:br?(br.left>innerWidth*0.8&&br.top<80):false});
})()`));
console.log('② 全屏后: ' + JSON.stringify(st));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
await fs.writeFile('B:/dell/Documents/harness/shots/dome-fullscreen.png', Buffer.from(data, 'base64'));
console.log('  截图: shots/dome-fullscreen.png');
// 点返回
await evalJs(c, 'memDomeFullscreen(), 1');
await sleep(2500);
const st2 = JSON.parse(await evalJs(c, `(function(){
  var d=document.querySelector('#memPanel .life-photo-dome');
  var b=document.querySelector('.dome-fs-btn');
  var r=d?d.getBoundingClientRect():null;
  return JSON.stringify({全屏类:d?d.classList.contains('dome-fs'):false,
    尺寸:r?Math.round(r.width)+'x'+Math.round(r.height):'-', 按钮文字:b?b.textContent.trim():'-'});
})()`));
console.log('③ 返回后: ' + JSON.stringify(st2));
console.log('错误: ' + (errs.length ? errs.slice(0,3).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
