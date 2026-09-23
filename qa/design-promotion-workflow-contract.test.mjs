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
  assert.match(promotion,/for attempt in 1 2 3; do/);
  assert.match(promotion,/git fetch origin main "\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(promotion,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  const calls=promotion.match(/node tools\/design-only-promotion-sync\.mjs/g)||[];
  assert.ok(calls.length>=2);
  assert.match(promotion,/git checkout origin\/main -- company-directive\.json company-learning\/platform-release-roadmap\.json tools\/design-only-promotion-sync\.mjs/);
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
  assert.match(promotion,/company-development-roblox-runtime\.yml/);
  assert.match(promotion,/company-development-unity-runtime\.yml/);
  assert.match(promotion,/DIRECT_NATIVE_DUAL_DISPATCH=ROBLOX,UNITY/);
  assert.match(promotion,/UNITY_WEB_PROMOTION_GATE=NONE/);
  assert.match(promotion,/UNITY_WEB_ROLE=OPTIONAL_NON_BLOCKING_VALIDATION_SURFACE/);
  assert.match(promotion,/legacy Web admission key remains/);
  assert.match(promotion,/legacy Web development step remains/);
  assert.doesNotMatch(promotion,/currentStep\\|\\|'[^']*'\\)!==['\"]TARGET_PLATFORM_SOURCE_BIND/);
  assert.match(promotion,/ONE_PLATFORM_REQUEST_STARTS_BOTH=YES/);
});
