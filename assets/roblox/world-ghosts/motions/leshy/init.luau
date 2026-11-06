-- 파일명: leshy.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "leshy"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
Motion.AuthoredClip = "walk"
Motion.Duration = 2.2
Motion.Intent = "레시 · 체중 이동 보행"
function Motion.walk(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 local p=(time/Motion.Duration)%1
 -- Triangular weight travel is eased at both full-support poses.
 local support=p<.5 and -1+2*smooth(p*2) or 1-2*smooth((p-.5)*2)
 local function leg(offset)
  local u=(p+offset)%1
  local travel=u<.64 and .23-.46*smooth(u/.64) or -.23+.46*smooth((u-.64)/.36)
  local lift=u<.64 and 0 or .10*math.sin(math.pi*(u-.64)/.36)^2
  return travel,lift
 end
 local l,ly=leg(0);local r,ry=leg(.5)
 local delayed=math.sin(p*TAU-.7)+.2*math.sin(p*TAU*3-1.1)
 pose("Torso",support*.10,-.045+.035*math.cos(p*TAU*2),0,.045,.025*delayed,-.045*support)
 pose("Head",0,0,0,-.03,-.02*delayed,.025*support)
 pose("LeftLeg",0,ly,0,l,0,0);pose("RightLeg",0,ry,0,r,0,0)
 pose("LeftArm",0,0,0,-.10-.11*delayed,0,-.065)
 pose("RightArm",0,0,0,-.10+.11*delayed,0,.065)
 return result
end
return Motion
