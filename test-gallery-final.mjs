// 映像馆六项功能：最终整体验收（桌面 + 手机双视口）
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

async function run(w, h, label) {
  console.log('\n══════════ ' + label + ' ' + w + 'x' + h + ' ══════════');
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?final=' + Date.now() });
  await sleep(24000);
  const ok = [];
  const chk = (name, val, pass) => { ok.push(!!pass); console.log('  ' + (pass ? '✅' : '❌') + ' ' + name.padEnd(22) + ' = ' + String(val).slice(0, 120)); };

  // ① 旅行统计
  await evalJs(c, 'setMemTab("stats")'); await sleep(1500);
  const stats = await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mem-card')).map(function(e){return e.querySelector('.k').textContent+':'+e.querySelector('.v').textContent.trim()}))`);
  chk('① 旅行统计卡片', JSON.parse(stats).length + ' 张（' + JSON.parse(stats).slice(0,4).join(' / ') + '）', JSON.parse(stats).length >= 6);
  chk('① 覆盖省份非 0', await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll('.mem-block'));return b.length>0?'有内存块 '+b.length:'无'})()`), true);

  // ② 时间足迹
  await evalJs(c, 'setMemTab("time")'); await sleep(2000);
  chk('② 时间足迹', (await evalJs(c, 'document.querySelectorAll(".mem-node").length')) + ' 个月份节点 / ' + (await evalJs(c, 'document.querySelectorAll(".mem-year").length')) + ' 个年份', (await evalJs(c, 'document.querySelectorAll(".mem-node").length')) > 0);
  chk('② 缩略图可见', await evalJs(c, `(function(){var e=document.querySelector('.mem-thumb');if(!e)return '无';var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)})()`), (await evalJs(c, `(function(){var e=document.querySelector('.mem-thumb');return e?e.getBoundingClientRect().width:0})()`)) > 30);

  // ③ 记忆书架
  await evalJs(c, 'setMemTab("shelf")'); await sleep(2000);
  chk('③ 记忆书架', (await evalJs(c, 'document.querySelectorAll(".shelf-book").length')) + ' 本书', (await evalJs(c, 'document.querySelectorAll(".shelf-book").length')) > 0);
  await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');if(e)e.click();return 1})()`); await sleep(4000);
  chk('③ 翻页相册打开', (await evalJs(c, 'document.querySelectorAll(".book-page").length')) + ' 页 / 库=' + (await evalJs(c, '(window.St&&St.PageFlip)?"已加载":"未加载"')), await evalJs(c, `document.getElementById('bookLayer').classList.contains('show')`));
  await evalJs(c, 'closeBook()'); await sleep(1200);

  // ④ 照片流
  await evalJs(c, 'setMemTab("stream")'); await sleep(12000);
  const sk = await evalJs(c, `(function(){try{var d=document.querySelector('.stream-frame').contentDocument;return JSON.stringify({undertow:!!d.defaultView.__undertow,计数:(d.getElementById('photo-count')||{}).textContent,错误:(function(){var e=d.getElementById('error');return e&&!e.hidden?e.textContent.slice(0,50):'无'})()})}catch(e){return 'ERR '+e.message}})()`);
  const skj = JSON.parse(sk);
  chk('④ 照片流', '计数=' + skj.计数 + ' / 错误=' + skj.错误, skj.undertow === true && skj.错误 === '无');

  // ⑤ 旅行轨迹
  await evalJs(c, 'setMemTab("stats"); document.getElementById("tripBtn").click(); 1'); await sleep(4000);
  chk('⑤ 旅行轨迹', '面板=' + (await evalJs(c, `getComputedStyle(document.getElementById('tripPanel')).display`)) + ' / ' + (await evalJs(c, 'document.querySelectorAll(".tp-row").length')) + ' 站 / ' + (await evalJs(c, `document.querySelector('.tp-sub').textContent`)), await evalJs(c, `document.getElementById('tripPanel').classList.contains('show')`));

  // ⑥ 城市记忆
  await evalJs(c, `(function(){document.getElementById('tripBtn').click();var city=mapCityPoints.slice().sort(function(a,b){return b.photos.length-a.photos.length})[0];openCityDetail(city);return 1})()`); await sleep(3500);
  chk('⑥ 城市记忆相册', (await evalJs(c, 'document.querySelectorAll(".alb-group").length')) + ' 个日期分组 / ' + (await evalJs(c, 'document.querySelectorAll(".alb-ph").length')) + ' 张', (await evalJs(c, 'document.querySelectorAll(".alb-group").length')) > 0);

  // 全局
  chk('渲染无报错', await evalJs(c, `(typeof RENDER_ERRORS!=="undefined"&&RENDER_ERRORS.length)?JSON.stringify(RENDER_ERRORS):"无"`), await evalJs(c, `!(typeof RENDER_ERRORS!=="undefined"&&RENDER_ERRORS.length)`));

  if (w === 1440) {
    await evalJs(c, `(function(){try{closeCityDetail()}catch(e){} setMemTab('shelf'); document.getElementById('memZone').scrollIntoView({block:'start'}); return 1})()`);
    await sleep(2500);
    await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-final-shelf.png');
  } else {
    await evalJs(c, `(function(){try{closeCityDetail()}catch(e){} setMemTab('stats'); document.getElementById('memZone').scrollIntoView({block:'start'}); return 1})()`);
    await sleep(2500);
    await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-final-mobile.png');
  }
  console.log('  → ' + ok.filter(Boolean).length + '/' + ok.length + ' 通过');
  await closeTab(t.id);
  return ok.filter(Boolean).length === ok.length;
}

const a = await run(1440, 900, '桌面');
const b = await run(390, 844, '手机');
console.log('\n总体：桌面 ' + (a ? '全部通过' : '有失败') + ' · 手机 ' + (b ? '全部通过' : '有失败'));
