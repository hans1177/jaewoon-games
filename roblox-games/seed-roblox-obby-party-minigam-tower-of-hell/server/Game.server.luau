local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

local remote = ReplicatedStorage:FindFirstChild(Config.RemoteName)
if remote and not remote:IsA("RemoteEvent") then
  remote:Destroy()
  remote = nil
end
if not remote then
  remote = Instance.new("RemoteEvent")
  remote.Name = Config.RemoteName
  remote.Parent = ReplicatedStorage
end

local COURSE_NAME = "Vibe2SkylineSprintCourse"
local STAGE_COUNT = 12
local FALL_Y = -12
local RESTART_DELAY = 3
local START_POSITION = Vector3.new(0, 7, 0)

local oldCourse = Workspace:FindFirstChild(COURSE_NAME)
if oldCourse then oldCourse:Destroy() end

local course = Instance.new("Model")
course.Name = COURSE_NAME
course:SetAttribute("MapRevision", "R4")
course:SetAttribute("Theme", "Skyline ascent")
course.Parent = Workspace

local function makePart(name, size, cframe, color, parent, material)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.CFrame = cframe
  part.Anchored = true
  part.CanCollide = true
  part.CanTouch = true
  part.Material = material or Enum.Material.SmoothPlastic
  part.Color = color
  part.TopSurface = Enum.SurfaceType.Smooth
  part.BottomSurface = Enum.SurfaceType.Smooth
  part.Parent = parent or course
  return part
end

local function makeDecorPart(name, size, cframe, color, parent, material, transparency)
  local part = makePart(name, size, cframe, color, parent, material)
  part.CanCollide = false
  part.CanTouch = false
  part.CanQuery = false
  part.Transparency = transparency or 0
  return part
end

local function addBillboard(adornee, text, color)
  local gui = Instance.new("BillboardGui")
  gui.Name = "ZoneLabel"
  gui.Adornee = adornee
  gui.Size = UDim2.fromOffset(220, 54)
  gui.StudsOffset = Vector3.new(0, 6, 0)
  gui.AlwaysOnTop = true
  gui.Parent = adornee

  local label = Instance.new("TextLabel")
  label.BackgroundTransparency = 1
  label.Size = UDim2.fromScale(1, 1)
  label.Font = Enum.Font.GothamBold
  label.Text = text
  label.TextScaled = true
  label.TextStrokeTransparency = 0.45
  label.TextColor3 = color
  label.Parent = gui
end

local startSpawn = Instance.new("SpawnLocation")
startSpawn.Name = "CourseStart"
startSpawn.Size = Vector3.new(20, 1, 20)
startSpawn.CFrame = CFrame.new(START_POSITION)
startSpawn.Anchored = true
startSpawn.Neutral = true
startSpawn.CanCollide = true
startSpawn.CanTouch = true
startSpawn.Material = Enum.Material.Neon
startSpawn.Color = Color3.fromRGB(80, 220, 120)
startSpawn.Parent = course
addBillboard(startSpawn, "SKYLINE SPRINT · START", Color3.fromRGB(210, 255, 225))

local startDeck = makePart(
  "StartLobby",
  Vector3.new(30, 2, 30),
  CFrame.new(START_POSITION + Vector3.new(0, -1.5, 0)),
  Color3.fromRGB(48, 58, 74),
  course,
  Enum.Material.Concrete
)
startDeck.CanTouch = false

local checkpointCFrames = {[0] = startSpawn.CFrame + Vector3.new(0, 4, 0)}
local checkpoints = {}
local hazards = {}
local movers = {}
local spinners = {}
local disappearers = {}
local pushers = {}

local zoneDefinitions = {
  {first = 1, last = 3, name = "ROOFTOPS", color = Color3.fromRGB(90, 180, 255)},
  {first = 4, last = 6, name = "CONSTRUCTION", color = Color3.fromRGB(255, 174, 66)},
  {first = 7, last = 9, name = "MACHINERY", color = Color3.fromRGB(190, 110, 255)},
  {first = 10, last = 12, name = "SKYLINE SUMMIT", color = Color3.fromRGB(255, 220, 70)},
}

local checkpointPositions = {
  Vector3.new(36, 11, -10),
  Vector3.new(72, 15, 8),
  Vector3.new(108, 20, -8),
  Vector3.new(144, 25, 10),
  Vector3.new(182, 31, -6),
  Vector3.new(220, 37, 8),
  Vector3.new(260, 45, -8),
  Vector3.new(300, 53, 10),
  Vector3.new(340, 62, -6),
  Vector3.new(382, 72, 10),
  Vector3.new(426, 83, -8),
  Vector3.new(472, 96, 0),
}

