-- 파일명: roblox-games/card-grid-duel/client/Game.client.luau
-- 역할: 모바일 우선 5×5 보드/손패 UI와 터치 입력

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
player:SetAttribute("JaewoonTouchEnabled", UserInputService.TouchEnabled)

local remotes = ReplicatedStorage:WaitForChild("CardGridRemotes")
local actionRemote = remotes:WaitForChild("Action")
local stateRemote = remotes:WaitForChild("State")
local toastRemote = remotes:WaitForChild("Toast")
local requestState = remotes:WaitForChild("RequestState")

local currentState = nil
local selectedUnitId = nil
local selectedCardIndex = nil
local cellButtons = {}
local handButtons = {}

local function newTextLabel(parent, name, text, size, position)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.BackgroundTransparency = 1
    label.Text = text
    label.TextColor3 = Color3.fromRGB(238, 242, 255)
    label.TextScaled = true
    label.Font = Enum.Font.GothamBold
    label.Size = size
    label.Position = position
    label.Parent = parent

    local constraint = Instance.new("UITextSizeConstraint")
    constraint.MinTextSize = 10
    constraint.MaxTextSize = 22
    constraint.Parent = label

    return label
end

local function round(frame, radius)
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, radius)
    corner.Parent = frame
end

local gui = Instance.new("ScreenGui")
gui.Name = "CardGridDuelGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local root = Instance.new("Frame")
root.Name = "Root"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(13, 18, 28)
root.BorderSizePixel = 0
root.Parent = gui

local title = newTextLabel(root, "Title", "카드 격자전", UDim2.fromScale(0.58, 0.055), UDim2.fromScale(0.03, 0.02))
title.TextXAlignment = Enum.TextXAlignment.Left

local turnLabel = newTextLabel(root, "Turn", "상대 기다리는 중", UDim2.fromScale(0.36, 0.055), UDim2.fromScale(0.61, 0.02))
turnLabel.TextXAlignment = Enum.TextXAlignment.Right

local playersLabel = newTextLabel(root, "Players", "", UDim2.fromScale(0.94, 0.035), UDim2.fromScale(0.03, 0.075))
playersLabel.TextXAlignment = Enum.TextXAlignment.Left
playersLabel.TextColor3 = Color3.fromRGB(170, 184, 210)

local statusLabel = newTextLabel(root, "Status", "1대1 매칭 중...", UDim2.fromScale(0.94, 0.045), UDim2.fromScale(0.03, 0.11))
statusLabel.TextColor3 = Color3.fromRGB(255, 219, 120)

local boardFrame = Instance.new("Frame")
boardFrame.Name = "Board"
boardFrame.AnchorPoint = Vector2.new(0.5, 0)
boardFrame.Position = UDim2.fromScale(0.5, 0.165)
boardFrame.Size = UDim2.fromScale(0.92, 0.55)
boardFrame.BackgroundColor3 = Color3.fromRGB(36, 44, 59)
boardFrame.BorderSizePixel = 0
boardFrame.Parent = root
round(boardFrame, 14)

local boardAspect = Instance.new("UIAspectRatioConstraint")
boardAspect.AspectRatio = 1
boardAspect.DominantAxis = Enum.DominantAxis.Width
boardAspect.Parent = boardFrame

local boardPadding = Instance.new("UIPadding")
boardPadding.PaddingTop = UDim.new(0, 6)
boardPadding.PaddingBottom = UDim.new(0, 6)
boardPadding.PaddingLeft = UDim.new(0, 6)
boardPadding.PaddingRight = UDim.new(0, 6)
boardPadding.Parent = boardFrame

local boardGrid = Instance.new("UIGridLayout")
boardGrid.CellPadding = UDim2.new(0.012, 0, 0.012, 0)
boardGrid.CellSize = UDim2.new(0.1904, 0, 0.1904, 0)
boardGrid.FillDirectionMaxCells = 5
boardGrid.SortOrder = Enum.SortOrder.LayoutOrder
boardGrid.Parent = boardFrame

