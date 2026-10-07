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
  assert.equal(result.pass,true,JSON.stringify({blockers:result.blockers,required:result.requiredCapabilities,implemented:result.implementedCapabilities}));
  assert.equal(result.implementedCapabilities.GATHERING,true);
  assert.equal(result.implementedCapabilities.CRAFTING,true);
  assert.equal(result.implementedCapabilities.DAY_NIGHT,true);
  assert.equal(result.implementedCapabilities.WAVE,true);
  assert.equal(result.implementedCapabilities.PROGRESSION,true);
});

test('tycoon optimization and feedback collection do not create combat AI or resource gathering requirements',()=>{
  const tycoonBaseline={content:{
    identity:'3D 놀이공원 경영 시뮬레이션에서 동선을 최적화하고 손님 만족도를 관리한다.',
    coreFun:'손님 이동 경로와 만족도 피드백을 수집해 수익을 최적화한다.',
    coreLoop:[
      '놀이기구와 편의시설을 배치하고 동선을 설계한다.',
      '손님 흐름 관찰 및 피드백 수집으로 병목을 파악한다.',
      '수익을 재투자해 시설을 업그레이드하고 새 구역을 해금한다.'
    ],
    progressionDirection:'업그레이드와 구역 해금으로 성장한다.',
    multiplayerMode:'SINGLE'
  }};
  const result=evaluateRobloxGameplayProductReadiness({
    gameId:'amusement-tycoon',
    baseline:tycoonBaseline,
    config:'local Config={Genre="Simulation",Subgenre="Tycoon",PlayMode="SINGLE",MobileFirst=true} return Config',
    server:'local function buildWorld() local p=Instance.new("Part"); p.Parent=workspace end\nlocal function spawnCustomer() local m=Instance.new("Model"); m.Parent=workspace end\nlocal function startParkDay() end\nlocal function finishParkDay() end\nlocal function upgradeRide(player) player:SetAttribute("Level",2) end',
    client:mobileClient,
    project
  });
  assert.equal(result.requiredCapabilities.includes('COMBAT'),false);
  assert.equal(result.requiredCapabilities.includes('ENEMY_AI'),false);
  assert.equal(result.requiredCapabilities.includes('GATHERING'),false);
  assert.ok(result.requiredCapabilities.includes('TYCOON'));
  assert.ok(result.requiredCapabilities.includes('WORLD'));
  assert.ok(result.requiredCapabilities.includes('CONTENT_ENTITY'));
  assert.ok(result.requiredCapabilities.includes('PROGRESSION'));

  const survival=evaluateRobloxGameplayProductReadiness({
    gameId:'survival-positive-control',
    baseline:survivalBaseline,
    config:'local Config={Genre="Survival",PlayMode="SINGLE",MobileFirst=true} return Config',
    server:'',
    client:mobileClient,
    project
  });
  assert.ok(survival.requiredCapabilities.includes('COMBAT'));
  assert.ok(survival.requiredCapabilities.includes('ENEMY_AI'));
  assert.ok(survival.requiredCapabilities.includes('GATHERING'));
});

