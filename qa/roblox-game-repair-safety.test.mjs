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
