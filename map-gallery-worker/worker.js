// map-gallery-api — 独立映像馆子站后端（D1 + R2 + 单人密码鉴权）
const R2_PUBLIC = 'https://cdn.231060101.xyz/';
const PHOTO_PREFIX = 'gallery-photos/';
const SESSION_TTL = 24 * 60 * 60; // 24h
const ALLOWED_ORIGINS = [
  'https://map.231060101.xyz',
  'https://map-gallery-ewt.pages.dev',
  'https://home.xiaoaijiang.cloud',
  'https://home.231060101.xyz',
  'http://localhost:8765',
  'http://localhost:3000',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const p = path.startsWith('/api') ? path.slice(4) : path;
    const method = request.method;
    const origin = request.headers.get('Origin') || '';
    const headers = {
      'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!env.DB) return json({ error: 'db_not_configured' }, 500);

    const SITE_PASSWORD = env.SITE_PASSWORD || '';
    const getToken = () => { const a = request.headers.get('Authorization') || ''; const m = a.match(/^Bearer\s+(.+)$/i); return m ? m[1].trim() : ''; };
    const sessionValid = async () => {
      const token = getToken(); if (!token) return false;
      try {
        const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token=?').bind(token).first();
        return !!row && row.expires_at > Date.now();
      } catch (e) { return false; }
    };
    const needAuth = async () => { if (!(await sessionValid())) return json({ error: 'unauthorized' }, 401); return null; };
    const publicUrl = (key) => R2_PUBLIC + key.split('/').map(s => /%[0-9A-Fa-f]{2}/.test(s) ? s : encodeURIComponent(s)).join('/');

    try {
      // ── 鉴权 ──
      if (p === '/login' && method === 'POST') {
        if (!SITE_PASSWORD) return json({ error: 'server_not_configured' }, 500);
        let body; try { body = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
        if (typeof body.password !== 'string' || body.password !== SITE_PASSWORD) return json({ error: 'unauthorized' }, 401);
        const buf = new Uint8Array(24); crypto.getRandomValues(buf);
        const token = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
        const expiresAt = Date.now() + SESSION_TTL * 1000;
        await env.DB.prepare('INSERT INTO sessions(token,expires_at) VALUES(?,?)').bind(token, expiresAt).run();
        return json({ ok: true, token, expiresAt });
      }
      if (p === '/logout' && method === 'POST') {
        const token = getToken(); if (token) await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(token).run();
        return json({ ok: true });
      }
      if (p === '/me' && method === 'GET') return json({ authed: await sessionValid() });

      // ── 站点访问统计（公开）──
      // site 作用域：'gallery'（默认，映像馆站）| 'main'（主站）。各自独立 pv/uv 计数与 UV 去重。
      const statSite = (v) => (v === 'main' ? 'main' : 'gallery');
      const statKeys = (site) => (site === 'main' ? { pv: 'main_pv', uv: 'main_uv' } : { pv: 'pv', uv: 'uv' });
      const readStats = async (site) => {
        const k = statKeys(site);
        const rows = (await env.DB.prepare('SELECT key,val FROM site_stats WHERE key IN (?,?)').bind(k.pv, k.uv).all()).results || [];
        const s = { pv: 0, uv: 0 }; for (const r of rows) { if (r.key === k.pv) s.pv = r.val; else if (r.key === k.uv) s.uv = r.val; }
        return s;
      };
      if (p === '/stats' && method === 'GET') {
        return json(await readStats(statSite(url.searchParams.get('site'))));
      }
      if (p === '/visit' && method === 'POST') {
        let b = {}; try { b = await request.json(); } catch (e) {}
        const site = statSite(url.searchParams.get('site') || b.site);
        const k = statKeys(site);
        const vid = typeof b.vid === 'string' ? b.vid.slice(0, 64).replace(/[^\w-]/g, '') : '';
        // PV +1（UPSERT，行不存在则建）
        await env.DB.prepare('INSERT INTO site_stats(key,val) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET val=val+1').bind(k.pv).run();
        // UV：vid 首见才 +1（vid 按 site 作用域存，避免跨站碰撞）
        if (vid) {
          const svid = site + ':' + vid;
          const seen = await env.DB.prepare('SELECT vid FROM visitors WHERE vid=?').bind(svid).first();
          if (!seen) {
            await env.DB.batch([
              env.DB.prepare('INSERT OR IGNORE INTO visitors(vid,first_at) VALUES(?,?)').bind(svid, Date.now()),
              env.DB.prepare('INSERT INTO site_stats(key,val) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET val=val+1').bind(k.uv),
            ]);
          }
        }
        return json(await readStats(site));
      }

      // ── 公开读 ──
      if (p === '/cities' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT c.*, COUNT(ph.id) AS photo_count,
             (SELECT url FROM photos WHERE city_key=c.city_key ORDER BY ord LIMIT 1) AS first_photo
           FROM cities c LEFT JOIN photos ph ON ph.city_key=c.city_key
           GROUP BY c.city_key`).all();
        return json((results || []).map(rowCity));
      }
      if (p === '/photos' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM photos ORDER BY ord, id').all();
        return json((results || []).map(rowPhoto));
      }
      if (p === '/unlocated' && method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM photos WHERE city_key IS NULL OR city_key='' ORDER BY ord, id").all();
        return json((results || []).map(rowPhoto));
      }
      let m;
      if ((m = p.match(/^\/city\/(.+)$/)) && method === 'GET') {
        const ck = decodeURIComponent(m[1]);
        const city = await env.DB.prepare('SELECT * FROM cities WHERE city_key=?').bind(ck).first();
        const photos = (await env.DB.prepare('SELECT * FROM photos WHERE city_key=? ORDER BY ord, id').bind(ck).all()).results || [];
        const attractions = (await env.DB.prepare('SELECT * FROM attractions WHERE city_key=? ORDER BY ord, id').bind(ck).all()).results || [];
        for (const a of attractions) {
          a.photos = (await env.DB.prepare('SELECT * FROM attraction_photos WHERE attraction_id=? ORDER BY ord, id').bind(a.id).all()).results || [];
        }
        return json({ city: city ? rowCity(city) : null, photos: photos.map(rowPhoto), attractions: attractions.map(rowAttr) });
      }

      // ── 鉴权写 ──
      // 城市元数据 upsert（rating/desc/tags/months/hometown/cover + 坐标名）
      if ((m = p.match(/^\/city\/(.+)$/)) && method === 'PUT') {
        const auth = await needAuth(); if (auth) return auth;
        const ck = decodeURIComponent(m[1]);
        let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
        const now = Date.now();
        const cur = await env.DB.prepare('SELECT * FROM cities WHERE city_key=?').bind(ck).first();
        const rating = b.rating != null ? (b.rating | 0) : (cur ? cur.rating : 0);
        const description = b.description != null ? String(b.description).slice(0, 200) : (cur ? cur.description : '');
        const visitMonths = b.visitMonths != null ? JSON.stringify(b.visitMonths) : (cur ? cur.visit_months : '[]');
        const tags = b.tags != null ? JSON.stringify(b.tags) : (cur ? cur.tags : '[]');
        const cover = b.coverR2Key != null ? String(b.coverR2Key) : (cur ? cur.cover_r2_key : '');
        const home = b.isHometown != null ? (b.isHometown ? 1 : 0) : (cur ? cur.is_hometown : 0);
        const name = b.name != null ? String(b.name) : (cur ? cur.name : ck.split('_').slice(1).join('_'));
        const adcode = b.adcode != null ? String(b.adcode) : (cur ? cur.adcode : ck.split('_')[0]);
        const lng = b.lng != null ? b.lng : (cur ? cur.lng : null);
        const lat = b.lat != null ? b.lat : (cur ? cur.lat : null);
        await env.DB.prepare(
          `INSERT INTO cities(city_key,name,adcode,lng,lat,rating,description,visit_months,tags,cover_r2_key,is_hometown,updated_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(city_key) DO UPDATE SET name=?,adcode=?,lng=?,lat=?,rating=?,description=?,visit_months=?,tags=?,cover_r2_key=?,is_hometown=?,updated_at=?`)
          .bind(ck, name, adcode, lng, lat, rating, description, visitMonths, tags, cover, home, now,
                name, adcode, lng, lat, rating, description, visitMonths, tags, cover, home, now).run();
        return json({ ok: true });
      }
      // 删除城市：连带删该城市所有照片（含 R2）+ 景点
      if ((m = p.match(/^\/city\/(.+)$/)) && method === 'DELETE') {
        const auth = await needAuth(); if (auth) return auth;
        const ck = decodeURIComponent(m[1]);
        const phs = (await env.DB.prepare('SELECT id,r2_key FROM photos WHERE city_key=?').bind(ck).all()).results || [];
        if (env.BUCKET) for (const ph of phs) { if (ph.r2_key) { try { await env.BUCKET.delete(ph.r2_key); } catch (e) {} } }
        const attrs = (await env.DB.prepare('SELECT id FROM attractions WHERE city_key=?').bind(ck).all()).results || [];
        for (const a of attrs) {
          const aps = (await env.DB.prepare('SELECT r2_key FROM attraction_photos WHERE attraction_id=?').bind(a.id).all()).results || [];
          if (env.BUCKET) for (const ap of aps) { if (ap.r2_key) { try { await env.BUCKET.delete(ap.r2_key); } catch (e) {} } }
          await env.DB.prepare('DELETE FROM attraction_photos WHERE attraction_id=?').bind(a.id).run();
        }
        await env.DB.batch([
          env.DB.prepare('DELETE FROM attractions WHERE city_key=?').bind(ck),
          env.DB.prepare('DELETE FROM photos WHERE city_key=?').bind(ck),
          env.DB.prepare('DELETE FROM cities WHERE city_key=?').bind(ck),
        ]);
        return json({ ok: true });
      }
      // 上传照片：body=图片流，?cityKey=&name=&caption=&date=
      if (p === '/photo' && method === 'POST') {
        const auth = await needAuth(); if (auth) return auth;
        if (!env.BUCKET) return json({ error: 'bucket_not_configured' }, 500);
        const ck = url.searchParams.get('cityKey') || null;
        const rawName = (url.searchParams.get('name') || 'photo').trim();
        const safe = rawName.replace(/[^\w.\-一-龥]/g, '').slice(0, 60) || 'photo';
        const ext = (safe.match(/\.(jpe?g|png|webp|gif)$/i) || [, 'jpg'])[1].toLowerCase();
        const ct = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/jpeg';
        const key = PHOTO_PREFIX + Date.now() + '-' + encodeURIComponent(safe) + (safe.match(/\.\w+$/) ? '' : '.' + ext);
        await env.BUCKET.put(key, request.body, { httpMetadata: { contentType: ct } });
        const u = publicUrl(key);
        const maxo = await env.DB.prepare('SELECT MAX(ord) AS mx FROM photos WHERE city_key IS ?').bind(ck).first();
        const ord = ((maxo && maxo.mx) || 0) + 1;
        const res = await env.DB.prepare('INSERT INTO photos(city_key,r2_key,url,caption,date,ord,created_at) VALUES(?,?,?,?,?,?,?)')
          .bind(ck, key, u, url.searchParams.get('caption') || '', url.searchParams.get('date') || '', ord, Date.now()).run();
        return json({ ok: true, id: res.meta.last_row_id, url: u, r2_key: key });
      }
      // 更新照片：改归属城市（含未定位→城市）/ 标题 / 日期
      if ((m = p.match(/^\/photo\/(\d+)$/)) && method === 'PUT') {
        const auth = await needAuth(); if (auth) return auth;
        const id = m[1] | 0;
        let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
        const cur = await env.DB.prepare('SELECT * FROM photos WHERE id=?').bind(id).first();
        if (!cur) return json({ error: 'not_found' }, 404);
        let ck = cur.city_key, ord = cur.ord;
        if (b.cityKey !== undefined) {
          ck = b.cityKey || null;
          if (ck !== cur.city_key) { const mx = await env.DB.prepare('SELECT MAX(ord) AS mx FROM photos WHERE city_key IS ?').bind(ck).first(); ord = ((mx && mx.mx) || 0) + 1; }
        }
        const caption = b.caption !== undefined ? String(b.caption) : cur.caption;
        const date = b.date !== undefined ? String(b.date) : cur.date;
        await env.DB.prepare('UPDATE photos SET city_key=?,caption=?,date=?,ord=? WHERE id=?').bind(ck, caption, date, ord, id).run();
        return json({ ok: true, cityKey: ck });
      }
      if ((m = p.match(/^\/photo\/(\d+)$/)) && method === 'DELETE') {
        const auth = await needAuth(); if (auth) return auth;
        const id = m[1] | 0;
        const ph = await env.DB.prepare('SELECT r2_key FROM photos WHERE id=?').bind(id).first();
        if (ph && ph.r2_key && env.BUCKET) { try { await env.BUCKET.delete(ph.r2_key); } catch (e) {} }
        await env.DB.prepare('DELETE FROM photos WHERE id=?').bind(id).run();
        return json({ ok: true });
      }
      if (p === '/reorder-photos' && method === 'POST') {
        const auth = await needAuth(); if (auth) return auth;
        let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
        const [a, c] = [b.idA | 0, b.idB | 0];
        const ra = await env.DB.prepare('SELECT ord FROM photos WHERE id=?').bind(a).first();
        const rc = await env.DB.prepare('SELECT ord FROM photos WHERE id=?').bind(c).first();
        if (ra && rc) {
          await env.DB.batch([
            env.DB.prepare('UPDATE photos SET ord=? WHERE id=?').bind(rc.ord, a),
            env.DB.prepare('UPDATE photos SET ord=? WHERE id=?').bind(ra.ord, c),
          ]);
        }
        return json({ ok: true });
      }
      // ── 景点 ──
      if (p === '/attraction' && method === 'POST') {
        const auth = await needAuth(); if (auth) return auth;
        let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
        if (!b.cityKey || !b.name) return json({ error: 'bad_request' }, 400);
        const maxo = await env.DB.prepare('SELECT MAX(ord) AS mx FROM attractions WHERE city_key=?').bind(b.cityKey).first();
        const ord = ((maxo && maxo.mx) || 0) + 1;
        const res = await env.DB.prepare('INSERT INTO attractions(city_key,name,visit_date,notes,ord) VALUES(?,?,?,?,?)')
          .bind(b.cityKey, String(b.name), b.visitDate || '', b.notes || '', ord).run();
        return json({ ok: true, id: res.meta.last_row_id });
      }
      if ((m = p.match(/^\/attraction\/(\d+)$/)) && method === 'PUT') {
        const auth = await needAuth(); if (auth) return auth;
        const id = m[1] | 0;
        let b; try { b = await request.json(); } catch (e) { return json({ error: 'bad_request' }, 400); }
        const cur = await env.DB.prepare('SELECT * FROM attractions WHERE id=?').bind(id).first();
        if (!cur) return json({ error: 'not_found' }, 404);
        await env.DB.prepare('UPDATE attractions SET name=?,visit_date=?,notes=? WHERE id=?')
          .bind(b.name != null ? String(b.name) : cur.name, b.visitDate != null ? b.visitDate : cur.visit_date, b.notes != null ? b.notes : cur.notes, id).run();
        return json({ ok: true });
      }
      if ((m = p.match(/^\/attraction\/(\d+)$/)) && method === 'DELETE') {
        const auth = await needAuth(); if (auth) return auth;
        const id = m[1] | 0;
        const aps = (await env.DB.prepare('SELECT r2_key FROM attraction_photos WHERE attraction_id=?').bind(id).all()).results || [];
        if (env.BUCKET) for (const ap of aps) { if (ap.r2_key) { try { await env.BUCKET.delete(ap.r2_key); } catch (e) {} } }
        await env.DB.batch([
          env.DB.prepare('DELETE FROM attraction_photos WHERE attraction_id=?').bind(id),
          env.DB.prepare('DELETE FROM attractions WHERE id=?').bind(id),
        ]);
        return json({ ok: true });
      }
      // 景点照片上传：body=图片流，?attractionId=&name=
      if (p === '/attraction-photo' && method === 'POST') {
        const auth = await needAuth(); if (auth) return auth;
        if (!env.BUCKET) return json({ error: 'bucket_not_configured' }, 500);
        const aid = url.searchParams.get('attractionId') | 0;
        if (!aid) return json({ error: 'bad_request' }, 400);
        const rawName = (url.searchParams.get('name') || 'photo').trim();
        const safe = rawName.replace(/[^\w.\-一-龥]/g, '').slice(0, 60) || 'photo';
        const ext = (safe.match(/\.(jpe?g|png|webp|gif)$/i) || [, 'jpg'])[1].toLowerCase();
        const ct = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || 'image/jpeg';
        const key = PHOTO_PREFIX + 'attr/' + Date.now() + '-' + encodeURIComponent(safe) + (safe.match(/\.\w+$/) ? '' : '.' + ext);
        await env.BUCKET.put(key, request.body, { httpMetadata: { contentType: ct } });
        const u = publicUrl(key);
        const maxo = await env.DB.prepare('SELECT MAX(ord) AS mx FROM attraction_photos WHERE attraction_id=?').bind(aid).first();
        const ord = ((maxo && maxo.mx) || 0) + 1;
        const res = await env.DB.prepare('INSERT INTO attraction_photos(attraction_id,r2_key,url,ord) VALUES(?,?,?,?)').bind(aid, key, u, ord).run();
        return json({ ok: true, id: res.meta.last_row_id, url: u });
      }
      if ((m = p.match(/^\/attraction-photo\/(\d+)$/)) && method === 'DELETE') {
        const auth = await needAuth(); if (auth) return auth;
        const id = m[1] | 0;
        const ap = await env.DB.prepare('SELECT r2_key FROM attraction_photos WHERE id=?').bind(id).first();
        if (ap && ap.r2_key && env.BUCKET) { try { await env.BUCKET.delete(ap.r2_key); } catch (e) {} }
        await env.DB.prepare('DELETE FROM attraction_photos WHERE id=?').bind(id).run();
        return json({ ok: true });
      }

      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  },
};

function safeJson(s, fallback) { try { return JSON.parse(s); } catch (e) { return fallback; } }
function rowCity(r) {
  return {
    cityKey: r.city_key, name: r.name, adcode: r.adcode,
    lng: r.lng, lat: r.lat, rating: r.rating || 0,
    description: r.description || '',
    visitMonths: safeJson(r.visit_months, []),
    tags: safeJson(r.tags, []),
    coverR2Key: r.cover_r2_key || '',
    isHometown: !!r.is_hometown,
    updatedAt: r.updated_at || 0,
    photoCount: r.photo_count != null ? r.photo_count : undefined,
    cover: r.cover_r2_key || r.first_photo || '',
  };
}
function rowPhoto(r) {
  return { id: r.id, cityKey: r.city_key || null, r2Key: r.r2_key || '', url: r.url, caption: r.caption || '', date: r.date || '', ord: r.ord || 0 };
}
function rowAttr(r) {
  return { id: r.id, cityKey: r.city_key, name: r.name, visitDate: r.visit_date || '', notes: r.notes || '', ord: r.ord || 0,
    photos: (r.photos || []).map(ap => ({ id: ap.id, url: ap.url, r2Key: ap.r2_key || '', ord: ap.ord || 0 })) };
}
