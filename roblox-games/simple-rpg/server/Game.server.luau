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
-- 구형 고정 Asset ID는 사용자 요청으로 전부 해제한다.
-- 현재 게임에 포함된 모델이라도 검증된 새 등록 표시가 없으면 사용하지 않는다.
local creatureFolder = Shared:FindFirstChild("CreatureModels")
local creatureAssetReady = 0
if creatureFolder then
  for _, model in ipairs(creatureFolder:GetChildren()) do
    if model:IsA("Model") and model:GetAttribute("CuratedExternalAsset") == true
      and (tonumber(model:GetAttribute("VerifiedRobloxAssetId")) or 0) > 0
      and model:FindFirstChildWhichIsA("BasePart", true) then
      creatureAssetReady += 1
    end
  end
end
Shared:SetAttribute("CreatureAssetsLoaded", creatureAssetReady)
Shared:SetAttribute("CreatureAssetsFailed", 0)
Shared:SetAttribute("CreatureAssetsExpected", 0)
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
  startGround.Transparency = 1
  startGround.CastShadow = false
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
foundationSpawn.Transparency = 1
foundationSpawn.CastShadow = false
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
-- Former Vibe-made 3D props are removed from rendering. Interaction and
-- collision parts are invisible; only verified imported prefabs may be visible.
local function civPart(parent, name, size, frame, _color, _material, collide)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.CFrame = frame
  part.Transparency = 1
  part.CastShadow = false
  part.Anchored = true
  part.CanCollide = collide ~= false
  part.Parent = parent
  local library = Shared:FindFirstChild("CuratedWorldModels")
  local key = name:match("^([^_]+)_") or name
  local template = library and (library:FindFirstChild(name) or library:FindFirstChild(key))
  if template and template:IsA("Model")
    and template:GetAttribute("CuratedExternalAsset") == true
    and (tonumber(template:GetAttribute("VerifiedRobloxAssetId")) or 0) > 0
    and template:FindFirstChildWhichIsA("BasePart", true) then
    local visual = template:Clone()
    visual.Name = "VerifiedExternalVisual"
    for _, child in ipairs(visual:GetDescendants()) do
      if child:IsA("BasePart") then
        child.Anchored = true
        child.CanCollide = false
        child.CanTouch = false
        child.CanQuery = false
      end
    end
    visual.Parent = parent
    visual:PivotTo(frame)
  end
  return part
end
-- Five-era environmental identity is derived from existing research progress;
-- civilization ID never determines the player's era.
-- Self-authored billboard scenery labels removed. UI/interaction data remains.
local function civSign(_parent, _adornee, _text, _height)
  return nil
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

-- 바이브 파츠 건축 모델 영구 제거: 원본 데이터와 건축 기록만 유지.
local function civVisualBuilding(_player, _key, _explicitPosition)
  return nil
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
-- 서버 권한 소켓/그리드 하우징. 게임의 기존 영지 건축과 저장 키는 변경하지 않는다.
local civHousingPieces = {
  SquareFoundation={Size=Vector3.new(8,1,8), Wood=4, Stone=4, Base=true},
  TriangleFoundation={Size=Vector3.new(8,1,8), Wood=4, Stone=3, Base=true},
  Wall={Size=Vector3.new(8,7,1), Wood=5, Stone=1},
  WindowWall={Size=Vector3.new(8,7,1), Wood=6, Stone=2},
  Doorframe={Size=Vector3.new(8,7,1), Wood=5, Stone=1},
  FlatRoof={Size=Vector3.new(8,1,8), Wood=6, Stone=2},
  Pillar={Size=Vector3.new(1,8,1), Wood=3, Stone=1},
  Stairs={Size=Vector3.new(8,1,3), Wood=6, Stone=2},
  Ceiling={Size=Vector3.new(8,1,8), Wood=5, Stone=2},
  TriangleCeiling={Size=Vector3.new(8,1,8), Wood=5, Stone=2},
  SlopedRoof={Size=Vector3.new(8,3,8), Wood=7, Stone=2},
  RoofCorner={Size=Vector3.new(8,3,8), Wood=7, Stone=3},
  FenceBase={Size=Vector3.new(8,1,2), Wood=3, Stone=2, Base=true},
  GateFrame={Size=Vector3.new(8,7,2), Wood=8, Stone=4},
  Railing={Size=Vector3.new(8,3,1), Wood=4, Stone=1},
  Ladder={Size=Vector3.new(3,8,1), Wood=5, Stone=1},
}
local civHousingCounts = {}
local civHousingRecords = {}
local function civBuildHousing(player, request)
  if typeof(request) ~= "table" or typeof(request.Key) ~= "string"
    or typeof(request.Position) ~= "Vector3" then return end
  local definition = civHousingPieces[request.Key]
  local race = civRace(player)
  if not definition or not race or player:GetAttribute("CivReady") ~= true then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  local world = request.Position
  if not root or not humanoid or humanoid.Health <= 0
    or world.X ~= world.X or world.Y ~= world.Y or world.Z ~= world.Z
    or math.abs(world.X) > 10000 or math.abs(world.Z) > 10000 then return end
  local center = civWorlds[race.ID]
  if not center then return end
  local snappedX = math.round((world.X-center.X)/8)*8
  local snappedZ = math.round((world.Z-center.Z)/8)*8
  if math.abs(snappedX) > 32 or math.abs(snappedZ) > 32 then return end
  local level = if definition.Base then 0 else math.clamp(math.round((world.Y-center.Y)/8),0,3)
  local basePosition = center + Vector3.new(snappedX,level*8,snappedZ)
  if (basePosition-root.Position).Magnitude > 23 then return end
  if (civHousingCounts[player] or 0) >= 40 then
    civMessage(player,"건축 부품 상한 40개에 도달했어.") return
  end
  local ownerFolder = civOwnerBuildings(player)
  local parentPiece = request.ParentPart
  local stability = 100
  if definition.Base then
    if level ~= 0 then return end
  else
    if typeof(parentPiece) ~= "Instance" or not parentPiece:IsA("BasePart")
      or not parentPiece:IsDescendantOf(ownerFolder)
      or parentPiece:GetAttribute("HousingPiece") ~= true
      or parentPiece:GetAttribute("CivOwnerUserId") ~= player.UserId then return end
    if (parentPiece.Position-basePosition).Magnitude > 12 then return end
    stability = math.clamp((tonumber(parentPiece:GetAttribute("Stability")) or 0)-20,0,100)
    if stability <= 0 then civMessage(player,"구조 안정성이 부족해.") return end
  end
  local rotation = tonumber(request.Rotation) or 0
  if rotation % 90 ~= 0 or rotation < 0 or rotation >= 360 then return end
  local placementCFrame = CFrame.new(basePosition + Vector3.new(0,definition.Size.Y/2,0))
    * CFrame.Angles(0,math.rad(rotation),0)
  -- 회전된 실제 건축 부피를 검사한다. 미관용 공용 에셋은 판정에서 제외.
  local overlapParams = OverlapParams.new()
  overlapParams.FilterType = Enum.RaycastFilterType.Exclude
  overlapParams.FilterDescendantsInstances = {character}
  local overlaps = workspace:GetPartBoundsInBox(placementCFrame,
    definition.Size - Vector3.new(0.12,0.12,0.12), overlapParams)
  for _, hit in ipairs(overlaps) do
    if hit:IsA("BasePart") and hit.CanCollide then
      local isOwnSupport = hit == parentPiece and not definition.Base
      local isGround = hit:GetAttribute("WalkableGround") == true
      local isContinent = hit.Name == "문명 대륙"
      if not isOwnSupport and not isGround and not isContinent then
        civMessage(player,"다른 구조물과 겹쳐 건축할 수 없어.")
        return
      end
    end
  end
  for _, part in ipairs(ownerFolder:GetDescendants()) do
    if part:IsA("BasePart") and part:GetAttribute("HousingPiece") == true
      and part ~= parentPiece and (part.Position-basePosition).Magnitude < 3 then return end
  end
  if not civNowReady(player,"BuildHousing",0.7) then return end
  local paid,missing = civSpend(player,{CivWood=definition.Wood,CivStone=definition.Stone})
  if not paid then civMessage(player,"건축 자원 부족: "..missing) return end
  local placeAt = basePosition + Vector3.new(0,definition.Size.Y/2,0)
  local piece = civPart(ownerFolder,request.Key.."_"..tostring(civHousingCounts[player] or 0),
    definition.Size,CFrame.new(placeAt)*CFrame.Angles(0,math.rad(rotation),0),Color3.fromRGB(149,129,102),
    Enum.Material.WoodPlanks,true)
  if request.Key == "TriangleFoundation" or request.Key == "Stairs" then
    piece.Shape=Enum.PartType.Wedge
  elseif request.Key == "Ladder" then
    -- 물리적 경사로 대신 사다리의 사다리꼴 충돌체와 Climbable 트러스를 사용한다.
    piece.CanCollide=false
    local climb=Instance.new("TrussPart")
    climb.Name="HousingLadderClimb"
    climb.Size=Vector3.new(2,8,2)
    climb.CFrame=piece.CFrame
    climb.Anchored=true
    climb.CanCollide=true
    climb.Parent=piece
  end
  local records = civHousingRecords[player] or {}
  local nextId = 1
  for _, existing in ipairs(records) do nextId = math.max(nextId, (existing.Id or 0) + 1) end
  piece:SetAttribute("HousingPiece",true)
  piece:SetAttribute("HousingId",nextId)
  if request.Key == "Doorframe" then piece:SetAttribute("DoorOpen",false) end
  piece:SetAttribute("Stability",stability)
  piece:SetAttribute("CivOwnerUserId",player.UserId)
  civHousingCounts[player]=(civHousingCounts[player] or 0)+1
  civHousingRecords[player] = records
  table.insert(records,{Id=nextId,Key=request.Key,X=snappedX,Z=snappedZ,Level=level,Rotation=rotation,Stability=stability,
    ParentId=not definition.Base and parentPiece:GetAttribute("HousingId") or nil,Open=false})
  civMessage(player,"건축 완료 / 안정성 "..tostring(stability).."%")
