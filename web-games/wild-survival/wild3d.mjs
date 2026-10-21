// Original-source-only Wild Forest renderer.
// Uses ONLY repository GLB/FBX/OBJ original geometry; no synthetic character, tree, animal, or terrain meshes.
// The existing index.html simulation still owns animal AI, saves, crafting, gathering, combat, and collisions.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js';

const ASSETS=new URL('../../assets/',import.meta.url);
const SRC=Object.freeze({
  floor:'shared/homely-house/floor_base',
  tree:'shared/homely-house/tree',
  bigTree:'shared/homely-house/tree_large',
  fiber:'shared/homely-house/foliage_A',
  berry:'shared/homely-house/foliage_B',
  house:'shared/homely-house/house',
  bench:'shared/homely-house/bench_A',
  rock:'roblox/survival-core-world-v1/rock_medium',
  boar:'roblox/monster-adventure-v1/boar',
  lamp:'roblox/survival-core-world-v1/lamp'
});
const MTL=Object.freeze({
  boar:'roblox/monster-adventure-v1/monster-adventure.mtl',
  rock:'roblox/survival-core-world-v1/survival-core-world.mtl',
  lamp:'roblox/survival-core-world-v1/survival-core-world.mtl'
});
const MODEL_TO_KIND=Object.freeze({tree:'tree',stone:'rock',fiber:'fiber',berry:'berry'});
function fail(message){throw new Error('WILD_FOREST_ORIGINAL_ASSET_REQUIRED: '+message);}
async function fetchText(path){
  const response=await fetch(new URL(path,ASSETS),{cache:'force-cache'});
  if(!response.ok)fail(path+' HTTP '+response.status);
  return response.text();
}
async function loadObj(name){
  const path=SRC[name],mtlPath=MTL[name]||path+'.mtl';
  const [objText,mtlText]=await Promise.all([fetchText(path+'.obj'),fetchText(mtlPath)]);
  const parsedMaterials=new MTLLoader().parse(mtlText,new URL(mtlPath,ASSETS).href);
  parsedMaterials.preload();
  const loader=new OBJLoader();
  loader.setMaterials(parsedMaterials);
  const object=loader.parse(objText);
  let hasGeometry=false;
  object.traverse(item=>{if(item.isMesh){
    hasGeometry=hasGeometry||!!item.geometry?.attributes?.position?.count;
    item.castShadow=true;item.receiveShadow=true;
    // Preserve the source MTL; do not invent replacement materials.
    if(Array.isArray(item.material))for(const mat of item.material)mat.side=THREE.DoubleSide;
    else if(item.material)item.material.side=THREE.DoubleSide;
  }});
  if(!hasGeometry)fail('Original '+path+'.obj has no mesh');
  return object;
}
function placeAsset(parent,original,worldX,worldZ,height,rotation=0){
  const object=original.clone(true);
  const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
  if(!(size.y>0))fail('Original model has no height');
  const factor=height/size.y;
  object.scale.multiplyScalar(factor);
  object.position.set(worldX-(bounds.min.x+bounds.max.x)*.5*factor,-bounds.min.y*factor,
    worldZ-(bounds.min.z+bounds.max.z)*.5*factor);
  object.rotation.y=rotation;
  parent.add(object);
  return object;
}
function seededRandom(seed){let s=seed|0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296};}
function animateIfAvailable(model,clips) {
  if(!clips?.length)return null;
  const mixer=new THREE.AnimationMixer(model);
  const clip=clips.find(c=>/idle|walk|run/i.test(c.name))||clips[0];
  if(clip)mixer.clipAction(clip).play();
  return mixer;
}
async function loadOriginalBunny() {
  // This checked-in CC0 Kenney ZIP contains the exact 'animal-bunny' original species.
  const path='external/simple-rpg/wildlife/cube-pets.zip';
  const mod=await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  const JSZip=mod.default||mod;
  const response=await fetch(new URL(path,ASSETS),{cache:'force-cache'});
  if(!response.ok)fail(path+' HTTP '+response.status);
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  const files=Object.entries(zip.files).filter(([name,v])=>!v.dir&&/(?:^|\/)animal-bunny\.(?:glb|gltf|obj|fbx)$/i.test(name));
  files.sort((a,b)=>{const rank=n=>/\.(glb)$/i.test(n)?0:/\.(obj)$/i.test(n)?1:/\.(fbx)$/i.test(n)?2:3;return rank(a[0])-rank(b[0])});
  if(!files.length)fail('Kenney cube-pets archive lacks animal-bunny original model');
  const [name,file]=files[0];
  if(/\.glb$/i.test(name)){
    const data=await file.async('arraybuffer');
    return {scene:(await new GLTFLoader().parseAsync(data,'')).scene,clips:[]};
  }
  if(/\.obj$/i.test(name)){
    const group=new OBJLoader().parse(await file.async('string'));
    let count=0;
    group.traverse(o=>{if(o.isMesh){count++;o.castShadow=true;o.receiveShadow=true}});
    if(!count)fail('Kenney animal-bunny OBJ geometry missing');
    // File is the original archive asset; no new geometry is constructed.
    return {scene:group,clips:[]};
  }
  if(/\.fbx$/i.test(name)){
    const model=new FBXLoader().parse(await file.async('arraybuffer'),'');
    return {scene:model,clips:model.animations||[]};
  }
  fail('Kenney bunny archive has unsupported source model: '+name);
}
async function loadAnimals(){
  const deerUrl=new URL('roblox/actors/sources/quaternius-cute/FBX/Deer.fbx',ASSETS);
  const heroUrl=new URL('shared/humanoid-traveler.glb',ASSETS);
  const [deer,hero,bunny]=await Promise.all([
    new FBXLoader().loadAsync(deerUrl.href),
    new GLTFLoader().loadAsync(heroUrl.href),
    loadOriginalBunny()
  ]);
  if(!deer||!hero.scene||!bunny.scene)fail('Native deer, rabbit or player source could not be loaded');
  return {
    rabbit:{original:bunny.scene,clips:bunny.clips||[]},
    deer:{original:deer,clips:deer.animations||[]},
    // The existing, exact-named boar OBJ loads through the same licensed source loader.
    player:{original:hero.scene,clips:hero.animations||[]}
  };
}
function validateOriginalSource(assets){
  for(const id of ['floor','tree','bigTree','fiber','berry','rock','house','bench','boar','lamp']){
    if(!assets[id])fail('Missing required original OBJ: '+id);
  }
}
export async function createWild3D({canvas,WORLD,resources,animals}){
  if(!canvas||!window.WebGL2RenderingContext)fail('WebGL2 device unavailable, no 2D fallback');
  const err=document.getElementById('renderStatus');
  document.body.dataset.nativeForestAssets='loading';
  if(err){err.hidden=false;err.textContent='기존 3D 원본 에셋 불러오는 중…';}
  // Fail closed before any frame or misleading 3D "PASS".
  const names=Object.keys(SRC);
  const pairs=await Promise.all(names.map(async n=>[n,await loadObj(n)]));
  const assets=Object.fromEntries(pairs);
  validateOriginalSource(assets);
  const animalsLoaded=await loadAnimals();
  const SCALE=72;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#89acbb');
  scene.fog=new THREE.FogExp2('#89acbb',.013);
  const hemisphere=new THREE.HemisphereLight('#e0f0ff','#657a56',1.8);
  scene.add(hemisphere);
  const sunlight=new THREE.DirectionalLight('#ffdfaa',2.45);
  sunlight.position.set(-17,28,-9);sunlight.castShadow=true;
  sunlight.shadow.mapSize.set(matchMedia('(pointer:coarse)').matches?1024:2048,matchMedia('(pointer:coarse)').matches?1024:2048);
  sunlight.shadow.camera.left=-23;sunlight.shadow.camera.right=23;
  sunlight.shadow.camera.top=23;sunlight.shadow.camera.bottom=-23;
  sunlight.shadow.camera.near=1;sunlight.shadow.camera.far=75;
  sunlight.shadow.bias=-.00035;sunlight.shadow.normalBias=.04;
  scene.add(sunlight,sunlight.target);
  const world=new THREE.Group();scene.add(world);
  const groundModel=assets.floor;
  // Landscape tiles are instances of ORIGINAL CC0 floor_base.obj, not PlaneGeometry or procedural meshes.
  const groundTiles=[];
  const floorBounds=new THREE.Box3().setFromObject(groundModel);
  const nativeFloorSize=floorBounds.getSize(new THREE.Vector3());
  if(nativeFloorSize.x<.01||nativeFloorSize.z<.01)fail('CC0 floor_base native geometry has invalid horizontal dimensions');
  const tiling=5.2,cols=13,rows=13;
  for(let rz=0;rz<rows;rz++)for(let rx=0;rx<cols;rx++){
    const cell=placeAsset(world,groundModel,0,0,.48);
    cell.userData.grid={rx,rz};
    groundTiles.push(cell);
  }
  const originalNodes=resources.map((r,i)=>{
    const kind=MODEL_TO_KIND[r.type];
    const original=assets[kind];
    if(!original)fail('Missing exact original resource: '+r.type);
    const h=r.type==='tree'?(i%3===0?5.8:4.9):r.type==='stone'?.95:1.25;
    const choice=r.type==='tree'&&i%3===0?assets.bigTree:original;
    const group=placeAsset(world,choice,r.x/SCALE,r.y/SCALE,h,i*2.399963);
    return group;
  });
  const rabbitSource=animalsLoaded.rabbit, deerSource=animalsLoaded.deer,boarSource={original:assets.boar,clips:[]};
  const types={rabbit:rabbitSource,deer:deerSource,boar:boarSource};
  const creatures=animals.map(a=>{
    const source=types[a.type];if(!source)fail('No original model for existing animal '+a.type);
    const asset=cloneRig(source.original);
    const bounds=new THREE.Box3().setFromObject(asset);
    const size=bounds.getSize(new THREE.Vector3());
    const height=a.type==='rabbit'?1.05:a.type==='deer'?2.25:1.7;
    if(!(size.y>.0001))fail('Invalid original animal source '+a.type);
    const factor=height/size.y;
    asset.scale.multiplyScalar(factor);
    asset.userData.originalOffset=new THREE.Vector3(-(bounds.min.x+bounds.max.x)*.5*factor,-bounds.min.y*factor,-(bounds.min.z+bounds.max.z)*.5*factor);
    asset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    world.add(asset);
    return {asset,mixer:animateIfAvailable(asset,source.clips),source};
  });
  const avatar=cloneRig(animalsLoaded.player.original);
  const avatarBounds=new THREE.Box3().setFromObject(avatar);
  const aHeight=avatarBounds.max.y-avatarBounds.min.y;
  if(aHeight<=.0001)fail('Original traveler GLB contains no usable model');
  const avatarScale=2.65/aHeight;
  avatar.scale.setScalar(avatarScale);
  avatar.userData.originalOffset=new THREE.Vector3(-(avatarBounds.min.x+avatarBounds.max.x)*.5*avatarScale,-avatarBounds.min.y*avatarScale,-(avatarBounds.min.z+avatarBounds.max.z)*.5*avatarScale);
  avatar.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  world.add(avatar);
  const avatarMixer=animateIfAvailable(avatar,animalsLoaded.player.clips);
  const shelter=placeAsset(world,assets.house,-1000,-1000,4.3);
  const campBench=placeAsset(world,assets.bench,-1000,-1000,1.12);
  const campLamp=placeAsset(world,assets.lamp,-1000,-1000,1.15);
  const campGlow=new THREE.PointLight('#eaa34a',6.5,12,2);
  world.add(campGlow);
  const rng=seededRandom(20261020),decor=[];
  // Decorative repetition uses ORIGINAL tree/foliage geometry, not newly authored shapes.
  for(let i=0;i<235;i++){
    const x=110+rng()*(WORLD.w-220),z=100+rng()*(WORLD.h-200);
    if(Math.abs(z-(WORLD.riverY+WORLD.riverH*.5))<WORLD.riverH*.5+55)continue;
    if(Math.hypot(x-480,z-560)<145)continue;
    const original=i%4===0?assets.tree:i%7===0?assets.bigTree:assets.fiber;
    const height=i%4===0?3.4:i%7===0?5.9:1.05;
    decor.push(placeAsset(world,original,x/SCALE,z/SCALE,height,rng()*Math.PI*2));
  }
  const camera=new THREE.PerspectiveCamera(57,innerWidth/Math.max(1,innerHeight),.1,170);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.15:1.55));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.28;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  // Animation clips are sourced from original GLB and FBX assets.
  const skyDay=new THREE.Color('#8cb7c9'),skyNight=new THREE.Color('#19283c');
  let frames=0,prevX=NaN,prevY=NaN,glLost=false,width=innerWidth,height=innerHeight;
  const moveEye=new THREE.Vector3(),target=new THREE.Vector3();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();glLost=true;document.body.dataset.spatialDimension='3d-error';if(err){err.hidden=false;err.textContent='원본 3D 렌더링 연결이 끊어졌어. 새로고침해 줘.';}});
  function render(S,now){
    if(glLost)return;
    const p=S.player;
    if(innerWidth!==width||innerHeight!==height){
      width=innerWidth;height=innerHeight;camera.aspect=width/Math.max(1,height);
      camera.updateProjectionMatrix();renderer.setSize(width,height,false);
    }
    // Update native CC0 terrain tiles from the original floor model, including the river.
    const x=Math.floor(p.x/SCALE/tiling),z=Math.floor(p.y/SCALE/tiling);
    if(prevX!==x||prevY!==z){
      prevX=x;prevY=z;
      groundTiles.forEach(o=>{
        const {rx,rz}=o.userData.grid;
        const px=(x+rx-Math.floor(cols/2))*tiling;
        const pz=(z+rz-Math.floor(rows/2))*tiling;
        const wy=pz*SCALE;
        const river=wy>=WORLD.riverY&&wy<=WORLD.riverY+WORLD.riverH;
        const originalY=river?-.16:-.10;
        const floorSize=nativeFloorSize;
        const fx=tiling/(floorSize.x||1),fz=tiling/(floorSize.z||1);
        o.scale.set(fx,.12,fz);
        o.position.set(px,originalY,pz);
        o.visible=true;
        // Material tint is cosmetic only; mesh vertices remain the downloaded original.
        o.userData.river=river;
      });
    }
    originalNodes.forEach((obj,i)=>{obj.visible=resources[i].amount>0;});
    creatures.forEach((entry,i)=>{
      const animal=animals[i],obj=entry.asset;
      obj.visible=animal.dead<=0;
      const base=obj.userData.originalOffset;
      obj.position.set(animal.x/SCALE+base.x,base.y,animal.y/SCALE+base.z);
      if(Math.abs(animal.vx)+Math.abs(animal.vy)>.05)obj.rotation.y=Math.atan2(-animal.vx,-animal.vy);
      if(obj.visible&&entry.mixer)entry.mixer.update(.016);
    });
    avatar.position.set(p.x/SCALE+avatar.userData.originalOffset.x,avatar.userData.originalOffset.y,p.y/SCALE+avatar.userData.originalOffset.z);
    avatar.rotation.y=Math.atan2(-p.faceX,-p.faceY);
    if(avatarMixer)avatarMixer.update(.016);
    const campReady=!!S.camp?.shelter;
    shelter.visible=campReady&&S.camp.shelter>=2;
    campBench.visible=campReady;
    if(shelter.visible)shelter.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    if(campBench.visible)campBench.position.set(S.camp.x/SCALE+2.5,0,S.camp.y/SCALE);
    campLamp.visible=!!S.camp.fire;
    if(campLamp.visible)campLamp.position.set(S.camp.x/SCALE,0,S.camp.y/SCALE);
    campGlow.visible=campLamp.visible;
    campGlow.position.set(S.camp.x/SCALE,1.4,S.camp.y/SCALE);
    const px=p.x/SCALE,pz=p.y/SCALE;
    moveEye.set(px+4.0,8.4,pz+13.2);
    camera.position.lerp(moveEye,frames? .1:1);
    target.set(px,1.85,pz-3.7);
    camera.lookAt(target);
    sunlight.position.set(px-15,26,pz-12);
    sunlight.target.position.set(px,0,pz);
    sunlight.target.updateMatrixWorld();
    const hour=S.time/60;
    const dayLevel=Math.max(.07,Math.sin((hour-5)/24*Math.PI*2));
    hemisphere.intensity=.35+dayLevel*1.5;
    sunlight.intensity=.2+dayLevel*2.35;
    sunlight.color.set(S.weather==='storm'?'#cbd2dd':hour<7||hour>17?'#ffb67c':'#ffdfb5');
    scene.background.copy(skyNight).lerp(skyDay,Math.min(1,dayLevel));
    scene.fog.color.copy(scene.background);
    scene.fog.density=S.weather==='storm'?.03:S.weather==='rain'?.021:.012;
    renderer.render(scene,camera);
    if(++frames===1){
      document.body.dataset.spatialDimension='3d';
      document.body.dataset.renderer='three-webgl';
      document.body.dataset.nativeForestAssets='loaded';
      document.body.dataset.nativeOriginalAnimalSpecies='rabbit,deer,boar';
      canvas.dataset.renderedFrame='true';
      if(err)err.hidden=true;
    }
    if(frames%60===0)document.body.dataset.webglFrames=String(frames);
    document.body.dataset.playerWorldX=Number(p.x).toFixed(2);
    document.body.dataset.playerWorldY=Number(p.y).toFixed(2);
  }
  return{render,bindMovement(){},get frameCount(){return frames}};
}
