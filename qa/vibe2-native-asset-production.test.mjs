// 파일명: qa/vibe2-native-asset-production.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assetProductionGuidance,buildVibeAssetProductionPlan,discoverExistingRobloxGameAssets,discoverRuntimeVisualEvidence,inspectVibeSourceGlb} from '../tools/vibe2-asset-production-plan.mjs';
import {observeAssetReferenceImages,observeAssetRuntimeCaptures,buildPrompt,deterministicRobloxBuildUpCandidate,buildInternalAssetSourceUsageContract} from '../tools/vibe2-source-worker.mjs';
import {createVibeReferenceImageStudyRequest,createVibeMapDetailReconstruction} from '../assets/vibe-environment-director.js';
import {findPresentationQualityTask,findRobloxStudioAssetBackfillTask,findWeatherPresentationTask,planVibe2AutonomousTasks} from '../tools/vibe2-auto-planner.mjs';
import {runIncrementalQa} from '../tools/vibe2-incremental-qa.mjs';
import {buildRobloxStudioAssetBootstrapPlan,compileRobloxSource} from '../tools/company-development-roblox-bootstrap.mjs';

test('Roblox BUILD_UP loadout uses the exact same canonical selection as GameConfig bootstrap',()=>{
  const assetLibrary=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const config=fs.readFileSync('roblox-games/bug-defense/shared/GameConfig.luau','utf8');
  const field=name=>String(config.match(new RegExp('\\b'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'))?.[1]||'').trim();
  const profile={genre:field('Genre'),subgenre:field('Subgenre')};
  const bootstrap=buildRobloxStudioAssetBootstrapPlan({gameId:'bug-defense',profile,assetLibrary});
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{gameId:'bug-defense',goal:'기존 Roblox 게임 BUILD_UP에서 내부 자산 전 계열을 실제 책임 소스에 적용'}
  });
  assert.equal(plan.baseMaterialLoadout.selectionAuthority,'company-development-roblox-bootstrap.mjs#buildRobloxStudioAssetBootstrapPlan');
  assert.equal(plan.baseMaterialLoadout.robloxSelectionExactMatch,true);
  assert.equal(plan.baseMaterialLoadout.robloxSelectionFingerprint,bootstrap.selectionFingerprint);
  assert.equal(plan.baseMaterialLoadout.robloxSelectionLibraryVersion,bootstrap.libraryVersion);
  assert.deepEqual(plan.baseMaterialLoadout.families,bootstrap.families);
  assert.equal(plan.baseMaterialLoadout.universalAssetFirst.allFamiliesEvaluated,true);
  assert.equal(plan.baseMaterialLoadout.universalAssetFirst.missingFamilies.length,0);
});

test('Vibe source asset consumption is genre-agnostic fit-first and incrementally synchronized',()=>{
  const order={
    gameId:'demo',
    target:'roblox',
    assetProduction:{
      baseMaterialLoadout:{
        libraryVersion:76,
        universalAssetFirst:{required:true},
        families:{
          WEAPON:['BLADE_LONG','GRIP_LONG'],
          MOTION:['ATTACK_LIGHT_1','HIT_FRONT'],
          VFX:['IMPACT_FLASH'],
          AUDIO:['ATTACK_SWING_LIGHT'],
          UI:['FRAME_PANEL']
        }
      },
      flowAssetLoadout:{
        selections:[
          {requirementId:'weapon-primary',assetId:'common-sword',family:'WEAPON',role:'MELEE_WEAPON',sourceFiles:['assets/roblox/common-tools-v1/RobloxCommonTools.luau']}
        ]
      },
      decisions:[
        {type:'item',applyFirst:{candidates:[
          {id:'common-sword',family:'WEAPON',role:'MELEE_WEAPON',sourceFiles:['assets/roblox/common-tools-v1/RobloxCommonTools.luau']}
        ]}}
      ]
    }
  };
  const a=buildInternalAssetSourceUsageContract(order);
  const b=buildInternalAssetSourceUsageContract({...order,assetProduction:{...order.assetProduction,baseMaterialLoadout:{
    ...order.assetProduction.baseMaterialLoadout,
    families:{
      UI:['FRAME_PANEL'],
      AUDIO:['ATTACK_SWING_LIGHT'],
      VFX:['IMPACT_FLASH'],
      MOTION:['HIT_FRONT','ATTACK_LIGHT_1'],
      WEAPON:['GRIP_LONG','BLADE_LONG']
    }
  }}});
  assert.equal(a.fingerprint,b.fingerprint);
  assert.equal(a.eligibility.genreRestrictionApplied,false);
  assert.equal(a.eligibility.crossGenreReuseAllowed,true);
  assert.equal(a.eligibility.qualityScoreIsUsageGate,false);
  assert.equal(a.eligibility.lowScoreCompatibleAssetUseAllowed,true);
  assert.equal(a.eligibility.safeCompatibleFallbackPreferredOverBlank,true);
  assert.equal(a.eligibility.safeCompatibleFallbackPreferredOverPrimitivePlaceholder,true);
  assert.equal(a.eligibility.qualityMayNotOverrideRoleMismatch,true);
  assert.equal(a.eligibility.lowerScoreExactFitMayWin,true);
  assert.equal(a.applicationCoverage.noArtificialAssetCountCap,true);
  assert.equal(a.applicationCoverage.noArtificialFamilyUseCap,true);
  assert.equal(a.applicationCoverage.noArtificialGameplaySignalCoverageCap,true);
  assert.equal(a.applicationCoverage.noArtificialCombinationCap,true);
  assert.equal(a.applicationCoverage.contextBudgetIsNotUsageCap,true);
  assert.equal(a.synchronization.fullLibraryReplicationForbidden,true);
  assert.equal(a.synchronization.selectedSubsetOnly,true);
  assert.equal(a.synchronization.changedFamilyRebindOnly,true);
  assert.deepEqual(a.exactFamilies.WEAPON,['BLADE_LONG','GRIP_LONG']);
  assert.equal(a.version,3);
  assert.ok(a.usageMatrix.length>=72);
  assert.ok(a.usageMatrix.some(row=>row.signal==='ATTACK_OR_COMBO'&&row.families.includes('WEAPON')&&row.families.includes('MOTION')));
  for(const signal of [
    'SKILL_PRESENTATION_GRAMMAR','INTERACTION_ACTION_GRAMMAR','COMMON_UI_FACTORY_REUSE',
    'ENEMY_REGION_VARIANT','THREAT_TIER_COMMON_ELITE_BOSS','NPC_PROFESSION_ROLE','NPC_EMOTION_RELATION_STATE',
    'BUILDING_ROLE','BUILDING_INTERIOR_FUNCTION','TOOL_TARGET_PAIR_PRESENTATION','ITEM_RARITY_OR_REWARD_TIER',
    'CONTEXTUAL_ACTION_UI','SPATIAL_SOUNDSCAPE_ZONE','MULTIPLAYER_PRESENTATION_REPLICATION',
    'WORLD_DENSITY_AND_IMPORTANCE','EQUIPMENT_SOCKET_AND_STANCE_SYNC',
    'WAVE_ROUND_PHASE_STATE','SHOP_TRADE_PURCHASE_STATE','CRAFTING_RECIPE_QUEUE_STATE',
    'PUZZLE_INTERACTION_STATE','DEFENSE_PLACEMENT_WAVE_STATE','TYCOON_PRODUCTION_SERVICE_STATE',
    'STEALTH_DETECTION_STATE','PROJECTILE_FLIGHT_IMPACT_STATE','COMPANION_PET_COMMAND_STATE',
    'SEASON_WORLD_EVENT_STATE','TRAVERSAL_MODE_STATE','MACHINE_POWER_OPERATION_STATE',
    'DOOR_GATE_LOCK_STATE','SAFE_DANGER_ZONE_STATE','CHECKPOINT_SAVE_FEEDBACK_STATE',
    'TELEPORT_PORTAL_TRANSITION_STATE','SOCIAL_EMOTE_INTERACTION_STATE','GENERIC_EXISTING_STATE_OR_EVENT'
  ])assert.ok(a.usageMatrix.some(row=>row.signal===signal),signal);
  assert.match(a.usageMatrix.find(row=>row.signal==='HIT_DIRECTION_AND_STRENGTH').rule,/CRITICAL/);
  assert.match(a.usageMatrix.find(row=>row.signal==='SKILL_PRESENTATION_GRAMMAR').rule,/PROJECTILE\/BEAM\/AOE\/SUMMON\/BUFF\/DEBUFF\/HEAL\/TELEPORT\/TRANSFORM\/ULTIMATE/);
  assert.match(a.usageMatrix.find(row=>row.signal==='DAY_NIGHT_LIGHTING_ACTIVITY').rule,/AURORA/);
  assert.match(a.usageMatrix.find(row=>row.signal==='NPC_EMOTION_RELATION_STATE').rule,/ALERT.*CONFIDENT/);
  assert.match(a.usageMatrix.find(row=>row.signal==='EQUIPMENT_SOCKET_AND_STANCE_SYNC').rule,/equippedWeaponId/);
  assert.match(a.usageMatrix.find(row=>row.signal==='INTERACTION_ACTION_GRAMMAR').rule,/OPEN\/CLOSE\/GATHER\/MINE\/CHOP\/DIG\/CRAFT\/SIT\/PUSH\/PULL\/CARRY\/REVIVE\/MOUNT/);
  assert.equal(a.synchronization.selectedCommonSourceApiDiscovery,true);
  assert.equal(a.synchronization.selectedCommonSourcesDerivedFromSelectedFamiliesOnly,true);
  assert.equal(a.commonSourceReuse.existingFactoryBeforeNewImplementation,true);
  assert.equal(a.repetitionControl.simpleRandomVariantSelectionForbidden,true);
  assert.equal(a.repetitionControl.usageHistoryAndLineageMustBePreserved,true);
  assert.deepEqual(a.sourceConsumptionSequence,[
    'INSPECT_CURRENT_SYSTEM_STATE_EVENT_ATTRIBUTE_TAG_ROLE',
    'SEARCH_SELECTED_INTERNAL_ASSET_EXACT_FAMILY_ROLE',
    'READ_SELECTED_COMMON_SCRIPT_OR_FACTORY_API',
    'COMPOSE_COMPATIBLE_MULTI_FAMILY_PRESENTATION',
    'ADAPT_TO_EXISTING_GAME_STYLE',
    'BIND_DIRECTLY_IN_EXISTING_RESPONSIBLE_FUNCTION',
    'AUTHOR_ONLY_REMAINING_PRESENTATION_GAP'
  ]);
  assert.equal(a.adaptiveSignalRouting.enabled,true);
  assert.equal(a.adaptiveSignalRouting.explicitMatrixIsFloorNotCeiling,true);
  assert.equal(a.adaptiveSignalRouting.inspectExistingSourceEventsAndStateNames,true);
  assert.equal(a.adaptiveSignalRouting.unknownEventMayNotCreateGameplaySystem,true);
  assert.equal(a.adaptiveSignalRouting.unknownEventMayNotInventAssetIdFactoryRoleOrState,true);
  assert.equal(a.adaptiveSignalRouting.selectedApplicableFamiliesIntersectionRequired,true);
  assert.deepEqual(a.sourceCandidates[0].sourceFiles,['assets/roblox/common-tools-v1/RobloxCommonTools.luau']);
});

test('Vibe source loads only selected internal asset API context with hard bounds',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/sourceApiContextOnlyForSelectedAssets:true/);
  assert.match(source,/fullLibraryReplicationForbidden:true/);
  assert.match(source,/fullCatalogPromptInjectionForbidden:true/);
  assert.match(source,/apiContextBatchSize:4/);
  assert.match(source,/apiContextMaxBytes:18000/);
  assert.match(source,/apiContextPerFileMaxBytes:4500/);
  assert.match(source,/apiContextRotationByBuildUpGeneration:true/);
  assert.match(source,/allSelectedApiSourcesRemainEligibleAcrossCycles:true/);
  assert.match(source,/const start=\(\(generation-1\)\*batchSize\)%allSelectedPaths\.length/);
  assert.match(source,/internalAssetApiContextEligibleSourceCount:allSelectedPaths\.length/);
  assert.match(source,/internalAssetApiContext:true/);
  assert.match(source,/editable:false/);
  assert.match(source,/Do not invent an asset ID, pack, factory, source file, or role/);
  assert.match(source,/Genre NEVER removes an otherwise compatible internal asset from eligibility/);
  assert.match(source,/high-quality wrong-role asset must lose/i);
  assert.match(source,/Internal quality score is NOT a usage gate/);
  assert.match(source,/leaving a blank\/default\/primitive presentation/);
  assert.match(source,/NO artificial asset-count, family-count, gameplay-signal, or combination cap/);
  assert.match(source,/Context\/API batching is only synchronization optimization and MUST NOT become a usage cap/);
  assert.match(source,/rotates by BUILD_UP generation/i);
  assert.match(source,/every selected compatible source remains eligible for later cycles/i);
  assert.match(source,/explicit signal matrix is a FLOOR, not a ceiling/i);
  assert.match(source,/Unknown source events may use the generic presentation fallback/i);
  assert.match(source,/never perform full-library resync/i);
  assert.match(source,/assets\/roblox\/common-ui-v1\/RobloxCommonUI\.luau/);
  assert.match(source,/assets\/roblox\/common-vfx-v1\/RobloxCommonVFX\.luau/);
  assert.match(source,/assets\/roblox\/common-motion-v1\/RobloxCommonMotion\.luau/);
  assert.match(source,/assets\/roblox\/common-environment-v1\/RobloxCommonEnvironment\.luau/);
  assert.match(source,/assets\/vibe-motion-director\.js/);
  assert.match(source,/selected-family common API candidates include RobloxCommonUI/);
  assert.match(source,/simple random asset swapping is forbidden/);
  assert.match(source,/matching RobloxCommonUI Create\* factory first/);
});

