import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {
  activeRobloxDevelopmentItem,
  reconcileChangedRobloxItems,
  robloxBuildInputGameId,
  changedRobloxBuildGameIds,
  restoreMetadataOnlyRobloxInvalidation,
  restartRobloxFromF0
} from '../tools/company-roblox-source-drift-sync.mjs';

test('exact published F0 candidate resumes existing runtime QA without crossing game or security boundaries',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const step=workflow.split('      - name: Dispatch Roblox HEADLESS FAST_MVP continuation')[1];
  const code=step.match(/state="\$\(node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^\s*import .*;\n/gm,'');
  const revision='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
  const row={gameId:'daechung-rpg',productionClass:'DEVELOPMENT_CONFIRMED',status:'ACTIVE',robloxSourceCommit:revision,robloxBuildSourceRevision:revision,robloxBuildArtifactIdentity:artifact,robloxBuildOrPackagePassed:true,robloxBuildPreflightPassed:true,robloxFoundationF0Passed:true,robloxFoundationF0Evidence:{pass:true,sourceRevision:revision,artifactIdentity:artifact},robloxRuntimeCandidateEvidence:{published:true,sourceRevision:revision,artifactIdentity:artifact,versionNumber:38,placeId:'1',universeId:'2'},robloxRuntimePassed:false};
  const invoke=(patch={},requested='daechung-rpg',developmentEligible=true)=>{
    const written={};
    runInNewContext(code,{fs:{readFileSync:file=>JSON.stringify(file.includes('dispatch-queue')?{items:[{...row,...patch},{...row,gameId:'other-game'}]}:{developmentAccess:{ROBLOX:'ALWAYS_ALLOWED'}}),writeFileSync:(file,data)=>{written[file]=data;}},process:{env:{REQUESTED_GAME_ID:requested,ROBLOX_RUNTIME_HARNESS_VERSION:'8'},stdout:{write(){}}},ownerFocusedSecondaryPlatformEligible:()=>false,platformDevelopmentEligible:()=>developmentEligible});
    return written['/tmp/roblox-runtime-qa-ready-ids'];
  };
  assert.equal(invoke(),'daechung-rpg\n');
  assert.equal(invoke({robloxInternalReleaseReady:true},'daechung-rpg',false),'daechung-rpg\n');
  assert.equal(invoke({robloxInternalReleaseReady:true,robloxFoundationF0Passed:false},'daechung-rpg',false),'');
  assert.equal(invoke({},''),'daechung-rpg\nother-game\n');
  for(const patch of [{robloxFoundationF0Passed:false},{robloxFoundationF0Evidence:{...row.robloxFoundationF0Evidence,pass:false}},{robloxFoundationF0Evidence:{...row.robloxFoundationF0Evidence,sourceRevision:'c'.repeat(40)}},{robloxRuntimeCandidateEvidence:{...row.robloxRuntimeCandidateEvidence,published:false}},{robloxRuntimeCandidateEvidence:{...row.robloxRuntimeCandidateEvidence,artifactIdentity:'sha256:'+'c'.repeat(64)}},{robloxRuntimeSecurityHold:true},{robloxQualityBuildUpRequired:true,robloxQualityBuildUpSourceRevision:revision},{robloxRuntimePassed:true,robloxRuntimeHarnessVersion:'8'}])assert.equal(invoke(patch),'');
  assert.match(step,/gh workflow run company-development-roblox-post-runtime-qa\.yml/);
  assert.match(step,/ROBLOX_RUNTIME_FOUNDATION_QA_DISPATCH=DEDUPED_ACTIVE/);
});

// 무효 실행: 소스 계획이 정상 종료됐어도 후속 작업은 생성하지 않는다.
test('superseded and duplicate source plans cannot schedule downstream package work',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/accepted: \$\{\{ steps\.freshness\.outputs\.run \|\| 'false' \}\}/);
  const condition=job=>workflow.split('  '+job+':')[1].split('    if: ')[1].split('\n')[0];
  const evaluate=(job,{accepted='false',count='0',reconciliation_count='0',result='success'}={})=>{
    const code=condition(job).replaceAll('needs.source-plan','needs.sourcePlan');
    return runInNewContext(code,{always:()=>true,needs:{sourcePlan:{result,outputs:{accepted,count,reconciliation_count}}}});
  };
  for(const accepted of ['false','',undefined]){
    assert.equal(evaluate('technical-plan',{accepted,count:'1'}),false);
    assert.equal(evaluate('source-bootstrap',{accepted,count:'1',reconciliation_count:'1'}),false);
  }
  assert.equal(evaluate('technical-plan',{accepted:'true'}),true);
  assert.equal(evaluate('technical-plan',{accepted:'true',result:'failure'}),false);
  assert.equal(evaluate('source-bootstrap',{accepted:'true'}),false);
  assert.equal(evaluate('source-bootstrap',{accepted:'true',count:'1'}),true);
  assert.equal(evaluate('source-bootstrap',{accepted:'true',reconciliation_count:'1'}),true);
});

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
    robloxInternalReleasePublished:true,
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
  assert.equal(x.robloxInternalReleasePublished,false);
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
  assert.equal(x.robloxInternalReleaseReady,false);
  assert.equal(x.robloxInternalReleasePublished,false);
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
  assert.equal(workflow.split('node company-homepage-platform-exposure-sync.mjs development-queue.json game-catalog.json homepage-platform-exposure.json company-learning/platform-release-roadmap.json').length-1,2);
});


