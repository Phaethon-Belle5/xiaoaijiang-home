// 往 site:changelog 里加一条「次元柜上线」记录（插到最前面）
import { readFile, writeFile } from 'node:fs/promises';
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BASE = 'https://api.cloudflare.com/client/v4';
const KV = '14330ec39ac64891be778253e78e1cf7';
const KEY = 'site:changelog';
let TOK = (await readFile('B:/dell/Documents/harness/.cf_token', 'utf8').catch(() => '')).trim();
if (!TOK) { const c = await readFile('C:/Users/dell/.wrangler/config/default.toml', 'utf8'); TOK = (c.match(/oauth_token\s*=\s*"([^"]*)"/) || [])[1] || ''; }
const H = { Authorization: 'Bearer ' + TOK, 'Content-Type': 'application/json' };

const NEW = {
  date: '2026-10-02', tag: '功能', title: '「次元柜」上线：书籍 / 影视 / 游戏',
  text: [
    '导航栏新增「次元柜」，分成书籍、影视、游戏三类',
    '每一类可以自己再分子类（比如游戏分单机 / 手游 / 独立），点一下标签就能筛',
    '每条都能写评分（支持半星）、一句话评价，还有要点开才看的感悟，都可以配图',
    '游戏在前台用小图标显示，比书籍影视的封面紧凑，一屏能看更多',
    '后台「内容」组新增「次元柜」面板，增删改和子分类管理都在里面',
  ].join('\n'),
};

const cur = await (await fetch(`${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(KEY)}`, { headers: H })).text();
let list = [];
try { list = JSON.parse(cur); } catch (e) {}
if (!Array.isArray(list)) list = [];
if (cur) await writeFile('B:/dell/Documents/harness/kv-changelog-backup2.json', cur);

list = list.filter(x => x && x.title !== NEW.title);   // 幂等：重复跑不会堆叠
list.unshift(NEW);

const put = await fetch(`${BASE}/accounts/${ACCT}/storage/kv/namespaces/${KV}/values/${encodeURIComponent(KEY)}`, { method: 'PUT', headers: H, body: JSON.stringify(list) });
console.log('写入: HTTP ' + put.status);
console.log('现在共 ' + list.length + ' 条，最新一条: ' + list[0].date + ' [' + list[0].tag + '] ' + list[0].title);

await new Promise(s => setTimeout(s, 4000));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const d = await (await fetch('https://home.xiaoaijiang.cloud/api/data?cb=' + Math.random(), { headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache' } })).json();
console.log('\n回读 /api/data:');
console.log('  changelog 条数 = ' + (d.changelog || []).length);
console.log('  最新一条 = ' + ((d.changelog || [])[0] || {}).title);
console.log('  dimension 键 = ' + (d.dimension ? ('有（' + (d.dimension.items || []).length + ' 条记录，子分类 ' + JSON.stringify(Object.keys(d.dimension.subs || {})) + '）') : '❌ 没有'));
