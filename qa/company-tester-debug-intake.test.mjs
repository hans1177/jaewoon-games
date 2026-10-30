import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ingestTesterDebug} from '../tools/company-tester-debug-intake.mjs';
import {dispatchRecovery} from '../tools/company-recovery-dispatch.mjs';

test('web development blockers become deduplicated tester debug tickets and recovery',()=>{
 const dev={items:[{gameId:'g',status:'ACTIVE',sourcePath:'web-games/g',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',vibeWebImplementationRequired:true,vibeWebRequestedStage:'WEB_BASE_IMPLEMENTATION',vibeWebImplementationReason:'LOSS_CONDITION_REQUIRED|MUSIC_RUNTIME_REQUIRED'}]};
 const r=ingestTesterDebug({developmentQueue:dev});
 assert.equal(r.tickets.tickets.length,2);
 assert.equal(r.tickets.tickets[0].gameId,'g');
 assert.ok(r.recovery.tasks.length>=2);
 assert.deepEqual(r.tickets.tickets[0].responsibleFiles,['web-games/g/index.html']);
});
test('platform runtime failure becomes high priority exact-stage ticket',()=>{
 const dev={items:[{gameId:'u',status:'ACTIVE',selectedPlatform:'UNITY',targetSourcePath:'unity-games/u',executionEvidence:{failureStage:'TARGET_PLATFORM_RUNTIME',failureSignature:'UNITY_RUNTIME_CRASH',runtimePassed:false}}]};
 const r=ingestTesterDebug({developmentQueue:dev});
 const t=r.tickets.tickets.find(x=>x.gameId==='u');
 assert.equal(t.surface,'UNITY');
 assert.equal(t.exactFailedStage,'TARGET_PLATFORM_RUNTIME');
 assert.ok(['CRITICAL','HIGH'].includes(t.severity));
});
test('same ticket is deduplicated and increments occurrence count',()=>{
 const dev={items:[{gameId:'g',status:'ACTIVE',sourcePath:'web-games/g',canonicalState:'WEB_VIBE_REPAIR_REQUIRED',vibeWebImplementationRequired:true,vibeWebRequestedStage:'WEB_RUNTIME',vibeWebImplementationReason:'LOSS_CONDITION_REQUIRED'}]};
 const first=ingestTesterDebug({developmentQueue:dev});
 const second=ingestTesterDebug({developmentQueue:dev,ticketQueue:first.tickets,recoveryQueue:first.recovery});
 assert.equal(second.tickets.tickets.length,1);
 assert.equal(second.tickets.tickets[0].occurrenceCount,2);
});


test('private Roblox runtime candidate without F1-F4 evidence becomes an existing tester execution ticket, not a fake repair',()=>{
 const dev={items:[{
  gameId:'cozy-island',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/cozy-island',
  robloxRuntimeCandidateEvidence:{published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),versionNumber:21},
  robloxRuntimeFoundationPassed:false,robloxFailureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',robloxFailureSignature:'ROBLOX_RUNTIME_FOUNDATION_PENDING'
 }]};
 const r=ingestTesterDebug({developmentQueue:dev});
 const t=r.tickets.tickets.find(x=>x.gameId==='cozy-island'&&x.signature==='ROBLOX_RUNTIME_FOUNDATION_UNVERIFIED');
 assert.ok(t);
 assert.equal(t.category,'FOUNDATION');
 assert.equal(t.route,'GAME_TESTER_FOUNDATION_EXECUTION');
 assert.equal(t.repairEligible,false);
 assert.match(t.reproduction,/RUN_EXISTING_GAME_TESTER_F0_TO_F4_FOUNDATION_SCENARIO/);
 assert.equal(r.recovery.tasks.some(x=>x.sourceTaskId===t.id),false);
});

test('observed Roblox foundation failure becomes critical tester ticket and exact-stage recovery',()=>{
 const dev={items:[{
  gameId:'cozy-island',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/cozy-island',
  robloxRuntimeCandidateEvidence:{published:true,versionNumber:21},
  robloxRuntimeFoundationPassed:false,
  robloxRuntimeFoundationEvidence:{state:'BLOCKED',failureSignature:'GROUND_CONTACT_FAILURE',blockers:['checkpoint:GROUND_CONTACT']},
  robloxFailureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',robloxFailureSignature:'GROUND_CONTACT_FAILURE'
 }]};
 const r=ingestTesterDebug({developmentQueue:dev});
 const t=r.tickets.tickets.find(x=>x.signature==='GROUND_CONTACT_FAILURE');
 assert.ok(t);
 assert.equal(t.severity,'CRITICAL');
 assert.equal(t.category,'FOUNDATION');
 assert.equal(t.exactFailedStage,'TARGET_PLATFORM_RUNTIME_FOUNDATION');
 assert.ok(r.recovery.tasks.some(x=>x.sourceTaskId===t.id&&x.failureSignature==='GROUND_CONTACT_FAILURE'));
});


test('Roblox F0 source integrity failure enters recovery with repeated occurrence preserved',()=>{
 const dev={items:[{
  gameId:'daechung-rpg',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/daechung-rpg',
  robloxSourceCommit:'a'.repeat(40),robloxBuildSourceRevision:'a'.repeat(40),
  robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),robloxBuildPreflightPassed:true,robloxFoundationF0Passed:false,
  robloxFailureStage:'F0_SOURCE_INTEGRITY',robloxFailureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_FAILED',
  routingBlockers:['roblox-f0-source-preflight-failed']
 }]};
 const first=ingestTesterDebug({developmentQueue:dev});
 const second=ingestTesterDebug({developmentQueue:dev,ticketQueue:first.tickets,recoveryQueue:first.recovery});
 const third=ingestTesterDebug({developmentQueue:dev,ticketQueue:second.tickets,recoveryQueue:second.recovery});
 const ticket=third.tickets.tickets.find(x=>x.gameId==='daechung-rpg'&&x.signature==='ROBLOX_F0_SOURCE_PREFLIGHT_FAILED');
 assert.ok(ticket);
 assert.equal(ticket.severity,'HIGH');
 assert.equal(ticket.exactFailedStage,'F0_SOURCE_INTEGRITY');
 assert.equal(ticket.occurrenceCount,3);
 const recovery=third.recovery.tasks.find(x=>x.sourceTaskId===ticket.id);
 assert.ok(recovery);
 assert.equal(recovery.recurrenceCount,3);
});

test('tester debug recovery binds by proven game source and enters ROOT_CAUSE_MODE on third recurrence',()=>{
 const dev={items:[{
  gameId:'daechung-rpg',status:'ACTIVE',selectedPlatform:'ROBLOX',
  targetSourcePath:'roblox-games/daechung-rpg',
  robloxFailureStage:'F0_SOURCE_INTEGRITY',
  robloxFailureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_FAILED'
 }]};
 const first=ingestTesterDebug({developmentQueue:dev});
 const second=ingestTesterDebug({developmentQueue:dev,ticketQueue:first.tickets,recoveryQueue:first.recovery});
 const third=ingestTesterDebug({developmentQueue:dev,ticketQueue:second.tickets,recoveryQueue:second.recovery});
 const recovery=third.recovery.tasks.find(x=>x.gameId==='daechung-rpg'&&x.failureStage==='F0_SOURCE_INTEGRITY');
 assert.ok(recovery);
 assert.deepEqual(recovery.responsibleFiles,[],'do not invent a Roblox script from a generic F0 failure');
 assert.equal(recovery.recurrenceCount,3);
 assert.ok(recovery.evidence.includes('tester-debug-surface:ROBLOX'));
 const own={id:'game-daechung-rpg',gameId:'daechung-rpg',target:'roblox',
  sourceRoot:'roblox-games/daechung-rpg',currentStep:'F0_SOURCE_INTEGRITY',
  responsibleFiles:['roblox-games/daechung-rpg/server/Game.server.luau'],
  sourceRevision:'verified-source-revision',status:'failed',priority:'normal',evidence:[]};
 const sibling={id:'game-other',gameId:'other',target:'roblox',sourceRoot:'roblox-games/other',
  currentStep:'F0_SOURCE_INTEGRITY',responsibleFiles:['roblox-games/other/server/Game.server.luau'],
  status:'queued',priority:'normal'};
 const result=dispatchRecovery({recoveryInput:third.recovery,
  gameQueueInput:{tasks:[own,sibling]},systemAiQueueInput:{tasks:[]},route:'all'});
 const task=result.gameQueue.tasks[0];
 assert.equal(task.repairMode,'ROOT_CAUSE_MODE');
 assert.equal(task.gameRepairContract.mode,'ROOT_CAUSE_MODE');
 assert.equal(task.sourceMutationBaseline,'verified-source-revision');
 assert.ok(task.evidence.includes('game-repair-repeat-count:3'));
 assert.ok(task.evidence.includes('recovery-source-bound-from-canonical-game-task:'+own.id));
 assert.equal(result.recovery.tasks.find(x=>x.id===recovery.id).status,'dispatched');
 assert.deepEqual(result.gameQueue.tasks[1],sibling);
 assert.deepEqual(result.gameRequeuedTaskIds,[own.id]);
});

test('source-less tester recovery stays queued if exact game responsibility is missing or ambiguous',()=>{
 const recovery={tasks:[{
  id:'recovery-f0',status:'queued',sourceQueue:'tester-debug',sourceTaskId:'bug-f0',
  gameId:'daechung-rpg',responsibleFiles:[],failureStage:'F0_SOURCE_INTEGRITY',
  failureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_FAILED',recurrenceCount:3,
  evidence:['tester-debug-surface:ROBLOX'],recoveryOwner:'VIBE2_VIBE3',
  recoveryStrategy:'EXACT_STAGE_REPAIR'
 }]};
 const noProof={id:'game-no-proof',gameId:'daechung-rpg',status:'queued',evidence:[]};
 const unknown=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[noProof]}});
 assert.deepEqual(unknown.gameQueue.tasks,[noProof]);
 assert.equal(unknown.recovery.tasks[0].status,'queued');
 const candidate=(id)=>({id,gameId:'daechung-rpg',target:'roblox',
  sourceRoot:'roblox-games/daechung-rpg',currentStep:'F0_SOURCE_INTEGRITY',
  responsibleFiles:['roblox-games/daechung-rpg/server/Game.server.luau'],status:'failed'});
 const candidates=[candidate('a'),candidate('b')];
 const ambiguous=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:candidates}});
 assert.deepEqual(ambiguous.gameQueue.tasks,candidates);
 assert.equal(ambiguous.dispatched.length,0);
 const blocked={...candidate('offline'),status:'blocked',blocker:'OFFLINE_RECIPE_UNAVAILABLE'};
 const unsafe=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[blocked]}});
 assert.deepEqual(unsafe.gameQueue.tasks,[blocked]);
 assert.equal(unsafe.recovery.tasks[0].status,'queued');
 const approval={...candidate('approval'),requiresOwnerDecision:true};
 const gated=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[approval]}});
 assert.deepEqual(gated.gameQueue.tasks,[approval]);
 assert.equal(gated.recovery.tasks[0].status,'queued');
});


