import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectHeadlessSourceTexts} from '../tools/company-development-roblox-headless-fast-mvp.mjs';

const config='local Config={PolicySource = "company-learning/platform-release-roadmap.json", Platform = "ROBLOX", MobileFirst = true, SaveEnabled=true, PlayMode="COOP", MultiplayerRequired=true, Actions={ATTACK="ATTACK"}} return Config';
const server='local Players=game:GetService("Players") local DSS=game:GetService("DataStoreService") local foundationStore=DSS:GetDataStore("native-foundation-sentinel-v1") local r=Instance.new("RemoteEvent") local foundationRemote=Instance.new("RemoteEvent") foundationRemote.Name="RuntimeFoundationReport" local lastRequest={} local foundationSpawn=Instance.new("SpawnLocation") local function root(p) return p.Character and p.Character:FindFirstChild("HumanoidRootPart") end local function load(p) p:SetAttribute("Progress",0) pcall(function() return DSS:GetDataStore("x"):GetAsync("x") end) end local function bind(c) local h=c:WaitForChild("Humanoid") local hrp=c:WaitForChild("HumanoidRootPart") hrp.Anchored=false h.PlatformStand=false local hit=workspace:Raycast(hrp.Position,Vector3.new(0,-10,0)) local check="GROUND_CONTACT" local move="MOVEMENT_CONFIRMED" end Players.PlayerAdded:Connect(function(p) load(p) p.CharacterAdded:Connect(bind) end) Players.PlayerRemoving:Connect(function(p) pcall(function() DSS:GetDataStore("x"):SetAsync("x",{}) end) end) r.OnServerEvent:Connect(function(p,action) if typeof(action)~="string" then return end local now=os.clock() if now-(lastRequest[p]or 0)<.1 then return end lastRequest[p]=now p:SetAttribute("Progress",1) end) foundationRemote.OnServerEvent:Connect(function() end) local participants=Players:GetPlayers() r:FireAllClients("MULTIPLAYER_SYNC",{ParticipantCount=#participants}) game:BindToClose(function() end)';
const client='local UIS=game:GetService("UserInputService") local touchEnabled=UIS.TouchEnabled local gui=Instance.new("ScreenGui") local foundationRemote=game:GetService("ReplicatedStorage"):WaitForChild("RuntimeFoundationReport") local camera=workspace.CurrentCamera local h=game.Players.LocalPlayer.Character:WaitForChild("Humanoid") if camera.CameraSubject==h then foundationRemote:FireServer("CAMERA_READY") end foundationRemote:FireServer("INPUT_READY") button.Activated:Connect(function() remote:FireServer("ATTACK") end) remote.OnClientEvent:Connect(function(kind,payload) if kind~="MULTIPLAYER_SYNC" or typeof(payload)~="table" then return end local synced=payload.ParticipantCount end)';
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


test('Roblox F0 persist ignores stale source or artifact results',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
 assert.match(workflow,/ROBLOX_F0_STALE_RESULT_IGNORED/);
 assert.match(workflow,/currentSourceRevision!==targetSourceRevision\|\|currentArtifactIdentity!==targetArtifactIdentity/);
});

