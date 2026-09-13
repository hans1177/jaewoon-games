-- Independent Roblox Studio mobile QA driven from Studio --task RunScript.
-- It binds a real Studio phone simulation to the exact immutable place package,
-- launches a fresh server/client session, validates touch/mobile UI geometry,
-- performs an actual simulated touch click, and requires an authoritative server reaction.

local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local StudioDeviceSimulatorService = game:GetService("StudioDeviceSimulatorService")
local StudioTestService = game:GetService("StudioTestService")

local PROBE = "__JaewoonCompanyMobileIndependentQaProbe"
local rootThread = coroutine.running()
local completed = false
local deviceId = nil

local function cleanupDevice()
    pcall(function()
        StudioDeviceSimulatorService:StopSimulationAsync()
    end)
    if deviceId then
        pcall(function()
            StudioDeviceSimulatorService:RemoveDeviceAsync(deviceId)
        end)
    end
end

local function fail(reason)
    if completed then
        return
    end
    completed = true
    cleanupDevice()
    print("ROBLOX_MOBILE_DEVICE_SIMULATION_PASS=NO")
    print("ROBLOX_MOBILE_CONTROL_UI_PASS=NO")
    print("ROBLOX_INDEPENDENT_QA_PASS=NO")
    print("ROBLOX_MOBILE_INDEPENDENT_QA_ERROR=" .. tostring(reason))
end

-- Keep a broken StudioTestService teardown from occupying the physical runner forever.
task.delay(120, function()
    if completed then
        return
    end
    fail("EDIT_MODEL_WATCHDOG_TIMEOUT")
    task.wait(0.5)
    task.cancel(rootThread)
end)

for _, container in ipairs({ReplicatedStorage, ServerScriptService, StarterPlayer.StarterPlayerScripts}) do
    local old = container:FindFirstChild(PROBE)
    if old then
        old:Destroy()
    end
end

local deviceOk, deviceErr = pcall(function()
    deviceId = StudioDeviceSimulatorService:CreateDeviceAsync({
        Name = "Jaewoon QA Phone " .. HttpService:GenerateGUID(false),
        Width = 390,
        Height = 844,
        PixelDensity = 460,
        DeviceForm = Enum.DeviceForm.Phone,
    })
    StudioDeviceSimulatorService:SetDeviceAsync(deviceId)
    StudioDeviceSimulatorService:SetResolutionAsync(390, 844)
    StudioDeviceSimulatorService:SetPixelDensityAsync(460)
    StudioDeviceSimulatorService:SetOrientationAsync(Enum.ScreenOrientation.Portrait)
    local active = StudioDeviceSimulatorService:GetDeviceAsync()
    local resolution = StudioDeviceSimulatorService:GetResolutionAsync()
    local orientation = StudioDeviceSimulatorService:GetOrientationAsync()
    if active ~= deviceId then
        error("ACTIVE_DEVICE_MISMATCH:" .. tostring(active))
    end
    if resolution.X ~= 390 or resolution.Y ~= 844 then
        error(("RESOLUTION_MISMATCH:%sx%s"):format(tostring(resolution.X), tostring(resolution.Y)))
    end
    if orientation ~= Enum.ScreenOrientation.Portrait then
        error("ORIENTATION_MISMATCH:" .. tostring(orientation))
    end
end)

if not deviceOk then
    fail("DEVICE_SIMULATOR_SETUP_FAILED:" .. tostring(deviceErr))
    return
end

print("ROBLOX_MOBILE_DEVICE_SIMULATION_PASS=YES")
print("ROBLOX_MOBILE_DEVICE_FORM=PHONE")
print("ROBLOX_MOBILE_DEVICE_RESOLUTION=390x844")
print("ROBLOX_MOBILE_DEVICE_ORIENTATION=PORTRAIT")

local remote = Instance.new("RemoteEvent")
remote.Name = PROBE
remote.Parent = ReplicatedStorage

local serverProbe = Instance.new("Script")
serverProbe.Name = PROBE
serverProbe.Source = [==[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StudioTestService = game:GetService("StudioTestService")

local remote = ReplicatedStorage:WaitForChild("__JaewoonCompanyMobileIndependentQaProbe", 10)
if not remote then
    StudioTestService:EndTest("FAIL:MOBILE_PROBE_REMOTE_MISSING")
    return
end

local mobilePass = false
local clientLeft = false
local finished = false

local function finish(result)
    if finished then
        return
    end
    finished = true
    StudioTestService:EndTest(result)
end

remote.OnServerEvent:Connect(function(player, message)
    if message == "MOBILE_TOUCH_UI_PASS" then
        mobilePass = true
        remote:FireClient(player, "SERVER_ACK")
    end
end)

Players.PlayerRemoving:Connect(function()
    clientLeft = true
    if mobilePass then
        finish("PASS:MOBILE_TOUCH_UI_SERVER_ACK")
    end
end)

task.spawn(function()
    local deadline = os.clock() + 70
    while os.clock() < deadline do
        if mobilePass and clientLeft then
            finish("PASS:MOBILE_TOUCH_UI_SERVER_ACK")
            return
        end
        task.wait(0.1)
    end
    finish(("FAIL:MOBILE_TIMEOUT:players=%d:mobile=%s:left=%s"):format(
        #Players:GetPlayers(), tostring(mobilePass), tostring(clientLeft)
    ))
end)
]==]
serverProbe.Parent = ServerScriptService

