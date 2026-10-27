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
  'monster-41.obj':['golem','firegolemneutral','firegolemaggressive','crystalfiregolem','icegolem','swampgolem','crystalguardian','jungleGuardian'],
  'tree.fbx':['worldtreegolem','swampArrowTower'],
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
  'caterpillar.glb':['giantburrower','crystallizard'], 'monster-31.obj':['sandwalker','mudwalker'],
  'monster-26.obj':['firesnake','crystalfiresnake','anaconda','worldtreesnake','lakecroc','crystalbiter'],
  'bat.fbx':['vampirebat'], 'cow.glb':['lakebuffalo'],
  'monster-49.obj':['lakeheron'], 'fish.glb':['lakefish','shark'],
  'monster-47.obj':['giantSquid'], 'monster-21.obj':['giantleech'],
  'monster-17.obj':['deepAngler'], 'monkey.glb':['gorilla'],
  'tiger.glb':['jungletiger','jungletigerleader'],
  'yeti.fbx':['yetileader','yeticub','froststalker'], 'cat.glb':['polarfox'],
  'bee.fbx':['giantbee'], 'monster-15.obj':['thornmantis'],
  'monster-53.obj':['giantspider','giantspiderling','giantVenomScorpion'],
  // 원시인: 기존 CC0 인간형 3D 리그를 공유한다. 전투/능력은 변경하지 않는다.
  'barbarian.glb':['primitiveSpearman','primitiveArcher','swampPrimitiveSpearman','swampPrimitiveArcher','swampPrimitiveGuard']
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
  // 첫 화면은 바닥 메시만 파싱하고, 나머지 CC0 에셋은 첫 프레임 뒤 순차 로딩한다.
  const required=new Set(['floor_base']);
  const fetchSourceModel=async name=>{
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
  };
  const models=new Map(await Promise.all(MODEL_NAMES.filter(name=>required.has(name)).map(fetchSourceModel)));
  return {models,loadRemaining:async(priorityNames=[])=>{
    // 플레이 중인 지역의 원본 출입구·상자 모델부터 먼저 준비한다.
    for(const name of [...new Set([...priorityNames.filter(name=>MODEL_NAMES.includes(name)),...MODEL_NAMES])]){
      if(required.has(name))continue;
      await new Promise(resolve=>setTimeout(resolve,0));
      const [key,model]=await fetchSourceModel(name);
      models.set(key,model);
    }
  }};
}

