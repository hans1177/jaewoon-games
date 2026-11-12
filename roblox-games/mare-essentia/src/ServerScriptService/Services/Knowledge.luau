--!nonstrict
-- 지식 트리 서비스: 발견한 카드를 학자에게 보고해 "이해"로 바꾼다. 따로 수락할 필요는 없다.
-- 선행 지식을 이해해야 다음 지식을 보고할 수 있고, 이해한 지식은 항해·화력·교역품 값에 효과를 준다.

return function(D, S)
	local K = D.KnowledgeTree

	-- 교역품 값 보너스: 지식(최대 +40%)에 기록한 인물의 인연(최대 +8%)을 곱한다
	local function goodsMult(state, goodId)
		return K.goodsMult(state, goodId) * S.People.goodsBonus(state, goodId)
	end
	local handlers = {}

	local FAME = { Common = 3, Uncommon = 6, Rare = 12, Epic = 25, Legendary = 50 }

	K.autofill(D.Cards.Cards)
	local techLevelOf -- 아래에서 정의 (연구 성과 계산이 쓴다)

	local function cardName(id)
		local c = D.Cards.ById[id]
		return c and c.name or id
	end

	local function findScholar(id)
		for _, s in D.Scholars.Scholars do
			if s.id == id then
				return s
			end
		end
		return nil
	end

	-- 이 학자가 받아 줄 수 있는 학문 id 목록
	local function scholarDisciplines(scholar)
		return K.ScholarDisciplines[scholar.id] or {}
	end

	-- 지금 이 학자에게 보고할 수 있는 노드 수
	local function reportableCount(state, scholar)
		local discs = scholarDisciplines(scholar)
		local n = 0
		for _, node in K.Nodes do
			if table.find(discs, node.disc) and K.status(state, node) == "ready" then
				n += 1
			end
		end
		return n
	end

	-- 시대 전환: 이해한 지식이 기준을 넘으면 다음 시대로. 한 번에 여러 단계를 넘을 수도 있다.
	local function eraCheck(state, msgs)
		local a = state.academy
		if not a then
			return
		end
		a.era = a.era or 1
		local idx = K.eraIndex(state)
		while a.era < idx do
			a.era += 1
			local era = K.Eras[a.era]
			local coins, fame = 600 * era.reward * era.reward, 30 * era.reward
			state.coins += coins
			state.fame += fame
			table.insert(msgs, string.format("★ 시대가 바뀌었다: %s! %s", era.name, era.story))
			table.insert(msgs, string.format("시대의 보상: 명성 +%d, +%d코인 (항해와 연구가 조금 더 좋아진다)", fame, coins))
		end
	end

	function handlers.ReportKnowledge(state, p)
		local scholar = type(p.scholarId) == "string" and findScholar(p.scholarId)
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
		local discs = scholarDisciplines(scholar)
		if #discs == 0 then
			return false, "이 학자는 보고를 받지 않아요"
		end
		state.reported = state.reported or {}
		local msgs = {}
		local totalFame, totalCoins = 0, 0
		local paceDays = 0
		-- 보고하면 새로 이해한 지식 때문에 다음 지식도 이어서 보고할 수 있다
		local progressed = true
		while progressed do
			progressed = false
			for _, node in K.Nodes do
				if table.find(discs, node.disc) and K.status(state, node) == "ready" then
					state.reported[node.id] = true
					progressed = true
					paceDays += S.Pace.RARITY_DAYS[D.Cards.ById[node.id] and D.Cards.ById[node.id].rarity or "Common"] or 1
					local card = D.Cards.ById[node.id]
					local fame = FAME[card and card.rarity or "Common"] or 3
					local coins = fame * 8
					state.fame += fame
					state.coins += coins
					totalFame += fame
					totalCoins += coins
					local line = string.format("보고: %s", cardName(node.id))
					if node.fx and node.fx.label then
						line ..= " — " .. node.fx.label
					end
					table.insert(msgs, line)
				end
			end
		end
		if #msgs == 0 then
			-- 왜 못 했는지 알려 준다 (인과 관계)
			local hints = {}
			for _, node in K.Nodes do
				if table.find(discs, node.disc) then
					local st, missing = K.status(state, node)
					if st == "blocked" and #hints < 2 then
						local names = {}
						for _, m in missing do
							table.insert(names, cardName(m))
						end
						table.insert(hints, string.format("%s: 먼저 %s을(를) 이해해야 해요", cardName(node.id), table.concat(names, ", ")))
					end
				end
			end
			if #hints > 0 then
				return false, scholar.name .. ": 아직 이어 설명할 수 없네.\n" .. table.concat(hints, "\n")
			end
			return false, scholar.name .. ": 새로 보고할 발견이 없네. 더 탐험하고 오게."
		end
		table.insert(msgs, 1, string.format("%s에게 발견을 보고했다.", scholar.name))
		table.insert(msgs, string.format("보고 보상: 명성 +%d, +%d코인", totalFame, totalCoins))
		S.Pace.addMsg(state, paceDays, msgs, "발견을 보고함")
		eraCheck(state, msgs)
		S.Perk.addAffinity(state, 1, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 항구의 학문별 기술 점수(공동 발표로 쌓임) → 기술 수준 0~4
	local TECH_STEPS = { 6, 16, 32, 60 }
	local function techPoints(state, portId, disc)
		local t = state.portTech and state.portTech[portId]
		return t and t[disc] or 0
	end
	techLevelOf = function(state, portId, disc)
		local pts, lv = techPoints(state, portId, disc), 0
		for i, need in TECH_STEPS do
			if pts >= need then
				lv = i
			end
		end
		return lv
	end

	-- 항구의 학문: 그 항구에 있는 학자들이 다루는 학문
	local function portDisciplines(portId)
		local set, list = {}, {}
		for _, sc in D.Scholars.Scholars do
			if sc.portId == portId then
				for _, d in K.ScholarDisciplines[sc.id] or {} do
					if not set[d] then
						set[d] = true
						table.insert(list, d)
					end
				end
			end
		end
		return list
	end

	-- 항구 투자가 학자들의 연구 성과를 키우고, 그 학문과 관련된 교역품 공급이 늘어 값이 싸진다 (최대 20%)
	local function researchOf(state, portId)
		local lvl = D.Harbor.level(state.harbor[portId] or 0)
		local discs = portDisciplines(portId)
		local understood = 0
		for _, node in K.Nodes do
			if table.find(discs, node.disc) and K.understood(state, node.id) then
				understood += 1
			end
		end
		-- 학자와 함께한 공동 발표로 쌓인 항구의 기술 수준도 연구 성과를 키운다
		local techBonus = 0
		for _, d in discs do
			techBonus += 0.02 * techLevelOf(state, portId, d)
		end
		for _, lm in K.Landmarks do
			if K.hasLandmark(state, portId, lm.id) then
				techBonus += lm.research
			end
		end
		techBonus += 0.01 * (K.eraIndex(state) - 1)
		techBonus += S.Build.researchBonus(state, portId)
		techBonus += S.People.discBonus(state, discs)
		return math.min(0.3, (lvl - 1) * 0.03 + understood * 0.005 + techBonus), lvl, discs
	end

	local function supplyMult(state, portId, goodId)
		local r, _, discs = researchOf(state, portId)
		if r <= 0 then
			return 1
		end
		for _, d in discs do
			if table.find(K.DisciplineGoods[d] or {}, goodId) then
				return 1 - r
			end
		end
		return 1
	end

	local function understoodIn(state, disc)
		local n = 0
		for _, node in K.Nodes do
			if node.disc == disc and K.understood(state, node.id) then
				n += 1
			end
		end
		return n
	end

	local function ensureAcademy(state)
		state.academy = state.academy or { presented = 0, expos = 0, medals = 0, joint = 0, launched = 0, era = 1, last = {}, shown = {} }
		return state.academy
	end

	local PRESENT_COOLDOWN, EXPO_COOLDOWN, PRESENT_MIN = 60, 90, 3

	-- 학회 발표: 이해한 지식을 그 학문의 학회(학자가 있는 항구)에서 발표한다.
	function handlers.Present(state, p)
		local disc = type(p.disc) == "string" and K.DisciplineById[p.disc]
		if not disc then
			return false, "잘못된 요청"
		end
		if not table.find(portDisciplines(state.portId), disc.id) then
			return false, "이 항구에는 그 학문을 다루는 학회가 없어요"
		end
		local n = understoodIn(state, disc.id)
		if n < PRESENT_MIN then
			return false, string.format("%s 지식을 %d개 이상 이해해야 발표할 수 있어요 (지금 %d)", disc.name, PRESENT_MIN, n)
		end
		local a = ensureAcademy(state)
		local key = state.portId .. ":" .. disc.id
		local last = a.last[key]
		if last and state.day - last < PRESENT_COOLDOWN then
			return false, string.format("다음 발표는 %d일 뒤에 할 수 있어요", PRESENT_COOLDOWN - (state.day - last))
		end
		a.last[key] = state.day
		a.presented += 1
		S.Pace.add(state, 6)
		local fame, coins = 6 * n, 50 * n
		state.fame += fame
		state.coins += coins
		local msgs = { string.format("%s 학회에서 연구를 발표했다! (이해한 지식 %d개)", disc.name, n), string.format("청중의 호평: 명성 +%d, 후원금 +%d코인", fame, coins) }
		S.Perk.addAffinity(state, 1, msgs)
		S.Perk.gainSpec(state, "Physics", 10, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 지금 이 항구에서 그 학문의 공동 발표를 함께할 수 있는 학자
	local function jointScholar(state, discId)
		local year = S.State.year(state)
		for _, sc in D.Scholars.Scholars do
			if sc.portId == state.portId and year >= sc.fromYear and year <= sc.toYear and table.find(K.ScholarDisciplines[sc.id] or {}, discId) then
				return sc
			end
		end
		return nil
	end

	local JOINT_COOLDOWN = 45
	local function jointCooldown(state)
		return if K.hasLandmark(state, state.portId, "hall") then K.LandmarkById.hall.jointFast else JOINT_COOLDOWN
	end

	-- 공동 발표: 학자와 함께 연구를 발표한다. 내가 이해한 지식·가져온 수집품(관련 교역품)·완료한 지식 퀘스트가 기여로 인정되고,
	-- 그만큼 이 항구의 그 학문 기술이 발전한다. 기술이 오르면 항구의 연구 성과와 관련 교역품 공급이 커진다.
	function handlers.JointPresent(state, p)
		local disc = type(p.disc) == "string" and K.DisciplineById[p.disc]
		if not disc then
			return false, "잘못된 요청"
		end
		local sc = jointScholar(state, disc.id)
		if not sc then
			return false, "지금 이 항구에는 그 학문의 학자가 없어요"
		end
		local n = understoodIn(state, disc.id)
		if n < 1 then
			return false, string.format("%s 지식을 하나 이상 이해해야 함께 발표할 수 있어요", disc.name)
		end
		local a = ensureAcademy(state)
		local key = "joint:" .. state.portId .. ":" .. disc.id
		local last = a.last[key]
		if last and state.day - last < jointCooldown(state) then
			return false, string.format("다음 공동 발표는 %d일 뒤에 할 수 있어요", jointCooldown(state) - (state.day - last))
		end
		-- 기여 1) 이해한 지식  2) 관련 수집품(교역품 최대 3개씩 기증)  3) 완료한 지식 퀘스트
		local pts = n * 2
		local lines = { string.format("· 이해한 지식 %d개 (+%d)", n, n * 2) }
		local donated = {}
		for _, goodId in K.DisciplineGoods[disc.id] or {} do
			local have = state.cargo[goodId] or 0
			local give = math.min(3, have)
			if give > 0 then
				S.State.removeCargo(state, goodId, give)
				pts += give
				table.insert(donated, string.format("%s %d개", D.Ports.Goods[goodId].name, give))
			end
		end
		if #donated > 0 then
			table.insert(lines, string.format("· 수집품 기증: %s (+%d)", table.concat(donated, ", "), pts - n * 2))
		end
		local qdone = 0
		for _, q in D.Quests.Quests do
			if q.disc == disc.id and state.quests.done[q.id] then
				qdone += 1
			end
		end
		if qdone > 0 then
			pts += qdone * 3
			table.insert(lines, string.format("· 완료한 지식 퀘스트 %d개 (+%d)", qdone, qdone * 3))
		end
		if K.hasLandmark(state, state.portId, "hall") then
			pts = math.floor(pts * K.LandmarkById.hall.jointMult)
			table.insert(lines, "· 학술원의 도움으로 기여가 1.5배")
		end
		a.last[key] = state.day
		a.joint = (a.joint or 0) + 1
		S.Pace.add(state, 10)
		state.portTech = state.portTech or {}
		state.portTech[state.portId] = state.portTech[state.portId] or {}
		local before = techLevelOf(state, state.portId, disc.id)
		state.portTech[state.portId][disc.id] = techPoints(state, state.portId, disc.id) + pts
		local after = techLevelOf(state, state.portId, disc.id)
		local fame, coins = 4 + pts, 20 * pts
		state.fame += fame
		state.coins += coins
		local msgs = { string.format("%s와(과) 함께 %s 연구를 공동 발표했다!", sc.name, disc.name) }
		for _, l in lines do
			table.insert(msgs, l)
		end
		table.insert(msgs, string.format("%s의 %s 기술 +%d점 (지금 %d점)", D.Ports.Ports[state.portId].name, disc.name, pts, techPoints(state, state.portId, disc.id)))
		if after > before then
			table.insert(msgs, string.format("%s 기술이 %d단계로 발전했다! 연구 성과와 관련 교역품 공급이 늘어난다.", disc.name, after))
		end
		table.insert(msgs, string.format("학계의 평가: 명성 +%d, 연구 지원금 +%d코인", fame, coins))
		S.Perk.addAffinity(state, 2, msgs)
		return true, table.concat(msgs, "\n")
	end

	-- 특수 건축물 조건: 교역소 단계 + 학문 기술 단계
	local function landmarkReq(state, lm)
		local lvl = D.Harbor.level(state.harbor[state.portId] or 0)
		if lvl < lm.harbor then
			return false, string.format("교역소가 %d단계 이상이어야 해요", lm.harbor)
		end
		local t = state.portTech and state.portTech[state.portId] or {}
		local best, ok = 0, false
		for discId in t do
			local tl = techLevelOf(state, state.portId, discId)
			best = math.max(best, tl)
			if lm.disc == discId and tl >= lm.level then
				ok = true
			end
		end
		if lm.disc == "any" then
			ok = best >= lm.level
		end
		if not ok then
			local dn = if lm.disc == "any" then "어느 학문이든" else K.DisciplineById[lm.disc].name
			return false, string.format("%s 기술이 %d단계 이상이어야 해요 (학자와 공동 발표로 키워요)", dn, lm.level)
		end
		return true
	end

	-- 건축: 항구가 발전하고 학문 기술이 오르면 박물관·천문대·연구소·미술관·학술원을 지을 수 있다.
	function handlers.BuildLandmark(state, p)
		local lm = type(p) == "table" and type(p.id) == "string" and K.LandmarkById[p.id]
		if not lm then
			return false, "잘못된 건축물"
		end
		if K.hasLandmark(state, state.portId, lm.id) then
			return false, string.format("이 항구에는 이미 %s이(가) 있어요", lm.name)
		end
		local ok, why = landmarkReq(state, lm)
		if not ok then
			return false, why
		end
		if state.coins < lm.cost then
			return false, string.format("건축비 %d코인이 필요해요", lm.cost)
		end
		state.coins -= lm.cost
		state.landmarks = state.landmarks or {}
		state.landmarks[state.portId] = state.landmarks[state.portId] or {}
		state.landmarks[state.portId][lm.id] = true
		local fame = math.floor(lm.cost / 50)
		state.fame += fame
		S.Pace.add(state, 20)
		return true, string.format("%s에 %s을(를) 세웠다! %s 명성 +%d", D.Ports.Ports[state.portId].name, lm.name, lm.summary, fame)
	end

	-- 신제품 출시: 지식으로 개량된(✦) 교역품을 5개 이상 싣고 와서 출시 행사를 연다. (교역소 3단계 이상)
	-- 시장에 풀지 않고 행사에서 프리미엄 값에 팔리며, 개량 폭이 클수록·박물관이 있을수록 더 받는다. 항구마다 60일에 한 번.
	local LAUNCH_COOLDOWN, LAUNCH_COUNT = 60, 5
	function handlers.Launch(state, p)
		local goodId = type(p) == "table" and type(p.goodId) == "string" and p.goodId
		local good = goodId and D.Ports.Goods[goodId]
		if not good then
			return false, "잘못된 교역품"
		end
		local lvl = D.Harbor.level(state.harbor[state.portId] or 0)
		if lvl < 3 then
			return false, "신제품 출시 행사는 교역소가 3단계 이상인 항구에서 열려요"
		end
		local gm = goodsMult(state, goodId)
		if gm <= 1.001 then
			return false, string.format("%s은(는) 아직 개량되지 않았어요 (지식 트리에서 관련 지식을 이해하세요)", good.name)
		end
		if (state.cargo[goodId] or 0) < LAUNCH_COUNT then
			return false, string.format("%s %d개가 필요해요", good.name, LAUNCH_COUNT)
		end
		local a = ensureAcademy(state)
		local key = "launch:" .. state.portId
		local last = a.last[key]
		if last and state.day - last < LAUNCH_COOLDOWN then
			return false, string.format("다음 출시 행사는 %d일 뒤에 열려요", LAUNCH_COOLDOWN - (state.day - last))
		end
		S.State.removeCargo(state, goodId, LAUNCH_COUNT)
		local mult = 1.5 + (gm - 1) * 6 + (if K.hasLandmark(state, state.portId, "museum") then 0.25 else 0)
		local coins = math.floor(good.basePrice * LAUNCH_COUNT * mult)
		local fame = 6 + math.floor((gm - 1) * 100)
		a.last[key] = state.day
		a.launched = (a.launched or 0) + 1
		S.Pace.add(state, 5)
		state.coins += coins
		state.fame += fame
		return true, string.format("%s 신제품 출시 행사! %s %d개가 개당 기준가의 %d%%에 팔렸다. +%d코인, 명성 +%d", D.Ports.Ports[state.portId].name, good.name, LAUNCH_COUNT, math.floor(mult * 100), coins, fame)
	end

	-- ===== 박람회 =====
	-- 전시품은 발견한 도감 카드에서 나온다: 동물은 표본·박제·살아 있는 채로(생체), 식물은 표본(압화), 광물은 광물·화석 표본, 유물은 그대로.
	-- 전시 방식 배율: 표본 1.0 · 박제 1.3(30코인) · 생체 1.7(80코인). 처음 전시하는 카드는 +50%.
	local RARITY_VALUE = { Common = 4, Uncommon = 8, Rare = 16, Epic = 32, Legendary = 64 }
	local FORMS = {
		specimen = { name = "표본", mult = 1.0, cost = 0 },
		taxidermy = { name = "박제", mult = 1.3, cost = 30 },
		live = { name = "생체", mult = 1.7, cost = 80 },
	}
	-- 바다 동물은 살려서 데려올 수 없다
	local NO_LIVE = { "고래", "돌고래", "상어", "문어", "오징어", "해파리", "산호" }
	local EXPO_FIELDS = { Zoology = "동물", Botany = "식물 표본", Mineral = "광물", Relic = "유물" }

	local function isFossil(card)
		for _, w in { "호박", "화석", "암모나이트", "백악" } do
			if string.find(card.name, w, 1, true) then
				return true
			end
		end
		return false
	end

	local function canLive(card)
		for _, w in NO_LIVE do
			if string.find(card.name, w, 1, true) then
				return false
			end
		end
		return card.field == "Zoology"
	end

	-- 이 항구 박람회에 내놓을 수 있는 전시품(가치 높은 순). 전시관 자리는 3 + 교역소 단계.
	local function expoPieces(state, formId, lvl)
		local form = FORMS[formId]
		local list = {}
		for cardId in state.discovered do
			local card = D.Cards.ById[cardId]
			if card and EXPO_FIELDS[card.field] then
				local f, fname = FORMS.specimen, "표본"
				if card.field == "Zoology" then
					if formId == "live" and canLive(card) then
						f, fname = FORMS.live, "생체"
					elseif formId == "live" or formId == "taxidermy" then
						f, fname = FORMS.taxidermy, "박제"
					end
				elseif card.field == "Mineral" and isFossil(card) then
					fname = "화석 표본"
				elseif card.field == "Mineral" then
					fname = "광물 표본"
				elseif card.field == "Relic" then
					fname = "유물"
				end
				local first = not (state.academy and state.academy.shown and state.academy.shown[cardId])
				local value = math.floor((RARITY_VALUE[card.rarity] or 4) * f.mult * (if first then 1.5 else 1))
				table.insert(list, { id = cardId, name = card.name, kind = fname, value = value, cost = f.cost, first = first })
			end
		end
		table.sort(list, function(a, b)
			if a.value ~= b.value then
				return a.value > b.value
			end
			return a.id < b.id
		end)
		local slots = 3 + lvl + (if K.hasLandmark(state, state.portId, "museum") then K.LandmarkById.museum.expoSlots else 0)
		local out = {}
		for i = 1, math.min(slots, #list) do
			out[i] = list[i]
		end
		return out, #list
	end

	local MEDALS = { { 120, "금메달" }, { 60, "은메달" }, { 25, "동메달" } }

	-- 박람회: 표본·박제·생체 동물, 식물·광물·화석·유물, 그리고 개량 교역품을 내놓고 심사를 받는다. (교역소 2단계 이상)
	function handlers.Expo(state, p)
		local lvl = D.Harbor.level(state.harbor[state.portId] or 0)
		if lvl < 2 then
			return false, "박람회는 교역소가 2단계 이상인 항구에서 열려요"
		end
		local formId = if type(p) == "table" and type(p.form) == "string" and FORMS[p.form] then p.form else "specimen"
		local a = ensureAcademy(state)
		local key = "expo:" .. state.portId
		local last = a.last[key]
		if last and state.day - last < EXPO_COOLDOWN then
			return false, string.format("다음 박람회는 %d일 뒤에 열려요", EXPO_COOLDOWN - (state.day - last))
		end
		local pieces = expoPieces(state, formId, lvl)
		local goodsKinds, goodsCoins = 0, 0
		for goodId, count in state.cargo do
			local gm = goodsMult(state, goodId)
			if count > 0 and gm > 1.001 and D.Ports.Goods[goodId] then
				goodsKinds += 1
				goodsCoins += math.min(3, count) * math.floor(D.Ports.Goods[goodId].basePrice * (1 + (gm - 1) * 5))
			end
		end
		if #pieces == 0 and goodsKinds == 0 then
			return false, "내놓을 전시품이 없어요. 동물·식물·광물 카드를 발견하거나, 개량 교역품(✦)을 싣고 오세요"
		end
		local fee = 0
		for _, pc in pieces do
			fee += pc.cost
		end
		if fee > state.coins then
			return false, string.format("전시 준비 비용 %d코인이 모자라요 (박제·생체 동물은 손질과 우리가 필요해요)", fee)
		end
		state.coins -= fee
		a.shown = a.shown or {}
		local score = goodsKinds * 10
		local lines = {}
		for _, pc in pieces do
			score += pc.value
			a.shown[pc.id] = true
			table.insert(lines, string.format("· %s (%s%s)", pc.name, pc.kind, if pc.first then ", 첫 전시 +50%" else ""))
		end
		if K.hasLandmark(state, state.portId, "museum") then
			score = math.floor(score * K.LandmarkById.museum.expoMult)
			table.insert(lines, "· 박물관의 상설 전시 덕분에 점수 +15%")
		end
		local medal = nil
		for _, m in MEDALS do
			if score >= m[1] then
				medal = m[2]
				break
			end
		end
		a.last[key] = state.day
		a.expos += 1
		S.Pace.add(state, 8)
		if medal then
			a.medals = (a.medals or 0) + 1
		end
		local coins = score * 6 + goodsCoins
		local fame = math.floor(score / 4) + 3 * lvl
		state.coins += coins
		state.fame += fame
		local msgs = { string.format("%s 박람회 개막! 전시 방식: %s", D.Ports.Ports[state.portId].name, FORMS[formId].name) }
		for _, l in lines do
			table.insert(msgs, l)
		end
		if goodsKinds > 0 then
			table.insert(msgs, string.format("· 개량 교역품 %d종", goodsKinds))
		end
		table.insert(msgs, string.format("심사 점수 %d점%s", score, if medal then " — " .. medal .. "!" else ""))
		table.insert(msgs, string.format("상금 +%d코인, 명성 +%d%s", coins, fame, if fee > 0 then string.format(" (준비 비용 -%d)", fee) else ""))
		return true, table.concat(msgs, "\n")
	end

	-- 화면용 요약
	local function viewOf(state)
		local out = { disciplines = {}, speedBonus = K.speedBonus(state), cannonBonus = K.cannonBonus(state), upgrades = {} }
		for _, d in K.Disciplines do
			local nodes, done, total, hidden = {}, 0, 0, 0
			for _, node in K.Nodes do
				if node.disc == d.id then
					total += 1
					local st, missing = K.status(state, node)
					if st == "done" then
						done += 1
					end
					if node.auto and st == "locked" then
						hidden += 1
						continue
					end
					local needNames = {}
					for _, need in node.needs do
						table.insert(needNames, cardName(need))
					end
					local missNames = {}
					for _, m in missing do
						table.insert(missNames, cardName(m))
					end
					table.insert(nodes, {
						id = node.id, name = cardName(node.id), status = st, needs = needNames, missing = missNames,
						effect = node.fx and node.fx.label or nil,
					})
				end
			end
			local isOpen, parentDone = K.disciplineOpen(state, d.id)
			local parent = d.parent and K.DisciplineById[d.parent]
			table.insert(out.disciplines, {
				id = d.id, name = d.name, summary = d.summary, done = done, total = total, nodes = nodes, hidden = hidden,
				era = d.era, parentName = parent and parent.name or nil, open = isOpen, openAt = d.openAt, parentDone = parentDone or 0,
			})
		end
		-- 먼 바다 해금 조건 (문명식)
		do
			local idx = K.eraIndex(state)
			local era, nxt = K.Eras[idx], K.Eras[idx + 1]
			out.era = { index = idx, name = era.name, story = era.story, count = K.understoodCount(state), nextName = nxt and nxt.name or nil, nextNeed = nxt and nxt.need or nil }
		end
		out.gates = {}
		for _, reg in D.Regions.List do
			local need = K.RegionGates[reg.id]
			if need then
				local rows, all = {}, true
				for _, id in need do
					local ok = K.understood(state, id)
					all = all and ok
					table.insert(rows, { name = cardName(id), done = ok })
				end
				table.insert(out.gates, { region = reg.name, need = rows, open = all })
			end
		end
		-- 계통도: 뿌리에서 갈라져 나온 순서대로 (깊이 표시)
		out.tree = {}
		local function walk(parentId, depth)
			for _, d in K.Disciplines do
				if d.parent == parentId then
					local o, pd = K.disciplineOpen(state, d.id)
					table.insert(out.tree, { id = d.id, name = d.name, depth = depth, open = o, openAt = d.openAt, parentName = parentId and K.DisciplineById[parentId].name or nil, parentDone = pd or 0 })
					walk(d.id, depth + 1)
				end
			end
		end
		walk(nil, 0)
		do
			local r, lvl, discs = researchOf(state, state.portId)
			local names = {}
			for _, d in discs do
				table.insert(names, K.DisciplineById[d].name)
			end
			local a = ensureAcademy(state)
			local pres = {}
			for _, d in discs do
				local last = a.last[state.portId .. ":" .. d]
				local js = jointScholar(state, d)
				local jl = a.last["joint:" .. state.portId .. ":" .. d]
				local pts = techPoints(state, state.portId, d)
				local lvT = techLevelOf(state, state.portId, d)
				table.insert(pres, {
					disc = d, name = K.DisciplineById[d].name, understood = understoodIn(state, d), wait = if last then math.max(0, PRESENT_COOLDOWN - (state.day - last)) else 0,
					jointScholar = js and js.name or nil, jointWait = if jl then math.max(0, jointCooldown(state) - (state.day - jl)) else 0,
					techPoints = pts, techLevel = lvT, techNext = TECH_STEPS[lvT + 1],
				})
			end
			local lastExpo = a.last["expo:" .. state.portId]
			out.academy = {
				research = math.floor(r * 100 + 0.5), harborLevel = lvl, disciplines = names, present = pres,
				presentMin = PRESENT_MIN, presented = a.presented, expos = a.expos, joint = a.joint or 0,
			buildings = (function()
				local rows = {}
				for _, lm in K.Landmarks do
					local built = K.hasLandmark(state, state.portId, lm.id)
					local ok, why = landmarkReq(state, lm)
					table.insert(rows, { id = lm.id, name = lm.name, cost = lm.cost, summary = lm.summary, built = built, can = ok and not built, why = if built then "지어졌어요" else why })
				end
				return rows
			end)(),
				expoWait = if lastExpo then math.max(0, EXPO_COOLDOWN - (state.day - lastExpo)) else 0, expoOpen = lvl >= 2,
				medals = a.medals or 0, launched = a.launched or 0,
				launch = (function()
					local rows = {}
					local lastL = a.last["launch:" .. state.portId]
					local wait = if lastL then math.max(0, LAUNCH_COOLDOWN - (state.day - lastL)) else 0
					local ids = {}
					for goodId in D.Ports.Goods do
						table.insert(ids, goodId)
					end
					table.sort(ids)
					for _, goodId in ids do
						local gm = goodsMult(state, goodId)
						if gm > 1.001 then
							local have = state.cargo[goodId] or 0
							table.insert(rows, { goodId = goodId, name = D.Ports.Goods[goodId].name, have = have, need = LAUNCH_COUNT, up = math.floor((gm - 1) * 100 + 0.5), open = lvl >= 3, wait = wait })
						end
					end
					return rows
				end)(),
			}
			local prev = {}
			for _, formId in { "specimen", "taxidermy", "live" } do
				local pieces = expoPieces(state, formId, lvl)
				local score, fee = 0, 0
				for _, pc in pieces do
					score += pc.value
					fee += pc.cost
				end
				prev[formId] = { name = FORMS[formId].name, pieces = #pieces, score = score, fee = fee }
			end
			out.academy.expoPreview = prev
			out.academy.expoSlots = 3 + lvl + (if K.hasLandmark(state, state.portId, "museum") then K.LandmarkById.museum.expoSlots else 0)
		end
		for _, node in K.Nodes do
			local fx = node.fx
			if fx and fx.goods and K.understood(state, node.id) then
				for _, g in fx.goods do
					out.upgrades[g] = math.floor((goodsMult(state, g) - 1) * 100 + 0.5)
				end
			end
		end
		return out
	end

	return {
		handlers = handlers, goodsMult = goodsMult, speedBonus = K.speedBonus, viewOf = viewOf,
		reportableCount = reportableCount, scholarDisciplines = scholarDisciplines,
		supplyMult = supplyMult, researchOf = researchOf, understoodIn = understoodIn,
		portDisciplines = portDisciplines, techSum = function(state, portId)
			local n = 0
			for _, d in portDisciplines(portId) do
				n += techLevelOf(state, portId, d)
			end
			return n
		end,
		-- 학자들의 자율 연구: 항구가 번영할수록 빠르고, 불황·재해에는 멈춘다
		autoResearch = function(state, portId, points)
			local gained = 0
			state.portTech = state.portTech or {}
			state.portTech[portId] = state.portTech[portId] or {}
			for _, d in portDisciplines(portId) do
				local before = techLevelOf(state, portId, d)
				state.portTech[portId][d] = math.min(60, techPoints(state, portId, d) + points)
				if techLevelOf(state, portId, d) > before then
					gained += 1
				end
			end
			return gained
		end,
	}
end
