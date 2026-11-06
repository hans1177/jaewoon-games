-- 파일명: roblox-games/card-grid-duel/server/Game.server.luau
-- 역할: 1대1 매칭, 턴/이동/공격/카드 소환을 서버 권한으로 판정

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Config = require(Shared:WaitForChild("GameConfig"))

local remotes = ReplicatedStorage:FindFirstChild("CardGridRemotes")
if not remotes then
    remotes = Instance.new("Folder")
    remotes.Name = "CardGridRemotes"
    remotes.Parent = ReplicatedStorage
end

local actionRemote = remotes:FindFirstChild("Action")
if not actionRemote then
    actionRemote = Instance.new("RemoteEvent")
    actionRemote.Name = "Action"
    actionRemote.Parent = remotes
end

local stateRemote = remotes:FindFirstChild("State")
if not stateRemote then
    stateRemote = Instance.new("RemoteEvent")
    stateRemote.Name = "State"
    stateRemote.Parent = remotes
end

local toastRemote = remotes:FindFirstChild("Toast")
if not toastRemote then
    toastRemote = Instance.new("RemoteEvent")
    toastRemote.Name = "Toast"
    toastRemote.Parent = remotes
end

local requestState = remotes:FindFirstChild("RequestState")
if not requestState then
    requestState = Instance.new("RemoteFunction")
    requestState.Name = "RequestState"
    requestState.Parent = remotes
end

game:SetAttribute("JaewoonPlatform", "ROBLOX")
game:SetAttribute("JaewoonServerRuntime", true)
game:SetAttribute("JaewoonStudioRuntime", RunService:IsStudio())
game:SetAttribute("JaewoonGameId", Config.GameId)
game:SetAttribute("JaewoonMultiplayer", true)

local waitingQueue = {}
local playerMatch = {}
local matches = {}

local function copyArray(source)
    local result = {}
    for i, value in ipairs(source) do
        result[i] = value
    end
    return result
end

local function shuffle(list)
    for i = #list, 2, -1 do
        local j = math.random(1, i)
        list[i], list[j] = list[j], list[i]
    end
end

local function buildDeck(side)
    local deck = {}
    for _ = 1, Config.DeckCopiesPerCard do
        for _, card in ipairs(Config.Cards[side]) do
            table.insert(deck, card.Id)
        end
    end
    shuffle(deck)
    return deck
end

local function drawCard(matchState, side)
    local hand = matchState.hands[side]
    local deck = matchState.decks[side]
    if #hand >= Config.MaxHand or #deck == 0 then
        return false
    end
    table.insert(hand, table.remove(deck, 1))
    return true
end

local function drawStartingHand(matchState, side)
    for _ = 1, Config.StartingHand do
        drawCard(matchState, side)
    end
end

local function isInside(row, col)
    return row >= 1 and row <= Config.BoardSize and col >= 1 and col <= Config.BoardSize
end

local function distance(rowA, colA, rowB, colB)
    return math.abs(rowA - rowB) + math.abs(colA - colB)
end

local function getUnitAt(matchState, row, col)
    for _, unit in pairs(matchState.units) do
        if unit.row == row and unit.col == col then
            return unit
        end
    end
    return nil
end

local function findPlayerSide(matchState, player)
    if matchState.players.BLUE == player then
        return "BLUE"
    end
    if matchState.players.RED == player then
        return "RED"
    end
    return nil
end

local function countUnits(matchState, side)
    local count = 0
    for _, unit in pairs(matchState.units) do
        if unit.side == side then
            count += 1
        end
    end
    return count
end

local function isArmyExhausted(matchState, side)
    return countUnits(matchState, side) == 0
        and #matchState.hands[side] == 0
        and #matchState.decks[side] == 0
end

local function getPlayerName(player)
    if not player then
        return ""
    end
    return player.DisplayName
end

local function cardView(side, cardId)
    local card = Config.GetCard(side, cardId)
    if not card then
        return nil
    end
    return {
        id = card.Id,
        name = card.Name,
        short = card.Short,
        hp = card.MaxHp,
        damage = card.Damage,
        range = card.Range,
        description = card.Description,
    }
end

