--!nonstrict
-- 전투: 플레이어 배를 Fighter로 바꿔 자동 해전을 돌리고 결과를 상태에 반영한다.

return function(D, S)
	local handlers = {}
	local deckCache = setmetatable({}, { __mode = "k" }) -- View 가 마지막으로 만든 카드 패 (서버가 카드 대결을 검증할 때 쓴다)

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
			if s and skillBlock(state, s) == nil and #skills < slots then
				table.insert(skills, id)
			end
		end
		local bonusHull = S.State.fleetHull(state)
		return {
			name = if #state.fleet > 0 then string.format("우리 선단(%d척)", #state.fleet + 1) else "우리 배",
			hull = state.ship.hull + bonusHull,
			maxHull = def.hull + bonusHull,
			crew = state.ship.crew,
			maxCrew = def.crew,
			cannons = def.cannons + S.State.fleetCannons(state),
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
		local base = D.Combat.equivalentLevel(def.cannons, def.hull, def.crew) + #state.fleet
		local bonus = math.floor((state.careers.battle.level - 1) / 5)
		return math.max(1, base + bonus + math.floor(rng() * 3) - 1)
	end

	-- 해전 결과를 상태에 반영한다 (pb: 미리 계산해 둔 전투 결과)
	local function settle(state, msgs, pb)
		S.Tactics.awardNavalMastery(state, pb.winner == "a", msgs)
		-- 선단의 보태진 선체는 기함이 아니라 선단 전체가 나눠 입는다: 받은 피해를 기함·선단 배에 나눈다
		local bonus = S.State.fleetHull(state)
		local damage = math.max(0, state.ship.hull + bonus - math.floor(pb.hull))
		local flagshipShare = if bonus > 0 then math.floor(damage * 0.6) else damage
		state.ship.hull = math.max(1, state.ship.hull - flagshipShare)
		local rest = damage - flagshipShare
		for _, f in state.fleet do
			local take = math.min(rest, math.floor(f.hull * 0.5))
			f.hull = math.max(1, f.hull - take)
			rest -= take
		end
		state.ship.crew = math.max(1, math.floor(pb.crew))
		local used = pb.startFuel - pb.fuel
		if used > 0 then
			S.State.removeCargo(state, "coal", math.min(used, state.cargo.coal or 0))
		end
		local reward = pb.reward
		if pb.winner == "a" then
			local coins = if pb.reason == "boarded" or pb.reason == "surrender"
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
		elseif pb.winner == "b" then
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

	-- 사략선과의 해전. deferred면 결과를 바로 적용하지 않고 보류한다 (도망 가능).
	local function encounter(state, ctx, msgs, deferred)
		local enemyLv = enemyLevel(state, ctx.rng)
		local enemy = D.Combat.pirate(enemyLv, ctx.rng)
		local me = playerFighter(state)
		local result = D.Combat.run(me, enemy, ctx.rng)
		-- 카드 대결: 시드와 두 배의 능력을 클라이언트에 알려 주고, 승패는 카드 대결 기록을 서버가 다시 돌려 정한다.
		local card = {
			seed = math.floor(ctx.rng() * 1000000) + 1,
			my = { cannons = me.cannons, cannonMult = me.cannonMult, crew = me.crew, level = me.level },
			foe = { cannons = enemy.cannons, cannonMult = enemy.cannonMult, crew = enemy.crew, level = enemyLv },
		}
		local pb = {
			hull = result.a.hull, crew = result.a.crew, fuel = result.a.fuel, startFuel = me.fuel,
			winner = result.winner, reason = result.reason, reward = D.Combat.pirateReward(enemyLv),
			fleeChance = math.clamp(0.5 + (me.speed - enemy.speed) * 0.08, 0.15, 0.9),
			startHull = state.ship.hull, startCrew = state.ship.crew,
		}
		if deferred then pb.card = card end
		state.lastBattle = { log = result.log, winner = result.winner, reason = result.reason, enemy = enemy.name, canFlee = deferred == true, pending = deferred == true, card = if deferred then card else nil }
		table.insert(msgs, string.format("사략선 '%s'(Lv.%d)와 조우!", enemy.name, enemyLv))
		for _, line in S.Perk.companionLines(state, "battle") do
			table.insert(msgs, line)
		end
		if deferred then
			state.pendingBattle = pb
			return nil
		end
		return settle(state, msgs, pb)
	end

	-- 보류된 해전 처리. flee면 도망을 시도한다.
	local function resolve(state, ctx, flee)
		local pb = state.pendingBattle
		if not pb then
			return false, "진행 중인 해전이 없어요"
		end
		state.pendingBattle = nil
		local msgs = {}
		if flee then
			if ctx.rng() < pb.fleeChance then
				state.lastBattle.fled = true
				state.lastBattle.pending = false
				state.ship.hull = math.max(1, math.floor(state.ship.hull * 0.9))
				table.insert(msgs, "도망 성공! 추격을 따돌렸다 (선체 약간 손상)")
				return true, table.concat(msgs, "\n")
			end
			table.insert(msgs, "도망 실패! 해적에게 따라잡혔다")
			state.lastBattle.fled = false
		end
		state.lastBattle.pending = false
		settle(state, msgs, pb)
		return true, table.concat(msgs, "\n")
	end

	function handlers.Hunt(state, _p, ctx)
		if state.pendingBattle then
			resolve(state, ctx, false)
		end
		local def = S.State.shipDef(state)
		if state.ship.hull < def.hull * 0.3 then
			return false, "선체가 너무 손상됐어요. 수리가 필요해요"
		end
		local msgs = {}
		S.State.advanceDays(state, 1)
		encounter(state, ctx, msgs, true)
		return true, table.concat(msgs, "\n")
	end

	-- 해전 기동 점수: 포탄 낙하 경고를 피한 만큼 명성 보너스(전투 결과와는 무관, 한 전투에 한 번, 최대 +4)
	function handlers.BattleFlair(state, p)
		local lb = state.lastBattle
		if not lb or lb.flairClaimed or lb.pending then
			return false, ""
		end
		lb.flairClaimed = true
		local score = if type(p) == "table" and type(p.score) == "number" and p.score == p.score then math.clamp(math.floor(p.score), 0, 400) else 0
		local fame = math.min(4, score // 60)
		if fame <= 0 then
			return true, ""
		end
		state.fame += fame
		return true, string.format("멋진 기동! 명성 +%d", fame)
	end

	-- 카드 대결 결과: 플레이어의 행동 기록을 같은 시드로 처음부터 다시 돌려 승패를 정한다. (카드에서 이기면 전체 승리)
	function handlers.CardBattle(state, p)
		local pb = state.pendingBattle
		if not pb or not pb.card or pb.cardDone then
			return false, "진행 중인 카드 대결이 없어요"
		end
		local actions = type(p) == "table" and p.actions
		if type(actions) ~= "table" or #actions > 200 then
			return false, "잘못된 요청"
		end
		for _, a in actions do
			if type(a) ~= "table" or type(a[1]) ~= "string" then
				return false, "잘못된 요청"
			end
		end
		local c = pb.card
		local r = D.BoardingCards.replay("gunnery", c.seed, { fighter = c.my, deckCards = deckCache[state] }, { fighter = c.foe }, actions)
		if not r then
			return false, "카드 기록이 규칙에 맞지 않아요"
		end
		pb.cardDone = true
		local lost, took = r.wins.foe, r.wins.me -- 내가 잃은 판 수, 내가 딴 판 수
		pb.hull = math.max(1, math.floor(pb.startHull * (1 - 0.15 * lost)))
		pb.crew = math.max(1, math.floor(pb.startCrew * (1 - 0.1 * lost)))
		if r.winner == "me" then
			pb.winner = "a"
			pb.reason = if lost == 0 then "surrender" else "boarded"
		elseif r.winner == "foe" then
			pb.winner = "b"
			pb.reason = "sunk"
		else
			pb.winner = "draw"
			pb.reason = "stalemate"
		end
		local lb = state.lastBattle
		if lb then
			lb.winner, lb.reason, lb.cardRounds = pb.winner, pb.reason, { me = took, foe = lost }
		end
		return true, ""
	end

	function handlers.ResolveBattle(state, p, ctx)
		return resolve(state, ctx, p ~= nil and p.flee == true)
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

	return { handlers = handlers, deckCache = deckCache, resolve = resolve, skillBlock = skillBlock, playerFighter = playerFighter, encounter = encounter, enemyLevel = enemyLevel }
end
