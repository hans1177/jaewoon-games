import test from 'node:test';
import assert from 'node:assert/strict';
import {webCategoryFamily,evaluateRealGameQualification,scoreRealWebGame} from '../tools/company-web-real-game-score.mjs';

const passingMetrics={
  realArtifact:true,
  terminalReached:true,
  meaningfulStateTransitions:10,
  uniqueInteractedMechanics:5,
  interactionCount:24,
  stateChanged:true,
  gameplaySurfaceRatio:.45,
  gameplaySurfacePresent:true,
  uniqueStateCount:11,
  winLossImplemented:true,
  testUiRatio:0,
  directSessionControls:0,
  proxyMarkers:0,
  duplicateActionRatio:.2,
  mobilePlayable:true,
  runtimeStable:true,
  interactionSuccessRatio:.95,
  uniqueFunctionalUiCount:8,
  visualFeedback:true,
  audioFeedback:true,
  mechanicIds:['mine','smelt','sell','upgrade','drone','unlock'],
  interactedMechanicIds:['mine','smelt','sell','upgrade','drone'],
};

test('category mapping keeps category-specific 40-point lane',()=>{
  assert.equal(webCategoryFamily('ACTION_SURVIVAL_ROGUELITE'),'SURVIVAL');
  assert.equal(webCategoryFamily('SINGLE_DEFENSE_STRATEGY'),'DEFENSE');
  assert.equal(webCategoryFamily('STORY_RPG_ADVENTURE_RPG'),'STORY');
  assert.equal(webCategoryFamily('SIMULATOR_TYCOON_INCREMENTAL'),'TYCOON');
});

test('a real complete tycoon cycle can score common 60 plus category 40',()=>{
  const result=scoreRealWebGame({category:'SIMULATOR_TYCOON_INCREMENTAL',sourceText:'mine ore smelt factory production upgrade automation drone sell coins economy unlock zone manual choice',metrics:passingMetrics});
  assert.equal(result.pass,true);
  assert.equal(result.qualification.pass,true);
  assert.ok(result.commonScore<=60);
  assert.ok(result.categoryScore<=40);
  assert.equal(result.totalScore,result.commonScore+result.categoryScore);
  assert.equal(result.categoryFamily,'TYCOON');
});

test('test harness is rejected before scoring',()=>{
  const metrics={...passingMetrics,testUiRatio:1,directSessionControls:1};
  const hard=evaluateRealGameQualification(metrics);
  assert.equal(hard.pass,false);
  assert.ok(hard.failures.includes('NO_TEST_PROXY'));
  const result=scoreRealWebGame({category:'PUZZLE',sourceText:'board puzzle',metrics});
  assert.equal(result.totalScore,0);
  assert.equal(result.pass,false);
});

test('duplicate actions cannot substitute for functional gameplay',()=>{
  const metrics={...passingMetrics,duplicateActionRatio:.9};
  const hard=evaluateRealGameQualification(metrics);
  assert.equal(hard.pass,false);
  assert.ok(hard.failures.includes('NO_FAKE_PROGRESS'));
});

test('raw button volume does not raise functional UI score',()=>{
  const low=scoreRealWebGame({category:'SURVIVAL',sourceText:'move world resource gather craft enemy threat health survive zone map',metrics:{...passingMetrics,uniqueFunctionalUiCount:3}});
  const high=scoreRealWebGame({category:'SURVIVAL',sourceText:'move world resource gather craft enemy threat health survive zone map',metrics:{...passingMetrics,uniqueFunctionalUiCount:8}});
  assert.ok(high.common.FUNCTIONAL_UI_UX>low.common.FUNCTIONAL_UI_UX);
  assert.equal(low.categoryScore,high.categoryScore);
});
