--!strict
-- 24-civilization trade goods. Price currency is silver; Gold currency is separate
-- from the tradable Gold mineral/commodity to avoid inventory identity collisions.
export type MarketItem = {
    ItemID: string,
    Label: string,
    ItemField: string,
    BasePrice: number,
    InitialSupply: number,
    DemandFactor: number,
}
local TradeMarketData = {}
local items: {[string]: MarketItem} = {
    Marble = {ItemID = "Marble", Label = "대리석", ItemField = "CivMarble",
        BasePrice = 50, InitialSupply = 100, DemandFactor = 1.0},
    Gold = {ItemID = "Gold", Label = "금 특산품", ItemField = "CivGoldOre",
        BasePrice = 200, InitialSupply = 30, DemandFactor = 1.5},
    Spice = {ItemID = "Spice", Label = "향신료", ItemField = "CivSpice",
        BasePrice = 120, InitialSupply = 60, DemandFactor = 1.2},
}
local IDs = {"Marble", "Gold", "Spice"}
function TradeMarketData.GetItem(itemID: string): MarketItem?
    if typeof(itemID) ~= "string" then return nil end
    return items[itemID]
end
function TradeMarketData.ItemIDs(): {string}
    return IDs
end
return table.freeze(TradeMarketData)
