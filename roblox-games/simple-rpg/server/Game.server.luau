-- 파일명: roblox-games/simple-rpg/server/Game.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("simple-rpg-development-v1")
end)
if storeOk then store = storeResult end
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local RaceData = require(Shared:WaitForChild("RaceData"))
local TechTreeData = require(Shared:WaitForChild("TechTreeData"))
local CompanionAI = require(script.Parent:WaitForChild("CompanionAI"))

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then remote:Destroy(); remote = nil end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

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
  board.Size = UDim2.fromOffset(190, 56)
  board.StudsOffsetWorldSpace = Vector3.new(0, height or 4, 0)
  board.MaxDistance = 78
  board.AlwaysOnTop = true
  board.Parent = parent
  local label = Instance.new("TextLabel")
  label.BackgroundColor3 = Color3.fromRGB(26, 28, 30)
  label.BackgroundTransparency = 0.25
  label.Size = UDim2.fromScale(1, 1)
  label.TextScaled = true
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
local function civGather(player)
  if not civRace(player) or not civNowReady(player, "Gather", civ.GatherCooldown) then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  local best, dist = nil, 14
  for _, node in ipairs(civNodes) do
    local d = (node.Part.Position - root.Position).Magnitude
    if d < dist then best = node; dist = d end
  end
  if not best then civMessage(player, "자원 기둥에 가까이 가서 채집해."); return end
  local race = civRace(player)
  local bonus = (race.PassiveType == "OceanGather" and best.Type == "Wood") and 1.30
    or (race.PassiveType == "Harvest" and best.Type == "Food") and 1.25
    or (race.PassiveType == "Industry" and best.Type == "Iron") and 1.15
    or (race.PassiveType == "Cold" and (best.Type == "Iron" or best.Type == "Bronze")) and 1.25 or 1
  local amount = math.max(1, math.floor(3 * bonus + 0.5))
  civIncrease(player, "Civ" .. best.Type, amount)
  civIncrease(player, "CivGather", 1)
  civIncrease(player, "CivResearch", 1)
  civMessage(player, best.Label .. " +" .. amount .. " / 연구력 +1")
