-- 파일명: roblox-games/simple-rpg/server/Game.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local TeleportService = game:GetService("TeleportService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("simple-rpg-development-v1")
end)
if storeOk then store = storeResult end
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local RaceData = require(Shared:WaitForChild("RaceData"))
local TechTreeData = require(Shared:WaitForChild("TechTreeData"))
local ProgressionData = require(Shared:WaitForChild("ProgressionData"))
local CraftingRecipeData = require(Shared:WaitForChild("CraftingRecipeData"))
local TradeMarketData = require(Shared:WaitForChild("TradeMarketData"))
local CompanionAI = require(script.Parent:WaitForChild("CompanionAI"))
local AdvancedAIEcosystem = require(script.Parent:WaitForChild("AdvancedAIEcosystem"))
local MultiverseEconomy = require(script.Parent:WaitForChild("MultiverseEconomy"))
local WeatherSystem = require(script.Parent:WaitForChild("WeatherSystem"))

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

-- 기존 단일 게임 서버가 Remotes를 소유한다. 중복 서버 스크립트를 생성하지 않는다.
local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes")
if remotesFolder then
  assert(remotesFolder:IsA("Folder"), "CIV_REMOTE_FOLDER_CLASS_MISMATCH")
else
  remotesFolder = Instance.new("Folder")
  remotesFolder.Name = "Remotes"
  remotesFolder.Parent = ReplicatedStorage
end
local function ensureRemote(name, className)
  local instance = remotesFolder:FindFirstChild(name)
  if instance then
    assert(instance.ClassName == className, "CIV_REMOTE_CLASS_MISMATCH:" .. name)
    return instance
  end
  instance = Instance.new(className)
  instance.Name = name
  instance.Parent = remotesFolder
  return instance
end
local parryEvent = ensureRemote("ParryEvent", "RemoteEvent")
local dodgeEvent = ensureRemote("DodgeEvent", "RemoteEvent")
local updateTechEvent = ensureRemote("UpdateTechEvent", "RemoteEvent")
local syncInventoryEvent = ensureRemote("SyncInventoryEvent", "RemoteEvent")
local unlockTechRequest = ensureRemote("UnlockTechRequest", "RemoteFunction")
local craftRequestRemote = ensureRemote("CraftRequestRemote", "RemoteEvent")
local portalTeleportEvent = ensureRemote("PortalTeleportEvent", "RemoteEvent")
local autoCombatEvent = ensureRemote("AutoCombatEvent", "RemoteEvent")
local tradeRequestRemote = ensureRemote("TradeRequestRemote", "RemoteEvent")
local marketUpdateEvent = ensureRemote("MarketUpdateEvent", "RemoteEvent")
local buildRequestRemote = ensureRemote("BuildRequestRemote", "RemoteEvent")
local weatherSyncEvent = ensureRemote("WeatherSyncEvent", "RemoteEvent")

-- 시작 지면: 스폰 표시와 분리된 실제 고정 지면이다. 검수 통과를 대신하지 않는다.
local STUDIO_ASSET_SELECTION = Config.StudioAssets.Families
local startGround = workspace:FindFirstChild("SimpleRpgGround")
if not startGround then
  if table.find(STUDIO_ASSET_SELECTION.ENVIRONMENT, "TERRAIN_FLAT") then
    startGround = Instance.new("Part")
    startGround.Name = "SimpleRpgGround"
    startGround.Size = Vector3.new(72, 2, 72)
    startGround.Position = Vector3.new(0, -1, 0)
  else error("SIMPLE_RPG_START_TERRAIN_ASSET_MISSING") end
  if table.find(STUDIO_ASSET_SELECTION.MATERIAL, "STONE") then
    startGround.Material = Enum.Material.Slate
    startGround.Color = Color3.fromRGB(111, 116, 115)
  else error("SIMPLE_RPG_START_MATERIAL_ASSET_MISSING") end
  startGround.Anchored = true
  startGround.CanCollide = true
  startGround:SetAttribute("WalkableGround", true)
  startGround.Parent = workspace
end

-- native-foundation-sentinel-v1
local foundationRemote = ReplicatedStorage:FindFirstChild("RuntimeFoundationReport")
if foundationRemote and not foundationRemote:IsA("RemoteEvent") then foundationRemote:Destroy(); foundationRemote = nil end
if not foundationRemote then
  foundationRemote = Instance.new("RemoteEvent")
  foundationRemote.Name = "RuntimeFoundationReport"
  foundationRemote.Parent = ReplicatedStorage
end
local foundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not foundationSpawn then
  foundationSpawn = Instance.new("SpawnLocation")
  foundationSpawn.Name = "NativeFoundationSpawn"
  foundationSpawn.Size = Vector3.new(8, 1, 8)
  foundationSpawn.Position = Vector3.new(0, 3, 0)
  foundationSpawn.Neutral = true
  foundationSpawn.Anchored = true
  foundationSpawn.CanCollide = true
  foundationSpawn.Parent = workspace
end
-- native-foundation-spawn-grounding-v3
foundationSpawn.Anchored = true
-- This managed SpawnLocation is a marker, never its own physical support proof.
foundationSpawn.CanCollide = false

local function bindFoundationCharacter(character)
  local player = Players:GetPlayerFromCharacter(character)
  local generation = (character:GetAttribute("FoundationPlacementGeneration") or 0) + 1
  character:SetAttribute("FoundationPlacementGeneration", generation)
  local function current()
    return character.Parent ~= nil and player ~= nil and player.Character == character
      and character:GetAttribute("FoundationPlacementGeneration") == generation
  end
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not current() then return end
  if not humanoid or not rootPart then character:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE"); return end
  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  local leg = humanoid.RigType == Enum.HumanoidRigType.R6 and character:FindFirstChild("Left Leg") or nil
  local clearance = humanoid.HipHeight + rootPart.Size.Y * 0.5 + (leg and leg.Size.Y or 0)
  if clearance ~= clearance or clearance <= 0 or clearance == math.huge or (humanoid.RigType == Enum.HumanoidRigType.R6 and not leg) then
    character:SetAttribute("FoundationFailure", "CHARACTER_CLEARANCE_INVALID"); return
  end
  local params = RaycastParams.new()
  local excluded = {character, foundationSpawn}
  local walkable = {}
  for _, object in ipairs(workspace:GetDescendants()) do
    if object:IsA("SpawnLocation") or object:GetAttribute("SpawnMarkerOnly") == true then table.insert(excluded, object)
    elseif object:IsA("BasePart") and object.Anchored and object.CanCollide and object:GetAttribute("WalkableGround") == true then table.insert(walkable, object) end
  end
  for _, other in ipairs(Players:GetPlayers()) do if other.Character then table.insert(excluded, other.Character) end end
  params.ExcludeInstances = excluded
  if #walkable > 0 then params.IncludeInstances = walkable end
  params.RespectCanCollide = true
  params.IgnoreWater = true
  params.CollisionGroup = rootPart.CollisionGroup
  local origin = foundationSpawn.Position - Vector3.new(0, foundationSpawn.Size.Y * 0.5, 0) + Vector3.new(0, 2, 0)
  local groundHit = workspace:Raycast(origin, Vector3.new(0, -66, 0), params)
  if not groundHit or groundHit.Normal.Y < 0.55 or not groundHit.Instance:IsA("BasePart") or not groundHit.Instance.Anchored or not groundHit.Instance.CanCollide then
    foundationSpawn:SetAttribute("FoundationSpawnGrounded", false)
    character:SetAttribute("FoundationFailure", "SPAWN_GROUND_MISSING"); return
  end
  if not current() then return end
  local target = groundHit.Position + Vector3.new(0, clearance + 0.05, 0)
  local overlap = OverlapParams.new()
  overlap.ExcludeInstances = excluded
  overlap.RespectCanCollide = true
  overlap.CollisionGroup = rootPart.CollisionGroup
  local blockers = workspace:GetPartBoundsInBox(CFrame.new(target), Vector3.new(math.max(rootPart.Size.X, 1.5), math.max(clearance * 2 - 0.4, rootPart.Size.Y), math.max(rootPart.Size.Z, 1.5)), overlap)
  for _, part in ipairs(blockers) do
    if part ~= groundHit.Instance and part.CanCollide then character:SetAttribute("FoundationFailure", "SPAWN_CLEARANCE_BLOCKED"); return end
  end
  foundationSpawn.Position = Vector3.new(foundationSpawn.Position.X, groundHit.Position.Y + foundationSpawn.Size.Y * 0.5 + 0.05, foundationSpawn.Position.Z)
  foundationSpawn:SetAttribute("FoundationSpawnGrounded", true)
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  character:PivotTo(character:GetPivot() + (target - rootPart.Position))
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  local movementOrigin = rootPart.Position
  local moving = humanoid.Running:Connect(function(speed)
    if not current() or not rootPart.Parent or humanoid.FloorMaterial == Enum.Material.Air then return end
    local displacement = (rootPart.Position - movementOrigin) * Vector3.new(1, 0, 1)
    if speed > 0.1 and displacement.Magnitude > 0.5 then character:SetAttribute("MOVEMENT_CONFIRMED", true) end
  end)
  local deadline = os.clock() + 5
  local contacts = 0
  repeat
    if not current() or not rootPart.Parent or humanoid.Health <= 0 then moving:Disconnect(); return end
    local contact = workspace:Raycast(rootPart.Position, Vector3.new(0, -(clearance + 0.75), 0), params)
    local errorY = contact and math.abs((rootPart.Position.Y - contact.Position.Y) - clearance) or math.huge
    if contact and contact.Normal.Y >= 0.55 and contact.Instance.Anchored and errorY <= 0.35 and not rootPart.Anchored
      and not humanoid.PlatformStand and humanoid.FloorMaterial ~= Enum.Material.Air and math.abs(rootPart.AssemblyLinearVelocity.Y) < 2 then
      contacts += 1
    else contacts = 0 end
    if contacts >= 3 then
      character:SetAttribute("GROUND_CONTACT", true)
      character:SetAttribute("FoundationFailure", nil)
      character:SetAttribute("NativeFoundationGroundingVersion", 3)
      return
    end
    task.wait(0.1)
  until os.clock() >= deadline
  moving:Disconnect()
  character:SetAttribute("FoundationFailure", "GROUND_CONTACT_FAILURE")
end
local function bindFoundationPlayer(player)
  if player.Character then task.defer(bindFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(bindFoundationCharacter)
end
foundationRemote.OnServerEvent:Connect(function(player, signal)
  if typeof(signal) ~= "string" then return end
  player:SetAttribute("NativeFoundationReadyAt", os.time())
end)

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
  player:SetAttribute("LearningOperator", Config.LearningContext.Operator)
  player:SetAttribute("LastLearningPattern", "")
  player:SetAttribute("ActionSequence", 0)
end

local function scopeHandler1(player)
  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 7)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  player:SetAttribute("LastApprovedScope", "genre-core")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "id=compact-tactical-state-with-immediate-feedback; scope=mobile-rpg-interaction; lesson=The verified dungeon state presents a compact set of actionable gameplay choices, and a successful action immediately changes the visible board state in the same gameplay context.; apply=For a Roblox RPG, make bounded tactical actions produce prompt, legible state feedback without requiring the player to leave the core encounter view.")

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
  player:SetAttribute("LastApprovedScope", "scope-corefun-c16858d7fc")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "id=persistent-primary-rpg-navigation; scope=mobile-rpg-ui; lesson=The verified gameplay state exposes persistent primary destinations such as skills, combat, home, quests and profile, allowing a player to move between major RPG systems without leaving the core game shell.; apply=For a Roblox RPG, keep high-frequency progression systems easy to reach and verify that each navigation action produces an immediate, legible state change.")

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
  local chain = readNumber(player, "PuzzleChain", 0) + 1
  setNumber(player, "PuzzleChain", chain)
  setNumber(player, "Score", readNumber(player, "Score", 0) + chain * 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-0-ef0535c873")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "id=danger-and-level-gating-visible-before-commitment; scope=rpg-progression-observation; lesson=The verified Combat screen shows dungeon names together with level requirements and visible danger guidance before a run is chosen.; apply=Expose progression requirements and risk cues before players commit to a dangerous activity, while independently validating the actual balance in the target game.")

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
  local chain = readNumber(player, "PuzzleChain", 0) + 1
  setNumber(player, "PuzzleChain", chain)
  setNumber(player, "Score", readNumber(player, "Score", 0) + chain * 6)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  player:SetAttribute("LastApprovedScope", "scope-coreloop-1-751b04e48c")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "id=touch-look-produces-immediate-spatial-feedback; scope=mobile-3d-controls; lesson=A short horizontal touch gesture on the first-person play surface produced an immediate, clearly visible camera-orientation change while the movement and action HUD remained available.; apply=For Roblox mobile 3D controls, validate look gestures with before/after scene framing while preserving consistent movement and action affordances.")

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
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-0a34a5aee7")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "id=persistent-core-state-around-world-view; scope=rpg-mobile-ux; lesson=The verified gameplay view keeps the world map, player marker, health readout, inventory access and primary action controls visible together, reducing context switching during basic play.; apply=For a Roblox RPG, keep essential player state and high-frequency actions legible around the core world view without copying this game's visual design.")

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
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 8)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 9)
  player:SetAttribute("LastApprovedScope", "scope-mobileux-dc1239c515")
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", "id=movement-needs-immediate-visible-response; scope=rpg-input-feedback; lesson=A bounded gameplay input produced an immediate visible player-position change in the same world view.; apply=For mobile Roblox RPG movement, bind successful input to prompt and unambiguous world-state feedback, then validate it with semantic before and after frames.")

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


