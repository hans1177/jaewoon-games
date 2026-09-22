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

test('게임 시작 선택 UI는 선택 직후 접혀 플레이 입력을 가리지 않는다',()=>{
  assert.match(client,/local setupDismissed=false/);
  assert.match(client,/setupDismissed=true/);
  assert.match(client,/root\.Size=UDim2\.new\(1,-18,0,132\)/);
  assert.match(client,/local showSetup=not running and not setupDismissed/);
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
  for(const id of ['9044889073','9042664292','1837829181','9043346574'])assert.match(config,new RegExp(id));
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
