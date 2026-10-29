import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {synthesizeVibe59Pathfinding,verifyVibe59PathfindingScenarios} from '../tools/vibe59-pathfinding.mjs';
import {synthesizeVibe59QualityGameplay} from '../tools/vibe59-quality-gameplay.mjs';
import {createVibe59CodeCandidate,buildVibe59AutonomyPlan} from '../tools/vibe2-v59-autonomy.mjs';

const spec={operation:'ai-pathfinding-chase',functionName:'chase',
 pathfindingService:'pathfindingService',range:75,interval:1,
 agentRadius:2,agentHeight:5,maxWaypoints:24};
const source='local pathfindingService = game:GetService("PathfindingService")\n'+
 'local function chase(npc, target)\n local state = brains[npc]\n'+
 ' if state.ai.lastMoveAt and state.ai.planning then end\n -- VIBE59_QUALITY_SLOT\nend';
const facts={now:10,lastMoveAt:1,distance:20,npcValid:true,targetValid:true,
 npcAlive:true,targetAlive:true,planning:false,computeOk:true,
 waypointCount:7,targetStillValid:true};
const allowed={facts,expectedApplied:true,expectedLastMoveAt:10};
const stopped={facts:{...facts,computeOk:false,waypointCount:0},
 expectedApplied:false,expectedLastMoveAt:10};