-- 문명 멀티버스: 기존 저장/전투 액션을 보존한 서버 권한 게임플레이.
local civ = Config.Civilization
local civCooldowns = {}
local civEnemies = {}
local civWildlife = {}
local civNodes = {}
local civWorlds = {}
local civStations = {}
local civTradeStalls = {}
local civDataLoadValid = {}
local civBuildings = {}
local pendingTimedCraft = {}
-- Per-session opt-in from the touch HUD; server damage authority remains unchanged.
local savePlayer = nil -- forward declaration: portal save must complete before TeleportAsync
local civHub = Instance.new("Folder")
civHub.Name = "CivilizationWorlds"
civHub.Parent = workspace
local civRegions = {
  Color3.fromRGB(171,135,91), Color3.fromRGB(214,183,110),
  Color3.fromRGB(142,170,124), Color3.fromRGB(126,159,139),
  Color3.fromRGB(165,140,101), Color3.fromRGB(205,169,112),
  Color3.fromRGB(103,157,100), Color3.fromRGB(85,139,87),
  Color3.fromRGB(133,153,124), Color3.fromRGB(117,169,148),
  Color3.fromRGB(75,136,100), Color3.fromRGB(182,210,222),
}
local function civPart(parent, name, size, frame, color, material, collide)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.CFrame = frame
  part.Color = color
  part.Material = material or Enum.Material.SmoothPlastic
  part.Anchored = true
  part.CanCollide = collide ~= false
  part.Parent = parent
  return part
end
local function civSign(parent, adornee, text, height)
  local board = Instance.new("BillboardGui")
  board.Name = "CivilizationSign"
  board.Adornee = adornee
  board.Size = UDim2.fromOffset(138, 38)
  board.StudsOffsetWorldSpace = Vector3.new(0, height or 4, 0)
  board.MaxDistance = 30
  board.AlwaysOnTop = false
  board.Parent = parent
  local label = Instance.new("TextLabel")
  label.BackgroundColor3 = Color3.fromRGB(26, 28, 30)
  label.BackgroundTransparency = 0.25
  label.Size = UDim2.fromScale(1, 1)
  label.TextScaled = false
  label.TextSize = 13
  label.TextWrapped = true
  label.TextColor3 = Color3.fromRGB(255, 232, 174)
  label.Text = text
  label.Parent = board
end
local function civMessage(player, text)
  remote:FireClient(player, "CIV_MESSAGE", tostring(text))
end
local function civNowReady(player, action, cooldown)
  local state = civCooldowns[player]
  if not state then state = {}; civCooldowns[player] = state end
  local now = os.clock()
  if now - (state[action] or -1e9) < cooldown then return false end
  state[action] = now
  return true
end
local function civRace(player)
  return RaceData.GetRace(readNumber(player, "CivRaceID", 0))
end
local function civIncrease(player, key, count)
  setNumber(player, key, math.max(0, readNumber(player, key, 0) + count))
end
-- Persistent building ownership is reconstructed from the existing saved numeric fields.
local function civOwnerBuildings(player)
  local owned = civBuildings[player]
  if owned and owned.Parent then return owned end
  owned = Instance.new("Folder")
  owned.Name = "OwnerBuildings-" .. tostring(player.UserId)
  owned.Parent = civHub
  civBuildings[player] = owned
  return owned
end
local function civBuildDefaultPosition(key, center)
  local index = table.find(ProgressionData.StructureKeys(), key) or 1
  return center + Vector3.new(-14 + (index - 1) * 6, 3.5, 15)
end

local function civVisualBuilding(player, key, explicitPosition)
  local definition = ProgressionData.GetStructure(key)
  local center = civWorlds[readNumber(player, "CivRaceID", 0)]
  if not definition or not center then return end
  local folder = civOwnerBuildings(player)
  if folder:FindFirstChild(key) then return end
  local savedX = readNumber(player, "Civ" .. key .. "PosX", 0)
  local savedZ = readNumber(player, "Civ" .. key .. "PosZ", 0)
  local savedPosition = if savedX ~= 0 or savedZ ~= 0
    then Vector3.new(savedX, center.Y + 3.5, savedZ) else nil
  local position = explicitPosition or savedPosition or civBuildDefaultPosition(key, center)
  local model = Instance.new("Model")
  model.Name = key
  model:SetAttribute("CivOwnerUserId", player.UserId)
  model:SetAttribute("CivPlacedX", position.X)
  model:SetAttribute("CivPlacedZ", position.Z)
  model.Parent = folder
  local anchor = civPart(model, "Foundation", Vector3.new(7, 2, 7), CFrame.new(position),
    definition.ModelColor, Enum.Material.Slate, false)
  if key == "Pyramid" then
    for level = 1, 3 do
      civPart(model, "PyramidTier" .. level,
        Vector3.new(9 - level * 2, 1.5, 9 - level * 2),
        CFrame.new(position + Vector3.new(0, level * 1.5, 0)),
        definition.ModelColor, Enum.Material.Sandstone, false)
    end
  elseif key == "Colosseum" then
    for index = 1, 6 do
      local angle = index * math.pi / 3
      civPart(model, "ArcColumn" .. index, Vector3.new(1.2, 5, 1.2),
        CFrame.new(position + Vector3.new(math.cos(angle) * 3, 3, math.sin(angle) * 3)),
        definition.ModelColor, Enum.Material.Sandstone, false)
    end
  elseif key == "DrakkarShipyard" then
    civPart(model, "ShipyardDock", Vector3.new(4, 0.8, 13),
      CFrame.new(position + Vector3.new(0, 1, 0)), definition.ModelColor, Enum.Material.WoodPlanks, false)
    civPart(model, "ShipyardMast", Vector3.new(0.5, 10, 0.5),
      CFrame.new(position + Vector3.new(0, 6, 0)), definition.ModelColor, Enum.Material.Wood, false)
  elseif key == "DangunAltar" then
    civPart(model, "AltarMonument", Vector3.new(2.5, 6, 2.5),
      CFrame.new(position + Vector3.new(0, 4, 0)), definition.ModelColor, Enum.Material.Sandstone, false)
  else
    civPart(model, "StoneBattlement", Vector3.new(7, 4, 2),
      CFrame.new(position + Vector3.new(0, 3, 0)), definition.ModelColor, Enum.Material.Rock, false)
  end
  civSign(model, anchor, definition.Label, 6)
end
local function civRestoreBuildings(player)
  for _, key in ipairs(ProgressionData.StructureKeys()) do
    if readNumber(player, "Civ" .. key, 0) >= 1 then civVisualBuilding(player, key) end
  end
end
local function civNearStation(player, stationType)
  local raceId = readNumber(player, "CivRaceID", 0)
  local station = civStations[raceId] and civStations[raceId][stationType]
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local hum = character and character:FindFirstChildOfClass("Humanoid")
  return station and root and hum and hum.Health > 0
    and (root.Position - station.Position).Magnitude <= 15
end
local function civSpend(player, costs)
  for key, cost in pairs(costs) do
    if readNumber(player, key, 0) < cost then return false, key end
  end
  for key, cost in pairs(costs) do
    setNumber(player, key, readNumber(player, key, 0) - cost)
  end
  return true, ""
end
local function civCraft(player, itemKey)
  if typeof(itemKey) ~= "string" or #itemKey > 32 or not civRace(player) then return end
  local recipe = ProgressionData.GetRecipe(itemKey)
  if not recipe then return end
  if readNumber(player, "CivTech", 0) < recipe.MinimumTech then
    civMessage(player, "선행 연구 필요: " .. tostring(recipe.MinimumTech))
    return
  end
  if not civNearStation(player, recipe.Station) then
    civMessage(player, "해당 제작 시설 15칸 이내로 이동해야 해.")
    return
  end
  if not civNowReady(player, "Craft", 0.8) then return end
  local paid, missing = civSpend(player, recipe.Costs)
  if not paid then civMessage(player, "제작 자원 부족: " .. missing); return end
  civIncrease(player, recipe.YieldField, recipe.YieldCount)
  if itemKey == "BronzeIngot" then civIncrease(player, "CivBronzeSmelts", recipe.YieldCount) end
  civMessage(player, recipe.Label .. " 제작 완료")
end
-- 수치 지급은 대기 완료 후 서버에서 한 번만 실행한다; 퇴장 시에는 비용도 빠지지 않는다.
local function civTimedCraft(player, recipeID)
  if player:GetAttribute("CivReady") ~= true or typeof(recipeID) ~= "number"
    or recipeID % 1 ~= 0 or not civRace(player) then return end
  local recipe = CraftingRecipeData.GetRecipe(recipeID)
  if not recipe then return end
  if pendingTimedCraft[player] or not civNowReady(player, "TimedCraft", 0.8) then return end
  if readNumber(player, "CivTech", 0) < recipe.RequiredTechID then
    civMessage(player, "선행 연구 필요: " .. tostring(recipe.RequiredTechID))
    return
  end
  if not civNearStation(player, recipe.Station) then
    civMessage(player, "제작 작업대 15칸 이내에서 제작할 수 있어.")
    return
  end
  for key, amount in pairs(recipe.Ingredients) do
    if readNumber(player, key, 0) < amount then
      civMessage(player, "제작 자원 부족: " .. key)
      return
    end
  end
  pendingTimedCraft[player] = recipeID
  civMessage(player, recipe.ItemName .. " 제작 중 (" .. recipe.CraftTime .. "초)")
  task.delay(recipe.CraftTime, function()
    if pendingTimedCraft[player] ~= recipeID then return end
    pendingTimedCraft[player] = nil
    if player.Parent ~= Players or player:GetAttribute("CivReady") ~= true
      or not civRace(player) or readNumber(player, "CivTech", 0) < recipe.RequiredTechID
      or not civNearStation(player, recipe.Station) then
      if player.Parent == Players then civMessage(player, "제작 취소: 작업대에서 멀어졌거나 조건이 변경됐어.") end
      return
    end
    local paid, missing = civSpend(player, recipe.Ingredients)
    if not paid then civMessage(player, "제작 자원 부족: " .. missing); return end
    civIncrease(player, recipe.OutputField, recipe.OutputAmount)
    civMessage(player, recipe.ItemName .. " 제작 완료! +" .. recipe.OutputAmount)
  end)
end