local function unitView(unit)
    local card = Config.GetCard(unit.side, unit.cardId)
    return {
        id = unit.id,
        side = unit.side,
        cardId = unit.cardId,
        name = card and card.Name or unit.cardId,
        short = card and card.Short or "?",
        hp = unit.hp,
        maxHp = card and card.MaxHp or unit.hp,
        damage = card and card.Damage or 0,
        range = card and card.Range or 1,
        row = unit.row,
        col = unit.col,
        moved = unit.moved,
        attacked = unit.attacked,
        frozen = unit.frozenThisTurn == true,
    }
end

local function buildSnapshot(matchState, player)
    local side = findPlayerSide(matchState, player)
    if not side then
        return {
            waiting = true,
            gameId = Config.GameId,
            displayName = Config.DisplayName,
        }
    end

    local boardUnits = {}
    for _, unit in pairs(matchState.units) do
        table.insert(boardUnits, unitView(unit))
    end
    table.sort(boardUnits, function(a, b)
        if a.row == b.row then
            return a.col < b.col
        end
        return a.row < b.row
    end)

    local hand = {}
    for _, cardId in ipairs(matchState.hands[side]) do
        local view = cardView(side, cardId)
        if view then
            table.insert(hand, view)
        end
    end

    local enemySide = Config.OtherSide(side)
    return {
        waiting = false,
        gameId = Config.GameId,
        displayName = Config.DisplayName,
        matchId = matchState.id,
        youSide = side,
        currentSide = matchState.currentSide,
        turn = matchState.turn,
        summonUsed = matchState.summonUsed,
        winnerSide = matchState.winnerSide,
        winnerName = matchState.winnerSide and getPlayerName(matchState.players[matchState.winnerSide]) or "",
        homeRow = Config.HomeRows[side],
        hand = hand,
        deckCount = #matchState.decks[side],
        enemyHandCount = #matchState.hands[enemySide],
        enemyDeckCount = #matchState.decks[enemySide],
        units = boardUnits,
        players = {
            BLUE = getPlayerName(matchState.players.BLUE),
            RED = getPlayerName(matchState.players.RED),
        },
    }
end

local function sendState(matchState)
    for _, side in ipairs(Config.SideOrder) do
        local player = matchState.players[side]
        if player and player.Parent == Players then
            stateRemote:FireClient(player, buildSnapshot(matchState, player))
        end
    end
end

local function sendToast(player, message)
    if player and player.Parent == Players then
        toastRemote:FireClient(player, message)
    end
end

local function sendBothToast(matchState, message)
    sendToast(matchState.players.BLUE, message)
    sendToast(matchState.players.RED, message)
end

local function startSideTurn(matchState, side, shouldDraw)
    matchState.currentSide = side
    matchState.summonUsed = false

    if shouldDraw then
        drawCard(matchState, side)
    end

    for _, unit in pairs(matchState.units) do
        if unit.side == side then
            unit.moved = false
            unit.attacked = false
            unit.frozenThisTurn = false
            if (unit.frozenTurns or 0) > 0 then
                unit.frozenThisTurn = true
                unit.frozenTurns -= 1
            end
        end
    end
end

local function finishMatch(matchState, winnerSide, reason)
    if matchState.winnerSide then
        return
    end
    matchState.winnerSide = winnerSide
    local winner = matchState.players[winnerSide]
    local winnerName = getPlayerName(winner)
    sendBothToast(matchState, winnerName .. " 승리! " .. reason)
    sendState(matchState)
end

local function checkVictory(matchState)
    for _, side in ipairs(Config.SideOrder) do
        if isArmyExhausted(matchState, side) then
            finishMatch(matchState, Config.OtherSide(side), "상대 카드 전멸")
            return true
        end
    end
    return false
end

local function createMatch(bluePlayer, redPlayer)
    local matchState = {
        id = HttpService:GenerateGUID(false),
        players = {
            BLUE = bluePlayer,
            RED = redPlayer,
        },
        decks = {
            BLUE = buildDeck("BLUE"),
            RED = buildDeck("RED"),
        },
        hands = {
            BLUE = {},
            RED = {},
        },
        units = {},
        currentSide = "BLUE",
        turn = 1,
        summonUsed = false,
        winnerSide = nil,
    }

    drawStartingHand(matchState, "BLUE")
    drawStartingHand(matchState, "RED")
    startSideTurn(matchState, "BLUE", false)

    matches[matchState.id] = matchState
    playerMatch[bluePlayer.UserId] = matchState
    playerMatch[redPlayer.UserId] = matchState

    sendBothToast(matchState, "대전 시작! 파랑 팀부터 진행")
    sendState(matchState)

    print("[카드 격자전] 매칭 시작", bluePlayer.Name, redPlayer.Name, matchState.id)
