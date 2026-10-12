// 파일명: qa/company-roblox-production-plan.test.mjs
// 역할: 기존 바이브 공간·화면 도안의 실제 소스 바인딩과 절차적 월드 설계의 정적 계약 회귀 검사.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createVibeProceduralWorldLayout} from '../assets/vibe-environment-director.js';
import {buildRobloxProductionPlan,robloxProductionPromptLines,ROBLOX_PRODUCTION_PROFILES,buildSpatialBlueprintContract,validateSpatialBlueprint,buildInterfaceBlueprintContract,validateInterfaceBlueprint,productionBlueprintContractsForFiles} from '../tools/company-roblox-production-plan.mjs';
import {buildVibeAssetProductionPlan} from '../tools/vibe2-asset-production-plan.mjs';
import {buildGameSpecificBuildUpDirective,directivePrompt} from '../tools/company-build-up-directive.mjs';

const central=JSON.parse(fs.readFileSync(new URL('../company-learning/platform-release-roadmap.json',import.meta.url),'utf8'));
const policy=central.robloxStudioProductionFlowContract;

test('biome hierarchy partitions actual cells and connects routes patches and actors to valid parents',()=>{
  const input={approvedDesign:true,dimension:'3D',seed:'layer-world',width:24,height:24,cellSize:4,biome:'FOREST',climate:'TEMPERATE'};
  const world=createVibeProceduralWorldLayout(input),h=world.hierarchy;
  assert.ok(h);assert.equal(h.cellMembership.length,world.terrain.length);
  assert.deepEqual(h,createVibeProceduralWorldLayout(input).hierarchy);
  const ids=new Set([h.root.id,...h.regions.map(row=>row.id),...h.biomes.map(row=>row.id),...h.habitats.map(row=>row.id)]);
  for(const row of [...h.regions,...h.biomes,...h.habitats,...h.patches])assert.ok(ids.has(row.parentId));
  for(const row of h.cellMembership){assert.ok(ids.has(row.regionId));assert.ok(ids.has(row.biomeId));assert.ok(ids.has(row.habitatId));}
  assert.equal(h.habitats.reduce((count,row)=>count+row.cells.length,0),world.terrain.length);
  for(const route of h.routes)assert.ok(route.habitatIds.every(id=>ids.has(id)));
  for(const habitat of h.habitats){
    const cells=new Set(habitat.cells.map(row=>row.z*24+row.x)),visited=new Set(),queue=[habitat.cells[0]];
    for(let i=0;i<queue.length;i++){
      const cell=queue[i],id=cell.z*24+cell.x;if(visited.has(id))continue;visited.add(id);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=cell.x+dx,z=cell.z+dz;if(x>=0&&x<24&&z>=0&&z<24&&cells.has(z*24+x)&&!visited.has(z*24+x))queue.push({x,z});}
    }
    assert.equal(visited.size,cells.size);
  }
  assert.equal(h.gameplayAuthority,false);assert.equal(h.nativeRuntimeVerified,false);
});

test('nature-inspired ecosystems conserve matter and adapt seasonal cycles without spawning actors',()=>{
  const spec={approvedDesign:true,dimension:'3D',seed:'nature-cycle',width:24,height:24,biome:'FOREST',climate:'TEMPERATE'};
  const spring=createVibeProceduralWorldLayout({...spec,season:'SPRING'}),winter=createVibeProceduralWorldLayout({...spec,season:'WINTER'});
  for(const world of [spring,winter])for(const habitat of world.ecologyBalance.habitats){
    const eco=habitat.ecosystem;assert.ok(eco.processes.includes('DECOMPOSITION'));assert.ok(eco.processes.includes('MUTUALISM'));
    assert.ok(Math.abs(eco.matterTotal-1)<1e-10);
    for(const row of eco.trace){const values=Object.entries(row).filter(([key])=>key!=='step').map(([,value])=>value);assert.ok(values.every(value=>Number.isFinite(value)&&value>=0&&value<=1));assert.ok(Math.abs(values.reduce((a,b)=>a+b,0)-1)<1e-10);}
    assert.equal(eco.actualSpawnCount,0);assert.equal(eco.gameplayAuthority,false);assert.equal(eco.scientificSimulation,false);
  }
  const common=spring.ecologyBalance.habitats.find(row=>winter.ecologyBalance.habitats.some(other=>other.habitat===row.habitat));
  const cold=winter.ecologyBalance.habitats.find(row=>row.habitat===common.habitat);
  assert.ok(common.ecosystem.energy.primaryProduction>cold.ecosystem.energy.primaryProduction);
  assert.ok(common.ecosystem.seasonalCues.includes('POLLINATION'));
  assert.ok(cold.ecosystem.seasonalCues.includes('DORMANCY'));
});

