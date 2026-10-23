// 强制开启动画（无头 Chrome 默认 reduced-motion）再看翻开效果
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
// ★ 关键：告诉页面"用户没要求减少动效"
await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?mv=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 120));

line('reduced-motion 查询', await evalJs(c, 'String(window.matchMedia("(prefers-reduced-motion: reduce)").matches)'));

await evalJs(c, `(function(){
  var CV='https://img.231060101.xyz/file/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
  var T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:4.5,
      review:'这是《'+t+'》的简介正文，用来检查翻开后右页的排版。',thought:'评价一\\n评价二\\n评价三',
      cover:(i===1?'':CV),date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(3000);
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[1].click();return 1})()`);
await sleep(900);
await evalJs(c, `(function(){document.querySelectorAll('#dim-grid .memory-book')[1].click();return 1})()`);
await sleep(2200);
line('cover 的 transform', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.opening .memory-book-cover");return e?getComputedStyle(e).transform.slice(0,52):"无"})()'));
line('cover-inside 的 transform', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.opening .memory-book-cover-inside");return e?getComputedStyle(e).transform.slice(0,52):"无"})()'));
line('cover animationName', await evalJs(c, `(function(){var e=document.querySelector("#dim-grid .memory-book.opening .memory-book-cover");if(!e)return "无";var s=getComputedStyle(e);return s.animationName+" / "+s.animationDuration})()`));
line('cover-inside animationName', await evalJs(c, `(function(){var e=document.querySelector("#dim-grid .memory-book.opening .memory-book-cover-inside");if(!e)return "无";var s=getComputedStyle(e);return s.animationName+" / "+s.animationDuration})()`));
line('opening 的 transform', await evalJs(c, `(function(){var e=document.querySelector("#dim-grid .memory-book.opening");if(!e)return "无";return getComputedStyle(e).transform.slice(0,48)})()`));
line('右页可见度', await evalJs(c, '(function(){var e=document.querySelector("#dim-grid .memory-book.opening .memory-book-opening-page");return e?getComputedStyle(e).opacity:"无"})()'));
await screenshot(c, 'B:/dell/Documents/harness/shots/book-open-anim.png');
console.log('  截图: shots/book-open-anim.png');
ws2.close();
await closeTab(t.id);
