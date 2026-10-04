import { setThreadCount } from './stories.js?v=11';

// 三级层级：
//   level1 = 全部省份（每个省一条线，线里流该省的全部照片）
//   level2 = 某个省的所有城市（每座城市一条线，线里流该城市的照片）
//   level3 = 单个城市的照片（点城市线后打开的照片故事即为此层）
// photos 始终是全量、纹理只加载一次；层级只改变「哪些照片归到哪条线」。
export async function loadCatalog() {
  const bridge = parent.TravelPhotoStreamBridge;
  if (!bridge) throw new Error('请从旅行网页的“照片流”入口打开。');
  const catalog = await bridge.readCatalog();
  const photos = catalog.photos || [];
  const byId = new Map(photos.map((p, i) => [String(p.id), i]));

  const mkStory = (g) => {
    const chapters = (g.photoIds || []).map((id) => {
      const j = byId.get(String(id));
      if (j == null) return null;
      const p = photos[j];
      return { photo: String(id), layer: j, src: p.src, aspect: p.aspect, caption: p.description, date: p.date, text: p.text };
    }).filter(Boolean);
    // 每条线要有自己的颜色（光瀑用它决定线条与页面的色调），取该线所有照片平均色的均值。
    // 缺了 col 会在 uploadStories 里抛 "s.col is not iterable"。
    let r = 0, gg = 0, b = 0;
    for (const c of chapters) {
      const a = (photos[c.layer] && photos[c.layer].avg) || [0.82, 0.66, 0.27];
      r += a[0]; gg += a[1]; b += a[2];
    }
    const n = chapters.length || 1;
    const col = [r / n, gg / n, b / n];
    return { key: String(g.key), title: g.title, chapters, col, rgb: col.map((v) => Math.round(v * 255)).join(' ') };
  };

  const levels = catalog.levels || [[], {}];
  if (!(levels[0] || []).length) throw new Error('照片流数据还没准备好，请关闭后重试。');
  const level1 = (levels[0] || []).map(mkStory).filter((s) => s.chapters.length);
  const raw2 = levels[1] || {};
  const level2 = {};
  for (const k of Object.keys(raw2)) {
    const arr = (raw2[k] || []).map(mkStory).filter((s) => s.chapters.length);
    if (arr.length) level2[k] = arr;
  }

  // 线条数固定为各层级的最大值：三个层级共用同一套 GPU 缓冲，切换层级不再重新分配
  let maxThreads = Math.max(1, level1.length);
  for (const k of Object.keys(level2)) maxThreads = Math.max(maxThreads, level2[k].length);
  setThreadCount(maxThreads);

  document.getElementById('photo-count').textContent =
    level1.length + ' 个省份 · ' + photos.length + ' 张照片' + (catalog.failed ? ' · ' + catalog.failed + ' 张未能读取' : '');

  // 照片目录：列全部照片，点击直接跳到它所属的城市
  const panel = document.getElementById('photo-directory'), toggle = document.getElementById('directory-toggle');
  toggle.onclick = () => {
    panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('button')?.focus();
  };
  const grid = panel.querySelector('.directory-grid');
  const cityOfPhoto = new Map();
  for (const prov of Object.keys(raw2)) {
    for (const g of raw2[prov]) for (const id of g.photoIds || []) cityOfPhoto.set(String(id), { prov, city: g.title });
  }
  photos.forEach((photo) => {
    const button = document.createElement('button'), image = document.createElement('img'), caption = document.createElement('span');
    button.type = 'button'; image.src = photo.src; image.loading = 'lazy'; image.alt = photo.description;
    caption.textContent = photo.description; button.append(image, caption); grid.append(button);
    button.onclick = () => {
      panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
      const dest = cityOfPhoto.get(String(photo.id));
      if (dest && window.__undertow && window.__undertow.openCity) window.__undertow.openCity(dest.prov, dest.city);
      else if (window.__undertow) window.__undertow.openStory(0);
    };
  });
  if (!photos.length) throw new Error('照片未能读取，请关闭后重试。');
  return { photos, level1, level2, journal: [] };
}