local handFrame = Instance.new("Frame")
handFrame.Name = "Hand"
handFrame.AnchorPoint = Vector2.new(0.5, 1)
handFrame.Position = UDim2.fromScale(0.5, 0.91)
handFrame.Size = UDim2.fromScale(0.94, 0.18)
handFrame.BackgroundColor3 = Color3.fromRGB(24, 31, 44)
handFrame.BorderSizePixel = 0
handFrame.Parent = root
round(handFrame, 12)

local handPadding = Instance.new("UIPadding")
handPadding.PaddingTop = UDim.new(0, 7)
handPadding.PaddingBottom = UDim.new(0, 7)
handPadding.PaddingLeft = UDim.new(0, 7)
handPadding.PaddingRight = UDim.new(0, 7)
handPadding.Parent = handFrame

local handLayout = Instance.new("UIListLayout")
handLayout.FillDirection = Enum.FillDirection.Horizontal
handLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
handLayout.VerticalAlignment = Enum.VerticalAlignment.Center
handLayout.Padding = UDim.new(0.012, 0)
handLayout.Parent = handFrame

local endTurnButton = Instance.new("TextButton")
endTurnButton.Name = "EndTurn"
endTurnButton.AnchorPoint = Vector2.new(1, 1)
endTurnButton.Position = UDim2.fromScale(0.97, 0.985)
endTurnButton.Size = UDim2.fromScale(0.27, 0.06)
endTurnButton.BackgroundColor3 = Color3.fromRGB(69, 99, 255)
endTurnButton.TextColor3 = Color3.new(1, 1, 1)
endTurnButton.Font = Enum.Font.GothamBold
endTurnButton.Text = "턴 종료"
endTurnButton.TextScaled = true
endTurnButton.BorderSizePixel = 0
endTurnButton.Parent = root
round(endTurnButton, 10)

local endConstraint = Instance.new("UITextSizeConstraint")
endConstraint.MinTextSize = 11
endConstraint.MaxTextSize = 20
endConstraint.Parent = endTurnButton

local helpLabel = newTextLabel(root, "Help", "유닛 선택 → 빈칸 이동 / 적 선택 공격", UDim2.fromScale(0.64, 0.05), UDim2.fromScale(0.03, 0.935))
helpLabel.TextXAlignment = Enum.TextXAlignment.Left
helpLabel.TextColor3 = Color3.fromRGB(142, 156, 183)

local function makeCell(index)
    local button = Instance.new("TextButton")
    button.Name = "Cell" .. index
    button.LayoutOrder = index
    button.AutoButtonColor = false
    button.BackgroundColor3 = Color3.fromRGB(52, 62, 80)
    button.BorderSizePixel = 0
    button.Text = ""
    button.TextWrapped = true
    button.TextScaled = true
    button.Font = Enum.Font.GothamBold
    button.TextColor3 = Color3.new(1, 1, 1)
    button.Parent = boardFrame
    round(button, 8)

    local stroke = Instance.new("UIStroke")
    stroke.Name = "SelectionStroke"
    stroke.Thickness = 2
    stroke.Transparency = 1
    stroke.Color = Color3.fromRGB(255, 222, 105)
    stroke.Parent = button

    local textConstraint = Instance.new("UITextSizeConstraint")
    textConstraint.MinTextSize = 9
    textConstraint.MaxTextSize = 18
    textConstraint.Parent = button

    cellButtons[index] = button
end

for i = 1, 25 do
    makeCell(i)
end

local function indexFor(row, col)
    return (row - 1) * 5 + col
end

local function findUnitAt(row, col)
    if not currentState or not currentState.units then
        return nil
    end
    for _, unit in ipairs(currentState.units) do
        if unit.row == row and unit.col == col then
            return unit
        end
    end
    return nil
end

local function findUnitById(unitId)
    if not currentState or not currentState.units then
        return nil
    end
    for _, unit in ipairs(currentState.units) do
        if unit.id == unitId then
            return unit
        end
    end
    return nil
