import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/artbook-initial-backfill-chain.yml','utf8');

test('backfill chain follows successful artbook runs and dispatches next initial',()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/workflows:\s*\['Free Artbook Department Bots'\]/);
  assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/node tools\/artbook-prepare-daily\.mjs/);
  assert.match(workflow,/context\.mode\|\|''\)\.toUpperCase\(\)==='INITIAL'/);
  assert.match(workflow,/gh workflow run artbook-free-department-bots\.yml --ref main/);
  assert.match(workflow,/ARTBOOK_BACKFILL=NO_EXISTING_INITIAL_BACKLOG/);
});
