--!nonstrict
-- 교역 재미 장치 (2026-11-24 오너 지시: 2·3·4·6·7번)
--  2. 신상품 열풍: 그 항구에 처음 들여와 판 상품은 +25%, 이후 5일간 같은 상품 +12%.
--  3. 항구 축제 수요: 항구마다 36일 주기로 4일 축제. 지정 수요 상품 +60%. 미리 예고된다.
--  4. 라이벌 상단: 9일마다 같은 해역의 한 항구·상품을 노린다. 도착 전에 팔면 +15%, 도착 후엔 -15%.
--  6. 상회 등급: 누적 교역 이익으로 등급이 오른다. 등급마다 판매 +1%, 관세 -10%.
--  7. 희귀 화물: 12일마다 일부 항구에 한정 화물이 뜬다. 지정 항구에 팔면 2.2배, 아니면 손해.
-- 순수 계산 모듈: 저장은 state.stats.tradeFun 한 곳. Ports/Regions 는 호출자가 넘긴다.

local TF = {}

TF.RANKS = {
	{ name = "행상", need = 0 },
	{ name = "소상회", need = 5000 },
	{ name = "상회", need = 25000 },
	{ name = "대상회", need = 100000 },
	{ name = "무역회사", need = 400000 },
	{ name = "동인도급 상사", need = 1500000 },
}
TF.FIRST_BONUS = 0.25
TF.CRAZE_BONUS = 0.12
TF.CRAZE_DAYS = 5
TF.FESTIVAL_CYCLE = 36
TF.FESTIVAL_DAYS = 4
TF.FESTIVAL_BONUS = 0.6
TF.RIVAL_CYCLE = 9
TF.RIVAL_ARRIVE = 6
TF.RIVAL_BONUS = 0.15
TF.RARE_WINDOW = 12
TF.RARE_CHANCE = 40 -- %
TF.RARE_QTY = 8
TF.RARE_PRICE = 1.6 -- 기준가 배수
TF.RARE_SELL = 2.2 -- 지정 항구 판매 배수
TF.RARE_KEEP = 25 -- 산 뒤 지정 판매가 유효한 일수
TF.RIVALS = { "레반트 상단", "한자 동맹 상인", "푸거 가문", "제노바 상회", "광저우 13행", "구자라트 상인" }

local function hash(s: string): number
	local x = 7
	for i = 1, #s do
		x = (x * 31 + string.byte(s, i)) % 2147483647
	end
	return x
end
TF.hash = hash

local sortedPorts = nil
local function portList(Ports)
	if not sortedPorts then
		sortedPorts = {}
		for id in Ports.Ports do table.insert(sortedPorts, id) end
		table.sort(sortedPorts)
	end
	return sortedPorts
end

-- 저장 데이터 꺼내기(없으면 만든다)
function TF.get(state)
	state.stats = state.stats or {}
	local t = state.stats.tradeFun
	if type(t) ~= "table" then
		t = {}
		state.stats.tradeFun = t
	end
	t.profit = tonumber(t.profit) or 0
	if type(t.firsts) ~= "table" then t.firsts = {} end
	if type(t.crazes) ~= "table" then t.crazes = {} end
	if type(t.rare) ~= "table" then t.rare = {} end
	if type(t.lots) ~= "table" then t.lots = {} end
	return t
end

-- 저장 복원 정리
function TF.sanitize(raw)
	if type(raw) ~= "table" then return nil end
	local out = { profit = math.clamp(tonumber(raw.profit) or 0, 0, 1e12), firsts = {}, crazes = {}, rare = {}, lots = {} }
	local n = 0
	for k, v in (type(raw.firsts) == "table" and raw.firsts or {}) do
		if type(k) == "string" and #k <= 60 and type(v) == "number" and n < 3000 then
			out.firsts[k] = math.floor(v); n += 1
		end
	end
	for k, v in (type(raw.crazes) == "table" and raw.crazes or {}) do
		if type(k) == "string" and #k <= 60 and type(v) == "number" then out.crazes[k] = math.floor(v) end
	end
	for g, r in (type(raw.rare) == "table" and raw.rare or {}) do
		if type(g) == "string" and #g <= 30 and type(r) == "table" and type(r.targets) == "table" then
			local targets = {}
			for _, p in r.targets do if type(p) == "string" and #p <= 40 and #targets < 4 then table.insert(targets, p) end end
			out.rare[g] = { qty = math.clamp(math.floor(tonumber(r.qty) or 0), 0, 100), targets = targets, untilDay = math.floor(tonumber(r.untilDay) or 0) }
		end
	end
	for k, v in (type(raw.lots) == "table" and raw.lots or {}) do
		if type(k) == "string" and #k <= 60 and v == true then out.lots[k] = true end
	end
	return out
