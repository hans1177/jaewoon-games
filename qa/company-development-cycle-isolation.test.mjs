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
  assert.ok(Array.isArray(isolation.ownerExcludedGameIds));
  assert.equal(isolation.ownerExcludedGameIds.includes('horror-escape-room'),false);
});

test('DEVELOPMENT_CONFIRMED workflow keeps explicit exclusions and permits resumed Midnight Escape',()=>{
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


test('the actual native planner admits resumed Midnight Escape and still honors explicit exclusions',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const start=workflow.indexOf('          const q=JSON.parse');
  const end=workflow.indexOf('\n          NODE',start);
  const code=workflow.slice(start,end);
  const run=roadmap=>{
    let output='';
    const item={gameId:'horror-escape-room',status:'ACTIVE',productionClass:'DEVELOPMENT_CONFIRMED'};
    const fsMock={
      readFileSync:file=>JSON.stringify(file==='/tmp/development-queue.json'?{items:[item]}:
        file==='company-learning/platform-release-roadmap.json'?roadmap:{workflow_runs:[]}),
      appendFileSync:(_file,text)=>output+=text
    };
    vm.runInNewContext(code,{fs:fsMock,process:{cwd:()=>'.',env:{REQUESTED_GAME_ID:'horror-escape-room',CURRENT_CONTROL_SHA:'a'.repeat(40),GITHUB_OUTPUT:'test'}},
      platformDevelopmentEligible:()=>true,classifyUpperPlatformAdmission:()=>({state:'UPPER_PLATFORM'}),console:{log:()=>{}}});
    return output;
  };
  assert.match(run(policy),/roblox_json=\["horror-escape-room"\]/);
  const held=structuredClone(policy);
  held.developmentSpeedExecution.perGameFailureIsolation.ownerExcludedGameIds.push('horror-escape-room');
  assert.match(run(held),/roblox_json=\[\]/);
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

test('Roblox active source-plan owners suppress duplicate game dispatch across main revisions',()=>{
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
  const ids=vm.runInNewContext(scan+"\n[...activeIds('fixture','Roblox runtime · ','current')].sort()",{...context});
  assert.deepEqual(Array.from(ids),[
    'bug-defense','fantasy-survival','seed-puzzle-chromatic-cascade','survival'
  ]);
  const unscoped=vm.runInNewContext(scan+"\n[...activeIds('fixture','Roblox runtime · ')].sort()",{...context});
  assert.deepEqual(Array.from(unscoped),[
    'bug-defense','fantasy-survival','seed-puzzle-chromatic-cascade','survival','survival2'
  ]);
  assert.match(workflow,/const activeRoblox=activeIds\('/);
  assert.doesNotMatch(workflow,/const activeRoblox=activeIds\([^\n]*currentControlSha\)/);
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

test('Roblox coordinator and source planner exclude permanently removed games',()=>{
  const coordinator=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.ok(policy.permanentProjectRemoval.ids.includes('ant-simulator'));
  assert.ok(policy.permanentProjectRemoval.ids.includes('crystal-defense'));
  assert.match(coordinator,/!permanentlyRemovedGameIds\.has\(item\.gameId\)/);
  assert.match(coordinator,/DEVELOPMENT_PERMANENT_REMOVED_GAME_IDS=/);
  assert.match(runtime,/ROBLOX_PERMANENTLY_REMOVED_GAME_SKIP=/);
  assert.match(runtime,/permanentlyRemovedGameIds\.has\(item\.gameId\)/);
  assert.ok(runtime.indexOf('ROBLOX_PERMANENTLY_REMOVED_GAME_SKIP=$REQUESTED_GAME_ID')<runtime.indexOf('active_payload="$(gh api'));
});

test('independent Roblox dispatcher rechecks active exact revision before submitting',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  const block=workflow.slice(workflow.indexOf('  dispatch-roblox:'),workflow.indexOf('  dispatch-unity:'));
  assert.match(block,/ROBLOX_INDEPENDENT_GAME_JIT_DEDUPED=/);
  assert.match(block,/status=\$active_status/);
  assert.match(block,/ROBLOX_DISPATCH_ACTIVE_SCAN_EXHAUSTED_FAIL_CLOSED/);
  assert.doesNotMatch(block,/head_sha=\$current_main/);
  assert.match(block,/group: native-roblox-ready-ingress-/);
  assert.match(block,/dispatch_index % 12/);
  assert.match(block,/\.status == "in_progress"/);
  assert.ok(block.indexOf('active_count="$(jq')<block.indexOf('gh workflow run company-development-roblox-runtime.yml'));
  assert.match(block,/ROBLOX_PARENT_WAITS_FOR_GAME_COMPLETION=NO/);
  assert.doesNotMatch(block,/cancel-in-progress: true/);
});

test('source-plan dedupe favors a waiting owner instead of indefinitely cancelling old plans',()=>{
  const director=fs.readFileSync('.github/workflows/director-supervisor.yml','utf8');
  assert.match(director,/dedupeByTitle\('\.github\/workflows\/company-development-roblox-runtime\.yml',false\)/);
  assert.match(director,/Never cancel active same-title work|Never cancel an active job/);
  const development=fs.readFileSync('.github/workflows/company-development-confirmed-runtime.yml','utf8');
  assert.match(development,/NATIVE_ROBLOX_ACTIVE_RUN_SCAN_MODE=ALL_UNFINISHED_ANY_HEAD/);
  assert.match(development,/NATIVE_ROBLOX_ACTIVE_SCAN_EXHAUSTED_FAIL_CLOSED/);
  assert.match(development,/queue: single/);
  assert.match(development,/cancel-in-progress: false/);
});

test('owner Web edits preserve independent native floor cycles without dispatching unrelated games',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-owner-web-edit-propagation.yml','utf8');
  assert.match(workflow,/WEB_EDIT_ROBLOX_DISPATCH=DENIED/);
  assert.match(workflow,/WEB_EDIT_UNITY_DISPATCH=DENIED/);
  assert.doesNotMatch(workflow,/gh workflow run|development-queue\.json/);
});

test('owner Web audit observes exact source changes without mutating native policy or runtime state',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-owner-web-edit-propagation.yml','utf8');
  assert.match(workflow,/contents: read/);
  assert.match(workflow,/WEB_CHANGED_CONTENT_SHA256_BEGIN/);
  assert.match(workflow,/WEB_EDIT_NATIVE_QUEUE_MUTATION=DENIED/);
  assert.doesNotMatch(workflow,/contents: write|actions: write|git push|git checkout -B owner-web-edit-runtime/);
});



test('superseded exact-game Roblox plan reuses a live current-main run without touching other games or completed evidence',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const marker=workflow.indexOf('ROBLOX_BATCH_CONTRACT_SUPERSEDED=$GITHUB_SHA:$current_main');
  const end=workflow.indexOf('      - name: Bind Roblox source-plan contract fingerprint',marker);
  const block=workflow.slice(marker,end);
  assert.ok(marker>0&&end>marker);
  assert.ok(block.includes('runs?head_sha=$current_main&per_page=100'));
  assert.match(block,/ROBLOX_EXACT_CONTRACT_DEDUPE_INCOMPLETE_FAIL_CLOSED/);
  assert.match(block,/ROBLOX_EXACT_CONTRACT_SUPERSEDED_DEDUPE=UNKNOWN_FAIL_CLOSED/);
  assert.match(block,/DEDUPED_CURRENT_MAIN_GAME:/);
  assert.match(block,/const title='Roblox runtime · '/);
  assert.ok(block.includes("String(run.head_sha||'')===head"));
  const probe=block.indexOf('active_same_game="$(REQUESTED_GAME_ID=');
  const dispatch=block.indexOf('gh workflow run company-development-roblox-runtime.yml --repo "$GITHUB_REPOSITORY" --ref main -f game_id="$REQUESTED_GAME_ID"');
  assert.ok(probe>=0&&dispatch>probe);
  // Execute the workflow's exact inline decision with a synthetic GitHub API
  // result so a different game, old SHA, completed run or missing page cannot masquerade as a current owner.
  const code=block.split("node <<'NODE'"+String.fromCharCode(10))[1]?.split(String.fromCharCode(10)+'          NODE')[0];
  assert.ok(code,'exact inline node probe must exist');
  const current='b'.repeat(40),other='a'.repeat(40);
  const game='cozy-island';
  const evaluate=(runs,total_count=runs.length)=>{
    let output='';
    const fsMock={readFileSync:()=>JSON.stringify({workflow_runs:runs,total_count})};
    const processMock={env:{REQUESTED_GAME_ID:game,TARGET_SHA:current,CURRENT_RUN_ID:'999'},stdout:{write:x=>output+=x}};
    vm.runInNewContext(code,{require:()=>fsMock,process:processMock});
    return output;
  };
  const base={id:998,status:'queued',display_title:'Roblox runtime · '+game,head_sha:current};
  assert.equal(evaluate([base]),'yes');
  assert.equal(evaluate([{...base,head_sha:other}]),'no');
  assert.equal(evaluate([{...base,display_title:'Roblox runtime · insect-survival'}]),'no');
  assert.equal(evaluate([{...base,status:'completed'}]),'no');
  assert.equal(evaluate([{...base,id:999}]),'no');
  assert.throws(()=>evaluate([base],2),/INCOMPLETE_FAIL_CLOSED/);
});