local function zoneForStage(stage)
  for _, zone in ipairs(zoneDefinitions) do
    if stage >= zone.first and stage <= zone.last then
      return zone
    end
  end
  return zoneDefinitions[#zoneDefinitions]
end

local function stagePoint(fromPosition, toPosition, alpha, offset)
  return fromPosition:Lerp(toPosition, alpha) + (offset or Vector3.zero)
end

local function addPlatform(stageModel, stage, suffix, position, size, color, material)
  local part = makePart(
    string.format("Step%02d%s", stage, suffix),
    size,
    CFrame.new(position),
    color,
    stageModel,
    material
  )
  part:SetAttribute("Stage", stage)
  part:SetAttribute("ObstacleRole", "Platform")
  return part
end

local function addHazard(name, size, cframe, parent)
  local hazard = makePart(
    name,
    size,
    cframe,
    Color3.fromRGB(242, 70, 76),
    parent,
    Enum.Material.Neon
  )
  hazard:SetAttribute("ObstacleRole", "Hazard")
  table.insert(hazards, hazard)
  return hazard
end

local function addMovingPlatform(stageModel, stage, suffix, position, size, color, offset, period, phase)
  local part = addPlatform(stageModel, stage, suffix, position, size, color, Enum.Material.Metal)
  part:SetAttribute("ObstacleType", "MovingPlatform")
  table.insert(movers, {
    part = part,
    origin = CFrame.new(position),
    offset = offset,
    period = period,
    phase = phase or 0,
  })
  return part
end

local function addSpinner(stageModel, stage, position, length, speed, phase)
  local bar = addHazard(
    string.format("Hazard%02dSpinner", stage),
    Vector3.new(length, 1.25, 2),
    CFrame.new(position),
    stageModel
  )
  bar:SetAttribute("ObstacleType", "RotatingBar")
  table.insert(spinners, {
    part = bar,
    pivot = CFrame.new(position),
    speed = speed,
    phase = phase or 0,
  })
  return bar
end

local function addDisappearingPlatform(stageModel, stage, suffix, position, size, color, phase)
  local part = addPlatform(stageModel, stage, suffix, position, size, color, Enum.Material.Glass)
  part:SetAttribute("ObstacleType", "DisappearingPlatform")
  table.insert(disappearers, {
    part = part,
    visibleTime = 2.6,
    hiddenTime = 1.35,
    phase = phase or 0,
    visible = true,
  })
  return part
end

local function addPusher(stageModel, stage, position, velocity)
  local pad = makePart(
    string.format("Pusher%02d", stage),
    Vector3.new(7, 1.2, 7),
    CFrame.new(position),
    Color3.fromRGB(70, 235, 220),
    stageModel,
    Enum.Material.Neon
  )
  pad:SetAttribute("ObstacleType", "PushPad")
  table.insert(pushers, {part = pad, velocity = velocity})
  return pad
end

local function addZoneGate(stage, position, zone)
  local gate = Instance.new("Model")
  gate.Name = string.format("ZoneGate%02d_%s", stage, zone.name:gsub("%s+", ""))
  gate.Parent = course

  local left = makeDecorPart(
    "LeftPillar",
    Vector3.new(2, 14, 2),
    CFrame.new(position + Vector3.new(0, 7, -9)),
    zone.color,
    gate,
    Enum.Material.Neon,
    0.12
  )
  makeDecorPart(
    "RightPillar",
    Vector3.new(2, 14, 2),
    CFrame.new(position + Vector3.new(0, 7, 9)),
    zone.color,
    gate,
    Enum.Material.Neon,
    0.12
  )
  makeDecorPart(
    "TopBeam",
    Vector3.new(2, 2, 20),
    CFrame.new(position + Vector3.new(0, 14, 0)),
    zone.color,
    gate,
    Enum.Material.Neon,
    0.12
  )
  addBillboard(left, zone.name, zone.color)
end

-- Lightweight skyline silhouettes. They are non-collidable so they cannot create shortcut routes.
local skyline = Instance.new("Folder")
skyline.Name = "CityBackdrop"
skyline.Parent = course

for index = 1, 24 do
  local side = index % 2 == 0 and 1 or -1
  local x = 18 + index * 20
  local height = 18 + (index * 11 % 42)
  local z = side * (48 + (index % 4) * 10)
  local building = makeDecorPart(
    string.format("Building%02d", index),
    Vector3.new(18 + (index % 3) * 5, height, 18 + (index % 4) * 3),
    CFrame.new(x, height * 0.5 - 2, z),
    Color3.fromRGB(38 + (index % 3) * 9, 48 + (index % 4) * 8, 68 + (index % 2) * 12),
    skyline,
    Enum.Material.Concrete,
    0.08
  )
  building:SetAttribute("DecorOnly", true)

  makeDecorPart(
    string.format("WindowBand%02d", index),
    Vector3.new(building.Size.X + 0.2, 1.1, building.Size.Z + 0.2),
    CFrame.new(x, math.max(4, height * 0.72), z),
    Color3.fromRGB(95, 190, 255),
    skyline,
    Enum.Material.Neon,
    0.25
  )
end

local previousPosition = START_POSITION
for stage = 1, STAGE_COUNT do
  local checkpointPosition = checkpointPositions[stage]
  local zone = zoneForStage(stage)
  local stageModel = Instance.new("Model")
  stageModel.Name = string.format("Stage%02d_%s", stage, zone.name:gsub("%s+", ""))
  stageModel:SetAttribute("Stage", stage)
  stageModel:SetAttribute("Zone", zone.name)
  stageModel.Parent = course

  if stage == zone.first then
    addZoneGate(stage, previousPosition + Vector3.new(3, 1, 0), zone)
  end

  local neutral = Color3.fromRGB(190, 202, 220)
  local dark = Color3.fromRGB(135, 153, 180)
  local accent = zone.color

  if stage == 1 then
    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.28), Vector3.new(11, 1, 11), neutral, Enum.Material.Concrete)
    addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.56), Vector3.new(10, 1, 10), dark, Enum.Material.Concrete)
    local vent = makePart("RooftopVent01", Vector3.new(5, 2.5, 5), CFrame.new(stagePoint(previousPosition, checkpointPosition, 0.78) + Vector3.new(0, 1.25, 0)), Color3.fromRGB(95, 110, 130), stageModel, Enum.Material.Metal)
    vent:SetAttribute("ObstacleType", "Vault")
    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.82), Vector3.new(10, 1, 10), neutral, Enum.Material.Concrete)
  elseif stage == 2 then
    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.24, Vector3.new(0, 0, 4)), Vector3.new(9, 1, 9), neutral, Enum.Material.Concrete)
    addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.50, Vector3.new(0, 0, -4)), Vector3.new(8, 1, 8), dark, Enum.Material.Concrete)
    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.76, Vector3.new(0, 0, 4)), Vector3.new(8, 1, 8), neutral, Enum.Material.Concrete)
  elseif stage == 3 then
    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.23), Vector3.new(11, 1, 5), accent, Enum.Material.Metal)
    addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.48), Vector3.new(9, 1, 4), dark, Enum.Material.Metal)
    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.73), Vector3.new(10, 1, 5), accent, Enum.Material.Metal)
  elseif stage == 4 then
    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.23), Vector3.new(11, 1, 4), accent, Enum.Material.Metal)
    addMovingPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.50), Vector3.new(9, 1, 7), neutral, Vector3.new(0, 0, 5), 4.4, 0)
    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.77), Vector3.new(11, 1, 4), dark, Enum.Material.Metal)
  elseif stage == 5 then
    addMovingPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.24), Vector3.new(9, 1, 8), neutral, Vector3.new(0, 0, 5), 4.1, 0.4)
    addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.50), Vector3.new(12, 1, 4), accent, Enum.Material.Metal)
    addMovingPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.76), Vector3.new(9, 1, 8), neutral, Vector3.new(0, 0, -5), 4.8, 1.1)
  elseif stage == 6 then
    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.20, Vector3.new(0, 0, 3)), Vector3.new(12, 1, 3.5), accent, Enum.Material.Metal)
    addMovingPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.43), Vector3.new(8, 1, 7), neutral, Vector3.new(0, 3, 0), 4.6, 0.7)
    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.68, Vector3.new(0, 0, -3)), Vector3.new(12, 1, 3.5), dark, Enum.Material.Metal)
    addPlatform(stageModel, stage, "D", stagePoint(previousPosition, checkpointPosition, 0.84), Vector3.new(8, 1, 6), accent, Enum.Material.Metal)
  elseif stage == 7 then
    local arena = addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.34), Vector3.new(18, 1, 13), dark, Enum.Material.Metal)
    addSpinner(stageModel, stage, arena.Position + Vector3.new(0, 2.4, 0), 16, 1.45, 0)
    addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.73), Vector3.new(9, 1, 8), accent, Enum.Material.Metal)
  elseif stage == 8 then
    addPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.22), Vector3.new(9, 1, 8), dark, Enum.Material.Metal)
    local pusherLanding = addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.50), Vector3.new(15, 1, 13), neutral, Enum.Material.Metal)
    addPusher(stageModel, stage, pusherLanding.Position + Vector3.new(0, 0.72, 0), Vector3.new(0, 20, -42))
    addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.78), Vector3.new(9, 1, 8), accent, Enum.Material.Metal)
  elseif stage == 9 then
    addMovingPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.22), Vector3.new(9, 1, 8), neutral, Vector3.new(0, 0, 5), 4.0, 0.2)
    local arena = addPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.50), Vector3.new(17, 1, 12), dark, Enum.Material.Metal)
    addSpinner(stageModel, stage, arena.Position + Vector3.new(0, 2.5, 0), 15, -1.7, 0.6)
    addMovingPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.78), Vector3.new(9, 1, 8), accent, Vector3.new(0, 3, 0), 4.3, 1.2)
  elseif stage == 10 then
    addDisappearingPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.23), Vector3.new(9, 1, 8), accent, 0)
    addDisappearingPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.48, Vector3.new(0, 0, 3)), Vector3.new(8, 1, 7), neutral, 1.0)
    addDisappearingPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.73, Vector3.new(0, 0, -3)), Vector3.new(8, 1, 7), accent, 2.0)
  elseif stage == 11 then
    addMovingPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.20), Vector3.new(9, 1, 8), neutral, Vector3.new(0, 0, 5), 3.8, 0)
    addDisappearingPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.42), Vector3.new(8, 1, 7), accent, 0.8)
    local arena = addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.65), Vector3.new(15, 1, 11), dark, Enum.Material.Metal)
    addSpinner(stageModel, stage, arena.Position + Vector3.new(0, 2.4, 0), 14, 1.9, 1.2)
    addDisappearingPlatform(stageModel, stage, "D", stagePoint(previousPosition, checkpointPosition, 0.84), Vector3.new(8, 1, 7), accent, 2.1)
  else
    addDisappearingPlatform(stageModel, stage, "A", stagePoint(previousPosition, checkpointPosition, 0.17), Vector3.new(8, 1, 7), accent, 0)
    addMovingPlatform(stageModel, stage, "B", stagePoint(previousPosition, checkpointPosition, 0.37), Vector3.new(8, 1, 7), neutral, Vector3.new(0, 0, 5), 3.7, 0.5)
    local finalArena = addPlatform(stageModel, stage, "C", stagePoint(previousPosition, checkpointPosition, 0.58), Vector3.new(15, 1, 11), dark, Enum.Material.Metal)
    addSpinner(stageModel, stage, finalArena.Position + Vector3.new(0, 2.5, 0), 14, -2.05, 0.3)
    addDisappearingPlatform(stageModel, stage, "D", stagePoint(previousPosition, checkpointPosition, 0.78), Vector3.new(8, 1, 7), accent, 1.4)
    addPlatform(stageModel, stage, "E", stagePoint(previousPosition, checkpointPosition, 0.90), Vector3.new(8, 1, 7), Color3.fromRGB(255, 232, 115), Enum.Material.Neon)
  end

  -- Preserve the original per-stage hazard naming contract while placing danger below the route.
  local hazardPosition = stagePoint(previousPosition, checkpointPosition, 0.5) + Vector3.new(0, -5, 0)
  local hazard = addHazard(
    string.format("Hazard%02d", stage),
    Vector3.new(10, 1, 10),
    CFrame.new(hazardPosition),
    stageModel
  )
  hazard:SetAttribute("Stage", stage)

  local checkpoint = makePart(
    string.format("Checkpoint%02d", stage),
    Vector3.new(stage == STAGE_COUNT and 18 or 14, 1, stage == STAGE_COUNT and 18 or 14),
    CFrame.new(checkpointPosition),
    stage == STAGE_COUNT and Color3.fromRGB(255, 220, 70) or zone.color,
    course,
    stage == STAGE_COUNT and Enum.Material.Neon or Enum.Material.SmoothPlastic
  )
  checkpoint:SetAttribute("Stage", stage)
  checkpoint:SetAttribute("Zone", zone.name)
  checkpoint:SetAttribute("ObstacleRole", "Checkpoint")
  checkpoints[stage] = checkpoint
  checkpointCFrames[stage] = checkpoint.CFrame + Vector3.new(0, 4, 0)

  previousPosition = checkpointPosition
