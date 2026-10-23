// 파일명: web-games/fantasy-survival/world3d.mjs
// Canonical 3D world renderer for the existing Magic Forest game.
// Uses the game's authoritative state and preserves its original combat and saves.
// Production readiness remains false until regions, monsters and mobile gameplay are verified.
// Geometry comes from the downloaded, CC0-ledgered Tiny Treats Homely House OBJ pack.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {FBXLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/FBXLoader.js';
import {OBJLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/OBJLoader.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {mergeVertices} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/BufferGeometryUtils.js';
import {clone as cloneAnimatedRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
import {createVibeEnvironmentVariation,createVibeWeatherInteractionProfile,createVibeRegionWorldProfile} from '../../assets/vibe-environment-director.js';
import {createVibeCharacterCustomizationRecipe} from '../../assets/vibe-character-identity-director.js';
import {createSurvivalPlayerMotionProfile} from '../../assets/vibe-motion-director.js';
import {planAssetApplication} from '../../assets/asset-selector.js';

const SOURCE = new URL('../../assets/shared/homely-house/', import.meta.url);
const SCALE = 1 / 48;
// 플레이어 꾸미기: 이미 확보된 CC0 KayKit 원본 3D 캐릭터만 선택한다.
const HERO_URL = new URL('../../assets/roblox/actors/native/knight.glb',import.meta.url);
const HERO_MODEL_FILES=Object.freeze({
  knight:'knight.glb',mage:'mage.glb',barbarian:'barbarian.glb',
  rogue:'rogue.glb','rogue-hooded':'rogue-hooded.glb'
});
const HERO_SIZES=Object.freeze([90,100,110]);
function normalizeHeroAppearance(selection){
  const model=Object.hasOwn(HERO_MODEL_FILES,selection?.model)?selection.model:'knight';
  const size=Number(selection?.size);
  return {model,size:HERO_SIZES.includes(size)?size:100};
}
const UNDEAD_URL = new URL('../../assets/roblox/actors/native/skeleton-warrior.glb',import.meta.url);
// Reuse the existing 3D creature library. Each source is bound only to matching
// game species; the renderer never creates a synthetic enemy or changes AI rules.
// 파일 원본은 assets/asset-license-ledger.json의 archive/sourceEntry/SHA256으로 대조한다.
// 종·외형이 가까운 CC0 원본만 시각적으로 연결하며 게임 ID/전투/드롭은 바꾸지 않는다.
const NATIVE_CREATURE_MODELS=Object.freeze({
  'wolf.fbx':['shadowwolf','shadowwolfleader','firewolf','polarwolf','thornhound','ironhidehound'],
  'monster-41.obj':['golem','firegolemneutral','firegolemaggressive','crystalfiregolem','icegolem','swampgolem','crystalguardian'],
  'tree.fbx':['worldtreegolem'],
  'greendemon.fbx':['goblin','goblinCrossbow','goblinHeavy','goblinGeneral','crystalgoblin','flowergoblin'],
  'hog.glb':['mossboar','crystalboar','crystalboarjunior'],
  'deer.fbx':['foreststag','sapdeer','crystaldeer'],
  'monster-18.obj':['ironibex','crystalibex','crystalgoat'],
  'panda.fbx':['worldtreebear','crystalbear','polarbear','fearbear'],
  'bunny.glb':['foresthare'], 'chick.glb':['worldpheasant'],
  'monster-7.obj':['fairy'],
  'monster-56.obj':['ironspirit','crystalironspirit','sandSpirit'],
  'mushroom.fbx':['sporegiant','toxicmycelium','toxicsporeorb'],
  'monster-35.obj':['rootsovereign'],
  'caterpillar.glb':['giantburrower'], 'monster-31.obj':['sandwalker'],
  'monster-26.obj':['firesnake','crystalfiresnake','anaconda','worldtreesnake'],
  'bat.fbx':['vampirebat'], 'cow.glb':['lakebuffalo'],
  'monster-49.obj':['lakeheron'], 'fish.glb':['lakefish'],
  'monster-47.obj':['giantSquid'], 'monster-21.obj':['giantleech'],
  'monster-17.obj':['deepAngler'], 'monkey.glb':['gorilla'],
  'tiger.glb':['jungletiger','jungletigerleader'],
  'yeti.fbx':['yetileader','yeticub','froststalker'], 'cat.glb':['polarfox'],
  'bee.fbx':['giantbee'], 'monster-15.obj':['thornmantis'],
  'monster-53.obj':['giantspider','giantspiderling']
});
const NATIVE_CREATURE_BY_ID=new Map(Object.entries(NATIVE_CREATURE_MODELS)
  .flatMap(([source,ids])=>ids.map(id=>[id,source])));
const CREATURE_SOURCE=new URL('../../assets/shared/forest/',import.meta.url);
const assetReadiness=planAssetApplication({
 prompt:'마력숲 생존 캐릭터 몬스터 나무 숲 UI 전투 애니메이션',
 manifest:{assets:[
  {id:'external-tinytreats-tree-v1',path:'assets/shared/homely-house/tree.obj',
   types:['prop','background'],license:'CC0',downloaded:true,
   sourceUrl:'https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0'},
  // Loaded only in explicitly selected preview. Runtime animation QA remains pending.
  {id:'external-actor-knight',path:'assets/roblox/actors/native/knight.glb',
   types:['character'],license:'CC0-1.0',downloaded:true,verifiedAnimation:false,
   sourceUrl:'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0'}
 ]}
});

const gameStyleRegion=createVibeRegionWorldProfile(
 {name:'마력숲',biome:'temperate-forest',resources:['tree','stone','fiber']},
 {name:'마력숲 생존기',geography:'mixed-biome-survival-world',climate:'dynamic'}
);
const avatarRecipe=createVibeCharacterCustomizationRecipe(
 {name:'마력숲 생존자',species:'humanoid',role:'magic',region:'forest'},0
);
const mobileBudget=typeof window!=='undefined'&&window.matchMedia('(pointer:coarse)').matches;
const assetVariation=createVibeEnvironmentVariation({seed:20261020,count:16,mobile:mobileBudget});
const assetAppearanceFactor=key=>{
 const str=String(key);let code=0;for(let i=0;i<str.length;i++)code=(Math.imul(code,33)+str.charCodeAt(i))>>>0;
 return assetVariation.items[code%assetVariation.items.length];
};
// Original, unchanged Tiny Treats mesh filenames; never fabricate an absent asset.
const MODEL_NAMES = Object.freeze(['floor_base','tree','tree_large','foliage_A','foliage_B','cobblestones','bench_A','bench_B','fence_straight','house','gate_single','package']);

function parseDownloadedObj(text, modelName, materialText=''){
  // The tracked Tiny Treats CC0 OBJ vertices/faces remain the geometry authority.
  // Apply the companion per-source .mtl diffuse (Kd), not an invented material color.
  const diffuse=materialText.match(/(?:^|\n)\s*Kd\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if(!diffuse)throw new Error('Original CC0 MTL diffuse missing: '+modelName);
  const base=new THREE.Color().setRGB(...diffuse.slice(1,4).map(Number));
  const raw=[],pos=[],colors=[];
  for(const rawLine of text.split(/\r?\n/)){
    const line=rawLine.trim();
    if(line.startsWith('v ')){
      const v=line.slice(2).trim().split(/\s+/).map(Number);
      if(v.length>=3&&v.slice(0,3).every(Number.isFinite))raw.push(v.slice(0,3));
    }else if(line.startsWith('f ')){
      const indices=line.slice(2).trim().split(/\s+/).map(item=>Number(item.split('/')[0]));
      if(indices.length<3||indices.length>12)continue;
      const verts=indices.map(n=>raw[n>0?n-1:raw.length+n]);
      if(verts.some(v=>!v))throw new Error('OBJ missing geometry: '+modelName);
      for(let i=1;i<verts.length-1;i++){
        // Triangle subdivision of ORIGINAL OBJ polygon faces; all coordinates and
        // MTL Kd colors come from the licensed source, not custom-made scenery.
        const face=[verts[0],verts[i],verts[i+1]];
        for(const v of face){pos.push(v[0],v[1],v[2]);colors.push(base.r,base.g,base.b)}
      }
    }
  }
  if(pos.length<9)throw new Error('Empty downloaded 3D geometry: '+modelName);
  let geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  // 형식: 같은 위치·법선·색의 중복 정점을 인덱스 버퍼로 공유한다.
  const indexed=mergeVertices(geometry,1e-6);geometry.dispose();geometry=indexed;
  geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,flatShading:true,side:THREE.DoubleSide});
  const model=new THREE.Mesh(geometry,material);
  model.castShadow=true;model.receiveShadow=true;
  return model;
}

async function loadSourceModels(){
  let packedModels=null;
  if(typeof DecompressionStream==='function'){
    const response=await fetch(new URL('./models.json.gz',import.meta.url),{cache:'force-cache'});
    if(!response.ok)throw new Error('Compressed CC0 model pack unavailable: '+response.status);
    packedModels=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  }
  const results=await Promise.all(MODEL_NAMES.map(async name=>{
    if(packedModels){
      const entry=packedModels[name];
      if(!entry?.obj||!entry?.mtl)throw new Error('Compressed CC0 model missing: '+name);
      return [name,parseDownloadedObj(entry.obj,name,entry.mtl)];
    }
    const geometryUrl=new URL(name+'.obj',SOURCE);
    const materialUrl=new URL(name+'.mtl',SOURCE);
    const [response,mtlResponse]=await Promise.all([
      fetch(geometryUrl,{cache:'force-cache'}),
      fetch(materialUrl,{cache:'force-cache'})
    ]);
    if(!response.ok)throw new Error('Original CC0 OBJ missing: '+name+' '+response.status);
    if(!mtlResponse.ok)throw new Error('Original CC0 material missing: '+name+' '+mtlResponse.status);
    const [text,materialText]=await Promise.all([response.text(),mtlResponse.text()]);
    if(!text.includes('v ')||!text.includes('f '))throw new Error('Invalid original 3D OBJ model: '+name);
    if(!materialText.includes('Kd '))throw new Error('Original 3D material diffuse missing: '+name);
    return [name,parseDownloadedObj(text,name,materialText)];
  }));
  return new Map(results);
}

export async function createWorld3d(canvas, initialAppearance={model:'knight',size:100},initialState=null){
  // 로딩: 배경·플레이어·몬스터 요청을 함께 시작하고 한 번만 합류한다.
  const modelsPromise=loadSourceModels();
  // 메인: 실제 CC0 리그 교체는 시각 효과 전용이며 저장·전투 권한과 독립적이다.
  let hero=null,heroMixer=null,heroClips=[],heroAction=null,heroActionName='',lastHeroAttackAt=0,lastHeroFrame=0;
  let scene=null,disposed=false,heroLoadVersion=0;
  let selectedAppearance=null;
  async function setAvatarAppearance(requested){
    const choice=normalizeHeroAppearance(requested);
    if(hero&&selectedAppearance?.model===choice.model&&selectedAppearance?.size===choice.size)return true;
    const version=++heroLoadVersion;
    const source=new URL('../../assets/roblox/actors/native/'+HERO_MODEL_FILES[choice.model],import.meta.url);
    try{
      let gltf;
      if(typeof DecompressionStream==='function'){
        const compressed=new URL('./'+HERO_MODEL_FILES[choice.model]+'.gz',import.meta.url);
        const response=await fetch(compressed,{cache:'force-cache'});
        if(!response.ok)throw new Error('Compressed CC0 avatar unavailable: '+response.status);
        const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
        gltf=await new GLTFLoader().parseAsync(bytes,new URL('.',source).href);
      }else gltf=await new GLTFLoader().loadAsync(source.href);
      if(disposed||version!==heroLoadVersion)return false;
      const avatar=new THREE.Group(),model=gltf.scene;
      const box=new THREE.Box3().setFromObject(model);
      const modelHeight=Math.max(.1,box.max.y-box.min.y);
      const heightFactor=Math.max(.87,Math.min(1.13,(Number(avatarRecipe.body.heightCm)||170)/170));
      const scaledHeight=1.9*heightFactor*(choice.size/100)/modelHeight;
      model.scale.setScalar(scaledHeight);
      model.position.y=-box.min.y*scaledHeight;
      avatar.add(model);
      avatar.userData.source=source.href;
      const previous=hero,previousMixer=heroMixer;
      if(scene)scene.add(avatar);
      hero={avatar,model};
      heroClips=gltf.animations||[];
      heroMixer=heroClips.length?new THREE.AnimationMixer(model):null;
      heroAction=null;heroActionName='';lastHeroFrame=0;
      selectedAppearance=choice;
      if(previous){
        previousMixer?.stopAllAction();
        if(scene)scene.remove(previous.avatar);
        previous.model.traverse(object=>{
          if(!object.isMesh)return;
          object.geometry?.dispose();
          const materials=Array.isArray(object.material)?object.material:[object.material];
          for(const material of materials)material?.dispose();
        });
      }
      return true;
    }catch(error){
      console.warn('CC0 player appearance model unavailable; existing player preserved',error);
      return false;
    }
  }
  const heroPromise=setAvatarAppearance(initialAppearance);
  // A native CC0 humanoid undead is a visual proxy only for the existing
  // wastelandMummy type. Its AI, hitbox, spawn, skills, loot and ID stay authoritative.
  // More distant species remain missing; do not render arbitrary substitutes.
  let undeadSource=null,undeadClips=[],undeadModelHeight=1;
  // 로딩: 현재 위치에 필요한 종부터 거리순, 모바일은 동시 두 요청만 처리한다.
  const nativeCreatureSources=new Map(),creatureRequests=new Map(),creatureFailures=new Map();
  let loadingCreatureCount=0,nextCreatureScan=0;
  async function loadCreatureSource(file){
    if(disposed||nativeCreatureSources.has(file)||creatureRequests.has(file))return;
    creatureRequests.set(file,true);loadingCreatureCount++;
    try{
      const url=file==='skeleton-warrior.glb'?UNDEAD_URL:new URL(file,CREATURE_SOURCE);
      let model,clips=[];
      if(file.endsWith('.fbx')){
        model=await new FBXLoader().setResourcePath(CREATURE_SOURCE.href).loadAsync(url.href);
        clips=model.animations||[];
      }else if(file.endsWith('.glb')){
        const gltf=await new GLTFLoader().loadAsync(url.href);
        model=gltf.scene;clips=gltf.animations||[];
      }else{
        const texture=await new THREE.TextureLoader().loadAsync(new URL(file.replace('.obj','.png'),CREATURE_SOURCE).href);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.magFilter=THREE.NearestFilter;
        model=await new OBJLoader().loadAsync(url.href);
        const material=new THREE.MeshStandardMaterial({map:texture,roughness:.94});
        model.traverse(child=>{if(child.isMesh)child.material=material});
      }
      const box=new THREE.Box3().setFromObject(model);
      if(box.isEmpty())throw new Error('Missing downloaded creature mesh');
      model.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true}});
      if(disposed){
        model.traverse(child=>{if(child.isMesh){child.geometry?.dispose();for(const m of (Array.isArray(child.material)?child.material:[child.material])){m?.map?.dispose();m?.dispose()}}});
        return;
      }
      nativeCreatureSources.set(file,{model,clips,height:Math.max(.1,box.max.y-box.min.y),floor:box.min.y});
      if(file==='skeleton-warrior.glb'){
        undeadSource=model;undeadClips=clips;undeadModelHeight=Math.max(.1,box.max.y-box.min.y);
      }
    }catch(error){
      const previous=creatureFailures.get(file);
      creatureFailures.set(file,{at:performance.now(),attempts:(previous?.attempts||0)+1});
      if(!previous)console.warn('CC0 original 3D monster unavailable: '+file,error);
    }finally{loadingCreatureCount--;creatureRequests.delete(file)}
  }
  const initialFiles=new Map();
  for(const e of initialState?.enemies||[]){
    const distance=Math.hypot(e.x-initialState.player.x,e.y-initialState.player.y);
    if(e.hp<=0||e.area!==initialState.area||distance>1200)continue;
    const file=e.type?.id==='wastelandMummy'?'skeleton-warrior.glb':NATIVE_CREATURE_BY_ID.get(e.type?.id);
    if(file)initialFiles.set(file,Math.min(initialFiles.get(file)??Infinity,distance));
  }
  const creaturesPromise=(async()=>{
    const ordered=[...initialFiles].sort((a,b)=>a[1]-b[1]).map(([file])=>file),limit=mobileBudget?2:4;
    for(let i=0;i<ordered.length;i+=limit)await Promise.all(ordered.slice(i,i+limit).map(loadCreatureSource));
  })();
  let models;
  try{[models]=await Promise.all([modelsPromise,heroPromise,creaturesPromise])}
  catch(error){
    disposed=true;heroLoadVersion++;
    for(const source of nativeCreatureSources.values())source.model.traverse(child=>{
      if(child.isMesh){child.geometry?.dispose();for(const m of (Array.isArray(child.material)?child.material:[child.material])){m?.map?.dispose();m?.dispose()}}
    });
    nativeCreatureSources.clear();
    hero?.model.traverse(child=>{if(child.isMesh){child.geometry?.dispose();for(const m of (Array.isArray(child.material)?child.material:[child.material])){m?.map?.dispose();m?.dispose()}}});
    throw error;
  }
  const renderer=new THREE.WebGLRenderer({canvas,antialias:!mobileBudget,alpha:false,powerPreference:'default'});
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=!mobileBudget;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x244238);
  scene.fog=new THREE.Fog(0x244238,22,90);
  // Diablo II Resurrected-inspired orthographic quarter-view:
  // 3D models retain depth, but distance never shrinks or stretches the hero.
  const cameraViewHeight=mobileBudget?18:24;
  const camera=new THREE.OrthographicCamera(-12,12,12,-12,0.1,155);
  const ambient=new THREE.HemisphereLight(0xe7f5d2,0x263428,2.25);
  scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffe9b6,2.0);
  sun.position.set(-10,22,8);
  sun.castShadow=!mobileBudget;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
  scene.add(sun);
  // No generated floor mesh. Every visible ground tile is a clone of the
  // downloaded Tiny Treats CC0 floor_base.obj (including source silhouette).
  const sourceFloor=models.get('floor_base');
  if(!sourceFloor||!sourceFloor.geometry?.attributes?.position)
    throw new Error('Licensed original floor_base OBJ unavailable');
  // The existing game regionAt() is the single source of truth for biome decisions.
  // Native renderer samples *existing* 2D world positions, never re-rolls a separate biome map.
  const BIOME_STYLE=Object.freeze({
    forest:{floor:0x426442,sky:0x244238},jungle:{floor:0x294e33,sky:0x142e25},
    swamp:{floor:0x333f2a,sky:0x252b26},snow:{floor:0xd0dfdf,sky:0x98b7c7},
    canyon:{floor:0x806958,sky:0x62574e},volcano:{floor:0x4c4142,sky:0x392f35},
    crystal:{floor:0x555378,sky:0x383855},giantlake:{floor:0x3d696a,sky:0x366677},
    worldtree:{floor:0x335039,sky:0x203e2d},flowerfield:{floor:0x668551,sky:0x586b50},
    giantgarden:{floor:0x625071,sky:0x4a3d55},desert:{floor:0xb38c55,sky:0xa38259}
  });
  const biomeTiles=new THREE.InstancedMesh(sourceFloor.geometry,sourceFloor.material,49);
  biomeTiles.receiveShadow=true;biomeTiles.frustumCulled=false;scene.add(biomeTiles);
  const tile=new THREE.Object3D(),resourceTransform=new THREE.Object3D();
  const resourceBatches=new Map();
  let currentBiome='forest';
  const raycaster=new THREE.Raycaster();
  const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const entities=new Map();
  const interactables=[];
  const undeadActors=new Map();
  const nativeCreatureActors=new Map();
  const cameraFrustum=new THREE.Frustum(),cameraProjection=new THREE.Matrix4();
  const creatureBounds=new THREE.Sphere(new THREE.Vector3(),4);
  const missingVisibleMonsterIds=new Set();
  let fallbackReason='';
  let qualityFactor=1,framesInWindow=0,fpsWindowStart=0,stableQualityWindows=0,measuredFps=0;
  function synchronizeUndead(state,px,py,stamp){
    if(!undeadSource)return;
    const candidates=(state.enemies||[]).filter(e=>e?.type?.id==='wastelandMummy'&&e.hp>0&&e.area===state.area
      &&Math.hypot(e.x-px,e.y-py)<940);
    for(const e of candidates){
      creatureBounds.center.set(e.x*SCALE,2,e.y*SCALE);
      if(!cameraFrustum.intersectsSphere(creatureBounds))continue;
      const id=String(e.netId||e.id||'');
      if(!id)continue;
      let actor=undeadActors.get(id);
      if(!actor){
        const model=cloneAnimatedRig(undeadSource);
        const heightScale=2.35/undeadModelHeight;
        model.scale.setScalar(heightScale);
        const actorBox=new THREE.Box3().setFromObject(model);
        model.position.y=-actorBox.min.y;
        const anchor=new THREE.Group();
        anchor.add(model);
        scene.add(anchor);
        const mixer=undeadClips.length?new THREE.AnimationMixer(model):null;
        actor={anchor,model,mixer,clipName:'',action:null,lastFrame:performance.now(),seen:0};
        undeadActors.set(id,actor);
      }
      actor.anchor.position.set(e.x*SCALE,0,e.y*SCALE);
      actor.anchor.rotation.y=Math.atan2(Number(e.faceX)||0,Number(e.faceY)||1);
      actor.anchor.userData.worldPoint={x:e.x,y:e.y};
      // The game owns the tap-target/attack decision. Native skinned surfaces only
      // provide the correct original world coordinates to its existing handler.
      actor.model.traverse(child=>{
        if(!child.isMesh)return;
        child.userData.worldPoint={x:e.x,y:e.y};
        interactables.push(child);
      });
      const moving=e.moving===true||Math.hypot(Number(e.vx)||0,Number(e.vy)||0)>.05;
      const attacking=performance.now()-(Number(e.attackAt)||0)<400;
      const intents=attacking?['attack','swing']:moving?['walk','run']:['idle','stand'];
      const clip=undeadClips.find(c=>intents.some(word=>c.name.toLowerCase().includes(word)))
        ||undeadClips.find(c=>/idle|walk/i.test(c.name))||null;
      if(actor.mixer&&clip&&clip.name!==actor.clipName){
        if(actor.action)actor.action.fadeOut(.12);
        actor.action=actor.mixer.clipAction(clip).reset().fadeIn(.12).play();
        actor.clipName=clip.name;
      }
      const now=performance.now();
      if(Math.hypot(e.x-px,e.y-py)<300||now-actor.lastFrame>=100){
        actor.mixer?.update(Math.min(.15,Math.max(0,(now-actor.lastFrame)/1000)));
        actor.lastFrame=now;
      }
      actor.seen=stamp;
    }
    for(const [key,actor] of undeadActors){
      if(actor.seen===stamp)continue;
      actor.mixer?.stopAllAction();
      scene.remove(actor.anchor);
      undeadActors.delete(key);
    }
  }
  // The native rigs follow the *existing* monster coordinates, direction and actions.
  // No new spawn/damage/loot logic is allowed in the rendering layer.
  function synchronizeNativeCreatures(state,px,py,stamp){
    const near=mobileBudget?720:1000;
    missingVisibleMonsterIds.clear();
    let unsafeUnmappedEncounter=false;
    for(const e of state.enemies||[]){
      if(!e||e.hp<=0||e.area!==state.area||Math.hypot(e.x-px,e.y-py)>Math.max(430,near*qualityFactor))continue;
      // 성능: 화면 밖 개체만 제외한다. 화면 안 개체 수로 2D 복귀를 결정하지 않는다.
      creatureBounds.center.set(e.x*SCALE,2,e.y*SCALE);
      if(!cameraFrustum.intersectsSphere(creatureBounds))continue;
      const kind=NATIVE_CREATURE_BY_ID.get(e.type?.id);
      if(!kind||!nativeCreatureSources.has(kind)){
        if(e.type?.id!=='wastelandMummy'||!undeadSource){
          missingVisibleMonsterIds.add(e.type?.id||'unknown');
          // Never let an invisible, original monster attack the player.
          // 모델이 준비되지 않은 전투는 3D 준비 화면에서 대기한다.
          // 화면을 2D 월드로 바꾸거나 보이지 않는 적과 전투하지 않는다.
          if(Math.hypot(e.x-px,e.y-py)<430)unsafeUnmappedEncounter=true;
        }
        continue;
      }
      // 표시: 실제 위협 개체는 고정 개수 제한으로 생략하지 않는다.
      // 거리는 기존 범위로 제한하고 화면 밖 메시의 제외는 Three.js가 처리한다.
      const key=String(e.netId||e.id||e.type.id+':'+e.x+':'+e.y);
      let actor=nativeCreatureActors.get(key);
      if(!actor){
        const source=nativeCreatureSources.get(kind);
        const model=cloneAnimatedRig(source.model),scale=Math.max(.72,Math.min(3.8,
          (Number(e.type?.r)||20)*SCALE*2.2))/source.height;
        model.scale.setScalar(scale);
        model.position.y=-source.floor*scale;
        const anchor=new THREE.Group();anchor.add(model);scene.add(anchor);
        const mixer=source.clips.length?new THREE.AnimationMixer(model):null;
        actor={anchor,model,mixer,clips:source.clips,clipName:'',action:null,
          lastFrame:performance.now(),seen:0};
        nativeCreatureActors.set(key,actor);
      }
      actor.anchor.position.set(e.x*SCALE,0,e.y*SCALE);
      actor.anchor.rotation.y=Math.atan2(Number(e.faceX)||0,Number(e.faceY)||1);
      actor.anchor.userData.worldPoint={x:e.x,y:e.y};
      actor.model.traverse(child=>{
        if(!child.isMesh)return;
        child.userData.worldPoint={x:e.x,y:e.y};
        interactables.push(child);
      });
      const moving=e.moving===true||Math.hypot(Number(e.vx)||0,Number(e.vy)||0)>.05;
      const attacking=performance.now()-(Number(e.attackAt)||0)<400;
      const words=attacking?['attack','bite','swing']:moving?['walk','run']:['idle','stand'];
      const clip=actor.clips.find(c=>words.some(w=>c.name.toLowerCase().includes(w)))
        ||actor.clips.find(c=>/idle|walk/i.test(c.name));
      if(actor.mixer&&clip&&clip.name!==actor.clipName){
        actor.action?.fadeOut(.12);
        actor.action=actor.mixer.clipAction(clip).reset().fadeIn(.12).play();
        actor.clipName=clip.name;
      }
      const now=performance.now();
      if(Math.hypot(e.x-px,e.y-py)<300||now-actor.lastFrame>=100){
        actor.mixer?.update(Math.min(.15,Math.max(0,(now-actor.lastFrame)/1000)));
        actor.lastFrame=now;
      }actor.seen=stamp;
    }
    for(const [key,actor] of nativeCreatureActors){
      if(actor.seen===stamp)continue;
      actor.mixer?.stopAllAction();
      scene.remove(actor.anchor);nativeCreatureActors.delete(key);
    }
    return unsafeUnmappedEncounter;
  }
  if(hero)scene.add(hero.avatar);
  let playerToolName=null,playerMotionProfile=createSurvivalPlayerMotionProfile({platform:'WEB',tool:'NONE'});
  let observedWeather='';
  let weatherVisualEffects=[];
  let active=false,lastW=0,lastH=0;
  canvas.hidden=true;

  function addVisibleEntity(key,kind,x,y,scale,seen,rotationY=0){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(!models.has(kind))return;
    let row=entities.get(key);
    if(!row){
      const model=models.get(kind).clone();
      scene.add(model);
      row={model};
      entities.set(key,row);
    }
    const model=row.model;
    model.position.set(x*SCALE,0,y*SCALE);
    const variation=assetAppearanceFactor(key);
    model.scale.setScalar(scale*variation.scale);
    model.rotation.y=rotationY+variation.rotation*Math.PI/180;
    model.userData.worldPoint={x,y};
    row.seen=seen;
    interactables.push(model);
  }
  function resources(arr,kind,px,py,seen,scale=1){
    if(!Array.isArray(arr)||!models.has(kind))return;
    const source=models.get(kind);
    let batch=resourceBatches.get(kind);
    if(!batch){
      const mesh=new THREE.InstancedMesh(source.geometry,source.material,128);
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
      batch={mesh,capacity:128,points:[]};scene.add(mesh);resourceBatches.set(kind,batch);
    }
    let count=0;
    for(const item of arr){
      if(!item||item.dead||Math.hypot(item.x-px,item.y-py)>Math.max(430,1000*qualityFactor))continue;
      const key=kind+':'+String(item.id),variation=assetAppearanceFactor(key),size=scale*variation.scale;
      creatureBounds.center.copy(source.geometry.boundingSphere.center).multiplyScalar(size);
      creatureBounds.center.x+=item.x*SCALE;creatureBounds.center.z+=item.y*SCALE;
      creatureBounds.radius=source.geometry.boundingSphere.radius*size;
      if(!cameraFrustum.intersectsSphere(creatureBounds))continue;
      if(count===batch.capacity){
        const previous=batch.mesh;batch.capacity*=2;
        batch.mesh=new THREE.InstancedMesh(source.geometry,source.material,batch.capacity);
        batch.mesh.castShadow=true;batch.mesh.receiveShadow=true;batch.mesh.frustumCulled=false;
        for(let i=0;i<count;i++){previous.getMatrixAt(i,resourceTransform.matrix);batch.mesh.setMatrixAt(i,resourceTransform.matrix)}
        scene.remove(previous);previous.dispose();scene.add(batch.mesh);
      }
      resourceTransform.position.set(item.x*SCALE,0,item.y*SCALE);
      resourceTransform.scale.setScalar(size);resourceTransform.rotation.y=variation.rotation*Math.PI/180;
      resourceTransform.updateMatrix();batch.mesh.setMatrixAt(count,resourceTransform.matrix);
      const point=batch.points[count]||(batch.points[count]={});point.x=item.x;point.y=item.y;count++;
    }
    batch.points.length=count;batch.mesh.count=count;
    batch.mesh.userData.worldPoints=batch.points;batch.mesh.instanceMatrix.needsUpdate=true;
    // 이동 후에도 인스턴스 선택 검사가 이전 프레임의 경계를 재사용하지 않는다.
    batch.mesh.boundingSphere=null;
    if(count)interactables.push(batch.mesh);
    creatureBounds.radius=4;
  }
  function frame(state,regionAt){
    if(disposed)return;
    // Additional optimization: reduce active model range and GPU resolution only
    // when the actual frame rate remains low. Never change simulation tick or AI.
    const sampleNow=performance.now();
    if(document.hidden){framesInWindow=0;fpsWindowStart=0;return}
    if(!fpsWindowStart)fpsWindowStart=sampleNow;
    framesInWindow++;
    if(sampleNow-fpsWindowStart>=2400){
      const fps=framesInWindow*1000/(sampleNow-fpsWindowStart);measuredFps=fps;
      stableQualityWindows=fps>48?stableQualityWindows+1:0;
      const next=fps<25?Math.max(.58,qualityFactor-.13):
        stableQualityWindows>=3?Math.min(1,qualityFactor+.08):qualityFactor;
      if(Math.abs(next-qualityFactor)>.01){
        qualityFactor=next;stableQualityWindows=0;
        renderer.shadowMap.enabled=!mobileBudget&&qualityFactor>=.8;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)*qualityFactor);
      }
      framesInWindow=0;fpsWindowStart=sampleNow;
    }
    if(state.area!=='surface'||!state.player){canvas.hidden=true;active=false;fallbackReason='region-3d-not-yet-mapped';return}
    const p=state.player,px=Number(p.x)||0,py=Number(p.y)||0,centerX=px*SCALE,centerY=py*SCALE;
    if(sampleNow>=nextCreatureScan){
      nextCreatureScan=sampleNow+250;
      const needed=new Map();
      for(const e of state.enemies||[]){
        const distance=Math.hypot(e.x-px,e.y-py);
        if(e.hp<=0||e.area!==state.area||distance>1200)continue;
        const file=e.type?.id==='wastelandMummy'?'skeleton-warrior.glb':NATIVE_CREATURE_BY_ID.get(e.type?.id);
        const failed=creatureFailures.get(file);
        if(!file||nativeCreatureSources.has(file)||creatureRequests.has(file)
          ||(failed&&(failed.attempts>=3||sampleNow-failed.at<10000)))continue;
        needed.set(file,Math.min(needed.get(file)??Infinity,distance));
      }
      for(const [file] of [...needed].sort((a,b)=>a[1]-b[1])){
        if(loadingCreatureCount>=(mobileBudget?2:4))break;
        void loadCreatureSource(file);
      }
    }
    const w=window.innerWidth,h=window.innerHeight;
    if(w!==lastW||h!==lastH){
      lastW=w;lastH=h;
      const aspect=w/Math.max(1,h);
      camera.left=-cameraViewHeight*aspect/2;
      camera.right=cameraViewHeight*aspect/2;
      camera.top=cameraViewHeight/2;
      camera.bottom=-cameraViewHeight/2;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    }
    // Follow real saved player coordinates without rotating while the player moves.
    camera.position.set(centerX+10.5,17,centerY+13);
    camera.lookAt(centerX,0,centerY);
    camera.updateMatrixWorld();
    cameraProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    cameraFrustum.setFromProjectionMatrix(cameraProjection);
     const classify=typeof regionAt==='function'?regionAt:()=> 'forest';
    const zone=String(classify(px,py)||'forest');
    currentBiome=BIOME_STYLE[zone]?zone:'forest';
    scene.background.set(BIOME_STYLE[currentBiome].sky);
    scene.fog.color.set(BIOME_STYLE[currentBiome].sky);
    const weatherKind=String(state.weather?.kind||'clear');
    if(weatherKind!==observedWeather){
      observedWeather=weatherKind;
      const weatherPlan=createVibeWeatherInteractionProfile({weather:weatherKind,intensity:.5,mobile:mobileBudget});
      weatherVisualEffects=weatherPlan.effects;
      scene.fog.far=weatherVisualEffects.includes('layered-haze')?46:
        weatherVisualEffects.includes('wind-drift')?63:90;
      sun.intensity=weatherVisualEffects.includes('surface-wetness')?1.55:2;
    }
    // Atmosphere and foliage changes are Vibe presentation only. The existing biome
    // classifier, collision, damage, spawn and player movement remain authoritative.
    let tileIndex=0;
    const centerTileX=Math.round(centerX/10),centerTileY=Math.round(centerY/10);
    for(let tz=-3;tz<=3;tz++)for(let tx=-3;tx<=3;tx++){

      const gx=(centerTileX+tx)*10,gz=(centerTileY+tz)*10;
      // The original floor_base geometry is in world XZ and already has depth.
      // Biome conditions are expressed through existing game light/fog; do not
      // generate palette-filled 2D floor planes or replacement materials.
      tile.position.set(gx,.015,gz);tile.updateMatrix();
      biomeTiles.setMatrixAt(tileIndex++,tile.matrix);
    }
    biomeTiles.instanceMatrix.needsUpdate=true;
    interactables.length=0;
    const seen=state.last||Date.now();
    if(hero){
      hero.avatar.visible=true;
      hero.avatar.position.set(centerX,0,centerY);
      hero.avatar.rotation.y=Math.atan2(Number(p.faceX)||0,Number(p.faceY)||1);
      const tool=String(p.tool||p.weapon||'NONE');
      if(tool!==playerToolName){
        playerToolName=tool;
        const family=/axe/i.test(tool)?'AXE':/pick/i.test(tool)?'PICKAXE':/spear/i.test(tool)?'SPEAR':'NONE';
        playerMotionProfile=createSurvivalPlayerMotionProfile({platform:'WEB',tool:family});
      }
      const now=performance.now();
      const moving=(state.keys?.size||0)>0||Math.hypot(Number(state.stick?.x)||0,Number(state.stick?.y)||0)>.16;
      const pose=now-(Number(p.attackAt)||0)<330?'attack':moving?'move':'idle';
      // 액션 모션: 이름 일부가 우연히 겹치는 첫 클립 대신 CC0 원본 역할을 정확히 선택한다.
      const clipName=playerMotionProfile.cc0Clips[pose==='move'?'run':pose];
      const desired=heroClips.find(clip=>clip.name===clipName);
      const nextName=desired?.name||'';
      const attackAt=Number(p.attackAt)||0;
      if(heroMixer&&(nextName!==heroActionName||(pose==='attack'&&attackAt!==lastHeroAttackAt))){
        if(heroAction)heroAction.fadeOut(.15);
        heroAction=desired?heroMixer.clipAction(desired):null;
        if(heroAction){
          heroAction.reset().setLoop(pose==='attack'?THREE.LoopOnce:THREE.LoopRepeat,pose==='attack'?1:Infinity);
          heroAction.clampWhenFinished=pose==='attack';
          heroAction.setEffectiveTimeScale(1);
          if(pose==='attack')heroAction.setDuration(.33);
          heroAction.fadeIn(.15).play();
        }
        heroActionName=nextName;
        if(pose==='attack')lastHeroAttackAt=attackAt;
      }
      if(heroMixer){heroMixer.update(Math.min(.05,Math.max(0,(now-lastHeroFrame)/1000)));lastHeroFrame=now}
    }
    synchronizeUndead(state,px,py,seen);
    const unsafeUnmappedEncounter=synchronizeNativeCreatures(state,px,py,seen);
    resources(state.trees,'tree',px,py,seen,1.28);
    resources(state.swampTrees,'tree_large',px,py,seen,1.65);
    resources(state.rocks,'cobblestones',px,py,seen,1.05);
    resources(state.fibers,'foliage_A',px,py,seen,1.2);
    // Exact category match: original Tiny Treats benches for actual player-owned
    // crafting workstations, positioned at their existing authoritative coordinates.
    for(const [key,workbench,modelName] of [
      ['bench',state.bench,'bench_A'],
      ['ironBench',state.ironBench,'bench_B'],
      ['goldBench',state.goldBench,'bench_B'],
      ['jungleBench',state.jungleBench,'bench_A']
    ]){
      if(workbench&&Math.hypot(workbench.x-px,workbench.y-py)<1000)
        addVisibleEntity(key,modelName,workbench.x,workbench.y,1.7,seen);
    }
    for(const [i,wall] of (state.walls||[]).entries()){
      if(Math.hypot(wall.x-px,wall.y-py)<1000)
        addVisibleEntity('wall:'+(wall.id||i),'fence_straight',wall.x,wall.y,1.2,seen,wall.vertical?Math.PI/2:0);
    }
    // House construction: reuse existing saved door and chest world coordinates.
    // The downloaded CC0 gate and parcel are only species-level visual candidates, not finished QA.
    for(const [i,door] of (state.doors||[]).entries()){
      if(Math.hypot(door.x-px,door.y-py)<1000)
        addVisibleEntity('door:'+(door.id||i),'gate_single',door.x,door.y,1.2,seen,
          (door.vertical?Math.PI/2:0)+(door.open?Math.PI/2:0));
    }
    for(const [i,chest] of (state.chests||[]).entries()){
      if(Math.hypot(chest.x-px,chest.y-py)<1000)
        addVisibleEntity('chest:'+(chest.id||i),'package',chest.x,chest.y,1.05,seen);
    }
    // Reuse existing world entities. No synthetic monsters or substitute species.
    for(const [key,row] of entities)if(row.seen!==seen){scene.remove(row.model);entities.delete(key)}
    if(unsafeUnmappedEncounter||!hero){
      canvas.hidden=true;active=false;
      fallbackReason=unsafeUnmappedEncounter?'unmapped-threat':'player-model-unavailable';
      return;
    }
    renderer.render(scene,camera);
    active=true;canvas.hidden=false;fallbackReason='';
  }
  function pick(clientX,clientY){
    if(!active||canvas.hidden||disposed)return null;
    const normalized=new THREE.Vector2(clientX/Math.max(1,lastW)*2-1,-(clientY/Math.max(1,lastH))*2+1);
    raycaster.setFromCamera(normalized,camera);
    const hits=raycaster.intersectObjects(interactables,false);
    if(hits.length){
      const hit=hits[0],point=hit.object.userData.worldPoints?.[hit.instanceId]||hit.object.userData.worldPoint;
      if(point)return {...point};
    }
    const point=new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane,point)?{x:point.x/SCALE,y:point.z/SCALE}:null;
  }
  function dispose(){
    disposed=true;heroLoadVersion++;active=false;canvas.hidden=true;
    if(hero){heroMixer?.stopAllAction();scene.remove(hero.avatar);
      hero.model.traverse(object=>{if(object.isMesh){object.geometry?.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];for(const mat of mats)mat?.dispose()}})}
    for(const actor of undeadActors.values()){actor.mixer?.stopAllAction();scene.remove(actor.anchor)}
    undeadActors.clear();
    for(const actor of nativeCreatureActors.values()){actor.mixer?.stopAllAction();scene.remove(actor.anchor)}
    nativeCreatureActors.clear();
    renderer.dispose();
    for(const row of entities.values())scene.remove(row.model);
    entities.clear();
    for(const model of models.values()){model.geometry.dispose();model.material.dispose()}
    for(const source of nativeCreatureSources.values())source.model.traverse(o=>{
      if(!o.isMesh)return;
      o.geometry?.dispose();
      for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();
    });
    scene.remove(biomeTiles);biomeTiles.dispose();
    for(const {mesh} of resourceBatches.values()){scene.remove(mesh);mesh.dispose()}
    resourceBatches.clear();
    // Source floor geometry/material are disposed once by the source model pool.
  }
  return {
    frame,pick,dispose,setAvatarAppearance,getAvatarAppearance:()=>({...selectedAppearance}),isActive:()=>active&&!disposed&&!canvas.hidden,
    kind:'NATIVE_WEBGL_GAME_RENDERER',
    get playerSource(){return hero?.avatar.userData.source||''},get creatureSources(){return [...nativeCreatureSources.keys()]},
    modelCount:models.size,get playerAssetLoaded(){return !!hero},get playerMotionClipCount(){return heroClips.length},
    get undeadProxySourceLoaded(){return !!undeadSource},get undeadProxyMotionClipCount(){return undeadClips.length},
    getBiome:()=>currentBiome,getWorldProfile:()=>gameStyleRegion,
    getWeatherEffects:()=>weatherVisualEffects,getAvatarRecipe:()=>avatarRecipe,
    getMissingAssetTypes:()=>assetReadiness.missingTypes,
    getUnmappedVisibleMonsterIds:()=>[...missingVisibleMonsterIds],
    getAdaptiveQuality:()=>qualityFactor,getFallbackReason:()=>fallbackReason,
    getRenderStats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      nativeCreatures:nativeCreatureActors.size,undeadCreatures:undeadActors.size,
      resourceBatches:resourceBatches.size,loadingModels:loadingCreatureCount,loadedModels:nativeCreatureSources.size,
      measuredFps,pixelRatio:renderer.getPixelRatio()}),
    productionReady:false
  };
}
