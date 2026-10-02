/**
 * 补齐验证：清空本地存储 + /api/data 全失败 → 页面应优雅停在默认数据
 * （上一轮用例 B 被前一个用例留下的本地缓存污染了，这里先清干净）
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

async function runCase(label, failFirstN, clearStorage) {
  console.log('\n════════════ ' + label + ' ════════════');
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));

  let attempts = 0;
  const exceptions = [];
  const warns = [];
  ws2.addEventListener('message', async (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      if (/\/api\/data/.test(request.url)) {
        attempts++;
        try {
          if (attempts <= failFirstN) await ws2.send(JSON.stringify({ id: 9000 + attempts, method: 'Fetch.failRequest', params: { requestId, errorReason: 'ConnectionFailed' } }));
          else await ws2.send(JSON.stringify({ id: 9000 + attempts, method: 'Fetch.continueRequest', params: { requestId } }));
        } catch (e) {}
      } else {
        try { await ws2.send(JSON.stringify({ id: 9200 + attempts, method: 'Fetch.continueRequest', params: { requestId } })); } catch (e) {}
      }
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110));
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map(a => a.value || a.description || '').join(' ');
      if (/云同步/.test(txt)) warns.push(txt.slice(0, 120));
    }
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
  ws2.send(JSON.stringify({ id: 3, method: 'Network.enable' }));
  ws2.send(JSON.stringify({ id: 4, method: 'Fetch.enable', params: { patterns: [{ urlPattern: '*/api/data*' }] } }));
  await sleep(400);

  if (clearStorage) {
    await c.send('Storage.clearDataForOrigin', { origin: 'https://home.xiaoaijiang.cloud', storageTypes: 'all' }).catch(() => {});
    await sleep(800);
  }

  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?c=' + Date.now() });
  await sleep(28000);

  const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + v);
  line('本地存储', clearStorage ? '已清空（等同无痕）' : '保留');
  line('/api/data 请求次数', attempts + ' 次');
  line('脚本已执行', await evalJs(c, 'typeof DEFAULT_DATA === "object" ? "是" : "❌ 否"'));
  line('内容已渲染', await evalJs(c, 'document.querySelectorAll(".carousel-slide").length ? "✅ " + document.querySelectorAll(".carousel-slide").length + " 张轮播" : "❌ 没渲染"'));
  line('说说条数', await evalJs(c, '(data.memos||[]).length + " 条"'));
  line('更新日志条数', await evalJs(c, '(data.changelog||[]).length + " 条"'));
  const logCardState = await evalJs(c, `(function(){
    var e=document.querySelector(".log-card");
    if(!e)return "没有日志卡";
    if(e.querySelector(".log-empty")||/还没有记录/.test(e.innerText))return "「还没有记录」占位";
    return "列了 " + e.querySelectorAll(".log-item").length + " 条";
  })()`);
  line('日志卡显示', logCardState);
  line('标签栏', await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length + " 个 chip"'));
  line('未捕获异常', exceptions.length + ' 个');
  exceptions.slice(0, 4).forEach(e => console.log('      · ' + e));
  console.log('  控制台云同步日志 ' + warns.length + ' 条:');
  warns.slice(0, 5).forEach(w => console.log('      · ' + w));

  ws2.close();
  await closeTab(t.id);
}

// 无痕 + 全部失败：验证优雅降级到默认数据
await runCase('无本地缓存 + /api/data 3 次全失败', 3, true);
// 无痕 + 前两次失败：验证重试能从零恢复
await runCase('无本地缓存 + 前 2 次失败、第 3 次成功', 2, true);
