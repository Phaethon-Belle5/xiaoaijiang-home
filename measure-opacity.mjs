/**
 * 量说说页各元素的透明度：如果标签栏/卡片也是 opacity:0（入场动画没触发），
 * 用户就会"看得见布局却点不到东西 / 觉得什么都没变"
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/memos?op=' + Date.now() });
await sleep(20000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);

const probe = (sel, label) => `(function(){
  var e=document.querySelector(${JSON.stringify(sel)});
  if(!e)return ${JSON.stringify(label)}+': 不存在';
  var r=e.getBoundingClientRect(), out=[];
  var n=e, depth=0;
  while(n && n!==document.body && depth<8){
    var s=getComputedStyle(n);
    out.push((n.className||n.tagName).toString().split(' ')[0]+'(op'+s.opacity+',vis'+s.visibility+',disp'+s.display+')');
    n=n.parentElement; depth++;
  }
  return ${JSON.stringify(label)}+': 视口内top='+Math.round(r.top)+' 尺寸='+Math.round(r.width)+'x'+Math.round(r.height)+
    ' | 链路: '+out.join(' < ');
})()`;

console.log('════ 说说页（刚打开，未滚动）════');
for (const [sel, label] of [
  ['.memo-toolbar', '说说工具栏'],
  ['#memo-tagbar', '标签栏'],
  ['#memo-tagbar .memo-tag', '第一个标签chip'],
  ['.memo-wall', '说说卡片墙'],
  ['.memo-card', '第一张说说卡'],
  ['#memo-archive', '归档区'],
]) console.log('  ' + await evalJs(c, probe(sel, label)));

console.log('\n════ 首页（刚打开，未滚动）════');
await evalJs(c, 'navigateTo("home"); 1');
await sleep(2500);
for (const [sel, label] of [
  ['main#main', '主容器'],
  ['.carousel-slide', '轮播'],
  ['.music-card-section', '音乐卡所在区块'],
  ['.music-card', '音乐卡'],
  ['.log-card', '更新日志卡'],
  ['.hot-card', '热点卡'],
]) console.log('  ' + await evalJs(c, probe(sel, label)));

console.log('\n════ 滚动到日志卡后再看 ════');
await evalJs(c, 'document.querySelector(".log-card").scrollIntoView({block:"center"}); 1');
await sleep(2000);
console.log('  ' + await evalJs(c, probe('.log-card', '更新日志卡(滚动后)')));
console.log('  ' + await evalJs(c, probe('.music-card-section', '区块(滚动后)')));
console.log('  reveal 相关类: ' + await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll(".reveal")).map(function(e){return (e.className||"").split(" ").slice(0,2).join(".")+"@"+getComputedStyle(e).opacity}))'));

console.log('\n════ IntersectionObserver 是否可用 ════');
line('IO 支持', await evalJs(c, "'IntersectionObserver' in window"));
line('initReveal 函数', await evalJs(c, 'typeof initReveal'));

await closeTab(t.id);
