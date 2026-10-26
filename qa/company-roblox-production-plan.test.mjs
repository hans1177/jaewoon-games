// 파일명: qa/company-roblox-production-plan.test.mjs
// 역할: 기존 바이브 공간·화면 도안의 실제 소스 바인딩과 절차적 월드 설계의 정적 계약 회귀 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildRobloxProductionPlan,robloxProductionPromptLines,ROBLOX_PRODUCTION_PROFILES,buildSpatialBlueprintContract,validateSpatialBlueprint,buildInterfaceBlueprintContract,validateInterfaceBlueprint,productionBlueprintContractsForFiles} from '../tools/company-roblox-production-plan.mjs';
import {buildVibeAssetProductionPlan,assetProductionGuidance,buildVibeFamilyAssetOptimizationHandoff} from '../tools/vibe2-asset-production-plan.mjs';
import {buildGameSpecificBuildUpDirective,directivePrompt} from '../tools/company-build-up-directive.mjs';
import {extractDesignContext} from '../tools/company-build-up-directive.mjs';
import {planVibeExternalCustomization} from '../assets/asset-selector.js';

const central=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
const policy=central.robloxStudioProductionFlowContract;

test('common material variants follow each game concept and stale shared style cannot replace approved style',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-game-style-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify(central));
  const registry={version:1,assets:[],baseMaterialLibrary:{customization:{documents:[{gameId:'bright-game',styleBible:{profileKey:'DARK_FANTASY'}}]}}};
  fs.writeFileSync(path.join(root,'company-asset-library.json'),JSON.stringify(registry));
  for(const [gameId,styleFamily,visualDirection] of [['bright-game','CARTOON','밝은 둥근 원본 형태'],['dark-game','DARK_FANTASY','낡은 날카로운 원본 형태']]){
    const task={gameId,goal:'공용 나무와 몬스터의 게임별 표현',styleFamily:'STYLIZED_FANTASY',
      buildUpDirective:{designContextMode:'APPROVED_OR_MINIMUM_DESIGN',designFingerprint:gameId+'-design',
        gameIdentityAndNonNegotiables:{identity:gameId},designImplementationContext:{visualDirection,presentationPlan:{styleFamily},artAudioDirection:{},creativeGrammar:{a:{system:gameId},b:{system:'보조'}}}}};
    const plan=buildVibeAssetProductionPlan({task,target:'roblox',repoRoot:root,manifest:{assets:[]}});
    assert.equal(plan.gameConceptStyle.gameId,gameId);assert.equal(plan.gameConceptStyle.styleFamily,styleFamily);
    assert.equal(plan.gameConceptStyle.visualDirection,visualDirection);
    assert.equal(plan.gameConceptStyle.materialVariantCountIsNotStyleCount,true);
    assert.equal(plan.gameConceptStyle.runtimeVerified,false);
    assert.equal(plan.styleBible.profileKey,styleFamily);
    assert.match(assetProductionGuidance(plan),/공용 나무·몬스터·건물·재질/);
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'company-asset-library.json'),'utf8')),registry);
});

test('partial presentation plan preserves detailed style and motion in both production handoffs',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-style-merge-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
  fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify(central));
  const design=extractDesignContext({identity:'원본 게임',genre:'SURVIVAL',
    detailedDesign:{presentation:{styleFamily:'CARTOON',styleBible:{profileKey:'CARTOON',silhouette:'둥근 형태',palette:'따뜻한 색'},anticipation:'공격 전 준비',camera:'기존 시점'}},
    presentationPlan:{camera:'승인된 근접 시점',styleBible:{palette:'승인된 차가운 색'}}});
  const before=JSON.stringify(design);
  const production=buildRobloxProductionPlan({gameId:'demo',platform:'ROBLOX',policy,design,
    responsibleFiles:['roblox-games/demo/client/Menu.client.luau'],focus:'PRESENTATION'});
  const presentation=production.detailedDesignContract.sections.find(row=>row.id==='MOTION_AND_PRESENTATION').authored;
  assert.equal(presentation.anticipation,'공격 전 준비');
  assert.equal(presentation.camera,'승인된 근접 시점');
  assert.deepEqual(presentation.styleBible,{profileKey:'CARTOON',silhouette:'둥근 형태',palette:'승인된 차가운 색'});
  for(const target of ['roblox','web']){
    const plan=buildVibeAssetProductionPlan({target,repoRoot:root,manifest:{assets:[]},task:{gameId:'demo',goal:'원본 그래픽 연출',
      buildUpDirective:{designContextMode:'APPROVED_OR_MINIMUM_DESIGN',designFingerprint:'current-design',designImplementationContext:design}}});
    assert.equal(plan.gameConceptStyle.styleFamily,'CARTOON');
    assert.deepEqual(plan.gameConceptStyle.presentation,presentation);
    assert.equal(plan.gameConceptStyle.runtimeVerified,false);
    assert.equal(plan.styleBible.profileKey,'CARTOON');
  }
  assert.equal(JSON.stringify(design),before);
});

test('game-authored detailed design survives handoff without a genre prefab or invented completion',()=>{
  const raw={genre:'SURVIVAL STRATEGY',identity:'서로 다른 게임의 고유 규칙',
    creativeGrammar:{a:{system:'빛 경로 탐색'},b:{system:'증언 순서',existingGameReference:'B 보조 참고'}},
    coreLoop:['빛을 읽는다','증언을 배열한다'],signatureSystems:[{name:'빛 경로'},{name:'증언 순서'}],
    detailedDesign:{tutorial:{hintCondition:'첫 실패 후 빛의 방향만 안내'},world:{biome:'원본 지역'}},
    tutorialPlan:{entryCondition:'첫 접속',successCondition:'첫 경로 발견'},
    presentationPlan:{camera:'원본 시점',interruptAndSkip:'취소 후 입력 복구'},
    interfacePlan:{screens:['원본 화면']},verificationPlan:{expectedState:'경로 상태 전이'},
    contentExpansionPlan:[{milestone:'첫 발견',trigger:'원본 조건',ruleIds:['a'],newGameplay:'기존 다음 선택'}]};
  const design=extractDesignContext({content:raw});
  for(const key of ['detailedDesign','tutorialPlan','presentationPlan','interfacePlan','verificationPlan'])assert.deepEqual(design[key],raw[key]);
  assert.equal(design.contentExpansionPlan[0].trigger,'원본 조건');
  const plan=buildRobloxProductionPlan({gameId:'demo',platform:'ROBLOX',policy,design,
    responsibleFiles:['roblox-games/demo/client/Menu.client.luau'],focus:'USABILITY'});
  assert.equal(plan.detailedDesignContract.runtimeVerified,false);
  assert.deepEqual(plan.detailedDesignContract.basicGrammar,raw.creativeGrammar);
  assert.deepEqual(plan.detailedDesignContract.genreReviewContexts,['SURVIVAL','STRATEGY']);
  assert.equal(plan.detailedDesignContract.sections.find(row=>row.id==='FIRST_PLAY_AND_TUTORIAL').authored.entryCondition,'첫 접속');
  assert.ok(plan.detailedDesignContract.sections.every(row=>row.runtimeVerified===false));
  const connected=buildRobloxProductionPlan({gameId:'demo',platform:'ROBLOX',policy,design,
    responsibleFiles:['roblox-games/demo/server/Game.server.luau'],focus:'CORE_FUN'});
  assert.ok(connected.selectedIdea.id.endsWith(':AUTHORED_SYSTEM_CONNECTION'));
  assert.equal(connected.coreAction,'빛을 읽는다');
  assert.doesNotMatch(connected.selectedIdea.implementation,/거점|방어 배치|자원 수급/);
  const repaired=buildRobloxProductionPlan({gameId:'demo',platform:'ROBLOX',policy,design,
    responsibleFiles:['roblox-games/demo/server/Game.server.luau'],focus:'STABILITY'});
  assert.equal(repaired.detailedDesignContract,null);
  const inherited=buildRobloxProductionPlan({gameId:'demo',platform:'ROBLOX',policy,
    design:extractDesignContext({genre:'PUZZLE',detailedDesign:raw.detailedDesign}),
    responsibleFiles:['roblox-games/demo/client/Menu.client.luau'],focus:'USABILITY'});
  assert.equal(inherited.detailedDesignContract.sections[0].authored.hintCondition,'첫 실패 후 빛의 방향만 안내');
});

