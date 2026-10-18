// 从参考项目 index.html 里抽出「记忆书架的书」CSS 和「旅途影像穹顶」的 CSS/JS
import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('B:/dell/Documents/harness/ref-your-china-travel/index.html', 'utf8');
console.log('参考项目 index.html: ' + (html.length / 1024).toFixed(0) + ' KB');

// 抽出所有 <style> 内容
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
console.log('内联 CSS 共 ' + (styles.length / 1024).toFixed(0) + ' KB');

console.log('\n════ 书架相关的 CSS 规则 ════');
const rules = styles.split('}');
const wanted = rules.filter(r => /book-cover|shelf|:hover .*rotateY|perspective|preserve-3d|book-spine|book-pages|book-edge/i.test(r));
wanted.slice(0, 60).forEach(r => {
  const s = r.trim();
  if (!s) return;
  console.log('\n' + s.replace(/\s+/g, ' ').slice(0, 420) + ' }');
});

console.log('\n\n════ 旅途影像穹顶的 CSS 规则 ════');
const dome = rules.filter(r => /life-photo-dome|life-timeline-pane|life-archive-layout/i.test(r));
dome.slice(0, 40).forEach(r => {
  const s = r.trim();
  if (!s) return;
  console.log('\n' + s.replace(/\s+/g, ' ').slice(0, 420) + ' }');
});

// 找 JS：lifePhotoDome 的渲染逻辑
console.log('\n\n════ 旅途影像穹顶的 JS ════');
const idx = html.indexOf('lifePhotoDome');
if (idx >= 0) {
  // 往前找函数起点
  const start = Math.max(0, html.lastIndexOf('function ', idx) - 0);
  const seg = html.slice(Math.max(0, idx - 1500), idx + 4500);
  console.log(seg.slice(0, 5200));
}

await writeFile('B:/dell/Documents/harness/ref-book-css.txt',
  wanted.map(r => r.trim()).filter(Boolean).map(r => r.replace(/\s+/g, ' ') + ' }').join('\n\n'), 'utf8');
await writeFile('B:/dell/Documents/harness/ref-dome-css.txt',
  dome.map(r => r.trim()).filter(Boolean).map(r => r.replace(/\s+/g, ' ') + ' }').join('\n\n'), 'utf8');
console.log('\n\n已保存: ref-book-css.txt / ref-dome-css.txt');
