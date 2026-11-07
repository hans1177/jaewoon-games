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
}

local Bounties = {}

local function hash(text: string): number
	local h = 17
	for i = 1, #text do
		h = (h * 31 + string.byte(text, i)) % 1000003
	end
	return h
end

-- goods: Ports.Goods 표, sortedGoodIds: 정렬된 상품 id 목록
function Bounties.board(portId: string, day: number, goods: { [string]: { id: string, name: string, basePrice: number } }, sortedGoodIds: { string }): { Bounty }
	local week = math.floor(day / 7)
	local list: { Bounty } = {}
	for i = 1, 3 do
		local h = hash(portId .. ":" .. week .. ":" .. i)
		local id = string.format("%s:%d:%d", portId, week, i)
		if i == 3 then
			local n = 1 + h % 3
			table.insert(list, { id = id, kind = "hunt", title = string.format("해적 소탕: 해전 %d번 승리", n), count = n, coins = 220 * n, fame = 3 * n })
		else
			local goodId = sortedGoodIds[h % #sortedGoodIds + 1]
			local g = goods[goodId]
			local n = 4 + (h // 7) % 9
			table.insert(list, {
				id = id, kind = "deliver", goodId = goodId,
				title = string.format("납품: %s %d개", g.name, n), count = n,
				coins = math.floor(g.basePrice * n * 1.5), fame = 1 + n // 5,
			})
		end
	end
	return list
end

return Bounties
