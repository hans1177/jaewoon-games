--!strict
-- Bounded octree target lookup + async A* waypoint guidance for the existing enemy tick.
-- Does NOT spawn an independent AI loop, grant loot, or move the server-owned damage authority.
local Players = game:GetService("Players")
local PathfindingService = game:GetService("PathfindingService")

type Entry = {Player: Player, Position: Vector3}
type OctreeNode = {Center: Vector3, Half: number, Entries: {Entry}?, Children: {OctreeNode}?}
type PathState = {LastRequested: number, Busy: boolean, Waypoints: {PathWaypoint}?, Index: number}
local AdvancedAIEcosystem = {}
local tree: OctreeNode? = nil
local lastIndexAt = -1e9
local paths: {[Model]: PathState} = {}
local pendingPaths = 0
local UPDATE_INTERVAL = 0.5
local MAX_PATHS_IN_FLIGHT = 2
local MIN_PATH_RETRY = 3

local function buildOctree(entries: {Entry}, center: Vector3, half: number, depth: number): OctreeNode
    local node: OctreeNode = {Center = center, Half = half}
    if #entries <= 4 or depth >= 5 then
        node.Entries = entries
        return node
    end
    local buckets: {{Entry}} = {}
    for n = 1, 8 do buckets[n] = {} end
    for _, row in ipairs(entries) do
        local idx = (row.Position.X >= center.X and 1 or 0)
            + (row.Position.Y >= center.Y and 2 or 0)
            + (row.Position.Z >= center.Z and 4 or 0) + 1
        table.insert(buckets[idx], row)
    end
    local children: {OctreeNode} = {}
    for index, rows in ipairs(buckets) do
        if #rows > 0 then
            local childHalf = half / 2
            local offset = Vector3.new(
                (bit32.band(index - 1, 1) ~= 0 and 1 or -1) * childHalf,
                (bit32.band(index - 1, 2) ~= 0 and 1 or -1) * childHalf,
                (bit32.band(index - 1, 4) ~= 0 and 1 or -1) * childHalf
            )
            table.insert(children, buildOctree(rows, center + offset, childHalf, depth + 1))
        end
    end
    node.Children = children
    return node
end

function AdvancedAIEcosystem.RefreshPlayerIndex(now: number): ()
    if now - lastIndexAt < UPDATE_INTERVAL then return end
    lastIndexAt = now
    local entries: {Entry} = {}
    local low = Vector3.new(math.huge, math.huge, math.huge)
    local high = Vector3.new(-math.huge, -math.huge, -math.huge)
    for _, player in ipairs(Players:GetPlayers()) do
        local character = player.Character
        local root = if character then character:FindFirstChild("HumanoidRootPart") else nil
        local health = if character then character:FindFirstChildOfClass("Humanoid") else nil
        if root and root:IsA("BasePart") and health and health.Health > 0
            and (player:GetAttribute("CivRaceID") or 0) > 0 then
            local position = root.Position
            table.insert(entries, {Player = player, Position = position})
            low = Vector3.new(math.min(low.X, position.X), math.min(low.Y, position.Y), math.min(low.Z, position.Z))
            high = Vector3.new(math.max(high.X, position.X), math.max(high.Y, position.Y), math.max(high.Z, position.Z))
        end
    end
    if #entries == 0 then tree = nil; return end
    local center = (low + high) / 2
    local half = math.max(1, (high - low).X / 2 + 1, (high - low).Y / 2 + 1, (high - low).Z / 2 + 1)
    tree = buildOctree(entries, center, half, 0)
end

function AdvancedAIEcosystem.ClosestPlayer(position: Vector3, radius: number): (Player?, number)
    local nearest: Player? = nil
    local best = radius
    local function visit(node: OctreeNode)
        local offset = position - node.Center
        local dx = math.max(math.abs(offset.X) - node.Half, 0)
        local dy = math.max(math.abs(offset.Y) - node.Half, 0)
        local dz = math.max(math.abs(offset.Z) - node.Half, 0)
        if dx * dx + dy * dy + dz * dz >= best * best then return end
        if node.Entries then
            for _, row in ipairs(node.Entries) do
                local distance = (row.Position - position).Magnitude
                if distance < best then
                    local character = row.Player.Character
                    local root = if character then character:FindFirstChild("HumanoidRootPart") else nil
                    local humanoid = if character then character:FindFirstChildOfClass("Humanoid") else nil
                    if root and root:IsA("BasePart") and humanoid and humanoid.Health > 0 then
                        nearest = row.Player
                        best = distance
                    end
                end
            end
        end
        if node.Children then for _, child in ipairs(node.Children) do visit(child) end end
    end
    if tree then visit(tree) end
    return nearest, best
end

function AdvancedAIEcosystem.SetState(enemy: any, state: string): ()
    if enemy.Model:GetAttribute("AIState") ~= state then
        enemy.Model:SetAttribute("AIState", state)
    end
end

-- A* runs asynchronously and is capped globally. Existing PivotTo motion follows waypoints.
function AdvancedAIEcosystem.ChaseTarget(enemy: any, target: Vector3, now: number): Vector3
    local model: Model = enemy.Model
    local root: BasePart = enemy.Root
    local state = paths[model]
    if not state then
        state = {LastRequested = -1e9, Busy = false, Waypoints = nil, Index = 1}
        paths[model] = state
    end
    if (target - root.Position).Magnitude <= 8 then return target end
    if not state.Busy and pendingPaths < MAX_PATHS_IN_FLIGHT and now - state.LastRequested >= MIN_PATH_RETRY then
        state.Busy = true
        state.LastRequested = now
        pendingPaths += 1
        task.spawn(function()
            local ok, path = pcall(function()
                local result = PathfindingService:CreatePath({AgentRadius = 2, AgentHeight = 5, AgentCanJump = false, Costs = {Water = 20}})
                result:ComputeAsync(root.Position, target)
                return result
            end)
            pendingPaths -= 1
            state.Busy = false
            if model.Parent == nil then paths[model] = nil; return end
            if ok and path.Status == Enum.PathStatus.Success then
                state.Waypoints = path:GetWaypoints()
                state.Index = 2
            else
                state.Waypoints = nil
            end
        end)
    end
    local points = state.Waypoints
    if points then
        while state.Index <= #points and (points[state.Index].Position - root.Position).Magnitude <= 3 do
            state.Index += 1
        end
        if state.Index <= #points then return points[state.Index].Position end
    end
    return target
end

return table.freeze(AdvancedAIEcosystem)