test('persisted DCC asset binding does not depend on duplicate presentation metadata',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dcc-binding-candidate-'));
  try{
    const sourceRoot=path.join(root,'roblox-games','demo');
    const clientDir=path.join(sourceRoot,'client');
    fs.mkdirSync(clientDir,{recursive:true});
    fs.writeFileSync(path.join(clientDir,'Game.client.luau'),[
      'local gui = Instance.new("ScreenGui")',
      'local root = Instance.new("Frame")',
      'root.Parent = gui'
    ].join('\n')+'\n','utf8');
    const generated=[{
      path:'assets/generated/roblox/demo/prop/asset.glb',
      artifactHash:'a'.repeat(64),
      assetId:'demo-prop',
      family:'PROP'
    }];
    const result=deterministicRobloxBuildUpCandidate({
      order:{gameId:'demo',target:'roblox',assetProductionLane:true},
      sourceRoot,
      sourceRootRelative:'roblox-games/demo',
      responsibleFiles:['client/Game.client.luau'],
      generatedAssetBindings:generated,
      allowAssetDevelopment:true
    });
    assert.ok(result);
    assert.equal(result.generation.deterministicGeneratedAssetBinding,true);
    const text=result.candidate.edits.map(row=>row.replace).join('\n');
    assert.match(text,/GeneratedNativeAssetPath1/);
    assert.ok(text.includes(generated[0].path));
    assert.ok(text.includes(generated[0].artifactHash));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('asset Web zero-output and first-output timers keep the normal long model budget',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/ASSET_DEVELOPMENT_WEB_TIMEOUT_MS=Math\.max\(240000,DEFAULT_TIMEOUT_MS\)/);
  assert.match(source,/assetDevelopmentLane&&target==='web'\?ASSET_DEVELOPMENT_WEB_TIMEOUT_MS:ZERO_OUTPUT_RETRY_TIMEOUT_MS/);
  assert.match(source,/firstOutputTimeoutMs=assetDevelopmentLane&&target==='web'\?ASSET_DEVELOPMENT_WEB_TIMEOUT_MS:MODEL_FIRST_OUTPUT_TIMEOUT_MS/);
  assert.match(source,/Math\.min\(timeoutMs,firstOutputTimeoutMs\)/);
});

test('Web fully consumes the same visual loadout as Unity and imports a shared customization document',()=>{
  const asset={id:'icon',family:'UI',types:['ui'],license:'project-original',sourceHash:'icon-v1',customization:{controls:{color:{kind:'COLOR',axis:'MATERIAL',target:'Fill'}}},platformVariants:{
    WEB:{path:'icon.svg',contentHash:'web-v1',derivedFromHash:'icon-v1',bindings:{color:{kind:'COLOR',target:'fill'}}},
    UNITY:{path:'Icon.prefab',contentHash:'unity-v1',derivedFromHash:'icon-v1',bindings:{color:{kind:'COLOR',target:'Image.color'}}}
  }};
  const common={manifest:{assets:[asset]},presetCatalog:{presets:[]}};
  const web=buildVibeAssetProductionPlan({...common,target:'web',task:{gameId:'shared-game',goal:'UI 아이콘 커마',styleFamily:'CARTOON',assetCustomization:{recipes:[{family:'UI',baseAssetId:'icon',parameters:{color:[.2,.4,.6]}}]}}});
  assert.equal(web.assetSynchronization.status,'READY_FOR_PLATFORM_APPLICATION');
  const unity=buildVibeAssetProductionPlan({...common,target:'unity',task:{gameId:'shared-game',goal:'UI 아이콘 커마',assetCustomization:{sharedDocument:web.assetSynchronization.document}}});
  assert.equal(unity.assetSynchronization.status,'READY_FOR_PLATFORM_APPLICATION');
  assert.deepEqual(web.baseMaterialLoadout.families,unity.baseMaterialLoadout.families);
  assert.deepEqual(web.styleBible,unity.styleBible);
  assert.equal(web.companyGraphicsLibrary.platformProfile,'WEB');
  assert.equal(web.baseMaterialLoadout.universalAssetFirst.required,true);
  assert.match(assetProductionGuidance(unity),/UNITY \/ WEB SHARED VISUAL DOCUMENT/);
});

