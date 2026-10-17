// 파일명: qa/vibe-visual-runtime-quality.test.mjs
// 역할: 기존 Vibe 그래픽 파이프의 에셋 확보 순서·Golden Scene·primitive lifecycle·visual debt 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createVibePortableImpactCue,createVibeCommercialInterfaceBlueprint,planVibePresentationAutopilot,calculateVibeResponsiveUIZones,deriveVibeInventoryPresentation,deriveVibeTradeReview} from '../assets/vibe-presentation-director.js';
import {
  createVibeArtPipeline,
  createVibeGraphicsProduction,
  GRAPHICS_PRODUCTION_INTERNAL_MODULES,
  createVibeAssetAcquisitionPlan,
  createVibeVisualDebtEntry,
  VIBE_ASSET_ACQUISITION_ORDER,
  VIBE_GOLDEN_SCENE_ROLES,
} from '../assets/vibe-art-pipeline.js';
import {
  auditVibeGoldenSceneEvidence,
  auditVibeRuntimeBeforeAfterComparison,
  auditVibeRuntimeVisualEvidence,
  assertVibeRuntimeVisualQuality,
  GOLDEN_SCENE_ROLES,
  HIGH_END_GOLDEN_SCENE_ROLES,
} from '../assets/vibe-visual-quality-gate.js';

function captures(revision='a'.repeat(40)){
  return GOLDEN_SCENE_ROLES.map((role,index)=>({
    role,
    source:'roblox-runtime-capture',
    artifactId:`capture-${index+1}`,
    candidateRevision:revision,
    observed:true,
    reviewed:true,
    comparison:{pass:true},
  }));
}

// Synthetic fixtures exercise evidence validation; these are not live Roblox captures.
function interfaceEvidence(revision){
 return {required:true,pass:true,observed:true,reviewed:true,captures:['PORTRAIT','LANDSCAPE'].map((orientation,index)=>({
  orientation,viewport:index?{width:844,height:390}:{width:393,height:852},
  source:'roblox-runtime-capture',runtimeScreenshot:true,artifactId:'fixture-'+orientation,
  candidateRevision:revision,imageSha256:String(index+1).repeat(64),reviewed:true,
  pixelReview:{pass:true,imageSha256:String(index+1).repeat(64)},touchInputObserved:true,
  safeInsets:{left:0,right:0,top:24,bottom:24},
  elements:[{id:'action',visible:true,interactive:true,hitTestPassed:true,textPresent:true,textFits:true,textReadable:true,rect:{x:16,y:80,width:60,height:52}}]
 }))};
}

test('art pipeline uses verified asset acquisition before primitive fallback and requires golden scenes',()=>{
  const plan=createVibeArtPipeline({request:'로블록스 카툰 캐릭터 그래픽 고퀄 개선',target:'roblox',quality:2});
  assert.deepEqual([...plan.assetAcquisition.order],[...VIBE_ASSET_ACQUISITION_ORDER]);
  assert.equal(plan.assetAcquisition.primitiveFallbackPrototypeOnly,true);
  assert.equal(plan.runtimeVisualAcceptance.actualRuntimeCaptureRequired,true);
  assert.deepEqual([...plan.runtimeVisualAcceptance.goldenSceneRoles],[...VIBE_GOLDEN_SCENE_ROLES]);
  assert.equal(plan.policy.goldenSceneRuntimeEvidenceRequired,true);
  assert.equal(plan.policy.markerOnlyPresentationPassForbidden,true);
});

