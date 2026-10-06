/**
 * 验证本次两项改动：
 *  A) 个人精选改成说说那套自由标签（标签栏筛选 + 卡片标签 + 兼容旧 group）
 *  B) 控制面板新增内容后自动滚动/聚焦/高亮
 */
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 120)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?pf=' + Date.now() });
await sleep(21000);
const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + String(v).slice(0, 120));
const chk = [];
const ok = (n, v, cond) => { chk.push(cond); console.log('  ' + (cond ? '✅' : '❌') + ' ' + n.padEnd(30) + ' = ' + v); };

console.log('════ A. 个人精选的标签分类 ════');
// 注入混合数据：有的用新 tags、有的用旧 group、有的多个标签
await evalJs(c, `(function(){
  data.portfolio=[
    {image:'',title:'我的项目甲',url:'',tags:'我的项目, 工具',desc:'第一个'},
    {image:'',title:'工具乙',url:'',tags:'工具',desc:''},
    {image:'',title:'朋友的丙',url:'',tags:'朋友的作品',desc:''},
    {image:'',title:'老数据丁',url:'',group:'整活',desc:'只有旧 group 字段'},
    {image:'',title:'没分类的戊',url:'',desc:''}
  ];
  applyAll();
  return 1;
})()`);
await sleep(1200);

ok('pfTags 是新函数', await evalJs(c, 'typeof pfTags'), 'function' === await evalJs(c, 'typeof pfTags'));
line('旧的 groupPortfolio 已移除', await evalJs(c, 'typeof groupPortfolio'));
line('解析出的标签（第1条）', await evalJs(c, 'JSON.stringify(pfTags(data.portfolio[0]))'));
line('解析旧 group（第4条）', await evalJs(c, 'JSON.stringify(pfTags(data.portfolio[3]))'));
line('标签统计', await evalJs(c, 'JSON.stringify(allPfTags())'));
line('标签栏按钮', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#portfolio-tagbar .pf-tag")).map(function(b){return b.textContent}))'));
line('计数文字', await evalJs(c, '(document.getElementById("portfolio-count")||{}).textContent'));
line('卡片上的标签 chip 总数', await evalJs(c, 'document.querySelectorAll("#portfolio-all .pf-tagchip").length'));
line('第1张卡的标签', await evalJs(c, '(function(){var el=document.querySelector("#portfolio-all .portfolio-item");return JSON.stringify([].slice.call(el.querySelectorAll(".pf-tagchip")).map(function(x){return x.textContent}))})()'));
line('卡片的 data-tags', await evalJs(c, 'document.querySelector("#portfolio-all .portfolio-item").dataset.tags'));

console.log('\n  --- 点标签栏「工具」筛选 ---');
await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll('#portfolio-tagbar .pf-tag')).find(function(x){return x.dataset.tag==='工具'});if(b)b.click();return !!b})()`);
await sleep(800);
line('pfFilter', await evalJs(c, 'pfFilter'));
line('可见卡片', await evalJs(c, '[].slice.call(document.querySelectorAll("#portfolio-all .portfolio-item")).filter(function(e){return !e.hidden}).map(function(e){return e.querySelector(".portfolio-title").textContent}).join(", ")'));
line('计数', await evalJs(c, '(document.getElementById("portfolio-count")||{}).textContent'));
line('选中态', await evalJs(c, 'JSON.stringify([].slice.call(document.querySelectorAll("#portfolio-tagbar .pf-tag")).map(function(b){return b.textContent+(b.classList.contains("on")?"*":"")}))'));

console.log('\n  --- 再点一次取消筛选 ---');
await evalJs(c, `(function(){var b=[].slice.call(document.querySelectorAll('#portfolio-tagbar .pf-tag')).find(function(x){return x.dataset.tag==='工具'});if(b)b.click();return 1})()`);
await sleep(700);
const visibleAfterReset = await evalJs(c, `(function(){
  var a=[].slice.call(document.querySelectorAll('#portfolio-all .portfolio-item'));
  return a.filter(function(e){return !e.hidden}).length + ' / ' + a.length;
})()`);
ok('取消后全部可见', visibleAfterReset, /^(\d+) \/ \1$/.test(visibleAfterReset));

console.log('\n  --- 点卡片上的标签 chip ---');
await evalJs(c, '(function(){var x=document.querySelector("#portfolio-all .pf-tagchip");if(x)x.click();return 1})()');
await sleep(700);
line('点了 chip 后 pfFilter', await evalJs(c, 'pfFilter'));
ok('卡片标签也能触发筛选', await evalJs(c, 'pfFilter'), (await evalJs(c, 'pfFilter')) !== '');
await evalJs(c, 'setPfFilter(""), 1');
await sleep(500);

console.log('\n════ B. 控制面板新增后的自动定位 ════');
ok('focusNew 存在', await evalJs(c, 'typeof ADMIN.focusNew'), 'function' === await evalJs(c, 'typeof ADMIN.focusNew'));
line('.admin-flash 样式', await evalJs(c, `(function(){for(var i=0;i<document.styleSheets.length;i++){try{var rs=document.styleSheets[i].cssRules;for(var j=0;j<rs.length;j++){if(rs[j].selectorText===".admin-flash")return "有："+rs[j].style.animation.slice(0,30);if(rs[j].name==="adminFlash")return "关键帧 adminFlash 存在"}}catch(e){}}return "❌ 没有"})()`));
line('测试用：打开面板', await evalJs(c, 'try{ADMIN.shell();ADMIN.go("works");"ok"}catch(e){"❌ "+e.message}'));
await sleep(2000);
line('作品区输入框数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-p-field=title]").length'));
line('标签输入框（应为 tags）', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-p-field=tags]").length'));
line('还有 group 输入框吗', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-p-field=group]").length + " 个（应为 0）"'));
line('标签建议列表', await evalJs(c, '(function(){var d=document.getElementById("pf-tag-list");return d?d.options.length+" 个候选":"无"})()'));

console.log('\n  --- 点「添加作品」看是否自动滚过去并高亮 ---');
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll("#admin-panel button")).find(function(x){return x.textContent.indexOf("添加作品")>=0});if(b)b.click();return !!b})()');
await sleep(600);   // 高亮只持续 2.2 秒，这里要早点看
line('高亮类是否加上', await evalJs(c, '(function(){return document.querySelectorAll("#admin-panel .admin-flash").length+" 个"})()'));
line('焦点在哪个元素', await evalJs(c, '(function(){var a=document.activeElement;if(!a)return "无";return a.tagName+(a.dataset&&a.dataset.pField?("["+a.dataset.pField+"]"):"")+" 值=\\""+(a.value||"").slice(0,16)+"\\""})()'));
line('焦点所在卡片是第几张', await evalJs(c, `(function(){
  var a=document.activeElement; var card=a&&a.closest?a.closest('.admin-card'):null;
  if(!card)return '不在卡片里';
  var cards=[].slice.call(document.querySelectorAll('#admin-panel .admin-card'));
  return '第 '+(cards.indexOf(card)+1)+' / '+cards.length+' 张';
})()`));
await sleep(1800);
line('新条目条数', await evalJs(c, '(data.portfolio||[]).length'));
line('新条目的字段', await evalJs(c, 'JSON.stringify(Object.keys(data.portfolio[data.portfolio.length-1]))'));

await screenshot(c, 'B:/dell/Documents/harness/shots/admin-focus-new.png');
console.log('  截图: shots/admin-focus-new.png');

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
console.log('\n结果: ' + chk.filter(Boolean).length + '/' + chk.length + ' 通过');
ws2.close();
await closeTab(t.id);
