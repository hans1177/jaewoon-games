import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
const webRuntime=read('.github/workflows/company-development-confirmed-runtime.yml');
const robloxRuntime=read('.github/workflows/company-development-roblox-runtime.yml');
const bootstrap=read('tools/company-development-roblox-bootstrap.mjs');
const feeder=read('tools/vibe2-post-release-focus.mjs');
const runner=read('.github/workflows/vibe2-24h-runner.yml');
const queue=read('assets/vibe-continuous-queue.js');

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

console.log('PASS machine lifecycle binds Web baseline to native source and one protected Roblox post-release focus slot');