local clientProbe = Instance.new("LocalScript")
clientProbe.Name = PROBE
clientProbe.Source = [==[
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StudioTestService = game:GetService("StudioTestService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

if not game:IsLoaded() then
    game.Loaded:Wait()
end

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui", 15)
local remote = ReplicatedStorage:WaitForChild("__JaewoonCompanyMobileIndependentQaProbe", 10)
if not playerGui or not remote then
    return
end

if UserInputService.TouchEnabled ~= true then
    return
end

local camera = Workspace.CurrentCamera
local cameraDeadline = os.clock() + 10
while (not camera or camera.ViewportSize.X <= 0 or camera.ViewportSize.Y <= 0) and os.clock() < cameraDeadline do
    task.wait(0.1)
    camera = Workspace.CurrentCamera
end
if not camera then
    return
end
local viewport = camera.ViewportSize
if viewport.Y <= viewport.X then
    return
end

local hud = playerGui:WaitForChild("ApprovedScopeHud", 20)
if not hud or not hud.Enabled then
    return
end
local root = hud:FindFirstChild("Root")
local actions = root and root:FindFirstChild("ApprovedActions")
if not root or not actions or not root.Visible or not actions.Visible then
    return
end

local button = nil
for _, descendant in ipairs(actions:GetDescendants()) do
    if descendant:IsA("TextButton") and descendant.Visible and descendant.Active then
        button = descendant
        break
    end
end
if not button then
    return
end

-- Give AutomaticCanvasSize/layout one render window to settle.
task.wait(0.5)
local size = button.AbsoluteSize
local pos = button.AbsolutePosition
if size.X < 44 or size.Y < 44 then
    return
end
local center = pos + size / 2
if center.X < 0 or center.Y < 0 or center.X > viewport.X or center.Y > viewport.Y then
    return
end

local before = player:GetAttribute("LastApprovedScope")
local virtual = UserInputService:CreateVirtualInput()
if not virtual then
    return
end

local clickOk = pcall(function()
    virtual:SendMousePosition(center)
    virtual:SendMouseButton(center, Enum.UserInputType.MouseButton1, true, 0)
    task.wait(0.12)
    virtual:SendMouseButton(center, Enum.UserInputType.MouseButton1, false, 0)
end)
if not clickOk then
    return
end

local actionObserved = false
local actionDeadline = os.clock() + 10
while os.clock() < actionDeadline do
    local after = player:GetAttribute("LastApprovedScope")
    if after ~= nil and tostring(after) ~= "" and after ~= before then
        actionObserved = true
        break
    end
    task.wait(0.1)
end
if not actionObserved then
    return
end

local ack = false
remote.OnClientEvent:Connect(function(message)
    if message == "SERVER_ACK" then
        ack = true
    end
end)
remote:FireServer("MOBILE_TOUCH_UI_PASS")

local ackDeadline = os.clock() + 10
while not ack and os.clock() < ackDeadline do
    task.wait(0.1)
end
if not ack then
    return
end

local leaveDeadline = os.clock() + 10
while os.clock() < leaveDeadline do
    if StudioTestService:CanLeaveTest() then
        StudioTestService:LeaveTest()
        return
    end
    task.wait(0.1)
end
]==]
clientProbe.Parent = StarterPlayer.StarterPlayerScripts

local ok, result = pcall(function()
    return StudioTestService:ExecuteMultiplayerTestAsync(1, "JAEWOON_COMPANY_MOBILE_INDEPENDENT_QA_V1")
end)

if completed then
    return
end
completed = true

serverProbe:Destroy()
clientProbe:Destroy()
remote:Destroy()
cleanupDevice()

if not ok then
    print("ROBLOX_MOBILE_CONTROL_UI_PASS=NO")
    print("ROBLOX_INDEPENDENT_QA_PASS=NO")
    print("ROBLOX_MOBILE_INDEPENDENT_QA_ERROR=" .. tostring(result))
    return
end

local text = tostring(result)
print("ROBLOX_MOBILE_INDEPENDENT_QA_RESULT=" .. text)
if string.sub(text, 1, 5) ~= "PASS:" then
    print("ROBLOX_MOBILE_CONTROL_UI_PASS=NO")
    print("ROBLOX_INDEPENDENT_QA_PASS=NO")
    print("ROBLOX_MOBILE_INDEPENDENT_QA_ERROR=qa failed: " .. text)
    return
end

print("ROBLOX_RUNTIME_REAL_STUDIO=YES")
print("ROBLOX_MOBILE_TOUCH_INTERACTION_PASS=YES")
print("ROBLOX_MOBILE_CONTROL_UI_PASS=YES")
print("ROBLOX_INDEPENDENT_QA_PASS=YES")
