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
		return D.Voyage.plan(def.speed * nation.speedMult * S.Perk.speedMult(state), def.steam, def.fuelPerDay, coal, state.ship.crew, dist, 1.0)
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
		local def = S.State.shipDef(state)
		if state.ship.hull < def.hull * 0.2 then
			return false, "선체가 너무 손상됐어요. 수리가 필요해요"
		end

		local from = D.Ports.Ports[state.portId]
		local nation = D.Ports.Nations[state.nationId]
		local wind = D.Voyage.windMult(ctx.rng)
		local dist = D.SeaRoutes.lengthKm(from.id, to.id, D.Ports.Ports)
		local coalAvailable = if def.steam then (state.cargo.coal or 0) else 0
		local plan = D.Voyage.plan(def.speed * nation.speedMult * S.Perk.speedMult(state), def.steam, def.fuelPerDay, coalAvailable, state.ship.crew, dist, wind)
		local event = D.Voyage.rollEvent(ctx.rng, plan.days)

		local msgs = {}
		local days = plan.days
		if event.kind == "tailwind" and days > 1 then
			days -= 1
		end

		-- 석탄 소모
		if plan.coal > 0 then
			S.State.removeCargo(state, "coal", math.min(plan.coal, state.cargo.coal or 0))
			table.insert(msgs, string.format("석탄 %d개를 태웠다", plan.coal))
		elseif def.steam and (state.cargo.coal or 0) == 0 then
			table.insert(msgs, "석탄이 없어 돛으로만 항해했다")
		end

		-- 보급품 소모
		local need = D.Voyage.suppliesPerDay(state.ship.crew) * days
		if state.ship.supplies >= need then
			state.ship.supplies -= need
		else
			local missing = need - state.ship.supplies
			state.ship.supplies = 0
			local loss = math.min(state.ship.crew - 1, math.ceil(missing / 3))
			state.ship.crew -= loss
			table.insert(msgs, string.format("보급품이 부족했다! 선원 %d명을 잃었다", loss))
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
		elseif event.kind == "drift" then
			state.coins += event.amount
			table.insert(msgs, string.format("표류물을 건져 %d코인을 얻었다", event.amount))
		elseif event.kind == "fever" then
			local loss = math.min(event.amount, state.ship.crew - 1)
			if loss > 0 then
				state.ship.crew -= loss
				table.insert(msgs, string.format("열병으로 선원 %d명을 잃었다", loss))
			end
		elseif event.kind == "pirates" then
			S.Battle.encounter(state, ctx, msgs)
		end

		-- 장거리 항해 기록에서 해류를 발견할 수 있다
		if days >= 10 and ctx.rng() < 0.35 then
			S.Discovery.grantCard(state, "geo_gulfstream", msgs)
		end

		state.portId = toId
		state.stats.visited[toId] = true
		S.State.gainXp(state, "adventure", days * 2 + math.floor(dist / 200), msgs)
		S.Perk.gainSpec(state, "voyage", days * 3, msgs)
		S.Perk.addAffinity(state, 1, msgs)
		return true, table.concat(msgs, "\n")
	end

	return { handlers = handlers, preview = preview }
end
