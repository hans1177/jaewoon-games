-- 파일명: kelpie.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "kelpie"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
Motion.AuthoredClip = "walk"
Motion.Duration = 1.4
Motion.Intent = "켈피 · 4박 보행"
function Motion.walk(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 local cycle=(time/Motion.Duration)%1
 local legs={{"BackLeftLeg",0},{"FrontLeftLeg",.25},{"BackRightLeg",.5},{"FrontRightLeg",.75}}
 local lifted=0
 for _,leg in ipairs(legs)do
  local p=(cycle+leg[2])%1
  local angle,lift
  if p<.76 then
   angle=.29-.58*smooth(p/.76);lift=0
  else
   local u=(p-.76)/.24
   angle=-.29+.58*smooth(u);lift=.17*math.sin(math.pi*u)^2
  end
  lifted+=lift
  pose(leg[1],0,lift,0,angle,0,0)
 end
 local a=cycle*TAU
 pose("Torso",.025*math.sin(a),-.04+lifted*.14,0,.025*math.sin(a*2),.02*math.sin(a),.028*math.sin(a))
 pose("Head",0,0,0,-.045*math.sin(a*2-.3),-.025*math.sin(a),0)
 pose("Tail",0,0,0,0,.14*math.sin(a-.65),.025*math.sin(a))
 for name in pairs(bones)do if name:match("^TailFan")then pose(name,0,0,0,0,.12*math.sin(a-1),0)end end
 return result
end
return Motion