test('same-game F0 ticket cannot bind a different failure signature or stage',()=>{
 const recovery={tasks:[{
  id:'f0-exact-cause',status:'queued',sourceQueue:'tester-debug',sourceTaskId:'bug-f0',
  gameId:'forest',responsibleFiles:[],failureStage:'F0_SOURCE_INTEGRITY',
  failureSignature:'F0_ORIGINAL_FAILURE',recurrenceCount:3,
  evidence:['tester-debug-surface:ROBLOX'],recoveryOwner:'VIBE2_VIBE3',
  recoveryStrategy:'EXACT_STAGE_REPAIR'
 }]};
 const base={id:'forest-real-source',gameId:'forest',target:'roblox',
  sourceRoot:'roblox-games/forest',currentStep:'F0_SOURCE_INTEGRITY',
  responsibleFiles:['roblox-games/forest/server/Game.server.luau'],
  status:'failed',priority:'normal',evidence:[]};
 const currentDifferent={...base,failureSignature:'F0_DIFFERENT_FAILURE'};
 const wrongCause=dispatchRecovery({recoveryInput:recovery,
  gameQueueInput:{tasks:[currentDifferent]}});
 assert.equal(wrongCause.dispatched.length,0);
 assert.equal(wrongCause.recovery.tasks[0].status,'queued');
 assert.deepEqual(wrongCause.gameQueue.tasks,[currentDifferent]);
 const staleCause={...base,evidence:['failure-cause:F0_DIFFERENT_FAILURE']};
 const wrongHistory=dispatchRecovery({recoveryInput:recovery,
  gameQueueInput:{tasks:[staleCause]}});
 assert.equal(wrongHistory.dispatched.length,0);
 assert.deepEqual(wrongHistory.gameQueue.tasks,[staleCause]);
 const wrongStage={...base,currentStep:'TARGET_PLATFORM_RUNTIME',
  failureSignature:'F0_ORIGINAL_FAILURE'};
 const result=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[wrongStage]}});
 assert.equal(result.dispatched.length,0);
 assert.deepEqual(result.gameQueue.tasks,[wrongStage]);
 const signatureOnly={...base,currentStep:null,failureSignature:'F0_ORIGINAL_FAILURE'};
 const unproven=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[signatureOnly]}});
 assert.equal(unproven.dispatched.length,0);
 assert.deepEqual(unproven.gameQueue.tasks,[signatureOnly]);
 const exact={...base,failureStage:'F0_SOURCE_INTEGRITY',
  failureSignature:'F0_ORIGINAL_FAILURE'};
 const verified=dispatchRecovery({recoveryInput:recovery,gameQueueInput:{tasks:[exact]}});
 assert.equal(verified.dispatched.length,1);
 assert.equal(verified.gameQueue.tasks[0].repairMode,'ROOT_CAUSE_MODE');
 assert.ok(verified.gameQueue.tasks[0].evidence.includes(
  'recovery-source-bound-from-canonical-game-task:'+base.id));
});