end

local function clearHandButtons()
    for _, button in ipairs(handButtons) do
        button:Destroy()
    end
    table.clear(handButtons)
end

local function setStatus(text)
    statusLabel.Text = text
end

local function isMyTurn()
    return currentState
        and not currentState.waiting
        and not currentState.winnerSide
        and currentState.currentSide == currentState.youSide
end

local function renderHand()
    clearHandButtons()

    if not currentState or currentState.waiting then
        handFrame.Visible = false
        return
    end

    handFrame.Visible = true
    local hand = currentState.hand or {}
    for index, card in ipairs(hand) do
        local button = Instance.new("TextButton")
        button.Name = "Card" .. index
        button.Size = UDim2.new(0.185, 0, 0.9, 0)
        button.BackgroundColor3 = index == selectedCardIndex
            and Color3.fromRGB(178, 137, 48)
            or Color3.fromRGB(46, 57, 76)
        button.BorderSizePixel = 0
        button.AutoButtonColor = true
        button.TextColor3 = Color3.new(1, 1, 1)
        button.Font = Enum.Font.GothamBold
        button.TextWrapped = true
        button.TextScaled = true
        button.Text = card.name
            .. "\nHP " .. card.hp
            .. "  공격 " .. card.damage
            .. "\n사거리 " .. card.range
        button.Parent = handFrame
        round(button, 8)

        local constraint = Instance.new("UITextSizeConstraint")
        constraint.MinTextSize = 8
        constraint.MaxTextSize = 15
        constraint.Parent = button

        button.Activated:Connect(function()
            if not isMyTurn() then
                setStatus("지금은 상대 턴이야.")
                return
            end
            if currentState.summonUsed then
                setStatus("이번 턴에는 이미 소환했어.")
                return
            end
            selectedUnitId = nil
            selectedCardIndex = index
            setStatus(card.name .. " 선택 · 자기 진영 첫 줄의 빈칸을 눌러")
            renderHand()
            for cellIndex, cellButton in ipairs(cellButtons) do
                local row = math.floor((cellIndex - 1) / 5) + 1
                local stroke = cellButton:FindFirstChild("SelectionStroke")
                if stroke then
                    stroke.Transparency = row == currentState.homeRow and not findUnitAt(row, ((cellIndex - 1) % 5) + 1) and 0 or 1
                end
            end
        end)

        table.insert(handButtons, button)
    end
end

local function renderBoard()
    for index, button in ipairs(cellButtons) do
        local row = math.floor((index - 1) / 5) + 1
        local col = ((index - 1) % 5) + 1
        local unit = findUnitAt(row, col)
        local stroke = button:FindFirstChild("SelectionStroke")

        if unit then
            local isMine = currentState and unit.side == currentState.youSide
            if unit.side == "BLUE" then
                button.BackgroundColor3 = Color3.fromRGB(52, 91, 165)
            else
                button.BackgroundColor3 = Color3.fromRGB(153, 65, 69)
            end

            local flags = ""
            if unit.frozen then
                flags ..= "\n봉인"
            elseif unit.id == selectedUnitId then
                flags ..= "\n선택"
            elseif unit.moved and unit.attacked then
                flags ..= "\n행동완료"
            end

            button.Text = unit.short
                .. "  " .. unit.hp .. "/" .. unit.maxHp
                .. "\n공" .. unit.damage .. "  사" .. unit.range
                .. flags
            button.TextTransparency = isMine and 0 or 0.02
        else
            if currentState and row == currentState.homeRow then
                button.BackgroundColor3 = Color3.fromRGB(57, 74, 68)
            else
                button.BackgroundColor3 = Color3.fromRGB(52, 62, 80)
            end
            button.Text = ""
        end

        if stroke then
            stroke.Transparency = unit and unit.id == selectedUnitId and 0 or 1
        end
    end
end

