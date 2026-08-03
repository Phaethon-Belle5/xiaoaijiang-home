const fs = require("fs");
const path = "C:/Users/dell/projects/xiaoaijiang-home/index.html";
let c = fs.readFileSync(path, "utf8");

// Find the portfolio section
const marker = "<!-- Portfolio Gallery -->";
const idx = c.indexOf(marker);
if(idx < 0) { console.log("NOT FOUND"); process.exit(1); }

const gridIdx = c.indexOf('<div class="portfolio-grid">', idx);
const sectionHeaderStart = c.lastIndexOf('<div class="section-header', gridIdx);

const oldBlock = c.substring(sectionHeaderStart, gridIdx);

const newBlock =
  '<div class="section-header reveal" style="margin-top:var(--space-16)">\n' +
  '	        <p class="header-eyebrow">${escHtml(c.galleryEyebrow||' + "'" + 'Gallery' + "'" + ')}</p>\n' +
  '	        <h2 class="header-headline" style="font-size:clamp(2rem,4vw,3rem);font-weight:600;letter-spacing:-0.02em">${escHtml(c.galleryHeadline||' + "'" + '个人作品' + "'" + ')}</h2>\n' +
  '	        <p class="header-desc" style="max-width:65ch;margin-bottom:0">精选项目与作品集</p>\n' +
  '	      </div>\n' +
  '	      <div class="portfolio-nav" id="portfolio-nav">\n' +
  '	        <span class="portfolio-nav-item on" data-filter="all">全部</span>\n' +
  '	        ${(data.portfolio||[]).map(function(p,i){return ' + "'" + '<span class=\\\"portfolio-nav-item\\\" data-filter=\\\"'+i+'\\\">'+escHtml(p.title)+'</span>' + "'" + ';}).join(' + "''" + ')}\n' +
  '	      </div>\n' +
  '	      <div class="section-divider"></div>\n' +
  '	      ';

c = c.replace(oldBlock, newBlock);
fs.writeFileSync(path, c, "utf8");
console.log("Portfolio nav + title added");
