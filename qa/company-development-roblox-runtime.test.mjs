import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectJsonForGame,requiresPersistentSave,robloxBuildProfileFromBaseline,validateRobloxBootstrap,compileRobloxSource,classifyRobloxScope} from '../tools/company-development-roblox-bootstrap.mjs';
import {deriveApprovedScopeInventory} from '../tools/company-approved-scope-contract.mjs';

const platformProfile=()=>({
  platform:'ROBLOX',
  inputModel:'Roblox touch controls with ContextActionService and gamepad fallback',
  sessionModel:'Roblox private experience session with server-authoritative player lifecycle',
  multiplayerRuntime:'Roblox server RemoteEvent authority with synchronized participant state',
  performanceBudget:'Mobile-first Roblox frame, memory, instance and network budget',
  uiUx:'Roblox ScreenGui touch-first HUD with safe-area friendly controls',
  saveAndNetwork:'DataStore persistence when required and validated RemoteEvent network boundaries',
  platformContentAdaptation:'Roblox-native scene, avatar, camera, UI and interaction adaptation',
  internalReleaseTarget:'Private or restricted Roblox test experience playable by owner',
  validationEvidence:'Roblox runtime, independent QA and regression evidence on exact source revision'
});
const buildProfile=(genre,subgenre=null,playMode='SINGLE')=>{
  const multiplayerRequired=playMode!=='SINGLE';
  return {
    version:1,targetPlatform:'ROBLOX',taxonomy:'ROBLOX_CREATOR_HUB_EXPERIENCE_GENRES',
    declaredGameCategory:genre,genre,subgenre,playMode,
    multiplayerRequired,
    coopImplementationRequired:playMode==='COOP'||playMode==='HYBRID',
    competitiveImplementationRequired:playMode==='COMPETITIVE'||playMode==='HYBRID',
    networkingRequired:multiplayerRequired,
    multiplayerQaRequired:multiplayerRequired,
    minimumParticipantsForRequiredQa:multiplayerRequired?2:1,
    displayLabelKo:`${genre} · ${subgenre||''} · ${playMode}`,
  };
};
const baseline={content:{
  identity:'Pocket Foundry',coreFun:'collect, upgrade, income, unlock',
  coreLoop:['collect resources','upgrade production','unlock the next area'],
  mobileUx:'touch controls',progressionDirection:'Persistent progression system',
  robloxBuildProfile:buildProfile('Simulation','Tycoon','SINGLE'),
  platformProfiles:{ROBLOX:platformProfile()},
}};
const shared=`local Config = {
  PolicySource = "company-learning/platform-release-roadmap.json",
  Platform = "ROBLOX",
  MobileFirst = true,
  SaveEnabled = true,
  Genre = "Simulation",
  Subgenre = "Tycoon",
  PlayMode = "SINGLE",
  MultiplayerRequired = false,
  GameId = "test-game",
  InitialCoins = 0,
  UpgradeBaseCost = 10,
  ProductionBase = 1,
}
return table.freeze(Config)
${'-- config\n'.repeat(30)}`;
const server=`local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local RemoteEvent = Instance.new("RemoteEvent")
RemoteEvent.Name = "GameAction"
RemoteEvent.Parent = ReplicatedStorage
local store = DataStoreService:GetDataStore("test-v1")
local lastAction = {}
local function safeNumber(value)
  if typeof(value) ~= "number" then return nil end
  return math.clamp(value, 0, 100)
end
Players.PlayerAdded:Connect(function(player)
  local coins = 0
  local ok, saved = pcall(function() return store:GetAsync("p:" .. player.UserId) end)
  if ok and typeof(saved) == "number" then coins = math.max(0, saved) end
  player:SetAttribute("Coins", coins)
  player:SetAttribute("Level", 1)
end)
RemoteEvent.OnServerEvent:Connect(function(player, action, amount)
  if typeof(action) ~= "string" then return end
  local now = os.clock()
  if now - (lastAction[player] or 0) < 0.08 then return end
  lastAction[player] = now
  local value = safeNumber(amount or 1) or 1
  if action == "collect" then
    player:SetAttribute("Coins", (player:GetAttribute("Coins") or 0) + math.max(1, value))
  elseif action == "upgrade" then
    local level = player:GetAttribute("Level") or 1
    player:SetAttribute("Level", level + 1)
  end
end)
Players.PlayerRemoving:Connect(function(player)
  local coins = player:GetAttribute("Coins") or 0
  pcall(function() store:UpdateAsync("p:" .. player.UserId, function() return coins end) end)
  lastAction[player] = nil
end)
${'-- server gameplay\n'.repeat(55)}`;
const client=`local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("GameAction")
local gui = Instance.new("ScreenGui")
gui.Name = "GameHud"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")
local button = Instance.new("TextButton")
button.Size = UDim2.fromOffset(180, 56)
button.Position = UDim2.new(0.5, -90, 1, -80)
button.Text = UserInputService.TouchEnabled and "수집" or "Collect"
button.Parent = gui
local status = Instance.new("TextLabel")
status.Size = UDim2.fromOffset(240, 44)
status.Position = UDim2.new(0.5, -120, 0, 24)
status.Parent = gui
button.Activated:Connect(function() remote:FireServer("collect", 1) end)
local function render()
  status.Text = string.format("Coins %d / Lv %d", player:GetAttribute("Coins") or 0, player:GetAttribute("Level") or 1)
end
player:GetAttributeChangedSignal("Coins"):Connect(render)
player:GetAttributeChangedSignal("Level"):Connect(render)
render()
${'-- client ui\n'.repeat(45)}`;

