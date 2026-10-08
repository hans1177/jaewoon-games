// 파일명: qa/company-roblox-production-plan.test.mjs
// 역할: 기존 바이브 공간·화면 도안의 실제 소스 바인딩과 절차적 월드 설계의 정적 계약 회귀 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRobloxProductionPlan,robloxProductionPromptLines,ROBLOX_PRODUCTION_PROFILES,buildSpatialBlueprintContract,validateSpatialBlueprint,buildInterfaceBlueprintContract,validateInterfaceBlueprint,productionBlueprintContractsForFiles} from '../tools/company-roblox-production-plan.mjs';
import {buildGameSpecificBuildUpDirective,directivePrompt} from '../tools/company-build-up-directive.mjs';

const central=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
const policy=central.robloxStudioProductionFlowContract;

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

test('Unity Web directive uses the real canonical C# project instead of browser source instructions',()=>{
  const root='unity-games/garden',own=[root+'/Assets/Scripts/GameCore.cs',root+'/Assets/Scripts/RuntimeBootstrap.cs'];
  const d=buildGameSpecificBuildUpDirective({gameId:'garden',platform:'WEB',sourceRoot:root,designRecord:{content:design},sourceObservation:{...source,topFiles:own.map(file=>({file,score:10}))},responsibleFiles:own});
  assert.equal(d.productionPlan.platform,'UNITY');assert.equal(d.productionPlan.executionSurface,'UNITY_WEB');
  assert.equal(d.robloxProductionPlan,null);
  assert.match(directivePrompt(d),/UNITY_PRODUCTION_QUALITY=.*EXISTING_CSHARP/);
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
  assert.equal(make({platform:'WEB'}),null);
  assert.equal(make({platform:'UNITY'}),null);
  assert.equal(make({policy:{}}),null);
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

