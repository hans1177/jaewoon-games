import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=fs.readFileSync('roblox-games/horror-escape-room/shared/GameConfig.luau','utf8');
const server=fs.readFileSync('roblox-games/horror-escape-room/server/Game.server.luau','utf8');
const client=fs.readFileSync('roblox-games/horror-escape-room/client/Game.client.luau','utf8');
const launch=JSON.parse(fs.readFileSync('roblox-games/horror-escape-room/launch-mvp.json','utf8'));

test('심야 술래잡기 외부출시 빌드는 구조가 다른 3개 맵과 전용 이벤트를 가진다',()=>{
  for(const id of ['SCHOOL','HOSPITAL','THEME_PARK'])assert.match(config,new RegExp('Id="'+id+'"'));
  for(const area of ['교실','복도','급식실','체육관','병실','수술실','지하실','회전목마','귀신의 집','매표소','지하 통로'])assert.match(config,new RegExp(area));
  for(const eventId of ['LIGHTS_OUT','RED_HALL','FIRE_DRILL','POWER_OUTAGE','WARD_LOCKDOWN','BASEMENT_FOG','CAROUSEL_START','RIDE_BLACKOUT','TUNNEL_FOG'])assert.match(config,new RegExp(eventId));
  for(const marker of ['ClassDesk','CafeteriaTable','GymFloor','HospitalHallL','HospitalBed','SurgeryTable','BasementCeiling','CarouselRotor','HauntedShell','TicketBooth','UnderpassCeiling'])assert.match(server,new RegExp(marker));
  assert.match(server,/currentMapIndex=\(currentMapIndex%#C\.Maps\)\+1/);
  assert.match(server,/workspace:SetAttribute\("CurrentMapName"/);
  assert.match(server,/workspace:SetAttribute\("CurrentMapEventName"/);
  assert.match(server,/workspace:SetAttribute\("MapEventGameplay"/);
  assert.ok(launch.releaseGates.includes('3-map round rotation'));
  assert.ok(launch.releaseGates.includes('three map-specific events per map'));
});

test('심야 술래잡기 UI는 추격 시야를 비우고 상황별 최소 행동만 표시한다',()=>{
  for(const marker of ['MidnightTopHUD','RoleSetup','RoundActions','친구 구출','대시','괴물 스킬','setupPanel.Visible','actionDock.Visible','CoreUISafeInsets'])assert.match(client,new RegExp(marker));
  assert.match(client,/hud\.Size=UDim2\.fromOffset\(320,46\)/);
  assert.match(client,/actionDock\.Size=UDim2\.fromOffset\(194,48\)/);
  assert.match(client,/rescueButton\.Visible=running and role=="SURVIVOR"/);
  assert.match(client,/abilityButton\.Visible=running and role=="MONSTER"/);
  assert.match(client,/setupChosen=true/);
  assert.ok(launch.releaseGates.includes('start UI collapses after selection'));
});

test('클라이언트가 임의 Remote 액션이나 스팸으로 서버 상태를 조작할 수 없다',()=>{
  assert.match(server,/local allowedActions=\{\}/);
  assert.match(server,/allowedActions\[action\]=true/);
  assert.match(server,/allowedActions\[a\]~=true then return false/);
  assert.match(server,/now-\(lastRequest\[p\]or 0\)<C\.RemoteMinInterval/);
  assert.equal((server.match(/remote\.OnServerEvent:Connect/g)||[]).length,1);
  assert.match(server,/broadcastMultiplayerSync\(p\)/);
  assert.match(server,/remote:FireAllClients\("MULTIPLAYER_SYNC"/);
  assert.doesNotMatch(server,/RoundScore.*\+1/);
  assert.ok(launch.releaseGates.includes('remote action allowlist and spam rejection'));
});

test('서버가 순간이동 속도조작 맵밖 이동을 되돌린다',()=>{
  assert.match(config,/MaxHorizontalVelocity=92/);
  assert.match(config,/MaxTeleportStep=36/);
  assert.match(config,/ArenaLimit=86/);
  assert.match(server,/horizontal<=C\.MaxHorizontalVelocity/);
  assert.match(server,/Magnitude<=C\.MaxTeleportStep/);
  assert.match(server,/math\.abs\(pos\.X\)<=C\.ArenaLimit/);
  assert.match(server,/r\.AssemblyLinearVelocity=Vector3\.zero/);
  assert.match(server,/r\.CFrame=CFrame\.new\(previous\)/);
  assert.ok(launch.releaseGates.includes('teleport/speed/out-of-bounds abuse rejection'));
});

test('검증된 Creator Store 오디오가 실제 런타임에 연결된다',()=>{
  for(const id of ['9043557976','9042664292','1837829181','9043346574'])assert.match(config,new RegExp(id));
  assert.match(client,/local SoundService=game:GetService\("SoundService"\)/);
  assert.match(client,/bgm:Play\(\)/);
  assert.match(client,/chase:Play\(\)/);
  assert.match(client,/actionSfx:Play\(\)/);
  assert.match(client,/warningSfx:Play\(\)/);
  assert.ok(launch.releaseGates.includes('Creator Store BGM and gameplay SFX'));
  assert.equal(launch.evidencePolicy.audioFeedbackPassRequired,true);
  assert.equal(launch.externalReleaseCandidate,true);
});

test('기존 출시 핵심 게이트는 유지된다',()=>{
  for(const gate of [
    '1-player AI fill',
    '2+ player real monster assignment',
    'freeze/rescue sync',
    'monster abilities',
    'mobile controls',
    'save/rejoin',
    'round restart regression',
  ])assert.ok(launch.releaseGates.includes(gate),gate);
  assert.equal(launch.evidencePolicy.aiMayInventPass,false);
  assert.equal(launch.evidencePolicy.abuseResistancePassRequired,true);
  assert.equal(launch.evidencePolicy.startUiRegressionPassRequired,true);
});


test('발소리 얼리기 구출 결과 음악과 추격 화면 피드백이 연결된다',()=>{
  for(const key of ['Footstep','Freeze','Rescue','Result'])assert.match(config,new RegExp(key+'="rbxassetid://'));
  for(const marker of ['MidnightFootstep','MidnightFreeze','MidnightRescue','MidnightResult','chaseTint','humanoid.Running','FeedbackEvent'])assert.match(client,new RegExp(marker.replace('.', '\\.')));
  assert.match(server,/FeedbackEvent","FREEZE:/);
  assert.match(server,/FeedbackEvent","RESCUE:/);
  assert.match(server,/FeedbackEvent","RESULT:/);
  for(const gate of ['footstep feedback','freeze/rescue audio feedback','result music','chase screen feedback'])assert.ok(launch.releaseGates.includes(gate),gate);
});

test('심야 술래잡기는 첫 라운드 전에도 학교 맵을 프리로드한다',()=>{
  assert.match(server,/arena=makeArena\(C\.Maps\[1\]\)/);
  assert.match(server,/workspace:SetAttribute\("MapReady",true\)/);
  assert.match(client,/workspace:GetAttribute\("MapReady"\)~=true/);
  assert.match(client,/workspace:FindFirstChild\("MidnightArena"\)/);
});

test('1인 플레이는 로비부터 맵 안에서 시작하고 역할 선택 시 즉시 라운드 시작을 요청한다',()=>{
  assert.match(server,/if #Players:GetPlayers\(\)==1 then/);
  assert.match(server,/teleport\(p,survivorSpawns\[1\]\)/);
  assert.match(server,/SOLO_MONSTER.*soloStartRequested=true/);
  assert.match(server,/SOLO_SURVIVOR.*soloStartRequested=true/);
  assert.match(server,/if #Players:GetPlayers\(\)==1 and soloStartRequested then break end/);
  assert.match(config,/SoloPlayable=true/);
  assert.match(config,/TargetPopulation=6/);
});

test('심야 BGM은 평상시 가벼운 서스펜스이고 강한 추격곡은 괴물이 가까울 때만 재생한다',()=>{
  assert.match(config,/Background="rbxassetid:\/\/9043557976"/);
  assert.match(client,/MidnightBackground",C\.Audio\.Background,\.11,true/);
  assert.match(client,/MidnightChase",C\.Audio\.Chase,\.14,true/);
  assert.match(client,/local function nearestMonsterDistance\(\)/);
  assert.match(client,/local near=distance<=32/);
  assert.match(client,/local danger=distance<=17/);
  assert.match(client,/if near then/);
  assert.match(client,/bgm\.Volume=near and \.045 or \.105/);
});

test('심야 맵 전환은 기존 맵을 유지한 채 완성 후 교체하고 첫 학교 맵은 재사용한다',()=>{
  assert.match(server,/workspace:SetAttribute\("MapBuilding",true\)/);
  assert.match(server,/f\.Name=old and"MidnightArenaNext"or"MidnightArena"/);
  assert.match(server,/if old and old\.Parent then/);
  assert.match(server,/f\.Name="MidnightArena"/);
  assert.match(server,/workspace:SetAttribute\("MapBuilding",false\)/);
  assert.match(server,/workspace:GetAttribute\("CurrentMapId"\)==map\.Id/);
  assert.match(server,/arena=existing/);
  assert.match(server,/while workspace:GetAttribute\("MapReady"\)~=true/);
});

test('심야는 상세 맵 생성 실패 시 안전한 기본맵으로 자동 복구한다',()=>{
  assert.match(server,/local function recordServerQA\(status\)/);
  assert.match(server,/local function makeFallbackArena\(map,reason\)/);
  assert.match(server,/local function ensureArena\(map\)/);
  assert.match(server,/pcall\(function\(\)return makeArena\(map\)end\)/);
  assert.match(server,/MIDNIGHT_FALLBACK_SAFE_V1/);
  assert.match(server,/workspace:SetAttribute\("MapReady",true\)/);
  assert.match(server,/recordServerQA\("MAP_FALLBACK:"/);
  assert.match(server,/arena=ensureArena\(C\.Maps\[1\]\)/);
});
