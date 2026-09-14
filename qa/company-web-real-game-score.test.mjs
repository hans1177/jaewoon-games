import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCategory,
  evaluateRealGameHardGates,
  scoreRealWebGame,
  summarizeRuntimeComplexity,
  COMMON_SCORE_MAX,
  CATEGORY_SCORE_MAX,
} from '../tools/company-web-real-game-score.mjs';

const passingMetrics={
  realPlayableGame:true,
  completePlayableCycle:true,
  realUserInput:true,
  gameplaySurface:true,
  meaningfulStateTransitionCount:8,
  terminalOutcomes:{winOrGoal:true,fail:true},
  testUiRatio:0,
  testProxyDetected:false,
  duplicateActionRatio:0.2,
  fakeProgressDetected:false,
  mobilePlayable:true,
  runtimeStable:true,
  categoryMatch:true,
};

test('category mapping keeps category-specific 40-point lane',()=>{
  assert.equal(normalizeCategory('ACTION_SURVIVAL_ROGUELITE'),'SURVIVAL');
  assert.equal(normalizeCategory('SINGLE_DEFENSE_STRATEGY'),'DEFENSE');
  assert.equal(normalizeCategory('STORY_RPG_ADVENTURE_RPG'),'STORY_ADVENTURE');
  assert.equal(normalizeCategory('SIMULATOR_TYCOON_INCREMENTAL'),'SIM_TYCOON');
  assert.equal(COMMON_SCORE_MAX,60);
  assert.equal(CATEGORY_SCORE_MAX,40);
});

test('a real complete survival cycle can earn 100 without any time-stage buttons',()=>{
  const result=scoreRealWebGame({
    category:'ACTION_SURVIVAL_ROGUELITE',
    metrics:passingMetrics,
    common:{coreLoop:1,systemConnectivity:1,controlsAndGameFeel:1,functionalUiUx:1,progressionReward:1,riskFailureRetry:1,feedback:1,stabilityPerformance:1},
    categorySignals:{worldMovement:1,resourceGathering:1,crafting:1,enemyThreat:1,survivalPressure:1,explorationVariety:1},
  });
  assert.equal(result.hardGates.pass,true);
  assert.equal(result.totalScore,100);
  assert.equal(result.initialImplementationUnit,'ONE_COMPLETE_PLAYABLE_GAMEPLAY_CYCLE');
  assert.equal(result.contentDepthValidationMinutes,30);
});

test('test harness and fake progress are rejected before scoring',()=>{
  const hard=evaluateRealGameHardGates({...passingMetrics,testUiRatio:0.6,testProxyDetected:true,duplicateActionRatio:0.9,fakeProgressDetected:true});
  assert.equal(hard.pass,false);
  assert.ok(hard.failures.includes('NO_TEST_PROXY'));
  assert.ok(hard.failures.includes('NO_FAKE_PROGRESS'));
  const result=scoreRealWebGame({category:'PUZZLE',metrics:{...passingMetrics,testProxyDetected:true},common:{coreLoop:1},categorySignals:{puzzleRule:1}});
  assert.equal(result.totalScore,0);
  assert.equal(result.eligibleForStrictReview,false);
});

test('raw UI count alone cannot inflate functional gameplay complexity',()=>{
  const complexity=summarizeRuntimeComplexity({rawUiCount:40,uniqueFunctionalUiCount:3,uniqueMechanicCount:2,gameplayActionCount:30,meaningfulStateTransitionCount:2,systemDependencyCount:1,entityCount:1,duplicateActionRatio:0.86,testUiRatio:0.48});
  assert.equal(complexity.rawUiCount,40);
  assert.equal(complexity.uniqueFunctionalUiCount,3);
  assert.equal(complexity.rawUiCountIsAdvisoryOnly,true);
  assert.equal(complexity.repeatedControlsDoNotIncreaseFunctionalUiCount,true);
  assert.ok(complexity.duplicateActionRatio>0.65);
});

test('category mismatch is a hard gate, not a score deduction',()=>{
  const result=scoreRealWebGame({category:'BATTLEGROUND_FIGHTING_SHOOTER',metrics:{...passingMetrics,categoryMatch:false},common:{coreLoop:1,systemConnectivity:1,controlsAndGameFeel:1,functionalUiUx:1,progressionReward:1,riskFailureRetry:1,feedback:1,stabilityPerformance:1},categorySignals:{movement:1,attackHit:1,enemyAi:1,skillCooldown:1,combatObjective:1,combatFeedback:1}});
  assert.equal(result.rawScoreBeforeHardGate,100);
  assert.equal(result.totalScore,0);
  assert.ok(result.hardGates.failures.includes('CATEGORY_MATCH'));
});
