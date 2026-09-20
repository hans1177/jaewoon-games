// 파일명: qa/vibe2-central-work-contract.test.mjs
// 역할: 최신 중앙 roadmap 작업계약, 권한 경계, exact failure routing, stale fail-closed를 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  CANONICAL_VIBE_POLICY_PATH,
  loadCentralPolicySnapshot,
  compileVibeCentralWorkContract,
  assertCompiledWorkContractFresh
} from '../tools/vibe2-central-work-contract.mjs';
import { runVibe2SourceWorker } from '../tools/vibe2-source-worker.mjs';

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-central-contract-'));}
function git(cwd,...args){return execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}

function writePolicy(root,version=196,overrides={}){
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const document={
    version,
    status:'OWNER_DIRECT_LOCKED',
    policySource:CANONICAL_VIBE_POLICY_PATH,
    developmentLifecycleMachine:{
      sharedWorkerContext:{
        requiredForAllWorkers:true,
        centralPolicy:CANONICAL_VIBE_POLICY_PATH,
        beforeWorkRequired:true,
        afterWorkRequired:true,
        staleContextMayNotStartWork:true,
        staleContextMayNotCompleteWork:true,
        syncMode:'ROADMAP_FIRST_FAIL_CLOSED',
        mismatchAction:'BLOCK_COMPLETION_AND_REQUEUE_EXACT_FAILURE_STAGE'
      }
    },
    assistantRoadmapOrchestration:{
      version:1,
      sourceOfTruth:CANONICAL_VIBE_POLICY_PATH,
      blockerOnly:false,
      operatingModel:{dedupeRequired:true},
      assistantRole:{
        mayCreateExecutionWorker:false,
        mayMutateWaveQueue:false,
        mayReorderWave:false,
        mayMutateLocksOrPolicy:false,
        mayAutoPromoteLearningOrTuning:false,
        mayExpandNeuralAuthority:false
      },
      executionBoundary:{
        executionAuthority:'EXISTING_WAVE_SCHEDULER_ONLY',
        neuralExecutionAuthority:false,
        workerCreationAuthority:false,
        queueMutationAuthority:false,
        waveReorderAuthority:false,
        lockPolicyMutationAuthority:false,
        automaticLearningTuningPromotionAuthority:false
      },
      implementationState:{nextGate:'OPERATE_FROM_CENTRAL_ROADMAP_ACTIONABLE_NEXT_GATE_WITH_DURABLE_GITHUB_HANDOFF'}
    }
  };
  Object.assign(document,overrides);
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
}

test('current central roadmap compiles a complete Vibe work request without authority expansion',()=>{
  const root=tempRoot();
  writePolicy(root);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(snapshot.valid,true);
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{
      id:'repair-1',
      gameId:'bug-defense',
      target:'web',
      blocker:'COMPLETE_PLAYABLE_GAMEPLAY_CYCLE_REQUIRED',
      lastOutcome:'FAIL',
      evidence:['web-stage:VIBE_WEB_REPAIR','last-passed-stage:SAVE_RESTORE','runtime-failure:TERMINAL_NOT_REACHED']
    },
    plan:{target:'web',qa:['runtime-cycle']},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/bug-defense/index.html'],
    supervisionContract:{required:true,approved:false,protectedSemantics:['SAVE_KEY_AND_SAVE_MEANING'],hardReject:['VALIDATION_ONLY_PATCH']},
    mainSha:'abc123'
  });
  assert.equal(contract.required,true);
  assert.equal(contract.validAtCompile,true);
  assert.equal(contract.workRequest.workKey,'repair-1');
  assert.equal(contract.workRequest.roadmapVersion,196);
  assert.equal(contract.workRequest.mainSha,'abc123');
  assert.deepEqual(contract.workRequest.scope,['web-games/bug-defense/index.html']);
  assert.ok(contract.workRequest.dedupeKey);
  assert.equal(contract.workRequest.authorityBoundary.executionAuthority,'EXISTING_WAVE_SCHEDULER_ONLY');
  assert.equal(contract.workRequest.authorityBoundary.workerCreationAuthority,false);
  assert.equal(contract.workRequest.authorityBoundary.queueMutationAuthority,false);
  assert.equal(contract.failureRoute.failureStage,'VIBE_WEB_REPAIR');
  assert.equal(contract.failureRoute.lastPassedStage,'SAVE_RESTORE');
  assert.equal(contract.failureRoute.restartFromBeginning,false);
  assert.ok(contract.invariants.protectedSemantics.includes('SAVE_KEY_AND_SAVE_MEANING'));
  assert.ok(contract.invariants.forbiddenChanges.includes('VALIDATION_ONLY_PATCH'));
  assert.equal(contract.learning.reusableLearningAllowed,false);
  assert.equal(contract.promotion.automaticMainPromotionAllowed,false);
  assert.equal(contract.authorityExpanded,false);
});

