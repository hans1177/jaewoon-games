--!nonstrict
-- RobloxCommonLookKit: 게임 룩(조명·대기·색보정·블룸·태양광·피사계 심도) 프리셋을 한 번에 입히는 공용 모듈.
-- 새 파츠나 모델을 만들지 않고 Lighting 서비스와 그 자식 효과만 다룬다. 표시 전용이고 판정·저장·AI와 무관하다.
-- 프리셋 표의 기준은 look-presets.json 이고, 아래 생성 구간은 tools/vibe-look-kit.mjs --emit 으로만 바꾼다.
-- 게임이 이미 만든 Atmosphere/Bloom 등은 건드리지 않고 "VibeLook" 이름의 것만 만들거나 갱신한다.
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

local Kit = {}

-- BEGIN GENERATED PRESETS (tools/vibe-look-kit.mjs --emit, 직접 수정 금지)
Kit.Presets = {
  ["storybook"] = {
    title = "동화 그림책",
    mood = "따뜻하고 부드러운 낮",
    lighting = { Brightness = 2.4, ClockTime = 15, Ambient = Color3.fromRGB(140, 130, 120), OutdoorAmbient = Color3.fromRGB(165, 150, 135), ColorShift_Top = Color3.fromRGB(255, 230, 190), EnvironmentDiffuseScale = 0.6, EnvironmentSpecularScale = 0.3, ExposureCompensation = 0.1, ShadowSoftness = 0.55 },
    atmosphere = { Density = 0.28, Offset = 0.15, Color = Color3.fromRGB(255, 236, 210), Decay = Color3.fromRGB(255, 205, 170), Glare = 0.1, Haze = 1.2 },
    colorCorrection = { Brightness = 0.02, Contrast = 0.06, Saturation = 0.16, TintColor = Color3.fromRGB(255, 244, 230) },
    bloom = { Intensity = 0.35, Size = 28, Threshold = 1.1 },
    sunRays = { Intensity = 0.08, Spread = 0.7 },
  },
  ["dark-fantasy"] = {
    title = "다크 판타지",
    mood = "차갑고 어두운 안개",
    lighting = { Brightness = 1.1, ClockTime = 19.5, Ambient = Color3.fromRGB(55, 60, 78), OutdoorAmbient = Color3.fromRGB(70, 75, 100), ColorShift_Top = Color3.fromRGB(170, 185, 230), EnvironmentDiffuseScale = 0.5, EnvironmentSpecularScale = 0.5, ExposureCompensation = -0.2, ShadowSoftness = 0.3 },
    atmosphere = { Density = 0.45, Offset = 0.05, Color = Color3.fromRGB(110, 120, 150), Decay = Color3.fromRGB(60, 65, 90), Glare = 0, Haze = 2.4 },
    colorCorrection = { Brightness = -0.04, Contrast = 0.2, Saturation = -0.12, TintColor = Color3.fromRGB(225, 232, 255) },
    bloom = { Intensity = 0.45, Size = 24, Threshold = 1 },
    sunRays = { Intensity = 0.03, Spread = 0.5 },
  },
  ["cozy"] = {
    title = "포근한 석양",
    mood = "노을빛 따뜻한 실내외",
    lighting = { Brightness = 2, ClockTime = 17.6, Ambient = Color3.fromRGB(150, 120, 100), OutdoorAmbient = Color3.fromRGB(175, 135, 105), ColorShift_Top = Color3.fromRGB(255, 190, 140), EnvironmentDiffuseScale = 0.55, EnvironmentSpecularScale = 0.25, ExposureCompensation = 0.15, ShadowSoftness = 0.6 },
    atmosphere = { Density = 0.3, Offset = 0.2, Color = Color3.fromRGB(255, 205, 165), Decay = Color3.fromRGB(255, 150, 110), Glare = 0.3, Haze = 1.6 },
    colorCorrection = { Brightness = 0.03, Contrast = 0.04, Saturation = 0.2, TintColor = Color3.fromRGB(255, 235, 215) },
    bloom = { Intensity = 0.5, Size = 32, Threshold = 0.95 },
    sunRays = { Intensity = 0.14, Spread = 0.8 },
  },
  ["horror"] = {
    title = "공포",
    mood = "어둡고 탁한 녹빛 밤",
    lighting = { Brightness = 0.5, ClockTime = 0.5, Ambient = Color3.fromRGB(25, 32, 30), OutdoorAmbient = Color3.fromRGB(30, 40, 38), ColorShift_Top = Color3.fromRGB(120, 150, 140), EnvironmentDiffuseScale = 0.3, EnvironmentSpecularScale = 0.4, ExposureCompensation = -0.4, ShadowSoftness = 0.15 },
    atmosphere = { Density = 0.55, Offset = 0, Color = Color3.fromRGB(60, 75, 70), Decay = Color3.fromRGB(30, 40, 38), Glare = 0, Haze = 3.2 },
    colorCorrection = { Brightness = -0.07, Contrast = 0.25, Saturation = -0.3, TintColor = Color3.fromRGB(210, 235, 225) },
    bloom = { Intensity = 0.3, Size = 20, Threshold = 1.3 },
    sunRays = { Intensity = 0, Spread = 0.3 },
    depthOfField = { FarIntensity = 0.18, NearIntensity = 0, FocusDistance = 60, InFocusRadius = 40 },
  },
  ["sci-fi"] = {
    title = "SF 네온",
    mood = "차가운 푸른 빛과 강한 대비",
    lighting = { Brightness = 1.6, ClockTime = 22, Ambient = Color3.fromRGB(40, 50, 85), OutdoorAmbient = Color3.fromRGB(50, 60, 110), ColorShift_Top = Color3.fromRGB(140, 190, 255), EnvironmentDiffuseScale = 0.7, EnvironmentSpecularScale = 0.8, ExposureCompensation = 0, ShadowSoftness = 0.2 },
    atmosphere = { Density = 0.22, Offset = 0, Color = Color3.fromRGB(100, 140, 230), Decay = Color3.fromRGB(40, 60, 140), Glare = 0, Haze = 1.4 },
    colorCorrection = { Brightness = 0, Contrast = 0.28, Saturation = 0.12, TintColor = Color3.fromRGB(225, 240, 255) },
    bloom = { Intensity = 0.9, Size = 36, Threshold = 0.8 },
    sunRays = { Intensity = 0, Spread = 0.3 },
  },
  ["wuxia"] = {
    title = "무협 수묵",
    mood = "옅은 안개와 낮은 채도",
    lighting = { Brightness = 2, ClockTime = 10, Ambient = Color3.fromRGB(135, 140, 140), OutdoorAmbient = Color3.fromRGB(160, 165, 165), ColorShift_Top = Color3.fromRGB(235, 240, 235), EnvironmentDiffuseScale = 0.5, EnvironmentSpecularScale = 0.2, ExposureCompensation = 0.05, ShadowSoftness = 0.5 },
    atmosphere = { Density = 0.5, Offset = 0.3, Color = Color3.fromRGB(215, 222, 222), Decay = Color3.fromRGB(170, 180, 180), Glare = 0, Haze = 2.8 },
    colorCorrection = { Brightness = 0.02, Contrast = 0.1, Saturation = -0.35, TintColor = Color3.fromRGB(240, 245, 240) },
    bloom = { Intensity = 0.3, Size = 26, Threshold = 1.15 },
    sunRays = { Intensity = 0.05, Spread = 0.6 },
  },
  ["bright-adventure"] = {
    title = "밝은 모험",
    mood = "선명하고 경쾌한 한낮",
    lighting = { Brightness = 3, ClockTime = 13, Ambient = Color3.fromRGB(130, 135, 150), OutdoorAmbient = Color3.fromRGB(150, 160, 180), ColorShift_Top = Color3.fromRGB(255, 248, 230), EnvironmentDiffuseScale = 0.6, EnvironmentSpecularScale = 0.4, ExposureCompensation = 0, ShadowSoftness = 0.4 },
    atmosphere = { Density = 0.18, Offset = 0.1, Color = Color3.fromRGB(200, 220, 250), Decay = Color3.fromRGB(150, 180, 230), Glare = 0.2, Haze = 0.8 },
    colorCorrection = { Brightness = 0, Contrast = 0.08, Saturation = 0.22, TintColor = Color3.fromRGB(255, 252, 245) },
    bloom = { Intensity = 0.25, Size = 24, Threshold = 1.2 },
    sunRays = { Intensity = 0.1, Spread = 0.75 },
  },
  ["auto-ddb25c"] = {
    title = "자동 발견 조명 ddb25c",
    mood = "오후 따뜻한 빛, 밝음",
    lighting = { Brightness = 3.62, ClockTime = 16.6, Ambient = Color3.fromRGB(171, 154, 139), OutdoorAmbient = Color3.fromRGB(196, 177, 160), ColorShift_Top = Color3.fromRGB(255, 223, 197), EnvironmentDiffuseScale = 0.6, EnvironmentSpecularScale = 0.3, ExposureCompensation = 0.1, ShadowSoftness = 0.59 },
    atmosphere = { Density = 0.28, Offset = 0.15, Color = Color3.fromRGB(255, 236, 210), Decay = Color3.fromRGB(255, 205, 170), Glare = 0.1, Haze = 1.2 },
    colorCorrection = { Brightness = 0.02, Contrast = 0.06, Saturation = 0.16, TintColor = Color3.fromRGB(255, 244, 230) },
    bloom = { Intensity = 0.35, Size = 28, Threshold = 1.1 },
    sunRays = { Intensity = 0.08, Spread = 0.7 },
  },
  ["auto-82a008"] = {
    title = "자동 발견 조명 82a008",
    mood = "한낮 따뜻한 빛, 밝음",
    lighting = { Brightness = 4, ClockTime = 14.7, Ambient = Color3.fromRGB(52, 53, 59), OutdoorAmbient = Color3.fromRGB(60, 61, 67), ColorShift_Top = Color3.fromRGB(255, 173, 101), EnvironmentDiffuseScale = 0.55, EnvironmentSpecularScale = 0.25, ExposureCompensation = 0.15, ShadowSoftness = 0.92 },
    atmosphere = { Density = 0.3, Offset = 0.2, Color = Color3.fromRGB(255, 205, 165), Decay = Color3.fromRGB(255, 150, 110), Glare = 0.3, Haze = 1.6 },
    colorCorrection = { Brightness = 0.03, Contrast = 0.04, Saturation = 0.2, TintColor = Color3.fromRGB(255, 235, 215) },
    bloom = { Intensity = 0.5, Size = 32, Threshold = 0.95 },
    sunRays = { Intensity = 0.14, Spread = 0.8 },
  },
}
Kit.Order = { "storybook", "dark-fantasy", "cozy", "horror", "sci-fi", "wuxia", "bright-adventure", "auto-ddb25c", "auto-82a008" }
-- END GENERATED PRESETS

