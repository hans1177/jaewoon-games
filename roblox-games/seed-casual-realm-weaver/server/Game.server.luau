local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local store = nil
local storeOk, storeResult = pcall(function()
  return DataStoreService:GetDataStore("seed-casual-realm-weaver-development-v1")
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

local puzzleSessions = {}
local PIECE_COLORS = {
  Color3.fromRGB(102, 181, 112),
  Color3.fromRGB(96, 154, 211),
  Color3.fromRGB(224, 184, 92),
}

local function markPuzzleAction(player, actionId, learningPattern)
  player:SetAttribute("LastApprovedScope", actionId)
  setNumber(player, "ActionSequence", readNumber(player, "ActionSequence", 0) + 1)
  player:SetAttribute("LastLearningPattern", learningPattern)
end

local function makeRealmPart(parent, name, size, position, color, material)
  local part = parent:FindFirstChild(name)
  if part and not part:IsA("BasePart") then part:Destroy(); part = nil end
  if not part then
    part = Instance.new("Part")
    part.Name = name
    part.Anchored = true
    part.CanCollide = false
    part.Parent = parent
  end
  part.Size = size
  part.Position = position
  part.Color = color
  part.Material = material
  return part
end

local function buildRealmWeaverWorld()
  local world = workspace:FindFirstChild("RealmWeaverWorld")
  if world and not world:IsA("Model") then world:Destroy(); world = nil end
  if not world then
    world = Instance.new("Model")
    world.Name = "RealmWeaverWorld"
    world.Parent = workspace
  end

  local landmark = makeRealmPart(
    world,
    "RealmLandmarkGarden",
    Vector3.new(34, 1, 34),
    Vector3.new(0, 0.5, 28),
    Color3.fromRGB(112, 159, 105),
    Enum.Material.Grass
  )
  landmark.CanCollide = true

  local objective = makeRealmPart(
    world,
    "RealmObjectiveBoard",
    Vector3.new(18, 0.8, 18),
    Vector3.new(0, 1.05, 28),
    Color3.fromRGB(128, 116, 97),
    Enum.Material.Slate
  )
  objective:SetAttribute("Objective", "WEAVE_TERRAIN_PATTERN")
  objective:SetAttribute("Landmark", true)

  local boardFolder = world:FindFirstChild("PuzzleBoards")
  if not boardFolder then
    boardFolder = Instance.new("Folder")
    boardFolder.Name = "PuzzleBoards"
    boardFolder.Parent = world
  end
  world:SetAttribute("WorldReady", true)
  return world, boardFolder
end

local realmWorld, boardFolder = buildRealmWeaverWorld()

local function emptyBoard()
  return {0,0,0,0,0,0,0,0,0}
end

local function encodeBoard(board)
  local rows = {}
  for index = 1, 9 do rows[index] = tostring(board[index] or 0) end
  return table.concat(rows, ",")
end

local function ensurePlayerBoard(player)
  local name = "PlayerBoard_" .. tostring(player.UserId)
  local model = boardFolder:FindFirstChild(name)
  if model and not model:IsA("Model") then model:Destroy(); model = nil end
  if not model then
    model = Instance.new("Model")
    model.Name = name
    model.Parent = boardFolder
    local offsetX = ((player.UserId % 5) - 2) * 22
    for index = 1, 9 do
      local row = math.floor((index - 1) / 3)
      local col = (index - 1) % 3
      local tile = makeRealmPart(
        model,
        "RealmTile" .. index,
        Vector3.new(5.2, 0.6, 5.2),
        Vector3.new(offsetX + (col - 1) * 5.8, 1.55, 28 + (row - 1) * 5.8),
        Color3.fromRGB(74, 79, 84),
        Enum.Material.SmoothPlastic
      )
      tile:SetAttribute("BoardCell", index)
    end
  end
  return model
end

local function renderPuzzleBoard(player, board)
  local model = ensurePlayerBoard(player)
  for index = 1, 9 do
    local tile = model:FindFirstChild("RealmTile" .. index)
    local piece = board[index] or 0
    if tile and tile:IsA("BasePart") then
      tile.Color = piece > 0 and PIECE_COLORS[piece] or Color3.fromRGB(74, 79, 84)
      tile.Material = piece > 0 and Enum.Material.Grass or Enum.Material.SmoothPlastic
      tile:SetAttribute("PieceType", piece)
    end
  end
  player:SetAttribute("BoardState", encodeBoard(board))
end

local function ensurePuzzleSession(player)
  local session = puzzleSessions[player]
  if session then return session end
  session = {
    active = false,
    stage = math.max(1, readNumber(player, "CurrentStage", 1)),
    turns = math.max(1, readNumber(player, "TurnsRemaining", 8)),
    nextPiece = math.clamp(readNumber(player, "NextPiece", 1), 1, 3),
    board = emptyBoard(),
  }
  puzzleSessions[player] = session
  renderPuzzleBoard(player, session.board)
  player:SetAttribute("PuzzleSessionActive", false)
  return session
end

local function syncPuzzleSession(player, session)
  setNumber(player, "CurrentStage", session.stage)
  setNumber(player, "TurnsRemaining", session.turns)
  setNumber(player, "NextPiece", session.nextPiece)
  setNumber(player, "BoardPlaced", 9 - table.find(session.board, 0) and 0 or readNumber(player, "BoardPlaced", 0))
  player:SetAttribute("PuzzleSessionActive", session.active)
  renderPuzzleBoard(player, session.board)
end

local function setBoardPlacedCount(player, session)
  local placed = 0
  for index = 1, 9 do if (session.board[index] or 0) > 0 then placed += 1 end end
  setNumber(player, "BoardPlaced", placed)
end

local function beginPuzzleSessionState(player)
  local session = ensurePuzzleSession(player)
  if not session.active then
    session.active = true
    session.turns = math.max(1, readNumber(player, "TurnsRemaining", 8))
    if session.turns <= 0 then session.turns = 8 end
    player:SetAttribute("PuzzleSessionActive", true)
  end
  return session
end

local function startPuzzleSession(player)
  local session = beginPuzzleSessionState(player)
  local chain = readNumber(player, "PuzzleChain", 0) + 1
  setNumber(player, "PuzzleChain", chain)
  setNumber(player, "Score", readNumber(player, "Score", 0) + chain * 3)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 6)
  player:SetAttribute("PuzzleHint", "DRAG_A_TERRAIN_PIECE")
  markPuzzleAction(player, "genre-core", "board-grid-placement")
  syncPuzzleSession(player, session)
