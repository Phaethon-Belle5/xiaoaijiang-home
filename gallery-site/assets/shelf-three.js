/* ══════════════════════════════════════════════════════════════════
   记忆书架 —— Three.js 书架 rig
   逐字搬自参考项目 zwxll/Your-China-Travel（其原注释：
   「Three.js book rig and deterministic shelf motion adapted with
    permission from MengTo/complete-shelf」）
   这里只做了两件事：把函数从内联脚本里切出来；把数据来源换成我的省份分组。
   ══════════════════════════════════════════════════════════════════ */
const MEMORY_BOOK_COLORS =[
    ['#3d7285','#e9e2cf','#f3ecd7','#8fb9c6'],
    ['#a4523a','#ece5d1','#f6efdb','#c98f76'],
    ['#d5c5a0','#efe9d8','#513d28','#b5a077'],
    ['#67754a','#eae3ce','#f2ecd8','#93a37a'],
    ['#a07938','#ece5d1','#faf4e0','#c9a75e'],
    ['#5c4a37','#e9e1cd','#f0e7d0','#8c7455']
  ];
let memoryShelfState ={provinces:[],active:0,level:'shelf',province:null,city:null,photos:[],page:0,dragOffset:0,pageShift:0,paging:false,bookRotation:null,suppressClickUntil:0,wheelAt:0,albumTurning:false,opening:false,infoTimer:0,switchTimer:0,pageTimer:0,openTimer:0,photoPositions:new Map()};
let memoryProvinceCoverCache =new Map();
let memoryThreeShelf =null,memoryThreePromise=null,memoryShelfResourcesPromise=null;

function memoryEnsureThree(){
    if(window.THREE) return Promise.resolve(window.THREE);
    if(memoryThreePromise) return memoryThreePromise;
    memoryThreePromise=new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(script=>/three(?:\.min)?\.js/.test(script.src));
      const script=existing||Object.assign(document.createElement('script'),{src:'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js'});
      const ready=()=>window.THREE?resolve(window.THREE):reject(new Error('Three.js 未暴露全局对象'));
      script.addEventListener('load',ready,{once:true});script.addEventListener('error',reject,{once:true});
      if(!existing) document.head.appendChild(script);else if(window.THREE) ready();
    });
    return memoryThreePromise;
  }

function memoryPrepareShelfResources(){
    if(memoryShelfResourcesPromise) return memoryShelfResourcesPromise;
    memoryShelfResourcesPromise=Promise.all([
      memoryEnsureThree(),
      document.fonts?.load?Promise.race([document.fonts.load('400 58px "Noto Serif SC"'),new Promise(resolve=>setTimeout(resolve,1500))]):Promise.resolve()
    ]).then(()=>true).catch(error=>{console.warn('书架资源预加载失败，将使用 CSS 备用布局',error);return false;});
    return memoryShelfResourcesPromise;
  }

function memoryBookCoverTexture(THREE,province,index){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
    const ctx=canvas.getContext('2d'),paper='#f3f0e8',ink='#253943',paint=image=>{
      ctx.clearRect(0,0,512,768);ctx.filter='none';ctx.fillStyle=paper;ctx.fillRect(0,0,512,768);
      const shade=ctx.createLinearGradient(0,0,0,768);shade.addColorStop(0,'rgba(255,255,255,.16)');shade.addColorStop(.18,'rgba(255,255,255,0)');shade.addColorStop(.86,'rgba(77,70,55,0)');shade.addColorStop(1,'rgba(77,70,55,.035)');ctx.fillStyle=shade;ctx.fillRect(0,0,512,768);
      ctx.globalAlpha=.035;ctx.strokeStyle='#fff';ctx.lineWidth=.45;for(let y=2;y<768;y+=6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y+1);ctx.stroke();}ctx.globalAlpha=1;
      ctx.fillStyle=ink;ctx.font='600 18px "Microsoft YaHei",Arial';ctx.fillText('旅行手册',72,62);ctx.textAlign='right';ctx.font='600 16px "Microsoft YaHei",Arial';ctx.fillText(String(index+1).padStart(2,'0'),462,62);ctx.textAlign='left';
      const titleLength=[...province.name].length,titleSize=Math.max(34,Math.min(68,Math.floor(390/Math.max(1,titleLength))));ctx.font='500 '+titleSize+'px "Noto Serif SC","Source Han Serif SC","STSong","SimSun",serif';ctx.fillText(province.name,72,158);
      if(image){ctx.save();ctx.beginPath();ctx.rect(0,180,512,588);ctx.clip();const scale=Math.max(512/image.width,588/image.height),w=image.width*scale,h=image.height*scale;ctx.filter='saturate(1.12) contrast(1.05) brightness(1.04)';ctx.drawImage(image,(512-w)/2,180+(588-h)/2,w,h);ctx.filter='none';ctx.restore();}
      else{ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(0,180,512,588);}
      const photoFade=ctx.createLinearGradient(0,170,0,330);photoFade.addColorStop(0,paper);photoFade.addColorStop(.24,'rgba(243,240,232,.96)');photoFade.addColorStop(1,'rgba(243,240,232,0)');ctx.fillStyle=photoFade;ctx.fillRect(0,170,512,160);
      const footerFade=ctx.createLinearGradient(0,630,0,768);footerFade.addColorStop(0,'rgba(18,31,35,0)');footerFade.addColorStop(1,'rgba(18,31,35,.42)');ctx.fillStyle=footerFade;ctx.fillRect(0,630,512,138);
      ctx.fillStyle='#f3f0e8';ctx.shadowColor='rgba(14,28,33,.88)';ctx.shadowBlur=4;ctx.shadowOffsetY=1;ctx.font='700 20px "Microsoft YaHei",Arial';ctx.fillText(province.cities.length+' 座城市　'+province.photoCount+' 张照片',72,724);ctx.textAlign='right';ctx.fillText('旅行记忆',462,724);ctx.textAlign='left';ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      const leftSeam=ctx.createLinearGradient(0,0,12,0);leftSeam.addColorStop(0,'rgba(71,94,103,.28)');leftSeam.addColorStop(.42,'rgba(132,153,160,.15)');leftSeam.addColorStop(1,'rgba(132,153,160,0)');ctx.fillStyle=leftSeam;ctx.fillRect(0,0,12,768);
      const rightSeam=ctx.createLinearGradient(503,0,512,0);rightSeam.addColorStop(0,'rgba(96,111,116,0)');rightSeam.addColorStop(.56,'rgba(96,111,116,.09)');rightSeam.addColorStop(1,'rgba(66,81,86,.23)');ctx.fillStyle=rightSeam;ctx.fillRect(503,0,9,768);
    };
    paint();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    if(province.cover){const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{paint(image);texture.needsUpdate=true;};image.src=province.cover;}
    return texture;
  }

function memoryRoundedBookGeometry(THREE,width,height,depth,radius,bottomBow=0,leftRadius=radius,bevel=.012){
    const x=-width*.5,y=-height*.5,r=Math.min(radius,width*.25,height*.25),lr=Math.min(leftRadius,r),bow=Math.min(bottomBow,r*.45),shape=new THREE.Shape();
    shape.moveTo(x+lr,y+bow);if(bow) shape.quadraticCurveTo(0,y-bow,x+width-r,y+bow);else shape.lineTo(x+width-r,y);shape.quadraticCurveTo(x+width,y+bow,x+width,y+r+bow);shape.lineTo(x+width,y+height-r);shape.quadraticCurveTo(x+width,y+height,x+width-r,y+height);shape.lineTo(x+lr,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-lr);shape.lineTo(x,y+lr+bow);shape.quadraticCurveTo(x,y+bow,x+lr,y+bow);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:8,bevelEnabled:true,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel*2/3});geometry.translate(0,0,-depth*.5);geometry.computeVertexNormals();return geometry;
  }