test('persistent Roblox design requires save evidence in generated source',()=>{
  assert.equal(requiresPersistentSave(baseline),true);
});

test('Roblox build profile is mandatory and normalized before source generation',()=>{
  assert.equal(robloxBuildProfileFromBaseline(baseline).genre,'Simulation');
  assert.equal(robloxBuildProfileFromBaseline(baseline).playMode,'SINGLE');
  assert.throws(()=>robloxBuildProfileFromBaseline({content:{identity:'missing profile'}}),/ROBLOX_PLATFORM_DESIGN_PROFILE_REQUIRED/);
});

test('Roblox bootstrap static gate accepts profile-bound server-authoritative mobile source with save',()=>{
  const verdict=validateRobloxBootstrap({sharedConfig:shared,serverCode:server,clientCode:client,baseline});
  assert.equal(verdict.pass,true,verdict.blockers.join(','));
  assert.equal(verdict.saveRequired,true);
  assert.equal(verdict.profile.genre,'Simulation');
});

test('Roblox bootstrap static gate rejects placeholders and missing server boundary',()=>{
  const bad=validateRobloxBootstrap({sharedConfig:shared,serverCode:'-- TODO placeholder\n',clientCode:client,baseline});
  assert.equal(bad.pass,false);
  assert.ok(bad.blockers.includes('SERVER_PLACEHOLDER_FORBIDDEN'));
  assert.ok(bad.blockers.includes('SERVER_REMOTE_BOUNDARY_REQUIRED'));
});

test('Roblox scope classifier includes genre-specific native handler modes',()=>{
  assert.equal(classifyRobloxScope({path:'puzzle',label:'match merge puzzle'},0),'PUZZLE');
  assert.equal(classifyRobloxScope({path:'defense',label:'tower defense wave'},0),'DEFENSE');
  assert.equal(classifyRobloxScope({path:'combat',label:'attack enemy'},0),'COMBAT');
  assert.equal(classifyRobloxScope({path:'movement',label:'explore and reposition'},0),'MOVEMENT');
  assert.equal(classifyRobloxScope({path:'progression',label:'upgrade and unlock'},0),'PROGRESSION');
  assert.equal(classifyRobloxScope({path:'economy',label:'collect resources and income'},0),'ECONOMY');
  assert.equal(classifyRobloxScope({path:'social',label:'team shared objective'},0),'SOCIAL');
  assert.equal(classifyRobloxScope({path:'objective',label:'complete quest goal'},0),'OBJECTIVE');
  assert.equal(classifyRobloxScope({path:'mobileUx',label:'touch controls'},0),'MOBILE');
});