test('SINGLE multiplayerMode metadata key does not create a false multiplayer requirement',()=>{
  const baseline={content:{identity:'solo survival',coreLoop:['survive one session'],multiplayerMode:'SINGLE'}};
  const result=evaluateRobloxGameplayProductReadiness({
    gameId:'solo-survival',
    baseline,
    config:'local Config={Genre="Survival",PlayMode="SINGLE",MobileFirst=true} return Config',
    server:'local function startSession() end\nlocal function endSession() end',
    client:mobileClient,
    project
  });
  assert.equal(result.requiredCapabilities.includes('MULTIPLAYER'),false);
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


test('daechung style RPG lifecycle and equipment are recognized without fake crafting',()=>{
  const baseline={content:{
    identity:'마을에서 장비와 퀘스트를 준비하고 포탈 사냥터에서 AI 동료와 보스를 공략하는 3D 액션 RPG.',
    coreFun:'몬스터 전투와 파티 사냥 보상으로 성장한다.',
    coreLoop:['마을에서 장비 준비','포탈 입장','몬스터 전투','15마리 파티 사냥과 보상','마을 귀환'],
    signatureSystems:[
      {name:'5단계 장비',purpose:'무기와 방어구를 5단계로 성장한다.'},
      {name:'보스 동료 수집',purpose:'별도 인간형 캐릭터 제작 없이 보스 외형을 동료에 재사용한다.'}
    ],
    progressionDirection:'전투와 장비 강화로 성장한다.',
    multiplayerMode:'COOP',
    robloxBuildProfile:{
      version:1,targetPlatform:'ROBLOX',genre:'RPG',subgenre:'Portal RPG',playMode:'COOP',
      multiplayerRequired:true,coopImplementationRequired:true,competitiveImplementationRequired:false,
      networkingRequired:true,multiplayerQaRequired:true,minimumParticipantsForRequiredQa:2
    }
  }};
  const server=[
    'local Players=game:GetService("Players")',
    'local DataStoreService=game:GetService("DataStoreService")',
    'local store=DataStoreService:GetDataStore("x")',
    'local remote=Instance.new("RemoteEvent")',
    'local function buildWorld() local p=Instance.new("Part"); p.Parent=workspace end',
    'local function spawnEnemy() local m=Instance.new("Model"); m.Parent=workspace end',
    'local function playerAttack() end',
    'local function enemyTarget() end',
    'local function completeQuestIfNeeded() end',
    'local function spawnBoss() end',
    'local function awardProgress(player) player:SetAttribute("Level",2) end',
    'local function enterPortal(player) player:SetAttribute("PartyHuntActive",true) end',
    'local function finishPartyHunt(player) player:SetAttribute("PartyHuntActive",false) end',
    'local function upgradeGear(player) player:SetAttribute("WeaponTier",2); player:SetAttribute("ArmorTier",2) end',
    'remote.OnServerEvent:Connect(function() end)',
    'Players.PlayerAdded:Connect(function(player) store:GetAsync("p:"..player.UserId); buildWorld() end)',
    'Players.PlayerRemoving:Connect(function(player) store:UpdateAsync("p:"..player.UserId,function() return {} end) end)',
    'Players:GetPlayers()',
    'remote:FireAllClients("sync")'
  ].join("\n");
  const client=mobileClient+'\nlocal remote=Instance.new("RemoteEvent"); remote.OnClientEvent:Connect(function() end)';
  const result=evaluateRobloxGameplayProductReadiness({
    gameId:'daechung-rpg',
    baseline,
    config:'local Config={Genre="RPG",PlayMode="COOP",MobileFirst=true} return Config',
    server,
    client,
    project
  });
  assert.equal(result.requiredCapabilities.includes('CRAFTING'),false);
  assert.equal(result.requiredCapabilities.includes('EQUIPMENT'),true);
  assert.equal(result.implementedCapabilities.EQUIPMENT,true);
  assert.equal(result.implementedCapabilities.SESSION_FLOW,true);
});

test('future expansion and platform metadata do not inflate current F0 capabilities',()=>{
  const baseline={content:{
    identity:'놀이공원을 운영하고 손님 만족도를 관리하는 전략 경영 게임',
    coreFun:'동선을 최적화하고 수익을 재투자한다',
    coreLoop:[
      '놀이기구와 편의시설을 배치한다',
      '손님 흐름과 만족도를 확인한다',
      '수익으로 시설을 업그레이드한다'
    ],
    signatureSystems:[
      {name:'동선 최적화 시스템',purpose:'손님 이동 효율을 높인다',playerChoice:'길과 입구 위치를 조정한다'}
    ],
    progressionDirection:'시설 업그레이드와 구역 확장으로 성장한다',
    multiplayerMode:'SINGLE',
    contentExpansionPlan:[{milestone:'계절 이벤트',newGameplay:'향후 한정 퀘스트와 글로벌 랭킹을 추가한다'}],
    technicalAssumptions:['클라우드 저장으로 진행 데이터를 보존한다'],
    platformProfiles:{ROBLOX:{
      platform:'ROBLOX',
      inputModel:'Roblox touch controls with keyboard and gamepad parity',
      sessionModel:'Fast single-player Roblox park management session',
      multiplayerRuntime:'single-player server boundary; no fake multiplayer claims',
      performanceBudget:'maintain stable mobile frame pacing with bounded instances',
      uiUx:'Touch-safe Roblox ScreenGui with readable feedback',
      saveAndNetwork:'Server validated persistent save state',
      platformContentAdaptation:'Roblox native park management adaptation',
      internalReleaseTarget:'Private restricted Roblox owner playtest experience',
      validationEvidence:'Exact source runtime mobile QA and regression evidence'
    }}
  }};
  const result=evaluateRobloxGameplayProductReadiness({
    gameId:'amusement-tycoon',
    baseline,
    config:'local Config={Genre="Strategy",PlayMode="SINGLE",MobileFirst=true} return Config',
    server:'local DataStoreService=game:GetService("DataStoreService")\nlocal store=DataStoreService:GetDataStore("x")\nlocal function buildWorld() local p=Instance.new("Part"); p.Parent=workspace end\nlocal function spawnCustomer() local m=Instance.new("Model"); m.Parent=workspace end\nlocal function startParkDay() end\nlocal function finishParkDay() end\nlocal function upgradeRide(player) player:SetAttribute("Level",2) end\nlocal function save(player) store:UpdateAsync("p:"..player.UserId,function() return {} end) end\nlocal function load(player) store:GetAsync("p:"..player.UserId) end',
    client:mobileClient,
    project
  });
  assert.equal(result.requiredCapabilities.includes('QUEST'),false);
  assert.equal(result.requiredCapabilities.includes('MULTIPLAYER'),false);
  assert.equal(result.requiredCapabilities.includes('DAY_NIGHT'),false);
  assert.equal(result.requiredCapabilities.includes('SAVE'),true);
});

test('single-player tycoon metadata does not imply enemy AI day-night or multiplayer gameplay',()=>{
  const baseline={content:{
    identity:'놀이공원 경영 게임에서 손님 만족도가 낮아지면 수익이 감소한다.',
    coreFun:'동선을 최적화하고 공원을 안정적으로 maintain 한다.',
    coreLoop:['시설을 배치한다','손님 만족도를 확인한다','수익으로 시설을 업그레이드한다'],
    progressionDirection:'업그레이드로 성장한다.',
    multiplayerMode:'SINGLE',
    platformProfiles:{ROBLOX:{
      platform:'ROBLOX',
      inputModel:'Roblox touch controls with keyboard and gamepad parity',
      sessionModel:'Fast single-player Roblox park management session',
      multiplayerRuntime:'single-player server boundary; no fake multiplayer claims',
      performanceBudget:'maintain stable mobile frame pacing with bounded instances',
      uiUx:'Touch-safe Roblox ScreenGui with readable feedback',
      saveAndNetwork:'Server validated persistent save state',
      platformContentAdaptation:'Roblox native park management adaptation',
      internalReleaseTarget:'Private restricted Roblox owner playtest experience',
      validationEvidence:'Exact source runtime mobile QA and regression evidence'
    }}
  }};
  const result=evaluateRobloxGameplayProductReadiness({
    gameId:'amusement-tycoon',
    baseline,
    config:'local Config={Genre="Strategy",PlayMode="SINGLE",MobileFirst=true} return Config',
    server:'local function buildWorld() local p=Instance.new("Part"); p.Parent=workspace end\nlocal function spawnCustomer() local m=Instance.new("Model"); m.Parent=workspace end\nlocal function startParkDay() end\nlocal function finishParkDay() end\nlocal function upgradeRide(player) player:SetAttribute("Level",2) end',
    client:mobileClient,
    project
  });
  assert.equal(result.requiredCapabilities.includes('ENEMY_AI'),false);
  assert.equal(result.requiredCapabilities.includes('DAY_NIGHT'),false);
  assert.equal(result.requiredCapabilities.includes('MULTIPLAYER'),false);
});

test('canonical Roblox profile owns genre when the approved baseline provides platform design',()=>{
  const baseline={content:{
    identity:'놀이공원 타이쿤은 동선을 설계하고 손님 만족도를 관리하는 3D 전략 경영 게임입니다.',
    coreFun:'동선 최적화와 손님 만족도 관리',
    coreLoop:[
      '놀이기구와 편의시설을 배치한다.',
      '손님 흐름과 만족도를 확인한다.',
      '수익을 재투자해 시설을 업그레이드한다.'
    ],
    progressionDirection:'시설 업그레이드와 구역 확장으로 성장한다.',
    multiplayerMode:'SINGLE',
    platformProfiles:{ROBLOX:{
      platform:'ROBLOX',
      inputModel:'Roblox touch controls with keyboard and gamepad parity',
      sessionModel:'Fast single-player Roblox park management session',
      multiplayerRuntime:'Single-player server authority without multiplayer claims',
      performanceBudget:'Mobile-first bounded instances and stable frame pacing',
      uiUx:'Touch-safe Roblox ScreenGui with readable state feedback',
      saveAndNetwork:'Server validated actions with persistent save semantics',
      platformContentAdaptation:'Roblox avatar-scale native park management adaptation',
      internalReleaseTarget:'Private restricted Roblox owner playtest experience',
      validationEvidence:'Exact source runtime mobile QA and regression evidence'
    }}
  }};
  const profile=robloxDesignProfileFromBaseline(baseline);
  assert.equal(profile.genre,'Strategy');
  assert.equal(profile.playMode,'SINGLE');

  const server='local function buildWorld() local p=Instance.new("Part"); p.Parent=workspace end\nlocal function spawnCustomer() local m=Instance.new("Model"); m.Parent=workspace end\nlocal function startParkDay() end\nlocal function finishParkDay() end\nlocal function upgradeRide(player) player:SetAttribute("Level",2) end';
  const strategy=evaluateRobloxGameplayProductReadiness({
    gameId:'amusement-tycoon',
    baseline,
    config:'local Config={Genre="Strategy",PlayMode="SINGLE",MobileFirst=true} return Config',
    server,
    client:mobileClient,
    project
  });
  assert.equal(strategy.blockers.some(value=>value.startsWith('DESIGN_GENRE_MISMATCH:')),false);

  const simulation=evaluateRobloxGameplayProductReadiness({
    gameId:'amusement-tycoon',
    baseline,
    config:'local Config={Genre="Simulation",PlayMode="SINGLE",MobileFirst=true} return Config',
    server,
    client:mobileClient,
    project
  });
  assert.ok(simulation.blockers.includes('DESIGN_GENRE_MISMATCH:Strategy:Simulation'));
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
    runtimeEvidence:{validationProvider:'ROBLOX_OFFICIAL_CLOUD_API_ONLY',openCloudImageEvidence:{imageContentPassed:true},engineExecuted:true,exactEngineVersion:true,simulationRunning:true,serverBootObserved:true,f5InputCameraUiPassed:true,f8GameplaySystemsPassed:true,openCloudWorldEvidence:{basePartCount:20,spawnCount:1,landmarkCount:2,objectiveCount:1,spawnGroundingObserved:true,unsupportedSpawns:0,floatingSpawns:0}},
    postRuntimeQaEvidence:{actualRuntimeEvidence:true},
    studioPlayEvidence:{}
  });
  assert.equal(pass.pass,true);
  assert.equal(pass.mobileRuntime,true);
  assert.equal(pass.coreLoopRuntime,true);
  assert.equal(pass.verticalSlicePassed,true);

  const persistedPass=evaluateRobloxF9ProductReadiness({
    f0Evidence,
    runtimeEvidence:{
      validationProvider:'ROBLOX_OFFICIAL_CLOUD_API_ONLY',openCloudImageEvidence:{imageContentPassed:true},
      exactGame:true,exactPlace:true,exactVersion:true,actualRuntimeEvidence:true,
      f1ServerBootPassed:true,f2WorldFoundationPassed:true,f3CharacterFoundationPassed:true,f4PhysicsAndMovementPassed:true,
      f5InputCameraUiPassed:true,f8GameplaySystemsPassed:true,
      openCloudWorldEvidence:{basePartCount:20,spawnCount:1,landmarkCount:2,objectiveCount:1,spawnGroundingObserved:true,unsupportedSpawns:0,floatingSpawns:0}
    },
    postRuntimeQaEvidence:{actualRuntimeEvidence:true},
    studioPlayEvidence:{}
  });
  assert.equal(persistedPass.pass,true);
  assert.equal(persistedPass.exactEngine,true);
  assert.equal(persistedPass.serverBoot,true);
  assert.equal(persistedPass.simulation,true);
});


