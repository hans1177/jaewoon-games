// 파일명: web-games/party-rpg/view.mjs
// 임포트: 저장·전투를 변경하지 않는 단일 3D 표현 계층.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
const SCALE=1/36;
const HEROES=['warrior','rogue','cleric','wizard','ranger'];
const PROPS=['tree','tree-high','tree-crooked','rock-large','rock-small','rock-wide','wall','wall-wood','wall-door','wall-window-shutters','roof','roof-gable','roof-gable-end','chimney','fountain-round','cart','stall','lantern','pillar-stone','wall-broken','wall-arch','road','fence'];
const MONSTERS=['slime','orc','bunny','golem','ghost','winged'];
// 게임 내 전신 원화 순서. 초상화와 저장 데이터는 사용하지 않는다.
const ACTOR_ART=['warrior','rogue','cleric','wizard','ranger','slime','orc','bunny','golem','ghost','winged','civilian'];
export class PartyView{
 constructor(canvas,{onLoad=()=>{}}={}){
  this.canvas=canvas;this.models=new Map();this.actors=new Map();this.actorArt=null;this.actorBounds=[];this.staticRoot=new THREE.Group();this.worldSignature='';this.assetRevision=0;
  this.targetYaw=Math.PI/4;this.yaw=this.targetYaw;this.pitch=.73;this.zoom=1;this.targetZoom=1;this.offset=new THREE.Vector2();this.focus=new THREE.Vector3();this.follow='player';this.selection='player';this.destination=null;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.hit=new THREE.Vector3();this.lastAt=0;this.frameCost=16;this.quality=1;this.qualityAt=0;this.labels=[];this.lastLabelsAt=0;this.ready=false;this.worldMood=null;this.torchLights=[];this.torchFlames=[];this.climateParticles=null;this.weatherKind='clear';this.qualityPreset='auto';this.banners=[];this.terrainTint=new THREE.Color();
  try{
   this.gl=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=.83;this.gl.setClearColor(0x242a2a);this.gl.sortObjects=true;
   this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x49514f,12,58);this.scene.add(this.staticRoot);
   this.skyLight=new THREE.HemisphereLight(0xa0b0b6,0x252724,.81);this.scene.add(this.skyLight);this.sun=new THREE.DirectionalLight(0xbfc2bd,1.05);this.sun.position.set(-23,38,17);this.scene.add(this.sun);
   this.camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,180);this.camera.position.set(45,45,45);this.camera.lookAt(0,0,0);
   this.groundMaterials=new Map();this.effects=[];this.cameraImpact=0;this.weather=null;this.ringGeometry=new THREE.RingGeometry(.48,.53,32);this.ringMaterials={ally:new THREE.MeshBasicMaterial({color:0x89b37a,side:THREE.DoubleSide,depthWrite:false}),enemy:new THREE.MeshBasicMaterial({color:0xc16c61,side:THREE.DoubleSide,depthWrite:false}),select:new THREE.MeshBasicMaterial({color:0xf0d49c,side:THREE.DoubleSide,depthWrite:false})};
   this.marker=new THREE.Mesh(this.ringGeometry,this.ringMaterials.select);this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.scene.add(this.marker);
   // Low-poly stone clue marker: visible from the road without blocking combat.
   this.evidenceBeacon=new THREE.Group();
   const evidenceStone=new THREE.MeshStandardMaterial({color:0x454a47,roughness:1});
   const evidenceGold=new THREE.MeshStandardMaterial({color:0xa69472,roughness:.83,metalness:.2,emissive:0x2d2419});
   const tablet=new THREE.Mesh(new THREE.BoxGeometry(.55,.95,.23),evidenceStone);tablet.position.y=.48;
   const glyph=new THREE.Mesh(new THREE.TorusGeometry(.23,.035,6,18),evidenceGold);glyph.position.set(0,.68,.14);
   this.evidenceBeacon.add(tablet,glyph);this.scene.add(this.evidenceBeacon);this.evidenceBeacon.visible=false;

   this.labelRoot=document.createElement('div');this.labelRoot.id='worldLabels';this.labelRoot.setAttribute('aria-hidden','true');canvas.after(this.labelRoot);this.evidenceLabel=document.createElement('div');this.evidenceLabel.className='evidence-label';this.evidenceLabel.hidden=true;this.evidenceLabel.textContent='◆ 조사할 단서';this.labelRoot.append(this.evidenceLabel);
   this.ready=true;this.resize();this.load(onLoad);
  }catch(error){const status=document.getElementById('viewStatus');if(status){status.textContent='3D 화면을 시작하지 못했어. WebGL을 지원하는 브라우저에서 열어 줘.';status.hidden=false;}console.error('파티 RPG 새 렌더러 초기화 실패',error);}
 }
 async load(onLoad){
  // 원화 한 장을 공유한다. 배우마다 이미지·대형 프레임 텍스처를 복제하지 않는다.
  try{
   const art=await new THREE.TextureLoader().loadAsync(new URL('../../assets/shared/party/actors.webp',import.meta.url).href);
   art.colorSpace=THREE.SRGBColorSpace;art.magFilter=THREE.NearestFilter;art.minFilter=THREE.LinearMipmapLinearFilter;art.generateMipmaps=true;
   this.actorArt=art;
   const canvas=document.createElement('canvas');canvas.width=art.image.width;canvas.height=art.image.height;
   const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(art.image,0,0);
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
   for(let n=0;n<12;n++){
    const left=Math.round(n%4*canvas.width/4),right=Math.round((n%4+1)*canvas.width/4),top=Math.round(Math.floor(n/4)*canvas.height/3),bottom=Math.round((Math.floor(n/4)+1)*canvas.height/3);
    // 몸체와 주요 장비의 연결 영역만 경계 계산에 사용해 옆 셀의 칼끝을 제외한다.
    const width=right-left,height=bottom-top,visited=new Uint8Array(width*height),stack=new Int32Array(width*height),parts=[];
    for(let start=0;start<visited.length;start++){
     if(visited[start])continue;visited[start]=1;
     const sx=start%width,sy=Math.floor(start/width);
     if(pixels[((top+sy)*canvas.width+left+sx)*4+3]<=64)continue;
     let count=0,depth=1,x0=sx,x1=sx,y0=sy,y1=sy;stack[0]=start;
     while(depth){
      const id=stack[--depth],x=id%width,y=Math.floor(id/width);count++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
       if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
       const next=ny*width+nx;if(visited[next])continue;visited[next]=1;
       if(pixels[((top+ny)*canvas.width+left+nx)*4+3]>64)stack[depth++]=next;
      }
     }
     parts.push({count,x0,x1,y0,y1});
    }
    const largest=Math.max(0,...parts.map(p=>p.count));
    let x0=right,y0=bottom,x1=left,y1=top;
    for(const part of parts)if(part.count>=Math.max(16,largest*.025)){x0=Math.min(x0,left+part.x0);x1=Math.max(x1,left+part.x1);y0=Math.min(y0,top+part.y0);y1=Math.max(y1,top+part.y1);}
    if(x1<x0||y1<y0)throw new Error('전신 원화 셀이 비어 있어: '+n);
    this.actorBounds.push({u0:x0/canvas.width,u1:(x1+1)/canvas.width,v0:1-(y1+1)/canvas.height,v1:1-y0/canvas.height,aspect:(x1-x0+1)/(y1-y0+1)});
   }
  }catch(error){this.actorArt=null;this.actorBounds=[];console.warn('파티 전신 원화 적재 실패 · 기존 3D 모델 유지',error);}
  const order=[...HEROES,'tree','rock-large','wall','roof','stall','fountain-round',...MONSTERS,...PROPS.filter(k=>!['tree','rock-large','wall','roof','stall','fountain-round'].includes(k))];let completed=0,next=0;const loader=new GLTFLoader();
  const worker=async()=>{while(next<order.length){const key=order[next++];try{
   const model=await loader.loadAsync(new URL('../../assets/shared/party/'+key+'.glb',import.meta.url).href);model.scene.updateMatrixWorld(true);
   model.scene.traverse(part=>{if(!part.isMesh)return;part.frustumCulled=true;part.castShadow=false;part.receiveShadow=false;for(const m of Array.isArray(part.material)?part.material:[part.material]){m.roughness=.96;m.metalness=/warrior|golem/.test(key)?.18:.025;if(m.color){m.color.lerp(new THREE.Color(0x666960),.52);m.color.multiplyScalar(.77);}if(m.map){m.map.anisotropy=1;m.map.generateMipmaps=true;}}});
   this.models.set(key,model);this.assetRevision++;
  }catch(error){console.warn('새 파티 RPG 자산 적재 실패: '+key,error);}completed++;onLoad(completed,order.length,this.models.has('warrior'));}};
  await Promise.all([worker(),worker(),worker()]);
 }
 resize(){
  this.width=Math.max(1,innerWidth);this.height=Math.max(1,innerHeight);if(!this.gl)return;
  this.mobile=navigator.maxTouchPoints>0||this.width<900;this.gl.setPixelRatio(Math.min(devicePixelRatio||1,this.qualityPreset==='low'?(this.mobile?.7:.88):this.qualityPreset==='high'?(this.mobile?2:2):(this.mobile?1.5:1.75))*this.quality);this.gl.setSize(this.width,this.height,false);
  const span=this.height/(this.mobile?40:45);this.camera.left=-span*this.width/this.height/2;this.camera.right=-this.camera.left;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();
 }
 direction(x,y){const length=Math.min(1,Math.hypot(x,y)),a=Math.cos(this.yaw)*x+Math.sin(this.yaw)*y/Math.sin(this.pitch),b=-Math.sin(this.yaw)*x+Math.cos(this.yaw)*y/Math.sin(this.pitch),d=Math.hypot(a,b)||1;return{x:a/d*length,y:b/d*length};}
 screenToWorld(x,y){if(!this.ready)return null;const b=this.canvas.getBoundingClientRect();this.pointer.set((x-b.left)/b.width*2-1,1-(y-b.top)/b.height*2);this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.ray.intersectPlane(this.plane,this.hit)?{x:this.hit.x/SCALE,y:this.hit.z/SCALE}:null;}
 pick(x,y){if(!this.screenToWorld(x,y))return null;const roots=[...this.actors.values()].map(a=>a.root);for(const hit of this.raycaster.intersectObjects(roots,true)){let o=hit.object;while(o){if(o.userData.live)return o.userData.live;o=o.parent;}}return null;}
 pan(dx,dy){const a=this.screenToWorld(this.width/2,this.height/2),b=this.screenToWorld(this.width/2-dx,this.height/2-dy);if(!a||!b)return;this.offset.x+=b.x-a.x;this.offset.y+=b.y-a.y;this.offset.clamp(new THREE.Vector2(-1500,-1000),new THREE.Vector2(1500,1000));}
 changeZoom(factor){this.targetZoom=THREE.MathUtils.clamp(this.targetZoom*factor,.6,1.9);}
 rotate(){this.targetYaw+=Math.PI/2;}
 center(id='player'){this.follow=id;this.offset.set(0,0);}
 // 중세 판타지 재질: 마을의 마모된 포석, 야외 흙길, 던전의 불규칙 석재.
