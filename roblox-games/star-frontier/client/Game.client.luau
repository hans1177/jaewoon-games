-- 파일명: roblox-games/star-frontier/client/Game.client.luau
-- 역할: 별길 개척자 모바일 우선 HUD / 우주선 조작 / 카메라

-- =========================================================
-- 서비스 / 설정
-- =========================================================
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local camera = Workspace.CurrentCamera
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)

pcall(function()
    local playerModule = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule"))
    playerModule:GetControls():Disable()
end)

local worldRoot = Workspace:WaitForChild("StarFrontierWorld")
local shipFolder = worldRoot:WaitForChild("PlayerShips")
local ship = shipFolder:WaitForChild(tostring(player.UserId))
while not ship.PrimaryPart do
    ship:GetPropertyChangedSignal("PrimaryPart"):Wait()
end

-- =========================================================
-- UI 유틸
-- =========================================================
local gui = Instance.new("ScreenGui")
gui.Name = "StarFrontierHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")

local function corner(instance, radius)
    local uiCorner = Instance.new("UICorner")
    uiCorner.CornerRadius = UDim.new(0, radius)
    uiCorner.Parent = instance
end

local function stroke(instance, color, transparency)
    local uiStroke = Instance.new("UIStroke")
    uiStroke.Thickness = 1.5
    uiStroke.Color = color
    uiStroke.Transparency = transparency or 0
    uiStroke.Parent = instance
end

local function makeLabel(parent, name, size, position, text, textSize, alignment)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.Size = size
    label.Position = position
    label.BackgroundTransparency = 1
    label.TextColor3 = Color3.fromRGB(236, 245, 255)
    label.TextSize = textSize
    label.Font = Enum.Font.GothamBold
    label.TextXAlignment = alignment or Enum.TextXAlignment.Left
    label.Text = text
    label.Parent = parent
    return label
end

local function makeButton(parent, name, text, size, position, color)
    local button = Instance.new("TextButton")
    button.Name = name
    button.Size = size
    button.Position = position
    button.BackgroundColor3 = color
    button.AutoButtonColor = true
    button.TextColor3 = Color3.fromRGB(248, 251, 255)
    button.TextSize = 18
    button.Font = Enum.Font.GothamBold
    button.TextWrapped = true
    button.Text = text
    corner(button, 12)
    stroke(button, Color3.fromRGB(215, 238, 255), 0.55)
    button.Parent = parent
    return button
end

-- =========================================================
-- 상단 상태 HUD
-- =========================================================
local topPanel = Instance.new("Frame")
topPanel.Name = "TopPanel"
topPanel.Position = UDim2.fromOffset(12, 10)
topPanel.Size = UDim2.new(0, 330, 0, 156)
topPanel.BackgroundColor3 = Color3.fromRGB(10, 17, 34)
topPanel.BackgroundTransparency = 0.12
corner(topPanel, 16)
stroke(topPanel, Color3.fromRGB(74, 195, 255), 0.35)
topPanel.Parent = gui

local titleLabel = makeLabel(topPanel, "Title", UDim2.new(1, -20, 0, 30), UDim2.fromOffset(10, 8), "별길 개척자", 22)
titleLabel.TextColor3 = Color3.fromRGB(122, 222, 255)
local sectorLabel = makeLabel(topPanel, "Sector", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 40), "성역", 16)
local moneyLabel = makeLabel(topPanel, "Money", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 66), "", 16)
local shipLabel = makeLabel(topPanel, "Ship", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 92), "", 16)
local hullLabel = makeLabel(topPanel, "Hull", UDim2.new(1, -20, 0, 24), UDim2.fromOffset(10, 118), "", 16)

local noticeLabel = makeLabel(gui, "Notice", UDim2.new(0.72, 0, 0, 46), UDim2.new(0.14, 0, 0, 176), "운석을 채굴해서 정거장에 판매해.", 17, Enum.TextXAlignment.Center)
noticeLabel.BackgroundTransparency = 0.18
noticeLabel.BackgroundColor3 = Color3.fromRGB(11, 21, 43)
noticeLabel.TextWrapped = true
corner(noticeLabel, 13)
stroke(noticeLabel, Color3.fromRGB(106, 205, 255), 0.48)

