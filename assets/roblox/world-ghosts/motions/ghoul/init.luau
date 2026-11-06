-- 파일명: ghoul.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "ghoul"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
Motion.AuthoredClip = "walk"
Motion.Duration = 1.6
Motion.Intent = "구울 · 낮은 잠행"
function Motion.walk(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 -- Long support, short silent recovery: each planted leg lingers before lifting.
 local phase=(time/Motion.Duration)%1
 local function step(offset)
  local p=(phase+offset)%1
  if p<.72 then return .27-.54*smooth(p/.72),0 end
  local swing=(p-.72)/.28
  return -.27+.54*smooth(swing),.13*math.sin(math.pi*swing)^2
 end
 local left,ly=step(0);local right,ry=step(.5)
 local sway=math.sin(phase*TAU)
 pose("Torso",.055*sway,-.16+.025*math.cos(phase*TAU*2),-.09,-.17,.045*sway,-.035*sway)
 pose("Head",0,.02,.025,.13,-.075*sway,.02*sway)
 pose("LeftLeg",0,ly,0,left,0,-.018)
 pose("RightLeg",0,ry,0,right,0,.018)
 pose("LeftArm",0,0,-.06,-.23-right*.48,.07,-.12)
 pose("RightArm",0,0,-.04,-.29-left*.35,-.09,.16)
 pose("Tail",0,0,0,.03,math.sin(phase*TAU-.8)*.1,0)
 return result
end
return Motion