end

local summit = Instance.new("Model")
summit.Name = "SummitLandmark"
summit.Parent = course
local summitPosition = checkpointPositions[STAGE_COUNT]
makeDecorPart("SummitLeft", Vector3.new(3, 18, 3), CFrame.new(summitPosition + Vector3.new(0, 9, -11)), Color3.fromRGB(255, 220, 70), summit, Enum.Material.Neon, 0.05)
makeDecorPart("SummitRight", Vector3.new(3, 18, 3), CFrame.new(summitPosition + Vector3.new(0, 9, 11)), Color3.fromRGB(255, 220, 70), summit, Enum.Material.Neon, 0.05)
local crown = makeDecorPart("SummitCrown", Vector3.new(3, 3, 25), CFrame.new(summitPosition + Vector3.new(0, 18, 0)), Color3.fromRGB(255, 220, 70), summit, Enum.Material.Neon, 0)
addBillboard(crown, "SUMMIT · FINISH", Color3.fromRGB(255, 240, 150))

local killFloor = makePart(
  "KillFloor",
  Vector3.new(560, 2, 190),
  CFrame.new(236, -18, 0),
  Color3.fromRGB(220, 55, 55),
  course,
  Enum.Material.Neon
)
killFloor.Transparency = 0.2
table.insert(hazards, killFloor)

