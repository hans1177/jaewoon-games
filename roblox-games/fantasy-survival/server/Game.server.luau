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

-- 세계수 내부 · 기존 서버 전투/이동 권한을 사용하는 3D 지역
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")
local treeRegion = workspace:FindFirstChild("WorldTreeInterior")
if treeRegion and not treeRegion:IsA("Model") then treeRegion:Destroy(); treeRegion = nil end
if not treeRegion then
  treeRegion = Instance.new("Model")
  treeRegion.Name = "WorldTreeInterior"
  treeRegion.Parent = workspace
end

local function treePart(name, size, cf, color, material, parent, shape)
  local part = Instance.new("Part")
  part.Name = name
  part.Size = size
  part.CFrame = cf
  part.Color = color
  part.Material = material
  part.Anchored = true
  part.CanCollide = true
  part.TopSurface = Enum.SurfaceType.Smooth
  part.BottomSurface = Enum.SurfaceType.Smooth
  if shape then part.Shape = shape end
  part.Parent = parent or treeRegion
  return part
end

local wood = Color3.fromRGB(84, 61, 43)
local bark = Color3.fromRGB(55, 38, 32)
local moss = Color3.fromRGB(40, 87, 51)
local glow = Color3.fromRGB(112, 212, 137)
local entrance = treePart("WorldTreeTrunk", Vector3.new(20, 40, 20), CFrame.new(93, 21, 0), wood, Enum.Material.Wood, treeRegion, Enum.PartType.Cylinder)
treePart("WorldTreeCanopy", Vector3.new(44, 25, 44), CFrame.new(93, 48, 0), moss, Enum.Material.Grass, treeRegion, Enum.PartType.Ball)
local entranceMark = treePart("WorldTreeDoor", Vector3.new(9, 13, 1), CFrame.new(93, 9, -10.5), bark, Enum.Material.Wood, treeRegion)
entranceMark.CanCollide = false
local entrancePrompt = Instance.new("ProximityPrompt")
entrancePrompt.Name = "EnterWorldTree"
entrancePrompt.ActionText = "들어가기"
entrancePrompt.ObjectText = "세계수 내부"
entrancePrompt.HoldDuration = 0
entrancePrompt.MaxActivationDistance = 12
entrancePrompt.RequiresLineOfSight = false
entrancePrompt.Parent = entranceMark

local interior = Vector3.new(0, 0, -480)
treePart("RootChamberFloor", Vector3.new(170, 3, 170), CFrame.new(interior + Vector3.new(0, 2, 0)), wood, Enum.Material.WoodPlanks)
treePart("RootChamberCeiling", Vector3.new(170, 4, 170), CFrame.new(interior + Vector3.new(0, 49, 0)), bark, Enum.Material.Wood)
for _, wall in ipairs({
  {Vector3.new(170, 50, 5), Vector3.new(0, 26, -85)},
  {Vector3.new(170, 50, 5), Vector3.new(0, 26, 85)},
  {Vector3.new(5, 50, 170), Vector3.new(-85, 26, 0)},
  {Vector3.new(5, 50, 170), Vector3.new(85, 26, 0)}
}) do
  treePart("LivingBarkWall", wall[1], CFrame.new(interior + wall[2]), bark, Enum.Material.Wood)
end
for i = 1, 12 do
  local angle = i * math.pi / 6
  local radius = i % 2 == 0 and 69 or 54
  local x = math.cos(angle) * radius
  local z = math.sin(angle) * radius
  treePart("LivingRootPillar", Vector3.new(8 + i % 3, 47, 8 + i % 3), CFrame.new(interior + Vector3.new(x, 25, z)) * CFrame.Angles(0, angle, 0), wood, Enum.Material.Wood, treeRegion, Enum.PartType.Cylinder)
  local fungus = treePart("GlowingMushroom", Vector3.new(9, 5, 9), CFrame.new(interior + Vector3.new(x + 7, 6, z)), glow, Enum.Material.Neon, treeRegion, Enum.PartType.Ball)
  fungus.CanCollide = false
  local light = Instance.new("PointLight")
  light.Brightness = 1.6
  light.Range = 26
  light.Color = glow
  light.Parent = fungus
end
local exitMark = treePart("InteriorExit", Vector3.new(11, 1, 10), CFrame.new(0, 4.2, -410), glow, Enum.Material.Neon, treeRegion)
exitMark.CanCollide = false
local exitPrompt = Instance.new("ProximityPrompt")
exitPrompt.ActionText = "밖으로 나가기"
exitPrompt.ObjectText = "세계수 지상"
exitPrompt.MaxActivationDistance = 12
exitPrompt.HoldDuration = 0
exitPrompt.Parent = exitMark

local function treeCharacter(player)
  local character = player.Character
  if not character then return nil, nil end
  return character:FindFirstChild("HumanoidRootPart"), character:FindFirstChildOfClass("Humanoid")
