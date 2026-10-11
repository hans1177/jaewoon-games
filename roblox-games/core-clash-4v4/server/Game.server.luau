local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("core-clash-4v4-development-v1")
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
  setNumber(player, "Health", math.clamp(readNumber(player, "Health", 100) - 1, 0, 100))
  setNumber(player, "Wave", readNumber(player, "Wave", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
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
  player:SetAttribute("LastApprovedScope", "scope-corefun-ff7bc78a9b")
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
  player:SetAttribute("LastApprovedScope", "scope-coreloop-2-6c927cfa40")
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

local handlers = {
  ["genre-core"] = scopeHandler1,
  ["scope-corefun-ff7bc78a9b"] = scopeHandler2,
  ["scope-coreloop-0-9b2d4dfbc6"] = scopeHandler3,
  ["scope-coreloop-1-6ebe58f496"] = scopeHandler4,
  ["scope-coreloop-2-6c927cfa40"] = scopeHandler5,
  ["scope-mobileux-dc1239c515"] = scopeHandler6,
}

Players.PlayerAdded:Connect(function(player)
  bindFoundationPlayer(player)
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
  task.defer(function()
    bindFoundationPlayer(player)
    if player:GetAttribute("Score") == nil then initializePlayer(player) end
  end)
end
remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
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
end)
game:BindToClose(function() end)