local stateByPlayer = {}

local function playerFromHit(hit)
  if not hit then return nil end
  local character = hit:FindFirstAncestorOfClass("Model")
  if not character then return nil end
  return Players:GetPlayerFromCharacter(character)
end

local function initializeAttributes(player)
  for key, value in pairs(Config.InitialState) do
    player:SetAttribute(key, value)
  end
  player:SetAttribute("Round", 1)
  player:SetAttribute("RoundTime", 0)
  player:SetAttribute("Finished", false)
  player:SetAttribute("Restarting", false)
  player:SetAttribute("LastApprovedScope", "physical-course-ready")
end

local function freshState(player)
  stateByPlayer[player] = {
    stage = 0,
    round = 1,
    started = false,
    roundStartedAt = nil,
    finished = false,
  }
  initializeAttributes(player)
end

local function teleportToSavedCheckpoint(player, character)
  local state = stateByPlayer[player]
  if not state then return end
  local root = character:WaitForChild("HumanoidRootPart", 8)
  if not root then return end
  task.defer(function()
    if root.Parent then
      root.CFrame = checkpointCFrames[state.stage] or checkpointCFrames[0]
    end
  end)
end

local function teleportToRoundStart(player)
  local character = player.Character
  local root = character and character:FindFirstChild("HumanoidRootPart")
  local humanoid = character and character:FindFirstChildOfClass("Humanoid")
  if not root or not humanoid or humanoid.Health <= 0 then return end
  root.CFrame = checkpointCFrames[0]
