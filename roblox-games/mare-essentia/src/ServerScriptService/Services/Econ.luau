--!nonstrict
-- Econ.luau · 서버 경제시계·학문 연구 확산
-- 살아 있는 세계 경제: Economy(순수 시뮬)를 서버에서 하루씩 돌려 항구마다 인구·발전 단계·직업·번영도를 낸다.
-- 세계는 서버에 하나다. 플레이어의 날짜(state.day)를 따라 한 번에 MAX_CATCHUP 일까지만 따라잡는다(끊김 방지).
-- [세계 공유] 플레이어 저장과 별도인 세계 스냅샷을 선택적으로 연결한다. 통신 실패 시 저장 성공을 가장하지 않는다.

return function(D, S)
	local E = D.Economy
	local X = { handlers = {} }
	local MAX_CATCHUP = 45
	-- [실시간 문명시계] 현실 30분당 게임 경제 1일. 기존 플레이어 날짜는 변경하지 않는다.
	-- 서버 재기동 시 같은 기준 시각·시드에서 재현하며, 원래의 일일 처리량 상한을 보존한다.
	local WORLD_EPOCH_UTC = 1794787200 -- 2026-11-16 00:00 UTC
	local WORLD_DAY_SECONDS = 1800
	local world = nil
	local worldStore, worldOwner = nil, "server"
	local worldRevision, worldDirty = 0, false
	local lastRead, lastWrite = 0, 0
	local WORLD_KEY, PULL_SECONDS, WRITE_SECONDS = "world", 120, 300
	local pendingOps = {}

	-- [영구 세계] Store 인스턴스는 서버 진입점에서 전달하며, 플레이어 DataStore와 절대 섞지 않는다.
	function X.bindStore(store, owner)
		worldStore, worldOwner = store, owner or "server"
	end

	local function ensure(state)
		if not E then return nil end
		if not world then
			if worldStore then
				-- 첫 조회에서 최신 공통 스냅샷을 읽는다. 실패 시 임의 세계를 저장하지 않는다.
				local ok, snapshot = pcall(function() return worldStore:GetAsync(WORLD_KEY) end)
				if not ok then
					-- Roblox DataStore가 비활성화된 스튜디오에서도 기존 경제/항구 화면을 유지한다.
					-- 실패한 세계를 공통 저장소에 올리지 않도록 이 서버에서는 공유 저장만 중단한다.
					worldStore, snapshot = nil, nil
				end
				if snapshot ~= nil then
					world = E.restoreWorld(snapshot)
					if not world then return nil end
					worldRevision = snapshot.revision or 0
				end
				lastRead = os.time()
			end
			if not world then
				world = E.newWorld({ seed = 20260 + (state.startYear or 1650), year = state.startYear or 1650 })
			end
		end
		return world
	end

	-- 플레이어 날짜까지 세계를 진행한다 (일부만 따라잡고 남는 날은 다음 호출에서).
	function X.advance(state)
		local w = ensure(state)
		if not w then return 0 end
		local realDays = math.max(0, math.floor((os.time() - WORLD_EPOCH_UTC) / WORLD_DAY_SECONDS))
		local target = math.max(state.day or 0, realDays)
		local n = math.clamp(target - w.day, 0, MAX_CATCHUP)
		for _ = 1, n do E.step(w) end
		if n > 0 then worldDirty = true end
		return n
	end

	-- 항구 하나의 경제 요약 (View 와 마을 장면이 쓴다). 시뮬이 없으면 nil.
	function X.town(state, portId)
		local w = ensure(state)
		if not w then return nil end
		local t = w.towns[portId]
		if not t then return nil end
		local v = E.visual(t)
		local jobs = E.jobs(t)
		local technology = E.technologyView(t, E.year(w))
		-- 학문명은 기존 백과사전의 활성 학문 이름을 그대로 사용한다.
		if D.KnowledgeTree and D.KnowledgeTree.DisciplineById then
			for _, node in ipairs(technology.rows) do
				local disc = D.KnowledgeTree.DisciplineById[node.discipline]
				node.disciplineName = disc and disc.name or node.discipline
			end
		end
		local specialties = E.specialtyView(t)
		for _, specialty in ipairs(specialties) do
			local disc = specialty.research and D.KnowledgeTree
				and D.KnowledgeTree.DisciplineById[specialty.research]
			specialty.researchName = disc and disc.name or specialty.research
		end
		local industries = E.industryView(t, w)
		local historyEffects = E.activeHistory(w, portId)
		-- [인물 백과] 기존 등장 인물 명칭을 연표 사건과 연결한다.
		if S.People and S.People.all then
			for _, event in ipairs(historyEffects) do
				event.peopleNames = {}
				for _, personId in ipairs(event.people) do
					for _, person in ipairs(S.People.all) do
						if person.id == personId then table.insert(event.peopleNames, person.name); break end
					end
				end
			end
		end
		for _, industry in ipairs(industries) do
			local disc = D.KnowledgeTree and D.KnowledgeTree.DisciplineById[industry.research]
			industry.researchName = disc and disc.name or industry.research
		end
		-- [항구 행정관] 실제 세계 도시 수치와 자동 건설된 건물 현황을 재사용한다.
		local foodDays = math.floor((t.stock.grain or 0) / math.max(t.dem.grain or 0.01, 0.01))
		local issues = {}
		if foodDays < 10 then table.insert(issues, "식량 비축 부족") end
		if t.housingRatio < 0.88 then table.insert(issues, "주택 공급 부족") end
		if t.unemp > 0.15 then table.insert(issues, "실업 증가") end
		if t.stability < 0.45 then table.insert(issues, "사회 불안과 치안 문제") end
		if t.society and t.society.military > 0.2 then table.insert(issues, "전쟁 여파로 군사 긴장") end
		if #issues == 0 then table.insert(issues, "도시 운영 안정") end
		local cityBuildings = {}
		for _, b in ipairs(E.BUILDINGS) do
			table.insert(cityBuildings, { id = b.id, name = b.name, count = math.floor(t.bld[b.id] + 0.5),
				coverage = if b.serves then math.floor((t.cov[b.id] or 0) * 100 + 0.5) else nil })
		end
		local bld, svc = {}, {}
		for _, b in ipairs(E.BUILDINGS) do
			bld[b.id] = math.floor(t.bld[b.id] + 0.5)
			if b.serves then svc[b.id] = math.floor((t.cov[b.id] or 1) * 100 + 0.5) end
		end
		return {
			pop = math.floor(t.pop), stage = t.stage, stageName = v.name, residents = v.residents, buildingScale = v.buildingScale,
			houses = v.houses, perNpc = v.perNpc, districts = v.districts, mood = v.mood, jobs = jobs, facilities = E.facilities(t),
			prosperity = math.floor(t.prosperity * 100 + 0.5), stability = math.floor(t.stability * 100 + 0.5),
			wage = math.floor(t.wage * 100 + 0.5), grainPrice = math.floor(t.price.grain * 10 + 0.5) / 10,
			tech = math.floor((t.tech.agri + t.tech.craft + t.tech.commerce + t.tech.sea + t.tech.medicine + t.tech.gov) / 6 * 100 + 0.5),
			tradeOut = math.floor(t.tradeOut), tradeIn = math.floor(t.tradeIn),
			cycle = math.floor((w.cycle.lvl[t.region] or 0) * 100 + 0.5),
			day = w.day, year = math.floor(E.year(w)), technology = technology, specialties = specialties, industries = industries,
			buildings = bld, housing = { cap = math.floor(E.housingCap(t)), ratio = math.floor(t.housingRatio * 100 + 0.5) },
			work = { jobs = math.floor(E.jobsCap(t)), unemployment = math.floor(t.unemp * 100 + 0.5) },
			service = svc,
			city = { foodDays = foodDays, treasury = math.floor(t.treasury), tradeBalance = math.floor(t.tradeOut - t.tradeIn),
				births = math.floor(t.births), deaths = math.floor(t.deaths), newcomers = math.floor(t.migIn), departures = math.floor(t.migOut),
				issues = issues, buildings = cityBuildings },
			-- [경제·사회·역사 인물] 한 항구의 수치와 실제 발생 사건을 기존 view에 전달한다.
			society = table.clone(t.society), historyEffects = historyEffects,
		}
	end

	-- 교역품 수급 표시: 시뮬 가격이 기준보다 크게 높으면 품귀, 낮으면 풍부 (표시 전용)
	function X.scarcity(state, portId, goodId)
		local w = ensure(state)
		local t = w and w.towns[portId]
		local pr = t and t.price[goodId]
		if not pr then return nil end
		local r = pr / D.Ports.Goods[goodId].basePrice
		if r > 1.35 then return "품귀" elseif r < 0.7 then return "풍부" end
		return nil
	end

	-- 교역 한도: 이 항구에서 지금 살 수 있는/팔 수 있는 수량과 내 한 번 주문 상한. 시뮬이 없으면 nil(제한 없음).
	function X.limits(state, portId, goodId)
		local w = ensure(state)
		local t = w and w.towns[portId]
		if not t or t.stock[goodId] == nil then
			-- 아직 수출되지 않은 브랜드를 아무 항구에서 무제한 매입하는 일을 방지한다.
			if D.ProductionChains and D.ProductionChains.BrandById[goodId] then
				return { supply = 0, absorb = E.MIN_ABSORB }
			end
			return nil
		end
		return { supply = E.tradeSupply(t, goodId), absorb = E.tradeAbsorb(t, goodId) }
	end
	-- [국제 브랜드 시세] 기존 상품 가격은 그대로 둔다. 브랜드만 실물 재고로 움직이는 시세를 최대 10% 반영한다.
	function X.marketFactor(state, portId, goodId)
		if not (D.ProductionChains and D.ProductionChains.BrandById[goodId] and D.Ports) then return 1 end
		local w = ensure(state)
		local t = w and w.towns[portId]
		local good = D.Ports.Goods[goodId]
		if not t or not good or not t.price[goodId] then return 1 end
		local starting = good.basePrice * (if t.produces[goodId] then 0.8 elseif t.demands[goodId] then 1.2 else 1)
		return math.clamp(t.price[goodId] / starting, 0.9, 1.1)
	end
	function X.orderCap(state)
		if not E then return 20 end
		return E.orderCap(state.careers and state.careers.trade and state.careers.trade.level or 1)
	end
	function X.take(state, portId, goodId, n)
		local w = ensure(state)
		local t = w and w.towns[portId]
		if t then
			E.tradeTake(t, goodId, n)
			worldDirty = true
			table.insert(pendingOps, { kind = "take", portId = portId, goodId = goodId, count = n })
		end
	end
	function X.give(state, portId, goodId, n)
		local w = ensure(state)
		local t = w and w.towns[portId]
		if t then
			E.tradeGive(t, goodId, n)
			worldDirty = true
			table.insert(pendingOps, { kind = "give", portId = portId, goodId = goodId, count = n })
		end
	end


	-- [항구 소식 전달] 단 하나의 기존 경제·역사 기록에서 구전/동료/관보/시장 소식을 판정한다.
	-- 뉴스는 경제 원장과 플레이어 세계 기록을 읽기만 한다. 별도 저장·새 원격 호출은 없다.
	local NEWS_CATEGORIES = {
		{ id = "military", name = "군사", tokens = { "전쟁", "해전", "해적", "군사", "봉쇄", "war", "battle" } },
		{ id = "diplomacy", name = "외교", tokens = { "외교", "조약", "동맹", "평화", "treaty" } },
		{ id = "politics", name = "정치", tokens = { "정치", "혁명", "왕정", "왕위", "독립", "반란", "봉기", "revolution" } },
		{ id = "disaster", name = "재난", tokens = { "재난", "전염병", "역병", "기근", "자연재해", "지진", "화재", "가뭄", "폭풍", "disaster", "plague", "famine" } },
		{ id = "religion", name = "종교", tokens = { "종교", "신앙", "선교", "faith", "church" } },
		{ id = "culture", name = "문화", tokens = { "문화", "예술", "극장", "축제", "culture" } },
		{ id = "science", name = "과학", tokens = { "학문", "과학", "발명", "의학", "기술", "science" } },
		{ id = "industry", name = "산업", tokens = { "산업", "공장", "건설", "식민", "광산", "industry" } },
		{ id = "navigation", name = "항해", tokens = { "항해", "탐험", "난파", "항로", "navigation" } },
		{ id = "society", name = "사회", tokens = { "사회", "이주", "민란", "구호", "빈곤", "society" } },
		{ id = "economy", name = "경제", tokens = { "경제", "교역", "금융", "무역", "시장", "호황", "행운", "호재", "finance", "trade" } },
	}
	local NEWS_CAREERS = { politics = "adventure", diplomacy = "adventure", military = "battle",
		economy = "trade", industry = "trade", science = "adventure", culture = "adventure",
		religion = "adventure", disaster = "adventure", society = "adventure", navigation = "adventure" }
	local NEWS_DISC = {
		military = { "shipbuilding", "history", "physics" }, diplomacy = { "history", "political_science", "linguistics" },
		politics = { "history", "political_science" }, religion = { "history", "philosophy", "religious_studies" },
		culture = { "art", "linguistics", "history" }, science = { "physics", "medicine", "astronomy", "history" },
		industry = { "crafts", "shipbuilding", "architecture", "mineralogy" }, navigation = { "navigation", "geography" },
		disaster = { "medicine", "meteorology", "geography" }, society = { "medicine", "history" },
		economy = { "commerce", "economics" },
	}
	local function newsClass(kind, id)
		local label = tostring(kind or "") .. " " .. tostring(id or "")
		for _, cat in ipairs(NEWS_CATEGORIES) do
			for _, token in ipairs(cat.tokens) do
				if string.find(label, token, 1, true) then return cat.id, cat.name end
			end
		end
		return "city", "도시"
	end

	local function pressAt(state, w, town)
		local year = E.year(w)
		local region = town.region
		local school = town.bld and (town.bld.school or 0) or 0
		local literacy = school >= 1 and town.stage >= 3
		local culturalPrint = (region == "europe" and year >= 1605)
			or (region == "new_world" and year >= 1704)
			or (region == "indian" and year >= 1780)
			or (region ~= "europe" and region ~= "new_world" and region ~= "indian" and year >= 1820)
		local gazette = region == "far_east" and year >= 1500 and literacy
		local newspaper = culturalPrint and literacy and (town.stage >= 4 or year >= 1750)
		local press = newspaper or gazette
		return { available = press, medium = if newspaper then "항구 신문" elseif gazette then "관보·회보" else "구전·상인 통신문",
			year = math.floor(year), printing = literacy and (year >= 1500 or region == "far_east") }
	end

	local function newsExpertise(state, category)
		local careerId = NEWS_CAREERS[category] or "adventure"
		local career = state.careers and state.careers[careerId]
		local level = career and career.level or 1
		local intel = S.Harbor and S.Harbor.intel and S.Harbor.intel(state) or 0
		local strength = math.clamp(math.floor((level - 1) / 6) + math.floor(intel / 2), 0, 3)
		local bestName, bestFit = nil, 0
		for _, id in ipairs(state.companions or {}) do
			local who = D.Specialties and D.Specialties.CompanionById and D.Specialties.CompanionById[id]
			if who then
				local fit = 0
				for _, d in ipairs(who.disciplines or {}) do
					if table.find(NEWS_DISC[category] or {}, d) then fit += 1 end
				end
				if fit > bestFit then bestFit, bestName = fit, who.name end
			end
		end
		return math.clamp(strength + math.min(bestFit, 2), 0, 4), bestName
	end

	-- 항해권별 거리와 교역로의 단순 전달 시간. 중대 사건 외에는 원거리 자동 열람을 차단한다.
	local function newsRoute(town, row)
		local p = D.Ports.Ports[town.id]
		local regions, countries, ports = row.regions, row.countries, row.ports
		local home = ports and ports[1] and D.Ports.Ports[ports[1]]
		local localPort = ports and table.find(ports, town.id) ~= nil
		local sameCountry = countries and table.find(countries, town.country) ~= nil
		local sameRegion = regions and table.find(regions, town.region) ~= nil
		if home then
			sameCountry = sameCountry or home.country == town.country
			sameRegion = sameRegion or D.Regions.of(home).id == town.region
		end
		local distance = 0
		if home and p then
			local a, b = math.rad(p.lat), math.rad(home.lat)
			local diff = math.rad(p.lon - home.lon)
			distance = 6371 * math.acos(math.clamp(math.sin(a) * math.sin(b) + math.cos(a) * math.cos(b) * math.cos(diff), -1, 1))
		end
		local scope = if localPort then "port" elseif sameCountry then "country"
			elseif sameRegion then "region" else "foreign"
		local delay = if scope == "port" then 0 elseif scope == "country" then 6 + distance / 280
			elseif scope == "region" then 12 + distance / 240 else 52 + distance / 210
		return scope, math.floor(delay), home
	end

	-- source: tavern(구전), companion(직업별 정보), gazette(신문·관보).
	function X.bulletins(state, source)
		local w = ensure(state)
		local t = w and w.towns[state.portId]
		if not t then return { available = false, medium = "소식 없음", rows = {}, categories = {} } end
		local press = pressAt(state, w, t)
		local paper = source == "gazette"
		if paper and not press.available then
			return { available = false, medium = press.medium, printing = press.printing, rows = {}, categories = {} }
		end
		if source == "companion" and #(state.companions or {}) == 0 then
			return { available = false, medium = "동료 없음", rows = {}, categories = {} }
		end
		local result = { available = true, medium = if paper then press.medium
			elseif source == "companion" then "동료 정보" else "주점·상인 소문",
			printing = press.printing, rows = {}, categories = {} }
		local present, seen = {}, {}
		local channels = { { rows = w.log, day = w.day, region = nil }, { rows = state.world and state.world.log or {}, day = state.day, region = true } }
		for _, channel in ipairs(channels) do
			for i, row in ipairs(channel.rows) do
				if i > 60 or #result.rows >= 10 then break end
				local rec = row
				if channel.region then
					local regionId = row.regionId
					if not regionId then
						for _, region in ipairs(D.Regions.List) do
							if row.region == region.name then regionId = region.id; break end
						end
					end
					end
					rec = { id = row.id or row.title, title = row.title, kind = row.tag or row.kind, day = row.day,
						regions = regionId and { regionId } or nil, ports = row.port and { row.port } or nil }
				end
				local age = channel.day - (rec.day or channel.day)
				local key = tostring(rec.id) .. ":" .. tostring((rec.ports and rec.ports[1]) or (rec.regions and rec.regions[1]) or "")
				if age >= 0 and age <= 500 and not seen[key] then
					local category, name = newsClass(rec.kind, rec.id)
					local importance = category == "military" or category == "diplomacy" or (category == "politics" and (string.find(tostring(rec.kind), "혁명", 1, true) or string.find(tostring(rec.id), "independence", 1, true)))
					local scope, delay, home = newsRoute(t, rec)
					local network = (home and state.stats and state.stats.visited and state.stats.visited[home.id]) ~= nil
					local expertise, companionName = newsExpertise(state, category)
					if paper then delay = math.max(0, math.floor(delay * 0.75)) end
					if source == "tavern" then delay += 2 end
					if (category == "military" or category == "disaster") and scope == "foreign" then delay += 12 end
					local distant = scope == "foreign"
					local reached = age >= delay
					local allowed = not distant or importance or (paper and expertise >= 3 and network)
					if distant and source == "tavern" and not importance and not network then allowed = false end
					if source == "companion" and distant and not importance and not network then allowed = false end
					if reached and allowed then
						local confidence = if paper then "공식 보도" elseif scope == "port" then "현지 목격"
							elseif expertise >= 2 or network then "복수 전언" else "미확인 소문"
						local detail = if expertise >= 3 then "연결된 교역망과 시대·사건 기록 대조"
							elseif expertise >= 1 then "직업·항해 경험으로 출처를 대조" else "전달자 확인 전"
						if source == "companion" and companionName then detail = companionName .. "의 전문 분야 의견" end
						table.insert(result.rows, { id = tostring(rec.id), title = rec.title or tostring(rec.id),
							category = category, categoryName = name, daysOld = math.floor(age), source = result.medium,
							confidence = confidence, detail = detail, region = scope, eventId = rec.sourceEvent or rec.id,
							qid = if expertise >= 2 or paper then rec.qid else nil })
						if not present[category] then present[category] = true; table.insert(result.categories, name) end
						seen[key] = true
					end
				end
			end
		end
		end
		return result
	end

	-- [시장 정보] 사건 시각이 없는 기존 시세 이벤트는 지역 내부에서만 전파한다.
	function X.marketNewsVisible(state, portId)
		local a, b = D.Ports.Ports[state.portId], D.Ports.Ports[portId]
		if not a or not b then return false end
		if a.id == b.id then return true end
		if a.country == b.country or D.Regions.of(a).id == D.Regions.of(b).id then
			return (state.careers and state.careers.trade and state.careers.trade.level or 1) >= 3
				or (S.Harbor and S.Harbor.intel and S.Harbor.intel(state) or 0) >= 1
		end
		return false
	end

	-- 해역·나라·세계 집계 (신문·거시 화면용)
	function X.macro(state, kind, id)
		local w = ensure(state)
		if not w then return nil end
		local a = E.aggregate(w, kind, id)
		return { pop = math.floor(a.pop), gdp = math.floor(a.gdp), gdpPerCap = math.floor(a.gdpPerCap * 10) / 10, priceIdx = math.floor(a.priceIdx * 100), trade = math.floor(a.tradeOut), tech = math.floor(a.techAvg * 100), stability = math.floor(a.stability * 100), towns = a.towns, society = a.society }
	end

	-- 게임의 세계 이벤트가 일어나면 경제 충격으로 넣는다.
	function X.shock(state, ev, regionId)
		local w = ensure(state)
		if not w then return false end
		-- [공통 세계 시간] 개인 진행 연도가 다른 서버의 역사 재해를 잘못 전파하지 않는다.
		if ev.year then
			local at = ev.year + ((ev.month or 1) - 1) / 12
			local current = E.year(w)
			if at > current + 0.08 or at + 1 < current then return false end
		end
		if not E.addShock(w, E.shockFromEvent(ev, regionId)) then return false end
		worldDirty = true
		table.insert(pendingOps, { kind = "shock", event = ev, regionId = regionId })
		return true
	end

	-- 지식카드(학문) → 마을 경제 기술 분야. 한 학문이 여러 분야에 가중치로 퍼진다.
	local DISC_TECH = {
		botany = { agri = 1 }, zoology = { agri = 0.6 }, chemistry = { agri = 0.4, craft = 0.6 },
		architecture = { craft = 1 }, mineralogy = { craft = 0.8 }, physics = { craft = 0.7 }, art = { craft = 0.4, gov = 0.3 },
		commerce = { commerce = 1 }, linguistics = { commerce = 0.5, gov = 0.5 }, philosophy = { gov = 0.5, commerce = 0.2 },
		geography = { sea = 0.7 }, navigation = { sea = 1 }, astronomy = { sea = 0.5 }, meteorology = { sea = 0.6, agri = 0.3 }, shipbuilding = { sea = 0.8, craft = 0.3 },
		medicine = { medicine = 1 },
		history = { gov = 0.8 }, archaeology = { gov = 0.4 }, mythology = { gov = 0.2 },
		-- [승격 학문] 57개 학문 각각이 기존 6대 문명 기술에 직접 기여한다.
		mystery = { gov = 0.15, sea = 0.15 }, lostland = { sea = 0.4 },
		philology = { commerce = 0.25, gov = 0.35 }, ethics = { gov = 0.5 },
		religious_studies = { gov = 0.45 }, law = { gov = 1, commerce = 0.2 },
		political_science = { gov = 1 }, biology = { agri = 0.5, medicine = 0.3 },
		mathematics = { craft = 0.45, sea = 0.3 }, geometry = { craft = 0.55 },
		trigonometry = { sea = 0.8, craft = 0.25 }, geology = { craft = 0.6 },
		oceanography = { sea = 0.9 }, ecology = { agri = 0.65 },
		optics = { sea = 0.35, craft = 0.45 }, mechanics = { craft = 0.9 },
		civil_engineering = { craft = 0.85, gov = 0.2 }, metallurgy = { craft = 1 },
		pharmacology = { medicine = 0.95 }, public_health = { medicine = 1, gov = 0.2 },
		agronomy = { agri = 1 }, cartography = { sea = 1 },
		military_science = { gov = 0.65, sea = 0.2 }, historiography = { gov = 0.65 },
		anthropology = { gov = 0.4, commerce = 0.25 }, economics = { commerce = 0.9, gov = 0.25 },
		painting = { craft = 0.4, commerce = 0.1 }, sculpture = { craft = 0.55 },
		brewing = { agri = 0.25, craft = 0.55 }, textiles = { craft = 0.75, commerce = 0.2 },
		crafts = { craft = 0.9 }, sailing_craft = { sea = 0.9 },
		trade_craft = { commerce = 0.9 }, forestry = { agri = 0.5, craft = 0.3 },
		mining = { craft = 0.9 }, paleontology = { agri = 0.15, craft = 0.2 },
		gunnery = { craft = 0.5, sea = 0.4 }, naval_warfare = { sea = 0.65, gov = 0.3 },
	}
	X.DISC_TECH = DISC_TECH
	local TEACH_STEP = 0.02 -- 카드 1점당 기술 상승 (희귀도가 점수)
	-- 항구에서 지식카드를 보고하면 그 마을 기술이 오르고, 같은 나라(25%)와 같은 해역(10%) 마을로 번진다.
	function X.teach(state, portId, discId, points)
		local w = ensure(state)
		local map = DISC_TECH[discId]
		local town = w and w.towns[portId]
		if not map or not town then return nil end
		for _, t in pairs(w.towns) do
			local share = if t == town then 1 elseif t.country == town.country then 0.25 elseif t.region == town.region then 0.1 else 0
			if share > 0 then
				for f, wt in pairs(map) do
					t.tech[f] += TEACH_STEP * (points or 1) * wt * share / (t.tech[f] ^ 0.3)
				end
				-- 학자의 연구가 마지막 채택 조건을 채웠다면 그 도시에서 곧바로 실용화한다.
				E.adoptTechnologies(t, E.year(w))
			end
		end
		worldDirty = true
		table.insert(pendingOps, { kind = "teach", portId = portId, discipline = discId, points = points })
		return town
	end

	-- [서버 간 공유] 일정 주기로만 UpdateAsync를 써서 요청량을 제한한다.
	-- 더 새 기록이 들어온 충돌에서는 뒤처진 세계로 덮지 않고, 미반영 교역·연구 사건만 최신 세계에 재적용한다.
	function X.sync(state, force)
		if not worldStore then return false end
		local w = ensure(state)
		if not w then return false end
		local now = os.time()
		if worldDirty and (force == true or now - lastWrite >= WRITE_SECONDS) then
			local candidate = E.snapshot(w)
			candidate.revision = worldRevision + 1
			candidate.writer = worldOwner
			local conflict = nil
			local ok, saved = pcall(function()
				return worldStore:UpdateAsync(WORLD_KEY, function(current)
					if current ~= nil and (type(current) ~= "table" or current.schema ~= E.WORLD_SCHEMA) then
						return nil
					end
					local oldRevision = current and current.revision or 0
					if type(oldRevision) ~= "number" or oldRevision > worldRevision then
						conflict = current
						return nil
					end
					candidate.revision = oldRevision + 1
					return candidate
				end)
			end)
			if ok and type(saved) == "table" and saved.writer == worldOwner
				and saved.revision == candidate.revision then
				worldRevision = candidate.revision
				worldDirty = false
				pendingOps = {}
				lastWrite, lastRead = now, now
				return true
			end
			if ok and conflict then
				local latest = E.restoreWorld(conflict)
				if latest then
					-- [서버 간 경제] 다른 서버의 새 판본이 먼저 저장되어도
					-- 이 서버에서 이미 경과한 경제 일수를 버리지 않고 최신 판본에서 재계산한다.
					-- 최대 45일만 반영해 기존 CPU·저장 예산 상한을 보존한다.
					local daysToRebase = math.clamp(w.day - latest.day, 0, MAX_CATCHUP)
					for _ = 1, daysToRebase do E.step(latest) end
					world, worldRevision = latest, conflict.revision
					local replay = pendingOps
					pendingOps = {}
					worldDirty = true
					for _, op in ipairs(replay) do
						if op.kind == "take" then X.take(state, op.portId, op.goodId, op.count)
						elseif op.kind == "give" then X.give(state, op.portId, op.goodId, op.count)
						elseif op.kind == "teach" then X.teach(state, op.portId, op.discipline, op.points)
						elseif op.kind == "shock" then X.shock(state, op.event, op.regionId) end
					end
					lastRead = now
				end
			end
			-- 저장 요청 제한은 유지한다. 경합 때는 2분 후 다시 시도해
			-- 활동 중인 여러 서버가 5분씩 계속 기회를 놓치는 일을 줄인다.
			lastWrite = if conflict then now - WRITE_SECONDS + PULL_SECONDS else now
			return false
		end
		if not worldDirty and now - lastRead >= PULL_SECONDS then
			local ok, snapshot = pcall(function() return worldStore:GetAsync(WORLD_KEY) end)
			lastRead = now
			if not ok then return false end
			if type(snapshot) == "table" and type(snapshot.revision) == "number"
				and snapshot.revision > worldRevision then
				local latest = E.restoreWorld(snapshot)
				if not latest then return false end
				world, worldRevision = latest, snapshot.revision
			end
		end
		return true
	end

	function X.reset()
		world, worldRevision, worldDirty = nil, 0, false
		lastRead, lastWrite, pendingOps = 0, 0, {}
	end
	return X
end
