import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateRobloxGameplayProductReadiness,
  evaluateRobloxF9ProductReadiness,
  robloxLearningProfileFromSource,
  robloxDesignProfileFromBaseline
} from '../tools/company-development-roblox-gameplay-product-readiness.mjs';

const survivalBaseline={
  content:{
    identity:'Action survival roguelite where the player gathers resources by day and survives enemy waves at night.',
    coreFun:'real-time combat plus resource choices',
    coreLoop:[
      '낮 시간 동안 자원을 채집하고 도구와 무기를 제작합니다.',
      '밤이 되면 몰려오는 적의 웨이브를 막아냅니다.',
      '전투 종료 후 경험치와 자원으로 성장과 제작법을 해금합니다.'
    ],
    signatureSystems:[
      {name:'일일 생존 기록 시스템',purpose:'생존일과 다음 날 난이도를 연결합니다.'},
      {name:'즉석 제작 및 개조 시스템',purpose:'채집 자원으로 장비와 함정을 제작합니다.'}
    ],
    progressionDirection:'레벨, 해금, 장비 성장을 장기 진행으로 저장합니다.',
    multiplayerMode:'SINGLE'
  }
};

const project='{"tree":{"$className":"DataModel","ServerScriptService":{"GameServer":{"$path":"server"}},"StarterPlayer":{"StarterPlayerScripts":{"GameClient":{"$path":"client"}}}}}';
const mobileClient=`
local UserInputService=game:GetService("UserInputService")
local ContextActionService=game:GetService("ContextActionService")
local gui=Instance.new("ScreenGui")
local button=Instance.new("TextButton")
button.Activated:Connect(function() end)
if UserInputService.TouchEnabled then ContextActionService:BindAction("x",function() end,true,Enum.KeyCode.ButtonA) end
`;

test('generic scope handler skeleton cannot satisfy a survival design',()=>{
  const config=`
local Config={Platform="ROBLOX",MobileFirst=true,SaveEnabled=true,Genre="Strategy",PlayMode="SINGLE",Actions={{Id="a"}}}
return Config
`;
  const server=`
local Players=game:GetService("Players")
local DataStoreService=game:GetService("DataStoreService")
local store=DataStoreService:GetDataStore("x")
local function scopeHandler1(p) p:SetAttribute("Progress",1) end
local function scopeHandler2(p) p:SetAttribute("EnemyHealth",90) end
local function scopeHandler3(p) p:SetAttribute("Wave",2) end
local remote=Instance.new("RemoteEvent")
remote.OnServerEvent:Connect(function(player,action) if typeof(action)=="string" then scopeHandler1(player) end end)
Players.PlayerAdded:Connect(function(player) pcall(function() store:GetAsync("p:"..player.UserId) end) end)
Players.PlayerRemoving:Connect(function(player) pcall(function() store:UpdateAsync("p:"..player.UserId,function() return {} end) end) end)
`;
  const result=evaluateRobloxGameplayProductReadiness({gameId:'survival',baseline:survivalBaseline,config,server,client:mobileClient,project});
  assert.equal(result.pass,false);
  assert.equal(result.antiSkeletonPassed,false);
  assert.ok(result.blockers.includes('GENERIC_SCOPE_HANDLER_SKELETON'));
  assert.ok(result.blockers.includes('MISSING_GAMEPLAY_CAPABILITY:GATHERING'));
  assert.ok(result.blockers.includes('MISSING_GAMEPLAY_CAPABILITY:CRAFTING'));
  assert.ok(result.blockers.includes('MISSING_GAMEPLAY_CAPABILITY:DAY_NIGHT'));
  assert.ok(result.blockers.includes('MISSING_GAMEPLAY_CAPABILITY:WAVE'));
});

