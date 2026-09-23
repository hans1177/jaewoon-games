// 파일명: qa/vibe2-exploration-worker.test.mjs
// 역할: 읽기 전용 탐색 worker, 성능 sanity worker, 긴 package 보호 슬롯, 역할 분리와 fan-in review 계약을 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { exploreVibe2WorkOrder, explorationGuidance } from '../tools/vibe2-exploration-worker.mjs';
import { verifyPerformanceSanity } from '../tools/vibe2-performance-sanity.mjs';
import { finalizeVibe2FanInReview } from '../tools/vibe2-fan-in-review.mjs';
import { createVibeContinuousQueue, selectVibeQueueBatch, beginVibeQueueBatch, finishVibeQueueTask } from '../assets/vibe-continuous-queue.js';
import { buildWorkPackage } from '../tools/vibe2-work-package.mjs';

const tempRoot=()=>fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-explore-'));
const write=(file,content)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content,'utf8');};
const runtime=JSON.parse(fs.readFileSync(new URL('../vibe2-runtime.json',import.meta.url),'utf8'));
const workflow=fs.readFileSync(new URL('../.github/workflows/vibe2-continuous-core.yml',import.meta.url),'utf8');

function workOrder(){return{
  run:true,taskId:'demo-task',gameId:'demo',target:'unity',goal:'Player 이동 코드 영향 범위를 확인하고 안전하게 수정',
  source:{root:'unity-games/demo',responsibleFiles:['unity-games/demo/Assets/Player.cs'],ignoredPaths:[]},
  workPackage:{id:'demo-wp',sharedContext:{diagnosticEvidence:['diagnostic:PLAYER_MOVE']}}
};}

test('exploration worker collects reusable impact context without changing source',()=>{
  const cwd=tempRoot();
  const player=path.join(cwd,'unity-games/demo/Assets/Player.cs');
  const helper=path.join(cwd,'unity-games/demo/Assets/PlayerHelper.cs');
  write(player,'class Player { int Speed() { return 1; } }\n');
  write(helper,'// Player.cs dependency\nclass PlayerHelper {}\n');
  const before=fs.readFileSync(player,'utf8');
  const result=exploreVibe2WorkOrder({cwd,order:workOrder()});
  assert.equal(result.role,'exploration');
  assert.equal(result.sourceWrite,false);
  assert.equal(result.reused,false);
  assert.ok(result.reuseKey.length>=16);
  assert.ok(result.impactFiles.includes('Assets/Player.cs'));
  assert.ok(result.contextFiles.includes('Assets/PlayerHelper.cs'));
  assert.deepEqual(result.diagnosticEvidence,['diagnostic:PLAYER_MOVE']);
  assert.equal(fs.readFileSync(player,'utf8'),before);
});

test('missing source root stays blocked unless explicit Web bootstrap authority is present',()=>{
  const cwd=tempRoot();
  const blocked=workOrder();
  blocked.target='web';
  blocked.gameId='missing-web';
  blocked.source={root:'web-games/missing-web',responsibleFiles:['web-games/missing-web/index.html'],ignoredPaths:[]};
  assert.throws(()=>exploreVibe2WorkOrder({cwd,order:blocked}),/exploration source root 없음/);

  const allowed=structuredClone(blocked);
  allowed.taskId='missing-web-bootstrap';
  allowed.goal='FULL_WEB_GAME_REBUILD SOURCE_ROOT_BOOTSTRAP_ALLOWED';
  allowed.selectedTask={evidence:['source-root-bootstrap-required']};
  allowed.workerPolicy={sourceRootBootstrapAllowed:true};
  const result=exploreVibe2WorkOrder({cwd,order:allowed});
  assert.equal(result.bootstrap,true);
  assert.equal(result.sourceWrite,false);
  assert.equal(result.existingWebAssessment.strategy,'FULL_REBUILD');
  assert.deepEqual(result.responsibleFiles,['index.html']);
  assert.equal(fs.existsSync(path.join(cwd,'web-games/missing-web')),false);
});

test('precomputed exploration artifact is reused instead of rescanning',()=>{
  const cwd=tempRoot();
  write(path.join(cwd,'unity-games/demo/Assets/Player.cs'),'class Player {}\n');
  const first=exploreVibe2WorkOrder({cwd,order:workOrder()});
  const handoff=path.join(cwd,'.vibe2/exploration.json');
  write(handoff,JSON.stringify(first,null,2));
  const old=process.env.VIBE2_EXPLORATION_FILE;
  process.env.VIBE2_EXPLORATION_FILE='.vibe2/exploration.json';
  try{
    const reused=exploreVibe2WorkOrder({cwd,order:workOrder()});
    assert.equal(reused.reused,true);
    assert.equal(reused.reuseKey,first.reuseKey);
    assert.equal(reused.reusedFrom,'.vibe2/exploration.json');
  }finally{
    if(old===undefined)delete process.env.VIBE2_EXPLORATION_FILE;else process.env.VIBE2_EXPLORATION_FILE=old;
  }
});

