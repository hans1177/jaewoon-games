--!strict
-- Direct owner age-chain data. No client authorizes resource, drop or unlock mutations.
export type Recipe = {
    Key: string,
    Label: string,
    Costs: {[string]: number},
    YieldField: string,
    YieldCount: number,
    MinimumTech: number,
    Station: string,
}
export type Structure = {
    Key: string,
    Label: string,
    Costs: {[string]: number},
    MinimumTech: number,
    RequiredRace: number,
    RequiredMetric: string,
    ModelColor: Color3,
}
local ProgressionData = {}
local recipes: {[string]: Recipe} = {
    StoneSpear = {Key="StoneSpear", Label="돌창", Costs={CivWood=10, CivStone=10},
        YieldField="CivStoneSpear", YieldCount=1, MinimumTech=0, Station="Bench"},
    BronzeIngot = {Key="BronzeIngot", Label="청동 주괴 5개 제련", Costs={CivCopperOre=15, CivTinOre=15},
        YieldField="CivBronzeIngot", YieldCount=5, MinimumTech=15, Station="Furnace"},
    BronzeSword = {Key="BronzeSword", Label="청동검", Costs={CivBronzeIngot=5},
        YieldField="CivBronzeSword", YieldCount=1, MinimumTech=15, Station="Bench"},
    IronIngot = {Key="IronIngot", Label="철 주괴 5개 제련", Costs={CivIronOre=20, CivCoal=20},
        YieldField="CivIronIngot", YieldCount=5, MinimumTech=29, Station="BlastFurnace"},
    IronGreatsword = {Key="IronGreatsword", Label="철제 대검", Costs={CivIronIngot=5},
        YieldField="CivIronGreatsword", YieldCount=1, MinimumTech=29, Station="Bench"},
}
local structures: {[string]: Structure} = {
    StoneWall = {Key="StoneWall", Label="석제 성벽", Costs={CivStone=20},
        MinimumTech=15, RequiredRace=0, RequiredMetric="CivBoarKills",
        ModelColor=Color3.fromRGB(118, 119, 115)},
    DangunAltar = {Key="DangunAltar", Label="단군 제단", Costs={CivStone=18, CivHide=1},
        MinimumTech=15, RequiredRace=15, RequiredMetric="CivBoarKills",
        ModelColor=Color3.fromRGB(181, 157, 114)},
    Pyramid = {Key="Pyramid", Label="피라미드", Costs={CivStone=28, CivCoreCrystal=1},
        MinimumTech=29, RequiredRace=2, RequiredMetric="CivBronzeSmelts",
        ModelColor=Color3.fromRGB(217, 186, 111)},
    Colosseum = {Key="Colosseum", Label="콜로세움", Costs={CivStone=35, CivDarkIron=1},
        MinimumTech=45, RequiredRace=1, RequiredMetric="CivIronKnightKills",
        ModelColor=Color3.fromRGB(177, 166, 148)},
    DrakkarShipyard = {Key="DrakkarShipyard", Label="드라카르 조선소", Costs={CivWood=45, CivDarkIron=1},
        MinimumTech=45, RequiredRace=12, RequiredMetric="CivIronKnightKills",
        ModelColor=Color3.fromRGB(120, 89, 63)},
}
local orderedRecipes = {"StoneSpear", "BronzeIngot", "BronzeSword", "IronIngot", "IronGreatsword"}
local orderedStructures = {"StoneWall", "DangunAltar", "Pyramid", "Colosseum", "DrakkarShipyard"}
function ProgressionData.GetRecipe(key: string): Recipe?
    return recipes[key]
end
function ProgressionData.GetStructure(key: string): Structure?
    return structures[key]
end
function ProgressionData.RecipeKeys(): {string}
    return orderedRecipes
end
function ProgressionData.StructureKeys(): {string}
    return orderedStructures
end
return table.freeze(ProgressionData)
