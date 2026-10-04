import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(()=>{});
await c.send('Storage.clearDataForOrigin', { origin: 'https://map.231060101.xyz', storageTypes: 'all' }).catch(()=>{});
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?ld=' + Date.now() });
await sleep(24000);
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stream"]');if(b)b.click();return 1})()`);

const probe = `(function(){
  try{
    var f=document.querySelector('.stream-frame'), w=f.contentWindow, d=f.contentDocument;
    return JSON.stringify({
      时间: Date.now()%100000,
      加载进度: (d.getElementById('loader')||{style:{}}).style.getPropertyValue('--p')||'(无)',
      ready: d.body.classList.contains('ready'),
      undertow: !!w.__undertow,
      count: (d.getElementById('photo-count')||{}).textContent
    });
  }catch(e){return 'ERR '+e.message}
})()`;

for (let i = 1; i <= 10; i++) {
  await sleep(7000);
  console.log('  ' + i + '×7s  ' + await evalJs(c, probe));
}
await closeTab(t.id);
