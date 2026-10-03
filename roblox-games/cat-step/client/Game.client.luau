-- 파일명: roblox-games/cat-step/client/Game.client.luau
-- 캣 스텝 모바일 세로 점프 게임

-- 서비스
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

-- 참조
local player = Players.LocalPlayer
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameConfig"))
local palette = Config.Palette

-- 유틸
local function round(target, radius)
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, radius or 12)
    corner.Parent = target
    return corner
end

local function stroke(target, transparency)
    local uiStroke = Instance.new("UIStroke")
    uiStroke.Thickness = 1.5
    uiStroke.Transparency = transparency or 0.45
    uiStroke.Color = Color3.fromRGB(255, 255, 255)
    uiStroke.Parent = target
    return uiStroke
end

local function makeText(parent, name, text, size, font)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = palette.Text
    label.TextSize = size or 18
    label.Font = font or Enum.Font.GothamBold
    label.TextStrokeTransparency = 0.72
    label.Parent = parent
    return label
end

local function makeButton(parent, name, text, color)
    local button = Instance.new("TextButton")
    button.Name = name
    button.AutoButtonColor = false
    button.BackgroundColor3 = color
    button.TextColor3 = palette.Text
    button.Text = text
    button.TextSize = 22
    button.Font = Enum.Font.GothamBold
    button.BorderSizePixel = 0
    button.Parent = parent
    round(button, 18)
    stroke(button, 0.65)
    return button
end

local function tweenAndWait(target, duration, properties, style, direction)
    local tween = TweenService:Create(
        target,
        TweenInfo.new(
            duration,
            style or Enum.EasingStyle.Quad,
            direction or Enum.EasingDirection.Out
        ),
        properties
    )
    tween:Play()
    tween.Completed:Wait()
end

local function laneX(lane)
    return Config.Lanes[lane] or Config.Lanes[2]
end

local function platformY(index)
    return Config.PlatformBaseY - index * Config.PlatformGapY
end

-- UI
local gui = Instance.new("ScreenGui")
gui.Name = "CatStepHUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.ScreenInsets = Enum.ScreenInsets.CoreUISafeInsets
gui.DisplayOrder = 40
gui.ZIndexBehavior = Enum.ZIndexBehavior.Global
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
root.Name = "Root"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = palette.SkyBottom
root.BorderSizePixel = 0
root.ClipsDescendants = true
root.Parent = gui

local skyGradient = Instance.new("UIGradient")
skyGradient.Rotation = 90
skyGradient.Color = ColorSequence.new({
    ColorSequenceKeypoint.new(0, palette.SkyTop),
    ColorSequenceKeypoint.new(1, palette.SkyBottom),
})
skyGradient.Parent = root

local horizon = Instance.new("Frame")
horizon.Name = "Horizon"
horizon.AnchorPoint = Vector2.new(0.5, 1)
horizon.Position = UDim2.fromScale(0.5, 1)
horizon.Size = UDim2.new(1, 0, 0.24, 0)
horizon.BackgroundColor3 = Color3.fromRGB(45, 68, 88)
horizon.BackgroundTransparency = 0.18
horizon.BorderSizePixel = 0
horizon.Parent = root

for i = 1, 7 do
    local cloud = Instance.new("Frame")
    cloud.Name = "Cloud" .. i
    cloud.AnchorPoint = Vector2.new(0.5, 0.5)
    cloud.Size = UDim2.new(0.12 + (i % 3) * 0.035, 0, 0, 18 + (i % 2) * 7)
    cloud.Position = UDim2.fromScale(0.08 + (i * 0.135) % 0.92, 0.12 + (i % 4) * 0.16)
    cloud.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
    cloud.BackgroundTransparency = 0.82
    cloud.BorderSizePixel = 0
    cloud.Parent = root
    round(cloud, 30)
end

local playfield = Instance.new("Frame")
playfield.Name = "Playfield"
playfield.Size = UDim2.fromScale(1, 1)
playfield.BackgroundTransparency = 1
playfield.ClipsDescendants = true
playfield.Parent = root

local hud = Instance.new("Frame")
hud.Name = "HUD"
hud.Size = UDim2.fromScale(1, 0.18)
hud.BackgroundTransparency = 1
hud.ZIndex = 20
hud.Parent = root

