import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectHeadlessSourceTexts} from '../tools/company-development-roblox-headless-fast-mvp.mjs';

const config=fs.readFileSync('roblox-games/horror-escape-room/shared/GameConfig.luau','utf8');
const server=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const client=fs.readFileSync('roblox-games/horror-escape-room/client/Game.client.luau','utf8');
const manorServer=fs.readFileSync('roblox-games/horror-escape-room/server/ManorLobby.luau','utf8');
const manorClient=fs.readFileSync('roblox-games/horror-escape-room/client/ManorLobby.client.luau','utf8');
const manorAssets=fs.readFileSync('roblox-games/horror-escape-room/shared/ManorAssets.luau','utf8');
const combatAssets=fs.readFileSync('roblox-games/horror-escape-room/shared/CombatAssets.luau','utf8');
const combatAssetTool=fs.readFileSync('tools/horror-combat-assets.mjs','utf8');
const combatAssetWorkflow=fs.readFileSync('.github/workflows/horror-combat-assets.yml','utf8');
const combatNativeTool=fs.readFileSync('tools/horror-combat-native-check.mjs','utf8');
const ownerWorkflow=fs.readFileSync('.github/workflows/horror-owner-system-publish.yml','utf8');
const robloxBootstrapTool=fs.readFileSync('tools/company-development-roblox-bootstrap.mjs','utf8');
const project=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/default.project.json','utf8'));
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

test('HumanForms는 플레이어와 AI가 공유하는 5개 액티브 전투 스킬을 가진다',()=>{
 assert.match(config,/HumanForms=/);
 for(const id of ['BROADCAST','ELECTRICIAN','COURIER','PHOTOGRAPHER','SECURITY'])assert.ok(config.includes('Id="'+id+'"'));
 for(const key of ['Tool=','Passive=','ActiveAbility=','InfectedAbility='])assert.ok(config.includes(key));
 for(const id of ['SIGNAL_JAM','OVERLOAD','IMPACT_BAG','CAMERA_FLASH','SHOCK_BATON'])assert.ok(config.includes(id+'={'),id);
 assert.match(config,/HUMAN_ABILITY="HUMAN_ABILITY"/);
 assert.match(server,/local function humanAbility\(p\)/);
 assert.match(server,/function BotAI\.tryBotHumanAbility\(b,target,distance\)/);
 assert.match(client,/local humanAbilityButton=makeButton/);
 assert.match(client,/C\.Actions\.HUMAN_ABILITY/);
 assert.match(client,/playHumanAbilityEffect\(snapshot\)/);
});

test('인간 정화공격은 몬스터를 제거한다',()=>{
 assert.match(config,/PurifyDistance=8/);assert.match(config,/PurifyCooldown=5/);
 assert.match(server,/local function purify\(p\)/);assert.match(server,/local function eliminateMonsterPlayer/);assert.match(server,/local function removeBot/);
 assert.ok(client.includes('정화 공격'));assert.match(client,/C\.Actions\.PURIFY/);
});

test('감염전 HUD는 현재 진영 인원을 표시한다',()=>{
 for(const marker of ['8인 감염전 · 인간 4 VS 몬스터 4','정화 공격','몬스터 변경','인간 변경','감염 완료'])assert.ok(client.includes(marker),marker);
 assert.match(client,/인간 %d : 몬스터 %d/);
 assert.match(client,/rescueButton\.Visible=running and role=="SURVIVOR"/);assert.match(client,/humanAbilityButton\.Visible=running and role=="SURVIVOR"/);assert.match(client,/abilityButton\.Visible=running and role=="MONSTER"/);
});

