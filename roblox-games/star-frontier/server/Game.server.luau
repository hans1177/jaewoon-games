-- 파일명: roblox-games/star-frontier/server/Game.server.luau
-- 역할: 별길 개척자 서버 권한 게임 로직

-- =========================================================
-- 서비스 / 설정
-- =========================================================
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local store = DataStoreService:GetDataStore(Config.SaveStoreName)

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

-- =========================================================
-- 월드 컨테이너
-- =========================================================
local worldRoot = Workspace:FindFirstChild("StarFrontierWorld")
if worldRoot then
    worldRoot:Destroy()
end
worldRoot = Instance.new("Folder")
worldRoot.Name = "StarFrontierWorld"
worldRoot.Parent = Workspace

local asteroidFolder = Instance.new("Folder")
asteroidFolder.Name = "Asteroids"
asteroidFolder.Parent = worldRoot

local droneFolder = Instance.new("Folder")
droneFolder.Name = "Drones"
droneFolder.Parent = worldRoot

local shipFolder = Instance.new("Folder")
shipFolder.Name = "PlayerShips"
shipFolder.Parent = worldRoot

local stationFolder = Instance.new("Folder")
stationFolder.Name = "Stations"
stationFolder.Parent = worldRoot

local gateFolder = Instance.new("Folder")
gateFolder.Name = "WarpGates"
gateFolder.Parent = worldRoot

local effectFolder = Instance.new("Folder")
effectFolder.Name = "Effects"
effectFolder.Parent = worldRoot

local rng = Random.new(240924)
local playerStates = {}
local lastActionAt = {}
local gates = {}
local shuttingDown = false

-- =========================================================
-- 공통 유틸
-- =========================================================
local function clampInt(value, minimum, maximum)
    if typeof(value) ~= "number" then
        return minimum
    end
    return math.clamp(math.floor(value), minimum, maximum)
end

local function setNumber(player, name, value)
    if player and typeof(value) == "number" then
        player:SetAttribute(name, math.floor(value + 0.5))
    end
end

local function makePart(parent, name, size, color, material, cframe, shape)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.Color = color
    part.Material = material
    part.Anchored = true
    part.CanCollide = false
    part.CanTouch = false
    part.CanQuery = true
    part.CastShadow = false
    if shape then
        part.Shape = shape
    end
    part.CFrame = cframe
    part.Parent = parent
    return part
end

local function makeBillboard(parent, titleText, color)
    local gui = Instance.new("BillboardGui")
    gui.Name = "Label"
    gui.Size = UDim2.fromOffset(150, 32)
    gui.StudsOffset = Vector3.new(0, 5, 0)
    gui.AlwaysOnTop = true
    gui.MaxDistance = 260
    gui.Parent = parent

    local label = Instance.new("TextLabel")
    label.Size = UDim2.fromScale(1, 1)
    label.BackgroundTransparency = 0.25
    label.BackgroundColor3 = Color3.fromRGB(7, 12, 24)
    label.TextColor3 = color
    label.TextScaled = true
    label.Font = Enum.Font.GothamBold
    label.Text = titleText
    label.Parent = gui
    return label
end

local function emitBeam(fromPosition, toPosition, color, thickness)
    local distance = (toPosition - fromPosition).Magnitude
    if distance < 0.1 then
        return
    end
    local beam = makePart(
        effectFolder,
        "Beam",
        Vector3.new(thickness, thickness, distance),
        color,
        Enum.Material.Neon,
        CFrame.lookAt((fromPosition + toPosition) * 0.5, toPosition)
    )
    beam.Transparency = 0.08
    local tween = TweenService:Create(beam, TweenInfo.new(0.16), {Transparency = 1})
    tween:Play()
    tween.Completed:Connect(function()
        if beam.Parent then
            beam:Destroy()
        end
    end)
end

local function emitPulse(position, color, startSize)
    local pulse = makePart(
        effectFolder,
        "Pulse",
        Vector3.new(startSize, startSize, startSize),
        color,
        Enum.Material.Neon,
        CFrame.new(position),
        Enum.PartType.Ball
    )
    pulse.Transparency = 0.2
    local tween = TweenService:Create(
        pulse,
        TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
        {
            Size = Vector3.new(startSize * 3, startSize * 3, startSize * 3),
            Transparency = 1,
        }
    )
    tween:Play()
    tween.Completed:Connect(function()
        if pulse.Parent then
            pulse:Destroy()
        end
    end)
end