test('exact Roblox runtime failure keeps repair active but does not block internal flow',()=>{
 const dev={items:[{
  gameId:'daechung-rpg',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/daechung-rpg',
  robloxSourceCommit:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  robloxFoundationF0Passed:true,robloxRuntimeFoundationPassed:false,robloxRuntimePassed:false,
  robloxRuntimeFailureExternalReleaseOnly:true,
  robloxPublicReleaseFailureSignature:'GROUND_CONTACT_FAILURE',
  robloxPublicReleaseBlockers:['roblox-public-release-runtime-finding:ground_contact_failure'],
  robloxFailureStage:'ROBLOX_FINAL_REVIEW_REVALIDATION',robloxFailureSignature:'ROBLOX_FINAL_REVIEW_PENDING',
  robloxRuntimeCandidateEvidence:{published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),universeId:'1',placeId:'2',versionNumber:23},
  robloxRuntimeFoundationEvidence:{state:'BLOCKED',exactGame:true,exactPlace:true,exactVersion:true,actualRuntimeEvidence:true,failureSignature:'GROUND_CONTACT_FAILURE'},
  executionEvidence:{failureStage:'PUBLIC_RELEASE_RUNTIME_FINDING',failureSignature:'GROUND_CONTACT_FAILURE'}
 }]};
 const result=ingestTesterDebug({developmentQueue:dev,ticketQueue:{tickets:[]},recoveryQueue:{tasks:[]}});
 const ticket=result.tickets.tickets.find(x=>x.gameId==='daechung-rpg'&&x.signature==='GROUND_CONTACT_FAILURE'&&x.externalReleaseBlockingOnly===true);
 assert.ok(ticket);
 assert.equal(ticket.severity,'CRITICAL');
 assert.equal(ticket.repairEligible,true);
 assert.equal(ticket.internalFlowBlocking,false);
 assert.equal(ticket.externalReleaseBlockingOnly,true);
 assert.equal(ticket.route,'FOCUSED_REPAIR_AND_RECOVERY');
 assert.match(ticket.reproduction,/WITHOUT_PAUSING_INTERNAL_DEVELOPMENT/);
 const recovery=result.recovery.tasks.find(x=>x.sourceTaskId===ticket.id);
 assert.ok(recovery);
});

