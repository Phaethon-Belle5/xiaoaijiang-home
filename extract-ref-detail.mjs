// 精确抽取：书架关键帧 + book-object 变换 + 穹顶 CSS/JS
import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('B:/dell/Documents/harness/ref-your-china-travel/index.html', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const rules = styles.split('}').map(r => r.trim()).filter(Boolean);

const pick = (re) => rules.filter(r => re.test(r)).map(r => r.replace(/\s+/g, ' ') + ' }');

console.log('════ ① 关键帧（封面翻开等）════');
const kf = [...styles.matchAll(/@keyframes\s+(memory[A-Za-z]*)\s*\{/g)].map(m => m[1]);
console.log('  关键帧名: ' + [...new Set(kf)].join(', '));
for (const name of [...new Set(kf)]) {
  const i = styles.indexOf('@keyframes ' + name);
  // 手动配对花括号
  let depth = 0, j = styles.indexOf('{', i), end = j;
  for (; end < styles.length; end++) {
    if (styles[end] === '{') depth++;
    else if (styles[end] === '}') { depth--; if (depth === 0) break; }
  }
  console.log('\n  @keyframes ' + name + ' ' + styles.slice(j, end + 1).replace(/\s+/g, ' '));
}

console.log('\n\n════ ② 书的 3D 主体变换（object / shadow / hover / active）════');
const obj = pick(/memory-book-object|memory-book-shadow|memory-book:hover|memory-book\.active|memory-book\.inspecting|memory-book\.opening|memory-book-index|memory-book-title|memory-book-subtitle|memory-book-photo|memory-book-meta|memory-book-open|memory-book-mark/);
obj.slice(0, 45).forEach(r => console.log('\n  ' + r.slice(0, 400)));

console.log('\n\n════ ③ 书架视口 / 轨道 ════');
pick(/memory-shelf-viewport|memory-shelf-scene|memory-shelf-track|memory-shelf-floor|memory-shelf-hint|memory-shelf-grid|memory-shelf-body|memory-shelf-dialog|memory-shelf-overlay/).slice(0, 30).forEach(r => console.log('\n  ' + r.slice(0, 400)));

console.log('\n\n════ ④ 旅途影像穹顶 CSS ════');
pick(/life-photo-dome|life-timeline-pane|life-archive-layout/).slice(0, 35).forEach(r => console.log('\n  ' + r.slice(0, 400)));

// 保存完整
await writeFile('B:/dell/Documents/harness/ref-detail.txt',
  ['/* ===== 书 ===== */', ...obj, '', '/* ===== 书架 ===== */', ...pick(/memory-shelf/), '', '/* ===== 穹顶 ===== */', ...pick(/life-photo-dome|life-timeline-pane|life-archive-layout/)].join('\n\n'), 'utf8');
console.log('\n\n已保存 ref-detail.txt');

// 找穹顶的 JS 渲染
console.log('\n════ ⑤ 穹顶渲染 JS ════');
const m = html.match(/function\s+[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{[^}]{0,400}lifePhotoDome/);
let at = html.indexOf('lifePhotoDome');
let segs = [];
let pos = 0;
while ((pos = html.indexOf('lifePhotoDome', pos)) >= 0) { segs.push(pos); pos += 12; }
console.log('  lifePhotoDome 出现 ' + segs.length + ' 次，位置: ' + segs.join(', '));
for (const s of segs) {
  const start = Math.max(0, html.lastIndexOf('\n', s - 1200));
  console.log('\n  --- 片段 @' + s + ' ---');
  console.log(html.slice(Math.max(0, s - 700), s + 1600));
  break;
}
