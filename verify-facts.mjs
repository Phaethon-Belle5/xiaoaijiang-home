// 验证：封面右侧那张档案信息表填上了，且整块不再空白
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?f=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(22) + ' = ' + String(v).slice(0, 115));
const chk = [];
const ok = (n, v, c2) => { chk.push(c2); console.log('  ' + (c2 ? '✅' : '❌') + ' ' + n.padEnd(22) + ' = ' + String(v).slice(0, 105)); };

await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说']},items:[
    {id:'b1',kind:'books',sub:'电视剧',tags:'特摄, 童年',title:'魔弹战记龙剑道',creator:'哔哩哔哩',rating:4.5,
     review:'远古时期，正义的魔弹战士们为了世界的和平，早已开始和邪恶的魔物对抗。',thought:'',cover:'',date:'2026-08-01',link:'https://www.bilibili.com'}
  ]};
  applyAll(); return 1;
})()`);
await sleep(1200);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, '(function(){var b=document.querySelector("#dim-grid .dim-card, #dim-grid .book3d");if(b)b.click();return 1})()');
await sleep(1300);

const r = JSON.parse(await evalJs(c, `(function(){
  function box(sel){var e=document.querySelector(sel);if(!e)return null;var q=e.getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height),x:Math.round(q.left),y:Math.round(q.top)}}
  return JSON.stringify({
    封面: box('.dm-cover'),
    信息区: box('.dm-info'),
    表格: box('.dm-facts'),
    行: [].slice.call(document.querySelectorAll('.dm-facts > div')).map(function(d){
      return d.querySelector('dt').textContent + '=' + d.querySelector('dd').textContent.trim();
    }),
    空白高度: (function(){
      var info=document.querySelector('.dm-info'), cv=document.querySelector('.dm-cover');
      if(!info||!cv)return null;
      var ir=info.getBoundingClientRect(), cr=cv.getBoundingClientRect();
      var last=info.lastElementChild;
      var lr=last?last.getBoundingClientRect():ir;
      return Math.round(cr.bottom - lr.bottom);
    })()
  });
})()`));
line('封面', r.封面 ? r.封面.w + 'x' + r.封面.h : '无');
line('信息区', r.信息区 ? r.信息区.w + 'x' + r.信息区.h : '无');
line('信息表', r.表格 ? r.表格.w + 'x' + r.表格.h : '❌ 没有');
line('表格行', JSON.stringify(r.行));
line('封面底部还剩空白', r.空白高度 + 'px');
ok('有档案信息表', r.表格 ? String(r.表格.h) + 'px 高' : '无', !!r.表格 && r.表格.h > 30);
ok('评分/类型/日期都在', JSON.stringify(r.行), r.行.length >= 2);
ok('空白明显变小（< 80px）', r.空白高度 + 'px', typeof r.空白高度 === 'number' && r.空白高度 < 80);

await screenshot(c, 'B:/dell/Documents/harness/shots/modal-facts.png');
console.log('  截图: shots/modal-facts.png');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
