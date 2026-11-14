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

	-- 해전 카드 지원: 해전은 카드를 직접 내지 않는다. 내 덱 구성에 따라 효과가 자동으로 붙는다.
	--   근접 카드 → 접현·백병전(meleeMult) / 포 카드 → 포격(cannonMult) / 사격 카드 → 둘 다 조금
	--   항해·천문·기상 카드 → 속도 / 건축·조선 카드 → 침수 방어(펌프) / 의학 카드 → 전투 뒤 선원 회복
	function C.navalSupport(state): any
		local spec = C.deckSpec(state)
		local sums = { melee = 0, ranged = 0, cannon = 0 }
		local n = {}
		local byRow, byField = { melee = {}, ranged = {}, cannon = {} }, {}
		for _, id in spec.ids do
			local d = D.BoardingCards.Units[id] or D.BoardingCards.Specials[id]
			if d and not d.special and d.row then
				local pw = (d.power or 0) + ((spec.tier[id] or 1) - 1)
				sums[d.row] += pw
				table.insert(byRow[d.row], { name = d.name, pw = pw })
			end
			if d and d.field then
				n[d.field] = (n[d.field] or 0) + 1
				byField[d.field] = byField[d.field] or {}
				table.insert(byField[d.field], { name = d.name, pw = d.power or 0 })
			end
		end
		-- 해전 화면에 보여 줄 대표 카드 이름 (위력이 높은 순 최대 2장)
		local function top(list: any, extra: any?): { string }
			local all = {}
			for _, e in list or {} do table.insert(all, e) end
			for _, e in extra or {} do table.insert(all, e) end
			table.sort(all, function(a, b) if a.pw ~= b.pw then return a.pw > b.pw end return a.name < b.name end)
			local out = {}
			for i = 1, math.min(2, #all) do table.insert(out, all[i].name) end
			return out
		end
		local sup = {
			meleeMult = math.min(0.12, sums.melee * 0.003 + sums.ranged * 0.0015),
			cannonMult = math.min(0.12, sums.cannon * 0.003 + sums.ranged * 0.0015),
			speed = math.min(2, math.floor(((n.Navigation or 0) + (n.Astronomy or 0) + (n.Weather or 0)) / 4)),
			pump = math.min(0.15, 0.025 * math.floor(((n.Architecture or 0) + (n.Shipbuilding or 0)) / 2)),
			medic = math.min(0.5, 0.05 * (n.Medicine or 0)),
			lines = {},
		}
		local L = sup.lines
		sup.entries = {}
		local function add(kind: string, line: string, short: string, cards: { string })
			table.insert(L, line)
			table.insert(sup.entries, { kind = kind, text = short, cards = cards })
		end
		if sup.meleeMult > 0 then add("melee", string.format("접현 +%d%% (근접·사격 카드)", math.floor(sup.meleeMult * 100 + 0.5)), string.format("접현 +%d%%", math.floor(sup.meleeMult * 100 + 0.5)), top(byRow.melee, byRow.ranged)) end
		if sup.cannonMult > 0 then add("cannon", string.format("포격 +%d%% (포·사격 카드)", math.floor(sup.cannonMult * 100 + 0.5)), string.format("포격 +%d%%", math.floor(sup.cannonMult * 100 + 0.5)), top(byRow.cannon, byRow.ranged)) end
		if sup.speed > 0 then add("speed", string.format("속도 +%d (항해·천문·기상 카드)", sup.speed), string.format("속도 +%d", sup.speed), top(byField.Navigation, byField.Astronomy)) end
		if sup.pump > 0 then add("pump", string.format("침수 방어 +%d%% (건축·조선 카드)", math.floor(sup.pump * 100 + 0.5)), string.format("침수 방어 +%d%%", math.floor(sup.pump * 100 + 0.5)), top(byField.Architecture, byField.Shipbuilding)) end
		if sup.medic > 0 then add("medic", string.format("전투 뒤 선원 회복 %d%% (의학 카드)", math.floor(sup.medic * 100 + 0.5)), string.format("선원 회복 %d%%", math.floor(sup.medic * 100 + 0.5)), top(byField.Medicine)) end
		return sup
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

	-- 주점 카드 대결: 내 덱 vs 상대 덱. 시드는 서버가 정하고, 승패는 행동 기록을 서버가 다시 돌려 확인한다.
	-- 하루 3승까지 카드 보상, 그 뒤엔 코인 조금.
	local DUEL_CARD_WINS = 3
	function handlers.CardDuelStart(state, _p, ctx)
		local book = C.get(state)
		book.duelSeed = math.floor(((ctx and ctx.rng) or math.random)() * 1000000) + 1
		return true, ""
	end

	function handlers.CardDuelEnd(state, p)
		local book = C.get(state)
		local seed = book.duelSeed
		local actions = type(p) == "table" and p.actions
		if not seed or type(actions) ~= "table" or #actions > 200 then return false, "진행 중인 카드 대결이 없어요" end
		book.duelSeed = nil
		local B = D.BoardingCards
		local r = B.replay("boarding", seed, { deckCards = S.Battle.deckCache[state], faction = S.Battle.deckFaction[state], book = C.deckSpec(state) }, {}, actions)
		if not r then return false, "카드 기록이 규칙에 맞지 않아요" end
		if r.winner ~= "me" then
			return false, if r.winner == "foe" then "졌어요. 덱을 고쳐서 다시 도전!" else "비겼어요"
		end
		local day = math.floor(os.time() / 86400)
		if book.duelDay ~= day then
			book.duelDay, book.duelWins = day, 0
		end
		book.duelWins += 1
		local msgs = {}
		if book.duelWins <= DUEL_CARD_WINS then
			C.reward(state, "explore", msgs)
			return true, string.format("카드 대결 승리! (오늘 %d/%d) %s", book.duelWins, DUEL_CARD_WINS, msgs[1])
		end
		state.coins += 30
		return true, "카드 대결 승리! 오늘 카드 보상은 끝났어요 (+30코인)"
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