end

local function removeFromQueue(player)
    for i = #waitingQueue, 1, -1 do
        if waitingQueue[i] == player then
            table.remove(waitingQueue, i)
        end
    end
end

local function tryMatchmake()
    while #waitingQueue >= 2 do
        local bluePlayer = table.remove(waitingQueue, 1)
        local redPlayer = table.remove(waitingQueue, 1)

        if bluePlayer.Parent == Players and redPlayer.Parent == Players then
            createMatch(bluePlayer, redPlayer)
        else
            if bluePlayer.Parent == Players then
                table.insert(waitingQueue, bluePlayer)
            end
            if redPlayer.Parent == Players then
                table.insert(waitingQueue, redPlayer)
            end
        end
    end
end

local function enqueue(player)
    if playerMatch[player.UserId] then
        return
    end
    removeFromQueue(player)
    table.insert(waitingQueue, player)
    stateRemote:FireClient(player, {
        waiting = true,
        gameId = Config.GameId,
        displayName = Config.DisplayName,
    })
    sendToast(player, "상대를 기다리는 중...")
    tryMatchmake()
end

local function getMatchForAction(player)
    local matchState = playerMatch[player.UserId]
    if not matchState then
        sendToast(player, "아직 상대가 연결되지 않았어.")
        return nil, nil
    end
    if matchState.winnerSide then
        sendToast(player, "이미 끝난 대전이야.")
        return nil, nil
    end

    local side = findPlayerSide(matchState, player)
    if not side then
        return nil, nil
    end
    if matchState.currentSide ~= side then
        sendToast(player, "상대 턴이야.")
        return nil, nil
    end
    return matchState, side
end

local function handleSummon(player, payload)
    local matchState, side = getMatchForAction(player)
    if not matchState then
        return
    end
    if matchState.summonUsed then
        sendToast(player, "이번 턴에는 이미 소환했어.")
        return
    end

    local index = math.floor(tonumber(payload.cardIndex) or 0)
    local row = math.floor(tonumber(payload.row) or 0)
    local col = math.floor(tonumber(payload.col) or 0)

    if index < 1 or index > #matchState.hands[side] then
        return
    end
    if not isInside(row, col) or row ~= Config.HomeRows[side] then
        sendToast(player, "자기 진영 첫 줄에만 소환할 수 있어.")
        return
    end
    if getUnitAt(matchState, row, col) then
        sendToast(player, "이미 유닛이 있는 칸이야.")
        return
    end

    local cardId = matchState.hands[side][index]
    local card = Config.GetCard(side, cardId)
    if not card then
        return
    end

    table.remove(matchState.hands[side], index)
    local unitId = HttpService:GenerateGUID(false)
    matchState.units[unitId] = {
        id = unitId,
        side = side,
        cardId = cardId,
        hp = card.MaxHp,
        row = row,
        col = col,
        moved = false,
        attacked = false,
        frozenTurns = 0,
        frozenThisTurn = false,
    }
    matchState.summonUsed = true
    sendState(matchState)
end

local function handleMove(player, payload)
    local matchState, side = getMatchForAction(player)
    if not matchState then
        return
    end

    local unitId = tostring(payload.unitId or "")
    local row = math.floor(tonumber(payload.row) or 0)
    local col = math.floor(tonumber(payload.col) or 0)
    local unit = matchState.units[unitId]

    if not unit or unit.side ~= side then
        return
    end
    if unit.frozenThisTurn then
        sendToast(player, "이 유닛은 이번 턴에 봉인됐어.")
        return
    end
    if unit.moved then
        sendToast(player, "이 유닛은 이미 이동했어.")
        return
    end
    if not isInside(row, col) or getUnitAt(matchState, row, col) then
        return
    end
    if distance(unit.row, unit.col, row, col) ~= 1 then
        sendToast(player, "한 번에 1칸만 이동할 수 있어.")
        return
    end

    unit.row = row
    unit.col = col
    unit.moved = true
    sendState(matchState)
end

