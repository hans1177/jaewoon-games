// 파일명: web-games/forest-survival/world.mjs
// 임포트: 저장소 내부 Three.js와 출처가 등록된 CC0 원본 메시
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';

// 에셋: 상자·원형·절차형 캐릭터 대신 원래의 3D 모델 사용
const ROOT=new URL('../../assets/',import.meta.url);
const MODELS={
 hero:['roblox/actors/native/rogue.glb',1.9],
 ground:['shared/homely-house/floor_base.obj',1],
 tree:['shared/homely-house/tree_large.obj',6],
 stone:['shared/homely-house/cobblestones.obj',.8],
 berry:['shared/homely-house/foliage_A.obj',1.1],
 boar:['shared/forest/hog.glb',1.55],
 wolf:['shared/forest/wolf.fbx',1.6],
 tiger:['shared/forest/tiger.glb',1.75],
 bat:['shared/forest/bat.fbx',.95],
 rabbit:['shared/forest/bunny.glb',.72],
 deer:['shared/forest/deer-real.glb',1.85]
};
const SCALE=60;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const random=(seed)=>{const t=Math.sin(seed*128.37+33.73)*43758.5453;return t-Math.floor(t)};
const materials={ground:0x759264,tree:0x7c9970,stone:0xb0ad9a,berry:0x80b36d};
function recolor(group,color){
 group.traverse(o=>{if(o.isMesh&&o.material){
   o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
   for(const mat of (Array.isArray(o.material)?o.material:[o.material]))if(mat.color)mat.color.setHex(color);
 }});
}
function loadModel(key){
 const [path,height]=MODELS[key],url=new URL(path,ROOT).href;
 const loader=/\.glb$/i.test(path)?new GLTFLoader():/\.fbx$/i.test(path)?new FBXLoader():new OBJLoader();
 return new Promise((resolve,reject)=>loader.load(url,asset=>{
   const obj=asset.scene||asset;
   const box=new THREE.Box3().setFromObject(obj),size=box.getSize(new THREE.Vector3());
   if(!Number.isFinite(size.y)||size.y<=0) return reject(new Error('모델 크기 오류: '+key));
   const scalar=height/size.y;
   obj.scale.multiplyScalar(scalar);
   obj.position.set(-(box.min.x+size.x/2)*scalar,-box.min.y*scalar,-(box.min.z+size.z/2)*scalar);
   obj.updateMatrixWorld(true);
   if(materials[key])recolor(obj,materials[key]);
   resolve({root:obj,clips:asset.animations||[],size:size.clone().multiplyScalar(scalar)});
 },undefined,reject));
}
export async function createWorld(canvas){
 if(!window.WebGL2RenderingContext)throw new Error('입체 그래픽을 지원하는 브라우저가 필요해.');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.2:1.5));
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),skyDay=new THREE.Color('#92c6dd'),skyNight=new THREE.Color('#101b31');
 scene.background=skyDay.clone();
 scene.fog=new THREE.FogExp2(skyDay.clone(),.017);
 const hemi=new THREE.HemisphereLight(0xeaf9ff,0x667648,2.0);scene.add(hemi);
 const sunlight=new THREE.DirectionalLight(0xffe7bf,2.1);sunlight.position.set(-15,22,-7);scene.add(sunlight);
 const camera=new THREE.PerspectiveCamera(56,innerWidth/Math.max(1,innerHeight),.1,130);
 const groundRoot=new THREE.Group(),decorRoot=new THREE.Group(),actorRoot=new THREE.Group();
 scene.add(groundRoot,decorRoot,actorRoot);
 const required=['hero','ground','tree','stone','berry','boar','wolf','tiger','bat','rabbit','deer'];
 const results=await Promise.allSettled(required.map(loadModel)),library={},failed=[];
 results.forEach((r,i)=>{if(r.status==='fulfilled')library[required[i]]=r.value;else failed.push(required[i])});
 if(!library.hero||!library.ground)throw new Error('필수 CC0 모델을 불러올 수 없어: '+failed.join(', '));
 function copy(key,parent=decorRoot){
   const model=library[key];if(!model)return null;
   const group=new THREE.Group(),child=cloneSkinned(model.root);
   group.add(child);parent.add(group);return group;
 }
 // CC0 바닥 OBJ 원본을 평평한 4×4 실제 3D 메시 타일로 배치한다.
 const floorSource=library.ground;
 for(let z=0;z<4;z++)for(let x=0;x<4;x++){
   const tile=copy('ground',groundRoot);
   const s=10.15/Math.max(.01,floorSource.size.x),t=10.15/Math.max(.01,floorSource.size.z);
   tile.scale.set(s,1,t);
   tile.position.set(5+x*10.0,0,5+z*10.0);
 }
 const resources=[];
 function resource(key,x,z,id){
   const model=copy(key);if(!model)return;
   model.position.set(x/SCALE,0,z/SCALE);
   resources.push({id,model});
 }
 for(let i=0;i<66;i++){
   const kind=i%6<3?'tree':i%6===3?'stone':'berry';
   const x=120+random(i+11)*2160,z=120+random(i+901)*2160;
   if(Math.hypot(x-1200,z-1200)<155)continue;
   resource(kind,x,z,i);
 }
 const objects=new Map();
 function syncActors(rows){
   const present=new Set();
   for(const row of rows){
     if(!row||!Number.isFinite(row.x)||!Number.isFinite(row.y)||row.hp<=0)continue;
     const type=row.type||'hero';
     if(!library[type])continue;
     present.add(String(row.id));
     let actor=objects.get(String(row.id));
     if(!actor){
       actor=copy(type,actorRoot);objects.set(String(row.id),actor);
       actor.userData.lastX=row.x;actor.userData.lastY=row.y;
     }
     const y=type==='bat'?.65+Math.sin(performance.now()*.003+row.x)*.14:0;
     actor.position.set(row.x/SCALE,y,row.y/SCALE);
     if(Number.isFinite(row.angle))actor.rotation.y=row.angle;
   }
   for(const [id,obj] of objects)if(!present.has(id)){actorRoot.remove(obj);objects.delete(id)}
 }
 let width=innerWidth,height=innerHeight,last=performance.now(),frames=0;
 const cameraGoal=new THREE.Vector3(),lookGoal=new THREE.Vector3();
 function render(state){
   if(!state)return;
   if(width!==innerWidth||height!==innerHeight){
     width=innerWidth;height=innerHeight;renderer.setSize(width,height,false);
     camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();
   }
   const now=performance.now(),night=state.time>=180,blend=night?.12:1;
   scene.background.copy(skyNight).lerp(skyDay,blend);
   scene.fog.color.copy(scene.background);
   hemi.intensity=night?.5:2;sunlight.intensity=night?.16:2.1;
   syncActors([...state.players,...state.mobs,...state.neutrals]);
   const x=clamp(state.follow.x,30,2370)/SCALE,z=clamp(state.follow.y,30,2370)/SCALE;
   cameraGoal.set(x+7.2,12.4,z+12.7);
   camera.position.lerp(cameraGoal,frames<2?1:.14);
   lookGoal.set(x,0,z);
   camera.lookAt(lookGoal);
   // 카메라 거리 밖에서는 추가 메시 생성 없이 원본을 숨겨 모바일 GPU 부하를 줄인다.
   const viewRadius=32;
   for(const o of resources)o.model.visible=Math.abs(o.model.position.x-x)<viewRadius&&Math.abs(o.model.position.z-z)<viewRadius;
   renderer.render(scene,camera);
   document.body.dataset.spatialDimension='3d';
   document.body.dataset.webglFrames=String(++frames);
   last=now;
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.body.dataset.spatialDimension='3d-error';});
 return {render,failed};
}
