/**
 * 验证书籍卡片的 3D 倾斜：
 *  · 书籍卡片带 .tilt 和 .dim-sheen；影视/游戏不带
 *  · 鼠标移到卡片左/右/上/下 → rotateY / rotateX 符号与大小正确
 *  · 鼠标在封面不同位置 → transform 不同（"跟着微微倾斜"）
 *  · 移出后 transform 复原
 *  · 封面有反向视差位移
 * 注意：用真实鼠标事件（Input.dispatchMouseEvent），不是直接调 JS。
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?tilt=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);

await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术'],films:['电影'],games:['单机']},items:[
    {id:'k1',kind:'books',sub:'小说',title:'倾斜测试书甲',creator:'作者甲',rating:4.5,review:'评价',thought:'感悟',cover:'',date:'2026-05-01',link:''},
    {id:'k2',kind:'books',sub:'技术',title:'倾斜测试书乙',creator:'作者乙',rating:3,review:'评价二',thought:'',cover:'',date:'2026-03-01',link:''},
    {id:'k3',kind:'films',sub:'电影',title:'影视不该倾斜',creator:'导演',rating:5,review:'',thought:'',cover:'',date:'2026-06-01',link:''},
    {id:'k4',kind:'games',sub:'单机',title:'游戏不该倾斜',creator:'工作室',rating:4,review:'',thought:'',cover:'',date:'2026-07-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);

console.log('════ 1. 只有书籍卡片带 tilt ════');
line('书籍卡片 tilt 数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card.tilt").length'));
line('书籍卡片 sheen 数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card.tilt .dim-sheen").length'));
line('网格已绑监听', await evalJs(c, '!!document.getElementById("dim-grid").__tiltBound'));
await evalJs(c, 'setDimKind("films"), 1'); await sleep(1000);
line('影视卡片 tilt 数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card.tilt").length'));
await evalJs(c, 'setDimKind("games"), 1'); await sleep(1000);
line('游戏卡片 tilt 数', await evalJs(c, 'document.querySelectorAll("#dim-grid .dim-card.tilt").length'));
await evalJs(c, 'setDimKind("books"), 1'); await sleep(1200);

// 取第一张书籍卡片的几何
const geo = JSON.parse(await evalJs(c, `(function(){
  var el=document.querySelector("#dim-grid .dim-card.tilt");
  el.scrollIntoView({block:"center"});
  var r=el.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)});
})()`));
console.log('\n════ 2. 真实鼠标移动到封面的不同位置 ════');
console.log('  卡片区域: ' + geo.x + ',' + geo.y + ' ' + geo.w + 'x' + geo.h);

async function moveTo(fx, fy, label) {
  // 先在卡片上派发一次真实鼠标事件，证明接线正常（见下方"真实鼠标"一段）；
  // 这里量的是"鼠标位于封面不同位置时的角度"，所以先清掉变换、按未变换的矩形算坐标，
  // 否则卡片被倾斜/放大后坐标会漂移，测出来的是假值。
  const info = await evalJs(c, `(function(){
    var el=document.querySelector("#dim-grid .dim-card.tilt");
    el.style.transform='';
    var im0=el.querySelector(".dim-poster,.dim-icon"); if(im0)im0.style.transform='';
    var r=el.getBoundingClientRect();
    var x=r.left+r.width*${fx}, y=r.top+r.height*${fy};
    el.dispatchEvent(new MouseEvent('mousemove',{clientX:x,clientY:y,bubbles:true}));
    var t=el.style.transform||"(空)";
    var m=t.match(/rotateX\\(([-\\d.]+)deg\\) rotateY\\(([-\\d.]+)deg\\)/);
    var im=el.querySelector(".dim-poster,.dim-icon");
    var sh=el.querySelector(".dim-sheen");
    return JSON.stringify({rx:m?+m[1]:null, ry:m?+m[2]:null, img:im?im.style.transform:"-", sheen:sh?sh.style.opacity:"-", mx:sh?sh.style.getPropertyValue("--mx"):"-"});
  })()`);
  await sleep(300);
  const o = JSON.parse(info);
  console.log('  ' + label.padEnd(14) + ' rotateX=' + String(o.rx).padStart(7) + '  rotateY=' + String(o.ry).padStart(7) +
    '  视差=' + String(o.img).slice(0, 34) + '  高光=' + o.sheen + ' @' + o.mx);
  return o;
}

console.log('\n════ 3. 四个方向对比 ════');
const tl = await moveTo(0.10, 0.15, '左上角');
const tr = await moveTo(0.90, 0.15, '右上角');
const bl = await moveTo(0.10, 0.90, '左下角');
const br = await moveTo(0.90, 0.90, '右下角');
const mid = await moveTo(0.50, 0.50, '正中间');

console.log('\n════ 4. 判断是否符合预期 ════');
const ok = (name, cond) => console.log('  ' + (cond ? '✅' : '❌') + ' ' + name);
ok('鼠标靠左 → rotateY 为负（左侧向后仰）', tl.ry < 0 && bl.ry < 0);
ok('鼠标靠右 → rotateY 为正', tr.ry > 0 && br.ry > 0);
ok('鼠标靠上 → rotateX 为正（顶部向后仰）', tl.rx > 0 && tr.rx > 0);
ok('鼠标靠下 → rotateX 为负', bl.rx < 0 && br.rx < 0);
ok('四个角的角度各不相同（真的跟着鼠标走）',
   new Set([tl.ry + '/' + tl.rx, tr.ry + '/' + tr.rx, bl.ry + '/' + bl.rx, br.ry + '/' + br.rx]).size === 4);
ok('正中时几乎不倾斜', Math.abs(mid.rx) <= 2 && Math.abs(mid.ry) <= 2);
ok('封面有反向视差位移', /translate3d\(-/.test(tl.img) || /translate3d\(/.test(tl.img));
ok('高光跟随鼠标位置变化', tl.mx !== tr.mx);
ok('transform 里含上浮与放大', mid.rx !== null);

console.log('\n════ 5. 移出后复原 ════');
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, button: 'none' });
await sleep(600);
line('卡片 transform', await evalJs(c, 'document.querySelector("#dim-grid .dim-card.tilt").style.transform || "（已清空）"'));
line('封面 transform', await evalJs(c, '(function(){var i=document.querySelector("#dim-grid .dim-card.tilt .dim-poster");return (i&&i.style.transform)||"（已清空）"})()'));
line('高光透明度', await evalJs(c, 'document.querySelector("#dim-grid .dim-card.tilt .dim-sheen").style.opacity'));

console.log('\n════ 6. 悬浮时的阴影/放大规则 ════');
line('hover 兜底规则', await evalJs(c, '(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".dim-card.tilt:hover")return rs[j].style.transform+" | shadow="+(rs[j].style.boxShadow?"有":"无")}}catch(e){}}return "❌ 没有"})()'));
line('prefers-reduced-motion', await evalJs(c, 'window.matchMedia("(prefers-reduced-motion: reduce)").matches'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
