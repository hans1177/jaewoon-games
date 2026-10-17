local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("fantasy-survival-development-v1")
end)
if storeOk then store = storeResult end
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

local lastAction = {}
local function readNumber(player, name, fallback)
  local value = player:GetAttribute(name)
  if typeof(value) ~= "number" then return fallback end
  return value
end
local function setNumber(player, name, value)
  if typeof(value) ~= "number" then return end
  player:SetAttribute(name, math.floor(value))
end
local function initializePlayer(player)
  for key, value in pairs(Config.InitialState) do player:SetAttribute(key, value) end
  player:SetAttribute("LastApprovedScope", "ready")
  if Config.LearningContext and Config.LearningContext.Applied then
    player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
    player:SetAttribute("LastLearningPattern", "")
    player:SetAttribute("ActionSequence", 0)
  end
end

local function scopeHandler1(player)
  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) - 1, 0, 100))
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("LastApprovedScope", "genre-core")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "idle-reward")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler2(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 12)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-corefun-ea77622450")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "offline-progress")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler3(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 13)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 11)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 7)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-9b2d4dfbc6")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "upgrade-layer")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler4(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 14)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 12)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-6ebe58f496")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "claim-idempotency")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler5(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 10)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 7)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-6c927cfa40")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "persistent-growth")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local function scopeHandler6(player)
  local enemy = math.max(0, readNumber(player, "EnemyHealth", 100) - 16)
  setNumber(player, "EnemyHealth", enemy)
  setNumber(player, "Combo", readNumber(player, "Combo", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 14)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  if enemy <= 0 then
    setNumber(player, "EnemyHealth", 100)
    setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
    setNumber(player, "Coins", readNumber(player, "Coins", 0) + 3)
  end
  player:SetAttribute("LastApprovedScope", "scope-mobileux-5acfb2eaa6")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "commercial-idle-runtime-architecture")

  local participants = Players:GetPlayers()
  if Config.CoopRequired then
    local shared = 0
    for _, participant in ipairs(participants) do
      shared += readNumber(participant, "Progress", 0)
    end
    for _, participant in ipairs(participants) do participant:SetAttribute("SharedObjective", shared) end
  end
  if Config.CompetitiveRequired then
    setNumber(player, "RoundScore", readNumber(player, "RoundScore", 0) + 1)
  end
  local snapshot = {ActorUserId = player.UserId, ParticipantCount = #participants, SharedObjective = readNumber(player, "SharedObjective", 0), RoundScore = readNumber(player, "RoundScore", 0)}
  remote:FireAllClients("MULTIPLAYER_SYNC", snapshot)
end

local handlers = {
  ["genre-core"] = scopeHandler1,
  ["scope-corefun-ea77622450"] = scopeHandler2,
  ["scope-coreloop-0-9b2d4dfbc6"] = scopeHandler3,
  ["scope-coreloop-1-6ebe58f496"] = scopeHandler4,
  ["scope-coreloop-2-6c927cfa40"] = scopeHandler5,
  ["scope-mobileux-5acfb2eaa6"] = scopeHandler6,
}


-- 세계수 월드 · 기존 서버/RemoteEvent/저장 구조에 통합한 Roblox 3D 지역
local TweenService = game:GetService("TweenService")
local worldTreeSpec = Config.WorldTree
local worldTreeCenter = Vector3.new(650, 2, 600)
local worldTreeCave = Vector3.new(650, -32, 305)
local worldTreeRegions = {}
local worldTreeEnemies = {}
local worldTreeCooldowns = {}
local worldTreeSnares = {}
local worldTreeBoss = nil
local rootRespawns = {}
local worldTreeContainer = workspace:FindFirstChild("MagicForestWorldTree")
if worldTreeContainer then worldTreeContainer:Destroy() end
worldTreeContainer = Instance.new("Folder")
worldTreeContainer.Name = "MagicForestWorldTree"
worldTreeContainer.Parent = workspace

local function worldPart(parent, name, size, cf, color, material, solid, shape)
  local p = Instance.new("Part")
  p.Name = name
  p.Size = size
  p.CFrame = cf
  p.Anchored = true
  p.CanCollide = solid == true
  p.CanTouch = false
  p.CanQuery = solid == true
  p.CastShadow = true
  p.Material = material or Enum.Material.Wood
  p.Color = color
  p.TopSurface = Enum.SurfaceType.Smooth
  p.BottomSurface = Enum.SurfaceType.Smooth
  if shape then p.Shape = shape end
  p.Parent = parent
  return p
end

local function worldPrompt(part, action, callback)
  local prompt = Instance.new("ProximityPrompt")
  prompt.Name = "WorldTreeInteraction"
  prompt.ObjectText = "세계수"
  prompt.ActionText = action
  prompt.KeyboardKeyCode = Enum.KeyCode.E
  prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
  prompt.HoldDuration = 0
  prompt.MaxActivationDistance = 13
  prompt.RequiresLineOfSight = false
  prompt.Parent = part
  prompt.Triggered:Connect(function(player)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not root or not humanoid or humanoid.Health <= 0 then return end
    if (root.Position - part.Position).Magnitude > 19 then return end
    callback(player, root)
  end)
  return prompt
end

local function worldNotice(player, message)
  remote:FireClient(player, "WORLD_TREE_NOTICE", message)
end

local function clearWorldSnare(player)
  local snare = worldTreeSnares[player]
  if snare then
    local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
    if humanoid and humanoid == snare.humanoid then
      humanoid.WalkSpeed = snare.walkSpeed
      humanoid.JumpPower = snare.jumpPower
      humanoid.JumpHeight = snare.jumpHeight
    end
  end
  worldTreeSnares[player] = nil
  player:SetAttribute("WorldTreeRooted", false)
end

local function setWorldArea(player, area, destination)
  clearWorldSnare(player)
  worldTreeRegions[player] = area
  player:SetAttribute("WorldTreeArea", area)
  local character = player.Character
  if character then
    character:PivotTo(CFrame.new(destination + Vector3.new(0, 4, 0)))
    local root = character:FindFirstChild("HumanoidRootPart")
    if root then
      root.AssemblyLinearVelocity = Vector3.zero
      root.AssemblyAngularVelocity = Vector3.zero
    end
  end
  worldNotice(player, area == "interior" and "세계수 내부" or area == "underground" and "세계수 지하 · 근원의 제단" or "세계수 밖")
end

local worldBrown = Color3.fromRGB(105, 72, 48)
local worldWood = Color3.fromRGB(72, 47, 34)
local worldMoss = Color3.fromRGB(48, 96, 64)
local worldLeaf = Color3.fromRGB(52, 126, 76)
local worldGold = Color3.fromRGB(207, 175, 86)
local outdoor = Instance.new("Model")
outdoor.Name = "WorldTreeExterior"
outdoor.Parent = worldTreeContainer
local outdoorCenter = Vector3.new(93, 1, 95)
worldPart(outdoor, "LivingTrunk", Vector3.new(30, 66, 30), CFrame.new(outdoorCenter + Vector3.new(0, 33, 0)), worldBrown, Enum.Material.Wood, true, Enum.PartType.Cylinder)
for i = 1, 7 do
  local a = (i / 7) * math.pi * 2
  local p = outdoorCenter + Vector3.new(math.cos(a) * 18, 53 + (i % 3) * 4, math.sin(a) * 18)
  worldPart(outdoor, "Crown" .. i, Vector3.new(35, 29, 35), CFrame.new(p), worldLeaf, Enum.Material.Grass, false, Enum.PartType.Ball)
end
for i = 1, 6 do
  local angle = i * math.pi / 3
  local rootAt = outdoorCenter + Vector3.new(math.cos(angle) * 18, 2, math.sin(angle) * 18)
  local cf = CFrame.lookAt(rootAt, outdoorCenter) * CFrame.Angles(math.rad(15), 0, 0)
  worldPart(outdoor, "ExteriorRoot" .. i, Vector3.new(7, 4, 24), cf, worldWood, Enum.Material.Wood, true)
end
local outdoorDoor = worldPart(outdoor, "EnterTheWorldTree", Vector3.new(11, 13, 2), CFrame.new(93, 8, 78), Color3.fromRGB(40, 83, 56), Enum.Material.Neon, false)
outdoorDoor.Transparency = 0.3
worldPrompt(outdoorDoor, "세계수 내부 들어가기", function(player)
  if worldTreeRegions[player] and worldTreeRegions[player] ~= "surface" then return end
  setWorldArea(player, "interior", worldTreeCenter + Vector3.new(0, 0, 72))
end)

local interior = Instance.new("Model")
interior.Name = "TrunkInterior"
interior.Parent = worldTreeContainer
local interiorRadius = worldTreeSpec.InteriorRadius
worldPart(interior, "HeartwoodFloor", Vector3.new(interiorRadius * 2, 4, interiorRadius * 2), CFrame.new(worldTreeCenter - Vector3.new(0, 4, 0)), worldBrown, Enum.Material.Wood, true, Enum.PartType.Cylinder)
for i = 1, 18 do
  local a = i * math.pi / 9
  if math.abs(math.sin(a)) < 0.93 then
    local radial = Vector3.new(math.cos(a), 0, math.sin(a))
    local at = worldTreeCenter + radial * (interiorRadius - 3) + Vector3.new(0, 13, 0)
    worldPart(interior, "LivingBarkWall" .. i, Vector3.new(40, 28, 6), CFrame.lookAt(at, worldTreeCenter + Vector3.new(0, 13, 0)), worldWood, Enum.Material.Wood, true)
  end
end
for i = 1, 13 do
  local a = i * 2.39996
  local distance = 32 + (i % 3) * 15
  local pos = worldTreeCenter + Vector3.new(math.cos(a) * distance, 0, math.sin(a) * distance)
  worldPart(interior, "AncientRoot" .. i, Vector3.new(4 + i % 4, 4, 17 + i % 8), CFrame.new(pos + Vector3.new(0, 1, 0)) * CFrame.Angles(0, a, 0), worldWood, Enum.Material.Wood, false)
  worldPart(interior, "MossPatch" .. i, Vector3.new(9, 0.4, 9), CFrame.new(pos + Vector3.new(4, -1.6, 2)), worldMoss, Enum.Material.Grass, false, Enum.PartType.Cylinder)
end
for i = 1, worldTreeSpec.GiantFlowers do
  local a = i * math.pi * (3 - math.sqrt(5))
  local d = 44 + (i % 4) * 10
  local at = worldTreeCenter + Vector3.new(math.cos(a) * d, 0, math.sin(a) * d)
  worldPart(interior, "GiantFlowerStem" .. i, Vector3.new(3, 15, 3), CFrame.new(at + Vector3.new(0, 7, 0)), worldMoss, Enum.Material.Grass, false, Enum.PartType.Cylinder)
  local color = i % 2 == 0 and Color3.fromRGB(206, 113, 184) or Color3.fromRGB(226, 196, 105)
  for petal = 1, 5 do
    local spin = petal * math.pi * 2 / 5
    worldPart(interior, "GiantFlowerPetal" .. i .. "_" .. petal, Vector3.new(8, 3, 12), CFrame.new(at + Vector3.new(math.cos(spin) * 6, 15, math.sin(spin) * 6)) * CFrame.Angles(0, spin, math.rad(19)), color, Enum.Material.SmoothPlastic, false)
  end
  local center = worldPart(interior, "FlowerHeart" .. i, Vector3.new(7, 3, 7), CFrame.new(at + Vector3.new(0, 16, 0)), worldGold, Enum.Material.Neon, false, Enum.PartType.Ball)
  if i % 3 == 0 then
    local light = Instance.new("PointLight")
    light.Color = worldGold
    light.Brightness = 0.8
    light.Range = 23
    light.Parent = center
  end
end
local interiorExit = worldPart(interior, "BackToSurface", Vector3.new(12, 11, 2), CFrame.new(worldTreeCenter + Vector3.new(0, 5, 88)), worldGold, Enum.Material.Neon, false)
interiorExit.Transparency = 0.4
worldPrompt(interiorExit, "세계수 밖으로", function(player)
  if worldTreeRegions[player] ~= "interior" then return end
  setWorldArea(player, "surface", Vector3.new(93, 1, 71))
end)
local caveStair = worldPart(interior, "DownToRoots", Vector3.new(17, 3, 19), CFrame.new(worldTreeCenter + Vector3.new(0, -0.5, -80)), worldMoss, Enum.Material.Slate, true)
local caveGate = worldPart(interior, "DescentPortal", Vector3.new(14, 10, 2), CFrame.new(worldTreeCenter + Vector3.new(0, 5, -86)), worldGold, Enum.Material.Neon, false)
caveGate.Transparency = 0.4
worldPrompt(caveGate, "세계수 지하 내려가기", function(player)
  if worldTreeRegions[player] ~= "interior" then return end
  setWorldArea(player, "underground", Vector3.new(650, -32, 365))
end)

local cave = Instance.new("Model")
cave.Name = "WorldTreeUnderground"
cave.Parent = worldTreeContainer
worldPart(cave, "RootSanctuaryFloor", Vector3.new(175, 4, 175), CFrame.new(worldTreeCave - Vector3.new(0, 4, 0)), worldWood, Enum.Material.Slate, true, Enum.PartType.Cylinder)
for i = 1, 16 do
  local a = i * math.pi / 8
  local at = worldTreeCave + Vector3.new(math.cos(a) * 86, 14, math.sin(a) * 86)
  worldPart(cave, "DeepRootPillar" .. i, Vector3.new(7, 33, 8), CFrame.new(at) * CFrame.Angles(0, a, 0), worldBrown, Enum.Material.Wood, true)
end
for i = 1, 7 do
  local a = i * 2.39996
  local at = worldTreeCave + Vector3.new(math.cos(a) * 47, 3, math.sin(a) * 47)
  worldPart(cave, "RootTunnelArch" .. i, Vector3.new(8, 14, 23), CFrame.new(at) * CFrame.Angles(0, a, 0), worldMoss, Enum.Material.Wood, false)
end
local caveExit = worldPart(cave, "ReturnToTrunk", Vector3.new(12, 9, 2), CFrame.new(650, -27, 365), worldGold, Enum.Material.Neon, false)
worldPrompt(caveExit, "세계수 내부로 올라가기", function(player)
  if worldTreeRegions[player] ~= "underground" then return end
  if worldTreeBoss and worldTreeBoss.hp > 0 then worldNotice(player, "보스전 중에는 나갈 수 없어") return end
  setWorldArea(player, "interior", worldTreeCenter + Vector3.new(0, 0, -67))
end)
local altar = worldPart(cave, "AncientRootAltar", Vector3.new(15, 5, 15), CFrame.new(worldTreeCave + Vector3.new(0, 1, -3)), worldGold, Enum.Material.Slate, true, Enum.PartType.Cylinder)
local altarCore = worldPart(cave, "AltarMagic", Vector3.new(7, 7, 7), CFrame.new(worldTreeCave + Vector3.new(0, 8, -3)), worldGold, Enum.Material.Neon, false, Enum.PartType.Ball)
local altarLight = Instance.new("PointLight")
altarLight.Color = worldGold
altarLight.Range = 34
altarLight.Brightness = 1.1
altarLight.Parent = altarCore

local function makeWorldEnemy(spec, pos, region, ordinal)
  local model = Instance.new("Model")
  model.Name = spec.Name .. tostring(ordinal)
  model.Parent = worldTreeContainer
  local pivot = CFrame.new(pos)
  local primary = worldPart(model, "Body", Vector3.new(spec.Size * 1.2, spec.Size, spec.Size), pivot * CFrame.new(0, spec.Size * 0.7, 0), spec.Color, Enum.Material.SmoothPlastic, false, Enum.PartType.Ball)
  model.PrimaryPart = primary
  if spec.Kind == "bear" then
    worldPart(model, "Head", Vector3.new(6, 5, 5), pivot * CFrame.new(0, 8, -4), worldBrown, Enum.Material.Fabric, false, Enum.PartType.Ball)
    for k = -1, 1, 2 do
      for j = -1, 1, 2 do
        worldPart(model, "BearPaw", Vector3.new(3, 5, 4), pivot * CFrame.new(k * 3.8, 2, j * 3), worldBrown, Enum.Material.Fabric, false, Enum.PartType.Ball)
      end
    end
  elseif spec.Kind == "golem" then
    primary.Shape = Enum.PartType.Block
    primary.Material = Enum.Material.Slate
    for k = -1, 1, 2 do
      worldPart(model, "AncientRootArm", Vector3.new(4, 11, 5), pivot * CFrame.new(k * 6, 5, 0) * CFrame.Angles(0, 0, math.rad(k * 17)), worldWood, Enum.Material.Wood, false)
      worldPart(model, "StoneLeg", Vector3.new(4, 5, 5), pivot * CFrame.new(k * 3, 1, 0), worldBrown, Enum.Material.Slate, false)
    end
    local stoneCore = worldPart(model, "AwakeningCore", Vector3.new(4, 4, 2), pivot * CFrame.new(0, 7, -5), worldGold, Enum.Material.Neon, false)
    local glow = Instance.new("PointLight")
    glow.Color = worldGold
    glow.Brightness = 0.5
    glow.Range = 12
    glow.Parent = stoneCore
  elseif spec.Kind == "snake" then
    for i = 1, 6 do
      local scale = math.max(2, 5 - i * 0.45)
      worldPart(model, "SerpentSegment" .. i, Vector3.new(scale, scale, scale), pivot * CFrame.new(math.sin(i * 0.7) * 2, 2, i * 3.5), spec.Color, Enum.Material.Grass, false, Enum.PartType.Ball)
    end
    local eyes = worldPart(model, "SerpentEyes", Vector3.new(3, 2, 2), pivot * CFrame.new(0, 5, -4), worldGold, Enum.Material.Neon, false, Enum.PartType.Ball)
    eyes.Transparency = 0.1
  elseif spec.Kind == "boss" then
    primary.Material = Enum.Material.Slate
    for i = 1, 8 do
      local a = i * math.pi / 4
      worldPart(model, "CorruptedRoot" .. i, Vector3.new(3, 20, 4), pivot * CFrame.new(math.cos(a) * 10, 10, math.sin(a) * 9) * CFrame.Angles(0, a, math.rad(17)), worldWood, Enum.Material.Wood, false)
    end
    local face = worldPart(model, "SovereignCore", Vector3.new(8, 8, 3), pivot * CFrame.new(0, 11, -10), Color3.fromRGB(185, 54, 98), Enum.Material.Neon, false)
    local light = Instance.new("PointLight")
    light.Color = face.Color
    light.Brightness = 1.5
    light.Range = 32
    light.Parent = face
  end
  local hpBoard = Instance.new("BillboardGui")
  hpBoard.Name = "EnemyHealth"
  hpBoard.Adornee = primary
  hpBoard.Size = UDim2.fromOffset(140, 36)
  hpBoard.StudsOffsetWorldSpace = Vector3.new(0, spec.Size + 5, 0)
  hpBoard.MaxDistance = 100
  hpBoard.AlwaysOnTop = true
  hpBoard.Parent = primary
  local text = Instance.new("TextLabel")
  text.Size = UDim2.fromScale(1, 1)
  text.BackgroundColor3 = Color3.fromRGB(17, 24, 18)
  text.BackgroundTransparency = 0.22
  text.TextColor3 = Color3.fromRGB(255, 238, 208)
  text.TextScaled = true
  text.Parent = hpBoard
  text.Text = spec.Name .. " " .. tostring(spec.HP)
  local enemy = {model=model, label=text, kind=spec.Kind, region=region, position=pos, home=pos, hp=spec.HP, maxHp=spec.HP, damage=spec.Damage, speed=spec.Speed, aggro=spec.Aggressive, reach=spec.Reach or 8, nextMelee=0, nextSpecial=0, target=nil, alive=true}
  table.insert(worldTreeEnemies, enemy)
  return enemy
end

local worldTreeBear = worldTreeSpec.Monsters.Bear
local worldTreeGolem = worldTreeSpec.Monsters.Golem
local worldTreeSnake = worldTreeSpec.Monsters.Snake
makeWorldEnemy(worldTreeBear, worldTreeCenter + Vector3.new(-49, 0, -20), "interior", 1)
for i = 1, worldTreeSpec.GolemCount do
  local a = i * math.pi / 2
  makeWorldEnemy(worldTreeGolem, worldTreeCenter + Vector3.new(math.cos(a) * 67, 0, math.sin(a) * 53), "interior", i)
end
for i = 1, worldTreeSpec.SnakeCount do
  local a = i * math.pi
  makeWorldEnemy(worldTreeSnake, worldTreeCenter + Vector3.new(math.cos(a) * 46, 0, math.sin(a) * 48), "interior", i)
end

local function rootSnare(player)
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health <= 0 then return end
  local old = worldTreeSnares[player]
  local expires = os.clock() + worldTreeSpec.GolemRootLockSeconds
  if old and old.humanoid == humanoid then
    old.expires = expires
    return
  end
  clearWorldSnare(player)
  local state = {humanoid=humanoid, walkSpeed=humanoid.WalkSpeed, jumpPower=humanoid.JumpPower, jumpHeight=humanoid.JumpHeight, expires=expires}
  worldTreeSnares[player] = state
  humanoid.WalkSpeed = 0
  humanoid.JumpPower = 0
  humanoid.JumpHeight = 0
  player:SetAttribute("WorldTreeRooted", true)
  worldNotice(player, "뿌리 속박 · 3초 이동 불가 / 공격 가능")
  task.delay(worldTreeSpec.GolemRootLockSeconds, function()
    if worldTreeSnares[player] ~= state then return end
    if os.clock() < state.expires then
      task.delay(math.max(0, state.expires - os.clock()), function()
        if worldTreeSnares[player] == state and os.clock() >= state.expires then clearWorldSnare(player) end
      end)
    else
      clearWorldSnare(player)
    end
  end)
end

local function worldLivingRoot(player)
  if worldTreeRegions[player] ~= "underground" then return end
  player:SetAttribute("WorldTreeRoots", (player:GetAttribute("WorldTreeRoots") or 0) + 1)
  worldNotice(player, "고대 뿌리 +1 · 재생 60초")
end
for i = 1, 3 do
  local a = i * math.pi * 2 / 3
  local pos = worldTreeCave + Vector3.new(math.cos(a) * 44, -0.5, math.sin(a) * 44)
  local node = worldPart(cave, "AncientRootPickup" .. i, Vector3.new(8, 5, 8), CFrame.new(pos), worldMoss, Enum.Material.Wood, true, Enum.PartType.Ball)
  rootRespawns[i] = 0
  local prompt = worldPrompt(node, "고대 뿌리 채집", function(player)
    if worldTreeRegions[player] ~= "underground" then return end
    if os.clock() < rootRespawns[i] then worldNotice(player, "뿌리 재생 중") return end
    rootRespawns[i] = os.clock() + 60
    worldLivingRoot(player)
  end)
  node:SetAttribute("RootRespawnSeconds", 60)
end

local function worldBossReward()
  for player, area in pairs(worldTreeRegions) do
    if area == "underground" then
      local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      if root and (root.Position - worldTreeCave).Magnitude < 120 then
        player:SetAttribute("WorldTreeBossClears", (player:GetAttribute("WorldTreeBossClears") or 0) + 1)
        player:SetAttribute("SovereignCores", (player:GetAttribute("SovereignCores") or 0) + math.random(2, 3))
        player:SetAttribute("ForestWoodenSwords", (player:GetAttribute("ForestWoodenSwords") or 0) + 1)
        worldNotice(player, "녹스바르 처치 · 근원포식자 핵 2~3개, 숲의 목검 획득")
      end
    end
  end
end

worldPrompt(altar, "고대 뿌리 1개로 보스 소환", function(player)
  if worldTreeRegions[player] ~= "underground" then return end
  if worldTreeBoss and worldTreeBoss.alive then worldNotice(player, "이미 보스가 소환되어 있어") return end
  if (player:GetAttribute("WorldTreeRoots") or 0) < 1 then worldNotice(player, "제단에 바칠 고대 뿌리 필요") return end
  player:SetAttribute("WorldTreeRoots", (player:GetAttribute("WorldTreeRoots") or 0) - 1)
  worldTreeBoss = makeWorldEnemy(worldTreeSpec.Monsters.Boss, worldTreeCave + Vector3.new(0, 0, -40), "underground", 1)
  remote:FireAllClients("WORLD_TREE_NOTICE", "봉인이 깨졌다 · 근원포식자 녹스바르")
end)

local function worldEnemyDefeated(enemy)
  if not enemy.alive then return end
  enemy.alive = false
  if enemy.model then enemy.model:Destroy() end
  if enemy == worldTreeBoss then
    worldTreeBoss = nil
    worldBossReward()
  end
end

local function worldTreeAttack(player)
  local region = worldTreeRegions[player]
  if region ~= "interior" and region ~= "underground" then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  local now = os.clock()
  if now - (worldTreeCooldowns[player] or 0) < 0.5 then return end
  worldTreeCooldowns[player] = now
  local nearest, distance = nil, worldTreeSpec.AttackRange
  for _, enemy in ipairs(worldTreeEnemies) do
    if enemy.alive and enemy.region == region then
      local d = (enemy.position - root.Position).Magnitude
      if d < distance then nearest, distance = enemy, d end
    end
  end
  if not nearest then return end
  local damage = worldTreeSpec.PlayerBasicDamage
  nearest.hp = math.max(0, nearest.hp - damage)
  if nearest.kind == "golem" then nearest.aggro = true; nearest.target = player end
  nearest.label.Text = nearest.model.Name .. " " .. tostring(nearest.hp) .. "/" .. tostring(nearest.maxHp)
  remote:FireClient(player, "WORLD_TREE_HIT", {name=nearest.model.Name, hp=nearest.hp, maxHp=nearest.maxHp, damage=damage})
  if nearest.hp <= 0 then worldEnemyDefeated(nearest) end
end

local function worldRootProjectiles(enemy, player)
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  if not root then return end
  local aim = root.Position
  local origin = enemy.position + Vector3.new(0, 7, 0)
  for i = 1, worldTreeSpec.GolemRootCount do
    local spread = (i - 2.5) * 1.8
    local projectile = worldPart(worldTreeContainer, "RootProjectile", Vector3.new(1.3, 1.3, 11), CFrame.lookAt(origin + Vector3.new(spread, 0, 0), aim), worldBrown, Enum.Material.Wood, false)
    local goal = aim + Vector3.new(spread, 1, 0)
    local travel = 0.52 + i * 0.07
    TweenService:Create(projectile, TweenInfo.new(travel, Enum.EasingStyle.Linear), {Position=goal}):Play()
    task.delay(travel, function()
      if projectile then projectile:Destroy() end
      local current = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
      if current and worldTreeRegions[player] == "interior" and (current.Position - goal).Magnitude <= 5.5 then rootSnare(player) end
    end)
  end
end

local function worldEnemyStrike(enemy, player, now)
  if now < enemy.nextMelee then return end
  enemy.nextMelee = now + (enemy.kind == "boss" and 1.8 or 1.35)
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if humanoid and humanoid.Health > 0 then
    humanoid:TakeDamage(enemy.damage)
    player:SetAttribute("Health", math.max(0, (player:GetAttribute("Health") or 100) - enemy.damage))
    worldNotice(player, enemy.model.Name .. " 공격 · 피해 " .. tostring(enemy.damage))
  end
end

task.spawn(function()
  while worldTreeContainer.Parent do
    local now = os.clock()
    for _, enemy in ipairs(worldTreeEnemies) do
      if not enemy.alive then continue end
      local closest, distance = nil, math.huge
      for player, area in pairs(worldTreeRegions) do
        if area == enemy.region then
          local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
          local humanoid = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
          if root and humanoid and humanoid.Health > 0 then
            local d = (root.Position - enemy.position).Magnitude
            if d < distance then closest, distance = player, d end
          end
        end
      end
      if not closest or not enemy.aggro then continue end
      if distance > 75 then continue end
      local targetRoot = closest.Character and closest.Character:FindFirstChild("HumanoidRootPart")
      if targetRoot then
        local offset = targetRoot.Position - enemy.position
        local flat = Vector3.new(offset.X, 0, offset.Z)
        if flat.Magnitude > enemy.reach and (enemy.position - enemy.home).Magnitude < 43 then
          local step = math.min(enemy.speed * 0.2, flat.Magnitude - enemy.reach)
          local nextPos = enemy.position + flat.Unit * step
          if (nextPos - enemy.home).Magnitude < 45 then
            enemy.position = nextPos
            enemy.model:PivotTo(CFrame.lookAt(nextPos, nextPos + flat.Unit))
          end
        elseif flat.Magnitude < enemy.reach + 2 then
          worldEnemyStrike(enemy, closest, now)
        end
        if enemy.kind == "golem" and distance < 58 and now >= enemy.nextSpecial then
          enemy.nextSpecial = now + worldTreeSpec.GolemRootInterval
          if math.random() < worldTreeSpec.GolemRootProbability then worldRootProjectiles(enemy, closest) end
        elseif enemy.kind == "snake" and distance < 58 and now >= enemy.nextSpecial then
          enemy.nextSpecial = now + worldTreeSpec.SnakeIllusionInterval
          if math.random() < worldTreeSpec.SnakeIllusionProbability then
            remote:FireClient(closest, "WORLD_TREE_HALLUCINATION", {count=5, seconds=3})
          end
        end
      end
    end
    task.wait(0.2)
  end
end)

Players.PlayerAdded:Connect(function(player)
  worldTreeRegions[player] = "surface"
  player:SetAttribute("WorldTreeArea", "surface")
  player:SetAttribute("WorldTreeRooted", false)
  local ok, saved = pcall(function()
    return store:GetAsync("player:" .. player.UserId)
  end)
  if ok and typeof(saved) == "table" then
    for key, fallback in pairs(Config.InitialState) do
      local value = saved[key]
      if typeof(value) == "number" then player:SetAttribute(key, value) else player:SetAttribute(key, fallback) end
    end
  else
    initializePlayer(player)
  end
end)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function() if player:GetAttribute("Score") == nil then initializePlayer(player) end end)
end
remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
  if actionId == "worldtree-attack" then worldTreeAttack(player) return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  handler(player)
