import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResponsibilityGraph,
  traceFailureResponsibility,
  buildCausalDebugPlan,
  reviewSeniorSourceQuality,
  buildBehaviorChainContracts,
} from '../tools/company-vibe2-expert-development.mjs';
import {buildVibeDevelopmentContext} from '../tools/company-vibe2-gameplay-intelligence.mjs';
import {staticApprovedScopeCoverage} from '../tools/company-approved-scope-contract.mjs';

const source=`<!doctype html><main data-approved-scope-count="1"><button data-scope-id="scope-a" data-mechanic-id="tower-place" data-placement-position="A">place</button><script>
let gold=100;
let enemyHp=100;
let placed=[];
function charge(cost){ gold-=cost; return gold; }
function placeTower(){ charge(25); placed.push({x:1,y:2}); resolveAttack(); }
function resolveAttack(){ enemyHp-=20; return enemyHp; }
function saveGame(){ localStorage.setItem('save-v1',JSON.stringify({gold,enemyHp,placed})); }
function onPlace(){ placeTower(); saveGame(); }
document.querySelector('button').addEventListener('click',onPlace);
</script></main>`;

test('responsibility graph maps functions, state writers, callers and storage owners',()=>{
  const graph=buildResponsibilityGraph({source,sourceAnalysis:{storageKeys:['save-v1']}});
  const place=graph.nodes.find(x=>x.name==='placeTower');
  const attack=graph.nodes.find(x=>x.name==='resolveAttack');
  assert.ok(place);
  assert.ok(attack);
  assert.ok(place.calls.includes('charge'));
  assert.ok(place.calls.includes('resolveAttack'));
  assert.ok(place.stateWrites.includes('placed'));
  assert.ok(attack.stateWrites.includes('enemyHp'));
  assert.ok(attack.calledBy.includes('placeTower'));
  assert.ok(graph.storageOwners.some(x=>x.key==='save-v1'&&x.owners.includes('saveGame')));
});

test('causal debugger ranks the real responsibility boundary instead of only classifying failure text',()=>{
  const graph=buildResponsibilityGraph({source,sourceAnalysis:{storageKeys:['save-v1']}});
  const placement=traceFailureResponsibility({failure:'TOWER_PLACEMENT_RESULT_REQUIRED',responsibilityGraph:graph});
  const save=traceFailureResponsibility({failure:'SAVE_RESTORE_FAILED',responsibilityGraph:graph});
  assert.equal(placement.primaryTarget,'placeTower');
  assert.equal(save.primaryTarget,'saveGame');
  const plan=buildCausalDebugPlan({failures:['TOWER_PLACEMENT_RESULT_REQUIRED','SAVE_RESTORE_FAILED'],responsibilityGraph:graph});
  assert.ok(plan.responsibleTargets.includes('placeTower'));
  assert.ok(plan.responsibleTargets.includes('saveGame'));
  assert.ok(plan.traces.every(x=>x.causalChain[0]==='FAILURE_EVIDENCE'));
});

test('senior review rejects duplicate causal event registration and repeated-loop timer accumulation',()=>{
  const duplicated=`<script>
function onTap(){}
button.addEventListener('click',onTap);
button.addEventListener('click',onTap);
function frame(){ setInterval(()=>{},1000); requestAnimationFrame(frame); }
</script>`;
  const review=reviewSeniorSourceQuality(duplicated);
  assert.equal(review.pass,false);
  assert.ok(review.hardBlockers.includes('SENIOR_REVIEW_DUPLICATE_EVENT_HANDLER_REGISTRATION'));
  assert.ok(review.hardBlockers.includes('SENIOR_REVIEW_REPEATED_LOOP_CREATES_INTERVAL'));
});

test('approved scope static contract carries senior review hard blockers into the existing build gate',()=>{
  const html=`<!doctype html><main data-approved-scope-count="1"><button data-scope-id="scope-a" data-mechanic-id="action-a">go</button><script>
function onTap(){}
button.addEventListener('click',onTap);
button.addEventListener('click',onTap);
</script></main>`;
  const review=staticApprovedScopeCoverage(html,[{id:'scope-a',path:'coreLoop[0]',label:'act'}]);
  assert.equal(review.pass,false);
  assert.ok(review.blockers.includes('SENIOR_REVIEW_DUPLICATE_EVENT_HANDLER_REGISTRATION'));
  assert.equal(review.seniorReview.pass,false);
});

test('behavior chain contracts require actual input to owned state to gameplay result',()=>{
  const contracts=buildBehaviorChainContracts({gameplaySketch:{placementModel:{required:true},interactionGraph:{required:true},combatModel:{required:true,strategicOutcomeDifferenceRequired:true},progressionModel:{required:true}}});
  const ids=contracts.chains.map(x=>x.id);
  assert.ok(ids.includes('CORE_ACTION_CHAIN'));
  assert.ok(ids.includes('PLACEMENT_CHAIN'));
  assert.ok(ids.includes('INTERACTION_CHAIN'));
  assert.ok(ids.includes('COMBAT_CHAIN'));
  assert.ok(ids.includes('PROGRESSION_CHAIN'));
  assert.ok(ids.includes('STRATEGY_DIVERGENCE_CHAIN'));
  assert.match(contracts.completionRule,/NO_FEATURE_IS_COMPLETE/);
});

test('canonical Vibe development context exposes expert targets to the existing repair loop',()=>{
  const inventory=[{id:'tower',path:'combat.tower',label:'tower placement strategy'}];
  const context=buildVibeDevelopmentContext({gameId:'expert',genre:'SINGLE_DEFENSE_STRATEGY',baseline:{content:{coreLoop:['place tower','defend']}},inventory,existingHtml:source,blockers:['TOWER_PLACEMENT_RESULT_REQUIRED']});
  assert.equal(context.version,7);
  assert.ok(context.responsibilityGraph.nodes.some(x=>x.name==='placeTower'));
  assert.equal(context.causalDebug.traces[0].primaryTarget,'placeTower');
  assert.ok(context.behaviorChains.chains.some(x=>x.id==='PLACEMENT_CHAIN'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='ESTABLISH_RESPONSIBILITY_GRAPH'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='TRACE_FAILURE_TO_PRIMARY_STATE_WRITER'));
  assert.ok(context.patchPlan.tasks.some(x=>x.id==='RUN_SENIOR_CODE_REVIEW_GATE'));
  assert.ok(context.repairLoop.responsibleTargets.includes('placeTower'));
  assert.ok(context.repairLoop.retryContract.includes('TRACE_TO_PRIMARY_STATE_WRITER'));
});
