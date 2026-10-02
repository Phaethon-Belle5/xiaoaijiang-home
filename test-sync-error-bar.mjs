/**
 * 验证新加的「云端数据失败」红色提示条
 *  · 3 次全失败 → 底部应出现红色提示条，写着失败原因，带「重试」「关闭」
 *  · 点「重试」且此时网络恢复 → 提示条消失、数据到位
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));

let blockAll = true;
let attempts = 0;
ws2.addEventListener('message', async (ev) => {
  let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request } = m.params;
    if (/\/api\/data/.test(request.url)) {
      attempts++;
      try {
        if (blockAll) await ws2.send(JSON.stringify({ id: 9000 + attempts, method: 'Fetch.failRequest', params: { requestId, errorReason: 'ConnectionFailed' } }));
        else await ws2.send(JSON.stringify({ id: 9000 + attempts, method: 'Fetch.continueRequest', params: { requestId } }));
      } catch (e) {}
    } else {
      try { await ws2.send(JSON.stringify({ id: 9500 + attempts, method: 'Fetch.continueRequest', params: { requestId } })); } catch (e) {}
    }
  }
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
ws2.send(JSON.stringify({ id: 4, method: 'Fetch.enable', params: { patterns: [{ urlPattern: '*/api/data*' }] } }));
await sleep(400);

// 清掉本地缓存，保证走"无痕首次访问"路径
await c.send('Storage.clearDataForOrigin', { origin: 'https://home.xiaoaijiang.cloud', storageTypes: 'all' }).catch(() => {});
await sleep(600);

await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?errbar=' + Date.now() });
await sleep(30000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);
console.log('════ 阶段 1：/api/data 全失败 ════');
line('请求次数', attempts + ' 次');
line('提示条是否出现', await evalJs(c, 'document.getElementById("sync-err") ? "✅ 出现" : "❌ 没出现"'));
line('提示条文案', await evalJs(c, '(function(){var e=document.getElementById("sync-err");return e?e.innerText.replace(/\\s+/g," ").slice(0,140):"无"})()'));
line('失败原因', await evalJs(c, 'document.getElementById("sync-err-reason") ? document.getElementById("sync-err-reason").textContent : "无"'));
line('重试按钮', await evalJs(c, 'document.getElementById("sync-err-retry") ? "有" : "无"'));
line('关闭按钮', await evalJs(c, 'document.getElementById("sync-err-close") ? "有" : "无"'));
line('页面仍可用', await evalJs(c, 'document.querySelectorAll(".carousel-slide").length ? "✅ 渲染正常" : "❌"'));
line('说说条数', await evalJs(c, '(data.memos||[]).length + " 条（默认）"'));

console.log('\n════ 阶段 2：放开网络，点「重试」 ════');
blockAll = false;
await evalJs(c, 'document.getElementById("sync-err-retry").click(); 1');
await sleep(9000);
line('提示条是否消失', await evalJs(c, 'document.getElementById("sync-err") ? "❌ 还在" : "✅ 已消失"'));
line('当前地址', await evalJs(c, 'location.href.slice(0, 60)'));
line('说说条数', await evalJs(c, '(data.memos||[]).length + " 条"'));
line('更新日志条数', await evalJs(c, '(data.changelog||[]).length + " 条"'));
line('日志卡条目', await evalJs(c, 'document.querySelectorAll(".log-item").length + " 个"'));
line('标签栏 chip', await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length + " 个"'));

ws2.close();
await closeTab(t.id);