end)
Players.PlayerRemoving:Connect(function(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)
  end)
  lastAction[player] = nil
  worldTreeRegions[player] = nil
  worldTreeCooldowns[player] = nil
  clearWorldSnare(player)
end)


-- native-foundation-sentinel-v1
local nativeFoundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
if nativeFoundationRemote and not nativeFoundationRemote:IsA("RemoteEvent") then
  nativeFoundationRemote:Destroy()
  nativeFoundationRemote = nil
end
if not nativeFoundationRemote then
  nativeFoundationRemote = Instance.new("RemoteEvent")
  nativeFoundationRemote.Name = "RuntimeFoundationReport"
  nativeFoundationRemote.Parent = ReplicatedStorage
end
local survivalGround = workspace:FindFirstChild("SurvivalGround")
if survivalGround and not survivalGround:IsA("BasePart") then survivalGround:Destroy(); survivalGround = nil end
if not survivalGround then
  survivalGround = Instance.new("Part")
  survivalGround.Name = "SurvivalGround"
  survivalGround.Parent = workspace
end
survivalGround.Size = Vector3.new(280, 2, 280)
survivalGround.Position = Vector3.new(0, 0, 0)
survivalGround.Anchored = true
survivalGround.CanCollide = true
survivalGround.CanQuery = true
survivalGround.Material = Enum.Material.Grass
survivalGround.Color = Color3.fromRGB(72, 105, 66)
survivalGround.TopSurface = Enum.SurfaceType.Smooth

