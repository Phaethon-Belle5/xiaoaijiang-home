/**
 * 真正验证：点分类标签后，卡片墙上"实际可见"的卡片是不是只剩该标签的
 * 之前只测了 memoFilter 变量变化，没测可见性 —— 这就是漏掉的地方
 */
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Emulation.setDeviceMetricsOverride', { width: 1528, height: 746, deviceScaleFactor: 1, mobile: false });
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/#/memos?filt=' + Date.now() });
await sleep(20000);

const line = (n, v) => console.log('  ' + String(n).padEnd(30) + ' = ' + v);

await evalJs(c, 'navigateTo("memos"); 1');
await sleep(3000);

const countVisible = `(function(){
  var cards=[].slice.call(document.querySelectorAll('#memo-wall .memo-card'));
  var visible=cards.filter(function(e){
    if(e.hidden)return false;
    var s=getComputedStyle(e);
    if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.05)return false;
    var r=e.getBoundingClientRect();
    return r.width>1&&r.height>1;
  });
  return JSON.stringify({
    总数: cards.length,
    可见数: visible.length,
    hidden属性为true的: cards.filter(function(e){return e.hidden}).length,
    display为none的: cards.filter(function(e){return getComputedStyle(e).display==='none'}).length,
    可见卡片的标签: visible.map(function(e){return e.dataset.tags||'(无)'})
  });
})()`;

console.log('════ 未筛选时 ════');
console.log('  ' + await evalJs(c, countVisible));

console.log('\n════ 点「折腾4」标签后（应只剩 4 张）════');
await evalJs(c, '(function(){var b=[].slice.call(document.querySelectorAll("#memo-tagbar .memo-tag")).find(function(x){return /折腾/.test(x.textContent)});if(b)b.click();return 1})()');
await sleep(2000);
line('memoFilter 变量', await evalJs(c, 'memoFilter'));
console.log('  ' + await evalJs(c, countVisible));

console.log('\n════ 卡片 CSS 与 .memo-card 规则 ════');
line('.memo-card display', await evalJs(c, 'getComputedStyle(document.querySelector(".memo-card")).display'));
line('hidden 属性是否生效', await evalJs(c, `(function(){
  var e=document.querySelector('.memo-card');
  e.hidden=true;
  var after=getComputedStyle(e).display;
  e.hidden=false;
  return '设 hidden=true 后 computed display = ' + after + (after==='none'?'  (生效)':'  ← 没有生效！CSS 覆盖了 hidden');
})()`));
line('.memo-card 的 CSS 规则里有没有 display', await evalJs(c, `(function(){
  var out=[];
  for(var i=0;i<document.styleSheets.length;i++){
    var ss=document.styleSheets[i];
    try{ var rules=ss.cssRules; }catch(e){ continue }
    for(var j=0;j<rules.length;j++){
      var r=rules[j];
      if(r.selectorText && /\\.memo-card\\b/.test(r.selectorText) && r.style && r.style.display)
        out.push(r.selectorText+' { display:'+r.style.display+' }');
    }
  }
  return out.join(' | ') || '(没有显式 display 规则)';
})()`));
line('有没有 [hidden] 的覆盖规则', await evalJs(c, `(function(){
  var out=[];
  for(var i=0;i<document.styleSheets.length;i++){
    var ss=document.styleSheets[i];
    try{ var rules=ss.cssRules; }catch(e){ continue }
    for(var j=0;j<rules.length;j++){
      var r=rules[j];
      if(r.selectorText && /\\[hidden\\]/.test(r.selectorText)) out.push(r.selectorText+' { '+r.style.cssText.slice(0,60)+' }');
    }
  }
  return out.join(' | ') || '(没有 [hidden] 规则)';
})()`));

await closeTab(t.id);
