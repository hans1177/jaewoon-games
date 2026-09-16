import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runVibe2DeterministicSourceWorker } from '../tools/vibe2-deterministic-source-worker.mjs';

function git(cwd,args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}

function makeFixture(){
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'vibe2-deterministic-'));
  git(cwd,['init']);
  git(cwd,['config','user.email','qa@example.invalid']);
  git(cwd,['config','user.name','Vibe2 QA']);
  fs.writeFileSync(path.join(cwd,'README.md'),'fixture\n');
  git(cwd,['add','.']);
  git(cwd,['commit','-m','fixture']);
  git(cwd,['checkout','-b','vibe2/candidate/deterministic-test']);
  const sourceRoot='roblox-games/seed-roblox-obby-party-minigam-tower-of-hell';
  fs.mkdirSync(path.join(cwd,sourceRoot,'server'),{recursive:true});
  fs.mkdirSync(path.join(cwd,sourceRoot,'client'),{recursive:true});
  fs.mkdirSync(path.join(cwd,'.vibe2'),{recursive:true});
  fs.writeFileSync(path.join(cwd,sourceRoot,'server/Game.server.luau'),'print("old button shell")\n');
  fs.writeFileSync(path.join(cwd,sourceRoot,'client/Game.client.luau'),'remote:FireServer("old-button")\n');
  const order={
    run:true,
    workMode:'source-change-candidate',
    taskId:'OWNER-ROBLOX-OBBY-WORLD-CORE-20260916-R2',
    gameId:'seed-roblox-obby-party-minigam-tower-of-hell',
    target:'roblox',
    goal:'Build physical 12-stage Roblox obby world core',
    priority:'critical',
    releaseState:'development-confirmed',
    source:{root:sourceRoot,responsibleFiles:[`${sourceRoot}/server/Game.server.luau`]},
    workerPolicy:{directMainWrite:false},
    developmentExecution:{executor:'deterministic-source-worker',recipe:'roblox-obby-world-core-v1',aiRequired:false,aiAssist:false},
    exploration:{reuseKey:'qa-fixture',sourceWrite:false,impactFiles:['server/Game.server.luau','client/Game.client.luau'],testTargets:['runtime']},
    designIntelligence:{version:1,implementationGate:{allowed:true,blockers:[]}}
  };
  fs.writeFileSync(path.join(cwd,'.vibe2/work-order.json'),`${JSON.stringify(order,null,2)}\n`);
  return{cwd,sourceRoot};
}

test('deterministic Roblox world core replaces server shell and legacy button HUD without AI',()=>{
  const {cwd,sourceRoot}=makeFixture();
  try{
    const manifest=runVibe2DeterministicSourceWorker({cwd,applySource:true});
    const serverFile=path.join(cwd,sourceRoot,'server/Game.server.luau');
    const clientFile=path.join(cwd,sourceRoot,'client/Game.client.luau');
    const source=fs.readFileSync(serverFile,'utf8');
    const client=fs.readFileSync(clientFile,'utf8');
    assert.equal(manifest.aiUsed,false);
    assert.equal(manifest.implementationExecutor,'deterministic-source-worker');
    assert.equal(manifest.deterministicRecipe,'roblox-obby-world-core-v1');
    assert.deepEqual(manifest.changedFiles,['server/Game.server.luau','client/Game.client.luau']);
    assert.match(source,/local STAGE_COUNT = 12/);
    assert.match(source,/local previousPosition = START_POSITION/);
    assert.match(source,/local segment = checkpointPosition - previousPosition/);
    assert.match(source,/local stepAPosition = previousPosition \+ segment \* \(1 \/ 3\)/);
    assert.match(source,/local stepBPosition = previousPosition \+ segment \* \(2 \/ 3\)/);
    assert.match(source,/previousPosition = checkpointPosition/);
    assert.match(source,/Checkpoint%02d/);
    assert.match(source,/stage ~= state\.stage \+ 1/);
    assert.match(source,/player:SetAttribute\("Position", stage\)/);
    assert.match(source,/player:SetAttribute\("Progress", math\.floor\(stage \/ STAGE_COUNT \* 100\)\)/);
    assert.match(source,/player:SetAttribute\("Score", stage \* 100\)/);
    assert.match(source,/player:SetAttribute\("Finished", true\)/);
    assert.match(source,/player:SetAttribute\("RoundTime"/);
    assert.match(source,/humanoid\.Health = 0/);
    assert.match(source,/remote\.OnServerEvent:Connect\(function\(_player, _actionId\)\s+return\s+end\)/s);
    assert.doesNotMatch(source,/scopeHandler[1-9]/);
    assert.doesNotMatch(source,/bridgeZ/);
    assert.match(client,/gui\.Name = "ObbyHud"/);
    assert.match(client,/Stage %d\/12/);
    assert.match(client,/RoundTime/);
    assert.match(client,/UserInputService\.TouchEnabled/);
    assert.doesNotMatch(client,/FireServer/);
    assert.doesNotMatch(client,/TextButton/);
    assert.ok(manifest.tests.includes('physically-connected-default-jump-course'));
    assert.ok(manifest.tests.includes('read-only-obby-progress-hud'));
    const manifestFile=path.join(cwd,'.vibe2/candidates/OWNER-ROBLOX-OBBY-WORLD-CORE-20260916-R2/manifest.json');
    assert.equal(fs.existsSync(manifestFile),true);
    const persisted=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
    assert.equal(persisted.aiUsed,false);
    assert.deepEqual(persisted.changedFiles,['server/Game.server.luau','client/Game.client.luau']);
  }finally{
    fs.rmSync(cwd,{recursive:true,force:true});
  }
});

test('deterministic worker refuses direct main branch writes',()=>{
  const {cwd}=makeFixture();
  try{
    git(cwd,['checkout','-b','main']);
    assert.throws(()=>runVibe2DeterministicSourceWorker({cwd,applySource:true}),/vibe2\/candidate/);
  }finally{
    fs.rmSync(cwd,{recursive:true,force:true});
  }
});
