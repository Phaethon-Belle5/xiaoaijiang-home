// 查出 changelog 里日期格式不规范的条目
import './cf-dns-fix.mjs';
import { readFile } from 'node:fs/promises';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const r = await fetch('https://home.xiaoaijiang.cloud/api/data?cb=' + Math.random(), { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' } });
const j = await r.json();
const list = j.changelog || [];
console.log('共 ' + list.length + ' 条：\n');
const bad = [];
list.forEach((it, i) => {
  const d = String(it.date || '');
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!ok) bad.push(i);
  console.log('  [' + i + '] ' + (ok ? '✅' : '❌') + ' date="' + d + '"  显示="' + d.slice(5) + '"  [' + (it.tag || '') + '] ' + String(it.title).slice(0, 30));
});
console.log('\n格式不规范的: ' + (bad.length ? bad.join(', ') : '无'));
