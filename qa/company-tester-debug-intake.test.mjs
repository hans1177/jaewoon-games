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

test('tester debug recovery binds by game id and enters ROOT_CAUSE_MODE on third recurrence',()=>{
 const recovery={
  version:1,tasks:[{
   id:'recovery-f0',status:'queued',priority:'critical',sourceQueue:'tester-debug',sourceTaskId:'bug-f0',
   gameId:'daechung-rpg',responsibleFiles:[],contextFiles:[],failureStage:'F0_SOURCE_INTEGRITY',
   failureSignature:'ROBLOX_F0_SOURCE_PREFLIGHT_FAILED',blastRadius:'single-ticket',recurrenceCount:3,
   evidence:['tester-debug-occurrence-count:3'],recoveryStrategy:'REPAIR_REPRODUCIBLE_TESTER_BUG_AND_RERUN_EXACT_FAILED_STAGE',
   verificationPlan:['RERUN_EXACT_FAILED_STAGE'],recoveryOwner:'VIBE2_VIBE3'
  }]
 };
 const gameQueue={tasks:[{id:'game-daechung-rpg',gameId:'daechung-rpg',status:'queued',evidence:[]}]};
 const result=dispatchRecovery({recoveryInput:recovery,gameQueueInput:gameQueue,systemAiQueueInput:{tasks:[]},route:'all'});
 const task=result.gameQueue.tasks[0];
 assert.equal(task.repairMode,'ROOT_CAUSE_MODE');
 assert.equal(task.gameRepairContract.mode,'ROOT_CAUSE_MODE');
 assert.ok(task.evidence.includes('game-repair-repeat-count:3'));
 assert.equal(result.recovery.tasks[0].status,'dispatched');
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