end

local function resetRoundProgress(player, state)
  state.stage = 0
  state.started = false
  state.roundStartedAt = nil
  state.finished = false
  state.round = state.round + 1

  player:SetAttribute("Round", state.round)
  player:SetAttribute("Position", 0)
  player:SetAttribute("Progress", 0)
  player:SetAttribute("Score", 0)
  player:SetAttribute("RoundTime", 0)
  player:SetAttribute("Finished", false)
  player:SetAttribute("Restarting", false)
  player:SetAttribute("LastApprovedScope", "physical-course-ready")
  teleportToRoundStart(player)
end

local function startRound(player)
  local state = stateByPlayer[player]
  if not state or state.finished or state.started then return end
  state.started = true
  state.roundStartedAt = os.clock()
  player:SetAttribute("LastApprovedScope", "physical-course-started")
end

local function scheduleNextRound(player, finishedState)
  player:SetAttribute("Restarting", true)
  task.delay(RESTART_DELAY, function()
    local state = stateByPlayer[player]
    if state ~= finishedState or not state or not state.finished then return end
    resetRoundProgress(player, state)
  end)
end

local function acceptCheckpoint(player, stage)
  local state = stateByPlayer[player]
  if not state or not state.started or state.finished then return end
  if stage ~= state.stage + 1 then return end

  state.stage = stage
  player:SetAttribute("Position", stage)
  player:SetAttribute("Progress", math.floor(stage / STAGE_COUNT * 100))
  player:SetAttribute("Score", stage * 100)
  player:SetAttribute("LastApprovedScope", string.format("physical-checkpoint-%02d", stage))

  if stage == STAGE_COUNT then
    state.finished = true
    local elapsed = math.max(0, os.clock() - (state.roundStartedAt or os.clock()))
    player:SetAttribute("RoundTime", math.floor(elapsed * 100) / 100)
    player:SetAttribute("Finished", true)
    player:SetAttribute("LastApprovedScope", "physical-course-finished")
    scheduleNextRound(player, state)
  end