test('exact Roblox engine version awaiting real server boot stays observation-only without code repair',()=>{
 const dev={items:[{
  gameId:'daechung-rpg',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/daechung-rpg',
  robloxSourceCommit:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  robloxFoundationF0Passed:true,robloxRuntimeFoundationPassed:false,robloxRuntimePassed:false,
  robloxRuntimeRetryCount:4,robloxFailureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
  robloxFailureSignature:'ROBLOX_RUNTIME_FOUNDATION_AWAITING_REAL_SERVER_BOOT',
  routingBlockers:['roblox-runtime-foundation-awaiting-real-server-boot'],
  robloxRuntimeCandidateEvidence:{published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),universeId:'10767445769',placeId:'126302702438348',versionNumber:23},
  robloxRuntimeFoundationEvidence:{authority:'exact-engine-version-awaiting-real-server-boot',exactEngineVersion:true,engineExecuted:true,serverBootObserved:false,expectedVersionNumber:23,observedVersionNumber:22}
 }]};
 const result=ingestTesterDebug({developmentQueue:dev,ticketQueue:{tickets:[]},recoveryQueue:{tasks:[]}});
 const ticket=result.tickets.tickets.find(x=>x.gameId==='daechung-rpg'&&x.signature==='ROBLOX_RUNTIME_FOUNDATION_AWAITING_REAL_SERVER_BOOT');
 assert.ok(ticket);
 assert.equal(ticket.route,'REAL_SERVER_RUNTIME_OBSERVATION_REQUIRED');
 assert.equal(ticket.repairEligible,false);
 assert.deepEqual(ticket.responsibleFiles,[]);
 assert.match(ticket.reproduction,/REAL_ROBLOX_GAME_SERVER_BOOT/);
 assert.ok(ticket.evidence.some(x=>x.includes('exact-engine-version-awaiting-real-server-boot')));
 assert.equal(result.recovery.tasks.length,0);
});

