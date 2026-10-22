// Gem Survivor WebGL 3D renderer. The original game's update() owns all HP,
// collisions, gem prices, abilities, spawn schedules, and boss-victory authority.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import { GLTFLoader } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';

const SCALE=56, MAX_EACH=110, MAX_PROJECTILES=280, MAX_GEMS=380, MAX_PARTICLES=260;
const mat=(hex,emissive=hex)=>new THREE.MeshStandardMaterial({
  color:hex,emissive,emissiveIntensity:.27,metalness:.12,roughness:.58
});
const SPECIES=['slime','bat','beetle','brute','hound','shaman','knight','boss'];
const PALETTE={slime:'#62d995',bat:'#9d7cff',beetle:'#e6a65e',brute:'#73849a',
 hound:'#ff7b68',shaman:'#70d65d',knight:'#4fa7ff',boss:'#ef476f'};
function makeSpeciesGeometry(kind){
  if(kind==='slime')return new THREE.SphereGeometry(1,12,8);
  if(kind==='bat')return new THREE.ConeGeometry(1,1.65,5);
  if(kind==='beetle')return new THREE.DodecahedronGeometry(1,0);
  if(kind==='brute')return new THREE.IcosahedronGeometry(1,1);
  if(kind==='hound')return new THREE.CapsuleGeometry(.63,1.05,4,8);
  if(kind==='shaman')return new THREE.ConeGeometry(1,2.3,7);
  if(kind==='knight')return new THREE.OctahedronGeometry(1.1,1);
  return new THREE.IcosahedronGeometry(1,2);
}
const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
export async function createGem3d({canvas}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor('#07101b',1);
 renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#07101b');
 scene.fog=new THREE.Fog('#07101b',16,44);
 scene.add(new THREE.HemisphereLight('#dcf9f3','#1a3e48',2.0));
 const sun=new THREE.DirectionalLight('#cffff6',2.25);sun.position.set(-5,12,4);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(51,1,.06,100);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
  new THREE.MeshStandardMaterial({color:'#14303c',roughness:1,metalness:.02,side:THREE.DoubleSide}));
 floor.rotation.x=-Math.PI/2;scene.add(floor);
 const grid=new THREE.GridHelper(28,28,'#2a786c','#1a514f');scene.add(grid);
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
 const enemyMeshes=new Map(SPECIES.map(kind=>{
  const mesh=pool(makeSpeciesGeometry(kind),mat(PALETTE[kind]),MAX_EACH);
  return [kind,mesh];
 }));
 const projectiles=pool(new THREE.OctahedronGeometry(1,0),mat('#e5ffff'),MAX_PROJECTILES);
 const gems=pool(crystalGeo,mat('#42ffd4'),MAX_GEMS);
 const particles=pool(new THREE.TetrahedronGeometry(1,0),mat('#ffffff'),MAX_PARTICLES);
 const blades=pool(new THREE.BoxGeometry(1,1,1),mat('#bddfff'),5);
 const pools=pool(new THREE.CylinderGeometry(1,1,.015,24),new THREE.MeshStandardMaterial({
  color:'#61d86a',emissive:'#256d31',emissiveIntensity:.25,transparent:true,opacity:.4,depthWrite:false}),28);
 const lightning=pool(new THREE.CylinderGeometry(.035,.035,1,6),mat('#a1f9ff'),24);
 const player=new THREE.Group();scene.add(player);
 let model,modelRestY=0,clips=[],mixer=null,action=null,actionName='';
 try{
  const gltf=await new GLTFLoader().loadAsync(
   new URL('../../assets/roblox/actors/native/knight.glb',import.meta.url).href);
  model=gltf.scene;clips=gltf.animations||[];
  const bbox=new THREE.Box3().setFromObject(model);
  const height=Math.max(.01,bbox.max.y-bbox.min.y),scale=1.6/height;
  model.scale.setScalar(scale);
  modelRestY=-bbox.min.y*scale;
  model.position.set(-(bbox.min.x+bbox.max.x)*scale*.5,modelRestY,
   -(bbox.min.z+bbox.max.z)*scale*.5);
  player.add(model);
  if(clips.length)mixer=new THREE.AnimationMixer(model);
 }catch(error){
  renderer.dispose();throw Error('GEM_3D_AUTHORED_KNIGHT_UNAVAILABLE: '+String(error?.message||error));
 }
 function animate(name){
  if(!mixer)return;
  const clip=clips.find(a=>(name==='walk'?/walk|run/i:name==='attack'?/attack|slash/i:/idle|stand|rest/i).test(a.name))
   ||(name==='idle'?clips[0]:null);
  if(!clip||clip.name===actionName)return;
  action?.fadeOut(.12);action=mixer.clipAction(clip);action.reset().fadeIn(.12).play();actionName=clip.name;
 }
 let width=1,height=1,last=0,prevX=NaN,prevZ=NaN,disposed=false;
 const tempColor=new THREE.Color(),axis=new THREE.Vector3(0,1,0);
 function resize(){
  width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  const w=width/SCALE,h=height/SCALE;
  floor.position.set(w/2,-.035,h/2);floor.scale.set(w,h,1);
  grid.position.set(w/2,.012,h/2);grid.scale.set(Math.max(w,h)/28,1,Math.max(w,h)/28);
  crystals.position.set(w+.55,0,-2);
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
 function render({player:state,enemies:enemyActors=[],projectiles:shots=[],gems:drops=[],
    particles:sparks=[],poisonPools:poison=[],orbitBlades:orbit=[],effects:active=[]},now=0){
  if(!state||disposed)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  const px=state.x/SCALE,pz=state.y/SCALE,dx=px-prevX,dz=pz-prevZ;
  player.position.set(px,state.inv>0?.07:0,pz);
  const walking=Number.isFinite(dx)&&Math.hypot(dx,dz)>.002;
  if(walking)player.rotation.y=Math.atan2(dx,dz);
  prevX=px;prevZ=pz;
  animate(shots.some(b=>b.kind==='basic')?'attack':walking?'walk':'idle');
  mixer?.update(dt);
  model.position.y=modelRestY+(!mixer&&walking?Math.sin(now*.016)*.025:0);
  const buckets=new Map(SPECIES.map(type=>[type,[]]));
  for(const e of enemyActors){const kind=buckets.has(e.type)?e.type:'slime';buckets.get(kind).push(e)}
  let clipped=0;
  for(const [kind,list] of buckets){
   clipped+=write(enemyMeshes.get(kind),list,MAX_EACH,(e,i,d)=>{
    const radius=Math.max(.18,e.r/SCALE);
    d.position.set(e.x/SCALE,radius*1.08+(e.hit>0?.1:0),e.y/SCALE);
    d.scale.set(radius,kind==='boss'?radius*2.5:radius*1.6,radius);
    d.rotation.y=now*.0007+i*.23;
   });
  }
  clipped+=write(projectiles,shots,MAX_PROJECTILES,(p,i,d)=>{
   const r=Math.max(.045,p.r/SCALE);
   d.position.set(p.x/SCALE,r*2+.13,p.y/SCALE);
   d.scale.set(r,p.kind==='arrow'?r*3:r,r);d.rotation.y=Math.atan2(p.vx||0,p.vy||0);
  });
  clipped+=write(gems,drops,MAX_GEMS,(g,i,d)=>{
   d.position.set(g.x/SCALE,.17+Math.sin(now*.006+i)*.035,g.y/SCALE);
   d.scale.set(.16,.25,.16);d.rotation.y=now*.002;
  });
  clipped+=write(particles,sparks,MAX_PARTICLES,(p,i,d)=>{
   const r=Math.max(.025,p.r/SCALE);
   d.position.set(p.x/SCALE,.09,p.y/SCALE);d.scale.setScalar(r);
  });
  clipped+=write(pools,poison,28,(p,i,d)=>{
   const r=Math.max(.2,p.r/SCALE);d.position.set(p.x/SCALE,.055,p.y/SCALE);
   d.scale.set(r,1,r);
  });
  clipped+=write(blades,orbit,5,(p,i,d)=>{
   d.position.set(p.x/SCALE,.45,p.y/SCALE);d.scale.set(.55,.07,.14);
   d.rotation.y=now*.008+i*.4;
  });
  const strikes=active.filter(x=>x.kind==='lightning');
  clipped+=write(lightning,strikes,24,(fx,i,d)=>{
   const start=vec(fx.x1/SCALE,.7,fx.y1/SCALE);
   const end=vec(fx.x2/SCALE,.7,fx.y2/SCALE);
   const delta=end.clone().sub(start),length=Math.max(.01,delta.length());
   d.position.copy(start).addScaledVector(delta,.5);d.scale.set(1,length,1);
   d.quaternion.setFromUnitVectors(axis,delta.normalize());
  });
  canvas.dataset.unrenderedEntities=String(clipped);
  canvas.dataset.fallbackEnemyAssets=String(enemyActors.length);
  canvas.dataset.nativeHeroArt='knight.glb';
  document.body.dataset.nativeArtCoverage='incomplete';
  const w=width/SCALE,h=height/SCALE;
  const distance=Math.max(h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))),
     w/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
  camera.position.set(w/2,distance*1.18+2,h/2+distance*.25);
  camera.lookAt(w/2,0,h/2);
  renderer.render(scene,camera);
  canvas.dataset.renderedFrame='true';
  document.body.dataset.spatialDimension='3d';
  document.body.dataset.renderer='three-webgl';
 }
 function dispose(){
  disposed=true;removeEventListener('resize',onResize);canvas.removeEventListener('webglcontextlost',onLoss);
  scene.traverse(o=>{
   o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose?.();}
  });renderer.dispose();
 }
 return {render,resize,dispose};
}
