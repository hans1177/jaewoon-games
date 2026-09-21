import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');
const designRuntime=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');

test('partial DESIGN_ONLY batch failure still evaluates persisted minimum-design-ready games for native promotion',()=>{
  assert.match(designRuntime,/fail-fast:\s*false/);
  assert.match(promotion,/workflow_run:[\s\S]*types:\s*\[completed\]/);
  assert.match(promotion,/workflow_run\.conclusion == 'success'/);
  assert.match(promotion,/workflow_run\.conclusion == 'failure'/);
  assert.doesNotMatch(promotion,/workflow_run\.conclusion == 'cancelled'/);
  assert.match(promotion,/Promote minimum dual-platform design directly to native development/);
  assert.match(promotion,/company-minimum-design-contract\.mjs/);
  assert.match(promotion,/minimumDesignContract\?\.pass!==true/);
  assert.match(promotion,/concurrentTargetPlatforms/);
  assert.match(promotion,/Roblox platform profile missing/);
  assert.match(promotion,/Unity platform profile missing/);
  assert.match(promotion,/legacy Web gate still active/);
  assert.match(promotion,/STRICT_DESIGN_REVIEW=PARALLEL_NON_ADMISSION_GATE/);
  assert.match(promotion,/UNITY_WEB_GATE=DISABLED/);
});


test('promotion is per-game and dispatches both native lanes after minimum design is ready',()=>{
  assert.match(designRuntime,/PER_GAME_PROMOTION_DISPATCH=YES/);
  assert.match(designRuntime,/PER_GAME_PROMOTION_FORCE=NO/);
  assert.match(designRuntime,/PORTFOLIO_WIDE_PASS_WAIT=NO/);
  assert.match(promotion,/Dispatch Roblox and Unity native development together/);
  assert.match(promotion,/company-development-roblox-runtime\.yml/);
  assert.match(promotion,/company-development-unity-runtime\.yml/);
  assert.match(promotion,/DIRECT_NATIVE_DUAL_DISPATCH=ROBLOX,UNITY/);
  assert.match(promotion,/UNITY_WEB_DISPATCH=NO/);
  assert.match(promotion,/ONE_PLATFORM_REQUEST_STARTS_BOTH=YES/);
});

test('promotion persistence retries only against the newest runtime state and never replays stale JSON snapshots',()=>{
  assert.match(promotion,/for attempt in 1 2 3; do/);
  assert.match(promotion,/git fetch origin main "\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(promotion,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  const promotionCalls=promotion.match(/node tools\/design-only-promotion-sync\.mjs/g)||[];
  assert.ok(promotionCalls.length>=2,'promotion must be recalculated during latest-runtime persistence');
  assert.match(promotion,/DESIGN_PROMOTION_RUNTIME_PERSIST_CONFLICT=RETRY_LATEST_RUNTIME/);
  assert.match(promotion,/DESIGN_PROMOTION_RUNTIME_PERSIST=FAILED_AFTER_3_ATTEMPTS/);
  assert.doesNotMatch(promotion,/cp \/tmp\/design-promotion-runtime\/game-seed-state\.json/);
  assert.match(promotion,/git checkout origin\/main -- company-directive\.json company-learning\/platform-release-roadmap\.json tools\/design-only-promotion-sync\.mjs tools\/company-baseline-gate\.mjs tools\/company-game-seed-contract\.mjs/);
  assert.match(promotion,/git add -- game-seed-state\.json design autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
});

test('promotion persistence clears ephemeral overlay before switching to the runtime branch',()=>{
  const resetIndex=promotion.indexOf('git reset --hard HEAD');
  const cleanIndex=promotion.indexOf('git clean -fd',resetIndex);
  const checkoutIndex=promotion.indexOf('git checkout -B design-promotion-persist "origin/$COMPANY_RUNTIME_BRANCH"');
  assert.ok(resetIndex>=0,'ephemeral overlay hard reset must exist');
  assert.ok(cleanIndex>resetIndex,'untracked overlay cleanup must follow the hard reset');
  assert.ok(checkoutIndex>cleanIndex,'runtime branch checkout must happen only after the dirty worktree is cleared');
});


test('promotion re-evaluates completed DESIGN_ONLY baseline gates with the canonical seed contract before deciding promotion',()=>{
  const source=fs.readFileSync('tools/design-only-promotion-sync.mjs','utf8');
  assert.ok(promotion.includes("'tools/company-baseline-gate.mjs'"));
  assert.ok(promotion.includes("'tools/company-game-seed-contract.mjs'"));
  assert.match(source,/function refreshCompletedDesignBaselineGates/);
  assert.match(source,/spawnSync\(process\.execPath/);
  assert.match(source,/DESIGN_BASELINE_GATE_REFRESH_FAILED/);
  assert.match(source,/DESIGN_BASELINE_GATES_REFRESHED=/);
  assert.doesNotMatch(source,/game-seed-field-required:REFERENCE_GAMES/);
});

test('canonical deterministic gate policy is overlaid when promotion recalculates on company-runtime',()=>{
  assert.match(
    promotion,
    /git checkout origin\/main -- company-directive\.json company-learning\/platform-release-roadmap\.json tools\/design-only-promotion-sync\.mjs/
  );
  assert.match(
    promotion,
    /git reset -- company-directive\.json company-learning\/platform-release-roadmap\.json tools\/design-only-promotion-sync\.mjs/
  );
  assert.match(promotion,/runtime branch can revive legacy AI-review blockers/);
  assert.match(promotion,/git add -- game-seed-state\.json design autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
  assert.doesNotMatch(promotion,/git add --[^\n]*company-learning\/platform-release-roadmap\.json/);
});


test('promotion refresh pins the completed DESIGN_ONLY cycle without weakening current development gates',()=>{
  const promotionSource=fs.readFileSync('tools/design-only-promotion-sync.mjs','utf8');
  const gate=fs.readFileSync('tools/company-baseline-gate.mjs','utf8');
  assert.match(promotionSource,/BASELINE_GATE_REFRESH_MODE:'DESIGN_EVIDENCE'/);
  assert.match(gate,/refreshMode==='DESIGN_EVIDENCE'/);
  assert.match(gate,/DESIGN_EVIDENCE_REFRESH_REQUIRES_DESIGN_ONLY_CYCLE/);
  assert.match(gate,/DESIGN_EVIDENCE_REFRESH_REQUIRES_COMPLETE_CYCLE/);
  assert.match(gate,/DESIGN_EVIDENCE_REFRESH_REQUIRES_REVISED_DESIGN/);
  assert.match(gate,/designEvidenceRefresh\?PRODUCTION_CLASSES\.DESIGN_ONLY/);
  assert.match(gate,/deterministic-design-pre-gate-pass-required/);
  assert.match(gate,/multiplayer-design-mode-required:SINGLE\|COOP\|COMPETITIVE\|HYBRID/);
  assert.match(gate,/meetingConflicts>0/);
  assert.match(gate,/meetingHolds>0/);
});
