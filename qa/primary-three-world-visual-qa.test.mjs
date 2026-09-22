import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

const games=['cozy-island','daechung-rpg','horror-escape-room'];

test('3개 내부 빌드는 공식 CaptureService QA 카메라와 안전한 서버 기록을 가진다',()=>{
 for(const id of games){
  const config=read(`roblox-games/${id}/shared/GameConfig.luau`);
  const qa=read(`roblox-games/${id}/shared/QACamera.luau`);
  const client=read(`roblox-games/${id}/client/Game.client.luau`);
  const server=read(`roblox-games/${id}/server/Game.server.luau`);
  assert.match(config,/QACameraEnabled=true/);
  assert.match(config,/QACaptureRemoteName="QACaptureReport"/);
  for(const marker of ['CaptureService','PromptCaptureGalleryPermissionAsync','Enum.CaptureGalleryPermission.ReadAndUpload','TakeScreenshotCaptureAsync','PromptSaveCapturesToGallery','StartUploadCaptureAsync','CheckUploadCaptureStatusAsync','Enum.CameraType.Scriptable','UICaptureMode=Enum.UICaptureMode.All','camera.CameraType=saved.cameraType']){
   assert.match(qa,new RegExp(marker.replaceAll('.','\\.')));
  }
  assert.match(client,/QACamera\.install\(C,gui/);
  assert.match(server,/qa-camera-captures-v1/);
  assert.match(server,/if not isStatus and not raw:match\("\^%d\+\$"\)then return end/);
  assert.match(server,/record\.kind="STATUS"/);
  assert.match(server,/qaCaptureStore:UpdateAsync\("latest"/);
 }
});

test('포근섬 월드는 확장된 섬과 시야 비가림 지역 라벨을 가진다',()=>{
 const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
 const server=read('roblox-games/cozy-island/server/Game.server.luau');
 assert.match(style,/Size=Vector3\.new\(176,10,176\)/);
 assert.match(style,/Pos=Vector3\.new\(0,12,-232\)/);
 assert.match(server,/MaxDistance=78/);
 for(const marker of ['FarmPlot','ForestFloor','BarracksYard','Dock','MarketStallA','WatchTower','WindmillBase','IronVein','HayBale','QuarryCut','GoldVein','SulfurVent','STYLIZED_ISLANDS_AUTO_GATHER_V4'])assert.match(server,new RegExp(marker));
});

test('Whatever RPG는 블록 NPC/몹 대신 캐릭터 실루엣과 지역 아트를 생성한다',()=>{
 const server=read('roblox-games/daechung-rpg/server/Game.server.luau');
 assert.match(server,/local function humanoidFigure/);
 assert.match(server,/MaxDistance=42/);
 for(const marker of ['VillageHouse','VillageFountain','QuestBoard','VillageLantern','FieldStream','StoneBridge','NorthRoad','FieldRuin','FieldCrystal','BossArena','GoblinHead','SlimeCore','HoundHead','BanditHood','BossCore','FANTASY_PARTY_LIVING_WORLD_V4'])assert.match(server,new RegExp(marker));
});

test('심야 술래잡기는 실제 좌표 미니맵과 맵별 가독성 바닥/조명을 가진다',()=>{
 const client=read('roblox-games/horror-escape-room/client/Game.client.luau');
 const server=read('roblox-games/horror-escape-room/server/Game.server.luau');
 const style=read('roblox-games/horror-escape-room/shared/VisualStyle.luau');
 for(const marker of ['MiniMap','PlayerDot','mapLayouts','RunService.RenderStepped','CurrentMapId','MidnightArena','MapReady'])assert.match(client,new RegExp(marker.replaceAll('.','\\.')));
 for(const marker of ['SchoolHallFloor','SchoolCafeteriaFloor','HospitalHallFloor','HospitalBasementFloor','ParkMainPath','CarouselCanopy','READABLE_ART_V5','MapReady'])assert.match(server,new RegExp(marker));
 assert.match(server,/arena=ensureArena\(C\.Maps\[1\]\)/);
 assert.match(style,/Brightness=2\.05/);
 assert.match(style,/FogEnd=270/);
});

test('QA 캡처는 저장된 원본 Capture를 권한 승인 뒤 직접 업로드한다',()=>{
 for(const id of games){
  const qa=read(`roblox-games/${id}/shared/QACamera.luau`);
  const saveIndex=qa.indexOf('PromptSaveCapturesToGallery');
  const permissionIndex=qa.lastIndexOf('PromptCaptureGalleryPermissionAsync');
  const uploadCallIndex=qa.indexOf('uploadSavedCapture(entry.capture)');
  assert.ok(saveIndex>=0 && permissionIndex>saveIndex, id+' permission must follow save');
  assert.ok(uploadCallIndex>permissionIndex, id+' saved capture upload must follow permission');
  assert.doesNotMatch(qa,/ReadCapturesFromGalleryAsync/);
 }
});
