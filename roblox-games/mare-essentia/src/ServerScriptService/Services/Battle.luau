--!nonstrict
-- 전투: 플레이어 배를 Fighter로 바꿔 자동 해전을 돌리고 결과를 상태에 반영한다.

return function(D, S)
	local handlers = {}
	local deckFaction = setmetatable({}, { __mode = "k" }) -- 그 카드 패의 문화권 덱 (나라에서 정해진다)
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

	local function playerFighter(state): any
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
		local sup: any = S.Cardbook.navalSupport(state) -- 덱의 지식 카드가 자동으로 거드는 효과
		return {
			name = if #state.fleet > 0 then string.format("우리 선단(%d척)", #state.fleet + 1) else "우리 배",
			hull = state.ship.hull + bonusHull,
			maxHull = def.hull + bonusHull,
			crew = state.ship.crew,
			maxCrew = def.crew,
			cannons = def.cannons + S.State.fleetCannons(state),
			speed = def.speed + sup.speed,
			steam = def.steam,
			fuel = if def.steam then (state.cargo.coal or 0) else 0,
			cannonMult = 1 + S.State.techSum(state, "cannonMult") + S.Perk.cannonBonus(state) + S.Shipyard.cannonMult(state) + 0.02 * (battleLv - 1) + sup.cannonMult,
			meleeMult = 1 + 0.03 * (battleLv - 1) + sup.meleeMult,
			pumpReduction = S.State.techSum(state, "pumpReduction") + sup.pump,
			cardSupport = sup,
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
			hull = result.a.hull, fuel = result.a.fuel, startFuel = me.fuel,
			-- 의학 카드: 전투에서 잃은 선원의 일부를 되살린다
			crew = result.a.crew + math.floor(math.max(0, me.crew - result.a.crew) * me.cardSupport.medic),
			winner = result.winner, reason = result.reason, reward = D.Combat.pirateReward(enemyLv),
			fleeChance = math.clamp(0.5 + (me.speed - enemy.speed) * 0.08, 0.15, 0.9),
			startHull = state.ship.hull, startCrew = state.ship.crew, medic = me.cardSupport.medic,
		}
		-- 해상전은 카드 대결 없이 원래 전투 판정을 따른다 (카드 대결은 주점의 지식 카드 배틀에서만 한다)
		state.lastBattle = { log = result.log, winner = result.winner, reason = result.reason, enemy = enemy.name, canFlee = deferred == true, pending = deferred == true }
		if deferred then
			-- 실시간 해전: 클라이언트가 두 배의 능력으로 직접 싸운다. 서버는 끝난 뒤 결과가 말이 되는지만 확인한다.
			local keep = function(f)
				return { name = f.name, hull = f.hull, maxHull = f.maxHull, crew = f.crew, maxCrew = f.maxCrew, cannons = f.cannons, speed = f.speed, cannonMult = f.cannonMult, meleeMult = f.meleeMult, pumpReduction = f.pumpReduction, level = f.level, steam = f.steam, fuel = f.fuel, skills = table.clone(f.skills) }
			end
			pb.sim = { me = keep(me), foe = keep(enemy), done = false }
			state.lastBattle.sim = { me = pb.sim.me, foe = pb.sim.foe }
		end
		table.insert(msgs, string.format("사략선 '%s'(Lv.%d)와 조우!", enemy.name, enemyLv))
		if #me.cardSupport.lines > 0 then
			table.insert(msgs, "카드 지원: " .. table.concat(me.cardSupport.lines, " · "))
		end
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
		if pb.bossId then
			S.Boss.settlePending(state, pb, msgs)
		else
			settle(state, msgs, pb)
		end
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
		local r = D.BoardingCards.replay("gunnery", c.seed, { fighter = c.my, deckCards = deckCache[state], faction = deckFaction[state], book = S.Cardbook.deckSpec(state) }, { fighter = c.foe, boss = c.boss }, actions)
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

	-- 실시간 해전 결과: 클라이언트가 직접 싸운 결과를 보내오면 서버는 그 시간에 낼 수 있는 피해인지만 확인한다.
	-- 말이 안 되는 보고는 버리고 서버가 미리 돌려 둔 자동 해전 결과를 쓴다.
	function handlers.NavalResult(state, p)
		local pb = state.pendingBattle
		local sim = pb and pb.sim
		if not sim or sim.done then
			return false, "진행 중인 실시간 해전이 없어요"
		end
		sim.done = true
		if type(p) ~= "table" then
			return false, "잘못된 요청"
		end
		local function num(v, lo, hi): number
			if type(v) ~= "number" or v ~= v then
				return -1
			end
			return math.clamp(v, lo, hi)
		end
		local me, foe = sim.me, sim.foe
		local elapsed = num(p.elapsed, 0, 900)
		local meHull = num(p.meHull, 0, me.maxHull)
		local foeHull = num(p.foeHull, 0, foe.maxHull)
		local meCrew = num(p.meCrew, 0, me.maxCrew)
		local foeCrew = num(p.foeCrew, 0, foe.maxCrew)
		if elapsed < 0 or meHull < 0 or foeHull < 0 or meCrew < 0 or foeCrew < 0 then
			return false, "잘못된 보고"
		end
		-- 그 시간 동안 낼 수 있는 피해보다 많이 줬다고 하면 거부
		-- (내가 입은 피해는 이미 입은 선체 손상에서 시작하므로 전투 시작 때의 선체를 기준으로 본다)
		local toFoe = D.Combat.maxHullDamage(me, elapsed) + 1
		local toMe = D.Combat.maxHullDamage(foe, elapsed) + 1
		if (foe.hull - foeHull) > toFoe or (me.hull - meHull) > toMe then
			return false, "보고가 규칙에 맞지 않아요"
		end
		-- 포격으로 줄어드는 선원은 선체 피해의 일부뿐이다
		if (foe.crew - foeCrew) > toFoe * 0.25 + 1 or (me.crew - meCrew) > toMe * 0.25 + 1 then
			if not (type(p.board) == "table") then
				return false, "보고가 규칙에 맞지 않아요"
			end
		end
		local winner, reason = p.winner, p.reason
		if winner ~= "a" and winner ~= "b" and winner ~= "draw" then
			return false, "잘못된 보고"
		end
		if p.board and type(p.board) == "table" and type(p.board.seed) == "number" then
			-- 접현: 서버가 같은 시드로 백병전을 다시 돌려 승패와 선원 수를 정한다
			local mc = num(p.board.meCrew, 1, me.maxCrew)
			if mc < 0 then
				mc = meCrew
			end
			local fc = num(p.board.foeCrew, 1, foe.maxCrew)
			if fc < 0 then
				fc = foeCrew
			end
			if (foe.crew - fc) > toFoe * 0.25 + 1 or (me.crew - mc) > toMe * 0.25 + 1 then
				return false, "보고가 규칙에 맞지 않아요"
			end
			local a2 = table.clone(me)
			a2.hull, a2.crew = math.max(1, meHull), math.max(1, mc)
			local b2 = table.clone(foe)
			b2.hull, b2.crew = math.max(1, foeHull), math.max(1, fc)
			local r = D.Combat.board(a2, b2, math.floor(p.board.seed))
			winner, reason = r.winner, r.reason
			meCrew, foeCrew = r.a.crew, r.b.crew
		elseif winner == "a" then
			if foeHull > 0 then
				return false, "승리 보고가 맞지 않아요"
			end
			reason = "sunk"
		elseif winner == "b" then
			if meHull > 0 then
				return false, "패배 보고가 맞지 않아요"
			end
			reason = "sunk"
		else
			reason = "stalemate"
		end
		if winner == "a" and elapsed < 6 then
			return false, "너무 빠른 승리예요"
		end
		pb.hull = math.max(1, math.floor(meHull))
		pb.crew = math.max(1, math.floor(meCrew + math.max(0, me.crew - meCrew) * (pb.medic or 0)))
		pb.winner, pb.reason = winner, reason
		local lb = state.lastBattle
		if lb then
			lb.winner, lb.reason = winner, reason
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

	return { handlers = handlers, deckCache = deckCache, deckFaction = deckFaction, resolve = resolve, skillBlock = skillBlock, playerFighter = playerFighter, encounter = encounter, enemyLevel = enemyLevel }
end
