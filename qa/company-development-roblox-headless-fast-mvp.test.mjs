import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectHeadlessSourceTexts} from '../tools/company-development-roblox-headless-fast-mvp.mjs';

const config='local Config={PolicySource = "company-learning/platform-release-roadmap.json", Platform = "ROBLOX", MobileFirst = true, SaveEnabled=true, PlayMode="COOP", MultiplayerRequired=true, Actions={ATTACK="ATTACK"}} return Config';
const server='local Players=game:GetService("Players") local DSS=game:GetService("DataStoreService") local foundationStore=DSS:GetDataStore("native-foundation-sentinel-v1") local r=Instance.new("RemoteEvent") local foundationRemote=Instance.new("RemoteEvent") foundationRemote.Name="RuntimeFoundationReport" local lastRequest={} local foundationSpawn=Instance.new("SpawnLocation") local function root(p) return p.Character and p.Character:FindFirstChild("HumanoidRootPart") end local function load(p) p:SetAttribute("Progress",0) pcall(function() return DSS:GetDataStore("x"):GetAsync("x") end) end local function bind(c) local h=c:WaitForChild("Humanoid") local hrp=c:WaitForChild("HumanoidRootPart") hrp.Anchored=false h.PlatformStand=false local hit=workspace:Raycast(hrp.Position,Vector3.new(0,-10,0)) local check="GROUND_CONTACT" local move="MOVEMENT_CONFIRMED" end Players.PlayerAdded:Connect(function(p) load(p) p.CharacterAdded:Connect(bind) end) Players.PlayerRemoving:Connect(function(p) pcall(function() DSS:GetDataStore("x"):SetAsync("x",{}) end) end) r.OnServerEvent:Connect(function(p,action) if typeof(action)~="string" then return end local now=os.clock() if now-(lastRequest[p]or 0)<.1 then return end lastRequest[p]=now p:SetAttribute("Progress",1) end) foundationRemote.OnServerEvent:Connect(function() end) local participants=Players:GetPlayers() r:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants}) game:BindToClose(function() end)';
const client='local UIS=game:GetService("UserInputService") local touchEnabled=UIS.TouchEnabled local gui=Instance.new("ScreenGui") local foundationRemote=game:GetService("ReplicatedStorage"):WaitForChild("RuntimeFoundationReport") local camera=workspace.CurrentCamera local h=game.Players.LocalPlayer.Character:WaitForChild("Humanoid") if camera.CameraSubject==h then foundationRemote:FireServer("CAMERA_READY") end foundationRemote:FireServer("INPUT_READY") button.Activated:Connect(function() remote:FireServer("ATTACK") end) remote.OnClientEvent:Connect(function() end)';
const project='{"tree":{"$className":"DataModel","ServerScriptService":{"GameServer":{"$path":"server"}},"StarterPlayer":{"StarterPlayerScripts":{"GameClient":{"$path":"client"}}}}}';

test('headless FAST_MVP passes complete release checklist without Studio',()=>{
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config,server,client,project});
 assert.equal(r.pass,true);
 assert.equal(r.validationMode,'HEADLESS_SOURCE_PREFLIGHT_F0');
 assert.equal(r.sourcePreflightPassed,true);
 assert.equal(r.f0SourceIntegrityPassed,true);
 assert.equal(r.sourceStartupMarkersPassed,true);
 for(const field of ['gameStartPassed','serverBootPassed','worldFoundationPassed','characterFoundationPassed','physicsAndMovementPassed','runtimeFoundationPassed','actualRuntimeEvidence','internalReleaseReady'])assert.equal(r[field],false,field);
});

test('headless FAST_MVP blocks artifact drift',()=>{
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'c'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config,server,client,project});
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('exactArtifact'));
});

test('headless FAST_MVP blocks missing multiplayer synchronization',()=>{
 const broken=server.replace('r:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants})','');
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config,server:broken,client,project});
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('multiplayerSync'));
});


test('headless F0 blocks malformed duplicate local function declarations',()=>{
 const broken=server+' local function tree(parent,pos,scale)local function tree(parent,pos,scale) end';
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config,server:broken,client,project});
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('duplicateDeclarationGuard'));
 assert.equal(r.gameStartPassed,false);
});

test('headless F0 blocks sources without native foundation sentinel contract',()=>{
 const broken=server.replace('native-foundation-sentinel-v1','ordinary-store').replace('GROUND_CONTACT','NO_GROUND_PROBE').replace('MOVEMENT_CONFIRMED','NO_MOVE_PROBE');
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config,server:broken,client,project});
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('foundationSentinelContract'));
});


test('F0 blocks when actual Luau compiler evidence is missing even if structural markers pass',()=>{
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:false,config,server,client,project});
 assert.equal(r.pass,false);
 assert.equal(r.nativeLanguageCompilePassed,false);
 assert.ok(r.blockers.includes('nativeLanguageCompilePassed'));
});

test('cozy-island creates safe spawn before player binding and core loop evidence requires an accepted action',()=>{
 const source=fs.readFileSync('roblox-games/cozy-island/server/Game.server.luau','utf8');
 assert.equal((source.match(/local function tree\(parent,pos,scale\)/g)||[]).length,1);
 const worldBuild=source.indexOf('\nbuildWorld()\n');
 const playerBinding=source.indexOf('Players.PlayerAdded:Connect(bindPlayer)');
 assert.ok(worldBuild>0,'buildWorld call missing');
 assert.ok(playerBinding>worldBuild,'player binding must occur after safe world and spawn creation');
 assert.match(source,/local accepted=H\[a\]\(p\)/);
 assert.match(source,/if accepted==true then[\s\S]*foundationCheckpoint\("CORE_LOOP_READY"/);
});