test('deterministic Roblox compiler binds approved genre and play mode to generated source',()=>{
  const cases=[
    ['seed-roblox-simulator-tycoon-test','collect resources, upgrade production, earn income, unlock areas','Simulation','Tycoon','SINGLE','ECONOMY'],
    ['seed-roblox-battleground-fight-test','fight opponents, use skills and cooldowns, win rounds','Action','Battlegrounds & Fighting','COMPETITIVE','COMBAT'],
    ['seed-roblox-survival-horror-test','survive threats, find objectives, escape safely','Survival','Escape','SINGLE','SURVIVAL'],
    ['seed-roblox-obby-party-test','move through checkpoints and complete obby rounds','Obby & platformer','Classic Obby','COOP','MOVEMENT'],
    ['seed-roblox-story-rpg-test','explore, fight, complete quests and progress the story','RPG','Action RPG','SINGLE','PROGRESSION'],
    ['seed-puzzle-chromatic-cascade','match colors into chain reactions and solve puzzle boards','Puzzle','Match & Merge','SINGLE','PUZZLE'],
  ];
  for(const [gameId,coreFun,genre,subgenre,playMode,requiredKind] of cases){
    const locked={content:{
      identity:`${gameId} identity`,coreFun,
      coreLoop:['explore or collect','perform the main challenge','receive reward and progress'],
      mobileUx:'touch controls',progressionDirection:'Persistent progression system',
      robloxBuildProfile:buildProfile(genre,subgenre,playMode),
      platformProfiles:{ROBLOX:platformProfile()},
    }};
    const inventory=deriveApprovedScopeInventory(locked);
    const compiled=compileRobloxSource({gameId,gameName:'Compiler Test',baseline:locked,artbook:{}});
    assert.equal(compiled.generationMode,'DETERMINISTIC_PROFILE_BOUND_FULL_SCOPE_IMPLEMENTATION');
    assert.equal(compiled.modelUsed,false);
    assert.equal(compiled.validation.pass,true,compiled.validation.blockers.join(','));
    assert.equal(compiled.profile.genre,genre);
    assert.equal(compiled.profile.playMode,playMode);
    assert.ok(compiled.actions.length>=inventory.length);
    assert.ok(compiled.actions.some(action=>action.kind===requiredKind),`${gameId} missing ${requiredKind}`);
    assert.ok(compiled.result.sharedConfig.includes(`Genre = "${genre}"`));
    assert.ok(compiled.result.sharedConfig.includes(`PlayMode = "${playMode}"`));
    assert.ok(compiled.result.serverCode.includes('RemoteEvent'));
    assert.ok(compiled.result.serverCode.includes('OnServerEvent'));
    assert.ok(compiled.result.clientCode.includes('UserInputService'));
    assert.ok(compiled.result.clientCode.includes('Activated'));
    assert.ok(compiled.result.clientCode.includes('FireServer(action.Id)'));
    assert.ok(compiled.result.serverCode.includes('DataStoreService'));
    for(const row of inventory){
      assert.ok(compiled.result.sharedConfig.includes(row.id));
      const actionIndex=compiled.actions.findIndex(action=>action.id===row.id);
      assert.ok(actionIndex>=0);
      assert.ok(compiled.result.serverCode.includes(`scopeHandler${actionIndex+1}`));
    }
    if(playMode!=='SINGLE'){
      assert.ok(compiled.result.serverCode.includes('Players:GetPlayers()'));
      assert.ok(compiled.result.serverCode.includes('FireAllClients("MULTIPLAYER_SYNC"'));
      assert.ok(compiled.result.clientCode.includes('OnClientEvent'));
    }else{
      assert.ok(!compiled.result.serverCode.includes('FireAllClients("MULTIPLAYER_SYNC"'));
    }
  }
});

