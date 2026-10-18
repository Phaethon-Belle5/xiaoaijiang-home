import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); } } catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 950, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?fix=' + Date.now() });
await sleep(12000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()");
await sleep(800);

console.log('=== ① 面板是否被导航挡住 ===');
console.log('  #topnav z-index: ' + await evalJs(c, 'getComputedStyle(document.getElementById("topnav")).zIndex'));
console.log('  .mem-pop z-index: ' + await evalJs(c, '(function(){var e=document.querySelector(".mem-pop");return e?getComputedStyle(e).zIndex:"无"})()'));
console.log('  首页按钮: ' + await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".ml-btn")).map(function(b){return b.textContent.trim()}))'));
console.log('  地图初始 zoom: ' + await evalJs(c, '(function(){try{return mapChart.getOption().geo[0].zoom}catch(e){return "?"}})()'));

console.log('\n=== ② 打开面板看标签栏是否完整 ===');
await evalJs(c, "openMemPop('images'), 1");
await sleep(4000);
const top = JSON.parse(await evalJs(c, `(function(){
  var bar=document.querySelector('.mp-tabs');
  var r=bar?bar.getBoundingClientRect():null;
  var nav=document.getElementById('topnav').getBoundingClientRect();
  var hit=r?document.elementFromPoint(Math.round(r.left+20), Math.round(r.top+r.height/2)):null;
  return JSON.stringify({标签栏位置:r?Math.round(r.top):'-', 导航底:Math.round(nav.bottom),
    命中:hit?(hit.tagName+'.'+String(hit.className).split(' ')[0]):'null',
    标签数:document.querySelectorAll('.mp-tab[data-mem]').length});
})()`));
console.log('  ' + JSON.stringify(top));

console.log('\n=== ③ 穹顶照片占比 ===');
await sleep(3500);
console.log('  穹顶瓦片: ' + await evalJs(c, 'document.querySelectorAll(".dg-item").length'));
await evalJs(c, "memOpenAtlas(), 1");
await sleep(8000);
console.log('  全屏层返回按钮: ' + await evalJs(c, '(function(){var b=document.querySelector(".mfl-close");return b?b.textContent.trim():"无"})()'));
await evalJs(c, "memCloseFrame(), 1");
await sleep(1500);

console.log('\n=== ④ 书架书脊姿态 ===');
await evalJs(c, "setMemTab('shelf'), 1");
await sleep(5000);
const shelf = JSON.parse(await evalJs(c, `(function(){
  var bs=[...document.querySelectorAll('#memPanel .memory-book')];
  return JSON.stringify({书数:bs.length, active数:bs.filter(b=>b.classList.contains('active')).length,
    第一本宽:bs[0]?Math.round(bs[0].getBoundingClientRect().width):0,
    第二本宽:bs[1]?Math.round(bs[1].getBoundingClientRect().width):0});
})()`));
console.log('  ' + JSON.stringify(shelf));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/shelf-spine.png', Buffer.from(data, 'base64'));
console.log('  截图: shots/shelf-spine.png');

console.log('\n异常: ' + (errs.length ? errs.slice(0,5).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
