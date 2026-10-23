// ============================================================
// 弧形书架 —— 参数逐个对应 Wenku8_Flutter 的 lib/archive_shelf_geometry.dart
//   maxViewportWidth = 520   depthX = .66   depthY = -.30   rowStep = 2.5
//   spineFor(w)  = clamp(w*.043, 14, 18)
//   pitchFor(w)  = spineFor(w) + 11
//   coverFor(w)  = clamp(w*.32, 100, 128)
//   bodyHeight(c)= (c-20)*166/118 + 54
//   pullDistance(c) = c*.84
//   baseY(c,h)   = -c*depthY + h*.60 + 12
//   railY(d)     = clamp(d,-7,7)*rowStep + d*d*.45
//   origin(c,h,w): pull = pullDistance*w*(1.24-.24*w); lift = w*w*(3-2*w)
//                  x = -pull*depthX,  y = baseY - pull*depthY - h*.60*lift
//   _WavePose.weight(d) = cos(clamp(|d|/1.48,0,1)*π/2)^2
// 滑动动量 + 落位：dragRate 4.4、omega 12、松手吸附到整数书位（archive_scroll_simulation.dart）
// ============================================================
const DIM_ARC={depthX:.66,depthY:-.30,rowStep:2.5,radius:1.48,dragRate:4.4,omega:12};
let dimFocus=0;          // 当前居中第几本（可以是小数）
let dimVel=0;            // 速度（本/秒）
let dimRaf=0;
let dimPitch=29, dimSpine=18, dimCover=128, dimHeight=206, dimBaseY=0;

function dimArcMetrics(){
  const shelf=document.getElementById('dim-grid');
  if(!shelf)return;
  const W=Math.max(320,Math.min(760,shelf.clientWidth||520));
  dimSpine=Math.max(14,Math.min(18,W*0.043));
  dimPitch=dimSpine+11;
  dimCover=Math.max(100,Math.min(128,W*0.32));
  dimHeight=(dimCover-20)*166/118+54;
  dimBaseY=-dimCover*DIM_ARC.depthY+dimHeight*0.60+12;
}
function dimRailY(d){
  const c=Math.max(-7,Math.min(7,d));
  return c*DIM_ARC.rowStep+c*c*0.45;
}
function dimWeight(d){
  return Math.pow(Math.cos(Math.min(1,Math.abs(d)/DIM_ARC.radius)*Math.PI/2),2);
}

// 按弧线摆好书：中间那本抽出露封面，两侧收成书脊并沿弧上抬、后退
function dimArcLayout(){
  const shelf=document.getElementById('dim-grid');
  if(!shelf)return;
  const track=shelf.querySelector('.memory-shelf-track');
  if(!track)return;
  const books=[].slice.call(track.querySelectorAll('.memory-book'));
  if(!books.length)return;
  dimArcMetrics();
  const focus=dimFocus;
  books.forEach(function(b,i){
    const d=i-focus;
    const w=dimWeight(d);
    const pull=d===0?1:w;                     // 正中间那本完全抽出
    const originX=-dimCover*0.84*dimWeight(0)*DIM_ARC.depthX*pull;
    const x=d*dimPitch+(d===0?0:0);
    const y=dimRailY(d);
    // 抽出量：正中那本往观者方向推、往上抬
    const p=dimCover*0.84*pull*(1.24-0.24*pull);
    const lift=pull*pull*(3-2*pull);
    const dx=-p*DIM_ARC.depthX;
    const dy=-p*DIM_ARC.depthY-dimHeight*0.60*lift;
    // 宽度：正中=封面宽，两侧=书脊宽
    const bw=d===0?dimCover:dimSpine;
    b.style.width=bw+'px';
    b.style.height=dimHeight+'px';
    b.style.left='50%';
    b.style.bottom='auto';
    b.style.top='0';
    b.style.marginLeft='0';
    b.style.transform='translate3d('+(x+dx-bw/2)+'px,'+(y+dy)+'px,0)';
    b.style.zIndex=String(1000-Math.round(Math.abs(d)*10));
    b.style.opacity=Math.abs(d)>7?0:1;
    b.classList.toggle('active',d===0);
    b.classList.toggle('arc-near',Math.abs(d)<=1);
  });
  // 轨道高度跟着书走
  const h=dimBaseY+dimHeight+70;
  track.style.height=h+'px';
  track.style.width='100%';
  const rail=shelf.querySelector('.memory-shelf-floor');
  if(rail)rail.style.bottom=(h-dimBaseY-6)+'px';
}

