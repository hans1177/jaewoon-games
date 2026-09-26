import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');
const designRuntime=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const source=fs.readFileSync('tools/design-only-promotion-sync.mjs','utf8');

test('partial design-runtime failure still evaluates each persisted minimum-design-ready game',()=>{
  assert.match(designRuntime,/fail-fast:\s*false/);
  assert.match(promotion,/workflow_run:[\s\S]*types:\s*\[completed\]/);
  assert.match(promotion,/workflow_run\.conclusion == 'success'/);
  assert.match(promotion,/workflow_run\.conclusion == 'failure'/);
  assert.doesNotMatch(promotion,/workflow_run\.conclusion == 'cancelled'/);
  assert.match(promotion,/Promote minimum dual-platform design directly to native development/);
  assert.match(promotion,/company-minimum-design-contract\.mjs/);
  assert.match(promotion,/DEVELOPMENT_ADMISSION_GATE=MINIMUM_DUAL_PLATFORM_DESIGN_READY/);
  assert.match(promotion,/STRICT_DESIGN_REVIEW=PARALLEL_NON_ADMISSION_GATE/);
});

test('promotion source has one direct-native admission path and no Web-first or strict-score fallback',()=>{
  assert.match(source,/assertCanonicalDirectNativePolicy/);
  assert.match(source,/MINIMUM_DUAL_PLATFORM_DESIGN_READY/);
  assert.match(source,/strictDesignReviewRequiredForAdmission:false/);
  assert.match(source,/concurrentTargetPlatforms:\['ROBLOX','UNITY'\]/);
  assert.match(source,/UNITY_WEB_ROLE=OPTIONAL_NON_BLOCKING_VALIDATION_SURFACE/);
  assert.doesNotMatch(source,/DESIGN_PASS_THRESHOLD/);
  assert.doesNotMatch(source,/bindRequiredWebStage/);
  assert.doesNotMatch(source,/WEB_PLAYABLE_BOOTSTRAP/);
  assert.doesNotMatch(source,/WAITING_WEB_GAMEPLAY_VALIDATION/);
  assert.doesNotMatch(source,/AFTER_WEB_STRICT_REVIEW/);
  assert.doesNotMatch(source,/refreshCompletedDesignBaselineGates/);
});

