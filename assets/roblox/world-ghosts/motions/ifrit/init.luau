-- 파일명: ifrit.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "ifrit"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
function Motion.walk(form,bones,time)
 local state="walk"
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
 return result
end
Motion.AuthoredClip = "attack"
Motion.Duration = 1
Motion.Intent = "이프리트 · 양팔 내려찍기"
function Motion.attack(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 local t=math.clamp(time,0,1)
 -- Deliberate anticipation, rapid release, short impact hold, long recovery.
 local raise=smooth(t/.38)
 local strike=smooth((t-.38)/.16)
 local recover=smooth((t-.62)/.38)
 local active=1-recover
 local crouch=(.10*raise+.09*strike)*active
 pose("Torso",0,-crouch,(-.17*strike+.04*raise)*active,(.09*raise-.24*strike)*active,0,0)
 pose("Head",0,0,0,(-.08*raise+.13*strike)*active,0,0)
 pose("LeftArm",0,0,0,(-2.05*raise+1.3*strike)*active,0,-.16*raise*active)
 pose("RightArm",0,0,0,(-2.05*raise+1.3*strike)*active,0,.16*raise*active)
 pose("LeftLeg",0,0,0,.08*raise*active,0,-.025*raise*active)
 pose("RightLeg",0,0,0,.08*raise*active,0,.025*raise*active)
 return result
end
return Motion