test('central roadmap snapshot rejects execution authority expansion',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const file=path.join(root,CANONICAL_VIBE_POLICY_PATH);
  const document=JSON.parse(fs.readFileSync(file,'utf8'));
  document.assistantRoadmapOrchestration.executionBoundary.workerCreationAuthority=true;
  fs.writeFileSync(file,JSON.stringify(document,null,2)+'\n','utf8');
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  assert.equal(snapshot.valid,false);
  assert.ok(snapshot.errors.includes('WORKER_CREATION_AUTHORITY'));
});

test('central roadmap fingerprint is fail-closed when policy changes during work',()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{id:'task',gameId:'demo',target:'web'},
    plan:{target:'web'},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html'],
    mainSha:'abc123'
  });
  assert.equal(assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_WORK'}).status,'PASS');
  writePolicy(root,197);
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:root,contract,phase:'PRE_CANDIDATE_WRITE'}),
    /CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/
  );
});

test('pinned worker detects a central policy change that exists only on live origin main',()=>{
  const base=tempRoot();
  const origin=path.join(base,'origin.git');
  const seed=path.join(base,'seed');
  const worker=path.join(base,'worker');
  fs.mkdirSync(seed,{recursive:true});
  execFileSync('git',['init','--bare',origin],{stdio:['ignore','pipe','pipe']});
  git(seed,'init','-b','main');
  git(seed,'config','user.name','qa');
  git(seed,'config','user.email','qa@example.invalid');
  writePolicy(seed,196);
  git(seed,'add','.');
  git(seed,'commit','-m','policy v196');
  git(seed,'remote','add','origin',origin);
  git(seed,'push','-u','origin','main');
  execFileSync('git',['clone','--quiet','--branch','main',origin,worker],{stdio:['ignore','pipe','pipe']});

  const snapshot=loadCentralPolicySnapshot({repoRoot:worker,required:true});
  const contract=compileVibeCentralWorkContract({
    snapshot,
    task:{id:'live-stale',gameId:'demo',target:'web'},
    plan:{target:'web'},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html'],
    mainSha:git(worker,'rev-parse','HEAD'),
    livePolicyRef:'origin/main'
  });
  assert.equal(contract.freshness.liveMainRequired,true);
  assert.equal(assertCompiledWorkContractFresh({cwd:worker,contract,phase:'PRE_SOURCE_GENERATION'}).liveMainVersion,196);

  writePolicy(seed,197);
  git(seed,'add',CANONICAL_VIBE_POLICY_PATH);
  git(seed,'commit','-m','policy v197');
  git(seed,'push','origin','main');
  assert.equal(loadCentralPolicySnapshot({repoRoot:worker,required:true}).version,196);
  assert.throws(
    ()=>assertCompiledWorkContractFresh({cwd:worker,contract,phase:'PRE_CANDIDATE_WRITE'}),
    /CENTRAL_POLICY_STALE:PRE_CANDIDATE_WRITE/
  );
});

test('source worker rejects stale compiled policy before model generation',async()=>{
  const root=tempRoot();
  writePolicy(root,196);
  const snapshot=loadCentralPolicySnapshot({repoRoot:root,required:true});
  const compiledWorkContract=compileVibeCentralWorkContract({
    snapshot,
    task:{id:'stale-worker',gameId:'demo',target:'web'},
    plan:{target:'web'},
    route:{route:'text-source-worker'},
    responsibleFiles:['web-games/demo/index.html'],
    mainSha:'abc123'
  });
  fs.mkdirSync(path.join(root,'.vibe2'),{recursive:true});
  fs.writeFileSync(path.join(root,'.vibe2/work-order.json'),JSON.stringify({
    run:true,
    workMode:'source-change-candidate',
    taskId:'stale-worker',
    gameId:'demo',
    target:'web',
    source:{root:'web-games/demo',responsibleFiles:['web-games/demo/index.html']},
    workerPolicy:{directMainWrite:false},
    compiledWorkContract
  },null,2)+'\n','utf8');
  writePolicy(root,197);
  await assert.rejects(
    runVibe2SourceWorker({cwd:root,responseFile:path.join(root,'unused-model-output.json')}),
    /CENTRAL_POLICY_STALE:PRE_SOURCE_GENERATION/
  );
});
