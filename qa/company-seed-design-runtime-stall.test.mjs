import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const bootstrap=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const artbookPipeline=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const prepareOllama=fs.readFileSync('.github/actions/prepare-ollama/action.yml','utf8');

test('seed design runtime preserves the active fanout and revalidates matrix targets before model setup',()=>{
  assert.match(workflow,/group: company-seed-design-runtime\s+cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.equal((workflow.match(/ref: \$\{\{ github\.sha \}\}/g)||[]).length,4);
  const checkoutIndex=workflow.indexOf('- name: Checkout isolated company runtime branch');
  const revalidateIndex=workflow.indexOf('- name: Revalidate current seed target');
  const modelCacheIndex=workflow.indexOf('- name: Restore Ollama model cache');
  const resolveModelsIndex=workflow.indexOf('- name: Resolve configured free department models');
  const runtimeIndex=workflow.indexOf('- name: Prepare cached local Ollama runtime');
  const pullIndex=workflow.indexOf('- name: Pull only missing configured free department models');
  assert.ok(checkoutIndex>=0&&revalidateIndex>checkoutIndex&&modelCacheIndex>revalidateIndex&&resolveModelsIndex>modelCacheIndex&&runtimeIndex>resolveModelsIndex&&pullIndex>runtimeIndex);
  assert.match(workflow,/TARGET_SEED_ID: \$\{\{ matrix\.target\.seed_id \}\}/);
  assert.match(workflow,/STALE_SEED_TARGET_SKIP/);
  assert.match(workflow,/baselineGateState==='DESIGN_BASELINE_READY'/);
  assert.match(workflow,/if: steps\.target\.outputs\.should_run == 'true'/);
});

test('seed design runtime follows central unbounded WIP policy while bounding each external matrix wave',()=>{
  assert.match(workflow,/const configuredWip=roadmap\?\.developmentSpeedExecution\?\.globalSelectedPlatformDevelopmentWipMax/);
  assert.match(workflow,/const unboundedByPolicy=configuredWip===null\|\|typeof configuredWip==='undefined'/);
  assert.match(workflow,/const externalBatchMax=Number\(roadmap\?\.developmentSpeedExecution\?\.externalMatrixBatchMax\|\|256\)/);
  assert.match(workflow,/internalArtificialConcurrencyCapsForbidden!==true/);
  assert.match(workflow,/const designWipMax=unboundedByPolicy\?externalBatchMax:Math\.min\(Number\(configuredWip\),externalBatchMax\)/);
  assert.match(workflow,/const parallelMax=Math\.max\(1,Math\.min\(canaryVerified\?designWipMax:1,targets\.length\|\|1\)\)/);
  assert.match(workflow,/GAME_DESIGN_WIP_MAX=\$\{unboundedByPolicy\?'UNBOUNDED_POLICY':designWipMax\}/);
  assert.match(workflow,/GAME_DESIGN_EXTERNAL_MATRIX_BATCH_MAX=\$\{externalBatchMax\}/);
  assert.match(workflow,/CANONICAL_ROADMAP_UNBOUNDED_EXTERNAL_BATCH/);
  assert.match(workflow,/parallel_max=\$\{parallelMax\}/);
  assert.match(workflow,/max-parallel:\s*\$\{\{ fromJSON\(needs\.resolve-seed-targets\.outputs\.parallel_max\) \}\}/);
  assert.match(workflow,/runs-on: ubuntu-latest/);
  assert.match(workflow,/uses: actions\/cache@v4/);
  assert.match(workflow,/path: ~\/\.ollama\/models/);
  assert.match(workflow,/ollama-seed-design-\$\{\{ runner\.os \}\}-\$\{\{ hashFiles\('company-directive\.json'\) \}\}/);
  assert.match(workflow,/OLLAMA_VERSION: '0\.33\.3'/);
  assert.match(workflow,/OLLAMA_MAX_LOADED_MODELS: '2'/);
  assert.match(workflow,/COMPANY_MODEL_PHASE_CONCURRENCY: '4'/);
  assert.match(workflow,/COMPANY_MAX_ACTIVE_MODEL_LANES: '2'/);
  assert.match(workflow,/COMPANY_MODEL_KEEP_ALIVE: '5m'/);
  assert.match(workflow,/uses: \.\/\.github\/actions\/prepare-ollama/);
  assert.match(workflow,/model: \$\{\{ steps\.models\.outputs\.primary_model \}\}/);
  assert.match(workflow,/version: \$\{\{ env\.OLLAMA_VERSION \}\}/);
  assert.doesNotMatch(workflow,/https:\/\/ollama\.com\/install\.sh/);
});

test('restored model cache skips unnecessary network pulls and transient model pulls retry',()=>{
  assert.match(workflow,/ollama list \| awk 'NR>1 \{print \$1\}' > \/tmp\/ollama-present-models\.txt/);
  assert.match(workflow,/grep -Fxq \"\$model\" \/tmp\/ollama-present-models\.txt/);
  assert.match(workflow,/OLLAMA_MODEL_CACHE_HIT=\$model/);
  assert.match(workflow,/OLLAMA_MODEL_CACHE_MISS=\$model/);
  assert.match(workflow,/OLLAMA_MODEL_PULL_COUNT=\$pulls/);
  assert.match(prepareOllama,/OLLAMA_MODEL_PULL_SKIPPED=YES/);
  assert.match(prepareOllama,/for attempt in 1 2 3 4 5/);
  assert.match(prepareOllama,/OLLAMA_MODEL_PULL_ATTEMPT=\$attempt\/5/);
  assert.match(prepareOllama,/OLLAMA_MODEL_PULL_RETRY_TRANSIENT=YES/);
});

test('engine pushes cancel stale DESIGN_ONLY work while normal dispatch remains protected',()=>{
  const triggerSection=workflow.slice(0,workflow.indexOf('\npermissions:'));
  assert.match(triggerSection,/workflow_dispatch:/);
  assert.match(triggerSection,/push:[\s\S]*branches: \[main\]/);
  assert.match(triggerSection,/\.github\/actions\/prepare-ollama\/action\.yml/);
  assert.match(triggerSection,/tools\/company-design-cycle\.mjs/);
  assert.match(triggerSection,/tools\/company-design-gate-scoring-v2\.mjs/);
  assert.match(triggerSection,/schedule:/);
  assert.match(workflow,/cancel-in-progress: \$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(bootstrap,/push:\s+branches: \[main\]\s+paths:/);
  for(const path of [
    '.github/workflows/company-seed-design-runtime.yml',
    'tools/company-design-cycle.mjs',
    'tools/artbook-production-pipeline.mjs',
    'tools/company-baseline-gate.mjs',
    'tools/company-design-artbook.mjs',
    'company-directive.json',
  ]) assert.ok(bootstrap.includes(`- '${path}'`),`bootstrap missing design engine path: ${path}`);
  assert.match(bootstrap,/Continue active DESIGN_ONLY work from latest main/);
  assert.match(bootstrap,/if: always\(\)/);
  assert.match(bootstrap,/ACTIVE_DESIGN_ONLY_CURRENT_HEAD_RUNS=/);
  assert.match(bootstrap,/ACTIVE_DESIGN_ONLY_STALE_HEAD_RUNS=/);
  assert.match(bootstrap,/GAME_SEED_DESIGN_CONTINUATION=SKIP_CURRENT_HEAD_ACTIVE/);
  assert.match(bootstrap,/GAME_SEED_STALE_DESIGN_RUN_CANCEL_REQUESTED=/);
  const staleCancelIndex=bootstrap.indexOf('GAME_SEED_STALE_DESIGN_RUN_CANCEL_REQUESTED=');
  const currentHeadGuardIndex=bootstrap.indexOf("GAME_SEED_DESIGN_CONTINUATION=SKIP_CURRENT_HEAD_ACTIVE");
  assert.ok(staleCancelIndex>=0&&currentHeadGuardIndex>staleCancelIndex,'stale design runs must be cancelled before the current-head early return');
  assert.match(bootstrap,/gh workflow run company-seed-design-runtime\.yml --ref main/);
});

test('runtime state is overlaid onto the main engine without merging unrelated branch history',()=>{
  assert.match(workflow,/COMPANY_RUNTIME_STATE_OVERLAY=YES/);
  assert.match(workflow,/COMPANY_RUNTIME_STATE_OVERLAY=TARGET_ONLY/);
  assert.match(workflow,/COMPANY_ENGINE_SOURCE=main/);
  assert.match(bootstrap,/COMPANY_RUNTIME_STATE_OVERLAY=GAME_SEED_ONLY/);
  assert.match(bootstrap,/COMPANY_ENGINE_SOURCE=main/);
  assert.match(workflow,/git cat-file -e \"origin\/\$COMPANY_RUNTIME_BRANCH:\$runtime_path\"/);
  assert.match(bootstrap,/git cat-file -e \"origin\/\$COMPANY_RUNTIME_BRANCH:game-seed-state\.json\"/);
  assert.doesNotMatch(workflow,/git merge --no-edit origin\/main/);
  assert.doesNotMatch(bootstrap,/git merge --no-edit origin\/main/);
});

test('parallel seed jobs persist generated target paths through an isolated runtime worktree',()=>{
  assert.match(workflow,/for attempt in 1 2 3 4/);
  assert.match(workflow,/generated_commit=\"\$\(git rev-parse HEAD\)\"/);
  assert.match(workflow,/runtime_worktree=\"\/tmp\/seed-design-persist-/);
  assert.match(workflow,/git worktree add --detach \"\$runtime_worktree\" \"origin\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/git -C \"\$runtime_worktree\" checkout \"\$generated_commit\" -- \"\$game_path\"/);
  assert.match(workflow,/git -C \"\$runtime_worktree\" push origin \"HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/SEED_DESIGN_RUNTIME_PERSIST_WORKTREE=ISOLATED/);
  assert.doesNotMatch(workflow,/git checkout -B seed-design-persist/);
  assert.doesNotMatch(workflow,/git rebase \"origin\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/test \"\$pushed\" = 1/);
});

test('structured Ollama design calls preserve JSON budget and reuse loaded models briefly',()=>{
  assert.match(design,/const payload=\{model,stream:false,think:false,keep_alive:modelKeepAlive/);
  assert.match(design,/if\(!deepSeek&&attempt===1\)payload\.format=schema/);
  assert.match(design,/const modelKeepAlive=clean\(process\.env\.COMPANY_MODEL_KEEP_ALIVE\|\|'5m'\)/);
  assert.match(design,/num_ctx:effectiveCtx/);
  assert.match(design,/AbortSignal\.timeout\(effectiveTimeoutMs\)/);
  assert.match(design,/MODEL_EMPTY_CONTENT_WITH_THINKING=/);
  assert.match(design,/empty model response \(\$\{mode\}\)/);
});

test('independent review generation keeps one department-model task per required review lane',()=>{
  assert.match(design,/const departmentReviewModels=Object\.fromEntries/);
  assert.match(design,/const independentReviewTasks=Object\.fromEntries/);
  assert.match(design,/const reviewsSchemaFor=roles=>/);
  assert.match(design,/const independentReviewOrder=Object\.keys\(independentReviewTasks\)\.sort/);
  assert.match(design,/independentReviewTasks\[a\]\.model\.localeCompare\(independentReviewTasks\[b\]\.model\)/);
  assert.match(design,/parallelObjectByLane\(independentReviewOrder,key=>independentReviewTasks\[key\]\.model/);
  assert.match(design,/ASSIGNED_DEPARTMENT=\$\{role\}/);
  assert.match(design,/DEPARTMENT_REVIEW_MISSING/);
});

test('independent and lead review phases use bounded adaptive parallel execution without removing reviews',()=>{
  assert.match(design,/const modelPhaseConcurrency=Math\.min\(4,/);
  assert.match(design,/independent_department_reviews:modelPhaseConcurrency/);
  assert.match(design,/department_representatives:Math\.min\(3,modelPhaseConcurrency\)/);
  assert.match(design,/lead_rebuttals:Math\.min\(3,modelPhaseConcurrency\)/);
  assert.match(design,/five_lead_fatal_review:Math\.min\(3,modelPhaseConcurrency\)/);
  assert.match(design,/const maxLoadedModelLanes=Math\.min\(2,/);
  assert.match(design,/async function parallelObject\(keys,worker,concurrency=modelPhaseConcurrency\)/);
  assert.match(design,/adaptiveParallel\('independent_department_reviews'/);
  assert.match(design,/adaptiveParallel\('department_representatives'/);
  assert.match(design,/adaptiveParallel\('lead_rebuttals'/);
  assert.match(design,/adaptiveParallel\('five_lead_fatal_review'/);
  assert.match(design,/MODEL_PHASE_CONCURRENCY_FALLBACK=/);
  assert.match(design,/departmentDesignContext\(role,designDraft\)/);
  assert.match(design,/repeatedFatalReview:true/);
  assert.match(design,/rebuttalRounds:1/);
  assert.match(design,/sameModelRevised:true/);
});

test('design cycle resumes from fingerprinted phase and per-model checkpoints without weakening review counts',()=>{
  assert.match(design,/DESIGN_CHECKPOINT_CONTRACT_VERSION=1/);
  assert.match(design,/design-checkpoint\.json/);
  assert.match(design,/checkpointFingerprint=createHash\('sha256'\)/);
  assert.match(design,/DESIGN_CHECKPOINT_HIT=/);
  assert.match(design,/DESIGN_TASK_CHECKPOINT_HIT=/);
  assert.match(design,/runCheckpointTask\('independent_department_reviews'/);
  assert.match(design,/runCheckpointTask\('department_representatives'/);
  assert.match(design,/runCheckpointTask\('lead_rebuttals'/);
  assert.match(design,/runCheckpointTask\('five_lead_fatal_review'/);
  assert.match(design,/strictDesignerFeedback/);
  assert.match(design,/policyDigest/);
  assert.match(design,/checkpointReusable/);
  assert.match(design,/MODEL_CENTERED_REVIEW_ORDER=YES/);
  assert.match(design,/independentReviewOutputs:ROLES\.reduce/);
});

test('seed design workflow persists checkpoints on success failure and cancellation without switching the live workspace',()=>{
  assert.match(workflow,/persist_design_checkpoint\(\)/);
  assert.match(workflow,/design-checkpoint\.json/);
  assert.match(workflow,/git worktree add --detach/);
  assert.match(workflow,/runtime: DESIGN_ONLY checkpoint/);
  assert.match(workflow,/DESIGN_CHECKPOINT_RUNTIME_PERSIST=YES/);
  assert.match(workflow,/trap 'exit 143' TERM INT/);
  assert.match(workflow,/cleanup_design_runtime\(\)/);
  assert.match(workflow,/trap cleanup_design_runtime EXIT/);
  assert.doesNotMatch(workflow,/git checkout -B seed-design-checkpoint-persist/);
});

test('mid-cycle Gemini quota exhaustion becomes checkpointed waiting instead of a design gate failure',()=>{
  assert.match(workflow,/id: design_pipeline/);
  assert.match(workflow,/DESIGN_MODEL_CYCLE_RESULT=WAITING_FOR_GEMINI_QUOTA/);
  assert.match(workflow,/DESIGN_QUOTA_FAILURE_IS_DESIGN_GATE_FAILURE=NO/);
  assert.match(workflow,/DESIGN_CHECKPOINT_RESUME_REQUIRED=YES/);
  assert.match(workflow,/steps\.design_pipeline\.outputs\.complete == 'true'/);
  assert.match(workflow,/GEMINI_NO_AVAILABLE_CANDIDATES|GenerateRequestsPerDayPerProjectPerModel-FreeTier|Quota exceeded/);
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(roadmap.developmentLifecycleMachine?.modelQuotaContinuity?.quotaFailureIsDesignGateFailure,false);
  assert.equal(roadmap.developmentLifecycleMachine?.modelQuotaContinuity?.runnerStopOnQuotaExhaustion,false);
  assert.equal(roadmap.developmentLifecycleMachine?.modelQuotaContinuity?.checkpointResumeRequired,true);
});

test('aggregate Gemini candidate exhaustion is capacity wait only when checkpoint has quota evidence',()=>{
  assert.match(workflow,/const aggregateCapacityFailure=\/GEMINI_NO_AVAILABLE_\(\?:CANDIDATES\|MODELS\)\\b\/i\.test\(clean\(cp\.lastError\)\)/);
  assert.match(workflow,/const checkpointHasQuotaEvidence=Object\.values\(cp\.modelHealth\|\|\{\}\)\.some\(row=>retryableQuota\.test\(clean\(row\?\.lastError\)\)\)/);
  assert.match(workflow,/const currentFailureAggregateCapacity=aggregateCapacityFailure&&checkpointHasQuotaEvidence/);
  assert.match(workflow,/currentFailureQuota\|\|currentFailureAggregateCapacity\|\|roleBlocked/);
  assert.doesNotMatch(workflow,/process\.stdout\.write\(aggregateCapacityFailure\|\|/);
});


test('design runtime emits persistent phase timing evidence for the next bottleneck',()=>{
  assert.match(design,/DESIGN_PHASE_MS=/);
  assert.match(design,/MODEL_CALL_MS=/);
  assert.match(design,/runtimeMetrics=\{phaseMs,totalModelCalls:modelCallStats\.length,totalModelCallMs:/);
  assert.match(design,/modelPhaseConcurrency,modelKeepAlive/);
  assert.match(design,/INDEPENDENT_REVIEW_OUTPUTS=/);
});


test('Gemini quota governor retries transient quota failures after provider retry window while keeping permanent model failures blocked',()=>{
  assert.match(workflow,/const permanentUnavailable=\/no longer available to new users\|NOT_FOUND\|PERMISSION_DENIED\/i/);
  assert.match(workflow,/const retryableQuota=\/GenerateRequestsPerDayPerProjectPerModel-FreeTier\|requests per day\|daily quota\|RESOURCE_EXHAUSTED\|Quota exceeded\/i/);
  assert.match(workflow,/const providerRetryMs=row=>/);
  assert.match(workflow,/Please retry in\\s\+\(\[0-9\.\]\+\)s/);
  assert.match(workflow,/Date\.now\(\)<updated\+providerRetryMs\(row\)/);
  assert.ok((workflow.match(/modelUnavailable\(row\)/g)||[]).length>=3);
  assert.doesNotMatch(workflow,/const unavailableModel=\/GenerateRequestsPerDayPerProjectPerModel-FreeTier/);
});


test('design engine expires checkpointed 429 quarantine at provider retry window and does not retry from timeout telemetry',()=>{
  assert.match(design,/function geminiProviderRetryWindowMs\(error\)/);
  assert.match(design,/function geminiQuotaRetryWindowActive\(row\)/);
  assert.match(design,/GEMINI_MODEL_QUARANTINE_EXPIRED=/);
  assert.match(design,/status===429&&!geminiQuotaRetryWindowActive\(row\)/);
  assert.match(artbookPipeline,/aborted due to timeout\|timed out\|AbortError\|TimeoutError/);
  assert.doesNotMatch(artbookPipeline,/aborted due to timeout\|timeout\|timed out/);
});


test('missing designs are automatically enrolled into the existing GAME_SEED design runtime',()=>{
  const triggerSection=workflow.slice(0,workflow.indexOf('\npermissions:'));
  assert.ok(triggerSection.includes("- 'tools/company-all-games-design-reset.mjs'"));
  assert.ok(triggerSection.includes("- 'game-catalog.json'"));
  assert.match(workflow,/Auto-enroll active games missing design into canonical GAME_SEED intake/);
  assert.match(workflow,/node tools\/company-all-games-design-reset\.mjs --auto-missing-design-intake/);
  assert.match(workflow,/Ensure target missing-design GAME_SEED exists/);
  assert.match(workflow,/--auto-missing-design-intake --game-id="\$GAME_ID"/);
  assert.match(workflow,/MISSING_DESIGN_AUTO_CREATE=CANONICAL_GAME_SEED_PIPELINE/);
});


test('owner all-games reset freshness applies only to the reset gameIds, not every game',()=>{
  assert.match(workflow,/const resetGameIds=new Set\(\(Array\.isArray\(state\?\.ownerAllGamesDesignReset\?\.gameIds\)/);
  assert.match(workflow,/const resetAt=resetGameIds\.has\(String\(seed\?\.gameId\|\|''\)\.trim\(\)\)\?resetTimestamp:0/);
  assert.match(workflow,/const resetAt=resetGameIds\.has\(gameId\)\?resetTimestamp:0/);
  assert.doesNotMatch(workflow,/const resetAt=Date\.parse\(state\?\.ownerAllGamesDesignReset\?\.updatedAt/);
});
