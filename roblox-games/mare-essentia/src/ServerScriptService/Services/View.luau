--!nonstrict
-- 클라이언트에 보낼 화면용 스냅샷. 모든 계산은 서버가 하고 클라이언트는 표시만 한다.

return function(D, S)
	local View = {}
	local DELIVER_SHOWN_MAX = 4 -- 주점 게시판에 한 번에 보여 주는 납품 의뢰 수

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

		view.captain = S.Intro.viewOf(state)
		local og = state.origin and D.Specialties.OriginById[state.origin]
		view.captain.origin = og and { id = og.id, name = og.name, perkText = og.perkText } or nil

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
		local lv0 = D.Harbor.effLevel(D.Harbor.level(state.harbor[port.id] or 0), S.Knowledge.techSum(state, port.id))
		local rid0 = D.Regions.of(port).id
		local yr0 = state.startYear + math.floor(state.day / 365)
		for _, goodId in sortedKeys(D.Ports.Goods) do
			local good = D.Ports.Goods[goodId]
			local mult = ctx.market:get(port.id, goodId)
			local ev = (ctx.market:eventMult(port.id, goodId) * S.History.mult(state, port.id, goodId))
			local tag = ""
			local role = D.Harbor.role(port, rid0, yr0, lv0, goodId, S.Knowledge.disciplineOpens(state, port.id, goodId))
			if role == "produce" then
				tag = "특산"
			elseif role == "demand" then
				tag = "수요"
			end
			table.insert(view.goods, {
				id = goodId,
				name = good.name,
				tag = tag,
				buy = D.TradeMath.getPrice(port.id, goodId, mult, ev * S.Knowledge.supplyMult(state, port.id, goodId)),
				cheaper = S.Knowledge.supplyMult(state, port.id, goodId) < 0.999 or nil,
				sell = D.TradeMath.sellPrice(port.id, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev),
				upgraded = S.Knowledge.goodsMult(state, goodId) > 1.001 or nil,
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
						local e = (ctx.market:eventMult(otherId, g.id) * S.History.mult(state, otherId, g.id))
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
		view.fleet.ships = {}
		for i, f in state.fleet do
			local fd = D.Ships.Ships[f.id]
			table.insert(view.fleet.ships, {
				index = i, id = f.id, name = fd.name, hull = f.hull, maxHull = fd.hull, cargo = fd.cargo, cannons = fd.cannons,
				speed = fd.speed, sell = math.floor(fd.price * 0.5),
			})
		end
		view.fleet.max = S.State.MAX_FLEET
		view.fleet.fameNeed = 20 + #state.fleet * 30
		view.fleet.upkeep = 25
		view.fleet.cargo = S.State.fleetCargo(state)
		view.fleet.speed = S.State.fleetSpeed(state, S.State.shipDef(state).speed)
		do
			local nat = D.Ports.Nations[port.country]
			view.rep = { name = if nat then nat.name else port.country, value = state.rep[port.country] or 0, bonus = S.Trade.repBonus(state), tariff = S.Trade.tariffRate(state) }
		end
		view.partyTraining = S.Tactics.trainingView(state)
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
		view.actIntro = state.actIntro
		if state.voyageChoice then
			local vc = state.voyageChoice
			if vc.kind == "merchant" then
				view.voyageChoice = {
					title = "상선 조우", art = "harbor", npc = "상선 선장",
					lines = { "수평선에서 상선 한 척이 다가온다. 돛에는 낯선 깃발이 달려 있다.", "\"이쪽은 짐이 많소. 서로 이문을 나눌 수 있지 않겠소?\"" },
					choices = { { index = 1, text = "공정하게 거래한다" }, { index = 2, text = "대포를 겨누고 짐을 요구한다 (위험)" }, { index = 3, text = "정중히 인사하고 보낸다" } },
				}
			else
				view.voyageChoice = {
					title = "해상 봉쇄", art = "storm", npc = "해군 장교",
					lines = { "해군 함선들이 항로를 막고 있다. 깃발이 신호를 보낸다.", "\"통행료를 내시오. 아니면 되돌아가시오.\"" },
					choices = { { index = 1, text = "통행료를 낸다" }, { index = 2, text = "돌파를 시도한다 (위험)" }, { index = 3, text = "먼 길로 돌아간다 (하루 지연)" } },
				}
			end
		end
		do
			local tier = D.Regions.tierOf(port.id, port.lat, port.lon)
			view.act = D.Narrative.Regions[tier]
			if next(state.stats.visited) ~= nil then
				local n = 0
				for _ in state.stats.visited do
					n += 1
				end
				if n <= 1 and state.day <= 3 then
					view.prologue = D.Narrative.Prologues[state.nationId] or D.Narrative.Prologue
				end
			end
			local activeQuest
			for _, q in D.Quests.Quests do
				if state.quests.active[q.id] then
					activeQuest = q
					break
				end
			end
			local locked
			for ri, r in D.Regions.List do
				if not D.Regions.isOpen(state.careers.adventure.level, D.Regions.homeTier(D.Ports.Ports, D.Ports.Nations[state.nationId]), ri) then
					locked = r
					break
				end
			end
			local cargoAny = false
			for _, qty in state.cargo or {} do
				if type(qty) == "number" and qty > 0 then
					cargoAny = true
				end
			end
			-- 첫 항해 목표 체크리스트 (처음 몇 단계를 막힘 없이 따라가도록)
			do
				local visited = 0
				for _ in state.stats.visited do
					visited += 1
				end
				local hasQuest = next(state.quests.active) ~= nil or next(state.quests.done) ~= nil
				local steps = {
					{ "교역소에서 특산품을 사 보기", cargoAny or visited >= 2 or state.day > 1 },
					{ "다른 항구로 출항하기", visited >= 2 },
					{ "주점에서 동료 영입하기", #state.companions > 0 },
					{ "소문을 듣거나 사람과 이야기해 일지에 의뢰 올리기", hasQuest },
					{ "항구 3곳 방문하기", visited >= 3 },
				}
				local left = 0
				for _, st in steps do
					if not st[2] then
						left += 1
					end
				end
				if left > 0 then
					local list, marked = {}, false
					for _, st in steps do
						local mark = if st[2] then "✅" elseif not marked then "▶" else "⬜"
						if not st[2] then
							marked = true
						end
						table.insert(list, { text = st[1], done = st[2], mark = mark })
					end
					view.guide = { title = "첫 항해 목표", steps = list }
				end
			end
			local who = if #state.companions > 0 then D.Specialties.CompanionById[state.companions[1]].name else "늙은 항해사 베르나르"
			view.advice = { who = who, text = D.Narrative.advice({ coins = state.coins, ship = state.ship, morale = state.morale, cargoAny = cargoAny }, D.Regions, #state.companions > 0, activeQuest, locked) }
			-- 화면 중앙 상단 동료 말풍선: 인사 한마디와 '앞으로 할 일'
			do
				local companionId = state.companions[1]
				if companionId then
					local pool = D.CompanionTalk.Talk[companionId] and D.CompanionTalk.Talk[companionId][D.Specialties.affinityTier(state.affinity[companionId] or 0)]
					if pool and #pool > 0 then
						view.advice.line = pool[1 + state.day % #pool]
					end
					view.advice.companionId = companionId
				else
					view.advice.line = "선장님, 오늘도 좋은 바람입니다."
				end
				if view.guide then
					for _, st in view.guide.steps do
						if not st.done then
							view.advice.next = st.text
							break
						end
					end
				end
			end
		end

		-- 항해 미리보기
		view.routes = {}
		for _, portId in sortedKeys(D.Ports.Ports) do
			if portId ~= port.id then
				local plan = S.Sailing.preview(state, portId)
				local region = D.Regions.of(D.Ports.Ports[portId])
				table.insert(view.routes, {
					region = region.name,
					locked = if not D.Regions.isOpen(state.careers.adventure.level, D.Regions.homeTier(D.Ports.Ports, D.Ports.Nations[state.nationId]), D.Regions.tierOf(portId, D.Ports.Ports[portId].lat, D.Ports.Ports[portId].lon)) then string.format("모험 Lv.%d 필요", region.minLevel) else nil,
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
					-- 지상 전술 탐험이 가능한 곳이면 맵 이름과 지금까지의 최고 등급
					tactics = (function()
						local map = D.TacticsMaps.forSite(site)
						if not map then
							return nil
						end
						local rec = state.tactics and state.tactics.cleared[site.id]
						return { mapName = map.name, rank = rec and rec.rank or "" }
					end)(),
				})
			end
		end

		-- 진행 중인 지상 전술 전투(없으면 nil)
		view.tactics = state.tbattle

		-- 지식 트리(보고·이해·효과)
		view.knowledge = S.Knowledge.viewOf(state)
		view.history = S.History.viewOf(state)
		view.exchange = S.Stock.viewOf(state)
		view.portBuildings = S.Build.viewOf(state)
		view.pace = S.Pace.viewOf(state)
		view.world = S.World.viewOf(state)
		view.diplo = S.Diplomacy.viewOf(state)
		view.autoStory = state.autoStory
	view.order = S.Order.viewOf(state)
	view.room = S.Room.viewOf(state)
		view.people = S.People.viewOf(state)

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
				table.insert(view.scholars, { id = sc.id, name = sc.name, status = status, reportable = if status == "ready" or status == "met" then S.Knowledge.reportableCount(state, sc) else 0 })
			end
		end

		-- 퀘스트
		view.quests = { active = {}, available = {}, doneCount = 0, otherPortDeliver = 0, done = {} }
		local shownDeliver = 0
		for id in state.quests.done do
			view.quests.doneCount += 1
			local dq = D.Quests.ById[id]
			if dq then
				local _, ending = S.Quest.storyOf(dq)
				table.insert(view.quests.done, { name = dq.name, summary = dq.summary, strand = dq.strand, ending = ending })
			end
		end
		table.sort(view.quests.done, function(a, b) return a.name < b.name end)
		for _, q in D.Quests.Quests do
			if state.quests.active[q.id] then
				table.insert(view.quests.active, {
					id = q.id,
					name = q.name,
					summary = q.summary,
					story = (S.Quest.storyOf(q)),
					strand = q.strand or (if q.companionId then "companion" else nil),
					kind = q.kind,
					progress = S.Quest.progress(state, q),
					amount = q.amount,
					rewardCoins = q.rewardCoins,
				})
			elseif not state.quests.done[q.id] and S.Quest.visible(state, q) and q.kind == "deliver" and (q.portId ~= state.portId or shownDeliver >= DELIVER_SHOWN_MAX) then
				-- 납품 의뢰는 지금 항구의 주점 게시판만, 최대 몇 개까지만 보여 준다 (나머지는 개수만 알린다)
				view.quests.otherPortDeliver += 1
			elseif not state.quests.done[q.id] and S.Quest.visible(state, q) then
				if q.kind == "deliver" then
					shownDeliver += 1
				end
				table.insert(view.quests.available, { id = q.id, name = q.name, summary = q.summary, story = (S.Quest.storyOf(q)), strand = q.strand or (if q.companionId then "companion" else nil), rewardCoins = q.rewardCoins, auto = S.Quest.isAuto(q), progress = S.Quest.progressAny(state, q), amount = q.amount })
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
		view.companions = { max = D.Specialties.slotsFor(def.class), list = {}, stations = {} }
		do
			local vs, vc = S.Perk.vacancy(state)
			view.companions.vacancy = { speed = vs, cannon = vc }
		end
		for _, st in D.Specialties.Stations do
			local who = state.stations[st.id]
			local c = who and D.Specialties.CompanionById[who]
			table.insert(view.companions.stations, {
				id = st.id, name = st.name, summary = st.summary, seatId = who, seatName = c and c.name,
				matched = c ~= nil and D.Specialties.CompanionStation[who] == st.id,
			})
		end
		for _, c in D.Specialties.Companions do
			if not c.nation or c.nation == state.nationId then
			table.insert(view.companions.list, {
				id = c.id,
				name = c.name,
				summary = c.summary,
				role = c.role,
				bestSeat = D.Specialties.StationById[D.Specialties.CompanionStation[c.id] or "boatswain"].name,
				fee = c.fee,
				joined = table.find(state.companions, c.id) ~= nil,
				affinity = state.affinity[c.id] or 0,
				tier = D.Specialties.affinityTier(state.affinity[c.id] or 0),
				blocked = S.Perk.recruitBlock(state, c),
			})
			end
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
			local rg = D.Harbor.regime(state.startYear + math.floor(state.day / 365))
			view.harbor = {
				regime = { id = rg.id, name = rg.name, kind = rg.kind, note = rg.note, price = rg.price },
				portType = D.Harbor.portType(port.produces),
				economy = S.Harbor.economyOf(state, port.id),
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
			local full = D.Harbor.producesOf(port.produces, rid0, yr0)
			local lvE = lv0
			for i, id in full do
				if lvE >= D.Harbor.unlockLevel(i) or S.Knowledge.disciplineOpens(state, port.id, id) then
					table.insert(view.harbor.produces, D.Ports.Goods[id].name)
				else
					view.harbor.nextProduce = view.harbor.nextProduce or { name = D.Ports.Goods[id].name, level = D.Harbor.unlockLevel(i) }
				end
			end
			local dem = D.Harbor.demandsOf(port.demands, rid0, yr0, port.produces)
			for i, id in dem do
				if lvE >= D.Harbor.unlockLevel(i) then
					table.insert(view.harbor.demands, D.Ports.Goods[id].name)
				else
					view.harbor.nextDemand = view.harbor.nextDemand or { name = D.Ports.Goods[id].name, level = D.Harbor.unlockLevel(i) }
				end
			end
		end

		do
			S.Facility.accrue(state)
			S.Facility.contractExpired(state)
			view.facilities = {}
			for _, kind in { "bank", "guild", "palace", "harbormaster" } do
				if D.Facilities.has(kind, port.id, S.Harbor.level(state)) then
					table.insert(view.facilities, kind)
				end
			end
			view.bank = {
				deposit = state.bank.deposit,
				loan = state.bank.loan,
				limit = S.Facility.loanLimit(state),
				depositRate = D.Facilities.bankAt(S.Harbor.level(state)).depositRate,
				loanRate = D.Facilities.bankAt(S.Harbor.level(state)).loanRate,
				name = D.Facilities.bankAt(S.Harbor.level(state)).name,
				level = S.Harbor.level(state),
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
				name = D.Facilities.palaceName(port.id),
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

		-- 백병전 카드 패: 게임 곳곳의 성과가 카드가 된다. 효과는 해전 장면의 기동 점수에만 쓰인다 (전투 결과는 서버 판정).
		--  주인공·동료(스킬 카드) / 발견한 지식·유물·동물(분야별 카드) / 만난 항해자(우군 카드) / 지금 타는 배(선박 카드) / 라이벌의 인정
		do
			local STATION_SKILL = { gunner = "volley", surgeon = "heal", helm = "wind", boatswain = "banner", mate = "retreat", scholar = "analyze" }
			local FIELD_SKILL = {
				Zoology = "beast", Botany = "heal", Medicine = "heal", Astronomy = "snipe", Navigation = "focus", Geography = "scout",
				Weather = "ward", Physics = "armor", Chemistry = "volley", Mineral = "rally", Relic = "luck", Site = "luck", Art = "rally",
				Architecture = "ward", Language = "analyze", Philosophy = "analyze", Myth = "luck", Shipbuilding = "ward", Goods = "rally",
			}
			local FIELD_KIND = { Zoology = "animal", Relic = "relic", Site = "relic", Art = "relic", Architecture = "relic", Mineral = "relic", Myth = "relic" }
			local ROLE_SKILL = { soldier = "volley", privateer = "rally", merchant = "ward", explorer = "scout", pirate = "luck", pilgrim = "heal" }
			local SHIP_SKILL = { caravel = "focus", fluyt = "ward", frigate = "volley", galleon = "ward", paddle_steamer = "insight", ironclad_frigate = "ward" }
			local cards = {}
			local cap = view.captain
			table.insert(cards, { kind = "crew", name = (cap and cap.name) or "선장", skill = "command" })
			for _, cid in state.companions do
				local c = D.Specialties.CompanionById[cid]
				if c and #cards < 4 then
					local aff = (state.affinity and state.affinity[cid]) or 0
					table.insert(cards, { kind = "crew", name = c.name, skill = STATION_SKILL[D.Specialties.CompanionStation[cid] or ""] or "analyze", tier = math.clamp(1 + math.floor(aff / 40), 1, 3) })
				end
			end
			-- 분야마다 가장 귀한 발견 하나씩, 귀한 순서로 5장
			local rank = { Legendary = 5, Epic = 4, Rare = 3, Uncommon = 2, Common = 1 }
			local bestOf = {}
			for _, c in D.Cards.Cards do
				if state.discovered[c.id] and FIELD_SKILL[c.field] then
					local cur = bestOf[c.field]
					if not cur or rank[c.rarity] > rank[cur.rarity] or (rank[c.rarity] == rank[cur.rarity] and c.id < cur.id) then
						bestOf[c.field] = c
					end
				end
			end
			local picks = {}
			for _, c in bestOf do
				table.insert(picks, c)
			end
			table.sort(picks, function(a, b)
				if rank[a.rarity] ~= rank[b.rarity] then
					return rank[a.rarity] > rank[b.rarity]
				end
				return a.id < b.id
			end)
			for i = 1, math.min(5, #picks) do
				local c = picks[i]
				table.insert(cards, { kind = FIELD_KIND[c.field] or "book", name = c.name, skill = FIELD_SKILL[c.field] })
			end
			-- 만난 항해자는 우군이 된다
			local metIds = {}
			for id in (state.diplo and state.diplo.met) or {} do
				table.insert(metIds, id)
			end
			table.sort(metIds)
			local friends = 0
			for _, id in metIds do
				local v = D.Specialties.VoyagerById[id]
				if v and friends < 2 and not v.rival then
					friends += 1
					table.insert(cards, { kind = "friend", name = v.name, skill = ROLE_SKILL[v.role] or "scout" })
				end
			end
			if state.diplo and (state.diplo.rivalN or 0) >= 5 then
				table.insert(cards, { kind = "friend", name = "칼레브", skill = "luck" })
			end
			table.insert(cards, { kind = "ship", name = D.Ships.Ships[state.ship.id] and D.Ships.Ships[state.ship.id].name or "배", skill = SHIP_SKILL[state.ship.id] or "focus" })
			local faction = D.BoardingCards.factionOf(state.nationId)
			local spec = S.Cardbook.deckSpec(state)
			view.deck = { cards = cards, faction = faction, book = { ids = spec.ids, tier = spec.tier } }
			view.cardbook = { owned = S.Cardbook.get(state).owned, tier = spec.tier, deck = S.Cardbook.get(state).deck, ids = spec.ids, slots = S.Cardbook.get(state).slots }
			if S.Battle and S.Battle.deckCache then
				S.Battle.deckCache[state] = cards
				S.Battle.deckFaction[state] = faction
			end
		end

		view.lastBattle = state.lastBattle
		view.voyageEvent = state.voyageEvent
		return view
	end

	return View
end