local PREFIX = "VibeLook"

local function setProps(instance, props)
  for key, value in pairs(props) do
    pcall(function()
      instance[key] = value
    end)
  end
end

local function ensure(className, name)
  local found = Lighting:FindFirstChild(name)
  if found and found:IsA(className) then
    return found
  end
  if found then
    found:Destroy()
  end
  local created = Instance.new(className)
  created.Name = name
  created.Parent = Lighting
  return created
end

-- 게임이 직접 만든(우리 이름이 아닌) 효과가 있으면 그 종류는 덮어쓰지 않는다.
local function gameOwns(className)
  for _, child in ipairs(Lighting:GetChildren()) do
    if child:IsA(className) and string.sub(child.Name, 1, #PREFIX) ~= PREFIX then
      return true
    end
  end
  return false
end

function Kit.List()
  return table.clone(Kit.Order)
end

function Kit.Get(id)
  return Kit.Presets[id]
end

-- opts.duration: 0보다 크면 조명 숫자·색을 그 시간 동안 부드럽게 바꾼다.
-- opts.respectGameEffects (기본 true): 게임이 만든 Atmosphere/Bloom 등은 그대로 둔다.
function Kit.Apply(id, opts)
  opts = opts or {}
  local preset = Kit.Presets[id]
  if not preset then
    warn("[LookKit] 알 수 없는 프리셋: " .. tostring(id))
    return false
  end
  local respect = opts.respectGameEffects ~= false
  local duration = tonumber(opts.duration) or 0

  if duration > 0 then
    local goal = {}
    local immediate = {}
    for key, value in pairs(preset.lighting) do
      if typeof(value) == "number" or typeof(value) == "Color3" then
        goal[key] = value
      else
        immediate[key] = value
      end
    end
    setProps(Lighting, immediate)
    pcall(function()
      TweenService:Create(Lighting, TweenInfo.new(duration), goal):Play()
    end)
  else
    setProps(Lighting, preset.lighting)
  end

  local function section(className, suffix, props)
    if not props or (respect and gameOwns(className)) then
      return
    end
    setProps(ensure(className, PREFIX .. suffix), props)
  end
  section("Atmosphere", "Atmosphere", preset.atmosphere)
  section("ColorCorrectionEffect", "Color", preset.colorCorrection)
  section("BloomEffect", "Bloom", preset.bloom)
  section("SunRaysEffect", "SunRays", preset.sunRays)
  section("DepthOfFieldEffect", "DepthOfField", preset.depthOfField)
  return true
end

-- 우리가 만든 효과만 지운다(게임의 것은 그대로).
function Kit.Clear()
  for _, child in ipairs(Lighting:GetChildren()) do
    if string.sub(child.Name, 1, #PREFIX) == PREFIX then
      child:Destroy()
    end
  end
end

return Kit