export async function createWorld3d(canvas, initialAppearance={model:'knight',size:100},initialState=null){
  // 로딩: 기존 공용 서비스 워커를 등록해 방문한 3D 지형물을 휴대폰에 재사용한다.
  // 등록 실패/저장 공간 부족은 게임 시작이나 기존 저장 데이터에 영향을 주지 않는다.
  if(typeof navigator!=='undefined'&&'serviceWorker' in navigator&&location.protocol==='https:'){
    void navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url),{updateViaCache:'none'}).then(()=>{
      const warmFirstRegion=()=>{
        if(!navigator.serviceWorker.controller||navigator.connection?.saveData)return;
        setTimeout(()=>{
          if(disposed)return;
          for(const name of ['models.json.gz','knight.glb.gz']){
            void fetch(new URL('./'+name,import.meta.url),{cache:'force-cache'}).catch(()=>{});
          }
        },1500);
      };
      if(navigator.serviceWorker.controller)warmFirstRegion();
      else navigator.serviceWorker.addEventListener('controllerchange',warmFirstRegion,{once:true});
    }).catch(()=>{});
    if(navigator.storage?.persist){
      window.addEventListener('pointerdown',()=>{void navigator.storage.persist().catch(()=>false)},{once:true,passive:true});
    }
  }
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
  // 같은 원본 모델을 쓰는 여러 종도 게임에 이미 정의된 색상으로 구분한다.
  // 종별 재질을 공유해 개체마다 GPU 재질을 반복 생성하지 않는다.
  const nativeSpeciesMaterials=new Map();
  let loadingCreatureCount=0,nextCreatureScan=0;
  async function loadCreatureSource(file){
    if(disposed||nativeCreatureSources.has(file)||creatureRequests.has(file))return;
    creatureRequests.set(file,true);loadingCreatureCount++;
    try{
      const url=file==='skeleton-warrior.glb'?UNDEAD_URL:
        file==='barbarian.glb'?new URL('../../assets/roblox/actors/native/barbarian.glb',import.meta.url):new URL(file,CREATURE_SOURCE);
      let model,clips=[];
      if(file.endsWith('.fbx')){
        // 기존 FBX 원본이 모바일 네트워크 로더에서 실패하면 동일한 바이트를 직접 파싱한다.
        try{model=await new FBXLoader().setResourcePath(CREATURE_SOURCE.href).loadAsync(url.href)}
        catch(loaderError){
          const response=await fetch(url,{cache:'force-cache'});
          if(!response.ok)throw loaderError;
          model=new FBXLoader().setResourcePath(CREATURE_SOURCE.href)
            .parse(await response.arrayBuffer(),CREATURE_SOURCE.href);
        }
        clips=model.animations||[];
      }else if(file.endsWith('.glb')){
        let gltf;
        if(file==='barbarian.glb'&&typeof DecompressionStream==='function'){
          // 기존 압축 리그를 전송해 모바일 네트워크의 초기 부하를 줄인다.
          const packed=await fetch(new URL('./barbarian.glb.gz',import.meta.url),{cache:'force-cache'});
          if(!packed.ok)throw new Error('Original CC0 barbarian model unavailable: '+packed.status);
          const bytes=await new Response(packed.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
          gltf=await new GLTFLoader().parseAsync(bytes,new URL('.',url).href);
        }else gltf=await new GLTFLoader().loadAsync(url.href);
        model=gltf.scene;clips=gltf.animations||[];
      }else{
        // 원본 OBJ 지오메트리는 PNG 실패와 무관하게 먼저 표시한다.
        model=await new OBJLoader().loadAsync(url.href);
        const material=new THREE.MeshStandardMaterial({roughness:.94});
        model.traverse(child=>{if(child.isMesh)child.material=material});
        void new THREE.TextureLoader().loadAsync(new URL(file.replace('.obj','.png'),CREATURE_SOURCE).href)
          .then(texture=>{
            if(disposed){texture.dispose();return}
            texture.colorSpace=THREE.SRGBColorSpace;
            texture.magFilter=THREE.NearestFilter;
            material.map=texture;material.needsUpdate=true;
          }).catch(textureError=>{
            if(!creatureFailures.has(file))console.warn('CC0 creature texture unavailable: '+file,textureError);
          });
      }
      const box=new THREE.Box3().setFromObject(model);
      if(box.isEmpty())throw new Error('Missing downloaded creature mesh');
      model.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true}});
      if(disposed){
        model.traverse(child=>{if(child.isMesh){child.geometry?.dispose();for(const m of (Array.isArray(child.material)?child.material:[child.material])){m?.map?.dispose();m?.dispose()}}});
        return;
      }
      nativeCreatureSources.set(file,{model,clips,height:Math.max(.1,box.max.y-box.min.y),floor:box.min.y});
      creatureFailures.delete(file);
      if(file==='skeleton-warrior.glb'){
        undeadSource=model;undeadClips=clips;undeadModelHeight=Math.max(.1,box.max.y-box.min.y);
      }
    }catch(error){
      const previous=creatureFailures.get(file);
      // 간헐적인 모바일 네트워크/디코딩 실패는 영구 차단하지 않는다.
      // 재시도 간격은 5초부터 최대 60초로 제한하고 경고 로그는 한 번만 남긴다.
      creatureFailures.set(file,{at:performance.now(),attempts:(previous?.attempts||0)+1,
        message:String(error?.message||error).slice(0,180)});
      if(!previous)console.warn('CC0 original 3D monster unavailable: '+file,error);
    }finally{loadingCreatureCount--;creatureRequests.delete(file)}
  }
  // 기존 지역과 적 상태를 건드리지 않고 실패한 종만 다시 로딩한다.
  function retryMissingCreatures(state){
    if(disposed||!state||!missingVisibleMonsterIds.size)return false;
    let retried=false;
    for(const enemy of state.enemies||[]){
      if(!enemy||enemy.hp<=0||enemy.area!==state.area)continue;
      const file=enemy.type?.id==='wastelandMummy'?'skeleton-warrior.glb':NATIVE_CREATURE_BY_ID.get(enemy.type?.id);
      if(file&&creatureFailures.has(file)){creatureFailures.delete(file);retried=true}
    }
    if(retried)nextCreatureScan=0;
    return retried;
  }
  const initialFiles=new Map();
  for(const e of initialState?.enemies||[]){
    const distance=Math.hypot(e.x-initialState.player.x,e.y-initialState.player.y);
    if(e.hp<=0||e.area!==initialState.area||distance>1200)continue;
    const file=e.type?.id==='wastelandMummy'?'skeleton-warrior.glb':NATIVE_CREATURE_BY_ID.get(e.type?.id);
    if(file)initialFiles.set(file,Math.min(initialFiles.get(file)??Infinity,distance));
  }
  const creaturesPromise=(async()=>{
    const ordered=[...initialFiles].sort((a,b)=>a[1]-b[1]).map(([file])=>file),limit=mobileBudget?6:10;
    for(let i=0;i<ordered.length;i+=limit)await Promise.all(ordered.slice(i,i+limit).map(loadCreatureSource));
  })();
  let models,stagedModels,extraModelsStarted=false;
  // 모델이 모두 끝날 때까지 월드 시작을 묶어 두지 않는다.
  // 몹은 가까운 종부터 비동기로 로드하고, 미표시 전투는 기존 안전 게이트가 멈춘다.
  try{[stagedModels]=await Promise.all([modelsPromise,heroPromise]);models=stagedModels.models}
  catch(error){
    disposed=true;heroLoadVersion++;
    for(const source of nativeCreatureSources.values())source.model.traverse(child=>{
      if(child.isMesh){child.geometry?.dispose();for(const m of (Array.isArray(child.material)?child.material:[child.material])){m?.map?.dispose();m?.dispose()}}
    });
    nativeCreatureSources.clear();
    hero?.model.traverse(child=>{if(child.isMesh){child.geometry?.dispose();for(const m of (Array.isArray(child.material)?child.material:[child.material])){m?.map?.dispose();m?.dispose()}}});
    throw error;
  }
  canvas.style.imageRendering='pixelated';
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'default'});
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  // 모바일 저사양 그래픽: 기존 3D 모델·충돌·몬스터는 유지하고 화면 렌더링 해상도만 낮춘다.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobileBudget?.82:.95)*(mobileBudget?.82:1));
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
    // 기존 regionAt()의 좌표/경계만 따라간다. 색·안개·장식 대비를 높여 지역별 가독성을 개선한다.
    forest:{floor:0x38633b,sky:0x1a3d2c},jungle:{floor:0x17613a,sky:0x102c22},
    swamp:{floor:0x47492a,sky:0x27342a},snow:{floor:0xdcecf0,sky:0xa5c7de},
    canyon:{floor:0xa36c48,sky:0x68503e},volcano:{floor:0x6f342d,sky:0x382128},
    crystal:{floor:0x7054a4,sky:0x342955},giantlake:{floor:0x397b8a,sky:0x244f67},
    worldtree:{floor:0x2b7842,sky:0x173e2e},flowerfield:{floor:0x879b42,sky:0x506a45},
    giantgarden:{floor:0x8a588b,sky:0x503857},desert:{floor:0xc99d5a,sky:0x94744b},
    underwater:{floor:0x146381,sky:0x185569},'underwater-dungeon':{floor:0x214d60,sky:0x0b2b38},
    water:{floor:0x127faf,sky:0x366677},lava:{floor:0xcf4229,sky:0x392f35}
  });
  // 바닥: 원본 CC0 모델의 실제 크기(10 x 8)로 놓고 둥근 모서리의 틈을 같은 메시로 연결한다.
  sourceFloor.geometry.computeBoundingBox();
  const floorBounds=sourceFloor.geometry.boundingBox;
  const floorPitchX=floorBounds.max.x-floorBounds.min.x;
  const floorPitchZ=floorBounds.max.z-floorBounds.min.z;
  if(!(floorPitchX>0&&floorPitchZ>0))throw new Error('Original CC0 floor dimensions invalid');
  const floorCenterX=(floorBounds.min.x+floorBounds.max.x)/2;
  const floorCenterZ=(floorBounds.min.z+floorBounds.max.z)/2;
  const floorSurfaceY=.015-floorBounds.max.y;
  const biomeTiles=new THREE.InstancedMesh(sourceFloor.geometry,sourceFloor.material,49);
  biomeTiles.receiveShadow=true;biomeTiles.frustumCulled=false;scene.add(biomeTiles);
  const floorSeamTiles=new THREE.InstancedMesh(sourceFloor.geometry,sourceFloor.material,36);
  floorSeamTiles.receiveShadow=true;floorSeamTiles.frustumCulled=false;scene.add(floorSeamTiles);
  const tile=new THREE.Object3D(),resourceTransform=new THREE.Object3D();

  const floorTint=new THREE.Color(),floorNeutral=new THREE.Color(0xffffff);
  // 배경: 기존 CC0 바닥, 지역 좌표 및 충돌은 보존하고 픽셀 디테일만 겹친다.
  const PIXEL_TERRAIN=Object.freeze({
    forest:['#79a65a','#294c36','#a2bd73'],jungle:['#327d49','#174a33','#8eae50'],
    swamp:['#75814b','#303d31','#8c6947'],snow:['#ffffff','#9ac6d7','#d3e6ee'],
    canyon:['#cf9268','#78513f','#b4a083'],volcano:['#de7341','#381f24','#a83e31'],
    crystal:['#c7a0fa','#564179','#86cfe1'],giantlake:['#79bfd1','#245a76','#b0e6d2'],
    worldtree:['#91b96a','#214d32','#58a981'],flowerfield:['#d7c37b','#c57aa4','#f0a9bb'],
    giantgarden:['#ddabd4','#6b4b86','#99b87f'],desert:['#f3d69b','#aa8655','#dfae68'],
    underwater:['#5bafb8','#1b5369','#97cdda'],'underwater-dungeon':['#518292','#163847','#6aa3a0'],
    water:['#8dcee5','#246586','#d9f5f5'],lava:['#ffc074','#ad4429','#e46e30']
  });
  // [지형] 기존 CC0 원본 바닥의 삼각형을 사용하여 임시 평면 메시를 없앤다.
  const detailGeometry=sourceFloor.geometry.clone();
  const detailPositions=detailGeometry.getAttribute('position');
  const detailUvs=new Float32Array(detailPositions.count*2);
  for(let i=0;i<detailPositions.count;i++){
    detailUvs[2*i]=(detailPositions.getX(i)-floorBounds.min.x)/floorPitchX;
    detailUvs[2*i+1]=1-(detailPositions.getZ(i)-floorBounds.min.z)/floorPitchZ;
  }
  detailGeometry.setAttribute('uv',new THREE.BufferAttribute(detailUvs,2));
  const detailTransform=new THREE.Object3D(),terrainDetailBatches=new Map();
  function terrainPixelBatch(zone){
    let row=terrainDetailBatches.get(zone);
    if(row)return row;
    const palette=PIXEL_TERRAIN[zone]||PIXEL_TERRAIN.forest;
    const art=document.createElement('canvas');art.width=16;art.height=16;
    const brush=art.getContext('2d',{alpha:true});
    let seed=0;for(const ch of zone)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
    for(let i=0;i<36;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const x=(seed>>>8)&15,y=(seed>>>16)&15;
      brush.globalAlpha=.32+((seed>>>26)&3)*.12;
      brush.fillStyle=palette[i%palette.length];
      const water=zone==='water'||zone==='giantlake'||zone.startsWith('underwater');
      const snow=zone==='snow',stone=['canyon','volcano','crystal','underwater-dungeon'].includes(zone);
      brush.fillRect(x,y,water?3:stone?2:1,snow?1:(i%5===0?2:1));
      if(!water&&!snow&&i%9===0)brush.fillRect(Math.max(0,x-1),Math.max(0,y-1),2,2);
    }
    brush.globalAlpha=1;
    const texture=new THREE.CanvasTexture(art);
    texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
    texture.generateMipmaps=false;texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,
      depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
    const mesh=new THREE.InstancedMesh(detailGeometry,material,49);
    mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
    row={mesh,material,texture};terrainDetailBatches.set(zone,row);
    return row;
  }
  let lastFloorGridX=null,lastFloorGridZ=null,lastFloorClassifier=null,lastFloorArea=null;
  const resourceBatches=new Map();
  // 마법탄은 실제 게임의 투사체 좌표만 보여주는 저폴리곤 3D 효과다. 피해·적중 판정은 게임 코드 소유.
  const mageBoltGeometry=new THREE.OctahedronGeometry(.18,0);
  const mageBoltMaterial=new THREE.MeshBasicMaterial({color:0xb5eaff,transparent:true,opacity:.95,depthWrite:false});
  const arrowGeometry=new THREE.ConeGeometry(.065,.42,5);
  const arrowMaterial=new THREE.MeshBasicMaterial({color:0xe5d5a8});
  const sporeMaterial=new THREE.MeshBasicMaterial({color:0xc291df,depthWrite:false});
  const sunOrbMaterial=new THREE.MeshBasicMaterial({color:0xffdf83,depthWrite:false});
  const mageBoltEffects=[],projectileDirection=new THREE.Vector3(),projectileUp=new THREE.Vector3(0,1,0);
  // CC0 원본 메시만 재사용해 모든 지역의 입체 배경을 그린다. 이 장식은 채집·충돌 대상이 아니다.
  const SCENERY_KIND=Object.freeze({
    forest:['tree','foliage_A'],jungle:['tree_large','foliage_B'],swamp:['foliage_A','tree'],
    snow:['tree_large','cobblestones'],canyon:['cobblestones','foliage_A'],
    volcano:['cobblestones','fence_straight'],crystal:['cobblestones','foliage_B'],
    giantlake:['foliage_A','foliage_B'],worldtree:['tree_large','foliage_B'],
    flowerfield:['foliage_A','foliage_B'],giantgarden:['foliage_B','tree'],
    desert:['cobblestones','foliage_A'],
    underwater:['foliage_B','cobblestones'],'underwater-dungeon':['cobblestones','fence_straight']
  });
  // 미로딩 원본에 접근하지 않고 실제 메시가 들어올 때만 3D 장식 인스턴스를 만든다.
  const sceneryBatches=new Map();
  // 실내·신전·동굴의 실제 크기와 연구소 미로 벽을 원본 CC0 3D 메시로 시각화한다.
  const interiorWalls=new Map(),wallTransform=new THREE.Object3D();
  function updateInteriorWalls(regionScene,state,px,py){
    for(const row of interiorWalls.values())row.mesh.count=0;
    if(!regionScene?.bounds)return;
    const room=regionScene.bounds,source=models.get(room.model||'cobblestones');
    if(!source)return;
    const kind=room.model||'cobblestones';
    let row=interiorWalls.get(kind);
    if(!row){
      const mesh=new THREE.InstancedMesh(source.geometry,source.material,128);
      mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;
      scene.add(mesh);row={mesh};interiorWalls.set(kind,row)
    }
    let count=0;
    const stamp=(x,y,angle=0)=>{
      if(count>=128||Math.hypot(x-px,y-py)>1000)return;
      wallTransform.position.set(x*SCALE,0,y*SCALE);
      wallTransform.rotation.y=angle;wallTransform.scale.setScalar(1.5);
      wallTransform.updateMatrix();row.mesh.setMatrixAt(count++,wallTransform.matrix)
    };
    const left=room.x,right=room.x+room.w,top=room.y,bottom=room.y+room.h,step=170;
    for(let x=left;x<=right;x+=step){stamp(x,top);stamp(x,bottom)}
    for(let y=top+step;y<bottom;y+=step){stamp(left,y,Math.PI/2);stamp(right,y,Math.PI/2)}
    for(const b of regionScene.barriers||[]){
      if(b.untilBoss&&state.story?.labBossDefeated)continue;
      const vertical=b.h>b.w,length=vertical?b.h:b.w;
      for(let d=0;d<=length;d+=step)stamp(vertical?b.x+b.w/2:b.x+d,vertical?b.y+d:b.y+b.h/2,vertical?Math.PI/2:0)
    }
    row.mesh.count=count;row.mesh.instanceMatrix.needsUpdate=true;row.mesh.boundingSphere=null
  }
  let lastSceneryModelCount=-1;
  let frameSequence=0;
  let currentBiome='forest';
  let lastHeroPoseX=null,lastHeroPoseY=null,lastHeroPoseAt=0;
  const raycaster=new THREE.Raycaster();
  const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const entities=new Map();
  const interactables=[];
  const undeadActors=new Map();
  const nativeCreatureActors=new Map();
  // 메인 · 3D 도감 이름표: 등록한 종에만 기존 몬스터 머리 위 이름을 표시한다.
  const nameTextures=new Map();
  function syncBestiaryName(actor,e,state,height){
    if(!state.bestiary?.[e.type?.id]||actor.nameLabel)return;
    let texture=nameTextures.get(e.type.id);
    if(!texture){
      const surface=document.createElement('canvas');surface.width=512;surface.height=80;
      const pen=surface.getContext('2d');
      pen.fillStyle='rgba(8,24,16,.84)';pen.fillRect(5,4,502,72);
      pen.strokeStyle='#a7ddb4';pen.lineWidth=3;pen.strokeRect(5,4,502,72);
      pen.fillStyle='#f5fff7';pen.font='bold 34px sans-serif';pen.textAlign='center';pen.textBaseline='middle';
      pen.fillText(e.type.name,256,40,475);
      texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;
      nameTextures.set(e.type.id,texture);
    }
    const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
    const label=new THREE.Sprite(material);
    label.scale.set(Math.min(4.8,Math.max(2.2,e.type.name.length*.38)),.65,1);
    label.position.y=height+.55;label.renderOrder=30;
    actor.anchor.add(label);actor.nameLabel=label;
  }
  // 메인 · 기존 건축 청사진을 3D 월드 위에서 직접 미리 보여준다.
  const blueprintMaterial=new THREE.MeshBasicMaterial({color:0x80f5a3,transparent:true,opacity:.48,depthWrite:false});
  // [건축] 청사진은 허가된 원본 모델만 표시하고 임시 상자를 만들지 않는다.
  const blueprintGhost=new THREE.Group();
  let blueprintSourceId='',blueprintVisual=null;
  blueprintGhost.visible=false;blueprintGhost.renderOrder=12;scene.add(blueprintGhost);
  // 메인: 기존 CC0 석재 메시를 공유하여 산성 구슬을 GPU 한 번의 배치로 렌더링한다.
  let acidBatch=null,acidBatchCapacity=0;
  const acidTransform=new THREE.Object3D();
  const acidMaterial=new THREE.MeshStandardMaterial({color:0x9cff6c,emissive:0x5ce22d,emissiveIntensity:1.25});
  function updateBiterAcidMeshes(state){
    const source=models.get('cobblestones');
    if(!source){if(acidBatch)acidBatch.count=0;return}
    const active=(state.projectiles||[]).filter(q=>q.kind==='biterAcid'&&q.area===state.area);
    if(active.length>acidBatchCapacity){
      if(acidBatch)scene.remove(acidBatch);
      acidBatchCapacity=Math.max(16,2**Math.ceil(Math.log2(active.length)));
      acidBatch=new THREE.InstancedMesh(source.geometry,acidMaterial,acidBatchCapacity);
      acidBatch.frustumCulled=false;scene.add(acidBatch);
    }
    if(!acidBatch)return;
    const scale=.19/Math.max(.001,source.geometry.boundingSphere?.radius||1);
    for(let i=0;i<active.length;i++){
      const q=active[i];
      acidTransform.position.set(q.x*SCALE,.65,q.y*SCALE);
      acidTransform.scale.setScalar(scale);acidTransform.updateMatrix();
      acidBatch.setMatrixAt(i,acidTransform.matrix);
    }
    acidBatch.count=active.length;acidBatch.instanceMatrix.needsUpdate=true;
  }
  const cameraFrustum=new THREE.Frustum(),cameraProjection=new THREE.Matrix4();
  const creatureBounds=new THREE.Sphere(new THREE.Vector3(),4);
  const missingVisibleMonsterIds=new Set();
  let fallbackReason='';
  let qualityFactor=mobileBudget?.82:1,framesInWindow=0,fpsWindowStart=0,stableQualityWindows=0,measuredFps=0;
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

      const poseNow=performance.now(),poseElapsed=Math.min(80,Math.max(1,poseNow-(actor.lastPoseAt||poseNow-16)));
      const moveDelta=Math.hypot(e.x-(actor.lastX??e.x),e.y-(actor.lastY??e.y));
      const destX=e.x*SCALE,destZ=e.y*SCALE,turnTo=Math.atan2(Number(e.faceX)||0,Number(e.faceY)||1);
      if(!actor.lastPoseAt||Math.hypot(destX-actor.anchor.position.x,destZ-actor.anchor.position.z)>2.6){
        actor.anchor.position.set(destX,0,destZ);actor.anchor.rotation.y=turnTo;
      }else{
        const glide=1-Math.exp(-poseElapsed*.019),turnEase=1-Math.exp(-poseElapsed*.012);
        actor.anchor.position.x+=(destX-actor.anchor.position.x)*glide;
        actor.anchor.position.z+=(destZ-actor.anchor.position.z)*glide;
        actor.anchor.rotation.y+=Math.atan2(Math.sin(turnTo-actor.anchor.rotation.y),Math.cos(turnTo-actor.anchor.rotation.y))*turnEase;
      }
      actor.anchor.userData.worldPoint={x:e.x,y:e.y};
      syncBestiaryName(actor,e,state,2.35);
      // The game owns the tap-target/attack decision. Native skinned surfaces only
      // provide the correct original world coordinates to its existing handler.
      actor.model.traverse(child=>{
        if(!child.isMesh)return;
        child.userData.worldPoint={x:e.x,y:e.y,monsterId:e.netId};
        interactables.push(child);
      });
      // 이동/공격 상태를 실제 좌표와 공격 시각으로 검출한다. 제자리 문워크와 반복 공격 무동작 방지.

      const moving=moveDelta>.14&&poseElapsed>0&&poseElapsed<420;
      const attacking=poseNow-(Number(e.attackAt)||0)<430;
      actor.lastX=e.x;actor.lastY=e.y;actor.lastPoseAt=poseNow;
      actor.anchor.position.y=moving?.014*Math.sin(poseNow/95):.005*Math.sin(poseNow/360);
      const lean=attacking?-.11:poseNow<(Number(e.hitAt)||0)?.09:0;
      actor.anchor.rotation.x+=(lean-actor.anchor.rotation.x)*Math.min(1,poseElapsed/65);
      const intents=attacking?['attack','swing']:moving?['walk','run']:['idle','stand'];
      const clip=undeadClips.find(c=>intents.some(word=>c.name.toLowerCase().includes(word)))
        ||undeadClips.find(c=>/idle|walk/i.test(c.name))||null;
      if(actor.mixer&&clip&&(clip.name!==actor.clipName||attacking&&actor.lastAttackStamp!==e.attackAt)){
        actor.action?.fadeOut(.09);
        actor.action=actor.mixer.clipAction(clip).reset();
        actor.action.setLoop(attacking?THREE.LoopOnce:THREE.LoopRepeat,attacking?1:Infinity);
        actor.action.clampWhenFinished=attacking;
        actor.action.fadeIn(.09).play();actor.clipName=clip.name;
        if(attacking)actor.lastAttackStamp=e.attackAt;
      }
      if(actor.action)actor.action.setEffectiveTimeScale(attacking?1.35:moving?1.25:1);
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
      scene.remove(actor.anchor);actor.nameLabel?.material.dispose();
      undeadActors.delete(key);
    }
  }
  // The native rigs follow the *existing* monster coordinates, direction and actions.
  // No new spawn/damage/loot logic is allowed in the rendering layer.
  function synchronizeNativeCreatures(state,px,py,stamp){
    // 모바일 화질 축소는 해상도와 그림자만 조절하고, 시야 안의 몹은 제거하지 않는다.
    missingVisibleMonsterIds.clear();
    let unsafeUnmappedEncounter=false;
    for(const e of state.enemies||[]){
      if(!e||e.hp<=0||e.area!==state.area)continue;
      // 성능: 화면 밖 개체만 제외한다. 화면 안 개체 수로 2D 복귀를 결정하지 않는다.
      creatureBounds.center.set(e.x*SCALE,2,e.y*SCALE);
      if(!cameraFrustum.intersectsSphere(creatureBounds))continue;
      const kind=NATIVE_CREATURE_BY_ID.get(e.type?.id);
      if(!kind||!nativeCreatureSources.has(kind)){
        if(e.type?.id!=='wastelandMummy'||!undeadSource){
          missingVisibleMonsterIds.add(e.type?.id||'unknown');
          // 화면 안의 모든 적이 원본 3D 모델로 표시된 뒤 게임을 시작한다.
          // 근거리만 차단하면 보이는 원거리 적이 투명해진 채 게임이 진행된다.
          // 기존 근접 종 로딩 우선순위와 전투/드롭/저장은 그대로 보존한다.
          unsafeUnmappedEncounter=true;
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
        // 동일 CC0 원본을 재사용하되 기존 몹 정의 색상만 약하게 반영한다.
        // 지오메트리·리그·텍스처와 게임의 HP/공격/드롭/저장값은 그대로 둔다.
        const speciesId=e.type.id;
        let materials=nativeSpeciesMaterials.get(speciesId);
        if(!materials){materials=new Map();nativeSpeciesMaterials.set(speciesId,materials)}
        const tint=new THREE.Color(e.type.color||'#ffffff');
        model.traverse(child=>{
          if(!child.isMesh||!child.material)return;
          const tintMaterial=original=>{
            if(!original)return original;
            let material=materials.get(original.uuid);
            if(!material){
              material=original.clone();
              if(material.color)material.color.lerp(tint,.22);
              materials.set(original.uuid,material);
            }
            return material;
          };
          child.material=Array.isArray(child.material)
            ?child.material.map(tintMaterial):tintMaterial(child.material);
        });
        model.scale.setScalar(scale);
        model.position.y=-source.floor*scale;
        const anchor=new THREE.Group();anchor.add(model);scene.add(anchor);
        const mixer=source.clips.length?new THREE.AnimationMixer(model):null;
        actor={anchor,model,mixer,clips:source.clips,clipName:'',action:null,
          lastFrame:performance.now(),seen:0};
        nativeCreatureActors.set(key,actor);
      }

      const poseNow=performance.now(),poseElapsed=Math.min(80,Math.max(1,poseNow-(actor.lastPoseAt||poseNow-16)));
      const moveDelta=Math.hypot(e.x-(actor.lastX??e.x),e.y-(actor.lastY??e.y));
      const destX=e.x*SCALE,destZ=e.y*SCALE,turnTo=Math.atan2(Number(e.faceX)||0,Number(e.faceY)||1);
      if(!actor.lastPoseAt||Math.hypot(destX-actor.anchor.position.x,destZ-actor.anchor.position.z)>2.6){
        actor.anchor.position.set(destX,0,destZ);actor.anchor.rotation.y=turnTo;
      }else{
        const glide=1-Math.exp(-poseElapsed*.019),turnEase=1-Math.exp(-poseElapsed*.012);
        actor.anchor.position.x+=(destX-actor.anchor.position.x)*glide;
        actor.anchor.position.z+=(destZ-actor.anchor.position.z)*glide;
        actor.anchor.rotation.y+=Math.atan2(Math.sin(turnTo-actor.anchor.rotation.y),Math.cos(turnTo-actor.anchor.rotation.y))*turnEase;
      }
      actor.anchor.visible=!(e.type?.id==='crystallizard'&&e.crystalHidden);
      if(e.type?.id==='crystalbiter'&&performance.now()<(e.biterRestUntil||0)){
        actor.anchor.rotation.z=.20;
        if(actor.anchor.scale)actor.anchor.scale.y=.70;
      }else{actor.anchor.rotation.z=0;if(actor.anchor.scale)actor.anchor.scale.y=1}
      actor.anchor.userData.worldPoint={x:e.x,y:e.y};
      syncBestiaryName(actor,e,state,Math.max(1.5,(Number(e.type?.r)||20)*SCALE*2.2)+.2);
      if(actor.anchor.visible)actor.model.traverse(child=>{
        if(!child.isMesh)return;
        child.userData.worldPoint={x:e.x,y:e.y,monsterId:e.netId};
        interactables.push(child);
      });
      // 몬스터 실제 이동량을 쓰므로 벽에 걸렸을 때 이동 애니메이션이 계속 나오지 않는다.

      const moving=moveDelta>.14&&poseElapsed>0&&poseElapsed<420;
      const attacking=poseNow-(Number(e.attackAt)||0)<430;
      actor.lastX=e.x;actor.lastY=e.y;actor.lastPoseAt=poseNow;
      actor.anchor.position.y=moving?.016*Math.sin(poseNow/110):.006*Math.sin(poseNow/410);
      const lean=attacking?-.11:poseNow<(Number(e.hitAt)||0)?.08:0;
      actor.anchor.rotation.x+=(lean-actor.anchor.rotation.x)*Math.min(1,poseElapsed/65);
      const words=attacking?['attack','bite','swing']:moving?['walk','run']:['idle','stand'];
      const clip=actor.clips.find(c=>words.some(w=>c.name.toLowerCase().includes(w)))
        ||actor.clips.find(c=>/idle|walk/i.test(c.name));
      if(actor.mixer&&clip&&(clip.name!==actor.clipName||attacking&&actor.lastAttackStamp!==e.attackAt)){
        actor.action?.fadeOut(.09);
        actor.action=actor.mixer.clipAction(clip).reset();
        actor.action.setLoop(attacking?THREE.LoopOnce:THREE.LoopRepeat,attacking?1:Infinity);
        actor.action.clampWhenFinished=attacking;
        actor.action.fadeIn(.09).play();actor.clipName=clip.name;
        if(attacking)actor.lastAttackStamp=e.attackAt;
      }
      if(actor.action)actor.action.setEffectiveTimeScale(attacking?1.35:moving?1.25:1);
      const now=performance.now();
      if(Math.hypot(e.x-px,e.y-py)<300||now-actor.lastFrame>=100){
        actor.mixer?.update(Math.min(.15,Math.max(0,(now-actor.lastFrame)/1000)));
        actor.lastFrame=now;
      }actor.seen=stamp;
    }
    for(const [key,actor] of nativeCreatureActors){
      if(actor.seen===stamp)continue;
      actor.mixer?.stopAllAction();
      scene.remove(actor.anchor);actor.nameLabel?.material.dispose();nativeCreatureActors.delete(key);
    }
    return unsafeUnmappedEncounter;
  }
  if(hero)scene.add(hero.avatar);

  let playerToolName=null,playerMotionProfile=createSurvivalPlayerMotionProfile({platform:'WEB',tool:'NONE'});
  // [장비] 원본 캐릭터 GLB의 기본 장비·모션을 유지한다.
  // 검증된 무기별 원본이 없으므로 임의 상자·원통 모델은 생성하지 않는다.
  // 공격·장비·저장 판정은 기존 게임 본편이 그대로 담당한다.
  let equippedVisualId='';
  const swingArc=new THREE.Mesh(new THREE.TorusGeometry(.79,.045,4,23,Math.PI*1.12),
    new THREE.MeshBasicMaterial({color:0xdbe8fb,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  swingArc.visible=false;swingArc.position.set(0,1.05,.46);swingArc.rotation.set(.12,0,-.25);
  const swingRing=new THREE.Mesh(new THREE.RingGeometry(.30,.38,18),
    new THREE.MeshBasicMaterial({color:0xe6d4a0,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  swingRing.visible=false;swingRing.rotation.x=-Math.PI/2;swingRing.position.y=.055;
  function updateEquippedVisual(id){
    if(!hero||id===equippedVisualId)return;
    equippedVisualId=id;
  }
  let observedWeather='';
  let weatherVisualEffects=[];
  let active=false,lastW=0,lastH=0;
  canvas.hidden=true;

  function addVisibleEntity(key,kind,x,y,scale,seen,rotationY=0,visualOnly=false){
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
    if(!visualOnly)interactables.push(model);
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
      if(!item||item.dead||Math.hypot(item.x-px,item.y-py)>Math.max(mobileBudget?250:430,(mobileBudget?650:1000)*qualityFactor))continue;
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
  function frame(state,regionAt,regionScene=null){
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
      const next=fps<26?Math.max(mobileBudget?.48:.58,qualityFactor-.13):
        stableQualityWindows>=3?Math.min(mobileBudget?.82:1,qualityFactor+.06):qualityFactor;
      if(Math.abs(next-qualityFactor)>.01){
        qualityFactor=next;stableQualityWindows=0;
        renderer.shadowMap.enabled=!mobileBudget&&qualityFactor>=.8;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobileBudget?.82:.95)*qualityFactor);
      }
      framesInWindow=0;fpsWindowStart=sampleNow;
    }
    if(!state.player){lastHeroPoseX=null;lastHeroPoseY=null;lastHeroPoseAt=0;canvas.hidden=true;active=false;fallbackReason='player-model-unavailable';return}
    const interiorBiome={
      underwater:'underwater','underwater-dungeon':'underwater-dungeon',underground:'canyon',worldtreeinside:'worldtree',questcave:'swamp',
      storylab1:'crystal',storylab2:'crystal',jungletemple:'jungle',
      'jungletemple-upper':'jungle','jungletemple-lower':'swamp','jungletemple-secret':'jungle',
      'goblinoutpost-1':'forest','goblinoutpost-2':'forest','goblinoutpost-3':'swamp','goblinoutpost-4':'canyon'
    };
    const isInterior=state.area!=='surface';
    if(isInterior&&!Object.hasOwn(interiorBiome,state.area)){canvas.hidden=true;active=false;fallbackReason='region-3d-not-yet-mapped';return}
    const p=state.player,px=Number(p.x)||0,py=Number(p.y)||0,centerX=px*SCALE,centerY=py*SCALE;
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
    // 로딩: 플레이어 근처를 우선하되, 넓은 화면에서 멀리 보이는 원본 몹도 빠짐없이 요청한다.
    // 카메라 갱신 뒤 시야를 판단하며 250ms/동시 요청 제한을 유지한다.
    if(sampleNow>=nextCreatureScan){
      nextCreatureScan=sampleNow+100;
      const needed=new Map();
      for(const e of state.enemies||[]){
        if(!e||e.hp<=0||e.area!==state.area)continue;
        const distance=Math.hypot(e.x-px,e.y-py);
        if(distance>1200){
          creatureBounds.center.set(e.x*SCALE,2,e.y*SCALE);
          if(!cameraFrustum.intersectsSphere(creatureBounds))continue;
        }
        const file=e.type?.id==='wastelandMummy'?'skeleton-warrior.glb':NATIVE_CREATURE_BY_ID.get(e.type?.id);
        if(!file||nativeCreatureSources.has(file)||creatureRequests.has(file))continue;
        const failed=creatureFailures.get(file);
        const retryDelay=failed?Math.min(60000,5000*2**Math.min(4,failed.attempts-1)):0;
        if(failed&&sampleNow-failed.at<retryDelay)continue;
        needed.set(file,Math.min(needed.get(file)??Infinity,distance));
      }
      for(const [file] of [...needed].sort((a,b)=>a[1]-b[1])){
        if(loadingCreatureCount>=(mobileBudget?6:10))break;
        void loadCreatureSource(file);
      }
    }
     const classify=typeof regionAt==='function'?regionAt:()=> 'forest';
    const zone=isInterior?interiorBiome[state.area]:String(classify(px,py)||'forest');
    currentBiome=BIOME_STYLE[zone]?zone:'forest';
    scene.background.set(BIOME_STYLE[currentBiome].sky);
    scene.fog.color.set(BIOME_STYLE[currentBiome].sky);
    if(state.area==='underwater'||state.area==='underwater-dungeon'){
      const deep=state.area==='underwater-dungeon'||py>=3600;
      scene.background.setHex(deep?0x0b2b38:0x185569);
      scene.fog.color.setHex(deep?0x0b2b38:0x185569);
    }
    const weatherKind=String(state.weather?.kind||'clear');
    if(weatherKind!==observedWeather){
      observedWeather=weatherKind;
      const weatherPlan=createVibeWeatherInteractionProfile({weather:weatherKind,intensity:.5,mobile:mobileBudget});
      weatherVisualEffects=weatherPlan.effects;
    }
    // 지역 이동 시 수중 안개/조명이 지상에 남지 않게 프레임 기준으로 복원한다.
    scene.fog.far=weatherVisualEffects.includes('layered-haze')?46:
      weatherVisualEffects.includes('wind-drift')?63:
      currentBiome==='snow'?110:currentBiome==='desert'?95:currentBiome==='jungle'?63:currentBiome==='swamp'?58:currentBiome==='volcano'?67:currentBiome==='crystal'?76:90;
    sun.intensity=weatherVisualEffects.includes('surface-wetness')?1.55:2;
    if(state.area==='underwater'||state.area==='underwater-dungeon'){
      scene.fog.far=state.area==='underwater-dungeon'?34:py>=3600?44:62;
      sun.intensity=state.area==='underwater-dungeon'?.85:1.2;
    }
    // Atmosphere and foliage changes are Vibe presentation only. The existing biome
    // classifier, collision, damage, spawn and player movement remain authoritative.
    const centerTileX=Math.round(centerX/floorPitchX),centerTileY=Math.round(centerY/floorPitchZ);
    // 프레임마다 85개 지형을 다시 칠하지 않고 실제 타일 경계가 바뀔 때만 갱신한다.
    if(centerTileX!==lastFloorGridX||centerTileY!==lastFloorGridZ||classify!==lastFloorClassifier||state.area!==lastFloorArea||models.size!==lastSceneryModelCount){
      let tileIndex=0,seamTileIndex=0;
      for(const batch of sceneryBatches.values())batch.count=0;
      for(const row of terrainDetailBatches.values())row.mesh.count=0;
    for(let tz=-3;tz<=3;tz++)for(let tx=-3;tx<=3;tx++){
      const gx=(centerTileX+tx)*floorPitchX,gz=(centerTileY+tz)*floorPitchZ;
      // 기존 지역 판정과 원본 모델·재질을 보존하고 지역 색만 적용한다.
      const tileZone=isInterior?currentBiome:String(classify(gx/SCALE,gz/SCALE)||'forest');
      const surface=(regionScene?.surfaces||[]).find(s=>s.kind==='water'&&gx/SCALE>=s.x&&gx/SCALE<=s.x+s.w&&gz/SCALE>=s.y&&gz/SCALE<=s.y+s.h
        ||s.kind==='waterCircles'&&s.pools?.some(p=>Math.hypot(gx/SCALE-p.x,gz/SCALE-p.y)<=p.r)
        ||s.kind==='lava'&&s.pools?.some(p=>Math.hypot(gx/SCALE-p.x,gz/SCALE-p.y)<=p.r));
      const tileStyle=surface?BIOME_STYLE[surface.kind==='lava'?'lava':'water']:BIOME_STYLE[tileZone]||BIOME_STYLE.forest;
      tile.position.set(gx-floorCenterX,floorSurfaceY,gz-floorCenterZ);tile.updateMatrix();
      biomeTiles.setMatrixAt(tileIndex,tile.matrix);
      // 흰색 혼합을 줄여 설원·화산·수정 지대와 숲의 색채가 뚜렷하게 구분되도록 한다.
      const tileSeed=(Math.imul(centerTileX+tx,73856093)^Math.imul(centerTileY+tz,19349663))>>>0;
      biomeTiles.setColorAt(tileIndex,floorTint.setHex(tileStyle.floor).multiplyScalar(.91+tileSeed%17*.01).lerp(floorNeutral,.12));
      tileIndex++;
      const pixelZone=surface?(surface.kind==='lava'?'lava':'water'):tileZone;
      const pixelBatch=terrainPixelBatch(pixelZone);
      detailTransform.position.set(gx-floorCenterX,floorSurfaceY+.032,gz-floorCenterZ);
      detailTransform.rotation.set(0,0,0);
      detailTransform.scale.setScalar(1);detailTransform.updateMatrix();
      pixelBatch.mesh.setMatrixAt(pixelBatch.mesh.count++,detailTransform.matrix);
      // 지형 판정과 같은 좌표계를 쓰는 고정 3D 배경. 가운데 타일은 비워 전투 시야를 보존한다.
      if(tx!==0||tz!==0){
        const hash=(Math.imul(centerTileX+tx,73856093)^Math.imul(centerTileY+tz,19349663))>>>0;
        if(mobileBudget?hash%5===0:hash%3!==0){
          // 지역별로 서로 다른 원본 배경 메시를 섞어 같은 나무/바위 반복을 줄인다.
          const sceneryChoices=SCENERY_KIND[tileZone]||SCENERY_KIND.forest;
          const kind=sceneryChoices[hash%sceneryChoices.length];
          let batch=sceneryBatches.get(kind);
          if(!batch&&models.has(kind)){
            const original=models.get(kind);
            const mesh=new THREE.InstancedMesh(original.geometry,original.material,49);
            mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;
            scene.add(mesh);batch={mesh,count:0};sceneryBatches.set(kind,batch);
          }
          if(batch){
            const xOffset=(((hash>>>4)%5)-2)*floorPitchX*.12;
            const zOffset=(((hash>>>7)%5)-2)*floorPitchZ*.12;
            resourceTransform.position.set(gx+xOffset,0,gz+zOffset);
            resourceTransform.rotation.y=(hash%8)*(Math.PI/4);
            resourceTransform.scale.setScalar(.38+((hash>>>10)%4)*.09);
            resourceTransform.updateMatrix();
            batch.mesh.setMatrixAt(batch.count,resourceTransform.matrix);
            batch.mesh.setColorAt(batch.count,floorTint.setHex(tileStyle.floor).lerp(floorNeutral,.35));
            batch.count++;
          }
        }
      }
      if(tx<3&&tz<3){
        const seamX=gx+floorPitchX*.5,seamZ=gz+floorPitchZ*.5;
        const seamZone=isInterior?currentBiome:String(classify(seamX/SCALE,seamZ/SCALE)||'forest');
        const surface=(regionScene?.surfaces||[]).find(s=>s.kind==='water'&&seamX/SCALE>=s.x&&seamX/SCALE<=s.x+s.w&&seamZ/SCALE>=s.y&&seamZ/SCALE<=s.y+s.h
          ||s.kind==='waterCircles'&&s.pools?.some(p=>Math.hypot(seamX/SCALE-p.x,seamZ/SCALE-p.y)<=p.r)
          ||s.kind==='lava'&&s.pools?.some(p=>Math.hypot(seamX/SCALE-p.x,seamZ/SCALE-p.y)<=p.r));
        const seamStyle=surface?BIOME_STYLE[surface.kind==='lava'?'lava':'water']:BIOME_STYLE[seamZone]||BIOME_STYLE.forest;
        tile.position.set(seamX-floorCenterX,floorSurfaceY-.055,seamZ-floorCenterZ);
        tile.updateMatrix();
        floorSeamTiles.setMatrixAt(seamTileIndex,tile.matrix);
        floorSeamTiles.setColorAt(seamTileIndex,floorTint.setHex(seamStyle.floor).lerp(floorNeutral,.12));
        seamTileIndex++;
      }
    }
    biomeTiles.instanceMatrix.needsUpdate=true;
    biomeTiles.instanceColor.needsUpdate=true;
    for(const row of terrainDetailBatches.values()){row.mesh.instanceMatrix.needsUpdate=true;row.mesh.boundingSphere=null;}
    floorSeamTiles.instanceMatrix.needsUpdate=true;
    floorSeamTiles.instanceColor.needsUpdate=true;
    for(const batch of sceneryBatches.values()){
      batch.mesh.count=batch.count;
      batch.mesh.instanceMatrix.needsUpdate=true;
      if(batch.mesh.instanceColor)batch.mesh.instanceColor.needsUpdate=true;
      batch.mesh.boundingSphere=null;
    }
      lastFloorGridX=centerTileX;lastFloorGridZ=centerTileY;lastFloorClassifier=classify;lastFloorArea=state.area;
      lastSceneryModelCount=models.size;
    }
    interactables.length=0;
    const seen=++frameSequence; // 이전 지역 몹·상호작용 객체를 저장 시각과 무관하게 정리한다.
    if(hero){
      hero.avatar.visible=true;
      hero.avatar.position.set(centerX,0,centerY);
      hero.avatar.rotation.y=Math.atan2(Number(p.faceX)||0,Number(p.faceY)||1);
      const tool=String(p.weapon||p.tool||'NONE').toLowerCase();
      updateEquippedVisual(tool);
      if(swingArc.parent!==hero.avatar)hero.avatar.add(swingArc);
      if(swingRing.parent!==hero.avatar)hero.avatar.add(swingRing);
      if(tool!==playerToolName){
        playerToolName=tool;
        const family=/axe/i.test(tool)?'AXE':/pick/i.test(tool)?'PICKAXE':/spear|lance|glaive/i.test(tool)?'SPEAR':'NONE';
        playerMotionProfile=createSurvivalPlayerMotionProfile({platform:'WEB',tool:family});
      }
      const now=performance.now();
      // 이동 좌표가 변할 때만 발 동작을 재생해 벽을 밀 때 문워크하지 않는다.
      const poseElapsed=now-lastHeroPoseAt;
      const moveDelta=lastHeroPoseX===null?0:Math.hypot(px-lastHeroPoseX,py-lastHeroPoseY);
      const moving=lastHeroPoseAt>0&&poseElapsed<=300&&moveDelta>.06;
      lastHeroPoseX=px;lastHeroPoseY=py;lastHeroPoseAt=now;
      const attackingAge=now-(Number(p.attackAt)||0);
      const pose=attackingAge<(selectedAppearance?.model==='barbarian'?490:selectedAppearance?.model==='mage'?440:330)?'attack':moving?'move':'idle';
      // 기사 찌르기 / 전사 내려찍기 / 도적 빠른 베기 / 법사 시전의 시각 연출만 다르게 한다.
      const avatarStyle=selectedAppearance?.model||'knight';
      const attackPhase=attackingAge>=0&&attackingAge<440?Math.sin(Math.PI*attackingAge/440):0;
      hero.avatar.rotation.z=avatarStyle==='barbarian'?-.11*attackPhase:avatarStyle.startsWith('rogue')?.08*attackPhase:avatarStyle==='mage'?.025*attackPhase:.045*attackPhase;
      hero.avatar.position.y=avatarStyle==='mage'?.12*attackPhase:avatarStyle==='barbarian'?.06*attackPhase:0;
      // 공격 이벤트와 동기화된 무기별 잔상·충격파. 데미지/쿨다운/범위 불변.
      const swingAge=Math.max(0,attackingAge),swinging=attackingAge>=0&&attackingAge<260;
      const heavy=/hammer|maul|greatsword|heavy|axe/.test(tool);
      const ranged=/bow|crossbow|staff|orb|seeker/.test(tool);
      swingArc.visible=swinging&&!ranged;
      swingRing.visible=swinging&&heavy&&swingAge>75;
      if(swingArc.visible){
        swingArc.material.color.setHex(/crystal|rune/.test(tool)?0xb69dff:/fire|sunstone/.test(tool)?0xffaf65:0xe4e9dc);
        swingArc.material.opacity=(1-swingAge/260)*.82;
        swingArc.rotation.z=-.6+swingAge/260*2.05;
        swingArc.scale.setScalar(heavy?1.28:/dagger|knife/.test(tool)?.72:1);
      }
      if(swingRing.visible){
        swingRing.material.opacity=(1-swingAge/260)*.35;
        swingRing.scale.setScalar(.5+swingAge/220*2);
      }
      // 액션 모션: 이름 일부가 우연히 겹치는 첫 클립 대신 CC0 원본 역할을 정확히 선택한다.
      const clipName=playerMotionProfile.cc0Clips[pose==='move'?'run':pose];
      const desired=heroClips.find(clip=>clip.name===clipName);
      const nextName=desired?.name||'';
      const attackAt=Number(p.attackAt)||0;
      if(heroMixer&&(nextName!==heroActionName||(pose==='attack'&&attackAt!==lastHeroAttackAt))){
        if(heroAction)heroAction.fadeOut(.09);
        heroAction=desired?heroMixer.clipAction(desired):null;
        if(heroAction){
          heroAction.reset().setLoop(pose==='attack'?THREE.LoopOnce:THREE.LoopRepeat,pose==='attack'?1:Infinity);
          heroAction.clampWhenFinished=pose==='attack';
          // 시각 모션만 가속. 캐릭터 이동속도와 전투 판정은 변경하지 않는다.
          if(pose==='attack')heroAction.setDuration(selectedAppearance?.model==='mage'?.43:selectedAppearance?.model==='barbarian'?.48:selectedAppearance?.model?.startsWith('rogue')?.23:.32);
          else heroAction.setEffectiveTimeScale(pose==='move'?1.3:1);
          heroAction.fadeIn(.09).play();
        }
        heroActionName=nextName;
        if(pose==='attack')lastHeroAttackAt=attackAt;
      }
      if(heroMixer){heroMixer.update(Math.min(.12,Math.max(0,(now-lastHeroFrame)/1000)));lastHeroFrame=now}
    }
    synchronizeUndead(state,px,py,seen);
    const unsafeUnmappedEncounter=synchronizeNativeCreatures(state,px,py,seen);
    updateBiterAcidMeshes(state,seen);
    // 다른 지역으로 이동하면 앞서 표시한 지상의 식물/광석 배치를 즉시 지운다.
    if(isInterior)for(const batch of resourceBatches.values())batch.mesh.count=0;
    if(!isInterior)resources(state.trees,'tree',px,py,seen,1.28);
    if(!isInterior)resources(state.swampTrees,'tree_large',px,py,seen,1.65);
    if(!isInterior)resources(state.rocks,'cobblestones',px,py,seen,1.05);
    if(!isInterior)resources(state.fibers,'foliage_A',px,py,seen,1.2);
    // Exact category match: original Tiny Treats benches for actual player-owned
    // crafting workstations, positioned at their existing authoritative coordinates.
    for(const [key,workbench,modelName] of [
      ['bench',state.bench,'bench_A'],
      ['ironBench',state.ironBench,'bench_B'],
      ['goldBench',state.goldBench,'bench_B'],
      ['jungleBench',state.jungleBench,'bench_A']
    ]){
      if(!isInterior&&workbench&&Math.hypot(workbench.x-px,workbench.y-py)<1000)
        addVisibleEntity(key,modelName,workbench.x,workbench.y,1.7,seen);
    }
    for(const [i,wall] of (state.walls||[]).entries()){
      if(!isInterior&&Math.hypot(wall.x-px,wall.y-py)<1000)
        addVisibleEntity('wall:'+(wall.id||i),'fence_straight',wall.x,wall.y,1.2,seen,wall.vertical?Math.PI/2:0);
    }
    // House construction: reuse existing saved door and chest world coordinates.
    // The downloaded CC0 gate and parcel are only species-level visual candidates, not finished QA.
    for(const [i,door] of (state.doors||[]).entries()){
      if(!isInterior&&Math.hypot(door.x-px,door.y-py)<1000)
        addVisibleEntity('door:'+(door.id||i),'gate_single',door.x,door.y,1.2,seen,
          (door.vertical?Math.PI/2:0)+(door.open?Math.PI/2:0));
    }
    for(const [i,chest] of (state.chests||[]).entries()){
      if(!isInterior&&Math.hypot(chest.x-px,chest.y-py)<1000)
        addVisibleEntity('chest:'+(chest.id||i),'package',chest.x,chest.y,1.05,seen);
    }
    // 해당 지역의 기존 출입구·제단·상자만 실제 저장 좌표에 표시하고 누르기 판정은 원본 게임에 맡긴다.
    for(const mark of regionScene?.landmarks||[]){
      if(!mark||Math.hypot(mark.x-px,mark.y-py)>950)continue;
      addVisibleEntity('region:'+state.area+':'+mark.id,mark.model,mark.x,mark.y,mark.scale||1.4,seen,0,!!mark.decorative);
    }
    updateInteriorWalls(isInterior?regionScene:null,state,px,py);
    // Reuse existing world entities. No synthetic monsters or substitute species.
    for(const [key,row] of entities)if(row.seen!==seen){scene.remove(row.model);entities.delete(key)}
    if(unsafeUnmappedEncounter||!hero){
      canvas.hidden=true;active=false;
      fallbackReason=unsafeUnmappedEncounter?'unmapped-threat':'player-model-unavailable';
      return;
    }
    // 기존 화살·포자·태양 구슬과 법사 마법탄의 실제 좌표를 타입별 시각 효과로 표시한다.
    let visibleBoltCount=0;
    for(const bolt of state.projectiles||[]){
      const isArrow=bolt.kind==='playerArrow',isMagic=bolt.kind==='mageBolt';
      const isSpore=bolt.kind==='sporeOrb',isSun=bolt.kind==='sunOrb';
      if((!isArrow&&!isMagic&&!isSpore&&!isSun)||bolt.area!==state.area||visibleBoltCount>=12)continue;
      let mesh=mageBoltEffects[visibleBoltCount];
      if(!mesh){mesh=new THREE.Mesh(mageBoltGeometry,mageBoltMaterial);mesh.frustumCulled=false;scene.add(mesh);mageBoltEffects.push(mesh)}
      mesh.geometry=isArrow?arrowGeometry:mageBoltGeometry;
      mesh.material=isArrow?arrowMaterial:isSpore?sporeMaterial:isSun?sunOrbMaterial:mageBoltMaterial;
      mesh.position.set(bolt.x*SCALE,isArrow?1.05:1.12+Math.sin(sampleNow/110)*.10,bolt.y*SCALE);
      if(isArrow){
        projectileDirection.set(Number(bolt.vx)||0,0,Number(bolt.vy)||0).normalize();
        mesh.quaternion.setFromUnitVectors(projectileUp,projectileDirection);
      }else mesh.rotation.set(0,sampleNow*.009,0);
      mesh.visible=true;visibleBoltCount++;
    }
    for(let i=visibleBoltCount;i<mageBoltEffects.length;i++)mageBoltEffects[i].visible=false;
    const bp=state.area==='surface'?state.blueprint:null;
    const blueprintKind=!bp?'':/door|gate/i.test(bp.id)?'gate_single'
      :/wall|fence/i.test(bp.id)?'fence_straight'
      :/bench|forge|work|craft|furnace/i.test(bp.id)?'bench_B'
      :/chest|storage|crate|box/i.test(bp.id)?'package'
      :/house|home|hut|shelter/i.test(bp.id)?'house':'';
    if(blueprintKind!==blueprintSourceId||(!blueprintVisual&&models.has(blueprintKind))){
      if(blueprintVisual){blueprintGhost.remove(blueprintVisual);blueprintVisual=null}
      blueprintSourceId=blueprintKind;
      const source=models.get(blueprintKind);
      if(source){
        source.geometry.computeBoundingBox();
        const bounds=source.geometry.boundingBox;
        const width=Math.max(.01,bounds.max.x-bounds.min.x);
        const height=Math.max(.01,bounds.max.y-bounds.min.y);
        const depth=Math.max(.01,bounds.max.z-bounds.min.z);
        blueprintVisual=new THREE.Mesh(source.geometry,blueprintMaterial);
        blueprintVisual.position.set(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,
          -(bounds.min.z+bounds.max.z)/2);
        blueprintGhost.add(blueprintVisual);
        blueprintGhost.scale.setScalar(Math.min(3/width,1.3/height,3/depth,2));
      }
    }
    blueprintGhost.visible=!!bp&&!!blueprintVisual;
    if(bp&&blueprintVisual){
      blueprintGhost.position.set(bp.x*SCALE,.03,bp.y*SCALE);
      blueprintGhost.rotation.y=bp.vertical?Math.PI/2:0;
      blueprintMaterial.color.setHex(bp.canPlace?0x80f5a3:0xff7373);
    }
    renderer.render(scene,camera);
    active=true;canvas.hidden=false;fallbackReason='';
    if(!extraModelsStarted){
      extraModelsStarted=true;
      // 첫 WebGL 프레임 이후 멀리 있는 장식 메시를 단계적으로 파싱한다.
      const priorityModels=(regionScene?.landmarks||[]).map(mark=>mark?.model).filter(Boolean);
      if(!isInterior)priorityModels.push('bench_A','bench_B','fence_straight','gate_single','package');
      setTimeout(()=>{if(!disposed)void stagedModels.loadRemaining(priorityModels).catch(error=>
        console.warn('CC0 optional scenery unavailable',error));},0);
    }
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
    for(const actor of undeadActors.values()){actor.mixer?.stopAllAction();scene.remove(actor.anchor);actor.nameLabel?.material.dispose()}
    undeadActors.clear();
    for(const actor of nativeCreatureActors.values()){actor.mixer?.stopAllAction();scene.remove(actor.anchor);actor.nameLabel?.material.dispose()}
    nativeCreatureActors.clear();
    for(const texture of nameTextures.values())texture.dispose();
    nameTextures.clear();
    scene.remove(blueprintGhost);if(blueprintVisual)blueprintGhost.remove(blueprintVisual);
    blueprintMaterial.dispose();
    swingArc.parent?.remove(swingArc);swingRing.parent?.remove(swingRing);
    swingArc.geometry.dispose();swingArc.material.dispose();swingRing.geometry.dispose();swingRing.material.dispose();
    if(acidBatch)scene.remove(acidBatch);
    acidMaterial.dispose();
    for(const mesh of mageBoltEffects)scene.remove(mesh);
    mageBoltEffects.length=0;mageBoltGeometry.dispose();mageBoltMaterial.dispose();
    arrowGeometry.dispose();arrowMaterial.dispose();sporeMaterial.dispose();sunOrbMaterial.dispose();
    renderer.dispose();
    for(const row of entities.values())scene.remove(row.model);
    entities.clear();
    for(const model of models.values()){model.geometry.dispose();model.material.dispose()}
    // 종별 공유 재질은 원본 텍스처/메시와 별도로 한 번만 해제한다.
    for(const materials of nativeSpeciesMaterials.values())
      for(const material of materials.values())material.dispose();
    nativeSpeciesMaterials.clear();
    for(const source of nativeCreatureSources.values())source.model.traverse(o=>{
      if(!o.isMesh)return;
      o.geometry?.dispose();
      for(const m of (Array.isArray(o.material)?o.material:[o.material]))m?.dispose();
    });
    for(const row of terrainDetailBatches.values()){scene.remove(row.mesh);row.mesh.dispose();row.material.dispose();row.texture.dispose()}
    terrainDetailBatches.clear();detailGeometry.dispose();
    scene.remove(biomeTiles);biomeTiles.dispose();
    scene.remove(floorSeamTiles);floorSeamTiles.dispose();
    for(const {mesh} of resourceBatches.values()){scene.remove(mesh);mesh.dispose()}
    resourceBatches.clear();
    for(const {mesh} of sceneryBatches.values()){scene.remove(mesh);mesh.dispose()}
    sceneryBatches.clear();
    for(const {mesh} of interiorWalls.values()){scene.remove(mesh);mesh.dispose()}
    interiorWalls.clear();
    // Source floor geometry/material are disposed once by the source model pool.
  }
  return {
    frame,pick,dispose,setAvatarAppearance,retryMissingCreatures,getAvatarAppearance:()=>({...selectedAppearance}),isActive:()=>active&&!disposed&&!canvas.hidden,
    kind:'NATIVE_WEBGL_GAME_RENDERER',
    get playerSource(){return hero?.avatar.userData.source||''},get creatureSources(){return [...nativeCreatureSources.keys()]},
    modelCount:models.size,get playerAssetLoaded(){return !!hero},get playerMotionClipCount(){return heroClips.length},
    get undeadProxySourceLoaded(){return !!undeadSource},get undeadProxyMotionClipCount(){return undeadClips.length},
    getBiome:()=>currentBiome,getWorldProfile:()=>gameStyleRegion,
    getWeatherEffects:()=>weatherVisualEffects,getAvatarRecipe:()=>avatarRecipe,
    getMissingAssetTypes:()=>assetReadiness.missingTypes,
    getUnmappedVisibleMonsterIds:()=>[...missingVisibleMonsterIds],
    getFailedCreatureSources:()=>[...creatureFailures].map(([file,entry])=>({file,attempts:entry.attempts,message:entry.message})),
    getAdaptiveQuality:()=>qualityFactor,getFallbackReason:()=>fallbackReason,
    getRenderStats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      nativeCreatures:nativeCreatureActors.size,undeadCreatures:undeadActors.size,
      resourceBatches:resourceBatches.size,loadingModels:loadingCreatureCount,loadedModels:nativeCreatureSources.size,
      measuredFps,pixelRatio:renderer.getPixelRatio()}),
    productionReady:false
  };
}
