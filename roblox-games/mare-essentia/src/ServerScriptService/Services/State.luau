--!nonstrict
-- 플레이어 상태와 계산 도우미. Roblox API를 쓰지 않는 순수 모듈이라 서버 밖에서도 테스트할 수 있다.
-- 사용: local State = require(State)(D)  (D = 공용 데이터 모듈 묶음)

return function(D)
	local State = {}

	local MAX_SUPPLIES = 300

	local function num(v, default, lo, hi)
		if type(v) ~= "number" or v ~= v then
			return default
		end
		return math.clamp(v, lo, hi)
	end

	function State.new(nationId, startYear)
		local nation = D.Ports.Nations[nationId]
		assert(nation, "unknown nation: " .. tostring(nationId))
		local def = D.Ships.Ships.caravel
		return {
			nationId = nationId,
			coins = 500 + nation.startCoins,
			fame = 0,
			day = 0,
			startYear = startYear,
			portId = nation.startPort,
			ship = { id = def.id, hull = def.hull, crew = def.crew, supplies = 30, cannon = "basic", plating = 0 },
			license = 0,
			insured = false,
			auto = { supplies = false, crew = false },
			morale = 80,
			maps = {},
			bounty = { taken = {}, done = {} },
			escorts = 0,
			fleet = {},
			rep = {},
			gear = { owned = {}, equipped = {} },
			storySeen = {},
			talked = {},
			cargo = {},
			basis = {},
			discovered = {},
			tech = {},
			careers = D.Careers.new(),
			loadout = table.clone(D.Skills.DefaultLoadout),
			quests = { active = {}, done = {} },
			stats = { battlesWon = 0, battlesLost = 0, visited = { [nation.startPort] = true }, explored = 0 },
			pace = { days = 0, window = 0, used = 0 }, -- 역사 앞당김(일): 발견·보고·연구·퀘스트로 쌓이고 한도가 있다
			portStages = {}, -- 항구 건물 계통 단계 (항구 id → 계통 id → 단계)
			stocks = { held = {}, cost = {}, next = 90, divTotal = 0, trades = 0 }, -- 증권거래소: 보유 주식·평균 단가 계산용 비용·다음 배당일
			history = { seen = {}, fx = {} }, -- 역사 사건: seen[id]=고른 선택지, pending=지금 기다리는 사건 id, fx=지역 시세 효과
			landmarks = {}, -- 항구별 특수 건축물 (항구 id → 건축물 id → true)
			portTech = {}, -- 공동 발표로 쌓인 항구별 학문 기술 점수 (항구 id → 학문 id → 점수)
			academy = { presented = 0, expos = 0, medals = 0, joint = 0, launched = 0, era = 1, last = {}, shown = {} }, -- 학회 발표·박람회 기록 (shown: 전시한 카드)
			reported = {}, -- 학자에게 보고해 이해한 지식(카드 id → true)
			tactics = { cleared = {} }, -- 지상 전술 탐험 기록: 지점 id → { rank, turns, biome }
			scholarsMet = {},
			bosses = {},
			specialty = nil,
			specLevels = {},
			companions = {},
			affinity = {},
			harbor = {},
			bank = { deposit = 0, loan = 0, lastDay = 0 },
			contract = nil,
			title = 0,
			story = {},
			collected = {},
		}
	end

	function State.year(state)
		return state.startYear + math.floor(state.day / 365)
	end

	function State.advanceDays(state, n)
		state.day += n
	end

	function State.shipDef(state)
		return D.Ships.refit(D.Ships.Ships[state.ship.id], state.ship.cannon, state.ship.plating)
	end

	function State.techSum(state, field)
		local total = 0
		for id in state.tech do
			local t = D.Tech.Tech[id]
			if t and t[field] then
				total += t[field]
			end
		end
		return total
	end

	-- 선단(기함 외의 배, 최대 3척): 화물칸은 더해지고, 속도는 가장 느린 배에 맞춰진다
	State.MAX_FLEET = 3
	function State.fleetCargo(state)
		local n = 0
		for _, f in state.fleet do
			local fd = D.Ships.Ships[f.id]
			if fd then
				n += fd.cargo
			end
		end
		return n
	end

	function State.fleetSpeed(state, speed)
		for _, f in state.fleet do
			local fd = D.Ships.Ships[f.id]
			if fd and not fd.steam then
				speed = math.min(speed, fd.speed)
			end
		end
		return speed
	end

	-- 선단 배의 선원은 정원의 60%를 따로 태운다 (보급품 소모에 더해진다)
	function State.fleetCrew(state)
		local n = 0
		for _, f in state.fleet do
			local fd = D.Ships.Ships[f.id]
			if fd then
				n += math.floor(fd.crew * 0.6)
			end
		end
		return n
	end

	function State.totalCrew(state)
		return state.ship.crew + State.fleetCrew(state)
	end

	function State.fleetCannons(state)
		local n = 0
		for _, f in state.fleet do
			local fd = D.Ships.Ships[f.id]
			if fd then
				n += fd.cannons
			end
		end
		return math.floor(n * 0.6)
	end

	function State.fleetHull(state)
		local n = 0
		for _, f in state.fleet do
			n += math.floor(f.hull * 0.5)
		end
		return n
	end

	function State.cargoCapacityFor(state, def)
		return math.floor((def.cargo + State.fleetCargo(state)) * (1 + State.techSum(state, "cargoMult")))
	end

	function State.cargoCapacity(state)
		return State.cargoCapacityFor(state, State.shipDef(state))
	end

	function State.cargoUsed(state)
		local total = 0
		for _, qty in state.cargo do
			total += qty
		end
		return total
	end

	function State.countDiscovered(state)
		local n = 0
		for _ in state.discovered do
			n += 1
		end
		return n
	end

	function State.countVisited(state)
		local n = 0
		for _ in state.stats.visited do
			n += 1
		end
		return n
	end

	function State.removeCargo(state, goodId, amount)
		local left = (state.cargo[goodId] or 0) - amount
		state.cargo[goodId] = if left > 0 then left else nil
		if left <= 0 then
			state.basis[goodId] = nil
		end
	end

	function State.gainXp(state, careerId, amount, msgs)
		local nation = D.Ports.Nations[state.nationId]
		local mult = 1
		if careerId == "adventure" then
			mult = nation.adventureXpMult
		elseif careerId == "battle" then
			mult = nation.battleXpMult
		end
		local gained = D.Careers.addXp(state.careers, careerId, amount * mult)
		if gained > 0 and msgs then
			table.insert(msgs, string.format("%s 레벨 %d!", D.Careers.NAMES[careerId], state.careers[careerId].level))
		end
		return gained
	end

	function State.maxSupplies()
		return MAX_SUPPLIES
	end

	-- 저장된 데이터를 검증해서 상태로 복원한다. 쓸 수 없으면 nil.
	function State.sanitize(saved)
		if type(saved) ~= "table" or not D.Ports.Nations[saved.nationId] then
			return nil
		end
		local s = State.new(saved.nationId, math.floor(num(saved.startYear, 1700, 1500, 1800)))
		s.coins = math.floor(num(saved.coins, s.coins, 0, 1e9))
		s.fame = math.floor(num(saved.fame, 0, 0, 1e9))
		s.day = math.floor(num(saved.day, 0, 0, 1e6))
		if type(saved.portId) == "string" and D.Ports.Ports[saved.portId] then
			s.portId = saved.portId
		end

		if type(saved.ship) == "table" and D.Ships.Ships[saved.ship.id] then
			local def = D.Ships.Ships[saved.ship.id]
			local cannon = if type(saved.ship.cannon) == "string" and D.Ships.CannonById[saved.ship.cannon] then saved.ship.cannon else "basic"
			local plating = math.floor(num(saved.ship.plating, 0, 0, #D.Ships.Plating))
			local rdef = D.Ships.refit(def, cannon, plating)
			s.ship = {
				id = def.id,
				hull = math.floor(num(saved.ship.hull, rdef.hull, 1, rdef.hull)),
				crew = math.floor(num(saved.ship.crew, def.crew, 1, def.crew)),
				supplies = math.floor(num(saved.ship.supplies, 0, 0, MAX_SUPPLIES)),
				cannon = cannon,
				plating = plating,
			}
		end

		if type(saved.cargo) == "table" then
			for goodId, qty in saved.cargo do
				if D.Ports.Goods[goodId] and type(qty) == "number" and qty >= 1 then
					s.cargo[goodId] = math.floor(qty)
					s.basis[goodId] = num(type(saved.basis) == "table" and saved.basis[goodId], 0, 0, 1e6)
				end
			end
		end

		if type(saved.discovered) == "table" then
			for id, v in saved.discovered do
				if v == true and D.Cards.ById[id] then
					s.discovered[id] = true
				end
			end
		end
		if type(saved.tech) == "table" then
			for id, v in saved.tech do
				if v == true and D.Tech.Tech[id] then
					s.tech[id] = true
				end
			end
		end
		if type(saved.careers) == "table" then
			for _, id in D.Careers.IDS do
				local c = saved.careers[id]
				if type(c) == "table" then
					s.careers[id] = {
						level = math.floor(num(c.level, 1, 1, D.Careers.MAX_LEVEL)),
						xp = math.floor(num(c.xp, 0, 0, 1e9)),
					}
				end
			end
		end
		if type(saved.loadout) == "table" then
			local list, seen = {}, {}
			for _, id in saved.loadout do
				if type(id) == "string" and D.Skills.Skills[id] and not seen[id] and #list < 6 then
					seen[id] = true
					table.insert(list, id)
				end
			end
			if #list > 0 then
				s.loadout = list
			end
		end
		if type(saved.quests) == "table" then
			if type(saved.quests.active) == "table" then
				for id, q in saved.quests.active do
					if D.Quests.ById[id] and type(q) == "table" then
						s.quests.active[id] = {
							delivered = math.floor(num(q.delivered, 0, 0, 1e6)),
							baseWins = math.floor(num(q.baseWins, 0, 0, 1e9)),
						}
					end
				end
			end
			if type(saved.quests.done) == "table" then
				for id, v in saved.quests.done do
					if v == true and D.Quests.ById[id] then
						s.quests.done[id] = true
					end
				end
			end
		end
		if type(saved.specialty) == "string" and D.Specialties.SpecialtyById[saved.specialty] then
			s.specialty = saved.specialty
		end
		if type(saved.specLevels) == "table" then
			for id, rec in saved.specLevels do
				if type(id) == "string" and D.Specialties.SpecialtyById[id] and type(rec) == "table" then
					local lv = math.floor(num(rec.level, 1, 1, D.Specialties.MAX_LEVEL))
					s.specLevels[id] = {
						level = lv,
						xp = if lv >= D.Specialties.MAX_LEVEL then 0 else math.floor(num(rec.xp, 0, 0, 1e7)),
					}
				end
			end
		end
		if type(saved.affinity) == "table" then
			for id, v in saved.affinity do
				if type(id) == "string" and D.Specialties.CompanionById[id] then
					s.affinity[id] = math.floor(num(v, 0, 0, D.Specialties.MAX_AFFINITY))
				end
			end
		end
		if type(saved.companions) == "table" then
			for _, id in saved.companions do
				if
					type(id) == "string"
					and D.Specialties.CompanionById[id]
					and not table.find(s.companions, id)
					and #s.companions < D.Specialties.MAX_COMPANIONS
				then
					table.insert(s.companions, id)
				end
			end
		end
		if type(saved.bank) == "table" then
			s.bank.deposit = math.floor(num(saved.bank.deposit, 0, 0, 1e12))
			s.bank.loan = math.floor(num(saved.bank.loan, 0, 0, 1e12))
			s.bank.lastDay = math.floor(num(saved.bank.lastDay, 0, 0, 1e9))
		end
		s.license = math.floor(num(saved.license, 0, 0, #D.Ships.Licenses))
		s.insured = saved.insured == true
		s.morale = math.floor(num(saved.morale, 80, 0, 100))
		if type(saved.bounty) == "table" then
			if type(saved.bounty.taken) == "table" then
				for id, v in saved.bounty.taken do
					if type(id) == "string" and #id < 40 and type(v) == "number" then
						s.bounty.taken[id] = math.floor(num(v, 0, 0, 1e9))
					end
				end
			end
			if type(saved.bounty.done) == "table" then
				for id, v in saved.bounty.done do
					if type(id) == "string" and #id < 40 and v == true then
						s.bounty.done[id] = true
					end
				end
			end
		end
		s.escorts = math.floor(num(saved.escorts, 0, 0, 3))
		s.fleet = {}
		if type(saved.fleet) == "table" then
			for _, f in saved.fleet do
				if type(f) == "table" and type(f.id) == "string" and D.Ships.Ships[f.id] and #s.fleet < 3 then
					local fd = D.Ships.Ships[f.id]
					table.insert(s.fleet, { id = f.id, hull = math.floor(num(f.hull, fd.hull, 1, fd.hull)) })
				end
			end
		end
		if type(saved.rep) == "table" then
			for k, v in saved.rep do
				if type(k) == "string" and #k < 30 then
					s.rep[k] = math.floor(num(v, 0, 0, 100))
				end
			end
		end
		if type(saved.gear) == "table" then
			if type(saved.gear.owned) == "table" then
				for _, id in saved.gear.owned do
					if type(id) == "string" and D.Gear.ById[id] and not table.find(s.gear.owned, id) then
						table.insert(s.gear.owned, id)
					end
				end
			end
			if type(saved.gear.equipped) == "table" then
				for _, id in saved.gear.equipped do
					if type(id) == "string" and table.find(s.gear.owned, id) and not table.find(s.gear.equipped, id) and #s.gear.equipped < D.Gear.SLOTS then
						table.insert(s.gear.equipped, id)
					end
				end
			end
		end
		if type(saved.storySeen) == "table" then
			for k, v in saved.storySeen do
				if type(k) == "string" and v == true and #k < 40 then
					s.storySeen[k] = true
				end
			end
		end
		if type(saved.maps) == "table" then
			for _, m in saved.maps do
				if type(m) == "table" and type(m.to) == "string" and D.Ports.Ports[m.to] and #s.maps < 3 then
					table.insert(s.maps, { to = m.to, reward = math.floor(num(m.reward, 300, 50, 5000)) })
				end
			end
		end
		if type(saved.auto) == "table" then
			s.auto.supplies = saved.auto.supplies == true
			s.auto.crew = saved.auto.crew == true
		end
		s.title = math.floor(num(saved.title, 0, 0, #D.Facilities.TITLES))
		if type(saved.contract) == "table" and D.Ports.Goods[saved.contract.goodId] and D.Ports.Ports[saved.contract.toPortId] then
			local c = saved.contract
			s.contract = {
				goodId = c.goodId,
				amount = math.floor(num(c.amount, 1, 1, 100)),
				toPortId = c.toPortId,
				reward = math.floor(num(c.reward, 0, 0, 1e7)),
				fame = math.floor(num(c.fame, 0, 0, 1000)),
				deadline = math.floor(num(c.deadline, 0, 0, 1e9)),
			}
		end
		if type(saved.collected) == "table" then
			for key, v in saved.collected do
				if type(key) == "string" and v == true and key:match("^[%w]+:%d+$") then
					s.collected[key] = true
				end
			end
		end
		if type(saved.story) == "table" then
			for id, choice in saved.story do
				local e = type(id) == "string" and D.Story.ById[id]
				if e and type(choice) == "number" and e.choices[math.floor(choice)] then
					s.story[id] = math.floor(choice)
				end
			end
		end
		if type(saved.harbor) == "table" then
			for id, v in saved.harbor do
				if type(id) == "string" and D.Ports.Ports[id] then
					s.harbor[id] = math.floor(num(v, 0, 0, 1e9))
				end
			end
		end
		if type(saved.bosses) == "table" then
			for id, rec in saved.bosses do
				if type(id) == "string" and D.Bosses.ById[id] and type(rec) == "table" then
					s.bosses[id] = {
						defeated = math.floor(num(rec.defeated, 0, 0, 1e6)),
						lastDay = math.floor(num(rec.lastDay, -1e6, -1e6, 1e6)),
					}
				end
			end
		end
		if type(saved.stats) == "table" then
			s.stats.battlesWon = math.floor(num(saved.stats.battlesWon, 0, 0, 1e9))
			s.stats.battlesLost = math.floor(num(saved.stats.battlesLost, 0, 0, 1e9))
			s.stats.explored = math.floor(num(saved.stats.explored, 0, 0, 1e9))
			if type(saved.stats.visited) == "table" then
				for id, v in saved.stats.visited do
					if v == true and D.Ports.Ports[id] then
						s.stats.visited[id] = true
					end
				end
			end
		end
		if type(saved.pace) == "table" then
			s.pace.days = math.floor(num(saved.pace.days, 0, 0, 365 * 10))
			s.pace.window = math.floor(num(saved.pace.window, 0, 0, 1e9))
			s.pace.used = math.floor(num(saved.pace.used, 0, 0, 1000))
		end
		if type(saved.portStages) == "table" then
			for portId, t in saved.portStages do
				if type(portId) == "string" and #portId <= 40 and type(t) == "table" then
					s.portStages[portId] = {}
					for chainId, n in t do
						if type(chainId) == "string" and #chainId <= 24 and type(n) == "number" and n == n then
							s.portStages[portId][chainId] = math.floor(math.clamp(n :: number, 0, 10))
						end
					end
				end
			end
		end
		if type(saved.stocks) == "table" then
			local k = saved.stocks
			for _, field in { "held", "cost" } do
				if type(k[field]) == "table" then
					for id, v in k[field] do
						if type(id) == "string" and #id <= 24 and type(v) == "number" and v == v then
							s.stocks[field][id] = math.floor(math.clamp(v :: number, 0, 1e12))
						end
					end
				end
			end
			s.stocks.next = if type(k.next) == "number" then math.floor(k.next) else s.stocks.next
			s.stocks.divTotal = math.floor(num(k.divTotal, 0, 0, 1e12))
			s.stocks.trades = math.floor(num(k.trades, 0, 0, 1e9))
		end
		if type(saved.history) == "table" then
			local h = saved.history
			if type(h.seen) == "table" then
				for id, v in h.seen do
					if type(id) == "string" and #id <= 40 and type(v) == "number" then
						s.history.seen[id] = math.floor(math.clamp(v, 0, 9))
					end
				end
			end
			if type(h.pending) == "string" and #h.pending <= 40 then
				s.history.pending = h.pending
			end
			if type(h.fx) == "table" then
				for _, f in h.fx do
					if type(f) == "table" and type(f.goods) == "table" and type(f.regions) == "table" and type(f.mult) == "number" and type(f.untilDay) == "number" and #s.history.fx < 20 then
						local goods, regions = {}, {}
						for _, g in f.goods do
							if type(g) == "string" and #g <= 24 then table.insert(goods, g) end
						end
						for _, r in f.regions do
							if type(r) == "string" and #r <= 24 then table.insert(regions, r) end
						end
						table.insert(s.history.fx, { goods = goods, regions = regions, mult = math.clamp(f.mult, 0.3, 3), untilDay = f.untilDay, title = if type(f.title) == "string" then string.sub(f.title, 1, 40) else nil })
					end
				end
			end
		end
		if type(saved.landmarks) == "table" then
			for portId, t in saved.landmarks do
				if type(portId) == "string" and #portId <= 40 and type(t) == "table" then
					s.landmarks[portId] = {}
					for id, v in t do
						if type(id) == "string" and #id <= 24 and v == true then
							s.landmarks[portId][id] = true
						end
					end
				end
			end
		end
		if type(saved.portTech) == "table" then
			for portId, t in saved.portTech do
				if type(portId) == "string" and #portId <= 40 and type(t) == "table" then
					s.portTech[portId] = {}
					for disc, v in t do
						if type(disc) == "string" and #disc <= 24 and type(v) == "number" and v == v then
							s.portTech[portId][disc] = math.floor(math.clamp(v, 0, 100000))
						end
					end
				end
			end
		end
		if type(saved.academy) == "table" then
			s.academy.presented = math.floor(num(saved.academy.presented, 0, 0, 1e6))
			s.academy.expos = math.floor(num(saved.academy.expos, 0, 0, 1e6))
			s.academy.medals = math.floor(num(saved.academy.medals, 0, 0, 1e6))
			s.academy.joint = math.floor(num(saved.academy.joint, 0, 0, 1e6))
			s.academy.era = math.floor(num(saved.academy.era, 1, 1, 5))
			s.academy.launched = math.floor(num(saved.academy.launched, 0, 0, 1e6))
			if type(saved.academy.shown) == "table" then
				for k, v in saved.academy.shown do
					if type(k) == "string" and #k <= 60 and v == true then
						s.academy.shown[k] = true
					end
				end
			end
			if type(saved.academy.last) == "table" then
				for k, v in saved.academy.last do
					if type(k) == "string" and #k <= 60 and type(v) == "number" and v == v then
						s.academy.last[k] = math.floor(math.clamp(v, 0, 1e9))
					end
				end
			end
		end
		if type(saved.reported) == "table" then
			for id, v in saved.reported do
				if type(id) == "string" and #id <= 60 and v == true then
					s.reported[id] = true
				end
			end
		end
		if type(saved.tactics) == "table" and type(saved.tactics.cleared) == "table" then
			for id, rec in saved.tactics.cleared do
				if type(id) == "string" and #id <= 60 and type(rec) == "table" and (rec.rank == "S" or rec.rank == "A" or rec.rank == "B") then
					s.tactics.cleared[id] = {
						rank = rec.rank,
						turns = math.floor(num(rec.turns, 0, 0, 999)),
						biome = if type(rec.biome) == "string" then string.sub(rec.biome, 1, 24) else "",
						objective = if type(rec.objective) == "string" then string.sub(rec.objective, 1, 24) else "",
					}
				end
			end
		end
		if type(saved.scholarsMet) == "table" then
			for id, v in saved.scholarsMet do
				if v == true then
					s.scholarsMet[tostring(id)] = true
				end
			end
		end
		return s
	end

	-- 저장용 복사본 (임시 필드는 제외)
	function State.serialize(state)
		return {
			nationId = state.nationId,
			coins = state.coins,
			fame = state.fame,
			day = state.day,
			startYear = state.startYear,
			portId = state.portId,
			ship = state.ship,
			cargo = state.cargo,
			basis = state.basis,
			discovered = state.discovered,
			tech = state.tech,
			careers = state.careers,
			loadout = state.loadout,
			quests = state.quests,
			stats = state.stats,
			reported = state.reported,
			academy = state.academy,
			portTech = state.portTech,
			landmarks = state.landmarks,
			history = state.history,
			stocks = state.stocks,
			portStages = state.portStages,
			pace = state.pace,
			tactics = state.tactics,
			scholarsMet = state.scholarsMet,
			bosses = state.bosses,
			specialty = state.specialty,
			specLevels = state.specLevels,
			companions = state.companions,
			affinity = state.affinity,
			harbor = state.harbor,
			bank = state.bank,
			contract = state.contract,
			title = state.title,
			license = state.license,
			insured = state.insured,
			auto = state.auto,
			morale = state.morale,
			maps = state.maps,
			bounty = state.bounty,
			escorts = state.escorts,
			fleet = state.fleet,
			rep = state.rep,
			gear = state.gear,
			storySeen = state.storySeen,
			story = state.story,
			collected = state.collected,
		}
	end

	return State
end
