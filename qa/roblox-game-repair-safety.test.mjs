import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const read=file=>fs.readFileSync(file,'utf8');
const cozy=read('roblox-games/cozy-island/server/Game.server.luau');
const village=read('roblox-games/village-dungeons/server/Game.server.luau');
const luau=process.env.VIBE2_LUAU_BINARY;
function runLuau(source){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'game-repair-'));
 try{
  const file=path.join(temp,'check.luau');fs.writeFileSync(file,source);
  const result=spawnSync(luau,[file],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}

test('cozy preserves existing progress after read failures and reports failed writes',{skip:!luau},()=>{
 const source=cozy.slice(cozy.indexOf('local function init(p)'),cozy.indexOf('\nlocal H={'));
 assert.ok(source.includes('local function save(p)'));
 runLuau(`
local C={InitialState={Coins=0,Wood=5}}
local dataLoaded={}
local function hum()return nil end
local function msg(p,text)p:SetAttribute('LastActivity',text)end
local p={UserId=77,Parent=true,attributes={}}
function p:SetAttribute(k,v)self.attributes[k]=v end
function p:GetAttribute(k)return self.attributes[k]end
local saved={Coins=80,Wood=12,SupportReady=true,FutureField='keep'}
local readsFail,writesFail,corrupt,newPlayer=true,false,false,false
local writes=0
local store={}
function store:GetAsync(key)
 assert(key=='p:77')
 if readsFail then error('temporary read outage')end
 if corrupt then return 'invalid record' end
 if newPlayer then return nil end
 return saved
end
function store:UpdateAsync(key,update)
 assert(key=='p:77');writes+=1
 if writesFail then error('temporary write outage')end
 saved=update(saved)
end
${source}
assert(load(p)==false)
assert(save(p)==false and writes==0 and saved.Coins==80)
readsFail=false;corrupt=true
assert(load(p)==false and save(p)==false and writes==0)
corrupt=false
assert(load(p)==true and p:GetAttribute('Coins')==80 and p:GetAttribute('SupportReady')==true)
p:SetAttribute('Coins',81)
assert(save(p)==true and saved.Coins==81 and saved.FutureField=='keep')
writesFail=true
assert(save(p)==false and p:GetAttribute('SaveStatus')=='SAVE_FAILED')
writesFail=false;newPlayer=true
assert(load(p)==true and p:GetAttribute('Coins')==0)
assert(save(p)==true and saved.Coins==0)
`);
});

test('village creates anchored walkable ground before publishing its spawn',{skip:!luau},()=>{
 const source=village.slice(village.indexOf('local nativeFoundationSpawn ='),village.indexOf('local function bindNativeFoundationCharacter'));
 runLuau(`
local objects={}
local workspace={}
function workspace:FindFirstChild(name)return objects[name]end
local Enum={Material={Cobblestone='stone',Brick='brick'},SurfaceType={Smooth='smooth'}}
local Vector3={new=function(x,y,z)return{X=x,Y=y,Z=z}end}
local Color3={fromRGB=function(r,g,b)return{R=r,G=g,B=b}end}
local Instance={new=function(class)
 return setmetatable({ClassName=class},{__newindex=function(self,k,v)
  if k=='Parent' then
   assert(self.Anchored==true and self.CanCollide==true,'unsafe dynamic floor/spawn')
   if class=='SpawnLocation' then assert(objects.VillageGround,'spawn published before ground')end
   objects[self.Name]=self
  end
  rawset(self,k,v)
 end})
end}
${source}
assert(objects.NativeFoundationSpawn.Neutral==true)
assert(objects.VillageGround.Size.X>=80 and objects.VillageGround.Size.Z>=80)
assert(objects.VillageBoundary1 and objects.VillageBoundary4)
assert(objects.NativeFoundationSpawn.Position.Y-objects.NativeFoundationSpawn.Size.Y/2>=objects.VillageGround.Position.Y+objects.VillageGround.Size.Y/2)
`);
 assert.doesNotMatch(village,/character:SetAttribute\("MOVEMENT_CONFIRMED", true\)\s*end/);
 assert.match(village,/humanoid\.FloorMaterial ~= Enum\.Material\.Air/);
});

test('cozy touch actions fit their dock and popup with separate rows',()=>{
 const client=read('roblox-games/cozy-island/client/Game.client.luau');
 const camera=read('roblox-games/cozy-island/shared/QACamera.luau');
 const dock=Number(client.match(/controls.Size=UDim2.fromOffset\(196,(\d+)\)/)[1]);
 const popup=Number(client.match(/actionPopup.Size=UDim2.fromOffset\(252,(\d+)\)/)[1]);
 const height=Number(client.match(/b.Size=UDim2.fromOffset\(116,(\d+)\)/)[1]);
 const spacing=Number(client.match(/8\+line\*(\d+)/)[1]);
 assert.ok(height>=44&&spacing>=height+4&&8+spacing+height<=popup);
 assert.ok(dock>=height+12);
 assert.match(client,/tab.Size=UDim2.new\(.46,0,0,44\)/);
 assert.match(camera,/button.Size=UDim2.fromOffset\(58,44\)/);
});

test('village boots without local DataStore and never overwrites a failed load',{skip:!luau},()=>{
 const acquisition=village.slice(village.indexOf('local store\n'),village.indexOf('local Shared ='));
 const helpers=village.slice(village.indexOf('local function readNumber'),village.indexOf('local function scopeHandler1'));
 const loading=village.slice(village.indexOf('local function loadPlayer'),village.indexOf('remote.OnServerEvent:Connect'));
 const saving=village.slice(village.indexOf('Players.PlayerRemoving:Connect'),village.indexOf('-- native-foundation-sentinel-v1'));
 assert.ok(acquisition.includes('pcall('));
 runLuau(`
local DataStoreService={GetDataStore=function()error('local unpublished place')end}
${acquisition}
assert(store==nil)
local Config={InitialState={Score=0,Coins=5}}
local p={UserId=42,Parent=true,attributes={}}
function p:SetAttribute(k,v)self.attributes[k]=v end
function p:GetAttribute(k)return self.attributes[k]end
local callbacks={}
local Players={PlayerAdded={Connect=function(_,f)callbacks.add=f end},PlayerRemoving={Connect=function(_,f)callbacks.remove=f end},GetPlayers=function()return{}end}
local lastAction={}
${helpers}
${loading}
${saving}
loadPlayer(p);assert(p:GetAttribute('SaveStatus')=='UNAVAILABLE' and p:GetAttribute('Score')==0)
callbacks.remove(p)
local writes=0;local failure=true;local corrupted=false
local saved={Score=90,Coins=30,FutureKey='keep'}
store={GetAsync=function(_,key)assert(key=='player:42');if failure then error('read outage')end;if corrupted then return 'bad record'end;return saved end,
 UpdateAsync=function(_,key,update)assert(key=='player:42');writes+=1;saved=update(saved)end}
loadPlayer(p);callbacks.remove(p);assert(writes==0 and saved.Score==90)
failure=false;corrupted=true;loadPlayer(p);callbacks.remove(p);assert(writes==0)
corrupted=false;loadPlayer(p);assert(p:GetAttribute('Score')==90)
p:SetAttribute('Coins',31);callbacks.remove(p);assert(writes==1 and saved.Coins==31 and saved.FutureKey=='keep')
`);
});

test('survival source boots without DataStore permission and preserves the original save key',{skip:!luau},()=>{
  const source=read('roblox-games/survival/server/Game.server.luau');
  const acquisition=source.slice(source.indexOf('local store\n'),source.indexOf('local Shared ='));
  assert.ok(acquisition.includes('survival-development-v1'));
  assert.ok(acquisition.includes('pcall('));
  runLuau(`
local warned={}
local function warn(value)table.insert(warned,value)end
local DataStoreService={GetDataStore=function()error('local DataStore unavailable')end}
${acquisition}
assert(store==nil and #warned==1)
assert(warned[1]=='SURVIVAL_DATASTORE_UNAVAILABLE')
`);
});

test('survival preserves saved resources and unknown world fields across DataStore outages',{skip:!luau},()=>{
  const source=read('roblox-games/survival/server/Game.server.luau');
  const helpers=source.slice(source.indexOf('local function readNumber'),source.indexOf('local function ensureWorldPart'));
  const load=source.slice(source.indexOf('local verifiedSaveRead = {}'),source.indexOf('remote.OnServerEvent:Connect'));
  const save=source.slice(source.indexOf('Players.PlayerRemoving:Connect(function(player)'),source.indexOf('-- native-foundation-sentinel-v1'));
  assert.ok(helpers.includes('local function initializePlayer'));
  assert.ok(load.includes('local function loadPlayer(player)'));
  assert.ok(save.includes('store:UpdateAsync'));
  runLuau(`
local Config={InitialState={ResourceWood=0,ResourceStone=0,Coins=0}}
local logs={}
local function warn(msg)table.insert(logs,msg)end
local callbacks={}
local Players={}
Players.PlayerAdded={Connect=function(_,fn)callbacks.add=fn end}
Players.PlayerRemoving={Connect=function(_,fn)callbacks.remove=fn end}
function Players:GetPlayers()return{}end
local p={Parent=Players,UserId=99,attributes={}}
function p:GetAttribute(k)return self.attributes[k]end
function p:SetAttribute(k,v)self.attributes[k]=v end
local lastAction={}
local worldObjectStates={}
-- 실제 서버 통신과 같은 메시지/참가자 계약을 검증하는 독립 네트워크 스텁.
local multiplayerSnapshots={}
local remote={}
function remote:FireAllClients(kind,snapshot)
 assert(kind=="MULTIPLAYER_SYNC" and type(snapshot)=="table")
 assert(snapshot.ParticipantCount==0 and type(snapshot.Participants)=="table")
 table.insert(multiplayerSnapshots,snapshot)
end
local function validResourceRule()return nil end
local recorded={ResourceWood=80,ResourceStone=30,Coins=10,FutureField='keep',
  WorldObjects={
    ['SURVIVAL:RESOURCE:WoodResourceNode']={health=4,depletedUntil=100,VersionTwoField='keep'},
    ['EXTRA:OBJECT']={future=true}
  }}
local writes=0
local readsFail=true
local corrupt=false
local writesFail=false
local store={}
function store:GetAsync(key)
 assert(key=='player:99')
 if readsFail then error('temporary read outage')end
 if corrupt then return 'invalid existing record'end
 return recorded
end
function store:UpdateAsync(key,update)
 assert(key=='player:99')
 writes+=1
 if writesFail then error('temporary write outage')end
 local changed=update(recorded)
 if changed~=nil then recorded=changed end
end
${helpers}
${load}
${save}
callbacks.add(p)
assert(p:GetAttribute('SaveLoadStatus')=='REPAIR_REQUIRED')
callbacks.remove(p)
assert(writes==0 and recorded.ResourceWood==80 and recorded.FutureField=='keep')
readsFail=false
corrupt=true
callbacks.add(p)
callbacks.remove(p)
assert(writes==0 and recorded.Coins==10)
corrupt=false
callbacks.add(p)
assert(p:GetAttribute('ResourceWood')==80 and p:GetAttribute('ResourceStone')==30)
p:SetAttribute('ResourceWood',81)
callbacks.remove(p)
assert(writes==1 and recorded.ResourceWood==81 and recorded.FutureField=='keep')
assert(recorded.WorldObjects['EXTRA:OBJECT'].future==true)
callbacks.add(p)
worldObjectStates[p]={['SURVIVAL:RESOURCE:WoodResourceNode']={health=2,depletedUntil=110}}
callbacks.remove(p)
assert(writes==2 and recorded.WorldObjects['SURVIVAL:RESOURCE:WoodResourceNode'].health==2)
assert(recorded.WorldObjects['SURVIVAL:RESOURCE:WoodResourceNode'].VersionTwoField=='keep')
assert(recorded.WorldObjects['EXTRA:OBJECT'].future==true)
callbacks.add(p)
writesFail=true
p:SetAttribute('ResourceStone',50)
callbacks.remove(p)
assert(writes==3 and recorded.ResourceStone==30)
assert(#multiplayerSnapshots>=10,"join/leave multiplayer sync must occur during save failure cases")
`);
});