function memoryRoundedBookFaceGeometry(THREE,width,height,radius,bottomBow=0,leftRadius=radius){
    const x=-width*.5,y=-height*.5,r=Math.min(radius,width*.25,height*.25),lr=Math.min(leftRadius,r),bow=Math.min(bottomBow,r*.45),shape=new THREE.Shape();
    shape.moveTo(x+lr,y+bow);if(bow) shape.quadraticCurveTo(0,y-bow,x+width-r,y+bow);else shape.lineTo(x+width-r,y);shape.quadraticCurveTo(x+width,y+bow,x+width,y+r+bow);shape.lineTo(x+width,y+height-r);shape.quadraticCurveTo(x+width,y+height,x+width-r,y+height);shape.lineTo(x+lr,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-lr);shape.lineTo(x,y+lr+bow);shape.quadraticCurveTo(x,y+bow,x+lr,y+bow);
    const geometry=new THREE.ShapeGeometry(shape,12),position=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<position.count;i++) uv.setXY(i,(position.getX(i)-x)/width,(position.getY(i)-y)/height);
    uv.needsUpdate=true;geometry.computeVertexNormals();return geometry;
  }

function memoryCreateThreeBook(THREE,province,index){
    const bookScale=1.08,colors=memoryBookPalette(index),height=2.14*bookScale*(1+[0,.018,-.012,.028,-.022,.009][index%6]),width=height*.635,depth=.27*bookScale*(1+[.04,-.03,.07,-.05,.02,0][index%6]);
    const root=new THREE.Group(),motion=new THREE.Group();root.add(motion);root.userData.bookIndex=index;
    const paperColor='#eee8dc';
    const clothTextures=memoryClothTextures(THREE,colors[0],index),cloth=new THREE.MeshPhysicalMaterial({color:0xffffff,map:clothTextures.map,bumpMap:clothTextures.bumpMap,bumpScale:.009,roughness:.9,metalness:0,clearcoat:.004,clearcoatRoughness:1});
    const paper=new THREE.MeshStandardMaterial({map:memoryPageEdgeTexture(THREE,paperColor),roughness:.98,color:0xffffff});
    const lining=new THREE.MeshBasicMaterial({color:0xeee8dc,toneMapped:false});
    const pageWidth=width-.008,pageHeight=height-.012;
    const pageBlock=new THREE.Mesh(memoryRoundedBookGeometry(THREE,pageWidth-.004,pageHeight-.004,depth-.045,.008,0,.006,.002),paper);pageBlock.castShadow=pageBlock.receiveShadow=true;motion.add(pageBlock);
    const back=new THREE.Mesh(memoryRoundedBookGeometry(THREE,pageWidth+.004,pageHeight+.004,.052,.012,0,.008,.002),cloth);back.position.z=-depth*.5-.012;back.castShadow=back.receiveShadow=true;motion.add(back);
    const coverPivot=new THREE.Group();coverPivot.position.set(-width*.5,0,depth*.5);motion.add(coverPivot);
    const coverCloth=new THREE.MeshPhysicalMaterial({color:0xf3f0e8,roughness:.94,metalness:0,clearcoat:.012,clearcoatRoughness:1});
    const coverShell=new THREE.Mesh(memoryRoundedBookGeometry(THREE,width,height,.032,.012,0,.008,.003),coverCloth);coverShell.position.x=width*.5;coverShell.castShadow=coverShell.receiveShadow=true;coverShell.userData.bookIndex=index;coverPivot.add(coverShell);
    const coverMaterial=new THREE.MeshBasicMaterial({map:memoryBookCoverTexture(THREE,province,index),toneMapped:false});
    const coverArt=new THREE.Mesh(memoryRoundedBookFaceGeometry(THREE,width-.012,height-.012,.049,.014,.018),coverMaterial);coverArt.position.set(width*.5,0,.031);coverArt.userData.bookIndex=index;coverPivot.add(coverArt);
    const insideCoverMaterial=new THREE.MeshBasicMaterial({map:memoryChapterPreviewTexture(THREE,province,'left'),toneMapped:false});
    const insideCoverArt=new THREE.Mesh(memoryRoundedBookFaceGeometry(THREE,pageWidth,pageHeight,.006),insideCoverMaterial);insideCoverArt.position.set(width*.5,0,-.029);insideCoverArt.rotation.y=Math.PI;insideCoverArt.visible=false;insideCoverArt.userData.bookIndex=index;coverPivot.add(insideCoverArt);
    const chapterPageMaterial=new THREE.MeshBasicMaterial({map:memoryChapterPreviewTexture(THREE,province,'right'),toneMapped:false,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-8,polygonOffsetUnits:-8});
    const chapterPageArt=new THREE.Mesh(memoryRoundedBookFaceGeometry(THREE,pageWidth,pageHeight,.006),chapterPageMaterial);chapterPageArt.position.set(0,0,depth*.5+.026);chapterPageArt.renderOrder=4;chapterPageArt.visible=false;chapterPageArt.userData.bookIndex=index;motion.add(chapterPageArt);
    const spine=new THREE.Mesh(new THREE.CylinderGeometry(depth*.56,depth*.56,height-.026,28),cloth);spine.scale.x=.64;spine.position.x=-width*.5+.018;spine.castShadow=spine.receiveShadow=true;spine.userData.bookIndex=index;motion.add(spine);
    const spineLabelArc=1.22,spineLabelRadius=depth*.57;
    const spineLabelGeometry=new THREE.CylinderGeometry(spineLabelRadius,spineLabelRadius,height*.82,18,1,true,-Math.PI*.5-spineLabelArc*.5,spineLabelArc);
    const spineLabel=new THREE.Mesh(spineLabelGeometry,memorySpineLabelMaterial(THREE,province,index,colors[2]));spineLabel.scale.x=.64;spineLabel.position.set(-width*.5+.018,0,0);spineLabel.renderOrder=1;spineLabel.userData.bookIndex=index;motion.add(spineLabel);
    const bandGeometry=new THREE.CylinderGeometry(.022,.022,.23,12),bandMaterial=new THREE.MeshStandardMaterial({color:0xd8d1c5,roughness:1});
    [-1,1].forEach(side=>{const band=new THREE.Mesh(bandGeometry,bandMaterial);band.rotation.z=Math.PI/2;band.position.set(-width*.5+.105,side*(height*.5-.058),0);motion.add(band);});
    root.traverse(object=>{if(object.isMesh&&!Number.isInteger(object.userData.bookIndex)) object.userData.bookIndex=index;});
    return {root,motion,coverPivot,coverShell,coverCloth,insideCoverArt,chapterPageArt,spineLabel,spine,back,paper,cloth,lining,width,height,depth,target:new THREE.Vector3(),targetRotation:new THREE.Euler(),targetScale:1};
  }

