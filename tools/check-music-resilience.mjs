import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const worker = readFileSync(new URL('../worker/worker.js', import.meta.url), 'utf8');
const frontend = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const deploy = readFileSync(new URL('../worker/deploy.mjs', import.meta.url), 'utf8');

assert.ok(worker.includes("if (p === '/music-catalog' && method === 'GET')"));
assert.ok(worker.includes("await env.BUCKET.list({ prefix: 'Music/'"));
// 音乐封面是 jpg/jpeg，与映像馆的 webp 规则分开匹配
assert.ok(worker.includes("decoded.match(/^(.*)\\.(mp3|jpe?g)$/i)"));
assert.ok(worker.includes("if (/\\.mp3$/i.test(decoded)) entry.src = publicUrl(key);"));
assert.ok(frontend.includes("fetch(API_URL+'/music-catalog'"));
assert.ok(frontend.includes("filter(s=>s.src)"));
assert.ok(frontend.includes("cover:s.cover||DEFAULT_MUSIC_COVER"));
assert.ok(deploy.includes("readFileSync(join(import.meta.dirname || '.', '.site_password'), 'utf-8').trim()"));

console.log('Music catalog, missing-cover fallback, and password binding are wired.');
