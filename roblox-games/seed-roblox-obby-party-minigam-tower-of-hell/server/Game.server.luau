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
local START_POSITION = Vector3.new(0, 7, 0)

local oldCourse = Workspace:FindFirstChild(COURSE_NAME)
if oldCourse then oldCourse:Destroy() end

local course = Instance.new("Model")
course.Name = COURSE_NAME
course.Parent = Workspace

local function makePart(name, size, cframe, color, parent)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.CFrame = cframe
  part.Anchored = true
  part.CanCollide = true
  part.CanTouch = true
  part.Material = Enum.Material.SmoothPlastic
  part.Color = color
  part.Parent = parent or course
  return part
end

local startSpawn = Instance.new("SpawnLocation")
startSpawn.Name = "CourseStart"
startSpawn.Size = Vector3.new(18, 1, 18)
startSpawn.CFrame = CFrame.new(START_POSITION)
startSpawn.Anchored = true
startSpawn.Neutral = true
startSpawn.CanCollide = true
startSpawn.CanTouch = true
startSpawn.Material = Enum.Material.Neon
startSpawn.Color = Color3.fromRGB(80, 220, 120)
startSpawn.Parent = course

local checkpointCFrames = {[0] = startSpawn.CFrame + Vector3.new(0, 4, 0)}
local checkpoints = {}
local hazards = {}
local previousPosition = START_POSITION

for stage = 1, STAGE_COUNT do
  local x = stage * 30
  local z = (stage % 2 == 0) and 14 or -14
  local y = 8 + math.floor((stage - 1) / 4) * 5
  local checkpointPosition = Vector3.new(x, y, z)
  local segment = checkpointPosition - previousPosition
  local stepAPosition = previousPosition + segment * (1 / 3)
  local stepBPosition = previousPosition + segment * (2 / 3)

  makePart(
    string.format("Step%02dA", stage),
    Vector3.new(8, 1, 8),
    CFrame.new(stepAPosition),
    Color3.fromRGB(195, 205, 220)
  )
  makePart(
    string.format("Step%02dB", stage),
    Vector3.new(8, 1, 8),
    CFrame.new(stepBPosition),
    Color3.fromRGB(165, 180, 205)
  )

  local checkpoint = makePart(
    string.format("Checkpoint%02d", stage),
    Vector3.new(14, 1, 14),
    CFrame.new(checkpointPosition),
    stage == STAGE_COUNT and Color3.fromRGB(255, 220, 70) or Color3.fromRGB(70, 170, 255)
  )
  checkpoint:SetAttribute("Stage", stage)
  checkpoints[stage] = checkpoint
  checkpointCFrames[stage] = checkpoint.CFrame + Vector3.new(0, 4, 0)

  local hazardPosition = previousPosition + segment * 0.5 + Vector3.new(0, -4, 0)
  local hazard = makePart(
    string.format("Hazard%02d", stage),
    Vector3.new(8, 1, 8),
    CFrame.new(hazardPosition),
    Color3.fromRGB(235, 70, 70)
  )
  hazard.Material = Enum.Material.Neon
  table.insert(hazards, hazard)

  previousPosition = checkpointPosition
end

local killFloor = makePart(
  "KillFloor",
  Vector3.new(STAGE_COUNT * 34 + 80, 2, 120),
  CFrame.new(STAGE_COUNT * 15, -18, 0),
  Color3.fromRGB(220, 55, 55)
)
killFloor.Material = Enum.Material.Neon
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
  player:SetAttribute("RoundTime", 0)
  player:SetAttribute("Finished", false)
  player:SetAttribute("LastApprovedScope", "physical-course-ready")
end

local function freshState(player)
  stateByPlayer[player] = {
    stage = 0,
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

local function startRound(player)
  local state = stateByPlayer[player]
  if not state or state.finished or state.started then return end
  state.started = true
  state.roundStartedAt = os.clock()
  player:SetAttribute("LastApprovedScope", "physical-course-started")
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
