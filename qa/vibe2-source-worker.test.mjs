// 파일명: qa/vibe2-source-worker.test.mjs
// 역할: Vibe2 텍스트 source worker의 격리, 책임 파일 경계, 웹 유지보수, 바이너리 차단과 안전 편집 일치를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { runInNewContext } from 'node:vm';
import { robloxProductionPromptLines } from '../tools/company-roblox-production-plan.mjs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { learningGuidance } from '../tools/vibe2-learning-motor.mjs';
import { buildInternalMotionCoaching, singleMotionResponseSchema } from '../tools/vibe2-motion-coaching.mjs';
import { validateCandidateSyntax } from '../tools/vibe2-source-worker.mjs';
import { evaluateSingleMotionWorkUnit, SINGLE_MOTION_DEPTH_AXES, generateCandidateWithRecovery, runVibe2SourceWorker, systemAtomicPairCompletionSpec, buildSpecializedVerificationRequest, buildGenerationRetryPrompt, shouldRetryGenerationError, generationFailureClass, modelResponseComplete, evaluateSemanticDiffBudget, recoverPartialJsonEdit, recoverFocusedReplaceOnly, generationAttemptBudget, exactRetryAnchorSuggestions, focusedReplaceOnlySpec, buildFocusedReplaceOnlyPrompt, normalizeFocusedReplaceOnly, fullWebProgressCreditEligible, diagnosticFocusedReplaceOnlySpec, buildDiagnosticFocusedReplaceOnlyPrompt, evaluateDiagnosticPostcondition, deterministicDiagnosticCandidate, deterministicRobloxBuildUpCandidate, evaluatePresentationCandidateDelta, evaluateStudioQualityCandidateDelta, evaluateRobloxDesignAnchorGrounding, evaluateGraphicsReplacementReport, buildRobloxNativeSourceInspection, inspectRobloxNativeCandidateQuality, buildVerifiedExternalLearningPromptContract, assertVerifiedExternalLearningPromptCoverage, verifiedExternalLearningBlockFromPrompt, compactVerifiedExternalLearningBlockFromPrompt, buildPrompt, buildFullWebExpansionPrompt, sourcePromptContextWindow, normalizeCandidate, buildGameContextCapsule, evaluateCandidateSelfReview, resolveAssetSourceModel, evaluateNativeAssetAuthoringCandidate, collectNativeAssetRuntimePromotionCandidates, executeDeclaredNativeDccAuthoringVerification, persistedGeneratedAssetBindings, attachSelectedInternalAssetApiContext, evaluateRobloxInternalAssetFamilyBindingCandidate, evaluateAllGameDynamicAssetBindingCandidate, assertAllGameDynamicAssetBindingContract, ROBLOX_INTERNAL_ASSET_FAMILIES } from '../tools/vibe2-source-worker.mjs';
import { applyExactEdits } from '../tools/autonomous-safe-edit.mjs';
import { buildVibeAssetProductionPlan, assetProductionGuidance } from '../tools/vibe2-asset-production-plan.mjs';
import { createVibeContinuousQueue } from '../assets/vibe-continuous-queue.js';
import { robloxDeterministicPresentationEligible } from '../tools/vibe2-source-worker.mjs';
import { expandPresentationResponsibleFiles } from '../tools/vibe2-continuous-runner.mjs';
import { classifyVibePatchSaturation } from '../assets/vibe-quality-intelligence.js';

// 테스트 실행 환경: 호출한 작업 흐름의 작업군이 개별 검증 조건을 바꾸지 않게 격리한다.
const inheritedExecutionLane = process.env.VIBE2_EXECUTION_LANE;
test.beforeEach(() => {
  process.env.VIBE2_EXECUTION_LANE = 'game-primary';
});
test.afterEach(() => {
  if (inheritedExecutionLane === undefined) delete process.env.VIBE2_EXECUTION_LANE;
  else process.env.VIBE2_EXECUTION_LANE = inheritedExecutionLane;
});

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'vibe2-source-worker-')); }
test('photo teacher reaches actual image-byte observation and keeps inferred geometry unverified',async t=>{
  const {observeAssetReferenceImages}=await import('../tools/vibe2-source-worker.mjs');
  const {createVibeReferenceImageStudyRequest}=await import('../assets/vibe-environment-director.js');
  const root=tempRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1EAAAAASUVORK5CYII=','base64');
  fs.writeFileSync(path.join(root,'reference.png'),bytes);
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  const request=createVibeReferenceImageStudyRequest({sourceId:'fixture',sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',imageRef:'reference.png',sourceHash:hash,purpose:'ASSET_CREATION'});
  const order={target:'roblox',assetProductionLane:true,assetProduction:{decisions:[{type:'creature'}],imageAssetCreation:{enabled:true,studies:[{request}]}}};
  let sent;
  const observation=await observeAssetReferenceImages({order,cwd:root,model:'test-vision-model',requestModel:async(prompt,options)=>{sent={prompt,options};return JSON.stringify(Object.fromEntries(request.requestedFields.map(key=>[key,'Test fixture proposal; not an observed real subject.'])));}});
  assert.equal(sent.options.images[0],bytes.toString('base64'));
  assert.match(sent.prompt,/ordinary photographs/);
  assert.match(sent.prompt,/not a measured top-down map/);
  assert.equal(observation.observations[0].sourceHash,hash);
  assert.equal(observation.observations[0].pixelInputDelivered,true);
  assert.equal(observation.observations[0].verifiedAgainstSource,false);
  assert.equal(observation.observations[0].creativeCompletion.observedGeometry,false);
  const prompt=buildPrompt({...order,imageAssetObservation:observation},{files:[]},[]);
  const recipe=JSON.parse(prompt.split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  assert.equal(recipe.photoReferenceLessons.length,7);
  assert.equal(recipe.surfaceCraft.lessons.length,12);
  assert.equal(recipe.creatureCraft.lessons.length,9);
  assert.equal(recipe.actorAI,null);
  assert.ok(prompt.includes(hash));
  assert.equal(recipe.productionVerified,false);
  await assert.rejects(observeAssetReferenceImages({order,cwd:root,model:''}),/IMAGE_ASSET_VISION_MODEL_REQUIRED/);
});

test('asset teacher consumes canonical production decisions and styles in the real source prompt',()=>{
  const plan=buildVibeAssetProductionPlan({target:'roblox',task:{gameId:'demo',goal:'character enemy boss background item prop effect ui animation',styleFamily:'COZY'},manifest:{assets:[]},presetCatalog:{presets:[]}});
  const order={target:'roblox',goal:'asset production',selectedTask:{assetProductionLane:true},assetProduction:plan};
  const context={files:[]},marker='[INTERNAL ASSET TEACHER PRACTICE BEGIN]';
  const prompt=buildPrompt(order,context,[]);
  assert.equal(prompt.split(marker).length-1,1);
  const recipe=JSON.parse(prompt.split(marker+'\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  assert.deepEqual(recipe.unmappedFamilies,[]);
  for(const family of ['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','PROP','VFX','UI','MOTION'])assert.ok(recipe.familyLessons.some(row=>row.family===family),family);
  for(const id of ['MODERN_BUILDINGS','MEDIEVAL_BUILDINGS','SETTLEMENT_LAYOUT','BACKGROUND_LAYERS','WEATHER_PRESENTATION','SET_DRESSING','ITEM_REPRESENTATIONS','INVENTORY_VARIANTS','MENU_NAVIGATION','SYSTEM_SCREENS'])assert.ok(recipe.domainModules.some(row=>row.id===id),id);
  assert.equal(recipe.style.profileKey,'COZY');
  assert.equal(recipe.style.expression.axes.MOTION_ENERGY,'SUBTLE');
  assert.equal(recipe.status,'PRACTICE_ONLY');
  assert.equal(recipe.runtimeVerified,false);
  assert.ok(!buildPrompt({...order,selectedTask:{}},context,[]).includes(marker));
  assert.ok(!prompt.includes('[MOTION TEACHER PRACTICE BEGIN]'));
});

test('craft teacher selects explicit production requests and excludes unrelated families and engines',()=>{
  const extract=order=>JSON.parse(buildPrompt(order,{files:[]},[]).split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  for(const goal of ['동물 몬스터 털 비늘 재질 제작','animal creature surface texture creation']){
    const recipe=extract({target:'roblox',assetProductionLane:true,goal,assetProduction:{decisions:[{type:'creature'}]}});
    assert.equal(recipe.surfaceCraft.lessons.length,12);assert.equal(recipe.creatureCraft.lessons.length,9);
  }
  const base={target:'roblox',assetProductionLane:true,goal:'monster material',assetProduction:{decisions:[{type:'ui'}]}};
  assert.equal(extract(base).surfaceCraft,null);assert.equal(extract(base).creatureCraft,null);
  for(const target of ['web','unity',undefined]){
    const recipe=extract({...base,target,assetProduction:{decisions:[{type:'creature'}]}});
    assert.equal(recipe.surfaceCraft,null);assert.equal(recipe.creatureCraft,null);
  }
});

test('actor AI teacher reaches monster companion and NPC source prompts only for an assigned AI task',()=>{
  const extract=order=>JSON.parse(buildPrompt(order,{files:[]},[]).split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  for(const type of ['monster','companion','npc']){
    const order={target:'roblox',assetProductionLane:true,goal:'몬스터 동료 NPC AI 관련 코드',assetProduction:{decisions:[{type}]}};
    const recipe=extract(order);
    assert.equal(recipe.actorAI.lessons.length,8);assert.equal(recipe.applicationExamples.filter(row=>row.actorAIOnly).length,4);
    assert.equal(extract({...order,goal:'appearance only'}).actorAI,null);
    assert.equal(extract({...order,target:'web'}).actorAI,null);
  }
});

test('asset teacher survives initial compaction and retries at the model request boundary',async(t)=>{
  const root=tempRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const source='local sway = 0.025\nreturn sway';
  write(path.join(root,'init.luau'),source);
  const work={target:'roblox',assetProductionLane:true,goal:'refine existing visual sway '+('detail '.repeat(20000)),assetProduction:{decisions:[{type:'creature'}],styleBible:{styleFamily:'COZY'}}};
  const prompt=buildPrompt(work,{files:[{path:'init.luau',editable:true,content:source}]},['init.luau']);
  const requests=[];
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      const request=JSON.parse(body);requests.push(request);
      const response=requests.length===1?{edits:[{path:'outside.luau',find:'local sway = 0.025',replace:'local sway = 0.035'}]}:request.format?.required?.includes('replace')?{replace:'local sway = 0.035'}:{edits:[{path:'init.luau',find:'local sway = 0.025',replace:'local sway = 0.035'}]};
      res.end(JSON.stringify({response:JSON.stringify(response),done:true})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await generateCandidateWithRecovery({prompt,target:'roblox',responsibleFiles:['init.luau'],sourceRoot:root,sourceRootRelative:'roblox-games/demo',allowFullRewrite:false});
  assert.equal(requests.length,2);
  for(const request of requests){
    const marker='[INTERNAL ASSET TEACHER PRACTICE BEGIN]';
    assert.equal(request.prompt.split(marker).length-1,1);
    const recipe=JSON.parse(request.prompt.split(marker+'\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
    assert.equal(recipe.style.profileKey,'COZY');assert.equal(recipe.runtimeVerified,false);
    assert.deepEqual(recipe.familyLessons.map(row=>row.family),['CREATURE']);
    assert.ok(recipe.applicationExamples.some(row=>row.id==='FRAME_RATE_INDEPENDENT_FOLLOW'&&row.code.includes('math.exp')));
    assert.ok(recipe.applicationExamples.some(row=>row.id==='TWO_BONE_REACH_GEOMETRY'&&row.code.includes('math.sqrt')));
    assert.ok(recipe.advancedTechniques.some(row=>row.id==='CONTACT_IK_AND_REACH'));
    assert.ok(!recipe.applicationExamples.some(row=>row.id==='STABLE_INVENTORY_FILTER'));
    assert.ok(request.prompt.includes('init.luau'));
    assert.ok(Buffer.byteLength(request.prompt)<20000);
  }
  requests.length=0;
  const cinemaWork={...work,goal:'cinematic cutscene UI '+('detail '.repeat(20000)),assetProduction:{decisions:[{type:'ui'}],styleBible:{styleFamily:'COZY'}}};
  const sourceCoaching='[ROBLOX SOURCE COACHING BEGIN]\nexisting source-bound lifecycle evidence\n[ROBLOX SOURCE COACHING END]';
  const cinemaPrompt=buildPrompt(cinemaWork,{files:[{path:'init.luau',editable:true,content:source}]},['init.luau'],{robloxSourceCoaching:{block:sourceCoaching}});
  await generateCandidateWithRecovery({prompt:cinemaPrompt,target:'roblox',responsibleFiles:['init.luau'],sourceRoot:root,sourceRootRelative:'roblox-games/demo',allowFullRewrite:false});
  assert.equal(requests.length,2);
  for(const request of requests){
    const marker='[INTERNAL ASSET TEACHER PRACTICE BEGIN]';
    assert.equal(request.prompt.split(marker).length-1,1);
    const recipe=JSON.parse(request.prompt.split(marker+'\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
    assert.equal(recipe.cinematicDirection.ideas.length,6);
    assert.equal(request.prompt.split(sourceCoaching).length-1,1);
    assert.equal(recipe.cinematicDirection.productionVerified,false);
    assert.ok(recipe.applicationExamples.some(row=>row.id==='RELEASE_CINEMATIC_OWNERSHIP'&&row.code.includes('pcall')));
    assert.ok(!recipe.applicationExamples.some(row=>row.id==='CUBIC_BEZIER_CAMERA_COMPONENT'));
    assert.ok(Buffer.byteLength(request.prompt)<30000);
  }
  requests.length=0;
  const craftWork={...work,goal:'동물 몬스터 털 비늘 재질 제작 '+('detail '.repeat(20000))};
  const craftPrompt=buildPrompt(craftWork,{files:[{path:'init.luau',editable:true,content:source}]},['init.luau']);
  await generateCandidateWithRecovery({prompt:craftPrompt,target:'roblox',responsibleFiles:['init.luau'],sourceRoot:root,sourceRootRelative:'roblox-games/demo',allowFullRewrite:false});
  assert.equal(requests.length,2);
  for(const request of requests){
    const marker='[INTERNAL ASSET TEACHER PRACTICE BEGIN]';
    assert.equal(request.prompt.split(marker).length-1,1);
    const recipe=JSON.parse(request.prompt.split(marker+'\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
    assert.equal(recipe.surfaceCraft.lessons.length,12);assert.equal(recipe.creatureCraft.lessons.length,9);
    assert.equal(recipe.style.profileKey,'COZY');assert.equal(recipe.productionVerified,false);
    assert.ok(recipe.applicationExamples.some(row=>row.id==='TAPERED_APPENDAGE_WAVE'&&row.code.includes('math.sin')));
    assert.ok(recipe.applicationExamples.some(row=>row.id==='DIRECTIONAL_SURFACE_MASK'));
    assert.ok(Buffer.byteLength(request.prompt)<35000);
  }
  requests.length=0;
  const aiWork={...work,goal:'몬스터 동료 NPC AI 관련 코드 '+('detail '.repeat(20000))};
  const aiPrompt=buildPrompt(aiWork,{files:[{path:'init.luau',editable:true,content:source}]},['init.luau']);
  await generateCandidateWithRecovery({prompt:aiPrompt,target:'roblox',responsibleFiles:['init.luau'],sourceRoot:root,sourceRootRelative:'roblox-games/demo',allowFullRewrite:false});
  assert.equal(requests.length,2);
  for(const request of requests){
    const marker='[INTERNAL ASSET TEACHER PRACTICE BEGIN]';
    assert.equal(request.prompt.split(marker).length-1,1);
    const recipe=JSON.parse(request.prompt.split(marker+'\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
    assert.equal(recipe.actorAI.lessons.length,8);assert.equal(recipe.applicationExamples.filter(row=>row.actorAIOnly).length,4);
    assert.equal(recipe.productionVerified,false);assert.equal(recipe.gameplayAuthority,false);
    assert.ok(Buffer.byteLength(request.prompt)<40000);
  }
});

test('walk teacher reaches the existing source prompt once without promoting learning or changing task scope',()=>{
  const unit={scope:'INTERNAL_ASSET_LIBRARY',objectId:'roblox-world-ghost-bai-wuchang',clipId:'walk',sourcePath:'init.luau',sourceWindow:'function Motion.walk(form, bones, time) return {} end',sourceHash:'a'.repeat(64)};
  const order={target:'roblox',assetProductionLane:true,goal:'Improve the existing walk',assetProduction:{motionRepairWorkUnit:unit}};
  const before=JSON.stringify(order);
  const context={files:[{path:'init.luau',editable:true,content:unit.sourceWindow}]};
  const prompt=buildPrompt(order,context,['init.luau']);
  const marker='[MOTION TEACHER PRACTICE BEGIN]';
  assert.equal(prompt.split(marker).length-1,1);
  const recipe=JSON.parse(prompt.split(marker+'\n')[1].split('\n[MOTION TEACHER PRACTICE END]')[0]);
  assert.equal(recipe.id,'ROBLOX_WALK_TEACHER_V1');
  assert.deepEqual(recipe.lessons.map(row=>row.axis),SINGLE_MOTION_DEPTH_AXES);
  assert.equal(recipe.runtimeVerified,false);
  assert.equal(recipe.status,'PRACTICE_ONLY');
  assert.match(recipe.example.source,/leftSwing \* leftSwing/);
  const assetRecipe=JSON.parse(prompt.split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  assert.deepEqual(assetRecipe.familyLessons.map(row=>row.family),['MOTION']);
  assert.deepEqual(assetRecipe.domainModules,[]);
  assert.deepEqual(assetRecipe.applicationExamples.map(row=>row.id),['HERMITE_POSE_SEGMENT','TWO_BONE_REACH_GEOMETRY','SHORTEST_QUATERNION_BLEND']);
  assert.deepEqual(assetRecipe.studioMotion.lessons.map(row=>row.role),['COMBAT_LOCOMOTION']);
  assert.equal(assetRecipe.studioMotion.productionVerified,false);
  const noCinema=buildPrompt({...order,goal:'cinematic cutscene 동물 몬스터 털 재질 NPC AI',selectedTask:{surfaceCraft:true,creatureCraft:true,actorAI:true}},context,['init.luau']);
  const noCinemaRecipe=JSON.parse(noCinema.split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  assert.equal(noCinemaRecipe.cinematicDirection,null);
  assert.equal(noCinemaRecipe.surfaceCraft,null);assert.equal(noCinemaRecipe.creatureCraft,null);
  assert.equal(noCinemaRecipe.actorAI,null);assert.ok(!noCinemaRecipe.applicationExamples.some(row=>row.actorAIOnly));
  assert.ok(!noCinemaRecipe.applicationExamples.some(row=>row.cinematicOnly));
  assert.match(prompt,/motionRepairReport/);
  assert.equal(JSON.stringify(order),before);
  const internalPrompt=buildPrompt({...order,source:{internalAssetMotion:true}},context,['init.luau'],{motionCoaching:{block:'[INTERNAL MOTION COACHING BEGIN]\nexisting source-bound example\n[INTERNAL MOTION COACHING END]'}});
  assert.equal(internalPrompt.split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]').length-1,1);
  assert.ok(internalPrompt.includes('TWO_BONE_REACH_GEOMETRY'));
  assert.ok(internalPrompt.includes('existing source-bound example'));
  assert.ok(Buffer.byteLength(internalPrompt)<20000);
  const attackPrompt=buildPrompt({...order,source:{internalAssetMotion:true},assetProduction:{...order.assetProduction,motionRepairWorkUnit:{...unit,clipId:'attack'}}},context,['init.luau']);
  const attackRecipe=JSON.parse(attackPrompt.split('[INTERNAL ASSET TEACHER PRACTICE BEGIN]\n')[1].split('\n[INTERNAL ASSET TEACHER PRACTICE END]')[0]);
  assert.deepEqual(attackRecipe.studioMotion.lessons.map(row=>row.role),['LIGHT_COMBO']);
  assert.ok(attackRecipe.applicationExamples.some(row=>row.id==='HERMITE_POSE_SEGMENT'));
  assert.ok(!attackPrompt.includes('[MOTION TEACHER PRACTICE BEGIN]'));
  for(const other of [{...order,target:'web'},{...order,assetProductionLane:false},{...order,assetProduction:{}},{...order,assetProduction:{motionRepairWorkUnit:{...unit,clipId:'attack'}}}])assert.ok(!buildPrompt(other,context,['init.luau']).includes(marker));
});

function singleMotionFixture(t){
  const root=tempRoot();t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const before=['pose = t','weight = t','arc = t','contact = t','overlap = t','settle = t'];
  const after=['pose = smoothstep(t) + walkLean(t)','weight = supportWeight(t)','arc = jointArc(t)','contact = footContact(t)','overlap = delayedRotation(t)','settle = dampedRecovery(t)'];
  const window='function brideWalk(t) {\n'+before.map(line=>'  '+line+';').join('\n')+'\n}';
  const source='const objectId = "bride";\nconst duration = 1.05;\n'+window+'\nfunction brideIdle(t) { return t; }\n';
  write(path.join(root,'motion.js'),source);
  const unit={required:true,objectCount:1,motionCount:1,estimatedModificationMinutes:60,objectId:'bride',clipId:'walk',sourcePath:'motion.js',sourceHash:crypto.createHash('sha256').update(source).digest('hex'),sourceWindow:window,objectBindingEvidence:'const objectId = "bride";',clipBindingEvidence:'function brideWalk(t)',lockedSource:['const duration = 1.05;']};
  const order={assetProductionLane:true,assetProduction:{motionRepairWorkUnit:unit}};
  const replacement='function brideWalk(t) {\n'+after.map(line=>'  '+line+';').join('\n')+'\n}';
  const candidate={edits:[{path:'motion.js',find:window,replace:replacement}],newFiles:[],replaceFiles:[],motionRepairReport:{objectId:'bride',clipId:'walk',depthEvidence:SINGLE_MOTION_DEPTH_AXES.map((axis,i)=>({axis,before:before[i],after:after[i]}))}};
  return{order,candidate,sourceRoot:root,responsibleFiles:['motion.js'],unit};
}

test('single motion work unit accepts one complete function and keeps native quality unverified',t=>{
  const f=singleMotionFixture(t),result=evaluateSingleMotionWorkUnit(f);
  assert.equal(result.pass,true);assert.equal(result.runtimeVerified,false);
  assert.equal(result.qualityStatus,'NATIVE_BEFORE_AFTER_QA_REQUIRED');
  assert.equal(result.objectId,'bride');assert.equal(result.clipId,'walk');
  assert.equal(result.estimatedModificationMinutes,60);
  assert.notEqual(result.changedSourceHash,result.sourceHash);
  assert.equal(f.candidate.edits.length,1);
  const contract={phase:'BUILD_UP',focusPillar:'PRESENTATION',requiredConnectedImprovements:{min:3}};
  assert.equal(evaluateStudioQualityCandidateDelta({...f,contract,singleMotionCheck:result}).pass,true);
  assert.equal(evaluateStudioQualityCandidateDelta({...f,contract}).pass,false);
});
test('design-grounded Roblox gameplay BUILD_UP rejects presentation-only delta and accepts gameplay code delta',()=>{
  const contract={phase:'BUILD_UP',focusPillar:'CORE_FUN',requiredConnectedImprovements:{min:1},realSourceDeltaRequired:true,gameplaySourceDeltaRequired:true};
  const visualOnly={edits:[{path:'client/Game.client.luau',find:'root.BackgroundColor3 = Color3.fromRGB(18, 28, 48)',replace:'root.BackgroundColor3 = Color3.fromRGB(28, 38, 58)'}],newFiles:[],replaceFiles:[]};
  const blocked=evaluateStudioQualityCandidateDelta({candidate:visualOnly,contract});
  assert.equal(blocked.pass,false);
  assert.equal(blocked.reason,'GAMEPLAY_SOURCE_DELTA_REQUIRED');
  assert.equal(blocked.gameplayUnits,0);
  const gameplay={edits:[{path:'server/Game.server.luau',find:'player:SetAttribute("Progress", 0)',replace:'player:SetAttribute("Progress", 1)'}],newFiles:[],replaceFiles:[]};
  const accepted=evaluateStudioQualityCandidateDelta({candidate:gameplay,contract});
  assert.equal(accepted.pass,true);
  assert.equal(accepted.gameplayUnits,1);
  assert.deepEqual(accepted.gameplayFiles,['server/Game.server.luau']);
});

test('Roblox gameplay BUILD_UP must apply the gameplay delta on the exact design source anchor',()=>{
  const directive={responsibleSystemsAndFiles:{sourceAnchors:[
    {file:'roblox-games/demo/server/Game.server.luau',symbol:'attack'},
    {file:'roblox-games/demo/shared/GameConfig.luau',symbol:'Damage'}
  ]}};
  const unrelated={
    edits:[
      {path:'server/Game.server.luau',find:'local label = "ready"',replace:'local label = "armed"'},
      {path:'client/Game.client.luau',find:'remote:FireServer("attack")',replace:'remote:FireServer("attack", true)'}
    ],
    newFiles:[],replaceFiles:[]
  };
  const blocked=evaluateRobloxDesignAnchorGrounding({
    candidate:unrelated,directive,sourceRootRelative:'roblox-games/demo',required:true,
    gameplayFiles:['client/Game.client.luau']
  });
  assert.equal(blocked.pass,false);
  assert.equal(blocked.reason,'ROBLOX_DESIGN_GAMEPLAY_ANCHOR_NOT_TOUCHED');
  const grounded={edits:[{path:'server/Game.server.luau',find:'local function attack(player)',replace:'local function attack(player, target)'}],newFiles:[],replaceFiles:[]};
  const accepted=evaluateRobloxDesignAnchorGrounding({
    candidate:grounded,directive,sourceRootRelative:'roblox-games/demo',required:true,
    gameplayFiles:['server/Game.server.luau']
  });
  assert.equal(accepted.pass,true);
  assert.deepEqual(accepted.matchedPaths,['server/Game.server.luau']);
});

test('single motion work unit planner carries the exact binding without silently shrinking an invalid batch',t=>{
  const f=singleMotionFixture(t);
  const plan=buildVibeAssetProductionPlan({repoRoot:f.sourceRoot,target:'web',task:{motionRepairWorkUnit:f.unit},manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(plan.motionRepairWorkUnit.sourceWindow,f.unit.sourceWindow);
  assert.equal(plan.motionRepairWorkUnit.sourceHash,f.unit.sourceHash);
  assert.equal(plan.motionRepairWorkUnit.objectCount,1);
  assert.equal(plan.motionRepairWorkUnit.motionCount,1);
  assert.equal(plan.motionRepairWorkUnit.runtimeVerified,false);
  const batch=buildVibeAssetProductionPlan({repoRoot:f.sourceRoot,target:'web',task:{motionRepairWorkUnit:{...f.unit,objectCount:2}},manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(batch.motionRepairWorkUnit.objectCount,2);
  assert.equal(evaluateSingleMotionWorkUnit({...f,order:{...f.order,assetProduction:batch}}).pass,false);
});
test('single motion work unit survives canonical queue persistence and enters the existing asset lane',t=>{
  const f=singleMotionFixture(t);
  const queue=createVibeContinuousQueue({tasks:[{id:'one-motion',target:'web',gameId:'demo',sourceRoot:'web-games/demo',responsibleFiles:['motion.js'],motionRepairWorkUnit:f.unit}]});
  const persisted=createVibeContinuousQueue(JSON.parse(JSON.stringify(queue))).tasks[0];
  assert.deepEqual(persisted.motionRepairWorkUnit,f.unit);
  assert.equal(persisted.assetProductionLane,true);
  assert.ok(persisted.evidence.includes('single-object-motion-repair:v1'));
  const plan=buildVibeAssetProductionPlan({repoRoot:f.sourceRoot,target:'web',task:persisted,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(plan.motionRepairWorkUnit.sourceHash,f.unit.sourceHash);
});
test('single motion work unit central budget means sixty minutes of modification excluding preparation and QA',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const unit=policy.assetProductionParallelContract.companyGraphicsLibrary24h.studioMotionProgram.baseQualityWorkSession;
  assert.equal(unit.objectCount,1);assert.equal(unit.motionCount,1);
  assert.equal(Object.values(unit.stageMinutes).reduce((a,b)=>a+b,0),60);
  assert.equal(unit.preparationAndQaIncludedInModificationBudget,false);
  assert.equal(unit.noIdlePaddingToFillBudget,true);
  assert.equal(unit.separateWorkerRequired,false);
  const guide=assetProductionGuidance({kind:'vibe2-asset-production-plan',companyGraphicsLibrary:{baseMotionQualityWorkSession:unit}});
  assert.match(guide,/오브젝트 1개와 기존 동작 1개/);
  assert.match(guide,/실제 수정 작업량의 추정치/);
  assert.doesNotMatch(guide,/실제 관절 곡선 수정 30분/);
});
test('single motion work unit rejects another clip even in the same responsible file',t=>{
  const f=singleMotionFixture(t);
  f.candidate.edits.push({path:'motion.js',find:'return t;',replace:'return t * 2;'});
  assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_EDIT_OUTSIDE_WINDOW');
});
test('single motion work unit cannot silently replace a whole-game graphics assignment',t=>{
  const f=singleMotionFixture(t);f.order.presentationQuality={required:true,pass:'ASSET_ADAPTATION'};
  assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_PRESENTATION_SCOPE_CONFLICT');
});
test('single motion work unit rejects stale source, multiple objects and unbound requests',t=>{
  const f=singleMotionFixture(t);f.unit.sourceHash='old';
  assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_STALE_SOURCE');
  f.unit.objectCount=2;assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_UNIT_SCOPE_INVALID');
  assert.equal(evaluateSingleMotionWorkUnit({order:{selectedTask:{evidence:['single-object-motion-repair:v1']}}}).pass,false);
  assert.equal(evaluateSingleMotionWorkUnit({order:{}}).required,false);
});
test('single motion work unit rejects fake detail reports and unchanged evidence',t=>{
  const f=singleMotionFixture(t),row=f.candidate.motionRepairReport.depthEvidence[0];
  row.after='polished to Disney quality';
  assert.match(evaluateSingleMotionWorkUnit(f).reason,/UNGROUNDED_DEPTH/);
  row.after=row.before;assert.match(evaluateSingleMotionWorkUnit(f).reason,/UNGROUNDED_DEPTH/);
  f.candidate.motionRepairReport.depthEvidence=[];
  assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_DEPTH_EVIDENCE_REQUIRED');
});
test('single motion work unit keeps predeclared sound axes unchanged without awarding fake change credit',t=>{
  const f=singleMotionFixture(t),row=f.candidate.motionRepairReport.depthEvidence[0];
  f.candidate.edits[0].replace=f.candidate.edits[0].replace.replace(row.after,row.before);
  row.after=row.before;row.status='PRESERVED';
  assert.match(evaluateSingleMotionWorkUnit(f).reason,/PRESERVATION_NOT_BOUND/);
  f.unit.preservedAxes={[row.axis]:row.before};
  const result=evaluateSingleMotionWorkUnit(f);
  assert.equal(result.pass,true);assert.equal(result.changedAxes.includes(row.axis),false);
  assert.equal(result.runtimeVerified,false);
});
test('single motion work unit preserves binding, timing and existing source authority',t=>{
  const f=singleMotionFixture(t);
  f.candidate.edits[0].replace=f.candidate.edits[0].replace.replace('brideWalk','otherWalk');
  assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_LOCK_CHANGED');
  f.unit.sourcePath='../motion.js';assert.equal(evaluateSingleMotionWorkUnit(f).reason,'SINGLE_MOTION_RESPONSIBLE_PATH_REQUIRED');
});
test('single motion work unit prompt asks for active modification depth and full evidence',t=>{
  const f=singleMotionFixture(t);
  const prompt=buildPrompt({...f.order,target:'web',goal:'one motion'},{files:[{path:'motion.js',content:f.unit.sourceWindow,editable:true}]},f.responsibleFiles,{focusedWebRepair:true});
  assert.match(prompt,/sixty minutes of active modification depth/);
  assert.match(prompt,/SINGLE MOTION WORK UNIT BEGIN/);
  assert.match(prompt,/motionRepairReport/);
  assert.doesNotMatch(prompt,/FOCUSED WEB REPAIR STREAM CONTRACT/);
});
test('single motion work unit retry keeps full JSON and rejects partial depth before accepting the same target',async t=>{
  const f=singleMotionFixture(t);
  const shallow=structuredClone(f.candidate);shallow.motionRepairReport.depthEvidence=[];
  const first=path.join(f.sourceRoot,'first.json'),second=path.join(f.sourceRoot,'second.json');
  write(first,JSON.stringify(shallow));write(second,JSON.stringify(f.candidate));
  const prompt=buildPrompt({...f.order,target:'web',goal:'one motion'},{files:[{path:'motion.js',content:f.unit.sourceWindow,editable:true}]},f.responsibleFiles,{focusedWebRepair:true});
  const result=await generateCandidateWithRecovery({prompt,target:'web',sourceRoot:f.sourceRoot,sourceRootRelative:'web-games/demo',responsibleFiles:f.responsibleFiles,allowFullRewrite:false,focusedWebRepair:true,singleMotionWorkUnit:true,responseFiles:[first,second],candidateValidator(candidate){const r=evaluateSingleMotionWorkUnit({...f,candidate});if(!r.pass)throw new Error(r.reason);return r;}});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.completionMode,'JSON_SINGLE_MOTION');
  assert.equal(result.candidate.motionRepairReport.clipId,'walk');
  assert.equal(result.candidateValidation.runtimeVerified,false);
});
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content, 'utf8'); }
test('single motion generation sends a required nonempty patch schema through the real Ollama HTTP transport',async t=>{
  const f=singleMotionFixture(t),requests=[];
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>{body+=chunk;});req.on('end',()=>{
      requests.push(JSON.parse(body));
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify({response:JSON.stringify(f.candidate),done:true})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const prompt=buildPrompt({...f.order,target:'web'},{files:[{path:'motion.js',content:f.unit.sourceWindow}]},f.responsibleFiles);
  const result=await generateCandidateWithRecovery({prompt,model:'test-local-model',target:'web',sourceRoot:f.sourceRoot,sourceRootRelative:'web-games/demo',responsibleFiles:f.responsibleFiles,allowFullRewrite:false,singleMotionWorkUnit:true,candidateValidator(candidate){const check=evaluateSingleMotionWorkUnit({...f,candidate});if(!check.pass)throw new Error(check.reason);return check;}});
  assert.equal(requests.length,1);
  assert.deepEqual(requests[0].format,singleMotionResponseSchema());
  assert.equal(requests[0].think,false);
  assert.equal(result.generation.completionMode,'JSON_SINGLE_MOTION');
  assert.equal(result.candidateValidation.runtimeVerified,false);
});
test('large non-full source request is compacted before local model generation without widening scope',async t=>{
  const cwd=tempRoot();t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const sourceRoot=path.join(cwd,'unity-games/demo');
  const relative='Assets/Scripts/GameCore.cs';
  const source='public sealed class GameCore { public int State = 1; }\n';
  write(path.join(sourceRoot,relative),source);
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: improve the existing responsible game source without changing save or gameplay authority',
    'OVERSIZED_PLANNING_CONTEXT='+('duplicate planning detail '.repeat(1800)),
    'Allowed edit paths: '+relative,
    '=== FILE '+relative+' [EDITABLE] ===',
    source
  ].join('\n');
  assert.ok(Buffer.byteLength(prompt,'utf8')>16000);
  const response=path.join(cwd,'answer.json');
  write(response,JSON.stringify({edits:[{path:relative,find:'public int State = 1;',replace:'public int State = 2;'}]}));
  const result=await generateCandidateWithRecovery({
    prompt,target:'unity',sourceRoot,sourceRootRelative:'unity-games/demo',
    responsibleFiles:[relative],allowFullRewrite:false,responseFiles:[response]
  });
  assert.equal(result.generation.attempts,1);
  assert.ok(result.generation.requestPromptBytes<32000);
  assert.ok(result.generation.requestPromptBytes<result.generation.initialPromptBytes);
  assert.equal(result.generation.contextWindow,32768);
  assert.equal(result.candidate.edits.length,1);
  assert.equal(result.candidate.edits[0].path,relative);
});

test('source candidate prompt compaction never applies to asset-development lane',async t=>{
  const cwd=tempRoot();t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const sourceRoot=path.join(cwd,'unity-games/demo');
  const relative='Assets/Scripts/GameCore.cs';
  const source='public sealed class GameCore { public int State = 1; }\n';
  write(path.join(sourceRoot,relative),source);
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: preserve full asset-development context while editing the exact responsible source',
    'OVERSIZED_ASSET_CONTEXT='+('asset quality context '.repeat(1800)),
    'Allowed edit paths: '+relative,
    '=== FILE '+relative+' [EDITABLE] ===',
    source
  ].join('\n');
  assert.ok(Buffer.byteLength(prompt,'utf8')>16000);
  const response=path.join(cwd,'answer.json');
  write(response,JSON.stringify({edits:[{path:relative,find:'public int State = 1;',replace:'public int State = 2;'}]}));
  const previousLane=process.env.VIBE2_EXECUTION_LANE;
  process.env.VIBE2_EXECUTION_LANE='asset-development';
  try{
    const result=await generateCandidateWithRecovery({
      prompt,target:'unity',sourceRoot,sourceRootRelative:'unity-games/demo',
      responsibleFiles:[relative],allowFullRewrite:false,responseFiles:[response]
    });
    assert.equal(result.generation.requestPromptBytes,Buffer.byteLength(prompt,'utf8'));
    assert.ok(result.generation.contextWindow>=24576);
  }finally{
    if(previousLane===undefined)delete process.env.VIBE2_EXECUTION_LANE;
    else process.env.VIBE2_EXECUTION_LANE=previousLane;
  }
});

test('internal motion coaching selects source-hash-bound matching anatomy and never claims learned weights or runtime quality',()=>{
  const make=(id,clipId='walk')=>buildInternalMotionCoaching({order:{source:{internalAssetMotion:true},assetProduction:{motionRepairWorkUnit:{scope:'INTERNAL_ASSET_LIBRARY',objectId:'roblox-world-ghost-'+id,clipId}}}});
  const beast=make('bulgasari'),shroud=make('gwisin-bride'),serpent=make('gangcheori');
  assert.equal(beast.evidence.reference.objectId,'kelpie');
  assert.equal(shroud.evidence.reference.objectId,'banshee');
  assert.equal(serpent.evidence.reference.objectId,'boitata');
  for(const result of [beast,shroud,serpent]){
    assert.equal(result.evidence.advisoryOnly,true);
    assert.equal(result.evidence.applicationVerified,false);
    assert.equal(result.evidence.nativeQualityVerified,false);
    assert.equal(result.evidence.weightTraining,false);
    assert.match(result.block,/DISTILLED DESIGN PRINCIPLES/);
    assert.match(result.block,/VARIATION TASK/);
    assert.match(result.block,/FAILURE CHECKS/);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(result.evidence.reference.path)).digest('hex'),result.evidence.reference.sha256);
  }
  assert.match(serpent.block,/siblings under Tail/);
  assert.match(make('jorogumo').block,/SpiderLeft\/Right1\.\.4/);
  assert.equal(make('jorogumo').evidence.reference,null);
  const attack=make('aswang','attack');
  assert.equal(attack.evidence.reference.clipId,'attack');
  assert.match(attack.block,/existing hit timing/);
  assert.equal(make('kelpie').evidence.reference,null,'never use the same module as its own transfer example');
});
test('internal motion coaching drops a stale reference and fails closed on changed rig facts',t=>{
  const cwd=tempRoot();t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const root='assets/roblox/world-ghosts';
  for(const relative of ['GhostSkinCatalog.luau','GhostSkinFactory.luau','native/build-evidence.json','motions/kelpie/init.luau'])write(path.join(cwd,root,relative),fs.readFileSync(path.join(root,relative),'utf8'));
  const order={source:{internalAssetMotion:true},assetProduction:{motionRepairWorkUnit:{scope:'INTERNAL_ASSET_LIBRARY',objectId:'bulgasari',clipId:'walk'}}};
  assert.equal(buildInternalMotionCoaching({cwd,order}).evidence.reference.objectId,'kelpie');
  fs.appendFileSync(path.join(cwd,root,'motions/kelpie/init.luau'),'\n-- uncompiled change');
  assert.equal(buildInternalMotionCoaching({cwd,order}).evidence.reference,null);
  fs.appendFileSync(path.join(cwd,root,'GhostSkinFactory.luau'),'\n-- changed rig');
  assert.equal(buildInternalMotionCoaching({cwd,order}).evidence.retrieved,false);
});
test('internal motion prompt uses one compatible compiled example while retaining all quality axes',()=>{
  const source=fs.readFileSync('assets/roblox/world-ghosts/motions/aswang/init.luau','utf8');
  const unit={scope:'INTERNAL_ASSET_LIBRARY',objectId:'roblox-world-ghost-aswang',clipId:'walk',sourcePath:'init.luau',sourceWindow:source.slice(source.indexOf('function Motion.walk'),source.lastIndexOf('return Motion')).trim(),sourceHash:crypto.createHash('sha256').update(source).digest('hex')};
  const order={target:'roblox',assetProductionLane:true,source:{internalAssetMotion:true},assetProduction:{motionRepairWorkUnit:unit}};
  const context={files:[{path:'init.luau',editable:true,content:source}]};
  const motionCoaching=buildInternalMotionCoaching({order});
  assert.ok(motionCoaching.evidence.reference);
  const prompt=buildPrompt(order,context,['init.luau'],{motionCoaching});
  const duplicated=buildPrompt(order,context,['init.luau'],{motionCoaching:{block:motionCoaching.block}});
  const recipe=JSON.parse(prompt.split('[MOTION TEACHER PRACTICE BEGIN]\n')[1].split('\n[MOTION TEACHER PRACTICE END]')[0]);
  assert.deepEqual(recipe.lessons.map(row=>row.axis),SINGLE_MOTION_DEPTH_AXES);
  assert.equal(recipe.example.reference.sha256,motionCoaching.evidence.reference.sha256);
  assert.equal(recipe.example.source,undefined);
  assert.ok(prompt.includes(motionCoaching.block));
  assert.ok(prompt.includes(unit.sourceWindow));
  assert.ok(Buffer.byteLength(prompt)<Buffer.byteLength(duplicated)-2000);
  assert.match(prompt,/quarter speed/);assert.match(prompt,/worst frame/);
  assert.match(prompt,/motionRepairReport/);assert.match(prompt,/SOURCE SAMPLING/);
  assert.equal(recipe.runtimeVerified,false);
});

test('internal motion sampler rejects invisible-only changes, frozen output, stateful sampling and rig mutation',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async t=>{
  const cwd=tempRoot();t.after(()=>fs.rmSync(cwd,{recursive:true,force:true}));
  const root=path.join(cwd,'assets/roblox/world-ghosts');
  for(const file of ['GhostSkinCatalog.luau','GhostSkinFactory.luau'])write(path.join(root,file),fs.readFileSync(path.join('assets/roblox/world-ghosts',file),'utf8'));
  const sourceRoot=path.join(root,'motions/gwisin-bride');
  const source=fs.readFileSync('assets/roblox/world-ghosts/motions/gwisin-bride/init.luau','utf8');
  write(path.join(sourceRoot,'init.luau'),source);
  const check=insert=>validateCandidateSyntax({sourceRoot,target:'roblox',luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER,internalMotionUnit:{scope:'INTERNAL_ASSET_LIBRARY',objectId:'roblox-world-ghost-gwisin-bride'},candidate:{edits:[{path:'init.luau',find:' return result',replace:insert+'\n return result'}],newFiles:[],replaceFiles:[]}});
  assert.throws(()=>check(' result.LeftLeg.rx = result.LeftLeg.rx + .1'),/MOTION_VISIBLE_OUTPUT_UNCHANGED/);
  assert.throws(()=>check(' for _,p in pairs(result)do for axis in pairs(p)do p[axis]=0 end end'),/MOTION_VISIBLE_OUTPUT_FROZEN/);
  assert.throws(()=>check(' Motion.calls=(Motion.calls or 0)+1\n result.Head.rx=Motion.calls*.0001'),/MOTION_SAMPLE_ORDER_DEPENDENT/);
  assert.throws(()=>check(' bones.Head.position[1]=.2'),/readonly/);
  assert.throws(()=>check(' result.Root.rx=.1'),/GAMEPLAY_ROOT_CHANGED/);
  const result=check(' result.Head.rx=result.Head.rx+.01*math.sin(time*2)');
  assert.equal(result.pass,true);
  assert.equal(result.scope,'SYNTAX_AND_MOTION_SAMPLES');
  assert.equal(result.motionSamples.count,133);
  assert.equal(result.motionSamples.visibleOutputChanged,true);
  assert.equal(result.motionSamples.reverseOrderDeterministic,true);
  assert.equal(result.runtimeVerified,false);
  assert.equal(result.motionSamples.nativeQualityVerified,false);
  const responseFiles=['result.LeftLeg.rx=result.LeftLeg.rx+.1','result.Head.rx=result.Head.rx+.01*math.sin(time*2)'].map((code,i)=>{
    const file=path.join(cwd,'answer-'+i+'.json');
    write(file,JSON.stringify({edits:[{path:'init.luau',find:' return result',replace:' '+code+'\n return result'}]}));
    return file;
  });
  const recovered=await generateCandidateWithRecovery({prompt:'Engine: roblox\n[SINGLE MOTION WORK UNIT BEGIN]\none source-bound walk\n[SINGLE MOTION WORK UNIT END]',target:'roblox',responsibleFiles:['init.luau'],sourceRootRelative:'assets/roblox/world-ghosts/motions/gwisin-bride',sourceRoot,allowFullRewrite:false,singleMotionWorkUnit:true,responseFiles,candidateValidator:candidate=>validateCandidateSyntax({candidate,sourceRoot,target:'roblox',luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER,internalMotionUnit:{scope:'INTERNAL_ASSET_LIBRARY',objectId:'roblox-world-ghost-gwisin-bride'}})});
  assert.equal(recovered.generation.attempts,2);
  assert.equal(recovered.generation.completionMode,'JSON_SINGLE_MOTION');
  assert.equal(fs.readFileSync(path.join(sourceRoot,'init.luau'),'utf8'),source);
});

test('internal motion prompt keeps exact scope, short source anchors and complete response contract without the oversized game goal',t=>{
  const f=singleMotionFixture(t);
  f.unit.scope='INTERNAL_ASSET_LIBRARY';
  f.order.source={internalAssetMotion:true};
  f.order.goal='UNRELATED_WHOLE_GAME_REBUILD '.repeat(15000);
  const coaching={block:'[INTERNAL MOTION COACHING BEGIN]\nsource-bound-example\n[INTERNAL MOTION COACHING END]'};
  const prompt=buildPrompt(f.order,{files:[{path:'motion.js',content:'const duration = 1.05;\n'+f.unit.sourceWindow}]},f.responsibleFiles,{motionCoaching:coaching});
  assert.ok(Buffer.byteLength(prompt)<12000);
  assert.ok(prompt.includes(f.unit.sourceWindow));
  assert.ok(prompt.includes(coaching.block));
  assert.match(prompt,/const duration = 1\.05/);
  assert.match(prompt,/sixty minutes of active modification depth/);
  assert.doesNotMatch(prompt,/UNRELATED_WHOLE_GAME_REBUILD/);
  const schema=singleMotionResponseSchema();
  assert.ok(schema.required.includes('edits'));
  assert.equal(schema.properties.edits.minItems,1);
  assert.equal(schema.properties.motionRepairReport.properties.depthEvidence.minItems,6);
  assert.equal(schema.properties.motionRepairReport.properties.depthEvidence.maxItems,6);
  assert.equal(schema.additionalProperties,false);
});
function order({ target = 'unity', root = 'unity-games/demo', responsibleFiles = [], taskId = 'task-1' } = {}) {
  return {
    run: true,
    workMode: 'source-change-candidate',
    taskId,
    gameId: 'demo',
    target,
    goal: '기존 책임 파일을 직접 수정해 동작을 보강',
    department: 'development',
    source: { root, responsibleFiles },
    qa: ['syntax', 'regression'],
    workerPolicy: { directMainWrite: false }
  };
}

function robloxFullGraphicsMotionPatch(accent='70,95,130') {
  return [
    'local RunService = game:GetService("RunService")',
    'local character = Instance.new("Model")',
    'character.Name = "PlayerCharacterVisual"',
    'local enemyBody = Instance.new("MeshPart")',
    'enemyBody.Name = "EnemyBody"',
    'enemyBody.Material = Enum.Material.SmoothPlastic',
    'enemyBody.Color = Color3.fromRGB(' + accent + ')',
    'enemyBody.Parent = character',
    'local weapon = Instance.new("MeshPart")',
    'weapon.Name = "SwordEquipment"',
    'weapon.Material = Enum.Material.Metal',
    'weapon.Parent = character',
    'local terrainRock = Instance.new("MeshPart")',
    'terrainRock.Name = "TerrainRockEnvironment"',
    'terrainRock.Material = Enum.Material.Slate',
    'terrainRock.Color = Color3.fromRGB(58,70,82)',
    'terrainRock.Parent = workspace',
    'local hud = Instance.new("ScreenGui")',
    'hud.Name = "PresentationHud"',
    'local impactVfx = Instance.new("ParticleEmitter")',
    'impactVfx.Name = "ImpactVfx"',
    'impactVfx.Parent = terrainRock',
    'RunService.RenderStepped:Connect(function(dt)',
    '  enemyBody.CFrame = enemyBody.CFrame * CFrame.Angles(0, dt * 0.4, 0)',
    '  weapon.Orientation = weapon.Orientation + Vector3.new(0, dt * 8, 0)',
    'end)',
    'panel.BackgroundColor3 = Color3.fromRGB(' + accent + ')'
  ].join('\n');
}

test('hero asset routing selects stronger local model without changing generation budget',()=>{
  const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/client/Game.client.luau'],taskId:'hero-model'});
  workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'roblox',assetProductionLane:true,evidence:['asset-production-parallel:v1']};
  workOrder.assetProduction={modelRouting:{heroRequested:true,selectedModel:'qwen3:4b-instruct',baselineModel:'qwen3:1.7b',heroModel:'qwen3:4b-instruct',fallbackToBaseline:true,generationBudgetUnchanged:true}};
  const route=resolveAssetSourceModel(workOrder,'qwen3:1.7b');
  assert.equal(route.heroRequested,true);
  assert.equal(route.selectedModel,'qwen3:4b-instruct');
  assert.equal(route.cacheFamily,'vibe2-ollama-v6');
  assert.equal(route.cacheKey,'qwen3-4b-instruct');
  assert.equal(route.generationBudgetUnchanged,true);
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'primary'}),4);
});

test('canonical game source work requires a full dynamic internal library contract',()=>{
  const families=Object.fromEntries(ROBLOX_INTERNAL_ASSET_FAMILIES.map(family=>[family,[family+'_ATOM']]));
  const plan={
    required:true,libraryVersion:109,registryAssetCount:717,evaluatedAssetCount:717,
    compatibleCandidateCount:701,baseMaterialAtomCount:360,fingerprint:'a'.repeat(64),
    allRegistryAssetsScanned:true,allTwelveFamiliesEvaluated:true,
    noArtificialAssetCountCap:true,noArtificialFamilyCountCap:true,
    auditScoreIsUsageGate:false,lowScoreCompatibleAssetUseAllowed:true,
    baseMaterialAllCompatibleAtomsSelected:true
  };
  const usage={
    fingerprint:'b'.repeat(64),registryAssetCount:717,evaluatedAssetCount:717,
    compatibleCandidateCount:701,allRegistryAssetsScanned:true,
    applicationCoverage:{currentBuildUpAllCompatibleCandidatesEligible:true}
  };
  const order={
    target:'unity',
    compiledWorkContract:{version:1},
    assetProduction:{
      allGameDynamicLibraryBinding:plan,
      baseMaterialLoadout:{families,universalAssetFirst:{allFamiliesEvaluated:true,missingFamilies:[]}}
    }
  };
  const pass=assertAllGameDynamicAssetBindingContract({order,target:'unity',usageContract:usage});
  assert.equal(pass.required,true);
  assert.equal(pass.pass,true);
  assert.equal(pass.registryAssetCount,717);
  assert.equal(pass.compatibleCandidateCount,701);
  assert.deepEqual(pass.platformOrder,['ROBLOX','UNITY','WEB']);

  assert.throws(()=>assertAllGameDynamicAssetBindingContract({
    order:{...order,assetProduction:{...order.assetProduction,allGameDynamicLibraryBinding:{...plan,evaluatedAssetCount:716}}},
    target:'unity',usageContract:usage
  }),/ALL_GAME_INTERNAL_LIBRARY_SCAN_INCOMPLETE/);
});

test('Unity dynamic asset binding requires actual native family consumption instead of registry-only markers',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'unity-games/demo');
  write(path.join(root,'Assets/Game.cs'),'public class Game {}\n');
  const bindingPlan={
    required:true,libraryVersion:109,fingerprint:'c'.repeat(64),registryAssetCount:717,compatibleCandidateCount:701,
    candidateCountsByFamily:{UI:20},baseMaterialFamilies:{UI:['FRAME_PANEL','BUTTON_PRIMARY']}
  };
  const applied=[
    'using UnityEngine;',
    'using UnityEngine.UI;',
    'public class Game : MonoBehaviour {',
    '  static readonly string[] UiAtoms = {"FRAME_PANEL","BUTTON_PRIMARY"};',
    '  string[] InternalAssetFamily(string family) => family == "UI" ? UiAtoms : System.Array.Empty<string>();',
    '  void RenderMenu(){',
    '    var atoms = InternalAssetFamily("UI");',
    '    var menuCanvas = GetComponent<Canvas>();',
    '    if (menuCanvas != null) menuCanvas.GetComponent<Image>().sprite = Resources.Load<Sprite>(atoms[0]);',
    '  }',
    '}'
  ].join('\n');
  const pass=evaluateAllGameDynamicAssetBindingCandidate({
    sourceRoot:root,target:'unity',bindingPlan,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'Assets/Game.cs',content:applied}]}
  });
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.appliedCount,1);
  assert.equal(pass.changedAppliedFamilyCount,1);
  assert.equal(pass.familyResults.find(row=>row.family==='UI').actualBinding,true);

  for(const unused of [
    applied.replace('menuCanvas.GetComponent<Image>().sprite = Resources.Load<Sprite>(atoms[0])','System.Console.WriteLine(atoms[0])'),
    applied.replace('menuCanvas.GetComponent<Image>().sprite = Resources.Load<Sprite>(atoms[0])','menuCanvas.enabled = atoms.Length > 0'),
    applied.replace('menuCanvas.GetComponent<Image>().sprite = Resources.Load<Sprite>(atoms[0])','/* menuCanvas.GetComponent<Image>().sprite = Resources.Load<Sprite>(atoms[0]); */ System.Console.WriteLine(atoms.Length)')
  ]){
    const unusedResult=evaluateAllGameDynamicAssetBindingCandidate({sourceRoot:root,target:'unity',bindingPlan,
      candidate:{replaceFiles:[{path:'Assets/Game.cs',content:unused}]}});
    assert.equal(unusedResult.pass,false,'UI API near unused registry references cannot prove binding');
  }

  const markerOnly=applied.replace('var menuCanvas = GetComponent<Canvas>();','var menuCanvas = (object)null;')
    .replace('menuCanvas.GetComponent<Image>().sprite = Resources.Load<Sprite>(atoms[0])','System.Console.WriteLine(atoms.Length)');
  const rejected=evaluateAllGameDynamicAssetBindingCandidate({
    sourceRoot:root,target:'unity',bindingPlan,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'Assets/Game.cs',content:markerOnly}]}
  });
  assert.equal(rejected.pass,false);
  assert.ok(rejected.blockers.includes('ALL_GAME_APPLICABLE_ASSET_FAMILY_NOT_BOUND:UI'));
});

test('Web dynamic asset binding requires actual DOM Canvas or WebAudio family consumption',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'web-games/demo');
  write(path.join(root,'index.html'),'<main></main>\n');
  const bindingPlan={
    required:true,libraryVersion:109,fingerprint:'d'.repeat(64),registryAssetCount:717,compatibleCandidateCount:701,
    candidateCountsByFamily:{UI:20},baseMaterialFamilies:{UI:['FRAME_PANEL','BUTTON_PRIMARY']}
  };
  const applied=[
    '<!doctype html><html><body><button id="menu">Open</button><canvas id="game"></canvas><script>',
    'const internalAssetFamilies={UI:["FRAME_PANEL","BUTTON_PRIMARY"]};',
    'const internalAssetFamily=family=>internalAssetFamilies[family]||[];',
    'const menu=document.querySelector("#menu");',
    'const atoms=internalAssetFamily("UI");',
    'menu.classList.add(atoms[0]);',
    '</script></body></html>'
  ].join('\n');
  const pass=evaluateAllGameDynamicAssetBindingCandidate({
    sourceRoot:root,target:'web',bindingPlan,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'index.html',content:applied}]}
  });
  assert.equal(pass.pass,true,pass.blockers.join(','));
  assert.equal(pass.appliedCount,1);

  for(const unused of [
    applied.replace('menu.classList.add(atoms[0]);','console.log(atoms[0]);'),
    applied.replace('menu.classList.add(atoms[0]);','if(atoms.length) menu.classList.add("marker-only");'),
    applied.replace('menu.classList.add(atoms[0]);','// menu.classList.add(atoms[0]);\nconsole.log(atoms[0]);'),
    applied.replace('menu.classList.add(atoms[0]);','/* menu.classList.add(atoms[0]); */')
  ]){
    const unusedResult=evaluateAllGameDynamicAssetBindingCandidate({sourceRoot:root,target:'web',bindingPlan,
      candidate:{replaceFiles:[{path:'index.html',content:unused}]}});
    assert.equal(unusedResult.pass,false,'DOM near unused registry references cannot prove binding');
  }

  const markerOnly=[
    '<!doctype html><html><body><script>',
    'const internalAssetFamilies={UI:["FRAME_PANEL","BUTTON_PRIMARY"]};',
    'const internalAssetFamily=family=>internalAssetFamilies[family]||[];',
    'const menuState=true;',
    'const atoms=internalAssetFamily("UI");',
    'console.log(menuState,atoms.length);',
    '</script></body></html>'
  ].join('\n');
  const rejected=evaluateAllGameDynamicAssetBindingCandidate({
    sourceRoot:root,target:'web',bindingPlan,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'index.html',content:markerOnly}]}
  });
  assert.equal(rejected.pass,false);
  assert.ok(rejected.blockers.includes('ALL_GAME_APPLICABLE_ASSET_FAMILY_NOT_BOUND:UI'));
});

test('Roblox internal asset family binding requires actual family use and rejects false NOT_APPLICABLE',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'roblox-games/demo');
  const expectedFamilies=Object.fromEntries(ROBLOX_INTERNAL_ASSET_FAMILIES.map(family=>[family,[family+'_ATOM']]));
  const configFamilies=ROBLOX_INTERNAL_ASSET_FAMILIES.map(family=>family+' = { "'+family+'_ATOM" }').join(', ');
  write(path.join(root,'shared/GameConfig.luau'),'return { StudioAssets = { Families = { '+configFamilies+' } } }\n');
  write(path.join(root,'client/Game.client.luau'),'local placeholder = true\n');
  const statusRows=ROBLOX_INTERNAL_ASSET_FAMILIES
    .map(family=>`  ${family} = "${family==='UI'?'APPLIED':'NOT_APPLICABLE'}",`)
    .join('\n');
  const appliedUi=[
    'local studioAssetFamilies = {}',
    'local function studioAssetFamily(family) return studioAssetFamilies[family] or {} end',
    'local STUDIO_ASSET_SELECTION = { UI = studioAssetFamily("UI") }',
    'local STUDIO_ASSET_FAMILY_STATUS = {',
    statusRows,
    '}',
    'local root = Instance.new("Frame")',
    'local stroke = Instance.new("UIStroke")',
    'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION.UI, ","))',
    'if #studioAssetFamily("UI") > 0 then stroke.Thickness = 2 end'
  ].join('\n');
  const pass=evaluateRobloxInternalAssetFamilyBindingCandidate({
    sourceRoot:root,expectedFamilies,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'client/Game.client.luau',content:appliedUi}]}
  });
  assert.equal(pass.pass,true);
  assert.equal(pass.appliedCount,1);
  assert.equal(pass.notApplicableCount,11);
  assert.equal(pass.changedAppliedFamilyCount,1);

  const genericScaffold=evaluateRobloxInternalAssetFamilyBindingCandidate({
    sourceRoot:root,expectedFamilies,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'client/Game.client.luau',content:appliedUi+'\nlocal camera = workspace.CurrentCamera\nlocal itemCount = 3\nlocal function run() return itemCount end'}]}
  });
  assert.equal(genericScaffold.pass,true,genericScaffold.blockers.join(','));
  assert.equal(genericScaffold.familyResults.find(row=>row.family==='ENVIRONMENT').systemPresent,false);
  assert.equal(genericScaffold.familyResults.find(row=>row.family==='MOTION').systemPresent,false);
  assert.equal(genericScaffold.familyResults.find(row=>row.family==='PROP').systemPresent,false);

  const falseNotApplicable=evaluateRobloxInternalAssetFamilyBindingCandidate({
    sourceRoot:root,expectedFamilies,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'client/Game.client.luau',content:appliedUi+'\nlocal enemy = Instance.new("Model")\nenemy.Name = "EnemyBoss"'}]}
  });
  assert.equal(falseNotApplicable.pass,false);
  assert.ok(falseNotApplicable.blockers.includes('ROBLOX_INTERNAL_ASSET_NOT_APPLICABLE_EXISTING_SYSTEM:CREATURE'));

  const markerOnly=appliedUi
    .replace('local STUDIO_ASSET_SELECTION = { UI = studioAssetFamily("UI") }','local STUDIO_ASSET_SELECTION = { UI = {"UI_ATOM"} }')
    .replace('if #studioAssetFamily("UI") > 0 then stroke.Thickness = 2 end','stroke.Thickness = 2');
  const rejected=evaluateRobloxInternalAssetFamilyBindingCandidate({
    sourceRoot:root,expectedFamilies,
    candidate:{edits:[],newFiles:[],replaceFiles:[{path:'client/Game.client.luau',content:markerOnly}]}
  });
  assert.equal(rejected.pass,false);
  assert.ok(rejected.blockers.includes('ROBLOX_INTERNAL_ASSET_FAMILY_NOT_ACTUALLY_BOUND:UI'));
});

test('internal asset detail rotation stays enabled while every selected API remains indexed in the same BUILD_UP',()=>{
  const cwd=tempRoot();
  const sourcePaths=[];
  for(let i=0;i<6;i++){
    const relative=`assets/internal-api-${i}/Common${i}.luau`;
    sourcePaths.push(relative);
    write(path.join(cwd,relative),[
      `local Common${i} = {}`,
      `function Common${i}.Create${i}(options)`,
      '  return options',
      'end',
      `return Common${i}`
    ].join('\n')+'\n');
  }
  const contract={
    target:'roblox',
    exactFamilies:{},
    flowSelections:[],
    sourceCandidates:sourcePaths.map((relative,index)=>({
      assetId:`asset-${index}`,
      family:'CUSTOM',
      sourceFiles:[relative],
      path:null
    })),
    synchronization:{
      apiContextBatchSize:4,
      apiContextMaxBytes:18000,
      apiContextPerFileMaxBytes:4500,
      apiContextRotationByBuildUpGeneration:true
    }
  };
  const first=attachSelectedInternalAssetApiContext(
    {files:[],bytes:0},
    {cwd,contract,order:{selectedTask:{buildUpGeneration:1}}}
  );
  const second=attachSelectedInternalAssetApiContext(
    {files:[],bytes:0},
    {cwd,contract,order:{selectedTask:{buildUpGeneration:2}}}
  );
  assert.equal(first.internalAssetApiContextFiles.length,4);
  assert.equal(second.internalAssetApiContextFiles.length,4);
  assert.equal(first.internalAssetApiContextRotationStart,0);
  assert.equal(second.internalAssetApiContextRotationStart,4);
  assert.notDeepEqual(first.internalAssetApiContextFiles,second.internalAssetApiContextFiles);
  assert.equal(first.internalAssetApiContextEligibleSourceCount,6);
  assert.equal(first.internalAssetApiIndexRepresentedSourceCount,6);
  assert.equal(first.internalAssetApiIndexAvailableSourceCount,6);
  assert.equal(first.internalAssetApiIndexUnavailableSourceCount,0);
  assert.equal(first.internalAssetApiIndexSignatureCount,6);
  assert.equal(first.internalAssetApiIndexAllSelectedSourcesEveryBuildUp,true);
  assert.equal(second.internalAssetApiIndex,first.internalAssetApiIndex);
  for(let i=0;i<6;i++)assert.match(first.internalAssetApiIndex,new RegExp(`Common${i}\\.Create${i}\\(options\\)`));
});

test('native asset authoring evidence requires real engine-native source delta and never claims runtime promotion',()=>{
  const workOrder=order({target:'roblox'});
  workOrder.assetProduction={nativeAuthoringExecution:{
    enabled:true,
    dcc:{requiredTypes:['character']},
    nativeText:{requiredTypes:['character']}
  }};
  const weak=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:'-- authoring planned'}]}});
  assert.equal(weak.runtimeVerified,false);
  assert.equal(weak.companyPromotionEligible,false);
  assert.notEqual(weak.status,'NATIVE_SOURCE_AUTHORED_RUNTIME_REQUIRED');
  const strong=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:[
    'local model = Instance.new("Model")',
    'local body = Instance.new("MeshPart")',
    'body.Parent = model',
    'model:PivotTo(CFrame.new(0,4,0))'
  ].join('\n')}]}});
  assert.equal(strong.nativeTextAuthored,true);
  assert.equal(strong.dccRequired,true);
  assert.equal(strong.dccAuthored,false);
  assert.equal(strong.dccStatus,'DCC_AUTHORING_EXECUTOR_REQUIRED');
  assert.equal(strong.status,'NATIVE_SOURCE_AUTHORED_DCC_EXECUTOR_REQUIRED');
  assert.equal(strong.runtimeVerified,false);
});

test('native DCC authoring stays incomplete until every required DCC type has execution evidence',()=>{
  const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/client/Game.client.luau'],taskId:'dcc-type-coverage'});
  workOrder.assetProduction={nativeAuthoringExecution:{
    enabled:true,target:'roblox',
    dcc:{
      requiredTypes:['background','prop'],
      executionEvidence:{
        executed:true,allRecipesPassed:true,candidateUsable:true,persistedForCandidate:true,
        editableSource:'assets/native-authoring/build-game-visual.py',
        nativeArtifact:'assets/generated/roblox/demo/background/asset.glb',
        artifactHash:'bg123',preview:'assets/generated/roblox/demo/background/preview.png',
        recipes:[{id:'background',types:['background'],nativeArtifact:'assets/generated/roblox/demo/background/asset.glb',artifactHash:'bg123',sourceHash:'src123',persistedForCandidate:true}]
      }
    },
    nativeText:{requiredTypes:['background','prop']}
  }};
  const source=[
    'local model = Instance.new("Model")',
    'local part = Instance.new("Part")',
    'part.Parent = model',
    'local background = "assets/generated/roblox/demo/background/asset.glb"',
    'local backgroundSha = "bg123"'
  ].join('\n');
  const partial=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:source}]}});
  assert.equal(partial.dccTypeCoveragePass,false);
  assert.deepEqual([...partial.dccCoveredTypes],['background']);
  assert.equal(partial.dccAuthored,false);
  assert.equal(partial.status,'NATIVE_SOURCE_AUTHORED_DCC_EXECUTOR_REQUIRED');

  workOrder.assetProduction.nativeAuthoringExecution.dcc.executionEvidence={
    ...workOrder.assetProduction.nativeAuthoringExecution.dcc.executionEvidence,
    recipes:[
      ...workOrder.assetProduction.nativeAuthoringExecution.dcc.executionEvidence.recipes,
      {id:'prop',types:['prop'],nativeArtifact:'assets/generated/roblox/demo/prop/asset.glb',artifactHash:'prop456',sourceHash:'src456',persistedForCandidate:true}
    ]
  };
  const completeSource=source+'\nlocal prop = "assets/generated/roblox/demo/prop/asset.glb"\nlocal propSha = "prop456"';
  const complete=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:completeSource}]}});
  assert.equal(complete.dccTypeCoveragePass,true);
  assert.deepEqual([...complete.dccCoveredTypes].sort(),['background','prop']);
  assert.equal(complete.dccAuthored,true);
  assert.equal(complete.generatedAssetBindingApplied,true);
});

test('generated native asset binding requires exact artifact path hash and engine-native source',()=>{
  const workOrder=order({target:'unity',root:'unity-games/demo',responsibleFiles:['unity-games/demo/Assets/Scripts/GameCore.cs'],taskId:'generated-binding'});
  workOrder.assetProduction={nativeAuthoringExecution:{
    enabled:true,target:'unity',platformReauthoringRequired:true,webAssetDirectReuseIntoRobloxOrUnityForbidden:true,
    dcc:{
      requiredTypes:['boss'],
      executionEvidence:{
        executed:true,allRecipesPassed:true,candidateUsable:true,persistedForCandidate:true,
        editableSource:'assets/unity/demo/build-boss.py',
        nativeArtifact:'assets/unity/demo/native/boss/boss.glb',
        artifactHash:'abc123',
        preview:'assets/unity/demo/native/boss/preview.png',
        recipes:[{
          id:'boss-v1',nativeArtifact:'assets/unity/demo/native/boss/boss.glb',artifactHash:'abc123',
          sourceHash:'source123',persistedForCandidate:true
        }]
      }
    },
    nativeText:{requiredTypes:['boss']}
  }};
  const missingHash=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:[
    'var boss = new GameObject("Boss");',
    'boss.AddComponent<MeshRenderer>();',
    'boss.transform.position = Vector3.zero;',
    'const string source = "assets/unity/demo/native/boss/boss.glb";'
  ].join('\n')}]}});  
  assert.equal(missingHash.dccAuthored,true);
  assert.equal(missingHash.generatedAssetBindingRequired,true);
  assert.equal(missingHash.generatedAssetBindingApplied,false);
  assert.equal(missingHash.status,'GENERATED_ASSET_BINDING_REQUIRED');

  const exact=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:[
    'var boss = new GameObject("Boss");',
    'boss.AddComponent<MeshRenderer>();',
    'boss.transform.position = Vector3.zero;',
    'const string source = "assets/unity/demo/native/boss/boss.glb";',
    'const string sourceSha256 = "abc123";'
  ].join('\n')}]}});  
  assert.equal(exact.generatedAssetBindingApplied,true);
  assert.deepEqual([...exact.boundGeneratedArtifacts],['assets/unity/demo/native/boss/boss.glb']);
  assert.equal(exact.generatedAssetIdentityBindings[0].artifactHash,'abc123');
  assert.equal(exact.runtimeVerified,false);
});


test('persisted Roblox DCC assets bind exact path and hash before local-model retry',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'roblox-games/demo');
  const relative='client/Game.client.luau';
  const source=[
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'root.Name = "Root"',
    'root.AnchorPoint = Vector2.new(0.5, 1)',
    'root.Position = UDim2.fromScale(0.5, 0.98)',
    'root.Size = UDim2.new(1, -24, 0, 360)',
    'root.BackgroundTransparency = 0.15',
    'root.BackgroundColor3 = Color3.fromRGB(18, 28, 48)',
    'root.Parent = gui',
    'local title = Instance.new("TextLabel")',
    'title.BackgroundTransparency = 1',
    'title.TextColor3 = Color3.fromRGB(245, 248, 255)',
    'title.TextScaled = true',
    'title.Text = string.format("%s · %s · %s", Config.GameName, Config.Genre, Config.PlayMode)',
    'title.Parent = root',
    'local status = Instance.new("TextLabel")',
    'status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)',
    'status.TextColor3 = Color3.fromRGB(220, 232, 250)',
    'status.TextScaled = true',
    'status.Parent = root',
    ''
  ].join('\n');
  write(path.join(sourceRoot,relative),source);
  const workOrder=order({
    target:'roblox',
    root:'roblox-games/demo',
    responsibleFiles:['roblox-games/demo/'+relative],
    taskId:'persisted-dcc-binding'
  });
  workOrder.selectedTask={
    id:workOrder.taskId,gameId:'demo',target:'roblox',
    assetProductionLane:true,evidence:['asset-production-parallel:v1']
  };
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  const recipes=[
    {
      id:'demo-background',assetId:'demo-background',family:'BACKGROUND',types:['background'],license:'project-original',
      nativeArtifact:'assets/generated/roblox/demo/background/asset.glb',artifactHash:'bg123',
      sourceHash:'bg-source',preview:'assets/generated/roblox/demo/background/preview.png',persistedForCandidate:true
    },
    {
      id:'demo-item',assetId:'demo-item',family:'ITEM',types:['item'],license:'project-original',
      nativeArtifact:'assets/generated/roblox/demo/item/asset.glb',artifactHash:'item456',
      sourceHash:'item-source',preview:'assets/generated/roblox/demo/item/preview.png',persistedForCandidate:true
    },
    {
      id:'demo-prop',assetId:'demo-prop',family:'PROP',types:['prop'],license:'project-original',
      nativeArtifact:'assets/generated/roblox/demo/prop/asset.glb',artifactHash:'prop789',
      sourceHash:'prop-source',preview:'assets/generated/roblox/demo/prop/preview.png',persistedForCandidate:true
    }
  ];
  workOrder.assetProduction={nativeAuthoringExecution:{
    enabled:true,target:'roblox',
    dcc:{
      requiredTypes:['background','item','prop'],
      executionEvidence:{
        executed:true,allRecipesPassed:true,candidateUsable:true,persistedForCandidate:true,
        editableSource:'assets/native-authoring/build-game-visual.py',
        nativeArtifact:recipes[0].nativeArtifact,
        artifactHash:recipes[0].artifactHash,
        preview:recipes[0].preview,
        recipes
      }
    },
    nativeText:{requiredTypes:['background','item','prop']}
  }};

  assert.equal(robloxDeterministicPresentationEligible(workOrder),false);
  const bindings=persistedGeneratedAssetBindings(workOrder);
  assert.equal(bindings.length,3);
  const generated=deterministicRobloxBuildUpCandidate({
    order:workOrder,
    sourceRoot,
    sourceRootRelative:'roblox-games/demo',
    responsibleFiles:[relative],
    generatedAssetBindings:bindings,
    allowAssetDevelopment:true
  });
  assert.ok(generated);
  assert.equal(generated.generation.mode,'DETERMINISTIC_GENERATED_ASSET_BINDING');
  assert.equal(generated.generation.attempts,0);
  assert.equal(generated.generation.generatedAssetBindingCount,3);

  const changed=generated.candidate.edits.map(row=>row.replace).join('\n');
  for(const binding of bindings){
    assert.ok(changed.includes(binding.path));
    assert.ok(changed.includes(binding.artifactHash));
  }
  assert.match(changed,/game:GetService\("Lighting"\)/);
  assert.match(changed,/TweenService/);

  const authored=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:generated.candidate});
  assert.equal(authored.dccAuthored,true);
  assert.equal(authored.nativeTextAuthored,true);
  assert.equal(authored.generatedAssetBindingApplied,true);
  assert.deepEqual([...authored.boundGeneratedArtifacts].sort(),bindings.map(row=>row.path).sort());
  assert.equal(authored.runtimeVerified,false);

  const promotion=collectNativeAssetRuntimePromotionCandidates({order:workOrder,candidate:generated.candidate});
  assert.equal(promotion.length,3);
  assert.ok(promotion.every(row=>row.candidateSourceBindingVerified===true));
  assert.ok(promotion.every(row=>row.runtimeVerificationRequired===true));
  assert.ok(promotion.every(row=>row.promotionState==='PENDING_EXACT_NATIVE_RUNTIME'));
});

test('declared Blender verification executes only declared recipe and restores the repository',()=>{
  const root=tempRoot();
  try{
    fs.mkdirSync(path.join(root,'assets/test/native/model'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets/test/build.py'),'# fixture recipe\n');
    fs.writeFileSync(path.join(root,'assets/test/native/model/model.glb'),'fixture-glb');
    fs.writeFileSync(path.join(root,'assets/test/native/model/preview.png'),'fixture-preview');
    fs.writeFileSync(path.join(root,'assets/test/native/model/evidence.json'),JSON.stringify({runtimeVerificationState:'STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING',productionVerified:false}));
    const blender=path.join(root,'fake-blender');
    fs.writeFileSync(blender,[
      '#!/usr/bin/env node',
      'const fs=require("fs"),path=require("path");',
      'if(process.argv.includes("--version")){console.log("Blender 4.0 fixture");process.exit(0)}',
      'const at=process.argv.indexOf("--");const args=at>=0?process.argv.slice(at+1):[];',
      'const oi=args.indexOf("--output");const out=oi>=0?args[oi+1]:"assets/test/native/model";',
      'fs.mkdirSync(out,{recursive:true});',
      'fs.writeFileSync(path.join(out,"model.glb"),"fixture-glb");',
      'fs.writeFileSync(path.join(out,"preview.png"),"fixture-preview");',
      'fs.writeFileSync(path.join(out,"evidence.json"),JSON.stringify({runtimeVerificationState:"STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING",productionVerified:false}));'
    ].join('\n')+'\n');
    fs.chmodSync(blender,0o755);
    execFileSync('git',['init'],{cwd:root});
    execFileSync('git',['config','user.email','test@example.invalid'],{cwd:root});
    execFileSync('git',['config','user.name','test'],{cwd:root});
    execFileSync('git',['add','.'],{cwd:root});
    execFileSync('git',['commit','-m','fixture'],{cwd:root});
    const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/client/Game.client.luau'],taskId:'dcc-verify'});
    workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'roblox',assetProductionLane:true,evidence:['asset-production-parallel:v1']};
    workOrder.assetProduction={nativeAuthoringExecution:{dcc:{executionRecipes:[{
      id:'fixture-blender',executor:'BLENDER_PYTHON',script:'assets/test/build.py',runMode:'VERIFY_ONLY',
      args:['--output','assets/test/native/model'],outputs:['assets/test/native/model/model.glb','assets/test/native/model/preview.png','assets/test/native/model/evidence.json'],
      evidenceJson:'assets/test/native/model/evidence.json',preview:'assets/test/native/model/preview.png',editableSource:'assets/test/build.py'
    }]}}};
    const result=executeDeclaredNativeDccAuthoringVerification({cwd:root,order:workOrder,blenderExecutable:blender});
    assert.equal(result.executed,true);
    assert.equal(result.candidateUsable,true);
    assert.equal(result.status,'DCC_RECIPE_REPRODUCED_EXISTING_ARTIFACT');
    assert.equal(result.recipes[0].runtimeVerified,false);
    assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('declared Blender authoring persists exact generated outputs only inside the candidate Work Lock',()=>{
  const root=tempRoot();
  try{
    fs.mkdirSync(path.join(root,'assets/test'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets/test/build.py'),'# fixture recipe\n');
    const blender=path.join(root,'fake-blender');
    fs.writeFileSync(blender,[
      '#!/usr/bin/env node',
      'const fs=require("fs"),path=require("path");',
      'if(process.argv.includes("--version")){console.log("Blender 4.0 fixture");process.exit(0)}',
      'const at=process.argv.indexOf("--");const args=at>=0?process.argv.slice(at+1):[];',
      'const oi=args.indexOf("--output");const out=oi>=0?args[oi+1]:"assets/test/native/model";',
      'fs.mkdirSync(out,{recursive:true});',
      'fs.writeFileSync(path.join(out,"model.glb"),"candidate-glb");',
      'fs.writeFileSync(path.join(out,"preview.png"),"candidate-preview");',
      'fs.writeFileSync(path.join(out,"evidence.json"),JSON.stringify({runtimeVerificationState:"STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING",productionVerified:false}));'
    ].join('\n')+'\n');
    fs.chmodSync(blender,0o755);
    execFileSync('git',['init'],{cwd:root});
    execFileSync('git',['config','user.email','test@example.invalid'],{cwd:root});
    execFileSync('git',['config','user.name','test'],{cwd:root});
    execFileSync('git',['add','.'],{cwd:root});
    execFileSync('git',['commit','-m','fixture'],{cwd:root});
    execFileSync('git',['checkout','-b','vibe2/candidate/dcc-persist'],{cwd:root});
    const outputs=['assets/test/native/model/model.glb','assets/test/native/model/preview.png','assets/test/native/model/evidence.json'];
    const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/client/Game.client.luau'],taskId:'dcc-persist'});
    workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'roblox',assetProductionLane:true,evidence:['asset-production-parallel:v1']};
    workOrder.compiledWorkContract={workLock:{files:['roblox-games/demo/client/Game.client.luau',...outputs]}};
    workOrder.assetProduction={nativeAuthoringExecution:{dcc:{executionRecipes:[{
      id:'fixture-blender',executor:'BLENDER_PYTHON',script:'assets/test/build.py',runMode:'VERIFY_ONLY',
      args:['--output','assets/test/native/model'],outputs,
      evidenceJson:'assets/test/native/model/evidence.json',preview:'assets/test/native/model/preview.png',editableSource:'assets/test/build.py'
    }]}}};
    const result=executeDeclaredNativeDccAuthoringVerification({cwd:root,order:workOrder,blenderExecutable:blender,persistCandidateOutputs:true});
    assert.equal(result.executed,true);
    assert.equal(result.persistedForCandidate,true);
    assert.equal(result.candidateUsable,true);
    assert.equal(result.status,'DCC_RECIPE_EXECUTED_CANDIDATE_PERSISTED');
    assert.deepEqual([...result.generatedFiles],outputs);
    for(const relative of outputs)assert.ok(fs.existsSync(path.join(root,relative)),relative);
    const status=execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:root,encoding:'utf8'});
    assert.match(status,/assets\/test\/native\/model\/model\.glb/);
    workOrder.compiledWorkContract.workLock.files=['roblox-games/demo/client/Game.client.luau'];
    assert.throws(
      ()=>executeDeclaredNativeDccAuthoringVerification({cwd:root,order:workOrder,blenderExecutable:blender,persistCandidateOutputs:true}),
      /NATIVE_DCC_WORK_LOCK_SCOPE_MISSING/
    );
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Web asset authoring recognizes native SVG Canvas CSS JS and WebAudio source without DCC reuse',()=>{
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'web-native-authoring'});
  workOrder.assetProduction={nativeAuthoringExecution:{
    enabled:true,target:'web',platformReauthoringRequired:true,webAssetDirectReuseIntoRobloxOrUnityForbidden:true,
    dcc:{requiredTypes:[]},
    nativeText:{requiredTypes:['ui','effect'],authoringMode:'SVG_CSS_CANVAS_JS_WEBAUDIO_NATIVE'}
  }};
  const result=evaluateNativeAssetAuthoringCandidate({order:workOrder,candidate:{edits:[{replace:[
    '<svg viewBox="0 0 32 32"><path d="M0 0L32 32"/></svg>',
    'const ctx = canvas.getContext("2d"); ctx.fillRect(0,0,10,10);',
    'requestAnimationFrame(render);',
    'const audio = new AudioContext(); const osc = audio.createOscillator();',
    '<style>@keyframes pulse{to{transform:scale(1.05)}} .fx{animation:pulse .2s}</style>'
  ].join('\n')}]}});  
  assert.equal(result.required,true);
  assert.equal(result.target,'web');
  assert.equal(result.dccRequired,false);
  assert.equal(result.nativeTextAuthored,true);
  assert.equal(result.status,'WEB_NATIVE_SOURCE_AUTHORED_RUNTIME_REQUIRED');
  assert.equal(result.platformNativeReauthoringRequired,true);
  assert.equal(result.webArtifactCopyIntoRobloxOrUnityForbidden,true);
  assert.equal(result.runtimeVerified,false);
});

test('asset runtime promotion candidates require exact source binding to an unverified asset',()=>{
  const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/client/Game.client.luau'],taskId:'asset-promotion'});
  workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'roblox',assetProductionLane:true,evidence:['asset-production-parallel:v1']};
  workOrder.assetProduction={decisions:[{type:'enemy',qualityDNA:{profile:'CREATURE'},reuseCandidates:[
    {id:'wolf-derived',family:'CREATURE',license:'project-original-derivative',path:'assets/wolf-derived.glb',sourceHash:'wolf-source',artifactHash:'wolf-artifact',productionVerified:false},
    {id:'already-verified',family:'CREATURE',license:'project-original',robloxAssetId:'123456789',sourceHash:'verified-source',productionVerified:true},
    {id:'unused-spider',family:'CREATURE',license:'project-original',robloxAssetId:'987654321',sourceHash:'spider-source',productionVerified:false}
  ]}]};
  const candidate={edits:[{path:'client/Game.client.luau',replace:[
    'local WOLF_ASSET = "wolf-derived"',
    'local WOLF_SOURCE = "assets/wolf-derived.glb"',
    'local VERIFIED = "rbxassetid://123456789"'
  ].join('\n')}]};
  const rows=collectNativeAssetRuntimePromotionCandidates({order:workOrder,candidate});
  assert.deepEqual(rows.map(row=>row.assetId),['wolf-derived']);
  assert.equal(rows[0].sourceHash,'wolf-source');
  assert.equal(rows[0].artifactHash,'wolf-artifact');
  assert.equal(rows[0].candidateSourceBindingVerified,true);
  assert.ok(rows[0].bindingEvidence.includes('ASSET_ID'));
  assert.ok(rows[0].bindingEvidence.includes('ASSET_PATH'));
});
test('game context capsule keeps responsibility save style and verified memory through focused retries',()=>{
  const relative='client/Game.client.luau';
  const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/'+relative],taskId:'context-capsule'});
  workOrder.goal='improve the current visual responsibility without changing gameplay';
  workOrder.assetProduction={qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',qualityDNA:{styleProfile:'STYLIZED_DARK'}};
  workOrder.unifiedLearning={failureFingerprint:'old-failure',playbookReuse:[{id:'verified-playbook-a'}]};
  const exploration={editContract:{
    primaryTargets:['renderEnemy'],primarySystems:['PRESENTATION'],dependentSystems:['VFX'],ownedState:['enemyState'],
    semanticDiffBudget:{saveKeysMustRemainCompatible:['save_v1']},
    patchRecipe:{failureFingerprint:'enemy-visual-fp',verifiedMemoryIds:['memory-a']}
  }};
  const capsule=buildGameContextCapsule({order:workOrder,exploration,responsibleFiles:[relative]});
  assert.equal(capsule.gameId,'demo');
  assert.equal(capsule.target,'roblox');
  assert.deepEqual(capsule.responsibility.primaryTargets,['renderEnemy']);
  assert.deepEqual(capsule.protected.saveKeys,['save_v1']);
  assert.equal(capsule.style.styleProfile,'STYLIZED_DARK');
  assert.deepEqual(capsule.learning.verifiedMemoryIds,['memory-a','verified-playbook-a']);

  const source='local function renderEnemy()\n  panel.BackgroundColor3 = Color3.fromRGB(18,28,48)\nend\n';
  const prompt=buildPrompt(workOrder,{files:[{path:relative,editable:true,content:source}]},[relative],{exploration});
  assert.match(prompt,/\[GAME CONTEXT CAPSULE BEGIN\]/);
  assert.match(prompt,/save_v1/);
  assert.match(prompt,/\[PRE-SUBMIT SELF REVIEW BEGIN\]/);

  const focused=buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:[relative]});
  assert.ok(focused);
  assert.match(focused.prompt,/\[GAME CONTEXT CAPSULE BEGIN\]/);
  assert.match(focused.prompt,/\[PRE-SUBMIT SELF REVIEW BEGIN\]/);

  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,error:new Error('STUDIO_QUALITY_DELTA_REQUIRED:BUILD_UP'),
    responsibleFiles:[relative],attempt:3,failureRepeatCount:2
  });
  assert.match(retry,/\[GAME CONTEXT CAPSULE BEGIN\]/);
  assert.match(retry,/\[PRE-SUBMIT SELF REVIEW BEGIN\]/);
  assert.match(retry,/\[REPEATED FAILURE STRATEGY SHIFT\]/);
  assert.match(retry,/repeatCount=2/);
});

test('candidate self review rejects comment-only game changes and keeps retryable failure class',()=>{
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'self-review'});
  const bad={edits:[{path:'index.html',find:'const score = 0;',replace:'const score = 0;\n<!-- reviewed -->'}],newFiles:[],replaceFiles:[]};
  const review=evaluateCandidateSelfReview({candidate:bad,order:workOrder,responsibleFiles:['index.html']});
  assert.equal(review.required,true);
  assert.equal(review.pass,false);
  assert.ok(review.issues.includes('MEANINGFUL_EXECUTABLE_DELTA'));
  const error=new Error('CANDIDATE_SELF_REVIEW_REQUIRED:'+review.issues.join('|'));
  assert.equal(generationFailureClass(error),'SELF_REVIEW');
  assert.equal(shouldRetryGenerationError(error),true);

  const good={edits:[{path:'index.html',find:'const score = 0;',replace:'const score = 1;'}],newFiles:[],replaceFiles:[]};
  assert.equal(evaluateCandidateSelfReview({candidate:good,order:workOrder,responsibleFiles:['index.html']}).pass,true);
});

test('BUILD_UP and self review reject inline block and formatting-only growth on every platform',()=>{
  const cases=[
    ['web','index.html','const score = 1;','const score = 1; /* source growth */'],
    ['unity','Game.cs','int score = 1;','int score = 1; // source growth'],
    ['roblox','Game.luau','local score = 1','local score = 1 --[=[ source growth ]=]'],
    ['web','game.js','const score = 1;','const   score=1;'],
    ['web','index.html','<canvas id="game"></canvas>','<canvas id="game"></canvas><!-- source growth -->']
  ];
  const contract={phase:'BUILD_UP',focusPillar:'CORE_FUN',requiredConnectedImprovements:{min:1}};
  for(const [target,relative,before,after] of cases){
    const candidate={edits:[{path:relative,find:before,replace:after}]};
    assert.equal(evaluateCandidateSelfReview({candidate,order:{target}}).pass,false,relative);
    assert.equal(evaluateStudioQualityCandidateDelta({candidate,contract}).sourceDeltaUnits,0,relative);
  }
  for(const [target,relative,before,after] of [
    ['web','game.js','const url="https://assets/a";','const url="https://assets/b";'],
    ['roblox','Game.luau','local text=[=[-- old]=]','local text=[=[-- new]=]'],
    ['unity','Game.cs','var text=@"old // path";','var text=@"new // path";']
  ]){
    const candidate={edits:[{path:relative,find:before,replace:after}]};
    assert.equal(evaluateCandidateSelfReview({candidate,order:{target}}).pass,true,relative);
    assert.equal(evaluateStudioQualityCandidateDelta({candidate,contract}).sourceDeltaUnits,1,relative);
  }
});

test('full-file candidates compare against their actual source before earning growth credit',()=>{
  const sourceRoot=tempRoot();
  write(path.join(sourceRoot,'game.js'),'const score = 1;\n');
  const candidate={replaceFiles:[{path:'game.js',content:'const score = 1; /* claimed build-up */\n'}]};
  assert.equal(evaluateCandidateSelfReview({candidate,sourceRoot,order:{target:'web'}}).pass,false);
  assert.equal(evaluateStudioQualityCandidateDelta({candidate,sourceRoot,contract:{phase:'BUILD_UP',requiredConnectedImprovements:{min:1}}}).pass,false);
});

test('repeated self-review failure changes strategy inside the existing retry budget',async()=>{
  const cwd=tempRoot(),root='web-games/demo',relative='index.html';
  const source='<script>\nconst score = 0;\n</script>\n';
  const workOrder=order({target:'web',root,responsibleFiles:[root+'/'+relative],taskId:'repeat-self-review'});
  const bad1=path.join(cwd,'bad-self-review-1.json');
  const bad2=path.join(cwd,'bad-self-review-2.json');
  const good3=path.join(cwd,'good-self-review-3.json');
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const bad={edits:[{path:relative,find:'const score = 0;',replace:'const score = 0;\n<!-- reviewed -->'}],newFiles:[],replaceFiles:[]};
  write(bad1,JSON.stringify(bad));
  write(bad2,JSON.stringify(bad));
  write(good3,JSON.stringify({replace:'const score = 1;'}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good3]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.repeatedFailureStrategyShifts,1);
  assert.deepEqual(result.generation.failureHistory,['SELF_REVIEW','SELF_REVIEW']);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.candidateSelfReview.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/const score = 1;/);
});

test('Roblox source worker inspects native responsibilities before generation',()=>{
  const inspection=buildRobloxNativeSourceInspection({
    order:{target:'roblox'},
    responsibleFiles:['server/Combat.server.luau','client/Input.client.luau'],
    context:{files:[
      {path:'server/Combat.server.luau',editable:true,content:'Remote.OnServerEvent:Connect(function(player, payload)\n local store = DataStoreService:GetDataStore("save")\nend)'},
      {path:'client/Input.client.luau',editable:true,content:'UserInputService.TouchStarted:Connect(function() Remote:FireServer({action="attack"}) end)'}
    ]}
  });
  assert.equal(inspection.required,true);
  assert.ok(inspection.systems.includes('REMOTE_EVENTS_AND_FUNCTIONS'));
  assert.ok(inspection.systems.includes('DATASTORE_SAVE_LOAD'));
  assert.ok(inspection.systems.includes('TOUCH_INPUT'));
  assert.ok(inspection.responsibilities.some(row=>row.role==='SERVER_AUTHORITY'));
  assert.ok(inspection.responsibilities.some(row=>row.role==='CLIENT_INPUT_OR_PRESENTATION'));
});

test('Roblox source inspection detects articulated rig and character motion ownership',()=>{
  const inspection=buildRobloxNativeSourceInspection({
    order:{target:'roblox'},
    responsibleFiles:['server/Npc.server.luau'],
    context:{files:[{
      path:'server/Npc.server.luau',editable:true,
      content:[
        'local npc = Instance.new("Model")',
        'local humanoid = Instance.new("Humanoid")',
        'local animator = Instance.new("Animator")',
        'animator.Parent = humanoid',
        'local torso = Instance.new("Part")',
        'local arm = Instance.new("Part")',
        'local shoulder = Instance.new("Motor6D")',
        'shoulder.Part0 = torso',
        'shoulder.Part1 = arm',
        'npc:PivotTo(CFrame.new(0,4,0))'
      ].join("\n")
    }]}
  });
  assert.ok(inspection.systems.includes('RIG_AND_ANIMATION'));
  assert.ok(inspection.systems.includes('CHARACTER_MOTION'));
  assert.equal(inspection.motionQuality.rigSignals,true);
  assert.equal(inspection.motionQuality.animatorSignals,true);
  assert.equal(inspection.motionQuality.rootTransformMotionSignals,true);
  assert.equal(inspection.motionQuality.libraryFirstRequired,true);
  assert.equal(inspection.motionQuality.hardFailure,'ROBLOX_CHARACTER_MOTION_MANNEQUIN');
  assert.ok(inspection.responsibilities[0].signals.includes('RIG_ANIMATION'));
  assert.ok(inspection.responsibilities[0].signals.includes('CHARACTER_MOTION'));
});

test('Roblox candidate quality reports welded root-only mannequin motion risks',()=>{
  const result=inspectRobloxNativeCandidateQuality({candidate:{edits:[{
    path:'server/Game.server.luau',
    replace:[
      'local function humanoidFigure()',
      ' local npc = Instance.new("Model")',
      ' local torso = Instance.new("Part")',
      ' torso.Name = "Torso"',
      ' local arm = Instance.new("Part")',
      ' arm.Name = "RightArm"',
      ' local leg = Instance.new("Part")',
      ' leg.Name = "RightLeg"',
      ' local weld = Instance.new("WeldConstraint")',
      ' weld.Part0 = torso',
      ' weld.Part1 = arm',
      ' npc:PivotTo(CFrame.new(0,4,0))',
      'end'
    ].join("\n")
  }]}});
  assert.ok(result.motionQualityFindings.some(row=>row.class==='ROOT_ONLY_ARTICULATED_MOTION_RISK'));
  assert.ok(result.motionQualityFindings.some(row=>row.class==='WELD_CONSTRAINT_ONLY_CHARACTER_RISK'));
  assert.equal(result.motionQualityHardFailure,'ROBLOX_CHARACTER_MOTION_MANNEQUIN');
  assert.equal(result.automaticGameWideBlock,false);
});

test('Roblox candidate quality reports unsafe native patterns without creating a game-wide blocker',()=>{
  const result=inspectRobloxNativeCandidateQuality({candidate:{edits:[
    {path:'client/Game.client.luau',replace:'local store = DataStoreService:GetDataStore("save")\ncoins.Value = 100'},
    {path:'server/Remote.server.luau',replace:'Remote.OnServerEvent:Connect(function(player, amount) reward(player, amount) end)'}
  ]}});
  assert.equal(result.automaticGameWideBlock,false);
  assert.ok(result.findings.some(row=>row.class==='CLIENT_DATASTORE_AUTHORITY'));
  assert.ok(result.findings.some(row=>row.class==='REMOTE_INPUT_VALIDATION_WEAK'));
  assert.ok(result.securityRelevantFindings.length>=2);
});

test('presentation candidate delta rejects marker-only edits and accepts actual visual source changes',()=>{
  const contract={required:true,pass:'ASSET_ADAPTATION'};
  const markerOnly=evaluatePresentationCandidateDelta({
    contract,
    candidate:{edits:[{path:'client/Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(20,20,20)\nlocal PRESENTATION_QUALITY_VERSION = 2'}]}
  });
  assert.equal(markerOnly.required,true);
  assert.equal(markerOnly.pass,false);
  assert.equal(markerOnly.reason,'NO_RELEVANT_PRESENTATION_DELTA_IN_PATCH');

  const visible=evaluatePresentationCandidateDelta({
    contract,
    candidate:{edits:[{path:'client/Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(70,95,130)'}]}
  });
  assert.equal(visible.pass,true);
  assert.equal(visible.presentationPass,'ASSET_ADAPTATION');
  assert.deepEqual(visible.files,['client/Game.client.luau']);
  assert.equal(visible.changedVisualUnits,1);
});


test('presentation delta failure is retryable source generation work',()=>{
  const error=new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION');
  assert.equal(generationFailureClass(error),'PRESENTATION_PATCH_DELTA');
  assert.equal(shouldRetryGenerationError(error),true);
});


test('Roblox full graphics first attempt uses the compact connected package prompt',()=>{
  const largeBody=Array.from({length:900},(_,i)=>`local visualLine${i} = Color3.fromRGB(20,30,40)`).join('\n');
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    largeBody
  ].join('\n');
  const initial=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['client/Game.client.luau'],
    attempt:1,
    robloxGraphicsInitial:true,
    robloxFullGraphicsPackageActive:true
  });
  assert.match(initial,/INITIAL ROBLOX FULL GRAPHICS PACKAGE/i);
  assert.match(initial,/ROBLOX FULL GRAPHICS RECOVERY PACKAGE/i);
  assert.match(initial,/connected edits\[\] package/i);
  assert.match(initial,/additional visual domains.*no upper limit/i);
  assert.match(initial,/game-relevant visual domain/i);
  assert.doesNotMatch(initial,/must cover every required core visual domain/i);
  assert.ok(Buffer.byteLength(initial,'utf8')<Buffer.byteLength(prompt,'utf8'));
  assert.doesNotMatch(initial,/exactly one edit/i);
});

test('Roblox full graphics first source-worker attempt completes as a full package without early-stop mode',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-initial-package'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const strong=path.join(cwd,'initial-package.json');
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('104,134,170')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[strong]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.recoveryUsed,false);
  assert.equal(result.generation.robloxFullGraphicsInitialPackage,true);
  assert.equal(result.generation.focusedFirstEditEarlyStop,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/EnemyBody/);
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/TerrainRockEnvironment/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/weapon\.Orientation\s*=/);
});

test('Roblox puzzle visuals accept a coherent environment and HUD motion without invented weapons',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/seed-puzzle-chromatic-cascade';
  const relative='client/Game.client.luau';
  const source='panel.BackgroundColor3 = Color3.fromRGB(18,28,48)\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-puzzle-visual-atomic-progress'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve puzzle board atmosphere and motion';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const response=path.join(cwd,'puzzle-visual.json');
  write(response,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:[
      'local RunService = game:GetService("RunService")',
      'local boardRock = Instance.new("Part")',
      'boardRock.Name = "PuzzleBoardRock"',
      'boardRock.Color = Color3.fromRGB(65,96,132)',
      'boardRock.Material = Enum.Material.Slate',
      'boardRock.Parent = workspace',
      'RunService.RenderStepped:Connect(function(dt) boardRock.CFrame = boardRock.CFrame * CFrame.Angles(0, dt * 0.12, 0) end)',
      'panel.BackgroundColor3 = Color3.fromRGB(32,51,76)'
    ].join('\n')
  }]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[response]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/PuzzleBoardRock/);
  assert.doesNotMatch(candidate,/SwordEquipment|EnemyBody/);
});

test('asset-development Roblox graphics starts with bounded focused local-model generation',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'asset-development-focused-graphics'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  const focused=path.join(cwd,'asset-focused.json');
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(focused,JSON.stringify({replace:robloxFullGraphicsMotionPatch('96,126,164')}));

  const previousLane=process.env.VIBE2_EXECUTION_LANE;
  process.env.VIBE2_EXECUTION_LANE='asset-development';
  try{
    const result=await runVibe2SourceWorker({cwd,responseFiles:[focused]});
    assert.equal(result.generation.attempts,1);
    assert.equal(result.generation.baseAttemptBudget,3);
    assert.equal(result.generation.effectiveAttemptBudget,3);
    assert.equal(result.generation.focusedReplaceOnly,true);
    assert.equal(result.generation.completionMode,'JSON_REPLACE_ONLY');
    assert.equal(result.generation.maxPredict,768);
    assert.equal(result.generation.timeoutMs,120000);
    assert.equal(result.generation.contextWindow,32768);
    assert.equal(result.presentationCandidateDelta.pass,true);
    const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
    assert.match(candidate,/EnemyBody/);
    assert.match(candidate,/SwordEquipment/);
    assert.match(candidate,/TerrainRockEnvironment/);
    assert.match(candidate,/RenderStepped/);
  }finally{
    if(previousLane===undefined)delete process.env.VIBE2_EXECUTION_LANE;
    else process.env.VIBE2_EXECUTION_LANE=previousLane;
  }
});

test('asset-development studio quality core survives initial focused and compact retry prompts',()=>{
  const relative='client/Game.client.luau';
  const workOrder=order({target:'roblox',root:'roblox-games/demo',responsibleFiles:['roblox-games/demo/'+relative],taskId:'asset-studio-core-prompt'});
  workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'roblox',assetProductionLane:true,evidence:['asset-production-parallel:v1']};
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  workOrder.assetProduction={
    kind:'vibe2-asset-production-plan',
    qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',
    qualityDNA:{contracts:[{type:'character',qualityDNA:{profile:'HERO_CHARACTER'}}]}
  };
  const source=[
    'local TweenService = game:GetService("TweenService")',
    'local panel = Instance.new("Frame")',
    'panel.Position = UDim2.fromScale(0.5,0.5)',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n');
  const prompt=buildPrompt(workOrder,{files:[{path:relative,editable:true,content:source}]},[relative]);
  assert.match(prompt,/\[STUDIO ASSET QUALITY CORE BEGIN\]/);
  assert.match(prompt,/at least THREE connected presentation axes/i);
  assert.match(prompt,/FORM_STRUCTURE, MATERIAL_STYLE, MOTION_CONTACT, WORLD_COMPOSITION, or PRESENTATION_FEEDBACK/);

  const focused=buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:[relative]});
  assert.ok(focused);
  assert.match(focused.prompt,/\[STUDIO ASSET QUALITY CORE BEGIN\]/);
  assert.match(focused.prompt,/Runtime capture and before\/after comparison remain required/i);

  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('STUDIO_QUALITY_DELTA_REQUIRED:ASSET_AXES:2/3'),
    responsibleFiles:[relative],
    attempt:2
  });
  assert.match(retry,/\[STUDIO ASSET QUALITY CORE BEGIN\]/);
  assert.match(retry,/at least THREE connected presentation axes/i);
});

test('asset-development Roblox candidate retries until three studio quality axes are connected',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local TweenService = game:GetService("TweenService")',
    'local panel = Instance.new("Frame")',
    'panel.Position = UDim2.fromScale(0.5,0.5)',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'asset-studio-three-axis'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve the existing visible asset presentation without changing gameplay';
  workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'roblox',assetProductionLane:true,evidence:['asset-production-parallel:v1']};
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  workOrder.assetProduction={kind:'vibe2-asset-production-plan',qualityProfile:'HIGH_END_COMMERCIAL_NATIVE_PRESENTATION',qualityDNA:{contracts:[]}};
  const weak=path.join(cwd,'asset-studio-weak.json');
  const strong=path.join(cwd,'asset-studio-strong.json');
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(weak,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:[
      'panel.BackgroundColor3 = Color3.fromRGB(72,92,124)',
      'TweenService:Create(panel, TweenInfo.new(0.2), {Position = UDim2.fromScale(0.5,0.48)}):Play()'
    ].join('\n')
  }]}));
  write(strong,JSON.stringify({replace:[
    'local impactVfx = Instance.new("ParticleEmitter")',
    'impactVfx.Name = "StudioImpactVfx"',
    'impactVfx.Parent = panel',
    'panel.BackgroundColor3 = Color3.fromRGB(72,92,124)',
    'TweenService:Create(panel, TweenInfo.new(0.2), {Position = UDim2.fromScale(0.5,0.48)}):Play()'
  ].join('\n')}));
  const previousLane=process.env.VIBE2_EXECUTION_LANE;
  process.env.VIBE2_EXECUTION_LANE='asset-development';
  try{
    const result=await runVibe2SourceWorker({cwd,responseFiles:[weak,strong]});
    assert.equal(result.generation.attempts,2);
    assert.equal(result.generation.recoveryUsed,true);
    assert.equal(result.generation.focusedReplaceOnly,true);
    assert.equal(result.studioAssetQualityAxes.MATERIAL_STYLE,true);
    assert.equal(result.studioAssetQualityAxes.MOTION_CONTACT,true);
    assert.equal(result.studioAssetQualityAxes.PRESENTATION_FEEDBACK,true);
    const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
    assert.match(candidate,/StudioImpactVfx/);
  }finally{
    if(previousLane===undefined)delete process.env.VIBE2_EXECUTION_LANE;
    else process.env.VIBE2_EXECUTION_LANE=previousLane;
  }
});

test('Roblox full graphics keeps package mode after repeated no-op failures',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-package-state'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const weak1=path.join(cwd,'noop-1.json');
  const weak2=path.join(cwd,'noop-2.json');
  const strong=path.join(cwd,'strong-package.json');
  const noOp={edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  }]};
  write(weak1,JSON.stringify(noOp));
  write(weak2,JSON.stringify(noOp));
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('112,142,178')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[weak1,weak2,strong]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  assert.equal(result.generation.robloxFullGraphicsInitialPackage,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/TerrainRockEnvironment/);
  assert.match(candidate,/RenderStepped/);
});

test('Roblox full graphics domain recovery keeps a connected multi-edit package instead of collapsing to one edit',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    'camera.FieldOfView = 70',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    'local accent = Color3.fromRGB(20,30,40)',
    'local material = Enum.Material.SmoothPlastic'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED:MISSING_WEAPON_EQUIPMENT,ENVIRONMENT_TERRAIN'),
    responsibleFiles:['client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:3
  });
  assert.match(retry,/ROBLOX FULL GRAPHICS RECOVERY PACKAGE/i);
  assert.match(retry,/connected edits\[\] package/i);
  assert.match(retry,/distinct exact anchors/i);
  assert.match(retry,/additional visual domains.*no upper limit/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
});

test('Roblox full graphics edit-match recovery keeps the connected package contract',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: client/Game.client.luau'),
    responsibleFiles:['client/Game.client.luau'],
    attempt:2
  });
  assert.match(retry,/ROBLOX FULL GRAPHICS RECOVERY PACKAGE/i);
  assert.match(retry,/connected edits\[\] package/i);
  assert.match(retry,/distinct exact anchors/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
});

test('Roblox full graphics domain recovery carries partial progress and prioritizes missing domains',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve full Roblox graphics and native motion without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local character = workspace:FindFirstChild("Character")',
    'local weapon = workspace:FindFirstChild("Sword")',
    'local terrainRock = workspace:FindFirstChild("TerrainRock")',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n');
  const previous=JSON.stringify({edits:[{
    path:'client/Game.client.luau',
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:'local enemyBody = Instance.new("MeshPart")\\nlocal terrainRock = Instance.new("MeshPart")\\npanel.BackgroundColor3 = Color3.fromRGB(70,95,130)\\nRunService.RenderStepped:Connect(function(dt) enemyBody.CFrame = enemyBody.CFrame * CFrame.Angles(0,dt,0) end)'
  }]});
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('ROBLOX_ASSET_ADAPTATION_DOMAINS_REQUIRED:MISSING_WEAPON_EQUIPMENT'),
    responsibleFiles:['client/Game.client.luau'],
    attempt:4,
    previousOutput:previous
  });
  assert.match(retry,/MISSING CORE VISUAL DOMAINS TO ADD FIRST: WEAPON_EQUIPMENT/i);
  assert.match(retry,/PREVIOUS VALID PARTIAL ROBLOX GRAPHICS CANDIDATE/i);
  assert.match(retry,/BEGIN_PREVIOUS_ROBLOX_GRAPHICS_CANDIDATE/i);
  assert.match(retry,/enemyBody = Instance\.new/i);
  assert.match(retry,/return a complete candidate against the ORIGINAL/i);
});

test('Roblox full graphics source worker switches to package recovery after a core-domain failure',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-package-recovery'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const weak=path.join(cwd,'weak-visible.json');
  const strong=path.join(cwd,'strong-package.json');
  write(weak,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:'panel.BackgroundColor3 = Color3.fromRGB(70,95,130)'
  }]}));
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('74,102,138')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[weak,strong]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/EnemyBody/);
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/TerrainRockEnvironment/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/enemyBody\.CFrame\s*=/);
});

test('Roblox full graphics source worker stays in package mode after edit-match failure',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-edit-match-package'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const bad=path.join(cwd,'bad-find.json');
  const strong=path.join(cwd,'strong-package.json');
  write(bad,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(1,2,3)',
    replace:'panel.BackgroundColor3 = Color3.fromRGB(70,95,130)'
  }]}));
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('96,126,162')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,strong]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/96,126,162/);
  assert.match(candidate,/SwordEquipment/);
  assert.match(candidate,/RenderStepped/);
});

test('Roblox full graphics recovery uses the configured fourth attempt after repeated visual-domain failures',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-full-graphics-fourth-attempt'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve full Roblox graphics and native motion without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const weakFiles=[1,2,3].map(n=>path.join(cwd,`weak-${n}.json`));
  for(const file of weakFiles){
    write(file,JSON.stringify({edits:[{
      path:relative,
      find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
      replace:'panel.BackgroundColor3 = Color3.fromRGB(70,95,130)'
    }]}));
  }
  const strong=path.join(cwd,'strong-fourth.json');
  write(strong,JSON.stringify({edits:[{
    path:relative,
    find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    replace:robloxFullGraphicsMotionPatch('88,118,154')
  }]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[...weakFiles,strong]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/88,118,154/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/weapon\.Orientation\s*=/);
});

test('Roblox presentation recovery reaches a real visual source delta on the package retry',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({
    target:'roblox',
    root,
    responsibleFiles:[`${root}/${relative}`],
    taskId:'roblox-presentation-delta-recovery'
  });
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const bad1=path.join(cwd,'presentation-bad-1.json');
  const good=path.join(cwd,'presentation-good-package.json');
  write(bad1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(good,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('70,95,130')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.presentationCandidateDelta.pass,true);
  assert.equal(result.presentationCandidateDelta.presentationPass,'ASSET_ADAPTATION');
  assert.deepEqual(result.changedFiles,[relative]);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/Color3\.fromRGB\(70,95,130\)/);
  assert.match(candidate,/RenderStepped/);
  assert.match(candidate,/enemyBody\.CFrame\s*=/);
  assert.match(candidate,/local score = 0/);
});

test('presentation delta uses the configured fourth recovery attempt instead of stopping after attempt three',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-presentation-fourth-retry'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const r1=path.join(cwd,'presentation-r1.json');
  const r2=path.join(cwd,'presentation-r2.json');
  const r3=path.join(cwd,'presentation-r3.json');
  const r4=path.join(cwd,'presentation-r4.json');
  write(r1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(r2,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 2'}]}));
  write(r3,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 3'}]}));
  write(r4,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('70,95,130')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[r1,r2,r3,r4]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.presentationCandidateDelta.pass,true);
  assert.deepEqual(result.changedFiles,[relative]);
});

test('repeated Roblox presentation delta stays in package mode instead of rotating to focused retry',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'camera.FieldOfView = 70',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-presentation-anchor-rotation'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const r1=path.join(cwd,'presentation-rotate-r1.json');
  const r2=path.join(cwd,'presentation-rotate-r2.json');
  const r3=path.join(cwd,'presentation-rotate-r3.json');
  write(r1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(r2,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local presentationMarker = 2'}]}));
  write(r3,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('70,95,130')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[r1,r2,r3]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.focusedReplaceAnchorRotations,0);
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/70,95,130/);
});

test('Roblox presentation package recovery keeps the fourth slot after malformed output',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n')+'\n';
  const workOrder=order({target:'roblox',root,responsibleFiles:[`${root}/${relative}`],taskId:'roblox-presentation-malformed-fourth-retry'});
  workOrder.goal='[PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation without changing gameplay';
  workOrder.presentationQuality={required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false};
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const r1=path.join(cwd,'presentation-malformed-r1.json');
  const r2=path.join(cwd,'presentation-malformed-r2.json');
  const r3=path.join(cwd,'presentation-malformed-r3.json');
  const r4=path.join(cwd,'presentation-malformed-r4.json');
  write(r1,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  write(r2,JSON.stringify({replace:'local score = 2'}));
  write(r3,'{"replace":');
  write(r4,JSON.stringify({edits:[{path:relative,find:'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',replace:robloxFullGraphicsMotionPatch('82,110,148')}]}));

  const result=await runVibe2SourceWorker({cwd,responseFiles:[r1,r2,r3,r4]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.presentationCandidateDelta.pass,true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/82,110,148/);
  assert.match(candidate,/weapon\.Orientation\s*=/);
});

test('presentation focused recovery prioritizes visual anchors and forbids marker-only repair',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve visible Roblox presentation',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local score = 0',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return score'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:2,responsibleFiles:['client/Game.client.luau']});
  assert.equal(anchors[0],'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION'),
    responsibleFiles:['client/Game.client.luau']
  });
  assert.ok(focused);
  assert.equal(focused.spec.find,'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)');
  assert.match(focused.prompt,/real visible render\/material\/color\/lighting\/motion\/camera\/VFX\/UI source behavior/i);
  assert.match(focused.prompt,/marker-only constants, comments, metadata, or gameplay-only changes are invalid/i);
});

test('Roblox presentation recovery prioritizes a client visual owner across multiple writable files',()=>{
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve visible Roblox presentation without gameplay changes',
    'Allowed edit paths: server/Game.server.luau, client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE server/Game.server.luau [EDITABLE] ===',
    'local reward = 30',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'camera.FieldOfView = 70',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    'local accent = Color3.fromRGB(20,30,40)'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION'),
    responsibleFiles:['server/Game.server.luau','client/Game.client.luau','shared/VisualStyle.luau']
  });
  assert.ok(focused);
  assert.equal(focused.spec.path,'client/Game.client.luau');
  assert.equal(focused.spec.find,'camera.FieldOfView = 70');
  assert.match(focused.prompt,/ROBLOX PRESENTATION DELTA RECOVERY/i);

  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('PRESENTATION_PATCH_DELTA_REQUIRED:ASSET_ADAPTATION'),
    responsibleFiles:['server/Game.server.luau','client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:2
  });
  assert.match(retry,/ROBLOX PRESENTATION PATCH DELTA RECOVERY/i);
  assert.match(retry,/client\/visual\/render\/UI\/camera\/VFX owner path/i);
  assert.match(retry,/observable native visual delta/i);
});

test('Roblox presentation recovery ranks a real visual anchor above a nonvisual primary target after timeout',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'roblox-games/demo');
  const relative='client/Game.client.luau';
  const source=[
    'local score = 0',
    'function updateScore() {',
    '  return score + 1',
    '}',
    'camera.FieldOfView = 70',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n')+'\n';
  write(path.join(sourceRoot,relative),source);
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve visible Roblox presentation without changing gameplay',
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    source.trimEnd()
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{
    max:3,sourceRoot,responsibleFiles:[relative],preferredTargets:['updateScore']
  });
  assert.ok(anchors.length>=2);
  assert.equal(anchors[0],'camera.FieldOfView = 70');
  assert.notEqual(anchors[0],'function updateScore() {');

  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:[relative],sourceRoot,preferredTargets:['updateScore']
  });
  assert.ok(focused);
  assert.equal(focused.spec.path,relative);
  assert.equal(focused.spec.find,'camera.FieldOfView = 70');
  assert.match(focused.prompt,/PRESENTATION TASK HARD RULE/i);
  assert.match(focused.prompt,/ROBLOX VISUAL ANCHOR RULE/i);
  assert.match(focused.prompt,/even when the previous failure was timeout/i);
});

test('studio build-up rejects micro patches and requires the configured connected source delta count',()=>{
  const contract={
    phase:'BUILD_UP',
    focusPillar:'STABILITY',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:3,max:6}
  };
  const micro=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[{path:'Game.client.luau',find:'local a=1',replace:'local a=2'}]}
  });
  assert.equal(micro.required,true);
  assert.equal(micro.pass,false);
  assert.equal(micro.sourceDeltaUnits,1);
  assert.equal(micro.requiredSourceDeltaUnits,3);
  assert.equal(micro.reason,'INSUFFICIENT_CONNECTED_SOURCE_DELTAS');

  const packageDelta=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[
      {path:'Game.client.luau',find:'local a=1',replace:'local a=2'},
      {path:'Game.client.luau',find:'local b=1',replace:'local b=2'},
      {path:'Game.server.luau',find:'local c=1',replace:'local c=2'}
    ]}
  });
  assert.equal(packageDelta.pass,true);
  assert.equal(packageDelta.sourceDeltaUnits,3);
  assert.deepEqual(packageDelta.files,['Game.client.luau','Game.server.luau']);
});

test('late verified BUILD_UP expectation enforces a higher connected source delta threshold without Studio runtime',()=>{
  const contract={
    phase:'BUILD_UP',
    focusPillar:'CORE_FUN',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:7,max:null},
    qualityExpectation:{studioRequired:false,internalAuditCanPassWithoutStudio:true,detailDepthLevel:9}
  };
  const six=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:Array.from({length:6},(_,index)=>({
      path:index<3?'Game.client.luau':'Game.server.luau',
      find:'local old'+index+'='+index,
      replace:'local next'+index+'='+(index+1)
    }))}
  });
  assert.equal(six.pass,false);
  assert.equal(six.requiredSourceDeltaUnits,7);
  assert.equal(six.sourceDeltaUnits,6);
  assert.equal(six.reason,'INSUFFICIENT_CONNECTED_SOURCE_DELTAS');

  const seven=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:Array.from({length:7},(_,index)=>({
      path:index<4?'Game.client.luau':'Game.server.luau',
      find:'local old'+index+'='+index,
      replace:'local next'+index+'='+(index+1)
    }))}
  });
  assert.equal(seven.pass,true);
  assert.equal(seven.requiredSourceDeltaUnits,7);
  assert.equal(seven.sourceDeltaUnits,7);
});

test('studio presentation build-up requires at least two real visual source deltas',()=>{
  const contract={
    phase:'BUILD_UP',
    focusPillar:'PRESENTATION',
    realSourceDeltaRequired:true,
    requiredConnectedImprovements:{min:3,max:6}
  };
  const weak=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[
      {path:'Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(70,95,130)'},
      {path:'Game.client.luau',find:'local a=1',replace:'local a=2'},
      {path:'Game.server.luau',find:'local b=1',replace:'local b=2'}
    ]}
  });
  assert.equal(weak.pass,false);
  assert.equal(weak.sourceDeltaUnits,3);
  assert.equal(weak.visualUnits,1);
  assert.equal(weak.requiredVisualUnits,2);
  assert.equal(weak.reason,'INSUFFICIENT_PRESENTATION_DELTAS');

  const strong=evaluateStudioQualityCandidateDelta({
    contract,
    candidate:{edits:[
      {path:'Game.client.luau',find:'part.Color = Color3.fromRGB(20,20,20)',replace:'part.Color = Color3.fromRGB(70,95,130)'},
      {path:'Game.client.luau',find:'camera.FieldOfView = 70',replace:'camera.FieldOfView = 76'},
      {path:'Game.server.luau',find:'local b=1',replace:'local b=2'}
    ]}
  });
  assert.equal(strong.pass,true);
  assert.equal(strong.visualUnits,2);
});

test('studio quality delta failure is retryable source generation work',()=>{
  const error=new Error('STUDIO_QUALITY_DELTA_REQUIRED:BUILD_UP:1/3:VISUAL:0/0:INSUFFICIENT_CONNECTED_SOURCE_DELTAS');
  assert.equal(generationFailureClass(error),'STUDIO_QUALITY_DELTA');
  assert.equal(shouldRetryGenerationError(error),true);
});

test('studio quality delta retry stays compact while requiring the full connected package breadth',()=>{
  const prompt=[
    '[STUDIO_QUALITY_EVOLUTION] cycle=1; phase=BUILD_UP; focus=PRESENTATION',
    'Engine: roblox',
    'Goal: improve the current presentation package without changing gameplay semantics',
    'Allowed edit paths: client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'local camera = workspace.CurrentCamera',
    'local impact = 1',
    'local motion = 1',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    'local palette = Color3.fromRGB(20,20,20)',
    'local outline = 1',
    'local lighting = 1',
    '=== FILE server/Unrelated.server.luau [READ-ONLY] ===',
    'UNRELATED_READ_ONLY_CONTEXT_SHOULD_BE_DROPPED'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('STUDIO_QUALITY_DELTA_REQUIRED:BUILD_UP:1/3:VISUAL:1/2:INSUFFICIENT_CONNECTED_SOURCE_DELTAS'),
    responsibleFiles:['client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:3
  });
  assert.match(retry,/STUDIO_QUALITY_EVOLUTION BUILD_UP: return 3-6 connected edits/i);
  assert.match(retry,/at least 3 actual source deltas/i);
  assert.match(retry,/at least 2 edits must change real visual/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
  assert.doesNotMatch(retry,/UNRELATED_READ_ONLY_CONTEXT_SHOULD_BE_DROPPED/);
});

test('studio build-up starts with the same compact package contract instead of a timeout-prone full prompt',()=>{
  const huge='x'.repeat(9000);
  const prompt=[
    '[STUDIO_QUALITY_EVOLUTION] cycle=1; phase=BUILD_UP; focus=PRESENTATION',
    'Engine: roblox',
    'Goal: improve presentation with connected real source changes',
    'Allowed edit paths: client/Game.client.luau, shared/VisualStyle.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    huge,
    'local camera = workspace.CurrentCamera',
    '=== FILE shared/VisualStyle.luau [EDITABLE] ===',
    huge,
    'local palette = Color3.fromRGB(20,20,20)',
    '=== FILE server/ReadOnly.server.luau [READ-ONLY] ===',
    'INITIAL_STUDIO_READ_ONLY_CONTEXT_MUST_DROP'
  ].join('\n');
  const initial=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['client/Game.client.luau','shared/VisualStyle.luau'],
    attempt:1,
    studioInitial:true
  });
  assert.match(initial,/STUDIO QUALITY BUILD-UP: generate the connected implementation package directly/i);
  assert.match(initial,/return 3-6 connected edits/i);
  assert.match(initial,/at least 3 actual source deltas/i);
  assert.match(initial,/at least 2 edits must change real visual/i);
  assert.doesNotMatch(initial,/previous 1-edit micro patch/i);
  assert.doesNotMatch(initial,/INITIAL_STUDIO_READ_ONLY_CONTEXT_MUST_DROP/);
  assert.ok(Buffer.byteLength(initial,'utf8')<Buffer.byteLength(prompt,'utf8'),'initial studio prompt must be compacted before first model call');
});


test('studio edit-match at the base budget gets one exact-anchor recovery attempt without widening scope',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local alpha = 1',
    'local beta = 1',
    'local gamma = 1',
    'return { alpha = alpha, beta = beta, gamma = gamma }'
  ].join('\n')+'\n';
  const workOrder=order({
    target:'roblox',
    root,
    responsibleFiles:[`${root}/${relative}`],
    taskId:'studio-edit-match-credit'
  });
  workOrder.selectedTask={
    id:workOrder.taskId,
    gameId:'demo',
    target:'roblox',
    evidence:['studio-quality-loop:v1'],
    studioQualityEvolution:{
      phase:'BUILD_UP',
      focusPillar:'STABILITY',
      realSourceDeltaRequired:true,
      requiredConnectedImprovements:{min:3,max:6}
    }
  };
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const responseFiles=[];
  for(let i=1;i<=3;i+=1){
    const file=path.join(cwd,`bad-studio-${i}.json`);
    write(file,JSON.stringify({edits:[
      {path:relative,find:'local alpha = 9',replace:'local alpha = 2'},
      {path:relative,find:'local beta = 9',replace:'local beta = 2'},
      {path:relative,find:'local gamma = 9',replace:'local gamma = 2'}
    ]}));
    responseFiles.push(file);
  }
  const good=path.join(cwd,'good-studio.json');
  write(good,JSON.stringify({edits:[
    {path:relative,find:'local alpha = 1',replace:'local alpha = 2'},
    {path:relative,find:'local beta = 1',replace:'local beta = 2'},
    {path:relative,find:'local gamma = 1',replace:'local gamma = 2'}
  ]}));
  responseFiles.push(good);

  const result=await runVibe2SourceWorker({cwd,responseFiles});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.baseAttemptBudget,3);
  assert.equal(result.generation.effectiveAttemptBudget,4);
  assert.deepEqual(result.changedFiles,[relative]);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/local alpha = 2/);
  assert.match(candidate,/local beta = 2/);
  assert.match(candidate,/local gamma = 2/);
});

test('studio holistic quality delta at the base budget gets one causal recovery attempt',async()=>{
  const cwd=tempRoot();
  const root='unity-games/demo';
  const relative='Assets/Scripts/GameCore.cs';
  const source=[
    'class GameCore {',
    '  int alpha = 1;',
    '  int beta = 1;',
    '  int gamma = 1;',
    '}'
  ].join('\n')+'\n';
  const workOrder=order({
    target:'unity',
    root,
    responsibleFiles:[`${root}/${relative}`],
    taskId:'studio-quality-delta-credit'
  });
  workOrder.selectedTask={
    id:workOrder.taskId,
    gameId:'demo',
    target:'unity',
    evidence:['studio-quality-loop:v1','existing-holistic-backfill:v1'],
    studioQualityEvolution:{
      phase:'BUILD_UP',
      focusPillar:'USABILITY',
      existingHolisticBackfillRequired:true,
      realSourceDeltaRequired:true,
      requiredConnectedImprovements:{min:3,max:6}
    }
  };
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));

  const responseFiles=[];
  for(let i=1;i<=3;i+=1){
    const file=path.join(cwd,`weak-studio-${i}.json`);
    write(file,JSON.stringify({edits:[
      {path:relative,find:'int alpha = 1;',replace:'int alpha = 2;'}
    ]}));
    responseFiles.push(file);
  }
  const good=path.join(cwd,'good-studio-connected.json');
  write(good,JSON.stringify({edits:[
    {path:relative,find:'int alpha = 1;',replace:'int alpha = 2;'},
    {path:relative,find:'int beta = 1;',replace:'int beta = 2;'},
    {path:relative,find:'int gamma = 1;',replace:'int gamma = 2;'}
  ]}));
  responseFiles.push(good);

  const result=await runVibe2SourceWorker({cwd,responseFiles});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.baseAttemptBudget,3);
  assert.equal(result.generation.effectiveAttemptBudget,4);
  assert.equal(result.generation.studioCausalRecoveryCreditUsed,true);
  assert.equal(result.codingMethod.semanticDiffEnforcement.studioQualityDelta.pass,true);
  assert.equal(result.codingMethod.semanticDiffEnforcement.studioQualityDelta.sourceDeltaUnits,3);
  assert.deepEqual(result.changedFiles,[relative]);
});

test('repeated identical failure signature escalates to root cause mode instead of counting unrelated failures',()=>{
  const result=classifyVibePatchSaturation({
    responsibleFiles:['web-games/demo/index.html'],
    threshold:3,
    attempts:[
      {status:'FAIL',failureSignature:'same-sync',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAIL',failureSignature:'other-ui',responsibleFiles:['web-games/demo/index.html']},
      {status:'REPAIR_REQUIRED',failureSignature:'same-sync',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAILED',failureSignature:'same-sync',responsibleFiles:['web-games/demo/index.html']}
    ]
  });
  assert.equal(result.saturated,true);
  assert.equal(result.mode,'ROOT_CAUSE_MODE');
  assert.equal(result.repeatedFailureSignature,'same-sync');
  assert.equal(result.repeatCount,3);
  assert.equal(result.sameApproachWithoutNewCausalEvidenceForbidden,true);
  assert.ok(result.actions.includes('COMPARE_LAST_KNOWN_GOOD_FIRST_BROKEN_CURRENT'));
});

test('different failure signatures do not falsely trigger root cause saturation',()=>{
  const result=classifyVibePatchSaturation({
    responsibleFiles:['web-games/demo/index.html'],
    threshold:3,
    attempts:[
      {status:'FAIL',failureSignature:'a',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAIL',failureSignature:'b',responsibleFiles:['web-games/demo/index.html']},
      {status:'FAIL',failureSignature:'c',responsibleFiles:['web-games/demo/index.html']}
    ]
  });
  assert.equal(result.saturated,false);
  assert.equal(result.mode,'FOCUSED_REPAIR');
  assert.equal(result.repeatCount,1);
});

test('JSON source generation uses bounded context and structured output mode',()=>{
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(source,/const MAX_CONTEXT_BYTES=96000;/);
  assert.match(source,/const JSON_CONTEXT_WINDOW=STANDARD_GAME_SOURCE_CONTEXT_WINDOW;/);
  assert.match(source,/const format=completionMode==='JSON_REPLACE_ONLY'[\s\S]*?\(\/\^JSON_\/\.test\(completionMode\)\?'json':null\)/);
  assert.match(source,/const FOCUSED_WEB_REPAIR_CONTEXT_BYTES=48000;/);
  assert.match(source,/const FULL_WEB_CONTEXT_WINDOW=32768;/);
});

test('deterministic diagnostic repair handles interval cleanup without model generation',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source=['<!doctype html><html><body><script>','const AUDIO={timer:null};',"function start(){ if(AUDIO.timer)return; AUDIO.timer=setInterval(()=>tick(),285); }",'function tick(){}','</script></body></html>'].join('\n');
  write(path.join(sourceRoot,'rpg.html'),source);
  const exploration={editContract:{causalReplay:{required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'INTERVAL_CLEANUP_RISK',diagnosticFile:'rpg.html',diagnosticLine:3,diagnosticNeedle:'setInterval(',diagnosticMicroTask:'clear interval lifecycle'}}};
  const candidate=deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles:['rpg.html']});
  assert.ok(candidate);
  assert.match(candidate.edits[0].replace,/pagehide/);
  assert.match(candidate.edits[0].replace,/clearInterval\(AUDIO\.timer\)/);
  assert.equal(evaluateDiagnosticPostcondition({candidate,exploration}).pass,true);
});

test('deterministic diagnostic repair makes DOM event binding null-safe',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const unsafe="document.getElementById('play').addEventListener('click',startGame);";
  write(path.join(sourceRoot,'index.html'),'<button id="play">Play</button><script>'+unsafe+'function startGame(){}</script>');
  const exploration={editContract:{causalReplay:{required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'DOM_NULL_EVENT_BIND',diagnosticFile:'index.html',diagnosticLine:1,diagnosticNeedle:unsafe}}};
  const candidate=deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(candidate);
  assert.match(candidate.edits[0].replace,/\?\.addEventListener/);
  assert.equal(evaluateDiagnosticPostcondition({candidate,exploration}).pass,true);
});

test('deterministic diagnostic repair adds touch-action to the actual interactive rule',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><html><head><style>.scope-action,button{min-height:54px;border:0}</style></head><body><button class="scope-action">Play</button></body></html>';
  write(path.join(sourceRoot,'index.html'),source);
  const exploration={editContract:{causalReplay:{required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'TOUCH_ACTION_UNSPECIFIED',diagnosticFile:'index.html',diagnosticLine:1,diagnosticNeedle:'touch-action'}}};
  const candidate=deterministicDiagnosticCandidate({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(candidate);
  assert.match(candidate.edits[0].replace,/touch-action:manipulation/);
  assert.equal(evaluateDiagnosticPostcondition({candidate,exploration}).pass,true);
});

test('source worker wires deterministic diagnostic before model recovery',()=>{
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const deterministicAt=source.indexOf('const deterministicDiagnostic=!allowFullRewrite&&verifiedExternalLearningContract.required!==true?deterministicDiagnosticCandidate');
  const modelAt=source.indexOf('generated=await generateCandidateWithRecovery({prompt',deterministicAt);
  assert.ok(deterministicAt>0&&modelAt>deterministicAt);
  assert.match(source,/verifiedExternalLearningContract\.required!==true\?deterministicDiagnosticCandidate/);
  assert.match(source,/VIBE2_DETERMINISTIC_DIAGNOSTIC_REPAIR=PASS/);
});
test('reproduced interval diagnostic is anchored before incremental QA',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source=['<!doctype html><html><body><script>','const AUDIO={timer:null};','function start(){ AUDIO.timer=setInterval(()=>tick(),285); }','function tick(){}','</script></body></html>'].join('\n');
  write(path.join(sourceRoot,'rpg.html'),source);
  const exploration={editContract:{causalReplay:{
    required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'INTERVAL_CLEANUP_RISK',diagnosticFile:'rpg.html',
    diagnosticLine:3,diagnosticNeedle:'setInterval(',diagnosticMicroTask:'반복 타이머의 실제 clearInterval 해제 경로를 추가한다.'
  }}};
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles:['rpg.html']});
  assert.ok(spec);
  assert.equal(spec.path,'rpg.html');
  assert.match(spec.find,/setInterval/);
  const focused=buildDiagnosticFocusedReplaceOnlyPrompt('Goal: [DIAGNOSTIC_BUNDLE] interval cleanup',{exploration,sourceRoot,responsibleFiles:['rpg.html']});
  assert.ok(focused);
  assert.match(focused.prompt,/clearInterval/);
  assert.doesNotMatch(focused.prompt,/COMPLETE_REPLACEMENT_SOURCE_SNIPPET/);
  assert.match(focused.prompt,/exactly one key named "replace"/);
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'rpg.html',find:spec.find,replace:'function start(){ AUDIO.timer=setInterval(()=>tick(),285); }'}]},exploration}).pass,false);
  const repaired='function stop(){ if(AUDIO.timer){ clearInterval(AUDIO.timer); AUDIO.timer=null; } }\nfunction start(){ stop(); AUDIO.timer=setInterval(()=>tick(),285); }';
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'rpg.html',find:spec.find,replace:repaired}]},exploration}).pass,true);
});

test('reproduced touch-action diagnostic is anchored to interactive CSS before incremental QA',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><html><head><style>.game{min-height:100vh}.scope-action,button{min-height:54px;border:0}</style></head><body><button class="scope-action">Play</button></body></html>';
  write(path.join(sourceRoot,'index.html'),source);
  const exploration={editContract:{causalReplay:{
    required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'TOUCH_ACTION_UNSPECIFIED',diagnosticFile:'index.html',
    diagnosticLine:1,diagnosticNeedle:'touch-action',diagnosticMicroTask:'실제 조작 영역에 모바일 스크롤 충돌을 막는 touch-action 정책을 추가한다.'
  }}};
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(spec);
  assert.equal(spec.path,'index.html');
  assert.match(spec.find,/scope-action|button/);
  const focused=buildDiagnosticFocusedReplaceOnlyPrompt('Goal: [WEB_REPAIR] mobile input',{exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.match(focused.prompt,/touch-action:/);
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'index.html',find:spec.find,replace:'.scope-action,button{min-height:54px;border:0}'}]},exploration}).pass,false);
  assert.equal(evaluateDiagnosticPostcondition({candidate:{edits:[{path:'index.html',find:spec.find,replace:'.scope-action,button{min-height:54px;border:0;touch-action:manipulation}'}]},exploration}).pass,true);
});

test('reproduced DOM null event bind must repair the exact unsafe chain before incremental QA',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const unsafe="document.getElementById('play').addEventListener('click',startGame);";
  write(path.join(sourceRoot,'index.html'),'<button id="play">Play</button><script>'+unsafe+'function startGame(){}</script>');
  const exploration={editContract:{causalReplay:{
    required:true,executable:true,mode:'DIAGNOSTIC_RESCAN',diagnosticType:'DOM_NULL_EVENT_BIND',diagnosticFile:'index.html',
    diagnosticLine:1,diagnosticNeedle:unsafe,diagnosticMicroTask:'DOM 이벤트 연결 1곳에 존재 확인을 추가한다.'
  }}};
  const spec=diagnosticFocusedReplaceOnlySpec({exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(spec);
  assert.match(spec.find,/getElementById/);
  const focused=buildDiagnosticFocusedReplaceOnlyPrompt('Goal: [WEB_REPAIR] repair event binding',{exploration,sourceRoot,responsibleFiles:['index.html']});
  assert.match(focused.prompt,/null-safe guard|optional chaining/);
  const unrelated={edits:[{path:'index.html',find:'<button id="play">Play</button>',replace:'<button id="play">Start</button>'}]};
  assert.equal(evaluateDiagnosticPostcondition({candidate:unrelated,exploration}).pass,false);
  const stillUnsafe={edits:[{path:'index.html',find:spec.find,replace:"document.getElementById('play').addEventListener('click',startGame);"}]};
  assert.equal(evaluateDiagnosticPostcondition({candidate:stillUnsafe,exploration}).pass,false);
  const repaired={edits:[{path:'index.html',find:spec.find,replace:"document.getElementById('play')?.addEventListener('click',startGame);"}]};
  const result=evaluateDiagnosticPostcondition({candidate:repaired,exploration});
  assert.equal(result.pass,true);
  assert.equal(result.reason,null);
});

test('missing diagnostic postcondition is a retryable generation failure',()=>{
  const error=new Error('DIAGNOSTIC_POSTCONDITION_MISSING:INTERVAL_CLEANUP_RISK:rpg.html:CLEAR_INTERVAL_LIFECYCLE_MISSING');
  assert.equal(generationFailureClass(error),'DIAGNOSTIC_POSTCONDITION');
  assert.equal(shouldRetryGenerationError(error),true);
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(source,/const diagnosticFocusedReplaceOnly=!allowFullRewrite/);
  assert.match(source,/diagnosticFocusedReplaceOnly\|\|\(focusedFinal/);
});

test('speculative interval diagnostic uses deterministic repair before model retry', async()=>{
  const cwd=tempRoot();
  const bad1=path.join(cwd,'diagnostic-bad-1.json');
  const bad2=path.join(cwd,'diagnostic-bad-2.json');
  const good=path.join(cwd,'diagnostic-good.json');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/rpg.html'],taskId:'diagnostic-credit'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] repair interval cleanup';
  workOrder.candidateStrategyRole={variant:'speculative-1',strategy:'DIAGNOSTIC_CAUSAL_REPAIR'};
  workOrder.selectedTask={
    id:'diagnostic-credit',gameId:'demo',target:'web',department:'development',type:'implementation',
    blocker:'runtime-failure',lastOutcome:'FAIL',
    evidence:['diagnostic:INTERVAL_CLEANUP_RISK','diagnostic-key:INTERVAL_CLEANUP_RISK:rpg.html']
  };
  write(path.join(cwd,'web-games/demo/rpg.html'),['<!doctype html><html><body><script>','const AUDIO={timer:null};','function start(){ AUDIO.timer=setInterval(()=>tick(),285); }','function tick(){}','</script></body></html>'].join('\\n'));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad1,JSON.stringify({replace:'function start(){ AUDIO.timer=setInterval(()=>tick(),300); }'}));
  write(bad2,JSON.stringify({replace:'function start(){ AUDIO.timer=setInterval(()=>tick(),320); }'}));
  write(good,JSON.stringify({replace:'function stop(){ if(AUDIO.timer){ clearInterval(AUDIO.timer); AUDIO.timer=null; } }\\nfunction start(){ stop(); AUDIO.timer=setInterval(()=>tick(),285); }'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.attemptBudget,2);
  assert.equal(result.generation.deterministicDiagnosticRepair,true);
  assert.equal(result.generation.deterministicDiagnosticType,'INTERVAL_CLEANUP_RISK');
  assert.equal(result.codingMethod.semanticDiffEnforcement.diagnosticPostcondition.pass,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/diagnostic-credit/files/rpg.html'),'utf8'),/clearInterval/);
});

test('speculative DOM null diagnostic uses deterministic repair before model retry', async()=>{
  const cwd=tempRoot();
  const bad1=path.join(cwd,'dom-null-bad-1.json');
  const bad2=path.join(cwd,'dom-null-bad-2.json');
  const good=path.join(cwd,'dom-null-good.json');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'dom-null-diagnostic-credit'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] repair DOM null event bind';
  workOrder.candidateStrategyRole={variant:'speculative-1',strategy:'DIAGNOSTIC_CAUSAL_REPAIR'};
  workOrder.selectedTask={
    id:'dom-null-diagnostic-credit',gameId:'demo',target:'web',department:'development',type:'implementation',
    blocker:'runtime-failure',lastOutcome:'FAIL',
    evidence:['diagnostic:DOM_NULL_EVENT_BIND','diagnostic-key:DOM_NULL_EVENT_BIND:index.html']
  };
  const unsafe="document.getElementById('play').addEventListener('click',startGame);";
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button><script>'+unsafe+'function startGame(){}</script>');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad1,JSON.stringify({replace:unsafe}));
  write(bad2,JSON.stringify({replace:"document.getElementById('play').addEventListener('click',()=>startGame());"}));
  write(good,JSON.stringify({replace:"document.getElementById('play')?.addEventListener('click',startGame);"}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.attemptBudget,2);
  assert.equal(result.generation.deterministicDiagnosticRepair,true);
  assert.equal(result.generation.deterministicDiagnosticType,'DOM_NULL_EVENT_BIND');
  assert.equal(result.codingMethod.semanticDiffEnforcement.diagnosticPostcondition.pass,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/dom-null-diagnostic-credit/files/index.html'),'utf8'),/\?\.addEventListener/);
});

test('speculative candidates use a shorter retry budget without lowering primary gates',()=>{
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'primary'}),4);
  assert.equal(generationAttemptBudget({allowFullRewrite:true,variant:'primary'}),4);
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'speculative-1'}),2);
  assert.equal(generationAttemptBudget({allowFullRewrite:true,variant:'speculative-1'}),3);
  assert.equal(generationAttemptBudget({allowFullRewrite:true,variant:'speculative-4'}),3);
});

test('studio quality retries keep package breadth instead of collapsing to one micro edit',()=>{
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Goal: [STUDIO_QUALITY_EVOLUTION] cycle=2; phase=BUILD_UP; focus=PRESENTATION',
    'Allowed edit paths: Game.cs, Visual.cs',
    '=== FILE Game.cs [EDITABLE] ===',
    'void Tick() {}',
    '=== FILE Visual.cs [EDITABLE] ===',
    'void Render() {}'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{error:new Error('malformed candidate'),responsibleFiles:['Game.cs','Visual.cs'],attempt:4});
  assert.doesNotMatch(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/exactly one edit/i);
});


test('Unity text source produces isolated candidate without touching source', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1 + 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1 + 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.mode, 'candidate-snapshot-only');
  assert.equal(result.candidateManifestPath, '.vibe2/candidates/task-1/manifest.json');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.equal(result.exploration.sourceWrite,false);
  assert.ok(result.exploration.reuseKey.length>=16);
  assert.equal(result.roleResults.exploration,'PASS');
  assert.equal(result.codingMethod.version,2);
  assert.equal(result.codingMethod.generationAttempts,1);
  assert.equal(result.codingMethod.generationAttemptBudget,4);
  assert.equal(result.codingMethod.speculativeAttemptBudgetApplied,false);
  assert.equal(result.codingMethod.candidateProducedFirstAttempt,true);
  assert.equal(result.codingMethod.writableScopeExpansionAllowed,false);
  assert.equal(result.codingMethod.learningAuthorityExpanded,false);
  assert.equal(result.developmentAuthority.owner,'VIBE2_VIBE3');
  assert.equal(result.developmentAuthority.provider,'LOCAL_OLLAMA');
  assert.equal(result.developmentAuthority.codexGameSourceWrite,'FORBIDDEN');
  assert.equal(result.developmentAuthority.paidOpenAiApiAllowed,false);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /1 \+ 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/task-1/files/Assets/Player.cs'), 'utf8'), /return 2/);
});


test('missing edit path is recovered from the unique responsible source match without another model call', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'missing-path.json');
  const root='roblox-games/demo';
  const client='client/Game.client.luau';
  const config='shared/GameConfig.luau';
  const workOrder=order({
    target:'roblox',
    root,
    responsibleFiles:[`${root}/${client}`,`${root}/${config}`],
    taskId:'missing-edit-path-recovery'
  });
  write(path.join(cwd,root,client),'local visualState = 1\nreturn visualState\n');
  write(path.join(cwd,root,config),'local configState = 1\nreturn configState\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    edits:[{path:'',find:'local visualState = 1',replace:'local visualState = 2'}],
    newFiles:[]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.missingPathRecoveries,1);
  assert.equal(result.codingMethod.missingPathRecoveries,1);
  assert.deepEqual(result.changedFiles,[client]);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',client),'utf8'),/visualState = 2/);
  assert.match(fs.readFileSync(path.join(cwd,root,client),'utf8'),/visualState = 1/);
});

test('system architecture worker filters control metadata from source context without widening writes', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const responsibleFile = 'tools/demo-system.mjs';
  const selectedTask = {
    id: 'SYS-ARCH-context-boundary-v1',
    gameId: '__vibe_system__',
    target: 'system',
    department: 'system-architecture',
    type: 'implementation',
    executionLane: 'RECOVERY_FAST',
    sourceRoot: '.',
    responsibleFiles: [responsibleFile],
    priority: 'high',
    releaseState: 'other',
    status: 'running',
    retryPolicy: 'UNLIMITED_CAUSAL_REPAIR',
    maxRetries: null,
    systemSteward: true,
    goal: 'repair repeated system work-order context path failure',
    evidence: [
      'vibe-self-architecture-evolution',
      'architecture-authority-expansion:NO',
      'architecture-gate-weakening:NO',
      'architecture-system-construction-allowed',
      'architecture-neural-expansion-phase:LAST_STAGE_ONLY',
      'architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION',
      'architecture-neural-expansion-readiness:PENDING',
      'architecture-neural-expansion-allowed:NO'
    ],
    completionCriteria: [
      'STRUCTURAL_CAUSE_VERIFIED',
      'RELATED_REGRESSION_PASS',
      'SECURITY_PASS',
      'BEFORE_AFTER_METRIC_IMPROVED',
      'AUTHORITY_UNCHANGED',
      'GATES_UNCHANGED',
      'NEURAL_EXECUTION_AUTHORITY_UNCHANGED'
    ]
  };
  const workOrder = {
    ...order({ target: 'system', root: '.', responsibleFiles: [responsibleFile], taskId: selectedTask.id }),
    gameId: '__vibe_system__',
    department: 'system-architecture',
    goal: '[VIBE_SELF_ARCHITECTURE_EVOLUTION] inspect work-order context and repair structural routing',
    selectedTask,
    workerPolicy: {
      directMainWrite: false,
      systemArchitectureEvolution: true,
      authorityExpansionAllowed: false,
      gateWeakeningAllowed: false,
      neuralExpansionPhase: 'LAST_STAGE_ONLY',
      neuralExpansionAllowed: false,
      neuralExecutionAuthorityExpansionAllowed: false
    }
  };
  write(path.join(cwd, responsibleFile), 'export const systemValue = 1;\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({
    edits: [{ path: responsibleFile, find: 'systemValue = 1', replace: 'systemValue = 2' }],
    newFiles: []
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.deepEqual(result.changedFiles, [responsibleFile]);
  assert.equal(result.developmentAuthority.authorityExpanded, false);
  assert.equal(result.developmentAuthority.gateWeakening, false);
  assert.equal(result.developmentAuthority.neuralExpansionAllowed, false);
  assert.match(fs.readFileSync(path.join(cwd, responsibleFile), 'utf8'), /systemValue = 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/SYS-ARCH-context-boundary-v1/files', responsibleFile), 'utf8'), /systemValue = 2/);
});

test('system architecture completes the missing causal test with pair-focused recovery', async () => {
  const cwd=tempRoot();
  const sourceOnly=path.join(cwd,'source-only.json');
  const testCompletion=path.join(cwd,'test-completion.json');
  const sourceFile='tools/demo-system.mjs';
  const testFile='qa/demo-system.test.mjs';
  const selectedTask={
    id:'SYS-ARCH-causal-pair-v1',gameId:'__vibe_system__',target:'system',department:'system-architecture',type:'implementation',
    executionLane:'RECOVERY_FAST',sourceRoot:'.',responsibleFiles:[sourceFile,testFile],priority:'high',releaseState:'other',status:'running',
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,systemSteward:true,goal:'repair structural bottleneck with direct causal proof',
    evidence:['vibe-self-architecture-evolution','architecture-authority-expansion:NO','architecture-gate-weakening:NO','architecture-system-construction-allowed','architecture-neural-expansion-phase:LAST_STAGE_ONLY','architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION','architecture-neural-expansion-readiness:PENDING','architecture-neural-expansion-allowed:NO'],
    completionCriteria:['STRUCTURAL_CAUSE_VERIFIED','RELATED_REGRESSION_PASS','SECURITY_PASS','BEFORE_AFTER_METRIC_IMPROVED','AUTHORITY_UNCHANGED','GATES_UNCHANGED','NEURAL_EXECUTION_AUTHORITY_UNCHANGED']
  };
  const workOrder={
    ...order({target:'system',root:'.',responsibleFiles:[sourceFile,testFile],taskId:selectedTask.id}),
    gameId:'__vibe_system__',department:'system-architecture',goal:'[VIBE_SELF_ARCHITECTURE_EVOLUTION] repair with same-failure regression proof',
    selectedTask,candidateStrategyRole:{variant:'speculative-1',strategy:'CAUSAL_PAIR_REPAIR'},
    workerPolicy:{directMainWrite:false,systemArchitectureEvolution:true,authorityExpansionAllowed:false,gateWeakeningAllowed:false,neuralExpansionPhase:'LAST_STAGE_ONLY',neuralExpansionAllowed:false,neuralExecutionAuthorityExpansionAllowed:false}
  };
  write(path.join(cwd,sourceFile),'export const systemValue = 1;\n');
  write(path.join(cwd,testFile),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {systemValue} from '../tools/demo-system.mjs';\ntest('system value',()=>assert.equal(systemValue,1));\n");
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(sourceOnly,JSON.stringify({edits:[{path:sourceFile,find:'systemValue = 1',replace:'systemValue = 2'}]}));
  write(testCompletion,JSON.stringify({replace:"test('system value',()=>assert.equal(systemValue,2));"}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[sourceOnly,testCompletion]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.baseAttemptBudget,2);
  assert.equal(result.generation.effectiveAttemptBudget,2);
  assert.equal(result.generation.systemAtomicPairCompletion,true);
  assert.deepEqual(result.changedFiles.sort(),[sourceFile,testFile].sort());
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',selectedTask.id,'files',sourceFile),'utf8'),/systemValue = 2/);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',selectedTask.id,'files',testFile),'utf8'),/systemValue,2/);
});

test('system architecture still gets one bounded retry when pair-focused completion is unavailable after edit mismatch', async () => {
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad1.json');
  const bad2=path.join(cwd,'bad2.json');
  const paired=path.join(cwd,'paired.json');
  const sourceFile='tools/demo-system.mjs';
  const testFile='qa/demo-system.test.mjs';
  const selectedTask={
    id:'SYS-ARCH-edit-match-credit-v1',gameId:'__vibe_system__',target:'system',department:'system-architecture',type:'implementation',
    executionLane:'RECOVERY_FAST',sourceRoot:'.',responsibleFiles:[sourceFile,testFile],priority:'high',releaseState:'other',status:'running',
    retryPolicy:'UNLIMITED_CAUSAL_REPAIR',maxRetries:null,systemSteward:true,goal:'repair structural bottleneck with direct causal proof',
    evidence:['vibe-self-architecture-evolution','architecture-authority-expansion:NO','architecture-gate-weakening:NO','architecture-system-construction-allowed','architecture-neural-expansion-phase:LAST_STAGE_ONLY','architecture-neural-expansion-mode:EVIDENCE_GATED_SELF_EXPANSION','architecture-neural-expansion-readiness:PENDING','architecture-neural-expansion-allowed:NO'],
    completionCriteria:['STRUCTURAL_CAUSE_VERIFIED','RELATED_REGRESSION_PASS','SECURITY_PASS','BEFORE_AFTER_METRIC_IMPROVED','AUTHORITY_UNCHANGED','GATES_UNCHANGED','NEURAL_EXECUTION_AUTHORITY_UNCHANGED']
  };
  const workOrder={
    ...order({target:'system',root:'.',responsibleFiles:[sourceFile,testFile],taskId:selectedTask.id}),
    gameId:'__vibe_system__',department:'system-architecture',goal:'[VIBE_SELF_ARCHITECTURE_EVOLUTION] repair edit-match failure with same-failure regression proof',
    selectedTask,candidateStrategyRole:{variant:'speculative-1',strategy:'CAUSAL_PAIR_REPAIR'},
    workerPolicy:{directMainWrite:false,systemArchitectureEvolution:true,authorityExpansionAllowed:false,gateWeakeningAllowed:false,neuralExpansionPhase:'LAST_STAGE_ONLY',neuralExpansionAllowed:false,neuralExecutionAuthorityExpansionAllowed:false}
  };
  write(path.join(cwd,sourceFile),'export const systemValue = 1;\n');
  write(path.join(cwd,testFile),"import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {systemValue} from '../tools/demo-system.mjs';\ntest('system value',()=>assert.equal(systemValue,1));\n");
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const badCandidate={edits:[{path:sourceFile,find:'systemValue = 9',replace:'systemValue = 2'},{path:testFile,find:'assert.equal(systemValue,9)',replace:'assert.equal(systemValue,2)'}]};
  write(bad1,JSON.stringify(badCandidate));
  write(bad2,JSON.stringify(badCandidate));
  write(paired,JSON.stringify({edits:[{path:sourceFile,find:'systemValue = 1',replace:'systemValue = 2'},{path:testFile,find:'assert.equal(systemValue,1)',replace:'assert.equal(systemValue,2)'}]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,paired]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.baseAttemptBudget,2);
  assert.equal(result.generation.effectiveAttemptBudget,3);
  assert.deepEqual(result.changedFiles.sort(),[sourceFile,testFile].sort());
});



test('Roblox internal asset handoff rejects config-only candidate without requiring a Studio backfill flag', async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'roblox-studio-config-only.json');
  const good=path.join(cwd,'roblox-studio-visual-owner.json');
  const workOrder=order({
    target:'roblox',
    root:'roblox-games/demo',
    responsibleFiles:['roblox-games/demo/shared/GameConfig.luau','roblox-games/demo/client/Game.client.luau'],
    taskId:'demo-roblox-studio-asset-backfill-v1'
  });
  workOrder.selectedTask={
    id:workOrder.taskId,
    gameId:'demo',
    target:'roblox',
    responsibleFiles:workOrder.source.responsibleFiles
  };
  workOrder.assetProduction={
    baseMaterialLoadout:{
      families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']},
      robloxSelectionHandoff:{
        handoffRequired:true,
        downstreamApplicationRequired:true,
        bindingVersion:2
      }
    }
  };
  workOrder.goal='일반 Roblox BUILD_UP 소스 코딩에서 선택된 내부 자산을 실제 시각 책임 소스에 적용';
  const configSource='return { GameId = "demo", StudioAssets = { Families = { UI = { "FRAME_PANEL", "BUTTON_PRIMARY", "BAR_HEALTH" } } } }';
  write(path.join(cwd,'roblox-games/demo/shared/GameConfig.luau'),configSource+'\n');
  const clientSource=[
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'root.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'root.Parent = gui'
  ].join('\n')+'\n';
  write(path.join(cwd,'roblox-games/demo/client/Game.client.luau'),clientSource);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad,JSON.stringify({
    edits:[{path:'shared/GameConfig.luau',find:configSource,replace:configSource.replace('GameId = "demo"','GameId = "demo", Marker = true')}]
  }));
  const bound=[
    'local STUDIO_ASSET_BINDING_VERSION = 2',
    'local studioAssetFamilies = { UI = {"FRAME_PANEL","BUTTON_PRIMARY","BAR_HEALTH"} }',
    'local function studioAssetFamily(family) return studioAssetFamilies[family] or {} end',
    'local STUDIO_ASSET_SELECTION = { UI = studioAssetFamily("UI") }',
    'local STUDIO_ASSET_FAMILY_STATUS = { CHARACTER = "NOT_APPLICABLE", CREATURE = "NOT_APPLICABLE", BUILDING = "NOT_APPLICABLE", ENVIRONMENT = "NOT_APPLICABLE", WEAPON = "NOT_APPLICABLE", SKILL = "NOT_APPLICABLE", MATERIAL = "NOT_APPLICABLE", AUDIO = "NOT_APPLICABLE", VFX = "NOT_APPLICABLE", UI = "APPLIED", MOTION = "NOT_APPLICABLE", PROP = "NOT_APPLICABLE" }',
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'local stroke = Instance.new("UIStroke")',
    'root.BackgroundColor3 = Color3.fromRGB(22,34,58)',
    'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
    'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION.UI, ","))',
    'if #studioAssetFamily("UI") > 0 then stroke.Thickness = 2 end',
    'root.Parent = gui'
  ].join('\n');
  write(good,JSON.stringify({
    edits:[{path:'client/Game.client.luau',find:clientSource.trimEnd(),replace:bound}]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.deepEqual(result.changedFiles,['client/Game.client.luau']);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files/client/Game.client.luau'),'utf8');
  assert.match(candidate,/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/);
  assert.match(candidate,/STUDIO_ASSET_SELECTION\s*=\s*\{/);
  assert.match(candidate,/STUDIO_ASSET_FAMILY_STATUS\s*=\s*\{/);
  assert.match(candidate,/studioAssetFamily\("UI"\)/);
  assert.match(candidate,/StudioAssetAtoms/);
});

test('Roblox internal asset handoff automatically expands general BUILD_UP responsibility to an existing visual owner',()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  write(path.join(cwd,root,'server/Game.server.luau'),'return true\n');
  write(path.join(cwd,root,'client/Game.client.luau'),'local gui = Instance.new("ScreenGui")\n');
  const files=expandPresentationResponsibleFiles({
    task:{sourceRoot:root,responsibleFiles:[root+'/server/Game.server.luau']},
    target:'roblox',
    repoRoot:cwd,
    fallbackRoot:root,
    assetProduction:{
      baseMaterialLoadout:{
        robloxSelectionHandoff:{
          handoffRequired:true,
          downstreamApplicationRequired:true
        }
      }
    }
  });
  assert.ok(files.includes(root+'/client/Game.client.luau'));
  assert.ok(files.includes(root+'/server/Game.server.luau'));
});

test('unappliable edit is retried inside generation before candidate write', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad-edit.json');
  const good = path.join(cwd, 'good-edit.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'edit-preflight-retry' }), null, 2));
  write(bad, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 9;', replace: 'return 2;' }], newFiles: [] }));
  write(good, JSON.stringify({ replace: 'class Player { int Speed() { return 2; } }' }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
  assert.match(fs.readFileSync(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'utf8'), /return 1/);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/edit-preflight-retry/files/Assets/Player.cs'), 'utf8'), /return 2/);
});

test('speculative focused repair gets one bounded retry after focused no-op at the base budget edge', async () => {
  const cwd=tempRoot();
  const badEdit=path.join(cwd,'spec-bad-edit.json');
  const focusedNoOp=path.join(cwd,'spec-focused-noop.json');
  const focused=path.join(cwd,'spec-focused.json');
  const workOrder=order({responsibleFiles:['unity-games/demo/Assets/Player.cs'],taskId:'spec-focused-credit'});
  workOrder.candidateStrategyRole={variant:'speculative-1',strategy:'BOUNDED_REPAIR'};
  write(path.join(cwd,'unity-games/demo/Assets/Player.cs'),'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(badEdit,JSON.stringify({edits:[{path:'Assets/Player.cs',find:'return 9;',replace:'return 2;'}],newFiles:[]}));
  write(focusedNoOp,JSON.stringify({replace:'class Player { int Speed() { return 1; } }'}));
  write(focused,JSON.stringify({replace:'class Player { int Speed() { return 2; } }'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[badEdit,focusedNoOp,focused]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.baseAttemptBudget,2);
  assert.equal(result.generation.effectiveAttemptBudget,3);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.deepEqual(result.changedFiles,['Assets/Player.cs']);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/spec-focused-credit/files/Assets/Player.cs'),'utf8'),/return 2/);
});

test('primary focused Roblox repair uses the existing fourth attempt after repeated no-op replacements', async () => {
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const badEdit=path.join(cwd,'primary-bad-edit.json');
  const noOp2=path.join(cwd,'primary-noop-2.json');
  const noOp3=path.join(cwd,'primary-noop-3.json');
  const good4=path.join(cwd,'primary-good-4.json');
  const workOrder=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'primary-focused-fourth-attempt'});
  workOrder.goal='[POST_RELEASE_FOCUSED_DEVELOPMENT] improve the existing Roblox source without changing authority';
  write(path.join(cwd,root,relative),'local score = 0\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(badEdit,JSON.stringify({edits:[{path:relative,find:'local score = 9',replace:'local score = 1'}]}));
  write(noOp2,JSON.stringify({replace:'local score = 0'}));
  write(noOp3,JSON.stringify({replace:'local score = 0'}));
  write(good4,JSON.stringify({replace:'local score = 1'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[badEdit,noOp2,noOp3,good4]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.baseAttemptBudget,4);
  assert.equal(result.generation.effectiveAttemptBudget,4);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.deepEqual(result.changedFiles,[relative]);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/primary-focused-fourth-attempt/files',relative),'utf8'),/local score = 1/);
});

test('focused replace recovery budget matches the raised shared source contract',()=>{
  const source=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  const focusedPredict=Number(source.match(/const JSON_FOCUSED_REPLACE_MAX_PREDICT=(\d+);/)?.[1]||0);
  assert.equal(focusedPredict,384);
  assert.match(source,/const STANDARD_GAME_SOURCE_CONTEXT_WINDOW=32768;/);
  assert.match(source,/const JSON_FOCUSED_REPLACE_TIMEOUT_MS=DEFAULT_TIMEOUT_MS;/);
  assert.match(source,/const JSON_FOCUSED_REPLACE_CONTEXT_WINDOW=STANDARD_GAME_SOURCE_CONTEXT_WINDOW;/);
});

test('focused Web repair malformed output fast-escalates to focused replace on the next attempt', async () => {
  const cwd = tempRoot();
  const malformed = path.join(cwd, 'malformed.txt');
  const focused = path.join(cwd, 'focused.json');
  const workOrder = order({
    target: 'web',
    root: 'web-games/demo',
    responsibleFiles: ['web-games/demo/index.html'],
    taskId: 'malformed-fast-escalation'
  });
  workOrder.goal = '[WEB_REPAIR] 기존 플레이 버튼 동작을 직접 보강';
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>\n<button id="play">Play</button>\n<script>let started=false;</script>\n</body></html>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(malformed, 'not-json');
  write(focused, JSON.stringify({ replace: '<button id="play">Continue</button>' }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [malformed, focused] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.focusedWebRepair, true);
  assert.equal(result.generation.focusedReplaceOnly, true);
  assert.equal(result.generation.malformedFastEscalation, true);
  assert.equal(result.codingMethod.malformedFastEscalation, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.match(fs.readFileSync(path.join(cwd, '.vibe2/candidates/malformed-fast-escalation/files/index.html'), 'utf8'), /Continue/);
});

test('exact edit dry run validates sequential applicability without mutating source', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\n  int Speed() {\n    return 1;\n  }\n}\n');
  const changed = applyExactEdits(cwd, [
    { path: 'Player.cs', find: 'int Speed() {\n  return 1;\n}', replace: 'int Speed() {\n    return 2;\n}' },
    { path: 'Player.cs', find: 'return 2;', replace: 'return 3;' }
  ], { dryRun: true });
  assert.deepEqual(changed, ['Player.cs']);
  assert.match(fs.readFileSync(source, 'utf8'), /return 1;/);
  assert.doesNotMatch(fs.readFileSync(source, 'utf8'), /return 3;/);
});

test('exact edit preserves the original EOF shape instead of introducing a git diff blank-line failure',()=>{
  const cwd=tempRoot();
  const withEol=path.join(cwd,'GameConfig.luau');
  write(withEol,'return {\n  Value = 1\n}\n');
  applyExactEdits(cwd,[{
    path:'GameConfig.luau',
    find:'return {\n  Value = 1\n}\n',
    replace:'return {\n  Value = 2\n}\n\n'
  }]);
  assert.equal(fs.readFileSync(withEol,'utf8'),'return {\n  Value = 2\n}\n');

  const withoutEol=path.join(cwd,'NoEol.luau');
  write(withoutEol,'return { Value = 1 }');
  applyExactEdits(cwd,[{
    path:'NoEol.luau',
    find:'return { Value = 1 }',
    replace:'return { Value = 2 }\n'
  }]);
  assert.equal(fs.readFileSync(withoutEol,'utf8'),'return { Value = 2 }');
});

test('candidate manifest persists design intelligence requirements and starts evidence unverified', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'design-contract' });
  workOrder.unifiedLearning = {
    failureFingerprint:'unity|EDIT_MATCH|DEBUGGING',
    failureLocalMemory:[{id:'verified-edit-match',verified:true,reusable:true,failureCause:'edit match not found',reusablePatterns:['trace exact responsible symbol before edit'],avoidPatterns:['do not widen writable scope']}]
  };
  workOrder.designIntelligence = {
    version: 1,
    required: true,
    pipeline: ['DESIGNER', 'CONSTRAINT_ENGINE', 'IMPLEMENTATION', 'AUTO_PLAYER', 'TELEMETRY', 'DESIGN_REVIEW', 'EXPERIENCE_MEMORY'],
    implementationGate: { allowed: true, blockers: [] },
    authorityExpanded: false
  };
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  const persisted = JSON.parse(fs.readFileSync(path.join(cwd, '.vibe2/candidates/design-contract/manifest.json'), 'utf8'));
  assert.equal(result.version, 7);
  assert.equal(result.designIntelligence.required, true);
  assert.equal(result.designIntelligence.implementationGate.allowed, true);
  assert.equal(result.designIntelligence.authorityExpanded, false);
  assert.equal(result.designIntelligence.evidenceRequirements.autoPlayer, 'verified-runtime-play-evidence-required');
  assert.deepEqual(result.designIntelligence.pipeline, workOrder.designIntelligence.pipeline);
  assert.equal(persisted.exploration.sourceWrite,false);
  assert.equal(persisted.codingMethod.version,2);
  assert.equal(persisted.codingMethod.strategy,result.exploration.editContract.strategyHint);
  assert.equal(persisted.codingMethod.semanticDiffBudget.unrelatedSystemMutationForbidden,true);
  assert.equal(persisted.codingMethod.failureFingerprint,'unity|EDIT_MATCH|DEBUGGING');
  assert.equal(persisted.codingMethod.patchRecipeMode,'VERIFIED_FAILURE_LOCAL_RECIPE');
  assert.equal(persisted.codingMethod.verifiedFailureLocalMemoryCount,1);
  assert.deepEqual(persisted.codingMethod.verifiedFailureLocalMemoryIds,['verified-edit-match']);
  assert.equal(persisted.roleResults.implementation,'PASS');
  for (const key of ['autoPlayer', 'telemetry', 'designReview', 'qa']) {
    assert.equal(result.designEvidence[key].verified, false);
    assert.equal(result.designEvidence[key].status, 'WAITING_EVIDENCE');
    assert.equal(persisted.designEvidence[key].verified, false);
  }
});

test('Unity candidate manifest distinguishes WebGL and native execution surfaces', async () => {
  for (const [firstStageUnityWeb, expected] of [[true, 'UNITY_WEB'], [false, 'UNITY_NATIVE']]) {
    const cwd=tempRoot();
    const relative='Assets/Player.cs';
    const responseFile=path.join(cwd, firstStageUnityWeb?'unity-web.json':'unity-native.json');
    const workOrder=order({
      target:'unity',
      root:'unity-games/demo',
      responsibleFiles:[`unity-games/demo/${relative}`],
      taskId:firstStageUnityWeb?'unity-web-surface':'unity-native-surface'
    });
    workOrder.selectedTask={id:workOrder.taskId,gameId:'demo',target:'unity',firstStageUnityWeb};
    write(path.join(cwd,'unity-games/demo',relative),'class Player { int Speed() { return 1; } }\n');
    write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
    write(responseFile,JSON.stringify({edits:[{path:relative,find:'return 1;',replace:'return 2;'}],newFiles:[]}));
    const result=await runVibe2SourceWorker({cwd,responseFile});
    assert.equal(result.executionSurface,expected);
    const persisted=JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'manifest.json'),'utf8'));
    assert.equal(persisted.executionSurface,expected);
  }
});

test('Codex game source write override is rejected before generation', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const previous = process.env.VIBE2_CODEX_GAME_SOURCE_WRITE;
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'codex-authority-reject' }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  process.env.VIBE2_CODEX_GAME_SOURCE_WRITE = 'ALLOWED';
  try {
    await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /CODEX_GAME_SOURCE_WRITE_FORBIDDEN/);
  } finally {
    if (previous === undefined) delete process.env.VIBE2_CODEX_GAME_SOURCE_WRITE;
    else process.env.VIBE2_CODEX_GAME_SOURCE_WRITE = previous;
  }
});

test('single responsible file safely remaps model placeholder path', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'relative/to/source/root', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
});

test('responsible file boundary rejects unrelated model path', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player {}\n');
  write(path.join(cwd, 'unity-games/demo/Assets/Enemy.cs'), 'class Enemy {}\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Enemy.cs', find: 'class Enemy {}', replace: 'class Enemy { int x; }' }], newFiles: [] }));
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /책임 파일 범위 밖 수정 금지/);
});

test('Unity bootstrap validates against canonical scaffold when the project root exists but responsible files do not', async()=>{
  const cwd=tempRoot();
  const root='unity-games/partial-unity';
  const core='Assets/Scripts/GameCore.cs';
  const runtime='Assets/Scripts/RuntimeBootstrap.cs';
  write(path.join(cwd,root,'Packages/manifest.json'),'{"dependencies":{}}\n');
  const workOrder=order({
    target:'unity',
    root,
    responsibleFiles:[root+'/'+core,root+'/'+runtime],
    taskId:'unity-partial-root-bootstrap'
  });
  workOrder.gameId='partial-unity';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','unity-web-source-root-bootstrap-required']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const responseFile=path.join(cwd,'pair.json');
  write(responseFile,JSON.stringify({edits:[
    {path:core,find:'// Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.',replace:'        public int RuntimeState = 1;'},
    {path:runtime,find:'            var go = new GameObject("RuntimeBootstrap");',replace:'            var go = new GameObject("RuntimeBootstrap");\n            go.AddComponent<GameCore>();'}
  ],newFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.sourceRootBootstrap,true);
  assert.equal(result.generation.attempts,1);
  assert.equal(fs.existsSync(path.join(cwd,root,core)),false);
  assert.equal(fs.existsSync(path.join(cwd,root,runtime)),false);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',core),'utf8'),/RuntimeState = 1/);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',runtime),'utf8'),/AddComponent<GameCore>/);
});

test('Unity bootstrap pair recovery preserves the exact counterpart and completes the missing file atomically', async()=>{
  const cwd=tempRoot();
  const root='unity-games/missing-unity';
  const gameCore='Assets/Scripts/GameCore.cs';
  const runtimeBootstrap='Assets/Scripts/RuntimeBootstrap.cs';
  const bad=path.join(cwd,'unity-bootstrap-one-file.json');
  const good=path.join(cwd,'unity-bootstrap-pair.json');
  const workOrder=order({
    target:'unity',
    root,
    responsibleFiles:[`${root}/${gameCore}`,`${root}/${runtimeBootstrap}`],
    taskId:'unity-bootstrap-pair-retry'
  });
  workOrder.gameId='missing-unity';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','unity-web-source-root-bootstrap-required']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const gameFind='// Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.';
  write(bad,JSON.stringify({edits:[{path:gameCore,find:gameFind,replace:'public int RuntimeState = 1;'}],newFiles:[]}));
  write(good,JSON.stringify({replace:'            var go = new GameObject("RuntimeBootstrap");\n            go.AddComponent<GameCore>();'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(generationFailureClass(new Error('UNITY_WEB_BOOTSTRAP_GAME_SOURCE_PAIR_REQUIRED:Assets/Scripts/RuntimeBootstrap.cs')),'UNITY_BOOTSTRAP_PAIR');
  assert.equal(result.sourceRootBootstrap,true);
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.systemAtomicPairCompletion,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',gameCore),'utf8'),/RuntimeState = 1/);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',runtimeBootstrap),'utf8'),/go\.AddComponent<GameCore>\(\)/);
});

test('Unity bootstrap pair contract keeps timeout recovery multi-file',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/const zeroOutputTimeoutRecovery=!allowFullRewrite\n\s+&&!multiFilePairRequired/);
  assert.match(source,/focusedFinal=!allowFullRewrite&&!multiFilePairRequired/);
  assert.match(source,/multiFilePairRequired:bootstrap&&target==='unity'/);
  assert.match(source,/VIBE2_UNITY_BOOTSTRAP_PAIR_RECOVERY_RETRY/);
  const retry=buildGenerationRetryPrompt([
    'Engine: unity',
    'Goal: bootstrap real Unity Web gameplay',
    'Allowed edit paths: Assets/Scripts/GameCore.cs, Assets/Scripts/RuntimeBootstrap.cs',
    'UNITY WEB BOOTSTRAP: You MUST edit BOTH Assets/Scripts/GameCore.cs and Assets/Scripts/RuntimeBootstrap.cs.',
    '=== FILE Assets/Scripts/GameCore.cs [EDITABLE] ===',
    'class GameCore {}',
    '=== FILE Assets/Scripts/RuntimeBootstrap.cs [EDITABLE] ===',
    'class RuntimeBootstrap {}'
  ].join('\n'),{
    error:new Error('UNITY_WEB_BOOTSTRAP_GAME_SOURCE_PAIR_REQUIRED:Assets/Scripts/RuntimeBootstrap.cs'),
    responsibleFiles:['Assets/Scripts/GameCore.cs','Assets/Scripts/RuntimeBootstrap.cs'],
    attempt:2,
    multiFilePairRequired:true
  });
  assert.match(retry,/at least one (?:exact|real source-changing) edit for EACH Allowed edit path/i);
  assert.match(retry,/one for Assets\/Scripts\/GameCore\.cs and one for Assets\/Scripts\/RuntimeBootstrap\.cs in the same candidate/i);
  assert.doesNotMatch(retry,/exactly one edit/i);
});

test('approved missing Web root produces isolated index.html bootstrap candidate without touching source', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'bootstrap.html');
  const workOrder=order({target:'web',root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],taskId:'missing-web-bootstrap'});
  workOrder.gameId='missing-web';
  workOrder.goal='FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','existing-web-source:MISSING']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true,fullFileRewriteAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const body='let frame=0;'+ 'frame+=1;'.repeat(1500);
  const replacement=`<!doctype html><html><body><canvas id="game"></canvas><script>${body}</script></body></html>`;
  write(responseFile,replacement);
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.sourceRootBootstrap,true);
  assert.equal(result.fullFileRewriteAllowed,true);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.equal(fs.existsSync(path.join(cwd,'web-games/missing-web')),false);
  assert.equal(fs.readFileSync(path.join(cwd,'.vibe2/candidates/missing-web-bootstrap/files/index.html'),'utf8').trim(),replacement);
});

test('missing Web root without bootstrap authority remains rejected', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'unused.html');
  const workOrder=order({target:'web',root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],taskId:'missing-web-denied'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'<!doctype html><html><body>unused</body></html>');
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile}),/source root 없음/);
});

test('existing web game text maintenance is allowed', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'web-games/demo/index.html'), '<button>old</button>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-maintenance'
  }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'index.html', find: '>old<', replace: '>new<' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.target, 'web');
  assert.deepEqual(result.changedFiles, ['index.html']);
});

test('existing Web assessment overrides stale full-rebuild flags when KEEP_AND_CONTINUE is selected', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-keep-existing' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  workOrder.evidence = ['web-strict-score:84'];
  const source = `<!doctype html><html><body><button id="play">Play</button><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, JSON.stringify({edits:[{path:'index.html',find:'<button id="play">Play</button>',replace:'<button id="play">Continue</button>'}],newFiles:[],replaceFiles:[]}));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.notEqual(result.exploration.existingWebAssessment.strategy,'FULL_REBUILD');
  assert.equal(result.fullFileRewriteAllowed,false);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('exploration FULL_REBUILD strategy can authorize full web rewrite without planner pre-deciding rebuild', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-assessed-rebuild' });
  workOrder.goal = 'EXISTING_WEB_ASSESS_AND_IMPLEMENT';
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body><h1>검증 패널</h1><button data-session-stage="1">다음</button></body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, ['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:assessment rebuild','EXPECTED_EFFECT:playable game','TEST:gameplay','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.equal(result.exploration.existingWebAssessment.strategy,'FULL_REBUILD');
});

test('full web rebuild recovers complete direct HTML when the model omits the envelope', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.html');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-direct-html-recovery' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, replacement);
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/web-direct-html-recovery/files/index.html'), 'utf8').trim(), replacement);
});

test('full web rebuild accepts fenced complete HTML but rejects prose or truncation', async () => {
  const cwd = tempRoot();
  const good = path.join(cwd, 'good.html');
  const bad = path.join(cwd, 'bad.html');
  const truncated = path.join(cwd, 'truncated.html');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-fenced-html-recovery' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(good, `\`\`\`html\n${replacement}\n\`\`\``);
  const result = await runVibe2SourceWorker({ cwd, responseFile: good });
  assert.deepEqual(result.changedFiles, ['index.html']);
  workOrder.taskId = 'web-direct-html-prose-reject';
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(bad, `Here is the game:\n${replacement}`);
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile: bad }), /JSON 시작을 찾지 못함/);
  workOrder.taskId = 'web-direct-html-truncated-reject';
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(truncated, '<!doctype html><html><body><canvas id="game"></canvas>');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile: truncated }), /JSON 시작을 찾지 못함/);
});

test('full web rebuild accepts raw full-file envelope without JSON escaping', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const source = '<!doctype html><html><body>old prototype</body></html>\n';
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-rebuild' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), source);
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, [
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    'SUMMARY:실제 플레이 가능한 웹게임 전체 교체',
    'EXPECTED_EFFECT:직접 입력과 런타임 게임 루프 제공',
    'TEST:mobile gameplay',
    'TEST:restart',
    '---VIBE2_FILE_CONTENT---',
    replacement,
    '---VIBE2_FILE_END---'
  ].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.fullFileRewriteAllowed, true);
  assert.deepEqual(result.changedFiles, ['index.html']);
  assert.equal(fs.readFileSync(path.join(cwd, '.vibe2/candidates/web-full-rebuild/files/index.html'), 'utf8').trim(), replacement);
});

test('full web rebuild rejects truncated raw full-file envelope', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.txt');
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'web-full-truncated' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(responseFile, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>잘린 출력');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /잘렸거나 종료 마커가 없음/);
});

test('malformed JSON candidate gets one bounded strict-JSON recovery retry', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad.json');
  const good = path.join(cwd, 'good.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'], taskId: 'json-retry' }), null, 2));
  write(bad, "{edits:[{path:'Assets/Player.cs'}]}");
  write(good, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.mode, 'JSON_EDIT');
  assert.deepEqual(result.changedFiles, ['Assets/Player.cs']);
});

test('single-file Web diagnostic uses the same compact generation profile', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'diagnostic.json');
  const source=['<!doctype html><html><body>','<button id="play">Play</button>','<script>let timer=setInterval(()=>{},1000);</script>','</body></html>'].join('\n');
  write(path.join(cwd,'web-games/demo/rpg.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/rpg.html'],taskId:'web-diagnostic-compact'});
  workOrder.goal='[DIAGNOSTIC_BUNDLE] rpg.html 반복 타이머 생명주기와 중복 실행을 점검하고 필요한 해제 경로를 추가한다.';
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'cleanup interval lifecycle',
    expectedEffect:'no duplicate timer',
    edits:[{path:'rpg.html',find:'<script>let timer=setInterval(()=>{},1000);</script>',replace:'<script>let timer=setInterval(()=>{},1000);addEventListener("pagehide",()=>clearInterval(timer),{once:true});</script>'}],
    newFiles:[],replaceFiles:[],tests:['interval cleanup']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,32768);
  assert.ok(result.generation.contextFiles<=2);
  assert.ok(result.generation.contextBytes<=48000);
  assert.deepEqual(result.changedFiles,['rpg.html']);
});

test('exact Web repair uses compact generation budget without weakening edit boundaries', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-focused-repair.json');
  const index=['<!doctype html><html><body>','<button id="play">Play</button>',`<script>${'const tick=1;'.repeat(1800)}</script>`,'</body></html>'].join('\n');
  write(path.join(cwd,'web-games/demo/index.html'),index);
  write(path.join(cwd,'web-games/demo/runtime-helper.js'),'export const runtimeHint=true;\n'+('const helper=1;\n'.repeat(700)));
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-web-repair'});
  workOrder.goal='[WEB_REPAIR] company-runtime failure evidence requires one exact index.html repair';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','company-runtime-state:WEB_VIBE_REPAIR_REQUIRED']};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'repair existing mobile action',
    expectedEffect:'visible implementation change',
    edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],
    newFiles:[],replaceFiles:[],tests:['button label']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,32768);
  assert.ok(result.generation.contextFiles<=2);
  assert.ok(result.generation.contextBytes<=48000);
  assert.deepEqual(result.changedFiles,['index.html']);
});
test('focused Web repair composes exact primary-symbol windows instead of broad file excerpts',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-symbol.json');
  const filler='const backgroundDecoration=1;\n'.repeat(3500);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function placeTower(slot){placedEntities.push(slot);return true;}\n'+
    'function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}\n'+
    'addEventListener("pointerdown",handlePointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-symbol-context'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'focused-symbol-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return placeTower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(result.generation.exactSourceWindows,true);
  assert.equal(result.generation.fullFileContextFallback,false);
  assert.ok(result.generation.focusedSymbolCount>=1);
  assert.ok(result.generation.contextBytes<=48000);
  assert.equal(result.codingMethod.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('verified context preference can choose bounded Web repair context without changing write scope',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'preferred-bounded-context.json');
  const filler='const backgroundDecoration=1;\n'.repeat(3500);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function placeTower(slot){placedEntities.push(slot);return true;}\n'+
    'function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}\n'+
    'addEventListener("pointerdown",handlePointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'preferred-bounded-context'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'preferred-bounded-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  workOrder.codingStrategyPreference={strategy:'RESPONSIBILITY_FIRST',preferredContextMode:'BOUNDED_FILE_EXCERPT_FALLBACK',preferredContextModeSamples:3};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){pointerState={x:event.clientX,y:event.clientY};return placeTower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return placeTower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'BOUNDED_FILE_EXCERPT_FALLBACK');
  assert.equal(result.generation.contextPreferenceRequested,'BOUNDED_FILE_EXCERPT_FALLBACK');
  assert.equal(result.generation.contextPreferenceApplied,true);
  assert.equal(result.generation.exactSourceWindows,false);
  assert.equal(result.generation.fullFileContextFallback,true);
  assert.equal(result.codingMethod.contextPreferenceApplied,true);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('focused symbol context matches JavaScript identifiers containing regex metacharacters',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-dollar-symbol.json');
  const filler='const decoration=1;\n'.repeat(2800);
  const source='<!doctype html><html><body><script>\n'+filler+
    'let pointerState=null,placedEntities=[];\n'+
    'function place$Tower(slot){placedEntities.push(slot);return true;}\n'+
    'function handle$Pointer(event){pointerState={x:event.clientX,y:event.clientY};return place$Tower(pointerState);}\n'+
    'addEventListener("pointerdown",handle$Pointer);\n'+filler+'</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-dollar-symbol'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='[WEB_REPAIR] runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['web-stage:WEB_REPAIR','runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'focused-dollar-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handle$Pointer(event){pointerState={x:event.clientX,y:event.clientY};return place$Tower(pointerState);}';
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find,replace:'function handle$Pointer(event){pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)};return place$Tower(pointerState);}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.contextMode,'PRIMARY_SYMBOL_WINDOWS');
  assert.equal(result.generation.exactSourceWindows,true);
  assert.ok(result.generation.focusedSymbolCount>=1);
  assert.ok(result.generation.contextBytes<=48000);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('zero-change candidate gets one bounded recovery retry that produces a real responsible-file edit', async () => {
  const cwd = tempRoot();
  const empty = path.join(cwd, 'empty.json');
  const good = path.join(cwd, 'good.json');
  write(path.join(cwd, 'web-games/demo/index.html'), '<button id="play">Play</button>\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({
    target: 'web',
    root: 'web-games/demo',
    responsibleFiles: ['web-games/demo/index.html'],
    taskId: 'zero-change-retry'
  }), null, 2));
  write(empty, JSON.stringify({ summary:'looked okay', expectedEffect:'none', edits:[], newFiles:[], replaceFiles:[], tests:[] }));
  write(good, JSON.stringify({
    summary:'make the existing control actionable',
    expectedEffect:'visible implementation progress',
    edits:[{ path:'index.html', find:'>Play<', replace:'>Continue<' }],
    newFiles:[],
    replaceFiles:[],
    tests:['button label']
  }));
  const result = await runVibe2SourceWorker({ cwd, responseFiles:[empty,good] });
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.mode,'JSON_EDIT');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('zero-change recovery prompt requires a concrete bounded edit', () => {
  const prompt = buildGenerationRetryPrompt('Allowed edit paths: index.html\n=== FILE index.html ===\n<button>Play</button>', {
    allowFullRewrite:false,
    error:new Error('후보가 실제 source 변경을 생성하지 않음')
  });
  assert.match(prompt,/zero actual source changes/);
  assert.match(prompt,/MUST produce at least one edits\[\] entry/);
  assert.match(prompt,/ONLY writable path is "index\.html"/);
  assert.match(prompt,/EXACT FIND ANCHOR OPTION/);
  assert.match(prompt,/do not bypass responsible-file boundaries/);
  assert.equal(shouldRetryGenerationError(new Error('후보가 실제 source 변경을 생성하지 않음')),true);
});

test('second no-op receives one short focused third retry', async () => {
  const cwd=tempRoot();
  const noop1=path.join(cwd,'noop1.json');
  const noop2=path.join(cwd,'noop2.json');
  const good=path.join(cwd,'good3.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'focused-third-retry'}),null,2));
  const noop=JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Play<'}],newFiles:[],replaceFiles:[]});
  write(noop1,noop);
  write(noop2,noop);
  write(good,JSON.stringify({replace:'<button id="play">Continue</button>'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[noop1,noop2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.timeoutMs,240000);
  assert.equal(result.generation.maxPredict,384);
  assert.equal(result.generation.temperature,0.08);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('semantic diff violation retries inside the same worker and succeeds with a narrowed responsible patch',async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'semantic-bad.json');
  const good=path.join(cwd,'semantic-good.json');
  const source='<!doctype html><html><body><script>\n'+
    'let pointerState=null, placedEntities=[], gold=100;\n'+
    'function placeTower(slot){ placedEntities.push(slot); return true; }\n'+
    'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }\n'+
    'addEventListener("pointerdown",handlePointer);\n'+
    '</script></body></html>\n';
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'semantic-retry'});
  workOrder.originalGoal='모바일 pointer 입력을 placement state에 연결한다';
  workOrder.goal='runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정';
  workOrder.selectedTask={evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'};
  workOrder.workPackage={id:'semantic-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING']}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }';
  write(bad,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; gold+=999; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]}));
  write(good,JSON.stringify({edits:[{path:'index.html',find,replace:'function handlePointer(event){ pointerState={x:Math.round(event.clientX),y:Math.round(event.clientY)}; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.codingMethod.semanticDiffEnforcement.mode,'HARD_ENFORCE');
  assert.equal(result.codingMethod.semanticDiffEnforcement.pass,true);
  assert.equal(result.codingMethod.candidateProducedFirstAttempt,false);
  assert.deepEqual(result.changedFiles,['index.html']);
});
test('Web source worker retries when a function declaration is removed while local calls remain',async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'structural-bad.json');
  const good=path.join(cwd,'structural-good.json');
  const source=[
    '<!doctype html><html><body><canvas id="game"></canvas><script>',
    'const state={camera:{x:0,y:0}};',
    'function worldToScreen(x,y){return{x:x-state.camera.x,y:y-state.camera.y}}',
    'function drawQueen(q){const s=worldToScreen(q.x,q.y);return s}',
    'function drawBug(b){const s=worldToScreen(b.x,b.y);return s}',
    '</script></body></html>'
  ].join('\n');
  write(path.join(cwd,'web-games/demo/index.html'),source);
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'web-structural-continuity'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const find='function worldToScreen(x,y){return{x:x-state.camera.x,y:y-state.camera.y}}';
  write(bad,JSON.stringify({edits:[{path:'index.html',find,replace:"ctx.fillStyle=c.dark;ctx.restore()"}],newFiles:[],replaceFiles:[]}));
  write(good,JSON.stringify({edits:[{path:'index.html',find,replace:'function worldToScreen(x,y){return{x:Math.round(x-state.camera.x),y:Math.round(y-state.camera.y)}}'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/web-structural-continuity/files/index.html'),'utf8'),/function worldToScreen/);
  const error=new Error('WEB_SOURCE_STRUCTURAL_CONTINUITY:REMOVED_FUNCTION_STILL_REFERENCED:index.html:worldToScreen');
  assert.equal(generationFailureClass(error),'WEB_STRUCTURAL_CONTINUITY');
  assert.equal(shouldRetryGenerationError(error),true);
});

test('Roblox source worker retries when a function-header anchor prematurely closes the existing function',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source=[
    'local status = Instance.new("TextLabel")',
    'local function render()',
    '  status.Text = "ok"',
    'end',
    'render()'
  ].join('\n');
  write(path.join(cwd,root,relative),source);
  const workOrder=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'roblox-structural-premature-end'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const bad=path.join(cwd,'roblox-structural-bad.json');
  const good=path.join(cwd,'roblox-structural-good.json');
  write(bad,JSON.stringify({edits:[{
    path:relative,
    find:'local function render()',
    replace:['local function render()','  status.TextWrapped = true','end'].join('\n')
  }]}));
  write(good,JSON.stringify({edits:[{
    path:relative,
    find:'local function render()',
    replace:['local function render()','  status.TextWrapped = true'].join('\n')
  }]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(generationFailureClass(new Error('ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:FUNCTION_HEADER_PREMATURE_END:client/Game.client.luau')),'ROBLOX_STRUCTURAL_CONTINUITY');
  assert.equal(shouldRetryGenerationError(new Error('ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:FUNCTION_HEADER_PREMATURE_END:client/Game.client.luau')),true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/status\.TextWrapped = true/);
  assert.doesNotMatch(candidate,/status\.TextWrapped = true\s*\nend\s*\n\s*status\.Text = "ok"/);
});

test('Roblox source worker retries when model control tokens leak into Luau source',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const relative='client/Game.client.luau';
  const source='local activity = "idle"\n';
  write(path.join(cwd,root,relative),source);
  const workOrder=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'roblox-structural-model-token'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const bad=path.join(cwd,'roblox-token-bad.json');
  const good=path.join(cwd,'roblox-token-good.json');
  write(bad,JSON.stringify({edits:[{path:relative,find:'local activity = "idle"',replace:'local activity = /no_think'}]}));
  write(good,JSON.stringify({edits:[{path:relative,find:'local activity = "idle"',replace:'local activity = "ready"'}]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(generationFailureClass(new Error('ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:MODEL_CONTROL_TOKEN:client/Game.client.luau')),'ROBLOX_STRUCTURAL_CONTINUITY');
  assert.equal(shouldRetryGenerationError(new Error('ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:MODEL_CONTROL_TOKEN:client/Game.client.luau')),true);
  const candidate=fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'files',relative),'utf8');
  assert.match(candidate,/local activity = "ready"/);
  assert.doesNotMatch(candidate,/no_think/);
});

test('semantic diff hard gate allows primary responsibility edits inside the compiled system budget',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function handlePointer(e){ pointerState=e; return placeTower(pointerState); }',replace:'function handlePointer(e){ pointerState=normalizePointer(e); return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['handlePointer'],allowedDependentSymbolsOrSystems:['placeTower'],ownedState:['pointerState'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    }
  });
  assert.equal(result.mode,'HARD_ENFORCE');
  assert.equal(result.pass,true);
  assert.ok(result.touchedSystems.includes('INPUT'));
});

test('semantic diff hard gate rejects explicit unrelated system mutation even when edit touches the primary symbol',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function handlePointer(e){ pointerState=e; return placeTower(pointerState); }',replace:'function handlePointer(e){ pointerState=e; gold+=999; return placeTower(pointerState); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['handlePointer'],allowedDependentSymbolsOrSystems:['placeTower'],ownedState:['pointerState'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    }
  });
  assert.equal(result.pass,false);
  assert.ok(result.unexpectedSystems.includes('ECONOMY'));
  assert.match(result.violations.join('|'),/UNRELATED_SYSTEM:ECONOMY/);
});

test('semantic diff hard gate protects existing save keys from silent removal',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function saveGame(){ localStorage.setItem("demo-save", JSON.stringify(state)); }',replace:'function saveGame(){ localStorage.setItem("new-save", JSON.stringify(state)); }'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'HIGH',primaryTargets:['saveGame'],allowedDependentSymbolsOrSystems:[],ownedState:['serializedProgress'],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['SAVE'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:['demo-save']}
    }
  });
  assert.equal(result.pass,false);
  assert.match(result.violations.join('|'),/SAVE_KEY_COMPATIBILITY/);
});

test('semantic diff invariant blocks variable-backed save key mutation outside explicit migration',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  write(path.join(sourceRoot,'index.html'),"const C={id:'demo'}; const key='jg-final:'+C.id; const load=()=>localStorage.getItem(key); const save=()=>localStorage.setItem(key,'{}'); function actDefense(){return 1;}\n");
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:"const key='jg-final:'+C.id;",replace:"const key='jg-final:'+C.id+1;"}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'LOW',primaryTargets:['actDefense'],allowedDependentSymbolsOrSystems:[],ownedState:[],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['INPUT','PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    },
    sourceRoot
  });
  assert.equal(result.mode,'INVARIANT_ENFORCE');
  assert.equal(result.pass,false);
  assert.equal(result.saveContractInvariantEnforced,true);
  assert.match(result.violations.join('|'),/SAVE_CONTRACT_MUTATION:index\.html:binding:key/);
});

test('semantic diff invariant allows unrelated source repair when save binding is unchanged',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  write(path.join(sourceRoot,'index.html'),"const C={id:'demo'}; const key='jg-final:'+C.id; const load=()=>localStorage.getItem(key); const save=()=>localStorage.setItem(key,'{}'); function actDefense(){return 1;}\n");
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'function actDefense(){return 1;}',replace:'function actDefense(){return 2;}'}],newFiles:[],replaceFiles:[]},
    editContract:{
      responsibilityConfidence:'LOW',primaryTargets:['actDefense'],allowedDependentSymbolsOrSystems:[],ownedState:[],
      codingArchitecture:{developmentMode:'PRESERVE_PATCH'},
      semanticDiffBudget:{allowedSystems:['PLACEMENT'],unrelatedSystemMutationForbidden:true,saveKeysMustRemainCompatible:[]}
    },
    sourceRoot
  });
  assert.equal(result.mode,'OBSERVE_ONLY');
  assert.equal(result.pass,true);
  assert.deepEqual(result.saveContractMutations,[]);
});

test('candidate release gate mirrors variable-backed save contract invariant',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-candidate-release.yml','utf8');
  assert.match(workflow,/const storageContract=raw=>/);
  assert.match(workflow,/beforeStorage\.variableBindings/);
  assert.match(workflow,/VIBE2_WEB_SAVE_CONTRACT_MUTATION/);
  assert.doesNotMatch(workflow,/const historicalSaveKey=/);
});

test('ambiguous or low confidence semantic classification is observe-only instead of false rejecting',()=>{
  const result=evaluateSemanticDiffBudget({
    candidate:{edits:[{path:'index.html',find:'const value=1;',replace:'const value=2; gold+=1;'}],newFiles:[],replaceFiles:[]},
    editContract:{responsibilityConfidence:'LOW',primaryTargets:[],codingArchitecture:{developmentMode:'PRESERVE_PATCH'},semanticDiffBudget:{allowedSystems:['INPUT'],unrelatedSystemMutationForbidden:true}}
  });
  assert.equal(result.mode,'OBSERVE_ONLY');
  assert.equal(result.pass,true);
  assert.equal(result.ambiguousClassificationObserved,true);
});
test('generation failure classification keeps causal retry reasons distinct',()=>{
  assert.equal(generationFailureClass(new Error('변경 없는 edit: index.html')),'NO_OP');
  assert.equal(generationFailureClass(new Error('Ollama 응답 시간 초과: 240000ms')),'TIMEOUT');
  assert.equal(generationFailureClass(new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:UNRELATED_SYSTEM:ECONOMY')),'SEMANTIC_DIFF_BUDGET');
  const dynamicAssetBindingError=new Error('ALL_GAME_DYNAMIC_ASSET_BINDING_REQUIRED:ALL_GAME_APPLICABLE_ASSET_FAMILY_NOT_BOUND:UI');
  assert.equal(generationFailureClass(dynamicAssetBindingError),'GENERATED_ASSET_BINDING');
  assert.equal(shouldRetryGenerationError(dynamicAssetBindingError),true);
  assert.equal(shouldRetryGenerationError(new Error('SEMANTIC_DIFF_BUDGET_VIOLATION:UNRELATED_SYSTEM:ECONOMY')),true);
  assert.equal(generationFailureClass(new Error('책임 파일 범위 밖 수정 금지: config.js')),'INVALID_PATH');
  assert.equal(generationFailureClass(new Error('잘못된 상대 경로:')),'INVALID_PATH');
  assert.equal(shouldRetryGenerationError(new Error('잘못된 상대 경로:')),true);
  assert.equal(generationFailureClass(new Error('전체 교체 파일 크기 오류: index.html')),'FULL_REWRITE_SIZE');
  assert.equal(generationFailureClass(new Error('모델 JSON 파싱 실패')),'MALFORMED_OUTPUT');
  assert.equal(generationFailureClass(new Error('같은 파일에 edit/new/replace 중복 작업 금지')),'MALFORMED_OUTPUT');
  assert.equal(shouldRetryGenerationError(new Error('같은 파일에 edit/new/replace 중복 작업 금지')),true);
  assert.equal(generationFailureClass(new Error('focused replace placeholder 금지: index.html')),'MALFORMED_OUTPUT');
  assert.equal(shouldRetryGenerationError(new Error('focused replace placeholder 금지: index.html')),true);
  assert.equal(generationFailureClass(new Error('focused replace 비어 있음')),'MALFORMED_OUTPUT');
});
test('truncated FULL_REBUILD gets one compact raw-envelope recovery retry', async () => {
  const cwd = tempRoot();
  const bad = path.join(cwd, 'bad.txt');
  const good = path.join(cwd, 'good.txt');
  const replacement = `<!doctype html><html><body><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder = order({ target: 'web', root: 'web-games/demo', responsibleFiles: ['web-games/demo/index.html'], taskId: 'full-retry' });
  workOrder.goal = 'FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed = true;
  write(path.join(cwd, 'web-games/demo/index.html'), '<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd, 'design/demo/2026-09-18/design-revised.json'), JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd, 'design/demo/2026-09-18/cycle-status.json'), JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(workOrder, null, 2));
  write(bad, 'VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>truncated');
  write(good, ['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:compact retry','EXPECTED_EFFECT:playable','TEST:runtime','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result = await runVibe2SourceWorker({ cwd, responseFiles: [bad, good] });
  assert.equal(result.generation.attempts, 2);
  assert.equal(result.generation.recoveryUsed, true);
  assert.equal(result.generation.mode, 'FULL_WEB');
  assert.deepEqual(result.changedFiles, ['index.html']);
});

test('undersized full web error reports validator-scale generation minimum without lowering parser safety gate', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'undersized-single.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-size-telemetry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'VIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:small\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>tiny</body></html>\n---VIBE2_FILE_END---');
  await assert.rejects(
    runVibe2SourceWorker({cwd,responseFile}),
    /전체 교체 파일 크기 오류: index\.html:bytes=\d+:min=12000:max=260000/
  );
});

test('full web without a recovered seed gets one bounded retry after repeated malformed output', async()=>{
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad-full-1.txt');
  const bad2=path.join(cwd,'bad-full-2.txt');
  const good=path.join(cwd,'good-full-3.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-malformed-third-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(bad1,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---','<!doctype html><html><body><script>'+ 'let a=1;'.repeat(900)].join('\n'));
  write(bad2,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---','<!doctype html><html><body><script>'+ 'let b=2;'.repeat(120)].join('\n'));
  const finalBody=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><canvas id="game"></canvas><script>let state={score:0,hp:100,result:"playing"};${'function step(){state.score+=1;if(state.score>400)state.result="win";if(state.hp<=0)state.result="loss";}'.repeat(220)}addEventListener("pointerdown",step);localStorage.setItem("vibe2-bounded-fallback",JSON.stringify(state));</script></body></html>`;
  write(good,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:recovered','---VIBE2_FILE_CONTENT---',finalBody,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,3);
  assert.ok(result.codingMethod.fullWebFallbackBestPartialBytes>Buffer.byteLength(fs.readFileSync(bad2,'utf8'),'utf8')/2);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('undersized full web output keeps a bounded full-file fallback while expansion mode is active', async () => {
  const cwd=tempRoot();
  const small1=path.join(cwd,'small1.txt');
  const small2=path.join(cwd,'small2.txt');
  const good=path.join(cwd,'good3.txt');
  const replacement=`<!doctype html><html><body><button id="start">Start</button><canvas id="game"></canvas><script>${'let frame=0;frame+=1;'.repeat(650)}</script></body></html>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-size-third-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const small='VIBE2_FULL_FILE\nPATH:index.html\nSUMMARY:small\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>tiny</body></html>\n---VIBE2_FILE_END---';
  write(small1,small);
  write(small2,small);
  write(good,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:final','EXPECTED_EFFECT:playable','TEST:mobile','---VIBE2_FILE_CONTENT---',replacement,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[small1,small2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedFinalRetry,false);
  assert.equal(result.generation.fullWebExpansionStages,0);
  assert.equal(result.generation.timeoutMs,240000);
  assert.equal(result.generation.maxPredict,4096);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('undersized full web seed accumulates additive model expansions until validator scale', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed.txt');
  const expansion1=path.join(cwd,'expansion1.txt');
  const expansion2=path.join(cwd,'expansion2.txt');
  const seedBody=Array.from({length:70},(_,i)=>`function seedMechanic${i}(s){s.score=(s.score||0)+${i%7};return s}`).join('');
  const seed=`<!doctype html><html><body><main id="game"><button id="start">Start</button><canvas></canvas></main><script>let state={score:0,hp:10,wave:1};${seedBody}</script></body></html>`;
  const fragment1=`<section class="combat-system" data-gameplay-system="combat"></section><script>(()=>{const api={};${Array.from({length:90},(_,i)=>`api.m${i}=s=>{s.hp=Math.max(0,(s.hp||10)-1);s.score=(s.score||0)+1;return s};`).join('')}window.addEventListener('pointerdown',e=>{state.x=e.clientX;state.y=e.clientY;state.score+=1});})();</script>`;
  const fragment2=`<section class="progress-system" data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:90},(_,i)=>`function progress${i}(s){s.wave=(s.wave||1)+1;s.gold=(s.gold||0)+${i%5};return s}`).join('')}function finish(){if(state.score>50)document.body.dataset.runResult='victory';if(state.hp<=0)document.body.dataset.runResult='defeat';localStorage.setItem('vibe2-expansion-test',JSON.stringify(state))}window.addEventListener('touchstart',finish,{passive:true});})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-expansion-accumulate'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(expansion1,fragment1);
  write(expansion2,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment2,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,expansion1,expansion2]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionStages,2);
  assert.equal(result.generation.mode,'FULL_WEB');
  assert.equal(result.generation.fullWebInitialSeedStrategy,true);
  assert.deepEqual(result.generation.fullWebInitialSeedTargetBytes,[4200,6500]);
  assert.equal(result.codingMethod.fullWebInitialSeedStrategy,true);
  assert.deepEqual(result.codingMethod.fullWebInitialSeedTargetBytes,[4200,6500]);
  assert.equal(result.generation.temperature,0.22);
  assert.equal(result.generation.repeatedIntermediateOutputs,0);
  assert.deepEqual(result.generation.expansionStageTargets,['REAL_INPUT','UPDATE_OR_STATE_TRANSITION_LOOP']);
  assert.deepEqual(result.codingMethod.expansionStageTargets,['REAL_INPUT','UPDATE_OR_STATE_TRANSITION_LOOP']);
  assert.equal(result.generation.intermediateGrowthBytes.length,2);
  assert.ok(result.generation.intermediateGrowthBytes.every(value=>value>=1200));
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-expansion-accumulate/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
  assert.match(output,/data-gameplay-system="combat"/);
  assert.match(output,/data-gameplay-system="progression"/);
  assert.doesNotMatch(output,/VIBE2_WEB_EXPANSION/);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('tiny copied expansion skeleton is rejected before a real additive fragment is accepted', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-tiny-expansion.txt');
  const tinyFile=path.join(cwd,'tiny-expansion.txt');
  const realFile=path.join(cwd,'real-expansion.txt');
  const seedBody=Array.from({length:110},(_,i)=>`function seed${i}(s){s.score=(s.score||0)+${i%5};s.hp=Math.max(0,(s.hp||20)-0);return s}`).join('');
  const seed=`<!doctype html><html><body><button id="start">Start</button><canvas id="game"></canvas><script>let state={score:0,hp:20,wave:1};${seedBody}</script></body></html>`;
  const tiny='<section class="game-specific-system">...</section><script>(()=>{ /* real additive gameplay implementation */ })();</script>';
  const real=`<section data-gameplay-system="input-progress"></section><script>(()=>{const extra={};${Array.from({length:45},(_,i)=>`extra.m${i}=()=>{state.score+=${(i%4)+1};state.wave+=1;return state.score};`).join('')}window.addEventListener('pointerdown',()=>extra.m1());window.addEventListener('touchstart',()=>extra.m2(),{passive:true});localStorage.setItem('vibe2-tiny-expansion-test',JSON.stringify(state));})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'tiny-expansion-reject'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(tinyFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',tiny,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(realFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',real,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,tinyFile,realFile]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionStages,1);
  assert.equal(result.generation.repeatedIntermediateOutputs,1);
  assert.ok(result.generation.intermediateGrowthBytes[0]>=1200);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/tiny-expansion-reject/files/index.html'),'utf8');
  assert.doesNotMatch(output,/game-specific-system/);
  assert.match(output,/data-gameplay-system="input-progress"/);
});

test('full web expansion whole-document response can become a larger seed before final acceptance', async()=>{
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-whole-expansion.txt');
  const wholeDocFile=path.join(cwd,'whole-doc-expansion.txt');
  const fragmentFile=path.join(cwd,'fragment-after-whole-doc.txt');
  const seedBody=Array.from({length:45},(_,i)=>`function seedBase${i}(s){s.score=(s.score||0)+${i%3};return s}`).join('');
  const seed=`<!doctype html><html><body><button id="start">Start</button><script>let state={score:0,hp:20,wave:1};${seedBody}</script></body></html>`;
  const largerBody=Array.from({length:105},(_,i)=>`function recoveredSystem${i}(s){s.score=(s.score||0)+1;s.wave=(s.wave||1)+${i%2};return s}`).join('');
  const larger=`<!doctype html><html><body><button id="start">Start</button><canvas></canvas><script>let state={score:0,hp:20,wave:1};${largerBody}addEventListener('pointerdown',()=>recoveredSystem1(state));</script></body></html>`;
  const fragment=`<section data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:95},(_,i)=>`function extraProgress${i}(s){s.score+=1;s.wave+=1;s.gold=(s.gold||0)+${i%4};return s}`).join('')}function finish(){if(state.score>80)document.body.dataset.result='win';if(state.hp<=0)document.body.dataset.result='loss';localStorage.setItem('vibe2-whole-doc-recovery',JSON.stringify(state))}addEventListener('touchstart',finish,{passive:true});})();</script>`;
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-whole-expansion-seed'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(wholeDocFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',larger,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(fragmentFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,wholeDocFile,fragmentFile]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.fullWebExpansionDocumentSeedRecoveries,1);
  assert.equal(result.codingMethod.fullWebExpansionDocumentSeedRecoveries,1);
  assert.deepEqual(result.changedFiles,['index.html']);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-whole-expansion-seed/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
  assert.match(output,/recoveredSystem104/);
  assert.match(output,/extraProgress94/);
});

test('full web expansion that redefines html body is classified and retried from the accumulated seed', async()=>{
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-invalid-expansion.txt');
  const invalidFile=path.join(cwd,'invalid-expansion.txt');
  const realFile=path.join(cwd,'real-expansion.txt');
  const finalFile=path.join(cwd,'final-invalid-expansion.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-invalid-expansion-retry'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const seed='<!doctype html><html><body><button id="play">Play</button><script>let state={score:0,hp:20,wave:1};</script></body></html>';
  const invalid='<html><body><section>wrong whole document shape</section></body></html>';
  const real=`<section data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:55},(_,i)=>`function p${i}(){state.score+=${(i%5)+1};state.wave+=state.score%2;return state.score}`).join('')}window.addEventListener('pointerdown',()=>p1());})();</script>`;
  const finalBody=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}canvas{touch-action:none;width:100%}</style></head><body><button id="play">Play</button><canvas id="game"></canvas><script>let state={score:0,hp:100,wave:1,gold:0,result:"playing"};${'function step(){state.score+=1;state.gold+=1;if(state.score>400)state.result="win";if(state.hp<=0)state.result="loss";}'.repeat(230)}function reset(){state={score:0,hp:100,wave:1,gold:0,result:"playing"}}addEventListener("pointerdown",step);addEventListener("touchstart",step,{passive:true});localStorage.setItem("vibe2-invalid-expansion",JSON.stringify(state));</script></body></html>`;
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(invalidFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',invalid,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(realFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',real,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(finalFile,['VIBE2_FULL_FILE','PATH:index.html','---VIBE2_FILE_CONTENT---',finalBody,'---VIBE2_FILE_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,invalidFile,realFile,finalFile]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.fullWebExpansionStages,1);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.equal(generationFailureClass(new Error('Web expansion은 html/body 전체 구조를 재정의할 수 없음')),'MALFORMED_OUTPUT');
  assert.equal(shouldRetryGenerationError(new Error('Web expansion은 html/body 전체 구조를 재정의할 수 없음')),true);
});

test('full web initial generation asks for a complete bounded seed before staged expansion',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/FULL_WEB_INITIAL_SEED_TARGET_MIN_BYTES=4200/);
  assert.match(workerSource,/FULL_WEB_INITIAL_SEED_TARGET_MAX_BYTES=6500/);
  assert.match(workerSource,/const FULL_WEB_TIMEOUT_MS=360000/);
  assert.match(workerSource,/const FULL_WEB_EXPANSION_TIMEOUT_MS=240000/);
  assert.match(workerSource,/const FULL_WEB_FINAL_RETRY_TIMEOUT_MS=300000/);
  assert.match(workerSource,/const FULL_WEB_MAX_PREDICT=4096/);
  assert.match(workerSource,/INITIAL SEED STRATEGY: on this first response, prioritize a COMPLETE CLOSED playable seed/);
  assert.match(workerSource,/final acceptance still requires at least \$\{fullWebTarget\.minBytes\} bytes/);
});

test('full web expansion context keeps only execution-critical prefix fields',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/const line=\(label\)=>promptText\.split\('\\n'\)\.find\(row=>row\.startsWith\(label\)\)\|\|''/);
  assert.match(workerSource,/line\('Engine:'\)/);
  assert.match(workerSource,/line\('Goal:'\)/);
  assert.match(workerSource,/line\('Allowed edit paths:'\)/);
  assert.match(workerSource,/line\('Full Web generation target after automatic expansion:'\)\|\|line\('Full Web generation target:'\)/);
  assert.doesNotMatch(workerSource,/const prefix=String\(basePrompt\?\?''\)\.split\('\\n=== FILE '\)\[0\]\.trimEnd\(\)/);
});

test('full web expansion prompt does not contain copyable placeholder implementation and counts only remaining expansion attempts',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(workerSource,/<section class="game-specific-system">\.\.\.<\/section>/);
  assert.doesNotMatch(workerSource,/\/\* real additive gameplay implementation \*\//);
  assert.match(workerSource,/const remainingStages=Math\.max\(1,maxAttempts-attempt\);/);
  assert.match(workerSource,/growth<800/);
});

test('final full web attempt keeps additive expansion until the accumulated candidate reaches validator scale', async () => {
  const cwd=tempRoot();
  const seedFile=path.join(cwd,'seed-final.txt');
  const expansion1=path.join(cwd,'expansion-final-1.txt');
  const expansion2=path.join(cwd,'expansion-final-2.txt');
  const finalFile=path.join(cwd,'final-expansion.txt');
  const workOrder=order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'full-web-final-synthesis'});
  workOrder.goal='FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축';
  workOrder.workerPolicy.fullFileRewriteAllowed=true;
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>prototype</body></html>\n');
  write(path.join(cwd,'design/demo/2026-09-18/design-revised.json'),JSON.stringify({content:{coreFun:'직접 조작 전투',coreLoop:['이동','전투','보상']}},null,2));
  write(path.join(cwd,'design/demo/2026-09-18/cycle-status.json'),JSON.stringify({baselineGate:{ready:true,state:'DESIGN_BASELINE_READY'}},null,2));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  const seed='<!doctype html><html><body><main id="game"><button id="start">Start</button><canvas></canvas></main><script>let state={score:0,hp:10,wave:1};function tick(){state.score+=1}</script></body></html>';
  const fragment1=`<section data-gameplay-system="combat"></section><script>(()=>{${Array.from({length:35},(_,i)=>`function combat${i}(s){s.score+=${(i%3)+1};s.hp=Math.max(0,s.hp-1);return s}`).join('')}window.addEventListener("pointerdown",()=>{combat1(state)});})();</script>`;
  const fragment2=`<section data-gameplay-system="progression"></section><script>(()=>{${Array.from({length:35},(_,i)=>`function progress${i}(s){s.wave+=1;s.gold=(s.gold||0)+${i%5};return s}`).join('')}window.addEventListener("touchstart",()=>{progress1(state);localStorage.setItem("vibe2-final-test",JSON.stringify(state))},{passive:true});})();</script>`;
  const finalFragment=`<section data-gameplay-system="result-save-mobile"></section><script>(()=>{${Array.from({length:120},(_,i)=>`function finalStage${i}(s){s.score+=${(i%7)+1};s.gold=(s.gold||0)+1;if(s.score>500)s.result="win";if(s.hp<=0)s.result="loss";return s}`).join('')}function resetFinal(){state.score=0;state.hp=100;state.wave=1;state.gold=0;state.result="playing";localStorage.setItem("vibe2-final-test",JSON.stringify(state))}window.addEventListener("keydown",e=>{if(e.key==="r")resetFinal()});})();</script>`;
  write(seedFile,['VIBE2_FULL_FILE','PATH:index.html','SUMMARY:seed','---VIBE2_FILE_CONTENT---',seed,'---VIBE2_FILE_END---'].join('\n'));
  write(expansion1,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment1,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(expansion2,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',fragment2,'---VIBE2_EXPANSION_END---'].join('\n'));
  write(finalFile,['VIBE2_WEB_EXPANSION','---VIBE2_EXPANSION_CONTENT---',finalFragment,'---VIBE2_EXPANSION_END---'].join('\n'));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[seedFile,expansion1,expansion2,finalFile]});
  assert.equal(result.generation.attempts,4);
  assert.equal(result.generation.fullWebExpansionStages,3);
  assert.equal(result.generation.fullWebFinalAdditiveExpansion,true);
  assert.equal(result.codingMethod.fullWebFinalAdditiveExpansion,true);
  assert.equal(result.generation.completionMode,'FULL_WEB_EXPANSION');
  assert.equal(result.generation.maxPredict,4096);
  assert.equal(result.generation.timeoutMs,240000);
  assert.deepEqual(result.changedFiles,['index.html']);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/full-web-final-synthesis/files/index.html'),'utf8');
  assert.ok(Buffer.byteLength(output,'utf8')>=12000);
});

test('timeout partial JSON recovers only a complete edit object',()=>{
  const complete='{"summary":"repair","edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}],"tests":["unfinished"';
  const recovered=recoverPartialJsonEdit(complete);
  assert.deepEqual(recovered.edits,[{path:'index.html',find:'>Play<',replace:'>Continue<'}]);
  assert.deepEqual(recovered.newFiles,[]);
  assert.deepEqual(recovered.replaceFiles,[]);

  const truncated='{"edits":[{"path":"index.html","find":">Play<","replace":">Cont';
  assert.equal(recoverPartialJsonEdit(truncated),null);

  const noEdits='{"summary":"still thinking","tests":[';
  assert.equal(recoverPartialJsonEdit(noEdits),null);
});

test('timeout partial recovery stays behind existing exact-match and semantic validation',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/recoverPartialJsonEdit\(partialRecoveryOutput,\{reason:partialRecoveryClass==='MALFORMED_OUTPUT'\?'malformed':'timeout'\}\)/);
  assert.match(workerSource,/applyExactEdits\(sourceRoot,candidate\.edits,\{dryRun:true\}\)/);
  assert.match(workerSource,/candidateValidator==='function'\?candidateValidator\(candidate\):null/);
  assert.match(workerSource,/VIBE2_TIMEOUT_PARTIAL_EDIT_REJECTED/);
});

test('timeout partial recovery is persisted in coding method and immutable worker evidence',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/partialTimeoutRecovery:generation\.partialTimeoutRecovery===true/);
  assert.match(workflowSource,/baseCodingMethod\?\.partialTimeoutRecovery===true\?'coding-timeout-partial-recovery:YES'/);
});

test('zero-output focused Roblox Studio recovery bounds oversized build-up guidance below the 8K context threshold',()=>{
  const sourceRoot=tempRoot();
  const relative='client/Game.client.luau';
  write(path.join(sourceRoot,relative),[
    'local TweenService=game:GetService("TweenService")',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)',
    'return panel'
  ].join('\n')+'\n');
  const external=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions=1/1; sourcePrinciples=1; validationOnly=0; truncation=FORBIDDEN',
    '[EXTERNAL_LEARNING source-a]',
    'DISPOSITION=visual-feedback:APPLIED_GAME_SOURCE;GAME=demo;TARGET=ROBLOX;DOMAINS=GAMEPLAY_HUD;GENRE_MOOD=demo',
    'APPLY=id=visual-feedback;lesson=keep combat feedback readable;apply=bind visible feedback to current state',
    '[END_EXTERNAL_LEARNING source-a]',
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  const huge='connected presentation detail '.repeat(900);
  const directive=[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=demo-g2 primaryFocus=PRESENTATION',
    'gameIdentity=demo survival',
    'primaryGoal=make combat presentation readable',
    'implementationUnit='+huge,
    ...Array.from({length:8},(_,index)=>'sourceAnchors='+relative+':'+(index+1)+' METHOD Visual'+index+' CURRENT=weak INTENDED='+huge+' ACCEPT=visible'),
    'contentTheme='+huge,
    'contentCompletionAcceptance='+huge,
    'visual='+huge,
    'platform='+huge,
    'preserve=SAVE_KEYS|DAMAGE_VALUES|PROGRESSION',
    'acceptance=VISIBLE_NATIVE_DELTA',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].join('\n');
  const prompt=[
    'Engine: roblox',
    'Goal: [STUDIO_QUALITY_EVOLUTION] [PRESENTATION_PASS:ASSET_ADAPTATION] improve real visible Roblox presentation',
    external,
    directive,
    'Allowed edit paths: '+relative,
    '=== FILE '+relative+' [EDITABLE] ===',
    fs.readFileSync(path.join(sourceRoot,relative),'utf8')
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 첫 출력 시간 초과: 120000ms'),
    responsibleFiles:[relative],
    sourceRoot
  });
  assert.ok(focused);
  assert.equal(verifiedExternalLearningBlockFromPrompt(focused.prompt),external);
  assert.match(focused.prompt,/primaryGoal=make combat presentation readable/);
  assert.match(focused.prompt,/preserve=SAVE_KEYS\|DAMAGE_VALUES\|PROGRESSION/);
  assert.match(focused.prompt,/VISIBLE_NATIVE_DELTA/);
  assert.ok(Buffer.byteLength(focused.prompt,'utf8')<19000);
  assert.equal(sourcePromptContextWindow(focused.prompt,{baseContextWindow:8192,maxPredict:768}),8192);
});

test('zero-output timeout keeps focused recovery enabled for studio build-up',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/const zeroOutputTimeoutRecovery=!allowFullRewrite/);
  assert.match(workerSource,/&&\s*!zeroOutputTimeoutRecovery\b/);
  assert.match(workerSource,/\(!studioExpansion\|\|studioFocusedSourceRepair\|\|zeroOutputTimeoutRecovery\|\|unityStudioTimeoutFocusedRecovery\|\|robloxZeroOutputTimeoutFocusedRecoveryActive\|\|assetDevelopmentFocusedGraphics\)/);
  assert.match(workerSource,/VIBE2_ZERO_OUTPUT_TIMEOUT_FOCUSED_RECOVERY/);
});

test('zero-output model stalls use first-output deadline and stop after two empty timeouts',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/MODEL_FIRST_OUTPUT_TIMEOUT_MS=Math\.max\(30000,Math\.min\(DEFAULT_TIMEOUT_MS,Number\(process\.env\.VIBE2_MODEL_FIRST_OUTPUT_TIMEOUT_MS\|\|120000\)\)\)/);
  assert.match(workerSource,/ZERO_OUTPUT_RETRY_TIMEOUT_MS=120000/);
  assert.match(workerSource,/SOURCE_CANDIDATE_INITIAL_PROMPT_BYTES=32000/);
  assert.match(workerSource,/SOURCE_CANDIDATE_COMPACT_CONTEXT_WINDOW=STANDARD_GAME_SOURCE_CONTEXT_WINDOW/);
  assert.match(workerSource,/sourceCandidatePressureInitial=!allowFullRewrite[\s\S]*?&&!assetDevelopmentLane/);
  assert.match(workerSource,/Ollama 첫 출력 시간 초과/);
  assert.match(workerSource,/VIBE2_MODEL_FIRST_OUTPUT_MS=/);
  assert.match(workerSource,/VIBE2_MODEL_GENERATION_DURATION_MS=/);
  assert.match(workerSource,/VIBE2_ZERO_OUTPUT_TIMEOUT_STREAK/);
  assert.match(workerSource,/consecutiveZeroOutputTimeouts>=2/);
  assert.match(workerSource,/VIBE2_ZERO_OUTPUT_TIMEOUT_CIRCUIT_OPEN/);
  assert.match(workerSource,/priorFailureClass==='TIMEOUT'&&!clean\(lastRaw\)[\s\S]*?ZERO_OUTPUT_RETRY_TIMEOUT_MS/);
});

test('Unity Studio timeout recovery pins one exact responsible file before another large model retry',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/const UNITY_STUDIO_FOCUSED_TIMEOUT_MS=120000/);
  assert.match(source,/const unityStudioTimeoutFocusedRecovery=!allowFullRewrite[\s\S]*?target==='unity'[\s\S]*?studioExpansion[\s\S]*?priorFailureClass==='TIMEOUT'/);
  assert.match(source,/VIBE2_UNITY_STUDIO_TIMEOUT_FOCUSED_RECOVERY/);
  assert.match(source,/const focusedReplaceTimeoutMs=unityStudioTimeoutFocusedRecovery[\s\S]*?\?UNITY_STUDIO_FOCUSED_TIMEOUT_MS/);
});

test('Unity Studio timeout focused prompt cannot drift to a read-only UnityWebFloorGame path',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'unity-games/demo');
  const gameCore='Assets/Scripts/GameCore.cs';
  const runtimeBootstrap='Assets/Scripts/RuntimeBootstrap.cs';
  write(path.join(sourceRoot,gameCore),'public sealed class GameCore { public int Score = 1; }\n');
  write(path.join(sourceRoot,runtimeBootstrap),'public sealed class RuntimeBootstrap { public bool Ready = false; }\n');
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: [STUDIO_QUALITY_EVOLUTION] improve the existing Unity gameplay implementation',
    'Allowed edit paths: '+gameCore+', '+runtimeBootstrap,
    '=== FILE '+gameCore+' [EDITABLE] ===',
    'public sealed class GameCore { public int Score = 1; }',
    '=== FILE '+runtimeBootstrap+' [EDITABLE] ===',
    'public sealed class RuntimeBootstrap { public bool Ready = false; }',
    '=== FILE Assets/Scripts/UnityWebFloorGame.cs [READ-ONLY IMPACT CONTEXT] ===',
    'public sealed class UnityWebFloorGame { }'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:[gameCore,runtimeBootstrap],
    sourceRoot
  });
  assert.ok(focused);
  assert.ok([gameCore,runtimeBootstrap].includes(focused.spec.path));
  assert.match(focused.prompt,/Exact writable path:/);
  assert.doesNotMatch(focused.prompt,/Exact writable path: .*UnityWebFloorGame/);
  assert.match(focused.prompt,/Do NOT return path or find/);
});

test('focused retry derives exact unique find anchors from writable source',()=>{
  const base=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: web',
    'Goal: repair play interaction',
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<main id="game">',
    '  <button id="play">Play</button>',
    '  <canvas id="stage"></canvas>',
    '</main>',
    '<script>',
    'const playButton=document.getElementById("play");',
    'playButton.addEventListener("click",()=>startGame());',
    'function startGame(){ state.running=true; }',
    '</script>'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(base,{max:3});
  assert.ok(anchors.length>=1);
  assert.ok(anchors.every(value=>base.includes(value)));
  assert.equal(new Set(anchors).size,anchors.length);
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/EXACT FIND ANCHOR OPTIONS/);
  assert.match(retry,/ANCHOR_1:/);
  assert.match(retry,/Use exactly one EXACT FIND ANCHOR OPTION/i);
});

test('first edit-match failure fast-escalates attempt two to exact replace-only recovery',async()=>{
  const cwd=tempRoot();
  const bad=path.join(cwd,'edit-match-bad.json');
  const good=path.join(cwd,'edit-match-focused.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'edit-match-fast-escalation'
  }),null,2));
  write(bad,JSON.stringify({edits:[{path:'index.html',find:'<button id="missing">Play</button>',replace:'<button id="missing">Continue</button>'}],newFiles:[],replaceFiles:[]}));
  write(good,JSON.stringify({replace:'<button id="play">Continue</button>'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.completionMode,'JSON_REPLACE_ONLY');
  assert.equal(result.generation.maxPredict,384);
  assert.equal(result.generation.timeoutMs,240000);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('full web progressive credit requires sustained real growth and keeps 12KB gate',()=>{
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[1736,1736,1736],repeatedOutputs:0,currentMax:4,attempt:4,fakeResponseCount:0}),true);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:12000,minBytes:12000,growthBytes:[1736,1736],repeatedOutputs:0,currentMax:4,attempt:4,fakeResponseCount:0}),false);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[900,1736],repeatedOutputs:0,currentMax:4,attempt:4,fakeResponseCount:0}),false);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[1736,1736],repeatedOutputs:1,currentMax:4,attempt:4,fakeResponseCount:0}),false);
  assert.equal(fullWebProgressCreditEligible({accumulatedBytes:5915,minBytes:12000,growthBytes:[1736,1736],repeatedOutputs:0,currentMax:8,attempt:8,fakeResponseCount:0}),false);
});
test('focused replace-only pins exact path and anchor while model emits only replacement',()=>{
  const base=[
    'Goal: repair play interaction',
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    'const playButton=document.getElementById("play");',
    'playButton.addEventListener("click",()=>startGame());',
    'function startGame(){ state.running=true; }'
  ].join('\n');
  const spec=focusedReplaceOnlySpec(base,{responsibleFiles:['index.html']});
  const alternate=focusedReplaceOnlySpec(base,{responsibleFiles:['index.html'],anchorIndex:1});
  assert.ok(spec);
  assert.ok(alternate);
  assert.equal(spec.path,'index.html');
  assert.equal(alternate.path,'index.html');
  assert.ok(base.includes(spec.find));
  assert.ok(base.includes(alternate.find));
  assert.notEqual(alternate.find,spec.find);
  const focused=buildFocusedReplaceOnlyPrompt(base,{error:new Error('timeout'),responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.match(focused.prompt,/Do NOT return path or find/);
  assert.match(focused.prompt,/Return exactly one JSON object with exactly one key named "replace"/);
  const normalized=normalizeFocusedReplaceOnly(JSON.stringify({replace:'const playButton=document.getElementById("play") ?? document.body;'}),focused.spec);
  assert.equal(normalized.edits.length,1);
  assert.equal(normalized.edits[0].path,'index.html');
  assert.equal(normalized.edits[0].find,focused.spec.find);
  assert.notEqual(normalized.edits[0].replace,focused.spec.find);
});

test('focused replace-only prioritizes primary target symbols in compressed Web source',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><script>const CONFIG={mode:"defense"}; function helper(){return 1} function actDefense(i){if(i===0){state.towers++;}else{state.power++;}} const footer=1;</script>';
  write(path.join(sourceRoot,'index.html'),source);
  const prompt=['Goal: repair tower placement input','Allowed edit paths: index.html','','=== FILE index.html [EDITABLE] ===',source].join('\n');
  const spec=focusedReplaceOnlySpec(prompt,{responsibleFiles:['index.html'],sourceRoot,preferredTargets:['actDefense']});
  assert.ok(spec);
  assert.equal(spec.path,'index.html');
  assert.match(spec.find,/^function actDefense\(i\)\{$/);
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:['index.html'],sourceRoot,preferredTargets:['actDefense']});
  assert.equal(focused.spec.find,spec.find);
  assert.match(focused.prompt,/tower placement input/);
});

test('focused replace-only selects a concrete anchor across multiple responsible files',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'system-root');
  write(path.join(sourceRoot,'tools/system.mjs'),[
    'export function inspectSignal(signal){',
    '  return signal === "repeat" ? "repair" : "healthy";',
    '}'
  ].join('\n'));
  write(path.join(sourceRoot,'qa/system.test.mjs'),[
    'const expectedState = "repair";',
    'assert.equal(inspectSignal("repeat"), expectedState);'
  ].join('\n'));
  const prompt=[
    'Goal: repair repeated system routing without changing authority',
    'Allowed edit paths: tools/system.mjs, qa/system.test.mjs',
    '',
    '=== FILE tools/system.mjs [EDITABLE] ===',
    'export function inspectSignal(signal){',
    '  return signal === "repeat" ? "repair" : "healthy";',
    '}',
    '',
    '=== FILE qa/system.test.mjs [EDITABLE] ===',
    'const expectedState = "repair";',
    'assert.equal(inspectSignal("repeat"), expectedState);'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['tools/system.mjs','qa/system.test.mjs'],
    sourceRoot
  });
  assert.ok(focused);
  assert.ok(['tools/system.mjs','qa/system.test.mjs'].includes(focused.spec.path));
  assert.ok(fs.readFileSync(path.join(sourceRoot,focused.spec.path),'utf8').includes(focused.spec.find));
  assert.match(focused.prompt,/Do NOT return path or find/);
  assert.doesNotMatch(focused.prompt,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
});

test('minified focused repair can pin a worker-owned GAME_CONFIG anchor',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  const source='<!doctype html><html><body><script>window.GAME_CONFIG={id:"demo",mode:"repair",hp:100,gameplayMechanics:["pointer-input","restart"]}</script><script src="/web-games/_shared/vibe2-final.js"></script></body></html>';
  write(path.join(sourceRoot,'index.html'),source);
  const prompt=['Allowed edit paths: index.html','','=== FILE index.html [EDITABLE] ===',source].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:3,sourceRoot,responsibleFiles:['index.html']});
  assert.ok(anchors.some(value=>value.includes('window.GAME_CONFIG')));
  assert.ok(anchors.every(value=>source.includes(value)));
});

test('focused Web repair keeps target selection on the first attempt before causal replace-only recovery',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-first.json');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-first-attempt'
  });
  workOrder.goal='[WEB_REPAIR] repair the existing play control without changing gameplay balance';
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.focusedReplaceOnly,false);
  assert.equal(result.generation.focusedFirstAttemptFastPath,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT_PARTIAL');
  assert.equal(result.generation.focusedFirstEditEarlyStop,true);
  assert.equal(result.generation.partialTimeoutRecovery,false);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.codingMethod.focusedFirstAttemptFastPath,false);
  assert.equal(result.codingMethod.focusedFirstEditEarlyStop,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-first-attempt/files/index.html'),'utf8'),/Continue/);
});

test('retried Web task reuses prior focused generation evidence on the first attempt',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-history-reuse.json');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-history-reuse'
  });
  workOrder.goal='continue the existing game implementation without changing protected gameplay values';
  workOrder.selectedTask={
    retries:1,
    evidence:[
      'coding-focused-replace-only:YES',
      'coding-generation-attempts:2',
      'candidate-sha:0123456789abcdef0123456789abcdef01234567'
    ]
  };
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],newFiles:[],replaceFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.focusedWebRepair,true);
  assert.equal(result.generation.completionMode,'JSON_EDIT_PARTIAL');
  assert.equal(result.generation.focusedFirstEditEarlyStop,true);
  assert.equal(result.generation.maxPredict,1024);
  assert.equal(result.generation.contextWindow,32768);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-history-reuse/files/index.html'),'utf8'),/Continue/);
});

test('focused history is not reused without a prior material candidate',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-history-no-candidate.json');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-history-no-candidate'
  });
  workOrder.selectedTask={
    retries:1,
    evidence:['coding-focused-replace-only:YES','coding-generation-attempts:2']
  };
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({summary:'update',expectedEffect:'visible change',edits:[{path:'index.html',find:'>Play<',replace:'>Continue<'}],newFiles:[],replaceFiles:[],tests:['button']}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.focusedWebRepair,false);
  assert.equal(result.generation.completionMode,'JSON_EDIT');
  assert.equal(result.generation.focusedFirstEditEarlyStop,false);
});

test('focused replace string recovery is exported to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedReplaceStringRecovery:generation\.focusedReplaceStringRecovery===true/);
  assert.match(workflowSource,/coding-focused-replace-string-recovery:YES/);
});

test('focused first-attempt fast path is exported to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedFirstAttemptFastPath:generation\.focusedFirstAttemptFastPath===true/);
  assert.match(workflowSource,/coding-focused-replace-only:YES/);
  assert.match(workflowSource,/coding-focused-first-attempt-fast-path:YES/);
});

test('focused Web repair accepts the first complete edit boundary without marking a timeout recovery',async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'focused-first-edit.json');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-first-edit-boundary'
  });
  workOrder.goal='[WEB_REPAIR] repair the existing play control without changing gameplay balance';
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,'{"edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}]');
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.completionMode,'JSON_EDIT_PARTIAL');
  assert.equal(result.generation.focusedFirstEditEarlyStop,true);
  assert.equal(result.generation.partialTimeoutRecovery,false);
  assert.equal(result.codingMethod.focusedFirstEditEarlyStop,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-first-edit-boundary/files/index.html'),'utf8'),/Continue/);
});

test('focused first-edit stream contract is persisted to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedFirstEditEarlyStop:generation\.focusedFirstEditEarlyStop===true/);
  assert.match(workflowSource,/coding-focused-first-edit-early-stop:YES/);
});

test('focused no-op retry keeps speculative base budget but grants only targeted credit in worker loop',()=>{
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'speculative-1'}),2);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_FOCUSED_REPLACE_NOOP_CREDIT/);
  assert.match(workerSource,/focusedReplaceAnchorCursor\+=1/);
  assert.match(workerSource,/focusedReplaceNoOpCreditUsed=true/);
});

test('primary focused Roblox recovery consumes the configured fourth attempt without expanding the retry budget',()=>{
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'primary'}),4);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/focusedPrimaryBudgetRetry=!allowFullRewrite&&focusedReplaceOnly&&!speculativeVariant&&focusedFinalRetryAllowed\(error\)&&attempt<maxAttempts/);
  assert.match(workerSource,/VIBE2_FOCUSED_PRIMARY_BUDGET_RETRY/);
  assert.match(workerSource,/hasAnother=.*focusedPrimaryBudgetRetry/);
});

test('Roblox studio visual-domain failures consume the remaining configured causal recovery attempt',()=>{
  assert.equal(generationAttemptBudget({allowFullRewrite:false,variant:'primary'}),4);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/studioCausalRecoveryClass=studioExpansion&&\([\s\S]*ROBLOX_VISUAL_DOMAINS[\s\S]*ROBLOX_VISUAL_MOTION/);
  assert.match(workerSource,/studioCausalRecoveryClass&&attempt>=maxAttempts&&attempt<configuredBaseMaxAttempts/);
});

test('focused replace recovery salvages a complete replace string from an unfinished outer JSON object',()=>{
  const spec={path:'index.html',find:'<button id="play">Play</button>'};
  const raw='{"replace":"<button id=\\\"play\\\">Continue</button>"\n';
  const recovered=recoverFocusedReplaceOnly(raw,spec);
  assert.ok(recovered);
  assert.equal(recovered.edits[0].path,'index.html');
  assert.equal(recovered.edits[0].find,spec.find);
  assert.equal(recovered.edits[0].replace,'<button id="play">Continue</button>');
  assert.equal(recoverFocusedReplaceOnly('{"replace":"<button id=\\\"play\\\">Cont',spec),null);
  assert.equal(recoverFocusedReplaceOnly('{"replace":"COMPLETE_REPLACEMENT_SOURCE_SNIPPET"',spec),null);
  assert.equal(recoverFocusedReplaceOnly(JSON.stringify({replace:spec.find}).slice(0,-1),spec),null);
});

test('focused Web repair recovers malformed focused replacement when the replace string is complete',async()=>{
  const cwd=tempRoot();
  const malformed=path.join(cwd,'malformed-first.txt');
  const focusedMalformed=path.join(cwd,'focused-malformed.txt');
  const workOrder=order({
    target:'web',
    root:'web-games/demo',
    responsibleFiles:['web-games/demo/index.html'],
    taskId:'focused-string-recovery'
  });
  workOrder.goal='[WEB_REPAIR] 기존 플레이 버튼 동작을 직접 보강';
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body>\n<button id="play">Play</button>\n</body></html>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(malformed,'not-json');
  write(focusedMalformed,'{"replace":"<button id=\\\"play\\\">Continue</button>"\n');
  const result=await runVibe2SourceWorker({cwd,responseFiles:[malformed,focusedMalformed]});
  assert.equal(result.generation.attempts,2);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.focusedReplaceStringRecovery,true);
  assert.equal(result.codingMethod.focusedReplaceStringRecovery,true);
  assert.deepEqual(result.changedFiles,['index.html']);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/focused-string-recovery/files/index.html'),'utf8'),/Continue/);
});

test('focused replace-only rejects unchanged replacement and supports early completion',()=>{
  const spec={path:'index.html',find:'const state={running:false};'};
  assert.throws(()=>normalizeFocusedReplaceOnly(JSON.stringify({replace:spec.find}),spec),/변경 없는 edit/);
  assert.throws(()=>normalizeFocusedReplaceOnly(JSON.stringify({replace:'COMPLETE_REPLACEMENT_SOURCE_SNIPPET'}),spec),/placeholder 금지/);
  const focused=buildFocusedReplaceOnlyPrompt([
    'Goal: repair play state',
    'Allowed edit paths: index.html',
    '=== FILE index.html [EDITABLE] ===',
    spec.find
  ].join('\n'),{responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.doesNotMatch(focused.prompt,/COMPLETE_REPLACEMENT_SOURCE_SNIPPET/);
  assert.match(focused.prompt,/exactly one key named "replace"/);
  assert.equal(modelResponseComplete(JSON.stringify({replace:'const state={running:true};'}),'JSON_REPLACE_ONLY'),true);
  assert.equal(modelResponseComplete('{"replace":','JSON_REPLACE_ONLY'),false);
});
test('exact retry anchors verify uniqueness against the full responsible source',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'web-games/demo');
  write(path.join(sourceRoot,'index.html'),[
    '<main>',
    'const duplicateAnchor=()=>state.ready;',
    '<section>middle</section>',
    'const duplicateAnchor=()=>state.ready;',
    'const trulyUniqueAnchor=()=>state.running;',
    '</main>'
  ].join('\n'));
  const prompt=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    'const duplicateAnchor=()=>state.ready;',
    'const trulyUniqueAnchor=()=>state.running;'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:3,sourceRoot,responsibleFiles:['index.html']});
  assert.equal(anchors.includes('const duplicateAnchor=()=>state.ready;'),false);
  assert.equal(anchors.includes('const trulyUniqueAnchor=()=>state.running;'),true);
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2,
    sourceRoot
  });
  assert.doesNotMatch(retry,/ANCHOR_\d+:.*duplicateAnchor/);
  assert.match(retry,/trulyUniqueAnchor/);
});

test('exact retry anchors exclude repeated and structural-only lines',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<div>',
    'same();',
    'same();',
    '</div>',
    'const uniqueHandler=()=>{ state.ready=true; };'
  ].join('\n');
  const anchors=exactRetryAnchorSuggestions(base,{max:3});
  assert.equal(anchors.includes('same();'),false);
  assert.equal(anchors.includes('const uniqueHandler=()=>{ state.ready=true; };'),true);
});

test('focused retry prompt never references focusedFinal before it is initialized',()=>{
  const base=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: web',
    'Goal: repair runtime interaction',
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>'
  ].join('\n');
  assert.doesNotThrow(()=>buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['index.html'],
    attempt:2
  }));
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/only top-level key is "edits"/);
  assert.doesNotMatch(retry,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
});

test('first timeout escalates attempt two directly to compact focused retry',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:2});
  assert.match(retry,/exceeded the time budget/);
  assert.match(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/Recovery context intentionally contains only writable FILE blocks/);
  assert.match(retry,/Start immediately with the JSON object/);
  assert.doesNotMatch(retry,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/timeoutFastEscalation=!allowFullRewrite&&attempt>=2&&priorFailureClass==='TIMEOUT'/);
  assert.match(workerSource,/focusedFinal\?JSON_FINAL_RETRY_MAX_PREDICT/);
  assert.match(workerSource,/focusedFinal\?JSON_FINAL_RETRY_TIMEOUT_MS/);
});

test('focused minimal JSON retry is persisted to immutable worker evidence',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/focusedMinimalJsonContract:generation\.focusedFinalRetry===true&&!allowFullRewrite/);
  assert.match(workflowSource,/coding-focused-minimal-json:YES/);
  assert.match(workflowSource,/coding-focused-final-retry:YES/);
});

test('timeout retry drops oversized guidance prefix and keeps only execution-critical context',()=>{
  const base=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: web',
    'Goal: repair the play button',
    'VERIFIED_MEMORY_BLOB:'+ 'x'.repeat(20000),
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:2});
  assert.match(retry,/Engine: web/);
  assert.match(retry,/Goal: repair the play button/);
  assert.match(retry,/Allowed edit paths: index\.html/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/VERIFIED_MEMORY_BLOB/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.ok(Buffer.byteLength(retry,'utf8')<9000);
});

test('timeout final retry prompt strips read-only context and asks for one compact real edit',()=>{
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:false,error:new Error('Ollama 응답 시간 초과: 240000ms'),responsibleFiles:['index.html'],attempt:3});
  assert.match(retry,/exceeded the time budget/);
  assert.match(retry,/FINAL FOCUSED RETRY/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/output one JSON object with only the "edits" key/);
  assert.doesNotMatch(retry,/EXACT_ALLOWED_PATH|EXACT_UNIQUE_SOURCE_TEXT|MINIMAL_REAL_REPLACEMENT/);
});

test('generation recovery remains bounded and keeps strict output contracts', () => {
  assert.equal(shouldRetryGenerationError(new Error('Ollama 응답 시간 초과: 540000ms')), true);
  assert.equal(shouldRetryGenerationError(new Error('모델 JSON 파싱 실패')), true);
  assert.equal(shouldRetryGenerationError(new Error('unsupported target')), false);
  const full = buildGenerationRetryPrompt('base', { allowFullRewrite:true, error:new Error('전체 교체 파일 크기 오류: index.html') });
  assert.match(full, /MUST begin with VIBE2_FULL_FILE/);
  assert.match(full, /MUST end with ---VIBE2_FILE_END---/);
  assert.match(full, /12000-24000 UTF-8 bytes/);
  assert.match(full, /hard safety range remains 1800-260000 UTF-8 bytes/);
  assert.match(full, /MUST reach at least 12000 bytes/);
  assert.match(full, /substantial executable JavaScript/);
  const raised = buildGenerationRetryPrompt('Full Web generation target: 18000-36000 UTF-8 bytes.', { allowFullRewrite:true, error:new Error('전체 교체 파일 크기 오류: index.html') });
  assert.match(raised, /MUST reach at least 18000 bytes/);
  assert.match(raised, /at or below 36000 bytes/);
  const json = buildGenerationRetryPrompt('base', { allowFullRewrite:false, error:new Error('JSON') });
  assert.match(json, /strict JSON object only/);
  assert.match(json, /No markdown/);
});

test('full web bounded fallback keeps largest partial telemetry in the coding method',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/bestFullWebFallbackRaw/);
  assert.match(workerSource,/fullWebFallbackBestPartialBytes:Number\(generation\.fullWebFallbackBestPartialBytes\|\|0\)/);
  assert.match(workerSource,/\['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'\]\.includes\(generationFailureClass\(error\)\)/);
});

test('full web retry compacts oversized guidance and reuses the largest prior partial',()=>{
  const previous=[
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    '---VIBE2_FILE_CONTENT---',
    '<!doctype html><html><body><script>'+ 'let score=0;'.repeat(650)
  ].join('\n');
  const base=[
    'You are the Vibe2 game source worker. Return exactly one raw VIBE2_FULL_FILE envelope. Do not return JSON.',
    'Engine: web',
    'Goal: FULL_WEB_GAME_REBUILD 실제 웹게임으로 재구축',
    'VERIFIED_MEMORY_BLOB:'+ 'x'.repeat(24000),
    'Allowed edit paths: index.html',
    'Full Web generation target: 12000-24000 UTF-8 bytes.',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<!doctype html><html><body>prototype</body></html>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={large:true};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{allowFullRewrite:true,error:new Error('Ollama 응답 시간 초과: 360000ms'),responsibleFiles:['index.html'],attempt:2,previousOutput:previous});
  assert.match(retry,/Engine: web/);
  assert.match(retry,/Goal: FULL_WEB_GAME_REBUILD/);
  assert.match(retry,/Full Web generation target: 12000-24000 UTF-8 bytes/);
  assert.match(retry,/BEGIN_PREVIOUS_FULL_WEB_CANDIDATE/);
  assert.doesNotMatch(retry,/VERIFIED_MEMORY_BLOB/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.ok(Buffer.byteLength(retry,'utf8')<20000);
});

test('full web expansion whole-document recovery is observable in coding telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_FULL_WEB_EXPANSION_DOCUMENT_SEED_RECOVERED/);
  assert.match(workerSource,/fullWebExpansionDocumentSeedRecoveries:Number\(generation\.fullWebExpansionDocumentSeedRecoveries\|\|0\)/);
});

test('full web retry prompt compaction is observable in source telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_FULL_WEB_RETRY_PROMPT_BYTES/);
  assert.match(workerSource,/fullWebRetryPromptCompacted:generation\.fullWebRetryPromptCompacted===true/);
  assert.match(workflowSource,/coding-full-web-retry-prompt-compacted:YES/);
});

test('full web recovery carries the previous undersized candidate forward for expansion', () => {
  const previous = [
    'VIBE2_FULL_FILE',
    'PATH:index.html',
    '---VIBE2_FILE_CONTENT---',
    '<!doctype html><html><body><canvas id="game"></canvas><script>let hp=10;</script></body></html>',
    '---VIBE2_FILE_END---'
  ].join('\n');
  const retry = buildGenerationRetryPrompt(
    'Full Web generation target: 12000-24000 UTF-8 bytes.',
    {
      allowFullRewrite:true,
      error:new Error('전체 교체 파일 크기 오류: index.html:bytes=1262:min=12000:max=260000'),
      previousOutput:previous,
      attempt:2
    }
  );
  assert.match(retry,/previous full-Web candidate was \d+ UTF-8 bytes/i);
  assert.match(retry,/Expand this actual implementation instead of restarting as a smaller shell/);
  assert.match(retry,/---BEGIN_PREVIOUS_FULL_WEB_CANDIDATE---/);
  assert.match(retry,/<canvas id="game">/);
  assert.match(retry,/---END_PREVIOUS_FULL_WEB_CANDIDATE---/);
});

test('malformed JSON with one complete exact edit recovers without widening scope', async()=>{
  const cwd=tempRoot();
  const malformed=path.join(cwd,'malformed-partial.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'malformed-partial-recovery'
  }),null,2));
  write(malformed,'{"summary":"repair","edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}],"tests":["unfinished"');
  const result=await runVibe2SourceWorker({cwd,responseFile:malformed});
  assert.equal(result.generation.attempts,1);
  assert.equal(result.generation.recoveryUsed,true);
  assert.equal(result.codingMethod.partialMalformedRecovery,true);
  assert.equal(result.codingMethod.partialTimeoutRecovery,false);
  assert.deepEqual(result.changedFiles,['index.html']);
  const output=fs.readFileSync(path.join(cwd,'.vibe2/candidates/malformed-partial-recovery/files/index.html'),'utf8');
  assert.match(output,/>Continue</);
});

test('malformed partial recovery evidence is exported to immutable worker telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/partialMalformedRecovery:generation\.partialMalformedRecovery===true/);
  assert.match(workflowSource,/coding-malformed-partial-recovery:YES/);
});

test('timeout partial edit recovery accepts only one fully closed edit object',()=>{
  const complete='{"summary":"partial","edits":[{"path":"index.html","find":"const state={hp:10};","replace":"const state={hp:10,ready:true};"},{"path":"index.html","find":"unfinished"';
  const recovered=recoverPartialJsonEdit(complete);
  assert.ok(recovered);
  assert.equal(recovered.edits.length,1);
  assert.equal(recovered.edits[0].path,'index.html');
  assert.equal(recovered.edits[0].find,'const state={hp:10};');
  assert.equal(recovered.edits[0].replace,'const state={hp:10,ready:true};');
  assert.deepEqual(recovered.newFiles,[]);
  assert.deepEqual(recovered.replaceFiles,[]);
});

test('timeout partial edit recovery handles braces and escapes inside JSON strings and rejects incomplete objects',()=>{
  const escaped='{"edits":[{"path":"index.html","find":"if (state.hp) { log(\\"x\\"); }","replace":"if (state.hp) { log(\\"{ok}\\"); state.ready=true; }"}],"newFiles":[';
  const recovered=recoverPartialJsonEdit(escaped);
  assert.ok(recovered);
  assert.equal(recovered.edits[0].replace,'if (state.hp) { log("{ok}"); state.ready=true; }');
  assert.equal(recoverPartialJsonEdit('{"edits":[{"path":"index.html","find":"a","replace":"b"'),null);
  assert.equal(recoverPartialJsonEdit('{"summary":"no edits yet"'),null);
});

test('focused timeout streaming can stop after one complete edit object',()=>{
  const partial='{"edits":[{"path":"index.html","find":">Play<","replace":">Continue<"}],"tests":["still generating"';
  assert.equal(modelResponseComplete(partial,'JSON_EDIT'),false);
  assert.equal(modelResponseComplete(partial,'JSON_EDIT_PARTIAL'),true);
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html","find":">Play<","replace":">Cont','JSON_EDIT_PARTIAL'),false);
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/timeoutFastEscalation\|\|focusedFirstEditEarlyStop/);
  assert.match(workerSource,/focusedFirstEditEarlyStop:Boolean\(streamedPartialEdit\)&&focusedFirstEditEarlyStop/);
  assert.match(workerSource,/streamedPartialEditRecovery:Boolean\(streamedPartialEdit\)/);
  assert.match(workflowSource,/coding-streamed-partial-edit-recovery:YES/);
});

test('final additive full web expansion is persisted to immutable worker evidence',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/fullWebFinalAdditiveExpansion:generation\.fullWebFinalAdditiveExpansion===true/);
  assert.match(workflowSource,/coding-full-web-final-additive-expansion:YES/);
});

test('closed full web envelope early stop is persisted to coding telemetry',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workerSource,/fullWebClosedHtmlEarlyStop:generation\.fullWebClosedHtmlEarlyStop===true/);
  assert.match(workflowSource,/coding-full-web-closed-html-early-stop:YES/);
});

test('model response completion stops only at a complete candidate boundary', () => {
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html","find":"a","replace":"b"}],"newFiles":[]}', 'JSON_EDIT'), true);
  assert.equal(modelResponseComplete('{"edits":[{"path":"index.html"', 'JSON_EDIT'), false);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x</body></html>', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x', 'FULL_WEB'), false);
  assert.equal(modelResponseComplete('VIBE2_FULL_FILE\nPATH:index.html\n---VIBE2_FILE_CONTENT---\n<!doctype html><html><body>x</body></html>\n---VIBE2_FILE_END---', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('<!doctype html><html><body>x</body></html>', 'FULL_WEB'), true);
  assert.equal(modelResponseComplete('VIBE2_WEB_EXPANSION\n---VIBE2_EXPANSION_CONTENT---\n<script>(()=>{})();</script>', 'FULL_WEB_EXPANSION'), false);
  assert.equal(modelResponseComplete('VIBE2_WEB_EXPANSION\n---VIBE2_EXPANSION_CONTENT---\n<script>(()=>{})();</script>\n---VIBE2_EXPANSION_END---', 'FULL_WEB_EXPANSION'), true);
});

test('second malformed JSON receives the bounded focused third retry', async () => {
  const cwd=tempRoot();
  const bad1=path.join(cwd,'bad1.json');
  const bad2=path.join(cwd,'bad2.json');
  const good=path.join(cwd,'good3.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'malformed-third-retry'}),null,2));
  write(bad1,'{"edits":[');
  write(bad2,'{"edits":[{"path":"index.html"');
  write(good,JSON.stringify({replace:'<button id="play">Continue</button>'}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad1,bad2,good]});
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.focusedFinalRetry,true);
  assert.equal(result.generation.focusedReplaceOnly,true);
  assert.equal(result.generation.temperature,0.08);
  assert.equal(result.generation.completionMode,'JSON_REPLACE_ONLY');
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('model edit paths may carry line locators without becoming invalid file paths', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model.json');
  const relative='Assets/Scripts/UnityWebFloorGame.cs';
  write(path.join(cwd,'unity-games/demo',relative),'class UnityWebFloorGame { int Floor() { return 1; } }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'unity',
    root:'unity-games/demo',
    responsibleFiles:[`unity-games/demo/${relative}`],
    taskId:'unity-line-locator-path'
  }),null,2));
  write(responseFile,JSON.stringify({
    edits:[{path:`${relative}:149`,find:'return 1;',replace:'return 2;'}],
    newFiles:[]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.deepEqual(result.changedFiles,[relative]);
  assert.match(fs.readFileSync(path.join(cwd,'unity-games/demo',relative),'utf8'),/return 1;/);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',relative),'utf8'),/return 2;/);
});

test('Ollama transport uses streaming instead of one giant non-streaming response', () => {
  const workerSource = fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs', import.meta.url), 'utf8');
  assert.match(workerSource, /stream:true/);
  assert.doesNotMatch(workerSource, /stream:false/);
  assert.match(workerSource, /node:http/);
  assert.match(workerSource, /vibe2PartialOutput=output/);
  assert.match(workerSource, /error\?\.vibe2PartialOutput/);
  assert.match(workerSource, /\['FULL_REWRITE_SIZE','TIMEOUT','MALFORMED_OUTPUT'\]/);
});

test('Unreal C++ text source is allowed', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unreal-games/demo/Source/Demo/Hero.cpp'), 'void Hero::Tick() { Value = Value + 0; }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ target: 'unreal', root: 'unreal-games/demo', responsibleFiles: ['unreal-games/demo/Source/Demo/Hero.cpp'], taskId: 'ue-cpp' }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Source/Demo/Hero.cpp', find: 'Value = Value + 0;', replace: 'Value = Value;' }], newFiles: [] }));
  const result = await runVibe2SourceWorker({ cwd, responseFile });
  assert.equal(result.target, 'unreal');
});

test('Unreal uasset is rejected before model execution', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unreal-games/demo/Content/Hero.uasset'), 'not-real-binary');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ target: 'unreal', root: 'unreal-games/demo', responsibleFiles: ['unreal-games/demo/Content/Hero.uasset'], taskId: 'ue-binary' }), null, 2));
  write(responseFile, '{}');
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile }), /엔진 에디터 필요 바이너리 파일/);
});

test('source apply refuses non-candidate branch', async () => {
  const cwd = tempRoot();
  const responseFile = path.join(cwd, 'model.json');
  write(path.join(cwd, 'unity-games/demo/Assets/Player.cs'), 'class Player { int Speed() { return 1; } }\n');
  write(path.join(cwd, '.vibe2/work-order.json'), JSON.stringify(order({ responsibleFiles: ['unity-games/demo/Assets/Player.cs'] }), null, 2));
  write(responseFile, JSON.stringify({ edits: [{ path: 'Assets/Player.cs', find: 'return 1;', replace: 'return 2;' }], newFiles: [] }));
  await assert.rejects(runVibe2SourceWorker({ cwd, responseFile, applySource: true }), /vibe2\/candidate\/\* 브랜치에서만 허용/);
});

test('exact edit accepts only unique indentation and line-ending drift', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\r\n  int Speed() {\r\n    return 1;\r\n  }\r\n}\r\n');
  const changed = applyExactEdits(cwd, [{
    path: 'Player.cs',
    find: 'int Speed() {\n  return 1;\n}',
    replace: 'int Speed() {\n    return 2;\n}'
  }]);
  assert.deepEqual(changed, ['Player.cs']);
  assert.match(fs.readFileSync(source, 'utf8'), /return 2;/);
});

test('exact edit still rejects materially different source text', () => {
  const cwd = tempRoot();
  const source = path.join(cwd, 'Player.cs');
  write(source, 'class Player {\n  int Speed() {\n    return 1;\n  }\n}\n');
  assert.throws(() => applyExactEdits(cwd, [{
    path: 'Player.cs',
    find: 'int Speed() {\n  return 9;\n}',
    replace: 'int Speed() {\n    return 2;\n}'
  }]), /edit find 불일치/);
});


test('edit-match recovery immediately narrows to one exact writable snippet', () => {
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '<div id="status">Ready</div>',
    '',
    '=== FILE config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.CONFIG={x:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{
    allowFullRewrite:false,
    error:new Error('edit find 불일치: index.html'),
    responsibleFiles:['index.html'],
    attempt:2
  });
  assert.match(retry,/previous edits\[\]\.find text did not match the writable source/);
  assert.match(retry,/ONLY writable path is "index\.html"/);
  assert.match(retry,/EXACT FIND ANCHOR OPTIONS/);
  assert.match(retry,/Do not paraphrase, normalize, reconstruct, or guess source text/);
  assert.doesNotMatch(retry,/config\.js/);
  assert.match(retry,/do not bypass responsible-file boundaries/);
});

test('invalid edit path recovery requires an exact allowed path', () => {
  const error=new Error('텍스트 worker 허용 확장자 아님: exact allowed path');
  assert.equal(shouldRetryGenerationError(error),true);
  const prompt=buildGenerationRetryPrompt('Allowed edit paths: web-games/demo/index.html\n=== FILE web-games/demo/index.html ===\n<button>Play</button>',{error});
  assert.match(prompt,/invalid edit path/);
  assert.match(prompt,/copied exactly from Allowed edit paths/);
  assert.match(prompt,/Never output placeholders/);
});


test('model line locator is removed only when it resolves to an exact responsible file', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-line-locator.json');
  write(path.join(cwd,'unity-games/demo/Assets/Scripts/UnityWebFloorGame.cs'),'class UnityWebFloorGame { int Speed() { return 1; } }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'unity',
    root:'unity-games/demo',
    responsibleFiles:['unity-games/demo/Assets/Scripts/UnityWebFloorGame.cs'],
    taskId:'unity-line-locator'
  }),null,2));
  write(responseFile,JSON.stringify({
    edits:[{
      path:'Assets/Scripts/UnityWebFloorGame.cs:149',
      find:'return 1;',
      replace:'return 2;'
    }],
    newFiles:[]
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.deepEqual(result.changedFiles,['Assets/Scripts/UnityWebFloorGame.cs']);
});

test('model line locator cannot escape the responsible file scope', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-line-locator-outside.json');
  write(path.join(cwd,'unity-games/demo/Assets/Scripts/UnityWebFloorGame.cs'),'class UnityWebFloorGame { int Speed() { return 1; } }\n');
  write(path.join(cwd,'unity-games/demo/Assets/Scripts/Other.cs'),'class Other { int Speed() { return 1; } }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'unity',
    root:'unity-games/demo',
    responsibleFiles:['unity-games/demo/Assets/Scripts/UnityWebFloorGame.cs'],
    taskId:'unity-line-locator-outside'
  }),null,2));
  write(responseFile,JSON.stringify({
    edits:[{
      path:'Assets/Scripts/Other.cs:149',
      find:'return 1;',
      replace:'return 2;'
    }],
    newFiles:[]
  }));
  await assert.rejects(
    runVibe2SourceWorker({cwd,responseFile}),
    /텍스트 worker 허용 확장자 아님|책임 파일 범위 밖 수정 금지/
  );
});


test('token-repeat abort is retryable infrastructure output failure', () => {
  assert.equal(shouldRetryGenerationError(new Error('Ollama 오류: prediction aborted, token repeat limit reached')),true);
});


test('retry prompt keeps only editable context and pins the single responsible path', () => {
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<main id="game">old</main>',
    '',
    '=== FILE scripts/config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.GAME_CONFIG={speed:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{
    error:new Error('책임 파일 범위 밖 수정 금지: scripts/window.GAME_CONFIG.js'),
    responsibleFiles:['index.html']
  });
  assert.match(retry,/The ONLY writable path is "index\.html"/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/scripts\/config\.js/);
  assert.doesNotMatch(retry,/window\.GAME_CONFIG/);
});

test('single responsible file remaps literal allowed-path placeholder without widening scope', async () => {
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'model-placeholder.json');
  write(path.join(cwd,'web-games/demo/index.html'),'<!doctype html><html><body><main>old</main></body></html>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({
    target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'literal-placeholder'
  }),null,2));
  write(responseFile,JSON.stringify({edits:[{path:'exact allowed path',find:'<main>old</main>',replace:'<main>new</main>'}],newFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.deepEqual(result.changedFiles,['index.html']);
});


test('no-op edit gets one focused causal retry', () => {
  const error=new Error('변경 없는 edit: index.html');
  assert.equal(shouldRetryGenerationError(error),true);
  const base=[
    'Allowed edit paths: index.html',
    '',
    '=== FILE index.html [EDITABLE] ===',
    '<button id="play">Play</button>',
    '',
    '=== FILE scripts/config.js [READ-ONLY IMPACT CONTEXT] ===',
    'window.GAME_CONFIG={speed:1};'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(base,{error,responsibleFiles:['index.html']});
  assert.match(retry,/previous edit copied the same text/);
  assert.match(retry,/The ONLY writable path is "index\.html"/);
  assert.match(retry,/replace is materially different from find/);
  assert.match(retry,/=== FILE index\.html \[EDITABLE\] ===/);
  assert.doesNotMatch(retry,/scripts\/config\.js/);
});


test('candidate manifest carries presentation quality contract without expanding authority', async()=>{
  const cwd=tempRoot();
  const responseFile=path.join(cwd,'presentation.json');
  const workOrder=order({responsibleFiles:['unity-games/demo/Assets/Player.cs'],taskId:'presentation-contract'});
  workOrder.presentationQuality={
    required:true,
    version:1,
    pass:'LIVING_MOTION',
    preserve:['GAMEPLAY_BALANCE','SAVE_MEANING','HIT_SEMANTICS'],
    staticChecks:['idle-alive-motion','turn-smoothing'],
    runtimeChecks:['idle-walk-run-or-equivalent-runtime-continuity'],
    authorityExpanded:false
  };
  write(path.join(cwd,'unity-games/demo/Assets/Player.cs'),'class Player { float motionSmoothing = 0.1f; }\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({edits:[{path:'Assets/Player.cs',find:'float motionSmoothing = 0.1f;',replace:'float motionSmoothing = 0.2f;'}],newFiles:[]}));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  const persisted=JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates/presentation-contract/manifest.json'),'utf8'));
  assert.equal(result.presentationQuality.required,true);
  assert.equal(result.presentationQuality.pass,'LIVING_MOTION');
  assert.equal(result.presentationQuality.authorityExpanded,false);
  assert.deepEqual(persisted.presentationQuality.preserve,workOrder.presentationQuality.preserve);
});


test('specialized verification requests are created only for game targets',()=>{
  const system=buildSpecializedVerificationRequest({
    target:'system',
    goal:'narrative world generation route graph story transition',
    responsibleFiles:['tools/vibe2-learning-motor.mjs']
  });
  assert.equal(system.required,false);
  assert.equal(system.gameTargetEligible,false);
  assert.equal(system.blockedReason,'NON_GAME_TARGET');
  assert.deepEqual([...system.requestedMarkers],[]);

  const web=buildSpecializedVerificationRequest({
    target:'web',
    goal:'narrative world generation route graph story transition',
    responsibleFiles:['web-games/demo/game.js']
  });
  assert.equal(web.required,true);
  assert.equal(web.gameTargetEligible,true);
  assert.ok(web.requestedMarkers.includes('VERIFIED_WORLD_ROUTE_NAVIGATION_PASS'));
  assert.ok(web.requestedMarkers.includes('VERIFIED_NARRATIVE_GAMEPLAY_CAUSALITY_PASS'));
});


test('game-specific BUILD_UP directive survives compact generation retries',()=>{
  const directiveBlock=[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=bug-defense-build-up-g3-demo generation=3 primaryFocus=PRESENTATION',
    'gameIdentity=곤충 생태 상성과 서식지 배치가 핵심인 정원 방어',
    'primaryGoal=벌 돌진, 거미 속박, 사마귀 베기의 실루엣과 공격 리듬을 실제 플레이에서 구분한다.',
    'visual=CHARACTER=실루엣 강화 | ENEMY_CREATURE=종별 공격 전조 분리 | ANIMATION=anticipation impact recovery 연결',
    'platform=Roblox 네이티브 Luau와 3D presentation으로 동일 목표를 구현한다.',
    'acceptance=ACTUAL_RENDERED_CHANGE_REQUIRED | GAMEPLAY_STATE_DELTA_REQUIRED',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].join('\n');
  const largeBody=Array.from({length:500},(_,i)=>`local line${i} = ${i}`).join('\n');
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: roblox',
    'Goal: [STUDIO_QUALITY_EVOLUTION] build the current game-specific package',
    directiveBlock,
    'Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    largeBody
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['client/Game.client.luau'],
    attempt:2,
    error:new Error('MODEL_TIMEOUT'),
    sourceRoot:''
  });
  assert.match(retry,/bug-defense-build-up-g3-demo/);
  assert.match(retry,/벌 돌진, 거미 속박, 사마귀 베기/);
  assert.match(retry,/ACTUAL_RENDERED_CHANGE_REQUIRED/);
});


test('game-specific BUILD_UP worker guidance carries detailed verified design into the actual implementation prompt',()=>{
  const designContext={
    uxAccessibilityPlan:{touchAndInput:'하단 우측 공격 버튼과 뒤로가기 버튼의 역할을 분리'},
    narrativeDialoguePlan:{questStates:['퀘스트: 온실 단서 조사 -> 방어 -> 후속 지역 해금']},
    implementationTraceability:[{designElement:'메뉴 버튼 상태',responsibleSystem:'HUD/Menu state',validationEvidence:'버튼 활성/잠금과 실제 상태 일치'}]
  };
  const prompt=buildPrompt({
    target:'roblox',
    gameId:'detail-lineage',
    goal:'상세 설계를 실제 게임 소스에 구현',
    selectedTask:{buildUpDirective:{
      directiveId:'detail-lineage-build-up-g1-test',
      generation:1,
      developmentDepth:1,
      escalationStage:'BUILD_UP',
      primaryFocus:'USABILITY',
      gameIdentityAndNonNegotiables:{identity:'정원 방어 상세 설계'},
      designImplementationContext:designContext,
      thisLoopPrimaryGoal:'메뉴와 퀘스트 상태를 실제 플레이 흐름에 연결',
      primaryGoalReason:'검증된 상세 설계를 구현 책임까지 보존',
      responsibleSystemsAndFiles:{sourceAnchors:[{
        file:'client/Game.client.luau',
        line:10,
        kind:'FUNCTION',
        symbol:'renderMenu',
        currentBehavior:'메뉴 상태가 퀘스트 흐름과 분리됨',
        intendedBehavior:'메뉴 상태와 퀘스트 흐름을 연결함',
        observableAcceptance:'버튼 상태와 온실 퀘스트 진행이 일치함'
      }]},
      effectivenessMeasurement:{expectedPlayerEffect:'모바일에서 메뉴와 목표 흐름을 즉시 이해'},
      nextActionDecision:{action:'CONTINUE_BUILD_UP_CURRENT_SYSTEM'},
      autonomousContentExpansion:{},
      gameplayImplementationDirectives:[],
      progressionContentWorldDirectives:[],
      visualBuildUpDirective:{domains:{}},
      uxInputDirectives:[],
      platformAdaptationDirectives:{ROBLOX:'Roblox 네이티브 입력과 UI 상태에서 구현'},
      preserveConstraints:['GAMEPLAY_BALANCE','SAVE_MEANING'],
      acceptanceEvidence:['REAL_SOURCE_AND_EFFECT_DELTA'],
      nextEscalationCandidates:[]
    }}
  },{
    files:[{path:'client/Game.client.luau',content:'return {}',editable:true}]
  },['client/Game.client.luau']);
  assert.match(prompt,/designContext=/);
  assert.match(prompt,/하단 우측 공격 버튼과 뒤로가기 버튼의 역할을 분리/);
  assert.match(prompt,/온실 단서 조사/);
  assert.match(prompt,/메뉴 버튼 상태/);

  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/sourceAnchors=.*CURRENT=/);
  assert.match(source,/INTENDED=/);
  assert.match(source,/ACCEPT=/);
  assert.match(source,/expectedPlayerEffect=/);
  assert.match(source,/previousEffectiveness=/);
  assert.match(source,/nextVibeAction=/);
  assert.match(source,/designContext=/);
  assert.match(source,/'designContext='/);
  assert.match(source,/contentExpansionVersion=/);
  assert.match(source,/contentTheme=/);
  assert.match(source,/contentBreadth=/);
  assert.match(source,/existingCompletenessReview=/);
  assert.match(source,/contentBundle=/);
  assert.match(source,/antiClone=/);
  assert.match(source,/continuity=/);
  assert.match(source,/derivedRuleEvolution=/);
  assert.match(source,/contentCompletionAcceptance=/);
  assert.match(source,/FORTNITE_UEFN/);
});

test('focused replace-only compacts build-up directive without losing exact goal evidence',()=>{
  const noisyGameplay='gameplay='+Array.from({length:180},(_,i)=>`system-${i}=detail-${i}`).join(' | ');
  const directive=[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=demo-g7 generation=7 developmentDepth=4 escalationStage=BUILD_UP primaryFocus=PRESENTATION',
    'gameIdentity=정원 방어 전투',
    'designContext='+JSON.stringify({uxAccessibilityPlan:{touchAndInput:'하단 우측 공격 버튼과 뒤로가기 버튼의 역할을 분리'},narrativeDialoguePlan:{questStates:['온실 단서 조사 후 방어하고 후속 지역 해금']}}),
    'primaryGoal=벌 돌진 전조를 실제 렌더에서 더 분명하게 만든다.',
    'sourceAnchors=Assets/Scripts/Player.cs:12 SYMBOL Render CURRENT=weak INTENDED=clear ACCEPT=visible',
    'expectedPlayerEffect=공격 전조를 즉시 구분',
    'nextVibeAction=CONTINUE_BUILD_UP_CURRENT_SYSTEM',
    'contentExpansionVersion=2 executionBoundary=EXISTING_BUILD_UP_ONLY decisionOwner=VIBE',
    'contentTheme=WORLD_ECOLOGY_STORY_CHAIN themeDepth=1 mode=AUTONOMOUS_CONTENT_BUILD_UP',
    'contentBreadth=covered:2/7 missing:ENEMY_BOSS_COMBAT_ECOLOGY,QUEST_STORY_PROGRESSION_CHAIN leastCovered:ITEM_EQUIPMENT_CRAFT_SYSTEM_CHAIN',
    'existingCompletenessReview=requiredEveryBuildUp:true weakExistingMayPreempt:true mode:CHECK_EXISTING_AND_EXPAND_OR_IMPROVE_WHICHEVER_HAS_HIGHER_PLAYER_VALUE dimensions:CORE_LOOP_COMPLETENESS,QUEST_AND_GOAL_FLOW,WORLD_AND_REGION_FLOW,MONSTER_ENEMY_ROLE_COVERAGE,ITEM_EQUIPMENT_REWARD_PURPOSE,STORY_WORLD_CAUSALITY,GAMEPLAY_RULE_CONNECTIONS',
    'contentBundle=BACKGROUND_ENVIRONMENT_IDENTITY | REGION_NATIVE_ENCOUNTER | REGION_RESOURCE_OR_ITEM | QUEST_EVENT_REASON_TO_ENTER | STORY_AND_WORLD_CAUSALITY | REGION_RULE_OR_HAZARD',
    'antiClone=NAME_COLOR_STAT_ONLY_CLONE_FORBIDDEN minimumDistinctAxes=2 axes=ROLE,BEHAVIOR,PLAYER_DECISION,WORLD_REASON,SYSTEM_CONNECTION',
    'continuity=required:true preserveIdentity:true preserveProgression:true questions:WHY_DOES_THIS_EXIST_IN_THIS_GAME,WHAT_PLAYER_DECISION_DOES_IT_CHANGE',
    'derivedRuleEvolution=MAY_ADD_DERIVED_GAMEPLAY_INTERACTION_RULES_WHEN_CONSISTENT',
    'contentCompletionAcceptance=REAL_GAME_SOURCE_DELTA_REQUIRED | PLAYER_FACING_OR_GAMEPLAY_SYSTEM_EFFECT_REQUIRED | DISTINCT_FROM_EXISTING_CONTENT_BY_MEANING_NOT_ONLY_NAME_OR_STATS | CONNECTED_TO_EXISTING_GAME_FLOW | CONTINUITY_AND_CAUSALITY_PRESERVED',
    'contentRule=Stay inside existing BUILD_UP and implement connected player-facing source changes.',
    noisyGameplay,
    'progressionWorld='+('world-detail '.repeat(220)),
    'visual=ANIMATION=anticipation impact recovery',
    'platform=Unity 네이티브 렌더 책임에서 구현',
    'preserve=GAMEPLAY_BALANCE | SAVE_MEANING',
    'acceptance=ACTUAL_RENDERED_CHANGE_REQUIRED',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].join('\n');
  const prompt=[
    'Engine: unity',
    'Goal: improve visible attack anticipation',
    directive,
    'Allowed edit paths: Assets/Scripts/Player.cs',
    '=== FILE Assets/Scripts/Player.cs [EDITABLE] ===',
    'class Player { int Speed() { return 1; } }'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('MODEL_TIMEOUT'),
    responsibleFiles:['Assets/Scripts/Player.cs']
  });
  assert.ok(focused);
  assert.match(focused.prompt,/directiveId=demo-g7/);
  assert.match(focused.prompt,/primaryGoal=벌 돌진 전조/);
  assert.match(focused.prompt,/designContext=/);
  assert.match(focused.prompt,/하단 우측 공격 버튼과 뒤로가기 버튼의 역할을 분리/);
  assert.match(focused.prompt,/sourceAnchors=Assets\/Scripts\/Player\.cs/);
  assert.match(focused.prompt,/expectedPlayerEffect=공격 전조를 즉시 구분/);
  assert.match(focused.prompt,/ACTUAL_RENDERED_CHANGE_REQUIRED/);
  assert.match(focused.prompt,/contentExpansionVersion=2/);
  assert.match(focused.prompt,/contentTheme=WORLD_ECOLOGY_STORY_CHAIN/);
  assert.match(focused.prompt,/contentBreadth=covered:2\/7/);
  assert.match(focused.prompt,/existingCompletenessReview=requiredEveryBuildUp:true/);
  assert.match(focused.prompt,/weakExistingMayPreempt:true/);
  assert.match(focused.prompt,/REGION_RESOURCE_OR_ITEM/);
  assert.match(focused.prompt,/NAME_COLOR_STAT_ONLY_CLONE_FORBIDDEN/);
  assert.match(focused.prompt,/continuity=required:true/);
  assert.match(focused.prompt,/derivedRuleEvolution=/);
  assert.match(focused.prompt,/contentCompletionAcceptance=REAL_GAME_SOURCE_DELTA_REQUIRED/);
  assert.match(focused.prompt,/contentRule=Stay inside existing BUILD_UP/);
  assert.doesNotMatch(focused.prompt,/system-179=detail-179/);
  assert.doesNotMatch(focused.prompt,/world-detail world-detail world-detail/);
  assert.ok(Buffer.byteLength(focused.prompt,'utf8')<Buffer.byteLength(prompt,'utf8'));
});

test('asset-development Roblox graphics stays on bounded focused retries while game-primary keeps existing escalation',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/const assetDevelopmentLane=clean\(process\.env\.VIBE2_EXECUTION_LANE\)\.toLowerCase\(\)==='asset-development'/);
  assert.match(source,/ASSET_DEVELOPMENT_ROBLOX_MAX_GENERATION_ATTEMPTS=3/);
  assert.match(source,/ASSET_DEVELOPMENT_ROBLOX_FOCUSED_TIMEOUT_MS=120000/);
  assert.match(source,/ASSET_DEVELOPMENT_ROBLOX_FOCUSED_MAX_PREDICT=768/);
  assert.match(source,/ASSET_DEVELOPMENT_ROBLOX_FOCUSED_CONTEXT_WINDOW=STANDARD_GAME_SOURCE_CONTEXT_WINDOW/);
  assert.match(source,/robloxTimeoutFocusedRecoveryNeedsPackage=robloxAssetAdaptationTask[\s\S]*?&&!assetDevelopmentLane/);
  assert.match(source,/robloxFullGraphicsPackageRecovery=robloxAssetAdaptationTask[\s\S]*?&&!assetDevelopmentLane/);
  assert.match(source,/const assetDevelopmentFocusedGraphics=assetDevelopmentLane&&robloxAssetAdaptationTask/);
  assert.match(source,/assetDevelopmentFocusedGraphics\|\|attempt>=3/);
  assert.match(source,/VIBE2_ROBLOX_TIMEOUT_RECOVERY_ESCALATE_FULL_GRAPHICS/);
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workflow,/coding-roblox-zero-timeout-focused-recovery:YES/);
  assert.match(workflow,/coding-roblox-timeout-recovery-escalated-full-graphics:YES/);
});

test('Roblox game workers smoke-check Luau binaries but leave the full compiler regression suite to Core QA',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  const candidateStart=workflow.indexOf('- name: Generate isolated candidate from pinned main contract');
  const candidateEnd=workflow.indexOf('\n      - name:',candidateStart+1);
  assert.ok(candidateStart>=0&&candidateEnd>candidateStart);
  const candidate=workflow.slice(candidateStart,candidateEnd);
  assert.match(candidate,/VIBE2_LUAU_COMPILER_SMOKE=PASS/);
  assert.match(candidate,/VIBE2_LUAU_REGRESSION_AUTHORITY=CORE_QA_ONLY/);
  assert.match(candidate,/luau-compile/);
  assert.match(candidate,/luau-ast/);
  assert.doesNotMatch(candidate,/VIBE2_TEST_LUAU_COMPILER/);
  assert.doesNotMatch(candidate,/--test-name-pattern='Luau compiler'/);
});

test('candidate source-generation workflow block stays valid Bash',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  const candidateStart=workflow.indexOf('- name: Generate isolated candidate from pinned main contract');
  const candidateEnd=workflow.indexOf('\n      - name:',candidateStart+1);
  assert.ok(candidateStart>=0&&candidateEnd>candidateStart);
  const candidate=workflow.slice(candidateStart,candidateEnd);
  const runMarker='        run: |\n';
  const runAt=candidate.indexOf(runMarker);
  assert.ok(runAt>=0);
  const shell=candidate.slice(runAt+runMarker.length)
    .split('\n')
    .map(line=>line.startsWith('          ')?line.slice(10):line)
    .join('\n')
    .replace(/\$\{\{[^\n]*?\}\}/g,'CI_EXPR');
  assert.doesNotThrow(()=>execFileSync('bash',['-n'],{input:shell,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
  assert.ok(candidate.includes("printf '%s\\n' 'local value = 1' 'return value + 1' > \"$luau_dir/smoke.luau\""));
});

test('worker model runtime is prepared once and downstream source or practice steps do not restart or repull it',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  const workerStart=workflow.indexOf('\n  worker:\n');
  const fanInStart=workflow.indexOf('\n  fan_in:\n',workerStart);
  assert.ok(workerStart>=0&&fanInStart>workerStart);
  const worker=workflow.slice(workerStart,fanInStart);
  assert.match(worker,/Prepare cached Ollama runtime/);
  assert.match(worker,/VIBE2_PRACTICE_OLLAMA_RUNTIME=PREPARED_ONCE/);
  assert.match(worker,/VIBE2_LOCAL_MODEL_SOURCE=PREPARED_ONCE/);
  assert.doesNotMatch(worker,/nohup ollama serve/);
  assert.doesNotMatch(worker,/ollama pull "\$VIBE2_LOCAL_MODEL"/);
});

test('failed source generation still performs post-work shared-context SHA validation before exiting the candidate step',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  const candidateStart=workflow.indexOf('- name: Generate isolated candidate from pinned main contract');
  const candidateEnd=workflow.indexOf('\n      - name:',candidateStart+1);
  assert.ok(candidateStart>=0&&candidateEnd>candidateStart);
  const candidate=workflow.slice(candidateStart,candidateEnd);
  const before='verify_candidate_shared_context_sha BEFORE "/tmp/vibe2-shared-context-${SAFE_TASK}-${VARIANT}-before.json"';
  const after='verify_candidate_shared_context_sha AFTER "/tmp/vibe2-shared-context-${SAFE_TASK}-${VARIANT}-after.json"';
  const failureExit='if [ "$worker_rc" -ne 0 ]; then exit "$worker_rc"; fi';
  const beforeAt=candidate.indexOf(before);
  const afterAt=candidate.indexOf(after);
  const exitAt=candidate.indexOf(failureExit);
  assert.ok(beforeAt>=0&&afterAt>beforeAt&&exitAt>afterAt);
  assert.match(candidate,/verificationMode:'PINNED_SHA_ONLY'/);
  assert.match(candidate,/sha256sum company-learning\/platform-release-roadmap\.json/);
  assert.match(candidate,/VIBE2_CANDIDATE_SHARED_CONTEXT_SHA_ONLY=\$phase/);
  assert.doesNotMatch(candidate,/node tools\/company-shared-context\.mjs/);
  assert.doesNotMatch(candidate,/--pinned-hash-verify=true/);
});

test('focused replace Ollama requests keep canonical budget and enforce one-key schema',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/JSON_FOCUSED_REPLACE_TIMEOUT_MS=DEFAULT_TIMEOUT_MS/);
  assert.match(source,/JSON_FOCUSED_REPLACE_MAX_PREDICT=384/);
  assert.match(source,/STANDARD_GAME_SOURCE_CONTEXT_WINDOW=32768/);
  assert.match(source,/ASSET_DEVELOPMENT_ROBLOX_FOCUSED_CONTEXT_WINDOW=STANDARD_GAME_SOURCE_CONTEXT_WINDOW/);
  assert.match(source,/JSON_FOCUSED_REPLACE_CONTEXT_WINDOW=STANDARD_GAME_SOURCE_CONTEXT_WINDOW/);
  assert.match(source,/focusedReplaceOnly&&!systemAtomicPairCompletion[\s\S]*?focusedReplaceTimeoutMs/);
  assert.match(source,/focusedReplaceOnly&&!systemAtomicPairCompletion[\s\S]*?JSON_FOCUSED_REPLACE_CONTEXT_WINDOW/);
  assert.ok(source.includes("focusedReplaceOnly?0.08"));
  assert.ok(source.includes("completionMode==='JSON_REPLACE_ONLY'?{type:'object',properties:{replace:{type:'string'}},required:['replace'],additionalProperties:false}"));
  assert.ok(source.includes("completionMode==='JSON_SINGLE_MOTION'?singleMotionResponseSchema():(/^JSON_/.test(completionMode)?'json':null)"));
  assert.ok(source.includes("...(format?{format}:{}),options"));
  assert.ok(source.includes("VIBE2_FOCUSED_REPLACE_SCHEMA=ONE_KEY_REPLACE"));
});


test('graphics replacement report grounds every actual replacement in changed source',()=>{
  const contract={
    required:true,
    adaptiveCount:{minimumActual:1,maximumActual:60},
    surfaces:['BACKGROUND','VFX','MOTION','MENU','HUD'],
    reuseModes:[
      'DIRECT_REUSE_WHEN_ALREADY_CONCEPT_MATCHED',
      'ADAPT_RESTYLE_AND_RETARGET',
      'TRANSFORMATIVE_RECOMBINATION_FROM_MULTIPLE_COMPATIBLE_REFERENCES',
      'NEW_PROJECT_SPECIFIC_EXPRESSION_WHEN_REUSE_WOULD_BE_WEAKER'
    ],
    beforeAfterEvidenceRequired:true,
    perReplacementSourceEvidenceRequired:true,
    actualReplacementCountMustEqualGroundedEvidenceCount:true,
    replacementEvidenceMustReferenceTouchedSourcePath:true,
    replacementEvidenceSnippetMustExistInChangedSource:true,
    duplicateReplacementEvidenceCannotInflateCount:true,
    selfReportedCountWithoutGroundedSourceEvidenceCannotPass:true
  };
  const path='client/Game.client.luau';
  const changed=[
    'local impactVfx = createImpactVfx()',
    'weapon.CFrame = weapon.CFrame * motionOffset',
    'menuFrame.BackgroundColor3 = theme.PanelColor'
  ].join('\n');
  const validCandidate={
    edits:[{path,find:'local oldVisual = true',replace:changed}],
    graphicsReplacementReport:{
      actualCount:3,
      changedSurfaces:['VFX','MOTION','MENU'],
      reuseModesUsed:['ADAPT_RESTYLE_AND_RETARGET','TRANSFORMATIVE_RECOMBINATION_FROM_MULTIPLE_COMPATIBLE_REFERENCES'],
      replacementEvidence:[
        {surface:'VFX',path,bindingKey:'impactVfx',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'local impactVfx = createImpactVfx()'},
        {surface:'MOTION',path,bindingKey:'weapon.CFrame',reuseMode:'TRANSFORMATIVE_RECOMBINATION_FROM_MULTIPLE_COMPATIBLE_REFERENCES',sourceEvidence:'weapon.CFrame = weapon.CFrame * motionOffset'},
        {surface:'MENU',path,bindingKey:'menuFrame.BackgroundColor3',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'menuFrame.BackgroundColor3 = theme.PanelColor'}
      ],
      before:'공격 이펙트와 메뉴가 임시 표현이었다.',
      after:'공격 이펙트·모션·메뉴를 같은 컨셉 언어로 실제 교체했다.'
    }
  };
  const valid=evaluateGraphicsReplacementReport({candidate:validCandidate,contract});
  assert.equal(valid.pass,true);
  assert.equal(valid.report.actualCount,3);
  assert.equal(valid.groundedCount,3);

  assert.equal(evaluateGraphicsReplacementReport({candidate:{graphicsReplacementReport:{actualCount:0,changedSurfaces:['VFX'],reuseModesUsed:['ADAPT_RESTYLE_AND_RETARGET'],before:'a',after:'b'}},contract}).reason,'GRAPHICS_REPLACEMENT_COUNT_OUT_OF_RANGE');
  assert.equal(evaluateGraphicsReplacementReport({candidate:{graphicsReplacementReport:{actualCount:61,changedSurfaces:['VFX'],reuseModesUsed:['ADAPT_RESTYLE_AND_RETARGET'],before:'a',after:'b'}},contract}).reason,'GRAPHICS_REPLACEMENT_EVIDENCE_MISSING');
  assert.equal(evaluateGraphicsReplacementReport({candidate:{graphicsReplacementReport:{actualCount:3,changedSurfaces:[],reuseModesUsed:['ADAPT_RESTYLE_AND_RETARGET'],before:'a',after:'b'}},contract}).reason,'GRAPHICS_REPLACEMENT_SURFACES_MISSING');
  assert.match(evaluateGraphicsReplacementReport({candidate:{graphicsReplacementReport:{actualCount:3,changedSurfaces:['VFX'],reuseModesUsed:['RAW_COPY'],before:'a',after:'b'}},contract}).reason,/GRAPHICS_REPLACEMENT_REUSE_MODE_INVALID/);
  assert.equal(evaluateGraphicsReplacementReport({candidate:{graphicsReplacementReport:{actualCount:3,changedSurfaces:['VFX'],reuseModesUsed:['ADAPT_RESTYLE_AND_RETARGET'],before:'',after:'b'}},contract}).reason,'GRAPHICS_REPLACEMENT_BEFORE_AFTER_MISSING');

  const missingEvidence=structuredClone(validCandidate);
  missingEvidence.graphicsReplacementReport.replacementEvidence=[];
  assert.equal(evaluateGraphicsReplacementReport({candidate:missingEvidence,contract}).reason,'GRAPHICS_REPLACEMENT_EVIDENCE_MISSING');

  const countMismatch=structuredClone(validCandidate);
  countMismatch.graphicsReplacementReport.actualCount=2;
  assert.equal(evaluateGraphicsReplacementReport({candidate:countMismatch,contract}).reason,'GRAPHICS_REPLACEMENT_COUNT_EVIDENCE_MISMATCH');

  const untouched=structuredClone(validCandidate);
  untouched.graphicsReplacementReport.actualCount=1;
  untouched.graphicsReplacementReport.changedSurfaces=['VFX'];
  untouched.graphicsReplacementReport.reuseModesUsed=['ADAPT_RESTYLE_AND_RETARGET'];
  untouched.graphicsReplacementReport.replacementEvidence=[{surface:'VFX',path:'client/Other.client.luau',bindingKey:'impactVfx',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'local impactVfx = createImpactVfx()'}];
  assert.match(evaluateGraphicsReplacementReport({candidate:untouched,contract}).reason,/PATH_NOT_TOUCHED/);

  const inventedSnippet=structuredClone(validCandidate);
  inventedSnippet.graphicsReplacementReport.actualCount=1;
  inventedSnippet.graphicsReplacementReport.changedSurfaces=['VFX'];
  inventedSnippet.graphicsReplacementReport.reuseModesUsed=['ADAPT_RESTYLE_AND_RETARGET'];
  inventedSnippet.graphicsReplacementReport.replacementEvidence=[{surface:'VFX',path,bindingKey:'inventedVfx',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'local inventedVfx = createInventedVfx()'}];
  assert.match(evaluateGraphicsReplacementReport({candidate:inventedSnippet,contract}).reason,/SOURCE_EVIDENCE_NOT_IN_CHANGED_SOURCE/);

  const duplicate=structuredClone(validCandidate);
  duplicate.graphicsReplacementReport.actualCount=2;
  duplicate.graphicsReplacementReport.changedSurfaces=['VFX'];
  duplicate.graphicsReplacementReport.reuseModesUsed=['ADAPT_RESTYLE_AND_RETARGET'];
  duplicate.graphicsReplacementReport.replacementEvidence=[
    {surface:'VFX',path,bindingKey:'impactVfx',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'local impactVfx = createImpactVfx()'},
    {surface:'VFX',path,bindingKey:'impactVfx',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'local impactVfx = createImpactVfx()'}
  ];
  assert.equal(evaluateGraphicsReplacementReport({candidate:duplicate,contract}).reason,'GRAPHICS_REPLACEMENT_EVIDENCE_DUPLICATE');

  const commentOnly=structuredClone(validCandidate);
  commentOnly.edits[0].replace='-- impactVfx marker only';
  commentOnly.graphicsReplacementReport.actualCount=1;
  commentOnly.graphicsReplacementReport.changedSurfaces=['VFX'];
  commentOnly.graphicsReplacementReport.reuseModesUsed=['ADAPT_RESTYLE_AND_RETARGET'];
  commentOnly.graphicsReplacementReport.replacementEvidence=[{surface:'VFX',path,bindingKey:'impactVfx',reuseMode:'ADAPT_RESTYLE_AND_RETARGET',sourceEvidence:'-- impactVfx marker only'}];
  assert.match(evaluateGraphicsReplacementReport({candidate:commentOnly,contract}).reason,/SOURCE_EVIDENCE_NOT_EXECUTABLE/);

  const cssCandidate={
    edits:[{path:'style.css',find:'#menu { background: #111; }',replace:'#menu { background: linear-gradient(#18243a,#0d1422); }'}],
    graphicsReplacementReport:{
      actualCount:1,
      changedSurfaces:['MENU'],
      reuseModesUsed:['ADAPT_RESTYLE_AND_RETARGET'],
      replacementEvidence:[{
        surface:'MENU',
        path:'style.css',
        bindingKey:'#menu',
        reuseMode:'ADAPT_RESTYLE_AND_RETARGET',
        sourceEvidence:'#menu { background: linear-gradient(#18243a,#0d1422); }'
      }],
      before:'flat menu',
      after:'game-specific layered menu'
    }
  };
  assert.equal(evaluateGraphicsReplacementReport({candidate:cssCandidate,contract}).pass,true);
});

test('adaptive graphics replacement report failure is retriable and classified separately',()=>{
  const error=new Error('GRAPHICS_REPLACEMENT_REPORT_REQUIRED:GRAPHICS_REPLACEMENT_REPORT_MISSING');
  assert.equal(generationFailureClass(error),'GRAPHICS_REPLACEMENT_REPORT');
  assert.equal(shouldRetryGenerationError(error),true);
});


test('verified APK learning preserves game-source and QA-only dispositions through source generation',()=>{
  const gamePrinciple='id=persistent-contextual-action-controls;scope=mobile-interaction-observation;lesson=keep contextual controls visible;apply=keep controls beside play';
  const qaPrinciple='id=semantic-gameplay-input-plus-survival;scope=qa-evidence;lesson=validate runtime;apply=check process survival';
  const rows=[
    {id:'external-black-box-a-run-1',verified:true,authority:'verified-task-playbook',distilledApplicationPrinciples:[gamePrinciple],distilledAvoidancePrinciples:['A-no-clone']},
    {id:'external-black-box-b-run-2',verified:true,authority:'verified-task-playbook',distilledApplicationPrinciples:[qaPrinciple],distilledAvoidancePrinciples:['B-no-hidden-inference']}
  ];
  const order={
    target:'web',selectedTask:{gameId:'demo'},department:'development',goal:'실제 게임 기능 개발',qa:[],
    knowledgeApplicationContract:{
      mandatoryForGameTarget:true,
      verifiedExternalLearningIds:rows.map(row=>row.id),
      verifiedExternalLearningRetrievedCount:2,
      retrievedVerifiedExternalLearningTruncationForbidden:true,
      allRetrievedPrinciplesHaveExplicitDisposition:true,
      verifiedExternalLearningDispositions:[
        {id:'persistent-contextual-action-controls',disposition:'APPLIED_GAME_SOURCE'},
        {id:'semantic-gameplay-input-plus-survival',disposition:'VALIDATION_ONLY'}
      ]
    },
    unifiedLearning:{playbookReuse:rows}
  };
  const contract=buildVerifiedExternalLearningPromptContract(order);
  assert.equal(contract.count,2);
  assert.equal(contract.sourcePrincipleCount,1);
  assert.match(contract.block,/APPLY=id=persistent-contextual-action-controls/);
  assert.doesNotMatch(contract.block,/APPLY=id=semantic-gameplay-input-plus-survival/);
  assert.match(contract.block,/DISPOSITION=semantic-gameplay-input-plus-survival:VALIDATION_ONLY/);
  assert.match(contract.block,/sourcePromptScope=ALL_DISPOSED_APPLICATION_PRINCIPLES/);
  assert.doesNotMatch(contract.block,/\nAVOID=/);
  assert.doesNotMatch(contract.block,/\nALLOWED=/);
  assert.doesNotMatch(contract.block,/\nFORBIDDEN=/);
  const context={files:[{path:'index.html',content:'<button id="play">Play</button>',editable:true,truncated:false}],bytes:38};
  const initial=buildPrompt(order,context,['index.html'],{verifiedExternalLearningContract:contract});
  assert.equal(verifiedExternalLearningBlockFromPrompt(initial),contract.block);
  // 최초 요청에서도 분류 전 원문을 중복 주입하지 않고 검증된 계약만 한 번 전달한다.
  const learning={kind:'vibe2-unified-learning-context',playbookReuse:rows,
    experience:[{id:'local-save',reusablePatterns:['preserve-existing-save']} ]};
  const rawGoal='실제 게임 기능 개발\n\n'+learningGuidance(learning)+'\n\nOWNER: keep all save keys';
  const withLearning=buildPrompt({...order,goal:rawGoal,unifiedLearning:learning},context,['index.html']);
  assert.equal(withLearning.split(gamePrinciple).length-1,1);
  assert.ok(!withLearning.includes(qaPrinciple));
  assert.match(withLearning,/DISPOSITION=semantic-gameplay-input-plus-survival:VALIDATION_ONLY/);
  assert.match(withLearning,/preserve-existing-save/);
  assert.match(withLearning,/OWNER: keep all save keys/);
  assert.match(withLearning,/verified-commercial-app-reuse=external-black-box-a-run-1/);
  assert.equal(verifiedExternalLearningBlockFromPrompt(withLearning),contract.block);
  assert.equal(withLearning.split('A-no-clone').length-1,0);
  assert.equal(rows[0].distilledAvoidancePrinciples.includes('A-no-clone'),true);
  assert.match(withLearning,/nonSourceAvoidanceAndUsePolicy=RETAINED_IN_VERIFIED_MEMORY_AND_QA/);
  assert.equal(rawGoal.includes(qaPrinciple),true);
  const customGoal=rawGoal.replace('Studio-local 또는 캐시된 로컬 증거는 cloud production runtime PASS를 대신하지 않는다.','사용자 수정 학습 지시');
  const custom=buildPrompt({...order,goal:customGoal,unifiedLearning:learning},context,['index.html']);
  assert.ok(custom.includes(customGoal),'정확히 일치하지 않는 사용자 지시는 삭제하지 않는다');

  const retry=buildGenerationRetryPrompt(initial,{error:new Error('timeout'),responsibleFiles:['index.html'],attempt:2});
  assert.equal(verifiedExternalLearningBlockFromPrompt(retry),contract.block);
  const focused=buildFocusedReplaceOnlyPrompt(initial,{error:new Error('timeout'),responsibleFiles:['index.html']});
  assert.ok(focused);
  assert.equal(verifiedExternalLearningBlockFromPrompt(focused.prompt),contract.block);
  const expansion=buildFullWebExpansionPrompt(initial,{content:'<!doctype html><html><body><main id="game"></main></body></html>'},{stage:1,minBytes:9000,maxBytes:18000});
  assert.equal(verifiedExternalLearningBlockFromPrompt(expansion),contract.block);
  assert.throws(()=>buildVerifiedExternalLearningPromptContract({...order,unifiedLearning:{playbookReuse:[rows[0]]}}),/ROW_MISSING:external-black-box-b-run-2/);
  assert.throws(()=>buildVerifiedExternalLearningPromptContract({...order,knowledgeApplicationContract:{...order.knowledgeApplicationContract,verifiedExternalLearningDispositions:[]}}),/DISPOSITION_DRIFT/);
});

test('oversized stale learning guidance is deduplicated without truncating the verified contract',()=>{
  const principle='id=persistent-contextual-action-controls;scope=mobile-interaction-observation;lesson=keep contextual controls visible;apply=keep controls beside play';
  const row={id:'external-black-box-a-run-1',verified:true,authority:'verified-task-playbook',distilledApplicationPrinciples:[principle],distilledAvoidancePrinciples:['no-clone']};
  const order={
    target:'unity',selectedTask:{gameId:'demo'},department:'development',qa:[],
    knowledgeApplicationContract:{
      mandatoryForGameTarget:true,
      verifiedExternalLearningIds:[row.id],
      verifiedExternalLearningRetrievedCount:1,
      retrievedVerifiedExternalLearningTruncationForbidden:true,
      allRetrievedPrinciplesHaveExplicitDisposition:true,
      verifiedExternalLearningDispositions:[{id:'persistent-contextual-action-controls',disposition:'APPLIED_GAME_SOURCE'}]
    },
    unifiedLearning:{playbookReuse:[row]},
    goal:[
      '실제 Unity 모바일 입력을 개선한다.',
      '[VIBE VERIFIED LEARNING MOTOR]',
      ('- stale-compiled-commercial-principle='+principle+'\n').repeat(900),
      '[STUDIO_QUALITY_EVOLUTION] cycle=1; phase=BUILD_UP; focus=USABILITY'
    ].join('\n')
  };
  const contract=buildVerifiedExternalLearningPromptContract(order);
  const context={files:[{path:'Assets/Scripts/Game.cs',content:'class Game {}',editable:true,truncated:false}],bytes:13};
  const prompt=buildPrompt(order,context,['Assets/Scripts/Game.cs'],{verifiedExternalLearningContract:contract});
  assert.equal(verifiedExternalLearningBlockFromPrompt(prompt),contract.block);
  assert.equal(prompt.split(principle).length-1,1);
  assert.doesNotMatch(prompt,/stale-compiled-commercial-principle/);
  assert.match(prompt,/\[STUDIO_QUALITY_EVOLUTION\]/);
  assert.ok(Buffer.byteLength(prompt,'utf8')<12000);
});

test('Studio initial prompt compacts repeated directive prose within the base model context',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/studioInitial\?1500:\(oversizedInitial\?3500:5000\)/);
  assert.doesNotMatch(source,/studioInitial\?2500/);
  const external=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions=1/1; sourcePrinciples=1; validationOnly=0; truncation=FORBIDDEN',
    '[EXTERNAL_LEARNING source-a]',
    'DISPOSITION=mobile-controls:APPLIED_GAME_SOURCE;GAME=demo;TARGET=UNITY;DOMAINS=MOBILE_INPUT',
    'APPLY=id=mobile-controls;lesson='+('touch feedback '.repeat(1200)),
    '[END_EXTERNAL_LEARNING source-a]',
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  const long='connected usability detail '.repeat(1200);
  const directive=[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=demo-g1 generation=1 primaryFocus=USABILITY',
    'gameIdentity=demo defense',
    'primaryGoal=make the next mobile action clear',
    'implementationUnit='+long,
    ...Array.from({length:8},(_,index)=>`sourceAnchors=Assets/Scripts/Game.cs:${index+1} METHOD Step${index} CURRENT=old INTENDED=${long} ACCEPT=visible feedback`),
    'contentBundle='+long,
    'gameplay='+long,
    'uxInput='+long,
    'preserve=save keys and gameplay values',
    'acceptance=three connected source deltas',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].join('\n');
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: improve mobile usability',
    external,
    '[STUDIO QUALITY EVOLUTION]',
    directive,
    'Allowed edit paths: Assets/Scripts/Game.cs',
    '=== FILE Assets/Scripts/Game.cs [EDITABLE] ===',
    ('void Step() { HandleTouch(); }\n').repeat(800)
  ].join('\n');
  const initial=buildGenerationRetryPrompt(prompt,{responsibleFiles:['Assets/Scripts/Game.cs'],attempt:1,studioInitial:true});
  const compactLearning=verifiedExternalLearningBlockFromPrompt(initial);
  assert.match(compactLearning,/\[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN\]/);
  assert.match(compactLearning,/\[EXTERNAL_LEARNING source-a\]/);
  assert.match(compactLearning,/DISPOSITION=mobile-controls:APPLIED_GAME_SOURCE/);
  assert.match(compactLearning,/APPLY=id=mobile-controls;lesson=/);
  assert.match(compactLearning,/\[COMPACTED_DUPLICATE_DETAIL\]/);
  assert.match(compactLearning,/\[END_EXTERNAL_LEARNING source-a\]/);
  assert.match(compactLearning,/\[VERIFIED EXTERNAL BLACK-BOX LEARNING END\]/);
  assert.ok(Buffer.byteLength(compactLearning,'utf8')<Buffer.byteLength(external,'utf8'));
  assert.equal((initial.match(/^sourceAnchors=/gm)||[]).length,3);
  assert.ok(Buffer.byteLength(initial,'utf8')<50000);
  assert.equal(sourcePromptContextWindow(initial,{baseContextWindow:16384,maxPredict:3072}),16384);
});

test('zero-output focused retry compacts oversized goal into the canonical 8K context budget',()=>{
  const cwd=tempRoot();
  const relative='index.html';
  write(path.join(cwd,relative),[
    '<main id="game"></main>',
    '<script>',
    'function draw(){ state.frames += 1; }',
    '</script>'
  ].join('\n')+'\n');
  const prompt=[
    'Engine: web',
    'Goal: '+('preserve existing gameplay while improving the exact visible responsibility '.repeat(4000)),
    'Allowed edit paths: '+relative,
    '=== FILE '+relative+' [EDITABLE] ===',
    fs.readFileSync(path.join(cwd,relative),'utf8')
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 첫 출력 시간 초과: 120000ms'),
    responsibleFiles:[relative],
    sourceRoot:cwd
  });
  assert.ok(focused);
  assert.ok(Buffer.byteLength(focused.prompt,'utf8')<20000);
  assert.equal(sourcePromptContextWindow(focused.prompt,{baseContextWindow:8192,maxPredict:384}),8192);
  assert.match(focused.prompt,/^Goal: /m);
  assert.match(focused.prompt,/COMPACTED_DUPLICATE_DETAIL/);
});

test('fan-in accepts only proven model-prompt or deterministic APK learning application',()=>{
  const workflowSource=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workflowSource,/verified-external-learning-source-prompt-unproven/);
  assert.match(workflowSource,/const deterministicLearningProof=/);
  assert.match(workflowSource,/const sourcePromptLearningOk=!sourcePromptLearningRequired\|\|promptLearningProof\|\|deterministicLearningProof/);
  assert.match(workflowSource,/const effectiveCandidateOk=candidateOk&&sourcePromptLearningOk/);
  assert.match(workflowSource,/actualSourcePromptVerified:promptLearningProof/);
  assert.match(workflowSource,/actualSourceGenerationLearningMode:deterministicLearningProof\?'DETERMINISTIC_CONTRACT'/);
});


test('runtime model-call gate rejects missing APK disposition or source principle',()=>{
  const contract={required:true,ids:['external-black-box-a','external-black-box-b']};
  const prompt=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions=2/2; sourcePrinciples=1; validationOnly=1; truncation=FORBIDDEN',
    '[EXTERNAL_LEARNING external-black-box-a]',
    'DISPOSITION=persistent-contextual-action-controls:APPLIED_GAME_SOURCE;GAME=demo;TARGET=WEB;DOMAINS=PLAYER_INPUT_AND_TOUCH',
    'APPLY=id=persistent-contextual-action-controls',
    '[END_EXTERNAL_LEARNING external-black-box-a]',
    '[EXTERNAL_LEARNING external-black-box-b]',
    'DISPOSITION=semantic-gameplay-input-plus-survival:VALIDATION_ONLY;GAME=demo;TARGET=WEB;DOMAINS=NONE',
    '[END_EXTERNAL_LEARNING external-black-box-b]',
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  assert.equal(assertVerifiedExternalLearningPromptCoverage(prompt,contract).count,2);
  assert.throws(()=>assertVerifiedExternalLearningPromptCoverage(prompt.replace('[EXTERNAL_LEARNING external-black-box-b]','[EXTERNAL_LEARNING external-black-box-c]'),contract),/IDS_MISMATCH/);
  assert.throws(()=>assertVerifiedExternalLearningPromptCoverage(prompt.replace('APPLY=id=persistent-contextual-action-controls',''),contract),/APPLY_MISMATCH/);
});

test('mandatory verified APK learning disables deterministic diagnostic source bypass',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/deterministicDiagnostic=!allowFullRewrite&&verifiedExternalLearningContract\.required!==true/);
  assert.match(source,/assertVerifiedExternalLearningPromptCoverage\(attemptPrompt,verifiedExternalLearningContract\|\|\{\}\)/);
  assert.match(source,/verifiedExternalLearningRuntimePromptAllAttempts/);
});


test('source worker emits auditable APK learning prompt telemetry before generation',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/VIBE2_VERIFIED_EXTERNAL_LEARNING_SOURCE_PROMPT=PASS/);
  assert.match(workerSource,/VIBE2_VERIFIED_EXTERNAL_LEARNING_SOURCE_PROMPT_COUNT=/);
  assert.match(workerSource,/VIBE2_VERIFIED_EXTERNAL_LEARNING_SOURCE_PROMPT_IDS=/);
});


test('model path line locators are stripped before extension validation',()=>{
  const candidate=normalizeCandidate({
    edits:[{path:'Assets/Scripts/Player.cs:149',find:'return 1;',replace:'return 2;'}]
  },{
    target:'unity',
    responsibleFiles:['Assets/Scripts/Player.cs'],
    sourceRootRelative:'unity-games/demo'
  });
  assert.equal(candidate.edits[0].path,'Assets/Scripts/Player.cs');

  const hashCandidate=normalizeCandidate({
    edits:[{path:'Assets/Scripts/Player.cs#L149-L151',find:'return 2;',replace:'return 3;'}]
  },{
    target:'unity',
    responsibleFiles:['Assets/Scripts/Player.cs'],
    sourceRootRelative:'unity-games/demo'
  });
  assert.equal(hashCandidate.edits[0].path,'Assets/Scripts/Player.cs');
});

test('Unity bootstrap pair retry explicitly forbids empty edits and requires both files',()=>{
  const retry=buildGenerationRetryPrompt([
    'Engine: unity',
    'Goal: bootstrap real Unity Web gameplay',
    'Allowed edit paths: Assets/Scripts/GameCore.cs, Assets/Scripts/RuntimeBootstrap.cs',
    '=== FILE Assets/Scripts/GameCore.cs [EDITABLE] ===',
    'class GameCore {}',
    '=== FILE Assets/Scripts/RuntimeBootstrap.cs [EDITABLE] ===',
    'class RuntimeBootstrap {}'
  ].join('\n'),{
    error:new Error('후보가 실제 source 변경을 생성하지 않음'),
    responsibleFiles:['Assets/Scripts/GameCore.cs','Assets/Scripts/RuntimeBootstrap.cs'],
    attempt:2,
    multiFilePairRequired:true
  });
  assert.match(retry,/edits array MUST NOT be empty/i);
  assert.match(retry,/at least two edits total/i);
  assert.match(retry,/Every replace must differ from find/i);
});

test('local Roblox visual retry targets gameplay visuals and keeps a bounded build-up prompt',()=>{
  const root=tempRoot();
  const sourceRoot=path.join(root,'roblox-games','cozy-island');
  write(path.join(sourceRoot,'server/BattleVisual.luau'),
    'local TweenService=game:GetService("TweenService")\nlocal pulse=Color3.fromRGB(70,116,165)\nTweenService:Create(pulse,TweenInfo.new(1.8),{Position=goal}):Play()\n');
  write(path.join(sourceRoot,'shared/QACamera.luau'),
    'local button=Instance.new("TextButton")\nbutton.BackgroundColor3=Color3.fromRGB(35,38,46)\n');
  const directive=[
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=cozy-g2',
    'primaryGoal=실제 전투 연출과 움직임을 개선한다.',
    'sourceAnchors=server/BattleVisual.luau',
    'expectedPlayerEffect=전투 상태를 명확하게 본다.',
    'contentBundle='+('unrelated-system-detail '.repeat(500)),
    'contentRule='+('unrelated-world-rule '.repeat(500)),
    'visual=지역 색과 실제 Tween 모션을 연결',
    'platform=Roblox native render',
    'preserve=전투 숫자와 저장',
    'acceptance=실제 렌더 변화',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]'
  ].join('\n');
  const prompt=[
    '[PRESENTATION_PASS:ASSET_ADAPTATION]',
    'Engine: roblox',
    'Goal: improve actual battle visuals',
    directive,
    'Allowed edit paths: shared/QACamera.luau, server/BattleVisual.luau',
    '=== FILE shared/QACamera.luau [EDITABLE] ===',
    'button.BackgroundColor3=Color3.fromRGB(35,38,46)',
    '=== FILE server/BattleVisual.luau [EDITABLE] ===',
    'local pulse=Color3.fromRGB(70,116,165)',
    'TweenService:Create(pulse,TweenInfo.new(1.8),{Position=goal}):Play()'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['shared/QACamera.luau','server/BattleVisual.luau'],
    sourceRoot
  });
  assert.ok(focused);
  assert.equal(focused.spec.path,'server/BattleVisual.luau');
  assert.match(focused.prompt,/primaryGoal=실제 전투 연출/);
  assert.match(focused.prompt,/visual=지역 색/);
  assert.doesNotMatch(focused.prompt,/unrelated-system-detail/);
  assert.ok(Buffer.byteLength(focused.prompt,'utf8')<7000);
});


test('asset-development Roblox presentation always keeps the bounded local-model asset path',()=>{
  const base={
    target:'roblox',
    goal:'[WORLD_LOBBY_FIRST] preserve lobby flow\n[PRESENTATION_PASS:ASSET_ADAPTATION] improve native graphics',
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false},
    selectedTask:{goal:'[WORLD_LOBBY_FIRST] preserve lobby flow',evidence:['world-lobby-first:v1']}
  };
  assert.equal(robloxDeterministicPresentationEligible(base),false);
  assert.equal(robloxDeterministicPresentationEligible({
    ...base,
    selectedTask:{...base.selectedTask,assetProductionLane:true,evidence:['world-lobby-first:v1','asset-production-parallel:v1']}
  }),false);
  assert.equal(robloxDeterministicPresentationEligible({
    target:'roblox',
    goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] improve native graphics',
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false},
    selectedTask:{assetProductionLane:true,evidence:['asset-production-parallel:v1']}
  }),false);
  assert.equal(robloxDeterministicPresentationEligible({
    target:'roblox',
    goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] improve native graphics',
    presentationQuality:{required:true,pass:'ASSET_ADAPTATION',authorityExpanded:false},
    selectedTask:{evidence:[]}
  }),true);
});


test('deterministic Roblox build-up creates real style and motion edits without a model',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'roblox-games/demo');
  const relative='client/Game.client.luau';
  const source=[
    'local Players = game:GetService("Players")',
    'local player = Players.LocalPlayer',
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'root.Name = "Root"',
    'root.AnchorPoint = Vector2.new(0.5, 1)',
    'root.Position = UDim2.fromScale(0.5, 0.98)',
    'root.Size = UDim2.new(1, -24, 0, 360)',
    'root.BackgroundTransparency = 0.15',
    'root.BackgroundColor3 = Color3.fromRGB(18, 28, 48)',
    'root.Parent = gui',
    'local title = Instance.new("TextLabel")',
    'title.BackgroundTransparency = 1',
    'title.TextColor3 = Color3.fromRGB(245, 248, 255)',
    'title.TextScaled = true',
    'title.Text = string.format("%s · %s · %s", Config.GameName, Config.Genre, Config.PlayMode)',
    'title.Parent = root',
    'local status = Instance.new("TextLabel")',
    'status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)',
    'status.TextColor3 = Color3.fromRGB(220, 232, 250)',
    'status.TextScaled = true',
    'status.Parent = root',
    ''
  ].join('\n');
  write(path.join(sourceRoot,relative),source);
  const workOrder={
    target:'roblox',
    gameId:'demo',
    presentationQuality:{
      required:true,
      pass:'ASSET_ADAPTATION',
      graphicsReplacement:{
        required:true,
        adaptiveCount:{minimumActual:1,maximumActual:60},
        surfaces:['HUD','MENU'],
        reuseModes:['ADAPT_RESTYLE_AND_RETARGET'],
        beforeAfterEvidenceRequired:true,
        perReplacementSourceEvidenceRequired:true,
        actualReplacementCountMustEqualGroundedEvidenceCount:true,
        selfReportedCountWithoutGroundedSourceEvidenceCannotPass:true
      }
    }
  };
  const verifiedExternalLearningContract={
    required:true,
    ids:['external-black-box-demo'],
    count:1,
    coveragePct:100,
    block:'[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]\ndispositions=1/1; sourcePrinciples=1; validationOnly=0; truncation=FORBIDDEN\n[EXTERNAL_LEARNING external-black-box-demo]\nDISPOSITION=p1:APPLIED_GAME_SOURCE;GAME=demo;TARGET=roblox;DOMAINS=UI;GENRE_MOOD=DEMO\nAPPLY=use clear native UI motion and contrast\n[END_EXTERNAL_LEARNING external-black-box-demo]\n[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  };
  const first=deterministicRobloxBuildUpCandidate({
    order:workOrder,
    sourceRoot,
    sourceRootRelative:'roblox-games/demo',
    responsibleFiles:[relative],
    verifiedExternalLearningContract
  });
  assert.ok(first);
  assert.equal(first.generation.mode,'DETERMINISTIC_ROBLOX_BUILDUP');
  assert.equal(first.generation.deterministicRobloxBuildStage,1);
  assert.equal(first.candidate.edits.length,3);
  const changed=first.candidate.edits.map(row=>row.replace).join('\n');
  assert.match(changed,/TweenService/);
  assert.match(changed,/Position = deterministicGameplayHudEntryPosition/);
  assert.match(changed,/UIGradient/);
  assert.match(changed,/Color3\.fromRGB/);
  assert.equal(first.generation.deterministicVerifiedExternalLearningApplied,true);
  assert.deepEqual(first.generation.deterministicVerifiedExternalLearningIds,['external-black-box-demo']);
  assert.equal(first.generation.deterministicVerifiedExternalLearningCoveragePct,100);
  assert.equal(first.generation.deterministicVerifiedExternalLearningContractConsumed,true);
  assert.equal(evaluatePresentationCandidateDelta({
    candidate:first.candidate,
    sourceRoot,
    contract:workOrder.presentationQuality
  }).pass,true);
  const graphics=evaluateGraphicsReplacementReport({
    candidate:first.candidate,
    contract:workOrder.presentationQuality.graphicsReplacement
  });
  assert.equal(graphics.pass,true);
  assert.equal(graphics.report.actualCount,3);
  assert.equal(graphics.groundedCount,3);

  applyExactEdits(sourceRoot,first.candidate.edits);
  const second=deterministicRobloxBuildUpCandidate({
    order:workOrder,
    sourceRoot,
    sourceRootRelative:'roblox-games/demo',
    responsibleFiles:[relative],
    verifiedExternalLearningContract
  });
  assert.ok(second);
  assert.equal(second.generation.deterministicRobloxBuildStage,2);
  assert.equal(second.candidate.edits.length,3);
  assert.ok(second.candidate.edits.every(row=>/VIBE2_DETERMINISTIC_ROBLOX_BUILDUP_/.test(row.find)));
});


test('deterministic Roblox build-up keeps motion when Root styling was already customized',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'roblox-games/line-defense');
  const relative='client/Game.client.luau';
  const source=[
    'local gui = Instance.new("ScreenGui")',
    'local root = Instance.new("Frame")',
    'root.Name = "Root"',
    'root.AnchorPoint = Vector2.new(0.5, 1)',
    'root.Position = UDim2.fromScale(0.5, 0.98)',
    'root.Size = UDim2.new(1, -24, 0, 360)',
    'root.BackgroundTransparency = 0.15',
    'local studioUi = {}',
    'root.BackgroundColor3 = Color3.fromRGB(22, 34, 58)',
    'root:SetAttribute("StudioAssetBindingVersion", 2)',
    'root.Parent = gui',
    'local title = Instance.new("TextLabel")',
    'title.BackgroundTransparency = 1',
    'title.TextColor3 = Color3.fromRGB(245, 248, 255)',
    'title.TextScaled = true',
    'title.Text = string.format("%s · %s · %s", Config.GameName, Config.Genre, Config.PlayMode)',
    'title.Parent = root',
    'local status = Instance.new("TextLabel")',
    'status.BackgroundColor3 = Color3.fromRGB(10, 17, 30)',
    'status.TextColor3 = Color3.fromRGB(220, 232, 250)',
    'status.TextScaled = true',
    'status.Parent = root',
    ''
  ].join('\n');
  write(path.join(sourceRoot,relative),source);
  const result=deterministicRobloxBuildUpCandidate({
    order:{
      target:'roblox',
      gameId:'line-defense',
      presentationQuality:{required:true,pass:'ASSET_ADAPTATION'}
    },
    sourceRoot,
    sourceRootRelative:'roblox-games/line-defense',
    responsibleFiles:[relative]
  });
  assert.ok(result);
  assert.equal(result.candidate.edits.length,3);
  const rootEdit=result.candidate.edits.find(row=>/TweenService/.test(row.replace));
  assert.ok(rootEdit);
  assert.equal(rootEdit.find,'root.Parent = gui');
  assert.match(rootEdit.replace,/VIBE2_DETERMINISTIC_ROBLOX_BUILDUP_ROOT_BEGIN stage=1/);
  assert.match(rootEdit.replace,/deterministicGameplayHudTweenService:Create/);
});

test('deterministic Roblox build-up supports compact custom HUDs without the root title status template',()=>{
  const cwd=tempRoot();
  const sourceRoot=path.join(cwd,'roblox-games/custom-hud');
  const relative='client/Game.client.luau';
  const source=[
    'local gui=Instance.new("ScreenGui");gui.Name="RPGHUD";gui.Parent=game.Players.LocalPlayer:WaitForChild("PlayerGui")',
    'local startupOverlay=Instance.new("Frame");startupOverlay.Size=UDim2.fromScale(1,1);startupOverlay.BackgroundColor3=Color3.fromRGB(19,21,29);startupOverlay.Parent=gui',
    'local stats=Instance.new("Frame");stats.Name="RPGTopHUD";stats.Size=UDim2.fromOffset(270,88);stats.Position=UDim2.fromOffset(8,8);stats.BackgroundColor3=Color3.fromRGB(25,28,35);stats.Parent=gui',
    'local title=Instance.new("TextLabel");title.Text="Custom RPG";title.Parent=stats'
  ].join('\n');
  write(path.join(sourceRoot,relative),source);
  const order={
    target:'roblox',
    gameId:'custom-hud',
    presentationQuality:{
      required:true,
      pass:'ASSET_ADAPTATION',
      graphicsReplacement:{
        required:true,
        surfaces:['HUD'],
        reuseModes:['ADAPT_RESTYLE_AND_RETARGET'],
        beforeAfterEvidenceRequired:true,
        perReplacementSourceEvidenceRequired:true,
        actualReplacementCountMustEqualGroundedEvidenceCount:true,
        selfReportedCountWithoutGroundedSourceEvidenceCannotPass:true
      }
    }
  };
  const first=deterministicRobloxBuildUpCandidate({
    order,
    sourceRoot,
    sourceRootRelative:'roblox-games/custom-hud',
    responsibleFiles:[relative]
  });
  assert.ok(first);
  assert.equal(first.generation.mode,'DETERMINISTIC_ROBLOX_BUILDUP');
  assert.equal(first.candidate.edits.length,1);
  assert.equal(first.candidate.edits[0].find,'stats.Parent=gui');
  assert.match(first.candidate.edits[0].replace,/VIBE2_DETERMINISTIC_ROBLOX_BUILDUP_SURFACE_BEGIN stage=1/);
  assert.match(first.candidate.edits[0].replace,/local deterministicGameplaySurfaceTarget = stats/);
  assert.match(first.candidate.edits[0].replace,/deterministicGameplaySurfaceTweenService:Create/);
  assert.doesNotMatch(first.candidate.edits[0].replace,/local deterministicGameplaySurfaceTarget = startupOverlay/);
  assert.equal(first.candidate.graphicsReplacementReport?.actualCount,3);
  assert.deepEqual(
    first.candidate.graphicsReplacementReport?.replacementEvidence?.map(row=>row.bindingKey),
    ['DeterministicGameplaySurfaceCorner','DeterministicGameplaySurfaceStroke','DeterministicGameplaySurfaceGradient']
  );

  applyExactEdits(sourceRoot,first.candidate.edits);
  const second=deterministicRobloxBuildUpCandidate({
    order,
    sourceRoot,
    sourceRootRelative:'roblox-games/custom-hud',
    responsibleFiles:[relative]
  });
  assert.ok(second);
  assert.equal(second.generation.deterministicRobloxBuildStage,2);
  assert.equal(second.candidate.edits.length,1);
  assert.match(second.candidate.edits[0].find,/VIBE2_DETERMINISTIC_ROBLOX_BUILDUP_SURFACE_BEGIN stage=1/);
  assert.match(second.candidate.edits[0].replace,/VIBE2_DETERMINISTIC_ROBLOX_BUILDUP_SURFACE_BEGIN stage=2/);
});

test('Roblox deterministic workflow activates only for an explicit deterministic work order and never falls back to Ollama',()=>{
  const worker=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/const deterministicRobloxMode=robloxDeterministicPresentationEligible\(order\)/);
  assert.match(worker,/process\.env\.DETERMINISTIC_SOURCE/);
  assert.match(worker,/const deterministicRobloxRequired=deterministicRobloxMode/);
  assert.match(worker,/DETERMINISTIC_ROBLOX_BUILDUP_REQUIRED:NO_VALID_LOCAL_CANDIDATE/);
  assert.match(worker,/if\(!generated&&deterministicRobloxRequired\)/);
});

test('continuous workflow marks Roblox text source as model-independent',()=>{
  const workflow=fs.readFileSync('.github/workflows/vibe2-continuous-core.yml','utf8');
  assert.match(workflow,/VIBE2_ROBLOX_DETERMINISTIC_SOURCE: 'true'/);
  assert.match(workflow,/reason='ROBLOX_DETERMINISTIC_SOURCE'/);
  assert.match(workflow,/VIBE2_ROBLOX_SOURCE_MODE=DETERMINISTIC_LOCAL/);
  assert.match(workflow,/VIBE2_LOCAL_MODEL_REQUIRED=NO/);
  assert.match(workflow,/VIBE2_ACTIVE_SOURCE_PROVIDER=DETERMINISTIC_LOCAL/);
  assert.match(workflow,/verifiedExternalLearningDeterministicContractConsumed/);
  assert.match(workflow,/deterministicLearningProof/);
});


test('local model output limit triggers bounded adaptive retry without external AI',async(t)=>{
  const cwd=tempRoot(),requests=[];
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],taskId:'truncated-local-repair'})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const index=requests.length;
      const response=index===1?JSON.stringify({edits:[{path:'index.html',find:'NOT_PRESENT',replace:'changed'}],newFiles:[],replaceFiles:[]})
        :index===2?'{"replace":"<button id=\\"play\\">Continue'
        :JSON.stringify({replace:'<button id="play">Continue</button>'});
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify({response,done:true,done_reason:index===2?'length':'stop'})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd});
  assert.equal(requests.length,3);
  assert.equal(requests[1].options.num_predict,384);
  assert.equal(requests[2].options.num_predict,768);
  assert.equal(requests[2].think,false);
  assert.equal(result.generation.attempts,3);
  assert.equal(result.generation.maxPredict,768);
  assert.deepEqual(result.changedFiles,['index.html']);
});


test('Luau presentation anchors exclude open callbacks and QA camera instrumentation',()=>{
  const source=[
    'QACamera.install(C,gui,function()',
    ' return shots',
    'end)',
    'QACamera.install(C,gui,function() return shots end)',
    'if camera.CameraSubject==h then foundationRemote:FireServer("CAMERA_READY");break end',
    'button.Activated:Connect(function()',
    ' label.Text = "ready"',
    'end)',
    'if hasStudioAssetAtom("FRAME_PANEL") then',
    'panel.BackgroundColor3 = Color3.fromRGB(20, 40, 60)',
    'end'
  ].join('\n');
  const prompt='Engine: roblox\nGoal: presentation\nAllowed edit paths: client/Game.client.luau\n=== FILE client/Game.client.luau [EDITABLE] ===\n'+source;
  const anchors=exactRetryAnchorSuggestions(prompt,{max:5,responsibleFiles:['client/Game.client.luau']});
  assert.ok(anchors.includes('panel.BackgroundColor3 = Color3.fromRGB(20, 40, 60)'));
  assert.ok(anchors.every(anchor=>!anchor.includes('QACamera')&&!anchor.includes('foundationRemote')&&!anchor.includes('Connect(function()')&&!anchor.startsWith('if hasStudioAssetAtom')));
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{responsibleFiles:['client/Game.client.luau']});
  assert.equal(focused.spec.find,'panel.BackgroundColor3 = Color3.fromRGB(20, 40, 60)');
});

test('Luau focused retry uses a body statement instead of an incomplete function declaration',()=>{
  const prompt=['Engine: roblox','Goal: repair rendering','Allowed edit paths: client/Game.client.luau',
    '=== FILE client/Game.client.luau [EDITABLE] ===','local function render()',
    '  status.Text = "ready"','end'].join('\n');
  const anchors=exactRetryAnchorSuggestions(prompt,{max:5,responsibleFiles:['client/Game.client.luau']});
  assert.ok(anchors.includes('  status.Text = "ready"'));
  assert.ok(!anchors.includes('local function render()'));
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{error:new Error('ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:FUNCTION_HEADER_PREMATURE_END:client/Game.client.luau'),responsibleFiles:['client/Game.client.luau']});
  assert.equal(focused.spec.find,'  status.Text = "ready"');
  assert.match(focused.prompt,/LUA SCOPE REPAIR/);
  assert.match(focused.prompt,/Do not append an end that closes the enclosing function/);
});

test('gameplay recovery ignores incidental visual vocabulary and follows the declared source owner',()=>{
  const prompt=[
    'Engine: roblox',
    'Goal: repair capture state persistence',
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=capture-g2 primaryFocus=STABILITY',
    'primaryGoal=Persist the captured monster after a successful capture.',
    'sourceAnchors=roblox-games/demo/server/Game.server.luau:1 FUNCTION capture CURRENT=not saved INTENDED=persist capture ACCEPT=reload retains capture',
    'sourceAnchors=roblox-games/demo/client/Game.client.luau:2 FUNCTION render CURRENT=weak visual INTENDED=clear visual ACCEPT=visible',
    'gameplay=Capture must update the authoritative collection before save.',
    'visual=GRAPHICS and VISUAL improvements remain separate responsibilities.',
    'preserve=SAVE_KEYS',
    'acceptance=RELOAD_CAPTURED_COLLECTION',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]',
    'Allowed edit paths: shared/GameConfig.luau, server/Game.server.luau, client/Game.client.luau',
    '=== FILE shared/GameConfig.luau [EDITABLE] ===',
    'local config = { VisualStyle = "forest" }',
    '=== FILE server/Game.server.luau [EDITABLE] ===',
    'state.captured = capturedMonster',
    '=== FILE client/Game.client.luau [EDITABLE] ===',
    'panel.BackgroundColor3 = Color3.fromRGB(18,28,48)'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt);
  assert.equal(focused.spec.path,'server/Game.server.luau');
  assert.equal(focused.spec.find,'state.captured = capturedMonster');
  assert.match(focused.prompt,/gameplay=Capture must update the authoritative collection before save\./);
  assert.match(focused.prompt,/INTENDED=persist capture ACCEPT=reload retains capture/);
  assert.match(focused.prompt,/SAVE_KEYS/);
  assert.match(focused.prompt,/RELOAD_CAPTURED_COLLECTION/);
  assert.doesNotMatch(focused.prompt,/sourceAnchors=.*client\/Game/);
  assert.doesNotMatch(focused.prompt,/PRESENTATION TASK HARD RULE|ROBLOX VISUAL ANCHOR RULE/);
});

test('focused recovery removes sibling anchor payloads without truncating the owned instructions or external learning',()=>{
  const own='server/Game.server.luau:1 FUNCTION capture CURRENT=missing INTENDED=save collection ACCEPT=reload';
  const sibling='client/Game.client.luau:2 FUNCTION render CURRENT='+('unrelated visual detail '.repeat(500))+' INTENDED=visible ACCEPT=rendered';
  const external='[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]\nexternal principle stays intact\n[VERIFIED EXTERNAL BLACK-BOX LEARNING END]';
  // Exercise the legacy joined format as well as the current per-anchor format.
  for(const anchors of ['sourceAnchors='+own+' | '+sibling,'sourceAnchors='+own+'\nsourceAnchors='+sibling]){
    const prompt=[
      'Engine: roblox','Goal: repair collection persistence',external,
      '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
      'directiveId=capture-g2 primaryFocus=STABILITY',anchors,
      'preserve=SAVE_KEYS','acceptance=RELOAD_CAPTURED_COLLECTION',
      '[GAME SPECIFIC BUILD UP DIRECTIVE END]',
      'Allowed edit paths: server/Game.server.luau',
      '=== FILE server/Game.server.luau [EDITABLE] ===',
      'state.captured = capturedMonster'
    ].join('\n');
    const focused=buildFocusedReplaceOnlyPrompt(prompt);
    assert.ok(focused.prompt.includes('sourceAnchors='+own));
    assert.ok(focused.prompt.includes(external));
    assert.doesNotMatch(focused.prompt,/unrelated visual detail/);
    assert.ok(Buffer.byteLength(focused.prompt)<Buffer.byteLength(prompt)/2);
  }
});

test('invalid-path retry removes stale source ownership and sends the build-up directive only once',()=>{
  const prompt=[
    'Engine: unity','Goal: implement the approved game loop',
    'Obsolete context: Assets/Scripts/UnityWebFloorGame.cs',
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'directiveId=unity-g2 primaryFocus=GAMEPLAY',
    'sourceAnchors=unity-games/demo/Assets/Scripts/UnityWebFloorGame.cs:1 FUNCTION Act CURRENT=stub INTENDED=play ACCEPT=loop',
    'gameplay=Capture, grow and evolve the collected monsters.',
    'preserve=SAVE_KEYS',
    'acceptance=REAL_GAMEPLAY',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]',
    'Allowed edit paths: Assets/Scripts/GameCore.cs, Assets/Scripts/RuntimeBootstrap.cs',
    '=== FILE Assets/Scripts/GameCore.cs [EDITABLE] ===',
    'public class GameCore { public int Captured = 0; }',
    '=== FILE Assets/Scripts/RuntimeBootstrap.cs [EDITABLE] ===',
    'public class RuntimeBootstrap { public bool Started = false; }'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    error:new Error('책임 파일 범위 밖 수정 금지: Assets/Scripts/UnityWebFloorGame.cs'),
    responsibleFiles:['Assets/Scripts/GameCore.cs','Assets/Scripts/RuntimeBootstrap.cs'],
    attempt:2,multiFilePairRequired:true
  });
  assert.doesNotMatch(retry,/UnityWebFloorGame/);
  assert.equal(retry.split('[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]').length-1,1);
  assert.match(retry,/Capture, grow and evolve/);
  assert.match(retry,/SAVE_KEYS/);
  assert.match(retry,/UNITY WEB BOOTSTRAP PAIR CONTRACT/);
  assert.match(retry,/public class GameCore/);
  assert.match(retry,/public class RuntimeBootstrap/);
});

test('long fixed anchors receive sufficient initial replacement budget',async(t)=>{
  const cwd=tempRoot(),requests=[];
  const source='<button id="play" aria-label="'+('A'.repeat(330))+'">Play</button>';
  write(path.join(cwd,'web-games/demo/index.html'),source+'\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html']})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const response=requests.length===1?JSON.stringify({edits:[{path:'index.html',find:'NOT_PRESENT',replace:'changed'}]}):JSON.stringify({replace:source.replace('>Play<','>Continue<')});
      res.end(JSON.stringify({response,done:true})+'\n');
    });
  });
  await new Promise(resolve=>server.listen(11434,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd});
  assert.equal(requests.length,2);
  assert.ok(requests[1].options.num_predict>384);
  assert.ok(requests[1].options.num_predict<=3072);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('output truncation on the final ordinary retry receives an enlarged recovery attempt',async(t)=>{
  const cwd=tempRoot(),requests=[];
  write(path.join(cwd,'web-games/demo/index.html'),'<button id="play">Play</button>\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'web',root:'web-games/demo',responsibleFiles:['web-games/demo/index.html']})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));const n=requests.length;
      const response=n===1?JSON.stringify({edits:[{path:'index.html',find:'NOT_PRESENT',replace:'changed'}]}):n===2?'{':n<=4?'{"replace":"<button':JSON.stringify({replace:'<button id="play">Continue</button>'});
      res.end(JSON.stringify({response,done:true,done_reason:n===3||n===4?'length':'stop'})+'\n');
    });
  });
  await new Promise(resolve=>server.listen(11434,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd});
  assert.equal(requests.length,5);
  assert.ok(requests[3].options.num_predict>requests[2].options.num_predict);
  assert.equal(result.generation.attempts,5);
  assert.equal(result.generation.truncatedOutputCreditUsed,true);
  assert.ok(requests[4].options.num_predict>requests[3].options.num_predict);
  assert.deepEqual(result.changedFiles,['index.html']);
});

test('Unity timeout retry waits for both streamed file edits before atomic validation',async(t)=>{
  const cwd=tempRoot(),requests=[];
  const root='unity-games/missing-unity',core='Assets/Scripts/GameCore.cs',runtime='Assets/Scripts/RuntimeBootstrap.cs';
  const workOrder=order({target:'unity',root,responsibleFiles:[`${root}/${core}`,`${root}/${runtime}`]});
  workOrder.gameId='missing-unity';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','unity-web-source-root-bootstrap-required']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder));
  const first={path:core,find:'// Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.',replace:'public int RuntimeState = 1;'};
  const second={path:runtime,find:'            var go = new GameObject("RuntimeBootstrap");',replace:'            var go = new GameObject("RuntimeBootstrap");\n            go.AddComponent<GameCore>();'};
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));res.writeHead(200,{'content-type':'application/x-ndjson'});
      if(requests.length===1){res.end(JSON.stringify({error:'Ollama 응답 시간 초과'})+'\n');return;}
      res.write(JSON.stringify({response:'{"edits":['+JSON.stringify(first)+',',done:false})+'\n');
      setImmediate(()=>res.end(JSON.stringify({response:JSON.stringify(second)+']}',done:true})+'\n'));
    });
  });
  await new Promise(resolve=>server.listen(11434,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd});
  assert.equal(requests.length,2);
  assert.deepEqual(result.changedFiles.filter(file=>file.startsWith('Assets/Scripts/')).sort(),[core,runtime].sort());
  assert.equal(result.generation.streamedPartialEditRecovery,false);
});

test('missing-file recovery cannot select a sibling source anchor when bootstrapping without disk files',()=>{
  const prompt=[
    'Engine: unity','Goal: implement approved collection state',
    'Allowed edit paths: Assets/Scripts/GameCore.cs, Assets/Scripts/RuntimeBootstrap.cs',
    '=== FILE Assets/Scripts/RuntimeBootstrap.cs [EDITABLE] ===',
    'var go = new GameObject("RuntimeBootstrap");',
    '=== FILE Assets/Scripts/GameCore.cs [EDITABLE] ===',
    'namespace Demo {',
    'public sealed class GameCore {',
    '    // Replace this approved game-state implementation.',
    '}','}'
  ].join('\n');
  const spec=focusedReplaceOnlySpec(prompt,{responsibleFiles:['Assets/Scripts/GameCore.cs']});
  assert.ok(spec);
  assert.equal(spec.path,'Assets/Scripts/GameCore.cs');
  assert.doesNotMatch(spec.find,/new GameObject/);
  assert.match(spec.context,/namespace Demo/);
  assert.match(spec.context,/class GameCore/);
});

test('truncated Unity pair preserves an exact first edit and completes the missing file without committing a partial candidate',async(t)=>{
  const cwd=tempRoot(),requests=[];
  const root='unity-games/missing-unity',core='Assets/Scripts/GameCore.cs',runtime='Assets/Scripts/RuntimeBootstrap.cs';
  const workOrder=order({target:'unity',root,responsibleFiles:[`${root}/${core}`,`${root}/${runtime}`]});
  workOrder.gameId='missing-unity';
  workOrder.selectedTask={evidence:['source-root-bootstrap-required','unity-web-source-root-bootstrap-required']};
  workOrder.workerPolicy={directMainWrite:false,sourceRootBootstrapAllowed:true};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder));
  const first={path:core,find:'// Vibe가 승인 설계의 실제 상태/규칙/세이브 책임으로 교체한다.',replace:'public int RuntimeState = 1;'};
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const response=requests.length===1?'{"edits":['+JSON.stringify(first)+',':JSON.stringify({replace:'            var go = new GameObject("RuntimeBootstrap");\n            go.AddComponent<GameCore>();'});
      res.end(JSON.stringify({response,done:true,done_reason:requests.length===1?'length':'stop'})+'\n');
    });
  });
  await new Promise(resolve=>server.listen(11434,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd});
  assert.equal(requests.length,2);
  assert.match(requests[1].prompt,/PRESERVED COUNTERPART.*RuntimeState/);
  assert.match(requests[1].prompt,/Exact missing writable path: "Assets\/Scripts\/RuntimeBootstrap.cs"/);
  assert.equal(result.generation.gameSourcePairCompletion,true);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',core),'utf8'),/public int RuntimeState = 1;/);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates',result.taskId,'files',runtime),'utf8'),/go\.AddComponent<GameCore>\(\)/);
  assert.equal(fs.existsSync(path.join(cwd,root)),false);
});

test('pair completion refuses a counterpart whose anchor is stale on the unchanged base',()=>{
  const prompt=[
    'Engine: unity','Goal: connect state and runtime',
    '=== FILE Assets/Scripts/GameCore.cs [EDITABLE] ===','public int State = 0;',
    '=== FILE Assets/Scripts/RuntimeBootstrap.cs [EDITABLE] ===','var go = new GameObject("RuntimeBootstrap");'
  ].join('\n');
  const spec=systemAtomicPairCompletionSpec(prompt,{
    responsibleFiles:['Assets/Scripts/GameCore.cs','Assets/Scripts/RuntimeBootstrap.cs'],multiFilePairRequired:true,
    partialCandidate:{edits:[{path:'Assets/Scripts/GameCore.cs',find:'public int State = 99;',replace:'public int State = 1;'}]}
  });
  assert.equal(spec,null);
});

test('Luau compiler accepts nested blocks at a function header and rejects a real premature end', {skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async()=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
  const source='local status = {Text = "ok"}\nlocal function render()\n  status.Text = "ok"\nend\nrender()\n';
  write(path.join(cwd,root,relative),source);
  const workOrder=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-compiled-header'});
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder));
  const bad=path.join(cwd,'bad.json'),good=path.join(cwd,'good.json');
  write(bad,JSON.stringify({edits:[{path:relative,find:'local function render()',replace:'local function render()\n  status.TextWrapped = true\nend'}]}));
  write(good,JSON.stringify({edits:[{path:relative,find:'local function render()',replace:'local function render()\n  if status then\n    status.TextWrapped = true\n  end'}]}));
  const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good],luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
  assert.equal(result.generation.attempts,2);
  const manifest=JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'manifest.json'),'utf8'));
  assert.equal(manifest.codingMethod.semanticDiffEnforcement.sourceSyntax.compiler,'LUAU');
  assert.equal(manifest.codingMethod.semanticDiffEnforcement.sourceSyntax.runtimeVerified,false);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Luau compiler validates the combined file rather than rejecting dependent edit fragments',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async()=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='server/Game.server.luau';
  const source='local enabled = true\nlocal score = 0\nscore = score + 1\nreturn score\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-combined'})));
  const responseFile=path.join(cwd,'answer.json');
  write(responseFile,JSON.stringify({edits:[{path:relative,find:'score = score + 1',replace:'if enabled then\nscore = score + 1'},{path:relative,find:'return score',replace:'end\nreturn score'}]}));
  const result=await runVibe2SourceWorker({cwd,responseFile,luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
  assert.equal(result.generation.attempts,1);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Luau compiler rejects non-header syntax errors before source application',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async()=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
  const source='local score = 0\nreturn score\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-invalid'})));
  const responseFile=path.join(cwd,'answer.json');
  write(responseFile,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = )'}]}));
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile,applySource:true,luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER}),/ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:LUAU_SYNTAX/);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Luau compiler rejects formatting and comment-only candidates before accepting a real source change',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async()=>{
  for(const replacement of ['local character = player.Character or player.CharacterAdded:Wait()','  -- cosmetic comment\n\n  local character = player.Character or player.CharacterAdded:Wait()']){
    const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
    const find='  local character = player.Character or player.CharacterAdded:Wait()';
    const source='local function reportNativeFoundationReady()\n'+find+'\n  return character\nend\nreturn reportNativeFoundationReady()\n';
    write(path.join(cwd,root,relative),source);
    const workOrder=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-format-retry'});
    write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder));
    const bad=path.join(cwd,'bad.json'),good=path.join(cwd,'good.json');
    write(bad,JSON.stringify({edits:[{path:relative,find,replace:replacement}]}));
    write(good,JSON.stringify({edits:[{path:relative,find,replace:find+'\n  character:SetAttribute("NativeReady", true)'}]}));
    const result=await runVibe2SourceWorker({cwd,responseFiles:[bad,good],luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
    assert.equal(result.generation.attempts,2);
    const manifest=JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates',workOrder.taskId,'manifest.json'),'utf8'));
    assert.deepEqual(manifest.codingMethod.semanticDiffEnforcement.sourceSyntax.structuralChangedFiles,[relative]);
    assert.equal(manifest.codingMethod.semanticDiffEnforcement.sourceSyntax.runtimeVerified,false);
    assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
  }
});

test('Luau compiler rejects cancelling edits and preserves significant string and interpolation changes',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async()=>{
  const cases=[
    {before:'local score = 0\nreturn score\n',edits:[{find:'local score = 0',replace:'local score = 1'},{find:'local score = 1',replace:' local score = 0'}],reject:true},
    {before:'return "hello world"\n',edits:[{find:'"hello world"',replace:'"hello  world"'}]},
    {before:'return "'+ 'a'.repeat(1500)+'A"\n',edits:[{find:'aA"',replace:'aB"'}]},
    {before:'return [[hello world]]\n',edits:[{find:'[[hello world]]',replace:'[[hello\nworld]]'}]},
    {before:'local count = 1\nreturn `count {count}`\n',edits:[{find:'`count {count}`',replace:'`count {count + 1}`'}]},
    {before:'local count = )\nreturn count\n',edits:[{find:'local count = )',replace:'local count = 0'}]}
  ];
  for(const [index,row] of cases.entries()){
    const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
    write(path.join(cwd,root,relative),row.before);
    write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-ast-'+index})));
    const responseFile=path.join(cwd,'answer.json');
    write(responseFile,JSON.stringify({edits:row.edits.map(edit=>({path:relative,...edit}))}));
    const result=runVibe2SourceWorker({cwd,responseFile,luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
    if(row.reject)await assert.rejects(result,/변경 없는 edit: LUAU_AST_UNCHANGED/);
    else assert.equal((await result).generation.attempts,1);
    assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),row.before);
  }
});

test('Luau compiler missing AST tool fails closed as infrastructure failure',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async()=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
  const source='local score = 0\nreturn score\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-ast-missing'})));
  const compiler=path.join(cwd,path.basename(process.env.VIBE2_TEST_LUAU_COMPILER));
  fs.copyFileSync(process.env.VIBE2_TEST_LUAU_COMPILER,compiler);
  fs.chmodSync(compiler,0o755);
  const responseFile=path.join(cwd,'answer.json');
  write(responseFile,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile,applySource:true,luauCompiler:compiler}),/ROBLOX_LUAU_COMPILER_UNAVAILABLE:AST:ENOENT/);
  assert.equal(shouldRetryGenerationError(new Error('ROBLOX_LUAU_COMPILER_UNAVAILABLE:AST:ENOENT')),false);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Luau compiler unavailable fails closed without pretending the model produced a syntax error',async()=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
  const source='local score = 0\nreturn score\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'luau-missing'})));
  const responseFile=path.join(cwd,'answer.json');
  write(responseFile,JSON.stringify({edits:[{path:relative,find:'local score = 0',replace:'local score = 1'}]}));
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile,applySource:true,luauCompiler:path.join(cwd,'missing-compiler')}),/ROBLOX_LUAU_COMPILER_UNAVAILABLE/);
  assert.equal(shouldRetryGenerationError(new Error('ROBLOX_LUAU_COMPILER_UNAVAILABLE:ENOENT')),false);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

 test('model control token recovery explicitly separates source from reasoning and fences',()=>{
  const prompt='Engine: roblox\nGoal: repair source\nAllowed edit paths: client/Game.client.luau\n=== FILE client/Game.client.luau [EDITABLE] ===\nlocal activity = "idle"\n';
  const result=buildFocusedReplaceOnlyPrompt(prompt,{error:new Error('ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:MODEL_CONTROL_TOKEN:client/Game.client.luau'),responsibleFiles:['client/Game.client.luau']});
  assert.ok(result);
  assert.match(result.prompt,/SOURCE CONTENT REPAIR/);
  assert.match(result.prompt,/do not copy reasoning tags, thinking directives, or code fences/);
});


test('final Roblox control-token failure reaches its corrective prompt once and still rejects invalid source',async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'terminal-control-token'})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const n=requests.length;
      const response=n===1?JSON.stringify({edits:[{path:relative,find:'missing anchor',replace:'changed'}]})
        :n===2?'{' :JSON.stringify({replace:'<think>reasoning</think>\nstatus.Text = "changed"'});
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify({response,done:true,done_reason:n===2?'length':'stop'})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/ROBLOX_SOURCE_STRUCTURAL_CONTINUITY:MODEL_CONTROL_TOKEN/);
  assert.equal(requests.length,4);
  assert.match(requests[3].prompt,/SOURCE CONTENT REPAIR/);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('localized asset repair evidence and identity locks survive compact model retries',async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  const work=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'asset-detail-retry'});
  work.goal='[STUDIO_QUALITY_EVOLUTION]\nRepair the existing visual detail.\n'+('Existing approved context. '.repeat(4000));
  const repair={findingId:'grip-12',recipeId:'dokkaebi',sourceHash:'source-current',region:'rightGrip',normalizedTimeRange:[.3,.4],
    evidence:{artifactHash:'capture-current',artifactRef:'captures/grip.webm'},
    recipe:{previousParameters:{gripOffset:.05,hornCount:1,skinColor:[.2,.3,.4]},editableParameters:['gripOffset'],lockedParameters:['hornCount'],identityAnchors:['ONE_HORN']},
    closed:false};
  work.assetProduction={detailReview:{status:'LOCAL_REPAIR_REQUIRED',subjects:[{recipeId:'dokkaebi',sourceHash:'source-current'}],repairs:[repair],protectedSemantics:['GAMEPLAY_EVENTS','CLIP_DURATION']},
    motionContinuityAudit:{verdict:'FAIL',clipId:'swing',sourceHash:'source-current',violations:[{kind:'maxAttachmentOffset',region:'rightGrip',frameRange:[9,12],normalizedTimeRange:[.3,.4]}],runtimeVerified:false}};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      if(requests.length===3){res.writeHead(503);res.end('end probe');return;}
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify(requests.length===1?{error:'prediction aborted'}:{response:JSON.stringify({replace:'<think>invalid</think>'}),done:true})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(cwd,{recursive:true,force:true});});
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests.length,3);
  const blocks=requests.map(request=>request.prompt.match(/\[ASSET DETAIL REPAIR BEGIN\]\n([^\n]+)\n[\s\S]*?\[ASSET DETAIL REPAIR END\]/));
  for(const [index,block] of blocks.entries()){
    assert.ok(block,'missing repair contract on attempt '+index);
    assert.deepEqual(JSON.parse(block[1]).repairs,[repair]);
    assert.deepEqual(JSON.parse(block[1]).motionAudit,work.assetProduction.motionContinuityAudit);
    assert.equal(block[0],blocks[0][0]);
    assert.match(block[0],/Re-measure and recapture/);
  }
  assert.deepEqual(requests[1].format.required,['replace']);
  assert.match(requests[2].prompt,/SOURCE CONTENT REPAIR/);
  assert.ok(Buffer.byteLength(requests[1].prompt)<Buffer.byteLength(requests[0].prompt));
  for(const request of requests.slice(1))assert.equal(request.options.num_ctx,sourcePromptContextWindow(request.prompt,{baseContextWindow:32768,maxPredict:request.options.num_predict}));
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Roblox studio timeout recovery keeps compact source repair after malformed control output',async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  const work=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'studio-compact-repair'});
  work.goal='[STUDIO_QUALITY_EVOLUTION]\nRepair the existing usability flow.\n'+('Existing approved context. '.repeat(4000));
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      if(requests.length===3){res.writeHead(503);res.end('end probe');return;}
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify(requests.length===1?{error:'prediction aborted'}:{response:JSON.stringify({replace:'<think>invalid</think>'}),done:true})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests.length,3);
  assert.equal(requests[0].format,'json');
  assert.match(requests[0].prompt,/3-6 connected edits/);
  for(const request of requests.slice(1))assert.deepEqual(request.format.required,['replace']);
  assert.match(requests[2].prompt,/SOURCE CONTENT REPAIR/);
  assert.ok(Buffer.byteLength(requests[2].prompt)<Buffer.byteLength(requests[1].prompt)+2000);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('repeated Roblox control-token failures vary repair instructions and sampling while preserving source',{timeout:5000},async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'repeat-control-token'})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const replacement='<think>invalid</think>\nstatus.Text = "changed"';
      const response=requests.length===1?JSON.stringify({edits:[{path:relative,find:'status.Text = "ready"',replace:replacement}]})
        :JSON.stringify({replace:replacement});
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify({response,done:true,done_reason:'stop'})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/MODEL_CONTROL_TOKEN/);
  assert.equal(requests.length,4);
  assert.deepEqual(requests.map(row=>row.options.temperature),[0.08,0.16,0.24,0.32]);
  for(let i=1;i<4;i++){
    assert.match(requests[i].prompt,new RegExp('SOURCE REPAIR PASS '+i));
    assert.deepEqual(requests[i].format.required,['replace']);
    assert.match(requests[i].prompt,/Preserve save keys, gameplay values/);
  }
  assert.equal(new Set(requests.slice(1).map(row=>row.prompt)).size,3);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Roblox replace stream rejects split control tokens without waiting for completion',{timeout:5000},async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'stream-control-token'})));
  let aborted=false;
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const n=requests.length;
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      if(n===3){
        res.on('close',()=>{aborted=true;});
        res.write(JSON.stringify({response:'{"replace":"<thi',done:false})+'\n');
        setImmediate(()=>res.write(JSON.stringify({response:'nk>invalid',done:false})+'\n'));
        return; // 완료 신호 없이 열린 스트림도 교정 요청으로 넘어가야 한다.
      }
      const response=n===1?JSON.stringify({edits:[{path:relative,find:'missing anchor',replace:'changed'}]})
        :n===2?'{' :JSON.stringify({replace:'<think>invalid</think>'});
      res.end(JSON.stringify({response,done:true,done_reason:n===2?'length':'stop'})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/MODEL_CONTROL_TOKEN:STREAM_OUTPUT/);
  assert.equal(requests.length,4);
  assert.equal(aborted,true);
  assert.match(requests[3].prompt,/SOURCE CONTENT REPAIR/);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('final Luau syntax failure receives a real corrective request with rejected source and compiles before promotion',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'terminal-luau-syntax'})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const n=requests.length;
      const response=n===1?JSON.stringify({edits:[{path:relative,find:'missing anchor',replace:'changed'}]})
        :n===2?'{' :JSON.stringify({replace:n===3?'status.Text = )':'status.Text = "changed"'});
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify({response,done:true,done_reason:n===2?'length':'stop'})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd,luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
  assert.equal(requests.length,4);
  assert.equal(result.generation.attempts,4);
  assert.match(requests[3].prompt,/LUAU SYNTAX REPAIR/);
  assert.match(requests[3].prompt,/REJECTED REPLACEMENT.*status.Text = \)/);
  assert.match(requests[3].prompt,/SyntaxError/);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/terminal-luau-syntax/files',relative),'utf8'),/status.Text = "changed"/);
});

test('oversized Roblox rebuild starts with owned source and complete learning instead of a guaranteed oversized first request',async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  const work=order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'large-roblox-input'});
  work.goal='[SECOND_PLATFORM_ADAPTATION_REBUILD:ROBLOX]\n'+('Historical planner observation. '.repeat(10000));
  work.selectedTask={gameId:'demo',buildUpDirective:{
    directiveId:'demo-repair',thisLoopPrimaryGoal:'Synchronize the authoritative result with the existing HUD',
    responsibleSystemsAndFiles:{sourceAnchors:[{file:root+'/'+relative,line:2,symbol:'status',currentBehavior:'stale HUD',intendedBehavior:'show authoritative result',observableAcceptance:'two clients see the same result'}]},
    gameplayImplementationDirectives:['Keep server authority'],preserveConstraints:['SAVE_KEY_DEMO'],acceptanceEvidence:['TWO_CLIENT_RESULT_REQUIRED']
  }};
  const principle='id=persistent-contextual-action-controls;scope=mobile-interaction-observation;lesson=keep contextual controls visible;apply=keep controls beside play';
  work.knowledgeApplicationContract={mandatoryForGameTarget:true,verifiedExternalLearningIds:['external-black-box-demo'],verifiedExternalLearningRetrievedCount:1,retrievedVerifiedExternalLearningTruncationForbidden:true,allRetrievedPrinciplesHaveExplicitDisposition:true,verifiedExternalLearningDispositions:[{id:'persistent-contextual-action-controls',disposition:'APPLIED_GAME_SOURCE'}]};
  work.unifiedLearning={playbookReuse:[{id:'external-black-box-demo',verified:true,authority:'verified-task-playbook',distilledApplicationPrinciples:[principle],distilledAvoidancePrinciples:['Do not clone assets']}]};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));res.writeHead(503);res.end('probe ends before candidate generation');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests.length,1);
  const request=requests[0];
  assert.ok(Buffer.byteLength(request.prompt)<20000);
  assert.deepEqual(request.format.required,['replace']);
  assert.match(request.prompt,/Synchronize the authoritative result/);
  assert.match(request.prompt,/SAVE_KEY_DEMO/);
  assert.match(request.prompt,/TWO_CLIENT_RESULT_REQUIRED/);
  assert.ok(request.prompt.includes(principle));
  assert.doesNotMatch(request.prompt,/Do not clone assets/);
  assert.equal(work.unifiedLearning.playbookReuse[0].distilledAvoidancePrinciples.includes('Do not clone assets'),true);
  assert.match(request.prompt,/nonSourceAvoidanceAndUsePolicy=RETAINED_IN_VERIFIED_MEMORY_AND_QA/);
  assert.ok(request.options.num_predict>=1024);
  assert.ok(request.options.num_ctx>=16384);
  // 출시 후 집중 개선에도 같은 입력·출력 예산과 학습 보존을 적용한다.
  requests.length=0;
  work.goal=work.goal.replace('[SECOND_PLATFORM_ADAPTATION_REBUILD:ROBLOX]','[POST_RELEASE_FOCUSED_DEVELOPMENT]');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests.length,1);
  assert.ok(Buffer.byteLength(requests[0].prompt)<20000);
  assert.deepEqual(requests[0].format.required,['replace']);
  assert.ok(requests[0].prompt.includes(principle));
  assert.match(requests[0].prompt,/SAVE_KEY_DEMO/);
  assert.match(requests[0].prompt,/TWO_CLIENT_RESULT_REQUIRED/);
  assert.ok(requests[0].options.num_predict>=1024);
  assert.ok(requests[0].options.num_ctx>=16384);
  // 연결 패키지는 입력이 커도 한 앵커 수정으로 축소하지 않는다.
  requests.length=0;
  work.goal='[STUDIO_QUALITY_EVOLUTION]\n'+work.goal;
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests[0].format,'json');
  assert.match(requests[0].prompt,/3-6 connected edits/);
  assert.ok(requests[0].prompt.includes(principle));
  // 충분히 작은 일반 주문은 기존 전체 후보 경로를 유지한다.
  requests.length=0;
  work.goal='[SECOND_PLATFORM_ADAPTATION_REBUILD:ROBLOX]\nRepair the existing HUD';
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests[0].format,'json');
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('oversized initial JSON prompt caps editable context while preserving allowed scope',()=>{
  const files=Array.from({length:12},(_,index)=>`Assets/Scripts/Part${index}.cs`);
  const sections=files.map((file,index)=>[
    `=== FILE ${file} [EDITABLE] ===`,
    (`public sealed class Part${index} { public int Value = ${index}; }\n`).repeat(180)
  ].join('\n'));
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: improve the connected implementation',
    'Allowed edit paths: '+files.join(', '),
    ...sections
  ].join('\n');
  const compact=buildGenerationRetryPrompt(prompt,{responsibleFiles:files,attempt:1,oversizedInitial:true});
  assert.equal((compact.match(/^=== FILE /gm)||[]).length,3);
  assert.match(compact,/Allowed edit paths: .*Part11\.cs/);
  assert.ok(Buffer.byteLength(compact,'utf8')<36000);

  const studio=buildGenerationRetryPrompt('[STUDIO QUALITY EVOLUTION]\n'+prompt,{responsibleFiles:files,attempt:1,studioInitial:true});
  assert.equal((studio.match(/^=== FILE /gm)||[]).length,4);
  assert.ok(Buffer.byteLength(studio,'utf8')<36000);
});

test('oversized compact learning stays below source-generation budget even with many short principles',()=>{
  const id='external-many-short-principles';
  const principleCount=180;
  const rows=[];
  for(let index=0;index<principleCount;index++){
    rows.push('DISPOSITION=p'+index+':APPLIED_GAME_SOURCE;GAME=demo;TARGET=unity;DOMAINS=MOBILE_INPUT|UI_STATE;GENRE_MOOD=demo');
    rows.push('APPLY=id=p'+index+';scope=mobile;lesson=keep action '+index+' visible near the active control;apply=bind feedback '+index+' to the current state');
  }
  const learning=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions='+principleCount+'/'+principleCount+'; sourcePrinciples='+principleCount+'; validationOnly=0; truncation=FORBIDDEN',
    'sourcePromptScope=ALL_DISPOSED_APPLICATION_PRINCIPLES; nonSourceAvoidanceAndUsePolicy=RETAINED_IN_VERIFIED_MEMORY_AND_QA',
    'HARD SOURCE-WORKER RULE: implement every source principle without widening authority.',
    '[EXTERNAL_LEARNING '+id+']',
    ...rows,
    '[END_EXTERNAL_LEARNING '+id+']',
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  const file='Assets/Scripts/GameCore.cs';
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: improve the connected implementation',
    'Allowed edit paths: '+file,
    learning,
    '=== FILE '+file+' [EDITABLE] ===',
    ('public sealed class GameCore { public int Value = 1; }\n').repeat(900)
  ].join('\n');
  assert.ok(Buffer.byteLength(prompt,'utf8')>36000);
  const compactLearning=compactVerifiedExternalLearningBlockFromPrompt(prompt);
  assert.ok(Buffer.byteLength(compactLearning,'utf8')<16000);
  assertVerifiedExternalLearningPromptCoverage(compactLearning,{required:true,ids:[id]});
  const compact=buildGenerationRetryPrompt(prompt,{responsibleFiles:[file],attempt:1,oversizedInitial:true});
  assert.ok(Buffer.byteLength(compact,'utf8')<36000);
  assert.ok(Buffer.byteLength(compact,'utf8')<Buffer.byteLength(prompt,'utf8'));
  assertVerifiedExternalLearningPromptCoverage(compact,{required:true,ids:[id]});
});

test('oversized initial prompt compacts verified external learning without dropping learning ids or dispositions',()=>{
  const id='external-oversized-demo';
  const rows=Array.from({length:12},(_,index)=>[
    `DISPOSITION=principle-${index}:APPLIED_GAME_SOURCE;GAME=demo;TARGET=unity;DOMAINS=GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT;GENRE_MOOD=demo`,
    'APPLY=principle-'+index+' '+('source guidance '.repeat(420))
  ]).flat();
  const learning=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions=12/12; sourcePrinciples=12; validationOnly=0; truncation=FORBIDDEN',
    'sourcePromptScope=ALL_DISPOSED_APPLICATION_PRINCIPLES; nonSourceAvoidanceAndUsePolicy=RETAINED_IN_VERIFIED_MEMORY_AND_QA',
    'HARD SOURCE-WORKER RULE: preserve verified application intent.',
    `[EXTERNAL_LEARNING ${id}]`,
    ...rows,
    `[END_EXTERNAL_LEARNING ${id}]`,
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  const file='Assets/Scripts/GameCore.cs';
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: improve the connected implementation',
    'Allowed edit paths: '+file,
    learning,
    `=== FILE ${file} [EDITABLE] ===`,
    'public sealed class GameCore { public int FocusedLearningAnchor() { return 7; } }\n'
  ].join('\n');
  assert.ok(Buffer.byteLength(prompt,'utf8')>36000);
  const compactLearning=compactVerifiedExternalLearningBlockFromPrompt(prompt);
  assertVerifiedExternalLearningPromptCoverage(compactLearning,{required:true,ids:[id]});
  const compact=buildGenerationRetryPrompt(prompt,{responsibleFiles:[file],attempt:1,oversizedInitial:true});
  assert.ok(Buffer.byteLength(compact,'utf8')<36000);
  assertVerifiedExternalLearningPromptCoverage(compact,{required:true,ids:[id]});
  assert.match(compact,/principle-11:APPLIED_GAME_SOURCE/);
  assert.match(compact,/APPLY=principle-11/);

  const focused=buildFocusedReplaceOnlyPrompt(prompt,{
    error:new Error('Ollama 첫 출력 시간 초과: 120000ms'),
    responsibleFiles:[file]
  });
  assert.ok(focused);
  const focusedLearning=verifiedExternalLearningBlockFromPrompt(focused.prompt);
  assert.ok(Buffer.byteLength(focusedLearning,'utf8')<=8000);
  assertVerifiedExternalLearningPromptCoverage(focused.prompt,{required:true,ids:[id]});
  assert.match(focused.prompt,/principle-11:APPLIED_GAME_SOURCE/);
  assert.match(focused.prompt,/APPLY=principle-11/);
  assert.ok(Buffer.byteLength(focused.prompt,'utf8')<19000);
});


test('oversized multiline verified learning compacts every applied principle below initial prompt budget',()=>{
  const id='external-multiline-oversized';
  const rows=[];
  for(let index=0;index<80;index++){
    rows.push(`DISPOSITION=principle-${index}:APPLIED_GAME_SOURCE;GAME=demo;TARGET=unity;DOMAINS=GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT|MOBILE_INPUT;GENRE_MOOD=cohesive-action`);
    rows.push('APPLY=id=principle-'+index+';lesson='+('preserve exact gameplay intent and mobile feedback '.repeat(45))+'\n'+('continued implementation detail '.repeat(45)));
  }
  const learning=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions=80/80; sourcePrinciples=80; validationOnly=0; truncation=FORBIDDEN',
    'sourcePromptScope=ALL_DISPOSED_APPLICATION_PRINCIPLES; nonSourceAvoidanceAndUsePolicy=RETAINED_IN_VERIFIED_MEMORY_AND_QA',
    'HARD SOURCE-WORKER RULE: preserve verified application intent.',
    `[EXTERNAL_LEARNING ${id}]`,
    ...rows,
    `[END_EXTERNAL_LEARNING ${id}]`,
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  const file='Assets/Scripts/GameCore.cs';
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: improve the connected implementation',
    learning,
    'Allowed edit paths: '+file,
    `=== FILE ${file} [EDITABLE] ===`,
    ('public sealed class GameCore { public int Value = 1; }\n').repeat(700)
  ].join('\n');
  assert.ok(Buffer.byteLength(prompt,'utf8')>150000);
  const compactLearning=compactVerifiedExternalLearningBlockFromPrompt(prompt);
  assert.ok(Buffer.byteLength(compactLearning,'utf8')<20000);
  assertVerifiedExternalLearningPromptCoverage(compactLearning,{required:true,ids:[id]});
  assert.match(compactLearning,/DISPOSITION=principle-0:APPLIED_GAME_SOURCE;/);
  assert.match(compactLearning,/DISPOSITION=principle-79:APPLIED_GAME_SOURCE;/);
  assert.match(compactLearning,/APPLY=id=principle-0/);
  assert.match(compactLearning,/APPLY=id=principle-79/);
  const compact=buildGenerationRetryPrompt(prompt,{responsibleFiles:[file],attempt:1,oversizedInitial:true});
  assert.ok(Buffer.byteLength(compact,'utf8')<36000);
  assert.ok(Buffer.byteLength(compact,'utf8')<Buffer.byteLength(prompt,'utf8'));
  assertVerifiedExternalLearningPromptCoverage(compact,{required:true,ids:[id]});
});

test('large JSON prompts compact at 36KB and retry-only observation blocks stay bounded',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(workerSource,/const MAX_INITIAL_JSON_PROMPT_BYTES=36000;/);
  assert.match(workerSource,/const RETRY_OBSERVATION_CHUNK_BYTES=1600;/);
  assert.match(workerSource,/retry\?boundedLargeExcerpt\(block,RETRY_OBSERVATION_CHUNK_BYTES\)\.content:block/);
  assert.match(workerSource,/VIBE2_RETRY_OBSERVATION_COMPACTED/);
});

test('oversized initial compaction falls back to exact responsible files instead of growing the prompt',()=>{
  const cwd=tempRoot(),root=path.join(cwd,'unity-games/demo');
  write(path.join(root,'Assets/Scripts/GameCore.cs'),'public sealed class GameCore { public int State = 1; }\n');
  write(path.join(root,'Assets/Scripts/RuntimeBootstrap.cs'),'public sealed class RuntimeBootstrap { public int Boot = 1; }\n');
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    'Goal: implement the approved Unity Web gameplay baseline',
    'OVERSIZED_PLANNING_CONTEXT='+('duplicate planning detail '.repeat(14000)),
    'Allowed edit paths: Assets/Scripts/GameCore.cs, Assets/Scripts/RuntimeBootstrap.cs'
  ].join('\n');
  const compact=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    responsibleFiles:['Assets/Scripts/GameCore.cs','Assets/Scripts/RuntimeBootstrap.cs'],
    sourceRoot:root,
    attempt:1,
    multiFilePairRequired:true,
    oversizedInitial:true
  });
  assert.ok(Buffer.byteLength(prompt,'utf8')>36000);
  assert.ok(Buffer.byteLength(compact,'utf8')<36000);
  assert.ok(Buffer.byteLength(compact,'utf8')<Buffer.byteLength(prompt,'utf8'));
  assert.match(compact,/UNITY WEB BOOTSTRAP PAIR CONTRACT/);
  assert.match(compact,/=== FILE Assets\/Scripts\/GameCore\.cs \[EDITABLE\] ===/);
  assert.match(compact,/public sealed class GameCore/);
  assert.match(compact,/=== FILE Assets\/Scripts\/RuntimeBootstrap\.cs \[EDITABLE\] ===/);
  assert.match(compact,/public sealed class RuntimeBootstrap/);
  assert.doesNotMatch(compact,/duplicate planning detail duplicate planning detail duplicate planning detail/);
});

test('oversized standard JSON edit starts with bounded writable context instead of spending the first request on a guaranteed timeout',async(t)=>{
  const cwd=tempRoot(),root='web-games/demo',relative='index.html',requests=[];
  const source='<!doctype html>\n<button id="play">Play</button>\n<script>\n'+('const historicalObservation = "unchanged";\n'.repeat(3500))+'</script>\n';
  write(path.join(cwd,root,relative),source);
  const work=order({target:'web',root,responsibleFiles:[root+'/'+relative],taskId:'bounded-standard-input'});
  const principle='id=persistent-contextual-action-controls;scope=mobile-interaction-observation;lesson=keep contextual controls visible;apply=keep controls beside play';
  work.knowledgeApplicationContract={mandatoryForGameTarget:true,verifiedExternalLearningIds:['external-black-box-demo'],verifiedExternalLearningRetrievedCount:1,retrievedVerifiedExternalLearningTruncationForbidden:true,allRetrievedPrinciplesHaveExplicitDisposition:true,verifiedExternalLearningDispositions:[{id:'persistent-contextual-action-controls',disposition:'APPLIED_GAME_SOURCE'}]};
  work.unifiedLearning={playbookReuse:[{id:'external-black-box-demo',verified:true,authority:'verified-task-playbook',distilledApplicationPrinciples:[principle],distilledAvoidancePrinciples:['Do not clone assets']}]};
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(work));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));res.writeHead(503);res.end('probe ends before candidate generation');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests.length,1);
  const request=requests[0];
  assert.ok(Buffer.byteLength(request.prompt)<64000);
  assert.match(request.prompt,/INITIAL BOUNDED SOURCE REQUEST/);
  assert.doesNotMatch(request.prompt,/RECOVERY RETRY/);
  assert.doesNotMatch(request.prompt,/Previous failure:/);
  assert.match(request.prompt,/Allowed edit paths: index\.html/);
  assert.match(request.prompt,/=== FILE index\.html \[EDITABLE\](?: \[TRUNCATED\])? ===/);
  assert.match(request.prompt,/button id="play"/);
  assert.ok(request.prompt.includes(principle));
  assert.doesNotMatch(request.prompt,/Do not clone assets/);
  assert.equal(work.unifiedLearning.playbookReuse[0].distilledAvoidancePrinciples.includes('Do not clone assets'),true);
  assert.match(request.prompt,/nonSourceAvoidanceAndUsePolicy=RETAINED_IN_VERIFIED_MEMORY_AND_QA/);
  assert.deepEqual(request.format,'json');
});


test('oversized retry prompt bounds a giant single-line goal while preserving explicit learning and writable scope',()=>{
  const hugeGoal='Goal: BEGIN_PRIORITY '+('duplicate-detail '.repeat(18000))+' END_PRIORITY';
  const learning=[
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING BEGIN]',
    'dispositions=1/1; sourcePrinciples=1; validationOnly=0; truncation=FORBIDDEN',
    '[EXTERNAL_LEARNING external-black-box-demo]',
    'DISPOSITION=principle-1:APPLIED_GAME_SOURCE;GAME=demo;TARGET=unity;DOMAINS=UI_UX_LAYOUT_FEEDBACK_AND_TOUCH_READABILITY;GENRE_MOOD=neutral',
    'APPLY=keep the primary mobile control visible beside the active gameplay state',
    '[END_EXTERNAL_LEARNING external-black-box-demo]',
    '[VERIFIED EXTERNAL BLACK-BOX LEARNING END]'
  ].join('\n');
  const prompt=[
    'You are the Vibe2 game source worker. Return JSON only.',
    'Engine: unity',
    hugeGoal,
    learning,
    'Allowed edit paths: Assets/Scripts/GameCore.cs',
    '=== FILE Assets/Scripts/GameCore.cs [EDITABLE] ===',
    'public class GameCore { public int State = 1; }'
  ].join('\n');
  const retry=buildGenerationRetryPrompt(prompt,{
    allowFullRewrite:false,
    error:new Error('Ollama 응답 시간 초과: 240000ms'),
    responsibleFiles:['Assets/Scripts/GameCore.cs'],
    attempt:2,
    sourceRoot:'unity-games/demo'
  });
  assert.ok(Buffer.byteLength(retry,'utf8')<20000);
  assert.match(retry,/Goal: BEGIN_PRIORITY/);
  assert.match(retry,/END_PRIORITY/);
  assert.match(retry,/COMPACTED_DUPLICATE_DETAIL/);
  assert.match(retry,/APPLY=keep the primary mobile control visible/);
  assert.match(retry,/Allowed edit paths: Assets\/Scripts\/GameCore\.cs/);
  assert.doesNotMatch(retry,/duplicate-detail (?:duplicate-detail ){200}/);
});

test('Roblox repeated assignment stream aborts before completion and retries without applying partial source',{timeout:5000},async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'stream-repeat'})));
  let aborted=false;
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      if(requests.length===3){res.writeHead(503);res.end('end probe');return;}
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      if(requests.length===1){res.end(JSON.stringify({error:'prediction aborted'})+'\n');return;}
      res.on('close',()=>{aborted=true;});
      const repeated='particles.ParticleEmissionRateSpreadDirection = Vector3.new(0, 0, 1)\n';
      const encoded=JSON.stringify({replace:repeated.repeat(8)}).slice(0,-2);
      const cut=encoded.length-3;
      res.write(JSON.stringify({response:encoded.slice(0,cut),done:false})+'\n');
      setImmediate(()=>res.write(JSON.stringify({response:encoded.slice(cut),done:false})+'\n'));
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  await assert.rejects(runVibe2SourceWorker({cwd,applySource:true}),/Ollama HTTP 503/);
  assert.equal(requests.length,3);
  assert.equal(aborted,true);
  assert.match(requests[2].prompt,/SOURCE REPETITION REPAIR/);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
});

test('Roblox repetition guard preserves short runs and repetitions already present in source',{timeout:5000},async(t)=>{
  for(const originalRepetitions of [0,8]){
    const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau';
    const repeated='status.Text = "existing deliberately repeated status assignment"\n';
    const source='local status = {Text = "ready"}\n'+repeated.repeat(originalRepetitions)+'status.Text = "ready"\n';
    write(path.join(cwd,root,relative),source);
    write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'allowed-repeat-'+originalRepetitions})));
    let requests=0;
    const server=http.createServer((req,res)=>{
      req.resume();req.on('end',()=>{
        requests++;
        res.writeHead(200,{'content-type':'application/x-ndjson'});
        if(requests===1){res.end(JSON.stringify({error:'prediction aborted'})+'\n');return;}
        const replace='local status = {Text = "changed"}\n'+repeated.repeat(originalRepetitions||7)+'status.Text = "changed"';
        res.end(JSON.stringify({response:JSON.stringify({replace}),done:true})+'\n');
      });
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
    try{
      const result=await runVibe2SourceWorker({cwd,luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
      assert.equal(result.generation.attempts,2);
      assert.equal(requests,2);
      assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
    }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
});


test('Roblox focused context keeps complete boundary lines and separates the sole editable anchor',()=>{
  const sourceRoot=tempRoot(),relative='client/Game.client.luau';
  const anchor='status.BackgroundColor3 = Color3.fromRGB(20, 40, 60)';
  const source=['local before = "'+('b'.repeat(1600))+'"',
    'local status = script.Parent',anchor,'status.Visible = true',
    'local after = "'+('a'.repeat(1600))+'"'].join('\n');
  const prompt=['Engine: roblox','Goal: improve visual presentation','Allowed edit paths: '+relative,'',
    '=== FILE '+relative+' [EDITABLE] ===',source].join('\n');
  write(path.join(sourceRoot,relative),source);
  for(const root of ['',sourceRoot]){
    const focused=buildFocusedReplaceOnlyPrompt(prompt,{sourceRoot:root,responsibleFiles:[relative]});
    assert.equal(focused.spec.find,anchor);
    assert.equal(focused.spec.context,['local status = script.Parent',anchor,'status.Visible = true'].join('\n'));
    assert.match(focused.prompt,/Code before and after it remains in the file unchanged/);
    assert(focused.prompt.includes('[EXACT FIND ANCHOR BEGIN]\n'+anchor+'\n[EXACT FIND ANCHOR END]'));
    assert.equal(normalizeFocusedReplaceOnly({replace:anchor.replace('20, 40, 60','30, 50, 70')},focused.spec).edits[0].find,anchor);
  }
  assert.equal(fs.readFileSync(path.join(sourceRoot,relative),'utf8'),source);
});

test('owner direct source is protected even when a stale work order claims another game',async()=>{
  const root=tempRoot();
  try{
    write(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify({ownerCanonicalRules:{ownerExclusiveDevelopment:{status:'ACTIVE',gameIds:['owner-game']}}}));
    write(path.join(root,'order.json'),JSON.stringify({run:true,workMode:'source-change-candidate',workerPolicy:{directMainWrite:false},target:'roblox',gameId:'other',source:{root:'roblox-games/owner-game'}}));
    await assert.rejects(runVibe2SourceWorker({cwd:root,workOrderFile:'order.json'}),/OWNER_DIRECT_DEVELOPMENT_HELD:owner-game/);
    assert.equal(fs.existsSync(path.join(root,'.vibe2/candidates')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('world lobby tasks require source generation instead of cosmetic or diagnostic shortcuts',()=>{
  const base={target:'roblox',presentationQuality:{required:true,pass:'ASSET_ADAPTATION'}};
  assert.equal(robloxDeterministicPresentationEligible(base),true);
  for(const binding of [
    {selectedTask:{evidence:['world-lobby-first:v1']}},
    {evidence:['world-lobby-first:v1']},
    {goal:'[WORLD_LOBBY_FIRST]\ncreate a real village lobby'},
    {originalGoal:'[WORLD_LOBBY_FIRST]'},
    {selectedTask:{goal:'[WORLD_LOBBY_FIRST]'}}
  ]){
    const order={...base,...binding};
    assert.equal(robloxDeterministicPresentationEligible(order),false);
    assert.equal(deterministicRobloxBuildUpCandidate({order,sourceRoot:'/unused',responsibleFiles:['client/Game.client.luau']}),null);
    assert.equal(deterministicDiagnosticCandidate({order,sourceRoot:'/unused'}),null);
  }
});

test('workflow order, model provisioning and budget share source-worker eligibility',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');
  assert.match(workflow,/const deterministicRoblox=robloxDeterministicPresentationEligible\(order\)/);
  assert.match(workflow,/deterministic_source="\$\{\{ steps\.order\.outputs\.deterministic_source \}\}"/);
  assert.doesNotMatch(workflow,/deterministic_source="\$\(node -e/);
});

test('repeated Luau syntax recovery reconstructs from valid source rather than recycling rejected code',{skip:!process.env.VIBE2_TEST_LUAU_COMPILER},async(t)=>{
  const cwd=tempRoot(),root='roblox-games/demo',relative='client/Game.client.luau',requests=[];
  const source='local status = {Text = "ready"}\nstatus.Text = "ready"\n';
  write(path.join(cwd,root,relative),source);
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(order({target:'roblox',root,responsibleFiles:[root+'/'+relative],taskId:'repeated-luau-syntax'})));
  const server=http.createServer((req,res)=>{
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      requests.push(JSON.parse(body));
      const n=requests.length;
      const response=n===1?JSON.stringify({edits:[{path:relative,find:'missing anchor',replace:'changed'}]})
        :JSON.stringify({replace:n<4?'status.Text = )':'status.Text = "changed"'});
      res.writeHead(200,{'content-type':'application/x-ndjson'});
      res.end(JSON.stringify({response,done:true,done_reason:'stop'})+'\n');
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(11434,'127.0.0.1',resolve);});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const result=await runVibe2SourceWorker({cwd,luauCompiler:process.env.VIBE2_TEST_LUAU_COMPILER});
  assert.equal(requests.length,4);
  assert.match(requests[2].prompt,/REJECTED REPLACEMENT.*status.Text = \)/);
  assert.match(requests[3].prompt,/LUAU REPAIR PASS 2/);
  assert.match(requests[3].prompt,/ORIGINAL valid anchor/);
  assert.doesNotMatch(requests[3].prompt,/REJECTED REPLACEMENT/);
  assert.notEqual(requests[3].prompt,requests[2].prompt);
  assert.equal(requests[3].options.temperature,0.16);
  assert.equal(result.generation.attempts,4);
  assert.equal(fs.readFileSync(path.join(cwd,root,relative),'utf8'),source);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/repeated-luau-syntax/files',relative),'utf8'),/status.Text = "changed"/);
});

test('Luau focused anchors follow the named responsibility instead of unrelated short cleanup',()=>{
  const root=tempRoot(),relative='server/Game.server.luau';
  const unrelated='  if sparkles then sparkles:Destroy() end';
  const owned='  lobby.Parent = workspace';
  const source=['local function feedback()',unrelated,'end','',
    'local function buildLobby()',
    '  local lobby = Instance.new("Model")',owned,'end'].join('\n');
  write(path.join(root,relative),source);
  for(const directive of [false,true]){
    const prompt=['Engine: roblox','Goal: improve the existing world lobby','Allowed edit paths: '+relative,
      directive?'[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]\nsourceAnchors=roblox-games/demo/'+relative+':5 FUNCTION buildLobby CURRENT=world INTENDED=lobby ACCEPT=walkable\n[GAME SPECIFIC BUILD UP DIRECTIVE END]':'',
      '', '=== FILE '+relative+' [EDITABLE] ===','local function feedback()',unrelated,'end'].filter(Boolean).join('\n');
    const focused=buildFocusedReplaceOnlyPrompt(prompt,{sourceRoot:root,responsibleFiles:[relative],preferredTargets:directive?[]:['buildLobby']});
    assert.notEqual(focused.spec.find,unrelated);
    assert.ok([owned,'  local lobby = Instance.new("Model")'].includes(focused.spec.find));
    assert.ok(source.includes(focused.spec.find));
    assert.ok(focused.spec.context.includes('local function buildLobby()'));
  }
  assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
});

test('Luau focused anchors fall back to directive line hints when the symbolic label is not a real function name',()=>{
  const root=tempRoot(),relative='client/Game.client.luau';
  const source=[
    'local function helper()',
    '  local s=Instance.new("Sound");s.Parent=game.SoundService',
    'end',
    '',
    'local function renderQuestHud()',
    '  local panel=Instance.new("Frame")',
    '  panel.BackgroundColor3=Color3.fromRGB(20,20,20)',
    '  panel.Visible=true',
    'end'
  ].join('\n');
  write(path.join(root,relative),source);
  const prompt=[
    'Engine: roblox',
    'Goal: improve the quest HUD presentation',
    'Allowed edit paths: '+relative,
    '[GAME SPECIFIC BUILD UP DIRECTIVE BEGIN]',
    'sourceAnchors=roblox-games/demo/'+relative+':7 SYSTEM QuestHudPresentation CURRENT=flat INTENDED=readable ACCEPT=visible',
    '[GAME SPECIFIC BUILD UP DIRECTIVE END]',
    '',
    '=== FILE '+relative+' [EDITABLE] ===',
    'local function helper()',
    '  local s=Instance.new("Sound");s.Parent=game.SoundService',
    'end'
  ].join('\n');
  const focused=buildFocusedReplaceOnlyPrompt(prompt,{sourceRoot:root,responsibleFiles:[relative],preferredTargets:[]});
  assert.equal(focused.spec.find,'  panel.BackgroundColor3=Color3.fromRGB(20,20,20)');
  assert.ok(focused.spec.context.includes('local function renderQuestHud()'));
});



// 자산 적용은 실제 소스 근거가 있으면 개수 상한 없이 허용한다.
test('graphics replacement accepts more than sixty grounded applications and still rejects duplicates',()=>{
  const reuseMode='ADAPT_RESTYLE_AND_RETARGET';
  const rows=Array.from({length:75},(_,i)=>({surface:'VFX',path:'effects.js',bindingKey:'effect'+i,reuseMode,sourceEvidence:'const effect'+i+' = createImpactVfx('+i+');'}));
  const candidate={edits:[{path:'effects.js',find:'old',replace:rows.map(row=>row.sourceEvidence).join('\n')}],graphicsReplacementReport:{actualCount:rows.length,changedSurfaces:['VFX'],reuseModesUsed:[reuseMode],replacementEvidence:rows,before:'기존 효과',after:'호환 자산으로 연결한 효과'}};
  const contract={required:true,adaptiveCount:{minimumActual:1,maximumActual:60},surfaces:['VFX'],reuseModes:[reuseMode]};
  assert.equal(evaluateGraphicsReplacementReport({candidate,contract}).pass,true);
  candidate.graphicsReplacementReport.replacementEvidence[74]=rows[0];
  assert.equal(evaluateGraphicsReplacementReport({candidate,contract}).pass,false);
});


test('package asset repair evidence survives focused and oversized worker prompts without changing its identity',()=>{
  const workerSource=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  const guidanceStart=workerSource.indexOf('const SOURCE_REPAIR_DIRECTIVE_PREFIXES=');
  const guidanceEnd=workerSource.indexOf('export function buildRobloxNativeSourceInspection(',guidanceStart);
  const boundedStart=workerSource.indexOf('function boundedPromptText(');
  const boundedEnd=workerSource.indexOf('export function buildPrompt(',boundedStart);
  const {guidance,compact}=runInNewContext(
    'const COMPACT_DIRECTIVE_LINE_BYTES=1800;\n'+workerSource.slice(boundedStart,boundedEnd)+'\n'
      +workerSource.slice(guidanceStart,guidanceEnd)
      +'\n({guidance:gameSpecificBuildUpDirectiveGuidance,compact:buildUpDirectiveBlockFromPrompt})',
    {Buffer,console,robloxProductionPromptLines,clean:value=>String(value??'').trim(),posix:value=>String(value??'').replaceAll('\\','/'),
      unique:values=>[...new Set((values||[]).map(value=>String(value??'').trim()).filter(Boolean))]}
  );
  const source='a'.repeat(40),relative='client/Game.client.luau';
  const blockers=['ROBLOX_PACKAGE_INTERNAL_ASSET_SOURCE_BINDING_TRACE_REQUIRED',
    ...ROBLOX_INTERNAL_ASSET_FAMILIES.map(family=>'ROBLOX_PACKAGE_ASSET_FAMILY_STATUS_MISSING:'+family),
    'ROBLOX_PACKAGE_PRIMITIVE_ONLY_OR_COLOR_ONLY_FORBIDDEN'];
  const policy={mode:'GAME_SOURCE_BINDINGS_ONLY',preserveInternalAssetLibrary:true,preserveAssetFiles:true,allowAssetLibraryWrites:false,requireActualNativeConsumption:true};
  const hint='Preserve internal assets. Repair the existing game-side native consumer; never add marker-only PASS.';
  const failure={authority:'roblox-package-asset-binding-failure',sourceRevision:source,artifactIdentity:null,
    assetThreshold:{pass:false,blockers},assetRepairPolicy:policy,
    qualityFailureDetails:blockers.map(id=>({id,hint}))};
  const directive={directiveId:'package-binding-current-source',thisLoopPrimaryGoal:'Repair existing asset consumers',
    primaryFocus:'PRESENTATION',nextActionDecision:{action:'CAUSAL_REPAIR'},
    playtestRuntimeFindings:{studioQualityFailure:failure,runtimeObserved:false,runtimePassed:false},
    responsibleSystemsAndFiles:{sourceAnchors:Array.from({length:8},(_,index)=>({file:relative,line:index+2,symbol:'render',intendedBehavior:'connect the existing native consumer '.repeat(100),observableAcceptance:'fresh package validation'}))},
    visualBuildUpDirective:{domains:{UI:'connected visible detail '.repeat(3000)}},
    preserveConstraints:['Keep gameplay and internal asset files unchanged'],acceptanceEvidence:['CURRENT_SOURCE_PACKAGE_VALIDATION_REQUIRED']};
  const block=guidance({target:'roblox',selectedTask:{buildUpDirective:directive}},[relative]);
  const verify=prompt=>{
    const line=prefix=>prompt.split('\n').find(value=>value.startsWith(prefix))?.slice(prefix.length);
    assert.deepEqual(JSON.parse(line('sourceRepairIdentity=')),{authority:failure.authority,sourceRevision:source,artifactIdentity:null});
    assert.deepEqual(JSON.parse(line('sourceRepairBlockers=')),blockers);
    assert.deepEqual(JSON.parse(line('sourceRepairPolicy=')),policy);
    assert.equal(line('sourceRepairHints='),hint);
    assert.match(prompt,/nextVibeAction=CAUSAL_REPAIR/);
    assert.doesNotMatch(prompt,/runtimeObserved[=:]\s*true|runtimePassed[=:]\s*true/);
  };
  verify(block);
  for(const options of [{compact:true},{compact:true,focusedRobloxVisual:true},{compact:true,focusedPresentation:true}])verify(compact(block,options));
  const cwd=tempRoot();
  try{
    const content='local panel = script.Parent\npanel.BackgroundColor3=Color3.fromRGB(20,30,40)\n';
    write(path.join(cwd,relative),content);
    const prefix=['Engine: roblox','Goal: repair the current package asset binding',block,'Allowed edit paths: '+relative].join('\n');
    const focused=buildFocusedReplaceOnlyPrompt(prefix+'\n=== FILE '+relative+' [EDITABLE] ===\n'+content,{sourceRoot:cwd,responsibleFiles:[relative]});
    verify(focused.prompt);
    const oversized=prefix+'\nOVERSIZED_PLANNING_CONTEXT='+('unrelated planning detail '.repeat(16000));
    const retry=buildGenerationRetryPrompt(oversized,{sourceRoot:cwd,responsibleFiles:[relative],attempt:1,oversizedInitial:true});
    verify(retry);
    assert.ok(Buffer.byteLength(retry)<36000);
    assert.match(retry,/INITIAL BOUNDED SOURCE REQUEST/);
    for(const patch of [{sourceRevision:'invalid'},{artifactIdentity:'sha256:'+'b'.repeat(64)},
      {authority:'unknown'},{assetThreshold:{pass:true,blockers}},{assetThreshold:{pass:false,blockers:[]}}]){
      const rejected=guidance({target:'roblox',selectedTask:{buildUpDirective:{...directive,playtestRuntimeFindings:{studioQualityFailure:{...failure,...patch}}}}},[relative]);
      assert.doesNotMatch(rejected,/sourceRepairIdentity=/);
    }
  }finally{fs.rmSync(cwd,{recursive:true,force:true});}
  assert.equal(directive.playtestRuntimeFindings.runtimeObserved,false);
  assert.equal(directive.playtestRuntimeFindings.runtimePassed,false);
});
