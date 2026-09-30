import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root='assets/roblox/world-ghosts/';
const catalog=fs.readFileSync(root+'GhostSkinCatalog.luau','utf8');
const factory=fs.readFileSync(root+'GhostSkinFactory.luau','utf8');
const luau=process.env.VIBE2_LUAU_BINARY;
const native={skip:luau?false:'Official Luau binary not configured; Studio verification remains pending'};
function run(body){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ghost-skins-'));
  try{
    const file=path.join(dir,'test.luau');
    fs.writeFileSync(file,`local Catalog=(function()${catalog}\nend)()\nlocal script={Parent={WaitForChild=function()return 'catalog'end}}\nlocal require=function()return Catalog end\n${body}`);
    const result=spawnSync(luau,[file],{encoding:'utf8',timeout:20000,maxBuffer:12*1024*1024});
    assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));
    return result.stdout;
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}

test('100 internal skins have reproducible source and honest verification metadata',()=>{
  const result=spawnSync(process.execPath,[root+'generate-catalog.mjs','--check'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const registry=JSON.parse(fs.readFileSync('company-asset-library.json','utf8'));
  const pack=registry.assets.find(row=>row.id==='roblox-world-ghost-skins-v1');
  assert.equal(pack.skinCount,100);
  assert.equal(pack.productionVerified,false);
  assert.equal(pack.verifiedCompanyReusable,false);
  assert.deepEqual(pack.consumerGameIds,[]);
  assert.ok(pack.intendedConsumerGameIds.includes('horror-escape-room'));
  for(const file of pack.sourceFiles)assert.ok(fs.existsSync(file),file);
  const variants=registry.assets.filter(row=>row.packId===pack.id);
  assert.equal(variants.length,100);
  assert.equal(new Set(variants.map(row=>row.skinId)).size,100);
  for(const row of variants){assert.equal(row.productionVerified,false);assert.equal(row.verifiedCompanyReusable,false);}
});

test('all 300 LOD recipes have bounded geometry and distinct shapes, beyond recolors',native,()=>{
  const output=run(`
local Factory=(function()${factory}\nend)()
local forms={};local ids={};local maximum=0
assert(#Factory.List()==100)
for _,row in ipairs(Catalog)do
 assert(not ids[row.id]);ids[row.id]=true;forms[row.form]=true
 for _,quality in ipairs({'far','mid','near'})do
  local data=Factory.Describe(row.id,quality)
  assert(#data.parts>10 and #data.parts<=180,row.id);maximum=math.max(maximum,#data.parts)
  local names={}
  for _,part in ipairs(data.parts)do
   assert(not names[part.name],row.id..': duplicate part '..part.name);names[part.name]=true
   assert(data.bones[part.bone] and data.palette[part.color],row.id)
   for _,n in ipairs(part.size)do assert(n==n and n>0 and n<=30,row.id)end
   for _,n in ipairs(part.position)do assert(n==n and math.abs(n)<=30,row.id)end
   for _,n in ipairs(part.rotation)do assert(n==n and math.abs(n)<=720,row.id)end
   if quality=='mid' then
    print('SHAPE',row.id,part.shape,table.concat(part.size,','),table.concat(part.position,','),table.concat(part.rotation,','))
   end
  end
 end
 assert(#Factory.Describe(row.id,'far').parts<=#Factory.Describe(row.id,'mid').parts,row.id)
 assert(#Factory.Describe(row.id,'mid').parts<=#Factory.Describe(row.id,'near').parts,row.id)
end
local count=0;for _ in pairs(forms)do count+=1 end;assert(count==27)
assert(not pcall(Factory.Describe,'missing'))
assert(not pcall(Factory.Describe,'gumiho','ultra'))
print('MAX_PARTS',maximum)
`);
  const geometry=new Map();
  for(const line of output.trim().split('\n')){
    const [kind,id,...values]=line.split('\t');
    if(kind!=='SHAPE')continue;
    if(!geometry.has(id))geometry.set(id,[]);
    geometry.get(id).push(values.join('|'));
  }
  const identities=new Map();
  for(const [id,parts] of geometry){
    const signature=parts.sort().join(';');
    assert.ok(!identities.has(signature),`${id} duplicates geometry of ${identities.get(signature)}`);
    identities.set(signature,id);
  }
  assert.equal(identities.size,100);
});

test('native construction connects every cosmetic part and gallery paging destroys no game content',native,()=>run(`
local all={}
local methods={}
function methods:SetAttribute(key,value)self.attributes[key]=value end
function methods:PivotTo(value)self.pivot=value end
local function frame(x,y,z)
 local value={x=x or 0,y=y or 0,z=z or 0}
 function value:ToObjectSpace(other)return frame(other.x-self.x,other.y-self.y,other.z-self.z)end
 return setmetatable(value,{__mul=function(a,b)return frame(a.x+b.x,a.y+b.y,a.z+b.z)end})
end
local CFrame={new=frame,Angles=function()return frame()end}
local Vector3={new=function(x,y,z)return{x=x,y=y,z=z}end}
local Color3={fromRGB=function(...)return{...}end}
local Enum={PartType={Ball='Ball',Cylinder='Cylinder'},Material={Neon='Neon',SmoothPlastic='SmoothPlastic'}}
local Instance={new=function(class,parent)
 local object=setmetatable({ClassName=class,attributes={},Parent=parent},{__index=methods})
 table.insert(all,object);return object
end}
local Factory=(function()${factory}\nend)()
local parent={}
for _,row in ipairs(Catalog)do
 all={};local model=Factory.Create(row.id,{parent=parent})
 assert(model.Parent==parent and model.PrimaryPart.Anchored)
 assert(model.attributes.ProductionVerified==false and model.attributes.CosmeticSkinOnly)
 local joints=0;local welded={};local animator=0
 for _,object in ipairs(all)do
  assert(object.ClassName~='Script' and object.ClassName~='LocalScript' and object.ClassName~='Humanoid')
  if object.ClassName=='WeldConstraint' then assert(object.Part0.Parent==model and object.Part1.Parent==model);welded[object.Part1]=true end
  if object.ClassName=='Motor6D' then joints+=1;assert(object.Part0.Parent==model and object.Part1.Parent==model and object.C0 and object.C1)end
  if object.ClassName=='Animator' then animator+=1 end
  if object.ClassName=='Part' or object.ClassName=='WedgePart' then assert(not object.CanCollide and not object.CanTouch and not object.CanQuery and object.Massless)end
 end
 assert(joints==7 and animator==1,row.id)
 for _,object in ipairs(all)do
  if (object.ClassName=='Part' or object.ClassName=='WedgePart') and object.Transparency~=1 then assert(welded[object] and not object.Anchored,row.id)end
 end
end
for page=1,13 do
 all={};local gallery=Factory.CreateGallery(parent,page,'far');local count=0
 for _,object in ipairs(all)do if object.ClassName=='Model' then assert(object.Parent==gallery);count+=1 end end
 assert(count==(page==13 and 4 or 8));assert(gallery.Parent==parent)
end
assert(not pcall(Factory.CreateGallery,parent,0))
assert(not pcall(Factory.CreateGallery,parent,14))
assert(not pcall(Factory.CreateGallery,parent,1.5))
assert(not Factory.Create('dokkaebi',{anchored=false}).PrimaryPart.Anchored)
`));
