// 截一张最新书架 + 弹窗
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?shot=' + Date.now() });
await sleep(21000);
await evalJs(c, `(function(){
  const T=['月光航线','玻璃海纪事','风起青山','三体','万历十五年','人类简史','百年孤独','房思琪','茶花女','悲惨世界','鼠疫','看不见的城市'];
  data.dimension={subs:{books:['小说']},items:[]};
  T.forEach(function(t,i){
    data.dimension.items.push({id:'b'+i,kind:'books',sub:'小说',title:t,creator:'作者'+(i+1),rating:(i%5)+0.5,
      review:'《'+t+'》的简介文字。',thought:'评价一\\n评价二',cover:'',date:'2026-0'+((i%9)+1)+'-01',link:''});
  });
  applyAll(); return 1;
})()`);
await sleep(1500);
await evalJs(c, 'navigateTo("dimension"), 1');
await sleep(2500);
await evalJs(c, `(function(){var s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(s);return 1})()`);
await sleep(400);
const g = JSON.parse(await evalJs(c, '(function(){document.getElementById("dim-grid").scrollIntoView({block:"center",behavior:"instant"});var b=document.querySelectorAll(".spine-book")[3];var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})})()'));
await sleep(500);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y, button: 'none' });
await sleep(150);
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x + 2, y: g.y, button: 'none' });
await sleep(1200);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-shelf-final.png');
await evalJs(c, `(function(){document.querySelectorAll('style').forEach(function(s){if(s.textContent.indexOf('transition:none!important')>=0)s.remove()});return 1})()`);
await sleep(500);
await evalJs(c, 'openDimDetail(3,3,document.querySelectorAll(".spine-book")[3]), 1');
await sleep(1800);
await screenshot(c, 'B:/dell/Documents/harness/shots/dim-popup-final.png');
console.log('  截图完成');
ws2.close();
await closeTab(t.id);