test('single changed Roblox game redispatches exact runtime game id',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/passed_ids/);
  assert.match(workflow,/gh workflow run company-development-roblox-runtime\.yml[^\n]*-f game_id=/);
  assert.match(workflow,/ROBLOX_CANONICAL_RUNTIME_REDISPATCH=EXACT:/);
});


test('source drift sync has a dedicated non-starving concurrency lane',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/concurrency:\s*\n\s*group: roblox-source-drift-runtime-writer-v2\s*\n\s*queue: max\s*\n\s*cancel-in-progress: false/);
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


test('forced F0 restart invalidates package and F0 even when current source is unchanged',()=>{
  const x=item();
  x.robloxFoundationF0Passed=true;
  x.robloxFoundationF0PassedAt='2026-09-29T00:00:00.000Z';
  x.robloxFoundationF0Evidence={pass:true,sourceRevision:x.robloxSourceCommit,artifactIdentity:x.robloxBuildArtifactIdentity};
  const oldTarget=x.robloxPublicationTarget;
  const source=x.robloxSourceCommit;
  const out=reconcileChangedRobloxItems({
    queue:{items:[x]},
    changedGameIds:['horror-escape-room'],
    sourceRevision:source,
    stamp:'2026-09-30T00:00:00.000Z',
    forceF0Restart:true,
    validateItem:()=>({pass:true,buildSourceChanged:false}),
  });
  assert.equal(out.results[0].forcedF0Restart,true);
  assert.equal(x.robloxSourceCommit,source);
  assert.equal(x.robloxBuildOrPackagePassed,false);
  assert.equal(x.robloxBuildArtifactIdentity,null);
  assert.equal(x.robloxBuildPreflightPassed,false);
  assert.equal(x.robloxFoundationF0Passed,false);
  assert.equal(x.robloxFoundationF0PassedAt,null);
  assert.equal(x.robloxFoundationF0Evidence,null);
  assert.equal(x.robloxFailureSignature,'ROBLOX_F0_RESTART_BUILD_PACKAGE_PENDING');
  assert.equal(x.robloxEvidenceInvalidatedBySourceChange,null);
  assert.equal(x.robloxEvidenceInvalidatedByF0Restart.authority,'canonical-main-f0-restart');
  assert.deepEqual(x.robloxPublicationTarget,oldTarget);
});

test('direct restart helper preserves publication target but clears stale F0 pass',()=>{
  const x=item();
  x.robloxFoundationF0Passed=true;
  x.robloxFoundationF0Evidence={pass:true};
  const target=x.robloxPublicationTarget;
  restartRobloxFromF0(x,{sourceRevision:'f'.repeat(40),stamp:'2026-09-30T00:01:00.000Z'});
  assert.equal(x.robloxFoundationF0Passed,false);
  assert.equal(x.robloxFoundationF0Evidence,null);
  assert.equal(x.robloxSourceCommit,'f'.repeat(40));
  assert.deepEqual(x.robloxPublicationTarget,target);
});

test('source drift workflow exposes explicit restart-from-F0 input and forwards it through conflict retries',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(workflow,/restart_from_f0:/);
  assert.match(workflow,/FORCE_F0_RESTART:/);
  assert.match(workflow,/--force-f0-restart=true/);
  const occurrences=(workflow.match(/force-f0-restart=true/g)||[]).length;
  assert.ok(occurrences>=2,'force flag must be used in initial sync and conflict regeneration');
});


test('one-click F0 restart workflow dispatches only canonical source sync with force flag',()=>{
  const workflow=fs.readFileSync('.github/workflows/roblox-f0-restart.yml','utf8');
  assert.match(workflow,/name: Roblox F0 Restart & Resync/);
  assert.match(workflow,/default: horror-escape-room/);
  assert.match(workflow,/gh workflow run company-roblox-source-drift-sync\.yml/);
  assert.match(workflow,/-f "restart_from_f0=true"/);
  assert.doesNotMatch(workflow,/release-promotion|private-deploy|Studio/);
});

test('parallel horror-only private deploy workflow is removed so canonical publish has one authority',()=>{
  assert.equal(fs.existsSync('.github/workflows/horror-escape-room-private-deploy.yml'),false);
});


test('source-sync contract edits wake runtime control while game edits use exact changed-source dispatch',()=>{
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const runtimePush=runtime.slice(runtime.indexOf('on:'),runtime.indexOf('workflow_call:'));
  const sync=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.match(runtimePush,/company-roblox-source-drift-sync\.yml/);
  assert.match(runtimePush,/tools\/company-roblox-source-drift-sync\.mjs/);
  assert.match(runtimePush,/qa\/company-roblox-source-drift-sync\.test\.mjs/);
  assert.doesNotMatch(runtimePush,/roblox-games\/\*\*/);
  assert.match(sync,/paths:\s*\n\s*- 'roblox-games\/\*\*'/);
  assert.match(sync,/gh workflow run company-development-roblox-runtime\.yml[^\n]*-f game_id=/);
});


