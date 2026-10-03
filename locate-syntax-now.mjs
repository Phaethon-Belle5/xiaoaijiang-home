// 定位语法错误：抽出大脚本块，用 node 编译，报出行号（相对脚本）
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html = await readFile('B:/dell/Documents/harness/home-deploy/index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const src = blocks[0];
const startLine = html.slice(0, html.indexOf(src)).split('\n').length;
console.log('脚本块 ' + src.length + ' 字符，文件第 ' + startLine + ' 行起');
try { new vm.Script(src); console.log('  其实没问题？'); }
catch (e) {
  console.log('  错误: ' + e.message);
  // vm 的 stack 里带行号
  const m = String(e.stack).match(/evalmachine[^:]*:(\d+)/);
  if (m) {
    const ln = +m[1];
    const lines = src.split('\n');
    console.log('  脚本内第 ' + ln + ' 行（= 文件第 ' + (startLine + ln - 1) + ' 行）:');
    for (let i = Math.max(0, ln - 5); i < Math.min(lines.length, ln + 3); i++) {
      console.log('  ' + String(i + 1).padStart(6) + (i + 1 === ln ? ' >> ' : '    ') + lines[i].slice(0, 190));
    }
  } else {
    console.log(String(e.stack).split('\n').slice(0, 6).join('\n'));
  }
}
