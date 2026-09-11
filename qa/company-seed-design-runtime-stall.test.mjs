import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
const design=fs.readFileSync('tools/company-design-cycle.mjs','utf8');

test('seed design runtime cancels stale runs and revalidates matrix targets before model setup',()=>{
  assert.match(workflow,/group: company-seed-design-runtime\s+cancel-in-progress: true/);
  const checkoutIndex=workflow.indexOf('- name: Checkout isolated company runtime branch');
  const revalidateIndex=workflow.indexOf('- name: Revalidate current seed target');
  const cacheIndex=workflow.indexOf('- name: Restore Ollama model cache');
  const ollamaIndex=workflow.indexOf('- name: Install local Ollama');
  assert.ok(checkoutIndex>=0&&revalidateIndex>checkoutIndex&&cacheIndex>revalidateIndex&&ollamaIndex>cacheIndex);
  assert.match(workflow,/TARGET_SEED_ID: \$\{\{ matrix\.target\.seed_id \}\}/);
  assert.match(workflow,/STALE_SEED_TARGET_SKIP/);
  assert.match(workflow,/baselineGateState==='DESIGN_BASELINE_READY'/);
  assert.match(workflow,/if: steps\.target\.outputs\.should_run == 'true'/);
});

test('seed design runtime removes serial throughput bottleneck without paid runners',()=>{
  assert.match(workflow,/max-parallel: 3/);
  assert.match(workflow,/runs-on: ubuntu-latest/);
  assert.match(workflow,/uses: actions\/cache@v4/);
  assert.match(workflow,/path: ~\/\.ollama\/models/);
  assert.match(workflow,/ollama-seed-design-\$\{\{ runner\.os \}\}-\$\{\{ hashFiles\('company-directive\.json'\) \}\}/);
});

test('parallel seed jobs synchronize company-runtime writes before push',()=>{
  assert.match(workflow,/for attempt in 1 2 3 4/);
  assert.match(workflow,/git fetch origin \"\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/git rebase \"origin\/\$COMPANY_RUNTIME_BRANCH\"/);
  assert.match(workflow,/test \"\$pushed\" = 1/);
});

test('structured Ollama design calls disable thinking so JSON content budget is preserved',()=>{
  assert.match(design,/JSON\.stringify\(\{model,stream:false,think:false,keep_alive:'0s',format:schema/);
  assert.match(design,/if\(!text\)throw new Error\('empty model response'\)/);
});
