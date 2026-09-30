// 파일명: qa/company-development-cycle-isolation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central policy v496+ isolates one game failure from the continuous development cycle',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.ok(policy.version>=496);
  const isolation=policy.developmentSpeedExecution?.perGameFailureIsolation||{};
  assert.equal(isolation.enabled,true);
  assert.equal(isolation.failureScope,'GAME_AND_PLATFORM_LANE_ONLY');
  assert.equal(isolation.matrixFailFastForbidden,true);
  assert.equal(isolation.failedGameMayNotCancelSiblingGames,true);
  assert.equal(isolation.parentCycleMustReopenAfterAllPerGameOutcomes,true);
  assert.equal(isolation.globalCycleStopOnSingleGameFailureForbidden,true);
  assert.deepEqual(isolation.ownerExcludedGameIds,['horror-escape-room']);
});

test('DEVELOPMENT_CONFIRMED workflow continues after failed game lanes and keeps midnight excluded',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(workflow,/ownerExcludedGameIds=new Set\(\['horror-escape-room'\]\)/);
  assert.ok((workflow.match(/fail-fast: false/g)||[]).length>=4);
  assert.match(workflow,/continue-cycle:/);
  assert.match(workflow,/needs: \[native-plan, dispatch-roblox, dispatch-unity, dispatch-unity-web-floor, dispatch-unity-web-bootstrap\]/);
  assert.match(workflow,/if: \$\{\{ always\(\) && needs\.native-plan\.result == 'success'/);
  assert.match(workflow,/repository_dispatch:[\s\S]*company-development-cycle-refill/);
  assert.match(workflow,/repos\/\$GITHUB_REPOSITORY\/dispatches/);
  assert.doesNotMatch(workflow,/gh workflow run company-development-confirmed-runtime\.yml/);
  assert.match(workflow,/CONTINUOUS_PER_GAME_ISOLATED_CYCLE/);
  assert.match(workflow,/SINGLE_GAME_FAILURE_BLOCKS_GLOBAL_CYCLE=NO/);
});