test('tutorial presentation and UI plans require current executable bindings and cannot claim runtime PASS',()=>{
  const f=interfaceFixture();
  f.contract.experienceScenarioContract={required:true,designRefs:['FIRST_PLAY_AND_TUTORIAL','MOTION_AND_PRESENTATION','INTERFACE']};
  const scenario={id:'first-choice',designRef:'FIRST_PLAY_AND_TUTORIAL',kind:'TUTORIAL',screenId:'play',controlId:'open',
    entryCondition:'new player',inputs:['tap open'],expectedState:'existing gear panel opens',expectedFeedback:'selected equipment visible',
    failureRecovery:'keep original gear and retry',skipPolicy:'skip preserves objective',interruptionRecovery:'close restores input',
    binding:{path:'ui.js',symbol:'openMenu',sourceEvidence:f.sourceFiles['ui.js']},runtimeVerified:false};
  f.blueprint.experienceScenarios=[scenario];
  const passed=validateInterfaceBlueprint(f);assert.equal(passed.pass,true,JSON.stringify(passed.issues));
  assert.equal(passed.runtimeVerified,false);assert.equal(passed.experienceRequests[0].verificationStatus,'EXACT_BUILD_RUNTIME_EVIDENCE_REQUIRED');
  for(const mutation of [s=>delete s.interruptionRecovery,s=>s.runtimeVerified=true,s=>s.controlId='missing',s=>s.binding.path='sibling.js',s=>s.designRef='unknown',s=>s.actualEvidence='invented']){
    const broken=structuredClone(f);mutation(broken.blueprint.experienceScenarios[0]);assert.equal(validateInterfaceBlueprint(broken).pass,false);
  }
  const missing=structuredClone(f);delete missing.blueprint.experienceScenarios;
  assert.ok(validateInterfaceBlueprint(missing).issues.includes('EXPERIENCE_SCENARIOS_MISSING'));
  const stale=structuredClone(f);stale.sourceFiles['ui.js']='// '+stale.sourceFiles['ui.js'];
  assert.equal(validateInterfaceBlueprint(stale).pass,false);
});

function spatialFixture(dimension='2D'){
  const source='const world = {scale: 1};';
  const binding={path:'scene.js',symbol:'world',sourceEvidence:source};
  const contract=buildSpatialBlueprintContract({enabled:true,design:{identity:'explore a connected map',spatialDimension:dimension},files:['web-games/demo/scene.js'],mode:'CONNECTED_CONTENT_IMPLEMENTATION'});
  const bounds=dimension==='2D'?{min:[0,0],max:[12,12]}:{min:[0,-1,0],max:[12,5,12]};
  const obj=(id,role,min,max,extra={})=>({id,role,regionId:'room',bounds:{min,max},solid:false,walkable:false,reason:'existing route boundary',binding,...extra});
  const objects=dimension==='2D'?[obj('start','SPAWN',[1.5,1.5],[2.5,2.5]),obj('goal','GOAL',[8,8],[9,9])]:[
    obj('floor','GROUND',[0,-1,0],[12,0,12],{solid:true,walkable:true}),obj('start','SPAWN',[1.5,0,1.5],[2.5,1.8,2.5],{supportId:'floor'}),obj('goal','GOAL',[8,0,8],[9,1.8,9],{supportId:'floor'})];
  return{contract,sourceFiles:{'scene.js':source},changedFiles:['scene.js'],blueprint:{version:1,designFingerprint:contract.designFingerprint,dimension,view:dimension==='2D'?'TOP_DOWN':'PERSPECTIVE',units:'meters',upAxis:dimension==='2D'?'NONE':'Y',player:{radius:.25,height:1.8,maxStep:.25,maxSlopeDegrees:40},worldBounds:bounds,regions:[{id:'room',bounds,purpose:'task-local room'}],objects,connections:[{id:'walk',from:'start',to:'goal',kind:'WALK',path:dimension==='2D'?[[2,2],[8.5,8.5]]:[[2,0,2],[8.5,0,8.5]],reason:'reach the objective',binding}],entryId:'start',objectiveIds:['goal']}};
}

test('spatial blueprints distinguish 2D and 3D and never claim engine runtime verification',()=>{
  for(const dimension of ['2D','3D']){const result=validateSpatialBlueprint(spatialFixture(dimension));assert.equal(result.pass,true,JSON.stringify(result.issues));assert.equal(result.runtimeVerified,false);}
  const f=spatialFixture();f.blueprint.dimension='3D';assert.equal(validateSpatialBlueprint(f).pass,false);
  assert.equal(buildSpatialBlueprintContract({enabled:true,mode:'EXISTING_SOURCE_REPAIR',design:{identity:'map'}}),null);
});

test('screen-down gravity is normalized and scoped workers do not inherit sibling blueprint obligations',()=>{
  const f=spatialFixture('3D'),b=f.blueprint;b.upDirection=-1;
  const flip=value=>{const min=[...value.min],max=[...value.max];min[1]=-value.max[1];max[1]=-value.min[1];return{min,max};};
  b.worldBounds=flip(b.worldBounds);b.regions=b.regions.map(row=>({...row,bounds:flip(row.bounds)}));b.objects=b.objects.map(row=>({...row,bounds:flip(row.bounds)}));b.connections=b.connections.map(row=>({...row,path:row.path.map(point=>[point[0],-point[1],point[2]])}));
  assert.equal(validateSpatialBlueprint(f).pass,true);
  const plan={implementationPackages:[{role:'CLIENT_PRESENTATION',files:['roblox-games/demo/client/Menu.luau']},{role:'SERVER_AUTHORITY',files:['roblox-games/demo/server/Save.luau','roblox-games/demo/server/World.luau']}],spatialBlueprintContract:{required:true,macroSketch:{}},interfaceBlueprintContract:{required:true}};
  const menu=productionBlueprintContractsForFiles(plan,{responsibleFiles:['client/Menu.luau']});assert.equal(menu.spatial.required,false);assert.equal(menu.interface.required,true);
  const save=productionBlueprintContractsForFiles(plan,{responsibleFiles:['server/Save.luau']});assert.equal(save.spatial.required,false);assert.equal(save.interface.required,false);
  const world=productionBlueprintContractsForFiles(plan,{responsibleFiles:['server/World.luau']});assert.equal(world.spatial.required,true);assert.equal(world.interface.required,false);
});