test('biome composes real spawn stat and drop configuration within authored world budgets',()=>{
  const spec={approvedDesign:true,dimension:'3D',seed:'biome-gameplay',width:24,height:24,biome:'FOREST',climate:'TEMPERATE',
    ecologyActors:[{id:'wolf',kind:'MONSTER',species:'wolf',tier:'NORMAL',approved:true,gameplay:{health:100,damage:12,spawnCount:6,respawnSeconds:60,drops:[{itemId:'hide',chance:.4,quantity:1}]}}],
    ecologyGameplayRules:{enabled:true,ownerAuthorized:true,revision:'owner-biome-20261012',maxAlive:4,growthPerCell:.04,statMultiplierRange:[1,3],dropMultiplierRange:[.5,1.5],itemIds:['hide']}};
  const world=createVibeProceduralWorldLayout(spec),plan=world.biomeGameplay;
  assert.equal(plan.status,'GENERATED_SERVER_APPLICATION_REQUIRED');assert.equal(plan.entries.length,1);
  const row=plan.entries[0];assert.ok(row.stats.health>100);assert.ok(row.stats.damage>=12);
  assert.ok(row.spawn.maxAlive<=4);assert.ok(row.spawn.respawnSeconds>0);assert.ok(row.habitatId);
  assert.equal(row.drops[0].itemId,'hide');assert.ok(row.drops[0].chance>=0&&row.drops[0].chance<=1);
  assert.deepEqual(plan,createVibeProceduralWorldLayout(spec).biomeGameplay);
  assert.equal(plan.serverApplicationVerified,false);assert.equal(row.appliedToGame,false);
  assert.equal(createVibeProceduralWorldLayout({...spec,ecologyGameplayRules:{...spec.ecologyGameplayRules,ownerAuthorized:false}}).biomeGameplay.status,'REPAIR_REQUIRED');
  const invalid=createVibeProceduralWorldLayout({...spec,ecologyActors:[{...spec.ecologyActors[0],gameplay:{...spec.ecologyActors[0].gameplay,health:NaN}}]}).biomeGameplay;
  assert.equal(invalid.status,'REPAIR_REQUIRED');assert.deepEqual(invalid.entries,[]);
});

