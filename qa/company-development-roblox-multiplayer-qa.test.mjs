import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRobloxMultiplayerSourceContract} from '../tools/company-development-roblox-runtime-foundation.mjs';

test('separate Roblox two-client Studio workflow remains disabled',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-multiplayer-qa.yml','utf8');
  assert.match(workflow,/Multiplayer Studio QA \(Disabled\)/);
  assert.match(workflow,/ROBLOX_STUDIO_MULTIPLAYER_QA=REMOVED/);
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

test('survival co-op assist uses authoritative shared state without changing old save rewards',()=>{
  const server=fs.readFileSync('roblox-games/survival/server/Game.server.luau','utf8');
  const client=fs.readFileSync('roblox-games/survival/client/Game.client.luau','utf8');
  const config=fs.readFileSync('roblox-games/survival/shared/GameConfig.luau','utf8');
  assert.match(config,/PlayMode = "COOP"/);
  assert.match(config,/MultiplayerRequired = true/);
  assert.match(config,/CoopRequired = true/);
  assert.match(config,/MinimumParticipants = 2/);
  const contract=validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:client});
  assert.equal(contract.passed,true,'source-level two-client contract still requires live verification');
  assert.match(server,/local function coopAssistEnemy\(player\)/);
  assert.match(server,/#Players:GetPlayers\(\) < 2/);
  assert.match(server,/\(root.Position - targetRoot.Position\).Magnitude <= 18/);
  assert.match(server,/\(root.Position - enemyRoot.Position\).Magnitude/);
  assert.match(server,/attackEnemy\(targetPlayer, 12\)/);
  assert.match(server,/remote:FireAllClients\("MULTIPLAYER_SYNC", multiplayerSnapshot/);
  assert.match(client,/remote.OnClientEvent:Connect\(function\(eventName, snapshot\)/);
  assert.match(client,/remote:FireServer\("coop-assist"\)/);
  assert.match(client,/remote:FireServer\("coop-sync"\)/);
  assert.match(server,/GetDataStore\("survival-development-v1"\)/);
  assert.match(server,/SURVIVAL_SAVE_WRITE_SKIPPED_UNVERIFIED_READ/);
  assert.match(server,/for key, fallback in pairs\(Config.InitialState\)/);
  assert.doesNotMatch(config,/CoopAssists\s*=/,'assist count must remain session-only');
});

test('survival coop cannot accept client-supplied target, damage or reward',()=>{
  const server=fs.readFileSync('roblox-games/survival/server/Game.server.luau','utf8');
  const multiplayer=server.slice(server.indexOf('local function coopAssistEnemy(player)'),server.indexOf('local handlers = {'));
  assert.match(multiplayer,/for _, teammate in ipairs\(Players:GetPlayers\(\)\) do/);
  assert.match(multiplayer,/local enemy = currentEnemyFor\(teammate\)/);
  assert.match(multiplayer,/attackEnemy\(targetPlayer, 12\)/);
  assert.doesNotMatch(multiplayer,/FireServer|DataStore|SetAsync|UpdateAsync/);
  assert.match(server,/if typeof\(actionId\) ~= "string" or verifiedSaveRead\[player\] == nil then return end/);
  assert.match(server,/now - previous < Config.RateLimitSeconds/);
});