test('existing games and shared spatial assets require actual native 3D rather than 2.5D',()=>{
  for(const target of ['unity','web','roblox']){
    const plan=createVibeArtPipeline({request:'기존 게임 캐릭터와 세계 3D 재개발',target,quality:2});
    assert.equal(plan.minimumSpatialPresentation.minimumFinalGameplayDimension,'3D');
    assert.equal(plan.minimumSpatialPresentation.twoPointFiveDFinalPassForbidden,true);
    assert.equal(plan.minimumSpatialPresentation.allSpatialGameplayLibraryAssets3dOnly,true);
    assert.equal(plan.minimumSpatialPresentation.realNativeMeshRuntimeProofRequired,true);
    assert.equal(plan.minimumSpatialPresentation.existing2DAction,'MANDATORY_IN_PLACE_NATIVE_3D_REDEVELOPMENT');
    assert.equal(plan.policy.minimumFinalGameplayDimension,'3D');
    assert.ok(plan.implementation.some(item=>item.includes('3D')));
    assert.ok(plan.qa.some(item=>item.includes('실제 3D 메시')));
    assert.ok(plan.steps.some(item=>item.includes('기존 게임을 포함한 모든 최종 게임플레이 월드')));
  }
});

test('asset acquisition prefers existing verified company assets and keeps primitive fallback prototype-only',()=>{
  const company=[{id:'verified-cartoon-rig'}];
  const plan=createVibeAssetAcquisitionPlan({companyAssets:company,repositoryAssets:[{id:'repo'}],stage:'INTERNAL_PLAYTEST'});
  assert.equal(plan.selectedSource,'VERIFIED_COMPANY_ASSET_AND_RIG_LIBRARY');
  assert.equal(plan.candidates[0].id,'verified-cartoon-rig');
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.primitiveFallbackCreatesVisualDebt,true);
});

test('golden scene audit requires all five actual reviewed runtime captures',()=>{
  const revision='b'.repeat(40);
  const pass=auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:captures(revision)});
  assert.equal(pass.pass,true);
  const missing=auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:captures(revision).slice(0,4)});
  assert.equal(missing.pass,false);
  assert.equal(missing.missing.length,1);
  const marker=captures(revision);
  marker[0]={...marker[0],source:'source-marker',markerOnly:true};
  assert.equal(auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:marker}).pass,false);
});

test('internal playtest rejects unapproved primitive primary actors even with golden scenes',()=>{
  const revision='c'.repeat(40);
  const result=auditVibeRuntimeVisualEvidence({
    stage:'INTERNAL_PLAYTEST',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[
      {id:'player',presentation:'rigged-mesh'},
      {id:'wolf',presentation:'primitive-placeholder',placeholder:true},
    ],
  });
  assert.equal(result.pass,false);
  assert.equal(result.releaseAuthority,false);
  assert.equal(result.standaloneReleaseBlocker,false);
  assert.equal(result.graphicsPassMeaning,'VERIFIED_CHECKPOINT_NOT_TERMINAL_COMPLETION');
  assert.deepEqual([...result.primitiveViolations],['wolf']);
  assert.throws(()=>assertVibeRuntimeVisualQuality({
    stage:'INTERNAL_PLAYTEST',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[{id:'wolf',presentation:'part-placeholder'}],
  }),/런타임 그래픽 품질 게이트 차단/);
});

test('final graphics cannot pass with unresolved high visual debt',()=>{
  const revision='d'.repeat(40);
  const debt=createVibeVisualDebtEntry({id:'wolf-placeholder',role:'enemy',reason:'temporary primitive'});
  const result=auditVibeRuntimeVisualEvidence({
    stage:'FINAL',
    candidateRevision:revision,
    captures:captures(revision),
    primaryActors:[{id:'player',presentation:'rigged-mesh'},{id:'wolf',presentation:'mesh'}],
    visualDebt:[debt],
  });
  assert.equal(result.pass,false);
  assert.ok(result.reasons.includes('unresolved-critical-visual-debt'));
});


test('high-end target-frame role set extends the existing golden scene contract without replacing it',()=>{
  assert.equal(HIGH_END_GOLDEN_SCENE_ROLES.length,7);
  for(const role of GOLDEN_SCENE_ROLES)assert.ok(HIGH_END_GOLDEN_SCENE_ROLES.includes(role));
  assert.ok(HIGH_END_GOLDEN_SCENE_ROLES.includes('KEY_LANDMARK_OR_HUB'));
  assert.ok(HIGH_END_GOLDEN_SCENE_ROLES.includes('BOSS_OR_SIGNATURE_ENCOUNTER'));
});


