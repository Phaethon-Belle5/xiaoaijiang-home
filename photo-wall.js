/* ═══════════════════════════════════════════════════════════════════
   照片墙 / 分层堆叠相册
   视觉完全由 photo-wall.css 决定（整段搬自参考项目 Your-China-Travel
   的 .img-viewer 规则）。这里只负责：摆五张卡（主卡 + 左右各两张微斜的
   邻卡）、上一张/下一张、键盘左右与 Esc、点空白处关闭。
   ═══════════════════════════════════════════════════════════════════ */
window.PhotoWall=(function(){
  var photos=[],idx=0,el=null;
  function build(){
    el=document.createElement('div');
    el.id='pwViewer';el.className='img-viewer stack-mode';
    el.innerHTML='<div class="stage">'+
      '<div class="photo-card far-prev"><img alt=""></div>'+
      '<div class="photo-card prev"><img alt=""></div>'+
      '<div class="photo-card main"><img alt=""></div>'+
      '<div class="photo-card next"><img alt=""></div>'+
      '<div class="photo-card far-next"><img alt=""></div>'+
    '</div>'+
    '<button class="nav-btn nav-prev" type="button" aria-label="上一张">&#8249;</button>'+
    '<button class="nav-btn nav-next" type="button" aria-label="下一张">&#8250;</button>';
    document.body.appendChild(el);
    el.querySelector('.nav-prev').addEventListener('click',function(e){e.stopPropagation();go(-1);});
    el.querySelector('.nav-next').addEventListener('click',function(e){e.stopPropagation();go(1);});
    el.addEventListener('click',function(e){
      if(e.target===el||(e.target.classList&&e.target.classList.contains('stage')))close();
    });
    document.addEventListener('keydown',function(e){
      if(!el||!el.classList.contains('show'))return;
      if(e.key==='Escape'){e.preventDefault();close();}
      else if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}
      else if(e.key==='ArrowRight'){e.preventDefault();go(1);}
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
      cnt.style.cssText='position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:30;'+
        'color:rgba(255,255,255,.8);font-size:13px;letter-spacing:.06em;pointer-events:none';
      el.appendChild(cnt);
    }
    cnt.textContent=(idx+1)+' / '+photos.length+(photos[idx]&&photos[idx].title?('　'+photos[idx].title):'');
  }
  function go(d){idx=(idx+d+photos.length)%photos.length;paint();}
  function open(list,start){
    photos=(list||[]).filter(function(p){return p&&p.src;});
    if(!photos.length)return false;
    idx=Math.max(0,Math.min(start||0,photos.length-1));
    if(!el)build();
    paint();
    el.classList.add('show');
    try{document.body.style.overflow='hidden';}catch(e){}
    return true;
  }
  function close(){
    if(el)el.classList.remove('show');
    try{document.body.style.overflow='';}catch(e){}
  }
  return {open:open,close:close,next:function(){go(1);},prev:function(){go(-1);}};
})();
