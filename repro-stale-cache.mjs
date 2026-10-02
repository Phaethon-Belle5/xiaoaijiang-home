/**
 * 真实复现：往本地缓存里种入各种「旧版 / 损坏」的数据结构，
 * 逐个看能否复现用户症状（没有日志、说说标签点了没反应），并抓异常。
 *
 * 这比之前"注入 applyAll 错误"更接近真实：用户浏览器里就是一份历史遗留的缓存。
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const CASES = [
  ['基线：干净缓存（对照）', null],
  ['旧版缓存：memos 无 tags、无 changelog', 'oldVersion'],
  ['memos 是字符串', '{"memos":"坏掉的字符串"}'],
  ['memos 里有 null 项', '{"memos":[null,null,{"id":"a","text":"x","date":"2026-01-01"}]}'],
  ['modules 是字符串', '{"modules":"坏掉的模块"}'],
  ['portfolio 是对象（非数组）', '{"portfolio":{"a":1}}'],
  ['gallery 是字符串', '{"gallery":"坏掉的图库"}'],
  ['wallpaper 是字符串', '{"wallpaper":"坏掉"}'],
  ['profile 是字符串', '{"profile":"坏掉"}'],
  ['changelog 是字符串', '{"changelog":"坏掉"}'],
  ['memos 项缺字段', '{"memos":[{"text":"只有文字"}]}'],
  ['全部字段都坏', '{"memos":"x","modules":"x","portfolio":"x","gallery":"x","wallpaper":"x","profile":"x","changelog":"x"}'],
];

async function runCase(label, patch) {
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));
  const exceptions = [];
  ws2.addEventListener('message', (ev) => {
    try { const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 80)); }
    } catch (e) {}
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
  await c.send('Network.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true });

  // 先干净访问一次，建立正常缓存
  await c.send('Storage.clearDataForOrigin', { origin: 'https://home.xiaoaijiang.cloud', storageTypes: 'all' }).catch(() => {});
  await sleep(400);
  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?seed=' + Date.now() });
  await sleep(17000);

  // 种入"损坏"的缓存
  if (patch) {
    await evalJs(c, `(async()=>{
      const raw = ${JSON.stringify(patch)};
      let bad;
      if(raw==='oldVersion'){
        bad = JSON.parse(JSON.stringify(data));
        bad.changelog = undefined; delete bad.changelog;
        bad.memos = (bad.memos||[]).map(m=>{const x=Object.assign({},m);delete x.tags;return x;});
      } else {
        bad = Object.assign(JSON.parse(JSON.stringify(data)), JSON.parse(raw));
      }
      await dbSet(LS_KEY, bad);
      return '已种入';
    })()`);
  }

  // 重新加载（模拟回访）
  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?re=' + Date.now() });
  await sleep(20000);

  const r = {
    label,
    memos: await evalJs(c, '(data.memos||[]).length'),
    log: await evalJs(c, '(data.changelog||[]).length'),
    logItems: await evalJs(c, 'document.querySelectorAll(".log-item").length'),
    chips: await evalJs(c, 'document.querySelectorAll("#memo-tagbar .memo-tag").length'),
    redBar: await evalJs(c, 'document.getElementById("sync-err") ? document.getElementById("sync-err-reason").textContent : "无"'),
    rendered: await evalJs(c, 'document.querySelectorAll(".carousel-slide").length > 0 ? "是" : "否"'),
  };
  // 点一个标签，看筛选是否生效（用户说"点了没反应"）
  const clicked = await evalJs(c, `(function(){
    var e=document.querySelector("#memo-tagbar .memo-tag:not(:first-child)");
    if(!e)return "没有可点的标签";
    try{ e.click(); }catch(err){ return "点击抛错: "+err.message }
    return (typeof memoFilter!=="undefined" && memoFilter) ? ("✅ 筛选="+memoFilter) : "❌ 点了没反应";
  })()`);
  r.click = clicked;
  r.errs = exceptions.slice(0, 3);

  console.log('  ' + label.padEnd(30) + ' 说说' + String(r.memos).padStart(3) + ' 日志' + String(r.log).padStart(2) +
    ' 卡片' + String(r.logItems).padStart(2) + ' chip' + String(r.chips).padStart(2) +
    '  点击:' + r.click + (r.redBar !== '无' ? ('  红条:' + r.redBar.slice(0, 34)) : '') + (r.errs.length ? ('  异常:' + r.errs.length) : ''));

  ws2.close();
  await closeTab(t.id);
  return r;
}

console.log('════ 逐个测试本地缓存损坏形态（每行：种入 → 重载 → 观察）════\n');
const results = [];
for (const [label, patch] of CASES) {
  try { results.push(await runCase(label, patch)); }
  catch (e) { console.log('  ' + label.padEnd(30) + ' 测试本身出错: ' + e.message.slice(0, 60)); }
}

console.log('\n════ 出现问题的情形 ════');
const bad = results.filter(r => r.log === 0 || (r.click && r.click.indexOf('❌') >= 0));
if (!bad.length) console.log('  （没有一种旧缓存能复现"没有日志 / 标签点了没反应"）');
else bad.forEach(r => console.log('  · ' + r.label + '   日志=' + r.log + '  点击=' + r.click + (r.redBar !== '无' ? '  红条=' + r.redBar.slice(0, 40) : '') + (r.errs.length ? '  异常=' + r.errs.join(' / ') : '')));
