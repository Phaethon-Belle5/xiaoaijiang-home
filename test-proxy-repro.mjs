/**
 * 决定性对比：同一个无头 Edge，分别「不走代理」和「显式走 127.0.0.1:65532」打开站点，
 * 看是否能复现用户的 ERR_CERT_COMMON_INVALID。
 */
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, openTab, closeTab, sleep, evalJs } from './cdp-client.mjs';

const EXE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function test(label, extraArgs, port) {
  const udd = await mkdtemp(join(tmpdir(), 'edge-t-'));
  const args = ['--headless=new', '--remote-debugging-port=' + port, '--remote-allow-origins=*',
    '--user-data-dir=' + udd, '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    ...extraArgs, 'about:blank'];
  const proc = spawn(EXE, args, { detached: true, stdio: 'ignore' });
  proc.unref();
  await sleep(7000);
  const CDP = 'http://127.0.0.1:' + port;
  const t = await (await fetch(CDP + '/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const c = await connect(t.webSocketDebuggerUrl);
  const errs = [];
  const ws2 = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws2.addEventListener('open', r));
  ws2.addEventListener('message', (ev) => {
    try { const m = JSON.parse(ev.data);
      if (m.method === 'Network.loadingFailed') errs.push(m.params.errorText);
    } catch (e) {}
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
  await c.send('Page.enable');
  await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?p=' + Date.now() });
  await sleep(12000);
  let title = '', len = 0, host = '';
  try { title = await evalJs(c, 'document.title'); host = await evalJs(c, 'location.host'); len = await evalJs(c, 'document.body ? document.body.innerText.length : 0'); } catch (e) {}
  console.log('  ' + (len > 50 ? '✅' : '❌') + ' ' + label.padEnd(30) + ' title="' + title + '" host=' + host + ' 内容=' + len + ' 字' + (errs.length ? '  加载失败=' + [...new Set(errs)].join(',') : ''));
  ws2.close();
  await closeTab(t.id);
  try { process.kill(-proc.pid); } catch (e) { try { proc.kill(); } catch (e2) {} }
  await sleep(1500);
}

console.log('════ 无头 Edge 对比测试 ════');
await test('① 不走代理（默认）', [], 9331);
await test('② 显式走系统代理 65532', ['--proxy-server=http://127.0.0.1:65532'], 9332);
await test('③ 直连、忽略系统代理', ['--no-proxy-server'], 9333);
console.log('\n提示：若 ② 失败而 ①③ 正常 → 代理是元凶；若三者都正常 → 问题在用户那个已开很久的浏览器实例');
