import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const readText = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(`VIBE2_LEARNING_PIPELINE_CONTRACT: ${message}`); };
const eq = (actual, expected, label) => { if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); };
const includesAll = (text, tokens, label) => {
  for (const token of tokens) if (!text.includes(token)) fail(`${label}: missing ${token}`);
};

const contract = readJson('company-learning/canonical-learning-pipeline.json');
const expectedChain = [
  'VALIDATED_EVIDENCE',
  'DISTILLATION_INGEST',
  'VERIFIED_TRAINING_SAMPLE',
  'DISTILLATION_STATUS',
  'DETERMINISTIC_TRAINING_REQUEST',
  'LOCAL_SELF_HOSTED_DATASET_BUILD',
  'LOCAL_LORA_OR_QLORA_TRAINING',
  'TRAINED_UNVERIFIED',
  'FIXED_HOLDOUT_AB',
  'CANARY',
  'PROMOTE_OR_ROLLBACK',
];

eq(contract.version, 1, 'contract.version');
eq(contract.status, 'LOCKED', 'contract.status');
eq(JSON.stringify(contract.canonicalChain), JSON.stringify(expectedChain), 'canonicalChain');
eq(contract.pipelineLock.existingPipelineIsAuthoritative, true, 'existingPipelineIsAuthoritative');
eq(contract.pipelineLock.parallelLearningPipelineForbidden, true, 'parallelLearningPipelineForbidden');
eq(contract.pipelineLock.directStageBypassForbidden, true, 'directStageBypassForbidden');
eq(contract.pipelineLock.thresholdLoweringToForceTrainingForbidden, true, 'thresholdLoweringToForceTrainingForbidden');
eq(contract.pipelineLock.duplicateOrFabricatedSamplesForbidden, true, 'duplicateOrFabricatedSamplesForbidden');
eq(contract.trainingPolicy.route, 'LOCAL_SELF_HOSTED_ONLY', 'training route');
eq(contract.trainingPolicy.githubHostedModelTrainingAllowed, false, 'hosted training');
eq(contract.trainingPolicy.paidApiAllowed, false, 'paid API');
eq(contract.trainingPolicy.minTrainSamples, 24, 'minTrainSamples');
eq(contract.trainingPolicy.minFreshTrainSamples, 12, 'minFreshTrainSamples');
eq(contract.trainingPolicy.minDistinctProjects, 2, 'minDistinctProjects');
eq(contract.trainingPolicy.maxProjectShare, 0.75, 'maxProjectShare');
eq(contract.trainingPolicy.promotionGate, 'FIXED_HOLDOUT_AB_THEN_CANARY', 'promotionGate');

const companyFlow = readText('COMPANY_FLOW.md');
includesAll(companyFlow, [
  'existingPipelineIsAuthoritative: true',
  'newParallelPipelineForSameStageForbidden: true',
  'adHocBypassChainForbidden: true',
  'status: VERIFIED_RUNTIME_PASS_TRUE',
  'positiveGameplayDistillationUnlockConditionSatisfied: true',
], 'COMPANY_FLOW');

const ingestWorkflow = readText(contract.implementationBindings.ingestWorkflow);
includesAll(ingestWorkflow, [
  'tools/vibe2-distillation-ingest.mjs',
  'tools/vibe2-distillation-status.mjs',
  'tools/vibe2-training-request.mjs',
  'external black-box browser QA: NOT_APPLICABLE',
], 'distillation ingest workflow');
const ingestOrder = [
  'node tools/vibe2-distillation-ingest.mjs',
  'node tools/vibe2-distillation-status.mjs',
  'node tools/vibe2-training-request.mjs',
].map((token) => ingestWorkflow.indexOf(token));
if (!(ingestOrder[0] >= 0 && ingestOrder[0] < ingestOrder[1] && ingestOrder[1] < ingestOrder[2])) fail('ingest/status/request order drifted');

const trainWorkflow = readText(contract.implementationBindings.localTrainingWorkflow);
includesAll(trainWorkflow, [
  "LOCAL_SELF_HOSTED_ONLY",
  'node tools/vibe2-weight-learning.mjs dataset',
  'python tools/vibe2-train.py',
  'TRAINED_UNVERIFIED',
  'FIXED_HOLDOUT_AB_AND_CANARY',
], 'local training workflow');

const block = contract.blockBlastSuccessLearningMethod;
const source = readJson(block.sourceEvidence);
const sample = readJson(block.promotedSample);
const status = readJson(contract.implementationBindings.statusFile);
const request = readJson(contract.implementationBindings.requestFile);

eq(block.runNumber, 30, 'Block Blast run');
eq(block.learningSamplePromotion, 'PASS', 'Block Blast sample promotion');
eq(block.modelTrainingPromotion, 'WAITING_FOR_GLOBAL_VERIFIED_SAMPLE_THRESHOLDS', 'Block Blast training state');
eq(source.verifiedRuntimePass, true, 'Block Blast verified runtime');
eq(source.gameEntryObserved, true, 'Block Blast game entry');
eq(source.positiveTrainingSample, true, 'Block Blast positive sample flag');
eq(source.gameplayBehaviorPromotionAllowed, true, 'Block Blast gameplay promotion flag');
eq(sample.sourceKind, 'external-black-box', 'Block Blast sample source kind');
eq(sample.taskType, 'qa', 'Block Blast sample task');
eq(sample.independentQa, 'BLACK_BOX_EVIDENCE_PASS', 'Block Blast QA authority');
eq(sample.browserQa, 'NOT_APPLICABLE', 'Block Blast browser QA');
eq(sample.verification?.runtime, 'PASS', 'Block Blast sample runtime');
eq(sample.verification?.blackBoxEvidence, 'PASS', 'Block Blast sample evidence');
eq(sample.verification?.gameEntry, 'PASS', 'Block Blast sample game entry');
eq(sample.verification?.inputResponse, 'PASS', 'Block Blast sample input response');
eq(sample.verification?.processSurvival, 'PASS', 'Block Blast sample survival');
eq(sample.verification?.noFatalCrashOrAnr, 'PASS', 'Block Blast sample crash/ANR');
eq(sample.verification?.proprietaryExtraction, false, 'Block Blast proprietary extraction');
if (!status.sourceFiles?.includes(block.promotedSample)) fail('Block Blast promoted sample missing from distillation status');
if ((status.tasks?.qa?.accepted ?? 0) < 1 || (status.tasks?.qa?.train ?? 0) < 1) fail('Block Blast QA sample is not counted by distillation status');
eq(request.execution?.route, 'LOCAL_SELF_HOSTED_ONLY', 'training request route');
eq(request.execution?.githubHostedTrainingAllowed, false, 'training request hosted policy');
eq(request.execution?.paidApiAllowed, false, 'training request paid API policy');

console.log('VIBE2_LEARNING_PIPELINE_CONTRACT=PASS');
console.log('BLOCK_BLAST_SUCCESS_LEARNING_METHOD=LOCKED_RUN30');
console.log(`BLOCK_BLAST_QA_ACCEPTED=${status.tasks.qa.accepted}`);
console.log(`BLOCK_BLAST_QA_TRAIN=${status.tasks.qa.train}`);
console.log(`TRAINING_REQUEST_STATE=${request.state}`);
