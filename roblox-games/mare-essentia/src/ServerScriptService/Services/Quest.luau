--!nonstrict
-- 퀘스트: 수락, 납품, 보상 수령. 납품 외의 진행도는 플레이어 상태에서 계산한다.

return function(D, S)
	local handlers = {}
	local MAX_ACTIVE = 5

	local function progress(state, quest)
		local a = state.quests.active[quest.id]
		if not a then
			return 0
		end
		if quest.kind == "deliver" then
			return a.delivered
		elseif quest.kind == "discover" then
			return S.State.countDiscovered(state)
		elseif quest.kind == "win" then
			return state.stats.battlesWon - a.baseWins
		elseif quest.kind == "visit" then
			return S.State.countVisited(state)
		elseif quest.kind == "field" then
			local n = 0
			for cardId in state.discovered do
				local c = D.Cards.ById[cardId]
				if c and c.field == quest.fieldId then
					n += 1
				end
			end
			return n
		elseif quest.kind == "research" then
			return if state.tech[quest.techId] then 1 else 0
		end
		return 0
	end

	local function countActive(state)
		local n = 0
		for _ in state.quests.active do
			n += 1
		end
		return n
	end

	-- 동료 전용 퀘스트는 호감도가 모자라면 아직 보이지 않는다
	local function visible(state, quest)
		if quest.companionId then
			return (state.affinity[quest.companionId] or 0) >= (quest.minAffinity or 0)
		end
		return true
	end

	function handlers.Accept(state, p)
		local quest = type(p.questId) == "string" and D.Quests.ById[p.questId]
		if not quest then
			return false, "잘못된 요청"
		end
		if state.quests.done[quest.id] then
			return false, "이미 완료한 퀘스트예요"
		end
		if not visible(state, quest) then
			return false, "동료와 더 가까워져야 해요"
		end
		if state.quests.active[quest.id] then
			return false, "이미 진행 중이에요"
		end
		if countActive(state) >= MAX_ACTIVE then
			return false, string.format("동시에 %d개까지만 받을 수 있어요", MAX_ACTIVE)
		end
		state.quests.active[quest.id] = { delivered = 0, baseWins = state.stats.battlesWon }
		return true, "퀘스트 수락: " .. quest.name
	end

	function handlers.TurnIn(state, p)
		local quest = type(p.questId) == "string" and D.Quests.ById[p.questId]
		local a = quest and state.quests.active[quest.id]
		if not quest or not a or quest.kind ~= "deliver" then
			return false, "납품할 수 있는 퀘스트가 아니에요"
		end
		if state.portId ~= quest.portId then
			return false, "납품 장소: " .. D.Ports.Ports[quest.portId].name
		end
		local amount = math.min(quest.amount - a.delivered, state.cargo[quest.goodId] or 0)
		if amount <= 0 then
			return false, "납품할 물건이 없어요"
		end
		S.State.removeCargo(state, quest.goodId, amount)
		a.delivered += amount
		return true, string.format("%s %d개 납품 (%d/%d)", D.Ports.Goods[quest.goodId].name, amount, a.delivered, quest.amount)
	end

	function handlers.Claim(state, p)
		local quest = type(p.questId) == "string" and D.Quests.ById[p.questId]
		if not quest or not state.quests.active[quest.id] then
			return false, "진행 중인 퀘스트가 아니에요"
		end
		if progress(state, quest) < quest.amount then
			return false, "아직 조건을 채우지 못했어요"
		end
		state.quests.active[quest.id] = nil
		state.quests.done[quest.id] = true
		state.coins += quest.rewardCoins
		state.fame += quest.rewardFame
		local msgs = { string.format("퀘스트 완료: %s (+%d코인, 명성 +%d)", quest.name, quest.rewardCoins, quest.rewardFame) }
		if quest.rewardCareer then
			S.State.gainXp(state, quest.rewardCareer, quest.rewardXp, msgs)
		end
		if quest.rewardCardId then
			S.Discovery.grantCard(state, quest.rewardCardId, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	-- 항구에 도착하면 받아 둔 납품 퀘스트의 물건을 자동으로 넘긴다. 조건을 채운 퀘스트는 알려 준다.
	local function autoDeliver(state, msgs)
		for _, quest in D.Quests.Quests do
			local a = state.quests.active[quest.id]
			if a and quest.kind == "deliver" and quest.portId == state.portId and a.delivered < quest.amount then
				local amount = math.min(quest.amount - a.delivered, state.cargo[quest.goodId] or 0)
				if amount > 0 then
					S.State.removeCargo(state, quest.goodId, amount)
					a.delivered += amount
					table.insert(msgs, string.format("퀘스트 납품: %s %d개 (%d/%d)", D.Ports.Goods[quest.goodId].name, amount, a.delivered, quest.amount))
				end
			end
		end
		for _, quest in D.Quests.Quests do
			local a = state.quests.active[quest.id]
			if a and not a.notified and progress(state, quest) >= quest.amount then
				a.notified = true
				table.insert(msgs, "퀘스트 조건 달성! 퀘스트 탭에서 보상을 받으세요: " .. quest.name)
			end
		end
	end

	return { handlers = handlers, progress = progress, visible = visible, autoDeliver = autoDeliver }
end
