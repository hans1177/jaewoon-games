-- [비주얼 래더 · 공용 환경 연출] 자동개발 루프가 올려 주는 단계(Shared.VisualLadderState)의 world Features에 맞춰 빛·공기 연출을 켠다.
--   rays 햇살 줄기 / bloom 블룸 / grade 색보정 / motes 낮엔 꽃가루·밤엔 반딧불 입자(모바일 저감 모드 생략) / exposure 반사·노출 보정
-- 새 모델이나 도형은 만들지 않고 Lighting 효과와 ParticleEmitter만 쓴다. 표시 전용이며 판정·저장과 무관하다.
-- 원본: assets/roblox/common-ambience-v1/VisualLadder.client.luau (게임 client 폴더에 같은 내용으로 복사해 쓴다).
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local Lighting=game:GetService("Lighting")
local RunService=game:GetService("RunService")
local UserInputService=game:GetService("UserInputService")

local features={}
local mood="bright"
do
  local shared=ReplicatedStorage:WaitForChild("Shared",10)
  local module=shared and shared:WaitForChild("VisualLadderState",10)
  local ok,data=pcall(function() return require(module) end)
  if ok and typeof(data)=="table" then
    mood=data.Mood or mood
    for _,name in ipairs((data.Features and data.Features.world) or {}) do features[name]=true end
  end
end
if next(features)==nil then return end
local reduced=UserInputService.TouchEnabled

local function ensure(class,name)
  local obj=Lighting:FindFirstChild(name)
  if not obj then obj=Instance.new(class);obj.Name=name;obj.Parent=Lighting end
  return obj
end
local anchors,emitters={},{}
local function buildParticles()
  if #anchors>0 then return end
  for i=1,6 do
    local a=Instance.new("Attachment");a.Name="LadderAmbient"..i;a.Parent=workspace.Terrain
    local e=Instance.new("ParticleEmitter")
    e.Name="LadderMote"
    e.Texture="rbxasset://textures/particles/sparkles_main.dds"
    e.Lifetime=NumberRange.new(7,11)
    e.Speed=NumberRange.new(.25,.7)
    e.SpreadAngle=Vector2.new(180,180)
    e.Rate=1.6
    e.Size=NumberSequence.new({NumberSequenceKeypoint.new(0,0),NumberSequenceKeypoint.new(.15,.2),NumberSequenceKeypoint.new(.85,.16),NumberSequenceKeypoint.new(1,0)})
    e.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,1),NumberSequenceKeypoint.new(.2,.45),NumberSequenceKeypoint.new(.8,.55),NumberSequenceKeypoint.new(1,1)})
    e.LightEmission=mood=="dark" and .3 or .7
    e.LightInfluence=0
    e.Acceleration=Vector3.new(.15,.12,.1)
    e.Parent=a
    anchors[i]=a;emitters[i]=e
  end
end

local angle,clock=0,0
RunService.Heartbeat:Connect(function(dt)
  clock+=dt
  if clock<.25 then return end
  local step=clock;clock=0
  local hour=Lighting.ClockTime
  local day=hour>=6.5 and hour<=17.5
  if features.rays and mood~="dark" then
    local rays=ensure("SunRaysEffect","LadderSunRays")
    rays.Intensity=day and (reduced and .08 or .14) or 0;rays.Spread=.55
  end
  if features.bloom then
    local bloom=ensure("BloomEffect","LadderBloom")
    bloom.Intensity=(reduced and .18 or .3)*(mood=="dark" and .6 or 1);bloom.Size=26;bloom.Threshold=1.05
  end
  if features.grade then
    local grade=ensure("ColorCorrectionEffect","LadderGrade")
    grade.Saturation=mood=="dark" and -.02 or .05;grade.Contrast=.04
  end
  if features.exposure then
    Lighting.EnvironmentDiffuseScale=.75;Lighting.EnvironmentSpecularScale=.7
    Lighting.ExposureCompensation=mood=="dark" and .05 or .12
  end
  local camera=workspace.CurrentCamera
  if features.motes and not reduced and camera then
    buildParticles()
    angle+=step*.05
    local firefly=not day
    for i,a in ipairs(anchors) do
      local ang=angle+i*math.pi/3
      local radius=14+((i*7)%3)*6
      a.WorldPosition=camera.CFrame.Position+Vector3.new(math.cos(ang)*radius,-2+((i*5)%4),math.sin(ang)*radius)
      local e=emitters[i]
      e.Enabled=true
      e.Color=ColorSequence.new(firefly and Color3.fromRGB(214,255,120) or Color3.fromRGB(255,244,200))
      e.Rate=firefly and 2.4 or 1.4
    end
  else
    for _,e in ipairs(emitters) do e.Enabled=false end
  end
end)
