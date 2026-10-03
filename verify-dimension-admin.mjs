// 单验次元柜的后台面板
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
const ws2 = new WebSocket(t.ws);
await new Promise(r => ws2.addEventListener('open', r));
const exceptions = [];
ws2.addEventListener('message', (ev) => {
  try { const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push('行' + d.lineNumber + ' ' + String(d.exception && d.exception.description || d.text).split('\n')[0].slice(0, 110)); }
  } catch (e) {}
});
ws2.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
ws2.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?adm=' + Date.now() });
await sleep(19000);

const line = (n, v) => console.log('  ' + String(n).padEnd(26) + ' = ' + v);

// 注入两条测试数据（只在内存里）
await evalJs(c, `(function(){
  data.dimension={subs:{books:['小说','技术'],films:['电影'],games:['单机']},items:[
    {id:'a1',kind:'books',sub:'小说',title:'后台测试书',creator:'作者甲',rating:4,review:'评价文字',thought:'感悟一\\n感悟二',cover:'',date:'2026-01-01',link:''},
    {id:'a2',kind:'games',sub:'单机',title:'后台测试游戏',creator:'工作室',rating:3.5,review:'',thought:'',cover:'',date:'2026-02-02',link:''}
  ]};
  return 1;
})()`);

line('导航含 dimension', await evalJs(c, 'ADMIN_SECTIONS.some(function(s){return s.id==="dimension"}) ? "是" : "否"'));
line('分组', await evalJs(c, '(ADMIN_SECTIONS.find(function(s){return s.id==="dimension"})||{}).group || "-"'));
line('有说明文案', await evalJs(c, 'typeof ADMIN_DESC.dimension==="string" && ADMIN_DESC.dimension.length>10 ? "有" : "无"'));
line('主渲染', await evalJs(c, '(function(){try{return "正常 "+ADMIN_RENDER.dimension().length+" 字符"}catch(e){return "❌ 抛错 "+e.message}})()'));
line('预览', await evalJs(c, '(function(){try{return "正常 "+ADMIN_PREVIEW.dimension().length+" 字符"}catch(e){return "❌ 抛错 "+e.message}})()'));
line('可编辑字段数', await evalJs(c, '(function(){try{return (ADMIN_RENDER.dimension().match(/data-d-idx=/g)||[]).length+" 个"}catch(e){return "err"}})()'));
line('类型下拉', await evalJs(c, '(function(){return document.querySelectorAll("#admin-panel [data-d-field=kind]").length + " 个（渲染进面板后）"})()'));
line('子分类管理按钮', await evalJs(c, '(function(){try{var h=ADMIN_RENDER.dimension();return (h.match(/addDimSub/g)||[]).length+" 处"}catch(e){return "err"}})()'));

console.log('\n--- 实际在面板里打开该分区 ---');
await evalJs(c, 'ADMIN.shell(); ADMIN.go("dimension"); 1');
await sleep(2500);
line('当前分区', await evalJs(c, 'ADMIN.active'));
line('分区是否激活', await evalJs(c, '(function(){var p=document.querySelector(\'.tab-page[data-apage="dimension"]\');return p&&p.classList.contains("active")?"是":"否"})()'));
line('面板标题', await evalJs(c, '(function(){var e=document.querySelector("#admin-panel .admin-group label, #admin-panel label");return e?e.textContent.slice(0,60):"无"})()'));
line('类型下拉数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=kind]").length'));
line('子分类下拉数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=sub]").length'));
line('评分输入数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=rating]").length'));
line('标题输入数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=title]").length'));
line('封面输入数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=cover]").length'));
line('评价框数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=review]").length'));
line('感悟框数', await evalJs(c, 'document.querySelectorAll("#admin-panel [data-d-field=thought]").length'));
line('收集：改标题后写回', await evalJs(c, `(function(){
  var el=document.querySelector('#admin-panel [data-d-field=title]');
  if(!el)return "没有标题输入框";
  el.value='被改过的标题';
  ADMIN.readAll();
  return '内存里的标题='+(data.dimension.items[0].title||'(空)');
})()`));

console.log('\n--- 添加一条 / 删一条 ---');
line('添加前条数', await evalJs(c, 'dimKit().items.length'));
line('调用 addDimItem', await evalJs(c, '(function(){try{ window.__origConfirm=window.confirm; window.confirm=function(){return true}; addDimItem(); return "已调用，条数="+dimKit().items.length }catch(e){return "❌ "+e.message}})()'));
await sleep(1200);
line('删除第一条', await evalJs(c, '(function(){try{ removeDimItem(0); return "已调用，条数="+dimKit().items.length }catch(e){return "❌ "+e.message}})()'));
await sleep(1200);
line('添加子分类', await evalJs(c, '(function(){try{ window.prompt=function(){return "新子分类"}; addDimSub("books"); return JSON.stringify(dimKit().subs.books) }catch(e){return "❌ "+e.message}})()'));
await sleep(1200);
line('删除子分类', await evalJs(c, '(function(){try{ removeDimSub("books",0); return JSON.stringify(dimKit().subs.books) }catch(e){return "❌ "+e.message}})()'));

console.log('\n════ 异常 ════');
console.log(exceptions.length ? exceptions.slice(0, 6).map(e => '  ' + e).join('\n') : '  （无）');
ws2.close();
await closeTab(t.id);
