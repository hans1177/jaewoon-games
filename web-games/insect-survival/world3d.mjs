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
// On low-end Android software/GPU paths, scale ONLY WebGL pixel work.
 // Source assets, physics, input cadence and game saves are never throttled.
const perfBudget={
 cap:Math.min(devicePixelRatio||1,mobile?1.3:1.65),
 pixelRatio:Math.min(devicePixelRatio||1,mobile?1.3:1.65),
 floor:Math.min(devicePixelRatio||1,mobile?.8:1),
 frames:0,sampled:0,windowMs:0,averageFrameMs:0,latestFrameMs:0,
 slowWindows:0,fastWindows:0,adjustments:0,lastAdjustmentAt:0,
 lastFrameAt:0,frameSampleValid:false,renderCalls:0,triangles:0
};
renderer.setPixelRatio(perfBudget.pixelRatio);
// Sample actual animation-frame intervals, not GPU timing or fabricated device FPS.
// Ignore background/first-frame gaps and use hysteresis to avoid resolution thrashing.
function sampleWebFrameBudget(now){
 const interval=now-perfBudget.lastFrameAt;perfBudget.lastFrameAt=now;
 if(document.hidden||!Number.isFinite(interval)||interval<=0||interval>150)return;
 perfBudget.frames++;perfBudget.sampled++;perfBudget.windowMs+=interval;
 perfBudget.latestFrameMs=interval;perfBudget.frameSampleValid=true;
 if(perfBudget.sampled<45)return;
 const average=perfBudget.windowMs/perfBudget.sampled;
 perfBudget.averageFrameMs=average;perfBudget.sampled=0;perfBudget.windowMs=0;
 perfBudget.slowWindows=average>23?perfBudget.slowWindows+1:0;
 perfBudget.fastWindows=average<16.5?perfBudget.fastWindows+1:0;
 if(now-perfBudget.lastAdjustmentAt<2000)return;
 let next=perfBudget.pixelRatio;
 if(perfBudget.slowWindows>=2)next=Math.max(perfBudget.floor,Math.round((next-.15)*100)/100);
 else if(perfBudget.fastWindows>=4)next=Math.min(perfBudget.cap,Math.round((next+.1)*100)/100);
 if(next!==perfBudget.pixelRatio){
  perfBudget.pixelRatio=next;renderer.setPixelRatio(next);perfBudget.adjustments++;
  perfBudget.lastAdjustmentAt=now;perfBudget.slowWindows=0;perfBudget.fastWindows=0;
 }
}
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
let resourceVisualRebuilds=0,decorVisibilityTick=0;
const resourceGpuMeshes=new Map();
let resourceGpuModels=0,resourceGpuRevision='',resourceGpuUpdates=0;
let floorGpuMeshes=[],floorGpuInstances=0;
let decorGpuBatches=0,decorGpuInstances=0,decorGpuProps=0;
const hiddenDecorTransform=new THREE.Matrix4().makeTranslation(0,-1000,0);
const heroGroundBounds=new THREE.Box3();
const headingVector=new THREE.Vector3(),cameraBehind=new THREE.Vector3(),cameraFocus=new THREE.Vector3();
const world=new THREE.Group(),actors=new THREE.Group(),decor=new THREE.Group();scene.add(world,actors,decor);
const announce=document.createElement('div');announce.textContent='CC0 3D 숲과 캐릭터 불러오는 중…';
Object.assign(announce.style,{position:'absolute',zIndex:'8',top:'42%',left:'50%',transform:'translate(-50%,-50%)',padding:'13px 19px',border:'1px solid #b3ac7b',borderRadius:'8px',background:'#1a2d26e8',fontSize:'12px',color:'#f2e4ba',pointerEvents:'none'});
game.append(announce);
// Grounding is measured from the CC0 floor's actual world-space top surface.
// All game-state coordinates remain unchanged; these constants affect visuals only.
const ratio=.025,GROUND_SURFACE_Y=0,FOOT_CLEARANCE=.035,GROUND_TILE_SPAN=14;
const to3=p=>new THREE.Vector3(p.x*ratio,GROUND_SURFACE_Y+FOOT_CLEARANCE,p.y*ratio);
// Keep original CC0 panel objects as non-rendered geometry evidence while
// rendering the same 12 transforms in GPU batches. No floor geometry edits.
function batchGroundTiles(tiles){
 if(!THREE.InstancedMesh||tiles.length===0)return false;
 const batches=[];
 try{
  const surfaces=[];
  for(const tile of tiles){
   tile.updateMatrixWorld(true);
   const meshes=[];
   tile.traverse(part=>{if(part.isMesh)meshes.push(part)});
   if(!meshes.length||(surfaces.length&&meshes.length!==surfaces[0].length))
    throw Error('CC0_TILE_COMPONENT_MISMATCH');
   surfaces.push(meshes);
  }
  for(let part=0;part<surfaces[0].length;part++){
   const sample=surfaces[0][part];
   const batch=new THREE.InstancedMesh(sample.geometry,sample.material,tiles.length);
   batch.userData.cc0FloorInstance=true;
   batch.frustumCulled=false; // tiny fixed field; prevent incomplete bounds clipping
   batch.castShadow=false;batch.receiveShadow=true;
   for(let tile=0;tile<tiles.length;tile++)
    batch.setMatrixAt(tile,surfaces[tile][part].matrixWorld);
   batch.instanceMatrix.needsUpdate=true;
   batches.push(batch);
  }
  for(const mesh of batches)world.add(mesh);
  for(const tile of tiles)tile.visible=false;
  floorGpuMeshes=batches;floorGpuInstances=tiles.length;
  return true;
 }catch(error){
  for(const batch of batches)batch.dispose?.();
  console.warn('INSECT_CC0_FLOOR_GPU_BATCH_FAILED',error);
  return false; // Original, unchanged CC0 tiles remain playable/visible.
 }
}
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
  panel.userData.isGroundTile=true;
  world.add(panel);
 }
 const floorTiles=world.children.filter(item=>item.userData.isGroundTile===true);
 batchGroundTiles(floorTiles);
 // Read-only browser QA evidence from actual transformed 3D meshes.
 window.insect3DGroundingProof=()=>{
  const tiles=world.children.filter(item=>item.userData.isGroundTile===true);
  const first=tiles[0];
  const floorTop=first?new THREE.Box3().setFromObject(first).max.y:null;
  const heroBottom=avatar?new THREE.Box3().setFromObject(avatar).min.y:null;
  return {tileCount:tiles.length,floorTop,heroBottom,
   floorGpuBatches:floorGpuMeshes.length,
   floorGpuInstances,
   floorGpuVisible:floorGpuMeshes.length>0&&floorGpuMeshes.every(mesh=>mesh.visible!==false&&mesh.count===tiles.length),
   worldReady,heroPresent:Boolean(avatar),
   animationGroundLift:avatar?.userData.visualGroundCorrection??0,
   // Stable visual-only world reference, not a gameplay collision claim.
   groundReferenceY:GROUND_SURFACE_Y};
 };
 const rand=i=>{const t=Math.sin(i*102.64+18.82)*43758.5453;return t-Math.floor(t)};
 const count=mobile?32:56;
 for(let i=0;i<count;i++){
  const x=rand(i+21)*54,z=rand(i+991)*39;
  if(Math.hypot(x-frame.camp.x*ratio,z-frame.camp.y*ratio)<3.1||Math.hypot(x-frame.hill.x*ratio,z-frame.hill.y*ratio)<2.6)continue;
  const kind=i%5===0?'mushroom':i%7===0?'foliage':'tree';
  const model=derived(kind,kind==='tree'?9+rand(i+810)*7:kind==='mushroom'?1.7+rand(i)*2:2+rand(i)*2.4,kind==='tree'?'#96c486':kind==='mushroom'?'#d6b77d':'#9ddc7f');
  model.position.set(x,0,z);model.rotation.y=rand(i+345)*Math.PI*2;
  model.userData.visualRange=kind==='tree'?37:kind==='mushroom'?27:30;
  decor.add(model);
 }
 for(let i=0;i<20;i++){
  const angle=i*2.399,mag=Math.sqrt((i+1)/20);
  const p=derived('stone',.3,'#d4c6a0');
  p.position.set((frame.gravel.x+Math.cos(angle)*frame.gravel.rx*mag)*ratio,0,(frame.gravel.y+Math.sin(angle)*frame.gravel.ry*mag)*ratio);
  p.userData.visualRange=25;decor.add(p);
 }
 for(let i=0;i<5;i++){
  const p=derived('stone',.5,'#a47a51');
  p.position.set((frame.hill.x+Math.cos(i*1.26)*frame.hill.r*.45)*ratio,0,(frame.hill.y+Math.sin(i*1.26)*frame.hill.r*.35)*ratio);
  p.userData.visualRange=30;decor.add(p);
 }
 batchStaticDecor();
}
// GPU batch only identical static CC0 meshes with the same original geometry
// and presentation material. Unknown, animated, or unmatched props remain
// ordinary meshes; gameplay state and original CC0 source objects are untouched.
function batchStaticDecor(){
 if(!THREE.InstancedMesh)return;
 const buckets=[];
 for(const parent of decor.children){
  const meshes=[];
  parent.updateMatrixWorld(true);
  parent.traverse(part=>{if(part.isMesh)meshes.push(part)});
  if(!meshes.length||meshes.some(mesh=>mesh.isSkinnedMesh||!mesh.geometry||
     !mesh.material||Array.isArray(mesh.material)))continue;
  let bucket=buckets.find(item=>item.sample.length===meshes.length&&
    meshes.every((mesh,i)=>mesh.geometry===item.sample[i].geometry&&
      mesh.material===item.sample[i].material));
  if(!bucket){bucket={sample:meshes,props:[]};buckets.push(bucket)}
  bucket.props.push({parent,meshes});
 }
 for(const bucket of buckets){
  if(bucket.props.length<2)continue;
  const batches=[];
  try{
   for(let part=0;part<bucket.sample.length;part++){
    const master=bucket.sample[part];
    const batch=new THREE.InstancedMesh(master.geometry,master.material,bucket.props.length);
    batch.userData.cc0DecorInstance=true;
    batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;
    for(let i=0;i<bucket.props.length;i++)
      batch.setMatrixAt(i,bucket.props[i].meshes[part].matrixWorld);
    batch.instanceMatrix.needsUpdate=true;
    batches.push(batch);
   }
   for(const batch of batches)scene.add(batch);
   for(let i=0;i<bucket.props.length;i++){
    const item=bucket.props[i];
    item.parent.userData.decorBatchSlots=batches.map((batch,part)=>({
      batch,slot:i,matrix:item.meshes[part].matrixWorld
    }));
    item.parent.userData.rangeVisible=true;
    item.parent.visible=false; // no duplicate CC0 master draws
   }
   decorGpuBatches+=batches.length;
   decorGpuInstances+=bucket.props.length*batches.length;
   decorGpuProps+=bucket.props.length;
  }catch(error){
   for(const batch of batches)batch.dispose?.();
   console.warn('INSECT_CC0_DECOR_GPU_BATCH_FAILED',error);
  }
 }
}
// Fog-distance render culling applies ONLY to cosmetic CC0 props, never to
// combat enemies, pickups, floor panels, or the authoritative game world.
// The 4m visible/hidden gap avoids rapid popping near the same distance.
function refreshDecorVisibility(heroX,heroZ,immediate=false){
 if(!immediate&&++decorVisibilityTick%8!==0)return;
 for(const item of decor.children){
  const range=item.userData.visualRange;
  if(!range)continue;
  const slots=item.userData.decorBatchSlots;
  const current=slots?item.userData.rangeVisible!==false:item.visible;
  const effectiveRange=range+(current?4:-4);
  const dx=item.position.x-heroX,dz=item.position.z-heroZ;
  const next=dx*dx+dz*dz<=effectiveRange*effectiveRange;
  if(slots){
   if(next!==current){
    for(const row of slots){
     row.batch.setMatrixAt(row.slot,next?row.matrix:hiddenDecorTransform);
     row.batch.instanceMatrix.needsUpdate=true;
    }
   }
   item.userData.rangeVisible=next;
  }else item.visible=next;
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
 for(const n of frame.nodes)syncResourceVisual(resources.length,n);
 refreshDecorVisibility(frame.player.x*ratio,frame.player.y*ratio,true);
}
// Reconcile by slot instead of cloning every CC0 resource when an item is picked
// up or respawns. A role change still rebinds the correct source geometry/color.
function syncResourceVisual(index,node){
 const type=node.type==='pebble'?'stone':'foliage';
 const height=node.type==='pebble'?.33:.5;
 const tint=node.type==='fiber'?'#c2dca0':'#bda782';
 const visualKey=type+':'+height+':'+tint;
 let group=resources[index];
 if(!group){group=new THREE.Group();actors.add(group);resources.push(group)}
 if(group.userData.visualKey!==visualKey){
  group.clear();group.add(derived(type,height,tint));
  group.userData.visualKey=visualKey;resourceVisualRebuilds++;
 }
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
// KayKit's authored animation clips can shift the animated skinned-mesh bounds
// beneath the floor even when the source mesh was normalized correctly.
// Resolve penetration on the presentation group AFTER the original mixer runs;
// never move the gameplay player or rewrite any CC0 bone/animation tracks.
function groundAnimatedHero(){
 const bounds=heroGroundBounds.setFromObject(avatar);
 if(bounds.isEmpty())return;
 const penetration=GROUND_SURFACE_Y+FOOT_CLEARANCE-bounds.min.y;
 const lift=Math.max(0,penetration);
 if(lift>0){
  avatar.position.y+=lift;
  avatar.updateMatrixWorld(true);
 }
 avatar.userData.visualGroundCorrection=lift;
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
 groundAnimatedHero();
 const night=frame.state.time/95>.68;
 sun.intensity=night?.25:2.7;moon.intensity=night?1.7:.0;
 scene.background.set(night?'#263c3f':'#a2b998');
 scene.fog.color.set(night?'#293e3e':'#7eaa80');
 const dx=Number(p.dirX),dz=Number(p.dirY);
 const dir=headingVector.set(Number.isFinite(dx)?dx:0,0,Number.isFinite(dz)?dz:0);
 if(dir.lengthSq()<1e-8)dir.set(0,0,1);else dir.normalize();
 // Low over-shoulder camera, looking through giant grass. Combat widens framing slightly.
 const nearby=frame.bugs.some(b=>!b.dead&&Math.hypot(b.x-p.x,b.y-p.y)<250);
 const behind=cameraBehind.set(pos.x-dir.x*(nearby?8.2:6.8),nearby?5.2:4.65,pos.z-dir.z*(nearby?8.2:6.8));
 camera.position.lerp(behind,Math.min(1,dt*5));
 cameraFocus.set(pos.x,1.25,pos.z);camera.lookAt(cameraFocus);
 refreshDecorVisibility(pos.x,pos.z);
 for(let i=0;i<frame.bugs.length;i++){
  const b=frame.bugs[i],actor=enemies[i];if(!actor)continue;
  actor.visible=!b.dead;
  if(!b.dead){actor.position.set(b.x*ratio,GROUND_SURFACE_Y+FOOT_CLEARANCE,b.y*ratio);actor.rotation.y=Math.atan2(p.x-b.x,p.y-b.y);actor.children[0].rotation.z=b.hit>0?.28:0}
 }
// Repeated CC0 stone/foliage pickup visuals share the original geometries
// and derived materials. Keep scene groups for fallback and gameplay-ground QA.
// Update instance buffers ONLY when pickup positions/types change, not every RAF.
function syncResourceGpuInstances(nodes){
 if(!THREE.InstancedMesh)return;
 const revision=nodes.map(n=>n.type+':'+n.x+':'+n.y).join('|');
 if(revision===resourceGpuRevision)return;
 const entries=new Map();
 try{
  for(const group of resources){
   group.updateMatrixWorld(true);
   let parts=0;
   group.traverse(part=>{
    if(!part.isMesh)return;
    if(part.isSkinnedMesh||!part.geometry||!part.material||Array.isArray(part.material))
     throw Error('UNSUPPORTED_RESOURCE_GPU_PART');
    parts++;
    const key=part.geometry.uuid+'|'+part.material.uuid;
    if(!entries.has(key))entries.set(key,{geometry:part.geometry,material:part.material,parts:[]});
    entries.get(key).parts.push(part);
   });
   if(!parts)throw Error('EMPTY_RESOURCE_GPU_PART');
  }
  for(const [key,entry] of entries){
   let batch=resourceGpuMeshes.get(key);
   const capacity=Math.max(128,nodes.length*2);
   if(!batch||batch.instanceMatrix.count<entry.parts.length){
    const replacement=new THREE.InstancedMesh(entry.geometry,entry.material,capacity);
    replacement.userData.cc0ResourceInstance=true;
    replacement.frustumCulled=false;replacement.castShadow=false;
    replacement.receiveShadow=true;
    actors.add(replacement);
    if(batch){actors.remove(batch);batch.dispose?.()}
    batch=replacement;resourceGpuMeshes.set(key,batch);
   }
   for(let i=0;i<entry.parts.length;i++)batch.setMatrixAt(i,entry.parts[i].matrixWorld);
   batch.count=entry.parts.length;
   batch.instanceMatrix.needsUpdate=true;
   batch.visible=true;
  }
  for(const [key,batch] of resourceGpuMeshes){
   if(!entries.has(key))batch.count=0;
  }
  for(const group of resources)group.visible=false; // zero double draws
  resourceGpuModels=nodes.length;resourceGpuRevision=revision;resourceGpuUpdates++;
 }catch(error){
  for(const batch of resourceGpuMeshes.values())batch.visible=false;
  for(const group of resources)group.visible=true; // intact original CC0 fallback
  resourceGpuModels=0;resourceGpuRevision='';
  console.warn('INSECT_CC0_RESOURCE_GPU_BATCH_FAILED',error);
 }
}
 // Resource pooling is visual-only; the authoritative alive state stays in index.html.
 while(resources.length>frame.nodes.length){actors.remove(resources.pop())}
 for(let i=0;i<frame.nodes.length;i++){
  const node=frame.nodes[i];
  syncResourceVisual(i,node);
  resources[i].position.set(node.x*ratio,GROUND_SURFACE_Y+FOOT_CLEARANCE,node.y*ratio);
 }
 syncResourceGpuInstances(frame.nodes);
}
function resize(){
 renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
window.insect3DPerformanceProof=()=>({
 version:1,kind:'VIBE_WEB_RUNTIME_FRAME_EVIDENCE',advisoryOnly:true,
 source:'insect-survival/world3d.mjs',ready:worldReady,
 framesObserved:perfBudget.frames,frameSampleValid:perfBudget.frameSampleValid,
 averageFrameMs:perfBudget.averageFrameMs,latestFrameMs:perfBudget.latestFrameMs,
 pixelRatio:perfBudget.pixelRatio,pixelRatioCap:perfBudget.cap,pixelRatioFloor:perfBudget.floor,
 resolutionAdjustments:perfBudget.adjustments,resourceVisualRebuilds,
 resourceGpuBatches:resourceGpuMeshes.size,resourceGpuModels,resourceGpuUpdates,
 floorGpuBatches:floorGpuMeshes.length,floorGpuInstances,
 decorGpuBatches,decorGpuInstances,decorGpuProps,
 visibleDecor:decor.children.filter(item=>item.userData.decorBatchSlots?
   item.userData.rangeVisible!==false:item.visible).length,
 totalDecor:decor.children.length,
 renderCalls:perfBudget.renderCalls,triangles:perfBudget.triangles,
 activeWebGL:worldReady&&renderer.domElement.dataset.renderedFrame==='true',
 rendererVisible:renderer.domElement.style.display==='block',
 // No physical-device benchmark claim: software Chromium is useful for diagnosis only.
 hardwareBenchmarkVerified:false
});
addEventListener('resize',resize);
// Restore the authoritative 2D game if WebGL fails after initial loading.
// A hidden legacy canvas must never leave the player in a blank, unsavable view.
function restoreLegacyView(reason,error=null){
 worldReady=false;
 window.insectScene3DReady=false;
 const legacy=document.getElementById('cv');
 if(legacy)legacy.style.visibility='visible';
 renderer.domElement.style.display='none';
 renderer.domElement.dataset.renderedFrame='false';
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
  if(frame&&!document.hidden){
   time+=dt;
   follow(frame,dt);
   renderer.render(scene,camera);
   renderer.domElement.dataset.renderedFrame='true';
   perfBudget.renderCalls=renderer.info.render.calls;
   perfBudget.triangles=renderer.info.render.triangles;
   sampleWebFrameBudget(performance.now());
  }else if(document.hidden){
   // Browser already throttles RAF; never spend GPU work on an invisible tab.
   perfBudget.lastFrameAt=0;perfBudget.sampled=0;perfBudget.windowMs=0;
  }
 }catch(error){
  restoreLegacyView('INSECT_WEBGL_FRAME_FAILED',error);
 }
}
start();
