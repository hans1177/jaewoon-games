import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-game-seed-bootstrap.yml','utf8');

test('existing bootstrap->design chain continues active DESIGN_ONLY work without requiring seed mutation',()=>{
  assert.match(workflow,/Continue active DESIGN_ONLY work without cancelling active batch/);
  assert.match(workflow,/if: always\(\)/);
  assert.match(workflow,/ACTIVE_DESIGN_ONLY_SEEDS=/);
  assert.match(workflow,/status==='ACTIVE'/);
  assert.match(workflow,/DEVELOPMENT_CONFIRMED/);
  assert.match(workflow,/RELEASE_CONFIRMED/);
  assert.match(workflow,/!life\.includes\('HOLD'\)/);
  assert.match(workflow,/ACTIVE_DESIGN_ONLY_RUNS=/);
  assert.match(workflow,/SKIP_ACTIVE_BATCH/);
  assert.match(workflow,/gh workflow run company-seed-design-runtime\.yml --ref main/);
});
