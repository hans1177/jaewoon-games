// Vibe5.9 offline creativity regression: real source candidate, bounded evidence, no silent edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {VIBE59_CREATIVITY_CAPABILITIES,buildVibe59CreativityPlan} from '../tools/vibe59-creative-engine.mjs';
import {createVibe59CodeCandidate,buildVibe59AutonomyPlan} from '../tools/vibe2-v59-autonomy.mjs';
const spec={operation:'inventory-grant',collection:'inventory',field:'wood',
  amount:2,limit:10,functionName:'handler'};
const scenarios=[
  {initialState:{inventory:{wood:4}},expectedState:{inventory:{wood:6}},expectedApplied:true},
  {initialState:{inventory:{wood:10}},expectedState:{inventory:{wood:10}},expectedApplied:false}
];
test('20 bounded offline creativity algorithms execute with distinct evidence',()=>{
  const r=buildVibe59CreativityPlan({goal:'몬스터 AI 건축 인벤토리'});
  assert.equal(VIBE59_CREATIVITY_CAPABILITIES.length,20);
  assert.equal(r.capabilityCount,20);
  assert.deepEqual(r.steps.map(x=>x.id),VIBE59_CREATIVITY_CAPABILITIES.map(x=>x.id));
  assert.ok(r.inversions.length>0&&r.variations.length>0&&r.fusions.length>0);
  assert.equal(r.virtualPlayers.length,3);
  assert.ok(r.critique.length>0&&r.ideas.length<=12);
  assert.equal(r.sourceWrite,false);
  assert.equal(r.modelUsed,false);
  assert.equal(r.runtimeVerified,false);
  assert.equal(r.chosenOperation,null);
  assert.equal(r.selectedApprovedSpec,null);
});
test('creativity search deterministic and hard bounded',()=>{
  const input={goal:'monster building',seed:'repeatable',maxIdeas:6,maxIterations:3};
  const first=buildVibe59CreativityPlan(input),second=buildVibe59CreativityPlan(input);
  assert.deepEqual(first,second);
  assert.equal(first.ideas.length,6);
  assert.equal(first.rounds.length,3);
  assert.throws(()=>buildVibe59CreativityPlan({maxIdeas:100}),/CREATIVE_BUDGET/);
  assert.throws(()=>buildVibe59CreativityPlan({maxIterations:10}),/CREATIVE_BUDGET/);
});
test('scenario proof selects only owner-approved and not failed operation',()=>{
  const opts={goal:'inventory grant',ownerApproved:true,approvedOperations:[{spec,scenarios}],
    verifiedPatterns:[{operation:'inventory-grant',verified:true,independentQa:'PASS',
      sourceRevision:'revision-123'}]};
  const allowed=buildVibe59CreativityPlan(opts);
  assert.equal(allowed.chosenOperation,'inventory-grant');
  assert.equal(allowed.simulations[0].passed,true);
  assert.equal(allowed.steps.find(x=>x.id==='verified-reuse').detail.independentlyVerifiedReferences,1);
  assert.equal(buildVibe59CreativityPlan({...opts,ownerApproved:false}).chosenOperation,null);
  assert.equal(buildVibe59CreativityPlan({...opts,feedback:[{operation:'inventory-grant',
    result:'FAIL',evidence:'QA failed'}]}).chosenOperation,null);
  assert.equal(buildVibe59CreativityPlan({...opts,approvedOperations:[
    {spec,scenarios:[{...scenarios[0],expectedApplied:false},scenarios[1]]}
  ]}).chosenOperation,null);
});
test('creative operation enters canonical source candidate and preserves disk',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-creative-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'));
  const relative='server/Gameplay.server.luau',filename=path.join(root,relative);
  const initial='local function handler(player)\n local state = profiles[player]\n'+
    ' if state.inventory.wood then end\n -- INSERT\nend';
  fs.writeFileSync(filename,initial);
  const approved={ownerApproved:true,path:relative,find:'-- INSERT',
    goal:'inventory',approvedOperations:[{spec,scenarios}]};
  const run=x=>createVibe59CodeCandidate({order:{vibe59CreativeRequest:x},
    target:'roblox',sourceRoot:root,responsibleFiles:[relative]});
  const result=run(approved);
  assert.equal(result.vibe59CodeKind,'ROBLOX_DOMAIN_OPERATION');
  assert.equal(result.vibe59Creativity.capabilityCount,20);
  assert.equal(result.vibe59TestPlan.pass,true);
  assert.equal(result.vibe59TestPlan.cases.length,2);
  assert.equal(result.ruleDigest.length,64);
  assert.equal(result.edits.length,1);
  assert.equal(result.edits[0].path,relative);
  assert.match(result.edits[0].replace,/state\.inventory\.wood = math\.min\(10/);
  assert.equal(fs.readFileSync(filename,'utf8'),initial);
  assert.equal(result.sourceWrite,false);
  assert.equal(run({...approved,ownerApproved:false}),null);
  assert.equal(run({...approved,approvedOperations:[]}),null);
  assert.throws(()=>run({...approved,path:'server/Forbidden.server.luau'}),/UNAPPROVED_SOURCE/);
  assert.throws(()=>run({...approved,sourceSha256:'0'.repeat(64)}),/STALE_SOURCE/);
});
test('creativity route rejects comment-only invented field',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe59-creative-safety-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'server'));
  const relative='server/Gameplay.server.luau';
  fs.writeFileSync(path.join(root,relative),
    "local function handler(player)\n local state = profiles[player]\n"+
    " -- state.inventory.wood\n local sample = 'state.inventory.wood'\n -- INSERT\nend");
  assert.throws(()=>createVibe59CodeCandidate({order:{vibe59CreativeRequest:{
    ownerApproved:true,path:relative,find:'-- INSERT',goal:'inventory',
    approvedOperations:[{spec,scenarios}]}},
    target:'roblox',sourceRoot:root,responsibleFiles:[relative]}),/EXISTING_FIELDS_REQUIRED/);
});
test('read-only autonomy planning exposes creativity with no edit authority',()=>{
  const plan=buildVibe59AutonomyPlan({target:'roblox',order:{goal:'몬스터와 건축',
    vibe59CreativeRequest:{ownerApproved:true,goal:'몬스터와 건축',
      approvedOperations:[{spec,scenarios}]}}});
  assert.equal(plan.creativity.capabilityCount,20);
  assert.equal(plan.creativity.selectedApprovedSpec,null);
  assert.equal(plan.creativity.sourceWrite,false);
  assert.equal(plan.synthesisCandidateAvailable,true);
});


test('goal-filtered creative selection rejects unrelated approved operations',()=>{
  const r=buildVibe59CreativityPlan({goal:'몬스터 AI',ownerApproved:true,
    approvedOperations:[{spec,scenarios}]});
  assert.equal(r.chosenOperation,null);
  assert.equal(r.selectedApprovedSpec,null);
  assert.ok(r.requestedSystems.includes('ai'));
});