end
local function inTreeRoom(root)
  return root and math.abs(root.Position.X) < 82 and root.Position.Z < -397 and root.Position.Z > -563 and root.Position.Y < 55
end
entrancePrompt.Triggered:Connect(function(player)
  local root, humanoid = treeCharacter(player)
  if not root or not humanoid or humanoid.Health <= 0 then return end
  if (root.Position - entranceMark.Position).Magnitude > 16 then return end
  root.CFrame = CFrame.new(0, 9, -418)
  player:SetAttribute("WorldTreeArea", "inside")
end)
exitPrompt.Triggered:Connect(function(player)
  local root, humanoid = treeCharacter(player)
  if not root or not humanoid or humanoid.Health <= 0 or not inTreeRoom(root) then return end
  if (root.Position - exitMark.Position).Magnitude > 16 then return end
  root.CFrame = CFrame.new(93, 6, -23)
  player:SetAttribute("WorldTreeArea", "surface")
end)

-- 몬스터 · 세계수 곰 기존 수치 보존, 중립 골렘은 피격 후 반격
local treeSpecies = {
  {id = "worldtreebear", name = "세계수 곰", hp = 380, damage = 28, speed = 8, radius = 5, neutral = false, tint = Color3.fromRGB(99, 71, 49)},
  {id = "worldtreegolem", name = "세계수 골렘", hp = 586, damage = 48, tier = 3, speed = 5, radius = 6, neutral = true, tint = Color3.fromRGB(88, 112, 75)},
  {id = "worldtreesnake", name = "세계수 뱀", hp = 300, damage = 25, speed = 11, radius = 3, neutral = false, tint = Color3.fromRGB(55, 130, 77)}
}
local treeMobs = {}
local treeSpawnPoints = {Vector3.new(-38, 9, -493), Vector3.new(4, 9, -523), Vector3.new(40, 9, -491)}
local function makeTreeMonster(spec, position)
  local model = Instance.new("Model")
  model.Name = spec.name
  model.Parent = treeRegion
  local body = treePart("Body", Vector3.new(spec.radius * 2, spec.radius * 2, spec.radius * 2), CFrame.new(position), spec.tint, Enum.Material.Slate, model, Enum.PartType.Ball)
  body.CanCollide = false
  model.PrimaryPart = body
  local eye = treePart("Eyes", Vector3.new(spec.radius, 1.3, 1), CFrame.new(position + Vector3.new(0, 1.2, -spec.radius)), glow, Enum.Material.Neon, model)
  eye.CanCollide = false
  local label = Instance.new("BillboardGui")
  label.Size = UDim2.fromOffset(165, 42)
  label.StudsOffsetWorldSpace = Vector3.new(0, spec.radius + 4, 0)
  label.AlwaysOnTop = true
  label.Parent = body
  local text = Instance.new("TextLabel")
  text.Size = UDim2.fromScale(1, 1)
  text.BackgroundTransparency = 1
  text.TextScaled = true
  text.TextStrokeTransparency = 0.2
  text.TextColor3 = Color3.fromRGB(236, 250, 217)
  text.Text = spec.name .. (spec.tier and (" · " .. spec.tier .. "티어") or "") .. (spec.neutral and " · 중립" or "")
  text.Parent = label
  local mob = {type = spec, model = model, body = body, spawn = position, health = spec.hp, hostile = not spec.neutral, hitAt = 0, rootsAt = os.clock(), alive = true, label = text}
  table.insert(treeMobs, mob)
  return mob
end
for i, spec in ipairs(treeSpecies) do makeTreeMonster(spec, treeSpawnPoints[i]) end

local rooted = {}
local function rootPlayer(player, seconds)
  local _, humanoid = treeCharacter(player)
  if not humanoid or humanoid.Health <= 0 then return end
  local current = rooted[player]
  if not current or current.humanoid ~= humanoid then
    current = {humanoid = humanoid, speed = humanoid.WalkSpeed, jump = humanoid.JumpPower, jumpHeight = humanoid.JumpHeight}
    rooted[player] = current
  end
  current.untilAt = os.clock() + seconds
  humanoid.WalkSpeed = 0
  humanoid.JumpPower = 0
  humanoid.JumpHeight = 0
