export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    // 兼容两种挂载：home.xiaoaijiang.cloud/api/data 与 api.xiaoaijiang.cloud/data
    const p = path.startsWith('/api') ? path.slice(4) : path;
    const method = request.method;

    // ── 服务端秘密：SITE_PASSWORD 只存在于 Worker 环境变量，绝不下发前端 ──
    const SITE_PASSWORD = env.SITE_PASSWORD || '';
    // ── GitHub OAuth（评论登录）：secret 只存 Worker env，绝不下发前端 ──
    const GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID || '';
    const GITHUB_CLIENT_SECRET = env.GITHUB_CLIENT_SECRET || '';
    const GITHUB_REDIRECT = 'https://home.xiaoaijiang.cloud/api/oauth/callback';
    const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 小时
    const ALLOWED_ORIGINS = [
      'https://home.xiaoaijiang.cloud',
      'https://api.xiaoaijiang.cloud',
      'http://localhost:8787',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    const origin = request.headers.get('Origin') || '';
    const headers = {
      'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers });

    // 状态变更请求：若携带 Origin 且不在白名单，直接拒绝（防跨站写入）
    if (method === 'POST' && origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'forbidden_origin' }, 403);
    }

    const getToken = () => {
      const auth = request.headers.get('Authorization') || '';
      const m = auth.match(/^Bearer\s+(.+)$/i);
      return m ? m[1].trim() : '';
    };

    const sessionValid = async () => {
      const token = getToken();
      if (!token) return false;
      try {
        const raw = await env.STORE.get('session:' + token);
        if (!raw) return false;
        return JSON.parse(raw).expiresAt > Date.now();
      } catch (e) { return false; }
    };

    // ── POST /login ── 服务端校验密码，签发短期 session token ──
    if (p === '/login' && method === 'POST') {
      if (!SITE_PASSWORD) return json({ error: 'server_not_configured' }, 500);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
      if (typeof body.password !== 'string' || body.password !== SITE_PASSWORD) {
        return json({ error: 'unauthorized' }, 401);
      }
      const buf = new Uint8Array(24);
      crypto.getRandomValues(buf);
      const token = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
      await env.STORE.put('session:' + token, JSON.stringify({ expiresAt }), { expirationTtl: SESSION_TTL_SECONDS });
      return json({ ok: true, token, expiresAt });
    }

    // ── POST /logout ── 使当前 session 失效 ──
    if (p === '/logout' && method === 'POST') {
      const token = getToken();
      if (token) await env.STORE.delete('session:' + token);
      return json({ ok: true });
    }

    // ── GET /oauth/login ── 跳转 GitHub 授权 ──
    if (p === '/oauth/login' && method === 'GET') {
      if (!GITHUB_CLIENT_ID) return json({ error: 'oauth_not_configured' }, 500);
      const state = crypto.randomUUID();
      const authUrl = 'https://github.com/login/oauth/authorize?client_id=' + GITHUB_CLIENT_ID +
        '&redirect_uri=' + encodeURIComponent(GITHUB_REDIRECT) +
        '&scope=read:user&state=' + state;
      return Response.redirect(authUrl, 302);
    }

    // ── GET /oauth/callback ── 交换 code 拿用户信息，签发 ghsession，重定向回前端 ──
    if (p === '/oauth/callback' && method === 'GET') {
      const code = url.searchParams.get('code');
      const failWith = (why) => Response.redirect('https://home.xiaoaijiang.cloud/#memos?oauth=error&why=' + encodeURIComponent(why), 302);
      if (!code) return failWith('no_code');
      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) return failWith(tokenData.error || tokenData.error_description || 'no_token');
        const userRes = await fetch('https://api.github.com/user', {
          headers: { 'User-Agent': 'xiaoaijiang-home', 'Authorization': 'Bearer ' + accessToken, 'Accept': 'application/json' },
        });
        if (!userRes.ok) return failWith('user_fetch_' + userRes.status);
        const ghUser = await userRes.json();
        const buf = new Uint8Array(24);
        crypto.getRandomValues(buf);
        const token = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
        const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
        await env.STORE.put('ghsession:' + token, JSON.stringify({
          user: { login: ghUser.login || '', avatar: ghUser.avatar_url || '' },
          expiresAt,
        }), { expirationTtl: SESSION_TTL_SECONDS });
        return Response.redirect('https://home.xiaoaijiang.cloud/#gh=' + token, 302);
      } catch (e) {
        return failWith(String(e.message || e));
      }
    }

    // ── GET /oauth/me ── 返回当前 GitHub 登录用户（供前端判断登录态） ──
    if (p === '/oauth/me' && method === 'GET') {
      const token = getToken();
      if (!token) return json({ user: null });
      const raw = await env.STORE.get('ghsession:' + token);
      if (!raw) return json({ user: null });
      const sess = JSON.parse(raw);
      if (sess.expiresAt <= Date.now()) return json({ user: null });
      return json({ user: sess.user });
    }

    // ── POST /oauth/logout ── 使当前 GitHub session 失效 ──
    if (p === '/oauth/logout' && method === 'POST') {
      const token = getToken();
      if (token) await env.STORE.delete('ghsession:' + token);
      return json({ ok: true });
    }

    // ── GET /data ── 公开读取 ──
    if (p === '/data' && method === 'GET') {
      const keys = ['profile','content','wallpaper','about','portfolio','gallery','modules','contact','navItems','accent','bgm','testimonials','memos','cloudMusicIds'];
      const result = {};
      for (const k of keys) {
        try {
          const raw = await env.STORE.get('site:' + k);
          if (raw) result[k] = JSON.parse(raw);
        } catch (e) { /* skip corrupt key */ }
      }
      return json(result);
    }

    // ── GET /data/<key> ── 公开读取 ──
    if (p.startsWith('/data/') && method === 'GET') {
      const key = p.slice(6);
      const raw = await env.STORE.get('site:' + key);
      return json(raw ? JSON.parse(raw) : null);
    }

    // ── POST /data 与 POST /data/<key> ── 需要有效 session ──
    if (method === 'POST' && (p === '/data' || p.startsWith('/data/'))) {
      if (!(await sessionValid())) return json({ error: 'unauthorized' }, 401);
      try {
        const body = await request.json();
        if (p === '/data') {
          const keys = ['profile','content','wallpaper','about','portfolio','gallery','modules','contact','navItems','accent','bgm','testimonials','memos','cloudMusicIds'];
          let saved = 0;
          for (const k of keys) {
            if (body[k] !== undefined) { await env.STORE.put('site:' + k, JSON.stringify(body[k])); saved++; }
          }
          return json({ ok: true, saved });
        }
        const key = p.slice(6);
        await env.STORE.put('site:' + key, JSON.stringify(body));
        return json({ ok: true });
      } catch (e) {
        return json({ error: e.message }, 400);
      }
    }

    // ── GET /comments/<memoId> ── 公开读取评论 ──
    if (p.startsWith('/comments/') && method === 'GET') {
      const memoId = p.slice(10);
      if (!/^[\w-]{1,64}$/.test(memoId)) return json({ error: 'invalid_id' }, 400);
      const raw = await env.STORE.get('memo-comment:' + memoId);
      return json(raw ? JSON.parse(raw) : []);
    }

    // ── POST /comments/<memoId> ── 需 GitHub session ──
    if (p.startsWith('/comments/') && method === 'POST') {
      const memoId = p.slice(10);
      if (!/^[\w-]{1,64}$/.test(memoId)) return json({ error: 'invalid_id' }, 400);
      const token = getToken();
      if (!token) return json({ error: 'unauthorized' }, 401);
      const raw = await env.STORE.get('ghsession:' + token);
      if (!raw) return json({ error: 'unauthorized' }, 401);
      const sess = JSON.parse(raw);
      if (sess.expiresAt <= Date.now()) return json({ error: 'unauthorized' }, 401);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
      const content = String(body.content || '').trim();
      if (!content || content.length > 1000) return json({ error: 'invalid_content' }, 400);
      const key = 'memo-comment:' + memoId;
      const prevRaw = await env.STORE.get(key);
      const list = prevRaw ? JSON.parse(prevRaw) : [];
      const comment = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        user: sess.user.login,
        avatar: sess.user.avatar,
        content,
        date: new Date().toISOString(),
      };
      list.push(comment);
      await env.STORE.put(key, JSON.stringify(list.slice(-200))); // 每条说说最多 200 条
      return json({ ok: true, comment });
    }

    // ── DELETE /comments/<memoId>/<commentId> ── 需站点管理员 session，删除评论 ──
    if (p.startsWith('/comments/') && method === 'DELETE') {
      const parts = p.slice(10).split('/');
      const memoId = parts[0], commentId = parts[1];
      if (!/^[\w-]{1,64}$/.test(memoId) || !/^[\w-]{1,64}$/.test(commentId)) return json({ error: 'invalid_id' }, 400);
      if (!(await sessionValid())) return json({ error: 'unauthorized' }, 401);
      const key = 'memo-comment:' + memoId;
      const raw = await env.STORE.get(key);
      if (!raw) return json({ ok: true, deleted: false });
      const list = JSON.parse(raw).filter(c => c.id !== commentId);
      await env.STORE.put(key, JSON.stringify(list));
      return json({ ok: true, deleted: true });
    }

    // ── GET /visit ── 公开读取访客计数 ──
    if (p === '/visit' && method === 'GET') {
      const day = new Date().toISOString().slice(0, 10);
      const totalRaw = await env.STORE.get('site:visitTotal');
      const todayRaw = await env.STORE.get('visit:today:' + day);
      return json({ total: parseInt(totalRaw || '0', 10) || 0, today: parseInt(todayRaw || '0', 10) || 0 });
    }

    // ── POST /visit ── 访客计数（按 IP+日期去重，每天每 IP 计一次） ──
    if (p === '/visit' && method === 'POST') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const day = new Date().toISOString().slice(0, 10);
      const dupKey = 'visit:ip:' + day + ':' + ip;
      if (await env.STORE.get(dupKey)) return json({ ok: true, duplicate: true });
      await env.STORE.put(dupKey, '1', { expirationTtl: 90000 });
      const total = (parseInt((await env.STORE.get('site:visitTotal')) || '0', 10) || 0) + 1;
      await env.STORE.put('site:visitTotal', String(total));
      const today = (parseInt((await env.STORE.get('visit:today:' + day)) || '0', 10) || 0) + 1;
      await env.STORE.put('visit:today:' + day, String(today), { expirationTtl: 90000 });
      return json({ ok: true, total, today });
    }

    // ── GET /rss.xml ── 说说 RSS（公开） ──
    if (p === '/rss.xml' && method === 'GET') {
      const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const raw = await env.STORE.get('site:memos');
      const memos = raw ? JSON.parse(raw) : [];
      const items = memos.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 20).map(m => {
        const text = esc(m.text || '');
        const date = m.date ? new Date(m.date).toUTCString() : '';
        const id = esc(m.id || m.date || Math.random().toString(36));
        return '<item><title>' + text.slice(0, 60) + '</title><description>' + text + '</description>' + (date ? '<pubDate>' + date + '</pubDate>' : '') + '<guid>' + id + '</guid><link>https://home.xiaoaijiang.cloud/#memos</link></item>';
      }).join('');
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>伶俜的幻想之境 - 说说</title><link>https://home.xiaoaijiang.cloud/</link><description>伶俜个人主页的说说更新</description>' + items + '</channel></rss>';
      return new Response(xml, { headers: { ...headers, 'Content-Type': 'application/rss+xml; charset=utf-8' } });
    }

    // ── GET /meting?server=netease&type=song&id=xxx ── 网易云歌曲代理（官方接口直连，不依赖第三方配额） ──
    // weapi 加密（对照 mikus-loli/Meting-API 验证实现）：双层 AES-CBC + RSA 裸模幂
    const W_MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
    const W_PUBKEY = '010001';
    const W_IV = new TextEncoder().encode('0102030405060708');
    const W_PRESET_KEY = '0CoJUm6Qyw8W8jud';
    const W_BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const weapiSecretKey = () => {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      let s = '';
      for (const n of b) s += W_BASE62[n % 62];
      return s;
    };
    const weapiAes = async (text, key) => {
      const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'AES-CBC' }, false, ['encrypt']);
      const data = new TextEncoder().encode(text);
      const pad = 16 - (data.length % 16);
      const padded = new Uint8Array(data.length + pad);
      padded.set(data);
      padded.fill(pad, data.length);
      const enc = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: W_IV }, k, padded);
      let bin = '';
      const bytes = new Uint8Array(enc);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    };
    const weapiRsa = (keyBytes) => {
      const m = BigInt('0x' + W_MODULUS);
      const e = BigInt('0x' + W_PUBKEY);
      let x = 0n;
      for (const b of keyBytes) x = (x << 8n) | BigInt(b);
      let result = 1n, base = x % m, exp = e;
      while (exp > 0n) {
        if (exp & 1n) result = (result * base) % m;
        base = (base * base) % m;
        exp >>= 1n;
      }
      return result.toString(16).padStart(256, '0');
    };
    const weapiEncrypt = async (obj) => {
      const text = JSON.stringify(obj);
      const secretKey = weapiSecretKey();
      const p1 = await weapiAes(text, W_PRESET_KEY);
      const p2 = await weapiAes(p1, secretKey);
      const keyBytes = [...secretKey].reverse().map(ch => ch.charCodeAt(0));
      return { params: p2, encSecKey: weapiRsa(keyBytes) };
    };
    if (p === '/meting' && method === 'GET') {
      const id = url.searchParams.get('id') || '';
      if (!/^\d{1,20}$/.test(id)) return json([]);
      // 会员 Cookie（env 注入，绝不下发前端）：有 Cookie 时走会员通道拿 VIP 直链
      const NETEASE_COOKIE = env.NETEASE_COOKIE || '';
      const UA = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        'Referer': 'https://music.163.com',
        ...(NETEASE_COOKIE ? { 'Cookie': NETEASE_COOKIE } : {}),
      };
      try {
        // 1) 歌曲信息
        const infoRes = await fetch('https://music.163.com/api/song/detail/?ids=%5B' + id + '%5D', { headers: UA });
        const info = await infoRes.json();
        const song = (info && info.songs && info.songs[0]) || null;
        if (!song) return json([]);
        // 2) 音频直链：优先会员通道（weapi），回退 enhance GET，再回退外链接口
        let audioUrl = '';
        try {
          const w = await weapiEncrypt({ ids: '[' + id + ']', br: 320000, csrf_token: '' });
          const uRes = await fetch('https://music.163.com/weapi/song/enhance/player/url', {
            method: 'POST',
            headers: {
              'User-Agent': UA['User-Agent'],
              'Referer': UA['Referer'],
              'Content-Type': 'application/x-www-form-urlencoded',
              ...(NETEASE_COOKIE ? { 'Cookie': NETEASE_COOKIE } : {}),
            },
            body: 'params=' + encodeURIComponent(w.params) + '&encSecKey=' + w.encSecKey,
          });
          const uj = await uRes.json();
          const d = (uj && uj.data && uj.data[0]) || null;
          if (d && d.url) audioUrl = d.url.replace(/^http:\/\//i, 'https://');
        } catch (e) { /* 会员通道失败则回退 */ }
        if (!audioUrl && NETEASE_COOKIE) {
          try {
            const uRes = await fetch('https://music.163.com/api/song/enhance/player/url?ids=%5B' + id + '%5D&br=320000', { headers: UA });
            const uj = await uRes.json();
            const d = (uj && uj.data && uj.data[0]) || null;
            if (d && d.url) audioUrl = d.url.replace(/^http:\/\//i, 'https://');
          } catch (e) { /* 回退 */ }
        }
        if (!audioUrl) {
          try {
            const aRes = await fetch('https://music.163.com/song/media/outer/url?id=' + id + '.mp3', { headers: UA, redirect: 'manual' });
            const loc = aRes.headers.get('Location') || '';
            if (loc && loc.includes('.mp3') && !loc.includes('/404')) {
              audioUrl = loc.replace(/^http:\/\//i, 'https://');
            }
          } catch (e) { /* 无直链时静默 */ }
        }
        // 3) 歌词
        let lrc = '';
        try {
          const lRes = await fetch('https://music.163.com/api/song/lyric?id=' + id + '&lv=1&kv=1&tv=-1', { headers: UA });
          const lj = await lRes.json();
          if (lj && lj.lrc && lj.lrc.lyric) lrc = lj.lrc.lyric;
        } catch (e) { /* 无歌词时静默 */ }
        const artist = (song.artists || []).map(a => a.name).join(' / ');
        const pic = (song.album && song.album.picUrl) || '';
        return json([{ name: song.name || '', artist: artist || '', url: audioUrl, pic: pic, lrc: lrc }]);
      } catch (e) {
        return json([]);
      }
    }

    return json({ error: 'not_found' }, 404);
  }
};