test('3D blueprint detects floating actors, headroom and thin obstacles between route endpoints',()=>{
  for(const mode of ['floating','ceiling','thinWall']){
    const f=spatialFixture('3D'),b=f.blueprint;
    if(mode==='floating')b.objects[1].bounds.min[1]=1;
    else b.objects.push({...b.objects[0],id:mode,walkable:false,role:'WALL',bounds:mode==='ceiling'?{min:[1,1.3,1],max:[3,2,3]}:{min:[4.5,0,4.5],max:[4.51,3,4.51]}});
    const result=validateSpatialBlueprint(f);assert.equal(result.pass,false);
    assert.ok(result.issues.some(x=>x.startsWith(mode==='floating'?'GROUND_SUPPORT_MISSING':mode==='ceiling'?'BODY_OR_HEADROOM_BLOCKED':'ROUTE_CLEARANCE_BLOCKED')),JSON.stringify(result.issues));
  }
});

test('3D route over a ground gap is rejected even with supported endpoints',()=>{
  const f=spatialFixture('3D'),b=f.blueprint;b.objects[0].bounds.max[0]=3;
  b.objects.push({...b.objects[0],id:'far-floor',bounds:{min:[7,-1,0],max:[12,0,12]}});b.objects[2].supportId='far-floor';
  assert.ok(validateSpatialBlueprint(f).issues.some(x=>x.startsWith('UNSUPPORTED_ROUTE_GAP')));
});

test('spatial evidence rejects stale design, dangling graphs, comment-only source and sibling file claims',()=>{
  for(const mutate of [f=>f.blueprint.designFingerprint='stale',f=>f.blueprint.connections=[],f=>f.sourceFiles['scene.js']='// const world = {scale: 1};',f=>f.contract.sourceFiles=['web-games/demo/other.js'],f=>f.changedFiles=[],f=>f.blueprint.objects.push(null)]){
    const f=spatialFixture();mutate(f);assert.equal(validateSpatialBlueprint(f).pass,false);
  }
});

function interfaceFixture(){
  const source='function openMenu(){return true;}';
  const binding={path:'ui.js',symbol:'openMenu',sourceEvidence:source};
  const contract=buildInterfaceBlueprintContract({enabled:true,focus:'USABILITY',mode:'EXISTING_PLAY_PRESENTATION',files:['web-games/demo/ui.js'],design:{coreLoop:['select equipment loadout','play','return']}});
  const button=(id)=>({id,action:'existing handler',feedback:'preview selected equipment',enabledWhen:'existing combat restriction',rect:{x:10,y:10,width:48,height:48},binding});
  return{contract,sourceFiles:{'ui.js':source},blueprint:{version:1,designFingerprint:contract.designFingerprint,viewport:{width:390,height:844,safeTop:0,safeBottom:0},entryId:'play',screens:[{id:'play',role:'GAMEPLAY',modal:false,scrollable:false,controls:[button('open')]},{id:'gear',role:'INVENTORY',modal:true,scrollable:false,controls:[button('close')]}],transitions:[{from:'play',controlId:'open',to:'gear',kind:'OPEN',preservesState:true},{from:'gear',controlId:'close',to:'play',kind:'CLOSE',preservesState:true}],playerTasks:[{id:'setup',friction:'reselecting the same gear',patternId:'BUILD_PRESETS',adaptation:'reuse player-selected gear',from:'play',to:'gear',controlId:'close',maxNavigationSteps:1,retainedContext:['selected preset'],failureRecovery:'keep original equipment on failed preview',runtimeCheck:'open, select, close; verify unchanged combat and save behavior'}]}};
}

test('modern convenience selection follows existing systems and static task routes stay unmeasured',()=>{
  const f=interfaceFixture(),result=validateInterfaceBlueprint(f);assert.equal(result.pass,true,JSON.stringify(result.issues));assert.equal(result.runtimeVerified,false);assert.equal(result.taskRoutes[0].navigationSteps,1);assert.equal(result.taskRoutes[0].measuredRuntimeInputs,null);
  assert.ok(f.contract.referencePatterns.some(x=>x.id==='BUILD_PRESETS'));assert.ok(!f.contract.referencePatterns.some(x=>x.id==='RECIPE_BATCH_WORKFLOW'));
  assert.ok(f.contract.referencePatterns.every(x=>x.authority==='DESIGN_REFERENCE_ONLY'&&x.runtimeVerified===false&&x.sourceUrl.startsWith('https://')));
});

test('all first-party game libraries are automatically screened and only existing system matches are candidates',()=>{
  const ui='unity-games/demo/Assets/Scripts/UIController.cs';
  const libraries=['assets/inventory-equipment.js','assets/resource-gathering.js','assets/save-versioning.js','assets/mythic-navigation.js','assets/vibe-system-steward.js'];
  const source={sourceAnchors:[
    {file:ui,symbol:'GatherResource',context:'void GatherResource() {}'},
    {file:ui,symbol:'SaveProgress',context:'void SaveProgress() {}'},
    {file:ui,symbol:'MythicNavigation',context:'void MythicNavigation() {}'}
  ]};
  const design={genre:'SURVIVAL',coreLoop:['채집','장비']};
  const contract=buildInterfaceBlueprintContract({enabled:true,focus:'USABILITY',mode:'EXISTING_PLAY_PRESENTATION',
    platform:'UNITY_WEB',design,source,files:[ui],availableLibraryPaths:libraries});
  assert.equal(contract.firstPartyLibraryCount,4);
  for(const name of ['resource-gathering.js','save-versioning.js','mythic-navigation.js']){
    assert.ok(contract.internalLibraryMatches.some(row=>row.library==='assets/'+name&&row.status==='SOURCE_SIGNAL_MATCH_UNVERIFIED'));
  }
  assert.ok(!contract.internalLibraryMatches.some(row=>row.library==='assets/vibe-system-steward.js'));
  assert.ok(contract.internalLibraryMatches.every(row=>row.optional&&!row.automaticImport&&!row.newGameplayAuthority&&!row.runtimeVerified));
  assert.ok(contract.internalLibraryMatches.every(row=>row.integration==='NATIVE_IMPLEMENTATION_IN_EXISTING_PROJECT'));
  const signalOnly=buildInterfaceBlueprintContract({enabled:true,focus:'USABILITY',mode:'EXISTING_PLAY_PRESENTATION',
    design:{genre:'SURVIVAL',coreLoop:['걷기']},source:{sourceAnchors:[],signals:{inventory:20,combat:20}},
    availableLibraryPaths:libraries});
  assert.deepEqual(signalOnly.internalLibraryMatches,[],'signals cannot substitute source anchors');
  const empty=buildInterfaceBlueprintContract({enabled:true,mode:'EXISTING_PLAY_PRESENTATION',
    design:{genre:'SURVIVAL',coreLoop:['걷기']},source:{sourceAnchors:[]},availableLibraryPaths:libraries});
  assert.equal(empty.internalLibraryMatches.length,0);
  const actual=buildRobloxProductionPlan({gameId:'demo',platform:'UNITY_WEB',
    policy:{...policy,status:'ACTIVE_EXECUTABLE_CONTRACT',platforms:['ROBLOX','UNITY'],spatialBlueprint:{enabled:true}},
    design,source:{...source,topFiles:[{file:ui,score:10}]},responsibleFiles:[ui],focus:'USABILITY',availableLibraryPaths:libraries});
  assert.ok(actual.libraryReuseContract.candidates.some(row=>row.library==='assets/mythic-navigation.js'));
  assert.ok(robloxProductionPromptLines(actual).some(row=>row.startsWith('UNITY_PRODUCTION_LIBRARY_MATCH=')));
  const unrelated=productionBlueprintContractsForFiles(actual,{responsibleFiles:['server/Unknown.luau']});
  assert.deepEqual(unrelated.interface.internalLibraryMatches,[]);
});

