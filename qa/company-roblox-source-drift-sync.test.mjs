import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  activeRobloxDevelopmentItem,
  reconcileChangedRobloxItems,
  robloxBuildInputGameId,
  changedRobloxBuildGameIds,
  restoreMetadataOnlyRobloxInvalidation
} from '../tools/company-roblox-source-drift-sync.mjs';

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
    validateItem:()=>({pass:true,blockers:[],buildSourceChanged:true}),
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


test('source drift workflow shallow-checks out current main and fetches only exact prior Roblox source commits',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/fetch-depth:\s*1/);
  assert.match(workflow,/fetch-tags:\s*false/);
  assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
  assert.match(workflow,/roblox-prior-source-revisions/);
  assert.match(workflow,/robloxEvidenceInvalidatedBySourceChange\?\.previousSourceRevision\|\|row\.robloxSourceCommit/);
  assert.match(workflow,/git fetch --no-tags --depth=1 origin "\$revision"/);
  assert.match(workflow,/ROBLOX_SOURCE_SYNC_PRIOR_REVISION_COUNT=/);
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


test('source drift sync has a dedicated non-starving concurrency lane',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/concurrency:\s*\n\s*group: roblox-source-drift-runtime-writer-v2\s*\n\s*cancel-in-progress: false/);
  assert.doesNotMatch(workflow,/group: company-runtime-writer/);
  assert.match(workflow,/for i in 1 2 3 4 5; do[\s\S]*git push origin HEAD:"\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(workflow,/regenerate_runtime_state/);
  assert.doesNotMatch(workflow,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});


test('source drift persist recomputes derived runtime state after push conflicts',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
 const persist=workflow.slice(workflow.indexOf('- name: Persist runtime synchronization'),workflow.indexOf('- name: Dispatch canonical Roblox runtime for fresh build'));
 assert.match(persist,/regenerate_runtime_state\(\)/);
 assert.match(persist,/git -C \/tmp\/company-runtime reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
 assert.match(persist,/node tools\/company-roblox-source-drift-sync\.mjs/);
 assert.match(persist,/node company-homepage-platform-exposure-sync\.mjs/);
 assert.doesNotMatch(persist,/git rebase/);
 assert.match(persist,/ROBLOX_SOURCE_SYNC_RUNTIME_PERSIST=PASS/);
});


test('merged Roblox source PRs wake exact source drift synchronization even when push chaining is unavailable',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/pull_request:\s*\n\s*branches: \[main\]\s*\n\s*types: \[closed\]/);
  assert.match(workflow,/github\.event\.pull_request\.merged == true/);
  assert.match(workflow,/pull-requests: read/);
  assert.match(workflow,/pulls\/\$PR_NUMBER\/files\?per_page=100/);
  assert.match(workflow,/ROBLOX_MERGED_PR_SOURCE_FILES=/);
});


test('changed Roblox source repairs a stale missing development queue through canonical promotion sync',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/reason==='not-active-development'/);
  assert.match(workflow,/gh workflow run company-design-promotion-sync\.yml/);
  assert.match(workflow,/ROBLOX_SOURCE_SYNC_CANONICAL_PROMOTION_RECOVERY=DISPATCHED/);
  assert.doesNotMatch(workflow,/new-shadow|shadow-pipeline/i);
});


test('Roblox build source drift ignores QA metadata while tracking Rojo build inputs',()=>{
  assert.equal(robloxBuildInputGameId('roblox-games/horror-escape-room/launch-mvp.json'),'');
  assert.equal(robloxBuildInputGameId('roblox-games/horror-escape-room/roblox-source-bootstrap.json'),'');
  assert.equal(robloxBuildInputGameId('roblox-games/.company-runtime-trigger'),'');
  assert.equal(robloxBuildInputGameId('roblox-games/horror-escape-room/default.project.json'),'horror-escape-room');
  assert.equal(robloxBuildInputGameId('roblox-games/horror-escape-room/server/Game.server.luau'),'horror-escape-room');
  assert.equal(robloxBuildInputGameId('roblox-games/horror-escape-room/client/Game.client.luau'),'horror-escape-room');
  assert.equal(robloxBuildInputGameId('roblox-games/horror-escape-room/shared/GameConfig.luau'),'horror-escape-room');
  assert.deepEqual(changedRobloxBuildGameIds([
    'roblox-games/horror-escape-room/launch-mvp.json',
    'roblox-games/horror-escape-room/server/Game.server.luau',
    'roblox-games/horror-escape-room/client/Game.client.luau'
  ]),['horror-escape-room']);
});

