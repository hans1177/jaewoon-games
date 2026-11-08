--!nonstrict
-- 이야기 이벤트: 조건을 만족한 항구에서 한 번씩 볼 수 있고, 선택에 따라 보상을 받는다.

return function(D, S)
	local handlers = {}

	-- 지금 볼 수 있는 이벤트인가? 아니면 이유(문자열)를 돌려준다.
	local function blockReason(state, e)
		if state.story[e.id] then
			return "이미 본 이야기"
		end
		if e.nation and e.nation ~= state.nationId then
			return "다른 주인공의 이야기"
		end
		if e.portId ~= state.portId then
			return "다른 항구"
		end
		if e.minFame and state.fame < e.minFame then
			return string.format("명성 %d 필요", e.minFame)
		end
		if e.minYear and S.State.year(state) < e.minYear then
			return string.format("%d년부터", e.minYear)
		end
		for _, r in e.requires or {} do
			local seen = state.story[r.id]
			if not seen or (r.choice and seen ~= r.choice) then
				return "아직 때가 아니에요"
			end
		end
		for _, cardId in e.requiresCards or {} do
			if not state.discovered[cardId] then
				return "필요한 카드가 없어요"
			end
		end
		return nil
	end

	function handlers.PlayStory(state, p)
		local e = type(p.eventId) == "string" and D.Story.ById[p.eventId]
		if not e then
			return false, "잘못된 요청"
		end
		local reason = blockReason(state, e)
		if reason then
			return false, reason
		end
		local choice = type(p.choice) == "number" and e.choices[math.floor(p.choice)]
		if not choice then
			return false, "잘못된 선택이에요"
		end
		if choice.minFame and state.fame < choice.minFame then
			return false, string.format("명성 %d이 필요해요", choice.minFame)
		end
		if choice.cost and state.coins < choice.cost then
			return false, "코인이 부족해요"
		end
		local fx = choice.effect
		local msgs = { choice.result }
		if choice.cost then
			state.coins -= choice.cost
		end
		if fx.coins then
			state.coins = math.max(0, state.coins + fx.coins)
			if fx.coins > 0 then
				table.insert(msgs, string.format("+%d코인", fx.coins))
			end
		end
		if fx.fame then
			state.fame += fx.fame
			table.insert(msgs, string.format("명성 +%d", fx.fame))
		end
		if fx.cardId then
			S.Discovery.grantCard(state, fx.cardId, msgs)
		end
		if fx.affinity then
			S.Perk.addAffinity(state, fx.affinity, msgs)
		end
		state.story[e.id] = math.floor(p.choice)
		return true, table.concat(msgs, "\n")
	end

	return { handlers = handlers, blockReason = blockReason }
end
