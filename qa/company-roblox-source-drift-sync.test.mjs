import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeRobloxDevelopmentItem,reconcileChangedRobloxItems} from '../tools/company-roblox-source-drift-sync.mjs';

function item(){
  return {
    gameId:'horror-escape-room',
    gameName:'심야 술래잡기',
    productionClass:'DEVELOPMENT_CONFIRMED',
    status:'ACTIVE',
    canonicalState:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
    currentStep:'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG',
    ownerDirectDevelopment:true,
    ownerDirectDevelopmentAuthority:'OWNER_DIRECTIVE_2026-09-22',
    designBaselineSource:'design/horror-escape-room/2026-09-22/design-revised.json',
    robloxSourceCommit:'a'.repeat(40),
    robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:'a'.repeat(40),
    robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),
    robloxBuildPreflightPassed:true,
    robloxRuntimePassed:true,
    robloxHeadlessFastMvpPassed:true,
    robloxHeadlessFinalReviewPassed:true,
    robloxInternalReleaseReady:true,
    robloxPublicReleaseReady:true,
    robloxPublicRelease:true,
    robloxReleaseClaim:true,
    robloxFastMvpPublished:true,
    robloxPublicationTarget:{verified:true,universeId:'1',placeId:'2'},
    robloxInternalReleaseEvidence:{published:true,sourceRevision:'a'.repeat(40)},
  };
}

test('active released or playtest Roblox game remains eligible for changed-source synchronization',()=>{
  assert.equal(activeRobloxDevelopmentItem(item()),true);
  assert.equal(activeRobloxDevelopmentItem({...item(),status:'PAUSED'}),false);
  assert.equal(activeRobloxDevelopmentItem({...item(),canonicalState:'DEVELOPMENT_BLOCKED'}),false);
});

test('changed source invalidates downstream pass flags but preserves prior evidence and publication target',()=>{
  const original=item();
  const evidence=original.robloxInternalReleaseEvidence;
  const target=original.robloxPublicationTarget;
  const queue={items:[original]};
  const source='c'.repeat(40);
  const stamp='2026-09-22T08:00:00.000Z';
  const result=reconcileChangedRobloxItems({
    queue,
    changedGameIds:['horror-escape-room'],
    sourceRevision:source,
    stamp,
    validateItem:()=>({pass:true,blockers:[]}),
  });
  const x=result.queue.items[0];
  assert.equal(result.results[0].pass,true);
  assert.equal(x.robloxSourceCommit,source);
  assert.equal(x.currentStep,'TARGET_PLATFORM_TECHNICAL_VALIDATION');
  assert.equal(x.canonicalState,'TARGET_PLATFORM_REPAIR_REQUIRED');
  assert.equal(x.robloxBuildOrPackagePassed,false);
  assert.equal(x.robloxBuildArtifactIdentity,null);
  assert.equal(x.robloxBuildPreflightPassed,false);
  assert.equal(x.robloxRuntimePassed,false);
  assert.equal(x.robloxHeadlessFastMvpPassed,false);
  assert.equal(x.robloxInternalReleaseReady,false);
  assert.equal(x.robloxPublicReleaseReady,false);
  assert.equal(x.robloxPublicRelease,false);
  assert.equal(x.robloxReleaseClaim,false);
  assert.equal(x.robloxFastMvpPublished,false);
  assert.equal(x.robloxFailureSignature,'ROBLOX_BUILD_PACKAGE_REVALIDATION_PENDING');
  assert.deepEqual(x.robloxPublicationTarget,target);
  assert.deepEqual(x.robloxInternalReleaseEvidence,evidence);
  assert.deepEqual(x.robloxEvidenceInvalidatedBySourceChange,{
    previousSourceRevision:'a'.repeat(40),
    newSourceRevision:source,
    invalidatedAt:stamp,
  });
});

test('invalid changed source fails closed at source bind and cannot keep release state',()=>{
  const queue={items:[item()]};
  const result=reconcileChangedRobloxItems({
    queue,
    changedGameIds:['horror-escape-room'],
    sourceRevision:'d'.repeat(40),
    stamp:'2026-09-22T08:01:00.000Z',
    validateItem:()=>({pass:false,blockers:['SERVER_PLACEHOLDER_FORBIDDEN']}),
  });
  const x=result.queue.items[0];
  assert.equal(result.results[0].pass,false);
  assert.equal(x.currentStep,'TARGET_PLATFORM_SOURCE_BIND');
  assert.equal(x.robloxPublicRelease,false);
  assert.equal(x.robloxReleaseClaim,false);
  assert.equal(x.robloxFailureSignature,'ROBLOX_CHANGED_SOURCE_REVALIDATION_FAILED');
  assert.match(x.routingBlockers[0],/SERVER_PLACEHOLDER_FORBIDDEN/);
});

test('unrelated changed game id does not mutate the target item',()=>{
  const x=item();
  const before=JSON.stringify(x);
  const result=reconcileChangedRobloxItems({
    queue:{items:[x]},
    changedGameIds:['other-game'],
    sourceRevision:'e'.repeat(40),
    validateItem:()=>({pass:true}),
  });
  assert.equal(JSON.stringify(x),before);
  assert.equal(result.results[0].skipped,true);
});


test('source drift workflow avoids full history and fetches exact event diff commits while binding current main',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/fetch-depth:\s*1/);
  assert.match(workflow,/fetch-tags:\s*false/);
  assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$BEFORE_SHA"/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$CURRENT_SHA"/);
  assert.match(workflow,/id: main[\s\S]*git rev-parse HEAD/);
  assert.match(workflow,/SOURCE_REVISION: \$\{\{ steps\.main\.outputs\.sha \}\}/);
});

test('changed-source workflow binds homepage sync dependencies from main',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/company-shared-context\.mjs/);
  assert.match(workflow,/company-learning\/platform-release-roadmap\.json/);
});


test('single changed Roblox game redispatches exact runtime game id',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/passed_ids/);
  assert.match(workflow,/gh workflow run company-development-roblox-runtime\.yml[^\n]*-f game_id=/);
  assert.match(workflow,/ROBLOX_CANONICAL_RUNTIME_REDISPATCH=EXACT:/);
});