test('existing Web exploration emits a preservation strategy before implementation',()=>{
  const cwd=tempRoot();
  const web=path.join(cwd,'web-games/demo/index.html');
  const designRoot=path.join(cwd,'design/demo/2026-09-18');
  write(web,`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body><canvas></canvas><script>
  let hp=10,wave=2,gold=30,playerX=1,playerY=1,enemy={hp:3};
  addEventListener('touchstart',()=>{enemy.hp-=1}); function update(){requestAnimationFrame(update)}update();
  function restart(){wave=1} const victory='victory',defeat='defeat'; localStorage.setItem('save','1'); new AudioContext();
  </script></body></html>`);
  write(path.join(designRoot,'design-revised.json'),JSON.stringify({content:{coreFun:'위치를 선택해 방어 유닛을 배치하고 적의 경로를 막는다',coreLoop:['위치 선택','유닛 배치','적 이동과 전투','보상으로 강화']}},null,2));
  write(path.join(designRoot,'cycle-status.json'),JSON.stringify({baselineGate:{state:'DESIGN_BASELINE_READY',ready:true}},null,2));
  const before=fs.readFileSync(web,'utf8');
  const order={
    run:true,taskId:'web-assess',gameId:'demo',target:'web',goal:'[EXISTING_WEB_ASSESS_AND_IMPLEMENT]',
    source:{root:'web-games/demo',responsibleFiles:['web-games/demo/index.html'],ignoredPaths:[]},
    selectedTask:{evidence:['web-strict-score:84']},evidence:['web-strict-score:84'],
    workPackage:{id:'web-wp',sharedContext:{diagnosticEvidence:[]}}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.sourceWrite,false);
  assert.equal(result.existingWebAssessment.strategy,'PARTIAL_REPAIR');
  assert.equal(result.existingWebAssessment.fullRewriteAllowed,false);
  assert.equal(result.existingWebAssessment.evidence.validationScore,84);
  assert.ok(result.existingWebAssessment.reasons.includes('CURRENT_APPROVED_SCOPE_GAPS_REMAIN'));
  assert.equal(fs.readFileSync(web,'utf8'),before);
});

