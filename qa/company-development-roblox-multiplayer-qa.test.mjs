// 파일명: qa/company-development-roblox-multiplayer-qa.test.mjs
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRobloxMultiplayerSourceContract} from '../tools/company-development-roblox-runtime-foundation.mjs';

test('all native multiplayer completion gates use static source evidence and never fabricate actual participants',()=>{
  const policy=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.completionEvidence,'EXACT_SOURCE_STATIC_MULTIPLAYER_CONTRACT');
  assert.equal(policy.directNativeDualPlatformDevelopment.multiplayerImplementation.runtimeExecutionRequired,false);
  assert.equal(policy.unityWebFirstStage.multiplayer.actualTwoOrMorePlayersRequiredWhenMultiplayerDesigned,false);
  for(const file of ['unity-web-first-stage-build.yml','company-development-unity-runtime.yml']){
    const source=fs.readFileSync('.github/workflows/'+file,'utf8');
    assert.match(source,/auditUnityWebNativeSystems/);
    assert.match(source,/MULTIPLAYER_VERIFICATION_SCOPE=STATIC_CODE_CONTRACT/);
    assert.doesNotMatch(source,/const multiplayerPass[^;]*participantCount/s);
    assert.match(source,/sourceRevision===process\.env\.SOURCE_(?:COMMIT|REVISION)/);
  }
});

test('separate Roblox two-client Studio workflow remains disabled',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-multiplayer-qa.yml','utf8');
  assert.match(workflow,/Multiplayer Studio QA \(Disabled\)/);
  assert.match(workflow,/ROBLOX_STUDIO_MULTIPLAYER_QA=REMOVED/);
  assert.match(workflow,/disabled:\s*\n(?:\s*#[^\n]*\n)*\s*if: false/);
  assert.doesNotMatch(workflow,/self-hosted, Windows, X64, roblox-studio-authenticated/);
});

test('multiplayer release gate passes from authoritative two-participant source contract',()=>{
  const server=[
    'local participants=Players:GetPlayers()',
    'if #participants>=2 then shared=shared+1 end',
    'remote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})',
  ].join('\n');
  const client=[
    'remote.OnClientEvent:Connect(function(kind,snapshot)',
    ' if kind~="MULTIPLAYER_SYNC" then return end',
    ' local participantCount=snapshot.ParticipantCount',
    'end)',
  ].join('\n');
  const result=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
  assert.equal(result.passed,true);
  assert.equal(result.runtimeTwoClientExecutionRequired,false);
});

test('multiplayer code gate accepts roster-count broadcast without requiring a literal >=2 branch',()=>{
  const server='local participants=Players:GetPlayers()\nremote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})';
  const client='remote.OnClientEvent:Connect(function(kind,payload) if kind=="MULTIPLAYER_SYNC" then local n=payload.ParticipantCount end end)';
  const result=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
  assert.equal(result.passed,true);
  assert.equal(result.checks.twoParticipantCapablePath,true);
});

test('multiplayer code gate still rejects missing client sync handler',()=>{
  const server='local participants=Players:GetPlayers()\nremote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})';
  assert.equal(validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:'print("no sync handler")'}).passed,false);
});

test('common multiplayer worker has a verifiable static-only contract on free Workers',()=>{
  const worker=fs.readFileSync('multiplayer/worker.js','utf8');
  const client=fs.readFileSync('multiplayer/multiplayer-client.js','utf8');
  for(const [name,source] of [['worker',worker],['client',client]]){
    const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
    assert.equal(result.status,0,name+': '+result.stderr);
  }
  const config=fs.readFileSync('multiplayer/wrangler.toml','utf8');
  assert.match(config,/^main\s*=\s*"worker\.js"\s*$/m);
  assert.match(config,/^workers_dev\s*=\s*true\s*$/m);
  assert.match(config,/new_sqlite_classes\s*=\s*\["Matchmaker",\s*"GameRoom"\]/);
  for(const binding of ['MATCHMAKER','ROOMS'])
    assert.match(config,new RegExp('name\\s*=\\s*"'+binding+'"'));
  assert.match(worker,/export class Matchmaker/);
  assert.match(worker,/export class GameRoom/);
  assert.match(worker,/new WebSocketPair\(\)/);
  assert.match(worker,/this\.ctx\.acceptWebSocket\(server\)/);
  assert.match(worker,/async webSocketMessage\(ws,\s*message\)/);
  assert.match(worker,/async webSocketClose\(ws\)/);
  assert.match(worker,/r\.mode === mode && r\.gameId === gameId/);
  for(const route of ['/matchmake','/friend/create','/friend/join'])
    assert.ok(worker.includes(route),'missing '+route);
  // Static contract is not evidence of live session, deployment or two clients.
  assert.doesNotMatch(config,/^\s*route\s*=/m);
});
