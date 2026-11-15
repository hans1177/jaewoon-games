--!nonstrict
-- 세계 연대기: 실제 역사 사건이 일어난 해, 그 항구에 도착하면 학자가 불러 세운다 ("역사의 현장").
-- 현장을 목격하면 관찰 노트가 쌓이고, 노트로 논문 초안을 쓰고, 학회에서 발표한 뒤 출판한다.
-- 단계: 관찰 노트 → 논문 초안 → 학회 발표(Knowledge.Present) → 출판. 모험 직업 경험치와 이어진다.

return function(D, S)
	local C = D.WorldChronicle
	local A = { handlers = {} }

	local WINDOW_YEARS = 8 -- 사건이 일어난 해부터 이만큼 지나도 그 항구에서 목격담을 들을 수 있다
	local NOTES_PER_DRAFT, DRAFT_COST = 3, 100

	local generated = if C and D.People and D.People.Curated then C.fromPeople(D.People.Curated, D.Ports.Ports) else {}
	local genById = {}
	for _, r in generated do
		genById[r.id] = r
	end
	local function rowOf(id)
		return (C and C.ById[id]) or genById[id]
	end

	local ART = { sci = "observatory", nature = "storm", war = "harbor", politics = "palace", trade = "market", faith = "library" }

	local function chron(state)
		state.chron = state.chron or { seen = {}, notes = 0, drafts = 0, papers = {}, notesBy = {}, draftDiscs = {} }
		local c = state.chron
		c.seen = c.seen or {}
		c.notes = c.notes or 0
		c.drafts = c.drafts or 0
		c.papers = c.papers or {}
		c.notesBy = c.notesBy or {}
		c.draftDiscs = c.draftDiscs or {}
		return c
	end

	-- 이 항구에서 지금 목격할 수 있는 사건 하나 (가장 이른 해부터)
	local function pick(state)
		if not C then
			return nil
		end
		local c = chron(state)
		local year = S.State.year(state)
		local best
		for _, row in C.Rows do
			if not c.seen[row.id] and row.year >= state.startYear and year >= row.year and year <= row.year + WINDOW_YEARS and table.find(row.ports, state.portId) then
				if not best or row.year < best.year then
					best = row
				end
			end
		end
		if best then
			return best
		end
		-- 직접 쓴 사건이 없으면, 실존 인물의 현장 장면 (항구·날짜로 정해지는 결정적 확률 50%)
		local h = 0
		for i = 1, #state.portId do
			h += string.byte(state.portId, i) * i
		end
		if (h + state.day * 3) % 2 == 0 then
			for _, row in generated do
				if not c.seen[row.id] and year >= row.year and year <= row.untilYear and table.find(row.ports, state.portId) then
					return row
				end
			end
		end
		return nil
	end

	-- 항구에 도착했을 때: 사건이 있으면 장면을 예약하고 보상을 준다 (한 번에 하나)
	function A.arrive(state, msgs)
		local row = pick(state)
		if not row then
			return nil
		end
		local c = chron(state)
		c.seen[row.id] = state.day
		local g = if row.generated then C.GeneratedGain else (C.KindGain[row.kind] or C.KindGain.politics)
		c.notes += g.note
		local disc = row.disc or "history"
		c.notesBy[disc] = (c.notesBy[disc] or 0) + g.note
		state.fame += g.fame
		state.coins += g.coins
		S.State.gainXp(state, "adventure", 30, msgs)
		local port = D.Ports.Ports[state.portId]
		local dname = D.KnowledgeTree.DisciplineById[disc] and D.KnowledgeTree.DisciplineById[disc].name or disc
		local summary = string.format("%s 관찰 노트 +%d · 명성 +%d · %d코인", dname, g.note, g.fame, g.coins)
		table.insert(msgs, string.format("역사의 현장 「%s」 — %s", row.title, summary))
		state._scenes = state._scenes or {}
		table.insert(state._scenes, {
			kind = "chronicle", name = row.title, npc = row.scholar, art = ART[row.kind] or "library",
			lines = C.lines(if row.generated then { year = S.State.year(state), month = 1, voice = row.voice, fact = row.fact, scholar = row.scholar } else row, port and port.name),
			summary = summary, year = if row.generated then S.State.year(state) else row.year,
		})
		return row
	end

	local function understoodIn(state, disc)
		local n = 0
		for _, node in D.KnowledgeTree.Nodes do
			if node.disc == disc and D.KnowledgeTree.understood(state, node.id) then
				n += 1
			end
		end
		return n
	end

	-- 초안을 쓸 수 있는 학문: 그 학문의 관찰 노트가 충분하고, 그 학문의 지식을 하나 이상 이해했을 때. 노트가 가장 많은 학문부터.
	local function writable(state)
		local c = chron(state)
		local best, bestN
		for disc, n in c.notesBy do
			if n >= NOTES_PER_DRAFT and understoodIn(state, disc) >= 1 and (not bestN or n > bestN) then
				best, bestN = disc, n
			end
		end
		return best
	end

	local function discName(disc)
		local d = D.KnowledgeTree.DisciplineById[disc]
		return d and d.name or tostring(disc)
	end

	function A.handlers.WriteDraft(state)
		local c = chron(state)
		local disc = writable(state)
		if not disc then
			return false, string.format("같은 학문의 관찰 노트 %d개와, 그 학문의 이해한 지식 1개가 필요해요", NOTES_PER_DRAFT)
		end
		if state.coins < DRAFT_COST then
			return false, string.format("종이와 필사 비용 %d코인이 필요해요", DRAFT_COST)
		end
		state.coins -= DRAFT_COST
		c.notesBy[disc] -= NOTES_PER_DRAFT
		c.notes = math.max(0, c.notes - NOTES_PER_DRAFT)
		c.drafts += 1
		table.insert(c.draftDiscs, disc)
		local msgs = { string.format("%s 관찰 노트를 엮어 논문 초안을 썼다. 이제 학회에서 발표해 보자.", discName(disc)) }
		S.State.gainXp(state, "adventure", 40, msgs)
		return true, table.concat(msgs, "\n")
	end

	local function lastSeenTitle(c)
		local bestRow, bestDay
		for id, day in c.seen do
			local row = rowOf(id)
			if row and (not bestDay or day > bestDay) then
				bestRow, bestDay = row, day
			end
		end
		return bestRow and bestRow.title or "항해 관찰"
	end

	function A.handlers.PublishPaper(state)
		local c = chron(state)
		if c.drafts < 1 then
			return false, "논문 초안이 없어요"
		end
		local presented = (state.academy and state.academy.presented) or 0
		if presented <= #c.papers then
			return false, "먼저 학회에서 연구를 발표해야 출판할 수 있어요 (서재의 학회 발표)"
		end
		c.drafts -= 1
		local pdisc = table.remove(c.draftDiscs, 1)
		local title = string.format("[%s] 「%s」에 대한 현장 보고", discName(pdisc or "history"), lastSeenTitle(c))
		table.insert(c.papers, title)
		while #c.papers > 30 do
			table.remove(c.papers, 1)
		end
		local n = #c.papers
		local fame, coins = 12 + 3 * math.min(n, 10), 250 + 50 * math.min(n, 10)
		state.fame += fame
		state.coins += coins
		local msgs = { string.format("%s 이(가) 출판되었다! 명성 +%d, 인세 %d코인", title, fame, coins) }
		S.State.gainXp(state, "adventure", 120, msgs)
		S.Pace.addMsg(state, 4, msgs, "논문 출판")
		return true, table.concat(msgs, "\n")
	end

	-- 화면에 보낼 요약: 단계별 진행과 다음에 할 일
	-- 퀘스트 진행도: 목격한 사건 수(학문 지정 가능) / 쓴 논문 초안 수 / 출판한 논문 수
	function A.count(state, what, disc)
		local c = state.chron
		if not c then return 0 end
		if what == "draft" then return (c.drafts or 0) + #(c.papers or {}) end
		if what == "paper" then return #(c.papers or {}) end
		local n = 0
		for id in (c.seen or {}) do
			local row = rowOf(id)
			if row and (disc == nil or (row.disc or "history") == disc) then n += 1 end
		end
		return n
	end

	function A.view(state)
		local c = chron(state)
		local presented = (state.academy and state.academy.presented) or 0
		local stage, nextText
		local topN, topDisc = 0, nil
		for disc, n in c.notesBy do
			if n > topN then
				topN, topDisc = n, disc
			end
		end
		topN = math.min(topN, NOTES_PER_DRAFT)
		if c.drafts > 0 and presented > #c.papers then
			stage, nextText = 4, "출판할 수 있어요"
		elseif c.drafts > 0 then
			stage, nextText = 3, "학회에서 연구를 발표하세요"
		elseif writable(state) then
			stage, nextText = 2, discName(writable(state)) .. " 논문 초안을 쓸 수 있어요"
		else
			stage, nextText = 1, string.format("같은 학문의 관찰 노트를 모으세요 (%d/%d)", topN, NOTES_PER_DRAFT)
		end
		local seenList = {}
		for id, day in c.seen do
			local row = rowOf(id)
			if row then
				table.insert(seenList, { disc = discName(row.disc or 'history'), year = row.year, title = row.title, kind = C.KindName[row.kind] or "", fact = row.fact, lore = row.lore, loreTag = row.loreTag, day = day })
			end
		end
		table.sort(seenList, function(a, b) return a.day > b.day end)
		local here = pick(state)
		return {
			notes = c.notes, drafts = c.drafts, papers = #c.papers, paperTitles = c.papers, need = NOTES_PER_DRAFT, cost = DRAFT_COST,
			presented = presented, stage = stage, next = nextText, seen = seenList, total = if C then #C.Rows + #generated else 0,
			canWrite = writable(state) ~= nil, topDisc = topDisc and discName(topDisc) or nil, topN = topN, canPublish = c.drafts > 0 and presented > #c.papers,
		}
	end

	return A
end
