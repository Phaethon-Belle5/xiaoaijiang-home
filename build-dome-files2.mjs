import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile('B:/dell/Documents/harness/ref-your-china-travel/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

function grabBlock(src, startIdx) {
  let d = 0, seen = false, end = startIdx;
  for (; end < src.length; end++) {
    if (src[end] === '{') { d++; seen = true; }
    else if (src[end] === '}') { d--; if (seen && d === 0) break; }
  }
  return src.slice(startIdx, end + 1);
}

// 起点：const clamp（类前面那段工具函数的开头）
const start = scripts.indexOf('const clamp = (value, min, max)');
const clsStart = scripts.indexOf('class DomeGallery');
if (start < 0 || clsStart < 0) { console.log('❌ 定位失败'); process.exit(1); }
console.log('工具函数起点 - 类起点 = ' + (clsStart - start) + ' 字符');
const helpers = scripts.slice(start, clsStart).trimEnd();
const klass = grabBlock(scripts, clsStart);
console.log('helpers: ' + helpers.split('\n').length + ' 行，class: ' + klass.split('\n').length + ' 行');

// 检查类里用到但没定义的标识符（粗略）
const body = helpers + '\n' + klass;
const defined = new Set(['clamp', 'wrapAngle', 'buildItems', 'DomeGallery', 'this', 'Math', 'Array', 'Object', 'Number', 'String', 'document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'performance', 'console', 'setTimeout', 'clearTimeout', 'JSON', 'Boolean', 'isFinite', 'parseFloat', 'parseInt', 'Infinity', 'undefined', 'NaN', 'PointerEvent', 'Event', 'CustomEvent', 'getComputedStyle', 'SVGElement', 'HTMLElement', 'Element', 'HTMLImageElement']);
for (const mm of body.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) defined.add(mm[1]);

const out = `/* ═══════════════════════════════════════════════════════════════════
   DomeGallery —— 穹顶照片画廊
   整段搬自参考项目 Your-China-Travel（其原注释：「React Bits DomeGallery
   JS-CSS 的原生单页适配」）。逻辑、结构、参数名一律未改，只把它从内联脚本
   切出来单独成文件，方便直接 <script> 引入。
   用法： new DomeGallery(容器元素, { images:['https://…', …], segments, minRadius, grayscale, overlayBlurColor })
   ═══════════════════════════════════════════════════════════════════ */
${helpers}

${klass}

window.DomeGallery = DomeGallery;
`;
await writeFile('B:/dell/Documents/harness/dome-gallery.js', out, 'utf8');

// CSS 同步重抽
const pick = [];
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = ruleRe.exec(styles))) {
  const sel = m[1].trim();
  if (/\.dg-/.test(sel) || /\.life-photo-dome/.test(sel) || /\.dg-root/.test(sel)) pick.push(sel + '{' + m[2].trim() + '}');
}
await writeFile('B:/dell/Documents/harness/dome-gallery.css', out.slice(0, 0) + pick.join('\n') + '\n', 'utf8');
console.log('dome-gallery.js  : ' + (out.length / 1024).toFixed(1) + ' KB');
console.log('dome-gallery.css : ' + pick.length + ' 条规则 (' + (pick.join('\n').length / 1024).toFixed(1) + ' KB)');
