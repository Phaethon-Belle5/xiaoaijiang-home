// 删除后复查：R2 只剩 Music/，站点背景仍用图床视频且在播
import { openTab, connect, closeTab, sleep, evalJs, screenshot } from './cdp-client.mjs';
import { readFileSync } from 'node:fs';

const TOKEN = readFileSync('.cf_token', 'utf8').trim();
const ACCT = 'd3ad5d9538bd7cc5f7edbd31b1a3ef4e';
const BUCKET = 'home1xiaoaijiangcloud';
const H = { Authorization: 'Bearer ' + TOKEN };

console.log('════ ① R2 桶复查 ════');
const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCT}/r2/buckets/${BUCKET}/objects?per_page=1000`, { headers: H, signal: AbortSignal.timeout(40000) });
const j = await r.json();
const keys = (j.result || []).map(o => o.key);
const mp4 = keys.filter(k => k.startsWith('MP4/'));
const music = keys.filter(k => k.startsWith('Music/'));
console.log('  对象总数        = ' + keys.length);
console.log('  MP4/ 剩余       = ' + mp4.length + (mp4.length ? ' ❌ ' + JSON.stringify(mp4) : ' ✅ 已清空'));
console.log('  Music/ 保留     = ' + music.length + ' 个 ' + (music.length ? '✅' : '❌ 被误删'));
console.log('  其他            = ' + keys.filter(k => !k.startsWith('MP4/') && !k.startsWith('Music/')).length + ' 个');

const t = await openTab('about:blank');
const c = await connect(t.ws);
await c.send('Network.enable');
await c.send('Network.setCacheDisabled', { cacheDisabled: true });
await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'https://home.xiaoaijiang.cloud/?after=' + Date.now() });
await sleep(20000);

console.log('\n════ ② 站点背景 ════');
const q = async (n, e) => { const v = await evalJs(c, e); console.log('  ' + n.padEnd(24) + ' = ' + String(v).slice(0, 110)); return v; };
await q('video-catalog 返回的条数', `fetch(API_URL+'/video-catalog?x='+Date.now()).then(r=>r.json()).then(j=>(j.wallpapers||[]).length)`);
await q('videoQueue 长度', 'typeof videoQueue!=="undefined"?videoQueue.length:"无"');
await q('队列全来自图床', 'videoQueue.every(function(v){return String(v.src).indexOf("img.231060101.xyz")>=0})?"是":"否"');
await q('每个时长', 'videoQueue[0].duration');
await q('当前在播', `(function(){var v=document.querySelector('#wp-stage video');if(!v)return '无';var n='';try{n=decodeURIComponent(String(v.currentSrc||v.src).split('/背景/')[1]||'')}catch(e){}return (v.paused?'暂停':'播放中')+' '+Math.round(v.currentTime*10)/10+'s '+n.slice(0,36)})()`);
await screenshot(c, 'B:/dell/Documents/harness/shots/bg-after-r2delete.png');

console.log('\n════ ③ 等 22 秒看是否还在随机切 ════');
const i1 = await evalJs(c, 'videoIdx');
await sleep(22000);
const i2 = await evalJs(c, 'videoIdx');
console.log('  videoIdx ' + i1 + ' → ' + i2 + '  ' + (i1 !== i2 ? '✅ 仍在切换' : '❌ 没切'));
await closeTab(t.id);
