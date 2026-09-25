import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  validateLocalStudioPolicy,
  planLocalStudioCandidates,
  createLocalStudioPlayEvidence,
  applyLocalStudioPlayResult
} from '../tools/company-development-roblox-studio-local-play.mjs';

const workflow=fs.readFileSync('.github/workflows/company-development-roblox-post-runtime-qa.yml','utf8');

const source='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);

function roadmap(){
  return {
    roblox:{studioExecution:{
      enabled:true,required:true,localPlaceFileRequired:true,
      onlinePublishedPlaceDirectOpenForbidden:true,
      placeIdOrUniverseIdAsStudioLaunchTargetForbidden:true
    }},
    developmentLifecycleMachine:{robloxStudioUsage:{
      learningUseForbidden:false,
      forbidden:[
        'ROBLOX_PLAYER_AUTOMATION',
        'PUBLIC_SERVER_BOT_PLAY',
        'PUBLISHED_PLACE_DIRECT_STUDIO_AUTOMATION'
      ]
    }}
  };
}

function item(){
  return {
    gameId:'g1',
    robloxSourceCommit:source,
    robloxBuildOrPackagePassed:true,
    robloxBuildSourceRevision:source,
    robloxBuildArtifactIdentity:artifact,
    robloxSharedTargetCurrent:false,
    robloxRuntimeCandidateEvidence:{
      sourceRevision:source,
      artifactIdentity:artifact,
      artifactRunId:777,
      universeId:'123',
      placeId:'456',
      versionNumber:9,
      published:true,
      authority:'roblox-open-cloud-private-runtime-candidate'
    }
  };
}

function runtime(){
  return {
    authority:'vibe2-roblox-studio-runtime',
    runtimeVerified:true,
    capabilities:{studioTestService:true,virtualInput:true},
    actions:[{id:'move',type:'key',dispatched:true,ok:true,error:'raw action error'}],
    checkpoints:[
      {id:'loaded',name:'game-loaded',required:true,pass:true,value:{raw:'drop-me'}},
      {id:'player',name:'player-present',required:true,pass:true,value:'raw-player-value'}
    ],
    errors:[],
    metrics:{consoleErrorCount:0}
  };
}

const expected={
  sourceRevision:source,
  artifactIdentity:artifact,
  artifactRunId:777,
  universeId:'123',
  placeId:'456',
  versionNumber:9
};

test('local Studio policy requires local file and forbids Player/online automation',()=>{
  assert.equal(validateLocalStudioPolicy(roadmap()),true);
  const bad=structuredClone(roadmap());
  bad.roblox.studioExecution.onlinePublishedPlaceDirectOpenForbidden=false;
  assert.throws(()=>validateLocalStudioPolicy(bad),/LOCAL_ONLY_POLICY_MISMATCH/);
});

test('planner selects exact immutable artifact and skips already observed candidate',()=>{
  const q={items:[item()]};
  const first=planLocalStudioCandidates({queue:q,roadmap:roadmap()});
  assert.equal(first.include.length,1);
  assert.equal(first.include[0].artifactRunId,777);
  q.items[0].robloxInternalVibePlayEvidence={
    localPlaceFile:true,onlinePlaceDirectOpen:false,robloxPlayerAutomation:false,
    sourceRevision:source,artifactIdentity:artifact,artifactRunId:777,
    universeId:'123',placeId:'456',versionNumber:9,testedAt:'2026-09-25T09:00:00.000Z'
  };
  assert.equal(planLocalStudioCandidates({queue:q,roadmap:roadmap()}).include.length,0);
});

test('verified local Studio pass records no Player or online automation',()=>{
  const result=createLocalStudioPlayEvidence({
    item:item(),runtime:runtime(),expected,workflowRunId:42,studioStepSucceeded:true,
    testedAt:'2026-09-25T09:00:00.000Z'
  });
  assert.equal(result.pass,true);
  assert.equal(result.evidence.actualPlay,true);
  assert.equal(result.evidence.localPlaceFile,true);
  assert.equal(result.evidence.onlinePlaceDirectOpen,false);
  assert.equal(result.evidence.robloxPlayerAutomation,false);
  assert.equal(result.evidence.publishedCandidateCrossCheckAuthority,'OPEN_CLOUD');
  assert.equal(result.evidence.rawSourceIncluded,false);
  assert.equal(result.evidence.learningReusable,true);
  assert.deepEqual(result.evidence.scenarioCoverage,[]);
  assert.equal(result.evidence.scenarioCoveragePass,false);
  assert.equal('value' in result.evidence.checkpoints[0],false);
  assert.equal('error' in result.evidence.actions[0],false);
  assert.equal('timeToFirstActionMs' in result.evidence.runtimeSummary,false);
});

test('stale artifact is rejected before evidence persistence',()=>{
  const stale={...expected,artifactRunId:776};
  assert.throws(()=>createLocalStudioPlayEvidence({
    item:item(),runtime:runtime(),expected:stale,workflowRunId:42,studioStepSucceeded:true
  }),/CANDIDATE_STALE/);
});

test('verified Studio runtime error routes exact game to repair while remaining reusable failure evidence',()=>{
  const bad=runtime();
  bad.runtimeVerified=false;
  bad.errors=[{type:'studio-console-error',message:'attempt to index nil'}];
  const q={items:[item()]};
  const applied=applyLocalStudioPlayResult({
    queue:q,gameId:'g1',runtime:bad,expected,workflowRunId:42,studioStepSucceeded:true,
    testedAt:'2026-09-25T09:00:00.000Z'
  });
  assert.equal(applied.result.pass,false);
  assert.equal(applied.result.evidence.learningReusable,true);
  assert.equal(applied.result.evidence.failureClass,'STUDIO_RUNTIME_ERROR');
  assert.deepEqual(applied.result.evidence.errors,[{type:'studio-console-error',actionId:null}]);
  assert.equal(applied.item.canonicalState,'REPAIR_REQUIRED');
  assert.equal(applied.item.robloxFailureSignature,'ROBLOX_STUDIO_LOCAL_RUNTIME_ERROR');
  assert.deepEqual(applied.item.routingBlockers,['roblox-studio-local-play-repair-required']);
});

test('company runtime QA uses local immutable Place artifact and never launches published Place directly in Studio',()=>{
  assert.match(workflow,/runs-on: \[self-hosted, Windows, X64, roblox-studio-authenticated\]/);
  assert.match(workflow,/development-roblox-package-\$\{\{ matrix\.gameId \}\}/);
  assert.match(workflow,/run-id: \$\{\{ matrix\.artifactRunId \}\}/);
  assert.match(workflow,/--place-file=\$env:VIBE2_LOCAL_PLACE_FILE/);
  assert.match(workflow,/--local-only=true/);
  assert.doesNotMatch(workflow,/--place-id=\$env:/);
  assert.doesNotMatch(workflow,/--universe-id=\$env:/);
  assert.doesNotMatch(workflow,/RobloxPlayerBeta|RobloxPlayerLauncher|roblox-player/i);
  assert.match(workflow,/Local Place SHA256 mismatch/);
  assert.match(workflow,/company-development-roblox-studio-local-play\.mjs/);
});

