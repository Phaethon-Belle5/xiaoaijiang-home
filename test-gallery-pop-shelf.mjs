// 验收：弹出式记忆区 + 按省份的记忆书架 + 目录跳转 + 城市评价页
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://map.231060101.xyz/?pop=' + Date.now() });
await sleep(24000);

const line = (n, v) => console.log('  ' + String(n).padEnd(28) + ' = ' + String(v).slice(0, 170));

console.log('════ ① 入口在地图上方 ════');
line('入口条存在', await evalJs(c, '!!document.getElementById("memLaunch")'));
line('入口按钮', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.ml-btn')).map(function(e){return e.textContent.trim()}))`));
line('入口位置（应在地图上方）', await evalJs(c, `(function(){
  var l=document.getElementById('memLaunch'),m=document.getElementById('china-map');
  if(!l||!m)return '缺元素';
  var lr=l.getBoundingClientRect(),mr=m.getBoundingClientRect();
  return '入口 top='+Math.round(lr.top+scrollY)+' · 地图 top='+Math.round(mr.top+scrollY)+' → '+(lr.top<mr.top?'✅ 在上方':'❌ 不在上方');
})()`));
line('地图下方已无记忆区', await evalJs(c, `!document.querySelector('.mem-zone')`));

console.log('\n════ ② 点击弹出 ════');
await evalJs(c, `(function(){var b=document.querySelector('.ml-btn[data-mem="stats"]');if(b)b.click();return 1})()`);
await sleep(2500);
line('弹层 .show', await evalJs(c, `document.getElementById('memPop').classList.contains('show')`));
line('弹层尺寸', await evalJs(c, `(function(){var e=document.querySelector('.mp-box');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)+' @'+Math.round(r.left)+','+Math.round(r.top)})()`));
line('弹层可见性', await evalJs(c, `(function(){var e=document.getElementById('memPop');return getComputedStyle(e).display+' opacity='+getComputedStyle(e).opacity})()`));
line('统计卡片数', await evalJs(c, 'document.querySelectorAll(".mem-card").length'));
line('切换标签', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.mp-tab')).map(function(e){return e.textContent+(e.classList.contains('on')?'*':'')}))`));

console.log('\n════ ③ 记忆书架按省份 ════');
await evalJs(c, `(function(){var b=document.querySelector('.mp-tab[data-mem="shelf"]');if(b)b.click();return 1})()`);
await sleep(3500);
line('书的数量（应为省份数）', await evalJs(c, 'document.querySelectorAll(".shelf-book").length'));
line('省份名', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.sb-prov')).map(function(e){return e.textContent}))`));
line('书封上/下结构', await evalJs(c, `(function(){
  var b=document.querySelector('.shelf-book');if(!b)return '无';
  var top=b.querySelector('.sb-top'),bot=b.querySelector('.sb-bottom');
  if(!top||!bot)return '结构不对';
  var tr=top.getBoundingClientRect(),br=bot.getBoundingClientRect(),outer=b.getBoundingClientRect();
  return '上半占 '+Math.round(tr.height/outer.height*100)+'% → '+(tr.top<br.top?'✅ 省份名在上、图片在下':'❌ 顺序不对');
})()`));
line('第一本书尺寸', await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');var r=e.getBoundingClientRect();return Math.round(r.width)+'x'+Math.round(r.height)})()`));

console.log('\n════ ④ 翻开书：书封 + 目录 + 城市评价 ════');
await evalJs(c, `(function(){var e=document.querySelector('.shelf-book');if(e)e.click();return 1})()`);
await sleep(5000);
line('书层打开', await evalJs(c, `document.getElementById('bookLayer').classList.contains('show')`));
line('总页数', await evalJs(c, 'document.querySelectorAll(".book-page").length'));
line('第1页=书封', await evalJs(c, `(function(){var p=document.querySelectorAll('.book-page')[0];return p&&p.classList.contains('bp-prov')?'✅ 是书封页':'❌ '+p.className})()`));
line('书封内容', await evalJs(c, `(function(){var p=document.querySelector('.bp-prov');if(!p)return '无';return '省份名=「'+p.querySelector('.bp-prov-name').textContent+'」 副标题='+p.querySelector('.bp-prov-sub').textContent+' 图='+(p.querySelector('.bp-prov-img img')?'有':'无')})()`));
line('第2页=目录', await evalJs(c, `(function(){var p=document.querySelectorAll('.book-page')[1];return p&&p.classList.contains('bp-toc')?'✅ 是目录页':'❌ '+p.className})()`));
line('目录条目数', await evalJs(c, 'document.querySelectorAll(".toc-row").length'));
line('目录内容', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.toc-row')).slice(0,4).map(function(e){return e.querySelector('.toc-n').textContent+' / '+e.querySelector('.toc-m').textContent}))`));
line('评价页数量', await evalJs(c, 'document.querySelectorAll(".bp-review").length'));
line('第一张评价页', await evalJs(c, `(function(){var p=document.querySelector('.bp-review');if(!p)return '无';return p.querySelector('.bp-city').textContent+' | 评价='+(p.querySelector('.bp-desc')||{}).textContent.slice(0,40)})()`));

console.log('\n════ ⑤ 目录点击跳转 ════');
const before = await evalJs(c, 'document.getElementById("bkPage").textContent');
await evalJs(c, `(function(){var rows=document.querySelectorAll('.toc-row');if(rows.length>1)rows[1].click();return 1})()`);
await sleep(2500);
const after = await evalJs(c, 'document.getElementById("bkPage").textContent');
line('页码变化', before + ' → ' + after + (before !== after ? '  ✅ 跳转生效' : '  ❌ 没跳'));
line('当前页是评价页吗', await evalJs(c, `(function(){try{var i=__flip.getCurrentPageIndex();var p=document.querySelectorAll('.book-page')[i];return p?(p.classList.contains('bp-review')?'✅ 是城市评价页':'当前是 '+p.className):'取不到'}catch(e){return '取不到: '+e.message}})()`));

await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-prov-book.png');
console.log('\n  截图: shots/gallery-prov-book.png');

console.log('\n════ ⑥ 关闭 ════');
await evalJs(c, 'closeBook(); 1'); await sleep(1200);
line('书层已关', await evalJs(c, `!document.getElementById('bookLayer').classList.contains('show')`));
await screenshot(c, 'B:/dell/Documents/harness/shots/gallery-shelf-prov.png');
await evalJs(c, 'closeMemPop(); 1'); await sleep(1200);
line('弹层已关', await evalJs(c, `!document.getElementById('memPop').classList.contains('show')`));

await closeTab(t.id);
