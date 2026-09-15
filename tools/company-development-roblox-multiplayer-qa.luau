-- Actual two-client Roblox Studio multiplayer QA driven from Studio --task RunScript.
-- The probe binds to the exact immutable place package supplied by the workflow,
-- starts one server with two real Studio clients, and requires both distinct
-- clients to complete a server-authoritative peer-roster roundtrip.

local StudioTestService = game:GetService("StudioTestService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")

local PROBE = "__JaewoonCompanyMultiplayerQaProbe"
local rootThread = coroutine.running()
local completed = false

local function cleanup()
    for _, container in ipairs({ReplicatedStorage, ServerScriptService, StarterPlayer.StarterPlayerScripts}) do
        local old = container:FindFirstChild(PROBE)
        if old then
            old:Destroy()
        end
    end
end

task.delay(120, function()
    if completed then
        return
    end
    completed = true
    print("ROBLOX_MULTIPLAYER_QA=FAIL")
    print("ROBLOX_MULTIPLAYER_QA_ERROR=EDIT_MODEL_WATCHDOG_TIMEOUT")
    cleanup()
    task.wait(0.5)
    task.cancel(rootThread)
end)

cleanup()

local remote = Instance.new("RemoteEvent")
remote.Name = PROBE
remote.Parent = ReplicatedStorage

local serverProbe = Instance.new("Script")
serverProbe.Name = PROBE
serverProbe.Source = [==[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StudioTestService = game:GetService("StudioTestService")

local remote = ReplicatedStorage:WaitForChild("__JaewoonCompanyMultiplayerQaProbe", 10)
if not remote then
    StudioTestService:EndTest("FAIL:REMOTE_MISSING")
    return
end

local ready = {}
local characterReady = {}
local rosterAck = {}
local finished = false

local function count(map)
    local total = 0
    for _ in pairs(map) do
        total += 1
    end
    return total
end

local function playerNames()
    local names = {}
    for player in pairs(ready) do
        table.insert(names, player.Name)
    end
    table.sort(names)
    return names
end

local function finish(result)
    if finished then
        return
    end
    finished = true
    StudioTestService:EndTest(result)
end

local function broadcastRosterIfReady()
    if count(ready) < 2 or count(characterReady) < 2 then
        return
    end
    local names = playerNames()
    if #names < 2 or names[1] == names[2] then
        return
    end
    remote:FireAllClients("SERVER_ROSTER", names)
end

local function maybeFinish()
    if count(ready) >= 2 and count(characterReady) >= 2 and count(rosterAck) >= 2 then
        finish("PASS:TWO_CLIENT_SERVER_AUTHORITATIVE_PEER_ROUNDTRIP")
    end
end

remote.OnServerEvent:Connect(function(player, message)
    if message == "CLIENT_READY" then
        ready[player] = true
        local character = player.Character or player.CharacterAdded:Wait()
        local humanoid = character and (character:FindFirstChildOfClass("Humanoid") or character:WaitForChild("Humanoid", 10))
        if humanoid then
            characterReady[player] = true
        end
        broadcastRosterIfReady()
        return
    end

    if message == "PEER_ROSTER_ACK" and ready[player] and characterReady[player] then
        rosterAck[player] = true
        maybeFinish()
    end
end)

Players.PlayerAdded:Connect(function()
    task.defer(broadcastRosterIfReady)
end)

task.spawn(function()
    local deadline = os.clock() + 75
    while os.clock() < deadline do
        broadcastRosterIfReady()
        maybeFinish()
        if finished then
            return
        end
        task.wait(0.25)
    end
    finish(("FAIL:TIMEOUT:players=%d:ready=%d:characters=%d:acks=%d"):format(
        #Players:GetPlayers(), count(ready), count(characterReady), count(rosterAck)
    ))
end)
]==]
serverProbe.Parent = ServerScriptService

local clientProbe = Instance.new("LocalScript")
clientProbe.Name = PROBE
clientProbe.Source = [==[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

if not game:IsLoaded() then
    game.Loaded:Wait()
end

local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("__JaewoonCompanyMultiplayerQaProbe", 10)
if not player or not remote then
    return
end

local acknowledged = false
remote.OnClientEvent:Connect(function(message, names)
    if message ~= "SERVER_ROSTER" or type(names) ~= "table" or #names < 2 then
        return
    end
    local selfSeen = false
    local peerSeen = false
    for _, name in ipairs(names) do
        if name == player.Name then
            selfSeen = true
        else
            peerSeen = true
        end
    end
    if selfSeen and peerSeen and not acknowledged then
        acknowledged = true
        remote:FireServer("PEER_ROSTER_ACK")
    end
end)

for _ = 1, 80 do
    remote:FireServer("CLIENT_READY")
    if acknowledged then
        break
    end
    task.wait(0.25)
end
]==]
clientProbe.Parent = StarterPlayer.StarterPlayerScripts

local ok, result = pcall(function()
    return StudioTestService:ExecuteMultiplayerTestAsync(2, "JAEWOON_COMPANY_MULTIPLAYER_QA_V1")
end)

if completed then
    return
end
completed = true
cleanup()

if not ok then
    print("ROBLOX_MULTIPLAYER_QA=FAIL")
    print("ROBLOX_MULTIPLAYER_QA_ERROR=" .. tostring(result))
    return
end

local text = tostring(result)
print("ROBLOX_MULTIPLAYER_QA_RESULT=" .. text)
if string.sub(text, 1, 5) ~= "PASS:" then
    print("ROBLOX_MULTIPLAYER_QA=FAIL")
    print("ROBLOX_MULTIPLAYER_QA_ERROR=multiplayer QA failed: " .. text)
    return
end

print("ROBLOX_RUNTIME_REAL_STUDIO=YES")
print("ROBLOX_MULTIPLAYER_QA_CLIENTS=2")
print("ROBLOX_MULTIPLAYER_DISTINCT_PLAYERS=YES")
print("ROBLOX_MULTIPLAYER_SERVER_AUTHORITATIVE_ROUNDTRIP=YES")
print("ROBLOX_MULTIPLAYER_PEER_VISIBILITY=YES")
print("ROBLOX_MULTIPLAYER_QA" .. "=PASS")
