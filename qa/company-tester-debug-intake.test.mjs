import test from 'node:test';
import assert from 'node:assert/strict';
import {ingestTesterDebug} from '../tools/company-tester-debug-intake.mjs';

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
