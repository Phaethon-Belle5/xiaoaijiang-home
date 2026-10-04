// 验收：两个站页脚都不再显示构建标记；更新日志已更新
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

async function check(label, url, sel) {
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Network.clearBrowserCache').catch(() => {});
  await c.send('Page.navigate', { url: url + (url.includes('?') ? '&' : '?') + 'z=' + Date.now() });
  await sleep(22000);
  console.log('\n════ ' + label + ' ════');
  console.log('  页脚文案          = ' + await evalJs(c, `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?e.textContent.replace(/\\s+/g,' ').trim().slice(0,110):'找不到'})()`));
  console.log('  页脚是否还提"构建" = ' + await evalJs(c, `(function(){var e=document.querySelector(${JSON.stringify(sel)});return e?(/构建/.test(e.textContent)?'❌ 还在':'✅ 已去掉'):'?'})()`));
  console.log('  footBuild 元素     = ' + await evalJs(c, `document.getElementById('footBuild') ? '仍存在' : '✅ 已移除'`));
  return { t, c };
}

const a = await check('主站', 'https://home.xiaoaijiang.cloud/', '.footer-meta');
console.log('  更新日志前两条 = ' + await evalJs(a.c, `(function(){var n=document.querySelectorAll('.log-name');return n.length?JSON.stringify([].slice.call(n).slice(0,2).map(function(e){return e.textContent.slice(0,30)})):'(日志卡未渲染)'})()`));
console.log('  日志条目数     = ' + await evalJs(a.c, 'document.querySelectorAll(".log-item").length'));
console.log('  今天(10-04)条数 = ' + await evalJs(a.c, `[].slice.call(document.querySelectorAll('.log-date')).filter(function(e){return /10-04/.test(e.textContent)}).length`));
await closeTab(a.t.id);

const b = await check('映像馆', 'https://map-gallery-ewt.pages.dev/', '.foot-stats');
await closeTab(b.t.id);
