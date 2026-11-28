--!strict
-- 길드 의뢰 보드: 항구마다 7일마다 바뀌는 의뢰 3건. 같은 주·같은 항구는 항상 같은 의뢰다.

export type Bounty = {
	id: string,
	kind: string, -- deliver | hunt
	title: string,
	goodId: string?,
	count: number,
	coins: number,
	fame: number,
	story: string,
	ending: string,
	loreCardId: string,
}

local Bounties = {}

-- 실제 지역 교역 배경에 근거한 가상 주간 의뢰. 기존 판정과 보상은 유지.
local Context: { [number]: { string } } = {
	[1] = { "북해", "조수와 안개가 교역선의 시간을 바꾼다", "북해의 상선 조합이 약탈 피해를 기록한다", "geo_tides" },
	[2] = { "지중해", "오래된 도시와 석호의 공방을 잇는 상선이 오간다", "지중해 상인들이 사략선의 위협을 장부에 적는다", "geo_med_currents" },
	[3] = { "서아프리카·대서양 섬", "계절과 해류에 따라 해안 시장의 물자가 달라진다", "해안 주민과 선주가 해상 약탈을 우려한다", "geo_canary_current" },
	[4] = { "아메리카·카리브", "대서양을 건너온 상품의 출처와 노동의 기록이 얽힌다", "카리브 선주가 사략과 해적의 위협을 기록한다", "geo_caribbean_sea" },
	[5] = { "인도양", "계절풍을 기다리는 상선의 계약이 이어진다", "향신료 항로의 상인들이 선단의 안전을 걱정한다", "geo_monsoon" },
	[6] = { "동아시아·동남아시아", "해협과 항구의 교역 기록에 여러 언어가 섞인다", "해협을 지나는 상선들이 약탈 피해를 보고한다", "geo_malacca_strait" },
	[7] = { "태평양", "섬 사이의 너울과 별을 읽는 항해 지식이 이어진다", "먼 섬을 오가는 선원들이 해상 약탈을 걱정한다", "pac_navigation_stick" },
}

local function hash(text: string): number
	local h = 17
	for i = 1, #text do
		h = (h * 31 + string.byte(text, i)) % 1000003
	end
	return h
end

-- goods: Ports.Goods 표, sortedGoodIds: 정렬된 상품 id 목록
function Bounties.board(portId: string, day: number, goods: { [string]: { id: string, name: string, basePrice: number, knowledgeId: string? } }, sortedGoodIds: { string }, regionTier: number?, portName: string?, latitude: number?): { Bounty }
	local tier = regionTier or 1
	local index = if tier == 1 then (if (latitude or 52) >= 45 then 1 else 2) else tier + 1
	local context = Context[index] or Context[1]
	local place = portName or context[1]
	local week = math.floor(day / 7)
	local list: { Bounty } = {}
	for i = 1, 3 do
		local h = hash(portId .. ":" .. week .. ":" .. i)
		local id = string.format("%s:%d:%d", portId, week, i)
		if i == 3 then
			local n = 1 + h % 3
			table.insert(list, { id = id, kind = "hunt", title = string.format("해적 소탕: 해전 %d번 승리", n), count = n, coins = 220 * n, fame = 3 * n,
				story = place .. "의 길드 서기: " .. context[3] .. ". 새 해전 승리 기록을 제출해 주시오.",
				ending = "길드가 새 해전 승리 기록을 확인했다. 이번 주 현상금 의뢰가 종결됐다.", loreCardId = "geo_pirate_waters" })
		else
			local goodId = sortedGoodIds[h % #sortedGoodIds + 1]
			local g = goods[goodId]
			local n = 4 + (h // 7) % 9
			table.insert(list, {
				id = id, kind = "deliver", goodId = goodId,
				title = string.format("납품: %s %d개", g.name, n), count = n,
				coins = math.floor(g.basePrice * n * 1.5), fame = 1 + n // 5,
				story = place .. "의 " .. (if i == 1 then "창고 서기: " else "교역 중개인: ") .. context[2] .. ". " .. g.name .. (if i == 1 then " 재고가 모자라오. 주문량을 채워 주시오." else " 거래 계약에 필요한 물량을 가져와 주시오."),
				ending = g.name .. " 납품을 확인하고 거래 장부를 마감했다.", loreCardId = g.knowledgeId or context[4],
			})
		end
	end
	return list
end

return Bounties
