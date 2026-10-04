// 파일명: qa/main-write-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FINAL_CHAIN_LOCK_PATHS, LOCKED_FLOW_SEQUENCE_KEYS, finalChainLockViolations, finalDevelopmentLockMetadataViolations, flowSequenceLockViolations, isWorkflowPath, scanTextForDirectMainWrite } from '../tools/main-write-guard.mjs';

test('workflow path detector only accepts workflow yaml files',()=>{
  assert.equal(isWorkflowPath('.github/workflows/build.yml'),true);
  assert.equal(isWorkflowPath('.github/workflows/build.yaml'),true);
  assert.equal(isWorkflowPath('tools/build.yml'),false);
});

test('direct main pushes are blocked',()=>{
  const hits=scanTextForDirectMainWrite(`git push origin HEAD:main\ngit push origin main`);
  assert.equal(hits.length,2);
});

test('feature branch pushes remain allowed',()=>{
  const hits=scanTextForDirectMainWrite('git push origin HEAD:autonomous-dev');
  assert.equal(hits.length,0);
});

test('ordinary workflow references to main are not false positives',()=>{
  const hits=scanTextForDirectMainWrite('ref: main\nbranches: [main]\ngit fetch origin main');
  assert.equal(hits.length,0);
});

test('main ref expressions containing inputs are not mistaken for HTTP PUT writes',()=>{
  const line="group: ${{ github.ref == 'refs/heads/main' && inputs.execution_lane || 'game-primary' }}";
  assert.equal(scanTextForDirectMainWrite(line).length,0);
  assert.equal(scanTextForDirectMainWrite('refs/heads/main PUT').length,1);
});

test('main write guard workflow uses shallow partial checkout and exact base fetch',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/fetch-depth:\s*1/);
  assert.match(workflow,/filter:\s*blob:none/);
  assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$base_sha"/);
});

test('main write guard falls back to two-point diff when shallow history has no merge base',()=>{
  const source=fs.readFileSync(new URL('../tools/main-write-guard.mjs',import.meta.url),'utf8');
  assert.match(source,/\${baseRef}\.\.\.\${headRef}/);
  assert.match(source,/\['diff','--name-only',baseRef,headRef\]/);
});


test('main write guard skips its own unit suite when only unrelated workflow files changed',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/Detect guard implementation change/);
  assert.match(workflow,/guard_changed=NO/);
  assert.match(workflow,/tools\/main-write-guard\\.mjs\|qa\/main-write-guard\\.test\\.mjs\|\\.github\/workflows\/main-write-guard\\.yml/);
  assert.match(workflow,/if: \$\{\{ steps\.scope\.outputs\.guard_changed == 'YES' \}\}/);
  assert.match(workflow,/Reject new workflow direct writes to main/);
});


test('final chain lock v2 protects guard implementation but leaves chain optimization files open',()=>{
  const lock={version:2,status:'LOCKED',chainLock:{status:'LOCKED'}};
  const hits=finalChainLockViolations({
    files:[
      'tools/main-write-guard.mjs',
      'tools/company-build-up-directive.mjs',
      'tools/company-recovery-escalation.mjs',
      '.github/workflows/company-development-roblox-runtime.yml',
      'roblox-games/demo/server/Game.server.luau'
    ],
    lock,actor:'github-actions[bot]',owner:'hans1177'
  });
  assert.deepEqual(hits.map(row=>row.file),['tools/main-write-guard.mjs']);
});

test('final chain lock v2 cannot be unlocked by PR title or assistant-synthesized metadata',()=>{
  const lock={version:2,status:'LOCKED'};
  for(const unlockTitle of [
    '[OWNER_UNLOCK] pipeline repair',
    '[OWNER_LOCK_HARDEN_V2] migration',
    'owner approved in chat',
    ''
  ]){
    const hits=finalChainLockViolations({
      files:['tools/main-write-guard.mjs'],
      lock,actor:'hans1177',owner:'hans1177',unlockTitle
    });
    assert.equal(hits.length,1,unlockTitle);
    assert.equal(hits[0].reason,'FINAL_CHAIN_LOCKED_AUTOMATION_IMMUTABLE');
  }
});