test('co-op and competitive profiles require actual synchronized gameplay source',()=>{
  const coop={content:{...baseline.content,robloxBuildProfile:buildProfile('Obby & platformer','Classic Obby','COOP')}};
  const compiledCoop=compileRobloxSource({gameId:'coop',gameName:'Coop',baseline:coop,artbook:{}});
  assert.ok(compiledCoop.result.serverCode.includes('SharedObjective'));
  assert.ok(compiledCoop.result.serverCode.includes('FireAllClients'));
  assert.ok(compiledCoop.result.clientCode.includes('OnClientEvent'));

  const competitive={content:{...baseline.content,robloxBuildProfile:buildProfile('Shooter','Deathmatch Shooter','COMPETITIVE')}};
  const compiledCompetitive=compileRobloxSource({gameId:'pvp',gameName:'PvP',baseline:competitive,artbook:{}});
  assert.ok(compiledCompetitive.result.serverCode.includes('RoundScore'));
  assert.ok(compiledCompetitive.result.serverCode.includes('FireAllClients'));
});

test('Rojo project maps shared server and client source roots',()=>{
  const project=projectJsonForGame('test-game');
  assert.equal(project.name,'test-game');
  assert.equal(project.tree.ReplicatedStorage.Shared.$path,'shared');
  assert.equal(project.tree.ServerScriptService.GameServer.$path,'server');
  assert.equal(project.tree.StarterPlayer.StarterPlayerScripts.GameClient.$path,'client');
});

test('Roblox source workflow keeps compiled candidates pending when Actions cannot create PRs',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/Attempt validated Roblox source promotion through PR[\s\S]*continue-on-error: true/);
  assert.ok(workflow.includes("failure=!generated?'source-generation-failed':!promoted?'source-promotion-pending':null"));
  assert.ok(workflow.includes("routingBlockers:['roblox-source-promotion-pending']"));
  assert.ok(workflow.includes("item.robloxSourceCandidateReadyAt"));
  assert.ok(workflow.includes("item.robloxSourceCandidateBranch"));
  assert.ok(workflow.includes('ROBLOX_SOURCE_PROMOTION_PENDING_COUNT'));
});

test('Roblox package completion follows F0 then private runtime candidate then existing tester QA then F9',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  const preflight=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
  const f0=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-headless-fast-mvp.yml',import.meta.url),'utf8');
  const candidate=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-release-promotion.yml',import.meta.url),'utf8');
  const runtimeQa=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-post-runtime-qa.yml',import.meta.url),'utf8');
  const f9=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-final-review-revalidation.yml',import.meta.url),'utf8');
  assert.ok(preflight.includes('workflow_dispatch:'));
  assert.ok(!preflight.includes('workflow_run:'));
  assert.ok(workflow.includes('gh workflow run company-development-roblox-runtime-continuation.yml --repo "$GITHUB_REPOSITORY" --ref main'));
  assert.ok(preflight.includes('Vibe plus shared-model build preflight'));
  assert.ok(preflight.includes('company-development-roblox-headless-fast-mvp.yml'));
  assert.ok(preflight.includes('ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCHED=YES'));
  assert.ok(f0.includes('Company DEVELOPMENT_CONFIRMED Roblox F0 Source Preflight'));
  assert.ok(f0.includes('company-development-roblox-headless-fast-mvp.mjs'));
  assert.ok(f0.includes('HEADLESS_SOURCE_PREFLIGHT_F0')||f0.includes('robloxFoundationF0Passed'));
  assert.ok(f0.includes("item.currentStep='PRIVATE_RUNTIME_CANDIDATE_DEPLOY'"));
  assert.ok(f0.includes('Dispatch private runtime candidate deployment'));
  assert.ok(candidate.includes('Private Runtime Candidate Deployment'));
  assert.ok(candidate.includes("item.currentStep='TARGET_PLATFORM_RUNTIME_FOUNDATION'"));
  assert.ok(candidate.includes('company-development-roblox-post-runtime-qa.yml'));
  assert.ok(runtimeQa.includes('Roblox Runtime Foundation QA'));
  assert.ok(runtimeQa.includes('validateRobloxRuntimeFoundationEvidence'));
  assert.ok(runtimeQa.includes("item.currentStep='ROBLOX_FINAL_REVIEW_REVALIDATION'"));
  assert.ok(runtimeQa.includes('company-development-roblox-final-review-revalidation.yml'));
  assert.ok(f9.includes('Roblox F9 Final Review'));
  assert.ok(f9.includes('item.robloxInternalReleaseReady=true'));
  assert.ok(!f0.includes('ROBLOX_FAKE_RUNTIME_PASS=ALLOWED'));
});