end
local function civResearch(player)
  local race = civRace(player)
  if not race or not civNowReady(player, "Research", 0.3) then return end
  local nextID = readNumber(player, "CivTech", 0) + 1
  local tech = TechTreeData.GetTech(nextID)
  if not tech then civMessage(player, "72개 연구를 모두 해금했어."); return end
  if readNumber(player, "CivTech", 0) ~= tech.Prerequisite then return end
  local factor = 1
  if readNumber(player, tech.EurekaMetric, 0) >= tech.EurekaCount then factor *= 0.5 end
  if race.PassiveType == "Research" then factor *= 0.85 end
  if race.PassiveType == "MythDiscount" and tech.Era == 1 then factor *= 0.8 end
  if race.PassiveType == "AgeDiscount" and (nextID == 15 or nextID == 29 or nextID == 45 or nextID == 61) then factor *= 0.85 end
  for resource, cost in pairs(tech.RequiredResources) do
    if readNumber(player, "Civ" .. resource, 0) < math.ceil(cost * factor) then
      civMessage(player, resource .. " 부족: " .. math.ceil(cost * factor) .. " 필요")
      return
    end
  end
  for resource, cost in pairs(tech.RequiredResources) do
    civIncrease(player, "Civ" .. resource, -math.ceil(cost * factor))
  end
  setNumber(player, "CivTech", nextID)
  setNumber(player, "CivEra", tech.Era)
  civMessage(player, "연구 완료: " .. tech.Name .. " (" .. TechTreeData.EraName(tech.Era) .. ")")
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
local function civSpawnEnemy(raceID, center)
  local race = RaceData.GetRace(raceID)
  local enemy = Instance.new("Model")
  enemy.Name = race.Mobs:match("^[^·]+") or race.Name .. " 수호자"
  enemy:SetAttribute("CivilizationEnemy", true)
  enemy:SetAttribute("RaceID", raceID)
  local root = civPart(enemy, "HumanoidRootPart", Vector3.new(3, 4, 3), CFrame.new(center + Vector3.new(0, 4, 9)), Color3.fromRGB(81 + raceID % 4 * 25, 75, 64), Enum.Material.SmoothPlastic, false)
  root.Transparency = 0.35
  local head = civPart(enemy, "Head", Vector3.new(2.6, 2.6, 2.6), root.CFrame * CFrame.new(0, 3, 0), Color3.fromRGB(190, 151, 116), Enum.Material.SmoothPlastic, false)
  local humanoid = Instance.new("Humanoid")
  humanoid.RequiresNeck = false
  humanoid.MaxHealth = 52 + raceID * 3
  humanoid.Health = humanoid.MaxHealth
  humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.Subject
  humanoid.Parent = enemy
  enemy.PrimaryPart = root
  enemy.Parent = civHub
  civSign(head, head, enemy.Name, 3.3)
  local item = { Model = enemy, Root = root, Humanoid = humanoid, Home = root.Position, RaceID = raceID, LastHit = -1e9, TelegraphAt = 0, StunnedUntil = 0 }
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
local function civAttack(player)
  if not civRace(player) or not civNowReady(player, "Attack", civ.AttackCooldown) then return end
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  local chosen, dist = nil, 12
  for _, enemy in ipairs(civEnemies) do
    if enemy.Humanoid.Health > 0 then
      local delta = enemy.Root.Position - root.Position
      local d = delta.Magnitude
      if d < dist and d > 0.01 and root.CFrame.LookVector:Dot(delta.Unit) > -0.1 then
        chosen = enemy; dist = d
      end
    end
  end
  if not chosen then civMessage(player, "적을 바라보고 가까이 가서 공격해."); return end
  local race = civRace(player)
  local damage = 12
  if race.PassiveType == "Victory" and (player:GetAttribute("CivVictoryUntil") or 0) > os.clock() then damage = math.floor(damage * 1.1 + 0.5) end
  chosen.Humanoid:TakeDamage(damage)
  remote:FireClient(player, "CIV_HIT", {Damage = damage, Enemy = chosen.Model.Name})
  if chosen.Humanoid.Health <= 0 then
    civIncrease(player, "CivKills", 1)
    civIncrease(player, "CivResearch", 8)
    civIncrease(player, "CivSilver", 3)
    if race.PassiveType == "Victory" then player:SetAttribute("CivVictoryUntil", os.clock() + 10) end
    civMessage(player, chosen.Model.Name .. " 처치! 연구력 +8 / 은화 +3")
    chosen.TelegraphAt = 0
    task.delay(9, function()
      if chosen.Model.Parent then
        chosen.Model:PivotTo(CFrame.new(chosen.Home))
        chosen.Humanoid.Health = chosen.Humanoid.MaxHealth
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
  local damage = math.max(1, math.floor(12 / defense + 0.5))
  humanoid:TakeDamage(damage)
  civMessage(player, enemy.Model.Name .. "의 공격! 체력 -" .. damage)
end
-- 문명 지역과 중앙 포털: 메인 지면/저장 키는 그대로 유지한다.
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
    {Type = "Iron", Label = "철광", Color = Color3.fromRGB(82, 110, 132)},
  }
  for index, resource in ipairs(resources) do
    local x = ((index - 1) % 2) * 11 - 6
    local z = math.floor((index - 1) / 2) * 12 - 7
    local node = civPart(region, resource.Label, Vector3.new(4, 5, 4), CFrame.new(center + Vector3.new(x + 5, 3.5, z + 5)), resource.Color, Enum.Material.Rock, true)
    node.Shape = Enum.PartType.Ball
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
      civGather(gatherer)
    end)
    table.insert(civNodes, {Part = node, Type = resource.Type, Label = resource.Label})
  end
  civSpawnEnemy(id, center)
  civSpawnGrazer(id, center)
  local portal = civPart(civHub, "포털 " .. race.Name, Vector3.new(4, 0.3, 4),
    CFrame.new(math.cos(angle) * 24, 0.2, math.sin(angle) * 24), Color3.fromRGB(111, 191, 222), Enum.Material.Neon, false)
  civSign(civHub, portal, race.Name, 3)
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
-- 적 추적과 예고 공격: 클라이언트 타임스탬프를 절대 신뢰하지 않는다.
task.spawn(function()
  while task.wait(0.25) do
    local now = os.clock()
    CompanionAI.Tick(civEnemies, civNodes, civIncrease)
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
      if enemy.Humanoid.Health > 0 and now >= enemy.StunnedUntil then
        local target, dist = nil, 32
        for _, player in ipairs(Players:GetPlayers()) do
          local character = player.Character
          local root = character and character:FindFirstChild("HumanoidRootPart")
          local humanoid = character and character:FindFirstChildOfClass("Humanoid")
          if root and humanoid and humanoid.Health > 0 and civRace(player) then
            local d = (root.Position - enemy.Root.Position).Magnitude
            if d < dist then target = player; dist = d end
          end
        end
        if target then
          local root = target.Character and target.Character:FindFirstChild("HumanoidRootPart")
          if root then
            if enemy.TelegraphAt > 0 and now >= enemy.TelegraphAt then
              enemy.TelegraphAt = 0
              enemy.LastHit = now
              civOnEnemyStrike(enemy, target, now)
            elseif enemy.TelegraphAt <= 0 then
              if dist > 7 then
                local step = root.Position - enemy.Root.Position
                local planar = Vector3.new(step.X, 0, step.Z)
                if planar.Magnitude > 0.1 then
                  local p = enemy.Root.Position + planar.Unit * math.min(1.2, planar.Magnitude)
                  if (Vector3.new(p.X - enemy.Home.X, 0, p.Z - enemy.Home.Z)).Magnitude <= 16 then
                    enemy.Model:PivotTo(CFrame.lookAt(p, Vector3.new(root.Position.X, p.Y, root.Position.Z)))
                  end
                end
              elseif now - enemy.LastHit >= 1.5 then
                enemy.TelegraphAt = now + 0.65
                remote:FireClient(target, "CIV_TELEGRAPH", {Enemy = enemy.Model.Name})
              end
            end
          end
        elseif enemy.TelegraphAt > 0 then
          enemy.TelegraphAt = 0
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

Players.PlayerAdded:Connect(function(player)
  player:SetAttribute("CivReady", false)
  bindFoundationPlayer(player)
  initializePlayer(player)
  if store then
    local ok, saved = pcall(function()
      return store:GetAsync("player:" .. player.UserId)
    end)
    if ok and typeof(saved) == "table" then
      for key, fallback in pairs(Config.InitialState) do
        local value = saved[key]
        if typeof(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge then
          player:SetAttribute(key, value)
        else
          player:SetAttribute(key, fallback)
        end
      end
    end
  end
  player:SetAttribute("CivReady", true)
  civApplyCharacterPassive(player)
  player.CharacterAdded:Connect(function()
    task.wait(0.1)
    civApplyCharacterPassive(player)
  end)
end)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(function()
    bindFoundationPlayer(player)
    if player:GetAttribute("Score") == nil then initializePlayer(player) end
    player:SetAttribute("CivReady", true)
  end)
end
-- 통합 액션 입력: 기존 ID는 그대로 두고 문명 전용 ID만 추가한다.
remote.OnServerEvent:Connect(function(player, actionId, argument)
  if player:GetAttribute("CivReady") ~= true then return end
  if typeof(actionId) ~= "string" or #actionId > 80 then return end
  local handler = handlers[actionId]
  local civActions = {
    CivSelect = civSelect, CivTravel = civTravel, CivAttack = civAttack,
    CivGuard = civGuard, CivDodge = civDodge, CivGather = civGather,
    CivResearch = civResearch, CivCompanion = civCompanion,
  }
  local action = handler or civActions[actionId]
  if typeof(action) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or -1e9
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  if actionId == "CivTravel" then
    local selected = readNumber(player, "CivRaceID", 0)
    if selected <= 0 or not civNowReady(player, "Travel", 2) then return end
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    if root and Vector3.new(root.Position.X, 0, root.Position.Z).Magnitude > 80 then
      character:PivotTo(CFrame.new(0, 5, 0))
    else
      action(player, selected)
    end
  elseif actionId == "CivSelect" or actionId == "CivCompanion" then
    action(player, argument)
  else
    action(player)
  end
end)
-- 같은 기존 저장소/키 사용, 수치 필드를 병합해 기존 데이터와 신규 연구를 함께 저장한다.
local function savePlayer(player)
  if not store then return end
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do
    snapshot[key] = readNumber(player, key, fallback)
  end
  local ok, err = pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function(existing)
      local merged = typeof(existing) == "table" and existing or {}
      for key, value in pairs(snapshot) do merged[key] = value end
      return merged
    end)
  end)
  if not ok then warn("CIV_SAVE_FAILURE", player.UserId, tostring(err)) end
end
Players.PlayerRemoving:Connect(function(player)
  savePlayer(player)
  lastAction[player] = nil
  civCooldowns[player] = nil
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
