import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {inspectHeadlessSourceTexts} from '../tools/company-development-roblox-headless-fast-mvp.mjs';

// 실제 워크플로의 저장 코드를 실행해 늦게 끝난 게임/작업이 다른 증거를 덮지 않는지 확인한다.
test('per-game F0 persistence checks uploaded identity and never demotes a newer exact checkpoint',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const section=workflow.slice(workflow.indexOf("Persist this game's F0 result immediately"));
  const code=section.match(/node <<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^          /gm,'');
  const revision='a'.repeat(40),artifact='sha256:'+'b'.repeat(64);
  const evidence={gameId:'garden',pass:true,sourceRevision:revision,artifactIdentity:artifact,artifactRunId:200};
  const execute=(item,proof=evidence,env={})=>{
    const writes=new Map(),exit=Symbol('exit');
    const original={items:[item,{gameId:'other',robloxRuntimePassed:true,currentStep:'F9'}]};
    const fakeFs={existsSync:()=>proof!==null,readFileSync:file=>JSON.stringify(file==='development-queue.json'?original:proof),writeFileSync:(file,value)=>writes.set(file,String(value))};
    try{vm.runInNewContext(code,{require:name=>{assert.equal(name,'fs');return fakeFs;},process:{env:{GAME_ID:'garden',SOURCE_REVISION:revision,EXPECTED_ARTIFACT:artifact,EVIDENCE_FILE:'evidence.json',PACKAGE_ARTIFACT_READY:'true',GITHUB_RUN_ID:'200',...env},exit:()=>{throw exit;}},console:{log:()=>{}}});}catch(error){if(error!==exit)throw error;}
    return writes.has('development-queue.json')?JSON.parse(writes.get('development-queue.json')):original;
  };
  const item={gameId:'garden',robloxSourceCommit:revision,robloxBuildArtifactIdentity:artifact};
  const passed=execute(item);
  assert.equal(passed.items[0].currentStep,'PRIVATE_RUNTIME_CANDIDATE_DEPLOY');
  assert.equal(passed.items[0].robloxFoundationF0Passed,true);
  assert.deepEqual(passed.items[1],{gameId:'other',robloxRuntimePassed:true,currentStep:'F9'});
  for(const proof of [null,{...evidence,gameId:'other'},{...evidence,artifactIdentity:'wrong'}])assert.equal(execute(item,proof).items[0].robloxFoundationF0Passed,false);
  assert.equal(execute(item,evidence,{PACKAGE_ARTIFACT_READY:'false'}).items[0].robloxFoundationF0Passed,false);
  const newer={...item,robloxFoundationF0Passed:true,robloxFoundationF0Evidence:{...evidence,artifactRunId:201},robloxRuntimePassed:true,currentStep:'F9'};
  assert.deepEqual(execute(newer,null).items[0],newer);
  const stale={...item,robloxSourceCommit:'c'.repeat(40)};
  assert.deepEqual(execute(stale).items[0],stale);
  assert.match(workflow,/if: \$\{\{ success\(\) && steps\.persist\.outcome == 'success' \}\}/);
});

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

test('F0 rejects the legacy self-hit raycast that fabricated ground contact',()=>{
 const result=inspectHeadlessSourceTexts({gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),artifactRunId:123,nativeLanguageCompilePassed:true,config,server:server+'\ncharacter:SetAttribute("GROUND_CONTACT", groundHit ~= nil)',client,project});
 assert.equal(result.pass,false);
 assert.equal(result.f0SourceIntegrityPassed,false);
 assert.ok(result.blockers.includes('groundContactNotSynthetic'));
});