test('native biome factory executes deterministic relief and keeps collision authority outside the asset',{skip:!process.env.VIBE2_LUAU_BINARY},t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'biome-native-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const source=fs.readFileSync(new URL('../assets/roblox/common-environment-v1/RobloxCommonEnvironment.luau',import.meta.url),'utf8');
  const mock=`local vector={} local mt={}
function vector.new(x,y,z) return setmetatable({X=x or 0,Y=y or 0,Z=z or 0},mt) end
mt.__add=function(a,b)return vector.new(a.X+b.X,a.Y+b.Y,a.Z+b.Z)end
mt.__sub=function(a,b)return vector.new(a.X-b.X,a.Y-b.Y,a.Z-b.Z)end
mt.__mul=function(a,b)return vector.new(a.X*b,a.Y*b,a.Z*b)end
local Vector3=vector
local Color3={fromRGB=function(r,g,b)return {r,g,b} end}
local Enum=setmetatable({},{__index=function(t,k)local row=setmetatable({},{__index=function(_,v)return v end})rawset(t,k,row)return row end})
local Instance={new=function(kind)local obj={ClassName=kind,attrs={}}
function obj:SetAttribute(k,v)self.attrs[k]=v end
function obj:GetAttribute(k)return self.attrs[k]end return obj end}
local module=(function()\n${source}\nend)()
local root,a=module.CreateBiomeKit('FOREST',{procedural=true,seed='seed-a',gridSize=12})
local _,b=module.CreateBiomeKit('FOREST',{procedural=true,seed='seed-a',gridSize=12})
local _,c=module.CreateBiomeKit('FOREST',{procedural=true,seed='seed-b',gridSize=12})
assert(#a.terrainCells==144)
local varied=false local changed=false
for i,tile in a.terrainCells do
assert(tile.CanCollide==false and tile.Size.Y>=2)
assert(tile:GetAttribute('SurfaceHeight')==b.terrainCells[i]:GetAttribute('SurfaceHeight'))
if tile:GetAttribute('SurfaceHeight')>0 then varied=true end
if tile:GetAttribute('SurfaceHeight')~=c.terrainCells[i]:GetAttribute('SurfaceHeight')then changed=true end
if math.abs(tile.Position.X)<=8 then assert(tile:GetAttribute('SurfaceHeight')==0)end
end
assert(varied and changed)
local _,legacy=module.CreateBiomeKit('FOREST',{})assert(#legacy.terrainCells==0)
assert(not pcall(function()module.CreateBiomeKit('FOREST',{scale=0})end))
print('NATIVE_BIOME_FACTORY_MOCK_PASS')`;
  const file=path.join(dir,'biome.luau');fs.writeFileSync(file,mock);
  const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[file],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);assert.match(result.stdout,/NATIVE_BIOME_FACTORY_MOCK_PASS/);
});

test('simple genre menus and creature identity reach owned presentation workers without inventing repair gameplay',()=>{
  const args={gameId:'demo',platform:'ROBLOX',policy,responsibleFiles:['roblox-games/demo/client/Main.client.luau','roblox-games/demo/server/Main.server.luau'],design:{genre:'SURVIVAL',identity:'existing survival'},focus:'USABILITY'};
  const plan=buildRobloxProductionPlan(args);
  assert.deepEqual(plan.simpleMenuDirection.candidates,['가방','제작','지도']);
  assert.equal(plan.simpleMenuDirection.candidateAuthority,'EXISTING_HANDLER_MATCH_ONLY');
  assert.equal(plan.creatureIdentityDirection.runtimeVerified,false);
  assert.match(plan.creatureIdentityDirection.behavior,/cannot add behavior or alter hitboxes/);
  const client=robloxProductionPromptLines(plan,{responsibleFiles:['client/Main.client.luau']}).join('\n');
  assert.match(client,/SIMPLE_MENU=/);assert.match(client,/CREATURE_IDENTITY=/);
  const server=robloxProductionPromptLines(plan,{responsibleFiles:['server/Main.server.luau']}).join('\n');
  assert.doesNotMatch(server,/SIMPLE_MENU=|CREATURE_IDENTITY=/);
  const repair=buildRobloxProductionPlan({...args,focus:'STABILITY'});
  assert.equal(repair.simpleMenuDirection,null);assert.equal(repair.creatureIdentityDirection,null);
  const unknown=buildRobloxProductionPlan({...args,design:{genre:'UNLISTED',identity:'approved game'}});
  assert.deepEqual(unknown.simpleMenuDirection.candidates,[]);
  const puzzle=buildRobloxProductionPlan({...args,design:{genre:'PUZZLE',identity:'approved puzzle'}});
  assert.deepEqual(puzzle.simpleMenuDirection.candidates,['되돌리기','재시작','목표']);
  assert.equal(puzzle.aiParticipantDirection,null);
  const companions=buildRobloxProductionPlan({...args,focus:'CORE',design:{genre:'SURVIVAL',coreLoop:['동료와 탐험'],identity:'approved survival'}});
  const actorPrompt=robloxProductionPromptLines(companions,{responsibleFiles:['server/Main.server.luau']}).join('\n');
  assert.match(actorPrompt,/AI_PARTICIPANT=/);assert.match(actorPrompt,/fhfgjjgdd75/);
  assert.match(actorPrompt,/never invent Roblox UserIds/);
  assert.match(actorPrompt,/나무 좀 모을게/);
  assert.match(actorPrompt,/same-event dedupe/);
  assert.match(actorPrompt,/Missing sibling implementation remains an explicit gap/);
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
