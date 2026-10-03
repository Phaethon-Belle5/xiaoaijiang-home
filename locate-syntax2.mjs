// 定位 gallery index.html 里的语法错误行
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const file = process.argv[2] || 'B:/dell/Documents/harness/gallery-deploy/index.html';
const html = await readFile(file, 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
for (let bi = 0; bi < blocks.length; bi++) {
  const src = blocks[bi][1];
  if (src.trim().length < 30) continue;
  try { new vm.Script(src); continue; } catch (e) {
    console.log('块 ' + (bi + 1) + ' 语法错误: ' + e.message);
    // 二分找最小出错前缀
    const lines = src.split('\n');
    let lo = 1, hi = lines.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      try { new vm.Script(lines.slice(0, mid).join('\n') + '\n/*pad*/'); lo = mid + 1; }
      catch (err) { hi = mid; }
    }
    const startLine = html.slice(0, blocks[bi].index).split('\n').length;
    console.log('  首个出错行: 脚本内第 ' + lo + ' 行（文件第 ' + (startLine + lo - 1) + ' 行）');
    for (let i = Math.max(0, lo - 6); i < Math.min(lines.length, lo + 3); i++) {
      console.log('  ' + String(i + 1).padStart(5) + (i + 1 === lo ? ' >> ' : '    ') + lines[i].slice(0, 150));
    }
  }
}