test('new Roblox package identity clears every downstream preflight runtime and QA checkpoint',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  for(const marker of [
    'robloxBuildPreflightPassedAt:null','robloxBuildPreflightFailedAt:null','robloxBuildPreflightEvidence:null',
    'robloxFoundationF0Passed:false','robloxFoundationF0PassedAt:null','robloxFoundationF0Evidence:null',
    'robloxHeadlessFastMvpPassed:false','robloxHeadlessFastMvpEvidence:null',
    'robloxRuntimeCandidateEvidence:null','robloxRuntimeFoundationPassed:false','robloxRuntimeFoundationEvidence:null',
    'robloxRuntimePassedAt:null','robloxRuntimeFailedAt:null','robloxRuntimeEvidence:null','robloxRuntimeRetryCount:0',
    'robloxServerClientBoundaryPassed:false','robloxDatastoreRejoinPassed:false','robloxMobileControlUiPassed:false',
    'robloxIndependentQaPassedAt:null','robloxRegressionPassedAt:null','robloxFinalReviewPassedAt:null','robloxF9ReleaseRegressionPassed:false','robloxF9ReleaseRegressionEvidence:null','robloxPostRuntimeQaEvidence:null',
    'robloxInternalReleaseReady:false','robloxInternalReleaseAt:null',
  ]) assert.ok(workflow.includes(marker),`missing downstream reset: ${marker}`);
});

test('successful Roblox package flow auto-dispatches shared preflight then F0 without a Studio approval gate',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  const preflight=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime-continuation.yml',import.meta.url),'utf8');
  assert.ok(workflow.includes('Dispatch Roblox HEADLESS FAST_MVP continuation')||workflow.includes('continuation'));
  assert.ok(!workflow.includes("github.actor == 'github-actions[bot]'"));
  assert.ok(workflow.includes('ROBLOX_PACKAGE_PENDING_BEFORE_CONTINUATION'));
  assert.ok(workflow.includes('ROBLOX_PREFLIGHT_READY_COUNT'));
  assert.ok(workflow.includes('ROBLOX_ACTIVE_CONTINUATIONS='));
  assert.ok(workflow.includes('gh workflow run company-development-roblox-runtime-continuation.yml --repo "$GITHUB_REPOSITORY" --ref main'));
  assert.ok(workflow.includes('ROBLOX_POST_PACKAGE_CONTINUATION_DISPATCH=YES'));
  assert.ok(preflight.includes('company-development-roblox-headless-fast-mvp.yml'));
  assert.ok(preflight.includes('ROBLOX_F0_SOURCE_PREFLIGHT_DISPATCHED=YES'));
  assert.ok(!preflight.includes('studio_run_approved:'));
});


