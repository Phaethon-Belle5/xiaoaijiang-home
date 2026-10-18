import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', ev => { try { const m = JSON.parse(ev.data); if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 130)); } } catch (e) {} });
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1.5, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?v3=' + Date.now() });
await sleep(12000);
await evalJs(c, "(function(){var l=document.getElementById('launch');if(l)l.remove();return 1})()");
await sleep(600);
await evalJs(c, "(function(){ if(typeof openMemPop==='function')openMemPop(); return 1; })()");
await sleep(3200);
console.log('=== 内容面积（加宽后）===');
const geo = JSON.parse(await evalJs(c, `(function(){
  var box=document.querySelector('.mp-box'), body=document.querySelector('.mp-body');
  var vb=box?box.getBoundingClientRect():null;
  return JSON.stringify({视口:innerWidth+'x'+innerHeight, 面板:vb?Math.round(vb.width)+'x'+Math.round(vb.height):'-',
    占宽:vb?Math.round(vb.width/innerWidth*100)+'%':'-', 内容区:body?Math.round(body.getBoundingClientRect().width)+'px':'-'});
})()`));
console.log(JSON.stringify(geo));
await evalJs(c, 'setMemTab("images"), 1');
await sleep(5000);
console.log('\n=== 旅途影像的三个入口 ===');
console.log('  按钮: ' + await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".ti-actions button")).map(function(b){return b.textContent.trim()}))'));
console.log('  穹顶瓦片: ' + await evalJs(c, 'document.querySelectorAll(".dg-item").length'));
// 逐个打开三个场景
for (const [name, fn] of [['年轮照片/照片墙','memOpenAtlas'],['伞幕照片','memOpenCanopy'],['旅行年轮树','memOpenTree']]) {
  await evalJs(c, fn + '(), 1');
  await sleep(9000);
  const st = JSON.parse(await evalJs(c, `(function(){
    var layer=document.getElementById('memFrameLayer'), host=document.getElementById('mflHost');
    var f=host?host.querySelector('iframe'):null;
    return JSON.stringify({层显示:layer?!layer.hidden:false, 有iframe:!!f,
      标题:(document.getElementById('mflTitle')||{}).textContent||'',
      iframe文档:(function(){try{var d=f.contentDocument;return d?(d.body.innerText||'').replace(/\\s+/g,' ').slice(0,110):'(无)'}catch(e){return '(跨域)'}})()});
  })()`));
  console.log('  ' + name + ': ' + JSON.stringify(st));
  if (name === '伞幕照片') {
    const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
    const fs = await import('node:fs/promises');
    await fs.writeFile('B:/dell/Documents/harness/shots/scene-canopy.png', Buffer.from(data, 'base64'));
  }
  if (name === '旅行年轮树') {
    const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
    const fs = await import('node:fs/promises');
    await fs.writeFile('B:/dell/Documents/harness/shots/scene-tree.png', Buffer.from(data, 'base64'));
  }
  await evalJs(c, 'memCloseFrame(), 1');
  await sleep(1200);
}
console.log('\n异常: ' + (errs.length ? errs.slice(0,5).join(' | ') : '无'));
ws2.close(); await closeTab(t.id);