test('image-only asset input delivers actual pixels and binds observations to the image hash',async()=>{
  const request=createVibeReferenceImageStudyRequest({sourceId:'dokkaebi',sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',imageRef:'assets/roblox/world-ghosts/dokkaebi.png',purpose:'ASSET_CREATION'});
  let calls=0;
  const order={assetProduction:{imageAssetCreation:{enabled:true,studies:[{request}]}}};
  const observed=await observeAssetReferenceImages({order,model:'fixture-vision',requestModel:async(prompt,options)=>{
    calls++;assert.match(prompt,/attached image pixels/);assert.ok(Buffer.from(options.images[0],'base64').length>1000);
    return JSON.stringify(Object.fromEntries(request.requestedFields.map(key=>[key,key==='UNSEEN_REGIONS'?'Back detail is a creative proposal':'fixture visible observation'])));
  }});
  assert.equal(calls,1);assert.equal(observed.observations[0].pixelInputDelivered,true);
  assert.equal(observed.observations[0].sourceHash,'62b78067eccddaf6e137fac3a2c4d5eaf95e502971070d9c68c2a188fc1bf492');
  assert.equal(observed.observations[0].verifiedAgainstSource,false);
  assert.equal(observed.observations[0].generatedAsset,false);
  assert.ok(!JSON.stringify(observed).includes('iVBOR'));
  const prompt=buildPrompt({...order,target:'web',imageAssetObservation:observed},{files:[{path:'index.html',content:'<main></main>',editable:true}]},['index.html']);
  assert.match(prompt,/IMAGE ASSET OBSERVATION BEGIN/);
  await assert.rejects(observeAssetReferenceImages({order,model:''}),/VISION_MODEL_REQUIRED/);
  const bad={assetProduction:{imageAssetCreation:{enabled:true,studies:[{request:{...request,imageRef:'../outside.png'}}]}}};
  await assert.rejects(observeAssetReferenceImages({order:bad,model:'fixture'}),/LOCAL_REFERENCE_REQUIRED/);
  await assert.rejects(observeAssetReferenceImages({order,model:'fixture',requestModel:async()=>'{}'}),/OBSERVATION_INCOMPLETE/);
});

test('current runtime screenshots become bounded visual repairs and never treat uncertainty as a missing object',async()=>{
  const task={gameId:'runtime-review',goal:'실제 게임 화면 디테일 검수',assetRuntimeVisualReview:{
    sourceRevision:'rev-current',platforms:['ROBLOX'],requiredSurfaces:['ROBLOX_STUDIO'],requiredViews:['GAME_CAMERA'],
    captures:[{id:'studio-game',platform:'ROBLOX',surface:'ROBLOX_STUDIO',view:'GAME_CAMERA',sceneId:'spawn',imageRef:'assets/roblox/world-ghosts/dokkaebi.png',sourceRevision:'rev-current',viewport:{width:1280,height:720}}],
    expectedSubjects:[
      {id:'hero',role:'CHARACTER',required:true,mustBeVisibleIn:['GAME_CAMERA'],identityAnchors:['ONE_HORN']},
      {id:'shrine',role:'LANDMARK',required:true,mustBeVisibleIn:['GAME_CAMERA']}
    ],
    editableTargets:['hero','shrine','scene-lighting'],visualGoals:['mobile silhouette readability','landmark presence']
  }};
  const plan=buildVibeAssetProductionPlan({target:'roblox',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(plan.runtimeVisualReview.status,'READY_FOR_PIXEL_INSPECTION');
  assert.equal(plan.runtimeVisualReview.captures[0].sourceRevision,'rev-current');
  let calls=0;
  const observed=await observeAssetRuntimeCaptures({order:{assetProduction:plan},model:'fixture-vision',requestModel:async(prompt,options)=>{
    calls++;assert.match(prompt,/ACTUAL runtime screenshot pixels/);assert.match(prompt,/ROBLOX_STUDIO/);
    assert.ok(Buffer.from(options.images[0],'base64').length>1000);
    return JSON.stringify({
      visibleSubjects:['hero'],missingSubjects:['shrine'],uncertainSubjects:[],
      findings:[
        {id:'missing-shrine',severity:'HIGH',category:'MISSING_OBJECT',regionNormalized:[0,0,1,1],targetIds:['shrine'],observed:'Required shrine is not visible in the gameplay view',requestedChange:'Restore the expected shrine using the existing landmark responsibility'},
        {id:'hero-detail',severity:'MEDIUM',category:'WEAK_DETAIL',regionNormalized:[.2,.1,.3,.6],targetIds:['hero'],observed:'Hero silhouette loses small-scale material separation',requestedChange:'Strengthen existing hero material separation without changing identity'}
      ]
    });
  }});
  assert.equal(calls,1);assert.equal(observed.status,'VISUAL_REPAIR_REQUIRED');assert.equal(observed.pixelInspectionPerformed,true);
  assert.equal(observed.repairs.length,2);assert.equal(observed.captures[0].pixelInputDelivered,true);
  assert.equal(observed.captures[0].sourceRevision,'rev-current');assert.match(observed.captures[0].artifactHash,/^[a-f0-9]{64}$/);
  const prompt=buildPrompt({target:'roblox',assetProduction:plan,runtimeVisualObservation:observed},{files:[{path:'client/Game.client.luau',content:'local ready = true',editable:true}]},['client/Game.client.luau']);
  assert.match(prompt,/RUNTIME VISUAL REVIEW BEGIN/);assert.match(prompt,/missing-shrine/);assert.match(prompt,/Never convert uncertain\/off-camera\/occluded evidence into an addition/);
  assert.ok(!prompt.includes('iVBOR'));

  const uncertain=await observeAssetRuntimeCaptures({order:{assetProduction:plan},model:'fixture-vision',requestModel:async()=>JSON.stringify({
    visibleSubjects:['hero'],missingSubjects:[],uncertainSubjects:['shrine'],findings:[]
  })});
  assert.equal(uncertain.status,'REVIEW_EVIDENCE_REQUIRED');assert.equal(uncertain.repairs.length,0);

  const stale=buildVibeAssetProductionPlan({target:'roblox',task:{...task,assetRuntimeVisualReview:{...task.assetRuntimeVisualReview,captures:[{...task.assetRuntimeVisualReview.captures[0],sourceRevision:'old'}]}},manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(stale.runtimeVisualReview.status,'CAPTURES_REQUIRED');
  await assert.rejects(observeAssetRuntimeCaptures({order:{assetProduction:stale},model:'fixture-vision'}),/RUNTIME_VISUAL_CAPTURES_REQUIRED/);
});

test('detail and measured motion repair reach the production work order and use registry source identity',()=>{
  const frames=Array.from({length:31},(_,index)=>({timeSeconds:index/30,rootPosition:[0,0,0],rootYawRadians:0,jointPositions:{hip:[0,1,0]},contacts:{foot:{planted:true,worldPosition:[index*.01,0,0]}}}));
  const input={target:'web',task:{gameId:'review',goal:'모션 디테일',motionContinuityTrace:{assetId:'clip',sourceHash:'old',expectedSourceHash:'old',clipId:'idle',durationSeconds:1,characterHeightMeters:2,frames}},manifest:{assets:[{id:'clip',family:'MOTION',sourceHash:'current',types:['animation'],license:'project-original'}]},presetCatalog:{presets:[]}};
  const stale=buildVibeAssetProductionPlan(input);
  assert.equal(stale.motionContinuityAudit.verdict,'UNVERIFIED');
  assert.ok(stale.motionContinuityAudit.issues.includes('CURRENT_SOURCE_HASH_REQUIRED'));
  input.task.motionContinuityTrace.sourceHash='current';
  const measured=buildVibeAssetProductionPlan(input);
  assert.equal(measured.motionContinuityAudit.verdict,'FAIL');
  assert.equal(measured.motionContinuityAudit.violations[0].region,'foot');
  const guidance=assetProductionGuidance(measured);
  assert.match(guidance,/STYLE COMPARISON AND LOCAL REPAIR/);assert.match(guidance,/MEASURED CONTINUOUS MOTION/);assert.match(guidance,/editableParameters/);assert.match(guidance,/frameRange/);
  input.manifest.assets[0].motionQA={requiredDetailChannels:{attachments:['grip']},limits:{maxAttachmentOffset:.01}};
  input.task.motionContinuityTrace.requiredDetailChannels={};
  input.task.motionContinuityTrace.limits={maxAttachmentOffset:100};
  const missing=buildVibeAssetProductionPlan(input);
  assert.equal(missing.motionContinuityAudit.verdict,'UNVERIFIED');
  assert.ok(missing.motionContinuityAudit.issues.includes('INVALID_DETAIL_SAMPLE:attachments:grip:0'));
  for(const frame of frames){frame.contacts.foot.worldPosition=[0,0,0];frame.attachments={grip:{active:true,effectorWorldPosition:[.1,0,0],targetWorldPosition:[0,0,0]}};}
  const contact=buildVibeAssetProductionPlan(input);
  assert.equal(contact.motionContinuityAudit.assetId,'clip');
  assert.equal(contact.motionContinuityAudit.verdict,'FAIL');
  assert.equal(contact.motionContinuityAudit.thresholds.maxAttachmentOffset,.01);
  assert.equal(contact.motionContinuityAudit.violations[0].region,'grip');
  const workerPrompt=buildPrompt({target:'web',assetProduction:contact},{files:[]},[]);
  assert.match(workerPrompt,/ASSET DETAIL REPAIR BEGIN/);assert.match(workerPrompt,/"maxAttachmentOffset"/);
});

test('navigation sketch preserves actual route topology and expands functional detail layers deterministically',()=>{
  const sketch={nodes:[{id:'entry',role:'spawn'},{id:'market',role:'landmark'},{id:'exit',role:'transition'}],edges:[{from:'entry',to:'market'},{from:'market',to:'exit',oneWay:true}],districts:[{id:'market-block',anchorNodeId:'market',function:'MARKET'}]};
  const assets=[{id:'shop',family:'BUILDING',sourceHash:'shop-v1',mapDetailRoles:['STRUCTURE'],districtFunctions:['MARKET']}];
  const a=createVibeMapDetailReconstruction({sketch,assets,seed:'same',styleFamily:'DARK_FANTASY'});
  assert.equal(a.status,'DETAIL_AUTHORING_PLAN');assert.equal(a.topology.edges[1].oneWay,true);
  assert.equal(a.regions[0].layers.length,6);assert.equal(a.regions[0].layers[1].assetId,'shop');
  assert.deepEqual(a,createVibeMapDetailReconstruction({sketch,assets,seed:'same',styleFamily:'DARK_FANTASY'}));
  assert.equal(a.spatialScale.status,'SCALE_AUTHORING_REQUIRED');assert.equal(a.runtimeVerified,false);
  const bad=createVibeMapDetailReconstruction({sketch:{...sketch,edges:[{from:'entry',to:'market'}]}});
  assert.equal(bad.status,'MAP_INTERPRETATION_REQUIRED');assert.deepEqual(bad.regions,[]);
  const empty=createVibeMapDetailReconstruction();assert.equal(empty.topology,null);
});

test('source GLB inventory uses real binary structure and leaves absent morphs or rigging for authoring',()=>{
  const source=inspectVibeSourceGlb({source:{path:'assets/roblox/world-ghosts/native/mesh/bride.glb'}});
  assert.equal(source.status,'INSPECTED_RECONSTRUCTION_INPUT');
  assert.ok(source.inventory.meshCount>0);assert.ok(source.inventory.animations.length>0);
  assert.ok(source.requiredAuthoring.includes('AUTHOR_MORPHS_WHEN_SHAPE_CUSTOMIZATION_NEEDED'));
  assert.equal(source.generatedAsset,false);
  assert.equal(inspectVibeSourceGlb({source:{path:'../outside.glb'}}).status,'SOURCE_GLB_REQUIRED');
  const wrong=inspectVibeSourceGlb({source:{path:'assets/roblox/world-ghosts/native/mesh/bride.glb',sourceHash:'wrong'}});
  assert.ok(wrong.issues.includes('GLB_SOURCE_HASH_MISMATCH'));
  const plan=buildVibeAssetProductionPlan({target:'unity',task:{gameId:'reconstruct',goal:'디테일',sourceGlbs:[{path:'assets/roblox/world-ghosts/native/mesh/bride.glb'}],imageToAsset:true,referenceImages:[{sourceId:'ref',sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',path:'assets/roblox/world-ghosts/dokkaebi.png'}],mapReconstruction:{sketch:{}}}});
  assert.equal(plan.sourceGlbReconstruction[0].sourceHash,source.sourceHash);
  const guidance=assetProductionGuidance(plan);
  for(const term of ['BASIC GLB TO DETAILED ASSET','IMAGE-TO-ASSET CREATION','BASIC MAP TO DETAILED WORLD'])assert.ok(guidance.includes(term));
});

test('customization and detailed style instructions reach the existing asset work order input',()=>{
  const plan=buildVibeAssetProductionPlan({target:'roblox',task:{
    gameId:'customization-review',goal:'다크 카툰 캐릭터 배경 UI 아이콘 모션',
    concept:{styles:[{family:'CARTOON',weight:.6},{family:'DARK_FANTASY',weight:.4}]},
    assetCustomization:{recipes:[{family:'UI',subfamily:'ICON',baseAssetId:'test-icon',parameters:{tint:[.1,.2,.3]}}]}
  },manifest:{assets:[{id:'test-icon',family:'UI',types:['ui'],license:'project-original',platforms:['roblox'],sourceHash:'fixture-v1',customization:{controls:{tint:{kind:'COLOR',axis:'MATERIAL',target:'IconFill'}}}}]},presetCatalog:{presets:[]}});
  assert.equal(plan.styleBible.profileKey,'TOON_NOIR');
  assert.equal(plan.motionStyle.profileKey,'TOON_NOIR');
  assert.equal(plan.assetCustomization.items[0].status,'DECLARED_BINDINGS_READY');
  assert.equal(plan.assetCustomization.items[0].operations[0].target,'IconFill');
  assert.equal(plan.assetCustomization.runtimeVerified,false);
  assert.equal(plan.assetCustomization.minimumQuality.referenceRole,'OWNER_SELECTED_VISUAL_QUALITY_FLOOR_NOT_RUNTIME_PROOF');
  assert.ok(fs.existsSync(plan.assetCustomization.minimumQuality.referencePath));
  const guidance=assetProductionGuidance(plan);
  for(const text of ['도깨비','UI·아이콘','24/32/48/64px','Blender','실제 모션 변형 지침','IconFill','UNVERIFIED'])assert.ok(guidance.includes(text),text);
  assert.equal(plan.assetCustomization.effort.representativeWorkPlanningMinutes,360);
});

test('motion planning reuses company clips per state and does not invent coverage or runtime proof',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'motion-reuse-'));
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({assets:[{
      id:'owned-motion',category:'MOTION',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
      license:'company-owned',platforms:['roblox'],states:['idle','attack'],rigType:'R15'
    }]}));
    const plan=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task:{gameId:'demo',goal:'공격 모션'},presetCatalog:{presets:[]},manifest:{assets:[
      {id:'external-motion',types:['animation'],license:'CC0',platforms:['roblox'],sourceUrl:'https://example.invalid/clips',downloaded:false,animations:['attack','move']},
      {id:'unknown-clips',types:['animation'],license:'project-original',platforms:['roblox'],path:'roblox-games/demo/clips.json'},
      {id:'reference-motion',referenceOnly:true,types:['animation'],license:'project-original',platforms:['roblox'],states:['death']},
      {id:'wrong-platform',types:['animation'],license:'CC0',platforms:['unity'],states:['death']},
      {id:'blocked-license',types:['animation'],license:'CC-BY-NC',platforms:['roblox'],states:['skill']}
    ]}});
    const motion=plan.decisions.find(row=>row.type==='animation');
    assert.equal(motion.decisionOrder[1],'REUSE_VERIFIED_COMPANY_ASSET');
    assert.deepEqual(motion.motionReusePlan.stateBindings.find(row=>row.state==='attack').candidateIds,['owned-motion','external-motion']);
    assert.deepEqual(motion.motionReusePlan.stateBindings.find(row=>row.state==='move').candidateIds,['external-motion']);
    assert.deepEqual(motion.motionReusePlan.unresolvedStates,['hit','skill','death']);
    assert.deepEqual(motion.motionReusePlan.coverageUnknownCandidateIds,['unknown-clips']);
    assert.equal(motion.motionReusePlan.runtimeVerified,false);
    assert.ok(motion.motionReusePlan.stateBindings.every(row=>row.runtimeVerified===false));
    assert.equal(motion.companyCandidates[0].rigType,'R15');
    assert.equal(motion.decisionOrder[0],'COMPARE_TARGET_GAME_QUALITY');
    assert.equal(motion.qualitySelection.selectedAssetId,null);
    assert.equal(motion.qualitySelection.selectionState,'DOWNLOAD_REQUIRED_BEFORE_INTERNAL_COMPARISON');
    assert.equal(motion.postDownloadComparison.required,true);
    assert.deepEqual(motion.postDownloadComparison.internalBaselineCandidateIds,['owned-motion','unknown-clips']);
    assert.deepEqual(motion.postDownloadComparison.pendingDownloadCandidateIds,['external-motion']);
    assert.ok(motion.qualitySelection.compareCandidateIds.includes('external-motion'));
    assert.ok(!motion.qualitySelection.compareCandidateIds.includes('reference-motion'));
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/attack=owned-motion\|external-motion/);
    assert.match(guidance,/Asset ID를 지어내지/);
    assert.match(guidance,/MULTIPLAYER_SYNC/);
    assert.match(guidance,/기존 공격 판정/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

const VERIFIED_ROBLOX_LEARNING_REUSE=Object.freeze({
  id:'external-black-box-bootstrap-test',
  project:'verified-runtime-reference',
  sourceRevision:'test-fixture',
  distilledApplicationPrinciples:[
    'id=compact-tactical-state-with-immediate-feedback;scope=gameplay;lesson=compact tactical state with immediate feedback;apply=compact-tactical-state-with-immediate-feedback'
  ],
  distilledAvoidancePrinciples:['do not copy raw source or assets'],
  distilledLearningUseAllowed:['general gameplay feedback principle'],
  distilledLearningUseForbidden:['raw source, binaries, or asset expression']
});
const verifiedRobloxPlaybooks=()=>({
  taskTypes:{
    roblox:{authority:'VERIFIED_PLAYBOOK',checklist:['server authority','mobile input'],reuse:[VERIFIED_ROBLOX_LEARNING_REUSE]},
    coding:{checklist:['bounded source change'],reuse:[]}
  }
});

function writePolicy(root,{pilot='fantasy-survival'}={}){
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning','platform-release-roadmap.json'),JSON.stringify({
    version:209,
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:'company-learning/platform-release-roadmap.json',
    humanDocumentRequired:false,
    assetProductionParallelContract:{
      version:2,enabled:true,
      firstAdoption:{gameId:pilot,targetPlatforms:['UNITY','ROBLOX']},
      platformAssetSeparation:{
        webAssetDirectReuseIntoUnityForbidden:true,
        webAssetDirectReuseIntoRobloxForbidden:true
      }
    },
    weatherPresentationContract:{
      version:1,enabled:true,
      firstAdoption:{gameId:pilot,surfaces:['WEB_COMPANION','UNITY','ROBLOX']},
      canonicalStates:['CLEAR','RAIN','FOG','SNOW','STORM'],
      regionalExtensions:['VOLCANIC_ASH','HEAT_HAZE']
    }
  },null,2));
}

function tempRoot(opts={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-native-weather-'));
  execFileSync('git',['init','-q'],{cwd:root});
  writePolicy(root,opts);
  return root;
}

test('verified commercial black-box distillation is mandatory input for internal asset evolution',()=>{
  const verifiedLearning={
    exactKnowledgeIds:['PLAYBOOK_REUSE:external-black-box-commercial-ui','PLAYBOOK_REUSE:external-black-box-commercial-motion'],
    playbookReuse:[
      {id:'external-black-box-commercial-ui',project:'commercial-app-a',sourceRevision:'sha256:a',score:0.7,verified:true,authority:'verified-task-playbook',sourcePlaybooks:['ui','graphics'],distilledApplicationPrinciples:['menu hierarchy keeps first playable state obvious']},
      {id:'external-black-box-commercial-motion',project:'commercial-app-b',sourceRevision:'sha256:b',score:0.6,verified:true,authority:'verified-task-playbook',sourcePlaybooks:['motion','graphics'],distilledApplicationPrinciples:['interaction feedback is spatially anchored and immediate']}
    ]
  };
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'internal-asset-evolution',goal:'menu UI graphics motion internal asset development'},
    target:'roblox',executionLane:'asset-development',verifiedLearning,
    manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.commercialDistillation.required,true);
  assert.equal(plan.commercialDistillation.ready,true);
  assert.equal(plan.commercialDistillation.verifiedReuseCount,2);
  assert.equal(plan.commercialDistillation.retrievedCount,2);
  assert.equal(plan.commercialDistillation.appliedCount,2);
  assert.equal(plan.commercialDistillation.identityBoundVerifiedExternalIds.length,2);
  assert.equal(plan.commercialDistillation.verifiedReuse.every(row=>row.distilledApplicationPrinciples.length>0),true);
  assert.equal(plan.commercialDistillation.matchedCount,2);
  assert.equal(plan.commercialDistillation.exactRetrievedSetBinding,true);
  assert.equal(plan.commercialDistillation.applicationCoveragePct,100);
  assert.equal(plan.commercialDistillation.mandatoryApplicationCoveragePct,100);
  assert.equal(plan.commercialDistillation.applicationMode,'TRANSFORMATIVE_INTERNAL_ASSET_EVOLUTION');
  assert.equal(plan.commercialDistillation.internalAssetEvolutionRequired,true);
  assert.equal(plan.commercialDistillation.rawCommercialAssetCopyForbidden,true);
  assert.equal(plan.commercialDistillation.rawCommercialCodeCopyForbidden,true);
  assert.equal(plan.commercialDistillation.distinctiveMenuSceneOrAnimationCloneForbidden,true);
  assert.ok(plan.commercialDistillation.applyAxes.includes('MENU_FLOW_AND_INFORMATION_ARCHITECTURE'));
  assert.ok(plan.commercialDistillation.applyAxes.includes('GRAPHICS_ART_DIRECTION_MATERIAL_LIGHTING_AND_COMPOSITION'));
  assert.ok(plan.commercialDistillation.applyAxes.includes('MOTION_ANIMATION_TRANSITIONS_IMPACT_AND_SECONDARY_MOTION'));
  assert.ok(plan.commercialDistillation.applyAxes.includes('GAMEPLAY_SYSTEM_IMPLEMENTATION_WHEN_CAUSALLY_RELEVANT'));
  assert.ok(plan.commercialDistillation.evolutionLoop.includes('REAUTHOR_OR_RECOMPOSE_INTERNAL_ASSET'));
  assert.ok(plan.commercialDistillation.evolutionLoop.includes('RETURN_VERIFIED_OUTCOME_TO_LEARNING'));
  const guidance=assetProductionGuidance(plan);
  assert.match(guidance,/상업용 블랙박스 증류 적용=필수/);
  assert.match(guidance,/내부 자산으로 재저작·재구성/);
});

test('internal asset development rejects partial binding of retrieved verified external learning',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'internal-asset-partial-learning',goal:'menu UI graphics motion internal asset development'},
    target:'roblox',
    executionLane:'asset-development',
    verifiedLearning:{
      exactKnowledgeIds:['PLAYBOOK_REUSE:external-black-box-commercial-ui','PLAYBOOK_REUSE:external-black-box-commercial-motion'],
      playbookReuse:[
        {id:'external-black-box-commercial-ui',project:'commercial-app-a',sourceRevision:'sha256:a',score:0.7,verified:true,authority:'verified-task-playbook',sourcePlaybooks:['ui','graphics'],distilledApplicationPrinciples:['menu hierarchy keeps first playable state obvious']}
      ]
    },
    manifest:{version:1,assets:[]},
    presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.commercialDistillation.required,true);
  assert.equal(plan.commercialDistillation.ready,false);
  assert.equal(plan.commercialDistillation.allRetrievedVerifiedExternalApplied,false);
  assert.equal(plan.commercialDistillation.retrievedCount,2);
  assert.equal(plan.commercialDistillation.appliedCount,1);
  assert.equal(plan.commercialDistillation.matchedCount,1);
  assert.equal(plan.commercialDistillation.exactRetrievedSetBinding,false);
  assert.equal(plan.commercialDistillation.applicationCoveragePct,50);
  assert.equal(plan.commercialDistillation.identityBoundVerifiedExternalIds.length,1);
});

test('internal asset development is not ready when verified commercial distillation is absent',()=>{
  const plan=buildVibeAssetProductionPlan({
    task:{gameId:'internal-asset-missing-learning',goal:'graphics motion UI asset development'},
    target:'unity',executionLane:'asset-development',verifiedLearning:{playbookReuse:[],exactKnowledgeIds:[]},
    manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
  });
  assert.equal(plan.commercialDistillation.required,true);
  assert.equal(plan.commercialDistillation.ready,false);
  assert.equal(plan.commercialDistillation.verifiedReuseCount,0);
  assert.equal(plan.commercialDistillation.retrievedCount,0);
  assert.equal(plan.commercialDistillation.appliedCount,0);
  assert.equal(plan.commercialDistillation.applicationCoveragePct,0);
  assert.equal(plan.commercialDistillation.exactRetrievedSetBinding,false);
});

