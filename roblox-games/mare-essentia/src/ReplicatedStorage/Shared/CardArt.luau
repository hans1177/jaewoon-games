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
-- [유럽 전투카드 원화 품질] 1400×2000 세로 7:10 원본·동일 컬러 회화 검수와 등록 해시가
-- 모두 확인된 카드만 화면에 연결한다. 나머지 원본·등록번호·저장된 카드 소유권은 보존한다.
local ApprovedEuropeanArt: { [string]: boolean } = {
	eu_18 = true, -- 유럽들소 · 1400×2000 승인 원화
	eu_19 = true, -- 붉은사슴 · 1400×2000 승인 원화
	eu_20 = true, -- 검독수리 · 1400×2000 승인 원화
	eu_28 = true, -- 유럽 원더 · 1400×2000 승인 원화
}
for key, assetId in AssetIds do
	local cardId = string.match(key, "^CardArt/(.+)$")
	if cardId and not Art[cardId] and (not string.match(cardId, "^eu_%d%d$") or ApprovedEuropeanArt[cardId]) then
		local c = Credits[cardId]
		-- [5대륙 카드 원화] 기존 원본 SVG에서 제작·승인된 이미지에 위키백과 출처를 잘못 붙이지 않는다.
		local region, digits = string.match(cardId, "^(%a%a)_(%d%d)$")
		local cardNumber = tonumber(digits or "")
		local originalRegional = (region == "eu" or region == "ea" or region == "me" or region == "nw" or region == "af" or region == "sa")
			and cardNumber ~= nil and cardNumber >= 1 and cardNumber <= 30
		Art[cardId] = {
			image = "rbxthumb://type=Asset&id=" .. tostring(assetId) .. "&w=420&h=420",
			credit = if c then c.credit .. " (" .. c.license .. ")"
				elseif originalRegional then "Mare Essentia 자체 제작 5대륙 카드 원화"
				else "위키백과 (수정함)",
			license = if c then c.license elseif originalRegional then "PROJECT_ORIGINAL_ART" else "see credit",
		}
	end
end

return {
	Art = Art,
}