test('one-time v1 to v2 lock hardening migration requires owner actor and exact migration token',()=>{
  const lock={version:1,status:'LOCKED',chainLock:{status:'LOCKED'},lockedPaths:FINAL_CHAIN_LOCK_PATHS};
  assert.equal(finalChainLockViolations({
    files:['tools/main-write-guard.mjs'],lock,actor:'hans1177',owner:'hans1177',unlockTitle:'[OWNER_LOCK_HARDEN_V2] central lock migration'
  }).length,0);
  assert.equal(finalChainLockViolations({
    files:['tools/main-write-guard.mjs'],lock,actor:'other-user',owner:'hans1177',unlockTitle:'[OWNER_LOCK_HARDEN_V2] central lock migration'
  }).length,1);
  assert.equal(finalChainLockViolations({
    files:['tools/main-write-guard.mjs'],lock,actor:'hans1177',owner:'hans1177',unlockTitle:'[OWNER_UNLOCK] central lock migration'
  }).length,1);
});

test('main write guard watches central sequence policy and guard implementation without locking chain implementation files',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/company-learning\/platform-release-roadmap\.json/);
  assert.match(workflow,/tools\/main-write-guard\.mjs/);
  assert.match(workflow,/--unlock-title=/);
  assert.doesNotMatch(workflow,/roblox-games\/\*\*/);
});


test('main write guard recovers merged owner-unlock PR title on push without weakening actor checks',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/main-write-guard.yml',import.meta.url),'utf8');
  assert.match(workflow,/pull-requests:\s*read/);
  assert.match(workflow,/EVENT_NAME: \$\{\{ github\.event_name \}\}/);
  assert.match(workflow,/HEAD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(workflow,/commits\/\$HEAD_SHA\/pulls\?per_page=20/);
  assert.match(workflow,/unlock_title="\$PR_TITLE"/);
  assert.match(workflow,/--unlock-title="\$unlock_title"/);
  assert.match(workflow,/MAIN_WRITE_GUARD_UNLOCK_METADATA=ASSOCIATED_PR_OR_EVENT/);
  assert.match(workflow,/if \[ "\$EVENT_NAME" = 'push' \] && \[ -z "\$unlock_title" \]/);
});

test('flow sequence lock rejects F0/F9 order mutation while allowing unrelated central policy edits',()=>{
  const base={
    finalDevelopmentLock:{version:2,status:'LOCKED',chainLock:{status:'LOCKED'}},
    developmentLifecycleMachine:{
      verifiedF0F9PublicationLoop:{sequence:['GAME_SOURCE_MUTATION','F0','F1','F9','IMMEDIATE_NEXT_EVOLUTION_CYCLE']},
      nativeGameFoundationValidationStack:{releaseGate:{canonicalSequence:['F0_SOURCE_PREFLIGHT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_SERVER_BOOT_PASS','F9_RELEASE_REGRESSION_PASS','INTERNAL_PLATFORM_RELEASE']}}
    },
    unrelated:{value:1}
  };
  const unrelated=structuredClone(base);unrelated.unrelated.value=2;
  assert.equal(flowSequenceLockViolations({basePolicy:base,headPolicy:unrelated,lock:base.finalDevelopmentLock}).length,0);
  const changed=structuredClone(base);
  changed.developmentLifecycleMachine.verifiedF0F9PublicationLoop.sequence=['GAME_SOURCE_MUTATION','F0','F9','F1','IMMEDIATE_NEXT_EVOLUTION_CYCLE'];
  const hits=flowSequenceLockViolations({basePolicy:base,headPolicy:changed,lock:base.finalDevelopmentLock});
  assert.equal(hits.length,1);
  assert.equal(hits[0].reason,'FLOW_SEQUENCE_LOCKED_AUTOMATION_IMMUTABLE');
  assert.equal(hits[0].sequence,LOCKED_FLOW_SEQUENCE_KEYS[0]);
});

