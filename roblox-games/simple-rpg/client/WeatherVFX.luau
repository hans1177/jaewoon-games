--!strict
-- Client-local viewport VFX pool: one camera anchor, three reusable emitters and one tint.
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local WeatherVFX = {}
local baseFogColor = Lighting.FogColor
local baseFogEnd = Lighting.FogEnd
local poolAnchor = Instance.new("Part")
poolAnchor.Name = "CivWeatherViewportPool"
poolAnchor.Size = Vector3.new(0.1, 0.1, 0.1)
poolAnchor.Transparency = 1
poolAnchor.Anchored = true
poolAnchor.CanCollide = false
poolAnchor.CanTouch = false
poolAnchor.CanQuery = false
local attachment = Instance.new("Attachment")
attachment.Name = "PooledWeatherParticles"
attachment.Parent = poolAnchor

local tint = Instance.new("ColorCorrectionEffect")
tint.Name = "CivWeatherTint"
tint.Enabled = false
tint.Parent = Lighting

local emitters: {[string]: ParticleEmitter} = {}
local activeWeather = "Clear"

local function emitterFor(weatherType: string, color: Color3, rate: number): ParticleEmitter
  local particle = Instance.new("ParticleEmitter")
  particle.Name = weatherType
  particle.Enabled = false
  particle.Texture = "rbxasset://textures/particles/sparkles_main.dds"
  particle.Color = ColorSequence.new(color)
  particle.Size = NumberSequence.new(0.18)
  particle.Transparency = NumberSequence.new({
    NumberSequenceKeypoint.new(0, 0.5),
    NumberSequenceKeypoint.new(0.7, 0.72),
    NumberSequenceKeypoint.new(1, 1),
  })
  particle.Lifetime = NumberRange.new(0.65, 1.25)
  particle.Speed = NumberRange.new(8, 14)
  particle.Rate = rate
  particle.SpreadAngle = Vector2.new(80, 80)
  particle.EmissionDirection = Enum.NormalId.Bottom
  particle.LightEmission = 0.1
  particle.LockedToPart = false
  particle.Parent = attachment
  emitters[weatherType] = particle
  return particle
end

emitterFor("Blizzard", Color3.fromRGB(229, 243, 255), 26)
emitterFor("Sandstorm", Color3.fromRGB(196, 158, 102), 24)
emitterFor("Monsoon", Color3.fromRGB(162, 193, 215), 35)

-- A constant-size pool follows only the visible camera, never the 24 entire worlds.
RunService.RenderStepped:Connect(function()
  if activeWeather == "Clear" then return end
  local camera = Workspace.CurrentCamera
  if camera then
    if poolAnchor.Parent ~= camera then poolAnchor.Parent = camera end
    poolAnchor.CFrame = camera.CFrame * CFrame.new(0, 3.5, -13)
  end
end)

function WeatherVFX.Apply(weatherType: string, mitigation: number): ()
  local valid = weatherType == "Sandstorm" or weatherType == "Blizzard" or weatherType == "Monsoon"
  activeWeather = if valid then weatherType else "Clear"
  local strength = 1 - math.clamp(if typeof(mitigation) == "number" then mitigation else 0, 0, 1)
  for mode, emitter in pairs(emitters) do
    emitter.Enabled = (activeWeather == mode and strength > 0)
    emitter.Rate = (mode == "Monsoon" and 35 or mode == "Blizzard" and 26 or 24) * strength
  end
  if activeWeather == "Clear" or strength <= 0 then
    tint.Enabled = false
    Lighting.FogColor = baseFogColor
    Lighting.FogEnd = baseFogEnd
    return
  end
  tint.Enabled = true
  if activeWeather == "Blizzard" then
    tint.TintColor = Color3.fromRGB(209, 228, 246)
    tint.Saturation = -0.22 * strength
    tint.Contrast = 0.08 * strength
    Lighting.FogColor = Color3.fromRGB(206, 226, 239)
    Lighting.FogEnd = math.min(baseFogEnd, 155 + 220 * (1 - strength))
  elseif activeWeather == "Sandstorm" then
    tint.TintColor = Color3.fromRGB(228, 197, 144)
    tint.Saturation = -0.12 * strength
    tint.Contrast = 0.04 * strength
    Lighting.FogColor = Color3.fromRGB(190, 150, 100)
    Lighting.FogEnd = math.min(baseFogEnd, 150 + 220 * (1 - strength))
  else
    tint.TintColor = Color3.fromRGB(194, 213, 236)
    tint.Saturation = -0.1 * strength
    tint.Contrast = -0.04 * strength
    Lighting.FogColor = Color3.fromRGB(142, 169, 188)
    Lighting.FogEnd = math.min(baseFogEnd, 210 + 230 * (1 - strength))
  end
end

return table.freeze(WeatherVFX)