end
local function launchGolemRoots(mob, target)
  local root = treeCharacter(target)
  if not root then return end
  for i = 1, 4 do
    local angle = (i - 1) * math.pi / 2
    local origin = mob.body.Position + Vector3.new(math.cos(angle) * 7, 3, math.sin(angle) * 7)
    local projectile = treePart("ThrownRoot", Vector3.new(2, 9, 2), CFrame.new(origin) * CFrame.Angles(0, angle, math.pi / 2), wood, Enum.Material.Wood, treeRegion, Enum.PartType.Cylinder)
    projectile.CanCollide = false
    projectile.CanTouch = false
    local destination = root.Position + Vector3.new(0, 1, 0)
    local tween = TweenService:Create(projectile, TweenInfo.new(0.65, Enum.EasingStyle.Linear), {Position = destination})
    tween:Play()
    tween.Completed:Connect(function()
      local targetRoot, targetHumanoid = treeCharacter(target)
      if targetRoot and targetHumanoid and targetHumanoid.Health > 0 and inTreeRoom(targetRoot) and (targetRoot.Position - destination).Magnitude < 5.5 then
        rootPlayer(target, 3) -- 뿌리 공격은 피해 없이 3초 이동만 봉쇄
      end
      projectile:Destroy()
    end)
    Debris:AddItem(projectile, 1.4)
  end
end
local function attackTreeMonster(player)
  local root, humanoid = treeCharacter(player)
  if not root or not humanoid or humanoid.Health <= 0 or not inTreeRoom(root) then return end
  local now = os.clock()
  if now - (player:GetAttribute("WorldTreeAttackAt") or -100) < 0.6 then return end
  local target, nearest = nil, 20
  for _, mob in ipairs(treeMobs) do
    if mob.alive then
      local d = (mob.body.Position - root.Position).Magnitude
      if d < nearest then target = mob; nearest = d end
    end
  end
  if not target then return end
  player:SetAttribute("WorldTreeAttackAt", now)
  target.hostile = true
  target.health = math.max(0, target.health - 12) -- 기존 기본 전투의 12 피해 수치 사용
  target.label.Text = target.type.name .. " · " .. target.health .. "/" .. target.type.hp
  if target.health <= 0 then
    target.alive = false
    target.model:Destroy()
    task.delay(60, function()
      if not treeRegion.Parent then return end
      local replacement = makeTreeMonster(target.type, target.spawn)
      for i, mob in ipairs(treeMobs) do
        if mob == target then table.remove(treeMobs, i); break end
      end
    end)
  end
end
-- 기존 GameAction 검증/속도 제한 아래에서만 전투 요청 처리
local treeTick = 0
RunService.Heartbeat:Connect(function(dt)
  treeTick += dt
  if treeTick < 0.12 then return end
  local delta = math.min(treeTick, 0.24)
  treeTick = 0
  local now = os.clock()
  for player, state in pairs(rooted) do
    if now >= (state.untilAt or 0) or not state.humanoid.Parent then
      if state.humanoid.Parent then
        state.humanoid.WalkSpeed = state.speed
        state.humanoid.JumpPower = state.jump
        state.humanoid.JumpHeight = state.jumpHeight
      end
      rooted[player] = nil
    end
  end
  local visitors = {}
  for _, player in ipairs(Players:GetPlayers()) do
    local root, humanoid = treeCharacter(player)
    if inTreeRoom(root) and humanoid and humanoid.Health > 0 then
      visitors[#visitors + 1] = {player = player, root = root, humanoid = humanoid}
    elseif player:GetAttribute("WorldTreeArea") == "inside" then
      player:SetAttribute("WorldTreeArea", "surface")
    end
  end
  if #visitors == 0 then return end
  for _, mob in ipairs(treeMobs) do
    if mob.alive then
      local nearest, distance = nil, 105
      for _, visitor in ipairs(visitors) do
        local d = (visitor.root.Position - mob.body.Position).Magnitude
        if d < distance then nearest, distance = visitor, d end
      end
      if mob.hostile and nearest then
        if distance > mob.type.radius + 5 then
          local direction = nearest.root.Position - mob.body.Position
          local flat = Vector3.new(direction.X, 0, direction.Z)
          if flat.Magnitude > 0.1 then
            local dest = mob.body.Position + flat.Unit * math.min(mob.type.speed * delta, math.max(0, flat.Magnitude - mob.type.radius - 4))
            dest = Vector3.new(math.clamp(dest.X, -74, 74), mob.spawn.Y, math.clamp(dest.Z, -550, -413))
            mob.model:PivotTo(CFrame.new(dest))
          end
        elseif now - mob.hitAt > 1.5 then
          mob.hitAt = now
          nearest.humanoid:TakeDamage(mob.type.damage)
          setNumber(nearest.player, "Health", nearest.humanoid.Health)
        end
        if mob.type.id == "worldtreegolem" and distance < 85 and now - mob.rootsAt >= 2 then
          mob.rootsAt = now
          if math.random() < 0.5 then launchGolemRoots(mob, nearest.player) end
        end
      end
    end
  end
end)

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
remote.OnServerEvent:Connect(function(player, actionId)
  if typeof(actionId) ~= "string" then return end
  local handler = handlers[actionId]
  if actionId == "worldtree-attack" then handler = attackTreeMonster end
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
  rooted[player] = nil
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
