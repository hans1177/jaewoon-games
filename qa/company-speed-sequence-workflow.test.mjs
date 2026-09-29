import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');
const router=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
const designRuntime=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const policy=fs.readFileSync('COMPANY_FLOW.md','utf8');
const stages=[
  'Change detection and exact-source reuse',
  'Cheap precheck and checkpoint resume plan',
  'Dispatch one Unity cloud build for this source fingerprint',
  'Bind immutable APK artifact identity',
  'Resolve runtime checkpoint result',
  'Resolve independent QA checkpoint result',
  'Resolve regression checkpoint result',
  'Persist exact checkpoint package even when a later stage fails',
];

test('Unity speed path keeps canonical expensive-stage ordering',()=>{
  let cursor=0;
  for(const stage of stages){
    const pos=unity.indexOf(stage,cursor);
    assert.ok(pos>=cursor,`missing or out-of-order workflow stage: ${stage}`);
    cursor=pos+stage.length;
  }
});

test('checkpoint persistence occurs before explicit stage failure enforcement',()=>{
  const checkpoint=unity.indexOf('Persist exact checkpoint package even when a later stage fails');
  const enforce=unity.indexOf('Enforce stage result after checkpoint is safely captured');
  assert.ok(checkpoint>=0&&enforce>checkpoint);
});

test('same exact build run feeds runtime QA and regression workflows',()=>{
  assert.match(unity,/BUILD_RUN: \$\{\{ steps\.buildref\.outputs\.run_id \}\}/);
  assert.match(unity,/unity-android-runtime-smoke\.yml/);
  assert.match(unity,/unity-android-independent-qa\.yml/);
  assert.match(unity,/unity-android-regression\.yml/);
});

test('selected-platform router repairs legacy Web target paths to the platform source root',()=>{
  assert.match(router,/canonicalTarget=adapter\?`\$\{adapter\.sourceRoot\}\$\{item\.gameId\}`:''/);
  assert.match(router,/oldTarget\.startsWith\(adapter\.sourceRoot\)/);
  assert.match(router,/sourcePath:targetSourcePath/);
  assert.doesNotMatch(router,/fetch-depth:\s*0/);
});

test('Web runtime pins source revision and returns failed work directly to repair',()=>{
  const exactRefs=router.match(/ref:\s*\$\{\{\s*github\.sha\s*\}\}/g)||[];
  assert.ok(exactRefs.length>=4,`expected exact revision checkouts, got ${exactRefs.length}`);
  assert.doesNotMatch(router,/Prepare local Vibe2 model for development cycles/);
  assert.doesNotMatch(router,/uses:\s*\.\/\.github\/actions\/prepare-ollama[\s\S]{0,180}model: qwen3:1\.7b/);
  assert.doesNotMatch(router,/Confirm lazy optional AI runtime policy/);
  assert.doesNotMatch(router,/GEMINI_API_KEY|COMPANY_GEMINI_WEB_MODEL|WEB_AI_MODE=LAZY_OPTIONAL|WEB_MODEL_PREP=DEFERRED_UNTIL_REQUIRED/);
  assert.match(router,/Confirm Web implementation ownership contract/);
  assert.match(router,/COMPANY_WEB_ROLE=VALIDATE_ROUTE_FAN_IN/);
  assert.match(router,/--force-repair=true/,'failed validation must preserve failure context for the Vibe repair handoff');
  assert.match(router,/WEB_VIBE_REPAIR_REQUIRED/);
  assert.match(router,/WEB_RETURN_TO_VIBE=YES/);
  assert.match(router,/WEB_VIBE_24H_DISPATCH=YES/);
  assert.doesNotMatch(router,/canonicalState:'WAITING_WEB_GAMEPLAY_REVALIDATION'/);
  assert.doesNotMatch(router,/canonicalState:'RETURN_TO_WEB_DEVELOPMENT_FOR_CONTENT_EXPANSION'/);
});

