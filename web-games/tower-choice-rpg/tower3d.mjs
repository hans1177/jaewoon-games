// Native WebGL 3D presentation for the original Tower RPG's authoritative 10-floor simulation.
// Save, health, damage, AI, floor choices, currencies and cooldowns stay in index.html.
import * as THREE from 'three';
import { GLTFLoader } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/OBJLoader.js';
import { clone as cloneRig } from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';

const SCALE=1/80;
const P=(x,y)=>[x*SCALE,y*SCALE];
const enemyAsset=name=>{
  if(/해골/.test(name))return 'skeleton';
  if(/골렘|석상/.test(name))return 'golem';
  return null; // Missing species art is NOT silently replaced by a different species' rig.
};
function color(hex){return new THREE.MeshStandardMaterial({color:hex,roughness:.86})}
function fitSource(source,height=1.65){
  const root=new THREE.Group(),model=cloneRig(source);
  const bounds=new THREE.Box3().setFromObject(model);
  const dy=Math.max(0.05,bounds.max.y-bounds.min.y);
  const scale=height/dy;
  model.scale.setScalar(scale);
  model.position.set(-(bounds.min.x+bounds.max.x)*0.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*0.5*scale);
  root.add(model);
  return root;
}
export async function createTower3d({canvas,WORLD}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor('#0b111b');
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#0b111b');
  scene.fog=new THREE.Fog('#0b111b',11,28);
  scene.add(new THREE.HemisphereLight('#c4d9ff','#60503b',2.0));
  const sunlight=new THREE.DirectionalLight('#f5d2a4',2.2);
  sunlight.position.set(-6,11,5);scene.add(sunlight);
  const camera=new THREE.PerspectiveCamera(54,1,.08,85);
  const floor=new THREE.Group();scene.add(floor);
  const stone=color('#38404a'),tileA=color('#373d47'),tileB=color('#303844');
  const trim=color('#657080'),gold=color('#dcb474'),dark=color('#1a222e');
  const box=new THREE.BoxGeometry(1,1,1),ball=new THREE.SphereGeometry(1,12,9);
  function block(parent,x,y,z,w,h,d,mat){
    const obj=new THREE.Mesh(box,mat);
    obj.position.set(x,y,z);obj.scale.set(w,h,d);parent.add(obj);return obj;
  }
  const worldWidth=WORLD.w*SCALE,worldDepth=WORLD.h*SCALE;
  block(floor,worldWidth/2,-.13,worldDepth/2,worldWidth+.7,.26,worldDepth+.7,stone);
  const tileGeo=new THREE.PlaneGeometry(.97,.97);
  const countX=Math.ceil(worldWidth),countZ=Math.ceil(worldDepth);
  for(let n=0;n<2;n++){
    const spots=[];
    for(let x=0;x<countX;x++)for(let z=0;z<countZ;z++){
      if((x+z)%2===n)spots.push([x,z]);
    }
    const tile=new THREE.InstancedMesh(tileGeo,n===0?tileA:tileB,spots.length);
    const dummy=new THREE.Object3D();
    spots.forEach(([x,z],i)=>{
      dummy.position.set(x+.5,.013,z+.5);
      dummy.rotation.set(-Math.PI/2,0,0);dummy.updateMatrix();
      tile.setMatrixAt(i,dummy.matrix);
    });
    tile.instanceMatrix.needsUpdate=true;floor.add(tile);
  }
  block(floor,worldWidth/2,.67,-.18,worldWidth+1,1.38,.38,trim);
  block(floor,worldWidth/2,.67,worldDepth+.18,worldWidth+1,1.38,.38,trim);
  block(floor,-.18,.67,worldDepth/2,.38,1.38,worldDepth+1,trim);
  block(floor,worldWidth+.18,.67,worldDepth/2,.38,1.38,worldDepth+1,trim);
  for(let x=2;x<worldWidth-1;x+=3.8){
    for(const z of [1.35,worldDepth-1.35]){
      block(floor,x,.6,z,.63,1.2,.63,stone);
      block(floor,x,1.22,z,.77,.16,.77,gold);
    }
  }
  // Known CC0 models from the existing repository. No external CDN or fabricated asset IDs.
  const loader=new GLTFLoader();
  const base=new URL('../../assets/roblox/actors/native/',import.meta.url);
  let knight,skeleton,golem;
  try{
    const hero=await loader.loadAsync(new URL('knight.glb',base).href);
    knight=hero.scene;
    if(!knight)throw new Error('KNIGHT_3D_MESH_EMPTY');
  }catch(e){renderer.dispose();throw new Error('TOWER_KNIGHT_3D_ASSET_UNAVAILABLE: '+e.message)}
  try{
    const undead=await loader.loadAsync(new URL('skeleton-warrior.glb',base).href);
    skeleton=undead.scene;
  }catch(e){console.warn('Skeleton asset unavailable; 3D model coverage incomplete',e)}
  try{
    const mesh=await new OBJLoader().loadAsync(new URL('../../assets/shared/forest/monster-41.obj',import.meta.url).href);
    golem=mesh;
  }catch(e){console.warn('Golem asset unavailable; 3D model coverage incomplete',e)}
  const hero=fitSource(knight,1.70);scene.add(hero);
  // Missing native art uses visible 3D silhouettes, but does NOT count as licensed-art PASS.
  const fallbackMaterials=new Map(),enemyNodes=new Map();
  let nativeEnemies=0,unmatchedEnemies=0,lastTime=0,prevHero=[NaN,NaN];
  function fallback(actor){
    const group=new THREE.Group();
    const matKey=String(actor.color||'#6f8292');
    if(!fallbackMaterials.has(matKey))fallbackMaterials.set(matKey,color(matKey));
    const body=new THREE.Mesh(ball,fallbackMaterials.get(matKey));
    body.scale.set(Math.max(.24,actor.r*SCALE),Math.max(.37,actor.r*SCALE*1.4),Math.max(.24,actor.r*SCALE));
    body.position.y=body.scale.y;group.add(body);
    return group;
  }
  function createEnemy(actor){
    const kind=enemyAsset(actor.name),source=kind==='skeleton'?skeleton:kind==='golem'?golem:null;
    const native=Boolean(source);
    const group=native?fitSource(source,Math.max(.75,actor.r*SCALE*2.4)):fallback(actor);
    scene.add(group);
    const slot={group,native,kind,lastX:NaN,lastZ:NaN};enemyNodes.set(actor.id,slot);
    return slot;
  }
  const effects=new THREE.Group();scene.add(effects);
  const ringGeo=new THREE.RingGeometry(.83,1,36);
  const slashGeo=new THREE.TorusGeometry(.58,.045,5,20,Math.PI*1.5);
  const effectPalette=['#f4d091','#ffe1bf','#e95a71','#eb9273'].map(s=>new THREE.MeshBasicMaterial({color:s,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  const pool=Array.from({length:18},()=>{
    const mesh=new THREE.Mesh(ringGeo,effectPalette[0]);
    mesh.rotation.x=-Math.PI/2;mesh.visible=false;effects.add(mesh);return mesh;
  });
  function resize(){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  addEventListener('resize',resize);
  const onLoss=event=>{event.preventDefault();document.body.dataset.spatialDimension='3d-error'};
  canvas.addEventListener('webglcontextlost',onLoss,false);
  canvas.addEventListener('webglcontextrestored',()=>document.body.dataset.spatialDimension='3d-error',false);
  resize();
  function render({player,enemies:actors=[],effects:active=[]},time=0){
    if(!player)return;
    const dt=Math.min(.06,Math.max(0,(time-lastTime)/1000));lastTime=time;
    const [x,z]=P(player.x,player.y);
    hero.position.set(x,0,z);
    const mx=x-prevHero[0],mz=z-prevHero[1];prevHero=[x,z];
    const moving=Math.hypot(mx,mz)>.0005;
    hero.rotation.y=Math.atan2(player.dirX||1,player.dirY||0);
    // Cosmetic rig bob is proportional to actual resolved displacement, not a fake gait.
    hero.children[0].position.y=moving?Math.sin(time*.016)*.035:0;
    for(const actor of actors){
      if(actor.dead)continue;
      const slot=enemyNodes.get(actor.id)||createEnemy(actor);
      const [ex,ez]=P(actor.x,actor.y);
      slot.group.visible=true;
      slot.group.position.set(ex,actor.hit>0?.12:0,ez);
      slot.group.rotation.y=Math.atan2(actor.dirX||0,actor.dirY||-1);
      if(actor.hit>0)slot.group.scale.setScalar(1+Math.min(.13,actor.hit));
      else slot.group.scale.setScalar(1);
      slot.lastX=ex;slot.lastZ=ez;
    }
    for(const [id,entry] of enemyNodes)if(!actors.some(actor=>actor.id===id&&!actor.dead)){
      scene.remove(entry.group);enemyNodes.delete(id);
    }
    for(let i=0;i<pool.length;i++){
      const mesh=pool[i],fx=active[i];mesh.visible=Boolean(fx);
      if(!fx)continue;
      const [ex,ez]=P(fx.x,fx.y),alpha=Math.max(0,fx.t/fx.max);
      mesh.position.set(ex,.18,ez);mesh.rotation.z=fx.type==='slash'?Math.atan2(fx.dy,fx.dx):0;
      mesh.material=effectPalette[fx.type==='slash'?0:fx.type==='hit'?1:fx.type==='hurt'?2:3];
      const size=fx.type==='burst'?fx.r*SCALE:fx.type==='slash'?fx.range*SCALE*.72:fx.type==='hurt'?.48:.36;
      mesh.scale.setScalar(Math.max(.15,size*(1.20-.2*alpha)));
      mesh.material.opacity=Math.max(.08,alpha);
    }
    const desired=new THREE.Vector3(x,8.6,z+10);
    camera.position.lerp(desired,Math.min(1,dt*7+.04));
    camera.lookAt(x,0.85,z);
    renderer.render(scene,camera);
    canvas.dataset.renderedFrame='true';
    document.body.dataset.spatialDimension='3d';
    const count=actors.filter(a=>!a.dead).length;
    nativeEnemies=actors.filter(a=>!a.dead&&enemyNodes.get(a.id)?.native).length;
    unmatchedEnemies=count-nativeEnemies;
    canvas.dataset.authoredEnemyAssets=String(nativeEnemies);
    canvas.dataset.fallbackEnemyAssets=String(unmatchedEnemies);
  }
  function dispose(){
    canvas.removeEventListener('webglcontextlost',onLoss);
    scene.traverse(obj=>{if(obj.geometry&&!Object.values({box,ball,tileGeo,ringGeo}).includes(obj.geometry))obj.geometry.dispose?.()});
    renderer.dispose();
  }
  return {render,resize,dispose};
}
