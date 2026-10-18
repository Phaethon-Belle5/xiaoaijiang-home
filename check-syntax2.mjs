import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const html = await readFile('B:/dell/Documents/harness/gallery-deploy/index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(x => x.trim().length > 200);
blocks.forEach((x, i) => {
  try { new vm.Script(x); console.log('  块 ' + (i + 1) + ': OK'); }
  catch (e) {
    console.log('  块 ' + (i + 1) + ': ❌ ' + e.message);
    const mm = String(e.stack || '').match(/<anonymous>:(\d+)/);
    if (mm) {
      const ln = +mm[1];
      const arr = x.split('\n');
      for (let k = Math.max(0, ln - 3); k < Math.min(arr.length, ln + 2); k++) console.log('     ' + (k + 1) + ': ' + arr[k].slice(0, 160));
    }
  }
});