test('runtime before-after comparison requires two distinct stable actual runtime captures',()=>{
  const base='1'.repeat(40),candidate='2'.repeat(40);
  const evidence={
    baselineRevision:base,candidateRevision:candidate,
    before:{source:'runtime-capture',artifactId:'actions-artifact:visual:before.png',candidateRevision:base,observed:true,reviewed:true},
    after:{source:'runtime-capture',artifactId:'actions-artifact:visual:after.png',candidateRevision:candidate,observed:true,reviewed:true},
    comparison:{pass:true,visibleRenderDelta:true,beforeStable:true,afterStable:true,observed:true,reviewed:true,method:'dual-headless-browser-sha256-v1'}
  };
  const pass=auditVibeRuntimeBeforeAfterComparison(evidence);
  assert.equal(pass.pass,true);
  assert.equal(pass.visibleRenderDelta,true);
  const markerOnly=auditVibeRuntimeBeforeAfterComparison({...evidence,before:{...evidence.before,source:'source-marker',markerOnly:true}});
  assert.equal(markerOnly.pass,false);
  assert.ok(markerOnly.reasons.includes('marker-only-runtime-comparison-forbidden'));
  const unstable=auditVibeRuntimeBeforeAfterComparison({...evidence,comparison:{...evidence.comparison,beforeStable:false}});
  assert.equal(unstable.pass,false);
  assert.ok(unstable.reasons.includes('runtime-capture-not-deterministic'));
});


test('declared interface and scene object gaps become localized runtime repair targets',()=>{
  const revision='e'.repeat(40);
  const result=auditVibeRuntimeVisualEvidence({
    stage:'INTERNAL_PLAYTEST',candidateRevision:revision,captures:captures(revision),
    primaryActors:[{id:'player',presentation:'rigged-mesh'}],
    requiredInterfaceSurfaces:['HUD','MINIMAP','INTERACTION'],
    interfaceCoverage:{
      HUD:interfaceEvidence(revision),
      MINIMAP:{required:true,pass:false,observed:true,reviewed:true},
      INTERACTION:interfaceEvidence(revision)
    },
    sceneObjectCoverage:{
      requirements:[{id:'village-shop',required:true},{id:'quest-board',required:true}],
      observations:[{id:'village-shop',observed:true,reviewed:true,bound:true,pass:true}]
    }
  });
  assert.equal(result.pass,false);
  assert.deepEqual([...result.interfaceCoverage.missing],['MINIMAP']);
  assert.deepEqual([...result.sceneObjectCoverage.missing],['quest-board']);
  assert.ok(result.reasons.includes('declared-interface-runtime-evidence-incomplete'));
  assert.ok(result.reasons.includes('declared-scene-object-runtime-evidence-incomplete'));
  assert.ok(result.repairTargets.some(row=>row.surface==='INTERFACE'&&row.id==='MINIMAP'));
  assert.ok(result.repairTargets.some(row=>row.surface==='SCENE_OBJECT'&&row.id==='quest-board'));
});

