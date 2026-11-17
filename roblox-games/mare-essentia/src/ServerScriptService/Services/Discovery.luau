--!nonstrict
-- Discovery.luau · 원본 발견 서비스: 방문/연구/탐험 경로와 등급·시대 검증
-- 탐험과 학자 방문: 도감 카드를 발견하면 코인, 명성, 모험 경험치를 받는다.

return function(D, S)
	local handlers = {}
	-- [탐험 숙련] 각 게임 상태별로 진행 중인 한 번의 탐험만 임시로 추적한다.
	local fieldRuns = setmetatable({}, { __mode = "k" })

	local RARITY_XP = { Common = 15, Uncommon = 25, Rare = 45, Epic = 80, Legendary = 150 }

	-- [1/3 희귀도] 기존 발견 확률·도감 보상은 바꾸지 않는다.
	-- 등급마다 획득 경로를 보여 주되, 추가 선행 조건은 카드 데이터에 명시된 연구 체인에서만 적용한다.
	local RARITY_PATH = {
		Common = "현장 관찰·채집",
		Uncommon = "표본 비교·기록 대조",
		Rare = "연구 단서·의학적 검증",
		Epic = "학술 연구·연속 의뢰",
		Legendary = "특수 탐험·지역 대장정",
	}
	-- [실제 획득 경로] 카드 희귀도와는 독립. 기존 탐험 풀/학자/퀘스트 데이터를 색인해 경로가 실제와 일치한다.
	local siteCards, scholarCards, questCards = {}, {}, {}
	for _, site in D.Sites.Sites do
		for _, id in site.pool do siteCards[id] = true end
	end
	for _, scholar in D.Scholars.Scholars do scholarCards[scholar.cardId] = true end
	for _, quest in D.Quests.Quests do
		if quest.rewardCardId then questCards[quest.rewardCardId] = true end
	end
	local function methodOf(card)
		-- [무형 지식] 방문해 얻는 첫 관찰과, 방문 장소에서 진행하는 후속 연구를 구분한다.
		if card.research then return "research" end
		if card.visitPort then return "discover" end
		if siteCards[card.id] then return "explore" end
		if scholarCards[card.id] then return "research" end
		if questCards[card.id] then return "research" end
		if card.field == "Physics" or card.field == "Chemistry" or card.field == "Medicine" or card.field == "Philosophy" or card.field == "Shipbuilding" then return "research" end
		return "discover"
	end
	local METHODS = { discover = "발견", research = "연구", explore = "탐험" }
	local function pathOf(card)
		local method = methodOf(card)
		local step = card.source
		return (METHODS[method] or "발견") .. " · " .. step
	end
	local function rarityGuide(card)
		return RARITY_PATH[card.rarity] or "현장 조사"
	end

	-- [2/3 연계 연구] 기존 도감·연구·동료·퀘스트 저장만 읽는다.
	local function cardBlockReason(state, card)
		if not card then return "존재하지 않는 카드예요" end
		local year = S.State.year(state)
		if card.fromYear and year < card.fromYear then
			return string.format("%d년 이후 연구할 수 있는 지식이에요", card.fromYear)
		end
		local research = card.research
		if not research then return nil end
		for _, needId in research.found or {} do
			if not state.discovered[needId] then
				return (card.meta and card.meta.kind and (card.meta.kind == "language" or card.meta.kind == "religion" or card.meta.kind == "politics" or card.meta.kind == "law" or card.meta.kind == "custom") and "먼저 지식 발견: " or "먼저 표본 조사: ") .. (D.Cards.ById[needId] and D.Cards.ById[needId].name or needId)
			end
		end
		-- 문헌 해독·종교 비교·법학/정치사상 등은 앞 단계의 발견만으로 해금되지 않는다.
		-- 이미 존재하는 학자 보고 상태를 확인하므로 저장키나 별도 연구 화폐를 추가하지 않는다.
		for _, needId in research.reported or {} do
			if not (state.reported and state.reported[needId]) then
				return "먼저 학자에게 보고: " .. (D.Cards.ById[needId] and D.Cards.ById[needId].name or needId)
			end
		end
		if research.quest and not (state.quests and state.quests.done and state.quests.done[research.quest]) then
			local quest = D.Quests.ById[research.quest]
			return "먼저 연구 일지 완료: " .. (quest and quest.name or research.quest)
		end
		if research.assistDisc then
			local help = S.Perk.researchAssist(state, research.assistDisc)
			if help <= 0 and not (research.allowReported and state.reported and state.reported[research.allowReported]) then
				return "연구 조수 동행 또는 선행 지식 보고가 필요해요"
			end
		end
		return nil
	end

	-- [3/3 시대] 시작 연도·모험 레벨·카드 선행 조건을 같은 실제 탐험 입구에서 검사한다.
	local function siteBlockReason(state, site)
		if site.fromYear and S.State.year(state) < site.fromYear then
			return string.format("%d년부터 열리는 연구 장소예요", site.fromYear)
		end
		if state.careers.adventure.level < site.minLevel then
			return string.format("모험 Lv.%d 이상이 필요해요", site.minLevel)
		end
		local pending, firstBlock = 0, nil
		for _, cardId in site.pool do
			if not state.discovered[cardId] then
				pending += 1
				local why = cardBlockReason(state, D.Cards.ById[cardId])
				if not why then return nil end
				firstBlock = firstBlock or why
			end
		end
		return if pending == 0 then "이곳은 이미 모두 조사했어요" else firstBlock
	end


	-- 카드 발견 처리. 새로 발견했으면 true.
	local function grantCard(state, cardId, msgs)
		local card = D.Cards.ById[cardId]
		if not card or state.discovered[cardId] then
			return false
		end
		state.discovered[cardId] = true
		if D.WonderScenes.Scenes[cardId] then
			state.pendingScene = cardId -- 원더 연출 (저장하지 않는 임시 값)
		end
		local coins = math.floor(card.reward.coins * S.Perk.coinMult(state, card.field))
		state.coins += coins
		state.fame += card.reward.fame
		table.insert(msgs, string.format("도감 등록: %s [%s] (+%d코인, 명성 +%d)", card.name, card.rarity, coins, card.reward.fame))
		table.insert(msgs, "발견 과정: " .. pathOf(card))
		S.State.gainXp(state, "adventure", RARITY_XP[card.rarity] or 15, msgs)
		-- 전문 분야 선택은 자유 선택. 카드 발견은 교역·모험·전투 성장과 무관하게 누적된다.
		S.Perk.gainSpec(state, card.field, RARITY_XP[card.rarity] or 15, msgs)
		S.Perk.addAffinity(state, 1, msgs)
		local DROP = { Common = 0.15, Uncommon = 0.25, Rare = 0.4, Epic = 0.6, Legendary = 1 }
		if math.random() < (DROP[card.rarity] or 0.15) then
			S.Cardbook.reward(state, "discover", msgs, math.random, card.field)
		end
		return true
	end

	-- [발견] 항구 도착만으로 관찰할 수 있는 신규 지형·건축물. 기존 카드 발견 경로는 건드리지 않는다.
	local visitCards = {}
	for _, card in D.Cards.Cards do
		-- [항구 방문/학술 연구 분리] 선행 보고가 필요한 문헌·비교 연구는
		-- 방문 시 자동 획득하지 않고 기존 StudyKnowledgeCard 액션으로만 등록한다.
		if card.visitPort and not (card.research and card.research.reported) then
			visitCards[card.visitPort] = visitCards[card.visitPort] or {}
			table.insert(visitCards[card.visitPort], card.id)
		end
	end
	local function grantVisitCards(state, portId, msgs)
		local gained = 0
		for _, id in visitCards[portId] or {} do
			if not state.discovered[id] and not cardBlockReason(state, D.Cards.ById[id]) then
				if grantCard(state, id, msgs) then gained += 1 end
			end
		end
		return gained
	end

	local function findSite(siteId)
		for _, site in D.Sites.Sites do
			if site.id == siteId then
				return site
			end
		end
		return nil
	end

	-- [탐험 시작] 기존 서버 검증 조건과 동일한 탐험지만 숙련 기록을 시작한다.
	function handlers.FieldPracticeBegin(state, p)
		local site = type(p.siteId) == "string" and findSite(p.siteId)
		if not site or site.portId ~= state.portId then return false, "잘못된 탐험지예요" end
		local blocked = siteBlockReason(state, site)
		if blocked then return false, blocked end
		fieldRuns[state] = { siteId = site.id, started = os.clock() }
		return true, ""
	end

	-- [귀환 숙련] 탐험 타격은 클라이언트 전용이므로 서버에서 명중을 직접 입증할 수 없다.
	-- 유효 무기·정수·탐험 경과시간·중복 정산 상한을 강제하고 기존 피해/보상 판정엔 연결하지 않는다.
	function handlers.FieldPracticeCommit(state, p)
		local run = fieldRuns[state]
		fieldRuns[state] = nil -- 중복 정산·재전송 차단
		if not run or type(p.siteId) ~= "string" or p.siteId ~= run.siteId
			or type(p.hits) ~= "table" then return false, "숙련 정산 요청이 올바르지 않아요" end
		local limit = math.min(120, math.floor(math.max(0, os.clock() - run.started) / 0.2) + 1)
		local total, count = 0, 0
		for id, earned in p.hits do
			count += 1
			if count > #D.Weapons.List + #D.Weapons.Regional
				or type(id) ~= "string" or #id > 40 or D.Weapons.get(id).id ~= id
				or type(earned) ~= "number" or earned ~= earned or earned < 1
				or earned > limit or earned ~= math.floor(earned) then
				return false, "무기 숙련 경험치가 유효하지 않아요"
			end
			total += earned
			if total > limit then return false, "탐험 숙련 상한을 초과했어요" end
		end
		-- [기록] 전투는 클라이언트 시각 전용이다. 서버는 탐험 경과시간·수치 상한만 검증한다.
		-- 보상/레벨/경쟁 순위에 연결하지 않으며, 전투 타격의 서버 입증을 주장하지 않는다.
		local record = p.record
		local elapsed = math.max(0, os.clock() - run.started)
		local recordLimit = math.min(500, math.floor(elapsed / 0.15) + 1)
		if record ~= nil and (type(record) ~= "number" or record ~= record or record < 0
			or record ~= math.floor(record) or record > recordLimit) then
			return false, "탐험 연타 기록이 유효하지 않아요"
		end
		for id, earned in p.hits do
			state.weaponPractice[id] = math.min(10000, (state.weaponPractice[id] or 0) + earned)
		end
		if record and record > (state.stats.fieldStreakBest or 0) then
			state.stats.fieldStreakBest = record
		end
		return true, ""
	end

	function handlers.Explore(state, p, ctx)
		local site = type(p.siteId) == "string" and findSite(p.siteId)
		if not site then
			return false, "잘못된 요청"
		end
		if site.portId ~= state.portId then
			return false, "이 항구의 탐험 지점이 아니에요"
		end
		local lv = state.careers.adventure.level
		local blocked = siteBlockReason(state, site)
		if blocked then return false, blocked end

		local remaining = {}
		for _, cardId in site.pool do
			if not state.discovered[cardId] and not cardBlockReason(state, D.Cards.ById[cardId]) then
				table.insert(remaining, cardId)
			end
		end

		local need = D.Voyage.suppliesPerDay(S.State.totalCrew(state)) * site.days
		if state.ship.supplies < need then
			return false, string.format("보급품이 부족해요 (필요 %d)", need)
		end
		state.ship.supplies -= need
		S.State.advanceDays(state, site.days)
		state.stats.explored += 1

		local msgs = { string.format("%s 탐험 (%d일)", site.name, site.days) }
		if ctx.rng() < 0.45 then
			S.Cardbook.reward(state, "explore", msgs, ctx.rng)
		end
		-- [탐험 실측 연동] 후보는 기존 RNG 그대로 한 번 뽑는다(희귀도·학문별 드롭 비율 보존).
		-- 현장 관찰 카드가 같은 학문/희귀도이고 현 탐험지의 합법적 미발견 보상일 때만 동일 등급 내 대체한다.
		-- 클라이언트가 다른 항구/시대/미획득 권한 카드를 임의로 요구해도 보상할 수 없다.
		local cardId = remaining[1 + math.floor(ctx.rng() * #remaining) % #remaining]
		local observedId = if type(p.observedCardId) == "string" and #p.observedCardId <= 80 then p.observedCardId else nil
		if observedId and table.find(remaining, observedId) then
			local baseCard, observedCard = D.Cards.ById[cardId], D.Cards.ById[observedId]
			if baseCard and observedCard and baseCard.field == observedCard.field and baseCard.rarity == observedCard.rarity then
				cardId = observedId
			end
		end
		local field = D.Cards.ById[cardId].field
		local chance = math.min(0.95, 0.55 + D.Careers.discoverBonus(lv) + S.Perk.discoverBonus(state, field))
		if ctx.rng() < chance then
			grantCard(state, cardId, msgs)
		else
			table.insert(msgs, "이번에는 아무것도 찾지 못했다")
			S.State.gainXp(state, "adventure", 5, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	-- [무형·학술 백과] 학자 보고 후 문헌 해독·비교 연구를 실제 선택으로 진행한다.
	-- 기존 grantCard·저장 상태·보상 체계를 재사용하고, 항구/시대/선행 지식을 서버에서 다시 확인한다.
	function handlers.StudyKnowledgeCard(state, p)
		local cardId = type(p) == "table" and type(p.cardId) == "string" and p.cardId
		local selected = cardId and D.Cards.ById[cardId]
		if not selected or not selected.visitPort or not selected.research or not selected.research.reported then
			return false, "연구할 수 없는 지식이에요"
		end
		if selected.visitPort ~= state.portId then
			return false, "이 항구에서는 해당 문헌을 연구할 수 없어요"
		end
		if state.discovered[selected.id] then
			return false, "이미 연구해 도감에 등록했어요"
		end
		local blocked = cardBlockReason(state, selected)
		if blocked then return false, blocked end
		local msgs = { selected.name .. " 연구를 완료했다." }
		if not grantCard(state, selected.id, msgs) then
			return false, "이미 등록된 지식이에요"
		end
		return true, table.concat(msgs, "\n")
	end

	function handlers.Visit(state, p)
		local scholar
		for _, s in D.Scholars.Scholars do
			if s.id == p.scholarId then
				scholar = s
			end
		end
		if not scholar then
			return false, "잘못된 요청"
		end
		if scholar.portId ~= state.portId then
			return false, "이 항구에 있지 않아요"
		end
		local year = S.State.year(state)
		if year < scholar.fromYear or year > scholar.toYear then
			return false, string.format("지금(%d년)은 만날 수 없어요", year)
		end
		if state.scholarsMet[scholar.id] then
			return false, "이미 지식을 전수받았어요"
		end
		if state.fame < scholar.minFame then
			return false, string.format("명성 %d 이상이 필요해요", scholar.minFame)
		end
		state.scholarsMet[scholar.id] = true
		local msgs = { string.format("%s: \"%s\"", scholar.name, scholar.line) }
		grantCard(state, scholar.cardId, msgs)
		return true, table.concat(msgs, "\n")
	end

	return { handlers = handlers, grantCard = grantCard, grantVisitCards = grantVisitCards, methodOf = methodOf, pathOf = pathOf, rarityGuide = rarityGuide, cardBlockReason = cardBlockReason, siteBlockReason = siteBlockReason }
end
