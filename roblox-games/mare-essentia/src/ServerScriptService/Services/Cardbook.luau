--!nonstrict
-- 전투 카드 수집책 서비스: 카드 획득(퀘스트·발견·탐험·상자·두목), 강화(동·은·금), 덱 구성
return function(D, S)
	local CB = D.CardBook
	local handlers = {}
	local C = { handlers = handlers }

	-- 상태에 수집책이 없으면 만든다 (처음 쓸 때 문화권 기본 덱을 그대로 가진다)
	function C.get(state)
		if not state.cardbook then
			state.cardbook = CB.new(D.BoardingCards.factionOf(state.nationId))
		end
		local book = state.cardbook
		-- 도감에서 발견한 지식 카드는 곧 전투 카드다. 도감 강화 단계(2·3단계)가 전투 단계가 된다.
		for id in state.discovered or {} do
			local d = D.BoardingCards.Units[id] or D.BoardingCards.Specials[id]
			if d and d.knowledge then
				book.owned[id] = math.max(1, book.owned[id] or 0)
				local lv = state.codexLevel and state.codexLevel[id] or 0
				book.tier[id] = if lv >= 3 then 3 elseif lv >= 2 then 2 else nil
			end
		end
		return book
	end

	-- 보상으로 받은 지식 카드는 도감에도 발견으로 기록된다
	local function markDiscovered(state, id)
		local d = id and (D.BoardingCards.Units[id] or D.BoardingCards.Specials[id])
		if d and d.knowledge and state.discovered then
			state.discovered[id] = true
		end
	end

	-- 지금 쓰는 덱 (클라이언트와 서버가 같은 규칙으로 덱을 만들도록 id 목록과 단계를 돌려준다)
	function C.deckSpec(state)
		local book = C.get(state)
		local faction = D.BoardingCards.factionOf(state.nationId)
		local bonus = CB.knowledgeBonus(state.discovered, D.Cards.ById) -- 학문 카드를 모을수록 병종 카드가 강해진다
		return { ids = CB.deckIds(book, faction), tier = book.tier, faction = faction, bonus = bonus }
	end

	-- 새 카드 보상. 안내 문구를 msgs 에 붙인다.
	function C.reward(state, source, msgs, rng, field)
		local book = C.get(state)
		local r = rng or (state.rng) or math.random
		local id, text = CB.drop(book, source, r, field)
		markDiscovered(state, id)
		if msgs then table.insert(msgs, text) end
		return text
	end

	-- 승리 보상: 카드 3장 중 1장 고르기 (이미 고르지 않은 보상이 있으면 그 보상은 무작위로 받는다)
	function C.offer(state, source, msgs, rng, field, extra)
		local book = C.get(state)
		if book.pick then
			CB.choose(book, 1)
		end
		CB.offer(book, source, rng or math.random, field, extra)
		if msgs then table.insert(msgs, "지식 카드 3장 중 1장을 고를 수 있다") end
	end

	function handlers.CardPick(state, p)
		local i = type(p) == "table" and tonumber(p.index)
		if not i then return false, "잘못된 요청" end
		local book = C.get(state)
		local ok, msg = CB.choose(book, math.floor(i))
		if ok then markDiscovered(state, book.lastGranted) end
		return ok, msg
	end

	-- 연습전(정해진 패, 첫 승리 때만 보상) / 오늘의 해전 퍼즐(하루 한 번 보상)
	function handlers.CardPractice(state, p)
		local actions = type(p) == "table" and p.actions
		if type(actions) ~= "table" or #actions > 20 then return false, "잘못된 요청" end
		if not D.BoardingCards.puzzleReplay(0, actions) then return false, "아직 이기지 못했어요. 다시 도전!" end
		local book = C.get(state)
		if book.practiceDone then return true, "연습전 승리! (보상은 처음 한 번만)" end
		book.practiceDone = true
		local msgs = {}
		C.reward(state, "explore", msgs)
		return true, "연습전 승리! " .. msgs[1]
	end

	function handlers.CardPuzzle(state, p)
		local actions = type(p) == "table" and p.actions
		local day = math.floor(os.time() / 86400)
		if type(actions) ~= "table" or #actions > 20 or type(p.day) ~= "number" or p.day ~= day then return false, "잘못된 요청" end
		local book = C.get(state)
		if book.puzzleDay == day then return false, "오늘 퍼즐은 이미 풀었어요" end
		if not D.BoardingCards.puzzleReplay(day, actions) then return false, "틀렸어요. 다시 생각해 보세요" end
		book.puzzleDay = day
		local msgs = {}
		C.reward(state, "explore", msgs)
		return true, "퍼즐 해결! " .. msgs[1]
	end

	-- 보물상자: 코인 대신 카드 3장 중 1장
	function C.chest(state, msgs)
		C.offer(state, "chest", msgs)
	end

	-- 주점의 용병 모집: 코인을 내면 카드 한 장 (발견·탐험보다 비싸지만 확실하다)
	local TAVERN_PRICE = 180
	function handlers.CardTavern(state, _p, ctx)
		if state.coins < TAVERN_PRICE then return false, "코인이 부족해요" end
		state.coins -= TAVERN_PRICE
		local msgs = {}
		local r = (ctx and ctx.rng) or math.random
		C.reward(state, "explore", msgs, r)
		return true, "주점에서 용병을 모았다. " .. msgs[1]
	end

	function handlers.CardUpgrade(state, p)
		local id = type(p) == "table" and p.id
		if type(id) ~= "string" then return false, "잘못된 요청" end
		local ok, msg, cost = CB.upgrade(C.get(state), id, state.coins)
		if ok then state.coins -= cost end
		return ok, msg
	end

	function handlers.CardSetDeck(state, p)
		local ids = type(p) == "table" and p.ids
		if type(ids) ~= "table" or #ids > 60 then return false, "잘못된 요청" end
		local list = {}
		for _, id in ids do
			if type(id) ~= "string" then return false, "잘못된 요청" end
			table.insert(list, id)
		end
		return CB.setDeck(C.get(state), list)
	end

	function handlers.CardRecommend(state, p)
		local style = type(p) == "table" and p.style
		if style ~= "rush" and style ~= "gun" and style ~= "balance" then return false, "잘못된 요청" end
		local book = C.get(state)
		local ids = CB.recommend(book, style)
		if not ids then return false, "카드가 모자라 추천 덱을 만들 수 없어요" end
		local ok, msg = CB.setDeck(book, ids)
		if not ok then return false, msg end
		return true, string.format("%s을(를) 짰다: %s", CB.RECOMMEND[style].name, CB.RECOMMEND[style].text)
	end

	function handlers.CardSlotSave(state, p)
		if type(p) ~= "table" or type(p.slot) ~= "number" or type(p.ids) ~= "table" or #p.ids > 60 then return false, "잘못된 요청" end
		local list = {}
		for _, id in p.ids do
			if type(id) ~= "string" then return false, "잘못된 요청" end
			table.insert(list, id)
		end
		return CB.saveSlot(C.get(state), math.floor(p.slot), p.name, list)
	end

	function handlers.CardSlotUse(state, p)
		if type(p) ~= "table" or type(p.slot) ~= "number" then return false, "잘못된 요청" end
		return CB.useSlot(C.get(state), math.floor(p.slot))
	end

	function handlers.CardAutoDeck(state)
		C.get(state).deck = nil
		return true, "자동 덱으로 되돌렸다 (가진 카드로 균형 있게 짜요)"
	end

	return C
end