function memoryUpdateThreeShelfTargets(){
    const shelf=memoryThreeShelf;if(!shelf) return;const viewport=$('memoryShelfViewport'),total=shelf.rigs.length,layout=memoryShelfLayout(viewport,total),pageShift=memoryShelfState.pageShift||0;
    shelf.rigs.forEach((rig,index)=>{const active=index===memoryShelfState.active,slot=active?-1:(index-memoryShelfState.active-1+total)%total;
      const visible=active||slot<layout.capacity+(pageShift?layout.capacity:0);rig.root.visible=visible;rig.slotVisible=visible;
      const opening=active&&memoryShelfState.opening,inspecting=active&&memoryShelfState.bookRotation!==null&&Math.abs(memoryShelfState.bookRotation)>1,targetScale=active?(opening?1.08:1.16):Math.max(.76,.96-slot*.035),groundY=-1.11+rig.height*targetScale*.5;
      rig.spine.material=opening?rig.paper:rig.cloth;rig.back.material=opening?rig.lining:rig.cloth;
      rig.coverShell.material=opening?rig.lining:rig.coverCloth;
      const activeRotation=memoryShelfState.bookRotation===null?.2:shelf.THREE.MathUtils.degToRad(memoryShelfState.bookRotation);
      rig.target.set(active?(opening?0.1:-1.25-pageShift*.03):.38+(slot-pageShift)*.36,opening?.08:groundY,active?(opening?1.18:.85):-slot*.06);rig.targetRotation.set(active?.02:0,active?(opening?-.03:activeRotation):1.43+(index%3-1)*.018,0);rig.targetScale=targetScale;rig.insideCoverArt.visible=opening;rig.chapterPageArt.visible=opening;rig.spineLabel.visible=!active||inspecting;rig.spine.visible=true;rig.back.visible=!active||opening||inspecting;
    });
    memoryPositionShelfMore(viewport,layout);
  }

function memoryDisposeThreeShelf(){
    if(memoryThreeShelf) memoryThreeShelf.rigs.forEach(rig=>{rig.spine.material=rig.cloth;rig.back.material=rig.cloth;rig.coverShell.material=rig.coverCloth;rig.lining.dispose();});
    const shelf=memoryThreeShelf;if(!shelf) return;cancelAnimationFrame(shelf.frame);shelf.resize?.disconnect();shelf.scene.traverse(object=>{object.geometry?.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.filter(Boolean).forEach(material=>{material.map?.dispose();material.bumpMap?.dispose();material.dispose();});});shelf.renderer.dispose();memoryThreeShelf=null;
  }

