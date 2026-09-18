import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildHistoricalPostReleaseFocusTask,buildPostReleaseFocusTask,feedPostReleaseFocus} from '../tools/vibe2-post-release-focus.mjs';

function setup(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-post-release-focus-'));
  const gameRoot=path.join(root,'roblox-games/demo');
  fs.mkdirSync(path.join(gameRoot,'server'),{recursive:true});
  fs.mkdirSync(path.join(gameRoot,'client'),{recursive:true});
  fs.mkdirSync(path.join(gameRoot,'shared'),{recursive:true});
  fs.writeFileSync(path.join(gameRoot,'server/Game.server.luau'),'return {}\n');
  fs.writeFileSync(path.join(gameRoot,'client/Game.client.luau'),'return {}\n');
  fs.writeFileSync(path.join(gameRoot,'shared/GameConfig.luau'),'return {}\n');
  const roadmap={developmentLifecycleMachine:{postReleaseFocusedDevelopment:{enabled:true,priorities:['gameplay-completeness','content-depth','roblox-native-ux']}}};
  const item={gameId:'demo',selectedPlatform:'ROBLOX',targetPlatform:'ROBLOX',robloxProjectPath:'roblox-games/demo',robloxSourceCommit:'a'.repeat(40),robloxBuildArtifactIdentity:'sha256:'+'b'.repeat(64),robloxReleaseClaim:true,robloxFinalReviewPassed:true,robloxRegressionPassed:true,robloxExactRevisionPassed:true,robloxReleaseEvidence:{published:true,sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),versionNumber:7}};
  const recombination={recipes:[{id:'r1',sourceProjects:['x','y'],featureBlend:['loop','ux'],transformationOperator:'change-session-structure'}]};
  return{root,roadmap,item,recombination};
}

{
  const {root,roadmap,item,recombination}=setup();
  const task=buildPostReleaseFocusTask({item,repoRoot:root,roadmap,recombination,existingTasks:[]});
  assert(task);
  assert.equal(task.target,'roblox');
  assert.equal(task.releaseState,'release-confirmed');
  assert.equal(task.postReleaseFocused,true);
  assert.equal(task.packageLongWorkProtected,true);
  assert.equal(task.packageRole,'implementation-owner');
  assert.equal(task.priority,'critical');
  assert.equal(task.responsibleFiles.length,3);
  assert.match(task.goal,/POST_RELEASE_FOCUSED_DEVELOPMENT/);
  assert(task.evidence.some(x=>x==='recombination-recipe:r1'));
}

{
  const {root,roadmap,item,recombination}=setup();
  const roadmapFile=path.join(root,'roadmap.json'),runtimeFile=path.join(root,'runtime.json'),queueFile=path.join(root,'queue.json'),memoryFile=path.join(root,'recomb.json');
  fs.writeFileSync(roadmapFile,JSON.stringify(roadmap));fs.writeFileSync(runtimeFile,JSON.stringify({items:[item]}));fs.writeFileSync(queueFile,JSON.stringify({maxConcurrentTasks:20,tasks:[]}));fs.writeFileSync(memoryFile,JSON.stringify(recombination));
  const first=feedPostReleaseFocus({roadmapFile,companyRuntimeQueueFile:runtimeFile,queueFile,recombinationFile:memoryFile,repoRoot:root});
  assert.equal(first.added,true);
  assert.equal(first.queue.tasks.length,1);
  const second=feedPostReleaseFocus({roadmapFile,companyRuntimeQueueFile:runtimeFile,queueFile,recombinationFile:memoryFile,repoRoot:root});
  assert.equal(second.added,false);
  assert.equal(second.reason,'PROTECTED_SLOT_OCCUPIED');
  assert.equal(JSON.parse(fs.readFileSync(queueFile,'utf8')).tasks.length,1);
}

{
  const {root,roadmap,item,recombination}=setup();
  const task=buildPostReleaseFocusTask({item:{...item,robloxReleaseClaim:false},repoRoot:root,roadmap,recombination,existingTasks:[]});
  assert.equal(task,null);
}

