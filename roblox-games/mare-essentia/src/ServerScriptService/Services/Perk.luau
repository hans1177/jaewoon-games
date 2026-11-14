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
		if state.subSpecialty and Sp.SpecialtyById[state.subSpecialty] and specLevel(state, state.specialty or "") >= Sp.SUB_LEVEL then
			table.insert(list, scaled(Sp.SpecialtyById[state.subSpecialty].perk, Sp.SUB_MULT)) -- 부직업: 절반 효과
		end
		local origin = state.origin and Sp.OriginById[state.origin]
		if origin and origin.perk then
			table.insert(list, origin.perk)
		end
		for _, id in state.companions do
			local c = Sp.CompanionById[id]
			if c then
				local seat = nil
				for stId, who in state.stations do
					if who == id then
						seat = stId
					end
				end
				-- 자기 직책에 앉으면 x1.2, 엉뚱한 자리나 자리가 없으면 x0.6
				local fit = if seat ~= nil and seat == Sp.CompanionStation[id] then Sp.STATION_MATCH else Sp.STATION_MISMATCH
				table.insert(list, scaled(c.perk, Sp.affinityMult(affinityOf(state, id)) * fit))
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

	-- 중형 이상 배에서 조타수·포술장 자리가 비면 작은 감점
	local function vacancy(state)
		if S.State.shipDef(state).class < 2 then
			return 0, 0
		end
		return (if state.stations.helm then 0 else D.Specialties.VACANT_SPEED), (if state.stations.gunner then 0 else D.Specialties.VACANT_CANNON)
	end

	local function speedMult(state)
		return 1 + (vacancy(state)) + sum(state, "speedMult") + (if S.Knowledge then S.Knowledge.speedBonus(state) else 0) + (if S.Build then S.Build.speedBonus(state) else 0)
	end

	local function sellBonus(state)
		return sum(state, "sellBonus")
	end

	local function cannonBonus(state)
		local _, vc = vacancy(state)
		return vc + sum(state, "cannonMult") + (if S.Knowledge then D.KnowledgeTree.cannonBonus(state) else 0) + (if S.Build then S.Build.cannonBonus(state) else 0)
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

	-- 이 직업 계열(xpOn 중 카드 분야)의 발견 카드 수
	local function cardsIn(state, sp)
		local n = 0
		for id in state.discovered do
			local card = D.Cards.ById[id]
			if card and table.find(sp.xpOn, card.field) then
				n += 1
			end
		end
		return n
	end

	local function unlocked(state, sp)
		return sp.free == true or cardsIn(state, sp) >= Sp.UNLOCK_CARDS
	end

	-- 카드를 가장 많이 모은 계열의 직업 (동률이면 표의 앞쪽, 하나도 없으면 nil)
	local function recommend(state, minCards, exceptId)
		local best, bestN = nil, 0
		for _, sp in Sp.Specialties do
			if sp.id ~= exceptId then
				local n = cardsIn(state, sp)
				if n >= minCards and n > bestN then
					best, bestN = sp, n
				end
			end
		end
		return best, bestN
	end

	-- 직업이 없을 때 한 계열 카드가 모이면 자동 배정 (카드 습득 성과)
	local function autoAssign(state, msgs)
		if state.specialty then
			return false
		end
		local sp, n = recommend(state, Sp.AUTO_CARDS, nil)
		if not sp then
			return false
		end
		state.specialty = sp.id
		state.specAuto = true
		if msgs then
			table.insert(msgs, string.format("직업 배정: %s (%s 카드 %d장을 모은 성과) — 마음에 안 들면 한 번은 무료로 바꿀 수 있어요", sp.name, sp.name, n))
		end
		return true
	end

	function handlers.SetSpecialty(state, p)
		local sp = type(p.specialtyId) == "string" and Sp.SpecialtyById[p.specialtyId]
		if not sp then
			return false, "잘못된 전문 분야예요"
		end
		if state.specialty == sp.id then
			return false, "이미 이 분야예요"
		end
		if not unlocked(state, sp) then
			return false, string.format("%s는 관련 카드를 %d장 이상 발견해야 고를 수 있어요 (현재 %d장)", sp.name, Sp.UNLOCK_CARDS, cardsIn(state, sp))
		end
		local fee = if state.specialty and not state.specAuto then Sp.CHANGE_FEE else 0
		if state.coins < fee then
			return false, string.format("분야를 바꾸려면 %d코인이 필요해요", fee)
		end
		state.coins -= fee
		state.specialty = sp.id
		state.specAuto = false
		if state.subSpecialty == sp.id then
			state.subSpecialty = nil
		end
		return true, string.format("전문 분야: %s%s", sp.name, if fee > 0 then string.format(" (-%d코인)", fee) else "")
	end

	-- 부직업: 주직업이 거장(Lv.5)이면 하나 더 고른다 (효과 절반). 같은 id 를 다시 보내면 해제.
	function handlers.SetSubSpecialty(state, p)
		local sp = type(p.specialtyId) == "string" and Sp.SpecialtyById[p.specialtyId]
		if not sp then
			return false, "잘못된 전문 분야예요"
		end
		if not state.specialty or specLevel(state, state.specialty) < Sp.SUB_LEVEL then
			return false, "주직업이 거장(전문 Lv.5)이 되어야 부직업을 가질 수 있어요"
		end
		if sp.id == state.specialty then
			return false, "주직업과 같은 분야는 고를 수 없어요"
		end
		if state.subSpecialty == sp.id then
			state.subSpecialty = nil
			return true, "부직업을 해제했어요"
		end
		if not unlocked(state, sp) then
			return false, string.format("%s는 관련 카드를 %d장 이상 발견해야 해요 (현재 %d장)", sp.name, Sp.UNLOCK_CARDS, cardsIn(state, sp))
		end
		state.subSpecialty = sp.id
		return true, string.format("부직업: %s (효과 절반)", sp.name)
	end

	-- 영입 불가 사유 (가능하면 nil)
	local function recruitBlock(state, c)
		if table.find(state.companions, c.id) then
			return "이미 함께하고 있어요"
		end
		local slots = Sp.slotsFor(S.State.shipDef(state).class)
		if #state.companions >= slots then
			return string.format("이 배에는 동료가 %d명까지 탈 수 있어요 (큰 배일수록 자리가 많아요)", slots)
		end
		if c.requiresStory and not state.story[c.requiresStory] then
			local port = c.homePort and D.Ports.Ports[c.homePort]
			return string.format("%s 주점에서 이 사람의 사연을 먼저 들어야 해요", port and port.name or "고향")
		end
		if c.nation and c.nation ~= state.nationId then
			return "다른 주인공의 동료예요"
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

	local seatFor

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
		local seat = seatFor(state, c.id)
		return true, string.format("%s이(가) 동료가 되었다! (-%d코인) %s 자리에 앉았다", c.name, c.fee, Sp.StationById[seat].name)
	end

	-- 이 동료를 앉힐 자리: 맞는 직책이 비어 있으면 그 자리, 아니면 처음 빈 자리 (모두 차면 맞는 직책 자리의 주인과 바꾼다)
	function seatFor(state, id)
		local want = Sp.CompanionStation[id] or "boatswain"
		if state.stations[want] == nil then
			state.stations[want] = id
			return want
		end
		for _, st in Sp.Stations do
			if state.stations[st.id] == nil then
				state.stations[st.id] = id
				return st.id
			end
		end
		return want
	end

	-- 동료를 다른 자리에 앉힌다. 그 자리에 앉은 동료가 있으면 서로 자리를 바꾼다.
	function handlers.Station(state, p)
		local id = type(p.companionId) == "string" and p.companionId
		local to = type(p.station) == "string" and Sp.StationById[p.station]
		if not id or not to or not table.find(state.companions, id) then
			return false, "함께하고 있지 않은 동료예요"
		end
		local from = nil
		for stId, who in state.stations do
			if who == id then
				from = stId
			end
		end
		if from == to.id then
			return false, "이미 그 자리에 앉아 있어요"
		end
		local other = state.stations[to.id]
		state.stations[to.id] = id
		if from then
			state.stations[from] = other
		end
		local name = Sp.CompanionById[id].name
		local good = Sp.CompanionStation[id] == to.id
		return true, string.format("%s을(를) %s 자리에 앉혔다%s", name, to.name, if good then " (직책에 딱 맞아요, 효과 x1.2)" else " (직책과 달라 효과가 줄어요, x0.6)")
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
		for stId, who in state.stations do
			if who == p.companionId then
				state.stations[stId] = nil
			end
		end
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
		autoAssign = autoAssign,
		cardsIn = cardsIn,
		specUnlocked = unlocked,
		recommendSpec = recommend,
		addAffinity = addAffinity,
		specLevel = specLevel,
		affinityOf = affinityOf,
		discoverBonus = discoverBonus,
		coinMult = coinMult,
		speedMult = speedMult,
		vacancy = vacancy,
		sellBonus = sellBonus,
		cannonBonus = cannonBonus,
		recruitBlock = recruitBlock,
		-- 의사 동료: 열병·괴혈병·사기 하락을 줄이는 비율 (최대 80%)
		seatFor = function(state, id)
			return seatFor(state, id)
		end,
		healReduction = function(state)
			return math.min(0.8, sum(state, "healMult"))
		end,
	}
end
