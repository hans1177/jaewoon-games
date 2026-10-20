--!strict
-- Server-authoritative, regional weather FSM. Owned/ticked by Game.server, no separate loop.
local Players = game:GetService("Players")

export type WeatherType = "Clear" | "Sandstorm" | "Blizzard" | "Monsoon"
local WeatherSystem = {}
local currentByRegion: {[number]: WeatherType} = {}
local lastClimateChangeAt = os.clock()
local lastPlayerSyncAt = -1e9
local WEATHER_CYCLE_SECONDS = 60
local REGION_RADIUS = 32

local function climate(regionID: number): string
  if regionID == 2 or regionID == 6 or regionID == 17 then return "Desert" end
  if regionID == 12 or regionID == 23 or regionID == 24 then return "Cold" end
  if regionID == 7 or regionID == 8 or regionID == 19 then return "Monsoon" end
  return "Temperate"
end

local function rollWeather(regionID: number): WeatherType
  local regionClimate = climate(regionID)
  local roll = math.random(1, 100)
  if regionClimate == "Desert" then
    return if roll <= 48 then "Sandstorm" else "Clear"
  elseif regionClimate == "Cold" then
    return if roll <= 48 then "Blizzard" else "Clear"
  elseif regionClimate == "Monsoon" then
    return if roll <= 55 then "Monsoon" else "Clear"
  else
    return if roll <= 15 then "Monsoon" else "Clear"
  end
end

function WeatherSystem.Initialize(): ()
  for regionID = 1, 24 do currentByRegion[regionID] = "Clear" end
  lastClimateChangeAt = os.clock()
end

function WeatherSystem.Snapshot(): {[number]: WeatherType}
  local result: {[number]: WeatherType} = {}
  for regionID = 1, 24 do result[regionID] = currentByRegion[regionID] or "Clear" end
  return result
end

-- Called by existing server loop. Returns true only when the regional climate changes.
function WeatherSystem.Tick(now: number, centers: {[number]: Vector3}): boolean
  if now - lastPlayerSyncAt < 1 then return false end
  lastPlayerSyncAt = now
  local weatherChanged = false
  if now - lastClimateChangeAt >= WEATHER_CYCLE_SECONDS then
    lastClimateChangeAt = now
    for regionID = 1, 24 do
      local nextState = rollWeather(regionID)
      if currentByRegion[regionID] ~= nextState then weatherChanged = true end
      currentByRegion[regionID] = nextState
    end
  end
  for _, player in ipairs(Players:GetPlayers()) do
    if player:GetAttribute("CivReady") == true then
      local character = player.Character
      local root = if character then character:FindFirstChild("HumanoidRootPart") else nil
      local activeRegion: number? = nil
      local nearest = REGION_RADIUS
      if root and root:IsA("BasePart") then
        for regionID, center in pairs(centers) do
          local delta = root.Position - center
          local planarDistance = Vector2.new(delta.X, delta.Z).Magnitude
          if planarDistance < nearest then activeRegion = regionID; nearest = planarDistance end
        end
      end
      local currentWeather: WeatherType = if activeRegion then (currentByRegion[activeRegion] or "Clear") else "Clear"
      local raceID = player:GetAttribute("CivRaceID")
      -- Egypt mitigates desert severity by half; Russia is fully immune to blizzards.
      local mitigation = if raceID == 2 and currentWeather == "Sandstorm" then 0.5
        else if raceID == 24 and currentWeather == "Blizzard" then 1 else 0
      if player:GetAttribute("CivWeather") ~= currentWeather then
        player:SetAttribute("CivWeather", currentWeather)
      end
      if player:GetAttribute("CivWeatherMitigation") ~= mitigation then
        player:SetAttribute("CivWeatherMitigation", mitigation)
      end
      if player:GetAttribute("CivWeatherRegion") ~= (activeRegion or 0) then
        player:SetAttribute("CivWeatherRegion", activeRegion or 0)
      end
    end
  end
  return weatherChanged
end

WeatherSystem.Initialize()
return table.freeze(WeatherSystem)
