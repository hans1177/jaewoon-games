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

	function State.new(nationId, startYear, originId)
		local nation = D.Ports.Nations[nationId]
		assert(nation, "unknown nation: " .. tostring(nationId))
		local def = D.Ships.Ships.caravel
		return {
			nationId = nationId,
			coins = 500 + nation.startCoins + (if originId and D.Specialties.OriginById[originId] then D.Specialties.OriginById[originId].coins else 0),
			fame = if originId and D.Specialties.OriginById[originId] then D.Specialties.OriginById[originId].fame else 0,
			origin = if originId and D.Specialties.OriginById[originId] then originId else nil,
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
			room = nil, -- 방 시계에 참여 중이면 { id }
			order = {}, -- 항구 치안 (항구 id → {v, day, patrolDay})
			orderPatrols = 0,
			peopleTalked = {}, -- 대화를 나눈 인물 (인물 id → true)
			peopleClaimed = {}, -- 인물 백과 보상 받은 단계 (필요 인원 문자열 → true)
			diplo = { rep = {}, passUntil = 0, met = {}, honor = {}, warSeen = {}, rivalN = 0, rivalDay = -99 }, -- 국가 관계: 세력별 호감·통행 증서·만난 항해자·명예 시민·전쟁 알림
			world = nil, -- 세계 이벤트(재해·행운): rng·다음 굴림 날·진행 중인 사건·기록 (World 서비스가 처음 쓸 때 만든다)
			portStages = {}, -- 항구 건물 계통 단계 (항구 id → 계통 id → 단계)
			stocks = { held = {}, cost = {}, next = 90, divTotal = 0, trades = 0 }, -- 증권거래소: 보유 주식·평균 단가 계산용 비용·다음 배당일
			history = { seen = {}, fx = {} }, -- 역사 사건: seen[id]=고른 선택지, pending=지금 기다리는 사건 id, fx=지역 시세 효과
			landmarks = {}, -- 항구별 특수 건축물 (항구 id → 건축물 id → true)
			portTech = {}, -- 공동 발표로 쌓인 항구별 학문 기술 점수 (항구 id → 학문 id → 점수)
			academy = { presented = 0, expos = 0, medals = 0, joint = 0, launched = 0, era = 1, last = {}, shown = {} }, -- 학회 발표·박람회 기록 (shown: 전시한 카드)
			reported = {}, -- 학자에게 보고해 이해한 지식(카드 id → true)
			tactics = { cleared = {} }, -- 지상 전술 탐험 기록: 지점 id → { rank, turns, biome }
			partyTraining = {}, -- 주인공 및 동료 ID별 병종 숙련도와 장비
			scholarsMet = {},
			captain = {}, -- 선장 { name, portrait }
			intro = { name = false, companion = false, portrait = false }, -- 시작 안내 진행
			bosses = {},
			specialty = nil,
			specLevels = {},
			companions = {},
			stations = {}, -- 배의 자리 (자리 id → 동료 id)
			affinity = {},
			harbor = {},
			harborSeen = {}, -- 항구별 마지막으로 들른 날 (자체 성장 계산용)
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
		if state.room then
			return -- 방 시계: 행동으로 시대를 건너뛰지 않는다 (시간은 현실 시간으로 흐른다)
		end
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

		-- [저장 호환] 더는 판매하지 않는 옛 화물은 복원 시 구입 원가(없으면 기존 기본가)로 정산한다.
		-- 기존 저장 키는 유지하고 정상 저장 때 폐지 화물은 기록하지 않는다.
		if type(saved.cargo) == "table" then
			for goodId, qty in saved.cargo do
				if goodId == "tobacco" and type(qty) == "number" and qty == qty and qty >= 1 then
					local paid = type(saved.basis) == "table" and saved.basis[goodId]
					local unit = num(paid, 90, 0, 1e6)
					if unit < 1 then unit = 90 end
					s.coins = math.min(1e9, s.coins + math.floor(num(qty, 0, 0, 1e6)) * unit)
				elseif D.Ports.Goods[goodId] and type(qty) == "number" and qty >= 1 then
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
			-- [저장 호환] 기존 금지 품목 납품 임무는 동일 보상·납품 수량의 합법적인 목재 교역으로 이어간다.
			local oldQuests = {
				q_tobacco_amsterdam = "q_logwood_amsterdam",
				q_tobacco_oslo = "q_logwood_oslo",
				q_tobacco_amsterdam2 = "q_logwood_amsterdam2",
			}
			if type(saved.quests.active) == "table" then
				for id, q in saved.quests.active do
					local currentId = oldQuests[id] or id
					if D.Quests.ById[currentId] and type(q) == "table" then
						s.quests.active[currentId] = {
							delivered = math.floor(num(q.delivered, 0, 0, 1e6)),
							baseWins = math.floor(num(q.baseWins, 0, 0, 1e9)),
						}
					end
				end
			end
			if type(saved.quests.done) == "table" then
				for id, v in saved.quests.done do
					local currentId = oldQuests[id] or id
					if v == true and D.Quests.ById[currentId] then
						s.quests.done[currentId] = true
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
					and #s.companions < D.Specialties.slotsFor(D.Ships.Ships[s.ship.id].class)
				then
					table.insert(s.companions, id)
				end
			end
		end
		if type(saved.partyTraining) == "table" then
			for id, row in saved.partyTraining do
				if type(id) == "string" and (id == "p1" or D.Specialties.CompanionById[id]) and type(row) == "table" then
					local xp = math.floor(num(row.xp, 0, 0, D.TacticsData.MaxMastery))
					local level = 1 + math.floor(xp / D.TacticsData.MasteryPerLevel)
					local unit = { xp = xp, promoted = row.promoted == true and level >= D.TacticsData.PromotionLevel }
					for slot, items in D.TacticsData.PersonalGear do
						local owned = math.floor(num(row[slot .. "Owned"], 1, 1, #items))
						while items[owned].level > level do owned -= 1 end
						unit[slot .. "Owned"] = owned
						unit[slot] = math.floor(num(row[slot], 1, 1, owned))
					end
					if id == "p1" then
						unit.class = type(row.class) == "string" and D.TacticsData.Promotions[row.class] and row.class or "swordsman"
						unit.classTraining = {}
						if type(row.classTraining) == "table" then
							for class in D.TacticsData.Promotions do
								local savedClass = row.classTraining[class]
								if type(savedClass) == "table" then
									local owned = math.floor(num(savedClass.weaponOwned, 1, 1, #D.TacticsData.PersonalGear.weapon))
									while D.TacticsData.PersonalGear.weapon[owned].level > level do owned -= 1 end
									unit.classTraining[class] = {
										weaponOwned = owned, weapon = math.floor(num(savedClass.weapon, 1, 1, owned)),
										promoted = savedClass.promoted == true and level >= D.TacticsData.PromotionLevel,
									}
								end
							end
						end
					end
					s.partyTraining[id] = unit
				end
			end
		end
		-- 배의 자리: 저장된 자리가 올바르면 따르고, 앉지 못한 동료는 맞는 직책 → 빈 자리 순으로 앉힌다
		if type(saved.stations) == "table" then
			for stId, who in saved.stations do
				if type(stId) == "string" and D.Specialties.StationById[stId] and type(who) == "string" and table.find(s.companions, who) then
					local dup = false
					for _, w in s.stations do
						if w == who then
							dup = true
						end
					end
					if not dup then
						s.stations[stId] = who
					end
				end
			end
		end
		for _, cid in s.companions do
			local seated = false
			for _, w in s.stations do
				if w == cid then
					seated = true
				end
			end
			if not seated then
				local want = D.Specialties.CompanionStation[cid] or "boatswain"
				if s.stations[want] == nil then
					s.stations[want] = cid
				else
					for _, st in D.Specialties.Stations do
						if s.stations[st.id] == nil then
							s.stations[st.id] = cid
							break
						end
					end
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
		if type(saved.harborSeen) == "table" then
			for id, v in saved.harborSeen do
				if type(id) == "string" and D.Ports.Ports[id] then
					s.harborSeen[id] = math.floor(num(v, 0, 0, 1e7))
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
		if type(saved.room) == "table" and type(saved.room.id) == "string" and #saved.room.id <= 40 then
			s.room = { id = saved.room.id }
		end
		if type(saved.order) == "table" then
			for id, r in saved.order do
				if type(id) == "string" and D.Ports.Ports[id] and type(r) == "table" then
					s.order[id] = { v = num(r.v, 0, 0, 100), day = math.floor(num(r.day, 0, 0, 1e9)), patrolDay = math.floor(num(r.patrolDay, -1000, -1000, 1e9)) }
				end
			end
		end
		s.orderPatrols = math.floor(num(saved.orderPatrols, 0, 0, 1e9))
		if type(saved.peopleTalked) == "table" then
			for k, v in saved.peopleTalked do
				if v == true and type(k) == "string" and #k <= 40 then s.peopleTalked[k] = true end
			end
		end
		if type(saved.peopleClaimed) == "table" then
			for k, v in saved.peopleClaimed do
				if v == true and type(k) == "string" and #k <= 4 and tonumber(k) then s.peopleClaimed[k] = true end
			end
		end
		if type(saved.world) == "table" then
			local wv = saved.world
			local w = { rng = math.floor(num(wv.rng, 1, 1, 2147483646)), nextDay = math.floor(num(wv.nextDay, 0, 0, 1e9)), cool = {}, active = {}, log = {}, aided = math.floor(num(wv.aided, 0, 0, 1e6)), queue = {}, done = {} }
			if type(wv.cool) == "table" then
				for id, d in wv.cool do
					if type(id) == "string" and #id <= 40 and type(d) == "number" then w.cool[id] = d end
				end
			end
			if type(wv.done) == "table" then
				for id, v in wv.done do
					if v == true and type(id) == "string" and D.WorldEvents.ById[id] then w.done[id] = true end
				end
			end
			for _, q in type(wv.queue) == "table" and wv.queue or {} do
				if type(q) == "table" and type(q.id) == "string" and D.WorldEvents.ById[q.id] and type(q.day) == "number" and type(q.region) == "string" and #w.queue < 20 then
					table.insert(w.queue, { id = q.id, day = q.day, region = string.sub(q.region, 1, 24), cause = if type(q.cause) == "string" then string.sub(q.cause, 1, 60) else nil })
				end
			end
			for _, a in type(wv.active) == "table" and wv.active or {} do
				if type(a) == "table" and type(a.id) == "string" and D.WorldEvents.ById[a.id] and type(a.region) == "string" and type(a.endDay) == "number" and #w.active < 20 then
					table.insert(w.active, { id = a.id, wid = if type(a.wid) == "number" then a.wid else 0, region = string.sub(a.region, 1, 24), title = string.sub(tostring(a.title), 1, 60), text = string.sub(tostring(a.text), 1, 200),
						kind = if a.kind == "fortune" then "fortune" else "disaster", startDay = num(a.startDay, 0, 0, 1e9), endDay = a.endDay, aided = a.aided == true })
				end
			end
			for _, l in type(wv.log) == "table" and wv.log or {} do
				if type(l) == "table" and #w.log < 15 then
					table.insert(w.log, { day = num(l.day, 0, 0, 1e9), year = math.floor(num(l.year, 1650, 1000, 3000)), title = string.sub(tostring(l.title), 1, 60), kind = if l.kind == "fortune" then "fortune" else "disaster", region = string.sub(tostring(l.region), 1, 24), result = string.sub(tostring(l.result), 1, 80) })
				end
			end
			s.world = w
		end
		if type(saved.diplo) == "table" then
			local dv = saved.diplo
			local di = s.diplo
			for id, v in type(dv.rep) == "table" and dv.rep or {} do
				if type(id) == "string" and D.Specialties.PowerName[id] and type(v) == "number" then
					di.rep[id] = math.floor(math.clamp(v, -100, 100))
				end
			end
			for id, v in type(dv.met) == "table" and dv.met or {} do
				if v == true and type(id) == "string" and D.Specialties.VoyagerById[id] then di.met[id] = true end
			end
			for id, v in type(dv.honor) == "table" and dv.honor or {} do
				if v == true and type(id) == "string" and D.Specialties.PowerName[id] then di.honor[id] = true end
			end
			for id, v in type(dv.warSeen) == "table" and dv.warSeen or {} do
				if (v == "on" or v == "end") and type(id) == "string" and #id <= 30 then di.warSeen[id] = v end
			end
			di.passUntil = num(dv.passUntil, 0, 0, 1e9)
			di.rivalN = math.floor(num(dv.rivalN, 0, 0, 5))
			di.rivalDay = math.floor(num(dv.rivalDay, -99, -99, 1e9))
			if type(dv.last) == "string" and D.Ports.Ports[dv.last] then di.last = dv.last end
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
					if type(f) == "table" and type(f.goods) == "table" and type(f.regions) == "table" and type(f.mult) == "number" and type(f.untilDay) == "number" and #s.history.fx < 40 then
						local goods, regions = {}, {}
						for _, g in f.goods do
							if type(g) == "string" and #g <= 24 and D.Ports.Goods[g] then table.insert(goods, g) end
						end
						for _, r in f.regions do
							if type(r) == "string" and #r <= 24 then table.insert(regions, r) end
						end
						table.insert(s.history.fx, { goods = goods, regions = regions, mult = math.clamp(f.mult, 0.3, 3), untilDay = f.untilDay, title = if type(f.title) == "string" then string.sub(f.title, 1, 60) else nil, wid = if type(f.wid) == "number" then f.wid else nil })
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
		if type(saved.origin) == "string" and D.Specialties.OriginById[saved.origin] then
			s.origin = saved.origin
		end
		if type(saved.captain) == "table" then
			local nm = saved.captain.name
			if type(nm) == "string" and utf8.len(nm) and utf8.len(nm) <= 12 and not string.match(nm, "%c") then
				s.captain.name = nm
			end
			local pt = saved.captain.portrait
			if type(pt) == "string" and #pt <= 40 and string.match(pt, "^[%w_:]+$") then
				s.captain.portrait = pt
			end
		end
		-- 예전 저장은 시작 안내를 이미 마친 것으로 본다
		if type(saved.intro) == "table" then
			s.intro = { name = saved.intro.name == true, companion = saved.intro.companion == true, portrait = saved.intro.portrait == true }
		else
			s.intro = { name = true, companion = true, portrait = true }
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
			world = state.world,
			diplo = state.diplo,
			peopleClaimed = state.peopleClaimed,
			room = state.room,
			order = state.order,
			orderPatrols = state.orderPatrols,
			peopleTalked = state.peopleTalked,
			partyTraining = state.partyTraining,
			tactics = state.tactics,
			scholarsMet = state.scholarsMet,
			captain = state.captain,
			origin = state.origin,
			intro = state.intro,
			bosses = state.bosses,
			specialty = state.specialty,
			specLevels = state.specLevels,
			companions = state.companions,
			stations = state.stations,
			affinity = state.affinity,
			harbor = state.harbor,
			harborSeen = state.harborSeen,
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