// 位置更新（带惯性）
function dimArcAnim(){
  cancelAnimationFrame(dimRaf);
  const step=function(){
    dimVel*=Math.pow(0.0001,1/60);            // 惯性衰减
    dimFocus+=dimVel/60;
    if(Math.abs(dimVel)<0.02){dimVel=0;dimArcLayout();return;}
    dimArcLayout();
    dimRaf=requestAnimationFrame(step);
  };
  dimRaf=requestAnimationFrame(step);
}
// 松手吸附到整数书位（对应 archive_scroll_simulation 的 book detent）
function dimArcSettle(){
  const target=Math.round(dimFocus);
  const start=dimFocus, t0=performance.now(), dur=380;
  const run=function(t){
    const k=Math.min(1,(t-t0)/dur);
    const e=1-Math.pow(1-k,3);                // cubic ease-out
    dimFocus=start+(target-start)*e;
    dimArcLayout();
    if(k<1)requestAnimationFrame(run);
    else{dimFocus=target;dimVel=0;dimArcLayout();}
  };
  requestAnimationFrame(run);
}
function dimArcGo(delta){
  const books=document.querySelectorAll('#dim-grid .memory-book').length;
  const target=Math.max(0,Math.min(books-1,Math.round(dimFocus)+delta));
  const start=dimFocus,t0=performance.now(),dur=320;
  const run=function(t){
    const k=Math.min(1,(t-t0)/dur);
    const e=1-Math.pow(1-k,3);
    dimFocus=start+(target-start)*e;
    dimArcLayout();
    if(k<1)requestAnimationFrame(run); else dimFocus=target;
  };
  requestAnimationFrame(run);
}
// 绑定拖动 / 滚轮 / 键盘
function dimArcBind(){
  const shelf=document.getElementById('dim-grid');
  if(!shelf||shelf.__arcBound)return;
  shelf.__arcBound=true;
  let down=false,lastX=0,lastT=0,moved=0;
  shelf.addEventListener('pointerdown',function(e){
    down=true;lastX=e.clientX;lastT=performance.now();moved=0;dimVel=0;
    cancelAnimationFrame(dimRaf);
    shelf.classList.add('dragging');
  });
  shelf.addEventListener('pointermove',function(e){
    if(!down)return;
    const now=performance.now();
    const dx=e.clientX-lastX;
    const dt=Math.max(8,now-lastT);
    moved=Math.max(moved,Math.abs(dx));
    dimFocus-=dx/dimPitch;
    dimVel=-(dx/dimPitch)/(dt/1000);
    lastX=e.clientX;lastT=now;
    const books=shelf.querySelectorAll('.memory-book').length;
    dimFocus=Math.max(0,Math.min(books-1,dimFocus));
    dimArcLayout();
  });
  const up=function(){
    if(!down)return;
    down=false;
    shelf.classList.remove('dragging');
    if(moved>6){shelf.__justDragged=true;setTimeout(function(){shelf.__justDragged=false;},80);
      if(Math.abs(dimVel)>0.6)dimArcAnim();else dimArcSettle();
    }else{
      dimArcSettle();
    }
  };
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){shelf.addEventListener(t,up)});
  shelf.addEventListener('wheel',function(e){
    const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
    if(!d)return;
    e.preventDefault();
    dimFocus+=d/dimPitch*0.6;
    const books=shelf.querySelectorAll('.memory-book').length;
    dimFocus=Math.max(0,Math.min(books-1,dimFocus));
    dimArcLayout();
    clearTimeout(shelf.__wt);
    shelf.__wt=setTimeout(dimArcSettle,160);
  },{passive:false});
  shelf.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'){e.preventDefault();dimArcGo(1);}
    if(e.key==='ArrowLeft'){e.preventDefault();dimArcGo(-1);}
  });
}
// 重绘后复位
function dimArcMount(){
  const shelf=document.getElementById('dim-grid');
  if(!shelf)return;
  dimFocus=0;dimVel=0;
  dimArcBind();
  dimArcLayout();
  setTimeout(dimArcLayout,60);
}
window.addEventListener('resize',function(){ if(document.getElementById('dim-grid'))dimArcLayout(); });
