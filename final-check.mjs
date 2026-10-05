// 最终确认：独立浏览器走系统设置（现在会绕过代理）打开站点
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const fails = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Network.loadingFailed' && /cert|ssl|handshake/i.test(m.params.errorText || '')) fails.push(m.params.errorText);
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Network.enable' }));

let okCount = 0;
for (let i = 1; i <= 6; i++) {
  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?r=' + i + '&t=' + Date.now() });
  await sleep(7000);
  const title = await evalJs(c, 'document.title');
  const len = await evalJs(c, 'document.body ? document.body.innerText.length : 0');
  const good = len > 50;
  if (good) okCount++;
  console.log('  第 ' + i + ' 次  ' + (good ? '✅' : '❌') + '  标题="' + title + '"  内容 ' + len + ' 字');
}
console.log('\n  成功 ' + okCount + '/6' + (okCount === 6 ? '   ✅ 全部正常' : '   ⚠ 仍有失败'));
if (fails.length) console.log('  证书类失败: ' + [...new Set(fails)].join(', '));
else console.log('  证书类失败: 无');
const build = await evalJs(c, 'document.documentElement.getAttribute("data-build") || "(无)"');
console.log('  构建标记 = ' + build);
ws2.close();
await closeTab(t.id);
