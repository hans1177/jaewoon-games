import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildVerifiedTrainingSample, qaEvidencePasses } from '../tools/vibe2-training-sample.mjs';
import { isVerifiedPass } from '../tools/vibe2-weight-learning.mjs';

const trace=(revision='unity-release-sha',overrides={})=>({state:'PASS',sourceRevision:revision,commitSha:revision,pullRequest:224,ci:'PASS',independentQa:'PASS',runtime:'PASS',stale:false,flaky:false,...overrides});
const evidence=(overrides={})=>({gameId:'P0009',candidateId:'unity-release-P0009',sourcePath:'unity-games/P0009',role:'development',goal:'검증된 Unity 출시 수정 학습',summary:'Android runtime과 독립 QA를 통과한 Unity 수정',changedFiles:['unity-games/P0009/Assets/Scripts/Player.cs'],verificationTrace:trace(),...overrides});

test('Unity는 browser QA 없이 실제 runtime PASS로 학습 승격된다',()=>{
  const sample=buildVerifiedTrainingSample({evidence:evidence(),patch:'diff --git a/unity-games/P0009/Assets/Scripts/Player.cs b/unity-games/P0009/Assets/Scripts/Player.cs\n-old\n+new',sourceRevision:'unity-release-sha',independentQa:'PASS',browserQa:'NOT_APPLICABLE',taskType:'unity'});
  assert.equal(sample.taskType,'unity');
  assert.equal(sample.browserQa,'NOT_APPLICABLE');
  assert.equal(sample.verification.trace.runtime,'PASS');
  assert.equal(sample.verification.androidRuntimeRequired,true);
  assert.equal(isVerifiedPass(sample),true);
});

test('Web은 계속 browser QA PASS가 필수다',()=>{
  assert.equal(qaEvidencePasses({taskType:'bugfix',independentQa:'PASS',browserQa:'FAIL',runtime:'PASS'}),false);
});

test('Unity source trace의 runtime/stale/SHA가 틀리면 승격되지 않는다',()=>{
  const patch='diff --git a/unity-games/P0009/Assets/a.cs b/unity-games/P0009/Assets/a.cs\n-a\n+b';
  assert.throws(()=>buildVerifiedTrainingSample({evidence:evidence({verificationTrace:trace('unity-release-sha',{runtime:'FAIL'})}),patch,sourceRevision:'unity-release-sha',browserQa:'NOT_APPLICABLE',taskType:'unity'}),/runtime PASS/);
  assert.throws(()=>buildVerifiedTrainingSample({evidence:evidence({verificationTrace:trace('unity-release-sha',{stale:true})}),patch,sourceRevision:'unity-release-sha',browserQa:'NOT_APPLICABLE',taskType:'unity'}),/stale/);
  assert.throws(()=>buildVerifiedTrainingSample({evidence:evidence({verificationTrace:trace('other-sha')}),patch,sourceRevision:'unity-release-sha',browserQa:'NOT_APPLICABLE',taskType:'unity'}),/SHA mismatch/);
});

test('Unity release ingest는 RELEASE_READY/current build/runtime/QA/merged PR를 모두 fail-closed로 요구한다',()=>{
  const source=fs.readFileSync('tools/vibe2-distillation-ingest.mjs','utf8');
  assert.match(source,/RELEASE_BASELINE_NOT_READY/);
  assert.match(source,/CURRENT_SOURCE_BUILD_BINDING_MISSING/);
  assert.match(source,/RUNTIME_OR_INDEPENDENT_QA_NOT_BOUND/);
  assert.match(source,/BUILD_ID_MISMATCH/);
  assert.match(source,/MERGED_PR_NOT_FOUND/);
  assert.match(source,/VERIFIED_UNITY_PATCH_NOT_FOUND/);
  assert.match(source,/taskType: 'unity'/);
  assert.match(source,/browserQa: 'NOT_APPLICABLE'/);
});
