import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const worker = readFileSync(new URL('../worker/worker.js', import.meta.url), 'utf8');
const frontend = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const deploy = readFileSync(new URL('../worker/deploy.mjs', import.meta.url), 'utf8');

// catalog：只列 Music/ 下的 mp3，携带原始 key
assert.ok(worker.includes("if (p === '/music-catalog' && method === 'GET')"));
assert.ok(worker.includes("await env.BUCKET.list({ prefix: 'Music/'"));
assert.ok(worker.includes("if (!name || !/\\.mp3$/i.test(name)) continue;"));
assert.ok(worker.includes("out.push({ name: decoded.replace(/\\.mp3$/i, ''), src: publicUrl(key), key });"));
// 封面：直接读 mp3 内嵌 ID3 封面
assert.ok(worker.includes("if (p === '/music-cover' && method === 'GET')"));
assert.ok(worker.includes('function extractMp3Cover(buf)'));
assert.ok(worker.includes("extractCoverFromStream(obj.body)"));
// 前端：catalog 封面走 /music-cover，歌词取同名 .lrc
assert.ok(frontend.includes("fetch(API_URL+'/music-catalog'"));
assert.ok(frontend.includes("filter(s=>s.src)"));
assert.ok(frontend.includes("API_URL+'/music-cover?key='+encodeURIComponent(s.key)"));
assert.ok(frontend.includes("R2P+'Music/'+enc+'.lrc'"));
// 部署密码绑定不变
assert.ok(deploy.includes("readFileSync(join(import.meta.dirname || '.', '.site_password'), 'utf-8').trim()"));

console.log('Music catalog (mp3 直读封面 + 同名 lrc) and password binding are wired.');
