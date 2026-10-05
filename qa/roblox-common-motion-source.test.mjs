// Executes the actual authored Luau with a small pose/CFrame test double.
// This verifies source geometry and timing, never Roblox Animator/runtime quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createAssetProductionTeachingRecipe} from '../assets/vibe-studio-asset-universe.js';
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

// Pure teaching snippets share Lua/Luau syntax. Standard Lua execution tests arithmetic
// and lifecycle mocks only; native Roblox and the authored R15 suite still require their own gate.
const teacherBinary=process.env.VIBE2_LUAU_BINARY||process.env.VIBE2_TEACHER_LUA_BINARY;
test('teacher application examples execute boundary timing placement inventory and lifecycle cases',{skip:!teacherBinary&&'Set a Lua/Luau teaching executor; native Roblox remains a separate gate'},()=>{
  const recipe=createAssetProductionTeachingRecipe({cinematic:true,surfaceCraft:true,creatureCraft:true,actorAI:true});
  assert.equal(recipe.applicationExamples.length,26);
  const script='local examples={}\n'+recipe.applicationExamples.map(row=>'examples['+JSON.stringify(row.id)+']=(function()\n'+row.code+'\nend)()').join('\n')+String.raw`
local function near(a,b) assert(math.abs(a-b)<1e-9, tostring(a).." ~= "..tostring(b)) end
local choose=examples.AI_TARGET_STICKINESS
local a={id="a",score=10,alive=true,perceived=true,allowed=true}
local b={id="b",score=12,alive=true,perceived=true,allowed=true}
assert(choose({a,b},"a",2)=="a");assert(choose({b,a},"a",1)=="b")
assert(choose({a,b},"missing",3)=="b")
b.score=10;assert(choose({b,a},nil,0)=="a");assert(choose({a,b},nil,0)=="a")
assert(choose({a,b},"b",0)=="b")
b.score=100;b.alive=false;assert(choose({a,b},"b",2)=="a")
b.alive=true;b.perceived=false;assert(choose({a,b},nil,0)=="a")
b.perceived=true;b.allowed=false;assert(choose({a,b},nil,0)=="a")
b.allowed=true;b.score=0/0;assert(choose({a,b},nil,0)=="a")
b.score=math.huge;assert(choose({a,b},nil,0)=="a")
assert(choose({},"a",0)==nil);assert(not pcall(choose,{},nil,-1))
local follow=examples.AI_FOLLOW_HYSTERESIS
assert(not follow(true,3,3,5));assert(follow(false,5,3,5))
for _,distance in ipairs({3.01,3.9,4.7,4.1,3.8,4.99}) do
  assert(follow(true,distance,3,5));assert(not follow(false,distance,3,5))
end
assert(not pcall(follow,false,1,3,3));assert(not pcall(follow,false,-1,3,5))
local dwell=examples.AI_STATE_DWELL
local intent,entered=dwell("PATROL","SEARCH",10.2,10,.5,false);assert(intent=="PATROL" and entered==10)
intent,entered=dwell("PATROL","SEARCH",10.5,10,.5,false);assert(intent=="SEARCH" and entered==10.5)
intent,entered=dwell("SEARCH","SEARCH",30,10.5,.5,false);assert(intent=="SEARCH" and entered==10.5)
intent,entered=dwell("SEARCH","STUNNED",10.6,10.5,.5,true);assert(intent=="STUNNED" and entered==10.6)
assert(not pcall(dwell,"A","B",9,10,.5,false));assert(not pcall(dwell,"A","B",10,10,-1,false))
local accept=examples.AI_PATH_RESULT_GUARD
local pathState={active=true,actorId="wolf",targetId="p1",revision=2,pending="r2"}
local oldRequest={id="r1",actorId="wolf",targetId="p1",revision=1}
local currentRequest={id="r2",actorId="wolf",targetId="p1",revision=2}
local waypoints={{x=0},{x=1}}
local path,reason=accept(pathState,oldRequest,true,waypoints);assert(path==nil and reason=="stale" and pathState.pending=="r2")
pathState.targetId="p2";path=accept(pathState,currentRequest,true,waypoints);assert(path==nil and pathState.pending=="r2")
pathState.targetId="p1";pathState.actorId="replacement";path=accept(pathState,currentRequest,true,waypoints);assert(path==nil)
pathState.actorId="wolf";pathState.revision=3;path=accept(pathState,currentRequest,true,waypoints);assert(path==nil)
pathState.revision=2;pathState.active=false;path=accept(pathState,currentRequest,true,waypoints);assert(path==nil)
pathState.active=true;path,reason=accept(pathState,currentRequest,true,waypoints);assert(path==waypoints and reason=="ready" and pathState.pending==nil)
path,reason=accept(pathState,currentRequest,true,waypoints);assert(path==nil and reason=="stale")
pathState.pending="r2";path,reason=accept(pathState,currentRequest,false,waypoints);assert(path==nil and reason=="failed" and pathState.pending==nil)
pathState.pending="r2";path,reason=accept(pathState,currentRequest,true,{});assert(path==nil and reason=="failed")
local wave=examples.TAPERED_APPENDAGE_WAVE
near(wave(0,1,.7,.3),0);near(wave(-1,1,.7,.3),0)
near(wave(1,math.pi/2,0,.3),.3);near(wave(2,math.pi/2,0,.3),.3)
near(wave(.7,1,.7,0),0)
for i=0,100 do
  local s=i/100
  for j=-8,8 do
    local phase=j*.41
    local value=wave(s,phase,.7,.3)
    assert(math.abs(value)<=.3+1e-12)
    near(value,wave(s,phase+2*math.pi,.7,.3))
    near(value,wave(s,phase,.7,.3))
  end
end
local samples={}
for i=0,100 do samples[i]=wave(.7,i/100,.7,.3) end
for i=100,0,-1 do near(wave(.7,i/100,.7,.3),samples[i]) end
assert(not pcall(wave,.5,0,0,-1))
local mask=examples.DIRECTIONAL_SURFACE_MASK
near(mask(-2,0,1,1),0);near(mask(2,0,1,1),1)
near(mask(0,0,1,1),0);near(mask(1,0,1,1),1)
near(mask(.5,0,1,1),.5);near(mask(.5,0,1,.4),.2)
near(mask(1,0,1,-1),0);near(mask(1,0,1,2),1)
local previous=0
for i=0,100 do
  local value=mask(-1+2*i/100,-.5,.75,.8)
  assert(value>=previous and value>=0 and value<=.8)
  previous=value
end
assert(not pcall(mask,0,1,1,1));assert(not pcall(mask,0,.5,-.5,1))
assert(not pcall(mask,0,-2,1,1));assert(not pcall(mask,0,-1,2,1))
local pathDistance=examples.PATH_SEGMENT_CLEARANCE
near(pathDistance(5,2,0,0,10,0),4)
near(pathDistance(-2,0,0,0,10,0),4)
near(pathDistance(12,0,0,0,10,0),4)
near(pathDistance(2,3,0,0,0,0),13)
near(pathDistance(-5,-3,-10,-1,0,-1),4)
for i=-20,20 do
  near(pathDistance(i/3,i/7,-2,4,7,-3),pathDistance(i/3,i/7,7,-3,-2,4))
end
assert(pathDistance(5,1,0,0,10,0)<(1+.5)^2)
assert(pathDistance(5,2,0,0,10,0)>=(1+.5)^2)
local curve=examples.CUBIC_BEZIER_CAMERA_COMPONENT
near(curve(0,1,2,3,0),0);near(curve(0,1,2,3,1),3)
near(curve(0,1,2,3,-1),0);near(curve(0,1,2,3,2),3)
for i=0,100 do
  local t=i/100
  near(curve(0,1,2,3,t),3*t)
  local p=curve(-2,7,-4,3,t);assert(p>=-4 and p<=7);near(p,curve(-2,7,-4,3,t))
end
local cues=examples.MONOTONIC_CINEMATIC_CUES
local token1,token2={},{}
local cueState={active=true,token=token1,time=-1}
local cueList={{id="start",time=0},{id="cut",time=.5},{id="sound",time=.5},{id="return",time=2}}
local ids=cues(cueState,token1,0,cueList);assert(#ids==1 and ids[1]=="start")
ids=cues(cueState,token1,1,cueList);assert(#ids==2 and ids[1]=="cut" and ids[2]=="sound")
assert(#cues(cueState,token1,1,cueList)==0)
assert(#cues(cueState,token1,.1,cueList)==0 and cueState.time==1)
ids=cues(cueState,token1,20,cueList);assert(#ids==1 and ids[1]=="return")
cueState.active=false;assert(#cues(cueState,token1,30,cueList)==0 and cueState.time==20)
cueState.active=true;cueState.token=token2;cueState.time=-1
assert(#cues(cueState,token1,30,cueList)==0 and cueState.time==-1)
ids=cues(cueState,token2,0,cueList);assert(#ids==1 and ids[1]=="start")
local release=examples.RELEASE_CINEMATIC_OWNERSHIP
local calls=0
local state={active=true,token=token1,snapshot={fov=70}}
local function restore(snapshot)assert(snapshot.fov==70);calls=calls+1 end
assert(not release(state,token2,restore) and calls==0)
assert(release(state,token1,restore));assert(not state.active and state.token==nil and calls==1)
assert(not release(state,token1,restore) and calls==1)
state={active=true,token=token2,snapshot={fov=70}}
local ok,err=release(state,token2,function()error("restore interrupted")end)
assert(not ok and err and state.active and not state.releasing and state.token==token2)
assert(release(state,token2,function(snapshot)
  assert(not release(state,token2,restore))
  restore(snapshot)
end))
assert(calls==2 and not state.active)
local spring=examples.CRITICALLY_DAMPED_SECONDARY_MOTION
local segment=examples.HERMITE_POSE_SEGMENT
local p,v=segment(2,3,8,3,0,2);near(p,2);near(v,3)
p,v=segment(2,3,8,3,2,2);near(p,8);near(v,3)
for i=0,20 do
  local t=i/10
  p,v=segment(2,3,8,3,t,2);near(p,2+3*t);near(v,3)
end
local leftP,leftV=segment(-1,0,2,.7,.5,.5)
local rightP,rightV=segment(2,.7,3,0,0,.8)
near(leftP,rightP);near(leftV,rightV)
for i=1,19 do
  local t=i/20
  p,v=segment(-1,.4,2,-.3,t,1)
  local h=1e-5
  local before=segment(-1,.4,2,-.3,t-h,1)
  local after=segment(-1,.4,2,-.3,t+h,1)
  assert(math.abs((after-before)/(2*h)-v)<1e-7)
  local again=segment(-1,.4,2,-.3,t,1);near(p,again)
end
p,v=segment(2,0,8,0,-1,2);near(p,2);near(v,0)
p,v=segment(2,0,8,0,3,2);near(p,8);near(v,0)
assert(not pcall(segment,0,0,1,0,0,0))
local x1,v1=spring(-2,3,5,6,1)
for _,fps in ipairs({30,60,120}) do
  local x,v=-2,3
  for i=1,fps do x,v=spring(x,v,5,6,1/fps) end
  near(x,x1);near(v,v1)
end
local x,v=spring(-2,3,5,6,0);near(x,-2);near(v,3)
x,v=spring(-2,3,5,6,-1);near(x,-2);near(v,3)
x,v=spring(-2,3,5,6,10);near(x,5);near(v,0)
assert(not pcall(spring,0,0,1,0,1))
local ik=examples.TWO_BONE_REACH_GEOMETRY
local function length(x,y)return math.sqrt(x*x+y*y)end
for _,bones in ipairs({{2,2},{3,1},{1,3}}) do
  for _,distance in ipairs({0,.2,2,4,8}) do
    for angle=0,330,30 do
      local tx,ty=distance*math.cos(angle*math.pi/180),distance*math.sin(angle*math.pi/180)
      for _,side in ipairs({-1,1}) do
        local jx,jy,ex,ey,clamped=ik(bones[1],bones[2],tx,ty,side)
        near(length(jx,jy),bones[1]);near(length(ex-jx,ey-jy),bones[2])
        local reach=math.max(math.abs(bones[1]-bones[2]),math.min(bones[1]+bones[2],length(tx,ty)))
        near(length(ex,ey),reach)
        if not clamped then near(ex,tx);near(ey,ty) end
      end
    end
  end
end
local ax,ay=ik(2,2,2,0,1);local bx,by=ik(2,2,2,0,-1)
near(ax,bx);near(ay,-by);assert(ay>0)
assert(not pcall(ik,0,1,1,0,1))
local blendRotation=examples.SHORTEST_QUATERNION_BLEND
local identity,quarter={0,0,0,1},{0,0,math.sqrt(.5),math.sqrt(.5)}
for i=0,10 do
  local t=i/10
  local q=blendRotation(identity,quarter,t)
  near(q[1],0);near(q[2],0);near(q[3],math.sin(t*math.pi/4));near(q[4],math.cos(t*math.pi/4))
  near(q[1]^2+q[2]^2+q[3]^2+q[4]^2,1)
end
for _,target in ipairs({{0,0,0,-2},{0,0,1e-10,1}}) do
  local q=blendRotation(identity,target,.5)
  assert(q[4]>.999999);near(q[1]^2+q[2]^2+q[3]^2+q[4]^2,1)
end
local q=blendRotation(identity,quarter,-1);near(q[4],1)
q=blendRotation(identity,quarter,2);near(q[3],quarter[3])
assert(identity[4]==1 and quarter[3]==math.sqrt(.5))
assert(not pcall(blendRotation,{0,0,0,0},identity,.5))
local window=examples.VIRTUALIZED_FIXED_ROW_WINDOW
local first,last,total=window(0,20,0,100,2);assert(first==1 and last==0 and total==0)
first,last,total=window(100,20,0,0,2);assert(first==1 and last==0 and total==2000)
first,last,total=window(100,20,-40,100,0);assert(first==1 and last==5 and total==2000)
first,last=window(100,20,20,100,0);assert(first==2 and last==6)
first,last=window(100,20,21,100,0);assert(first==2 and last==7)
first,last=window(100,20,5000,100,0);assert(first==96 and last==100)
first,last=window(3,20,100,200,2);assert(first==1 and last==3)
for offset=0,20000000,137931 do
  first,last,total=window(1000000,20,offset,101,2)
  assert(first>=1 and last<=1000000 and last-first+1<=11 and total==20000000)
end
assert(not pcall(window,10,0,0,100,2));assert(not pcall(window,10,20,0,100,-1))
local spacing=examples.SPATIAL_HASH_DECORATIVE_SPACING
local candidates={{id="origin",x=0,z=0},{id="duplicate",x=0,z=0},{id="edge",x=1,z=0}}
for i=-30,30 do
  for j=-3,3 do
    table.insert(candidates,{id=tostring(i).."/"..tostring(j),x=i*.37,z=j*.41+(i%3)*.13})
  end
end
local expected={}
for _,p in ipairs(candidates) do
  local clear=true
  for _,q in ipairs(expected) do
    local dx,dz=p.x-q.x,p.z-q.z
    if dx*dx+dz*dz<1 then clear=false end
  end
  if clear then table.insert(expected,p) end
end
local chosen,again=spacing(candidates,1),spacing(candidates,1)
assert(#chosen==#expected and #again==#expected and #candidates==430)
for i,p in ipairs(chosen) do assert(p==expected[i] and p==again[i]) end
assert(chosen[1].id=="origin" and chosen[2].id=="edge" and candidates[2].id=="duplicate")
assert(not pcall(spacing,candidates,0))
local follow = examples.FRAME_RATE_INDEPENDENT_FOLLOW
for _, fps in ipairs({30,60,120}) do
  local value=0
  for i=1,fps do value=follow(value,1,4,1/fps); assert(value>=0 and value<=1) end
  near(value,1-math.exp(-4))
end
near(follow(.2,1,4,0),.2);near(follow(.2,1,4,-1),.2);near(follow(.2,1,0,1),.2)
local blend=examples.SMOOTH_STATE_TRANSITION
near(blend(-1,2),0);near(blend(1,2),.5);near(blend(4,2),1);near(blend(0,0),1)
assert(not pcall(blend,1,-1))
local eps=1e-6
assert(blend(eps,1)/eps<1e-5);assert((1-blend(1-eps,1))/eps<1e-5)
local lift=examples.PERIODIC_SWING_ENVELOPE
for i=0,720 do
  local phase=i*math.pi/180
  local y=lift(phase,2)
  assert(y>=0 and y<=2);near(y,lift(phase+2*math.pi,2))
end
for _, phase in ipairs({0,math.pi,2*math.pi}) do
  assert(math.abs((lift(phase+eps,1)-lift(phase,1))/eps)<1e-5)
  assert(math.abs((lift(phase,1)-lift(phase-eps,1))/eps)<1e-5)
end
near(lift(math.pi/2,-1),0)
local variation=examples.STABLE_DECORATIVE_VARIATION
for i=1,1000 do local id="prop-"..i;local v=variation(id);near(v,variation(id));assert(v>=0 and v<1) end
assert(variation("prop-a")~=variation("prop-b"))
math.randomseed(77);local expected=math.random()
math.randomseed(77);variation("decorative");near(math.random(),expected)
local snap=examples.MODULAR_GRID_SNAP
near(snap(1.5,1),2);near(snap(-1.5,1),-1);near(snap(-1.6,1),-2)
for i=-100,100 do local x=snap(i/13,.25);near(snap(x,.25),x) end
assert(not pcall(snap,1,0));assert(not pcall(snap,1,-1))
local function vec(x,y,z)
  return {X=x,Y=y,Z=z,Dot=function(self,b)return self.X*b.X+self.Y*b.Y+self.Z*b.Z end}
end
local support=examples.SUPPORT_PLANE_OFFSET
local normal,right,up,look=vec(0,1,0),vec(1,0,0),vec(0,1,0),vec(0,0,1)
near(support(normal,right,up,look,vec(1,2,3),5,0),-3)
near(support(normal,right,up,look,vec(1,2,3),5,.2),-2.8)
local c=math.sqrt(.5)
near(support(normal,vec(c,c,0),vec(-c,c,0),look,vec(1,1,1),0,0),math.sqrt(2))
local slope=vec(0,c,c)
local shift=support(slope,right,up,look,vec(1,2,3),0,.1)
near(shift,5*c+.1);near(support(slope,right,up,look,vec(1,2,3),shift,.1),0)
local detail=examples.DETAIL_HYSTERESIS
assert(detail(false,9,10,15));assert(detail(true,12,10,15))
assert(not detail(false,12,10,15));assert(not detail(true,15,10,15))
assert(not pcall(detail,true,12,10,10))
local filter=examples.STABLE_INVENTORY_FILTER
local items={{id="a",name="Potion [Blue]",category="potion",count=3},{id="b",name="Potion [Blue]",category="potion",count=7},{id="c",name="Ore",category="resource",count=9}}
local ids=filter(items,"[",nil);assert(#ids==2 and ids[1]=="a" and ids[2]=="b")
ids=filter(items,"potion","resource");assert(#ids==0)
ids=filter(items,"ORE","resource");assert(#ids==1 and ids[1]=="c")
ids=filter(items,"",nil);assert(#ids==3 and ids[1]=="a" and ids[3]=="c")
assert(#items==3 and items[1].count==3 and items[2].count==7 and items[1].name=="Potion [Blue]")
local refresh=examples.LATEST_VIEW_RESULT_ONLY
local state,callbacks,rendered={version=0,open=true},{},{}
local function fetch(cb)table.insert(callbacks,cb)end
local function render(data,err)table.insert(rendered,{data=data,err=err})end
refresh(state,fetch,render);refresh(state,fetch,render)
callbacks[1]("stale",nil);assert(#rendered==0)
callbacks[2]("current",nil);callbacks[2]("duplicate",nil)
assert(#rendered==1 and rendered[1].data=="current")
refresh(state,fetch,render);state.open=false;state.version=state.version+1
callbacks[3]("closed",nil);assert(#rendered==1)
state.open=true;state.version=state.version+1;callbacks[3]("reopened stale",nil);assert(#rendered==1)
refresh(state,fetch,render);callbacks[4](nil,"NETWORK");assert(#rendered==2 and rendered[2].err=="NETWORK")
local disconnect=examples.DISCONNECT_OWNED_LISTENERS
local a,b,other=0,0,0
local connections={{Disconnect=function()a=a+1 end},{Disconnect=function()b=b+1 end}}
local unrelated={Disconnect=function()other=other+1 end}
disconnect(connections);disconnect(connections)
assert(a==1 and b==1 and #connections==0 and other==0)
print("TEACHER_APPLICATION_EXAMPLES=26_PASS")
`;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'asset-teacher-'));
  try{
    const file=path.join(dir,'teacher-examples.luau');fs.writeFileSync(file,script);
    const result=spawnSync(teacherBinary,[file],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
    assert.equal(result.status,0,result.error?.message||result.stderr||result.stdout);
    assert.match(result.stdout,/TEACHER_APPLICATION_EXAMPLES=26_PASS/);
    assert.equal(recipe.runtimeVerified,false);
    assert.equal(recipe.productionVerified,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
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