test('source-bind repair resumes the selected platform executor without skipping ahead',()=>{
  assert.match(router,/retrySourceBind=status==='ACTIVE'&&step==='TARGET_PLATFORM_SOURCE_BIND'/);
  assert.match(router,/state==='TARGET_PLATFORM_REPAIR_REQUIRED'/);
  assert.match(router,/if\(!pending&&!legacyActive&&!waiting&&!retrySourceBind\)continue/);
  assert.match(router,/platforms\.add\(platform\);\s*if\(retrySourceBind\)\{\s*console\.log\(`DEVELOPMENT_ROUTE_RESUME_SOURCE_BIND=/s);
  const retryPos=router.indexOf('if(retrySourceBind){');
  const advancePos=router.indexOf('updates.push({gameId:item.gameId,status:\'ACTIVE\',selectedPlatform:platform,targetPlatform:platform,currentStep:canonicalTargetStep()',retryPos);
  assert.ok(retryPos>=0&&advancePos>retryPos,'retry branch must continue before canonical technical-validation update');
  assert.match(router,/gh workflow run company-development-roblox-runtime\.yml/);
});

test('confirmed development workflow consumes the current Web evidence schema instead of stale schema13',()=>{
  assert.match(router,/WEB_VALIDATION_SCHEMA_VERSION/);
  assert.doesNotMatch(router,/validationSchemaVersion\|\|initialReport\.version\)!==13/);
  assert.doesNotMatch(router,/webInitialCycleValidationSchemaVersion!==13/);
  assert.doesNotMatch(router,/webValidationEvidenceSchemaMinimum=13/);
  assert.doesNotMatch(router,/WEB_VALIDATION_SCHEMA_MINIMUM=13/);
});

test('Unity source reuse avoids the nested heredoc path that failed in the real canary run',()=>{
  assert.match(unity,/bind_catalog\(\)/);
  assert.doesNotMatch(unity,/node - "\$PROJECT" <<'NODE'[\s\S]{0,900}CHANGE_DETECTION=UNCHANGED_SOURCE_REUSED/);
});

test('canonical router dedupes an already queued or running Unity executor for the same main revision',()=>{
  assert.match(router,/company-development-unity-runtime\.yml\/runs\?per_page=30/);
  assert.match(router,/\.head_sha==\$sha/);
  assert.match(router,/\.status=="queued"/);
  assert.match(router,/\.status=="pending"/);
  assert.match(router,/\.status=="in_progress"/);
  assert.match(router,/UNITY_EXECUTOR_DISPATCH=DEDUPED_EXISTING_RUN/);
  assert.match(router,/gh workflow run company-development-unity-runtime\.yml/);
  assert.match(router,/\.github\/workflows\/company-development-unity-runtime\.yml/);
});

test('canonical DEVELOPMENT router hands Roblox SOURCE_BIND and technical validation to the existing Roblox executor',()=>{
  assert.match(router,/const retrySourceBind=status==='ACTIVE'&&step==='TARGET_PLATFORM_SOURCE_BIND'/);
  assert.match(router,/const waiting=status==='ACTIVE'&&step==='TARGET_PLATFORM_TECHNICAL_VALIDATION'/);
  assert.match(router,/dispatch_roblox=\$\{platforms\.has\('ROBLOX'\)\?'true':'false'\}/);
  assert.match(router,/gh workflow run company-development-roblox-runtime\.yml/);
  assert.match(router,/ROBLOX_EXECUTOR_DISPATCH=DEDUPED_EXISTING_RUN/);
});

test('Web gate persistence survives merged artifact directory layouts',()=>{
  assert.match(router,/const root='\/tmp\/web-batch'/);
  assert.match(router,/WEB_WORKER_RESULT_FILES=/);
  assert.match(router,/find \/tmp\/web-batch -type d -name persist -print0/);
  assert.doesNotMatch(router,/const resultDir='\/tmp\/web-batch\/results'/);
});

test('Web development validation is parallel-first with twenty isolated workers and one aggregation write',()=>{
  assert.match(router,/max-parallel:\s*20/);
  assert.match(router,/WEB_PARALLEL_TARGET=20/);
  assert.match(router,/WEB_PARALLEL_MAX=20/);
  assert.match(router,/queue\.webValidationParallelism=20/);
  assert.match(router,/WEB_PARALLEL_ACTIVE_MAX=20/);
  assert.match(router,/Upload isolated Web worker result/);
  assert.match(router,/Download parallel Web worker results/);
  assert.match(router,/Persist parallel Web evidence and queue state/);
  assert.match(router,/WEB_VALIDATION_TIERS=MICRO_FAST_INITIAL_FULL_FINAL/);
  assert.match(policy,/parallelExecutionDefault: true/);
  assert.match(policy,/webValidationParallelismTarget: 20/);
  assert.match(policy,/webValidationParallelismMax: 20/);
  assert.match(policy,/sharedRuntimeStatePersistedBySingleAggregationStep: true/);
});

test('DESIGN_ONLY runtime follows central unbounded WIP policy with external matrix wave bounds',()=>{
  assert.match(policy,/concurrentGameWipTarget: 20/);
  assert.match(policy,/concurrentGameWipMax: null/);
  assert.match(policy,/externalProviderBoundary: 256/);
  assert.match(policy,/adaptiveExpansionSteps: \[20, 32, 64, 128, 256\]/);
  assert.match(designRuntime,/const roadmap=JSON\.parse\(fs\.readFileSync\('company-learning\/platform-release-roadmap\.json','utf8'\)\)/);
  assert.match(designRuntime,/globalSelectedPlatformDevelopmentWipMax/);
  assert.match(designRuntime,/slice\(0,preservationOnly\?1:designWipMax\)/);
  assert.match(designRuntime,/const selected=canaryVerified\?pending:pending\.slice\(0,preservationOnly\?1:2\)/);
  assert.match(designRuntime,/const parallelMax=Math\.max\(1,Math\.min\(preservationOnly\?1:\(canaryVerified\?designWipMax:1\),targets\.length\|\|1\)\)/);
  assert.match(designRuntime,/parallel_max=\$\{parallelMax\}/);
  assert.match(designRuntime,/GAME_DESIGN_EXECUTION_LANES=\$\{parallelMax\}/);
  assert.match(designRuntime,/GAME_DESIGN_GATE_BYPASS=NO/);
  assert.match(designRuntime,/GAME_DESIGN_ONLY_STRICT_PASS_REQUIRED=YES/);
  assert.match(designRuntime,/GAME_DESIGN_WIP_MAX=\$\{unboundedByPolicy\?'UNBOUNDED_POLICY':designWipMax\}/);
  assert.match(designRuntime,/GAME_DESIGN_EXTERNAL_MATRIX_BATCH_MAX=\$\{externalBatchMax\}/);
  assert.match(designRuntime,/CANONICAL_ROADMAP_UNBOUNDED_EXTERNAL_BATCH/);
  assert.match(designRuntime,/max-parallel:\s*\$\{\{ fromJSON\(needs\.resolve-seed-targets\.outputs\.parallel_max\) \}\}/);
  assert.match(designRuntime,/concurrency:[\s\S]{0,300}group:\s*company-seed-design-runtime-\$\{\{ github\.event_name == 'push' && 'engine-push' \|\| 'continuation' \}\}[\s\S]{0,220}cancel-in-progress:\s*\$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(designRuntime,/push:[\s\S]{0,500}tools\/company-design-cycle\.mjs/);
  assert.doesNotMatch(designRuntime,/slice\(0,6\)/);
  assert.doesNotMatch(designRuntime,/max-parallel:\s*6/);
  assert.doesNotMatch(designRuntime,/GAME_DESIGN_WIP_MAX=6/);
});

test('DEVELOPMENT runtime does not serialize whole runs and serializes only shared-state writers',()=>{
  const jobsAt=router.indexOf('\njobs:');
  assert.ok(jobsAt>0,'jobs block missing');
  assert.doesNotMatch(router.slice(0,jobsAt),/\nconcurrency:/,'workflow-level concurrency would block independent workers across revisions');
  const webPlan=router.slice(router.indexOf('\n  web-plan:\n'),router.indexOf('\n  web-worker:\n'));
  assert.match(webPlan,/group:\s*company-development-web-plan/);
  assert.match(webPlan,/cancel-in-progress:\s*true/);
  const writerLocks=router.match(/group:\s*company-development-runtime-state-writer/g)||[];
  assert.equal(writerLocks.length,3,'web-gate, post-web-artbook and route must share one writer lock');
  assert.match(router,/runtime_sha:\s*\$\{\{ steps\.targets\.outputs\.runtime_sha \}\}/);
  assert.match(router,/WEB_RUNTIME_BINDING_STALE_SKIP=YES/);
  assert.match(router,/needs\.web-plan\.outputs\.runtime_sha/);
  assert.match(router,/cancel-in-progress:\s*false/);
});

test('Web batch binding accepts unrelated runtime commits but rejects changes to target inputs',()=>{
  assert.match(router,/EXPECTED_TARGETS_JSON:\s*\$\{\{ needs\.web-plan\.outputs\.targets_json \}\}/);
  assert.match(router,/TARGET_QUEUE_BINDING_CHANGED:/);
  assert.match(router,/TARGET_RUNTIME_BINDING_CHANGED:/);
  assert.match(router,/WEB_RUNTIME_BINDING_UNRELATED_CHANGE_ACCEPTED=YES/);
  assert.match(router,/WEB_RUNTIME_TARGET_BINDINGS_UNCHANGED=/);
  assert.match(router,/show\(planned,file\)===show\(current,file\)/);
  assert.match(router,/designBaselineSource/);
  assert.match(router,/cycle-status\.json/);
  assert.match(router,/webInitialCycleEvidencePath/);
  assert.match(router,/webFinalContentDepthEvidencePath/);
  assert.match(router,/WEB_RUNTIME_BINDING_HISTORY_UNAVAILABLE=YES/);
});

test('Web validator emits the canonical schema16 evidence version',()=>{
  const validator=fs.readFileSync('tools/company-development-web-gameplay-validation.mjs','utf8');
  assert.match(validator,/^const VALIDATION_SCHEMA_VERSION=16;$/m);
  assert.doesNotMatch(validator,/^const VALIDATION_SCHEMA_VERSION=15;$/m);
});

test('owner-focused concurrent native dispatch happens only after canonical source-bind resume guard',()=>{
  assert.match(router,/OWNER_FOCUS_CONCURRENT_PLATFORM_DISPATCH=/);
  const addPlatform=router.indexOf('platforms.add(platform);');
  const retry=router.indexOf('if(retrySourceBind){',addPlatform);
  const concurrent=router.indexOf("const focus=roadmap?.assetProductionParallelContract?.firstAdoption||{};",retry);
  assert.ok(addPlatform>=0&&retry>addPlatform&&concurrent>retry,'concurrent dispatch must not bypass source-bind resume');
  assert.match(router,/focusMode\.includes\('CONCURRENT'\)/);
  assert.match(router,/normalizeSelectedPlatform\(requested\)/);
  assert.match(router,/adapterForPlatform\(concurrentPlatform\)\?\.existingExecutionPath/);
});



test('control-plane planning uses slim runners while heavy design work keeps the game runner pool',()=>{
  assert.match(router,/\n  native-plan:\n[\s\S]{0,180}?runs-on: ubuntu-slim/);
  assert.match(designRuntime,/\n  game-primary-gate:\n[\s\S]{0,180}?runs-on: ubuntu-slim/);
  assert.match(designRuntime,/\n  resolve-seed-targets:\n[\s\S]{0,240}?runs-on: ubuntu-slim/);
  assert.match(designRuntime,/\n  design-cycle:\n[\s\S]{0,500}?runs-on: ubuntu-latest/);
});
