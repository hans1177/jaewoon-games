import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const json=file=>JSON.parse(read(file));

test('central machine contracts expose the verified learning closed loop',()=>{
  const roadmap=json('company-learning/platform-release-roadmap.json');
  const architecture=json('company-learning/company-architecture-map.json');
  const motor=json('company-learning/vibe2-learning-motor.json');
  assert.ok(Number.isInteger(roadmap.version)&&roadmap.version>=222);
  assert.ok(Number.isInteger(architecture.version)&&architecture.version>=64);
  assert.equal(motor.version,7);
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
  assert.equal(motor.mastery.domainMasteryLevelLimit,null);
  assert.equal(motor.mastery.verifiedGrowthUnbounded,true);
  assert.equal(motor.benchmarkLadder.levels,null);
  assert.equal(motor.benchmarkLadder.repeatForever,true);
  assert.equal(motor.idleTraining.practiceSignalGenerationAlwaysOn,true);
  assert.equal(motor.idleTraining.practiceGenerationLimit,null);
  assert.equal(motor.idleTraining.productionPresenceDoesNotSuppressPracticeGeneration,true);
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
  assert.match(workflow,/version:14/);
  assert.match(workflow,/workLock/);
});

test('Web adapter stays deterministic while external AI remains in a separate verified distillation lane',()=>{
  const bootstrap=read('tools/company-development-web-bootstrap.mjs');
  const devWorkflow=read('.github/workflows/company-development-confirmed-runtime.yml');
  const webIngest=read('tools/vibe2-web-experience-ingest.mjs');
  assert.match(bootstrap,/buildWebContractAdapterPlan/);
  assert.match(bootstrap,/WEB_CONTRACT_EXTERNAL_AI_ADVISORY=DEFERRED_TO_VERIFIED_DISTILLATION_LANE/);
  assert.doesNotMatch(bootstrap,/GEMINI_API_KEY|generativelanguage\.googleapis|rawOutputSha256/);
  assert.doesNotMatch(devWorkflow,/GEMINI_API_KEY|webExternalAiLearningCandidate|externalAiCandidateFromBootstrap/);
  assert.match(webIngest,/distillExternalAiKnowledge/);
  assert.match(webIngest,/formalImplementationPassed/);
  assert.match(webIngest,/externalAiAcceptedCount/);
});

test('24H learning cycle persists verified experience and external AI distilled stores together',()=>{
  const workflow=read('.github/workflows/vibe2-24h-runner.yml');
  assert.match(workflow,/--experience=\.vibe2\/experience\.json/);
  assert.match(workflow,/--external-ai-distilled=\.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(workflow,/git add \.vibe2\/queue\.json[\s\S]*\.vibe2\/experience\.json[\s\S]*\.vibe2\/external-ai-distilled-knowledge\.json/);
  assert.match(workflow,/VIBE2_EXTERNAL_AI_ACCEPTED/);
});

test('human-readable roadmap mirror is not part of the learning closed-loop mutation contract',()=>{
  const roadmap=json('company-learning/platform-release-roadmap.json');
  assert.equal(roadmap.learningClosedLoopContract.existingWaveSchedulerOnly,true);
  assert.equal(roadmap.learningClosedLoopContract.authorityExpansion,false);
  assert.equal(roadmap.learningClosedLoopContract.gateWeakening,false);
});
