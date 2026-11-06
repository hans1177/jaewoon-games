// Native WebGL 3D view for Forest Defense.
// ALL authoritative pathfinding, tower building, range, cooldowns, damage,
// enemy rewards and wave results remain in index.html; this is view + picking only.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';

const SCALE=64,ENEMY_INITIAL_CAP=32,SHOT_INITIAL_CAP=64;
const TOWER_KINDS=['archer','cannon','frost'],ENEMY_KINDS=['grunt','runner','tank','boss'];
const material=hex=>new THREE.MeshStandardMaterial({color:hex,roughness:.8,metalness:.02});
export function createDefense3d({canvas,PATH_N,PADS_N}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
 renderer.setClearColor('#0c1815');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#0c1815');
 scene.fog=new THREE.Fog('#0c1815',13,30);
 scene.add(new THREE.HemisphereLight('#d6fae3','#203527',2.3));
 const sun=new THREE.DirectionalLight('#f6e7bb',2.4);
 sun.position.set(-5,12,4);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(53,1,.05,80);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material('#315840'));
 floor.rotation.x=-Math.PI/2;scene.add(floor);
 const groundGrid=new THREE.GridHelper(25,25,'#406d4b','#385d42');
 scene.add(groundGrid);
 const pathGroup=new THREE.Group();scene.add(pathGroup);
 const environment=new THREE.Group();scene.add(environment);
 const pads=new THREE.Group();scene.add(pads);
 const towers=new THREE.Group();scene.add(towers);
 const rangeRing=new THREE.Mesh(new THREE.RingGeometry(.986,1,48),
  new THREE.MeshBasicMaterial({color:'#ffe190',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
 rangeRing.rotation.x=-Math.PI/2;rangeRing.visible=false;scene.add(rangeRing);
 const treeTrunk=new THREE.CylinderGeometry(.06,.10,.48,5);
 const treeCrown=new THREE.ConeGeometry(.37,.95,7);
 const treeMat=material('#347b4a'),trunkMat=material('#5d4832');
 const forestTrees=[],tmp=new THREE.Object3D();
 for(let i=0;i<38;i++){
  const x=(i*71+37)%971/971,z=(i*43+18)%983/983;
  const nearest=Math.min(...PATH_N.map(p=>Math.hypot(x-p[0],z-p[1])));
  const padNearest=Math.min(...PADS_N.map(p=>Math.hypot(x-p[0],z-p[1])));
  if(nearest<.12||padNearest<.08)continue;
  forestTrees.push({x,z,height:.8+(i%5)*.13});
 }
 const forestCrown=new THREE.InstancedMesh(treeCrown,treeMat,forestTrees.length);
 const forestTrunk=new THREE.InstancedMesh(treeTrunk,trunkMat,forestTrees.length);
 forestCrown.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 forestTrunk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 scene.add(forestCrown,forestTrunk);
 const towerMat={archer:material('#90b66e'),cannon:material('#737e83'),frost:material('#94c8e5')};
 const towerHead={archer:new THREE.ConeGeometry(.28,.62,6),
  cannon:new THREE.CylinderGeometry(.25,.31,.28,8),
  frost:new THREE.OctahedronGeometry(.42,0)};
 const towerBase=new THREE.CylinderGeometry(.22,.3,.55,8);
 const towerBaseMat=material('#697469');
 const towerParts=new Map();
 const enemyMesh=new Map();
 const enemyGeometries={
  grunt:new THREE.DodecahedronGeometry(1,0),
  runner:new THREE.ConeGeometry(1,2.1,5),
  tank:new THREE.IcosahedronGeometry(1,1),
  boss:new THREE.CylinderGeometry(.68,1.06,2.5,7)
 };
 const enemyMaterials={grunt:material('#6ca261'),runner:material('#8070a0'),
  tank:material('#667a70'),boss:material('#987052')};
 const shotGeometry=new THREE.SphereGeometry(1,8,6);
 const shotMaterials={archer:material('#ffe5a1'),cannon:material('#38413a'),frost:material('#b8f0ff')};
 const shotMesh=new Map();
 function instance(geometry,mat,capacity){
  const mesh=new THREE.InstancedMesh(geometry,mat,capacity);
  mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);return mesh;
 }
 function grow(mesh,needed){
  if(needed<=mesh.instanceMatrix.count)return mesh;
  const updated=instance(mesh.geometry,mesh.material,Math.max(needed,mesh.instanceMatrix.count*2));
  scene.remove(mesh);mesh.dispose?.();return updated;
 }
 for(const k of ENEMY_KINDS)enemyMesh.set(k,instance(enemyGeometries[k],enemyMaterials[k],ENEMY_INITIAL_CAP));
 for(const k of TOWER_KINDS)shotMesh.set(k,instance(shotGeometry,shotMaterials[k],SHOT_INITIAL_CAP));
 let width=1,height=1,worldWidth=1,worldDepth=1,disposed=false;
 const pickRay=new THREE.Raycaster(),pointer=new THREE.Vector2(),floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 const hit=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 function box(parent,x,y,z,w,h,d,mat){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);
  mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
 }
 function path(){
  pathGroup.clear();
  const points=PATH_N.map(p=>new THREE.Vector3(p[0]*worldWidth,.04,p[1]*worldDepth));
  const stone=material('#99886d'),edge=material('#535e49');
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],v=b.clone().sub(a),len=v.length();
   const midpoint=a.clone().addScaledVector(v,.5);
   for(const [w,y,mat] of [[.71,.024,edge],[.51,.057,stone]]){
    const seg=new THREE.Mesh(new THREE.BoxGeometry(w,.065,len),mat);
    seg.position.set(midpoint.x,y,midpoint.z);
    seg.rotation.y=Math.atan2(v.x,v.z);pathGroup.add(seg);
   }
  }
  const end=points[points.length-1];
  box(pathGroup,end.x,.44,end.z,.95,.88,.85,material('#7c9886'));
  box(pathGroup,end.x,.98,end.z,.72,.21,.72,material('#c6d2bc'));
  box(pathGroup,end.x,.33,end.z+.43,.34,.58,.08,material('#3e2d2a'));
 }
 function rebuildPads(){
  pads.clear();
  for(let i=0;i<PADS_N.length;i++){
   const p=PADS_N[i],base=new THREE.Mesh(
    new THREE.CylinderGeometry(.29,.34,.11,12),material('#5f826a'));
   base.position.set(p[0]*worldWidth,.065,p[1]*worldDepth);
   base.userData.padId=i;pads.add(base);
  }
 }
 function resize(){
  width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
  worldWidth=width/SCALE;worldDepth=height/SCALE;
  renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
  floor.scale.set(worldWidth+3,worldDepth+3,1);
  floor.position.set(worldWidth/2,-.05,worldDepth/2);
  groundGrid.position.set(worldWidth/2,.004,worldDepth/2);
  groundGrid.scale.set(Math.max(worldWidth,worldDepth)/25,1,Math.max(worldWidth,worldDepth)/25);
  for(let i=0;i<forestTrees.length;i++){
   const t=forestTrees[i],px=t.x*worldWidth,pz=t.z*worldDepth;
   tmp.position.set(px,.25*t.height,pz);tmp.scale.set(1,t.height,1);tmp.rotation.set(0,0,0);tmp.updateMatrix();
   forestTrunk.setMatrixAt(i,tmp.matrix);
   tmp.position.set(px,.70*t.height,pz);tmp.scale.set(1,t.height,1);tmp.updateMatrix();
   forestCrown.setMatrixAt(i,tmp.matrix);
  }
  forestTrunk.instanceMatrix.needsUpdate=true;forestCrown.instanceMatrix.needsUpdate=true;
  path();rebuildPads();
  const half=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const distance=Math.max(worldDepth/(2*half),worldWidth/(2*half*camera.aspect));
  camera.position.set(worldWidth/2,distance*1.20+1.3,worldDepth/2+distance*.24);
  camera.lookAt(worldWidth/2,0,worldDepth/2);
  camera.updateMatrixWorld();
 }
 function worldPos(px,py){return [px/SCALE,py/SCALE]}
 function createTower(actor){
  const group=new THREE.Group();
  group.add(new THREE.Mesh(towerBase,towerBaseMat));
  const head=new THREE.Mesh(towerHead[actor.type],towerMat[actor.type]);
  head.position.y=.52;group.add(head);
  towers.add(group);towerParts.set(actor.pad,group);return group;
 }
 function updateInstanced(mesh,items,fn){
  const target=grow(mesh,items.length);
  for(let i=0;i<items.length;i++){tmp.position.set(0,0,0);tmp.scale.set(1,1,1);tmp.rotation.set(0,0,0);fn(items[i],i,tmp);tmp.updateMatrix();target.setMatrixAt(i,tmp.matrix);}
  target.count=items.length;target.instanceMatrix.needsUpdate=true;
  return target;
 }
 function render({state,selectedTower=null}){
  if(disposed||!state)return;
  const existing=new Set();
  for(const t of state.towers){
   existing.add(t.pad);
   const group=towerParts.get(t.pad)||createTower(t);
   const [x,z]=worldPos(t.x,t.y);
   group.position.set(x,.35,z);group.scale.setScalar(1+.1*(t.level-1));
  }
  for(const [pad,group] of towerParts)if(!existing.has(pad)){towers.remove(group);towerParts.delete(pad);}
  if(selectedTower&&existing.has(selectedTower.pad)){
   const [x,z]=worldPos(selectedTower.x,selectedTower.y);
   rangeRing.visible=true;rangeRing.position.set(x,.10,z);
   const radius=selectedTower.range/SCALE;
   rangeRing.scale.set(radius, radius,radius);
  }else rangeRing.visible=false;
  for(const kind of ENEMY_KINDS){
   const list=state.enemies.filter(e=>e.type===kind);
   enemyMesh.set(kind,updateInstanced(enemyMesh.get(kind),list,(actor,i,o)=>{
    const [x,z]=worldPos(actor.x,actor.y),r=Math.max(.13,actor.size/SCALE);
    o.position.set(x,r*1.5+(actor.flash>0?.08:0),z);
    o.scale.set(r,kind==='boss'?r*1.7:r*1.4,r);
    o.rotation.y=state.time*.6+i*.38;
   }));
  }
  for(const kind of TOWER_KINDS){
   const list=state.shots.filter(shot=>shot.type===kind);
   shotMesh.set(kind,updateInstanced(shotMesh.get(kind),list,(shot,i,o)=>{
    const [x,z]=worldPos(shot.x,shot.y),r=kind==='cannon'?.12:.065;
    o.position.set(x,.45,z);o.scale.setScalar(r);
   }));
  }
  renderer.render(scene,camera);
  canvas.dataset.renderedFrame='true';
  canvas.dataset.renderedEnemies=String([...enemyMesh.values()].reduce((sum,mesh)=>sum+mesh.count,0));
  canvas.dataset.renderedShots=String([...shotMesh.values()].reduce((sum,mesh)=>sum+mesh.count,0));
  document.body.dataset.spatialDimension='3d';
  document.body.dataset.renderer='three-webgl';
  document.body.dataset.nativeArtCoverage='incomplete'; // Stylized primitives are not licensed creature assets.
 }
 // Mapping a 3D pad under the actual tilted camera to the authoritative 2D
 // normalized terrain coordinates avoids click-versus-render mismatches.
 function pick(clientX,clientY){
  if(disposed)return null;
  pointer.set(clientX/Math.max(1,width)*2-1,-(clientY/Math.max(1,height))*2+1);
  pickRay.setFromCamera(pointer,camera);
  if(!pickRay.ray.intersectPlane(floorPlane,hit))return null;
  return {x:hit.x*SCALE,y:hit.z*SCALE};
 }
 const onLoss=e=>{e.preventDefault();document.body.dataset.spatialDimension='3d-error'};
 const onRestore=()=>{document.body.dataset.spatialDimension='3d-error'};
 const onResize=()=>resize();
 addEventListener('resize',onResize);canvas.addEventListener('webglcontextlost',onLoss);
 canvas.addEventListener('webglcontextrestored',onRestore);resize();
 function dispose(){
  disposed=true;removeEventListener('resize',onResize);
  canvas.removeEventListener('webglcontextlost',onLoss);
  canvas.removeEventListener('webglcontextrestored',onRestore);
  scene.traverse(o=>{
   o.geometry?.dispose?.();
   const materials=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
   for(const m of materials)m?.dispose?.();
  });
  renderer.dispose();
 }
 return {render,pick,resize,dispose};
}
