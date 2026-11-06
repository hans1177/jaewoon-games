import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {synthesizeVibe59CraftingTransaction,verifyVibe59CraftingScenarios}
 from '../tools/vibe59-crafting-transaction.mjs';
import {createVibe59CodeCandidate,buildVibe59AutonomyPlan} from '../tools/vibe2-v59-autonomy.mjs';
const spec={operation:'crafting-verified-transaction',functionName:'craft',
 recipes:'recipes',maxBatch:4,cooldown:1};
const source='local recipes={ingot={inputs={wood=2,ore=1},outputs={ingot=1},caps={ingot=5}}}\n'+
 'local function craft(player, recipeId, batch, requestId)\n local state = profiles[player]\n'+
 ' if state.inventory.wood and state.crafting.lastAt and state.crafting.lastRequestId and'+
 ' state.crafting.busy and state.save.saving and state.save.dirty then end\n'+
 ' -- VIBE59_QUALITY_SLOT\nend';
const initial={inventory:{wood:10,ore:4,ingot:0},
 crafting:{lastAt:0,lastRequestId:'',busy:false},save:{saving:false,dirty:false}};
const recipe={inputs:{wood:2,ore:1},outputs:{ingot:1},caps:{ingot:5}};
const accepted={name:'batch-two',initialState:initial,recipe,
 request:{now:100,recipeId:'ingot',batch:2,requestId:'r1'},expectedApplied:true,
 expectedState:{inventory:{wood:6,ore:2,ingot:2},
 crafting:{lastAt:100,lastRequestId:'r1',busy:false},save:{saving:false,dirty:true}}};
const denied={name:'insufficient-ore',initialState:{...initial,
 inventory:{wood:10,ore:0,ingot:0}},recipe,
 request:{now:100,recipeId:'ingot',batch:2,requestId:'r1'},expectedApplied:false,
 expectedState:{...initial,inventory:{wood:10,ore:0,ingot:0}}};
const proof=[accepted,denied];
const clone=x=>JSON.parse(JSON.stringify(x));
test('server crafting emits complete atomic batch transaction and explicit replay guard',()=>{
 const x=synthesizeVibe59CraftingTransaction({spec,source,sourcePath:'server/Craft.server.luau',
  replaceAnchor:'-- VIBE59_QUALITY_SLOT'});
 assert.equal(x.operation,'crafting-verified-transaction');
 assert.match(x.source,/recipes\[recipeId\]/);
 assert.match(x.source,/state\.crafting\.lastRequestId/);
 assert.match(x.source,/state\.save\.saving/);
 assert.match(x.source,/state\.save\.dirty = true/);
 assert.match(x.source,/state\.crafting\.busy = false/);
 assert.match(x.source,/pcall\(function\(\)/);
 assert.ok(x.source.indexOf('if outputs == 0')<
  x.source.indexOf('for item, nextValue in pairs(nextValues)'));
 assert.equal(x.sourceWrite,false);
 assert.equal(x.runtimeVerified,false);
});
test('offline oracle validates atomic two-item crafting and denied transaction',()=>{
 const p=verifyVibe59CraftingScenarios({spec,scenarios:proof});
 assert.equal(p.pass,true);
 assert.deepEqual(p.cases.map(x=>x.applied),[true,false]);
});
test('replays, in-progress save, locked craft, cooldown, capacity and invalid counts reject without loss',()=>{
 for(const [name,initialDelta,requestDelta,recipeDelta] of [
  ['duplicate',{crafting:{...initial.crafting,lastRequestId:'r1'}},{},{}],
  ['saving',{save:{saving:true,dirty:false}},{},{}],
  ['busy',{crafting:{...initial.crafting,busy:true}},{},{}],
  ['cooldown',{crafting:{...initial.crafting,lastAt:99.8}},{},{}],
  ['capacity',{inventory:{wood:10,ore:4,ingot:5}},{},{}],
  ['too-many',{},{batch:5},{}],
  ['invalid-id',{},{recipeId:'../evil'},{}],
  ['bad-amount',{},{},{inputs:{wood:2,ore:-1}}]
 ]){
  const state={...clone(initial),...initialDelta},req={...accepted.request,...requestDelta};
  const row={name,initialState:state,recipe:{...recipe,...recipeDelta},request:req,
   expectedApplied:false,expectedState:clone(state)};
  const check=verifyVibe59CraftingScenarios({spec,scenarios:[accepted,row]});
  assert.equal(check.pass,true,name);
 }
});
test('fail-closed: client source, absent state fields, unapproved recipes and source aliasing',()=>{
 const input={spec,source,sourcePath:'server/Craft.server.luau',
  replaceAnchor:'-- VIBE59_QUALITY_SLOT'};
 assert.throws(()=>synthesizeVibe59CraftingTransaction({...input,
  sourcePath:'client/Craft.client.luau'}),/SERVER_ONLY/);
 assert.throws(()=>synthesizeVibe59CraftingTransaction({...input,
  source:source.replace('state.crafting.busy','state.crafting.x')}),/EXISTING_FIELD/);
 assert.throws(()=>synthesizeVibe59CraftingTransaction({...input,
  source:source.replace('local recipes=','local fabricated=')}),/EXISTING_RECIPE_CATALOG/);
 assert.throws(()=>synthesizeVibe59CraftingTransaction({...input,
  spec:{...spec,recipes:'__proto__'}}),/INVALID_BINDING/);
 assert.throws(()=>synthesizeVibe59CraftingTransaction({...input,
  spec:{...spec,maxBatch:1.5}}),/INTEGER_BATCH/);
 assert.throws(()=>verifyVibe59CraftingScenarios({spec,scenarios:[accepted]}),/SCENARIOS_REQUIRED/);
});
test('owner-approved crafting candidate enters Vibe source path without writing user game',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-craft-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'server'));
 const relative='server/Craft.server.luau';
 fs.writeFileSync(path.join(root,relative),source);
 const request={ownerApproved:true,path:relative,find:'-- VIBE59_QUALITY_SLOT',
  robloxCraftingAction:spec,scenarios:proof};
 const make=x=>createVibe59CodeCandidate({order:{vibe59CodeRequest:x},target:'roblox',
  sourceRoot:root,responsibleFiles:[relative]});
 const x=make(request);
 assert.equal(x.vibe59CodeKind,'ROBLOX_CRAFTING_TRANSACTION');
 assert.equal(x.vibe59TestPlan.pass,true);
 assert.equal(x.ruleDigest.length,64);
 assert.match(x.edits[0].replace,/state\.crafting\.lastRequestId = requestId/);
 assert.equal(fs.readFileSync(path.join(root,relative),'utf8'),source);
 assert.throws(()=>make({...request,ownerApproved:false}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
 assert.throws(()=>make({...request,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
 assert.throws(()=>make({...request,robloxQualityAction:{}}),/OWNER_EXPLICIT_CODING_SPEC_REQUIRED/);
});
test('planner lists 8 high-fidelity game coding systems without runtime certification',()=>{
 const p=buildVibe59AutonomyPlan({target:'roblox',order:{goal:'craft weapons'}});
 assert.equal(p.advancedGameplay.count,8);
 assert.ok(p.advancedGameplay.mechanics.includes('crafting-verified-transaction'));
 assert.equal(p.advancedGameplay.runtimeVerified,false);
});
