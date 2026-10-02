// 파일명: qa/horror-manor.test.mjs
// 블렌더 산출물·개인 로비·기존 기능 회귀 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
const root='assets/roblox/midnight-manor';
const read=p=>fs.readFileSync(p,'utf8');
const server=read('roblox-games/horror-escape-room/server/Game.server.luau');
const lobby=read('roblox-games/horror-escape-room/server/ManorLobby.luau');
const ui=read('roblox-games/horror-escape-room/client/ManorLobby.client.luau');
const oldUI=read('roblox-games/horror-escape-room/client/Game.client.luau');
const config=read('roblox-games/horror-escape-room/shared/GameConfig.luau');
const studioReview=read('tools/horror-manor-studio-review.mjs');
const manorNativeCheck=read('tools/horror-manor-native-check.mjs');
const manorBuild=read(root+'/build.py');
const ownerWorkflow=read('.github/workflows/horror-owner-system-publish.yml');
const manorReviewWorkflow=read('.github/workflows/horror-manor-review.yml');
const runnerBootstrapWorkflow=read('.github/workflows/company-roblox-runner-pwsh-bootstrap.yml');
const roadmap=JSON.parse(read('company-learning/platform-release-roadmap.json'));
const manorAssets=read('roblox-games/horror-escape-room/shared/ManorAssets.luau');
const cloudOwnerBuild=process.env.MANOR_CLOUD_BUILD==='1';


test('Studio 검증은 고정 버전 Rojo를 직접 설치하고 러너 복구 경로와 연결된다',()=>{
 assert.match(manorReviewWorkflow,/rojo-7\.7\.0-windows-x86_64\.zip/);
 assert.match(manorReviewWorkflow,/2179c44862a10ecbd725bdfeb4abc64e16dc4aad9b6c8f3e1a7c46a87280b949/);
 assert.match(manorReviewWorkflow,/MANOR_REVIEW_ROJO/);
 assert.match(manorReviewWorkflow,/MANOR_NATIVE_ASSET_ID='89009422966867'/);
 assert.match(manorReviewWorkflow,/ManorTemplate:\{\$path:process\.env\.MANOR_REVIEW_MANOR\}/);
 assert.match(manorReviewWorkflow,/MANOR_REVIEW_PACKAGED_VERSION77=PASS/);
 assert.doesNotMatch(manorReviewWorkflow,/81599595871905/);
 assert.doesNotMatch(manorReviewWorkflow,/PREVIOUS_VERIFIED_ROJO_NOT_FOUND/);
 assert.match(runnerBootstrapWorkflow,/\.github\/workflows\/horror-manor-review\.yml/);
 assert.match(runnerBootstrapWorkflow,/tools\/horror-manor-studio-review\.mjs/);
 assert.match(runnerBootstrapWorkflow,/ROBLOX_RUNNER_PATH_DISCOVERY=AUTO_METADATA/);
 assert.match(runnerBootstrapWorkflow,/ROBLOX_RUNNER_REBOOT_AUTOSTART=HIDDEN_USER_LOGON_STARTUP/);
 assert.doesNotMatch(runnerBootstrapWorkflow,/\$runnerRoot\s*=\s*'C:\\\\actions-runner'/);
});

test('공식 Studio 검증은 실제 PersonalGround 접촉을 새 서버 재시작 전후로 확인한다',()=>{
 assert.match(studioReview,/captureGroundContact\(studioId,'server-1'\)/);
 assert.match(studioReview,/captureGroundContact\(studioId,'server-2'\)/);
 assert.match(studioReview,/ground\.Name=="PersonalGround"/);
 assert.match(studioReview,/ground:GetAttribute\("WalkableGround"\)==true/);
 assert.match(studioReview,/!floor\.includes\('Air'\)/);
 assert.match(studioReview,/localZ>=52&&localZ<=68/);
 assert.match(studioReview,/MANOR_NEW_SERVER_GROUND_CONTACT=PASS/);
});

test('personal manor stays on the Published Version 77 large-house asset',()=>{
 assert.match(manorAssets,/검증된 모델 4f4d911a4ef1259ce60588a79550bbbb377e2ace234e82ea51ee60a1e24853b0/);
 assert.match(manorAssets,/ModelId=89009422966867/);
 assert.match(manorAssets,/SourceWidth=185\.47802734375/);
 assert.match(manorAssets,/SourceCenter=Vector3\.new\(6\.072624206542969,20\.9506893157959,-7\.40179443359375\)/);
 assert.doesNotMatch(manorAssets,/ModelId=110915923417469/);
});

test('explicit owner-direct route publishes exact current main only to the canonical private horror place without claiming F9',()=>{
 const policy=roadmap?.roblox?.deploymentControl?.ownerDirectCanonicalPublishException;
 assert.equal(policy?.enabled,true);
 assert.ok(policy?.gameIds?.includes('horror-escape-room'));
 assert.equal(policy?.f9RequiredForOwnerDirectPublish,false);
 assert.equal(policy?.exactMainSourceRequired,true);
 assert.equal(policy?.canonicalPrivateTargetOnly,true);
 assert.equal(policy?.publicDiscoveryAllowed,false);
 assert.equal(policy?.doesNotClaimF9Pass,true);
 assert.equal(policy?.doesNotReplaceOrSatisfyDevelopmentF0F9,true);
 assert.match(ownerWorkflow,/name: Horror Owner Direct Publish/);
 assert.match(ownerWorkflow,/OWNER_DIRECT_CANONICAL_PRIVATE_PUBLISH=PASS/);
 assert.match(ownerWorkflow,/OWNER_DIRECT_F9_CLAIM=NO/);
 assert.match(ownerWorkflow,/ROBLOX_UNIVERSE_ID: '10767445796'/);
 assert.match(ownerWorkflow,/ROBLOX_PLACE_ID: '98222620265768'/);
 assert.match(ownerWorkflow,/versions\?versionType=Published/);
 assert.match(ownerWorkflow,/git diff --exit-code/);
 assert.match(ownerWorkflow,/VERSION_77_MANOR_BINDING_CHANGED/);
 assert.match(ownerWorkflow,/MANOR_NATIVE_ASSET_ID: '89009422966867'/);
 assert.match(ownerWorkflow,/ManorTemplate:\{\$path:'\/tmp\/horror-manor-native\/manor-template\.rbxm'\}/);
 assert.match(ownerWorkflow,/OWNER_DIRECT_VERSION77_MANOR_NATIVE_DOWNLOAD=PASS/);
 assert.match(ownerWorkflow,/OWNER_DIRECT_MANOR_TEMPLATE_PACKAGED=PASS/);
 assert.match(manorNativeCheck,/process\.env\.MANOR_NATIVE_ASSET_ID\|\|evidence\.assetId/);
 assert.match(manorNativeCheck,/process\.env\.MANOR_NATIVE_EVIDENCE/);
 assert.doesNotMatch(ownerWorkflow,/blender --background/);
 assert.doesNotMatch(ownerWorkflow,/horror-manor-assets\.mjs/);
});

