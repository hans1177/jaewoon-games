import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const promotion=fs.readFileSync('.github/workflows/company-design-promotion-sync.yml','utf8');
const designRuntime=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');

test('partial DESIGN_ONLY batch failure still evaluates persisted strict-ready games for promotion',()=>{
  assert.match(designRuntime,/fail-fast:\s*false/);
  assert.match(promotion,/workflow_run:[\s\S]*types:\s*\[completed\]/);
  assert.match(promotion,/workflow_run\.conclusion == 'success'/);
  assert.match(promotion,/workflow_run\.conclusion == 'failure'/);
  assert.doesNotMatch(promotion,/workflow_run\.conclusion == 'cancelled'/);
  assert.match(promotion,/Promote 80-point strict-ready design baselines directly to Web gate/);
  assert.match(promotion,/review\.verdict==='PASS'/);
  assert.match(promotion,/Number\(review\.totalScore\)>=80/);
  assert.match(promotion,/review\.hardFailures\.length===0/);
  assert.match(promotion,/PRE_WEB_ARTBOOK_REQUIRED=NO/);
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
  assert.match(promotion,/git add -- game-seed-state\.json autonomous-portfolio\.json game-catalog\.json development-queue\.json/);
});
