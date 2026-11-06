// 파일명: qa/company-web-genre-runtime-evidence.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGenreRuntimeEvidence} from '../tools/company-development-web-gameplay-validation.mjs';

const row=(overrides={})=>({
  mechanicId:'generic-action',
  label:'Generic action',
  stateChanged:false,
  outcomeSignature:JSON.stringify({values:{}}),
  combatOutcomeSignature:JSON.stringify({hp:0,wave:0,score:0,enemy:0,boss:0,result:''}),
  interactionResult:false,
  spatialOutcomeObserved:false,
  addedContent:[],
  ...overrides,
});

test('genre runtime evidence ignores labels without an observed state change',()=>{
  const evidence=buildGenreRuntimeEvidence([
    row({mechanicId:'puzzle-match',label:'퍼즐 맞추기'}),
    row({mechanicId:'factory-upgrade',label:'공장 강화'}),
    row({mechanicId:'attack-enemy',label:'적 공격'}),
  ]);
  assert.equal(evidence.runtimeObserved,false);
  assert.equal(evidence.puzzleRuleCount,0);
  assert.equal(evidence.productionNodeCount,0);
  assert.equal(evidence.attackHitCount,0);
});

test('genre runtime evidence counts only real changed outcomes per genre',()=>{
  const evidence=buildGenreRuntimeEvidence([
    row({mechanicId:'puzzle-match',label:'퍼즐 맞추기',stateChanged:true,outcomeSignature:JSON.stringify({values:{score:10}})}),
    row({mechanicId:'mine-ore',label:'광석 채굴',stateChanged:true,outcomeSignature:JSON.stringify({values:{ore:1}})}),
    row({mechanicId:'factory-upgrade',label:'공장 강화',stateChanged:true,outcomeSignature:JSON.stringify({values:{factory:1,coins:-5}})}),
    row({mechanicId:'checkpoint-jump',label:'체크포인트 점프',stateChanged:true,spatialOutcomeObserved:true,outcomeSignature:JSON.stringify({values:{},positionChanged:true})}),
    row({mechanicId:'weapon-attack',label:'무기 공격',stateChanged:true,combatOutcomeSignature:JSON.stringify({hp:0,wave:0,score:5,enemy:-1,boss:0,result:''}),addedContent:['objective:combat-1']}),
    row({mechanicId:'npc-dialogue-choice',label:'NPC 대화 선택',stateChanged:true,interactionResult:true,addedContent:['objective:story-2']}),
    row({mechanicId:'life-job-work',label:'직업 일하기',stateChanged:true,outcomeSignature:JSON.stringify({values:{coins:3}})}),
  ]);
  assert.equal(evidence.runtimeObserved,true);
  assert.equal(evidence.puzzleRuleCount,1);
  assert.equal(evidence.puzzleSolvedCount,1);
  assert.equal(evidence.puzzleBoardStateCount,1);
  assert.ok(evidence.productionNodeCount>=2);
  assert.ok(evidence.productionTransitionCount>=2);
  assert.ok(evidence.economyTransactionCount>=1);
  assert.equal(evidence.obstacleTypeCount,1);
  assert.equal(evidence.checkpointReachedCount,1);
  assert.equal(evidence.attackHitCount,1);
  assert.equal(evidence.weaponTypeCount,1);
  assert.equal(evidence.combatObjectiveCount,1);
  assert.equal(evidence.dialogueEventCount,1);
  assert.equal(evidence.branchChoiceCount,1);
  assert.equal(evidence.consequenceCount,1);
  assert.equal(evidence.lifeActivityCount,1);
  assert.equal(evidence.characterStateChangeCount,1);
  assert.equal(evidence.persistentStateObserved,false);
});
