import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
const s = await readFile('B:/dell/Documents/harness/gallery-deploy/assets/travel-ring-tree/embedded.js', 'utf8');
const i = s.indexOf('window.TravelRingTreeDocument');
if (i < 0) { console.log('❌ 没有 Document 函数'); process.exit(1); }
// 执行 embedded.js（在沙箱里），拿到 Document，生成 HTML，抽出 <script> 再校验
const sandbox = { window: {}, document: { createElement: () => ({ style: {}, appendChild(){}, setAttribute(){}, getContext(){ return { fillRect(){}, createLinearGradient(){ return { addColorStop(){} } }, getImageData(){ return { data: [] } }, putImageData(){} } } }), head: { appendChild(){} }, body: { appendChild(){} } }, navigator: {}, location: {}, console, setTimeout, clearTimeout, URL };
vm.createContext(sandbox);
try { vm.runInContext(s, sandbox); } catch (e) { console.log('执行 embedded.js 失败: ' + e.message); }
const Doc = sandbox.window.TravelRingTreeDocument;
console.log('TravelRingTreeDocument: ' + typeof Doc);
if (typeof Doc === 'function') {
  const html = Doc([{ id: 'a:1', kind: 'image', src: 'https://x/y.webp', cityKey: 'a', title: 'a', aspect: 4/3, year: 2026 }]);
  console.log('生成的 HTML 长度: ' + html.length);
  const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(x => x.trim().length > 500);
  console.log('内联脚本块: ' + scripts.length);
  scripts.forEach((b, k) => { try { new vm.Script(b); console.log('  块 ' + (k+1) + ' (' + b.length + '): OK'); } catch (e) { console.log('  块 ' + (k+1) + ': ❌ ' + e.message); const m = String(e.stack).match(/<anonymous>:(\d+)/); if (m) { const arr = b.split('\n'); console.log('     行 ' + m[1] + ': ' + (arr[+m[1]-1]||'').slice(0,160)); } } });
}
