-- 파일명: roblox-games/rpg-adventure/server/Game.server.luau
-- 임포트: Roblox 네이티브 서버 권한
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local RunService = game:GetService("RunService")
local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))

-- 로그/네트워크: 보안상 전투·보상·저장 계산은 서버에서만 실행
game:SetAttribute("JaewoonPlatform", "ROBLOX")
game:SetAttribute("JaewoonServerRuntime", true)
game:SetAttribute("JaewoonStudioRuntime", RunService:IsStudio())

local remote = Instance.new("RemoteEvent")
remote.Name = Config.RemoteName
remote.Parent = ReplicatedStorage

local store
local storeOk, storeResult = pcall(function()
    return DataStoreService:GetDataStore(Config.SaveName)
end)
if storeOk then store = storeResult end

local duelHit = {}
local lastDuelReward = {}
local live = {}
local saving = {}

-- 메인: 기본 지형은 Roblox Terrain만 사용. 캐릭터·몬스터·건물 파츠 생성 금지.
local terrain = workspace.Terrain
terrain:FillBlock(CFrame.new(0, -4, 0), Vector3.new(180, 8, 180), Enum.Material.Grass)
local spawn = Instance.new("SpawnLocation")
spawn.Name = "RpgSpawnMarker"
spawn.Size = Vector3.new(8, 1, 8)
spawn.Position = Vector3.new(0, 1, 0)
spawn.Transparency = 1
spawn.Anchored = true
spawn.CanCollide = false
spawn.Neutral = true
spawn.Parent = workspace

-- 유틸: 영속 데이터는 허용된 정수만 로드/저장
local function integer(value, fallback, minimum, maximum)
    if typeof(value) ~= "number" or value ~= value or value == math.huge or value == -math.huge then
        return fallback
    end
    return math.clamp(math.floor(value), minimum, maximum)
end

local function attribute(player, key)
    return player:GetAttribute(key) or 0
end

local function setAttr(player, key, value)
    player:SetAttribute(key, value)
end

local function maxHealth(player)
    return 100 + (attribute(player, "Level") - 1) * 12
end

local function humanoidOf(player)
    local character = player.Character
    if not character then return nil, nil end
    return character:FindFirstChildOfClass("Humanoid"), character:FindFirstChild("HumanoidRootPart")
end

local function notify(player, message)
    if player.Parent == Players then remote:FireClient(player, "NOTICE", message) end
end

local function applyLevel(player)
    local humanoid = humanoidOf(player)
    if humanoid then
        local before = humanoid.MaxHealth
        humanoid.MaxHealth = maxHealth(player)
        humanoid.Health = math.min(humanoid.MaxHealth, humanoid.Health + humanoid.MaxHealth - before)
    end
end

local function giveReward(player, gold, xp)
    setAttr(player, "Gold", attribute(player, "Gold") + gold)
    local level = attribute(player, "Level")
    local pending = attribute(player, "XP") + xp
    while level < Config.MaxLevel and pending >= 60 + level * 40 do
        pending -= 60 + level * 40
        level += 1
        setAttr(player, "Level", level)
        applyLevel(player)
        notify(player, "레벨 " .. level .. " 달성!")
    end
    if level == Config.MaxLevel then pending = 0 end
    setAttr(player, "XP", pending)
end

local function beginTraining(player)
    local session = live[player]
    if not session then return end
    local hum = humanoidOf(player)
    if not hum or hum.Health <= 0 then return end
    local wave = attribute(player, "TrainingWins") + 1
    session.training = true
    setAttr(player, "TrainWave", wave)
    setAttr(player, "TrainMaxHP", Config.TrainingBaseHealth + math.min(wave - 1, 90) * 12)
    setAttr(player, "TrainHP", attribute(player, "TrainMaxHP"))
    notify(player, "수련 " .. wave .. "회차 시작")
end

-- 저장: 플레이어별 독립 키. 다른 게임의 기존 저장 구조 변경 없음.
local function save(player)
    if not store or saving[player] then return false end
    saving[player] = true
    local snapshot = {Version = Config.SaveVersion}
    for key, fallback in pairs(Config.DefaultSave) do
        snapshot[key] = integer(player:GetAttribute(key), fallback, 0, 1000000000)
    end
    local ok = pcall(function()
        store:UpdateAsync("player:" .. player.UserId, function()
            return snapshot
        end)
    end)
    saving[player] = nil
    if player.Parent == Players then
        setAttr(player, "SaveStatus", ok and "저장됨" or "저장 실패")
    end
    return ok