test('batch cannot cancel queued exact games for unrelated commit changes',()=>{
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const sourcePlan=runtime.slice(runtime.indexOf('\n  source-plan:\n'),runtime.indexOf('\n  source-worker:\n'));
  assert.doesNotMatch(sourcePlan,/actions\/runs\/\$run_id\/cancel/);
  assert.match(sourcePlan,/ROBLOX_QUEUED_EXACT_CONTRACT_SELF_VALIDATION=YES/);
  assert.match(sourcePlan,/git diff --quiet "\$GITHUB_SHA" "\$current_main" -- "\$\{contract_paths\[@\]\}"/);
  assert.match(sourcePlan,/ROBLOX_BATCH_UNRELATED_MAIN_ADVANCE_ACCEPTED=/);
  assert.match(sourcePlan,/ROBLOX_EXACT_CONTRACT_SUPERSEDED_REDISPATCH=YES:/);
});

test('exact Roblox runs deduplicate before work without cancelling an active build',()=>{
  const runtime=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.doesNotMatch(runtime.slice(0,runtime.indexOf('\njobs:\n')),/\nconcurrency:\n/);
  const sourcePlan=runtime.slice(runtime.indexOf('\n  source-plan:\n'),runtime.indexOf('\n  source-worker:\n'));
  assert.match(sourcePlan,/concurrency:\n\s+group: roblox-runtime-source-plan-v2-\$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  const freshness=runtime.slice(runtime.indexOf('      - name: Reject superseded batch scheduler'),runtime.indexOf('      - name: Bind Roblox source-plan contract fingerprint'));
  assert.match(freshness,/String\(r\.display_title\|\|''\)===title/);
  assert.match(sourcePlan,/cancel-in-progress: false/);
  assert.doesNotMatch(sourcePlan,/cancel-in-progress: true/);
  assert.match(freshness,/ROBLOX_RUNTIME_EXACT_DEDUPED_CURRENT_MAIN=/);
  assert.match(freshness,/String\(r\.head_sha\|\|''\)===currentSha/);
  assert.match(freshness,/echo 'run=false' >> "\$GITHUB_OUTPUT"/);
  assert.match(freshness,/ROBLOX_EXACT_CONTRACT_SUPERSEDED_REDISPATCH=YES:/);
});

// 병합 복구 이벤트를 보존하고 이벤트별 대기열을 분리한다.
test('Roblox source sync preserves both triggers without pending cross-cancellation',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  assert.ok(workflow.includes('  push:\n    branches: [main]'));
  assert.ok(workflow.includes('  pull_request:\n    branches: [main]\n    types: [closed]'));
  assert.ok(workflow.includes('  workflow_dispatch:'));
  assert.ok(workflow.includes('group: roblox-source-drift-runtime-writer-v2\n  queue: max\n  cancel-in-progress: false'));
  assert.ok(workflow.includes('cancel-in-progress: false'));
});

test('multi-game source drift dispatches only exact changed games and excludes permanently removed ids',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  const step=workflow.slice(workflow.indexOf('      - name: Dispatch canonical Roblox runtime for fresh build'));
  assert.ok(step.includes('policy.permanentProjectRemoval?.ids'));
  assert.ok(step.includes('!removed.has(id)'));
  assert.ok(step.includes('for(const id of eligible)console.log(id)'));
  assert.ok(step.includes('for game_id in "${passed_ids[@]}"'));
  assert.ok(step.includes('gh workflow run company-development-roblox-runtime.yml --repo "$GITHUB_REPOSITORY" --ref main -f game_id="$game_id"'));
  assert.ok(!step.includes('ROBLOX_CANONICAL_RUNTIME_REDISPATCH=BATCH'));
  assert.ok(step.includes('ROBLOX_CANONICAL_RUNTIME_REDISPATCH=EXACT_COUNT:'));
});

test('post-publication F0 restart invokes Web BUILD_UP planner only after persisted game runtime dispatch',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-roblox-source-drift-sync.yml','utf8');
  const persist=workflow.indexOf('      - name: Persist runtime synchronization');
  const runtime=workflow.indexOf('      - name: Dispatch canonical Roblox runtime for fresh build');
  const planner=workflow.indexOf('      - name: Refill existing Web-style BUILD_UP planner after proven Roblox F0 restart');
  assert.ok(persist>=0&&runtime>persist&&planner>runtime);
  const step=workflow.slice(planner);
  assert.match(step,/inputs\.restart_from_f0 == true/);
  assert.match(step,/steps\.changed\.outputs\.game_ids != ''/);
  assert.match(step,/! -s \/tmp\/roblox-drift-eligible-game-ids\.txt/);
  assert.match(step,/gh workflow run vibe2-24h-runner\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.doesNotMatch(step,/gh workflow run vibe2-continuous-core\.yml/);
});
