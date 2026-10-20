// 파일명: web-games/insect-survival/world3d.mjs
// 기존 조작·전투·채집·저장 판단은 index.html이 담당한다. CC0 원본의 비파괴 3D 표현만 담당.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
const asset=new URL('../../assets/',import.meta.url);
const BASE=Object.freeze({
 hero:{src:'roblox/actors/native/knight.glb',format:'glb',height:1.32,color:'#cfcc9e'},
 crawler:{src:'shared/forest/caterpillar.glb',format:'glb',height:.62,color:'#c8df94'},
 spider:{src:'shared/forest/monster-53.obj',format:'obj',height:.86,color:'#d5a1a5'},
 tree:{src:'shared/forest/tree.fbx',format:'fbx',height:9,color:'#76bb72'},
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
 if(!model||new THREE.Box3().setFromObject(model).isEmpty())throw Error('CC0 원본 비어 있음 '+src);
 return model;
}
function derived(key,height,tint){
 const model=originals[key].clone(true),bounds=new THREE.Box3().setFromObject(model),dim=bounds.getSize(new THREE.Vector3());
 const ratio=height/Math.max(.0001,dim.y);
 model.scale.multiplyScalar(ratio);model.position.y=-bounds.min.y*ratio;
 const color=new THREE.Color(tint||BASE[key].color);
 model.traverse(part=>{
  if(!part.isMesh)return;
  const transform=mat=>{
   const result=mat?.clone?.()||new THREE.MeshStandardMaterial();
   if(result.color)result.color.multiply(color);
   result.side=THREE.DoubleSide;result.roughness=1;result.metalness=0;
   return result;
  };
  part.material=Array.isArray(part.material)?part.material.map(transform):transform(part.material);
  part.castShadow=false;part.receiveShadow=true;
 });
 return model;
}
const originals={},enemies=[],resources=[];
let avatar=null,worldReady=false,time=0,fieldBuilt=false;
const world=new THREE.Group(),actors=new THREE.Group(),decor=new THREE.Group();scene.add(world,actors,decor);
const announce=document.createElement('div');announce.textContent='CC0 3D 숲과 캐릭터 불러오는 중…';
Object.assign(announce.style,{position:'absolute',zIndex:'8',top:'42%',left:'50%',transform:'translate(-50%,-50%)',padding:'13px 19px',border:'1px solid #b3ac7b',borderRadius:'8px',background:'#1a2d26e8',fontSize:'12px',color:'#f2e4ba',pointerEvents:'none'});
game.append(announce);
const ratio=.025,to3=p=>new THREE.Vector3(p.x*ratio,0,p.y*ratio);
function environment(frame){
 if(fieldBuilt)return;fieldBuilt=true;
 const floor=derived('floor',.18,'#adc291');
 // Grounded-like miniature yard: original CC0 ground panel tiled under the grass canopy.
 for(let x=0;x<56;x+=5)for(let z=0;z<42;z+=4){
  const panel=floor.clone(true);panel.position.set(x,0,z);panel.scale.x*=4.8;panel.scale.z*=4.8;
  world.add(panel);
 }
 const rand=i=>{const t=Math.sin(i*102.64+18.82)*43758.5453;return t-Math.floor(t)};
 const count=mobile?47:79;
 for(let i=0;i<count;i++){
  const x=rand(i+21)*54,z=rand(i+991)*39;
  if(Math.hypot(x-frame.camp.x*ratio,z-frame.camp.y*ratio)<3.1||Math.hypot(x-frame.hill.x*ratio,z-frame.hill.y*ratio)<2.6)continue;
  const kind=i%5===0?'mushroom':i%7===0?'foliage':'tree';
  const model=derived(kind,kind==='tree'?9+rand(i+810)*7:kind==='mushroom'?1.7+rand(i)*2:2+rand(i)*2.4,kind==='tree'?'#96c486':kind==='mushroom'?'#d6b77d':'#9ddc7f');
  model.position.set(x,0,z);model.rotation.y=rand(i+345)*Math.PI*2;
  decor.add(model);
 }
 for(let i=0;i<30;i++){
  const angle=i*2.399,mag=Math.sqrt((i+1)/30);
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
 avatar=new THREE.Group();avatar.add(derived('hero',1.56,'#d1cbb1'));actors.add(avatar);
 for(const b of frame.bugs){
  const kind=b.type==='spider'?'spider':'crawler';
  const height={spider:.92,beetle:.7,soldierAnt:.62,ant:.45,mite:.36}[b.type]||.48;
  const color={spider:'#d0a2a0',beetle:'#628b74',soldierAnt:'#b16a53',ant:'#8d644b',mite:'#9f8f75'}[b.type];
  const group=new THREE.Group();group.add(derived(kind,height,color));actors.add(group);enemies.push(group);
 }
 const nodeOrigin={branch:'foliage',fiber:'foliage',pebble:'stone'};
 for(const n of frame.nodes){const group=new THREE.Group();group.add(derived(nodeOrigin[n.type]||'stone',n.type==='pebble'?.33:.5,n.type==='fiber'?'#c2dca0':'#bda782'));actors.add(group);resources.push(group)}
}
function follow(frame,dt){
 const p=frame.player,pos=to3(p);
 avatar.position.copy(pos);
 avatar.rotation.y=Math.atan2(p.dirX,p.dirY);
 const hero=avatar.children[0];
 const swing=(p.swingTimer||0)>0,roll=(p.rollTimer||0)>0;
 hero.rotation.z=roll?Math.sin((.39-p.rollTimer)*18)*1.2:swing?Math.sin((.38-p.swingTimer)*10)*.36:0;
 hero.position.y+=Math.sin(time*7)*.004;
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
  if(!b.dead){actor.position.set(b.x*ratio,0,b.y*ratio);actor.rotation.y=Math.atan2(p.x-b.x,p.y-b.y);actor.children[0].rotation.z=b.hit>0?.28:0}
 }
 // Resource nodes may respawn; remake lightweight CC0 derived models only when changed.
 let alive=frame.nodes.length;
 if(resources.length!==alive){
  while(resources.length){const old=resources.pop();actors.remove(old)}
  for(const n of frame.nodes){const type=n.type==='pebble'?'stone':'foliage';const g=new THREE.Group();g.add(derived(type,n.type==='pebble'?.35:.65,'#cbd8a9'));actors.add(g);resources.push(g)}
 }
 for(let i=0;i<frame.nodes.length;i++)resources[i].position.set(frame.nodes[i].x*ratio,0,frame.nodes[i].y*ratio);
}
function resize(){
 renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
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
  console.error('INSECT_CC0_3D_ASSET_FAILED',error);
  // Failed 3D dependency leaves authoritative legacy game playable rather than a blank screen.
 }
}
function tick(){
 if(!worldReady)return;
 requestAnimationFrame(tick);
 const dt=Math.min(.05,clock.getDelta()),frame=snapshot();
 if(frame){time+=dt;follow(frame,dt);renderer.render(scene,camera)}
}
start();
