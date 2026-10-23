/**
 * 严格验证「面板缩放原点确实落在被点的那本书上」
 * 方法：临时把面板 transform 置为 none 量出未变换的边框盒，
 *       用「书的中心 - 未变换左边」算出期望原点，
 *       再和 getComputedStyle().transformOrigin 的实际值逐像素比对。
 * 用两本位置差别很大的书（靠左 / 靠右）+ 滚过书架后再点，证明不是巧合。
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?org=' + Date.now() });
await sleep(21000);
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 120)); };

await evalJs(c, `(function(){
  const T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年','人类简史','百年孤独','房思琪','茶花女','悲惨世界','鼠疫','看不见的城市'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4,
      review:'简介',thought:'评价',cover:'',date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);

// 关掉过渡，避免测量时还在动画中
async function measure(bookIndex){
  // 关键：点之前先记住书的中心（翻开动画会改变书宽，点完再量就不准了）
  const r = JSON.parse(await evalJs(c, `(function(){
    var books=document.querySelectorAll('.spine-book');
    var b=books[${bookIndex}];
    if(!b)return JSON.stringify({err:'no book'});
    var br=b.getBoundingClientRect();
    window.__clickedCenter={x:br.left+br.width/2, y:br.top+br.height/2};
    var t=b.querySelector('.sp-title').textContent;
    b.click();
    return JSON.stringify({clicked:t, center:[Math.round(window.__clickedCenter.x), Math.round(window.__clickedCenter.y)]});
  })()`));
  await sleep(900);   // 等 330ms 时序 + 动画收尾
  const m = JSON.parse(await evalJs(c, `(function(){
    var panel=document.querySelector('.dim-modal-box');
    // 临时去掉变换，量未变换的边框盒
    var keepT=panel.style.transform, keepTr=panel.style.transition;
    panel.style.transition='none';
    panel.style.transform='none';
    var raw=panel.getBoundingClientRect();
    panel.style.transform=keepT;
    panel.style.transition=keepTr;
    var cs=getComputedStyle(panel).transformOrigin;      // "Xpx Ypx"
    var parts=cs.split(' ').map(parseFloat);
    // 期望值：点击瞬间书的中心（夹到视口内，与实现一致）减去未变换的左上角
    var cc=window.__clickedCenter||{x:0,y:0};
    var cx=Math.max(0,Math.min(window.innerWidth, cc.x));
    var cy=Math.max(0,Math.min(window.innerHeight, cc.y));
    var expX=cx-raw.left;
    var expY=cy-raw.top;
    return JSON.stringify({
      书: ${JSON.stringify(r.clicked)},
      点击时书中心: ${JSON.stringify(r.center)},
      面板未变换左: Math.round(raw.left), 面板未变换上: Math.round(raw.top),
      期望原点: [Math.round(expX), Math.round(expY)],
      实际原点: [Math.round(parts[0]), Math.round(parts[1])],
      偏差X: Math.round(Math.abs(expX-parts[0])), 偏差Y: Math.round(Math.abs(expY-parts[1])),
      是否在屏幕正中: (Math.abs(expX-raw.width/2)<4 && Math.abs(expY-raw.height/2)<4)
    });
  })()`));
  return m;
}

console.log('════ 场景 A：点左边的书（第 1 本）════');
let a = await measure(0);
console.log('  ' + JSON.stringify(a));
ok('原点X 与书目标准确吻合', '偏差 ' + a.偏差X + 'px', a.偏差X <= 2);
ok('原点Y 与书目标准确吻合', '偏差 ' + a.偏差Y + 'px', a.偏差Y <= 2);
ok('不是默认的"屏幕正中"', String(a.是否在屏幕正中), a.是否在屏幕正中 === false);
await evalJs(c, 'closeDimDetail(), 1');
await sleep(700);

console.log('\n════ 场景 B：先滚书架，再点另一本（第 8 本）════');
await evalJs(c, `(function(){var s=document.getElementById('dim-grid');s.scrollLeft=520;return 1})()`);
await sleep(900);
let b = await measure(7);
console.log('  ' + JSON.stringify(b));
ok('滚动后 原点X 仍准确', '偏差 ' + b.偏差X + 'px', b.偏差X <= 2);
ok('滚动后 原点Y 仍准确', '偏差 ' + b.偏差Y + 'px', b.偏差Y <= 2);
ok('两本书的期望原点确实不同（证明真的跟着书走）', a.期望原点 + ' vs ' + b.期望原点, JSON.stringify(a.期望原点) !== JSON.stringify(b.期望原点));
await evalJs(c, 'closeDimDetail(), 1');
await sleep(700);

console.log('\n════ 场景 C：屏幕很窄时（560px 底部 sheet）════');
await c.send('Emulation.setDeviceMetricsOverride', { width: 420, height: 900, deviceScaleFactor: 1, mobile: true });
await sleep(1200);
let d = await measure(2);
console.log('  ' + JSON.stringify(d));
ok('窄屏下 原点X 仍准确', '偏差 ' + d.偏差X + 'px', d.偏差X <= 2);
ok('窄屏下 原点Y 仍准确', '偏差 ' + d.偏差Y + 'px', d.偏差Y <= 2);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
