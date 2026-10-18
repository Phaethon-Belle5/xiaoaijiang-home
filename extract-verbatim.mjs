/**
 * 从参考项目 index.html 里整段切出：
 *  ① DomeGallery 类（旅途影像用的那个库）
 *  ② DomeGallery 的 CSS
 *  ③ 旅途影像的挂载代码（collectLifeDomePhotos + lifePhotoDome）
 *  ④ 记忆书架：memoryShelfLayout / renderMemoryShelf / openMemoryShelf
 *  ⑤ 记忆书架 / 书的 CSS
 * 全部原样保存成文件，方便整段搬过来。
 */
import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('B:/dell/Documents/harness/ref-your-china-travel/index.html', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
console.log('参考项目: CSS ' + Math.round(styles.length / 1024) + ' KB, 内联 JS ' + Math.round(scripts.length / 1024) + ' KB');

// ── 括号配对工具：从某个起点抓一整段 ──
function grabBlock(src, startIdx, openCh = '{', closeCh = '}') {
  let depth = 0, seen = false, end = startIdx;
  for (; end < src.length; end++) {
    const ch = src[end];
    if (ch === openCh) { depth++; seen = true; }
    else if (ch === closeCh) { depth--; if (seen && depth === 0) break; }
  }
  return src.slice(startIdx, end + 1);
}

// ═══ ① DomeGallery 类 ═══
const dgStart = scripts.indexOf('class DomeGallery');
if (dgStart < 0) { console.log('❌ 没找到 class DomeGallery'); }
else {
  const body = grabBlock(scripts, dgStart);
  await writeFile('B:/dell/Documents/harness/ref-DomeGallery.js', body, 'utf8');
  console.log('① DomeGallery 类: ' + (body.length / 1024).toFixed(1) + ' KB, ' + body.split('\n').length + ' 行');
}

// ═══ ② DomeGallery 的 CSS ═══
// 先看看它用什么类名前缀
const domeClasses = new Set();
for (const m of scripts.matchAll(/['"`]([a-z-]*dome[a-z-]*)['"`]/gi)) domeClasses.add(m[1]);
console.log('   DomeGallery 里出现的类名样例: ' + [...domeClasses].slice(0, 14).join(', '));

// ═══ ③ 旅途影像挂载代码 ═══
for (const fn of ['destroyLifeDomeGallery', 'collectLifeDomePhotos']) {
  const i = scripts.indexOf('function ' + fn);
  if (i < 0) { console.log('❌ 没找到 ' + fn); continue; }
  // function 声明：从 function 到配对的 }
  const start = scripts.indexOf('{', i);
  const body = scripts.slice(i, start) + grabBlock(scripts, start);
  await writeFile('B:/dell/Documents/harness/ref-' + fn + '.js', body, 'utf8');
  console.log('③ ' + fn + ': ' + body.split('\n').length + ' 行');
}

// 找 lifePhotoDome 的挂载段（在哪个函数里）
const lp = scripts.indexOf("lifePhotoDome");
if (lp >= 0) {
  const fnStart = scripts.lastIndexOf('function ', lp);
  const brace = scripts.indexOf('{', fnStart);
  const body = scripts.slice(fnStart, brace) + grabBlock(scripts, brace);
  await writeFile('B:/dell/Documents/harness/ref-lifeDome-mount.js', body, 'utf8');
  console.log('③ 挂载函数: ' + body.split('\n').length + ' 行  —— 开头: ' + body.slice(0, 90).replace(/\s+/g, ' '));
}

// ═══ ④ 记忆书架三个函数 ═══
const shelfFns = {};
for (const fn of ['memoryShelfGap', 'memoryShelfLayout', 'renderMemoryShelf', 'openMemoryShelf']) {
  const i = scripts.indexOf('function ' + fn);
  if (i < 0) { console.log('❌ 没找到 ' + fn); continue; }
  const brace = scripts.indexOf('{', i);
  shelfFns[fn] = scripts.slice(i, brace) + grabBlock(scripts, brace);
  console.log('④ ' + fn + ': ' + shelfFns[fn].split('\n').length + ' 行');
}
await writeFile('B:/dell/Documents/harness/ref-memory-shelf.js', Object.values(shelfFns).join('\n\n'), 'utf8');

// ═══ ⑤ 记忆书架 / 书的 CSS（按规则切，含 @media 与 @keyframes 里的）═══
const rules = [];
// 先整段按 rule 抓（这个文件里 .memory- 规则基本都在顶层）
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = ruleRe.exec(styles))) {
  const sel = m[1].trim();
  if (/\.memory-(shelf|book|province|album|chapter|page|overlay|chapter)/.test(sel) || /\.memory-/.test(sel)) {
    rules.push(sel + '{' + m[2].trim() + '}');
  }
}
// 关键帧
for (const m2 of styles.matchAll(/@keyframes\s+(memory[A-Za-z]*)\s*\{/g)) {
  const start = styles.indexOf('{', m2.index);
  rules.push('@keyframes ' + m2[1] + ' ' + grabBlock(styles, start));
}
await writeFile('B:/dell/Documents/harness/ref-memory-shelf.css', rules.join('\n'), 'utf8');
console.log('⑤ 记忆书架 CSS: ' + rules.length + ' 条规则, ' + (rules.join('\n').length / 1024).toFixed(1) + ' KB');

// ═══ 附：DOM 模板 ═══
const tpl = [];
for (const m3 of html.matchAll(/memory-book-[a-z-]+/g)) tpl.push(m3[0]);
console.log('\n书用到的类名: ' + [...new Set(tpl)].join(', '));
