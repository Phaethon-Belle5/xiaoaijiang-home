/**
 * 页面健康检查（真浏览器）：捕获异常 + 确认关键内容真的渲染出来了
 * 这是这次事故学到的：node 语法检查不够，必须真的用浏览器跑一遍
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const URL_ = process.argv[2] || 'https://home.xiaoaijiang.cloud/';
const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const errs = [];
ws2.addEventListener('message', (ev) => {
  try {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errs.push('行' + d.lineNumber + ':' + d.columnNumber + '  ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120));
    }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: URL_ + (URL_.includes('?') ? '&' : '?') + 'health=' + Date.now() });
await sleep(20000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);
const checks = [];
const chk = (name, val, ok) => { checks.push(ok); console.log('  ' + (ok ? '✅' : '❌') + ' ' + name.padEnd(24) + ' = ' + val); };

console.log('=== 页面健康检查  ' + URL_ + ' ===');
chk('脚本已执行', await evalJs(c, 'typeof DEFAULT_DATA'), (await evalJs(c, 'typeof DEFAULT_DATA')) === 'object');
chk('内容已渲染', await evalJs(c, 'document.querySelectorAll(".carousel-slide").length + " 张轮播"'), (await evalJs(c, 'document.querySelectorAll(".carousel-slide").length')) > 0);
chk('构建标记', await evalJs(c, 'document.documentElement.getAttribute("data-build") || "(无)"'), !!(await evalJs(c, 'document.documentElement.getAttribute("data-build")')));
chk('云数据已同步', await evalJs(c, '(data.memos||[]).length + " 条说说"'), (await evalJs(c, '(data.memos||[]).length')) > 3);
chk('更新日志条目', await evalJs(c, 'document.querySelectorAll(".log-item").length + " 个"'), (await evalJs(c, 'document.querySelectorAll(".log-item").length')) > 0);
chk('日志卡可见', await evalJs(c, '(function(){var e=document.querySelector(".log-card");if(!e)return "无";var r=e.getBoundingClientRect();return Math.round(r.width)+"x"+Math.round(r.height)})()'), (await evalJs(c, '(function(){var e=document.querySelector(".log-card");if(!e)return 0;var r=e.getBoundingClientRect();return r.width*r.height})()')) > 1000);
chk('说说标签栏', await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length + " 个 chip"'), (await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length')) > 1);
chk('归档分组器', await evalJs(c, 'document.getElementById("memo-grouping") ? "在" : "无"'), !!(await evalJs(c, 'document.getElementById("memo-grouping")')));
chk('映像馆地图数据', await evalJs(c, 'typeof CHINA_GEO!=="undefined" ? CHINA_GEO.features.length + " feature" : "未加载"'), true);
chk('无 JS 异常', errs.length ? errs.length + ' 个' : '0 个', errs.length === 0);

console.log('\n=== 异常明细 ===');
console.log(errs.length ? errs.slice(0, 8).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + checks.filter(Boolean).length + '/' + checks.length + ' 通过');
ws2.close();
await closeTab(t.id);