test('external interface algorithms and engine tools match optional existing systems',()=>{
  const sourceWithUi={signals:{ui:9,input:5,inventory:6,equipment:3,combat:0},sourceAnchors:[{symbol:'openInventory',context:'function openInventory(){ return items; }'}]};
  const survival={genre:'SURVIVAL',coreLoop:['채집','인벤토리 장비','제작 레시피'],signatureSystems:[{name:'장비 관리'}],mobileUx:'모바일 터치'};
  const args={enabled:true,mode:'EXISTING_PLAY_PRESENTATION',focus:'USABILITY',files:['web-games/demo/ui.js'],design:survival,source:sourceWithUi};
  const contract=buildInterfaceBlueprintContract(args);
  assert.ok(contract.externalAlgorithms.some(row=>row.id==='RECOGNITION_OVER_RECALL'));
  assert.ok(contract.externalAlgorithms.some(row=>row.id==='MOBILE_TOUCH_TARGETS'));
  assert.ok(contract.internalToolMatches.some(row=>row.id==='INVENTORY_EQUIPMENT'&&row.status==='SOURCE_SIGNAL_MATCH_UNVERIFIED'));
  assert.ok(contract.internalToolMatches.some(row=>row.id==='CRAFTING'&&row.status==='DESIGN_HINT_ONLY'));
  assert.ok(!contract.internalToolMatches.some(row=>row.id==='QUEST_DIALOGUE'));
  assert.ok(contract.externalAlgorithms.every(row=>row.optional&&row.runtimeVerified===false));
  assert.ok(contract.internalToolMatches.every(row=>row.optional&&!row.automaticImport&&!row.newGameplayAuthority));
  const empty=buildInterfaceBlueprintContract({...args,design:{genre:'RPG',coreLoop:['걷기']},source:{signals:{ui:1,input:0,inventory:0,equipment:0}}});
  assert.deepEqual(empty.externalAlgorithms,[]);assert.deepEqual(empty.internalToolMatches,[]);
  const plan=make({focus:'USABILITY',design:{...survival,identity:'숲',ownerFeatureChanges:[]},source:{...source,...sourceWithUi}});
  assert.ok(plan.interfaceBlueprintContract.internalToolMatches.some(row=>row.id==='INVENTORY_EQUIPMENT'));
  assert.match(robloxProductionPromptLines(plan).join('\n'),/EXTERNAL_UX_PRINCIPLE_ONLY/);
  const server=productionBlueprintContractsForFiles(plan,{responsibleFiles:['server/Game.server.luau']});
  assert.deepEqual(server.interface.externalAlgorithms,[]);assert.deepEqual(server.interface.internalToolMatches,[]);
});