local function applyDamage(matchState, target, amount)
    local targetCard = Config.GetCard(target.side, target.cardId)
    local finalDamage = amount

    if targetCard and targetCard.DamageReduction then
        finalDamage = math.max(1, math.floor(amount * (1 - targetCard.DamageReduction) + 0.5))
    end

    target.hp -= finalDamage
    if target.hp <= 0 then
        matchState.units[target.id] = nil
        return true, finalDamage
    end
    return false, finalDamage
end

local function handleAttack(player, payload)
    local matchState, side = getMatchForAction(player)
    if not matchState then
        return
    end

    local attacker = matchState.units[tostring(payload.unitId or "")]
    local target = matchState.units[tostring(payload.targetUnitId or "")]

    if not attacker or attacker.side ~= side then
        return
    end
    if not target or target.side == side then
        return
    end
    if attacker.frozenThisTurn then
        sendToast(player, "이 유닛은 이번 턴에 봉인됐어.")
        return
    end
    if attacker.attacked then
        sendToast(player, "이 유닛은 이미 공격했어.")
        return
    end

    local card = Config.GetCard(attacker.side, attacker.cardId)
    if not card then
        return
    end
    if distance(attacker.row, attacker.col, target.row, target.col) > card.Range then
        sendToast(player, "공격 사거리 밖이야.")
        return
    end

    local targetRow = target.row
    local targetCol = target.col
    local targetId = target.id
    local targetWasKilled = applyDamage(matchState, target, card.Damage)

    if card.SplashDamage then
        local splashTargets = {}
        for _, unit in pairs(matchState.units) do
            if unit.side ~= side
                and unit.id ~= targetId
                and distance(targetRow, targetCol, unit.row, unit.col) <= 1
            then
                table.insert(splashTargets, unit)
            end
        end
        for _, splashTarget in ipairs(splashTargets) do
            applyDamage(matchState, splashTarget, card.SplashDamage)
        end
    end

    if card.FreezeChance and not targetWasKilled then
        local survivingTarget = matchState.units[targetId]
        if survivingTarget and math.random() <= card.FreezeChance then
            survivingTarget.frozenTurns = math.max(survivingTarget.frozenTurns or 0, 1)
            sendToast(matchState.players[survivingTarget.side], "흑마법사에게 맞아 다음 턴 행동이 봉인돼.")
        end
    end

    attacker = matchState.units[attacker.id]
    if attacker then
        attacker.attacked = true
    end

    if not checkVictory(matchState) then
        sendState(matchState)
    end
end

local function handleEndTurn(player)
    local matchState, side = getMatchForAction(player)
    if not matchState then
        return
    end

    local nextSide = Config.OtherSide(side)
    matchState.turn += 1
    startSideTurn(matchState, nextSide, true)
    sendState(matchState)
end

actionRemote.OnServerEvent:Connect(function(player, payload)
    if type(payload) ~= "table" then
        return
    end

    local actionType = tostring(payload.type or "")
    if actionType == "SUMMON" then
        handleSummon(player, payload)
    elseif actionType == "MOVE" then
        handleMove(player, payload)
    elseif actionType == "ATTACK" then
        handleAttack(player, payload)
    elseif actionType == "END_TURN" then
        handleEndTurn(player)
    end
end)

requestState.OnServerInvoke = function(player)
    local matchState = playerMatch[player.UserId]
    if not matchState then
        return {
            waiting = true,
            gameId = Config.GameId,
            displayName = Config.DisplayName,
        }
    end
    return buildSnapshot(matchState, player)
end

Players.PlayerAdded:Connect(function(player)
    task.defer(enqueue, player)
end)

Players.PlayerRemoving:Connect(function(player)
    removeFromQueue(player)

    local matchState = playerMatch[player.UserId]
    if not matchState then
        return
    end

    local side = findPlayerSide(matchState, player)
    local otherSide = side and Config.OtherSide(side) or nil
    playerMatch[player.UserId] = nil

    if otherSide then
        local opponent = matchState.players[otherSide]
        if opponent and opponent.Parent == Players and not matchState.winnerSide then
            finishMatch(matchState, otherSide, "상대가 나감")
            playerMatch[opponent.UserId] = nil
            task.delay(2, function()
                if opponent.Parent == Players then
                    enqueue(opponent)
                end
            end)
        end
    end

    matches[matchState.id] = nil
end)

for _, player in ipairs(Players:GetPlayers()) do
    task.defer(enqueue, player)
end

print("[카드 격자전] 서버 준비 완료")
