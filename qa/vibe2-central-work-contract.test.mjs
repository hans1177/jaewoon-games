// 파일명: qa/vibe2-central-work-contract.test.mjs
// 역할: 중앙 roadmap 작업계약 컴파일, 불변조건 잠금, 정확 실패단계 라우팅, stale fail-closed를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CANONICAL_VIBE_POLICY_PATH,
  loadCentralPolicySnapshot,
  compileVibeCentralWorkContract,
  assertCompiledWorkContractFresh
} from '../tools/vibe2-central-work-contract.mjs';

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-central-contract-'));}
function writePolicy(root,version=167){
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify({
    version,
    authority:'MACHINE_EXECUTION_CONTRACT',
    machineSourceOfTruth:CANONICAL_VIBE_POLICY_PATH,
    humanDocumentRequired:false,
    vibeCentralWorkContract:{required:true,defaultProtectedSemantics:['HIT_SEMANTICS']},
    developmentLifecycleMachine:{sharedWorkerContext:{
      requiredForAllWorkers:true,
      centralPolicy:CANONICAL_VIBE_POLICY_PATH,
      beforeWorkRequired:true,
      afterWorkRequired:true,
      staleContextMayNotStartWork:true,
      staleContextMayNotCompleteWork:true,
      syncMode:'ROADMAP_FIRST_FAIL_CLOSED',
      mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'
    }}
  },null,2)+'\n','utf8');
}

test('central roadmap compiles exact writable scope, invariants and failure route',()=>{
  const root=tempRoot();
  writePolicy(root);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(snapshot.valid,true);
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{
      id:'repair-1',gameId:'bug-defense',target:'web',blocker:'COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED',
      lastOutcome:'FAIL',evidence:['web-stage:VIBE_WEB_REPAIR','last-passed-stage:SAVE_RESTORE','runtime-failure:TERMINAL_NOT_REACHED']
    },
    plan:{target:'web',qa:['runtime-cycle']},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/bug-defense/index.html'],
    supervisionContract:{required:true,approved:false,protectedSemantics:['SAVE_KEY_AND_SAVE_MEANING'],hardReject:['VALIDATION_ONLY_PATCH']}
  });
  assert.equal(contract.required,true);
  assert.deepEqual(contract.writableScope.exactResponsibleFiles,['web-games/bug-defense/index.html']);
  assert.equal(contract.writableScope.automaticExpansionAllowed,false);
  assert.ok(contract.invariants.protectedSemantics.includes('HIT_SEMANTICS'));
  assert.ok(contract.invariants.forbiddenChanges.includes('VALIDATION_ONLY_PATCH'));
  assert.equal(contract.failureRoute.failureStage,'VIBE_WEB_REPAIR');
  assert.equal(contract.failureRoute.lastPassedStage,'SAVE_RESTORE');
  assert.equal(contract.failureRoute.restartFromBeginning,false);
  assert.equal(contract.failureRoute.preserveAlreadyPassedStages,true);
  assert.equal(contract.learning.reusableLearningAllowed,false);
  assert.equal(contract.learning.traceOnlyUntilSupervisorPass,true);
  assert.equal(contract.promotion.automaticMainPromotionAllowed,false);
});

test('central roadmap fingerprint is fail-closed when policy changes during work',()=>{
  const root=tempRoot();
  writePolicy(root,167);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const contract=compileVibeCentralWorkContract({
    snapshot,task:{id:'task',gameId:'demo',target:'web'},plan:{target:'web'},route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html']
  });
  assert.equal(assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_WORK'}).status,'PASS');
  writePolicy(root,168);
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_CANDIDATE_WRITE'}),
    /CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/
  );
});
