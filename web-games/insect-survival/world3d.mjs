// 파일명: web-games/insect-survival/world3d.mjs
// 기존 조작·전투·채집·저장 판단은 index.html이 담당한다. CC0 원본의 비파괴 3D 표현만 담당.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
const asset=new URL('../../assets/',import.meta.url);
const BASE=Object.freeze({
 hero:{src:'roblox/actors/native/rogue.glb',format:'glb',height:1.32,color:'#9fc89c'},
 crawler:{src:'shared/forest/caterpillar.glb',format:'glb',height:.62,color:'#c8df94'},
 spider:{src:'shared/forest/monster-53.obj',format:'obj',height:.86,color:'#d5a1a5'},
 tree:{src:'shared/homely-house/tree_large.obj',format:'obj',height:9,color:'#76bb72'},
 mushroom:{src:'shared/forest/mushroom.fbx',format:'fbx',height:2.2,color:'#f9c896'},
 floor:{src:'shared/homely-house/floor_base.obj',format:'obj',height:.28,color:'#71935c'},
 stone:{src:'shared/homely-house/cobblestones.obj',format:'obj',height:.3,color:'#b4a88e'},
 foliage:{src:'shared/homely-house/foliage_A.obj',format:'obj',height:2.1,color:'#77c56a'}
});
const game=document.getElementById('game'),snapshot=()=>window.insectWorldSnapshot?.();
const mobile=matchMedia('(pointer:coarse)').matches,clock=new THREE.Clock();
const scene=new THREE.Scene();scene.background=new THREE.Color('#a6b898');scene.fog=new THREE.FogExp2('#829d7a',.024);
const camera=new THREE.PerspectiveCamera(mobile?67:63,innerWidth/innerHeight,.08,170);
const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:mobile?'default':'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.3:1.65));
renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
renderer.domElement.id='insect3d';
Object.assign(renderer.domElement.style,{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',display:'none'});
game.insertBefore(renderer.domElement,game.firstChild);
scene.add(new THREE.HemisphereLight('#e4eac6','#233c27',2.1));
const sun=new THREE.DirectionalLight('#fff2c5',2.7);sun.position.set(-13,29,15);scene.add(sun);
const moon=new THREE.DirectionalLight('#88a8d9',.0);moon.position.set(13,25,-16);scene.add(moon);
const loaderFor=format=>format==='glb'?new GLTFLoader():format==='fbx'?new FBXLoader():new OBJLoader();
async function original(key){
 const {src,format}=BASE[key];
 const value=await loaderFor(format).loadAsync(new URL(src,asset).href);
 const model=format==='glb'?value.scene:value;
 if(key==='hero'&&format==='glb')originalClips=value.animations||[];
 if(!model||new THREE.Box3().setFromObject(model).isEmpty())throw Error('CC0 원본 비어 있음 '+src);
 return model;
}
// 동일 CC0 원본+색상의 파생 인스턴스는 재질만 공유한다. 지오메트리/리그/게임 상태는 기존 경로를 유지한다.
const derivedMaterials=new Map();
function derived(key,height,tint){
 const model=(key==='hero'?cloneSkinned(originals[key]):originals[key].clone(true)),bounds=new THREE.Box3().setFromObject(model),dim=bounds.getSize(new THREE.Vector3());
 const ratio=height/Math.max(.0001,dim.y);
 model.scale.multiplyScalar(ratio);model.position.y=-bounds.min.y*ratio;
 const color=new THREE.Color(tint||BASE[key].color);
 const variant=key+':'+color.getHexString();
 let materials=derivedMaterials.get(variant);
 if(!materials){materials=new Map();derivedMaterials.set(variant,materials);}
 model.traverse(part=>{
  if(!part.isMesh)return;
  const transform=mat=>{
   if(materials.has(mat))return materials.get(mat);
   const result=mat?.clone?.()||new THREE.MeshStandardMaterial();
   if(result.color)result.color.multiply(color);
   result.side=THREE.DoubleSide;result.roughness=1;result.metalness=0;
   materials.set(mat,result);
   return result;
  };
  part.material=Array.isArray(part.material)?part.material.map(transform):transform(part.material);
  part.castShadow=false;part.receiveShadow=true;
 });
 return model;
}
const originals={},enemies=[],resources=[];
let originalClips=[],heroMixer=null,playingAction='',heroActions={};
let avatar=null,worldReady=false,time=0,fieldBuilt=false;
const world=new THREE.Group(),actors=new THREE.Group(),decor=new THREE.Group();scene.add(world,actors,decor);
const announce=document.createElement('div');announce.textContent='CC0 3D 숲과 캐릭터 불러오는 중…';
Object.assign(announce.style,{position:'absolute',zIndex:'8',top:'42%',left:'50%',transform:'translate(-50%,-50%)',padding:'13px 19px',border:'1px solid #b3ac7b',borderRadius:'8px',background:'#1a2d26e8',fontSize:'12px',color:'#f2e4ba',pointerEvents:'none'});
game.append(announce);
// Grounding is measured from the CC0 floor's actual world-space top surface.
// All game-state coordinates remain unchanged; these constants affect visuals only.
const ratio=.025,GROUND_SURFACE_Y=0,FOOT_CLEARANCE=.035,GROUND_TILE_SPAN=14;
const to3=p=>new THREE.Vector3(p.x*ratio,GROUND_SURFACE_Y+FOOT_CLEARANCE,p.y*ratio);
function environment(frame){
 if(fieldBuilt)return;fieldBuilt=true;
 const floor=derived('floor',.18,'#adc291');
 // Local mesh is only a narrow, seam-filling foundation beneath the original CC0 tiles.
 // It does not replace the CC0 floor source, which remains visible and unmodified.
 const fieldWidth=Math.ceil(frame.world.w*ratio/GROUND_TILE_SPAN)*GROUND_TILE_SPAN;
 const fieldDepth=Math.ceil(frame.world.h*ratio/GROUND_TILE_SPAN)*GROUND_TILE_SPAN;
 const underlay=new THREE.Mesh(
  new THREE.PlaneGeometry(fieldWidth,fieldDepth),
  new THREE.MeshStandardMaterial({color:'#71935c',roughness:1,metalness:0})
 );
 underlay.rotation.x=-Math.PI/2;
 underlay.position.set(fieldWidth/2,GROUND_SURFACE_Y-.025,fieldDepth/2);
 world.add(underlay);
 // The CC0 floor OBJ spans 10x8 units and rises 0.5 units below its origin.
 // Measure the transformed bounds instead of magnifying both axes 13.8 times:
 // that used to make ~50-unit floor panels overlap every 14 units, causing
 // coplanar flicker and the ground surface to cover the hero's feet.
 const floorBounds=new THREE.Box3().setFromObject(floor);
 const floorSize=floorBounds.getSize(new THREE.Vector3());
 const floorCenter=floorBounds.getCenter(new THREE.Vector3());
 if(floorSize.x<.001||floorSize.z<.001)throw Error('CC0 floor footprint invalid');
 const floorXScale=GROUND_TILE_SPAN/floorSize.x;
 const floorZScale=GROUND_TILE_SPAN/floorSize.z;
 const tileY=GROUND_SURFACE_Y+floor.position.y-floorBounds.max.y;
 for(let x=0;x<fieldWidth;x+=GROUND_TILE_SPAN)for(let z=0;z<fieldDepth;z+=GROUND_TILE_SPAN){
  const panel=floor.clone(true);
  panel.scale.x*=floorXScale;panel.scale.z*=floorZScale;
  panel.position.set(
   x+GROUND_TILE_SPAN/2-(floorCenter.x-floor.position.x)*floorXScale,
   tileY,
   z+GROUND_TILE_SPAN/2-(floorCenter.z-floor.position.z)*floorZScale
  );
  world.add(panel);
 }
 const rand=i=>{const t=Math.sin(i*102.64+18.82)*43758.5453;return t-Math.floor(t)};
 const count=mobile?32:56;
 for(let i=0;i<count;i++){
  const x=rand(i+21)*54,z=rand(i+991)*39;
  if(Math.hypot(x-frame.camp.x*ratio,z-frame.camp.y*ratio)<3.1||Math.hypot(x-frame.hill.x*ratio,z-frame.hill.y*ratio)<2.6)continue;
  const kind=i%5===0?'mushroom':i%7===0?'foliage':'tree';
  const model=derived(kind,kind==='tree'?9+rand(i+810)*7:kind==='mushroom'?1.7+rand(i)*2:2+rand(i)*2.4,kind==='tree'?'#96c486':kind==='mushroom'?'#d6b77d':'#9ddc7f');
  model.position.set(x,0,z);model.rotation.y=rand(i+345)*Math.PI*2;
  decor.add(model);
 }
 for(let i=0;i<20;i++){
  const angle=i*2.399,mag=Math.sqrt((i+1)/20);
  const p=derived('stone',.3,'#d4c6a0');
  p.position.set((frame.gravel.x+Math.cos(angle)*frame.gravel.rx*mag)*ratio,0,(frame.gravel.y+Math.sin(angle)*frame.gravel.ry*mag)*ratio);
  decor.add(p);
 }
 for(let i=0;i<5;i++){
  const p=derived('stone',.5,'#a47a51');
  p.position.set((frame.hill.x+Math.cos(i*1.26)*frame.hill.r*.45)*ratio,0,(frame.hill.y+Math.sin(i*1.26)*frame.hill.r*.35)*ratio);
  decor.add(p);
 }
}
function actorsFromFrame(frame){
 avatar=new THREE.Group();
 const model=derived('hero',1.56,'#d1cbb1');avatar.add(model);actors.add(avatar);
 // 원본 KayKit CC0 GLB 내 실제 76개 리그 모션을 사용한다. 자체 제작 임시 모션 대신
 // Idle/Running/Attack/Stab/Spin/Dodge/Hit의 원본 애니메이션 클립을 교차 페이드한다.
 heroMixer=new THREE.AnimationMixer(model);
 const sourceNames={idle:'Idle',run:'Running_A',stab:'1H_Melee_Attack_Stab',
  spin:'2H_Melee_Attack_Spin',dodge:'Dodge_Forward',hit:'Hit_A',death:'Death_A'};
 for(const [key,name] of Object.entries(sourceNames)){
  const clip=originalClips.find(row=>row.name===name);
  if(clip)heroActions[key]=heroMixer.clipAction(clip);
 }
 if(heroActions.idle){heroActions.idle.play();playingAction='idle'}
 for(const b of frame.bugs){
  const kind=b.type==='spider'?'spider':'crawler';
  const height={spider:.92,beetle:.7,soldierAnt:.62,ant:.45,mite:.36}[b.type]||.48;
  const color={spider:'#d0a2a0',beetle:'#628b74',soldierAnt:'#b16a53',ant:'#8d644b',mite:'#9f8f75'}[b.type];
  const group=new THREE.Group();group.add(derived(kind,height,color));actors.add(group);enemies.push(group);
 }
 const nodeOrigin={branch:'foliage',fiber:'foliage',pebble:'stone'};
 for(const n of frame.nodes){const group=new THREE.Group();group.add(derived(nodeOrigin[n.type]||'stone',n.type==='pebble'?.33:.5,n.type==='fiber'?'#c2dca0':'#bda782'));actors.add(group);resources.push(group)}
}
// 액션 모션: CC0 원본 단발 클립과 반복 이동을 구분한다. 판정·재사용 시간은 게임이 소유한다.
function setHeroMotion(motion,restart=false,duration=0){
 const next=heroActions[motion];
 if(!next||(playingAction===motion&&!restart))return;
 const prev=heroActions[playingAction];if(prev&&prev!==next)prev.fadeOut(.13);
 const once=motion!=='idle'&&motion!=='run';
 next.reset().setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
 next.clampWhenFinished=once;
 next.setEffectiveTimeScale(1);
 if(duration>0)next.setDuration(duration);
 next.fadeIn(.13).play();playingAction=motion;
}
// 시각 레이어만 연속 보간한다. 게임이 소유한 위치·충돌·이동속도는 그대로 사용한다.
function blendFacingYaw(current,target,dt){
 const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
 const blend=1-Math.exp(-Math.min(.05,Math.max(0,Number(dt)||0))*10);
 return current+delta*blend;
}
function visualWalking(wasWalking,travel,dt){
 if(!Number.isFinite(dt)||dt<=0)return Boolean(wasWalking);
 // 프레임별 거리 대신 초당 이동량을 사용해 30/60/120Hz 상태 떨림을 줄인다.
 const speed=Math.max(0,Number(travel)||0)/Math.max(1/240,Math.min(.05,dt));
 return speed>(wasWalking?.13:.24);
}
function follow(frame,dt){
 const p=frame.player,pos=to3(p);
 const travel=Math.hypot(pos.x-(avatar.userData.lastX??pos.x),pos.z-(avatar.userData.lastZ??pos.z));
 avatar.userData.lastX=pos.x;avatar.userData.lastZ=pos.z;
 avatar.position.copy(pos);
 const dirX=Number(p.dirX),dirY=Number(p.dirY);
 if(Number.isFinite(dirX)&&Number.isFinite(dirY)&&Math.hypot(dirX,dirY)>1e-5){
  const wantedYaw=Math.atan2(dirX,dirY);
  avatar.rotation.y=avatar.userData.facingInitialized
   ?blendFacingYaw(avatar.rotation.y,wantedYaw,dt):wantedYaw;
  avatar.userData.facingInitialized=true;
 }
 const walking=visualWalking(avatar.userData.wasWalking===true,travel,dt);
 avatar.userData.wasWalking=walking;
 const swing=(p.swingTimer||0)>0,roll=(p.rollTimer||0)>0;
 const motion=frame.state.dead?'death':p.hit>0?'hit':roll?'dodge':swing?(p.motionAction==='spin'?'spin':'stab'):walking?'run':'idle';
 const serial=Number(p.motionSerial)||0;
 const replay=serial!==(avatar.userData.motionSerial??serial)&&['stab','spin','dodge'].includes(motion);
 const duration=motion==='dodge'?(Number(p.rollTimer)||0):['stab','spin'].includes(motion)?(Number(p.swingTimer)||0):0;
 setHeroMotion(motion,replay,duration);
 avatar.userData.motionSerial=serial;
 if(heroMixer)heroMixer.update(dt);
 const night=frame.state.time/95>.68;
 sun.intensity=night?.25:2.7;moon.intensity=night?1.7:.0;
 scene.background.set(night?'#263c3f':'#a2b998');
 scene.fog.color.set(night?'#293e3e':'#7eaa80');
 const dir=new THREE.Vector3(p.dirX,0,p.dirY).normalize();
 // Low over-shoulder camera, looking through giant grass. Combat widens framing slightly.
 const nearby=frame.bugs.some(b=>!b.dead&&Math.hypot(b.x-p.x,b.y-p.y)<250);
 const behind=new THREE.Vector3(pos.x-dir.x*(nearby?8.2:6.8),nearby?5.2:4.65,pos.z-dir.z*(nearby?8.2:6.8));
 camera.position.lerp(behind,Math.min(1,dt*5));
 const focus=pos.clone();focus.y=1.25;camera.lookAt(focus);
 for(let i=0;i<frame.bugs.length;i++){
  const b=frame.bugs[i],actor=enemies[i];if(!actor)continue;
  actor.visible=!b.dead;
  if(!b.dead){actor.position.set(b.x*ratio,GROUND_SURFACE_Y+FOOT_CLEARANCE,b.y*ratio);actor.rotation.y=Math.atan2(p.x-b.x,p.y-b.y);actor.children[0].rotation.z=b.hit>0?.28:0}
 }
 // Resource nodes may respawn; remake lightweight CC0 derived models only when changed.
 let alive=frame.nodes.length;
 if(resources.length!==alive){
  while(resources.length){const old=resources.pop();actors.remove(old)}
  for(const n of frame.nodes){const type=n.type==='pebble'?'stone':'foliage';const g=new THREE.Group();g.add(derived(type,n.type==='pebble'?.35:.65,'#cbd8a9'));actors.add(g);resources.push(g)}
 }
 for(let i=0;i<frame.nodes.length;i++)resources[i].position.set(frame.nodes[i].x*ratio,GROUND_SURFACE_Y+FOOT_CLEARANCE,frame.nodes[i].y*ratio);
}
function resize(){
 renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
// Restore the authoritative 2D game if WebGL fails after initial loading.
// A hidden legacy canvas must never leave the player in a blank, unsavable view.
function restoreLegacyView(reason,error=null){
 worldReady=false;
 window.insectScene3DReady=false;
 const legacy=document.getElementById('cv');
 if(legacy)legacy.style.visibility='visible';
 renderer.domElement.style.display='none';
 if(error)console.error(reason,error);else console.warn(reason);
}
renderer.domElement.addEventListener('webglcontextlost',event=>{
 event.preventDefault();
 restoreLegacyView('INSECT_WEBGL_CONTEXT_LOST');
},{passive:false});
async function start(){
 try{
  for(const key of Object.keys(BASE))originals[key]=await original(key);
  const frame=snapshot();if(!frame)throw Error('기존 게임 월드 상태를 읽을 수 없음');
  environment(frame);actorsFromFrame(frame);
  worldReady=true;window.insectScene3DReady=true;
  const legacy=document.getElementById('cv');legacy.style.visibility='hidden';
  renderer.domElement.style.display='block';announce.remove();
  clock.start();tick();
 }catch(error){
  announce.textContent='3D CC0 모델 불러오기 실패 · 기존 저장 가능한 화면 유지';
  restoreLegacyView('INSECT_CC0_3D_ASSET_FAILED',error);
  // Failed 3D dependency leaves authoritative legacy game playable rather than a blank screen.
 }
}
function tick(){
 if(!worldReady)return;
 requestAnimationFrame(tick);
 try{
  const dt=Math.min(.05,clock.getDelta()),frame=snapshot();
  if(frame){time+=dt;follow(frame,dt);renderer.render(scene,camera)}
 }catch(error){
  restoreLegacyView('INSECT_WEBGL_FRAME_FAILED',error);
 }
}
start();
