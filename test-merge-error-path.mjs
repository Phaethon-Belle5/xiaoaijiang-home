/**
 * 验证「合并/渲染出错」这条新路径：
 *  1) 注入一个 applyAll 错误 → 同步时应弹出红条，原因写明"本地数据合并出错"
 *  2) 点「清缓存重载」→ 本地缓存被清掉并重新加载 → 数据应恢复正常
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 100)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);

// 清缓存，保证初始是默认数据（这样云数据一定"不同"，会走到合并+applyAll）
await c.send('Storage.clearDataForOrigin', { origin: 'https://home.xiaoaijiang.cloud', storageTypes: 'all' }).catch(() => {});
await sleep(600);
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?mergetest=' + Date.now() });
await sleep(20000);

console.log('════ 前置状态 ════');
line('说说条数', await evalJs(c, '(data.memos||[]).length'));
line('红条是否已出现', await evalJs(c, 'document.getElementById("sync-err") ? "出现了（不该出现）" : "没有（正常）"'));

console.log('\n════ 注入 applyAll 错误，再触发一次同步 ════');
await evalJs(c, `(async()=>{
  window.__origApplyAll = applyAll;
  applyAll = function(){ throw new Error('注入的测试错误'); };
  // 把本地数据改回默认，让云数据与本地不同 → 一定会走合并分支
  data.memos=[{id:'x',text:'本地占位',date:'2000-01-01'}];
  data.changelog=[];
  await syncFromCloud();
  return 'syncFromCloud 已执行';
})()`);
await sleep(3000);

line('红条出现', await evalJs(c, 'document.getElementById("sync-err") ? "✅ 出现" : "❌ 没出现"'));
line('红条原因', await evalJs(c, 'document.getElementById("sync-err-reason") ? document.getElementById("sync-err-reason").textContent : "无"'));
line('红条全文', await evalJs(c, '(function(){var e=document.getElementById("sync-err");return e?e.innerText.replace(/\\s+/g," ").slice(0,150):"无"})()'));
line('有「清缓存重载」按钮', await evalJs(c, 'document.getElementById("sync-err-reset") ? "有" : "无"'));

console.log('\n════ 点「清缓存重载」════');
await evalJs(c, 'applyAll = window.__origApplyAll; document.getElementById("sync-err-reset").click(); 1');
await sleep(22000);
line('当前地址', await evalJs(c, 'location.href.slice(0, 55)'));
line('说说条数', await evalJs(c, '(data.memos||[]).length + " 条"'));
line('更新日志条数', await evalJs(c, '(data.changelog||[]).length + " 条"'));
line('日志卡条目', await evalJs(c, 'document.querySelectorAll(".log-item").length + " 个"'));
line('标签栏 chip', await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length + " 个"'));
line('红条是否已消失', await evalJs(c, 'document.getElementById("sync-err") ? "❌ 还在" : "✅ 已消失"'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 5).map(e => '  ' + e).join('\n') : '  （无未捕获异常）');
ws2.close();
await closeTab(t.id);
