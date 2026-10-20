-- 파일명: aswang.luau
-- 원본 동작을 보존한 오브젝트 전용 파생 모션. 검수 전 품질 통과 아님.
local Motion = {}
Motion.AssetId = "aswang"
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
 local lift=math.max(0,math.sin(phase))^2
 local floating=form=="SHROUD" or form=="FLOATING_HEAD" or form=="OBJECT_SWARM" or form=="RIBBON" or form=="LANTERN"
 pose("Torso",.04*math.sin(phase),floating and math.sin(time*2.4)*.13 or -.12+.02*math.cos(phase*2),-.07,-.15,moving and wave*.03 or breathe*.015,-.03)
 pose("Head",0,0,.02,breathe*.035+.08*math.abs(wave),math.sin(time*.9)*.07,.02*wave)
 if moving then
  if form=="BEAST" or form=="CENTAUR"then
   pose("FrontLeftLeg",0,lift*.15,0,wave*.48,0,-.02)
   pose("BackRightLeg",0,lift*.15,0,wave*.48,0,.02)
   pose("FrontRightLeg",0,(1-math.max(0,-math.sin(phase)))*.15,0,-wave*.48,0,-.02)
   pose("BackLeftLeg",0,(1-math.max(0,-math.sin(phase)))*.15,0,-wave*.48,0,.02)
  elseif form=="ARACHNID"then
   for i=1,4 do for _,side in ipairs({"Left","Right"})do
    local sign=side=="Left" and -1 or 1;local cycle=math.sin(phase+(i%2)*math.pi+(sign<0 and 0 or math.pi))
    pose("Spider"..side..i,0,math.max(0,cycle)*.08,0,0,cycle*.2,sign*math.max(0,cycle)*.12)
    pose("Spider"..side..i.."Knee",0,0,0,0,0,sign*math.max(0,cycle)*.25)
   end end
  elseif form=="WHEEL"then pose("Torso",0,0,0,0,0,-(time*2.8)%(math.pi*2))
  elseif not floating and form~="SERPENT" and form~="WALL" and form~="BOUND"then
   pose("LeftLeg",0,lift*.18,0,wave*.44,0,-.02)
   pose("RightLeg",0,(1-math.max(0,-math.sin(phase)))*.18,0,-wave*.44,0,.02)
   pose("LeftArm",0,0,-.05,-.35-wave*.25,.08,-.12)
   pose("RightArm",0,0,-.05,-.35+wave*.25,-.08,.12)
  elseif form=="BOUND"then pose("Torso",0,math.abs(wave)*.18,0,-.1,0,wave*.04)end
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
return Motion
