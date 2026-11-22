-- 파일명: roblox-games/rpg-adventure/client/Game.client.luau
-- 임포트: 기본 Roblox 아바타·카메라·모바일 이동을 유지
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local remote = ReplicatedStorage:WaitForChild(Config.RemoteName)
player:SetAttribute("JaewoonTouchEnabled", UserInputService.TouchEnabled)

-- 메인: 별도 이미지/허가되지 않은 모델 대신 순수 GUI 전투 조작
local gui = Instance.new("ScreenGui")
gui.Name = "RpgHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 5
gui.Parent = player:WaitForChild("PlayerGui")

local function panel(name, parent, size, position, anchor)
    local frame = Instance.new("Frame")
    frame.Name = name
    frame.Size = size
    frame.Position = position
    frame.AnchorPoint = anchor or Vector2.zero
    frame.BackgroundColor3 = Color3.fromRGB(19, 28, 39)
    frame.BackgroundTransparency = 0.12
    frame.BorderSizePixel = 0
    frame.Parent = parent
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 11)
    corner.Parent = frame
    return frame
end

local function text(parent, name, value, size, position, color)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.BackgroundTransparency = 1
    label.Size = size
    label.Position = position
    label.Font = Enum.Font.GothamBold
    label.Text = value
    label.TextColor3 = color or Color3.fromRGB(239, 245, 250)
    label.TextScaled = true
    label.TextXAlignment = Enum.TextXAlignment.Left
    label.Parent = parent
    return label
end

local function button(parent, name, value, position, size, onClick)
    local control = Instance.new("TextButton")
    control.Name = name
    control.Text = value
    control.Size = size
    control.Position = position
    control.BackgroundColor3 = Color3.fromRGB(46, 91, 116)
    control.TextColor3 = Color3.fromRGB(255, 255, 255)
    control.TextScaled = true
    control.Font = Enum.Font.GothamBold
    control.BorderSizePixel = 0
    control.AutoButtonColor = true
    control.Parent = parent
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 10)
    corner.Parent = control
    control.Activated:Connect(onClick)
    return control
end

local stats = panel("PlayerStatus", gui, UDim2.new(1, -20, 0, 135), UDim2.new(0, 10, 0, 10))
local title = text(stats, "Title", "모험 RPG | 수련장에서 성장", UDim2.new(1, -16, 0, 24), UDim2.new(0, 8, 0, 7), Color3.fromRGB(245, 219, 132))
local levelLine = text(stats, "Level", "", UDim2.new(1, -16, 0, 24), UDim2.new(0, 8, 0, 35))
local healthLine = text(stats, "Health", "", UDim2.new(1, -16, 0, 22), UDim2.new(0, 8, 0, 62))
local enemyLine = text(stats, "Training", "", UDim2.new(1, -16, 0, 22), UDim2.new(0, 8, 0, 87), Color3.fromRGB(244, 166, 142))
local questLine = text(stats, "Quest", "", UDim2.new(1, -16, 0, 17), UDim2.new(0, 8, 0, 113), Color3.fromRGB(178, 210, 239))

local notice = text(gui, "Notice", "첫 공격으로 수련 시작", UDim2.new(1, -24, 0, 30), UDim2.new(0, 12, 0, 148), Color3.fromRGB(255, 228, 153))
notice.TextXAlignment = Enum.TextXAlignment.Center
notice.TextStrokeTransparency = 0.3

local shop = panel("Growth", gui, UDim2.new(0, 204, 0, 92), UDim2.new(0, 10, 0, 188))
local modeButton = button(shop, "Mode", "수련 / 대련", UDim2.new(0, 8, 0, 6), UDim2.new(1, -16, 0, 34), function()
    remote:FireServer("MODE")
end)
button(shop, "Weapon", "장비 강화", UDim2.new(0, 8, 0, 47), UDim2.new(0.5, -12, 0, 36), function()
    remote:FireServer("UPGRADE")
end)
button(shop, "PotionShop", "물약 구매", UDim2.new(0.5, 4, 0, 47), UDim2.new(0.5, -12, 0, 36), function()
    remote:FireServer("BUY_POTION")
end)

