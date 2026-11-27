--!nonstrict
-- [이야기 퀘스트 시스템] 스토리 내용 없이 틀만 제공한다. 내용은 Quests.luau 데이터로 나중에 채운다.
-- 기록은 모두 state.stats 아래에 둔다(stats 는 통째로 저장되므로 저장 구조를 늘리지 않는다).
--   stats.storyChoices[key] = value   선택 분기 결과
--   stats.duelWins[leaderId] = n      특정 지도자 덱을 이긴 횟수(이야기 카드 대결)
--   stats.warClears[warId|region] = n 함대전 완수 횟수(Battle 이 기록)
-- 서비스 쪽 타입 추론 부담을 줄이려고 판정 로직을 이 모듈에 모은다.
local K = {}

K.KEY_MAX = 24
K.MAX_CHOICES = 64

local function stats(state: any): any
	return state.stats
end

-- 선택 결과
function K.choice(state: any, key: string): string?
	local c = stats(state).storyChoices
	return c and c[key] or nil
end

-- "key=value" 조건이 맞는지 (needChoice 필드)
function K.choiceMet(state: any, need: string?): boolean
	if not need then
		return true
	end
	local key, value = string.match(need, "^([%w_]+)=([%w_]+)$")
	if not key then
		return false
	end
	return K.choice(state, key) == value
end

-- 선택 퀘스트(kind "choice")에서 하나를 고른다. 이미 고른 건 바꿀 수 없다.
function K.choose(state: any, quest: any, value: any): (boolean, string)
	if not quest or quest.kind ~= "choice" or type(quest.choices) ~= "table" then
		return false, "고를 수 있는 이야기가 아니에요"
	end
	if not state.quests.active[quest.id] then
		return false, "진행 중인 이야기가 아니에요"
	end
	local key = quest.choiceKey or quest.id
	if K.choice(state, key) then
		return false, "이미 선택했어요"
	end
	local pick
	for _, opt in quest.choices do
		if opt.value == value then
			pick = opt
		end
	end
	if not pick then
		return false, "알 수 없는 선택이에요"
	end
	local st = stats(state)
	st.storyChoices = st.storyChoices or {}
	local n = 0
	for _ in st.storyChoices do
		n += 1
	end
	if n >= K.MAX_CHOICES then
		return false, "선택 기록이 가득 찼어요"
	end
	st.storyChoices[key] = pick.value
	return true, pick.result or ("선택: " .. tostring(pick.label or pick.value))
end

-- 퀘스트 진행도 (Quest.progressWith 에서 부른다). 처리하지 않는 종류면 nil.
function K.progress(state: any, quest: any): number?
	local st = stats(state)
	if quest.kind == "choice" then
		return if K.choice(state, quest.choiceKey or quest.id) then 1 else 0
	elseif quest.kind == "duel_leader" then
		local w = st.duelWins
		return (w and quest.leaderId and w[quest.leaderId]) or 0
	elseif quest.kind == "war_clear" then
		local wc = st.warClears or {}
		if quest.warId then
			return wc[quest.warId] or 0
		end
		if quest.regionId then
			return wc[quest.regionId] or 0
		end
		local n = 0
		for k, v in wc do
			-- 해역 키만 합산한다(함대전 id 키는 중복 집계 방지)
			if string.sub(k, 1, 4) ~= "war_" and k ~= "blockade" and k ~= "convoy_raid" and k ~= "fleet_decisive" then
				n += v
			end
		end
		return n
	end
	return nil
end

-- 이야기 카드 대결: 진행 중인 duel_leader 퀘스트의 상대 설정 (없으면 nil)
function K.duelFoe(D: any, state: any, questId: any): any
	local quest = type(questId) == "string" and D.Quests.ById[questId]
	if not quest or quest.kind ~= "duel_leader" or not state.quests.active[quest.id] then
		return nil
	end
	local B = D.BoardingCards
	local leader = quest.leaderId and B.Leaders[quest.leaderId]
	local faction = quest.duelFaction or (leader and leader.faction)
	if not leader or not faction or not B.Factions[faction] then
		return nil
	end
	return { faction = faction, leader = quest.leaderId, questId = quest.id }
end

function K.recordDuelWin(state: any, leaderId: string)
	local st = stats(state)
	st.duelWins = st.duelWins or {}
	st.duelWins[leaderId] = (st.duelWins[leaderId] or 0) + 1
end

-- 함대전 완수 기록: 해역 키와 함대전 id 키를 함께 올린다.
function K.recordWar(state: any, def: any)
	local st = stats(state)
	st.warClears = st.warClears or {}
	local region = def.region or "any"
	st.warClears[region] = (st.warClears[region] or 0) + 1
	st.warClears[def.id] = (st.warClears[def.id] or 0) + 1
end

-- 저장 복원: 문자열 키 → 정수/짧은 문자열만 받는다.
function K.sanitizeStats(saved: any, into: any, num: any)
	local function counts(src)
		if type(src) ~= "table" then
			return nil
		end
		local out = {}
		for k, v in src do
			if type(k) == "string" and #k <= K.KEY_MAX then
				out[k] = math.floor(num(v, 0, 0, 1e6))
			end
		end
		return out
	end
	into.warClears = counts(saved.warClears)
	into.duelWins = counts(saved.duelWins)
	if type(saved.storyChoices) == "table" then
		local out, n = {}, 0
		for k, v in saved.storyChoices do
			if n < K.MAX_CHOICES and type(k) == "string" and #k <= K.KEY_MAX and type(v) == "string" and #v <= K.KEY_MAX then
				out[k] = v
				n += 1
			end
		end
		into.storyChoices = out
	end
end

-- 이야기를 끝내면 카드 상세에 열리는 한 단락: cardId → { text, quest }
function K.loreIndex(quests: any): any
	local idx = {}
	for _, q in quests do
		if q.loreCardId and q.loreText then
			idx[q.loreCardId] = idx[q.loreCardId] or {}
			table.insert(idx[q.loreCardId], { questId = q.id, text = q.loreText, title = q.name })
		end
	end
	return idx
end

function K.loreFor(state: any, idx: any, cardId: string): any
	local list = idx[cardId]
	if not list then
		return nil
	end
	local out
	for _, e in list do
		if state.quests.done[e.questId] then
			out = out or {}
			table.insert(out, { title = e.title, text = e.text })
		end
	end
	return out
end

-- 이야기 인물 말풍선: 진행 중 퀘스트 중 speaker/line 이 있는 첫 퀘스트
function K.speakerLine(state: any, quests: any): any
	for _, q in quests do
		if q.speaker and q.line and state.quests.active[q.id] then
			return { id = q.id, name = q.speaker, role = q.speakerRole or "이야기", text = q.line }
		end
	end
	return nil
end

-- 일지 화면용 추가 정보 (해당 없으면 nil)
function K.questExtras(state: any, quest: any): any
	if quest.kind == "choice" and type(quest.choices) == "table" then
		local opts = {}
		for _, o in quest.choices do
			table.insert(opts, { value = o.value, label = o.label })
		end
		return { choices = opts, picked = K.choice(state, quest.choiceKey or quest.id) }
	elseif quest.kind == "duel_leader" then
		return { duel = true, leaderId = quest.leaderId }
	elseif quest.kind == "war_clear" and quest.warId then
		return { warId = quest.warId }
	elseif quest.speaker and quest.line then
		return { speaker = quest.speaker, line = quest.line }
	end
	return nil
end

-- 카드 이야기 색인(퀘스트 데이터에서 한 번 만든다). Quests 모듈이 채운다.
K.LORE = {}

return K