groundMaterial(zone,dungeon){
 const key=dungeon?'dungeon':String(zone);
 if(this.groundMaterials.has(key))return this.groundMaterials.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d'),stone=dungeon||zone===0||zone===3||zone===6||zone>=7;
 const palette=dungeon?['#292c2b','#363735','#403f3b','#333637']:zone===0?['#474743','#535149','#3d403d','#565044']:zone===2?['#303a35','#354339','#44493d','#293832']:zone===4?['#665d50','#746954','#575249','#807663']:zone===5?['#667174','#747f7f','#536165','#8b9594']:zone===7?['#605145','#766352','#514940','#81674d']:zone===8?['#465351','#5b605b','#3c4c4a','#67736b']:zone===9?['#746853','#867760','#615949','#9a8560']:zone===10?['#5b5260','#736773','#4a4756','#80727e']:['#3b433c','#4a5145','#353b35','#51544c'];
 const random=n=>{const t=Math.sin(n*127.41+(zone+3)*64.7)*24316.379;return t-Math.floor(t);};
 ctx.fillStyle=palette[0];ctx.fillRect(0,0,256,256);
 if(stone){
  for(let y=0,row=0;y<256;y+=31,row++){
   const offset=(row%2)*27;
   for(let x=-70+offset;x<300;x+=56){
    const jitter=3+random(x+y)*4;
    ctx.fillStyle='#29261f';ctx.fillRect(x+2,y+2,52,27);
    ctx.fillStyle=palette[Math.floor(random(x*13+y*7+3)*palette.length)];
    ctx.fillRect(x+3,y+3,49-jitter/2,24-jitter/3);
    ctx.fillStyle='rgba(255,231,179,.10)';ctx.fillRect(x+5,y+5,42,2);
    ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(x+7,y+25,40,2);
   }
  }
 }else{
  for(let i=0;i<1600;i++){
   const x=random(i*3+4)*256,y=random(i*7+900)*256;
   ctx.fillStyle=palette[Math.floor(random(i+173)*palette.length)];
   ctx.globalAlpha=.12+random(i+211)*.20;
   ctx.fillRect(x,y,1+random(i*9)*9,1+random(i*21)*5);
  }
  ctx.globalAlpha=1;
  for(let i=0;i<65;i++){
   const x=random(i+104)*256,y=random(i+381)*256;
   ctx.strokeStyle='rgba(18,29,15,.12)';
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3+random(i)*6,y-5-random(i+34)*7);ctx.stroke();
  }
 }
 // 마모된 포석/흙길의 미세 균열. 게임 충돌 및 좌표는 유지.
 for(let i=0;i<110;i++){
  const x=random(i*17+421)*256,y=random(i*19+779)*256,len=3+random(i+141)*14;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y+(random(i+32)-.5)*6);
  if(stone)ctx.lineTo(x+len+random(i+5)*5,y+3+random(i+54)*6);
  ctx.strokeStyle=stone?'rgba(8,13,14,.23)':zone===5?'rgba(209,213,207,.17)':'rgba(17,22,18,.18)';
  ctx.lineWidth=.5+random(i+66)*.9;ctx.stroke();
 }
 ctx.globalAlpha=1;
 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(stone?9:8,stone?6:6);
 texture.anisotropy=1;texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshLambertMaterial({map:texture,color:0xece4d3});
 this.groundMaterials.set(key,material);return material;
}
 staticModel(key,x,y,height,rotation=0){const original=this.models.get(key);if(!original)return null;const root=new THREE.Group(),model=original.scene.clone(true),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=height/Math.max(.01,size.y);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);root.add(model);root.position.set(x*SCALE,.02,y*SCALE);root.rotation.y=rotation;this.staticRoot.add(root);return root;}
 instances(key,placements){const original=this.models.get(key);if(!original||!placements.length)return;original.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(original.scene),center=box.getCenter(new THREE.Vector3()),height=Math.max(.01,box.max.y-box.min.y),local=new THREE.Matrix4();
  original.scene.traverse(part=>{if(!part.isMesh||part.isSkinnedMesh)return;const batch=new THREE.InstancedMesh(part.geometry,part.material,placements.length);for(let i=0;i<placements.length;i++){const p=placements[i],scale=p[2]/height;local.compose(new THREE.Vector3(p[0]*SCALE-center.x*scale,-box.min.y*scale,p[1]*SCALE-center.z*scale),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p[3]||0),new THREE.Vector3(scale,scale,scale));batch.setMatrixAt(i,local.clone().multiply(part.matrixWorld));}batch.instanceMatrix.needsUpdate=true;this.staticRoot.add(batch);});
 }
 // 지형·배경: 기존 등록 CC0 3D 모델만 사용하며 전투 판정과 이동 충돌은 변경하지 않는다.