async function memoryInitThreeShelf(){
    const canvas=$('memoryShelfCanvas'),viewport=$('memoryShelfViewport');if(!canvas||!viewport) return;memoryDisposeThreeShelf();viewport.classList.add('webgl-pending');
    try{
      const THREE=await memoryEnsureThree();if(!canvas.isConnected) return;
      /* Canvas 2D 绘制不等 font-display:swap——字体未就绪时会把书名画成兜底雅黑且不再刷新，
         必须先等思源宋体 400 加载完成（失败/超时 1.5s 则回退系统衬线，不阻塞书架） */
      try{await Promise.race([document.fonts.load('400 58px "Noto Serif SC"'),new Promise(resolve=>setTimeout(resolve,1500))]);}catch(e){}
      const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(31,1,.1,30);camera.position.set(0,.45,7.2);camera.lookAt(0,.35,0);
      scene.add(new THREE.HemisphereLight(0xf7f8f4,0xc4c0b8,.78));const key=new THREE.DirectionalLight(0xfff8ea,1.12);key.position.set(-3.5,6.5,5.5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00035;key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=4;key.shadow.camera.bottom=-3;scene.add(key);const rim=new THREE.DirectionalLight(0xc3d6dd,.3);rim.position.set(5,2,-3);scene.add(rim);
      const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,4),new THREE.MeshStandardMaterial({color:0xd7d5cd,roughness:1,metalness:0,transparent:true,opacity:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.13;floor.receiveShadow=true;scene.add(floor);
      const rigs=memoryShelfState.provinces.map((province,index)=>{const rig=memoryCreateThreeBook(THREE,province,index);scene.add(rig.root);return rig;});
      const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
      const pickBookIndex=event=>{const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(rigs.filter(rig=>rig.slotVisible).map(rig=>rig.root),true)[0],index=hit?.object?.userData?.bookIndex;return Number.isInteger(index)?index:-1;};
      const shelf={THREE,renderer,scene,camera,rigs,raycaster,pointer,pickBookIndex,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,hoverIndex:-1,hoverX:0,hoverY:0,frame:0,openingAt:0,resize:null};memoryThreeShelf=shelf;memoryUpdateThreeShelfTargets();
      const resize=()=>{const rect=viewport.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.8);renderer.setPixelRatio(ratio);renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();memoryApplyShelfTransforms(true);};resize();shelf.resize=new ResizeObserver(resize);shelf.resize.observe(viewport);
      canvas.addEventListener('pointermove',event=>{if(memoryShelfState.opening) return;shelf.hoverIndex=pickBookIndex(event);shelf.hoverX=pointer.x;shelf.hoverY=pointer.y;});
      canvas.addEventListener('pointerleave',()=>{shelf.hoverIndex=-1;shelf.hoverX=0;shelf.hoverY=0;});
      canvas.addEventListener('click',event=>{if(performance.now()<memoryShelfState.suppressClickUntil||memoryShelfState.opening) return;const index=pickBookIndex(event);if(index<0) return;if(index!==memoryShelfState.active) memorySetActive(index);else memoryOpenSelectedBook(memoryShelfState.provinces[index]);});
      rigs.forEach(rig=>{rig.root.position.copy(rig.target);rig.root.rotation.copy(rig.targetRotation);rig.root.scale.setScalar(rig.targetScale);});
      const clock=new THREE.Clock(),animate=()=>{if(memoryThreeShelf!==shelf) return;const delta=Math.min(.05,clock.getDelta());rigs.forEach((rig,index)=>{const speed=memoryShelfState.opening?8:5.5,selected=index===memoryShelfState.active,rotating=selected&&memoryShelfState.bookRotation!==null,rotationSpeed=rotating?18:(shelf.reduceMotion?24:speed),hovered=!shelf.reduceMotion&&index===shelf.hoverIndex&&!memoryShelfState.opening,hoverDepth=hovered?(selected?.08:.26):0;rig.root.position.x=THREE.MathUtils.damp(rig.root.position.x,rig.target.x,speed,delta);rig.root.position.y=THREE.MathUtils.damp(rig.root.position.y,rig.target.y,speed,delta);rig.root.position.z=THREE.MathUtils.damp(rig.root.position.z,rig.target.z+hoverDepth,9,delta);rig.root.rotation.x=THREE.MathUtils.damp(rig.root.rotation.x,rig.targetRotation.x,speed,delta);rig.root.rotation.y=THREE.MathUtils.damp(rig.root.rotation.y,rig.targetRotation.y,rotationSpeed,delta);const scale=THREE.MathUtils.damp(rig.root.scale.x,rig.targetScale,speed,delta);rig.root.scale.setScalar(scale);rig.motion.position.z=THREE.MathUtils.damp(rig.motion.position.z,0,9,delta);rig.motion.rotation.x=THREE.MathUtils.damp(rig.motion.rotation.x,0,9,delta);rig.motion.rotation.y=THREE.MathUtils.damp(rig.motion.rotation.y,0,9,delta);rig.motion.scale.setScalar(THREE.MathUtils.damp(rig.motion.scale.x,1,9,delta));rig.coverPivot.rotation.y=THREE.MathUtils.damp(rig.coverPivot.rotation.y,memoryShelfState.opening&&selected?-1.82:0,7,delta);if(memoryShelfState.opening&&!selected) rig.target.x+=delta*5;});renderer.render(scene,camera);shelf.frame=requestAnimationFrame(animate);};animate();viewport.classList.add('webgl-ready');viewport.classList.remove('webgl-pending');
    }catch(error){console.warn('3D 书架初始化失败，已回退到 CSS 书架',error);memoryDisposeThreeShelf();viewport.classList.remove('webgl-pending');}
  }

function memoryUpdateShelfOverflow(viewport,layout){
    const more=$('memoryShelfMore');if(!more) return;layout=layout||memoryShelfLayout(viewport,memoryShelfState.provinces.length);more.hidden=layout.hidden===0;
    more.disabled=memoryShelfState.paging;
    if(layout.hidden){more.textContent='›';more.dataset.step=String(Math.max(1,layout.capacity));more.setAttribute('aria-label','向后浏览下一组省份书籍');}
  }

function memoryPositionShelfMore(viewport,layout){
    const more=$('memoryShelfMore');if(!viewport||!more||more.hidden) return;layout=layout||memoryShelfLayout(viewport,memoryShelfState.provinces.length);
    let x=viewport.clientWidth-(more.offsetWidth||28)-2;
    if(memoryThreeShelf&&!memoryShelfState.pageShift){
      const total=memoryThreeShelf.rigs.length,last=memoryThreeShelf.rigs.find((rig,index)=>index!==memoryShelfState.active&&(index-memoryShelfState.active-1+total)%total===layout.capacity-1);
      if(last){memoryThreeShelf.camera.updateMatrixWorld();const point=last.target.clone().project(memoryThreeShelf.camera);x=(point.x+1)*.5*viewport.clientWidth+78;}
    }else if(!memoryThreeShelf&&!memoryShelfState.pageShift){
      const bookWidth=viewport.querySelector('.memory-book')?.offsetWidth||308,mainX=Math.max(20,Math.min(viewport.clientWidth*.13,154)),spineStart=mainX+bookWidth+(viewport.clientWidth<620?12:24);x=spineStart+Math.max(0,layout.capacity-1)*layout.gap+84;
    }
    more.style.left=Math.round(Math.max(2,Math.min(viewport.clientWidth-(more.offsetWidth||28)-2,x)))+'px';
  }

function memoryApplyShelfTransforms(instant){
    const viewport=$('memoryShelfViewport');
    if(!viewport) return;
    const books=[...viewport.querySelectorAll('.memory-book')],total=books.length;
    const bookWidth=books[0]?.offsetWidth||308,mainX=Math.max(20,Math.min(viewport.clientWidth*.13,154));
    const layout=memoryShelfLayout(viewport,total),gap=layout.gap,spineStart=mainX+bookWidth+(viewport.clientWidth<620?12:24);
    viewport.querySelectorAll('.memory-book').forEach((book,index)=>{
      const active=index===memoryShelfState.active;
      const slot=active?-1:(index-memoryShelfState.active-1+total)%total;
      const visible=active||slot<layout.capacity+(memoryShelfState.pageShift?layout.capacity:0);
      const offset=memoryShelfState.dragOffset*(active ? .16 : .34)-memoryShelfState.pageShift*gap*(active?.08:1);
      const x=active?mainX+offset:spineStart+slot*gap+offset;
      const y=active?0:Math.abs(((index*7)%9)-4);
      const z=active?72:-34-slot*20;
      const rotateX=active?.8:0,rotate=active?(memoryShelfState.bookRotation===null?-3.5:memoryShelfState.bookRotation):84+((index%3)-1)*1.1;
      const scale=active?1:Math.max(.76,.93-slot*.025);
      book.style.transition=instant?'none':'';
      book.style.transform='translate3d('+x+'px,'+y+'px,'+z+'px) rotateX('+rotateX+'deg) rotateY('+rotate+'deg) scale('+scale+')';
      book.style.opacity=String(active?1:Math.max(.36,.9-slot*.075));
      book.style.filter=active?'brightness(1.06)':'brightness('+Math.max(.72,1-slot*.04)+') saturate(.9)';
      book.style.zIndex=String(active?30:20-slot);book.dataset.shelfSlot=String(slot);
      book.style.visibility=visible?'visible':'hidden';book.style.pointerEvents=visible?'':'none';book.setAttribute('aria-hidden',visible?'false':'true');
      book.classList.toggle('active',active);
      book.classList.toggle('inspecting',active&&memoryShelfState.bookRotation!==null&&Math.abs(memoryShelfState.bookRotation)>1);
      if(!active){book.style.setProperty('--book-tilt-x','0deg');book.style.setProperty('--book-tilt-y','0deg');}
      book.tabIndex=active?0:-1;
      book.setAttribute('aria-current',active?'true':'false');
      if(instant&&!viewport.classList.contains('dragging')&&!viewport.classList.contains('rotating')) requestAnimationFrame(()=>{book.style.transition='';});
    });
    memoryUpdateShelfOverflow(viewport,layout);memoryPositionShelfMore(viewport,layout);memoryUpdateThreeShelfTargets();
    if(instant&&memoryThreeShelf?.reduceMotion) memoryThreeShelf.rigs.forEach(rig=>{rig.root.position.copy(rig.target);rig.root.rotation.copy(rig.targetRotation);rig.root.scale.setScalar(rig.targetScale);});
  }

function memoryBindShelf(){
    const viewport=$('memoryShelfViewport');
    if(!viewport) return;
    let pointerId=null,startX=0,lastX=0,lastTime=0,velocity=0,moved=false,mode=null,holdTimer=0,rotationDistance=150;
    const clearHold=()=>{if(holdTimer){clearTimeout(holdTimer);holdTimer=0;}};
    const pickedBookIndex=event=>{
      const book=event.target?.closest?.('.memory-book');
      if(book) return Number(book.dataset.memoryBook);
      return memoryThreeShelf?.pickBookIndex?.(event)??-1;
    };
    const beginBookRotation=()=>{
      if(pointerId===null||mode!=='pending'||memoryShelfState.opening) return;
      clearHold();mode='book';moved=true;memoryShelfState.dragOffset=0;memoryShelfState.bookRotation=0;
      viewport.setPointerCapture(pointerId);viewport.classList.add('rotating');memoryApplyShelfTransforms(true);
    };
    const finish=event=>{
      clearHold();if(pointerId===null||(event&&event.pointerId!==pointerId)) return;
      if(event&&viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
      if(mode==='book'){
        memoryShelfState.suppressClickUntil=performance.now()+220;memoryShelfState.bookRotation=null;
        pointerId=null;mode=null;viewport.classList.remove('rotating');
        memoryApplyShelfTransforms(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);return;
      }
      if(mode==='pending'){pointerId=null;mode=null;return;}
      const gap=memoryShelfGap(viewport);
      const projected=memoryShelfState.dragOffset+velocity*110;
      const shift=Math.max(-2,Math.min(2,Math.round(-projected/gap)));
      if(moved) memoryShelfState.suppressClickUntil=performance.now()+180;
      pointerId=null;mode=null;viewport.classList.remove('dragging');
      memorySetActive(memoryShelfState.active+shift,false);
    };
    viewport.addEventListener('pointerdown',event=>{
      if(event.target?.closest?.('.memory-shelf-more')||(event.button!==undefined&&event.button!==0)||memoryShelfState.opening) return;
      pointerId=event.pointerId;startX=lastX=event.clientX;lastTime=performance.now();velocity=0;moved=false;
      const active=viewport.querySelector('.memory-book.active');
      if(active){active.style.setProperty('--book-tilt-x','0deg');active.style.setProperty('--book-tilt-y','0deg');}
      const pressedActive=pickedBookIndex(event)===memoryShelfState.active;
      mode=pressedActive?'pending':'shelf';rotationDistance=Math.max(140,(active?.offsetWidth||308)*.56);
      if(pressedActive) holdTimer=setTimeout(beginBookRotation,180);
    });
    viewport.addEventListener('pointermove',event=>{
      if(pointerId===null||event.pointerId!==pointerId) return;
      const totalDx=event.clientX-startX;
      if(mode==='pending'){
        if(Math.abs(totalDx)>6) beginBookRotation();
        else return;
      }
      if(mode==='book'){
        event.preventDefault();
        memoryShelfState.bookRotation=Math.max(-65,Math.min(65,totalDx/rotationDistance*65));
        memoryShelfState.suppressClickUntil=performance.now()+220;memoryApplyShelfTransforms(true);return;
      }
      const now=performance.now(),dx=event.clientX-lastX,dt=Math.max(1,now-lastTime);
      memoryShelfState.dragOffset=totalDx;
      velocity=velocity*.58+(dx/dt)*.42;lastX=event.clientX;lastTime=now;
      if(!moved&&Math.abs(memoryShelfState.dragOffset)>7){
        moved=true;
        viewport.setPointerCapture(pointerId);
        viewport.classList.add('dragging');
      }
      memoryApplyShelfTransforms(true);
    });
    viewport.addEventListener('pointerup',finish);
    viewport.addEventListener('pointercancel',finish);
    viewport.addEventListener('pointerleave',event=>{
      const active=viewport.querySelector('.memory-book.active');
      if(active){active.style.setProperty('--book-tilt-x','0deg');active.style.setProperty('--book-tilt-y','0deg');}
      if(pointerId!==null&&!viewport.hasPointerCapture(pointerId)) finish(event);
    });
    viewport.addEventListener('wheel',event=>{
      event.preventDefault();
      const now=performance.now();
      if(now-memoryShelfState.wheelAt<220) return;
      memoryShelfState.wheelAt=now;
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      memorySetActive(memoryShelfState.active+(delta>0?1:-1));
    },{passive:false});
    viewport.addEventListener('keydown',event=>{
      if(event.target?.closest?.('.memory-shelf-more')||memoryShelfState.opening) return;
      if(event.key==='ArrowLeft'){event.preventDefault();memorySetActive(memoryShelfState.active-1);}
      if(event.key==='ArrowRight'){event.preventDefault();memorySetActive(memoryShelfState.active+1);}
      if(event.key==='Enter'||event.key===' '){event.preventDefault();memoryOpenSelectedBook(memoryShelfState.provinces[memoryShelfState.active]);}
    });
    viewport.querySelectorAll('.memory-book').forEach((book,index)=>book.addEventListener('click',()=>{
      if(performance.now()<memoryShelfState.suppressClickUntil) return;
      if(index!==memoryShelfState.active){memorySetActive(index);return;}
      memoryOpenSelectedBook(memoryShelfState.provinces[index]);
    }));
    $('memoryShelfMore')?.addEventListener('click',event=>{event.stopPropagation();memoryPageShelf(Number(event.currentTarget.dataset.step)||1);});
  }

function memoryPageShelf(step){
    if(memoryShelfState.opening||memoryShelfState.paging) return;
    const total=memoryShelfState.provinces.length;if(total<2) return;const viewport=$('memoryShelfViewport'),reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    memoryShelfState.paging=true;memoryShelfState.pageShift=Math.max(1,Math.min(total-1,step));viewport?.classList.add('paging');memoryApplyShelfTransforms(reduce);
    clearTimeout(memoryShelfState.pageTimer);memoryShelfState.pageTimer=setTimeout(()=>{const next=(memoryShelfState.active+memoryShelfState.pageShift)%total;memoryShelfState.pageShift=0;memoryShelfState.paging=false;viewport?.classList.remove('paging');memorySetActive(next,reduce);},reduce?0:560);
  }

function memoryOpenSelectedBook(province){
    const viewport=$('memoryShelfViewport'),book=viewport?.querySelector('.memory-book.active');
    if(!province||!viewport||!book||memoryShelfState.opening) return;
    memoryShelfState.bookRotation=null;memoryShelfState.opening=true;viewport.classList.add('opening');book.classList.add('opening');memoryUpdateThreeShelfTargets();
    const activeIndex=memoryShelfState.active;
    clearTimeout(memoryShelfState.openTimer);
    const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    memoryShelfState.openTimer=setTimeout(()=>{
      if(!memoryShelfOverlayEl.classList.contains('show')||memoryShelfState.active!==activeIndex){memoryShelfState.opening=false;return;}
      memoryShelfState.opening=false;memoryOpenChapters(province);
    },reduceMotion?0:880);
  }

function memoryBookPalette(index=0){
    return MEMORY_BOOK_COLORS[index%MEMORY_BOOK_COLORS.length];
  }

function memoryShelfGap(viewport){
    return viewport.clientWidth<620?40:(viewport.clientWidth<900?46:52);
  }

function memoryShelfLayout(viewport,total){
    if(!viewport) return {capacity:Math.max(0,total-1),gap:52,hidden:0};
    const availableBooks=Math.max(0,total-1),bookWidth=viewport.querySelector('.memory-book')?.offsetWidth||(viewport.clientWidth<620?196:(viewport.clientWidth<1060?265:308));
    const mainX=Math.max(20,Math.min(viewport.clientWidth*.13,154)),spineStart=mainX+bookWidth+(viewport.clientWidth<620?12:24),edgeSpace=viewport.clientWidth<620?72:94,slotWidth=viewport.clientWidth<620?42:(viewport.clientWidth<900?56:64);
    const usable=Math.max(slotWidth,viewport.clientWidth-spineStart-edgeSpace),viewportHeight=viewport.clientHeight||Math.max(480,viewport.clientWidth*.72),halfView=Math.tan(31*Math.PI/360)*7.2*(viewport.clientWidth/viewportHeight),threeCapacity=Math.max(1,Math.floor((halfView-.56)/.36)+1);
    const capacity=availableBooks?Math.min(availableBooks,Math.max(1,Math.floor(usable/slotWidth)),threeCapacity):0;
    return {capacity,gap:Math.min(memoryShelfGap(viewport),usable/Math.max(1,capacity)),hidden:Math.max(0,availableBooks-capacity)};
  }

function memoryProvinceBookSettings(){
    const settings=getUserProfile().memoryProvinceBooks;
    return settings&&typeof settings==='object'&&!Array.isArray(settings)?settings:{};
  }

function memoryInfoHtml(province,index,total){
    const dateText=memoryProvinceDateText(province),review=String(province.review||'').trim();
    return '<aside class="memory-province-info" id="memoryProvinceInfo" aria-live="polite">'+
      '<span class="memory-info-count">记忆 '+String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')+'</span>'+
      '<div class="memory-info-heading"><h3 class="memory-info-name'+(province.name.length>7?' extra-long':province.name.length>3?' long':'')+'">'+escapeHtml(province.name)+'</h3><div class="memory-province-actions"><button class="memory-province-edit" type="button" data-memory-province-edit aria-label="编辑'+escapeHtml(province.name)+'书籍信息">编辑</button></div></div>'+
      '<div class="memory-info-stats"><span><b>'+province.cities.length+'</b> 座城市</span><span><b>'+province.photoCount+'</b> 张照片</span></div>'+
      '<div class="memory-info-cities">'+province.cities.map(city=>'<span>'+escapeHtml(city.name)+'</span>').join('')+'</div>'+
      '<div class="memory-info-date"><span>旅行时间</span><strong>'+escapeHtml(dateText)+'</strong></div>'+
      '<div class="memory-info-review-block" aria-label="省份评价"><p class="memory-info-review'+(review?'':' is-empty')+'">'+escapeHtml(review||'尚未填写评价')+'</p></div>'+
      '<p class="memory-info-note">省份是一本书，城市是其中的一章。选中书籍后再次点击即可翻开。</p>'+
    '</aside>';
  }

function memoryProvinceDateText(province){
    return province.firstMonth
      ?formatMonth(province.firstMonth)+(province.latestMonth&&province.latestMonth!==province.firstMonth?' 至 '+formatMonth(province.latestMonth):'')
      :'时间尚未记录';
  }

function renderMemoryShelf(){
    clearTimeout(memoryShelfState.pageTimer);memoryShelfState.level='shelf';memoryShelfState.province=null;memoryShelfState.city=null;memoryShelfState.photos=[];memoryShelfState.page=0;memoryShelfState.dragOffset=0;memoryShelfState.pageShift=0;memoryShelfState.paging=false;memoryShelfState.bookRotation=null;memoryShelfState.opening=false;
    memorySetHeader('旅行书架','拖动书架选择省份，长按中心书籍可左右旋转，再次点击即可翻开城市章节。');
    if(!memoryShelfState.provinces.length){
      memoryShelfBodyEl.innerHTML='<div class="memory-empty"><strong>你的旅行故事还没有开始</strong><span>点亮第一座城市，它会成为书架上的第一本书。</span><button id="memoryLightFirst" type="button">去点亮城市</button></div>';
      $('memoryLightFirst').addEventListener('click',()=>{closeMemoryShelf();openCityAddDialog();});
      return;
    }
    const active=memoryShelfState.provinces[memoryShelfState.active]||memoryShelfState.provinces[0];
    memoryShelfBodyEl.innerHTML='<div class="memory-shelf-scene">'+memoryInfoHtml(active,memoryShelfState.active,memoryShelfState.provinces.length)+
      '<section class="memory-shelf-viewport" id="memoryShelfViewport" tabindex="0" aria-label="拖动浏览省份书籍，长按中心书籍可左右旋转">'+
        '<canvas class="memory-shelf-webgl" id="memoryShelfCanvas" aria-hidden="true"></canvas><div class="memory-shelf-floor" aria-hidden="true"></div><div class="memory-shelf-track">'+
          memoryShelfState.provinces.map((province,index)=>{
            const colors=memoryBookPalette(index),range=province.firstMonth?(province.firstMonth.slice(0,4)+(province.latestMonth&&province.latestMonth.slice(0,4)!==province.firstMonth.slice(0,4)?' - '+province.latestMonth.slice(0,4):'')):'待记录';
            const chapterPreview=province.cities.slice(0,5).map((city,cityIndex)=>'<span class="memory-book-opening-entry"><span>'+String(cityIndex+1).padStart(2,'0')+'</span><b>'+escapeHtml(city.name)+'</b><small>'+city.photoCount+' 张</small></span>').join('');
            return '<button class="memory-book" type="button" data-memory-book="'+index+'" aria-label="打开'+escapeHtml(province.name)+'旅行记忆" style="--book-cover:'+colors[0]+';--book-edge:#e8dfd0;--book-ink:'+colors[2]+';--book-accent:'+colors[3]+'">'+
              '<span class="memory-book-shadow" aria-hidden="true"></span><span class="memory-book-object"><span class="memory-book-back" aria-hidden="true"></span><span class="memory-book-page-face" aria-hidden="true"><span class="memory-book-opening-page"><span class="memory-book-opening-page-label"><span>城市章节</span><span>'+escapeHtml(province.name)+'</span></span>'+chapterPreview+'</span></span><span class="memory-book-page-edge" aria-hidden="true"></span><span class="memory-book-edge-top" aria-hidden="true"></span><span class="memory-book-edge-bottom" aria-hidden="true"></span><span class="memory-book-spine-face" aria-hidden="true"><span class="memory-book-spine-copy"><small>'+String(index+1).padStart(2,'0')+'</small><b>'+escapeHtml(province.name)+'</b><i>旅行记忆</i></span></span>'+
              '<span class="memory-book-cover-inside" aria-hidden="true"><span class="memory-book-opening-photo"'+(province.cover?' style="background-image:url(\''+province.cover.replace(/'/g,"%27")+'\')"':'')+'></span><span class="memory-book-opening-summary"><small>省份旅行记忆</small><strong>'+escapeHtml(province.name)+'</strong><span>'+escapeHtml(province.cities.map(city=>city.name).join('、'))+'</span><span class="memory-book-opening-totals">'+province.cities.length+' 个城市章节　'+province.photoCount+' 张旅行照片</span></span></span>'+
              '<span class="memory-book-cover"><span class="memory-book-mark" aria-hidden="true"></span><span class="memory-book-index">旅行手册</span><strong class="memory-book-title'+(province.name.length>7?' extra-long':province.name.length>4?' long':'')+'">'+escapeHtml(province.name)+'</strong><span class="memory-book-subtitle">私人旅行纪念册</span>'+
              '<span class="memory-book-photo"'+(province.cover?' style="background-image:url(\''+province.cover.replace(/'/g,"%27")+'\')"':'')+'></span><span class="memory-book-meta"><span>'+province.cities.length+' 座城市</span><span>'+province.photoCount+' 张照片</span><span>'+escapeHtml(range)+'</span></span><span class="memory-book-open">打开旅程</span></span></span></button>';
          }).join('')+
        '</div><button class="memory-shelf-more" id="memoryShelfMore" type="button" hidden></button><div class="memory-shelf-hint">拖动书架浏览，长按中心书籍左右旋转</div></section></div>';
    memoryApplyShelfTransforms(true);memoryBindShelf();memoryInitThreeShelf();
  }


/* —— 补全 memoryCreateThreeBook 依赖的纹理与辅助函数 —— */
function memoryClothTextures(THREE,color,index){
    const width=160,height=320,albedo=document.createElement('canvas'),bump=document.createElement('canvas');albedo.width=bump.width=width;albedo.height=bump.height=height;
    const ctx=albedo.getContext('2d'),bctx=bump.getContext('2d');let seed=((index+1)*2654435761)>>>0;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    ctx.fillStyle=color;ctx.fillRect(0,0,width,height);
    for(let i=0;i<54;i++){ctx.fillStyle=random()>.5?'rgba(255,255,255,.018)':'rgba(24,31,31,.018)';ctx.beginPath();ctx.ellipse(random()*width,random()*height,8+random()*28,10+random()*42,random()*.7,0,Math.PI*2);ctx.fill();}
    ctx.lineWidth=.55;for(let x=.5;x<width;x+=3){ctx.strokeStyle=x%6<1?'rgba(255,255,255,.085)':'rgba(24,33,34,.065)';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+(random()-.5)*1.3,height);ctx.stroke();}
    ctx.setLineDash([2,2]);ctx.lineWidth=.45;for(let y=.5;y<height;y+=4){ctx.lineDashOffset=y%8<1?0:2;ctx.strokeStyle=y%8<1?'rgba(255,255,255,.07)':'rgba(27,35,36,.055)';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y+(random()-.5)*.8);ctx.stroke();}ctx.setLineDash([]);
    for(let i=0;i<180;i++){const light=random()>.52;ctx.strokeStyle=light?'rgba(255,255,255,.075)':'rgba(28,36,37,.06)';ctx.lineWidth=.35+random()*.35;const x=random()*width,y=random()*height;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*9,y+(random()-.5)*2);ctx.stroke();}
    bctx.fillStyle='#808080';bctx.fillRect(0,0,width,height);bctx.lineWidth=1;for(let x=.5;x<width;x+=3){bctx.strokeStyle=x%6<1?'#929292':'#747474';bctx.beginPath();bctx.moveTo(x,0);bctx.lineTo(x,height);bctx.stroke();}bctx.setLineDash([2,2]);for(let y=.5;y<height;y+=4){bctx.lineDashOffset=y%8<1?0:2;bctx.strokeStyle=y%8<1?'#8d8d8d':'#777';bctx.beginPath();bctx.moveTo(0,y);bctx.lineTo(width,y);bctx.stroke();}
    const map=new THREE.CanvasTexture(albedo),bumpMap=new THREE.CanvasTexture(bump);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=bumpMap.wrapS=bumpMap.wrapT=THREE.RepeatWrapping;map.repeat.set(1.2,2.7);bumpMap.repeat.copy(map.repeat);map.anisotropy=bumpMap.anisotropy=8;return {map,bumpMap};
  }

function memoryPageEdgeTexture(THREE,color){
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,64,512);
    ctx.strokeStyle='rgba(122,99,74,.06)';ctx.lineWidth=1;for(let y=2;y<512;y+=4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(64,y);ctx.stroke();}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
  }

