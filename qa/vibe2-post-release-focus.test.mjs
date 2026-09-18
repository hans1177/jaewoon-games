import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildPostReleaseFocusTask,feedPostReleaseFocus} from '../tools/vibe2-post-release-focus.mjs';

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
  assert.equal(task.priority,'high');
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
  assert.equal(second.reason,'NO_NEW_SOURCE_CYCLE');
  assert.equal(JSON.parse(fs.readFileSync(queueFile,'utf8')).tasks.length,1);
}

{
  const {root,roadmap,item,recombination}=setup();
  const task=buildPostReleaseFocusTask({item:{...item,robloxReleaseClaim:false},repoRoot:root,roadmap,recombination,existingTasks:[]});
  assert.equal(task,null);
}

console.log('PASS post-release Roblox focused development feeder enforces exact published release and one source cycle');
