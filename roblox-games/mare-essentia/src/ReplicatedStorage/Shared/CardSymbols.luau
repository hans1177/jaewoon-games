--!nonstrict
-- 파일명: CardSymbols.luau
-- 등록된 전투 아이콘 시트의 한 칸을 그린다. 수치와 미제작 기호는 문자로 유지한다.
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local CardSymbols = {}
local CELL = 128
local cells = {
	["↔️"] = 0, ["⚔️"] = 1, ["🛡️"] = 2, ["✨"] = 3,
	["🔒"] = 4, ["⚓"] = 5, ["🚫"] = 6, ["🐷"] = 7,
	["↩️"] = 8, ["⏳"] = 9, ["⬆️"] = 10, ["⬇️"] = 11,
}

local tacticalCells = {
	["🔗"] = 0, ["🃏"] = 1, ["🤲"] = 2, ["🔥"] = 3,
	["🌦️"] = 4, ["🌫️"] = 4, ["⛈️"] = 4,
}

function CardSymbols.apply(label, caption)
	local baseId = AssetIds["CardArt/ui_card_symbols"]
	local tacticsId = AssetIds["CardArt/ui_card_tactics"]
	if not caption or not (baseId or tacticsId) then return false end

	local parts, hasArt = {}, false
	for token in string.gmatch(caption, "%S+") do
		table.insert(parts, token)
		hasArt = hasArt or (baseId ~= nil and cells[token] ~= nil) or (tacticsId ~= nil and tacticalCells[token] ~= nil)
	end
	if not hasArt then return false end

	label.Text = ""
	for index, token in parts do
		local tactical = tacticalCells[token] ~= nil
		local cell = if tactical then tacticalCells[token] else cells[token]
		local assetId = if tactical then tacticsId else baseId
		local columns = if tactical then 3 else 4
		local item
		if cell and assetId then
			item = Instance.new("ImageLabel")
			item.Image = "rbxassetid://" .. tostring(assetId)
			item.ImageRectOffset = Vector2.new(cell % columns * CELL, math.floor(cell / columns) * CELL)
			item.ImageRectSize = Vector2.new(CELL, CELL)
			item.ScaleType = Enum.ScaleType.Fit
		else
			item = Instance.new("TextLabel")
			item.Text = token
			item.TextColor3 = label.TextColor3
			item.TextScaled = true
			item.Font = label.Font
		end
		item.BackgroundTransparency = 1
		item.Position = UDim2.fromScale((index - 1) / #parts, 0)
		item.Size = UDim2.fromScale(1 / #parts, 1)
		item.ZIndex = label.ZIndex + 1
		item.Parent = label
	end
	return true
end

return CardSymbols
