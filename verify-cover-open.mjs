/**
 * 验收：
 *  ① 封面整张铺满、没有上下黑边、没有 NO./编码/分类文字
 *  ② 点击后：书先抬起 + 封面绕书脊翻开（露出内页），再浮出详情
 *  ③ 关闭后书合回去
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?sh=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(26) + ' = ' + String(v).slice(0, 110)); };

const CV = 'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说']},items:[
    {id:'a',kind:'books',sub:'小说',title:'如我如鲸',creator:'张嘉佳',rating:4.5,review:'简介文字。',thought:'评价一\\n评价二',cover:${JSON.stringify(CV)},date:'2026-09-01',link:''},
    {id:'b',kind:'books',sub:'小说',title:'玻璃海纪事',creator:'作者B',rating:4,review:'第二本',thought:'',cover:'',date:'2026-08-01',link:''}
  ]};
  applyAll();
  return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';document.head.appendChild(s);return 1})()`);
await sleep(400);

console.log('════ ① 封面铺满、无黑边、无编号 ════');
// 悬停第一本把它抽出来，才能看到封面
const g = JSON.parse(await evalJs(c, '(function(){document.querySelector(".dim-shelf").scrollIntoView({block:"center",behavior:"instant"});var r=document.querySelector(".spine-book").getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await sleep(500);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y, button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x + 2, y: g.y, button: 'none' });
await sleep(900);
line('封面里的文字', await evalJs(c, '(function(){var e=document.querySelector(".spine-book .sp-cover");return e?e.innerText.replace(/\\s+/g,""):"无"})()'));
ok('封面上没有 NO./编码/分类', '', (await evalJs(c, '(function(){var e=document.querySelector(".spine-book .sp-cover");return e?e.innerText.replace(/\\s+/g,""):""})()')) === '');
line('封面背景色', await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book .sp-cover")).backgroundColor'));
line('图片尺寸 vs 封面框', await evalJs(c, '(function(){var c=document.querySelector(".spine-book .sp-cover").getBoundingClientRect();var i=document.querySelector(".spine-book .sp-img");var r=i.getBoundingClientRect();return "封面 "+Math.round(c.width)+"x"+Math.round(c.height)+" / 图片 "+Math.round(r.width)+"x"+Math.round(r.height)})()'));
ok('图片铺满整个封面（无黑边）', '', await evalJs(c, '(function(){var c=document.querySelector(".spine-book .sp-cover").getBoundingClientRect();var r=document.querySelector(".spine-book .sp-img").getBoundingClientRect();return Math.abs(c.width-r.width)<2&&Math.abs(c.height-r.height)<2})()'));
ok('封面底色透明', await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book .sp-cover")).backgroundColor'), await evalJs(c, 'getComputedStyle(document.querySelector(".spine-book .sp-cover")).backgroundColor') === 'rgba(0, 0, 0, 0)');
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-cover-full.png');
console.log('  截图: shots/dim-cover-full.png');

console.log('\n════ ② 点击后的翻开时序 ════');
// 恢复动画，真实点击
await evalJs(c, `(function(){document.querySelectorAll('style').forEach(function(s){if(s.textContent.indexOf('transition:none !important')>=0)s.remove()});return 1})()`);
await sleep(300);
await evalJs(c, `(function(){var b=document.querySelector('.spine-book');b.click();return 1})()`);
await sleep(140);
line('点击后 bookEl 有 .opening', await evalJs(c, 'document.querySelectorAll(".spine-book.opening").length'));
line('翻开瞬间封面旋转', await evalJs(c, '(function(){var e=document.querySelector(".spine-book.opening .sp-cover");return e?getComputedStyle(e).transform.slice(0,40):"无"})()'));
line('内页透明度（开始淡入）', await evalJs(c, '(function(){var e=document.querySelector(".spine-book .sp-inside");return e?getComputedStyle(e).opacity:"无"})()'));
line('此刻弹窗是否还没出来', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'));
await sleep(120);
line('书抬起了多少（translateZ 已生效）', await evalJs(c, '(function(){var e=document.querySelector(".spine-book.opening");return e?getComputedStyle(e).transform.slice(0,52):"无"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-opening.png');
console.log('  截图: shots/dim-opening.png');
await sleep(900);
ok('330ms 后弹窗浮出', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'), await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")') === true);
line('弹窗已可见', await evalJs(c, 'getComputedStyle(document.querySelector(".dim-modal-box")).opacity'));

console.log('\n════ ③ 关闭后书合回去 ════');
await evalJs(c, 'closeDimDetail(), 1');
await sleep(800);
ok('关闭后 .opening 已移除', await evalJs(c, 'document.querySelectorAll(".spine-book.opening").length') + ' 个', (await evalJs(c, 'document.querySelectorAll(".spine-book.opening").length')) === 0);
ok('弹窗已关闭', await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")'), (await evalJs(c, 'document.getElementById("dim-modal").classList.contains("show")')) === false);

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
