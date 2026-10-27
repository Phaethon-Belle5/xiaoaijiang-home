/**
 * 验收：次元柜三个分类的详情弹窗都改成草图布局
 *  红框封面 / 黑框作品名 / 黄框作者·平台› / 蓝框标签 / 绿框 01 SYNOPSIS 简介
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

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
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?md=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(24) + ' = ' + String(v).slice(0, 110)); };

const CV = 'https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说'],films:['电影'],games:['单机']},items:[
    {id:'b1',kind:'books',sub:'小说',tags:'奇幻, 冒险, 旅行, 黑暗, 百合, 女性视角',
     title:'魔女之旅',creator:'白石定规',rating:4.5,
     review:'「请别在意。我是旅人，得继续旅行才行。」\\n\\n某个地方有个正在旅行的魔女，她的名字是伊蕾娜。\\n\\n身为旅人，在很长很长的旅途中，她与形形色色的国家与人们邂逅。',
     thought:'旅程结构松散但很舒服\\n最喜欢「只允许魔法师入境的国家」那一章',cover:${JSON.stringify(CV)},date:'2026-08-01',link:'https://example.com'},
    {id:'f1',kind:'films',sub:'电影',tags:'动画, 治愈',title:'海上钢琴师',creator:'朱塞佩·托纳多雷',rating:5,
     review:'一个关于选择的故事。',thought:'配乐太美',cover:'',date:'2026-07-01',link:''},
    {id:'g1',kind:'games',sub:'单机',tags:'独立, 探索',title:'空洞骑士',creator:'Team Cherry',rating:4.5,
     review:'地图设计一流。',thought:'战斗手感很扎实\\n美术风格统一',cover:'',date:'2026-06-01',link:''}
  ]};
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);

for (const [kind, label, idx] of [['books', '书籍', 0], ['films', '影视', 0], ['games', '游戏', 0]]) {
  console.log('\n════ ' + label + ' 的详情弹窗 ════');
  await evalJs(c, `setDimKind('${kind}'), 1`);
  await sleep(1800);
  const before = await evalJs(c, '!!document.querySelector("#dim-modal.show")');
  await evalJs(c, `(function(){
    var cards=document.querySelectorAll('#dim-grid .dim-card, #dim-grid .book3d');
    if(cards[0])cards[0].click();
    return 1;
  })()`);
  await sleep(1200);
  const shown = await evalJs(c, '!!document.querySelector("#dim-modal.show")');
  line('弹窗打开', shown);
  if (!shown) { ok(label + ' 弹窗能打开', String(shown), false); continue; }

  const r = JSON.parse(await evalJs(c, `(function(){
    function box(sel){var e=document.querySelector(sel);if(!e)return null;var q=e.getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height),x:Math.round(q.left),y:Math.round(q.top)}}
    var cv=document.querySelector('.dm-cover'), tt=document.querySelector('.dm-title');
    var au=document.querySelector('.dm-author');
    return JSON.stringify({
      封面: box('.dm-cover'),
      作品名: tt?tt.textContent:'无',
      作品名框: box('.dm-title'),
      作者: au?au.textContent.trim():'无',
      作者框: box('.dm-author'),
      标签数: document.querySelectorAll('.dm-tag').length,
      标签文字: [].slice.call(document.querySelectorAll('.dm-tag')).map(function(e){return e.textContent}),
      分节头: [].slice.call(document.querySelectorAll('.dm-sec-head')).map(function(e){return e.textContent.replace(/\\s+/g,' ').trim()}),
      分节标题: [].slice.call(document.querySelectorAll('.dm-sec-title')).map(function(e){return e.textContent}),
      简介: (document.querySelector('.dm-text')||{}).textContent ? document.querySelector('.dm-text').textContent.slice(0,36) : '无',
      简介缩进: document.querySelector('.dm-text') ? getComputedStyle(document.querySelector('.dm-text')).textIndent : '无'
    });
  })()`));
  line('封面（红框）', r.封面 ? (r.封面.w + 'x' + r.封面.h + ' @' + r.封面.x + ',' + r.封面.y) : '无');
  line('作品名（黑框）', '「' + r.作品名 + '」 @' + (r.作品名框 ? r.作品名框.x + ',' + r.作品名框.y : '?'));
  line('作者（黄框）', '「' + r.作者 + '」 @' + (r.作者框 ? r.作者框.x + ',' + r.作者框.y : '?'));
  line('标签（蓝框）', r.标签数 + ' 个: ' + JSON.stringify(r.标签文字));
  line('分节头（绿框内）', JSON.stringify(r.分节头));
  line('分节标题', JSON.stringify(r.分节标题));
  line('简介缩进', r.简介缩进);

  ok('左边有封面', r.封面 ? String(r.封面.w) : '无', r.封面 && r.封面.w > 80);
  ok('作品名在封面右边', '作品名x=' + (r.作品名框 ? r.作品名框.x : '?') + ' / 封面x=' + (r.封面 ? r.封面.x : '?'),
     !!(r.作品名框 && r.封面 && r.作品名框.x > r.封面.x));
  ok('有作者/平台（带 ›）', r.作者, /›/.test(r.作者));
  ok('有标签胶囊', r.标签数 + ' 个', r.标签数 >= 1);
  ok('分节头是 01 / SYNOPSIS', JSON.stringify(r.分节头), r.分节头.some(t => /01\s*\/\s*SYNOPSIS/.test(t)));
  ok('有「简介」标题', JSON.stringify(r.分节标题), r.分节标题.indexOf('简介') >= 0);
  ok('简介有首行缩进', r.简介缩进, r.简介缩进 && r.简介缩进 !== '0px');

  if (kind === 'books') await screenshot(c, 'B:/dell/Documents/harness/shots/modal-new-books.png');
  if (kind === 'games') await screenshot(c, 'B:/dell/Documents/harness/shots/modal-new-games.png');
  await evalJs(c, 'closeDimDetail(), 1');
  await sleep(700);
}

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