{
  const {root,roadmap,recombination}=setup();
  const sourceRoot=path.join(root,'roblox-games/historical');
  fs.mkdirSync(path.join(sourceRoot,'server'),{recursive:true});
  fs.mkdirSync(path.join(sourceRoot,'client'),{recursive:true});
  fs.mkdirSync(path.join(sourceRoot,'shared'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'server/Game.server.luau'),'return {}\n');
  fs.writeFileSync(path.join(sourceRoot,'client/Game.client.luau'),'return {}\n');
  fs.writeFileSync(path.join(sourceRoot,'shared/GameConfig.luau'),'return {}\n');
  const entry={
    gameId:'historical',
    sourceRoot:'roblox-games/historical',
    historicalSourceRevision:'c'.repeat(40),
    artifactIdentity:'sha256:'+'d'.repeat(64),
    maintenanceEligible:true,
    currentReleaseClaim:false,
    evidence:{actualStudioRuntime:true,postRuntimeIndependentQa:true,regression:true,publicationTargetObserved:true,universeId:'123',placeId:'456',observedAt:'2026-09-15'}
  };
  const task=buildHistoricalPostReleaseFocusTask({entry,repoRoot:root,roadmap,recombination,existingTasks:[]});
  assert(task);
  assert.equal(task.target,'roblox');
  assert.equal(task.releaseState,'development-confirmed');
  assert.equal(task.postReleaseFocused,true);
  assert.equal(task.historicalDeploymentRecovery,true);
  assert.equal(task.priority,'critical');
  assert(task.evidence.includes('historical-current-release-claim:NO'));
  assert(task.evidence.includes('historical-publication-universe:123'));
  assert.match(task.goal,/HISTORICAL_ROBLOX_SUSTAINED_MAINTENANCE/);
  assert.match(task.goal,/자동 재배포는 금지/);
}

{
  const registry=JSON.parse(fs.readFileSync('company-learning/roblox-sustained-maintenance.json','utf8'));
  const lantern=registry.assets.find(x=>x.gameName==='Last Lantern');
  assert.equal(registry.assets.some(x=>x.gameName==='Vector Clash'),false);
  assert.equal(registry.assets.some(x=>x.gameName==='Skyline Rush'),false);
  assert.deepEqual(registry.permanentRemovalGuard.ids,[
    'seed-roblox-battleground-fight-welcome-to-bloxburg',
    'seed-roblox-obby-party-minigam-tower-of-hell'
  ]);
  assert.equal(registry.permanentRemovalGuard.recoveryAllowed,false);
  assert.equal(registry.permanentRemovalGuard.maintenanceAllowed,false);
  assert.equal(lantern.maintenanceEligible,false);
  assert.equal(lantern.evidence.publicationTargetObserved,false);
  assert.equal(lantern.blocker,'PUBLICATION_TARGET_EVIDENCE_MISSING');
}

{
  const {root,roadmap,item,recombination}=setup();
  roadmap.permanentProjectRemoval={ids:['demo'],reentryAllowed:false,automaticRecoveryAllowed:false,automaticMaintenanceAllowed:false};
  assert.equal(buildPostReleaseFocusTask({item,repoRoot:root,roadmap,recombination,existingTasks:[]}),null);
  const historical={gameId:'demo',sourceRoot:'roblox-games/demo',maintenanceEligible:true,currentReleaseClaim:false,evidence:{actualStudioRuntime:true,postRuntimeIndependentQa:true,regression:true,publicationTargetObserved:true,universeId:'1',placeId:'2'}};
  assert.equal(buildHistoricalPostReleaseFocusTask({entry:historical,repoRoot:root,roadmap,recombination,existingTasks:[]}),null);
}