test('Roblox F0 workflow uses shallow checkout and exact source revision fetch instead of full history',()=>{
 const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
 assert.doesNotMatch(workflow,/fetch-depth:\s*0/);
 assert.ok((workflow.match(/fetch-depth:\s*1/g)||[]).length>=2);
 assert.match(workflow,/git fetch --no-tags origin "\$\{\{ matrix\.sourceRevision \}\}"/);
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


test('F0 workflow preserves blocker evidence even when validation fails',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  assert.match(workflow,/name: development-roblox-f0-\$\{\{ matrix\.gameId \}\}[\s\S]*if-no-files-found: warn/);
  const f0Upload=workflow.slice(workflow.lastIndexOf('- uses: actions\/upload-artifact@v4'));
  assert.match(f0Upload,/if: always\(\)/);
  const tool=fs.readFileSync('tools/company-development-roblox-headless-fast-mvp.mjs','utf8');
  assert.match(tool,/ROBLOX_FOUNDATION_F0_BLOCKERS=/);
});


test('daechung-rpg foundation evidence is deduped and uses actual roundtrip semantics',()=>{
 const actualConfig=fs.readFileSync('roblox-games/daechung-rpg/shared/GameConfig.luau','utf8');
 const actualServer=fs.readFileSync('roblox-games/daechung-rpg/server/Game.server.luau','utf8');
 const actualClient=fs.readFileSync('roblox-games/daechung-rpg/client/Game.client.luau','utf8');
 const actualProject=fs.readFileSync('roblox-games/daechung-rpg/default.project.json','utf8');
 const r=inspectHeadlessSourceTexts({gameId:'daechung-rpg',sourcePath:'roblox-games/daechung-rpg',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:1,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config:actualConfig,server:actualServer,client:actualClient,project:actualProject});
 assert.equal(r.pass,true,r.blockers.join(','));
 assert.match(actualServer,/if foundationSeen\[name\]then return true end/);
 assert.match(actualServer,/foundationStore:GetAsync\("latest"\)/);
 assert.match(actualServer,/store:RemoveAsync\(probeKey\)/);
 assert.match(actualServer,/if #members>=2 then foundationCheckpoint\("MULTIPLAYER_SYNC"/);
 assert.match(actualServer,/if accepted then foundationCheckpoint\("CORE_LOOP_READY"/);
 assert.match(actualServer,/name=="REMOTE_PING"[\s\S]*FireClient\(p,"REMOTE_PONG"\)/);
 assert.match(actualClient,/REMOTE_PONG[\s\S]*REMOTE_ROUNDTRIP/);
 assert.match(actualClient,/foundationRemote:FireServer\("REMOTE_PING"\)/);
 const worldBuild=actualServer.indexOf('\nbuildWorld()\n');
 const playerBinding=actualServer.indexOf('Players.PlayerAdded:Connect(bindPlayer)');
 assert.ok(worldBuild>0&&playerBinding>worldBuild,'world and safe spawn must exist before player binding');
});


test('daechung-rpg runtime foundation survives late player binding and transient checkpoint writes',()=>{
 const server=fs.readFileSync('roblox-games/daechung-rpg/server/Game.server.luau','utf8');
 const client=fs.readFileSync('roblox-games/daechung-rpg/client/Game.client.luau','utf8');
 assert.match(server,/for attempt=1,4 do[\s\S]*foundationStore:UpdateAsync/);
 assert.match(server,/Players\.PlayerAdded:Connect\(bindPlayer\)/);
 assert.match(server,/for _,p in ipairs\(Players:GetPlayers\(\)\)do bindPlayer\(p\)end/);
 assert.match(server,/if name=="REMOTE_PING"then[\s\S]*if name=="REMOTE_ROUNDTRIP"then[\s\S]*local now=os\.clock\(\)/);
 assert.match(client,/local foundationRoundtrip=false/);
 assert.match(client,/for _=1,20 do[\s\S]*foundationRemote:FireServer\("REMOTE_PING"\)[\s\S]*task\.wait\(\.5\)/);
});

test('F0 checkout and validation fan out across the full external-capacity matrix without workflow-wide serialization',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const header=workflow.slice(0,workflow.indexOf('\njobs:\n'));
  assert.doesNotMatch(workflow,/rows\.length>=6/);
  assert.match(workflow,/rows\.length>=256/);
  assert.doesNotMatch(workflow,/max-parallel:\s*6/);
  assert.match(workflow,/ROBLOX_F0_PARALLELISM=EXTERNAL_PROVIDER_CAPACITY_ONLY/);
  assert.match(workflow,/ROBLOX_F0_CHECKOUT_MODE=PER_GAME_MATRIX_PARALLEL/);
  assert.match(header,/run-name: Roblox F0 · \$\{\{ inputs\.game_id \|\| 'batch' \}\}/);
  assert.doesNotMatch(header,/^concurrency:\s*$/m);
  assert.match(workflow,/ROBLOX_PRIVATE_RUNTIME_DISPATCH=DEDUPED_ACTIVE:/);
  assert.match(workflow,/ROBLOX_PRIVATE_RUNTIME_DISPATCH_COUNT=/);
});

test('F0 planner uses central Roblox validation mode and does not require a queue-local robloxValidationMode cache',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  assert.ok(workflow.includes("const roadmap=JSON.parse(fs.readFileSync('company-learning/platform-release-roadmap.json','utf8'));"));
  assert.ok(workflow.includes("const canonicalRobloxValidationMode=String(roadmap.roblox?.validationMode||'').trim();"));
  assert.ok(workflow.includes("if(canonicalRobloxValidationMode!=='HEADLESS_FAST_MVP')throw new Error('ROBLOX_F0_CANONICAL_VALIDATION_MODE_INVALID:'+canonicalRobloxValidationMode);"));
  assert.ok(workflow.includes('ROBLOX_F0_CANONICAL_VALIDATION_MODE='));
  assert.doesNotMatch(workflow,/item\.robloxValidationMode/);
});


test('F0 accepts approved non-combat action loops without inventing combat markers',()=>{
 const nonCombatConfig=config.replace('Actions={ATTACK="ATTACK"}','Actions={MOVE="MOVE"}');
 const nonCombatClient=client.replaceAll('ATTACK','MOVE');
 const r=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',config:nonCombatConfig,server,client:nonCombatClient,project});
 assert.equal(r.pass,true,r.blockers.join(','));
 assert.equal(r.checks.combatOrRound,true);
});

test('F0 persistence does not serialize the whole job and reapplies evidence after runtime write conflicts',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const start=workflow.indexOf('\n  persist:\n');
  const end=workflow.indexOf('\n      - name: Dispatch private runtime candidate deployment',start);
  const block=workflow.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(block,/group:\s*company-runtime-writer/);
  assert.match(block,/ROBLOX_F0_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(block,/ROBLOX_F0_PERSIST_CONFLICT_RETRY=/);
  assert.match(block,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.doesNotMatch(block,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});
