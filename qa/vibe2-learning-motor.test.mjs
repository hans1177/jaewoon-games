import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMasteryState,
  applyVerifiedExperienceToMastery,
  applyVerifiedCodePatternsToMastery,
  retrieveUnifiedLearning,
  candidateTournamentPolicy,
  buildBenchmarkLadder,
  buildIdlePracticeQueue,
  injectIdlePracticeTask,
  buildWebRobloxHandoffs
} from '../tools/vibe2-learning-motor.mjs';

test('same-game verified experience outranks same-engine cross-game experience',()=>{
  const experience={records:[
    {id:'same',gameId:'g1',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat save mobile',reusablePatterns:['combat-state']},
    {id:'other',gameId:'g2',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat save mobile',reusablePatterns:['combat-state']}
  ]};
  const ctx=retrieveUnifiedLearning({task:{gameId:'g1',target:'web',goal:'combat save mobile'},experienceInput:experience});
  assert.equal(ctx.experience[0].id,'same');
  assert.ok(ctx.experience[0].reasons.includes('same-game'));
});

test('unverified result never increases mastery',()=>{
  const result=applyVerifiedExperienceToMastery({}, {records:[
    {id:'bad',gameId:'g',engine:'web',verified:false,reusable:true,outcome:'PASS',goal:'combat'}
  ]});
  assert.equal(result.added,0);
  assert.equal(result.state.domains.COMBAT.xp,0);
});

test('verified success and verified failure lesson raise only inferred mastery domains',()=>{
  const result=applyVerifiedExperienceToMastery({}, {records:[
    {id:'ok',gameId:'g',engine:'web',verified:true,reusable:true,outcome:'PASS',goal:'combat save mobile input',reusablePatterns:['combat','save']},
    {id:'fail',gameId:'g',engine:'web',verified:true,reusable:true,outcome:'FAIL',failureCause:'save restore regression',avoidPatterns:['save restore regression']}
  ]});
  assert.ok(result.state.domains.COMBAT.xp>0);
  assert.ok(result.state.domains.SAVE.xp>0);
  assert.ok(result.state.domains.WEB_RUNTIME.xp>0);
  assert.equal(Object.keys(result.state.failureSignatures).length,1);
});

test('repeated verified failure escalates tournament and idle drill without bypassing gates',()=>{
  const state=createMasteryState({failureSignatures:{fail_x:{count:3,domains:['SAVE'],example:'save regression'}}});
  const policy=candidateTournamentPolicy({task:{goal:'repair save regression',target:'web'},masteryInput:state});
  assert.equal(policy.candidateCount,3);
  assert.equal(policy.gateBypass,false);
  const idle=buildIdlePracticeQueue(state);
  assert.equal(idle.drills[0].kind,'REPRO_DRILL');
  assert.equal(idle.drills[0].countsAsProductionPass,false);
});

test('benchmark ladder measures eight tracks and never counts directly as training sample',()=>{
  const ladder=buildBenchmarkLadder({});
  assert.equal(ladder.cases.length,8);
  assert.ok(ladder.cases.every(x=>x.countsAsTrainingSample===false));
});

test('Roblox handoff reuses only verified same-game Web semantic experience',()=>{
  const pack=buildWebRobloxHandoffs({items:[{
    gameId:'g-sem',selectedPlatform:'ROBLOX',formalImplementationPassed:true
  }]},{records:[{
    id:'web-sem-1',gameId:'g-sem',engine:'web',outcome:'PASS',verified:true,reusable:true,lastVerifiedAt:'2026-09-18T00:00:00Z',
    evidence:['web-runtime-evidence:design/g-sem/web-gameplay-validation.json'],
    reusablePatterns:[
      'WEB_SEMANTIC:CORE_LOOP:place → defend → reward',
      'WEB_SEMANTIC:STATE_MODEL:meaningful-state-transitions=20',
      'WEB_SEMANTIC:PROGRESSION_MODEL:wave-by-wave',
      'WEB_SEMANTIC:UI_FLOW:배치 → 강화 → 웨이브 시작',
      'WEB_SEMANTIC:INPUT_INTENT:touch-first / action-primary',
      'WEB_SEMANTIC:SAVE_MEANING:verified runtime save/restore of current gameplay state',
      'WEB_SEMANTIC:CONTENT_STRUCTURE:lane-defense / wave-events',
      'WEB_SEMANTIC:BALANCE_INTENT:wave pressure and counter balance'
    ]
  },{
    id:'unverified',gameId:'g-sem',engine:'web',outcome:'PASS',verified:false,reusable:true,
    reusablePatterns:['WEB_SEMANTIC:CORE_LOOP:must-not-win']
  }]});
  assert.equal(pack.handoffs.length,1);
  const handoff=pack.handoffs[0];
  assert.equal(handoff.CORE_LOOP,'place → defend → reward');
  assert.equal(handoff.WEB_RUNTIME_EVIDENCE,'design/g-sem/web-gameplay-validation.json');
  assert.deepEqual(handoff.verifiedSemanticExperienceIds,['web-sem-1']);
  assert.equal(handoff.complete,true);
  assert.equal(handoff.webEvidenceSubstitutesRobloxQa,false);
});

test('Web to Roblox handoff cannot replace Roblox QA',()=>{
  const pack=buildWebRobloxHandoffs({items:[{
    gameId:'g1',selectedPlatform:'ROBLOX',webValidationPassedAt:'2026-09-18T00:00:00Z',
    coreLoop:'loop',stateModel:'state',progressionModel:'progress',uiFlow:'ui',inputIntent:'touch',
    saveMeaning:'save',contentStructure:'content',balanceIntent:'balance'
  }]});
  assert.equal(pack.handoffs.length,1);
  assert.equal(pack.handoffs[0].robloxNativeReimplementationRequired,true);
  assert.equal(pack.handoffs[0].webEvidenceSubstitutesRobloxQa,false);
  assert.equal(pack.gateBypass,false);
});


test('idle practice is enqueued only when production work is absent',()=>{
  const idle={drills:[{id:'gap-save-l1',kind:'MINI_GAME_SYSTEM_DRILL',domains:['SAVE'],productionPreemptible:true,countsAsProductionPass:false}]};
  const empty=injectIdlePracticeTask({tasks:[]},idle);
  assert.equal(empty.added,true);
  assert.equal(empty.task.type,'research');
  assert.ok(empty.task.evidence.includes('learning-practice-only'));
  assert.ok(empty.task.evidence.includes('production-pass:NO'));
  const busy=injectIdlePracticeTask({tasks:[{id:'prod',status:'queued',type:'implementation',evidence:[]}]},idle);
  assert.equal(busy.added,false);
  assert.equal(busy.reason,'PRODUCTION_WORK_PRESENT');
});


test('verified internal code patterns raise mastery without raw code',()=>{
  const result=applyVerifiedCodePatternsToMastery({}, {patterns:[
    {id:'save1',verified:true,rawCodeStored:false,independentQa:'PASS',system:'SAVE_PERSISTENCE',engine:'web',pattern:'VERIFIED_SAVE_PERSISTENCE_SMALLEST_RESPONSIBLE_CHANGE_WITH_REGRESSION'}
  ]});
  assert.equal(result.added,1);
  assert.ok(result.state.domains.SAVE.xp>0);
  const rejected=applyVerifiedCodePatternsToMastery({}, {patterns:[
    {id:'bad',verified:true,rawCodeStored:true,independentQa:'PASS',system:'SAVE_PERSISTENCE'}
  ]});
  assert.equal(rejected.added,0);
});
