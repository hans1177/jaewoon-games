import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root='assets/roblox/common-materials-v1';
const source=fs.readFileSync(`${root}/RobloxCommonMaterials.luau`,'utf8');

test('acquired PBR channels match immutable source hashes, dimensions and normal convention',()=>{
 const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`));
 assert.equal(manifest.materials.length,21);
 assert.equal(manifest.productionVerified,false);
 let count=0;
 for(const material of manifest.materials){
  assert.equal(material.license,'CC0-1.0');
  assert.equal(material.normalConvention,'OPENGL_TANGENT_SPACE');
  assert.equal(material.productionVerified,false);
  for(const key of ['color','normal','roughness'])assert.ok(material.maps[key]);
  for(const [channel,map] of Object.entries(material.maps)){
   const bytes=fs.readFileSync(map.path);
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),map.sha256);
   assert.equal(bytes.subarray(1,4).toString(),'PNG');
   assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],map.dimensions);
   assert.equal(map.colorSpace,channel==='color'?'SRGB':'LINEAR');
   assert.ok(Math.max(...map.dimensions)<=1024);
   count++;
  }
 }
 assert.equal(count,manifest.mapCount);
});

test('all 44 game packages load byte-identical common materials',()=>{
 let count=0;
 for(const game of fs.readdirSync('roblox-games')){
  if(!fs.existsSync(`roblox-games/${game}/client/Game.client.luau`))continue;
  assert.equal(fs.readFileSync(`roblox-games/${game}/shared/RobloxCommonMaterials.luau`,'utf8'),source);
  assert.match(fs.readFileSync(`roblox-games/${game}/client/MaterialPresentation.client.luau`,'utf8'),/Materials\.ApplyAuthoredSurface/);
  count++;
 }
 assert.equal(count,44);
});

test('material application preserves actor identity, physical behavior, opacity and authored mesh PBR',{skip:!process.env.VIBE2_LUAU_BINARY},()=>{
 const mock=`
local Enum={Material=setmetatable({},{__index=function(_,name)return{Name=name}end})}
local Color3={};function Color3.fromRGB(r,g,b)return{_type='Color3',R=r,G=g,B=b,Lerp=function(self,other,t)return t==1 and other or self end}end
local PhysicalProperties={new=function(d,f,e,fw,ew)return{Density=d,Friction=f,Elasticity=e,FrictionWeight=fw,ElasticityWeight=ew}end}
local function typeof(v)return type(v)=='table' and v._type or type(v)end
local variants={}
local game={GetService=function()return{FindFirstChild=function(_,name)return variants[name]end}end}
local M=(function()${source}\nend)()
local function part(name,material,class)
 local p={_type='Instance',ClassName=class or 'Part',Name=name,Material=Enum.Material[material],MaterialVariant='',TextureID='',Transparency=.27,Reflectance=0,Color=Color3.fromRGB(90,70,40),attrs={},CurrentPhysicalProperties=PhysicalProperties.new(2,.3,.1,50,30)}
 function p:IsA(c)return c=='BasePart' or self.ClassName==c end
 function p:FindFirstChildOfClass()return self.surface end
 function p:GetAttribute(k)return self.attrs[k]end
 function p:SetAttribute(k,v)self.attrs[k]=v end
 return p
end
local p=part('AxeHandle','Wood');p:SetAttribute('StudioAssetId','original-axe');p:SetAttribute('StudioAssetFamily','WEAPON')
local color=p.Color;assert(M.ApplyAuthoredSurface(p,'FANTASY'))
assert(p.Color==color and p.Material.Name=='Wood' and p.Transparency==.27)
assert(p.CustomPhysicalProperties.Density==2 and p.CustomPhysicalProperties.Friction==.3)
assert(p:GetAttribute('StudioAssetId')=='original-axe' and p:GetAttribute('StudioAssetFamily')=='WEAPON')
assert(p:GetAttribute('MaterialProductionVerified')==false and p:GetAttribute('PBRBindingState')=='NATIVE_VARIANT_REQUIRED')
local mesh=part('AuthoredKnight','Metal','MeshPart');mesh.surface={};assert(not M.ApplyAuthoredSurface(mesh,'FANTASY'))
mesh.surface=nil;mesh.TextureID='rbxassetid://123';assert(not M.ApplyAuthoredSurface(mesh,'FANTASY'))
local hidden=part('Hitbox','Metal');hidden.Transparency=1;assert(not M.ApplyAuthoredSurface(hidden,'HORROR'))
variants.Vibe_Wood_Wood062={BaseMaterial=p.Material,IsA=function(_,c)return c=='MaterialVariant'end}
assert(M.ApplyAuthoredSurface(p,'HORROR'));assert(p.MaterialVariant=='Vibe_Wood_Wood062')
assert(p:GetAttribute('PBRBindingState')=='NATIVE_VARIANT_BOUND_REVIEW_PENDING')
local preserved=part('CustomStone','Rock');preserved.MaterialVariant='GameSpecific';assert(not M.ApplyAuthoredSurface(preserved,'COZY'))
print('MATERIAL_BEHAVIOR_PASS')
`;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'material-qa-'));
 try{const file=path.join(dir,'test.luau');fs.writeFileSync(file,mock);const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[file],{encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.stdout);}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
