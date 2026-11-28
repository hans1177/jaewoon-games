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
	V.CULTURE_NAME = {
		atlantic_europe = "대서양 유럽", mediterranean = "지중해", red_sea = "홍해·이슬람권", west_africa = "서아프리카", americas = "아메리카",
		north_sea = "북해·북유럽", east_africa = "동아프리카", east_asia = "동아시아", south_asia = "남아시아", southeast_asia = "동남아시아",
	}

	function V.cultureOf(portId)
		return D.CultureRegions.ofPort(D.Ports.Ports, portId)
	end

	function V.buildings(state, levelOverride, portId)
		local tiers, score = V.tiers(state)
		local level = levelOverride or V.levelOf(score)
		local culture = portId and V.cultureOf(portId)
		local out = {}
		for _, b in EB.List do
			local cultureOk = b.cultures == nil or (portId == nil) or (culture ~= nil and table.find(b.cultures, culture) ~= nil)
			if level >= b.minLevel and cultureOk then
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

	-- 의식주 시뮬레이션: 인구가 먹고(식) 입고(의) 살고(주) 씻는(위생) 데 필요한 양과, 마을이 대는 양을 견준다.
	-- 공급 = 들어선 건물(분류별) + 항구가 나는 원자재 / 수요 = 인구 × 항목별 계수. 만족도가 낮으면 안정도·인구가 준다.
	V.POP_AT = { 300, 900, 2500, 6000, 12000, 25000 }
	V.NEED = { food = 1.0, cloth = 0.5, home = 1.0, hygiene = 0.7 }
	V.WEIGHT = { food = 0.4, cloth = 0.15, home = 0.25, hygiene = 0.2 }
	V.AXIS_NAME = { food = "식", cloth = "의", home = "주", hygiene = "위생" }
	-- 건물 분류 → 의식주 항목 (산업·교역 건물은 자재·장비로 주와 의를 돕는다)
	local AXIS_OF_CAT = { food = "food", cloth = "cloth", home = "home", public = "hygiene" }
	-- 항구가 내는 원자재 종류 → 항목 (농·목축·해산→식, 섬유·목축→의, 임·광산→주)
	local AXIS_OF_RAW = { farm = { "food" }, animal = { "food", "cloth" }, fiber = { "cloth" }, forest = { "home" }, mineral = { "home" }, gem = {} }

	function V.sim(state, portId, levelOverride)
		local port = D.Ports.Ports[portId]
		if not port then return nil end
		local dev = levelOverride and { level = levelOverride } or V.portDev(state, portId)
		local level = dev.level
		local pop = V.POP_AT[level]
		local supply = { food = 0, cloth = 0, home = 0, hygiene = 0 }
		local builtBy = {}
		for _, b in V.buildings(state, level, portId) do
			local axis = AXIS_OF_CAT[b.category]
			local cap = 60 + 30 * b.minLevel
			if b.category == "faith" then
				builtBy.faith = (builtBy.faith or 0) + 1
			elseif axis then
				supply[axis] += cap
				builtBy[axis] = (builtBy[axis] or 0) + 1
			elseif b.category == "industry" then
				supply.home += cap * 0.3
				supply.cloth += cap * 0.3
			end
		end
		local rawBy = D.ProductionChains.rawByClass(port.produces or {})
		for cls, n in rawBy do
			for _, axis in (AXIS_OF_RAW[cls] or {}) do
				supply[axis] += n * 90
			end
		end
		local axes, stability = {}, 0
		for _, key in { "food", "cloth", "home", "hygiene" } do
			local need = math.max(1, math.floor(pop * V.NEED[key]))
			local pct = math.min(1.5, supply[key] / need)
			local st = if pct >= 0.9 then "풍족" elseif pct >= 0.7 then "안정" elseif pct >= 0.5 then "부족" else "위기"
			stability += math.min(1, pct) * V.WEIGHT[key]
			-- 모자랄 때 먼저 지을 건물 추천
			local tip = nil
			if pct < 0.9 then
				for _, b in EB.List do
					local ax = AXIS_OF_CAT[b.category]
					if ax == key and b.minLevel <= level then
						tip = b.name
						break
					end
				end
			end
			table.insert(axes, { id = key, name = V.AXIS_NAME[key], supply = math.floor(supply[key]), need = need, pct = pct, status = st, tip = tip, buildings = builtBy[key] or 0 })
		end
		-- 종교 건물은 마음의 안정(최대 +0.1)
		stability = math.min(1, stability + math.min(0.1, (builtBy.faith or 0) * 0.025))
		local mood = if stability >= 0.85 then "번영" elseif stability >= 0.65 then "안정" elseif stability >= 0.45 then "불안" else "위기"
		return {
			level = level, pop = math.floor(pop * (0.6 + 0.4 * stability)), popCap = pop, stability = stability, mood = mood, axes = axes,
		}
	end

	-- 군사학 단계: 모은 군사학 카드 수로 센다
	function V.militaryTier(state)
		local n = 0
		for cardId in (state.discovered or {}) do
			local c = D.Cards.ById[cardId]
			if c and c.field == "Military" then n += 1 end
		end
		local tier = 0
		for i, need in D.DisciplineFacilities.MilitaryTierAt do
			if n >= need then tier = i end
		end
		return tier, n
	end

	-- 학문 시설·직업: 학문 단계(1~4)가 오르고 항구 레벨이 (단계+1) 이상이면 그 학문의 시설과 직업이 선다.
	function V.discFacilities(state, level)
		local tiers, _, mainCounts = V.tiers(state)
		-- [승격 학문 시설] 기존 도시 점수/주학문 단계를 유지하고 연관 학문 보고만 시설 개방에 포함한다.
		-- 동일 지식이 두 학문에 소속돼도 각 학문에서는 한 번만 세며, 군사학은 아래 전용 카드 수 단계만 쓴다.
		local relatedCounts = {}
		for id in state.reported or {} do
			local node = K.ById[id]
			if node then
				for _, linked in K.CardRelatedDisciplines[id] or {} do
					if K.Promoted[linked] and linked ~= "military_science" and linked ~= node.disc then
						relatedCounts[linked] = (relatedCounts[linked] or 0) + 1
					end
				end
			end
		end
		local facilities, jobs, byDisc = {}, {}, {}
		for _, d in K.Disciplines do
			local list = D.DisciplineFacilities.List[d.id]
			local t = tiers[d.id] or 0
			if K.Promoted[d.id] and d.id ~= "military_science" then
				t = tierOf((mainCounts[d.id] or 0) + (relatedCounts[d.id] or 0))
			end
			local open = 0
			if list then
				for tier = 1, 4 do
					if t >= tier and level >= tier + 1 then
						open = tier
						table.insert(facilities, list[tier][1])
						table.insert(jobs, list[tier][2])
					end
				end
			end
			if open > 0 then
				table.insert(byDisc, { id = d.id, name = d.name, tier = open, facility = list[open][1], job = list[open][2] })
			end
		end
		local mt = V.militaryTier(state)
		local mOpen = 0
		for tier = 1, 4 do
			if mt >= tier and level >= tier + 1 then
				mOpen = tier
				table.insert(facilities, D.DisciplineFacilities.Military[tier][1])
				table.insert(jobs, D.DisciplineFacilities.Military[tier][2])
			end
		end
		if mOpen > 0 then
			table.insert(byDisc, { id = "military_science", name = "군사학", tier = mOpen, facility = D.DisciplineFacilities.Military[mOpen][1], job = D.DisciplineFacilities.Military[mOpen][2] })
		end
		return facilities, jobs, byDisc
	end

	-- 전투 연결: 현재 항구에 선 군수·기술 계열 학문 시설(조선·건축·화학·광물·물리·항해)이 포 위력을 올린다 (시설 하나당 +0.5%, 최대 +8%)
	V.BATTLE_DISCS = { shipbuilding = true, architecture = true, chemistry = true, mineralogy = true, physics = true, navigation = true }
	V.BATTLE_PER_FACILITY, V.BATTLE_CAP = 0.005, 0.08
	function V.battleBonus(state)
		local dev = V.portDev(state, state.portId)
		if not dev then return 0 end
		local n = 0
		for _, d in dev.discBy do
			if V.BATTLE_DISCS[d.id] then n += d.tier end
			if d.id == "military_science" then n += d.tier * 2 end -- 군사 시설은 단계마다 두 배
		end
		return math.min(V.BATTLE_CAP, n * V.BATTLE_PER_FACILITY)
	end

	-- 마을 구역: 항구 발전 레벨이 오르면 새 구역이 열리고 마을이 바깥으로 넓어진다
	V.Districts = {
		{ id = "wharf", name = "부두 구역", minLevel = 1, weight = 3, sub = { "내항 부두", "외항 정박지", "조선 구획", "화물 하역장" }, cats = { "industry" }, summary = "선착장과 어시장, 창고가 모인 바닷가." },
		{ id = "market", name = "시장 구역", minLevel = 1, weight = 3, sub = { "어시장", "곡물 시장", "사치품 시장", "환전 거리" }, cats = { "food", "industry" }, summary = "장터와 여관이 있는 마을 한가운데." },
		{ id = "homes", name = "주거 구역", minLevel = 2, weight = 4, sub = { "서민 골목", "상인 거리", "외국인 거류지", "귀족 저택가" }, cats = { "home", "cloth" }, summary = "집과 직조·염색 공방이 늘어선 골목." },
		{ id = "workshops", name = "공방 구역", minLevel = 3, weight = 3, sub = { "금속 공방가", "직물 공방가", "도자·유리 공방가", "화약 공방" }, cats = { "industry" }, summary = "대장간, 가마, 조선소가 자리 잡은 곳." },
		{ id = "faith", name = "신앙 구역", minLevel = 3, weight = 2, sub = { "대성당 광장", "수도원·사원", "묘지", "순례자 숙소" }, cats = { "public" }, summary = "성당·사원·모스크와 묘지가 있는 구역." },
		{ id = "civic", name = "행정 구역", minLevel = 4, weight = 3, sub = { "시청 광장", "재판소 거리", "세관 지구", "병영" }, cats = { "public" }, summary = "시청, 재판소, 세관이 모인 중심가." },
		{ id = "academy", name = "학술 구역", minLevel = 5, weight = 3, sub = { "대학 지구", "도서관 거리", "인쇄 골목", "천문대 언덕" }, cats = { "public" }, summary = "학교, 도서관, 인쇄소, 천문대가 있는 구역." },
		{ id = "suburb", name = "교외 신도시", minLevel = 6, weight = 4, sub = { "신시가지", "농장 지대", "별장 지구", "외곽 시장" }, cats = { "home", "food" }, summary = "성벽 밖으로 넓어진 새 주택가와 농장." },
	}

	-- 도시 면적(구획 수): 항구가 클수록 구역이 크게 넓어진다. 구역 면적 = 구획 × 가중치 × 레벨 배율, 소구역은 열린 뒤 2레벨마다 하나씩 늘어난다.
	V.BLOCKS_AT = { 4, 10, 24, 48, 90, 160 }
	V.SIZE_NAME = { "촌락", "읍", "소도시", "항구 도시", "대도시", "거대 도시" }
	V.SUB_EVERY = 2

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
		-- [국가 발전 공유 · 2026-11-29 오너: "항구별 국가별 연결"] 같은 나라 다른 항구에서 지은 건물 단계·연구 단계·
		-- 특수 건축물이 이 항구에도 조금(개당 0.5점, 최대 12점) 보탬이 된다. 투자는 공유하지 않는다(그 항구만의 몫).
		local national = 0
		local country = port.country
		if country then
			for otherId, other in D.Ports.Ports do
				if otherId ~= portId and other.country == country then
					for _, chain in D.PortBuildings.Chains do
						national += (S.Build.stageOf(state, otherId, chain.id) or 0) * 0.5
					end
					for _, pts in ((state.portTech or {})[otherId] or {}) do
						for _, need in TECH_STEPS do
							if pts >= need then national += 0.5 end
						end
					end
					for _ in ((state.landmarks or {})[otherId] or {}) do national += 0.5 end
				end
			end
		end
		national = math.min(12, national)
		local score = harborLv * 5 + stages * 3 + tech * 2 + marks * 4 + national
		local level = 1
		for i, need in PORT_LEVEL_AT do
			if score >= need then level = i end
		end
		local opened, nextD, subs = {}, nil, {}
		local wsum = 0
		for _, d in V.Districts do
			if level >= d.minLevel then wsum += d.weight end
		end
		local blocks = V.BLOCKS_AT[level]
		for _, d in V.Districts do
			if level >= d.minLevel then
				local share = math.max(1, math.floor(blocks * d.weight / wsum + 0.5))
				local nsub = math.min(#d.sub, 1 + math.floor((level - d.minLevel) / V.SUB_EVERY))
				for i = 1, nsub do table.insert(subs, d.sub[i]) end
				table.insert(opened, string.format("%s %d구획", d.name, share))
			elseif not nextD then
				nextD = d
			end
		end
		local sim = V.sim(state, portId, level)
		local cultureNames = {}
		for _, b in V.buildings(state, level, portId) do
			if b.cultures then table.insert(cultureNames, b.name) end
		end
		local produces = port.produces or {}
		local rawBy = D.ProductionChains.rawByClass(produces)
		local rawParts = {}
		for _, c in D.ProductionChains.Classes do
			if rawBy[c.id] then table.insert(rawParts, c.name .. " " .. rawBy[c.id]) end
		end
		local crafts = {}
		for _, r in D.ProductionChains.craftable(produces, level) do
			table.insert(crafts, r.output)
		end
		local dfFac, dfJobs, dfBy = V.discFacilities(state, level)
		local jobs, newJobs = {}, {}
		for _, j in V.Jobs do
			if level >= j.minLevel then
				table.insert(jobs, j.name)
				if j.minLevel == level then table.insert(newJobs, j.name) end
			end
		end
		return {
			culture = V.CULTURE_NAME[V.cultureOf(portId) or ""] or "미정", cultureBuildings = cultureNames,
			discFacilities = dfFac, discJobs = dfJobs, discBy = dfBy,
			sim = sim, jobs = jobs, newJobs = newJobs, raw = rawParts, crafts = crafts,
			blocks = blocks, sizeName = V.SIZE_NAME[level], subDistricts = subs,
			districts = opened, nextDistrict = nextD and (nextD.name .. " (Lv." .. nextD.minLevel .. ")") or nil,
			id = portId, name = port.name, score = score, level = level, levelName = LEVEL_NAME[level],
			harbor = harborLv, stages = stages, tech = tech, landmarks = marks, national = national,
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
		-- [실물경제 동기화] 학문 기반 의식주 추정인구와 세계경제의 실제 인구는 다른 지표다.
		-- 실제 주민·건설 장면과 비교할 수 있도록 현재 항구에는 동일한 세계경제 스냅샷을 첨부한다.
		local here = V.portDev(state, state.portId)
		local actual = S.Econ and S.Econ.town(state, state.portId)
		if here and actual then
			local visualLevel = math.clamp(math.floor(((S.Harbor.level(state, state.portId) or 1) + actual.stage) / 2 + 0.5), 1, 5)
			local plot = D.PortBuildings.CityPlots
			here.worldPopulation = actual.pop
			here.worldResidents = actual.residents
			here.worldMood = actual.mood
			here.worldBuildings = actual.buildings
			here.worldVisualLevel = visualLevel
			here.worldPlotScale = plot.plotScale[visualLevel]
			here.worldAreaScale = plot.areaScale[visualLevel]
		end
		return {
			level = level, name = LEVEL_NAME[level], score = score, nextAt = nextAt, nextName = LEVEL_NAME[level + 1],
			built = #built, total = #EB.List, cats = cats, discs = discs,
			ports = V.portList(state), here = here,
		}
	end

	return V
end