end

local function nearestEmptyCell(board, preferred)
  if typeof(preferred) == "number" then
    local requested = math.clamp(math.floor(preferred), 1, 9)
    if (board[requested] or 0) == 0 then return requested end
  end
  for index = 1, 9 do if (board[index] or 0) == 0 then return index end end
  return nil
end

local function placeTerrainPiece(player, requestedCell)
  local session = beginPuzzleSessionState(player)
  local cell = nearestEmptyCell(session.board, requestedCell)
  if not cell then
    session.board = emptyBoard()
    cell = nearestEmptyCell(session.board, requestedCell)
  end

  session.board[cell] = session.nextPiece
  session.nextPiece = session.nextPiece % 3 + 1
  session.turns = math.max(0, session.turns - 1)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 3) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 5)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 8)
  player:SetAttribute("PuzzleHint", "CONNECT_MATCHING_TERRAIN")
  setBoardPlacedCount(player, session)
  markPuzzleAction(player, "scope-coreloop-0-b46035eaa3", "input-drag-touch")
  syncPuzzleSession(player, session)
end

local function matchingEdges(board)
  local matches = 0
  for index = 1, 9 do
    local value = board[index] or 0
    if value > 0 then
      local col = (index - 1) % 3
      local row = math.floor((index - 1) / 3)
      if col < 2 and board[index + 1] == value then matches += 1 end
      if row < 2 and board[index + 3] == value then matches += 1 end
    end
  end
  return matches
end

local function connectRealmPattern(player)
  local session = beginPuzzleSessionState(player)
  local matches = matchingEdges(session.board)
  setNumber(player, "RestorationGauge", math.min(100, readNumber(player, "RestorationGauge", 0) + math.max(5, matches * 8)))

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
  player:SetAttribute("PuzzleHint", matches > 0 and "RESTORATION_CHAIN_ACTIVE" or "TRY_ANOTHER_PATTERN")
  markPuzzleAction(player, "scope-corefun-5b52385f9a", "score-combo-reward")
end

