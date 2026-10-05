/**
 * 干净版验证「上游连不上时快速失败」：
 *  1) 清掉热榜所有缓存与失败记忆
 *  2) 屏蔽 60s.viki.moe（抖音/微博/知乎的唯一来源）
 *  3) 点「微博」→ 应在 ~5 秒内失败并给出提示（原来是 12 秒）
 *  4) 再点一次 → 应几乎瞬间（失败记忆）
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?ff=' + Date.now() });
await sleep(20000);
const line = (n, v) => console.log('  ' + String(n).padEnd(24) + ' = ' + String(v).slice(0, 110));

line('页面已就绪', await evalJs(c, 'typeof loadHot === "function" ? "是" : "❌ 脚本没跑"'));

// 清掉热榜相关缓存，确保走"无缓存 + 直连失败"这条路
await evalJs(c, `(function(){
  localStorage.removeItem('xiaoaijiang-hot-cache-v1');
  localStorage.removeItem('xiaoaijiang-hot-direct-fail-v1');
  _hotCache={};
  return 1;
})()`);
await sleep(500);
line('缓存已清', await evalJs(c, '(function(){return (localStorage.getItem("xiaoaijiang-hot-cache-v1")||"(空)")==="(空)"?"是":"否"})()'));

// 屏蔽上游
await c.send('Network.setBlockedURLs', { urls: ['*60s.viki.moe*'] });
await sleep(500);

const clickTab = async (src) => { await evalJs(c, `(function(){var t=document.querySelector('.hot-tab[data-src="${src}"]');if(t)t.click();return !!t})()`); };
const waitSettle = async () => {
  const t0 = Date.now();
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    const st = await evalJs(c, '(function(){var e=document.querySelector("#hot-list .hot-state");return e?e.textContent.trim():"(有内容)"})()');
    if (st && st.indexOf('正在获取') < 0) return { ms: Date.now() - t0, state: st };
  }
  return { ms: -1, state: '超时仍在加载' };
};

console.log('\n--- 第一次点「微博」（无缓存 + 上游被屏蔽）---');
await clickTab('github'); await sleep(800);
await clickTab('weibo');
let r = await waitSettle();
console.log('  耗时 ' + r.ms + ' ms    提示: ' + r.state);
const first = r.ms;

console.log('\n--- 第二次点「微博」（失败记忆应让它秒回）---');
await clickTab('github'); await sleep(800);
await clickTab('weibo');
r = await waitSettle();
console.log('  耗时 ' + r.ms + ' ms    提示: ' + r.state);
const second = r.ms;

line('失败记忆', await evalJs(c, '(function(){try{return JSON.stringify(JSON.parse(localStorage.getItem("xiaoaijiang-hot-direct-fail-v1")||"{}"))}catch(e){return "读取失败"}})()'));
line('hotDirectBlocked("weibo")', await evalJs(c, '(function(){try{return hotDirectBlocked("weibo")?"true（已标记屏蔽）":"false"}catch(e){return "❌ "+e.message}})()'));

console.log('\n--- 恢复网络后刷新 ---');
await c.send('Network.setBlockedURLs', { urls: [] });
await evalJs(c, '(function(){localStorage.removeItem("xiaoaijiang-hot-direct-fail-v1");return 1})()');
await sleep(400);
await clickTab('github'); await sleep(800);
await clickTab('weibo');
r = await waitSettle();
const third = r.ms;
const items = await evalJs(c, 'document.querySelectorAll("#hot-list .hot-item").length');
console.log('  耗时 ' + r.ms + ' ms    结果: ' + items + ' 条');

console.log('\n════ 判定 ════');
const ok = (n, v) => console.log('  ' + (v ? '✅' : '❌') + ' ' + n);
ok('第一次失败在 7 秒内（原来要等满 12 秒）  [' + first + ' ms]', first > 0 && first <= 7000);
ok('第二次几乎瞬间（失败记忆生效）        [' + second + ' ms]', second > 0 && second <= 2000);
ok('失败后提示文案可读', /取不到|重试|失败/.test(r.state) || third > 0);
ok('恢复后能重新取到 30 条               [' + items + ' 条]', items > 0);
await closeTab(t.id);