test('connected survival systems satisfy the product contract',()=>{
  const config=`
local Config={Platform="ROBLOX",MobileFirst=true,SaveEnabled=true,Genre="Survival",PlayMode="SINGLE",Actions={{Id="gather"}}}
return Config
`;
  const server=`
local Players=game:GetService("Players")
local DataStoreService=game:GetService("DataStoreService")
local PathfindingService=game:GetService("PathfindingService")
local store=DataStoreService:GetDataStore("x")
local DayPhase="DAY"
local CurrentWave=0
local function buildWorld() local p=Instance.new("Part"); p.Parent=workspace end
local function spawnEnemy() local m=Instance.new("Model"); m.Name="Enemy"; m.Parent=workspace; return m end
local function gatherResource(player) player:SetAttribute("Wood",(player:GetAttribute("Wood") or 0)+1) end
local function craftWeapon(player) player:SetAttribute("EquippedWeapon","Spear") end
local function attackEnemy(player) local enemy=spawnEnemy(); enemy:SetAttribute("DamageTaken",10) end
local function targetEnemy(enemy) PathfindingService:CreatePath(); return enemy end
local function startWave() CurrentWave+=1; spawnEnemy() end
local function startNight() DayPhase="NIGHT"; startWave() end
local function nextDay() DayPhase="DAY" end
local function awardProgress(player) player:SetAttribute("XP",(player:GetAttribute("XP") or 0)+10); player:SetAttribute("Level",1) end
local function addItem(player) player:SetAttribute("InventoryWood",(player:GetAttribute("InventoryWood") or 0)+1) end
local function equipItem(player) player:SetAttribute("Equipped","Spear") end
local remote=Instance.new("RemoteEvent")
remote.OnServerEvent:Connect(function(player,action)
  if typeof(action)~="string" then return end
  if action=="GATHER" then gatherResource(player); addItem(player)
  elseif action=="CRAFT" then craftWeapon(player); equipItem(player)
  elseif action=="ATTACK" then attackEnemy(player)
  elseif action=="NIGHT" then startNight()
  elseif action=="NEXT_DAY" then nextDay(); awardProgress(player) end
end)
Players.PlayerAdded:Connect(function(player) pcall(function() store:GetAsync("p:"..player.UserId) end); buildWorld() end)
Players.PlayerRemoving:Connect(function(player) pcall(function() store:UpdateAsync("p:"..player.UserId,function() return {XP=player:GetAttribute("XP")} end) end) end)
`;
  const result=evaluateRobloxGameplayProductReadiness({gameId:'survival',baseline:survivalBaseline,config,server,client:mobileClient+'\nlocal remote=Instance.new("RemoteEvent"); remote:FireServer("GATHER")',project});
  assert.equal(result.antiSkeletonPassed,true);
  assert.equal(result.pass,true);
  assert.equal(result.implementedCapabilities.GATHERING,true);
  assert.equal(result.implementedCapabilities.CRAFTING,true);
  assert.equal(result.implementedCapabilities.DAY_NIGHT,true);
  assert.equal(result.implementedCapabilities.WAVE,true);
  assert.equal(result.implementedCapabilities.PROGRESSION,true);
});

test('4v4 design cannot be classified as non multiplayer',()=>{
  const baseline={content:{identity:'4v4 infection chase',coreLoop:['4v4 round','infect opponents'],multiplayerMode:'COMPETITIVE'}};
  const result=evaluateRobloxGameplayProductReadiness({
    gameId:'horror-escape-room',
    baseline,
    config:'local Config={Genre="Survival",PlayMode="COMPETITIVE",MobileFirst=true} return Config',
    server:'local Players=game:GetService("Players")\nlocal function infectPlayer() end\nlocal function endRound() end',
    client:mobileClient,
    project
  });
  assert.ok(result.requiredCapabilities.includes('MULTIPLAYER'));
  assert.ok(result.blockers.includes('MISSING_GAMEPLAY_CAPABILITY:MULTIPLAYER'));
});


test('design-grounded profile prioritizes survival identity over incidental strategy wording',()=>{
  const profile=robloxDesignProfileFromBaseline({content:{
    identity:'극한 환경에서 매일 살아남는 액션 생존 로그라이트',
    coreFun:'실시간 액션과 자원 관리의 전략적 선택',
    coreLoop:['낮에 채집한다','밤에 적을 막는다'],
    multiplayerMode:'SINGLE'
  }});
  assert.equal(profile.genre,'Survival');
  assert.equal(profile.playMode,'SINGLE');
});

test('learning profile follows the actual game config instead of stale per-game hardcoding',()=>{
  const profile=robloxLearningProfileFromSource({
    gameId:'horror-escape-room',
    config:'local Config={Genre="Survival",Subgenre="Infection Chase",PlayMode="COMPETITIVE"} return Config',
    fallback:{genre:'Party & casual',playMode:'SINGLE'}
  });
  assert.equal(profile.genre,'Survival');
  assert.equal(profile.playMode,'COMPETITIVE');
  assert.equal(profile.multiplayerRequired,true);
});