local function activateRestoredRegion(player)
  beginPuzzleSessionState(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 11)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 6)
  setNumber(player, "RestorationGauge", math.min(100, readNumber(player, "RestorationGauge", 0) + 20))
  player:SetAttribute("RestoredRegion", "STAGE_" .. tostring(readNumber(player, "CurrentStage", 1)))
  markPuzzleAction(player, "scope-coreloop-1-a21a6e21b0", "progression-difficulty")
end

local function finishPuzzleStage(player)
  local session = ensurePuzzleSession(player)
  setNumber(player, "Objective", readNumber(player, "Objective", 0) + 1)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 11)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 13)
  session.active = false
  session.stage += 1
  session.turns = 8
  session.board = emptyBoard()
  session.nextPiece = (session.stage - 1) % 3 + 1
  setNumber(player, "RestorationGauge", 0)
  setNumber(player, "BoardPlaced", 0)
  player:SetAttribute("PuzzleHint", "NEXT_STAGE_READY")
  markPuzzleAction(player, "scope-coreloop-2-edebd26130", "save-state-persistence")
  syncPuzzleSession(player, session)
end

local function addInventoryThemeShard(player, amount)
  setNumber(player, "InventoryThemeShards", readNumber(player, "InventoryThemeShards", 0) + math.max(0, amount))
end

local function unlockThemeReward(player)
  setNumber(player, "Level", readNumber(player, "Level", 1) + 1)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 13)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 11)
  setNumber(player, "Coins", readNumber(player, "Coins", 0) + 8)
  addInventoryThemeShard(player, 1)
  setNumber(player, "ThemeUnlockLevel", readNumber(player, "ThemeUnlockLevel", 0) + 1)
  setNumber(player, "GardenDecorCount", readNumber(player, "GardenDecorCount", 0) + 1)
  player:SetAttribute("PuzzleHint", "NEW_THEME_UNLOCKED")
  markPuzzleAction(player, "scope-coreloop-3-545e010215", "ads-monetization")
end

local function inspectPuzzleGarden(player)
  local session = ensurePuzzleSession(player)
  setNumber(player, "Position", (readNumber(player, "Position", 0) + 1) % 12)
  setNumber(player, "Score", readNumber(player, "Score", 0) + 9)
  setNumber(player, "Progress", readNumber(player, "Progress", 0) + 10)
  player:SetAttribute("PuzzleHint", session.active and "BOARD_STATE_VISIBLE" or "START_NEXT_WEAVE")
  markPuzzleAction(player, "scope-mobileux-6b1e61eae0", "board-state")
  syncPuzzleSession(player, session)
end

local handlers = {
  ["genre-core"] = startPuzzleSession,
  ["scope-corefun-5b52385f9a"] = connectRealmPattern,
  ["scope-coreloop-0-b46035eaa3"] = placeTerrainPiece,
  ["scope-coreloop-1-a21a6e21b0"] = activateRestoredRegion,
  ["scope-coreloop-2-edebd26130"] = finishPuzzleStage,
  ["scope-coreloop-3-545e010215"] = unlockThemeReward,
  ["scope-mobileux-6b1e61eae0"] = inspectPuzzleGarden,
}

