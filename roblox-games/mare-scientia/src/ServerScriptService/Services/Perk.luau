--!nonstrict
-- 전문 분야와 동료 효과를 한 곳에서 합산한다. 다른 서비스는 여기서만 보너스를 읽는다.

return function(D, S)
	local handlers = {}
	local Sp = D.Specialties

	local NUMERIC = { "discoverBonus", "coinMult", "speedMult", "sellBonus", "cannonMult", "healMult" }

	local function scaled(perk, k)
		if k == 1 then
			return perk
		end
		local c = table.clone(perk)
		for _, key in NUMERIC do
			if c[key] then
				c[key] = c[key] * k
			end
		end
		return c
	end

	-- 전문 분야 레벨 (아직 한 번도 안 올렸으면 1)
	local function specLevel(state, specId)
		local rec = state.specLevels[specId]
		return if rec then rec.level else 1
	end

	local function affinityOf(state, companionId)
		return state.affinity[companionId] or 0
	end

	local function activePerks(state)
		local list = {}
		if state.specialty and Sp.SpecialtyById[state.specialty] then
			local k = Sp.levelMult(specLevel(state, state.specialty))
			table.insert(list, scaled(Sp.SpecialtyById[state.specialty].perk, k))
		end
		for _, id in state.companions do
			local c = Sp.CompanionById[id]
			if c then
				table.insert(list, scaled(c.perk, Sp.affinityMult(affinityOf(state, id))))
			end
		end
		return list
	end

	local function sum(state, key)
		local total = 0
		for _, p in activePerks(state) do
			total += p[key] or 0
		end
		return total
	end

	local function inFields(fields, field)
		return fields ~= nil and table.find(fields, field) ~= nil
	end

	-- 이 분야 카드를 찾을 확률 보너스
	local function discoverBonus(state, field)
		local total = 0
		for _, p in activePerks(state) do
			if inFields(p.discoverFields, field) then
				total += p.discoverBonus or 0
			end
		end
		return total
	end

	-- 카드 등록 코인 배율 (1 = 그대로)
	local function coinMult(state, field)
		local total = 1
		for _, p in activePerks(state) do
			if inFields(p.coinFields, field) then
				total += p.coinMult or 0
			end
		end
		return total
	end

	local function speedMult(state)
		return 1 + sum(state, "speedMult")
	end

	local function sellBonus(state)
		return sum(state, "sellBonus")
	end

	local function cannonBonus(state)
		return sum(state, "cannonMult")
	end

	-- 전문 분야 경험치: kind 는 카드 분야 또는 "voyage" / "trade"
	local function gainSpec(state, kind, amount, msgs)
		local sp = state.specialty and Sp.SpecialtyById[state.specialty]
		if not sp or amount <= 0 or not table.find(sp.xpOn, kind) then
			return false
		end
		local rec = state.specLevels[sp.id]
		if not rec then
			rec = { level = 1, xp = 0 }
			state.specLevels[sp.id] = rec
		end
		if rec.level >= Sp.MAX_LEVEL then
			return false
		end
		rec.xp += math.floor(amount)
		local up = false
		while rec.level < Sp.MAX_LEVEL and rec.xp >= Sp.xpForNext(rec.level) do
			rec.xp -= Sp.xpForNext(rec.level)
			rec.level += 1
			up = true
			if msgs then
				table.insert(msgs, string.format("%s 전문 레벨 %d!%s", sp.name, rec.level, if rec.level == Sp.SKILL_LEVEL then " (전용 스킬 해금)" else ""))
			end
		end
		if rec.level >= Sp.MAX_LEVEL then
			rec.xp = 0
		end
		return up
	end

	-- 함께하는 동료 모두와 호감도가 오른다. 단계가 오르면 메시지를 남긴다.
	local function addAffinity(state, amount, msgs)
		for _, id in state.companions do
			local c = Sp.CompanionById[id]
			if c then
				local before = affinityOf(state, id)
				local after = math.min(Sp.MAX_AFFINITY, before + amount)
				state.affinity[id] = after
				if msgs and Sp.affinityTier(after) > Sp.affinityTier(before) then
					table.insert(msgs, string.format("%s와(과)의 유대가 깊어졌다 (효과 x%.2f)", c.name, Sp.affinityMult(after)))
				end
			end
		end
	end

	function handlers.SetSpecialty(state, p)
		local sp = type(p.specialtyId) == "string" and Sp.SpecialtyById[p.specialtyId]
		if not sp then
			return false, "잘못된 전문 분야예요"
		end
		if state.specialty == sp.id then
			return false, "이미 이 분야예요"
		end
		local fee = if state.specialty then Sp.CHANGE_FEE else 0
		if state.coins < fee then
			return false, string.format("분야를 바꾸려면 %d코인이 필요해요", fee)
		end
		state.coins -= fee
		state.specialty = sp.id
		return true, string.format("전문 분야: %s%s", sp.name, if fee > 0 then string.format(" (-%d코인)", fee) else "")
	end

	-- 영입 불가 사유 (가능하면 nil)
	local function recruitBlock(state, c)
		if table.find(state.companions, c.id) then
			return "이미 함께하고 있어요"
		end
		if #state.companions >= Sp.MAX_COMPANIONS then
			return string.format("동료는 최대 %d명이에요", Sp.MAX_COMPANIONS)
		end
		if c.scholarId ~= "" and not state.scholarsMet[c.scholarId] then
			return "먼저 이 학자를 만나 지식을 전수받아야 해요"
		end
		if state.fame < c.minFame then
			return string.format("명성 %d 이상이 필요해요", c.minFame)
		end
		if state.coins < c.fee then
			return string.format("%d코인이 필요해요", c.fee)
		end
		return nil
	end

	function handlers.Recruit(state, p)
		local c = type(p.companionId) == "string" and Sp.CompanionById[p.companionId]
		if not c then
			return false, "알 수 없는 동료예요"
		end
		local reason = recruitBlock(state, c)
		if reason then
			return false, reason
		end
		state.coins -= c.fee
		table.insert(state.companions, c.id)
		return true, string.format("%s이(가) 동료가 되었다! (-%d코인)", c.name, c.fee)
	end

	-- 동료와 대화: 하루에 한 번 호감도 +2. 호감 단계에 따라 다른 이야기를 한다.
	function handlers.Talk(state, p, ctx)
		local id = p.companionId
		local c = type(id) == "string" and Sp.CompanionById[id]
		if not c or not table.find(state.companions, id) then
			return false, "함께하고 있지 않아요"
		end
		local tier = Sp.affinityTier(affinityOf(state, id))
		local pool = D.CompanionTalk[id][tier]
		local line = pool[math.min(#pool, math.floor(ctx.rng() * #pool) + 1)]
		local msgs = {}
		local fresh = state.talked[id] ~= state.day
		if fresh then
			state.talked[id] = state.day
			local before = affinityOf(state, id)
			state.affinity[id] = math.min(Sp.MAX_AFFINITY, before + 2)
			table.insert(msgs, "호감도 +2")
			if Sp.affinityTier(state.affinity[id]) > Sp.affinityTier(before) then
				table.insert(msgs, string.format("%s와(과)의 유대가 깊어졌다 (효과 x%.2f)", c.name, Sp.affinityMult(state.affinity[id])))
			end
		else
			table.insert(msgs, "(오늘은 이미 깊은 이야기를 나눴어요)")
		end
		state.talk = { name = c.name, line = line, note = table.concat(msgs, " · ") }
		return true, string.format("%s: \"%s\"", c.name, line)
	end

	function handlers.Dismiss(state, p)
		local idx = type(p.companionId) == "string" and table.find(state.companions, p.companionId)
		if not idx then
			return false, "함께하고 있지 않아요"
		end
		table.remove(state.companions, idx)
		return true, "동료와 헤어졌다. 다시 영입할 수 있다"
	end

	-- 전투 시작/승리 때 동료들이 하는 말
	local function companionLines(state, kind)
		local lines = {}
		for _, id in state.companions do
			local c = Sp.CompanionById[id]
			if c then
				table.insert(lines, string.format("%s: \"%s\"", c.name, if kind == "win" then c.winLine else c.battleLine))
			end
		end
		return lines
	end

	return {
		handlers = handlers,
		companionLines = companionLines,
		gainSpec = gainSpec,
		addAffinity = addAffinity,
		specLevel = specLevel,
		affinityOf = affinityOf,
		discoverBonus = discoverBonus,
		coinMult = coinMult,
		speedMult = speedMult,
		sellBonus = sellBonus,
		cannonBonus = cannonBonus,
		recruitBlock = recruitBlock,
		-- 의사 동료: 열병·괴혈병·사기 하락을 줄이는 비율 (최대 80%)
		healReduction = function(state)
			return math.min(0.8, sum(state, "healMult"))
		end,
	}
end
