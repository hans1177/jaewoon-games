// 파일명: qa/vibe-visual-runtime-quality.test.mjs
// 역할: 기존 Vibe 그래픽 파이프의 에셋 확보 순서·Golden Scene·primitive lifecycle·visual debt 계약 검증
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  auditVibeArtDirectionReview,
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

test('art pipeline requires CC0 acquisition and golden scenes without primitive fallback',()=>{
  const plan=createVibeArtPipeline({request:'로블록스 카툰 캐릭터 그래픽 고퀄 개선',target:'roblox',quality:2});
  assert.deepEqual([...plan.assetAcquisition.order],[...VIBE_ASSET_ACQUISITION_ORDER]);
  assert.equal(plan.assetAcquisition.primitiveFallbackAllowed,false);
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

test('asset acquisition prefers CC0 company assets without self-authored fallback',()=>{
  const company=[{id:'verified-cartoon-rig',license:'CC0-1.0'}];
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


// Synthetic pixel/revision fixtures verify evidence contracts, not subjective art quality.
function aestheticFixture(){
  const baselineRevision='1'.repeat(40),candidateRevision='2'.repeat(40);
  const baselineCapture={source:'runtime-capture',runtimeScreenshot:true,observed:true,reviewed:true,
    artifactId:'baseline-scene',revision:baselineRevision,imageSha256:'a'.repeat(64)};
  const selectedCapture={source:'runtime-capture',runtimeScreenshot:true,observed:true,reviewed:true,
    artifactId:'candidate-scene',revision:candidateRevision,imageSha256:'b'.repeat(64)};
  return {
    required:true,baselineRevision,candidateRevision,baselineCapture,selectedCapture,
    comparisonObserved:true,comparisonReviewed:true,sameCameraStateLighting:true,
    comparisonMethod:'same-seed-game-camera-frame-pixel-critique',
    findings:[{
      id:'empty-forest-depth',axis:'SPATIAL_DEPTH_AND_SCALE',
      observation:'the middle ground is empty while foreground trees repeat at the same height',
      region:{x:.1,y:.2,width:.5,height:.55},
      before:{observed:true,reviewed:true,imageSha256:baselineCapture.imageSha256,severity:3},
      after:{observed:true,reviewed:true,imageSha256:selectedCapture.imageSha256,severity:1},
      repair:{sourcePath:'roblox-games/survival/client/Game.client.luau',
        targetId:'forestSetDressing',property:'treeSpacingAndScale',action:'vary-height-and-depth',
        expectedEffect:'clear foreground-middle-ground separation without obscuring the path'}
    }]
  };
}
test('observed aesthetic improvement requires spatial finding with exact pixel and source owner',()=>{
  const review=auditVibeArtDirectionReview(aestheticFixture());
  assert.equal(review.pass,true);
  assert.equal(review.observedImprovements,1);
  assert.equal(review.repairTargets.length,0);
  assert.equal(review.gameplayMutationAllowed,false);
  const scene=aestheticFixture();
  const runtime=auditVibeRuntimeVisualEvidence({stage:'INTERNAL_PLAYTEST',candidateRevision:scene.candidateRevision,
    captures:captures(scene.candidateRevision),artDirectionReview:scene});
  assert.equal(runtime.pass,true);
  assert.equal(runtime.artDirectionReview.pass,true);
});
test('visible render difference does not close unresolved aesthetics or ungrounded repairs',()=>{
  const unchanged=aestheticFixture();
  unchanged.findings[0].after.severity=3;
  const failed=auditVibeArtDirectionReview(unchanged);
  assert.equal(failed.pass,false);
  assert.ok(failed.reasons.includes('art-direction-observed-quality-improvement-required'));
  assert.ok(failed.repairTargets[0].sourcePath.endsWith('/Game.client.luau'));
  const scene=aestheticFixture();
  scene.findings[0].repair.sourcePath='../../unrelated-save.lua';
  assert.ok(auditVibeArtDirectionReview(scene).reasons.some(reason=>reason.startsWith('art-direction-finding-unverified')));
  const runtime=auditVibeRuntimeVisualEvidence({stage:'INTERNAL_PLAYTEST',candidateRevision:unchanged.candidateRevision,
    captures:captures(unchanged.candidateRevision),artDirectionReview:unchanged});
  assert.equal(runtime.pass,false);
  assert.ok(runtime.reasons.includes('art-direction-visible-quality-unverified'));
  assert.equal(runtime.repairTargets[0].surface,'ART_DIRECTION');
});
test('independent visual candidate comparison is screenshot-bound and rejects weaker winner',()=>{
  const review=aestheticFixture();
  review.competitionRequired=true;
  review.selectedCandidateId='winner';
  review.candidates=[{id:'loser-a',revision:'3'.repeat(40),capture:{
    ...review.selectedCapture,artifactId:'option-1',revision:'3'.repeat(40),imageSha256:'c'.repeat(64)},reviewed:true,score:65},
    {id:'winner',revision:review.candidateRevision,capture:review.selectedCapture,reviewed:true,score:85},
    {id:'loser-b',revision:'4'.repeat(40),capture:{
      ...review.selectedCapture,artifactId:'option-2',revision:'4'.repeat(40),imageSha256:'d'.repeat(64)},reviewed:true,score:73}];
  assert.equal(auditVibeArtDirectionReview(review).pass,true);
  review.candidates[1].score=60;
  assert.ok(auditVibeArtDirectionReview(review).reasons.includes('art-direction-selection-not-best-observed-candidate'));
  review.candidates[1].score=85;
  review.candidates[2].capture.imageSha256='b'.repeat(64);
  assert.equal(auditVibeArtDirectionReview(review).pass,false);
});
test('graphics root returns exact visual-repair instructions without a second production pipeline',()=>{
  const review=aestheticFixture();
  review.findings[0].after.severity=2;
  const production=createVibeGraphicsProduction({
    gameId:'survival',request:'로블록스 숲 게임 그래픽 시각적 완성도 개선',target:'roblox',
    game:{genre:'survival'},runtimeEvidence:{stage:'INTERNAL_PLAYTEST',
      candidateRevision:review.candidateRevision,captures:captures(review.candidateRevision),
      artDirectionReview:review}
  });
  assert.equal(production.kind,'GRAPHICS_PRODUCTION');
  assert.equal(production.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.equal(production.runtimeRepairLoop.artDirectionReview.pass,false);
  assert.equal(production.runtimeRepairLoop.preciseArtDirectionRepairTargets.length,1);
  assert.equal(production.runtimeRepairLoop.preciseArtDirectionRepairTargets[0].property,'treeSpacingAndScale');
  assert.equal(production.runtimeRepairLoop.gameplaySaveBalanceMutationForbidden,true);
});

// CC0 원본이 없을 때 자체 제작으로 돌아가거나 보류 게임을 수정하지 않는다.
test('non-CC0 candidates cannot bypass CC0 selection through the company tier',()=>{
  const plan=createVibeAssetAcquisitionPlan({
    companyAssets:[{id:'old-self-authored',license:'project-original'},{id:'other-license',license:'CC-BY'}],
    repositoryAssets:[{id:'cc0-source',license:'CC0'}],stage:'PROTOTYPE'
  });
  assert.equal(plan.selectedSource,'LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET');
  assert.deepEqual(plan.candidates.map(row=>row.id),['cc0-source']);
  assert.equal(plan.primitiveFallbackAllowed,false);
  assert.equal(plan.cc0OriginalModificationRequired,true);
  assert.equal(plan.inactiveGamesMustRemainUnchanged,true);
});
test('missing or quarantined CC0 source leaves an acquisition gap instead of generating art',()=>{
  const assets=[{id:'missing-license'},{id:'blocked',license:'CC0',quarantined:true}];
  const snapshot=JSON.stringify(assets);
  const plan=createVibeAssetAcquisitionPlan({companyAssets:assets,stage:'PROTOTYPE'});
  assert.equal(plan.selectedSource,'VERIFIED_CC0_SOURCE_REQUIRED');
  assert.equal(plan.createNewAssetWhenNoVerifiedCandidate,false);
  assert.equal(plan.candidates.length,0);
  assert.equal(JSON.stringify(assets),snapshot);
});

test('game worker acquisition instructions cannot retain create-new fallback',()=>{
  const plan=createVibeArtPipeline({request:'게임 캐릭터 그래픽 개선',target:'web'});
  assert.equal(plan.assetAcquisition.cc0Only,true);
  assert.equal(plan.assetAcquisition.createWhenNoVerifiedCandidate,false);
  assert.equal(plan.assetAcquisition.inactiveGamesMustRemainUnchanged,true);
  assert.ok(!plan.assetAcquisition.order.includes('CREATE_NEW_ASSET'));
});