end

local function load(player)
    local saved
    local ok = false
    if store then
        ok, saved = pcall(function()
            return store:GetAsync("player:" .. player.UserId)
        end)
    end
    if typeof(saved) ~= "table" or saved.Version ~= Config.SaveVersion then saved = {} end
    for key, fallback in pairs(Config.DefaultSave) do
        local upper = key == "Level" and Config.MaxLevel or
            (key == "Weapon" and Config.MaxWeapon or (key == "Potions" and 99 or 1000000000))
        setAttr(player, key, integer(saved[key], fallback, ((key == "Level" or key == "Weapon" or key == "QuestStage") and 1 or 0), upper))
    end
    setAttr(player, "SaveStatus", ok and "저장 준비" or "저장 확인 불가")
    setAttr(player, "BattleMode", "TRAIN")
    setAttr(player, "TrainWave", 0)
    setAttr(player, "TrainHP", 0)
    setAttr(player, "TrainMaxHP", 0)
end

-- 전투: 거리·체력·동의·쿨다운을 서버에서 검증
local function nextAction(session, key, delaySeconds)
    local now = os.clock()
    if now - (session.cooldowns[key] or -100) < delaySeconds then return false end
    session.cooldowns[key] = now
    return true
end

local function targetForDuel(attacker)
    local _, origin = humanoidOf(attacker)
    if not origin then return nil end
    local nearest, distance = nil, Config.MeleeRange
    for _, target in ipairs(Players:GetPlayers()) do
        if target ~= attacker and target:GetAttribute("BattleMode") == "DUEL" then
            local humanoid, root = humanoidOf(target)
            if humanoid and humanoid.Health > 0 and root then
                local d = (origin.Position - root.Position).Magnitude
                if d <= distance then nearest, distance = target, d end
            end
        end
    end
    return nearest
end

local function damagePlayer(attacker, defender, value)
    local hum = humanoidOf(defender)
    if not hum or hum.Health <= 0 then return end
    local session = live[defender]
    if session and os.clock() < session.guardUntil then
        value = math.max(1, math.floor(value * 0.4))
    end
    duelHit[defender] = {attacker = attacker, at = os.clock()}
    hum:TakeDamage(value)
end

local function strike(player, isSkill)
    local session = live[player]
    local hum = humanoidOf(player)
    if not session or not hum or hum.Health <= 0 then return end
    local cooldown = isSkill and Config.SkillCooldown or Config.AttackCooldown
    if not nextAction(session, isSkill and "SKILL" or "ATTACK", cooldown) then return end
    local damage = (isSkill and 22 or 9) + attribute(player, "Level") * (isSkill and 4 or 2) + attribute(player, "Weapon") * 3
    if player:GetAttribute("BattleMode") == "DUEL" then
        local target = targetForDuel(player)
        if not target then notify(player, "근처에 대련을 허용한 플레이어가 없어") return end
        damagePlayer(player, target, damage)
        return
    end
    if not session.training then
        beginTraining(player)
        return
    end
    local remaining = math.max(0, attribute(player, "TrainHP") - damage)
    setAttr(player, "TrainHP", remaining)
    if remaining > 0 then return end
    session.training = false
    setAttr(player, "TrainingWins", attribute(player, "TrainingWins") + 1)
    giveReward(player, 8 + math.min(attribute(player, "TrainWave"), 30), 24 + math.min(attribute(player, "TrainWave"), 25))
    notify(player, "수련 승리! 경험치와 골드 획득")
    local stage = attribute(player, "QuestStage")
    if attribute(player, "TrainingWins") >= stage * 3 then
        setAttr(player, "QuestStage", stage + 1)
        giveReward(player, 30, 40)
        notify(player, "퀘스트 완료! 추가 보상")
    end
    task.delay(1.2, function()
        if player.Parent == Players and live[player] == session and player:GetAttribute("BattleMode") == "TRAIN" then
            beginTraining(player)
        end
    end)
end