test('세 맵 이벤트 오디오 보안은 유지된다',()=>{
 for(const id of ['SCHOOL','HOSPITAL','THEME_PARK'])assert.ok(config.includes('Id="'+id+'"'));
 for(const marker of ['ClassDesk','HospitalBed','CarouselRotor'])assert.ok(server.includes(marker));
 assert.match(server,/workspace:SetAttribute\("CurrentMapEventName"/);assert.match(client,/local function nearestMonsterDistance\(\)/);assert.match(client,/chase:Play\(\)/);
 assert.match(server,/allowedActions\[a\]~=true then return false/);assert.match(server,/horizontal<=C\.MaxHorizontalVelocity/);assert.match(server,/Magnitude<=C\.MaxTeleportStep/);
 for(const gate of ['3-map round rotation','remote action allowlist and spam rejection','teleport/speed/out-of-bounds abuse rejection','save/rejoin'])assert.ok(launch.releaseGates.includes(gate),gate);
});

test('한글 영문 유입 메타데이터는 현재 심야 대탈출 정본을 사용한다',()=>{
 assert.equal(launch.gameTitleKo,'심야 대탈출');
 assert.equal(launch.gameTitleEn,'Midnight Escape');
 assert.ok(launch.gameDescriptionKo.includes('감염 추격전'));assert.ok(launch.gameDescriptionEn.includes('infection'));
 assert.equal(launch.designContract.coreInfectionRule,'EXPLICIT_SERVER_AUTHORITATIVE_INFECT_ATTACK_ONLY');
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
 assert.match(manorClient,/roomSlots\.Name="ManorRoomSlots"/);
 assert.match(manorClient,/local visible=.*PhysicalLobbyReady/);
 assert.match(manorClient,/p:GetAttribute\("RoomServer"\)==true/);
 assert.match(manorClient,/panelTitle\.Text="출정 대기실"/);
 assert.match(manorClient,/참가 %d\/%d명/);
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

test('Studio 실플레이 계약은 현재 저택 로비의 실제 입력 순서를 그대로 따른다',()=>{
 const flow=launch.studioActualPlayContract;
 assert.deepEqual(flow.entryButtonTexts,['저택 들어가기','출정']);
 assert.equal(flow.selectionButtonText,'인간');
 assert.equal(flow.startButtonText,'혼자 바로 시작');
 assert.equal(flow.primaryActionButtonText,'대시');
 assert.ok(flow.afterStartWaitMs>=4000);
 assert.match(manorClient,/artbookButton\(card,"저택 들어가기"/);
 assert.match(manorClient,/button\(commands,"   출정"/);
 assert.match(manorClient,/artbookButton\(body,"인간"/);
 assert.match(manorClient,/artbookButton\(body,"혼자 바로 시작"/);
 assert.doesNotMatch(flow.selectionButtonText,/인간 선호/);
});


test('로비 상용화 계약은 launch gate에도 고정된다',()=>{
 for(const gate of [
  'loading screen gated by map readiness',
  'server-authoritative lobby selection confirmation',
  'lobby real-player and AI-fill visibility',
 ])assert.ok(launch.releaseGates.includes(gate),gate);
});


test('월드 로비는 밝은 가시성, 전용 BGM, 기괴한 직원과 재빌드 대기 상태를 정직하게 유지한다',()=>{
 assert.match(config,/LobbyBackground="rbxassetid:\/\/"\.\.tostring\(require\(script\.Parent\.ManorAssets\)\.LobbyMusicId\)/);
 assert.match(manorAssets,/ModelId=[1-9][0-9]+/);
 assert.match(manorAssets,/LobbyMusicId=[1-9][0-9]+/);
 assert.match(client,/MidnightLobbyBackground/);
 assert.match(manorClient,/Lighting\.Brightness=2\.5/);
 assert.match(manorClient,/Lighting\.ExposureCompensation=\.4/);
 for(const visual of ['Butler_Finger','Undertaker_','Archivist_','LittleGhost_'])assert.ok(manorAssets.includes(visual),visual);
 for(const prop of ['ClockCase','CoffinLid','FamilyMirror','FamilyPortrait','Wardrobe','HearthFlame'])assert.ok(manorAssets.includes(prop),prop);
 assert.match(manorServer,/LobbyArtPass","REBUILD_PENDING_STUDIO"/);
 assert.match(manorServer,/LobbyBuildRevision","BLENDER_MANOR_REBUILD_20261002"/);
 assert.doesNotMatch(manorServer,/LobbyArtPass","BLENDER_MONSTER_FAMILY_V2"/);
 assert.match(manorServer,/ManorGag/);
});

test('세 맵 실내 천장은 직접 상향된 공간감을 유지한다',()=>{
 assert.match(server,/local schoolCeilingY=24\.4/);
 assert.match(server,/local schoolWallHeight=24/);
 assert.match(server,/local hospitalCeilingY=18\.5/);
 assert.match(server,/local basementCeilingY=12\.5/);
 assert.match(server,/local hauntedCeilingY=18\.5/);
 assert.match(server,/local underpassCeilingY=12\.5/);
 for(const marker of ['SchoolHallColumn','SchoolCeilingBeam','HospitalHallCeiling','SurgeryCeiling','HauntedCeiling','UnderpassCeiling'])assert.ok(server.includes(marker),marker);
});

test('플레이 몬스터 5종은 콘셉트 스킨과 고유 스킬 이펙트를 가진다',()=>{
 for(const id of ['DRACULA','FRANKENSTEIN','WEREWOLF','MUMMY','GRIM_REAPER'])assert.ok(config.includes('Id="'+id+'"'),id);
 for(const concept of ['ARISTOCRATIC_VAMPIRE','ELECTRIC_EXPERIMENT','FERAL_HUNTER','ANCIENT_CURSE','VOID_HARVESTER'])assert.ok(config.includes(concept),concept);
 for(const ability of ['BAT_DASH','POWER_CHARGE','RAGE_RUN','CURSE_SLOW','SHADOW_STEP'])assert.ok(config.includes(ability+'={'),ability);
 for(const effect of ['BLOOD_BATS','ELECTRIC_CHARGE','CLAW_RUSH','CURSE_RING','SHADOW_GATE'])assert.ok(config.includes('Effect="'+effect+'"'),effect);
 for(const visual of ['BloodMedallion','ElectricCore','WolfBackFur','CurseScarab','ReaperFaceVoid'])assert.ok(server.includes(visual),visual);
 assert.match(server,/FireAllClients\("MONSTER_ABILITY_EFFECT"/);
 assert.match(client,/playMonsterAbilityEffect\(snapshot\)/);
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


test('AI는 시야·기억·예측·협공 판단과 같은 편 멘트를 사용한다',()=>{
 for(const key of ['VisionRange=78','HearingRange=18','TargetMemorySeconds=4.5','PredictionSeconds=.32','BlockedSightPenalty=52','FlankStrength=.38','TeamCalloutCooldown=3.5','BotCalloutCooldown=8'])assert.ok(config.includes(key),key);
 assert.match(server,/function BotAI\.targetVisible\(b,targetPos\)/);
 assert.match(server,/function BotAI\.predictedTargetPosition\(entry,pos,distance\)/);
 assert.match(server,/function BotAI\.rememberTarget\(b,key,pos\)/);
 assert.match(server,/function BotAI\.monsterApproachDirection\(b,targetPos,distance,visible\)/);
 assert.match(server,/function BotAI\.callout\(b,text\)/);
 assert.match(server,/remote:FireClient\(player,"AI_TEAM_CHAT"/);
 assert.match(server,/chosen\.visible and changed/);
 assert.match(server,/b\.lastSeenPos/);
 assert.match(client,/local function showAITeamChat\(snapshot\)/);
 assert.match(client,/kind=="AI_TEAM_CHAT"/);
 assert.match(client,/team~=tostring\(p:GetAttribute\("Role"\)or""\)/);
});

test('1인 출정은 같은 서버에서 시작하고 맵 선택만으로 서버 이동하지 않는다',()=>{
 assert.match(server,/local function startLocalSoloRoom\(p\)/);
 assert.match(server,/localSoloSession=true;roomSolo=true;roomServer=true;roomCode="SOLO"/);
 assert.match(server,/if #Players:GetPlayers\(\)==1 then startLocalSoloRoom\(p\)else createReservedRoom\(p,"PRIVATE",true\)end/);
 assert.match(server,/RESULT_RETURN_SAME_SERVER/);
 assert.doesNotMatch(server,/if roomServer and not studioRoomFallback and not localSoloSession then leaveReservedRoom\(p\)end/);
 assert.match(server,/localSoloSession=false;roomServer=false;roomCode=""/);
 assert.match(manorClient,/artbookButton\(body,"혼자 바로 시작"/);
 assert.match(manorClient,/label\(body,"1\. 맵 선택"/);
 assert.match(manorClient,/label\(body,"2\. 역할 · "/);
 assert.match(manorClient,/label\(body,"3\. 시작"/);
});

test('AI는 몰려다니지 않고 분산 교전하며 양 진영 스킬을 실제 사용한다',()=>{
 assert.match(config,/SeparationRadius=15/);
 assert.match(config,/SeparationWeight=10/);
 assert.match(server,/function BotAI\.botSeparationVector\(b\)/);
 assert.match(server,/function BotAI\.distributedSurvivorTarget\(b\)/);
 assert.match(server,/function BotAI\.distributedMonsterTarget\(b\)/);
 assert.match(server,/function BotAI\.tryBotMonsterAbility\(b,targetPos,distance\)/);
 assert.match(server,/function BotAI\.tryBotHumanAbility\(b,target,distance\)/);
 assert.match(server,/function BotAI\.tryBotHumanPurify\(b,target,distance\)/);
 assert.match(server,/function BotAI\.tryBotHumanDash\(b,direction,distance\)/);
 assert.match(server,/AI_HUMAN_ACTION_EFFECT/);
 assert.match(server,/MONSTER_ABILITY_EFFECT/);
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
 assert.match(manorClient,/cosmeticTitle=item\.Title/);
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

test('인간 감염 후 5개 스킬은 서버에서 서로 다른 효과로 실행된다',()=>{
 assert.match(config,/InfectedAbilities=\{/);
 for(const profile of [
  'FALSE_ALARM={Name="가짜 경보",Effect="FAKE_ALERT"',
  'BLACKOUT={Name="정전",Effect="BLACKOUT"',
  'RUSH={Name="돌진",Effect="SPEED_SURGE"',
  'HUNT_FLASH={Name="사냥 플래시",Effect="FLASH_SLOW"',
  'BREACH={Name="돌파",Effect="FORWARD_BREACH"',
 ])assert.ok(config.includes(profile),profile);
 const block=server.slice(server.indexOf('local function ability(p)'),server.indexOf('local function infectAttack(p)'));
 for(const id of ['RUSH','BREACH','FALSE_ALARM','BLACKOUT','HUNT_FLASH'])assert.ok(block.includes('infectedAbility=="'+id+'"'),id);
 assert.match(block,/FalseAlarmUntil/);
 assert.match(block,/BlackoutUntil/);
 assert.match(block,/HuntFlashUntil/);
 assert.match(block,/b\.speed=math\.min/);
 assert.match(block,/AbilityFeedback/);
 assert.match(block,/FeedbackEvent","ABILITY:/);
 assert.match(client,/Name="ThreatEffectLayer"/);
 assert.match(client,/currentAbilityName\(\)/);
 assert.match(client,/정전 · 시야가 차단됐어/);
 assert.match(client,/사냥 플래시 · 움직임 둔화/);
 assert.match(client,/경보 · 가까운 곳에 몬스터가 감지됐어/);
});

test('머신 시스템 로드맵은 P1 P2를 진행 중으로 고정한다',()=>{
 const road=launch.systemImplementationRoadmap;
 assert.ok(road);
 assert.equal(road.machineDocumentsOnly,true);
 assert.equal(road.currentPhase,'P1_CORE_MATCH_AND_ROLE_COMBAT');
 const byId=Object.fromEntries((road.phases||[]).map(row=>[row.id,row]));
 assert.equal(byId.P1_CORE_MATCH_AND_ROLE_COMBAT.status,'IN_PROGRESS');
 assert.equal(byId.P2_HUMAN_FORM_IDENTITY.status,'IN_PROGRESS');
 assert.ok(road.invariants.includes('infection occurs only through explicit server-authoritative INFECT_ATTACK'));
 assert.ok(road.invariants.includes('infected humans convert to MONSTER without leaving the round'));
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

test('기존 단말은 충전과 4단계 탈출 목표를 함께 담당한다',()=>{
 assert.match(server,/Name="EnergyPrompt"/);
 assert.match(server,/StationRecharge/);
 assert.match(server,/StationCooldown/);
 assert.match(server,/Name="EnergyCorePrompt"/);
 assert.match(server,/EnergyCoreState/);
 assert.match(server,/Name="EscapePrompt"/);
 assert.match(server,/ActionText="탈출"/);
 assert.match(server,/ObjectiveRound/);
 assert.match(server,/EscapeUnlocked/);
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


test('승리 결과는 실제 캐릭터 3D 스테이징과 시네마틱 카메라로 마무리된다',()=>{
 assert.match(server,/local function stageResultCeremony\(winner,celebrationPlayers\)/);
 assert.match(server,/CelebrationCameraPosition/);
 assert.match(server,/CelebrationFocusPosition/);
 assert.match(server,/FireAllClients\("RESULT_CEREMONY_STAGE"/);
 assert.match(client,/local function startResultCeremonyCamera\(stage\)/);
 assert.match(client,/CameraType=Enum\.CameraType\.Scriptable/);
 assert.match(client,/local function stopResultCeremonyCamera\(\)/);
 assert.match(client,/ceremonyStage\.Visible=true/);
 assert.match(client,/local names=collectCeremonyNames\(winner\)/);
 assert.match(client,/playCeremonyConfetti\(ceremonyColor\)/);
 assert.match(client,/TweenService:Create\(row\.slot/);
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

test('세레머니 콘셉트는 생존 완료와 사냥 완료 중심이며 구형 코믹 춤을 사용하지 않는다',()=>{
 assert.match(config,/ResultSeconds=8/);
 for(const id of ['LAST_LIGHT','CLEAN_EXIT','FINAL_PURIFY','HUNT_COMPLETE','NIGHT_PROCESSION','RED_CHECKIN','DEADLOCK'])assert.ok(config.includes('Id="'+id+'"'),id);
 for(const removed of ['PHOTO_FAIL','PURIFIER_HIGHFIVE','CLOCK_OUT','ROLL_CALL','SHRUG_DANCE','SCARY_POSE','AWKWARD_CLAP'])assert.ok(!config.includes('Id="'+removed+'"'),removed);
 assert.match(server,/stageResultCeremony/);
 assert.match(server,/CelebrationStagedCount/);
 assert.match(client,/RESULT_CEREMONY_STAGE/);
 assert.match(client,/startResultCeremonyCamera/);
 assert.match(client,/ceremonyStage\.Visible=true/);
 assert.match(client,/playCeremonyConfetti\(ceremonyColor\)/);
 assert.doesNotMatch(config,/Emote="dance/);
});

test('전투 캐릭터 디버그 외곽선은 실제 플레이 화면에서 비활성화된다',()=>{
 assert.match(server,/AIRoleHighlight";hi\.FillTransparency=1;hi\.OutlineTransparency=1/);
 assert.match(server,/AIRoleHighlight"[\s\S]{0,260}hi\.Enabled=false/);
 assert.match(server,/RoleHighlight";hi\.FillTransparency=1;hi\.OutlineTransparency=1;hi\.DepthMode=Enum\.HighlightDepthMode\.Occluded;hi\.Enabled=false/);
 assert.match(server,/CombatDebugOnly/);
 assert.match(server,/g\.AlwaysOnTop=false;g\.MaxDistance=18/);
 assert.doesNotMatch(server,/RoleVisual"[\s\S]{0,220}AlwaysOnTop=true/);
});

test('학교는 빈 복도를 줄이고 추격용 소품 밀도를 높인다',()=>{
 for(const marker of ['SchoolHallBench','SchoolLostFoundCabinet','SchoolCleaningCart','SchoolDisplayCase','SchoolSupplyStack','SchoolBrokenDeskPile','SchoolWallPoster'])assert.ok(server.includes(marker),marker);
 assert.match(server,/ChaseCover",true/);
 const schoolOfficial=server.slice(server.indexOf('if map.Id=="SCHOOL"then',server.indexOf('local function decorateArenaWithOfficialAssets')),server.indexOf('else',server.indexOf('if map.Id=="SCHOOL"then',server.indexOf('local function decorateArenaWithOfficialAssets'))));
 assert.ok((schoolOfficial.match(/Vector3\.new\(/g)||[]).length>=28);
});

test('기존 4개 단말 목표와 비상구 탈출 루프가 실제 승리조건에 연결된다',()=>{
 assert.match(server,/local function syncObjectiveProgress\(\)/);
 assert.match(server,/base:SetAttribute\("ObjectiveRound",objectiveState\.round\)/);
 assert.match(server,/objectiveState\.done=math\.min/);
 assert.match(server,/workspace:SetAttribute\("EscapeUnlocked",true\)/);
 assert.match(server,/prompt\.Name="EscapePrompt"/);
 assert.match(server,/workspace:SetAttribute\("SurvivorEscapeTriggered",true\)/);
 assert.match(server,/if workspace:GetAttribute\("SurvivorEscapeTriggered"\)==true then endRound\("SURVIVOR"\)/);
 assert.match(client,/목표 · 단말 %d\/%d 작동 → 몬스터 정화 → 탈출/);
 assert.match(client,/목표 · 인간 추적 → 감염 → 전멸/);
});

test('verified learning 바인딩은 임시 LoadingScreen 대신 지속 ScreenGui를 사용한다',()=>{
 assert.match(robloxBootstrapTool,/Instance\.new\(\s*["']ScreenGui["']\s*\)/);
 assert.ok(robloxBootstrapTool.includes('ScreenGui')&&robloxBootstrapTool.includes('||output.match'));
 assert.match(client,/local verifiedLearningRoot = gui/);
 assert.doesNotMatch(client,/local verifiedLearningRoot = loadingLayer/);
 assert.doesNotMatch(client,/loadingLayer:SetAttribute\("Verified/);
 assert.match(client,/gui:SetAttribute\("VerifiedExternalLearningCoveragePct"/);
 assert.match(client,/gui\.DisplayOrder=30/);
 assert.match(client,/gui\.ZIndexBehavior=Enum\.ZIndexBehavior\.Global/);
});

test('스킬은 이름뿐 아니라 용도와 범위를 HUD에서 설명한다',()=>{
 for(const marker of [
  'Description="24m 안 몬스터의 에너지를 깎는다"',
  'Description="14m 안 몬스터를 1.5초 느리게 만든다"',
  'Description="가까운 몬스터를 강하게 밀쳐낸다"',
  'Description="19m 섬광으로 몬스터를 잠깐 둔화한다"',
  'Description="8m 안 몬스터를 잠깐 멈춘다"',
 ])assert.ok(config.includes(marker),marker);
 assert.match(client,/local skillGuideLine=Instance\.new\("TextLabel"\)/);
 assert.match(client,/local function abilityRangeLabel\(profile\)/);
 assert.match(client,/local function abilityGuideText\(name,profile,cost,cooldownSeconds,status\)/);
 assert.match(client,/humanAbilityButton\.TextScaled=false;humanAbilityButton\.TextSize=11;humanAbilityButton\.TextWrapped=true/);
 assert.match(client,/abilityButton\.TextScaled=false;abilityButton\.TextSize=11;abilityButton\.TextWrapped=true/);
 assert.match(client,/humanAbilityButton\.Size=UDim2\.fromOffset\(142,76\)/);
 assert.match(client,/abilityButton\.Size=UDim2\.fromOffset\(150,76\)/);
 assert.match(client,/"★ "\.\.currentHumanAbilityName\(\)/);
 assert.match(client,/"★ "\.\.currentAbilityName\(\)/);
 assert.match(client,/쿨 %d초 · %dE/);
 assert.match(client,/currentHumanAbilityDescription\(\)/);
 assert.match(client,/currentAbilityDescription\(\)/);
 assert.match(client,/combatActionStatus\.Name="CombatActionStatus"/);
 assert.match(client,/local serverRoundRunning=roomState=="RUNNING"or lobbyPhase=="RUNNING"/);
 assert.match(client,/local inMatch=running or spectating or serverRoundRunning/);
 assert.match(client,/hud\.Visible=inMatch/);
 assert.match(client,/actionDock\.Visible=inMatch/);
 assert.match(client,/전투 상태 동기화 중 · HUD 유지/);
 assert.match(client,/관전 중 · 다음 라운드에 전투 스킬 활성화/);
});

test('내부 세계 귀신 자산은 실제 런타임 목격 연출에 연결되고 실패 시 fallback한다',()=>{
 assert.equal(project.tree.ReplicatedStorage.WorldGhostSkins.GhostSkinFactory.$path,'../../assets/roblox/world-ghosts/GhostSkinFactory.luau');
 assert.equal(project.tree.ReplicatedStorage.WorldGhostSkins.GhostSkinMotion.$path,'../../assets/roblox/world-ghosts/GhostSkinMotion.luau');
 assert.match(client,/local GhostSkinFactory=nil/);
 assert.match(client,/local function loadGhostSkinModules\(\)/);
 assert.match(client,/RS:WaitForChild\("WorldGhostSkins",10\)/);
 assert.match(client,/InternalGhostAssetsReady/);
 assert.match(client,/local internalGhostSkinByCatalogId=\{/);
 for(const id of ['yurei','nopperabo','gwisin-bride','krasue','banshee','jiangshi','churel','dullahan','la-llorona','pontianak','barghest'])assert.ok(client.includes('"'+id+'"'),id);
 assert.match(client,/GhostSkinFactory\.Create\(skinId,\{quality=touchEnabled and"mid"or"near"/);
 assert.match(client,/GhostSkinMotion\.Bind\(model\)/);
 assert.match(client,/SourceAssetLibrary","roblox-world-ghost-skins-v1"/);
 assert.match(client,/if tryInternalGhostSighting\(trigger,id\)then/);
 assert.match(client,/LocalGhostSightingBody/);
});

test('등록된 authored 스킨드 GLB만 전투 비주얼로 쓰고 블록형 procedural fallback은 금지한다',()=>{
 assert.match(combatAssets,/HumanoidModelId=123358389302774/);
 assert.match(combatAssets,/HumanoidSourceSha256="3bf90c01cf86745251c8b6465a9515b92c652235c93f5fd6143b796d2ef76e8a"/);
 assert.match(combatAssets,/AssetSource="assets\/roblox\/world-ghosts\/native\/mesh\/bride\.glb"/);
 assert.match(combatAssetTool,/assets\/roblox\/world-ghosts\/native\/mesh\/bride\.glb/);
 assert.match(combatAssetTool,/assetType:'Model'/);
 assert.match(combatAssetTool,/asset-permissions-api\/v1\/assets\/permissions/);
 assert.match(combatAssetWorkflow,/name: Horror Authored Combat Assets/);
 assert.match(server,/local CombatAssets=require\(Shared:WaitForChild\("CombatAssets"\)\)/);
 assert.match(server,/CombatVisualTemplates/);
 assert.match(server,/OWNER_DIRECT_PACKAGED_COMBAT_V1/);
 assert.match(server,/PackagedNativeModel/);
 assert.match(server,/READY_PACKAGED/);
 assert.match(server,/CombatAuthoredAssetSource/);
 assert.match(server,/LOADING_RUNTIME_FALLBACK/);
 assert.match(server,/for attempt=1,6 do/);
 assert.match(server,/AssetService\.LoadAssetAsync,AssetService,assetId/);
 assert.match(server,/LOAD_FAILED_AFTER_RETRY/);
 assert.match(server,/CombatAuthoredAssetsReady/);
 assert.match(server,/SourceAssetLibrary","roblox-world-ghost-authored-glb"/);
 assert.match(combatNativeTool,/assetdelivery\.roblox\.com\/v1\/asset/);
 assert.match(combatNativeTool,/COMBAT_NATIVE_MODEL/);
 assert.match(combatNativeTool,/COMBAT_NATIVE_IMPORT_CHECK=PASS/);
 assert.match(ownerWorkflow,/Download and verify authored combat native model/);
 assert.match(ownerWorkflow,/AuthoredHumanoidGhost:\{\$path:'\/tmp\/horror-combat-native\/authored-humanoid-ghost\.rbxm'\}/);
 assert.match(ownerWorkflow,/OWNER_DIRECT_COMBAT_TEMPLATE_PACKAGED=PASS/);
 assert.match(client,/local function authoredCombatTemplate\(\)/);
 assert.match(client,/local function bindAuthoredCombatMotion\(model\)/);
 assert.match(client,/d:IsA\("Bone"\)/);
 assert.match(client,/RuntimeQuality","AUTHORED_SKINNED_MESH"/);
 assert.match(client,/ProceduralFallback",false/);
 assert.match(client,/local function ensureCombatSkin\(source,rootPart,skinId,formId\)/);
 assert.match(client,/row\.authored~=wantAuthored/);
 assert.match(client,/CombatAuthoredVisualFallback","ORIGINAL_ROLE_COSTUME"/);
 const combatBlock=client.slice(client.indexOf('local function ensureCombatSkin'),client.indexOf('local function refreshCombatSkins'));
 assert.doesNotMatch(combatBlock,/GhostSkinFactory\.Create|GhostSkinMotion\.Bind|ProceduralFallback",true|CombatGhostFallback_/);
 assert.match(client,/state="attack"/);
 assert.match(client,/state="chase"/);
 assert.match(client,/state="walk"/);
 assert.match(client,/CFrame\.new\(0,\.08\*pulse,-\.72\*pulse\)/);
 assert.match(client,/CFrame\.Angles\(math\.rad\(-6\)/);
});

test('감염 스킬과 감염 공격은 화면 효과와 공격 모션 이벤트를 보낸다',()=>{
 assert.match(server,/Infected=true/);
 assert.match(server,/FireAllClients\("MONSTER_ABILITY_EFFECT"/);
 assert.match(server,/FireAllClients\("MONSTER_ATTACK_EFFECT"/);
 assert.match(client,/snapshot\.Infected==true/);
 for(const ability of ['FALSE_ALARM','BLACKOUT','RUSH','HUNT_FLASH','BREACH'])assert.ok(client.includes('ability=="'+ability+'"'),ability);
 assert.match(client,/local function abilityRing\(/);
 assert.match(client,/local function abilitySparkBurst\(/);
 assert.match(client,/MonsterAbilitySparks/);
 assert.match(client,/InfectedAbilitySparks/);
 assert.match(client,/MonsterAttackSparks/);
 assert.match(client,/HumanAbilitySparks/);
 assert.match(client,/local function playMonsterAttackEffect\(snapshot\)/);
 assert.match(client,/kind=="MONSTER_ATTACK_EFFECT"/);
});

test('결과는 시레머니 다음 보상 정산 후 저택 복귀 안내로 이어진다',()=>{
 assert.match(config,/ResultSeconds=8/);
 assert.match(client,/resultDetail\.Visible=false/);
 assert.match(client,/task\.delay\(2\.15/);
 assert.match(client,/보상 정산 완료 · 잠시 뒤 내 저택으로 돌아가/);
 assert.match(client,/task\.delay\(6\.15/);
 assert.match(client,/내 저택으로 돌아가는 중…/);
 assert.match(client,/총 \+%d 코인/);
 assert.match(server,/teleport\(p,personalSpawn\(p\)\)/);
 assert.match(server,/RESULT_RETURN_SAME_SERVER/);
 assert.match(server,/RESULT_CEREMONY_NO_MANOR_RECOVERY/);
 assert.match(server,/if manorLobby and state=="WAITING"then/);
 assert.match(server,/local lobbySafe=roundState=="ROOM_BROWSER"or roundState=="WAITING"/);
 assert.doesNotMatch(server,/stageResultCeremony[\s\S]{0,1800}teleport\(row\.player,pos,cameraPos\)/);
 const resultBlock=server.slice(server.indexOf('local function endRound(winner)'),server.indexOf('local purifyCooldown=',server.indexOf('local function endRound(winner)')));
 assert.doesNotMatch(resultBlock,/leaveReservedRoom\(p\)/);
 const recoverBlock=server.slice(server.indexOf('RESULT_CEREMONY_NO_MANOR_RECOVERY'),server.indexOf('local function stripLoadedAsset'));
 assert.doesNotMatch(recoverBlock,/state~="RUNNING"/);
 assert.doesNotMatch(recoverBlock,/RoundState"\)~="SPECTATING"/);
});


test('초기 세계 괴담 도감은 12종 3단계이며 서버 근접 검증을 사용한다',()=>{
 const catalog=config.slice(config.indexOf('GhostCatalog={'),config.indexOf('GhostTitles={'));
 const ids=[...catalog.matchAll(/\{Id="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,12);
 assert.match(config,/MaxStage=3/);
 assert.match(config,/MaxSightingsPerRound=2/);
 assert.match(config,/GHOST_SIGHTING_FOUND="GHOST_SIGHTING_FOUND"/);
 assert.match(server,/local function reportGhostSighting\(p,id\)/);
 assert.match(server,/GhostSighting_"\.\.id/);
 assert.match(server,/Magnitude>radius then return/);
 assert.match(server,/GhostProgress=ghostProgressSave/);
 assert.match(client,/FireServer\(C\.Actions\.GHOST_SIGHTING_FOUND,ghostId\)/);
 for(const marker of ['YUREI','BANSHEE','DULLAHAN','BLACK_SHUCK'])assert.ok(catalog.includes('Id="'+marker+'"'),marker);
 assert.match(catalog,/Playable=false/);
 const reportBlock=server.slice(server.indexOf('local function reportGhostSighting'),server.indexOf('local function validRemoteAction'));
 assert.doesNotMatch(reportBlock,/WalkSpeed|Damage|RoundScore/);
});

test('괴담 메모는 읽는 수집품이며 칭호 외 경쟁 보상이 없다',()=>{
 assert.match(config,/Lore=\{/);
 assert.match(server,/local function addLoreCollectible/);
 assert.match(server,/FoundLore=foundLoreList/);
 assert.match(client,/괴담 메모 발견/);
 const loreBlock=server.slice(server.indexOf('local function addLoreCollectible'),server.indexOf('local function addObjectiveStation'));
 assert.doesNotMatch(loreBlock,/Coins|Energy|WalkSpeed|Damage|RoundScore/);
});


test('1인 방 생성과 방장 시작은 8인 AI 충원 계약을 유지한다',()=>{
 assert.match(config,/MinimumParticipants=1/);
 assert.match(config,/Room=\{MaxPlayers=8/);
 for(const action of ['CREATE_ROOM','JOIN_ROOM_CODE','QUICK_JOIN_PUBLIC','QUICK_JOIN_FRIEND','START_ROOM','LEAVE_ROOM'])assert.ok(config.includes(action+'="'+action+'"'),action);
 assert.match(server,/local function createReservedRoom\(p,visibility,solo\)/);
 assert.match(server,/roomSolo=solo==true/);
 assert.match(server,/local function startRoomMatch\(p\)/);
 assert.match(server,/#Players:GetPlayers\(\)<math\.max\(1,tonumber\(C\.MinimumParticipants\)or 1\)/);
 assert.match(server,/configure\(h,survivorOrder,monsterOrder,si,mi\)/);
 assert.match(manorClient,/혼자 바로 시작/);
 assert.match(server,/local function startLocalSoloRoom\(p\)/);
 assert.match(server,/if #Players:GetPlayers\(\)==1 then startLocalSoloRoom\(p\)else createReservedRoom\(p,"PRIVATE",true\)end/);
});

test('예약 방은 공개 친구만 비공개를 서버가 검증하고 예약 코드를 클라이언트에 노출하지 않는다',()=>{
 for(const visibility of ['PUBLIC','FRIENDS','PRIVATE'])assert.ok(config.includes('"'+visibility+'"'),visibility);
 assert.match(server,/TeleportService:ReserveServerAsync\(game\.PlaceId\)/);
 assert.match(server,/options\.ReservedServerAccessCode=record\.accessCode/);
 assert.match(server,/p:IsFriendsWithAsync/);
 assert.match(server,/visibility=="PRIVATE"and explicitCode~=true/);
 assert.doesNotMatch(client,/ReservedServerAccessCode|accessCode/);
});

test('방장 이탈은 대기방에서 다음 실제 유저에게 승계된다',()=>{
 assert.match(server,/local leavingWasHost=roomServer and p\.UserId==roomHostUserId/);
 assert.match(server,/table\.sort\(remaining/);
 assert.match(server,/roomHostUserId=nextHost\.UserId/);
 assert.match(server,/RoomIsHost/);
});

test('Studio 방 검증은 TeleportService 대신 로컬 fallback을 사용한다',()=>{
 assert.match(server,/local studioRoomFallback=RunService:IsStudio\(\)/);
 assert.match(server,/workspace:SetAttribute\("StudioRoomFallback",true\)/);
 assert.match(server,/roomCode="000001"/);
});


test('예약방 로비는 8칸 슬롯에서 실제 유저와 AI를 구분한다',()=>{
 assert.match(manorClient,/for i=1,8 do/);
 assert.match(manorClient,/roomSlots\.Name="ManorRoomSlots"/);
 assert.match(manorClient,/ledgerRow\(roomSlots,string\.format\("%02d · %s",i,player\.DisplayName\),player\.UserId==hostId and"방장"or"손님"\)/);
 assert.match(manorClient,/ledgerRow\(roomSlots,string\.format\("%02d · 빈 객실",i\),"AI 예약"\)/);
 assert.match(manorClient,/Players:GetPlayers\(\)/);
});

test('세계 괴담 도감 UI는 12종 3단계 진행과 조각 계약서를 보여준다',()=>{
 assert.match(client,/Name="GhostCompendium"/);
 assert.match(client,/local function ghostProgressSet\(\)/);
 assert.match(client,/local function updateGhostBookUI\(\)/);
 assert.match(client,/괴담 조각 %d\/24 · 계약서 %d/);
 assert.match(client,/string\.format\("%s · %s\\n%s · %s · %s"/);
 assert.match(client,/GhostProgress/);
 assert.match(client,/GhostCompleted/);
 assert.match(client,/GhostContracts/);
 const bookBlock=client.slice(client.indexOf('-- 세계 괴담 도감'),client.indexOf('-- 코스메틱 상점'));
 assert.doesNotMatch(bookBlock,/FireServer|WalkSpeed|Damage|Energy|PurifyDistance|InfectRange/);
});


test('투명 스폰은 공중 발판이 되지 않고 로비와 경기장 스폰을 분리한다',()=>{
 assert.match(server,/foundationSpawn\.CanCollide=false/);
 assert.match(server,/foundationSpawn\.CanTouch=false/);
 assert.match(server,/foundationSpawn\.CanQuery=false/);
 assert.doesNotMatch(server,/foundationSpawn\.CanCollide=true/);
 assert.match(server,/lobbySpawnLocation\.Name="LobbySpawn"/);
 assert.match(server,/lobbySpawnLocation\.CanCollide=false/);
 assert.match(server,/local lobbyDestination=pos\.Z>=180/);
 assert.match(server,/local currentArena=arena/);
 assert.match(server,/currentArena=workspace:FindFirstChild\("MidnightArena"\)/);
 assert.match(server,/rootFolders=lobbyDestination and\{workspace:FindFirstChild\("MidnightLobby"\)\}or\{currentArena\}/);
 assert.match(server,/r\.AssemblyLinearVelocity=Vector3\.zero/);
 assert.match(server,/r\.AssemblyAngularVelocity=Vector3\.zero/);
});

test('에너지 HUD는 로비와 게임에서 현재값과 최대값을 항상 표시한다',()=>{
 assert.match(client,/energyLabel\.Text="에너지 100\/100"/);
 assert.match(client,/energyLabel\.Text=string\.format\("에너지 %d\/%d"/);
 assert.match(client,/energyFill\.Size=UDim2\.fromScale/);
 assert.match(manorClient,/에너지 %d\/%d/);
 assert.match(manorClient,/p:GetAttribute\("Energy"\)/);
 assert.match(manorClient,/p:GetAttribute\("EnergyMax"\)/);
});

test('실제 캐릭터 스폰은 목적 월드 바닥 Raycast와 아바타 높이로 계산한다',()=>{
 assert.match(server,/local function groundedRootTarget\(p,pos\)/);
 assert.match(server,/local lobbyDestination=pos\.Z>=180/);
 assert.match(server,/workspace:Raycast\(Vector3\.new\(pos\.X,rayTop,pos\.Z\),Vector3\.new\(0,-rayLength,0\),params\)/);
 assert.match(server,/local standingOffset=math\.max\(1,tonumber\(h\.HipHeight\)or 0\)\+\(r\.Size\.Y\*\.5\)/);
 assert.match(server,/local targetY=groundY\+standingOffset\+\.03/);
 assert.match(server,/if lobbyDestination then targetY=math\.clamp\(targetY,2\.8,5\.2\)else targetY=math\.clamp\(targetY,2\.8,6\.5\)end/);
 const groundBlock=server.slice(server.indexOf('local function groundedRootTarget'),server.indexOf('local function teleport',server.indexOf('local function groundedRootTarget')));
 assert.match(groundBlock,/local maxGroundY=lobbyDestination and\(pos\.Y\+1\.5\)or\(pos\.Y\+3\)/);
 assert.doesNotMatch(groundBlock,/FilterType=Enum\.RaycastFilterType\.Exclude/);
 assert.doesNotMatch(groundBlock,/Vector3\.new\(0,-44,0\)/);
 assert.match(server,/h:ChangeState\(Enum\.HumanoidStateType\.GettingUp\)/);
});

test('정상 경기장 빌드는 현재 arena 참조를 갱신해 스폰 바닥 검증이 새 맵을 사용한다',()=>{
 const makeArenaBlock=server.slice(server.indexOf('local function makeArena(map)'),server.indexOf('local function recordServerQA'));
 assert.match(makeArenaBlock,/decorateArenaWithOfficialAssets\(f,map\)[\s\S]{0,240}arena=f[\s\S]{0,120}workspace:SetAttribute\("MapReady",true\)/);
});

test('첫 캐릭터 프레임은 안전 바닥을 먼저 만들고 실제 목적지 teleport 한 경로만 사용한다',()=>{
 const bootstrapBlock=server.slice(server.indexOf('local function bootstrapLobbyCharacter'),server.indexOf('local function bindBootstrapLobbySpawn'));
 const groundIndex=server.indexOf('local bootstrapGround=workspace:FindFirstChild("ManorBootstrapGround")');
 const spawnIndex=server.indexOf('local lobbyBootstrapSpawn=workspace:FindFirstChild("LobbyBootstrapSpawn")');
 assert.ok(groundIndex>=0&&spawnIndex>groundIndex,'bootstrap ground must exist before engine spawn');
 assert.match(server,/FIRST_FRAME_SPAWN_SINGLE_PATH_V3/);
 assert.match(server,/bootstrapGround\.CanCollide=true/);
 assert.match(server,/PersistentBootstrapSafety/);
 assert.match(bootstrapBlock,/BootstrapGroundReadyAt/);
 assert.doesNotMatch(bootstrapBlock,/character:PivotTo/);
 assert.doesNotMatch(bootstrapBlock,/bootstrapTarget/);
 assert.doesNotMatch(server,/ManorBootstrapGround"\);if safety then safety:Destroy\(\)end/);
 assert.match(server,/foundationSpawn\.Enabled=false/);
 assert.match(server,/lobbyBootstrapSpawn\.Enabled=false/);
 assert.match(server,/foundationSpawn\.Enabled=true/);
 assert.match(server,/workspace:SetAttribute\("EngineSpawnPhase","ARENA_ONLY"\)/);
 assert.match(server,/workspace:SetAttribute\("EngineSpawnPhase","LOBBY_ONLY"\)/);
 assert.match(manorServer,/local spawn=Instance\.new\("Part"\);spawn\.Name="PersonalSpawn"/);
 assert.match(manorServer,/SpawnMarkerOnly/);
 assert.doesNotMatch(manorServer,/local spawn=Instance\.new\("SpawnLocation"\);spawn\.Name="PersonalSpawn"/);
 assert.doesNotMatch(manorServer,/p\.RespawnLocation=spawn/);
});

test('대기 로비 캐릭터는 경기장 MapReady를 기다리지 않고 로비 바닥에 즉시 스폰한다',()=>{
 const block=server.slice(server.indexOf('local function onCharacter'),server.indexOf('Players.PlayerAdded:Connect(function(p)'));
 assert.match(block,/workspace:GetAttribute\("PhysicalLobbyReady"\)/);
 assert.match(block,/local destination,look=personalSpawn\(p\)/);
 assert.match(block,/p\.RespawnLocation=lobbyBootstrapSpawn/);
 assert.match(block,/teleport\(p,destination,look\)/);
 assert.match(block,/LobbySpawnGroundedAt/);
 const waitingBranch=block.slice(block.indexOf('if state~="RUNNING"then'),block.indexOf('local readyDeadline'));
 assert.doesNotMatch(waitingBranch,/MapReady/);
});

test('홈페이지와 방 시스템은 하나의 Roblox Place만 사용한다',()=>{
 const homepage=JSON.parse(fs.readFileSync('homepage-platform-exposure.json','utf8'));
 const game=homepage.games.find(row=>row.gameId==='horror-escape-room');
 const roblox=game?.platforms?.find(row=>row.platform==='ROBLOX');
 const place='98222620265768';
 assert.equal(roblox?.placeId,place);
 assert.equal(roblox?.internalUrl,'https://www.roblox.com/games/'+place);
 assert.match(server,/ReserveServerAsync\(game\.PlaceId\)/);
 assert.match(server,/TeleportService:TeleportAsync\(game\.PlaceId/);
 assert.doesNotMatch(server,/ReserveServerAsync\((?!game\.PlaceId)/);
});

test('안전 스폰은 상호작용 오브젝트와 분리되고 바닥만 착지 대상으로 사용한다',()=>{
 const spawnBlock=server.slice(server.indexOf('local survivorSpawns={'),server.indexOf('local assetCache={}'));
 assert.match(spawnBlock,/Vector3\.new\(-5,3,54\)/);
 assert.doesNotMatch(spawnBlock,/-118,3,-70|118,3,-70|-108,3,104|108,3,104/);
 assert.match(server,/SetAttribute\("WalkableGround",true\)/);
 assert.match(server,/FilterType=Enum\.RaycastFilterType\.Include/);
 assert.match(server,/d:GetAttribute\("WalkableGround"\)==true/);
});

test('저택 로비 UI는 Version 77 구조 위에서 내부 아이콘 기반 다크카툰 카드로 구성된다',()=>{
 assert.match(manorAssets,/ModelId=89009422966867/);
 assert.match(manorClient,/ArtbookStyle","DARK_CARTOON_GOTHIC_HALLOWEEN"/);
 assert.match(manorClient,/UIAssetSource","INTERNAL_MANOR_ICONS"/);
 assert.match(manorClient,/local function internalIcon\(/);
 assert.match(manorClient,/local function artbookButton\(/);
 assert.match(manorClient,/DarkCartoonWelcomeCard/);
 for(const text of ['"인간","정화·대시·직업 스킬"','"몬스터","추적·감염·고유 스킬"','"혼자 바로 시작","같은 서버에서 즉시 출정"'])assert.ok(manorClient.includes(text),text);
 assert.doesNotMatch(manorClient,/local mapGlyph=/);
});
