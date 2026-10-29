// 检查线上文件里到底有没有那三个函数，以及它们在哪个位置
const r = await fetch('https://home.xiaoaijiang.cloud/?chk=' + Date.now(), {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/154.0' },
  signal: AbortSignal.timeout(40000),
});
const t = await r.text();
console.log('  HTTP ' + r.status + '   长度 ' + t.length);

const keys = ['function moveVideo', 'function deleteVideo', 'function uploadVideo',
  'function wpFileName', 'function wpCommit', 'onclick="moveVideo', 'onclick="deleteVideo', 'onclick="uploadVideo'];
for (const k of keys) console.log('  ' + (t.indexOf(k) >= 0 ? '✅' : '❌') + ' ' + k);

// 找 moveVideo 出现的位置，并看它前面最近的 <script 和 function 包裹
const idx = t.indexOf('function moveVideo');
if (idx >= 0) {
  const before = t.slice(0, idx);
  const lastScript = before.lastIndexOf('<script');
  const seg = t.slice(lastScript, idx);
  console.log('\n  moveVideo 前面最近的 <script 标签内容：');
  console.log('    ' + seg.slice(0, 120).replace(/\s+/g, ' '));
  // 数一数从那以后有多少没闭合的 { —— 粗略判断是否被包在函数里
  const open = (seg.match(/\{/g) || []).length;
  const close = (seg.match(/\}/g) || []).length;
  console.log('    从 <script 到 moveVideo 之间：{ 出现 ' + open + ' 次，} 出现 ' + close + ' 次' + ((open - close) > 0 ? '  ⚠ 说明它可能被包在某个块里（不是全局）' : '  （看起来是顶层）'));
} else {
  console.log('\n  ❌ 线上文件里没有 function moveVideo —— 部署没生效或有缓存');
}

// 顺便看线上文件的构建标记
const m = t.match(/const BUILD='([^']*)'/);
console.log('\n  构建标记 = ' + (m ? m[1] : '未找到'));