local function notice(player, message)
    remote:FireClient(player, "NOTICE", tostring(message))
end

local function sectorCenter(sector)
    return Config.World.SectorCenters[math.clamp(sector, 1, #Config.World.SectorCenters)]
end

local function cargoCapacity(shipTier)
    return Config.Mining.CargoBase + math.max(0, shipTier - 1) * Config.Mining.CargoPerShipTier
end

local function hullMaximum(shipTier)
    return Config.Ship.BaseHull + math.max(0, shipTier - 1) * Config.Ship.HullPerTier
end

local function syncDerivedAttributes(player, state)
    setNumber(player, "Credits", state.credits)
    setNumber(player, "Ore", state.ore)
    setNumber(player, "ShipTier", state.shipTier)
    setNumber(player, "LaserLevel", state.laserLevel)
    setNumber(player, "Sector", state.sector)
    setNumber(player, "Hull", state.hull)
    setNumber(player, "HullMax", hullMaximum(state.shipTier))
    setNumber(player, "Energy", state.energy)
    setNumber(player, "CargoCapacity", cargoCapacity(state.shipTier))
    player:SetAttribute("SectorName", Config.World.SectorNames[state.sector] or "미확인 성역")
end

local function checkCooldown(player, action)
    local cooldown = Config.ActionCooldowns[action]
    if typeof(cooldown) ~= "number" then
        return false
    end
    local now = os.clock()
    local bucket = lastActionAt[player]
    if not bucket then
        bucket = {}
        lastActionAt[player] = bucket
    end
    local previous = bucket[action] or 0
    if now - previous < cooldown then
        return false
    end
    bucket[action] = now
    return true
end

local function clampWorldPosition(position)
    local bound = Config.World.Bounds
    return Vector3.new(
        math.clamp(position.X, -bound, bound),
        math.clamp(position.Y, -120, bound),
        math.clamp(position.Z, -bound, bound)
    )
end

-- =========================================================
-- 배경 / 공간 구조
-- =========================================================
local function configureLighting()
    Lighting.ClockTime = 0
    Lighting.Brightness = 1.2
    Lighting.Ambient = Color3.fromRGB(35, 45, 75)
    Lighting.OutdoorAmbient = Color3.fromRGB(10, 18, 40)
    Lighting.EnvironmentDiffuseScale = 0.25
    Lighting.EnvironmentSpecularScale = 0.65

    local bloom = Lighting:FindFirstChild("StarFrontierBloom")
    if not bloom then
        bloom = Instance.new("BloomEffect")
        bloom.Name = "StarFrontierBloom"
        bloom.Intensity = 0.65
        bloom.Size = 28
        bloom.Threshold = 1.4
        bloom.Parent = Lighting
    end

    local atmosphere = Lighting:FindFirstChild("StarFrontierAtmosphere")
    if not atmosphere then
        atmosphere = Instance.new("Atmosphere")
        atmosphere.Name = "StarFrontierAtmosphere"
        atmosphere.Density = 0.1
        atmosphere.Offset = 0.1
        atmosphere.Color = Color3.fromRGB(120, 145, 190)
        atmosphere.Decay = Color3.fromRGB(20, 30, 65)
        atmosphere.Glare = 0.15
        atmosphere.Haze = 0.45
        atmosphere.Parent = Lighting
    end
end

local function createStation()
    local center = sectorCenter(1)
    local model = Instance.new("Model")
    model.Name = "개척자 정거장"
    model.Parent = stationFolder

    local core = makePart(
        model,
        "Core",
        Vector3.new(42, 18, 42),
        Color3.fromRGB(52, 72, 102),
        Enum.Material.Metal,
        CFrame.new(center)
    )
    model.PrimaryPart = core

    local ring = makePart(
        model,
        "DockRing",
        Vector3.new(5, 76, 76),
        Color3.fromRGB(78, 220, 255),
        Enum.Material.Neon,
        CFrame.new(center) * CFrame.Angles(0, 0, math.rad(90)),
        Enum.PartType.Cylinder
    )
    ring.Transparency = 0.35

    local top = makePart(
        model,
        "Beacon",
        Vector3.new(9, 28, 9),
        Color3.fromRGB(255, 215, 90),
        Enum.Material.Neon,
        CFrame.new(center + Vector3.new(0, 23, 0))
    )
    makeBillboard(top, "개척자 정거장 · 판매 / 업그레이드", Color3.fromRGB(255, 238, 170))
end

local function createGate(fromSector, toSector, position, label)
    local gate = makePart(
        gateFolder,
        string.format("Gate_%d_%d", fromSector, toSector),
        Vector3.new(7, 58, 58),
        Color3.fromRGB(145, 88, 255),
        Enum.Material.Neon,
        CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90)),
        Enum.PartType.Cylinder
    )
    gate.Transparency = 0.25
    gate:SetAttribute("FromSector", fromSector)
    gate:SetAttribute("ToSector", toSector)
    makeBillboard(gate, label, Color3.fromRGB(213, 190, 255))
    table.insert(gates, gate)
