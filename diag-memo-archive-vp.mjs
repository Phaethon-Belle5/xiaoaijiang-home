/**
 * 归档在不同视口下的表现（怀疑是移动端/窄屏被裁掉）
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const VPS = [[1440, 900], [1100, 900], [820, 1180], [390, 844], [320, 640]];

for (const [w, h] of VPS) {
  console.log('\n══════ 视口 ' + w + 'x' + h + ' ══════');
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));
  const exceptions = [];
  ws2.addEventListener('message', (ev) => {
    try { const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 90)); }
    } catch (e) {}
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/memos?vp=' + w + '&t=' + Date.now() });
  await sleep(20000);
  const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 110));

  await evalJs(c, 'navigateTo("memos"), 1');
  await sleep(2200);
  await evalJs(c, 'setMemoMode("archive"), 1');
  await sleep(2200);

  line('memoMode', await evalJs(c, 'memoMode'));
  line('归档区 hidden', await evalJs(c, 'document.getElementById("memo-archive").hidden'));
  line('归档区尺寸', await evalJs(c, '(function(){var r=document.getElementById("memo-archive").getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)+" @top"+Math.round(r.top)})()'));
  line('innerHTML 长度', await evalJs(c, 'document.getElementById("memo-archive").innerHTML.length'));
  line('月份组/行数', await evalJs(c, 'document.querySelectorAll(".memo-arch-month").length + " 组 / " + document.querySelectorAll(".memo-arch-row").length + " 行"'));
  line('文本前 50 字', await evalJs(c, '(document.getElementById("memo-archive").innerText||"").replace(/\\s+/g," ").trim().slice(0,50)'));
  line('归档区可见吗', await evalJs(c, `(function(){
    var e=document.getElementById("memo-archive");var r=e.getBoundingClientRect();
    var st=getComputedStyle(e);
    if(r.width<10||r.height<10)return "❌ 尺寸为 0";
    if(st.display==="none"||st.visibility==="hidden")return "❌ "+st.display+"/"+st.visibility;
    var probe=document.elementFromPoint(Math.round(r.left+r.width/2), Math.round(Math.min(innerHeight-6, r.top+40)));
    if(!probe)return "⚠ 视口外（top="+Math.round(r.top)+"）";
    var inside=e.contains(probe)||probe===e;
    return inside?("✅ 可见且可点，命中 "+probe.className.toString().split(" ")[0]):("❌ 被遮挡，命中 "+probe.tagName+"."+probe.className.toString().split(" ")[0]);
  })()`));
  line('面板容器 overflow/高度', await evalJs(c, `(function(){
    var e=document.getElementById("memo-archive");
    var out=[],n=e.parentElement;
    while(n&&n!==document.body&&out.length<4){var st=getComputedStyle(n);var r=n.getBoundingClientRect();
      out.push(n.tagName.toLowerCase()+(n.id?"#"+n.id:"")+" "+Math.round(r.height)+"px ovf="+st.overflow+" maxH="+st.maxHeight);
      n=n.parentElement}
    return out.join("  |  ");
  })()`));
  line('异常', exceptions.length ? exceptions.slice(0, 3).join(' ; ') : '无');

  if (w === 390) await screenshot(c, 'B:/dell/Documents/harness/shots/memo-archive-390.png');
  if (w === 1440) await screenshot(c, 'B:/dell/Documents/harness/shots/memo-archive-1440.png');
  ws2.close();
  await closeTab(t.id);
}
console.log('\n截图: shots/memo-archive-390.png / memo-archive-1440.png');
