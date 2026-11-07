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
		for _ = 1, state.escorts do
			table.insert(list, { cannonMult = 0.08, speedMult = -0.03 })
		end
		for _, id in state.gear.equipped do
			local g = D.Gear.ById[id]
			if g then
				table.insert(list, g.perk)
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
		local pool = D.CompanionTalk.Talk[id][tier]
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
		-- 호감 단계가 오른 뒤 처음 대화하면 개인 이야기를 들려준다 (한 번, 보상 포함)
		for t = 2, tier do
			local key = id .. "_" .. t
			local story = D.CompanionTalk.Stories[id] and D.CompanionTalk.Stories[id][t]
			if story and not state.storySeen[key] then
				state.storySeen[key] = true
				line = story.line
				table.insert(msgs, "★ 동료의 이야기")
				if story.coins then
					state.coins += story.coins
					table.insert(msgs, string.format("+%d코인", story.coins))
				end
				if story.fame then
					state.fame += story.fame
					table.insert(msgs, string.format("명성 +%d", story.fame))
				end
				if story.morale then
					state.morale = math.min(100, state.morale + story.morale)
					table.insert(msgs, string.format("사기 +%d", story.morale))
				end
				break
			end
		end
		state.talk = { name = c.name, line = line, note = table.concat(msgs, " · ") }
		local ch = D.CompanionTalk.Choices[id]
		if ch and state.chatted ~= state.day .. id then
			state.talk.pending = id
			state.talk.question = ch.q
			state.talk.options = {}
			for i, o in ch.opts do
				state.talk.options[i] = o.text
			end
		end
		return true, string.format("%s: \"%s\"", c.name, line)
	end

	-- 대화 끝 질문에 대답: 반응과 보상이 대답마다 다르다 (동료마다 하루 한 번)
	function handlers.TalkChoice(state, p)
		local id = state.talk and state.talk.pending
		local ch = id and D.CompanionTalk.Choices[id]
		local o = ch and type(p.index) == "number" and ch.opts[p.index]
		if not o or not table.find(state.companions, id) then
			return false, "대답할 수 있는 질문이 없어요"
		end
		local c = Sp.CompanionById[id]
		state.chatted = state.day .. id
		local note
		if o.kind == "bond" then
			state.affinity[id] = math.min(Sp.MAX_AFFINITY, affinityOf(state, id) + o.amount)
			note = string.format("호감도 +%d", o.amount)
		elseif o.kind == "coins" then
			state.coins += o.amount
			note = string.format("+%d코인", o.amount)
		elseif o.kind == "fame" then
			state.fame += o.amount
			note = string.format("명성 +%d", o.amount)
		elseif o.kind == "morale" then
			state.morale = math.min(100, state.morale + o.amount)
			note = string.format("사기 +%d", o.amount)
		end
		state.talk = { name = c.name, line = o.reply, note = note }
		return true, string.format("%s: \"%s\"", c.name, o.reply)
	end

	function handlers.BuyGear(state, p)
		local g = type(p.gearId) == "string" and D.Gear.ById[p.gearId]
		if not g then
			return false, "알 수 없는 장비예요"
		end
		if table.find(state.gear.owned, g.id) then
			return false, "이미 가지고 있어요"
		end
		if state.fame < g.minFame then
			return false, string.format("명성 %d 이상이 필요해요", g.minFame)
		end
		if state.coins < g.price then
			return false, string.format("%d코인이 필요해요", g.price)
		end
		state.coins -= g.price
		table.insert(state.gear.owned, g.id)
		local msg = string.format("%s을(를) 샀다 (-%d코인)", g.name, g.price)
		if #state.gear.equipped < D.Gear.SLOTS then
			table.insert(state.gear.equipped, g.id)
			msg ..= " · 자동으로 장착했다"
		end
		return true, msg
	end

	function handlers.ToggleGear(state, p)
		local id = p.gearId
		if type(id) ~= "string" or not table.find(state.gear.owned, id) then
			return false, "가지고 있지 않아요"
		end
		local idx = table.find(state.gear.equipped, id)
		if idx then
			table.remove(state.gear.equipped, idx)
			return true, D.Gear.ById[id].name .. " 해제"
		end
		if #state.gear.equipped >= D.Gear.SLOTS then
			return false, string.format("장비는 %d개까지 장착해요", D.Gear.SLOTS)
		end
		table.insert(state.gear.equipped, id)
		return true, D.Gear.ById[id].name .. " 장착"
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
