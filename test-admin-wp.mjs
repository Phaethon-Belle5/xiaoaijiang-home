/**
 * 后台「壁纸」这条链路能不能真的把图片存进云端 —— 用无登录的方式验证每一步
 *   ① addWpUrl 函数存在且逻辑正确（用假的 DOM 输入调用）
 *   ② 类型下拉框会不会被同步成 image（防 readAll 冲掉）
 *   ③ 保存后云端 /api/data 里 wallpaper.type / images 是什么
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?adm=' + Date.now() });
await sleep(16000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 120));

console.log('════ ① 三个函数是否都在 ════');
line('addWpUrl', await evalJs(c, 'typeof addWpUrl'));
line('ADMIN.editWp', await evalJs(c, 'typeof ADMIN.editWp'));
line('ADMIN.delWp', await evalJs(c, 'typeof ADMIN.delWp'));
line('wpCommit', await evalJs(c, 'typeof wpCommit'));

console.log('\n════ ② 模拟后台：打开面板 → 壁纸，粘贴地址后点添加 ════');
line('打开面板', await evalJs(c, 'try{ADMIN.shell();ADMIN.go("wallpaper");"ok"}catch(e){"❌ "+e.message}'));
await sleep(2500);
line('有没有 e-wp-type 下拉', await evalJs(c, '!!document.getElementById("e-wp-type")'));
line('下拉当前值', await evalJs(c, '(document.getElementById("e-wp-type")||{}).value'));
line('有没有 e-wp-new-url 输入框', await evalJs(c, '!!document.getElementById("e-wp-new-url")'));

// 用真实图床域名 + 几个候选文件名试（只测逻辑，稍后恢复数据）
const probe = JSON.parse(await evalJs(c, `(function(){
  var inp=document.getElementById('e-wp-new-url');
  if(!inp)return JSON.stringify({err:'没有输入框'});
  var before={type:data.wallpaper.type, n:(data.wallpaper.images||[]).length};
  inp.value='https://img.231060101.xyz/file/背景/1.jpg\\nhttps://img.231060101.xyz/file/背景/2.jpg';
  try{ addWpUrl(); }catch(e){ return JSON.stringify({err:'addWpUrl 抛错: '+e.message}); }
  var after={type:data.wallpaper.type, n:(data.wallpaper.images||[]).length};
  var sel=document.getElementById('e-wp-type');
  return JSON.stringify({before:before, after:after, 下拉值:sel?sel.value:'无', 输入框已清:(inp.value==='')});
})()`));
console.log('  ' + JSON.stringify(probe));
line('加之前 type / 张数', JSON.stringify(probe.before));
line('加之后 type / 张数', JSON.stringify(probe.after));
line('下拉框值（应为 image）', probe.下拉值);
line('输入框已清空', probe.输入框已清);

console.log('\n════ ③ 前台背景是否切成图片 ════');
line('.wp-img 数量', await evalJs(c, 'document.querySelectorAll("#wp-stage .wp-img").length'));
line('video 数量', await evalJs(c, 'document.querySelectorAll("#wp-stage video").length'));
line('getWallpaperImages 前两项', await evalJs(c, 'JSON.stringify(getWallpaperImages().slice(0,2))'));

console.log('\n════ ④ 云端 /api/data 里的 wallpaper（还没保存，应该是旧的）════');
const cloud = await evalJs(c, `fetch('https://home.xiaoaijiang.cloud/api/data?x='+Date.now()).then(r=>r.json()).then(j=>JSON.stringify({type:j.wallpaper.type, n:(j.wallpaper.images||[]).length, interval:j.wallpaper.interval}))`);
line('云端', cloud);

await closeTab(t.id);
