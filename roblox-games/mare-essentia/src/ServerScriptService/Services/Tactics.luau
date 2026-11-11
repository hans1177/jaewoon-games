--!nonstrict
-- 지상 탐험 턴제 전술(파이어 엠블럼식). 탐험 지점에서 "전술 탐험"을 고르면 격자 맵 전투가 열린다.
-- 판정은 전부 서버가 한다: 클라이언트는 행동(이동·공격·대기)을 요청하고, 서버가 Tactics 규칙으로 검증·계산한다.
-- 이기면 조사 지점에서 찾은 도감 카드와 보상을 받는다. 같은 지점의 기록(등급)은 퀘스트가 읽는다.

return function(D, S)
	local handlers = {}
	local Data, Rules, Maps = D.TacticsData, D.Tactics, D.TacticsMaps

	local function findSite(siteId)
		for _, site in D.Sites.Sites do
			if site.id == siteId then
				return site
			end
		end
		return nil
	end

	-- 동료의 능력(perk)을 병종과 스킬로 바꾼다
	local function companionSpec(c, level, idx)
		local perk = c.perk or {}
		local class, skills = "swordsman", {}
		if perk.healMult then
			class = "scholar"
			table.insert(skills, "first_aid")
		elseif perk.cannonMult then
			class = "gunner"
			table.insert(skills, "aim")
		elseif perk.speedMult then
			class = "rogue"
			table.insert(skills, "scout")
		elseif perk.discoverFields and table.find(perk.discoverFields, "Zoology") then
			class = "archer"
			table.insert(skills, "naturalist")
		elseif perk.discoverFields and (table.find(perk.discoverFields, "Botany") or table.find(perk.discoverFields, "Medicine")) then
			class = "scholar"
			table.insert(skills, "herbalist")
		elseif perk.coinFields then
			class = "lancer"
			table.insert(skills, "hawkeye")
		else
			class = "lancer"
			table.insert(skills, "bulwark")
		end
		if c.role == "포수" then
			class = "gunner"
		elseif c.role == "의사" then
			class = "scholar"
			if not table.find(skills, "first_aid") then
				table.insert(skills, "first_aid")
			end
		end
		return { id = "c" .. idx, name = c.name, class = class, level = level, skills = skills }
	end

	-- 전문 분야 → 주인공의 스킬
	local function leadSkills(state)
		local skills = { "charge" }
		local sp = state.specialty and D.Specialties.SpecialtyById[state.specialty]
		local mapped = sp and Data.SpecialtySkill[sp.id]
		if mapped and not table.find(skills, mapped) then
			table.insert(skills, mapped)
		end
		return skills
	end

	-- 편성: 주인공 + 동료 + 선원(5자리까지)
	local function buildParty(state)
		local level = math.max(1, state.careers.battle.level, math.floor((state.careers.adventure.level + state.careers.battle.level) / 2))
		local party = { { id = "p1", name = "주인공", class = "swordsman", level = level, skills = leadSkills(state), lead = true } }
		local idx = 0
		for _, cid in state.companions do
			local c = D.Specialties.CompanionById[cid]
			if c and #party < 5 then
				idx += 1
				table.insert(party, companionSpec(c, level, idx))
			end
		end
		local crewKinds = {
			{ class = "lancer", name = "선원 창병", skills = { "bulwark" } },
			{ class = "archer", name = "선원 궁수", skills = {} },
			{ class = "axeman", name = "선원 도끼병", skills = {} },
			{ class = "gunner", name = "선원 총병", skills = {} },
		}
		local ci = 0
		while #party < 5 and S.State.totalCrew(state) >= (#party) * 4 do
			ci += 1
			local k = crewKinds[(ci - 1) % #crewKinds + 1]
			table.insert(party, { id = "m" .. ci, name = k.name, class = k.class, level = level, skills = k.skills })
		end
		-- 선원이 적어도 최소 3명은 함께 간다
		while #party < 3 do
			ci += 1
			local k = crewKinds[(ci - 1) % #crewKinds + 1]
			table.insert(party, { id = "m" .. ci, name = k.name, class = k.class, level = level, skills = k.skills })
		end
		return party
	end

	local function remainingPool(state, site)
		local pool = {}
		for _, cardId in site.pool do
			if not state.discovered[cardId] then
				table.insert(pool, cardId)
			end
		end
		return pool
	end

	function handlers.TacticsStart(state, p)
		if state.tbattle and state.tbattle.status == "active" then
			return false, "이미 전투 중이에요"
		end
		local site = type(p.siteId) == "string" and findSite(p.siteId)
		if not site then
			return false, "잘못된 요청"
		end
		local map = Maps.forSite(site)
		if not map then
			return false, "이곳은 전술 탐험을 할 수 없어요"
		end
		if site.portId ~= state.portId then
			return false, "이 항구의 탐험 지점이 아니에요"
		end
		if state.careers.adventure.level < site.minLevel then
			return false, string.format("모험 레벨 %d 이상이 필요해요", site.minLevel)
		end
		local pool = remainingPool(state, site)
		if #pool == 0 then
			return false, "이곳은 이미 모두 조사했어요"
		end
		local need = D.Voyage.suppliesPerDay(S.State.totalCrew(state)) * site.days
		if state.ship.supplies < need then
			return false, string.format("보급품이 부족해요 (필요 %d)", need)
		end
		state.ship.supplies -= need
		S.State.advanceDays(state, site.days)
		local battle = Rules.newBattle(map, buildParty(state), { enemyLevel = math.max(1, site.minLevel), pool = pool })
		battle.siteId = site.id
		battle.siteName = site.name
		battle.biome = map.biome
		state.tbattle = battle
		return true, string.format("%s: %s", site.name, map.intro)
	end

	-- 전투가 끝났을 때 보상과 기록을 정리한다
	local function finish(state, msgs)
		local b = state.tbattle
		if not b or b.finished then
			return
		end
		b.finished = true
		local site = findSite(b.siteId)
		if b.status == "lost" then
			state.stats.battlesLost += 1
			table.insert(msgs, "전술 탐험에 실패했다. 부대는 간신히 후퇴했다.")
			return
		end
		local rank = Rules.rank(b)
		local mult = Data.RankMult[rank] or 1
		local minLevel = site and site.minLevel or 1
		local coins = math.floor((40 + 30 * minLevel + 25 * #b.found) * mult) + b.bonusCoins
		state.coins += coins
		state.stats.explored += 1
		state.stats.battlesWon += 1
		table.insert(msgs, string.format("전술 탐험 성공! 등급 %s (%d턴) +%d코인", rank, b.turn - 1, coins))
		for _, cardId in b.found do
			S.Discovery.grantCard(state, cardId, msgs)
		end
		S.State.gainXp(state, "battle", 20 + 8 * minLevel, msgs)
		S.State.gainXp(state, "adventure", 15 + 8 * minLevel, msgs)
		state.tactics = state.tactics or { cleared = {} }
		local prev = state.tactics.cleared[b.siteId]
		local order = { S = 3, A = 2, B = 1 }
		if not prev or (order[rank] or 0) > (order[prev.rank] or 0) then
			state.tactics.cleared[b.siteId] = { rank = rank, turns = b.turn - 1, biome = b.biome, objective = b.objective }
		end
	end

	local function after(state, msgs)
		local b = state.tbattle
		if b and b.status ~= "active" then
			finish(state, msgs)
		end
	end

	function handlers.TacticsAct(state, p)
		local b = state.tbattle
		if not b or b.status ~= "active" then
			return false, "진행 중인 전술 전투가 없어요"
		end
		if type(p.unitId) ~= "string" then
			return false, "잘못된 요청"
		end
		local ok, msg = Rules.act(b, p.unitId, p)
		if not ok then
			return false, msg
		end
		local msgs = { msg }
		-- 모두 행동했으면 자동으로 적 턴으로 넘어간다
		if b.status == "active" and Rules.allActed(b) then
			Rules.endTurn(b)
		end
		after(state, msgs)
		return true, table.concat(msgs, "\n")
	end

	function handlers.TacticsEnd(state)
		local b = state.tbattle
		if not b or b.status ~= "active" then
			return false, "진행 중인 전술 전투가 없어요"
		end
		local ok, msg = Rules.endTurn(b)
		if not ok then
			return false, msg
		end
		local msgs = {}
		after(state, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 전투를 접고 돌아온다 (보상 없음). 끝난 전투 화면을 닫을 때도 쓴다.
	function handlers.TacticsLeave(state)
		local b = state.tbattle
		if not b then
			return false, "진행 중인 전술 전투가 없어요"
		end
		state.tbattle = nil
		if b.status == "active" then
			return true, "탐험을 접고 돌아왔다"
		end
		return true, ""
	end

	return { handlers = handlers, buildParty = buildParty, finish = finish }
end
