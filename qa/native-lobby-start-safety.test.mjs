// 파일명: qa/native-lobby-start-safety.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const luau=process.env.VIBE2_LUAU_BINARY;
function run(source){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-lobby-'));
 try{
  const file=path.join(dir,'check.luau');fs.writeFileSync(file,source);
  const result=spawnSync(luau,[file],{encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
for(const id of ['amusement-tycoon','bug-defense']){
 const source=fs.readFileSync(`roblox-games/${id}/server/Game.server.luau`,'utf8');
 test(`${id}: unavailable local DataStore does not abort world creation`,{skip:!luau},()=>{
  const block=source.slice(source.indexOf('local store\n'),source.indexOf('local Shared ='));
  run(`local DataStoreService={GetDataStore=function()error('unpublished local place')end}\n${block}\nassert(store==nil)\nprint('BOOT_CONTINUES')`);
 });
 for(const existing of [false,true])test(`${id}: ${existing?'existing':'new'} spawn has fixed walkable ground and closed edges`,{skip:!luau},()=>{
  const block=source.slice(source.indexOf('local nativeFoundationSpawn ='),source.indexOf('local function bindNativeFoundationCharacter'));
  run(`
local Vector3={}
local vector={__add=function(a,b)return Vector3.new(a.X+b.X,a.Y+b.Y,a.Z+b.Z)end,__sub=function(a,b)return Vector3.new(a.X-b.X,a.Y-b.Y,a.Z-b.Z)end}
function Vector3.new(x,y,z)return setmetatable({X=x,Y=y,Z=z},vector)end
local objects={}
local workspace={FindFirstChild=function(_,name)return objects[name]end}
local Enum={Material={Concrete='concrete'}}
local Color3={fromRGB=function(r,g,b)return{r,g,b}end}
local Instance={new=function(class)
 return setmetatable({ClassName=class},{__newindex=function(self,k,v)
  if k=='Parent' then
   assert(self.Anchored==true and self.CanCollide==true,'unfixed collision object')
   if class=='SpawnLocation' then assert(objects.NativeLobbyGround,'spawn visible before floor')end
   objects[self.Name]=self
  end
  rawset(self,k,v)
 end})
end}
${existing?'objects.NativeFoundationSpawn={Name="NativeFoundationSpawn",Position=Vector3.new(24,8,12),Size=Vector3.new(8,1,8),Anchored=false,CanCollide=false}':''}
${block}
local ground=objects.NativeLobbyGround
local spawn=objects.NativeFoundationSpawn
assert(spawn.Anchored and spawn.CanCollide)
assert(ground.Size.X>=80 and ground.Size.Z>=80)
assert(ground.Position.X==spawn.Position.X and ground.Position.Z==spawn.Position.Z)
assert(ground.Position.Y+ground.Size.Y/2<=spawn.Position.Y-spawn.Size.Y/2)
for i=1,4 do assert(objects['NativeLobbyBoundary'..i].CanCollide)end
${existing?'assert(spawn.Position.X==24 and spawn.Position.Y==8 and spawn.Position.Z==12)':''}
`);
 });
 test(`${id}: movement evidence requires grounded motion`,()=>{
  assert.doesNotMatch(source,/SetAttribute\("MOVEMENT_CONFIRMED", true\)/);
  assert.match(source,/speed > 0\.1 and humanoid\.FloorMaterial ~= Enum\.Material\.Air/);
  assert.match(source,/FilterDescendantsInstances = \{character\}/);
 });
}
test('bootstrap source pins both generated and repaired spawns',()=>{
 const source=fs.readFileSync('tools/company-development-roblox-bootstrap.mjs','utf8');
 assert.match(source,/nativeFoundationSpawn\.Anchored = true\n  nativeFoundationSpawn\.CanCollide = true/);
 assert.ok(source.includes('foundationSpawn.Anchored = true\\n  foundationSpawn.CanCollide = true'));
});