end

-- 6. 상회 등급
function TF.rank(state)
	local t = TF.get(state)
	local idx = 1
	for i, r in TF.RANKS do
		if t.profit >= r.need then idx = i end
	end
	local nextR = TF.RANKS[idx + 1]
	return { index = idx, level = idx - 1, name = TF.RANKS[idx].name, profit = math.floor(t.profit), nextName = nextR and nextR.name, nextNeed = nextR and nextR.need }
end
function TF.tariffMult(state) return math.max(0, 1 - 0.1 * TF.rank(state).level) end

-- 3. 항구 축제
function TF.festival(Ports, portId: string, day: number)
	local port = Ports.Ports[portId]
	if not port or #(port.demands or {}) == 0 then return nil end
	local C = TF.FESTIVAL_CYCLE
	local offset = hash(portId) % C
	local cycle = math.floor((day - offset) / C)
	local start = cycle * C + offset
	if day >= start + TF.FESTIVAL_DAYS then
		cycle += 1
		start += C
	end
	local goodId = port.demands[hash(portId .. ":" .. cycle) % #port.demands + 1]
	return { goodId = goodId, startDay = start, endDay = start + TF.FESTIVAL_DAYS - 1, active = day >= start }
end

-- 4. 라이벌 상단 (해역별 결정론)
function TF.rival(Ports, Regions, regionId: string, day: number)
	local cycle = math.floor(day / TF.RIVAL_CYCLE)
	local cands = {}
	for _, id in portList(Ports) do
		local p = Ports.Ports[id]
		if Regions.of(p).id == regionId and #(p.demands or {}) > 0 then table.insert(cands, id) end
	end
	if #cands == 0 then return nil end
	local portId = cands[hash(regionId .. ":" .. cycle) % #cands + 1]
	local port = Ports.Ports[portId]
	local goodId = port.demands[hash(portId .. ":rv:" .. cycle) % #port.demands + 1]
	local arrive = cycle * TF.RIVAL_CYCLE + TF.RIVAL_ARRIVE
	return {
		name = TF.RIVALS[hash(regionId .. cycle) % #TF.RIVALS + 1],
		portId = portId, goodId = goodId, arriveDay = arrive, endDay = (cycle + 1) * TF.RIVAL_CYCLE - 1,
		arrived = day >= arrive,
	}
end

-- 7. 희귀 화물
function TF.rareLot(Ports, Regions, portId: string, day: number, state: any?)
	local window = math.floor(day / TF.RARE_WINDOW)
	local key = portId .. ":" .. window
	local secret = hash(key) % 100 >= TF.RARE_CHANCE
	if secret then
		local h = state and state.haggle
		local deal = h and h.portId == portId and h.deal
		local permit = state and state.stats and state.stats.permits and state.stats.permits[portId] == true
		if not permit or not deal or deal.mode ~= "secret" or deal.rareWindow ~= window then return nil end
	end
	local port = Ports.Ports[portId]
	if not port then return nil end
	local here = Regions.of(port).id
	-- 비싼 상품 중 이 항구 특산이 아닌 것
	local goods = {}
	for id, g in Ports.Goods do
		if g.basePrice >= 100 and not table.find(port.produces, id) then table.insert(goods, id) end
	end
	table.sort(goods)
	if #goods == 0 then return nil end
	local goodId = goods[hash(key .. ":g") % #goods + 1]
	local list = portList(Ports)
	local originId = nil
	if secret then
		-- 기존 정기 입고는 변경하지 않는다. 비밀 입고만 같은 해역의 실제 산지와 해외 수요를 연결한다.
		local origins, demand = {}, {}
		for _, id in list do
			local p = Ports.Ports[id]
			if Regions.of(p).id == here then
				if id ~= portId then
					for _, g in p.produces or {} do
						if not origins[g] then origins[g] = {} end
						table.insert(origins[g], id)
					end
				end
			else
				for _, g in p.demands or {} do demand[g] = true end
			end
		end
		local regional = {}
		for _, g in goods do
			if origins[g] and demand[g] then table.insert(regional, g) end
		end
		if #regional == 0 then return nil end
		goodId = regional[hash(key .. ":regional") % #regional + 1]
		local sources = origins[goodId]
		originId = sources[hash(key .. ":origin") % #sources + 1]
	end
	-- 다른 해역에서 그 상품을 원하는 항구 최대 3곳
	local targets = {}
	local start = hash(key .. ":t") % #list
	for i = 0, #list - 1 do
		local id = list[(start + i) % #list + 1]
		local p = Ports.Ports[id]
		if id ~= portId and Regions.of(p).id ~= here and table.find(p.demands or {}, goodId) then
			table.insert(targets, id)
			if #targets >= 3 then break end
		end
	end
	if #targets == 0 then return nil end
	return {
		key = key, goodId = goodId, qty = TF.RARE_QTY, targets = targets, secret = secret, originId = originId,
		unitPrice = math.floor(Ports.Goods[goodId].basePrice * TF.RARE_PRICE + 0.5),
		untilDay = (window + 1) * TF.RARE_WINDOW - 1,
	}
end

-- 판매 보너스 계산(상태 변경 없음). revenue 는 관세 뺀 기본 판매액.
function TF.sellBonus(state, Ports, Regions, portId: string, goodId: string, amount: number, revenue: number)
	local t = TF.get(state)
	local day = state.day or 0
	local port = Ports.Ports[portId]
	local pct, lines = 0, {}
	local key = portId .. "|" .. goodId
	local first = false
	if port and not table.find(port.produces, goodId) and t.firsts[key] == nil then
		pct += TF.FIRST_BONUS; first = true
		table.insert(lines, string.format("★ 신상품! 이 항구 최초 수입 +%d%% (5일간 열풍)", TF.FIRST_BONUS * 100))
	elseif (t.crazes[key] or -1) >= day then
		pct += TF.CRAZE_BONUS
		table.insert(lines, string.format("★ 신상품 열풍 +%d%%", TF.CRAZE_BONUS * 100))
	end
	local fest = TF.festival(Ports, portId, day)
	if fest and fest.active and fest.goodId == goodId then
		pct += TF.FESTIVAL_BONUS
		table.insert(lines, string.format("★ 항구 축제 수요 +%d%%", TF.FESTIVAL_BONUS * 100))
	end
	if port then
		local rv = TF.rival(Ports, Regions, Regions.of(port).id, day)
		if rv and rv.portId == portId and rv.goodId == goodId then
			if rv.arrived then
				pct -= TF.RIVAL_BONUS
				table.insert(lines, string.format("▼ %s이 먼저 휩쓸고 갔다 -%d%%", rv.name, TF.RIVAL_BONUS * 100))
			else
				pct += TF.RIVAL_BONUS
				table.insert(lines, string.format("★ %s보다 먼저 도착! 선점 +%d%%", rv.name, TF.RIVAL_BONUS * 100))
			end
		end
	end
	local rk = TF.rank(state)
	if rk.level > 0 then pct += 0.01 * rk.level end
	pct = math.clamp(pct, -0.3, 1.0)
	local bonus = math.floor(revenue * pct)
	-- 희귀 화물: 지정 항구에서만 추가 배수
	local rare = t.rare[goodId]
	local rareUnits = 0
	if rare and rare.qty > 0 and day <= rare.untilDay and table.find(rare.targets, portId) then
		rareUnits = math.min(amount, rare.qty)
		local extra = math.floor(revenue / amount * rareUnits * (TF.RARE_SELL - 1))
		bonus += extra
		table.insert(lines, string.format("◆ 희귀 화물 %d개 지정 항구 판매 +%d", rareUnits, extra))
	end
	return { bonus = bonus, lines = lines, first = first, key = key, rareUnits = rareUnits }
end

-- 판매 확정 후 기록
function TF.commitSell(state, info, profit: number, goodId: string, amount: number)
	local t = TF.get(state)
	local day = state.day or 0
	if info.first then
		t.firsts[info.key] = day
		t.crazes[info.key] = day + TF.CRAZE_DAYS
	end
	-- 지난 열풍 정리
	for k, d in t.crazes do if d < day then t.crazes[k] = nil end end
	local before = TF.rank(state)
	if profit > 0 then t.profit += profit end
	local rare = t.rare[goodId]
	if rare then
		-- 지정 항구가 아니어도 판 만큼 희귀 표시를 줄인다(일반 판매)
		rare.qty = math.max(0, rare.qty - (if info.rareUnits > 0 then info.rareUnits else math.min(amount, rare.qty)))
		if rare.qty <= 0 or day > rare.untilDay then t.rare[goodId] = nil end
	end
	local after = TF.rank(state)
	if after.index > before.index then
		return string.format("■ 상회 등급 상승: %s → %s (판매 +%d%%, 관세 -%d%%)", before.name, after.name, after.level, after.level * 10)
	end
	return nil
end

-- 희귀 화물 구매 기록
function TF.commitRareBuy(state, lot)
	local t = TF.get(state)
	t.lots[lot.key] = true
	local cur = t.rare[lot.goodId]
	local untilDay = (state.day or 0) + TF.RARE_KEEP
	if cur then
		cur.qty += lot.qty
		cur.targets = lot.targets
		cur.untilDay = untilDay
	else
		t.rare[lot.goodId] = { qty = lot.qty, targets = lot.targets, untilDay = untilDay }
	end
end

-- 화면 표시용 요약
function TF.view(state, Ports, Regions)
	local t = TF.get(state)
	local day = state.day or 0
	local portId = state.portId
	local port = Ports.Ports[portId]
	local goodName = function(id) return (Ports.Goods[id] and Ports.Goods[id].name) or id end
	local portName = function(id) return (Ports.Ports[id] and Ports.Ports[id].name) or id end
	local out = { rank = TF.rank(state), festivals = {}, crazes = {}, rare = {} }
	if not port then return out end
	local regionId = Regions.of(port).id
	-- 같은 해역 축제: 진행 중 + 12일 안 예정, 가까운 순 4곳
	local fests = {}
	for _, id in portList(Ports) do
		local p = Ports.Ports[id]
		if Regions.of(p).id == regionId then
			local f = TF.festival(Ports, id, day)
			if f and f.startDay - day <= 12 then
				table.insert(fests, { port = portName(id), portId = id, good = goodName(f.goodId), inDays = math.max(0, f.startDay - day), active = f.active, endIn = f.endDay - day })
			end
		end
	end
	table.sort(fests, function(a, b)
		if a.active ~= b.active then return a.active end
		if a.inDays ~= b.inDays then return a.inDays < b.inDays end
		return a.portId < b.portId
	end)
	for i = 1, math.min(4, #fests) do table.insert(out.festivals, fests[i]) end
	local rv = TF.rival(Ports, Regions, regionId, day)
	if rv then
		out.rival = { name = rv.name, port = portName(rv.portId), good = goodName(rv.goodId), arrived = rv.arrived,
			inDays = rv.arriveDay - day, endIn = rv.endDay - day, here = rv.portId == portId }
	end
	for k, d in t.crazes do
		local p, g = string.match(k, "^(.-)|(.+)$")
		if p == portId and d >= day then table.insert(out.crazes, { good = goodName(g), left = d - day }) end
	end
	local lot = TF.rareLot(Ports, Regions, portId, day, state)
	if lot then
		local names = {}
		for _, id in lot.targets do table.insert(names, portName(id)) end
		out.lot = { goodId = lot.goodId, good = goodName(lot.goodId), qty = lot.qty, unitPrice = lot.unitPrice,
			total = lot.unitPrice * lot.qty, targets = names, untilIn = lot.untilDay - day, bought = t.lots[lot.key] == true, secret = lot.secret,
			origin = if lot.originId then portName(lot.originId) else nil }
	end
	for g, r in t.rare do
		if r.qty > 0 and day <= r.untilDay then
			local names = {}
			for _, id in r.targets do table.insert(names, portName(id)) end
			table.insert(out.rare, { good = goodName(g), qty = r.qty, targets = names, left = r.untilDay - day })
		end
	end
	return out
end

return TF
