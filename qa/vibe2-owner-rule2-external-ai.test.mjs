// 파일명: qa/vibe2-owner-rule2-external-ai.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {finalizeVibe2FanInReview} from '../tools/vibe2-fan-in-review.mjs';
import {buildMergedPullRequestTrace} from '../tools/vibe2-merged-pr-provenance.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const roadmap=JSON.parse(fs.readFileSync(path.join(repoRoot,'company-learning/platform-release-roadmap.json'),'utf8'));

function task(){
  return {
    id:'rule2-supervised',gameId:'demo',target:'web',sourceRoot:'web-games/demo',
    department:'development',type:'implementation',status:'running',
    blocker:'candidate-awaiting-qa-and-deployment',
    supervisionApproved:true,
    supervisionContract:{required:true},
    supervisionReview:{
      verified:true,decision:'PASS',rationale:'verified assistant review',
      evidence:['assistant-review-evidence:PASS']
    },
    evidence:[
      'role-result:exploration:PASS','role-result:implementation:PASS',
      'role-result:test:PASS','role-result:performance:PASS',
      'vibe2/candidate/rule2-supervised-primary'
    ]
  };
}
function result(){
  return {
    taskId:'rule2-supervised',outcome:'PASS',
    candidateBranch:'vibe2/candidate/rule2-supervised-primary',
    baseMainSha:'base',
    candidateIdentity:{
      taskId:'rule2-supervised',gameId:'demo',target:'web',
      sourceRoot:'web-games/demo',baseMainSha:'base'
    },
    evidence:[]
  };
}

test('owner rule2 binds verified assistant supervision to atomic supervisor neural evidence without authority expansion',()=>{
  const out=finalizeVibe2FanInReview({queue:{tasks:[task()]},results:[result()],taskIds:['rule2-supervised']});
  const row=out.queue.tasks[0];
  const review=out.reviewed[0];
  assert.equal(review.supervisorNeuralEventRoute.event.type,'SUPERVISOR_RESULT');
  assert.equal(review.supervisorNeuralEventRoute.event.outcome,'PASS');
  assert.equal(review.supervisorNeuralEventRoute.fireAllowed,false);
  assert.equal(review.supervisorNeuralEventRoute.workerCreationAllowed,false);
  assert.equal(review.supervisorNeuralEventRoute.queueMutationAllowed,false);
  assert.ok(row.evidence.includes('assistant-atomic-neuron:connected'));
  assert.ok(row.evidence.includes('assistant-supervisor-result:PASS'));
  assert.ok(row.evidence.some(value=>value.startsWith('neural-event-shadow:')&&decodeURIComponent(value).includes('SUPERVISOR_RESULT')));
});

test('merged external assistant PR provenance stores metadata only and is not reusable capability proof',()=>{
  const trace=buildMergedPullRequestTrace({
    eventPayload:{
      number:2001,
      pull_request:{
        merged:true,title:'raw assistant title must not persist',body:'raw body',
        merged_at:'2026-09-21T00:00:00Z',merge_commit_sha:'merge-sha',
        user:{login:'assistant-user'},base:{ref:'main',sha:'base-sha'},
        head:{ref:'assistant/rule2-demo',sha:'head-sha'}
      }
    },
    changedFiles:[{path:'tools/demo.mjs',added:5,deleted:1,codingRelevant:true}]
  });
  assert.equal(trace.teacherClass,'ASSISTANT_OR_AUTOMATION_CODING');
  assert.equal(trace.provenance.titleStored,false);
  assert.equal(trace.provenance.prBodyStored,false);
  assert.equal(trace.provenance.rawExternalAiOutputStored,false);
  assert.equal(trace.verification.mergeIsNotCapabilityVerification,true);
  assert.equal(trace.verification.freshTaskQaRequiredBeforeReusablePromotion,true);
  assert.equal(trace.safety.reusableBeforeVerification,false);
  assert.equal(trace.safety.authorityExpanded,false);
});

test('owner rule2 central binding keeps external AI learning verified and non-authoritative',()=>{
  const rule=roadmap.ownerCanonicalRules?.rule2;
  assert.equal(rule?.id,'RULE_2_EXTERNAL_AI_SECURITY_CAPTURE_AND_VERIFIED_ABSORPTION');
  assert.equal(rule?.everyActionBecomesLearningCandidate,true);
  assert.equal(rule?.reusableLearningRequiresIndependentVerification,true);
  assert.equal(rule?.rawExternalAiOutputStored,false);
  assert.equal(rule?.authorityExpansion,false);
  assert.equal(rule?.assistantAtomicNeuronBinding?.eventType,'SUPERVISOR_RESULT');
  assert.equal(rule?.assistantAtomicNeuronBinding?.queueMutationAuthority,false);
  assert.equal(rule?.provenanceGapResolution?.externalAssistantMergedPrDurablyCaptured,true);
  assert.equal(rule?.provenanceGapResolution?.mergeDoesNotEqualCapabilityVerification,true);
});
