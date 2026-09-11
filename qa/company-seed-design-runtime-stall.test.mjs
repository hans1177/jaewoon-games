import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('seed design runtime cancels stale runs and revalidates matrix targets before model setup',()=>{
  assert.match(workflow,/group: company-seed-design-runtime\s+cancel-in-progress: true/);
  const checkoutIndex=workflow.indexOf('- name: Checkout isolated company runtime branch');
  const revalidateIndex=workflow.indexOf('- name: Revalidate current seed target');
  const ollamaIndex=workflow.indexOf('- name: Install local Ollama');
  assert.ok(checkoutIndex>=0&&revalidateIndex>checkoutIndex&&ollamaIndex>revalidateIndex);
  assert.match(workflow,/TARGET_SEED_ID: \$\{\{ matrix\.target\.seed_id \}\}/);
  assert.match(workflow,/STALE_SEED_TARGET_SKIP/);
  assert.match(workflow,/baselineGateState==='DESIGN_BASELINE_READY'/);
  assert.match(workflow,/if: steps\.target\.outputs\.should_run == 'true'/);
});

test('structured Ollama design calls disable thinking so JSON content budget is preserved',()=>{
  assert.match(design,/JSON\.stringify\(\{model,stream:false,think:false,keep_alive:'0s',format:schema/);
  assert.match(design,/if\(!text\)throw new Error\('empty model response'\)/);
});
