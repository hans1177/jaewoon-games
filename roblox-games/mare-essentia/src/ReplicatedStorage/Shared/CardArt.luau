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
		-- [5대륙 카드 원화] 1~30번 기존 표시 유지. 31~35번은 검증된 CC0 출처(Credits)가 없으면 미승인으로 명시한다.
		local region, digits = string.match(cardId, "^(%a%a)_(%d%d)$")
		local cardNumber = tonumber(digits or "")
		local originalRegional = (region == "eu" or region == "ea" or region == "me" or region == "nw" or region == "af")
			and cardNumber ~= nil and cardNumber >= 1 and cardNumber <= 30
		local cc0Regional = (region == "eu" or region == "ea" or region == "me" or region == "nw" or region == "af")
			and cardNumber ~= nil and cardNumber >= 31 and cardNumber <= 35
		Art[cardId] = {
			image = "rbxthumb://type=Asset&id=" .. tostring(assetId) .. "&w=420&h=420",
			credit = if c then c.credit .. " (" .. c.license .. ")"
				elseif originalRegional then "Mare Essentia 자체 제작 5대륙 카드 원화"
				elseif cc0Regional then "원본 출처 검증 필요 · 미승인 신규 카드 이미지"
				else "위키백과 (수정함)",
			license = if c then c.license elseif originalRegional then "PROJECT_ORIGINAL_ART" elseif cc0Regional then "UNVERIFIED" else "see credit",
		}
	end
end

return {
	Art = Art,
}
