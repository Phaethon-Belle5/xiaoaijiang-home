/**
 * 验收：粘贴 .webm 地址会自动进「背景视频」，图片才进「壁纸图片」
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?split=' + Date.now() });
await sleep(19000);

const chk = [];
const ok = (n, v, p) => { chk.push(p); console.log('  ' + (p ? '✅' : '❌') + ' ' + n.padEnd(28) + ' = ' + String(v).slice(0, 110)); };
const line = (n, v) => console.log('  ' + '  ' + n.padEnd(28) + ' = ' + String(v).slice(0, 110));

await evalJs(c, 'try{localStorage.clear();sessionStorage.clear();}catch(e){} 1');
await c.send('Network.clearBrowserCache');
await c.send('Page.navigate', { url: 'https://home.xiaojima.cn/?x=1' }).catch(() => {});
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?split=' + Date.now() });
await sleep(18000);

console.log('════ 打开后台 → 壁纸 ════');
await evalJs(c, 'ADMIN.shell();ADMIN.go("wallpaper"); 1');
await sleep(2600);
line('这一栏标题', await evalJs(c, `(function(){var l=[].slice.call(document.querySelectorAll('#admin-panel label')).filter(function(e){return /添加背景地址/.test(e.textContent)});return l.length?l[0].textContent.trim():'没找到'})()`));
line('现有视频条数', await evalJs(c, '(data.wallpaper.videos||[]).length'));
line('现有图片张数', await evalJs(c, '(data.wallpaper.images||[]).length'));

console.log('\n════ 粘贴混合地址（2 个 webm + 1 张 jpg）════');
const r = JSON.parse(await evalJs(c, `(function(){
  var NL=String.fromCharCode(10);
  var inp=document.getElementById('e-wp-new-url');
  inp.value=[
    'https://img.231060101.xyz/file/背景/1793280391212_雷姆.webm',
    'https://img.231060101.xyz/file/背景/1793280389154_宵宫.webm',
    'https://img.231060101.xyz/file/背景/test-图片.jpg'
  ].join(NL);
  var before={v:(data.wallpaper.videos||[]).length,i:(data.wallpaper.images||[]).length,type:data.wallpaper.type};
  addWpUrl();
  var vids=(data.wallpaper.videos||[]).map(function(v){return wpFileName(v.src)});
  var imgs=(data.wallpaper.images||[]).map(function(u){return wpFileName(u)});
  var sel=document.getElementById('e-wp-type');
  return JSON.stringify({before:before, after:{v:vids.length,i:imgs.length,type:data.wallpaper.type},
    vids:vids.slice(0,4), imgs:imgs, sel:sel?sel.value:'无'});
})()`));
line('加之前 视频/图片/类型', JSON.stringify(r.before));
line('加之后 视频/图片/类型', JSON.stringify(r.after));
console.log('  视频列表里出现的：');
r.vids.forEach(x => console.log('    ' + x));
console.log('  图片列表里出现的：');
r.imgs.forEach(x => console.log('    ' + x));

ok('webm 进了视频列表', r.vids.length >= 2, r.vids.some(x => x.endsWith('.webm')));
ok('jpg 进了图片列表', r.imgs.length >= 1, r.imgs.some(x => x.endsWith('.jpg')));
ok('webm 没被塞进图片列表', r.imgs.every(x => !x.endsWith('.webm')) ? '是' : '否', r.imgs.every(x => !x.endsWith('.webm')));
ok('类型自动切成 video', r.after.type, r.after.type === 'video');
ok('下拉框同步成 video', r.sel, r.sel === 'video');

console.log('\n════ 后台列表里是否分别出现在两个区 ════');
const sections = JSON.parse(await evalJs(c, `(function(){
  var groups=[].slice.call(document.querySelectorAll('#admin-panel .admin-group'));
  var out={};
  groups.forEach(function(g){
    var lb=g.querySelector('label'); var name=lb?lb.textContent.trim():'';
    if(/壁纸图片/.test(name)||/视频列表/.test(name)){
      out[name]=[].slice.call(g.querySelectorAll('.wp-list-url')).map(function(e){return e.textContent.trim()}).slice(0,5);
    }
  });
  return JSON.stringify(out);
})()`));
for (const k of Object.keys(sections)) { line(k, ''); sections[k].forEach(x => console.log('      ' + x)); }
const vidKey = Object.keys(sections).find(k => k.indexOf('视频列表') >= 0);
const imgKey = Object.keys(sections).find(k => k.indexOf('壁纸图片') >= 0);
ok('视频区有 雷姆.webm', vidKey ? sections[vidKey].join(',').indexOf('雷姆') >= 0 : '无视频区', !!(vidKey && sections[vidKey].join(',').indexOf('雷姆') >= 0));

console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
console.log('（本轮只在本地内存里加，未点保存，云端数据不变）');
await closeTab(t.id);