end

startSpawn.Touched:Connect(function(hit)
  local player = playerFromHit(hit)
  if player then startRound(player) end
end)

for stage, checkpoint in ipairs(checkpoints) do
  checkpoint.Touched:Connect(function(hit)
    local player = playerFromHit(hit)
    if player then acceptCheckpoint(player, stage) end
  end)
end

local function eliminateFromHazard(hit)
  local character = hit and hit:FindFirstAncestorOfClass("Model")
  local player = character and Players:GetPlayerFromCharacter(character)
  if not player then return end
  local humanoid = character:FindFirstChildOfClass("Humanoid")
  if humanoid and humanoid.Health > 0 then humanoid.Health = 0 end
end

for _, hazard in ipairs(hazards) do
  hazard.Touched:Connect(eliminateFromHazard)
end

local pusherDebounce = setmetatable({}, {__mode = "k"})
for _, pusher in ipairs(pushers) do
  pusher.part.Touched:Connect(function(hit)
    local character = hit and hit:FindFirstAncestorOfClass("Model")
    local player = character and Players:GetPlayerFromCharacter(character)
    if not player or pusherDebounce[character] then return end
    local root = character:FindFirstChild("HumanoidRootPart")
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not root or not humanoid or humanoid.Health <= 0 then return end

    pusherDebounce[character] = true
    root.AssemblyLinearVelocity = root.AssemblyLinearVelocity + pusher.velocity
    task.delay(0.65, function()
      pusherDebounce[character] = nil
    end)
  end)
end

local function bindPlayer(player)
  freshState(player)
  player.CharacterAdded:Connect(function(character)
    teleportToSavedCheckpoint(player, character)
  end)
  if player.Character then teleportToSavedCheckpoint(player, player.Character) end
end

Players.PlayerAdded:Connect(bindPlayer)
for _, player in ipairs(Players:GetPlayers()) do
  task.defer(bindPlayer, player)
end

Players.PlayerRemoving:Connect(function(player)
  stateByPlayer[player] = nil
end)

remote.OnServerEvent:Connect(function(_player, _actionId)
  return
end)

task.spawn(function()
  while course.Parent do
    local now = os.clock()

    for _, mover in ipairs(movers) do
      if mover.part.Parent then
        local wave = math.sin((now / mover.period) * math.pi * 2 + mover.phase)
        mover.part.CFrame = mover.origin + mover.offset * wave
      end
    end

    for _, spinner in ipairs(spinners) do
      if spinner.part.Parent then
        spinner.part.CFrame = spinner.pivot * CFrame.Angles(0, now * spinner.speed + spinner.phase, 0)
      end
    end

    for _, disappearing in ipairs(disappearers) do
      if disappearing.part.Parent then
        local cycle = disappearing.visibleTime + disappearing.hiddenTime
        local cycleTime = (now + disappearing.phase) % cycle
        local visible = cycleTime < disappearing.visibleTime
        if visible ~= disappearing.visible then
          disappearing.visible = visible
          disappearing.part.Transparency = visible and 0 or 0.82
          disappearing.part.CanCollide = visible
          disappearing.part.CanTouch = visible
        end
      end
    end

    task.wait(0.03)
  end
end)

task.spawn(function()
  while true do
    task.wait(0.25)
    local now = os.clock()
    for player, state in pairs(stateByPlayer) do
      if state.started and not state.finished and state.roundStartedAt then
        player:SetAttribute("RoundTime", math.floor((now - state.roundStartedAt) * 10) / 10)
      end
      local character = player.Character
      local root = character and character:FindFirstChild("HumanoidRootPart")
      local humanoid = character and character:FindFirstChildOfClass("Humanoid")
      if root and humanoid and humanoid.Health > 0 and root.Position.Y < FALL_Y then
        humanoid.Health = 0
      end
    end
  end
end)