test('graphics production binds character identity environment detail and runtime repair loop inside one root',()=>{
  const production=createVibeGraphicsProduction({
    gameId:'demo',request:'로블록스 캐릭터와 마을을 더 디테일하게',target:'roblox',quality:2,
    game:{gameplay:'exploration',world:'village'},world:{theme:'fantasy'},
    characters:[{name:'Hero',role:'player',body:'humanoid'}],
    characterEvents:{Hero:['idle','move','attack','hit','death']},
    mapDetailInput:{
      sketch:{sourceId:'map',sourceHash:'sha256:map',metersPerUnit:1,
        nodes:[{id:'START',role:'spawn'},{id:'SHOP',role:'landmark'},{id:'EXIT',role:'transition'}],
        edges:[{from:'START',to:'SHOP'},{from:'SHOP',to:'EXIT'}],
        districts:[{id:'market',anchorNodeId:'SHOP',function:'commerce',landmark:'shop'}]},
      assets:[],styleFamily:'STYLIZED_FANTASY',seed:'demo'
    }
  });
  assert.equal(GRAPHICS_PRODUCTION_INTERNAL_MODULES.environmentDirector,'assets/vibe-environment-director.js');
  assert.equal(GRAPHICS_PRODUCTION_INTERNAL_MODULES.characterIdentity,'assets/vibe-character-identity-director.js');
  assert.equal(production.characterIdentity.plans.length,1);
  assert.equal(production.mapDetail.status,'DETAIL_AUTHORING_PLAN');
  assert.equal(production.runtimeRepairLoop.status,'RUNTIME_EVIDENCE_PENDING');
  assert.equal(production.engineMeasurementCapture.required,true);
  assert.equal(production.policy.runtimeVisualRepairLoopRequired,true);
  assert.equal(production.policy.declaredInterfaceSurfacesRequireMobileRuntimeEvidence,true);
});


test('mobile visual audit rejects stale, thumbnail, unreviewed, clipped and overlapping evidence',()=>{
 const revision='f'.repeat(40);
 const audit=(row)=>auditVibeRuntimeVisualEvidence({stage:'INTERNAL_PLAYTEST',candidateRevision:revision,captures:captures(revision),requiredInterfaceSurfaces:['HUD'],interfaceCoverage:{HUD:row}});
 assert.equal(audit(interfaceEvidence(revision)).pass,true);
 const mutations=[
  row=>delete row.captures,
  row=>row.captures.pop(),
  row=>row.captures[0].candidateRevision='old',
  row=>row.captures[0].source='roblox-thumbnail-api',
  row=>row.captures[0].runtimeScreenshot=false,
  row=>row.captures[0].pixelReview.imageSha256='0'.repeat(64),
  row=>row.captures[0].touchInputObserved=false,
  row=>delete row.captures[0].safeInsets,
  row=>row.captures[0].elements[0].rect.width=32,
  row=>row.captures[0].elements[0].rect.y=0,
  row=>row.captures[0].elements[0].textFits=false,
  row=>row.captures[0].elements.push({...row.captures[0].elements[0],id:'dialog'}),
 ];
 for(const mutate of mutations){
  const row=interfaceEvidence(revision);mutate(row);const result=audit(row);
  assert.equal(result.pass,false,String(mutate));
  assert.deepEqual([...result.interfaceCoverage.missing],['HUD']);
  assert.ok(result.repairTargets[0].findings.length>0);
 }
 const stale=captures(revision);delete stale[0].candidateRevision;
 assert.equal(auditVibeGoldenSceneEvidence({candidateRevision:revision,captures:stale}).pass,false);
});

// Existing Vibe QA must not interpret native asset registration as verified rendering.
test('all games flag unverified native character and NPC bindings for existing visual repair',()=>{
  const rev='a'.repeat(40);
  const base={candidateRevision:rev,captures:captures(rev),stage:'INTERNAL_PLAYTEST'};
  const failed=auditVibeRuntimeVisualEvidence({...base,primaryActors:[{id:'VillageChief',presentation:'native-model',nativeActorBindingState:'BOUND_UNVERIFIED'}]});
  assert.equal(failed.pass,false);
  assert.ok(failed.reasons.includes('primary-actor-native-binding-not-verified'));
  assert.deepEqual([...failed.actorBindingFailures],['VillageChief']);
  assert.equal(failed.repairTargets.find(row=>row.id==='VillageChief')?.scope,'VISUAL_AND_MOTION_ONLY');
  assert.equal(failed.repairTargets.find(row=>row.id==='VillageChief')?.preserveGameplayAndSave,true);
  const missing=auditVibeRuntimeVisualEvidence({...base,primaryActors:[{id:'NPC2',presentation:'native-model',nativeActorMissing:true}]});
  assert.ok(missing.actorBindingFailures.includes('NPC2'));
  const verified=auditVibeRuntimeVisualEvidence({...base,primaryActors:[{id:'VillageChief',presentation:'native-model',nativeActorBindingState:'VERIFIED'}]});
  assert.deepEqual([...verified.actorBindingFailures],[]);
});

