// 验证线宽不再压过间距（防止加法混叠导致过曝/横向挤压）
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Network.clearBrowserCache').catch(() => {});
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?w=' + Date.now() });
await sleep(24000);
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stream"]');if(b)b.click();return 1})()`);
await sleep(45000);

const probe = `(function(){
  try{
    var w=document.querySelector('.stream-frame').contentWindow;
    var u=w.__undertow;
    if(!u) return 'undertow 不存在';
    var out={};
    // 从渲染帧里取的常量不在 window 上，这里用 x0 反推间距
    var xs=[].slice.call(u.fib.x0).filter(function(v){return v<1000});
    var spacing = xs.length>1 ? Math.abs(xs[1]-xs[0]) : 0;
    out.线条数=xs.length;
    out.间距=Math.round(spacing*1000)/1000;
    out.首尾坐标=[Math.round(xs[0]*100)/100, Math.round(xs[xs.length-1]*100)/100];
    out.跨度=Math.round((xs[xs.length-1]-xs[0])*100)/100;
    out.层级=u.level;
    out.标签=[].slice.call(document.querySelector('.stream-frame').contentDocument.querySelectorAll('#city-labels span')).map(function(e){return e.textContent}).filter(Boolean);
    out.错误=(function(){var e=document.querySelector('.stream-frame').contentDocument.getElementById('error');return e&&!e.hidden?e.textContent:'无'})();
    return JSON.stringify(out);
  }catch(e){return 'ERR '+e.message}
})()`;
console.log('  ' + await evalJs(c, probe));
await closeTab(t.id);
