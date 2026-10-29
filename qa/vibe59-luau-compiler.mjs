// Compile actual emitted Roblox Luau, not just JS scenario stand-ins.
// Run with an official, SHA-verified luau-compile: VIBE59_LUAU_COMPILER=/path/to/luau-compile node qa/vibe59-luau-compiler.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {VIBE59_LUAU_CODING_SKILLS_109,synthesizeVibe59LuauSkill} from '../tools/vibe59-luau-skills109.mjs';
import {VIBE59_QUALITY_GAMEPLAY_ACTIONS,synthesizeVibe59QualityGameplay} from '../tools/vibe59-quality-gameplay.mjs';
import {synthesizeVibe59Pathfinding} from '../tools/vibe59-pathfinding.mjs';
import {synthesizeVibe59CraftingTransaction} from '../tools/vibe59-crafting-transaction.mjs';

const bin=process.env.VIBE59_LUAU_COMPILER||process.argv[2];
if(!bin||!fs.existsSync(bin))throw Error('VIBE59_OFFICIAL_LUAU_COMPILER_REQUIRED');
const slot='-- VIBE59_QUALITY_SLOT';
const make=(signature,body,helpers='')=>
  helpers+'local function '+signature+'\n local state = profiles[player]\n '+body+
  '\n '+slot+'\nend\n';
const scenario=Object.freeze([
 {id:'combat-authoritative-melee',
  spec:{operation:'combat-authoritative-melee',functionName:'attack',bindings:{authorizeAttack:'canAttack'},damage:14,range:12,cooldown:1},
  source:make('attack(player, target)','if state.combat.lastAttackAt then end',
    'local function canAttack(player, target) return true end\n')},
 {id:'building-authorized-placement',
  spec:{operation:'building-authorized-placement',functionName:'place',
   bindings:{blueprints:'blueprints',authorizePlace:'canPlace',buildingsFolder:'buildingsFolder',
    isPlacementSurface:'isPlacementSurface'},material:'wood',cost:2,range:40,placeCooldown:0.5},
  source:make('place(player, blueprintId, placementCFrame)',
    'if state.inventory.wood and state.building.lastPlaceAt and state.building.lastPlacementKey and state.building.placing then end',
    'local blueprints = {}\nlocal buildingsFolder = workspace.Buildings\n'+
    'local function canPlace(player, id, where) return true end\n'+
    'local function isPlacementSurface(player, part) return part:GetAttribute("BuildingSurface") == true end\n')},
 {id:'crafting-atomic-recipe',
  spec:{operation:'crafting-atomic-recipe',functionName:'craft',inputs:[{field:'wood',amount:2},{field:'ore',amount:1}],output:'sword',outputAmount:1,outputLimit:5},
  source:make('craft(player)','if state.inventory.wood and state.inventory.ore and state.inventory.sword then end')},
 {id:'bestiary-confirmed-death',
  spec:{operation:'bestiary-confirmed-death',functionName:'credit',species:'Wolf',countLimit:99,bindings:{monstersFolder:'monstersFolder'}},
  source:make('credit(player, monster)','if state.bestiary.kills.Wolf and state.bestiary.discovered.Wolf then end',
    'local monstersFolder = workspace.Monsters\n')},
 {id:'saving-revisioned-update',
  spec:{operation:'saving-revisioned-update',functionName:'save',bindings:{store:'store',mergeProfile:'mergeProfile'},maxAttempts:3},
  source:make('save(player)','if state.save.revision and state.save.dirty and state.save.saving then end',
    'local store = {}\nlocal function mergeProfile(previous, snapshot) return snapshot end\n')},
 {id:'ai-throttled-chase',
  spec:{operation:'ai-throttled-chase',functionName:'chase',range:60,interval:1},
  source:'local function chase(npc, target)\n local state = brains[npc]\n'+
    ' if state.ai.lastMoveAt then end\n '+slot+'\nend\n'}
]);
const emitted=[];
assert.equal(VIBE59_LUAU_CODING_SKILLS_109.length,109);
for(const skill of VIBE59_LUAU_CODING_SKILLS_109){
 const bool=new Set(['near-on','far-off','confirm-on','confirm-off','on','off','has-on']).has(skill.kind);
 const spec={operation:skill.id,collection:'data',field:bool?'flag':'value',
  conditionField:'check',toField:'other',amount:2,cap:10,threshold:5,functionName:'handler'};
 const source='local function handler(player)\n local state = profiles[player]\n'+
  ' if state.data.value and state.data.flag and state.data.check and state.data.other then end\n -- VIBE59_SLOT\nend\n';
 const result=synthesizeVibe59LuauSkill({spec,source,replaceAnchor:'-- VIBE59_SLOT',
  sourcePath:'server/Game.server.luau'});
 assert.equal(result.runtimeVerified,false);
 emitted.push({id:'recipe-'+skill.id,source:source.replace('-- VIBE59_SLOT',result.source)});
}
assert.equal(VIBE59_QUALITY_GAMEPLAY_ACTIONS.length,6);
for(const row of scenario){
 const out=synthesizeVibe59QualityGameplay({spec:row.spec,source:row.source,
  sourcePath:'server/Game.server.luau',replaceAnchor:slot});
 assert.equal(out.operation,row.id);
 emitted.push({id:'advanced-'+row.id,source:row.source.replace(slot,out.source)});
}
const pathSpec={operation:'ai-pathfinding-chase',functionName:'chase',
  pathfindingService:'pathfindingService',range:70,interval:1,agentRadius:2,agentHeight:5,maxWaypoints:24};