// 웹게임: 모바일 GPU 해상도 조절은 시각 출력만 건드리고 기존 게임 루프를 유지한다.
test('existing native 3D Web games cap mobile pixel work without altering game loops or persistence',()=>{
  for(const [id,loop] of [
    ['realistic-builder','animate'],
    ['village-dungeons','animate'],
    ['amusement-tycoon','loop']
  ]){
    const html=fs.readFileSync(path.join('web-games',id,'index.html'),'utf8');
    assert.match(html,/new THREE\.WebGLRenderer\(/,id+': actual 3D renderer required');
    assert.match(html,/window\.matchMedia\('\(pointer: coarse\)'\)\.matches/,id+': mobile detection required');
    assert.match(html,/mobileRender\?1:/,id+': mobile initial DPR must be capped at 1');
    assert.match(html,/measuredFps<42\?Math\.max\(\.75,renderRatio-\.15\)/,id+': slow render reduces pixel count');
    assert.match(html,/measuredFps>56\?Math\.min\(maxRenderRatio,renderRatio\+\.1\)/,id+': recovery never exceeds original DPR cap');
    assert.match(html,/if\(!document\.hidden\)/,id+': hidden page must skip draw');
    assert.equal((html.match(/renderer\.render\(scene,camera\)/g)||[]).length,1,id+': use original render loop only');
    assert.match(html,new RegExp('requestAnimationFrame\\('+loop+'\\)'),id+': original game loop retained');
    assert.match(html,/localStorage/,id+': saved game semantics retained');
    assert.doesNotMatch(html,/renderer\.shadowMap\.enabled\s*=\s*true/,id+': no additional shadow-map cost');
  }
});
  
// PR 소스 범위가 기존 main 변경사항까지 커지더라도 QA 강도는 유지한다.
test('PR changed Web game scope uses current synthetic merge parent while main checks all games',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-core-qa.yml','utf8');
  assert.match(workflow,/git rev-parse --verify -q 'HEAD\^2'/);
  assert.match(workflow,/base_sha="\$\(git rev-parse 'HEAD\^1'\)"/);
  assert.match(workflow,/git diff --name-only "\$base_sha" HEAD/);
  assert.match(workflow,/changed_web_games=ALL/);
  assert.match(workflow,/Development Web browser startup smoke/);
});

