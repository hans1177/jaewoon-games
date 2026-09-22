import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const games=['cozy-island','daechung-rpg','horror-escape-room'];

test('3개 내부 빌드는 QA 카메라와 서버 기록 통로를 유지한다',()=>{
 for(const id of games){
  const config=read(`roblox-games/${id}/shared/GameConfig.luau`);
  const qa=read(`roblox-games/${id}/shared/QACamera.luau`);
  const client=read(`roblox-games/${id}/client/Game.client.luau`);
  const server=read(`roblox-games/${id}/server/Game.server.luau`);
  assert.match(config,/QACameraEnabled=true/);
  assert.match(config,/QACaptureRemoteName="QACaptureReport"/);
  for(const marker of ['CaptureService','TakeScreenshotCaptureAsync','PromptSaveCapturesToGallery','StartUploadCaptureAsync','CheckUploadCaptureStatusAsync','Enum.CameraType.Scriptable'])assert.match(qa,new RegExp(marker.replaceAll('.','\\.')));
  assert.match(client,/QACamera\.install\(C,gui/);
  assert.match(server,/qa-camera-captures-v1/);
  assert.match(server,/qaCaptureStore:UpdateAsync\("latest"/);
 }
});

test('포근섬은 넓은 기본섬과 채집/NPC/몹 밀도를 가진다',()=>{
 const style=read('roblox-games/cozy-island/shared/VisualStyle.luau');
 const server=read('roblox-games/cozy-island/server/Game.server.luau');
 assert.match(style,/Size=Vector3\.new\(176,10,176\)/);
 for(const marker of ['ManualGatherForest','ManualGatherFarm','WoodNode','FoodNode','HomeNPCs','HomeMobs','WildBoar','IslandRaider','COZY_MANUAL_GATHER_NPC_MOBS_V5'])assert.match(server,new RegExp(marker));
});

test('대충 RPG는 작은 단일 필드가 아니라 5개 대형 지역과 인구/몬스터 밀도를 가진다',()=>{
 const server=read('roblox-games/daechung-rpg/server/Game.server.luau');
 const config=read('roblox-games/daechung-rpg/shared/GameConfig.luau');
 assert.match(server,/Vector3\.new\(440,2,440\)/);
 assert.match(server,/for i=1,28 do themedProp/);
 assert.match(server,/for i=1,10 do spawnEnemy/);
 assert.match(server,/AIUsers/);
 assert.match(server,/VillageHouse/);
 assert.match(server,/EnemyHead/);
 assert.match(server,/RPG_FIVE_PORTAL_WORLD_V1/);
 assert.equal((config.match(/Class="(?:NONE|HEALER|WARRIOR|ARCHER)"/g)||[]).length,10);
});

test('심야는 이동 가능한 어둠과 지도별 시각 기준점을 가진다',()=>{
 const client=read('roblox-games/horror-escape-room/client/Game.client.luau');
 const server=read('roblox-games/horror-escape-room/server/Game.server.luau');
 for(const marker of ['MiniMap','PlayerDot','mapLayouts','RunService.RenderStepped','CurrentMapId','MidnightArena','MapReady'])assert.match(client,new RegExp(marker.replaceAll('.','\\.')));
 for(const marker of ['HallGuideStrip','HospitalGuideStrip','ParkLandmarkSign','ASSET_ESCAPE_V7','AssetService','ObjectivePrompt','EscapePrompt','LibraryWing','EmergencyWing','ArcadeZone','MapReady'])assert.match(server,new RegExp(marker));
 assert.match(server,/Vector3\.new\(340,1,340\)/);
 assert.match(server,/Lighting\.Brightness=1\.18/);
 assert.match(server,/arena=ensureArena\(C\.Maps\[1\]\)/);
});

test('QA 캡처는 저장된 Capture를 권한 승인 뒤 업로드한다',()=>{
 for(const id of games){
  const qa=read(`roblox-games/${id}/shared/QACamera.luau`);
  const save=qa.indexOf('PromptSaveCapturesToGallery');
  const permission=qa.lastIndexOf('PromptCaptureGalleryPermissionAsync');
  const upload=qa.indexOf('uploadSavedCapture(entry.capture)');
  assert.ok(save>=0&&permission>save,id+' permission order');
  assert.ok(upload>permission,id+' upload order');
 }
});