local function renderHeader()
    if not currentState or currentState.waiting then
        turnLabel.Text = "매칭 대기"
        playersLabel.Text = "상대를 찾는 중..."
        endTurnButton.Visible = false
        return
    end

    local blueName = currentState.players and currentState.players.BLUE or "파랑"
    local redName = currentState.players and currentState.players.RED or "빨강"
    playersLabel.Text = "파랑 " .. blueName .. "  VS  빨강 " .. redName
    endTurnButton.Visible = not currentState.winnerSide

    if currentState.winnerSide then
        turnLabel.Text = "대전 종료"
        setStatus((currentState.winnerName or "") .. " 승리")
        return
    end

    local myTurn = currentState.currentSide == currentState.youSide
    turnLabel.Text = "턴 " .. tostring(currentState.turn) .. (myTurn and " · 내 턴" or " · 상대 턴")

    if myTurn then
        if selectedCardIndex then
            setStatus("카드 선택됨 · 자기 진영 첫 줄에 소환")
        elseif selectedUnitId then
            local unit = findUnitById(selectedUnitId)
            if unit then
                setStatus(unit.name .. " 선택 · 1칸 이동하거나 사거리 안 적을 공격")
            else
                selectedUnitId = nil
                setStatus("내 턴")
            end
        else
            setStatus("내 턴 · 카드 소환 또는 유닛 선택")
        end
    else
        selectedCardIndex = nil
        selectedUnitId = nil
        setStatus("상대 행동을 기다리는 중...")
    end
end

local function render()
    renderHeader()
    renderBoard()
    renderHand()
end

local function clickCell(row, col)
    if not currentState or currentState.waiting or currentState.winnerSide then
        return
    end
    if not isMyTurn() then
        setStatus("지금은 상대 턴이야.")
        return
    end

    local unit = findUnitAt(row, col)

    if selectedCardIndex then
        if row ~= currentState.homeRow then
            setStatus("자기 진영 첫 줄에만 소환할 수 있어.")
            return
        end
        if unit then
            setStatus("이미 유닛이 있는 칸이야.")
            return
        end

        actionRemote:FireServer({
            type = "SUMMON",
            cardIndex = selectedCardIndex,
            row = row,
            col = col,
        })
        selectedCardIndex = nil
        return
    end

    if unit and unit.side == currentState.youSide then
        selectedUnitId = unit.id
        setStatus(unit.name .. " 선택")
        render()
        return
    end

    if not selectedUnitId then
        setStatus("먼저 내 유닛이나 카드를 선택해.")
        return
    end

    if unit then
        actionRemote:FireServer({
            type = "ATTACK",
            unitId = selectedUnitId,
            targetUnitId = unit.id,
        })
    else
        actionRemote:FireServer({
            type = "MOVE",
            unitId = selectedUnitId,
            row = row,
            col = col,
        })
    end
end

for index, button in ipairs(cellButtons) do
    button.Activated:Connect(function()
        local row = math.floor((index - 1) / 5) + 1
        local col = ((index - 1) % 5) + 1
        clickCell(row, col)
    end)
end

endTurnButton.Activated:Connect(function()
    if isMyTurn() then
        selectedUnitId = nil
        selectedCardIndex = nil
        actionRemote:FireServer({
            type = "END_TURN",
        })
    else
        setStatus("지금은 상대 턴이야.")
    end
end)

stateRemote.OnClientEvent:Connect(function(snapshot)
    if type(snapshot) ~= "table" then
        return
    end
    currentState = snapshot

    if selectedUnitId and not findUnitById(selectedUnitId) then
        selectedUnitId = nil
    end
    if selectedCardIndex and currentState.hand and selectedCardIndex > #currentState.hand then
        selectedCardIndex = nil
    end

    render()
end)

toastRemote.OnClientEvent:Connect(function(message)
    if type(message) == "string" then
        setStatus(message)
    end
end)

local ok, snapshot = pcall(function()
    return requestState:InvokeServer()
end)

if ok and type(snapshot) == "table" then
    currentState = snapshot
end

render()
