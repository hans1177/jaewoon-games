--!nonstrict
-- 전투: 플레이어 배를 Fighter로 바꿔 자동 해전을 돌리고 결과를 상태에 반영한다.

return function(D, S)
	local handlers = {}

	-- 스킬을 쓸 수 없는 이유 (쓸 수 있으면 nil)
	local function skillBlock(state, s)
		if s.techReq and not state.tech[s.techReq] then
			return "연구 필요: " .. D.Tech.Tech[s.techReq].name
		end
		local spDef = s.grantedBy and D.Specialties.SpecialtyById[s.grantedBy]
		if spDef and state.specialty == s.grantedBy and S.Perk.specLevel(state, s.grantedBy) < (s.grantedLevel or 1) then
			return string.format("%s 전문 레벨 %d 필요", spDef.name, s.grantedLevel or 1)
		end
		if s.grantedBy and state.specialty ~= s.grantedBy and not table.find(state.companions, s.grantedBy) then
			local sp = D.Specialties.SpecialtyById[s.grantedBy]
			local co = D.Specialties.CompanionById[s.grantedBy]
			return "필요: " .. (if sp then sp.name .. " 전문 분야" else (if co then co.name .. " 동료" else s.grantedBy))
		end
		return nil
	end

	local function playerFighter(state)
		local def = S.State.shipDef(state)
		local battleLv = state.careers.battle.level
		local slots = D.Careers.loadoutSlots(battleLv)
		local skills = {}
		for _, id in state.loadout do
			local s = D.Skills.Skills[id]
			if s and S.Battle.skillBlock(state, s) == nil and #skills < slots then
				table.insert(skills, id)
			end
		end
		return {
			name = "우리 배",
			hull = state.ship.hull,
			maxHull = def.hull,
			crew = state.ship.crew,
			maxCrew = def.crew,
			cannons = def.cannons,
			speed = def.speed,
			steam = def.steam,
			fuel = if def.steam then (state.cargo.coal or 0) else 0,
			cannonMult = 1 + S.State.techSum(state, "cannonMult") + S.Perk.cannonBonus(state) + S.Shipyard.cannonMult(state) + 0.02 * (battleLv - 1),
			meleeMult = 1 + 0.03 * (battleLv - 1),
			pumpReduction = S.State.techSum(state, "pumpReduction"),
			skills = skills,
			level = battleLv,
		}
	end

	-- 적 레벨: 내 배의 능력치를 해적 레벨로 환산하고, 전투 레벨이 오를수록 조금씩 더 센 적이 나온다. (± 1)
	local function enemyLevel(state, rng)
		local def = S.State.shipDef(state)
		local base = D.Combat.equivalentLevel(def.cannons, def.hull, def.crew)
		local bonus = math.floor((state.careers.battle.level - 1) / 5)
		return math.max(1, base + bonus + math.floor(rng() * 3) - 1)
	end

	-- 사략선과의 자동 해전. msgs에 요약을 덧붙이고 이겼는지 돌려준다.
	local function encounter(state, ctx, msgs)
		local enemyLv = enemyLevel(state, ctx.rng)
		local enemy = D.Combat.pirate(enemyLv, ctx.rng)
		local me = playerFighter(state)
		local startFuel = me.fuel
		local result = D.Combat.run(me, enemy, ctx.rng)
		local reward = D.Combat.pirateReward(enemyLv)

		state.ship.hull = math.max(1, math.floor(result.a.hull))
		state.ship.crew = math.max(1, math.floor(result.a.crew))
		local used = startFuel - result.a.fuel
		if used > 0 then
			S.State.removeCargo(state, "coal", math.min(used, state.cargo.coal or 0))
		end

		state.lastBattle = { log = result.log, winner = result.winner, reason = result.reason, enemy = enemy.name }
		table.insert(msgs, string.format("사략선 '%s'(Lv.%d)와 조우!", enemy.name, enemyLv))
		for _, line in S.Perk.companionLines(state, "battle") do
			table.insert(msgs, line)
		end

		if result.winner == "a" then
			local coins = if result.reason == "boarded" or result.reason == "surrender"
				then math.floor(reward.coins * 1.5)
				else reward.coins
			state.coins += coins
			state.fame += reward.fame
			state.stats.battlesWon += 1
			table.insert(msgs, string.format("승리! 전리품 %d코인, 명성 +%d", coins, reward.fame))
			for _, line in S.Perk.companionLines(state, "win") do
				table.insert(msgs, line)
			end
			S.State.gainXp(state, "battle", reward.xp, msgs)
			S.Perk.addAffinity(state, 2, msgs)
			return true
		elseif result.winner == "b" then
			local lost = 0
			if state.insured then
				state.insured = false
				table.insert(msgs, "보험이 손실을 막아 주었다 (보험 소멸)")
			else
				lost = math.floor(state.coins * 0.1)
				state.coins -= lost
				for goodId, qty in table.clone(state.cargo) do
					S.State.removeCargo(state, goodId, math.floor(qty / 2))
				end
			end
			state.ship.hull = math.max(1, math.floor(S.State.shipDef(state).hull * 0.2))
			state.stats.battlesLost += 1
			table.insert(msgs, if lost > 0 or not state.insured then string.format("패배... 화물 절반과 %d코인을 잃고 간신히 도망쳤다", lost) else "패배... 하지만 보험 덕에 손실은 없었다")
			S.State.gainXp(state, "battle", math.floor(reward.xp / 4), msgs)
			return false
		end
		table.insert(msgs, "승부가 나지 않았다. 서로 물러났다")
		S.State.gainXp(state, "battle", math.floor(reward.xp / 5), msgs)
		return false
	end

	function handlers.Hunt(state, _p, ctx)
		local def = S.State.shipDef(state)
		if state.ship.hull < def.hull * 0.3 then
			return false, "선체가 너무 손상됐어요. 수리가 필요해요"
		end
		local msgs = {}
		S.State.advanceDays(state, 1)
		encounter(state, ctx, msgs)
		return true, table.concat(msgs, "\n")
	end

	function handlers.SetLoadout(state, p)
		if type(p.skills) ~= "table" then
			return false, "잘못된 요청"
		end
		local slots = D.Careers.loadoutSlots(state.careers.battle.level)
		local list, seen = {}, {}
		for _, id in p.skills do
			local s = type(id) == "string" and D.Skills.Skills[id]
			if not s or seen[id] then
				return false, "잘못된 스킬이에요"
			end
			local block = S.Battle.skillBlock(state, s)
			if block then
				return false, block
			end
			seen[id] = true
			table.insert(list, id)
		end
		if #list > slots then
			return false, string.format("스킬 슬롯은 %d개예요", slots)
		end
		if #list == 0 then
			return false, "스킬을 하나 이상 장착하세요"
		end
		state.loadout = list
		return true, "자동스킬 우선순위를 저장했어요"
	end

	return { handlers = handlers, skillBlock = skillBlock, playerFighter = playerFighter, encounter = encounter, enemyLevel = enemyLevel }
end
