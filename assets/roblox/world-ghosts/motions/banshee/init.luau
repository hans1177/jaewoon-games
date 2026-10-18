-- 파일명: banshee.luau
-- 내부 오브젝트 전용 동작 실험. 수치 검증과 네이티브 실행 검증은 별도.
local Motion = {}
Motion.AssetId = "banshee"
Motion.ParentSourceHash = "e0681af58b961cfcd5c30ae3a3db7c30232eeaf43367bec29313f3b9cf0d2f22"
Motion.AuthoredClip = "walk"
Motion.Duration = 2.8
Motion.Intent = "밴시 · 곡선 부유"
function Motion.walk(form,bones,time)

 local result={}
 for name in pairs(bones)do result[name]={x=0,y=0,z=0,rx=0,ry=0,rz=0}end
 local function pose(name,x,y,z,rx,ry,rz)
  if result[name]then result[name]={x=x or 0,y=y or 0,z=z or 0,rx=rx or 0,ry=ry or 0,rz=rz or 0}end
 end
 local function smooth(value)local u=math.clamp(value,0,1);return u*u*u*(u*(u*6-15)+10)end
 local TAU=math.pi*2

 -- Closed cubic Bezier loop. Tangents agree at both joins; no foot cycle.
 local p=(time/Motion.Duration)%1
 local u=(p*2)%1
 local points=p<.5 and {{-.2,0,0},{-.2,.28,-.14},{.2,.28,.14},{.2,0,0}}
  or {{.2,0,0},{.2,-.28,-.14},{-.2,-.28,.14},{-.2,0,0}}
 local v=1-u;local b={v^3,3*v*v*u,3*v*u*u,u^3}
 local xyz={0,0,0}
 for i=1,4 do for axis=1,3 do xyz[axis]+=points[i][axis]*b[i] end end
 local a=p*TAU
 pose("Torso",xyz[1],.18+xyz[2],xyz[3],.025*math.sin(a*2),.075*math.sin(a),-.06*math.cos(a))
 pose("Head",0,0,0,-.08+.025*math.sin(a-.55),-.065*math.sin(a-.35),.035*math.cos(a-.35))
 pose("LeftArm",0,0,0,-.1+.11*math.sin(a-.65),.03,-.19-.055*math.cos(a))
 pose("RightArm",0,0,0,-.1+.09*math.sin(a-1.0),-.03,.19+.055*math.cos(a))
 return result
end
return Motion
