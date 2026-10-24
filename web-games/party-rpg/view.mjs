// 파일명: web-games/party-rpg/view.mjs
// 임포트: 저장·전투를 변경하지 않는 단일 3D 표현 계층.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
const SCALE=1/36;
const HEROES=['warrior','rogue','cleric','wizard','ranger'];
const PROPS=['tree','tree-high','tree-crooked','rock-large','rock-small','rock-wide','wall','wall-wood','wall-door','wall-window-shutters','roof','roof-gable','roof-gable-end','chimney','fountain-round','cart','stall','lantern','pillar-stone','wall-broken','wall-arch','road','fence'];
const MONSTERS=['slime','orc','bunny','golem','ghost','winged'];
export class PartyView{
 constructor(canvas,{onLoad=()=>{}}={}){
  this.canvas=canvas;this.models=new Map();this.actors=new Map();this.staticRoot=new THREE.Group();this.worldSignature='';this.assetRevision=0;
  this.targetYaw=Math.PI/4;this.yaw=this.targetYaw;this.pitch=.73;this.zoom=1;this.targetZoom=1;this.offset=new THREE.Vector2();this.focus=new THREE.Vector3();this.follow='player';this.selection='player';this.destination=null;
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.hit=new THREE.Vector3();this.lastAt=0;this.frameCost=16;this.quality=1;this.qualityAt=0;this.labels=[];this.lastLabelsAt=0;this.ready=false;this.worldMood=null;this.torchLights=[];this.torchFlames=[];this.climateParticles=null;this.weatherKind='clear';this.qualityPreset='auto';this.terrainTint=new THREE.Color();
  try{
   this.gl=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=.83;this.gl.setClearColor(0x242a2a);this.gl.sortObjects=true;
   this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x49514f,12,58);this.scene.add(this.staticRoot);
   this.skyLight=new THREE.HemisphereLight(0xa0b0b6,0x252724,.81);this.scene.add(this.skyLight);this.sun=new THREE.DirectionalLight(0xbfc2bd,1.05);this.sun.position.set(-23,38,17);this.scene.add(this.sun);
   this.camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,180);this.camera.position.set(45,45,45);this.camera.lookAt(0,0,0);
   this.groundMaterials=new Map();this.effects=[];this.weather=null;this.ringGeometry=new THREE.RingGeometry(.48,.53,32);this.ringMaterials={ally:new THREE.MeshBasicMaterial({color:0x89b37a,side:THREE.DoubleSide,depthWrite:false}),enemy:new THREE.MeshBasicMaterial({color:0xc16c61,side:THREE.DoubleSide,depthWrite:false}),select:new THREE.MeshBasicMaterial({color:0xf0d49c,side:THREE.DoubleSide,depthWrite:false})};
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
  this.mobile=navigator.maxTouchPoints>0||this.width<900;this.gl.setPixelRatio(Math.min(devicePixelRatio||1,this.mobile?Math.min(1.05,this.width<460?.9:1):1.45)*this.quality);this.gl.setSize(this.width,this.height,false);
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
 this.staticRoot.clear();this.weather=null;this.climateParticles=null;this.torchLights.length=0;this.torchFlames.length=0;
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
 const count=this.mobile?74:172;
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
 // 한 번 생성한 점군으로 먼지·눈·반딧불의 미세한 이동을 표현한다.
 const vertices=[],particleCount=this.mobile?42:95;
 for(let j=0;j<particleCount;j++)vertices.push((random(j+827)-.5)*32,.7+random(j+422)*4,(random(j+1274)-.5)*28);
 const cloudGeometry=new THREE.BufferGeometry();
 cloudGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const tint=dungeon?0xd6a071:zone===5?0xd2e8f2:zone===2?0xa4c88a:zone===4?0xd8bf91:zone===6?0xc49ab7:0xe1b774;
 const cloudMaterial=new THREE.PointsMaterial({color:tint,size:zone===5?.1:.075,transparent:true,opacity:this.mobile?.37:.48,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
 this.weather=new THREE.Points(cloudGeometry,cloudMaterial);
 this.weather.userData.ownedGeometry=true;this.weather.userData.ownedMaterial=true;this.weather.frustumCulled=false;this.staticRoot.add(this.weather);
 // 광원은 이동·전투 계산과 독립. 모바일에서 점광원 수를 제한한다.
 if(zone===0||dungeon||zone===2||zone===6){
  const points=dungeon?[[138,195],[live.worldW-153,live.worldH-185]]:zone===0?[[700,300],[650,750]]:[[895,620]];
  for(const [x,y] of points.slice(0,this.mobile?1:2)){
   const light=new THREE.PointLight(dungeon?0xedab75:0xcda577,dungeon?3.6:2.5,dungeon?7:8,2);
   light.position.set(x*SCALE,2.4,y*SCALE);this.staticRoot.add(light);
  }
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
 createActor(role,kind,obj){const original=this.models.get(role);if(!original)return null;const root=new THREE.Group(),model=cloneRig(original.scene),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const height=kind==='enemy'?(obj.boss?2.6:obj.elite?2:1.55):1.8,scale=height/Math.max(.01,size.y);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);if(kind!=='enemy'){model.scale.x*=.88;model.scale.z*=.88;model.scale.y*=1.11;}model.traverse(p=>{if(p.isMesh){p.material=Array.isArray(p.material)?p.material.map(m=>m.clone()):p.material.clone();}});root.add(model);if(kind!=='enemy')this.dressActor(root,role);
  const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterials[kind==='enemy'?'enemy':'ally']);ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.scale.setScalar(obj.boss?1.7:1);root.add(ring);
  const mixer=new THREE.AnimationMixer(model),actions=new Map();for(const clip of original.animations){const action=mixer.clipAction(clip);actions.set(clip.name,action);}
  const result={root,model,ring,mixer,actions,action:null,role,lastX:obj.x,lastY:obj.y,height};this.scene.add(root);return result;
 }
 animate(entry,moving,combat,dt){let term=combat?.visualUntil>performance.now()?'attack':moving?'walk':'idle';const names=[...entry.actions.keys()];const choose=term==='attack'?names.find(n=>/attack|spell|shoot|punch|bite|headbutt/i.test(n)&&!/idle/i.test(n)):names.find(n=>new RegExp(term,'i').test(n));const name=choose||names.find(n=>/idle/i.test(n))||names[0];if(name&&entry.action!==name){const next=entry.actions.get(name);const previous=entry.actions.get(entry.action);next.reset().setEffectiveWeight(1).play();if(previous)next.crossFadeFrom(previous,.16,true);entry.action=name;}entry.mixer.update(dt);}
 removeActor(key,entry){this.scene.remove(entry.root);entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);entry.root.traverse(o=>{if(o.userData.classGear){o.geometry.dispose();o.material.dispose();}});entry.model.traverse(p=>{if(p.isMesh)for(const m of Array.isArray(p.material)?p.material:[p.material])m.dispose();});this.actors.delete(key);}
 // 간결한 직업별 주문·공격 시각효과, 실제 피해량 판정에는 개입하지 않는다.
 playSkillEffect(kind,sx,sy,tx=sx,ty=sy){
  if(!this.ready||this.effects.length>=(this.mobile?9:18))return;
  const colors={strike:0xc8b391,fighter:0xd8bd87,guard:0xc2d0d2,rogue:0xb6a0ad,cleric:0xdbce8e,wizard:0x769ac8,ranger:0xa3b18b};
  const color=colors[kind]||colors.strike,group=new THREE.Group();
  group.position.set(tx*SCALE,.13,ty*SCALE);
  const material=()=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.74,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const ring=new THREE.Mesh(new THREE.RingGeometry(kind==='wizard'?.15:.29,kind==='wizard'?.3:.38,24),material());
  ring.rotation.x=-Math.PI/2;ring.position.y=.02;group.add(ring);
  if(kind==='cleric'||kind==='guard'){
   const halo=new THREE.Mesh(new THREE.TorusGeometry(.36,.035,5,18),material());halo.position.y=kind==='guard'?.95:1.45;group.add(halo);
  }else{
   const diff=new THREE.Vector3((sx-tx)*SCALE,0,(sy-ty)*SCALE),length=diff.length();
   if(length>.07){
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.026,.044,Math.min(length,5.2),6),material());
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.clone().normalize());
    beam.position.copy(diff.multiplyScalar(.5)).add(new THREE.Vector3(0,.53,0));group.add(beam);
   }
   if(kind==='wizard'||kind==='fighter'){
    const arc=new THREE.Mesh(new THREE.TorusGeometry(kind==='wizard'?.44:.65,.045,5,22,Math.PI*1.3),material());
    arc.rotation.x=kind==='wizard'?.3:1.2;arc.position.y=.52;group.add(arc);
   }
  }
  this.scene.add(group);this.effects.push({group,born:performance.now(),duration:kind==='cleric'?800:kind==='guard'?850:540});
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
 render(live){
  if(!this.ready)return;const started=performance.now();if(this.mobile&&this.lastRenderedAt&&started-this.lastRenderedAt<30)return;this.lastRenderedAt=started;const now=started,dt=Math.min(.05,(now-(this.lastAt||now))/1000);this.lastAt=now;
  const choices=live.state.story?.choices||{};const climate=live.environment||{minutes:720,weather:'clear',effects:true,quality:'auto'};const signature=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field')+':'+this.assetRevision+':'+(choices.fort||'')+':'+(choices.temple||'')+':'+(choices.ending||'')+':'+(live.dungeon?'inside':climate.weather)+':'+climate.effects+':'+climate.quality;
  if(signature!==this.worldSignature){const worldKey=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field');const changed=this.worldKey!==worldKey;this.worldKey=worldKey;if(changed){this.clearEffects();this.focus.set(live.p.x*SCALE,0,live.p.y*SCALE);this.offset.set(0,0);this.follow='player';}this.worldSignature=signature;this.buildWorld(live);}
  this.applyEnvironment(live,dt,now);
  this.yaw+=(this.targetYaw-this.yaw)*(1-Math.exp(-dt*7));this.zoom+=(this.targetZoom-this.zoom)*(1-Math.exp(-dt*9));
  const focus=this.follow==='player'?live.p:live.state.ai.find(a=>a.id===this.follow)||live.p;const goal=new THREE.Vector3((focus.x+this.offset.x)*SCALE,0,(focus.y+this.offset.y)*SCALE);this.focus.lerp(goal,1-Math.exp(-dt*9));const distance=48,span=distance*Math.cos(this.pitch);this.camera.position.set(this.focus.x+Math.sin(this.yaw)*span,distance*Math.sin(this.pitch),this.focus.z+Math.cos(this.yaw)*span);this.camera.lookAt(this.focus);if(this.weather){this.weather.position.set(this.focus.x+Math.sin(now*.00045)*.24,0,this.focus.z);this.weather.rotation.y=Math.sin(now*.00018)*.08;}this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const activeMarker=live.evidence||live.council;this.evidenceBeacon.visible=!!activeMarker;
  this.evidenceLabel.textContent=live.imperial?'◆ 제국 사건 조사':live.recruit?'◆ 동료 영입 단서':live.evidence?'◆ 조사할 단서':'◆ 북문 기록실';
  if(activeMarker){const site=activeMarker;this.evidenceBeacon.position.set(site.x*SCALE,.015,site.y*SCALE);this.evidenceBeacon.rotation.y=now*.00025;const v=new THREE.Vector3(site.x*SCALE,1.5,site.y*SCALE).project(this.camera);this.evidenceLabel.hidden=Math.abs(v.x)>.95||Math.abs(v.y)>.95;if(!this.evidenceLabel.hidden)this.evidenceLabel.style.transform='translate('+Math.round((v.x+1)*this.width/2)+'px,'+Math.round((1-v.y)*this.height/2)+'px)';}
  else this.evidenceLabel.hidden=true;
  const visible=[['player',live.p,'player']];for(const a of live.state.ai)if(live.dungeon?a.party:a.party||(a.zone===live.state.zone&&live.visibleCompanions?.includes(a.id)))visible.push(['ai',a,a.id]);
  const enemies=live.enemies.filter(e=>!e.dead).sort((a,b)=>(a.x-live.p.x)**2+(a.y-live.p.y)**2-(b.x-live.p.x)**2-(b.y-live.p.y)**2).slice(0,this.mobile?16:44);for(const e of enemies)visible.push(['enemy',e,'enemy'+e.id]);
  const used=new Set();for(const [kind,obj,key] of visible){used.add(key);const role=this.modelRole(kind,obj,live);let entry=this.actors.get(key);if(entry&&entry.role!==role){this.removeActor(key,entry);entry=null;}if(!entry){entry=this.createActor(role,kind,obj);if(!entry)continue;this.actors.set(key,entry);}const dx=obj.x-entry.lastX,dy=obj.y-entry.lastY,moving=Math.hypot(dx,dy)>.08;entry.lastX=obj.x;entry.lastY=obj.y;entry.root.position.set(obj.x*SCALE,.015,obj.y*SCALE);if(live.cinematic){const beat=live.cinematic.info?.beats?.[live.cinematic.step],reacting=beat&&(beat.speaker===obj.name||(kind==='enemy'&&live.cinematic.info.key.startsWith('boss:')&&obj.boss));entry.model.rotation.z=reacting?Math.sin(now*.004)*.035:0;if(reacting)entry.root.position.y+=.09+.045*Math.sin(now*.006);}else entry.model.rotation.z=0;entry.root.userData.live={kind,obj,key};if(moving){const target=Math.atan2(dx,dy),difference=Math.atan2(Math.sin(target-entry.model.rotation.y),Math.cos(target-entry.model.rotation.y));entry.model.rotation.y+=difference*(1-Math.exp(-dt*14));}entry.ring.visible=kind==='player'||key===this.selection||(kind==='ai'&&obj.party);entry.ring.material=key===this.selection?this.ringMaterials.select:this.ringMaterials[kind==='enemy'?'enemy':'ally'];this.animate(entry,moving,live.combat?.(obj),dt);}
  for(const [key,entry] of this.actors)if(!used.has(key))this.removeActor(key,entry);
  this.marker.visible=!!this.destination;if(this.destination)this.marker.position.set(this.destination.x*SCALE,.06,this.destination.y*SCALE);
  for(let i=this.effects.length-1;i>=0;i--){
   const fx=this.effects[i],phase=(now-fx.born)/fx.duration;
   if(phase>=1){this.scene.remove(fx.group);fx.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.effects.splice(i,1);continue;}
   fx.group.scale.setScalar(.7+phase*.85);fx.group.rotation.y+=dt*1.3;
   fx.group.traverse(o=>{if(o.isMesh)o.material.opacity=.74*(1-phase);});
  }
  this.gl.render(this.scene,this.camera);this.frameCost=this.frameCost*.94+(performance.now()-started)*.06;
  if(now-this.qualityAt>2200){this.qualityAt=now;const q=this.frameCost>24?Math.max(.72,this.quality-.1):this.frameCost<13?Math.min(1,this.quality+.05):this.quality;if(Math.abs(q-this.quality)>.01){this.quality=q;this.resize();}}
  if(now-this.lastLabelsAt>110){this.lastLabelsAt=now;const labels=[];for(const [kind,obj,key] of visible){const entry=this.actors.get(key);if(!entry)continue;const v=new THREE.Vector3(obj.x*SCALE,entry.height+.2,obj.y*SCALE).project(this.camera);if(Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)continue;const hp=kind==='player'?live.state.player:obj;labels.push({key,text:kind==='player'?live.state.player.name||'나':obj.name,x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2,hp:Math.max(0,Math.min(1,(hp.hp||0)/(hp.maxHp||1))),kind});}
   while(this.labels.length<labels.length){const node=document.createElement('div');node.className='world-label';node.innerHTML='<span></span><i><b></b></i>';this.labelRoot.append(node);this.labels.push(node);}
   this.labels.forEach((node,i)=>{const d=labels[i];node.hidden=!d;if(!d)return;node.style.transform=`translate(${Math.round(d.x)}px,${Math.round(d.y)}px)`;node.dataset.kind=d.kind;node.firstElementChild.textContent=d.text;node.querySelector('b').style.width=(d.hp*100)+'%';});
  }
 }
}
