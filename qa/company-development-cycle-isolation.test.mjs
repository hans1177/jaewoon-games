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
  assert.doesNotMatch(workflow,/^  coordinator-gate:/m);
  assert.match(workflow,/^  native-plan:/m);
  assert.doesNotMatch(workflow,/needs: coordinator-gate|needs\\.coordinator-gate/);
  assert.ok((workflow.match(/fail-fast: false/g)||[]).length>=1);
  assert.match(workflow,/continue-cycle:/);
  assert.match(workflow,/needs: \[native-plan, dispatch-roblox, dispatch-unity\]/);
  assert.match(workflow,/if: \$\{\{ always\(\) && needs\.native-plan\.result == 'success'/);
  assert.doesNotMatch(workflow.slice(workflow.indexOf('  continue-cycle:')),/gh workflow run company-development-confirmed-runtime\.yml/);
  assert.match(workflow,/DEVELOPMENT_CONTINUOUS_CYCLE_HANDOFF=INDEPENDENT_GAME_RUNS/);
  assert.match(workflow,/SINGLE_GAME_FAILURE_BLOCKS_GLOBAL_CYCLE=NO/);
});


test('director is independent from native game scheduler',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const director=fs.readFileSync('.github/workflows/director-supervisor.yml','utf8');
  assert.match(workflow,/^  native-plan:/m);
  assert.doesNotMatch(workflow,/coordinator-gate:/);
  assert.match(director,/^name: Director Staff Supervisor/m);
  assert.match(workflow,/ROBLOX_PARENT_WAITS_FOR_GAME_COMPLETION=NO/);
  assert.match(workflow,/gh workflow run company-development-roblox-runtime\.yml/);
});

test('Roblox active runs dedupe exact game and main revision without serializing sibling games',()=>{
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
    {id:1,event:'push',status:'queued',head_sha:'current',display_title:'Roblox runtime · survival'},
    {id:2,event:'push',status:'in_progress',head_sha:'current',display_title:'Roblox runtime · fantasy-survival'},
    {id:3,event:'push',status:'pending',head_sha:'current',display_title:'Roblox runtime · bug-defense'},
    {id:4,event:'push',status:'completed',head_sha:'current',display_title:'Roblox runtime · amusement-tycoon'},
    {id:5,event:'workflow_dispatch',status:'queued',head_sha:'current',display_title:'Roblox runtime · seed-puzzle-chromatic-cascade'},
    {id:6,event:'push',status:'queued',head_sha:'current',display_title:'Roblox runtime · survival and bug-defense'},
    {id:7,event:'push',status:'queued',head_sha:'current',display_title:'Roblox runtime · unknown-game'},
    {id:8,event:'workflow_dispatch',status:'queued',head_sha:'old',display_title:'Roblox runtime · survival2'}
  ];
  const context={
    rows,
    fs:{readFileSync:()=>JSON.stringify({workflow_runs:cases})},
    console:{log:()=>{}}
  };
  const ids=vm.runInNewContext(scan+"\n[...activeIds('fixture','Roblox runtime · ','current')].sort()",context);
  assert.deepEqual(Array.from(ids),[
    'bug-defense','fantasy-survival','seed-puzzle-chromatic-cascade','survival'
  ]);
  assert.ok(workflow.includes('if(activeRoblox.has(item.gameId))'));
  assert.ok(workflow.includes('ROBLOX_NATIVE_DISPATCH_DEDUPED_CURRENT_MAIN='));
  assert.ok(workflow.includes('ROBLOX_PARENT_WAITS_FOR_GAME_COMPLETION=NO'));
  assert.match(workflow,/fail-fast: false/);
});


test('director drain never cancels independent game scheduler',()=>{
  const director=fs.readFileSync('.github/workflows/director-supervisor.yml','utf8');
  const drain=director.slice(director.indexOf("while IFS='|' read -r run_id reason; do"));
  assert.match(drain,/DIRECTOR_INDEPENDENT_GAME_SCHEDULER_PRESERVED=/);
  assert.ok(drain.includes('CENTRAL_DEVELOPMENT_*'));
  assert.ok(drain.includes('CENTRAL_MANUAL_BATCH_*'));
  assert.ok(drain.indexOf('DIRECTOR_INDEPENDENT_GAME_SCHEDULER_PRESERVED=')<drain.indexOf('pre_cancel_state='));
});

test('director preserves independent Roblox runtime before cancellation',()=>{
  const director=fs.readFileSync('.github/workflows/director-supervisor.yml','utf8');
  const drain=director.slice(director.indexOf("while IFS='|' read -r run_id reason; do"));
  const marker=drain.indexOf('DIRECTOR_INDEPENDENT_ROBLOX_RUNTIME_PRESERVED=');
  assert.ok(marker>=0);
  assert.ok(drain.includes('company-development-roblox-runtime.yml'));
  assert.ok(drain.includes('company-development-roblox-runtime-continuation.yml'));
  assert.ok(drain.includes('DIRECTOR_RUNNER_DRAIN_UNVERIFIED_PATH_PRESERVED='));
  assert.ok(marker<drain.indexOf('pre_cancel_state='));
});
