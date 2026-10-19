// Actual optional 3D world renderer attached to the canonical Magic Forest game.
// Preview is opt-in (?preview3d=1): it must not replace verified legacy gameplay
// until native meshes, creatures, terrain interaction and mobile QA all pass.
// Geometry comes from the downloaded, CC0-ledgered Tiny Treats Homely House OBJ pack.
import * as THREE from '../../assets/roblox/world-ghosts/native/mesh/three/three.module.js';
import {GLTFLoader} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneAnimatedRig} from '../../assets/roblox/world-ghosts/native/mesh/three/examples/jsm/utils/SkeletonUtils.js';
import {createVibeEnvironmentVariation,createVibeWeatherInteractionProfile,createVibeRegionWorldProfile} from '../../assets/vibe-environment-director.js';
import {createVibeCharacterCustomizationRecipe} from '../../assets/vibe-character-identity-director.js';
import {createSurvivalPlayerMotionProfile} from '../../assets/vibe-motion-director.js';
import {planAssetApplication} from '../../assets/asset-selector.js';

const SOURCE = new URL('../../assets/shared/homely-house/', import.meta.url);
const SCALE = 1 / 48;
const HERO_URL = new URL('../../assets/roblox/actors/native/mage.glb',import.meta.url);
const UNDEAD_URL = new URL('../../assets/roblox/actors/native/skeleton-warrior.glb',import.meta.url);
const assetReadiness=planAssetApplication({
 prompt:'마력숲 생존 캐릭터 몬스터 나무 숲 UI 전투 애니메이션',
 manifest:{assets:[
  {id:'external-tinytreats-tree-v1',path:'assets/shared/homely-house/tree.obj',
   types:['prop','background'],license:'CC0',downloaded:true,
   sourceUrl:'https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0'},
  // Loaded only in explicitly selected preview. Runtime animation QA remains pending.
  {id:'external-actor-mage',path:'assets/roblox/actors/native/mage.glb',
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
const MODEL_NAMES = Object.freeze(['tree','tree_large','foliage_A','cobblestones','bench_A','fence_straight','house','gate_single','package']);
const PALETTE = Object.freeze({
  tree:0x59854b, tree_large:0x5e8750, foliage_A:0x83ab63,
  cobblestones:0x8b8c79, bench_A:0x987955, fence_straight:0x927b57, house:0xb6aa83, gate_single:0x927b57, package:0x987955
});

function parseDownloadedObj(text, modelName){
  const raw=[],pos=[],colors=[],base=new THREE.Color(PALETTE[modelName]);
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
        const face=[verts[0],verts[i],verts[i+1]],avgY=face.reduce((n,v)=>n+v[1],0)/3;
        const tone=base.clone();
        // Material customization, not replacement geometry. Keep downloaded mesh surfaces.
        if(modelName==='tree'||modelName==='tree_large'){
          if(avgY<.7)tone.set(0x76573a);
          else tone.multiplyScalar(1+Math.min(.18,Math.max(0,avgY-1.2)*.04));
        }else if(modelName==='house'&&avgY>2.6)tone.set(0x69594c);
        for(const v of face){pos.push(v[0],v[1],v[2]);colors.push(tone.r,tone.g,tone.b)}
      }
    }
  }
  if(pos.length<9)throw new Error('Empty downloaded 3D geometry: '+modelName);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,flatShading:true,side:THREE.DoubleSide});
  const model=new THREE.Mesh(geometry,material);
  model.castShadow=true;model.receiveShadow=true;
  return model;
}

async function loadSourceModels(){
  const results=await Promise.all(MODEL_NAMES.map(async name=>{
    const url=new URL(name+'.obj',SOURCE);
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error('Downloaded source missing: '+name+' '+response.status);
    const text=await response.text();
    if(!text.includes('v ')||!text.includes('f '))throw new Error('Invalid downloaded 3D model: '+name);
    return [name,parseDownloadedObj(text,name)];
  }));
  return new Map(results);
}

