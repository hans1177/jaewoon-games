// 파일명: web-games/gem-survivor/gem3d.mjs · 보석 생존전 3D 렌더러
// Gem Survivor WebGL 3D renderer. The original game's update() owns all HP,
// collisions, gem prices, abilities, spawn schedules, and boss-victory authority.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import { OBJLoader } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/OBJLoader.js';
import {clone as cloneRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';

const SCALE=56, MAX_EACH=110, MAX_PROJECTILES=280, MAX_GEMS=380, MAX_PARTICLES=360;
const mat=(hex,emissive=hex)=>new THREE.MeshStandardMaterial({
  color:hex,emissive,emissiveIntensity:.27,metalness:.12,roughness:.58
});
const SPECIES=['slime','bat','beetle','brute','hound','shaman','knight','boss','spider','bomber','archer','frost','wisp','summoner','sprinter','sentinel','plague','ember','mirror','voidling','bossCavern','bossGarden','bossForge','bossFrost','bossAbyss'];
const BOSS_BY_STAGE={cavern:'bossCavern',garden:'bossGarden',forge:'bossForge',frost:'bossFrost',abyss:'bossAbyss'};
const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
export async function createGem3d({canvas}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor('#07101b',1);
 renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#07101b');
 scene.fog=new THREE.Fog('#07101b',45,110);
 scene.add(new THREE.HemisphereLight('#dcf9f3','#1a3e48',2.0));
 const sun=new THREE.DirectionalLight('#cffff6',2.25);sun.position.set(-5,12,4);scene.add(sun);
 const camera=new THREE.OrthographicCamera(-5,5,7,-7,.06,180);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
  new THREE.MeshStandardMaterial({color:'#14303c',roughness:1,metalness:.02,side:THREE.DoubleSide}));
 floor.rotation.x=-Math.PI/2;scene.add(floor);
 const grid=new THREE.GridHelper(28,28,'#2a786c','#1a514f');scene.add(grid);
 // 서로 다른 환경 조형물은 GPU 인스턴싱으로 모바일 화면에서도 그린다.
 function poolEnvironment(geometry,count,color){
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.12,emissive:color,emissiveIntensity:.09}),count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);return mesh;
 }
 const landmarks=poolEnvironment(new THREE.ConeGeometry(.55,2.9,7),176,'#84cfe2');
 const shrubs=poolEnvironment(new THREE.DodecahedronGeometry(.65,0),208,'#4fb19c');
 const runestones=poolEnvironment(new THREE.CylinderGeometry(.38,.43,1.5,6),104,'#93a8c1');
 const crystals=new THREE.Group();scene.add(crystals);
 const crystalGeo=new THREE.OctahedronGeometry(.7,0);
 const crystalMat=mat('#4fe6c4','#166c72');
 for(let i=0;i<12;i++){
  const gem=new THREE.Mesh(crystalGeo,crystalMat);
  gem.position.set(i%2?-.25:0,.5,i*1.7);
  gem.scale.set(.7,1.4,.7);
  crystals.add(gem);
 }
 const dummy=new THREE.Object3D();
 function pool(geometry,material,maximum){
  const inst=new THREE.InstancedMesh(geometry,material,maximum);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  inst.frustumCulled=false;inst.count=0;scene.add(inst);return inst;
 }
 // Grow CPU/GPU instance capacity only when a real game actor count requires it.
 // Invisible enemies may still damage the player, so never silently cap enemy rendering.
 function growPool(mesh,required){
  if(required<=mesh.instanceMatrix.count)return mesh;
  const capacity=Math.max(required,mesh.instanceMatrix.count*2);
  const bigger=new THREE.InstancedMesh(mesh.geometry,mesh.material,capacity);
  bigger.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bigger.frustumCulled=false;bigger.count=0;
  scene.remove(mesh);scene.add(bigger);mesh.dispose?.();
  return bigger;
 }
 // 몬스터: 저장소 CC0 원본을 사용하고 기존 게임 판정은 그대로 유지한다.
 const authoredIds=[7,15,17,18,21,26,31,35,41,47,49,53,56,31,17,49,21,56,7,35,53,41,18,26,47],objLoader=new OBJLoader(),textureLoader=new THREE.TextureLoader();
 const enemyMeshes=new Map(),prefabCache=new Map();
 await Promise.all(SPECIES.map(async(kind,index)=>{
  const id=authoredIds[index],base=new URL('../../assets/shared/forest/',import.meta.url);
  if(!prefabCache.has(id))prefabCache.set(id,Promise.all([
   objLoader.loadAsync(new URL('monster-'+id+'.obj',base).href),
   textureLoader.loadAsync(new URL('monster-'+id+'.png',base).href)
  ]));
  const [object,texture]=await prefabCache.get(id);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;
  object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  const center=box.getCenter(new THREE.Vector3()),scale=2/Math.max(size.x,size.z,size.y*.7,.01);
  const parts=[];
  object.traverse(node=>{
   if(!node.isMesh)return;
   const geometry=node.geometry.clone().applyMatrix4(node.matrixWorld);
   geometry.translate(-center.x,-box.min.y,-center.z);geometry.scale(scale,scale,scale);
   if(!geometry.attributes.normal)geometry.computeVertexNormals();
   parts.push(pool(geometry,new THREE.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.85}),MAX_EACH));
  });
  if(!parts.length)throw Error('GEM_MONSTER_ASSET_EMPTY:'+kind);
  enemyMeshes.set(kind,parts);
 }));
 const trails=pool(new THREE.CylinderGeometry(1,1,1,5),new THREE.MeshBasicMaterial({
  color:'#b4f7ff',transparent:true,opacity:.68,depthWrite:false,blending:THREE.AdditiveBlending}),MAX_PROJECTILES);
 let orbitTrails=pool(new THREE.TorusGeometry(1,.035,4,24,Math.PI*.5),new THREE.MeshBasicMaterial({color:'#96daff',transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}),5);
 const bubbles=pool(new THREE.SphereGeometry(1,5,4),mat('#9bf26b'),168);
 let halos=pool(new THREE.RingGeometry(.72,1,24),new THREE.MeshBasicMaterial({
  color:'#ffffff',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),64);
 // 환경: 기존 CC0 돌길 원본을 작은 경로 표식으로 재사용한다.
 const stone=await objLoader.loadAsync(new URL('../../assets/shared/homely-house/cobblestones.obj',import.meta.url).href);
 const paths=[];stone.updateMatrixWorld(true);
 stone.traverse(node=>{if(node.isMesh)paths.push(pool(node.geometry.clone().applyMatrix4(node.matrixWorld),
  new THREE.MeshStandardMaterial({color:'#a3a58e',roughness:1}),160))});
 let terrainStage='';
 let projectiles=pool(new THREE.OctahedronGeometry(1,0),mat('#e5ffff'),MAX_PROJECTILES);
 let gems=pool(crystalGeo,new THREE.MeshBasicMaterial({color:'#72ffde'}),MAX_GEMS);
 const particles=pool(new THREE.TetrahedronGeometry(1,0),mat('#ffffff'),MAX_PARTICLES);
 let blades=pool(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#e3fcff'}),5);
 const pools=pool(new THREE.CylinderGeometry(1,1,.015,24),new THREE.MeshStandardMaterial({
  color:'#61d86a',emissive:'#256d31',emissiveIntensity:.25,transparent:true,opacity:.4,depthWrite:false}),28);
 let lightning=pool(new THREE.CylinderGeometry(.025,.025,1,5),mat('#a1f9ff'),144);
 // 고유 기술은 독립 입체 파편과 소용돌이 광륜으로 표현한다.
 let skillShards=pool(new THREE.TetrahedronGeometry(.23,0),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}),256);
 let bossCrowns=pool(new THREE.ConeGeometry(.26,1.35,5),new THREE.MeshStandardMaterial({color:'#ffffff',metalness:.3,roughness:.25,emissive:'#b58cff',emissiveIntensity:.45}),56);
 // 효과: 인스턴스 색과 방사형 감쇠를 사용해 외부 후처리 없이 발광을 표현한다.
 const glowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  vertexShader:`varying vec2 vUv;varying vec3 vColor;
   void main(){vUv=uv;vColor=vec3(1.);
   #ifdef USE_INSTANCING_COLOR
   vColor=instanceColor;
   #endif
   vec4 point=vec4(position,1.);
   #ifdef USE_INSTANCING
   point=instanceMatrix*point;
   #endif
   gl_Position=projectionMatrix*modelViewMatrix*point;}`,
  fragmentShader:`varying vec2 vUv;varying vec3 vColor;
   void main(){float glow=pow(max(0.,1.-length(vUv-.5)*2.),2.);
   gl_FragColor=vec4(vColor*1.4,glow*.8);}`});
 const glows=pool(new THREE.PlaneGeometry(1,1),glowMaterial,256);
 const healthBack=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.16),new THREE.MeshBasicMaterial({color:'#121725',depthTest:false}));
 const healthFill=new THREE.Mesh(new THREE.PlaneGeometry(1.55,.1),new THREE.MeshBasicMaterial({color:'#5cff9c',depthTest:false}));
 healthBack.renderOrder=10;healthFill.renderOrder=11;scene.add(healthBack,healthFill);
 // 캐릭터: 기존 등록 GLB와 리깅을 재사용하며 협동 인물은 독립 믹서를 갖는다.
 const heroSources=new Map(),heroActors=new Map(),heroLoader=new GLTFLoader();
 await Promise.all(['guardian','ranger','wizard','rogue','cleric'].map(async id=>{
  const path=id==='guardian'?'../../assets/roblox/actors/native/knight.glb':'../../assets/shared/party/'+id+'.glb';
  const gltf=await heroLoader.loadAsync(new URL(path,import.meta.url).href);heroSources.set(id,gltf);
 }));
 function heroActor(key,kind){
  const previous=heroActors.get(key);if(previous?.kind===kind)return previous;
  if(previous){scene.remove(previous.root);previous.mixer?.stopAllAction();previous.mixer?.uncacheRoot(previous.model);}
  const source=heroSources.get(kind)||heroSources.get('guardian'),model=cloneRig(source.scene),root=new THREE.Group();
  const box=new THREE.Box3().setFromObject(model),scale=1.6/Math.max(.01,box.max.y-box.min.y);model.scale.setScalar(scale);
  const restY=-box.min.y*scale;model.position.set(-(box.min.x+box.max.x)*scale*.5,restY,-(box.min.z+box.max.z)*scale*.5);root.add(model);scene.add(root);
  const entry={kind,root,model,restY,clips:source.animations||[],mixer:new THREE.AnimationMixer(model),action:null,actionName:'',x:NaN,y:NaN};heroActors.set(key,entry);return entry;
 }
 function animateHero(entry,state,now,dt,key){
  const dx=state.x-entry.x,dz=state.y-entry.y,walking=Number.isFinite(dx)&&Math.hypot(dx,dz)>.1;
  const goal=vec(state.x/SCALE,state.hp<=0?.05:state.inv>0?.07:0,state.y/SCALE);
  if(!Number.isFinite(entry.x)||key==='self')entry.root.position.copy(goal);else entry.root.position.lerp(goal,1-Math.exp(-dt*15));
  if(walking)entry.root.rotation.y=Math.atan2(dx,dz);
  entry.x=state.x;entry.y=state.y;
  entry.root.rotation.z=state.hp<=0?Math.PI*.38:0;
  const term=walking?'walk':state.skillVisual>0||state.attackVisual>0?'attack':'idle';
  const clip=entry.clips.find(a=>(term==='walk'?/walk|run/i:term==='attack'?/attack|slash|spell|shoot/i:/idle|stand|rest/i).test(a.name))||entry.clips[0];
  if(clip&&clip.name!==entry.actionName){entry.action?.fadeOut(.12);entry.action=entry.mixer.clipAction(clip);entry.action.reset().fadeIn(.12).play();entry.actionName=clip.name;}
  entry.mixer.update(dt);entry.model.position.y=entry.restY+(walking?Math.sin(now*.016)*.015:Math.sin(now*.002)*.006);
 }
 let width=1,height=1,last=0,disposed=false;
 const tempColor=new THREE.Color(),axis=new THREE.Vector3(0,1,0);
 function resize(){
  width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
  renderer.setSize(width,height,false);
  const w=width/SCALE,h=height/SCALE;
  camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();
 }
 const onResize=()=>resize(),onLoss=e=>{e.preventDefault();document.body.dataset.spatialDimension='3d-error'};
 addEventListener('resize',onResize);canvas.addEventListener('webglcontextlost',onLoss);
 resize();
 function write(inst,items,max,make){
  const n=Math.min(items.length,max);
  for(let i=0;i<n;i++){
   const row=items[i];dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);
   make(row,i,dummy);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
   if(row.color||row.hit!==undefined){
    tempColor.set(row.hit>0?'#ffffff':row.color||'#ffffff');inst.setColorAt(i,tempColor);
   }
  }
  inst.count=n;inst.instanceMatrix.needsUpdate=true;
  if(n&&inst.instanceColor)inst.instanceColor.needsUpdate=true;
  return items.length-n;
 }
 function view(state,world){
  const halfW=width/2,halfH=height*.6;
  const cx=world.width>width?THREE.MathUtils.clamp(state.x,halfW,world.width-halfW):world.width/2;
  const cy=world.height>halfH*2?THREE.MathUtils.clamp(state.y,halfH,world.height-halfH):world.height/2;
  return {left:cx-halfW,right:cx+halfW,top:cy-halfH,bottom:cy+halfH,cx,cy};
 }
 function render({player:state,allies=[],enemies:enemyActors=[],projectiles:shots=[],gems:drops=[],
    particles:sparks=[],poisonPools:poison=[],orbitBlades:orbit=[],effects:active=[],
    world={width:width,height:height},stage={id:'cavern',floor:'#14303c',sky:'#07101b',accent:'#4fe6c4'}},now=0){
  if(!state||disposed)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(terrainStage!==stage.id){
   terrainStage=stage.id;scene.background.set(stage.sky);scene.fog.color.set(stage.sky);
   floor.material.color.set(stage.floor);crystalMat.color.set(stage.accent);
   floor.position.set(world.width/SCALE/2,-.035,world.height/SCALE/2);
   floor.scale.set(world.width/SCALE,world.height/SCALE,1);
   grid.position.set(world.width/SCALE/2,.012,world.height/SCALE/2);
   grid.scale.set(world.width/SCALE/28,1,world.height/SCALE/28);
   crystals.children.forEach((gem,i)=>{
    const angle=i*Math.PI*2/12;
    const radius=stage.id==='forge'?16:stage.id==='garden'?21:13;
    gem.position.set(world.width/SCALE/2+Math.cos(angle)*radius,.5,world.height/SCALE/2+Math.sin(angle)*radius);
    gem.scale.set(stage.id==='garden'?.5:.9,stage.id==='forge'?2.8:1.5,.8);
   });
   // 기본 바닥만 반복하지 않고 무대마다 주변 사물의 높이·형태·색·밀도를 바꾼다.
   const palettes={cavern:['#5ebcde','#447c9c','#76b8c9'],garden:['#78c87a','#377c51','#baa687'],forge:['#e77f50','#874343','#c68b62'],frost:['#b2f4ff','#70bfcf','#d0eafa'],abyss:['#b777ed','#60438e','#cc9bd5']};
   const palette=palettes[stage.id]||palettes.cavern;
   for(const [layer,mesh] of [landmarks,shrubs,runestones].entries()){
    mesh.material.color.set(palette[layer]);mesh.material.emissive.set(palette[layer]);
    const count=layer===0?160:layer===1?180:92;
    for(let i=0;i<count;i++){
     const sx=((i*73+layer*159+17)%977)/977,sz=((i*197+layer*311+23)%991)/991;
     const x=2+sx*(world.width/SCALE-4),z=2+sz*(world.height/SCALE-4);
     const nearCenter=Math.hypot(x-world.width/SCALE/2,z-world.height/SCALE/2)<3.4;
     const jitter=.65+((i*29+layer*11)%19)/19;
     dummy.position.set(x,layer===0?(1.45*jitter):layer===1?.20*jitter:.72*jitter,z);
     dummy.rotation.set(0,i*2.399,0);
     const size=nearCenter?.1:stage.id==='forge'&&layer===0?1.6:stage.id==='garden'&&layer===1?1.2:stage.id==='frost'&&layer===0?1.35:1;
     dummy.scale.set((layer===1?1.1:.65)*size*jitter,(layer===0?1.35:layer===1?.6:1)*size*jitter,(layer===1?1.05:.6)*size*jitter);
     dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
   }
   for(const path of paths){
    path.material.color.set(stage.id==='forge'?'#a58a80':stage.id==='garden'?'#9eaa8c':'#668ba2');
    for(let i=0;i<160;i++){
     const t=i/159,angle=t*Math.PI*4;
     const x=stage.id==='garden'?world.width/SCALE/2+Math.cos(angle)*(4+t*16):3+t*(world.width/SCALE-6);
     const z=stage.id==='garden'?world.height/SCALE/2+Math.sin(angle)*(4+t*16):stage.id==='forge'?6+(i%4)*(world.height/SCALE-12)/3:world.height/SCALE/2+Math.sin(t*12)*6;
     dummy.position.set(x,.015,z);dummy.rotation.set(0,i*.71,0);dummy.scale.setScalar(stage.id==='forge'?.7:1.1);
     dummy.updateMatrix();path.setMatrixAt(i,dummy.matrix);
    }
    path.count=160;path.instanceMatrix.needsUpdate=true;
   }
  }
  const px=state.x/SCALE,pz=state.y/SCALE;
  animateHero(heroActor('self',state.hero||'guardian'),state,now,dt,'self');
  const used=new Set(['self']);
  for(const ally of allies){const key=ally.netId;if(!key)continue;used.add(key);animateHero(heroActor(key,ally.hero||'guardian'),ally,now,dt,key);}
  for(const [key,entry] of heroActors)if(!used.has(key)){scene.remove(entry.root);entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);heroActors.delete(key);}
  const buckets=new Map(SPECIES.map(type=>[type,[]]));
  const visible=view(state,world);
  for(const e of enemyActors){
   if(e.x<visible.left-100||e.x>visible.right+100||e.y<visible.top-100||e.y>visible.bottom+100)continue;
   const kind=e.boss?BOSS_BY_STAGE[stage.id]||'boss':buckets.has(e.type)?e.type:'slime';buckets.get(kind).push(e);
  }
  let clipped=0;
  for(const [kind,list] of buckets){
   const parts=enemyMeshes.get(kind);
   for(let part=0;part<parts.length;part++){
    const grown=growPool(parts[part],list.length);parts[part]=grown;
    clipped+=write(grown,list,grown.instanceMatrix.count,(e,i,d)=>{
     const radius=Math.max(.18,e.r/SCALE),phase=now*.006*e.speed/72+i*1.7;
     d.position.set(e.x/SCALE,.02+(kind==='bat'?.45+Math.sin(phase)*.12:Math.abs(Math.sin(phase))*.035),e.y/SCALE);
     d.scale.setScalar(radius);d.rotation.y=Math.atan2(state.x-e.x,state.y-e.y);
     d.rotation.z=kind==='bat'?Math.sin(phase)*.15:Math.sin(phase)*.045;
     if(e.boss){d.scale.multiplyScalar(1.34+Math.sin(now*.002)*.025);d.position.y+=.16;d.rotation.y+=now*.00035;}
     if(e.hit>0)d.scale.multiplyScalar(1.06);
    });
   }
  }
  projectiles=growPool(projectiles,shots.length);
  clipped+=write(projectiles,shots,projectiles.instanceMatrix.count,(p,i,d)=>{
   const r=Math.max(.045,p.r/SCALE);
   d.position.set(p.x/SCALE,r*2+.13,p.y/SCALE);
   d.scale.set(r,r,p.kind==='arrow'?r*4:r*2);d.rotation.y=Math.atan2(p.vx||0,p.vy||0);
  });
  write(trails,shots,MAX_PROJECTILES,(p,i,d)=>{
   const velocity=Math.hypot(p.vx,p.vy),length=Math.min(1.7,velocity/SCALE*.09);
   const direction=vec(p.vx,0,p.vy).normalize();
   d.position.set(p.x/SCALE-direction.x*length*.5,.2,p.y/SCALE-direction.z*length*.5);
   d.scale.set(.025,length,.025);d.quaternion.setFromUnitVectors(axis,direction);
  });
  gems=growPool(gems,drops.length);
  clipped+=write(gems,drops,gems.instanceMatrix.count,(g,i,d)=>{
   d.position.set(g.x/SCALE,.17+Math.sin(now*.006+i)*.035,g.y/SCALE);
   d.scale.set(.16,.25,.16);d.rotation.y=now*.002;
  });
  clipped+=write(particles,sparks,MAX_PARTICLES,(p,i,d)=>{
   const r=Math.max(.025,p.r/SCALE);
   d.position.set(p.x/SCALE,.08+(1-p.life/(p.max||.5))*.45,p.y/SCALE);
   d.scale.setScalar(r*Math.max(.1,p.life/(p.max||.5)));d.rotation.set(now*.009+i,i,now*.005);
  });
  clipped+=write(pools,poison,28,(p,i,d)=>{
   const r=Math.max(.2,p.r/SCALE);d.position.set(p.x/SCALE,.055,p.y/SCALE);
   d.scale.set(r*(1+Math.sin(now*.008)*.025),1,r*(1+Math.sin(now*.008)*.025));
  });
  const droplets=poison.flatMap(p=>Array.from({length:6},(_,i)=>({x:p.x+Math.cos(i*1.047+now*.001)*p.r*.65,y:p.y+Math.sin(i*1.047+now*.001)*p.r*.65,i})));
  write(bubbles,droplets,168,(p,i,d)=>{
   const phase=(now*.0015+p.i*.17)%1;d.position.set(p.x/SCALE,.05+phase*.4,p.y/SCALE);d.scale.setScalar(.035*(1-phase));
  });
  orbitTrails=growPool(orbitTrails,orbit.length);
  write(orbitTrails,orbit,orbitTrails.instanceMatrix.count,(p,i,d)=>{
   const radius=Math.hypot(p.x-(p.cx??state.x),p.y-(p.cy??state.y))/SCALE;
   d.position.set((p.cx??state.x)/SCALE,.45,(p.cy??state.y)/SCALE);d.rotation.set(-Math.PI/2,0,-Math.atan2(p.y-(p.cy??state.y),p.x-(p.cx??state.x)));d.scale.setScalar(radius);
  });
  blades=growPool(blades,orbit.length);
  clipped+=write(blades,orbit,blades.instanceMatrix.count,(p,i,d)=>{
   d.position.set(p.x/SCALE,.45,p.y/SCALE);d.scale.set(.55,.07,.14);
   d.rotation.y=now*.008+i*.4;
  });
  const skillFX=active.filter(x=>x.kind==='skillCast'||x.kind==='bossPulse');
  const shards=skillFX.flatMap(fx=>Array.from({length:fx.kind==='skillCast'?32:26},(_,i)=>({...fx,i})));
  skillShards=growPool(skillShards,shards.length);
  write(skillShards,shards,skillShards.instanceMatrix.count,(fx,i,d)=>{
   const progress=1-fx.life/fx.max,angle=fx.i*2.399963+now*.003*(fx.hero==='rogue'?3:1.4),radius=(fx.kind==='bossPulse'?1.8:fx.hero==='wizard'?2.5:1.6)*(0.4+progress*1.3);
   d.position.set(fx.x/SCALE+Math.cos(angle)*radius,.2+Math.sin(fx.i*4.1+now*.011)*.25+progress*2,fx.y/SCALE+Math.sin(angle)*radius);
   const fade=Math.max(.08,1-progress);d.scale.setScalar((fx.kind==='bossPulse'?.48:.24)*fade*(1+fx.i%3*.33));
   d.rotation.set(now*.004+fx.i,now*.005,fx.i);
  });
  const crowns=enemyActors.filter(e=>e.boss).flatMap(e=>Array.from({length:8},(_,i)=>({e,i,color:['#6ee8ff','#7fe08e','#ff8163','#a6efff','#e4b3ff'][['cavern','garden','forge','frost','abyss'].indexOf(stage.id)]})));
  bossCrowns=growPool(bossCrowns,crowns.length);
  write(bossCrowns,crowns,bossCrowns.instanceMatrix.count,(row,i,d)=>{
   const e=row.e,angle=row.i*Math.PI/4+now*.0007,r=Math.max(.5,e.r/SCALE)*1.45;
   d.position.set(e.x/SCALE+Math.cos(angle)*r,1.0+Math.sin(angle*2+now*.004)*.18,e.y/SCALE+Math.sin(angle)*r);
   d.scale.setScalar(e.hp/e.maxHp<.5?.8:.55);d.rotation.y=angle;
  });
  const strikes=[];
  for(const fx of active.filter(x=>x.kind==='lightning')){
   for(let fork=0;fork<3;fork++){
    let x=fx.x1,y=fx.y1;
    for(let segment=1;segment<=8;segment++){
     const t=segment/8,fan=fork-1,jitter=segment===8?0:Math.sin(now*.05+segment*15+fork*7+fx.x1)*17;
     const nx=fx.x1+(fx.x2-fx.x1)*t+(fan*16+jitter)*(1-t);
     const ny=fx.y1+(fx.y2-fx.y1)*t+(fan*12-jitter)*(1-t);
     strikes.push({x1:x,y1:y,x2:nx,y2:ny});x=nx;y=ny;
    }
   }
  }
  lightning=growPool(lightning,strikes.length);
  write(lightning,strikes,lightning.instanceMatrix.count,(fx,i,d)=>{
   const start=vec(fx.x1/SCALE,.45,fx.y1/SCALE),end=vec(fx.x2/SCALE,.45,fx.y2/SCALE);
   const delta=end.sub(start),length=Math.max(.01,delta.length());
   d.position.copy(start).addScaledVector(delta,.5);d.scale.set(1,length,1);
   d.quaternion.setFromUnitVectors(axis,delta.normalize());
  });
  const rings=enemyActors.filter(e=>e.boss&&e.charge<.7).map(e=>({x:e.x,y:e.y,r:e.r/SCALE*(1.3+(.7-e.charge)*1.4),color:'#ff4965'}));
  for(const ally of [state,...allies])if(ally.shield>0||ally.hp<=0)rings.push({x:ally.x,y:ally.y,r:ally.hp<=0?1.2:1.5,color:ally.hp<=0?'#ffb063':'#87eaff'});
  for(const fx of active)if(fx.kind==='death'||fx.kind==='impact')rings.push({x:fx.x,y:fx.y,r:fx.r/SCALE*(1+(1-fx.life/fx.max)*(fx.kind==='death'?3:1.5)),color:fx.color});
  for(const fx of skillFX)for(let layer=0;layer<3;layer++){
   const progress=1-fx.life/fx.max,radius=fx.r/SCALE*(.3+progress*(1.25+layer*.28));
   rings.push({x:fx.x,y:fx.y,r:radius,color:fx.color});
  }
  for(const p of poison)rings.push({x:p.x,y:p.y,r:p.r/SCALE*(.85+Math.sin(now*.008)*.12),color:'#a6ff63'});
  halos=growPool(halos,rings.length);
  write(halos,rings,halos.instanceMatrix.count,(e,i,d)=>{
   d.position.set(e.x/SCALE,.035,e.y/SCALE);d.rotation.x=-Math.PI/2;d.scale.setScalar(e.r);
  });
  const flashes=[{x:state.x,y:state.y,r:1.4,color:state.inv>0?'#ffbca3':'#55d5ff'}];
  for(const fx of active){
   if(fx.kind==='skillCast'||fx.kind==='bossPulse')flashes.push({x:fx.x,y:fx.y,r:2+3*(fx.life/fx.max),color:fx.color});
   if(fx.kind==='lightning')flashes.push({x:fx.x2,y:fx.y2,r:2.1,color:'#a0dcff'});
   else flashes.push({x:fx.x,y:fx.y,r:Math.max(.25,fx.r/SCALE*4*fx.life/fx.max),color:fx.color||'#bdfdff'});
  }
  for(const p of shots.slice(0,100))flashes.push({x:p.x,y:p.y,r:p.kind==='potion'?.7:.55,color:p.color});
  for(const g of drops.slice(0,50))flashes.push({x:g.x,y:g.y,r:.6,color:'#58ffd3'});
  for(const p of orbit)flashes.push({x:p.x,y:p.y,r:.85,color:'#b2dfff'});
  write(glows,flashes,256,(fx,i,d)=>{d.position.set(fx.x/SCALE,.06,fx.y/SCALE);d.rotation.x=-Math.PI/2;d.scale.setScalar(fx.r)});
  canvas.dataset.unrenderedEntities=String(clipped);
  canvas.dataset.fallbackEnemyAssets='0';
  canvas.dataset.playerX=String(state.x);canvas.dataset.playerY=String(state.y);canvas.dataset.playerHp=String(state.hp);
  canvas.dataset.glowInstances=String(glows.count);canvas.dataset.particleInstances=String(particles.count);
  canvas.dataset.authoredMonsterKinds=String(enemyMeshes.size);
  canvas.dataset.stage=stage.id;canvas.dataset.worldWidth=String(world.width);canvas.dataset.worldHeight=String(world.height);
  canvas.dataset.nativeHeroArt=(state.hero||'guardian')+'.glb';canvas.dataset.coopActors=String(heroActors.size);canvas.dataset.hero=state.hero||'guardian';
  document.body.dataset.nativeArtCoverage='authored-static-monsters';
  const bounds=view(state,world),cx=bounds.cx/SCALE,cz=bounds.cy/SCALE;
  camera.position.set(cx,25,cz+Math.sqrt(275));camera.lookAt(cx,0,cz);
  const health=THREE.MathUtils.clamp(state.hp/state.maxHp,0,1);
  healthBack.position.set(px,2.05,pz);healthBack.quaternion.copy(camera.quaternion);
  healthFill.position.set(px-.775+health*.775,2.06,pz+.01);healthFill.quaternion.copy(camera.quaternion);
  healthFill.scale.x=Math.max(.001,health);healthFill.material.color.set(health<.3?'#ff626c':health<.6?'#ffcc69':'#5cff9c');
  renderer.render(scene,camera);
  canvas.dataset.renderedFrame='true';
  document.body.dataset.spatialDimension='3d';
  document.body.dataset.renderer='three-webgl';
 }
 function dispose(){
  disposed=true;removeEventListener('resize',onResize);canvas.removeEventListener('webglcontextlost',onLoss);
  for(const entry of heroActors.values()){entry.mixer.stopAllAction();entry.mixer.uncacheRoot(entry.model);}
  scene.traverse(o=>{
   o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose?.();}
  });renderer.dispose();
 }
 return {render,resize,dispose,view};
}
