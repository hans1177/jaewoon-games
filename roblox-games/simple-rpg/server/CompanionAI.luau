--!strict
-- Server-owned companion AI. Requires an already selected civilization; never trusts client targets or rewards.
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local CompanionAI = {}
export type Command = "Summon" | "Follow" | "Guard" | "Attack" | "Gather" | "Dismiss"
type Enemy = {Model: Model, Root: BasePart, Humanoid: Humanoid, Home: Vector3, LastHit: number, TelegraphAt: number, StunnedUntil: number}
type Node = {Part: BasePart, Type: string, Label: string}
type State = {Model: Model, Root: BasePart, Humanoid: Humanoid, Command: Command, Hold: Vector3, LastStrike: number, LastGather: number}
local live: {[Player]: State} = {}
local folder = Instance.new("Folder")
folder.Name = "CivilizationCompanions"
folder.Parent = Workspace

local function bodyPart(model: Model, name: string, size: Vector3, cf: CFrame, color: Color3): Part
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.CFrame = cf
    part.Color = color
    part.Material = Enum.Material.SmoothPlastic
    part.Anchored = true
    part.CanCollide = false
    part.CanTouch = false
    part.Parent = model
    return part
end

local function remove(player: Player)
    local state = live[player]
    if state then
        live[player] = nil
        state.Model:Destroy()
    end
    player:SetAttribute("CivCompanionMode", "Dismissed")
end

local function summon(player: Player, root: BasePart): State
    local model = Instance.new("Model")
    model.Name = "AI 부족원"
    model:SetAttribute("CompanionOwnerUserId", player.UserId)
    local cf = root.CFrame * CFrame.new(4, 0, 2)
    local rootPart = bodyPart(model, "HumanoidRootPart", Vector3.new(2, 2, 1), cf, Color3.fromRGB(110, 91, 63))
    rootPart.Transparency = 1
    bodyPart(model, "Torso", Vector3.new(2, 2, 1), cf, Color3.fromRGB(136, 103, 64))
    bodyPart(model, "Head", Vector3.new(1.2, 1.2, 1.2), cf * CFrame.new(0, 1.65, 0), Color3.fromRGB(197, 163, 119))
    bodyPart(model, "Left Arm", Vector3.new(0.7, 1.8, 0.8), cf * CFrame.new(-1.4, -0.1, 0), Color3.fromRGB(157, 122, 82))
    bodyPart(model, "Right Arm", Vector3.new(0.7, 1.8, 0.8), cf * CFrame.new(1.4, -0.1, 0), Color3.fromRGB(157, 122, 82))
    bodyPart(model, "Left Leg", Vector3.new(0.8, 1.9, 0.8), cf * CFrame.new(-0.5, -1.9, 0), Color3.fromRGB(92, 84, 71))
    bodyPart(model, "Right Leg", Vector3.new(0.8, 1.9, 0.8), cf * CFrame.new(0.5, -1.9, 0), Color3.fromRGB(92, 84, 71))
    local humanoid = Instance.new("Humanoid")
    humanoid.RequiresNeck = false
    humanoid.MaxHealth = 80
    humanoid.Health = 80
    humanoid.DisplayName = "AI 부족원"
    humanoid.Parent = model
    model.PrimaryPart = rootPart
    model.Parent = folder
    local state: State = {Model = model, Root = rootPart, Humanoid = humanoid, Command = "Follow", Hold = rootPart.Position, LastStrike = -1e9, LastGather = -1e9}
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
