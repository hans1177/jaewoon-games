-- 파일명: boitata.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "boitata"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
Motion.AuthoredClip = "walk"
Motion.Duration = 1.8
Motion.Intent = "보이타타 · 전파형 몸통 파동"
function Motion.walk(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 local a=time/Motion.Duration*TAU
 -- Coils are siblings under Tail: phase is assigned per coil, not accumulated.
 for name in pairs(bones)do
  local index=tonumber(name:match("^Coil(%d+)$"))
  if index then
   local phase=a-index*.64;local taper=1-index*.085
   pose(name,.11*taper*math.sin(phase),.025*taper*math.sin(phase*2),.035*math.cos(phase),
    .055*taper*math.cos(phase),.18*taper*math.sin(phase-.25),.06*taper*math.sin(phase))
  end
 end
 pose("Torso",.045*math.sin(a+.35),.035*math.cos(a*2),0,0,.035*math.sin(a+.35),0)
 pose("Head",0,0,0,.03*math.cos(a+.8),-.065*math.sin(a+.8),-.02*math.sin(a))
 pose("Tail",0,0,0,0,-.025*math.sin(a+.35),0)
 return result
end
return Motion