local title = makeText(hud, "Title", "캣 스텝", 16)
title.AnchorPoint = Vector2.new(0.5, 0)
title.Position = UDim2.fromScale(0.5, 0.04)
title.Size = UDim2.new(0.5, 0, 0, 26)
title.ZIndex = 21

local scoreLabel = makeText(hud, "Score", "0", 42)
scoreLabel.AnchorPoint = Vector2.new(0.5, 0)
scoreLabel.Position = UDim2.fromScale(0.5, 0.20)
scoreLabel.Size = UDim2.new(0.6, 0, 0, 52)
scoreLabel.ZIndex = 21

local bestLabel = makeText(hud, "Best", "최고 0", 14, Enum.Font.GothamMedium)
bestLabel.Position = UDim2.fromScale(0.04, 0.08)
bestLabel.Size = UDim2.new(0.28, 0, 0, 28)
bestLabel.TextXAlignment = Enum.TextXAlignment.Left
bestLabel.ZIndex = 21

local speedLabel = makeText(hud, "Speed", "속도 1", 14, Enum.Font.GothamMedium)
speedLabel.AnchorPoint = Vector2.new(1, 0)
speedLabel.Position = UDim2.fromScale(0.96, 0.08)
speedLabel.Size = UDim2.new(0.28, 0, 0, 28)
speedLabel.TextXAlignment = Enum.TextXAlignment.Right
speedLabel.ZIndex = 21

local comboLabel = makeText(hud, "Combo", "", 18)
comboLabel.AnchorPoint = Vector2.new(0.5, 0)
comboLabel.Position = UDim2.fromScale(0.5, 0.66)
comboLabel.Size = UDim2.new(0.6, 0, 0, 30)
comboLabel.TextColor3 = palette.Milestone
comboLabel.ZIndex = 21

local guideLabel = makeText(root, "Guide", "다음 발판 방향으로 점프", 16)
guideLabel.AnchorPoint = Vector2.new(0.5, 0.5)
guideLabel.Position = UDim2.fromScale(0.5, 0.80)
guideLabel.Size = UDim2.new(0.76, 0, 0, 28)
guideLabel.TextTransparency = 0.12
guideLabel.ZIndex = 20

local leftButton = makeButton(root, "LeftButton", "◀  왼쪽", palette.ButtonLeft)
leftButton.AnchorPoint = Vector2.new(0, 1)
leftButton.Position = UDim2.new(0.035, 0, 0.965, 0)
leftButton.Size = UDim2.new(0.445, 0, 0, 72)
leftButton.ZIndex = 30

local rightButton = makeButton(root, "RightButton", "오른쪽  ▶", palette.ButtonRight)
rightButton.AnchorPoint = Vector2.new(1, 1)
rightButton.Position = UDim2.new(0.965, 0, 0.965, 0)
rightButton.Size = UDim2.new(0.445, 0, 0, 72)
rightButton.ZIndex = 30

-- 고양이
local cat = Instance.new("Frame")
cat.Name = "Cat"
cat.AnchorPoint = Vector2.new(0.5, 1)
cat.Size = UDim2.fromOffset(58, 62)
cat.BackgroundTransparency = 1
cat.Position = UDim2.fromScale(laneX(2), Config.CatBaseY)
cat.ZIndex = 12
cat.Parent = playfield

local tail = Instance.new("Frame")
tail.Name = "Tail"
tail.AnchorPoint = Vector2.new(0, 0.5)
tail.Position = UDim2.fromScale(0.62, 0.63)
tail.Size = UDim2.fromOffset(26, 8)
tail.Rotation = -24
tail.BackgroundColor3 = palette.Cat
tail.BorderSizePixel = 0
tail.ZIndex = 11
tail.Parent = cat
round(tail, 12)

local body = Instance.new("Frame")
body.Name = "Body"
body.AnchorPoint = Vector2.new(0.5, 1)
body.Position = UDim2.fromScale(0.5, 0.96)
body.Size = UDim2.fromScale(0.56, 0.56)
body.BackgroundColor3 = palette.Cat
body.BorderSizePixel = 0
body.ZIndex = 12
body.Parent = cat
round(body, 16)

