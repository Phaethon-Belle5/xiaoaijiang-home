// 抓参考站的 HTML，找书籍效果的实现（3D 书、书脊、翻页等）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const url = 'https://blog.tsh520.cn/books/';
const r = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await r.text();
console.log('HTTP ' + r.status + '  ' + (html.length / 1024).toFixed(0) + ' KB');

// 找出所有外链资源
const links = [...html.matchAll(/(?:href|src)="([^"]+\.(?:css|js)[^"]*)"/g)].map(m => m[1]);
console.log('\n=== 资源 ===');
[...new Set(links)].slice(0, 20).forEach(l => console.log('  ' + l));

// 找 book 相关的 class / 结构
console.log('\n=== 含 book 的 class / id ===');
const classes = [...new Set([...html.matchAll(/class="([^"]*book[^"]*)"/gi)].map(m => m[1]))];
classes.slice(0, 25).forEach(c => console.log('  ' + c));

console.log('\n=== 内联 style 里与 book/3d/perspective 有关的片段 ===');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
console.log('  内联 CSS 共 ' + styles.length + ' 字符，含 book 的规则:');
const rules = styles.split('}').filter(s => /book|perspective|rotateY|rotate3d|preserve-3d/i.test(s));
rules.slice(0, 30).forEach(s => console.log('    ' + s.trim().replace(/\s+/g, ' ').slice(0, 170) + ' }'));

console.log('\n=== 页面里 book 附近的 HTML 结构 ===');
const idx = html.search(/book/i);
if (idx >= 0) console.log(html.slice(Math.max(0, idx - 300), idx + 900).replace(/\s+/g, ' '));
