"""Studio 스크립트용 '한 번에 많이·자세히' 촬영 단계 생성기.

2026-11-29 오너: "스튜디오 스샷 한 번 찍을 때 많이 디테일하게 찍어. 매번 찔끔."
항구 하나를 지은 뒤 각도 12장을 찍는다: 전체 위·비스듬히 2장·광장 눈높이·큰길·집 줄·항만·목장·
가축 가까이 2장·주민 가까이·마을 끝(경계). 카메라 위치는 장면에서 실제 물체를 찾아 정한다.
사용: from studio_shots import shot_steps;  steps += shot_steps("london")
"""

ANGLES = [
    ("top", "return CFrame.lookAt(Vector3.new(-100,330,1),Vector3.new(-100,0,0)),60"),
    ("oblique_sea", "return CFrame.lookAt(Vector3.new(60,120,-150),Vector3.new(-90,0,0)),55"),
    ("oblique_land", "return CFrame.lookAt(Vector3.new(-320,110,140),Vector3.new(-80,0,0)),55"),
    ("plaza_eye", "local p=f:GetAttribute('CityPortPlazaLocation') or Vector3.new(-6,0,0) return CFrame.lookAt(p+Vector3.new(26,6,18),p+Vector3.new(0,3,0)),60"),
    ("street", "return CFrame.lookAt(Vector3.new(-20,7,0),Vector3.new(-140,4,0)),62"),
    ("houses", "local h=find(function(m) return m.Name=='HarborHouse' end) if not h then return nil end local p=h:GetPivot().Position return CFrame.lookAt(p+Vector3.new(22,10,(p.Z>0 and -24 or 24)),p+Vector3.new(0,4,0)),50"),
    ("harbor", "return CFrame.lookAt(Vector3.new(20,22,60),Vector3.new(45,2,0)),58"),
    ("ranch", "local g=find(function(m) return m.Name=='OpenPasture' or m.Name=='PigYard' end) if not g then return nil end local p=g.Position return CFrame.lookAt(p+Vector3.new(40,30,40),p),55"),
    ("animal_side", "local a=find(function(m) local s=m:GetAttribute('AnimalSpecies') return s and s~='pigeon' and s~='seagull' end) if not a then return nil end local p=a:GetPivot() return CFrame.lookAt(p.Position+p.RightVector*8+Vector3.new(0,2.5,0),p.Position+Vector3.new(0,1.2,0)),40"),
    ("animal_front", "local a=find(function(m) local s=m:GetAttribute('AnimalSpecies') return s and s~='pigeon' and s~='seagull' end) if not a then return nil end local p=a:GetPivot() return CFrame.lookAt(p.Position+p.LookVector*7+p.RightVector*3+Vector3.new(0,2,0),p.Position+Vector3.new(0,1.2,0)),40"),
    ("resident", "local r=find(function(m) return m:FindFirstChildOfClass('Humanoid')~=nil end) if not r then return nil end local p=r:GetPivot() return CFrame.lookAt(p.Position+p.LookVector*6+Vector3.new(0,2,0),p.Position+Vector3.new(0,1.5,0)),40"),
    ("edge", "local x=-(f:GetAttribute('TownLandWidth') or 300)+40 return CFrame.lookAt(Vector3.new(x-30,35,90),Vector3.new(x+40,0,0)),55"),
]

PRELUDE = (
    "local f=workspace:FindFirstChild('PortScene') if not f then return 'NOSCENE' end "
    "local function find(ok) for _,d in ipairs(f:GetDescendants()) do if (d:IsA('Model') or d:IsA('BasePart')) and ok(d) then return d end end return nil end "
    "local function pick() %s end local cf,fov=pick() "
    "if not cf then return 'SKIP %s %s' end workspace:SetAttribute('ShotFov',fov) workspace:SetAttribute('ShotCF',cf) return 'SHOT %s %s'"
)


def shot_steps(port: str, settle_ms: int = 700):
    steps = []
    for name, body in ANGLES:
        steps.append({"type": "luau", "ctx": "Client", "code": PRELUDE % (body, port, name, port, name)})
        steps.append({"type": "wait", "ms": settle_ms})
        steps.append({"type": "capture", "name": f"{port}_{name}"})
    return steps