test('runtime keeps unrelated F0-to-private handoff parallel with source and technical workers',()=>{
  const workflow=fs.readFileSync('.github/workflows/company-development-roblox-runtime.yml','utf8');
  const technicalPlan=workflow.slice(workflow.indexOf('  technical-plan:'),workflow.indexOf('  technical-worker:'));
  assert.match(technicalPlan,/needs:\s*source-plan/);
  assert.doesNotMatch(technicalPlan,/needs:\s*source-bootstrap/);
  assert.match(technicalPlan,/CURRENT_SOURCE_TARGETS_JSON:\s*\$\{\{ needs\.source-plan\.outputs\.targets_json/);
  assert.match(technicalPlan,/CURRENT_SOURCE_RECONCILIATION_JSON:\s*\$\{\{ needs\.source-plan\.outputs\.reconciliation_json/);
  assert.match(technicalPlan,/const sourceBusyIds=new Set/);
  assert.match(technicalPlan,/ROBLOX_TECHNICAL_DEFER_SOURCE_STAGE=/);
  assert.match(technicalPlan,/Route F0-passed artifacts to private runtime validation without Studio/);
  assert.match(technicalPlan,/ROBLOX_PRIVATE_RUNTIME_VALIDATION_DEFERRED_SOURCE_STAGE=/);
  assert.match(technicalPlan,/CURRENT_MAIN="\$current_main" node/);
  const technicalPersist=workflow.slice(workflow.indexOf('  technical-persist:'),workflow.indexOf('      - name: Dispatch Roblox HEADLESS FAST_MVP continuation'));
  assert.match(technicalPersist,/needs:\s*\[technical-plan, technical-worker\]/);
  assert.doesNotMatch(technicalPersist,/Route F0-passed artifacts to private runtime validation without Studio/);
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
  assert.match(sweep,/robloxBuildProfileFromBaseline/);
});


test('F9 cannot substitute local Studio or thumbnail metadata for cloud evidence',()=>{
  const result=evaluateRobloxF9ProductReadiness({
    f0Evidence:{gameplayProductReadiness:{pass:true,studioReadiness:{f9SourceQualityReady:true},runtimeRequirements:{}}},
    runtimeEvidence:{exactGame:true,exactPlace:true,exactVersion:true,actualRuntimeEvidence:true,f1ServerBootPassed:true,f2WorldFoundationPassed:true,f3CharacterFoundationPassed:true,f4PhysicsAndMovementPassed:true,f5InputCameraUiPassed:true,f8GameplaySystemsPassed:true,openCloudImageEvidence:{imageMetadataAvailable:true}},
    postRuntimeQaEvidence:{actualRuntimeEvidence:true},studioPlayEvidence:{actualPlay:true,runtimeVerified:true}
  });
  assert.equal(result.pass,false);
  assert.equal(result.actualRuntime,false);
  assert.ok(result.blockers.includes('F9_CLOUD_API_RUNTIME_EVIDENCE_MISSING'));
  assert.ok(result.blockers.includes('F9_CLOUD_IMAGE_CONTENT_MISSING'));
});


test('cloud scene rejects floating spawns even when overall map bounds and runtime markers pass',()=>{
 const result=evaluateRobloxF9ProductReadiness({
  f0Evidence:{gameplayProductReadiness:{pass:true,studioReadiness:{f9SourceQualityReady:true},runtimeRequirements:{spawnRequired:true}}},
  runtimeEvidence:{validationProvider:'ROBLOX_OFFICIAL_CLOUD_API_ONLY',openCloudImageEvidence:{imageContentPassed:true},exactGame:true,exactPlace:true,exactVersion:true,actualRuntimeEvidence:true,f1ServerBootPassed:true,f2WorldFoundationPassed:true,f3CharacterFoundationPassed:true,f4PhysicsAndMovementPassed:true,f5InputCameraUiPassed:true,f8GameplaySystemsPassed:true,openCloudWorldEvidence:{spawnCount:1,spawnsInBounds:true,spawnGroundingObserved:true,floatingSpawns:1,unsupportedSpawns:0}},
 });
 assert.equal(result.pass,false);
 assert.ok(result.blockers.includes('F9_SPAWN_NOT_GROUNDED'));
});
