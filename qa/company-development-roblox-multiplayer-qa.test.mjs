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

test('multiplayer code gate rejects missing minimum-two guard or client sync handler',()=>{
  const server='local participants=Players:GetPlayers()\nremote:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})';
  assert.equal(validateRobloxMultiplayerSourceContract({serverSource:server,clientSource:'remote.OnClientEvent:Connect(function() end)'}).passed,false);
});