test('Unity WebGL and Unity app share native UI matching instead of a separate browser game UI',()=>{
  const own=['unity-games/garden/Assets/Scripts/UIController.cs','unity-games/garden/Assets/Scripts/GameCore.cs'];
  const observed={...source,sourceRoot:'unity-games/garden',signals:{ui:5,input:4,inventory:5,equipment:1},
    sourceAnchors:[{symbol:'OpenInventory',context:'void OpenInventory() { inventoryPanel.SetActive(true); }'}],topFiles:own.map(file=>({file,score:10}))};
  const authored={...design,coreLoop:['explore','inventory equipment','quest'],mobileUx:'touch'};
  const web=make({platform:'UNITY_WEB',focus:'USABILITY',responsibleFiles:own,source:observed,design:authored});
  const app=make({platform:'UNITY_APP',focus:'USABILITY',responsibleFiles:own,source:observed,design:authored});
  assert.equal(web.platform,'UNITY');assert.equal(web.executionSurface,'UNITY_WEB');
  assert.equal(app.platform,'UNITY');assert.equal(app.executionSurface,'UNITY_APP');
  assert.deepEqual(web.interfaceBlueprintContract.internalToolMatches,app.interfaceBlueprintContract.internalToolMatches);
  assert.ok(web.interfaceBlueprintContract.internalToolMatches.every(row=>row.integration==='NATIVE_IMPLEMENTATION_IN_EXISTING_PROJECT'));
  assert.ok(web.implementationPackages.flatMap(row=>row.files).every(file=>file.startsWith('unity-games/garden/')));
  assert.match(robloxProductionPromptLines(web).join('\n'),/SAME canonical Unity C# UI source/);
});

test('interface blueprint rejects unusable touch, missing escape, fake handlers and generic menu-only plans',()=>{
  const cases=[
    [f=>f.blueprint.screens[0].controls[0].rect.width=20,'TOUCH_TARGET_OR_SAFE_AREA_INVALID'],
    [f=>f.blueprint.screens[0].controls.push({...f.blueprint.screens[0].controls[0],id:'overlap'}),'TOUCH_TARGET_OVERLAP'],
    [f=>f.blueprint.transitions.pop(),'MODAL_EXIT_MISSING'],
    [f=>f.blueprint.transitions[0].preservesState=false,'MENU_STATE_PRESERVATION_MISSING'],
    [f=>f.sourceFiles['ui.js']='// function openMenu(){return true;}','CONTROL_SOURCE_UNPROVEN'],
    [f=>f.blueprint.playerTasks=[],'PLAYER_FRICTION_ANALYSIS_MISSING'],
    [f=>f.blueprint.playerTasks[0].maxNavigationSteps=0,'PLAYER_TASK_ROUTE_BUDGET_EXCEEDED'],
    [f=>f.blueprint.playerTasks[0].patternId='RECIPE_BATCH_WORKFLOW','REFERENCE_PATTERN_NOT_APPLICABLE']
  ];
  for(const [mutate,code] of cases){const f=interfaceFixture();mutate(f);const r=validateInterfaceBlueprint(f);assert.equal(r.pass,false);assert.ok(r.issues.some(x=>x.startsWith(code)),JSON.stringify(r.issues));}
});
const files=['roblox-games/garden/server/Game.server.luau','roblox-games/garden/client/Game.client.luau','roblox-games/garden/shared/Definitions.luau'];
const source={sourceTreeFingerprint:'fixture-source',signals:{},observations:[],sourceAnchors:[],topFiles:files.map(file=>({file,score:10}))};
const design={identity:'정원 생태와 서식지 선택',genre:'DEFENSE',coreLoop:['침입 경로 관찰','서식지 배치','웨이브 대응','새 서식지 선택'],signatureSystems:[{name:'서식지 상성',purpose:'공간별 역할',playerChoice:'배치 선택'}],progressionDirection:'기존 정원에서 다음 서식지 해금'};
const make=overrides=>buildRobloxProductionPlan({gameId:'garden',platform:'ROBLOX',design,source,responsibleFiles:files,focus:'CORE_FUN',policy,...overrides});

// 유니티·웹도 같은 장르 품질을 각 플랫폼의 실제 소스에 연결한다.
test('Unity and Web production plans preserve genre, owner intent and native source responsibility',()=>{
  for(const platform of ['UNITY','UNITY_WEB','WEB']){
    const target=platform==='WEB'?'WEB':'UNITY';
    const root=target.toLowerCase()+'-games/garden';
    const own=target==='UNITY'?[root+'/Assets/Scripts/GameCore.cs',root+'/Assets/Scripts/RuntimeBootstrap.cs',root+'/Assets/Prefabs/Garden.prefab']:[root+'/index.html',root+'/game.js',root+'/style.css'];
    const observed={...source,sourceRoot:root,topFiles:own.map(file=>({file,score:10}))};
    const plan=make({platform,source:observed,responsibleFiles:[...own,...files],design:{...design,ownerFeatureChanges:[{requestId:'owner-x',featureId:'shop',action:'REMOVE',requirement:'상점 제거'}]}});
    assert.equal(plan.platform,target);assert.equal(plan.genreProfile,'DEFENSE');
    assert.deepEqual(plan.implementationPackages.flatMap(x=>x.files).sort(),own.sort());
    assert.equal(plan.qualityContract.runtimeVerified,false);
    assert.equal(plan.qualityContract.markerOnlyCompletionAllowed,false);
    assert.match(plan.qualityContract.runtimeSurface,platform==='UNITY_WEB'?/UNITY_WEBGL/:platform==='UNITY'?/UNITY_NATIVE/:/ACTUAL_BROWSER/);
    const presentation=make({platform,source:observed,responsibleFiles:own,focus:'PRESENTATION'});
    assert.equal(presentation.contentRule,'PRESENT_EXISTING_BEHAVIOR_ONLY');
    assert.ok(presentation.implementationPackages.every(x=>x.implementation.includes('게임 상태·보상·저장 의미는 유지')));
    const safe=make({platform,source:observed,responsibleFiles:own,safeDesignlessMode:true});
    assert.equal(safe.contentRule,'REPAIR_EXISTING_BEHAVIOR_ONLY');
    assert.match(robloxProductionPromptLines(plan).join('\n'),/OWNER=.*owner-x/);
  }
});

test('owner-held Unity Web retains C# source trace without unauthorized production plans',()=>{
  const root='unity-games/garden',own=[root+'/Assets/Scripts/GameCore.cs',root+'/Assets/Scripts/RuntimeBootstrap.cs'];
  const d=buildGameSpecificBuildUpDirective({gameId:'garden',platform:'WEB',sourceRoot:root,designRecord:{content:design},sourceObservation:{...source,topFiles:own.map(file=>({file,score:10}))},responsibleFiles:own});
  assert.equal(d.productionPlan,null,'Unity Web owner hold blocks automatic implementation planning');
  assert.equal(d.robloxProductionPlan,null);
  assert.equal(d.designToPlatformCodingTrace.activePlatform,'UNITY_WEB');
  assert.equal(d.designToPlatformCodingTrace.originalSourceLanguage,'LUAU');
  assert.equal(d.designToPlatformCodingTrace.sourceImplementationPassed,false);
  assert.doesNotMatch(directivePrompt(d),/UNITY_PRODUCTION_QUALITY=|WEB_PRODUCTION_FILES=/);
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
  assert.equal(make({platform:'WEB'}),null);
  assert.equal(make({platform:'UNITY'}),null);
  assert.equal(make({policy:{}}),null);
});

test('approved procedural world reaches actual Roblox and Unity production plans through existing source handoff',()=>{
  const spec={approvedDesign:true,seed:'planner-integration',dimension:'3D',width:24,height:24,density:.7,climate:'WET',biome:'MOUNTAIN'};
  const design={identity:'산악 마을 탐험',genre:'RPG',spatialLayout:{dimension:'3D',proceduralWorld:spec},coreLoop:['마을에서 출발','산길 탐험']};
  for(const [platform,files] of [
    ['ROBLOX',['roblox-games/mountain/server/World.server.luau','roblox-games/mountain/client/HUD.client.luau']],
    ['UNITY_WEB',['unity-games/mountain/Assets/Scripts/World.cs','unity-games/mountain/Assets/Scripts/HUDView.cs']]
  ]){
    const activePolicy={...policy,status:'ACTIVE_EXECUTABLE_CONTRACT',platforms:['ROBLOX','UNITY','WEB'],spatialBlueprint:{enabled:true}};
    const actual=buildRobloxProductionPlan({gameId:'mountain',platform,design,source:{sourceTreeFingerprint:'e2e-v1'},responsibleFiles:files,focus:'CORE_FUN',policy:activePolicy});
    assert.ok(actual);
    assert.equal(actual.mode,'CONNECTED_CONTENT_IMPLEMENTATION');
    assert.equal(actual.spatialBlueprintContract?.macroSketch?.proceduralWorldStudy?.status,'STATIC_LAYOUT_PROPOSED');
    const world=productionBlueprintContractsForFiles(actual,{responsibleFiles:[files[0]]});
    const menu=productionBlueprintContractsForFiles(actual,{responsibleFiles:[files[1]]});
    assert.equal(world.spatial.required,true);
    assert.equal(menu.spatial.required,false);
    assert.match(robloxProductionPromptLines(actual,{responsibleFiles:[files[0]]}).join('\n'),/planner-integration/);
    assert.doesNotMatch(robloxProductionPromptLines(actual,{responsibleFiles:[files[1]]}).join('\n'),/planner-integration/);
    assert.equal(actual.spatialBlueprintContract.runtimeVerified,false);
    const repair=buildRobloxProductionPlan({gameId:'mountain',platform,design,source:{sourceTreeFingerprint:'e2e-v1'},responsibleFiles:files,focus:'STABILITY',policy:activePolicy});
    assert.equal(repair.spatialBlueprintContract,null);
  }
});

test('approved procedural landscapes reach only the existing world source worker and remain unverified proposals',()=>{
  const world='roblox-games/landscape/server/World.luau',menu='roblox-games/landscape/client/Menu.luau';
  const spec={approvedDesign:true,seed:'winter-village',dimension:'3D',width:24,height:24,density:.7,biome:'MOUNTAIN',climate:'COLD_WET'};
  const design={identity:'산마을의 연결된 동선',spatialLayout:{dimension:'3D',proceduralWorld:spec}};
  const input={design,mode:'CONNECTED_CONTENT_IMPLEMENTATION',enabled:true,files:[world,menu]};
  const contract=buildSpatialBlueprintContract(input);
  assert.equal(contract.required,true);
  const study=contract.macroSketch.proceduralWorldStudy;
  assert.equal(study.status,'STATIC_LAYOUT_PROPOSED',JSON.stringify(study.issues));
  assert.ok(study.climateFoodWeb.every(row=>row.foodWeb?.visualOnly===true));
  assert.ok(study.buildings.every(row=>row.architecturalStrata.length===4));
  assert.equal(study.totalPlannedActorCount,0);
  assert.equal(study.nativeLifeAndWaterRuntimeVerified,false);
  assert.equal(study.seed,'winter-village');
  assert.equal(study.regionBiome,'MOUNTAIN');
  assert.equal(study.climate,'COLD_WET');
  assert.ok(study.routes.length>0);
  assert.ok(study.routes.every(route=>route.cellSample.length===route.worldPointSample.length));
  assert.ok(study.routes.every(route=>route.worldPointSample.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z))));
  const twoD=buildSpatialBlueprintContract({...input,design:{...design,spatialLayout:{dimension:'2D',proceduralWorld:{...spec,dimension:'2D'}}}});
  assert.equal(twoD.macroSketch.proceduralWorldStudy.status,'STATIC_LAYOUT_PROPOSED');
  assert.ok(twoD.macroSketch.proceduralWorldStudy.routes.every(route=>route.worldPointSample.every(point=>Number.isFinite(point.y)&&!('z' in point))));
  assert.ok(study.totalBuildings>0);
  assert.ok(study.buildings.every(row=>row.modules.some(module=>module.endsWith('PITCHED_ROOF'))));
  assert.equal(study.fullTerrainOrNativeMeshDelivered,false);
  assert.equal(study.runtimeVerified,false);
  assert.equal(study.sourceMutationPerformed,false);
  assert.ok(JSON.stringify(study).length<10000,'bounded worker context must not include whole tile arrays');
  assert.deepEqual(study,buildSpatialBlueprintContract(input).macroSketch.proceduralWorldStudy);
  const plan={platform:'ROBLOX',implementationPackages:[{role:'SERVER_AUTHORITY',files:[world]},{role:'CLIENT_PRESENTATION',files:[menu]}],spatialBlueprintContract:contract};
  const worldScoped=productionBlueprintContractsForFiles(plan,{responsibleFiles:[world]});
  const menuScoped=productionBlueprintContractsForFiles(plan,{responsibleFiles:[menu]});
  assert.equal(worldScoped.spatial.required,true);
  assert.equal(worldScoped.spatial.macroSketch.proceduralWorldStudy.seed,'winter-village');
  assert.equal(menuScoped.spatial.required,false);
  assert.equal(menuScoped.spatial.macroSketch.proceduralWorldStudy,undefined);
  assert.match(robloxProductionPromptLines(plan,{responsibleFiles:[world]}).join('\n'),/macroSketch\.proceduralWorldStudy/);
  assert.doesNotMatch(robloxProductionPromptLines(plan,{responsibleFiles:[menu]}).join('\n'),/"seed":"winter-village"/);
  const unapproved=buildSpatialBlueprintContract({...input,design:{...design,spatialLayout:{dimension:'3D',proceduralWorld:{...spec,approvedDesign:false}}}});
  assert.equal(unapproved.macroSketch.proceduralWorldStudy,undefined);
  const presentation=buildSpatialBlueprintContract({...input,mode:'EXISTING_PLAY_PRESENTATION'});
  assert.equal(presentation.macroSketch.proceduralWorldStudy,undefined);
  assert.equal(buildSpatialBlueprintContract({...input,mode:'EXISTING_SOURCE_REPAIR'}),null);
  const blocked=buildSpatialBlueprintContract({...input,design:{...design,spatialLayout:{dimension:'3D',proceduralWorld:{...spec,reservedCells:Array.from({length:24},(_,z)=>({x:12,z}))}}}});
  assert.equal(blocked.macroSketch.proceduralWorldStudy.status,'LAYOUT_REVIEW_REQUIRED');
  assert.ok(blocked.macroSketch.proceduralWorldStudy.issues.some(code=>code.includes('REQUIRED_ROUTE_BLOCKED')||code.includes('REQUIRED_OBJECTIVE_UNREACHABLE')));
  assert.equal(blocked.macroSketch.proceduralWorldStudy.runtimeVerified,false);
});

