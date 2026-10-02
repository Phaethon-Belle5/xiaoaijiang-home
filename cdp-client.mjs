/**
 * 最小 CDP 客户端：直连无头 Edge（端口 9222），不依赖 web-access 代理。
 * 好处：可以自己开标签、导航、求值、截图，且不碰用户的浏览器。
 * Node 24 自带 WebSocket，无需第三方依赖。
 */
const CDP = 'http://127.0.0.1:9222';

export async function browserInfo() {
  const j = await (await fetch(CDP + '/json/version')).json();
  return j;
}

export async function openTab(url = 'about:blank') {
  const r = await fetch(CDP + '/json/new?' + encodeURIComponent(url), { method: 'PUT' });
  if (!r.ok) throw new Error('开标签失败 HTTP ' + r.status);
  const t = await r.json();
  return { id: t.id, ws: t.webSocketDebuggerUrl, target: t };
}

export async function closeTab(id) {
  try { await fetch(CDP + '/json/close/' + id); } catch (e) {}
}

export function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pend = new Map();
    ws.addEventListener('open', () => resolve({
      send(method, params) {
        return new Promise((res, rej) => {
          const mid = ++id;
          pend.set(mid, { res, rej });
          ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
        });
      },
      close() { try { ws.close(); } catch (e) {} },
    }));
    ws.addEventListener('error', (e) => reject(new Error('WS 错误')));
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.id && pend.has(m.id)) {
        const { res, rej } = pend.get(m.id); pend.delete(m.id);
        if (m.error) rej(new Error(m.error.message)); else res(m.result);
      }
    });
  });
}

/** 求值并返回 JS 值（支持 await，支持返回对象） */
export async function evalJs(conn, expression) {
  const r = await conn.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error('求值抛错: ' + (d.exception && d.exception.description || d.text || 'unknown'));
  }
  return r.result && r.result.value;
}

export async function goto(conn, url) {
  await conn.send('Page.enable');
  await conn.send('Page.navigate', { url });
}

export async function screenshot(conn, file) {
  const r = await conn.send('Page.captureScreenshot', { format: 'png' });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(file, Buffer.from(r.data, 'base64'));
  return file;
}

export const sleep = (ms) => new Promise(s => setTimeout(s, ms));

/** 便捷：开标签 → 等页面加载 → 回调 → 关标签 */
export async function withPage(url, fn, opts = {}) {
  const t = await openTab(url);
  const conn = await connect(t.ws);
  try {
    await conn.send('Page.enable');
    await conn.send('Runtime.enable');
    if (opts.wait) await sleep(opts.wait);
    else {
      // 等 load 事件（最多 30 秒）
      await Promise.race([
        new Promise(res => {
          const h = (ev) => { try { const m = JSON.parse(ev.data); if (m.method === 'Page.loadEventFired') { res(); } } catch (e) {} };
          // 简化为轮询 document.readyState
        }),
        sleep(100),
      ]);
      for (let i = 0; i < 60; i++) {
        try { if (await evalJs(conn, 'document.readyState') === 'complete') break; } catch (e) {}
        await sleep(500);
      }
    }
    return await fn(conn);
  } finally {
    conn.close();
    await closeTab(t.id);
  }
}
