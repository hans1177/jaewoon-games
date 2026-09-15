import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/company-development-roblox-final-review-revalidation.yml', 'utf8');
const evaluator = fs.readFileSync('tools/company-development-roblox-final-review.mjs', 'utf8');

test('final-review revalidation reuses prior Studio QA and only dispatches canonical multiplayer QA', () => {
  assert.match(workflow, /name: Company DEVELOPMENT_CONFIRMED Roblox Final Review Revalidation/);
  assert.match(workflow, /workflows: \["Company DEVELOPMENT_CONFIRMED Roblox Multiplayer QA"\]/);
  assert.match(workflow, /repository_dispatch:[\s\S]*types: \[roblox_multiplayer_qa_persisted\]/);
  assert.match(workflow, /ref: company-runtime/);
  assert.match(workflow, /node \.\.\/main\/tools\/company-development-roblox-final-review\.mjs/);
  assert.match(workflow, /gh workflow run company-development-roblox-multiplayer-qa\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$id"/);
  assert.match(workflow, /github\.event_name != 'repository_dispatch'/);
  assert.match(workflow, /ROBLOX_RUNTIME_RERUN=NO/);
  assert.match(workflow, /ROBLOX_MOBILE_INDEPENDENT_QA_RERUN=NO/);
  assert.match(workflow, /ROBLOX_REGRESSION_RERUN=NO/);
  assert.doesNotMatch(workflow, /RobloxStudioBeta\.exe/);
  assert.doesNotMatch(workflow, /company-development-roblox-runtime-smoke\.luau/);
  assert.doesNotMatch(workflow, /company-development-roblox-mobile-independent-qa\.luau/);
});

test('multiplayer QA implementation changes automatically re-enter final-review revalidation', () => {
  assert.match(workflow, /'\.github\/workflows\/company-development-roblox-multiplayer-qa\.yml'/);
  assert.match(workflow, /'tools\/company-development-roblox-multiplayer-qa\.luau'/);
  assert.match(workflow, /'qa\/company-development-roblox-multiplayer-qa\.test\.mjs'/);
});

test('canonical evaluator preserves fail-closed multiplayer and release gates', () => {
  assert.match(evaluator, /new Set\(\['SINGLE', 'COOP', 'COMPETITIVE', 'HYBRID'\]\)/);
  assert.match(evaluator, /item\.robloxMultiplayerQaPassed === true/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_DESIGN_DECISION_MISSING/);
  assert.match(evaluator, /ROBLOX_MULTIPLAYER_QA_REQUIRED/);
  assert.match(evaluator, /ROBLOX_DATASTORE_REJOIN_REQUIRED/);
  assert.match(evaluator, /ROBLOX_RELEASE_PROMOTION_PENDING/);
  assert.match(evaluator, /item\.robloxReleaseClaim = false/);
  assert.match(evaluator, /item\.robloxExactRevisionPassed === true/);
});