local head = Instance.new("Frame")
head.Name = "Head"
head.AnchorPoint = Vector2.new(0.5, 0)
head.Position = UDim2.fromScale(0.5, 0.08)
head.Size = UDim2.fromScale(0.72, 0.52)
head.BackgroundColor3 = palette.Cat
head.BorderSizePixel = 0
head.ZIndex = 13
head.Parent = cat
round(head, 18)

local leftEar = Instance.new("TextLabel")
leftEar.Name = "LeftEar"
leftEar.BackgroundTransparency = 1
leftEar.Text = "▲"
leftEar.TextColor3 = palette.Cat
leftEar.TextSize = 24
leftEar.Font = Enum.Font.GothamBold
leftEar.Position = UDim2.fromScale(0.06, -0.14)
leftEar.Size = UDim2.fromScale(0.42, 0.5)
leftEar.ZIndex = 12
leftEar.Parent = head

local rightEar = leftEar:Clone()
rightEar.Name = "RightEar"
rightEar.Position = UDim2.fromScale(0.52, -0.14)
rightEar.Parent = head

local leftEye = Instance.new("Frame")
leftEye.Name = "LeftEye"
leftEye.Size = UDim2.fromOffset(6, 7)
leftEye.Position = UDim2.fromScale(0.29, 0.40)
leftEye.BackgroundColor3 = palette.CatDark
leftEye.BorderSizePixel = 0
leftEye.ZIndex = 14
leftEye.Parent = head
round(leftEye, 8)

local rightEye = leftEye:Clone()
rightEye.Name = "RightEye"
rightEye.Position = UDim2.fromScale(0.61, 0.40)
rightEye.Parent = head

local nose = Instance.new("Frame")
nose.Name = "Nose"
nose.Size = UDim2.fromOffset(7, 5)
nose.Position = UDim2.fromScale(0.44, 0.62)
nose.BackgroundColor3 = Color3.fromRGB(120, 72, 69)
nose.BorderSizePixel = 0
nose.ZIndex = 14
nose.Parent = head
round(nose, 8)

-- 상태
local platforms = {}
local gameState = "MENU"
local currentLane = 2
local score = 0
local best = 0
local combo = 0
local jumping = false
local generatedNumber = 0

local function jumpDuration()
    local tier = math.floor(score / Config.SpeedUpEvery)
    return math.max(
        Config.MinimumJumpDuration,
        Config.JumpDuration - tier * Config.JumpDurationStep
    )
end

local function updateHud()
    scoreLabel.Text = tostring(score)
    bestLabel.Text = "최고 " .. tostring(best)
    speedLabel.Text = "속도 " .. tostring(1 + math.floor(score / Config.SpeedUpEvery))
    if combo >= 3 then
        comboLabel.Text = "COMBO x" .. tostring(combo)
    else
        comboLabel.Text = ""
    end
    guideLabel.Visible = score < 3 and gameState == "RUNNING"
end

local function nextLaneFrom(lane)
    if lane <= 1 then
        return 2
    end
    if lane >= 3 then
        return 2
    end
    if math.random(1, 2) == 1 then
        return 1
    end
    return 3
end

local function createPlatform(lane, index, number)
    local frame = Instance.new("Frame")
    frame.Name = "Platform_" .. tostring(number)
    frame.AnchorPoint = Vector2.new(0.5, 0.5)
    frame.Position = UDim2.fromScale(laneX(lane), platformY(index))
    frame.Size = UDim2.new(0.235, 0, 0, 20)
    frame.BackgroundColor3 = number > 0 and number % Config.SpeedUpEvery == 0
        and palette.Milestone
        or palette.Platform
    frame.BorderSizePixel = 0
    frame.ZIndex = 5
    frame.Parent = playfield
    round(frame, 9)

    local top = Instance.new("Frame")
    top.Name = "Top"
    top.Size = UDim2.new(1, 0, 0, 5)
    top.BackgroundColor3 = number > 0 and number % Config.SpeedUpEvery == 0
        and Color3.fromRGB(255, 226, 132)
        or palette.PlatformTop
    top.BorderSizePixel = 0
    top.ZIndex = 6
    top.Parent = frame
    round(top, 9)

    return {
        frame = frame,
        lane = lane,
        index = index,
        number = number,
    }