{
  const {root,roadmap,recombination}=setup();
  const sourceRoot=path.join(root,'roblox-games/historical');
  fs.mkdirSync(path.join(sourceRoot,'server'),{recursive:true});
  fs.writeFileSync(path.join(sourceRoot,'server/Game.server.luau'),'return {}\n');
  const entry={gameId:'historical',sourceRoot:'roblox-games/historical',historicalSourceRevision:'c'.repeat(40),artifactIdentity:'sha256:'+'d'.repeat(64),maintenanceEligible:true,currentReleaseClaim:false,evidence:{actualStudioRuntime:true,postRuntimeIndependentQa:true,regression:true,publicationTargetObserved:true,universeId:'123',placeId:'456',observedAt:'2026-09-15'}};
  const roadmapFile=path.join(root,'roadmap.json'),runtimeFile=path.join(root,'runtime.json'),registryFile=path.join(root,'registry.json'),queueFile=path.join(root,'queue.json'),memoryFile=path.join(root,'recomb.json');
  fs.writeFileSync(roadmapFile,JSON.stringify(roadmap));fs.writeFileSync(runtimeFile,JSON.stringify({items:[]}));fs.writeFileSync(registryFile,JSON.stringify({assets:[entry]}));fs.writeFileSync(queueFile,JSON.stringify({maxConcurrentTasks:20,tasks:[]}));fs.writeFileSync(memoryFile,JSON.stringify(recombination));
  const first=feedPostReleaseFocus({roadmapFile,companyRuntimeQueueFile:runtimeFile,historicalRegistryFile:registryFile,queueFile,recombinationFile:memoryFile,repoRoot:root});
  assert.equal(first.added,true);
  assert.equal(first.reason,'HISTORICAL_ROBLOX_MAINTENANCE_QUEUED');
  assert.equal(first.task.historicalDeploymentRecovery,true);
  const occupied=feedPostReleaseFocus({roadmapFile,companyRuntimeQueueFile:runtimeFile,historicalRegistryFile:registryFile,queueFile,recombinationFile:memoryFile,repoRoot:root});
  assert.equal(occupied.added,false);
  assert.equal(occupied.reason,'PROTECTED_SLOT_OCCUPIED');
}

{
  const runner=fs.readFileSync('.github/workflows/vibe2-24h-runner.yml','utf8');
  assert.equal((runner.match(/VIBE2_24H_REFILL=WORKFLOW_DISPATCH/g)||[]).length,1);
  const post=runner.indexOf(`VIBE2_POST_RELEASE_FOCUS_ADDED=YES$`);
  const memory=runner.indexOf(`VIBE2_AUTHORIZED_SOURCE_MEMORY_ADDED=YES$`);
  const baseline=runner.indexOf(`VIBE2_RELEASE_BASELINE_GAP_PLAN=YES$`);
  const planner=runner.indexOf(`VIBE2_AUTO_PLAN=YES$`);
  assert.ok(post>=0&&memory>post&&baseline>memory&&planner>baseline);
  assert.match(runner,/--historical-registry=\/tmp\/vibe2-main\/company-learning\/roblox-sustained-maintenance\.json/);
  assert.match(runner,/company-learning\/roblox-sustained-maintenance\.json/);
  assert.match(runner,/commit_message='vibe2: queue post-release focused development \[skip ci\]'/);
  assert.match(runner,/commit_message='vibe2: ingest authorized Block Blast learning memory \[skip ci\]'/);
  assert.match(runner,/commit_message='vibe2: queue release baseline implementation gap \[skip ci\]'/);
  assert.match(runner,/commit_message='vibe2: plan next machine-state work \[skip ci\]'/);
  const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  const focus=roadmap.developmentLifecycleMachine.postReleaseFocusedDevelopment;
  assert.equal(focus.generatedTaskContract.priority,'critical');
  assert.deepEqual(focus.machinePriorityOrder.slice(0,3),['owner-directive','post-release-focused-development','release-confirmed']);
  assert.equal(focus.learningRunsInParallel,true);
  assert.equal(focus.historicalDeploymentRecovery.enabled,true);
  assert.equal(focus.historicalDeploymentRecovery.maxActiveHistoricalMaintenanceTasks,1);
  assert.equal(focus.historicalDeploymentRecovery.currentReleaseClaimMustNotBeInvented,true);
  assert.equal(focus.historicalDeploymentRecovery.automaticRepublish,false);
}

console.log('PASS post-release Roblox focused development feeder enforces exact published release and one source cycle');
