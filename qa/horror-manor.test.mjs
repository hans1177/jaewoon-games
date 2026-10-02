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
const manorBuild=read(root+'/build.py');
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
 for(const name of ['ButlerHead','UndertakerHead','ArchivistHead'])assert.match(npcSource,new RegExp("kind\\+'Head'|"+name));
 assert.doesNotMatch(npcSource,/s\.ellipsoid\(kind\+'_Head'/);
 assert.doesNotMatch(npcSource,/s\.box\(kind\+'_CoatTail'/);
 assert.match(npcSource,/s\.sculpted_face\(kind\+'Head'/);
 assert.match(npcSource,/s\.curve_tube\(kind\+'_Leg'/);
 assert.match(npcSource,/s\.curve_tube\(kind\+'_Arm'/);
 assert.match(npcSource,/face_profiles=\{/);
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
 assert.match(manorBuild,/GhostRelic_YUREI/);
 assert.match(manorBuild,/GhostRelic_BLACK_SHUCK/);
 assert.match(manorBuild,/MapPin_SCHOOL/);
 assert.match(manorBuild,/MapPin_HOSPITAL/);
 assert.match(manorBuild,/MapPin_THEME_PARK/);
 assert.match(manorBuild,/MemoryRelic_SCHOOL/);
 assert.match(manorBuild,/MemoryRelic_HOSPITAL/);
 assert.match(manorBuild,/MemoryRelic_THEME_PARK/);
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
   assert.ok(row.meshes>=45,row.file+' role mesh layer count too low');
   assert.ok(row.triangles>=6000,row.file+' face/body detail too low');
  }
 }
 const b=fs.readFileSync(root+'/generated/manor-lobby.glb');
 const d=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 assert.ok(d.nodes.some(n=>n.name==='Undertaker'));
 assert.ok(!d.nodes.some(n=>n.name?.includes('Icosphere')),'Blender bone display shapes must not enter the runtime asset');
 const triangles=d.meshes.flatMap(m=>m.primitives).reduce((n,p)=>n+d.accessors[p.indices].count/3,0);
 assert.ok(triangles<200000,'Mobile geometry budget exceeded');
 const bounds=JSON.parse(read(root+'/generated/import-bounds.json'));
 assert.ok(bounds.width>=150,'Expanded manor width is too small: '+bounds.width);assert.ok(bounds.center.every(Number.isFinite));
 assert.ok(d.meshes.length<=350,"Mobile scene mesh budget exceeded");
 for(const m of d.materials)assert.ok(m.pbrMetallicRoughness?.baseColorTexture,"Every exported material needs an import-safe color texture");
 assert.match(lobby,/Vector3\.new\(0,3,60\)/);
 assert.match(lobby,/Vector3\.new\(5,4,-9\)/);
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
});