test('Roblox bootstrap consumes Vibe3 playbook and transformative learning context',()=>{
  const playbooks={
    taskTypes:{
      roblox:{
        authority:'verified-task-playbook',
        checklist:[
          'bind-roblox-source-and-place',
          'separate-server-client-authority',
          'validate-remotes-and-datastore-boundaries',
          'run-real-roblox-runtime-and-independent-qa'
        ],
        reuse:[{project:'block-blast'},{project:'shattered-pixel-dungeon'}]
      },
      coding:{
        checklist:['rank-responsible-source-before-edit','run-syntax-tests-runtime-regression'],
        reuse:[{project:'idle-fantasy'}]
      }
    }
  };
  const recombination={
    recipes:[{
      id:'recombine-roblox-test',
      sourceProjects:['block-blast','shattered-pixel-dungeon'],
      featureBlend:['progression-difficulty','touch-input','session-retry-gameover'],
      transformationOperator:'change-input-model',
      internalCreationRequirement:'ADD_PROJECT_SPECIFIC_ORIGINAL_MECHANIC_OR_CONSTRAINT'
    }]
  };
  const learned=compileRobloxSource({
    gameId:'roblox-learning-test',
    gameName:'Learning Test',
    baseline,
    artbook:{content:{identity:'Pocket Foundry',coreLoop:['collect','upgrade','unlock']}},
    playbooks,
    recombination
  });
  assert.equal(learned.learning.applied,true);
  assert.equal(learned.learning.recipeId,'recombine-roblox-test');
  assert.equal(learned.generationMode,'DETERMINISTIC_PROFILE_BOUND_WITH_VIBE3_LEARNING_CONTEXT');
  assert.ok(learned.actions.some(action=>Boolean(action.learningPattern)));
  assert.ok(learned.result.sharedConfig.includes('LearningContext = {'));
  assert.ok(learned.result.sharedConfig.includes('RecipeId = "recombine-roblox-test"'));
  assert.ok(learned.result.serverCode.includes('ActionSequence'));
  assert.ok(learned.result.serverCode.includes('LastLearningPattern'));
  assert.ok(learned.result.clientCode.includes('ContextActionService'));
  assert.ok(learned.result.clientCode.includes('BindAction("VibePrimaryAction"'));
  assert.equal(learned.validation.learningApplied,true);
  assert.equal(learned.validation.pass,true,learned.validation.blockers.join(','));
});

test('Roblox source workflow requires durable Vibe3 learning memory for source generation',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.ok(workflow.includes('VIBE2_LEARNING_RUNTIME_BRANCH: vibe2-learning-runtime'));
  assert.ok(workflow.includes('company-learning/vibe3-task-playbooks.json'));
  assert.ok(workflow.includes('company-learning/vibe3-recombination-memory.json'));
  assert.ok(workflow.includes('--playbooks=/tmp/vibe3-task-playbooks.json'));
  assert.ok(workflow.includes('--recombination=/tmp/vibe3-recombination-memory.json'));
  assert.ok(workflow.includes('ROBLOX_VIBE3_LEARNING_MEMORY=READY'));
  assert.ok(workflow.includes('e.vibe3LearningApplied!==true||!e.recombinationRecipeId'));
});

test('Roblox source workflow treats every development-confirmed game as the Roblox side of the automatic pair',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.ok(workflow.includes("platformDevelopmentEligible(item,'ROBLOX')"));
  assert.ok(workflow.includes("target=`roblox-games/${item.gameId}`")||workflow.includes("const target=`roblox-games/${item.gameId}`"));
  assert.ok(workflow.includes('ROBLOX_EXECUTION_BATCH_CAPACITY='));
  assert.ok(workflow.includes('DEVELOPMENT_GAME_ELIGIBILITY_CAP=NONE'));
  assert.ok(workflow.includes('ROBLOX_RUNNER_PARALLEL_CAPACITY=EXTERNAL_PROVIDER_MANAGED'));
  assert.doesNotMatch(workflow,/max-parallel:\s*6/);
});


test('Roblox compiler is admitted by native platform design and does not consume Web handoff',()=>{
  const compiled=compileRobloxSource({gameId:'demo',gameName:'Demo',baseline,artbook:{},webHandoff:{stage:'INVALID_WEB_STAGE'}});
  assert.equal(compiled.validation.pass,true);
  assert.equal(compiled.webHandoff,null);
  assert.ok(compiled.result.sharedConfig.includes('DesignBaseline = {'));
  assert.ok(compiled.result.sharedConfig.includes('PlatformProfile = {'));
  assert.ok(compiled.result.sharedConfig.includes('AdmissionGate = "MINIMUM_DUAL_PLATFORM_DESIGN_READY"'));
});