end

local function clearPlatforms()
    for _, row in ipairs(platforms) do
        if row.frame then
            row.frame:Destroy()
        end
    end
    platforms = {}
end

local function buildStaircase()
    clearPlatforms()
    generatedNumber = 0
    currentLane = 2

    table.insert(platforms, createPlatform(currentLane, 0, 0))
    local lane = currentLane

    for index = 1, Config.VisiblePlatforms - 1 do
        lane = nextLaneFrom(lane)
        generatedNumber = generatedNumber + 1
        table.insert(platforms, createPlatform(lane, index, generatedNumber))
    end
end

local function setControlsEnabled(enabled)
    leftButton.Active = enabled
    rightButton.Active = enabled
    leftButton.BackgroundTransparency = enabled and 0 or 0.38
    rightButton.BackgroundTransparency = enabled and 0 or 0.38
end

-- 오버레이
local overlay = Instance.new("Frame")
overlay.Name = "Overlay"
overlay.Size = UDim2.fromScale(1, 1)
overlay.BackgroundColor3 = palette.Overlay
overlay.BackgroundTransparency = 0.18
overlay.BorderSizePixel = 0
overlay.ZIndex = 50
overlay.Parent = root

local card = Instance.new("Frame")
card.Name = "Card"
card.AnchorPoint = Vector2.new(0.5, 0.5)
card.Position = UDim2.fromScale(0.5, 0.49)
card.Size = UDim2.new(0.82, 0, 0, 300)
card.BackgroundColor3 = Color3.fromRGB(28, 34, 52)
card.BackgroundTransparency = 0.04
card.BorderSizePixel = 0
card.ZIndex = 51
card.Parent = overlay
round(card, 24)
stroke(card, 0.70)

local overlayTitle = makeText(card, "OverlayTitle", "캣 스텝", 32)
overlayTitle.AnchorPoint = Vector2.new(0.5, 0)
overlayTitle.Position = UDim2.fromScale(0.5, 0.12)
overlayTitle.Size = UDim2.new(0.86, 0, 0, 44)
overlayTitle.ZIndex = 52

local overlayBody = makeText(card, "OverlayBody", "다음 발판이 있는 방향으로\n왼쪽 또는 오른쪽 점프", 18, Enum.Font.GothamMedium)
overlayBody.AnchorPoint = Vector2.new(0.5, 0)
overlayBody.Position = UDim2.fromScale(0.5, 0.34)
overlayBody.Size = UDim2.new(0.84, 0, 0, 74)
overlayBody.TextWrapped = true
overlayBody.ZIndex = 52

local startButton = makeButton(card, "StartButton", "시작", palette.PlatformTop)
startButton.AnchorPoint = Vector2.new(0.5, 1)
startButton.Position = UDim2.fromScale(0.5, 0.86)
startButton.Size = UDim2.new(0.68, 0, 0, 58)
startButton.TextColor3 = Color3.fromRGB(25, 45, 42)
startButton.ZIndex = 53

local function showMenu(kind)
    overlay.Visible = true
    if kind == "GAME_OVER" then
        overlayTitle.Text = "추락!"
        overlayBody.Text = "점수 " .. tostring(score) .. "\n최고 " .. tostring(best)
        startButton.Text = "다시 시작"
    else
        overlayTitle.Text = "캣 스텝"
        overlayBody.Text = "다음 발판이 있는 방향으로\n왼쪽 또는 오른쪽 점프"
        startButton.Text = "시작"
    end
end

local function resetRun()
    score = 0
    combo = 0
    jumping = false
    buildStaircase()
    cat.Position = UDim2.fromScale(laneX(currentLane), Config.CatBaseY)
    cat.Rotation = 0
    cat.Size = UDim2.fromOffset(58, 62)
    cat.Visible = true
    updateHud()
end

local function beginRun()
    resetRun()
    gameState = "RUNNING"
    overlay.Visible = false
    setControlsEnabled(true)
    updateHud()
end

local function finishRun()
    gameState = "GAME_OVER"
    jumping = false
    combo = 0
    if score > best then
        best = score
    end
    setControlsEnabled(false)
    updateHud()
    showMenu("GAME_OVER")