local function civBuild(player, buildingKey, positionHint)
  if typeof(buildingKey) ~= "string" or #buildingKey > 32 then return end
  local race = civRace(player)
  local definition = ProgressionData.GetStructure(buildingKey)
  if not race or not definition then return end
  if definition.RequiredRace ~= 0 and definition.RequiredRace ~= race.ID then return end
  if readNumber(player, "Civ" .. buildingKey, 0) >= 1 then
    civMessage(player, "이미 건설된 건축물이야.")
    return
  end
  if readNumber(player, "CivTech", 0) < definition.MinimumTech
    or readNumber(player, definition.RequiredMetric, 0) < 1 then
    civMessage(player, "해당 시대 연구와 사냥·제련 유레카를 완료해야 해.")
    return
  end
  local center = civWorlds[race.ID]
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not center or not root or not root:IsA("BasePart")
    or not humanoid or humanoid.Health <= 0 or (root.Position - center).Magnitude > 28 then return end
  local placement = nil
  if positionHint ~= nil then
    if typeof(positionHint) ~= "Vector3" then return end
    -- Finite bounded coordinates: never trust client-specified height.
    if positionHint.X ~= positionHint.X or positionHint.Z ~= positionHint.Z
      or math.abs(positionHint.X) > 10000 or math.abs(positionHint.Z) > 10000 then return end
    local snappedX = math.round((positionHint.X - center.X) / 4) * 4
    local snappedZ = math.round((positionHint.Z - center.Z) / 4) * 4
    if math.abs(snappedX) > 16 or math.abs(snappedZ) > 16 then
      civMessage(player, "자기 문명 영지 안에서만 건설할 수 있어.")
      return
    end
    placement = center + Vector3.new(snappedX, 3.5, snappedZ)
    local distance = (Vector2.new(placement.X - root.Position.X, placement.Z - root.Position.Z)).Magnitude
    if distance > 20 then
      civMessage(player, "설치할 위치에 더 가까이 가야 해.")
      return
    end
    -- Block occupied props / stations / other players' structure foundations.
    local function tooClose(otherPos, required)
      local delta = Vector2.new(placement.X - otherPos.X, placement.Z - otherPos.Z)
      return delta.Magnitude < required
    end
    if tooClose(center + Vector3.new(-11, 0, -9), 8) then
      civMessage(player, "랜드마크 위에는 건설할 수 없어.")
      return
    end
    for _, node in ipairs(civNodes) do
      if node.Part.Parent and tooClose(node.Part.Position, 6) then
        civMessage(player, "채집 지점과 겹치지 않게 배치해.")
        return
      end
    end
    for _, station in pairs(civStations[race.ID] or {}) do
      if tooClose(station.Position, 6) then
        civMessage(player, "제작 시설 근처에는 건설할 수 없어.")
        return
      end
    end
    local stall = civTradeStalls[race.ID]
    if stall and tooClose(stall.Position, 7) then
      civMessage(player, "무역소 통로를 막을 수 없어.")
      return
    end
    for _, ownerFolder in ipairs(civHub:GetChildren()) do
      if ownerFolder:IsA("Folder") and ownerFolder.Name:find("^OwnerBuildings%-") then
        for _, model in ipairs(ownerFolder:GetChildren()) do
          local foundation = model:FindFirstChild("Foundation")
          if foundation and foundation:IsA("BasePart") and tooClose(foundation.Position, 8) then
            civMessage(player, "이미 건설된 건물과 겹쳐.")
            return
          end
        end
      end
    end
  end
  -- Egyptian pyramid decreases only building-action cooldown by 20%.
  local cooldown = race.ID == 2 and readNumber(player, "CivPyramid", 0) > 0 and 1.6 or 2
  if not civNowReady(player, "Build", cooldown) then return end
  local paid, missing = civSpend(player, definition.Costs)
  if not paid then civMessage(player, "건축 자원 부족: " .. missing); return end
  setNumber(player, "Civ" .. buildingKey, 1)
  if placement then
    -- Save exact snapped world coordinates in existing numeric UpdateAsync record.
    player:SetAttribute("Civ" .. buildingKey .. "PosX", placement.X)
    player:SetAttribute("Civ" .. buildingKey .. "PosZ", placement.Z)
  end
  civVisualBuilding(player, buildingKey, placement)
  civMessage(player, definition.Label .. " 건축 완료")
end
local civWeaponIds = {StoneSpear=1, BronzeSword=2, IronGreatsword=3}
local function civEquip(player, weaponKey)
  if typeof(weaponKey) ~= "string" or #weaponKey > 32 or not civRace(player) then return end
  local weapon = civWeaponIds[weaponKey]
  if not weapon or readNumber(player, "Civ" .. weaponKey, 0) < 1 then return end
  if not civNowReady(player, "Equip", 0.25) then return end
  setNumber(player, "CivEquippedWeapon", weapon)
  civMessage(player, weaponKey .. " 장착")
end
local function civTravel(player, raceID)
  local destination = civWorlds[raceID]
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not destination or not character or not humanoid or humanoid.Health <= 0 then return end
  character:PivotTo(CFrame.new(destination + Vector3.new(0, 5, -11)))
end
-- 기존 캐릭터의 기준 수치를 보존하면서 문명 고유 특성만 적용한다.
local function civApplyCharacterPassive(player)
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  local race = civRace(player)
  if not humanoid or not race then return end
  local baseHealth = humanoid:GetAttribute("CivBaseMaxHealth")
  if typeof(baseHealth) ~= "number" then
    baseHealth = humanoid.MaxHealth
    humanoid:SetAttribute("CivBaseMaxHealth", baseHealth)
  end
  local baseSpeed = humanoid:GetAttribute("CivBaseWalkSpeed")
  if typeof(baseSpeed) ~= "number" then
    baseSpeed = humanoid.WalkSpeed
    humanoid:SetAttribute("CivBaseWalkSpeed", baseSpeed)
  end
  local healthMultiplier = race.PassiveType == "Fortress" and 1.15 or 1
  local speedMultiplier = race.PassiveType == "Mobility" and 1.2
    or race.PassiveType == "Trade" and 1.1 or 1
  humanoid.MaxHealth = baseHealth * healthMultiplier
  humanoid.WalkSpeed = baseSpeed * speedMultiplier
end
-- 외형 전용 색상은 서버가 허용한 네 가지 중 하나만 실제 캐릭터에 적용한다.
local civSkinTones = {
  Color3.fromRGB(190, 148, 114), Color3.fromRGB(225, 184, 145),
  Color3.fromRGB(145, 100, 70), Color3.fromRGB(98, 68, 49),
}
local function civApplySkinTone(player)
  local character = player.Character
  if not character then return end
  local id = readNumber(player, "CivSkinTone", 1)
  if id % 1 ~= 0 or not civSkinTones[id] then id = 1 end
  local skin = civSkinTones[id]
  local colors = character:FindFirstChildOfClass("BodyColors")
  if not colors then
    colors = Instance.new("BodyColors")
    colors.Parent = character
  end
  colors.HeadColor3 = skin
  colors.LeftArmColor3 = skin
  colors.RightArmColor3 = skin
  colors.LeftLegColor3 = skin
  colors.RightLegColor3 = skin
end
local function civSetSkinTone(player, id)
  if typeof(id) ~= "number" or id % 1 ~= 0 or not civSkinTones[id] then return end
  if not civNowReady(player, "SkinTone", 0.5) then return end
  setNumber(player, "CivSkinTone", id)
  civApplySkinTone(player)
end
-- 영웅 시대 최종 연구 72 완료 시에만 현재 게임의 리저브 서버로 이동한다.
-- 외부 Place ID 또는 가짜 ReservedServerAccessKey를 사용하지 않는다.
local function civPortalTeleport(player, destinationID)
  if player:GetAttribute("CivReady") ~= true or typeof(destinationID) ~= "number"
    or destinationID % 1 ~= 0 or not RaceData.GetRace(destinationID) then return end
  if readNumber(player, "CivTech", 0) < 72 then
    civMessage(player, "멀티버스 포털은 72번 최종 연구를 완료해야 사용할 수 있어.")
    return
  end
  if game.PlaceId <= 0 then
    civMessage(player, "게시된 Roblox Place에서만 차원 서버 이동을 사용할 수 있어.")
    return
  end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health <= 0 then return end
  if not civNowReady(player, "MultiversePortal", 5) then return end
  -- Reserve-server transfer reloads DataStore, so flush this player's current inventory/tech first.
  if not savePlayer or savePlayer(player) ~= true then
    civMessage(player, "저장에 실패해 차원 이동을 취소했어. 나중에 다시 시도해.")
    return
  end
  local options = Instance.new("TeleportOptions")
  options.ShouldReserveServer = true
  options:SetTeleportData({CivDestinationRaceID = destinationID, CivPortalGameId = "simple-rpg"})
  local ok, err = pcall(function()
    TeleportService:TeleportAsync(game.PlaceId, {player}, options)
  end)
  if not ok then
    warn("CIV_PORTAL_TELEPORT_FAILED", player.UserId, tostring(err))
    civMessage(player, "차원 이동 실패. 잠시 후 다시 시도해.")
  end
end

local function civSelect(player, raceID)
  if typeof(raceID) ~= "number" or raceID % 1 ~= 0 or not RaceData.GetRace(raceID) then return end
  if readNumber(player, "CivRaceID", 0) ~= 0 then
    civMessage(player, "문명은 처음 선택한 종족으로 고정돼.")
    return
  end
  if not civNowReady(player, "Select", 1) then return end
  setNumber(player, "CivRaceID", raceID)
  civApplyCharacterPassive(player)
  civMessage(player, RaceData.GetRace(raceID).Name .. " 문명을 선택했어.")
  civTravel(player, raceID)
end
local function civGather(player, requestedType)
  if not civRace(player) or not civNowReady(player, "Gather", civ.GatherCooldown) then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  local best, dist = nil, 14
  for _, node in ipairs(civNodes) do
    if requestedType == nil or node.Type == requestedType then
      local d = (node.Part.Position - root.Position).Magnitude
      if d < dist then best = node; dist = d end
    end
  end
  if not best then civMessage(player, "자원 기둥에 가까이 가서 채집해."); return end
  local now = os.clock()
  if now < (best.ReadyAt or 0) then
    civMessage(player, "자원이 재생 중이야. 잠시 후 다시 채집해.")
    return
  end
  -- Depleted nodes visibly dim, then regrow on the authoritative server timer.
  best.ReadyAt = now + 8
  best.Part:SetAttribute("ResourceReadyAt", best.ReadyAt)
  local nodePart = best.Part
  local originalColor = best.OriginalColor or nodePart.Color
  best.OriginalColor = originalColor
  nodePart.Color = originalColor:Lerp(Color3.fromRGB(63, 66, 66), 0.65)
  nodePart.Transparency = 0.35
  local regenerationAt = best.ReadyAt
  task.delay(8, function()
    if not nodePart.Parent or best.ReadyAt ~= regenerationAt then return end
    nodePart.Color = originalColor
    nodePart.Transparency = 0
    nodePart:SetAttribute("ResourceReadyAt", 0)
  end)
  local race = civRace(player)
  local bonus = (race.PassiveType == "OceanGather" and best.Type == "Wood") and 1.30
    or (race.PassiveType == "Harvest" and best.Type == "Food") and 1.25
    or (race.PassiveType == "Industry" and best.Type == "Iron") and 1.15
    or (race.ID == 24 and (best.Type == "Stone" or best.Type == "Iron" or best.Type == "Bronze"
      or best.Type == "CopperOre" or best.Type == "TinOre" or best.Type == "IronOre" or best.Type == "Coal")) and 1.25 or 1
  local amount = math.max(1, math.floor(3 * bonus + 0.5))
  civIncrease(player, "Civ" .. best.Type, amount)
  civIncrease(player, "CivGather", 1)
  civIncrease(player, "CivResearch", 1)
  civMessage(player, best.Label .. " +" .. amount .. " / 연구력 +1")
end
-- Server-session market prices and saved player currencies are always server-owned.
local function civNearTradeStall(player)
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not root:IsA("BasePart") or not humanoid or humanoid.Health <= 0 then return false end
  for _, stall in pairs(civTradeStalls) do
    if stall.Parent and (root.Position - stall.Position).Magnitude <= 16 then return true end
  end
  return false
end

local function civTrade(player, itemID, amount, isBuying, currency)
  if player:GetAttribute("CivReady") ~= true or not civRace(player) then return end
  if itemID == "Snapshot" then
    if civNowReady(player, "MarketSnapshot", 0.2) then
      marketUpdateEvent:FireClient(player, MultiverseEconomy.Snapshot())
    end
    return
  end
  if typeof(itemID) ~= "string" or #itemID > 24 or typeof(amount) ~= "number"
    or amount % 1 ~= 0 or amount < 1 or amount > 20 or typeof(isBuying) ~= "boolean" then return end
  if currency ~= "Silver" and currency ~= "Gold" then return end
  if not civNearTradeStall(player) then
    civMessage(player, "문명 무역소 16칸 이내에서만 거래할 수 있어.")
    return
  end
  if not civNowReady(player, "Trade", 0.75) then return end
  if itemID == "Currency" then
    -- Spread prevents gain from immediate two-way currency conversion.
    if isBuying then
      local silverCost = amount * 11
      if readNumber(player, "CivSilver", 0) < silverCost then
        civMessage(player, "골드 환전용 은화가 부족해.")
        return
      end
      civIncrease(player, "CivSilver", -silverCost)
      civIncrease(player, "CivGold", amount)
      civMessage(player, "골드 +" .. amount .. " / 은화 -" .. silverCost)
    else
      if readNumber(player, "CivGold", 0) < amount then
        civMessage(player, "은화 환전용 골드가 부족해.")
        return
      end
      civIncrease(player, "CivGold", -amount)
      civIncrease(player, "CivSilver", amount * 9)
      civMessage(player, "은화 +" .. amount * 9 .. " / 골드 -" .. amount)
    end
    return
  end
  local item = TradeMarketData.GetItem(itemID)
  if not item then return end
  local silverPrice = MultiverseEconomy.Quote(itemID, amount, isBuying)
  if not silverPrice then return end
  local price = if currency == "Gold"
    then (if isBuying then math.ceil(silverPrice / 10) else math.floor(silverPrice / 10))
    else silverPrice
  if price < 1 then
    civMessage(player, "해당 수량은 이 화폐로 판매할 수 없어.")
    return
  end
  local moneyField = "Civ" .. currency
  if isBuying then
    if not MultiverseEconomy.HasSupply(itemID, amount) then
      civMessage(player, "무역소 재고가 부족해. 카라반 도착을 기다려.")
      return
    end
    if readNumber(player, moneyField, 0) < price then
      civMessage(player, currency .. " 부족: " .. price .. " 필요")
      return
    end
    civIncrease(player, moneyField, -price)
    civIncrease(player, item.ItemField, amount)
  else
    if readNumber(player, item.ItemField, 0) < amount then
      civMessage(player, item.Label .. " 보유 수량이 부족해.")
      return
    end
    civIncrease(player, item.ItemField, -amount)
    civIncrease(player, moneyField, price)
  end
  MultiverseEconomy.ApplyTrade(itemID, amount, isBuying)
  civMessage(player, item.Label .. " " .. amount .. "개 " ..
    (isBuying and "매입" or "판매") .. " / " .. currency .. " " .. price)
  marketUpdateEvent:FireAllClients(MultiverseEconomy.Snapshot())
