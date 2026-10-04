import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central policy documents 60-pipeline bottleneck order and 89 pre-promotion target',()=>{
  const flow=fs.readFileSync('COMPANY_FLOW.md','utf8');
  for(const token of ['developmentPipelineTarget: 60','WEB_SCORE_80_TO_88_WEAK_AXIS_IMPROVEMENT','targetScore: 89','preserveExisting90PromotionGate: true','staleCatalogMissingProjectMustBecomeLifecycleInactive: true'])assert.equal(flow.includes(token),true,token);
});

test('status sync treats missing catalog projects as lifecycle inactive',()=>{
  const src=fs.readFileSync('tools/company-status-sync.mjs','utf8');
  assert.equal(src.includes("const lifecycleState=catalogPresent?gameLifecycleState(game):'REMOVED'"),true);
  assert.equal(src.includes("row.catalogPresent!==true||!lifecycleAllowsDevelopment(game)"),true);
});

test('planner consumes development validation and creates 80-88 to 89 implementation work',()=>{
  const src=fs.readFileSync('tools/vibe2-auto-planner.mjs','utf8');
  assert.equal(src.includes('function latestDevelopmentValidationStatus'),true);
  assert.equal(src.includes('function bottleneckRank'),true);
  assert.equal(src.includes('function findWebStrictImprovementTask'),true);
  assert.equal(src.includes('score<80||score>88'),true);
  assert.equal(src.includes('90점 승격 게이트나 독립 재검증 규칙은 변경하지 않는다'),true);
});

test('native workflows serialize only exact duplicate source cycles and keep newer game cycles parallel',()=>{
  const confirmed=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const continuation=fs.readFileSync('.github/workflows/company-development-roblox-runtime-continuation.yml','utf8');
  const roblox=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const unity=fs.readFileSync('.github/workflows/company-development-unity-runtime.yml','utf8');

  assert.match(confirmed,/group: company-development-confirmed-\$\{\{ inputs\.game_id \|\| \(github\.event_name == 'push' && 'main-push'\) \|\| github\.run_id \}\}-\$\{\{ github\.sha \}\}/);
  assert.match(confirmed,/group: company-development-confirmed-coordinator-gate-[^\n]*\$\{\{ github\.sha \}\}/);
  assert.match(continuation,/group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}-\$\{\{ github\.sha \}\}/);
  assert.match(roblox,/group: roblox-native-exact-[^\n]*\$\{\{ github\.sha \}\}/);
  assert.match(unity,/group: unity-native-exact-[^\n]*\$\{\{ github\.sha \}\}-\$\{\{ inputs\.publication_retry_only && 'publication-retry' \|\| 'runtime' \}\}/);

  assert.doesNotMatch(continuation,/group: roblox-shared-preflight-\$\{\{ inputs\.game_id \|\| 'batch' \}\}\s*$/m);
  assert.doesNotMatch(roblox,/group: roblox-native-exact-\$\{\{ inputs\.game_id \|\| \(github\.event_name == 'push' && 'batch-push'\) \|\| github\.run_id \}\}\s*$/m);
  assert.doesNotMatch(unity,/group: unity-native-exact-\$\{\{ inputs\.game_id \|\| \(github\.event_name == 'push' && 'batch-push'\) \|\| github\.run_id \}\}\s*$/m);
});

test('F9 and private deployment dedupe exact control revision instead of serializing every game cycle',()=>{
  const f9=fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml','utf8');
  const publish=fs.readFileSync('.github/workflows/company-development-roblox-release-promotion.yml','utf8');
  const postRuntime=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');
  assert.match(f9,/String\(r\.head_sha\|\|''\)===controlSha/);
  assert.match(publish,/String\(r\.head_sha\|\|''\)===controlSha/);
  assert.match(postRuntime,/group: roblox-runtime-foundation-\$\{\{ github\.run_id \}\}/);
  assert.doesNotMatch(postRuntime,/group: roblox-runtime-foundation-\$\{\{ inputs\.game_id/);
});

