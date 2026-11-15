--!nonstrict
-- 마을 발전: 학문을 이해할수록(지식 노드) 학문별 단계가 오르고, 단계가 모이면 마을 레벨이 오른다.
-- 마을 레벨과 학문 단계가 충분하면 그 학문과 이어진 경제 건물(EconomyBuildings)이 마을에 들어선다.
-- 학문 단계: 이해한 지식 수 1/3/6/10 → 1~4단계.  마을 레벨 1~6: 단계 합계 0/3/8/14/22/32 이상.

return function(D, S)
	local K, EB = D.KnowledgeTree, D.EconomyBuildings
	local V = {}

	local TIER_AT = { 1, 3, 6, 10 }
	local LEVEL_AT = { 0, 3, 8, 14, 22, 32 }
	local TIER_NAME = { "시작", "발전", "성숙", "정점" }
	local LEVEL_NAME = { "어촌·장터", "마을", "항구 마을", "항구 도시", "학술 도시", "대도시" }
	-- 건물 레벨 → 필요한 학문 단계
	local NEED_TIER = { [1] = 0, [2] = 1, [3] = 1, [4] = 2, [5] = 3, [6] = 3 }

	local function understoodByDisc(state)
		local counts = {}
		for id in (state.reported or {}) do
			local node = K.ById[id]
			if node then
				counts[node.disc] = (counts[node.disc] or 0) + 1
			end
		end
		return counts
	end

	local function tierOf(n)
		local t = 0
		for i, need in TIER_AT do
			if n >= need then t = i end
		end
		return t
	end

	function V.levelOf(score)
		local lv = 1
		for i, need in LEVEL_AT do
			if score >= need then lv = i end
		end
		return lv
	end

	function V.tiers(state)
		local counts = understoodByDisc(state)
		local tiers, score = {}, 0
		for _, d in K.Disciplines do
			local t = tierOf(counts[d.id] or 0)
			tiers[d.id] = t
			score += t
		end
		return tiers, score, counts
	end

	-- 지금 마을에 들어선 경제 건물 목록
	function V.buildings(state)
		local tiers, score = V.tiers(state)
		local level = V.levelOf(score)
		local out = {}
		for _, b in EB.List do
			if level >= b.minLevel then
				local ok = true
				for _, d in b.disc do
					if tiers[d] ~= nil and tiers[d] < NEED_TIER[b.minLevel] then
						ok = false
					end
				end
				if ok then table.insert(out, b) end
			end
		end
		return out, level
	end

	-- 직업군: 항구 발전 레벨이 오를수록 마을에 새 직업이 생긴다 (disc = 연결 학문)
	V.Jobs = {
		{ name = "어부", minLevel = 1, disc = "zoology" },
		{ name = "농부", minLevel = 1, disc = "agronomy" },
		{ name = "뱃사공", minLevel = 1 },
		{ name = "짐꾼", minLevel = 1 },
		{ name = "행상", minLevel = 1 },
		{ name = "대장장이", minLevel = 1, disc = "metallurgy" },
		{ name = "주점 주인", minLevel = 1 },
		{ name = "직조공", minLevel = 2, disc = "textiles" },
		{ name = "제빵사", minLevel = 2, disc = "cooking" },
		{ name = "석공", minLevel = 2, disc = "mineralogy" },
		{ name = "목수", minLevel = 2, disc = "architecture" },
		{ name = "무두장이", minLevel = 2, disc = "chemistry" },
		{ name = "약초상", minLevel = 2, disc = "botany" },
		{ name = "사제", minLevel = 2, disc = "religious_studies" },
		{ name = "조선공", minLevel = 3, disc = "shipbuilding" },
		{ name = "도선사", minLevel = 3, disc = "navigation" },
		{ name = "세관원", minLevel = 3, disc = "law" },
		{ name = "병사·포수", minLevel = 3, disc = "military_science" },
		{ name = "양조사", minLevel = 3, disc = "brewing" },
		{ name = "도공", minLevel = 3, disc = "crafts" },
		{ name = "서기", minLevel = 3, disc = "linguistics" },
		{ name = "의사", minLevel = 3, disc = "medicine" },
		{ name = "은행가", minLevel = 4, disc = "economics" },
		{ name = "거래소 중개인", minLevel = 4, disc = "commerce" },
		{ name = "인쇄공", minLevel = 4, disc = "linguistics" },
		{ name = "신문 기자", minLevel = 4, disc = "linguistics" },
		{ name = "교사", minLevel = 4, disc = "education" },
		{ name = "판사", minLevel = 4, disc = "law" },
		{ name = "소방관", minLevel = 4, disc = "civil_engineering" },
		{ name = "지도 제작자", minLevel = 4, disc = "cartography" },
		{ name = "천문학자", minLevel = 5, disc = "astronomy" },
		{ name = "화학자", minLevel = 5, disc = "chemistry" },
		{ name = "식물학자", minLevel = 5, disc = "botany" },
		{ name = "건축가", minLevel = 5, disc = "architecture" },
		{ name = "출판업자", minLevel = 5, disc = "linguistics" },
		{ name = "외과의", minLevel = 5, disc = "surgery" },
		{ name = "학회 서기", minLevel = 5, disc = "philosophy" },
		{ name = "증기 기관사", minLevel = 6, disc = "mechanical_engineering" },
		{ name = "은행 총재", minLevel = 6, disc = "economics" },
		{ name = "박물관 큐레이터", minLevel = 6, disc = "archaeology" },
		{ name = "신문 편집장", minLevel = 6, disc = "linguistics" },
		{ name = "대학 교수", minLevel = 6, disc = "education" },
		{ name = "해운 회사 사장", minLevel = 6, disc = "commerce" },
	}

	-- 마을 구역: 항구 발전 레벨이 오르면 새 구역이 열리고 마을이 바깥으로 넓어진다
	V.Districts = {
		{ id = "wharf", name = "부두 구역", minLevel = 1, cats = { "industry" }, summary = "선착장과 어시장, 창고가 모인 바닷가." },
		{ id = "market", name = "시장 구역", minLevel = 1, cats = { "food", "industry" }, summary = "장터와 여관이 있는 마을 한가운데." },
		{ id = "homes", name = "주거 구역", minLevel = 2, cats = { "home", "cloth" }, summary = "집과 직조·염색 공방이 늘어선 골목." },
		{ id = "workshops", name = "공방 구역", minLevel = 3, cats = { "industry" }, summary = "대장간, 가마, 조선소가 자리 잡은 곳." },
		{ id = "faith", name = "신앙 구역", minLevel = 3, cats = { "public" }, summary = "성당·사원·모스크와 묘지가 있는 구역." },
		{ id = "civic", name = "행정 구역", minLevel = 4, cats = { "public" }, summary = "시청, 재판소, 세관이 모인 중심가." },
		{ id = "academy", name = "학술 구역", minLevel = 5, cats = { "public" }, summary = "학교, 도서관, 인쇄소, 천문대가 있는 구역." },
		{ id = "suburb", name = "교외 신도시", minLevel = 6, cats = { "home", "food" }, summary = "성벽 밖으로 넓어진 새 주택가와 농장." },
	}

	-- 항구별 발전도: 항구 투자 레벨 5점 + 지은 건물 단계 3점 + 항구 학문 기술 단계 2점 + 특수 건축물 4점
	local PORT_LEVEL_AT = { 0, 8, 20, 40, 70, 110 }
	local TECH_STEPS = { 6, 16, 32, 60 }
	function V.portDev(state, portId)
		local port = D.Ports.Ports[portId]
		if not port then return nil end
		local harborLv = S.Harbor.level(state, portId) or 0
		local stages = 0
		for _, chain in D.PortBuildings.Chains do
			stages += S.Build.stageOf(state, portId, chain.id) or 0
		end
		local tech = 0
		for _, pts in ((state.portTech or {})[portId] or {}) do
			for _, need in TECH_STEPS do
				if pts >= need then tech += 1 end
			end
		end
		local marks = 0
		for _ in ((state.landmarks or {})[portId] or {}) do
			marks += 1
		end
		local score = harborLv * 5 + stages * 3 + tech * 2 + marks * 4
		local level = 1
		for i, need in PORT_LEVEL_AT do
			if score >= need then level = i end
		end
		local opened, nextD = {}, nil
		for _, d in V.Districts do
			if level >= d.minLevel then
				table.insert(opened, d.name)
			elseif not nextD then
				nextD = d
			end
		end
		local jobs, newJobs = {}, {}
		for _, j in V.Jobs do
			if level >= j.minLevel then
				table.insert(jobs, j.name)
				if j.minLevel == level then table.insert(newJobs, j.name) end
			end
		end
		return {
			jobs = jobs, newJobs = newJobs,
			districts = opened, nextDistrict = nextD and (nextD.name .. " (Lv." .. nextD.minLevel .. ")") or nil,
			id = portId, name = port.name, score = score, level = level, levelName = LEVEL_NAME[level],
			harbor = harborLv, stages = stages, tech = tech, landmarks = marks,
			nextAt = PORT_LEVEL_AT[level + 1],
		}
	end

	-- 발전도가 0보다 큰 항구 + 현재 항구, 점수 높은 순
	function V.portList(state)
		local out, seen = {}, {}
		local function add(id)
			if seen[id] then return end
			seen[id] = true
			local d = V.portDev(state, id)
			if d and (d.score > 0 or id == state.portId) then table.insert(out, d) end
		end
		add(state.portId)
		for id in (state.harbor or {}) do add(id) end
		for id in (state.portStages or {}) do add(id) end
		for id in (state.portTech or {}) do add(id) end
		for id in (state.landmarks or {}) do add(id) end
		table.sort(out, function(a, b)
			if a.score ~= b.score then return a.score > b.score end
			return a.id < b.id
		end)
		return out
	end

	function V.view(state)
		local tiers, score, counts = V.tiers(state)
		local built, level = V.buildings(state)
		local nextAt = LEVEL_AT[level + 1]
		local byCat = {}
		for _, b in built do
			byCat[b.category] = (byCat[b.category] or 0) + 1
		end
		local cats = {}
		for _, c in EB.Categories do
			table.insert(cats, { id = c.id, name = c.name, built = byCat[c.id] or 0, total = #(EB.ByCategory[c.id] or {}) })
		end
		local discs = {}
		for _, d in K.Disciplines do
			local t = tiers[d.id]
			if t > 0 then
				table.insert(discs, { id = d.id, name = d.name, tier = t, tierName = TIER_NAME[t], count = counts[d.id] or 0 })
			end
		end
		table.sort(discs, function(a, b) return a.tier > b.tier end)
		return {
			level = level, name = LEVEL_NAME[level], score = score, nextAt = nextAt, nextName = LEVEL_NAME[level + 1],
			built = #built, total = #EB.List, cats = cats, discs = discs,
			ports = V.portList(state), here = V.portDev(state, state.portId),
		}
	end

	return V
end
