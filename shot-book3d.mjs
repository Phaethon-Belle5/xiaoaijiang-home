/**
 * 截图存证：立体书在「未悬停 / 悬停抽出」两种状态下的样子
 * 后台标签里 CSS 过渡不推进，所以先禁掉过渡、直接给到最终 transform，再截图。
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('B:/dell/Documents/harness/shots', { recursive: true });

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?shot=' + Date.now() });
await sleep(20000);

// 一本用真实图片做封面，两本用兜底封面（自动画书名），再看一本没详情的
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术','历史'],films:[],games:[]},items:[
    {id:'s1',kind:'books',sub:'小说',title:'遥远的救世主',creator:'豆豆',rating:4.5,review:'值得反复读',thought:'文化属性那段很震',cover:'https://cdn.231060101.xyz/%E8%AF%B4%E8%AF%B4%E5%9B%BE%E7%89%87/%E9%98%BF%E5%91%A6.webp',date:'2026-05-01',link:''},
    {id:'s2',kind:'books',sub:'技术',title:'图解 HTTP',creator:'上野宣',rating:4,review:'入门友好',thought:'',cover:'',date:'2026-03-01',link:''},
    {id:'s3',kind:'books',sub:'历史',title:'万历十五年',creator:'黄仁宇',rating:5,review:'视角独特',thought:'',cover:'',date:'2026-01-01',link:''},
    {id:'s4',kind:'books',sub:'小说',title:'没有详情的一本',creator:'某人',rating:0,review:'',thought:'',cover:'',date:'2026-02-01',link:''},
    {id:'s5',kind:'books',sub:'技术',title:'深入理解计算机系统',creator:'Bryant',rating:5,review:'大部头',thought:'',cover:'',date:'2025-11-01',link:''}
  ]};
  return 1;
})()`);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
// 禁掉过渡，这样最终姿态能立刻渲染出来（后台标签里过渡不推进）
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);
await evalJs(c, '(function(){var g=document.getElementById("dim-grid");g.scrollIntoView({block:"center",behavior:"instant"});return 1})()');
await sleep(1200);

const line = (n, v) => console.log('  ' + String(n).padEnd(22) + ' = ' + v);
line('书数量', await evalJs(c, 'document.querySelectorAll(".book3d").length'));
line('网格列数', await evalJs(c, 'getComputedStyle(document.getElementById("dim-grid")).gridTemplateColumns'));

console.log('\n--- 截「未悬停」---');
await screenshot(c, 'B:/dell/Documents/harness/shots/book-rest.png');
console.log('  shots/book-rest.png');

console.log('\n--- 悬停第 1 本（真实鼠标）---');
const geo = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".book3d-scene")[0].getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.5), y: geo.t + Math.round(geo.h * 0.5), button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo.l + Math.round(geo.w * 0.55), y: geo.t + Math.round(geo.h * 0.5), button: 'none' });
await sleep(900);
line('内层 transform', await evalJs(c, 'document.querySelectorAll(".book3d-inner")[0].style.transform || "(CSS hover)"'));
line('following 类', await evalJs(c, 'document.querySelectorAll(".book3d")[0].classList.contains("following")'));
line('书页边可见宽度', await evalJs(c, '(function(){var p=document.querySelectorAll(".book3d-pages")[0];return Math.round(p.getBoundingClientRect().width)+"px"})()'));
line('整本书占位', await evalJs(c, '(function(){var r=document.querySelectorAll(".book3d-scene")[0].getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/book-hover.png');
console.log('  shots/book-hover.png');

console.log('\n--- 悬停第 3 本（兜底封面 + 不同倾斜）---');
const geo3 = JSON.parse(await evalJs(c, '(function(){var r=document.querySelectorAll(".book3d-scene")[2].getBoundingClientRect();return JSON.stringify({l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)})})()'));
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo3.l + 10, y: geo3.t + geo3.h - 10, button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: geo3.l + 12, y: geo3.t + geo3.h - 12, button: 'none' });
await sleep(900);
line('第 3 本 transform', await evalJs(c, 'document.querySelectorAll(".book3d-inner")[2].style.transform || "(CSS hover)"'));
await screenshot(c, 'B:/dell/Documents/harness/shots/book-hover3.png');
console.log('  shots/book-hover3.png');

await closeTab(t.id);
