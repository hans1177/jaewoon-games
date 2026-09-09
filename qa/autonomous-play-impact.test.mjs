import test from 'node:test';
import assert from 'node:assert/strict';
import {appendImpactHistory,comparePlayImpact,lowImpactStreak,priorityPenaltyForGame} from '../tools/autonomous-play-impact.mjs';

const cleanMetrics={bodyVisible:true,width:390,height:844,scrollWidth:390,viewportWidth:390,interactive:4,visibleInteractive:4,canvas:1,title:'Game'};
const cleanReport={pass:true,errors:[],consoleErrors:[],pageErrors:[],failedRequests:[],badResponses:[],metrics:cleanMetrics,reloadMetrics:cleanMetrics};
const evidence={gameId:'P0001',candidateId:'P0001-test',saveKeyValidation:'PASS',changedFiles:['index.html'],departmentImplementations:[{role:'development',status:'PASS'},{role:'qa',status:'PASS'}]};

test('verified browser defect reduction becomes strong player impact evidence',()=>{
  const baseline={...cleanReport,pass:false,errors:['response:404 x','console:boom'],badResponses:['404 x'],consoleErrors:['boom']};
  const impact=comparePlayImpact({baseline,candidate:cleanReport,evidence});
  assert.equal(impact.executionQualityScore,5);
  assert.equal(impact.playerImpactScore,3);
  assert.equal(impact.totalScore,8);
  assert.equal(impact.impactStatus,'VERIFIED_IMPROVEMENT');
  assert.equal(impact.confidence,'HIGH');
  assert.deepEqual(impact.implementationDepartments,['development','qa']);
});

test('clean-to-clean smoke result is safe but does not pretend player impact was observed',()=>{
  const impact=comparePlayImpact({baseline:cleanReport,candidate:cleanReport,evidence});
  assert.equal(impact.executionQualityScore,5);
  assert.equal(impact.playerImpactScore,0);
  assert.equal(impact.totalScore,5);
  assert.equal(impact.impactStatus,'NOT_OBSERVED_BY_SMOKE_QA');
  assert.equal(impact.priorityEligibleLowImpact,true);
});

test('observable UI change is recorded without claiming a defect fix',()=>{
  const afterMetrics={...cleanMetrics,visibleInteractive:5};
  const candidate={...cleanReport,metrics:afterMetrics,reloadMetrics:afterMetrics};
  const impact=comparePlayImpact({baseline:cleanReport,candidate,evidence});
  assert.equal(impact.playerImpactScore,1);
  assert.equal(impact.impactStatus,'OBSERVABLE_CHANGE');
  assert.equal(impact.confidence,'MEDIUM');
});

test('priority penalty starts only after two consecutive low-impact outcomes',()=>{
  const base={...comparePlayImpact({baseline:cleanReport,candidate:cleanReport,evidence}),evaluatedAt:'2026-09-10T00:00:00Z'};
  let history=appendImpactHistory({version:1,entries:[]},base);
  assert.equal(lowImpactStreak(history,'P0001'),1);
  assert.equal(priorityPenaltyForGame(history,'P0001'),0);
  history=appendImpactHistory(history,{...base,candidateId:'P0001-test-2',evaluatedAt:'2026-09-10T01:00:00Z'});
  assert.equal(lowImpactStreak(history,'P0001'),2);
  assert.equal(priorityPenaltyForGame(history,'P0001'),1);
  history=appendImpactHistory(history,{...base,candidateId:'P0001-test-3',evaluatedAt:'2026-09-10T02:00:00Z'});
  assert.equal(priorityPenaltyForGame(history,'P0001'),2);
  const good={...base,candidateId:'P0001-test-4',impactStatus:'VERIFIED_IMPROVEMENT',priorityEligibleLowImpact:false,evaluatedAt:'2026-09-10T03:00:00Z'};
  history=appendImpactHistory(history,good);
  assert.equal(lowImpactStreak(history,'P0001'),0);
  assert.equal(priorityPenaltyForGame(history,'P0001'),0);
});
