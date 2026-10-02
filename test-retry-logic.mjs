/**
 * 真实验证 fetchCloudData 的重试逻辑（不只是走顺利路径）
 *
 * 用例 A：前 2 次 /api/data 失败，第 3 次放行 → 页面应该最终拿到云端数据
 * 用例 B：3 次全失败 → 页面应该优雅停在本地/默认数据，不崩、不报未捕获异常
 *
 * 用 CDP 的 Fetch 域拦截：requestPaused 时按策略 failRequest / continueRequest
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

async function runCase(label, failFirstN) {
  console.log('\n════════════ ' + label + ' ════════════');
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));

  let attempts = 0;
  const exceptions = [];
  const consoleWarns = [];

  ws2.addEventListener('message', async (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      if (/\/api\/data/.test(request.url)) {
        attempts++;
        try {
          if (attempts <= failFirstN) {
            await ws2.send(JSON.stringify({ id: 9000 + attempts, method: 'Fetch.failRequest', params: { requestId, errorReason: 'ConnectionFailed' } }));
          } else {
            await ws2.send(JSON.stringify({ id: 9000 + attempts, method: 'Fetch.continueRequest', params: { requestId } }));
          }
        } catch (e) {}
      } else {
        try { await ws2.send(JSON.stringify({ id: 9100 + attempts, method: 'Fetch.continueRequest', params: { requestId } })); } catch (e) {}
      }
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110));
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map(a => a.value || a.description || '').join(' ');
      if (/云同步/.test(txt)) consoleWarns.push(txt.slice(0, 110));
    }
  });

  ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
  ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
  ws2.send(JSON.stringify({ id: 4, method: 'Fetch.enable', params: { patterns: [{ urlPattern: '*/api/data*' }] } }));
  await sleep(500);

  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?retry=' + Date.now() });
  await sleep(26000);

  const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);
  line('/api/data 请求次数', attempts + ' 次' + (failFirstN >= 3 ? '（预期 3 次，全失败）' : '（预期 3 次：前 ' + failFirstN + ' 次失败、第 3 次成功）'));
  line('页面是否还活着', await evalJs(c, 'typeof DEFAULT_DATA === "object" ? "是（脚本已执行）" : "❌ 脚本没执行"'));
  line('内容是否渲染', await evalJs(c, 'document.querySelectorAll(".carousel-slide").length ? "✅ " + document.querySelectorAll(".carousel-slide").length + " 张轮播" : "❌ 没渲染"'));
  line('说说条数', await evalJs(c, '(data.memos||[]).length + " 条"'));
  line('更新日志条数', await evalJs(c, '(data.changelog||[]).length + " 条"'));
  line('日志卡 DOM', await evalJs(c, 'document.querySelectorAll(".log-item").length + " 个"'));
  line('云同步状态', await evalJs(c, '(data.memos||[]).length>DEFAULT_DATA.memos.length ? "已到位" : "停在默认数据"'));
  line('控制台云同步日志', consoleWarns.length + ' 条');
  consoleWarns.slice(0, 5).forEach(w => console.log('      · ' + w));
  line('未捕获异常', exceptions.length + ' 个');
  exceptions.slice(0, 4).forEach(w => console.log('      · ' + w));

  ws2.close();
  await closeTab(t.id);
  return { attempts, memos: await Promise.resolve(0) };
}

// 用例 A：前两次失败，第三次应该成功
await runCase('用例 A：前 2 次失败 → 第 3 次放行（验证重试真的会再试）', 2);
// 用例 B：三次全失败
await runCase('用例 B：3 次全失败（验证优雅降级，不崩）', 3);