function memoryChapterPreviewTexture(THREE,province,side){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
    const ctx=canvas.getContext('2d'),isLeft=side==='left';
    const wrapText=(text,x,y,maxWidth,lineHeight,maxLines)=>{
      let line='',lineIndex=0;
      for(const char of [...text]){
        const next=line+char;
        if(line&&ctx.measureText(next).width>maxWidth){ctx.fillText(line,x,y+lineIndex*lineHeight);line=char;lineIndex++;if(lineIndex>=maxLines) return;}
        else line=next;
      }
      if(line&&lineIndex<maxLines) ctx.fillText(line,x,y+lineIndex*lineHeight);
    };
    const paint=image=>{
      ctx.clearRect(0,0,512,768);ctx.filter='none';
      const paper=ctx.createLinearGradient(0,0,512,0);
      if(isLeft){paper.addColorStop(0,'#f4efe4');paper.addColorStop(.94,'#f4efe4');paper.addColorStop(1,'#e7dfd1');}
      else{paper.addColorStop(0,'#e7dfd1');paper.addColorStop(.06,'#f4efe4');paper.addColorStop(1,'#f4efe4');}
      ctx.fillStyle=paper;ctx.fillRect(0,0,512,768);
      ctx.globalAlpha=.07;ctx.strokeStyle='#8d7c65';ctx.lineWidth=.5;for(let y=3;y<768;y+=6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y+1);ctx.stroke();}ctx.globalAlpha=1;
      ctx.fillStyle='rgba(122,99,74,.035)';for(let y=11;y<768;y+=19){for(let x=9;x<512;x+=23){ctx.fillRect(x+(y%7),y,1,1);}}
      if(isLeft){
        if(image){ctx.save();ctx.beginPath();ctx.rect(0,0,512,330);ctx.clip();const scale=Math.max(512/image.width,330/image.height),w=image.width*scale,h=image.height*scale;ctx.filter='saturate(1.08) contrast(1.04) brightness(1.03)';ctx.drawImage(image,(512-w)/2,(330-h)/2,w,h);ctx.filter='none';ctx.restore();}
        else{ctx.fillStyle='#eee8dc';ctx.fillRect(0,0,512,330);}
        const wash=ctx.createLinearGradient(0,190,0,330);wash.addColorStop(0,'rgba(25,48,62,0)');wash.addColorStop(1,'rgba(25,48,62,.34)');ctx.fillStyle=wash;ctx.fillRect(0,190,512,140);
        ctx.fillStyle='#547383';ctx.font='600 15px "Microsoft YaHei",Arial';ctx.fillText('省份旅行记忆',48,382);
        ctx.fillStyle='#1d3342';ctx.font='500 60px "Noto Serif SC","Source Han Serif SC","STSong","SimSun",serif';ctx.fillText(province.name,48,456);
        ctx.fillStyle='#67808f';ctx.font='500 17px "Microsoft YaHei",Arial';wrapText(province.cities.map(city=>city.name).join('、'),48,500,416,30,2);
        ctx.fillStyle='rgba(43,75,92,.18)';ctx.fillRect(48,574,416,1);
        ctx.fillStyle='#203b4c';ctx.font='700 34px "Microsoft YaHei",Arial';ctx.fillText(String(province.cities.length),48,638);ctx.fillText(String(province.photoCount),178,638);
        ctx.fillStyle='#567283';ctx.font='500 14px "Microsoft YaHei",Arial';ctx.fillText('城市章节',48,666);ctx.fillText('旅行照片',178,666);
      }else{
        const spineShade=ctx.createLinearGradient(0,0,24,0);spineShade.addColorStop(0,'rgba(76,58,42,.06)');spineShade.addColorStop(1,'rgba(76,58,42,0)');ctx.fillStyle=spineShade;ctx.fillRect(0,0,24,768);
        ctx.fillStyle='#527386';ctx.font='600 15px "Microsoft YaHei",Arial';ctx.fillText('城市章节',54,64);ctx.textAlign='right';ctx.fillText(province.name,458,64);ctx.textAlign='left';
        const cities=province.cities.slice(0,6),rowHeight=91;
        cities.forEach((city,index)=>{
          const top=103+index*rowHeight;
          ctx.fillStyle='rgba(43,75,92,.15)';ctx.fillRect(54,top+70,404,1);
          ctx.fillStyle='#79909d';ctx.font='600 20px "Playfair Display",Georgia,serif';ctx.fillText(String(index+1).padStart(2,'0'),58,top+28);
          ctx.fillStyle='#284252';ctx.font='600 21px "Microsoft YaHei",Arial';ctx.fillText(city.name,118,top+25);
          ctx.fillStyle='#7c919c';ctx.font='500 13px "Microsoft YaHei",Arial';ctx.fillText(city.firstMonth?formatMonth(city.firstMonth):'时间未记录',118,top+50);
          ctx.textAlign='right';ctx.fillStyle='#65808f';ctx.font='500 13px "Microsoft YaHei",Arial';ctx.fillText(city.photoCount+' 张照片',454,top+31);ctx.textAlign='left';
        });
        if(province.cities.length>6){ctx.fillStyle='#6d8490';ctx.font='500 13px "Microsoft YaHei",Arial';ctx.fillText('另有 '+(province.cities.length-6)+' 座城市',54,724);}
      }
    };
    paint();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    if(isLeft&&province.cover){const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{paint(image);texture.needsUpdate=true;};image.src=province.cover;}
    return texture;
  }

