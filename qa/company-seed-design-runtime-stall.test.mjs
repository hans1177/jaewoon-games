import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const bootstrap=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('seed design runtime cancels stale runs and revalidates matrix targets before model setup',()=>{
  assert.match(workflow,/group: company-seed-design-runtime\s+cancel-in-progress: true/);
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

test('seed design runtime runs all six seed categories in parallel and avoids repeated Ollama setup without paid runners',()=>{
  assert.match(workflow,/max-parallel: 6/);
  assert.match(workflow,/runs-on: ubuntu-latest/);
  assert.match(workflow,/uses: actions\/cache@v4/);
  assert.match(workflow,/path: ~\/\.ollama\/models/);
  assert.match(workflow,/ollama-seed-design-\$\{\{ runner\.os \}\}-\$\{\{ hashFiles\('company-directive\.json'\) \}\}/);
  assert.match(workflow,/OLLAMA_VERSION: '0\.33\.3'/);
  assert.match(workflow,/OLLAMA_MAX_LOADED_MODELS: '3'/);
  assert.match(workflow,/COMPANY_MODEL_PHASE_CONCURRENCY: '3'/);
  assert.match(workflow,/COMPANY_MODEL_KEEP_ALIVE: '2m'/);
  assert.match(workflow,/uses: \.\/\.github\/actions\/prepare-ollama/);
  assert.match(workflow,/model: \$\{\{ steps\.models\.outputs\.primary_model \}\}/);
  assert.match(workflow,/version: \$\{\{ env\.OLLAMA_VERSION \}\}/);
  assert.doesNotMatch(workflow,/https:\/\/ollama\.com\/install\.sh/);
});

test('restored model cache skips unnecessary network pulls',()=>{
  assert.match(workflow,/ollama list \| awk 'NR>1 \{print \$1\}' > \/tmp\/ollama-present-models\.txt/);
  assert.match(workflow,/grep -Fxq \"\$model\" \/tmp\/ollama-present-models\.txt/);
  assert.match(workflow,/OLLAMA_MODEL_CACHE_HIT=\$model/);
  assert.match(workflow,/OLLAMA_MODEL_CACHE_MISS=\$model/);
  assert.match(workflow,/OLLAMA_MODEL_PULL_COUNT=\$pulls/);
});

test('main engine changes are serialized through bootstrap before one DESIGN_ONLY dispatch',()=>{
  const triggerSection=workflow.slice(0,workflow.indexOf('\npermissions:'));
  assert.doesNotMatch(triggerSection,/\n\s*push:/);
  assert.match(triggerSection,/workflow_dispatch:/);
  assert.match(triggerSection,/schedule:/);
  assert.match(bootstrap,/push:\s+branches: \[main\]\s+paths:/);
  for(const path of [
    '.github/workflows/company-seed-design-runtime.yml',
    'tools/company-design-cycle.mjs',
    'tools/artbook-production-pipeline.mjs',
    'tools/company-baseline-gate.mjs',
    'tools/company-design-artbook.mjs',
    'company-directive.json',
  ]) assert.ok(bootstrap.includes(`- '${path}'`),`bootstrap missing design engine path: ${path}`);
  assert.match(bootstrap,/if: steps\.persist\.outputs\.persisted == 'true' \|\| github\.event_name == 'push'/);
  assert.match(bootstrap,/gh workflow run company-seed-design-runtime\.yml --ref main/);
  assert.match(bootstrap,/GAME_SEED_DESIGN_DISPATCH_SOURCE=/);
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

test('parallel seed jobs persist only generated target paths on the latest company-runtime head',()=>{
  assert.match(workflow,/for attempt in 1 2 3 4/);
  assert.match(workflow,/generated_commit=\"\$\(git rev-parse HEAD\)\"/);
  assert.match(workflow,/if \[ \"\$seed_changed\" = 0 \]; then\s+rm -f game-seed-state\.json\s+fi/);
  assert.match(workflow,/git checkout -B seed-design-persist \"origin\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/git checkout \"\$generated_commit\" -- \"\$game_path\" \"\$artbook_path\"/);
  assert.match(workflow,/git push origin \"HEAD:refs\/heads\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.doesNotMatch(workflow,/git rebase \"origin\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/test \"\$pushed\" = 1/);
});

test('structured Ollama design calls preserve JSON budget and reuse loaded models briefly',()=>{
  assert.match(design,/JSON\.stringify\(\{model,stream:false,think:false,keep_alive:modelKeepAlive,format:schema/);
  assert.match(design,/const modelKeepAlive=clean\(process\.env\.COMPANY_MODEL_KEEP_ALIVE\|\|'2m'\)/);
  assert.match(design,/if\(!text\)throw new Error\('empty model response'\)/);
});

test('independent review generation only emits departments assigned to each model',()=>{
  assert.match(design,/const modelReviewRoles=Object\.fromEntries\(pool\.map\(model=>\[model,ROLES\.filter\(role=>departmentReviewModels\[role\]\.includes\(model\)\)\]\)\);/);
  assert.match(design,/const activeReviewModels=pool\.filter\(model=>modelReviewRoles\[model\]\.length>0\);/);
  assert.match(design,/const reviewsSchemaFor=roles=>/);
  assert.match(design,/parallelObject\(activeReviewModels,async model=>/);
  assert.match(design,/ASSIGNED_DEPARTMENTS=\$\{roles\.join\(','\)\}/);
  assert.match(design,/DEPARTMENT_REVIEW_MISSING/);
});

test('independent five-way department phases use bounded parallel execution without removing reviews',()=>{
  assert.match(design,/const modelPhaseConcurrency=Math\.max\(1,Math\.min\(3,Number\(process\.env\.COMPANY_MODEL_PHASE_CONCURRENCY\|\|3\)\)\)/);
  assert.match(design,/async function parallelObject\(keys,worker\)/);
  assert.match(design,/department_representatives',[\s\S]*parallelObject\(ROLES,async role=>/);
  assert.match(design,/lead_rebuttals',[\s\S]*parallelObject\(ROLES,async role=>/);
  assert.match(design,/five_lead_fatal_review',[\s\S]*parallelObject\(ROLES,role=>/);
  assert.match(design,/repeatedFatalReview:true/);
  assert.match(design,/rebuttalRounds:1/);
  assert.match(design,/sameModelRevised:true/);
});

test('design runtime emits persistent phase timing evidence for the next bottleneck',()=>{
  assert.match(design,/DESIGN_PHASE_MS=/);
  assert.match(design,/MODEL_CALL_MS=/);
  assert.match(design,/runtimeMetrics=\{phaseMs,totalModelCalls:modelCallStats\.length,totalModelCallMs:/);
  assert.match(design,/modelPhaseConcurrency,modelKeepAlive/);
  assert.match(design,/INDEPENDENT_REVIEW_OUTPUTS=/);
});
