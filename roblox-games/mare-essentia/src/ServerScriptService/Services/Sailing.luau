--!nonstrict
-- 항해: 목적지까지의 거리·소요일·보급품·석탄을 계산하고 항해 사건을 처리한다.

return function(D, S)
	local handlers = {}

	-- 출항 전 미리보기(바람 1.0 기준). 클라이언트 표시용.
	local function preview(state, toPortId)
		local from = D.Ports.Ports[state.portId]
		local to = D.Ports.Ports[toPortId]
		local def = S.State.shipDef(state)
		local nation = D.Ports.Nations[state.nationId]
		local dist = D.SeaRoutes.lengthKm(from.id, to.id, D.Ports.Ports)
		local coal = if def.steam then (state.cargo.coal or 0) else 0
		return D.Voyage.plan(S.State.fleetSpeed(state, def.speed) * nation.speedMult * S.Perk.speedMult(state), def.steam, def.fuelPerDay, coal, S.State.totalCrew(state), dist, D.Voyage.weather(state.day, state.portId).wind)
	end

	-- 보물지도: 목적지 항구 근처 해역에 묻힌 보물. 도착하면 찾는다.
	local function giveMap(state, ctx, msgs)
		if #state.maps >= 3 then
			return
		end
		local ids = {}
		for id, port in D.Ports.Ports do
			if id ~= state.portId and D.Regions.isOpen(state.careers.adventure.level, D.Regions.homeTier(D.Ports.Ports, D.Ports.Nations[state.nationId]), D.Regions.tierOf(id, port.lat, port.lon)) then
				table.insert(ids, id)
			end
		end
		table.sort(ids)
		local to = ids[math.min(#ids, math.floor(ctx.rng() * #ids) + 1)]
		local reward = math.floor(250 + ctx.rng() * 650)
		table.insert(state.maps, { to = to, reward = reward })
		table.insert(msgs, string.format("낡은 보물지도를 손에 넣었다! 표시된 곳: %s 근처", D.Ports.Ports[to].name))
	end

	function handlers.BuyMap(state, _p, ctx)
		local price = 200
		if #state.maps >= 3 then
			return false, "보물지도는 3장까지 가질 수 있어요"
		end
		if state.coins < price then
			return false, string.format("%d코인이 필요해요", price)
		end
		state.coins -= price
		local msgs = {}
		giveMap(state, ctx, msgs)
		return true, table.concat(msgs, "\n") .. string.format(" (-%d코인)", price)
	end

	function handlers.Sail(state, p, ctx)
		local toId = p.portId
		local to = type(toId) == "string" and D.Ports.Ports[toId]
		if not to then
			return false, "갈 수 없는 항구예요"
		end
		if toId == state.portId then
			return false, "이미 이 항구에 있어요"
		end
		state.voyageChoice = nil
		state.voyageBonusDays = nil
		local region = D.Regions.of(to)
		local lvAdv = state.careers.adventure.level
		local homeTier = D.Regions.homeTier(D.Ports.Ports, D.Ports.Nations[state.nationId])
		if not D.Regions.isOpen(lvAdv, homeTier, D.Regions.tierOf(to.id, to.lat, to.lon)) then
			return false, string.format("%s 해역은 모험 Lv.%d부터 갈 수 있어요 (지금 Lv.%d)", region.name, region.minLevel, lvAdv)
		end
		do
			local gate = D.KnowledgeTree.RegionGates[region.id]
			local here = D.Regions.of(D.Ports.Ports[state.portId])
			if gate and here.minLevel < region.minLevel then
				local lacking = {}
				for _, id in gate do
					if not D.KnowledgeTree.understood(state, id) then
						local c = D.Cards.ById[id]
						table.insert(lacking, c and c.name or id)
					end
				end
				if #lacking > 0 then
					return false, string.format("%s 해역으로 가려면 항해 지식이 필요해요: %s (학자에게 보고해 이해하세요)", region.name, table.concat(lacking, ", "))
				end
			end
		end
		local def = S.State.shipDef(state)
		if state.ship.hull < def.hull * 0.2 then
			return false, "선체가 너무 손상됐어요. 수리가 필요해요"
		end

		local from = D.Ports.Ports[state.portId]
		local nation = D.Ports.Nations[state.nationId]
		local weather = D.Voyage.weather(state.day, state.portId)
		local wind = weather.wind
		local dist = D.SeaRoutes.lengthKm(from.id, to.id, D.Ports.Ports)
		local coalAvailable = if def.steam then (state.cargo.coal or 0) else 0
		local plan = D.Voyage.plan(S.State.fleetSpeed(state, def.speed) * nation.speedMult * S.Perk.speedMult(state), def.steam, def.fuelPerDay, coalAvailable, S.State.totalCrew(state), dist, wind)
		local event = D.Voyage.rollEvent(ctx.rng, plan.days, weather.id)

		local msgs = {}
		local days = plan.days
		if event.kind == "tailwind" and days > 1 then
			days -= 1
		elseif event.kind == "fog" then
			days += 1
		end

		-- 석탄 소모
		if plan.coal > 0 then
			S.State.removeCargo(state, "coal", math.min(plan.coal, state.cargo.coal or 0))
			table.insert(msgs, string.format("석탄 %d개를 태웠다", plan.coal))
		elseif def.steam and (state.cargo.coal or 0) == 0 then
			table.insert(msgs, "석탄이 없어 돛으로만 항해했다")
		end

		-- 보급품 소모
		local need = D.Voyage.suppliesPerDay(S.State.totalCrew(state)) * days
		if state.ship.supplies >= need then
			state.ship.supplies -= need
		else
			local missing = need - state.ship.supplies
			state.ship.supplies = 0
			local loss = math.min(state.ship.crew - 1, math.ceil(missing / 3))
			state.ship.crew -= loss
			table.insert(msgs, string.format("보급품이 부족했다! 선원 %d명을 잃었다", loss))
		end

		-- 사기: 항해가 길수록 떨어진다. 의사 동료가 있으면 하락이 줄어든다.
		local heal = S.Perk.healReduction(state)
		local moraleDrop = math.floor(days * 1.5 * (1 - heal) + 0.5)
		local function moraleAdd(n)
			if n < 0 then
				n = math.floor(n * (1 - heal) - 0.5)
			end
			state.morale = math.clamp(state.morale + n, 0, 100)
		end
		moraleAdd(-moraleDrop)
		-- 괴혈병: 15일 이상 항해하는데 신선한 식량(생선·대추야자·건포도)이 없으면 선원이 앓는다
		local fresh = (state.cargo.fish or 0) + (state.cargo.dates or 0) + (state.cargo.raisins or 0)
		if days >= 15 and fresh == 0 and event.kind ~= "school" then
			local loss = math.min(state.ship.crew - 1, math.floor((1 + state.ship.crew * 0.08) * (1 - heal)))
			if loss > 0 then
				state.ship.crew -= loss
				moraleAdd(-8)
				table.insert(msgs, string.format("괴혈병이 번졌다! 선원 %d명을 잃었다 (신선한 생선·과일을 실으면 막을 수 있어요)", loss))
			end
		end

		S.State.advanceDays(state, days)
		table.insert(msgs, string.format("%s을(를) 출발해 %d일 만에 %s에 도착했다 (%d km)", from.name, days, to.name, math.floor(dist)))

		-- 사건
		if event.kind == "calm" then
			table.insert(msgs, "바다는 잔잔했다")
		elseif event.kind == "tailwind" then
			table.insert(msgs, "순풍을 타고 하루를 아꼈다")
		elseif event.kind == "storm" then
			local dmg = math.floor(def.hull * event.amount * (1 - S.State.techSum(state, "pumpReduction")))
			state.ship.hull = math.max(1, state.ship.hull - dmg)
			table.insert(msgs, string.format("폭풍! 선체 -%d", dmg))
			moraleAdd(-6)
		elseif event.kind == "drift" then
			state.coins += event.amount
			table.insert(msgs, string.format("표류물을 건져 %d코인을 얻었다", event.amount))
		elseif event.kind == "fever" then
			local loss = math.min(event.amount, state.ship.crew - 1)
			if loss > 0 then
				state.ship.crew -= loss
				table.insert(msgs, string.format("열병으로 선원 %d명을 잃었다", loss))
			end
		elseif event.kind == "school" then
			local room = S.State.maxSupplies() - state.ship.supplies
			local n = math.min(event.amount, room)
			state.ship.supplies += n
			table.insert(msgs, string.format("물고기떼를 만나 그물을 던졌다! 보급품 +%d", n))
			moraleAdd(6)
		elseif event.kind == "merchant" then
			-- 상선 조우: 도착 후 어떻게 대할지 고른다 (VoyageChoice)
			state.voyageChoice = { kind = "merchant", amount = event.amount }
			table.insert(msgs, "항해 중 상선을 만났다")
		elseif event.kind == "fog" then
			table.insert(msgs, "짙은 안개에 갇혀 하루를 더 보냈다")
			moraleAdd(-3)
		elseif event.kind == "reef" then
			local dmg = math.max(1, math.floor(def.hull * event.amount))
			state.ship.hull = math.max(1, state.ship.hull - dmg)
			table.insert(msgs, string.format("암초를 스쳤다! 선체 -%d", dmg))
		elseif event.kind == "rescue" then
			local n = math.min(event.amount, def.crew - state.ship.crew)
			if n > 0 then
				state.ship.crew += n
				table.insert(msgs, string.format("표류하던 선원 %d명을 구했다. 그들이 합류했다", n))
			else
				state.coins += 30
				table.insert(msgs, "표류하던 사람들을 구했다. 사례금 30코인을 받았다")
			end
		elseif event.kind == "island" then
			state.coins += event.amount
			state.fame += 1
			table.insert(msgs, string.format("지도에 없는 섬을 발견했다! 명성 +1, 코인 +%d", event.amount))
			moraleAdd(8)
			if ctx.rng() < 0.35 then
				giveMap(state, ctx, msgs)
			end
		elseif event.kind == "blockade" then
			state.voyageChoice = { kind = "blockade", amount = event.amount }
			table.insert(msgs, "해군이 항로를 봉쇄했다")
		elseif event.kind == "ghost" then
			state.fame += event.amount
			table.insert(msgs, string.format("안개 속에서 유령선을 보았다... 뱃사람들의 이야깃거리가 되었다 (명성 +%d)", event.amount))
			moraleAdd(-8)
		elseif event.kind == "dolphins" then
			table.insert(msgs, "돌고래 떼가 뱃머리를 따라왔다! 선원들의 사기가 올랐다")
			moraleAdd(event.amount)
			S.Discovery.grantCard(state, "zoo_dolphin", msgs)
		elseif event.kind == "whale" then
			state.fame += 1
			table.insert(msgs, "멀리서 거대한 고래가 물을 뿜었다! 선원들이 환호했다 (명성 +1)")
			moraleAdd(event.amount)
			S.Discovery.grantCard(state, "zoo_whale", msgs)
		elseif event.kind == "pirates" then
			S.Battle.encounter(state, ctx, msgs)
		end

		-- 연출용 기록(저장 안 함): 3D 항해 장면이 사건을 그린다
		state.voyageEvent = { kind = event.kind, won = event.kind == "pirates" and state.lastBattle ~= nil and state.lastBattle.winner == "a" or nil }

		-- 장거리 항해 기록에서 해류를 발견할 수 있다
		if days >= 10 and ctx.rng() < 0.35 then
			S.Discovery.grantCard(state, "geo_gulfstream", msgs)
		end

		do
			-- 새 해역에 처음 들어서면 이야기 한 막이 열린다
			local tier = D.Regions.tierOf(toId, D.Ports.Ports[toId].lat, D.Ports.Ports[toId].lon)
			local seen = false
			for vid in state.stats.visited do
				local vp = D.Ports.Ports[vid]
				if vp and D.Regions.tierOf(vid, vp.lat, vp.lon) == tier then
					seen = true
					break
				end
			end
			local act = D.Narrative.Regions[tier]
			if not seen and act then
				state.fame += 3
				state.actIntro = { title = act.title, text = act.intro, goal = act.goal }
				table.insert(msgs, string.format("【%s】 %s (명성 +3)", act.title, act.intro))
			end
		end
		do
			-- 첫 항해: 주인공의 오랜 동료가 배에 합류한다
			local allyId = "n_" .. state.nationId
			local ally = D.Specialties.CompanionById[allyId]
			if ally and not state.allyJoined and #state.companions < D.Specialties.slotsFor(S.State.shipDef(state).class) and not table.find(state.companions, allyId) then
				state.allyJoined = true
				table.insert(state.companions, allyId)
				S.Perk.seatFor(state, allyId)
				state.affinity[allyId] = math.max(state.affinity[allyId] or 0, 10)
				table.insert(msgs, string.format("【동료 합류】 %s이(가) 항해 도중 함께하겠다고 나섰다!", ally.name))
			end
		end
		state.voyageBonusDays = days
		state.portId = toId
		state.stats.visited[toId] = true
		S.State.gainXp(state, "adventure", days * 2 + math.floor(dist / 200), msgs)
		S.Perk.gainSpec(state, "voyage", days * 3, msgs)
		S.Perk.addAffinity(state, 1, msgs)
		-- 입항: 선원들이 뭍에서 쉰다. 사기가 너무 낮으면 탈영한다.
		if state.morale < 25 and state.ship.crew > 2 then
			local desert = math.min(state.ship.crew - 1, math.max(1, math.floor(state.ship.crew * 0.1)))
			state.ship.crew -= desert
			table.insert(msgs, string.format("사기가 바닥이라 선원 %d명이 배를 떠났다. 주점에서 한턱 내면 사기가 올라요", desert))
		end
		state.morale = math.min(100, state.morale + 8)
		for i = #state.maps, 1, -1 do
			local m = state.maps[i]
			if m.to == toId then
				table.remove(state.maps, i)
				state.coins += m.reward
				state.fame += 2
				table.insert(msgs, string.format("보물지도의 표시를 따라 해안을 파 보니... 보물 상자가 나왔다! +%d코인, 명성 +2", m.reward))
				S.Cardbook.chest(state, msgs)
			end
		end
		S.Shipyard.payUpkeep(state, days, msgs)
		S.Shipyard.autoTopUp(state, msgs)
		S.Quest.autoDeliver(state, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 항구에서 하루 기다린다 (날씨가 바뀌길 기다릴 때)
	-- 항해 중 만난 상선·봉쇄 앞에서 고른 대응을 처리한다
	function handlers.VoyageChoice(state, p, ctx)
		local vc = state.voyageChoice
		local idx = type(p.index) == "number" and math.floor(p.index)
		if not vc or not idx or idx < 1 or idx > 3 then
			return false, "고를 수 있는 상황이 아니에요"
		end
		state.voyageChoice = nil
		local def = S.State.shipDef(state)
		local function morale(n)
			state.morale = math.max(0, math.min(100, state.morale + n))
		end
		if vc.kind == "merchant" then
			if idx == 1 then
				state.coins += vc.amount
				return true, string.format("공정하게 물물교환을 했다. +%d코인", vc.amount)
			elseif idx == 2 then
				if ctx.rng() < 0.55 then
					state.coins += vc.amount * 2
					morale(-4)
					return true, string.format("상선이 겁먹고 짐을 내놓았다. +%d코인 (선원들 마음이 불편하다)", vc.amount * 2)
				end
				local dmg = math.max(1, math.floor(def.hull * 0.12))
				state.ship.hull = math.max(1, state.ship.hull - dmg)
				state.fame = math.max(0, state.fame - 1)
				return true, string.format("상선이 맞서 반격했다! 선체 -%d, 명성 -1", dmg)
			end
			state.fame += 1
			morale(5)
			return true, "상선을 정중히 보냈다. 소문이 좋게 퍼졌다 (명성 +1, 사기 +5)"
		end
		-- 봉쇄
		local toll = math.min(200, math.floor(state.coins * vc.amount))
		if idx == 1 then
			state.coins -= toll
			return true, string.format("통행료 %d코인을 내고 지나갔다", toll)
		elseif idx == 2 then
			if ctx.rng() < 0.5 then
				state.fame += 2
				return true, "봉쇄선을 돌파했다! 무사히 빠져나왔다 (명성 +2)"
			end
			local dmg = math.max(1, math.floor(def.hull * 0.2))
			state.ship.hull = math.max(1, state.ship.hull - dmg)
			state.coins -= toll
			return true, string.format("돌파에 실패했다. 선체 -%d, 통행료 %d코인", dmg, toll)
		end
		S.State.advanceDays(state, 1)
		morale(-3)
		return true, "먼 길로 돌아 봉쇄를 피했다. 하루가 더 걸렸다"
	end

	-- 직접 항해 점수(0~1)에 따라 보상: 모험 경험·사기·명성 (항해마다 한 번)
	function handlers.VoyageBonus(state, p)
		local days = state.voyageBonusDays
		if not days or type(p.score) ~= "number" then
			return false, "받을 보상이 없어요"
		end
		state.voyageBonusDays = nil
		local score = math.clamp(p.score, 0, 1)
		local msgs = {}
		local xp = math.floor(days * 3 * score)
		if xp > 0 then
			S.State.gainXp(state, "adventure", xp, msgs)
		end
		if score >= 0.7 then
			state.morale = math.min(100, state.morale + 8)
			state.fame += 1
			table.insert(msgs, string.format("바람을 훌륭하게 탔다 (%d%%)! 사기 +8, 명성 +1", math.floor(score * 100)))
		elseif score >= 0.4 then
			state.morale = math.min(100, state.morale + 3)
			table.insert(msgs, string.format("무난한 항해였다 (%d%%). 사기 +3", math.floor(score * 100)))
		else
			state.morale = math.max(0, state.morale - 3)
			table.insert(msgs, string.format("바람을 잘 못 탔다 (%d%%). 사기 -3", math.floor(score * 100)))
		end
		return true, table.concat(msgs, "\n")
	end

	function handlers.WaitDay(state)
		S.State.advanceDays(state, 1)
		state.morale = math.min(100, state.morale + 2)
		local w = D.Voyage.weather(state.day, state.portId)
		return true, string.format("하루를 기다렸다. 오늘 날씨: %s", w.name)
	end

	return { handlers = handlers, preview = preview }
end
