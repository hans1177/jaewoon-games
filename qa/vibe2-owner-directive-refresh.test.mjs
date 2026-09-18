import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {queueReleaseBaselineGap} from '../tools/vibe2-release-baseline-queue.mjs';

const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));

function currentDirective(){
  return {
    id:'OWNER-FULL-REBUILD-CHESS-BATTLE-20260916',
    gameId:'chess-battle',
    title:'체스 배틀',
    sourceRoot:'web-games/chess-battle',
    responsibleFiles:['web-games/chess-battle/index.html'],
    priority:'critical',
    workUnits:5,
    status:'pending',
    goal:'[OWNER_IMMEDIATE_WEB_FIRST] FULL_WEB_GAME_REBUILD. SOURCE_ROOT_BOOTSTRAP_ALLOWED. 실제 체스 배틀을 전면 재구축한다.',
    evidence:['owner-selected:2026-09-16','rebuild-scope:single-game-root','source-root-bootstrap-authorized']
  };
}

test('changed owner full-rebuild directive refreshes stale task and resets failed execution state once',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-owner-refresh-'));
  const catalogFile=path.join(root,'game-catalog.json');
  const queueFile=path.join(root,'.vibe2','queue.json');
  const directivesFile=path.join(root,'.vibe2','owner-directives.json');
  write(catalogFile,{version:1,games:[]});
  write(queueFile,{version:5,maxConcurrentTasks:20,tasks:[{
    id:'OWNER-FULL-REBUILD-CHESS-BATTLE-20260916',gameId:'chess-battle',target:'web',department:'development',type:'implementation',
    goal:'[OWNER_IMMEDIATE_WEB_FIRST] FULL_WEB_GAME_REBUILD. old goal',responsibleFiles:['web-games/chess-battle/index.html'],dependencies:[],
    priority:'critical',releaseState:'development-confirmed',status:'failed',retries:3,maxRetries:2,ownerDirective:true,requiresOwnerDecision:false,
    protectedChange:false,paidResourceRequired:false,sourceRoot:'web-games/chess-battle',estimatedRisk:'high',speculativeEligible:false,
    fullRebuild:true,rebuildMode:'FULL_REBUILD',workUnits:5,taskWorkUnits:0,
    evidence:['central-policy:COMPANY_FLOW.md','owner-directive:full-web-game-rebuild','source-root:web-games/chess-battle'],
    blocker:'source-candidate-generation-failed',lastOutcome:'FAIL'
  }]});
  write(directivesFile,{version:1,directives:[currentDirective()]});

  const first=queueReleaseBaselineGap({catalogFile,queueFile,repoRoot:root,ownerDirectivesFile:directivesFile});
  assert.deepEqual(first.ownerRefreshed.map(x=>x.id),['OWNER-FULL-REBUILD-CHESS-BATTLE-20260916']);
  let task=read(queueFile).tasks.find(x=>x.id==='OWNER-FULL-REBUILD-CHESS-BATTLE-20260916');
  assert.match(task.goal,/SOURCE_ROOT_BOOTSTRAP_ALLOWED/);
  assert.equal(task.status,'queued');
  assert.equal(task.retries,0);
  assert.equal(task.blocker,undefined);
  assert.equal(task.lastOutcome,undefined);
  assert.ok(task.evidence.includes('source-root-bootstrap-authorized'));

  const queue=read(queueFile);
  task=queue.tasks.find(x=>x.id==='OWNER-FULL-REBUILD-CHESS-BATTLE-20260916');
  task.status='running';
  task.retries=1;
  task.blocker='worker-active';
  write(queueFile,queue);

  const second=queueReleaseBaselineGap({catalogFile,queueFile,repoRoot:root,ownerDirectivesFile:directivesFile});
  assert.deepEqual(second.ownerRefreshed,[]);
  task=read(queueFile).tasks.find(x=>x.id==='OWNER-FULL-REBUILD-CHESS-BATTLE-20260916');
  assert.equal(task.status,'running');
  assert.equal(task.retries,1);
  assert.equal(task.blocker,'worker-active');
});


test('existing Web directive refreshes stale full rebuild into exploration assessment',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-owner-assess-'));
  const catalogFile=path.join(root,'game-catalog.json');
  const queueFile=path.join(root,'.vibe2','queue.json');
  const directivesFile=path.join(root,'.vibe2','owner-directives.json');
  write(catalogFile,{version:1,games:[]});
  write(queueFile,{version:5,maxConcurrentTasks:20,tasks:[{
    id:'OWNER-FULL-REBUILD-CELESTIAL-BASTION-20260916',gameId:'seed-single-defense-strat-celestial-bastion',
    target:'web',department:'development',type:'implementation',goal:'FULL_WEB_GAME_REBUILD old',
    responsibleFiles:['web-games/seed-single-defense-strat-celestial-bastion/index.html'],dependencies:[],
    priority:'critical',releaseState:'development-confirmed',status:'queued',retries:0,maxRetries:2,ownerDirective:true,
    requiresOwnerDecision:false,protectedChange:false,paidResourceRequired:false,sourceRoot:'web-games/seed-single-defense-strat-celestial-bastion',
    estimatedRisk:'high',speculativeEligible:false,fullRebuild:true,rebuildMode:'FULL_REBUILD',workUnits:5,taskWorkUnits:5,
    evidence:['central-policy:COMPANY_FLOW.md','owner-directive:full-web-game-rebuild','source-root:web-games/seed-single-defense-strat-celestial-bastion']
  }]});
  write(directivesFile,{version:1,directives:[{
    id:'OWNER-FULL-REBUILD-CELESTIAL-BASTION-20260916',gameId:'seed-single-defense-strat-celestial-bastion',
    sourceRoot:'web-games/seed-single-defense-strat-celestial-bastion',
    responsibleFiles:['web-games/seed-single-defense-strat-celestial-bastion/index.html'],
    priority:'critical',workUnits:5,status:'pending',mode:'ASSESS_EXISTING_WEB',
    goal:'[EXISTING_WEB_ASSESS_AND_IMPLEMENT] read existing source first',
    evidence:['source-existing:web-companion','assessment-strategy:VIBE_EXPLORATION']
  }]});
  const result=queueReleaseBaselineGap({catalogFile,queueFile,repoRoot:root,ownerDirectivesFile:directivesFile});
  assert.deepEqual(result.ownerRefreshed.map(x=>x.id),['OWNER-FULL-REBUILD-CELESTIAL-BASTION-20260916']);
  const task=read(queueFile).tasks.find(x=>x.id==='OWNER-FULL-REBUILD-CELESTIAL-BASTION-20260916');
  assert.equal(task.status,'queued');
  assert.equal(task.fullRebuild,false);
  assert.equal(task.rebuildMode,'ASSESS_EXISTING_WEB');
  assert.ok(task.evidence.includes('owner-directive:existing-web-assessment'));
  assert.ok(task.evidence.includes('strategy-decision:EXPLORATION'));
  assert.ok(task.evidence.includes('central-policy:company-learning/platform-release-roadmap.json'));
  assert.equal(task.evidence.includes('owner-directive:full-web-game-rebuild'),false);
});
