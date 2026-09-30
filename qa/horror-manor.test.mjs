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
test('replacement lobby music has no old screaming source and is original instrumental',()=>{
 assert.doesNotMatch(config,/1843529635/);assert.match(config,/LobbyMusicId/);
 const m=JSON.parse(read(root+'/generated/music-evidence.json'));assert.equal(m.vocals,false);assert.equal(m.screams,false);assert.equal(m.originalComposition,true);assert.ok(m.durationSeconds>=60);
 assert.ok(fs.statSync(root+'/generated/manor-waltz.mp3').size>10000);
});