test('actual runtime executor unavailability routes to System AI infrastructure recovery',()=>{
 const dev={items:[{
  gameId:'daechung-rpg',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/daechung-rpg',
  robloxSourceCommit:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  robloxFoundationF0Passed:true,robloxRuntimeFoundationPassed:false,robloxRuntimePassed:false,
  robloxRuntimeRetryCount:3,robloxFailureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
  robloxFailureSignature:'ROBLOX_ACTUAL_RUNTIME_EXECUTOR_UNAVAILABLE',
  robloxRuntimeCandidateEvidence:{published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),universeId:'1',placeId:'2',versionNumber:3}
 }]};
 const result=ingestTesterDebug({developmentQueue:dev,ticketQueue:{tickets:[]},recoveryQueue:{tasks:[]}});
 const ticket=result.tickets.tickets.find(x=>x.gameId==='daechung-rpg'&&x.signature==='ROBLOX_ACTUAL_RUNTIME_EXECUTOR_UNAVAILABLE');
 assert.ok(ticket);
 assert.equal(ticket.severity,'HIGH');
 assert.equal(ticket.category,'PLATFORM');
 assert.equal(ticket.route,'SYSTEM_AI_RUNTIME_EXECUTOR_RECOVERY');
 assert.deepEqual(ticket.responsibleFiles,[
  '.github/workflows/company-development-roblox-post-runtime-qa.yml',
  'tools/company-development-roblox-runtime-foundation.mjs'
 ]);
 const recovery=result.recovery.tasks.find(x=>x.sourceTaskId===ticket.id);
 assert.ok(recovery);
 assert.equal(recovery.recoveryOwner,'SYSTEM_AI');
 assert.equal(recovery.failureStage,'TARGET_PLATFORM_RUNTIME_FOUNDATION');
});

