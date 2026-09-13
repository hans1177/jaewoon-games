-- Actual Roblox Studio runtime smoke driven from Studio --task RunScript.
-- The command script injects one server probe and one client probe, then launches
-- a real one-server/one-client StudioTestService multiplayer session.

local StudioTestService = game:GetService("StudioTestService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")

local PROBE = "__JaewoonCompanyRuntimeProbe"
for _, container in ipairs({ReplicatedStorage, ServerScriptService, StarterPlayer.StarterPlayerScripts}) do
    local old = container:FindFirstChild(PROBE)
    if old then
        old:Destroy()
    end
end

local remote = Instance.new("RemoteEvent")
remote.Name = PROBE
remote.Parent = ReplicatedStorage

local serverProbe = Instance.new("Script")
serverProbe.Name = PROBE
serverProbe.Source = [==[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StudioTestService = game:GetService("StudioTestService")

local remote = ReplicatedStorage:WaitForChild("__JaewoonCompanyRuntimeProbe", 10)
if not remote then
    StudioTestService:EndTest("FAIL:REMOTE_MISSING")
    return
end

local clientReady = false
local characterReady = false
local serverAckSent = false

remote.OnServerEvent:Connect(function(player, message)
    if message ~= "CLIENT_READY" then
        return
    end
    clientReady = true
    local character = player.Character or player.CharacterAdded:Wait()
    if character and character:FindFirstChildOfClass("Humanoid") then
        characterReady = true
    end
    remote:FireClient(player, "SERVER_ACK")
    serverAckSent = true
end)

task.spawn(function()
    local deadline = os.clock() + 35
    while os.clock() < deadline do
        if #Players:GetPlayers() >= 1 and clientReady and characterReady and serverAckSent then
            task.wait(1)
            StudioTestService:EndTest("PASS:PLAYER_CHARACTER_CLIENT_SERVER")
            return
        end
        task.wait(0.1)
    end
    StudioTestService:EndTest(("FAIL:TIMEOUT:players=%d:client=%s:character=%s:ack=%s"):format(
        #Players:GetPlayers(), tostring(clientReady), tostring(characterReady), tostring(serverAckSent)
    ))
end)
]==]
serverProbe.Parent = ServerScriptService

local clientProbe = Instance.new("LocalScript")
clientProbe.Name = PROBE
clientProbe.Source = [==[
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local remote = ReplicatedStorage:WaitForChild("__JaewoonCompanyRuntimeProbe", 10)
if not remote then
    return
end
local ack = false
remote.OnClientEvent:Connect(function(message)
    if message == "SERVER_ACK" then
        ack = true
    end
end)
for _ = 1, 30 do
    remote:FireServer("CLIENT_READY")
    if ack then
        break
    end
    task.wait(0.25)
end
]==]
clientProbe.Parent = StarterPlayer.StarterPlayerScripts

local ok, result = pcall(function()
    return StudioTestService:ExecuteMultiplayerTestAsync(1, "JAEWOON_COMPANY_RUNTIME_SMOKE_V1")
end)

serverProbe:Destroy()
clientProbe:Destroy()
remote:Destroy()

if not ok then
    print("ROBLOX_RUNTIME_SMOKE=FAIL")
    print("ROBLOX_RUNTIME_ERROR=" .. tostring(result))
    error(result)
end

local text = tostring(result)
print("ROBLOX_RUNTIME_RESULT=" .. text)
if string.sub(text, 1, 5) ~= "PASS:" then
    print("ROBLOX_RUNTIME_SMOKE=FAIL")
    error("runtime smoke failed: " .. text)
end

print("ROBLOX_RUNTIME_REAL_STUDIO=YES")
print("ROBLOX_RUNTIME_MULTIPLAYER_CLIENTS=1")
print("ROBLOX_SERVER_CLIENT_BOUNDARY_PASS=YES")
print("ROBLOX_PLAYER_CHARACTER_PASS=YES")
print("ROBLOX_RUNTIME_SMOKE=PASS")