test('metadata-only mistaken invalidation restores preserved exact build evidence without fabricating runtime pass',()=>{
  const x=item();
  x.concurrentTargetPlatforms=['ROBLOX','UNITY'];
  x.platformExecutionMode='ROBLOX_UNITY_CONCURRENT_SAME_GAME';
  x.selectedPlatform='UNITY';
  x.targetPlatform='UNITY';
  x.robloxSourceCommit='c'.repeat(40);
  x.robloxBuildOrPackagePassed=false;
  x.robloxBuildSourceRevision=null;
  x.robloxBuildArtifactIdentity=null;
  x.robloxBuildPreflightPassed=false;
  x.robloxHeadlessFastMvpPassed=false;
  x.robloxRuntimePassed=false;
  x.robloxInternalVibePlayEvidence={pass:true};
  x.robloxEvidenceInvalidatedBySourceChange={previousSourceRevision:'a'.repeat(40),newSourceRevision:'c'.repeat(40),invalidatedAt:'2026-09-27T01:00:00.000Z'};
  x.robloxRuntimeCandidateEvidence={published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:7,versionNumber:9};
  x.robloxBuildPreflightEvidence={pass:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),checkedAt:'2026-09-27T00:10:00.000Z'};
  x.robloxHeadlessFastMvpEvidence={pass:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),checkedAt:'2026-09-27T00:11:00.000Z'};
  assert.equal(restoreMetadataOnlyRobloxInvalidation(x,{stamp:'2026-09-27T02:00:00.000Z'}),true);
  assert.equal(x.selectedPlatform,'UNITY');
  assert.equal(x.targetPlatform,'UNITY');
  assert.equal(x.robloxSourceCommit,'a'.repeat(40));
  assert.equal(x.robloxBuildOrPackagePassed,true);
  assert.equal(x.robloxBuildPreflightPassed,true);
  assert.equal(x.robloxHeadlessFastMvpPassed,true);
  assert.equal(x.robloxRuntimePassed,false);
  assert.equal(x.canonicalState,'INTERNAL_PLATFORM_PLAYTEST_AND_DEBUG');
  assert.equal(x.robloxEvidenceInvalidatedBySourceChange,null);
  assert.equal(x.robloxMetadataOnlySourceRecoveryEvidence.authority,'canonical-roblox-build-input-diff');
});

test('source drift workflow resolves changed games only from canonical Rojo build inputs',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/--resolve-files=\/tmp\/roblox-merged-pr-files\.txt/);
  assert.match(workflow,/--resolve-files=\/tmp\/roblox-push-files\.txt/);
  assert.doesNotMatch(workflow,/awk -F\/ '\$1=="roblox-games" && NF>=3 \{print \$2\}'/);
});


test('runtime trigger wakes Studio QA without rebinding Roblox build source identity',()=>{
  assert.deepEqual(changedRobloxBuildGameIds(['roblox-games/.company-runtime-trigger']),[]);
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.doesNotMatch(workflow,/sed -n 's\/\^gameId:/);
  assert.doesNotMatch(workflow,/grep -Fxq 'roblox-games\/\.company-runtime-trigger'/);
});


test('unknown Roblox build-source diff is non-mutating',()=>{
  const q={items:[item()]};
  const before=JSON.parse(JSON.stringify(q.items[0]));
  const out=reconcileChangedRobloxItems({
    queue:q,
    changedGameIds:['horror-escape-room'],
    sourceRevision:'f'.repeat(40),
    stamp:'2026-09-27T02:30:00.000Z',
    validateItem:()=>({pass:true,buildSourceChanged:null,comparisonBaseRevision:'a'.repeat(40)})
  });
  assert.equal(out.results[0].pass,false);
  assert.equal(out.results[0].nonMutating,true);
  assert.deepEqual(q.items[0],before);
});


test('source drift writer generation invalidates stale queued writers before runtime mutation',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  const source=fs.readFileSync('tools/company-roblox-source-drift-sync.mjs','utf8');
  assert.match(workflow,/group: roblox-source-drift-runtime-writer-v2/);
  assert.match(workflow,/ROBLOX_SOURCE_DRIFT_SYNC_GENERATION: v2/);
  assert.match(source,/ROBLOX_SOURCE_DRIFT_SYNC_GENERATION_STALE/);
  assert.match(source,/generation!==['"]v2['"]/);
});


test('source drift persist refuses to write an older game-source tree after main advances',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/ROBLOX_SOURCE_SYNC_STALE_GAME_SOURCE=/);
  assert.match(workflow,/ROBLOX_SOURCE_SYNC_SOURCE_FRESH=/);
  assert.match(workflow,/git -C "\$GITHUB_WORKSPACE" fetch --no-tags --depth=1 origin main/);
  assert.match(workflow,/git -C "\$GITHUB_WORKSPACE" diff --quiet "\$SOURCE_REVISION" "\$live_main"/);
  assert.match(workflow,/roblox-games\/\$game_id\/server/);
  assert.match(workflow,/roblox-games\/\$game_id\/client/);
});
