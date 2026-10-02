/**
 * 审计渲染模板：找出所有「可能抛错」的 data 字段访问
 * 关注：data.X.map / data.X.filter / data.X.length / data.X.forEach / data.X.slice
 * 这些在 X 不是数组时都会抛 TypeError，导致整个渲染中断
 */
import { readFile } from 'node:fs/promises';
const html = await readFile('B:/dell/Documents/harness/home-deploy/index.html', 'utf8');
const lines = html.split('\n');

// 大渲染模板的范围：从 <main 到 </main> 之后那段
const re = /data\.([A-Za-z_$][\w$]*)\s*\.\s*(map|filter|forEach|slice|length|find|some|every|reduce|join|sort|push|splice)/g;
const hits = [];
lines.forEach((line, i) => {
  let m;
  const r = new RegExp(re.source, 'g');
  while ((m = r.exec(line))) {
    const guarded = new RegExp('\\(' + 'data\\.' + m[1] + '\\s*\\|\\|\\s*\\[\\s*\\]' + '\\)').test(line)
      || new RegExp('Array\\.isArray\\(\\s*data\\.' + m[1] + '\\s*\\)').test(line);
    hits.push({ line: i + 1, field: m[1], method: m[2], guarded, text: line.trim().slice(0, 120) });
  }
});

const unguarded = hits.filter(h => !h.guarded);
console.log('总访问点: ' + hits.length + '   其中未加防御: ' + unguarded.length + '\n');
console.log('=== 未加防御的访问点（data.X 直接调数组方法）===');
const seen = new Set();
unguarded.forEach(h => {
  const key = h.field + '.' + h.method;
  const tag = seen.has(key) ? '（重复）' : '';
  seen.add(key);
  console.log('  行' + String(h.line).padStart(5) + '  data.' + h.field + '.' + h.method + '()  ' + tag);
  if (!seen.has(key + 'shown')) { console.log('          ' + h.text); seen.add(key + 'shown'); }
});

console.log('\n=== 各字段出现次数 ===');
const byField = {};
hits.forEach(h => { byField[h.field] = byField[h.field] || { total: 0, unguarded: 0 }; byField[h.field].total++; if (!h.guarded) byField[h.field].unguarded++; });
Object.entries(byField).sort((a, b) => b[1].unguarded - a[1].unguarded).forEach(([f, v]) =>
  console.log('  data.' + f.padEnd(18) + ' 共 ' + String(v.total).padStart(2) + ' 处，未防御 ' + v.unguarded));
