// ============================================================
// 书架滚轮：竖向滚轮 → 横向滑书，停下后吸附到最近的一本书
// 对应参考项目 lib/archive_scroll_simulation.dart 的思路：
//   "Momentum first, a book detent last."
//   先按动量滑行，最后落在一个整数书位上，不做第二次居中美化动画。
// 网页这边用原生滚动（自带惯性）+ 停手后吸附到最近书位来还原手感。
// ============================================================
function dimSnapToBook(shelf){
  const books=[].slice.call(shelf.querySelectorAll('.spine-book'));
  if(!books.length)return;
  const sl=shelf.scrollLeft;
  const pad=parseFloat(getComputedStyle(shelf).paddingLeft)||0;
  let best=null,bestD=Infinity;
  books.forEach(b=>{
    const t=b.offsetLeft-pad;
    const d=Math.abs(t-sl);
    if(d<bestD){bestD=d;best=b;t<Infinity;}
  });
  if(best!=null){
    const target=Math.max(0,Math.min(shelf.scrollWidth-shelf.clientWidth,best.offsetLeft-pad));
    if(Math.abs(target-sl)>1)shelf.scrollTo({left:target,behavior:'smooth'});
  }
}
function initDimWheel(){
  const shelf=document.getElementById('dim-grid');
  if(!shelf||shelf._wheelBound)return;
  shelf._wheelBound=true;
  let snapTimer=null;
  shelf.addEventListener('wheel',function(e){
    // 横向滚轮照常用；竖向滚轮转成横向（shift/触控板双指都覆盖）
    const dy=e.deltaY, dx=e.deltaX;
    const d=Math.abs(dx)>Math.abs(dy)?dx:dy;
    if(!d)return;
    const max=shelf.scrollWidth-shelf.clientWidth;
    if(max<=2)return;                     // 内容不够宽，交给页面正常滚动
    const atStart=shelf.scrollLeft<=0;
    const atEnd=shelf.scrollLeft>=max-1;
    if((atStart&&d<0)||(atEnd&&d>0))return;  // 到边界放行，别把整页滚动锁死
    e.preventDefault();
    shelf.scrollLeft+=d>0?Math.max(18,Math.abs(d)):-Math.max(18,Math.abs(d));
    clearTimeout(snapTimer);
    snapTimer=setTimeout(()=>dimSnapToBook(shelf),160);
  },{passive:false});
  // 拖动/触摸结束后也吸附
  shelf.addEventListener('scroll',function(){
    clearTimeout(shelf._snapT);
    shelf._snapT=setTimeout(()=>{if(!shelf._dragging)dimSnapToBook(shelf);},220);
  },{passive:true});
  // 键盘左右键也能滑
  shelf.addEventListener('keydown',function(e){
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    const books=[].slice.call(shelf.querySelectorAll('.spine-book'));
    if(!books.length)return;
    const pad=parseFloat(getComputedStyle(shelf).paddingLeft)||0;
    const sl=shelf.scrollLeft;
    const dir=e.key==='ArrowRight'?1:-1;
    let next=null;
    if(dir>0){for(const b of books){if(b.offsetLeft-pad>sl+2){next=b;break;}}}
    else{for(let i=books.length-1;i>=0;i--){if(books[i].offsetLeft-pad<sl-2){next=books[i];break;}}}
    if(next){e.preventDefault();shelf.scrollTo({left:Math.max(0,next.offsetLeft-pad),behavior:'smooth'});}
  });
}