function memorySpineLabelMaterial(THREE,province,index,ink){
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=768;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,192,768);
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 40px "Microsoft YaHei","Source Han Sans SC",Arial,sans-serif';const numberChars=[...String(index+1).padStart(2,'0')],numberGap=10,numberWidths=numberChars.map(char=>ctx.measureText(char).width),numberWidth=numberWidths.reduce((sum,width)=>sum+width,0)+numberGap*(numberChars.length-1);let numberX=96-numberWidth*.5;numberChars.forEach((char,i)=>{const width=numberWidths[i];ctx.fillText(char,numberX+width*.5,80);numberX+=width+numberGap;});ctx.save();ctx.globalAlpha=.58;ctx.strokeStyle=ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(58,138);ctx.lineTo(134,138);ctx.stroke();ctx.restore();
    const chars=[...province.name],gap=Math.min(108,370/Math.max(1,chars.length-1)),nameSize=Math.max(34,Math.min(82,Math.floor(gap*.82)));ctx.font='700 '+nameSize+'px "Microsoft YaHei","Source Han Sans SC","Noto Sans CJK SC",Arial,sans-serif';ctx.lineWidth=2;ctx.strokeStyle=ink;const start=384-(chars.length-1)*gap*.5;chars.forEach((char,i)=>{ctx.strokeText(char,96,start+i*gap);ctx.fillText(char,96,start+i*gap);});
    ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(62,630);ctx.lineTo(130,630);ctx.stroke();ctx.restore();ctx.fillStyle=ink;ctx.font='700 28px "Microsoft YaHei UI","Microsoft YaHei","Source Han Sans SC",Arial,sans-serif';
    const footerChars=[...'旅行记忆'],footerGap=15,footerWidths=footerChars.map(char=>ctx.measureText(char).width),footerWidth=footerWidths.reduce((sum,width)=>sum+width,0)+footerGap*(footerChars.length-1);let footerX=96-footerWidth*.5;footerChars.forEach((char,i)=>{const width=footerWidths[i],center=footerX+width*.5;ctx.fillText(char,center,682);footerX+=width+footerGap;});
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  }