end

-- 모든 연구 요청(구형 액션 이벤트/신규 RemoteFunction)은 이 서버 판정 한 곳을 거친다.
local function civResearch(player, requestedTechID)
  if player:GetAttribute("CivReady") ~= true then return false, "플레이어 데이터 로딩 중입니다." end
  if requestedTechID ~= nil and (typeof(requestedTechID) ~= "number"
    or requestedTechID % 1 ~= 0 or requestedTechID < 1 or requestedTechID > 72) then
    return false, "기술 번호가 올바르지 않습니다."
  end
  local race = civRace(player)
  if not race then return false, "문명을 먼저 선택해야 합니다." end
  local nextID = readNumber(player, "CivTech", 0) + 1
  if requestedTechID ~= nil and requestedTechID ~= nextID then
    return false, "선행 기술을 먼저 연구해야 합니다."
  end
  local tech = TechTreeData.GetTech(nextID)
  if not tech then return false, "72개 연구를 모두 해금했어." end
  if readNumber(player, "CivTech", 0) ~= tech.Prerequisite then
    return false, "선행 연구가 완료되지 않았습니다."
  end
  if not civNowReady(player, "Research", 0.3) then return false, "연구 요청이 너무 빠릅니다." end
  local factor = 1
  if readNumber(player, tech.EurekaMetric, 0) >= tech.EurekaCount then factor *= 0.5 end
  -- Owner age-chain eureka at the canonical stone/bronze/iron entry nodes (15, 29, 45).
  if (nextID == 15 and readNumber(player, "CivBoarKills", 0) >= 1)
    or (nextID == 29 and readNumber(player, "CivBronzeSmelts", 0) >= 5)
    or (nextID == 45 and readNumber(player, "CivIronKnightKills", 0) >= 1) then
    factor = math.min(factor, 0.5)
  end
  if race.ID == 15 and readNumber(player, "CivDangunAltar", 0) >= 1 then factor *= 0.85 end
  if race.PassiveType == "Research" then factor *= 0.85 end
  if race.PassiveType == "MythDiscount" and tech.Era == 1 then factor *= 0.8 end
  if race.PassiveType == "AgeDiscount" and (nextID == 15 or nextID == 29 or nextID == 45 or nextID == 61) then factor *= 0.85 end
  for resource, cost in pairs(tech.RequiredResources) do
    if readNumber(player, "Civ" .. resource, 0) < math.ceil(cost * factor) then
      local message = resource .. " 부족: " .. math.ceil(cost * factor) .. " 필요"
      civMessage(player, message)
      return false, message
    end
  end
  -- 수치 변경/세이브는 기존 Player Attribute + UpdateAsync 경로만 사용한다.
  for resource, cost in pairs(tech.RequiredResources) do
    civIncrease(player, "Civ" .. resource, -math.ceil(cost * factor))
  end
  setNumber(player, "CivTech", nextID)
  setNumber(player, "CivEra", tech.Era)
  local message = "연구 완료: " .. tech.Name .. " (" .. TechTreeData.EraName(tech.Era) .. ")"
  civMessage(player, message)
  updateTechEvent:FireClient(player, nextID, tech.Era, factor < 1)
  return true, message
end
local function civGuard(player)
  if not civRace(player) or not civNowReady(player, "Guard", civ.GuardCooldown) then return end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not humanoid or humanoid.Health <= 0 then return end
  player:SetAttribute("CivGuardAt", os.clock())
  civMessage(player, "방어 자세! 적이 공격할 때 패링 판정")
end
local function civDodge(player)
  if not civRace(player) or not civNowReady(player, "Dodge", civ.DodgeCooldown) then return end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  local root = character and character:FindFirstChild("HumanoidRootPart")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  local move = humanoid.MoveDirection
  if move.Magnitude < 0.1 then move = root.CFrame.LookVector end
  local offset = Vector3.new(move.X, 0, move.Z)
  if offset.Magnitude < 0.1 then return end
  local parameters = RaycastParams.new()
  parameters.FilterType = Enum.RaycastFilterType.Exclude
  parameters.FilterDescendantsInstances = {character}
  local target = root.Position + offset.Unit * 7
  local ground = workspace:Raycast(target + Vector3.new(0, 5, 0), Vector3.new(0, -15, 0), parameters)
  if not ground or ground.Normal.Y < 0.6 or ground.Instance.CanCollide ~= true then return end
  player:SetAttribute("CivDodgeAt", os.clock())
  character:PivotTo(character:GetPivot() + (Vector3.new(target.X, ground.Position.Y + 4, target.Z) - root.Position))
  civIncrease(player, "CivDodges", 1)
end
local function civSpawnEnemy(raceID, center, special)
  local race = RaceData.GetRace(raceID)
  local enemy = Instance.new("Model")
  enemy.Name = special == "WildBoar" and "야생 멧돼지"
    or special == "BronzeGolem" and "청동 골렘"
    or special == "IronKnight" and "암흑 철기 기사"
    or race.Mobs:match("^[^·]+") or race.Name .. " 수호자"
  enemy:SetAttribute("CivilizationEnemy", true)
  local isRaidBoss = special == "BronzeGolem" or special == "IronKnight"
  enemy:SetAttribute("IsRaidBoss", isRaidBoss)
  if isRaidBoss then enemy:SetAttribute("BossPhase", "Phase1") end
  enemy:SetAttribute("RaceID", raceID)
  -- 기존 시대별 특수 몬스터를 레이드 보스로 분류한다. 기본 체력·피해·보상은 유지한다.
  if special == "WildBoar" or special == "BronzeGolem" or special == "IronKnight" then
    enemy:SetAttribute("IsRaidBoss", true)
    enemy:SetAttribute("BossPhase", "Phase1")
  end
  enemy:SetAttribute("IsPreparingAttack", false)
  enemy:SetAttribute("AIState", "Idle")
  local root = civPart(enemy, "HumanoidRootPart", Vector3.new(3, 4, 3), CFrame.new(center + Vector3.new(special and -9 or 0, 4, 9)), Color3.fromRGB(81 + raceID % 4 * 25, 75, 64), Enum.Material.SmoothPlastic, false)
  root.Transparency = 0.35
  local head = civPart(enemy, "Head", Vector3.new(2.6, 2.6, 2.6), root.CFrame * CFrame.new(0, 3, 0), Color3.fromRGB(190, 151, 116), Enum.Material.SmoothPlastic, false)
  local humanoid = Instance.new("Humanoid")
  humanoid.RequiresNeck = false
  humanoid.MaxHealth = special == "WildBoar" and 42 or special == "BronzeGolem" and 100
    or special == "IronKnight" and 155 or (52 + raceID * 3)
  humanoid.Health = humanoid.MaxHealth
  humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.Subject
  humanoid.Parent = enemy
  enemy.PrimaryPart = root
  enemy.Parent = civHub
  civSign(head, head, enemy.Name, 3.3)
  local item = { Model = enemy, Root = root, Humanoid = humanoid, Home = root.Position, RaceID = raceID, Special = special, LastHit = -1e9, TelegraphAt = 0, StunnedUntil = 0, TargetUserId = nil }
  table.insert(civEnemies, item)
  return item
end
-- Bounded server wildlife: each civilization has one grazing prey model.
local function civSpawnGrazer(raceID, center)
  local animal = Instance.new("Model")
  animal.Name = "초식 야생동물"
  animal:SetAttribute("CivilizationWildlife", true)
  animal:SetAttribute("RaceID", raceID)
  local root = civPart(animal, "HumanoidRootPart", Vector3.new(2.4, 2, 3), CFrame.new(center + Vector3.new(9, 2.5, -6)), Color3.fromRGB(137, 128, 93), Enum.Material.SmoothPlastic, false)
  civPart(animal, "Head", Vector3.new(1.5, 1.4, 1.3), root.CFrame * CFrame.new(0, 0.7, -1.8), Color3.fromRGB(161, 147, 107), Enum.Material.SmoothPlastic, false)
  local health = Instance.new("Humanoid")
  health.RequiresNeck = false
  health.MaxHealth = 32
  health.Health = health.MaxHealth
  health.Parent = animal
  animal.PrimaryPart = root
  animal.Parent = civHub
  local state = {Model = animal, Root = root, Humanoid = health, Home = root.Position, LastGraze = -1e9, LastPredated = -1e9}
  civWildlife[raceID] = state
  return state
end
-- targetModel is an optional mobile hint; only a server-owned enemy may be selected.
local function civAttack(player, targetModel)
  if not civRace(player) or not civNowReady(player, "Attack", civ.AttackCooldown) then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  local chosen, dist = nil, 12
  for _, enemy in ipairs(civEnemies) do
    if enemy.Humanoid.Health > 0 and enemy.Model.Parent == civHub then
      local delta = enemy.Root.Position - root.Position
      local d = delta.Magnitude
      if d < dist and d > 0.01
        and ((targetModel ~= nil and targetModel == enemy.Model)
          or (targetModel == nil and root.CFrame.LookVector:Dot(delta.Unit) > -0.1)) then
        chosen = enemy; dist = d
      end
    end
  end
  if not chosen then
    if targetModel == nil then civMessage(player, "적을 바라보고 가까이 가서 공격해.") end
    return
  end
  local race = civRace(player)
  local equipped = readNumber(player, "CivEquippedWeapon", 0)
  -- Damage follows the weapon the player actually crafted and equipped,
  -- not the target's minimum weapon requirement.
  local weaponFields = {"CivStoneSpear", "CivBronzeSword", "CivIronGreatsword"}
  local weapon = equipped % 1 == 0 and equipped >= 1 and equipped <= 3
    and readNumber(player, weaponFields[equipped], 0) >= 1 and equipped or 0
  local requiredWeapon = chosen.Special == "WildBoar" and 1
    or chosen.Special == "BronzeGolem" and 2 or chosen.Special == "IronKnight" and 3 or 0
  if requiredWeapon > 0 and weapon < requiredWeapon then
    civMessage(player, chosen.Model.Name .. " 사냥에는 해당 시대 무기를 제작하고 장착해야 해.")
    return
  end
  local weaponDamage = {12, 17, 23}
  local damage = weapon == 0 and 12 or weaponDamage[weapon]
  if race.PassiveType == "Victory" and (player:GetAttribute("CivVictoryUntil") or 0) > os.clock() then damage = math.floor(damage * 1.1 + 0.5) end
  chosen.Humanoid:TakeDamage(damage)
  remote:FireClient(player, "CIV_HIT", {Damage = damage, Enemy = chosen.Model.Name})
  if chosen.Humanoid.Health <= 0 then
    civIncrease(player, "CivKills", 1)
    civIncrease(player, "CivResearch", 8)
    civIncrease(player, "CivSilver", 3)
    local additionalLoot = ""
    if chosen.Special == "WildBoar" then
      civIncrease(player, "CivHide", 1)
      civIncrease(player, "CivBoarKills", 1)
      additionalLoot = " / 가죽 +1 / 석기 유레카!"
    elseif chosen.Special == "BronzeGolem" then
      civIncrease(player, "CivCoreCrystal", 1)
      additionalLoot = " / 코어 크리스탈 +1"
    elseif chosen.Special == "IronKnight" then
      civIncrease(player, "CivDarkIron", 1)
      civIncrease(player, "CivIronKnightKills", 1)
      additionalLoot = " / 다크 아이언 +1 / 철기 유레카!"
    end
    if race.PassiveType == "Victory" then player:SetAttribute("CivVictoryUntil", os.clock() + 10) end
    -- Loot is granted above by the server; this short-lived marker is visual only.
    local trophy = Instance.new("Part")
    trophy.Name = "DefeatedEnemyLootEffect"
    trophy.Shape = Enum.PartType.Ball
    trophy.Size = Vector3.new(1.2, 1.2, 1.2)
    trophy.Material = Enum.Material.Neon
    trophy.Color = chosen.Special == "BronzeGolem" and Color3.fromRGB(83, 207, 229)
      or chosen.Special == "IronKnight" and Color3.fromRGB(133, 88, 180)
      or chosen.Special == "WildBoar" and Color3.fromRGB(195, 154, 91)
      or Color3.fromRGB(232, 189, 92)
    trophy.Anchored = true
    trophy.CanCollide = false
    trophy.CanTouch = false
    trophy.CanQuery = false
    trophy.CFrame = CFrame.new(chosen.Root.Position + Vector3.new(0, 3, 0))
    trophy.Parent = civHub
    local lootLight = Instance.new("PointLight")
    lootLight.Color = trophy.Color
    lootLight.Brightness = 1.3
    lootLight.Range = 9
    lootLight.Parent = trophy
    local lootInfo = Instance.new("BillboardGui")
    lootInfo.Name = "LootRewardNotice"
    lootInfo.Adornee = trophy
    lootInfo.Size = UDim2.fromOffset(168, 44)
    lootInfo.StudsOffsetWorldSpace = Vector3.new(0, 1.8, 0)
    lootInfo.MaxDistance = 24
    lootInfo.AlwaysOnTop = false
    lootInfo.Parent = trophy
    local lootLabel = Instance.new("TextLabel")
    lootLabel.Name = "RewardText"
    lootLabel.Size = UDim2.fromScale(1, 1)
    lootLabel.BackgroundColor3 = Color3.fromRGB(43, 34, 26)
    lootLabel.BackgroundTransparency = 0.2
    lootLabel.TextColor3 = Color3.fromRGB(255, 233, 181)
    lootLabel.TextScaled = false
    lootLabel.TextSize = 13
    lootLabel.TextWrapped = true
    lootLabel.Font = Enum.Font.GothamBold
    lootLabel.Text = chosen.Special == "WildBoar" and "가죽 +1"
      or chosen.Special == "BronzeGolem" and "코어 크리스탈 +1"
      or chosen.Special == "IronKnight" and "다크 아이언 +1"
      or "연구력 +8 / 은화 +3"
    lootLabel.Parent = lootInfo
    game:GetService("Debris"):AddItem(trophy, 2.5)
    civMessage(player, chosen.Model.Name .. " 처치! 연구력 +8 / 은화 +3" .. additionalLoot)
    chosen.TelegraphAt = 0
    chosen.TargetUserId = nil
    chosen.Model:SetAttribute("IsPreparingAttack", false)
    task.delay(9, function()
      if chosen.Model.Parent then
        chosen.Model:PivotTo(CFrame.new(chosen.Home))
        chosen.Humanoid.Health = chosen.Humanoid.MaxHealth
        if chosen.Model:GetAttribute("IsRaidBoss") == true then chosen.Model:SetAttribute("BossPhase", "Phase1") end
        chosen.LastHit = os.clock()
        chosen.StunnedUntil = 0
      end
    end)
  end