test('cat-step renders real local 3D world without replacing its jump loop or saved score',()=>{
  const html=fs.readFileSync('web-games/cat-step/index.html','utf8');
  const library='assets/roblox/world-ghosts/native/mesh/three/three.module.js';
  const tree='assets/shared/homely-house/tree.obj';
  assert.ok(fs.statSync(library).size>100000,'reuse existing local Three.js');
  assert.ok(fs.statSync(tree).size>1000,'reuse real OBJ in existing asset library');
  assert.match(html,/import \* as THREE from '\/assets\/roblox\/world-ghosts\/native\/mesh\/three\/three\.module\.js'/);
  assert.match(html,/new THREE\.WebGLRenderer\(\{canvas,/);
  assert.match(html,/new THREE\.PerspectiveCamera\(/);
  assert.match(html,/new THREE\.BoxGeometry\(/);
  assert.match(html,/new THREE\.Mesh\(/);
  assert.match(html,/new THREE\.BufferGeometry\(/);
  assert.match(html,/fetch\('\/assets\/shared\/homely-house\/tree\.obj'\)/);
  assert.match(html,/geometry\.computeVertexNormals\(\)/);
  assert.match(html,/renderer\.render\(scene,camera\)/);
  assert.match(html,/import \{createVibePortableImpactCue\} from '\/assets\/vibe-presentation-director\.js'/);
  assert.match(html,/function emitImpact\(event\)/);
  assert.match(html,/function updateImpacts\(now\)/);
  assert.match(html,/new THREE\.InstancedMesh\(/);
  assert.match(html,/new THREE\.TorusGeometry\(/);
  assert.match(html,/particlePool=Array\.from\(\{length:18\}/);
  assert.match(html,/\.controls button \.icon/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/const mobile=matchMedia\('\(pointer: coarse\)'\)\.matches/);
  assert.match(html,/Math\.min\(devicePixelRatio\|\|1,mobile\?1:1\.5\)/);
  assert.match(html,/if\(document\.hidden\)/);
  for(const retained of [
    "cat-step-best","Math.max(150,280-(speedTier()-1)*18)",
    "function finishCorrect()","function gameOver()",
    "function scrollSteps()","function attempt(dir)",
    "function catPose(now)","requestAnimationFrame(draw)",
    "$('left').addEventListener('pointerdown'",
    "$('right').addEventListener('pointerdown'"
  ])assert.ok(html.includes(retained),'original gameplay/save missing: '+retained);
  assert.doesNotMatch(html,/getContext\(['"]2d/);
  assert.doesNotMatch(html,/https?:\/\//);
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]||'';
  assert.ok(script.length>8000);
  assert.doesNotThrow(()=>new Function(script.replace(/^import .*$/gm,'')));
});

test('genre-neutral commercial impact cues are presentation-only, deterministic and bounded on mobile',()=>{
  for(const [event,type] of [['success','land'],['damage','miss'],['level','milestone'],['spawn','start'],['attack','jump']]){
    const cue=createVibePortableImpactCue({event,mobile:true});
    assert.equal(cue.semantic,type);
    assert.equal(cue.authority,'presentation-only');
    assert.equal(cue.gameplayMutationAllowed,false);
    assert.ok(cue.particles<=12);
    assert.ok(cue.durationMs<=610);
    assert.equal(cue.pooledGeometry,true);
    assert.deepEqual(cue,createVibePortableImpactCue({event,mobile:true}));
    assert.deepEqual(cue.protected,['damage','reward','speed','timer','collision','save','progression']);
  }
  const reduced=createVibePortableImpactCue({event:'victory',reducedMotion:true,mobile:true});
  assert.equal(reduced.particles,0);
  assert.equal(reduced.cameraPulse,0);
  assert.equal(reduced.iconMotion,'none');
  assert.equal(createVibePortableImpactCue({event:'victory',mobile:false}).particles,18);
});

test('commercial genre UI only enables panels with authoritative systems AND matching source functions',()=>{
  const source=[
    'function renderInventory(){}','function equipItem(){}','const itemCatalog={};',
    'function buyItem(){}','function confirmTrade(){}','function transferItem(){}',
    'function craftItem(){}','function questLog(){}','function buildMenu(){}'
  ].join('\n');
  const systems=['INVENTORY_EQUIPMENT','ITEM_LOOT','ECONOMY_SHOP','TRADE_TRANSACTION','CRAFTING','QUEST_DIALOGUE','HOUSING_BUILDING'];
  const ui=createVibeCommercialInterfaceBlueprint({genre:'STORY_COMPLETE_RPG',systems,source,platform:'WEB',locale:'ko-KR'});
  assert.equal(ui.genre,'RPG');
  assert.equal(ui.authority,'PRESENTATION_DESIGN_ONLY');
  for(const id of ['inventory','equipment','items','merchant','trade','crafting','quests','building'])
    assert.ok(ui.activeSurfaceIds.includes(id),id+': real owner and source binding');
  assert.ok(!ui.activeSurfaceIds.includes('upgrades'),'no source owner means no fake upgrades');
  assert.ok(ui.surfaces.find(x=>x.id==='trade').details.includes('single-idempotent-commit'));
  assert.ok(ui.surfaces.find(x=>x.id==='trade').details.includes('offer-change-revokes-ready'));
  assert.equal(ui.functionalContracts.noFakeItemTradeOrUpgradeButtons,true);
  assert.equal(ui.typography.noRemoteFontDependency,true);
  assert.equal(ui.touch.minimumTargetPx,48);
  assert.equal(ui.navigation.backClosesTopmostPanelFirst,true);
  assert.equal(ui.integration.verified,false);
  const noSource=createVibeCommercialInterfaceBlueprint({genre:'RPG',systems,source:''});
  assert.equal(noSource.activeSurfaceIds.length,0,'concept alone never exposes pretend panels');
  assert.equal(noSource.surfaces.find(x=>x.id==='trade').state,'OWNER_IMPLEMENTATION_REQUIRED');
  const sourceButNoAuthority=createVibeCommercialInterfaceBlueprint({genre:'CASUAL',systems:[],source});
  assert.equal(sourceButNoAuthority.activeSurfaceIds.length,0,'code symbol alone never grants gameplay authority');
  assert.equal(sourceButNoAuthority.genre,'CASUAL');
  assert.equal(sourceButNoAuthority.density,'LOW');
});

test('all genre profiles receive distinct presentation while graphics production retains same owner systems',()=>{
  const cases=[
    ['CASUAL','CASUAL','SCORE_AND_NEXT_ACTION'],
    ['SURVIVAL_HORROR_ESCAPE','HORROR','THREAT_AND_SURVIVAL'],
    ['ACTION_SURVIVAL_ROGUELITE','SURVIVAL','VITALS_AND_RESOURCE'],
    ['SIMULATOR_TYCOON_INCREMENTAL','TYCOON','ECONOMY_AND_NEXT_UPGRADE'],
    ['SINGLE_DEFENSE_STRATEGY','STRATEGY','WAVE_AND_PLACEMENT'],
    ['STORY_COMPLETE_RPG','RPG','CHARACTER_AND_QUEST'],
    ['PUZZLE','PUZZLE','CLUE_AND_PROGRESS']
  ];
  for(const [genre,family,primary] of cases){
    const blueprint=createVibeCommercialInterfaceBlueprint({genre,systems:['INVENTORY_EQUIPMENT'],source:''});
    assert.equal(blueprint.genre,family);
    assert.equal(blueprint.visualHierarchy,primary);
    assert.equal(blueprint.surfaces.find(x=>x.id==='inventory').visibleCandidate,false);
    assert.equal(blueprint.navigation.gameplayCanvasAlwaysVisible,true);
    assert.equal(blueprint.visualSystem.localAssetReuseFirst,true);
    const plan=planVibePresentationAutopilot({genre,systems:['INVENTORY_EQUIPMENT'],files:[{path:'index.html',source:'function renderInventory(){}'}]});
    assert.equal(plan.commercialUI.genre,family);
    assert.deepEqual(plan.commercialUI.activeSurfaceIds,['inventory']);
    assert.equal(plan.policy.noRuleMutation,true);
  }
});

test('commercial portrait and landscape placement honors safe areas without ownership or game layout mutation',()=>{
  const p=calculateVibeResponsiveUIZones({viewport:{width:390,height:844},safeArea:{top:32,bottom:20},panelOpen:true});
  const l=calculateVibeResponsiveUIZones({viewport:{width:844,height:390},safeArea:{left:28,right:12},panelOpen:true});
  assert.equal(p.portrait,true);
  assert.equal(p.panel.mode,'BOTTOM_SHEET');
  assert.equal(l.portrait,false);
  assert.equal(l.panel.mode,'CONTEXT_SIDE_PANEL');
  for(const rects of [p,l]){
    assert.ok(rects.hud.y>=rects.safeArea.top);
    assert.ok(rects.hud.x>=rects.safeArea.left);
    assert.ok(rects.dock.y+rects.dock.height<=rects.viewport.height-rects.safeArea.bottom+0.01);
    assert.ok(rects.panel.x+rects.panel.width<=rects.viewport.width-rects.safeArea.right+0.01);
    assert.equal(rects.minTouchPx,48);
    assert.equal(rects.allCoordinatesCssPixels,true);
  }
  assert.equal(calculateVibeResponsiveUIZones({panelOpen:false}).panel,null);
});
test('inventory presentation filters real game items and never authors equipment or save updates',()=>{
  const owned=Object.freeze([{id:'sword',name:'검',quantity:1,rarity:'rare'},
    {id:'ore',name:'광석',quantity:4,rarity:'common'},
    {id:'empty',name:'없음',quantity:0,rarity:'common'}]);
  const view=deriveVibeInventoryPresentation({items:owned,capacity:20,query:'광',sort:'rarity'});
  assert.equal(view.rows.length,1);
  assert.equal(view.rows[0].id,'ore');
  assert.equal(view.usedSlots,2);
  assert.equal(view.capacity,20);
  assert.equal(view.readOnly,true);
  assert.equal(view.canExecuteEquipOrConsume,false);
  assert.equal(view.sourceOfTruth,'GAME_INVENTORY_OWNER');
  assert.deepEqual(owned[0],{id:'sword',name:'검',quantity:1,rarity:'rare'});
  assert.equal(deriveVibeInventoryPresentation({items:[]}).empty,true);
});
test('trade UI requires both offers, current quote and server validation and never commits client inventory',()=>{
  const players=[{id:'alice',label:'재운',offerCount:2},{id:'bob',label:'상대',offerCount:1}];
  const base={revision:4,participants:players,readyRevisions:{alice:4,bob:4},
    quote:{revision:4,valid:true,totals:{offerA:100,offerB:100}},availabilityConfirmed:true};
  const ready=deriveVibeTradeReview(base);
  assert.equal(ready.canRequestOwnerCommit,true);
  assert.equal(ready.committed,false);
  assert.equal(ready.readOnly,true);
  assert.equal(ready.quoteTotals.offerA,100);
  assert.equal(ready.safety.noClientInventoryMutation,true);
  assert.equal(deriveVibeTradeReview({...base,revision:5}).canRequestOwnerCommit,false,
    'offer revision change revokes ready from both participants');
  assert.equal(deriveVibeTradeReview({...base,commitInFlight:true}).canRequestOwnerCommit,false);
  assert.equal(deriveVibeTradeReview({...base,availabilityConfirmed:false}).canRequestOwnerCommit,false);
  assert.equal(deriveVibeTradeReview({...base,quote:{revision:3,valid:true}}).canRequestOwnerCommit,false);
  assert.equal(deriveVibeTradeReview({...base,readyRevisions:{alice:4,bob:3}}).canRequestOwnerCommit,false);
});
test('cat-step UI uses one local authored SVG symbol atlas rather than inconsistent emoji glyphs',()=>{
  const html=fs.readFileSync('web-games/cat-step/index.html','utf8');
  const svg=fs.readFileSync('assets/vibe-commercial-ui-icons.svg','utf8');
  for(const id of ['trophy','bolt','left','right','cat','spark']){
    assert.match(svg,new RegExp('<symbol id="'+id+'"'));
    assert.ok(html.includes('/assets/vibe-commercial-ui-icons.svg#'+id),'missing '+id+' icon reference');
  }
  assert.match(html,/role="progressbar"/);
  assert.match(html,/id="stepFill"/);
  assert.match(html,/aria-valuenow/);
  assert.match(html,/@media\(max-height:570px\) and \(orientation:landscape\)/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(html,/🏆|⚡|🐱|⬅|➡/);
  assert.ok(!svg.includes('http://www.w3.org/2000/svg')||svg.startsWith('<svg xmlns='));
});
