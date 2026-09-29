import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectHeadlessSourceTexts} from '../tools/company-development-roblox-headless-fast-mvp.mjs';

const config=fs.readFileSync('roblox-games/horror-escape-room/shared/GameConfig.luau','utf8');
const server=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const client=fs.readFileSync('roblox-games/horror-escape-room/client/Game.client.luau','utf8');
const launch=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/launch-mvp.json','utf8'));

test('8명 4대4 시작과 AI 채움',()=>{
 assert.match(config,/TargetPopulation=8/);assert.match(config,/SurvivorSlots=4/);assert.match(config,/MonsterSlots=4/);
 assert.match(server,/local function selectStartingMonsters\(h\)/);
 assert.match(server,/monsterNeed=math\.max/);assert.match(server,/humanNeed=math\.max/);
 for(const gate of ['8-player logical population','4-human 4-monster opening composition','AI fills every missing team slot'])assert.ok(launch.releaseGates.includes(gate),gate);
});

test('인간 감염과 양 진영 0명 승리조건',()=>{
 assert.match(server,/local function infectPlayer\(p,sourcePlayer\)/);assert.match(server,/local function infectBot\(b,sourcePlayer\)/);
 assert.match(server,/setRole\(p,"MONSTER"\)/);assert.match(server,/FeedbackEvent","INFECT:/);
 assert.match(server,/if humans==0 then endRound\("MONSTER"\)/);assert.match(server,/if monsters==0 then endRound\("SURVIVOR"\)/);
 assert.match(server,/endRound\("DRAW"\)/);
});

test('HumanForms는 도구 패시브 감염능력으로 확장된다',()=>{
 assert.match(config,/HumanForms=/);
 for(const id of ['BROADCAST','ELECTRICIAN','COURIER','PHOTOGRAPHER','SECURITY'])assert.ok(config.includes('Id="'+id+'"'));
 for(const key of ['Tool=','Passive=','InfectedAbility='])assert.ok(config.includes(key));
 assert.match(server,/local function humanForm\(p\)/);assert.match(server,/local function nextHuman\(p\)/);
 assert.ok(client.includes('인간 변경'));assert.ok(launch.releaseGates.includes('expandable human-form roster'));
});

test('인간 정화공격은 몬스터를 제거한다',()=>{
 assert.match(config,/PurifyDistance=8/);assert.match(config,/PurifyCooldown=5/);
 assert.match(server,/local function purify\(p\)/);assert.match(server,/local function eliminateMonsterPlayer/);assert.match(server,/local function removeBot/);
 assert.ok(client.includes('정화 공격'));assert.match(client,/C\.Actions\.PURIFY/);
});

test('감염전 HUD는 현재 진영 인원을 표시한다',()=>{
 for(const marker of ['8인 감염전 · 인간 4 VS 몬스터 4','정화 공격','몬스터 변경','인간 변경','감염 완료'])assert.ok(client.includes(marker),marker);
 assert.match(client,/인간 %d : 몬스터 %d/);
 assert.match(client,/rescueButton\.Visible=running and role=="SURVIVOR"/);assert.match(client,/abilityButton\.Visible=running and role=="MONSTER"/);
});

test('세 맵 이벤트 오디오 보안은 유지된다',()=>{
 for(const id of ['SCHOOL','HOSPITAL','THEME_PARK'])assert.ok(config.includes('Id="'+id+'"'));
 for(const marker of ['ClassDesk','HospitalBed','CarouselRotor'])assert.ok(server.includes(marker));
 assert.match(server,/workspace:SetAttribute\("CurrentMapEventName"/);assert.match(client,/local function nearestMonsterDistance\(\)/);assert.match(client,/chase:Play\(\)/);
 assert.match(server,/allowedActions\[a\]~=true then return false/);assert.match(server,/horizontal<=C\.MaxHorizontalVelocity/);assert.match(server,/Magnitude<=C\.MaxTeleportStep/);
 for(const gate of ['3-map round rotation','remote action allowlist and spam rejection','teleport/speed/out-of-bounds abuse rejection','save/rejoin'])assert.ok(launch.releaseGates.includes(gate),gate);
});

test('한글 영문 유입 메타데이터',()=>{
 assert.equal(launch.gameTitleKo,'심야 감염전 [4대4]');
 assert.equal(launch.gameTitleEn,'Midnight Infection [4v4]');
 assert.ok(launch.gameDescriptionKo.includes('감염전'));assert.ok(launch.gameDescriptionEn.includes('infection'));
});


test('경쟁 라운드 점수는 서버가 승패 기준으로 관리한다',()=>{
 assert.match(server,/RoundScore/);
 assert.match(server,/SetAttribute\("RoundScore",win and 1 or 0\)/);
 assert.match(server,/FireAllClients\("MULTIPLAYER_SYNC"/);
});


test('horror 서버에는 중복 Luau 함수 선언이 없다',()=>{
 assert.doesNotMatch(server,/local function\s+([A-Za-z_][A-Za-z0-9_]*)\([^)]*\)local function\s+\1\([^)]*\)/);
 assert.doesNotMatch(server,/remote\.OnServerEvent:Connect\(function\([^)]*\)remote\.OnServerEvent:Connect\(function\([^)]*\)/);
});


