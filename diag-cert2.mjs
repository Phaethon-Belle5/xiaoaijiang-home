/**
 * 紧急排查证书报错：
 *  ① 用你这台机器上的独立浏览器（无扩展、无代理）打开，看是否正常 → 排除服务器问题
 *  ② 查 Cloudflare 上 Pages 自定义域名的 SSL 状态 → 排除边缘节点证书未铺开
 *  ③ 对比 Pages 直连域名（不经过自定义域名）
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
import { readFile } from 'node:fs/promises';

console.log('════ ① 独立浏览器实测（同一台机器、同一网络）════');
for (const url of ['https://home.xiaoaijiang.cloud/', 'https://home-v2-3wz.pages.dev/', 'https://map.231060101.xyz/']) {
  const t = await openTab('about:blank');
  const c = await connect(t.ws);
  let err = null;
  const ws2 = new WebSocket(t.ws);
  await new Promise(r => ws2.addEventListener('open', r));
  ws2.addEventListener('message', (ev) => {
    try { const m = JSON.parse(ev.data);
      if (m.method === 'Network.loadingFailed' && /cert|ssl/i.test(m.params.errorText || '')) err = m.params.errorText;
    } catch (e) {}
  });
  ws2.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
  try {
    await c.send('Page.navigate', { url });
    await sleep(9000);
    const title = await evalJs(c, 'document.title');
    const host = await evalJs(c, 'location.host');
    const loaded = await evalJs(c, 'document.body ? document.body.innerText.length : 0');
    console.log('  ' + (loaded > 50 ? '✅' : '❌') + ' ' + url.padEnd(38) + ' 标题="' + title + '"  内容 ' + loaded + ' 字' + (err ? '  证书错误=' + err : ''));
  } catch (e) { console.log('  ❌ ' + url + '  ' + e.message.slice(0, 60)); }
  ws2.close();
  await closeTab(t.id);
}

console.log('\n════ ② Cloudflare 上自定义域名的 SSL 状态 ════');
try {
  let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
  if (!TOK) { const c2 = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8'); TOK = (c2.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
  const H = { Authorization: 'Bearer ' + TOK };
  const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
  const pj = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/pages/projects`, { headers: H })).json();
  if (!pj.success) console.log('  取项目失败: ' + JSON.stringify(pj.errors).slice(0, 140));
  else for (const p of pj.result) {
    if (!['home-v2', 'map-gallery'].includes(p.name)) continue;
    console.log('  ' + p.name + '  子域=' + p.subdomain + '  生产分支=' + p.production_branch);
    for (const d of (p.domains || [])) console.log('     域名 ' + d);
    const dz = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/pages/projects/${p.name}/domains`, { headers: H })).json();
    if (dz.success) for (const d of dz.result) console.log('     ' + String(d.name).padEnd(30) + ' 状态=' + d.status + '  cert状态=' + (d.certificate_authority || '-') + '  validation=' + JSON.stringify(d.validation_data || {}).slice(0, 90));
    else console.log('     域名详情取不到');
  }
} catch (e) { console.log('  ❌ ' + e.message.slice(0, 80)); }

console.log('\n════ ③ 结论提示 ════');
console.log('  若 ① 全部正常 → 服务器与你的网络链路都没问题，是浏览器自身（代理/证书拦截/缓存）');