end
-- AI companion actions are validated on the authoritative game server.
local function civCompanion(player, command)
  if not civNowReady(player, "Companion", 0.35) then return end
  local allowed = civRace(player) ~= nil
  if CompanionAI.Command(player, command, allowed) then
    civMessage(player, "AI 동료 명령: " .. tostring(player:GetAttribute("CivCompanionMode")))
  end
end
local function civOnEnemyStrike(enemy, player, now)
  if enemy.Humanoid.Health <= 0 then return end
  local character = player.Character
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  local root = character and character:FindFirstChild("HumanoidRootPart")
  if not humanoid or not root or humanoid.Health <= 0 or (root.Position - enemy.Root.Position).Magnitude > 9 then return end
  local dodgedAt = player:GetAttribute("CivDodgeAt") or -1e9
  if now >= dodgedAt and now - dodgedAt <= civ.DodgeIFrame then return end
  local guardedAt = player:GetAttribute("CivGuardAt") or -1e9
  local race = civRace(player)
  local parryWindow = civ.BaseParryWindow + (race and race.ParryWindowOffset or 0)
  if now >= guardedAt and now - guardedAt <= parryWindow then
    player:SetAttribute("CivGuardAt", -1e9)
    enemy.StunnedUntil = now + 2
    civIncrease(player, "CivParries", 1)
    civIncrease(player, "CivResearch", 4)
    civMessage(player, "퍼펙트 패링! 적 2초 기절 / 연구력 +4")
    remote:FireClient(player, "CIV_PARRY", {Enemy = enemy.Model.Name})
    return
  end
  local defense = race and race.DefenseMultiplier or 1
  if race and race.ID == 1 and readNumber(player, "CivColosseum", 0) > 0 then defense *= 1.15 end
  local bossPhase = enemy.Model:GetAttribute("IsRaidBoss") == true and enemy.Model:GetAttribute("BossPhase") or "Phase1"
  local baseDamage = bossPhase == "Phase3" and 20 or bossPhase == "Phase2" and 16 or 12
  local damage = math.max(1, math.floor(baseDamage / defense + 0.5))
  humanoid:TakeDamage(damage)
  civMessage(player, enemy.Model.Name .. "의 공격! 체력 -" .. damage)
