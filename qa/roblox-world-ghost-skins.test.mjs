import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root='assets/roblox/world-ghosts/';
const catalog=fs.readFileSync(root+'GhostSkinCatalog.luau','utf8');
const factory=fs.readFileSync(root+'GhostSkinFactory.luau','utf8');
const luau=process.env.VIBE2_LUAU_BINARY;
const native={skip:luau?false:'Official Luau binary not configured; Studio verification remains pending'};

test('native place and model contain the tested sources; package build never claims Studio success',()=>{
 const evidence=JSON.parse(fs.readFileSync(root+'native/build-evidence.json','utf8'));
 const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
 assert.equal(evidence.nativeStudioVerified,false);
 assert.equal(evidence.artVerified,false);
 assert.equal(evidence.gameplayVerified,false);
 for(const source of evidence.sources)assert.equal(hash(fs.readFileSync(root+source.file)),source.sha256,source.file);
 for(const artifact of evidence.artifacts){
  const xml=fs.readFileSync(root+'native/'+artifact.file,'utf8');
  assert.equal(hash(Buffer.from(xml)),artifact.sha256);
  assert.match(xml,/<roblox version="4">/);
  const modules=new Map();
  for(const match of xml.matchAll(/<Item class="(?:ModuleScript|LocalScript)"[^>]*>\s*<Properties>([\s\S]*?)<\/Properties>/g)){
   const properties=match[1];const name=properties.match(/<string name="Name">([^<]+)<\/string>/)?.[1];
   const source=properties.match(/<string name="Source"><!\[CDATA\[([\s\S]*?)\]\]><\/string>/)?.[1];
   modules.set(name,source);
  }
  for(const name of ['GhostSkinCatalog','GhostSkinFactory','GhostSkinMotion','GhostSkinAudit'])assert.equal(modules.get(name),fs.readFileSync(root+name+'.luau','utf8'),artifact.file+':'+name);
  if(artifact.file.endsWith('.rbxlx')){
   assert.equal(modules.get('GhostGallery'),fs.readFileSync(root+'Gallery.client.luau','utf8'));
   assert.equal(modules.size,5);
  }else assert.equal(modules.size,4);
 }
});

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
 local boneCount=0;for _ in pairs(Factory.Describe(row.id).bones)do boneCount+=1 end
 assert(joints==boneCount-1 and animator==1,row.id)
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

function runMotion(body){return run('local Factory=(function()'+factory+'\nend)()\nlocal Motion=(function()'+fs.readFileSync(root+'GhostSkinMotion.luau','utf8')+'\nend)()\n'+body);}
test("quadrupeds, spider legs, tail fans and wings have independent moving joints",native,()=>runMotion(`
local beast=Factory.Describe('kelpie')
for _,name in ipairs({'FrontLeftLeg','FrontRightLeg','BackLeftLeg','BackRightLeg'})do
 assert(beast.bones[name] and beast.bones[name].parent=='Torso')
 local found=false;for _,part in ipairs(beast.parts)do if part.name==name then assert(part.bone==name);found=true end end;assert(found)
end
local spider=Factory.Describe('jorogumo')
for i=1,4 do for _,side in ipairs({'Left','Right'})do
 local name='Spider'..side..i;assert(spider.bones[name].parent=='Torso')
 assert(spider.bones[name..'Knee'].parent==name)
end end
local fox=Factory.Describe('gumiho')
for i=1,9 do assert(fox.bones['TailFan'..i].parent=='Tail')end
local wing=Factory.Describe('tengu')
assert(wing.bones.LeftWing.parent=='Torso' and wing.bones.RightWing.parent=='Torso')
local mask=Factory.Describe('jangsanbeom');local visibleEyes=0
for _,part in ipairs(mask.parts)do if part.name:find('WHITE_MASK_MaskEye',1,true)then visibleEyes+=1 end end
assert(visibleEyes>=4)
local plain=Factory.Describe('egg-face')
for _,part in ipairs(plain.parts)do assert(not part.name:find('MaskEye',1,true))end
`));
test("100 skins have finite six-state poses; limbs alternate and motion never moves the root",native,()=>runMotion(`
for _,row in ipairs(Catalog)do
 local data=Factory.Describe(row.id)
 for _,state in ipairs(Motion.States)do for _,time in ipairs({0,.15,.35,.7,1.2,4})do
  local pose=Motion.Sample(data.form,data.bones,time,state)
  for name,values in pairs(pose)do
   assert(data.bones[name]);for _,value in pairs(values)do assert(type(value)=='number' and value==value and math.abs(value)<10)end
  end
  for _,value in pairs(pose.Root)do assert(value==0)end
 end end
end
local quadruped=Factory.Describe('kelpie')
local gait=Motion.Sample(quadruped.form,quadruped.bones,.2,'walk')
assert(gait.FrontLeftLeg.rx~=0 and gait.FrontLeftLeg.rx==-gait.FrontRightLeg.rx)
assert(gait.FrontLeftLeg.rx==gait.BackRightLeg.rx)
local spider=Factory.Describe('jorogumo')
local crawl=Motion.Sample(spider.form,spider.bones,.2,'walk')
assert(crawl.SpiderLeft1.ry~=crawl.SpiderLeft2.ry)
local endAttack=Motion.Sample('TALL',{Torso=true,LeftArm=true},1,'attack')
assert(math.abs(endAttack.LeftArm.rx)<.0001)
assert(not pcall(Motion.Sample,'TALL',{},0/0,'walk'))
assert(not pcall(Motion.Sample,'TALL',{},0,'teleport'))
`));
test("motion bindings restore rest transforms and dispose without background loops",native,()=>runMotion(`
local function frame(n)return setmetatable({n=n or 0},{__mul=function(a,b)return frame(a.n+b.n)end})end
CFrame={new=function(x,y,z)return frame((x or 0)+(y or 0)+(z or 0))end,Angles=function(x,y,z)return frame(x+y+z)end}
local joint={Name='FrontLeftLegJoint',Part1={Name='SkinFrontLeftLeg'},C0=frame(4),Parent={}}
function joint:IsA(name)return name=='Motor6D'end
local model={Parent={}}
function model:GetDescendants()return{joint}end
function model:GetAttribute()return'BEAST'end
local bound=Motion.Bind(model);local rest=joint.C0
bound.step(.2,'walk');assert(joint.C0.n~=rest.n)
bound.reset();assert(joint.C0==rest)
bound.step(.2,'chase');assert(joint.C0~=rest)
bound.destroy();assert(joint.C0==rest)
bound.step(2,'walk');assert(joint.C0==rest)
`));