-- =========================================================
-- 좌측 이동 패드
-- =========================================================
local movePanel = Instance.new("Frame")
movePanel.Name = "MovePanel"
movePanel.AnchorPoint = Vector2.new(0, 1)
movePanel.Position = UDim2.new(0, 14, 1, -16)
movePanel.Size = UDim2.fromOffset(220, 214)
movePanel.BackgroundColor3 = Color3.fromRGB(8, 14, 29)
movePanel.BackgroundTransparency = 0.35
corner(movePanel, 18)
movePanel.Parent = gui

local forwardButton = makeButton(movePanel, "Forward", "▲", UDim2.fromOffset(66, 58), UDim2.fromOffset(77, 8), Color3.fromRGB(42, 95, 145))
local leftButton = makeButton(movePanel, "Left", "◀", UDim2.fromOffset(66, 58), UDim2.fromOffset(8, 69), Color3.fromRGB(42, 95, 145))
local rightButton = makeButton(movePanel, "Right", "▶", UDim2.fromOffset(66, 58), UDim2.fromOffset(146, 69), Color3.fromRGB(42, 95, 145))
local backButton = makeButton(movePanel, "Back", "▼", UDim2.fromOffset(66, 58), UDim2.fromOffset(77, 130), Color3.fromRGB(42, 95, 145))
local upButton = makeButton(movePanel, "Up", "상승", UDim2.fromOffset(62, 42), UDim2.fromOffset(8, 166), Color3.fromRGB(57, 80, 126))
local downButton = makeButton(movePanel, "Down", "하강", UDim2.fromOffset(62, 42), UDim2.fromOffset(150, 166), Color3.fromRGB(57, 80, 126))

-- =========================================================
-- 우측 액션 패드
-- =========================================================
local actionPanel = Instance.new("Frame")
actionPanel.Name = "ActionPanel"
actionPanel.AnchorPoint = Vector2.new(1, 1)
actionPanel.Position = UDim2.new(1, -14, 1, -16)
actionPanel.Size = UDim2.fromOffset(236, 214)
actionPanel.BackgroundColor3 = Color3.fromRGB(8, 14, 29)
actionPanel.BackgroundTransparency = 0.35
corner(actionPanel, 18)
actionPanel.Parent = gui

local mineButton = makeButton(actionPanel, "Mine", "채굴", UDim2.fromOffset(108, 62), UDim2.fromOffset(8, 8), Color3.fromRGB(26, 137, 157))
local fireButton = makeButton(actionPanel, "Fire", "레이저", UDim2.fromOffset(108, 62), UDim2.fromOffset(120, 8), Color3.fromRGB(174, 54, 83))
local boostButton = makeButton(actionPanel, "Boost", "부스트", UDim2.fromOffset(108, 54), UDim2.fromOffset(8, 78), Color3.fromRGB(93, 66, 182))
local repairButton = makeButton(actionPanel, "Repair", "수리", UDim2.fromOffset(108, 54), UDim2.fromOffset(120, 78), Color3.fromRGB(72, 117, 93))
local sellButton = makeButton(actionPanel, "Sell", "광석 판매", UDim2.fromOffset(108, 66), UDim2.fromOffset(8, 140), Color3.fromRGB(170, 119, 42))
local upgradeButton = makeButton(actionPanel, "Upgrade", "업그레이드", UDim2.fromOffset(108, 66), UDim2.fromOffset(120, 140), Color3.fromRGB(58, 112, 181))

-- =========================================================
-- 업그레이드 창
-- =========================================================
local upgradePanel = Instance.new("Frame")
upgradePanel.Name = "UpgradePanel"
upgradePanel.AnchorPoint = Vector2.new(0.5, 0.5)
upgradePanel.Position = UDim2.fromScale(0.5, 0.52)
upgradePanel.Size = UDim2.new(0, 320, 0, 230)
upgradePanel.BackgroundColor3 = Color3.fromRGB(11, 20, 39)
upgradePanel.Visible = false
corner(upgradePanel, 18)
stroke(upgradePanel, Color3.fromRGB(95, 192, 255), 0.28)
upgradePanel.Parent = gui

