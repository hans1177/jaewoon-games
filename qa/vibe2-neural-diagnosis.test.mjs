// 파일명: qa/vibe2-neural-diagnosis.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNeuralDiagnosis, neuralDiagnosisGuidance } from '../tools/vibe2-neural-diagnosis.mjs';

test('runtime playable-cycle evidence creates game-runtime hypothesis without turning hypothesis into fact',()=>{
  const d=buildNeuralDiagnosis({task:{
    id:'bug-defense-repair',target:'web',priority:'owner-immediate',
    goal:'[WEB_REPAIR] COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED 수정',
    evidence:[
      'web-stage:WEB_REPAIR',
      'company-runtime-state:WEB_VIBE_REPAIR_REQUIRED',
      'development-validation-blocker:COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED'
    ]
  }});
  assert.equal(d.mode,'PHASE1_SHADOW_ADVISORY');
  assert.equal(d.responsibility.system,'GAME_RUNTIME');
  assert.equal(d.actionRecommendation.failureStage,'WEB_REPAIR');
  assert.ok(d.hypotheses.some(x=>x.id==='runtime-gameplay-cycle'));
  assert.ok(d.facts.every(x=>x.verified===true));
  assert.equal(d.facts.some(x=>x.value.includes('runtime-gameplay-cycle')),false);
  assert.equal(d.waveControl.mayReorderWave,false);
  assert.equal(d.waveControl.mayCreateWorker,false);
});

test('validator classification evidence routes responsibility to validator in shadow mode',()=>{
  const d=buildNeuralDiagnosis({task:{
    goal:'validator classification false positive for approved scope',
    evidence:['web-stage:WEB_REPAIR','routing-blocker=APPROVED_SCOPE_REAL_SPATIAL_STATE_REQUIRED','validation-failure:VALIDATOR_CLASSIFICATION_FALSE_POSITIVE']
  }});
  assert.equal(d.responsibility.system,'VALIDATOR');
  assert.ok(d.responsibility.confidence>.4);
  assert.equal(d.actionRecommendation.responsibleSystem,'VALIDATOR');
  assert.equal(d.actionRecommendation.restartFromBeginning,false);
});

test('supervised work has a hard inhibitor but diagnosis cannot cancel or reprioritize the wave',()=>{
  const d=buildNeuralDiagnosis({task:{
    goal:'major supervised web repair',
    supervisionContract:{required:true},
    supervisionApproved:false,
    evidence:['supervised-web-build:required','automatic-promotion:blocked-until-supervised-approval']
  }});
  assert.ok(d.inhibitors.includes('SUPERVISOR_PASS_REQUIRED_BUT_MISSING'));
  assert.equal(d.actionRecommendation.blocked,true);
  assert.equal(d.waveControl.currentWaveSchedulerRemainsAuthoritative,true);
  assert.equal(d.bottleneck.advisoryOnly,true);
});

test('shared validator failure receives higher bottleneck signal than isolated cosmetic work',()=>{
  const shared=buildNeuralDiagnosis({task:{
    priority:'high',
    goal:'shared validator classification failure blocks Web runtime validation',
    evidence:['web-stage:WEB_REPAIR','routing-blocker=VALIDATOR_CLASSIFICATION_FALSE_POSITIVE','requeue:retry']
  }});
  const cosmetic=buildNeuralDiagnosis({task:{
    priority:'normal',
    goal:'minor local cosmetic spacing cleanup',
    evidence:['release-state:development-confirmed']
  }});
  assert.ok(shared.bottleneck.score>cosmetic.bottleneck.score);
  assert.equal(shared.bottleneck.mayReorderWave,false);
});

test('guidance explicitly preserves existing authority and rejects fake-gameplay validator workarounds',()=>{
  const d=buildNeuralDiagnosis({task:{
    goal:'validator issue',
    evidence:['routing-blocker=VALIDATOR_CLASSIFICATION_FALSE_POSITIVE']
  }});
  const text=neuralDiagnosisGuidance(d);
  assert.match(text,/advisory-only=YES/);
  assert.match(text,/wave scheduling remain authoritative/);
  assert.match(text,/Do not patch a validator problem by faking gameplay/);
});


test('current deterministic diagnostic responsibility outranks stale historical hints without becoming verified root cause',()=>{
  const d=buildNeuralDiagnosis({task:{
    goal:'반복 타이머 생명주기 문제를 수정한다',
    evidence:[
      'diagnostic:INTERVAL_CLEANUP_RISK',
      'diagnostic-key:INTERVAL_CLEANUP_RISK:index.js',
      'failure-cause:old-save-restore-timeout',
      'historical-localStorage-save-path',
      'source-candidate-generation-failed:TIMEOUT'
    ]
  }});
  assert.equal(d.responsibility.system,'GAME_RUNTIME');
  assert.equal(d.responsibility.basis,'CURRENT_DETERMINISTIC_DIAGNOSTIC_HYPOTHESIS');
  assert.equal(d.responsibility.verified,false);
  assert.equal(d.actionRecommendation.responsibleSystem,'GAME_RUNTIME');
  assert.equal(d.hypotheses[0].diagnosticType,'INTERVAL_CLEANUP_RISK');
  assert.equal(d.hypotheses[0].diagnosticFile,'index.js');
  assert.equal(d.hypotheses[0].verified,false);
  assert.equal(d.learning.eligible,false);
  assert.equal(d.waveControl.mayReorderWave,false);
  assert.equal(d.waveControl.mayCreateWorker,false);
});

test('ambiguous current diagnostic does not override weighted shadow responsibility',()=>{
  const d=buildNeuralDiagnosis({task:{
    goal:'viewport 표시 문제와 저장 복구를 확인한다',
    evidence:[
      'diagnostic:MISSING_VIEWPORT',
      'diagnostic-key:MISSING_VIEWPORT:index.html',
      'runtime-failure:SAVE_RESTORE_BROKEN'
    ]
  }});
  assert.equal(d.responsibility.system,'SAVE_SYSTEM');
  assert.equal(d.responsibility.basis,'WEIGHTED_SHADOW_HYPOTHESES');
  assert.equal(d.responsibility.verified,false);
  assert.equal(d.hypotheses.some(row=>row.id.startsWith('current-deterministic-diagnostic-')),false);
});