test('Roblox Open Cloud Luau permission denial becomes an external credential blocker without code repair',()=>{
 const dev={items:[{
  gameId:'daechung-rpg',status:'ACTIVE',selectedPlatform:'ROBLOX',targetSourcePath:'roblox-games/daechung-rpg',
  robloxSourceCommit:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
  robloxFoundationF0Passed:true,robloxRuntimeFoundationPassed:false,robloxRuntimePassed:false,
  robloxRuntimeRetryCount:0,robloxFailureStage:'TARGET_PLATFORM_RUNTIME_FOUNDATION',
  robloxFailureSignature:'ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_PERMISSION_DENIED',
  routingBlockers:['roblox-open-cloud-luau-execution-scope-missing'],
  robloxRuntimeCandidateEvidence:{published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),universeId:'10767445769',placeId:'126302702438348',versionNumber:20},
  robloxRuntimeFoundationEvidence:{authority:'roblox-open-cloud-engine-permission-evidence',requiredScope:'universe.place.luau-execution-session:10767445769:write',httpStatus:403,errorCode:'PERMISSION_DENIED'}
 }]};
 const result=ingestTesterDebug({developmentQueue:dev,ticketQueue:{tickets:[]},recoveryQueue:{tasks:[]}});
 const ticket=result.tickets.tickets.find(x=>x.gameId==='daechung-rpg'&&x.signature==='ROBLOX_OPEN_CLOUD_LUAU_EXECUTION_PERMISSION_DENIED');
 assert.ok(ticket);
 assert.equal(ticket.severity,'HIGH');
 assert.equal(ticket.category,'PLATFORM');
 assert.equal(ticket.route,'EXTERNAL_CREDENTIAL_REPAIR_REQUIRED');
 assert.equal(ticket.repairEligible,false);
 assert.deepEqual(ticket.responsibleFiles,[]);
 assert.ok(ticket.evidence.includes('required-scope:universe.place.luau-execution-session:10767445769:write'));
 assert.ok(ticket.evidence.includes('http-status:403'));
 assert.equal(result.recovery.tasks.length,0);
});