Players.PlayerAdded:Connect(function(player)
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
remote.OnServerEvent:Connect(function(player, actionId, payload)
  if typeof(actionId) ~= "string" then return end
  local handler = handlers[actionId]
  if typeof(handler) ~= "function" then return end
  local now = os.clock()
  local previous = lastAction[player] or 0
  if now - previous < Config.RateLimitSeconds then return end
  lastAction[player] = now
  handler(player, payload)
end)
Players.PlayerRemoving:Connect(function(player)
  local snapshot = {}
  for key, fallback in pairs(Config.InitialState) do snapshot[key] = readNumber(player, key, fallback) end
  pcall(function()
    store:UpdateAsync("player:" .. player.UserId, function() return snapshot end)
  end)
  lastAction[player] = nil
  puzzleSessions[player] = nil
  local board = boardFolder:FindFirstChild("PlayerBoard_" .. tostring(player.UserId))
  if board then board:Destroy() end
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
local nativeFoundationSpawn = workspace:FindFirstChild("NativeFoundationSpawn")
if not nativeFoundationSpawn then
  nativeFoundationSpawn = Instance.new("SpawnLocation")
  nativeFoundationSpawn.Name = "NativeFoundationSpawn"
  nativeFoundationSpawn.Size = Vector3.new(8, 1, 8)
  nativeFoundationSpawn.Position = Vector3.new(0, 3, 0)
  nativeFoundationSpawn.Neutral = true
  nativeFoundationSpawn.Parent = workspace
end
local function bindNativeFoundationCharacter(character)
  local humanoid = character:WaitForChild("Humanoid", 10)
  local rootPart = character:WaitForChild("HumanoidRootPart", 10)
  if not humanoid or not rootPart then character:SetAttribute("FoundationFailure", "CHARACTER_FOUNDATION_FAILURE"); return end
  character:SetAttribute("GROUND_CONTACT", false)
  character:SetAttribute("MOVEMENT_CONFIRMED", false)
  rootPart.Anchored = false
  humanoid.PlatformStand = false
  for _, bodyPart in ipairs(character:GetDescendants()) do
    if bodyPart:IsA("BasePart") and not bodyPart:FindFirstAncestorOfClass("Tool") then bodyPart.Anchored = false end
  end
  local params = RaycastParams.new()
  params.ExcludeInstances = {character, nativeFoundationSpawn}
  params.RespectCanCollide = true
  params.IgnoreWater = true
  params.CollisionGroup = rootPart.CollisionGroup
  local leg = humanoid.RigType == Enum.HumanoidRigType.R6 and character:FindFirstChild("Left Leg") or nil
  local clearance = humanoid.HipHeight + rootPart.Size.Y * 0.5 + (leg and leg.Size.Y or 0)
  local groundHit = workspace:Raycast(rootPart.Position + Vector3.new(0, 4, 0), Vector3.new(0, -512, 0), params)
  if not groundHit or groundHit.Normal.Y < 0.55 then
    groundHit = workspace:Raycast(nativeFoundationSpawn.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  end
  if not groundHit or groundHit.Normal.Y < 0.55 then
    character:SetAttribute("FoundationFailure", "SPAWN_GROUND_MISSING")
    return
  end
  -- The existing spawn rests on verified world geometry; it cannot be its own ground proof.
  local spawnHit = workspace:Raycast(nativeFoundationSpawn.Position + Vector3.new(0, 64, 0), Vector3.new(0, -576, 0), params)
  if spawnHit and spawnHit.Normal.Y >= 0.55 then
    nativeFoundationSpawn.Position = Vector3.new(nativeFoundationSpawn.Position.X, spawnHit.Position.Y - nativeFoundationSpawn.Size.Y * 0.5 + 0.05, nativeFoundationSpawn.Position.Z)
  end
  local target = groundHit.Position + Vector3.new(0, clearance + 0.1, 0)
  character:PivotTo(character:GetPivot() + (target - rootPart.Position))
  rootPart.AssemblyLinearVelocity = Vector3.zero
  rootPart.AssemblyAngularVelocity = Vector3.zero
  local movementOrigin = rootPart.Position
  humanoid.Running:Connect(function(speed)
    if not rootPart.Parent or humanoid.FloorMaterial == Enum.Material.Air then return end
    local displacement = (rootPart.Position - movementOrigin) * Vector3.new(1, 0, 1)
    if speed > 0.1 and displacement.Magnitude > 0.5 then character:SetAttribute("MOVEMENT_CONFIRMED", true) end
  end)
  local deadline = os.clock() + 5
  repeat
    if not character.Parent or not rootPart.Parent then return end
    local contact = workspace:Raycast(rootPart.Position, Vector3.new(0, -(clearance + 0.75), 0), params)
    if contact and contact.Normal.Y >= 0.55 and humanoid.FloorMaterial ~= Enum.Material.Air and math.abs(rootPart.AssemblyLinearVelocity.Y) < 3 then
      character:SetAttribute("GROUND_CONTACT", true)
      character:SetAttribute("FoundationFailure", nil)
      character:SetAttribute("NativeFoundationGroundingVersion", 2)
      return
    end
    task.wait(0.1)
  until os.clock() >= deadline
  character:SetAttribute("FoundationFailure", "GROUND_CONTACT_FAILURE")
end
local function bindNativeFoundationPlayer(player)
  if player.Character then task.defer(bindNativeFoundationCharacter, player.Character) end
  player.CharacterAdded:Connect(bindNativeFoundationCharacter)
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
