import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runVibe2SourceWorker } from '../tools/vibe2-source-worker.mjs';

function tempRoot(){return fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-roblox-full-rebuild-'));}
function write(file,content){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content,'utf8');}

test('owner-authorized Roblox FULL_REBUILD accepts complete Lua and JSON replacements',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/seed-roblox-obby-party-minigam-tower-of-hell';
  const server='server/Game.server.luau';
  const config='shared/GameConfig.json';
  const serverReplacement=[
    "local Players = game:GetService('Players')",
    "local Workspace = game:GetService('Workspace')",
    "local course = Instance.new('Folder')",
    "course.Name = 'SkylineSprintCourse'",
    "course.Parent = Workspace",
    ...Array.from({length:24},(_,i)=>`local stage${i+1}=Instance.new('Part'); stage${i+1}.Name='Checkpoint${i+1}'; stage${i+1}.Anchored=true; stage${i+1}.Parent=course`),
    "Players.PlayerAdded:Connect(function(player) player:SetAttribute('Checkpoint',1) end)"
  ].join('\n');
  const configReplacement=JSON.stringify({
    gameId:'seed-roblox-obby-party-minigam-tower-of-hell',
    stageCount:24,
    checkpointRespawn:true,
    hazardReset:true,
    finishRequiresFinalGoal:true,
    mobileCompatible:true,
    progression:'physical-sequential-checkpoints'
  },null,2);
  write(path.join(cwd,root,server),'return { status = "prototype" }\n');
  write(path.join(cwd,root,config),'{}\n');
  const workOrder={
    run:true,
    workMode:'source-change-candidate',
    taskId:'OWNER-ROBLOX-OBBY-WORLD-CORE-20260916',
    gameId:'seed-roblox-obby-party-minigam-tower-of-hell',
    target:'roblox',
    goal:'FULL_ROBLOX_GAME_REBUILD FULL_REBUILD_PHASE_1_WORLD_CORE 실제 물리 오비 코스와 체크포인트 구현',
    department:'development',
    source:{root,responsibleFiles:[`${root}/${server}`,`${root}/${config}`]},
    qa:['syntax','checkpoint progression','hazard recovery'],
    workerPolicy:{directMainWrite:false},
    selectedTask:{
      ownerDirective:true,
      rebuildMode:'FULL_REBUILD',
      evidence:['owner-directive:full-roblox-game-rebuild']
    }
  };
  const responseFile=path.join(cwd,'model.json');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify(workOrder,null,2));
  write(responseFile,JSON.stringify({
    summary:'실제 공간형 오비 월드 코어 전체 교체',
    expectedEffect:'물리 코스와 순차 체크포인트 진행 제공',
    edits:[],
    newFiles:[],
    replaceFiles:[
      {path:server,content:serverReplacement},
      {path:config,content:configReplacement}
    ],
    tests:['checkpoint progression','hazard recovery','mobile/runtime']
  }));
  const result=await runVibe2SourceWorker({cwd,responseFile});
  assert.equal(result.target,'roblox');
  assert.equal(result.fullFileRewriteAllowed,true);
  assert.deepEqual(result.changedFiles,[server,config]);
  assert.match(fs.readFileSync(path.join(cwd,'.vibe2/candidates/OWNER-ROBLOX-OBBY-WORLD-CORE-20260916/files',server),'utf8'),/SkylineSprintCourse/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(cwd,'.vibe2/candidates/OWNER-ROBLOX-OBBY-WORLD-CORE-20260916/files',config),'utf8')).finishRequiresFinalGoal,true);
});

test('ordinary Roblox maintenance cannot use replaceFiles',async()=>{
  const cwd=tempRoot();
  const root='roblox-games/demo';
  const server='server/Game.server.luau';
  write(path.join(cwd,root,server),'local value = 1\n');
  write(path.join(cwd,'.vibe2/work-order.json'),JSON.stringify({
    run:true,
    workMode:'source-change-candidate',
    taskId:'roblox-maintenance',
    gameId:'demo',
    target:'roblox',
    goal:'일반 오류 수정',
    department:'development',
    source:{root,responsibleFiles:[`${root}/${server}`]},
    qa:['syntax'],
    workerPolicy:{directMainWrite:false}
  },null,2));
  const responseFile=path.join(cwd,'model.json');
  write(responseFile,JSON.stringify({replaceFiles:[{path:server,content:'local rebuilt = true\n'.repeat(60)}]}));
  await assert.rejects(runVibe2SourceWorker({cwd,responseFile}),/전체 파일 교체는 명시적으로 승인된 FULL_REBUILD/);
});