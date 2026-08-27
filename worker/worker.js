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
    const R2_PUBLIC_PREFIX = 'https://pub-1a72165d30ad42fc81dae51cefb3cdfc.r2.dev/';
    const GALLERY_PREFIX = '映像馆/webp/';
    const IMAGE_EXTENSIONS = /\.webp$/i;
    const VIDEO_PREFIX = 'MP4/';
    const VIDEO_EXTENSIONS = /\.webm$/i;
    const SPLASH_VIDEO_NAME = '薇尔莉特';
    // 键里已含 %XX 的片段（上传时字面 % 被转义过）不再二次编码
    const publicUrl = key => R2_PUBLIC_PREFIX + key.split('/')
      .map(part => (/%[0-9a-f]{2}/i.test(part) ? part : encodeURIComponent(part))).join('/');
    const decodeKey = name => { try { return decodeURIComponent(name); } catch (e) { return name; } };

    // R2 列举：返回指定前缀下匹配扩展名的对象（自动翻页）
    async function listR2(prefix, extRe) {
      const out = [];
      let listed = await env.BUCKET.list({ prefix });
      while (true) {
        for (const object of listed.objects || []) {
          const key = object.key || '';
          if (!key || key === prefix || !extRe.test(key)) continue;
          out.push({
            key,
            url: publicUrl(key),
            name: decodeKey(key.slice(prefix.length)).replace(/\.[^.]+$/, ''),
            size: typeof object.size === 'number' ? object.size : null,
            uploaded: object.uploaded || null,
          });
        }
        if (!listed.truncated) break;
        listed = await env.BUCKET.list({ prefix, cursor: listed.cursor });
      }
      return out;
    }

    // 文件名形如 20250504太湖鼋头渚 → date=2025-05-04，caption=太湖鼋头渚
    function parseNamedDate(name) {
      const m = String(name).match(/^(\d{4})(\d{2})(\d{2})[-_ ]?(.*)$/);
      if (!m) return { date: '', caption: name };
      const y = +m[1], mo = +m[2], d = +m[3];
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return { date: '', caption: name };
      return { date: `${m[1]}-${m[2]}-${m[3]}`, caption: (m[4] || '').trim() || name };
    }

    // ── 从 mp3 内嵌 ID3 封面（APIC/PIC）提取图片，供 /music-cover 使用 ──
    const synchsafe = (a, b, c, d) => ((a & 0x7f) << 21) | ((b & 0x7f) << 14) | ((c & 0x7f) << 7) | (d & 0x7f);
    function extractMp3Cover(buf) {
      if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return null; // "ID3"
      const ver = buf[3];
      const tagSize = synchsafe(buf[6], buf[7], buf[8], buf[9]);
      const end = Math.min(buf.length, 10 + tagSize);
      let off = 10;
      while (off + 6 <= end) {
        let id, size, hdrLen;
        if (ver === 2) {
          id = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2]);
          size = (buf[off + 3] << 16) | (buf[off + 4] << 8) | buf[off + 5];
          hdrLen = 6;
        } else {
          if (off + 10 > end) break;
          id = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3]);
          if (id === '\x00\x00\x00\x00') break; // 填充
          size = ver === 4
            ? synchsafe(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7])
            : ((buf[off + 4] << 24) | (buf[off + 5] << 16) | (buf[off + 6] << 8) | buf[off + 7]) >>> 0;
          hdrLen = 10;
        }
        if (size <= 0 || off + hdrLen + size > end) break;
        const data = buf.subarray(off + hdrLen, off + hdrLen + size);
        if (id === 'APIC') { const c = parseApic(data); if (c) return c; }
        else if (id === 'PIC' && ver === 2) { const c = parsePic22(data); if (c) return c; }
        off += hdrLen + size;
      }
      return null;
    }
    function coverMime(img, mime) {
      const m = (mime || '').toLowerCase();
      if (/jpe?g|^image\/(x-)?p?jpe?g/i.test(m)) return 'image/jpeg';
      if (/png/i.test(m)) return 'image/png';
      if (/webp/i.test(m)) return 'image/webp';
      if (/gif/i.test(m)) return 'image/gif';
      if (img.length >= 3 && img[0] === 0xff && img[1] === 0xd8) return 'image/jpeg';
      if (img.length >= 8 && img[0] === 0x89 && img[1] === 0x50 && img[2] === 0x4e && img[3] === 0x47) return 'image/png';
      if (img.length >= 12 && img[0] === 0x52 && img[1] === 0x49 && img[2] === 0x46 && img[3] === 0x46) return 'image/webp';
      return 'image/jpeg';
    }
    // ID3v2.3/2.4 APIC 帧
    function parseApic(d) {
      if (d.length < 4) return null;
      const enc = d[0];
      let i = 1;
      while (i < d.length && d[i] !== 0) i++;
      if (i >= d.length) return null;
      let mime = '';
      try { mime = new TextDecoder('latin1').decode(d.subarray(1, i)); } catch (e) { mime = ''; }
      i += 2; // 跳过 MIME 结尾 与 图片类型
      if (i + 1 >= d.length) return null;
      const term = (enc === 1 || enc === 2) ? 2 : 1;
      while (i < d.length) {
        if (term === 2) { if (d[i] === 0 && d[i + 1] === 0) { i += 2; break; } i += 1; }
        else { if (d[i] === 0) { i += 1; break; } i += 1; }
      }
      if (i >= d.length - 1) return null;
      const img = d.subarray(i);
      if (img.length < 8) return null;
      return { mime: coverMime(img, mime), data: img };
    }
    // ID3v2.2 PIC 帧
    function parsePic22(d) {
      if (d.length < 6) return null;
      const enc = d[0];
      const fmt = String.fromCharCode(d[1], d[2], d[3]);
      let i = 5;
      const term = (enc === 1) ? 2 : 1;
      while (i < d.length) {
        if (term === 2) { if (d[i] === 0 && d[i + 1] === 0) { i += 2; break; } i += 1; }
        else { if (d[i] === 0) { i += 1; break; } i += 1; }
      }
      if (i >= d.length) return null;
      const img = d.subarray(i);
      if (img.length < 8) return null;
      const mime = fmt === 'PNG' ? 'image/png' : (fmt === 'JPG' || fmt === 'JPEG') ? 'image/jpeg' : '';
      return { mime: coverMime(img, mime), data: img };
    }
    // 只读 mp3 的 ID3 标签部分（最多 8MB），不把整首歌拉进内存
    const MAX_TAG = 8 * 1024 * 1024;
    async function extractCoverFromStream(stream) {
      const reader = stream.getReader();
      let buf = new Uint8Array(0);
      let want = 10;
      try {
        while (buf.length < want) {
          const r = await reader.read();
          if (r.done) break;
          const t = new Uint8Array(buf.length + r.value.length);
          t.set(buf);
          t.set(r.value, buf.length); // 从 buf 末尾追加，不能从 0 覆盖
          buf = t;
          if (buf.length >= 10 && want === 10) {
            if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
              want = Math.min(10 + synchsafe(buf[6], buf[7], buf[8], buf[9]), MAX_TAG);
            } else {
              want = Math.max(want, Math.min(MAX_TAG, buf.length)); // 非 ID3，读完手上这段即止
            }
          }
        }
        return extractMp3Cover(buf);
      } finally {
        try { await reader.cancel(); } catch (e) {}
      }
    }

    // 映像馆以 R2 的 webp 为准动态生成；KV 里的同名条目只用来覆盖 caption/location 等人工标注
    async function getGalleryWithR2() {
      const raw = await env.STORE.get('site:gallery');
      let stored = [];
      try { stored = raw ? JSON.parse(raw) : []; } catch (e) { stored = []; }
      if (!Array.isArray(stored)) stored = [];
      if (!env.BUCKET) return stored;

      const basename = url => decodeKey(String(url || '').split('/').pop() || '').replace(/\.[^.]+$/, '');
      const overlay = new Map();
      // 非「映像馆/」下的自定义图片（外链等）保留原样
      const custom = [];
      for (const item of stored) {
        if (!item || !item.image) continue;
        if (String(item.image).startsWith(R2_PUBLIC_PREFIX + encodeURIComponent('映像馆') + '/')
          || String(item.image).startsWith(R2_PUBLIC_PREFIX + '映像馆/')) {
          overlay.set(basename(item.image), item);
        } else {
          custom.push(item);
        }
      }

      const objects = await listR2(GALLERY_PREFIX, IMAGE_EXTENSIONS);
      objects.sort((a, b) => b.name.localeCompare(a.name, 'zh'));
      const photos = objects.map(o => {
        const parsed = parseNamedDate(o.name);
        const meta = overlay.get(o.name) || {};
        return {
          image: o.url,
          caption: meta.caption || parsed.caption,
          date: meta.date || parsed.date || (o.uploaded ? new Date(o.uploaded).toISOString().slice(0, 10) : ''),
          location: meta.location || '',
        };
      });
      return custom.concat(photos);
    }

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
      const keys = ['profile','content','wallpaper','about','portfolio','gallery','modules','contact','navItems','accent','bgm','testimonials','memos','cloudMusicIds','petMessages','directUrls'];
      const result = {};
      for (const k of keys) {
        try {
          const raw = await env.STORE.get('site:' + k);
          if (raw) result[k] = k === 'gallery' ? await getGalleryWithR2() : JSON.parse(raw);
        } catch (e) { /* skip corrupt key */ }
      }
      return json(result);
    }

    // ── GET /data/<key> ── 公开读取 ──
    if (p.startsWith('/data/') && method === 'GET') {
      const key = p.slice(6);
      if (key === 'gallery') return json(await getGalleryWithR2());
      const raw = await env.STORE.get('site:' + key);
      return json(raw ? JSON.parse(raw) : null);
    }

    // ── POST /data 与 POST /data/<key> ── 需要有效 session ──
    if (method === 'POST' && (p === '/data' || p.startsWith('/data/'))) {
      if (!(await sessionValid())) return json({ error: 'unauthorized' }, 401);
      try {
        const body = await request.json();
        if (p === '/data') {
          const keys = ['profile','content','wallpaper','about','portfolio','gallery','modules','contact','navItems','accent','bgm','testimonials','memos','cloudMusicIds','petMessages','directUrls'];
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

    // ── GET /video-catalog ── 返回 R2 MP4/ 下的 webm：开屏动画 + 壁纸队列 ──
    if (p === '/video-catalog' && method === 'GET') {
      if (!env.BUCKET) return json({ splash: '', wallpapers: [] });
      const objects = await listR2(VIDEO_PREFIX, VIDEO_EXTENSIONS);
      objects.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
      const splash = objects.find(o => o.name === SPLASH_VIDEO_NAME);
      // 体积小的排前面：首屏壁纸能尽快缓冲出画面，大文件排后面慢慢加载
      const wallpapers = objects
        .filter(o => o !== splash)
        .sort((a, b) => (a.size ?? Infinity) - (b.size ?? Infinity))
        .map(o => ({ src: o.url, name: o.name, size: o.size, duration: 30 }));
      return json({ splash: splash ? splash.url : '', wallpapers }, 200);
    }

    // ── GET /music-catalog ── 返回 R2 中实际存在的音乐；封面由 /music-cover 直接读 mp3 内嵌 ──
    if (p === '/music-catalog' && method === 'GET') {
      if (!env.BUCKET) return json([]);
      const out = [];
      let listed = await env.BUCKET.list({ prefix: 'Music/' });
      while (true) {
        for (const object of listed.objects || []) {
          const key = object.key || '';
          const name = key.slice('Music/'.length);
          if (!name || !/\.mp3$/i.test(name)) continue;
          const decoded = decodeKey(name);
          out.push({ name: decoded.replace(/\.mp3$/i, ''), src: publicUrl(key), key });
        }
        if (!listed.truncated) break;
        listed = await env.BUCKET.list({ prefix: 'Music/', cursor: listed.cursor });
      }
      out.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
      return json(out);
    }

    // ── GET /music-cover?key=Music/xxx.mp3 ── 直接返回 mp3 内嵌封面（ID3 APIC）──
    if (p === '/music-cover' && method === 'GET') {
      if (!env.BUCKET) return json({ error: 'bucket_not_configured' }, 500);
      const key = url.searchParams.get('key') || '';
      if (!key.startsWith('Music/') || !/\.mp3$/i.test(key) || key.length > 300) return json({ error: 'invalid_key' }, 400);
      try {
        const obj = await env.BUCKET.get(key);
        if (!obj) return json({ error: 'not_found' }, 404);
        const cover = await extractCoverFromStream(obj.body);
        if (!cover) return json({ error: 'no_embedded_cover' }, 404);
        return new Response(cover.data, {
          headers: {
            'Content-Type': cover.mime,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    // ── POST /upload-audio?name=xxx ── 管理员上传音频到 R2（自托管音乐） ──
    if (p === '/upload-audio' && method === 'POST') {
      if (!(await sessionValid())) return json({ error: 'unauthorized' }, 401);
      if (!env.BUCKET) return json({ error: 'bucket_not_configured' }, 500);
      const rawName = (url.searchParams.get('name') || 'audio').trim();
      const safeName = rawName.replace(/[^\w.\-\u4e00-\u9fa5]/g, '').slice(0, 50) || 'audio';
      const key = 'Music/' + Date.now() + '-' + encodeURIComponent(safeName) + '.mp3';
      try {
        await env.BUCKET.put(key, request.body, { httpMetadata: { contentType: 'audio/mpeg' } });
        return json({ ok: true, url: 'https://pub-1a72165d30ad42fc81dae51cefb3cdfc.r2.dev/' + key });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    // ── GET /music?key=Music/xxx.mp3 ── 音频代理（Worker 内网读 R2，浏览器走 CF 边缘 CDN，支持 Range 分段） ──
    if (p === '/music' && method === 'GET') {
      if (!env.BUCKET) return json({ error: 'bucket_not_configured' }, 500);
      const key = url.searchParams.get('key') || '';
      if (!key.startsWith('Music/') || key.length > 300) return json({ error: 'invalid_key' }, 400);
      try {
        const obj = await env.BUCKET.get(key);
        if (!obj) return json({ error: 'not_found' }, 404);
        const base = {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes',
        };
        const range = request.headers.get('Range');
        if (range) {
          const m = range.match(/bytes=(\d+)-(\d*)/);
          if (m) {
            const start = parseInt(m[1], 10);
            const end = m[2] ? Math.min(parseInt(m[2], 10), obj.size - 1) : obj.size - 1;
            if (start >= 0 && start < obj.size && start <= end) {
              const part = await env.BUCKET.get(key, { range: { offset: start, length: end - start + 1 } });
              if (part) {
                return new Response(part.body, {
                  status: 206,
                  headers: { ...base, 'Content-Range': 'bytes ' + start + '-' + end + '/' + obj.size, 'Content-Length': String(end - start + 1) },
                });
              }
            }
          }
        }
        return new Response(obj.body, { status: 200, headers: { ...base, 'Content-Length': String(obj.size) } });
      } catch (e) {
        return json({ error: String(e.message || e) }, 500);
      }
    }

    return json({ error: 'not_found' }, 404);
  }
};