test('horror F0 source contract passes native foundation preflight',()=>{
 const project=fs.readFileSync('roblox-games/horror-escape-room/default.project.json','utf8');
 const artifact='sha256:'+'a'.repeat(64);
 const result=inspectHeadlessSourceTexts({
  gameId:'horror-escape-room',
  sourcePath:'roblox-games/horror-escape-room',
  sourceRevision:'b'.repeat(40),
  artifactIdentity:artifact,
  rebuiltArtifactIdentity:artifact,
  artifactRunId:1,
  nativeLanguageCompilePassed:true,
  nativeCompilerVersion:'0.739',
  config,server,client,project
 });
 assert.equal(result.pass,true,result.blockers.join(','));
 assert.equal(result.checks.foundationSentinelContract,true);
 assert.equal(result.checks.characterPhysicsGuard,true);
 assert.equal(result.checks.f0SourceIntegrity,true);
 assert.doesNotMatch(server,/movementGuardClock\+=dt movementGuardClock\+=dt/);
});


test('첫 액션은 서버 가동시간을 쿨다운으로 오인하지 않는다',()=>{
 assert.match(server,/local lastPurify=purifyCooldown\[p\]/);
 assert.match(server,/if lastPurify and now-lastPurify<cd then return end/);
 assert.match(server,/local lastDash=dashCooldown\[p\]/);
 assert.match(server,/if lastDash and now-lastDash<cd then return end/);
 assert.match(server,/local lastAbility=cooldown\[p\]/);
 assert.match(server,/if lastAbility and now-lastAbility<C\.MonsterAbilityCooldown then return end/);
 assert.doesNotMatch(server,/now-\(dashCooldown\[p\]or 0\)<cd/);
 assert.doesNotMatch(server,/now-\(purifyCooldown\[p\]or 0\)<cd/);
 assert.doesNotMatch(server,/now-\(cooldown\[p\]or 0\)<C\.MonsterAbilityCooldown/);
});


test('상용 로딩과 로비 상태는 서버 정본에 바인딩된다',()=>{
 assert.match(config,/LobbyLoadTimeoutSeconds=12/);
 assert.match(client,/ContentProvider:PreloadAsync/);
 assert.match(client,/Name="LoadingScreen"/);
 assert.match(client,/workspace:GetAttribute\("MapReady"\)/);
 assert.match(server,/local function syncLobbyState\(phase\)/);
 for(const key of ['LobbyReady','LobbyPhase','LobbyRealPlayers','LobbyAIFill'])assert.ok(server.includes('"'+key+'"'),key);
 assert.match(client,/실제 %d명 · AI %d명 충원 예정/);
 assert.match(client,/setupPanel\.Visible=not running/);
 assert.match(client,/ruleCard\.Visible=setupPanel\.Visible and not selectionConfirmed/);
});


