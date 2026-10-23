// 파일명: qa/vibe2-native-asset-production.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {analyzeVibeSurfaceDistribution,assetProductionGuidance,buildAllGameDynamicLibraryBindingPlan,buildAssetSupplyDecisionSummary,buildVibeAssetProductionPlan,discoverExistingRobloxGameAssets,discoverRuntimeVisualEvidence,inspectVibeSourceObj,inspectVibeSourceGlb,evaluateCrossPlatform3dMasterGlb,isCrossPlatform3dActorType,crossPlatform3dActorFamilyForType,synchronizeSourceBoundAssetConsumers,synchronizeCompanyCommonAssetRegistry} from '../tools/vibe2-asset-production-plan.mjs';
import {observeAssetReferenceImages,observeAssetRuntimeCaptures,buildPrompt,deterministicRobloxBuildUpCandidate,buildInternalAssetSourceUsageContract,inspectRobloxNativeCandidateQuality,executeDeclaredNativeDccAuthoringVerification,evaluateNativeAssetAuthoringCandidate,collectNativeAssetRuntimePromotionCandidates,persistedGeneratedAssetBindings,buildInternalAssetApiIndex,attachSelectedInternalAssetApiContext} from '../tools/vibe2-source-worker.mjs';
import {createVibeReferenceImageStudyRequest,createVibeMapDetailReconstruction} from '../assets/vibe-environment-director.js';
import {findPresentationQualityTask,findRobloxStudioAssetBackfillTask,findWeatherPresentationTask,planVibe2AutonomousTasks} from '../tools/vibe2-auto-planner.mjs';
import {runIncrementalQa} from '../tools/vibe2-incremental-qa.mjs';
import {buildRobloxStudioAssetBootstrapPlan,compileRobloxSource,robloxStudioAssetFamilyBoundInText} from '../tools/company-development-roblox-bootstrap.mjs';

// Rule 5: even a compatible library entry is never promoted by a permissive
// game-content license, company ownership or practice output on any platform.
test('all-platform game library binding rejects non-CC0 and practice assets before role selection',()=>{
  const base={family:'UI',platform:'SHARED',targetPlatforms:['WEB','ROBLOX','UNITY','FORTNITE_UEFN'],
    path:'assets/shared/ui/menu.svg',sourceHash:'a'.repeat(64)};
  const assets=[
    {...base,id:'cc0',license:'CC0'},
    {...base,id:'cc0-1',license:'CC0-1.0'},
    {...base,id:'mit',license:'MIT'},
    {...base,id:'cc-by',license:'CC-BY-4.0'},
    {...base,id:'commercial',license:'commercial-no-attribution'},
    {...base,id:'original',license:'project-original'},
    {...base,id:'public-domain',license:'public-domain'},
    {...base,id:'practice',license:'CC0',practiceOnly:true},
    {...base,id:'quarantined',license:'CC0',quarantined:true}
  ];
  for(const target of ['web','roblox','unity','fortnite_uefn']){
    const plan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{assets},target,gameId:'demo'});
    assert.deepEqual(plan.familyCandidates.UI.map(row=>row.assetId),['cc0','cc0-1'],target);
    for(const id of ['mit','cc-by','commercial','original','public-domain']){
      const row=plan.evaluatedAssets.find(candidate=>candidate.assetId===id);
      assert.equal(row.eligibleForRoleEvaluation,false,target+' '+id);
      assert.equal(row.hardBlockReason,'CC0_ORIGINAL_LICENSE_REQUIRED',target+' '+id);
    }
    assert.equal(plan.evaluatedAssets.find(row=>row.assetId==='practice').hardBlockReason,'PRACTICE_ASSET_FORBIDDEN');
    assert.equal(plan.evaluatedAssets.find(row=>row.assetId==='quarantined').hardBlockReason,'SECURITY_BLOCKED');
  }
});

// 중앙 정책: 외부 원본은 게임에서 필요한 경우만 선택하며 재질 수정·등록·런타임 승격은 별도 검증한다.
test('current-game asset gap selects licensed external source for on-demand PBR derivative, not a verified asset',()=>{
  const external={
    id:'kenney-building-test',name:'Building Kit',category:'BUILDING',
    status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',license:'CC0',
    sourceUrl:'https://kenney.nl/assets/building-kit',
    licenseEvidenceUrl:'https://kenney.nl/assets/building-kit',
    verifiedAt:'2026-10-01',platformTargets:['UNITY','ROBLOX'],
    automaticAcquisitionWhenSelected:true,commercialUseAllowed:true,derivativesAllowed:true,
    capabilities:['GLB','FBX'],prefetchAllowed:false
  };
  const registry={assets:[],externalSources:[external],
    baseMaterialLibrary:{families:{MATERIAL:['WOOD','STONE','MOD_WORN']}}};
  const params={gameId:'home-game',target:'unity',request:'village building',
    requirements:[{family:'BUILDING',role:'house'}],registry};
  const plan=buildAssetSupplyDecisionSummary(params);
  const action=plan.nextActions.find(row=>row.family==='BUILDING');
  assert.equal(action.action,'ACQUIRE_ADAPT');
  assert.equal(action.assetId,null);
  assert.equal(action.externalAcquisition.sourceId,'kenney-building-test');
  assert.equal(action.externalAcquisition.acquisitionState,'SOURCE_PAGE_RESOLUTION_REQUIRED');
  assert.equal(action.externalAcquisition.downloadUrl,null,'source landing page is not a downloadable 3D file');
  assert.equal(action.externalAcquisition.onDemandOnly,true);
  assert.equal(action.externalAcquisition.bulkPrefetchForbidden,true);
  assert.equal(action.externalAcquisition.sourceFileMustBeReal3d,true);
  assert.equal(action.roleEvidence.verifiedRoleMatch,false,'catalog categories cannot verify individual geometry roles');
  assert.equal(action.materialRefinement.originalAssetImmutable,true);
  assert.deepEqual(action.materialRefinement.availableSemanticAtoms,['WOOD','STONE','MOD_WORN']);
  assert.equal(action.materialRefinement.sourceMaterialModificationPerformed,false);
  assert.equal(action.assetization.registerOnlyAfterActualBinaryAndLicenseAndStaticQa,true);
  assert.equal(action.assetization.nativeDccScript,'assets/native-authoring/build-game-visual.py');
  assert.equal(action.assetization.nativeSourceModelField,'task.assetAuthoring.sourceModel');
  assert.equal(action.assetization.gameSourceWorkerMayEditCentralRegistry,false);
  assert.equal(action.assetization.productionVerified,false);
  assert.equal(plan.selectedOnDemandExternalGapCount,1);
  assert.equal(plan.runtimeVerificationGranted,false);
  assert.equal(plan.productionVerificationGranted,false);
  assert.match(assetProductionGuidance({kind:'vibe2-asset-production-plan',gameId:'home-game',target:'unity',assetSupplySummary:plan}),/ON-DEMAND LICENSED ASSET GAP FILL/);
  assert.equal(buildAssetSupplyDecisionSummary({...params,gameId:''}).selectedOnDemandExternalGapCount,0,'no unidentified game may trigger external acquisition');
});

// [로블록스 원본 재사용] 준비된 외부 GLB를 이름·라이선스·SHA 근거로 사용하되 실행 검증은 생략하지 않는다.
test('acquired Roblox CC0-1.0 GLB is selected as pending native-import reuse, never falsely verified',()=>{
  const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const registry=JSON.parse(fs.readFileSync(path.join(repo,'company-asset-library.json'),'utf8'));
  const actor=registry.assets.find(row=>row.id==='external-actor-skeleton-warrior');
  assert.ok(actor);
  assert.equal(actor.nativeBindingRequired,true);
  assert.equal(actor.productionVerified,false);
  const params={gameId:'asset-reuse-qa',target:'roblox',request:'skeleton warrior',
    requirements:[{family:'CREATURE',role:'skeleton_warrior'}]};
  const selected=buildAssetSupplyDecisionSummary({...params,registry:{assets:[actor],externalSources:[]}});
  const action=selected.nextActions.find(row=>row.family==='CREATURE');
  assert.equal(action.assetId,actor.id);
  assert.equal(action.action,'ADAPT','unimported GLB cannot be treated as native-runtime-ready');
  assert.equal(action.reason,'REUSABLE_LIBRARY_NATIVE_IMPORT_REQUIRED');
  assert.deepEqual(action.roleEvidence.matchedRoles,['skeleton_warrior']);
  assert.equal(action.libraryReuse.sourceModel,actor.path);
  assert.equal(action.libraryReuse.sourceLicense,'cc0-1.0');
  assert.equal(action.libraryReuse.expectedSourceSha256,actor.masterGlbHash);
  assert.equal(action.libraryReuse.derivativeCandidateReady,true);
  assert.equal(action.assetization.productionVerified,false);
  assert.equal(selected.productionVerificationGranted,false);
  assert.equal(selected.selectedOnDemandExternalGapCount,0);
  const wrongRole=buildAssetSupplyDecisionSummary({...params,request:'ghost',
    requirements:[{family:'CREATURE',role:'ghost'}],registry:{assets:[actor],externalSources:[]}});
  assert.notEqual(wrongRole.nextActions.find(row=>row.family==='CREATURE').assetId,actor.id);
});

// 메인 · 특정 게임에 묶이지 않은 F0 공통 생물 외형 대체 회귀.
test('all-game F0 asset supply reuses same-species 3D creature without accepting unrelated forms',()=>{
  const actor={id:'licensed-shared-wolf',family:'CREATURE',role:'wolf',
    platform:'SHARED_NATIVE_SOURCE',companyCommonBase:true,
    path:'assets/shared/wolf.glb',sourceSha256:'a'.repeat(64),
    license:'CC0-1.0',status:'REPO_ASSET',productionVerified:false};
  const registry={assets:[actor],externalSources:[]};
  for(const role of ['shadowwolf','crystal_wolf','polarwolf']){
    const result=buildAssetSupplyDecisionSummary({
      gameId:'different-existing-game',target:'web',
      request:'licensed wolf model reuse',
      requirements:[{family:'CREATURE',role}],registry
    });
    const action=result.nextActions.find(row=>row.family==='CREATURE');
    assert.equal(action.assetId,actor.id,role);
    assert.ok(action.roleEvidence.matchedRoles.includes(role),role);
    assert.equal(action.roleEvidence.visualSpeciesSubstitute,true,role);
    assert.equal(action.roleEvidence.visualSpeciesSubstituteRequiresNativeMeshRigAndRuntimeQa,true,role);
    assert.equal(action.roleEvidence.originalMonsterIdentityAndGameplayPreserved,true,role);
    assert.equal(result.productionVerificationGranted,false,'same species does not constitute runtime approval');
  }
  for(const role of ['werewolf','ghost','boar']){
    const result=buildAssetSupplyDecisionSummary({
      gameId:'different-existing-game',target:'web',
      request:'creature visual replacement',
      requirements:[{family:'CREATURE',role}],registry
    });
    const action=result.nextActions.find(row=>row.family==='CREATURE');
    assert.notEqual(action?.assetId,actor.id,'unrelated or humanoid species must not be silently substituted: '+role);
  }
  const weapon=buildAssetSupplyDecisionSummary({
    gameId:'different-existing-game',target:'web',
    request:'weapon asset selection',requirements:[{family:'WEAPON',role:'shadowwolf'}],
    registry:{assets:[{...actor,id:'not-a-creature',family:'WEAPON'}],externalSources:[]}
  });
  assert.notEqual(weapon.nextActions.find(row=>row.family==='WEAPON')?.assetId,'not-a-creature',
    'species substitution is presentation-only for creatures');
});

// [재사용 → 소폭 재질 보정 → 자산화] 회사 원본을 별도 파생으로 연결하되 실물·엔진 증거는 엄격히 분리한다.
test('eligible internal 3d asset auto-fill exposes exact native material derivative and unverified assetization',()=>{
  const original={
    id:'shared-forest-tree',family:'ENVIRONMENT',role:'tree',platform:'SHARED_MASTER',
    path:'/assets/shared/forest-tree.glb',license:'CC0',
    status:'REPO_ASSET',sourceSha256:'example-source-expected-hash'
  };
  const registry={assets:[original],externalSources:[],
    baseMaterialLibrary:{families:{MATERIAL:['WOOD','MOD_WORN']}}};
  const plan=buildAssetSupplyDecisionSummary({
    gameId:'new-forest',target:'unity',request:'나무 재질 자산화',
    requirements:[{family:'ENVIRONMENT',role:'tree'}],registry
  });
  const action=plan.nextActions.find(row=>row.family==='ENVIRONMENT');
  assert.equal(action.action,'ADAPT');
  assert.equal(action.libraryReuse.sourceAssetId,original.id);
  assert.equal(action.libraryReuse.sourceModel,'assets/shared/forest-tree.glb');
  assert.equal(action.libraryReuse.expectedSourceSha256,original.sourceSha256);
  assert.equal(action.libraryReuse.sourceFileAndSha256InspectionRequired,true);
  assert.equal(action.libraryReuse.derivativeCandidateReady,true);
  assert.equal(action.materialRefinement.mode,'SUBTLE_CONTEXT_PBR_REAUTHOR');
  assert.deepEqual(action.materialRefinement.availableSemanticAtoms,['WOOD','MOD_WORN']);
  assert.equal(action.materialRefinement.sourceMaterialModificationPerformed,false);
  assert.equal(action.assetization.nativeDccScript,'assets/native-authoring/build-game-visual.py');
  assert.equal(action.assetization.registryWriteOwner,'EXISTING_GRAPHICS_PRODUCTION_SYNC');
  assert.equal(action.assetization.gameSourceWorkerMayEditCentralRegistry,false);
  assert.equal(action.assetization.productionVerified,false);
  assert.equal(action.assetization.runtimeVerified,false);
  assert.equal(plan.productionVerificationGranted,false);
  assert.match(assetProductionGuidance({kind:'vibe2-asset-production-plan',gameId:'new-forest',
    target:'unity',assetSupplySummary:plan}),/COMPANY LIBRARY MATERIAL DERIVATIVE/);
  const prompt=buildPrompt({target:'unity',gameId:'new-forest',goal:'나무 재질 자산화',
    assetProduction:{assetSupplySummary:plan,nativeAuthoringExecution:{enabled:false}}},{
    files:[{path:'Assets/Scripts/World.cs',editable:true,
      content:'using UnityEngine; public class World : MonoBehaviour {}'}]
  },['Assets/Scripts/World.cs']);
  assert.match(prompt,/"onDemandLibrarySupply"/);
  assert.match(prompt,/"selectedSourceId":"shared-forest-tree"/);
  assert.ok(prompt.includes('"sourceModel":"assets/shared/forest-tree.glb"'));
  assert.match(prompt,/"sourceInspectionRequired":true/);
  assert.match(prompt,/"runtimeVerified":false/);
});

