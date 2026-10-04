/**
 * 用几何数据确认"像不像一本书"，不靠肉眼：
 *  静止：书页边几乎看不见（edge-on）
 *  悬停：书左旋抽出、书页边露出、整本书变宽（有厚度）
 *  两种状态下，书的下方都没有额外占位（没有"大尾椎"）
 *  悬停的那本与静止那本的包围盒确实不同
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?geo=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + v);

await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术','历史']},items:[
    {id:'g1',kind:'books',sub:'小说',title:'第一本',creator:'作者甲',rating:4.5,review:'评价',thought:'感悟',cover:'',date:'2026-05-01',link:''},
    {id:'g2',kind:'books',sub:'技术',title:'第二本',creator:'作者乙',rating:4,review:'评价',thought:'',cover:'',date:'2026-03-01',link:''},
    {id:'g3',kind:'books',sub:'历史',title:'第三本',creator:'作者丙',rating:5,review:'评价',thought:'',cover:'',date:'2026-01-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);
await evalJs(c, '(function(){document.getElementById("dim-grid").scrollIntoView({block:"center",behavior:"instant"});return 1})()');
await sleep(1000);

const snap = async () => JSON.parse(await evalJs(c, `(function(){
  var out=[];
  document.querySelectorAll(".book3d").forEach(function(b,i){
    var card=b.getBoundingClientRect();
    var scene=b.querySelector(".book3d-scene").getBoundingClientRect();
    var cover=b.querySelector(".book3d-cover").getBoundingClientRect();
    var pages=b.querySelector(".book3d-pages").getBoundingClientRect();
    var back=b.querySelector(".book3d-back").getBoundingClientRect();
    out.push({i:i,
      card:[Math.round(card.width),Math.round(card.height)],
      scene:[Math.round(scene.width),Math.round(scene.height)],
      cover:[Math.round(cover.width),Math.round(cover.height),Math.round(cover.left),Math.round(cover.top)],
      pages:[Math.round(pages.width),Math.round(pages.height),Math.round(pages.left)],
      back:[Math.round(back.width),Math.round(back.left)],
      text:(b.innerText||"").replace(/\\s+/g," ").trim().slice(0,24)
    });
  });
  return JSON.stringify(out);
})()`));

console.log('════ 静止状态 ════');
const rest = await snap();
rest.forEach(b => console.log('  第' + (b.i + 1) + '本  卡片' + b.card.join('x') + '  场景' + b.scene.join('x') +
  '  封面' + b.cover[0] + 'x' + b.cover[1] + '  书页边宽' + b.pages[0] + 'px  封底w' + b.back[0]));

console.log('\n════ 悬停第 1 本 ════');
const geo = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".book3d-scene")[0].getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.5), y: geo.t + Math.round(geo.h * 0.4), button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.52), y: geo.t + Math.round(geo.h * 0.4), button: 'none' });
await sleep(900);
const hov = await snap();
hov.forEach(b => console.log('  第' + (b.i + 1) + '本  封面' + b.cover[0] + 'x' + b.cover[1] + ' @左' + b.cover[2] +
  '  书页边宽' + b.pages[0] + 'px @左' + b.pages[2] + '  封底w' + b.back[0]));

console.log('\n════ 判定 ════');
const ok = (n, c2) => console.log('  ' + (c2 ? '✅' : '❌') + ' ' + n);
const h1 = hov[0], r1 = rest[0], r2 = rest[1];

ok('静止时书页边几乎看不见（edge-on）', r1.pages[0] <= 4 && r2.pages[0] <= 4);
ok('悬停后书页边明显露出（有厚度）', h1.pages[0] > 10);
ok('悬停后封面发生了旋转（宽高变化）', h1.cover[0] !== r1.cover[0] || h1.cover[1] !== r1.cover[1]);
ok('悬停后封面左移了（抽出来）', h1.cover[2] < r1.cover[2]);
ok('封底跟着一起转（尺寸变了）', h1.back[0] !== r1.back[0]);
ok('只有被悬停那本变了（第 2 本保持原样）', hov[1].cover[0] === rest[1].cover[0] && hov[1].cover[2] === rest[1].cover[2]);
ok('卡片高度 == 场景高度（下方没有额外占位）', r1.card[1] === r1.scene[1] && r2.card[1] === r2.scene[1]);
ok('封面高度 == 场景高度（封面撑满，后面没跟文字）', Math.abs(r1.cover[1] - r1.scene[1]) <= 1);
ok('卡片里没有 .dim-body', await evalJs(c, 'document.querySelectorAll(".book3d .dim-body").length') === 0);
ok('卡片中文案只有封面上的书名/作者/标签/评分', /第一本/.test(r1.text) && r1.text.length < 20);

console.log('\n════ 静止那几本，封面下方的区域 ════');
console.log('  第2本 卡片底边 y = ' + await evalJs(c, 'Math.round(document.querySelectorAll(".book3d")[1].getBoundingClientRect().bottom)'));
console.log('  第2本 场景底边 y = ' + await evalJs(c, 'Math.round(document.querySelectorAll(".book3d")[1].querySelector(".book3d-scene").getBoundingClientRect().bottom)'));
console.log('  → 两者相等就说明封面下面没有任何东西');

await closeTab(t.id);
