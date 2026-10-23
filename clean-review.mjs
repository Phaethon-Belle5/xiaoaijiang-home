import { readFile } from 'node:fs/promises';
const base='https://mapi.231060101.xyz';
const pw=(await readFile('C:/Users/dell/Desktop/web/_repo/map-gallery-worker/.site_password','utf8')).trim();
const r=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0'},body:JSON.stringify({password:pw})});
const token=(await r.json()).token;
const r2=await fetch(base+'/province-review',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'Mozilla/5.0','Authorization':'Bearer '+token},body:JSON.stringify({province:'山东省',text:''})});
console.log('  清除: HTTP '+r2.status);
const r3=await fetch(base+'/province-reviews',{headers:{'User-Agent':'Mozilla/5.0'}});
console.log('  现在内容: '+JSON.stringify(await r3.json()));