test('exploration compiles responsibility graph coding architecture and semantic edit contract for source worker',()=>{
  const cwd=tempRoot();
  const web=path.join(cwd,'web-games/contract-demo/index.html');
  write(web,'<!doctype html><html><body><canvas id="game"></canvas><script>\n'+
    'let selectedSlot=null, placedEntities=[], gold=100;\n'+
    'function saveGame(){ localStorage.setItem("contract-demo-save",JSON.stringify({gold,placedEntities})); }\n'+
    'function renderPlacement(){ document.body.dataset.placed=String(placedEntities.length); }\n'+
    'function placeTower(slot){ if(!slot||gold<10)return false; gold-=10; placedEntities.push({slot}); saveGame(); renderPlacement(); return true; }\n'+
    'function handlePointer(event){ selectedSlot={x:event.clientX,y:event.clientY}; return placeTower(selectedSlot); }\n'+
    'addEventListener("pointerdown",handlePointer);\n'+
    '</script></body></html>');
  const order={
    run:true,taskId:'contract-task',gameId:'contract-demo',target:'web',
    originalGoal:'모바일 pointer 입력으로 위치를 선택해 tower placement가 실제 world state에 반영되도록 고친다',
    goal:'모바일 pointer placement input failure를 수정한다',
    source:{root:'web-games/contract-demo',responsibleFiles:['web-games/contract-demo/index.html'],ignoredPaths:[]},
    selectedTask:{evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'},
    workPackage:{id:'contract-wp',sharedContext:{diagnosticEvidence:['MOBILE_PLACEMENT_INPUT_MISSING']}},
    unifiedLearning:{failureFingerprint:'web|MOBILE_PLACEMENT_INPUT_MISSING|MOBILE_INPUT|PLACEMENT',failureLocalMemory:[
      {id:'verified-local',verified:true,reusable:true,failureCause:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING',reusablePatterns:['trace pointer input to placement state'],avoidPatterns:['do not rewrite economy']},
      {id:'unverified-local',verified:false,reusable:true,failureCause:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING',reusablePatterns:['unsafe guess'],avoidPatterns:[]}
    ]}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.editContract.mode,'COMPILED_EDIT_CONTRACT');
  assert.equal(result.editContract.strategyHint,'CAUSAL_TRACE_FIRST');
  assert.ok(result.editContract.primaryTargets.length>=1);
  assert.ok(result.editContract.responsibilityGraph.nodeCount>=4);
  assert.deepEqual(result.editContract.allowedResponsibleFiles,['index.html']);
  assert.ok(result.editContract.preserveSemantics.includes('SAVE_KEY:contract-demo-save'));
  assert.equal(result.editContract.semanticDiffBudget.unrelatedSystemMutationForbidden,true);
  assert.equal(result.editContract.semanticDiffBudget.impactPredictionDoesNotGrantWriteAuthority,true);
  for(const system of result.editContract.readOnlyImpactSystems||[]) {
    if(!(result.editContract.primarySystems||[]).includes(system) && !(result.editContract.directDependentSystems||[]).includes(system)) {
      assert.equal((result.editContract.semanticDiffBudget.allowedSystems||[]).includes(system),false);
    }
  }
  assert.equal(result.editContract.patchRecipe.mode,'VERIFIED_FAILURE_LOCAL_RECIPE');
  assert.equal(result.editContract.patchRecipe.verifiedMemoryCount,1);
  assert.deepEqual(result.editContract.patchRecipe.verifiedMemoryIds,['verified-local']);
  assert.ok(result.editContract.patchRecipe.reusePatterns.includes('trace pointer input to placement state'));
  assert.equal(result.editContract.patchRecipe.reusePatterns.includes('unsafe guess'),false);
  assert.equal(result.editContract.patchRecipe.scopeExpansionAllowed,false);
  assert.equal(result.editContract.patchRecipe.qaBypassAllowed,false);
  assert.ok(result.editContract.codingArchitecture.invariantIds.includes('INPUT_TO_STATE_CAUSALITY'));
  assert.equal(result.editContract.writableScopeExpansionAllowed,false);
  const guidance=explorationGuidance(result);
  assert.ok(guidance.includes('[COMPILED EDIT CONTRACT]'));
  assert.ok(guidance.includes('주 책임 심볼='));
  assert.ok(guidance.includes('Semantic diff 허용 시스템='));
  assert.ok(guidance.includes('[PATCH RECIPE] mode=VERIFIED_FAILURE_LOCAL_RECIPE'));
  assert.ok(guidance.includes('verified reuse=trace pointer input to placement state'));
});

test('exploration downgrades repeated overconfident responsibility and adds matched hotspot focused QA without widening scope',()=>{
  const cwd=tempRoot();
  const web=path.join(cwd,'web-games/hot-demo/index.html');
  write(web,'<!doctype html><html><body><script>\n'+
    'let pointerState=null, placedEntities=[];\n'+
    'function renderPlacement(){ document.body.dataset.count=String(placedEntities.length); }\n'+
    'function placeTower(slot){ placedEntities.push(slot); renderPlacement(); return true; }\n'+
    'function handlePointer(event){ pointerState={x:event.clientX,y:event.clientY}; return placeTower(pointerState); }\n'+
    'addEventListener("pointerdown",handlePointer);\n'+
    '</script></body></html>');
  const base={
    run:true,taskId:'hot-base',gameId:'hot-demo',target:'web',
    originalGoal:'pointer 입력을 placement state와 연결한다',goal:'runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING 수정',
    source:{root:'web-games/hot-demo',responsibleFiles:['web-games/hot-demo/index.html'],ignoredPaths:[]},
    selectedTask:{evidence:['runtime-failure:MOBILE_PLACEMENT_INPUT_MISSING'],lastOutcome:'FAIL'},
    workPackage:{id:'hot-wp',sharedContext:{diagnosticEvidence:['MOBILE_PLACEMENT_INPUT_MISSING']}}
  };
  const first=exploreVibe2WorkOrder({cwd,order:base});
  assert.equal(first.editContract.responsibilityConfidence,'HIGH');
  const symbol=first.editContract.primaryTargets[0];
  const system=first.editContract.primarySystems[0];
  const calibrated={...base,taskId:'hot-calibrated',responsibilityCalibration:{recommendation:'DOWNGRADE_HIGH_TO_MEDIUM',extraReadOnlyExploration:true},regressionHotspotRisk:{riskLevel:'HIGH',entries:[
    {gameId:'hot-demo',kind:'SYMBOL',name:symbol,verifiedRegressionFailures:3,verifiedPasses:0},
    ...(system?[{gameId:'hot-demo',kind:'SYSTEM',name:system,verifiedRegressionFailures:3,verifiedPasses:0}]:[])
  ]}};
  const result=exploreVibe2WorkOrder({cwd,order:calibrated});
  assert.equal(result.editContract.rawResponsibilityConfidence,'HIGH');
  assert.equal(result.editContract.responsibilityConfidence,'MEDIUM');
  assert.equal(result.editContract.responsibilityCalibration.applied,true);
  assert.equal(result.editContract.responsibilityCalibration.extraReadOnlyExploration,true);
  assert.ok(result.editContract.regressionHotspotRisk.matched.some(row=>row.kind==='SYMBOL'&&row.name===symbol));
  assert.ok(result.editContract.requiredFocusedChecks.some(check=>check==='HOTSPOT_RECHECK:SYMBOL:'+symbol));
  assert.equal(result.editContract.writableScopeExpansionAllowed,false);
});
test('causal replay remains plan-only without verified prepatch reproduction even when a test target exists',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'web-games/replay-demo');
  write(path.join(root,'index.js'),'export function placeTower(slot){ return Boolean(slot); }\n');
  write(path.join(root,'qa/placement.test.mjs'),"import test from 'node:test'; test('placement',()=>{});\n");
  const order={
    run:true,taskId:'replay-plan-only',gameId:'replay-demo',target:'web',goal:'runtime-failure:PLACEMENT_BROKEN 수정',
    source:{root:'web-games/replay-demo',responsibleFiles:['web-games/replay-demo/index.js'],ignoredPaths:[]},
    selectedTask:{evidence:['runtime-failure:PLACEMENT_BROKEN'],lastOutcome:'FAIL'},
    workPackage:{id:'replay-wp',sharedContext:{diagnosticEvidence:['runtime-failure:PLACEMENT_BROKEN']}}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.editContract.causalReplay.required,true);
  assert.equal(result.editContract.causalReplay.prePatchReproduced,false);
  assert.equal(result.editContract.causalReplay.executable,false);
  assert.equal(result.editContract.causalReplay.mode,'PLAN_ONLY');
  assert.equal(result.editContract.causalReplay.status,'NO_VERIFIED_PREPATCH_REPRODUCTION');
});

test('causal replay becomes executable only with explicit prepatch reproduction evidence and supported test target',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'web-games/replay-ready');
  write(path.join(root,'index.js'),'export function placeTower(slot){ return Boolean(slot); }\n');
  write(path.join(root,'qa/placement.test.mjs'),"import test from 'node:test'; test('placement',()=>{});\n");
  const order={
    run:true,taskId:'replay-ready',gameId:'replay-ready',target:'web',goal:'runtime-failure:PLACEMENT_BROKEN 수정',
    source:{root:'web-games/replay-ready',responsibleFiles:['web-games/replay-ready/index.js'],ignoredPaths:[]},
    selectedTask:{evidence:['runtime-failure:PLACEMENT_BROKEN','causal-replay-prepatch:FAIL_REPRODUCED'],lastOutcome:'FAIL'},
    workPackage:{id:'replay-ready-wp',sharedContext:{diagnosticEvidence:['runtime-failure:PLACEMENT_BROKEN','causal-replay-prepatch:FAIL_REPRODUCED']}}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.editContract.causalReplay.prePatchReproduced,true);
  assert.equal(result.editContract.causalReplay.executable,true);
  assert.equal(result.editContract.causalReplay.mode,'NODE_TEST_TARGETS');
  assert.ok(result.editContract.causalReplay.nodeTestTargets.includes('qa/placement.test.mjs'));
  assert.ok(result.editContract.requiredFocusedChecks.includes('CAUSAL_REPLAY_POSTPATCH_REQUIRED'));
  assert.equal(result.editContract.causalReplay.canonicalQaStillRequired,true);
});
test('exploration compiles autonomous multiplayer game repair contract and root-cause escalation',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'web-games/multi-repair');
  write(path.join(root,'index.js'),[
    'const players=new Map();',
    'function serverAuthoritativeSync(id,state){ players.set(id,state); return players.size; }',
    'function saveGame(){ localStorage.setItem("multi-save","1"); }'
  ].join('\n')+'\n');
  write(path.join(root,'qa/network-sync.test.mjs'),"import test from 'node:test'; test('two clients sync',()=>{});\n");
  const order={
    run:true,taskId:'multi-repair',gameId:'multi-repair',target:'web',
    goal:'multiplayer network sync join rejoin 오류를 자동으로 수정한다',
    source:{root:'web-games/multi-repair',responsibleFiles:['web-games/multi-repair/index.js'],ignoredPaths:[]},
    selectedTask:{evidence:['runtime-failure:MULTIPLAYER_SYNC','causal-replay-prepatch:FAIL_REPRODUCED'],lastOutcome:'FAIL',recurrenceCount:3,failureStage:'WEB_RUNTIME',failureSignature:'MULTIPLAYER_SYNC'},
    workPackage:{id:'multi-repair-wp',sharedContext:{diagnosticEvidence:['runtime-failure:MULTIPLAYER_SYNC','causal-replay-prepatch:FAIL_REPRODUCED'],gameRepair:{repeatCount:3,lastKnownGoodRevision:'good-sha',firstBrokenRevision:'bad-sha',currentRevision:'current-sha'}}}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.editContract.gameRepair.required,true);
  assert.equal(result.editContract.gameRepair.repairMode,'ROOT_CAUSE_MODE');
  assert.equal(result.editContract.gameRepair.saveMigration.required,true);
  assert.equal(result.editContract.gameRepair.multiplayerLifecycle.required,true);
  assert.equal(result.editContract.gameRepair.multiplayerLifecycle.userAssistanceRequired,false);
  assert.equal(result.editContract.gameRepair.multiplayerLifecycle.minimumPlayers,2);
  assert.equal(result.editContract.gameRepair.multiplayerLifecycle.automation.required,true);
  assert.equal(result.editContract.gameRepair.multiplayerLifecycle.automation.minimumSyntheticOrRealClients,2);
  assert.equal(result.editContract.gameRepair.revisions.lastKnownGoodRevision,'good-sha');
  assert.equal(result.editContract.gameRepair.revisions.firstBrokenRevision,'bad-sha');
  assert.equal(result.editContract.gameRepair.revisions.currentRevision,'current-sha');
  assert.ok(result.editContract.requiredFocusedChecks.includes('GAME_REPAIR_AUTONOMOUS_MULTI_CLIENT_LIFECYCLE_VALIDATION'));
});

