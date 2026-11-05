--!nonstrict
-- 클라이언트에 보낼 화면용 스냅샷. 모든 계산은 서버가 하고 클라이언트는 표시만 한다.

return function(D, S)
	local View = {}

	local function sortedKeys(t)
		local keys = {}
		for k in t do
			table.insert(keys, k)
		end
		table.sort(keys)
		return keys
	end

	function View.build(state, ctx)
		local port = D.Ports.Ports[state.portId]
		local def = S.State.shipDef(state)
		local year = S.State.year(state)
		local nation = D.Ports.Nations[state.nationId]

		local view = {}

		view.player = {
			nation = nation.name,
			coins = state.coins,
			fame = state.fame,
			year = year,
			day = state.day,
			portId = port.id,
			portName = port.name,
			hasShipyard = port.shipyard,
		}

		view.ship = {
			id = def.id,
			name = def.name,
			steam = def.steam,
			hull = state.ship.hull,
			maxHull = def.hull,
			crew = state.ship.crew,
			maxCrew = def.crew,
			supplies = state.ship.supplies,
			cannons = def.cannons,
			speed = def.speed,
			cargoUsed = S.State.cargoUsed(state),
			cargoCapacity = S.State.cargoCapacity(state),
			coal = state.cargo.coal or 0,
		}

		view.careers = {}
		for _, id in D.Careers.IDS do
			local c = state.careers[id]
			table.insert(view.careers, {
				id = id,
				name = D.Careers.NAMES[id],
				level = c.level,
				xp = c.xp,
				nextXp = D.Careers.xpForNext(c.level),
			})
		end

		-- 시장 소식 (모든 항구의 진행 중인 사건)
		view.news = {}
		for _, e in ctx.market:activeEvents() do
			local pt, gd = D.Ports.Ports[e.portId], D.Ports.Goods[e.goodId]
			if pt and gd then
				table.insert(view.news, pt.name .. ": " .. (tostring(e.text):gsub("%%s", gd.name)))
			end
		end
		table.sort(view.news)

		-- 시장
		local rate = S.Trade.sellRateFor(state)
		view.sellRate = rate
		view.goods = {}
		for _, goodId in sortedKeys(D.Ports.Goods) do
			local good = D.Ports.Goods[goodId]
			local mult = ctx.market:get(port.id, goodId)
			local ev = ctx.market:eventMult(port.id, goodId)
			local tag = ""
			if table.find(port.produces, goodId) then
				tag = "특산"
			elseif table.find(port.demands, goodId) then
				tag = "수요"
			end
			table.insert(view.goods, {
				id = goodId,
				name = good.name,
				tag = tag,
				buy = D.TradeMath.getPrice(port.id, goodId, mult, ev),
				sell = D.TradeMath.sellPrice(port.id, goodId, mult, rate, ev),
				trend = if ev > 1.01 then "up" elseif ev < 0.99 then "down" else nil,
				owned = state.cargo[goodId] or 0,
			})
		end

		-- 항해 미리보기
		view.routes = {}
		for _, portId in sortedKeys(D.Ports.Ports) do
			if portId ~= port.id then
				local plan = S.Sailing.preview(state, portId)
				table.insert(view.routes, {
					id = portId,
					name = D.Ports.Ports[portId].name,
					days = plan.days,
					supplies = plan.supplies,
					coal = plan.coal,
					distanceKm = math.floor(plan.distanceKm),
				})
			end
		end

		-- 조선소
		view.shipyard = { available = port.shipyard, ships = {}, supplyCost = S.Shipyard.SUPPLY_COST, hireCost = S.Shipyard.HIRE_COST, repairCost = S.Shipyard.REPAIR_COST }
		for _, shipId in D.Ships.Order do
			local s = D.Ships.Ships[shipId]
			local locked = nil
			if s.techReq and not state.tech[s.techReq] then
				locked = "연구 필요: " .. D.Tech.Tech[s.techReq].name
			end
			table.insert(view.shipyard.ships, {
				id = s.id,
				name = s.name,
				steam = s.steam,
				price = s.price,
				cargo = s.cargo,
				speed = s.speed,
				hull = s.hull,
				cannons = s.cannons,
				crew = s.crew,
				summary = s.summary,
				locked = locked,
				owned = (s.id == state.ship.id),
			})
		end

		-- 탐험 지점
		view.sites = {}
		for _, site in D.Sites.Sites do
			if site.portId == port.id then
				local left = 0
				for _, cardId in site.pool do
					if not state.discovered[cardId] then
						left += 1
					end
				end
				table.insert(view.sites, {
					id = site.id,
					name = site.name,
					minLevel = site.minLevel,
					days = site.days,
					left = left,
					unlocked = state.careers.adventure.level >= site.minLevel,
				})
			end
		end

		-- 학자
		view.scholars = {}
		for _, sc in D.Scholars.Scholars do
			if sc.portId == port.id then
				local status = "ready"
				if state.scholarsMet[sc.id] then
					status = "met"
				elseif year < sc.fromYear then
					status = string.format("%d년부터", sc.fromYear)
				elseif year > sc.toYear then
					status = "만날 수 없음"
				elseif state.fame < sc.minFame then
					status = string.format("명성 %d 필요", sc.minFame)
				end
				table.insert(view.scholars, { id = sc.id, name = sc.name, status = status })
			end
		end

		-- 퀘스트
		view.quests = { active = {}, available = {}, doneCount = 0 }
		for _ in state.quests.done do
			view.quests.doneCount += 1
		end
		for _, q in D.Quests.Quests do
			if state.quests.active[q.id] then
				table.insert(view.quests.active, {
					id = q.id,
					name = q.name,
					summary = q.summary,
					kind = q.kind,
					progress = S.Quest.progress(state, q),
					amount = q.amount,
					rewardCoins = q.rewardCoins,
				})
			elseif not state.quests.done[q.id] then
				table.insert(view.quests.available, { id = q.id, name = q.name, summary = q.summary, rewardCoins = q.rewardCoins })
			end
		end

		-- 도감
		view.codex = { total = #D.Cards.Cards, found = S.State.countDiscovered(state), cards = {} }
		for _, c in D.Cards.Cards do
			local found = state.discovered[c.id] == true
			table.insert(view.codex.cards, {
				id = c.id,
				field = c.field,
				rarity = c.rarity,
				found = found,
				name = if found then c.name else "???",
				description = if found then c.description else "발견 방법: " .. c.source,
			})
		end

		-- 연구
		view.tech = {}
		for _, id in D.Tech.Order do
			local t = D.Tech.Tech[id]
			table.insert(view.tech, {
				id = t.id,
				name = t.name,
				cost = t.cost,
				summary = t.summary,
				owned = state.tech[id] == true,
				blocked = S.Research.blockReason(state, t),
			})
		end

		-- 자동스킬
		view.loadout = { slots = D.Careers.loadoutSlots(state.careers.battle.level), equipped = table.clone(state.loadout), skills = {} }
		for _, id in D.Skills.Order do
			local s = D.Skills.Skills[id]
			table.insert(view.loadout.skills, {
				id = id,
				name = s.name,
				phase = s.phase,
				cooldown = s.cooldown,
				summary = s.summary,
				steamOnly = s.steamOnly,
				locked = if s.techReq and not state.tech[s.techReq] then D.Tech.Tech[s.techReq].name else nil,
			})
		end

		view.specialties = { current = state.specialty, changeFee = D.Specialties.CHANGE_FEE, list = {} }
		for _, sp in D.Specialties.Specialties do
			table.insert(view.specialties.list, { id = sp.id, name = sp.name, summary = sp.summary })
		end
		view.companions = { max = D.Specialties.MAX_COMPANIONS, list = {} }
		for _, c in D.Specialties.Companions do
			table.insert(view.companions.list, {
				id = c.id,
				name = c.name,
				summary = c.summary,
				fee = c.fee,
				joined = table.find(state.companions, c.id) ~= nil,
				blocked = S.Perk.recruitBlock(state, c),
			})
		end

		view.bosses = {}
		for _, b in D.Bosses.Bosses do
			local rec = state.bosses[b.id]
			table.insert(view.bosses, {
				id = b.id,
				name = b.name,
				summary = b.summary,
				defeated = if rec then rec.defeated else 0,
				blocked = S.Boss.blockReason(state, b),
				ports = b.portIds,
			})
		end

		view.lastBattle = state.lastBattle
		return view
	end

	return View
end