test('headless F0 binds exact BUILD_UP asset fingerprint and source selection identity',()=>{
 const buildUpFingerprint='d'.repeat(64);
 const selectionFingerprint='e'.repeat(64);
 const assetConfig=config.replace(' return Config',` Config.StudioAssets={LibraryVersion=109,SelectionFingerprint="${selectionFingerprint}"} return Config`);
 const pass=inspectHeadlessSourceTexts({
   gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),
   artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),
   artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',
   buildUpAssetSourceUsageFingerprint:buildUpFingerprint,
   assetSelectionFingerprint:selectionFingerprint,assetLibraryVersion:109,
   config:assetConfig,server,client,project
 });
 assert.equal(pass.pass,true,pass.blockers.join(','));
 assert.equal(pass.buildUpAssetSourceUsageFingerprint,buildUpFingerprint);
 assert.equal(pass.assetSelectionFingerprint,selectionFingerprint);
 assert.equal(pass.observedAssetSelectionFingerprint,selectionFingerprint);
 assert.equal(pass.assetLibraryVersion,109);
 assert.equal(pass.observedAssetLibraryVersion,109);

 const mismatch=inspectHeadlessSourceTexts({
   gameId:'g',sourcePath:'roblox-games/g',sourceRevision:'a'.repeat(40),
   artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),
   artifactRunId:123,nativeLanguageCompilePassed:true,
   buildUpAssetSourceUsageFingerprint:buildUpFingerprint,
   assetSelectionFingerprint:'f'.repeat(64),assetLibraryVersion:109,
   config:assetConfig,server,client,project
 });
 assert.equal(mismatch.pass,false);
 assert.ok(mismatch.blockers.includes('assetSelectionFingerprint'));
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
  assert.match(workflow,/ROBLOX_F0_PRIVATE_VALIDATION_HANDOFF=DEDUPED_CURRENT_MAIN:/);
  assert.match(workflow,/ROBLOX_F0_PRIVATE_VALIDATION_DISPATCH_COUNT=/);
  assert.match(workflow,/company-development-roblox-release-promotion\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$GAME_ID" -f publish_stage=validation/);
  assert.match(workflow,/ROBLOX_STUDIO_REQUIRED_FOR_F0_CONTINUATION=NO/);
  assert.doesNotMatch(workflow,/run_studio=true/);
  const validateStart=workflow.indexOf('\n  validate:\n');
  const persistStep=workflow.indexOf("Persist this game's F0 result immediately",validateStart);
  const handoffStep=workflow.indexOf("Dispatch exact private Roblox validation directly after this game's F0 persist",persistStep);
  assert.ok(persistStep>validateStart&&handoffStep>persistStep);
  assert.doesNotMatch(workflow,/\n  persist:\n/);
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

test('F0 persists each matrix game immediately without cohort fan-in and reapplies on runtime conflicts',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const validateStart=workflow.indexOf('\n  validate:\n');
  const persistStep=workflow.indexOf("      - name: Persist this game's F0 result immediately",validateStart);
  const handoffStep=workflow.indexOf("      - name: Dispatch exact private Roblox validation directly after this game's F0 persist",persistStep);
  assert.ok(validateStart>=0&&persistStep>validateStart&&handoffStep>persistStep);
  assert.doesNotMatch(workflow,/\n  persist:\n/);
  assert.doesNotMatch(workflow,/needs:\s*\[plan,\s*validate\]/);
  const block=workflow.slice(persistStep,handoffStep);
  assert.match(block,/if: always\(\)/);
  assert.match(block,/GAME_ID: \$\{\{ matrix\.gameId \}\}/);
  assert.match(block,/SOURCE_REVISION: \$\{\{ matrix\.sourceRevision \}\}/);
  assert.match(block,/ROBLOX_F0_PERSIST_OPTIMISTIC_ATTEMPT=/);
  assert.match(block,/ROBLOX_F0_PERSIST_CONFLICT_RETRY=/);
  assert.match(block,/git reset --hard "origin\/\$COMPANY_RUNTIME_BRANCH"/);
  assert.match(block,/ROBLOX_F0_PER_GAME_PERSIST=PASS:/);
  assert.doesNotMatch(block,/git rebase "origin\/\$COMPANY_RUNTIME_BRANCH"/);
});


test('F0 planner dedupes duplicate dispatches while validation matrix remains parallel',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const jobsAt=workflow.indexOf('\njobs:\n');
  assert.ok(jobsAt>0);
  assert.doesNotMatch(workflow.slice(0,jobsAt),/\nconcurrency:/);
  const planStart=workflow.indexOf('\n  plan:\n');
  const validateStart=workflow.indexOf('\n  validate:\n',planStart);
  const planBlock=workflow.slice(planStart,validateStart);
  assert.match(planBlock,/runs-on:\s*ubuntu-slim/);
  assert.match(planBlock,/concurrency:\n\s+group: roblox-f0-plan-\$\{\{ inputs\.game_id \|\| 'batch' \}\}\n\s+cancel-in-progress: true/);
  assert.match(planBlock,/ROBLOX_F0_PLAN_CONTROL_SHA=/);
  assert.match(planBlock,/String\(run\.head_sha\|\|''\)===currentSha/);
  assert.match(planBlock,/ROBLOX_F0_PLAN_ACTIVE_WINNER=/);
  assert.match(planBlock,/ROBLOX_F0_PLAN_EXACT_DEDUPED=/);
  assert.match(planBlock,/ROBLOX_F0_PLAN_BATCH_DEDUPED_NEWER=/);
  assert.match(planBlock,/requested\?ids\[0\]:ids\[ids\.length-1\]/);
  assert.doesNotMatch(workflow,/max-parallel:\s*[1-9][0-9]*/);
  assert.doesNotMatch(workflow,/\n  persist:\n/);
  assert.doesNotMatch(workflow,/pattern:\s*development-roblox-f0-\*/);
  assert.doesNotMatch(workflow,/merge-multiple:\s*true/);
  const perGamePersist=workflow.indexOf("Persist this game's F0 result immediately");
  const perGameHandoff=workflow.indexOf("Dispatch exact private Roblox validation directly after this game's F0 persist");
  assert.ok(perGamePersist>validateStart&&perGameHandoff>perGamePersist);
});


