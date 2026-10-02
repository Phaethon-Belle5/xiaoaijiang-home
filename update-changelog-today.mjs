/**
 * 更新「更新日志」内容：补上今天（2026-10-02）真正做的事
 */
import { readFile, writeFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
const KV = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:changelog';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
if (!TOK) { const c = await readFile('C:/Users/dell/.config/.wrangler/config/default.toml', 'utf8').catch(() => ''); TOK = (c.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
if (!TOK) { const c = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8'); TOK = (c.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
const H = { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };

const LOG = [
  {
    date: '2026-10-02', tag: '修复', title: '「说说」点分类标签没反应 —— 找到真凶了',
    text: '点标签后卡片一张都不消失，看着就像这功能没做\n真正的原因：浏览器默认的 [hidden]{display:none} 优先级极低，被 .memo-card{display:flex} 直接覆盖 —— 代码把 hidden 设成 true 了，元素照样显示\n现在加了一条 [hidden]{display:none!important} 兜底，全站 4 处同类问题一起修好：点标签筛选、切到归档时隐藏卡片墙、归档区、分组切换器\n现在点「折腾4」就只剩 4 条折腾，点「全部」恢复',
  },
  {
    date: '2026-10-02', tag: '修复', title: '内容不再被入场动画藏住',
    text: '页面内容默认是透明的（opacity:0），靠滚动到位置才淡入\n问题在于「音乐 + 更新日志 + 热点」那一整块正好卡在首屏外，不往下滚就永远是透明的 —— 看着就像"什么都没更新"\n现在入场后 2.2 秒无条件显示，动画照常，但再也不会藏住内容',
  },
  {
    date: '2026-10-02', tag: '功能', title: '「说说」归档支持按标签分类',
    text: '归档里多了「按时间 / 按标签」两个切换\n按标签：一个标签一块，条数多的排前面，没打标签的进「未分类」\n顶部标签栏也和它联动，选中哪个标签就只剩哪一类',
  },
  {
    date: '2026-10-02', tag: '功能', title: '首页新增「更新日志」卡片',
    text: '位置在音乐播放器和全网热点中间，默认全部收起、点条目展开看细节\n后台「内容」组新增「更新日志」面板，每次大改动记一条就行',
  },
  {
    date: '2026-10-02', tag: '修复', title: '主页地图终于点亮了 18 座城市',
    text: '之前主页映像馆地图一个城市都不亮，66 张照片全被塞进折叠的「未标注地点」\n原因是照片缺少城市归属，而地图正是靠这个点亮城市的 —— 数据在库里本来是齐的，在服务端补上关联就恢复了\n顺便给照片详情加上了「日期 · 地点 · 标题」',
  },
  {
    date: '2026-10-02', tag: '优化', title: '地图加载从 10.7 秒降到 1.1 秒',
    text: '省界数据原本 3.77 MB，实测要加载 9~10 秒，是全站最慢的一环\n去掉本就用不到的直辖市、属性只留实际用到的字段、坐标保留 3 位小数、按 0.005° 抽稀\n传输量 822 KB → 337 KB，解析体积 4.3 MB → 2.0 MB\n用 A/B 逐像素比对过：98.07% 的像素完全相同，形变上界 555 米',
  },
  {
    date: '2026-10-02', tag: '功能', title: '分享链接有预览卡了',
    text: '以前把网址发到微信/QQ 只有一行干文字\n现在两个站都补上了 og:image 与 twitter:card，封面用站点头像做成圆形（金色描边＋光晕）\n映像馆整页是 canvas 画的、HTML 里一个图片标签都没有，所以必须显式给图才有效果',
  },
  {
    date: '2026-10-02', tag: '优化', title: '音乐播放器改用 R2 目录自动生成',
    text: '以前靠一份人工维护的 87 条直链，其中 61 条早就失效了，只是平时被主路径挡着没暴露\n改成读取 R2 的 Music/ 目录实时生成，接口失败会自动重试 3 次\n以后往 R2 传歌就自动进列表，不用再手工填直链',
  },
  {
    date: '2026-10-02', tag: '修复', title: '「已爬的山」现在能点进映像馆',
    text: '模块里的山名做成了真链接，点了在新标签打开映像馆对应城市的照片页\n华山→渭南 恒山→大同 衡山→衡阳 泰山→泰安 南宫山→安康 岳麓山→长沙 武功山→萍乡\n映像馆同时支持了 ?city= 深链，可以直接分享某座城市的页面',
  },
  {
    date: '2026-10-02', tag: '设计', title: '映像馆开屏回到最初的样子',
    text: '开屏恢复为最初那个自绘的粒子地球（深蓝地球＋金色中国点＋可拖拽旋转）\n写实 3D 地球降级为「可选增强」：设备跑得动才淡入，跑不动就保持简略版',
  },
  {
    date: '2026-09-30', tag: '优化', title: '图床与 R2 清理',
    text: '图床删掉 36 个多余文件（去重副本、派生图、测试残留），236 → 200\nR2 删掉 68 个站点已不再使用的副本，318 → 250 个对象、少了 83.5 MB\n清理过程中发现头像被误删，已修复并全量复查过所有媒体引用',
  },
];

const cur = await (await fetch(`${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(KEY)}`, { headers: H })).text().catch(() => '');
if (cur && cur !== 'null') await writeFile('B:/dell/Documents/harness/kv-changelog-backup2.json', cur);

const put = await fetch(`${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(KEY)}`, { method: 'PUT', headers: H, body: JSON.stringify(LOG) });
const pj = await put.json().catch(() => ({}));
console.log('写入 site:changelog: HTTP ' + put.status + '  success=' + pj.success);
console.log('  共 ' + LOG.length + ' 条，今天是 ' + new Date().toISOString().slice(0, 10));
LOG.slice(0, 4).forEach(l => console.log('   ' + l.date + ' [' + l.tag + '] ' + l.title));
