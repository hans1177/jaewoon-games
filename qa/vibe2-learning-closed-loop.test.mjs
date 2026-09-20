import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file));

test('central machine contracts expose the verified learning closed loop',()=>{
  const roadmap=json('company-learning/platform-release-roadmap.json');
  const architecture=json('company-learning/company-architecture-map.json');
  const motor=json('company-learning/vibe2-learning-motor.json');
  assert.equal(roadmap.version,211);
  assert.equal(architecture.version,53);
  assert.equal(motor.version,5);
  assert.equal(roadmap.learningClosedLoopContract.enabled,true);
  assert.equal(roadmap.learningClosedLoopContract.baselineAtAdoption.verifiedExperienceRecords,0);
  assert.equal(roadmap.learningClosedLoopContract.baselineAtAdoption.verifiedCodePatterns,57);
  assert.equal(roadmap.learningClosedLoopContract.productionConfidence.separateFromMasteryXp,true);
  assert.equal(roadmap.learningClosedLoopContract.strategyPromotion.thresholdsUnchanged,true);
  assert.deepEqual(roadmap.learningClosedLoopContract.commonKnowledgeLifecycle.states,['CANDIDATE','VERIFIED','PREFERRED','DEMOTED','RETIRED']);
  assert.equal(roadmap.webValidationBottleneckAdapterContract.firstPilotGameId,'fantasy-survival');
  assert.equal(architecture.learningClosedLoopTopology.externalAiRawOutputAuthority,'NONE');
  assert.equal(architecture.learningClosedLoopTopology.productionPassAuthority,'CANONICAL_QA_AND_REVIEW_ONLY');
  assert.equal(motor.closedLoop.externalAiDistilledRetrievalRequired,true);
  assert.equal(motor.closedLoop.exactInjectedKnowledgeIdTraceRequired,true);
  assert.equal(motor.closedLoop.productionConfidenceSeparateFromMastery,true);
});

test('continuous runner loads distilled external AI and emits exact knowledge trace',()=>{
  const runner=read('tools/vibe2-continuous-runner.mjs');
  const workflow=read('.github/workflows/vibe2-continuous-core.yml');
  assert.match(runner,/externalAiDistilledInput:externalAiDistilled/);
  assert.match(runner,/\.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(runner,/knowledgeApplicationContract/);
  assert.match(runner,/exactInjectedKnowledgeIds/);
  assert.match(workflow,/learning-knowledge-ids:/);
  assert.match(workflow,/knowledgeApplication/);
  assert.match(workflow,/version:12/);
});

test('Web adapter external AI path is advisory hash-only and requires later verified distillation',()=>{
  const bootstrap=read('tools/company-development-web-bootstrap.mjs');
  const devWorkflow=read('.github/workflows/company-development-confirmed-runtime.yml');
  const webIngest=read('tools/vibe2-web-experience-ingest.mjs');
  assert.match(bootstrap,/buildWebContractAdapterPlan/);
  assert.match(bootstrap,/rawOutputSha256=crypto\.createHash\('sha256'\)/);
  assert.match(bootstrap,/Do not invent gameplay/);
  assert.doesNotMatch(bootstrap,/rawOutputStored:true/);
  assert.match(devWorkflow,/webExternalAiLearningCandidate/);
  assert.match(devWorkflow,/rawOutputSha256/);
  assert.match(webIngest,/distillExternalAiKnowledge/);
  assert.match(webIngest,/formalImplementationPassed/);
  assert.match(webIngest,/externalAiAcceptedCount/);
});

test('24H learning cycle persists verified experience and external AI distilled stores together',()=>{
  const workflow=read('.github/workflows/vibe2-24h-runner.yml');
  assert.match(workflow,/--experience=\.vibe2\/experience\.json/);
  assert.match(workflow,/--external-ai-distilled=\.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(workflow,/git add \.vibe2\/queue\.json[\s\S]*\.vibe2\/experience\.json[\s\S]*\.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(workflow,/VIBE2_WEB_EXTERNAL_AI_DISTILLED_ACCEPTED/);
});

test('human-readable roadmap mirror is not part of the learning closed-loop mutation contract',()=>{
  const roadmap=json('company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.learningClosedLoopContract.existingWaveSchedulerOnly,true);
  assert.equal(roadmap.learningClosedLoopContract.authorityExpansion,false);
  assert.equal(roadmap.learningClosedLoopContract.gateWeakening,false);
});