test('performance sanity is read only, requires exploration evidence, and budgets candidate growth',()=>{
  const cwd=tempRoot();
  const player=path.join(cwd,'unity-games/demo/Assets/Player.cs');
  write(player,'a'.repeat(882000));
  execFileSync('git',['init','-q'],{cwd});
  execFileSync('git',['config','user.email','vibe2-test@example.invalid'],{cwd});
  execFileSync('git',['config','user.name','Vibe2 Test'],{cwd});
  execFileSync('git',['add','.'],{cwd});
  execFileSync('git',['commit','-qm','baseline'],{cwd});
  const baseMainSha=String(execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'})).trim();
  const manifest={sourceRoot:'unity-games/demo',changedFiles:['Assets/Player.cs'],baseMainSha,exploration:{reuseKey:'reuse-1',sourceWrite:false}};

  fs.appendFileSync(player,'b'.repeat(50000),'utf8');
  const pass=verifyPerformanceSanity({root:cwd,manifest});
  assert.equal(pass.pass,true);
  assert.equal(pass.role,'performance');
  assert.equal(pass.sourceWrite,false);
  assert.equal(pass.fileGrowth[0].baseBytes,882000);
  assert.equal(pass.fileGrowth[0].growthBytes,50000);
  assert.ok(pass.checks.some(row=>row.name==='single-file-growth-budget'&&row.pass));

  const fail=verifyPerformanceSanity({root:cwd,manifest:{...manifest,exploration:null}});
  assert.equal(fail.pass,false);
  assert.ok(fail.checks.some(row=>row.name==='exploration-handoff-present'&&!row.pass));

  fs.appendFileSync(player,'c'.repeat(260001),'utf8');
  const oversizedGrowth=verifyPerformanceSanity({root:cwd,manifest});
  assert.equal(oversizedGrowth.pass,false);
  assert.equal(oversizedGrowth.fileGrowth[0].growthBytes,310001);
  assert.ok(oversizedGrowth.checks.some(row=>row.name==='single-file-growth-budget'&&!row.pass));
});

test('long functional package owner gets the protected slot before short work',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'short-critical',gameId:'short',target:'web',goal:'short',sourceRoot:'web-games/short',responsibleFiles:['a.js'],status:'queued',priority:'critical',releaseState:'development-confirmed',packageId:'short-wp',packageRole:'implementation-owner',packageWorkUnits:1},
    {id:'long-owner',gameId:'long',target:'web',goal:'long',sourceRoot:'web-games/long',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'long-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true}
  ]});
  const selected=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selected.selected[0].id,'long-owner');
  assert.equal(selected.longWorkProtectedSlotUsed,true);
  assert.equal(selected.longWorkOwnerTaskId,'long-owner');
});

