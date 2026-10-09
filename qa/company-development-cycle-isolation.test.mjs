// 파일명: qa/company-development-cycle-isolation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('central policy keeps v496 per-game failure isolation in current revisions',()=>{
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
  assert.match(workflow,/const ownerExcludedGameIds=new Set\(roadmap\?\.developmentSpeedExecution\?\.perGameFailureIsolation\?\.ownerExcludedGameIds\|\|\[\]\)/);
  assert.match(workflow,/!ownerExcludedGameIds\.has\(item\.gameId\)/);
  assert.match(workflow,/DEVELOPMENT_OWNER_EXCLUDED_GAME_IDS=/);
  assert.match(workflow,/run-name: DEVELOPMENT cycle \| \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.match(workflow,/coordinator-gate:/);
  assert.match(workflow,/group: company-development-confirmed-coordinator-gate-/);
  assert.match(workflow,/DEVELOPMENT_COORDINATOR_ADMISSION=DEDUPED_ACTIVE_BATCH/);
  assert.match(workflow,/native-plan:[\s\S]{0,180}?needs: coordinator-gate[\s\S]{0,180}?if: needs\.coordinator-gate\.outputs\.proceed == 'true'/);
  assert.match(workflow,/actions\/workflows\/company-development-confirmed-runtime\.yml\/runs\?per_page=100&page=\$page/);
  assert.match(workflow,/DEVELOPMENT_COORDINATOR_SCAN_INCLUDES_PUSH_AND_DISPATCH=YES/);
  assert.match(workflow,/DEVELOPMENT cycle \| batch \|/);
  assert.ok((workflow.match(/fail-fast: false/g)||[]).length>=4);
  assert.match(workflow,/continue-cycle:/);
  assert.match(workflow,/needs: \[native-plan, dispatch-roblox, dispatch-unity, dispatch-unity-web-floor, dispatch-unity-web-bootstrap\]/);
  assert.match(workflow,/if: \$\{\{ always\(\) && needs\.native-plan\.result == 'success'/);
  assert.match(workflow,/gh workflow run company-development-confirmed-runtime\.yml/);
  assert.match(workflow,/CONTINUOUS_PER_GAME_ISOLATED_CYCLE/);
  assert.match(workflow,/SINGLE_GAME_FAILURE_BLOCKS_GLOBAL_CYCLE=NO/);
});


test('only same-revision batch coordinator jobs coalesce, while game lanes stay independent',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const start=workflow.indexOf('  coordinator-gate:\n');
  const end=workflow.indexOf('\n  native-plan:',start);
  assert.ok(start>=0&&end>start);
  const gate=workflow.slice(start,end);
  assert.ok(gate.includes("group: company-development-confirmed-coordinator-gate-${{ (github.event_name == 'workflow_dispatch' && !inputs.game_id && format('batch-{0}', github.sha)) || github.run_id }}"));
  assert.match(gate,/cancel-in-progress: false/);
  assert.match(gate,/DEVELOPMENT_COORDINATOR_ADMISSION=DEDUPED_ACTIVE_BATCH/);
  assert.ok(workflow.slice(0,workflow.indexOf('\njobs:\n')).includes("github.run_id"));
  assert.match(workflow,/  dispatch-roblox:[\s\S]*?matrix:\n        game_id:/);
  assert.match(workflow,/  dispatch-unity-web-floor:[\s\S]*?matrix:\n        game_id:/);
});
