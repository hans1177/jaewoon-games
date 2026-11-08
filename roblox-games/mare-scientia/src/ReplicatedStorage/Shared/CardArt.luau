--!strict
-- 카드 그림. 카드 id마다 이미지 에셋을 연결한다. 비어 있으면 분야 색의 임시 일러스트가 나온다.
-- image: "rbxassetid://숫자" / credit: 출처·작가 / license: 이용 조건 (예: "Public Domain", "CC0", "CC BY 4.0")
-- 출처와 이용 조건은 반드시 기록한다 (docs/CARD_ART_GUIDE.md 참고).

export type Art = { image: string, credit: string, license: string }

local Art: { [string]: Art } = {
	-- bot_oak = { image = "rbxassetid://0", credit = "작가 / 출처 URL", license = "Public Domain" },
}

-- 자동 수집·등록된 카드 그림(AssetIds 의 CardArt/<카드id>)과 출처(CardArtCredits)를 합친다.
local AssetIds = (require(script.Parent.AssetIds) :: any) :: { [string]: number }
local Credits = require(script.Parent.CardArtCredits)
for key, assetId in AssetIds do
	local cardId = string.match(key, "^CardArt/(.+)$")
	if cardId and not Art[cardId] then
		local c = Credits[cardId]
		Art[cardId] = {
			image = "rbxthumb://type=Asset&id=" .. tostring(assetId) .. "&w=420&h=420",
			credit = if c then c.credit .. " (" .. c.license .. ")" else "위키백과 (수정함)",
			license = if c then c.license else "see credit",
		}
	end
end

return {
	Art = Art,
}
