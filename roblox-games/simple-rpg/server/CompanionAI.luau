--!strict
-- Server-owned companion AI. Requires an already selected civilization; never trusts client targets or rewards.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")

local CompanionAI = {}
export type Command = "Summon" | "Follow" | "Guard" | "Attack" | "Gather" | "Dismiss"
type Enemy = {Model: Model, Root: BasePart, Humanoid: Humanoid, Home: Vector3, LastHit: number, TelegraphAt: number, StunnedUntil: number}
type Node = {Part: BasePart, Type: string, Label: string}
type State = {Model: Model, Root: BasePart, Humanoid: Humanoid, Command: Command, Hold: Vector3, LastStrike: number, LastGather: number}
local live: {[Player]: State} = {}
local folder = Instance.new("Folder")
folder.Name = "CivilizationCompanions"
folder.Parent = Workspace

-- Imported, curated external models only. No locally generated primitive avatars.
local function curatedCompanion(): Model?
    local models = Shared:FindFirstChild("CreatureModels")
    if not models then return nil end
    for _, name in ipairs({"Companion", "AI 부족원", "Knight"}) do
        local template = models:FindFirstChild(name)
        if template and template:IsA("Model")
            and template:GetAttribute("CuratedExternalAsset") == true
            and (tonumber(template:GetAttribute("VerifiedRobloxAssetId")) or 0) > 0
            and template:FindFirstChildWhichIsA("BasePart", true) then
            return template
        end
    end
    return nil
end

local function remove(player: Player)
    local state = live[player]
    if state then
        live[player] = nil
        state.Model:Destroy()
    end
    player:SetAttribute("CivCompanionMode", "Dismissed")
end

local function summon(player: Player, root: BasePart): State?
    local template = curatedCompanion()
    if not template then return nil end
    local model = template:Clone()
    model.Name = "AI 부족원"
    model:SetAttribute("CompanionOwnerUserId", player.UserId)
    local rootPart = model.PrimaryPart or model:FindFirstChild("HumanoidRootPart", true)
        or model:FindFirstChildWhichIsA("BasePart", true)
    if not rootPart or not rootPart:IsA("BasePart") then
        model:Destroy()
        return nil
    end
    model.PrimaryPart = rootPart
    for _, part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") then
            part.Anchored = true
            part.CanCollide = false
            part.CanTouch = false
            part.CanQuery = false
        end
    end
    local humanoid = model:FindFirstChildWhichIsA("Humanoid", true)
    if not humanoid then
        humanoid = Instance.new("Humanoid")
        humanoid.RequiresNeck = false
        humanoid.Parent = model
    end
    humanoid.MaxHealth = 80
    humanoid.Health = 80
    humanoid.DisplayName = "AI 부족원"
    model.Parent = folder
    model:PivotTo(root.CFrame * CFrame.new(4, 0, 2))
    local state: State = {Model = model, Root = rootPart, Humanoid = humanoid,
        Command = "Follow", Hold = rootPart.Position, LastStrike = -1e9, LastGather = -1e9}
    live[player] = state
    return state
end

function CompanionAI.Command(player: Player, command: any, hasCivilization: boolean): boolean
    if type(command) ~= "string" or #command > 12 then return false end
    if command ~= "Summon" and command ~= "Follow" and command ~= "Guard" and command ~= "Attack" and command ~= "Gather" and command ~= "Dismiss" then return false end
    if command == "Dismiss" then remove(player); return true end
    if not hasCivilization then return false end
    local character = player.Character
    local ownerRoot = if character then character:FindFirstChild("HumanoidRootPart") else nil
    local ownerHumanoid = if character then character:FindFirstChildOfClass("Humanoid") else nil
    if not ownerRoot or not ownerRoot:IsA("BasePart") or not ownerHumanoid or ownerHumanoid.Health <= 0 then return false end
    local state = live[player]
    if state == nil or state.Model.Parent == nil or state.Humanoid.Health <= 0 then
        state = summon(player, ownerRoot)
    end
    if not state then return false end
    local selected: Command = if command == "Summon" then "Follow" else (command :: Command)
    state.Command = selected
    if selected == "Guard" then state.Hold = state.Root.Position end
    state.Model:SetAttribute("Command", selected)
    player:SetAttribute("CivCompanionMode", selected)
    return true
end

function CompanionAI.Tick(enemies: {Enemy}, nodes: {Node}, increase: (Player, string, number) -> ()): ()
    local now = os.clock()
    for player, state in pairs(live) do
        if player.Parent ~= Players or state.Model.Parent == nil or state.Humanoid.Health <= 0 then
            remove(player)
            continue
        end
        local character = player.Character
        local ownerRoot = if character then character:FindFirstChild("HumanoidRootPart") else nil
        local ownerHumanoid = if character then character:FindFirstChildOfClass("Humanoid") else nil
        if not ownerRoot or not ownerRoot:IsA("BasePart") or not ownerHumanoid or ownerHumanoid.Health <= 0 then
            continue
        end
        local mode = state.Command
        local destination = if mode == "Guard" then state.Hold else ownerRoot.Position + Vector3.new(3, 0, 3)
        if (destination - state.Root.Position).Magnitude > 3 then
            local delta = destination - state.Root.Position
            local distance = delta.Magnitude
            -- Server-owned bounded movement; a distant companion reattaches to its owner.
            local nextPos = if distance > 110 then destination else state.Root.Position + delta.Unit * math.min(3.6, distance)
            local facing = Vector3.new(delta.X, 0, delta.Z)
            local nextFrame = if facing.Magnitude > 0.01 then CFrame.lookAt(nextPos, nextPos + facing) else CFrame.new(nextPos)
            state.Model:PivotTo(nextFrame)
            state.Model:SetAttribute("MotionState", "Walk")
        else
            state.Model:SetAttribute("MotionState", "Idle")
        end
        if mode == "Attack" or mode == "Guard" then
            if now - state.LastStrike >= 2 then
                local nearest: Enemy? = nil
                local best = 12
                for _, enemy in ipairs(enemies) do
                    if enemy.Humanoid.Health > 0 and enemy.Model.Parent ~= nil then
                        local d = (enemy.Root.Position - state.Root.Position).Magnitude
                        if d < best and (enemy.Root.Position - ownerRoot.Position).Magnitude <= 26 then
                            nearest = enemy
                            best = d
                        end
                    end
                end
                if nearest then
                    state.LastStrike = now
                    nearest.Humanoid:TakeDamage(5)
                    if nearest.Humanoid.Health <= 0 then
                        nearest.TelegraphAt = 0
                        local defeated = nearest
                        task.delay(9, function()
                            if defeated.Model.Parent then
                                defeated.Model:PivotTo(CFrame.new(defeated.Home))
                                defeated.Humanoid.Health = defeated.Humanoid.MaxHealth
                                defeated.LastHit = os.clock()
                                defeated.StunnedUntil = 0
                            end
                        end)
                    end
                end
            end
        elseif mode == "Gather" and now - state.LastGather >= 8 then
            for _, node in ipairs(nodes) do
                if node.Type == "Wood" and node.Part.Parent ~= nil
                    and (node.Part.Position - state.Root.Position).Magnitude <= 12
                    and (node.Part.Position - ownerRoot.Position).Magnitude <= 24 then
                    state.LastGather = now
                    increase(player, "CivWood", 1)
                    break
                end
            end
        end
    end
end

Players.PlayerRemoving:Connect(remove)
return CompanionAI
