-- 파일명: dullahan.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "dullahan"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
Motion.AuthoredClip = "walk"
Motion.Duration = 1.5
Motion.Intent = "듀라한 · 머리 운반 보행"
function Motion.walk(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 local a=(time/Motion.Duration)*TAU
 local stride=math.sin(a);local load=math.sin(a*2)
 local pitch=.018*load;local yaw=.04*stride;local roll=.025*stride
 local bob=.025*(1-math.cos(a*2))
 pose("Torso",.025*stride,bob,0,pitch,yaw,roll)
 pose("LeftLeg",0,.07*math.max(0,stride)^2,0,.32*stride,0,0)
 pose("RightLeg",0,.07*math.max(0,-stride)^2,0,-.32*stride,0,0)
 -- CARRIED_HEAD is feature 1: Factory attaches it to RightArm.
 -- Counter the torso's pitch/roll, keeping its supporting forearm quiet.
 pose("RightArm",0,-bob*.7,0,-.32-pitch,-yaw*.65,.12-roll)
 pose("LeftArm",0,0,0,-.24*stride-.04,0,-.06)
 pose("Tail",0,0,0,0,.04*math.sin(a-.4),0)
 return result
end
return Motion