test('central development orchestrator dispatches both native lanes without Web presentation gate',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-confirmed-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/company-development-roblox-runtime\.yml/);
  assert.match(workflow,/company-development-unity-runtime\.yml/);
  assert.match(workflow,/UNITY_WEB_RUNTIME_ROLE=NON_BLOCKING_VALIDATION_SURFACE/);
  assert.doesNotMatch(workflow,/WEB_PRESENTATION_HANDOFF_REJECTED/);
});

test('owner-focused concurrent Roblox lane carries exact merged source revision into package without replacing canonical Unity',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/merge_sha="\$\(gh pr view "\$pr_url".*\.mergeCommit\.oid/s);
  assert.match(workflow,/source_revision=\$merge_sha/);
  assert.match(workflow,/sourceRevision:\/\^\[0-9a-f\]\{40\}\$\/i/);
  assert.match(workflow,/ownerFocusRobloxSourceCommit:result\.sourceRevision/);
  assert.match(workflow,/ownerFocusRobloxSourceBootstrapPassedAt:stamp/);
  assert.match(workflow,/ownerFocusedSecondaryPlatformEligible\(item,roadmap,'ROBLOX'\)/);
  assert.match(workflow,/ownerFocusRobloxBuildOrPackagePassed===true/);
  assert.match(workflow,/ownerFocusRobloxBuildSourceRevision===sourceRevision/);
  assert.match(workflow,/ownerFocusRobloxAssetPipelineState:'BUILD_READY'/);
  const secondaryPersistAt=workflow.indexOf("const secondaryOwnerFocus=expectedById.get(result.gameId)?.secondaryOwnerFocus===true;");
  assert.ok(secondaryPersistAt>=0,'secondary package persist branch missing');
  const secondaryPersistEnd=workflow.indexOf('continue;',secondaryPersistAt);
  const secondaryPersist=workflow.slice(secondaryPersistAt,secondaryPersistEnd);
  assert.doesNotMatch(secondaryPersist,/selectedPlatform:'ROBLOX'/);
  assert.doesNotMatch(secondaryPersist,/targetPlatform:'ROBLOX'/);
  assert.doesNotMatch(secondaryPersist,/currentStep:'TARGET_PLATFORM_TECHNICAL_VALIDATION'/);
  assert.doesNotMatch(secondaryPersist,/canonicalState:'TARGET_PLATFORM_REPAIR_REQUIRED'/);
});

test('owner-focused Roblox package completion dispatches the existing continuation without canonical Unity mutation',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/ownerFocusedSecondaryPlatformEligible\(item,roadmap,'ROBLOX'\)/);
  assert.match(workflow,/ownerFocusRobloxBuildOrPackagePassed===true/);
  assert.match(workflow,/ownerFocusRobloxBuildPreflightPassed/);
  assert.match(workflow,/ownerFocusRobloxRuntimePassed/);
  assert.match(workflow,/company-development-roblox-runtime-continuation\.yml/);
  assert.match(workflow,/ROBLOX_POST_PACKAGE_CONTINUATION_DISPATCH=YES/);
});


test('exact game_id runtime dispatch isolates source and package selection',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/workflow_dispatch:[\s\S]*game_id:/);
  assert.ok((workflow.match(/REQUESTED_GAME_ID: \$\{\{ inputs\.game_id \|\| '' \}\}/g)||[]).length>=2);
  assert.ok((workflow.match(/if\(requested&&item\.gameId!==requested\)continue;/g)||[]).length>=2);
  assert.match(workflow,/ROBLOX_REQUESTED_TECHNICAL_GAME_ID=/);
});


test('stale historical Roblox runtime executions cannot roll source or package state backward',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/company-development-roblox-runtime.yml',import.meta.url),'utf8');
  assert.match(workflow,/currentMainRevision=execFileSync\('git',\['rev-parse','origin\/main'\]/);
  assert.match(workflow,/ROBLOX_SOURCE_RECONCILIATION_STALE_IGNORED=/);
  assert.match(workflow,/reconciliationRevision!==currentMainRevision/);
  assert.match(workflow,/ROBLOX_PACKAGE_STALE_RESULT_IGNORED=/);
  assert.match(workflow,/boundSourceRevision!==resultSourceRevision/);
});
