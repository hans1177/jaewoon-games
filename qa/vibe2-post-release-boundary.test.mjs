import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {feedPostReleaseFocus} from '../tools/vibe2-post-release-focus.mjs';

const sha='a'.repeat(40);
const artifact='sha256:'+'b'.repeat(64);

function mk(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post-release-boundary-'));
  fs.mkdirSync(path.join(root,'roblox-games/g/server'),{recursive:true});
  fs.writeFileSync(path.join(root,'roblox-games/g/server/Game.server.luau'),'print("ok")\n');
  const files={
    roadmap:path.join(root,'roadmap.json'),
    runtime:path.join(root,'runtime.json'),
    hist:path.join(root,'hist.json'),
    queue:path.join(root,'queue.json'),
    recomb:path.join(root,'recomb.json'),
    exposure:path.join(root,'exposure.json')
  };
  fs.writeFileSync(files.roadmap,JSON.stringify({
    developmentLifecycleMachine:{
      internalPlatformReleaseAndPublicExposureGate:{activatedAt:'2026-09-21T00:00:00Z'},
      postReleaseFocusedDevelopment:{enabled:true,priorities:[]}
    }
  }));
  fs.writeFileSync(files.hist,JSON.stringify({assets:[]}));
  fs.writeFileSync(files.queue,JSON.stringify({tasks:[]}));
  fs.writeFileSync(files.recomb,JSON.stringify({recipes:[]}));
  return{root,files};
}
function releasedItem(extra={}){
  return {
    gameId:'g',selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',
    robloxProjectPath:'roblox-games/g',robloxSourceCommit:sha,
    robloxBuildArtifactIdentity:artifact,robloxReleaseClaim:true,
    robloxFinalReviewPassed:true,robloxRegressionPassed:true,robloxExactRevisionPassed:true,
    robloxReleaseEvidence:{published:true,sourceRevision:sha,artifactIdentity:artifact,versionNumber:1,...extra},
  };
}
function run(ctx,item,exposure){
  fs.writeFileSync(ctx.files.runtime,JSON.stringify({items:[item]}));
  fs.writeFileSync(ctx.files.exposure,JSON.stringify(exposure));
  return feedPostReleaseFocus({
    roadmapFile:ctx.files.roadmap,companyRuntimeQueueFile:ctx.files.runtime,
    historicalRegistryFile:ctx.files.hist,queueFile:ctx.files.queue,
    recombinationFile:ctx.files.recomb,exposureFile:ctx.files.exposure,repoRoot:ctx.root
  });
}
test('internal platform release enters focused development as a release',()=>{
  const c=mk();
  const r=run(c,releasedItem({publishedAt:'2026-09-21T10:00:00Z'}),{
    games:[{gameId:'g',externalPublicReleaseState:'INTERNAL_ONLY',platforms:[{platform:'ROBLOX',internalReleaseReady:true,internalReleaseState:'PRIVATE_OR_RESTRICTED_TEST_EXPERIENCE',placeId:'123'}]}]
  });
  assert.equal(r.added,true);
  assert.equal(r.task.postReleaseFocused,true);
  assert.equal(r.task.releaseState,'release-confirmed');
  assert.ok(r.task.evidence.includes('focus-release-kind:INTERNAL_PLATFORM_RELEASE'));
  assert.ok(r.task.evidence.includes('internal-release-focused:yes'));
});
test('verified private Roblox publication counts as internal release for focus',()=>{
  const c=mk();
  const item={
    gameId:'g',selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',
    robloxProjectPath:'roblox-games/g',
    robloxDedicatedExperiencePublished:true,
    robloxPublicationTarget:{verified:true,placeId:'123'}
  };
  const r=run(c,item,{games:[{gameId:'g',externalPublicReleaseState:'INTERNAL_ONLY'}]});
  assert.equal(r.added,true);
  assert.equal(r.task.releaseState,'release-confirmed');
  assert.ok(r.task.evidence.includes('focus-release-kind:INTERNAL_PLATFORM_RELEASE'));
});

test('all eligible internal-release Roblox caretakers are queued in one focus cycle',()=>{
  const c=mk();
  fs.mkdirSync(path.join(c.root,'roblox-games/h/server'),{recursive:true});
  fs.writeFileSync(path.join(c.root,'roblox-games/h/server/Game.server.luau'),'print("ok-h")\n');
  const item=id=>({
    gameId:id,selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',
    robloxProjectPath:`roblox-games/${id}`,
    robloxDedicatedExperiencePublished:true,
    robloxPublicationTarget:{verified:true,placeId:id==='g'?'123':'456'},
    ownerPrimaryRank:id==='g'?1:2
  });
  fs.writeFileSync(c.files.runtime,JSON.stringify({items:[item('g'),item('h')]}));
  fs.writeFileSync(c.files.exposure,JSON.stringify({games:[]}));
  const r=feedPostReleaseFocus({
    roadmapFile:c.files.roadmap,companyRuntimeQueueFile:c.files.runtime,
    historicalRegistryFile:c.files.hist,queueFile:c.files.queue,
    recombinationFile:c.files.recomb,exposureFile:c.files.exposure,repoRoot:c.root
  });
  assert.equal(r.added,true);
  assert.equal(r.tasks.length,2);
  assert.deepEqual(r.tasks.map(x=>x.gameId),['g','h']);
  assert.ok(r.tasks.every(x=>x.postReleaseFocused===true&&x.priority==='critical'));
});
test('private runtime candidate without internal release is not release-focused',()=>{
  const c=mk();
  const r=run(c,releasedItem({publishedAt:'2026-09-21T10:00:00Z'}),{
    games:[{gameId:'g',externalPublicReleaseState:'INTERNAL_ONLY',platforms:[{platform:'ROBLOX',internalReleaseReady:false,internalReleaseState:'NOT_READY'}]}]
  });
  assert.equal(r.added,false);
  assert.equal(r.reason,'NO_RELEASED_OR_HISTORICAL_ROBLOX');
});
test('public release state can enter post-public update engine',()=>{
  const c=mk();
  const r=run(c,releasedItem({publishedAt:'2026-09-21T10:00:00Z'}),{
    games:[{gameId:'g',externalPublicReleaseState:'PUBLIC_RELEASE'}]
  });
  assert.equal(r.added,true);
  assert.equal(r.task.postReleaseFocused,true);
  assert.equal(r.task.retryPolicy,'UNLIMITED_CAUSAL_REPAIR');
});
test('verified public release from before gate activation remains eligible',()=>{
  const c=mk();
  const r=run(c,releasedItem({publishedAt:'2026-09-20T10:00:00Z'}),{games:[]});
  assert.equal(r.added,true);
  assert.equal(r.task.postReleaseFocused,true);
});
