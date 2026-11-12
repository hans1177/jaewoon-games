--!nonstrict
-- 퀘스트: 수락, 납품, 보상 수령. 납품 외의 진행도는 플레이어 상태에서 계산한다.

return function(D, S)
	local handlers = {}
	local MAX_ACTIVE = 5

	-- 발견·방문·연구처럼 플레이어 상태만으로 진행도가 정해지는 퀘스트는 수락하지 않아도 자동으로 보고된다.
	local AUTO_KINDS = { discover = true, field = true, visit = true, research = true, tactics = true, tactics_biome = true, tactics_rank = true, tactics_goal = true, understand = true, understand_card = true, present = true, expo = true, joint = true, port_tech = true, landmark = true, launch = true, era = true, stock = true, dividend = true, history = true, people = true, people_talk = true, order_patrol = true }

	local function isAuto(quest)
		return AUTO_KINDS[quest.kind] == true
	end

	-- a: 수락 기록(없으면 수락 전이라 0). 자동 보고 퀘스트는 수락 기록 없이도 계산한다.
	local function progressWith(state, quest, a)
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
		elseif quest.kind == "history" then
			local n = 0
			for _ in (state.history and state.history.seen or {}) do
				n += 1
			end
			return n
		elseif quest.kind == "order_patrol" then
			return state.orderPatrols
		elseif quest.kind == "people_talk" then
			return S.People.talkCount(state)
		elseif quest.kind == "people" then
			return if quest.cat then S.People.catCount(state, quest.cat) else S.People.knownCount(state)
		elseif quest.kind == "research" then
			return if state.tech[quest.techId] then 1 else 0
		elseif quest.kind == "understand" or quest.kind == "understand_card" or quest.kind == "present" or quest.kind == "expo" or quest.kind == "joint" or quest.kind == "port_tech" or quest.kind == "landmark" or quest.kind == "launch" or quest.kind == "era" or quest.kind == "stock" or quest.kind == "dividend" then
			-- 지식 트리: 이해한 지식 수 / 특정 지식 / 학회 발표 횟수 / 박람회 출품 횟수
			if quest.kind == "understand_card" then
				return if state.reported and state.reported[quest.cardId] then 1 else 0
			elseif quest.kind == "present" then
				return state.academy and state.academy.presented or 0
			elseif quest.kind == "expo" then
				return state.academy and state.academy.expos or 0
			elseif quest.kind == "joint" then
				return state.academy and state.academy.joint or 0
			elseif quest.kind == "stock" then
				return state.stocks and state.stocks.trades or 0
			elseif quest.kind == "dividend" then
				return state.stocks and state.stocks.divTotal or 0
			elseif quest.kind == "era" then
				return state.academy and state.academy.era or 1
			elseif quest.kind == "launch" then
				return state.academy and state.academy.launched or 0
			elseif quest.kind == "landmark" then
				local n = 0
				for _, t in (state.landmarks or {}) do
					for _ in t do
						n += 1
					end
				end
				return n
			elseif quest.kind == "port_tech" then
				-- 어느 항구든 한 학문의 기술 수준이 가장 높은 값
				local best = 0
				local steps = { 6, 16, 32, 60 }
				for _, t in (state.portTech or {}) do
					for _, pts in t do
						for i, need in steps do
							if pts >= need and i > best then
								best = i
							end
						end
					end
				end
				return best
			end
			local n = 0
			for id in (state.reported or {}) do
				local node = D.KnowledgeTree.ById[id]
				if node and (quest.disc == nil or node.disc == quest.disc) then
					n += 1
				end
			end
			return n
		elseif quest.kind == "tactics" or quest.kind == "tactics_biome" or quest.kind == "tactics_rank" or quest.kind == "tactics_goal" then
			-- 지상 전술 탐험 기록: 깬 지점 수 / 특정 장소 종류 / S 등급 수
			local n = 0
			for _, rec in (state.tactics and state.tactics.cleared or {}) do
				if quest.kind == "tactics" or (quest.kind == "tactics_biome" and rec.biome == quest.biome) or (quest.kind == "tactics_rank" and rec.rank == "S") or (quest.kind == "tactics_goal" and rec.objective == quest.objective) then
					n += 1
				end
			end
			return n
		end
		return 0
	end

	local function progress(state, quest)
		return progressWith(state, quest, state.quests.active[quest.id])
	end

	-- 수락 전이어도 지금 상태로 진행도를 본다 (자동 보고 퀘스트 표시용)
	local function progressAny(state, quest)
		return progressWith(state, quest, state.quests.active[quest.id] or { delivered = 0, baseWins = state.stats.battlesWon })
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
		if quest.after and not state.quests.done[quest.after] then
			return false
		end
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
		if quest.after and not state.quests.done[quest.after] then
			return false, "앞 단계 퀘스트를 먼저 끝내야 해요"
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

	local function storyOf(quest)
		local good = quest.goodId and D.Ports.Goods[quest.goodId]
		local port = quest.portId and D.Ports.Ports[quest.portId]
		return D.Quests.Story(quest, good and good.name, port and port.name)
	end

	local function payout(state, quest, label, msgs)
		state.quests.active[quest.id] = nil
		state.quests.done[quest.id] = true
		state.coins += quest.rewardCoins
		state.fame += quest.rewardFame
		table.insert(msgs, string.format("%s: %s (+%d코인, 명성 +%d)", label, quest.name, quest.rewardCoins, quest.rewardFame))
		local _, ending = storyOf(quest)
		table.insert(msgs, "「" .. quest.name .. "」 " .. ending)
		if quest.rewardCareer then
			S.State.gainXp(state, quest.rewardCareer, quest.rewardXp, msgs)
		end
		if quest.rewardCardId then
			S.Discovery.grantCard(state, quest.rewardCardId, msgs)
		end
		S.Cardbook.reward(state, "quest", msgs)
		-- 어려운 기술 퀘스트(연속 퀘스트·지식 이해)를 해내면 역사가 앞당겨진다
		if quest.after or quest.kind == "understand_card" or quest.kind == "understand" then
			S.Pace.addMsg(state, 5 + math.floor(quest.rewardFame / 10), msgs, "퀘스트 완수")
		end
	end

	function handlers.Claim(state, p)
		local quest = type(p.questId) == "string" and D.Quests.ById[p.questId]
		if not quest or not state.quests.active[quest.id] then
			return false, "진행 중인 퀘스트가 아니에요"
		end
		if progress(state, quest) < quest.amount then
			return false, "아직 조건을 채우지 못했어요"
		end
		local msgs = {}
		payout(state, quest, "퀘스트 완료", msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 수락 여부와 상관없이, 발견·방문·연구 조건을 채운 퀘스트를 자동으로 보고하고 보상을 준다.
	-- 보상 카드가 또 다른 퀘스트 조건을 채울 수 있어 더 나올 때까지 반복한다.
	local function autoReport(state, msgs)
		local reported = 0
		for _ = 1, 8 do
			local again = false
			for _, quest in D.Quests.Quests do
				if (AUTO_KINDS[quest.kind] or state.quests.active[quest.id]) and not state.quests.done[quest.id] and visible(state, quest) then
					local a = state.quests.active[quest.id] or { delivered = 0, baseWins = state.stats.battlesWon }
					if progressWith(state, quest, a) >= quest.amount then
						payout(state, quest, if AUTO_KINDS[quest.kind] then "일지 기록 완료" else "의뢰 완료", msgs)
						reported += 1
						again = true
					end
				end
			end
			if not again then
				break
			end
		end
		return reported
	end

	-- 일지에 새 퀘스트를 자동으로 올린다: 소문을 듣거나 사람을 만나 이야기하면 시작된다 (수락 단계 없음).
	-- personId: 방금 이야기한 동료 id (그 동료의 전용 퀘스트가 먼저 열린다)
	local function offer(state, msgs, how, personId)
		if countActive(state) >= MAX_ACTIVE then
			return nil
		end
		local pick = nil
		for _, quest in D.Quests.Quests do
			if not state.quests.done[quest.id] and not state.quests.active[quest.id] and not AUTO_KINDS[quest.kind] and visible(state, quest)
				and (quest.kind ~= "deliver" or quest.portId == state.portId) then
				if quest.companionId then
					if quest.companionId == personId then
						pick = quest
						break
					end
				elseif not pick then
					pick = quest
				end
			end
		end
		if not pick then
			return nil
		end
		state.quests.active[pick.id] = { delivered = 0, baseWins = state.stats.battlesWon }
		local hook = storyOf(pick)
		table.insert(msgs, string.format("%s — 일지에 새 이야기가 적혔다: 「%s」\n%s\n(%s)", how, pick.name, hook, pick.summary))
		return pick
	end

	-- 항구에 도착하면: 주점 소문이 돌고(가끔), 얽힌 인물이 있으면 이야기가 시작된다.
	local function arrivalHooks(state, msgs)
		if state._hookPort == state.portId then
			return
		end
		local first = state._hookPort == nil
		state._hookPort = state.portId
		if first then
			return
		end
		-- 항구와 날짜로 정해지는 결정적 확률(70%): 같은 도착이면 같은 소문
		local h = 0
		for i = 1, #state.portId do
			h += string.byte(state.portId, i) * i
		end
		if (h + state.day * 7) % 10 < 7 then
			offer(state, msgs, "주점에서 소문을 들었다")
		end
		if S.Story and S.Story.autoTrigger then
			S.Story.autoTrigger(state, msgs)
		end
	end

	-- 항구에 도착하면 받아 둔 납품 퀘스트의 물건을 자동으로 넘긴다. 조건을 채운 퀘스트는 알려 준다.
	local function autoDeliver(state, msgs)
		arrivalHooks(state, msgs)
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
				table.insert(msgs, "일지: 조건을 채웠다 — " .. quest.name)
			end
		end
	end

	return { handlers = handlers, storyOf = storyOf, offer = offer, progress = progress, visible = visible, autoDeliver = autoDeliver, autoReport = autoReport, isAuto = isAuto, progressAny = progressAny }
end
