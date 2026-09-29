import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/artbook-initial-backfill-chain.yml','utf8');
const backfillJob=workflow.split('  handoff-completed-design-baseline:')[0];
const handoffJob=workflow.split('  handoff-completed-design-baseline:')[1]||'';

test('backfill chain continues after both successful and failed artbook runs',()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/workflows:\s*\['Free Artbook Department Bots'\]/);
  assert.doesNotMatch(backfillJob,/workflow_run\.conclusion == 'success'/);
  assert.match(backfillJob,/SOURCE_CONCLUSION:/);
  assert.match(backfillJob,/RECOVER_INCOMPLETE_INITIAL_AFTER_FAILED_RUN/);
  assert.match(backfillJob,/node tools\/artbook-prepare-daily\.mjs/);
  assert.match(backfillJob,/context\.mode\|\|''\)\.toUpperCase\(\)==='INITIAL'/);
  assert.match(backfillJob,/gh workflow run artbook-free-department-bots\.yml --ref main/);
  assert.match(backfillJob,/ARTBOOK_BACKFILL=NO_EXISTING_INITIAL_BACKLOG/);
});

test('development handoff remains gated to successful completed artbook runs',()=>{
  assert.match(handoffJob,/workflow_run\.conclusion == 'success'/);
  assert.match(handoffJob,/completed&&storyDesignReady&&state==='DESIGN_BASELINE'/);
  assert.match(handoffJob,/gh workflow run autonomous-continuous-development\.yml --ref main/);
});
