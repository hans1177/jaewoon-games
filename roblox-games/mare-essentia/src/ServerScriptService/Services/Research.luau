--!nonstrict
-- 증기 연구: 필요한 지식 카드와 선행 기술이 있어야 코인으로 연구한다.

return function(D, S)
	local handlers = {}

	-- 연구할 수 없는 이유를 돌려준다. 가능하면 nil.
	local function blockReason(state, tech)
		if state.tech[tech.id] then
			return "이미 연구했어요"
		end
		for _, cardId in tech.requiresCards do
			if not state.discovered[cardId] then
				return "필요한 지식: " .. D.Cards.ById[cardId].name
			end
		end
		for _, techId in tech.requiresTech do
			if not state.tech[techId] then
				return "먼저 연구: " .. D.Tech.Tech[techId].name
			end
		end
		return nil
	end

	function handlers.Research(state, p)
		local tech = type(p.techId) == "string" and D.Tech.Tech[p.techId]
		if not tech then
			return false, "잘못된 요청"
		end
		local reason = blockReason(state, tech)
		if reason then
			return false, reason
		end
		if state.coins < tech.cost then
			return false, string.format("코인이 부족해요 (필요 %d)", tech.cost)
		end
		state.coins -= tech.cost
		state.tech[tech.id] = true
		local msgs = { string.format("연구 완료: %s (-%d)", tech.name, tech.cost) }
		S.State.gainXp(state, "adventure", 30, msgs)
		return true, table.concat(msgs, "\n")
	end

	return { handlers = handlers, blockReason = blockReason }
end
