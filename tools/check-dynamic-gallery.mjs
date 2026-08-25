import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../worker/worker.js', import.meta.url), 'utf8');
const frontend = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.ok(source.includes('async function getGalleryWithR2()'));
// 列举经由共享的 listR2(prefix, extRe) 完成，映像馆只取 webp
assert.ok(source.includes("const GALLERY_PREFIX = '映像馆/webp/'"));
assert.ok(source.includes('const IMAGE_EXTENSIONS = /\\.webp$/i;'));
assert.ok(source.includes('listR2(GALLERY_PREFIX, IMAGE_EXTENSIONS)'));
assert.ok(source.includes('env.BUCKET.list({ prefix })'));
assert.ok(source.includes('if (!listed.truncated) break;'));
// R2 为准，KV 同名条目只覆盖人工标注，非映像馆下的自定义图片原样保留
assert.ok(source.includes('const meta = overlay.get(o.name) || {};'));
assert.ok(source.includes('return custom.concat(photos);'));
assert.ok(source.includes("k === 'gallery' ? await getGalleryWithR2()"));
assert.ok(source.includes("if (key === 'gallery') return json(await getGalleryWithR2());"));
assert.ok(frontend.includes('JSON.stringify(remote.gallery)!==JSON.stringify(data.gallery)'));
assert.ok(frontend.includes('}else{\r\n      unlocated.push(Object.assign({index:i},item));'));

console.log('Dynamic R2 gallery merge is wired into public gallery reads.');