export async function createWorld3d(canvas){
  const models=await loadSourceModels(); // Fail closed: leave the old game active.
  // Original CC0 KayKit mage GLB: optional visual actor only. Never invent a character mesh.
  // The existing game owns hitboxes, attacks, inventory, motion timing and save values.
  let hero=null,heroMixer=null,heroClips=[],heroAction=null,heroActionName='',lastHeroFrame=0;
  try{
    const gltf=await new GLTFLoader().loadAsync(HERO_URL.href);
    const avatar=new THREE.Group(),model=gltf.scene;
    const box=new THREE.Box3().setFromObject(model);
    const modelHeight=Math.max(.1,box.max.y-box.min.y);
    const heightFactor=Math.max(.87,Math.min(1.13,(Number(avatarRecipe.body.heightCm)||170)/170));
    const scaledHeight=1.9*heightFactor/modelHeight;
    model.scale.setScalar(scaledHeight);
    model.position.y=-box.min.y*scaledHeight;
    avatar.add(model);
    avatar.userData.source=HERO_URL.href;
    hero={avatar,model};
    heroClips=gltf.animations||[];
    if(heroClips.length)heroMixer=new THREE.AnimationMixer(model);
  }catch(error){
    console.warn('CC0 KayKit mage not available in 3D preview; player asset remains unverified',error);
  }
  // A native CC0 humanoid undead is a visual proxy only for the existing
  // wastelandMummy type. Its AI, hitbox, spawn, skills, loot and ID stay authoritative.
  // More distant species remain missing; do not render arbitrary substitutes.
  let undeadSource=null,undeadClips=[];
  try{
    const gltf=await new GLTFLoader().loadAsync(UNDEAD_URL.href);
    undeadSource=gltf.scene;
    undeadClips=gltf.animations||[];
  }catch(error){
    console.warn('Downloaded undead GLB unavailable; 3D monster preview remains incomplete',error);
  }
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'default'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x244238);
  scene.fog=new THREE.Fog(0x244238,22,90);
  const camera=new THREE.PerspectiveCamera(58,1,.1,120);
  const ambient=new THREE.HemisphereLight(0xe7f5d2,0x263428,2.25);
  scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffe9b6,2.0);
  sun.position.set(-10,22,8);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
  scene.add(sun);
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(220,220),
    new THREE.MeshStandardMaterial({color:0x365a3a,roughness:1})
  );
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
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
  const biomeMaterials=new Map(Object.entries(BIOME_STYLE).map(([key,style])=>[
    key,new THREE.MeshStandardMaterial({color:style.floor,roughness:1})
  ]));
  const biomeTileGeometry=new THREE.PlaneGeometry(10.1,10.1);
  const biomeTiles=Array.from({length:49},()=>{
    const mesh=new THREE.Mesh(biomeTileGeometry,biomeMaterials.get('forest'));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=.015;mesh.receiveShadow=true;
    scene.add(mesh);return mesh;
  });
  let currentBiome='forest';
  const raycaster=new THREE.Raycaster();
  const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  const entities=new Map();
  const interactables=[];
  const undeadActors=new Map();
  let undeadModelHeight=1;
  if(undeadSource){
    const dimensions=new THREE.Box3().setFromObject(undeadSource);
    undeadModelHeight=Math.max(.1,dimensions.max.y-dimensions.min.y);
  }
  function synchronizeUndead(state,px,py,stamp){
    if(!undeadSource)return;
    const candidates=(state.enemies||[]).filter(e=>e?.type?.id==='wastelandMummy'&&e.hp>0&&e.area===state.area
      &&Math.hypot(e.x-px,e.y-py)<940).sort((a,b)=>
      Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py)).slice(0,mobileBudget?6:12);
    for(const e of candidates){
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
      const moving=Math.hypot(Number(e.vx)||0,Number(e.vy)||0)>.05;
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
      actor.mixer?.update(Math.min(.05,Math.max(0,(now-actor.lastFrame)/1000)));
      actor.lastFrame=now;
      actor.seen=stamp;
    }
    for(const [key,actor] of undeadActors){
      if(actor.seen===stamp)continue;
      actor.mixer?.stopAllAction();
      scene.remove(actor.anchor);
      undeadActors.delete(key);
    }
  }
  if(hero)scene.add(hero.avatar);
  let playerToolName=null,playerMotionProfile=createSurvivalPlayerMotionProfile({platform:'WEB',tool:'NONE'});
  let observedWeather='';
  let weatherVisualEffects=[];
  let active=false,lastW=0,lastH=0,disposed=false;
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
    if(!Array.isArray(arr))return;
    let rendered=0;
    for(const item of arr){
      if(!item||item.dead)continue;
      if(Math.hypot(item.x-px,item.y-py)>1000)continue;
      addVisibleEntity(kind+':'+String(item.id),kind,item.x,item.y,scale,seen);
      if(++rendered>=65)break;
    }
  }
  function frame(state,regionAt){
    if(disposed)return;
    if(state.area!=='surface'||!state.player){canvas.hidden=true;active=false;return}
    const p=state.player,px=Number(p.x)||0,py=Number(p.y)||0,centerX=px*SCALE,centerY=py*SCALE;
    const w=window.innerWidth,h=window.innerHeight;
    if(w!==lastW||h!==lastH){
      lastW=w;lastH=h;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    }
    camera.position.set(centerX+1,12,centerY+13);
    camera.lookAt(centerX,0,centerY-2.8);
    ground.position.set(centerX,0,centerY);
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
      const tile=biomeTiles[tileIndex++];
      const gx=(centerTileX+tx)*10,gz=(centerTileY+tz)*10;
      const tileBiome=String(classify(gx/SCALE,gz/SCALE)||'forest');
      tile.material=biomeMaterials.get(tileBiome)||biomeMaterials.get('forest');
      tile.position.set(gx,.015,gz);
    }
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
      const motionWords=pose==='attack'?['attack','swing','cast',playerMotionProfile.primaryToolMotion.toLowerCase()]:
        pose==='move'?['walk','run','move','locomotion']:['idle','stand','breath'];
      const desired=heroClips.find(clip=>motionWords.some(word=>clip.name.toLowerCase().includes(word)));
      const nextName=desired?.name||'';
      if(heroMixer&&nextName!==heroActionName){
        if(heroAction)heroAction.fadeOut(.15);
        heroAction=desired?heroMixer.clipAction(desired).reset().fadeIn(.15).play():null;
        heroActionName=nextName;
      }
      if(heroMixer){heroMixer.update(Math.min(.05,Math.max(0,(now-lastHeroFrame)/1000)));lastHeroFrame=now}
    }
    synchronizeUndead(state,px,py,seen);
    resources(state.trees,'tree',px,py,seen,1.28);
    resources(state.swampTrees,'tree_large',px,py,seen,1.65);
    resources(state.rocks,'cobblestones',px,py,seen,1.05);
    resources(state.fibers,'foliage_A',px,py,seen,1.2);
    if(state.bench&&Math.hypot(state.bench.x-px,state.bench.y-py)<1000)
      addVisibleEntity('bench','bench_A',state.bench.x,state.bench.y,1.7,seen);
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
    renderer.render(scene,camera);
    active=true;canvas.hidden=false;
  }
  function pick(clientX,clientY){
    if(!active||canvas.hidden||disposed)return null;
    const normalized=new THREE.Vector2(clientX/Math.max(1,lastW)*2-1,-(clientY/Math.max(1,lastH))*2+1);
    raycaster.setFromCamera(normalized,camera);
    const hits=raycaster.intersectObjects(interactables,false);
    if(hits.length&&hits[0].object.userData.worldPoint)
      return {...hits[0].object.userData.worldPoint};
    const point=new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane,point)?{x:point.x/SCALE,y:point.z/SCALE}:null;
  }
  function dispose(){
    disposed=true;active=false;canvas.hidden=true;
    if(hero){heroMixer?.stopAllAction();scene.remove(hero.avatar);
      hero.model.traverse(object=>{if(object.isMesh){object.geometry?.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];for(const mat of mats)mat?.dispose()}})}
    for(const actor of undeadActors.values()){actor.mixer?.stopAllAction();scene.remove(actor.anchor)}
    undeadActors.clear();
    if(undeadSource){undeadSource.traverse(o=>{if(!o.isMesh)return;
      o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];
      for(const m of materials)m?.dispose()})}
    renderer.dispose();
    for(const row of entities.values())scene.remove(row.model);
    entities.clear();
    for(const model of models.values()){model.geometry.dispose();model.material.dispose()}
    ground.geometry.dispose();ground.material.dispose();
    biomeTileGeometry.dispose();for(const material of biomeMaterials.values())material.dispose();
  }
  return {
    frame,pick,dispose,kind:'NATIVE_WEBGL_CC0_ASSET_PREVIEW',
    modelCount:models.size,playerAssetLoaded:!!hero,playerMotionClipCount:heroClips.length,
    undeadProxySourceLoaded:!!undeadSource,undeadProxyMotionClipCount:undeadClips.length,
    getBiome:()=>currentBiome,getWorldProfile:()=>gameStyleRegion,
    getWeatherEffects:()=>weatherVisualEffects,getAvatarRecipe:()=>avatarRecipe,
    getMissingAssetTypes:()=>assetReadiness.missingTypes,productionReady:false
  };
}