test('flow sequence lock rejects foundation order mutation',()=>{
  const base={
    finalDevelopmentLock:{version:2,status:'LOCKED',chainLock:{status:'LOCKED'}},
    developmentLifecycleMachine:{
      verifiedF0F9PublicationLoop:{sequence:['GAME_SOURCE_MUTATION','F0','F1','F9','IMMEDIATE_NEXT_EVOLUTION_CYCLE']},
      nativeGameFoundationValidationStack:{releaseGate:{canonicalSequence:['F0_SOURCE_PREFLIGHT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_SERVER_BOOT_PASS','F9_RELEASE_REGRESSION_PASS','INTERNAL_PLATFORM_RELEASE']}}
    }
  };
  const changed=structuredClone(base);
  changed.developmentLifecycleMachine.nativeGameFoundationValidationStack.releaseGate.canonicalSequence=['F0_SOURCE_PREFLIGHT_PASS','F1_SERVER_BOOT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F9_RELEASE_REGRESSION_PASS','INTERNAL_PLATFORM_RELEASE'];
  const hits=flowSequenceLockViolations({basePolicy:base,headPolicy:changed,lock:base.finalDevelopmentLock});
  assert.equal(hits.length,1);
  assert.equal(hits[0].sequence,LOCKED_FLOW_SEQUENCE_KEYS[1]);
});

test('flow sequence lock blocks order changes but allows parallelism policy edits',()=>{
  const base={
    finalDevelopmentLock:{version:2,status:'LOCKED',scope:'CANONICAL_FLOW_SEQUENCE_AND_GUARD_ONLY',sequenceLock:{status:'LOCKED',mode:'SEQUENCE_SEMANTICS_ONLY'}},
    developmentLifecycleMachine:{
      verifiedF0F9PublicationLoop:{sequence:['GAME_SOURCE_MUTATION','F0','F1','F9','IMMEDIATE_NEXT_EVOLUTION_CYCLE']},
      nativeGameFoundationValidationStack:{releaseGate:{canonicalSequence:['F0_SOURCE_PREFLIGHT_PASS','PRIVATE_RUNTIME_CANDIDATE_DEPLOY','F1_SERVER_BOOT_PASS','F9_RELEASE_REGRESSION_PASS','INTERNAL_PLATFORM_RELEASE']}}
    },
    developmentSpeedExecution:{robloxEndToEndParallelExecution:{globalSerializationForbidden:true}}
  };
  const safe=structuredClone(base);
  safe.developmentSpeedExecution.robloxEndToEndParallelExecution.globalSerializationForbidden=false;
  assert.equal(flowSequenceLockViolations({basePolicy:base,headPolicy:safe,lock:base.finalDevelopmentLock}).length,0);
  const changed=structuredClone(base);
  changed.developmentLifecycleMachine.verifiedF0F9PublicationLoop.sequence=['GAME_SOURCE_MUTATION','F0','F9','F1','IMMEDIATE_NEXT_EVOLUTION_CYCLE'];
  assert.equal(flowSequenceLockViolations({basePolicy:base,headPolicy:changed,lock:base.finalDevelopmentLock}).length,1);
});

test('final sequence lock metadata cannot be disabled by repository changes',()=>{
  const base={finalDevelopmentLock:{version:2,status:'LOCKED',scope:'CANONICAL_FLOW_SEQUENCE_AND_GUARD_ONLY',sequenceLock:{status:'LOCKED',mode:'SEQUENCE_SEMANTICS_ONLY'}}};
  const safe=structuredClone(base);
  assert.equal(finalDevelopmentLockMetadataViolations({basePolicy:base,headPolicy:safe,lock:base.finalDevelopmentLock}).length,0);
  const disabled=structuredClone(base);
  disabled.finalDevelopmentLock.status='UNLOCKED';
  assert.ok(finalDevelopmentLockMetadataViolations({basePolicy:base,headPolicy:disabled,lock:base.finalDevelopmentLock}).length>0);
});

