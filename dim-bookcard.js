// 书籍：DOM 结构与类名原样搬自映像馆的记忆书架（.memory-book 六面书：
// 封底 / 书页 / 书口 / 上下书口 / 书脊 / 封内 / 封面），样式来自 assets/memory-shelf.css。
// 只改了两处：
//   ① 封面 —— 不要原来那套「标题 + 半幅照片 + 元信息 + 打开旅程」，改成整张照片铺满；
//   ② 点击 —— 不调映像馆的翻书阅读器 openBook，改为弹出次元柜的详情弹窗。
const DIM_BOOK_PALETTE=[['#3d7285','#e9e2cf','#f3ecd7','#8fb9c6'],['#a4523a','#ece5d1','#f6efdb','#c98f76'],
  ['#d5c5a0','#efe9d8','#513d28','#b5a077'],['#67754a','#eae3ce','#f2ecd8','#93a37a'],
  ['#a07938','#ece5d1','#faf4e0','#c9a75e'],['#5c4a37','#e9e1cd','#f0e7d0','#8c7455']];
function dimBookPalette(i){return DIM_BOOK_PALETTE[i%DIM_BOOK_PALETTE.length];}
function bookCard(it,idx,pos){
  const cover=String(it.cover||'').trim();
  const sub=String(it.sub||'').trim();
  const title=String(it.title||'未命名');
  const creator=String(it.creator||'').trim();
  const review=String(it.review||'').trim();
  const lines=String(it.thought||'').trim()?String(it.thought).split('\n').map(s=>s.trim()).filter(Boolean):[];
  const hasMore=!!(review||String(it.thought||'').trim()||String(it.link||'').trim());
  // 编号按「在书架上的位置」排（01 起）
  const at=(pos==null?idx:pos);
  const no=String(at+1).padStart(2,'0');
  const pal=dimBookPalette(idx);
  const kindLabel=(DIM_KINDS.find(k=>k.id===it.kind)||{}).label||'书籍';
  const photo=cover
    ? '<span class="mbc-photo" style="background-image:url(\''+escHtml(cover)+'\')"></span>'
    : '<span class="mbc-photo is-empty">'+dimIconSvg(it.kind,44)+'</span>';
  return '<button class="memory-book" type="button" data-dim-book="'+idx+'" data-pos="'+at+'"'+
      ' style="left:'+(at*248)+'px;--book-cover:'+pal[0]+';--book-edge:#e8dfd0;--book-ink:'+pal[2]+';--book-accent:'+pal[3]+'"'+
      ' aria-label="打开《'+escHtml(title)+'》的详情">'+
      '<span class="memory-book-shadow" aria-hidden="true"></span>'+
      '<span class="memory-book-object">'+
        '<span class="memory-book-back" aria-hidden="true"></span>'+
        '<span class="memory-book-page-face" aria-hidden="true"><span class="memory-book-opening-page">'+
          '<span class="memory-book-opening-page-label"><span>档案</span><span>'+escHtml(kindLabel)+'</span></span>'+
          '<span class="memory-book-opening-entry"><span>01</span><b>简介</b><small>'+(review?'已写':'未写')+'</small></span>'+
          '<span class="memory-book-opening-entry"><span>02</span><b>评价</b><small>'+lines.length+' 条</small></span>'+
          '<span class="memory-book-opening-entry"><span>03</span><b>编码</b><small>'+no+'</small></span>'+
        '</span></span>'+
        '<span class="memory-book-page-edge" aria-hidden="true"></span>'+
        '<span class="memory-book-edge-top" aria-hidden="true"></span>'+
        '<span class="memory-book-edge-bottom" aria-hidden="true"></span>'+
        '<span class="memory-book-spine-face" aria-hidden="true"><span class="memory-book-spine-copy">'+
          '<small>'+no+'</small><b>'+escHtml(title)+'</b><i>'+escHtml(kindLabel)+'</i></span></span>'+
        '<span class="memory-book-cover-inside" aria-hidden="true"><span class="mbci-inner">'+
          '<b>'+escHtml(title)+'</b>'+(creator?'<i>'+escHtml(creator)+'</i>':'')+
        '</span></span>'+
        '<span class="memory-book-cover">'+photo+'</span>'+
      '</span>'+
    '</button>';
}
