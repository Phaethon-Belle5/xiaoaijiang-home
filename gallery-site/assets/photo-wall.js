/* ═══════════════════════════════════════════════════════════════════
   照片墙 / 分层堆叠相册
   两种形态，可以互相切换：
     · 网格态（grid）—— 一面墙上挂满相框，挂杆与画框样式整段搬自参考项目
       （.img-viewer .curtain-panel / .curtain-rod）
     · 堆叠态（stack）—— 主卡 + 两侧各两张微斜的邻卡，同样搬自参考项目
   点网格里的任意一张 → 切到堆叠态并从那张开始；
   堆叠态右上角「▦ 网格」→ 切回网格。
   ═══════════════════════════════════════════════════════════════════ */
window.PhotoWall=(function(){
  var photos=[],idx=0,el=null,mode='grid';
  function build(){
    el=document.createElement('div');
    el.id='pwViewer';el.className='img-viewer';
    el.innerHTML=
      '<div class="pw-wall" data-pw-wall hidden></div>'+
      '<div class="stage" data-pw-stage>'+
        '<div class="photo-card far-prev"><img alt=""></div>'+
        '<div class="photo-card prev"><img alt=""></div>'+
        '<div class="photo-card main"><img alt=""></div>'+
        '<div class="photo-card next"><img alt=""></div>'+
        '<div class="photo-card far-next"><img alt=""></div>'+
      '</div>'+
      '<button class="nav-btn nav-prev" type="button" aria-label="上一张">&#8249;</button>'+
      '<button class="nav-btn nav-next" type="button" aria-label="下一张">&#8250;</button>'+
      '<button class="pw-toggle" type="button" aria-label="切换显示方式"></button>';
    document.body.appendChild(el);
    el.querySelector('.nav-prev').addEventListener('click',function(e){e.stopPropagation();go(-1);});
    el.querySelector('.nav-next').addEventListener('click',function(e){e.stopPropagation();go(1);});
    el.querySelector('.pw-toggle').addEventListener('click',function(e){e.stopPropagation();setMode(mode==='grid'?'stack':'grid');});
    el.addEventListener('click',function(e){
      if(e.target===el)close();
    });
    document.addEventListener('keydown',function(e){
      if(!el||!el.classList.contains('show'))return;
      if(e.key==='Escape'){e.preventDefault();close();}
      else if(e.key==='ArrowLeft'&&mode==='stack'){e.preventDefault();go(-1);}
      else if(e.key==='ArrowRight'&&mode==='stack'){e.preventDefault();go(1);}
      else if(e.key==='g'||e.key==='G'){e.preventDefault();setMode(mode==='grid'?'stack':'grid');}
    });
  }
  function buildWall(){
    var wall=el.querySelector('[data-pw-wall]');
    if(wall.childElementCount===photos.length)return;
    wall.innerHTML='';
    photos.forEach(function(p,i){
      var panel=document.createElement('div');
      panel.className='curtain-panel';
      panel.setAttribute('role','button');
      panel.setAttribute('tabindex','0');
      panel.setAttribute('aria-label','查看第 '+(i+1)+' 张照片');
      panel.innerHTML='<div class="curtain-rod"></div><img alt="" loading="lazy">';
      panel.querySelector('img').src=p.src;
      panel.querySelector('img').alt=p.title||'';
      panel.addEventListener('click',function(e){
        e.stopPropagation();
        idx=i;
        setMode('stack');
      });
      wall.appendChild(panel);
    });
  }
  function paint(){
    if(!el)return;
    var at=function(o){return photos[((idx+o)%photos.length+photos.length)%photos.length];};
    [['far-prev',-2],['prev',-1],['main',0],['next',1],['far-next',2]].forEach(function(pair){
      var card=el.querySelector('.photo-card.'+pair[0]);
      var p=at(pair[1]);
      var img=card.querySelector('img');
      if(p&&p.src){img.src=p.src;img.alt=p.title||'';card.style.visibility='';}
      else{card.style.visibility='hidden';}
    });
    var cnt=el.querySelector('.pw-count');
    if(!cnt){
      cnt=document.createElement('div');cnt.className='pw-count';
      el.appendChild(cnt);
    }
    cnt.textContent=(idx+1)+' / '+photos.length+(photos[idx]&&photos[idx].title?('　'+photos[idx].title):'');
  }
  function setMode(m){
    mode=m;
    if(!el)return;
    var wall=el.querySelector('[data-pw-wall]');
    var stage=el.querySelector('[data-pw-stage]');
    var prev=el.querySelector('.nav-prev'),next=el.querySelector('.nav-next');
    var tog=el.querySelector('.pw-toggle');
    if(m==='grid'){
      buildWall();
      el.className='img-viewer pw-grid-mode'+(el.classList.contains('show')?' show':'');
      wall.hidden=false;stage.style.display='none';
      prev.style.display='none';next.style.display='none';
      tog.textContent='▣ 堆叠';
      tog.title='切换成逐张放大的堆叠相册（快捷键 G）';
    }else{
      el.className='img-viewer stack-mode'+(el.classList.contains('show')?' show':'');
      wall.hidden=true;stage.style.display='';
      prev.style.display='';next.style.display='';
      tog.textContent='▦ 网格';
      tog.title='切换成整墙相框（快捷键 G）';
      paint();
    }
  }
  function go(d){idx=(idx+d+photos.length)%photos.length;paint();}
  function open(list,start){
    photos=(list||[]).filter(function(p){return p&&p.src;});
    if(!photos.length)return false;
    idx=Math.max(0,Math.min(start||0,photos.length-1));
    if(!el)build();
    paint();
    setMode('grid');
    el.classList.add('show');
    try{document.body.style.overflow='hidden';}catch(e){}
    return true;
  }
  function close(){
    if(el)el.classList.remove('show');
    try{document.body.style.overflow='';}catch(e){}
  }
  return {open:open,close:close,next:function(){if(mode==='stack')go(1);},prev:function(){if(mode==='stack')go(-1);},setMode:setMode,getMode:function(){return mode;}};
})();
