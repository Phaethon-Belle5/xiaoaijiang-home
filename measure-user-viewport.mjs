/**
 * 用用户真实视口(1528x746)测量：更新日志卡和标签栏到底可见吗、在什么位置、有没有被遮住
 * 关键：elementFromPoint 能查出是否被别的元素盖住；computed opacity 能查出是否被动画藏住
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/home?geo=' + Date.now() });
await sleep(20000);

const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + v);

console.log('════ 首页：更新日志卡 ════');
line('页面总高', await evalJs(c, 'document.body.scrollHeight'));
const geo = await evalJs(c, `(function(){
  var e=document.querySelector('.log-card');
  if(!e)return JSON.stringify({found:false});
  var r=e.getBoundingClientRect(), st=getComputedStyle(e);
  // 往上找有没有被动画/透明度隐藏的祖先
  var hiddenAncestor=null, n=e;
  while(n && n!==document.body){
    var s=getComputedStyle(n);
    if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.5){ hiddenAncestor=(n.className||n.tagName)+' display='+s.display+' visibility='+s.visibility+' opacity='+s.opacity; break; }
    n=n.parentElement;
  }
  return JSON.stringify({
    found:true,
    文档内高度: Math.round(r.top+scrollY),
    视口内top: Math.round(r.top),
    尺寸: Math.round(r.width)+'x'+Math.round(r.height),
    在首屏内: r.top>=0 && r.bottom<=innerHeight,
    自身opacity: st.opacity, 自身display: st.display, 自身visibility: st.visibility,
    隐藏祖先: hiddenAncestor,
    条目数: e.querySelectorAll('.log-item').length,
    标题: (e.querySelector('.log-title')||{}).textContent
  });
})()`);
console.log('  ' + geo);

// 滚到卡片位置，再看是否真的可见、是否被遮住
await evalJs(c, 'document.querySelector(".log-card").scrollIntoView({block:"center"}); 1');
await sleep(1500);
const vis = await evalJs(c, `(function(){
  var e=document.querySelector('.log-card');
  var r=e.getBoundingClientRect();
  var cx=Math.round(r.left+r.width/2), cy=Math.round(r.top+r.height/2);
  var top=document.elementFromPoint(cx,cy);
  var covered = top && !e.contains(top) && top!==e;
  return JSON.stringify({
    滚动后视口内top: Math.round(r.top),
    中心点: cx+','+cy,
    该点最上层元素: top?(top.className||top.tagName).toString().slice(0,60):'null',
    是否被遮挡: covered,
    可见: r.width>10 && r.height>10 && r.top>=0
  });
})()`);
console.log('  ' + vis);

await evalJs(c, 'window.scrollTo(0,0); 1');
await sleep(800);

console.log('\n════ 说说页：标签栏 + 归档分组 ════');
await evalJs(c, 'navigateTo("memos"); 1');
await sleep(3000);
const memos = await evalJs(c, `(function(){
  var bar=document.getElementById('memo-tagbar');
  var chips=bar?bar.querySelectorAll('.memo-tag'):[];
  var r=bar?bar.getBoundingClientRect():null;
  var tabs=[].slice.call(document.querySelectorAll('.memo-tab')).map(function(b){return b.textContent});
  return JSON.stringify({
    标签栏存在: !!bar,
    标签栏尺寸: r?Math.round(r.width)+'x'+Math.round(r.height):'无',
    标签栏在首屏内: r?(r.top>=0&&r.bottom<=innerHeight):false,
    chip数: chips.length,
    chip文字: [].slice.call(chips).map(function(x){return x.textContent}),
    模式标签: tabs,
    分组器存在: !!document.getElementById('memo-grouping'),
    分组器hidden: document.getElementById('memo-grouping')?document.getElementById('memo-grouping').hidden:'无'
  });
})()`);
console.log('  ' + memos);

// 试着点「归档」
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll(".memo-tab")).find(function(x){return x.dataset.memoMode==="archive"});if(b)b.click();return 1})()');
await sleep(2500);
line('点归档后 分组器hidden', await evalJs(c, 'document.getElementById("memo-grouping").hidden'));
line('点归档后 分组按钮', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".memo-gbtn")).map(function(b){return b.textContent}))'));
line('归档分组数', await evalJs(c, 'document.querySelectorAll(".memo-arch-month").length'));
line('分组名', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".memo-arch-label")).map(function(e){return e.textContent}))'));

await closeTab(t.id);