end
-- 서버가 저장한 부품만 재생성한다. DataStore의 배열 크기와 값은 복원 시 검증한다.
local function civRestoreHousing(player, saved)
  if typeof(saved) ~= "table" or readNumber(player,"CivRaceID",0) <= 0 then return end
  local center = civWorlds[readNumber(player,"CivRaceID",0)]
  if not center then return end
  local ownerFolder = civOwnerBuildings(player)
  local records = {}
  local restoredIds = {}
  local nextLegacyId = 1
  for _,entry in ipairs(saved) do
    if #records >= 40 then break end
    if typeof(entry) == "table" and typeof(entry.Key) == "string"
      and civHousingPieces[entry.Key] ~= nil
      and typeof(entry.X) == "number" and typeof(entry.Z) == "number"
      and typeof(entry.Level) == "number" and typeof(entry.Rotation) == "number"
      and typeof(entry.Stability) == "number"
      and entry.X % 8 == 0 and entry.Z % 8 == 0
      and math.abs(entry.X) <= 32 and math.abs(entry.Z) <= 32
      and entry.Level % 1 == 0 and entry.Level >= 0 and entry.Level <= 3
      and entry.Rotation % 90 == 0 and entry.Rotation >= 0 and entry.Rotation < 360
      and entry.Stability > 0 and entry.Stability <= 100 then
      local definition = civHousingPieces[entry.Key]
      local candidateId = typeof(entry.Id) == "number" and entry.Id % 1 == 0
        and entry.Id >= 1 and entry.Id <= 1000000 and entry.Id or nil
      if not candidateId then
        while restoredIds[nextLegacyId] do nextLegacyId += 1 end
        candidateId = nextLegacyId
      end
      local parentId = entry.ParentId
      local parentRecord = nil
      if typeof(parentId) == "number" then
        for _, prior in ipairs(records) do
          if prior.Id == parentId then parentRecord = prior break end
        end
      end
      -- 구형 저장 데이터는 ParentId가 없을 수 있으므로 보존한다.
      -- 부모가 명시된 신형 데이터는 실제 존재하고 가까운 지지대여야 한다.
      local validParent = definition.Base and parentId == nil
        or (not definition.Base and parentId == nil)
        or (not definition.Base and parentRecord ~= nil
          and math.abs(parentRecord.X-entry.X) <= 8
          and math.abs(parentRecord.Z-entry.Z) <= 8
          and math.abs(parentRecord.Level-entry.Level) <= 1
          and parentRecord.Stability >= entry.Stability + 20)
      if not restoredIds[candidateId] and validParent
        and not (definition.Base and entry.Level ~= 0) then
        local location = center + Vector3.new(entry.X,entry.Level*8+definition.Size.Y/2,entry.Z)
        local piece = civPart(ownerFolder,entry.Key.."_Restored"..tostring(#records+1),
          definition.Size,CFrame.new(location)*CFrame.Angles(0,math.rad(entry.Rotation),0),
          Color3.fromRGB(149,129,102),Enum.Material.WoodPlanks,true)
        if entry.Key == "TriangleFoundation" or entry.Key == "Stairs" then
          piece.Shape = Enum.PartType.Wedge
        elseif entry.Key == "Ladder" then
          piece.CanCollide=false
          local climb=Instance.new("TrussPart")
          climb.Name="HousingLadderClimb"
          climb.Size=Vector3.new(2,8,2)
          climb.CFrame=piece.CFrame
          climb.Anchored=true
          climb.CanCollide=true
          climb.Parent=piece
        end
        local pieceId = candidateId
        restoredIds[pieceId] = true
        piece:SetAttribute("HousingPiece",true)
        piece:SetAttribute("HousingId",pieceId)
        if entry.Key == "Doorframe" then
          local isOpen = entry.Open == true
          piece:SetAttribute("DoorOpen",isOpen)
          piece.CanCollide = not isOpen
          piece.Transparency = isOpen and 0.72 or 0
        end
        piece:SetAttribute("Stability",entry.Stability)
        piece:SetAttribute("CivOwnerUserId",player.UserId)
        table.insert(records,{Id=pieceId,Key=entry.Key,X=entry.X,Z=entry.Z,Level=entry.Level,
          Rotation=entry.Rotation,Stability=entry.Stability,ParentId=entry.ParentId,Open=entry.Open == true})
      end
    end
  end
  civHousingRecords[player] = records
  civHousingCounts[player] = #records
end
-- 소유자만 가까운 건축 부품을 철거할 수 있다. 성공 시 저장 목록에서도 즉시 제외.
local function civRemoveHousing(player, piece)
  if typeof(piece) ~= "Instance" or not piece:IsA("BasePart") then return end
  local folder = civBuildings[player]
  if not folder or not piece:IsDescendantOf(folder)
    or piece:GetAttribute("HousingPiece") ~= true
    or piece:GetAttribute("CivOwnerUserId") ~= player.UserId then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0
    or (root.Position - piece.Position).Magnitude > 18 then return end
  local id = piece:GetAttribute("HousingId")
  local records = civHousingRecords[player]
  if typeof(id) ~= "number" or not records then return end
  local index = nil
  for i, record in ipairs(records) do
    if record.Id == id then index = i break end
  end
  if not index or not civNowReady(player,"RemoveHousing",0.5) then return end
  -- 연결된 자식 부품은 지지대를 잃으면 함께 붕괴한다.
  local removed = {[id]=true}
  local changed = true
  while changed do
    changed=false
    for _,record in ipairs(records) do
      if not removed[record.Id] and record.ParentId and removed[record.ParentId] then
        removed[record.Id]=true
        changed=true
      end
    end
  end
  for n=#records,1,-1 do
    if removed[records[n].Id] then table.remove(records,n) end
  end
  for _,other in ipairs(folder:GetDescendants()) do
    if other:IsA("BasePart") and other:GetAttribute("HousingPiece")==true
      and removed[other:GetAttribute("HousingId")] then
      other:Destroy()
    end
  end
  civHousingCounts[player] = #records
  civMessage(player,"건축 부품 철거 / 지지대 없는 연결 부품 붕괴")
end
-- 소유한 문틀을 간단한 여닫이 출입구로 사용한다.
local function civToggleHousingDoor(player,piece)
  if typeof(piece) ~= "Instance" or not piece:IsA("BasePart") then return end
  local folder = civBuildings[player]
  if not folder or not piece:IsDescendantOf(folder)
    or piece:GetAttribute("HousingPiece") ~= true
    or piece:GetAttribute("CivOwnerUserId") ~= player.UserId
    or not piece.Name:match("^Doorframe") then return end
  local character=player.Character
  local root=character and character:FindFirstChild("HumanoidRootPart")
  local hum=character and character:FindFirstChildOfClass("Humanoid")
  if not root or not hum or hum.Health<=0 or (root.Position-piece.Position).Magnitude>14 then return end
  local id=piece:GetAttribute("HousingId")
  local records=civHousingRecords[player]
  if not records then return end
  for _,record in ipairs(records) do
    if record.Id==id and record.Key=="Doorframe" then
      if not civNowReady(player,"ToggleHousingDoor",0.35) then return end
      record.Open=not (record.Open==true)
      piece:SetAttribute("DoorOpen",record.Open)
      piece.CanCollide=not record.Open
      piece.Transparency=record.Open and 0.72 or 0
      civMessage(player,record.Open and "문 열림" or "문 닫힘")
      return
    end
  end
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
  character:SetAttribute("CivTravelCompleted", true)
  character:PivotTo(CFrame.new(destination + Vector3.new(0, 5, -11)))
  player:SetAttribute("CivTravelDestination", raceID)
  player:SetAttribute("CivTravelAck", (player:GetAttribute("CivTravelAck") or 0) + 1)
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
  player:SetAttribute("CurrentEra", tech.Era)
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
local function civSpawnEnemy(raceID, center, special, mobSlot)
  local race = RaceData.GetRace(raceID)
  local enemy = Instance.new("Model")
  enemy.Name = special == "StoneWolf" and "원시 늑대"
    or special == "WildBoar" and "야생 멧돼지"
    or special == "BronzeGolem" and "청동 골렘"
    or special == "IronKnight" and "암흑 철기 기사"
    or (mobSlot == 2 and race.Mobs:match("·(.+)$"))
    or race.Mobs:match("^[^·]+") or race.Name .. " 수호자"
  -- 외부 검증 모델이 없는 적은 스폰하지 않는다. 바이브 기본 외형 금지.
  local creatureFolder = Shared:FindFirstChild("CreatureModels")
  local modelKey = special == "WildBoar" and "Boar"
    or special == "StoneWolf" and "Wolf"
    or special == "IronKnight" and "Knight"
    or special == "BronzeGolem" and "Golem"
    or nil
  local visualTemplate = creatureFolder and (
    (modelKey and creatureFolder:FindFirstChild(modelKey))
    or creatureFolder:FindFirstChild(enemy.Name)
    or creatureFolder:FindFirstChild("Race" .. raceID .. "_Mob" .. (mobSlot or 1))
  )
  if not (visualTemplate and visualTemplate:IsA("Model")
    and visualTemplate:GetAttribute("CuratedExternalAsset") == true
    and (tonumber(visualTemplate:GetAttribute("VerifiedRobloxAssetId")) or 0) > 0
    and visualTemplate:FindFirstChildWhichIsA("BasePart", true)) then
    return nil
  end
  enemy:SetAttribute("CivilizationEnemy", true)
  enemy:SetAttribute("EcosystemRole", "Predator")
  if special == "StoneWolf" then enemy:SetAttribute("EcosystemSpecies", "StoneAgeWolf") end
  local isRaidBoss = special == "BronzeGolem" or special == "IronKnight"
  enemy:SetAttribute("IsRaidBoss", isRaidBoss)
  if isRaidBoss then enemy:SetAttribute("BossPhase", "Phase1") end
  enemy:SetAttribute("RaceID", raceID)
  enemy:SetAttribute("MobSlot", mobSlot or 1)
  -- 문명별 기존 지면 재질과 같은 생태 분류. 스폰·전투 위치를 변경하지 않는다.
  local habitatType = (raceID % 6 == 2 or raceID % 6 == 0) and "DESERT"
    or (raceID % 6 == 4) and "SNOW" or "GRASSLAND"
  enemy:SetAttribute("HabitatBiome", habitatType)
  enemy:SetAttribute("HabitatRaceID", raceID)
  enemy:SetAttribute("SpawnCategory", special and "EraSpecial" or "Civilization")
  -- 기존 시대별 특수 몬스터를 레이드 보스로 분류한다. 기본 체력·피해·보상은 유지한다.
  if special == "WildBoar" or special == "BronzeGolem" or special == "IronKnight" then
    enemy:SetAttribute("IsRaidBoss", true)
    enemy:SetAttribute("BossPhase", "Phase1")
  end
  enemy:SetAttribute("IsPreparingAttack", false)
  enemy:SetAttribute("AIState", "Idle")
  local root = civPart(enemy, "HumanoidRootPart", Vector3.new(3, 4, 3), CFrame.new(center + (special == "StoneWolf" and Vector3.new(43, 4, -34)
    or special == "WildBoar" and Vector3.new(-43, 4, -34)
    or special == "BronzeGolem" and Vector3.new(-43, 4, -34)
    or special == "IronKnight" and Vector3.new(-43, 4, -34)
    or mobSlot == 2 and Vector3.new(-34, 4, 29)
    or Vector3.new(31, 4, 35))), Color3.fromRGB(81 + raceID % 4 * 25, 75, 64), Enum.Material.SmoothPlastic, false)
  root.Transparency = 1
  root.CanTouch = false
  root.CanQuery = false
  enemy:SetAttribute("SpawnPosition", root.Position)
  -- 구입/추출 에셋이 아닌, 검증된 고급 외부 모델만 클론한다.
  local visual = visualTemplate:Clone()
  visual.Name = "ImportedCreatureVisual"
  for _, descendant in ipairs(visual:GetDescendants()) do
    if descendant:IsA("BasePart") then
      descendant.Anchored = true
      descendant.CanCollide = false
      descendant.CanTouch = false
      descendant.CanQuery = false
    end
  end
  visual.Parent = enemy
  local sourceAssetId = visualTemplate:GetAttribute("VerifiedRobloxAssetId")
  if sourceAssetId then enemy:SetAttribute("CreatureVisualAssetId", sourceAssetId) end
  local bounds = visual:GetExtentsSize()
  if bounds.X > 0.01 and bounds.Y > 0.01 and bounds.Z > 0.01 then
    local fit = math.min(4.8 / math.max(bounds.X, bounds.Z), 6.5 / bounds.Y)
    if fit > 0.01 and fit < 100 then visual:ScaleTo(fit) end
  end
  visual:PivotTo(root.CFrame)
  local boxFrame, boxSize = visual:GetBoundingBox()
  local desiredFeet = root.Position.Y - root.Size.Y * 0.5
  local currentFeet = boxFrame.Position.Y - boxSize.Y * 0.5
  local visualOffset = CFrame.new(0, desiredFeet - currentFeet, 0)
  visual:PivotTo(root.CFrame * visualOffset)
  visual:SetAttribute("VisualPivotOffset", visualOffset)
  visual:SetAttribute("ImportedVisualFollowRoot", true)
  enemy:SetAttribute("CreatureAssetSource", "StudioImported")
  local humanoid = Instance.new("Humanoid")
  humanoid.RequiresNeck = false
  humanoid.MaxHealth = special == "WildBoar" and 42 or special == "BronzeGolem" and 100
    or special == "IronKnight" and 155 or (52 + raceID * 3)
  humanoid.Health = humanoid.MaxHealth
  humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.Subject
  humanoid.Parent = enemy
  enemy.PrimaryPart = root
  enemy.Parent = civHub
  civSign(root, root, enemy.Name, 3.3)
  local item = { Model = enemy, Root = root, Humanoid = humanoid, Home = root.Position, RaceID = raceID, Special = special, LastHit = -1e9, TelegraphAt = 0, StunnedUntil = 0, TargetUserId = nil, NextPatrolAt = 0, PatrolStep = 0, AlertUserId = nil, AlertUntil = 0 }
  table.insert(civEnemies, item)
  return item
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
    -- Server loot reward remains; generated glowing loot prop was deleted.
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
-- 문명 지역과 중앙 포털: 메인 지면/저장 키는 그대로 유지한다.
-- 실제 로비 지면: 기본 스폰 및 24개 문명 이동 패드까지 걸어갈 수 있도록 유지한다.
-- 하나의 대륙 바닥으로 광장과 모든 문명을 보행 가능한 오픈월드로 연결한다.
-- 기존 문명 좌표·스폰·이동·전투 기준값은 변경하지 않는다.
local continentGround = civPart(civHub, "문명 대륙", Vector3.new(520, 2, 520),
  CFrame.new(0, -2, 0), Color3.fromRGB(112, 143, 103), Enum.Material.Grass, true)
continentGround:SetAttribute("WalkableGround", true)
local lobbyGround = civPart(civHub, "CivilizationLobbyGround", Vector3.new(64, 2, 64),
  CFrame.new(0, -1, 0), Color3.fromRGB(111, 132, 101), Enum.Material.Slate, true)
lobbyGround:SetAttribute("WalkableGround", true)
-- ambientCG CC0 외부 재질: 저장소에서 업로드 번호가 확인된 색상맵만 적용한다.
-- 텍스처 전송이 막혀도 기존 Roblox Slate/Wood 재질로 지면과 상점은 유지된다.
local lobbyStoneTexture = Instance.new("Texture")
lobbyStoneTexture.Name = "LobbyCC0Stone"
lobbyStoneTexture.Texture = "rbxassetid://128886287832599"
lobbyStoneTexture.Face = Enum.NormalId.Top
lobbyStoneTexture.StudsPerTileU = 10
lobbyStoneTexture.StudsPerTileV = 10
lobbyStoneTexture.Transparency = 0.24
lobbyStoneTexture.Parent = lobbyGround

-- 24문명의 땅을 1개의 초대형 대륙으로 잇는다.
-- 문명 중심은 기존 3,200스터드 위치를 유지하므로 저장/스폰/건축 좌표는 불변.
-- 길이 1,750, 폭 1,080의 부채꼴 겹침 지면 48개로 외곽까지 끊김 없이 걸어갈 수 있다.
-- 먼 거리를 포털로만 이동하던 이전의 허공 구간을 실제 충돌 지형으로 대체.
local continentRadius = civ.WorldRadius
local connectedLand = Instance.new("Folder")
connectedLand.Name = "Connected24CivilizationsLand"
connectedLand.Parent = civHub
connectedLand:SetAttribute("LandRevision", "CONTIGUOUS_24_WORLD_V1")
connectedLand:SetAttribute("WorldDiameterStuds", continentRadius * 2 + 560)
for sector = 1, 24 do
  local bearing = 2 * math.pi * (sector - 1) / 24
  local direction = Vector3.new(math.cos(bearing), 0, math.sin(bearing))
  local biomeTint = civRegions[((sector - 1) % #civRegions) + 1]
  local biomeMaterial = (sector % 6 == 2 or sector % 6 == 0) and Enum.Material.Sand
    or (sector % 6 == 4) and Enum.Material.Snow or Enum.Material.Grass
  for segment = 1, 2 do
    local travel = segment == 1 and 850 or 2450
    -- 인접 지면이 겹쳐도 똑같은 높이의 표면끼리 깜박이지 않도록 미세 단차를 둔다.
    local rise = sector * 0.012 + segment * 0.006
    local middle = direction * travel + Vector3.new(0, -2 + rise, 0)
    local ground = civPart(connectedLand,
      "연결 대륙 " .. sector .. "-" .. segment,
      Vector3.new(1080, 2, 1750),
      CFrame.lookAt(middle, middle + direction),
      biomeTint, biomeMaterial, true)
    ground:SetAttribute("WalkableGround", true)
    ground:SetAttribute("ContinentSector", sector)
    ground.CanTouch = false
    local highway = civPart(connectedLand,
      "대륙 횡단길 " .. sector .. "-" .. segment,
      Vector3.new(22, 0.12, 1750),
      CFrame.lookAt(direction * travel + Vector3.new(0, -0.77 + rise, 0),
        direction * (travel + 10) + Vector3.new(0, -0.77 + rise, 0)),
      Color3.fromRGB(143, 119, 87), Enum.Material.Ground, false)
    highway.CanTouch = false
    highway.CanQuery = false
  end
end
civHub:SetAttribute("ConnectedContinentDiameterStuds", continentRadius * 2 + 560)
for id = 1, 24 do
  local race = RaceData.GetRace(id)
  local angle = 2 * math.pi * (id - 1) / 24
  local center = Vector3.new(math.cos(angle) * civ.WorldRadius, 0, math.sin(angle) * civ.WorldRadius)
  civWorlds[id] = center
  local region = Instance.new("Folder")
  region.Name = race.Name
  region.Parent = civHub
  local ground = civPart(region, "CivilizationGround", Vector3.new(560, 2, 560), CFrame.new(center), civRegions[((id - 1) % #civRegions) + 1], Enum.Material.Slate, true)
  ground:SetAttribute("WalkableGround", true)
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
    -- 넓어진 탐험 지역에 채집물을 방사형으로 분산한다 (시설·중앙 광장과 분리).
    local harvestAngle = (index - 1) * math.pi / 4 + (id % 3) * 0.1
    local harvestRadius = index % 2 == 0 and 43 or 34
    local px = math.cos(harvestAngle) * harvestRadius
    local pz = math.sin(harvestAngle) * harvestRadius
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
  civSpawnEnemy(id, center, nil, 1)
  civSpawnEnemy(id, center, nil, 2)
  if id == 15 then
    civSpawnEnemy(id, center, "WildBoar")
    civSpawnEnemy(id, center, "StoneWolf")
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

end
MultiverseEconomy.StartCaravans(civHub, civWorlds)
-- 서버에서 몬스터/초식동물 모델 전체를 0.25초 AI 틱 사이에 부드럽게 이동한다.
-- 기존 서버 위치·거리·타격 판정과 동일한 모델 피벗을 연속 갱신한다.
local civMoveTweenService = game:GetService("TweenService")
local civMoveTweens = setmetatable({}, {__mode = "k"})
local function civWalkModel(model, target, duration)
  if not model or not model.Parent then return end
  local prior = civMoveTweens[model]
  if prior then
    -- The completion callback owns the tween's CFrameValue. Do not destroy it
    -- before Cancel fires, or an in-flight signal can access a deleted value.
    civMoveTweens[model] = nil
    prior.tween:Cancel()
  end
  local start = model:GetPivot()
  local distance = (target.Position - start.Position).Magnitude
  -- A previous tween may have been cancelled mid-step. Avoid introducing
  -- jitter for tiny corrections while still accepting in-place turning.
  local _, currentYaw = start:ToOrientation()
  local _, desiredYaw = target:ToOrientation()
  local headingError = math.abs(math.atan2(math.sin(desiredYaw - currentYaw), math.cos(desiredYaw - currentYaw)))
  if distance < 0.015 and headingError < math.rad(2) then return end
  -- AI가 매 틱 목표 방향을 바꾸더라도 180도 즉시 회전하지 않고
  -- 이동 거리와 회전 각도에 맞춰 자연스럽게 바라보는 방향을 갱신한다.
  local _, startYaw = start:ToOrientation()
  local _, targetYaw = target:ToOrientation()
  local deltaYaw = math.atan2(math.sin(targetYaw - startYaw), math.cos(targetYaw - startYaw))
  local maxTurn = math.rad(48)
  if math.abs(deltaYaw) > maxTurn then
    target = CFrame.new(target.Position) * CFrame.Angles(0, startYaw + math.clamp(deltaYaw, -maxTurn, maxTurn), 0)
  end
  -- 스폰/귀환 등 큰 좌표 차이는 걷기로 오인하지 않고 즉시 복구한다.
  if distance > 12 then
    -- AI movement never teleports across the map; only explicit spawn/respawn may.
    -- Cap the motion command instead of snapping a chasing enemy to its destination.
    local direction = (target.Position - start.Position).Unit
    target = CFrame.new(start.Position + direction * 2.4) * target.Rotation
  end
  -- AI가 0.25초마다 목표를 갱신하므로 다음 틱 직전까지 연속 이동한다.
  -- 0.23초 종료 후 정지했다가 다시 움직이는 미세한 끊김을 줄인다.
  local smoothDuration = math.max(0.08, duration or 0.25)
  if smoothDuration < 0.3 then smoothDuration = 0.25 end
  -- 보행 시각 상태를 서버가 제공해 저주파 위치 복제에서도 발이 멈추지 않는다.
  if model:GetAttribute("CivilizationEnemy") == true then
    -- 제자리 회전은 보행이 아니다. 정지한 몬스터가 허공에서 발을 구르지 않게 한다.
    if (target.Position - start.Position).Magnitude >= 0.12 then
      model:SetAttribute("MotionWalkingUntil", workspace:GetServerTimeNow() + smoothDuration + 0.05)
      -- 서버가 목표 이동량을 알고 있으므로 위치 복제 지연과 무관한 보행 속도를 전달한다.
      model:SetAttribute("MotionMoveSpeed", math.clamp((target.Position - start.Position).Magnitude / smoothDuration, 0, 12))
    else
      model:SetAttribute("MotionWalkingUntil", 0)
      model:SetAttribute("MotionMoveSpeed", 0)
    end
  end
  local frameValue = Instance.new("CFrameValue")
  frameValue.Value = start
  local connection = frameValue:GetPropertyChangedSignal("Value"):Connect(function()
    if model.Parent then model:PivotTo(frameValue.Value) end
  end)
  local tween = civMoveTweenService:Create(frameValue,
    TweenInfo.new(smoothDuration, Enum.EasingStyle.Linear), {Value = target})
  civMoveTweens[model] = {tween=tween, connection=connection, value=frameValue}
  tween.Completed:Connect(function(state)
    if civMoveTweens[model] and civMoveTweens[model].tween == tween then
      if model.Parent and state == Enum.PlaybackState.Completed then model:PivotTo(target) end
      civMoveTweens[model] = nil
    end
    connection:Disconnect()
    frameValue:Destroy()
  end)
  tween:Play()
end
-- 적 추적과 예고 공격: 클라이언트 타임스탬프를 절대 신뢰하지 않는다.
local civNextPredation = 0
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
    -- 기존 0.25초 AI 틱 안에서 3초마다 포식자-초식동물 먹이사슬을 처리한다.
    -- 서버 소유 모델만 검사하므로 임의 Workspace 모델이 자원을 조작할 수 없다.
    if now >= (civNextPredation or 0) then
      civNextPredation = now + 3
      for _, predator in ipairs(civEnemies) do
        if predator.Humanoid.Health > 0 and predator.Model.Parent == civHub
          and predator.Model:GetAttribute("EcosystemSpecies") == "StoneAgeWolf" then
          local prey = civWildlife[predator.RaceID]
          if prey and prey.Humanoid.Health > 0 and prey.Model.Parent == civHub then
            local delta = prey.Root.Position - predator.Root.Position
            local distance = delta.Magnitude
            if distance <= 28 and distance > 0.1 then
              local planar = Vector3.new(delta.X, 0, delta.Z)
              if planar.Magnitude > 0.1 then
                local nextPos = predator.Root.Position + planar.Unit * math.min(2.4, planar.Magnitude)
                if (Vector3.new(nextPos.X - predator.Home.X, 0, nextPos.Z - predator.Home.Z)).Magnitude <= 16 then
                  civWalkModel(predator.Model, CFrame.lookAt(nextPos, Vector3.new(prey.Root.Position.X, nextPos.Y, prey.Root.Position.Z)), 0.23)
                end
              end
              if distance <= 5 then
                prey.Humanoid:TakeDamage(6)
                if prey.Humanoid.Health <= 0 then prey.LastPredated = now end
              end
            end
          end
        end
      end
    end
    for _, grazer in pairs(civWildlife) do
      if grazer.Humanoid.Health <= 0 then
        if now - grazer.LastPredated >= 20 then
          grazer.Humanoid.Health = grazer.Humanoid.MaxHealth
          grazer.Model:PivotTo(CFrame.new(grazer.Home))
        end
      else
        local threatPosition = nil
        if grazer.Model:GetAttribute("EcosystemSpecies") == "StoneAgeDeer" then
          for _, predator in ipairs(civEnemies) do
            if predator.Model:GetAttribute("EcosystemSpecies") == "StoneAgeWolf"
              and predator.Humanoid.Health > 0 and (predator.Root.Position - grazer.Root.Position).Magnitude <= 14 then
              threatPosition = predator.Root.Position
              break
            end
          end
        end
        local updateInterval = threatPosition and 0.75 or 3.5
        if now - grazer.LastGraze >= updateInterval then
          grazer.LastGraze = now
        if threatPosition then
          local delta = grazer.Root.Position - threatPosition
          local planar = Vector3.new(delta.X, 0, delta.Z)
          if planar.Magnitude > 0.1 then
            local nextPosition = grazer.Root.Position + planar.Unit * 6
            local homeDelta = Vector3.new(nextPosition.X - grazer.Home.X, 0, nextPosition.Z - grazer.Home.Z)
            if homeDelta.Magnitude <= 14 then civWalkModel(grazer.Model, CFrame.new(nextPosition), 0.65) end
          end
        else
          local angle = now * 0.19 + grazer.Home.X * 0.05
          civWalkModel(grazer.Model, CFrame.new(grazer.Home + Vector3.new(math.cos(angle) * 5, 0, math.sin(angle) * 5)), 2.8)
        end
        end
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
      -- Read the single authoritative phase, including its visual transition.
      if enemy.Model:GetAttribute("IsRaidBoss") == true and enemy.Humanoid.Health > 0 then
        local phase = enemy.Model:GetAttribute("BossPhase")
        if enemy.LastVisualPhase ~= phase then
          enemy.LastVisualPhase = phase
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
        -- 서식지 밖 플레이어는 공격하지 않고, 추격을 포기한 적은 집으로 복귀한다.
        -- 기존 전투 사거리/텔레그래프/피해량 및 보스 페이즈는 변경하지 않는다.
        if target then
          local targetRoot = target.Character and target.Character:FindFirstChild("HumanoidRootPart")
          if not targetRoot or (Vector3.new(targetRoot.Position.X - enemy.Home.X, 0,
              targetRoot.Position.Z - enemy.Home.Z)).Magnitude > 22 then
            target = nil
          end
        end
        -- 대상이 사라지거나 서식지 밖으로 벗어나면 경계를 즉시 해제한다.
        -- 이전 대상의 경계 시간이 새 순찰/귀환을 붙잡지 않게 한다.
        if not target then
          enemy.AlertUserId = nil
          enemy.AlertUntil = 0
        end
        -- 일반 몬스터는 플레이어를 발견하면 먼저 경계한다. 같은 문명의
        -- 인접 몬스터가 이미 전투 중이면 경계 시간이 짧아진다.
        if target and enemy.Model:GetAttribute("IsRaidBoss") ~= true then
          if enemy.AlertUserId ~= target.UserId then
            local packEngaged = false
            for _, ally in ipairs(civEnemies) do
              if ally ~= enemy and ally.RaceID == enemy.RaceID
                and ally.Humanoid.Health > 0
                and (ally.Root.Position - enemy.Root.Position).Magnitude <= 12
                and ally.Model:GetAttribute("AIState") == "Combat" then
                packEngaged = true
                break
              end
            end
            enemy.AlertUserId = target.UserId
            enemy.AlertUntil = now + (packEngaged and 0.3 or 0.8)
          end
          if now < enemy.AlertUntil then
            AdvancedAIEcosystem.SetState(enemy, "Alert")
            target = nil
          end
        end
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
                  civWalkModel(enemy.Model, CFrame.lookAt(nextPos, nextPos + Vector3.new(planar.X, 0, planar.Z)), 0.23)
                end
              end
            else
              -- 교전 전 이전 순찰 목적지를 폐기해 전투 종료 후 오래된 경로로 뛰지 않는다.
              enemy.PatrolDestination = nil
              enemy.NextPatrolAt = now + 2
              AdvancedAIEcosystem.SetState(enemy, "Combat")
              if enemy.TelegraphAt > 0 and now >= enemy.TelegraphAt then
                local intendedUserId = enemy.TargetUserId
                enemy.TelegraphAt = 0
                enemy.TargetUserId = nil
                enemy.Model:SetAttribute("IsPreparingAttack", false)
                enemy.Model:SetAttribute("LastAttackAnimationAt", workspace:GetServerTimeNow())
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
                    civWalkModel(enemy.Model, CFrame.lookAt(p, Vector3.new(chasePosition.X, p.Y, chasePosition.Z)), 0.23)
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
        elseif now < (enemy.AlertUntil or 0) then
          -- 경계 중에는 순찰도 공격도 하지 않고 대상을 관찰한다.
          AdvancedAIEcosystem.SetState(enemy, "Alert")
        elseif now - enemy.LastHit >= 3 then
          enemy.AlertUserId = nil
          enemy.Model:SetAttribute("IsPreparingAttack", false)
          local homeOffset = Vector3.new(enemy.Home.X - enemy.Root.Position.X, 0,
            enemy.Home.Z - enemy.Root.Position.Z)
          if homeOffset.Magnitude > 12 then
            enemy.PatrolDestination = nil
            enemy.NextPatrolAt = now + 2
            AdvancedAIEcosystem.SetState(enemy, "ReturnHome")
            if homeOffset.Magnitude > 0.1 then
              local step = enemy.Root.Position + homeOffset.Unit * math.min(1.2, homeOffset.Magnitude)
              civWalkModel(enemy.Model, CFrame.lookAt(step,
                Vector3.new(enemy.Home.X, step.Y, enemy.Home.Z)), 0.25)
            end
          else
          AdvancedAIEcosystem.SetState(enemy, "Patrol")
          -- Predation runs only when no living player is targeted.
          local grazer = enemy.Model:GetAttribute("EcosystemSpecies") == "StoneAgeWolf"
            and civWildlife[enemy.RaceID] or nil
          if grazer and grazer.Humanoid.Health > 0
              and (grazer.Root.Position - enemy.Home).Magnitude <= 16 then
            local delta = grazer.Root.Position - enemy.Root.Position
            if delta.Magnitude > 4 then
              local planar = Vector3.new(delta.X, 0, delta.Z)
              if planar.Magnitude > 0.1 then
                local candidate = enemy.Root.Position + planar.Unit * math.min(1.1, planar.Magnitude)
                if (Vector3.new(candidate.X - enemy.Home.X, 0, candidate.Z - enemy.Home.Z)).Magnitude <= 16 then
                  civWalkModel(enemy.Model, CFrame.lookAt(candidate, Vector3.new(grazer.Root.Position.X, candidate.Y, grazer.Root.Position.Z)), 0.23)
                end
              end
            else
              enemy.LastHit = now
              grazer.Humanoid:TakeDamage(8)
              if grazer.Humanoid.Health <= 0 then grazer.LastPredated = now end
            end
          elseif enemy.Model:GetAttribute("IsRaidBoss") ~= true
              and enemy.PatrolDestination == nil and now >= (enemy.NextPatrolAt or 0) then
            -- 전투 밖에서는 기존 스폰 주변을 천천히 이동하고 휴식한다.
            enemy.PatrolStep = (enemy.PatrolStep or 0) + 1
            local step = enemy.PatrolStep
            local angle = step * 2.399963 + enemy.RaceID * 0.73
            local habitat = enemy.Model:GetAttribute("HabitatBiome")
            local radius = habitat == "DESERT" and (7 + step % 4 * 2)
              or habitat == "SNOW" and (4 + step % 3 * 2)
              or (5 + step % 4 * 2)
            local destination = enemy.Home + Vector3.new(math.cos(angle) * radius, 0, math.sin(angle) * radius)
            -- 같은 문명의 살아 있는 일반 몬스터가 가까우면 순찰 목적지를 조금 공유한다.
            -- 플레이어 대상/보스/기존 생성 위치는 건드리지 않는다.
            if enemy.Model:GetAttribute("IsRaidBoss") ~= true then
              for _, ally in ipairs(civEnemies) do
                if ally ~= enemy and ally.RaceID == enemy.RaceID
                  and ally.Humanoid.Health > 0
                  and ally.Model:GetAttribute("IsRaidBoss") ~= true
                  and ally.PatrolDestination
                  and (ally.Root.Position - enemy.Root.Position).Magnitude <= 14 then
                  local offset = Vector3.new((enemy.Model:GetAttribute("MobSlot") or 1) == 2 and -3 or 3, 0, 3)
                  local groupDestination = ally.PatrolDestination + offset
                  if (Vector3.new(groupDestination.X - enemy.Home.X, 0,
                      groupDestination.Z - enemy.Home.Z)).Magnitude <= 13 then
                    destination = groupDestination
                  end
                  break
                end
              end
            end
            local planar = Vector3.new(destination.X - enemy.Root.Position.X, 0,
              destination.Z - enemy.Root.Position.Z)
            -- 이동 후 잠깐 쉬고 다음 목표로 간다. 큰 간격의 1회 이동만 반복하지 않는다.
            enemy.PatrolDestination = destination
            enemy.NextPatrolAt = now + 0.7
          end
          if enemy.Model:GetAttribute("IsRaidBoss") ~= true
              and enemy.PatrolDestination and now >= (enemy.NextPatrolAt or 0) then
            local destination = enemy.PatrolDestination
            local planar = Vector3.new(destination.X - enemy.Root.Position.X, 0,
              destination.Z - enemy.Root.Position.Z)
            if planar.Magnitude > 0.7 then
              local nextPosition = enemy.Root.Position + planar.Unit * math.min(1.1, planar.Magnitude)
              if (Vector3.new(nextPosition.X - enemy.Home.X, 0,
                  nextPosition.Z - enemy.Home.Z)).Magnitude <= 16 then
                civWalkModel(enemy.Model, CFrame.lookAt(nextPosition,
                  Vector3.new(destination.X, nextPosition.Y, destination.Z)), 0.25)
                enemy.NextPatrolAt = now + 0.35
              else
                enemy.PatrolDestination = nil
                enemy.NextPatrolAt = now + 3
              end
            else
              enemy.PatrolDestination = nil
              enemy.NextPatrolAt = now + 2 + (enemy.PatrolStep % 3)
            end
          end
          end -- ReturnHome / Patrol
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
    -- 일시적인 DataStore 제한/장애에는 재시도하되 검증되지 않은 데이터를 저장하지 않는다.
    for attempt = 1, 5 do
      loadOk, saved = pcall(function()
        return store:GetAsync("player:" .. player.UserId)
      end)
      if loadOk then break end
      warn("CIV_DATASTORE_READ_RETRY", player.UserId, attempt, tostring(saved))
      if attempt < 5 then task.wait(math.min(2 ^ (attempt - 1), 8)) end
    end
  else
    warn("CIV_DATASTORE_UNAVAILABLE", player.UserId, tostring(storeResult))
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
  if civDataLoadValid[player] == true and readNumber(player, "CivRaceID", 0) == 0 then
    setNumber(player, "CivRaceID", 1)
  end
  player:SetAttribute("CivSaveAvailable", civDataLoadValid[player] == true)
  -- 저장 건축물 복원까지 완료한 뒤 조작을 허용해 로비 이동과 복원 작업의 충돌을 방지한다.
  civApplyCharacterPassive(player)
  civApplySkinTone(player)
  civRestoreBuildings(player)
  if civDataLoadValid[player] == true and typeof(saved) == "table" then
    civRestoreHousing(player,saved.CivHousingPieces)
  end
  if player.Parent ~= Players then return end
  player:SetAttribute("CivReady", true)
  weatherSyncEvent:FireClient(player, WeatherSystem.Snapshot())
  queueInventorySync(player)
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
  else
    -- 처음 접속 시 로비에서 시작. 기존 저장 데이터와 포털 도착 위치는 변경하지 않는다.
    task.spawn(function()
      if player.Parent ~= Players then return end
      local character = player.Character or player.CharacterAdded:Wait()
      local humanoid = character and character:WaitForChild("Humanoid", 10)
      if player.Parent ~= Players or player.Character ~= character
        or not humanoid or humanoid.Health <= 0 then return end
      -- 로딩 중 새 캐릭터가 생기거나 먼저 이동했다면 늦은 로비 배치를 하지 않는다.
      if character:GetAttribute("CivTravelCompleted") then return end
      character:PivotTo(CFrame.new(0, 5, 0))
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
    -- 스크립트 재시작 중 이미 접속한 사용자도 검증된 세이브를 읽는다.
    -- 읽기 전에는 조작/저장을 열지 않는다. 실패 시 기존 값을 덮어쓰지 않는다.
    player:SetAttribute("CivReady", false)
    player:SetAttribute("CivSaveAvailable", false)
    local readOk, persisted = false, nil
    if store then
      for attempt = 1, 5 do
        readOk, persisted = pcall(function()
          return store:GetAsync("player:" .. player.UserId)
        end)
        if readOk then break end
        warn("CIV_PREEXISTING_DATASTORE_RETRY", player.UserId, attempt, tostring(persisted))
        if attempt < 5 then task.wait(math.min(2 ^ (attempt - 1), 8)) end
      end
    end
    if player.Parent ~= Players then return end
    local verified = readOk and (persisted == nil or typeof(persisted) == "table")
    civDataLoadValid[player] = verified
    if verified then
      if typeof(persisted) == "table" then
        for key, fallback in pairs(Config.InitialState) do
          local value = persisted[key]
          if typeof(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge then
            player:SetAttribute(key, value)
          else
            player:SetAttribute(key, fallback)
          end
        end
      end
      if readNumber(player, "CivRaceID", 0) == 0 then setNumber(player, "CivRaceID", 1) end
    else
      warn("CIV_PREEXISTING_LOAD_FAILED_BLOCKS_SAVE", player.UserId, tostring(persisted))
    end
    player:SetAttribute("CivSaveAvailable", verified)
    civRestoreBuildings(player)
    if verified and typeof(persisted) == "table" then
      civRestoreHousing(player, persisted.CivHousingPieces)
    end
    player:SetAttribute("CivReady", true)
    weatherSyncEvent:FireClient(player, WeatherSystem.Snapshot())
    queueInventorySync(player)
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
    CivCraft = civCraft, CivBuild = civBuild, CivBuildHousing = civBuildHousing, CivRemoveHousing = civRemoveHousing, CivToggleHousingDoor = civToggleHousingDoor, CivEquip = civEquip,
    CivSkinTone = civSetSkinTone,
  }
  local action = handler or civActions[actionId]
  if typeof(action) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or -1e9
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  if actionId == "CivTravel" then
    -- 저장 읽기에 실패한 세션은 이동시키지 않는다. 실패 사유는 바로 클라이언트에 알린다.
    if civDataLoadValid[player] ~= true or player:GetAttribute("CivSaveAvailable") ~= true then
      civMessage(player, "저장 확인 실패: 기존 데이터를 보호하려고 모험 이동을 막았어. 재접속해 줘.")
      return
    end
    local selected = readNumber(player, "CivRaceID", 0)
    if not civNowReady(player, "Travel", 1.5) then
      civMessage(player, "이동 준비 중이야. 잠시 후 다시 눌러줘.")
      return
    end
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not character or not humanoid or humanoid.Health <= 0 then return end
    if typeof(argument) == "number" and argument % 1 == 0 and RaceData.GetRace(argument) then
      if selected <= 0 then civMessage(player, "게임 데이터를 확인할 수 없어. 잠시 후 다시 시도해."); return end
      -- 로비 모험 이동은 현재 캐릭터의 저장된 지역에만 허용한다.
      -- 삭제된 24종족 포털을 임의 원격 요청으로 우회하지 못하게 한다.
      if argument ~= selected then return end
      action(player, selected)
    elseif argument == "Lobby" then
      character:SetAttribute("CivTravelCompleted", true)
      character:PivotTo(CFrame.new(0, 5, 0))
      player:SetAttribute("CivTravelDestination", "Lobby")
      player:SetAttribute("CivTravelAck", (player:GetAttribute("CivTravelAck") or 0) + 1)
    elseif selected > 0 then
      local root = character:FindFirstChild("HumanoidRootPart")
      if root and Vector3.new(root.Position.X, 0, root.Position.Z).Magnitude > 80 then
        character:SetAttribute("CivTravelCompleted", true)
        character:PivotTo(CFrame.new(0, 5, 0))
      else action(player, selected) end
    else
      character:SetAttribute("CivTravelCompleted", true)
      character:PivotTo(CFrame.new(0, 5, 0))
    end
  elseif actionId == "CivSelect" or actionId == "CivCompanion" or actionId == "CivCraft"
    or actionId == "CivBuild" or actionId == "CivBuildHousing" or actionId == "CivRemoveHousing" or actionId == "CivToggleHousingDoor" or actionId == "CivEquip" or actionId == "CivSkinTone" then
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
  -- 저장 중 플레이어가 철거/건설하더라도 스냅샷 배열이 변하지 않도록 복사한다.
  local housingSnapshot = {}
  for _, record in ipairs(civHousingRecords[player] or {}) do
    table.insert(housingSnapshot, table.clone(record))
  end
  local ok, err = false, nil
  for attempt = 1, 3 do
    ok, err = pcall(function()
      store:UpdateAsync("player:" .. player.UserId, function(existing)
        local merged = typeof(existing) == "table" and existing or {}
        for key, value in pairs(snapshot) do merged[key] = value end
        merged.CivHousingPieces = housingSnapshot
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
  civHousingCounts[player] = nil
  civHousingRecords[player] = nil
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
