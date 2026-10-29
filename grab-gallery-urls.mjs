// 从映像馆页面里抓出真实可用的图床地址
import { openTab, connect, closeTab, sleep, evalJs } from './cdp-client.mjs';
const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Page.navigate', { url: 'https://xiaoaijiang.cloud/gallery/?g=' + Date.now() });
await sleep(18000);

const script = [
  '(function(){',
  '  var set={};',
  '  [].slice.call(document.images).forEach(function(im){ if(im.src.indexOf("img.231060101.xyz")>=0) set[im.src]=1; });',
  '  var html=document.documentElement.outerHTML;',
  '  var re=/https:\\/\\/img\\.231060101\\.xyz\\/[^"\\s)]+/g;',
  '  var m=html.match(re)||[];',
  '  m.forEach(function(u){ set[u]=1; });',
  '  return JSON.stringify(Object.keys(set));',
  '})()',
].join('\n');

const urls = JSON.parse(await evalJs(c, script));
console.log('  映像馆里找到 ' + urls.length + ' 个图床地址');
urls.slice(0, 12).forEach((u, i) => console.log('    [' + i + '] ' + u));
await closeTab(t.id);
