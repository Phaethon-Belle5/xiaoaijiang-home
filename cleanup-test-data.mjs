/**
 * 清理测试数据：
 *  ① 删掉我用 URL 加进「朔州市」的那张测试照片
 *  ② 把「内蒙古自治区」的封面恢复成原来的武功山那张
 */
import { readFile } from 'node:fs/promises';

const API = 'https://mapi.231060101.xyz';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const ORIGINAL_COVER = 'https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';
const TEST_URL = 'https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/600/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';

let PW = '';
for (const p of ['C:/Users/dell/Desktop/web/_repo/map-gallery-worker/.site_password',
                 'C:/Users/dell/Desktop/web/03-后端Worker/主站-worker/.site_password']) {
  try { PW = (await readFile(p, 'utf8')).trim(); if (PW) break; } catch (e) {}
}

// 登录
const lr = await fetch(API + '/login', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PW }) });
const lj = await lr.json();
const TK = lj.token || '';
console.log('登录: HTTP ' + lr.status + (TK ? '  已拿到 token' : '  ❌ 没 token'));
const H = { 'User-Agent': UA, 'Content-Type': 'application/json', Authorization: 'Bearer ' + TK };

// ① 找并删测试照片
console.log('\n=== ① 清理测试照片 ===');
const pr = await fetch(API + '/photos?cb=' + Math.random(), { headers: { 'User-Agent': UA } });
const photos = await pr.json();
const target = (photos || []).filter(p => p && p.url === TEST_URL && p.cityKey === '朔州市');
console.log('  匹配到的测试照片: ' + target.length + ' 张  ' + JSON.stringify(target.map(p => ({ id: p.id, city: p.cityKey }))));
for (const p of target) {
  const dr = await fetch(API + '/photo/' + p.id, { method: 'DELETE', headers: H });
  console.log('  删除 id=' + p.id + '  HTTP ' + dr.status + '  ' + (await dr.text()).slice(0, 60));
}

// ② 恢复省份封面
console.log('\n=== ② 恢复内蒙古自治区封面 ===');
const cr = await fetch(API + '/province-cover', { method: 'POST', headers: H, body: JSON.stringify({ province: '内蒙古自治区', url: ORIGINAL_COVER }) });
console.log('  HTTP ' + cr.status + '  ' + (await cr.text()).slice(0, 120));

// 复核
console.log('\n=== 复核 ===');
const p2 = await (await fetch(API + '/photos?cb=' + Math.random(), { headers: { 'User-Agent': UA } })).json();
console.log('  照片总数: ' + (p2 || []).length + ((p2 || []).some(p => p && p.url === TEST_URL) ? '  ⚠ 测试照片还在' : '  ✅ 测试照片已清除'));
const c2 = await (await fetch(API + '/province-covers?cb=' + Math.random(), { headers: { 'User-Agent': UA } })).json();
console.log('  省份封面: ' + JSON.stringify(c2).slice(0, 260));
console.log('  内蒙古是否已恢复: ' + (c2['内蒙古自治区'] === ORIGINAL_COVER ? '✅ 是' : '⚠ 值不同'));
