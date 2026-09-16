import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runVibe2ImplementationWorker } from '../tools/vibe2-implementation-worker.mjs';
import { verifyPerformanceSanity } from '../tools/vibe2-performance-sanity.mjs';

function git(cwd,args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}

function fixture(){
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-implementation-exploration-'));
  git(cwd,['init']);
  git(cwd,['config','user.email','qa@example.invalid']);
  git(cwd,['config','user.name','Vibe2 QA']);
  fs.writeFileSync(path.join(cwd,'README.md'),'fixture\n');
  git(cwd,['add','.']);
  git(cwd,['commit','-m','fixture']);
  git(cwd,['checkout','-b','vibe2/candidate/r5-exploration-handoff-test']);

  const taskId='OWNER-ROBLOX-OBBY-AUTONOMOUS-BALANCE-20260916-R5';
  const sourceRoot='roblox-games/seed-roblox-obby-party-minigam-tower-of-hell';
  const serverFile=`${sourceRoot}/server/Game.server.luau`;
  const clientFile=`${sourceRoot}/client/Game.client.luau`;
  fs.mkdirSync(path.join(cwd,sourceRoot,'server'),{recursive:true});
  fs.mkdirSync(path.join(cwd,sourceRoot,'client'),{recursive:true});
  fs.mkdirSync(path.join(cwd,'.vibe2'),{recursive:true});

  const blocks=[];
  for(let stage=1;stage<=12;stage+=1){
    const prefix=stage===1?'  if':stage===12?'  else\n    -- stage 12':'  elseif';
    if(stage===12){
      blocks.push(`${prefix}\n    addDisappearingPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.2), Vector3.new(8, 1, 7), accent, 0)`);
    }else if(stage===2){
      blocks.push(`${prefix} stage == ${stage} then\n    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.24, Vector3.new(0, 0, 4)), Vector3.new(9, 1, 9), neutral, Enum.Material.Concrete)\n    addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.50, Vector3.new(0, 0, -4)), Vector3.new(8, 1, 8), dark, Enum.Material.Concrete)\n    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.76, Vector3.new(0, 0, 4)), Vector3.new(8, 1, 8), neutral, Enum.Material.Concrete)`);
    }else{
      blocks.push(`${prefix} stage == ${stage} then\n    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.3), Vector3.new(9, 1, 8), neutral, Enum.Material.Metal)`);
    }
  }
  const server=`local course = Instance.new("Model")\ncourse:SetAttribute("MapRevision", "R4")\nfor stage = 1, 12 do\n${blocks.join('\n')}\n  -- Preserve the original per-stage hazard naming contract while placing danger below the route.\nend\n`;
  fs.writeFileSync(path.join(cwd,serverFile),server);
  fs.writeFileSync(path.join(cwd,clientFile),'-- client unchanged\n');

  const selectedTask={
    id:taskId,
    gameId:'seed-roblox-obby-party-minigam-tower-of-hell',
    target:'roblox',
    ownerDirective:true,
    goal:'PHASE_4_AUTONOMOUS_PLAYTEST_BALANCE',
    responsibleFiles:[serverFile,clientFile],
    evidence:['development-phase:autonomous-playtest-balance']
  };
  const order={
    run:true,
    workMode:'source-change-candidate',
    executionRoute:'text-source-worker',
    taskId,
    gameId:selectedTask.gameId,
    target:'roblox',
    goal:selectedTask.goal,
    priority:'critical',
    releaseState:'development-confirmed',
    selectedTask,
    source:{root:sourceRoot,responsibleFiles:[serverFile,clientFile]},
    workerPolicy:{directMainWrite:false}
  };
  fs.writeFileSync(path.join(cwd,'.vibe2','work-order.json'),JSON.stringify(order,null,2));

  const exploration={
    version:1,
    role:'exploration',
    sourceWrite:false,
    reused:false,
    taskId,
    target:'roblox',
    sourceRoot,
    baseMainSha:'main-sha',
    responsibleFiles:['server/Game.server.luau','client/Game.client.luau'],
    impactFiles:['server/Game.server.luau','client/Game.client.luau'],
    contextFiles:['server/Game.server.luau','client/Game.client.luau'],
    relatedFiles:[],
    testTargets:[],
    protectedScopeSignals:[],
    diagnosticEvidence:[],
    fileDigests:[],
    reuseKey:'qa-exploration-handoff'
  };
  const explorationFile=path.join(cwd,'.vibe2','exploration.json');
  fs.writeFileSync(explorationFile,JSON.stringify(exploration,null,2));

  const stages=Array.from({length:12},(_,i)=>({stage:i+1,success:true,elapsedMs:1000,retries:0,deaths:0,stalledMs:0}));
  stages[1]={stage:2,success:false,elapsedMs:17815,retries:3,deaths:3,stalledMs:0,failedTarget:'Step02C:dead'};
  const telemetry={
    version:1,
    authority:'vibe2-roblox-skyline-input-playtest',
    runtimeVerified:true,
    inputBased:true,
    inputProfile:'keyboard-default-movement',
    capabilities:{virtualInput:true,studioTestService:true},
    baseMainSha:'main-sha',
    metrics:{inputActions:76,jumpCount:25,deaths:3,retries:3,stalledMs:0},
    stages
  };
  const evidenceFile=path.join(cwd,'telemetry.json');
  fs.writeFileSync(evidenceFile,JSON.stringify(telemetry,null,2));
  return{cwd,sourceRoot,explorationFile,evidenceFile};
}

test('implementation binds the reusable exploration artifact so R5 performance sanity can pass',async()=>{
  const f=fixture();
  const previousExploration=process.env.VIBE2_EXPLORATION_FILE;
  const previousBase=process.env.VIBE2_BASE_MAIN_SHA;
  try{
    process.env.VIBE2_EXPLORATION_FILE=f.explorationFile;
    process.env.VIBE2_BASE_MAIN_SHA='main-sha';
    const result=await runVibe2ImplementationWorker({cwd:f.cwd,applySource:true,evidenceFile:f.evidenceFile});
    assert.equal(result.manifest.exploration?.reuseKey,'qa-exploration-handoff');
    assert.equal(result.manifest.exploration?.sourceWrite,false);
    assert.equal(result.manifest.exploration?.reused,true);
    assert.deepEqual(result.manifest.telemetryEvidence.adjustment,{kind:'failed-platform-lateral-offset',target:'Step02C',before:4,after:0});
    const performance=verifyPerformanceSanity({root:f.cwd,manifest:result.manifest});
    assert.equal(performance.pass,true);
    assert.equal(performance.checks.find(row=>row.name==='exploration-handoff-present')?.pass,true);
    assert.equal(performance.checks.find(row=>row.name==='exploration-read-only')?.pass,true);
  }finally{
    if(previousExploration===undefined)delete process.env.VIBE2_EXPLORATION_FILE;else process.env.VIBE2_EXPLORATION_FILE=previousExploration;
    if(previousBase===undefined)delete process.env.VIBE2_BASE_MAIN_SHA;else process.env.VIBE2_BASE_MAIN_SHA=previousBase;
    fs.rmSync(f.cwd,{recursive:true,force:true});
  }
});