test('hero asset planning upgrades only hero requests to the stronger local model',()=>{
  const hero=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{gameId:'hero-demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] primary boss 보스 외형과 모션을 스튜디오급으로 개선'},
    manifest:{assets:[]},presetCatalog:{presets:[]}
  });
  assert.equal(hero.modelRouting.heroRequested,true);
  assert.equal(hero.modelRouting.selectedModel,'qwen3:4b-instruct');
  assert.equal(hero.modelRouting.cacheFamily,'vibe2-ollama-v6');
  assert.equal(hero.modelRouting.cacheKey,'qwen3-4b-instruct');
  assert.equal(hero.modelRouting.baselineModel,'qwen3:1.7b');
  assert.equal(hero.modelRouting.maxAttemptsUnchanged,true);
  assert.equal(hero.nativeAuthoringExecution.enabled,true);
  assert.equal(hero.nativeAuthoringExecution.completion.authoringRequestIsNotCompletion,true);
  assert.ok(hero.nativeAuthoringExecution.dcc.requiredTypes.length>0);
  assert.equal(hero.nativeAuthoringExecution.dcc.executionRequired,true);
  assert.equal(hero.nativeAuthoringExecution.dcc.nativeSourceMayNotMaskDccRequirement,true);
  assert.equal(hero.nativeAuthoringExecution.dcc.executionStatus,'AUTHORING_RECIPE_REQUIRED');
  const guidance=assetProductionGuidance(hero);
  assert.match(guidance,/ASSET MODEL ROUTING/);
  assert.match(guidance,/NATIVE AUTHORING EXECUTION LOOP/);

  const ordinary=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{gameId:'ordinary-demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 일반 환경 소품 정리'},
    manifest:{assets:[]},presetCatalog:{presets:[]}
  });
  assert.equal(ordinary.modelRouting.heroRequested,false);
  assert.equal(ordinary.modelRouting.selectedModel,'qwen3:1.7b');
});

test('native asset production defaults to Roblox and exposes reproducible Blender authoring evidence',()=>{
  const root=tempRoot();
  try{
    const policyFile=path.join(root,'company-learning','platform-release-roadmap.json');
    const policy=JSON.parse(fs.readFileSync(policyFile,'utf8'));
    policy.gameSeed={initialTargetPlatform:'ROBLOX',allowedTargetPlatforms:['ROBLOX','UNITY'],pausedTargetPlatforms:['FORTNITE_UEFN']};
    fs.writeFileSync(policyFile,JSON.stringify(policy,null,2));

    const presetCatalog={version:4,presets:[{
      id:'native-rpg',name:'Native RPG',genre:'rpg',defaultNativeTarget:'roblox',
      keywords:['캐릭터','몬스터','배경','무기'],actorAssets:[],effectAssets:[],toolCandidates:[],
      platformProfiles:{
        roblox:{qualityTarget:'native-roblox-production',input:['virtual-stick'],modules:['animation'],performance:['mobile-memory-budget']},
        unity:{qualityTarget:'native-unity-production',input:['virtual-stick'],modules:['animation'],performance:['mobile-memory-budget']},
        webValidation:{qualityTarget:'validation-only',input:['touch'],modules:[],performance:[]}
      }
    }]};
    const common={
      repoRoot:root,
      task:{gameId:'native-default',goal:'캐릭터 몬스터 배경 무기 3D 그래픽 제작'},
      manifest:{version:1,assets:[]},
      presetCatalog
    };
    const plan=buildVibeAssetProductionPlan(common);
    assert.equal(plan.target,'roblox');
    assert.equal(plan.targetResolution.source,'CENTRAL_POLICY_INITIAL_NATIVE_TARGET');
    assert.equal(plan.targetResolution.explicit,false);
    assert.deepEqual(plan.activeNativeTargets,['ROBLOX','UNITY']);
    assert.deepEqual(plan.pausedNativeTargets,['FORTNITE_UEFN']);
    assert.equal(plan.productionProfile.nativePrimaryTarget,'roblox');
    assert.equal(plan.productionProfile.webValidationSurfaceOnly,true);
    assert.ok(plan.decisions.some(row=>row.directAuthoring.includes('blender-python-original-mesh-rig-and-glb')));
    assert.equal(plan.generatedAssetOutputContract.deterministicSourceRecipeRequired,true);
    assert.equal(plan.generatedAssetOutputContract.previewRenderRequired,true);
    assert.equal(plan.generatedAssetOutputContract.evidenceJsonRequired,true);
    assert.equal(plan.generatedAssetOutputContract.nativeRuntimeVerificationRequiredBeforeVerifiedPromotion,true);
    assert.equal(plan.generatedAssetOutputContract.exactRuntimeConsumerAssetIdentityRequired,true);
    assert.equal(plan.generatedAssetOutputContract.promotionMustBindSourceOrDerivedHash,true);
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRequired,true);
    assert.equal(plan.nativeAuthoringExecution.dcc.executionStatus,'PARTIAL_AUTHORING_RECIPE_COVERAGE');
    assert.ok(plan.nativeAuthoringExecution.dcc.executionRequestCount>=1);
    assert.ok(plan.nativeAuthoringExecution.dcc.genericRecipeCount>=1);
    assert.ok(plan.nativeAuthoringExecution.dcc.genericRecipeTypes.some(type=>['background','item','weapon','prop','environment'].includes(type)));
    assert.ok(plan.nativeAuthoringExecution.dcc.uncoveredTypes.some(type=>['character','enemy','boss','animation'].includes(type)));
    assert.ok(plan.decisions.every(row=>row.generatorFallback.outputContract===plan.generatedAssetOutputContract));
    assert.match(assetProductionGuidance(plan),/GENERATED NATIVE ASSET CONTRACT/);

    const unity=buildVibeAssetProductionPlan({...common,target:'unity-android'});
    assert.equal(unity.target,'unity');
    assert.equal(unity.targetResolution.source,'TASK_OR_CALLER');
    assert.equal(unity.targetResolution.explicit,true);
    assert.ok(unity.decisions.some(row=>row.directAuthoring.includes('blender-python-original-mesh-rig-and-glb')));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('canonical generic Blender visual recipe is syntax-valid and emits GLB preview evidence outputs',()=>{
  const script=new URL('../assets/native-authoring/build-game-visual.py',import.meta.url);
  execFileSync('python3',['-c','import pathlib; compile(pathlib.Path(r"'+decodeURIComponent(script.pathname).replaceAll('\\','\\\\')+'").read_text(), "build-game-visual.py", "exec")']);
  const source=fs.readFileSync(script,'utf8');
  assert.match(source,/asset\.glb/);
  assert.match(source,/preview\.png/);
  assert.match(source,/evidence\.json/);
  assert.match(source,/STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING/);
  assert.match(source,/project-original/);
});

test('generic environment and prop authoring declares task-specific Blender outputs per native platform',()=>{
  const task={gameId:'amusement-tycoon',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 놀이공원 환경 배경 소품을 플랫폼 네이티브 3D 자산으로 개선'};
  const roblox=buildVibeAssetProductionPlan({target:'roblox',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(roblox.nativeAuthoringExecution.dcc.executionRequired,true);
  assert.deepEqual([...roblox.explicitRequestedTypes].sort(),['background','prop']);
  assert.deepEqual([...roblox.nativeAuthoringExecution.dcc.explicitRequestedTypes].sort(),['background','prop']);
  assert.equal(roblox.nativeAuthoringExecution.dcc.authoringScopeMode,'EXPLICIT_TASK_REQUEST_PLUS_DECLARED_RECIPES');
  assert.equal(roblox.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
  assert.equal(roblox.nativeAuthoringExecution.dcc.uncoveredTypes.length,0);
  assert.ok(roblox.nativeAuthoringExecution.dcc.genericRecipeCount>=1);
  for(const recipe of roblox.nativeAuthoringExecution.dcc.executionRecipes){
    assert.equal(recipe.script,'assets/native-authoring/build-game-visual.py');
    assert.equal(recipe.license,'project-original');
    assert.ok(recipe.outputs.every(file=>file.startsWith('assets/generated/roblox/amusement-tycoon/')));
    assert.equal(recipe.targetPlatforms.includes('roblox'),true);
  }

  const unity=buildVibeAssetProductionPlan({target:'unity',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(unity.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
  assert.ok(unity.nativeAuthoringExecution.dcc.executionRecipes.every(recipe=>recipe.outputs.every(file=>file.startsWith('assets/generated/unity/amusement-tycoon/'))));
  const robloxOutputs=new Set(roblox.nativeAuthoringExecution.dcc.executionRecipes.flatMap(recipe=>recipe.outputs));
  const unityOutputs=unity.nativeAuthoringExecution.dcc.executionRecipes.flatMap(recipe=>recipe.outputs);
  assert.equal(unityOutputs.some(file=>robloxOutputs.has(file)),false);

  const web=buildVibeAssetProductionPlan({target:'web',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(web.nativeAuthoringExecution.dcc.executionRequired,false);
  assert.equal(web.nativeAuthoringExecution.dcc.executionRecipes.length,0);
});

test('task-declared Blender recipe stays mandatory even when a reusable animation candidate is ready',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{
      gameId:'declared-dcc-demo',
      goal:'기존 모션 자산을 유지하면서 선언된 Blender 파생 모션을 실제 제작',
      assetAuthoring:{recipes:[{
        id:'declared-motion-v1',assetId:'declared-motion-source',family:'MOTION',license:'project-original',
        executor:'BLENDER_PYTHON',types:['animation'],targetPlatforms:['ROBLOX'],
        script:'assets/roblox/demo/refine-motion.py',
        args:['--output','assets/roblox/demo/native/motion-v1'],
        outputs:[
          'assets/roblox/demo/native/motion-v1/motion.glb',
          'assets/roblox/demo/native/motion-v1/evidence.json',
          'assets/roblox/demo/native/motion-v1/preview.png'
        ],
        evidenceJson:'assets/roblox/demo/native/motion-v1/evidence.json',
        preview:'assets/roblox/demo/native/motion-v1/preview.png',
        editableSource:'assets/roblox/demo/refine-motion.py',
        runMode:'VERIFY_ONLY'
      }]}
    },
    manifest:{assets:[{
      id:'ready-motion',family:'MOTION',types:['animation'],tags:['animation','motion'],
      path:'assets/roblox/demo/ready-motion.glb',platforms:['roblox'],license:'project-original',
      downloaded:true,productionVerified:true,verifiedAnimation:true,sourceHash:'ready-motion-source'
    }]},
    presetCatalog:{presets:[]}
  });
  const animation=plan.decisions.find(row=>row.type==='animation');
  assert.equal(animation?.applyFirst?.enabled,true);
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRequired,true);
  assert.ok(plan.nativeAuthoringExecution.dcc.requiredTypes.includes('animation'));
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRequestCount,1);
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].id,'declared-motion-v1');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].assetId,'declared-motion-source');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].family,'MOTION');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].license,'project-original');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
});

test('invalid task-declared recipe cannot be masked by generic DCC fallback',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{
      gameId:'declared-prop-demo',
      goal:'소품 제작',
      assetAuthoring:{recipes:[{
        id:'unsafe-prop',assetId:'unsafe-source',family:'PROP',license:'project-original',
        executor:'BLENDER_PYTHON',types:['prop'],targetPlatforms:['ROBLOX'],
        script:'../unsafe.py',
        outputs:['assets/generated/roblox/declared-prop-demo/prop/asset.glb']
      }]}
    },
    manifest:{assets:[]},
    presetCatalog:{presets:[]}
  });
  assert.ok(plan.nativeAuthoringExecution.dcc.requiredTypes.includes('prop'));
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes.some(row=>row.id==='unsafe-prop'),false);
  assert.equal(plan.nativeAuthoringExecution.dcc.genericRecipeTypes.includes('prop'),false);
  assert.ok(plan.nativeAuthoringExecution.dcc.uncoveredTypes.includes('prop'));
  assert.notEqual(plan.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
});

test('native planner preserves an existing Blender recipe as the DCC execution path',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{gameId:'blender-recipe-demo',goal:'보스 3D 메시와 모션을 고품질로 다시 제작'},
    manifest:{assets:[{
      id:'boss-authoring-base',family:'CREATURE',types:['boss'],tags:['boss','보스','3D','메시','모션'],license:'project-original',
      platforms:['roblox'],downloaded:false,sourceHash:'boss-source-v1',
      sourceFiles:['assets/roblox/demo/build-boss.py','assets/roblox/demo/BOSS.md'],
      authoringRecipes:[{
        id:'boss-blender-v1',executor:'BLENDER_PYTHON',types:['boss'],targetPlatforms:['ROBLOX'],
        script:'assets/roblox/demo/build-boss.py',args:['--output','assets/roblox/demo/native/boss'],
        outputs:['assets/roblox/demo/native/boss/boss.glb','assets/roblox/demo/native/boss/evidence.json','assets/roblox/demo/native/boss/preview.png'],
        evidenceJson:'assets/roblox/demo/native/boss/evidence.json',preview:'assets/roblox/demo/native/boss/preview.png',editableSource:'assets/roblox/demo/build-boss.py',runMode:'VERIFY_ONLY'
      }]
    }]},
    presetCatalog:{presets:[]}
  });
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRequired,true);
  assert.equal(plan.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRequestCount,1);
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].id,'boss-blender-v1');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].script,'assets/roblox/demo/build-boss.py');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].family,'CREATURE');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].license,'project-original');
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].safe,true);
  assert.deepEqual([...plan.nativeAuthoringExecution.dcc.availableExistingRecipes],['assets/roblox/demo/build-boss.py']);
  assert.equal(plan.nativeAuthoringExecution.dcc.availableExistingRecipeCount,1);
});

