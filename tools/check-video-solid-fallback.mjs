import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stageRule = source.match(/#wp-stage\{[^}]*\}/)?.[0] ?? '';
const videoBranch = source.match(/if\(w\.type==='video'[\s\S]*?\n  \}else\{/ )?.[0] ?? '';

assert.match(stageRule, /background:\s*#0B0E14/);
assert.doesNotMatch(stageRule, /url\(/);
assert.doesNotMatch(videoBranch, /ensureWallpaperFallback\(/);
assert.doesNotMatch(source, /v\.poster\s*=/);
assert.match(source, /\.wp-video-toggle,\.wp-cycle-btn\{[^}]*width:40px[^}]*height:40px/);
assert.match(source, /b\.onkeydown=e=>\{if\(e\.key==='Enter'\|\|e\.key===' '\)\{e\.preventDefault\(\);cycleWallpaper\(\);\}\};/);

console.log('Video wallpaper uses a solid pre-playback fallback and accessible cycle control.');
