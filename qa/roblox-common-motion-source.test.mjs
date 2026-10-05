// Executes the actual authored Luau with a small pose/CFrame test double.
// This verifies source geometry and timing, never Roblox Animator/runtime quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const mock = String.raw`
local table = setmetatable({freeze = function(t) return t end}, {__index = table})
local Enum = setmetatable({}, {__index=function(t,k)
  local v=setmetatable({}, {__index=function(s,n) local e={Name=n}; rawset(s,n,e); return e end})
  rawset(t,k,v); return v
end})
local game = {GetService=function() return {} end}
local mt = {}
mt.__mul = function(a,b)
  local r={}
  for i=1,3 do for j=1,3 do
    local n=0
    for k=1,3 do n=n+a[(i-1)*3+k]*b[(k-1)*3+j] end
    r[(i-1)*3+j]=n
  end end
  for i=1,3 do
    r[9+i]=a[9+i]
    for k=1,3 do r[9+i]=r[9+i]+a[(i-1)*3+k]*b[9+k] end
  end
  return setmetatable(r,mt)
end
local CFrame = {}
CFrame.new = function(x,y,z) return setmetatable({1,0,0,0,1,0,0,0,1,x or 0,y or 0,z or 0},mt) end
CFrame.Angles = function(x,y,z)
  local sx,cx,sy,cy,sz,cz=math.sin(x),math.cos(x),math.sin(y),math.cos(y),math.sin(z),math.cos(z)
  return setmetatable({1,0,0,0,cx,-sx,0,sx,cx,0,0,0},mt)
    *setmetatable({cy,0,sy,0,1,0,-sy,0,cy,0,0,0},mt)
    *setmetatable({cz,-sz,0,sz,cz,0,0,0,1,0,0,0},mt)
end
local Instance={new=function(class)
  local o={ClassName=class,children={},attributes={}}
  function o:AddPose(p) table.insert(self.children,p) end
  function o:AddKeyframe(k) table.insert(self.children,k) end
  function o:SetAttribute(k,v) self.attributes[k]=v end
  return o
end}
local function encode(v)
  if type(v)=='string' then return string.format('%q',v) end
  if type(v)=='number' then assert(v==v and math.abs(v)<math.huge,'NONFINITE'); return string.format('%.12g',v) end
  if type(v)=='boolean' then return tostring(v) end
  if v==nil then return 'null' end
  local parts={}
  if #v>0 then for _,x in ipairs(v) do table.insert(parts,encode(x)) end; return '['..table.concat(parts,',')..']' end
  for k,x in pairs(v) do table.insert(parts,encode(k)..':'..encode(x)) end
  return '{'..table.concat(parts,',')..'}'
end
local function capture(sequence)
  local frames={}
  for _,f in ipairs(sequence.children) do
    local joints={}
    local function visit(p)
      joints[p.Name]={matrix=p.CFrame,weight=p.Weight,easing=p.EasingStyle and p.EasingStyle.Name or 'Linear'}
      for _,child in ipairs(p.children) do visit(child) end
    end
    for _,p in ipairs(f.children) do visit(p) end
    table.insert(frames,{time=f.Time,name=f.Name,joints=joints})
  end
  return {looped=sequence.Loop,priority=sequence.Priority.Name,frames=frames,attributes=sequence.attributes}
end
`;
const binary=process.env.VIBE2_LUAU_BINARY;
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-8,`${label}: ${a} != ${b}`);
const samePose=(a,b,label)=>{
  assert.deepEqual(Object.keys(a.joints).sort(),Object.keys(b.joints).sort());
  for(const joint of Object.keys(a.joints))a.joints[joint].matrix.forEach((v,i)=>near(v,b.joints[joint].matrix[i],label+':'+joint));
};
test('authored R15 poses preserve timing, root authority, loop seams and action handoffs', {skip:!binary&&'Set VIBE2_LUAU_BINARY; native Animator playback is a separate gate'},()=>{
  const source=fs.readFileSync(new URL('../assets/roblox/common-motion-v1/RobloxCommonMotion.luau',import.meta.url),'utf8');
  const catalog=JSON.parse(fs.readFileSync(new URL('../assets/roblox/common-motion-v1/catalog.json',import.meta.url),'utf8'));
  const script=mock+'\nlocal motion=(function()\n'+source+'\nend)()\nlocal out={}\nfor _,id in ipairs(motion.Audit().atoms) do out[id]=capture(motion.CreateSequence(id)) end\nprint(encode(out))';
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'common-motion-'));
  let data;
  try{
    const file=path.join(dir,'authored-motion.luau');fs.writeFileSync(file,script);
    const result=spawnSync(binary,[file],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});
    assert.equal(result.status,0,result.error?.message||result.stderr||result.stdout);
    data=JSON.parse(result.stdout.trim());
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
  assert.equal(Object.keys(data).length,61);
  for(const atom of catalog.atoms){
    const clip=data[atom.atomId];assert.ok(clip,atom.atomId);
    assert.equal(clip.looped,atom.looped);assert.equal(clip.priority,atom.priority);
    near(clip.frames[0].time,0,atom.atomId);near(clip.frames.at(-1).time,atom.duration,atom.atomId);
    for(const [i,frame] of clip.frames.entries()){
      if(i)assert.ok(frame.time>clip.frames[i-1].time,atom.atomId+' frame order');
      assert.equal(Object.keys(frame.joints).length,16);
      for(const joint of Object.values(frame.joints)){
        assert.equal(joint.matrix.length,12);assert.ok(joint.matrix.every(Number.isFinite));
      }
      assert.equal(frame.joints.HumanoidRootPart.weight,0);
      assert.deepEqual(frame.joints.HumanoidRootPart.matrix,[1,0,0,0,1,0,0,0,1,0,0,0]);
    }
    assert.equal(clip.attributes.ProductionVerified,false);
  }
  for(const id of ['IDLE_RELAXED','WALK','JOG','RUN','SPRINT','SLOPE_ASCEND','SLOPE_DESCEND','INJURED_WALK']){
    const frames=data[id].frames;samePose(frames[0],frames.at(-1),id+' loop');
  }
  for(const [from,to] of [['START','WALK'],['JUMP_START','LAND'],['LIGHT_ATTACK_1','LIGHT_ATTACK_1'],['HEAVY_ATTACK_1','HEAVY_ATTACK_1']]){
    samePose(data[from].frames.at(-1),data[to].frames[0],from+' -> '+to);
  }
  for(const [id,name,time] of [
    ['START','Commit',.42*.38],['STOP','Brake',.45*.48],['TURN_90','Pivot',.55*.45],
    ['JUMP_START','Takeoff',.38*.55],['LAND','Impact',.48*.35],['HIT_FRONT','Recoil',.52*.22],
    ['LIGHT_ATTACK_1','Impact',.46*.42],['HEAVY_ATTACK_1','HeavyImpact',.88*.58]
  ]){const event=data[id].frames.find(f=>f.name===name);assert.ok(event,id+':'+name);near(event.time,time,id+':'+name);}
  // Ground support and the swing phase must differ; calves must never bend backwards.
  for(const id of ['WALK','JOG','RUN','SPRINT']){
    const frames=data[id].frames;
    for(const side of ['Left','Right']){
      const bends=frames.map(f=>Math.atan2(f.joints[side+'LowerLeg'].matrix[7],f.joints[side+'LowerLeg'].matrix[4]));
      assert.ok(bends.every(x=>x<=1e-8&&x>-Math.PI*.8),id+':'+side+' knee');
      assert.ok(Math.max(...bends)-Math.min(...bends)>.2,id+':'+side+' swing clearance');
    }
  }
});
