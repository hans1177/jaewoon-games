// 파일명: qa/vibe-auto-repair-causality.mjs
// 역할: Replay/Regression/Auto Repair가 결정론·체크포인트·책임소스·재검증 경계를 지키는지 검사
import assert from 'node:assert/strict';
import {
  createVibeWorldState,
  replayVibeWorld,
  diagnoseVibeReplayRegression,
  createVibeAutoRepairPlan,
  validateVibeAutoRepairResult
} from '../assets/vibe-quality-intelligence.js';

const initial={worldId:'repair-world',seed:'fixed',state:{hero:{hp:100},village:{food:10}}};
const events=[{op:'add',path:'village.food',value:-2,timestamp:1},{op:'set',path:'hero.status',value:'ready',timestamp:2}];
const baseline=replayVibeWorld({initialState:initial,events});
const same=replayVibeWorld({initialState:initial,events});
const clean=diagnoseVibeReplayRegression({baseline,candidate:same,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp','village.food']}});
assert.equal(clean.regressionFree,true);
assert.equal(clean.authority,'diagnosis-only');

const divergent=replayVibeWorld({initialState:initial,events:[...events,{op:'add',path:'hero.hp',value:-150,timestamp:3}]});
const broken=diagnoseVibeReplayRegression({baseline,candidate:divergent,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp','village.food']}});
assert.equal(broken.regressionFree,false);
assert.ok(broken.issues.some(x=>x.type==='replay-divergence'));
assert.ok(broken.issues.some(x=>x.type==='non-negative-invariant'));

const blocked=createVibeAutoRepairPlan({diagnosis:broken});
assert.equal(blocked.eligible,false);
assert.ok(blocked.blockedReasons.includes('responsible-source-unproven'));
assert.ok(blocked.blockedReasons.includes('checkpoint-required'));
assert.ok(blocked.blockedReasons.includes('exact-revision-required'));

const plan=createVibeAutoRepairPlan({diagnosis:broken,responsibleFiles:['main.gd'],checkpointId:'cp-7',revision:'abc123'});
assert.equal(plan.eligible,true);
assert.equal(plan.authority,'repair-plan-candidate-only');
assert.equal(plan.autoApplyAllowed,false);
assert.ok(plan.actions.every(x=>x.scope==='original-responsible-source-only'));
assert.equal(plan.requiresSandboxReplay,true);
assert.equal(plan.requiresRegressionPass,true);

const rejected=validateVibeAutoRepairResult({plan,before:baseline,after:baseline,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},exactRevision:false,qaPassed:true});
assert.equal(rejected.accepted,false);
assert.equal(rejected.mayCommit,false);
assert.equal(rejected.rollbackRequired,true);

const accepted=validateVibeAutoRepairResult({plan,before:baseline,after:baseline,invariants:{requiredPaths:['hero.hp'],nonNegativePaths:['hero.hp']},exactRevision:true,qaPassed:true});
assert.equal(accepted.accepted,true);
assert.equal(accepted.mayCommit,true);
assert.equal(accepted.rollbackRequired,false);
assert.equal(accepted.authority,'repair-validation-only');

const noRepair=createVibeAutoRepairPlan({diagnosis:clean,responsibleFiles:['main.gd'],checkpointId:'cp-8',revision:'abc124'});
assert.equal(noRepair.eligible,false);
assert.ok(noRepair.blockedReasons.includes('no-regression-to-repair'));

console.log('vibe-auto-repair-causality: ok');