const sourcePath='local pathfindingService = game:GetService("PathfindingService")\n'+
 'local function chase(npc, target)\n local state = brains[npc]\n'+
 ' if state.ai.lastMoveAt and state.ai.planning then end\n '+slot+'\nend\n';
const pathOutput=synthesizeVibe59Pathfinding({spec:pathSpec,source:sourcePath,
 sourcePath:'server/Game.server.luau',replaceAnchor:slot});
emitted.push({id:'pathfinding',source:sourcePath.replace(slot,pathOutput.source)});
const batchSpec={operation:'crafting-verified-transaction',functionName:'craft',
 recipes:'recipes',maxBatch:4,cooldown:1};
const batchSource='local recipes={ingot={inputs={wood=2,ore=1},outputs={ingot=1},caps={ingot=5}}}\n'+
 'local function craft(player, recipeId, batch, requestId)\n local state = profiles[player]\n'+
 ' if state.inventory.wood and state.crafting.lastAt and state.crafting.lastRequestId'+
 ' and state.crafting.busy and state.save.saving and state.save.dirty then end\n '+slot+'\nend';
const batchGenerated=synthesizeVibe59CraftingTransaction({spec:batchSpec,source:batchSource,
 sourcePath:'server/Craft.server.luau',replaceAnchor:slot});
emitted.push({id:'crafting-verified-transaction',source:batchSource.replace(slot,batchGenerated.source)});
assert.equal(emitted.length,117);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-luau-compiler-'));
try{
 let ok=0;
 for(const item of emitted){
  const filename=path.join(directory,item.id+'.server.luau');
  fs.writeFileSync(filename,item.source,'utf8');
  const result=spawnSync(bin,['--null',filename],{encoding:'utf8',timeout:15000});
  assert.equal(result.error,undefined,item.id+' '+String(result.error));
  assert.equal(result.status,0,item.id+' '+result.stderr+' '+result.stdout);
  ok++;
 }
 const bad=path.join(directory,'invalid.server.luau');
 fs.writeFileSync(bad,'local function broken()\n if then\nend\n','utf8');
 const reject=spawnSync(bin,['--null',bad],{encoding:'utf8',timeout:15000});
 assert.notEqual(reject.status,0,'invalid Luau syntax must cause a nonzero exit');
 console.log('VIBE59_LUAU_REAL_COMPILER=PASS',JSON.stringify({
  compiled:ok,recipes:109,advanced:6,pathfinding:1,craftingTransaction:1,
  invalidSourceRejected:true,robloxStudioVerified:false
 }));
}finally{
 fs.rmSync(directory,{recursive:true,force:true});
}
