// 파일명: qa/unity-work-bridge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildAutonomousWorkOrder } from '../tools/autonomous-work-planner.mjs';
import { build24hAutonomousWorkOrder, selectContinuousTarget } from '../tools/autonomous-24h-work-planner.mjs';
import { ALLOWED_EXTENSIONS, assertSourcePath, parseModelCandidate, readContext } from '../tools/autonomous-development-worker.mjs';

const filesystem={existsSync:()=>true};
const unityProject={
  id:'P0006',slug:'daechung-rpg',name:'대충 RPG',sourcePath:'web-games/daechung-rpg',
  productionSourcePath:'unity-games/daechung-rpg',profileStatus:'RELEASE_CONFIRMED',mode:'UNITY_DEVELOP',
  productionTier:1,targetEngine:'unity-android',dedicatedDevelopmentLane:'UNITY_PRIMARY',unityProjectReady:true,
  developmentFocus:{total:8},protectedValues:['unity-primary','public-web-archive','save-key']
};
const portfolio={
  status:'ACTIVE',paidApi:false,maxModelCallsPerRun:2,maxRunnerMinutesPerRun:20,
  productionTierPolicy:{releaseConfirmedCount:2,developmentConfirmedCount:3},
  developmentFocusPolicy:{maxFocusedGames:1,focusStage:'RELEASE_CONFIRMED',fillVacantFocusedSlots:true,focusThreshold:0,nextDevelopmentThreshold:0,tier2WebPrototypeAllowedAlongsideUnityFocus:true},
  projects:[unityProject]
};
const artbooks={artbooks:[{id:'d1',gameId:'daechung-rpg',status:'completed-artbook',lifecycle:{state:'DEVELOPMENT_BASELINE'}}]};
const catalog={games:[{id:'daechung-rpg',homepageCategory:'release-confirmed'}]};

test('clean Tier1 Unity deep-focus becomes actionable work instead of NO_ACTIONABLE_WORK',()=>{
  const order=buildAutonomousWorkOrder({portfolio,artbooks,health:{games:[]},catalog,diagnostics:{'daechung-rpg':{issues:[],topIssue:null}},queueState:{version:2,attempts:[]},date:'2026-09-11',filesystem,priorityGameId:'daechung-rpg'});
  assert.equal(order.run,true);
  assert.equal(order.selectedReason,'UNITY_DEEP_FOCUS_IMPLEMENTATION');
  assert.equal(order.sourcePath,'unity-games/daechung-rpg');
  assert.equal(order.archiveSourcePath,'web-games/daechung-rpg');
  assert.equal(order.executionEngine,'unity-android');
  assert.equal(order.microTask,null);
  assert.equal(order.verificationContract.requiresAndroidEvidence,true);
  assert.deepEqual(order.verificationContract.requiredEvidence,['build','install','launch','runtime','save','update-install']);
  assert.match(order.goal,/기존 장비 UI 연결/);
  assert.match(order.goal,/GameCore/);
});

test('24h selector and order execute Tier1 Unity lane directly',()=>{
  const target=selectContinuousTarget({portfolio,artbooks,catalog,queueState:{version:2,attempts:[]},date:'2026-09-11',filesystem,priorityGameId:'daechung-rpg'});
  assert.equal(target.project.id,'P0006');
  assert.equal(target.projectLane,'TIER1_UNITY_DEEP_FOCUS');
  const order=build24hAutonomousWorkOrder({portfolio,artbooks,health:{games:[]},catalog,diagnostics:{},queueState:{version:2,attempts:[]},date:'2026-09-11',filesystem,priorityGameId:'daechung-rpg'});
  assert.equal(order.run,true);
  assert.equal(order.workLane,'UNITY');
  assert.equal(order.continuous24h.mode,'TIER1_UNITY_DEEP_FOCUS');
  assert.equal(order.sourcePath,'unity-games/daechung-rpg');
  assert.deepEqual(order.implementationRoles,['development']);
});

test('Unity worker accepts bounded C# source and ignores generated cache folders',()=>{
  const root='unity-games/__unity-work-bridge-test__';
  fs.rmSync(root,{recursive:true,force:true});
  try{
    fs.mkdirSync(path.join(root,'Assets','Scripts'),{recursive:true});
    fs.mkdirSync(path.join(root,'Library'),{recursive:true});
    fs.mkdirSync(path.join(root,'Temp'),{recursive:true});
    fs.writeFileSync(path.join(root,'Assets','Scripts','GameCore.cs'),'public sealed class GameCore { public int Value => 1; }\n');
    fs.writeFileSync(path.join(root,'Library','Generated.cs'),'public class Generated {}\n');
    fs.writeFileSync(path.join(root,'Temp','Temp.cs'),'public class TempOnly {}\n');
    assert.equal(assertSourcePath(root),root);
    assert.equal(ALLOWED_EXTENSIONS.has('.cs'),true);
    const parsed=parseModelCandidate(JSON.stringify({summary:'small csharp edit',expectedEffect:'test',tests:['unity'],edits:[{path:'Assets/Scripts/GameCore.cs',find:'Value => 1',replace:'Value => 2'}]}));
    assert.equal(parsed.edits[0].path,'Assets/Scripts/GameCore.cs');
    const context=readContext(root,{preferredFiles:['Assets/Scripts/GameCore.cs']});
    assert.ok(context.files.some(file=>file.path==='Assets/Scripts/GameCore.cs'));
    assert.equal(context.files.some(file=>file.path.startsWith('Library/')),false);
    assert.equal(context.files.some(file=>file.path.startsWith('Temp/')),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
