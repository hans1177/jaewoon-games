import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRobloxProductionPlan,robloxProductionPromptLines,ROBLOX_PRODUCTION_PROFILES} from '../tools/company-roblox-production-plan.mjs';
import {buildGameSpecificBuildUpDirective,directivePrompt} from '../tools/company-build-up-directive.mjs';

const central=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
const policy=central.robloxStudioProductionFlowContract;
const files=['roblox-games/garden/server/Game.server.luau','roblox-games/garden/client/Game.client.luau','roblox-games/garden/shared/Definitions.luau'];
const source={sourceTreeFingerprint:'fixture-source',signals:{},observations:[],sourceAnchors:[],topFiles:files.map(file=>({file,score:10}))};
const design={identity:'정원 생태와 서식지 선택',genre:'DEFENSE',coreLoop:['침입 경로 관찰','서식지 배치','웨이브 대응','새 서식지 선택'],signatureSystems:[{name:'서식지 상성',purpose:'공간별 역할',playerChoice:'배치 선택'}],progressionDirection:'기존 정원에서 다음 서식지 해금'};
const make=overrides=>buildRobloxProductionPlan({gameId:'garden',platform:'ROBLOX',design,source,responsibleFiles:files,focus:'CORE_FUN',policy,...overrides});

// WEB 요청도 별도 브라우저 소스가 아니라 같은 Unity C# 정본의 WebGL 실행면으로 연결한다.
test('Unity and Web production plans preserve genre, owner intent and canonical Unity source responsibility',()=>{
  for(const platform of ['UNITY','UNITY_WEB','WEB']){
    const root='unity-games/garden';
    const own=[root+'/Assets/Scripts/GameCore.cs',root+'/Assets/Scripts/RuntimeBootstrap.cs',root+'/Assets/Prefabs/Garden.prefab'];
    const observed={...source,sourceRoot:root,topFiles:own.map(file=>({file,score:10}))};
    const plan=make({platform,source:observed,responsibleFiles:[...own,...files],design:{...design,ownerFeatureChanges:[{requestId:'owner-x',featureId:'shop',action:'REMOVE',requirement:'상점 제거'}]}});
    assert.equal(plan.platform,'UNITY');assert.equal(plan.genreProfile,'DEFENSE');
    assert.equal(plan.executionSurface,platform==='UNITY'?'UNITY':'UNITY_WEB');
    assert.deepEqual(plan.implementationPackages.flatMap(x=>x.files).sort(),own.sort());
    assert.equal(plan.qualityContract.runtimeVerified,false);
    assert.equal(plan.qualityContract.markerOnlyCompletionAllowed,false);
    assert.equal(plan.qualityContract.canonicalGameplaySource,'UNITY_CSHARP_SCENE_PREFAB_AND_ASSET_BINDINGS');
    assert.equal(plan.qualityContract.browserGameplaySourceAllowed,false);
    assert.match(plan.qualityContract.runtimeSurface,platform==='UNITY'?/UNITY_NATIVE/:/UNITY_WEBGL/);
    const presentation=make({platform,source:observed,responsibleFiles:own,focus:'PRESENTATION'});
    assert.equal(presentation.contentRule,'PRESENT_EXISTING_BEHAVIOR_ONLY');
    assert.ok(presentation.implementationPackages.every(x=>x.implementation.includes('게임 상태·보상·저장 의미는 유지')));
    const safe=make({platform,source:observed,responsibleFiles:own,safeDesignlessMode:true});
    assert.equal(safe.contentRule,'REPAIR_EXISTING_BEHAVIOR_ONLY');
    assert.match(robloxProductionPromptLines(plan).join('\n'),/OWNER=.*owner-x/);
  }

  const browserRoot='web-games/garden';
  const browserFiles=[browserRoot+'/index.html',browserRoot+'/game.js',browserRoot+'/style.css'];
  const browserOnly=make({
    platform:'WEB',
    source:{...source,sourceRoot:browserRoot,topFiles:browserFiles.map(file=>({file,score:10}))},
    responsibleFiles:browserFiles
  });
  assert.equal(browserOnly,null);
});

