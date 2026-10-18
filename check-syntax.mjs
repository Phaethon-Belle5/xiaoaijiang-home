import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html = await readFile('B:/dell/Documents/harness/gallery-deploy/index.html', 'utf8');
const b = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(x => x.trim().length > 200);
b.forEach((x, i) => { try { new vm.Script(x); console.log('  脚本块 ' + (i + 1) + ': OK'); } catch (e) { console.log('  ❌ ' + e.message); } });
console.log('  shelf-rail: ' + (html.includes('shelf-rail') ? '✅' : '❌'));
console.log('  shelfWrap:  ' + (html.includes('shelfWrap') ? '✅' : '❌'));
const st = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
console.log('  CSS 括号: ' + (st.match(/\{/g) || []).length + ' / ' + (st.match(/\}/g) || []).length);
// 检查 memShelfHTML 的 div 是否配平
const i0 = html.indexOf('function memShelfHTML');
const seg = html.slice(i0, i0 + 3000);
console.log('  片段里 <div 数: ' + (seg.match(/<div/g) || []).length + '  </div> 数: ' + (seg.match(/<\/div>/g) || []).length);