local upgradeTitle = makeLabel(upgradePanel, "Title", UDim2.new(1, -60, 0, 38), UDim2.fromOffset(18, 12), "정거장 업그레이드", 20)
local closeUpgrade = makeButton(upgradePanel, "Close", "×", UDim2.fromOffset(42, 42), UDim2.new(1, -52, 0, 8), Color3.fromRGB(92, 60, 76))
local shipUpgrade = makeButton(upgradePanel, "ShipUpgrade", "우주선 강화", UDim2.new(1, -36, 0, 66), UDim2.fromOffset(18, 68), Color3.fromRGB(46, 96, 151))
local laserUpgrade = makeButton(upgradePanel, "LaserUpgrade", "레이저 강화", UDim2.new(1, -36, 0, 66), UDim2.fromOffset(18, 146), Color3.fromRGB(151, 61, 92))

-- =========================================================
-- 입력 상태
-- =========================================================
local held = {
    Forward = false,
    Back = false,
    Left = false,
    Right = false,
    Up = false,
    Down = false,
    Boost = false,
}

local keyMap = {
    [Enum.KeyCode.W] = "Forward",
    [Enum.KeyCode.S] = "Back",
    [Enum.KeyCode.A] = "Left",
    [Enum.KeyCode.D] = "Right",
    [Enum.KeyCode.E] = "Up",
    [Enum.KeyCode.Q] = "Down",
    [Enum.KeyCode.LeftShift] = "Boost",
    [Enum.KeyCode.ButtonL2] = "Boost",
}

local function bindHold(button, stateName)
    button.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
            held[stateName] = true
        end
    end)
    button.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
            held[stateName] = false
        end
    end)
end

bindHold(forwardButton, "Forward")
bindHold(backButton, "Back")
bindHold(leftButton, "Left")
bindHold(rightButton, "Right")
bindHold(upButton, "Up")
bindHold(downButton, "Down")
bindHold(boostButton, "Boost")

UserInputService.InputBegan:Connect(function(input, processed)
    if processed then
        return
    end
    local stateName = keyMap[input.KeyCode]
    if stateName then
        held[stateName] = true
    elseif input.KeyCode == Enum.KeyCode.F then
        remote:FireServer("FIRE")
    elseif input.KeyCode == Enum.KeyCode.R then
        remote:FireServer("MINE")
    end
end)

UserInputService.InputEnded:Connect(function(input)
    local stateName = keyMap[input.KeyCode]
    if stateName then
        held[stateName] = false
    end
end)

mineButton.Activated:Connect(function()
    remote:FireServer("MINE")
end)

fireButton.Activated:Connect(function()
    remote:FireServer("FIRE")
end)

sellButton.Activated:Connect(function()
    remote:FireServer("SELL")
end)

repairButton.Activated:Connect(function()
    remote:FireServer("REPAIR")
end)

upgradeButton.Activated:Connect(function()
    if player:GetAttribute("Docked") then
        upgradePanel.Visible = not upgradePanel.Visible
    else
        noticeLabel.Text = "정거장 도킹 범위에서만 업그레이드할 수 있어."
    end
end)

closeUpgrade.Activated:Connect(function()
    upgradePanel.Visible = false
end)

shipUpgrade.Activated:Connect(function()
    remote:FireServer("UPGRADE_SHIP")
end)

laserUpgrade.Activated:Connect(function()
    remote:FireServer("UPGRADE_LASER")
end)

-- =========================================================
-- 상태 렌더링
-- =========================================================
local function shipUpgradeText()
    local tier = player:GetAttribute("ShipTier") or 1
    local cost = Config.Economy.ShipUpgradeCosts[tier]
    if cost then
        return string.format("우주선 T%d → T%d\n%d 크레딧", tier, tier + 1, cost)
    end
    return string.format("우주선 T%d\n최고 티어", tier)
end

local function laserUpgradeText()
    local level = player:GetAttribute("LaserLevel") or 1
    local cost = Config.Economy.LaserUpgradeCosts[level]
    if cost then
        return string.format("레이저 Lv.%d → Lv.%d\n%d 크레딧", level, level + 1, cost)
    end
    return string.format("레이저 Lv.%d\n최고 레벨", level)
end

