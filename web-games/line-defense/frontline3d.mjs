// Cat Frontline native 3D view. State, unit prices, attacks, drops, stages,
// 10-stage unlocks and localStorage remain authoritative in index.html.
// Creature rigs are 3D temporary silhouettes, not falsely licensed cat models.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';

const SCALE=65,ALLIES=['blob','shield','spear','ranger','rush','blade','hammer','knight','mage','giant','wall','iron','legend'];
const FOES=['mouse','rabbit','mole','boar','goose','seaWolf','boss'];
const ENEMY_COLORS={mouse:'#baa393',rabbit:'#f3a9ae',mole:'#808ea7',boar:'#c95b47',goose:'#ecda9e',seaWolf:'#6daece',boss:'#83735e'};
const named=(hex,metalness=.06)=>new THREE.MeshStandardMaterial({color:hex,roughness:.68,metalness});
const cube=new THREE.BoxGeometry(1,1,1),orb=new THREE.SphereGeometry(1,12,9);
const earShape=new THREE.ConeGeometry(1,1,5),tailShape=new THREE.CylinderGeometry(.09,.12,1,7);
const mouthMat=named('#282a35'),whiteMat=named('#fffefa');
function block(parent,geometry,m,x,y,z,sx,sy,sz){
 const mesh=new THREE.Mesh(geometry,m);
 mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
}
export function createFrontline3d({canvas}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setClearColor('#172734',1);
 renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
 const scene=new THREE.Scene();scene.background=new THREE.Color('#142b3c');
 scene.fog=new THREE.Fog('#142b3c',13,45);
 scene.add(new THREE.HemisphereLight('#dcf4ff','#37462e',2.1));
 const sun=new THREE.DirectionalLight('#fff3cb',2.4);sun.position.set(-6,11,4);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(53,1,.05,90);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),named('#638d5c'));
 ground.rotation.x=-Math.PI/2;scene.add(ground);
 const lanes=new THREE.Group();scene.add(lanes);
 const actors=new Map();
 const allyMaterials=new Map(),foeMaterials=new Map();
 const grassMat=named('#8a9e68'),dirtMat=named('#a58d63'),stone=named('#72818d'),wood=named('#64523f');
 const groundPath=block(lanes,cube,dirtMat,0,0,0,1,.035,1);
 const castleA=new THREE.Group(),castleB=new THREE.Group();scene.add(castleA,castleB);
 function castle(root,ours){
  const primary=ours?named('#d2e8f2'):named('#7d6474');
  const flag=ours?named('#6bc7ed'):named('#de756d');
  block(root,cube,primary,0,.45,0,1.05,.90,.93);
  block(root,new THREE.ConeGeometry(.8,.5,4),stone,0,1.12,0,1,1,1);
  for(const sign of [-1,1]){
   block(root,cube,primary,0,.85,sign*.51,.32,1.05,.3);
  }
  block(root,cube,wood,.53,.28,0,.08,.57,.31);
  block(root,cube,flag,0,1.6,0,.66,.27,.10);
 }
 castle(castleA,true);castle(castleB,false);
 // All meshes use shared geometry/material; removing a dead actor never deletes a
 // geometry that is used by another actor.
 const speciesGeos=new Map();
 const speciesHead=kind=>{
  if(kind==='boar'||kind==='seaWolf')return new THREE.DodecahedronGeometry(.44,0);
  if(kind==='goose')return new THREE.CapsuleGeometry(.28,.45,4,6);
  if(kind==='boss')return new THREE.IcosahedronGeometry(.52,1);
  return orb;
 };
 for(const k of FOES)speciesGeos.set(k,speciesHead(k));
 const gearMaterials={
  shield:named('#70afce'),spear:named('#b5d2e3'),ranger:named('#d2b36c'),
  rush:named('#df8d6c'),blade:named('#e4eaf0'),hammer:named('#979fa4'),
  knight:named('#80aadb'),mage:named('#99c7fb'),giant:named('#7196a0'),
  wall:named('#6d7b8a'),iron:named('#a7b7c5'),legend:named('#efce64')
 };
 function makeActor(f){
  const group=new THREE.Group(),visual=new THREE.Group();group.add(visual);
  const allied=f.team==='ally';
  const color=allied?'#f0f1ec':ENEMY_COLORS[f.kind]||'#95857d';
  let materialMap=allied?allyMaterials:foeMaterials;
  if(!materialMap.has(color))materialMap.set(color,named(color));
  const material=materialMap.get(color);
  const body=block(visual,orb,material,0,.43,0,.34,.41,.29);
  const head=block(visual,allied?orb:speciesGeos.get(f.kind)||orb,material,.17,.83,0,.37,.34,.36);
  const leftFoot=block(visual,orb,material,-.16,.13,-.18,.17,.13,.13);
  const rightFoot=block(visual,orb,material,-.16,.13,.18,.17,.13,.13);
  if(allied||['rabbit','seaWolf','mouse'].includes(f.kind)){
   const ears=f.kind==='rabbit'?1.7:1;
   for(const sz of [-1,1]){
    const ear=block(visual,earShape,material,.09,1.12*ears,sz*.21,.14,.31*ears,.15);
    ear.rotation.z=-.15;
   }
  }
  // Every face is front (+X) so turning around rotates the whole 3D body.
  for(const dz of [-.17,.17])block(visual,orb,mouthMat,.48,.90,dz,.045,.049,.045);
  block(visual,orb,named('#ec9eac'),.50,.78,0,.058,.046,.065);
  if(allied){
   const tail=block(visual,tailShape,material,-.39,.54,0,.65,.38,.45);tail.rotation.z=.65;
   const gear=gearMaterials[f.kind];
   if(gear){
    if(['shield','knight','wall','iron'].includes(f.kind))block(visual,cube,gear,.43,.52,.46,.12,.48,.33);
    else if(['spear','blade','legend'].includes(f.kind))block(visual,cube,gear,.44,.66,.37,.07,.69,.08);
    else if(f.kind==='hammer')block(visual,cube,gear,.52,.74,.34,.25,.24,.24);
    else if(['ranger','mage'].includes(f.kind))block(visual,orb,gear,.45,.54,.37,.12,.36,.13);
    else block(visual,orb,gear,.28,1.18,0,.24,.08,.27);
   }
  }else if(['boar','boss','mole'].includes(f.kind)){
   block(visual,cube,stone,.30,1.21,0,.63,.14,.66);
  }
  scene.add(group);
  const record={group,visual,leftFoot,rightFoot,head,material,lastX:NaN,lastY:NaN,lastTick:0};
  actors.set(f.uid,record);return record;
 }
 const effects=[];
 const hitMaterial=new THREE.MeshBasicMaterial({color:'#fff8d7',transparent:true,depthWrite:false,opacity:.9});
 for(let i=0;i<30;i++){
  const sprite=new THREE.Mesh(new THREE.TorusGeometry(.4,.07,5,12),hitMaterial.clone());
  sprite.rotation.x=-Math.PI/2;sprite.visible=false;scene.add(sprite);effects.push(sprite);
 }
 let width=1,height=1,worldWidth=1,worldDepth=1,lastFrame=0,disposed=false;
 function resize(){
  width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
  worldWidth=width/SCALE;worldDepth=height/SCALE;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  ground.position.set(worldWidth/2,-.04,worldDepth/2);
  ground.scale.set(worldWidth+1.8,worldDepth+2.0,1);
  groundPath.position.set(worldWidth/2,.007,worldDepth*.50);
  groundPath.scale.set(worldWidth,.016,Math.min(2.6,worldDepth*.75));
  castleA.position.set(42/SCALE,0,worldDepth*.50);
  castleB.position.set((width-42)/SCALE,0,worldDepth*.50);
  castleB.rotation.y=Math.PI;
  const half=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const distance=Math.max(worldDepth/(2*half),worldWidth/(2*half*camera.aspect));
  camera.position.set(worldWidth/2,distance*1.12+1.2,worldDepth*.5+distance*.24);
  camera.lookAt(worldWidth/2,.25,worldDepth*.50);
 }
 const onResize=()=>resize(),onLoss=e=>{e.preventDefault();document.body.dataset.spatialDimension='3d-error'};
 addEventListener('resize',onResize);canvas.addEventListener('webglcontextlost',onLoss);
 resize();
 function render({state},time=0){
  if(disposed)return;
  const dt=Math.min(.05,Math.max(0,(time-lastFrame)/1000));lastFrame=time;
  const current=new Set();let hitCount=0;
  if(state){
   for(const f of [...state.a,...state.e]){
    if(f.dead)continue;
    current.add(f.uid);
    const record=actors.get(f.uid)||makeActor(f);
    const x=f.x/SCALE;
    // Only a 3D lane offset; collisions remain exactly on the original 1D lane.
    const lane=(((f.uid*13)%7)-3)*.19;
    const z=worldDepth*.50+lane;
    const moved=Number.isFinite(record.lastX)?Math.hypot(x-record.lastX,z-record.lastY):0;
    record.lastX=x;record.lastY=z;
    record.group.position.set(x,0,z);
    record.group.rotation.y=f.team==='ally'?0:Math.PI;
    const r=Math.max(.33,Number(f.size||18)/24);
    record.group.scale.setScalar(r);
    const actuallyMoving=moved>.00012;
    const stride=actuallyMoving?Math.sin(time*.021+f.uid)*.065:0;
    record.leftFoot.position.y=.13+Math.max(0,stride);
    record.rightFoot.position.y=.13+Math.max(0,-stride);
    record.visual.position.y=f.flash>0?.12:0;
    if(f.flash>0&&hitCount<effects.length){
      const hit=effects[hitCount++];hit.visible=true;
      hit.position.set(x,.96*r,z);hit.material.opacity=Math.min(.9,Math.max(.1,f.flash*5));
      hit.scale.setScalar(.7*r);
    }
   }
  }
  for(const [id,record]of actors)if(!current.has(id)){
   scene.remove(record.group);actors.delete(id);
  }
  for(let i=hitCount;i<effects.length;i++)effects[i].visible=false;
  renderer.render(scene,camera);
  canvas.dataset.renderedFrame='true';
  canvas.dataset.renderedActors=String(current.size);
  canvas.dataset.unrenderedActors='0';
  document.body.dataset.spatialDimension='3d';
  document.body.dataset.renderer='three-webgl';
  document.body.dataset.nativeArtCoverage='incomplete';
 }
 function dispose(){
  disposed=true;removeEventListener('resize',onResize);canvas.removeEventListener('webglcontextlost',onLoss);
  for(const r of actors.values())scene.remove(r.group);actors.clear();
  for(const fx of effects)fx.material.dispose();
  renderer.dispose();
 }
 return {render,resize,dispose};
}