test('Unity Web directive uses the real canonical C# project instead of browser source instructions',()=>{
  const root='unity-games/garden',own=[root+'/Assets/Scripts/GameCore.cs',root+'/Assets/Scripts/RuntimeBootstrap.cs'];
  const d=buildGameSpecificBuildUpDirective({gameId:'garden',platform:'WEB',sourceRoot:root,designRecord:{content:design},sourceObservation:{...source,topFiles:own.map(file=>({file,score:10}))},responsibleFiles:own});
  assert.equal(d.productionPlan.platform,'UNITY');assert.equal(d.productionPlan.executionSurface,'UNITY_WEB');
  assert.equal(d.webDevelopmentPolicy.policy,'UNITY_WEBGL_CSHARP_CANONICAL_ONLY');
  assert.equal(d.webDevelopmentPolicy.canonicalSourceRoot,'unity-games/garden');
  assert.equal(d.webDevelopmentPolicy.browserGameplaySourceAllowed,false);
  assert.equal(d.robloxProductionPlan,null);
  assert.match(directivePrompt(d),/UNITY_PRODUCTION_QUALITY=.*EXISTING_CSHARP/);
  assert.match(d.platformAdaptationDirectives.WEB,/unity-games\/<gameId>\/.*Unity C#/);
  assert.doesNotMatch(d.platformAdaptationDirectives.WEB,/DOM\/Canvas|WebAudio/);
  assert.doesNotMatch(directivePrompt(d),/WEB_PRODUCTION_FILES=/);
});

test('approved genre produces distinct implementation choices instead of a shared combat template',()=>{
  const actions=new Set(),ideas=new Set();
  for(const profile of ROBLOX_PRODUCTION_PROFILES){
    const plan=make({design:{...design,genre:profile.id}});
    assert.equal(plan.genreProfile,profile.id);
    assert.equal(plan.conceptIdentity,design.identity);
    assert.deepEqual(plan.approvedCoreLoop,design.coreLoop);
    actions.add(plan.coreAction);ideas.add(plan.selectedIdea.implementation);
    assert.equal(plan.ideas.length,3);
    assert.equal(plan.newWorkflow,false);assert.equal(plan.newQaStage,false);
    assert.equal(plan.implementationStatus,'PLANNED_NOT_IMPLEMENTED');
  }
  assert.equal(actions.size,13);assert.equal(ideas.size,13);
  assert.deepEqual([...policy.supportedGenres].sort(),ROBLOX_PRODUCTION_PROFILES.map(x=>x.id).sort());
});

test('unknown explicit genre uses its approved loop without inventing combat or changing genre',()=>{
  const plan=make({design:{...design,genre:'MUSIC_PERFORMANCE',identity:'무대 위 리듬 이야기'}});
  assert.equal(plan.genreProfile,'DESIGN_DEFINED');
  assert.equal(plan.ideas.length,1);
  assert.equal(plan.systemConnection,design.coreLoop.join(' → '));
  assert.equal(make({design:{...design,genre:'롤플레잉'}}).genreProfile,'RPG');
});

test('successful iterations cover compatible ideas and causal repair retains the failing idea',()=>{
  const first=make(),second=make({previousPlan:first}),third=make({previousPlan:second});
  assert.equal(new Set([first,second,third].map(x=>x.selectedIdea.id)).size,3);
  const repair=make({previousPlan:second,repair:true});
  assert.equal(repair.selectedIdea.id,second.selectedIdea.id);
  const next=make({previousPlan:third});
  assert.notEqual(next.selectedIdea.id,third.selectedIdea.id);
  assert.deepEqual(make(),first);
});

test('presentation and designless repairs cannot grow gameplay or demand unrelated server work',()=>{
  const presentation=make({focus:'PRESENTATION'});
  assert.equal(presentation.contentRule,'PRESENT_EXISTING_BEHAVIOR_ONLY');
  assert.ok(presentation.implementationPackages.every(x=>x.role!=='SERVER_AUTHORITY'));
  for(const focus of ['PRESENTATION','STABILITY']){
    const safe=make({focus,safeDesignlessMode:true});
    assert.equal(safe.contentRule,'REPAIR_EXISTING_BEHAVIOR_ONLY');
    assert.equal(safe.ideas.length,1);
    assert.match(safe.selectedIdea.distinction,/추가하지/);
  }
});

test('handoff binds actual same-game sources and filters each worker to its owned file',()=>{
  const plan=make({responsibleFiles:[...files,'roblox-games/other/server/Game.server.luau','roblox-games/garden/../other.luau','unity-games/garden/Game.cs']});
  assert.deepEqual(plan.implementationPackages.flatMap(x=>x.files).sort(),[...files].sort());
  const lines=robloxProductionPromptLines(plan,{responsibleFiles:['client/Game.client.luau']});
  const mapped=JSON.parse(lines.find(x=>x.startsWith('ROBLOX_PRODUCTION_FILES=')).split('=').slice(1).join('='));
  assert.deepEqual(mapped.flatMap(x=>x.files),[files[1]]);
  assert.match(lines.join('\n'),/allowed write scope/);
});

test('central policy enables the real BUILD_UP directive and prompt with no new workflow or unlock',()=>{
  const d=buildGameSpecificBuildUpDirective({gameId:'garden',platform:'ROBLOX',designRecord:{content:{...design,genre:undefined,robloxBuildProfile:{genre:'DEFENSE'}}},sourceObservation:source,responsibleFiles:files});
  assert.equal(d.robloxProductionPlan.genreProfile,'DEFENSE');
  assert.match(directivePrompt(d),/ROBLOX_PRODUCTION_IDEA=/);
  assert.match(directivePrompt(d),/서식지 상성/);
  assert.equal(central.finalDevelopmentLock.version,2);
  assert.equal(central.finalDevelopmentLock.status,'LOCKED');
  assert.equal(policy.newQaStage,false);
  assert.equal(policy.newApprovalStage,false);
  assert.equal(central.directNativeDualPlatformDevelopment.unityWebDevelopmentLane.webGameDevelopmentPolicy,'UNITY_WEBGL_CSHARP_CANONICAL_ONLY');
  assert.equal(central.directNativeDualPlatformDevelopment.unityWebDevelopmentLane.htmlCssJsGameplaySourceForbidden,true);
  assert.equal(central.webCompanion.webDevelopmentUsesCanonicalUnityCSharp,true);
  assert.equal(policy.platformAliasPolicy.WEB,'UNITY_WEB');
  assert.equal(policy.platformAliasPolicy.WEB_IS_SEPARATE_GAMEPLAY_SOURCE,false);
  assert.equal(make({platform:'WEB'}),null);
  assert.equal(make({platform:'UNITY'}),null);
  assert.equal(make({policy:{}}),null);
});

test('owner feature removal survives repeated evolution and only a newer explicit request replaces it',()=>{
  const remove={requestId:'owner-1',featureId:'daily-reward',action:'REMOVE',requirement:'일일 보상 기능 제거'};
  const add={requestId:'owner-2',featureId:'party-play',action:'ADD',requirement:'협동 파티 기능 추가'};
  const changed={...design,ownerFeatureChanges:[remove,add]};
  let previous=make();
  for(let cycle=0;cycle<5;cycle++){
    previous=make({design:changed,previousPlan:previous});
    assert.equal(previous.ownerFeatureChanges.find(x=>x.featureId==='daily-reward').action,'REMOVE');
    assert.equal(previous.ownerFeatureChanges.length,2);
    assert.equal(previous.implementationStatus,'PLANNED_NOT_IMPLEMENTED');
  }
  const replacement={...remove,requestId:'owner-3',action:'ADD',requirement:'일일 보상을 다시 추가'};
  const next=make({design:{...changed,ownerFeatureChanges:[remove,add,replacement]},previousPlan:previous});
  assert.equal(next.ownerFeatureChanges.find(x=>x.featureId==='daily-reward').requestId,'owner-3');
  assert.notEqual(next.ownerChangeFingerprint,previous.ownerChangeFingerprint);
});
