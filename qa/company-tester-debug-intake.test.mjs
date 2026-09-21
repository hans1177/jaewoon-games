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
