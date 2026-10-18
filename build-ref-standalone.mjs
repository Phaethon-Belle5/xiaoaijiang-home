// 把参考项目的书架 CSS（含关键帧）整段抽出来，做一个能直接打开看的对照页
import { readFile, writeFile } from 'node:fs/promises';

const html = await readFile('B:/dell/Documents/harness/ref-your-china-travel/index.html', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

// 抓出所有 .memory- 开头的规则 + 相关关键帧
// 整段照搬：按规则抽取会切坏 @media 里的嵌套规则，这里直接用参考项目全部的 <style>
const css = styles;
console.log('照搬参考项目全部内联 CSS：' + Math.round(css.length / 1024) + ' KB');

// 一本书的 DOM（按参考项目的类名与层级）
const book = (prov, cover, cls) => `
<button class="memory-book ${cls||''}" style="--book-cover:${cover};--book-edge:#efe7d6;--book-ink:#f4f8fb;--book-accent:#75c7e9">
  <span class="memory-book-object">
    <span class="memory-book-shadow"></span>
    <span class="memory-book-back"></span>
    <span class="memory-book-spine-face">
      <span class="memory-book-spine-copy"><b>${prov}</b></span>
    </span>
    <span class="memory-book-page-face"></span>
    <span class="memory-book-page-edge"></span>
    <span class="memory-book-edge-top"></span>
    <span class="memory-book-edge-bottom"></span>
    <span class="memory-book-cover">
      <span class="memory-book-index">01</span>
      <span class="memory-book-title">${prov}</span>
      <span class="memory-book-photo" style="background-image:url('${cover}')"></span>
      <span class="memory-book-meta"><span>3 座城市</span><span>16 张照片</span></span>
    </span>
    <span class="memory-book-cover-inside"></span>
    <span class="memory-book-opening-page">
      <span class="memory-book-opening-page-label"><span>MEMORY</span><span>01</span></span>
      <span class="memory-book-opening-entry"><span>01</span><b>青岛市</b><small>8 张</small></span>
      <span class="memory-book-opening-entry"><span>02</span><b>济南市</b><small>5 张</small></span>
      <span class="memory-book-opening-entry"><span>03</span><b>泰安市</b><small>3 张</small></span>
    </span>
  </span>
</button>`;

const IMG1 = 'https://img.231060101.xyz/file/%E6%98%A0%E5%83%8F%E9%A6%86/webp/20260824%E6%AD%A6%E5%8A%9F%E5%B1%B1%E4%B8%8D%E7%9F%A5%E5%90%8D%E8%A7%82%E6%99%AF%E5%8F%B0.webp';

const page = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>参考项目：记忆书架（原样复刻）</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#e9eef0;font-family:'Microsoft YaHei','PingFang SC',sans-serif;padding:24px}
h1{font-size:15px;color:#3d525c;margin-bottom:6px;font-weight:600}
p.note{font-size:12px;color:#6b7f88;margin-bottom:14px}
.wrap{margin-bottom:28px}
.stage{position:relative;height:620px;border-radius:12px;overflow:hidden;background:#dfe7e9}
.shelf-line{position:absolute;left:6%;right:5%;bottom:76px;height:1px;background:linear-gradient(90deg,transparent,rgba(99,115,118,.2) 10%,rgba(99,115,118,.12) 88%,transparent);box-shadow:0 15px 36px rgba(82,91,89,.18)}
${css}
/* 复刻页自己的摆放：三本书并排站在书脊线上 */
.memory-shelf-viewport{position:relative;width:100%;height:100%;overflow:hidden;perspective:1600px;perspective-origin:48% 46%}
.memory-shelf-track{position:absolute;inset:0;transform-style:preserve-3d}
.stage .memory-book{left:120px}
.stage .memory-book:nth-of-type(2){left:470px}
.stage .memory-book:nth-of-type(3){left:820px}
</style></head>
<body>
<h1>参考项目 Your-China-Travel · 记忆书架（原始 CSS 原样复刻）</h1>
<p class="note">左：静置　中：悬停（--book-lift-z:28px 抽出）　右：opening（封面翻开）</p>

<div class="wrap"><div class="stage" id="stage">
  <div class="memory-shelf-viewport"><div class="memory-shelf-track" id="track">
    ${book('山东省', IMG1, '')}
    ${book('湖南省', IMG1, 'hover-demo')}
    ${book('山西省', IMG1, 'opening')}
  </div></div>
  <div class="shelf-line"></div>
</div></div>

<script>
// 让中间那本处于"悬停"姿态、右边那本处于"正在翻开"姿态
const bs = document.querySelectorAll('.memory-book');
if (bs[1]) { bs[1].style.setProperty('--book-lift-z','28px'); }
if (bs[2]) { bs[2].classList.add('opening'); }
</script>
</body></html>`;

await writeFile('B:/dell/Documents/harness/ref-shelf-standalone.html', page, 'utf8');
console.log('已生成 ref-shelf-standalone.html  (' + Math.round(page.length / 1024) + ' KB)');
