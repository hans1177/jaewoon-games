import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root='roblox-games/daechung-rpg/';
const server=fs.readFileSync(root+'server/Game.server.luau','utf8');
const style=fs.readFileSync(root+'shared/VisualStyle.luau','utf8');
const client=fs.readFileSync(root+'client/Game.client.luau','utf8');

test('NPC native IDs resolve to preserved licensed repository masters, not invented assets',()=>{
 const registry=JSON.parse(fs.readFileSync('company-asset-library.json'));
 const block=style.slice(style.indexOf('NpcModels='),style.indexOf('Biomes='));
 const ids=[...new Set([...block.matchAll(/\b\d{6,}\b/g)].map(row=>row[0]))];
 assert.ok(ids.length>=10);
 for(const id of ids){
  const asset=registry.assets.find(row=>String(row.robloxAssetId)===id);
  assert.ok(asset,'registered native ID '+id);
  assert.equal(asset.companyCommonBase,true);
  assert.equal(asset.license,'CC0-1.0');
  const bytes=fs.readFileSync(asset.masterGlb);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.platformVariants.ROBLOX.sha256);
  assert.equal(asset.productionVerified,false,'registration is not runtime quality');
 }
});

test('native NPC presentation keeps failed imports visible and retains original interaction/authority roots',()=>{
 const body=server.slice(server.indexOf('local function bindNativeNpcVisual('),server.indexOf('local function label('));
 assert.ok(body.indexOf('native.Parent=rootPart')<body.indexOf('part.Transparency=1'));
 assert.match(body,/NativeActorFailureStage/);
 assert.match(body,/NativeActorFailureSignature/);
 assert.match(body,/NativeActorBindingState","BOUND_UNVERIFIED/);
 assert.match(body,/pivot.CanCollide=false;pivot.CanTouch=false;pivot.CanQuery=false;pivot.Massless=true/);
 assert.match(body,/part.Anchored=false;part.CanCollide=false;part.CanTouch=false;part.CanQuery=false;part.Massless=true/);
 assert.match(body,/pose.Part0=rootPart;pose.Part1=pivot/,'native actor retains an animated Motor6D from the gameplay root');
 assert.match(body,/joint.Part0=pivot;joint.Part1=part/,'source parts follow the visual motion pivot');
 assert.match(body,/MotionRetargetReview","PENDING/);
 assert.doesNotMatch(body,/Health|Damage|Reward|SetAsync|UpdateAsync|FireServer/);
 const config=fs.readFileSync(root+'shared/GameConfig.luau','utf8');
 for(const theme of [...config.matchAll(/Theme="([A-Z]+)"/g)].map(row=>row[1]))assert.ok(style.includes(theme+'={'));
 assert.match(client,/GetAttributeChangedSignal\("CurrentZone"\):Connect\(applyBiomePresentation\)/);
 assert.match(server,/elseif z.Id~=1 and occupants==0 then/);
});

test('actual Luau biome generator reproduces seeds, varies new runs, protects paths and discards stale loading',{skip:!process.env.VIBE2_LUAU_BINARY},()=>{
 const start=server.indexOf('local function decorateZoneAssets(');
 const end=server.indexOf('local function bindNativeNpcVisual(',start);
 const source=server.slice(start,end);
 const harness=`
local vec={}
vec.__index=vec
function vec.__add(a,b)return Vector3.new(a.X+b.X,a.Y+b.Y,a.Z+b.Z)end
function vec.__mul(a,b)return Vector3.new(a.X*b,a.Y*b,a.Z*b)end
Vector3={new=function(x,y,z)return setmetatable({X=x,Y=y,Z=z},vec)end}
Random={new=function(seed)
 local state=seed%2147483647
 local r={}
 function r:NextNumber(low,high)state=(state*48271)%2147483647;return low+(high-low)*state/2147483647 end
 function r:NextInteger(low,high)return math.floor(self:NextNumber(low,high+1))end
 return r
end}
local created={}
Instance={new=function(class)
 local row={attributes={}}
 function row:SetAttribute(k,v)self.attributes[k]=v end
 function row:Destroy()self.destroyed=true;self.Parent=nil end
 table.insert(created,row);return row
end}
local task={jobs={}}
function task.spawn(fn)table.insert(task.jobs,fn)end
local function drain()local jobs=task.jobs;task.jobs={};for _,fn in ipairs(jobs)do fn()end end
local game={PlaceVersion=38}
local Style={Biomes={MEADOW={Nature={'tree','flower'},Structure={'rock','log'}}}}
local ASSETS={Nature=1,Dungeon=2}
local biomeRunState={}
local recorded={}
local function assetProp(parent,id,keys,pos,scale,seed,collide)
 local row={Size=Vector3.new(32,20,10),Position=pos,attributes={}}
 function row:SetAttribute(k,v)self.attributes[k]=v end
 table.insert(recorded,{parent=parent,id=id,pos=pos,scale=scale,seed=seed,collide=collide,part=row})
 return row
end
${source}
local parent={Parent=true,attributes={}}
function parent:SetAttribute(k,v)self.attributes[k]=v end
function parent:FindFirstChild(name)
 for _,row in ipairs(created)do if row.Name==name and row.Parent==self and not row.destroyed then return row end end
 return nil
end
local zone={Id=1,Theme='MEADOW',Center=Vector3.new(0,2,0)}
local function signature()
 local rows={}
 for _,row in ipairs(recorded)do
  assert(row.collide==false)
  assert(math.abs(row.pos.X)>=30)
  assert(math.abs(row.pos.X)<210 and math.abs(row.pos.Z)<210)
  assert(not(math.abs(row.pos.X)<66 and row.pos.Z> -140 and row.pos.Z< -38))
  assert(math.max(row.part.Size.X,row.part.Size.Y,row.part.Size.Z)<=24.001)
  assert(math.abs(row.part.Position.Y-row.part.Size.Y/2-3)<.001)
  table.insert(rows,string.format('%.4f,%.4f,%.4f,%d',row.pos.X,row.pos.Z,row.scale,row.seed))
 end
 assert(#rows==34)
 return table.concat(rows,'|')
end
decorateZoneAssets(parent,zone,12345);drain();local first=signature()
recorded={};decorateZoneAssets(parent,zone,12345);drain();assert(signature()==first)
recorded={};decorateZoneAssets(parent,zone,23456);drain();assert(signature()~=first)
recorded={};decorateZoneAssets(parent,zone,333);decorateZoneAssets(parent,zone,444);drain()
local live=0
for _,row in ipairs(created)do if row.Parent==parent and not row.destroyed then live+=1;assert(row.attributes.BiomeGenerationSeed==444)end end
assert(live==1)
assert(parent.attributes.NativeBiomeVisualReview=='PENDING')
print('BIOME_GENERATION_UNIT_PASS_NOT_RUNTIME_RENDER_PASS')
`;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rpg-biome-'));
 try{const file=path.join(dir,'test.luau');fs.writeFileSync(file,harness);const result=spawnSync(process.env.VIBE2_LUAU_BINARY,[file],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr||result.stdout);}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('NPC runtime load errors are deduplicated and stage-classified',()=>{
 assert.match(server,/local assetLoadFailures=\{\}/);
 assert.match(server,/if not assetLoadFailures\[id\]then/);
 assert.match(server,/NPC_ASSET_LOAD_FAILURE assetId=/);
 assert.match(server,/FAILURE_STAGE=ROBLOX_NATIVE_ASSET_LOAD/);
 assert.match(server,/return nil,signature/);
});
