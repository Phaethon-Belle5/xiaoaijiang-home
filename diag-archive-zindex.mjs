// 查层级：为什么归档区那个点上命中的是 VIDEO
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/memos?z=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 160));

await evalJs(c, 'navigateTo("memos"), 1');
await sleep(2200);

console.log('════ 卡片模式下的层级 ════');
const probe = async (label) => {
  console.log('\n  --- ' + label + ' ---');
  line('该点的元素栈', await evalJs(c, `(function(){
    var e=document.getElementById("memo-archive");
    var r=e.getBoundingClientRect();
    var y=Math.round(Math.min(innerHeight-6, r.top+40));
    var x=Math.round(r.left+r.width/2);
    var list=document.elementsFromPoint(x,y).slice(0,6);
    return list.map(function(n){return n.tagName.toLowerCase()+(n.id?"#"+n.id:"")+"."+String(n.className||"").split(" ")[0]+" z="+getComputedStyle(n).zIndex}).join("  >  ");
  })()`));
};
await probe('卡片模式（未点归档）');

await evalJs(c, 'setMemoMode("archive"), 1');
await sleep(2200);
await probe('归档模式');

console.log('\n════ 背景视频/图片元素 ════');
line('有几个 video', await evalJs(c, 'document.querySelectorAll("video").length'));
line('video 详情', await evalJs(c, `(function(){
  var out=[];
  document.querySelectorAll("video").forEach(function(v,i){
    var st=getComputedStyle(v);var r=v.getBoundingClientRect();
    out.push(i+": 尺寸"+Math.round(r.width)+"x"+Math.round(r.height)+" z="+st.zIndex+" pos="+st.position+" pe="+st.pointerEvents+" opacity="+st.opacity+" 父="+(v.parentElement?(v.parentElement.id||v.parentElement.className.toString().split(" ")[0]):"?"));
  });
  return out.join("  |  ")||"没有 video";
})()`));
line('wallpaper 容器', await evalJs(c, `(function(){
  var out=[];
  ["wallpaper","bg-video","bgVideo","wp-layer","bg-layer"].forEach(function(id){
    var e=document.getElementById(id);
    if(e){var st=getComputedStyle(e);out.push("#"+id+" z="+st.zIndex+" pos="+st.position+" pe="+st.pointerEvents)}
  });
  document.querySelectorAll('[class*=wallpaper],[class*=bg-]').forEach(function(e){
    var st=getComputedStyle(e);
    if(st.position==="fixed"||st.position==="absolute")out.push("."+String(e.className).split(" ")[0]+" z="+st.zIndex+" pos="+st.position+" pe="+st.pointerEvents);
  });
  return out.slice(0,10).join("  |  ")||"没找到";
})()`));

console.log('\n════ 归档区自身的层级 ════');
line('archive 定位/层级', await evalJs(c, `(function(){
  var e=document.getElementById("memo-archive");var st=getComputedStyle(e);
  return "pos="+st.position+" z="+st.zIndex+" pe="+st.pointerEvents+" display="+st.display;
})()`));
line('祖先链定位/层级', await evalJs(c, `(function(){
  var e=document.getElementById("memo-archive");var out=[],n=e;
  while(n&&n!==document.documentElement&&out.length<6){
    var st=getComputedStyle(n);
    out.push(n.tagName.toLowerCase()+(n.id?"#"+n.id:"")+" pos="+st.position+" z="+st.zIndex+" pe="+st.pointerEvents);
    n=n.parentElement;
  }
  return out.join("  |  ");
})()`));

console.log('\n════ main 区域的层级（内容应该在上面）════');
line('main 定位/层级', await evalJs(c, `(function(){var e=document.getElementById("main");var st=getComputedStyle(e);return "pos="+st.position+" z="+st.zIndex+" pe="+st.pointerEvents})()`));
line('body 直接子元素', await evalJs(c, `(function(){
  return [].slice.call(document.body.children).map(function(e){
    var st=getComputedStyle(e);var r=e.getBoundingClientRect();
    return e.tagName.toLowerCase()+(e.id?"#"+e.id:"")+"."+String(e.className||"").split(" ")[0]+" z="+st.zIndex+" pos="+st.position+" "+Math.round(r.width)+"x"+Math.round(r.height);
  }).join("  |  ");
})()`));
line('main 里第一个可见元素', await evalJs(c, `(function(){
  var m=document.getElementById("main");var r=m.getBoundingClientRect();
  var list=document.elementsFromPoint(Math.round(innerWidth/2), Math.round(innerHeight/2)).slice(0,5);
  return list.map(function(n){return n.tagName.toLowerCase()+(n.id?"#"+n.id:"")}).join(" > ");
})()`));

await closeTab(t.id);
