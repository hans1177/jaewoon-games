-- Orb Rush server-authoritative gameplay loop.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local shared = ReplicatedStorage:WaitForChild("OrbRushShared")
local Config = require(shared:WaitForChild("Config"))
local rng = Random.new()

local remotes = ReplicatedStorage:FindFirstChild("OrbRushRemotes")
if not remotes then
    remotes = Instance.new("Folder")
    remotes.Name = "OrbRushRemotes"
    remotes.Parent = ReplicatedStorage
end

local roundState = remotes:FindFirstChild("RoundState")
if not roundState then
    roundState = Instance.new("RemoteEvent")
    roundState.Name = "RoundState"
    roundState.Parent = remotes
end

local arena = workspace:FindFirstChild("OrbRushArena")
if arena then
    arena:Destroy()
end
arena = Instance.new("Model")
arena.Name = "OrbRushArena"
arena.Parent = workspace

local orbFolder = Instance.new("Folder")
orbFolder.Name = "Orbs"
orbFolder.Parent = arena

local roundActive = false
local roundToken = 0
local hazardTouchAt = {}

local function makePart(name, size, position, color, material)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.Position = position
    part.Anchored = true
    part.Color = color
    part.Material = material or Enum.Material.SmoothPlastic
    part.Parent = arena
    return part
end

local function buildArena()
    local half = Config.ArenaHalfSize
    makePart(
        "Floor",
        Vector3.new(half * 2, 2, half * 2),
        Vector3.new(0, -1, 0),
        Color3.fromRGB(54, 67, 76),
        Enum.Material.Slate
    )

    local wallHeight = 12
    local wallThickness = 2
    local wallColor = Color3.fromRGB(35, 45, 52)
    makePart("NorthWall", Vector3.new(half * 2, wallHeight, wallThickness), Vector3.new(0, wallHeight / 2, -half), wallColor)
    makePart("SouthWall", Vector3.new(half * 2, wallHeight, wallThickness), Vector3.new(0, wallHeight / 2, half), wallColor)
    makePart("WestWall", Vector3.new(wallThickness, wallHeight, half * 2), Vector3.new(-half, wallHeight / 2, 0), wallColor)
    makePart("EastWall", Vector3.new(wallThickness, wallHeight, half * 2), Vector3.new(half, wallHeight / 2, 0), wallColor)

    local spawn = Instance.new("SpawnLocation")
    spawn.Name = "OrbRushSpawn"
    spawn.Size = Vector3.new(12, 1, 12)
    spawn.Position = Vector3.new(0, 0.5, 0)
    spawn.Anchored = true
    spawn.Neutral = true
    spawn.CanCollide = true
    spawn.Transparency = 0.25
    spawn.Color = Color3.fromRGB(86, 204, 242)
    spawn.Material = Enum.Material.Neon
    spawn.Parent = arena
end

local function playerFromHit(hit)
    if not hit then
        return nil
    end
    local character = hit:FindFirstAncestorOfClass("Model")
    if not character then
        return nil
    end
    return Players:GetPlayerFromCharacter(character), character
end

local function addHazard(name, position, size)
    local hazard = makePart(name, size, position, Color3.fromRGB(235, 87, 87), Enum.Material.Neon)
    hazard.Touched:Connect(function(hit)
        if not roundActive then
            return
        end
        local player, character = playerFromHit(hit)
        if not player or not character then
            return
        end
        local humanoid = character:FindFirstChildOfClass("Humanoid")
        if not humanoid or humanoid.Health <= 0 then
            return
        end
        local now = os.clock()
        local previous = hazardTouchAt[player] or 0
        if now - previous < Config.HazardCooldownSeconds then
            return
        end
        hazardTouchAt[player] = now
        humanoid:TakeDamage(Config.HazardDamage)
    end)
end

local function buildHazards()
    addHazard("HazardNorth", Vector3.new(0, 0.5, -24), Vector3.new(30, 1, 5))
    addHazard("HazardSouth", Vector3.new(0, 0.5, 24), Vector3.new(30, 1, 5))
    addHazard("HazardWest", Vector3.new(-24, 0.5, 0), Vector3.new(5, 1, 30))
    addHazard("HazardEast", Vector3.new(24, 0.5, 0), Vector3.new(5, 1, 30))
end