local function renderHud()
    local credits = player:GetAttribute("Credits") or 0
    local ore = player:GetAttribute("Ore") or 0
    local cargo = player:GetAttribute("CargoCapacity") or Config.Mining.CargoBase
    local tier = player:GetAttribute("ShipTier") or 1
    local laser = player:GetAttribute("LaserLevel") or 1
    local hull = player:GetAttribute("Hull") or Config.Ship.BaseHull
    local hullMax = player:GetAttribute("HullMax") or Config.Ship.BaseHull
    local energy = player:GetAttribute("Energy") or Config.Ship.MaxEnergy
    local sectorName = player:GetAttribute("SectorName") or "청람 성역"
    local docked = player:GetAttribute("Docked") == true

    sectorLabel.Text = string.format("%s%s", sectorName, docked and " · 도킹" or "")
    moneyLabel.Text = string.format("크레딧 %d   ·   광석 %d/%d", credits, ore, cargo)
    shipLabel.Text = string.format("우주선 T%d   ·   레이저 Lv.%d   ·   에너지 %d", tier, laser, energy)
    hullLabel.Text = string.format("선체 %d / %d", hull, hullMax)
    sellButton.BackgroundColor3 = docked and Color3.fromRGB(170, 119, 42) or Color3.fromRGB(72, 70, 74)
    repairButton.BackgroundColor3 = docked and Color3.fromRGB(72, 117, 93) or Color3.fromRGB(65, 67, 70)
    upgradeButton.BackgroundColor3 = docked and Color3.fromRGB(58, 112, 181) or Color3.fromRGB(65, 67, 70)
    if not docked then
        upgradePanel.Visible = false
    end
    shipUpgrade.Text = shipUpgradeText()
    laserUpgrade.Text = laserUpgradeText()
end

for _, attributeName in ipairs({
    "Credits",
    "Ore",
    "CargoCapacity",
    "ShipTier",
    "LaserLevel",
    "Hull",
    "HullMax",
    "Energy",
    "SectorName",
    "Docked",
}) do
    player:GetAttributeChangedSignal(attributeName):Connect(renderHud)
end
renderHud()

local noticeSerial = 0
remote.OnClientEvent:Connect(function(kind, payload)
    if kind ~= "NOTICE" then
        return
    end
    noticeSerial += 1
    local serial = noticeSerial
    noticeLabel.Text = tostring(payload)
    task.delay(3.2, function()
        if serial == noticeSerial then
            noticeLabel.Text = "채굴 · 판매 · 강화 · 더 먼 성역 탐험"
        end
    end)
end)

-- =========================================================
-- 카메라 / 조작 전송
-- =========================================================
camera.CameraType = Enum.CameraType.Scriptable
local lastControlSend = 0

local function movementVector()
    if not ship.PrimaryPart then
        return Vector3.zero
    end
    local forward = ship.PrimaryPart.CFrame.LookVector
    forward = Vector3.new(forward.X, 0, forward.Z)
    if forward.Magnitude < 0.01 then
        forward = Vector3.new(0, 0, -1)
    else
        forward = forward.Unit
    end
    local right = Vector3.new(-forward.Z, 0, forward.X)

    local vector = Vector3.zero
    if held.Forward then
        vector += forward
    end
    if held.Back then
        vector -= forward
    end
    if held.Right then
        vector += right
    end
    if held.Left then
        vector -= right
    end
    if held.Up then
        vector += Vector3.yAxis
    end
    if held.Down then
        vector -= Vector3.yAxis
    end
    if vector.Magnitude > 1 then
        vector = vector.Unit
    end
    return vector
end

RunService.RenderStepped:Connect(function()
    if not ship.Parent or not ship.PrimaryPart then
        return
    end
    local shipCFrame = ship.PrimaryPart.CFrame
    local desiredPosition = (shipCFrame * CFrame.new(0, 22, 40)).Position
    local focus = ship.PrimaryPart.Position + shipCFrame.LookVector * 18
    local desired = CFrame.lookAt(desiredPosition, focus)
    camera.CFrame = camera.CFrame:Lerp(desired, 0.14)

    local now = os.clock()
    if now - lastControlSend >= 0.08 then
        lastControlSend = now
        remote:FireServer("CONTROL", {
            Move = movementVector(),
            Boost = held.Boost,
        })
    end
end)
