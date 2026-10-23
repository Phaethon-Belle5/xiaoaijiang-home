// ============================================================
// 记忆书架的交互 —— 逻辑搬自映像馆的 memShelfBindActive() + initShelfRail()
//   点一本没选中的书 → 它展开成完整书（点击被吞掉，不打开）
//   再点这本已选中的书 → 打开
//   按住拖动 → 横向滑书架；拖动后跟手的 click 吞掉
// 唯一改动：最后一步打开的是次元柜的详情弹窗，而不是映像馆的翻书阅读器。
// ============================================================
let dimActiveEl=null;
function dimShelfSetActive(el){
  const shelf=document.getElementById('dim-grid');
  if(!shelf||!el)return;
  const idx=+el.dataset.dimBook, pos=+el.dataset.pos;
  shelf.querySelectorAll('.memory-book').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  el.classList.remove('opening');
  dimActiveEl=el;
  dimHover(idx,pos);
  try{dimCenterBook(el);}catch(e){}
}
function dimShelfBind(){
  const shelf=document.getElementById('dim-grid');
  if(!shelf)return;
  const books=[].slice.call(shelf.querySelectorAll('.memory-book'));
  if(!books.length)return;
  // 保证始终有一本是选中的
  const cur=books.find(b=>b.classList.contains('active'));
  if(cur){dimActiveEl=cur;}
  else{books[0].classList.add('active');dimActiveEl=books[0];}
  if(shelf.__bound)return;
  shelf.__bound=true;

  // 点击：没选中就选中；已选中就打开详情
  shelf.addEventListener('click',ev=>{
    const b=(ev.target&&ev.target.closest)?ev.target.closest('.memory-book'):null;
    if(!b)return;
    if(!b.classList.contains('active')){
      ev.preventDefault();ev.stopPropagation();
      dimShelfSetActive(b);
      return;
    }
    if(shelf.__justDragged){shelf.__justDragged=false;return;}
    openDimDetail(+b.dataset.dimBook,+b.dataset.pos,b);
  },true);

  // 拖动（映像馆 initShelfRail 同款）
  let down=false,startX=0,startScroll=0,moved=0;
  shelf.addEventListener('pointerdown',e=>{down=true;startX=e.clientX;startScroll=shelf.scrollLeft;moved=0;});
  shelf.addEventListener('pointermove',e=>{
    if(!down)return;
    const dx=e.clientX-startX;
    moved=Math.max(moved,Math.abs(dx));
    if(moved>7){shelf.classList.add('dragging');shelf.scrollLeft=startScroll-dx;}
  });
  const up=()=>{
    down=false;
    shelf.classList.remove('dragging');
    if(moved>7){shelf.__justDragged=true;setTimeout(()=>{shelf.__justDragged=false;},80);}
  };
  ['pointerup','pointercancel','pointerleave'].forEach(t=>shelf.addEventListener(t,up));

  // 竖向滚轮 → 横向滑（映像馆只做了拖动，这里顺手补上滚轮）
  shelf.addEventListener('wheel',e=>{
    const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    if(!d)return;
    const max=shelf.scrollWidth-shelf.clientWidth;
    if(max<=2)return;
    if((shelf.scrollLeft<=0&&d<0)||(shelf.scrollLeft>=max-1&&d>0))return;
    e.preventDefault();
    shelf.scrollLeft+=d>0?Math.max(18,Math.abs(d)):-Math.max(18,Math.abs(d));
  },{passive:false});

  // ←/→ 切换选中
  shelf.addEventListener('keydown',e=>{
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    const all=[].slice.call(shelf.querySelectorAll('.memory-book'));
    const i=all.indexOf(dimActiveEl);
    const next=all[i+(e.key==='ArrowRight'?1:-1)];
    if(next){e.preventDefault();dimShelfSetActive(next);}
  });
}