test('protected slot skips a conflicting long owner and selects the next eligible long owner',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'active-qa',gameId:'conflict',target:'web',goal:'qa wait',sourceRoot:'web-games/conflict',responsibleFiles:['a.js'],status:'running',blocker:'candidate-awaiting-qa-and-deployment'},
    {id:'long-conflict',gameId:'conflict',target:'web',goal:'blocked long',sourceRoot:'web-games/conflict',responsibleFiles:['a.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'long-conflict-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'long-eligible',gameId:'eligible',target:'web',goal:'eligible long',sourceRoot:'web-games/eligible',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'long-eligible-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'short-critical',gameId:'short',target:'web',goal:'short',sourceRoot:'web-games/short',responsibleFiles:['c.js'],status:'queued',priority:'critical',releaseState:'development-confirmed',packageId:'short-wp',packageRole:'implementation-owner',packageWorkUnits:1}
  ]});
  const selected=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selected.selected[0].id,'long-eligible');
  assert.equal(selected.longWorkProtectedSlotUsed,true);
  assert.equal(selected.longWorkOwnerTaskId,'long-eligible');
  assert.equal(selected.deferredConflicts.filter(row=>row.task.id==='long-conflict').length,1);
});

test('released QA waiting long owner does not keep the protected worker slot occupied',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'long-awaiting-qa',gameId:'old',target:'web',goal:'old long',sourceRoot:'web-games/old',responsibleFiles:['a.js'],status:'running',blocker:'candidate-awaiting-qa-and-deployment',packageId:'old-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'long-next',gameId:'next',target:'web',goal:'next long',sourceRoot:'web-games/next',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'next-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'short-critical',gameId:'short',target:'web',goal:'short',sourceRoot:'web-games/short',responsibleFiles:['c.js'],status:'queued',priority:'critical',releaseState:'development-confirmed',packageId:'short-wp',packageRole:'implementation-owner',packageWorkUnits:1}
  ]});
  const selected=selectVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(selected.capacityRunning.length,0);
  assert.equal(selected.selected[0].id,'long-next');
  assert.equal(selected.longWorkProtectedSlotUsed,true);
  assert.equal(selected.longWorkOwnerTaskId,'long-next');
});

