import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const BASE = 'https://95e1e566.map-gallery-ewt.pages.dev';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: BASE + '/?e=' + Date.now() });
await sleep(26000);
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stream"]');if(b)b.click();return 1})()`);
await sleep(50000);

console.log('  ' + await evalJs(c, `(function(){
  try{
    var f=document.querySelector('.stream-frame'), d=f.contentDocument, w=f.contentWindow;
    var e=d.getElementById('error');
    var u=w.__undertow;
    var out={ 错误: e&&!e.hidden?e.textContent.slice(0,60):'无', undertow: !!u, 层级: u?u.level:null,
                计数: d.getElementById('photo-count').textContent };
    if(u){
      var xs=[].slice.call(u.fib.x0).filter(function(v){return v<1000});
      out.线条数 = xs.length;
      out.间距 = xs.length>1 ? Math.round(Math.abs(xs[1]-xs[0])*1000)/1000 : 0;
      out.线宽_估算 = Math.round(Math.min(4.5, 0.88*(xs.length>1?Math.abs(xs[1]-xs[0]):0))*100)/100;
      out.是否重叠 = out.线宽_估算 >= out.间距 ? '❌ 重叠（会过曝）' : '✅ 不重叠';
      out.线条颜色 = u.stories.slice(0,xs.length).map(function(s){return s.rgb}).join(' | ');
      out.亮度检查 = u.stories.slice(0,xs.length).map(function(s){
        var L = (Math.max.apply(null,s.col)+Math.min.apply(null,s.col))/2;
        return L.toFixed(2);
      }).join(' ');
    }
    return JSON.stringify(out,null,1);
  }catch(x){return 'ERR '+x.message}
})()`));
await closeTab(t.id);
