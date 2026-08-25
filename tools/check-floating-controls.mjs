import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(source.includes('.music-float{position:fixed;right:24px;bottom:76px;'));
assert.ok(source.includes('.music-float{right:16px;bottom:136px}'));
assert.ok(source.includes('.wp-controls{bottom:88px;right:16px}'));
assert.ok(source.includes('#back-to-top{bottom:140px;right:16px}'));
console.log('Music player is aligned above the wallpaper control at the right edge.');