local function ensureLeaderstats(player)
    local leaderstats = player:FindFirstChild("leaderstats")
    if not leaderstats then
        leaderstats = Instance.new("Folder")
        leaderstats.Name = "leaderstats"
        leaderstats.Parent = player
    end

    local score = leaderstats:FindFirstChild("Score")
    if not score then
        score = Instance.new("IntValue")
        score.Name = "Score"
        score.Value = 0
        score.Parent = leaderstats
    end
    return score
end

local function resetScores()
    for _, player in Players:GetPlayers() do
        ensureLeaderstats(player).Value = 0
    end
end

local function randomOrbPosition()
    local margin = 8
    local half = Config.ArenaHalfSize - margin
    local x = rng:NextNumber(-half, half)
    local z = rng:NextNumber(-half, half)

    if math.abs(x) < 10 and math.abs(z) < 10 then
        x += if x >= 0 then 12 else -12
    end

    return Vector3.new(x, 2.5, z)
end

local function spawnOrb(expectedToken)
    if not roundActive or expectedToken ~= roundToken then
        return
    end

    local orb = Instance.new("Part")
    orb.Name = "ScoreOrb"
    orb.Shape = Enum.PartType.Ball
    orb.Size = Vector3.new(3, 3, 3)
    orb.Position = randomOrbPosition()
    orb.Anchored = true
    orb.CanCollide = false
    orb.CanTouch = true
    orb.Color = Color3.fromRGB(242, 201, 76)
    orb.Material = Enum.Material.Neon
    orb.Parent = orbFolder

    local collected = false
    orb.Touched:Connect(function(hit)
        if collected or not roundActive or expectedToken ~= roundToken then
            return
        end
        local player = playerFromHit(hit)
        if not player then
            return
        end
        collected = true
        ensureLeaderstats(player).Value += Config.OrbScore
        orb:Destroy()

        task.delay(Config.OrbRespawnSeconds, function()
            spawnOrb(expectedToken)
        end)
    end)
end

local function clearOrbs()
    for _, child in orbFolder:GetChildren() do
        child:Destroy()
    end
end

local function broadcast(phase, secondsLeft, message)
    roundState:FireAllClients({
        phase = phase,
        secondsLeft = secondsLeft,
        message = message or "",
    })
end

local function winnerMessage()
    local bestScore = -1
    local winners = {}
    for _, player in Players:GetPlayers() do
        local score = ensureLeaderstats(player).Value
        if score > bestScore then
            bestScore = score
            winners = {player.Name}
        elseif score == bestScore then
            table.insert(winners, player.Name)
        end
    end

    if #winners == 0 then
        return "No winner this round"
    end
    if #winners == 1 then
        return string.format("%s wins with %d!", winners[1], bestScore)
    end
    return string.format("Tie at %d: %s", bestScore, table.concat(winners, ", "))
end

local function runIntermission()
    roundActive = false
    clearOrbs()
    for seconds = Config.IntermissionSeconds, 1, -1 do
        broadcast("INTERMISSION", seconds, "Next round")
        task.wait(1)
    end
end

local function runRound()
    roundToken += 1
    local token = roundToken
    resetScores()
    roundActive = true

    for _ = 1, Config.OrbTargetCount do
        spawnOrb(token)
    end

    for seconds = Config.RoundSeconds, 1, -1 do
        broadcast("ROUND", seconds, "Collect yellow orbs. Avoid red hazards.")
        task.wait(1)
        if token ~= roundToken then
            break
        end
    end

    roundActive = false
    clearOrbs()
    broadcast("RESULT", Config.ResultSeconds, winnerMessage())
    task.wait(Config.ResultSeconds)
end

Players.PlayerAdded:Connect(function(player)
    ensureLeaderstats(player)
end)

Players.PlayerRemoving:Connect(function(player)
    hazardTouchAt[player] = nil
end)

for _, player in Players:GetPlayers() do
    ensureLeaderstats(player)
end

buildArena()
buildHazards()

game:SetAttribute("JaewoonPlatform", "ROBLOX")
game:SetAttribute("JaewoonGameId", Config.GameId)
game:SetAttribute("JaewoonServerRuntime", true)
game:SetAttribute("JaewoonStudioRuntime", RunService:IsStudio())

task.spawn(function()
    while true do
        runIntermission()
        runRound()
    end
end)