test('existing spatial worker plans seeded biome drainage connected roads and modular architecture without changing repair scope',()=>{
  const worldSource='roblox-games/demo/server/World.luau';
  const plan={platform:'ROBLOX',implementationPackages:[{role:'SERVER_AUTHORITY',files:[worldSource]}],
    spatialBlueprintContract:{required:true,sourceFiles:[worldSource],macroSketch:{sourceAnchors:[]}}};
  const prompt=robloxProductionPromptLines(plan,{responsibleFiles:[worldSource]});
  const spatialRule=prompt.find(line=>line.startsWith('ROBLOX_PRODUCTION_SPATIAL_RULE='));
  assert.match(spatialRule,/seeded gradient-noise elevation and drainage/);
  assert.match(spatialRule,/connect walkable road and optional routes before placing any building/);
  assert.match(spatialRule,/snap modular foundations\/walls\/openings\/roofs/);
  assert.match(spatialRule,/face door openings toward a traversable road/);
  assert.match(spatialRule,/landmark sightline from a decision point/);
  assert.match(spatialRule,/mobile/);
  assert.match(spatialRule,/not proof of native instancing or runtime visibility/);
  assert.match(spatialRule,/Existing map repairs and presentation-only tasks must preserve/);
  assert.equal(productionBlueprintContractsForFiles(plan,{responsibleFiles:['client/HUD.luau']}).spatial.required,false);
});

