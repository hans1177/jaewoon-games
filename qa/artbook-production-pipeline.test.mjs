import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('tools/artbook-production-pipeline.mjs','utf8');
const designSource=fs.readFileSync('tools/company-design-cycle.mjs','utf8');
const departmentWorkflow=fs.readFileSync('.github/workflows/company-seed-design-runtime.yml','utf8');
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
  assert.match(source,/OLLAMA_DESIGN_TIMEOUT/);
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

test('DEVELOPMENT_CONFIRMED delegates to independent Roblox and Unity Web 3D runtime lanes',()=>{
  assert.match(source,/DEVELOPMENT_EXECUTION_MODE=ROBLOX_AND_UNITY_WEB_ONLY_CONTINUOUS_DEVELOPMENT/);
  assert.match(source,/DEVELOPMENT_RUNTIME_DELEGATED=YES/);
  assert.match(source,/DEVELOPMENT_RUNTIME_OWNER=\.github\/workflows\/company-development-confirmed-runtime\.yml/);
  assert.match(source,/DEVELOPMENT_QUEUE_AUTHORITY=company-runtime:development-queue\.json/);
  assert.match(source,/UNITY_WEB_UPPER_PLATFORM_FLOOR=INDEPENDENT_NO_ROBLOX_GATE/);
  assert.doesNotMatch(source,/DEVELOPMENT_EXECUTION_MODE=UNITY_WEB_FLOOR_THEN_DIRECT_NATIVE_DUAL_PLATFORM/);
  assert.doesNotMatch(source,/UNITY_WEB_UPPER_PLATFORM_FLOOR=REQUIRED_FOR_NEW_NATIVE_START/);
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
  assert.match(departmentWorkflow,/node tools\/company-design-cycle\.mjs/,'current design workflow runs the five-role canonical design engine');
  assert.doesNotMatch(departmentWorkflow,/node tools\/artbook-free-department-bots\.mjs/,'retired parallel design worker must stay absent');
});

test('retired standalone artbook model workers stay deleted and release has no Ollama transport',()=>{
  const retired=[
    'tools/artbook-department-runner.mjs','tools/artbook-department-rewrite.mjs',
    'tools/artbook-director-review.mjs','tools/artbook-cross-review-feedback.mjs',
    'tools/artbook-second-work-runner.mjs','tools/artbook-collaboration-runner.mjs',
    'tools/artbook-director-presentation.mjs','tools/artbook-visual-plan-runner.mjs',
    'tools/company-design-artbook.mjs','tools/company-development-disposition-gate.mjs'
  ];
  for(const file of retired)assert.equal(fs.existsSync(file),false,file+' must remain retired');
  const release=fs.readFileSync('tools/company-release-production-cycle.mjs','utf8');
  assert.equal(release.includes('127.0.0.1:11434'),false);
  assert.equal(release.includes('ollama pull'),false);
  assert.equal(release.includes('ollama serve'),false);
  assert.match(release,/requestGeminiFreePair/);
  assert.match(release,/RELEASE_EXTERNAL_FREE_MODEL_INDEPENDENCE_NOT_VERIFIED/);
  assert.ok(source.includes('company-design-cycle.mjs'));
});
