import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
const webRuntime=read('.github/workflows/company-development-confirmed-runtime.yml');
const robloxRuntime=read('.github/workflows/company-development-roblox-runtime.yml');
const bootstrap=read('tools/company-development-roblox-bootstrap.mjs');
const reconcile=read('tools/company-development-roblox-source-reconcile.mjs');
const feeder=read('tools/vibe2-post-release-focus.mjs');
const runner=read('.github/workflows/vibe2-24h-runner.yml');
const queue=read('assets/vibe-continuous-queue.js');
const seedDesignRuntime=read('.github/workflows/company-seed-design-runtime.yml');
const designCycle=read('tools/company-design-cycle.mjs');

const lifecycle=roadmap.developmentLifecycleMachine;
assert.equal(lifecycle.authority,'MACHINE_EXECUTION_CONTRACT');
assert.equal(lifecycle.humanDocumentRequired,false);
assert.equal(lifecycle.machineSourceOfTruth,'company-learning/platform-release-roadmap.json');
assert.deepEqual(lifecycle.stages,[
  'PLATFORM_AND_GENRE_LOCKED','WEB_BASE_IMPLEMENTATION','WEB_RUNTIME_VALIDATION','WEB_DEVELOPMENT_BASELINE_READY',
  'TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION',
  'RELEASE_PROMOTION','POST_RELEASE_FOCUSED_DEVELOPMENT'
]);