test('approved Earth auto-biome stays in the same source-worker plan with bounded actor samples',()=>{
  const roster=Array.from({length:35},(_,i)=>({id:'npc-'+i,kind:'NPC',approved:true,
    allowedActions:['TALK','REST','WORK']}));
  const spec={approvedDesign:true,dimension:'3D',seed:'biome-many-actors',
    width:24,height:24,density:.7,biome:'EARTH_SYSTEM',buildingStyle:'HYBRID',ecologyActors:roster};
  const contract=buildSpatialBlueprintContract({enabled:true,mode:'CONNECTED_CONTENT_IMPLEMENTATION',
    design:{identity:'Earth native world',spatialLayout:{dimension:'3D',proceduralWorld:spec}},
    files:['roblox-games/earth/server/World.luau']});
  const study=contract.macroSketch.proceduralWorldStudy;
  assert.equal(study.waterMode,'WATERSHED');
  assert.ok(study.waterBodies.some(row=>row.kind==='OCEAN'));
  assert.ok(study.waterBodies.some(row=>row.kind==='LAKE'));
  assert.ok(study.eraDistribution.ANCIENT+study.eraDistribution.MEDIEVAL+
    study.eraDistribution.MODERN+study.eraDistribution.FUTURE>0);
  assert.equal(study.totalPlannedActorCount,35);
  assert.ok(study.lifeAndDungeonPlans.length>0&&study.lifeAndDungeonPlans.length<=3);
  assert.ok(study.lifeAndDungeonPlans.every(row=>row.exactActorRuntimeBindingVerified===false));
  assert.ok(JSON.stringify(study).length<10000,'no unbounded source-worker context');
  assert.equal(study.nativeLifeAndWaterRuntimeVerified,false);
  assert.equal(study.runtimeVerified,false);
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


test('asset worker keeps the same authored auto-biome as the spatial design and never upgrades explicit nonapproval',()=>{
  const spec={approvedDesign:true,seed:'authored-snow-valley',dimension:'3D',width:16,height:20,cellSize:4,density:.25,biome:'SNOW',climate:'COLD',buildingStyle:'GOTHIC',reservedCells:[{x:2,z:3}]};
  const build=world=>buildVibeAssetProductionPlan({repoRoot:'/nonexistent-biome-fixture',target:'roblox',task:{gameId:'snow-valley',goal:'environment background',buildUpDirective:{designContextMode:'APPROVED_OR_MINIMUM_DESIGN',designImplementationContext:{spatialLayout:{dimension:'3D',proceduralWorld:world}}}},manifest:{assets:[]},presetCatalog:{presets:[]}});
  const plan=build(spec);
  assert.equal(plan.autoBiomeEvaluation.source,'LATEST_VERIFIED_GAME_SPATIAL_DESIGN');
  assert.equal(plan.proceduralWorldLayout.seed,spec.seed);
  assert.equal(plan.proceduralWorldLayout.regionalBiome,'SNOW');
  assert.equal(plan.proceduralWorldLayout.climate,'COLD');
  assert.deepEqual(plan.proceduralWorldLayout.size,{width:16,height:20,cellSize:4});
  assert.equal(plan.autoBiomeEvaluation.runtimeVerified,false);
  assert.equal(plan.autoBiomeEvaluation.gameSourceMutationPerformed,false);
  const unapproved=build({...spec,approvedDesign:false});
  assert.equal(unapproved.proceduralWorldLayout.status,'APPROVED_DESIGN_REQUIRED');
  const invalid=build({...spec,reservedCells:'invalid'});
  assert.equal(invalid.proceduralWorldLayout.status,'INVALID_GENERATION_INPUT');
  const unspecified=build(undefined);
  assert.equal(unspecified.proceduralWorldLayout.status,'APPROVED_DESIGN_REQUIRED');
  assert.equal(unspecified.autoBiomeEvaluation.missingDesignMustRouteToExistingDesignPipeline,true);
});


test('lobby customization material inventory and HUD use only observed native source and shared assets',()=>{
  const ui='roblox-games/demo/client/Game.client.luau',server='roblox-games/demo/server/Game.server.luau';
  const authored={identity:'맞춤 로비',coreLoop:['로비 입장','장비 선택','게임 시작'],ownerFeatureChanges:[]};
  const observed={sourceAnchors:[
    {file:ui,symbol:'OpenLobby',context:'function OpenLobby() end'},
    {file:ui,symbol:'CustomizeAvatar',context:'function CustomizeAvatar() end'},
    {file:ui,symbol:'PreviewMaterial',context:'function PreviewMaterial() end'},
    {file:ui,symbol:'OpenInventory',context:'function OpenInventory() end'},
    {file:ui,symbol:'UpdateHUD',context:'function UpdateHUD() end'},
    {file:server,symbol:'OpenInventory',context:'server inventory authority'}
  ]};
  const opts={enabled:true,focus:'USABILITY',mode:'EXISTING_PLAY_PRESENTATION',platform:'ROBLOX',
    design:authored,source:observed,files:[ui,server]};
  const contract=buildInterfaceBlueprintContract(opts);
  assert.deepEqual(contract.autoCompositionTargets.map(row=>row.id),['LOBBY','CUSTOMIZATION','MATERIAL','INVENTORY','GAME_UI']);
  for(const target of contract.autoCompositionTargets){
    assert.equal(target.status,'SOURCE_MATCH_REQUIRES_NATIVE_IMPLEMENTATION_AND_QA');
    assert.deepEqual(target.sourceFiles,[ui]);
    assert.equal(target.assetRegistry,'company-asset-library.json');
    assert.equal(target.licenseLedger,'assets/asset-license-ledger.json');
    assert.equal(target.reuseExistingAssetsOnly,true);
    assert.equal(target.newAssetGeneration,false);
    assert.equal(target.automaticImport,false);
    assert.equal(target.saveSchemaUnchanged,true);
    assert.equal(target.layout.minTouchTarget,44);
    assert.equal(target.runtimeVerified,false);
    assert.ok(target.qa.includes('EXACT_NATIVE_RUNTIME'));
  }
  const onlyDesign=buildInterfaceBlueprintContract({...opts,source:{sourceAnchors:[]}});
  assert.ok(onlyDesign.autoCompositionTargets.some(row=>row.id==='LOBBY'&&row.status==='DESIGN_HINT_NOT_APPLIED'));
  assert.ok(onlyDesign.autoCompositionTargets.every(row=>!row.sourceFiles.length));
  const removed=buildInterfaceBlueprintContract({...opts,design:{...authored,ownerFeatureChanges:[
    {featureId:'material-picker',requestId:'owner-removal',action:'REMOVE',requirement:'재질 선택 제거'}]}});
  assert.ok(!removed.autoCompositionTargets.some(row=>row.id==='MATERIAL'));
  const planned={interfaceBlueprintContract:contract,implementationPackages:[
    {role:'CLIENT_PRESENTATION',files:[ui]},{role:'SERVER_AUTHORITY',files:[server]}
  ]};
  assert.deepEqual(productionBlueprintContractsForFiles(planned,{responsibleFiles:[server]}).interface.autoCompositionTargets,[]);
  assert.equal(productionBlueprintContractsForFiles(planned,{responsibleFiles:[ui]}).interface.autoCompositionTargets.length,5);
  const prompt=robloxProductionPromptLines({...planned,platform:'ROBLOX',qualityContract:{runtimeVerified:false}},{responsibleFiles:[ui]}).join('\n');
  assert.match(prompt,/autoCompositionTargets/);
  assert.match(prompt,/never generate or download new assets/);
  assert.match(prompt,/EXACT_NATIVE_RUNTIME/);
});


test('approved socket WFC and canyon remain Roblox/Web spatial-owner inputs until native source and runtime QA',()=>{
  const baseWorld={approvedDesign:true,seed:'owned-spatial-wfc',width:12,height:12,dimension:'3D',
    terrainMorphology:{approved:true,kind:'CANYON',depth:.15,halfWidth:.12,meander:.05},
    roomConstraints:{approved:true,width:3,height:3,closedBoundary:false,
      start:{x:0,z:0},exit:{x:2,z:2},tiles:[{id:'open',open:['N','E','S','W']}]}};
  const design={identity:'approved rooms in canyon',spatialLayout:{dimension:'3D',proceduralWorld:baseWorld}};
  for(const platform of ['ROBLOX','WEB']){
    const files=[platform==='WEB'?'web-games/approved/index.js':'roblox-games/approved/server/World.server.luau'];
    const plan=buildSpatialBlueprintContract({
      enabled:true,mode:'CONNECTED_CONTENT_IMPLEMENTATION',platform,design,files
    });
    const study=plan.macroSketch.proceduralWorldStudy;
    assert.equal(study.roomComposition.status,'ROOM_LAYOUT_STATIC_PROPOSAL');
    assert.equal(study.roomComposition.route.length,5);
    assert.equal(study.roomComposition.gameplayAuthority,false);
    assert.equal(study.roomComposition.runtimeVerified,false);
    assert.equal(study.terrainMorphology.kind,'CANYON');
    assert.equal(study.terrainMorphology.appliedToNativeGame,false);
    assert.equal(study.fullTerrainOrNativeMeshDelivered,false);
    assert.equal(plan.runtimeVerified,false);
    const unspecified=buildSpatialBlueprintContract({...{
      enabled:true,mode:'CONNECTED_CONTENT_IMPLEMENTATION',platform,files,
      design:{...design,spatialLayout:{dimension:'3D',proceduralWorld:{...baseWorld,roomConstraints:undefined,terrainMorphology:undefined}}}
    }});
    assert.equal(unspecified.macroSketch.proceduralWorldStudy.roomComposition,undefined);
    assert.equal(unspecified.macroSketch.proceduralWorldStudy.terrainMorphology,undefined);
  }
  const held=buildSpatialBlueprintContract({
    enabled:true,mode:'CONNECTED_CONTENT_IMPLEMENTATION',platform:'UNITY_WEB',
    design,files:['unity-games/approved/Assets/Scripts/World.cs']
  });
  assert.equal(held.macroSketch.proceduralWorldStudy.roomComposition,undefined);
  assert.equal(held.macroSketch.proceduralWorldStudy.terrainMorphology,undefined);
});

test('existing queued Web work receives current CC0 action motion directive at worker handoff only for active development',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'web-cc0-handoff-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
 fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify(central));
 for(const [target,releaseState,required] of [['web','development-confirmed',true],['web','release-confirmed',false],['roblox','development-confirmed',false]]){
  const plan=buildVibeAssetProductionPlan({repoRoot:root,target,manifest:{assets:[]},task:{gameId:'demo',releaseState,goal:'기존 상태 연출'}});
  assert.equal(plan.webActionMotionReplacement?.enabled===true,required);
  assert.equal(assetProductionGuidance(plan).includes('[WEB CC0 ACTION MOTION OWNER DIRECTIVE]'),required);
 }
});