test('Web native authoring stays inside Web source while Unity and Roblox keep platform-native recreation',()=>{
  const task={gameId:'web-native-demo',goal:'캐릭터 UI 이펙트 오디오를 웹 네이티브로 강화'};
  const web=buildVibeAssetProductionPlan({task,target:'web',manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(web.nativeAuthoringExecution.enabled,true);
  assert.equal(web.nativeAuthoringExecution.target,'web');
  assert.equal(web.nativeAuthoringExecution.authoringSurface,'WEB_NATIVE_SOURCE');
  assert.equal(web.nativeAuthoringExecution.dcc.executionRequired,false);
  assert.equal(web.nativeAuthoringExecution.nativeText.authoringMode,'SVG_CSS_CANVAS_JS_WEBAUDIO_NATIVE');
  assert.ok(web.nativeAuthoringExecution.nativeText.capabilities.includes('svg-final-art'));
  assert.ok(web.nativeAuthoringExecution.nativeText.capabilities.includes('canvas-art-and-effects'));
  assert.ok(web.nativeAuthoringExecution.nativeText.capabilities.includes('web-audio-sfx'));
  assert.equal(web.nativeAuthoringExecution.nativeText.webArtifactCopyIntoRobloxOrUnityForbidden,true);
  assert.match(assetProductionGuidance(web),/Web 산출물을 Roblox\/Unity에 그대로 복사하지 말고/);

  const roblox=buildVibeAssetProductionPlan({task:{...task,goal:'캐릭터 UI 이펙트를 Roblox 네이티브로 강화'},target:'roblox',manifest:{assets:[]},presetCatalog:{presets:[]}});
  const unity=buildVibeAssetProductionPlan({task:{...task,goal:'캐릭터 UI 이펙트를 Unity 네이티브로 강화'},target:'unity',manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(roblox.nativeAuthoringExecution.authoringSurface,'ENGINE_NATIVE_SOURCE');
  assert.equal(unity.nativeAuthoringExecution.authoringSurface,'ENGINE_NATIVE_SOURCE');
  assert.ok(roblox.nativeAuthoringExecution.nativeText.capabilities.includes('luau-composed-low-poly-model'));
  assert.ok(unity.nativeAuthoringExecution.nativeText.capabilities.includes('csharp-procedural-mesh-and-low-poly-model'));
  assert.equal(roblox.nativeAuthoringExecution.platformReauthoringRequired,true);
  assert.equal(unity.nativeAuthoringExecution.platformReauthoringRequired,true);
});

test('web-only assets are never reused directly by Unity or Roblox',()=>{
  const manifest={version:1,assets:[
    {id:'web-tree',path:'web-games/demo/assets/tree.png',types:['prop'],tags:['나무'],license:'CC0'},
    {id:'unity-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',platforms:['unity']},
    {id:'roblox-fx',path:'',types:['effect'],tags:['이펙트'],license:'CC0',platforms:['roblox']},
    {id:'generic-vfx',path:'',types:['effect'],tags:['이펙트'],license:'CC0'}
  ]};
  const task={gameId:'fantasy-survival',goal:'숲 나무 UI 이펙트 애니메이션 그래픽 개선'};
  const unity=buildVibeAssetProductionPlan({task,target:'unity',manifest,presetCatalog:{version:1,presets:[]}});
  const roblox=buildVibeAssetProductionPlan({task,target:'roblox',manifest,presetCatalog:{version:1,presets:[]}});
  const unityReuse=unity.decisions.flatMap(row=>row.reuseCandidates.map(asset=>asset.id));
  const robloxReuse=roblox.decisions.flatMap(row=>row.reuseCandidates.map(asset=>asset.id));
  assert.equal(unityReuse.includes('web-tree'),false);
  assert.equal(robloxReuse.includes('web-tree'),false);
  assert.equal(unityReuse.includes('unity-ui'),true);
  assert.equal(robloxReuse.includes('unity-ui'),false);
  assert.equal(robloxReuse.includes('roblox-fx'),true);
  assert.equal(unityReuse.includes('roblox-fx'),false);
  assert.equal(unity.capabilities.canChooseDirectAuthoring,true);
  assert.equal(roblox.capabilities.canChooseDirectAuthoring,true);
  assert.ok(unity.decisions.some(row=>row.directAuthoring.includes('csharp-procedural-mesh-and-low-poly-model')));
  assert.ok(roblox.decisions.some(row=>row.directAuthoring.includes('luau-composed-low-poly-model')));
  assert.equal(unity.policy.crossPlatformWebAssetDirectReuseForbidden,true);
  assert.equal(roblox.policy.nativeReuseRequiresTargetCompatibility,true);
});


test('Roblox planner reuses source-bound same-game assets before cross-game library candidates',()=>{
  const root=tempRoot();
  try{
    const server=path.join(root,'roblox-games','demo','server');
    const shared=path.join(root,'roblox-games','demo','shared');
    fs.mkdirSync(server,{recursive:true});
    fs.mkdirSync(shared,{recursive:true});
    fs.writeFileSync(path.join(server,'Game.server.luau'),[
      'local ASSETS={Nature=6933438443,City=6933556508,Dungeon=6934021345,StonePortal=12931228293}',
      'local function loadAsset(id) return AssetService:LoadAssetAsync(id) end'
    ].join('\\n'));
    fs.writeFileSync(path.join(shared,'GameConfig.luau'),'return { Audio={Battle="rbxassetid://1837821768"} }\\n');
    const discovered=discoverExistingRobloxGameAssets({repoRoot:root,gameId:'demo'});
    assert.ok(discovered.some(row=>row.robloxAssetId==='6933438443'&&row.sameGameExistingRoblox===true));
    assert.ok(discovered.some(row=>row.robloxAssetId==='1837821768'&&row.types.includes('audio')));
    assert.equal(discovered.every(row=>row.verifiedCompanyReusable===false),true);

    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'Nature background Battle audio improvement'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.ok(plan.summary.discoveredSameGameRobloxAssets>=4);
    assert.ok(plan.summary.sameGameRobloxCandidateTypes>0);
    assert.ok(plan.decisions.some(row=>row.sameGameCandidates.some(asset=>asset.robloxAssetId==='6933438443')));
    assert.ok(plan.decisions.some(row=>row.decisionOrder[1]==='REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET'));
    assert.equal(plan.policy.sameGameRobloxAssetIsCandidateOnlyUntilRuntimeVerified,true);
    assert.equal(plan.policy.unverifiedSameGameRobloxAssetDoesNotOutrankVerifiedCompanyAsset,true);
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/REUSE_SAME_GAME_EXISTING_ROBLOX_ASSET/);
    assert.match(guidance,/6933438443/);

    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{id:'verified-company-nature',category:'ENVIRONMENT',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,path:'roblox-games/shared/nature.luau',types:['background'],tags:['Nature','background'],platforms:['roblox'],license:'company-owned'}]
    },null,2));
    const withCompany=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'Nature background improvement'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    const background=withCompany.decisions.find(row=>row.type==='background');
    assert.ok(background);
    assert.equal(background.decisionOrder[1],'REUSE_VERIFIED_COMPANY_ASSET');
    assert.equal(background.reuseCandidates[0].id,'verified-company-nature');

    const other=buildVibeAssetProductionPlan({
      task:{gameId:'other-game',goal:'자연 환경 배경 개선'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.equal(other.summary.discoveredSameGameRobloxAssets,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Roblox visual planning selects concrete base material atoms and requires native source binding',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:15,
      baseMaterialLibrary:{
        status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
        families:{
          CHARACTER:['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE'],
          CREATURE:['HEAD_CANINE','JAW_LONG','CLAW'],
          BUILDING:['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE'],
          ENVIRONMENT:['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT'],
          WEAPON:['BLADE_LONG','GUARD_CROSS','GRIP_LONG'],
          SKILL:['CAST_HAND','PROJECTILE_ORB','IMPACT_SMALL'],
          MATERIAL:['WOOD','STONE','METAL'],
          AUDIO:['HIT_FLESH','UI_CONFIRM','ENV_FOREST'],
          VFX:['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST'],
          UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
          MOTION:['IDLE_RELAXED','RUN','ATTACK_LIGHT_1'],
          PROP:['CHEST','CRATE','LAMP']
        },
        combinationRules:{colorOnlyVariantDoesNotCount:true,actualRuntimeQaRequiredBeforeVerifiedPromotion:true}
      },
      variantRecipeTemplates:[{id:'NORMAL_VARIANT',mutationStrength:'LIGHT',minimumDistinctAxes:2}]
    },null,2));
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] Roblox environment UI visual asset improvement'},
      target:'roblox',repoRoot:root,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.ok(plan.baseMaterialLoadout.selectedAtomCount>=20);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.selectionRequired,true);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,true);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.plannerSourceMutationForbidden,true);
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.downstreamApplicationOwner,'VIBE2_VIBE3_GAME_SOURCE_IMPLEMENTATION');
    assert.equal(plan.baseMaterialLoadout.robloxSelectionHandoff.postApplicationVerificationRequired,true);
    assert.ok(plan.baseMaterialLoadout.families.UI.includes('FRAME_PANEL'));
    assert.equal(plan.baseMaterialLoadout.runtimeVerificationRequired,true);
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/ROBLOX STUDIO ASSET SELECTION HANDOFF/);
    assert.match(guidance,/STUDIO_ASSET_BINDING_VERSION/);
    assert.match(guidance,/FRAME_PANEL/);

    const nonVisual=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'save null guard repair'},target:'roblox',repoRoot:root,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}
    });
    assert.equal(nonVisual.baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,true);
    assert.equal(nonVisual.baseMaterialLoadout.universalAssetFirst.allFamiliesEvaluated,true);
    assert.deepEqual(Object.keys(nonVisual.baseMaterialLoadout.families).sort(),['AUDIO','BUILDING','CHARACTER','CREATURE','ENVIRONMENT','MATERIAL','MOTION','PROP','SKILL','UI','VFX','WEAPON']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('new Roblox bootstrap consumes Studio base materials in real HUD source without claiming verification',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../company-asset-library.json',import.meta.url),'utf8'));
  const profile={
    platform:'ROBLOX',
    inputModel:'mobile touch and gamepad input',
    sessionModel:'single session with local progression',
    multiplayerRuntime:'single player runtime authority',
    performanceBudget:'mobile-first stable frame budget',
    uiUx:'touch-first readable mobile interface',
    saveAndNetwork:'local session no persistent save required',
    platformContentAdaptation:'Roblox native visual and input adaptation',
    internalReleaseTarget:'private Roblox internal playtest',
    validationEvidence:'Roblox runtime capture and deterministic QA'
  };
  const baseline={content:{
    platformProfiles:{ROBLOX:profile},
    robloxBuildProfile:{
      version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',
      declaredGameCategory:'RPG',genre:'RPG',subgenre:null,playMode:'SINGLE',
      multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
      networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'RPG'
    }
  }};
  const studio=buildRobloxStudioAssetBootstrapPlan({gameId:'demo-bootstrap',profile:{genre:'RPG'},assetLibrary:registry});
  assert.equal(studio.applied,true);
  assert.ok(studio.selectedAtomCount>=12);
  assert.ok(studio.families.UI.includes('FRAME_PANEL'));
  assert.equal(studio.productionVerified,false);
  assert.equal(studio.runtimeVerificationRequired,true);

  const built=compileRobloxSource({
    gameId:'demo-bootstrap',gameName:'Demo Bootstrap',baseline,artbook:{},playbooks:verifiedRobloxPlaybooks(),recombination:{},roadmap:{},assetLibrary:registry
  });
  assert.equal(built.validation.pass,true);
  assert.equal(built.studioAssets.applied,true);
  assert.match(built.result.sharedConfig,/StudioAssets\s*=/);
  assert.match(built.result.sharedConfig,/FRAME_PANEL/);
  assert.match(built.result.clientCode,/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/);
  assert.match(built.result.clientCode,/Config\.StudioAssets/);
  assert.match(built.result.clientCode,/local studioAssetFamilies = Config\.StudioAssets and Config\.StudioAssets\.Families or \{\}/);
  assert.match(built.result.clientCode,/local function studioAssetFamily\(family\)/);
  assert.match(built.result.clientCode,/hasStudioAtom\("UI", "FRAME_PANEL"\)/);
  assert.match(built.result.clientCode,/StudioHealthTrack/);
  assert.match(built.result.clientCode,/Instance\.new\("Frame"\)/);
});


