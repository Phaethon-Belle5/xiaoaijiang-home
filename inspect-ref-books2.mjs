// 取全参考站书籍效果的 CSS 规则（不截断）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const html = await (await fetch('https://blog.tsh520.cn/books/', { headers: { 'User-Agent': UA } })).text();
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');

const want = ['nb-book', 'shelf-grid', 'bookshelf', 'book-status-tag', 'book-score-tag', 'nb-book-inner', 'nb-book-cover', 'nb-book-pages', 'nb-book-back', 'nb-book-bind', 'nb-book-illustration'];
console.log('=== 相关规则全文 ===');
for (const block of styles.split('}')) {
  const s = block.trim();
  if (!s) continue;
  if (!want.some(w => s.includes(w))) continue;
  const clean = s.replace(/\[data-astro-cid-[a-z0-9]+\]/g, '').replace(/\s+/g, ' ');
  console.log('\n' + clean + ' }');
}

console.log('\n\n=== 一本书的 HTML 结构 ===');
const m = html.match(/<a[^>]*class="[^"]*nb-book[^"]*"[\s\S]{0,1400}?<\/a>/);
if (m) console.log(m[0].replace(/data-astro-cid-[a-z0-9]+/g, '').replace(/\s+/g, ' ').slice(0, 1300));
else {
  const i = html.indexOf('nb-book-inner');
  console.log(html.slice(Math.max(0, i - 700), i + 900).replace(/data-astro-cid-[a-z0-9]+/g, '').replace(/\s+/g, ' '));
}