test('F9 blocks exact engine execution without server boot actual play and real world evidence',()=>{
  const f0Evidence={
    gameplayProductReadiness:{
      pass:true,
      studioQualitySheet:{Core:'PLAYABLE'},
      studioReadiness:{f9SourceQualityReady:true,criticalGaps:[]},
      runtimeRequirements:{worldRequired:true,minimumBasePartCount:5,spawnRequired:true,landmarkRequired:true,objectiveRequired:true,serverBootRequired:true,simulationRequired:true,actualPlayRequired:true}
    }
  };
  const blocked=evaluateRobloxF9ProductReadiness({
    f0Evidence,
    runtimeEvidence:{engineExecuted:true,exactEngineVersion:true,simulationRunning:false,serverBootObserved:false,f5InputCameraUiPassed:false,f8GameplaySystemsPassed:false,openCloudWorldEvidence:{basePartCount:1,spawnCount:0,landmarkCount:0,objectiveCount:0}},
    postRuntimeQaEvidence:{actualRuntimeEvidence:false},
    studioPlayEvidence:{}
  });
  assert.equal(blocked.pass,false);
  assert.ok(blocked.blockers.includes('F9_SERVER_BOOT_MISSING'));
  assert.ok(blocked.blockers.includes('F9_ACTUAL_PLAY_EVIDENCE_MISSING'));
  assert.ok(blocked.blockers.includes('F9_WORLD_BASEPART_MINIMUM_MISSING'));
  assert.ok(blocked.blockers.includes('F9_MOBILE_INPUT_UI_RUNTIME_MISSING'));
  assert.ok(blocked.blockers.includes('F9_CORE_LOOP_RUNTIME_MISSING'));

  const pass=evaluateRobloxF9ProductReadiness({
    f0Evidence,
    runtimeEvidence:{engineExecuted:true,exactEngineVersion:true,simulationRunning:true,serverBootObserved:true,f5InputCameraUiPassed:true,f8GameplaySystemsPassed:true,openCloudWorldEvidence:{basePartCount:20,spawnCount:1,landmarkCount:2,objectiveCount:1}},
    postRuntimeQaEvidence:{actualRuntimeEvidence:true},
    studioPlayEvidence:{}
  });
  assert.equal(pass.pass,true);
  assert.equal(pass.mobileRuntime,true);
  assert.equal(pass.coreLoopRuntime,true);
  assert.equal(pass.verticalSlicePassed,true);
});


test('runtime workflow routes F0 gameplay product failures to canonical Vibe build-up',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/ROBLOX_F0_GAMEPLAY_PRODUCT_READINESS_FAILED/);
  assert.match(workflow,/roblox-f0-gameplay-product-readiness-failure/);
  assert.match(workflow,/ROBLOX_F0_GAMEPLAY_PRODUCT_VIBE_REFILL=/);
  assert.match(workflow,/event_type:"vibe2-fanin-refill"/);
  assert.match(workflow,/source_outcome:"FAILED"/);
  assert.match(workflow,/reason:"roblox-f0-gameplay-product-repair"/);
  assert.match(workflow,/result\.f0Pass===true[\s\S]*gameplayProductReadinessRequired===true/);
});

test('Roblox runtime consumes only the platform-specific BUILD_UP directive',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  assert.match(workflow,/current\/roblox\.json/);
  assert.match(workflow,/ROBLOX_BUILD_UP_DIRECTIVE_PLATFORM_MISMATCH/);
  assert.match(workflow,/ROBLOX_BUILD_UP_DIRECTIVE_RESPONSIBLE_FILES_MISSING/);
  assert.doesNotMatch(workflow,/origin\/vibe2-unreal-core:\.vibe2\/build-up-directives\/\$\{GAME_ID\}\/current\.json/);
});

test('verified learning sweep derives genre and play mode from each actual GameConfig',()=>{
  const sweep=fs.readFileSync('tools/company-roblox-verified-learning-sweep.mjs','utf8');
  assert.match(sweep,/robloxLearningProfileFromSource/);
  assert.match(sweep,/shared','GameConfig\.luau/);
  assert.match(sweep,/configSource/);
  assert.match(sweep,/fallbackProfile/);
  assert.match(sweep,/latestVerifiedDesign/);
  assert.match(sweep,/robloxDesignProfileFromBaseline/);
});