buildWorld(live){
 this.staticRoot.traverse(o=>{if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.ownedMaterial)o.material.dispose();if(o.isInstancedMesh)o.dispose();});
 this.staticRoot.clear();this.weather=null;this.climateParticles=null;this.torchLights.length=0;this.torchFlames.length=0;this.banners.length=0;
 const zone=live.state.zone,dungeon=!!live.dungeon,w=live.worldW*SCALE,h=live.worldH*SCALE;
 const mood=dungeon?{sky:0x1a2125,fog:0x29302f,far:55,light:0xeac48c,intensity:1.0}:[
  {sky:0x3c4548,fog:0x4e5653,far:76,light:0xffdaa3,intensity:1.75},
  {sky:0x394742,fog:0x52615a,far:78,light:0xffe0aa,intensity:1.8},
  {sky:0x273833,fog:0x3b4b46,far:54,light:0xe7c990,intensity:1.35},
  {sky:0x626568,fog:0x777572,far:58,light:0xd5d8ca,intensity:1.2},
  {sky:0x5e5146,fog:0x675e51,far:72,light:0xffd4a0,intensity:2.0},
  {sky:0x556166,fog:0x657479,far:66,light:0xe2f0ff,intensity:1.6},
  {sky:0x514652,fog:0x68535d,far:52,light:0xe4a3a0,intensity:1.1},
  {sky:0x69493b,fog:0x78604e,far:73,light:0xffd3a0,intensity:1.55},
  {sky:0x384b51,fog:0x516363,far:59,light:0xb7d9d0,intensity:1.13},
  {sky:0x6e5941,fog:0x796952,far:65,light:0xeed1a3,intensity:1.58},
  {sky:0x524358,fog:0x655774,far:58,light:0xcdbfe7,intensity:1.19}
 ][zone]||{sky:0x68705f,fog:0x707761,far:70,light:0xffd6a6,intensity:1.5};
 this.worldMood=mood;
 this.scene.background=new THREE.Color(mood.sky);
 this.scene.fog.color.setHex(mood.fog);this.scene.fog.near=13;this.scene.fog.far=mood.far;
 this.sun.color.setHex(mood.light);this.sun.intensity=mood.intensity*.75;
 this.skyLight.intensity=dungeon?.45:zone===6?.55:zone===2?.7:.82;
 this.gl.toneMappingExposure=dungeon?.68:zone===6?.72:zone===5?.91:.83;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,h),this.groundMaterial(zone,dungeon));floor.receiveShadow=true;
 floor.userData.ownedGeometry=true;floor.rotation.x=-Math.PI/2;floor.position.set(w/2,0,h/2);this.staticRoot.add(floor);
 const random=n=>{const t=Math.sin(n*127.1+zone*13+(dungeon?live.dungeon.index:0)*51)*43758.5453;return t-Math.floor(t);};
 const grove=[],high=[],crooked=[],rocks=[],pebbles=[],fences=[];
 const detail=live.environment?.quality||'auto';const count=detail==='low'?(this.mobile?38:85):detail==='high'?(this.mobile?93:224):(this.mobile?74:172);
 for(let i=0;i<count;i++){
  const x=65+random(i+1)*(live.worldW-130),y=65+random(i+202)*(live.worldH-130);
  if(dungeon){if(i%3===0)rocks.push([x,y,.6+random(i+35)*.75,random(i+48)*6]);continue;}
  if((zone===0&&Math.abs(x-700)<205&&Math.abs(y-500)<245)||Math.hypot(x-live.p.x,y-live.p.y)<110)continue;
  if([3,4,5,6,7,8,9,10].includes(zone)){
   if(i%2===0)rocks.push([x,y,.48+random(i+50)*.85,random(i+50)*6]);
   else if(zone===5&&i%3===0)high.push([x,y,1.9+random(i+52)*1.1,random(i+55)*6]);
   else pebbles.push([x,y,.22+random(i+26)*.4,random(i+63)*6]);
  }else if(zone===2){
   (i%4===0?crooked:i%3===0?high:grove).push([x,y,2.5+random(i+33)*2,random(i+34)*6]);
  }else{
   (i%4===0?high:grove).push([x,y,2.2+random(i+33)*1.3,random(i+34)*6]);
  }
 }
 this.instances('tree',grove);this.instances('tree-high',high);
 this.instances('tree-crooked',crooked);this.instances('rock-large',rocks);this.instances('rock-small',pebbles);
 // 지역별 흔적: 기존 공유 건축 자산만 재사용. 전투·맵 충돌에는 참여하지 않는다.
 if(!dungeon&&zone===1){this.instances('fence',[[340,500,.85,.18],[385,507,.75,-.17],[935,460,.78,.28]]);this.instances('cart',[[1055,570,.8,.45]]);}
 if(!dungeon&&zone===2){this.instances('wall-broken',[[250,670,1.35,.2],[314,685,.9,-.3]]);this.instances('tree-crooked',[[260,715,3.4,0],[1050,250,3.7,1.2]]);}
 if(!dungeon&&zone===3){this.instances('pillar-stone',[[290,640,1.4,.15],[338,635,1.65,-.3],[1085,470,2.2,.2]]);this.instances('rock-wide',[[385,645,.8,0],[1000,475,.9,0]]);}
 if(!dungeon&&zone===4){this.instances('cart',[[310,685,1.1,-.5],[350,718,.65,.4]]);this.instances('wall-broken',[[930,205,1.4,.22],[980,240,1.05,-.2]]);}
 if(!dungeon&&zone===5){this.instances('wall-arch',[[345,260,2.15,.15]]);this.instances('pillar-stone',[[395,286,1.55,.1],[1030,675,1.9,.2]]);}
 if(!dungeon&&zone===6){this.instances('wall-broken',[[310,715,2.25,.3],[370,715,2.4,-.1],[1080,610,2.65,1.5]]);this.instances('lantern',[[430,710,1.6,0],[975,610,1.55,0]]);}
 if(!dungeon&&zone===0){
  // 기존 네 상점·샘·길 좌표를 그대로 유지한 성벽 마을 구조.
  const buildings=[[390,300,0],[1010,300,Math.PI],[700,690,0],[700,815,Math.PI/2]];
  for(const [x,y,rotation] of buildings){
   this.staticModel('wall',x,y,2.65,rotation);
   this.staticModel('wall-wood',x+55,y,2.55,rotation);
   this.staticModel('wall-window-shutters',x-48,y,2.5,rotation);
   this.staticModel('wall-door',x+18,y+28,2.55,rotation);
   const roof=this.staticModel('roof-gable',x+18,y,1.4,rotation);if(roof)roof.position.y=2.55;
   const chimney=this.staticModel('chimney',x-20,y-25,1.05,rotation);if(chimney)chimney.position.y=3.05;
  }
  // 성문·망루·돌길·마을 광장.
  this.instances('road',Array.from({length:21},(_,i)=>[700,85+i*38,.16,0]));
  this.instances('road',Array.from({length:13},(_,i)=>[460+i*39,518,.14,Math.PI/2]));
  this.instances('fence',[[260,350,1.15,0],[330,350,1.15,0],[1070,350,1.15,0],[1140,350,1.15,0],[260,745,1.15,0],[1140,745,1.15,0]]);
  for(const [x,y,rot] of [[215,150,0],[1185,150,0],[215,770,0],[1185,770,0]]){
   this.staticModel('pillar-stone',x,y,3.2,rot);
   const roof=this.staticModel('roof-gable-end',x,y,1.0,rot);if(roof)roof.position.y=3;
  }
  this.instances('wall-arch',[[700,125,3.5,0],[700,865,3.5,0]]);
  this.staticModel('fountain-round',700,300,1.3);
   this.staticModel('pillar-stone',844,487,1.65);
   this.staticModel('lantern',872,496,1.3);
  this.staticModel('stall',700,690,2.65);this.staticModel('cart',825,708,1.35);
  this.staticModel('cart',580,685,1.2,Math.PI);
  this.instances('lantern',[[500,438,1.8,0],[900,438,1.8,0],[650,750,1.8,0],[750,750,1.8,0],[355,360,1.6,0],[1030,360,1.6,0]]);
  this.staticModel('fence',550,260,1.3,0);
  this.staticModel('fence',850,260,1.3,0);
  // 캠페인 선택은 마을의 실제 배경을 변화시킨다. 상점과 사건 좌표는 보존.
  const decisions=live.state.story?.choices||{};
  if(decisions.fort==='witness')this.instances('pillar-stone',[[470,910,1.25,0],[520,916,1.22,0],[570,911,1.28,0]]);
  if(decisions.fort==='refuge'){this.instances('stall',[[1450,795,1.8,0],[1540,795,1.75,0]]);this.instances('cart',[[1480,910,1.15,.3]]);}
  if(decisions.temple==='reveal')this.instances('lantern',[[520,880,1.4,0],[630,880,1.4,0],[760,880,1.4,0],[890,880,1.4,0]]);
  if(decisions.temple==='prepare'){this.instances('stall',[[1390,980,1.75,.6],[1535,1015,1.8,.3]]);this.instances('fence',[[1320,990,1.2,0],[1375,990,1.2,0]]);}
  if(decisions.ending==='release')this.instances('tree',[[1500,450,3.4,0],[1580,520,3.8,.4],[1690,580,3.2,1]]);
  if(decisions.ending==='keeper'){this.instances('wall-arch',[[1610,650,2.9,.1]]);this.instances('lantern',[[1530,635,1.65,0],[1690,635,1.65,0]]);}
 }
 if(!dungeon&&zone>0){
  // 야외 사냥터는 중세 유적·사람이 지나간 길을 남겨 전형적인 빈 초원처럼 보이지 않게 한다.
  this.instances('road',Array.from({length:19},(_,i)=>[180+i*85,470+Math.sin(i*.6)*28,.12,Math.PI/2]));
  const ruins=[[260,240],[1120,250],[1030,720],[1530,250],[1720,740],[1540,1020]];
  this.instances(zone>=3?'wall-broken':'wall',ruins.map(([x,y],i)=>[x,y,zone===4?1.6:2.2,i*Math.PI/2]));
  this.instances('pillar-stone',ruins.map(([x,y],i)=>[x+50,y+30,1.7+random(i+550),i]));
  this.instances('fence',[[455,640,1.0,0],[500,640,1.0,0],[890,340,1.0,0]]);
  if(zone>=7){
    // 옛 제국 도시 유산: 기존 무료 GLB 건축 모델을 로마식 회랑과 원형경기장으로 재배열.
    if(zone===7){
      const arena=[[720,320],[950,320],[1110,445],[950,600],[720,600],[570,445]];
      this.instances('wall-arch',arena.map(([x,y],i)=>[x,y,3.3,i*Math.PI/3]));
      this.instances('pillar-stone',[[680,420,3,0],[1090,420,3,0],[680,560,3,0],[1090,560,3,0]]);
    }else if(zone===8){
      this.instances('wall-arch',[[370,440,2.9,Math.PI/2],[620,440,2.9,Math.PI/2],[870,440,2.9,Math.PI/2],[1120,440,2.9,Math.PI/2],[1370,440,2.9,Math.PI/2]]);
      this.instances('pillar-stone',[[340,760,2.8,0],[690,760,2.8,0],[1040,760,2.8,0],[1390,760,2.8,0]]);
      this.instances('wall-broken',[[475,710,2.8,0],[845,710,2.8,0],[1220,710,2.8,0]]);
    }else if(zone===9){
      this.instances('wall-arch',[[460,480,3.5,0],[650,480,3.5,0],[840,480,3.5,0],[1030,480,3.5,0]]);
      this.instances('pillar-stone',[[450,740,3,0],[660,740,3,0],[870,740,3,0],[1080,740,3,0]]);
      this.staticModel('fountain-round',960,630,2.1);
      this.instances('lantern',[[520,680,1.7,0],[730,680,1.7,0],[1150,700,1.8,0]]);
    }else{
      this.instances('wall-arch',[[430,450,3.1,0],[570,450,3.1,0],[710,450,3.1,0],[850,450,3.1,0],[990,450,3.1,0],[1130,450,3.1,0],[1270,450,3.1,0]]);
      this.instances('pillar-stone',[[430,630,3.9,0],[710,630,3.9,0],[990,630,3.9,0],[1270,630,3.9,0]]);
      this.instances('lantern',[[570,690,1.6,0],[850,690,1.6,0],[1130,690,1.6,0]]);
    }
  }
  if(zone===2||zone===3||zone===6){
   this.staticModel('wall-arch',870,630,2.7,Math.PI/2);
   this.staticModel('lantern',895,620,1.4);
  }else if(zone===4||zone===5){
   this.staticModel('cart',880,630,1.4,-.35);
   this.staticModel('wall-broken',920,640,1.6);
  }
 }
 if(dungeon){
  // 층별 석조 회랑 · 원래 몬스터와 출구 동작을 방해하지 않는 장식 전용 지형.
  const walls=[],columns=[],rubble=[],torches=[];
  for(let x=45;x<live.worldW;x+=78){
   walls.push([x,55,2.5,0],[x,live.worldH-34,2.5,0]);
  }
  for(let y=112;y<live.worldH-75;y+=75){
   walls.push([38,y,2.5,Math.PI/2]);
   if(Math.abs(y-live.worldH/2)>100)walls.push([live.worldW-36,y,2.5,Math.PI/2]);
  }
  for(const x of [130,live.worldW-145])for(const y of [145,live.worldH-145])columns.push([x,y,3.1,0]);
  for(let i=0;i<(this.mobile?14:24);i++){
   let x=100+random(i+210)*Math.max(200,live.worldW-200),y=95+random(i+909)*Math.max(150,live.worldH-190);
   if(Math.abs(y-live.worldH/2)<95||Math.hypot(x-145,y-310)<150||Math.hypot(x-825,y-445)<90)continue;
   rubble.push([x,y,.25+random(i+48)*.42,random(i+45)*6]);
  }
  this.instances('wall-broken',walls);
  this.instances('pillar-stone',columns.concat([[310,405,1.1,0]]));
  this.instances('rock-small',rubble);
  this.instances('wall-arch',[[live.worldW-58,live.worldH/2,3.1,Math.PI/2],[410,70,2.8,0]]);
  this.staticModel('wall-door',825,445,2.45,Math.PI/2);
  this.staticModel('fence',330,375,1.2,0);
  torches.push([138,195,1.75,0],[live.worldW-153,195,1.75,0],[138,live.worldH-185,1.75,0],[live.worldW-153,live.worldH-185,1.75,0]);
  this.instances('lantern',torches);
 }
 // 눈·비·잿가루·모래바람: 카메라 주변의 경량 입자. 지형·충돌·판정에는 영향 없음.
 const climate=live.environment||{},kind=dungeon?'interior':climate.weather||'clear';
 if(climate.effects!==false&&['rain','snow','ash','dust'].includes(kind)){
  const low=climate.quality==='low',high=climate.quality==='high';
  const n=this.mobile?(low?38:high?110:76):(low?90:high?290:190);
  const array=new Float32Array(n*(kind==='rain'?6:3));
  for(let i=0;i<n;i++){
   const j=i*(kind==='rain'?6:3),x=(random(i+11)-.5)*18,y=.55+random(i+94)*(kind==='rain'?8:6),z=(random(i+707)-.5)*15;
   array[j]=x;array[j+1]=y;array[j+2]=z;
   if(kind==='rain'){array[j+3]=x+.13;array[j+4]=y+.38;array[j+5]=z;}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(array,3));
  const color=kind==='rain'?0xb5c9db:kind==='snow'?0xf4f8ff:kind==='ash'?0xd3a6a0:0xd5bd8f;
  const material=kind==='rain'?new THREE.LineBasicMaterial({color,transparent:true,opacity:this.mobile?.33:.43,depthWrite:false}):
   new THREE.PointsMaterial({color,size:kind==='snow'?.115:.085,transparent:true,opacity:this.mobile?.55:.68,depthWrite:false,sizeAttenuation:true,blending:THREE.AdditiveBlending});
  const mesh=kind==='rain'?new THREE.LineSegments(geometry,material):new THREE.Points(geometry,material);
  mesh.frustumCulled=false;mesh.userData.ownedGeometry=true;mesh.userData.ownedMaterial=true;this.staticRoot.add(mesh);
  this.climateParticles={mesh,position:array,count:n,kind};
 }
 // 비가 내리면 광장 돌바닥과 옛 제국의 길에 고인 빗물 반사.
 if(kind==='rain'){
  const quantity=this.mobile?12:30;
  const geometry=new THREE.CircleGeometry(1,14),material=new THREE.MeshBasicMaterial({color:0x8899a3,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide});
  const puddles=new THREE.InstancedMesh(geometry,material,quantity),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  for(let i=0;i<quantity;i++){
   const x=110+random(i+162)*Math.max(1,live.worldW-220),y=130+random(i+817)*Math.max(1,live.worldH-250),size=.26+random(i+981)*.67;
   matrix.compose(new THREE.Vector3(x*SCALE,.033,y*SCALE),rotation,new THREE.Vector3(size,size*.57,1));puddles.setMatrixAt(i,matrix);
  }
  puddles.instanceMatrix.needsUpdate=true;puddles.userData.ownedGeometry=true;puddles.userData.ownedMaterial=true;this.staticRoot.add(puddles);
 }
 // 문장과 행정 깃발. 유니티/외부 다운로드 없이 기하체를 조합해 중세 도시의 실루엣을 강화한다.
 if(!dungeon&&(zone===0||zone>=7)){
  const spots=zone===0?[[215,150],[1185,150],[235,775],[1165,775],[700,900]]:
    zone===7?[[640,290],[1120,290],[640,660],[1120,660]]:
    zone===8?[[365,350],[1000,350],[1370,350]]:
    zone===9?[[460,390],[1030,390],[660,830]]:
    [[430,360],[850,360],[1270,360]];
  for(let i=0;i<spots.length;i++){
   const [x,y]=spots[i],post=new THREE.Mesh(new THREE.CylinderGeometry(.032,.038,3.55,6),new THREE.MeshStandardMaterial({color:0x66584b,roughness:.86,metalness:.18}));
   post.position.set(x*SCALE,1.8,y*SCALE);post.userData.ownedGeometry=true;post.userData.ownedMaterial=true;this.staticRoot.add(post);
   const banner=new THREE.Group();banner.position.set(x*SCALE,2.55,y*SCALE);banner.rotation.y=(i%2)*Math.PI*.5;
   const fabric=new THREE.Mesh(new THREE.PlaneGeometry(.66,1.35,1,2),new THREE.MeshStandardMaterial({color:zone===0?0x743a38:zone===8?0x386069:zone===10?0x5a426f:0x795133,roughness:.99,side:THREE.DoubleSide}));
   fabric.position.x=.39;fabric.position.y=-.42;fabric.userData.ownedGeometry=true;fabric.userData.ownedMaterial=true;banner.add(fabric);
   const trim=new THREE.Mesh(new THREE.PlaneGeometry(.56,.12),new THREE.MeshBasicMaterial({color:0xc8a56d,side:THREE.DoubleSide}));
   trim.position.set(.39,.135,.011);trim.userData.ownedGeometry=true;trim.userData.ownedMaterial=true;banner.add(trim);
   const crest=new THREE.Mesh(new THREE.CircleGeometry(.14,8),new THREE.MeshBasicMaterial({color:0xe4bb78,side:THREE.DoubleSide}));
   crest.position.set(.39,-.39,.015);crest.userData.ownedGeometry=true;crest.userData.ownedMaterial=true;banner.add(crest);
   this.staticRoot.add(banner);this.banners.push(banner);
  }
 }
 // 한 번 생성한 점군으로 먼지·눈·반딧불의 미세한 이동을 표현한다.
 const vertices=[],particleCount=this.mobile?42:95;
 for(let j=0;j<particleCount;j++)vertices.push((random(j+827)-.5)*32,.7+random(j+422)*4,(random(j+1274)-.5)*28);
 const cloudGeometry=new THREE.BufferGeometry();
 cloudGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const tint=dungeon?0xd6a071:zone===5?0xd2e8f2:zone===2?0xa4c88a:zone===4?0xd8bf91:zone===6?0xc49ab7:0xe1b774;
 const cloudMaterial=new THREE.PointsMaterial({color:tint,size:zone===5?.1:.075,transparent:true,opacity:this.mobile?.37:.48,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
 this.weather=new THREE.Points(cloudGeometry,cloudMaterial);
 this.weather.userData.ownedGeometry=true;this.weather.userData.ownedMaterial=true;this.weather.frustumCulled=false;this.staticRoot.add(this.weather);
 // 횃불·가스등이 밤에 밝아지고 새벽에 희미해진다. 모바일 광원 최대 2개.
 const points=dungeon?[[138,195],[live.worldW-153,live.worldH-185],[825,445]]:zone===0?[[355,360],[1030,360],[650,750],[750,750]]:
 zone===2?[[895,620],[260,715]]:zone===6?[[430,710],[975,610]]:
 zone===7?[[720,320],[950,600]]:zone===8?[[370,440],[1120,440]]:
 zone===9?[[520,680],[1150,700]]:zone===10?[[570,690],[1130,690]]:[[460,640],[870,630]];
 for(const [i,[x,y]] of points.slice(0,this.mobile?2:4).entries()){
  const fx=x*SCALE,fz=y*SCALE;
  const light=new THREE.PointLight(0xffb76e,1.3,11,2);light.position.set(fx,1.75,fz);
  this.staticRoot.add(light);this.torchLights.push(light);
  const flame=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,0),new THREE.MeshBasicMaterial({color:0xffae4e,transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));
  flame.position.set(fx,1.75,fz);flame.userData.ownedGeometry=true;flame.userData.ownedMaterial=true;
  this.staticRoot.add(flame);this.torchFlames.push(flame);
  if(!dungeon&&zone!==0&&i<2)this.staticModel('lantern',x,y,1.7);
 }
}
 modelRole(kind,obj,live){if(kind==='player')return HEROES[['fighter','rogue','cleric','wizard','ranger'].indexOf(live.state.player.classId)]||'warrior';if(kind==='ai')return HEROES[['fighter','rogue','cleric','wizard','ranger'].indexOf(obj.classId)]||HEROES[(Number(obj.id?.slice(2))||0)%5];const name=obj.name||'';if(/슬라임/.test(name))return'slime';if(/토끼/.test(name))return'bunny';if(/골렘|수호자|청동|도금|인형/.test(name))return'golem';if(/망령|유령|원혼|월식/.test(name))return'ghost';if(/박쥐|마수|키메라/.test(name))return'winged';return'orc';}
 // 기존 인물 GLB에 직업 장비만 더해 리깅과 애니메이션을 보존한다.
 dressActor(root,role){
  const armor=new THREE.MeshStandardMaterial({color:0x555c5d,roughness:.82,metalness:.36});
  const leather=new THREE.MeshStandardMaterial({color:0x302e2a,roughness:.98});
  const cloth=new THREE.MeshStandardMaterial({color:0x45474a,roughness:1});
  const sacred=new THREE.MeshStandardMaterial({color:0x88806c,roughness:.92});
  const add=(g,m,x,y,z,rz=0,rx=0)=>{
   const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.z=rz;o.rotation.x=rx;o.userData.classGear=true;root.add(o);
  };
  if(role==='warrior'){
   add(new THREE.BoxGeometry(.41,.18,.35),armor,-.3,1.32,0,-.16);
   add(new THREE.BoxGeometry(.41,.18,.35),armor,.3,1.32,0,.16);
   add(new THREE.CylinderGeometry(.28,.32,.08,8),armor,.48,.94,.17,0,Math.PI/2);
  }else if(role==='rogue'){
   add(new THREE.SphereGeometry(.26,9,6,0,Math.PI*2,0,Math.PI*.56),cloth,0,1.57,0);
   add(new THREE.BoxGeometry(.4,.09,.13),leather,0,.91,.27);
   add(new THREE.BoxGeometry(.07,.48,.08),armor,.4,.82,.03,.5);
  }else if(role==='cleric'){
   add(new THREE.BoxGeometry(.55,.15,.3),sacred,0,1.25,-.04);
   add(new THREE.CylinderGeometry(.038,.046,1.5,7),leather,.48,.88,-.06,.06);
   add(new THREE.TorusGeometry(.13,.033,5,10),sacred,.49,1.62,-.06);
  }else if(role==='wizard'){
   add(new THREE.BoxGeometry(.53,.11,.3),cloth,0,1.21,-.02);
   add(new THREE.CylinderGeometry(.035,.048,1.58,7),leather,.47,.87,-.1,-.07);
   add(new THREE.OctahedronGeometry(.11),sacred,.54,1.68,-.1);
  }else if(role==='ranger'){
   add(new THREE.CylinderGeometry(.11,.13,.54,7),leather,-.36,1.16,-.25,-.22);
   add(new THREE.BoxGeometry(.08,.65,.08),sacred,-.43,1.24,-.26,.3);
   add(new THREE.BoxGeometry(.11,.6,.09),leather,.3,1,-.21,.3);
  }
 }
 createActor(role,kind,obj){const original=this.models.get(role);if(!original)return null;const root=new THREE.Group(),model=cloneRig(original.scene),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const height=kind==='enemy'?(obj.boss?2.6:obj.elite?2:1.55):1.8,scale=height/Math.max(.01,size.y);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);if(kind!=='enemy'){model.scale.x*=.88;model.scale.z*=.88;model.scale.y*=1.11;}const flashMaterials=[];model.traverse(p=>{if(p.isMesh){p.material=Array.isArray(p.material)?p.material.map(m=>m.clone()):p.material.clone();for(const m of Array.isArray(p.material)?p.material:[p.material])if(m.emissive)flashMaterials.push({material:m,red:m.emissive.r,green:m.emissive.g,blue:m.emissive.b});}});root.add(model);// 픽셀 스프라이트가 직업 의복·장비 실루엣을 직접 그리므로 3D 장식은 중복 생성하지 않는다.
  const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterials[kind==='enemy'?'enemy':'ally']);ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.scale.setScalar(obj.boss?1.7:1);root.add(ring);
  const mixer=new THREE.AnimationMixer(model),actions=new Map();for(const clip of original.animations){const action=mixer.clipAction(clip);actions.set(clip.name,action);}
  // 전신 표현: 실제 고밀도 원화 + 경량 분절 메시. 3D 판정 모델은 그대로 둔다.
  let pixel=null,pixelRest=null,pixelWidth=0;
  const bounds=this.actorBounds[ACTOR_ART.indexOf(role)];
  if(this.actorArt&&bounds&&!original.animations.length){
   const geometry=new THREE.PlaneGeometry(1,1,12,20),uv=geometry.attributes.uv;
   for(let i=0;i<uv.count;i++)uv.setXY(i,THREE.MathUtils.lerp(bounds.u0,bounds.u1,uv.getX(i)),THREE.MathUtils.lerp(bounds.v0,bounds.v1,uv.getY(i)));
   uv.needsUpdate=true;pixelRest=geometry.attributes.position.array.slice();geometry.translate(0,.5,0);
   pixel=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:this.actorArt,transparent:true,alphaTest:.12,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
   pixelWidth=height*bounds.aspect;pixel.scale.set(pixelWidth,height,1);pixel.position.y=.035;pixel.quaternion.copy(this.camera.quaternion);root.add(pixel);model.visible=false;
  }
  // 기존 리깅 클립을 모든 직업·동료 NPC·몬스터가 공유하는 운동 상태로 선택한다.
   const named=regex=>[...actions].find(([name])=>regex.test(name))?.[1]||null;
   const clips={idle:named(/idle/i)||actions.values().next().value||null,walk:named(/^walk|_walk/i),run:named(/^run|_run/i),attack:named(/attack|spell|shoot|punch|bite|slash|headbutt/i),hit:named(/recievehit|receivehit|hitrecieve|hitreact|hurt|damage/i)};
   if(clips.attack===clips.idle)clips.attack=null;
   for(const action of new Set([clips.idle,clips.walk,clips.run].filter(Boolean)))action.reset().play().setEffectiveWeight(0);
   const result={root,model,ring,mixer,actions,clips,role,kind,pixel,pixelRest,pixelWidth,facing:1,walkPhase:0,motion:0,speed:0,turnYaw:0,
    wasAttacking:false,attackAt:0,attackDuration:.45,gestureAction:null,gestureUntil:0,gestureBlend:0,lastHitAt:0,
    lastX:obj.x,lastY:obj.y,height,modelRestY:model.position.y,hitAt:0,hitPower:0,flashMaterials};
  this.scene.add(root);return result;
 }
 // 애니메이션: GLB 실제 걷기/공격 클립을 크로스페이드, 클립 없는 적도 관성·공격 반동·피격 경직 처리.
  // 메인: 실제 이동거리/속도에 맞춰 걷기·달리기를 섞고 공격·피격은 단발로 반응한다.
  animate(entry,moving,combat,dt,now){
   const attack=!!(combat&&combat.visualUntil>now),hit=Math.max(0,1-(now-entry.hitAt)/320);
   const attackStart=attack&&!entry.wasAttacking,hitStart=entry.hitAt>0&&entry.hitAt!==entry.lastHitAt;
   if(attackStart){entry.attackAt=now;entry.attackDuration=Math.max(.25,(combat.visualUntil-now)/1000);}
   entry.wasAttacking=attack;
   if(hitStart)entry.lastHitAt=entry.hitAt;
   const speedBase=entry.kind==='enemy'?90:155,blend=1-Math.exp(-dt*11);
   entry.motion+=(Math.min(1,entry.speed/speedBase)-entry.motion)*blend;
   entry.walkPhase+=dt*(entry.role==='golem'?7:entry.role==='bunny'?14:10.5)*Math.max(.12,entry.speed/speedBase);
   const attackProgress=attack?Math.min(1,(now-entry.attackAt)/Math.max(1,entry.attackDuration*1000)):0;
   const strike=attack?Math.sin(attackProgress*Math.PI):0;
   const spirit=entry.role==='ghost'||entry.role==='winged',gel=entry.role==='slime',heavy=entry.role==='golem';
   const breath=Math.sin(now*.0023+entry.height*2)*.008+Math.sin(now*.0017+entry.height)*.004;
   // 애니메이션 없는 원화만 다리·팔·상체를 분리해서 변형한다.
   if(entry.pixel){
    const positions=entry.pixel.geometry.attributes.position,rest=entry.pixelRest,phase=entry.walkPhase;
    if(moving){const direction=Math.sin(entry.model.rotation.y-this.yaw);if(Math.abs(direction)>.15)entry.facing=direction>0?1:-1;}
    for(let i=0;i<positions.count;i++){
     const x=rest[i*3],y=rest[i*3+1],t=y+.5,side=x<0?-1:1;
     const leg=Math.max(0,1-t/.36),arm=t>.37&&t<.79&&Math.abs(x)>.16?1:0;
     const foot=Math.sin(phase+side*Math.PI*.5)*entry.motion;
     let px=x+Math.sin(phase*.5)*entry.motion*t*.018+strike*t*t*(heavy?.045:.085)-hit*t*.055;
     let py=y+breath*t;
     if(!spirit&&!gel){px+=foot*leg*.036-foot*arm*.018;py+=Math.max(0,foot)*leg*.029;}
     if(gel){px*=1+Math.sin(phase)*.04;py-=Math.sin(phase)*.018*t;}
     if(spirit)px+=Math.sin(now*.003+t*4)*.018*(1-t);
     if(attack&&arm){px+=strike*.036;py+=strike*(entry.role==='wizard'||entry.role==='cleric'?.065:.025);}
     positions.setXY(i,px,py+.5);
    }
    positions.needsUpdate=true;
    entry.pixel.quaternion.copy(this.camera.quaternion);entry.pixel.scale.x=entry.pixelWidth*entry.facing;
    const bob=spirit?Math.sin(now*.0033)*.047:gel?0:Math.abs(Math.sin(phase))*entry.motion*(heavy?.01:.018);
    entry.pixel.position.y+=(.035+bob+hit*.04-entry.pixel.position.y)*blend;
    entry.pixel.material.color.setRGB(1,1-hit*.38,1-hit*.43);
    return;
   }
   // 기존 GLB 뼈대: 대기·걸음·달리기 가중치를 이동 속도에 따라 연속 보간한다.
   const trigger=hitStart?'hit':attackStart?'attack':null;
   if(trigger&&entry.clips[trigger]){
    if(entry.gestureAction)entry.gestureAction.fadeOut(.09);
    const action=entry.clips[trigger],duration=trigger==='attack'?entry.attackDuration:.34;
    action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
    action.setEffectiveTimeScale(THREE.MathUtils.clamp(action.getClip().duration/Math.max(.22,duration),.65,2.8));
    action.setEffectiveWeight(1).fadeIn(.09).play();
    entry.gestureAction=action;entry.gestureUntil=now+duration*1000;
   }
   if(entry.gestureAction&&now>=entry.gestureUntil){entry.gestureAction.fadeOut(.18);entry.gestureAction=null;}
   entry.gestureBlend+=((entry.gestureAction?1:0)-entry.gestureBlend)*(1-Math.exp(-dt*16));
   const activity=THREE.MathUtils.clamp(entry.speed/16,0,1);
   const runBlend=entry.clips.run?THREE.MathUtils.smoothstep(entry.speed,entry.kind==='enemy'?95:105,entry.kind==='enemy'?165:185):0;
   const locoWeight=1-entry.gestureBlend*.88;
   if(entry.clips.idle)entry.clips.idle.setEffectiveWeight((1-activity)*locoWeight);
   if(entry.clips.walk)entry.clips.walk.setEffectiveWeight(activity*(1-runBlend)*locoWeight);
   if(entry.clips.run)entry.clips.run.setEffectiveWeight(activity*runBlend*locoWeight);
   if(!entry.clips.walk&&!entry.clips.run&&entry.clips.idle)entry.clips.idle.setEffectiveWeight(locoWeight);
   if(entry.clips.walk)entry.clips.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(entry.speed/78,.68,1.9));
   if(entry.clips.run)entry.clips.run.setEffectiveTimeScale(THREE.MathUtils.clamp(entry.speed/160,.78,1.6));
   entry.mixer.update(dt);
   // 보행 클립 위에 호흡·상체 관성·타격 후 젖힘·몬스터별 부유를 미세하게 더한다.
   const sway=Math.sin(entry.walkPhase)*entry.motion*(heavy?.014:.028);
   const bob=spirit?Math.sin(now*.0035+entry.height)*.065:gel?Math.sin(entry.walkPhase)*entry.motion*.024:Math.abs(Math.sin(entry.walkPhase))*entry.motion*(heavy?.01:.016);
   const settle=1-Math.exp(-dt*13);
   entry.model.rotation.x+=(breath*.4+strike*(heavy?.16:.11)-hit*.16-entry.model.rotation.x)*settle;
   entry.model.rotation.z+=(sway+breath-hit*.11-entry.model.rotation.z)*settle;
   entry.model.position.y+=(entry.modelRestY+bob+strike*.028+hit*.065-entry.model.position.y)*settle;
   for(const f of entry.flashMaterials){
    const glow=hit*(entry.kind==='enemy'?.7:.42);
    f.material.emissive.setRGB(f.red+glow,f.green+glow*.4,f.blue+glow*.25);
   }
  }
 // 실제 체력/충돌과 무관한 짧은 타격 반응. 렌더 대상에 없는 몬스터도 안전하다.
 reactToHit(key,power=1){
  const entry=this.actors.get(key);if(entry){entry.hitAt=performance.now();entry.hitPower=power;}
  if(key==='player'||power>1)this.cameraImpact=Math.min(.12,this.cameraImpact+(power>1?.052:.025));
 }
 removeActor(key,entry){if(entry.pixel){entry.pixel.geometry.dispose();entry.pixel.material.dispose();}this.scene.remove(entry.root);entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);entry.root.traverse(o=>{if(o.userData.classGear){o.geometry.dispose();o.material.dispose();}});entry.model.traverse(p=>{if(p.isMesh)for(const m of Array.isArray(p.material)?p.material:[p.material])m.dispose();});this.actors.delete(key);}
 // 직업·기술별 색, 궤적, 보호막, 투사체, 마법 파편을 조합한 경량 3D 이펙트.
 // 게임 피해 판정과 분리하고 휴대폰은 효과/파편 개수를 제한한다.
 playSkillEffect(kind,sx,sy,tx=sx,ty=sy){
  if(!this.ready||this.effects.length>=(this.mobile?11:24))return;
  const type=String(kind),family=type.startsWith('fighter')?'fighter':type.startsWith('rogue')?'rogue':type.startsWith('cleric')?'cleric':type.startsWith('wizard')?'wizard':type.startsWith('ranger')?'ranger':type;
  const colors={fighter:0xe0b56b,rogue:0xc48dbd,cleric:0xf4d898,wizard:0x82b4ff,ranger:0x96dba3,guard:0x91d5e6,strike:0xffd2a0};
  const color=colors[family]||colors.strike,group=new THREE.Group();
  const defense=/guard|wall|rally|shout|ward|veil|escape|evasion/.test(type);
  const healing=/cleric_group|cleric_rescue/.test(type),slow=/smoke|frost|snare/.test(type);
  const area=/cleave|purify|nova|chain|volley|flurry|strike/.test(type);
  const arrow=family==='ranger',arcane=family==='wizard',holy=family==='cleric',shadow=family==='rogue';
  const impact=defense||healing?{x:sx,y:sy}:{x:tx,y:ty};
  group.position.set(impact.x*SCALE,.10,impact.y*SCALE);
  const makeMaterial=(opacity=.85)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const attach=(geo,mat,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.userData.fade=mat.opacity;group.add(mesh);return mesh;};
  const base=defense?.67:area?.82:.46;
  const floor=attach(new THREE.RingGeometry(base*.7,base,24),makeMaterial(.82),0,.012,0);floor.rotation.x=-Math.PI/2;
  if(defense||healing){
   for(let i=0;i<(this.mobile?2:3);i++){
    const halo=attach(new THREE.TorusGeometry(.48+i*.12,.03,5,22),makeMaterial(.74),0,.45+i*.35,0);
    halo.rotation.set(Math.PI/3+i*.3,i*.68,0);
   }
   if(holy||healing){
    attach(new THREE.BoxGeometry(.085,.92,.08),makeMaterial(.9),0,1.24,0);
    attach(new THREE.BoxGeometry(.52,.09,.08),makeMaterial(.9),0,1.42,0);
   }
  }else{
   const diff=new THREE.Vector3((sx-impact.x)*SCALE,0,(sy-impact.y)*SCALE),distance=diff.length();
   if(distance>.08){
    const shaft=attach(new THREE.CylinderGeometry(arrow?.018:.036,arrow?.032:.060,Math.min(distance,7),6),makeMaterial(.9));
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.clone().normalize());
    shaft.position.copy(diff.multiplyScalar(.5)).add(new THREE.Vector3(0,.8,0));
   }
   if(arcane||shadow||area){
    const arc=attach(new THREE.TorusGeometry(area?.68:.42,arcane?.06:.038,5,26,area?Math.PI*1.62:Math.PI*1.26),makeMaterial(.92),0,.63,0);
    arc.rotation.set(shadow?1.34:arcane?.45:1.05,.22,.3);
   }
  }
  const shards=this.mobile?(area?5:3):(area?10:6),seed=type.length*2.29;
  for(let i=0;i<shards;i++){
   const angle=(i/shards)*Math.PI*2+seed,dist=.12+(i%3)*.15;
   const spike=attach(new THREE.OctahedronGeometry((arrow?.055:.085)*(1+(i%2)*.4),0),makeMaterial(.72),Math.cos(angle)*dist,.32+(i%4)*.16,Math.sin(angle)*dist);
   spike.userData.spark={x:Math.cos(angle)*(slow?.38:1.0),y:.45+(i%3)*.22,z:Math.sin(angle)*(slow?.38:1.0)};
  }
  if(arrow||slow){const tip=attach(new THREE.ConeGeometry(.13,.42,5),makeMaterial(.9),0,.72,0);tip.rotation.x=arrow?Math.PI/2:0;}
  if(arcane){const core=attach(new THREE.IcosahedronGeometry(.19,0),makeMaterial(.96),0,.76,0);core.rotation.y=.2;}
  if(holy){const disk=attach(new THREE.RingGeometry(.24,.29,16),makeMaterial(.9),0,1.32,0);disk.rotation.y=.5;}
  this.scene.add(group);this.effects.push({group,born:performance.now(),duration:healing?920:defense?880:area?670:590,spin:(arcane?2.7:shadow?-2.3:1.3),area});
 }
 clearEffects(){
  for(const fx of this.effects){this.scene.remove(fx.group);fx.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
  this.effects.length=0;
 }
 popDamage(x,y,amount,critical=false,miss=false){
  if(!this.ready||!this.camera||!this.width)return;
  const pos=new THREE.Vector3(x*SCALE,1.5,y*SCALE).project(this.camera);
  if(Math.abs(pos.x)>1.1||Math.abs(pos.y)>1.1)return;
  const node=document.createElement('div');node.className='damageFloat'+(critical?' critical':'')+(miss?' miss':'');
  node.textContent=miss?'빗나감':(critical?'치명타 ':'−')+Math.max(0,Math.round(amount));
  node.style.left=((pos.x+1)*this.width/2)+'px';node.style.top=((1-pos.y)*this.height/2)+'px';
  const host=document.getElementById('combatFeedback');if(!host)return;
  if(host.childElementCount>19)host.firstElementChild.remove();
  host.append(node);node.addEventListener('animationend',()=>node.remove(),{once:true});
 }
 // 매 프레임 하늘·광원·지면 색만 갱신한다. 월드와 지형은 조건 변화 시에만 재생성.
 applyEnvironment(live,dt,now){
  const m=this.worldMood;if(!m)return;
  const env=live.environment||{minutes:720,weather:'clear',effects:true,quality:'auto'},inside=!!live.dungeon;
  const minute=env.minutes??720;
  const daylight=inside?.12:Math.max(0,Math.sin((minute-360)/720*Math.PI));
  const twilight=inside?0:Math.max(0,1-Math.min(Math.abs(minute-380),Math.abs(minute-1110))/115);
  const darkness=inside?0:1-daylight;
  const weather=inside?'interior':env.weather||'clear';
  const fogBoost=weather==='fog'?.48:weather==='rain'?.19:weather==='snow'?.16:weather==='dust'?.27:weather==='ash'?.25:0;
  const nightSky=new THREE.Color(0x111d32),baseSky=new THREE.Color(m.sky),warmSky=new THREE.Color(0xb47759);
  const targetSky=baseSky.lerp(nightSky,darkness*.91).lerp(warmSky,twilight*.31);
  const targetFog=new THREE.Color(m.fog).lerp(new THREE.Color(0x152033),darkness*.67).lerp(new THREE.Color(0x949b9b),fogBoost*.34);
  const smoothing=1-Math.exp(-dt*6.2);
  if(inside){this.scene.background.setHex(m.sky);this.scene.fog.color.setHex(m.fog);}else{
   this.scene.background.lerp(targetSky,smoothing);
   this.scene.fog.color.lerp(targetFog,smoothing);
  }
  const targetFar=m.far*(1-fogBoost)*(inside?1:(.83+.17*daylight));
  this.scene.fog.far+=(targetFar-this.scene.fog.far)*smoothing;
  this.scene.fog.near=inside?13:weather==='fog'?8:12;
  const warm=new THREE.Color(0xffaf69),moon=new THREE.Color(0x91acd8);
  const sunColor=new THREE.Color(m.light).lerp(moon,darkness*.64).lerp(warm,twilight*.44);
  this.sun.color.lerp(sunColor,smoothing);
  const sunTarget=inside?m.intensity*.75:m.intensity*(.14+.73*daylight)*(1-fogBoost*.40);
  this.sun.intensity+=(sunTarget-this.sun.intensity)*smoothing;
  this.sun.position.set(-23+Math.cos(minute/1440*Math.PI*2)*14,13+daylight*35,17+Math.sin(minute/1440*Math.PI*2)*14);
  this.skyLight.color.lerp(new THREE.Color(0x9eaeb8).lerp(moon,darkness*.65),smoothing);
  const hemi=inside?.45:(.19+.64*daylight)*(1-fogBoost*.28);
  this.skyLight.intensity+=(hemi-this.skyLight.intensity)*smoothing;
  const tone=inside?.68:(.44+.42*daylight)*(1-fogBoost*.16);
  this.gl.toneMappingExposure+=(tone-this.gl.toneMappingExposure)*smoothing;
  const terrain=this.groundMaterial(live.state.zone,inside);
  const wet=weather==='rain'?.68:weather==='snow'?.84:1;
  const floorTint=new THREE.Color(0xffffff).multiplyScalar((inside?1:.48+.52*daylight)*wet);
  if(weather==='snow')floorTint.lerp(new THREE.Color(0xb5c5d0),.12);
  terrain.color.lerp(floorTint,smoothing);
  for(let i=0;i<this.torchLights.length;i++){
   const flame=this.torchFlames[i],light=this.torchLights[i];
   const alpha=inside?1:.18+.82*darkness;
   const jitter=1+Math.sin(now*.015+i*2.41)*.10+Math.sin(now*.029+i)*.055;
   light.intensity=alpha*jitter*(this.mobile?2.0:3.5);
   if(flame){flame.scale.setScalar((.73+.34*alpha)*jitter);flame.material.opacity=.15+.82*alpha;}
  }
  const cloud=this.climateParticles;
  if(cloud){
   cloud.mesh.position.set(live.p.x*SCALE,0,live.p.y*SCALE);
   const coords=cloud.position,kind=cloud.kind;
   for(let i=0;i<cloud.count;i++){
    let a=i*(kind==='rain'?6:3);
    const speed=kind==='rain'?13:kind==='snow'?.85:kind==='ash'?.7:2.0;
    let y=coords[a+1]-speed*dt;
    if(y<.15){y+=kind==='rain'?8:6;coords[a]=(Math.sin((i+1)*217.13+now*.0001)*7.7);}
    coords[a]+=(kind==='dust'?.9:kind==='ash'?.3:kind==='snow'?.10:.22)*dt;
    if(coords[a]>9)coords[a]-=18;
    coords[a+1]=y;
    if(kind==='rain'){coords[a+3]=coords[a]+.13;coords[a+4]=y+.38;}
    else coords[a+2]+=Math.sin(now*.00075+i)*dt*.15;
   }
   cloud.mesh.geometry.attributes.position.needsUpdate=true;
  }
  if(this.qualityPreset!==(env.quality||'auto')){this.qualityPreset=env.quality||'auto';this.resize();}
  for(let i=0;i<this.banners.length;i++){const banner=this.banners[i];banner.rotation.z=Math.sin(now*.0012+i*1.7)*(weather==='dust'||weather==='rain'?.08:.035);}
 }
 render(live){
  if(!this.ready)return;const started=performance.now();if(this.mobile&&this.lastRenderedAt&&started-this.lastRenderedAt<30)return;this.lastRenderedAt=started;const now=started,dt=Math.min(.05,(now-(this.lastAt||now))/1000);this.lastAt=now;
  const choices=live.state.story?.choices||{};const climate=live.environment||{minutes:720,weather:'clear',effects:true,quality:'auto'};const signature=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field')+':'+this.assetRevision+':'+(choices.fort||'')+':'+(choices.temple||'')+':'+(choices.ending||'')+':'+(live.dungeon?'inside':climate.weather)+':'+climate.effects+':'+climate.quality;
  if(signature!==this.worldSignature){const worldKey=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field');const changed=this.worldKey!==worldKey;this.worldKey=worldKey;if(changed){this.clearEffects();this.focus.set(live.p.x*SCALE,0,live.p.y*SCALE);this.offset.set(0,0);this.follow='player';}this.worldSignature=signature;this.buildWorld(live);}
  this.applyEnvironment(live,dt,now);
  this.yaw+=(this.targetYaw-this.yaw)*(1-Math.exp(-dt*7));this.zoom+=(this.targetZoom-this.zoom)*(1-Math.exp(-dt*9));
  const focus=this.follow==='player'?live.p:live.state.ai.find(a=>a.id===this.follow)||live.p;const goal=new THREE.Vector3((focus.x+this.offset.x)*SCALE,0,(focus.y+this.offset.y)*SCALE);this.focus.lerp(goal,1-Math.exp(-dt*9));const distance=48,span=distance*Math.cos(this.pitch);this.camera.position.set(this.focus.x+Math.sin(this.yaw)*span,distance*Math.sin(this.pitch),this.focus.z+Math.cos(this.yaw)*span);this.camera.lookAt(this.focus);if(this.cameraImpact>.001){this.camera.position.x+=Math.sin(now*.11)*this.cameraImpact;this.camera.position.y+=Math.cos(now*.14)*this.cameraImpact*.5;this.cameraImpact*=Math.exp(-dt*14);}else this.cameraImpact=0;if(this.weather){this.weather.position.set(this.focus.x+Math.sin(now*.00045)*.24,0,this.focus.z);this.weather.rotation.y=Math.sin(now*.00018)*.08;}this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const activeMarker=live.evidence||live.council;this.evidenceBeacon.visible=!!activeMarker;
  this.evidenceLabel.textContent=live.imperial?'◆ 제국 사건 조사':live.recruit?'◆ 동료 영입 단서':live.evidence?'◆ 조사할 단서':'◆ 북문 기록실';
  if(activeMarker){const site=activeMarker;this.evidenceBeacon.position.set(site.x*SCALE,.015,site.y*SCALE);this.evidenceBeacon.rotation.y=now*.00025;const v=new THREE.Vector3(site.x*SCALE,1.5,site.y*SCALE).project(this.camera);this.evidenceLabel.hidden=Math.abs(v.x)>.95||Math.abs(v.y)>.95;if(!this.evidenceLabel.hidden)this.evidenceLabel.style.transform='translate('+Math.round((v.x+1)*this.width/2)+'px,'+Math.round((1-v.y)*this.height/2)+'px)';}
  else this.evidenceLabel.hidden=true;
  const visible=[['player',live.p,'player']];for(const a of live.state.ai)if(live.dungeon?a.party:a.party||(a.zone===live.state.zone&&live.visibleCompanions?.includes(a.id)))visible.push(['ai',a,a.id]);
  const enemies=live.enemies.filter(e=>!e.dead).sort((a,b)=>(a.x-live.p.x)**2+(a.y-live.p.y)**2-(b.x-live.p.x)**2-(b.y-live.p.y)**2).slice(0,this.mobile?16:44);for(const e of enemies)visible.push(['enemy',e,'enemy'+e.id]);
   const used=new Set();
   for(const [kind,obj,key] of visible){
    used.add(key);const role=this.modelRole(kind,obj,live);let entry=this.actors.get(key);
    if(entry&&entry.role!==role){this.removeActor(key,entry);entry=null;}
    if(!entry){entry=this.createActor(role,kind,obj);if(!entry)continue;this.actors.set(key,entry);}
    const dx=obj.x-entry.lastX,dy=obj.y-entry.lastY,travel=Math.hypot(dx,dy);
    entry.lastX=obj.x;entry.lastY=obj.y;
    const instantSpeed=Math.min(250,travel/Math.max(.016,dt));
    entry.speed+=(instantSpeed-entry.speed)*(1-Math.exp(-dt*11));
    const moving=entry.speed>3||travel>.12;
    if(!entry.visualInitialized){entry.root.position.set(obj.x*SCALE,.015,obj.y*SCALE);entry.visualInitialized=true;}
    else{
     const follow=1-Math.exp(-dt*(kind==='enemy'?18:23));
     entry.root.position.x+=(obj.x*SCALE-entry.root.position.x)*follow;
     entry.root.position.z+=(obj.y*SCALE-entry.root.position.z)*follow;
    }
    const beat=live.cinematic?.info?.beats?.[live.cinematic.step];
    const reacting=!!(beat&&(beat.speaker===obj.name||(kind==='enemy'&&live.cinematic.info.key.startsWith('boss:')&&obj.boss)));
    const poseY=reacting?.095+Math.sin(now*.006)*.045:.015;
    entry.root.position.y+=(poseY-entry.root.position.y)*(1-Math.exp(-dt*10));
    entry.root.userData.live={kind,obj,key};
    if(travel>.09)entry.turnYaw=Math.atan2(dx,dy);
    const difference=Math.atan2(Math.sin(entry.turnYaw-entry.model.rotation.y),Math.cos(entry.turnYaw-entry.model.rotation.y));
    entry.model.rotation.y+=difference*(1-Math.exp(-dt*(moving?9:6)));
    entry.ring.visible=kind==='player'||key===this.selection||(kind==='ai'&&obj.party);
    entry.ring.material=key===this.selection?this.ringMaterials.select:this.ringMaterials[kind==='enemy'?'enemy':'ally'];
    this.animate(entry,moving,live.combat?.(obj),dt,now);
   }
  for(const [key,entry] of this.actors)if(!used.has(key))this.removeActor(key,entry);
  this.marker.visible=!!this.destination;if(this.destination)this.marker.position.set(this.destination.x*SCALE,.06,this.destination.y*SCALE);
  for(let i=this.effects.length-1;i>=0;i--){
   const fx=this.effects[i],phase=(now-fx.born)/fx.duration;
   if(phase>=1){this.scene.remove(fx.group);fx.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.effects.splice(i,1);continue;}
   fx.group.scale.setScalar(.62+phase*(fx.area?1.38:1.05));fx.group.rotation.y+=dt*fx.spin;
   fx.group.traverse(o=>{if(!o.isMesh)return;o.material.opacity=(o.userData.fade??.74)*Math.pow(1-phase,1.2);if(o.userData.spark){const v=o.userData.spark;o.position.x+=dt*v.x*1.15;o.position.y+=dt*v.y;o.position.z+=dt*v.z*1.15;}});

  }
  this.gl.render(this.scene,this.camera);this.frameCost=this.frameCost*.94+(performance.now()-started)*.06;
  if(now-this.qualityAt>2200){this.qualityAt=now;const q=this.frameCost>24?Math.max(.72,this.quality-.1):this.frameCost<13?Math.min(1,this.quality+.05):this.quality;if(Math.abs(q-this.quality)>.01){this.quality=q;this.resize();}}
  if(now-this.lastLabelsAt>110){this.lastLabelsAt=now;const labels=[];for(const [kind,obj,key] of visible){const entry=this.actors.get(key);if(!entry)continue;const v=(entry.pixel?entry.pixel.localToWorld(new THREE.Vector3(0,1.13,0)):new THREE.Vector3(obj.x*SCALE,entry.height+.2,obj.y*SCALE)).project(this.camera);if(Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)continue;const hp=kind==='player'?live.state.player:obj;labels.push({key,text:kind==='player'?live.state.player.name||'나':obj.name,x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2,hp:Math.max(0,Math.min(1,(hp.hp||0)/(hp.maxHp||1))),kind});}
   while(this.labels.length<labels.length){const node=document.createElement('div');node.className='world-label';node.innerHTML='<span></span><i><b></b></i>';this.labelRoot.append(node);this.labels.push(node);}
   this.labels.forEach((node,i)=>{const d=labels[i];node.hidden=!d;if(!d)return;node.style.transform=`translate(${Math.round(d.x)}px,${Math.round(d.y)}px)`;node.dataset.kind=d.kind;node.firstElementChild.textContent=d.text;node.querySelector('b').style.width=(d.hp*100)+'%';});
  }
 }
}