end

local function buildWarpNetwork()
    local s1 = sectorCenter(1)
    local s2 = sectorCenter(2)
    local s3 = sectorCenter(3)
    createGate(1, 2, s1 + Vector3.new(285, 15, -40), "워프 → 적동 운석대")
    createGate(2, 1, s2 + Vector3.new(-285, -15, 40), "워프 → 청람 성역")
    createGate(2, 3, s2 + Vector3.new(280, 20, 70), "워프 → 유령 성운")
    createGate(3, 2, s3 + Vector3.new(280, -20, -70), "워프 → 적동 운석대")
end

local function asteroidPosition(sector)
    local center = sectorCenter(sector)
    local radius = rng:NextNumber(120, 390)
    local angle = rng:NextNumber(0, math.pi * 2)
    return center + Vector3.new(
        math.cos(angle) * radius,
        rng:NextNumber(-120, 150),
        math.sin(angle) * radius
    )
end

local function createAsteroid(sector, index)
    local size = rng:NextNumber(12, 30)
    local palette = {
        Color3.fromRGB(108, 116, 132),
        Color3.fromRGB(126, 102, 82),
        Color3.fromRGB(82, 112, 125),
    }
    local color = palette[((sector + index) % #palette) + 1]
    local asteroid = makePart(
        asteroidFolder,
        string.format("Asteroid_%d_%d", sector, index),
        Vector3.new(size, size, size),
        color,
        Enum.Material.Slate,
        CFrame.new(asteroidPosition(sector)) * CFrame.Angles(
            rng:NextNumber(0, math.pi),
            rng:NextNumber(0, math.pi),
            rng:NextNumber(0, math.pi)
        ),
        Enum.PartType.Ball
    )
    local maxHp = math.floor(55 + size * 2.2 + sector * 28)
    local oreValue = math.max(2, math.floor(size / 5) + sector)
    asteroid:SetAttribute("Sector", sector)
    asteroid:SetAttribute("MaxHP", maxHp)
    asteroid:SetAttribute("HP", maxHp)
    asteroid:SetAttribute("OreValue", oreValue)
    local label = makeBillboard(asteroid, string.format("운석 · 광석 %d", oreValue), Color3.fromRGB(170, 235, 255))
    label.Name = "AsteroidLabel"
    return asteroid
end

local function spawnAsteroids()
    for sector = 1, #Config.World.SectorCenters do
        for index = 1, Config.World.AsteroidCountPerSector do
            createAsteroid(sector, index)
        end
    end
end

local function droneSpawnPosition(sector)
    local center = sectorCenter(sector)
    local radius = rng:NextNumber(170, 340)
    local angle = rng:NextNumber(0, math.pi * 2)
    return center + Vector3.new(
        math.cos(angle) * radius,
        rng:NextNumber(-70, 110),
        math.sin(angle) * radius
    )
end

local function createDrone(sector, index)
    local model = Instance.new("Model")
    model.Name = string.format("PirateDrone_%d_%d", sector, index)
    model:SetAttribute("Sector", sector)
    model:SetAttribute("MaxHP", 65 + sector * 35)
    model:SetAttribute("HP", 65 + sector * 35)
    model:SetAttribute("LastAttack", 0)
    model.Parent = droneFolder

    local spawnPosition = droneSpawnPosition(sector)
    local core = makePart(
        model,
        "Core",
        Vector3.new(8, 5, 12),
        Color3.fromRGB(174, 49 + sector * 12, 72),
        Enum.Material.Metal,
        CFrame.new(spawnPosition)
    )
    model.PrimaryPart = core

    local wingLeft = makePart(
        model,
        "WingLeft",
        Vector3.new(10, 1.2, 5),
        Color3.fromRGB(64, 54, 76),
        Enum.Material.Metal,
        CFrame.new(spawnPosition + Vector3.new(-8, 0, 1))
    )
    local wingRight = makePart(
        model,
        "WingRight",
        Vector3.new(10, 1.2, 5),
        Color3.fromRGB(64, 54, 76),
        Enum.Material.Metal,
        CFrame.new(spawnPosition + Vector3.new(8, 0, 1))
    )
    wingLeft:SetAttribute("Decoration", true)
    wingRight:SetAttribute("Decoration", true)

    local eye = makePart(
        model,
        "Eye",
        Vector3.new(3, 2, 2),
        Color3.fromRGB(255, 74, 74),
        Enum.Material.Neon,
        CFrame.new(spawnPosition + Vector3.new(0, 0, -6.5))
    )
    eye:SetAttribute("Decoration", true)

    makeBillboard(core, string.format("해적 드론 T%d", sector), Color3.fromRGB(255, 140, 140))
    return model
end

local function spawnDrones()
    for sector = 1, #Config.World.SectorCenters do
        for index = 1, Config.World.DroneCountPerSector do
            createDrone(sector, index)
        end
    end
end

-- =========================================================
-- 플레이어 우주선 / 저장
-- =========================================================
local function createPlayerShip(player)
    local model = Instance.new("Model")
    model.Name = tostring(player.UserId)
    model:SetAttribute("OwnerUserId", player.UserId)
    model.Parent = shipFolder

    local center = sectorCenter(1) + Vector3.new(rng:NextNumber(-24, 24), 0, rng:NextNumber(70, 105))
    local hull = makePart(
        model,
        "Hull",
        Vector3.new(8, 4, 15),
        Color3.fromRGB(80, 150, 230),
        Enum.Material.Metal,
        CFrame.lookAt(center, center + Vector3.new(0, 0, -1))
    )
    model.PrimaryPart = hull

    makePart(
        model,
        "Cockpit",
        Vector3.new(4, 3, 5),
        Color3.fromRGB(75, 230, 255),
        Enum.Material.Glass,
        hull.CFrame * CFrame.new(0, 2.2, -2)
    ).Transparency = 0.2

    makePart(
        model,
        "WingLeft",
        Vector3.new(8, 1, 5),
        Color3.fromRGB(45, 72, 112),
        Enum.Material.Metal,
        hull.CFrame * CFrame.new(-7, -0.8, 2)
    )
    makePart(
        model,
        "WingRight",
        Vector3.new(8, 1, 5),
        Color3.fromRGB(45, 72, 112),
        Enum.Material.Metal,
        hull.CFrame * CFrame.new(7, -0.8, 2)
    )
    makePart(
        model,
        "EngineGlow",
        Vector3.new(3.2, 2.4, 1.2),
        Color3.fromRGB(92, 205, 255),
        Enum.Material.Neon,
        hull.CFrame * CFrame.new(0, 0, 8)
    )
    makeBillboard(hull, player.DisplayName, Color3.fromRGB(210, 240, 255))
    return model
end

local function lockCharacterToShip(player)
    local character = player.Character
    local state = playerStates[player]
    if not character or not state or not state.ship or not state.ship.PrimaryPart then
        return
    end
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.PlatformStand = true
        humanoid.AutoRotate = false
    end
    local root = character:FindFirstChild("HumanoidRootPart")
    if root then
        root.Anchored = true
    end
    for _, descendant in ipairs(character:GetDescendants()) do
        if descendant:IsA("BasePart") then
            descendant.CanCollide = false
            descendant.CanTouch = false
            descendant.CastShadow = false
            descendant.Transparency = 1
        elseif descendant:IsA("Decal") then
            descendant.Transparency = 1
        end
    end
    character:PivotTo(state.ship.PrimaryPart.CFrame)
end

local function loadPlayerState(player)
    local state = {
        credits = Config.InitialState.Credits,
        ore = Config.InitialState.Ore,
        shipTier = Config.InitialState.ShipTier,
        laserLevel = Config.InitialState.LaserLevel,
        sector = Config.InitialState.Sector,
        hull = hullMaximum(Config.InitialState.ShipTier),
        energy = Config.Ship.MaxEnergy,
        throttle = 0,
        turn = 0,
        vertical = 0,
        boost = false,
        yaw = 0,
        gateCooldownUntil = 0,
    }

    if Config.SaveEnabled then
        local ok, saved = pcall(function()
            return store:GetAsync("player:" .. player.UserId)
        end)
        if ok and typeof(saved) == "table" then
            state.credits = clampInt(saved.Credits, 0, 100000000)
            state.ore = clampInt(saved.Ore, 0, 100000)
            state.shipTier = clampInt(saved.ShipTier, 1, #Config.Economy.ShipUpgradeCosts + 1)
            state.laserLevel = clampInt(saved.LaserLevel, 1, #Config.Economy.LaserUpgradeCosts + 1)
            state.sector = clampInt(saved.Sector, 1, #Config.World.SectorCenters)
            state.hull = hullMaximum(state.shipTier)
        end
    end

    state.ship = createPlayerShip(player)
    playerStates[player] = state
    syncDerivedAttributes(player, state)
    player:SetAttribute("Docked", false)
    player:SetAttribute("GameReady", true)

    local spawnAt = sectorCenter(state.sector) + Vector3.new(0, 0, 92)
    state.ship:PivotTo(CFrame.lookAt(spawnAt, sectorCenter(state.sector)))
    task.defer(function()
        lockCharacterToShip(player)
    end)
end

local function snapshotPlayer(state)
    return {
        Credits = state.credits,
        Ore = state.ore,
        ShipTier = state.shipTier,
        LaserLevel = state.laserLevel,
        Sector = state.sector,
    }
end

local function savePlayer(player)
    if not Config.SaveEnabled then
        return
    end
    local state = playerStates[player]
    if not state then
        return
    end
    local snapshot = snapshotPlayer(state)
    pcall(function()
        store:UpdateAsync("player:" .. player.UserId, function()
            return snapshot
        end)
    end)
end

local function rescuePlayer(player, state)
    state.hull = hullMaximum(state.shipTier)
    state.energy = Config.Ship.MaxEnergy
    state.sector = 1
    state.throttle = 0
    state.turn = 0
    state.vertical = 0
    state.boost = false
    local spawnAt = sectorCenter(1) + Vector3.new(0, 0, 95)
    if state.ship and state.ship.Parent then
        state.ship:PivotTo(CFrame.lookAt(spawnAt, sectorCenter(1)))
    end
    syncDerivedAttributes(player, state)
    notice(player, "우주선이 파괴돼 구조선이 정거장으로 회수했어. 화물은 보존됐어.")
end

-- =========================================================
-- 타깃 탐색 / 핵심 액션
-- =========================================================
local function nearestAsteroid(state)
    if not state.ship or not state.ship.PrimaryPart then
        return nil, math.huge
    end
    local origin = state.ship.PrimaryPart.Position
    local best = nil
    local bestDistance = Config.Mining.Range + 0.001
    for _, asteroid in ipairs(asteroidFolder:GetChildren()) do
        if asteroid:IsA("BasePart") and asteroid:GetAttribute("Sector") == state.sector then
            local distance = (asteroid.Position - origin).Magnitude
            if distance < bestDistance then
                best = asteroid
                bestDistance = distance
            end
        end
    end
    return best, bestDistance
end

local function nearestDrone(state)
    if not state.ship or not state.ship.PrimaryPart then
        return nil, math.huge
    end
    local origin = state.ship.PrimaryPart.Position
    local best = nil
    local bestDistance = Config.Combat.LaserRange + 0.001
    for _, drone in ipairs(droneFolder:GetChildren()) do
        if drone:IsA("Model") and drone.PrimaryPart and drone:GetAttribute("Sector") == state.sector then
            local distance = (drone.PrimaryPart.Position - origin).Magnitude
            if distance < bestDistance then
                best = drone
                bestDistance = distance
            end
        end
    end
    return best, bestDistance
end

local function scheduleAsteroidRespawn(sector, index)
    task.delay(Config.World.AsteroidRespawnSeconds, function()
        if not shuttingDown and worldRoot.Parent then
            createAsteroid(sector, index)
        end
    end)
end

local function scheduleDroneRespawn(sector, index)
    task.delay(Config.World.DroneRespawnSeconds, function()
        if not shuttingDown and worldRoot.Parent then
            createDrone(sector, index)
        end
    end)
end

local function mine(player, state)
    local capacity = cargoCapacity(state.shipTier)
    if state.ore >= capacity then
        notice(player, "화물칸이 가득 찼어. 정거장으로 가서 광석을 판매해.")
        return
    end
    local asteroid = nearestAsteroid(state)
    if not asteroid then
        notice(player, "채굴 범위 안에 운석이 없어.")
        return
    end
    local hp = asteroid:GetAttribute("HP") or 1
    local damage = Config.Mining.BaseDamage + (state.shipTier - 1) * 5
    hp = math.max(0, hp - damage)
    asteroid:SetAttribute("HP", hp)
    emitBeam(state.ship.PrimaryPart.Position, asteroid.Position, Color3.fromRGB(92, 225, 255), 0.8)
    emitPulse(asteroid.Position, Color3.fromRGB(110, 225, 255), 2)

    if hp <= 0 then
        local oreValue = clampInt(asteroid:GetAttribute("OreValue"), 1, 100)
        local gain = math.min(oreValue, capacity - state.ore)
        state.ore += gain
        local sector = clampInt(asteroid:GetAttribute("Sector"), 1, #Config.World.SectorCenters)
        local index = tonumber(string.match(asteroid.Name, "_(%d+)$")) or rng:NextInteger(1000, 9999)
        local position = asteroid.Position
        asteroid:Destroy()
        emitPulse(position, Color3.fromRGB(210, 238, 255), 5)
        scheduleAsteroidRespawn(sector, index)
        syncDerivedAttributes(player, state)
        notice(player, string.format("광석 +%d", gain))
    end
end

local function fireLaser(player, state)
    local drone = nearestDrone(state)
    if not drone or not drone.PrimaryPart then
        notice(player, "레이저 사거리 안에 해적 드론이 없어.")
        return
    end
    local hp = drone:GetAttribute("HP") or 1
    local damage = Config.Combat.LaserBaseDamage + (state.laserLevel - 1) * Config.Combat.LaserDamagePerLevel
    hp = math.max(0, hp - damage)
    drone:SetAttribute("HP", hp)
    emitBeam(state.ship.PrimaryPart.Position, drone.PrimaryPart.Position, Color3.fromRGB(255, 96, 135), 1.0)
    emitPulse(drone.PrimaryPart.Position, Color3.fromRGB(255, 92, 110), 2)

    if hp <= 0 then
        local sector = clampInt(drone:GetAttribute("Sector"), 1, #Config.World.SectorCenters)
        local reward = Config.Economy.DroneCreditReward[sector] or 10
        local index = tonumber(string.match(drone.Name, "_(%d+)$")) or rng:NextInteger(1000, 9999)
        local position = drone.PrimaryPart.Position
        drone:Destroy()
        state.credits += reward
        syncDerivedAttributes(player, state)
        emitPulse(position, Color3.fromRGB(255, 170, 95), 6)
        scheduleDroneRespawn(sector, index)
        notice(player, string.format("해적 드론 격파 · 크레딧 +%d", reward))
    end
end

local function sellOre(player, state)
    if not player:GetAttribute("Docked") then
        notice(player, "정거장 도킹 범위에서만 판매할 수 있어.")
        return
    end
    if state.ore <= 0 then
        notice(player, "판매할 광석이 없어.")
        return
    end
    local earned = state.ore * Config.Economy.OreSellPrice
    state.credits += earned
    state.ore = 0
    syncDerivedAttributes(player, state)
    notice(player, string.format("광석 판매 완료 · 크레딧 +%d", earned))
end

local function upgradeShip(player, state)
    if not player:GetAttribute("Docked") then
        notice(player, "정거장에 도킹해야 우주선을 업그레이드할 수 있어.")
        return
    end
    local cost = Config.Economy.ShipUpgradeCosts[state.shipTier]
    if not cost then
        notice(player, "우주선이 현재 최고 티어야.")
        return
    end
    if state.credits < cost then
        notice(player, string.format("우주선 업그레이드에 크레딧 %d가 필요해.", cost))
        return
    end
    state.credits -= cost
    state.shipTier += 1
    state.hull = hullMaximum(state.shipTier)
    syncDerivedAttributes(player, state)
    notice(player, string.format("우주선 T%d 업그레이드 완료 · 속도/선체/화물칸 강화", state.shipTier))
end

local function upgradeLaser(player, state)
    if not player:GetAttribute("Docked") then
        notice(player, "정거장에 도킹해야 레이저를 업그레이드할 수 있어.")
        return
    end
    local cost = Config.Economy.LaserUpgradeCosts[state.laserLevel]
    if not cost then
        notice(player, "레이저가 현재 최고 레벨이야.")
        return
    end
    if state.credits < cost then
        notice(player, string.format("레이저 업그레이드에 크레딧 %d가 필요해.", cost))
        return
    end
    state.credits -= cost
    state.laserLevel += 1
    syncDerivedAttributes(player, state)
    notice(player, string.format("레이저 Lv.%d 업그레이드 완료", state.laserLevel))
end

local function repairShip(player, state)
    if not player:GetAttribute("Docked") then
        notice(player, "정거장에 도킹해야 수리할 수 있어.")
        return
    end
    local maximum = hullMaximum(state.shipTier)
    if state.hull >= maximum then
        notice(player, "선체가 이미 완전한 상태야.")
        return
    end
    if state.credits < Config.Economy.RepairCost then
        notice(player, string.format("수리에 크레딧 %d가 필요해.", Config.Economy.RepairCost))
        return
    end
    state.credits -= Config.Economy.RepairCost
    state.hull = maximum
    syncDerivedAttributes(player, state)
    notice(player, "선체 수리 완료")
end

-- =========================================================
-- 워프 / 적 AI / 이동
-- =========================================================
local function checkGate(player, state)
    if not state.ship or not state.ship.PrimaryPart or os.clock() < state.gateCooldownUntil then
        return
    end
    local position = state.ship.PrimaryPart.Position
    for _, gate in ipairs(gates) do
        if gate.Parent and gate:GetAttribute("FromSector") == state.sector then
            if (gate.Position - position).Magnitude <= 34 then
                local targetSector = clampInt(gate:GetAttribute("ToSector"), 1, #Config.World.SectorCenters)
                local target = sectorCenter(targetSector) + Vector3.new(0, 0, 105)
                state.sector = targetSector
                state.gateCooldownUntil = os.clock() + 2.2
                state.throttle = 0
                state.turn = 0
                state.vertical = 0
                state.ship:PivotTo(CFrame.lookAt(target, sectorCenter(targetSector)))
                syncDerivedAttributes(player, state)
                emitPulse(target, Color3.fromRGB(176, 110, 255), 8)
                notice(player, string.format("워프 완료 · %s", Config.World.SectorNames[targetSector]))
                return
            end
        end
    end
end

local function nearestPlayerStateForDrone(drone)
    if not drone.PrimaryPart then
        return nil, nil, math.huge
    end
    local sector = drone:GetAttribute("Sector")
    local bestPlayer = nil
    local bestState = nil
    local bestDistance = math.huge
    for player, state in pairs(playerStates) do
        if player.Parent == Players and state.sector == sector and state.ship and state.ship.PrimaryPart then
            local distance = (state.ship.PrimaryPart.Position - drone.PrimaryPart.Position).Magnitude
            if distance < bestDistance then
                bestDistance = distance
                bestPlayer = player
                bestState = state
            end
        end
    end
    return bestPlayer, bestState, bestDistance
end

local function updateDrones(step)
    local now = os.clock()
    for _, drone in ipairs(droneFolder:GetChildren()) do
        if drone:IsA("Model") and drone.PrimaryPart then
            local player, state, distance = nearestPlayerStateForDrone(drone)
            if player and state and state.ship and state.ship.PrimaryPart then
                local origin = drone.PrimaryPart.Position
                local target = state.ship.PrimaryPart.Position
                local delta = target - origin
                if distance > 32 and distance < 430 and delta.Magnitude > 0.01 then
                    local speed = 30 + clampInt(drone:GetAttribute("Sector"), 1, 3) * 8
                    local nextPosition = origin + delta.Unit * math.min(distance - 28, speed * step)
                    drone:PivotTo(CFrame.lookAt(nextPosition, target))
                end

                local lastAttack = drone:GetAttribute("LastAttack") or 0
                if distance <= Config.Combat.DroneAttackRange and now - lastAttack >= Config.Combat.DroneAttackCooldown then
                    drone:SetAttribute("LastAttack", now)
                    local sector = clampInt(drone:GetAttribute("Sector"), 1, 3)
                    local damage = Config.Combat.DroneBaseDamage + (sector - 1) * 5
                    state.hull = math.max(0, state.hull - damage)
                    setNumber(player, "Hull", state.hull)
                    emitBeam(drone.PrimaryPart.Position, state.ship.PrimaryPart.Position, Color3.fromRGB(255, 150, 82), 0.7)
                    if state.hull <= 0 then
                        rescuePlayer(player, state)
                    end
                end
            end
        end
    end
end

local function updatePlayerMovement(player, state, dt)
    if not state.ship or not state.ship.PrimaryPart then
        return
    end
    local maximumHull = hullMaximum(state.shipTier)
    if state.hull <= 0 then
        state.hull = maximumHull
    end

    state.yaw += math.rad(Config.Ship.TurnDegreesPerSecond) * state.turn * dt
    local facing = CFrame.Angles(0, state.yaw, 0)
    local forward = facing.LookVector
    local move = forward * state.throttle + Vector3.yAxis * state.vertical
    local boostActive = state.boost and math.abs(state.throttle) > 0.05 and state.energy > 1
    local speed = Config.Ship.BaseSpeed * (1 + (state.shipTier - 1) * 0.08)
    if boostActive then
        speed *= Config.Ship.BoostMultiplier
        state.energy = math.max(0, state.energy - Config.Ship.BoostDrainPerSecond * dt)
    else
        state.energy = math.min(Config.Ship.MaxEnergy, state.energy + Config.Ship.EnergyRechargePerSecond * dt)
    end

    local current = state.ship.PrimaryPart.Position
    local nextPosition = current
    if move.Magnitude > 0.01 then
        nextPosition = clampWorldPosition(current + move.Unit * speed * dt)
    end
    local nextCFrame = CFrame.new(nextPosition) * facing
    state.ship:PivotTo(nextCFrame)

    local character = player.Character
    if character then
        character:PivotTo(nextCFrame)
    end

    local docked = state.sector == 1 and (nextPosition - sectorCenter(1)).Magnitude <= Config.World.StationDockRadius
    if player:GetAttribute("Docked") ~= docked then
        player:SetAttribute("Docked", docked)
        if docked then
            notice(player, "정거장 도킹 범위 진입 · 판매/업그레이드/수리 가능")
        end
    end

    setNumber(player, "Energy", state.energy)
    checkGate(player, state)
end

-- =========================================================
-- Remote 입력
-- =========================================================
remote.OnServerEvent:Connect(function(player, action, payload)
    if typeof(action) ~= "string" then
        return
    end
    local state = playerStates[player]
    if not state or not checkCooldown(player, action) then
        return
    end

    if action == "CONTROL" then
        if typeof(payload) ~= "table" then
            return
        end
        local throttle = payload.Throttle
        local turn = payload.Turn
        local vertical = payload.Vertical
        local boost = payload.Boost
        if typeof(throttle) ~= "number" or typeof(turn) ~= "number" or typeof(vertical) ~= "number" or typeof(boost) ~= "boolean" then
            return
        end
        state.throttle = math.clamp(throttle, -1, 1)
        state.turn = math.clamp(turn, -1, 1)
        state.vertical = math.clamp(vertical, -1, 1)
        state.boost = boost
        return
    end

    if action == "MINE" then
        mine(player, state)
    elseif action == "FIRE" then
        fireLaser(player, state)
    elseif action == "SELL" then
        sellOre(player, state)
    elseif action == "UPGRADE_SHIP" then
        upgradeShip(player, state)
    elseif action == "UPGRADE_LASER" then
        upgradeLaser(player, state)
    elseif action == "REPAIR" then
        repairShip(player, state)
    end
end)

-- =========================================================
-- 플레이어 생명주기
-- =========================================================
Players.PlayerAdded:Connect(function(player)
    loadPlayerState(player)
    player.CharacterAdded:Connect(function()
        task.wait(0.1)
        lockCharacterToShip(player)
    end)
end)

for _, player in ipairs(Players:GetPlayers()) do
    task.defer(function()
        if not playerStates[player] then
            loadPlayerState(player)
        end
    end)
end

Players.PlayerRemoving:Connect(function(player)
    savePlayer(player)
    local state = playerStates[player]
    if state and state.ship and state.ship.Parent then
        state.ship:Destroy()
    end
    playerStates[player] = nil
    lastActionAt[player] = nil
end)

-- =========================================================
-- 메인 루프
-- =========================================================
configureLighting()
createStation()
buildWarpNetwork()
spawnAsteroids()
spawnDrones()
Workspace.Gravity = 0
Workspace:SetAttribute("StarFrontierReady", true)
Workspace:SetAttribute("StarFrontierVersion", 1)

local droneAccumulator = 0
RunService.Heartbeat:Connect(function(dt)
    dt = math.min(dt, 0.1)
    for player, state in pairs(playerStates) do
        if player.Parent == Players then
            updatePlayerMovement(player, state, dt)
        end
    end

    droneAccumulator += dt
    if droneAccumulator >= 0.12 then
        updateDrones(droneAccumulator)
        droneAccumulator = 0
    end
end)

game:BindToClose(function()
    shuttingDown = true
    for player in pairs(playerStates) do
        savePlayer(player)
    end
end)
