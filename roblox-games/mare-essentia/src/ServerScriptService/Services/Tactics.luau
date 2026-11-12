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
		if c.role == "갑판장" or c.role == "광산 출신 선원" then
			class = "axeman"
		elseif c.role == "몰락 귀족" then
			class = "rider"
		elseif c.role == "옛 영지 시종" then
			class = "knight"
		elseif c.role == "낭인 무사" then
			class = "swordsman"
		elseif c.role == "포수" or c.role == "포술장" or c.role == "갤리온 포수" then
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

	-- 역할에서 정한 기본 병종을 유지하고, 장비·숙련은 동료의 고유 ID에 붙인다.
	local function memberSpec(state, id, level, index)
		if id == "p1" then
			return { id = "p1", name = (state.captain and state.captain.name) or "주인공",
				class = (state.partyTraining and state.partyTraining.p1 and state.partyTraining.p1.class) or "swordsman",
				level = level, skills = leadSkills(state), lead = true }
		end
		return companionSpec(D.Specialties.CompanionById[id], level, index)
	end

	local function training(state, id)
		return (state.partyTraining and state.partyTraining[id]) or { xp = 0 }
	end

	local function masteryLevel(row)
		return 1 + math.floor(row.xp / Data.MasteryPerLevel)
	end

	local function addMastery(state, id, amount, msgs)
		state.partyTraining = state.partyTraining or {}
		local row = training(state, id)
		local before = masteryLevel(row)
		row.xp = math.min(Data.MaxMastery, row.xp + amount)
		state.partyTraining[id] = row
		if masteryLevel(row) > before then
			local name = memberSpec(state, id, 1, 1).name
			table.insert(msgs, string.format("%s 병종 숙련 Lv.%d", name, masteryLevel(row)))
		end
	end

	local function awardNavalMastery(state, victory, msgs)
		local amount = if victory then 12 else 6
		addMastery(state, "p1", amount, msgs)
		for _, id in state.companions do
			if D.Specialties.CompanionById[id] then
				local assigned = false
				for _, occupant in state.stations do
					if occupant == id then assigned = true; break end
				end
				addMastery(state, id, if assigned then amount else math.floor(amount / 2), msgs)
			end
		end
	end

	local function trainingView(state)
		local rows = {}
		local ids = table.clone(state.companions)
		table.insert(ids, 1, "p1")
		for index, id in ids do
			local spec = memberSpec(state, id, 1, index)
			local row = training(state, id)
			local promotion = Data.Promotions[spec.class]
			local level = masteryLevel(row)
			local result = { id = id, name = spec.name, level = level, xp = row.xp % Data.MasteryPerLevel,
				xpNext = Data.MasteryPerLevel, maxLevel = row.xp >= Data.MaxMastery,
				class = if row.promoted then promotion.name else Data.Classes[spec.class].name,
				promotion = promotion.name, promotionSkill = Data.Skills[promotion.skill].name,
				canPromote = not row.promoted and level >= Data.PromotionLevel,
				gear = {} }
			if id == "p1" then
				result.classes = {}
				for class in Data.Promotions do
					table.insert(result.classes, { id = class, name = Data.Classes[class].name, selected = class == spec.class,
						weapon = Data.Weapons[Data.Classes[class].weapon], move = Data.Classes[class].move })
				end
				table.sort(result.classes, function(a, b) return a.id < b.id end)
			end
			for _, slot in { "weapon", "armor" } do
				local items = {}
				for tier, item in Data.PersonalGear[slot] do
					local name = if slot == "weapon" then item.name .. " · " .. Data.Weapons[Data.Classes[spec.class].weapon] else item.name
					local stats = if slot == "weapon" then string.format("공격 +%d", item.atk)
						else string.format("방어 +%d · 이동 %+d", item.def, item.move)
					if slot == "weapon" and Data.Classes[spec.class].heal then
						stats = string.format("공격 +%d · 치료 +%d", item.atk, item.heal)
					end
					table.insert(items, { name = name, tier = tier, level = item.level, stats = stats,
						equipped = (row[slot] or 1) == tier, price = if tier <= (row[slot .. "Owned"] or 1) then 0 else item.price })
				end
				result.gear[slot] = items
			end
			table.insert(rows, result)
		end
		return rows
	end

	function handlers.PartyTraining(state, p)
		local id = p.memberId
		if type(id) ~= "string" or (id ~= "p1" and not table.find(state.companions, id)) then
			return false, "편성된 선장이나 동료만 바꿀 수 있어요"
		end
		if state.pendingBattle or state.tbattle then
			return false, "전투를 마친 뒤 병종과 장비를 바꿀 수 있어요"
		end
		local row = training(state, id)
		local level = masteryLevel(row)
		if p.class ~= nil then
			local class = p.class
			if id ~= "p1" or type(class) ~= "string" or not Data.Promotions[class] then return false, "선택할 수 없는 병종이에요" end
			local previous = row.class or "swordsman"
			if class == previous then return false, "이미 선택한 병종이에요" end
			row.classTraining = row.classTraining or {}
			row.classTraining[previous] = { weapon = row.weapon, weaponOwned = row.weaponOwned, promoted = row.promoted }
			local nextClass = row.classTraining[class] or {}
			row.class, row.weapon, row.weaponOwned, row.promoted = class, nextClass.weapon, nextClass.weaponOwned, nextClass.promoted
		elseif p.promote == true then
			if row.promoted or level < Data.PromotionLevel then return false, "승급 조건을 확인하세요" end
			row.promoted = true
		else
			local slot, tier = p.slot, p.tier
			local items = type(slot) == "string" and Data.PersonalGear[slot]
			local item = items and type(tier) == "number" and tier >= 1 and tier <= #items and items[tier]
			if not item or level < item.level then return false, "장비 조건을 확인하세요" end
			local owned = row[slot .. "Owned"] or 1
			-- 상위 장비를 사면 해당 단계 이하 장비로 무료 교체할 수 있다.
			if tier > owned then
				if state.coins < item.price then return false, "코인이 부족해요" end
				state.coins -= item.price
				row[slot .. "Owned"] = tier
			end
			row[slot] = tier
		end
		state.partyTraining = state.partyTraining or {}
		state.partyTraining[id] = row
		return true, if p.class ~= nil then "주인공 병종을 바꿨어요" elseif p.promote == true then "병종이 승급했어요" else "개인 장비를 장착했어요"
	end

	-- 편성: 주인공 + 동료 + 선원(5자리까지)
	local function buildParty(state)
		local level = math.max(1, state.careers.battle.level, math.floor((state.careers.adventure.level + state.careers.battle.level) / 2))
		local party = {}
		local ids = table.clone(state.companions)
		table.insert(ids, 1, "p1")
		for index, id in ids do
			if #party >= 5 then break end
			if id == "p1" or D.Specialties.CompanionById[id] then
				local spec = memberSpec(state, id, level, index - 1)
				local row = training(state, id)
				spec.memberId, spec.weaponTier, spec.armorTier, spec.promoted = id, row.weapon, row.armor, row.promoted
				spec.level += math.floor((masteryLevel(row) - 1) / 4)
				if row.promoted then
					local promotion = Data.Promotions[spec.class]
					spec.name ..= " · " .. promotion.name
					if not table.find(spec.skills, promotion.skill) then table.insert(spec.skills, promotion.skill) end
				end
				table.insert(party, spec)
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
		if site then
			for _, unit in b.units do
				if unit.team == "player" and unit.memberId then
					addMastery(state, unit.memberId, 15, msgs)
				end
			end
		end
		local mult = Data.RankMult[rank] or 1
		local minLevel = site and site.minLevel or 1
		local coins = math.floor((40 + 30 * minLevel + 25 * #b.found) * mult) + b.bonusCoins
		state.coins += coins
		state.stats.explored += 1
		state.stats.battlesWon += 1
		table.insert(msgs, string.format("전술 탐험 성공! 등급 %s (%d턴) +%d코인", rank, b.turn - 1, coins))
		if math.random() < 0.6 then
			S.Cardbook.offer(state, "explore", msgs)
		end
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

	return { handlers = handlers, buildParty = buildParty, finish = finish, trainingView = trainingView, awardNavalMastery = awardNavalMastery }
end