const proofRows=[allowed,stopped];
test('actual Roblox PathfindingService code is source-grounded and releases planning lock',()=>{
 const x=synthesizeVibe59Pathfinding({spec,source,sourcePath:'server/Mob.server.luau',
  replaceAnchor:'-- VIBE59_QUALITY_SLOT'});
 assert.equal(x.operation,'ai-pathfinding-chase');
 assert.match(x.source,/:CreatePath\(\{AgentRadius = 2/);
 assert.match(x.source,/:ComputeAsync\(root.Position, targetRoot.Position\)/);
 assert.match(x.source,/path\.Status/); // no blind straight-line path
 assert.match(x.source,/if #waypoints < 2 or #waypoints > 24/);
 assert.match(x.source,/state\.ai\.planning = false/);
 assert.match(x.source,/humanoid:MoveTo\(waypoint.Position\)/);
 assert.ok(x.source.indexOf('state.ai.lastMoveAt = now')<
  x.source.indexOf('planned:ComputeAsync('));
 assert.ok(x.source.indexOf('state.ai.planning = false')<
  x.source.indexOf('humanoid:MoveTo(waypoint.Position)'));
 assert.equal(x.sourceWrite,false);
 assert.equal(x.runtimeVerified,false);
});
test('failure consumes planning cooldown, duplicates and stale target rejected',()=>{
 assert.equal(verifyVibe59PathfindingScenarios({spec,scenarios:proofRows}).pass,true);
 for(const bad of [{planning:true},{targetStillValid:false},{distance:200},
  {npcAlive:false},{targetAlive:false},{waypointCount:99}]){
  const denied={facts:{...facts,...bad},expectedApplied:false,
   expectedLastMoveAt:bad.planning===true||bad.distance===200||bad.npcAlive===false||bad.targetAlive===false?1:10};
  assert.equal(verifyVibe59PathfindingScenarios({spec,scenarios:[allowed,denied]}).pass,true,
   JSON.stringify(bad));
 }
 const wrong=verifyVibe59PathfindingScenarios({spec,scenarios:[allowed,
  {...stopped,expectedLastMoveAt:1}]});
 assert.equal(wrong.pass,false);
});
test('pathfinding requires existing server function, service and state fields',()=>{
 const input={spec,source,sourcePath:'server/Mob.server.luau',
  replaceAnchor:'-- VIBE59_QUALITY_SLOT'};
 assert.throws(()=>synthesizeVibe59Pathfinding({...input,
  sourcePath:'client/Mob.client.luau'}),/SERVER_ONLY/);
 assert.throws(()=>synthesizeVibe59Pathfinding({...input,
  source:source.replace('state.ai.planning','state.ai.unknown')}),/EXISTING_FIELD/);
 assert.throws(()=>synthesizeVibe59Pathfinding({...input,
  source:source.replace('local pathfindingService =','local other =')}),/SERVICE_MISSING/);
 assert.throws(()=>synthesizeVibe59Pathfinding({...input,
  source:source.replace('\n -- VIBE59_QUALITY_SLOT','\nend\n -- VIBE59_QUALITY_SLOT')}),/SCOPE_/);
 assert.throws(()=>synthesizeVibe59Pathfinding({...input,
  spec:{...spec,maxWaypoints:100}}),/INVALID_NUMBER/);
 assert.throws(()=>verifyVibe59PathfindingScenarios({spec,scenarios:[allowed]}),/SCENARIOS_REQUIRED/);
});
test('owner-approved surface exclusion is explicit; regular solid collisions still reject',()=>{
 const base={operation:'building-authorized-placement',functionName:'place',
  bindings:{blueprints:'blueprints',authorizePlace:'canPlace',buildingsFolder:'built'},
  material:'wood',cost:2,range:30,placeCooldown:1};
 const source='local blueprints = {}\nlocal built = workspace.Structures\n'+
  'local function canPlace(p,id,where) return true end\n'+
  'local function isPlacementSurface(player, part) return part:GetAttribute("BuildSurface") == true end\n'+
  'local function place(player, blueprintId, placementCFrame)\n'+
  ' local state = profiles[player]\n if state.inventory.wood and state.building.lastPlaceAt'+
  ' and state.building.lastPlacementKey and state.building.placing then end\n'+
  ' -- VIBE59_QUALITY_SLOT\nend';
 const opts={source,sourcePath:'server/Build.server.luau',replaceAnchor:'-- VIBE59_QUALITY_SLOT'};
 const strict=synthesizeVibe59QualityGameplay({...opts,spec:base}).source;
 assert.match(strict,/if part\.CanCollide then built:Destroy\(\); return false end/);
 const approved=synthesizeVibe59QualityGameplay({...opts,
  spec:{...base,bindings:{...base.bindings,isPlacementSurface:'isPlacementSurface'}}}).source;
 assert.match(approved,/if part\.CanCollide and not isPlacementSurface\(player, part\)/);
 assert.throws(()=>synthesizeVibe59QualityGameplay({...opts,
  source:source.replace('local function isPlacementSurface','local function notAuthorized'),
  spec:{...base,bindings:{...base.bindings,isPlacementSurface:'isPlacementSurface'}}}),
  /EXISTING_DEPENDENCY/);
});
test('approved pathfinding integrates with existing no-write Vibe candidate worker',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-pathfinder-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const relative='server/Mob.server.luau';
 fs.writeFileSync(path.join(root,relative),source);
 const request={ownerApproved:true,path:relative,find:'-- VIBE59_QUALITY_SLOT',
  robloxPathfindingAction:spec,scenarios:proofRows};
 const make=x=>createVibe59CodeCandidate({order:{vibe59CodeRequest:x},target:'roblox',
  sourceRoot:root,responsibleFiles:[relative]});
 const candidate=make(request);
 assert.equal(candidate.vibe59CodeKind,'ROBLOX_PATHFINDING');
 assert.equal(candidate.vibe59TestPlan.pass,true);
 assert.equal(candidate.ruleDigest.length,64);
 assert.match(candidate.edits[0].replace,/planned:ComputeAsync/);
 assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
 assert.throws(()=>make({...request,ownerApproved:false}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
 assert.throws(()=>make({...request,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
 assert.throws(()=>make({...request,robloxQualityAction:{}}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
});
test('planner reports pathfinder as real seventh advanced option without claiming Studio tests',()=>{
 const plan=buildVibe59AutonomyPlan({target:'roblox',order:{goal:'monster chase'}});
 assert.equal(plan.advancedGameplay.count,7);
 assert.ok(plan.advancedGameplay.mechanics.includes('ai-pathfinding-chase'));
 assert.equal(plan.advancedGameplay.runtimeVerified,false);
});
