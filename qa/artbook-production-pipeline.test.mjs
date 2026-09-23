import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const designSource=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const departmentWorkflow=fs.readFileSync('.github/workflows/artbook-free-department-bots.yml','utf8');
const directive=JSON.parse(fs.readFileSync('company-directive.json','utf8'));

test('DESIGN_ONLY pipeline is GAME_SEED-backed design -> baseline and stops before artbook',()=>{
  const fact=source.indexOf("await run('tools/artbook-fact-pack.mjs')");
  const design=source.search(/await run(?:WithRetry)?\('tools\/company-design-cycle\.mjs'/);
  const gate=source.indexOf("await run('tools/company-baseline-gate.mjs')",design);
  const artbook=source.indexOf("await run('tools/company-design-artbook.mjs')",gate);
  assert.ok(fact>=0,'FACT PACK stage missing');
  assert.ok(design>fact,'design cycle must run after FACT PACK');
  assert.ok(gate>design,'DESIGN_BASELINE gate must run after design revision');
  assert.equal(artbook,-1,'DESIGN_ONLY must not create artbook before promotion');
  assert.match(source,/activeSeedForGame/);
  assert.match(source,/DESIGN_BASELINE_READY/);
  assert.match(source,/DESIGN_ONLY_ARTBOOK_SKIPPED=WAIT_FOR_PROMOTION/);
  assert.match(source,/DESIGN_ONLY_ARTBOOK_BEFORE_PROMOTION=NO/);
  assert.match(source,/attempts='UNLIMITED'/);
  assert.match(source,/const unlimited=String\(attempts\)\.toUpperCase\(\)==='UNLIMITED'/);
  assert.match(source,/function designSchemaRetryable/);
  assert.match(source,/const schemaOrJsonFailure=/);
  assert.match(source,/const transientModelFailure=/);
  assert.match(source,/return schemaOrJsonFailure\|\|transientModelFailure/);
  assert.match(source,/aborted due to timeout/);
  assert.match(source,/unterminated string/);
  assert.match(source,/expected \['\\\",\]/);
  assert.match(source,/json at position/);
  assert.doesNotMatch(source,/if\(\/\(\?:aborted due to timeout\|timeout\|timed out\)\/i\.test\(output\)\)return false/);
  assert.match(source,/retryWhen:designSchemaRetryable/);
  assert.match(source,/RETRY=NO\|reason=NON_RETRYABLE_FAILURE/);
  assert.match(source,/DESIGN_ONLY_VIBE2_USED=NO/);
  assert.match(source,/PAID_API=NO/);
});

test('DEVELOPMENT_CONFIRMED delegates directly to the native dual-platform runtime instead of re-running legacy Web-first gates',()=>{
  assert.match(source,/DEVELOPMENT_EXECUTION_MODE=DIRECT_NATIVE_DUAL_PLATFORM/);
  assert.match(source,/DEVELOPMENT_RUNTIME_DELEGATED=YES/);
  assert.match(source,/DEVELOPMENT_RUNTIME_OWNER=\.github\/workflows\/company-development-confirmed-runtime\.yml/);
  assert.match(source,/DEVELOPMENT_QUEUE_AUTHORITY=company-runtime:development-queue\.json/);
  assert.match(source,/DEVELOPMENT_LEGACY_WEB_FIRST_VALIDATION=DISABLED/);
  assert.match(source,/DEVELOPMENT_ARTBOOK_PIPELINE_SOURCE_MUTATION=NO/);
  assert.doesNotMatch(source,/await run\('tools\/company-development-validation-cycle\.mjs'\)/);
  assert.doesNotMatch(source,/await run\('tools\/company-development-disposition-gate\.mjs'\)/);
});


test('canonical department contract is exactly five roles including audio',()=>{
  const expected=['planning','graphics','development','qa','audio'];
  assert.deepEqual(directive.ai?.departments,expected);
  assert.deepEqual(Object.keys(directive.ai?.departmentLeadModels||{}).sort(),[...expected].sort());
  assert.equal(directive.ai?.departmentResponsibilityMerge?.balance?.separateDepartment,false);
  assert.deepEqual(directive.ai?.departmentResponsibilityMerge?.balance?.mergedInto,['planning','qa']);
  assert.match(designSource,/const ROLES=\['planning','graphics','development','qa','audio'\]/);
  assert.doesNotMatch(designSource,/const ROLES=\[[^\]]*'balance'/);
  assert.match(designSource,/ART_AUDIO_DIRECTION:\['graphics','audio'\]/);
  assert.match(departmentWorkflow,/const designRoles=\['planning','graphics','development','qa','audio'\]/);
  assert.doesNotMatch(departmentWorkflow,/\['planning','graphics','development','qa','balance','audio'\]/);
});
