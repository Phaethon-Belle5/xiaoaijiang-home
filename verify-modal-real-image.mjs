// ① 站上的头像在浏览器里到底加载了没 ② 弹窗用一张确定能加载的图重测
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const WORKING = 'https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
const DEAD = 'https://cdn.231060101.xyz/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E9%98%BF%E5%91%A6.webp';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?av=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));

console.log('════ ① 站上的头像 ════');
line('头像 URL', await evalJs(c, '(data.profile||{}).avatar'));
line('头像 img 的 naturalWidth', await evalJs(c, '(function(){var i=document.querySelector("img[alt*=头像],.avatar img,#avatar-img,img.avatar");if(!i){var all=document.querySelectorAll("img");for(var k=0;k<all.length;k++){if(/阿呦|cdn\\.231060101/.test(all[k].src))return "该图 natural="+all[k].naturalWidth+" src="+all[k].src.slice(0,60)}return "没找到头像 img"}return "natural="+i.naturalWidth+"x"+i.naturalHeight})()'));
line('换一张能用的图测', await evalJs(c, `(async()=>{return await new Promise(res=>{const i=new Image();i.onload=()=>res('✅ 成功 '+i.naturalWidth+'x'+i.naturalHeight);i.onerror=()=>res('❌ onerror');i.src=${JSON.stringify(WORKING)};setTimeout(()=>res('⏱ 超时'),15000)})})()`));

console.log('\n════ ② 弹窗用能加载的图重测 ════');
await evalJs(c, `(function(){
  data.dimension={subs:{films:['电影']},items:[
    {id:'w1',kind:'films',sub:'电影',title:'带真实图片的电影',creator:'导演',rating:5,review:'这是评价',thought:'这是感悟',cover:${JSON.stringify(WORKING)},date:'2026-06-01',link:''},
    {id:'w2',kind:'books',sub:'小说',title:'带真实封面的书',creator:'作者',rating:4,review:'评价',thought:'',cover:${JSON.stringify(WORKING)},date:'2026-01-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);

// 书中卡片上的封面
line('书卡片封面已加载', await evalJs(c, '(function(){var i=document.querySelector("#dim-grid .book3d-img");return i?("natural="+i.naturalWidth+"x"+i.naturalHeight+" 尺寸="+Math.round(i.getBoundingClientRect().width)+"x"+Math.round(i.getBoundingClientRect().height)):"无"})()'));

await evalJs(c, 'setDimKind("films"), 1');
await sleep(1500);
line('影视卡片封面已加载', await evalJs(c, '(function(){var i=document.querySelector("#dim-grid .book3d-img");return i?("natural="+i.naturalWidth+"x"+i.naturalHeight):"无"})()'));

await evalJs(c, 'openDimDetail(0), 1');
await sleep(5000);
line('弹窗主图 natural', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");if(!e)return "无元素";return e.naturalWidth+"x"+e.naturalHeight+" complete="+e.complete})()'));
line('弹窗主图显示尺寸', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-img");if(!e)return "无";var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
line('原图比例 vs 显示比例', await evalJs(c, `(function(){
  var e=document.querySelector(".dim-m-cover-img");if(!e||!e.naturalWidth)return "图没加载";
  var r=e.getBoundingClientRect();
  var nat=e.naturalWidth/e.naturalHeight, shown=r.width/r.height;
  return "原图比="+nat.toFixed(3)+"  显示比="+shown.toFixed(3)+"  偏差="+Math.abs(nat-shown).toFixed(3)+(Math.abs(nat-shown)<0.02?" ✅ 没有裁切/变形":" ⚠ 有偏差");
})()`));
line('衬底背景图', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-bg");return e?getComputedStyle(e).backgroundImage.slice(0,60):"无"})()'));
line('衬底可见吗', await evalJs(c, '(function(){var e=document.querySelector(".dim-m-cover-bg");var s=getComputedStyle(e);var r=e.getBoundingClientRect();return "尺寸="+Math.round(r.width)+"x"+Math.round(r.height)+" filter="+s.filter.slice(0,22)})()'));
line('内容依次淡入', await evalJs(c, '(function(){var e=document.querySelector(".dim-modal-scroll > *");var s=getComputedStyle(e);return s.animationName+" "+s.animationDuration})()'));
line('弹窗盒动画', await evalJs(c, '(function(){var e=document.querySelector(".dim-modal-box");var s=getComputedStyle(e);return "transform="+s.transform.slice(0,40)+" 过渡="+s.transitionDuration})()'));

await import('./cdp-client.mjs').then(m => m.screenshot(c, 'B:/dell/Documents/harness/shots/modal-real-image.png'));
console.log('  截图: shots/modal-real-image.png');
await closeTab(t.id);