test('existing native DCC automatically derives only role-matched internal source with matching local SHA256',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-library-derive-'));
  try{
    const shared=path.join(root,'assets','shared');
    fs.mkdirSync(shared,{recursive:true});
    const sourcePath=path.join(shared,'tree.obj');
    const original='mtllib tree.mtl\no tree\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nvn 0 0 1\nusemtl Wood\nf 1/1/1 2/2/1 3/3/1\n';
    fs.writeFileSync(sourcePath,original);
    fs.writeFileSync(path.join(shared,'tree.mtl'),'newmtl Wood\nKd 0.5 0.3 0.2\n');
    const sha=createHash('sha256').update(original).digest('hex');
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,
      assets:[{id:'shared-tree',family:'ENVIRONMENT',role:'tree',platform:'SHARED_MASTER',
        path:'assets/shared/tree.obj',license:'CC0',status:'REPO_ASSET',
        sourceSha256:sha,sourceFiles:['assets/shared/tree.obj']}]
    }));
    const task={gameId:'forest-game',goal:'environment background asset visuals',
      assetRequirements:[{family:'ENVIRONMENT',role:'tree'}]};
    const build=()=>buildVibeAssetProductionPlan({repoRoot:root,target:'unity',task,
      manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
    const initial=build();
    const candidates=initial.nativeAuthoringExecution.dcc.executionRecipes.filter(row=>row.automaticLibraryDerivative);
    assert.ok(candidates.length>0,'selected internal tree should enter canonical native DCC recipes');
    const derived=candidates.find(row=>row.sourceModel==='assets/shared/tree.obj');
    assert.ok(derived);
    assert.equal(derived.librarySourceAssetId,'shared-tree');
    assert.equal(derived.librarySourceSha256,sha);
    assert.equal(derived.sourceLicense,'cc0');
    assert.equal(derived.args[derived.args.indexOf('--library-parent-id')+1],'shared-tree');
    assert.equal(derived.args[derived.args.indexOf('--library-source-sha256')+1],sha);
    assert.ok(derived.args.includes('--source-model'));
    assert.equal(derived.companyPromotionAllowed,false);
    assert.equal(derived.runtimeVerificationRequired,true);
    fs.appendFileSync(sourcePath,'# unauthorized source mutation\n');
    const changed=build();
    assert.equal(changed.nativeAuthoringExecution.dcc.executionRecipes.some(row=>row.automaticLibraryDerivative),false,
      'stale source hashes must never auto-generate a derivative');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// [원자적 제작] 원본이 계획 이후 바뀌면 기존 Blender 실행 전 중단한다.
test('library derivative refuses changed parent bytes without invoking Blender authoring',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-parent-atomic-'));
  try{
    execFileSync('git',['init','-q'],{cwd:root});
    fs.mkdirSync(path.join(root,'assets','shared'),{recursive:true});
    fs.mkdirSync(path.join(root,'assets','native-authoring'),{recursive:true});
    const sourcePath=path.join(root,'assets','shared','tree.obj');
    const source='v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n';
    fs.writeFileSync(sourcePath,source);
    const expected=createHash('sha256').update(source).digest('hex');
    fs.appendFileSync(sourcePath,'# changed\n');
    fs.writeFileSync(path.join(root,'assets/native-authoring/build-game-visual.py'),'# fixture\n');
    const fake=path.join(root,'fake-blender.sh');
    fs.writeFileSync(fake,'#!/bin/sh\nif [ "$1" = "--version" ]; then exit 0; fi\ntouch invoked\nexit 0\n');
    fs.chmodSync(fake,0o755);
    const recipe={
      id:'derived-tree',executor:'BLENDER_PYTHON',runMode:'VERIFY_ONLY',
      script:'assets/native-authoring/build-game-visual.py',
      automaticLibraryDerivative:true,librarySourceAssetId:'shared-tree',
      librarySourceSha256:expected,sourceModel:'assets/shared/tree.obj',
      args:['--source-model','assets/shared/tree.obj','--library-parent-id','shared-tree','--library-source-sha256',expected],
      outputs:['assets/generated/unity/demo/environment/asset.glb']
    };
    const order={evidence:['asset-production-parallel:v1'],assetProduction:{nativeAuthoringExecution:{dcc:{executionRecipes:[recipe]}}}};
    assert.throws(()=>executeDeclaredNativeDccAuthoringVerification({
      cwd:root,order,blenderExecutable:fake,persistCandidateOutputs:false
    }),/NATIVE_DCC_LIBRARY_SOURCE_CHANGED/);
    assert.equal(fs.existsSync(path.join(root,'invoked')),false);
    assert.equal(fs.existsSync(path.join(root,recipe.outputs[0])),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('unusable or rights-blocked library sources never become auto-produced models',()=>{
  const base={id:'tree-source',family:'ENVIRONMENT',role:'tree',platform:'SHARED_MASTER',status:'REPO_ASSET'};
  for(const blocked of [
    {...base,path:'/assets/shared/tree.png',license:'project-original'},
    {...base,path:'/assets/shared/tree.glb',license:'CC-BY-NC'},
    {...base,path:'/assets/shared/tree.glb',license:'unknown'}
  ]){
    const plan=buildAssetSupplyDecisionSummary({gameId:'forest-2',target:'roblox',
      requirements:[{family:'ENVIRONMENT',role:'tree'}],registry:{assets:[blocked],externalSources:[]}});
    assert.equal(plan.nextActions.some(row=>row.action==='ADAPT'),false,blocked.license);
    assert.equal(plan.productionVerificationGranted,false);
  }
});

test('audio and UI library gap-fill cannot be routed to the 3D Blender material authoring path',()=>{
  const registry={assets:[],externalSources:[
    {id:'ui-source',name:'UI Pack',category:'UI',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',
      sourceUrl:'https://kenney.nl/assets/ui-pack',licenseEvidenceUrl:'https://kenney.nl/assets/ui-pack',
      verifiedAt:'2026-10-01',license:'CC0',platformTargets:['UNITY'],automaticAcquisitionWhenSelected:true},
    {id:'sound-source',name:'Impact Sounds',category:'AUDIO',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',
      sourceUrl:'https://kenney.nl/assets/impact-sounds',licenseEvidenceUrl:'https://kenney.nl/assets/impact-sounds',
      verifiedAt:'2026-10-01',license:'CC0',platformTargets:['UNITY'],automaticAcquisitionWhenSelected:true}
  ]};
  for(const family of ['UI','AUDIO']){
    const plan=buildAssetSupplyDecisionSummary({gameId:'asset-test',target:'unity',requirements:[{family,role:'generic'}],registry});
    const candidate=plan.nextActions.find(row=>row.family===family);
    assert.equal(candidate.action,'ACQUIRE_ADAPT');
    assert.equal(candidate.materialRefinement.mode,'NATIVE_FAMILY_ADAPT_NO_PBR');
    assert.deepEqual(candidate.materialRefinement.allowedAxes,[]);
    assert.equal(candidate.assetization.nativeDccScript,null);
    assert.equal(candidate.assetization.nativeSourceModelField,null);
    assert.deepEqual(candidate.assetization.nativeOutputFiles,[]);
    assert.equal(candidate.assetization.gameSourceWorkerMayEditCentralRegistry,false);
  }
});

test('blocked, manual or unverified external catalogs cannot authorize asset acquisition',()=>{
  const base={id:'test-source',name:'Forest Asset',category:'ENVIRONMENT',
    status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',sourceUrl:'https://example.org/forest',
    licenseEvidenceUrl:'https://example.org/license',verifiedAt:'2026-10-01',
    license:'CC0',platformTargets:['UNITY'],automaticAcquisitionWhenSelected:true};
  const unsafe=[
    {...base,license:'CC-BY-NC',commercialUseAllowed:true,derivativesAllowed:true},
    {...base,license:'UNKNOWN'},
    {...base,status:'RESEARCH_ONLY'},
    {...base,sourceUrl:'http://example.org/forest'},
    {...base,sourceUrl:'https://127.0.0.1/internal'},
    {...base,licenseEvidenceUrl:'https://localhost/license'},
    {...base,derivativesAllowed:false},
    {...base,automaticAcquisitionWhenSelected:false},
    {...base,platformTargets:['ROBLOX']}
  ];
  for(const source of unsafe){
    const plan=buildAssetSupplyDecisionSummary({gameId:'forest-game',target:'unity',request:'forest',
      requirements:[{family:'ENVIRONMENT',role:'tree'}],registry:{assets:[],externalSources:[source]}});
    assert.equal(plan.selectedOnDemandExternalGapCount,0,JSON.stringify(source));
    assert.equal(plan.nextActions.find(row=>row.family==='ENVIRONMENT').action,'HOLD','unverified originals must not trigger invented assets');
  }
});

test('2D references never count as ready spatial assets, while current real 3D remains preferred over external acquisition',()=>{
  const external={id:'safe-3d',name:'Building Models',category:'BUILDING',
    status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',sourceUrl:'https://example.org/buildings',
    licenseEvidenceUrl:'https://example.org/rights',verifiedAt:'2026-10-01',
    license:'CC0',automaticAcquisitionWhenSelected:true,platformTargets:['UNITY']};
  const params={gameId:'village-game',target:'unity',request:'village',requirements:[{family:'BUILDING',role:'cabin'}]};
  const ref2d={id:'old-reference',family:'BUILDING',license:'project-original',
    status:'REPO_ASSET',path:'/assets/village.webp',consumerGameIds:['village-game']};
  const fallback=buildAssetSupplyDecisionSummary({...params,registry:{assets:[ref2d],externalSources:[external]}});
  assert.equal(fallback.nextActions.find(row=>row.family==='BUILDING').action,'ACQUIRE_ADAPT');
  const actual3d={...ref2d,id:'reusable-model',license:'CC0',path:'assets/shared/village.glb',platform:'SHARED_MASTER'};
  const preferred=buildAssetSupplyDecisionSummary({...params,registry:{assets:[actual3d],externalSources:[external]}});
  assert.equal(preferred.selectedOnDemandExternalGapCount,0);
  assert.equal(preferred.nextActions.find(row=>row.family==='BUILDING').assetId,'reusable-model');
  assert.ok(['USE','ADAPT'].includes(preferred.nextActions.find(row=>row.family==='BUILDING').action));
});


test('downloaded original first: compare an existing authored tree against a licensed source before replacing it',()=>{
  const authored={id:'internal-pine-tree',family:'ENVIRONMENT',role:'pine_tree',platform:'ROBLOX',
    path:'assets/roblox/survival-core-world-v1/tree_trunk_thick.obj',license:'project-original',
    status:'REPO_ASSET',consumerGameIds:['forest-demo']};
  const original={id:'cc0-pine',name:'Real Pine Tree',category:'ENVIRONMENT',capabilities:['pine_tree'],
    status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',sourceUrl:'https://kenney.nl/assets/nature-kit',
    licenseEvidenceUrl:'https://kenney.nl/assets/nature-kit',verifiedAt:'2026-10-01',
    license:'CC0',platformTargets:['ROBLOX'],automaticAcquisitionWhenSelected:true,
    downloadUrl:'https://example.org/real-pine.glb'};
  const args={gameId:'forest-demo',target:'roblox',request:'pine tree',
    requirements:[{family:'ENVIRONMENT',role:'pine_tree'}]};
  const comparison=buildAssetSupplyDecisionSummary({...args,registry:{assets:[authored],externalSources:[original]}});
  const actions=comparison.nextActions.filter(row=>row.family==='ENVIRONMENT');
  const acquisition=actions.find(row=>row.action==='ACQUIRE_ADAPT');
  assert.ok(acquisition,'compare original source before retaining the authored stand-in indefinitely');
  assert.equal(acquisition.reason,'ORIGINAL_SOURCE_FIRST_ON_DEMAND');
  assert.notEqual(acquisition.replacesCandidateAssetId,authored.id,'deleted original cannot be a replacement baseline');
  assert.equal(acquisition.externalAcquisition.sourceId,original.id);
  assert.equal(acquisition.externalAcquisition.onDemandOnly,true);
  assert.equal(acquisition.externalAcquisition.downloaded,false);
  assert.equal(acquisition.automaticReplacementAuthorized,false);
  assert.equal(acquisition.assetization.runtimeVerified,false);
  assert.equal(acquisition.assetization.productionVerified,false);
  assert.equal(actions.some(row=>row.assetId===authored.id&&['USE','ADAPT','IMPROVE'].includes(row.action)),false,'Rule5 prevents using revoked original');
  const existingAcquired={...authored,sourceUrl:original.sourceUrl,originalSourceHash:'a'.repeat(64)};
  const retained=buildAssetSupplyDecisionSummary({...args,registry:{assets:[existingAcquired],externalSources:[original]}});
  assert.equal(retained.nextActions.some(row=>row.reason==='CURRENT_GAME_INTERNAL_ASSET_VS_DOWNLOADED_ORIGINAL'),false);
  const mismatch=buildAssetSupplyDecisionSummary({...args,registry:{assets:[authored],
    externalSources:[{...original,name:'Desert Cat',capabilities:['desert_cat']}]}});
  assert.equal(mismatch.nextActions.some(row=>row.reason==='CURRENT_GAME_INTERNAL_ASSET_VS_DOWNLOADED_ORIGINAL'),false);
});

test('actual acquired CC0 mesh outranks unverified authored mesh for same game role',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const realRegistry=JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8'));
 const original=realRegistry.assets.find(row=>row.id==='external-actor-skeleton-warrior');
 assert.ok(original,'downloaded original must be in canonical company registry');
 assert.ok(fs.statSync(path.join(root,original.path)).size>256,'the native GLB must actually exist');
 const internal={id:'authored-skeleton-warrior',family:'CREATURE',role:'skeleton_warrior',
   subfamily:'skeleton_warrior',platform:'ROBLOX',status:'REPO_ASSET',license:'project-original',
   path:'assets/shared/humanoid-traveler.glb',internalAuditScore:995};
 const base={gameId:'original-first-audit',target:'roblox',request:'skeleton warrior',
   requirements:[{family:'CREATURE',role:'skeleton_warrior'}],repoRoot:root,
   registry:{assets:[internal,original],externalSources:[]}};
 const first=buildAssetSupplyDecisionSummary(base);
 const action=first.nextActions.find(row=>row.assetId===original.id);
 assert.ok(action,'downloaded original must rank before the authored library score');
 assert.equal(action.action,'ADAPT','runtime import still required; no fabricated completion');
 assert.equal(first.runtimeVerificationGranted,false);
 assert.equal(first.productionVerificationGranted,false);
 const unavailable=buildAssetSupplyDecisionSummary({...base,registry:{assets:[internal,
   {...original,path:'assets/roblox/actors/native/not-found-model.glb'}],externalSources:[]}});
 const pendingSource=unavailable.nextActions.find(row=>row.assetId===original.id);
 assert.ok(pendingSource,'catalog candidate remains visible for exact source hydration');
 assert.equal(pendingSource.action,'ADAPT','missing bytes cannot be claimed as native USE');
 assert.equal(pendingSource.libraryReuse.sourceFileAndSha256InspectionRequired,true);
 assert.equal(unavailable.nextActions.some(row=>row.assetId===internal.id&&['USE','ADAPT','IMPROVE'].includes(row.action)),false);
 assert.equal(unavailable.productionVerificationGranted,false);
 assert.equal(unavailable.runtimeVerificationGranted,false);
 const existing=buildAssetSupplyDecisionSummary({...base,gameId:'original-existing',
   registry:{assets:[{...internal,consumerGameIds:['original-existing']},original],externalSources:[]}});
 assert.equal(existing.nextActions.some(row=>row.assetId===internal.id&&['USE','ADAPT','IMPROVE'].includes(row.action)),false,
   'deleted internal actor is not an authorized current visual');
 assert.equal(existing.nextActions.some(row=>row.assetId===original.id&&row.action==='ADAPT'),true,
   'registered CC0 original remains a native-import candidate');
 assert.equal(existing.productionVerificationGranted,false);
 assert.equal(existing.runtimeVerificationGranted,false);
});
test('existing Vibe source worker passes on-demand library selection to native game build with no false completion',()=>{
  const order={target:'unity',gameId:'fantasy-survival',goal:'기존 3D 자산으로 환경 재질 보강',assetProduction:{
    assetSupplySummary:{nextActions:[{
      action:'ACQUIRE_ADAPT',family:'ENVIRONMENT',reason:'CURRENT_GAME_GAP_LICENSE_VERIFIED_EXTERNAL_SOURCE',
      externalAcquisition:{sourceId:'kenney-nature-kit',sourceUrl:'https://kenney.nl/assets/nature-kit',
        downloadUrl:null,acquisitionState:'SOURCE_PAGE_RESOLUTION_REQUIRED',
        license:'CC0',licenseEvidenceUrl:'https://kenney.nl/assets/nature-kit'},
      assetization:{nativeDccScript:'assets/native-authoring/build-game-visual.py',
        nativeSourceModelField:'task.assetAuthoring.sourceModel'}
    }]},nativeAuthoringExecution:{enabled:false}
  }};
  const prompt=buildPrompt(order,{files:[{path:'Assets/Scripts/World.cs',
    content:'using UnityEngine; public class World : MonoBehaviour {}',editable:true}]},['Assets/Scripts/World.cs']);
  assert.match(prompt,/"onDemandLibrarySupply"/);
  assert.match(prompt,/"selectedSourceId":"kenney-nature-kit"/);
  assert.match(prompt,/"acquisitionState":"SOURCE_PAGE_RESOLUTION_REQUIRED"/);
  assert.match(prompt,/"nativeBuildBlockedByUnacquiredSource":true/);
  assert.match(prompt,/"nativeBuildRequiresRegisteredAssetAndRealSource":true/);
  assert.match(prompt,/"runtimeVerified":false/);
  assert.match(prompt,/"productionVerified":false/);
});

test('Rule5 deleted handcrafted creature GLBs cannot claim a built or verified master',()=>{
 const lib=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
 for(const species of ['wolf','spider','beetle','golem','serpent']){
   const id='shared-creature-'+species;
   assert.equal(lib.assets.some(row=>row.id===id),false,'retired creature master: '+id);
   assert.equal(fs.existsSync('assets/shared/creature-'+species+'-actions.glb'),false,'removed authored joint clips must stay removed');
 }
 assert.ok(lib.assets.some(row=>String(row.license).toUpperCase().startsWith('CC0')),'licensed originals remain available for request-bound sourcing');
 assert.equal(lib.productionPassAuthority,false);
});
test('Unity and shared gameplay libraries mandate real native 3D while keeping UI/audio as support resources',()=>{
  const guidance=assetProductionGuidance({kind:'vibe2-asset-production-plan'});
  assert.match(guidance,/OWNER 3D SPATIAL ASSET CONTRACT/);
  assert.match(guidance,/실제 3D 메시\/삼각형\/깊이\/재질/);
  assert.match(guidance,/2D 스프라이트, 평면 이미지, 카드/);
  assert.match(guidance,/UI·HUD·아이콘·텍스처·오디오 자체는 2D/);
  assert.match(guidance,/Unity Web은 원본 Unity 프로젝트/);
});

test('Vibe genre menu recommendations bind source-backed existing UI without owning economy, save or network',()=>{
  const root=tempRoot();
  try{
    const uiFile=path.join(root,'assets','roblox','common-ui-v1','RobloxCommonUI.luau');
    fs.mkdirSync(path.dirname(uiFile),{recursive:true});
    fs.writeFileSync(uiFile,[
      'function RobloxCommonUI.CreateCharacterDetailScreen(options) end',
      'function RobloxCommonUI.CreateInventoryFullScreen(options) end',
      'function RobloxCommonUI.CreateEquipmentFullScreen(options) end',
      'function RobloxCommonUI.CreateBuySellPanel(options) end',
      'function RobloxCommonUI.CreateQuestLog(options) end'
    ].join('\n'));
    const gameRoot=path.join(root,'roblox-games','demo-rpg','shared');
    fs.mkdirSync(gameRoot,{recursive:true});
    fs.writeFileSync(path.join(gameRoot,'RPGMenu.luau'),
      'local GuiService=game:GetService("GuiService")\nlocal character=Model.character(state,config)\nlocal shop=Model.shop(state,config)\nlocal gear=Model.equipment(state,config)\n');
    // UI 문자열만으로 시스템을 추정하지 않으며, 실제 게임 소스의 책임 함수가 필요하다.
    const serverDir=path.join(root,'roblox-games','demo-rpg','server');
    fs.mkdirSync(serverDir,{recursive:true});
    fs.writeFileSync(path.join(serverDir,'Game.server.luau'),[
      'local function purchaseMerchantEquipment(player,kind)',
      '  local cost=50',
      '  player:SetAttribute("Gold",player:GetAttribute("Gold")-cost)',
      '  player:SetAttribute("WeaponTier",2)',
      '  player:SetAttribute("MaxHP",100)',
      'end',
      'local function acceptQuest(player) player:SetAttribute("QuestPortal",1) end'
    ].join('\n'));
    const task={gameId:'demo-rpg',genre:'RPG',goal:'현재 캐릭터 장비 인벤토리 상점 메뉴를 실제 게임 상태와 동기화'};
    const request={target:'roblox',repoRoot:root,task,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}};
    const plan=buildVibeAssetProductionPlan(request);
    const menu=plan.genreMenuRecommendations;
    assert.ok(menu.signals.includes('RPG_PROGRESSION'));
    assert.ok(menu.companySeedUiIdeaIds.includes('RPG_QUEST_EQUIPMENT_CODEX_SCREENS'));
    assert.ok(menu.candidateFeatures.some(row=>row.role==='TRADE'&&row.factory==='CreateBuySellPanel'));
    assert.equal(menu.newQueueCreated,false);
    assert.equal(menu.shadowUiPipelineCreated,false);
    assert.equal(menu.runtimeVerifiedCount,0);
    assert.ok(menu.nativeSourceBoundCandidateCount>=2);
    const character=menu.candidateFeatures.find(row=>row.role==='CHARACTER');
    assert.equal(character.companyFactoryPresent,true);
    assert.equal(character.status,'NATIVE_UI_SOURCE_PRESENT_RUNTIME_QA_REQUIRED');
    assert.equal(character.existingNativeUiRefs[0].path,'roblox-games/demo-rpg/shared/RPGMenu.luau');
    assert.match(character.companyUiSourceSha256,/^[a-f0-9]{64}$/);
    assert.match(character.existingNativeUiRefs[0].sha256,/^[a-f0-9]{64}$/);
    const commerce=menu.candidateFeatures.find(row=>row.role==='TRADE');
    assert.equal(commerce.status,'NATIVE_UI_SOURCE_PRESENT_RUNTIME_QA_REQUIRED');
    assert.equal(commerce.gameplaySaveNetworkEconomyAuthorityRetained,true);
    const guidance=assetProductionGuidance(plan);
    assert.match(guidance,/GENRE MENU FEATURE SYNCHRONIZATION/);
    assert.match(guidance,/게임 상태/);
    assert.match(guidance,/NATIVE_UI_SOURCE_PRESENT_RUNTIME_QA_REQUIRED/);
    fs.unlinkSync(path.join(gameRoot,'RPGMenu.luau'));
    const noUi=buildVibeAssetProductionPlan(request).genreMenuRecommendations;
    const unbound=noUi.candidateFeatures.find(row=>row.role==='CHARACTER');
    assert.equal(unbound.status,'EXISTING_SYSTEM_NATIVE_UI_BINDING_REQUIRED');
    assert.equal(unbound.existingNativeUiRefs.length,0);
    fs.unlinkSync(path.join(serverDir,'Game.server.luau'));
    const noSource=buildVibeAssetProductionPlan(request).genreMenuRecommendations;
    assert.equal(noSource.candidateFeatures.find(row=>row.role==='CHARACTER').status,
      'IDEA_ONLY_GAME_SYSTEM_NOT_CONFIRMED');
    assert.equal(noSource.runtimeVerifiedCount,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('genre-specific menu ideas reuse official genre signals without inventing missing gameplay systems',()=>{
  const root=tempRoot();
  try{
    const configurations=[
      {genre:'SURVIVAL',signal:'SURVIVAL',role:'CRAFT'},
      {genre:'TYCOON',signal:'TYCOON_SIM',role:'HOUSING'},
      {genre:'HORROR',signal:'HORROR',role:'CODEX'},
      {genre:'TOWER DEFENSE',signal:'DEFENSE',role:'DEFENSE'},
      {genre:'PUZZLE',signal:'PUZZLE',role:'PUZZLE'},
      {genre:'COZY FARMING',signal:'COZY_FARMING',role:'FARM'}
    ];
    for(const row of configurations){
      const plan=buildVibeAssetProductionPlan({target:'unity',repoRoot:root,
        task:{gameId:'genre-demo',genre:row.genre,goal:'모바일 메뉴 아이디어 제안'},
        manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
      const suggestions=plan.genreMenuRecommendations;
      assert.ok(suggestions.signals.includes(row.signal),row.genre);
      const item=suggestions.candidateFeatures.find(entry=>entry.role===row.role);
      assert.ok(item,row.genre+' '+row.role);
      assert.equal(item.status,'IDEA_ONLY_GAME_SYSTEM_NOT_CONFIRMED',row.genre);
      assert.equal(item.existingNativeUiRefs.length,0);
      assert.equal(item.gameplaySaveNetworkEconomyAuthorityRetained,true);
      assert.equal(item.applyVia,'EXISTING_BUILD_UP_GRAPHICS_PRODUCTION_INPUT_ONLY');
      assert.equal(suggestions.runtimeVerifiedCount,0);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('genre UI detection rejects unowned menu keywords and platform-incompatible Roblox factories',()=>{
  const root=tempRoot();
  try{
    const folder=path.join(root,'roblox-games','menu-proof-demo');
    fs.mkdirSync(path.join(folder,'server'),{recursive:true});
    fs.mkdirSync(path.join(folder,'shared'),{recursive:true});
    fs.writeFileSync(path.join(folder,'server','Game.server.luau'),
      'local shopkeeper = "weapon shop"\nlocal progressBar = "level"\nlocal mapTitle = "world"');
    fs.writeFileSync(path.join(folder,'shared','RPGMenu.luau'),
      'local GuiService=game:GetService("GuiService")\nlocal character=Model.character(state,config)\nlocal shop=Model.shop(state,config)');
    const task={gameId:'menu-proof-demo',genre:'RPG',goal:'상점 캐릭터 메뉴'};
    const config={target:'roblox',repoRoot:root,task,manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}};
    const unowned=buildVibeAssetProductionPlan(config).genreMenuRecommendations;
    for(const role of ['CHARACTER','TRADE','INVENTORY','EQUIPMENT']){
      const row=unowned.candidateFeatures.find(item=>item.role===role);
      assert.equal(row.status,'IDEA_ONLY_GAME_SYSTEM_NOT_CONFIRMED',role);
      assert.equal(row.existingNativeUiRefs.length,0,role);
    }
    fs.writeFileSync(path.join(folder,'server','Trade.server.luau'),
      'local function purchaseMerchantEquipment(player,kind) end');
    const stub=buildVibeAssetProductionPlan(config).genreMenuRecommendations;
    assert.equal(stub.candidateFeatures.find(row=>row.role==='TRADE').status,
      'IDEA_ONLY_GAME_SYSTEM_NOT_CONFIRMED','stubs may not become live shop features');
    fs.writeFileSync(path.join(folder,'server','Trade.server.luau'),
      'local function purchaseMerchantEquipment(player,kind)\n local cost=50\n player:SetAttribute("Gold",player:GetAttribute("Gold")-cost)\n end');
    const owned=buildVibeAssetProductionPlan(config).genreMenuRecommendations;
    assert.equal(owned.candidateFeatures.find(row=>row.role==='TRADE').status,
      'NATIVE_UI_SOURCE_PRESENT_RUNTIME_QA_REQUIRED',
      'additional server source file must be discovered without hardcoded RPG filenames');
    assert.equal(owned.candidateFeatures.find(row=>row.role==='CHARACTER').status,
      'IDEA_ONLY_GAME_SYSTEM_NOT_CONFIRMED');
    const unity=buildVibeAssetProductionPlan({...config,target:'unity',
      task:{gameId:'menu-proof-demo',genre:'RPG'}}).genreMenuRecommendations;
    assert.equal(unity.uiFactorySource,null);
    assert.equal(unity.candidateFeatures.find(row=>row.role==='CHARACTER').factory,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Vibe source worker applies genre menu suggestions only to exact SHA-matched editable responsibility',()=>{
  const sourcePath='roblox-games/daechung-rpg/shared/RPGMenu.luau';
  const content=fs.readFileSync(sourcePath,'utf8');
  const sha256=createHash('sha256').update(content).digest('hex');
  const plan={
    genreMenuRecommendations:{
      signals:['RPG_PROGRESSION'],
      candidateFeatures:[{
        role:'CHARACTER',factory:'CreateCharacterDetailScreen',
        status:'NATIVE_UI_SOURCE_PRESENT_RUNTIME_QA_REQUIRED',
        companyUiSource:'assets/roblox/common-ui-v1/RobloxCommonUI.luau',
        companyUiSourceSha256:'a'.repeat(64),sourceIdeaIds:['RPG_QUEST_EQUIPMENT_CODEX_SCREENS'],
        gameSystemSourceRefs:[{path:sourcePath,sha256}],
        existingNativeUiRefs:[{path:sourcePath,sha256}]
      },{
        role:'FAKE_SHOP',factory:'CreateShopFullScreen',
        status:'IDEA_ONLY_GAME_SYSTEM_NOT_CONFIRMED',gameSystemSourceRefs:[],existingNativeUiRefs:[]
      }]
    }
  };
  const order={target:'roblox',goal:'RPG 캐릭터 장비 상점 메뉴 상태 동기화',
    assetProduction:plan};
  const exact=buildPrompt(order,{files:[{path:sourcePath,content,editable:true}]},[sourcePath]);
  assert.match(exact,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  assert.match(exact,/RPG_QUEST_EQUIPMENT_CODEX_SCREENS/);
  assert.match(exact,/CreateCharacterDetailScreen/);
  assert.match(exact,/Check each exact original source hash/);
  assert.doesNotMatch(exact,/FAKE_SHOP/);
  const stale=buildPrompt(order,{files:[{path:sourcePath,content:content+'\n-- changed',editable:true}]},[sourcePath]);
  assert.doesNotMatch(stale,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  const clipped=buildPrompt(order,{files:[{path:sourcePath,content,editable:true,truncated:true}]},[sourcePath]);
  assert.doesNotMatch(clipped,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  const unrelated=buildPrompt({...order,goal:'fix shader normals'},
    {files:[{path:sourcePath,content,editable:true}]},[sourcePath]);
  assert.doesNotMatch(unrelated,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
});

test('genre menus bind only to current editable native UI consumers, never server-only gameplay owners',()=>{
 const root=tempRoot();
 try{
   const gameRoot=path.join(root,'roblox-games','survival-proof');
   fs.mkdirSync(path.join(gameRoot,'server'),{recursive:true});
   fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
   const serverPath='roblox-games/survival-proof/server/Game.server.luau';
   const clientPath='roblox-games/survival-proof/client/Game.client.luau';
   const server='local function TryCraft(player,recipeId) player:SetAttribute("ItemCount",1) end';
   const client='local screen=Instance.new("ScreenGui")\nlocal action=Instance.new("TextButton")';
   fs.writeFileSync(path.join(root,serverPath),server);
   fs.writeFileSync(path.join(root,clientPath),client);
   const plan=buildVibeAssetProductionPlan({target:'roblox',repoRoot:root,
     task:{gameId:'survival-proof',genre:'SURVIVAL',goal:'craft menu'},
     manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}});
   const menu=plan.genreMenuRecommendations;
   const row=menu.candidateFeatures.find(item=>item.role==='CRAFT');
   assert.equal(row.status,'EXISTING_SYSTEM_NATIVE_UI_BINDING_REQUIRED');
   assert.equal(row.existingNativeUiRefs.length,0);
   assert.equal(row.nativeUiConsumerRefs.length,1);
   assert.equal(row.nativeUiConsumerRefs[0].path,clientPath);
   assert.equal(row.gameSystemSourceRefs[0].path,serverPath);
   const order={target:'roblox',goal:'craft menu',
     source:{root:'roblox-games/survival-proof'},assetProduction:{genreMenuRecommendations:menu}};
   const valid=buildPrompt(order,{files:[{path:'client/Game.client.luau',content:client,editable:true}]},
     ['client/Game.client.luau']);
   assert.match(valid,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
   assert.match(valid,/"role":"CRAFT"/);
   assert.ok(valid.includes('"editPath":"client/Game.client.luau"'));
   assert.ok(!valid.includes('"editPath":"server/Game.server.luau"'));
   const onlyServer=buildPrompt(order,{files:[{path:'server/Game.server.luau',content:server,editable:true}]},
     ['server/Game.server.luau']);
   assert.doesNotMatch(onlyServer,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
   const stale=buildPrompt(order,{files:[{path:'client/Game.client.luau',content:client+'\n-- stale',editable:true}]},
     ['client/Game.client.luau']);
   assert.doesNotMatch(stale,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
   const wrongGame=buildPrompt({...order,source:{root:'roblox-games/other-game'}},
     {files:[{path:'client/Game.client.luau',content:client,editable:true}]},['client/Game.client.luau']);
   assert.doesNotMatch(wrongGame,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Vibe discovers only actual object-specific prompts with source identity, never imaginary object systems',()=>{
  const root=tempRoot();
  try{
    const gameDir=path.join(root,'roblox-games','interaction-demo');
    fs.mkdirSync(path.join(gameDir,'server'),{recursive:true});
    fs.mkdirSync(path.join(gameDir,'client'),{recursive:true});
    const server=path.join(gameDir,'server','Game.server.luau');
    const client=path.join(gameDir,'client','Game.client.luau');
    fs.writeFileSync(server,[
      'local function prompt(target,objectText,actionText,kind,interactionId)',
      '  return Instance.new("ProximityPrompt")',
      'end',
      'prompt(portal,"지하문","들어가기","ENTRY_PORTAL","Portal1")',
      'prompt(chest,"보물상자","열기","TREASURE_CHEST","Chest1")',
      'prompt(altar,"제단","조사","EVENT_ALTAR","Altar1")'
    ].join('\n'));
    fs.writeFileSync(client,[
      'local function refreshObjectInteraction() end',
      'ProximityPromptService.PromptShown:Connect(refreshObjectInteraction)',
      'ObjectContext:SetAttribute("BoundInteractionKind","TREASURE_CHEST")'
    ].join('\n'));
    const ui=path.join(root,'assets','roblox','common-ui-v1','RobloxCommonUI.luau');
    fs.mkdirSync(path.dirname(ui),{recursive:true});
    fs.writeFileSync(ui,[
      'function RobloxCommonUI.CreateWorldPropInteractionPrompt(options) end',
      'function RobloxCommonUI.CreateContainerInteractionPrompt(options) end',
      'function RobloxCommonUI.CreateReadInspectPanel(options) end'
    ].join('\n'));
    const order={repoRoot:root,target:'roblox',task:{
      gameId:'interaction-demo',genre:'RPG',
      goal:'포탈 상자 제단의 오브젝트별 상호작용과 UI 동기화'
    },manifest:{version:1,assets:[]},presetCatalog:{version:1,presets:[]}};
    const plan=buildVibeAssetProductionPlan(order);
    const actual=plan.genreMenuRecommendations.objectInteractions;
    assert.deepEqual(actual.map(row=>row.kind),['ENTRY_PORTAL','EVENT_ALTAR','TREASURE_CHEST']);
    assert.equal(plan.genreMenuRecommendations.objectSourceBoundCount,3);
    assert.ok(!actual.some(row=>row.kind==='WEAPON_MERCHANT'||row.kind==='BOSS_COMPANION'));
    assert.ok(actual.every(row=>row.status==='SERVER_OBJECT_AND_CLIENT_UI_SOURCE_BOUND_RUNTIME_QA_REQUIRED'));
    assert.ok(actual.every(row=>row.nativeRuntimeVerified===false&&row.serverGameplayAuthorityRetained===true));
    assert.ok(actual.every(row=>row.gameSourceRefs[0].sha256===createHash('sha256').update(fs.readFileSync(server)).digest('hex')));
    assert.ok(actual.every(row=>row.clientConsumerRefs[0].sha256===createHash('sha256').update(fs.readFileSync(client)).digest('hex')));
    assert.match(assetProductionGuidance(plan),/EXISTING OBJECT-SPECIFIC INTERACTION SYNCHRONIZATION/);
    fs.unlinkSync(client);
    const serverOnly=buildVibeAssetProductionPlan(order).genreMenuRecommendations.objectInteractions;
    assert.ok(serverOnly.every(row=>row.status==='SERVER_OBJECT_SOURCE_PRESENT_UI_BINDING_REQUIRED'));
    assert.ok(serverOnly.every(row=>row.clientConsumerRefs.length===0));
    fs.unlinkSync(server);
    const noOwners=buildVibeAssetProductionPlan(order).genreMenuRecommendations.objectInteractions;
    assert.deepEqual(noOwners,[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Vibe emits exact-source-bound object interaction guidance for editable server owners only',()=>{
  const file='roblox-games/daechung-rpg/server/Game.server.luau';
  const content=fs.readFileSync(file,'utf8'),sha256=createHash('sha256').update(content).digest('hex');
  const object={
    kind:'TREASURE_CHEST',factory:'CreateContainerInteractionPrompt',
    purpose:'PER_PLAYER_OPENED_CHEST_STATE',
    status:'SERVER_OBJECT_SOURCE_PRESENT_UI_BINDING_REQUIRED',
    gameSourceRefs:[{path:file,sha256}],clientConsumerRefs:[],
    nativeRuntimeVerified:false,serverGameplayAuthorityRetained:true
  };
  const order={target:'roblox',goal:'보물상자 오브젝트 상호작용 동기화',assetProduction:{
    genreMenuRecommendations:{signals:['RPG_PROGRESSION'],candidateFeatures:[],objectInteractions:[object]}
  }};
  const valid=buildPrompt(order,{files:[{path:file,content,editable:true}]},[file]);
  assert.match(valid,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  assert.match(valid,/TREASURE_CHEST/);
  assert.match(valid,/CreateContainerInteractionPrompt/);
  assert.match(valid,/Preserve per-object InteractionKind, InteractionId/);
  const scoped={...order,source:{root:'roblox-games/daechung-rpg'}};
  const relative='server/Game.server.luau';
  const actualWorker=buildPrompt(scoped,{files:[{path:relative,content,editable:true}]},[relative]);
  assert.match(actualWorker,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  assert.match(actualWorker,/"editPath":"server\/Game\.server\.luau"/);
  const wrongGame=buildPrompt({...scoped,source:{root:'roblox-games/other-game'}},
    {files:[{path:relative,content,editable:true}]},[relative]);
  assert.doesNotMatch(wrongGame,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  const stale=buildPrompt(order,{files:[{path:file,content:content+'\n-- stale',editable:true}]},[file]);
  assert.doesNotMatch(stale,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  const notEditable=buildPrompt(order,{files:[{path:file,content,editable:false}]},[file]);
  assert.doesNotMatch(notEditable,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
  const unknown=buildPrompt({...order,assetProduction:{genreMenuRecommendations:{signals:['RPG_PROGRESSION'],
    candidateFeatures:[],objectInteractions:[]}}},{files:[{path:file,content,editable:true}]},[file]);
  assert.doesNotMatch(unknown,/EXISTING GENRE MENU SOURCE SYNCHRONIZATION BEGIN/);
});
test('OBJ static validation reads actual polygons and material references without self-approving production',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'obj-geometry-'));
  const assetDir=path.join(root,'assets');
  try{
    fs.mkdirSync(assetDir,{recursive:true});
    const model=path.join(assetDir,'mesh.obj'),material=path.join(assetDir,'mesh.mtl');
    fs.writeFileSync(material,'newmtl STONE\nKd 0.5 0.6 0.7\n');
    fs.writeFileSync(model,'mtllib mesh.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl STONE\nf 1 2 3\n');
    const good=inspectVibeSourceObj({repoRoot:root,source:{path:'/assets/mesh.obj'}});
    assert.equal(good.status,'OBJ_STATIC_GEOMETRY_PASS');
    assert.equal(good.vertexCount,3);
    assert.equal(good.triangleCount,1);
    assert.equal(good.nondegenerateTriangleCount,1);
    assert.equal(good.materialCount,1);
    assert.match(good.fileSha256,/^[0-9a-f]{64}$/);
    assert.equal(good.actualRuntimeRenderObserved,false);
    assert.equal(good.productionVerified,false);
    const wrongHash=inspectVibeSourceObj({repoRoot:root,source:{path:'assets/mesh.obj',objSha256:'0'.repeat(64)}});
    assert.equal(wrongHash.status,'OBJ_REPAIR_REQUIRED');
    assert.ok(wrongHash.issues.includes('OBJ_SOURCE_HASH_MISMATCH'));
    fs.writeFileSync(model,'mtllib mesh.mtl\nv 0 0 0\nv 0 0 0\nv 0 0 0\nusemtl STONE\nf 1 2 3\n');
    const degenerate=inspectVibeSourceObj({repoRoot:root,source:{path:'assets/mesh.obj'}});
    assert.equal(degenerate.status,'OBJ_REPAIR_REQUIRED');
    assert.ok(degenerate.issues.includes('OBJ_NONDEGENERATE_MESH_REQUIRED'));
    fs.writeFileSync(model,'mtllib mesh.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl STONE\nf 1 2 99\n');
    const missingFace=inspectVibeSourceObj({repoRoot:root,source:{path:'assets/mesh.obj'}});
    assert.equal(missingFace.status,'OBJ_REPAIR_REQUIRED');
    assert.ok(missingFace.issues.includes('OBJ_FACE_INDEX_OUT_OF_RANGE'));
    fs.writeFileSync(model,'mtllib mesh.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl MISSING\nf 1 2 3\n');
    const missingMaterial=inspectVibeSourceObj({repoRoot:root,source:{path:'assets/mesh.obj'}});
    assert.ok(missingMaterial.issues.includes('OBJ_MATERIAL_NAME_MISSING'));
    fs.writeFileSync(model,'mtllib mesh.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl STONE\nf 1 2 3\n');
    fs.writeFileSync(material,'newmtl STONE\nmap_Kd missing.png\n');
    const missingTexture=inspectVibeSourceObj({repoRoot:root,source:{path:'assets/mesh.obj'}});
    assert.ok(missingTexture.issues.includes('OBJ_MATERIAL_TEXTURE_MISSING'));
    const fake=inspectVibeSourceObj({repoRoot:root,source:{path:'assets/fake.obj'}});
    assert.equal(fake.status,'SOURCE_OBJ_REQUIRED');
    assert.equal(fake.runtimeVerified,false);
    const outside=inspectVibeSourceObj({repoRoot:root,source:{path:'../escaped.obj'}});
    assert.equal(outside.status,'SOURCE_OBJ_REQUIRED');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('deleted self authored OBJ sources cannot be inspected as usable geometry',()=>{
  for(const file of ['assets/roblox/survival-core-world-v1/chest.obj','assets/roblox/survival-combat-parts-v1/blade_long.obj','assets/roblox/monster-adventure-v1/bat.obj']){
    assert.equal(fs.existsSync(file),false);
    assert.notEqual(inspectVibeSourceObj({repoRoot:process.cwd(),source:{path:file}}).status,'OBJ_STATIC_GEOMETRY_PASS');
  }
});

test('CC0 registry change detection preserves untouched top-level data and tracks catalog mutations',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-change-detection-'));
  try{
    fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[]}));
    const catalogDir=path.join(root,'assets','roblox','common-items-v1');
    fs.mkdirSync(catalogDir,{recursive:true});
    fs.writeFileSync(path.join(catalogDir,'catalog.json'),JSON.stringify({
      packId:'roblox-common-items-v1',version:1,family:'PROP',platform:'ROBLOX',
      items:[{assetId:'APPLE',name:'Apple',itemRole:'FOOD'}]
    }));
    let untouchedSerializationCount=0;
    const untouchedLargeSection={
      marker:'UNCHANGED',
      toJSON(){untouchedSerializationCount+=1;return{marker:this.marker};}
    };
    const registry={
      version:1,
      assets:[{
        id:'roblox-common-items-v1',packId:'roblox-common-items-v1',family:'PROP',platform:'ROBLOX',
        license:'cc0',companyCommonBase:true,productionVerified:false,verifiedCompanyReusable:false,
        runtimeVerificationState:'PENDING_STUDIO'
      }],
      externalSources:[],
      untouchedLargeSection
    };
    const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry,persist:false});
    assert.equal(untouchedSerializationCount,0);
    assert.equal(first.changed,true);
    assert.ok(first.changedSections.includes('assets'));
    assert.deepEqual(first.changedSections,[...first.changedSections].sort());
    assert.ok(first.registry.assets.some(row=>row.assetId==='APPLE'));
    const second=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:first.registry,persist:false});
    assert.equal(untouchedSerializationCount,0);
    assert.equal(second.changed,false,JSON.stringify(second.changedSections));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('registry sync change detection is limited to sections it can mutate',()=>{
  const source=fs.readFileSync('tools/vibe2-asset-production-plan.mjs','utf8');
  const start=source.indexOf('export function synchronizeCompanyCommonAssetRegistry');
  const end=source.indexOf('const inferUniverseFamily',start);
  const syncSource=source.slice(start,end);
  assert.match(syncSource,/const mutableSections=\[/);
  for(const section of ['assets','internalAssetStandard','internalAssetCompositionContract','companyCommonSeedAssetIdeation','commonLibrarySystemDepthAudit','internalAssetLibraryAutomation','characterNpcCustomization','npcRoleProduction']){
    assert.match(syncSource,new RegExp("'"+section+"'"));
  }
  assert.match(syncSource,/catalogAssetsChanged=beforePracticeRemoval!==next\.assets\.length\|\|organizationAssetsChanged\|\|syncRows\.some\(row=>row\.changed===true\)/);
  assert.match(syncSource,/asset\?\.license!=='project-original'/);
  assert.doesNotMatch(syncSource,/Object\.keys\(original\)/);
  assert.doesNotMatch(syncSource,/Object\.keys\(next\)/);
});

test('Roblox internal asset selection is genre-agnostic for the same game and library',()=>{
  const assetLibrary=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const a=buildRobloxStudioAssetBootstrapPlan({gameId:'bug-defense',profile:{genre:'Strategy',subgenre:'Tower Defense'},assetLibrary});
  const b=buildRobloxStudioAssetBootstrapPlan({gameId:'bug-defense',profile:{genre:'Completely Different Label',subgenre:'Other'},assetLibrary});
  assert.deepEqual(a.families,b.families);
  assert.equal(a.selectionFingerprint,b.selectionFingerprint);
  assert.equal(a.libraryVersion,b.libraryVersion);
});

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

test('all game development scans the full internal registry and removes family atom caps on Roblox Unity and Web',()=>{
  const library=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];
  const expectedBaseAtoms=families.reduce((sum,family)=>sum+(library.baseMaterialLibrary?.families?.[family]?.length||0),0);
  for(const target of ['roblox','unity','web']){
    const plan=buildVibeAssetProductionPlan({
      target,
      task:{gameId:'bug-defense',goal:'모든 내부 라이브러리를 동적 연결하고 기존 게임 시스템에 적용'}
    });
    const dynamic=plan.allGameDynamicLibraryBinding;
    assert.equal(dynamic.required,true,target);
    assert.equal(dynamic.registryAssetCount,library.assets.length,target);
    assert.equal(dynamic.evaluatedAssetCount,library.assets.length,target);
    assert.equal(dynamic.allRegistryAssetsScanned,true,target);
    assert.equal(dynamic.allTwelveFamiliesEvaluated,true,target);
    assert.equal(dynamic.noArtificialAssetCountCap,true,target);
    assert.equal(dynamic.noArtificialFamilyCountCap,true,target);
    assert.equal(dynamic.auditScoreIsUsageGate,false,target);
    assert.equal(dynamic.lowScoreCompatibleAssetUseAllowed,true,target);
    assert.equal(dynamic.baseMaterialAtomCount,expectedBaseAtoms,target);
    assert.equal(dynamic.baseMaterialAllCompatibleAtomsSelected,true,target);
    assert.deepEqual(dynamic.platformOrder,['ROBLOX','UNITY','WEB'],target);
    for(const family of families){
      assert.equal(plan.baseMaterialLoadout.families[family].length,library.baseMaterialLibrary.families[family].length,target+':'+family);
    }
    const usage=buildInternalAssetSourceUsageContract({gameId:'bug-defense',target,assetProduction:plan});
    assert.equal(usage.version,5,target);
    assert.equal(usage.registryAssetCount,library.assets.length,target);
    assert.equal(usage.evaluatedAssetCount,library.assets.length,target);
    assert.equal(usage.allRegistryAssetsScanned,true,target);
    assert.equal(usage.allTwelveFamiliesEvaluated,true,target);
    assert.equal(usage.compatibleCandidateCount,dynamic.compatibleCandidateCount,target);
    assert.equal(usage.dynamicLibraryFingerprint,dynamic.fingerprint,target);
    assert.equal(usage.applicationCoverage.currentBuildUpAllCompatibleCandidatesEligible,true,target);
  }
});

test('midnight hundred source entries stay shared for every game without bypassing real 3D source checks',()=>{
  const library=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const standard=library.internalAssetStandard.sharedOrganization;
  const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];
  assert.equal(standard.version,2);
  assert.deepEqual(standard.familyOrder,families);
  assert.deepEqual(standard.sortKeys,['FAMILY_ORDER','SUBFAMILY','TITLE_KO','ASSET_ID']);
  assert.equal(standard.gameExclusivePacks,false);
  assert.equal(standard.originalGameNamedPacksAreSourceLineageOnly,true);
  // [Rule5] 삭제된 자작 귀신 100종을 여전히 등록된 공용 원본으로 계산하지 않는다.
  const monsters=library.assets.filter(row=>row.packId==='roblox-world-ghost-skins-v1'&&row.skinId);
  assert.equal(monsters.length,0);
  for(const target of ['roblox','unity','web']){
    const a=buildAllGameDynamicLibraryBindingPlan({companyRegistry:library,target,gameId:'horror-escape-room'});
    const b=buildAllGameDynamicLibraryBindingPlan({companyRegistry:library,target,gameId:'survival'});
    assert.deepEqual(a.libraryOrder,families);
    assert.deepEqual(a.librarySortKeys,standard.sortKeys);
    assert.equal(a.sourcePackIdIsLineageOnly,true);
    assert.equal(a.evaluatedAssetCount,library.assets.length);
    assert.equal(a.evaluatedAssets.some(row=>String(row.assetId||'').startsWith('roblox-world-ghost-')),false);
    assert.equal(b.evaluatedAssets.some(row=>String(row.assetId||'').startsWith('roblox-world-ghost-')),false);
  }
  const fixture={version:1,assets:[
    {id:'z',family:'CREATURE',subfamily:'B',title:'가',license:'CC0',platform:'ROBLOX',path:'z.glb'},
    {id:'u',family:'UI',title:'가',license:'CC0',platform:'ROBLOX'},
    {id:'a',family:'CREATURE',subfamily:'A',title:'나',license:'CC0',platform:'ROBLOX',path:'a.glb'},
    {id:'c',family:'CHARACTER',title:'다',license:'CC0',platform:'ROBLOX',path:'c.glb'},
    {id:'b',family:'CREATURE',subfamily:'A',title:'가',license:'CC0',platform:'ROBLOX',path:'b.glb'}
  ]};
  const sorted=buildAllGameDynamicLibraryBindingPlan({companyRegistry:fixture,target:'roblox',gameId:'any-existing-game'});
  assert.deepEqual(sorted.evaluatedAssets.map(row=>row.assetId),['c','b','a','z','u']);
});

test('full library scan preserves low quality assets but rejects unsafe corrupt or forbidden assets',()=>{
  const assets=[
    {id:'low-quality',category:'UI',license:'CC0',internalAuditScore:0},
    {id:'corrupt',category:'UI',license:'CC0',corruptSource:true},
    {id:'forbidden',category:'UI',license:'CC0',internalUseAllowed:false},
    {id:'quarantined',family:'UI',license:'CC0',quarantined:true},
    {id:'unknown-rights',family:'UI',license:'UNKNOWN'},
    {id:'noncommercial',family:'UI',license:'CC-BY-NC-4.0'}
  ];
  for(const target of ['roblox','unity','web']){
    const plan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{version:1,assets},target,gameId:'demo'});
    assert.equal(plan.evaluatedAssetCount,assets.length);
    assert.deepEqual(plan.familyCandidates.UI.map(row=>row.assetId),['low-quality']);
    assert.equal(plan.hardBlockedAssetCount,5);
    assert.equal(plan.unclassifiedAssetCount,0);
  }
});

test('all game spatial families reject flat 2D assets but allow unlimited cross-game 3D donor reuse',()=>{
  const assets=[
    {id:'flat-creature',family:'CREATURE',license:'project-original',platform:'WEB_REFERENCE',path:'/assets/flat.png'},
    {id:'shared-creature',family:'CREATURE',license:'CC0',platform:'ROBLOX',
      companyCommonBase:true,path:'/assets/shared/spider.png',nativeArtifacts:['assets/shared/spider.glb']},
    {id:'another-creature',family:'CREATURE',license:'CC0',platform:'SHARED_NATIVE_SOURCE',
      companyCommonBase:true,path:'/assets/shared/wolf.obj'},
    {id:'building-part',family:'BUILDING',license:'CC0',platform:'ROBLOX',
      companyCommonBase:true,path:'/assets/shared/wall.obj'},
    {id:'ui-icon',family:'UI',license:'CC0',path:'/assets/shared/icon.png'}
  ];
  for(const target of ['roblox','unity','web']){
    const plan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{version:9,assets},target,gameId:'any-genre'});
    assert.deepEqual(plan.familyCandidates.CREATURE.map(asset=>asset.assetId),['another-creature','shared-creature']);
    assert.deepEqual(plan.familyCandidates.BUILDING.map(asset=>asset.assetId),['building-part']);
    assert.deepEqual(plan.familyCandidates.UI.map(asset=>asset.assetId),['ui-icon']);
    assert.equal(plan.hardBlockedAssetCount,1);
    assert.equal(plan.crossGameAndGenreReuseUnrestricted,true);
    assert.equal(plan.noArtificialAssetCountCap,true);
    assert.equal(plan.spatialFamiliesRequire3dGeometrySource,true);
    assert.equal(plan.internalRegisteredAssetsOnly,true);
  }
});

test('central Unity 3D policy and shared spatial asset prefilter stay aligned for all eight families',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const only3d=policy.ownerUnityWeb3dOnly20261009;
  assert.equal(only3d.status,'OWNER_DIRECT_LOCKED');
  assert.equal(only3d.internalSharedLibraryOnlyForGameplayAssets,true);
  assert.equal(only3d.registeredLibrarySpatialAssetRequiresReal3dSource,true);
  assert.equal(only3d.uiAudioAndTextureFilesMayRemainNative2dResources,true);
  assert.equal(only3d.uiAudioAndTextureFilesMayNotSubstituteFor3dGameplayObjects,true);
  assert.equal(only3d.noShadowPipelineOr2dFallbackAsFinal,true);
  const families=only3d.sharedLibraryGameWorldFamilies3dOnly;
  assert.deepEqual(families,['CHARACTER','CREATURE','BUILDING','ENVIRONMENT',
    'WEAPON','PROP','WORLD_OBJECT','TERRAIN']);
  assert.deepEqual(only3d.supported3dSourceKinds,
    ['GLB','GLTF','FBX','OBJ','MESH','UNITY_PREFAB_WITH_NATIVE_MESH']);
  const assets=families.flatMap(family=>[
    {id:'flat-'+family.toLowerCase(),family,license:'CC0',path:'/assets/shared/flat.png'},
    {id:'model-'+family.toLowerCase(),family,license:'CC0',path:'/assets/shared/model.glb'},
  ]);
  assets.push({id:'ui-2d',family:'UI',license:'CC0',path:'/assets/shared/hud.png'});
  assets.push({id:'audio-2d',family:'AUDIO',license:'CC0',path:'/assets/shared/bgm.ogg'});
  for(const target of ['roblox','unity','web']){
    const plan=buildAllGameDynamicLibraryBindingPlan({
      companyRegistry:{version:1,assets},target,gameId:'sample-3d'});
    assert.equal(plan.spatialFamiliesRequire3dGeometrySource,true);
    assert.equal(plan.allRegistryAssetsScanned,true);
    assert.equal(plan.internalRegisteredAssetsOnly,true);
    for(const family of families){
      const flat=plan.evaluatedAssets.find(row=>row.assetId==='flat-'+family.toLowerCase());
      const model=plan.evaluatedAssets.find(row=>row.assetId==='model-'+family.toLowerCase());
      assert.equal(flat.hardBlockReason,'SPATIAL_3D_SOURCE_REQUIRED',family+' '+target);
      assert.equal(flat.eligibleForRoleEvaluation,false,family+' '+target);
      assert.equal(model.hardBlockReason,null,family+' '+target);
      if(plan.libraryOrder.includes(family)){
        assert.ok(plan.familyCandidates[family].some(row=>row.assetId===model.assetId),family+' '+target);
      }
    }
    assert.deepEqual(plan.familyCandidates.UI.map(row=>row.assetId),['ui-2d']);
    assert.deepEqual(plan.familyCandidates.AUDIO.map(row=>row.assetId),['audio-2d']);
  }
  // 후보 파일 확장자만으로 실제 메시 또는 Unity 네이티브 런타임 PASS를 주장하지 않는다.
  const inspector=fs.readFileSync('tools/company-unity-web-gameplay-validation.mjs','utf8');
  assert.match(inspector,/nativeMeshProof\.triangles>0/);
  assert.match(inspector,/nativeDepthVerified/);
  assert.match(inspector,/libraryAssetPromotionGranted:false/);
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
  assert.equal(a.synchronization.fullBinaryLibraryReplicationForbidden,true);
  assert.equal(a.synchronization.allCompatibleCandidateEligibilityIndexRequired,true);
  assert.equal(a.synchronization.selectedSubsetOnly,false);
  assert.equal(a.synchronization.changedFamilyRebindOnly,true);
  assert.equal(a.selectionFingerprint,null);
  assert.deepEqual(a.exactFamilies.WEAPON,['BLADE_LONG','GRIP_LONG']);
  assert.equal(a.version,5);
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
  assert.equal(a.synchronization.selectedCommonSourcesDerivedFromSelectedFamiliesAndDynamicRegistry,true);
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

// 자산 · 모든 게임이 공유하는 라이브러리 SHA/API 재사용은 실제 원본 변경 시 다시 계산한다.
test('all-game internal asset source hash and API cache reuse unchanged models but immediately rebind changed motion sources',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-asset-fast-import-'));
  const relative='assets/common-motion-fast.mjs';
  const source=path.join(root,relative);
  try{
    fs.mkdirSync(path.dirname(source),{recursive:true});
    fs.writeFileSync(source,'export function OriginalMotion() { return "walk"; }\\n','utf8');
    const order={
      target:'unity',gameId:'fantasy-test',
      assetProduction:{
        baseMaterialLoadout:{families:{MOTION:['WALK','ATTACK','HIT','DEATH']}},
        allGameDynamicLibraryBinding:{
          registryAssetCount:1,evaluatedAssetCount:1,compatibleCandidateCount:1,
          fingerprint:'source-bound-asset-test',
          familyCandidates:{MOTION:[{assetId:'internal-motion',family:'MOTION',role:'ACTOR',
            sourceFiles:[relative],nativeArtifacts:[]}]} 
        }
      }
    };
    const a=buildInternalAssetSourceUsageContract(order,{cwd:root});
    const b=buildInternalAssetSourceUsageContract(order,{cwd:root});
    assert.equal(a.selectedSourceHashes[0].status,'SOURCE_HASHED');
    assert.deepEqual(a.selectedSourceHashes,b.selectedSourceHashes);
    assert.equal(a.fingerprint,b.fingerprint);
    const signaturesA=buildInternalAssetApiIndex({cwd:root,paths:a.selectedSourcePaths});
    assert.match(signaturesA.text,/OriginalMotion/);
    const edit={files:[{path:'Assets/Scripts/Actor.cs',editable:true,content:'public class Actor {}'}],bytes:0};
    const contextA=attachSelectedInternalAssetApiContext(edit,{cwd:root,contract:a,order});
    assert.match(contextA.internalAssetApiIndex,/OriginalMotion/);
    assert.equal(contextA.internalAssetApiIndexAllSelectedSourcesEveryBuildUp,true);
    assert.ok(contextA.internalAssetApiContextFiles.includes(relative));
    // 파일 해시 변경은 이전 프롬프트/프리팹을 그대로 재사용하는 근거가 될 수 없다.
    fs.writeFileSync(source,'export function RevisedActionMotion() { return "attack-hit-death"; }\\n','utf8');
    const c=buildInternalAssetSourceUsageContract(order,{cwd:root});
    assert.notEqual(c.fingerprint,a.fingerprint);
    assert.notEqual(c.selectedSourceHashes[0].sha256,a.selectedSourceHashes[0].sha256);
    const signaturesB=buildInternalAssetApiIndex({cwd:root,paths:c.selectedSourcePaths});
    assert.match(signaturesB.text,/RevisedActionMotion/);
    assert.doesNotMatch(signaturesB.text,/OriginalMotion/);
    const contextB=attachSelectedInternalAssetApiContext(edit,{cwd:root,contract:c,order});
    assert.match(contextB.internalAssetApiIndex,/RevisedActionMotion/);
    assert.equal(contextB.internalAssetApiIndexAllSelectedSourcesEveryBuildUp,true);
    assert.deepEqual(c.exactFamilies.MOTION,['ATTACK','DEATH','HIT','WALK']);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('dynamic library handoff preserves master and native variant identities across games',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'asset-native-handoff-'));
  try{
    const master='assets/shared/model.glb',native='unity-games/demo/Assets/Resources/CompanyAssets/Model.prefab';
    for(const file of [master,native]){fs.mkdirSync(path.dirname(path.join(cwd,file)),{recursive:true});fs.writeFileSync(path.join(cwd,file),file);}
    const sourceHash=createHash('sha256').update(master).digest('hex');
    const artifactHash=createHash('sha256').update(native).digest('hex');
    const asset={id:'shared-prop',family:'PROP',platform:'SHARED_3D',license:'CC0',masterGlb:master,sourceHash,
      platformVariants:{UNITY:{path:native,artifactSha256:artifactHash}}};
    const registry={version:20,assets:[asset]};
    const plan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:registry,target:'unity',gameId:'demo'});
    const row=plan.familyCandidates.PROP[0];
    assert.equal(row.path,native);
    assert.equal(row.masterSourcePath,master);
    assert.equal(row.sourceHash,sourceHash);
    assert.equal(row.artifactHash,artifactHash);
    assert.ok(row.sourceFiles.includes(master));
    assert.ok(row.nativeArtifacts.includes(native));
    const usage=buildInternalAssetSourceUsageContract({target:'unity',gameId:'demo',assetProduction:{allGameDynamicLibraryBinding:plan}},{cwd});
    assert.equal(usage.libraryVersion,20);
    assert.equal(usage.sourceCandidates[0].sourceHash,sourceHash);
    assert.equal(usage.sourceCandidates[0].artifactHash,artifactHash);
    for(const file of [master,native])assert.equal(usage.selectedSourceHashes.find(row=>row.path===file).status,'SOURCE_HASHED');
    const changed=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{...registry,assets:[{...asset,sourceHash:'b'.repeat(64)}]},target:'unity',gameId:'demo'});
    assert.notEqual(changed.fingerprint,plan.fingerprint,'source identity changes even when catalog version was not advanced');
    const changedNative=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{...registry,assets:[{...asset,platformVariants:{UNITY:{path:native,artifactSha256:'c'.repeat(64)}}}]},target:'unity',gameId:'demo'});
    assert.notEqual(changedNative.fingerprint,plan.fingerprint);
    const other=buildAllGameDynamicLibraryBindingPlan({companyRegistry:registry,target:'roblox',gameId:'other-game'});
    assert.equal(other.familyCandidates.PROP[0].path,master);
    assert.equal(other.familyCandidates.PROP[0].gameplayAuthority,false);
    assert.equal(row.runtimeVerified,undefined,'selection is not runtime evidence');
  }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});

test('Vibe source rotates detailed API context while keeping the full eligibility index',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/sourceApiContextOnlyForSelectedAssets:false/);
  assert.match(source,/fullBinaryLibraryReplicationForbidden:true/);
  assert.match(source,/fullCatalogPromptInjectionForbidden:true/);
  assert.match(source,/apiContextBatchSize:4/);
  assert.match(source,/apiContextMaxBytes:18000/);
  assert.match(source,/apiContextPerFileMaxBytes:4500/);
  assert.match(source,/apiContextRotationByBuildUpGeneration:true/);
  assert.match(source,/allSelectedApiSourcesRemainEligibleAcrossCycles:true/);
  // 구현 문자열이 바뀌어도 전체 후보 유지·상세 회전·빈 목록 동작을 직접 검증한다.
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-api-rotation-'));
  try{
    fs.mkdirSync(path.join(root,'assets'),{recursive:true});
    const selectedSourcePaths=Array.from({length:7},(_,i)=>'assets/Library'+i+'.luau');
    for(const [i,file] of selectedSourcePaths.entries())fs.writeFileSync(path.join(root,file),'function Library.Action'+i+'()\n return true\nend\n');
    const contract={selectedSourcePaths,synchronization:{apiContextBatchSize:4}};
    const context={files:[{path:'client/Game.luau',content:'local world = {}',editable:true}],bytes:16};
    const first=attachSelectedInternalAssetApiContext(context,{cwd:root,contract,order:{target:'roblox',buildUpGeneration:1}});
    const second=attachSelectedInternalAssetApiContext(context,{cwd:root,contract,order:{target:'roblox',buildUpGeneration:2}});
    assert.deepEqual(first.internalAssetApiContextFiles,selectedSourcePaths.slice(0,4));
    assert.deepEqual(second.internalAssetApiContextFiles,[...selectedSourcePaths.slice(4),selectedSourcePaths[0]]);
    for(const result of [first,second]){
      assert.equal(result.internalAssetApiIndexRepresentedSourceCount,7);
      for(const file of selectedSourcePaths)assert.ok(result.internalAssetApiIndex.includes(file));
      assert.ok(result.files.filter(row=>row.internalAssetApiContext).every(row=>row.editable===false));
    }
    const empty=attachSelectedInternalAssetApiContext(context,{cwd:root,contract:{selectedSourcePaths:[]},order:{target:'roblox'}});
    assert.equal(empty,context);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
  assert.match(source,/internalAssetApiContextEligibleSourceCount:allSelectedPaths\.length/);
  assert.match(source,/internalAssetApiContext:true/);
  assert.match(source,/editable:false/);
  assert.match(source,/Do not invent an asset ID, pack, factory, source file, or role/);
  assert.match(source,/Genre NEVER removes an otherwise compatible internal asset from eligibility/);
  assert.match(source,/high-quality wrong-role asset must lose/i);
  assert.match(source,/Internal quality score is NOT a usage gate/);
  assert.match(source,/leaving a blank\/default\/primitive presentation/);
  assert.match(source,/NO artificial asset-count, family-count, gameplay-signal, or combination cap/);
  assert.match(source,/Detailed API source batching is only synchronization optimization and MUST NOT become a usage cap/);
  assert.match(source,/rotate by BUILD_UP generation/i);
  assert.match(source,/complete public API index for every selected source is present on every BUILD_UP/i);
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

test('persisted DCC assets require native consumption instead of deterministic metadata',()=>{
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
    assert.equal(result,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('asset Web zero-output and first-output timers keep the normal long model budget',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(source,/ASSET_DEVELOPMENT_WEB_TIMEOUT_MS=Math\.max\(240000,DEFAULT_TIMEOUT_MS\)/);
  assert.match(source,/assetDevelopmentLane&&target==='web'\?ASSET_DEVELOPMENT_WEB_TIMEOUT_MS:ZERO_OUTPUT_RETRY_TIMEOUT_MS/);
  assert.match(source,/firstOutputTimeoutMs=assetDevelopmentLane&&target==='web'\?ASSET_DEVELOPMENT_WEB_TIMEOUT_MS:Math\.min\(MODEL_FIRST_OUTPUT_TIMEOUT_MS,timeoutMs\)/);
  // Timeout transport moved to the shared external Gemini adapter; do not weaken the budget.
  const externalAdapter=fs.readFileSync(new URL('../tools/vibe2-gemini-free-rotation.mjs',import.meta.url),'utf8');
  assert.match(source,/requestGeminiFreePair\(/);
  assert.match(externalAdapter,/setTimeout\(\(\)=>controller\.abort\(\),Math\.max\(10000,Number\(timeoutMs\)\|\|240000\)\)/);
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

function writeJsonOnlyGlb(file,document){
  const raw=Buffer.from(JSON.stringify(document),'utf8');
  const paddedLength=Math.ceil(raw.length/4)*4;
  const json=Buffer.alloc(paddedLength,0x20);raw.copy(json);
  const total=12+8+json.length;
  const out=Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);
  out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);
  fs.writeFileSync(file,out);
}

function zeroSkinWeightsInGlb(sourceFile,targetFile){
  const bytes=Buffer.from(fs.readFileSync(sourceFile));
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
  let offset=20+jsonLength,binOffset=-1;
  while(offset<bytes.length){
    const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);
    if(type===0x004e4942){binOffset=offset+8;break;}
    offset+=8+length;
  }
  assert.ok(binOffset>=0);
  const primitive=json.meshes.flatMap(mesh=>mesh.primitives).find(row=>Number.isInteger(row.attributes?.WEIGHTS_0));
  assert.ok(primitive);
  const accessor=json.accessors[primitive.attributes.WEIGHTS_0],view=json.bufferViews[accessor.bufferView];
  const componentBytes={5121:1,5123:2,5126:4}[accessor.componentType],elementBytes=componentBytes*4,stride=view.byteStride||elementBytes;
  const start=binOffset+(view.byteOffset||0)+(accessor.byteOffset||0);
  for(let i=0;i<accessor.count;i++)bytes.fill(0,start+i*stride,start+i*stride+elementBytes);
  fs.writeFileSync(targetFile,bytes);
}

function rewriteAnimationNamesInGlb(sourceFile,targetFile,nameForIndex){
  const bytes=Buffer.from(fs.readFileSync(sourceFile));
  const jsonLength=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
  for(const [index,animation] of (document.animations||[]).entries())animation.name=nameForIndex(index);
  const raw=Buffer.from(JSON.stringify(document),'utf8');
  const paddedLength=Math.ceil(raw.length/4)*4,json=Buffer.alloc(paddedLength,0x20);raw.copy(json);
  const remainder=bytes.subarray(20+jsonLength);
  const total=12+8+json.length+remainder.length,out=Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);
  out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);remainder.copy(out,20+json.length);
  fs.writeFileSync(targetFile,out);
}
function anonymizeAnimationNamesInGlb(sourceFile,targetFile){
  rewriteAnimationNamesInGlb(sourceFile,targetFile,index=>'clip_'+String(index).padStart(4,'0'));
}

// 공용 인물·몬스터 검사: 이름/클립 수가 남아도 모든 관절이 굳으면 제작 수리로 돌린다.
test('Rule5 deleted joint-action GLBs cannot impersonate native articulated source evidence',()=>{
 for(const source of ['assets/shared/humanoid-guardian-actions.glb','assets/shared/creature-wolf-actions.glb']){
   assert.equal(fs.existsSync(source),false,'deleted self-authored GLB must not return: '+source);
 }
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'source-motion-gap-'));
 try{
   writeInspectionTriangle(root);
   const result=evaluateCrossPlatform3dMasterGlb({repoRoot:root,source:{path:'triangle.glb'},family:'CHARACTER'});
   assert.equal(result.pass,false,'static geometry cannot be presented as an articulated motion master');
   assert.ok(result.blockers.length>0,'native motion source lacks real animation proof');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('master GLB rejects broken accessor skin node and animation sampler lineage',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'broken-master-glb-'));
  try{
    const file=path.join(root,'broken.glb');
    writeJsonOnlyGlb(file,{
      asset:{version:'2.0'},
      accessors:[{count:3},{count:3},{count:3},{count:3},{count:2},{count:2}],
      materials:[{name:'body'}],
      meshes:[{name:'body',primitives:[{material:0,attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2,JOINTS_0:3,WEIGHTS_0:4}}]}],
      nodes:[{mesh:0},{name:'joint'}],
      skins:[{joints:[1]}],
      animations:[{samplers:[{input:5,output:99}],channels:[{sampler:0,target:{node:1,path:'rotation'}}]}]
    });
    const result=evaluateCrossPlatform3dMasterGlb({repoRoot:root,family:'CREATURE',role:'BOSS',source:{path:'broken.glb'}});
    assert.equal(result.pass,false);
    assert.ok(result.blockers.includes('MASTER_GLB_ACCESSOR_BINDING_REQUIRED'));
    assert.ok(result.blockers.includes('MASTER_GLB_SKIN_BINDING_REQUIRED'));
    assert.ok(result.blockers.includes('MASTER_GLB_ANIMATION_REQUIRED'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('master GLB rejects fully invisible materials before any runtime promotion',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'invisible-master-glb-'));
 try{
  const original=fs.readFileSync('assets/roblox/world-ghosts/native/spider/spider.glb');
  const length=original.readUInt32LE(12),document=JSON.parse(original.subarray(20,20+length));
  for(const material of document.materials){material.alphaMode='MASK';material.pbrMetallicRoughness={...material.pbrMetallicRoughness,baseColorFactor:[.8,.7,.6,0]};}
  const json=Buffer.from(JSON.stringify(document));const padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const rest=original.subarray(20+length),out=Buffer.alloc(20+padded.length+rest.length);
  original.subarray(0,20).copy(out);out.writeUInt32LE(out.length,8);out.writeUInt32LE(padded.length,12);padded.copy(out,20);rest.copy(out,20+padded.length);
  fs.writeFileSync(path.join(root,'invisible.glb'),out);
  const result=evaluateCrossPlatform3dMasterGlb({repoRoot:root,family:'CREATURE',source:{path:'invisible.glb'}});
  assert.equal(result.pass,false);assert.ok(result.blockers.includes('MASTER_GLB_VISIBLE_MATERIAL_REQUIRED'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('master GLB rejects zero skin-weight data even when JOINTS and WEIGHTS accessors exist',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zero-weight-master-glb-'));
  try{
    const file=path.join(root,'zero-weight.glb');
    zeroSkinWeightsInGlb('assets/roblox/world-ghosts/native/spider/spider.glb',file);
    const result=evaluateCrossPlatform3dMasterGlb({repoRoot:root,family:'CREATURE',role:'BOSS',source:{path:'zero-weight.glb'}});
    assert.equal(result.pass,false);
    assert.ok(result.blockers.includes('MASTER_GLB_JOINT_WEIGHTS_REQUIRED'));
    assert.ok(result.inspection.issues.includes('GLB_SKIN_WEIGHT_DATA_INVALID'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('3D character creature and boss master assets require a structurally complete GLB',()=>{
  const spider=evaluateCrossPlatform3dMasterGlb({
    family:'CREATURE',role:'BOSS',
    source:{path:'assets/roblox/world-ghosts/native/spider/spider.glb'}
  });
  assert.equal(spider.required,true);
  assert.equal(spider.pass,true);
  assert.equal(spider.status,'MASTER_GLB_STATIC_QA_PASS');
  assert.ok(spider.inspection.inventory.meshCount>0);
  assert.ok(spider.inspection.inventory.materials.length>0);
  assert.ok(spider.inspection.inventory.skins.length>0);
  assert.ok(spider.inspection.inventory.animations.length>0);
  assert.ok(spider.inspection.inventory.jointAnimationChannelCount>0);
  assert.ok(spider.inspection.inventory.animatedJointCount>0);
  assert.ok(spider.inspection.inventory.primitives.every(row=>row.hasNormals&&row.hasUv&&row.hasMaterial));
  assert.ok(spider.inspection.inventory.primitives.every(row=>row.actorBindingValid===true));
  assert.ok(spider.inspection.inventory.primitives.filter(row=>row.skinBound).every(row=>row.jointWeightDataValid===true&&row.zeroWeightVertexCount===0&&row.weightSumOutOfRangeVertexCount===0&&row.invalidJointValueCount===0&&row.invalidJointBindingCount===0));
  assert.ok(spider.inspection.inventory.skins.every(row=>row.inverseBindMatricesValid===true));
  assert.ok(spider.inspection.inventory.animations.every(row=>row.channels.every(channel=>channel.timeAccessorValid===true)));
  assert.equal(spider.creatureRoleMotionRequired,true);
  assert.ok(spider.requiredCreatureMotionClips.includes('SPECIAL_ATTACK'));
  assert.equal(spider.missingCreatureRoleMotionClips.length,0);

  const merchantOnCreature=evaluateCrossPlatform3dMasterGlb({family:'CHARACTER',role:'MERCHANT',source:{path:'assets/roblox/world-ghosts/native/spider/spider.glb'}});
  assert.equal(merchantOnCreature.pass,false);
  assert.ok(merchantOnCreature.blockers.includes('MASTER_GLB_ROLE_MOTION_REQUIRED'));
  assert.ok(merchantOnCreature.blockers.includes('MASTER_GLB_ATTACHMENT_SOCKET_BASIS_REQUIRED'));
  assert.ok(merchantOnCreature.missingRoleMotionClips.length>0);
  assert.ok(merchantOnCreature.missingAttachmentSocketBasis.length>0);

  const missing=evaluateCrossPlatform3dMasterGlb({family:'CREATURE',role:'ENEMY',source:{path:'../outside.glb'}});
  assert.equal(missing.pass,false);
  assert.ok(missing.blockers.length>0);

  const prop=evaluateCrossPlatform3dMasterGlb({family:'PROP',source:{path:'assets/roblox/world-ghosts/native/spider/spider.glb'}});
  assert.equal(prop.required,false);
  assert.equal(prop.pass,true);
});

test('creature boss GLB cannot pass with structurally valid but role-incomplete animation names',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'creature-role-motion-glb-'));
  try{
    const file=path.join(root,'role-incomplete.glb');
    anonymizeAnimationNamesInGlb('assets/roblox/world-ghosts/native/spider/spider.glb',file);
    const result=evaluateCrossPlatform3dMasterGlb({repoRoot:root,family:'CREATURE',role:'BOSS',source:{path:'role-incomplete.glb'}});
    assert.equal(result.inspection.status,'INSPECTED_RECONSTRUCTION_INPUT');
    assert.equal(result.pass,false);
    assert.equal(result.creatureRoleMotionRequired,true);
    assert.ok(result.requiredCreatureMotionClips.includes('THREAT_OR_INTRO'));
    assert.ok(result.missingCreatureRoleMotionClips.includes('ATTACK'));
    assert.ok(result.missingCreatureRoleMotionClips.includes('SPECIAL_ATTACK'));
    assert.ok(result.blockers.includes('MASTER_GLB_CREATURE_ROLE_MOTION_REQUIRED'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('generic ATTACK clip cannot satisfy boss SPECIAL_ATTACK role coverage',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'creature-role-alias-glb-'));
  try{
    const file=path.join(root,'attack-only.glb');
    rewriteAnimationNamesInGlb('assets/roblox/world-ghosts/native/spider/spider.glb',file,()=> 'attack');
    const result=evaluateCrossPlatform3dMasterGlb({repoRoot:root,family:'CREATURE',role:'BOSS',source:{path:'attack-only.glb'}});
    assert.equal(result.pass,false);
    assert.ok(result.missingCreatureRoleMotionClips.includes('SPECIAL_ATTACK'));
    assert.ok(result.blockers.includes('MASTER_GLB_CREATURE_ROLE_MOTION_REQUIRED'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('actor DCC recipe without GLB cannot satisfy the 3D master contract',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{
      gameId:'master-glb-required',
      goal:'보스 3D 메시와 모션을 제작',
      assetAuthoring:{recipes:[{
        id:'boss-fbx-only',assetId:'boss-fbx-only',family:'CREATURE',license:'project-original',
        executor:'BLENDER_PYTHON',types:['boss'],targetPlatforms:['ROBLOX'],
        script:'assets/roblox/demo/build-boss.py',
        outputs:['assets/roblox/demo/native/boss/boss.fbx','assets/roblox/demo/native/boss/evidence.json','assets/roblox/demo/native/boss/preview.png'],
        evidenceJson:'assets/roblox/demo/native/boss/evidence.json',
        preview:'assets/roblox/demo/native/boss/preview.png',
        editableSource:'assets/roblox/demo/build-boss.py',
        runMode:'VERIFY_ONLY'
      }]}
    },
    manifest:{assets:[]},presetCatalog:{presets:[]}
  });
  assert.equal(plan.nativeAuthoringExecution.dcc.crossPlatform3dMasterGlbRequired,true);
  assert.ok(plan.nativeAuthoringExecution.dcc.crossPlatform3dMasterGlbRequiredTypes.includes('boss'));
  assert.ok(plan.nativeAuthoringExecution.dcc.uncoveredTypes.includes('boss'));
  assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes.some(row=>row.id==='boss-fbx-only'),false);
  assert.notEqual(plan.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
});

test('DCC verification selects the declared master GLB even when a blend output is listed first',()=>{
  const root=tempRoot();
  try{
    const base='assets/demo/boss/native';
    fs.mkdirSync(path.join(root,base),{recursive:true});
    fs.mkdirSync(path.join(root,'assets/demo'),{recursive:true});
    fs.writeFileSync(path.join(root,'assets/demo/build.py'),'# fixture\n','utf8');
    fs.writeFileSync(path.join(root,base,'source.blend'),'fixture','utf8');
    fs.copyFileSync('assets/roblox/world-ghosts/native/spider/spider.glb',path.join(root,base,'master.glb'));
    fs.writeFileSync(path.join(root,base,'preview.png'),'preview','utf8');
    fs.writeFileSync(path.join(root,base,'evidence.json'),JSON.stringify({productionVerified:false}),'utf8');
    const fake=path.join(root,'fake-blender.sh');
    fs.writeFileSync(fake,'#!/bin/sh\nexit 0\n','utf8');fs.chmodSync(fake,0o755);
    const order={
      target:'roblox',evidence:['asset-production-parallel:v1'],
      assetProduction:{nativeAuthoringExecution:{dcc:{executionRecipes:[{
        id:'declared-master',assetId:'declared-master',family:'CREATURE',license:'project-original',
        executor:'BLENDER_PYTHON',runMode:'VERIFY_ONLY',script:'assets/demo/build.py',editableSource:'assets/demo/build.py',
        types:['boss'],targetPlatforms:['roblox'],args:[],
        outputs:[base+'/source.blend',base+'/master.glb',base+'/preview.png',base+'/evidence.json'],
        evidenceJson:base+'/evidence.json',preview:base+'/preview.png',
        masterGlbRequired:true,masterGlbOutput:base+'/master.glb'
      }]}}}
    };
    const result=executeDeclaredNativeDccAuthoringVerification({cwd:root,order,blenderExecutable:fake,persistCandidateOutputs:false});
    assert.equal(result.executed,true);
    assert.equal(result.recipes[0].nativeArtifact,base+'/master.glb');
    assert.equal(result.recipes[0].role,'BOSS');
    assert.equal(result.recipes[0].masterGlb,base+'/master.glb');
    assert.equal(result.recipes[0].masterGlbHash,result.recipes[0].artifactHash);
    assert.equal(result.recipes[0].derivedFromMasterGlbHash,null);
    assert.equal(result.recipes[0].platformNativeDerivativeRequired,true);
    assert.equal(result.recipes[0].masterGlbStaticQaPass,true);
    assert.equal(result.recipes[0].masterGlbQaAuthority,'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb');
    assert.ok(result.recipes[0].masterGlbInspection.meshSkinBindingCount>0);
    assert.ok(result.recipes[0].masterGlbInspection.jointAnimationChannelCount>0);
    assert.ok(result.recipes[0].masterGlbInspection.animatedJointCount>0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Web 3D actor authoring requires exact Master GLB path and hash binding in Web source',()=>{
  const masterPath='assets/generated/web/demo/npc/master.glb';
  const masterHash='a'.repeat(64);
  const sourceHash='b'.repeat(64);
  const order={
    target:'web',
    assetProductionLane:true,
    assetProduction:{nativeAuthoringExecution:{
      enabled:true,
      platformReauthoringRequired:true,
      dcc:{
        requiredTypes:['npc'],
        executionStatus:'READY_FOR_EXISTING_AUTHORING_EXECUTOR',
        executionEvidence:{
          executed:true,allRecipesPassed:true,candidateUsable:true,persistedForCandidate:true,
          editableSource:'assets/demo/build-npc.py',nativeArtifact:masterPath,artifactHash:masterHash,preview:'assets/generated/web/demo/npc/preview.png',
          recipes:[{
            assetId:'web-npc-master',family:'CHARACTER',license:'project-original',types:['npc'],
            nativeArtifact:masterPath,artifactHash:masterHash,sourceHash,editableSourceHash:sourceHash,
            masterGlbRequired:true,masterGlb:masterPath,masterGlbHash:masterHash,masterGlbStaticQaPass:true,
            persistedForCandidate:true
          }]
        }
      },
      nativeText:{requiredTypes:['npc']}
    }}
  };
  const good=evaluateNativeAssetAuthoringCandidate({
    order,
    candidate:{edits:[{path:'web-games/demo/index.html',replace:[
      "const MASTER_GLB = '"+masterPath+"';",
      "const MASTER_GLB_SHA256 = '"+masterHash+"';",
      "const loader = new GLTFLoader();",
      "loader.load(MASTER_GLB, gltf => {",
      "  const mixer = new THREE.AnimationMixer(gltf.scene);",
      "  const action = mixer.clipAction(gltf.animations[0]); action.play();",
      "  requestAnimationFrame(function render(){ mixer.update(1/60); requestAnimationFrame(render); });",
      "});"
    ].join('\n')}]}
  });
  assert.equal(good.dccAuthored,true);
  assert.equal(good.webMasterGlbRuntimeBindingRequired,true);
  assert.equal(good.generatedAssetBindingRequired,true);
  assert.equal(good.generatedAssetBindingApplied,true);
  assert.deepEqual([...good.generatedNativeArtifacts],[masterPath]);
  assert.equal(good.generatedAssetIdentityBindings[0].runtimeSource,'MASTER_GLB');

  const missingHash=evaluateNativeAssetAuthoringCandidate({
    order,
    candidate:{edits:[{path:'web-games/demo/index.html',replace:[
      "const MASTER_GLB = '"+masterPath+"';",
      "const loader = new GLTFLoader();",
      "loader.load(MASTER_GLB, gltf => {",
      "  const mixer = new THREE.AnimationMixer(gltf.scene);",
      "  requestAnimationFrame(function render(){ mixer.update(1/60); requestAnimationFrame(render); });",
      "});"
    ].join('\n')}]}
  });
  assert.equal(missingHash.generatedAssetBindingRequired,true);
  assert.equal(missingHash.generatedAssetBindingApplied,false);
  assert.equal(missingHash.status,'GENERATED_ASSET_BINDING_REQUIRED');

  const commentOnly=evaluateNativeAssetAuthoringCandidate({
    order,
    candidate:{edits:[{path:'web-games/demo/index.html',replace:[
      "const MASTER_GLB = '"+masterPath+"';",
      "const MASTER_GLB_SHA256 = '"+masterHash+"';",
      "// const loader = new GLTFLoader(); loader.load(MASTER_GLB); const mixer = new THREE.AnimationMixer(scene); requestAnimationFrame(render);",
      "document.body.dataset.asset = MASTER_GLB_SHA256;"
    ].join('\n')}]}
  });
  assert.equal(commentOnly.generatedAssetBindingApplied,false);
  assert.ok(commentOnly.generatedAssetRuntimeBindingFailures.length>0);
});

test('native actor binding validates every DCC recipe one-to-one and cannot hide a missing derivative',()=>{
  const masterA='assets/generated/unity/demo/a/master.glb',masterB='assets/generated/unity/demo/b/master.glb';
  const nativeA='unity-games/demo/Assets/Generated/a.prefab',hashA='a'.repeat(64),masterHashA='b'.repeat(64),masterHashB='c'.repeat(64),sourceHash='d'.repeat(64);
  const order={target:'unity',assetProductionLane:true,assetProduction:{nativeAuthoringExecution:{
    enabled:true,dcc:{requiredTypes:['npc','boss'],executionEvidence:{
      executed:true,allRecipesPassed:true,candidateUsable:true,persistedForCandidate:true,
      editableSource:'assets/demo/build.py',nativeArtifact:masterA,artifactHash:masterHashA,preview:'assets/demo/preview.png',
      recipes:[
        {assetId:'npc-a',family:'CHARACTER',types:['npc'],nativeArtifact:masterA,artifactHash:masterHashA,masterGlbRequired:true,masterGlb:masterA,masterGlbHash:masterHashA,masterGlbStaticQaPass:true,platformNativeArtifact:nativeA,platformNativeArtifactHash:hashA,derivedFromMasterGlbHash:masterHashA},
        {assetId:'boss-b',family:'CREATURE',types:['boss'],nativeArtifact:masterB,artifactHash:masterHashB,masterGlbRequired:true,masterGlb:masterB,masterGlbHash:masterHashB,masterGlbStaticQaPass:true,platformNativeArtifact:null,platformNativeArtifactHash:null,derivedFromMasterGlbHash:masterHashB}
      ]
    }},nativeText:{requiredTypes:['npc','boss']}
  }}};
  const result=evaluateNativeAssetAuthoringCandidate({order,candidate:{edits:[{path:'unity-games/demo/Assets/Game.cs',replace:[
    'var prefab = AssetDatabase.LoadAssetAtPath<GameObject>("'+nativeA+'");',
    'const string Hash = "'+hashA+'";',
    'var actor = Instantiate(prefab);',
    'var skin = actor.GetComponentInChildren<SkinnedMeshRenderer>();',
    'var animator = actor.GetComponentInChildren<Animator>();'
  ].join('\\n')}]}});
  assert.equal(result.dccAuthored,true);
  assert.equal(result.generatedAssetBindingRequired,true);
  assert.equal(result.generatedAssetBindingApplied,false);
  assert.equal(result.missingGeneratedArtifactRecipes.length,1);
  assert.equal(result.missingGeneratedArtifactRecipes[0].assetId,'boss-b');
  assert.equal(result.status,'GENERATED_ASSET_BINDING_REQUIRED');
});

test('master GLB evidence is never exposed as a platform-native binding or promotion candidate',()=>{
  const masterPath='assets/generated/roblox/demo/creature/actor.glb',masterHash='a'.repeat(64),sourceHash='b'.repeat(64);
  const order={target:'roblox',assetProductionLane:true,assetProduction:{nativeAuthoringExecution:{dcc:{executionEvidence:{
    executed:true,allRecipesPassed:true,candidateUsable:true,persistedForCandidate:true,recipes:[{
      assetId:'actor-master',family:'CREATURE',license:'project-original',nativeArtifact:masterPath,artifactHash:masterHash,sourceHash,editableSourceHash:sourceHash,
      masterGlbRequired:true,masterGlb:masterPath,masterGlbHash:masterHash,derivedFromMasterGlbHash:null,masterGlbStaticQaPass:true,
      masterGlbQaAuthority:'tools/vibe2-asset-production-plan.mjs#evaluateCrossPlatform3dMasterGlb',persistedForCandidate:true
    }]
  }}}}};
  assert.deepEqual([...persistedGeneratedAssetBindings(order)],[]);
  const rows=collectNativeAssetRuntimePromotionCandidates({
    order,
    candidate:{edits:[{path:'server/Game.server.luau',replace:`local MasterGlb="${masterPath}"\nlocal MasterHash="${masterHash}"`}]}
  });
  assert.deepEqual([...rows],[]);
});

test('apply-first rejects a 3D enemy that has no compliant master GLB',(t)=>{
  const root=tempRoot();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const plan=buildVibeAssetProductionPlan({repoRoot:root,
    target:'roblox',
    task:{gameId:'master-glb-apply-first',goal:'enemy monster 3D 모델을 실제 게임에 적용'},
    manifest:{assets:[{
      id:'fake-enemy',family:'CREATURE',types:['enemy'],tags:['enemy','monster'],
      license:'project-original',platforms:['roblox'],path:'assets/logo-sprite-ladybug.svg',
      sourceHash:'fake-source',robloxAssetId:'12345',sameGameExistingRoblox:true
    }]},
    presetCatalog:{version:1,presets:[{id:'enemy',name:'Enemy',genre:'action',keywords:['enemy','monster'],actorAssets:['fake-enemy'],effectAssets:[],toolCandidates:[],platformProfiles:{roblox:{},unity:{},webValidation:{}}}]}
  });
  const enemy=plan.decisions.find(row=>row.type==='enemy');
  assert.ok(enemy);
  assert.equal(enemy.applyFirst.enabled,false);
  assert.ok(plan.nativeAuthoringExecution.dcc.requiredTypes.includes('enemy'));
  assert.equal(plan.nativeAuthoringExecution.dcc.crossPlatform3dMasterGlbRequired,true);
  assert.ok(plan.nativeAuthoringExecution.dcc.uncoveredTypes.includes('enemy'));
});

test('NPC companion hostile humanoid mini boss and boss types resolve to the shared 3D actor GLB contract',()=>{
  for(const type of ['npc','villager','merchant','quest_giver','guard','worker','companion','friendly_character','hostile_humanoid']){
    assert.equal(isCrossPlatform3dActorType(type),true,type);
    assert.equal(crossPlatform3dActorFamilyForType(type),'CHARACTER',type);
  }
  for(const type of ['enemy','elite','mini_boss','boss','raid_boss','creature']){
    assert.equal(isCrossPlatform3dActorType(type),true,type);
    assert.equal(crossPlatform3dActorFamilyForType(type),'CREATURE',type);
  }
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',
    task:{gameId:'fake-npc-master',goal:'NPC 상인 동료 보스 3D actor를 실제 게임에 적용'},
    manifest:{assets:[{
      id:'fake-npc',family:'CHARACTER',types:['npc'],tags:['npc','merchant'],
      license:'project-original',platforms:['roblox'],path:'assets/fake-npc.glb',
      downloaded:true,rigged:true,verifiedAnimation:true,animations:['idle','walk'],sameGameExistingRoblox:true
    }]},
    presetCatalog:{presets:[]}
  });
  const npc=plan.decisions.find(row=>row.type==='npc');
  assert.ok(npc);
  assert.equal(npc.applyFirst.enabled,false);
  assert.ok(plan.nativeAuthoringExecution.dcc.requiredTypes.includes('npc'));
  assert.ok(plan.nativeAuthoringExecution.dcc.crossPlatform3dMasterGlbRequiredTypes.includes('npc'));
});


test('Master GLB static QA alone never grants production verification',()=>{
  const root=tempRoot();
  try{
    const master='assets/roblox/world-ghosts/native/spider/spider.glb';
    const model=path.join(root,master);
    fs.mkdirSync(path.dirname(model),{recursive:true});
    fs.copyFileSync(path.join(process.cwd(),master),model);
    const staticAsset={
      id:'static-spider',family:'CREATURE',category:'CREATURE',status:'REPO_ASSET',
      types:['enemy'],tags:['enemy','spider'],license:'CC0',platforms:['roblox'],
      path:master,masterGlb:master,downloaded:true,rigged:true,rigType:'CUSTOM_SKINNED',
      verifiedAnimation:true,animations:['idle','walk'],
      productionVerified:false,verifiedCompanyReusable:false
    };
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,assets:[staticAsset]},null,2));
    const plan=buildVibeAssetProductionPlan({
      repoRoot:root,target:'roblox',
      task:{gameId:'static-master-only',goal:'enemy monster 3D actor 적용'},
      manifest:{assets:[staticAsset]},presetCatalog:{presets:[]}
    });
    const enemy=plan.decisions.find(row=>row.type==='enemy');
    const candidate=enemy?.applyFirst?.candidates?.find(row=>row.id==='static-spider');
    assert.ok(candidate);
    assert.equal(candidate.masterGlbStaticQaPass,true);
    assert.equal(candidate.sourceHash,null);
    assert.equal(candidate.editableSourceHash,null);
    assert.equal(candidate.artifactHash,null);
    assert.equal(candidate.nativeArtifactHash,null);
    assert.ok(candidate.masterGlbHash);
    assert.equal(candidate.productionVerified,false);
    assert.equal(plan.generatedAssetOutputContract.nativeRuntimeVerificationRequiredBeforeVerifiedPromotion,true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
    const assets=[
      {id:'owned-motion',category:'MOTION',types:['animation'],status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'roblox-games/demo/owned.json',license:'CC0',platforms:['roblox'],states:['idle','attack'],rigType:'R15'},
      {id:'external-motion',types:['animation'],license:'CC0',platforms:['roblox'],path:'assets/motion.json',sourceUrl:'https://example.invalid/clips',downloaded:false,animations:['attack','move']},
      {id:'unknown-clips',types:['animation'],license:'CC0',platforms:['roblox'],path:'roblox-games/demo/clips.json'},
      {id:'reference-motion',referenceOnly:true,types:['animation'],license:'project-original',platforms:['roblox'],path:'assets/reference.json',states:['death']},
      {id:'wrong-platform',types:['animation'],license:'CC0',platforms:['unity'],path:'unity-games/demo/motion.json',states:['death']},
      {id:'blocked-license',types:['animation'],license:'CC-BY-NC',platforms:['roblox'],path:'assets/blocked.json',states:['skill']}
    ];
    for(const asset of assets){const file=path.join(root,asset.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({states:asset.states||asset.animations||[]}));}
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({assets}));
    const plan=buildVibeAssetProductionPlan({repoRoot:root,target:'roblox',task:{gameId:'demo',goal:'공격 모션'},presetCatalog:{presets:[]},manifest:{assets:[]}});
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

test('Rule5 old career motion source cannot auto-author; CC0 actor remains unverified',()=>{
 const root=tempRoot();
 try{
   const company=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
   assert.equal(company.assets.some(row=>row.id==='shared-humanoid-motion-v1'),false);
   const actor=company.assets.find(row=>row.id==='external-actor-knight');
   assert.ok(actor,'registered CC0 source actor must remain available');
   assert.equal(actor.license,'CC0-1.0');
   fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:company.version,assets:[actor],externalSources:[]}));
   const task={gameId:'common-career-demo',genre:'ACTION_RPG',goal:'samurai visual native-source validation',commonCareerId:'SAMURAI'};
   const plan=buildVibeAssetProductionPlan({repoRoot:root,target:'unity',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
   assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes.some(row=>row.script==='assets/shared/humanoid-motion-v1/author-motion.py'),false);
   assert.equal(plan.nativeAuthoringExecution.completion.authoringRequestIsNotCompletion,true);
   assert.equal(plan.companyGraphicsLibrary.motionAutoGapFill.sharedGenreKits.career.productionVerified,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
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
  assert.equal(hero.nativeAuthoringExecution.dcc.availableExistingRecipeCount,0,'retired authored source is not a ready recipe');
  assert.equal(hero.nativeAuthoringExecution.completion.authoringRequestIsNotCompletion,true);
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

test('generic environment and prop authoring declares task-specific Blender outputs per native platform',t=>{
  const repoRoot=tempRoot();
  t.after(()=>fs.rmSync(repoRoot,{recursive:true,force:true}));
  const task={gameId:'amusement-tycoon',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 놀이공원 환경 배경 소품을 플랫폼 네이티브 3D 자산으로 개선'};
  const roblox=buildVibeAssetProductionPlan({repoRoot,target:'roblox',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
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

  const unity=buildVibeAssetProductionPlan({repoRoot,target:'unity',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(unity.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
  assert.ok(unity.nativeAuthoringExecution.dcc.executionRecipes.every(recipe=>recipe.outputs.every(file=>file.startsWith('assets/generated/unity/amusement-tycoon/'))));
  const robloxOutputs=new Set(roblox.nativeAuthoringExecution.dcc.executionRecipes.flatMap(recipe=>recipe.outputs));
  const unityOutputs=unity.nativeAuthoringExecution.dcc.executionRecipes.flatMap(recipe=>recipe.outputs);
  assert.equal(unityOutputs.some(file=>robloxOutputs.has(file)),false);

  const web=buildVibeAssetProductionPlan({repoRoot,target:'web',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(web.nativeAuthoringExecution.dcc.executionRequired,true);
  assert.ok(web.nativeAuthoringExecution.dcc.executionRecipes.length>0);
  const twoD=buildVibeAssetProductionPlan({repoRoot,target:'web',task:{gameId:'flat-ui',goal:'2D 소품 아이콘 제작'},manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.equal(twoD.nativeAuthoringExecution.dcc.executionRequired,false);
});

test('licensed single image enters existing Blender TripoSR DCC recipe with genuine multiview render outputs',()=>{
  const task={
    gameId:'image-mesh-demo',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 게임 환경 배경 소품 3D',
    imageToAsset:true,referenceImages:[{
      sourceId:'owned-prop-ref',sourceType:'USER_PROVIDED_OR_OWNED_IMAGE',
      path:'assets/roblox/common-materials-v1/sources/Bricks059/Bricks059_1K-PNG_Color.png',license:'CC0'
    }]
  };
  for(const target of ['roblox','unity']){
    const plan=buildVibeAssetProductionPlan({target,task,manifest:{assets:[]},presetCatalog:{presets:[]}});
    const recipes=plan.nativeAuthoringExecution.dcc.executionRecipes;
    assert.ok(recipes.length>0,target);
    for(const recipe of recipes){
      assert.equal(recipe.imageToMesh,true);
      assert.equal(recipe.sourceImage,'assets/roblox/common-materials-v1/sources/Bricks059/Bricks059_1K-PNG_Color.png');
      assert.equal(recipe.sourceLicense.toLowerCase(),'cc0');
      assert.equal(recipe.runMode,'VERIFY_ONLY');
      assert.equal(recipe.runtimeVerificationRequired,true);
      assert.equal(recipe.companyPromotionAllowed,false);
      assert.ok(recipe.args.includes('--source-image'));
      assert.equal(recipe.args[recipe.args.indexOf('--source-image')+1],recipe.sourceImage);
      assert.ok(recipe.args.includes('--source-license'));
      assert.ok(recipe.outputs.some(name=>name.endsWith('/preview.png')));
      for(const angle of ['000','090','180','270']){
        assert.ok(recipe.outputs.some(name=>name.endsWith('/preview-angle-'+angle+'.png')),angle);
      }
    }
  }
  const ccby={...task,referenceImages:[{
    path:'assets/roblox/common-materials-v1/sources/Bricks059/Bricks059_1K-PNG_Color.png',license:'CC-BY',credit:'Creator, source, CC-BY'
  }]};
  const byPlan=buildVibeAssetProductionPlan({target:'roblox',task:ccby,manifest:{assets:[]},presetCatalog:{presets:[]}});
  const licensedImageRecipes=byPlan.nativeAuthoringExecution.dcc.executionRecipes.filter(recipe=>recipe.imageToMesh===true);
  assert.ok(licensedImageRecipes.length>0);
  assert.ok(licensedImageRecipes.every(recipe=>String(recipe.sourceLicense).toUpperCase()==='CC-BY'));
  assert.ok(licensedImageRecipes.every(recipe=>recipe.companyPromotionAllowed===false&&recipe.runtimeVerificationRequired===true));
  const invalid={...task,referenceImages:[{path:'assets/roblox/common-materials-v1/sources/Bricks059/Bricks059_1K-PNG_Color.png'}]};
  assert.throws(()=>buildVibeAssetProductionPlan({target:'roblox',task:invalid,manifest:{assets:[]},presetCatalog:{presets:[]}}),/IMAGE_TO_MESH_LICENSE_REQUIRED/);
  const traversal={...task,referenceImages:[{path:'../private.png',license:'project-original'}]};
  assert.throws(()=>buildVibeAssetProductionPlan({target:'roblox',task:traversal,manifest:{assets:[]},presetCatalog:{presets:[]}}),/IMAGE_TO_MESH_LOCAL_REPOSITORY_IMAGE_REQUIRED/);
  const noCredit={...task,referenceImages:[{path:'assets/roblox/common-materials-v1/sources/Bricks059/Bricks059_1K-PNG_Color.png',license:'CC-BY'}]};
  assert.throws(()=>buildVibeAssetProductionPlan({target:'roblox',task:noCredit,manifest:{assets:[]},presetCatalog:{presets:[]}}),/IMAGE_TO_MESH_ATTRIBUTION_REQUIRED/);
});

test('image mesh reconstruction requires real local open-source weights and cannot silently substitute primitives',()=>{
  const py=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  assert.match(py,/IMAGE_TO_MESH_TRIPOSR_ENGINE_NOT_INSTALLED/);
  assert.match(py,/IMAGE_TO_MESH_TRIPOSR_LOCAL_WEIGHTS_REQUIRED/);
  assert.match(py,/IMAGE_TO_MESH_TRIPOSR_INFERENCE_FAILED/);
  assert.match(py,/IMAGE_TO_MESH_GENERATED_GEOMETRY_INVALID/);
  assert.match(py,/IMAGE_TO_MESH_VIEW_RENDER_MISSING/);
  assert.match(py,/STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING/);
  const executor=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(executor,/IMAGE_TO_MESH_SOURCE_OR_MODEL_PROVENANCE_INVALID/);
  assert.match(executor,/IMAGE_TO_MESH_MULTIVIEW_RENDER_REQUIRED/);
  assert.match(executor,/sha256File\(imageFile\)/);
});

test('Vibe built-in open-source authoring plans preserve human, clothing, objects and medical rights gates',()=>{
  const source=fs.readFileSync(new URL('../tools/vibe2-asset-production-plan.mjs',import.meta.url),'utf8');
  const py=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  for(const module of ['mesh-ai','human','clothing','object','design','medical','animation','video']){
    assert.ok(source.includes(module),'native planner must list '+module);
    assert.ok(py.includes("'"+module+"'"),'Blender native authoring must list '+module);
  }
  for(const role of ['chair','table','door','tree','machine','weapon','lamp']){
    assert.ok(py.includes("'"+role+"'"),role);
  }
  assert.match(py,/HUMAN_MPFB_ADDON_NOT_INSTALLED/);
  assert.match(py,/HUMAN_MPFB_WEIGHT_BINDING_REQUIRED/);
  assert.match(py,/HUMAN_IMPORTED_RIG_AND_WEIGHTS_REQUIRED/);
  assert.match(py,/MEDICAL_SOURCE_SANITIZED_CONFIRMATION_REQUIRED/);
  assert.match(py,/OPEN_SOURCE_SURFACE_RIGHTS_REQUIRED/);
  assert.match(py,/clinicalUseApproved':False/);
  assert.match(py,/bpy\.ops\.export_scene\.gltf/);
  assert.match(py,/if not ASSET_ARMATURES and not MOTION_CLIPS/);
  assert.match(py,/image_mesh_asset\(\)/);
});

// 공용 액션 변환: 서비스 실행 없이 권리가 확인된 내보내기 파일을 기존 제작기에 연결한다.
test('Cascadeur and DeepMotion exports use the same licensed animation converter across platforms',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'shared-motion-export-'));
  try{
    const base={repoRoot:root,manifest:{assets:[]},presetCatalog:{presets:[]}};
    for(const target of ['web','roblox','unity'])for(const provider of ['cascadeur','deepmotion']){
      const task={gameId:'shared-motion',goal:'3D 소품 애니메이션 제작',
        assetAuthoring:{module:provider,sourceModel:'assets/shared/owned-action.fbx',sourceLicense:'project-original'}};
      const plan=buildVibeAssetProductionPlan({...base,target,task});
      const recipes=plan.nativeAuthoringExecution.dcc.executionRecipes;
      assert.ok(recipes.length>0,target+':'+provider);
      for(const recipe of recipes){
        assert.equal(recipe.module,'animation');
        assert.equal(recipe.exportedMotionProvider,provider);
        assert.equal(recipe.externalServiceExecuted,false);
        assert.equal(recipe.script,'assets/native-authoring/build-game-visual.py');
        assert.ok(recipe.args.includes('assets/shared/owned-action.fbx'));
        assert.ok(recipe.outputs.some(file=>file.endsWith('/asset.glb')));
        assert.equal(recipe.runtimeVerificationRequired,true);
        assert.equal(recipe.companyPromotionAllowed,false);
      }
      for(const assetAuthoring of [
        {module:provider},
        {module:provider,sourceModel:'assets/shared/action.obj',sourceLicense:'project-original'},
        {module:provider,sourceModel:'assets/shared/action.fbx',sourceLicense:'unknown'}
      ])assert.throws(()=>buildVibeAssetProductionPlan({...base,target,task:{...task,assetAuthoring}}),
        /EXTERNAL_MOTION_EXPORTED_SOURCE_REQUIRED|EXTERNAL_MOTION_FBX_OR_GLB_REQUIRED|IMAGE_TO_MESH_LICENSE_REQUIRED/);
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('animation and video select a real existing Blender DCC authoring recipe with MP4 evidence',()=>{
  const base={target:'roblox',manifest:{assets:[]},presetCatalog:{presets:[]}};
  for(const module of ['animation','video']){
    const plan=buildVibeAssetProductionPlan({...base,task:{
      gameId:'oss-motion-'+module,
      goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 3D 소품 및 배경 애니메이션 렌더링',
      assetAuthoring:{module,motionKind:'turntable'}
    }});
    const recipes=plan.nativeAuthoringExecution.dcc.executionRecipes;
    assert.ok(recipes.length>0,module);
    assert.ok(recipes.some(recipe=>recipe.module===module),module);
    for(const recipe of recipes.filter(recipe=>recipe.module===module)){
      assert.ok(recipe.args.includes('--module'));
      assert.ok(recipe.args.includes('--motion-kind'));
      assert.ok(recipe.args.includes('turntable'));
      assert.equal(recipe.runtimeVerificationRequired,true);
      assert.equal(recipe.companyPromotionAllowed,false);
      assert.ok(recipe.outputs.some(output=>output.endsWith('/preview-motion.mp4')));
      assert.ok(recipe.outputs.some(output=>output.endsWith('/asset.glb')));
      for(const angle of ['000','090','180','270']){
        assert.ok(recipe.outputs.some(name=>name.endsWith('/preview-angle-'+angle+'.png')),angle);
      }
    }
  }
  const py=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  assert.match(py,/def human_motion\(/);
  assert.match(py,/MOTION_CLIPS\.append\('SHOWCASE'\)/);
  assert.match(py,/VIDEO_FFMPEG_ENCODER_EXECUTION_FAILED/);
  assert.match(py,/ffmpeg\.org/);
  assert.match(py,/'-c:v','mpeg4'/);
  assert.match(py,/actualFramesRendered':True/);
  const exec=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(exec,/NATIVE_OPEN_SOURCE_ANIMATION_VIDEO_OUTPUT_UNVERIFIED/);
  assert.match(exec,/NATIVE_OPEN_SOURCE_VIDEO_CONTAINER_INVALID/);
  assert.match(exec,/videoProof\.sourceGlbSha256!==nativeArtifact\.sha256/);
  assert.match(exec,/glbInspection\?\.inventory\?\.animations/);
});

test('licensed FBX motion enters the unified internal asset library without provider-specific routing',()=>{
  const task={
    gameId:'internal-motion',
    goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 3D 소품 배경 애니메이션',
    assetAuthoring:{module:'animation',sourceModel:'assets/shared/mocap/walk.fbx',sourceLicense:'project-original'}
  };
  for(const target of ['roblox','unity']){
    const plan=buildVibeAssetProductionPlan({target,task,manifest:{assets:[]},presetCatalog:{presets:[]}});
    const recipes=plan.nativeAuthoringExecution.dcc.executionRecipes.filter(row=>row.module==='animation');
    assert.ok(recipes.length>0,target);
    for(const recipe of recipes){
      assert.equal(recipe.sourceModel,'assets/shared/mocap/walk.fbx');
      assert.equal(recipe.sourceLicense,'project-original');
      assert.equal(recipe.internalAssetLibrary,'VIBE_STUDIO_ASSET_UNIVERSE');
      assert.equal(recipe.internalAssetState,'PREPARED_NATIVE_QA_PENDING');
      assert.equal(recipe.materialsMeshesRigAndMotionEnhancementOnly,true);
      assert.ok(recipe.args.includes('--source-model'));
      assert.ok(!recipe.args.includes('--source-provider'));
      assert.ok(!Object.hasOwn(recipe,'sourceProvider'));
      assert.ok(recipe.outputs.some(output=>output.endsWith('/asset.glb')));
      assert.equal(recipe.companyPromotionAllowed,false);
      assert.equal(recipe.runtimeVerificationRequired,true);
    }
  }
  const automatic=buildVibeAssetProductionPlan({target:'roblox',
    task:{...task,assetAuthoring:{...task.assetAuthoring,module:undefined}},
    manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.ok(automatic.nativeAuthoringExecution.dcc.executionRecipes.some(row=>row.module==='animation'
    &&row.sourceModel==='assets/shared/mocap/walk.fbx'));
  assert.throws(()=>buildVibeAssetProductionPlan({target:'roblox',
    task:{...task,assetAuthoring:{...task.assetAuthoring,module:'object'}},
    manifest:{assets:[]},presetCatalog:{presets:[]}}),/NATIVE_MOCAP_FBX_REQUIRES_ANIMATION_MODULE/);
  assert.throws(()=>buildVibeAssetProductionPlan({target:'roblox',
    task:{...task,assetAuthoring:{...task.assetAuthoring,sourceLicense:'CC-BY-NC'}},
    manifest:{assets:[]},presetCatalog:{presets:[]}}),/IMAGE_TO_MESH_LICENSE_REQUIRED/);
  const script=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  assert.match(script,/bpy\.ops\.import_scene\.fbx/);
  assert.match(script,/NATIVE_MOCAP_SKINNED_RIG_REQUIRED/);
  assert.match(script,/NATIVE_MOCAP_CLIP_REQUIRED/);
  assert.match(script,/SOURCE_UV_PRESERVED/);
  assert.match(script,/NATIVE_SOURCE_UV_INVALID/);
  assert.match(script,/textureIndicesValid/);
  assert.match(script,/sourceUvPreserved/);
  assert.match(script,/SOURCE_MOCAP/);
});

test('all source GLBs share one internal asset identity and receive non-destructive PBR style variants',()=>{
  const task={gameId:'internal-mesh',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 3D 소품 배경',
    assetAuthoring:{module:'object',sourceModel:'assets/shared/models/asset.glb',sourceLicense:'cc0'}};
  for(const target of ['roblox','unity']){
    const plan=buildVibeAssetProductionPlan({target,task,manifest:{assets:[]},presetCatalog:{presets:[]}});
    const imported=plan.nativeAuthoringExecution.dcc.executionRecipes.filter(row=>row.sourceModel===task.assetAuthoring.sourceModel);
    assert.ok(imported.length>0,target);
    for(const recipe of imported){
      assert.equal(recipe.internalAssetLibrary,'VIBE_STUDIO_ASSET_UNIVERSE');
      assert.equal(recipe.internalAssetState,'PREPARED_NATIVE_QA_PENDING');
      assert.equal(recipe.runMode,'VERIFY_ONLY');
      assert.equal(recipe.companyPromotionAllowed,false);
      assert.equal(recipe.license,'cc0');
      assert.ok(!recipe.args.includes('--source-provider'));
    }
  }
  const script=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  assert.match(script,/VIBE_STUDIO_ASSET_UNIVERSE/);
  assert.match(script,/PBR_ROUGHNESS_STYLE_REAUTHOR/);
  assert.match(script,/PBR_BASE_COLOR_STYLE_REAUTHOR/);
  assert.match(script,/if rig not in ASSET_ARMATURES and any/,'existing source GLB rig and motion must survive asset reauthoring');
  assert.match(script,/transformHistory.*SOURCE_ENHANCEMENTS/);
  assert.match(script,/sourceFileImmutable.*True/);
  assert.match(script,/nativeRuntimePromotionRequired.*True/);
  assert.match(script,/NATIVE_GLB_PBR_GEOMETRY_CHANNELS_INVALID/);
  assert.doesNotMatch(script,/ARGS\.source_provider/);
});

test('unlicensed TRELLIS.2 dependencies block commercial asset authoring before GPU execution',()=>{
  const task={gameId:'high-fidelity-scene',
    goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 바위 환경 3D 모델',
    imageToAsset:true,assetAuthoring:{meshModel:'trellis2'},
    referenceImages:[{path:'assets/roblox/world-ghosts/dokkaebi.png',license:'project-original'}]};
  for(const target of ['roblox','unity']){
    assert.throws(()=>buildVibeAssetProductionPlan({
      target,task,manifest:{assets:[]},presetCatalog:{presets:[]}
    }),/IMAGE_TO_MESH_TRELLIS2_NVIDIA_COMMERCIAL_RIGHTS_UNVERIFIED/);
  }
  const autoPlan=buildVibeAssetProductionPlan({
    target:'unity',task:{...task,assetAuthoring:{meshModel:'auto'}},
    manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.ok(autoPlan.nativeAuthoringExecution.dcc.executionRecipes.length>0);
  assert.ok(autoPlan.nativeAuthoringExecution.dcc.executionRecipes.every(row=>row.meshModel==='auto'));
  assert.throws(()=>buildVibeAssetProductionPlan({target:'roblox',
    task:{...task,assetAuthoring:{meshModel:'unknown-provider'}},
    manifest:{assets:[]},presetCatalog:{presets:[]}}),/IMAGE_TO_MESH_MODEL_UNSUPPORTED/);
  const py=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  assert.match(py,/IMAGE_TO_MESH_TRELLIS2_NVIDIA_COMMERCIAL_RIGHTS_UNVERIFIED/);
  assert.match(py,/trellis_requested = requested == 'trellis2'/);
  assert.doesNotMatch(py,/requested == 'auto' and any\(os\.environ\.get/);
  assert.match(py,/VIBE_TRIPOSR_HOME/);
  assert.match(py,/IMAGE_TO_MESH_TRIPOSR_LOCAL_INSTALL_REQUIRED/);
  assert.match(py,/HF_HUB_OFFLINE/);
});

test('direct Blender image-mesh production enforces the Nvidia rights gate without loading Blender or GPU',()=>{
  const python=[
    'import ast, os, tempfile, hashlib',
    'from pathlib import Path',
    'from types import SimpleNamespace',
    'source = Path("assets/native-authoring/build-game-visual.py").read_text(encoding="utf-8")',
    'tree = ast.parse(source)',
    'func = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "image_mesh_asset")',
    'with tempfile.TemporaryDirectory() as folder:',
    '    image = Path(folder) / "licensed.png"',
    '    image.write_bytes(b"valid-source-fixture")',
    '    scope = {"ARGS": SimpleNamespace(source_image=str(image), source_license="project-original", source_credit="", mesh_model="trellis2"), "Path": Path, "os": os, "hashlib": hashlib}',
    '    exec(compile(ast.Module(body=[func], type_ignores=[]), "<isolated-image-mesh-source>", "exec"), scope)',
    '    try:',
    '        scope["image_mesh_asset"]()',
    '    except RuntimeError as error:',
    '        assert str(error) == "IMAGE_TO_MESH_TRELLIS2_NVIDIA_COMMERCIAL_RIGHTS_UNVERIFIED", error',
    '    else:',
    '        raise AssertionError("Noncommercial Nvidia dependency was allowed to execute")'
  ].join('\n');
  execFileSync('python3',['-c',python],{encoding:'utf8',timeout:30000});
});

test('Blender and FFmpeg video uses verifiable three-shot cinematography without changing gameplay',()=>{
  const task={gameId:'cinematic-demo',
    goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] 환경 소품 3D 애니메이션 영상 제작',
    assetAuthoring:{module:'video',motionKind:'turntable',cinematicStyle:'dramatic',cinematicQuality:'high'}};
  const plan=buildVibeAssetProductionPlan({target:'roblox',task,manifest:{assets:[]},presetCatalog:{presets:[]}});
  assert.ok(plan.nativeAuthoringExecution.dcc.executionRecipes.length);
  for(const recipe of plan.nativeAuthoringExecution.dcc.executionRecipes){
    assert.equal(recipe.module,'video');
    assert.equal(recipe.cinematicStyle,'dramatic');
    assert.equal(recipe.cinematicQuality,'high');
    assert.equal(recipe.args[recipe.args.indexOf('--cinematic-style')+1],'dramatic');
    assert.equal(recipe.args[recipe.args.indexOf('--cinematic-quality')+1],'high');
    assert.ok(recipe.outputs.some(output=>output.endsWith('/preview-motion.mp4')));
  }
  const source=fs.readFileSync(new URL('../assets/native-authoring/build-game-visual.py',import.meta.url),'utf8');
  for(const marker of ['ESTABLISHING','ACTION_REVEAL','SIGNATURE_CLOSEUP']){
    assert.ok(source.includes(marker));
  }
  assert.match(source,/video_resolution=640 if shot_quality=='high' else 320/);
  assert.match(source,/SCENE\.render\.filepath=str\(frames_dir/);
  assert.match(source,/cinematicStyle':video_style/);
  const verification=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(verification,/NATIVE_OPEN_SOURCE_CINEMATIC_SHOT_EVIDENCE_INVALID/);
  assert.match(verification,/NATIVE_OPEN_SOURCE_CINEMATIC_REQUEST_MISMATCH/);
});
 
test('Web 3D actor work requires the shared Master GLB DCC path without forcing 2D Web actors',()=>{
  const threeD=buildVibeAssetProductionPlan({
    target:'web',
    task:{gameId:'web-3d-actor-demo',goal:'3D NPC companion boss를 GLB 기반 WebGL actor로 구현'},
    manifest:{assets:[]},
    presetCatalog:{presets:[]}
  });
  for(const type of ['npc','companion','boss']){
    const row=threeD.decisions.find(item=>item.type===type);
    assert.ok(row,type);
    assert.ok(row.directAuthoring.includes('blender-python-original-mesh-rig-and-glb'),type);
    assert.ok(threeD.nativeAuthoringExecution.dcc.requiredTypes.includes(type),type);
  }
  assert.equal(threeD.nativeAuthoringExecution.authoringSurface,'WEB_NATIVE_SOURCE_WITH_SHARED_DCC_MASTER');
  assert.equal(threeD.nativeAuthoringExecution.dcc.executionRequired,true);
  assert.equal(threeD.nativeAuthoringExecution.dcc.crossPlatform3dMasterGlbRequired,true);
  assert.equal(threeD.nativeAuthoringExecution.dcc.web3dActorMasterAuthoringRequired,true);
  assert.ok(threeD.nativeAuthoringExecution.nativeText.requiredTypes.includes('npc'));

  const twoD=buildVibeAssetProductionPlan({
    target:'web',
    task:{gameId:'web-2d-actor-demo',goal:'2D Canvas NPC 캐릭터와 UI를 기존 웹 게임에 적용'},
    manifest:{assets:[]},
    presetCatalog:{presets:[]}
  });
  const npc=twoD.decisions.find(item=>item.type==='npc');
  assert.ok(npc);
  assert.equal(npc.directAuthoring.includes('blender-python-original-mesh-rig-and-glb'),false);
  assert.equal(twoD.nativeAuthoringExecution.dcc.executionRequired,false);
  assert.equal(twoD.nativeAuthoringExecution.dcc.web3dActorMasterAuthoringRequired,false);
});


test('task-declared Blender recipe stays mandatory even when a reusable animation candidate is ready',()=>{
  const root=tempRoot();
  try{
    const readyMotion={id:'ready-motion',family:'MOTION',category:'MOTION',types:['animation'],tags:['animation','motion'],
      path:'assets/roblox/demo/ready-motion.glb',platforms:['roblox'],license:'CC0',
      downloaded:true,productionVerified:true,verifiedAnimation:true,sourceHash:'ready-motion-source'};
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,assets:[readyMotion]},null,2));
    const plan=buildVibeAssetProductionPlan({
      target:'roblox',repoRoot:root,
      task:{
        gameId:'declared-dcc-demo',
        goal:'기존 모션 자산을 유지하면서 선언된 Blender 파생 모션을 실제 제작',
        assetAuthoring:{recipes:[{
          id:'declared-motion-v1',assetId:'declared-motion-source',family:'MOTION',license:'CC0',
          executor:'BLENDER_PYTHON',types:['animation'],targetPlatforms:['ROBLOX'],
          script:'assets/roblox/demo/refine-motion.py',
          args:['--output','assets/roblox/demo/native/motion-v1'],
          outputs:['assets/roblox/demo/native/motion-v1/motion.glb','assets/roblox/demo/native/motion-v1/evidence.json',
            'assets/roblox/demo/native/motion-v1/preview.png'],
          evidenceJson:'assets/roblox/demo/native/motion-v1/evidence.json',
          preview:'assets/roblox/demo/native/motion-v1/preview.png',
          editableSource:'assets/roblox/demo/refine-motion.py',runMode:'VERIFY_ONLY'
        }]}
      },
      manifest:{assets:[readyMotion]},presetCatalog:{presets:[]}
    });
    const animation=plan.decisions.find(row=>row.type==='animation');
    assert.equal(animation?.applyFirst?.enabled,true);
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRequired,true);
    assert.ok(plan.nativeAuthoringExecution.dcc.requiredTypes.includes('animation'));
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRequestCount,1);
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].id,'declared-motion-v1');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].assetId,'declared-motion-source');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].family,'MOTION');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].license,'CC0');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
  const root=tempRoot();
  try{
    const authoringAsset={
      id:'boss-authoring-base',family:'CREATURE',category:'CREATURE',status:'REPO_ASSET',
      types:['boss'],tags:['boss','보스','3D','메시','모션'],license:'CC0',
      platforms:['roblox'],downloaded:false,sourceHash:'boss-source-v1',
      nativeArtifacts:['assets/roblox/demo/native/boss/boss.glb'],
      sourceFiles:['assets/roblox/demo/build-boss.py','assets/roblox/demo/BOSS.md'],
      authoringRecipes:[{
        id:'boss-blender-v1',executor:'BLENDER_PYTHON',types:['boss'],targetPlatforms:['ROBLOX'],
        script:'assets/roblox/demo/build-boss.py',args:['--output','assets/roblox/demo/native/boss'],
        outputs:['assets/roblox/demo/native/boss/boss.glb','assets/roblox/demo/native/boss/evidence.json',
          'assets/roblox/demo/native/boss/preview.png'],
        evidenceJson:'assets/roblox/demo/native/boss/evidence.json',
        preview:'assets/roblox/demo/native/boss/preview.png',
        editableSource:'assets/roblox/demo/build-boss.py',runMode:'VERIFY_ONLY'
      }]
    };
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,assets:[authoringAsset]},null,2));
    const plan=buildVibeAssetProductionPlan({
      repoRoot:root,target:'roblox',
      task:{gameId:'blender-recipe-demo',goal:'보스 3D 메시와 모션을 고품질로 다시 제작'},
      manifest:{assets:[authoringAsset]},presetCatalog:{presets:[]}
    });
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRequired,true);
    assert.equal(plan.nativeAuthoringExecution.dcc.executionStatus,'READY_FOR_EXISTING_AUTHORING_EXECUTOR');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRequestCount,1);
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].id,'boss-blender-v1');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].script,'assets/roblox/demo/build-boss.py');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].family,'CREATURE');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].license,'CC0');
    assert.equal(plan.nativeAuthoringExecution.dcc.executionRecipes[0].safe,true);
    assert.deepEqual([...plan.nativeAuthoringExecution.dcc.availableExistingRecipes],['assets/roblox/demo/build-boss.py']);
    assert.equal(plan.nativeAuthoringExecution.dcc.availableExistingRecipeCount,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
  const root=tempRoot();
  try{
    const manifest={version:1,assets:[
      {id:'web-tree',path:'web-games/demo/assets/tree.png',types:['prop'],tags:['나무'],license:'CC0'},
      {id:'unity-ui',path:'unity-games/shared/UI/ui-panel.png',types:['ui'],tags:['UI'],license:'CC0',platforms:['unity']},
      {id:'roblox-fx',path:'roblox-games/shared/VFX/impact.png',types:['effect'],tags:['이펙트'],license:'CC0',platforms:['roblox']},
      {id:'generic-vfx',path:'',types:['effect'],tags:['이펙트'],license:'CC0'}
    ]};
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[
        {...manifest.assets[1],family:'UI',category:'UI',status:'REPO_ASSET'},
        {...manifest.assets[2],family:'VFX',category:'VFX',status:'REPO_ASSET'}
      ]
    },null,2));
    const task={gameId:'fantasy-survival',goal:'숲 나무 UI 이펙트 애니메이션 그래픽 개선'};
    const unity=buildVibeAssetProductionPlan({task,target:'unity',repoRoot:root,manifest,presetCatalog:{version:1,presets:[]}});
    const roblox=buildVibeAssetProductionPlan({task,target:'roblox',repoRoot:root,manifest,presetCatalog:{version:1,presets:[]}});
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
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Roblox planner keeps unregistered source IDs out of internal library candidates',()=>{
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
    assert.equal(plan.summary.sameGameRobloxCandidateTypes,0);
    assert.ok(plan.decisions.every(row=>row.sameGameCandidates.length===0));
    assert.equal(plan.policy.sameGameRobloxAssetIsCandidateOnlyUntilRuntimeVerified,true);
    assert.equal(plan.policy.unverifiedSameGameRobloxAssetDoesNotOutrankVerifiedCompanyAsset,true);

    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{id:'verified-company-nature',category:'ENVIRONMENT',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,path:'assets/shared/nature.glb',types:['background'],tags:['Nature','background'],platforms:['roblox'],license:'CC0'}]
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

test('game asset selection uses only the registered internal company library',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{
        id:'company-ui',category:'UI',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'unity-games/shared/ui/company.png',license:'CC0',platforms:['unity']
      }],
      externalSources:[{id:'external-source'}]
    },null,2));
    const manifest={version:1,assets:[
      {id:'unregistered-ui',path:'unity-games/demo/Assets/UI/repo.png',types:['ui'],tags:['UI'],license:'project-original'},
      {id:'external-ui',path:'',types:['ui'],tags:['UI'],license:'CC0',source:'External',sourceUrl:'https://example.invalid/ui',downloaded:false}
    ]};
    const plan=buildVibeAssetProductionPlan({
      task:{gameId:'demo',goal:'UI 그래픽 개선'},target:'unity',repoRoot:root,
      manifest,presetCatalog:{version:1,presets:[]}
    });
    const row=plan.decisions.find(item=>item.type==='ui');
    assert.ok(row);
    assert.deepEqual(row.companyCandidates.map(item=>item.id),['company-ui']);
    assert.deepEqual(row.repositoryCandidates.map(item=>item.id),[]);
    assert.deepEqual(row.externalCandidates.map(item=>item.id),[]);
    assert.deepEqual(row.reuseCandidates.map(item=>item.id),['company-ui']);
    assert.equal(plan.summary.companyCandidateTypes>0,true);
    assert.equal(plan.summary.externalCandidateTypes,0);
    assert.ok(!row.decisionOrder.includes('ACQUIRE_LICENSE_VERIFIED_EXTERNAL_ASSET'));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('an externally acquired asset can be evaluated only after registration in the internal library',()=>{
  const root=tempRoot();
  try{
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({
      version:1,
      assets:[{
        id:'company-ui',category:'UI',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
        path:'unity-games/shared/ui/company.png',license:'CC0',platforms:['unity'],sourceHash:'company-ui-v1'
      },{
        id:'downloaded-external-ui',category:'UI',license:'CC0',status:'REPO_ASSET',
        path:'unity-games/demo/Assets/UI/external.png',platforms:['unity'],sourceHash:'external-ui-v1',
        source:'External Pack',sourceUrl:'https://example.invalid/ui-pack',downloaded:true
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

test('Unity Android owner hold prevents pilot weather work even with company PASS',()=>{
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
    assert.equal(result.planned,false);
    assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
    assert.deepEqual(result.tasks,[]);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Android owner hold prevents non-pilot holistic work',()=>{
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
    assert.equal(result.planned,false);
    assert.equal(result.reason,'NO_CONFIRMED_PRODUCTION_PROJECT');
    assert.deepEqual(result.tasks,[]);
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
    assert.ok(alreadyBound,'trace attributes do not apply library assets');
    fs.appendFileSync(path.join(gameRoot,'client','Game.client.luau'),'\nroot.BackgroundColor3 = studioAssetFamily("UI").Color\n');
    assert.equal(findRobloxStudioAssetBackfillTask(project,root,{tasks:[]}),null);
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

test('priority Roblox games bind package asset families to actual native consumers in current game source',()=>{
  const cases=[
    {
      gameId:'daechung-rpg',
      file:'roblox-games/daechung-rpg/client/Game.client.luau',
      families:['VFX']
    },
    {
      gameId:'horror-escape-room',
      file:'roblox-games/horror-escape-room/client/Game.client.luau',
      families:['AUDIO','VFX','PROP']
    },
    {
      gameId:'cozy-island',
      file:'roblox-games/cozy-island/client/Game.client.luau',
      families:['CREATURE','ENVIRONMENT','MATERIAL','AUDIO','VFX','MOTION','PROP']
    }
  ];
  for(const row of cases){
    const source=fs.readFileSync(row.file,'utf8');
    for(const family of row.families){
      assert.equal(
        robloxStudioAssetFamilyBoundInText(source,family),
        true,
        row.gameId+':'+family+' must have an actual native source consumer instead of APPLIED/config-only evidence'
      );
    }
  }
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

test('Roblox source quality blocks multi-part doll NPCs even when they have joints',()=>{
  const primitiveNpc=[
    'local function createNpc()',
    '  local npc = Instance.new("Model")',
    '  npc.Name = "NPC"',
    '  local torso = Instance.new("Part")',
    '  local head = Instance.new("Part")',
    '  local leftArm = Instance.new("Part")',
    '  local rightArm = Instance.new("Part")',
    '  local root = Instance.new("Part")',
    '  local shoulder = Instance.new("Motor6D")',
    '  shoulder.Transform = CFrame.Angles(0, 0.1, 0)',
    '  local humanoid = Instance.new("Humanoid")',
    '  local animator = Instance.new("Animator")',
    '  local track = humanoid:LoadAnimation(Instance.new("Animation"))',
    '  track:Play(0.2)',
    '  track:AdjustWeight(1, 0.2)',
    '  track:AdjustSpeed(speed)',
    '  torso.Material = Enum.Material.SmoothPlastic',
    '  local weapon = Instance.new("Part"); weapon.Name = "weapon sword"',
    '  local tree = Instance.new("Part"); tree.Name = "forest environment tree"',
    '  root.CFrame = CFrame.new(0, 2, 0)',
    '  return npc',
    'end'
  ].join('\n');
  const quality=inspectRobloxNativeCandidateQuality({
    candidate:{edits:[{path:'server/Game.server.luau',replace:primitiveNpc}]},
    sourceRoot:'roblox-games/demo'
  });
  assert.ok(quality.npcFinalActorFindings.some(row=>row.class==='NPC_PRIMITIVE_FINAL_ACTOR_RISK'));
  assert.equal(quality.npcFinalActorHardFailure,'PRIMITIVE_ONLY_FINAL_3D_ACTOR');

  const pathOnlyQuality=inspectRobloxNativeCandidateQuality({
    candidate:{edits:[{path:'server/Game.server.luau',replace:[
      'local MasterGlb = "assets/master/npc.glb"',
      'local function createNpc()',
      '  local npc = Instance.new("Model")',
      '  npc.Name = "NPC"',
      '  return npc',
      'end'
    ].join("\n")}]},
    sourceRoot:'roblox-games/demo'
  });
  assert.equal(pathOnlyQuality.npcFinalActorFindings.length,0);
  assert.ok(pathOnlyQuality.masterGlbPathOnlyFindings.some(row=>row.class==='MASTER_GLB_PATH_ONLY_ACTOR_BINDING_RISK'));
  assert.equal(pathOnlyQuality.masterGlbBindingHardFailure,'CROSS_PLATFORM_MASTER_GLB_STATIC_QA_REQUIRED');

  const meshPartOnlyNpc=[
    'local function createNpc()',
    '  local npc = Instance.new("Model")',
    '  npc.Name = "NPC"',
    '  local torso = Instance.new("MeshPart")',
    '  torso.Parent = npc',
    '  return npc',
    'end'
  ].join('\n');
  const meshPartOnlyQuality=inspectRobloxNativeCandidateQuality({
    candidate:{edits:[{path:'server/Game.server.luau',replace:meshPartOnlyNpc}]},
    sourceRoot:'roblox-games/demo'
  });
  assert.ok(meshPartOnlyQuality.nativeActorBindingFindings.some(row=>row.class==='NPC_NATIVE_ACTOR_BINDING_MISSING_RISK'));

  const importedNpc=[
    'local template = ReplicatedStorage:WaitForChild("NpcRig")',
    'local function createNpc()',
    '  local npc = template:Clone()',
    '  npc.Name = "NPC"',
    '  return npc',
    'end'
  ].join('\n');
  const nativeQuality=inspectRobloxNativeCandidateQuality({
    candidate:{edits:[{path:'server/Game.server.luau',replace:importedNpc}]},
    sourceRoot:'roblox-games/demo'
  });
  assert.equal(nativeQuality.npcFinalActorFindings.length,0);
  assert.equal(nativeQuality.nativeActorBindingFindings.length,0);
});

test('Roblox source quality rejects a generic enemy clone that becomes a boss only by scaling',()=>{
  const quality=inspectRobloxNativeCandidateQuality({
    candidate:{edits:[{path:'server/Boss.server.luau',replace:[
      'local enemyTemplate = ReplicatedStorage:WaitForChild("EnemyRig")',
      'local function createBoss()',
      '  local boss = enemyTemplate:Clone()',
      '  boss.Name = "Boss"',
      '  boss:ScaleTo(2.5)',
      '  return boss',
      'end'
    ].join("\n")}]},
    sourceRoot:'roblox-games/demo'
  });
  assert.ok(quality.bossScaleOnlyFindings.some(row=>row.class==='BOSS_SCALE_ONLY_FINAL_ACTOR_RISK'));
  assert.equal(quality.bossScaleOnlyHardFailure,'BOSS_SCALE_ONLY_FINAL_3D_ACTOR');
});

test('Roblox asset adaptation rejects a composed Part doll NPC as a final presentation',()=>{
  const root=tempRoot();
  try{
    const relative='roblox-games/npc-doll/server/Game.server.luau';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`local function createNpc()
  local npc = Instance.new("Model")
  npc.Name = "NPC"
  local rootPart = Instance.new("Part"); rootPart.Name = "HumanoidRootPart"; rootPart.Parent = npc
  local torso = Instance.new("Part"); torso.Name = "Torso"; torso.Material = Enum.Material.SmoothPlastic; torso.Parent = npc
  local head = Instance.new("Part"); head.Name = "Head"; head.Parent = npc
  local leftArm = Instance.new("Part"); leftArm.Name = "LeftArm"; leftArm.Parent = npc
  local rightArm = Instance.new("Part"); rightArm.Name = "RightArm"; rightArm.Parent = npc
  local shoulder = Instance.new("Motor6D"); shoulder.Name = "RightShoulder"; shoulder.Part0 = torso; shoulder.Part1 = rightArm; shoulder.Parent = torso
  shoulder.Transform = CFrame.Angles(0, 0.1, 0)
  local humanoid = Instance.new("Humanoid"); humanoid.Parent = npc
  local animator = Instance.new("Animator"); animator.Parent = humanoid
  local animation = Instance.new("Animation")
  local track = animator:LoadAnimation(animation)
  track:Play(0.2); track:AdjustWeight(1,0.2); track:AdjustSpeed(humanoid.WalkSpeed / 16)
  rootPart.CFrame = CFrame.new(0,2,0)
  local weapon = Instance.new("Part"); weapon.Name = "weapon sword blade"; weapon.Material = Enum.Material.Metal; weapon.Parent = npc
  local environment = Instance.new("Part"); environment.Name = "forest ground tree biome"; environment.Material = Enum.Material.Grass; environment.Parent = workspace
  return npc
end
createNpc()
`);
    const manifestPath=path.join(root,'manifest-npc-doll.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'roblox',
      changedFiles:[relative],
      presentationQuality:{required:true,target:'roblox',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'npc-doll-final',force:true
    }),/ROBLOX_NPC_NO_PRIMITIVE_DOLL_FINAL/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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

test('Unity native asset final QA rejects 2D SpriteRenderer even alongside 3D meshes',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/other-game/Assets/Scripts/PrototypeAnimatedVisuals.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class PrototypeAnimatedVisuals:MonoBehaviour {
  void Build(){
    var player=Instantiate(Resources.Load<GameObject>("Actors/Hero3D"));
    var player3d=player.GetComponentInChildren<SkinnedMeshRenderer>();
    var weapon=Instantiate(Resources.Load<GameObject>("Weapons/Sword3D"));
    weapon.GetComponent<MeshFilter>().sharedMesh=Resources.Load<Mesh>("Weapons/SwordMesh");
    weapon.AddComponent<MeshRenderer>().material=new Material(Shader.Find("Standard"));
    var environment=Instantiate(Resources.Load<GameObject>("Environment/Forest3D"));
    environment.name="forest ground tree biome";
    var flatEnemy=new GameObject("enemy monster sprite");
    flatEnemy.AddComponent<SpriteRenderer>();
  }
}
`);
    const manifestPath=path.join(root,'manifest-unity-2d-in-3d.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',changedFiles:[relative],
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'unity-2d-in-3d',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*UNITY_WORLD_SPRITE_RENDERER_FORBIDDEN/);
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
    var body=Instantiate(Resources.Load<GameObject>("Actors/Hero3D"));
    var head=body.transform.Find("Head");
    var rig=body.GetComponentInChildren<SkinnedMeshRenderer>();
    var weapon=Instantiate(Resources.Load<GameObject>("Weapons/Sword3D"));
    weapon.name="weapon sword blade";
    var weaponMesh=weapon.GetComponent<MeshFilter>();
    var weaponRenderer=weapon.GetComponent<MeshRenderer>();
    if(weaponMesh!=null && weaponMesh.sharedMesh!=null)
       weaponRenderer.sharedMaterial=new Material(Shader.Find("Standard"));
    var environment=Instantiate(Resources.Load<GameObject>("Environment/Forest3D"));
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
    assert.ok(result.presentationQa.checks.some(row=>row.name==='UNITY_NATIVE_3D_MESH_SOURCE_BINDING'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='UNITY_WORLD_SPRITE_RENDERER_FORBIDDEN'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='GAME_VISUAL_IDENTITY_DOMAINS'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Master GLB actor incremental QA requires skinned mesh Animator collider LOD and state binding',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/actor-demo/Assets/Scripts/ActorVisual.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class ActorVisual:MonoBehaviour {
  [SerializeField] GameObject actorPrefab;
  [SerializeField] Material heroMaterial;
  void Build(){
    var character=Instantiate(actorPrefab);
    var skin=character.GetComponentInChildren<SkinnedMeshRenderer>();
    var animator=character.GetComponentInChildren<Animator>();
    var collider=character.GetComponentInChildren<CapsuleCollider>();
    var lod=character.GetComponentInChildren<LODGroup>();
    skin.sharedMaterial=heroMaterial;
    animator.CrossFade("Idle",0.15f);
    var weapon=new GameObject("weapon sword blade"); weapon.AddComponent<MeshRenderer>();
    var environment=new GameObject("forest environment terrain"); environment.AddComponent<MeshRenderer>();
  }
}
`);
    const manifestPath=path.join(root,'manifest-unity-actor.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      assetProduction:{nativeAuthoringExecution:{dcc:{crossPlatform3dMasterGlbRequired:true}}},
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'unity-master-actor',force:true
    });
    assert.equal(result.outcome,'PASS');
    for(const check of [
      'UNITY_3D_ACTOR_SKINNED_MESH_RENDERER','UNITY_3D_ACTOR_ANIMATOR','UNITY_3D_ACTOR_ANIMATOR_STATE_BINDING',
      'UNITY_3D_ACTOR_COLLIDER_PROXY','UNITY_3D_ACTOR_LOD'
    ])assert.ok(result.presentationQa.checks.some(row=>row.name===check&&row.pass),check);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Master GLB actor incremental QA rejects a primitive mannequin',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/actor-demo-bad/Assets/Scripts/ActorVisual.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class ActorVisual:MonoBehaviour {
  void Build(){
    var character=GameObject.CreatePrimitive(PrimitiveType.Capsule);
    character.AddComponent<Animator>().Play("Idle");
    character.AddComponent<CapsuleCollider>();
    character.AddComponent<LODGroup>();
    var weapon=new GameObject("weapon sword blade"); weapon.AddComponent<MeshRenderer>();
    var environment=new GameObject("forest environment terrain"); environment.AddComponent<MeshRenderer>();
    var material=new Material(Shader.Find("Standard")); character.GetComponent<Renderer>().material=material;
  }
}
`);
    const manifestPath=path.join(root,'manifest-unity-actor-bad.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      assetProduction:{nativeAuthoringExecution:{dcc:{crossPlatform3dMasterGlbRequired:true}}},
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'unity-master-actor-bad',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*(?:UNITY_3D_ACTOR_SKINNED_MESH_RENDERER|PRIMITIVE_ONLY_FINAL_3D_ACTOR)/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Unity Master GLB actor QA rejects an enemy prefab reused as a scale-only boss',()=>{
  const root=tempRoot();
  try{
    const relative='unity-games/boss-scale-only/Assets/Scripts/BossVisual.cs';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`using UnityEngine;
public class BossVisual:MonoBehaviour {
  [SerializeField] GameObject enemyPrefab;
  [SerializeField] Material bossMaterial;
  void Build(){
    var boss=Instantiate(enemyPrefab);
    var skin=boss.GetComponentInChildren<SkinnedMeshRenderer>();
    var animator=boss.GetComponentInChildren<Animator>();
    var collider=boss.GetComponentInChildren<CapsuleCollider>();
    var lod=boss.GetComponentInChildren<LODGroup>();
    skin.sharedMaterial=bossMaterial;
    animator.Play("Idle");
    boss.transform.localScale = Vector3.one * 2.5f;
    var weapon=new GameObject("weapon sword blade"); weapon.AddComponent<MeshRenderer>();
    var environment=new GameObject("forest environment terrain"); environment.AddComponent<MeshRenderer>();
  }
}
`);
    const manifestPath=path.join(root,'manifest-boss-scale-only.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'unity',
      changedFiles:[relative],
      assetProduction:{nativeAuthoringExecution:{dcc:{crossPlatform3dMasterGlbRequired:true}}},
      presentationQuality:{required:true,target:'unity',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'unity-boss-scale-only',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*BOSS_SCALE_ONLY_FINAL_3D_ACTOR/);
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

test('Web 3D actor incremental QA requires GLB runtime loader AnimationMixer and state motion binding',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/web-3d-actor/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><style>#game{background:#111}</style><canvas id="game"></canvas><script type="module">
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('game')});
const material = new THREE.MeshStandardMaterial({roughness:.6});
const loader = new GLTFLoader();
const actorState = {IDLE:'Idle',WALK:'Walk',ATTACK:'Attack',HIT:'Hit',DEATH:'Death'};
loader.load('./actors/npc-master.glb', gltf => {
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  function bindState(state){ const action=actions[actorState[state]]; if(action) action.play(); }
  bindState('IDLE'); bindState('WALK'); bindState('ATTACK'); bindState('HIT'); bindState('DEATH');
  function render(){ mixer.update(1/60); renderer.render(gltf.scene, camera); requestAnimationFrame(render); }
  render();
});
</script>`);
    const manifestPath=path.join(root,'manifest-web-3d-actor.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      assetProduction:{nativeAuthoringExecution:{dcc:{web3dActorMasterAuthoringRequired:true}}},
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    const result=runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-3d-actor',force:true
    });
    assert.equal(result.outcome,'PASS');
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_3D_ACTOR_MASTER_GLB_RUNTIME_BINDING'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_3D_ACTOR_ANIMATION_MIXER'&&row.pass));
    assert.ok(result.presentationQa.checks.some(row=>row.name==='WEB_3D_ACTOR_STATE_MOTION_BINDING'&&row.pass));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('Web 3D actor incremental QA rejects a GLB path with no AnimationMixer state binding',()=>{
  const root=tempRoot();
  try{
    const relative='web-games/web-3d-actor-bad/index.html';
    const file=path.join(root,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,`<!doctype html><style>#game{background:#111}</style><canvas id="game"></canvas><script type="module">
const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('game')});
const material = new THREE.MeshStandardMaterial({roughness:.6});
const loader = new GLTFLoader();
const states=['IDLE','WALK','ATTACK','HIT','DEATH'];
loader.load('./actors/npc-master.glb', gltf => renderer.render(gltf.scene, camera));
</script>`);
    const manifestPath=path.join(root,'manifest-web-3d-actor-bad.json');
    fs.writeFileSync(manifestPath,JSON.stringify({
      target:'web',
      changedFiles:[relative],
      assetProduction:{nativeAuthoringExecution:{dcc:{web3dActorMasterAuthoringRequired:true}}},
      presentationQuality:{required:true,target:'web',pass:'ASSET_ADAPTATION'}
    },null,2));
    assert.throws(()=>runIncrementalQa({
      root,manifest:manifestPath,files:[relative],namespace:'web-3d-actor-bad',force:true
    }),/PRESENTATION_STATIC_QA_FAILED:ASSET_ADAPTATION:.*WEB_3D_ACTOR_ANIMATION_MIXER/);
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
  assert.deepEqual([...plan.runtimeVisualRepair.interfaceMissing],['HUD','MINIMAP']);
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
  const root=tempRoot();
  try{
    const master='assets/roblox/world-ghosts/native/spider/spider.glb';
    const masterPath=path.join(root,master);
    fs.mkdirSync(path.dirname(masterPath),{recursive:true});
    fs.copyFileSync(path.join(process.cwd(),master),masterPath);
    const sameGame={
      id:'existing-wolf',family:'CREATURE',category:'CREATURE',status:'VERIFIED_COMPANY_ASSET',verifiedCompanyReusable:true,
      path:'roblox-games/apply-first-demo/assets/wolf.glb',types:['enemy'],
      tags:['wolf','enemy'],license:'CC0',platforms:['roblox'],
      sameGameExistingRoblox:true,sourceHash:'wolf-v1',robloxAssetId:'123456',masterGlb:master
    };
    const company={
      id:'company-wolf',family:'CREATURE',category:'CREATURE',status:'VERIFIED_COMPANY_ASSET',
      path:'assets/roblox/wolf.glb',types:['enemy'],
      tags:['wolf','enemy'],license:'CC0',platforms:['roblox'],
      companyVerified:true,verifiedCompanyReusable:true,sourceHash:'company-wolf-v1',masterGlb:master
    };
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,assets:[sameGame,company]},null,2));
    const plan=buildVibeAssetProductionPlan({
      repoRoot:root,target:'roblox',manifest:{assets:[sameGame,company]},
      presetCatalog:{version:1,presets:[{
        id:'wolf',name:'Wolf',genre:'survival',keywords:['wolf'],
        actorAssets:['existing-wolf','company-wolf'],effectAssets:[],toolCandidates:[],
        platformProfiles:{roblox:{},unity:{},webValidation:{}}
      }]},
      task:{gameId:'apply-first-demo',goal:'wolf enemy 그래픽을 실제 게임에 적용하고 더 디테일하게'}
    });
    const enemy=plan.decisions.find(row=>row.type==='enemy');
    assert.ok(enemy);
    assert.equal(enemy.applyFirst.enabled,true);
    assert.equal(enemy.applyFirst.candidates[0].id,'existing-wolf',JSON.stringify(enemy.applyFirst.candidates));
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
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('precision production continues from inspection through authoring and application',(t)=>{
  const root=tempRoot();
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const asset={
    id:'hero-body',family:'CHARACTER',types:['character'],tags:['character'],
    license:'project-original',sourceHash:'hero-v1',
    customization:{controls:{jaw:{kind:'MORPH',axis:'FACE',target:'Jaw',min:0,max:1}}}
  };
  const plan=buildVibeAssetProductionPlan({repoRoot:root,
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
  assert.equal(plan.precisionProduction.application.platformConversionOwner,plan.precisionProduction.application.gameBindingOwner);
  assert.equal(plan.precisionProduction.application.assetSourceOwner,'ASSET_DEVELOPMENT');
  assert.equal(plan.precisionProduction.application.runtimeVerificationOwner,'EXISTING_TARGET_RUNTIME_QA');
  assert.ok(plan.precisionProduction.application.nativeVariantRequirements.includes('IMPORTED_OR_EXISTING_AUTHORIZED_NATIVE_ASSET_ID'));
  assert.equal(plan.precisionProduction.application.preparedAssetIsNotAppliedAsset,true);
  assert.equal(plan.mapDetailReconstruction.productionChain.reportOnlyCompletionForbidden,true);
  assert.ok(plan.mapDetailReconstruction.regions[0].layers.some(row=>row.productionAction==='VERIFY_RIGHTS_AND_CREATE_EDITABLE_NATIVE_3D_ASSET'));
  assert.match(assetProductionGuidance(plan),/PRECISION PRODUCTION CHAIN/);
  const prompt=buildPrompt(
    {target:'roblox',goal:'검사부터 제작 적용까지 진행',assetProduction:plan},
    {files:[{path:'client/Game.client.luau',content:'return true',editable:true}]},
    ['client/Game.client.luau']
  );
  assert.match(prompt,/PRECISION PRODUCTION CHAIN BEGIN/);
  const execution=prompt.match(/\[PRECISION PRODUCTION CHAIN BEGIN\]([\s\S]*?)\[PRECISION PRODUCTION CHAIN END\]/)[1];
  assert.match(execution,/platformConversionOwner/);
  assert.match(execution,/gameBindingOwner/);
  assert.doesNotMatch(execution,/"assetItems"|"mapRegions"|"assetChain"|"mapChain"/);
  assert.match(prompt,/qualityDNA/);
  assert.match(prompt,/INSPECT -> VERIFY_ORIGINAL -> EXTRACT_OR_CONVERT_EXISTING -> APPLY -> RUNTIME_QA/);
  assert.match(prompt,/Never produce new source models or speculative content/);
  assert.match(prompt,/All 12 asset families MUST be evaluated/);
});



test('low-quality asset rescue preserves strong axes and escalates to full authoring only after targeted derivation',()=>{
  const root=tempRoot();
  try{
    const master='assets/roblox/world-ghosts/native/mesh/bride.glb';
    const masterPath=path.join(root,master);
    fs.mkdirSync(path.dirname(masterPath),{recursive:true});
    fs.copyFileSync(path.join(process.cwd(),master),masterPath);
    const manifest={assets:[
      {id:'base-hero',family:'CHARACTER',category:'CHARACTER',status:'REPO_ASSET',
        path:'roblox-games/rescue-demo/assets/hero.glb',types:['character'],tags:['character','hero'],
        license:'CC0',platforms:['roblox'],sameGameExistingRoblox:true,sourceHash:'hero-base',
        robloxAssetId:'111',rigType:'R15',retargetable:true,masterGlb:master},
      {id:'donor-hero',family:'CHARACTER',category:'CHARACTER',status:'VERIFIED_COMPANY_ASSET',
        path:'assets/roblox/hero-donor.glb',types:['character'],tags:['character','hero'],
        license:'CC0',platforms:['roblox'],companyVerified:true,
        verifiedCompanyReusable:true,sourceHash:'hero-donor',rigType:'R15',retargetable:true,
        masterGlb:master,platformVariants:{ROBLOX:{path:'assets/roblox/hero-donor.glb'}}}
    ]};
    fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify({version:1,assets:manifest.assets},null,2));
    const plan=buildVibeAssetProductionPlan({
      repoRoot:root,target:'roblox',manifest,
      presetCatalog:{version:1,presets:[{
        id:'hero',name:'Hero',genre:'rpg',keywords:['hero','character'],
        actorAssets:['base-hero','donor-hero'],effectAssets:[],toolCandidates:[],
        platformProfiles:{roblox:{},unity:{},webValidation:{}}
      }]},
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
    for(const axis of ['SILHOUETTE','PROPORTION','ANATOMY','FACE_HANDS_FEET','MATERIAL','RIG','SOCKET','MOTION','LOD'])
      assert.ok(base.qualityAxes.includes(axis),axis);
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
  }finally{fs.rmSync(root,{recursive:true,force:true});}
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
  // [바이브 자동 자산 연결] 현재 소스만 실제 사용으로 판정하고 누락은 기존 작업으로 전달한다.
  const auto=plan.automaticAssetBindingWork;
  assert.equal(auto.enabled,true);
  assert.equal(auto.trigger,'EVERY_EXISTING_BUILD_UP');
  assert.equal(auto.selectedRequirementCount,plan.flowAssetLoadout.selections.filter(row=>row.required!==false).length);
  assert.equal(auto.targets.length,auto.selectedRequirementCount);
  assert.equal(auto.noNewQueue,true);
  assert.equal(auto.existingGraphicsProductionAndBuildUp,true);
  assert.equal(auto.verifiedRuntimeEvidenceRequiredBeforePositiveLearning,true);
  assert.equal(auto.pendingSourceBindingCount+auto.provenanceRequiredCount+auto.authoringRequiredCount+auto.runtimeQaRequiredCount,auto.selectedRequirementCount);
  assert.ok(auto.targets.every(row=>row.status!=='NATIVE_SOURCE_BINDING_REQUIRED'
    ||(row.sourceFilesPresent===true&&Boolean(row.sourceContentFingerprint)
      &&row.verifiedLibraryCandidate===true&&row.nativeSelectionReady===true)));
  assert.ok(auto.targets.every(row=>row.nativeRuntimeVerified===false&&row.protectedGameplayAuthority===true));
  const guidance=assetProductionGuidance(plan);
  assert.match(guidance,/VIBE AUTOMATIC GAME ASSET BINDING/);
  assert.match(guidance,/NATIVE_SOURCE_BINDING_REQUIRED/);
  assert.match(guidance,/FLOW-DRIVEN ASSET REQUIREMENTS/);
  assert.match(guidance,/FLOW-DRIVEN ASSET LOADOUT/);
  assert.match(guidance,/최신 company-asset-library\.json/);
  assert.match(guidance,/gameplay\/balance\/progression\/save\/network 권한을 갖지 않는다/);
});


// 전체 자산 선택과 같은 버전 내 실제 소스 변경 회귀 검증.
test('Unity and Web retain every active family atom and share exact selection identity',()=>{
  const make=target=>buildVibeAssetProductionPlan({repoRoot:process.cwd(),target,task:{gameId:'library-cycle-demo',target,goal:'기존 게임 내부 라이브러리 연결과 반복 개선'}}).baseMaterialLoadout;
  const unity=make('unity'),web=make('web');
  const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  assert.deepEqual(unity.families,web.families);
  assert.equal(unity.selectionFingerprint,web.selectionFingerprint);
  assert.equal(unity.libraryVersion,registry.version);
  assert.match(unity.selectionFingerprint,/^[a-f0-9]{64}$/);
  for(const [family,atoms] of Object.entries(unity.families)){
    assert.ok(atoms.length>3,'인위적인 3개 제한이 남음: '+family);
    assert.ok(atoms.every(atom=>registry.baseMaterialLibrary.families[family].includes(atom)));
  }
});

test('selected source content changes invalidate binding without a library version change',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'asset-source-identity-'));
  try{
    fs.mkdirSync(path.join(cwd,'assets/test'),{recursive:true});
    const files=Array.from({length:10},(_,i)=>'assets/test/source-'+i+'.cs');
    for(const relative of files)fs.writeFileSync(path.join(cwd,relative),'public static GameObject Create() { return prefab; }\n');
    const order={target:'unity',gameId:'demo',assetProduction:{baseMaterialLoadout:{libraryVersion:7,selectionFingerprint:'a'.repeat(64),families:{UI:['FRAME_PANEL']}},decisions:[{type:'ui',applyFirst:{candidates:[{id:'panel',family:'UI',sourceFiles:files}]}}]}};
    const before=buildInternalAssetSourceUsageContract(order,{cwd});
    assert.equal(before.sourceCandidates[0].sourceFiles.length,10);
    assert.equal(before.selectedSourceHashes.length,10);
    assert.equal(before.selectionFingerprint,'a'.repeat(64));
    assert.equal(before.fingerprint,buildInternalAssetSourceUsageContract(order,{cwd}).fingerprint);
    fs.writeFileSync(path.join(cwd,files[9]),'public static GameObject Create() { return improvedPrefab; }\n');
    const after=buildInternalAssetSourceUsageContract(order,{cwd});
    assert.equal(after.libraryVersion,before.libraryVersion);
    assert.notEqual(after.fingerprint,before.fingerprint);
    assert.equal(after.selectedSourceHashes.filter((row,i)=>row.sha256!==before.selectedSourceHashes[i].sha256).length,1);
  }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});


// 공용 분류와 모델 파일 동기화 회귀 검증.
test('Rule5 registry organization removes authored lineage and keeps blocked sources without promotion',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'shared-asset-organization-'));
 try{
   fs.writeFileSync(path.join(root,'game-catalog.json'),JSON.stringify({games:[]}));
   const removed={id:'legacy-game-spider',packId:'legacy-game-pack',category:'CREATURE',platform:'SHARED_NATIVE_SOURCE',license:'project-original',path:'/assets/shared/spider.png',productionVerified:false};
   const blocked={id:'missing-reference',category:'ENVIRONMENT',platform:'WEB_REFERENCE',license:'CC0',path:'/assets/missing.png',corruptSource:true,catalogActive:false};
   const original={version:1,assets:[removed,blocked],externalSources:[]};
   const first=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:original,persist:false});
   assert.equal(first.registry.assets.some(row=>row.id===removed.id),false);
   const preserved=first.registry.assets.find(row=>row.id===blocked.id);
   assert.ok(preserved,'blocked metadata should remain auditable');
   assert.equal(preserved.corruptSource,true);
   assert.equal(preserved.catalogActive,false);
   assert.equal(first.registry.assets.some(row=>row.productionVerified===true),false);
   assert.equal(original.assets[0].license,'project-original','caller input remains unchanged');
   const second=synchronizeCompanyCommonAssetRegistry({repoRoot:root,registry:first.registry,persist:false});
   assert.equal(second.registry.assets.some(row=>row.id===removed.id),false);
   assert.equal(second.registry.assets.some(row=>row.productionVerified===true),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('native artifact and role-only model changes invalidate existing source synchronization',()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'shared-model-sync-'));
  try{
    fs.mkdirSync(path.join(cwd,'assets/shared'),{recursive:true});
    fs.writeFileSync(path.join(cwd,'assets/shared/model.glb'),Buffer.from([1,2,3,4]));
    fs.writeFileSync(path.join(cwd,'assets/shared/preview.png'),Buffer.from([8,9]));
    const asset={id:'model',family:'CREATURE',platform:'SHARED_NATIVE_SOURCE',license:'CC0',
      path:'/assets/shared/preview.png',sourceFiles:[],nativeArtifacts:['assets/shared/model.glb'],
      fileRoles:{models:['assets/shared/model.glb'],previews:['assets/shared/preview.png']}};
    const dynamic=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{version:7,assets:[asset]},target:'web',gameId:'demo'});
    assert.deepEqual(dynamic.familyCandidates.CREATURE[0].nativeArtifacts,asset.nativeArtifacts);
    const order={target:'web',gameId:'demo',assetProduction:{allGameDynamicLibraryBinding:dynamic,baseMaterialLoadout:{libraryVersion:7,selectionFingerprint:'a'.repeat(64)}}};
    const first=buildInternalAssetSourceUsageContract(order,{cwd});
    assert.ok(first.selectedSourcePaths.includes('assets/shared/model.glb'));
    assert.deepEqual(first.sourceCandidates[0].fileRoles.models,['assets/shared/model.glb']);
    assert.equal(first.fingerprint,buildInternalAssetSourceUsageContract(order,{cwd}).fingerprint);
    const duplicate=buildInternalAssetSourceUsageContract({...order,assetProduction:{...order.assetProduction,decisions:[{type:'enemy',applyFirst:{candidates:[{id:'model',family:'CREATURE',sourceFiles:[]}]}}]}},{cwd});
    assert.ok(duplicate.selectedSourcePaths.includes('assets/shared/model.glb'),'duplicate selection must preserve model files');
    assert.deepEqual(duplicate.sourceCandidates[0].fileRoles.models,['assets/shared/model.glb']);
    fs.writeFileSync(path.join(cwd,'assets/shared/model.glb'),Buffer.from([1,2,3,5]));
    const second=buildInternalAssetSourceUsageContract(order,{cwd});
    assert.notEqual(first.fingerprint,second.fingerprint);
    assert.equal(first.libraryVersion,second.libraryVersion);
    assert.equal(second.selectedSourceHashes.filter((row,i)=>row.sha256!==first.selectedSourceHashes[i].sha256).length,1);
    const roleOnly={...asset,nativeArtifacts:[],fileRoles:{models:['assets/shared/model.glb']}};
    const rolePlan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{version:7,assets:[roleOnly]},target:'web',gameId:'demo'});
    const roleUsage=buildInternalAssetSourceUsageContract({...order,assetProduction:{...order.assetProduction,allGameDynamicLibraryBinding:rolePlan}},{cwd});
    assert.ok(roleUsage.selectedSourcePaths.includes('assets/shared/model.glb'));
    const flowUsage=buildInternalAssetSourceUsageContract({target:'web',assetProduction:{flowAssetLoadout:{selections:[{assetId:'model',family:'CREATURE',nativeArtifacts:asset.nativeArtifacts,fileRoles:asset.fileRoles}]}}},{cwd});
    assert.ok(flowUsage.selectedSourcePaths.includes('assets/shared/model.glb'));
  }finally{fs.rmSync(cwd,{recursive:true,force:true});}
});

test('registered assets are shared by family while all original safety and platform constraints remain separate',()=>{
  const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  assert.equal(registry.internalAssetStandard.sharedOrganization.gameExclusivePacks,false);
  for(const asset of registry.assets){
    assert.equal(asset.companyCommonBase,true,asset.id);
    assert.ok(['COMPANY_COMMON_BASE','ALL_COMPATIBLE_UNITY_ROBLOX_WEB_SOURCE_REAUTHORING','ALL_COMPATIBLE_3D_GAME_GENRES'].includes(asset.reuseScope),asset.id);
    assert.notEqual(asset.gameExclusive,true,asset.id);
    assert.ok(asset.family,asset.id);
    assert.ok(asset.fileRoles,asset.id);
  }
});

function writeInspectionTriangle(root,change=()=>{}){
  const bin=Buffer.alloc(104);
  [0,0,0,2,0,0,0,1,0].forEach((v,i)=>bin.writeFloatLE(v,i*4));
  [0,0,1,0,0,1,0,0,1].forEach((v,i)=>bin.writeFloatLE(v,36+i*4));
  [0,0,1,0,0,1].forEach((v,i)=>bin.writeFloatLE(v,72+i*4));
  [0,1,2].forEach((v,i)=>bin.writeUInt16LE(v,96+i*2));
  const doc={asset:{version:'2.0'},buffers:[{byteLength:104}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:36},{buffer:0,byteOffset:72,byteLength:24},{buffer:0,byteOffset:96,byteLength:6}],accessors:[{bufferView:0,componentType:5126,type:'VEC3',count:3,min:[0,0,0],max:[2,1,0]},{bufferView:1,componentType:5126,type:'VEC3',count:3},{bufferView:2,componentType:5126,type:'VEC2',count:3},{bufferView:3,componentType:5123,type:'SCALAR',count:3}],materials:[{pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:.8}}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},indices:3,material:0}]}],nodes:[{translation:[10,3,-2],children:[1]},{mesh:0,scale:[2,2,2]}],scenes:[{nodes:[0]}],scene:0};
  change(doc,bin);
  const text=JSON.stringify(doc),json=Buffer.from(text+' '.repeat((4-Buffer.byteLength(text)%4)%4));
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const binaryHeader=Buffer.alloc(8);binaryHeader.writeUInt32LE(bin.length);binaryHeader.writeUInt32LE(0x004e4942,4);
  fs.writeFileSync(path.join(root,'triangle.glb'),Buffer.concat([header,json,binaryHeader,bin]));
  return inspectVibeSourceGlb({repoRoot:root,source:{path:'triangle.glb'}});
}

// [자동 파생 자산화] 실제 3D 원본/파생 바이트, 권리·계보·PBR 변경, 증거를 통과해야 미검증 후보만 등록한다.
test('company registry sync automatically ingests verified-byte PBR derivatives without claiming runtime pass',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'registered-derived-'));
  try{
    const sourceDir=path.join(root,'assets','shared');
    const outDir=path.join(root,'assets','generated','unity','demo','prop');
    fs.mkdirSync(sourceDir,{recursive:true});fs.mkdirSync(outDir,{recursive:true});
    const source=path.join(sourceDir,'source.glb');
    writeInspectionTriangle(root);
    fs.copyFileSync(path.join(root,'triangle.glb'),source);
    const sourceHash=createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    writeInspectionTriangle(root,doc=>{doc.materials[0].pbrMetallicRoughness.roughnessFactor=.72;});
    const derived=fs.readFileSync(path.join(root,'triangle.glb'));
    fs.writeFileSync(path.join(outDir,'asset.glb'),derived);
    fs.writeFileSync(path.join(outDir,'master.glb'),derived);
    const artifactHash=createHash('sha256').update(derived).digest('hex');
    assert.notEqual(sourceHash,artifactHash);
    const preview=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD9kAAAAASUVORK5CYII=','base64');
    fs.writeFileSync(path.join(outDir,'preview.png'),preview);
    const parent={id:'shared-source',title:'Source',family:'PROP',role:'environment-prop',
      path:'assets/shared/source.glb',sourceFiles:['assets/shared/source.glb'],
      sourceSha256:sourceHash,license:'CC0',status:'REPO_ASSET'};
    // 동일 GLB를 환경 팩/소품 팩/개별 소품이 공유해도 올바른 계열과 원본 계보를 선택해야 한다.
    const environmentPack={...parent,id:'environment-pack',family:'ENVIRONMENT',role:'',sourceFiles:['assets/shared/source.glb']};
    const genericPropPack={...parent,id:'generic-prop-pack',role:'',sourceFiles:['assets/shared/source.glb','assets/shared/unused.glb']};
    const staleProp={...parent,id:'stale-prop',sourceSha256:'f'.repeat(64)};
    const registry={version:1,assets:[environmentPack,genericPropPack,staleProp,parent],externalSources:[]};
    const provenance={sourcePath:'assets/shared/source.glb',sourceSha256:sourceHash,
      libraryParentAssetId:'shared-source',
      sourceFileImmutable:true,license:'CC0',
      transformHistory:[{kind:'PBR_ROUGHNESS_STYLE_REAUTHOR',material:'Surface',from:.8,to:.72}]};
    const evidence={version:1,assetId:'demo-prop',family:'PROP',
      generator:'assets/native-authoring/build-game-visual.py',
      sourceMesh:provenance,license:'CC0',artifactHash,
      previewHash:createHash('sha256').update(preview).digest('hex'),
      pbrMeshQa:{pass:true},internalAsset:{library:'VIBE_STUDIO_ASSET_UNIVERSE',
        state:'PREPARED_NATIVE_QA_PENDING'},
      runtimeVerificationState:'STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING',
      productionVerified:false,companyPromotionEligible:false};
    const writeEvidence=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence));
    writeEvidence();
    fs.writeFileSync(path.join(outDir,'application.json'),JSON.stringify({
      sourceMesh:provenance,masterSha256:artifactHash,
      internalAsset:{originalImmutable:true,nativeRuntimePromotionRequired:true}
    }));
    const sync=(value=registry)=>synchronizeCompanyCommonAssetRegistry({
      repoRoot:root,registry:value,persist:false,consumerGameIds:['demo']
    });
    const first=sync();
    assert.equal(first.derivedSync.inspected,1);
    assert.equal(first.derivedSync.registered,1,JSON.stringify(first.derivedSync));
    assert.equal(first.derivedSync.rejected,0);
    const added=first.registry.assets.find(row=>row.id==='derived-unity-demo-prop');
    assert.ok(added);
    assert.equal(added.parentSourceId,'shared-source');
    assert.equal(added.sourceHash,sourceHash);
    assert.equal(added.artifactHash,artifactHash);
    assert.equal(added.platform,'SHARED_MASTER');
    assert.equal(added.runtimeVerificationState,'STATIC_BLENDER_QA_PASS_NATIVE_RUNTIME_PENDING');
    assert.equal(added.productionVerified,false);
    assert.equal(added.verifiedCompanyReusable,false);
    assert.equal(added.nativeRuntimeVerified,false);
    assert.deepEqual(added.platformVariants,{});
    assert.equal(first.changedSections.includes('assets'),true);
    const second=sync(first.registry);
    assert.equal(second.derivedSync.registered,0,'unchanged source and outputs must not register twice');
    assert.equal(second.changed,false,'idempotent sync must not mutate canonical registry');
    provenance.libraryParentAssetId='environment-pack';
    writeEvidence();
    const mismatchedParent=sync();
    assert.equal(mismatchedParent.derivedSync.registered,0);
    assert.equal(mismatchedParent.derivedSync.rejected,1,'wrong family parent cannot be registered');
    provenance.libraryParentAssetId='shared-source';
    writeEvidence();
    evidence.companyPromotionEligible=true;
    writeEvidence();
    const unsafePromotion=sync();
    assert.equal(unsafePromotion.derivedSync.registered,0);
    assert.equal(unsafePromotion.derivedSync.rejected,1);
    assert.ok(!unsafePromotion.registry.assets.some(row=>row.id==='derived-unity-demo-prop'));
    evidence.companyPromotionEligible=false;
    writeEvidence();
    fs.appendFileSync(source,Buffer.from([0x20]));
    const staleParent=sync();
    assert.equal(staleParent.derivedSync.registered,0);
    assert.equal(staleParent.derivedSync.rejected,1);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// [원자적 등록] 실패 시 기존 원장 보존, 재시도 시 완전한 JSON 한 번에 반영.
test('company asset registry publish uses an exclusive lock and atomic rename',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-atomic-sync-'));
  try{
    const registryPath=path.join(root,'company-asset-library.json');
    const original=JSON.stringify({version:1,assets:[],externalSources:[]})+'\n';
    fs.writeFileSync(registryPath,original);
    fs.writeFileSync(registryPath+'.lock','other-writer');
    const blocked=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:true});
    assert.equal(blocked.changed,true);
    assert.equal(blocked.persisted,false);
    assert.ok(blocked.persistError);
    assert.equal(fs.readFileSync(registryPath,'utf8'),original,'lock failure must not overwrite canonical bytes');
    assert.equal(fs.readFileSync(registryPath+'.lock','utf8'),'other-writer');
    fs.rmSync(registryPath+'.lock');
    const committed=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:true});
    assert.equal(committed.persisted,true,committed.persistError||'');
    assert.equal(JSON.parse(fs.readFileSync(registryPath,'utf8')).version,2);
    assert.equal(fs.existsSync(registryPath+'.lock'),false);
    assert.equal(fs.readdirSync(root).some(name=>name.startsWith('company-asset-library.json.tmp-')),false);
    const next=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:true});
    assert.equal(next.changed,false,'published registry should remain idempotent');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('GLB production inspection measures transformed geometry and ground pivot for static props',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glb-spatial-'));
  try{
    const result=writeInspectionTriangle(root);
    assert.equal(result.status,'INSPECTED_RECONSTRUCTION_INPUT',JSON.stringify(result.issues));
    assert.deepEqual(result.inventory.spatial.bounds,{min:[10,3,-2],max:[14,5,-2]});
    assert.deepEqual(result.inventory.spatial.groundTranslation,[-12,-3,2]);
    assert.equal(result.inventory.spatial.triangleCount,1);
    const surface=result.inventory.spatial.geometrySurface;
    assert.equal(surface.measurement,'VISIBLE_TRIANGLES_AREA_WEIGHTED_GLTF_METERS');
    assert.equal(surface.areaSquareMeters,4);
    assert.equal(surface.triangleCount,1);
    assert.deepEqual(surface.centroidMeters.map(x=>Math.round(x*1e6)/1e6),[11.333333,3.666667,-2]);
    assert.deepEqual(surface.varianceSquareMeters.map(x=>Math.round(x*1e6)/1e6),[.888889,.222222,0]);
    assert.equal(surface.broadphaseAabbVolumeCubicMeters,0,'a triangle is not a closed volume');
    assert.equal(surface.collisionAuthority,false);
    assert.equal(surface.massDensityMeasured,false);
    assert.equal(result.runtimeVerified,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('GLB production inspection measures actual rotated surfaces and counts only visible instances',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glb-contact-'));
  try{
    const result=writeInspectionTriangle(root,d=>{
      d.nodes[1].rotation=[0,0,Math.sin(-3*Math.PI/8),Math.cos(-3*Math.PI/8)];
      d.nodes.push({mesh:0,translation:[20,3,-2],scale:[2,2,2]});
      d.scenes[0].nodes.push(2);
      d.meshes.push(structuredClone(d.meshes[0]),structuredClone(d.meshes[0]));
    });
    assert.equal(result.status,'INSPECTED_RECONSTRUCTION_INPUT',JSON.stringify(result.issues));
    const spatial=result.inventory.spatial;
    assert(Math.abs(spatial.bounds.min[1]-(3-2*Math.SQRT2))<1e-9,'empty bounding-box corners must not move ground contact');
    assert(Math.abs(spatial.groundTranslation[1]-(2*Math.SQRT2-3))<1e-9);
    assert.equal(spatial.triangleCount,2,'count visible mesh instances, excluding unattached meshes');
    assert(Math.abs(spatial.geometrySurface.areaSquareMeters-8)<1e-8,'count actual transformed visible surfaces only');
    assert.equal(spatial.geometrySurface.triangleCount,2);
    assert.equal(spatial.geometrySurface.nonTrianglePrimitives,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('GLB surface inspection rejects collinear meshes that have no renderable triangle area',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glb-degenerate-surface-'));
  try{
    const result=writeInspectionTriangle(root,(document,binary)=>{
      binary.writeFloatLE(4,24);
      binary.writeFloatLE(0,28);
      document.accessors[0].max=[4,0,0];
    });
    assert.equal(result.status,'AUTHORING_REQUIRED');
    assert(result.issues.includes('GLB_TRIANGLE_SURFACE_DEGENERATE'),JSON.stringify(result.issues));
    assert.equal(result.inventory.spatial.geometrySurface.areaSquareMeters,0);
    assert.equal(result.inventory.spatial.geometrySurface.collisionAuthority,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('GLB world bounds must fit the rendering float32 transform range',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glb-transform-range-'));
  try{
    const result=writeInspectionTriangle(root,document=>{
      document.nodes[1].scale=[3e38,3e38,3e38];
    });
    assert.equal(result.status,'AUTHORING_REQUIRED');
    assert(result.issues.includes('GLB_WORLD_TRANSFORM_FLOAT32_OVERFLOW'),JSON.stringify(result.issues));
    assert.equal(result.runtimeVerified,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('GLB production inspection rejects poisoned payloads and malformed import bindings',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glb-payload-'));
  const cases=[
    ['GLB_POSITION_DATA_INVALID',(_,b)=>b.writeFloatLE(NaN,0)],
    ['GLB_NORMAL_DATA_INVALID',(_,b)=>b.writeFloatLE(0,44)],
    ['GLB_UV_DATA_INVALID',(_,b)=>b.writeFloatLE(Infinity,72)],
    ['GLB_INDEX_DATA_INVALID',(_,b)=>b.writeUInt16LE(20,98)],
    ['GLB_POSITION_BOUNDS_MISMATCH',d=>d.accessors[0].max=[20,1,0]],
    ['GLB_NODE_HIERARCHY_INVALID',d=>d.nodes[1].children=[0]],
    ['GLB_NODE_TRANSFORM_INVALID',d=>d.nodes[1].rotation=[0,0,0,0]],
    ['GLB_MATERIAL_FACTOR_INVALID',d=>d.materials[0].pbrMetallicRoughness.roughnessFactor=2],
    ['GLB_MATERIAL_BINDING_INVALID',d=>d.meshes[0].primitives[0].material=7],
    ['GLB_UV_DATA_INVALID',d=>{d.accessors.push({...d.accessors[2],count:2});d.meshes[0].primitives[0].attributes.TEXCOORD_1=4;}],
    ['GLB_MATERIAL_TEXTURE_BINDING_INVALID',d=>d.materials[0].normalTexture={index:5}],
    ['GLB_SPARSE_MATERIALIZATION_REQUIRED',d=>d.accessors[0].sparse={count:1}],
    ['GLB_VISIBLE_GEOMETRY_REQUIRED',d=>d.scenes[0].nodes=[]]
  ];
  try{for(const [reason,change] of cases){const result=writeInspectionTriangle(root,change);assert(result.issues.includes(reason),reason+': '+JSON.stringify(result.issues));assert.notEqual(result.status,'INSPECTED_RECONSTRUCTION_INPUT');}}
  finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native asset recipe preserves explicit concept style over genre words and shares it across platforms',t=>{
  const repoRoot=tempRoot();
  t.after(()=>fs.rmSync(repoRoot,{recursive:true,force:true}));
  const task={gameId:'cozy-horror',genre:'HORROR',goal:'[PRESENTATION_PASS:ASSET_ADAPTATION] horror 바위 소품 3D 제작',assetSubject:'rock',styleFamily:'COZY'};
  for(const target of ['web','roblox','unity']){
    const plan=buildVibeAssetProductionPlan({repoRoot,target,task,manifest:{assets:[]},presetCatalog:{presets:[]}});
    const recipe=plan.nativeAuthoringExecution.dcc.executionRecipes.find(row=>row.types.includes('prop'));
    assert(recipe,target);
    const args=recipe.args;
    assert.equal(args[args.indexOf('--subject')+1],'rock');
    const style=JSON.parse(args[args.indexOf('--style-json')+1]);
    assert.equal(style.sourceStyleFamily,'COZY');
    assert.equal(style.axes.SHAPE_TEMPER,'ROUND');
    assert.equal(args[args.indexOf('--genre')+1],'HORROR');
    assert(recipe.outputs.some(value=>value.endsWith('/application.json')));
  }
});

test('actual Blender authoring preserves a styled master across platforms and exports inspected ground bounds',{skip:!process.env.VIBE2_BLENDER_BINARY,timeout:480000},()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-blender-quality-'));
  const rows=[];
  try{
    for(const [target,style,subject='rock'] of [['web','COZY'],['roblox','COZY'],['unity','COZY'],['web','LOW_POLY'],['web','COZY','crate']]){
      const folder=path.join(root,target+'-'+style+(subject==='rock'?'':'-'+subject));
      const expression={sourceStyleFamily:style,axes:{SHAPE_TEMPER:style==='COZY'?'ROUND':'SHARP',COLOR_ENERGY:'NATURAL',DAMAGE_WEAR:'LIGHT_WORN'}};
      fs.mkdirSync(folder,{recursive:true});
      try{
        const output=execFileSync(process.env.VIBE2_BLENDER_BINARY,['--background','--threads','2','--python-exit-code','1','--python','assets/native-authoring/build-game-visual.py','--','--output',folder,'--asset-id','quality-'+subject,'--profile','prop','--subject',subject,'--target',target,'--style-json',JSON.stringify(expression),'--genre','EXPLORATION'],{timeout:110000,maxBuffer:4*1024*1024,encoding:'utf8',stdio:['ignore','pipe','pipe']});
        fs.writeFileSync(path.join(folder,'authoring.log'),output);
      }catch(error){
        const diagnostic=String(error.stdout||'')+'\n'+String(error.stderr||'');
        fs.writeFileSync(path.join(folder,'authoring.log'),diagnostic);
        console.error('VIBE_GLB_AUTHORING_FAILURE='+target+'-'+style+'\n'+diagnostic.slice(-12000));
        throw error;
      }
      const inspection=inspectVibeSourceGlb({repoRoot:root,source:{path:path.relative(root,path.join(folder,'asset.glb'))}});
      assert.equal(inspection.status,'INSPECTED_RECONSTRUCTION_INPUT',JSON.stringify(inspection.issues));
      assert(Math.abs(inspection.inventory.spatial.bounds.min[1])<.001);
      const application=JSON.parse(fs.readFileSync(path.join(folder,'application.json'),'utf8'));
      assert.equal(application.masterSha256,inspection.sourceHash);
      assert(application.boundsSizeMeters.every((value,axis)=>Math.abs(value-inspection.inventory.spatial.size[axis])<1e-5),'Blender and exported GLB must measure the same actual geometry');
      const measured=inspection.inventory.spatial.geometrySurface,declared=application.geometrySurface;
      assert.equal(declared.nonAuthoritative,true);
      assert(Math.abs(measured.areaSquareMeters-declared.areaSquareMeters)<Math.max(1e-5,measured.areaSquareMeters*1e-4),'Blender and GLB surface area must match');
      assert(declared.centroidMeters.every((v,i)=>Math.abs(v-measured.centroidMeters[i])<Math.max(1e-5,Math.max(...inspection.inventory.spatial.size)*1e-4)),'Blender and GLB surface centroid must match');
      assert.equal(measured.collisionAuthority,false);
      assert.equal(application.nativeRuntimeVerified,false);
      assert.equal(application.pbrMeshQa.pass,true);
      assert.equal(application.pbrMeshQa.runtimeVerified,false);
      assert.equal(application.pbrMeshQa.normalAndUvPresent,true);
      assert.equal(application.pbrMeshQa.materialIndexValid,true);
      assert.equal(application.pbrMeshQa.materialFactorsFinite,true);
      assert.equal(application.researchApplication.hunyuan3d21.modelRan,false);
      assert.equal(application.researchApplication.hunyuan3d21.modelLicenseRegionBlocked,'SOUTH_KOREA');
      const original=inspectVibeSourceGlb({repoRoot:root,source:{path:path.relative(root,path.join(folder,'master.glb'))}});
      assert.equal(original.inventory.visibleGeometrySha256,inspection.inventory.visibleGeometrySha256);
      assert(inspection.bytes<=original.bytes);
      if(subject==='crate'){assert(application.optimization.reusedMeshCount>0);assert(inspection.bytes<original.bytes);assert(inspection.inventory.meshCount<original.inventory.meshCount);}
      assert(application.optimization.previewComparison.maxPixelError<=1e-5);
      assert.equal(application.optimization.runtimeMemoryBytes,null);
      assert.equal(application.surfaceDistribution.massModel,'UNIFORM_SURFACE_SHELL_ONLY');
      assert(Math.abs(application.surfaceDistribution.surfaceAreaM2-inspection.inventory.surfaceDistribution.surfaceAreaM2)<1e-4);
      application.surfaceDistribution.covarianceM2.forEach((v,i)=>assert(Math.abs(v-inspection.inventory.surfaceDistribution.covarianceM2[i])<1e-5));
      assert.equal(application.style.sourceStyleFamily,style);
      assert.equal(application.materials.length,inspection.inventory.materials.length);
      for(const material of application.materials){
        const actual=inspection.inventory.materials[material.sourceMaterialIndex];
        assert.equal(material.name,actual.name);
        assert.deepEqual(material.baseColorFactor,actual.baseColorFactor,'exported texture color must not be tinted again by an inactive Blender socket');
        assert.equal(material.metallicFactor,actual.metallicFactor);
        assert.equal(material.roughnessFactor,actual.roughnessFactor);
      }
      assert(application.materials.every(row=>Math.abs(row.unity.smoothness+row.web.roughness-1)<1e-6));
      assert(fs.statSync(path.join(folder,'preview.png')).size>1000);
      rows.push({target,style,subject,sha256:inspection.sourceHash,spatial:inspection.inventory.spatial,surfaceDistribution:inspection.inventory.surfaceDistribution,resourceMetrics:inspection.inventory.resourceMetrics,optimization:application.optimization});
    }
    assert.equal(new Set(rows.slice(0,3).map(row=>row.sha256)).size,1,'target export must preserve the same styled master');
    assert.notEqual(rows[0].sha256,rows[3].sha256,'explicit style must affect authored bytes');
    assert(rows[3].spatial.triangleCount<rows[0].spatial.triangleCount);
    console.log('VIBE_GLB_AUTHORING_MEASUREMENT='+JSON.stringify({nativeRuntimeVerified:false,rows}));
    fs.writeFileSync(path.join(root,'measurement.json'),JSON.stringify({nativeRuntimeVerified:false,rows},null,2)+'\n');
  }finally{
    if(process.env.RUNNER_TEMP)fs.cpSync(root,path.join(process.env.RUNNER_TEMP,'vibe2-glb-authoring-evidence'),{recursive:true});
    fs.rmSync(root,{recursive:true,force:true});
  }
});

// 형상 분할 밀도와 배치 변환이 표면 질량 모형을 왜곡하지 않는지 검증.
test('surface distribution integrates triangles independent of tessellation density',()=>{
  const triangle=[[0,0,0],[2,0,0],[0,1,0]],mid=[1,.5,0];
  const a=analyzeVibeSurfaceDistribution([triangle]);
  const b=analyzeVibeSurfaceDistribution([[triangle[0],triangle[1],mid],[triangle[0],mid,triangle[2]]]);
  assert.equal(a.surfaceAreaM2,1);
  assert.deepEqual(a.centroidMeters,[2/3,1/3,0]);
  const expected=[2/9,-1/18,0,-1/18,1/18,0,0,0,0];
  for(let i=0;i<9;i++){
    assert(Math.abs(a.covarianceM2[i]-expected[i])<1e-12);
    assert(Math.abs(a.covarianceM2[i]-b.covarianceM2[i])<1e-12);
  }
  assert.equal(a.physicalDensityKgM3,null);
  assert.equal(a.dynamicStabilityVerified,false);
  const translated=triangle.map(p=>p.map((v,i)=>v+[1e6,2e6,-1e6][i]));
  const shifted=analyzeVibeSurfaceDistribution([translated],{origin:[1e6,2e6,-1e6]});
  shifted.covarianceM2.forEach((v,i)=>assert(Math.abs(v-expected[i])<1e-12));
});

test('GLB scene geometry identity survives shared mesh reuse and changes on UV or transform edits',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'glb-resource-identity-'));
  try{
    const original=writeInspectionTriangle(root,d=>{d.meshes.push(structuredClone(d.meshes[0]));d.nodes.push({mesh:1,translation:[3,0,0]});d.scenes[0].nodes.push(2);});
    const shared=writeInspectionTriangle(root,d=>{d.nodes.push({mesh:0,translation:[3,0,0]});d.scenes[0].nodes.push(2);});
    assert.equal(original.inventory.visibleGeometrySha256,shared.inventory.visibleGeometrySha256);
    assert.equal(original.inventory.resourceMetrics.meshResources,2);
    assert.equal(shared.inventory.resourceMetrics.meshResources,1);
    assert.equal(shared.inventory.resourceMetrics.drawCalls,null);
    assert.equal(shared.inventory.surfaceDistribution.dynamicStabilityVerified,false);
    const changed=writeInspectionTriangle(root,(d,b)=>{d.nodes.push({mesh:0,translation:[3,0,0]});d.scenes[0].nodes.push(2);b.writeFloatLE(.25,72);});
    assert.notEqual(changed.inventory.visibleGeometrySha256,shared.inventory.visibleGeometrySha256);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('open-source Blender cinematic must decode the exact original GLB animation movie',
  {skip:!process.env.VIBE2_BLENDER_BINARY,timeout:240000},()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-open-source-cinematic-'));
  try{
    const args=['--background','--threads','2','--python-exit-code','1',
      '--python','assets/native-authoring/build-game-visual.py','--',
      '--output',root,'--asset-id','video-qa','--profile','prop','--subject','crate',
      '--target','web','--module','video','--motion-kind','turntable',
      '--cinematic-style','dramatic','--cinematic-quality','preview'];
    execFileSync(process.env.VIBE2_BLENDER_BINARY,args,
      {timeout:200000,encoding:'utf8',maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']});
    const file=path.join(root,'preview-motion.mp4');
    const asset=path.join(root,'asset.glb');
    const evidence=JSON.parse(fs.readFileSync(path.join(root,'evidence.json'),'utf8'));
    assert.ok(fs.statSync(file).size>1024);
    assert.equal(evidence.videoExport.actualFramesRendered,true);
    assert.equal(evidence.videoExport.sourceGlbSha256,createHash('sha256').update(fs.readFileSync(asset)).digest('hex'));
    assert.equal(evidence.videoExport.sha256,createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    assert.equal(evidence.productionVerified,false);
    assert.equal(evidence.videoExport.runtimeVerified,false);
    const probe=JSON.parse(execFileSync(process.env.VIBE2_FFPROBE_BINARY||'ffprobe',[
      '-v','error','-count_frames',
      '-show_entries','stream=codec_type,codec_name,width,height,nb_read_frames,r_frame_rate:format=duration',
      '-of','json','-i',file
    ],{timeout:30000,encoding:'utf8'}));
    const v=probe.streams.find(row=>row.codec_type==='video');
    assert.equal(probe.streams.length,1);
    assert.equal(v.codec_name,'mpeg4');
    assert.equal(v.width,320);
    assert.equal(v.height,320);
    assert.equal(Number(v.nb_read_frames),24);
    assert.equal(v.r_frame_rate,'12/1');
    assert.equal(Number(probe.format.duration),2);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('source worker validates decoded cinematic frames rather than accepting MP4 metadata alone',()=>{
  const worker=fs.readFileSync(new URL('../tools/vibe2-source-worker.mjs',import.meta.url),'utf8');
  assert.match(worker,/NATIVE_OPEN_SOURCE_VIDEO_FFPROBE_REQUIRED/);
  assert.match(worker,/NATIVE_OPEN_SOURCE_VIDEO_FRAME_DECODE_INVALID/);
  assert.match(worker,/nb_read_frames/);
  assert.match(worker,/stream\?\.codec_name!=='mpeg4'/);
  assert.match(worker,/sourceGlbSha256!==nativeArtifact\.sha256/);
});

test('native authoring reviews exported GLB material channels and never executes region-blocked model',()=>{
  const source=fs.readFileSync('assets/native-authoring/build-game-visual.py','utf8');
  assert.match(source,/pbr_mesh_qa\['pass'\]/);
  assert.match(source,/NATIVE_GLB_PBR_GEOMETRY_CHANNELS_INVALID/);
  assert.match(source,/TEXCOORD_0/);
  assert.match(source,/modelLicenseRegionBlocked.*SOUTH_KOREA/);
  assert.match(source,/modelRan.*False/);
});


// [공용 자산 회귀] 파일이 실제 소스 소비자와 연결되더라도 엔진 표시는 별도 검증한다.
test('Unity resource calls bind existing native source assets without claiming runtime verification',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-source-unity-'));
  try{
    const folder=path.join(root,'unity-games','sample','Assets');
    const resources=path.join(folder,'Resources','CompanyAssets');
    const scripts=path.join(folder,'Scripts');
    fs.mkdirSync(resources,{recursive:true});
    fs.mkdirSync(scripts,{recursive:true});
    for(const name of ['Tree','Rock']){
      fs.writeFileSync(path.join(resources,name+'.obj'),'o '+name+'\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
    }
    fs.writeFileSync(path.join(scripts,'NativeWorld.cs'),[
      'GameObject tree=Resources.Load<GameObject>("CompanyAssets/Tree");',
      'GameObject rock=BindCompanyVisual("Rock",transform,Vector3.zero,Vector3.one,Quaternion.identity);',
      'GameObject BindCompanyVisual(string id,Transform parent,Vector3 position,Vector3 scale,Quaternion rotation) {',
      ' return Resources.Load<GameObject>("CompanyAssets/"+id);',
      '}'
    ].join('\n'));
    const assets=['Tree','Rock'].map(name=>({
      id:'sample-'+name.toLowerCase(),family:'ENVIRONMENT',
      path:'unity-games/sample/Assets/Resources/CompanyAssets/'+name+'.obj',
      productionVerified:false,verifiedCompanyReusable:false
    }));
    const result=synchronizeSourceBoundAssetConsumers({
      repoRoot:root,registry:{assets},
      gameCatalog:{games:[{id:'sample',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}]}
    });
    assert.equal(result.summary.scannedGameCount,1);
    assert.equal(result.summary.boundAssetCount,2);
    assert.deepEqual(result.registry.assets.map(asset=>asset.sourceBoundConsumerGameIds),[['sample'],['sample']]);
    assert.equal(result.bindings.every(binding=>binding.mode==='PROJECT_ASSET_PATH'),true);
    assert.equal(result.bindings.every(binding=>binding.runtimeVerified===false),true);
    assert.equal(result.summary.runtimeVerifiedConsumerCount,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// [공용 자산 회귀] 원장 선언만 있는 원자는 사용으로 계산하지 않는다.
test('Roblox native asset uses are counted while unconsumed configuration atoms remain unbound',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-source-roblox-'));
  try{
    const game=path.join(root,'roblox-games','sample');
    fs.mkdirSync(path.join(game,'shared'),{recursive:true});
    fs.mkdirSync(path.join(game,'client'),{recursive:true});
    fs.writeFileSync(path.join(game,'shared','GameConfig.luau'),[
      'return {',
      '  -- STUDIO_ASSET_BINDING_BEGIN',
      '  StudioAssets = { Families = {',
      '    UI = { "FRAME_PANEL", "BUTTON_PRIMARY" },',
      '    AUDIO = { "ENV_WIND" },',
      '  } },',
      '  -- STUDIO_ASSET_BINDING_END',
      '}'
    ].join('\n'));
    fs.writeFileSync(path.join(game,'client','Game.client.luau'),[
      'local studioAssetFamilies = Config.StudioAssets.Families',
      'if hasStudioAssetAtom("FRAME_PANEL") then root.Visible=true end',
      'local wind = table.find(studioAssetFamily("AUDIO"), "ENV_WIND")',
      '-- if hasStudioAssetAtom("BUTTON_PRIMARY") then fake=true end'
    ].join('\n'));
    const registry={assets:[
      {id:'frame',family:'UI',atomId:'FRAME_PANEL'},
      {id:'unused-button',family:'UI',atomId:'BUTTON_PRIMARY'},
      {id:'wind',family:'AUDIO',atomId:'ENV_WIND'}
    ]};
    const result=synchronizeSourceBoundAssetConsumers({
      repoRoot:root,registry,
      gameCatalog:{games:[{id:'sample',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}]}
    });
    assert.deepEqual(result.bindings.map(binding=>binding.assetId).sort(),['frame','wind']);
    assert.equal(result.summary.boundAssetCount,2);
    assert.equal(result.registry.assets.find(asset=>asset.id==='unused-button').sourceBoundConsumerGameIds,undefined);
    assert.equal(result.bindings.every(binding=>binding.mode==='MANAGED_LIBRARY_IDENTITY'),true);
    assert.equal(result.summary.runtimeVerifiedConsumerCount,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// RPG 공용 UI 자산 개선은 게임 상태가 아닌 표시 전환만 다룬다.
test('shared RPG menu transition is interruptible and preserves direct interaction',()=>{
  const source=fs.readFileSync('assets/roblox/rpg-menu/RPGMenu.luau','utf8');
  const consumer=fs.readFileSync('roblox-games/daechung-rpg/shared/RPGMenu.luau','utf8');
  assert.match(consumer,/local RaceData = require\(script\.Parent:WaitForChild\("RaceData"\)\)/,'retain existing game-specific race UI');
  assert.match(consumer,/local TechTreeData = require\(script\.Parent:WaitForChild\("TechTreeData"\)\)/,'retain existing game-specific skill tree');
  const sharedModel=fs.readFileSync('assets/roblox/rpg-menu/RPGMenuModel.luau','utf8');
  const gameModel=fs.readFileSync('roblox-games/daechung-rpg/shared/RPGMenuModel.luau','utf8');
  assert.ok(sharedModel.length>0&&gameModel.length>0,'both shared and game-specific state models must remain present');
  assert.match(source,/TweenService:Create\(overlay,TweenInfo\.new\(\.18/);
  assert.match(source,/entranceTween:Cancel\(\)/);
  assert.match(source,/panelTween:Cancel\(\)/);
  assert.match(source,/panelScale.Scale=\.97/);
  assert.match(source,/panelScale.Scale=1/);
  assert.match(source,/stopEntrance\(\)\s*\n\s*opened=value/);
  assert.match(source,/if options\.onOpen then options\.onOpen\(value\)end/);
  assert.match(source,/gui\.Destroying:Connect\(function\(\)\s*\n\s*stopEntrance\(\)/);
  assert.match(consumer,/gui\.Destroying:Connect\(function\(\)\s*\n\s*stopEntrance\(\)/);
  assert.match(consumer,/entranceTween:Cancel\(\)/);
  assert.match(consumer,/panelTween:Cancel\(\)/);
});

// Shared RPG inventory labels must distinguish equipment from usable tools.
test('shared RPG inventory labels show equipped state and correct slot category',()=>{
  const source=fs.readFileSync('assets/roblox/rpg-menu/RPGMenu.luau','utf8');
  const consumer=fs.readFileSync('roblox-games/daechung-rpg/shared/RPGMenu.luau','utf8');
  assert.match(source,/b\.ItemState\.Text=row\.equipped and "착용 중" or \(row\.category=="장비" and "장비" or "도구"\)/);
  assert.match(consumer,/b\.ItemState\.Text=row\.equipped and "착용 중" or \(row\.category=="장비" and "장비" or "도구"\)/);
});

// Status-only equipment is not an actionable Roblox Tool; do not show a dead equip button.
test('shared RPG menu only offers equip action for real Tools',()=>{
  const shared=fs.readFileSync('assets/roblox/rpg-menu/RPGMenu.luau','utf8');
  const game=fs.readFileSync('roblox-games/daechung-rpg/shared/RPGMenu.luau','utf8');
  assert.match(shared,/itemAction\.Visible=row\.tool~=nil/);
  assert.match(game,/itemAction\.Visible=row\.tool~=nil/);
  assert.match(shared,/row\.tool and "배낭에서 선택한 도구야/);
  assert.match(game,/row\.tool and "배낭에서 선택한 도구야/);
});

test('Roblox native GLB usage maps exact loaded asset ID without promoting runtime verification',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'asset-native-id-consumer-'));
 try{
  const dir=path.join(root,'roblox-games','sample','server');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'Game.server.luau'),'local x = AssetService:LoadAssetAsync(AssetService, 110808635634531)\\n-- AssetService:LoadAssetAsync(AssetService, 999999999999999)\\n');
  const registry={assets:[
   {id:'shared-wolf',family:'CREATURE',robloxAssetId:'110808635634531',productionVerified:false},
   {id:'unbound-wolf',family:'CREATURE',robloxAssetId:'999999999999999',productionVerified:false}
  ]};
  const result=synchronizeSourceBoundAssetConsumers({repoRoot:root,registry,gameCatalog:{games:[{id:'sample',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'}]}});
  assert.equal(result.bindings.length,1);
  assert.equal(result.bindings[0].assetId,'shared-wolf');
  assert.equal(result.bindings[0].mode,'NATIVE_RUNTIME_LOAD_CALL');
  assert.equal(result.bindings[0].runtimeVerified,false);
  assert.deepEqual(result.registry.assets[0].sourceBoundConsumerGameIds,['sample']);
  assert.equal(result.registry.assets[1].sourceBoundConsumerGameIds,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('universal library matching includes lobby environment BGM SFX items and effects',()=>{
 const registry={assets:[]};
 const result=buildAssetSupplyDecisionSummary({target:'roblox',gameId:'demo',request:'로비 배경 BGM 효과음 아이템 날씨 파티클',registry});
 for(const family of ['BUILDING','ENVIRONMENT','PROP','UI','AUDIO','VFX','MATERIAL','WEAPON']){
  assert.ok(result.requiredFamilies.includes(family),family+' must be mapped');
 }
});

test('canonical source worker carries authorized shared GLB replacement identities',()=>{
 const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
 assert.match(worker,/row\.reason==='NEW_LIBRARY_ASSET_QUALITY_UPGRADE_CANDIDATE'/);
 assert.match(worker,/row\.automaticReplacementAuthorized===true/);
 assert.match(worker,/replacesCandidateAssetId:row\.replacesCandidateAssetId\|\|null/);
 assert.match(worker,/assetId:row\.assetId\|\|null/);
 assert.match(worker,/sourceCompatibilityAndRightsRequired:row\.sourceCompatibilityAndRightsRequired===true/);
 assert.match(worker,/nativeBuildBlockedByUnacquiredSource:/);
 assert.match(worker,/row\.registeredSourceModel\|\|null/);
 assert.match(worker,/row\.registeredSourceLicense\|\|null/);
 assert.match(worker,/sourceInspectionRequired:/);
});

test('shared asset with just one higher quality point is immediately queued for canonical replacement',()=>{
 const registry={assets:[
  {id:'old-prop',family:'PROP',role:'ITEM',consumerGameIds:['demo'],qualityScore:42,license:'CC0',masterGlb:'assets/native/old-prop.glb'},
  {id:'new-prop',family:'PROP',role:'ITEM',qualityScore:43,license:'CC0',masterGlb:'assets/native/new-prop.glb'}
 ]};
 const summary=buildAssetSupplyDecisionSummary({gameId:'demo',target:'roblox',request:'item',registry});
 const upgrade=summary.nextActions.find(row=>row.reason==='NEW_LIBRARY_ASSET_QUALITY_UPGRADE_CANDIDATE');
 assert.equal(upgrade?.assetId,'new-prop');
 assert.equal(upgrade?.replacesCandidateAssetId,'old-prop');
 assert.equal(upgrade?.registeredSourceModel,'assets/native/new-prop.glb');
 assert.equal(upgrade?.registeredSourceLicense,'CC0');
 assert.equal(upgrade?.automaticReplacementAuthorized,true);
 assert.equal(upgrade?.replacementExecution,'CANONICAL_VIBE_SOURCE_WORKER_IMMEDIATE');
 assert.equal(upgrade?.sourceCompatibilityAndRightsRequired,true);
 assert.equal(upgrade?.runtimeVerificationGranted,false);
 assert.equal(upgrade?.independentNativeRuntimeQaRequired,true);
 assert.equal(summary.runtimeVerificationGranted,false);
});

test('shared replacement preserves the current role despite a higher unrelated family score',()=>{
 const registry={assets:[
  {id:'lamp',family:'PROP',role:'LANTERN',subfamily:'LAMP',consumerGameIds:['demo'],qualityScore:42,license:'CC0',masterGlb:'assets/native/lamp.glb'},
  {id:'record',family:'PROP',role:'LORE_RECORD',subfamily:'DOCUMENT',qualityScore:99,license:'CC0',masterGlb:'assets/native/record.glb'},
  {id:'better-lamp',family:'PROP',role:'LANTERN',subfamily:'LAMP',qualityScore:43,license:'CC0',masterGlb:'assets/native/better-lamp.glb'}
 ]};
 const summary=buildAssetSupplyDecisionSummary({gameId:'demo',target:'roblox',request:'item',registry});
 const upgrade=summary.nextActions.find(row=>row.reason==='NEW_LIBRARY_ASSET_QUALITY_UPGRADE_CANDIDATE');
 assert.equal(upgrade?.assetId,'better-lamp');
 assert.equal(upgrade?.replacesCandidateAssetId,'lamp');
 const unrelatedOnly=buildAssetSupplyDecisionSummary({gameId:'demo',target:'roblox',request:'item',registry:{assets:registry.assets.slice(0,2)}});
 assert.equal(unrelatedOnly.nextActions.some(row=>row.reason==='NEW_LIBRARY_ASSET_QUALITY_UPGRADE_CANDIDATE'),false);
});

test('shared replacement cannot exchange a UI panel for a higher scored intro',()=>{
 const summary=buildAssetSupplyDecisionSummary({gameId:'demo',target:'roblox',request:'ui',registry:{assets:[
  {id:'panel',family:'UI',role:'READABLE_PANEL',subfamily:'FRAME_PANEL',consumerGameIds:['demo'],qualityScore:42,license:'project-original'},
  {id:'intro',family:'UI',subfamily:'INTRO',qualityScore:99,license:'project-original'}
 ]}});
 assert.equal(summary.nextActions.some(row=>row.reason==='NEW_LIBRARY_ASSET_QUALITY_UPGRADE_CANDIDATE'),false);
});

test('higher quality eligible shared asset beats lower quality with more role matches',()=>{
 const registry={assets:[
  {id:'current-prop',family:'PROP',role:'item',consumerGameIds:['demo'],qualityScore:42,license:'CC0',masterGlb:'assets/native/current-prop.glb'},
  {id:'two-role-prop',family:'PROP',role:'item',tags:['loot'],qualityScore:43,license:'CC0',masterGlb:'assets/native/two-role-prop.glb'},
  {id:'high-quality-prop',family:'PROP',role:'item',qualityScore:44,license:'CC0',masterGlb:'assets/native/high-quality-prop.glb'}
 ]};
 const summary=buildAssetSupplyDecisionSummary({gameId:'demo',target:'roblox',request:'item loot',requirements:[{family:'PROP',roles:['item','loot']}],registry});
 const upgrade=summary.nextActions.find(row=>row.reason==='NEW_LIBRARY_ASSET_QUALITY_UPGRADE_CANDIDATE');
 assert.equal(upgrade?.assetId,'high-quality-prop');
 assert.equal(upgrade?.replacesCandidateAssetId,'current-prop');
 assert.equal(upgrade?.runtimeVerificationGranted,false);
});

test('detailed design candidates enter canonical binding targets only with verified rights',()=>{
  const source=fs.readFileSync('tools/vibe2-asset-production-plan.mjs','utf8');
  assert.ok(source.includes('const detailedBindingTargets=freezeList('));
  assert.ok(source.includes('automaticBindingTargets.push(...detailedBindingTargets)'));
  assert.ok(source.includes('asset?.productionVerified===true&&asset?.rightsPass===true'));
  assert.ok(source.includes('automaticReplacementAuthorized:false'));
  assert.ok(source.includes('roleAndPlatformRevalidationRequired:true'));
  assert.ok(source.includes('masterUpgradeReviewRequired'));
  assert.ok(source.includes('glbMasterUpgradeCount:'));
  assert.ok(source.includes('glbAppliedVersionProvenanceRequiredCount:'));
  assert.ok(source.includes('currentMasterGlbHash'));
  assert.ok(source.includes('consumerAppliedMasterHash'));
  assert.ok(source.includes('existingSelectionKeys.has(row.assetId)'));
});

test('GLB adoption without applied master hash remains provenance required, not runtime QA',()=>{
  const source=fs.readFileSync('tools/vibe2-asset-production-plan.mjs','utf8');
  assert.ok(source.includes("masterUpgradeProvenanceRequired?'SOURCE_BINDING_PROVENANCE_REQUIRED'"));
  assert.ok(source.includes("status==='SOURCE_BINDING_PROVENANCE_REQUIRED'"));
  assert.ok(source.includes('glbAppliedVersionProvenanceRequiredCount:'));
});

// [공용 외부 원본] 다운로드한 CC0 모델은 게임 요구 역할에 자동 연결하고, 네이티브 변환/QA는 분리한다.
test('downloaded shared CC0 originals auto-connect to game sourcing without bypassing native QA',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'shared-source-'));
  try{
    const sourcePath='assets/external/simple-rpg/priority-v1/medieval-house-a.zip';
    const full=path.join(root,sourcePath);
    fs.mkdirSync(path.dirname(full),{recursive:true});
    const sourceBytes=Buffer.concat([Buffer.from('PK\\x03\\x04'),Buffer.alloc(700,17)]);
    fs.writeFileSync(full,sourceBytes);
    const sourceHash=createHash('sha256').update(sourceBytes).digest('hex');
    const archive={file:'medieval-house-a.zip',sourcePath,role:'04-npc-buildings',
      sha256:sourceHash,bytes:sourceBytes.length,
      sourceUrl:'https://opengameart.org/sites/default/files/medieval-house.zip',
      licenseEvidenceUrl:'https://opengameart.org/content/medieval-house',
      licenseDeclared:'CC0-1.0',sourceOnly:true,gameApplied:false};
    const params={gameId:'village-game',target:'roblox',request:'house building',
      requirements:[{family:'BUILDING',role:'house'}],repoRoot:root,
      registry:{assets:[],externalSources:[]}};
    const result=buildAssetSupplyDecisionSummary({...params,sharedOriginalArchives:[archive]});
    const chosen=result.nextActions.find(row=>row.family==='BUILDING');
    assert.equal(chosen.action,'ACQUIRE_ADAPT');
    assert.equal(chosen.externalAcquisition.acquisitionState,'ACQUIRED_ORIGINAL_FILES');
    assert.equal(chosen.externalAcquisition.downloaded,true);
    assert.equal(chosen.externalAcquisition.downloadUrl,null);
    assert.equal(chosen.externalAcquisition.localSourcePath,sourcePath);
    assert.equal(chosen.externalAcquisition.sourceHash,sourceHash);
    assert.equal(chosen.assetization.registerOnlyAfterActualBinaryAndLicenseAndStaticQa,true);
    assert.equal(chosen.assetization.gameSourceWorkerMayEditCentralRegistry,false);
    assert.equal(result.productionVerificationGranted,false);
    assert.equal(result.runtimeVerificationGranted,false);
    const gamePrompt=buildPrompt({target:'roblox',gameId:'village-game',goal:'house building',
      assetProduction:{assetSupplySummary:result,nativeAuthoringExecution:{enabled:false}}},
      {files:[{path:'server/Game.server.luau',content:'-- existing game source'}]});
    assert.ok(gamePrompt.includes('"sourceArchive":"assets/external/simple-rpg/priority-v1/medieval-house-a.zip"'));
    assert.match(gamePrompt,/"sourceArchiveSha256":"[0-9a-f]{64}"/);
    assert.match(gamePrompt,/"sourceArchiveAcquired":true/);
    assert.match(gamePrompt,/"nativeBuildBlockedByUnacquiredSource":false/);
    assert.match(gamePrompt,/"nativeBuildBlockedByUnadaptedArchive":true/);

    const noRole=buildAssetSupplyDecisionSummary({...params,requirements:[{family:'BUILDING',role:'castle'}],sharedOriginalArchives:[archive]});
    assert.notEqual(noRole.nextActions.find(row=>row.family==='BUILDING').action,'ACQUIRE_ADAPT','wrong object identity cannot bind by broad family alone');
    for(const blocked of [
      {...archive,licenseDeclared:'CC-BY-NC'},
      {...archive,sourcePath:'assets/external/simple-rpg/../../evil.zip'},
      {...archive,bytes:sourceBytes.length+1},
      {...archive,sha256:'not-a-real-hash'}
    ]){
      const plan=buildAssetSupplyDecisionSummary({...params,sharedOriginalArchives:[blocked]});
      assert.notEqual(plan.nextActions.find(row=>row.family==='BUILDING').action,'ACQUIRE_ADAPT');
    }
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// [제작 AI 역할 한정] 미검증/부재 원본은 HOLD로 남기고 신규 모델 제작을 예약하지 않는다.
test('Vibe game asset supply verifies and applies originals instead of scheduling new authoring',()=>{
  const plan=buildAssetSupplyDecisionSummary({gameId:'source-only-game',target:'roblox',
    request:'castle',requirements:[{family:'BUILDING',role:'castle'}],
    registry:{assets:[],externalSources:[]}});
  const action=plan.nextActions.find(row=>row.family==='BUILDING');
  assert.equal(action.action,'HOLD');
  assert.equal(action.reason,'NO_VERIFIED_EXISTING_ASSET_TO_APPLY');
  assert.equal(plan.nextActions.some(row=>row.action==='AUTHOR'),false);
  assert.equal(plan.productionVerificationGranted,false);
  const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
  assert.match(worker,/sourceArchiveSha256:/);
  assert.match(worker,/nativeBuildBlockedByUnadaptedArchive:/);
  assert.ok(!worker.includes(".filter(row=>row.action==='ACQUIRE_ADAPT'||row.action==='AUTHOR'"));
  assert.match(worker,/Only inspect, verify and apply existing company\/common or downloaded license-cleared assets/);
});


test('selected game hydrates only its missing hash-pinned source, not every archive',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-game-asset-demand-'));
  try{
    const rel='assets/external/simple-rpg/priority-v1/bee-rigged.blend';
    const item={file:'bee-rigged.blend',role:'01-insects',sourcePath:rel,
      sha256:'a'.repeat(64),bytes:1692676,sourceOnly:true,gameApplied:false,
      licenseDeclared:'CC0-1.0',
      sourceUrl:'https://opengameart.org/sites/default/files/bee_rigged_v1.1.blend',
      licenseEvidenceUrl:'https://opengameart.org/content/bee-0'};
    const summary=buildAssetSupplyDecisionSummary({
      gameId:'bees-survival',target:'roblox',request:'bee',
      requirements:[{family:'CREATURE',role:'bee'}],
      registry:{assets:[],externalSources:[]},sharedOriginalArchives:[item],repoRoot:tmp
    });
    const picked=summary.nextActions.find(row=>row.action==='ACQUIRE_ADAPT');
    assert.ok(picked,'missing LFS archive must remain selectable for the current game');
    assert.equal(picked.externalAcquisition.localSourcePath,rel);
    assert.equal(picked.externalAcquisition.downloaded,false);
    assert.equal(picked.externalAcquisition.archiveBytes,item.bytes);
    assert.equal(picked.externalAcquisition.sourceHash,item.sha256);
    assert.equal(picked.externalAcquisition.acquisitionState,'PINNED_ARCHIVE_ON_DEMAND_DOWNLOAD_REQUIRED');
    assert.equal(picked.externalAcquisition.downloadUrl,null);
    assert.equal(buildAssetSupplyDecisionSummary({
      gameId:'bees-survival',target:'roblox',request:'bee',
      requirements:[{family:'CREATURE',role:'bee'}],
      registry:{assets:[],externalSources:[]},sharedOriginalArchives:[{...item,file:'wolf-rigged.blend'}],repoRoot:tmp
    }).nextActions.some(row=>row.externalAcquisition?.localSourcePath===rel),false);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('3D game sourcing accepts only exact canonical LFS pointers and rejects corrupt binaries',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-3d-lfs-'));
  const rel='assets/external/simple-rpg/priority-v1/bee-rigged.blend';
  const full=path.join(tmp,rel);
  const expectedHash='1'.repeat(64),expectedBytes=1692676;
  const item={file:'bee-rigged.blend',role:'01-insects',sourcePath:rel,
    sha256:expectedHash,bytes:expectedBytes,sourceOnly:true,gameApplied:false,
    licenseDeclared:'CC0-1.0',
    sourceUrl:'https://opengameart.org/sites/default/files/bee_rigged_v1.1.blend',
    licenseEvidenceUrl:'https://opengameart.org/content/bee-0'};
  const run=()=>buildAssetSupplyDecisionSummary({gameId:'bees-game',target:'roblox',
    request:'bee',requirements:[{family:'CREATURE',role:'bee'}],
    registry:{assets:[],externalSources:[]},sharedOriginalArchives:[item],repoRoot:tmp})
    .nextActions.find(x=>x.family==='CREATURE');
  try{
    fs.mkdirSync(path.dirname(full),{recursive:true});
    fs.writeFileSync(full,'version https://git-lfs.github.com/spec/v1\noid sha256:'+expectedHash+'\nsize '+expectedBytes+'\n');
    let plan=run();
    assert.equal(plan.action,'ACQUIRE_ADAPT');
    assert.equal(plan.externalAcquisition.downloaded,false);
    assert.equal(plan.externalAcquisition.acquisitionState,'PINNED_ARCHIVE_ON_DEMAND_DOWNLOAD_REQUIRED');
    fs.writeFileSync(full,'version https://git-lfs.github.com/spec/v1\noid sha256:'+'2'.repeat(64)+'\nsize '+expectedBytes+'\n');
    assert.notEqual(run().action,'ACQUIRE_ADAPT','a different LFS oid cannot be trusted');
    fs.writeFileSync(full,Buffer.alloc(650,42));
    assert.notEqual(run().action,'ACQUIRE_ADAPT','damaged binary cannot become a download candidate');
    fs.writeFileSync(full,Buffer.alloc(expectedBytes,33));
    assert.notEqual(run().action,'ACQUIRE_ADAPT','same size but mismatched hash is still invalid');
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('all game-required library families include audio music UI images VFX and motion',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-all-family-demand-'));
  try{
    const base={sourceOnly:true,gameApplied:false,licenseDeclared:'CC0-1.0',
      sha256:'3'.repeat(64),bytes:1024,
      sourceUrl:'https://opengameart.org/sites/default/files/verified-pack.zip',
      licenseEvidenceUrl:'https://opengameart.org/content/verified-pack'};
    for(const [family,role,file] of [
      ['UI','item-icons','game-icons.zip'],
      ['UI','png','kenney_fantasy-ui-borders.zip'],
      ['AUDIO','music','bgm-theme.zip'],
      ['AUDIO','05-environment-sfx','rpg-sfx-95.zip'],
      ['VFX','vfx','particles.zip'],
      ['MOTION','motion','walk-cycles.zip'],
      ['MATERIAL','material','pbr-materials.zip'],
      ['SKILL','skill','magic-spells.zip']
    ]){
      const archive={...base,role,file,sourcePath:'assets/external/simple-rpg/library/'+file};
      const plan=buildAssetSupplyDecisionSummary({gameId:'all-families',target:'roblox',
        requirements:[{family}],request:family.toLowerCase(),
        registry:{assets:[],externalSources:[]},sharedOriginalArchives:[archive],repoRoot:tmp});
      const action=plan.nextActions.find(x=>x.family===family);
      assert.equal(action?.action,'ACQUIRE_ADAPT',family+' missing source must remain eligible');
      assert.equal(action.externalAcquisition.downloaded,false,family+' not yet downloaded');
      assert.equal(action.externalAcquisition.sourceHash,base.sha256);
      assert.equal(action.externalAcquisition.archiveBytes,base.bytes);
      assert.equal(action.externalAcquisition.acquisitionState,'PINNED_ARCHIVE_ON_DEMAND_DOWNLOAD_REQUIRED');
      assert.equal(plan.productionVerificationGranted,false);
    }
    // Direct media originals are eligible too; downloads are not ZIP-only.
    for(const [family,role,file] of [
      ['AUDIO','music','ambient-music.ogg'],['AUDIO','sfx','click.wav'],
      ['UI','ui','hud-icon.png'],['UI','interface','layout.svg'],
      ['VFX','vfx','impact-sparks.webp'],
      ['SKILL','skill','fireball-icon.png'],
      ['MATERIAL','material','stone-texture.png'],
      ['MOTION','motion','sprite-animation.png']
    ]){
      const archive={...base,role,file,sourcePath:'assets/external/simple-rpg/library/'+file};
      const plan=buildAssetSupplyDecisionSummary({gameId:'all-media',target:'roblox',
        requirements:[{family}],request:family.toLowerCase(),
        registry:{assets:[],externalSources:[]},sharedOriginalArchives:[archive],repoRoot:tmp});
      assert.equal(plan.nextActions.find(x=>x.family===family)?.action,'ACQUIRE_ADAPT',file);
    }
    const worker=fs.readFileSync('tools/vibe2-source-worker.mjs','utf8');
    assert.ok(!worker.includes('spatial3dFamilies.has(clean(row.family)'));
    assert.ok(!worker.includes('row?.externalAcquisition?.sourceFileMustBeReal3d===true'));
    assert.match(worker,/plainGitMissing\.has\(rel\)/);
    assert.match(worker,/VIBE2_SELECTED_ASSET_DOWNLOAD/);
    assert.match(worker,/BLOCKED_INVALID_SOURCE/);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test('web UI source consumers register actual company assets and invalidate removed bindings',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'web-ui-company-assets-'));
  try{
    const web=path.join(root,'web-games','ui-demo');
    const assets=path.join(root,'assets');
    fs.mkdirSync(web,{recursive:true});
    fs.mkdirSync(assets,{recursive:true});
    fs.mkdirSync(path.join(web,'assets'),{recursive:true});
    fs.writeFileSync(path.join(web,'assets','local-frame.png'),'owned-fixture');
    for(const file of ['nine-frame.png','damage-icon.png','unused-icon.png'])
      fs.writeFileSync(path.join(assets,file),'owned-fixture');
    const registry={version:1,assets:[
      ...['nine-frame.png','damage-icon.png','unused-icon.png'].map(file=>({
        id:file,family:'UI',license:'project-original',platform:'WEB',
        path:'assets/'+file,sourceFiles:['assets/'+file]
      })),
      {id:'local-frame.png',family:'UI',license:'project-original',platform:'WEB',
        path:'web-games/ui-demo/assets/local-frame.png',sourceFiles:['web-games/ui-demo/assets/local-frame.png']}
    ]};
    const catalog={games:[{
      id:'ui-demo',lifecycleState:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED',
      webPath:'web-games/ui-demo'
    }]};
    const html=path.join(web,'index.html');
    fs.writeFileSync(html,`<!doctype html><style>
      .panel{border-image-source:url("/assets/nine-frame.png")}
      </style><img alt="damage" src="/assets/damage-icon.png">
      <img alt="local" src="./assets/local-frame.png">
      <!-- <img src="/assets/unused-icon.png"> -->
      <script>// const icon="/assets/unused-icon.png";
      </script>`);
    const first=synchronizeSourceBoundAssetConsumers({repoRoot:root,registry,gameCatalog:catalog});
    for(const id of ['nine-frame.png','damage-icon.png','local-frame.png']){
      assert.deepEqual(first.registry.assets.find(row=>row.id===id).sourceBoundConsumerGameIds,['ui-demo']);
      const row=first.bindings.find(row=>row.assetId===id);
      assert.equal(row.mode,'PROJECT_ASSET_PATH');
      assert.equal(row.runtimeVerified,false,'static asset linkage is not a runtime PASS');
      assert.ok(row.evidenceFiles.includes('web-games/ui-demo/index.html'));
    }
    assert.equal(first.registry.assets.find(row=>row.id==='unused-icon.png').sourceBoundConsumerGameIds,undefined);
    fs.writeFileSync(html,`<!doctype html><style>/* url('/assets/nine-frame.png') */</style>
      <!-- <img src="/assets/damage-icon.png"> --><script>// icon='/assets/damage-icon.png';</script>
      <!-- <img src="./assets/local-frame.png"> -->`);
    const stale=synchronizeSourceBoundAssetConsumers({repoRoot:root,registry:first.registry,gameCatalog:catalog});
    assert.equal(stale.registry.assets.find(row=>row.id==='nine-frame.png').sourceBoundConsumerGameIds,undefined);
    assert.equal(stale.registry.assets.find(row=>row.id==='damage-icon.png').sourceBoundConsumerGameIds,undefined);
    assert.equal(stale.registry.assets.find(row=>row.id==='local-frame.png').sourceBoundConsumerGameIds,undefined);
    assert.ok(stale.relations.some(row=>row.assetId==='nine-frame.png'&&row.classification==='STALE_SOURCE_BINDING'));
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// [연습 제작물] 라이선스 표기가 있어도 연습 결과는 게임 자산으로 사용하지 않는다.
test('practice artifacts cannot become game acquisition candidates or be promoted by worker guidance',async()=>{
  const {createVibeAssetAcquisitionPlan}=await import('../assets/vibe-art-pipeline.js');
  for(const marker of [{practiceOnly:true},{practiceArtifact:true},{authority:'PRACTICE_ONLY'}]){
    const practice={id:'practice',license:'CC0',...marker};
    const plan=createVibeAssetAcquisitionPlan({companyAssets:[practice],externalAssets:[{id:'original',license:'CC0'}]});
    assert.deepEqual(plan.candidates.map(asset=>asset.id),['original']);
  }
  const guidance=assetProductionGuidance({kind:'vibe2-asset-production-plan'});
  assert.match(guidance,/연습 종료 후/);
  assert.match(guidance,/라이브러리 승격·재사용 금지/);
});

// [등록 재생 방지] 기존 원장 동기화는 자체 제작물·연습물을 게임 공급 원장에 남기지 않는다.
test('common library synchronization removes self authored and practice records while retaining CC0 originals',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'library-removal-'));
 try{
  const result=synchronizeCompanyCommonAssetRegistry({repoRoot:root,persist:false,registry:{version:1,
   assets:[{id:'self',license:'project-original'},{id:'practice',license:'CC0',practiceOnly:true},
    {id:'external',license:'CC0',sourceUrl:'https://example.org/original'}],externalSources:[]}});
  assert.deepEqual(result.registry.assets.map(asset=>asset.id),['external']);
  assert.deepEqual(result.sourceConsumerRegistry.assets.map(asset=>asset.id),['external']);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('commercial rights and public-domain labels cannot bypass CC0-only external acquisition on any native target',()=>{
 const base={id:'candidate',name:'Building Kit',category:'BUILDING',status:'LICENSE_VERIFIED_EXTERNAL_CANDIDATE',
  sourceUrl:'https://example.invalid/buildings',licenseEvidenceUrl:'https://example.invalid/license',verifiedAt:'2026-10-21',
  platformTargets:['WEB','ROBLOX','UNITY'],automaticAcquisitionWhenSelected:true,commercialUseAllowed:true,derivativesAllowed:true,capabilities:['house','GLB']};
 for(const target of ['web','roblox','unity'])for(const license of ['CC0','CC0-1.0','MIT','CC-BY','PUBLIC-DOMAIN','project-original']){
  const plan=buildAssetSupplyDecisionSummary({gameId:'demo',target,request:'building house',requirements:[{family:'BUILDING',role:'house'}],registry:{assets:[],externalSources:[{...base,license}]}});
  const acquired=plan.nextActions.find(row=>row.family==='BUILDING')?.externalAcquisition?.sourceId==='candidate';
  assert.equal(acquired,['CC0','CC0-1.0'].includes(license),target+':'+license);
 }
});

test('expanded official CC0 supply is available as Web candidates without claiming download or native runtime verification',()=>{
 const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
 const ids=['kenney-survival-kit','kenney-pirate-kit','kenney-animated-characters-survivors','quaternius-fantasy-props-megakit','ambientcg-cc0-materials'];
 for(const id of ids){
  const row=registry.externalSources.find(row=>row.id===id);assert.ok(row,id);
  assert.match(row.license,/^CC0/);assert.ok(row.platformTargets.includes('WEB'));
  assert.ok(row.licenseEvidenceUrl.startsWith('https://'));assert.equal(row.runtimeVerified,false);
  assert.equal(row.acquisitionState,'CANDIDATE_METADATA_ONLY_UNTIL_SELECTED');
 }
 const motion=registry.externalSources.find(row=>row.id==='quaternius-universal-animation-library');
 assert.ok(motion.platformTargets.includes('WEB'),'existing motion supply must no longer exclude Web');
 const plan=buildAssetSupplyDecisionSummary({gameId:'demo',target:'web',request:'food kitchen',requirements:[{family:'PROP',role:'food'}],registry:{assets:[],externalSources:registry.externalSources.filter(row=>row.id==='kenney-food-kit')}});
 const supply=plan.nextActions.find(row=>row.family==='PROP').externalAcquisition;
 assert.equal(supply.sourceId,'kenney-food-kit');assert.equal(plan.runtimeVerificationGranted,false);assert.equal(supply.downloaded,false);
 for(const row of registry.externalSources.filter(row=>row.gameUseForbidden))assert.equal(row.automaticAcquisitionWhenSelected,false);
});

test('existing build-up guidance exposes verified library roles and missing-role review without claiming binding',()=>{
  const handoff={
    gameId:'insect-survival',target:'WEB',authorized:true,status:'EXISTING_ASSET_PRODUCTION_HANDOFF_REQUIRED',
    roles:['CREATURE','PROP'],designFingerprint:'sha256:'+'a'.repeat(64),
    applicationOrder:['REUSE_VERIFIED_LIBRARY','DERIVE_APPROVED_NATIVE_VARIANT','EXACT_RUNTIME_QA'],
    roleAssetCoverage:[
      {role:'CREATURE',verifiedSourceCount:1,reusableSourceIds:['licensed-insect'],status:'VERIFIED_LIBRARY_CANDIDATE_AVAILABLE',actualGameBindingVerified:false,nativeRuntimeVerified:false},
      {role:'PROP',verifiedSourceCount:0,reusableSourceIds:[],status:'VERIFIED_SOURCE_GAP_REVIEW_REQUIRED',actualGameBindingVerified:false,nativeRuntimeVerified:false}
    ],
    missingVerifiedSourceRoles:['PROP'],
    references:[{id:'BLENDER',kind:'AUTHORING_TOOL',roles:['CREATURE'],responsibleOwner:'existing-native-asset-tool',
      integration:'REVIEWED_NATIVE_3D_AUTHORING',sourceUrl:'https://www.blender.org/',status:'EXTERNAL_TOOL_AUTHORIZATION_AND_LOCAL_AVAILABILITY_REQUIRED',
      sourceCandidates:[],nextAction:'VERIFY_TOOL_LICENSE_BINARY_AND_SOURCE_IN_EXISTING_ASSET_DEVELOPMENT'}]
  };
  const guidance=assetProductionGuidance({kind:'vibe2-asset-production-plan',externalCustomization:handoff});
  assert.match(guidance,/roleAssetCoverage/);
  assert.match(guidance,/missingVerifiedSourceRoles/);
  assert.match(guidance,/licensed-insect/);
  assert.match(guidance,/VERIFIED_SOURCE_GAP_REVIEW_REQUIRED/);
  assert.match(guidance,/EXACT_RUNTIME_QA/);
});

test('verified CC0 source candidates from every existing library family receive light adaptation recipes, without fake application',()=>{
  const families=['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','SKILL','MATERIAL','AUDIO','VFX','UI','MOTION','PROP'];
  const spatial=new Set(['CHARACTER','CREATURE','BUILDING','ENVIRONMENT','WEAPON','PROP']);
  const assets=families.map((family,index)=>({
    id:'cc0-'+family.toLowerCase(),family,platform:'SHARED',
    license:'CC0-1.0',path:'assets/shared/'+family.toLowerCase()+(spatial.has(family)?'.glb':'.json'),
    sourceHash:'a'.repeat(64),sourceUrl:'https://example.org/cc0',
    licenseEvidenceUrl:'https://example.org/cc0/license',
    verifiedCompanyReusable:false
  }));
  const withBlocked=[...assets,
    {...assets[0],id:'non-cc0',license:'CC-BY-NC'},
    {...assets[1],id:'practice-only',practiceOnly:true},
    {...assets[2],id:'quarantine',quarantined:true}];
  for(const target of ['web','roblox','unity']){
    const plan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{version:777,assets:withBlocked},target,gameId:'cc0-demo'});
    assert.equal(plan.allLibraryFamiliesLightAdaptationCovered,true);
    assert.equal(plan.compatibleCandidateCount,12);
    for(const family of families){
      const row=plan.familyCandidates[family].find(x=>x.assetId==='cc0-'+family.toLowerCase());
      assert.ok(row, target+' '+family);
      assert.equal(row.cc0LightAdaptation.sourceState,'DERIVATIVE_INPUT_CANDIDATE');
      assert.ok(row.cc0LightAdaptation.transforms.length>=2);
      assert.equal(row.cc0LightAdaptation.sourceOriginalImmutable,true);
      assert.equal(row.cc0LightAdaptation.actualSourceBytesSha256Required,true);
      assert.equal(row.cc0LightAdaptation.productionVerified,false);
      assert.equal(row.cc0LightAdaptation.gameBindingVerified,false);
      assert.equal(row.cc0LightAdaptation.gameApplied,false);
    }
    for(const id of ['non-cc0','practice-only','quarantine']){
      assert.equal(plan.evaluatedAssets.find(x=>x.assetId===id).eligibleForRoleEvaluation,false);
    }
  }
});

test('CC0 adaptation never promotes unpinned or unlicensed provenance to usable gameplay asset',()=>{
  const assets=[
    {id:'no-hash',family:'UI',platform:'SHARED',license:'CC0',path:'assets/icons/ui.svg'},
    {id:'no-rights-url',family:'UI',platform:'SHARED',license:'CC0',path:'assets/icons/effect.svg',sourceHash:'b'.repeat(64)},
    {id:'native-transfer',family:'UI',platform:'UNITY',license:'CC0',path:'assets/icons/common.svg',
      sourceHash:'c'.repeat(64),sourceUrl:'https://example.org/source',
      licenseEvidenceUrl:'https://example.org/license'}
  ];
  const plan=buildAllGameDynamicLibraryBindingPlan({companyRegistry:{assets},target:'roblox',gameId:'demo'});
  const get=id=>plan.familyCandidates.UI.find(x=>x.assetId===id).cc0LightAdaptation;
  assert.equal(get('no-hash').sourceState,'SOURCE_SHA256_REVERIFY_REQUIRED');
  assert.equal(get('no-rights-url').sourceState,'RIGHTS_EVIDENCE_REVERIFY_REQUIRED');
  assert.equal(get('native-transfer').sourceState,'DERIVATIVE_INPUT_CANDIDATE');
  assert.equal(get('native-transfer').nativePlatformReauthoringRequired,true);
  assert.ok([get('no-hash'),get('no-rights-url'),get('native-transfer')].every(x=>!x.productionVerified&&!x.gameApplied));
});


// [CC0 권리 증거 회귀] 원장 표기만으로 사용 완료를 허용하지 않으며 비검증 원본은 계속 차단한다.
test('registered CC0 native sources retain verifiable official rights URLs and hashes before adaptation handoff',()=>{
  const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const eligible=registry.assets.filter(asset=>asset.corruptSource!==true);
  const blocked=registry.assets.filter(asset=>asset.corruptSource===true);
  assert.ok(eligible.length>=106);
  for(const asset of eligible){
    assert.match(asset.license,/^CC0(?:-1\\.0)?$/);
    assert.match(asset.sourceUrl||'',/^https:\/\//);
    assert.match(asset.licenseEvidenceUrl||'',/^https:\/\//);
    assert.match(asset.editableSourceHash||asset.sourceHash||asset.sourceSha256||asset.masterGlbHash||asset.masterGlbSha256||'',/^[a-f0-9]{64}$/i);
  }
  for(const asset of blocked){
    assert.equal(Boolean(asset.licenseEvidenceUrl),false,'do not falsely validate stale source '+asset.id);
  }
  assert.ok(registry.version>=141);
});
