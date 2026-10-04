import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const errs = [];
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.addEventListener('message', ev => {
  try {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errs.push('行' + d.lineNumber + ':' + d.columnNumber + '  ' + String(d.exception && d.exception.description || d.text).split('\n').slice(0, 3).join(' / ').slice(0, 220));
    }
    if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) {
      errs.push('[' + m.params.type + '] ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 200));
    }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?er=' + Date.now() });
await sleep(24000);
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stream"]');if(b)b.click();return 1})()`);
await sleep(60000);

console.log('=== iframe 内的报错 ===');
console.log(errs.length ? errs.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n=== iframe 内状态 ===');
console.log('  ' + await evalJs(c, `(function(){
  try{
    var f=document.querySelector('.stream-frame'), w=f.contentWindow;
    return JSON.stringify({
      undertow: !!w.__undertow,
      countText: f.contentDocument.getElementById('photo-count').textContent,
      errorBox: (function(){var e=f.contentDocument.getElementById('error');return e&&!e.hidden?e.textContent.slice(0,150):'(无)'})(),
      目录项: f.contentDocument.querySelectorAll('.directory-grid button').length
    });
  }catch(e){return 'ERR '+e.message}
})()`));
console.log('\n=== iframe 内直接调用桥看结果 ===');
console.log('  ' + await evalJs(c, `(async()=>{
  try{
    var w=document.querySelector('.stream-frame').contentWindow;
    var cat=await w.parent.TravelPhotoStreamBridge.readCatalog();
    var l1=(cat.levels||[[]])[0]||[];
    var photoIds=l1[0]?l1[0].photoIds:[];
    var byId=new Map((cat.photos||[]).map(function(p,i){return [String(p.id),i]}));
    var miss=photoIds.filter(function(id){return !byId.has(String(id))});
    return JSON.stringify({ 第一层条数:l1.length, 首条photoIds数:photoIds.length, 前3个id:photoIds.slice(0,3), 照片前3个id:(cat.photos||[]).slice(0,3).map(function(p){return p.id}), 匹配不上的数:miss.length });
  }catch(e){return 'ERR '+e.message}
})()`));
ws2.close();
await closeTab(t.id);