test('scheduler flow starts eligible long work, keeps conflicts, and dispatches next work after finish',()=>{
  const queue=createVibeContinuousQueue({maxConcurrentTasks:1,tasks:[
    {id:'active-qa',gameId:'conflict',target:'web',goal:'qa wait',sourceRoot:'web-games/conflict',responsibleFiles:['a.js'],status:'running',blocker:'candidate-awaiting-qa-and-deployment',packageId:'old-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'long-conflict',gameId:'conflict',target:'web',goal:'blocked long',sourceRoot:'web-games/conflict',responsibleFiles:['a.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'long-conflict-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'long-safe',gameId:'safe',target:'web',goal:'safe long',sourceRoot:'web-games/safe',responsibleFiles:['b.js'],status:'queued',priority:'normal',releaseState:'development-confirmed',packageId:'long-safe-wp',packageRole:'implementation-owner',packageWorkUnits:6,packageLongWorkProtected:true},
    {id:'short-critical',gameId:'short',target:'web',goal:'short',sourceRoot:'web-games/short',responsibleFiles:['c.js'],status:'queued',priority:'critical',releaseState:'development-confirmed',packageId:'short-wp',packageRole:'implementation-owner',packageWorkUnits:1}
  ]});
  const started=beginVibeQueueBatch(queue,{maxConcurrentTasks:1});
  assert.equal(started.started,true);
  assert.deepEqual(started.tasks.map(task=>task.id),['long-safe']);
  assert.equal(started.selection.longWorkProtectedSlotUsed,true);
  assert.equal(started.selection.longWorkOwnerTaskId,'long-safe');
  assert.equal(started.selection.deferredConflicts.filter(row=>row.task.id==='long-conflict').length,1);

  const finished=finishVibeQueueTask(started.queue,{taskId:'long-safe',outcome:'PASS'});
  assert.equal(finished.updated,true);
  assert.equal(finished.queue.tasks.find(task=>task.id==='long-safe').status,'verified');
  assert.equal(finished.next.selected[0].id,'short-critical');
  assert.equal(finished.dispatchNext,true);
  assert.ok(finished.next.deferredConflicts.some(row=>row.task.id==='long-conflict'));
});

test('work package declares separate read only verification roles and keeps implementation write ownership',()=>{
  const pkg=buildWorkPackage({
    project:{gameId:'demo',name:'Demo',projectPath:'web-games/demo'},
    tasks:[{id:'feature',gameId:'demo',target:'web',sourceRoot:'web-games/demo',goal:'feature',responsibleFiles:['web-games/demo/index.js'],taskWorkUnits:5,evidence:[]}]
  });
  assert.equal(pkg.accepted,true);
  assert.equal(pkg.tasks[0].packageRole,'implementation-owner');
  assert.equal(pkg.packageContext.roles.exploration,'read-only-exploration-worker');
  assert.equal(pkg.packageContext.roles.performance,'performance-sanity-worker');
  assert.equal(pkg.packageContext.roles.regression,'single-fan-in-regression-worker');
  assert.equal(pkg.packageContext.roles.review,'fan-in-package-review-worker');
  assert.ok(pkg.completionCriteria.includes('exploration-handoff-produced-and-reused'));
  assert.ok(pkg.completionCriteria.includes('performance-sanity-pass'));
  assert.ok(pkg.completionCriteria.includes('fan-in-package-review-pass'));
});

test('fan in review passes only after exploration implementation test and performance roles passed',()=>{
  const complete={
    version:5,maxConcurrentTasks:20,tasks:[{
      id:'ready',gameId:'demo',target:'web',goal:'ready',status:'running',blocker:'candidate-awaiting-qa-and-deployment',sourceRoot:'web-games/demo',responsibleFiles:['index.js'],
      evidence:['role-result:exploration:PASS','role-result:implementation:PASS','role-result:test:PASS','role-result:performance:PASS','vibe2/candidate/ready-primary-run']
    }]
  };
  const readyResult={
    version:6,
    taskId:'ready',
    outcome:'PASS',
    candidateBranch:'vibe2/candidate/ready-primary-run',
    baseMainSha:'abc123',
    candidateIdentity:{taskId:'ready',gameId:'demo',target:'web',sourceRoot:'web-games/demo',baseMainSha:'abc123'}
  };
  const pass=finalizeVibe2FanInReview({queue:complete,results:[readyResult],taskIds:['ready']});
  assert.equal(pass.pass,true);
  assert.ok(pass.queue.tasks[0].evidence.includes('role-result:regression:PASS'));
  assert.ok(pass.queue.tasks[0].evidence.includes('role-result:review:PASS'));
  assert.equal(pass.releaseCandidates.length,1);
  assert.equal(pass.releaseCandidates[0].candidateBranch,'vibe2/candidate/ready-primary-run');

  const missing=structuredClone(complete);
  missing.tasks[0].id='missing';
  missing.tasks[0].evidence=missing.tasks[0].evidence.filter(x=>x!=='role-result:performance:PASS');
  const missingResult={...readyResult,taskId:'missing',candidateIdentity:{...readyResult.candidateIdentity,taskId:'missing'}};
  const blocked=finalizeVibe2FanInReview({queue:missing,results:[missingResult],taskIds:['missing']});
  assert.equal(blocked.pass,false);
  assert.ok(blocked.queue.tasks[0].evidence.includes('role-result:review:BLOCKED'));
  assert.ok(blocked.queue.tasks[0].evidence.includes('package-review-missing:performance'));
});

test('fan in blocks unverified game repair and accepts autonomous multiplayer evidence',()=>{
  const baseTask={
    gameId:'demo',target:'web',goal:'repair',status:'running',blocker:'candidate-awaiting-qa-and-deployment',
    sourceRoot:'web-games/demo',responsibleFiles:['index.js'],
    evidence:['role-result:exploration:PASS','role-result:implementation:PASS','role-result:test:PASS','role-result:performance:PASS']
  };
  const blockedQueue={version:5,maxConcurrentTasks:20,tasks:[{...baseTask,id:'repair-blocked',evidence:[...baseTask.evidence,'vibe2/candidate/repair-blocked-primary-run']}]};
  const blockedResult={
    version:15,taskId:'repair-blocked',outcome:'PASS',candidateBranch:'vibe2/candidate/repair-blocked-primary-run',baseMainSha:'abc123',
    candidateIdentity:{taskId:'repair-blocked',gameId:'demo',target:'web',sourceRoot:'web-games/demo',baseMainSha:'abc123'},
    gameRepairQa:{
      required:true,prePatchReproduced:true,responsibleSystem:'NETWORK_SYNC',originalScenarioReplay:'PASS',
      invariants:'PASS',saveMigration:'NOT_APPLICABLE',multiplayerLifecycle:'PENDING_AUTONOMOUS_HARNESS_EVIDENCE',
      multiplayerAutomation:{userAssistanceRequired:false},readyForFanIn:false
    }
  };
  const blocked=finalizeVibe2FanInReview({queue:blockedQueue,results:[blockedResult],taskIds:['repair-blocked']});
  assert.equal(blocked.pass,false);
  assert.ok(blocked.reviewed[0].missing.includes('game-repair-multiplayer-lifecycle'));
  assert.equal(blocked.releaseCandidates.length,0);

  const passQueue={version:5,maxConcurrentTasks:20,tasks:[{...baseTask,id:'repair-pass',evidence:[...baseTask.evidence,'vibe2/candidate/repair-pass-primary-run']}]};
  const passResult={
    ...blockedResult,taskId:'repair-pass',candidateBranch:'vibe2/candidate/repair-pass-primary-run',
    candidateIdentity:{...blockedResult.candidateIdentity,taskId:'repair-pass'},
    gameRepairQa:{
      ...blockedResult.gameRepairQa,multiplayerLifecycle:'PASS_AUTOMATED_HARNESS',
      multiplayerAutomation:{userAssistanceRequired:false,minimumSyntheticOrRealClients:2},readyForFanIn:true
    }
  };
  const pass=finalizeVibe2FanInReview({queue:passQueue,results:[passResult],taskIds:['repair-pass']});
  assert.equal(pass.pass,true);
  assert.equal(pass.releaseCandidates.length,1);
  assert.ok(pass.queue.tasks[0].evidence.includes('game-repair-source-evidence:PASS'));
  assert.ok(pass.queue.tasks[0].evidence.includes('game-repair-user-assistance-required:NO'));
});

test('fan in review skips retrying failures instead of blocking queue persistence',()=>{
  const queue={version:5,maxConcurrentTasks:20,tasks:[{id:'retry',gameId:'demo',target:'web',goal:'retry',status:'queued',lastOutcome:'FAIL',retries:1,sourceRoot:'web-games/demo',evidence:['failure-cause:incremental-qa-failed']}]};
  const result=finalizeVibe2FanInReview({queue,taskIds:['retry']});
  assert.equal(result.pass,true);
  assert.equal(result.reviewed.length,0);
  assert.equal(result.skipped.length,1);
  assert.equal(result.queue.tasks[0].status,'queued');
});

test('central runtime keeps exploration reuse long slot and six separated roles enabled',()=>{
  assert.equal(runtime.workManagement.reusableWorkerContext,true);
  assert.equal(runtime.continuous.longWorkProtectedSlots,1);
  assert.equal(runtime.coordination.sameFileParallelWrite,false);
  assert.equal(runtime.coordination.sharedPreparationSinglePass,true);
  assert.equal(runtime.workers.exploration.configured,true);
  assert.equal(runtime.workers.exploration.sourceWrite,false);
  assert.equal(runtime.workers.performance.sourceWrite,false);
  assert.equal(runtime.workers.review.sourceWrite,false);
  assert.equal(runtime.workPackages.explorationMode,'task-local-exploration-handoff');
  assert.equal(runtime.workPackages.reusableMachineHandoff,true);
  for(const role of ['read-only-exploration-worker','source-write-implementation-worker','incremental-qa-worker','performance-sanity-worker','single-fan-in-regression-worker','fan-in-package-review-worker'])assert.ok(runtime.workPackages.parallelRoles.includes(role),role);
});

test('continuous workflow executes task-local exploration before implementation and review after regression',()=>{
  assert.equal(/\n  exploration:\n/.test(workflow),false);
  assert(workflow.includes('Build task-local exploration handoff'));
  assert(workflow.includes('needs: [reserve, model_cache]'));
  assert.equal(workflow.includes('needs: [reserve, model_cache, exploration]'),false);
  assert(workflow.includes('VIBE2_TASK_LOCAL_EXPLORATION=PASS'));
  assert(workflow.includes('VIBE2_EXPLORATION_FILE=.vibe2/exploration.json'));
  assert(workflow.indexOf('Build task-local exploration handoff') < workflow.indexOf('Generate isolated candidate from pinned main contract'));
  assert(workflow.includes('Run impact-first incremental QA role'));
  assert(workflow.includes("const gameRepairQa=incrementalQaReport?.gameRepairQa"));
  assert(workflow.includes('game-repair-user-assistance-required:NO'));
  assert(workflow.includes('Run read-only performance sanity role'));
  assert(workflow.includes('VIBE2_REGRESSION_ROLE=PASS'));
  assert(workflow.includes('tools/vibe2-fan-in-review.mjs'));
  assert(workflow.includes('VIBE2_REVIEW_ROLE_SOURCE_WRITE=NO'));
  assert(!workflow.includes('git push origin HEAD:main'));
});


test('exact deterministic diagnostic is reproduced prepatch and becomes diagnostic rescan replay',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'web-games/diagnostic-replay');
  write(path.join(root,'index.js'),'let timer=null; function start(){ timer=setInterval(()=>{},1000); }\n');
  const order={
    run:true,taskId:'diagnostic-replay',gameId:'diagnostic-replay',target:'web',
    goal:'반복 타이머 생명주기 문제를 수정한다',
    source:{root:'web-games/diagnostic-replay',responsibleFiles:['web-games/diagnostic-replay/index.js'],ignoredPaths:[]},
    selectedTask:{evidence:['diagnostic:INTERVAL_CLEANUP_RISK','diagnostic-key:INTERVAL_CLEANUP_RISK:index.js'],lastOutcome:'FAIL'},
    workPackage:{id:'diagnostic-replay-wp',sharedContext:{diagnosticEvidence:['diagnostic:INTERVAL_CLEANUP_RISK','diagnostic-key:INTERVAL_CLEANUP_RISK:index.js']}}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.editContract.causalReplay.required,true);
  assert.equal(result.editContract.causalReplay.prePatchReproduced,true);
  assert.equal(result.editContract.causalReplay.executable,true);
  assert.equal(result.editContract.causalReplay.mode,'DIAGNOSTIC_RESCAN');
  assert.equal(result.editContract.causalReplay.status,'READY_FOR_POSTPATCH_DIAGNOSTIC_RESCAN');
  assert.equal(result.editContract.causalReplay.diagnosticType,'INTERVAL_CLEANUP_RISK');
  assert.equal(result.editContract.causalReplay.diagnosticFile,'index.js');
  assert.equal(result.editContract.causalReplay.diagnosticLine,1);
  assert.equal(result.editContract.causalReplay.diagnosticNeedle,'setInterval(');
  assert.match(result.editContract.causalReplay.diagnosticMicroTask,/반복 타이머/);
  assert.equal(result.editContract.causalReplay.verifiedResponsibleSystem,'GAME_RUNTIME');
  assert.equal(result.editContract.causalReplay.authorityExpanded,false);
  const guidance=explorationGuidance(result);
  assert.match(guidance,/\[CAUSAL REPLAY CONTRACT\] mode=DIAGNOSTIC_RESCAN; prepatch=REPRODUCED; executable=YES/);
  assert.match(guidance,/CAUSAL DIAGNOSTIC TARGET=INTERVAL_CLEANUP_RISK:index\.js; line=1; needle=setInterval\(; verified-system=GAME_RUNTIME/);
  assert.match(guidance,/CAUSAL DIAGNOSTIC REPAIR=.*반복 타이머/);
  assert.match(guidance,/HARD IMPLEMENTATION POSTCONDITION: the first source edit must directly address the exact diagnostic target/);
  assert.match(guidance,/does not weaken or replace canonical QA/);
});