end

local function scrollAfterLanding()
    local old = table.remove(platforms, 1)
    if old and old.frame then
        old.frame:Destroy()
    end

    for _, row in ipairs(platforms) do
        row.index = row.index - 1
        TweenService:Create(
            row.frame,
            TweenInfo.new(0.10, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
            {Position = UDim2.fromScale(laneX(row.lane), platformY(row.index))}
        ):Play()
    end

    currentLane = platforms[1].lane

    local lastLane = platforms[#platforms].lane
    local newLane = nextLaneFrom(lastLane)
    generatedNumber = generatedNumber + 1
    table.insert(
        platforms,
        createPlatform(
            newLane,
            Config.VisiblePlatforms - 1,
            generatedNumber
        )
    )

    tweenAndWait(
        cat,
        0.10,
        {
            Position = UDim2.fromScale(laneX(currentLane), Config.CatBaseY),
            Rotation = 0,
        },
        Enum.EasingStyle.Quad,
        Enum.EasingDirection.Out
    )
end

local function successfulJump(target)
    local duration = jumpDuration()
    local startX = laneX(currentLane)
    local targetX = laneX(target.lane)
    local upperY = Config.CatBaseY - Config.PlatformGapY - 0.052
    local landingY = Config.CatBaseY - Config.PlatformGapY

    tweenAndWait(
        cat,
        duration * 0.46,
        {
            Position = UDim2.fromScale((startX + targetX) * 0.5, upperY),
            Rotation = targetX > startX and 8 or -8,
        },
        Enum.EasingStyle.Quad,
        Enum.EasingDirection.Out
    )

    tweenAndWait(
        cat,
        duration * 0.54,
        {
            Position = UDim2.fromScale(targetX, landingY),
            Rotation = targetX > startX and -5 or 5,
        },
        Enum.EasingStyle.Quad,
        Enum.EasingDirection.In
    )

    cat.Size = UDim2.fromOffset(62, 56)
    TweenService:Create(
        cat,
        TweenInfo.new(0.08, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
        {Size = UDim2.fromOffset(58, 62)}
    ):Play()

    score = score + 1
    combo = combo + 1
    if score > best then
        best = score
    end
    updateHud()
    scrollAfterLanding()
    jumping = false
end

local function failedJump(direction)
    local duration = jumpDuration()
    local startX = laneX(currentLane)
    local missX = math.clamp(startX + direction * 0.24, 0.04, 0.96)

    tweenAndWait(
        cat,
        duration * 0.48,
        {
            Position = UDim2.fromScale((startX + missX) * 0.5, Config.CatBaseY - 0.12),
            Rotation = direction > 0 and 18 or -18,
        },
        Enum.EasingStyle.Quad,
        Enum.EasingDirection.Out
    )

    tweenAndWait(
        cat,
        math.max(0.20, duration * 0.90),
        {
            Position = UDim2.fromScale(missX, 1.12),
            Rotation = direction > 0 and 95 or -95,
        },
        Enum.EasingStyle.Quad,
        Enum.EasingDirection.In
    )

    finishRun()
end

local function attemptJump(direction)
    if gameState ~= "RUNNING" or jumping then
        return
    end

    local target = platforms[2]
    if not target then
        return
    end

    jumping = true
    local wantedLane = currentLane + direction

    if wantedLane == target.lane then
        task.spawn(function()
            successfulJump(target)
        end)
    else
        task.spawn(function()
            failedJump(direction)
        end)
    end
end

-- 입력
leftButton.Activated:Connect(function()
    attemptJump(-1)
end)

rightButton.Activated:Connect(function()
    attemptJump(1)
end)

startButton.Activated:Connect(function()
    beginRun()
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then
        return
    end

    if input.KeyCode == Enum.KeyCode.Left or input.KeyCode == Enum.KeyCode.A then
        attemptJump(-1)
    elseif input.KeyCode == Enum.KeyCode.Right or input.KeyCode == Enum.KeyCode.D then
        attemptJump(1)
    end
end)

-- 메인
math.randomseed(os.time() + player.UserId)
resetRun()
gameState = "MENU"
setControlsEnabled(false)
showMenu("MENU")
updateHud()
