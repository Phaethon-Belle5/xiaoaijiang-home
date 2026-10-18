import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile('B:/dell/Documents/harness/ref-your-china-travel/index.html', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
function grabBlock(src, s) { let d = 0, seen = false, e = s; for (; e < src.length; e++) { if (src[e] === '{') { d++; seen = true; } else if (src[e] === '}') { d--; if (seen && d === 0) break; } } return src.slice(s, e + 1); }
// 抓 .memory-* 的全部规则（含 @media 里的：先剥掉 @media 外壳再逐条收）
const out = [];
// 1) 顶层规则
const re = /([^{}@]+)\{([^{}]*)\}/g; let m;
while ((m = re.exec(styles))) {
  const sel = m[1].trim();
  if (sel.includes('.memory-')) out.push(sel + '{' + m[2].trim() + '}');
}
// 2) 关键帧
for (const mm of styles.matchAll(/@keyframes\s+(memory[A-Za-z]*)\s*\{/g)) {
  out.push('@keyframes ' + mm[1] + ' ' + grabBlock(styles, styles.indexOf('{', mm.index)));
}
// 3) @media 块里含 .memory- 的规则，原样保留整块
for (const mm of styles.matchAll(/@media[^{]+\{/g)) {
  const body = grabBlock(styles, styles.indexOf('{', mm.index));
  if (body.includes('.memory-')) out.push('@media' + mm[0].slice(6));
}
// 上面 3) 会把整块收进去，重复没关系；去重
const uniq = [...new Set(out)];
const css = `/* ══════════════════════════════════════════════════════════════
   记忆书架 —— 整段搬自参考项目 Your-China-Travel（.memory-* 规则 + 关键帧）
   逻辑与样式未改；只在这里说明来源。
   ══════════════════════════════════════════════════════════════ */
${uniq.join('\n')}
`;
await writeFile('B:/dell/Documents/harness/memory-shelf.css', css, 'utf8');
console.log('memory-shelf.css: ' + uniq.length + ' 条（含 @media 整块），' + (css.length / 1024).toFixed(1) + ' KB');
console.log('\n书相关的关键规则：');
for (const name of ['.memory-book{', '.memory-book-object{', '.memory-book-cover{', '.memory-book-spine-face{', '.memory-book-photo{', '.memory-book-title{', '.memory-book-meta{', '.memory-book.opening']) {
  const hit = uniq.find(r => r.replace(/\s/g, '').startsWith(name.replace('{', '{')));
  console.log('  ' + (hit ? '✅ ' : '❌ ') + name);
}
