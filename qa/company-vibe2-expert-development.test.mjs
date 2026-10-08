import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildResponsibilityGraph,
  traceFailureResponsibility,
  buildCausalDebugPlan,
  reviewSeniorSourceQuality,
  buildBehaviorChainContracts,
  inspectSourceFunctions,
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

test('native Luau analysis follows typed functions, nested blocks and qualified calls without reading comments as code',()=>{
  const code=`local state = { reward = 0 }
local actors = {}
-- function fake() state.reward = 999 end
local note = [=[ function fakeAgain() end ]=]
local function grantReward(id: number): boolean
  if id > 0 then
    for _, actor in actors do
      if actor.id == id then state.reward += 1 end
    end
  end
  return true
end
function Menu:Confirm(id: number)
  grantReward(id)
end
local function spawnActor(actor)
  table.insert(actors, actor)
  Menu:Confirm(actor.id)
end`;
  const graph=buildResponsibilityGraph({source:code,language:'roblox'});
  assert.deepEqual(graph.nodes.map(row=>row.name),['grantReward','Menu:Confirm','spawnActor']);
  assert.ok(graph.nodes.find(row=>row.name==='grantReward').stateWrites.includes('state'));
  assert.ok(graph.nodes.find(row=>row.name==='spawnActor').stateWrites.includes('actors'));
  assert.ok(graph.edges.some(row=>row.from==='spawnActor'&&row.to==='Menu:Confirm'));
  assert.ok(graph.edges.some(row=>row.from==='Menu:Confirm'&&row.to==='grantReward'));
  assert.equal(code.slice(graph.nodes[0].start,graph.nodes[0].end).trim().endsWith('return true\nend'),true);
  assert.equal(graph.runtimeVerified,false);
});

test('Unity C# analysis links UI choice through placement to reward state and preserves method boundaries',()=>{
  const code=`using UnityEngine;
public class Game : MonoBehaviour {
  private int gold = 10;
  private Vector3 position;
  // void Pretend() { gold = 999; }
  public void OnConfirm() { PlaceAt(new Vector3(2, 1, 3)); }
  private void PlaceAt(Vector3 next) { position = next; this.GrantReward(); }
  private void GrantReward() { gold += 1; }
  public bool CanBuy() { if (gold > 10) { return true; } else if (gold == 10) { return true; } return false; }
}`;
  const graph=buildResponsibilityGraph({source:code,language:'unity'});
  assert.deepEqual(graph.nodes.map(row=>row.name),['OnConfirm','PlaceAt','GrantReward','CanBuy']);
  assert.ok(graph.edges.some(row=>row.from==='OnConfirm'&&row.to==='PlaceAt'));
  assert.ok(graph.edges.some(row=>row.from==='PlaceAt'&&row.to==='GrantReward'));
  assert.deepEqual(graph.nodes.find(row=>row.name==='CanBuy').stateWrites,[]);
  assert.ok(graph.nodes.find(row=>row.name==='PlaceAt').stateWrites.includes('position'));
  assert.ok(graph.stateWriters.some(row=>row.state==='gold'&&row.writers.includes('GrantReward')));
});

test('JavaScript analysis excludes quoted and commented fake calls, equality writes and preserves original HTML offsets',()=>{
  const code=`<!doctype html><main>메뉴</main><script>
let reward = 0;
function grant() { reward += 1; }
// function ghost() { grant(); }
function canClaim() { const label = "grant(); reward = 9; }"; /* grant(); } */ return reward === 0; }
function claim() { if (canClaim()) grant(); }
</script>`;
  const graph=buildResponsibilityGraph({source:code});
  assert.equal(graph.nodes.length,3);
  const predicate=graph.nodes.find(row=>row.name==='canClaim');
  assert.equal(predicate.calls.length,0);
  assert.equal(predicate.stateWrites.includes('reward'),false);
  for(const fn of inspectSourceFunctions(code))assert.equal(code.slice(fn.start,fn.end).startsWith('function '+fn.name),true);
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

test('senior review allows the same handler on different real controls',()=>{
  const valid=`<script>
function openMap(){}
ui.mapBtn.addEventListener('click',openMap);
ui.mapTab.addEventListener('click',openMap);
</script>`;
  const review=reviewSeniorSourceQuality(valid);
  assert.equal(review.hardBlockers.includes('SENIOR_REVIEW_DUPLICATE_EVENT_HANDLER_REGISTRATION'),false);
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
