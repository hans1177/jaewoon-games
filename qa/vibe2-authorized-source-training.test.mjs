import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTHORIZED_SOURCE_QA_MARKER, qaEvidencePasses, qaRequirementsForTask } from '../tools/vibe2-training-sample.mjs';
import { buildDataset, isVerifiedPass } from '../tools/vibe2-weight-learning.mjs';

function record(){
  return {
    version:3,
    instruction:'authorized Block Blast source study',
    input:'source structure and algorithm patterns',
    output:'reuse verified structure without claiming runtime pass',
    taskType:'coding',
    difficulty:'simple',
    lifecycle:'active',
    sourceKind:'authorized-source',
    project:'block-blast',
    gameId:'block-blast',
    candidateId:'authorized-source-block-blast-test',
    sourceRevision:'sha256:'+'a'.repeat(64),
    independentQa:AUTHORIZED_SOURCE_QA_MARKER,
    browserQa:'NOT_APPLICABLE',
    quality:{codeQuality:1,noRegression:true,playImprovement:0,ruleCompliance:1},
    provenance:{
      sourceKind:'authorized-source',
      sourceRevision:'sha256:'+'a'.repeat(64),
      gameId:'block-blast',
      authority:'OWNER_ASSERTED_REUSE_REINTERPRETATION'
    },
    verification:{
      independentQa:AUTHORIZED_SOURCE_QA_MARKER,
      browserQa:'NOT_APPLICABLE',
      runtime:'STATIC_VERIFIED',
      authorizedSourceEvidence:'PASS',
      runtimePassClaimed:false
    }
  };
}

test('authorized source has a dedicated static evidence gate',()=>{
  assert.deepEqual(qaRequirementsForTask('coding','authorized-source'),{
    independentQa:AUTHORIZED_SOURCE_QA_MARKER,
    browserQa:'NOT_APPLICABLE',
    runtime:'STATIC_VERIFIED',
    authorizedSourceEvidenceRequired:true,
    androidRuntimeRequired:false,
    robloxRuntimeRequired:false,
    uefnRuntimeRequired:false
  });
  assert.equal(qaEvidencePasses({
    taskType:'coding',
    independentQa:AUTHORIZED_SOURCE_QA_MARKER,
    browserQa:'NOT_APPLICABLE',
    runtime:'STATIC_VERIFIED',
    sourceKind:'authorized-source'
  }),true);
  assert.equal(qaEvidencePasses({
    taskType:'coding',
    independentQa:'PASS',
    browserQa:'PASS',
    runtime:'PASS',
    sourceKind:'authorized-source'
  }),false);
});

test('authorized source sample is accepted without being mislabeled runtime PASS',()=>{
  const row=record();
  assert.equal(isVerifiedPass(row),true);
  const ds=buildDataset([{record:row,sourceFile:'authorized.json',index:0}],{
    minTrainSamples:1,
    minFreshTrainSamples:0,
    minDistinctProjects:1,
    minDistinctTaskTypes:1,
    maxProjectShare:1,
    teacherOnlyDifficult:false
  });
  assert.equal(ds.stats.accepted,1);
  assert.equal(ds.stats.skippedUnverified,0);
});
