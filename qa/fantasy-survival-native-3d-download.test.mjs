// Verify downloaded native 3D asset identity before any Magic Forest release.
// Static/source evidence is not a substitute for WebGL and mobile gameplay QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
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

// 화면 QA: 기존 게임 핸들러를 재사용하는 모바일 다크 판타지 구성.
test('mobile ARPG HUD preserves existing survival mechanics and only uses CSS artwork',()=>{
 const hud=index.match(/<div class="hud" data-mobile-layout="dark-fantasy-action-rpg">[\s\S]*?<\/details><\/div>/)?.[0]||'';
 assert.ok(hud,'mobile ARPG HUD missing');
 for(const id of ['heroPortrait','hpfill','hptext','foodfill','foodtext','questText','weapon','tool','armor','zone','kills','save','resetSave','bestiary','achievements','multi','options','avatarOpen','toTitle']){
  assert.ok(hud.includes('id="'+id+'"'),'original survival HUD control missing: '+id);
 }
 for(const id of ['stick','knob','craft','inventory','map','attack','petSpecial','dismount','buildBlueprint','sheet','sheetBody','smeltPanel','multiPanel','optionsPanel','avatarPanel']){
  assert.equal((index.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'duplicate or missing control: '+id);
 }
 assert.match(index,/id="heroPortrait"[\s\S]*?aria-label="캐릭터 장비와 가방 열기"/);
 assert.match(index,/document\.getElementById\('heroPortrait'\)\.addEventListener\('click',openInventory\)/);
 // 기존 모험가 메뉴의 외형 변경과 게임 시작 단계 꾸미기는 그대로 남긴다.
 assert.match(index,/document\.getElementById\('avatarOpen'\)\.addEventListener\('click',openAvatarCustomizer\)/);
 assert.match(index,/document\.getElementById\('startAvatar'\)\.addEventListener\('click',openAvatarCustomizer\)/);
 const ui=index.split('/* 마력숲 모바일 액션 RPG:')[1]?.split('</style>')[0]||'';
 assert.match(ui,/\.actions>#attack/);
 assert.match(ui,/\.sheetHead/);
 assert.match(ui,/\.hudMenuPanel/);
 assert.match(ui,/@media\(max-width:720px\)/);
 assert.match(ui,/@media\(orientation:landscape\)/);
 assert.doesNotMatch(ui,/(?:https?:\/\/|url\(|\.png\b|\.svg\b|\.jpe?g\b|\.webp\b)/i,
   'new UI artwork must be CSS only unless a license-verified CC0 source is registered');
 // 세 개 일반 버튼은 별도 메뉴에만 배치. 원래 핸들러와 ID를 그대로 유지한다.
 const quick=index.match(/<nav class="quickMenu" aria-label="빠른 메뉴">([\s\S]*?)<\/nav>/)?.[1]||'';
 const combat=index.match(/<div class="actions" aria-label="전투 조작">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.ok(quick&&combat,'quick-menu and combat zones must both exist');
 for(const id of ['inventory','craft','map']){
  assert.ok(quick.includes('id="'+id+'"'),'utility control missing from quick-menu: '+id);
  assert.ok(!combat.includes('id="'+id+'"'),'utility button overlaps combat thumb area: '+id);
 }
 for(const id of ['autoCombat','quickHeal','quickFood','attack','buildBlueprint','petSpecial','dismount']){
  assert.ok(combat.includes('id="'+id+'"'),'existing combat action missing: '+id);
 }
 // 왼손 모드, 접근성 버튼 크기, 임무 접기는 별도 저장 설정이다.
 for(const id of ['hudHandedness','hudSize','hudQuestMode','questToggle','hudGuideOpen','hudGuideClose','hudGuide']){
  assert.equal((index.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
    'mobile convenience control missing or duplicated: '+id);
 }
 assert.match(index,/HUD_UI_SAVE_KEY='magic-forest-ui-v1'/);
 assert.match(index,/function changeHudUi\(kind,value\)/);
 assert.match(index,/document\.body\.dataset\.hudHand=hudUi\.hand/);
 assert.match(index,/document\.body\.dataset\.hudSize=String\(hudUi\.size\)/);
 assert.match(index,/document\.body\.dataset\.questMode=hudUi\.quest/);
 assert.match(index,/id="miniMapWrap"[\s\S]*?aria-label="지도를 열기"/);
 assert.match(index,/document\.getElementById\('miniMapWrap'\)\.addEventListener\('click',\(\)=>ui\.mapBtn\.click\(\)\)/);
 assert.match(ui,/body\[data-hud-hand="left"\]/);
 assert.match(ui,/body\[data-hud-size="108"\]/);
 assert.match(ui,/\.quickMenu/);
 assert.match(ui,/\.hudGuide\[hidden\]/);
 assert.match(ui,/\.questToggle/);
 assert.match(index,/<script>\s*\(\(\)=>\{'use strict';/,
   'authoritative gameplay script must remain present');
 assert.match(index,/AVATAR_SAVE_KEY='jaewoon_fantasy_survival_avatar_v1'/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
 assert.match(moduleSource,/productionReady:false/);
});

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
 assert.match(source,/new THREE\.InstancedMesh\(sourceFloor\.geometry,sourceFloor\.material,49\)/);
 assert.match(source,/Original CC0 MTL diffuse missing/);
 assert.doesNotMatch(source,/new THREE\.PlaneGeometry\(/);
 assert.doesNotMatch(source,/const PALETTE\s*=/);
 assert.doesNotMatch(source,/new THREE\.BoxGeometry\(/);
 assert.doesNotMatch(source,/new THREE\.SphereGeometry\(/);
 assert.match(source,/new THREE\.OrthographicCamera/);
 assert.match(source,/camera\.position\.set\(centerX\+10\.5,17,centerY\+13\)/);
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

test('public games use exactly their authored asset scripts, never injected or stripped at build',()=>{
 const workflow=fs.readFileSync('.github/workflows/magic-forest-pages.yml','utf8');
 const panel=fs.readFileSync('assets/vibe-runtime-panel.js','utf8');
 const owner=fs.readFileSync('.github/workflows/owner-fast-pages-publish.yml','utf8');
 const ocean=fs.readFileSync('web-games/ocean-voyage/index.html','utf8');
 assert.doesNotMatch(workflow,/const tag='<script defer src="\/jaewoon-games\/assets\/vibe-runtime-panel\.js"/);
 assert.doesNotMatch(workflow,/withoutInspector=html\.replace/);
 assert.doesNotMatch(workflow,/PUBLIC_GAME_DEV_INSPECTOR_INJECTION_FORBIDDEN|VIBE_OPTIONAL_DEV_INSPECTOR_CLEANED/);
 assert.doesNotMatch(owner,/const clean=html\.replace|PUBLIC_ASSET_INSPECTOR_STILL_PRESENT/);
 assert.match(owner,/OWNER_PAGES_GAME_OWNED_HTML=UNCHANGED/);
 assert.doesNotMatch(panel,/script\?\.dataset\?\.vibeOwnerInspector!=='enabled'/);
 assert.match(panel,/if\(!gameId\|\|document\.getElementById\('vibe-assets-launcher'\)\)return/);
 assert.doesNotMatch(ocean,/vibe-runtime-panel\.js/);
});

test('native scene drives the default surface display but is not falsely production-certified',()=>{
 assert.match(moduleSource,/WebGLRenderer/);
 assert.match(moduleSource,/Float32BufferAttribute/);
 assert.match(moduleSource,/computeVertexNormals/);
 assert.match(moduleSource,/raycaster\.intersectObjects/);
 assert.match(moduleSource,/function frame\(state,regionAt,regionScene=null\)/);
 assert.match(moduleSource,/const isInterior=state\.area!=='surface'/);
 assert.match(index,/data-spatial-dimension="3d-loading"/);
 assert.match(index,/id="world3d"/);
 assert.doesNotMatch(index,/loadForest3DCandidate|id="nativeForest3d"/);
 assert.match(index,/if\(world3d\?\.isActive\(\)\)\{drawMiniMap\(now\);return\}/);
 assert.match(index,/data-gameplay-3d-surface="native-world"/);
 assert.doesNotMatch(index,/get\('preview3d'\)==='1'/);
 assert.match(index,/world3d\.frame\(state,regionAt,NATIVE_SCENE_LANDMARKS\[state\.area\]\)/);
 assert.match(index,/world3d\?\.pick\(e\.clientX,e\.clientY\)/);
 assert.match(index,/world3d\)world3d\.dispose\(\)/);
});

test('3D preview reads existing biome classifier and saved construction state, never regenerates the map',()=>{
 assert.match(index,/world3d\.frame\(state,regionAt,NATIVE_SCENE_LANDMARKS\[state\.area\]\)/);
 assert.match(moduleSource,/function frame\(state,regionAt,regionScene=null\)/);
 assert.match(moduleSource,/const classify=typeof regionAt==='function'\?regionAt:/);
 assert.match(moduleSource,/tile\.position\.set\(gx-floorCenterX,floorSurfaceY,gz-floorCenterZ\)/);
 assert.match(moduleSource,/for\(const \[i,door\] of \(state\.doors\|\|\[\]\)\.entries\(\)\)/);
 assert.match(moduleSource,/for\(const \[i,chest\] of \(state\.chests\|\|\[\]\)\.entries\(\)\)/);
 assert.match(moduleSource,/addVisibleEntity\('door:'\+/);
 assert.match(moduleSource,/addVisibleEntity\('chest:'\+/);
 assert.match(moduleSource,/getBiome:\(\)=>currentBiome/);
 assert.match(index,/function regionAt\(x,y\)/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});


// [바닥·모션 회귀] 원본 3D 자산, 지역 연결, 움직임 판정과 렌더링 책임 분리를 확인한다.
test('native forest ground has no 10x10 pitch mismatch and all rounded corners are covered by source mesh',()=>{
 const model=fs.readFileSync(home+'floor_base.obj','utf8');
 const vertices=[...model.matchAll(/^v\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/gm)]
   .map(match=>match.slice(1,4).map(Number));
 assert.ok(vertices.length>90);
 const width=Math.max(...vertices.map(p=>p[0]))-Math.min(...vertices.map(p=>p[0]));
 const depth=Math.max(...vertices.map(p=>p[2]))-Math.min(...vertices.map(p=>p[2]));
 assert.equal(width,10);assert.equal(depth,8,'source floor is not square');
 assert.match(moduleSource,/sourceFloor\.geometry\.computeBoundingBox\(\)/);
 assert.match(moduleSource,/const floorPitchZ=floorBounds\.max\.z-floorBounds\.min\.z/);
 assert.match(moduleSource,/Math\.round\(centerY\/floorPitchZ\)/);
 assert.match(moduleSource,/new THREE\.InstancedMesh\(sourceFloor\.geometry,sourceFloor\.material,36\)/);
 assert.match(moduleSource,/floorSeamTiles\.setMatrixAt\(seamTileIndex,tile\.matrix\)/);
 assert.match(moduleSource,/floorSeamTiles\.instanceColor\.needsUpdate=true/);
 assert.match(moduleSource,/centerTileX!==lastFloorGridX\|\|centerTileY!==lastFloorGridZ/);
 assert.match(moduleSource,/scene\.remove\(floorSeamTiles\);floorSeamTiles\.dispose\(\)/);
 assert.doesNotMatch(moduleSource,/new THREE\.(?:PlaneGeometry|BoxGeometry|SphereGeometry)\(/);
});
test('native forest movement clips are faster without changing gameplay-owned world movement or combat rules',()=>{
 assert.match(moduleSource,/const moving=lastHeroPoseAt>0&&poseElapsed<=300&&moveDelta>\.06/);
 assert.match(moduleSource,/heroAction\.setDuration\(selectedAppearance\?\.model==='mage'\?\.43/);
 assert.match(moduleSource,/heroAction\.setEffectiveTimeScale\(pose==='move'\?1\.3:1\)/);
 assert.match(moduleSource,/actor\.action\.setEffectiveTimeScale\(attacking\?1\.35:moving\?1\.25:1\)/);
 assert.match(moduleSource,/heroMixer\.update\(Math\.min\(\.12,/);
 assert.match(moduleSource,/hero\.avatar\.position\.set\(centerX,0,centerY\)/);
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
  'new GLTFLoader().loadAsync(source.href)',
  'createSurvivalPlayerMotionProfile({platform:\'WEB\'',
  'heroMixer.clipAction(desired)'
 ]) assert.ok(moduleSource.includes(label),'missing actual native Vibe binding: '+label);
});
// 커스터마이징 정적 회귀: 실제 GLB 5종과 장부, 기존 저장·전투 보존.
// 실제 공개 브라우저/모바일 게임 작동 여부는 별도 런타임 검증이 필요하다.
test('CC0 five-choice 3D player customizer is source-bound and does not rewrite gameplay saves',()=>{
 const models=['knight','mage','barbarian','rogue','rogue-hooded'];
 const source=ledger.entries.find(x=>x.id==='kaykit-adventurers-cc0-v1');
 assert.ok(source&&source.license==='CC0-1.0'&&source.commercialUse===true);
 assert.match(source.evidence.licenseUrl,/KayKit-Character-Pack-Adventures-1\.0/);
 for(const name of models){
  const path='assets/roblox/actors/native/'+name+'.glb';
  const registered=registry.assets.find(x=>x.path===path);
  assert.ok(registered,'CC0 registry entry missing: '+name);
  assert.equal(registered.license,'CC0-1.0');
  const data=fs.readFileSync(path);
  assert.ok(data.length>100000,'real original GLB binary missing: '+name);
  assert.equal(data.toString('utf8',0,4),'glTF','GLB header missing: '+name);
  assert.ok(moduleSource.includes(name+'.glb'),'3D choice missing: '+name);
  assert.match(index,new RegExp('value="'+name+'"'));
 }
 assert.match(index,/id="startAvatar"/);
 assert.match(index,/id="avatarOpen"/);
 assert.match(index,/id="avatarPanel"/);
 assert.match(index,/AVATAR_SAVE_KEY='jaewoon_fantasy_survival_avatar_v1'/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
 assert.match(index,/module\.createWorld3d\(document\.getElementById\('world3d'\),avatarAppearance,state\)/);
 assert.match(moduleSource,/async function setAvatarAppearance\(requested\)/);
 assert.match(moduleSource,/getAvatarAppearance:\(\)=>\(\{\.\.\.selectedAppearance\}\)/);
 assert.match(moduleSource,/productionReady:false/);
});

test('downloaded KayKit knight is ledgered as preview only and source-bound to existing game player',()=>{
 const legal=ledger.entries.find(x=>x.id==='kaykit-adventurers-cc0-v1');
 assert.ok(legal,'KayKit license proof required');
 assert.equal(legal.commercialUse,true);
 assert.equal(legal.modificationUse,true);
 assert.equal(legal.evidence.nativeRuntimeVerification,'PENDING');
 const actor=registry.assets.find(x=>x.id==='external-actor-knight');
 assert.ok(actor);
 assert.equal(actor.license,'CC0-1.0');
 assert.match(actor.path,/knight\.glb$/);
 assert.equal(actor.productionVerified,false);
 assert.match(moduleSource,/HERO_URL.*knight\.glb/);
 assert.match(moduleSource,/hero\.avatar\.position\.set\(centerX,0,centerY\)/);
 // 발 모션은 눌린 키가 아니라 실제 게임 좌표 변화를 따르도록 검사한다.
 assert.match(moduleSource,/const moving=lastHeroPoseAt>0&&poseElapsed<=300&&moveDelta>\.06/);
 assert.match(moduleSource,/hero\.avatar\.position\.set\(centerX,0,centerY\)/);
 assert.match(moduleSource,/state\.weather\?\.kind/);
 assert.match(moduleSource,/getAvatarRecipe:\(\)=>avatarRecipe/);
 assert.match(index,/type="importmap"/);
 assert.match(index,/"three":"\.\.\/\.\.\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js"/);
 assert.doesNotMatch(index,/get\('preview3d'\)==='1'/);
 assert.match(index,/data-spatial-dimension="3d-loading"/);
});

// 원본 자산 실패 후에도 모바일 3D 진행과 기존 저장을 복구하는 연결 검사.
test('original 3D model retry restores FBX OBJ and native mobile input without replacing game actors',()=>{
 assert.match(moduleSource,/new FBXLoader\(\)\.setResourcePath\(CREATURE_SOURCE\.href\)/);
 assert.match(moduleSource,/\.parse\(await response\.arrayBuffer\(\),CREATURE_SOURCE\.href\)/);
 assert.match(moduleSource,/model=await new OBJLoader\(\)\.loadAsync\(url\.href\)/);
 assert.match(moduleSource,/void new THREE\.TextureLoader\(\)\.loadAsync/);
 assert.match(moduleSource,/material\.map=texture;material\.needsUpdate=true/);
 assert.match(moduleSource,/function retryMissingCreatures\(state\)/);
 assert.match(moduleSource,/if\(retried\)nextCreatureScan=0/);
 assert.match(moduleSource,/getFailedCreatureSources:/);
 assert.match(index,/world3d\.retryMissingCreatures\(state\)/);
 assert.match(index,/주변 생물의 3D 모델 확인 중/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
 assert.match(index,/id="autoCombat"/);
 assert.match(index,/id="regionTravel"/);
});

test('native creature source failures recover without permanent mobile loading lock',()=>{
  assert.ok(moduleSource.includes('const retryDelay=failed?Math.min(60000,5000*2**Math.min(4,failed.attempts-1)):0'));
  assert.ok(!moduleSource.includes('failed.attempts>=3'));
  assert.ok(moduleSource.includes('creatureFailures.delete(file)'));
  assert.ok(moduleSource.includes('nativeSpeciesMaterials=new Map()'));
  assert.ok(moduleSource.includes('material.color.lerp(tint,.22)'));
  assert.ok(moduleSource.includes('for(const material of materials.values())material.dispose()'));
  assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});

test('native 3D binds exact existing monster types and adapts GPU load without changing their combat',()=>{
 assert.match(moduleSource,/NATIVE_CREATURE_MODELS=Object\.freeze/);
 const original=ledger.entries.find(e=>e.id==='forest-cc0-originals-20261020');
 assert.ok(original);
 for(const item of original.evidence.files){
  const bytes=fs.readFileSync(item.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
  const archive=fs.readFileSync(item.archive);
  assert.ok(archive.length>1000,item.archive);
 }
 assert.doesNotMatch(moduleSource,/shared\/creature-/);
 assert.match(moduleSource,/new FBXLoader/);
 assert.match(moduleSource,/new OBJLoader/);
 for(const id of ['shadowwolf','golem','giantspider','worldtreesnake']){
  assert.match(moduleSource,new RegExp("'"+id+"'"));
  assert.match(index,new RegExp(id+":\\{id:'"+id+"'"));
 }
 assert.match(moduleSource,/synchronizeNativeCreatures\(state,px,py,seen\)/);
 assert.match(moduleSource,/actor\.model\.traverse\(child=>\{/);
 assert.match(moduleSource,/const destX=e\.x\*SCALE,destZ=e\.y\*SCALE/);
 assert.match(moduleSource,/actor\.anchor\.position\.set\(destX,0,destZ\)/);
 assert.match(moduleSource,/getUnmappedVisibleMonsterIds:/);
 assert.match(moduleSource,/unsafeUnmappedEncounter/);
 assert.match(moduleSource,/getRenderStats:/);
 assert.match(moduleSource,/renderer\.info\.render\.triangles/);
 assert.match(index,/dataset\.nativeTriangles=String\(nativeDraw\.triangles\)/);
 assert.match(moduleSource,/renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio\|\|1,mobileBudget\?\.82:\.95\)\*qualityFactor\)/);
  assert.match(moduleSource,/Math\.max\(mobileBudget\?\.48:\.58,qualityFactor-\.13\)/);
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
   {id:'external-actor-knight',types:['character'],
    path:'assets/roblox/actors/native/knight.glb',license:'CC0-1.0',
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
 assert.match(moduleSource,/const destX=e\.x\*SCALE,destZ=e\.y\*SCALE/);
 assert.match(moduleSource,/actor\.anchor\.position\.set\(destX,0,destZ\)/);
 assert.match(moduleSource,/actor\.mixer\.clipAction\(clip\)/);
 assert.match(moduleSource,/actor\.model\.traverse\(child=>\{/);
 assert.match(moduleSource,/child\.userData\.worldPoint=\{x:e\.x,y:e\.y,monsterId:e\.netId\}/);
 assert.match(moduleSource,/interactables\.push\(child\)/);
 assert.match(moduleSource,/get undeadProxySourceLoaded\(\)\{return !!undeadSource\}/);
 assert.match(moduleSource,/productionReady:false/);
 assert.match(index,/wastelandMummy:\{id:'wastelandMummy',name:'황무지 미라',mood:'aggressive',hp:1800,dmg:88,speed:64,r:30/);
});

test('Vibe graphics selection excludes generated and commercially licensed non-CC0 content',()=>{
 const plan=planAssetApplication({prompt:'숲 나무 소품',manifest:{assets:[
  {id:'cc0-tree',types:['prop'],path:'tree.obj',license:'CC0-1.0',downloaded:true},
  {id:'generated-tree',types:['prop'],path:'generated.obj',license:'project-original'},
  {id:'commercial-tree',types:['prop'],path:'paid.obj',license:'CC-BY-4.0'},
  {id:'fake-download',types:['prop'],path:'fake.obj',license:'CC0',downloaded:false}
 ]}});
 assert.ok(plan.matched.some(x=>x.id==='cc0-tree'));
 assert.ok(plan.matched.every(x=>!['generated-tree','commercial-tree','fake-download'].includes(x.id)));
});

test('CC0 action profile selects exact source clips and leaves combat authority in the original game',()=>{
 const motion=createSurvivalPlayerMotionProfile({platform:'WEB',tool:'SPEAR'});
 assert.equal(motion.cc0Clips.attack,'1H_Melee_Attack_Stab');
 assert.equal(motion.cc0Clips.run,'Running_A');
 assert.equal(motion.cc0Clips.idle,'Idle');
 assert.match(moduleSource,/clip\.name===clipName/);
 assert.match(moduleSource,/THREE\.LoopOnce/);
 assert.match(moduleSource,/attackAt!==lastHeroAttackAt/);
});

// 회귀: 실제 동기화 함수를 실행해 모바일 군집의 2D 복귀 재발을 막는다.
test('mapped crowds remain native 3D without losing visible enemies',()=>{
 const body=moduleSource.split('function synchronizeNativeCreatures(state,px,py,stamp){')[1]
  ?.split('\n  if(hero)scene.add(hero.avatar);')[0];
 assert.ok(body,'native creature synchronization missing');
 const actors=new Map(),missing=new Set(),interactables=[],speciesMaterials=new Map();
 let clones=0;
 const material={uuid:'existing-wolf-material',clone(){clones++;return {color:{lerp(){}}}}};
 const source={model:{},clips:[],height:1,floor:0};
 const vector=()=>({set(){}});
 class Group{constructor(){this.position=vector();this.rotation={};this.userData={}}add(){}}
 const sync=new Function('mobileBudget','qualityFactor','missingVisibleMonsterIds',
  'NATIVE_CREATURE_BY_ID','nativeCreatureSources','undeadSource','nativeCreatureActors',
  'nativeSpeciesMaterials','cloneAnimatedRig','THREE','scene','interactables','performance','SCALE',
  'cameraFrustum','creatureBounds','syncBestiaryName',
  'return function synchronizeNativeCreatures(state,px,py,stamp){'+body)(
   true,.58,missing,new Map([['shadowwolf','wolf.fbx']]),new Map([['wolf.fbx',source]]),
   null,actors,speciesMaterials,()=>({scale:{setScalar(){}},position:{},
     traverse(fn){fn({isMesh:true,material,userData:{}})}}),
   {Group,Color:class{constructor(){} }}, {add(){},remove(){}},interactables,{now:()=>1000},1/48,
   {intersectsSphere:bounds=>bounds.center.x<100},
   {center:{x:0,set(x){this.x=x}}},()=>{}
  );
 const state={area:'surface',enemies:Array.from({length:24},(_,i)=>({
  id:'wolf-'+i,type:{id:'shadowwolf',r:19},area:'surface',x:i,y:0,hp:95
 }))};
 const before=JSON.stringify(state);
 assert.equal(sync(state,0,0,1),false,'mapped crowd must not request 2D fallback');
 assert.equal(actors.size,24,'visible actors cannot be dropped at the former mobile cap');
 assert.equal(interactables.length,24,'every visible enemy must remain tappable');
 assert.equal(clones,1,'the same monster species must share exactly one tinted material');
 assert.equal(missing.size,0);
 assert.equal(JSON.stringify(state),before,'rendering must not mutate gameplay state');
 // 모바일 낮은 화질에서도 화면 안의 원거리 몹은 생략하지 않는다.
 state.enemies=[{id:'far-visible',type:{id:'shadowwolf',r:19},area:'surface',x:1100,y:0,hp:95}];
 assert.equal(sync(state,0,0,2),false,'low quality must not hide a visible distant enemy');
 assert.equal(actors.size,1,'a visible monster must retain its 3D actor at 1100 world units');
 assert.equal(missing.size,0);
 state.enemies=[{id:'missing',type:{id:'unknown'},area:'surface',x:600,y:0,hp:10}];
 assert.equal(sync(state,0,0,3),true,'an on-screen distant missing enemy must block native gameplay too');
 assert.deepEqual([...missing],['unknown']);
 assert.equal(actors.size,0,'departed crowd must release its actor instances');
});

// 압축: 내려받은 원본과 해제 후 바이트가 같아야 리그·모션 보존으로 인정한다.
test('game-specific compressed assets preserve original bytes and source hashes',()=>{
 const entry=ledger.entries.find(e=>e.id==='fantasy-survival-lossless-transfer-v1');
 assert.equal(entry.license,'CC0-1.0');
 for(const field of ledger.policy.requiredFields)assert.ok(field in entry,'license provenance field missing: '+field);
 for(const file of entry.evidence.files){
  const bytes=fs.readFileSync(file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  assert.ok(bytes.length<file.sourceBytes*.4,'compressed payload must be smaller');
  if(file.sourcePath){
   const original=fs.readFileSync(file.sourcePath);
   assert.equal(createHash('sha256').update(original).digest('hex'),file.sourceSha256);
   assert.deepEqual(gunzipSync(bytes),original,'rig/clip bytes changed');
  }else{
   const packed=JSON.parse(gunzipSync(bytes));
   for(const parent of file.sources){
    const name=parent.path.split('/').at(-1),[kind,ext]=name.split('.');
    const original=fs.readFileSync(parent.path);
    assert.equal(createHash('sha256').update(original).digest('hex'),parent.sha256);
    assert.equal(packed[kind][ext],original.toString('utf8'));
   }
  }
 }
 assert.match(moduleSource,/parseAsync\(bytes/);
 assert.match(moduleSource,/mergeVertices\(geometry,1e-6\)/);
});

test('all authored biomes use original instanced scenery without changing interactions',()=>{
 const biomes=['forest','jungle','swamp','snow','canyon','volcano','crystal','giantlake',
   'worldtree','flowerfield','giantgarden','desert'];
 const mapping=moduleSource.split('const SCENERY_KIND=Object.freeze({')[1]?.split('});')[0]||'';
 assert.ok(mapping,'all region scenery mapping required');
 for(const biome of biomes)assert.ok(mapping.includes(biome+':'),'unmapped biome: '+biome);
 for(const token of [
   'new THREE.InstancedMesh(original.geometry,original.material,49)',
   'const sceneryChoices=SCENERY_KIND[tileZone]',
   'let batch=sceneryBatches.get(kind)',
   'if(!batch&&models.has(kind))',
   'models.size!==lastSceneryModelCount',
   'if(tx!==0||tz!==0)',
   'const seen=++frameSequence',
   'loadRemaining:async(priorityNames=[])',
   'stagedModels.loadRemaining(priorityModels)',
   'for(const {mesh} of sceneryBatches.values()){scene.remove(mesh);mesh.dispose()}',
   'interactables.push(model)',
   'if(unsafeUnmappedEncounter||!hero)'
 ])assert.ok(moduleSource.includes(token),'original scene invariant missing: '+token);
 assert.doesNotMatch(moduleSource,/new THREE\.PlaneGeometry\(|new THREE\.BoxGeometry\(/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});

test('fast loading streams CC0 scenery after first frame and renders authored region coordinates',()=>{
 assert.match(moduleSource,/new Set\(\['floor_base'\]\)/);
 assert.match(moduleSource,/if\(!extraModelsStarted\)/);
 assert.match(moduleSource,/stagedModels\.loadRemaining\(priorityModels\)/);
 assert.match(moduleSource,/const isInterior=state\.area!=='surface'/);
 assert.match(moduleSource,/regionScene\?\.landmarks/);
 assert.match(index,/rel="modulepreload" href="\.\/world3d\.mjs"/);
 assert.match(index,/rel="preload" href="\.\/models\.json\.gz"/);
 assert.match(index,/world3d\.frame\(state,regionAt,NATIVE_SCENE_LANDMARKS\[state\.area\]\)/);
 for(const name of ['underwater','underground','worldtreeinside','questcave','storylab1','storylab2',
  'jungletemple','jungletemple-upper','jungletemple-lower','jungletemple-secret'])
  assert.ok(index.includes(name+':{landmarks:')||index.includes("'"+name+"':{landmarks:"),'region mapped: '+name);
 assert.match(index,/'goblinoutpost-'\+floor/);
 assert.match(moduleSource,/NATIVE_CREATURE_BY_ID\.get\(e\.type\?\.id\)/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});

test('streaming is nearest-first bounded and never requests the full species library at startup',()=>{
 assert.doesNotMatch(moduleSource,/Object\.keys\(NATIVE_CREATURE_MODELS\)\.map/);
 assert.match(moduleSource,/distance>1200/);
 assert.match(moduleSource,/loadingCreatureCount>=\(mobileBudget\?6:10\)/);
 const renderer=moduleSource.split('function synchronizeNativeCreatures(state,px,py,stamp){')[1]?.split('  if(hero)scene.add(hero.avatar);')[0]||'';
 assert.doesNotMatch(renderer,/near\*qualityFactor|distance>Math\.max\(430/,'GPU quality scaling must not cull visible monsters');
 const streaming=moduleSource.split('cameraFrustum.setFromProjectionMatrix(cameraProjection);')[1]?.split(' const classify=')[0]||'';
 assert.match(streaming,/if\(distance>1200\)/,'distant visible species should be considered during streaming');
 assert.match(streaming,/cameraFrustum\.intersectsSphere\(creatureBounds\)/,'distant offscreen species should be filtered before loading');
 assert.doesNotMatch(moduleSource,/failed\.attempts>=3/);
 assert.match(moduleSource,/sampleNow-failed\.at<retryDelay/);
 assert.match(moduleSource,/if\(disposed\)\{/);
 assert.match(moduleSource,/worldPoints\?\.\[hit\.instanceId\]/);
});

test('loading and errors never invoke a 2D gameplay renderer',()=>{
 const draw=index.split('function draw(){')[1]?.split('function syncRuntimeMeta()')[0];
 assert.ok(draw);
 assert.doesNotMatch(draw,/drawBackground|drawCreature|drawPlayer|drawCave|drawUnderwater/);
 assert.match(index,/if\(ready\)\{update\(dt,now\);syncRuntimeMeta\(\);updateQuestGuide\(now\);draw\(\)\}/);
 assert.match(index,/nativeStatus\.hidden=ready/);
 assert.match(index,/nativeRetry\.addEventListener\('click'/);
 assert.doesNotMatch(index,/3d-fallback-/);
 assert.match(moduleSource,/if\(document\.hidden\)/);
 assert.match(moduleSource,/stableQualityWindows>=3/);
});


test('mobile native renderer does not drop visible monsters at a hidden cap',()=>{
 const source=fs.readFileSync('web-games/fantasy-survival/world3d.mjs','utf8');
 const html=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');
 assert.match(source,/const cameraFrustum=new THREE.Frustum\(\)/);
 assert.match(source,/cameraFrustum\.intersectsSphere\(creatureBounds\)/);
 assert.match(source,/cameraFrustum\.setFromProjectionMatrix\(cameraProjection\)/);
 assert.doesNotMatch(source,/displayed>=\(mobileBudget\?12:22\)/);
 assert.match(source,/missingVisibleMonsterIds\.add/);
 assert.match(html,/dataset\.nativeMissingMonsterIds=world3d\.getUnmappedVisibleMonsterIds\(\)\.join/);
 assert.match(html,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});


test('mobile game world taps use existing attack mechanics',()=>{
 const html=fs.readFileSync('web-games/fantasy-survival/index.html','utf8');
 assert.ok(!html.includes('.actions>#attack{display:none!important}'));
 assert.ok(html.includes('id="autoCombat"'));
 assert.ok(html.includes('root.dataset.playerAttackAt=Number(p.attackAt||0).toFixed(0)'));
 assert.ok(html.includes('if(!isCreative())attack();'));
 assert.ok(html.includes('if(!isCreative()){'));
 assert.ok(html.includes('if(pendingCombatTap)return;'));
 assert.ok(html.includes('if(isCombatTapGesture(press,e,performance.now())){const point=worldPointerCoords(e);if(!maybeCrystalDashTripleTap(point,performance.now()))handleWorldTap(e)}'));
 assert.ok(html.includes('if(isCreative())handleWorldTap(e)'));
 assert.ok(html.includes("SAVE_KEY='jaewoon_fantasy_survival_v1'"));
});


test('all existing native biome environments show distinct authored palette and mixed original CC0 scene models',()=>{
 const a=moduleSource.indexOf('const BIOME_STYLE=Object.freeze({'),b=moduleSource.indexOf('});',a);
 assert.ok(a>0&&b>a);
 const styles=new Function(moduleSource.slice(a,b+3)+';return BIOME_STYLE;')();
 for(const [first,second] of [['snow','volcano'],['jungle','canyon'],['crystal','forest'],['underwater','desert']]){
  assert.notEqual(styles[first].floor,styles[second].floor,first);
  assert.notEqual(styles[first].sky,styles[second].sky,first);
 }
 const m=moduleSource.indexOf('const SCENERY_KIND=Object.freeze({'),n=moduleSource.indexOf('});',m);
 const kinds=new Function(moduleSource.slice(m,n+3)+';return SCENERY_KIND;')();
 for(const name of ['forest','jungle','swamp','snow','volcano','crystal','desert','underwater','underwater-dungeon']){
  assert.equal(kinds[name].length,2,name);
 }
 assert.match(moduleSource,/const kind=sceneryChoices\[hash%sceneryChoices\.length\]/);
 assert.match(moduleSource,/tileSeed%17\*\.01/);
 assert.match(moduleSource,/scene\.fog\.far=weatherVisualEffects/);
 assert.match(moduleSource,/for\(const mark of regionScene\?\.landmarks\|\|\[\]\)/);
});
test('native species motion uses actual movement and restarts one-shot attacks without changing gameplay position',()=>{
 assert.match(moduleSource,/const moving=moveDelta>\.14&&poseElapsed>0&&poseElapsed<420/);
 assert.match(moduleSource,/actor\.lastAttackStamp!==e\.attackAt/);
 assert.match(moduleSource,/setLoop\(attacking\?THREE\.LoopOnce:THREE\.LoopRepeat/);
 assert.match(moduleSource,/actor\.anchor\.position\.set\(destX,0,destZ\)/);
 assert.match(moduleSource,/selectedAppearance\?\.model==='mage'\?\.43/);
 assert.match(moduleSource,/bolt\.kind==='mageBolt'/);
 assert.match(moduleSource,/bolt\.kind==='playerArrow'/);
 assert.match(moduleSource,/bolt\.kind==='sporeOrb'/);
 assert.match(moduleSource,/bolt\.kind==='sunOrb'/);
 assert.match(moduleSource,/mageBoltGeometry\.dispose\(\)/);
 assert.match(index,/SAVE_KEY='jaewoon_fantasy_survival_v1'/);
});

test('native fantasy preview uses original CC0 geometry for terrain texture and building ghost',()=>{
  assert.match(moduleSource,/const detailGeometry=sourceFloor\.geometry\.clone\(\)/);
  assert.match(moduleSource,/detailGeometry\.setAttribute\('uv',new THREE\.BufferAttribute\(detailUvs,2\)\)/);
  assert.match(moduleSource,/detailTransform\.position\.set\(gx-floorCenterX,floorSurfaceY\+\.032,gz-floorCenterZ\)/);
  assert.match(moduleSource,/blueprintVisual=new THREE\.Mesh\(source\.geometry,blueprintMaterial\)/);
  assert.match(moduleSource,/blueprintGhost\.visible=!!bp&&!!blueprintVisual/);
  assert.match(moduleSource,/source\.geometry\.computeBoundingBox\(\)/);
  assert.doesNotMatch(moduleSource,/new THREE\.(?:PlaneGeometry|BoxGeometry|SphereGeometry)\(/);
  assert.doesNotMatch(moduleSource,/function part\(geometry,material/);
  assert.match(moduleSource,/SAVE_KEY|sourceFloor\.geometry\.clone/);
});
