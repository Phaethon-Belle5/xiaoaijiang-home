// 细查弹窗：① 图片为什么没加载 ② 依次淡入规则到底在不在
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?img=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 150));

console.log('════ ① 图片能不能加载 ════');
const URL_ = 'https://cdn.231060101.xyz/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E9%98%BF%E5%91%A6.webp';
line('在页面里 fetch 这张图', await evalJs(c, `(async()=>{try{const r=await fetch(${JSON.stringify(URL_)});const b=await r.blob();return 'HTTP '+r.status+'  '+b.size+' 字节  type='+b.type}catch(e){return '❌ '+e.message}})()`));
line('用 Image 加载', await evalJs(c, `(async()=>{return await new Promise(res=>{const i=new Image();i.onload=()=>res('✅ 成功 '+i.naturalWidth+'x'+i.naturalHeight);i.onerror=()=>res('❌ onerror');i.src=${JSON.stringify(URL_)};setTimeout(()=>res('⏱ 超时'),9000)})})()`));

console.log('\n════ ② 打开弹窗，等久一点看图 ════');
await evalJs(c, `(function(){
  data.dimension={subs:{films:['电影']},items:[
    {id:'p1',kind:'films',sub:'电影',title:'带图的电影',creator:'导演',rating:5,review:'评价文字',thought:'感悟',cover:${JSON.stringify(URL_)},date:'2026-06-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, 'setDimKind("films"), 1');
await sleep(1500);
await evalJs(c, 'openDimDetail(0), 1');
for (const w of [2000, 4000, 6000]) {
  await sleep(w);
  line('等 ' + (w / 1000) + 's 后', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");if(!e)return "无图元素";return "natural="+e.naturalWidth+"x"+e.naturalHeight+" complete="+e.complete+" 尺寸="+Math.round(e.getBoundingClientRect().width)+"x"+Math.round(e.getBoundingClientRect().height)+" display="+getComputedStyle(e).display})()'));
}

console.log('\n════ ③ 依次淡入规则（规范化后查找）════');
line('动画规则', await evalJs(c, `(function(){
  var found=[];
  for(var i=0;i<document.styleSheets.length;i++){
    try{var rs=document.styleSheets[i].cssRules;
      for(var j=0;j<rs.length;j++){
        var st=rs[j].selectorText||"";
        if(st.indexOf("dim-modal-scroll")>=0&&st.indexOf("*")>=0)found.push(st+" { "+rs[j].style.animation+" }");
        if(st.indexOf("dimMIn")>=0)found.push(st+" { "+rs[j].style.animation+" }");
      }
    }catch(e){}
  }
  return found.join("  |  ")||"❌ 没找到";
})()`));
line('keyframes 是否存在', await evalJs(c, `(function(){
  for(var i=0;i<document.styleSheets.length;i++){
    try{var rs=document.styleSheets[i].cssRules;
      for(var j=0;j<rs.length;j++){if(rs[j].type===7&&/dimMIn/.test(rs[j].name))return "✅ 有 dimMIn";}
    }catch(e){}
  }
  return "❌ 无";
})()`));
line('实际计算出的 animation', await evalJs(c, '(function(){var e=document.querySelector(".dim-modal-scroll > *");if(!e)return "无子元素";var s=getComputedStyle(e);return s.animationName+" "+s.animationDuration+" delay="+s.animationDelay})()'));
line('子元素个数', await evalJs(c, 'document.querySelectorAll(".dim-modal-scroll > *").length'));

console.log('\n════ ④ 主图的显示规则 ════');
line('object-fit', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");return e?getComputedStyle(e).objectFit:"无"})()'));
line('max 尺寸', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");if(!e)return "无";var s=getComputedStyle(e);return "maxW="+s.maxWidth+" maxH="+s.maxHeight})()'));
line('衬底 filter', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-bg");return e?getComputedStyle(e).filter:"无"})()'));

await closeTab(t.id);
