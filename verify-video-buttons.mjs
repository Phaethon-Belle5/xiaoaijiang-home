/**
 * 验收后台「背景视频」列表的三个按钮真的能用：
 *   上移 / 下移 / 删除 + 选择 MP4 文件的入口
 * 注意：删除用 confirm 拦截（headless 里我改成自动确认，测完恢复数据）
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

const chk = [];
const ok = (n, v, p) => { chk.push(p); console.log('  ' + (p ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + String(v).slice(0, 110)); };
const line = (n, v) => console.log('  ' + '  ' + n.padEnd(30) + ' = ' + String(v).slice(0, 110));

await evalJs(c, 'try{localStorage.clear();sessionStorage.clear();}catch(e){} 1');
await c.send('Network.clearBrowserCache');
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?vbtn=' + Date.now() });
await sleep(19000);

console.log('════ ① 函数都在 ════');
ok('moveVideo', await evalJs(c, 'typeof moveVideo'), (await evalJs(c, 'typeof moveVideo')) === 'function');
ok('deleteVideo', await evalJs(c, 'typeof deleteVideo'), (await evalJs(c, 'typeof deleteVideo')) === 'function');
ok('uploadVideo', await evalJs(c, 'typeof uploadVideo'), (await evalJs(c, 'typeof uploadVideo')) === 'function');

console.log('\n════ ② 打开后台 → 壁纸，看列表按钮 ════');
await evalJs(c, 'ADMIN.shell();ADMIN.go("wallpaper"); 1');
await sleep(2600);
const ui = JSON.parse(await evalJs(c, `(function(){
  var btns=[].slice.call(document.querySelectorAll('#admin-panel button')).filter(function(b){return /moveVideo|deleteVideo|uploadVideo/.test(b.getAttribute('onclick')||'')});
  return JSON.stringify({
    n: btns.length,
    sample: btns.slice(0,6).map(function(b){return (b.getAttribute('onclick')||'')}),
    视频条数: document.querySelectorAll('#admin-panel [data-v-dur]').length,
    有上传按钮: !!document.querySelector('#admin-panel button[onclick*="uploadVideo"]')
  });
})()`));
line('列表按钮总数', ui.n);
line('视频条数（时长输入框数）', ui.视频条数);
line('有「选择 MP4 文件」按钮', ui.有上传按钮);
ui.sample.forEach((s, i) => line('按钮' + i, s));
ok('按钮都绑定了正确的 onclick', ui.n + ' 个', ui.n > 0 && ui.sample.every(s => s));

console.log('\n════ ③ 真点：上移 / 下移（比较队列顺序）════');
const before = JSON.parse(await evalJs(c, `(function(){
  data.wallpaper=data.wallpaper||{};
  data.wallpaper.videos=data.wallpaper.videos||[];
  return JSON.stringify(data.wallpaper.videos.map(function(v){return wpFileName(v.src)}).slice(0,4));
})()`));
line('原始前 4 个', JSON.stringify(before));

await evalJs(c, 'moveVideo(1,-1), 1');   // 第2个上移
await sleep(1200);
const afterUp = JSON.parse(await evalJs(c, 'JSON.stringify(data.wallpaper.videos.map(function(v){return wpFileName(v.src)}).slice(0,4))'));
line('第2个上移后', JSON.stringify(afterUp));
ok('上移生效', JSON.stringify(afterUp), afterUp[0] === before[1] && afterUp[1] === before[0]);

await evalJs(c, 'moveVideo(0,1), 1');    // 再下移回去
await sleep(1200);
const afterDown = JSON.parse(await evalJs(c, 'JSON.stringify(data.wallpaper.videos.map(function(v){return wpFileName(v.src)}).slice(0,4))'));
line('再下移后', JSON.stringify(afterDown));
ok('下移生效（换回来了）', JSON.stringify(afterDown), JSON.stringify(afterDown) === JSON.stringify(before));

console.log('\n════ ④ 真点：删除（自动确认）════');
const nBefore = Number(await evalJs(c, 'data.wallpaper.videos.length'));
await evalJs(c, 'window.__confirm=window.confirm; window.confirm=function(){return true}; 1');
await evalJs(c, 'deleteVideo(0), 1');
await sleep(1500);
const nAfter = Number(await evalJs(c, 'data.wallpaper.videos.length'));
line('删除前条数', nBefore);
line('删除后条数', nAfter);
ok('删除生效（少一条）', nBefore + ' → ' + nAfter, nAfter === nBefore - 1);

console.log('\n════ ⑤ 恢复原数据（不污染云端）════');
await evalJs(c, `(function(){
  window.confirm=window.__confirm;
  data.wallpaper.videos=[
    {src:'https://img.231060101.xyz/file/背景/1793280395608_世界很温柔—《龙族》上杉绘梨衣.webm',duration:20},
    {src:'https://img.231060101.xyz/file/背景/1793280391212_雷姆.webm',duration:20}
  ];
  return 1;
})()`);
line('（本地已改回测试前状态，未保存到云端）', 'ok');

console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
await closeTab(t.id);