-- 메인: 입력은 고정된 동작 문자열만 받음. 클라이언트 수치/보상 입력 금지.
local actions = {
    ATTACK = true, SKILL = true, GUARD = true, POTION = true,
    TRAIN = true, MODE = true, UPGRADE = true, BUY_POTION = true,
}
remote.OnServerEvent:Connect(function(player, action)
    if typeof(action) ~= "string" or not actions[action] then return end
    local session = live[player]
    if not session then return end
    local now = os.clock()
    if now - session.lastRemote < Config.RemoteRateLimit then return end
    session.lastRemote = now
    if action == "ATTACK" then strike(player, false)
    elseif action == "SKILL" then strike(player, true)
    elseif action == "GUARD" then
        if nextAction(session, "GUARD", Config.GuardCooldown) then
            session.guardUntil = now + 1.4
            notify(player, "방어 성공 준비")
        end
    elseif action == "POTION" then
        local hum = humanoidOf(player)
        if hum and hum.Health > 0 and hum.Health < hum.MaxHealth and attribute(player, "Potions") > 0
            and nextAction(session, "POTION", Config.PotionCooldown) then
            setAttr(player, "Potions", attribute(player, "Potions") - 1)
            hum.Health = math.min(hum.MaxHealth, hum.Health + 50)
        end
    elseif action == "TRAIN" then
        if player:GetAttribute("BattleMode") == "TRAIN" then beginTraining(player) end
    elseif action == "MODE" then
        local duel = player:GetAttribute("BattleMode") ~= "DUEL"
        setAttr(player, "BattleMode", duel and "DUEL" or "TRAIN")
        session.training = false
        setAttr(player, "TrainHP", 0)
        if not duel then beginTraining(player) end
        notify(player, duel and "대련 허용: 다른 동의 플레이어와 전투" or "혼자 수련 모드")
    elseif action == "UPGRADE" then
        local tier = attribute(player, "Weapon")
        local cost = tier * 25
        if tier < Config.MaxWeapon and attribute(player, "Gold") >= cost then
            setAttr(player, "Gold", attribute(player, "Gold") - cost)
            setAttr(player, "Weapon", tier + 1)
            notify(player, "장비 강화 성공")
        else notify(player, "강화 비용 부족 또는 최대 단계") end
    elseif action == "BUY_POTION" then
        if attribute(player, "Gold") >= 15 and attribute(player, "Potions") < 99 then
            setAttr(player, "Gold", attribute(player, "Gold") - 15)
            setAttr(player, "Potions", attribute(player, "Potions") + 1)
            notify(player, "회복약 구매 완료")
        end
    end
end)

local function registerCharacter(player, character)
    local hum = character:WaitForChild("Humanoid", 10)
    if not hum then return end
    hum.MaxHealth = maxHealth(player)
    hum.Health = hum.MaxHealth
    hum.Died:Connect(function()
        local session = live[player]
        if session then session.training = false end
        setAttr(player, "TrainHP", 0)
        local last = duelHit[player]
        duelHit[player] = nil
        if last and os.clock() - last.at < 10 and last.attacker.Parent == Players then
            local attacker = last.attacker
            local pair = tostring(attacker.UserId) .. ":" .. tostring(player.UserId)
            if os.clock() - (lastDuelReward[pair] or -10000) >= 300 then
                lastDuelReward[pair] = os.clock()
                setAttr(attacker, "DuelWins", attribute(attacker, "DuelWins") + 1)
                giveReward(attacker, 25, 45)
                notify(attacker, "대련 승리!")
            end
        end
    end)
    task.delay(1, function()
        if player.Parent == Players and player.Character == character and player:GetAttribute("BattleMode") == "TRAIN" then
            beginTraining(player)
        end
    end)
end

Players.PlayerAdded:Connect(function(player)
    live[player] = {lastRemote = -100, guardUntil = -100, training = false, cooldowns = {}}
    load(player)
    player.CharacterAdded:Connect(function(character) registerCharacter(player, character) end)
    if player.Character then registerCharacter(player, player.Character) end
    task.spawn(function()
        while player.Parent == Players and live[player] do
            task.wait(2)
            local session = live[player]
            if session and session.training and player:GetAttribute("BattleMode") == "TRAIN" then
                local hum = humanoidOf(player)
                if hum and hum.Health > 0 then
                    local damage = Config.TrainingBaseDamage + math.min(attribute(player, "TrainWave"), 40)
                    if os.clock() < session.guardUntil then damage = math.max(1, math.floor(damage * 0.4)) end
                    hum:TakeDamage(damage)
                end
            end
        end
    end)
    task.spawn(function()
        while player.Parent == Players do
            task.wait(Config.SaveInterval)
            if player.Parent == Players then save(player) end
        end
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    save(player)
    live[player] = nil
    duelHit[player] = nil
end)

game:BindToClose(function()
    for _, player in ipairs(Players:GetPlayers()) do
        save(player)
    end
end)