end
-- 24문명 세계에 직접 보이는 R15 비율의 블록형 전사 조형물.
-- 실제 NPC/동료나 Humanoid가 아니며 기존 전투 타깃과 물리 검사에 영향을 주지 않는다.
local function civBuildCultureFigure(region, race, id, center)
  local origin = center + Vector3.new(-16, 1, 0)
  local fabric = civRegions[((id - 1) % #civRegions) + 1]
  local bronze = Color3.fromRGB(200, 154, 91)
  local skin = Color3.fromRGB(190, 148, 114)
  local figure = Instance.new("Model")
  figure.Name = race.Name .. " 전사 조형물"
  figure:SetAttribute("CivilizationCultureDisplay", true)
  figure.Parent = region
  local function part(name, size, offset, color)
    local piece = civPart(figure, name, size, CFrame.new(origin + offset),
      color, Enum.Material.SmoothPlastic, false)
    piece.CanTouch = false
    piece.CanQuery = false
    return piece
  end
  local chest = part("BlockyTorso", Vector3.new(1.8, 1.8, 0.9),
    Vector3.new(0, 2.7, 0), fabric)
  part("ChestEmblem", Vector3.new(0.6, 0.6, 0.12), Vector3.new(0, 2.9, -0.52), bronze)
  part("Waist", Vector3.new(1.8, 0.38, 0.9), Vector3.new(0, 1.68, 0), bronze)
  for _, side in ipairs({-1, 1}) do
    part("Arm" .. side, Vector3.new(0.7, 1.65, 0.75),
      Vector3.new(side * 1.23, 2.65, 0), fabric)
    part("Leg" .. side, Vector3.new(0.72, 1.65, 0.8),
      Vector3.new(side * 0.5, 0.85, 0), fabric)
  end
  part("Head", Vector3.new(1.12, 1.06, 1.06), Vector3.new(0, 4.25, 0), skin)
  local visual = race.Visual
  if visual:find("터번", 1, true) or visual:find("모피", 1, true)
    or visual:find("우샨카", 1, true) then
    part("ClothHeadwrap", Vector3.new(1.45, 0.55, 1.31),
      Vector3.new(0, 4.85, 0), fabric)
    part("HeadwrapBand", Vector3.new(1.25, 0.28, 1.2),
      Vector3.new(0, 5.18, 0), bronze)
  elseif visual:find("깃털", 1, true) or visual:find("월계관", 1, true) then
    part("HeadBand", Vector3.new(1.4, 0.3, 1.25),
      Vector3.new(0, 4.91, 0), bronze)
    part("HeadCrest", Vector3.new(0.26, 0.95, 0.28),
      Vector3.new(0, 5.49, 0), fabric)
  elseif visual:find("네메스", 1, true) or visual:find("장신구", 1, true) then
    part("CeremonialCrown", Vector3.new(1.38, 0.48, 1.25),
      Vector3.new(0, 4.98, 0), bronze)
    part("CrownGem", Vector3.new(0.3, 0.52, 0.16),
      Vector3.new(0, 5.32, -0.65), fabric)
  else
    part("CulturalHelmet", Vector3.new(1.42, 0.56, 1.31),
      Vector3.new(0, 4.95, 0), bronze)
    part("HelmetCrest", Vector3.new(0.86, 0.26, 0.27),
      Vector3.new(0, 5.36, 0), fabric)
  end
  civSign(region, chest, race.Name .. "\n" .. race.Visual, 4.8)
  return figure
end

-- 문명 지역과 중앙 포털: 메인 지면/저장 키는 그대로 유지한다.
-- 실제 로비 지면: 기본 스폰 및 24개 문명 이동 패드까지 걸어갈 수 있도록 유지한다.
-- 하나의 대륙 바닥으로 광장과 모든 문명을 보행 가능한 오픈월드로 연결한다.
-- 기존 문명 좌표·스폰·이동·전투 기준값은 변경하지 않는다.
-- 바이브 공용 바이옴 제작기를 사용한다. 생성된 지형은 시각용이며 판정은 기존 게임이 소유한다.
local CommonEnvironment = require(script.Parent:WaitForChild("CommonEnvironment"))
local vibeBiomes = {
  {Id = "FOREST", Angle = 0.32, Distance = 124},
  {Id = "DESERT", Angle = 1.35, Distance = 124},
  {Id = "SNOW", Angle = 2.38, Distance = 124},
  {Id = "CAVE", Angle = 3.4, Distance = 124},
  {Id = "SWAMP", Angle = 4.45, Distance = 124},
  {Id = "RUINS", Angle = 5.48, Distance = 124},
}
for index, biome in ipairs(vibeBiomes) do
  local origin = Vector3.new(math.cos(biome.Angle) * biome.Distance, -0.6,
    math.sin(biome.Angle) * biome.Distance)
  local root = CommonEnvironment.CreateBiomeKit(biome.Id, {
    origin = origin, name = "바이브 생태지대 " .. biome.Id,
    scale = 0.82, dressingCount = 8, detailTier = "LOW",
  })
  root.Parent = civHub
  for _, object in ipairs(root:GetDescendants()) do
    if object:IsA("BasePart") then
      object.CanCollide = false
      object.CanTouch = false
      object.CanQuery = false
    end
  end
end
local continentGround = civPart(civHub, "문명 대륙", Vector3.new(520, 2, 520),
  CFrame.new(0, -2, 0), Color3.fromRGB(112, 143, 103), Enum.Material.Grass, true)
continentGround:SetAttribute("WalkableGround", true)
-- 중앙 산줄기와 강줄기는 문명 이동로에서 떨어진 비충돌 지형으로 구성한다.
-- 전투 레이캐스트·채집 프롬프트·이동 판정과 충돌하지 않도록 장식은 조회하지 않는다.
for index = 1, 16 do
  local theta = (index - 1) * math.pi * 2 / 16
  local radius = 95 + (index % 3) * 17
  local base = Vector3.new(math.cos(theta) * radius, 0, math.sin(theta) * radius)
  local hill = civPart(civHub, "산등성이 " .. index,
    Vector3.new(25 + index % 3 * 7, 18 + index % 4 * 8, 28),
    CFrame.new(base + Vector3.new(0, 6, 0)) * CFrame.Angles(0, theta, math.rad(15)),
    Color3.fromRGB(104, 115 + index % 4 * 6, 98), Enum.Material.Rock, false)
  hill.Shape = Enum.PartType.Ball
  hill.CanTouch = false
  hill.CanQuery = false
end
for index = 1, 18 do
  local z = -182 + index * 20
  local x = -72 + math.sin(index * 0.57) * 18
  local water = civPart(civHub, "곡류 하천 " .. index, Vector3.new(19, 0.25, 23),
    CFrame.new(x, -0.78, z), Color3.fromRGB(79, 134, 170), Enum.Material.Glass, false)
  water.Transparency = 0.28
  water.CanTouch = false
  water.CanQuery = false
end
for index = 1, 4 do
  local lake = civPart(civHub, "호수 " .. index, Vector3.new(24, 0.3, 30),
    CFrame.new(62 + (index % 2) * 25, -0.76, -128 + index * 46),
    Color3.fromRGB(86, 144, 183), Enum.Material.Glass, false)
  lake.Shape = Enum.PartType.Cylinder
  lake.Transparency = 0.24
  lake.CanTouch = false
  lake.CanQuery = false
end
-- 탐험용 산악 협곡: 기존 지역 중심·자원·몬스터 좌표를 건드리지 않는다.
-- 경사 지형과 계단은 실제로 걸을 수 있고 중앙 이동로는 비워 둔다.
for side = -1, 1, 2 do
  local valleyX = side * 145
  for step = 1, 6 do
    local height = 3 + step * 1.8
    local ledge = civPart(civHub, "협곡 계단 " .. side .. " " .. step,
      Vector3.new(12, 2, 9), CFrame.new(valleyX + side * step * 9, height - 2, 72 + step * 9),
      Color3.fromRGB(125, 116, 99), Enum.Material.Rock, true)
    ledge:SetAttribute("WalkableGround", true)
  end
end
-- 대륙 가장자리의 작은 숲 지대. 탐험 길목과 기존 문명 시설은 가리지 않는다.
for index = 1, 24 do
  local angle = index * math.pi * 2 / 24
  local radius = 175 + (index % 3) * 12
  local x, z = math.cos(angle) * radius, math.sin(angle) * radius
  local trunk = civPart(civHub, "야생숲 고목 " .. index,
    Vector3.new(2, 7, 2), CFrame.new(x, 3, z),
    Color3.fromRGB(102, 77, 53), Enum.Material.Wood, false)
  trunk.CanTouch = false
  trunk.CanQuery = false
  local crown = civPart(civHub, "야생숲 수관 " .. index,
    Vector3.new(8, 9, 8), CFrame.new(x, 9, z),
    Color3.fromRGB(75 + index % 4 * 11, 107 + index % 3 * 9, 75),
    Enum.Material.Grass, false)
  crown.Shape = Enum.PartType.Ball
  crown.CanTouch = false
  crown.CanQuery = false
end
local lobbyGround = civPart(civHub, "CivilizationLobbyGround", Vector3.new(64, 2, 64),
  CFrame.new(0, -1, 0), Color3.fromRGB(111, 132, 101), Enum.Material.Slate, true)
lobbyGround:SetAttribute("WalkableGround", true)
-- Ancient low-poly meeting square: radial stone path, timber stalls and monument stones.
local centralPath = civPart(civHub, "로비 석재 산책로", Vector3.new(9, 0.15, 58),
  CFrame.new(0, 0.08, 0), Color3.fromRGB(162, 145, 116), Enum.Material.Cobblestone, false)
centralPath.CanTouch = false
centralPath.CanQuery = false
for _, side in ipairs({-1, 1}) do
  local offset = side * 23
  local garden = civPart(civHub, "로비 정원 " .. side, Vector3.new(9, 0.3, 27),
    CFrame.new(offset, 0.05, 0), Color3.fromRGB(77, 116, 77), Enum.Material.Grass, false)
  garden.CanTouch = false
  garden.CanQuery = false
  for index = 1, 3 do
    local z = -16 + index * 10
    local trunk = civPart(civHub, "로비 나무줄기 " .. side .. "-" .. index,
      Vector3.new(1.3, 5, 1.3), CFrame.new(offset, 2.7, z),
      Color3.fromRGB(103, 75, 52), Enum.Material.Wood, false)
    trunk.CanTouch = false
    trunk.CanQuery = false
    local crown = civPart(civHub, "로비 로우폴리 수관 " .. side .. "-" .. index,
      Vector3.new(6, 6, 6), CFrame.new(offset, 7, z),
      Color3.fromRGB(81, 120, 86), Enum.Material.Grass, false)
    crown.Shape = Enum.PartType.Ball
    crown.CanTouch = false
    crown.CanQuery = false
  end
end
local lobbyInfoStone = civPart(civHub, "로비 모험 안내석", Vector3.new(5, 5, 1.5),
  CFrame.new(-11, 2.5, -14), Color3.fromRGB(152, 143, 122), Enum.Material.Slate, false)
lobbyInfoStone.CanTouch = false
lobbyInfoStone.CanQuery = false
civSign(civHub, lobbyInfoStone, "문명 선택 · 맵 이동\\n채집 · 전투 · 연구", 4)

local lobbyBase = civPart(civHub, "광장 석상 기단", Vector3.new(8, 0.8, 5),
  CFrame.new(0, 0.4, -11), Color3.fromRGB(107, 74, 47), Enum.Material.Slate, false)
lobbyBase.CanTouch = false
  lobbyBase.CanQuery = false
local lobbyCore = civPart(civHub, "광장 차원 심장", Vector3.new(3.2, 5, 0.5),
  CFrame.new(0, 3.5, -11), Color3.fromRGB(232, 163, 61), Enum.Material.Neon, false)
lobbyCore.Transparency = 0.38
local lobbyLight = Instance.new("PointLight")
lobbyLight.Name = "AmberPortalGlow"
lobbyLight.Color = Color3.fromRGB(232, 163, 61)
lobbyLight.Brightness = 0.65
lobbyLight.Range = 12
lobbyLight.Shadows = false
lobbyLight.Parent = lobbyCore
lobbyCore.CanTouch = false
  lobbyCore.CanQuery = false
civSign(civHub, lobbyCore, "대충알피지\n24개 문명 포털 광장", 6.5)
for _, side in ipairs({-1, 1}) do
  local pillar = civPart(civHub, "광장 석상 기둥 " .. side, Vector3.new(1.5, 6, 1.8),
    CFrame.new(side * 2.8, 3.5, -11), Color3.fromRGB(184, 166, 125), Enum.Material.Sandstone, false)
  pillar.CanTouch = false
  pillar.CanQuery = false
  local torch = civPart(civHub, "광장 횃불 " .. side, Vector3.new(0.9, 0.9, 0.9),
    CFrame.new(side * 2.8, 6.9, -11), Color3.fromRGB(255, 243, 196), Enum.Material.Neon, false)
  torch.Shape = Enum.PartType.Ball
  torch.CanTouch = false
  torch.CanQuery = false
end
local lobbyCrown = civPart(civHub, "광장 석상 관석", Vector3.new(7.5, 1.5, 2.1),
  CFrame.new(0, 7.2, -11), Color3.fromRGB(138, 90, 56), Enum.Material.Sandstone, false)
lobbyCrown.CanTouch = false
  lobbyCrown.CanQuery = false
-- 네 대표 문명 포털을 계획서의 피오르드·사막·산악·평원 테마로 장식한다.
-- 장식은 이동 패드와 독립적이며 길막/터치 판정에 참여하지 않는다.
local portalThemes = {
  [1] = {name="로마 평원", color=Color3.fromRGB(130, 152, 91), material=Enum.Material.Grass},
  [2] = {name="이집트 사막", color=Color3.fromRGB(198, 171, 108), material=Enum.Material.Sand},
  [12] = {name="바이킹 피오르드", color=Color3.fromRGB(89, 133, 152), material=Enum.Material.Slate},
  [15] = {name="고조선 산악", color=Color3.fromRGB(105, 124, 102), material=Enum.Material.Rock},
}
local function decorateFeaturedPortal(id, frame)
  local theme = portalThemes[id]
  if not theme then return end
  for side = -1, 1, 2 do
    local scenery = civPart(civHub, theme.name .. " 경관석 " .. side,
      Vector3.new(3, 2.8 + id % 3, 2.4),
      frame * CFrame.new(side * 6.8, 1.2, 4.4),
      theme.color, theme.material, false)
    scenery.Shape = (id == 12 or id == 15) and Enum.PartType.Wedge or Enum.PartType.Block
    scenery.CanCollide = false
    scenery.CanTouch = false
    scenery.CanQuery = false
  end
end
-- 네 대표 문명만 특색 있는 입구를 추가하고 나머지 20개 포털은 그대로 둔다.
local featuredPortalColors = {
  [1] = Color3.fromRGB(169, 82, 64),  -- 로마
  [2] = Color3.fromRGB(232, 163, 61), -- 이집트
  [12] = Color3.fromRGB(44, 74, 110), -- 바이킹
  [15] = Color3.fromRGB(95, 110, 60), -- 고조선
}
for id = 1, 24 do
  local race = RaceData.GetRace(id)
  local angle = 2 * math.pi * (id - 1) / 24
  local center = Vector3.new(math.cos(angle) * civ.WorldRadius, 0, math.sin(angle) * civ.WorldRadius)
  civWorlds[id] = center
  local region = Instance.new("Folder")
  region.Name = race.Name
  region.Parent = civHub
  local ground = civPart(region, "CivilizationGround", Vector3.new(39, 2, 39), CFrame.new(center), civRegions[((id - 1) % #civRegions) + 1], Enum.Material.Slate, true)
  ground:SetAttribute("WalkableGround", true)
  -- 문명마다 지표 색·질감이 다른 야외 생태 지대를 연결한다.
  -- 주요 채집 시설 및 보스 생성 좌표는 기존 섬 위에 그대로 둔다.
  local biomeColor = civRegions[((id - 1) % #civRegions) + 1]
  local biomeMat = (id % 6 == 2 or id % 6 == 0) and Enum.Material.Sand
    or (id % 6 == 4) and Enum.Material.Snow or Enum.Material.Grass
  local biome = civPart(region, "문명 외곽 야생지", Vector3.new(51, 0.3, 51),
    CFrame.new(center + Vector3.new(0, -0.82, 0)), biomeColor, biomeMat, false)
  biome.CanTouch = false
  biome.CanQuery = false
  -- 중앙과 지역 사이에 실제 걷는 길을 시각적으로 표시한다.
  local direction = Vector3.new(center.X, 0, center.Z).Unit
  local roadCenter = direction * (civ.WorldRadius * 0.5)
  local road = civPart(region, "문명 연결 산책로", Vector3.new(8, 0.13, civ.WorldRadius - 45),
    CFrame.lookAt(roadCenter + Vector3.new(0, -0.85, 0), center), 
    Color3.fromRGB(151, 132, 101), Enum.Material.Ground, false)
  road.CanTouch = false
  road.CanQuery = false
  -- 길가 표지석으로 넓어진 필드에서도 각 문명까지의 방향을 읽을 수 있게 한다.
  for step = 1, 2 do
    local markerPosition = direction * (civ.WorldRadius * (0.35 + step * 0.2))
      + Vector3.new(-direction.Z, 0, direction.X) * 7
    local marker = civPart(region, "문명 길잡이 " .. step,
      Vector3.new(2, 3.5, 2), CFrame.new(markerPosition + Vector3.new(0, 1, 0)),
      Color3.fromRGB(135, 125, 108), Enum.Material.Slate, false)
    marker.CanTouch = false
    marker.CanQuery = false
    if step == 2 then
      civSign(region, marker, race.Name .. " 방면", 3.2)
    end
  end
  -- 문명 지역의 로우폴리 자연 경관: 전투·채집 경로를 막지 않는 비충돌 장식.
  local foliageColors = {
    Color3.fromRGB(86, 115, 79),
    Color3.fromRGB(121, 129, 91),
    Color3.fromRGB(102, 124, 116),
    Color3.fromRGB(158, 141, 95),
  }
  for index, offset in ipairs({
    Vector3.new(-17, 0, -17),
    Vector3.new(17, 0, -16),
    Vector3.new(17, 0, 17),
  }) do
    local base = center + offset
    local trunk = civPart(region, "고목 줄기 " .. index, Vector3.new(1.8, 7, 1.8),
      CFrame.new(base + Vector3.new(0, 4.5, 0)),
      Color3.fromRGB(108, 79, 57), Enum.Material.Wood, false)
    trunk.CanTouch = false
    trunk.CanQuery = false
    local canopy = civPart(region, "숲 수관 " .. index, Vector3.new(7, 7, 7),
      CFrame.new(base + Vector3.new(0, 9, 0)),
      foliageColors[((id + index - 2) % #foliageColors) + 1],
      Enum.Material.Grass, false)
    canopy.Shape = Enum.PartType.Ball
    canopy.CanTouch = false
    canopy.CanQuery = false
  end
  for index, offset in ipairs({
    Vector3.new(-18, 0, 13),
    Vector3.new(12, 0, -18),
  }) do
    local rock = civPart(region, "풍화 암석 " .. index, Vector3.new(5, 3 + id % 3, 4),
      CFrame.new(center + offset + Vector3.new(0, 2, 0))
        * CFrame.Angles(0, math.rad((id * 19 + index * 37) % 90), math.rad(8)),
      Color3.fromRGB(110 + id % 4 * 8, 107 + id % 3 * 8, 98),
      Enum.Material.Rock, false)
    rock.CanTouch = false
    rock.CanQuery = false
  end
  local monument = civPart(region, "Landmark", Vector3.new(8, 13, 8), CFrame.new(center + Vector3.new(-11, 7.5, -9)), Color3.fromRGB(184, 166, 125), Enum.Material.Sandstone, true)
  monument.Shape = (id % 3 == 0) and Enum.PartType.Cylinder or Enum.PartType.Block
  civSign(region, monument, race.Name .. "\n" .. race.Landmark, 9)
  -- Existing landmark is the authoritative interaction target, not a client-controlled reward.
  local landmarkPrompt = Instance.new("ProximityPrompt")
  landmarkPrompt.Name = "LandmarkHistory"
  landmarkPrompt.ActionText = "유적 살펴보기"
  landmarkPrompt.ObjectText = race.Landmark
  landmarkPrompt.KeyboardKeyCode = Enum.KeyCode.E
  landmarkPrompt.MaxActivationDistance = 11
  landmarkPrompt.RequiresLineOfSight = false
  landmarkPrompt.Parent = monument
  landmarkPrompt.Triggered:Connect(function(visitor)
    if not visitor:IsA("Player") or not civRace(visitor) then return end
    local character = visitor.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    if not root or (root.Position - monument.Position).Magnitude > 13 then return end
    civMessage(visitor, race.Name .. " 유적: " .. race.Landmark)
  end)
  local resources = {
    {Type = "Wood", Label = "목재", Color = Color3.fromRGB(91, 121, 79)},
    {Type = "Stone", Label = "석재", Color = Color3.fromRGB(109, 113, 116)},
    {Type = "Bronze", Label = "청동", Color = Color3.fromRGB(191, 124, 56)},
    {Type = "Iron", Label = "기존 철 자원", Color = Color3.fromRGB(82, 110, 132)},
    {Type = "CopperOre", Label = "구리 광석", Color = Color3.fromRGB(184, 110, 60)},
    {Type = "TinOre", Label = "주석 광석", Color = Color3.fromRGB(157, 163, 172)},
    {Type = "IronOre", Label = "철광석", Color = Color3.fromRGB(101, 120, 128)},
    {Type = "Coal", Label = "석탄", Color = Color3.fromRGB(65, 67, 70)},
  }
  for index, resource in ipairs(resources) do
    local px = index <= 4 and (((index - 1) % 2) * 11 - 1)
      or ((index - 5) % 4) * 9 - 14
    local pz = index <= 4 and (math.floor((index - 1) / 2) * 12 - 2) or -14
    local node = civPart(region, resource.Label, Vector3.new(4, 5, 4), CFrame.new(center + Vector3.new(px, 3.5, pz)), resource.Color, Enum.Material.Rock, true)
    node.Shape = Enum.PartType.Ball
    node:SetAttribute("CivilizationResourceType", resource.Type)
    civSign(region, node, resource.Label .. " 채집", 4)
    local gatherPrompt = Instance.new("ProximityPrompt")
    gatherPrompt.Name = "GatherResource"
    gatherPrompt.ActionText = "채집"
    gatherPrompt.ObjectText = resource.Label
    gatherPrompt.KeyboardKeyCode = Enum.KeyCode.E
    gatherPrompt.MaxActivationDistance = 10
    gatherPrompt.RequiresLineOfSight = false
    gatherPrompt.Parent = node
    gatherPrompt.Triggered:Connect(function(gatherer)
      if not gatherer:IsA("Player") or not civRace(gatherer) then return end
      local character = gatherer.Character
      local root = character and character:FindFirstChild("HumanoidRootPart")
      if not root or (root.Position - node.Position).Magnitude > 12 then return end
      civGather(gatherer, resource.Type)
    end)
    table.insert(civNodes, {Part = node, Type = resource.Type, Label = resource.Label})
  end
  civSpawnEnemy(id, center)
  civSpawnGrazer(id, center)
  if id == 15 then civSpawnEnemy(id, center, "WildBoar")
  elseif id == 2 then civSpawnEnemy(id, center, "BronzeGolem")
  elseif id == 1 then civSpawnEnemy(id, center, "IronKnight") end
  local stations = {}
  local stationTypes = {
    {Key="Bench", Label="제작 작업대", Offset=Vector3.new(-11, 2, 12), Material=Enum.Material.Wood},
    {Key="Furnace", Label="용광로", Offset=Vector3.new(-13, 2, 5), Material=Enum.Material.Brick},
    {Key="BlastFurnace", Label="고로", Offset=Vector3.new(-7, 2, 5), Material=Enum.Material.Metal},
  }
  for _, item in ipairs(stationTypes) do
    local station = civPart(region, item.Label, Vector3.new(3, 4, 3), CFrame.new(center + item.Offset), Color3.fromRGB(110, 99, 84), item.Material, true)
    civSign(region, station, item.Label, 4)
    stations[item.Key] = station
  end
  civStations[id] = stations
  local tradeStall = civPart(region, "문명 무역소", Vector3.new(5, 4, 4),
    CFrame.new(center + Vector3.new(12, 3, 12)), Color3.fromRGB(132, 105, 75),
    Enum.Material.WoodPlanks, true)
  civSign(region, tradeStall, race.Name .. " 무역 광장", 4)
  civTradeStalls[id] = tradeStall
  local tradePrompt = Instance.new("ProximityPrompt")
  tradePrompt.Name = "TradeMarket"
  tradePrompt.ActionText = "시세 확인/거래"
  tradePrompt.ObjectText = race.Name .. " 무역소"
  tradePrompt.KeyboardKeyCode = Enum.KeyCode.R -- M is reserved for opening the trade HUD
  tradePrompt.MaxActivationDistance = 12
  tradePrompt.RequiresLineOfSight = false
  tradePrompt.Parent = tradeStall
  tradePrompt.Triggered:Connect(function(trader)
    if not trader:IsA("Player") or trader:GetAttribute("CivReady") ~= true then return end
    if not civRace(trader) or not civNearTradeStall(trader) then return end
    marketUpdateEvent:FireClient(trader, MultiverseEconomy.Snapshot(), true)
  end)
  local portal = civPart(civHub, "포털 " .. race.Name, Vector3.new(4, 0.3, 4),
    CFrame.new(math.cos(angle) * 24, 0.2, math.sin(angle) * 24), Color3.fromRGB(111, 191, 222), Enum.Material.Neon, false)
  civSign(civHub, portal, race.Name, 3)
  -- 기존 Touched 이동 패드는 건드리지 않고 뒤편에 4문명 장식 아치를 배치한다.
  local accent = featuredPortalColors[id]
  if accent then
    local portalFrame = CFrame.lookAt(portal.Position,
      Vector3.new(0, portal.Position.Y, 0))
    decorateFeaturedPortal(id, portalFrame)
    local shimmer = civPart(civHub, race.Name .. " 차원문 빛",
      Vector3.new(3.1, 4.2, 0.25), portalFrame * CFrame.new(0, 2.8, 2),
      accent, Enum.Material.Neon, false)
    shimmer.Transparency = 0.52
    shimmer.CanTouch = false
  shimmer.CanQuery = false
    for _, side in ipairs({-1, 1}) do
      local column = civPart(civHub, race.Name .. " 차원문 기둥 " .. side,
        Vector3.new(1, 5.8, 1.1), portalFrame * CFrame.new(side * 2.25, 3.0, 2),
        Color3.fromRGB(184, 166, 125), Enum.Material.Sandstone, false)
      column.CanTouch = false
  column.CanQuery = false
    end
    local lintel = civPart(civHub, race.Name .. " 차원문 관석",
      Vector3.new(5.7, 0.9, 1.1), portalFrame * CFrame.new(0, 6.15, 2),
      accent, Enum.Material.Slate, false)
    lintel.CanTouch = false
  lintel.CanQuery = false
  end
  local lastPortal = {}
  portal.Touched:Connect(function(hit)
    local character = hit:FindFirstAncestorOfClass("Model")
    local player = character and Players:GetPlayerFromCharacter(character)
    if not player or readNumber(player, "CivRaceID", 0) == 0 then return end
    local now = os.clock()
    if now - (lastPortal[player] or -1e9) < 2 then return end
    lastPortal[player] = now
    civTravel(player, id)
  end)
end
MultiverseEconomy.StartCaravans(civHub, civWorlds)
-- 적 추적과 예고 공격: 클라이언트 타임스탬프를 절대 신뢰하지 않는다.
task.spawn(function()
  while task.wait(0.25) do
    local now = os.clock()
    CompanionAI.Tick(civEnemies, civNodes, civIncrease)
    AdvancedAIEcosystem.RefreshPlayerIndex(now)
    if MultiverseEconomy.Tick(now) then
      marketUpdateEvent:FireAllClients(MultiverseEconomy.Snapshot())
    end
    if WeatherSystem.Tick(now, civWorlds) then
      weatherSyncEvent:FireAllClients(WeatherSystem.Snapshot())
    end
    -- Herbivores graze occasionally; this loop is shared with the existing monster AI.
    for _, grazer in pairs(civWildlife) do
      if grazer.Humanoid.Health <= 0 then
        if now - grazer.LastPredated >= 20 then
          grazer.Humanoid.Health = grazer.Humanoid.MaxHealth
          grazer.Model:PivotTo(CFrame.new(grazer.Home))
        end
      elseif now - grazer.LastGraze >= 3.5 then
        grazer.LastGraze = now
        local angle = now * 0.19 + grazer.Home.X * 0.05
        grazer.Model:PivotTo(CFrame.new(grazer.Home + Vector3.new(math.cos(angle) * 5, 0, math.sin(angle) * 5)))
      end
    end
    for _, enemy in ipairs(civEnemies) do
      -- 레이드 페이즈는 서버 체력값만 사용하고 기존 몬스터 AI 틱에서 처리한다.
      if enemy.Model:GetAttribute("IsRaidBoss") == true and enemy.Humanoid.Health > 0
        and enemy.Humanoid.MaxHealth > 0 then
        local fraction = enemy.Humanoid.Health / enemy.Humanoid.MaxHealth
        local phase = enemy.Model:GetAttribute("BossPhase") or "Phase1"
        local nextPhase = fraction <= 0.3 and "Phase3"
          or (fraction <= 0.6 and phase == "Phase1") and "Phase2" or phase
        if nextPhase ~= phase then
          enemy.Model:SetAttribute("BossPhase", nextPhase)
          enemy.Model:SetAttribute("RaidPhaseChangedAt", now)
        end
      end
      -- Existing raid bosses use server-side health thresholds for the three phases.
      if enemy.Model:GetAttribute("IsRaidBoss") == true and enemy.Humanoid.Health > 0 then
        local ratio = enemy.Humanoid.Health / math.max(1, enemy.Humanoid.MaxHealth)
        local phase = ratio <= 0.3 and "Phase3" or ratio <= 0.6 and "Phase2" or "Phase1"
        if enemy.Model:GetAttribute("BossPhase") ~= phase then
          enemy.Model:SetAttribute("BossPhase", phase)
          enemy.Root.Color = phase == "Phase3" and Color3.fromRGB(174, 66, 73)
            or phase == "Phase2" and Color3.fromRGB(191, 125, 66)
            or Color3.fromRGB(81 + enemy.RaceID % 4 * 25, 75, 64)
        end
      end
      -- Dead or stunned enemies cannot keep a stale attack windup or auto-parry cue.
      if enemy.Humanoid.Health <= 0 or now < enemy.StunnedUntil then
        enemy.TelegraphAt = 0
        enemy.TargetUserId = nil
        if enemy.Model:GetAttribute("IsPreparingAttack") == true then
          enemy.Model:SetAttribute("IsPreparingAttack", false)
        end
      end
      if enemy.Humanoid.Health > 0 and now >= enemy.StunnedUntil then
        local target, dist = AdvancedAIEcosystem.ClosestPlayer(enemy.Root.Position, 32)
        if target then
          local root = target.Character and target.Character:FindFirstChild("HumanoidRootPart")
          if root then
            if enemy.Humanoid.Health <= enemy.Humanoid.MaxHealth * 0.2 and dist < 10 then
              AdvancedAIEcosystem.SetState(enemy, "Flee")
              enemy.TelegraphAt = 0
              enemy.TargetUserId = nil
              enemy.Model:SetAttribute("IsPreparingAttack", false)
              local away = enemy.Root.Position - root.Position
              local planar = Vector3.new(away.X, 0, away.Z)
              if planar.Magnitude > 0.1 then
                local nextPos = enemy.Root.Position + planar.Unit * 1.2
                if (Vector3.new(nextPos.X - enemy.Home.X, 0, nextPos.Z - enemy.Home.Z)).Magnitude <= 16 then
                  enemy.Model:PivotTo(CFrame.new(nextPos))
                end
              end
            else
              AdvancedAIEcosystem.SetState(enemy, "Combat")
              if enemy.TelegraphAt > 0 and now >= enemy.TelegraphAt then
                local intendedUserId = enemy.TargetUserId
                enemy.TelegraphAt = 0
                enemy.TargetUserId = nil
                enemy.Model:SetAttribute("IsPreparingAttack", false)
                enemy.LastHit = now
                -- Only the real server-telegraphed target can receive mobile smart guard.
                if intendedUserId == target.UserId then
                  if target:GetAttribute("CivAutoCombatEnabled") == true
                    and (root.Position - enemy.Root.Position).Magnitude <= 9 then
                    civGuard(target) -- preserves existing GuardCooldown and parry reward window
                  end
                  civOnEnemyStrike(enemy, target, now)
                end
              elseif enemy.TelegraphAt <= 0 then
              if dist > 7 then
                local chasePosition = AdvancedAIEcosystem.ChaseTarget(enemy, root.Position, now)
                local step = chasePosition - enemy.Root.Position
                local planar = Vector3.new(step.X, 0, step.Z)
                if planar.Magnitude > 0.1 then
                  local p = enemy.Root.Position + planar.Unit * math.min(1.2, planar.Magnitude)
                  if (Vector3.new(p.X - enemy.Home.X, 0, p.Z - enemy.Home.Z)).Magnitude <= 16 then
                    enemy.Model:PivotTo(CFrame.lookAt(p, Vector3.new(chasePosition.X, p.Y, chasePosition.Z)))
                  end
                end
              elseif now - enemy.LastHit >= (enemy.Model:GetAttribute("BossPhase") == "Phase3" and 0.95
                  or enemy.Model:GetAttribute("BossPhase") == "Phase2" and 1.2 or 1.5) then
                enemy.TelegraphAt = now + (enemy.Model:GetAttribute("BossPhase") == "Phase3" and 0.45 or 0.65)
                enemy.TargetUserId = target.UserId
                enemy.Model:SetAttribute("IsPreparingAttack", true)
                remote:FireClient(target, "CIV_TELEGRAPH", {Enemy = enemy.Model.Name})
              end
            end
            end
          end
        elseif enemy.TelegraphAt > 0 then
          AdvancedAIEcosystem.SetState(enemy, "Idle")
          enemy.TelegraphAt = 0
          enemy.TargetUserId = nil
          enemy.Model:SetAttribute("IsPreparingAttack", false)
        elseif now - enemy.LastHit >= 3 then
          enemy.Model:SetAttribute("IsPreparingAttack", false)
          AdvancedAIEcosystem.SetState(enemy, "Patrol")
          -- Predation runs only when no living player is targeted.
          local grazer = civWildlife[enemy.RaceID]
          if grazer and grazer.Humanoid.Health > 0
              and (grazer.Root.Position - enemy.Home).Magnitude <= 16 then
            local delta = grazer.Root.Position - enemy.Root.Position
            if delta.Magnitude > 4 then
              local planar = Vector3.new(delta.X, 0, delta.Z)
              if planar.Magnitude > 0.1 then
                local candidate = enemy.Root.Position + planar.Unit * math.min(1.1, planar.Magnitude)
                if (Vector3.new(candidate.X - enemy.Home.X, 0, candidate.Z - enemy.Home.Z)).Magnitude <= 16 then
                  enemy.Model:PivotTo(CFrame.lookAt(candidate, Vector3.new(grazer.Root.Position.X, candidate.Y, grazer.Root.Position.Z)))
                end
              end
            else
              enemy.LastHit = now
              grazer.Humanoid:TakeDamage(8)
              if grazer.Humanoid.Health <= 0 then grazer.LastPredated = now end
            end
          end
        end
      end
    end
  end
end)

local handlers = {
  ["genre-core"] = scopeHandler1,
  ["scope-corefun-c16858d7fc"] = scopeHandler2,
  ["scope-coreloop-0-ef0535c873"] = scopeHandler3,
  ["scope-coreloop-1-751b04e48c"] = scopeHandler4,
  ["scope-coreloop-2-0a34a5aee7"] = scopeHandler5,
  ["scope-mobileux-dc1239c515"] = scopeHandler6,
}

-- 속성 복제와 병행해 본인에게만 인벤토리 스냅샷 전송; 서버 값이 유일한 원본이다.
local inventorySyncPending = {}
local function queueInventorySync(player)
  if inventorySyncPending[player] then return end
  inventorySyncPending[player] = true
  task.delay(0.1, function()
    inventorySyncPending[player] = nil
    if player.Parent ~= Players or player:GetAttribute("CivReady") ~= true then return end
    local snapshot = {}
    for key, fallback in pairs(Config.InitialState) do
      if key:sub(1, 3) == "Civ" then
        snapshot[key] = readNumber(player, key, fallback)
      end
    end
    syncInventoryEvent:FireClient(player, snapshot)
  end)
end
local function bindInventorySync(player)
  player.AttributeChanged:Connect(function(name)
    if name:sub(1, 3) == "Civ" and name ~= "CivReady" then
      queueInventorySync(player)
    end
  end)
end

Players.PlayerAdded:Connect(function(player)
  bindInventorySync(player)
  player:SetAttribute("CivReady", false)
  bindFoundationPlayer(player)
  initializePlayer(player)
  local loadOk, saved = false, nil
  if store then
    for attempt = 1, 3 do
      loadOk, saved = pcall(function()
        return store:GetAsync("player:" .. player.UserId)
      end)
      if loadOk then break end
      task.wait(0.4 * attempt)
    end
  end
  if loadOk and (saved == nil or typeof(saved) == "table") then
    civDataLoadValid[player] = true
    if typeof(saved) == "table" then
      for key, fallback in pairs(Config.InitialState) do
        local value = saved[key]
        if typeof(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge then
          player:SetAttribute(key, value)
        else
          player:SetAttribute(key, fallback)
        end
      end
    end
  else
    -- Never overwrite a previously saved player with a fallback when GetAsync failed.
    civDataLoadValid[player] = false
    warn("CIV_LOAD_FAILURE_BLOCKS_SAVE", player.UserId, tostring(saved))
  end
  player:SetAttribute("CivSaveAvailable", civDataLoadValid[player] == true)
  player:SetAttribute("CivReady", true)
  weatherSyncEvent:FireClient(player, WeatherSystem.Snapshot())
  queueInventorySync(player)
  civApplyCharacterPassive(player)
  civApplySkinTone(player)
  civRestoreBuildings(player)
  -- 리저브 서버 도착 후 실제 저장된 최종 연구 완료 여부를 재검증한다.
  local joinOk, joinData = pcall(function() return player:GetJoinData() end)
  local portalData = joinOk and joinData and joinData.TeleportData
  if typeof(portalData) == "table" and portalData.CivPortalGameId == "simple-rpg"
    and readNumber(player, "CivTech", 0) >= 72
    and typeof(portalData.CivDestinationRaceID) == "number"
    and portalData.CivDestinationRaceID % 1 == 0
    and RaceData.GetRace(portalData.CivDestinationRaceID) then
    task.spawn(function()
      if player.Parent ~= Players then return end
      if not player.Character then player.CharacterAdded:Wait() end
      task.wait(0.1)
      if player.Parent == Players then civTravel(player, portalData.CivDestinationRaceID) end
    end)
  end
  player.CharacterAdded:Connect(function()
    task.wait(0.1)
    civApplyCharacterPassive(player)
    civApplySkinTone(player)
  end)
end)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    bindFoundationPlayer(player)
    if player:GetAttribute("Score") == nil then initializePlayer(player) end
    bindInventorySync(player)
    -- No verified GetAsync in a hot-injected preexisting-player session.
    civDataLoadValid[player] = false
    player:SetAttribute("CivSaveAvailable", false)
    player:SetAttribute("CivReady", true)
    weatherSyncEvent:FireClient(player, WeatherSystem.Snapshot())
    queueInventorySync(player)
    civRestoreBuildings(player)
  end)
end
-- 신규 통신은 기존 전투/연구 권한 함수로 이어지고, 클라이언트가 보상을 결정하지 못한다.
parryEvent.OnServerEvent:Connect(function(player)
  if player:GetAttribute("CivReady") ~= true then return end
  civGuard(player)
end)
dodgeEvent.OnServerEvent:Connect(function(player)
  if player:GetAttribute("CivReady") ~= true then return end
  civDodge(player)
end)
unlockTechRequest.OnServerInvoke = function(player, techID)
  return civResearch(player, techID)
end
craftRequestRemote.OnServerEvent:Connect(function(player, recipeID)
  civTimedCraft(player, recipeID)
end)
portalTeleportEvent.OnServerEvent:Connect(function(player, destinationID)
  civPortalTeleport(player, destinationID)
end)
tradeRequestRemote.OnServerEvent:Connect(function(player, itemID, amount, isBuying, currency)
  civTrade(player, itemID, amount, isBuying, currency)
end)
buildRequestRemote.OnServerEvent:Connect(function(player, buildingKey, requestedPosition)
  if player:GetAttribute("CivReady") ~= true or typeof(requestedPosition) ~= "Vector3" then return end
  civBuild(player, buildingKey, requestedPosition)
end)
weatherSyncEvent.OnServerEvent:Connect(function(player, request)
  if request ~= "Snapshot" or player:GetAttribute("CivReady") ~= true then return end
  if not civNowReady(player, "WeatherSnapshot", 2) then return end
  weatherSyncEvent:FireClient(player, WeatherSystem.Snapshot())
end)
autoCombatEvent.OnServerEvent:Connect(function(player, actionType, targetModel)
  if player:GetAttribute("CivReady") ~= true then return end
  if typeof(actionType) ~= "string" then return end
  if actionType == "SetEnabled" then
    if typeof(targetModel) ~= "boolean" then return end
    player:SetAttribute("CivAutoCombatEnabled", targetModel)
    return
  end
  if actionType ~= "AutoAttack" or player:GetAttribute("CivAutoCombatEnabled") ~= true then return end
  if typeof(targetModel) ~= "Instance" or not targetModel:IsA("Model") then return end
  if targetModel.Parent ~= civHub or targetModel:GetAttribute("CivilizationEnemy") ~= true then return end
  local verified = false
  for _, enemy in ipairs(civEnemies) do
    if enemy.Model == targetModel and enemy.Humanoid.Health > 0 then verified = true; break end
  end
  if not verified then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  local targetRoot = targetModel:FindFirstChild("HumanoidRootPart")
  if not root or not root:IsA("BasePart") or not humanoid or humanoid.Health <= 0
    or not targetRoot or not targetRoot:IsA("BasePart") then return end
  if (targetRoot.Position - root.Position).Magnitude > 12 then return end
  -- No arbitrary 15-damage injection: existing attack weapon gates, rewards and cooldown.
  civAttack(player, targetModel)
end)
-- 통합 액션 입력: 기존 ID는 그대로 두고 문명 전용 ID만 추가한다.
remote.OnServerEvent:Connect(function(player, actionId, argument)
  if player:GetAttribute("CivReady") ~= true then return end
  if typeof(actionId) ~= "string" or #actionId > 80 then return end
  local handler = handlers[actionId]
  local civActions = {
    CivSelect = civSelect, CivTravel = civTravel, CivAttack = civAttack,
    CivGuard = civGuard, CivDodge = civDodge, CivGather = civGather,
    CivResearch = civResearch, CivCompanion = civCompanion,
    CivCraft = civCraft, CivBuild = civBuild, CivEquip = civEquip,
    CivSkinTone = civSetSkinTone,
  }
  local action = handler or civActions[actionId]
  if typeof(action) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or -1e9
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  if actionId == "CivTravel" then
    local selected = readNumber(player, "CivRaceID", 0)
    if not civNowReady(player, "Travel", 1.5) then return end
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not character or not humanoid or humanoid.Health <= 0 then return end
    if typeof(argument) == "number" and argument % 1 == 0 and RaceData.GetRace(argument) then
      if selected <= 0 then civMessage(player, "먼저 문명을 선택해."); return end
      action(player, argument)
    elseif argument == "Lobby" then
      character:PivotTo(CFrame.new(0, 5, 0))
    elseif selected > 0 then
      local root = character:FindFirstChild("HumanoidRootPart")
      if root and Vector3.new(root.Position.X, 0, root.Position.Z).Magnitude > 80 then
        character:PivotTo(CFrame.new(0, 5, 0))
      else action(player, selected) end
    else
      character:PivotTo(CFrame.new(0, 5, 0))
    end
  elseif actionId == "CivSelect" or actionId == "CivCompanion" or actionId == "CivCraft"
    or actionId == "CivBuild" or actionId == "CivEquip" or actionId == "CivSkinTone" then
    action(player, argument)
  else
    action(player)
  end
end)
-- 같은 기존 저장소/키 사용, 수치 필드를 병합해 기존 데이터와 신규 연구를 함께 저장한다.
savePlayer = function(player)
  if not store or civDataLoadValid[player] ~= true then
    warn("CIV_SAVE_SKIPPED_UNVERIFIED_LOAD", player.UserId)
    return false
  end
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do
    snapshot[key] = readNumber(player, key, fallback)
  end
  local ok, err = false, nil
  for attempt = 1, 3 do
    ok, err = pcall(function()
      store:UpdateAsync("player:" .. player.UserId, function(existing)
        local merged = typeof(existing) == "table" and existing or {}
        for key, value in pairs(snapshot) do merged[key] = value end
        return merged
      end)
    end)
    if ok then break end
    task.wait(0.5 * attempt)
  end
  if not ok then warn("CIV_SAVE_FAILURE", player.UserId, tostring(err)) end
  return ok
end
Players.PlayerRemoving:Connect(function(player)
  savePlayer(player)
  if civBuildings[player] then civBuildings[player]:Destroy(); civBuildings[player] = nil end
  lastAction[player] = nil
  civCooldowns[player] = nil
  inventorySyncPending[player] = nil
  pendingTimedCraft[player] = nil
  civDataLoadValid[player] = nil
  player:SetAttribute("CivAutoCombatEnabled", false)
end)
task.spawn(function()
  while task.wait(120) do
    for _, player in ipairs(Players:GetPlayers()) do
      task.spawn(savePlayer, player)
    end
  end
end)
game:BindToClose(function()
  for _, player in ipairs(Players:GetPlayers()) do savePlayer(player) end
end)