test('current all-platform CC0 policy reaches game workers on Web Roblox and Unity without claiming runtime completion',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'all-cc0-handoff-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'company-learning'),{recursive:true});
 fs.writeFileSync(path.join(root,'company-learning/platform-release-roadmap.json'),JSON.stringify(central));
 for(const target of ['web','roblox','unity']){
  const plan=buildVibeAssetProductionPlan({repoRoot:root,target,manifest:{assets:[]},task:{gameId:'demo',releaseState:'release-confirmed',goal:'현재 게임 표현 교체'}});
  assert.equal(plan.libraryCc0Replacement.enabled,true);
  assert.equal(plan.libraryCc0Replacement.runtimeVerified,false);
  assert.ok(plan.libraryCc0Replacement.platforms.includes(target.toUpperCase()));
  assert.match(assetProductionGuidance(plan),/ALL PLATFORM LIBRARY CC0 REPLACEMENT/);
 }
});

test('external native customization rejects non-CC0 game assets despite company runtime approval',()=>{
 const base={family:'CHARACTER',sourceHash:'a'.repeat(64),path:'assets/source.glb',verifiedCompanyReusable:true,
  downloaded:true,sourceUrl:'https://kenney.nl/assets/characters',licenseEvidenceUrl:'https://kenney.nl/assets/characters'};
 for(const target of ['web','roblox']){
  const plan=planVibeExternalCustomization({request:'character model',gameId:'demo',target,approvedDesignFingerprint:'a'.repeat(64),
   ownerScope:{status:'ACTIVE',activeTargets:['WEB','ROBLOX'],ownerHeldTargets:[],existingPipelineOnly:true},
   assets:[{...base,id:'cc0',license:'CC0-1.0'},{...base,id:'commercial',license:'MIT'},{...base,id:'owned',license:'project-original'},{...base,id:'practice',license:'CC0',practiceOnly:true}]});
  const candidates=plan.references.flatMap(row=>row.sourceCandidates);
  assert.ok(candidates.some(row=>row.assetId==='cc0'));
  assert.ok(candidates.every(row=>row.assetId==='cc0'));
  assert.equal(plan.existingVerifiedSourceCount,1);
 }
});

test('existing F0 family optimization tracks all twelve families but only acts on declared assets',()=>{
  const rows=[
    {family:'CREATURE',assetId:'approved-wolf',requirementId:'enemy',status:'NATIVE_SOURCE_BINDING_REQUIRED',
     sourceHash:'hash',repairOwner:'EXISTING_GAME_SOURCE_WORKER'},
    {family:'MOTION',assetId:'wolf-motion',requirementId:'anim',status:'SOURCE_BOUND_RUNTIME_QA_REQUIRED',
     repairOwner:'EXISTING_GAME_SOURCE_WORKER'},
    {family:'BUILDING',assetId:null,requirementId:'hut',status:'SOURCE_ASSET_REQUIRED',
     repairOwner:'EXISTING_ASSET_DEVELOPMENT'}
  ];
  const assetWork={enabled:true,targets:rows};
  const library={fingerprint:'latest-library-snapshot',familyCandidates:{
    CREATURE:[{assetId:'approved-wolf'}],MOTION:[{assetId:'wolf-motion'}]
  }};
  const result=buildVibeFamilyAssetOptimizationHandoff({
    gameId:'approved-game',target:'roblox',automaticBindingWork:assetWork,dynamicLibrary:library
  });
  assert.equal(result.enabled,true);
  assert.equal(result.trigger,'F0_AND_EVERY_EXISTING_BUILD_UP');
  assert.equal(result.familyCount,12);
  assert.equal(result.familyTasks.length,12);
  assert.equal(result.requestedFamilyCount,3);
  assert.equal(result.blockedFamilyCount,1);
  assert.equal(result.selectionFingerprint,'latest-library-snapshot');
  const creature=result.familyTasks.find(row=>row.family==='CREATURE');
  assert.deepEqual(creature.selectedAssetIds,['approved-wolf']);
  assert.equal(creature.status,'QUEUED_EXISTING_GAME_ASSET_WORKER_UNVERIFIED');
  assert.equal(creature.appliedToRuntime,false);
  assert.equal(creature.runtimeVerified,false);
  assert.ok(creature.executionOrder.includes('MEASURE_ACTUAL_SAME_REVISION_MOBILE_FRAME_MEMORY_LOAD_AND_FAMILY_REGRESSION'));
  assert.ok(creature.executionOrder.includes('RESTORE_LAST_VERIFIED_CHECKPOINT_AND_REPAIR_SAME_SOURCE_ON_FAILURE'));
  assert.ok(creature.evidenceRequired.includes('LICENSE_SOURCE_HASH_AND_TARGET_PLATFORM_RIGHTS'));
  const building=result.familyTasks.find(row=>row.family==='BUILDING');
  assert.equal(building.status,'BLOCKED_SOURCE_LICENSE_OR_RIG_REQUIRES_REPAIR');
  assert.equal(building.missingSourceOrBinding[0].repairOwner,'EXISTING_ASSET_DEVELOPMENT');
  assert.equal(result.familyTasks.find(row=>row.family==='UI').status,'NO_DECLARED_GAME_ASSET_REQUIREMENT');
  assert.equal(result.noShadowPipeline,true);
  assert.equal(result.alreadyRuntimeVerifiedCount,0);
  const disabled=buildVibeFamilyAssetOptimizationHandoff({target:'roblox',automaticBindingWork:assetWork});
  assert.equal(disabled.enabled,false);
  assert.equal(disabled.familyTasks.every(row=>row.sourceWritePerformed===false),true);
});

test('existing game asset worker automatically receives family optimize-apply-measure-repair handoff',()=>{
  const plan=buildVibeAssetProductionPlan({
    target:'roblox',repoRoot:'/nonexistent-family-optimization-fixture',
    manifest:{assets:[]},task:{gameId:'demo',goal:'최신 라이브러리 게임 자산 최적화'}
  });
  assert.equal(plan.automaticAssetBindingWork.existingGraphicsProductionAndBuildUp,true);
  assert.equal(plan.familyAssetOptimization.familyCount,12);
  assert.equal(plan.familyAssetOptimization.noNewWorkerQueue,true);
  assert.equal(plan.familyAssetOptimization.runtimeVerified,false);
  assert.match(assetProductionGuidance(plan),/F0-F9 EXISTING ASSET FAMILY OPTIMIZATION EXECUTION/);
  assert.match(assetProductionGuidance(plan),/기기별 FPS\/메모리\/로딩 실측/);
});
