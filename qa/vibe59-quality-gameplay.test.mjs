// Six genuinely distinct Roblox server-gameplay code paths, with observable
// offline acceptance/rejection effects. Studio gameplay remains unverified.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {VIBE59_QUALITY_GAMEPLAY_ACTIONS,synthesizeVibe59QualityGameplay,
 verifyVibe59QualityScenarios} from '../tools/vibe59-quality-gameplay.mjs';
import {createVibe59CodeCandidate,buildVibe59AutonomyPlan} from '../tools/vibe2-v59-autonomy.mjs';

const slot=' -- VIBE59_QUALITY_SLOT\nend';
const cases=[
 {id:'combat-authoritative-melee',api:'TakeDamage(15)',
  spec:{operation:'combat-authoritative-melee',functionName:'attack',
   bindings:{authorizeAttack:'canAttack'},damage:15,range:12,cooldown:2},
  source:'local function canAttack(player, target) return true end\n'+
   'local function attack(player, target)\n local state = profiles[player]\n'+
   ' if state.combat.lastAttackAt then end\n'+slot,
  yes:{playerValid:true,authorized:true,targetValid:true,targetAlive:true,
   lastAttackAt:0,now:10,distance:8},
  yesEffect:{damageDealt:15,lastAttackAt:10},
  no:{playerValid:true,authorized:true,targetValid:true,targetAlive:true,
   lastAttackAt:0,now:10,distance:30},
  noEffect:{damageDealt:0,lastAttackAt:0}},
 {id:'building-authorized-placement',api:'GetBoundingBox()',
  spec:{operation:'building-authorized-placement',functionName:'place',
   bindings:{blueprints:'blueprints',authorizePlace:'canPlace',buildingsFolder:'buildingsFolder'},
   material:'wood',cost:2,range:40,placeCooldown:1},
  source:'local blueprints = {}\nlocal buildingsFolder = workspace\n'+
   'local function canPlace(player, id, pos) return true end\n'+
   'local function place(player, blueprintId, placementCFrame)\n'+
   ' local state = profiles[player]\n if state.inventory.wood and state.building.lastPlaceAt and state.building.lastPlacementKey then end\n'+slot,
  yes:{playerValid:true,authorized:true,blueprintValid:true,folderValid:true,
   withinRange:true,collisionFree:true,materialCount:7,now:12,lastPlaceAt:8,duplicatePlacement:false},
  yesEffect:{materialCount:5,modelPlaced:true,lastPlaceAt:12,placementRegistered:true},
  no:{playerValid:true,authorized:true,blueprintValid:true,folderValid:true,
   withinRange:true,collisionFree:false,materialCount:7,now:12,lastPlaceAt:8,duplicatePlacement:false},
  noEffect:{materialCount:7,modelPlaced:false,lastPlaceAt:8,placementRegistered:false}},
 {id:'crafting-atomic-recipe',api:'state.inventory.sword = state.inventory.sword + 1',
  spec:{operation:'crafting-atomic-recipe',functionName:'craft',
   inputs:[{field:'wood',amount:2},{field:'ore',amount:3}],
   output:'sword',outputAmount:1,outputLimit:10},
  source:'local function craft(player)\n local state = profiles[player]\n'+
   ' if state.inventory.wood and state.inventory.ore and state.inventory.sword then end\n'+slot,
  yes:{inventory:{wood:5,ore:5,sword:0}},yesEffect:{inventory:{wood:3,ore:2,sword:1}},
  no:{inventory:{wood:5,ore:1,sword:0}},noEffect:{inventory:{wood:5,ore:1,sword:0}}},
 {id:'bestiary-confirmed-death',api:'GetAttribute("LastHitUserId")',
  spec:{operation:'bestiary-confirmed-death',functionName:'credit',species:'Wolf',countLimit:99,
   bindings:{monstersFolder:'monstersFolder'}},
  source:'local monstersFolder = workspace.Monsters\n'+
   'local function credit(player, monster)\n local state = profiles[player]\n'+
   ' if state.bestiary.kills.Wolf and state.bestiary.discovered.Wolf then end\n'+slot,
  yes:{monsterValid:true,dead:true,speciesMatches:true,killerMatches:true,
   alreadyCredited:false,killCount:0,discovered:false},
  yesEffect:{killCount:1,discovered:true,credited:true},
  no:{monsterValid:true,dead:false,speciesMatches:true,killerMatches:true,
   alreadyCredited:false,killCount:0,discovered:false},
  noEffect:{killCount:0,discovered:false,credited:false}},
 {id:'saving-revisioned-update',api:'UpdateAsync(key',
  spec:{operation:'saving-revisioned-update',functionName:'save',
   bindings:{store:'store',mergeProfile:'mergeProfile',snapshotProfile:'snapshotProfile'},maxAttempts:3},
  source:'local store = dataStore\nlocal function mergeProfile(previous, state) return state end\n'+
   'local function snapshotProfile(state) return table.clone(state) end\n'+
   'local function save(player)\n local state = profiles[player]\n'+
   ' if state.save.revision and state.save.dirty and state.save.saving then end\n'+slot,
  yes:{dirty:true,saving:false,playerValid:true,snapshotValid:true,staleWrite:false,
   revisionAtStart:4,revisionAfter:4,attemptResults:[false,true]},
  yesEffect:{attempts:2,dirty:false,saving:false},
  no:{dirty:true,saving:false,playerValid:true,snapshotValid:true,staleWrite:false,
   revisionAtStart:4,revisionAfter:4,attemptResults:[false,false,false]},
  noEffect:{attempts:3,dirty:true,saving:false}},
 {id:'ai-throttled-chase',api:'MoveTo(targetRoot.Position)',
  spec:{operation:'ai-throttled-chase',functionName:'chase',range:30,interval:1},
  source:'local function chase(npc, target)\n local state = npcStates[npc]\n'+
   ' if state.ai.lastMoveAt then end\n'+slot,
  yes:{npcValid:true,targetValid:true,npcAlive:true,distance:12,lastMoveAt:1,now:5},
  yesEffect:{lastMoveAt:5,moveIssued:true},
  no:{npcValid:true,targetValid:true,npcAlive:true,distance:50,lastMoveAt:1,now:5},
  noEffect:{lastMoveAt:1,moveIssued:false}}
];
const sourcePath='server/Gameplay.server.luau';
const scenarioSet=row=>[
 {name:'authorized',facts:row.yes,expectedApplied:true,expectedEffects:row.yesEffect},
 {name:'denied',facts:row.no,expectedApplied:false,expectedEffects:row.noEffect}
];
test('six real gameplay code generators are different, source-grounded and server-only',()=>{
 assert.equal(VIBE59_QUALITY_GAMEPLAY_ACTIONS.length,6);
 assert.equal(new Set(VIBE59_QUALITY_GAMEPLAY_ACTIONS.map(x=>x.id)).size,6);
 const outputs=new Set();
 for(const row of cases){
  const code=synthesizeVibe59QualityGameplay({spec:row.spec,source:row.source,
   sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'});
  assert.equal(code.operation,row.id);
  assert.equal(code.generatedMechanic,true);
  assert.match(code.source,/if type\(state\) ~= "table" then return false end/);
  assert.ok(code.source.includes(row.api),row.id);
  assert.equal(code.runtimeVerified,false);
  assert.equal(code.modelUsed,false);
  assert.equal(code.sourceWrite,false);
  assert.equal(code.safety.serverOnly,true);
  outputs.add(code.source);
 }
 assert.equal(outputs.size,6);
});
test('independent offline game decision oracle validates six accepted and six denied scenarios',()=>{
 for(const row of cases){
  const proof=verifyVibe59QualityScenarios({spec:row.spec,scenarios:scenarioSet(row)});
  assert.equal(proof.pass,true,row.id);
  assert.deepEqual(proof.cases.map(x=>x.applied),[true,false],row.id);
  assert.equal(proof.runtimeVerified,false);
  assert.equal(proof.sourceWrite,false);
  const bad=verifyVibe59QualityScenarios({spec:row.spec,scenarios:[
   scenarioSet(row)[0],{...scenarioSet(row)[1],
    expectedEffects:scenarioSet(row)[0].expectedEffects}]});
  assert.equal(bad.pass,false,row.id);
 }
});
test('reject ungrounded fields, client scripts, unsourced bindings and unsafe numerical parameters',()=>{
 for(const row of cases){
  const build=kwargs=>synthesizeVibe59QualityGameplay({
   spec:row.spec,source:row.source,sourcePath,
   replaceAnchor:'-- VIBE59_QUALITY_SLOT',...kwargs});
  assert.throws(()=>build({sourcePath:'client/Gameplay.client.luau'}),/SERVER_ONLY/);
  assert.throws(()=>build({source:row.source.replace(' -- VIBE59_QUALITY_SLOT',
   ' local message = "-- VIBE59_QUALITY_SLOT"')}),/EXACT_SLOT_REQUIRED/);
  assert.throws(()=>build({source:row.source+' -- VIBE59_QUALITY_SLOT'}),/EXACT_SLOT_REQUIRED/);
  assert.throws(()=>build({spec:{...row.spec,functionName:'nonexistent'}}),
   /EXACT_FUNCTION_REQUIRED/);
  assert.throws(()=>verifyVibe59QualityScenarios({spec:row.spec,
   scenarios:[scenarioSet(row)[0]]}),/SCENARIOS_REQUIRED/);
 }
 assert.throws(()=>synthesizeVibe59QualityGameplay({spec:{...cases[0].spec,damage:Infinity},
  source:cases[0].source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}),/BAD_NUMBER/);
 assert.throws(()=>synthesizeVibe59QualityGameplay({spec:{...cases[2].spec,
  inputs:[{field:'wood',amount:2},{field:'wood',amount:4}]},
  source:cases[2].source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}),/RECIPE_FIELD_ALIAS/);
});
test('crafting cannot partially consume when input fails and saving retains dirty revision',()=>{
 const craft=cases[2];
 const proof=verifyVibe59QualityScenarios({spec:craft.spec,scenarios:scenarioSet(craft)});
 assert.deepEqual(proof.cases[1].effects.inventory,craft.no.inventory);
 const saving=cases[4];
 const revisionChanged=verifyVibe59QualityScenarios({spec:saving.spec,scenarios:[
  scenarioSet(saving)[1],
  {name:'revision changed while writing',facts:{...saving.yes,revisionAfter:5},
   expectedApplied:true,expectedEffects:{attempts:2,dirty:true,saving:false}}
 ]});
 assert.equal(revisionChanged.pass,true);
});
test('advanced gameplay enters existing Vibe code worker with actual edit and owner scope',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-quality-'));
 t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 fs.mkdirSync(path.join(directory,'server'));
 const filename=path.join(directory,sourcePath),row=cases[0];
 fs.writeFileSync(filename,row.source);
 const req={ownerApproved:true,path:sourcePath,find:'-- VIBE59_QUALITY_SLOT',
  robloxQualityAction:row.spec,scenarios:scenarioSet(row)};
 const make=x=>createVibe59CodeCandidate({order:{vibe59CodeRequest:x},
  sourceRoot:directory,responsibleFiles:[sourcePath],target:'roblox'});
 const candidate=make(req);
 assert.equal(candidate.vibe59CodeKind,'ROBLOX_ADVANCED_GAMEPLAY');
 assert.equal(candidate.vibe59GameplayMechanic,'combat-authoritative-melee');
 assert.equal(candidate.vibe59TestPlan.pass,true);
 assert.equal(candidate.vibe59TestPlan.cases.length,2);
 assert.equal(candidate.ruleDigest.length,64);
 assert.equal(candidate.edits.length,1);
 assert.match(candidate.edits[0].replace,/targetHumanoid:TakeDamage\(15\)/);
 assert.equal(fs.readFileSync(filename,'utf8'),row.source);
 assert.throws(()=>make({...req,ownerApproved:false}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
 assert.throws(()=>make({...req,path:'../Gameplay.server.luau'}),/UNAPPROVED_SOURCE/);
 assert.throws(()=>make({...req,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
 assert.throws(()=>make({...req,robloxDomainAction:{}}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
});
test('read-only planning distinguishes high-fidelity gameplay from simple state recipes',()=>{
 const plan=buildVibe59AutonomyPlan({target:'roblox',order:{goal:'monster combat'}});
 assert.equal(plan.advancedGameplay.count,6);
 assert.equal(plan.advancedGameplay.mechanics.length,6);
 assert.equal(plan.advancedGameplay.runtimeVerified,false);
 assert.equal(plan.skillCatalog.total,109);
 assert.equal(plan.sourceWrite,false);
});


test('insertion outside a completed Lua function is rejected instead of making broken code',()=>{
 const row=cases[0];
 const finished=row.source.replace('\n -- VIBE59_QUALITY_SLOT',
  '\nend\n -- VIBE59_QUALITY_SLOT');
 assert.throws(()=>synthesizeVibe59QualityGameplay({spec:row.spec,source:finished,
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}),/FUNCTION_SCOPE_UNPROVEN/);
});
test('combat does not emit damage before checking attacker alive; building uses rotated bounds',()=>{
 const combat=synthesizeVibe59QualityGameplay({spec:cases[0].spec,source:cases[0].source,
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(combat,/attackerHumanoid\.Health <= 0/);
 assert.ok(combat.indexOf('attackerHumanoid.Health <= 0')<combat.indexOf(':TakeDamage('));
 const build=synthesizeVibe59QualityGameplay({spec:cases[1].spec,source:cases[1].source,
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(build,/built:GetBoundingBox\(\)/);
 assert.match(build,/built:Destroy\(\); return false/);
 assert.ok(build.indexOf('GetBoundingBox()')<build.indexOf('state.inventory.wood = state.inventory.wood -'));
});


test('combat line of sight and self-target checks precede applying damage',()=>{
 const row=cases[0],source=synthesizeVibe59QualityGameplay({
  spec:row.spec,source:row.source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(source,/workspace:Raycast/);
 assert.match(source,/attackerHumanoid == targetHumanoid/);
 assert.ok(source.indexOf('workspace:Raycast')<source.indexOf(':TakeDamage('));
 const denied=verifyVibe59QualityScenarios({spec:row.spec,scenarios:[
  scenarioSet(row)[0],
  {facts:{...row.yes,lineOfSight:false},expectedApplied:false,
   expectedEffects:{damageDealt:0,lastAttackAt:0}}]});
 assert.equal(denied.pass,true);
});
test('building duplicate and rapid click attempts do not consume resources',()=>{
 const row=cases[1],source=synthesizeVibe59QualityGameplay({
  spec:row.spec,source:row.source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(source,/lastPlacementKey/);
 assert.match(source,/lastPlaceAt/);
 assert.match(source,/built:GetBoundingBox/);
 const proof=verifyVibe59QualityScenarios({spec:row.spec,scenarios:[
  scenarioSet(row)[0],
  {facts:{...row.yes,duplicatePlacement:true},expectedApplied:false,
   expectedEffects:{materialCount:7,modelPlaced:false,lastPlaceAt:8,placementRegistered:false}}]});
 assert.equal(proof.pass,true);
 assert.throws(()=>synthesizeVibe59QualityGameplay({spec:row.spec,
  source:row.source.replace('state.building.lastPlaceAt','state.building.missing'),
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}),/EXISTING_FIELD/);
});
test('snapshot-saving rejects concurrent writes and stale persisted revisions',()=>{
 const row=cases[4],source=synthesizeVibe59QualityGameplay({
  spec:row.spec,source:row.source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(source,/snapshotProfile\(state\)/);
 assert.match(source,/state\.save\.saving = true/);
 assert.match(source,/previous\.save\.revision > revisionAtStart/);
 assert.ok(source.indexOf('snapshotProfile(state)')<source.indexOf('UpdateAsync'));
 const proof=verifyVibe59QualityScenarios({spec:row.spec,scenarios:[
  scenarioSet(row)[0],
  {facts:{...row.yes,staleWrite:true},expectedApplied:false,
   expectedEffects:{attempts:3,dirty:true,saving:false}}]});
 assert.equal(proof.pass,true);
 assert.throws(()=>synthesizeVibe59QualityGameplay({spec:row.spec,
  source:row.source.replace('state.save.saving','state.save.missing'),
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}),/EXISTING_FIELD/);
});
test('bestiary only credits monsters owned by the server monster folder',()=>{
 const row=cases[3],source=synthesizeVibe59QualityGameplay({
  spec:row.spec,source:row.source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(source,/monster:IsDescendantOf\(monstersFolder\)/);
 const proof=verifyVibe59QualityScenarios({spec:row.spec,scenarios:[
  scenarioSet(row)[0],
  {facts:{...row.yes,authorizedMonsterFolder:false},expectedApplied:false,
   expectedEffects:{killCount:0,discovered:false,credited:false}}]});
 assert.equal(proof.pass,true);
});
test('scenario evidence uses structural equivalence rather than object property order',()=>{
 const row=cases[4],proof=verifyVibe59QualityScenarios({spec:row.spec,scenarios:[
  {...scenarioSet(row)[0],expectedEffects:{saving:false,dirty:false,attempts:2}},
  {...scenarioSet(row)[1],expectedEffects:{dirty:true,saving:false,attempts:3}}]});
 assert.equal(proof.pass,true);
});


test('generated Lua refuses NaN, infinity and negative crafting or building resources',()=>{
 const craft=synthesizeVibe59QualityGameplay({spec:cases[2].spec,source:cases[2].source,
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(craft,/state\.inventory\.wood ~= state\.inventory\.wood/);
 assert.match(craft,/state\.inventory\.ore == math\.huge/);
 assert.match(craft,/state\.inventory\.sword < 0/);
 assert.ok(craft.indexOf('math.huge')<craft.indexOf('state.inventory.wood = state.inventory.wood -'));
 const building=synthesizeVibe59QualityGameplay({spec:cases[1].spec,source:cases[1].source,
  sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(building,/state\.inventory\.wood == math\.huge/);
 assert.match(building,/state\.inventory\.wood < 0/);
});
test('saving rejects shallow snapshot aliases and unsafe revision counters',()=>{
 const saving=synthesizeVibe59QualityGameplay({spec:cases[4].spec,
  source:cases[4].source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(saving,/snapshot == state/);
 assert.match(saving,/snapshot\.save == state\.save/);
 assert.match(saving,/state\.save\.revision == math\.huge/);
 const bestiary=synthesizeVibe59QualityGameplay({spec:cases[3].spec,
  source:cases[3].source,sourcePath,replaceAnchor:'-- VIBE59_QUALITY_SLOT'}).source;
 assert.match(bestiary,/typeof\(monstersFolder\) ~= "Instance"/);
});
test('structure and save decisions reject active cooldown or concurrent save lock',()=>{
 const build=cases[1],save=cases[4];
 assert.equal(verifyVibe59QualityScenarios({spec:build.spec,scenarios:[
  scenarioSet(build)[0],
  {facts:{...build.yes,now:8.2},expectedApplied:false,
   expectedEffects:{materialCount:7,modelPlaced:false,lastPlaceAt:8,placementRegistered:false}}
 ]}).pass,true);
 assert.equal(verifyVibe59QualityScenarios({spec:save.spec,scenarios:[
  scenarioSet(save)[0],
  {facts:{...save.yes,saving:true},expectedApplied:false,
   expectedEffects:{attempts:0,dirty:true,saving:false}}
 ]}).pass,true);
});
