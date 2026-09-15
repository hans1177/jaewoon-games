-- Orb Rush mobile-first client HUD. The client never awards score.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("OrbRushRemotes")
local roundState = remotes:WaitForChild("RoundState")

local existing = playerGui:FindFirstChild("OrbRushHud")
if existing then
    existing:Destroy()
end

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "OrbRushHud"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = false
screenGui.Parent = playerGui

local panel = Instance.new("Frame")
panel.Name = "TopPanel"
panel.AnchorPoint = Vector2.new(0.5, 0)
panel.Position = UDim2.fromScale(0.5, 0.025)
panel.Size = UDim2.new(0.9, 0, 0, 92)
panel.BackgroundColor3 = Color3.fromRGB(20, 27, 32)
panel.BackgroundTransparency = 0.12
panel.BorderSizePixel = 0
panel.Parent = screenGui

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 14)
corner.Parent = panel

local statusLabel = Instance.new("TextLabel")
statusLabel.Name = "Status"
statusLabel.Size = UDim2.new(0.72, 0, 0.55, 0)
statusLabel.Position = UDim2.new(0.04, 0, 0.08, 0)
statusLabel.BackgroundTransparency = 1
statusLabel.Font = Enum.Font.GothamBold
statusLabel.Text = "ORB RUSH"
statusLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
statusLabel.TextScaled = true
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Parent = panel

local scoreLabel = Instance.new("TextLabel")
scoreLabel.Name = "Score"
scoreLabel.AnchorPoint = Vector2.new(1, 0)
scoreLabel.Position = UDim2.new(0.96, 0, 0.08, 0)
scoreLabel.Size = UDim2.new(0.2, 0, 0.55, 0)
scoreLabel.BackgroundTransparency = 1
scoreLabel.Font = Enum.Font.GothamBold
scoreLabel.Text = "0"
scoreLabel.TextColor3 = Color3.fromRGB(242, 201, 76)
scoreLabel.TextScaled = true
scoreLabel.TextXAlignment = Enum.TextXAlignment.Right
scoreLabel.Parent = panel

local messageLabel = Instance.new("TextLabel")
messageLabel.Name = "Message"
messageLabel.Position = UDim2.new(0.04, 0, 0.64, 0)
messageLabel.Size = UDim2.new(0.92, 0, 0.25, 0)
messageLabel.BackgroundTransparency = 1
messageLabel.Font = Enum.Font.Gotham
messageLabel.Text = "Collect yellow orbs. Avoid red hazards."
messageLabel.TextColor3 = Color3.fromRGB(205, 214, 219)
messageLabel.TextScaled = true
messageLabel.TextXAlignment = Enum.TextXAlignment.Left
messageLabel.Parent = panel

local hintLabel = Instance.new("TextLabel")
hintLabel.Name = "Hint"
hintLabel.AnchorPoint = Vector2.new(0.5, 1)
hintLabel.Position = UDim2.fromScale(0.5, 0.97)
hintLabel.Size = UDim2.new(0.88, 0, 0, 42)
hintLabel.BackgroundColor3 = Color3.fromRGB(20, 27, 32)
hintLabel.BackgroundTransparency = 0.2
hintLabel.BorderSizePixel = 0
hintLabel.Font = Enum.Font.GothamMedium
hintLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
hintLabel.TextScaled = true
hintLabel.Text = if UserInputService.TouchEnabled then "Move with the thumbstick and touch yellow orbs" else "Move and touch yellow orbs"
hintLabel.Parent = screenGui

local hintCorner = Instance.new("UICorner")
hintCorner.CornerRadius = UDim.new(0, 12)
hintCorner.Parent = hintLabel

local function bindScore()
    local leaderstats = player:WaitForChild("leaderstats")
    local score = leaderstats:WaitForChild("Score")
    local function refresh()
        scoreLabel.Text = tostring(score.Value)
    end
    refresh()
    score:GetPropertyChangedSignal("Value"):Connect(refresh)
end

task.spawn(bindScore)

roundState.OnClientEvent:Connect(function(payload)
    if typeof(payload) ~= "table" then
        return
    end
    local phase = tostring(payload.phase or "")
    local secondsLeft = math.max(0, math.floor(tonumber(payload.secondsLeft) or 0))
    local message = tostring(payload.message or "")

    if phase == "ROUND" then
        statusLabel.Text = string.format("ORB RUSH  %ds", secondsLeft)
    elseif phase == "INTERMISSION" then
        statusLabel.Text = string.format("NEXT ROUND  %ds", secondsLeft)
    elseif phase == "RESULT" then
        statusLabel.Text = "ROUND COMPLETE"
    else
        statusLabel.Text = "ORB RUSH"
    end

    if message ~= "" then
        messageLabel.Text = message
    end
end)

player:SetAttribute("JaewoonTouchEnabled", UserInputService.TouchEnabled)
