--!nonstrict
-- 전문 분야와 동료 효과를 한 곳에서 합산한다. 다른 서비스는 여기서만 보너스를 읽는다.

return function(D, S)
	local handlers = {}
	local Sp = D.Specialties

	local function activePerks(state)
		local list = {}
		if state.specialty and Sp.SpecialtyById[state.specialty] then
			table.insert(list, Sp.SpecialtyById[state.specialty].perk)
		end
		for _, id in state.companions do
			local c = Sp.CompanionById[id]
			if c then
				table.insert(list, c.perk)
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
		if not state.scholarsMet[c.scholarId] then
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

	function handlers.Dismiss(state, p)
		local idx = type(p.companionId) == "string" and table.find(state.companions, p.companionId)
		if not idx then
			return false, "함께하고 있지 않아요"
		end
		table.remove(state.companions, idx)
		return true, "동료와 헤어졌다. 다시 영입할 수 있다"
	end

	return {
		handlers = handlers,
		discoverBonus = discoverBonus,
		coinMult = coinMult,
		speedMult = speedMult,
		sellBonus = sellBonus,
		cannonBonus = cannonBonus,
		recruitBlock = recruitBlock,
	}
end
