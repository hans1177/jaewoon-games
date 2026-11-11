--!nonstrict
-- 지식 트리 서비스: 발견한 카드를 학자에게 보고해 "이해"로 바꾼다. 따로 수락할 필요는 없다.
-- 선행 지식을 이해해야 다음 지식을 보고할 수 있고, 이해한 지식은 항해·화력·교역품 값에 효과를 준다.

return function(D, S)
	local K = D.KnowledgeTree
	local handlers = {}

	local FAME = { Common = 3, Uncommon = 6, Rare = 12, Epic = 25, Legendary = 50 }

	local function cardName(id)
		local c = D.Cards.ById[id]
		return c and c.name or id
	end

	local function findScholar(id)
		for _, s in D.Scholars.Scholars do
			if s.id == id then
				return s
			end
		end
		return nil
	end

	-- 이 학자가 받아 줄 수 있는 학문 id 목록
	local function scholarDisciplines(scholar)
		return K.ScholarDisciplines[scholar.id] or {}
	end

	-- 지금 이 학자에게 보고할 수 있는 노드 수
	local function reportableCount(state, scholar)
		local discs = scholarDisciplines(scholar)
		local n = 0
		for _, node in K.Nodes do
			if table.find(discs, node.disc) and K.status(state, node) == "ready" then
				n += 1
			end
		end
		return n
	end

	function handlers.ReportKnowledge(state, p)
		local scholar = type(p.scholarId) == "string" and findScholar(p.scholarId)
		if not scholar then
			return false, "잘못된 요청"
		end
		if scholar.portId ~= state.portId then
			return false, "이 항구에 있지 않아요"
		end
		local year = S.State.year(state)
		if year < scholar.fromYear or year > scholar.toYear then
			return false, string.format("지금(%d년)은 만날 수 없어요", year)
		end
		local discs = scholarDisciplines(scholar)
		if #discs == 0 then
			return false, "이 학자는 보고를 받지 않아요"
		end
		state.reported = state.reported or {}
		local msgs = {}
		local totalFame, totalCoins = 0, 0
		-- 보고하면 새로 이해한 지식 때문에 다음 지식도 이어서 보고할 수 있다
		local progressed = true
		while progressed do
			progressed = false
			for _, node in K.Nodes do
				if table.find(discs, node.disc) and K.status(state, node) == "ready" then
					state.reported[node.id] = true
					progressed = true
					local card = D.Cards.ById[node.id]
					local fame = FAME[card and card.rarity or "Common"] or 3
					local coins = fame * 8
					state.fame += fame
					state.coins += coins
					totalFame += fame
					totalCoins += coins
					local line = string.format("보고: %s", cardName(node.id))
					if node.fx and node.fx.label then
						line ..= " — " .. node.fx.label
					end
					table.insert(msgs, line)
				end
			end
		end
		if #msgs == 0 then
			-- 왜 못 했는지 알려 준다 (인과 관계)
			local hints = {}
			for _, node in K.Nodes do
				if table.find(discs, node.disc) then
					local st, missing = K.status(state, node)
					if st == "blocked" and #hints < 2 then
						local names = {}
						for _, m in missing do
							table.insert(names, cardName(m))
						end
						table.insert(hints, string.format("%s: 먼저 %s을(를) 이해해야 해요", cardName(node.id), table.concat(names, ", ")))
					end
				end
			end
			if #hints > 0 then
				return false, scholar.name .. ": 아직 이어 설명할 수 없네.\n" .. table.concat(hints, "\n")
			end
			return false, scholar.name .. ": 새로 보고할 발견이 없네. 더 탐험하고 오게."
		end
		table.insert(msgs, 1, string.format("%s에게 발견을 보고했다.", scholar.name))
		table.insert(msgs, string.format("보고 보상: 명성 +%d, +%d코인", totalFame, totalCoins))
		S.Perk.addAffinity(state, 1, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 항구의 학문: 그 항구에 있는 학자들이 다루는 학문
	local function portDisciplines(portId)
		local set, list = {}, {}
		for _, sc in D.Scholars.Scholars do
			if sc.portId == portId then
				for _, d in K.ScholarDisciplines[sc.id] or {} do
					if not set[d] then
						set[d] = true
						table.insert(list, d)
					end
				end
			end
		end
		return list
	end

	-- 항구 투자가 학자들의 연구 성과를 키우고, 그 학문과 관련된 교역품 공급이 늘어 값이 싸진다 (최대 20%)
	local function researchOf(state, portId)
		local lvl = D.Harbor.level(state.harbor[portId] or 0)
		local discs = portDisciplines(portId)
		local understood = 0
		for _, node in K.Nodes do
			if table.find(discs, node.disc) and K.understood(state, node.id) then
				understood += 1
			end
		end
		return math.min(0.2, (lvl - 1) * 0.03 + understood * 0.005), lvl, discs
	end

	local function supplyMult(state, portId, goodId)
		local r, _, discs = researchOf(state, portId)
		if r <= 0 then
			return 1
		end
		for _, d in discs do
			if table.find(K.DisciplineGoods[d] or {}, goodId) then
				return 1 - r
			end
		end
		return 1
	end

	local function understoodIn(state, disc)
		local n = 0
		for _, node in K.Nodes do
			if node.disc == disc and K.understood(state, node.id) then
				n += 1
			end
		end
		return n
	end

	local function ensureAcademy(state)
		state.academy = state.academy or { presented = 0, expos = 0, last = {} }
		return state.academy
	end

	local PRESENT_COOLDOWN, EXPO_COOLDOWN, PRESENT_MIN = 60, 90, 3

	-- 학회 발표: 이해한 지식을 그 학문의 학회(학자가 있는 항구)에서 발표한다.
	function handlers.Present(state, p)
		local disc = type(p.disc) == "string" and K.DisciplineById[p.disc]
		if not disc then
			return false, "잘못된 요청"
		end
		if not table.find(portDisciplines(state.portId), disc.id) then
			return false, "이 항구에는 그 학문을 다루는 학회가 없어요"
		end
		local n = understoodIn(state, disc.id)
		if n < PRESENT_MIN then
			return false, string.format("%s 지식을 %d개 이상 이해해야 발표할 수 있어요 (지금 %d)", disc.name, PRESENT_MIN, n)
		end
		local a = ensureAcademy(state)
		local key = state.portId .. ":" .. disc.id
		local last = a.last[key]
		if last and state.day - last < PRESENT_COOLDOWN then
			return false, string.format("다음 발표는 %d일 뒤에 할 수 있어요", PRESENT_COOLDOWN - (state.day - last))
		end
		a.last[key] = state.day
		a.presented += 1
		local fame, coins = 6 * n, 50 * n
		state.fame += fame
		state.coins += coins
		local msgs = { string.format("%s 학회에서 연구를 발표했다! (이해한 지식 %d개)", disc.name, n), string.format("청중의 호평: 명성 +%d, 후원금 +%d코인", fame, coins) }
		S.Perk.addAffinity(state, 1, msgs)
		S.Perk.gainSpec(state, "Physics", 10, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 박람회 출품: 학문으로 개량한 교역품을 항구 박람회에 내놓는다 (교역소 2단계 이상, 화물은 줄지 않음)
	function handlers.Expo(state)
		local lvl = D.Harbor.level(state.harbor[state.portId] or 0)
		if lvl < 2 then
			return false, "박람회는 교역소가 2단계 이상인 항구에서 열려요"
		end
		local a = ensureAcademy(state)
		local key = "expo:" .. state.portId
		local last = a.last[key]
		if last and state.day - last < EXPO_COOLDOWN then
			return false, string.format("다음 박람회는 %d일 뒤에 열려요", EXPO_COOLDOWN - (state.day - last))
		end
		local coins, kinds = 0, 0
		for goodId, count in state.cargo do
			local gm = K.goodsMult(state, goodId)
			if count > 0 and gm > 1.001 and D.Ports.Goods[goodId] then
				kinds += 1
				coins += math.min(3, count) * math.floor(D.Ports.Goods[goodId].basePrice * (1 + (gm - 1) * 5))
			end
		end
		if kinds == 0 then
			return false, "개량된 교역품(✦)을 화물칸에 싣고 와야 출품할 수 있어요"
		end
		a.last[key] = state.day
		a.expos += 1
		local fame = 4 * kinds + 3 * lvl
		state.coins += coins
		state.fame += fame
		local msgs = { string.format("%s 박람회에 개량 교역품 %d종을 출품했다!", D.Ports.Ports[state.portId].name, kinds), string.format("수상 상금 +%d코인, 명성 +%d", coins, fame) }
		return true, table.concat(msgs, "\n")
	end

	-- 화면용 요약
	local function viewOf(state)
		local out = { disciplines = {}, speedBonus = K.speedBonus(state), cannonBonus = K.cannonBonus(state), upgrades = {} }
		for _, d in K.Disciplines do
			local nodes, done, total = {}, 0, 0
			for _, node in K.Nodes do
				if node.disc == d.id then
					total += 1
					local st, missing = K.status(state, node)
					if st == "done" then
						done += 1
					end
					local needNames = {}
					for _, need in node.needs do
						table.insert(needNames, cardName(need))
					end
					local missNames = {}
					for _, m in missing do
						table.insert(missNames, cardName(m))
					end
					table.insert(nodes, {
						id = node.id, name = cardName(node.id), status = st, needs = needNames, missing = missNames,
						effect = node.fx and node.fx.label or nil,
					})
				end
			end
			table.insert(out.disciplines, { id = d.id, name = d.name, summary = d.summary, done = done, total = total, nodes = nodes })
		end
		do
			local r, lvl, discs = researchOf(state, state.portId)
			local names = {}
			for _, d in discs do
				table.insert(names, K.DisciplineById[d].name)
			end
			local a = ensureAcademy(state)
			local pres = {}
			for _, d in discs do
				local last = a.last[state.portId .. ":" .. d]
				table.insert(pres, { disc = d, name = K.DisciplineById[d].name, understood = understoodIn(state, d), wait = if last then math.max(0, PRESENT_COOLDOWN - (state.day - last)) else 0 })
			end
			local lastExpo = a.last["expo:" .. state.portId]
			out.academy = {
				research = math.floor(r * 100 + 0.5), harborLevel = lvl, disciplines = names, present = pres,
				presentMin = PRESENT_MIN, presented = a.presented, expos = a.expos,
				expoWait = if lastExpo then math.max(0, EXPO_COOLDOWN - (state.day - lastExpo)) else 0, expoOpen = lvl >= 2,
			}
		end
		for _, node in K.Nodes do
			local fx = node.fx
			if fx and fx.goods and K.understood(state, node.id) then
				for _, g in fx.goods do
					out.upgrades[g] = math.floor((K.goodsMult(state, g) - 1) * 100 + 0.5)
				end
			end
		end
		return out
	end

	return {
		handlers = handlers, goodsMult = K.goodsMult, speedBonus = K.speedBonus, viewOf = viewOf,
		reportableCount = reportableCount, scholarDisciplines = scholarDisciplines,
		supplyMult = supplyMult, researchOf = researchOf, understoodIn = understoodIn,
	}
end