function memorySetActive(index,instant){
    if(memoryShelfState.opening) return;
    // 循环切换：原来用 Math.min/max 夹在 [0, max] 里，滚轮到最后一本就停住了。
    // 改成取模：最后一本再往后就是第一本，第一本往前也会绕回最后一本。
    const total=memoryShelfState.provinces.length;
    const next=total?(((index%total)+total)%total):0;
    const changed=next!==memoryShelfState.active;
    memoryShelfState.active=next;
    memoryShelfState.dragOffset=0;memoryShelfState.bookRotation=null;
    memoryApplyShelfTransforms(!!instant);
    if(changed){
      memoryUpdateProvinceInfo();
      const viewport=$('memoryShelfViewport');
      if(viewport&&!instant){
        clearTimeout(memoryShelfState.switchTimer);viewport.classList.remove('switching');void viewport.offsetWidth;viewport.classList.add('switching');
        memoryShelfState.switchTimer=setTimeout(()=>viewport.classList.remove('switching'),820);
      }
    }
  }

function memoryBookCoverTexture(THREE,province,index){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;
    const ctx=canvas.getContext('2d'),paper='#f3f0e8',ink='#253943',paint=image=>{
      ctx.clearRect(0,0,512,768);ctx.filter='none';ctx.fillStyle=paper;ctx.fillRect(0,0,512,768);
      const shade=ctx.createLinearGradient(0,0,0,768);shade.addColorStop(0,'rgba(255,255,255,.16)');shade.addColorStop(.18,'rgba(255,255,255,0)');shade.addColorStop(.86,'rgba(77,70,55,0)');shade.addColorStop(1,'rgba(77,70,55,.035)');ctx.fillStyle=shade;ctx.fillRect(0,0,512,768);
      ctx.globalAlpha=.035;ctx.strokeStyle='#fff';ctx.lineWidth=.45;for(let y=2;y<768;y+=6){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y+1);ctx.stroke();}ctx.globalAlpha=1;
      ctx.fillStyle=ink;ctx.font='600 18px "Microsoft YaHei",Arial';ctx.fillText('旅行手册',72,62);ctx.textAlign='right';ctx.font='600 16px "Microsoft YaHei",Arial';ctx.fillText(String(index+1).padStart(2,'0'),462,62);ctx.textAlign='left';
      const titleLength=[...province.name].length,titleSize=Math.max(34,Math.min(68,Math.floor(390/Math.max(1,titleLength))));ctx.font='500 '+titleSize+'px "Noto Serif SC","Source Han Serif SC","STSong","SimSun",serif';ctx.fillText(province.name,72,158);
      if(image){ctx.save();ctx.beginPath();ctx.rect(0,180,512,588);ctx.clip();const scale=Math.max(512/image.width,588/image.height),w=image.width*scale,h=image.height*scale;ctx.filter='saturate(1.12) contrast(1.05) brightness(1.04)';ctx.drawImage(image,(512-w)/2,180+(588-h)/2,w,h);ctx.filter='none';ctx.restore();}
      else{ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(0,180,512,588);}
      const photoFade=ctx.createLinearGradient(0,170,0,330);photoFade.addColorStop(0,paper);photoFade.addColorStop(.24,'rgba(243,240,232,.96)');photoFade.addColorStop(1,'rgba(243,240,232,0)');ctx.fillStyle=photoFade;ctx.fillRect(0,170,512,160);
      const footerFade=ctx.createLinearGradient(0,630,0,768);footerFade.addColorStop(0,'rgba(18,31,35,0)');footerFade.addColorStop(1,'rgba(18,31,35,.42)');ctx.fillStyle=footerFade;ctx.fillRect(0,630,512,138);
      ctx.fillStyle='#f3f0e8';ctx.shadowColor='rgba(14,28,33,.88)';ctx.shadowBlur=4;ctx.shadowOffsetY=1;ctx.font='700 20px "Microsoft YaHei",Arial';ctx.fillText(province.cities.length+' 座城市　'+province.photoCount+' 张照片',72,724);ctx.textAlign='right';ctx.fillText('旅行记忆',462,724);ctx.textAlign='left';ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      const leftSeam=ctx.createLinearGradient(0,0,12,0);leftSeam.addColorStop(0,'rgba(71,94,103,.28)');leftSeam.addColorStop(.42,'rgba(132,153,160,.15)');leftSeam.addColorStop(1,'rgba(132,153,160,0)');ctx.fillStyle=leftSeam;ctx.fillRect(0,0,12,768);
      const rightSeam=ctx.createLinearGradient(503,0,512,0);rightSeam.addColorStop(0,'rgba(96,111,116,0)');rightSeam.addColorStop(.56,'rgba(96,111,116,.09)');rightSeam.addColorStop(1,'rgba(66,81,86,.23)');ctx.fillStyle=rightSeam;ctx.fillRect(503,0,9,768);
    };
    paint();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    if(province.cover){const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{paint(image);texture.needsUpdate=true;};image.src=province.cover;}
    return texture;
  }

