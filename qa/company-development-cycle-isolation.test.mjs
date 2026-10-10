// 파일명: qa/company-development-cycle-isolation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

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
  // No unstarted queued/pending workflow may monopolize this source revision's development batch.
  assert.match(gate,/select\(\.status == "in_progress"\)/);
  assert.doesNotMatch(gate,/select\(\.status == "queued" or \.status == "pending"/);
  assert.ok(workflow.slice(0,workflow.indexOf('\njobs:\n')).includes("github.run_id"));
  assert.match(workflow,/  dispatch-roblox:[\s\S]*?matrix:\n        game_id:/);
  assert.match(workflow,/  dispatch-unity-web-floor:[\s\S]*?matrix:\n        game_id:/);
});

test('Unity Web active push runs are coalesced by exact game ID without serializing sibling games',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const start=workflow.indexOf("          const activeStates=new Set(['queued','pending','in_progress','requested']);");
  const end=workflow.indexOf('          const currentControlSha=',start);
  assert.ok(start>=0&&end>start,'read the live canonical active-run scanner');
  const scan=workflow.slice(start,end);
  const rows=[
    {gameId:'survival'},{gameId:'survival2'},{gameId:'fantasy-survival'},
    {gameId:'bug-defense'},{gameId:'amusement-tycoon'},
    {gameId:'seed-puzzle-chromatic-cascade'}
  ];
  const cases=[
    {id:1,event:'push',status:'queued',display_title:'Unity Web Floor build(unity-web): request survival main homepage deployment'},
    {id:2,event:'push',status:'in_progress',display_title:'Unity Web Floor build(unity-web): dispatch fantasy-survival verified deployment pipeline'},
    {id:3,event:'push',status:'pending',display_title:'Unity Web Floor fix(unity-web): retry bug-defense browser game'},
    {id:4,event:'push',status:'completed',display_title:'Unity Web Floor build(unity-web): request amusement-tycoon homepage deployment'},
    {id:5,event:'workflow_dispatch',status:'queued',display_title:'Unity Web Floor seed-puzzle-chromatic-cascade'},
    {id:6,event:'push',status:'queued',display_title:'Unity Web Floor build(unity-web): request survival and bug-defense homepage builds'},
    {id:7,event:'push',status:'queued',display_title:'Unity Web Floor build(unity-web): unrelated game no exact slug'}
  ];
  const context={
    rows,
    fs:{readFileSync:()=>JSON.stringify({workflow_runs:cases})},
    console:{log:()=>{}}
  };
  const ids=vm.runInNewContext(scan+"\n[...activeIds('fixture','Unity Web Floor ')].sort()",context);
  assert.deepEqual(Array.from(ids),[
    'bug-defense','fantasy-survival','seed-puzzle-chromatic-cascade','survival'
  ]);
  assert.ok(scan.includes('UNITY_WEB_FLOOR_ACTIVE_PUSH_DETECTED='));
  assert.ok(workflow.includes('if(activeUnityWebFloor.has(item.gameId))'));
  assert.ok(workflow.includes('UNITY_WEB_FLOOR_DISPATCH_DEDUPED_ACTIVE='));
  assert.match(workflow,/fail-fast: false/);
});