assert.equal(lifecycle.webToPlatformHandoff.required,true);
assert.equal(lifecycle.webToPlatformHandoff.webIsDisposablePrototype,false);
assert.equal(lifecycle.webToPlatformHandoff.queueField,'webPlatformHandoff');
assert.equal(lifecycle.webToPlatformHandoff.manifestVersion,1);
for(const key of ['core-loop','gameplay-state-model','progression-model','input-intent','ui-flow','save-meaning','content-structure','balance-intent','verified-learning-context']){
  assert(lifecycle.webToPlatformHandoff.carryForward.includes(key),key);
}
assert.equal(lifecycle.webToPlatformHandoff.webEvidenceCannotReplaceNativeRuntimeEvidence,true);
assert.match(webRuntime,/webPlatformHandoff=\{/);
assert.match(webRuntime,/stage:'WEB_DEVELOPMENT_BASELINE_READY'/);
assert.match(webRuntime,/nativeRuntimePassTransferred:false/);
assert.match(webRuntime,/carryForward:\['core-loop'/);

assert.match(robloxRuntime,/webHandoff:item\.webPlatformHandoff\|\|null/);
assert.match(robloxRuntime,/WEB_HANDOFF_JSON:/);
assert.match(robloxRuntime,/--web-handoff="\$web_handoff"/);
assert.match(robloxRuntime,/--roadmap=company-learning\/platform-release-roadmap\.json/);
assert.match(bootstrap,/validateWebPlatformHandoff/);
assert.match(bootstrap,/ROBLOX_WEB_HANDOFF_FAILED/);
assert.match(bootstrap,/WebBaseline = \{/);
assert.match(bootstrap,/NativeRuntimePassTransferred = false/);
assert.match(bootstrap,/ROBLOX_WEB_HANDOFF=PASS/);
assert.match(reconcile,/validateWebPlatformHandoff/);
assert.match(reconcile,/web-platform-handoff-invalid/);

const focus=lifecycle.postReleaseFocusedDevelopment;
assert.equal(focus.enabled,true);
assert.deepEqual(focus.platforms,['ROBLOX']);
assert.equal(focus.globalProtectedRunnerSlots,1);
assert.equal(focus.activeTaskMaxPerProject,1);
assert.equal(focus.workerRoute,'text-source-worker');
assert.equal(focus.continuousRefill,true);
assert.equal(focus.feeder,'tools/vibe2-post-release-focus.mjs');
assert.equal(focus.generatedTaskContract.postReleaseFocused,true);
assert.equal(focus.generatedTaskContract.packageLongWorkProtected,true);
assert.equal(focus.generatedTaskContract.packageRole,'implementation-owner');

assert.match(feeder,/robloxReleaseClaim===true/);
assert.match(feeder,/evidence\.published===true/);
assert.match(feeder,/postReleaseFocused:true/);
assert.match(feeder,/packageLongWorkProtected:true/);
assert.match(feeder,/packageRole:'implementation-owner'/);
assert.match(feeder,/NO_NEW_SOURCE_CYCLE/);
assert.match(runner,/vibe2-post-release-focus\.mjs/);
assert.match(runner,/company-runtime:development-queue\.json|origin\/company-runtime:development-queue\.json/);
assert.match(queue,/postReleaseFocusedSlots: 1/);
assert.match(queue,/isPostReleaseFocused/);
assert.match(queue,/postReleaseFocusedTaskId/);

const quota=lifecycle.modelQuotaContinuity;
assert.equal(quota.enabled,true);
assert.equal(quota.designProviderPolicy,'GEMINI_ONLY');
assert.equal(quota.quotaFailureIsDesignGateFailure,false);
assert.equal(quota.quotaBlockedState,'WAITING_FOR_GEMINI_QUOTA');
assert.equal(quota.runnerStopOnQuotaExhaustion,false);
assert.equal(quota.continuousRefillRequired,true);
assert.equal(quota.blockedModelTaskConsumesDevelopmentSlot,false);
assert.equal(quota.checkpointResumeRequired,true);
assert.equal(quota.completedPhaseReplayForbidden,true);
assert.equal(quota.fullCycleRestartForbidden,true);
assert.equal(quota.vibeSubstitution.enabled,true);
for(const stage of ['WEB_BASE_IMPLEMENTATION','WEB_RUNTIME_VALIDATION','TARGET_PLATFORM_SOURCE_BIND','TARGET_PLATFORM_RUNTIME','TARGET_PLATFORM_INDEPENDENT_QA','TARGET_PLATFORM_REGRESSION','POST_RELEASE_FOCUSED_DEVELOPMENT']){
  assert(quota.vibeSubstitution.allowedStages.includes(stage),stage);
}
assert(quota.vibeSubstitution.forbiddenResponsibilities.includes('DESIGN_INDEPENDENT_LEAD_REVIEW'));
assert(quota.vibeSubstitution.forbiddenResponsibilities.includes('STAGE_GATE_SCORE_OR_VERDICT_SYNTHESIS'));
assert.equal(quota.geminiFallback.paidApiAdditionForbidden,true);
assert.equal(quota.geminiFallback.resumeFromExactBlockedTask,true);
assert.match(seedDesignRuntime,/COMPANY_GEMINI_FALLBACK_MODELS: '[^']*gemini-3\.8-flash[^']*gemini-3\.7-flash'/);
assert.doesNotMatch(seedDesignRuntime,/COMPANY_GEMINI_FALLBACK_MODELS: '[^']*gemini-2\.5-flash/);
assert.doesNotMatch(seedDesignRuntime,/COMPANY_GEMINI_FALLBACK_MODELS: '[^']*gemini-2\.5-flash-lite/);
assert.doesNotMatch(seedDesignRuntime,/COMPANY_GEMINI_FALLBACK_MODELS: '[^']*gemini-2\.5-pro/);
assert.match(seedDesignRuntime,/COMPANY_GEMINI_LEAD_FALLBACK_LANES:/);
assert.match(seedDesignRuntime,/Resolve checkpoint-aware Gemini quota lanes/);
assert.match(seedDesignRuntime,/WAITING_FOR_GEMINI_QUOTA/);
assert.match(seedDesignRuntime,/GEMINI_QUOTA_FULL_CYCLE_RESTART=NO/);
assert.match(seedDesignRuntime,/GEMINI_QUOTA_CURRENT_PHASE=/);
assert.match(seedDesignRuntime,/GEMINI_QUOTA_LEAD_PHASE_ACTIVE=/);
assert.match(seedDesignRuntime,/const leadPhaseActive=currentPhase==='DEPARTMENT_REVIEWS'\|\|missingRoles\.length<roles\.length/);
assert.match(seedDesignRuntime,/DESIGN_GATE_REPAIR_LOOP_DISPATCH=WAITING_FOR_GEMINI_QUOTA/);
assert.match(queue,/WAITING_FOR_GEMINI_QUOTA/);
assert.match(queue,/isExternalQuotaWaitingTask/);
assert.match(designCycle,/DESIGN_CHECKPOINT_CONTRACT_VERSION=3/);
assert.match(designCycle,/checkpointV2MigrationEligible/);
assert.match(designCycle,/checkpointV3CompatibleEngineMigrationEligible/);
assert.match(designCycle,/4e114701cd81e031c4a089be79544cfb23c4275c8d0f5b5f49d92926084a48ec/);
assert.match(designCycle,/QUOTA_VIBE_REPAIR_COMPATIBLE_ENGINE_CHANGE_NO_REPLAY/);
assert.match(designCycle,/PERSIST_GEMINI_DAILY_QUARANTINE_WITHOUT_REPLAY/);
assert.match(designCycle,/GEMINI_MODEL_QUARANTINE_RESTORED=/);
assert.match(designCycle,/persistentGeminiUnavailableStatus/);
assert.match(designCycle,/DESIGN_PRE_GATE_REPAIR_CHECKPOINTS_PRESERVED=YES/);
assert.doesNotMatch(designCycle,/delete designCheckpoint\.phases\[key\]/);
assert.match(designCycle,/GEMINI_DAILY_QUOTA_EXHAUSTED=/);
assert.ok(designCycle.indexOf('if(status===429&&isDailyGeminiQuotaError(error))')<designCycle.indexOf('const minuteRetryMs=geminiMinuteRetryDelayMs(error,candidateModel)'));


console.log('PASS machine lifecycle binds Web baseline to native source and one protected Roblox post-release focus slot');