local actions = panel("Actions", gui, UDim2.new(0, 208, 0, 146), UDim2.new(1, -12, 1, -112), Vector2.new(1, 1))
button(actions, "Attack", "공격", UDim2.new(0, 6, 0, 6), UDim2.new(0.5, -9, 0, 63), function()
    remote:FireServer("ATTACK")
end)
button(actions, "Skill", "강타", UDim2.new(0.5, 3, 0, 6), UDim2.new(0.5, -9, 0, 63), function()
    remote:FireServer("SKILL")
end)
button(actions, "Guard", "방어", UDim2.new(0, 6, 0, 75), UDim2.new(0.5, -9, 0, 63), function()
    remote:FireServer("GUARD")
end)
button(actions, "Heal", "회복", UDim2.new(0.5, 3, 0, 75), UDim2.new(0.5, -9, 0, 63), function()
    remote:FireServer("POTION")
end)

-- 유틸: 클라이언트는 표시만, 전투·보상·구매 판단 없음
local humanoid
local hpSignal
local function refresh()
    local lvl = player:GetAttribute("Level") or 1
    local exp = player:GetAttribute("XP") or 0
    local gold = player:GetAttribute("Gold") or 0
    local weapon = player:GetAttribute("Weapon") or 1
    local potion = player:GetAttribute("Potions") or 0
    local wins = player:GetAttribute("TrainingWins") or 0
    local quest = player:GetAttribute("QuestStage") or 1
    local mode = player:GetAttribute("BattleMode") or "TRAIN"
    levelLine.Text = string.format("Lv.%d  경험치 %d/%d  골드 %d", lvl, exp, 60 + lvl * 40, gold)
    local hp = humanoid and math.floor(humanoid.Health) or 0
    local maxHp = humanoid and math.floor(humanoid.MaxHealth) or 100
    healthLine.Text = string.format("체력 %d/%d  장비 +%d  물약 %d  저장: %s", hp, maxHp, weapon, potion, player:GetAttribute("SaveStatus") or "...")
    modeButton.Text = mode == "DUEL" and "대련 중 (누르면 수련)" or "수련 중 (누르면 대련)"
    if mode == "TRAIN" then
        enemyLine.Text = string.format("수련 %d회  상대 체력 %d/%d", player:GetAttribute("TrainWave") or 0, player:GetAttribute("TrainHP") or 0, player:GetAttribute("TrainMaxHP") or 0)
    else
        enemyLine.Text = "대련: 가까운 동의 플레이어만 공격 가능"
    end
    questLine.Text = string.format("목표: 수련 %d회 완료 (%d회 달성) | 대련 승리 %d회", quest * 3, wins, player:GetAttribute("DuelWins") or 0)
end

local function bindCharacter(character)
    if hpSignal then hpSignal:Disconnect(); hpSignal = nil end
    humanoid = character:WaitForChild("Humanoid", 10)
    if humanoid then hpSignal = humanoid.HealthChanged:Connect(refresh) end
    refresh()
end

local fields = {"Level", "XP", "Gold", "Weapon", "Potions", "TrainingWins", "QuestStage", "DuelWins", "TrainWave", "TrainHP", "TrainMaxHP", "BattleMode", "SaveStatus"}
for _, field in ipairs(fields) do
    player:GetAttributeChangedSignal(field):Connect(refresh)
end
player.CharacterAdded:Connect(bindCharacter)
if player.Character then bindCharacter(player.Character) end
refresh()

remote.OnClientEvent:Connect(function(kind, message)
    if kind == "NOTICE" and typeof(message) == "string" then
        notice.Text = string.sub(message, 1, 100)
    end
end)

UserInputService.InputBegan:Connect(function(input, processed)
    if processed or UserInputService:GetFocusedTextBox() then return end
    local map = {
        [Enum.KeyCode.Q] = "ATTACK",
        [Enum.KeyCode.E] = "SKILL",
        [Enum.KeyCode.R] = "GUARD",
        [Enum.KeyCode.F] = "POTION",
        [Enum.KeyCode.T] = "MODE",
    }
    local action = map[input.KeyCode]
    if action then remote:FireServer(action) end
end)