test('Roblox visual plan selects stable base material atoms and requires source auto apply',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:15,
      baseMaterialLibrary:{
        status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
        productionVerified:false,
        families:{
          CHARACTER:['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE'],
          CREATURE:['HEAD_CANINE','JAW_LONG','CLAW'],
          BUILDING:['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE'],
          ENVIRONMENT:['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT'],
          WEAPON:['BLADE_LONG','GUARD_CROSS','GRIP_LONG'],
          SKILL:['CAST_HAND','PROJECTILE_ORB','IMPACT_SMALL'],
          MATERIAL:['WOOD','STONE','METAL','CLOTH'],
          AUDIO:['HIT_FLESH','ATTACK_SWING_LIGHT','ENV_FOREST'],
          VFX:['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST'],
          UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
          MOTION:['IDLE_RELAXED','WALK','ATTACK_LIGHT_1'],
          PROP:['CHEST','CRATE','LAMP','WORKBENCH']
        },
        mutationAxes:['MATERIAL','PROPORTION','FACTION'],
        combinationRules:{colorOnlyVariantDoesNotCount:true,actualRuntimeQaRequiredBeforeVerifiedPromotion:true}
      },
      variantRecipeTemplates:[{id:'NORMAL_VARIANT',mutationStrength:'LIGHT',minimumDistinctAxes:2}]
    },null,2));
    const task={gameId:'demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] Roblox 캐릭터 몬스터 환경 UI 그래픽 개선'};
    const first=buildVibeAssetProductionPlan({task,target:'roblox',repoRoot:root,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
    const second=buildVibeAssetProductionPlan({task,target:'roblox',repoRoot:root,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
    assert.ok(first.baseMaterialLoadout.selectedAtomCount>=9);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.selectionRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.handoffRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.plannerSourceMutationForbidden,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.downstreamApplicationOwner,'VIBE2_VIBE3_GAME_SOURCE_IMPLEMENTATION');
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.downstreamApplicationRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.postApplicationVerificationRequired,true);
    assert.equal(first.baseMaterialLoadout.robloxSelectionHandoff.markerOnlyApplicationForbidden,true);
    assert.deepEqual(first.baseMaterialLoadout.families,second.baseMaterialLoadout.families);
    const guidance=assetProductionGuidance(first);
    assert.match(guidance,/ROBLOX STUDIO ASSET SELECTION HANDOFF/);
    assert.match(guidance,/STUDIO_ASSET_BINDING_VERSION/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('new Roblox bootstrap binds Studio material atoms into generated Luau without claiming runtime verification',()=>{
  const assetLibrary={
    version:15,
    baseMaterialLibrary:{
      status:'PREPARED_SEMANTIC_ATOM_LIBRARY',
      families:{
        UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH'],
        ENVIRONMENT:['TREE_TRUNK_THICK','TREE_CROWN_ROUND','ROCK_MEDIUM','ROAD_DIRT'],
        BUILDING:['FOUNDATION_RECT','WALL_SOLID','DOOR_SINGLE','ROOF_GABLE'],
        PROP:['CHEST','CRATE','LAMP','WORKBENCH'],
        MATERIAL:['WOOD','STONE','METAL','CLOTH'],
        VFX:['IMPACT_FLASH','TRAIL_SHORT','SHAPE_BURST'],
        SKILL:['CAST_HAND','PROJECTILE_ORB','IMPACT_SMALL'],
        AUDIO:['ENV_WIND','UI_CONFIRM','ATTACK_SWING_LIGHT'],
        MOTION:['IDLE_RELAXED','WALK','RUN'],
        WEAPON:['BLADE_LONG','GUARD_CROSS','GRIP_LONG'],
        CHARACTER:['TORSO_CLOTH','SHOULDER_LIGHT','BACK_CAPE'],
        CREATURE:['HEAD_CANINE','JAW_LONG','CLAW']
      }
    }
  };
  const baseline={
    content:{
      identity:'Action',
      multiplayerMode:'SINGLE',
      robloxBuildProfile:{
        version:2,targetPlatform:'ROBLOX',taxonomy:'DIRECT_NATIVE_DESIGN_PROFILE',
        genre:'Action',subgenre:null,playMode:'SINGLE',
        multiplayerRequired:false,coopImplementationRequired:false,competitiveImplementationRequired:false,
        networkingRequired:false,multiplayerQaRequired:false,minimumParticipantsForRequiredQa:1,displayLabelKo:'Action'
      },
      platformProfiles:{
        ROBLOX:{
          platform:'ROBLOX',
          inputModel:'mobile touch plus keyboard controller input',
          sessionModel:'single player authoritative session runtime',
          multiplayerRuntime:'server authority retained even when single',
          performanceBudget:'mobile first stable frame performance budget',
          uiUx:'touch first readable mobile user interface',
          saveAndNetwork:'safe save and network ownership separation',
          platformContentAdaptation:'native Roblox visual and input adaptation',
          internalReleaseTarget:'private Roblox internal release candidate',
          validationEvidence:'source then Studio runtime validation evidence'
        }
      }
    }
  };
  const playbooks=verifiedRobloxPlaybooks();
  const recombination={recipes:[{
    id:'action-recipe',sourceProjects:['source-a','source-b'],
    transformationOperator:'TRANSFORMATIVE_RECOMBINATION',
    internalCreationRequirement:'ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT',
    featureBlend:['combat','attack','touch']
  }]};
  const plan=buildRobloxStudioAssetBootstrapPlan({gameId:'demo',profile:baseline.content.robloxBuildProfile,assetLibrary});
  assert.equal(plan.applied,true);
  assert.ok(plan.selectedAtomCount>=12);
  const compiled=compileRobloxSource({
    gameId:'demo',gameName:'Demo',baseline,artbook:{},playbooks,recombination,roadmap:{},assetLibrary
  });
  assert.equal(compiled.validation.pass,true);
  assert.equal(compiled.studioAssets.applied,true);
  assert.equal(compiled.studioAssets.productionVerified,false);
  assert.equal(compiled.studioAssets.runtimeVerificationRequired,true);
  assert.match(compiled.result.sharedConfig,/StudioAssets\s*=/);
  assert.match(compiled.result.sharedConfig,/FRAME_PANEL/);
  assert.match(compiled.result.clientCode,/STUDIO_ASSET_BINDING_VERSION\s*=\s*2/);
  assert.match(compiled.result.clientCode,/Config\.StudioAssets/);
  assert.match(compiled.result.clientCode,/StudioAssetAtoms/);
  assert.doesNotMatch(compiled.result.sharedConfig,/ProductionVerified\s*=\s*true/);
});

test('existing Roblox visual candidate must bind selected Studio atoms to real native source',()=>{
  const root=tempRoot();
  try{
    const relative='roblox-games/demo/client/Game.client.luau';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const manifestPath=path.join(root,'manifest-roblox-studio-binding.json');
    const manifest={
      target:'roblox',
      changedFiles:[relative],
      assetProduction:{
        baseMaterialLoadout:{
          families:{UI:['FRAME_PANEL','BUTTON_PRIMARY','BAR_HEALTH']},
          robloxSelectionHandoff:{handoffRequired:true,downstreamApplicationRequired:true,plannerSourceMutationForbidden:true}
        }
      }
    };
    fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
    fs.writeFileSync(file,[
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local STUDIO_ASSET_SELECTION = {"FRAME_PANEL","BUTTON_PRIMARY","BAR_HEALTH"}',
      'local root = Instance.new("Frame")',
      'root.BackgroundColor3 = Color3.fromRGB(22, 34, 58)',
      'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
      'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))'
    ].join('\n'));
    const result=runIncrementalQa({root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-binding',force:true});
    assert.equal(result.outcome,'PASS');
    assert.equal(result.robloxStudioAssetBindingQa.status,'STATIC_PASS');
    assert.equal(result.robloxStudioAssetBindingQa.runtimeStillRequired,true);
    assert.equal(result.robloxStudioAssetBindingQa.companyAssetPromotionBlockedUntilRuntime,true);

    fs.writeFileSync(file,[
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local STUDIO_ASSET_SELECTION = {"FRAME_PANEL","BUTTON_PRIMARY","BAR_HEALTH"}',
      'root:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)',
      'root:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))'
    ].join('\n'));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-marker-only',force:true
    }),/ROBLOX_STUDIO_ASSET_BINDING_QA_FAILED:.*ROBLOX_NATIVE_VISUAL_BINDING/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset plan prefers verified company library then repository then external gap fill',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{
        id:'company-ui',category:'UI',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'unity-games/shared/ui/company.png',license:'company-owned',platforms:['unity']
      }],
      externalSources:[{id:'external-source'}]
    },null,2));
    const manifest={version:1,assets:[
      {id:'repo-ui',path:'unity-games/demo/Assets/UI/repo.png',types:['ui'],tags:['UI'],license:'project-original'},
      {id:'external-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',source:'KayKit',sourceUrl:'https://example.invalid/ui',downloaded:false,platforms:['unity']}
    ]};
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'UI 그래픽 개선'},target:'unity',repoRoot:root,
      manifest,presetCatalog:{version:1,presets:[]}
    });
    const row=plan.decisions.find(item=>item.type==='ui');
    assert.ok(row);
    assert.deepEqual(row.companyCandidates.map(item=>item.id),['company-ui']);
    assert.deepEqual(row.repositoryCandidates.map(item=>item.id),['repo-ui']);
    assert.deepEqual(row.externalCandidates.map(item=>item.id),['external-ui']);
    assert.deepEqual(row.reuseCandidates.map(item=>item.id),['company-ui','repo-ui']);
    assert.deepEqual(row.decisionOrder.slice(1,4),[
      'REUSE_VERIFIED_COMPANY_ASSET',
      'REUSE_LICENSE_VERIFIED_EXISTING_REPOSITORY_ASSET',
      'ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET'
    ]);
    assert.equal(plan.summary.companyCandidateTypes>0,true);
    assert.equal(plan.summary.externalCandidateTypes>0,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});


test('downloaded external asset keeps external provenance and must compare against internal assets before selection',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{
        id:'company-ui',category:'UI',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'unity-games/shared/ui/company.png',license:'company-owned',platforms:['unity'],sourceHash:'company-ui-v1'
      }]
    },null,2));
    const manifest={version:1,assets:[{
      id:'downloaded-external-ui',
      path:'unity-games/demo/Assets/UI/external.png',
      types:['ui'],tags:['UI'],license:'CC0',platforms:['unity'],
      source:'External Pack',sourceUrl:'https://example.invalid/ui-pack',
      downloaded:true,sourceHash:'external-ui-v1'
    }]};
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'UI 그래픽 개선'},target:'unity',repoRoot:root,
      manifest,presetCatalog:{version:1,presets:[]}
    });
    const row=plan.decisions.find(item=>item.type==='ui');
    assert.ok(row);
    assert.equal(row.repositoryCandidates.some(item=>item.id==='downloaded-external-ui'),true);
    const acquired=row.repositoryCandidates.find(item=>item.id==='downloaded-external-ui');
    assert.equal(acquired.acquiredExternal,true);
    assert.equal(acquired.acquisitionOrigin,'EXTERNAL_ACQUIRED');
    assert.equal(row.postDownloadComparison.required,true);
    assert.equal(row.postDownloadComparison.status,'READY_FOR_SAME_CONDITION_COMPARISON');
    assert.deepEqual(row.postDownloadComparison.downloadedExternalCandidateIds,['downloaded-external-ui']);
    assert.deepEqual(row.postDownloadComparison.internalBaselineCandidateIds,['company-ui']);
    assert.equal(row.applyFirst.preferredCandidateId,null);
    assert.equal(row.qualitySelection.postDownloadInternalComparisonRequired,true);
    assert.equal(row.qualitySelection.selectionState,'READY_FOR_SAME_CONDITION_COMPARISON');
    assert.ok(row.decisionOrder.includes('POST_DOWNLOAD_COMPARE_EXTERNAL_TO_INTERNAL'));
    assert.equal(row.postDownloadComparison.internalTieBreakWhenQualityComparable,true);
    assert.equal(row.postDownloadComparison.conceptFitReferenceOnly,true);
    assert.equal(row.postDownloadComparison.conceptMismatchBlocksFullReplacement,false);
    assert.equal(row.postDownloadComparison.conceptTransformationPreferredWhenFeasible,true);
    assert.equal(row.conceptFit.referenceMode,'ADVISORY_TRANSFORM_TARGET');
    assert.equal(row.conceptFit.conceptMismatchIsAutomaticReject,false);
    assert.equal(row.conceptFit.mismatchHandling.applyInCandidateContextBeforeFinalDecision,true);
    assert.ok(row.conceptFit.transformationLadder.includes('SILHOUETTE_AND_PROPORTION_STYLIZATION'));
    assert.ok(row.conceptFit.transformationLadder.includes('MOTION_POSE_WEIGHT_RHYTHM_ADAPTATION'));
    assert.match(assetProductionGuidance(plan),/다운로드 후 내부자산 비교=READY_FOR_SAME_CONDITION_COMPARISON/);
    assert.match(assetProductionGuidance(plan),/컨셉은 강제 탈락 게이트가 아니라 변형 목표/);
    assert.match(assetProductionGuidance(plan),/팔레트·명도→재질\/셰이더→장식→실루엣\/비율/);
    assert.match(assetProductionGuidance(plan),/동급이면 내부자산을 유지/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('runtime visual evidence manifest auto-binds only current-source-compatible captures',()=>{
  const root=tempRoot(),evidence=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-visual-evidence-'));
  const prior=process.env.VIBE2_RUNTIME_VISUAL_EVIDENCE_ROOT;
  try{
    const sourceRevision='1234567890abcdef1234567890abcdef12345678';
    const folder=path.join(evidence,'roblox-demo');fs.mkdirSync(folder,{recursive:true});
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
    fs.writeFileSync(path.join(folder,'game.png'),png);
    fs.writeFileSync(path.join(folder,'asset-runtime-visual-evidence.json'),JSON.stringify({
      version:1,gameId:'demo',platform:'ROBLOX',surface:'ROBLOX_STUDIO',sourceRoot:'roblox-games/demo',
      sourceRevision:'abcdefabcdefabcdefabcdefabcdefabcdefabcd',
      currentSourceRevision:sourceRevision,currentSourceCompatible:true,sceneId:'spawn',
      producer:{workflow:'roblox-studio',workflowRunId:'77'},
      captures:[{id:'game',imageRef:'game.png',view:'GAME_CAMERA',viewport:{width:1280,height:720}}],
      expectedSubjects:[{id:'hero',required:true,mustBeVisibleIn:['GAME_CAMERA']}],
      visualGoals:['mobile readability'],editableTargets:['hero']
    },null,2));
    process.env.VIBE2_RUNTIME_VISUAL_EVIDENCE_ROOT=evidence;
    process.env.VIBE2_BASE_MAIN_SHA=sourceRevision;
    const discovered=discoverRuntimeVisualEvidence({task:{gameId:'demo',sourceRoot:'roblox-games/demo'},target:'roblox'});
    assert.ok(discovered);
    assert.equal(discovered.automaticallyBoundExistingRuntimeEvidence,true);
    assert.equal(discovered.captures[0].sourceCompatibility,'EXACT_SOURCE_ROOT_NO_DIFF');
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',sourceRoot:'roblox-games/demo',goal:'디테일 개선'},target:'roblox',repoRoot:root,
      manifest:{assets:[]},presetCatalog:{presets:[]}
    });
    assert.equal(plan.runtimeVisualReview.status,'READY_FOR_PIXEL_INSPECTION');
    assert.equal(plan.runtimeVisualReview.evidenceProvenance[0].sourceCompatibility,'EXACT_SOURCE_ROOT_NO_DIFF');
  }finally{
    if(prior===undefined)delete process.env.VIBE2_RUNTIME_VISUAL_EVIDENCE_ROOT;else process.env.VIBE2_RUNTIME_VISUAL_EVIDENCE_ROOT=prior;
    delete process.env.VIBE2_BASE_MAIN_SHA;
    fs.rmSync(root,{recursive:true,force:true});fs.rmSync(evidence,{recursive:true,force:true});
  }
});

