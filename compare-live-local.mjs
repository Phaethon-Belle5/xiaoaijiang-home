// 对比本地与线上 HTML：脚本块还在不在、是不是被 CSS 结构问题吞掉了
import { readFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const live = await (await fetch('https://home.xiaoaijiang.cloud/?c=' + Math.random(), { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' } })).text();
const local = await readFile('B:/dell/Documents/harness/home-deploy/index.html', 'utf8');

for (const [name, html] of [['本地', local], ['线上', live]]) {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
  console.log('\n=== ' + name + ' ===');
  console.log('  文件 ' + html.length + ' 字节');
  console.log('  <script 出现 ' + (html.match(/<script/g) || []).length + ' 次，</script> 出现 ' + (html.match(/<\/script>/g) || []).length + ' 次');
  console.log('  <style  出现 ' + (html.match(/<style/g) || []).length + ' 次，</style>  出现 ' + (html.match(/<\/style>/g) || []).length + ' 次');
  console.log('  内联脚本块: ' + scripts.map(s => s[1].length).join(', '));
  console.log('  style 块: ' + styles.map(s => s[1].length).join(', '));
  const i = html.indexOf('function openDimDetail');
  console.log('  openDimDetail 位置: ' + (i < 0 ? '❌ 找不到' : '第 ' + html.slice(0, i).split('\n').length + ' 行'));
  const j = html.indexOf('const VIEW_MAP');
  console.log('  VIEW_MAP 位置: ' + (j < 0 ? '❌ 找不到' : '第 ' + html.slice(0, j).split('\n').length + ' 行'));
  // 大脚本块的开头结尾
  const big = scripts.map(s => s[1]).sort((a, b) => b.length - a.length)[0];
  if (big) {
    console.log('  最大脚本块: ' + big.length + ' 字符');
    console.log('    开头: ' + JSON.stringify(big.slice(0, 70)));
    console.log('    结尾: ' + JSON.stringify(big.slice(-70)));
  }
}

console.log('\n=== 检查 @media 嵌套（CSS 括号是否配平）===');
for (const [name, html] of [['本地', local], ['线上', live]]) {
  const style = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  let depth = 0, minDepth = 0;
  for (const ch of style) { if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth < minDepth) minDepth = depth; } }
  console.log('  ' + name + ': 最终深度 ' + depth + '（应为 0），过程中最低 ' + minDepth + '（低于 0 说明多右括号）');
}
