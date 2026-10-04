import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(() => {});
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?e2=' + Date.now() });
await sleep(24000);
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stream"]');if(b)b.click();return 1})()`);
await sleep(50000);

const probe = `(function(){
  var out={};
  try{
    var f=document.querySelector('.stream-frame');
    var d=f.contentDocument, w=f.contentWindow;
    var e=d.getElementById('error');
    out.errText = e ? e.textContent : '(no el)';
    out.errHidden = e ? e.hidden : null;
    out.dirHidden = d.getElementById('photo-directory').hidden;
    out.bodyClass = d.body.className;
    out.undertow = !!w.__undertow;
    out.count = d.getElementById('photo-count').textContent;
  }catch(x){ out.fatal = String(x && x.message) }
  return JSON.stringify(out);
})()`;
console.log('  ' + await evalJs(c, probe));
await closeTab(t.id);