test('로비 역할 배정은 선호·공정 가중·직전 반복 방지를 사용한다',()=>{
 assert.match(server,/local lastMonsterIds=\{\}/);
 assert.match(server,/targetRealMonsters=math\.min\(monsterSlots,math\.max\(1,#h-survivorSlots\)\)/);
 assert.match(server,/return weightPick\(list\)/);
 assert.match(server,/not lastMonsterIds\[player\.UserId\]/);
 assert.match(server,/\{preferred,neutral,survivorPreferred\}/);
 assert.ok(client.includes('몬스터 선호'));
 assert.match(client,/MonsterPreference/);
});


test('로비 선택 완료는 서버 승인 속성만 신뢰한다',()=>{
 assert.match(server,/LobbySelectionConfirmed",false/);
 assert.match(server,/LobbySelectionConfirmed",true/);
 assert.match(client,/p:GetAttribute\("LobbySelectionConfirmed"\)==true/);
 assert.doesNotMatch(client,/setupChosen/);
 assert.match(client,/Size=UDim2\.new\(\.465,0,0,48\)/);
 assert.match(client,/Size=UDim2\.new\(\.44,0,0,36\)/);
});


test('로비 상용화 계약은 launch gate에도 고정된다',()=>{
 for(const gate of [
  'loading screen gated by map readiness',
  'server-authoritative lobby selection confirmation',
  'lobby real-player and AI-fill visibility',
 ])assert.ok(launch.releaseGates.includes(gate),gate);
});


test('학교는 높은 천장과 구조 디테일을 유지한다',()=>{
 assert.match(server,/local schoolCeilingY=18\.4/);
 assert.match(server,/local schoolWallHeight=18/);
 for(const marker of ['SchoolHallColumn','SchoolCeilingBeam','ClassDoorFrameL','SchoolFireCabinet','SchoolTrophyCase','SchoolVendingMachine','GymBackboard'])assert.ok(server.includes(marker),marker);
 assert.doesNotMatch(server,/MainHallCeiling".*Vector3\.new\(0,12\.2,0\)/);
});

test('플레이어와 AI 추격 모션은 기존 Animator 위에 레이어로 적용된다',()=>{
 assert.match(client,/BindToRenderStep\("MidnightCharacterMotion"/);
 assert.match(client,/findMotionJoint/);
 assert.match(client,/Motor6D/);
 for(const action of ['PURIFY','DASH','ABILITY','INFECT'])assert.ok(client.includes('setMotionImpulse("'+action+'"'),action);
 assert.doesNotMatch(client,/Animator:Destroy\(|Animate:Destroy\(/);
 assert.match(server,/motionClock=math\.random\(\)\*6\.28/);
 assert.match(server,/local stride=math\.sin\(b\.motionClock\)/);
});


test('AI 추격 이동은 진행 방향을 바라본다',()=>{
 assert.match(server,/CFrame\.lookAt\(nextPos,nextPos\+dir\)/);
 assert.match(server,/local dir=d\.Unit/);
});


test('보상은 기존 기본값을 유지하면서 실제 기여도만 제한적으로 추가한다',()=>{
 assert.match(config,/ParticipationCoins=12/);
 assert.match(config,/WinBonusCoins=18/);
 assert.match(config,/ContributionCapCoins=12/);
 assert.match(config,/PurifyPlayerCoins=4/);
 assert.match(config,/PurifyAICoins=1/);
 assert.match(config,/InfectPlayerCoins=4/);
 assert.match(config,/InfectAICoins=1/);
 assert.match(server,/local function awardContribution\(player,amount\)/);
 assert.match(server,/RoundContributionCoins/);
 assert.match(server,/local reward=baseReward\+winBonus\+contribution/);
 assert.match(client,/참가 %d \+ 승리 %d \+ 기여 %d/);
});

test('정화 탈락자도 참가 보상과 팀 결과를 잃지 않는다',()=>{
 assert.match(server,/RoundParticipant",true/);
 assert.match(server,/RoundTeam/);
 assert.match(server,/local participated=p:GetAttribute\("RoundParticipant"\)==true/);
 assert.match(server,/local team=p:GetAttribute\("RoundTeam"\)or role/);
});

test('실제 플레이어 기여 보상은 AI 기여보다 크고 상한이 있다',()=>{
 const rewardBlock=config.slice(config.indexOf('Reward={'),config.indexOf('Audio={'));
 assert.ok(rewardBlock.includes('PurifyPlayerCoins=4'));
 assert.ok(rewardBlock.includes('PurifyAICoins=1'));
 assert.ok(rewardBlock.includes('InfectPlayerCoins=4'));
 assert.ok(rewardBlock.includes('InfectAICoins=1'));
 assert.match(server,/math\.min\(cap,current\+math\.max/);
});


test('코스메틱 상점은 서버 권한 구매와 장착만 허용한다',()=>{
 assert.match(config,/Cosmetics=\{/);
 for(const id of ['DEFAULT','MIDNIGHT_RED','MOON_BLUE','TOXIC_GREEN','VOID_PURPLE'])assert.ok(config.includes('Id="'+id+'"'),id);
 assert.match(config,/BUY_COSMETIC="BUY_COSMETIC"/);
 assert.match(config,/EQUIP_COSMETIC="EQUIP_COSMETIC"/);
 assert.match(server,/local function buyCosmetic\(p,id\)/);
 assert.match(server,/local function equipCosmetic\(p,id\)/);
 assert.match(server,/local item=cosmeticById\[id\];if not item then return end/);
 assert.match(server,/if coins<price then/);
 assert.match(server,/if not owned\[id\]then/);
 assert.match(client,/remote:FireServer\(C\.Actions\.BUY_COSMETIC,item\.Id\)/);
 assert.match(client,/remote:FireServer\(C\.Actions\.EQUIP_COSMETIC,item\.Id\)/);
});

test('코스메틱 저장은 기존 세이브를 깨지 않는 추가 필드다',()=>{
 assert.match(server,/local owned=\{DEFAULT=true\}/);
 assert.match(server,/OwnedCosmetics=ownedCosmeticsList\(owned\)/);
 assert.match(server,/EquippedCosmetic=equipped/);
 assert.match(server,/typeof\(d\.EquippedCosmetic\)=="string"/);
 assert.match(server,/if not owned\[equipped\]or not cosmeticById\[equipped\]then equipped="DEFAULT"end/);
 assert.ok(server.includes('DSS:GetDataStore("midnight-tag-v3")'));
});

test('코스메틱은 UI 테마와 칭호 전용이며 전투 수치에 연결되지 않는다',()=>{
 const cosmeticBlock=config.slice(config.indexOf('Cosmetics={'),config.indexOf('Audio={'));
 for(const forbidden of ['WalkSpeed','Damage','PurifyDistance','Cooldown','DashPower','TagDistance'])assert.ok(!cosmeticBlock.includes(forbidden),forbidden);
 assert.match(client,/resultTitle\.TextColor3=accent/);
 assert.match(client,/selectionStatus\.TextColor3=accent/);
 assert.match(client,/equippedItem\.Title/);
 assert.doesNotMatch(server,/EquippedCosmetic[^\n]{0,120}(WalkSpeed|Damage|PurifyDistance|Cooldown|DashPower|TagDistance)/);
});

test('진행중 이탈은 같은 역할 AI로 즉시 채우고 중도입장은 관전한다',()=>{
 assert.match(server,/bot\(leavingRole,leavingPos\)/);
 assert.match(server,/RoundState","SPECTATING"/);
 assert.match(server,/Spectating",true/);
 assert.match(client,/Name="SpectatorNotice"/);
});

test('액션 쿨다운과 결과 보상은 서버 시간과 서버 속성을 사용한다',()=>{
 for(const key of ['PurifyReadyAt','DashReadyAt','AbilityReadyAt'])assert.ok(server.includes('"'+key+'"'),key);
 assert.match(client,/workspace:GetServerTimeNow\(\)/);
 assert.match(client,/Name="RoundResult"/);
 assert.match(client,/LastRoundBaseReward/);
 assert.match(client,/LastRoundWinBonus/);
 assert.match(client,/LastRoundContribution/);
});


test('감염은 자동 접촉이 아니라 서버 에너지 공격으로만 발생한다',()=>{
 assert.match(config,/INFECT_ATTACK="INFECT_ATTACK"/);
 assert.match(config,/InfectAttackCost=30/);
 assert.match(config,/InfectRange=8/);
 assert.match(server,/local function infectAttack\(p\)/);
 assert.match(server,/spendEnergy\(p,C\.Energy and C\.Energy\.InfectAttackCost or 30,"INFECT"\)/);
 assert.match(server,/elseif a==C\.Actions\.INFECT_ATTACK then infectAttack\(p\)/);
 assert.doesNotMatch(server,/nearestMonsterDistance\(r\.Position\)<=C\.TagDistance/);
 assert.match(client,/remote:FireServer\(C\.Actions\.INFECT_ATTACK\)/);
});

test('인간과 몬스터 주요 행동은 같은 에너지 규칙을 사용한다',()=>{
 for(const marker of ['Max=100','RegenPerSecond=10','PurifyCost=35','DashCost=25','AbilityCost=45'])assert.ok(config.includes(marker),marker);
 assert.match(server,/spendEnergy\(p,C\.Energy and C\.Energy\.PurifyCost or 35,"PURIFY"\)/);
 assert.match(server,/spendEnergy\(p,C\.Energy and C\.Energy\.DashCost or 25,"DASH"\)/);
 assert.match(server,/spendEnergy\(p,C\.Energy and C\.Energy\.AbilityCost or 45,"ABILITY"\)/);
 assert.match(client,/Name="EnergyTrack"/);
 assert.match(client,/EnergyLabel/);
});

test('5대3 6대2 7대1 열세 패시브는 양 진영 공통 에너지 보정만 제공한다',()=>{
 assert.match(config,/Minority=3,Majority=5,RegenMultiplier=1\.25/);
 assert.match(config,/Minority=2,Majority=6,RegenMultiplier=1\.50,StationBonus=10/);
 assert.match(config,/Minority=1,Majority=7,RegenMultiplier=1\.80,StationBonus=20,LastStandEnergy=35/);
 assert.match(server,/local function pressurePassiveFor\(role,humans,monsters\)/);
 assert.match(server,/role=="SURVIVOR"and humans or role=="MONSTER"and monsters/);
 assert.doesNotMatch(config,/PressurePassives=[\s\S]{0,500}(WalkSpeed|Damage|RangeBonus|PurifyRange)/);
 assert.match(client,/열세 패시브/);
});

test('기존 단말은 에너지 충전 거점으로 동작하고 탈출 승리 흔적은 제거된다',()=>{
 assert.match(server,/Name="EnergyPrompt"/);
 assert.match(server,/StationRecharge/);
 assert.match(server,/StationCooldown/);
 assert.match(server,/Name="EnergyCorePrompt"/);
 assert.match(server,/EnergyCoreState/);
 assert.doesNotMatch(server,/Name="EscapePrompt"/);
 assert.doesNotMatch(server,/ActionText="탈출"/);
});

test('세 맵에는 각자 다른 상호작용 콘텐츠가 있다',()=>{
 assert.match(server,/SCHOOL_BROADCAST/);
 assert.match(server,/HOSPITAL_SURGERY_LIGHT/);
 assert.match(server,/PARK_CAROUSEL_POWER/);
 assert.match(server,/addEnergyCore/);
 for(const marker of ['비상 방송실','수술실 전력장치','회전목마 전원','중앙 에너지 코어'])assert.ok(server.includes(marker),marker);
});

test('코믹 놀람 요소는 로컬 전용이며 경쟁 판정과 분리된다',()=>{
 assert.match(server,/CompetitiveEffect",false/);
 for(const marker of ['SCHOOL_HALL_SHADOW','SCHOOL_LOCKER_EYES','SCHOOL_JANITOR','SCHOOL_GYM_BALL','SCHOOL_BOARD_GAG','HOSPITAL_WHEELCHAIR','PARK_CLOWN'])assert.ok(server.includes(marker),marker);
 assert.match(client,/local function playSurprise\(trigger\)/);
 assert.match(client,/CanCollide=false/);
 assert.match(client,/CanTouch=false/);
 assert.match(client,/CanQuery=false/);
 assert.doesNotMatch(client,/playSurprise\([\s\S]{0,200}FireServer/);
});

test('코인 상점은 UI 코스메틱만 구매 장착하며 서버가 가격과 보유를 검증한다',()=>{
 assert.match(config,/Cosmetics=\{/);
 assert.match(config,/BUY_COSMETIC="BUY_COSMETIC"/);
 assert.match(config,/EQUIP_COSMETIC="EQUIP_COSMETIC"/);
 assert.match(server,/local function buyCosmetic\(p,id\)/);
 assert.match(server,/local function equipCosmetic\(p,id\)/);
 assert.match(server,/OwnedCosmetics=ownedCosmeticsList/);
 assert.match(client,/Name="CosmeticShop"/);
 assert.doesNotMatch(config,/Cosmetics=[\s\S]{0,900}(WalkSpeed|Damage|PurifyRangeBonus|DashPowerBonus|AbilityCooldown)/);
});

test('중도 입장과 이탈은 다음 라운드 관전 및 AI 보충으로 복구한다',()=>{
 assert.match(server,/RoundState","SPECTATING"/);
 assert.match(server,/bot\(leavingRole,leavingPos\)/);
 assert.match(client,/Name="SpectatorNotice"/);
 assert.match(client,/다음 라운드부터 참가/);
});


test('승리 결과는 팀 세레머니와 맵별 코믹 문구로 확실하게 마무리된다',()=>{
 assert.match(client,/Name="TeamCeremony"/);
 assert.match(client,/local function playResultCeremony\(resultCode\)/);
 assert.match(client,/CELEBRATE_HUMAN/);
 assert.match(client,/CELEBRATE_MONSTER/);
 assert.match(client,/CELEBRATE_DRAW/);
 for(const marker of ['야자 탈출 성공','진료 결과: 감염 확정','오늘의 마지막 손님까지 감염 완료'])assert.ok(client.includes(marker),marker);
 assert.doesNotMatch(client,/playResultCeremony\([\s\S]{0,600}FireServer/);
});


test('맵 놀람 요소는 경쟁 판정과 레이캐스트에서 완전히 제외된다',()=>{
 assert.match(server,/AmbientDecorativeOnly/);
 assert.match(server,/CompetitiveEffect",false/);
 assert.match(server,/CanCollide=false/);
 assert.match(server,/CanTouch=false/);
 assert.match(server,/CanQuery=false/);
 for(const marker of [
  'SCHOOL_WATCHER','SCHOOL_LOCKER_DUCK','SCHOOL_CHALK_FACE','SCHOOL_VENDING_CAN',
  'HOSPITAL_MORGUE_PEEK','HOSPITAL_RUNAWAY_SLIPPERS','HOSPITAL_IV_WALK','HOSPITAL_XRAY','HOSPITAL_BED',
  'PARK_CLOWN_PEEK','PARK_LONELY_BALLOON','PARK_DRIVERLESS_CAR','PARK_ARCADE','PARK_POPCORN'
 ])assert.ok(server.includes(marker),marker);
 assert.doesNotMatch(server,/AmbientSurprise[^\n]{0,220}(awardContribution|setEnergy|setRole|infectPlayer|eliminateMonsterPlayer)/);
});

test('몬스터 감염 공격은 별도 버튼과 공격 모션을 가진다',()=>{
 assert.match(client,/local infectButton=makeButton/);
 assert.match(client,/setMotionImpulse\("INFECT_ATTACK"/);
 assert.match(client,/remote:FireServer\(C\.Actions\.INFECT_ATTACK\)/);
 assert.match(client,/motionImpulseKind=="INFECT_ATTACK"/);
});

test('병원과 놀이공원도 학교처럼 별도 코믹 발견거리를 가진다',()=>{
 for(const marker of ['HOSPITAL_XRAY','HOSPITAL_BED','PARK_ARCADE','PARK_POPCORN'])assert.ok(server.includes(marker),marker);
 for(const marker of ['LocalXrayDuck','LocalRunawayBed','LocalArcadeGhostScreen','LocalPopcorn'])assert.ok(client.includes(marker),marker);
});

test('승리 세레머니는 결과 단계 전용이며 서버가 팀과 랜덤 연출을 확정한다',()=>{
 assert.match(config,/ResultSeconds=6/);
 assert.match(config,/Celebrations=\{/);
 for(const id of ['PHOTO_FAIL','PURIFIER_HIGHFIVE','CLOCK_OUT','ROLL_CALL','SHRUG_DANCE','SCARY_POSE','AWKWARD_CLAP'])assert.ok(config.includes('Id="'+id+'"'),id);
 assert.match(server,/local function chooseCelebration\(winner\)/);
 assert.match(server,/CelebrationWinnerTeam/);
 assert.match(server,/CelebrationAIWinners/);
 assert.match(server,/task\.wait\(C\.ResultSeconds or 6\)/);
 assert.match(client,/Name="TeamCeremony"/);
 assert.match(client,/playCeremonyConfetti/);
 assert.match(client,/CelebrationCaption/);
 assert.doesNotMatch(config,/Celebrations=[\s\S]{0,1400}(Damage|WalkSpeed|PurifyDistance|InfectRange|RegenMultiplier)/);
});
