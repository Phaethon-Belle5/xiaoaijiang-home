// 把今天（2026-10-04）做的事写进更新日志：读出现有内容 → 前面插入新条目 → 写回
import './cf-dns-fix.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const KV = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:changelog';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
const H = { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };
const url = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(KEY)}`;

const cur = await (await fetch(url, { headers: H })).json().catch(() => []);
const old = Array.isArray(cur) ? cur.filter(x => x && String(x.date || '') !== '2026-10-04') : [];
console.log('现有条目 ' + (Array.isArray(cur) ? cur.length : 0) + ' 条，其中今天之前 ' + old.length + ' 条（保留不动）');
await writeFile('B:/dell/Documents/harness/kv-changelog-before-today.json', JSON.stringify(cur, null, 2));

const TODAY = [
  {
    date: '2026-10-04', tag: '功能', title: '映像馆新增「记忆区」：把照片变成能翻的记忆',
    text: '地图上方多了一排入口：旅行统计、时间足迹、记忆书架、照片流，点开是弹出层\n旅行统计：照片 66 张 / 到访城市 18 座 / 覆盖省份 8 个 / 估算里程约 11788 公里 / 有记忆的月份 14 个\n时间足迹：按年月排成一条竖向时间轴，点缩略图就能看当月照片\n记忆书架：按省份装订成 18 本以内的册子，点开是能一页页翻的相册\n照片流：WebGL 渲染的光瀑，每座城市一条流动的光线',
  },
  {
    date: '2026-10-04', tag: '功能', title: '照片流改成分层浏览：省份 → 城市 → 照片',
    text: '一开始是 18 座城市各一条线，线条又细又挤、两边还空着\n现在改成三层：先看到 8 个省份的光线铺满整个屏幕，点一条展开该省的城市，再点城市才看照片\n右上角有「返回全部省份」，照片目录里点任意一张能直接定位到它所属的城市',
  },
  {
    date: '2026-10-04', tag: '功能', title: '记忆书架：书封上半是省份名、下半是你选的图',
    text: '书的外观照着参考项目做成纸质书：米白纸纹、左侧书脊、右侧圆角，衬线体的省份名压在封面上\n翻开第一页是书封，第二页是该省去过的城市目录（点城市名直接翻到它那一页）\n之后每座城市：第一页是你写的城市评价，再往后才是照片\n管理后台新增「📚 省份封面」，从该省自己的照片里挑一张当封面',
  },
  {
    date: '2026-10-04', tag: '修复', title: '照片流三连修：横带、过曝、模糊',
    text: '横带：光瀑的线条宽度被着色器写死为"正好等于照片宽度"，我为了加粗改动了它，导致纹理坐标越界、照片在图集里重复取样，画面变成一条条横带\n过曝：自己算线条颜色时漏掉了参考项目的 HSL 归一化（明度要钉在 0.62），浅色照片会得到近白的线，而光瀑是加法混合，整幅画面就发白\n模糊：每张照片在图集里只占 128×128，屏幕上放到约 300px 就糊了，提到 256',
  },
  {
    date: '2026-10-04', tag: '修复', title: '记忆书架只能打开第一本书',
    text: '点开一本、退出后再点第二本就没反应\n原因是翻页库会在容器元素上留下包装状态，destroy 清不干净，同一个元素第二次初始化就失败\n改成每次打开都换一个全新的空容器，连开三本实测正常',
  },
  {
    date: '2026-10-04', tag: '修复', title: '说说的分类标签点了没反应',
    text: '点标签后卡片一张都不消失 —— 浏览器默认的 [hidden]{display:none} 优先级太低，被组件自己的 .memo-card{display:flex} 盖掉了\n加了一条全站兜底 [hidden]{display:none!important}，顺带修好另外三处同类问题（切归档时卡片墙不隐藏、归档区、分组切换器）\n现在点「折腾4」就只剩 4 条，点「全部」恢复',
  },
  {
    date: '2026-10-04', tag: '修复', title: '更新日志卡与说说标题栏在窄屏被隐藏',
    text: '更新日志所在的那一列原本是"预留空位"，CSS 里写着窄屏 display:none，放了内容之后依然生效 —— 手机和窗口不宽的电脑上整列都是隐藏的\n改成只有真的空着才隐藏\n另外说说标签栏以前要点一下「归档」才出现，现在一进页面就渲染',
  },
  {
    date: '2026-10-04', tag: '优化', title: '地图加载从 10.7 秒降到 1.1 秒',
    text: '省界数据原本 3.77 MB，实测要加载 9~10 秒，是全站最慢的一环\n去掉本就用不到的直辖市、属性只留实际用到的字段、坐标保留 3 位小数、按 0.005° 抽稀\n传输量 822 KB → 337 KB，解析体积 4.3 MB → 2.0 MB\n用 A/B 逐像素比对过：98.07% 的像素完全相同，形变上界 555 米',
  },
  {
    date: '2026-10-04', tag: '修复', title: '主页地图终于点亮了 18 座城市',
    text: '之前主页映像馆地图一个城市都不亮，66 张照片全被塞进折叠的「未标注地点」\n原因是照片缺少城市归属，而地图正是靠这个点亮城市的 —— 数据在库里本来是齐的，在服务端补上关联就恢复了\n另外覆盖省份一直显示 0，是因为当年压缩地理数据时删掉了行政区划代码字段，改用标准代码表后正常',
  },
  {
    date: '2026-10-04', tag: '功能', title: '更新日志支持类别检索、时间排序与置顶',
    text: '卡片顶部一排分类标签（带条数），点哪个就只看哪一类\n右侧按钮切换「新→旧 / 旧→新」\n置顶的条目永远排在最前面，带星标；后台每条记录都能勾选置顶',
  },
];

const next = [...TODAY, ...old];
console.log('\n写入 ' + next.length + ' 条（今天 ' + TODAY.length + ' 条 + 保留 ' + old.length + ' 条）');
const put = await fetch(url, { method: 'PUT', headers: H, body: JSON.stringify(next) });
const pj = await put.json().catch(() => ({}));
console.log('  HTTP ' + put.status + '  success=' + pj.success);
next.slice(0, TODAY.length).forEach(x => console.log('   ' + x.date + ' [' + x.tag + '] ' + x.title));