// 회귀: 웹 공개 테스트는 같은 게임 트리일 때만 기존 버그 티켓/반복 개발에 반영한다.
test('published WEB playtest intake rejects stale trees and deduplicates the same run',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'web-playtest-intake-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 try{
  fs.mkdirSync(path.join(root,'web-games','demo'),{recursive:true});
  fs.writeFileSync(path.join(root,'web-games','demo','index.html'),'<html>existing game</html>');
  fs.mkdirSync(path.join(root,'assets'));fs.writeFileSync(path.join(root,'assets','shared.js'),'export const existingAsset=1;');
  git('init','-q');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@example.test','commit','-qm','fixture');
  const sourceTreeSha=git('rev-parse','HEAD:web-games/demo'),sourceRevision=git('rev-parse','HEAD');
  const game={gameId:'demo',target:'web',sourceRoot:'web-games/demo',sourceTreeSha,sourceRevision,
    runtimeObserved:true,runtimePassed:false,failureSignature:'MAGIC_FOREST_KEYBOARD_WORLD_MOVEMENT_FAILED desktop',failureStage:'WEB_POST_PUBLICATION_PLAYTEST'};
  const report={version:1,authority:'PUBLISHED_WEB_BROWSER_SMOKE',exactGameSources:true,runId:'123',sharedSourceTrees:{assets:git('rev-parse','HEAD:assets')},games:[game]};
  const first=ingestTesterDebug({repoRoot:root,webPlaytestReport:report});
  assert.equal(first.ingested,1);assert.equal(first.tickets.webPlaytestObservations.length,1);
  assert.equal(first.tickets.tickets[0].surface,'WEB');
  assert.equal(first.tickets.tickets[0].category,'INPUT');
  assert.equal(first.tickets.tickets[0].severity,'HIGH','real-world movement failure must enter the existing recovery lane');
  assert.equal(first.tickets.tickets[0].exactFailedStage,'WEB_POST_PUBLICATION_PLAYTEST');
  assert.equal(first.recovery.tasks.length,1,'same-source Web failure uses the existing recovery queue');
 assert.equal(first.recovery.tasks[0].recoveryOwner,'VIBE2_VIBE3','game source must belong to Vibe primary, not System AI');
  assert.equal(first.recovery.tasks[0].recoveryStrategy,
    'REPAIR_REPRODUCIBLE_TESTER_BUG_AND_RERUN_EXACT_FAILED_STAGE');
  for(const required of [
    'VERIFY_EXACT_PUBLISHED_GAME_AND_SHARED_SOURCE_TREES',
    'VERIFY_REAL_DESKTOP_KEYBOARD_AND_MOBILE_TOUCH_INPUT_TO_GAME_STATE',
    'DISTINGUISH_WORLD_COLLISION_FROM_INPUT_FAILURE_USING_FOUR_DIRECTIONS',
    'VERIFY_ORIGINAL_WEBGL_SCENE_AND_SAVED_PLAYER_XY_AFTER_RELOAD',
    'RERUN_EXACT_FAILED_STAGE','INDEPENDENT_QA_WHEN_APPLICABLE',
    'REGRESSION_WHEN_APPLICABLE','CONFIRM_FAILURE_SIGNATURE_NOT_RECURRING'
  ])assert.ok(first.recovery.tasks[0].verificationPlan.includes(required),required);
  const oldFailure=ingestTesterDebug({repoRoot:root,webPlaytestReport:{...report,runId:'126',
    games:[{...game,failureSignature:'desktop: keyboard input failed to move original game state'}]}});
  assert.equal(oldFailure.tickets.tickets[0].severity,'HIGH');
  assert.equal(oldFailure.tickets.tickets[0].category,'INPUT');
  assert.equal(oldFailure.recovery.tasks.length,1,'old published movement failure cannot silently remain LOW');
  const repeated=ingestTesterDebug({repoRoot:root,webPlaytestReport:report,ticketQueue:first.tickets,recoveryQueue:first.recovery});
  assert.equal(repeated.ingested,0);assert.equal(repeated.tickets.tickets[0].occurrenceCount,1);
  const passed=ingestTesterDebug({repoRoot:root,webPlaytestReport:{...report,runId:'124',games:[{...game,runtimePassed:true}]},ticketQueue:first.tickets,recoveryQueue:first.recovery});
  assert.equal(passed.tickets.tickets[0].status,'VERIFIED');
  assert.equal(passed.recovery.tasks[0].status,'awaiting-primary-ai-review');
  const outdated=ingestTesterDebug({repoRoot:root,webPlaytestReport:report,ticketQueue:passed.tickets,recoveryQueue:passed.recovery});
  assert.equal(outdated.tickets.tickets[0].status,'VERIFIED');
  const refailed=ingestTesterDebug({repoRoot:root,webPlaytestReport:{...report,runId:'125'},ticketQueue:passed.tickets,recoveryQueue:passed.recovery});
  assert.equal(refailed.tickets.tickets[0].status,'OPEN');
  assert.equal(refailed.recovery.tasks[0].status,'queued');
  for(const altered of [{...report,sharedSourceTrees:{assets:'f'.repeat(40)}},{...report,exactGameSources:false},{...report,games:[{...game,target:'roblox'}]},
    {...report,games:[{...game,sourceTreeSha:'f'.repeat(40)}]}]){
    assert.equal(ingestTesterDebug({repoRoot:root,webPlaytestReport:altered}).ingested,0);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('real Web runtime repair targets only its own runnable source and preserves offline capability blocks',()=>{
 const rec={id:'web-smoke-recovery',sourceQueue:'tester-debug',sourceTaskId:'web-smoke-ticket',
   gameId:'demo',status:'queued',recoveryOwner:'VIBE2_VIBE3',
   responsibleFiles:['web-games/demo/index.html'],failureStage:'WEB_POST_PUBLICATION_PLAYTEST',
   failureSignature:'WILD_SURVIVAL_3D_PLAYER_MOVEMENT_NOT_REFLECTED',
   evidence:['web-browser-playtest-source:'+'a'.repeat(40)],recurrenceCount:1};
 const task=(id,target,files,blocker=null)=>({
   id,gameId:'demo',target,sourceRoot:target+'-games/demo',
   department:'development',type:'implementation',status:blocker?'blocked':'queued',
   blocker,responsibleFiles:files,goal:'existing '+id,priority:'normal'
 });
 const candidates={tasks:[
   task('exact','web',['web-games/demo/index.html']),
   task('other-platform','roblox',['roblox-games/demo/server/Game.server.luau']),
   task('other-source','web',['web-games/demo/other.js']),
   task('offline','web',['web-games/demo/index.html'],'OFFLINE_RECIPE_UNAVAILABLE'),
   {...task('another-game','web',['web-games/demo/index.html']),gameId:'another-game'}
 ]};
 const result=dispatchRecovery({recoveryInput:{tasks:[rec]},gameQueueInput:candidates,
   systemAiQueueInput:{tasks:[]},route:'all'});
 assert.equal(result.recovery.tasks[0].status,'dispatched');
 assert.deepEqual(result.gameRequeuedTaskIds,['exact']);
 assert.equal(result.gameQueue.tasks.find(t=>t.id==='exact').priority,'critical');
 for(const id of ['other-platform','other-source','another-game'])
   assert.equal(result.gameQueue.tasks.find(t=>t.id===id).priority,'normal');
 assert.equal(result.gameQueue.tasks.find(t=>t.id==='offline').status,'blocked');
 assert.equal(result.gameQueue.tasks.find(t=>t.id==='offline').blocker,'OFFLINE_RECIPE_UNAVAILABLE');
 assert.equal(result.systemAi.tasks.length,0);
 const pending=dispatchRecovery({recoveryInput:{tasks:[rec]},
   gameQueueInput:{tasks:[candidates.tasks[1],candidates.tasks[3]]},
   systemAiQueueInput:{tasks:[]},route:'all'});
 assert.equal(pending.recovery.tasks[0].status,'queued');
 assert.equal(pending.dispatched.length,0);
});

test('wild-survival live movement evidence uses a source SHA declared in its own scope',()=>{
 const source=fs.readFileSync(new URL('./vibe-browser-smoke.mjs',import.meta.url),'utf8');
 const start=source.indexOf(' // Owner-required: only real published, rendered WebGL 3D');
 const end=source.indexOf('  const finalManifestResponse',start);
 assert.ok(start>=0&&end>start,'WILD_SURVIVAL_LIVE_EVIDENCE_SCOPE_MISSING');
 const wild=source.slice(start,end);
 assert.ok(wild.includes("const wildSourceSha=String(process.env.GITHUB_SHA||'').trim()"));
 assert.ok(wild.includes('WILD_SURVIVAL_PUBLIC_SOURCE_SHA_REQUIRED'));
 assert.equal(wild.split('sourceSha:wildSourceSha').length-1,2);
 assert.equal(wild.includes('sourceSha:expected'),false);
 assert.ok(wild.includes('WILD_SURVIVAL_3D_PLAYER_MOVEMENT_NOT_REFLECTED'));
});
