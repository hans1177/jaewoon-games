import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHeadlessSourceTexts} from '../tools/company-development-roblox-headless-fast-mvp.mjs';

const config='local Config={PolicySource = "company-learning/platform-release-roadmap.json", Platform = "ROBLOX", MobileFirst = true, SaveEnabled=true, PlayMode="COOP", MultiplayerRequired=true, Actions={ATTACK="ATTACK"}} return Config';
const server='local Players=game:GetService("Players") local DSS=game:GetService("DataStoreService") local r=Instance.new("RemoteEvent") local lastRequest={} local function load(p) p:SetAttribute("Progress",0) pcall(function() return DSS:GetDataStore("x"):GetAsync("x") end) end Players.PlayerAdded:Connect(load) Players.PlayerRemoving:Connect(function(p) pcall(function() DSS:GetDataStore("x"):SetAsync("x",{}) end) end) r.OnServerEvent:Connect(function(p,action) if typeof(action)~="string" then return end local now=os.clock() if now-(lastRequest[p]or 0)<.1 then return end lastRequest[p]=now p:SetAttribute("Progress",1) end) local participants=Players:GetPlayers() r:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants}) game:BindToClose(function() end)';
const client='local UIS=game:GetService("UserInputService") local touchEnabled=UIS.TouchEnabled local gui=Instance.new("ScreenGui") button.Activated:Connect(function() remote:FireServer("ATTACK") end) remote.OnClientEvent:Connect(function() end)';
const project='{"tree":{"$className":"DataModel","ServerScriptService":{"GameServer":{"$path":"server"}},"StarterPlayer":{"StarterPlayerScripts":{"GameClient":{"$path":"client"}}}}}';

test('headless FAST_MVP passes complete release checklist without Studio',()=>{
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,config,server,client,project});
 assert.equal(r.pass,true);
 assert.equal(r.validationMode,'HEADLESS_FAST_MVP');
 for(const field of ['gameStartPassed','mobileControlUiPassed','coreProgressionPassed','combatOrRoundPassed','datastoreRejoinPassed','multiplayerStateSyncPassed','sessionEndRestartPassed','errorGuardPassed'])assert.equal(r[field],true,field);
});

test('headless FAST_MVP blocks artifact drift',()=>{
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'c'.repeat(64),artifactRunId:123,config,server,client,project});
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('exactArtifact'));
});

test('headless FAST_MVP blocks missing multiplayer synchronization',()=>{
 const broken=server.replace('r:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})','');
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,config,server:broken,client,project});
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('multiplayerSync'));
});