const profile={memoryProvinceBooks:{},name:"",bio:""};
function memoryOpenChapters(province){
    if(!province) return;
    memoryDisposeAlbum3D();
    memoryDisposeThreeShelf();
    memoryShelfState.opening=false;memoryShelfState.level='chapters';memoryShelfState.province=province;memoryShelfState.city=null;
    memorySetHeader(province.name+'旅行章节','选择一座到达过的城市，翻开它的旅行相册。');
    const preview=province.cover||province.cities.find(city=>city.cover)?.cover||'';
    memoryShelfBodyEl.innerHTML='<div class="memory-chapters"><div class="memory-view-tools"><button class="memory-back" id="memoryBackShelf" type="button">返回书架</button><div class="memory-view-title"><span>城市章节</span><h3>'+escapeHtml(province.name)+'旅行记忆</h3></div></div>'+
      '<div class="memory-chapter-book"><section class="memory-chapter-page left"><div class="memory-chapter-cover" id="memoryChapterCover"'+(preview?' style="background-image:url(\''+preview.replace(/'/g,"%27")+'\')"':'')+'></div><span class="memory-chapter-label">省份旅行记忆</span><h4>'+escapeHtml(province.name)+'</h4><p>'+escapeHtml(province.cities.map(city=>city.name).join(' · '))+'</p><div class="memory-chapter-totals"><span><b>'+province.cities.length+'</b>城市章节</span><span><b>'+province.photoCount+'</b>旅行照片</span></div></section>'+
      '<section class="memory-chapter-page right"><div class="memory-chapter-list">'+province.cities.map((city,index)=>'<button class="memory-chapter-entry" type="button" data-memory-city="'+index+'"><span class="memory-chapter-no">'+String(index+1).padStart(2,'0')+'</span><span class="memory-chapter-copy"><b>'+escapeHtml(city.name)+'</b><span>'+(city.firstMonth?escapeHtml(formatMonth(city.firstMonth)):'时间未记录')+'</span></span><span class="memory-chapter-photos">'+city.photoCount+' 张照片</span></button>').join('')+'</div></section></div></div>';
    $('memoryBackShelf').addEventListener('click',renderMemoryShelf);
    memoryShelfBodyEl.querySelectorAll('[data-memory-city]').forEach(button=>{
      const city=province.cities[Number(button.dataset.memoryCity)];
      button.addEventListener('mouseenter',()=>{const cover=$('memoryChapterCover');if(cover&&city.cover) cover.style.backgroundImage='url("'+city.cover.replace(/"/g,'%22')+'")';});
      button.addEventListener('focus',()=>{const cover=$('memoryChapterCover');if(cover&&city.cover) cover.style.backgroundImage='url("'+city.cover.replace(/"/g,'%22')+'")';});
      button.addEventListener('click',()=>memoryOpenAlbum(province,city));
    });
  }

function memorySetHeader(title,intro){
    memoryShelfTitleEl.textContent=title;
    memoryShelfIntroEl.textContent=intro;
  }

const memoryProvinceBooks =JSON.parse(JSON.stringify(profile.memoryProvinceBooks||{}));
