// 验证：非管理员看不到置顶按钮（避免普通访客点了改不动、以为坏了）
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/home?adm=' + Date.now() });
await sleep(22000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);
console.log('════ 非管理员视角 ════');
line('isAdmin', await evalJs(c, 'typeof isAdmin!=="undefined" ? isAdmin : "未定义"'));
line('置顶按钮数量', await evalJs(c, 'document.querySelectorAll(".log-pinbtn").length'));
line('日志条目数', await evalJs(c, 'document.querySelectorAll(".log-item").length'));
line('类别 chip', await evalJs(c, `JSON.stringify([].slice.call(document.querySelectorAll('.log-chip')).map(function(e){return e.textContent}))`));
line('排序按钮', await evalJs(c, 'document.querySelector(".log-sortbtn") ? "有" : "无"'));
line('点击标签后仍可筛选', await evalJs(c, `(function(){setLogFilter('修复');var n=document.querySelectorAll('.log-item').length;setLogFilter('');return n})()`) + ' 条（修复）');
line('渲染错误', await evalJs(c, 'JSON.stringify(RENDER_ERRORS)'));

await closeTab(t.id);