test('diagnostic evidence does not claim prepatch reproduction when exact issue is absent',()=>{
  const cwd=tempRoot();
  const root=path.join(cwd,'web-games/diagnostic-cleared');
  write(path.join(root,'index.js'),'let timer=null; function start(){ timer=setInterval(()=>{},1000); } function stop(){ clearInterval(timer); }\n');
  const order={
    run:true,taskId:'diagnostic-cleared',gameId:'diagnostic-cleared',target:'web',
    goal:'반복 타이머 생명주기 문제를 수정한다',
    source:{root:'web-games/diagnostic-cleared',responsibleFiles:['web-games/diagnostic-cleared/index.js'],ignoredPaths:[]},
    selectedTask:{evidence:['diagnostic:INTERVAL_CLEANUP_RISK','diagnostic-key:INTERVAL_CLEANUP_RISK:index.js'],lastOutcome:'FAIL'},
    workPackage:{id:'diagnostic-cleared-wp',sharedContext:{diagnosticEvidence:['diagnostic:INTERVAL_CLEANUP_RISK','diagnostic-key:INTERVAL_CLEANUP_RISK:index.js']}}
  };
  const result=exploreVibe2WorkOrder({cwd,order});
  assert.equal(result.editContract.causalReplay.prePatchReproduced,false);
  assert.equal(result.editContract.causalReplay.executable,false);
  assert.equal(result.editContract.causalReplay.mode,'PLAN_ONLY');
  assert.equal(result.editContract.causalReplay.verifiedResponsibleSystem,null);
  assert.equal(result.editContract.causalReplay.authorityExpanded,false);
});
