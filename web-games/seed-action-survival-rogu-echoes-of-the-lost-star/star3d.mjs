// Real WebGL 3D view for Star Echoes. Gameplay coordinates, combat, waves and XP
// remain authoritative in index.html. Native geometry is temporary 3D art,
// not a claim that every enemy has a licensed species-specific model.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';

const SCALE=50,ENEMY_CAP=220,BULLET_CAP=420,GEM_CAP=420,PARTICLE_CAP=240;
const C=(value)=>new THREE.Color(value||'#ffffff');
const material=(c,emissive=c)=>new THREE.MeshStandardMaterial({color:c,emissive,emissiveIntensity:.35,roughness:.36,metalness:.15});
export function createStar3d({canvas}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
 renderer.setClearColor('#040815',1);
 const scene=new THREE.Scene();
 scene.background=C('#040815');
 scene.fog=new THREE.Fog('#040815',12,38);
 scene.add(new THREE.HemisphereLight('#9ad5ff','#101633',2.1));
 const light=new THREE.DirectionalLight('#8fdcff',2.4);
 light.position.set(-3,12,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(53,1,.08,100);
 const player=new THREE.Group();scene.add(player);
 const heroBody=new THREE.Mesh(new THREE.ConeGeometry(.4,1.35,8),material('#b7f4ff','#197ad9'));
 heroBody.rotation.z=-Math.PI/2;heroBody.position.y=.8;player.add(heroBody);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.57,.075,7,28),material('#62dafa','#137ecb'));
 ring.rotation.x=Math.PI/2;ring.position.y=.49;player.add(ring);
 const engine=new THREE.PointLight('#2ad7ff',2.2,3.2);engine.position.set(0,.55,0);player.add(engine);
 const enemyGeo=new THREE.IcosahedronGeometry(1,1);
 const bulletGeo=new THREE.SphereGeometry(1,8,6);
 const gemGeo=new THREE.OctahedronGeometry(1,0);
 const particleGeo=new THREE.TetrahedronGeometry(1,0);
 const dummy=new THREE.Object3D();
 function pool(geometry,mat,max){
   const inst=new THREE.InstancedMesh(geometry,mat,max);
   inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   inst.count=0;inst.frustumCulled=false;scene.add(inst);return inst;
 }
 const foes=pool(enemyGeo,material('#ffffff','#ffffff'),ENEMY_CAP);
 const bullets=pool(bulletGeo,material('#dffaff','#51bdff'),BULLET_CAP);
 const gems=pool(gemGeo,material('#73e9f9','#1b88a3'),GEM_CAP);
 const particles=pool(particleGeo,material('#ffffff','#ffffff'),PARTICLE_CAP);
 const floor=new THREE.Group();scene.add(floor);
 const platform=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshStandardMaterial({color:'#0f1b36',roughness:1,metalness:0,side:THREE.DoubleSide}));
 platform.rotation.x=-Math.PI/2;floor.add(platform);
 const grid=new THREE.GridHelper(20,20,'#42658d','#203251');
 grid.position.y=.02;floor.add(grid);
 const boundary=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,.04,1)),
   new THREE.LineBasicMaterial({color:'#446e94'}));boundary.position.y=.04;floor.add(boundary);
 const starsGeometry=new THREE.BufferGeometry(),count=160,points=new Float32Array(count*3);
 for(let i=0;i<count;i++){
  points[i*3]=(Math.random()-.5)*34;points[i*3+1]=2+Math.random()*11;
  points[i*3+2]=(Math.random()-.5)*34;
 }
 starsGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
 const starfield=new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:'#b6dcff',size:.055,sizeAttenuation:true}));
 scene.add(starfield);
 let width=1,height=1,disposed=false,previousX=NaN,previousZ=NaN;
 const tmpColor=new THREE.Color();
 function resize(){
  width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  const w=width/SCALE,h=height/SCALE;
  platform.position.set(w/2,-.04,h/2);platform.scale.set(w,h,1);
  grid.scale.set(Math.max(w,h)/20,1,Math.max(w,h)/20);
  grid.position.set(w/2,.01,h/2);floor.add(grid);
  boundary.position.set(w/2,.07,h/2);boundary.scale.set(w,.04,h);
  starfield.position.set(w/2,0,h/2);
 }
 const onResize=()=>resize();
 const onLoss=e=>{e.preventDefault();document.body.dataset.spatialDimension='3d-error'};
 const onRestore=()=>{document.body.dataset.spatialDimension='3d-error'};
 addEventListener('resize',onResize);
 canvas.addEventListener('webglcontextlost',onLoss,false);
 canvas.addEventListener('webglcontextrestored',onRestore,false);
 resize();
 function writeInstances(inst,items,max,size,now,kind){
  const visible=Math.min(items.length,max);
  for(let i=0;i<visible;i++){
   const a=items[i],x=a.x/SCALE,z=a.y/SCALE;
   const radius=Math.max(.04,(a.r||3)/SCALE)*size;
   const height=kind==='enemy'?(a.boss?radius*2.7:radius*1.8):radius;
   dummy.position.set(x,height*.72+Math.sin(now*.005+i)*.025,z);
   dummy.scale.set(radius,height,radius);
   dummy.rotation.set(0,kind==='gem'?now*.0015:now*.0007+i*.13,0);
   dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
   if(kind==='enemy')tmpColor.set(a.hit>0?'#ffffff':a.color||'#fa5c7f');
   else if(kind==='particle')tmpColor.set(a.color||'#ffffff');
   else tmpColor.set(kind==='gem'?'#64edff':'#ccf5ff');
   inst.setColorAt(i,tmpColor);
  }
  inst.count=visible;inst.instanceMatrix.needsUpdate=true;
  if(visible)inst.instanceColor.needsUpdate=true;
  return items.length-visible;
 }
 function render({player:state,enemies,bullets:shots,gems:drops,particles:sparks},now=0){
  if(disposed||!state)return;
  const px=state.x/SCALE,pz=state.y/SCALE,dx=px-previousX,dz=pz-previousZ;
  player.position.set(px,state.inv>0?.15:0,pz);
  if(Number.isFinite(dx)&&Math.hypot(dx,dz)>.003)player.rotation.y=Math.atan2(dx,dz);
  previousX=px;previousZ=pz;
  ring.rotation.z=now*.001;
  player.scale.setScalar(state.inv>0&&Math.floor(state.inv*12)%2===0?.88:1);
  const nowSafe=Number(now)||0;
  const clipped=writeInstances(foes,enemies,ENEMY_CAP,1,nowSafe,'enemy')
    +writeInstances(bullets,shots,BULLET_CAP,1,nowSafe,'bullet')
    +writeInstances(gems,drops,GEM_CAP,1.55,nowSafe,'gem')
    +writeInstances(particles,sparks,PARTICLE_CAP,1,nowSafe,'particle');
  canvas.dataset.unrenderedEntities=String(clipped);
  // Perspective (not an orthographic 2D disguise) follows the original arena centre.
  const sceneW=width/SCALE,sceneH=height/SCALE;
  const distance=Math.max(sceneH/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))),sceneW/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));
  camera.position.set(sceneW*.5,distance*1.16+2,sceneH*.5+distance*.25);
  camera.lookAt(sceneW*.5,0,sceneH*.5);
  renderer.render(scene,camera);
  canvas.dataset.renderedFrame='true';
  document.body.dataset.spatialDimension='3d';
  document.body.dataset.renderer='three-webgl';
  document.body.dataset.nativeArtCoverage='incomplete';
 }
 function dispose(){
  disposed=true;removeEventListener('resize',onResize);
  canvas.removeEventListener('webglcontextlost',onLoss);
  canvas.removeEventListener('webglcontextrestored',onRestore);
  scene.traverse(object=>{object.geometry?.dispose?.();const mats=Array.isArray(object.material)?object.material:[object.material];
    for(const mat of mats)mat?.dispose?.()});
  renderer.dispose();
 }
 return {render,resize,dispose};
}
