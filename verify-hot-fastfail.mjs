/**
 * 验证「上游连不上时不再干等」：
 *  ① 屏蔽 60s.viki.moe，再点「微博」→ 应在 ~5 秒内失败（原来是 12 秒）
 *  ② 再点一次「微博」→ 应几乎瞬间给出提示（失败记忆生效）
 *  ③ 恢复后点刷新 → 应能重新成功
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Storage.clearDataForOrigin', { origin: 'https://home.xiaoaijiang.cloud', storageTypes: 'all' }).catch(() => {});
await sleep(500);
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?fail=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + String(v).slice(0, 110));

line('首屏热榜条数', await evalJs(c, 'document.querySelectorAll("#hot-list .hot-item").length'));

console.log('\n--- 屏蔽 60s.viki.moe（模拟国内连不上）---');
await c.send('Network.setBlockedURLs', { urls: ['*60s.viki.moe*'] });
await sleep(500);

const clickTab = async (src) => {
  await evalJs(c, `(function(){var t=document.querySelector('.hot-tab[data-src="${src}"]');if(t)t.click();return !!t})()`);
};
const measure = async (label, src) => {
  const t0 = Date.now();
  await clickTab(src);
  let done = -1;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const st = await evalJs(c, '(function(){var e=document.querySelector("#hot-list .hot-state");return e?e.textContent.trim():"(有内容)"})()');
    const n = await evalJs(c, 'document.querySelectorAll("#hot-list .hot-item").length');
    if (n > 0 || (st && st.indexOf('正在') < 0)) { done = Date.now() - t0; lastState = st; break; }
  }
  console.log('  ' + label.padEnd(30) + (done >= 0 ? done + ' ms' : '超时') + '   结果: ' + await evalJs(c, '(function(){var e=document.querySelector("#hot-list .hot-state");return e?e.textContent.trim().slice(0,40):("有 "+document.querySelectorAll("#hot-list .hot-item").length+" 条")})()'));
  return done;
};
let lastState = '';

console.log('\n--- 第一次点「微博」（直连被屏蔽）---');
const t1 = await measure('第一次点微博', 'weibo');

console.log('\n--- 第二次点「微博」（失败记忆应让它秒回）---');
await clickTab('github'); await sleep(1000);
const t2 = await measure('第二次点微博', 'weibo');

console.log('\n--- 失败记忆是否写入 ---');
line('失败记录', await evalJs(c, '(function(){try{var a=JSON.parse(localStorage.getItem("xiaoaijiang-hot-direct-fail-v1")||"{}");return Object.keys(a).join(",")||"(空)"}catch(e){return "读取失败"}})()'));
line('weibo 被标记屏蔽', await evalJs(c, '(function(){try{return typeof hotDirectBlocked==="function"?(hotDirectBlocked("weibo")?"是":"否"):"函数不存在"}catch(e){return "❌ "+e.message}})()'));

console.log('\n--- 恢复网络后点刷新 ---');
await c.send('Network.setBlockedURLs', { urls: [] });
await evalJs(c, '(function(){localStorage.removeItem("xiaoaijiang-hot-direct-fail-v1");return 1})()');
await sleep(400);
const t3 = await measure('恢复后重新取微博', 'weibo');

console.log('\n════ 判定 ════');
const ok = (n, v) => console.log('  ' + (v ? '✅' : '❌') + ' ' + n);
ok('第一次失败时间 ≤ 7 秒（原来要等 12 秒）', t1 > 0 && t1 <= 7000);
ok('第二次几乎瞬间（≤ 1.5 秒）—— 失败记忆生效', t2 > 0 && t2 <= 1500);
ok('恢复后能重新成功取到数据', t3 > 0);
await closeTab(t.id);
