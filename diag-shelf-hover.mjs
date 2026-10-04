// 诊断：为什么悬停没落到书上
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 950, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?d=' + Date.now() });
await sleep(22000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 130));

await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll('.mp-tab,.ml-btn')).find(function(x){return x.dataset.mem==='shelf'});if(b)b.click();return 1})()`);
await sleep(3500);

line('书数', await evalJs(c, 'document.querySelectorAll(".shelf3d").length'));
line('initShelf3D 已绑', await evalJs(c, 'document.getElementById("memPanel") ? !!document.getElementById("memPanel").__shelf3dBound : "无 memPanel"'));
line('书架在 memPanel 里吗', await evalJs(c, '(function(){var s=document.querySelector(".shelf3d");if(!s)return "无书";return document.getElementById("memPanel").contains(s)?"在":"不在（说明渲染到别处了）"})()'));
line('initShelf3D 存在', await evalJs(c, 'typeof initShelf3D'));

await evalJs(c, '(function(){var e=document.querySelector(".shelf3d-scene");e.scrollIntoView({block:"center",behavior:"instant"});return 1})()');
await sleep(1500);
const g = JSON.parse(await evalJs(c, '(function(){var r=document.querySelector(".shelf3d-scene").getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
console.log('\n  第一本书场景: left=' + g.l + ' top=' + g.t + ' ' + g.w + 'x' + g.h);
const px = g.l + Math.round(g.w / 2), py = g.t + Math.round(g.h / 2);
line('取中心点', px + ',' + py);
line('该点上是什么元素', await evalJs(c, `(function(){var e=document.elementFromPoint(${px},${py});if(!e)return "null";return e.tagName+"."+String(e.className).split(" ").slice(0,3).join(".")})()`));
line('它在书里吗', await evalJs(c, `(function(){var e=document.elementFromPoint(${px},${py});if(!e)return "null";return e.closest(".shelf3d")?"在":"不在"})()`));
line('点的祖先链', await evalJs(c, `(function(){var e=document.elementFromPoint(${px},${py});if(!e)return "null";var out=[],n=e;while(n&&n!==document.body&&out.length<6){out.push(n.tagName.toLowerCase()+(n.id?"#"+n.id:"")+(n.className?"."+String(n.className).split(" ")[0]:""));n=n.parentElement}return out.join(" < ")})()`));
line('memPanel 的定位', await evalJs(c, '(function(){var p=document.getElementById("memPanel");var s=getComputedStyle(p);var r=p.getBoundingClientRect();return s.position+"  "+Math.round(r.width)+"x"+Math.round(r.height)+" @ "+Math.round(r.left)+","+Math.round(r.top)+" overflow="+s.overflow})()'));
line('memPanel 滚动位置', await evalJs(c, 'document.getElementById("memPanel").scrollTop'));

console.log('\n  —— 直接在书上派发 mousemove，看处理器有没有跑 ——');
line('派发后 following', await evalJs(c, `(function(){
  var el=document.querySelector(".shelf3d");
  var r=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent("mousemove",{clientX:r.left+r.width*0.5,clientY:r.top+r.height*0.5,bubbles:true}));
  return el.classList.contains("following");
})()`));
line('内层 transform', await evalJs(c, 'document.querySelector(".shelf3d-inner").style.transform || "(空)"'));
line('再派发一次（跟手）', await evalJs(c, `(function(){
  var el=document.querySelector(".shelf3d");
  var r=el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent("mousemove",{clientX:r.left+r.width*0.9,clientY:r.top+r.height*0.9,bubbles:true}));
  return document.querySelector(".shelf3d-inner").style.transform;
})()`));

console.log('\n  —— 真实鼠标再试，并读回鼠标位置 ——');
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py, button: 'none' });
await sleep(200);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px + 2, y: py + 2, button: 'none' });
await sleep(700);
line('CSS :hover 是否命中', await evalJs(c, 'document.querySelector(".shelf3d").matches(":hover")'));
line('内层 transform', await evalJs(c, 'document.querySelector(".shelf3d-inner").style.transform || "(空)"'));
line('following', await evalJs(c, 'document.querySelector(".shelf3d").classList.contains("following")'));
line('书页边宽', await evalJs(c, 'Math.round(document.querySelector(".shelf3d-pages").getBoundingClientRect().width)+"px"'));

await closeTab(t.id);