test('manor UI follows the current artbook and mobile-safe map board',()=>{
 assert.match(ui,/ArtbookId","horror-escape-room-2026-10-02-manor-rebuild"/);
 assert.match(ui,/ArtbookStyle","DARK_CARTOON_GOTHIC_HALLOWEEN"/);
 assert.match(ui,/local ink=Color3\.fromRGB\(20,16,18\)/);
 assert.match(ui,/local wine=Color3\.fromRGB\(76,24,38\)/);
 assert.match(ui,/local parchment=Color3\.fromRGB\(218,194,145\)/);
 assert.match(ui,/local brass=Color3\.fromRGB\(151,113,61\)/);
 assert.match(ui,/compactMobile=UserInputService\.TouchEnabled or v\.X<900 or v\.Y<600/);
 assert.match(ui,/panel\.AnchorPoint=Vector2\.new\(\.5,1\)/);
 assert.match(ui,/nav\.Size=UDim2\.fromOffset\(74,236\)/);
 assert.match(ui,/\{\{"PLAY","지도"\},\{"BOOK","도감"\},\{"DRESS","옷장"\},\{"EVENT","저택"\},\{"RECORD","기록"\}\}/);
 assert.match(ui,/label\(body,"1\. 맵 선택"/);
 assert.match(ui,/label\(body,"2\. 역할 · "/);
 assert.match(ui,/label\(body,"3\. 시작"/);
 assert.match(ui,/artbookButton\(body,"혼자 바로 시작"/);
 assert.match(ui,/local mapIconIndex=\{SCHOOL=0,HOSPITAL=4,THEME_PARK=3\}/);
 assert.match(ui,/UIAssetSource","INTERNAL_MANOR_ICONS"/);
 assert.match(ui,/local function internalIcon\(/);
 assert.match(ui,/local function artbookButton\(/);
 assert.match(ui,/DarkCartoonWelcomeCard/);
 assert.match(ui,/send\(C\.Actions\.SELECT_MAP,map\.Id\)/);
 assert.match(ui,/header\.Visible=false;commands\.Visible=false;panel\.Visible=true/);
});

test('selected lobby map stays server-authoritative through room and round',()=>{
 assert.match(ui,/send\(C\.Actions\.SELECT_MAP,map\.Id\)/);
 assert.match(ui,/p:GetAttribute\("SelectedLobbyMap"\)/);
 assert.match(server,/local selectedMap=mapById\(p:GetAttribute\("SelectedLobbyMap"\)or"SCHOOL"\)/);
 assert.match(server,/roomSelectedMapId=selectedMap\.Id/);
 assert.match(server,/selectedMapId=tostring\(record\.mapId or"SCHOOL"\)/);
 assert.match(server,/roomSelectedMapId=mapById\(teleportData\.selectedMapId\)\.Id/);
 assert.match(server,/local map=mapById\(roomSelectedMapId\)/);
 assert.match(server,/workspace:SetAttribute\("CurrentMapId",map\.Id\)/);
 assert.match(server,/workspace:SetAttribute\("CurrentMapName",map\.Name\)/);
});

test('personal manor spawn stays on the front-yard ground layer',()=>{
 assert.match(server,/lobbyBootstrapSpawn\.Position=Vector3\.new\(0,\.55,330\)/);
 assert.match(server,/bootstrapGround\.Position=Vector3\.new\(0,-\.15,330\)/);
 assert.match(server,/return Vector3\.new\(0,3,330\),Vector3\.new\(0,5,268\),lobbyBootstrapSpawn/);
 assert.match(server,/local maxGroundY=lobbyDestination and\(pos\.Y\+1\.5\)or\(pos\.Y\+3\)/);
 assert.match(server,/local lobbyDestination=pos\.Z>=180/);
 assert.match(server,/local target=lobbyDestination and Vector3\.new\(pos\.X,pos\.Y,pos\.Z\)or groundedRootTarget\(p,pos\)/);
 assert.match(server,/local corrected=lobbyDestination and Vector3\.new\(pos\.X,pos\.Y,pos\.Z\)or groundedRootTarget\(p,pos\)/);
 assert.match(server,/local topY=d\.Position\.Y\+d\.Size\.Y\*\.5/);
 assert.match(server,/if topY<=maxGroundY then table\.insert\(grounds,d\)end/);
 assert.match(server,/local rayTop=lobbyDestination and\(pos\.Y\+4\)or\(pos\.Y\+6\)/);
 assert.match(server,/local rayLength=lobbyDestination and math\.max\(16,pos\.Y\+12\)or 18/);
 assert.doesNotMatch(server,/rayTop=lobbyDestination and 30/);
 assert.match(server,/lobbySpawnLocation\.Position=Vector3\.new\(0,\.4,330\)/);
 assert.match(lobby,/local spawn=Instance\.new\("Part"\);spawn\.Name="PersonalSpawn";spawn\.Position=origin\+Vector3\.new\(0,\.55,60\)/);
 assert.match(lobby,/SpawnMarkerOnly/);
 assert.doesNotMatch(lobby,/local spawn=Instance\.new\("SpawnLocation"\);spawn\.Name="PersonalSpawn"/);
 assert.doesNotMatch(lobby,/p\.RespawnLocation=spawn/);
 assert.match(server,/FIRST_FRAME_SPAWN_SINGLE_PATH_V4/);
 assert.match(server,/bootstrapGround\.CanCollide=true/);
 assert.match(server,/PersistentBootstrapSafety/);
 assert.doesNotMatch(server,/character:PivotTo\(CFrame\.lookAt\(bootstrapTarget,bootstrapLook\)\)/);
 assert.match(ui,/camera\.CFrame=CFrame\.lookAt\(Vector3\.new\(x,7\.2,z\+76\),Vector3\.new\(x,6\.2,z\+2\)\)/);
 assert.match(manorBuild,/ArrivalCourtOuter/);
 assert.match(manorBuild,/ArrivalCourtInner/);
 assert.match(manorBuild,/ArrivalCourtCrest/);
});

test('personal manor uses hall-to-courtyard direction to keep the front yard in front',()=>{
 assert.match(lobby,/local hallAnchor=exactVisualPart\("HallFloor"\)/);
 assert.match(lobby,/local courtyardAnchor=exactVisualPart\("Courtyard"\)/);
 assert.match(lobby,/local expectedCourtyard=Vector3\.new\(0,-\.2,20\)/);
 assert.match(lobby,/local expectedFlat=Vector3\.new\(0,0,49\)/);
 assert.match(lobby,/local pairScale=expectedFlat\.Magnitude\/actualFlat\.Magnitude/);
 assert.match(lobby,/local heading=math\.atan2\(actualFlat\.X,actualFlat\.Z\)/);
 assert.match(lobby,/CFrame\.Angles\(0,-heading,0\)/);
 assert.match(lobby,/self\.visualAnchorMode="HALL_COURTYARD_PAIR"/);
 assert.match(lobby,/self\.visualAnchorMode="HALL_FLOOR_TRANSLATION"/);
 assert.match(lobby,/self\.visualAnchorMode="SOURCE_CENTER_FALLBACK"/);
 assert.match(lobby,/ManorVisualAnchorYawDegrees/);
 assert.doesNotMatch(lobby,/MANOR_NATIVE_ARCHITECTURE_ALIGNMENT_FAILED/);
 assert.doesNotMatch(lobby,/MANOR_NATIVE_ARCHITECTURE_ANCHOR_MISSING/);
});

test('personal manor lobby keeps only the first-floor walkable collision',()=>{
 assert.match(lobby,/part\(folder,"PersonalGround",origin\+Vector3\.new\(0,-\.15,10\),Vector3\.new\(160,1,156\),true\)/);
 assert.doesNotMatch(lobby,/part\(folder,"GrandStairGround"/);
 assert.doesNotMatch(lobby,/part\(folder,"SecondFloorGroundRear"/);
 assert.doesNotMatch(lobby,/part\(folder,"SecondFloorGroundSide"/);
 assert.doesNotMatch(lobby,/part\(folder,"SecondFloorStairLandingGround"/);
 assert.doesNotMatch(lobby,/StairwellRailBoundary/);
 assert.doesNotMatch(lobby,/GalleryFrontRailBoundary/);
});

test('scenic backdrop stays behind the manor rear wall',()=>{
 assert.doesNotMatch(manorBuild,/\[\(-72,far\),\(-58,mid\)\]/);
 assert.match(manorBuild,/\[\(-104,far\),\(-90,mid\)\]/);
 assert.doesNotMatch(manorBuild,/BackdropFenceRailA',\(0,3\.0,-63\.5\)/);
 assert.match(manorBuild,/BackdropFenceRailA',\(0,3\.0,-88\.5\)/);
 assert.doesNotMatch(manorBuild,/BackdropChapel',\(5,3,-76\)/);
 assert.match(manorBuild,/BackdropChapel',\(5,3,-108\)/);
});

test('downloaded assets retain original bytes and CC0 license',()=>{
 const manifest=JSON.parse(read(root+'/asset-manifest.json'));
 assert.equal(manifest.models.length,231);
 const files=new Map();
 for(const pack of ['graveyard','furniture']){
  const tar=zlib.gunzipSync(fs.readFileSync(`${root}/sources/${pack}.tar.gz`));
  for(let offset=0;offset+512<=tar.length;){
   const name=tar.toString('utf8',offset,offset+100).replace(/\0.*$/s,'');
   if(!name)break;
   const size=parseInt(tar.toString('ascii',offset+124,offset+136).replace(/\0.*$/s,'').trim(),8)||0;
   const type=tar.toString('ascii',offset+156,offset+157);
   if(type==='0'||type==='\0')files.set(`sources/${pack}/${name}`,tar.subarray(offset+512,offset+512+size));
   offset+=512+Math.ceil(size/512)*512;
  }
 }
 for(const m of manifest.models){const b=files.get(m.file);assert.ok(b,m.file);assert.equal(b.length,m.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),m.sha256);assert.equal(b.toString('utf8',0,4),'glTF');}
 for(const p of ['graveyard','furniture'])assert.match(files.get(`sources/${p}/LICENSE.txt`).toString(),/CC0/);
});
test('NPC source uses continuous-surface role-specific geometry instead of primitive body assembly',()=>{
 const start=manorBuild.indexOf('def npc(s,kind,pos):');const stop=manorBuild.indexOf('\ndef build():',start);assert.ok(start>=0&&stop>start);
 const npcSource=manorBuild.slice(start,stop);
 assert.match(manorBuild,/def loft\(self,name,pos,sections/);assert.match(manorBuild,/def prism\(self,name,pos,outline/);assert.match(manorBuild,/def capsule\(self,name,pos,height/);
 assert.match(manorBuild,/def curve_tube\(self,name,points,radii,depths/);
 assert.match(manorBuild,/def sculpted_face\(self,name,pos,size,mat,profile/);
 assert.match(manorBuild,/sides=56;rings=36/);
 assert.match(manorBuild,/sides=max\(20,sides\)/);
 assert.match(manorBuild,/sides=max\(18,sides\)/);
 assert.match(manorBuild,/bevel\.segments=2/);
 assert.doesNotMatch(manorBuild,/round\(sides\*\.(?:70|72)\)/,'Automatic geometry downgrade is forbidden');
 assert.doesNotMatch(manorBuild,/min\(size\)>=\.12|depth>=\.12/,'Authored micro-detail removal heuristics are forbidden');
 for(const name of ['ButlerHead','UndertakerHead','ArchivistHead'])assert.match(npcSource,new RegExp("kind\\+'Head'|"+name));
 assert.doesNotMatch(npcSource,/s\.ellipsoid\(kind\+'_Head'/);
 assert.doesNotMatch(npcSource,/s\.box\(kind\+'_CoatTail'/);
 assert.match(npcSource,/s\.sculpted_face\(kind\+'Head'/);
 assert.match(npcSource,/s\.curve_tube\(kind\+'_Leg'/);
 assert.match(npcSource,/s\.curve_tube\(kind\+'_Arm'/);
 assert.match(npcSource,/face_profiles=\{/);
 assert.match(npcSource,/grip_profiles=\{/);
 assert.match(npcSource,/MouthCorner/);assert.match(npcSource,/TempleFold/);assert.match(npcSource,/ChinFold/);
 assert.match(npcSource,/Butler_PocketWatchChain/);assert.match(npcSource,/Butler_ShirtCollar/);
 assert.match(npcSource,/Undertaker_HighCollar/);assert.match(npcSource,/UndertakerHatDent/);assert.match(npcSource,/Undertaker_LapelPin/);
 assert.match(npcSource,/Archivist_GlassArm/);assert.match(npcSource,/Archivist_BrowWrinkle/);
 assert.match(npcSource,/Archivist_LedgerPage/);assert.match(npcSource,/Archivist_LedgerStrap/);
 assert.match(manorBuild,/DIRECT_PROCEDURAL_ROLE_SPECIFIC_CONTINUOUS_SURFACE_V4/);
});
test('Blender review renderer is compatible across supported Eevee identifiers',()=>{
 assert.match(manorBuild,/BLENDER_EEVEE_NEXT/);
 assert.match(manorBuild,/BLENDER_EEVEE/);
 assert.match(manorBuild,/BLENDER_WORKBENCH/);
 assert.match(manorBuild,/select_review_engine\(scene,fast\)/);
});
test('manor GLB is self-contained and all geometry buffers are in bounds',()=>{
 const b=fs.readFileSync(root+'/generated/manor-lobby.glb');assert.equal(b.readUInt32LE(8),b.length);assert.ok(b.length<20*1024*1024);
 const len=b.readUInt32LE(12);const d=JSON.parse(b.toString('utf8',20,20+len));
 assert.ok(d.meshes.length>=200);assert.ok(d.nodes.some(n=>n.name==='ButlerHead'));
 assert.ok(d.nodes.some(n=>n.name==='ArchivistHead'));assert.ok(d.nodes.some(n=>n.name==='CoffinLid'));
 for(const im of d.images)assert.equal(im.uri,undefined);
 for(const v of d.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=d.buffers[0].byteLength);
 for(const mesh of d.meshes)for(const p of mesh.primitives){assert.ok(d.accessors[p.attributes.POSITION]);assert.ok(d.materials[p.material]);}
});
test('old hotel and shared elevator matching are absent from active lobby',()=>{
 for(const source of [server,oldUI,lobby,ui])assert.doesNotMatch(source,/NOCTURNE HOTEL|HotelLobbyFloor|LobbyStaff_CLERK|LoadingHotelDoor|승강기/);
 assert.doesNotMatch(server,/lobbyQueueBays|beginMatchBayCountdown/);
 assert.match(lobby,/visitor~=p/);assert.match(lobby,/index\*256/);assert.match(lobby,/OwnerUserId/);
 assert.match(server,/teleport\(p,destination,look\)/);assert.match(server,/manorLobby:Recover/);
});
test('solo sessions are private and reserve a single human slot while AI fills combat',()=>{
 assert.match(server,/createReservedRoom\(p,"PRIVATE",true\)/);assert.match(server,/maxPlayers=solo and 1/);
 assert.match(server,/record\.soloSession==true/);assert.match(server,/rolePreference=p:GetAttribute/);
 assert.match(config,/TargetPopulation=8/);assert.match(server,/humanNeed=math\.max/);assert.match(server,/monsterNeed=math\.max/);
});
test('lobby actions retain server authority and personal menu ownership',()=>{
 assert.match(server,/validRemoteAction\(p,a\)/);assert.match(lobby,/Magnitude>14/);assert.match(lobby,/room\.busy/);
 assert.match(server,/owned\[id\]/);assert.match(server,/coins<price/);assert.match(server,/manorLobby:Dress\(p\)/);
 assert.match(ui,/GhostProgress/);assert.match(ui,/i<=stage/);assert.match(ui,/MANOR_RANKING/);
});
test('personal manor collection display is driven by existing saved progression only',()=>{
 const b=fs.readFileSync(root+'/generated/manor-lobby.glb');
 const d=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 const names=new Set(d.nodes.map(n=>n.name));
 for(const name of [
  'GhostRelic_YUREI','GhostRelic_BLACK_SHUCK',
  'MapPin_SCHOOL','MapPin_HOSPITAL','MapPin_THEME_PARK',
  'MemoryRelic_SCHOOL','MemoryRelic_HOSPITAL','MemoryRelic_THEME_PARK'
 ])assert.ok(names.has(name),'generated manor is missing '+name);
 assert.match(lobby,/GhostRelic_"\.\.ghost\.Id/);
 assert.match(lobby,/local stage=math\.clamp\(tonumber\(stages\[ghost\.Id\]\)or 0,0,3\)/);
 assert.match(lobby,/SelectedLobbyMap/);
 assert.match(lobby,/self\.selectMap and self\.selectMap\(p,map\.Id\)/);
 assert.match(server,/local function selectLobbyMap\(p,value\)/);
 assert.match(server,/pcall\(ManorLobby\.new,remote,selectLobbyMap\)/);
 assert.match(server,/if a==C\.Actions\.SELECT_MAP then\s*selectLobbyMap\(p,value\)/);
 assert.doesNotMatch(lobby,/SetAttribute\("GhostProgress"/);
 assert.doesNotMatch(lobby,/SetAttribute\("GhostCompleted"/);
});

test('personal manor visibility and visiting stay server-authoritative',()=>{
 assert.match(config,/SET_MANOR_VISIBILITY="SET_MANOR_VISIBILITY"/);
 assert.match(config,/VISIT_MANOR="VISIT_MANOR"/);
 assert.match(config,/RETURN_MANOR="RETURN_MANOR"/);
 assert.match(lobby,/function Manor:SetVisibility\(owner,value\)/);
 assert.match(lobby,/function Manor:Visit\(visitor,ownerUserId\)/);
 assert.match(lobby,/function Manor:ReturnHome\(visitor\)/);
 assert.match(lobby,/owner:GetAttribute\("ManorVisibility"\)~="PUBLIC"/);
 assert.match(lobby,/tonumber\(p:GetAttribute\("VisitedManorOwnerUserId"\)\)/);
 assert.match(lobby,/visitor~=p/);
 assert.match(server,/visitingManor\(p\)/);
 assert.match(server,/elseif a==C\.Actions\.SET_MANOR_VISIBILITY then/);
 assert.match(server,/elseif a==C\.Actions\.VISIT_MANOR then/);
 assert.match(server,/elseif a==C\.Actions\.RETURN_MANOR then/);
 assert.match(server,/local visitors=manorLobby:CloseVisitors\(p\)/);
 assert.match(ui,/저택 공개하기/);
 assert.match(ui,/저택 비공개로 전환/);
 assert.match(ui,/의 저택 방문/);
 assert.match(ui,/내 저택으로 돌아가기/);
 assert.doesNotMatch(lobby,/SetAttribute\("Coins"/);
 assert.doesNotMatch(lobby,/SetAttribute\("GhostCompleted"/);
});

test('personal manor exterior has signature housing and collection architecture',()=>{
 for(const token of [
  'ManorCrestShield','ArchivistTowerPlinth','ArchivistTowerBase','ArchivistTowerUpper','ArchivistTowerRoof','ArchivistSpire',
  'MortuaryLoadingPlinth','MortuaryLoadingDoor','MortuaryPortalArch','MortuaryLoadingCanopy','CoffinRail','CoffinTrolleyDeck',
  'MortimerServicePlinth','MortimerServiceDoor','MortimerServiceCanopy','MortimerServiceWindow','ServiceWoodRack','UmbrellaStand',
  'CryptFacade','CryptDoorRecess','CryptGateBar','CryptArch','CryptPediment','CryptRetainingWall','CryptDrain',
  'GreenhouseFoundation','GreenhouseBrickPlinth','GreenhouseRoofRib','GreenhouseSideGlass','GreenhouseEndArch','GreenhouseDoor','GreenhouseRidge',
  'PorchStep','PorchPlinth','PorchColumn','PorchGableTrim','PorchLantern',
  'FrontGutter','RainPipe',
  'RareCaseGlass_','RareCasePlaque_','RareCaseCornice_','RareRelic_',
  'MapMasterpiece_SCHOOL','MapMasterpiece_HOSPITAL','MapMasterpiece_THEME_PARK','CompletionDaisStone_','CompletionDaisBrass_',
  'GalleryFrameBack_','GalleryFrameLiner_','GalleryFrameCornice_','GallerySetFrame_','GallerySet_',
  'FireplaceFeatureFrame','FireplaceFeatureCrown','FireplaceFeature_','PortraitGalleryRail',
  'WingGutter','WingRainPipe','WingStoneWeathering','CentralRoofRidge','RoofFinial','ApproachWaystone',
  'ServiceConsoleMortimer','RecordIndexCabinet','MortuaryMeasureRack',
  'BoardedWingWindow','FacadeCrack','FacadeVine','CollectionViewingBenchSeat','CollectionSideRail',
  'ServiceKeyRing','RecordInkPot','RecordQuill','MortuaryScissors','GrandCeilingCoffer','GrandCeilingBoss','GrandCeilingCorbel',
  'HalloweenPumpkinLobe','JackEye','JackMouth','GargoyleBody','GargoyleWing','HalloweenSkull','HalloweenWaxDrip',
  'LivingCurtain','LivingVineTip','LivingBranch','BackdropCloud','BackdropMist','BackdropBat','BackdropChapel','BackdropGrave','PaperMoonHalo',
  'WindowBatCrest','WindowBatGem','RoofThorn','WingRoofThorn','HallBatMedallion','HallBatGem','GalleryThorn','JackGlowEye','JackGlowMouth',
  'DoorBatCrest','DoorBatGem','EaveThorn','EaveBracket',
  'BackdropFencePost','BackdropFenceSpike','BackdropFenceRailA','BackdropPineTrunk','BackdropPineCrown',
  'ForegroundThornArch','ForegroundThornTwig'
 ])assert.match(manorBuild,new RegExp(token));
 for(const room of ['ArchiveRoom','LibraryRoom','ParlorRoom','MortuaryRoom','WardrobeRoom','LoungeRoom'])assert.match(manorBuild,new RegExp("'"+room+"'"));
 assert.match(manorBuild,/room_accent=\{/);
 assert.match(manorBuild,/name\+'WallPanel'/);
 assert.match(manorBuild,/name\+'CeilingRose'/);
 assert.match(manorBuild,/name\+'TallArchive'/);
 assert.match(manorBuild,/name\+'ReadingChair'/);
 assert.match(manorBuild,/name\+'DisplayCoffin'/);
 assert.match(manorBuild,/name\+'WardrobeA'/);
 assert.match(manorBuild,/name\+'Sofa'/);
 assert.match(manorBuild,/name\+'PendantGlass'/);
 assert.match(manorBuild,/name\+'ReadingLampShade'/);
 assert.match(manorBuild,/name\+'WallCameo'/);
 assert.match(manorBuild,/name\+'LampCage'/);
 assert.match(manorBuild,/name\+'VanityMirror'/);
 assert.match(manorBuild,/name\+'GramophoneHorn'/);
 assert.doesNotMatch(manorBuild,/ButlerServiceConsole|ArchivistIndexCabinet|UndertakerMeasureRack|ButlerKeyRing|ArchivistInkPot|UndertakerScissors/);
 assert.match(manorBuild,/GrandCeilingCoffer/);
 assert.match(manorBuild,/GrandCeilingBoss/);
 assert.match(manorBuild,/GrandCeilingCorbel/);
 assert.match(manorBuild,/CeilingBeamX'\+str\(x\),\(x,30\.0,-31\)/);
 assert.match(manorBuild,/CeilingBeamZ'\+str\(z0\),\(0,29\.85,z0\)/);
 assert.match(manorBuild,/GrandCeilingCoffer'\+str\(row\)\+'_'\+str\(col\),\(x0,29\.36,z0\)/);
 assert.match(manorBuild,/ridge_points=\[\]/);
 assert.match(manorBuild,/ridge_y=54\.0\+\(1\.0-z0\)\*\(4\.0\/68\.0\)/);
 assert.match(manorBuild,/s\.curve_tube\('CentralRoofRidge',ridge_points/);
 assert.doesNotMatch(manorBuild,/CentralRoofRidge',\[\(-7,42,-62\),\(-7,44,-35\),\(-7,42,-7\)\]/);
 assert.match(manorBuild,/roof=\[/);
 assert.match(manorBuild,/\[-61,35,-67\],\[-61,35,1\]/);
 assert.match(manorBuild,/\[0,58,-67\],\[0,54,1\]/);
 assert.match(manorBuild,/\[61,35,-67\],\[61,35,1\]/);
 assert.match(manorBuild,/roof_faces=\[/);
 assert.match(manorBuild,/\[0,2,3,1\]/);
 assert.match(manorBuild,/\[2,4,5,3\]/);
 assert.match(manorBuild,/UpperWingWallCap'\+str\(side\)\+'_'\+str\(gate\),\(side\*54,23\.0,z0\),\(1\.5,18\.0,8\.6\)/);
 assert.match(manorBuild,/name\+'CeilingBeam'\+str\(beam\),\(x,16\.8,z\+beam\)/);
 assert.doesNotMatch(manorBuild,/CeilingBeamX'\+str\(x\),\(x,24\.0,-31\)/);
 assert.doesNotMatch(manorBuild,/roof=\[\[-61,25,-67\],\[61,25,-67\]/);
 assert.doesNotMatch(manorBuild,/\[-7,52,-67\],\[-7,48,1\]/);
 assert.match(manorBuild,/다크카툰 고딕 스타일 락/);
 assert.match(manorBuild,/'purple':\(\.135,\.050,\.205\)/);
 assert.match(manorBuild,/'pumpkin':\(\.58,\.145,\.018\)/);
 assert.match(manorBuild,/or 'Flame' in o\.name/);
 assert.doesNotMatch(manorBuild,/s\.lathe\('LeftTurret'/,'Archivist tower replaces the old duplicate left turret');
 assert.match(manorBuild,/for step in range\(5\)/);
 assert.match(manorBuild,/for i,outline in enumerate\(crest_shapes\)/);
 assert.match(manorBuild,/s\.prism\('ManorCrestSegment'\+str\(i\+1\)/);
 assert.match(manorBuild,/for name,x,z in \[\('SCHOOL',-30,35\),\('HOSPITAL',30,35\),\('THEME_PARK',45,54\)\]/);
 assert.match(manorBuild,/s\.box\('CollectionPlinth_'\+name/);
 assert.match(lobby,/ManorCrestSegment"\.\.i/);
 assert.match(lobby,/local reached=completed>=i\*2/);
 assert.match(lobby,/PorchStepGround/);
 assert.match(lobby,/EntranceWalkwayGround/);
 assert.match(lobby,/PersonalSpawn";spawn\.Position=origin\+Vector3\.new\(0,\.55,60\)/);
 assert.match(lobby,/return room\.origin\+Vector3\.new\(0,3,60\),room\.origin\+Vector3\.new\(0,5,-2\),room\.spawn/);
 assert.doesNotMatch(lobby,/SecondFloorGroundRear/);
 assert.doesNotMatch(lobby,/SecondFloorGroundSide/);
 assert.doesNotMatch(lobby,/SecondFloorStairLandingGround/);
 assert.doesNotMatch(lobby,/StairwellRailBoundary/);
 assert.doesNotMatch(lobby,/GalleryFrontRailBoundary/);
 assert.doesNotMatch(lobby,/SecondFloorGround",origin\+Vector3\.new\(/);
 assert.match(manorBuild,/UpperWingWallCap/);
 assert.match(manorBuild,/SecondFloorGallerySide/);
 assert.match(manorBuild,/SecondFloorGalleryApron'\+str\(side\),\(side\*25\.25,9\.72,-45\.62\),\(18\.5,1\.02,\.48\)/);
 assert.match(manorBuild,/SecondFloorStairLanding',\(0,10\.05,-57\.0\),\(32\.5,\.35,4\.5\)/);
 assert.match(manorBuild,/GalleryStairNewel/);
 assert.match(manorBuild,/GalleryCorridorNewel/);
 assert.match(manorBuild,/\(-1,\[-34,-31,-28,-25,-22,-19,-16\]\),\(1,\[16,19,22,25,28,31,34\]\)/);
 assert.doesNotMatch(manorBuild,/range\(-42,-15,4\)/);
 assert.doesNotMatch(manorBuild,/range\(18,43,4\)/);
 assert.doesNotMatch(manorBuild,/s\.box\('SecondFloorGallery',\(0,10\.2,-55\),\(92,\.55,19\),c\['wood'\]\)/);
 assert.match(lobby,/d\.CanCollide=false;d\.CanTouch=false;d\.CanQuery=false/);
 assert.match(lobby,/mesh\.CanCollide=false;mesh\.CanTouch=false;mesh\.CanQuery=false/);
 assert.doesNotMatch(lobby,/mesh\.Name=="CrookedRoof"\)then\s*mesh\.CanCollide=true/);
 assert.match(lobby,/local nearDoor=math\.abs\(localPos\.X\)<18 and localPos\.Z> -24 and localPos\.Z<24/);
 assert.match(lobby,/MortuaryLoadingPlatformGround/);
 assert.match(lobby,/GreenhouseBoundary/);
 assert.match(lobby,/44\.3,5\.6,69,1,9\.2,17\.5/);
 assert.match(lobby,/57,5\.6,60\.25,25\.5,9\.2,1/);
 assert.match(lobby,/-62\.2,2\.1,66\.0,1\.2,4\.2,8\.6/);
 assert.match(manorBuild,/WindowRecess/);
 assert.match(manorBuild,/WindowJamb/);
 assert.match(manorBuild,/WindowCurtainL/);
 assert.match(manorBuild,/EntryDoorPanelFrame/);
 assert.match(manorBuild,/EntryDoorKnocker/);
 assert.match(manorBuild,/ManorNamePlaque/);
 assert.match(manorBuild,/LeaningChimneyBase/);
 assert.match(manorBuild,/SecondaryChimneyPot/);
 assert.match(manorBuild,/UnderEyeCrease/);
 assert.match(manorBuild,/Nasolabial/);
 assert.match(manorBuild,/Nostril/);
 assert.match(lobby,/\(tonumber\(ghost\.Weight\)or math\.huge\)<=58/);
 assert.match(lobby,/namedParts\(scene,"RareRelic_"\.\.ghost\.Id\)/);
 assert.match(lobby,/local rareCaseZ=\{KRASUE=-58\.8,WHITE_LADY=-55\.1,PONTIANAK=-51\.4,BLACK_SHUCK=-47\.7\}/);
 assert.match(lobby,/surface\.Name="RareCaseLabelGui"/);
 assert.match(lobby,/text\.Text="희귀 기록 · "\.\.ghost\.Name/);
 assert.match(lobby,/Vector3\.new\(-70\.0,5\.0,-56\.8\),\.55,12,false/);
 assert.match(lobby,/Vector3\.new\(-58,8,-54\),\.72,16,false,Color3\.fromRGB\(244,203,154\)/);
 assert.match(lobby,/Vector3\.new\(58,8,-33\),\.72,16,false,Color3\.fromRGB\(248,188,165\)/);
 assert.match(lobby,/Vector3\.new\(0,34,-5\),\.42,24,Color3\.fromRGB\(169,187,217\)/);
 assert.match(lobby,/WingFurnitureBoundary/);
 assert.match(lobby,/-69,4,-58\.8,4\.5,8,3\.8/);
 assert.match(lobby,/69,4\.2,-37\.8,4\.5,8\.5,3\.8/);
 assert.match(lobby,/namedParts\(scene,"FireplaceFeature_"\.\.ghost\.Id\)/);
 assert.match(ui,/name:match\("Flame"\)/);
 assert.match(ui,/local phase=row\.home\.Position\.X\*\.37\+row\.home\.Position\.Z\*\.19/);
 assert.match(ui,/local function npcRole\(name\)/);
 assert.match(ui,/local function npcHeadPart\(name\)/);
 assert.match(ui,/role=="BUTLER"/);assert.match(ui,/role=="UNDERTAKER"/);assert.match(ui,/role=="ARCHIVIST"/);
 assert.match(ui,/headSum=Vector3\.zero,headCount=0/);
 assert.match(ui,/group\.headPivot=group\.headCount>0 and group\.headSum\/group\.headCount or group\.pivot/);
 assert.match(ui,/local blinkPeriod=role=="BUTLER"and 5\.8 or role=="UNDERTAKER"and 7\.1 or 4\.6/);
 assert.match(ui,/local attention=\(now\+phase\*2\.3\)%\(role=="ARCHIVIST"and 8\.5 or 10\.8\)/);
 assert.match(ui,/local headTransform=around\(group\.headPivot/);
 assert.match(ui,/local blinkPeriod=role=="BUTLER"and 5\.8 or role=="UNDERTAKER"and 7\.1 or 4\.6/);
 assert.match(ui,/local blinkCycle=\(now\+phase\*1\.7\)%blinkPeriod/);
 assert.match(ui,/row\.name:match\("_Iris"\)or row\.name:match\("_Pupil"\)/);
 assert.match(ui,/row\.name:match\("_UpperLid"\)/);assert.match(ui,/row\.name:match\("_LowerLid"\)/);
 assert.match(ui,/row\.name:match\("Tray"\)/);assert.match(ui,/row\.name:match\("Ledger"\)/);
 assert.match(ui,/row\.name:match\("PocketWatch"\)/);
 assert.match(ui,/local pageBeat=role=="ARCHIVIST"/);
 assert.match(ui,/row\.name:match\("_Hand"\)or row\.name:match\("_Finger"\)or row\.name:match\("_Thumb"\)/);
 assert.match(ui,/VisitedManorOwnerUserId/);assert.match(ui,/PersonalManor_"\.\.ownerId/);
 assert.match(ui,/LivingCurtain/);assert.match(ui,/LivingVineTip/);assert.match(ui,/LivingBranch/);
 assert.match(ui,/BackdropCloud/);assert.match(ui,/BackdropMist/);assert.match(ui,/BackdropBat/);
 assert.match(ui,/ChandelierPearDrop/);assert.match(ui,/PaperMoonHalo/);
 assert.match(ui,/row\.light\.Brightness=row\.brightness\*\(1\+math\.sin/);
 assert.match(ui,/ArtbookStyle","DARK_CARTOON_GOTHIC_HALLOWEEN"/);
 assert.match(ui,/local purple=Color3\.fromRGB\(61,28,82\)/);
 assert.match(ui,/local function gothicCorners\(parent\)/);
 assert.match(ui,/mark\.Name="GothicCorner"/);
 assert.match(ui,/name:match\("\^JackGlow"\)/);
 assert.match(ui,/name:match\("\^GargoyleEye"\)/);
 assert.match(ui,/mesh\.Material=Enum\.Material\.Neon/);
 assert.match(ui,/local glow=\.10\+math\.sin\(now\*1\.35\+phase\)\*\.06/);
 assert.match(ui,/local wood=Color3\.fromRGB\(48,27,21\)/);
 assert.match(ui,/local layer=tonumber\(name:match\("\(%d\+\)\$"\)\)or 0/);
 assert.match(ui,/local speed=\.050\+layer\*\.010/);
 assert.match(ui,/local speed=\.060\+layer\*\.012/);
 assert.match(ui,/local flap=math\.sin\(now\*\(1\.65\+layer\*\.08\)\+phase\)/);
 assert.match(ui,/mesh\.CFrame=row\.home\+Vector3\.new\(math\.sin\(now\*4\.7\+phase\)\*\.018/);
 assert.match(lobby,/for _,prefix in ipairs\(\{"MapMasterpiece_","GallerySet_"\}\)do/);
 assert.doesNotMatch(lobby,/SetAttribute\("GhostCompleted"/);
 assert.doesNotMatch(lobby,/SetAttribute\("GhostProgress"/);
});

test('replacement lobby music has no old screaming source and is original instrumental',()=>{
 assert.doesNotMatch(config,/1843529635/);assert.match(config,/LobbyMusicId/);
 const m=JSON.parse(read(root+'/generated/music-evidence.json'));assert.equal(m.vocals,false);assert.equal(m.screams,false);assert.equal(m.originalComposition,true);assert.ok(m.durationSeconds>=60);
 assert.ok(fs.statSync(root+'/generated/manor-waltz.mp3').size>10000);
});
test('Blender export keeps exact bounds, materials and independently addressable NPCs',()=>{
 const e=JSON.parse(read(root+'/generated/build-evidence.json'));
 assert.match(e.generator,/Blender/);
 assert.equal(e.normalization.up,'Y');assert.equal(e.normalization.forward,'+Z');
 assert.equal(e.npcGeometry,'DIRECT_PROCEDURAL_ROLE_SPECIFIC_CONTINUOUS_SURFACE_V4');
 assert.ok(!e.reusedOriginals.some(x=>/bride/i.test(x)),'Lobby NPCs must not reuse the bride head/body');
 for(const row of e.models){
  const b=fs.readFileSync(root+'/generated/'+row.file);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),row.sha256);
  if(/^(butler|undertaker|archivist)\.glb$/.test(row.file)){
   assert.ok(row.meshes>=75,row.file+' role mesh layer count regressed below high-detail baseline');
   assert.ok(row.triangles>=15000,row.file+' face/body detail regressed below high-detail baseline');
  }
 }
 const b=fs.readFileSync(root+'/generated/manor-lobby.glb');
 const d=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 assert.ok(d.nodes.some(n=>n.name==='Undertaker'));
 assert.ok(!d.nodes.some(n=>n.name?.includes('Icosphere')),'Blender bone display shapes must not enter the runtime asset');
 const triangles=d.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+d.accessors[p.indices].count/3,0);
 assert.ok(triangles>=250000,'Presentation geometry regressed below the approved high-detail baseline');
 console.log('MANOR_PRESENTATION_TRIANGLES='+triangles);
 const bounds=JSON.parse(read(root+'/generated/import-bounds.json'));
 assert.ok(bounds.width>=150,'Expanded manor width is too small: '+bounds.width);assert.ok(bounds.center.every(Number.isFinite));
 assert.ok(d.meshes.length>=500,"Scene layer density regressed below the approved dark-cartoon-gothic quality baseline");
 console.log('MANOR_PRESENTATION_MESHES='+d.meshes.length);
 for(const m of d.materials)assert.ok(m.pbrMetallicRoughness?.baseColorTexture,"Every exported material needs an import-safe color texture");
 assert.match(lobby,/Vector3\.new\(0,3,60\)/);
 assert.match(lobby,/Vector3\.new\(5,4,-9\)/);
 if(!cloudOwnerBuild){
  const review=JSON.parse(read(root+'/generated/review/evidence.json'));
  assert.equal(review.sharedBrideHeadUsedForNPCs,false);
  assert.equal(review.npcRoleSpecificGeometry,true);
  for(const kind of ['butler','undertaker','archivist']){
   const files=review.npcReviewFiles?.[kind]||[];
   assert.equal(files.length,3,kind+' must have front/three-quarter/full-body review renders');
   for(const file of files){
    const stat=fs.statSync(root+'/generated/review/'+file);
    assert.ok(stat.size>10000,file+' preview is too small to be useful evidence');
   }
  }
 }else{
  assert.ok(d.nodes.some(n=>n.name==='ButlerHead'));
  assert.ok(d.nodes.some(n=>n.name==='UndertakerHead'));
  assert.ok(d.nodes.some(n=>n.name==='ArchivistHead'));
  assert.match(manorBuild,/grip_profiles=\{/);
  assert.match(manorBuild,/Butler_PocketWatchChain/);
  assert.match(manorBuild,/Undertaker_HighCollar/);
  assert.match(manorBuild,/Archivist_LedgerPage/);
 }
});
