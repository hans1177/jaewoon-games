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
				local line = pt.name .. ": " .. (tostring(e.text):gsub("%%s", gd.name))
				local lv = S.Harbor.intel(state)
				if lv >= 3 then
					line ..= string.format(" (약 %+d%%)", math.floor((e.mult - 1) * 100 + 0.5))
				elseif lv >= 1 then
					line ..= if math.abs(e.mult - 1) >= 0.3 then " (크게)" else " (조금)"
				end
				table.insert(view.news, line)
			end
		end
		table.sort(view.news)

		-- 시장
		local rate = S.Trade.sellRateFor(state)
		view.sellRate = rate
		do
			local h = state.haggle
			if h and h.portId == port.id then
				view.haggle = { tried = h.tried, deal = h.deal and { goodId = h.deal.goodId, pct = math.floor((1 - h.deal.mult) * 100 + 0.5) } or nil }
			end
		end
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

		-- 이 항구에서 다루는 물건만 보인다: 특산 > 수요 > 내가 가진 것. (너무 적으면 전부)
		do
			local shown = {}
			for _, g in view.goods do
				if g.tag ~= "" or g.owned > 0 then
					table.insert(shown, g)
				end
			end
			if #shown >= 4 then
				local rank = { ["특산"] = 1, ["수요"] = 2, [""] = 3 }
				table.sort(shown, function(a, b)
					if rank[a.tag] ~= rank[b.tag] then
						return rank[a.tag] < rank[b.tag]
					end
					return a.name < b.name
				end)
				view.goods = shown
			end
		end
		view.intel = S.Harbor.intel(state)
		-- 다른 항구 시세 비교: 물건마다 팔값이 가장 높은 항구 3곳. 장사 감각(intel)이 높을수록 자세히 알려 준다.
		--   0: 알 수 없음 / 1: 항구 이름만 / 2 이상: 이름과 값
		view.compare = {}
		if view.intel >= 1 then
			for _, g in view.goods do
				local list = {}
				for otherId, other in D.Ports.Ports do
					if otherId ~= port.id then
						local m = ctx.market:get(otherId, g.id)
						local e = ctx.market:eventMult(otherId, g.id)
						table.insert(list, { name = other.name, sell = D.TradeMath.sellPrice(otherId, g.id, m, rate, e) })
					end
				end
				table.sort(list, function(x, y)
					if x.sell ~= y.sell then
						return x.sell > y.sell
					end
					return x.name < y.name
				end)
				local top = {}
				for i = 1, math.min(3, #list) do
					table.insert(top, { name = list[i].name, sell = if view.intel >= 2 then list[i].sell else nil })
				end
				view.compare[g.id] = top
			end
		end
		view.supplyMax = S.State.maxSupplies()
		view.board = {}
		for _, b in S.Harbor.boardHere(state) do
			local prog = state.bounty.taken[b.id]
			table.insert(view.board, {
				id = b.id, title = b.title, coins = b.coins, fame = b.fame, kind = b.kind,
				state = if state.bounty.done[b.id] then "done" elseif prog ~= nil then "taken" else "open",
				progress = if b.kind == "hunt" and prog ~= nil then math.min(b.count, state.stats.battlesWon - prog) else nil,
				count = b.count,
			})
		end
		view.fleet = { escorts = state.escorts, price = 1200, needFame = 30 + state.escorts * 30 }
		do
			local nat = D.Ports.Nations[port.country]
			view.rep = { name = if nat then nat.name else port.country, value = state.rep[port.country] or 0, bonus = S.Trade.repBonus(state), tariff = S.Trade.tariffRate(state) }
		end
		view.gear = { slots = D.Gear.SLOTS, list = {} }
		for _, g in D.Gear.Items do
			table.insert(view.gear.list, {
				id = g.id, name = g.name, price = g.price, summary = g.summary, minFame = g.minFame,
				owned = table.find(state.gear.owned, g.id) ~= nil, equipped = table.find(state.gear.equipped, g.id) ~= nil,
			})
		end
		view.maps = {}
		for _, m in state.maps do
			table.insert(view.maps, { toName = D.Ports.Ports[m.to].name })
		end
		do
			local w = D.Voyage.weather(state.day, state.portId)
			view.weather = { id = w.id, name = w.name, hint = w.hint, wind = w.wind }
			view.forecast = {}
			if table.find(state.companions, "t_navigator") then
				for i = 1, 3 do
					local f = D.Voyage.weather(state.day + i, state.portId)
					table.insert(view.forecast, { inDays = i, name = f.name })
				end
			end
		end
		view.morale = state.morale
		view.feastCost = math.max(10, state.ship.crew * 3)
		if state.rumor and state.rumor.portId == state.portId then
			view.rumor = state.rumor
		end
		view.talk = state.talk
		view.auto = state.auto

		-- 항해 미리보기
		view.routes = {}
		for _, portId in sortedKeys(D.Ports.Ports) do
			if portId ~= port.id then
				local plan = S.Sailing.preview(state, portId)
				local region = D.Regions.of(D.Ports.Ports[portId])
				table.insert(view.routes, {
					region = region.name,
					locked = if state.careers.adventure.level < region.minLevel then string.format("모험 Lv.%d 필요", region.minLevel) else nil,
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
		view.shipyard = { available = port.shipyard, ships = {}, supplyCost = math.max(1, math.floor(S.Shipyard.SUPPLY_COST * S.Harbor.costMult(state))), hireCost = math.max(1, math.floor(S.Shipyard.HIRE_COST * S.Harbor.costMult(state))), repairCost = math.max(1, math.floor(S.Shipyard.REPAIR_COST * S.Harbor.costMult(state))) }
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
				class = s.class,
				className = D.Ships.ClassNames[s.class],
				locked = locked or (if s.class >= 2 and state.license < s.class - 1 then "면허 필요: " .. D.Ships.Licenses[s.class - 1].name else nil),
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
			elseif not state.quests.done[q.id] and S.Quest.visible(state, q) then
				table.insert(view.quests.available, { id = q.id, name = q.name, summary = q.summary, rewardCoins = q.rewardCoins })
			end
		end

		-- 도감
		view.codex = { total = #D.Cards.Cards, found = S.State.countDiscovered(state), cards = {}, fields = {} }
		for _, c in D.Cards.Cards do
			local found = state.discovered[c.id] == true
			local art = D.CardArt.Art[c.id]
			table.insert(view.codex.cards, {
				id = c.id,
				field = c.field,
				rarity = c.rarity,
				found = found,
				name = if found then c.name else "???",
				description = if found then c.description else "발견 방법: " .. c.source,
				source = c.source,
				fame = c.reward.fame,
				coins = c.reward.coins,
				image = if found and art then art.image else nil,
				credit = if found and art then art.credit else nil,
			})
		end
		do
			local fieldSums, overall = S.Codex.summary(state)
			local byId = {}
			for _, f in fieldSums do
				byId[f.id] = f
			end
			for _, def in D.Fields.Fields do
				local f = byId[def.id]
				table.insert(view.codex.fields, {
					id = def.id, name = def.name, color = def.color, summary = def.summary, detail = def.detail, tip = def.tip,
					total = f.total, found = f.found, tiers = f.tiers,
				})
			end
			view.codex.overall = overall
			view.codex.rank = S.Codex.rankTitle(state)
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
				locked = S.Battle.skillBlock(state, s),
			})
		end

		view.specialties = { current = state.specialty, changeFee = D.Specialties.CHANGE_FEE, list = {} }
		for _, sp in D.Specialties.Specialties do
			local rec = state.specLevels[sp.id]
			table.insert(view.specialties.list, {
				id = sp.id,
				name = sp.name,
				summary = sp.summary,
				level = if rec then rec.level else 1,
				xp = if rec then rec.xp else 0,
				nextXp = if rec and rec.level >= D.Specialties.MAX_LEVEL then 0 else D.Specialties.xpForNext(if rec then rec.level else 1),
			})
		end
		view.companions = { max = D.Specialties.MAX_COMPANIONS, list = {} }
		for _, c in D.Specialties.Companions do
			table.insert(view.companions.list, {
				id = c.id,
				name = c.name,
				summary = c.summary,
				role = c.role,
				fee = c.fee,
				joined = table.find(state.companions, c.id) ~= nil,
				affinity = state.affinity[c.id] or 0,
				tier = D.Specialties.affinityTier(state.affinity[c.id] or 0),
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

		do
			local inv = S.Harbor.invested(state)
			local lv = S.Harbor.level(state)
			view.harbor = {
				level = lv,
				name = D.Harbor.NAMES[lv],
				invested = inv,
				nextAt = D.Harbor.THRESHOLDS[lv + 1],
				sellBonus = D.Harbor.SELL_BONUS[lv],
				discount = D.Harbor.COST_DISCOUNT[lv],
				options = D.Harbor.OPTIONS,
				rumorCost = D.Harbor.RUMOR_COST,
				produces = {},
				demands = {},
			}
			for _, id in port.produces do
				table.insert(view.harbor.produces, D.Ports.Goods[id].name)
			end
			for _, id in port.demands do
				table.insert(view.harbor.demands, D.Ports.Goods[id].name)
			end
		end

		do
			S.Facility.accrue(state)
			S.Facility.contractExpired(state)
			view.facilities = {}
			for _, kind in { "bank", "guild", "palace", "harbormaster" } do
				if D.Facilities.has(kind, port.id) then
					table.insert(view.facilities, kind)
				end
			end
			view.bank = {
				deposit = state.bank.deposit,
				loan = state.bank.loan,
				limit = S.Facility.loanLimit(state),
				depositRate = D.Facilities.BANK.DEPOSIT_RATE,
				loanRate = D.Facilities.BANK.LOAN_RATE,
			}
			view.guild = { offers = S.Facility.offers(state), contract = nil }
			if state.contract then
				local c = state.contract
				view.guild.contract = {
					goodName = D.Ports.Goods[c.goodId].name,
					amount = c.amount,
					toPortName = D.Ports.Ports[c.toPortId].name,
					toPortId = c.toPortId,
					reward = c.reward,
					daysLeft = c.deadline - state.day,
					have = state.cargo[c.goodId] or 0,
				}
			end
			local nextTitle = D.Facilities.TITLES[state.title + 1]
			view.palace = {
				name = D.Facilities.PALACE_NAMES[port.id],
				title = if state.title > 0 then D.Facilities.TITLES[state.title].name else nil,
				nextTitle = if nextTitle then nextTitle.name else nil,
				nextFame = if nextTitle then nextTitle.fame else nil,
				nextCoins = if nextTitle then nextTitle.coins else nil,
			}
			view.story = {}
			for _, e in D.Story.Events do
				if e.portId == port.id then
					local reason = S.Story.blockReason(state, e)
					if not reason then
						table.insert(view.story, {
							id = e.id, title = e.title, chapter = e.chapter, art = e.art, npc = e.npc, lines = e.lines,
							choices = (function()
								local out = {}
								for i, c in e.choices do
									table.insert(out, { index = i, text = c.text, minFame = c.minFame, cost = c.cost })
								end
								return out
							end)(),
						})
					end
				end
			end
		end

		do
			local base = D.Ships.Ships[state.ship.id]
			view.refit = { class = base.class, className = D.Ships.ClassNames[base.class], cannons = {}, cannonId = state.ship.cannon, plating = state.ship.plating }
			for _, c in D.Ships.Cannons do
				table.insert(view.refit.cannons, {
					id = c.id, name = c.name, price = c.price, mult = c.mult, weight = c.weight, summary = c.summary,
					owned = c.id == state.ship.cannon, locked = S.Shipyard.cannonBlock(state, c),
				})
			end
			local nextPl = D.Ships.Plating[state.ship.plating + 1]
			if nextPl then
				view.refit.nextPlating = { name = nextPl.name, price = nextPl.price, hull = nextPl.hull, weight = nextPl.weight, locked = S.Shipyard.plateBlock(state, state.ship.plating + 1) }
			end
			local lic = D.Ships.Licenses[state.license + 1]
			view.harbormaster = {
				license = if state.license > 0 then D.Ships.Licenses[state.license].name else nil,
				nextLicense = if lic then { name = lic.name, fame = lic.fame, fee = lic.fee } else nil,
				insured = state.insured,
				insurancePrice = S.Facility.insurancePrice(state),
			}
		end

		view.lastBattle = state.lastBattle
		view.voyageEvent = state.voyageEvent
		return view
	end

	return View
end