test('F0 validate coalesces only exact game source and artifact duplicates without serializing unrelated work',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const validateStart=workflow.indexOf('\n  validate:\n');
  const validateEnd=workflow.indexOf('\n  ',validateStart+4);
  assert.ok(validateStart>=0);
  const block=workflow.slice(validateStart,workflow.indexOf('\n    steps:\n',validateStart));
  assert.match(block,/concurrency:\n\s+group: roblox-f0-validate-\$\{\{ matrix\.gameId \}\}-\$\{\{ matrix\.sourceRevision \}\}-\$\{\{ matrix\.artifactIdentity \}\}/);
  assert.match(block,/cancel-in-progress:\s*false/);
  assert.doesNotMatch(block,/max-parallel:/);
  assert.doesNotMatch(workflow.slice(0,workflow.indexOf('\njobs:\n')),/^concurrency:\s*$/m);
});

test('F0 hands exact game ids directly to private validation without Studio dependency',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  assert.match(workflow,/name: Dispatch exact private Roblox validation directly after this game's F0 persist/);
  assert.match(workflow,/ROBLOX_F0_PRIVATE_VALIDATION_HANDOFF=DISPATCHED:/);
  assert.match(workflow,/ROBLOX_F0_PRIVATE_VALIDATION_HANDOFF=DEDUPED_CURRENT_MAIN:/);
  assert.match(workflow,/actions\/workflows\/company-development-roblox-release-promotion\.yml\/runs\?per_page=100/);
  assert.match(workflow,/company-development-roblox-release-promotion\.yml --repo "\$GITHUB_REPOSITORY" --ref main -f game_id="\$GAME_ID" -f publish_stage=validation/);
  assert.match(workflow,/String\(run\.head_sha\|\|''\)===currentSha/);
  assert.doesNotMatch(workflow,/run_studio=true/);
});

test('F0 private validation handoff stays dedicated and noncanonical before F9',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-headless-fast-mvp.yml','utf8');
  const start=workflow.indexOf("Dispatch exact private Roblox validation directly after this game's F0 persist");
  assert.ok(start>0);
  const block=workflow.slice(start);
  assert.match(block,/ROBLOX_F0_PRIVATE_VALIDATION_TARGET=DEDICATED_NONCANONICAL/);
  assert.match(block,/ROBLOX_STUDIO_REQUIRED_FOR_F0_CONTINUATION=NO/);
  assert.doesNotMatch(block,/run_studio=true/);
  assert.doesNotMatch(block,/publish_stage=final/);
});



test('F0 blocks generic scope handlers when an exact survival design baseline is bound',()=>{
 const baseline={content:{
   identity:'낮에는 자원을 채집하고 밤에는 몰려오는 적을 막는 액션 생존 게임',
   coreFun:'자원 관리와 실시간 전투',
   coreLoop:['낮 시간에 자원을 채집하고 장비를 제작한다','밤에 적 웨이브를 막는다','보상으로 성장과 제작법을 해금한다'],
   signatureSystems:[{name:'즉석 제작',purpose:'자원으로 장비를 제작한다'}],
   progressionDirection:'경험치와 제작법 해금을 저장한다.',
   multiplayerMode:'SINGLE'
 }};
 const skeletonServer=server
   +' local function scopeHandler1(p) p:SetAttribute("Score",1) end'
   +' local function scopeHandler2(p) p:SetAttribute("EnemyHealth",90) end'
   +' local function scopeHandler3(p) p:SetAttribute("Wave",2) end';
 const r=inspectHeadlessSourceTexts({
   gameId:'survival',sourcePath:'roblox-games/survival',sourceRevision:'a'.repeat(40),
   artifactIdentity:'sha256:'+'b'.repeat(64),rebuiltArtifactIdentity:'sha256:'+'b'.repeat(64),
   artifactRunId:123,nativeLanguageCompilePassed:true,nativeCompilerVersion:'0.739',
   config,server:skeletonServer,client,project,baseline
 });
 assert.equal(r.gameplayProductReadinessRequired,true);
 assert.equal(r.pass,false);
 assert.ok(r.blockers.includes('gameplayProductReadiness'));
 assert.ok(r.gameplayProductReadiness.blockers.includes('GENERIC_SCOPE_HANDLER_SKELETON'));
 assert.ok(r.gameplayProductReadiness.blockers.some(x=>x.includes('CRAFTING')));
 assert.equal(r.version,5);
});
