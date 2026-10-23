import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const s = await readFile('B:/dell/Documents/harness/gallery-deploy/admin.html','utf8');
const blocks = [...s.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
console.log('  内联脚本块: ' + blocks.length);
blocks.forEach((b,i)=>{ try{ new vm.Script(b); console.log('  块 '+(i+1)+': OK'); }catch(e){ console.log('  块 '+(i+1)+': ❌ '+e.message); } });
console.log('  含 provReviewInput: ' + (s.includes('provReviewInput')?'✅':'❌'));
console.log('  含 saveProvinceReview: ' + (s.includes('function saveProvinceReview')?'✅':'❌'));
