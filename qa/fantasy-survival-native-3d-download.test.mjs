// Verify downloaded native 3D asset identity before any Magic Forest release.
// Static/source evidence is not a substitute for WebGL and mobile gameplay QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createVibeEnvironmentVariation,createVibeWeatherInteractionProfile,createVibeRegionWorldProfile} from '../assets/vibe-environment-director.js';
import {createVibeCharacterCustomizationRecipe} from '../assets/vibe-character-identity-director.js';
import {createSurvivalPlayerMotionProfile} from '../assets/vibe-motion-director.js';
import {planAssetApplication} from '../assets/asset-selector.js';


const home='assets/shared/homely-house/';
const names=['tree','tree_large','foliage_A','cobblestones','bench_A','fence_straight','house','gate_single','package'];
const index=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');
const moduleSource=fs.readFileSync('web-games/fantasy-survival/world3d.mjs','utf8');
const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('assets/asset-license-ledger.json','utf8'));

test('native preview binds actual downloaded CC0 OBJ sources with matching SHA256',()=>{
 const legal=ledger.entries.find(e=>e.id==='tinytreats-homely-house-cc0-v1');
 assert.ok(legal);
 assert.equal(legal.license,'CC0');
 assert.equal(legal.commercialUse,true);
 assert.equal(legal.modificationUse,true);
 assert.equal(legal.evidence.sourceGeometryQa,'OBJ_STATIC_GEOMETRY_PASS');
 for(const name of names){
  const path='/'+home+name+'.obj';
  const source=fs.readFileSync(path.slice(1));
  const item=registry.assets.find(a=>a.path===path);
  assert.ok(item,'registry missing: '+name);
  assert.equal(item.license,'CC0');
  assert.match(item.sourceUrl,/Tiny-Treats-Homely-House-1\.0/);
  assert.equal(createHash('sha256').update(source).digest('hex'),item.sourceHash,'downloaded source SHA256 drift: '+name);
  const text=source.toString('utf8');
  assert.match(text,/^v -?\d/m);
  assert.match(text,/^f \d/m);
  assert.match(moduleSource,new RegExp("'"+name+"'"));
 }
});
test('original source materials and Diablo-II-style native camera are bound to game state',()=>{
 const source=fs.readFileSync('web-games/fantasy-survival/world3d.mjs','utf8');
 for(const name of ['floor_base','tree','tree_large','foliage_A','foliage_B','bench_A','bench_B','fence_straight','house','gate_single','package']){
  const objPath=home+name+'.obj',mtlPath=home+name+'.mtl';
  assert.ok(fs.statSync(objPath).size>100,'missing CC0 geometry '+name);
  const mtl=fs.readFileSync(mtlPath,'utf8');
  assert.match(mtl,/^Kd\s+\d/m,'missing original diffuse '+name);
 }
 // No assistant-made meshes or fabricated material palette are permitted in the
 // final visible 3D game: all floor triangles must be from original floor_base.obj.
 assert.match(source,/models\.get\('floor_base'\)/);
 assert.match(source,/sourceFloor\.clone\(\)/);
 assert.match(source,/Original CC0 MTL diffuse missing/);
 assert.doesNotMatch(source,/new THREE\.PlaneGeometry\(/);
 assert.doesNotMatch(source,/const PALETTE\s*=/);
 assert.doesNotMatch(source,/new THREE\.BoxGeometry\(/);
 assert.doesNotMatch(source,/new THREE\.SphereGeometry\(/);
 assert.match(source,/new THREE\.OrthographicCamera/);
 assert.match(source,/camera\.position\.set\(focusX\+13\.5,19\.5,focusZ\+13\.5\)/);
 assert.match(source,/camera\.lookAt\(focusX,0,focusZ\)/);
 assert.match(source,/const focusX=centerX-1\.25,focusZ=centerY-1\.25/);
 assert.match(source,/const cameraViewHeight=mobileBudget\?16\.8:20/);
 assert.match(source,/name\+'\.obj'/);
 assert.match(source,/name\+'\.mtl'/);
 assert.match(source,/materialText\.match/);
 assert.match(source,/\['ironBench',state\.ironBench,'bench_B'\]/);
 assert.match(source,/\['goldBench',state\.goldBench,'bench_B'\]/);
 assert.match(source,/\['jungleBench',state\.jungleBench,'bench_A'\]/);
 // Existing saves and combat authority must not be reimplemented for camera/art.
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
 assert.match(source,/productionReady:false/);
});

test('public Magic Forest never receives developer asset inspector button',()=>{
 const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
 const panel=fs.readFileSync('assets/vibe-runtime-panel.js','utf8');
 assert.doesNotMatch(workflow,/const tag=.*vibe-runtime-panel/);
 assert.doesNotMatch(workflow,/vibe-assets-launcher/);
 assert.doesNotMatch(panel,/createElement\('button'\)|vibe-assets-launcher|vibe-assets-panel/);
 assert.match(panel,/asset-library\.html/);
});

test('native scene drives the default surface display but is not falsely production-certified',()=>{
 assert.match(moduleSource,/WebGLRenderer/);
 assert.match(moduleSource,/Float32BufferAttribute/);
 assert.match(moduleSource,/computeVertexNormals/);
 assert.match(moduleSource,/raycaster\.intersectObjects/);
 assert.match(moduleSource,/function frame\(state,regionAt\)/);
 assert.match(moduleSource,/if\(state\.area!=='surface'/);
 assert.match(index,/data-spatial-dimension="3d-loading"/);
 assert.match(index,/id="world3d"/);
 assert.doesNotMatch(index,/loadForest3DCandidate|id="nativeForest3d"/);
 assert.match(index,/if\(world3d\?\.isActive\(\)\)\{drawMiniMap\(now\);return\}/);
 assert.match(index,/data-gameplay-3d-surface="native-world"/);
 assert.doesNotMatch(index,/get\('preview3d'\)==='1'/);
 assert.match(index,/world3d\.frame\(state,regionAt\)/);
 assert.match(index,/world3d\?\.pick\(e\.clientX,e\.clientY\)/);
 assert.match(index,/world3d\)world3d\.dispose\(\)/);
});

test('3D preview reads existing biome classifier and saved construction state, never regenerates the map',()=>{
 assert.match(index,/world3d\.frame\(state,regionAt\)/);
 assert.match(moduleSource,/function frame\(state,regionAt\)/);
 assert.match(moduleSource,/const classify=typeof regionAt==='function'\?regionAt:/);
 assert.match(moduleSource,/const zone=String\(classify\(px,py\)/);
 assert.match(moduleSource,/for\(const \[i,door\] of \(state\.doors\|\|\[\]\)\.entries\(\)\)/);
 assert.match(moduleSource,/for\(const \[i,chest\] of \(state\.chests\|\|\[\]\)\.entries\(\)\)/);
 assert.match(moduleSource,/addVisibleEntity\('door:'\+/);
 assert.match(moduleSource,/addVisibleEntity\('chest:'\+/);
 assert.match(moduleSource,/getBiome:\(\)=>currentBiome/);
 assert.match(index,/function regionAt\(x,y\)/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});


test('native preview consumes existing environment, character identity and motion directors instead of duplicating behavior',()=>{
 const plants=createVibeEnvironmentVariation({seed:20261020,count:16,mobile:true});
 assert.equal(plants.items.length,16);
 assert.ok(plants.items.every(v=>v.scale>=.82&&v.scale<=1.16));
 const world=createVibeRegionWorldProfile({name:'마력숲',biome:'temperate-forest'},
  {name:'마력숲 생존기',geography:'mixed-biome-survival-world'});
 assert.equal(world.name,'마력숲');
 const weather=createVibeWeatherInteractionProfile({weather:'snow',mobile:true});
 assert.ok(weather.effects.includes('wind-drift'));
 const persona=createVibeCharacterCustomizationRecipe(
  {name:'마력숲 생존자',species:'humanoid',role:'magic',region:'forest'},0);
 assert.ok(Number(persona.body.heightCm)>0);
 const motion=createSurvivalPlayerMotionProfile({platform:'WEB',tool:'AXE'});
 assert.ok(motion.primaryToolMotion.includes('AXE'));
 assert.equal(motion.rootTranslationOwnedByGameplay,true);
 // Source bindings must actually affect visible 3D assets, not merely report a module as installed.
 for(const label of [
  'createVibeEnvironmentVariation({seed:20261020',
  'model.scale.setScalar(scale*variation.scale)',
  'createVibeWeatherInteractionProfile({weather:weatherKind',
  'scene.fog.far=weatherVisualEffects',
  'createVibeCharacterCustomizationRecipe(',
  'avatarRecipe.body.heightCm',
  'new GLTFLoader().loadAsync(HERO_URL.href)',
  'createSurvivalPlayerMotionProfile({platform:\'WEB\'',
  'heroMixer.clipAction(desired)'
 ]) assert.ok(moduleSource.includes(label),'missing actual native Vibe binding: '+label);
});
test('downloaded KayKit mage is ledgered as preview only and source-bound to existing game player',()=>{
 const legal=ledger.entries.find(x=>x.id==='kaykit-adventurers-cc0-v1');
 assert.ok(legal,'KayKit license proof required');
 assert.equal(legal.commercialUse,true);
 assert.equal(legal.modificationUse,true);
 assert.equal(legal.evidence.nativeRuntimeVerification,'PENDING');
 const actor=registry.assets.find(x=>x.id==='external-actor-mage');
 assert.ok(actor);
 assert.equal(actor.license,'CC0-1.0');
 assert.match(actor.path,/mage\.glb$/);
 assert.equal(actor.productionVerified,false);
 assert.match(moduleSource,/HERO_URL.*mage\.glb/);
 assert.match(moduleSource,/hero\.avatar\.position\.set\(centerX,0,centerY\)/);
 assert.match(moduleSource,/state\.keys\?\.size/);
 assert.match(moduleSource,/state\.weather\?\.kind/);
 assert.match(moduleSource,/getAvatarRecipe:\(\)=>avatarRecipe/);
 assert.match(index,/type="importmap"/);
 assert.match(index,/"three":"\.\.\/\.\.\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js"/);
 assert.doesNotMatch(index,/get\('preview3d'\)==='1'/);
 assert.match(index,/data-spatial-dimension="3d-loading"/);
});

test('native 3D binds exact existing monster types and adapts GPU load without changing their combat',()=>{
 assert.match(moduleSource,/NATIVE_CREATURE_MODELS=Object\.freeze/);
 for(const kind of ['wolf','pig','fox','bird','fish']){
  assert.match(moduleSource,new RegExp("^  "+kind+":\\[",'m'));
 }
 for(const id of ['shadowwolf','mossboar','polarfox','worldpheasant','lakefish']){
  assert.match(moduleSource,new RegExp("'"+id+"'"));
  assert.match(index,new RegExp(id+":\\{id:'"+id+"'"));
 }
 assert.doesNotMatch(moduleSource,/assets\\/shared\\/creature-|creature-'\+kind\+suffix/);
 assert.match(moduleSource,/new DecompressionStream\('deflate-raw'\)/);
 assert.match(moduleSource,/parseDownloadedObj\(obj,kind,mtl\)/);
 assert.match(moduleSource,/source\.model\.clone\(\)/);
 assert.match(moduleSource,/faceColor=sourceColors\.get/);
 assert.match(moduleSource,/synchronizeNativeCreatures\(state,px,py,seen\)/);
 assert.match(moduleSource,/actor\.model\.traverse\(child=>\{/);
 assert.match(moduleSource,/actor\.anchor\.position\.set\(e\.x\*SCALE,0,e\.y\*SCALE\)/);
 assert.match(moduleSource,/getUnmappedVisibleMonsterIds:/);
 assert.match(moduleSource,/unsafeUnmappedEncounter/);
 assert.match(moduleSource,/getRenderStats:/);
 assert.match(moduleSource,/renderer\.info\.render\.triangles/);
 assert.match(index,/dataset\.nativeTriangles=String\(nativeDraw\.triangles\)/);
 assert.match(moduleSource,/renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio\|\|1,1\.5\)\*qualityFactor\)/);
 assert.match(index,/MAGIC_FOREST_NATIVE_3D_FRAME_FAILED/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
 assert.match(moduleSource,/productionReady:false/);
});

test('existing Pages pipeline tests actual 3D world after deploy and records 3D failures',()=>{
 const smoke=fs.readFileSync('qa/vibe-browser-smoke.mjs','utf8');
 const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
 assert.match(smoke,/web-games\/fantasy-survival\//);
 assert.match(smoke,/metrics\.drawCalls>4&&metrics\.triangles>400/);
 assert.match(smoke,/game\.keyboard\.down\('d'\)/);
 assert.match(smoke,/restoredX/);
 assert.match(smoke,/server\?\.kill\(\)/);
 assert.match(workflow,/id: forest_native_3d_live_qa/);
 assert.match(workflow,/steps\.forest_native_3d_live_qa\.outcome == 'failure'/);
 assert.match(workflow,/node qa\/vibe-browser-smoke\.mjs/);
});

test('Vibe asset-selector recognizes downloaded similar assets but cannot fake unverified actor/monster readiness',()=>{
 const plan=planAssetApplication({
  prompt:'마력숲 캐릭터 몬스터 숲 나무',
  manifest:{assets:[
   {id:'external-tinytreats-tree-v1',types:['prop','background'],
    path:'assets/shared/homely-house/tree.obj',license:'CC0',downloaded:true},
   {id:'external-actor-mage',types:['character'],
    path:'assets/roblox/actors/native/mage.glb',license:'CC0-1.0',
    downloaded:true,verifiedAnimation:false}
  ]}
 });
 assert.ok(plan.matched.some(x=>x.id==='external-tinytreats-tree-v1'));
 assert.ok(plan.missingTypes.includes('character'),'an unverified actor must not be promoted');
 assert.ok(plan.missingTypes.includes('enemy'),'similar-species monster downloads are still required');
 assert.equal(plan.sourceBindingVerified,false);
 assert.equal(plan.nativeRuntimeVerified,false);
 assert.equal(plan.appliedToGame,false);
 assert.equal(plan.ready,false);
 assert.match(moduleSource,/planAssetApplication\(/);
 assert.match(moduleSource,/getMissingAssetTypes:\(\)=>assetReadiness\.missingTypes/);
 assert.match(moduleSource,/productionReady:false/);
});


test('downloaded KayKit skeleton is only a license-proven undead species proxy and never alters monster behavior',()=>{
 const legal=ledger.entries.find(e=>e.id==='kaykit-skeletons-cc0-v1');
 assert.ok(legal,'official KayKit Skeletons CC0 source evidence must be present');
 assert.equal(legal.license,'CC0-1.0');
 assert.equal(legal.commercialUse,true);
 assert.equal(legal.modificationUse,true);
 assert.equal(legal.evidence.nativeRuntimeVerification,'PENDING');
 assert.equal(legal.evidence.publicReleaseClaimed,false);
 assert.match(legal.evidence.licenseUrl,/KayKit-Character-Pack-Skeletons-1\.0/);
 const actor=registry.assets.find(x=>x.id==='external-actor-skeleton-warrior');
 assert.ok(actor);
 assert.equal(actor.productionVerified,false);
 assert.equal(actor.license,'CC0-1.0');
 assert.ok(actor.sourceHash&&actor.sourceHash.length===64);
 assert.match(actor.path,/skeleton-warrior\.glb$/);
 assert.match(moduleSource,/UNDEAD_URL.*skeleton-warrior\.glb/);
 assert.match(moduleSource,/cloneAnimatedRig\(undeadSource\)/);
 assert.match(moduleSource,/synchronizeUndead\(state,px,py,seen\)/);
 assert.match(moduleSource,/e\?\.type\?\.id==='wastelandMummy'/);
 assert.match(moduleSource,/actor\.anchor\.position\.set\(e\.x\*SCALE,0,e\.y\*SCALE\)/);
 assert.match(moduleSource,/actor\.mixer\.clipAction\(clip\)/);
 assert.match(moduleSource,/actor\.model\.traverse\(child=>\{/);
 assert.match(moduleSource,/child\.userData\.worldPoint=\{x:e\.x,y:e\.y\}/);
 assert.match(moduleSource,/interactables\.push\(child\)/);
 assert.match(moduleSource,/undeadProxySourceLoaded:!!undeadSource/);
 assert.match(moduleSource,/productionReady:false/);
 assert.match(index,/wastelandMummy:\{id:'wastelandMummy',name:'황무지 미라',mood:'aggressive',hp:1800,dmg:88,speed:64,r:30/);
});

test('3D creature meshes come from downloaded CC0 original archives, not generated studio creature rigs',()=>{
 const wildlife=JSON.parse(fs.readFileSync('assets/external/simple-rpg/wildlife/manifest.json','utf8'));
 const expected=['wolf-eagle.zip','farm-animals.zip','five-animals.zip'];
 const namesByArchive={
   'wolf-eagle.zip':['wolf'],
   'farm-animals.zip':['pig'],
   'five-animals.zip':['red fox','bird','fish']
 };
 for(const file of expected){
   const record=wildlife.packs.find(x=>x.file===file);
   assert.ok(record,'missing CC0 source license record: '+file);
   assert.equal(record.license,'CC0-1.0');
   assert.equal(record.sourceOnly,true,'original must remain unchanged');
   const archive=fs.readFileSync('assets/external/simple-rpg/wildlife/'+file);
   assert.equal(archive.subarray(0,2).toString(),'PK');
   assert.equal(createHash('sha256').update(archive).digest('hex'),record.sha256);
   const signature=Buffer.from([0x50,0x4b,0x05,0x06]);
   const eocd=archive.lastIndexOf(signature);
   assert.ok(eocd>0,'source ZIP directory missing: '+file);
   let entryOffset=archive.readUInt32LE(eocd+16);
   const names=[];
   for(let i=0;i<archive.readUInt16LE(eocd+10);i++){
     assert.equal(archive.readUInt32LE(entryOffset),0x02014b50);
     const nameLength=archive.readUInt16LE(entryOffset+28),extra=archive.readUInt16LE(entryOffset+30);
     const comment=archive.readUInt16LE(entryOffset+32);
     names.push(archive.subarray(entryOffset+46,entryOffset+46+nameLength).toString('utf8').toLowerCase());
     entryOffset+=46+nameLength+extra+comment;
   }
   for(const species of namesByArchive[file]){
     for(const extension of ['obj','mtl'])
       assert.ok(names.some(name=>name.endsWith('/obj/'+species+'.'+extension)
         ||name===species+'.'+extension),
       'downloaded original '+file+' missing '+species+'.'+extension);
   }
   assert.ok(moduleSource.includes("file:'"+file+"'"));
 }
 assert.match(moduleSource,/NATIVE_CREATURE_MODELS=Object\.freeze/);
 assert.doesNotMatch(moduleSource,/new THREE\.(?:BoxGeometry|SphereGeometry)/);
 assert.match(moduleSource,/productionReady:false/);
});
