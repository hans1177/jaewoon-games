import fs from 'node:fs';
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