test('promotion persists only runtime state while machine policy comes from main',()=>{
  const checkout=promotion.slice(promotion.indexOf('- name: Checkout current engine source'),promotion.indexOf('- name: Overlay latest company runtime design evidence'));
  assert.match(checkout,/fetch-depth: 2/);
  assert.doesNotMatch(checkout,/fetch-depth: 0/);
  assert.match(promotion,/COMPANY_RUNTIME_BRANCH: company-runtime/);
  assert.match(promotion,/refs\/heads\/\$COMPANY_RUNTIME_BRANCH:refs\/remotes\/origin\/\$COMPANY_RUNTIME_BRANCH/);
  assert.match(promotion,/refs\/heads\/main:refs\/remotes\/origin\/main/);
  assert.match(promotion,/for attempt in 1 2 3; do/);
  assert.match(promotion,/git fetch origin ['"]\+refs\/heads\/main:refs\/remotes\/origin\/main['"] ['"]\+refs\/heads\/\$COMPANY_RUNTIME_BRANCH:refs\/remotes\/origin\/\$COMPANY_RUNTIME_BRANCH['"] --depth=2 --no-tags --quiet/);
  assert.match(promotion,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(promotion,/Object\.hasOwn\(item,'webValidationRequired'\)\|\|Object\.hasOwn\(item,'musicValidationRequired'\)/);
  assert.doesNotMatch(promotion,/item\.webValidationRequired!==false\|\|item\.musicValidationRequired!==false/);
  const calls=promotion.match(/node tools\/design-only-promotion-sync\.mjs/g)||[];
  assert.ok(calls.length>=2);
  assert.match(promotion,/git checkout origin\/main -- company-directive\.json company-learning\/platform-release-roadmap\.json tools\/design-only-promotion-sync\.mjs/);
  assert.match(promotion,/tools\/company-homepage-platform-exposure-sync\.mjs tools\/company-shared-context\.mjs tools\/company-direct-native-design-migration\.mjs/);
  assert.match(promotion,/git reset --[\s\S]*tools\/company-homepage-platform-exposure-sync\.mjs tools\/company-shared-context\.mjs tools\/company-direct-native-design-migration\.mjs/);
  assert.match(promotion,/git add -- game-seed-state\.json design autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
  assert.doesNotMatch(promotion,/COMPANY_FLOW\.md/);
  assert.doesNotMatch(promotion,/DIRECT_NATIVE_DUAL_PLATFORM\.md/);
  assert.doesNotMatch(promotion,/tools\/company-baseline-gate\.mjs/);
});

test('stale development admission is removed instead of preserving an invalid queue invariant',()=>{
  assert.match(source,/function demoteStaleAdmission/);
  assert.match(source,/MINIMUM_DESIGN_REQUIRED/);
  assert.match(source,/queue\.items=\(queue\.items\|\|\[\]\)\.filter/);
  assert.match(source,/STALE_DEVELOPMENT_CONFIRMED_DEMOTED=/);
});

test('promotion dispatches both native lanes and does not use Unity Web as a promotion gate',()=>{
  assert.match(designRuntime,/PER_GAME_PROMOTION_DISPATCH=YES/);
  assert.match(designRuntime,/PORTFOLIO_WIDE_PASS_WAIT=NO/);
  assert.match(promotion,/company-development-confirmed-runtime\.yml/);
  assert.match(promotion,/DIRECT_NATIVE_DUAL_DISPATCH=CENTRAL_EXACT_FANOUT/);
  assert.match(promotion,/DIRECT_NATIVE_BATCH_DISPATCH=FORBIDDEN/);
  assert.doesNotMatch(promotion,/gh workflow run company-development-roblox-runtime\.yml/);
  assert.doesNotMatch(promotion,/gh workflow run company-development-unity-runtime\.yml/);
  assert.match(promotion,/UNITY_WEB_PROMOTION_GATE=NO/);
  assert.match(promotion,/ONE_PLATFORM_REQUEST_STARTS_BOTH=YES/);
});


test('verified design promotion wakes the existing Vibe scheduler only after runtime persistence',()=>{
  const persistIndex=promotion.indexOf('- name: Persist promoted state to company runtime branch');
  const dispatchIndex=promotion.indexOf('- name: Dispatch native development and immediate Vibe planner refill');
  assert.ok(persistIndex>=0&&dispatchIndex>persistIndex);
  assert.match(promotion,/permissions:[\s\S]*actions: write/);
  assert.match(promotion,/gh workflow run vibe2-24h-runner\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(promotion,/VERIFIED_DESIGN_VIBE_REFILL_DISPATCH=YES/);
  assert.match(promotion,/VERIFIED_DESIGN_VIBE_REFILL_AFTER_RUNTIME_PERSIST=YES/);
});

test('central gameplay evolution policy binds verified design resume to the canonical Vibe scheduler',()=>{
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const design=roadmap?.continuousGameplaySystemEvolutionContract?.designContext||{};
  assert.equal(design.coreFunAndProgressionResumeImmediatelyAfterVerifiedDesign,true);
  assert.equal(design.verifiedDesignResumeTrigger,'IMMEDIATE_EXISTING_VIBE_SCHEDULER_WAKE_AFTER_PROMOTION_RUNTIME_PERSIST');
  assert.equal(design.resumeSchedulerBinding,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(design.resumeDispatchCondition,'AFTER_CANONICAL_PROMOTION_RUNTIME_PERSIST_SUCCESS');
  assert.equal(design.resumeUsesExistingCanonicalSchedulerOnly,true);
  assert.equal(design.resumeShadowPipelineForbidden,true);
});

test('architecture projects verified design resume without a shadow pipeline',()=>{
  const architecture=JSON.parse(fs.readFileSync('company-learning/company-architecture-map.json','utf8'));
  const resume=architecture?.continuousGameplaySystemEvolutionTopology?.verifiedDesignResume||{};
  assert.equal(resume.promotionRuntime,'.github/workflows/company-design-promotion-sync.yml');
  assert.equal(resume.scheduler,'.github/workflows/vibe2-24h-runner.yml');
  assert.equal(resume.condition,'AFTER_CANONICAL_PROMOTION_RUNTIME_PERSIST_SUCCESS');
  assert.equal(resume.mode,'WAKE_EXISTING_CANONICAL_VIBE_SCHEDULER');
  assert.deepEqual(resume.plannerRuntimeOverlay,['company-runtime:design','company-runtime:game-seed-state.json']);
  assert.equal(resume.shadowPipelineCreated,false);
});


test('promotion invariant accepts progressed native states and rejects Web-first regression',()=>{
  assert.match(promotion,/const currentStep=String\(item\.currentStep\|\|''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(promotion,/\^WEB_\|\^WAITING_WEB/);
  assert.doesNotMatch(promotion,/currentStep\|\|''\)!=='TARGET_PLATFORM_SOURCE_BIND'/);
});

test('design control jobs use slim runners while per-game design cycles retain full runners',()=>{
  assert.match(designRuntime,/\n  game-primary-gate:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(designRuntime,/\n  resolve-seed-targets:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(designRuntime,/\n  design-cycle:\n[\s\S]*?runs-on:\s*ubuntu-latest/);
  assert.match(designRuntime,/\n  mark-design-engine-canary:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(designRuntime,/\n  sync-strict-design-scores:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
  assert.match(designRuntime,/\n  continue-seed-supply:\n[\s\S]*?runs-on:\s*ubuntu-slim/);
});