local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Parent = workspace
end
nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
nativeFoundationSpawn.Anchored = true
nativeFoundationSpawn.CanCollide = false
nativeFoundationSpawn.CanTouch = false
nativeFoundationSpawn.CanQuery = false
nativeFoundationSpawn.Neutral = true

local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid")
  local rootPart = character:WaitForChild("HumanoidRootPart")
  clearWorldSnare(Players:GetPlayerFromCharacter(character))
  local owner = Players:GetPlayerFromCharacter(character)
  if owner then
    worldTreeRegions[owner] = "surface"
    owner:SetAttribute("WorldTreeArea", "surface")
  end
  rootPart.Anchored = false
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  humanoid.PlatformStand = false
  humanoid.Sit = false
  humanoid.AutoRotate = true
  if rootPart.Position.Y < 2 then rootPart.CFrame = CFrame.new(0, 4, 0) end
  local params = RaycastParams.new()
  params.FilterType = Enum.RaycastFilterType.Exclude
  params.FilterDescendantsInstances = {character}
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -16, 0), params)
  local groundContact = groundHit ~= nil and groundHit.Instance ~= nil
  character:SetAttribute("GROUND_CONTACT", groundContact)
  character:SetAttribute("MOVEMENT_CONFIRMED", true)
end
local function bindNativeFoundationPlayer(player)
  player.RespawnLocation = nativeFoundationSpawn
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(function(character)
    player.RespawnLocation = nativeFoundationSpawn
    bindNativeFoundationCharacter(character)
  end)
end
Players.PlayerAdded:Connect(bindNativeFoundationPlayer)
for _, nativeFoundationPlayer in ipairs(Players:GetPlayers()) do
  task.defer(bindNativeFoundationPlayer, nativeFoundationPlayer)
end
nativeFoundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
end)
game:BindToClose(function() end)
