import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/artbook-initial-backfill-chain.yml','utf8');

test('backfill chain follows completed artbook runs and dispatches the next initial',()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/workflows:\s*\['Free Artbook Department Bots'\]/);
  assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'failure'/);
  assert.match(workflow,/node tools\/artbook-prepare-daily\.mjs/);
  assert.match(workflow,/context\.mode\|\|''\)\.toUpperCase\(\)==='INITIAL'/);
  assert.match(workflow,/gh workflow run artbook-free-department-bots\.yml --ref main/);
  assert.match(workflow,/ARTBOOK_BACKFILL=NO_EXISTING_INITIAL_BACKLOG/);
});

test('failed initial target is recorded, moved behind the queue, and cannot loop forever',()=>{
  assert.match(workflow,/gh run download "\$FAILED_RUN_ID" -n daily-work-order/);
  assert.match(workflow,/backfillFailureCount=Number\(game\.backfillFailureCount\|\|0\)\+1/);
  assert.match(workflow,/queue\.queueOrder=\[\.\.\.order\.filter\(id=>id!==gameId\),gameId\]/);
  assert.match(workflow,/REPEATED_INITIAL_FAILURE_BLOCKED/);
  assert.match(workflow,/backfillFailureCount\|\|0\)>=2/);
  assert.match(workflow,/ARTBOOK_BACKFILL=BLOCKED_REPEATED_INITIAL_FAILURE/);
  assert.match(workflow,/ARTBOOK_BACKFILL_MANUAL_RETRY=AVAILABLE/);
});
