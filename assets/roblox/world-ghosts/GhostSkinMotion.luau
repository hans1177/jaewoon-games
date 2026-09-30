-- Cosmetic preview motion only. Never moves an NPC root, deals damage or changes AI state.
local Motion={}
Motion.States={"idle","walk","chase","attack","hit","death"}
local states={};for _,state in ipairs(Motion.States)do states[state]=true end
local function clamp(v,min,max)return math.max(min,math.min(max,v))end
function Motion.Sample(form,bones,time,state)
 assert(states[state or "idle"],"INVALID_MOTION_STATE")
 assert(type(time)=="number" and time==time and math.abs(time)<1e12,"INVALID_MOTION_TIME")
 state=state or "idle"
 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local moving=state=="walk" or state=="chase"
 local speed=state=="chase" and 10 or moving and 6 or 2
 local phase=time*speed;local wave=math.sin(phase);local breathe=math.sin(time*2)
 local floating=form=="SHROUD" or form=="FLOATING_HEAD" or form=="OBJECT_SWARM" or form=="RIBBON" or form=="LANTERN"
 pose("Torso",0,floating and math.sin(time*2.4)*.13 or .03*breathe,0,0,moving and wave*.025 or breathe*.015,0)
 pose("Head",0,0,0,breathe*.035,math.sin(time*.9)*.07,0)
 if moving then
  if form=="BEAST" or form=="CENTAUR"then
   pose("FrontLeftLeg",0,0,0,wave*.48);pose("BackRightLeg",0,0,0,wave*.48)
   pose("FrontRightLeg",0,0,0,-wave*.48);pose("BackLeftLeg",0,0,0,-wave*.48)
  elseif form=="ARACHNID"then
   for i=1,4 do for _,side in ipairs({"Left","Right"})do
    local sign=side=="Left" and -1 or 1;local cycle=math.sin(phase+(i%2)*math.pi+(sign<0 and 0 or math.pi))
    pose("Spider"..side..i,0,0,0,0,cycle*.2,sign*math.max(0,cycle)*.12)
    pose("Spider"..side..i.."Knee",0,0,0,0,0,sign*math.max(0,cycle)*.25)
   end end
  elseif form=="WHEEL"then pose("Torso",0,0,0,0,0,-(time*2.8)%(math.pi*2))
  elseif not floating and form~="SERPENT" and form~="WALL" and form~="BOUND"then
   pose("LeftLeg",0,0,0,wave*.4);pose("RightLeg",0,0,0,-wave*.4)
   pose("LeftArm",0,0,0,-wave*.3);pose("RightArm",0,0,0,wave*.3)
  elseif form=="BOUND"then pose("Torso",0,math.abs(wave)*.16,0,0,0,wave*.03)end
 end
 for name in pairs(bones)do
  local coil=tonumber(string.match(name,"^Coil(%d+)$"))
  local tail=tonumber(string.match(name,"^TailFan(%d+)$"))
  if coil then pose(name,math.sin(phase-coil*.55)*.045,0,0,0,math.sin(phase-coil*.55)*.12,0)
  elseif tail then pose(name,0,0,0,math.sin(time*2-tail*.4)*.07,math.sin(time*2-tail*.4)*.11,0)end
 end
 pose("LeftWing",0,0,0,0,math.sin(phase)*.3,-.06)
 pose("RightWing",0,0,0,0,-math.sin(phase)*.3,.06)
 if state=="attack"then
  local progress=clamp(time,0,1);local windup=progress<.35 and math.sin(progress/.35*math.pi/2) or (1-progress)/.65
  local release=progress<.35 and 0 or math.sin(clamp((progress-.35)/.65,0,1)*math.pi)
  pose("Torso",0,0,-release*.18,windup*.06-release*.16,0,0)
  pose("Head",0,0,0,-release*.2)
  pose("LeftArm",0,0,0,-windup*.4-release*.7,0,-.1)
  pose("RightArm",0,0,0,-windup*.4-release*.7,0,.1)
  if form=="ARACHNID"then
   pose("SpiderLeft1",0,release*.12,0,0,-release*.25,-release*.3)
   pose("SpiderRight1",0,release*.12,0,0,release*.25,release*.3)
  end
 elseif state=="hit"then
  local recoil=math.sin(clamp(time/.45,0,1)*math.pi)
  pose("Torso",0,0,recoil*.1,recoil*.13,0,recoil*.04)
 elseif state=="death"then
  local fall=clamp(time/1.1,0,1)
  pose("Torso",0,-fall*1.3,0,fall*1.1,0,fall*.25)
  pose("Head",0,0,0,fall*.3)
 end
 return result
end
function Motion.Bind(model)
 local joints={};local bones={}
 for _,object in ipairs(model:GetDescendants())do
  if object:IsA("Motor6D") and object.Part1 then
   local name=string.gsub(object.Part1.Name,"^Skin","")
   joints[name]={joint=object,rest=object.C0};bones[name]=true
  end
 end
 local destroyed=false
 local function reset()
  if destroyed then return end
  for _,row in pairs(joints)do if row.joint.Parent then row.joint.C0=row.rest end end
 end
 return {
  step=function(time,state)
   if destroyed or not model.Parent then return end
   local sample=Motion.Sample(model:GetAttribute("BodyForm"),bones,time,state)
   for name,p in pairs(sample)do local row=joints[name]
    if row and row.joint.Parent then row.joint.C0=row.rest*CFrame.new(p.x,p.y,p.z)*CFrame.Angles(p.rx,p.ry,p.rz)end
   end
  end,
  reset=reset,
  destroy=function()reset();destroyed=true;table.clear(joints)end,
 }
end
return Motion
