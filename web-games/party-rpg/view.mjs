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
  this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.hit=new THREE.Vector3();this.lastAt=0;this.frameCost=16;this.quality=1;this.qualityAt=0;this.labels=[];this.lastLabelsAt=0;this.ready=false;
  try{
   this.gl=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.12;this.gl.setClearColor(0x3e382d);this.gl.sortObjects=true;
   this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0x6b6656,28,76);this.scene.add(this.staticRoot);
   this.skyLight=new THREE.HemisphereLight(0xe9d7b8,0x30271f,1.6);this.scene.add(this.skyLight);this.sun=new THREE.DirectionalLight(0xffd6a0,2.4);this.sun.position.set(-23,38,17);this.scene.add(this.sun);
   this.camera=new THREE.OrthographicCamera(-12,12,12,-12,.1,180);this.camera.position.set(45,45,45);this.camera.lookAt(0,0,0);
   this.groundMaterials=new Map();this.ringGeometry=new THREE.RingGeometry(.48,.53,32);this.ringMaterials={ally:new THREE.MeshBasicMaterial({color:0x89b37a,side:THREE.DoubleSide,depthWrite:false}),enemy:new THREE.MeshBasicMaterial({color:0xc16c61,side:THREE.DoubleSide,depthWrite:false}),select:new THREE.MeshBasicMaterial({color:0xf0d49c,side:THREE.DoubleSide,depthWrite:false})};
   this.marker=new THREE.Mesh(this.ringGeometry,this.ringMaterials.select);this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.scene.add(this.marker);
   this.labelRoot=document.createElement('div');this.labelRoot.id='worldLabels';this.labelRoot.setAttribute('aria-hidden','true');canvas.after(this.labelRoot);
   this.ready=true;this.resize();this.load(onLoad);
  }catch(error){const status=document.getElementById('viewStatus');if(status){status.textContent='3D 화면을 시작하지 못했어. WebGL을 지원하는 브라우저에서 열어 줘.';status.hidden=false;}console.error('파티 RPG 새 렌더러 초기화 실패',error);}
 }
 async load(onLoad){
  const order=[...HEROES,'tree','rock-large','wall','roof','stall','fountain-round',...MONSTERS,...PROPS.filter(k=>!['tree','rock-large','wall','roof','stall','fountain-round'].includes(k))];let completed=0,next=0;const loader=new GLTFLoader();
  const worker=async()=>{while(next<order.length){const key=order[next++];try{
   const model=await loader.loadAsync(new URL('../../assets/shared/party/'+key+'.glb',import.meta.url).href);model.scene.updateMatrixWorld(true);
   model.scene.traverse(part=>{if(!part.isMesh)return;part.frustumCulled=true;part.castShadow=false;part.receiveShadow=false;for(const m of Array.isArray(part.material)?part.material:[part.material]){m.roughness=1;m.metalness=0;if(m.color)m.color.multiplyScalar(.9);if(m.map){m.map.anisotropy=1;m.map.generateMipmaps=true;}}});
   this.models.set(key,model);this.assetRevision++;
  }catch(error){console.warn('새 파티 RPG 자산 적재 실패: '+key,error);}completed++;onLoad(completed,order.length,this.models.has('warrior'));}};
  await Promise.all([worker(),worker(),worker()]);
 }
 resize(){
  this.width=Math.max(1,innerWidth);this.height=Math.max(1,innerHeight);if(!this.gl)return;
  this.mobile=navigator.maxTouchPoints>0||this.width<900;this.gl.setPixelRatio(Math.min(devicePixelRatio||1,this.mobile?1.15:1.5)*this.quality);this.gl.setSize(this.width,this.height,false);
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
 const ctx=canvas.getContext('2d'),stone=dungeon||zone===0||zone===3||zone===6;
 const palette=dungeon?['#393a36','#44443f','#525049','#5c554b']:zone===0?['#6b6657','#79715b','#827a67','#594e40']:zone===2?['#334c36','#455d3b','#5c693e','#344d32']:zone===4?['#a18a60','#b39c70','#887553','#bcaa7d']:zone===5?['#9aa9a7','#b7c2b7','#798b8a','#c8c8b7']:['#526040','#667249','#454f33','#757451'];
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
 this.staticRoot.traverse(o=>{if(o.userData.ownedGeometry)o.geometry.dispose();if(o.isInstancedMesh)o.dispose();});
 this.staticRoot.clear();
 const zone=live.state.zone,dungeon=!!live.dungeon,w=live.worldW*SCALE,h=live.worldH*SCALE;
 const mood=dungeon?{sky:0x292720,fog:0x403c36,far:55,light:0xeac48c,intensity:1.0}:[
  {sky:0x7e8270,fog:0xaaa28a,far:76,light:0xffdaa3,intensity:1.75},
  {sky:0x7d8973,fog:0x9da48c,far:78,light:0xffe0aa,intensity:1.8},
  {sky:0x455a4c,fog:0x66735f,far:54,light:0xe7c990,intensity:1.35},
  {sky:0x626568,fog:0x777572,far:58,light:0xd5d8ca,intensity:1.2},
  {sky:0xb6a07e,fog:0xc3ad88,far:72,light:0xffd4a0,intensity:2.0},
  {sky:0x9caeb4,fog:0xabbac4,far:66,light:0xe2f0ff,intensity:1.6},
  {sky:0x514652,fog:0x68535d,far:52,light:0xe4a3a0,intensity:1.1}
 ][zone]||{sky:0x68705f,fog:0x707761,far:70,light:0xffd6a6,intensity:1.5};
 this.scene.background=new THREE.Color(mood.sky);
 this.scene.fog.color.setHex(mood.fog);this.scene.fog.near=18;this.scene.fog.far=mood.far;
 this.sun.color.setHex(mood.light);this.sun.intensity=mood.intensity;
 this.skyLight.intensity=dungeon?1.0:1.45;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(w,h),this.groundMaterial(zone,dungeon));
 floor.userData.ownedGeometry=true;floor.rotation.x=-Math.PI/2;floor.position.set(w/2,0,h/2);this.staticRoot.add(floor);
 const random=n=>{const t=Math.sin(n*127.1+zone*13+(dungeon?live.dungeon.index:0)*51)*43758.5453;return t-Math.floor(t);};
 const grove=[],high=[],crooked=[],rocks=[],pebbles=[],fences=[];
 const count=this.mobile?65:115;
 for(let i=0;i<count;i++){
  const x=65+random(i+1)*(live.worldW-130),y=65+random(i+202)*(live.worldH-130);
  if(dungeon){if(i%3===0)rocks.push([x,y,.6+random(i+35)*.75,random(i+48)*6]);continue;}
  if(Math.abs(x-700)<205&&Math.abs(y-500)<245||Math.hypot(x-live.p.x,y-live.p.y)<125)continue;
  if([3,4,5,6].includes(zone)){
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
  this.staticModel('stall',700,690,2.65);this.staticModel('cart',825,708,1.35);
  this.staticModel('cart',580,685,1.2,Math.PI);
  this.instances('lantern',[[500,438,1.8,0],[900,438,1.8,0],[650,750,1.8,0],[750,750,1.8,0],[355,360,1.6,0],[1030,360,1.6,0]]);
  this.staticModel('fence',550,260,1.3,0);
  this.staticModel('fence',850,260,1.3,0);
 }
 if(!dungeon&&zone>0){
  // 야외 사냥터는 중세 유적·사람이 지나간 길을 남겨 전형적인 빈 초원처럼 보이지 않게 한다.
  this.instances('road',Array.from({length:12},(_,i)=>[180+i*85,470+Math.sin(i*.6)*28,.12,Math.PI/2]));
  const ruins=[[260,240],[1120,250],[1030,720]];
  this.instances(zone>=3?'wall-broken':'wall',ruins.map(([x,y],i)=>[x,y,zone===4?1.6:2.2,i*Math.PI/2]));
  this.instances('pillar-stone',ruins.map(([x,y],i)=>[x+50,y+30,1.7+random(i+550),i]));
  this.instances('fence',[[455,640,1.0,0],[500,640,1.0,0],[890,340,1.0,0]]);
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
 // 광원은 이동·전투 계산과 독립. 모바일에서 점광원 수를 제한한다.
 if(zone===0||dungeon||zone===2||zone===6){
  const points=dungeon?[[138,195],[live.worldW-153,live.worldH-185]]:zone===0?[[700,300],[650,750]]:[[895,620]];
  for(const [x,y] of points.slice(0,this.mobile?1:2)){
   const light=new THREE.PointLight(dungeon?0xf5a75d:0xffcd84,dungeon?6:3.5,dungeon?7:9,2);
   light.position.set(x*SCALE,2.4,y*SCALE);this.staticRoot.add(light);
  }
 }
}
 modelRole(kind,obj,live){if(kind==='player')return HEROES[['fighter','rogue','cleric','wizard','ranger'].indexOf(live.state.player.classId)]||'warrior';if(kind==='ai')return HEROES[['fighter','rogue','cleric','wizard','ranger'].indexOf(obj.classId)]||HEROES[(Number(obj.id?.slice(2))||0)%5];const name=obj.name||'';if(/슬라임/.test(name))return'slime';if(/토끼/.test(name))return'bunny';if(/골렘|수호자/.test(name))return'golem';if(/망령/.test(name))return'ghost';if(/박쥐|마수/.test(name))return'winged';return'orc';}
 createActor(role,kind,obj){const original=this.models.get(role);if(!original)return null;const root=new THREE.Group(),model=cloneRig(original.scene),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const height=kind==='enemy'?(obj.boss?2.6:obj.elite?2:1.55):1.8,scale=height/Math.max(.01,size.y);model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.traverse(p=>{if(p.isMesh){p.material=Array.isArray(p.material)?p.material.map(m=>m.clone()):p.material.clone();}});root.add(model);
  const ring=new THREE.Mesh(this.ringGeometry,this.ringMaterials[kind==='enemy'?'enemy':'ally']);ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.scale.setScalar(obj.boss?1.7:1);root.add(ring);
  const mixer=new THREE.AnimationMixer(model),actions=new Map();for(const clip of original.animations){const action=mixer.clipAction(clip);actions.set(clip.name,action);}
  const result={root,model,ring,mixer,actions,action:null,role,lastX:obj.x,lastY:obj.y,height};this.scene.add(root);return result;
 }
 animate(entry,moving,combat,dt){let term=combat?.visualUntil>performance.now()?'attack':moving?'walk':'idle';const names=[...entry.actions.keys()];const choose=term==='attack'?names.find(n=>/attack|spell|shoot|punch|bite|headbutt/i.test(n)&&!/idle/i.test(n)):names.find(n=>new RegExp(term,'i').test(n));const name=choose||names.find(n=>/idle/i.test(n))||names[0];if(name&&entry.action!==name){const next=entry.actions.get(name);const previous=entry.actions.get(entry.action);next.reset().setEffectiveWeight(1).play();if(previous)next.crossFadeFrom(previous,.16,true);entry.action=name;}entry.mixer.update(dt);}
 removeActor(key,entry){this.scene.remove(entry.root);entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);entry.model.traverse(p=>{if(p.isMesh)for(const m of Array.isArray(p.material)?p.material:[p.material])m.dispose();});this.actors.delete(key);}
 render(live){
  if(!this.ready)return;const started=performance.now(),now=started,dt=Math.min(.05,(now-(this.lastAt||now))/1000);this.lastAt=now;
  const signature=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field')+':'+this.assetRevision;
  if(signature!==this.worldSignature){const worldKey=live.state.zone+':'+(live.dungeon?live.dungeon.index+':'+live.dungeon.room:'field');const changed=this.worldKey!==worldKey;this.worldKey=worldKey;if(changed){this.focus.set(live.p.x*SCALE,0,live.p.y*SCALE);this.offset.set(0,0);this.follow='player';}this.worldSignature=signature;this.buildWorld(live);}
  this.yaw+=(this.targetYaw-this.yaw)*(1-Math.exp(-dt*7));this.zoom+=(this.targetZoom-this.zoom)*(1-Math.exp(-dt*9));
  const focus=this.follow==='player'?live.p:live.state.ai.find(a=>a.id===this.follow)||live.p;const goal=new THREE.Vector3((focus.x+this.offset.x)*SCALE,0,(focus.y+this.offset.y)*SCALE);this.focus.lerp(goal,1-Math.exp(-dt*9));const distance=48,span=distance*Math.cos(this.pitch);this.camera.position.set(this.focus.x+Math.sin(this.yaw)*span,distance*Math.sin(this.pitch),this.focus.z+Math.cos(this.yaw)*span);this.camera.lookAt(this.focus);this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  const visible=[['player',live.p,'player']];for(const a of live.state.ai)if(live.dungeon?a.party:a.party||a.zone===live.state.zone)visible.push(['ai',a,a.id]);
  const enemies=live.enemies.filter(e=>!e.dead).sort((a,b)=>(a.x-live.p.x)**2+(a.y-live.p.y)**2-(b.x-live.p.x)**2-(b.y-live.p.y)**2).slice(0,this.mobile?24:44);for(const e of enemies)visible.push(['enemy',e,'enemy'+e.id]);
  const used=new Set();for(const [kind,obj,key] of visible){used.add(key);const role=this.modelRole(kind,obj,live);let entry=this.actors.get(key);if(entry&&entry.role!==role){this.removeActor(key,entry);entry=null;}if(!entry){entry=this.createActor(role,kind,obj);if(!entry)continue;this.actors.set(key,entry);}const dx=obj.x-entry.lastX,dy=obj.y-entry.lastY,moving=Math.hypot(dx,dy)>.08;entry.lastX=obj.x;entry.lastY=obj.y;entry.root.position.set(obj.x*SCALE,.015,obj.y*SCALE);entry.root.userData.live={kind,obj,key};if(moving){const target=Math.atan2(dx,dy),difference=Math.atan2(Math.sin(target-entry.model.rotation.y),Math.cos(target-entry.model.rotation.y));entry.model.rotation.y+=difference*(1-Math.exp(-dt*14));}entry.ring.visible=kind==='player'||key===this.selection||(kind==='ai'&&obj.party);entry.ring.material=key===this.selection?this.ringMaterials.select:this.ringMaterials[kind==='enemy'?'enemy':'ally'];this.animate(entry,moving,live.combat?.(obj),dt);}
  for(const [key,entry] of this.actors)if(!used.has(key))this.removeActor(key,entry);
  this.marker.visible=!!this.destination;if(this.destination)this.marker.position.set(this.destination.x*SCALE,.06,this.destination.y*SCALE);
  this.gl.render(this.scene,this.camera);this.frameCost=this.frameCost*.94+(performance.now()-started)*.06;
  if(now-this.qualityAt>2200){this.qualityAt=now;const q=this.frameCost>24?Math.max(.72,this.quality-.1):this.frameCost<13?Math.min(1,this.quality+.05):this.quality;if(Math.abs(q-this.quality)>.01){this.quality=q;this.resize();}}
  if(now-this.lastLabelsAt>110){this.lastLabelsAt=now;const labels=[];for(const [kind,obj,key] of visible){const entry=this.actors.get(key);if(!entry)continue;const v=new THREE.Vector3(obj.x*SCALE,entry.height+.2,obj.y*SCALE).project(this.camera);if(Math.abs(v.x)>1.1||Math.abs(v.y)>1.1)continue;const hp=kind==='player'?live.state.player:obj;labels.push({key,text:kind==='player'?live.state.player.name||'나':obj.name,x:(v.x+1)*this.width/2,y:(1-v.y)*this.height/2,hp:Math.max(0,Math.min(1,(hp.hp||0)/(hp.maxHp||1))),kind});}
   while(this.labels.length<labels.length){const node=document.createElement('div');node.className='world-label';node.innerHTML='<span></span><i><b></b></i>';this.labelRoot.append(node);this.labels.push(node);}
   this.labels.forEach((node,i)=>{const d=labels[i];node.hidden=!d;if(!d)return;node.style.transform=`translate(${Math.round(d.x)}px,${Math.round(d.y)}px)`;node.dataset.kind=d.kind;node.firstElementChild.textContent=d.text;node.querySelector('b').style.width=(d.hp*100)+'%';});
  }
 }
}
