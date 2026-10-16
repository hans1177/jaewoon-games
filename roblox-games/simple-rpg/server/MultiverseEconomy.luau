--!strict
-- Server-session trade market, bounded caravan movement and deterministic
-- supply/demand updates. No independent loops and no player data ownership.
local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local TradeMarketData = require(Shared:WaitForChild("TradeMarketData"))

type MarketState = {ItemID: string, BasePrice: number, InitialSupply: number,
    CurrentSupply: number, DemandFactor: number}
type Caravan = {Model: Model, Origin: number, Destination: number,
    ItemID: string, StartedAt: number, TravelSeconds: number}
local MultiverseEconomy = {}
local market: {[string]: MarketState} = {}
local caravans: {Caravan} = {}
local caravansStarted = false
local destinations: {[number]: Vector3} = {}
local lastMarketAt = 0
local nextCaravanDelivery = 0
local travelItems = {"Marble", "Gold", "Spice"}
local MARKET_INTERVAL = 10
local MAX_SUPPLY = 1000
for _, itemID in ipairs(TradeMarketData.ItemIDs()) do
    local row = TradeMarketData.GetItem(itemID)
    assert(row ~= nil, "TRADE_ITEM_REQUIRED")
    market[itemID] = {ItemID = itemID, BasePrice = row.BasePrice,
        InitialSupply = row.InitialSupply, CurrentSupply = row.InitialSupply,
        DemandFactor = row.DemandFactor}
end

local function unitPrice(row: MarketState): number
    local scarcity = math.clamp(row.InitialSupply / math.max(1, row.CurrentSupply), 0.5, 2)
    return math.max(1, math.ceil(row.BasePrice * row.DemandFactor * scarcity))
end

-- isBuying=true is the price player pays; false is the lower price they receive.
function MultiverseEconomy.Quote(itemID: string, amount: number, isBuying: boolean): number?
    local item = market[itemID]
    if not item or type(amount) ~= "number" or amount % 1 ~= 0
        or amount < 1 or amount > 20 or type(isBuying) ~= "boolean" then return nil end
    local gross = unitPrice(item) * amount
    return if isBuying then gross else math.max(1, math.floor(gross * 0.9))
end

function MultiverseEconomy.HasSupply(itemID: string, amount: number): boolean
    local row = market[itemID]
    return row ~= nil and amount <= row.CurrentSupply
end

function MultiverseEconomy.ApplyTrade(itemID: string, amount: number, isBuying: boolean): ()
    local row = market[itemID]
    if not row then return end
    if isBuying then
        row.CurrentSupply = math.max(0, row.CurrentSupply - amount)
        row.DemandFactor = math.clamp(row.DemandFactor + amount * 0.012, 0.5, 2.5)
    else
        row.CurrentSupply = math.min(MAX_SUPPLY, row.CurrentSupply + amount)
        row.DemandFactor = math.clamp(row.DemandFactor - amount * 0.008, 0.5, 2.5)
    end
end

function MultiverseEconomy.Snapshot(): {[string]: any}
    local snapshot: {[string]: any} = {}
    for _, itemID in ipairs(TradeMarketData.ItemIDs()) do
        local state = market[itemID]
        snapshot[itemID] = {
            SilverBuy = MultiverseEconomy.Quote(itemID, 1, true),
            SilverSell = MultiverseEconomy.Quote(itemID, 1, false),
            Supply = state.CurrentSupply,
            DemandFactor = state.DemandFactor,
        }
    end
    return snapshot
end

-- Procedural block wagons and cargo permanently removed; trades remain server-owned.
local function createCaravan(folder: Instance, itemID: string, index: number): Model?
    local library = Shared:FindFirstChild("CuratedWorldModels")
    local template = library and (library:FindFirstChild("TradeCaravan_" .. itemID)
        or library:FindFirstChild("TradeCaravan"))
    if not (template and template:IsA("Model")
        and template:GetAttribute("CuratedExternalAsset") == true
        and (tonumber(template:GetAttribute("VerifiedRobloxAssetId")) or 0) > 0
        and template:FindFirstChildWhichIsA("BasePart", true)) then
        return nil
    end
    local model = template:Clone()
    model.Name = "무역 카라반 " .. itemID
    model:SetAttribute("CivilizationTradeCaravan", true)
    model:SetAttribute("MarketItemID", itemID)
    for _, part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") then
            part.Anchored = true
            part.CanCollide = false
            part.CanTouch = false
            part.CanQuery = false
        end
    end
    model.Parent = folder
    model:PivotTo(CFrame.new(0, 4, index * 4))
    return model
end

function MultiverseEconomy.StartCaravans(hub: Instance, regions: {[number]: Vector3}): ()
    if caravansStarted then return end
    caravansStarted = true
    for id = 1, 24 do
        local region = regions[id]
        if region then destinations[id] = region end
    end
    local folder = Instance.new("Folder")
    folder.Name = "CivilizationTradeCaravans"
    folder.Parent = hub
    local now = os.clock()
    for index, itemID in ipairs(travelItems) do
        local origin = 1 + (index - 1) * 8
        local destination = origin % 24 + 1
        local model = createCaravan(folder, itemID, index)
        if model then
            table.insert(caravans, {Model = model, Origin = origin,
                Destination = destination, ItemID = itemID,
                StartedAt = now + (index - 1) * 4, TravelSeconds = 25})
        end
    end
    lastMarketAt = now
end

-- Runs on the existing civilization AI tick. true means market snapshot changed.
function MultiverseEconomy.Tick(now: number): boolean
    local changed = false
    if now - lastMarketAt >= MARKET_INTERVAL then
        lastMarketAt = now
        for _, state in pairs(market) do
            -- Deterministic price pressure from scarcity and mean-reverting demand.
            local desired = math.clamp(1 + (state.InitialSupply - state.CurrentSupply)
                / math.max(1, state.InitialSupply), 0.5, 2.5)
            state.DemandFactor = math.clamp(state.DemandFactor * 0.92 + desired * 0.08, 0.5, 2.5)
        end
        changed = true
    end
    for _, caravan in ipairs(caravans) do
        if now >= caravan.StartedAt then
            local from = destinations[caravan.Origin]
            local to = destinations[caravan.Destination]
            if from and to then
                local alpha = math.clamp((now - caravan.StartedAt) / caravan.TravelSeconds, 0, 1)
                local position = from:Lerp(to, alpha) + Vector3.new(0, 4, 0)
                caravan.Model:PivotTo(CFrame.new(position))
                if alpha >= 1 then
                    local item = market[caravan.ItemID]
                    item.CurrentSupply = math.min(MAX_SUPPLY, item.CurrentSupply + 3)
                    caravan.Origin = caravan.Destination
                    caravan.Destination = caravan.Destination % 24 + 1
                    caravan.StartedAt = now
                    changed = true
                end
            end
        end
    end
    return changed
end
return table.freeze(MultiverseEconomy)
