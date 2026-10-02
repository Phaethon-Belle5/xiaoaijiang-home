// Verify the render-error banner (ASCII only to avoid encoding issues)
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 90));
    }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });

const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + v);

await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?rerr=' + Date.now() });
await sleep(20000);

console.log('[1] normal state - banner should NOT exist');
line('render-err present', await evalJs(c, '!!document.getElementById("render-err")'));
line('RENDER_ERRORS', await evalJs(c, 'JSON.stringify(RENDER_ERRORS)'));

console.log('\n[2] inject renderMain error, rerun applyAll');
await evalJs(c, `(function(){
  window.__origRenderMain = renderMain;
  renderMain = function(){ throw new Error('INJECTED renderMain failure'); };
  RENDER_ERRORS.length = 0;
  applyAll();
  return 'done';
})()`);
await sleep(1500);
line('render-err present', await evalJs(c, '!!document.getElementById("render-err")'));
line('banner text', await evalJs(c, '(function(){var e=document.getElementById("render-err");return e?e.innerText.replace(/\\s+/g," ").slice(0,190):"none"})()'));
line('RENDER_ERRORS', await evalJs(c, 'JSON.stringify(RENDER_ERRORS)'));
line('carousel still present', await evalJs(c, 'document.querySelectorAll(".carousel-slide").length'));

console.log('\n[3] restore and rerun - banner should be removable');
await evalJs(c, 'renderMain = window.__origRenderMain; RENDER_ERRORS.length=0; var e=document.getElementById("render-err"); if(e)e.remove(); applyAll(); 1');
await sleep(1500);
line('render-err present', await evalJs(c, '!!document.getElementById("render-err")'));
line('carousel', await evalJs(c, 'document.querySelectorAll(".carousel-slide").length'));
line('log items', await evalJs(c, 'document.querySelectorAll(".log-item").length'));
line('tag chips', await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length'));

console.log('\n[4] uncaught exceptions');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  (none)');
ws2.close();
await closeTab(t.id);
