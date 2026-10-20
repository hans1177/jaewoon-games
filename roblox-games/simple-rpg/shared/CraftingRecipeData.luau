--!strict
-- Owner-authored timed recipes. Server validates tech, station, materials and output.
-- Resource keys map to existing persistent Civ* numeric fields; no second inventory.
local CraftingRecipeData = {}
export type Recipe = {
    RecipeID: number,
    ItemName: string,
    RequiredTechID: number,
    CraftTime: number,
    Ingredients: {[string]: number},
    OutputAmount: number,
    OutputField: string,
    Station: string,
}
local RECIPES: {[number]: Recipe} = {
    [1] = {
        RecipeID = 1,
        ItemName = "석기 도끼",
        RequiredTechID = 1,
        CraftTime = 2,
        Ingredients = {CivWood = 5, CivStone = 3},
        OutputAmount = 1,
        OutputField = "CivStoneAxe",
        Station = "Bench",
    },
    [2] = {
        RecipeID = 2,
        ItemName = "청동 검",
        RequiredTechID = 29,
        CraftTime = 5,
        Ingredients = {CivCopperOre = 10, CivTinOre = 5},
        OutputAmount = 1,
        OutputField = "CivBronzeSword",
        Station = "Bench",
    },
}
local IDS = {1, 2}
function CraftingRecipeData.GetRecipe(recipeID: number): Recipe?
    if typeof(recipeID) ~= "number" or recipeID % 1 ~= 0 then return nil end
    return RECIPES[recipeID]
end
function CraftingRecipeData.RecipeIDs(): {number}
    return IDS
end
return table.freeze(CraftingRecipeData)
