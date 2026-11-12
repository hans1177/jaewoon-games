--!nonstrict
-- 신화 보스: 특정 항구 해역에서 전설 속 괴물에게 도전한다. 격파하면 큰 보상과 도감 카드를 얻는다.

return function(D, S)
	local handlers = {}

	-- 도전할 수 없는 이유 (가능하면 nil)
	local function blockReason(state, boss)
		if not table.find(boss.portIds, state.portId) then
			return "이 해역에서는 만날 수 없어요"
		end
		if state.careers.battle.level < boss.minBattleLevel then
			return string.format("전투 Lv.%d 필요", boss.minBattleLevel)
		end
		local rec = state.bosses[boss.id]
		if rec then
			local wait = rec.lastDay + boss.cooldownDays - state.day
			if wait > 0 then
				return string.format("%d일 뒤에 다시 나타나요", wait)
			end
		end
		local def = S.State.shipDef(state)
		if state.ship.hull < def.hull * 0.5 then
			return "선체를 수리한 뒤 도전하세요"
		end
		return nil
	end

	-- 보스전 결과 반영 (자동 전투와 카드 대결이 함께 쓴다)
	local function settleOutcome(state, boss, rec, winner, msgs)
		if winner == "a" then
			rec.defeated += 1
			state.coins += boss.rewardCoins
			state.fame += boss.rewardFame
			state.stats.battlesWon += 1
			table.insert(msgs, string.format("%s을(를) 물리쳤다! 보상 %d코인, 명성 +%d", boss.name, boss.rewardCoins, boss.rewardFame))
			for _, line in S.Perk.companionLines(state, "win") do
				table.insert(msgs, line)
			end
			S.Discovery.grantCard(state, boss.cardId, msgs)
			S.State.gainXp(state, "battle", boss.rewardXp, msgs)
			S.Perk.addAffinity(state, 5, msgs)
		elseif winner == "b" then
			local lost = 0
			if state.insured then
				state.insured = false
				table.insert(msgs, "보험이 손실을 막아 주었다 (보험 소멸)")
			else
				lost = math.floor(state.coins * 0.05)
				state.coins -= lost
			end
			state.ship.hull = math.max(1, math.floor(S.State.shipDef(state).hull * 0.2))
			state.stats.battlesLost += 1
			table.insert(msgs, string.format("괴물에게 밀려 %d코인을 잃고 도망쳤다", lost))
			S.State.gainXp(state, "battle", math.floor(boss.rewardXp / 8), msgs)
		else
			table.insert(msgs, "괴물이 바다 속으로 사라졌다. 승부는 나지 않았다")
			S.State.gainXp(state, "battle", math.floor(boss.rewardXp / 10), msgs)
		end
	end

	function handlers.ChallengeBoss(state, p, ctx)
		local boss = type(p.bossId) == "string" and D.Bosses.ById[p.bossId]
		if not boss then
			return false, "알 수 없는 괴물이에요"
		end
		local reason = blockReason(state, boss)
		if reason then
			return false, reason
		end

		local msgs = {}
		S.State.advanceDays(state, 2)
		local rec = state.bosses[boss.id] or { defeated = 0, lastDay = -1e6 }
		rec.lastDay = state.day
		state.bosses[boss.id] = rec

		local me = S.Battle.playerFighter(state)
		local startFuel = me.fuel
		local foe = D.Combat.boss(boss, me.steam)
		table.insert(msgs, string.format("%s이(가) 모습을 드러냈다!", boss.name))
		for _, line in S.Perk.companionLines(state, "battle") do
			table.insert(msgs, line)
		end
		if me.steam then
			table.insert(msgs, "증기 엔진 소리에 괴물이 더 사나워졌다")
		end
		local result = D.Combat.run(me, foe, ctx.rng)

		if type(p) == "table" and p.cards == true then
			-- 카드 대결 모드: 결과는 보류하고, 클라이언트의 카드 대결 기록을 서버가 다시 돌려 확정한다
			local card = {
				seed = math.floor(ctx.rng() * 1000000) + 1,
				my = { cannons = me.cannons, cannonMult = me.cannonMult, crew = me.crew, level = me.level },
				foe = { cannons = foe.cannons, cannonMult = foe.cannonMult, crew = foe.crew, level = foe.level },
				boss = true,
			}
			state.pendingBattle = {
				bossId = boss.id, hull = result.a.hull, crew = result.a.crew, fuel = result.a.fuel, startFuel = startFuel,
				winner = result.winner, reason = result.reason, fleeChance = 0, card = card,
				startHull = state.ship.hull, startCrew = state.ship.crew,
			}
			state.lastBattle = { log = result.log, winner = result.winner, reason = result.reason, enemy = boss.name, canFlee = false, pending = true, card = card }
			table.insert(msgs, "카드 대결로 승부를 가린다!")
			return true, table.concat(msgs, "\n")
		end

		state.ship.hull = math.max(1, math.floor(result.a.hull))
		state.ship.crew = math.max(1, math.floor(result.a.crew))
		local used = startFuel - result.a.fuel
		if used > 0 then
			S.State.removeCargo(state, "coal", math.min(used, state.cargo.coal or 0))
		end
		state.lastBattle = { log = result.log, winner = result.winner, reason = result.reason, enemy = boss.name }
		settleOutcome(state, boss, rec, result.winner, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 카드 대결로 정해진 보스전 결과를 반영한다 (Battle.resolve 에서 부른다)
	local function settlePending(state, pb, msgs)
		local boss = D.Bosses.ById[pb.bossId]
		local rec = state.bosses[pb.bossId]
		if not boss or not rec then return end
		state.ship.hull = math.max(1, math.floor(pb.hull))
		state.ship.crew = math.max(1, math.floor(pb.crew))
		local used = pb.startFuel - pb.fuel
		if used > 0 then
			S.State.removeCargo(state, "coal", math.min(used, state.cargo.coal or 0))
		end
		settleOutcome(state, boss, rec, pb.winner, msgs)
	end

	return { handlers = handlers, blockReason = blockReason, settlePending = settlePending }
end
