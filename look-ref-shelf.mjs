/**
 * 打开参考项目，亲眼看看它的记忆书架和旅途影像长什么样
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 140)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });

const url = 'file:///B:/dell/Documents/harness/ref-your-china-travel/index.html';
console.log('打开: ' + url);
await c.send('Page.navigate', { url });
await sleep(9000);
const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 130));

line('标题', await evalJs(c, 'document.title'));
line('body 子节点数', await evalJs(c, 'document.body.children.length'));
line('有没有报错层', await evalJs(c, 'document.body.innerText.slice(0,120).replace(/\\s+/g," ")'));

// 找书架入口
const btn = await evalJs(c, `(function(){
  var all=[].slice.call(document.querySelectorAll('button,[role=button],a'));
  var hit=all.filter(function(b){return /记忆书架/.test(b.textContent)});
  return JSON.stringify({数量:hit.length, 文本:hit.slice(0,3).map(function(b){return b.textContent.trim().slice(0,20)})});
})()`);
line('书架入口', btn);

// 关掉可能存在的开屏
await evalJs(c, `(function(){
  ['launch','splash','intro','loading','preloader'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove();});
  document.querySelectorAll('.launch,.splash,.intro,.preloader,.loading-screen').forEach(function(e){e.remove();});
  return 1;
})()`);
await sleep(1200);

// 点书架
await evalJs(c, `(function(){
  var all=[].slice.call(document.querySelectorAll('button,[role=button],a'));
  var b=all.filter(function(x){return /记忆书架/.test(x.textContent)})[0];
  if(b){b.click();return 1}
  return 0;
})()`);
await sleep(5000);

line('书架弹层', await evalJs(c, `(function(){
  var sel=['.memory-shelf-overlay','.memory-shelf-dialog','#memoryShelf','.memory-shelf-viewport'];
  var out=[];
  sel.forEach(function(s){var e=document.querySelector(s);if(e){var r=e.getBoundingClientRect();var st=getComputedStyle(e);out.push(s+' 显示='+(st.display)+' '+Math.round(r.width)+'x'+Math.round(r.height))}});
  return out.join(' | ')||'（没找到书架容器）';
})()`));
line('书的本数', await evalJs(c, 'document.querySelectorAll(".memory-book").length'));
line('书的结构', await evalJs(c, `(function(){
  var b=document.querySelector('.memory-book');if(!b)return '无';
  return JSON.stringify({封面:!!b.querySelector('.memory-book-cover'),书脊:!!b.querySelector('.memory-book-spine-face'),封底:!!b.querySelector('.memory-book-back'),页:!!b.querySelector('.memory-book-page-face'),object:!!b.querySelector('.memory-book-object')});
})()`));

const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
const fs = await import('node:fs/promises');
await fs.writeFile('B:/dell/Documents/harness/shots/ref-shelf-1.png', Buffer.from(data, 'base64'));
console.log('  截图: shots/ref-shelf-1.png');

console.log('\n异常: ' + (exceptions.length ? exceptions.slice(0, 4).join(' | ') : '无'));
ws2.close();
await closeTab(t.id);