test('native presentation pass is available to every confirmed project while the first adoption keeps owner priority',()=>{
  const root=tempRoot();
  try{
    const fantasyUnity=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    const otherUnity=path.join(root,'unity-games','other-game','Assets','Scripts');
    fs.mkdirSync(fantasyUnity,{recursive:true});
    fs.mkdirSync(otherUnity,{recursive:true});
    fs.writeFileSync(path.join(fantasyUnity,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    fs.writeFileSync(path.join(otherUnity,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const fantasy=findPresentationQualityTask({
      gameId:'fantasy-survival',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/fantasy-survival',source:'company-status'
    },root,{tasks:[]});
    const other=findPresentationQualityTask({
      gameId:'other-game',engine:'unity',releaseState:'development-confirmed',
      projectPath:'unity-games/other-game',source:'company-status'
    },root,{tasks:[]});
    assert.ok(fantasy);
    assert.equal(fantasy.id,'fantasy-survival-unity-presentation-asset-adaptation-v1');
    assert.equal(fantasy.priority,'owner-immediate');
    assert.ok(other);
    assert.equal(other.id,'other-game-unity-presentation-asset-adaptation-v1');
    assert.equal(other.priority,'normal');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('fantasy-survival development-confirmed Unity can receive P0 weather work only through owner-authorized company status',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','fantasy-survival','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'fantasy-survival',name:'마력숲 생존기',ownerDecision:'PASS',
        target:'unity',selectedPlatform:'unity-android',projectPath:'unity-games/fantasy-survival',progress:20
      }]},
      catalog:{games:[{
        id:'fantasy-survival',name:'마력숲 생존기',
        productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'
      }]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    const weather=result.tasks.find(row=>row.id==='fantasy-survival-unity-weather-presentation-v1');
    assert.ok(weather);
    assert.equal(weather.priority,'owner-immediate');
    assert.equal(weather.weatherPresentationLane,true);
    assert.ok(weather.evidence.includes('weather-presentation:v1'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('development-confirmed existing Unity non-pilot receives holistic backfill before generic presentation and never inherits pilot weather scope',()=>{
  const root=tempRoot();
  try{
    const scripts=path.join(root,'unity-games','other-game','Assets','Scripts');
    fs.mkdirSync(scripts,{recursive:true});
    fs.writeFileSync(path.join(scripts,'PrototypeAnimatedVisuals.cs'),'using UnityEngine; public class PrototypeAnimatedVisuals:MonoBehaviour { void Update(){} }\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'other-game',name:'Other',ownerDecision:'PASS',
        target:'unity',selectedPlatform:'unity-android',projectPath:'unity-games/other-game',progress:20
      }]},
      catalog:{games:[{id:'other-game',name:'Other',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    assert.ok(result.tasks.some(row=>(row.evidence||[]).includes('existing-holistic-backfill:v1')));
    assert.ok(result.tasks.some(row=>row.studioQualityEvolution?.existingHolisticBackfillRequired===true));
    assert.equal(result.tasks.some(row=>row.id==='other-game-unity-weather-presentation-v1'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('existing Roblox games receive one Studio asset backfill task until real binding exists',()=>{
  const root=tempRoot();
  try{
    writePolicy(root);
    const gameRoot=path.join(root,'roblox-games','demo');
    fs.mkdirSync(path.join(gameRoot,'shared'),{recursive:true});
    fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'shared','GameConfig.luau'),'return { GameId = "demo" }\n');
    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),'local root = Instance.new("Frame")\nroot.BackgroundColor3 = Color3.fromRGB(20,20,20)\n');
    const project={gameId:'demo',name:'Demo',engine:'roblox',releaseState:'development-confirmed',projectPath:'roblox-games/demo'};
    const first=findRobloxStudioAssetBackfillTask(project,root,{tasks:[]});
    assert.ok(first);
    assert.equal(first.id,'demo-roblox-studio-asset-backfill-v1');
    assert.equal(first.studioAssetBackfill,true);
    assert.equal(first.assetProductionLane,true);
    assert.ok(first.evidence.includes('roblox-studio-asset-selection-handoff:required'));
    assert.ok(first.evidence.includes('roblox-studio-asset-target-engine-selection-match:required'));
    assert.match(first.goal,/플래너는 선택·전달만/);
    assert.match(first.goal,/실제 Roblox 런타임 PASS 전에는/);

    const duplicate=findRobloxStudioAssetBackfillTask(project,root,{tasks:[first]});
    assert.equal(duplicate,null);

    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),[
      'local STUDIO_ASSET_BINDING_VERSION = 2',
      'local root = Instance.new("Frame")',
      'root:SetAttribute("StudioAssetAtoms", "FRAME_PANEL,BUTTON_PRIMARY")',
      'root.BackgroundColor3 = Color3.fromRGB(20,20,20)'
    ].join('\n'));
    const alreadyBound=findRobloxStudioAssetBackfillTask(project,root,{tasks:[]});
    assert.equal(alreadyBound,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('autonomous planner prioritizes holistic backfill before Studio asset backfill for an existing confirmed Roblox game',()=>{
  const root=tempRoot();
  try{
    writePolicy(root);
    const gameRoot=path.join(root,'roblox-games','demo');
    fs.mkdirSync(path.join(gameRoot,'shared'),{recursive:true});
    fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'shared','GameConfig.luau'),'return { GameId = "demo" }\n');
    fs.writeFileSync(path.join(gameRoot,'client','Game.client.luau'),'local root = Instance.new("Frame")\nroot.BackgroundColor3 = Color3.fromRGB(18,28,48)\n');
    const result=planVibe2AutonomousTasks({
      status:{projects:[{
        gameId:'demo',name:'Demo',ownerDecision:'PASS',
        target:'roblox',selectedPlatform:'roblox',projectPath:'roblox-games/demo',progress:20
      }]},
      catalog:{games:[{id:'demo',name:'Demo',productionClass:'DEVELOPMENT_CONFIRMED',lifecycleState:'ACTIVE'}]},
      developmentQueue:{items:[]},
      queue:{maxConcurrentTasks:4,tasks:[]},
      repoRoot:root,maxConcurrentTasks:4,planningBacklogTarget:4
    });
    assert.equal(result.planned,true);
    const holistic=result.tasks.find(row=>(row.evidence||[]).includes('existing-holistic-backfill:v1'));
    assert.ok(holistic);
    assert.equal(holistic.target,'roblox');
    assert.equal(holistic.studioQualityEvolution?.existingHolisticBackfillRequired,true);
    assert.equal(result.tasks.some(row=>row.id==='demo-roblox-studio-asset-backfill-v1'),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Roblox Studio asset auto apply requires all family accounting, map assets, selected atom trace, and real native binding',()=>{
  const root=tempRoot();
  try{
    const relative='roblox-games/demo/client/Game.client.luau';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    const families={
      CHARACTER:['TORSO_CLOTH'],CREATURE:['HEAD_CANINE'],BUILDING:['FOUNDATION_RECT'],ENVIRONMENT:['TREE_TRUNK_THICK'],
      WEAPON:['BLADE_LONG'],SKILL:['CAST_HAND'],MATERIAL:['WOOD'],AUDIO:['ENV_WIND'],VFX:['IMPACT_FLASH'],UI:['FRAME_PANEL'],
      MOTION:['IDLE_RELAXED'],PROP:['CHEST']
    };
    const atoms=Object.values(families).flat();
    fs.writeFileSync(file,`local STUDIO_ASSET_BINDING_VERSION = 2
local STUDIO_ASSET_SELECTION = {${atoms.map(atom=>JSON.stringify(atom)).join(',')}}
local STUDIO_ASSET_FAMILY_STATUS = {
  CHARACTER = "APPLIED", CREATURE = "APPLIED", BUILDING = "APPLIED", ENVIRONMENT = "APPLIED",
  WEAPON = "APPLIED", SKILL = "APPLIED", MATERIAL = "APPLIED", AUDIO = "APPLIED",
  VFX = "APPLIED", UI = "APPLIED", MOTION = "APPLIED", PROP = "APPLIED"
}
local character = Instance.new("Model"); character.Name = "Character"
local humanoid = Instance.new("Humanoid"); humanoid.Parent = character
local enemy = Instance.new("Model"); enemy.Name = "Enemy"
local house = Instance.new("Model"); house.Name = "House"
local tree = Instance.new("Part"); tree.Name = "Tree"; tree.Material = Enum.Material.Wood
local sword = Instance.new("Tool"); sword.Name = "Sword"
local projectile = Instance.new("Part"); projectile.Name = "Projectile"
local sound = Instance.new("Sound"); sound.SoundId = "rbxassetid://0"
local vfx = Instance.new("ParticleEmitter")
local gui = Instance.new("ScreenGui")
local panel = Instance.new("Frame"); panel.Parent = gui
local motor = Instance.new("Motor6D"); motor.Transform = CFrame.Angles(0,0,0)
local chest = Instance.new("Part"); chest.Name = "Chest"
panel.BackgroundColor3 = Color3.fromRGB(22,34,58)
panel:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
panel:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))
`);
    const manifestPath=path.join(root,'manifest-roblox-studio-asset.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'roblox',sourceRoot:'roblox-games/demo',
      changedFiles:[relative],
      assetProduction:{
        baseMaterialLoadout:{
          families,
          universalAssetFirst:{required:true},
          robloxSelectionHandoff:{handoffRequired:true,downstreamApplicationRequired:true,plannerSourceMutationForbidden:true}
        }
      }
    },null,2));
    const result=runIncrementalQa({root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-asset',force:true});
    assert.equal(result.outcome,'PASS');
    assert.equal(result.robloxStudioAssetBindingQa.status,'STATIC_PASS');
    assert.equal(result.robloxStudioAssetBindingQa.allTwelveFamiliesAccounted,true);
    assert.equal(result.robloxStudioAssetBindingQa.mapEnvironmentAssetCoverage,true);
    assert.equal(result.robloxStudioAssetBindingQa.runtimeStillRequired,true);

    fs.writeFileSync(file,`local STUDIO_ASSET_BINDING_VERSION = 2
local STUDIO_ASSET_SELECTION = {${atoms.map(atom=>JSON.stringify(atom)).join(',')}}
local panel = Instance.new("Frame")
panel.BackgroundColor3 = Color3.fromRGB(22,34,58)
panel:SetAttribute("StudioAssetBindingVersion", STUDIO_ASSET_BINDING_VERSION)
panel:SetAttribute("StudioAssetAtoms", table.concat(STUDIO_ASSET_SELECTION, ","))
`);
    assert.throws(()=>runIncrementalQa({root,manifest:manifestPath,files:[relative],namespace:'roblox-studio-asset-missing-family-status',force:true}),/ROBLOX_ASSET_FAMILY_STATUS_ALL_12/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Roblox Vibe candidate publish waits for target runtime QA instead of final PASS',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-candidate-release.yml',import.meta.url),'utf8');
  const settle=workflow.slice(workflow.indexOf('Settle Roblox result and continue canonical queue'),workflow.indexOf('\n  reject:',workflow.indexOf('Settle Roblox result and continue canonical queue')));
  assert.match(settle,/candidate-awaiting-roblox-runtime-qa/);
  assert.match(settle,/roblox-runtime-await-game:/);
  assert.match(settle,/roblox-studio-asset-runtime-proof-required/);
  assert.match(settle,/company-development-roblox-runtime\.yml[^\n]*-f game_id="\$GAME_ID"/);
  assert.match(settle,/VIBE2_ROBLOX_TASK_FINAL_PASS=NO_RUNTIME_QA_PENDING/);
  assert.doesNotMatch(settle,/queue-control\.mjs pass --id="\$TASK_ID" --evidence="roblox-exact-evidence-pass,main-pr-merged,roblox-open-cloud-published/);
});

test('native asset adaptation rejects a single primitive character placeholder',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var actor=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    actor.GetComponent<Renderer>().material.color=Color.red;
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-placeholder.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-placeholder',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*(?:NATIVE_COMPOSITE_FORM|GAME_VISUAL_IDENTITY_DOMAINS|NO_SINGLE_PRIMITIVE_PLACEHOLDER)/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset adaptation accepts composed character weapon environment and style identity',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var body=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    var head=GameObject.CreatePrimitive(PrimitiveType.Sphere);
    head.transform.SetParent(body.transform);
    var weapon=new GameObject("weapon sword blade");
    weapon.AddComponent<MeshFilter>();
    var weaponRenderer=weapon.AddComponent<MeshRenderer>();
    weaponRenderer.material=new Material(Shader.Find("Standard"));
    weaponRenderer.material.color=new Color(0.3f,0.7f,0.5f);
    var environment=GameObject.CreatePrimitive(PrimitiveType.Cube);
    environment.name="forest ground tree biome";
    environment.transform.localScale=new Vector3(4,1,4);
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-composed.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-composed',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.equal(result.presentationQa.status,'STATIC_PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='NATIVE_COMPOSITE_FORM'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native living motion rejects generic movement without actor secondary motion',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  Transform actor;
  float speed;
  void Update(){
    var idle=speed<0.1f;
    var walk=speed>=0.1f;
    actor.localPosition=Vector3.Lerp(actor.localPosition,Vector3.zero,Time.deltaTime);
  }
}
`);
    const manifestPath=path.join(root,'manifest-native-motion.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'LIVING_MOTION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'native-motion',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:LIVING_MOTION:.*SECONDARY_MOTION_SIGNAL/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web asset adaptation rejects primitive-only gameplay art',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/other-game/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><canvas id="game"></canvas><script>
const ctx=document.getElementById('game').getContext('2d');
function render(){
  ctx.fillStyle='#484';
  ctx.fillRect(0,0,320,180);
  ctx.fillStyle='#fff';
  ctx.fillRect(120,80,20,30); // player placeholder
  ctx.fillStyle='#f00';
  ctx.fillRect(200,80,24,24); // monster placeholder
}
render();
</script>`);
    const manifestPath=path.join(root,'manifest-web-placeholder.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-placeholder',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*WEB_REAL_ASSET_BINDING/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web asset adaptation accepts real themed actor equipment environment assets',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/other-game/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><style>
:root{--theme-shadow:#18221c;--theme-accent:#9fd88f}
#game{background-image:url("./assets/background-forest.webp")}
</style><canvas id="game"></canvas><img id="hero" src="./assets/character-hero.webp"><script>
const ctx=document.getElementById('game').getContext('2d');
const player=new Image(); player.src='./assets/character-hero.webp';
const weapon=new Image(); weapon.src='./assets/weapon-sword.webp';
const monster=new Image(); monster.src='./assets/enemy-wolf.webp';
const environment=new Image(); environment.src='./assets/background-forest.webp';
function render(){
  ctx.drawImage(environment,0,0,320,180);
  ctx.drawImage(player,100,80);
  ctx.drawImage(weapon,118,88);
  ctx.drawImage(monster,220,80);
}
render();
</script>`);
    const manifestPath=path.join(root,'manifest-web-themed.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-themed',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_REAL_ASSET_BINDING'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('web weather marker prevents duplicate weather task creation',()=>{
  const root=tempRoot();
  try{
    const gameRoot=path.join(root,'web-games','fantasy-survival');
    fs.mkdirSync(gameRoot,{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'index.html'),'<script>const WEATHER_PRESENTATION_VERSION=1;</script>\n');
    const task=findWeatherPresentationTask({
      gameId:'fantasy-survival',engine:'web',releaseState:'development-confirmed',
      projectPath:'web-games/fantasy-survival',source:'company-development-queue'
    },root,{tasks:[]});
    assert.equal(task,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('weather incremental QA requires real Web weather implementation signals',()=>{
  const root=tempRoot();
  try{
    const gameRoot=path.join(root,'web-games','fantasy-survival');
    fs.mkdirSync(gameRoot,{recursive:true});
    const source=`<!doctype html><canvas id="game"></canvas><script>
const WEATHER_PRESENTATION_VERSION=1;
const WEATHER_STATES=['CLEAR','RAIN','FOG','SNOW','STORM'];
const state={weather:{kind:'CLEAR'}};
function setWeather(kind){state.weather.kind=kind}
function nextWeather(){return WEATHER_STATES[1]}
function weatherParticleBudget(){return navigator.deviceMemory<=2?.45:1}
function drawWeatherOverlay(){const c=document.getElementById('game').getContext('2d');c.fillRect(0,0,10,10)}
function serializeWorld(){return {weather:state.weather}}
function applyWorldSnapshot(w){if(w.weather)setWeather(w.weather.kind)}
</script>`;
    fs.writeFileSync(path.join(gameRoot,'index.html'),source);
    const manifestPath=path.join(root,'manifest.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:['web-games/fantasy-survival/index.html'],
      weatherPresentation:{
        required:true,target:'web',
        runtimeChecks:['weather-state-transitions','multiplayer-weather-sync']
      }
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,
      files:['web-games/fantasy-survival/index.html'],
      namespace:'weather-test',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.equal(result.weatherPresentationQa.status,'STATIC_PASS');
    assert.equal(result.weatherPresentationQa.runtimeStillRequired,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('runtime visual defects flow from asset planning into the source worker prompt',()=>{
  const revision='7'.repeat(40);
  const roles=['PLAYER_OR_PRIMARY_CHARACTER_CLOSEUP','PRIMARY_ENEMY_OR_CREATURE_CLOSEUP','CORE_GAMEPLAY_ACTION','WORLD_OR_REGION_WIDE','MOBILE_GAMEPLAY_HUD'];
  const runtimeVisualEvidence={
    stage:'INTERNAL_PLAYTEST',candidateRevision:revision,
    captures:roles.map((role,index)=>({role,source:'roblox-runtime-capture',artifactId:'cap-'+index,candidateRevision:revision,observed:true,reviewed:true,comparison:{pass:true}})),
    primaryActors:[{id:'player',presentation:'rigged-mesh'}],
    requiredInterfaceSurfaces:['HUD','MINIMAP'],
    interfaceCoverage:{HUD:{required:true,pass:true,observed:true,reviewed:true},MINIMAP:{required:true,pass:false,observed:true,reviewed:true}},
    sceneObjectCoverage:{requirements:[{id:'quest-board',required:true}],observations:[]}
  };
  const plan=buildVibeAssetProductionPlan({target:'roblox',task:{gameId:'runtime-visual-demo',goal:'로블록스 UI와 월드 디테일 보완',runtimeVisualEvidence}});
  assert.equal(plan.runtimeVisualAudit.pass,false);
  assert.equal(plan.runtimeVisualRepair.status,'RUNTIME_VISUAL_REPAIR_REQUIRED');
  assert.deepEqual([...plan.runtimeVisualRepair.interfaceMissing],['MINIMAP']);
  assert.deepEqual([...plan.runtimeVisualRepair.sceneObjectsMissing],['quest-board']);
  assert.equal(plan.runtimeVisualRepair.declarationOnlyClosureForbidden,true);
  assert.match(assetProductionGuidance(plan),/RUNTIME VISUAL REPAIR LOOP/);
  const prompt=buildPrompt({target:'roblox',goal:'시각 결함만 수정',assetProduction:plan},{files:[{path:'client/Game.client.luau',content:'return true',editable:true}]},['client/Game.client.luau']);
  assert.match(prompt,/RUNTIME VISUAL REPAIR BEGIN/);
  assert.match(prompt,/MINIMAP/);
  assert.match(prompt,/quest-board/);
  assert.match(prompt,/runtime re-observation is required/);
});


test('usable same-game asset is applied before new authoring and weak regions derive later',()=>{
  const sameGame={
    id:'existing-wolf',path:'roblox-games/apply-first-demo/assets/wolf.glb',types:['enemy'],
    tags:['wolf','enemy'],license:'project-original',platforms:['roblox'],
    sameGameExistingRoblox:true,sourceHash:'wolf-v1',robloxAssetId:'123456'
  };
  const company={
    id:'company-wolf',path:'assets/roblox/wolf.glb',types:['enemy'],
    tags:['wolf','enemy'],license:'project-original',platforms:['roblox'],
    companyVerified:true,sourceHash:'company-wolf-v1'
  };
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    manifest:{assets:[sameGame,company]},
    presetCatalog:{version:1,presets:[{id:'wolf',name:'Wolf',genre:'survival',keywords:['wolf'],actorAssets:['existing-wolf','company-wolf'],effectAssets:[],toolCandidates:[],platformProfiles:{roblox:{},unity:{},webValidation:{}}}]},
    task:{gameId:'apply-first-demo',goal:'wolf enemy 그래픽을 실제 게임에 적용하고 더 디테일하게'}
  });
  const enemy=plan.decisions.find(row=>row.type==='enemy');
  assert.ok(enemy);
  assert.equal(enemy.applyFirst.enabled,true);
  assert.equal(enemy.applyFirst.candidates[0].id,'existing-wolf');
  assert.equal(enemy.applyFirst.candidates[0].mode,'PATCH_EXISTING_GAME_BINDING');
  assert.equal(enemy.applyFirst.deriveBeforeReplace,true);
  assert.equal(enemy.applyFirst.qualityRescue.axisBased,true);
  assert.equal(enemy.applyFirst.qualityRescue.donorRecompositionAllowed,true);
  assert.ok(enemy.applyFirst.donorCandidates.some(row=>row.id==='company-wolf'));
  assert.ok(enemy.applyFirst.candidates[0].qualityAxes.includes('SPECIES_SILHOUETTE'));
  assert.ok(enemy.applyFirst.candidates[0].qualityAxes.includes('SURFACE_MATERIAL'));
  assert.ok(enemy.applyFirst.candidates[0].rescueLadder.includes('RECOMPOSE_COMPATIBLE_PART_DONORS'));
  assert.equal(enemy.applyFirst.candidates[0].randomDetailInflationForbidden,true);
  assert.equal(plan.applyFirstSummary.existingAssetApplicationBeforeNewAuthoring,true);
  assert.equal(plan.applyFirstSummary.newAuthoringOnlyAfterReusableCandidateFailure,true);
  assert.match(assetProductionGuidance(plan),/APPLY USABLE ASSETS FIRST/);
  const prompt=buildPrompt(
    {target:'roblox',goal:'기존 사용 가능 자산부터 적용',assetProduction:plan},
    {files:[{path:'client/Game.client.luau',content:'return true',editable:true}]},
    ['client/Game.client.luau']
  );
  assert.match(prompt,/APPLY USABLE ASSETS FIRST BEGIN/);
  assert.match(prompt,/PATCH_EXISTING_GAME_BINDING/);
  assert.match(prompt,/Keep strong axes and rebuild only failed axes/);
  assert.match(prompt,/donate parts, rig structure, material language, sockets, motion/);
  assert.match(prompt,/Random clutter, texture noise/);
});

test('precision production continues from inspection through authoring and application',()=>{
  const asset={
    id:'hero-body',family:'CHARACTER',types:['character'],tags:['character'],
    license:'project-original',sourceHash:'hero-v1',
    customization:{controls:{jaw:{kind:'MORPH',axis:'FACE',target:'Jaw',min:0,max:1}}}
  };
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',manifest:{assets:[asset]},presetCatalog:{presets:[]},
    task:{
      gameId:'precision-demo',goal:'캐릭터와 마을을 정밀하게 실제 제작해서 적용',
      assetCustomization:{recipes:[{id:'hero',family:'CHARACTER',baseAssetId:'hero-body',previousParameters:{jaw:.2},editableParameters:['jaw'],parameters:{jaw:.35}}]},
      mapReconstruction:{seed:'precision-demo',sketch:{
        sourceId:'map',sourceHash:'map-v1',metersPerUnit:1,
        nodes:[{id:'START',role:'spawn'},{id:'HUB',role:'landmark'},{id:'EXIT',role:'transition'}],
        edges:[{from:'START',to:'HUB'},{from:'HUB',to:'EXIT'}],
        districts:[{id:'hub',anchorNodeId:'HUB',function:'village',landmark:'hall'}]
      }}
    }
  });
  assert.equal(plan.precisionProduction.mode,'INSPECT_REPAIR_AUTHOR_APPLY_REINSPECT');
  assert.equal(plan.precisionProduction.qualityDNA.commonRules.detailLodRequired,true);
  assert.equal(plan.precisionProduction.automaticAdvance,true);
  assert.equal(plan.precisionProduction.continuation.stopAfterInspection,false);
  assert.equal(plan.precisionProduction.continuation.stopAfterRepairPlan,false);
  assert.equal(plan.precisionProduction.continuation.stopAfterAuthoring,false);
  assert.equal(plan.precisionProduction.application.directExistingResponsibilityBinding,true);
  assert.equal(plan.mapDetailReconstruction.productionChain.reportOnlyCompletionForbidden,true);
  assert.ok(plan.mapDetailReconstruction.regions[0].layers.some(row=>row.productionAction==='CREATE_EDITABLE_NATIVE_ASSET'));
  assert.match(assetProductionGuidance(plan),/PRECISION PRODUCTION CHAIN/);
  const prompt=buildPrompt(
    {target:'roblox',goal:'검사부터 제작 적용까지 진행',assetProduction:plan},
    {files:[{path:'client/Game.client.luau',content:'return true',editable:true}]},
    ['client/Game.client.luau']
  );
  assert.match(prompt,/PRECISION PRODUCTION CHAIN BEGIN/);
  assert.match(prompt,/qualityDNA/);
  assert.match(prompt,/INSPECT -> DEFINE_REPAIR -> AUTHOR -> APPLY/);
  assert.match(prompt,/GAME_CAMERA silhouette\/function/);
});


test('low-quality asset rescue preserves strong axes and escalates to full authoring only after targeted derivation',()=>{
  const manifest={assets:[
    {id:'base-hero',path:'roblox-games/rescue-demo/assets/hero.glb',types:['character'],tags:['character','hero'],license:'project-original',platforms:['roblox'],sameGameExistingRoblox:true,sourceHash:'hero-base',robloxAssetId:'111',rigType:'R15',retargetable:true},
    {id:'donor-hero',path:'assets/roblox/hero-donor.glb',types:['character'],tags:['character','hero'],license:'project-original',platforms:['roblox'],companyVerified:true,sourceHash:'hero-donor',rigType:'R15',retargetable:true,
      platformVariants:{ROBLOX:{path:'assets/roblox/hero-donor.glb'}}}
  ]};
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',manifest,
    presetCatalog:{version:1,presets:[{id:'hero',name:'Hero',genre:'rpg',keywords:['hero','character'],actorAssets:['base-hero','donor-hero'],effectAssets:[],toolCandidates:[],platformProfiles:{roblox:{},unity:{},webValidation:{}}}]},
    task:{gameId:'rescue-demo',goal:'hero character 저퀄 자산을 디테일하게 보강해서 적용'}
  });
  const row=plan.decisions.find(item=>item.type==='character');
  assert.ok(row);
  assert.equal(row.applyFirst.enabled,true);
  assert.equal(row.applyFirst.qualityRescue.fullAssetReplacementNotDefault,true);
  assert.equal(row.applyFirst.qualityRescue.preserveStrongAxes,true);
  assert.equal(row.applyFirst.failedCandidateCanRemainAsReusablePartDonor,true);
  assert.ok(row.applyFirst.candidateLadder.length>=1);
  assert.ok(row.applyFirst.donorCandidates.some(item=>item.id==='donor-hero'));
  const base=row.applyFirst.candidates.find(item=>item.id==='base-hero');
  assert.ok(base);
  for(const axis of ['SILHOUETTE','PROPORTION','ANATOMY','FACE_HANDS_FEET','MATERIAL','RIG','SOCKET','MOTION','LOD'])assert.ok(base.qualityAxes.includes(axis),axis);
  assert.equal(base.fullReauthorTrigger,'CORE_IDENTITY_OR_STRUCTURAL_QUALITY_STILL_BLOCKED_AFTER_TARGETED_DERIVATION');
  assert.equal(base.sourceAssetMayRemainAsPartialDonorAfterReplacement,true);
  assert.equal(base.visualQualityNotImpliedByVerification,true);
  assert.equal(row.qualityDNA.profile,'HERO_CHARACTER');
  assert.ok(row.qualityDNA.axes.includes('FACE_HANDS_FEET'));
  assert.equal(row.qualityDNA.minimumFloors.FACE_HANDS_FEET,'HERO_GRADE');
  assert.equal(row.qualityDNA.donorPolicy.donorMayReplaceOnlyFailedAxes,true);
  assert.equal(row.qualityDNA.evidence.verificationStatusIsNotVisualQuality,true);
  assert.equal(row.qualityDNA.rescue.fullReauthorOnlyAfterTargetedRepairFails,true);
  assert.equal(plan.qualityDNA.commonRules.strongAxesLockedDuringRepair,true);
  assert.equal(plan.qualityDNA.commonRules.donorAssemblyBeforeFullReauthor,true);
  assert.ok(plan.qualityDNA.contracts.some(item=>item.type==='character'&&item.qualityDNA.profile==='HERO_CHARACTER'));
  assert.ok(base.detailInvestmentPolicy.prioritySignals.includes('SCREEN_SPACE_OCCUPANCY'));
  assert.ok(base.detailInvestmentPolicy.prioritySignals.includes('INTERACTION_FREQUENCY'));
  assert.equal(base.detailInvestmentPolicy.polygonOrTextureCountAloneIsNotQuality,true);
  assert.equal(plan.applyFirstSummary.visualVerificationAndVisualQualitySeparated,true);
  assert.ok(plan.applyFirstSummary.detailInvestmentPriority.includes('CAMERA_PROXIMITY'));
});


test('quality DNA keeps hero floors higher than background floors without inventing observed scores',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{gameId:'quality-dna-demo',goal:'캐릭터 배경 UI 디테일 제작'},
    manifest:{assets:[]},
    presetCatalog:{presets:[]}
  });
  const character=plan.decisions.find(row=>row.type==='character');
  const background=plan.decisions.find(row=>row.type==='background');
  assert.equal(character.qualityDNA.profile,'HERO_CHARACTER');
  assert.equal(character.qualityDNA.minimumFloors.SILHOUETTE,'HERO_GRADE');
  assert.equal(background.qualityDNA.profile,'REGION_WORLD');
  assert.equal(background.qualityDNA.minimumFloors.MACRO_FORM,'GAMEPLAY_READABLE_GRADE');
  assert.equal(character.qualityDNA.evidence.actualRuntimeCaptureRequiredForVisualClosure,true);
  assert.equal(character.qualityDNA.evidence.polygonTextureCountIsNotQuality,true);
  assert.equal(Object.hasOwn(character.qualityDNA,'observedScore'),false);
  assert.equal(Object.hasOwn(background.qualityDNA,'observedScore'),false);
  const guidance=assetProductionGuidance(plan);
  assert.match(guidance,/QUALITY DNA/);
  assert.match(guidance,/최소 제작 하한/);
});

test('flow asset requirements resolve through the latest company library and are exposed to source workers',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{
      gameId:'flow-loadout-fixture',
      goal:'전투 디펜스 플로우의 HUD, 랜드마크, 피격 피드백을 최신 내부 자산으로 적용',
      assetRequirements:[
        {family:'UI',subfamily:'HUD',required:true,resolution:'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME',assetIdPinned:false,gameplayAuthority:false},
        {family:'ENVIRONMENT',subfamily:'LANDMARK',required:true,resolution:'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME',assetIdPinned:false,gameplayAuthority:false},
        {family:'VFX',subfamily:'IMPACT',required:true,resolution:'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME',assetIdPinned:false,gameplayAuthority:false}
      ]
    }
  });
  assert.equal(plan.flowAssetRequirements.length,3);
  assert.equal(plan.flowAssetLoadout.selections.length,3);
  assert.equal(plan.flowAssetLoadout.resolutionMode,'LATEST_COMPATIBLE_INTERNAL_ASSET_AT_EXECUTION_TIME');
  assert.equal(plan.flowAssetLoadout.assetIdPinnedByFlow,false);
  assert.equal(plan.flowAssetLoadout.gameplayAuthority,false);
  assert.equal(plan.flowAssetLoadout.genreRestrictionApplied,false);
  assert.equal(plan.flowAssetLoadout.crossGenreReuseAllowed,true);
  assert.equal(plan.flowAssetLoadout.genreUsedForEligibility,false);
  assert.ok(plan.flowAssetRequirements.every(row=>row.genreRestriction===false&&row.crossGenreReuseAllowed===true));
  const guidance=assetProductionGuidance(plan);
  assert.match(guidance,/FLOW-DRIVEN ASSET REQUIREMENTS/);
  assert.match(guidance,/FLOW-DRIVEN ASSET LOADOUT/);
  assert.match(guidance,/최신 company-asset-library\.json/);
  assert.match(guidance,/gameplay\/balance\/progression\/save\/network 권한을 갖지 않는다/);
});
