local Eco = require("./Shared/Economy")
local passed, failed = 0, 0
local function check(name, cond, detail)
	if cond then passed += 1 else failed += 1; print("FAIL: " .. name .. (detail and (" -> " .. tostring(detail)) or "")) end
end

local w = Eco.newWorld({ seed = 7, year = 1650 })
local n = 0
for _ in pairs(w.towns) do n += 1 end
check("모든 항구가 마을로 생성", n > 150, n)
local pop0 = Eco.aggregate(w, "world").pop
Eco.run(w, 365 * 5)
local ag = Eco.aggregate(w, "world")
check("5년 뒤에도 수치가 유한", ag.pop == ag.pop and ag.gdp == ag.gdp and ag.pop > 0 and ag.pop < math.huge, ag.pop)
check("인구가 폭주/붕괴하지 않는다", ag.pop > pop0 * 0.5 and ag.pop < pop0 * 3, ag.pop / pop0)
local lo, hi = 9, 0
for _, t in pairs(w.towns) do
	for _, g in ipairs(t.goods) do
		local r = t.price[g] / (g == "grain" and 10 or require("./Shared/Ports").Goods[g].basePrice)
		lo = math.min(lo, r); hi = math.max(hi, r)
	end
end
check("가격이 범위 안", lo >= 0.39 and hi <= 3.01, lo .. "/" .. hi)
check("무역이 일어난다", ag.tradeIn > 0)
-- 결정적
local a, b = Eco.newWorld({ seed = 3 }), Eco.newWorld({ seed = 3 })
Eco.run(a, 200); Eco.run(b, 200)
check("같은 시드 → 같은 결과", math.abs(Eco.aggregate(a, "world").gdp - Eco.aggregate(b, "world").gdp) < 1e-6)
-- 기근 충격: 인구가 줄고 곡물 가격이 오른다
do
	local x, y = Eco.newWorld({ seed = 5, year = 1650 }), Eco.newWorld({ seed = 5, year = 1650 })
	Eco.run(x, 30); Eco.run(y, 30)
	Eco.addShock(x, { id = "t", title = "t", ports = { "london" }, food = 0.2, prod = 1, trade = 0.3, demand = 1, mort = 0.002, days = 300 })
	Eco.run(x, 300); Eco.run(y, 300)
	check("기근·역병 충격 → 인구 감소", x.towns.london.pop < y.towns.london.pop * 0.9, x.towns.london.pop .. " vs " .. y.towns.london.pop)
	check("곡물 값이 오른다", x.towns.london.price.grain > y.towns.london.price.grain)
end
-- 역사 사건: 시작 연도에 진행 중인 사건이 켜진다
do
	local h = Eco.newWorld({ year = 1625 })
	local found = false
	for _, s in ipairs(h.shocks) do if s.id == "thirty_years" then found = true end end
	check("1625년엔 30년 전쟁 진행 중", found)
	local z = Eco.newWorld({ year = 1664 })
	Eco.run(z, 366)
	local seen = false
	for _, l in ipairs(z.log) do if l.id == "london_plague" then seen = true end end
	check("1665년이 되면 런던 대역병 발생", seen)
end
-- [역사 백과사전 ↔ 공유 경제] 인물·정치·문화·종교를 실제 항구 사회 변화로 연결.
do
	local x = Eco.newWorld({ seed = 50, year = 1688 })
	local initiallyActive = false
	for _, item in ipairs(x.shocks) do if item.id == "civil_glorious_revolution" then initiallyActive = true end end
	check("실제 연표 월 전에는 사건이 적용되지 않음", not initiallyActive and not x.fired.civil_glorious_revolution)
	Eco.run(x, 320)
	local seen = {}
	for _, ev in ipairs(x.shocks) do seen[ev.id] = ev end
	check("명예혁명 공유 경제 연동", seen.civil_glorious_revolution ~= nil)
	check("검증된 공개 백과사전 항목 식별자", seen.civil_glorious_revolution and seen.civil_glorious_revolution.qid == "Q189508")
	check("연표 인물·원본 사건 연결", seen.civil_glorious_revolution
		and seen.civil_glorious_revolution.sourceEvent == "glorious_revolution"
		and type(seen.civil_glorious_revolution.people) == "table")
	local london, paris = x.towns.london, x.towns.paris
	Eco.run(x, 35)
	check("혁명·금융 영향은 해당 국가에 집중", london.society.civic > 0.01 and paris.society.civic < 0.001)
	check("도시마다 백과 연결 사건 조회", #Eco.activeHistory(x, "london") > 0)
	check("해당되지 않는 도시의 사회금융 효과는 없음", paris.society.finance == 0)
	local snap, y = Eco.snapshot(x), nil
	y = Eco.restoreWorld(snap)
	check("기존 스키마 유지·사회 상태 복구", snap.schema == 1 and y
		and y.towns.london.society.civic == london.society.civic and #y.log == #x.log)
	local count = #x.shocks
	local event = { id = "custom_storm", title = "storm", tag = "자연재해", days = 50 }
	local first = Eco.addShock(x, Eco.shockFromEvent(event, "europe"))
	local second = Eco.addShock(x, Eco.shockFromEvent(event, "europe"))
	check("다중 접속 중복 경제충격 방지", first == true and second == false and #x.shocks == count + 1)
	check("다른 지역의 같은 사건은 독립 반영", Eco.addShock(x, Eco.shockFromEvent(event, "indian")) == true)
end
-- 호황/불황 진동
do
	local c = { seed = 11, cycle = { x = 0, v = 0, lvl = {}, reg = { europe = { x = 0, v = 0 } } } }
	local mn, mx = 1, -1
	for _ = 1, 365 * 30 do Eco.stepCycle(c); mn = math.min(mn, c.cycle.x); mx = math.max(mx, c.cycle.x) end
	check("경기 순환이 오르내린다", mn < -0.1 and mx > 0.1, mn .. "/" .. mx)
end
-- 문명: 기술이 자라고 시설·안정도가 유한
do
	local t = w.towns.amsterdam
	check("기술이 시작값보다 오른다", t.tech.agri > 0.9 and t.civ > 0, t.tech.agri)
	local ag2 = Eco.aggregate(w, "world")
	check("집계: 기술·안정도", ag2.techAvg > 0.5 and ag2.stability > 0 and ag2.stability <= 1, ag2.stability)
	local sec = ag2.sector
	check("부문별 GDP 양수", sec.agri > 0 and sec.industry > 0 and sec.service > 0)
end
-- 직업·외형·집계
do
	local t = w.towns.london
	local jobs = Eco.jobs(t)
	local sum = 0
	for _, v in pairs(jobs) do sum += v end
	check("직업 합 = 인구", math.abs(sum - math.floor(t.pop)) <= 2, sum .. "/" .. t.pop)
	check("NPC 직업 배정", Eco.npcJob(t, 1, 20) == "farmer" and Eco.npcJob(t, 20, 20) == "laborer")
	local v = Eco.visual(t)
	check("외형 값", v.residents >= 6 and v.buildingScale > 0.8)
	check("시설에 농장·시장", table.find(Eco.facilities(t), "farm") ~= nil)
	check("국가 집계", Eco.aggregate(w, "country", "england").towns == 3)
	check("해역 집계", Eco.aggregate(w, "region", "europe").towns > 10)
end
-- 이벤트 변환
do
	local s = Eco.shockFromEvent({ id = "famine", tag = "기근", title = "흉작", days = 70 }, "europe")
	check("기근 이벤트 → 식량 충격", s.food < 1 and s.days == 70)
end
-- 건축물: 주거·생산·서비스가 인구를 따라간다
do
	local t = w.towns.amsterdam
	local ratio = Eco.housingCap(t) / t.pop
	check("주거 수용력이 인구와 비슷", ratio > 0.7 and ratio < 1.5, ratio)
	check("일자리 수가 양수", Eco.jobsCap(t) > 0 and t.unemp >= 0 and t.unemp <= 0.6, t.unemp)
	local x = Eco.newWorld({ seed = 9, year = 1650 })
	local tx = x.towns.london
	tx.treasury = 0; tx.pop = tx.pop * 1.5 -- 갑자기 늘어난 인구: 집이 모자란다
	local h0 = tx.bld.house
	Eco.run(x, 120)
	check("인구가 늘면 집을 더 짓는다", tx.bld.house > h0, tx.bld.house .. "/" .. h0)
	check("건설 기록", tx.buildSpend >= 0)
end
-- 100만 도시: 숫자로만 돈다. 보이는 주민은 표본 60명 이하
do
	local x = Eco.newWorld({ seed = 4, year = 1650 })
	local t = x.towns.london
	t.pop = 1000000; Eco.initBuildings(t); t.stage = Eco.stageOfPop(t.pop)
	Eco.run(x, 30)
	local v = Eco.visual(t)
	check("100만 → 메가시티", t.stage == 6 and v.name == "메가시티", t.stage)
	check("표본 주민 ≤ 60, 한 명이 수만 명 대표", v.residents <= 60 and v.perNpc > 10000, v.residents .. "/" .. v.perNpc)
	local sum = 0
	for _, d in ipairs(v.districts) do sum += d.pop end
	check("구역 인구 합 ≈ 인구", math.abs(sum - t.pop) / t.pop < 0.02 and #v.districts == 6, sum)
	check("집 10만 채 규모를 숫자로", t.bld.house > 50000, t.bld.house)
end
-- 문명 기술 트리: 연도·선행 연구·지역 자원·도시 규모·국고가 실제 채택을 결정한다.
do
	local branchIds = {}
	for _, node in ipairs(Eco.CIVIL_TECH) do
		check("발명 고유 식별자 " .. node.id, not branchIds[node.id] and Eco.CIVIL_TECH_BY_ID[node.id] == node)
		branchIds[node.id] = true
		for _, dep in ipairs(node.requires or {}) do
			check("선행 발명이 먼저 존재 " .. node.id, branchIds[dep] == true, dep)
		end
	end
	local c = Eco.newWorld({ seed = 19, year = 1650 })
	local t = c.towns.london
	t.stage = 3
	t.tech.agri, t.tech.commerce, t.tech.sea = 2, 2, 2
	t.tech.craft, t.tech.medicine, t.tech.gov = 2, 2, 2
	t.treasury = 20000
	local count = Eco.adoptTechnologies(t, 1700)
	check("마을 연구 성과 → 기술 자동 실용화", count > 0 and t.civTech.crop_rotation and t.civTech.guild_accounting and t.civTech.merchant_banking, count)
	check("1712년 전 증기기관 도입 차단", not t.civTech.steam_pumping and Eco.technologyStatus(t, Eco.CIVIL_TECH_BY_ID.steam_pumping, 1700) == "future")
	local treasury = t.treasury
	local second = Eco.adoptTechnologies(t, 1700)
	check("기술 재채택 비용·효과 중복 없음", second == 0 and t.treasury == treasury, second)
	t.produces.coal, t.stock.coal = nil, nil
	Eco.adoptTechnologies(t, 1712)
	check("광산 증기기관은 자원 없으면 미실용화", Eco.technologyStatus(t, Eco.CIVIL_TECH_BY_ID.steam_pumping, 1712) == "resource")
	t.stock.coal = 10
	Eco.adoptTechnologies(t, 1712)
	check("석탄 공급 후 증기기관 확산", t.civTech.steam_pumping and t.civBonus.craft > 1)
	local view = Eco.technologyView(t, 1712)
	check("도시 백과 기술 트리 조회", view.total == #Eco.CIVIL_TECH and view.adopted > 0 and #view.rows == view.total and view.year == 1712)
	local other = c.towns.amsterdam
	check("마을별 기술 채택은 독립", other.civTech.steam_pumping ~= true)
	t.stage = 4
	t.stock.iron = nil
	t.produces.iron = nil
	Eco.adoptTechnologies(t, 1770)
	check("산업 야금은 철 공급을 확인", Eco.technologyStatus(t, Eco.CIVIL_TECH_BY_ID.industrial_metallurgy, 1770) == "resource")
	t.stock.iron = 10
	Eco.adoptTechnologies(t, 1770)
	check("후기 산업 발명 선행 기술 연결", t.civTech.industrial_metallurgy and t.civBonus.craft > 1.06)
end

-- [공통 세계 지속성] 서버 재기동과 다른 서버에서도 같은 도시 발전·가격·발명을 이어받는다.
do
	local source = Eco.newWorld({ seed = 18, year = 1650 })
	Eco.run(source, 15)
	local london = source.towns.london
	london.civTech.crop_rotation = true
	london.civBonus.food = 1.02
	local snapshot = Eco.snapshot(source)
	check("세계 스냅샷 형식·항구 수", snapshot.schema == 1 and snapshot.day == 15 and snapshot.towns.london ~= nil)
	local restored = Eco.restoreWorld(snapshot)
	check("세이브 후 시각·인구·주가 아닌 실물가격 복구",
		restored and restored.day == source.day and math.abs(restored.towns.london.pop - london.pop) < 1e-6
		and restored.towns.london.price.grain == london.price.grain)
	check("발명·효과 보존", restored and restored.towns.london.civTech.crop_rotation and restored.towns.london.civBonus.food == 1.02)
	check("비정상 스냅샷 차단", Eco.restoreWorld({ schema = 99, day = 0, seed = 7, startYear = 1650, towns = {} }) == nil)
	Eco.run(restored, 4)
	check("복원 후 경제 연속 진행", restored.day == 19 and restored.towns.london.pop > 0)

	local t = source.towns.amsterdam
	local id = require("./Shared/Ports").Ports.amsterdam.produces[1]
	t.stage, t.prosperity, t.tech.craft, t.tech.agri = 5, 1.2, 2.1, 2.1
	t.civBonus.trade = 1.08
	check("산업 발달에 따라 지역 특산품 단계 상승", Eco.specialtyLevel(t, id) == 4)
	local goods = Eco.specialtyView(t)
	check("특산 경제 화면에 실제 교역품·재고·시세 반영",
		#goods > 0 and goods[1].stock >= 0 and goods[1].price > 0 and goods[1].industry ~= nil)
	check("다른 항구 생산품은 특산품으로 오인하지 않음", Eco.specialtyLevel(t, "__missing__") == 0)
end

-- 저장소 권한이 없어도 기존 지역 경제 조회는 중단되지 않는다.
do
	local offline = { GetAsync = function() error("DataStore disabled") end }
	local server = require("./Services/Econ")({ Economy = Eco }, {})
	server.bindStore(offline, "offline")
	check("저장소 불가 시 기존 경제 조회 유지", server.town({ startYear = 1650, day = 0 }, "london") ~= nil)
	check("저장 불가 환경에서 공동 세계 저장 중단", server.sync({ startYear = 1650, day = 0 }) == false)
end

-- [서버 간 저장] 동일 데이터 저장소를 쓰는 두 서버가 같은 세계를 읽고 최신 판본을 덮지 않는다.
do
	local memory = { value = nil }
	function memory:GetAsync(key)
		check("공통 세계 저장 키 재사용", key == "world")
		return self.value
	end
	function memory:UpdateAsync(key, transform)
		-- [DataStore 동작] 변환 함수가 nil을 반환하면 현재 저장값을 보존하고 쓰기만 취소한다.
		local nextValue = transform(self.value)
		if nextValue ~= nil then self.value = nextValue end
		return nextValue
	end
	local Server = require("./Services/Econ")
	local a = Server({ Economy = Eco }, {})
	local b = Server({ Economy = Eco }, {})
	a.bindStore(memory, "server-a")
	b.bindStore(memory, "server-b")
	local stA, stB = { startYear = 1650, day = 35 }, { startYear = 1700, day = 0 }
	a.advance(stA)
	check("최초 세계 저장", a.sync(stA) and memory.value and memory.value.revision == 1)
	local shared = b.town(stB, "london")
	check("서버 재접속 시 기존 세계 연도·날짜 공유", shared and shared.day == 35 and shared.year == 1650)
	local before = shared.tech
	b.teach(stB, "london", "navigation", 10)
	check("연구가 공유 세계에 적용", b.sync(stB) and memory.value.revision == 2)
	a.reset()
	local pulled = a.town(stA, "london")
	check("다른 서버의 학문 연구를 최신 세계에서 읽음", pulled and pulled.tech > before)
	local c, d = Server({ Economy = Eco }, {}), Server({ Economy = Eco }, {})
	c.bindStore(memory, "server-c")
	d.bindStore(memory, "server-d")
	c.town(stB, "london")
	d.town(stB, "london")
	c.teach(stB, "london", "physics", 6)
	d.teach(stB, "london", "botany", 6)
	check("선행 서버의 새 판본 저장", c.sync(stB) and memory.value.revision == 3)
	local latest = memory.value.revision
	check("동시 충돌은 과거 세계 덮기 금지", d.sync(stB) == false and memory.value.revision == latest)
	check("충돌한 연구 사건을 최신 서버 세계에 다시 적용", d.town(stB, "london").tech > pulled.tech)
	check("종료 강제 저장은 충돌을 복구한 연구를 보존", d.sync(stB, true) and memory.value.revision == latest + 1)
end

-- [지역 산업망] 백과 가공법·원산지 브랜드·해외 항구·원료 보존 검증.
do
	local Ports = require("./Shared/Ports")
	local Chains = require("./Shared/ProductionChains")
	local found = 0
	for _, brand in ipairs(Chains.Brands) do
		local port = Ports.Ports[brand.port]
		local recipe = Chains.ById[brand.recipe]
		local id = Chains.brandId(brand)
		local valid = port ~= nil and recipe ~= nil and Ports.Goods[id] ~= nil
			and table.find(port.produces, brand.source) ~= nil
			and table.find(port.produces, Chains.goodId(recipe)) ~= nil
			and table.find(port.produces, id) ~= nil
		check("지역 브랜드 원료·가공·명품 완성 " .. id, valid == true)
		if valid then
			found += 1
			for _, dest in ipairs(brand.destinations) do
				check("국제 수출 수요 등록 " .. brand.port .. "→" .. dest,
					Ports.Ports[dest] ~= nil and table.find(Ports.Ports[dest].demands, id) ~= nil)
			end
		end
	end
	check("기존 지역 생산 기반 브랜드 15종", found == 15, found)

	local x = Eco.newWorld({ seed = 117, year = 1700 })
	local t = x.towns.london
	local brand = Chains.BrandsByPort.london[1]
	local finished = Chains.goodId(Chains.ById[brand.recipe])
	check("브랜드 미개발 시 공짜 가공품·브랜드 재고 없음",
		t.stock[finished] == 0 and t.stock[brand.id] == 0)
	t.stage, t.prosperity = 3, 1.2
	t.tech.craft, t.tech.commerce, t.tech.sea = 2, 2, 2
	t.civBonus.trade = 1.06
	t.stock[brand.source] = 80
	t.stock[finished] = 0
	local raw = t.stock[brand.source]
	local output = Eco.stepIndustries(t)
	check("원료 재고 소비 후 실제 직조·가공",
		t.stock[brand.source] < raw and (output[finished] or 0) > 0)
	check("원료 부족 시 가공품 무단 생성 차단", (function()
		t.stock[brand.source], t.stock[finished] = 0, 0
		local noRaw = Eco.stepIndustries(t)
		return (noRaw[finished] or 0) == 0 and (noRaw[brand.id] or 0) == 0
	end)())
	t.stock[brand.source], t.stock[finished] = 80, 30
	local branded = Eco.stepIndustries(t)
	check("지역 브랜드는 이미 만든 가공품을 소비",
		Eco.industryStage(t, brand) == 3 and (branded[brand.id] or 0) > 0 and t.stock[finished] < 30)
	check("브랜드 단계별 항구 산업 화면", Eco.industryView(t)[1].stage == 3)

	t.stage, t.pop = 4, 55000
	t.tech.commerce, t.tech.sea = 2.2, 2
	t.stock[brand.id] = 200
	Eco.initBuildings(t)
	check("수출 기술 조건 충족 시 산업 4단계", Eco.industryStage(t, brand) == 4)
	Eco.run(x, 1)
	check("국제 항구에 실제 상품 수출 발생", (t.exports[brand.id] or 0) > 0, t.exports[brand.id])
	local copy = Eco.restoreWorld(Eco.snapshot(x))
	check("세계 저장·복원 시 누적 수출량 보존",
		copy ~= nil and copy.towns.london.exports[brand.id] == t.exports[brand.id])
	check("기존 카드·교역품 가격 ID와 브랜드 지식 연결", Ports.Goods[brand.id].knowledgeId == Ports.Goods[brand.source].knowledgeId)
end

-- [산업연관·중력물류] 가공 항구의 부족 원료는 다른 생산 항구의 실제 잉여 재고에서만 보충한다.
do
	local Chains = require("./Shared/ProductionChains")
	local w = Eco.newWorld({ seed = 117, year = 1700 })
	local buyer = w.towns.london
	local brand = Chains.BrandsByPort.london[1]
	local raw = brand.source
	buyer.stage, buyer.prosperity = 3, 1.1
	buyer.tech.craft, buyer.tech.commerce, buyer.tech.sea = 2, 2, 2
	buyer.stock[raw], buyer.dem[raw] = 0, 1
	local supplier = nil
	for _, id in ipairs(w.order) do
		local town = w.towns[id]
		if town ~= buyer and town.produces[raw] then
			town.stock[raw], town.dem[raw] = 0, 1
			if not supplier then supplier = town end
		end
	end
	check("다른 항구에 같은 원료 산지가 존재", supplier ~= nil)
	supplier.stock[raw] = 1000
	supplier.price[raw] = buyer.price[raw] * 0.75
	local before = supplier.stock[raw]
	local importsBefore = buyer.imports[raw] or 0
	Eco.stepSupplyChains(w)
	check("원료 부족 시 실제 공급 항구에서 재고를 빼고 들여옴",
		supplier.stock[raw] < before and buyer.stock[raw] > 0)
	check("원료 수입량은 운송 손실을 반영하고 출처 없는 물량은 금지",
		math.abs(buyer.stock[raw] - (before - supplier.stock[raw]) * 0.97) < 0.00001
		and buyer.imports[raw] > importsBefore)
	check("원료 조달시 국제 교역 실적 발생", buyer.tradeIn > 0 and supplier.tradeOut > 0)
	check("원료 수입·학문·가공 상태를 항구 산업 조회에 연결",
		Eco.industryView(buyer, w)[1].imported > 0
		and Eco.industryView(buyer, w)[1].supplier ~= nil
		and Eco.industryView(buyer, w)[1].research == "textiles")
	local restored = Eco.restoreWorld(Eco.snapshot(w))
	check("기존 세계 저장 형식에서 누적 원료 수입 보존",
		restored ~= nil and restored.towns.london.imports[raw] == buyer.imports[raw])
	buyer.stock[raw] = 0
	supplier.stock[raw] = 0
	local imports = buyer.imports[raw]
	Eco.stepSupplyChains(w)
	check("해외 원료 공급 중단 시 재고·누적 수입 무단 증가 없음",
		buyer.stock[raw] == 0 and buyer.imports[raw] == imports)
	supplier.stock[raw] = 1000
	supplier.price[raw] = buyer.price[raw] * 10
	Eco.stepSupplyChains(w)
	check("운송 원가가 과도한 공급 항구는 수입 중단", buyer.stock[raw] == 0)
end

-- [기존 교역 보존] 가공 공방은 항구가 소비·판매할 원료 20일치를 남겨야 한다.
do
	local x = Eco.newWorld({ seed = 117, year = 1700 })
	local t = x.towns.london
	t.stage, t.tech.craft = 3, 2
	t.dem.wool, t.stock.wool = 2, 45
	Eco.stepIndustries(t)
	check("가공업은 원료 20일치 이상 보존", t.stock.wool >= 40, t.stock.wool)
	t.stock.wool = 40
	local before = t.stock.wool
	Eco.stepIndustries(t)
	check("비축분만 있을 때 가공 원료 소비 없음", t.stock.wool == before, t.stock.wool)
end

-- [동접 20명] 하나의 서버에서 여러 사용자 조회·거래가 한 세계 시뮬 및 저장 요청을 공유한다.
do
	local memory = { value = nil, reads = 0, writes = 0 }
	function memory:GetAsync(_key)
		self.reads += 1
		return self.value
	end
	function memory:UpdateAsync(_key, update)
		self.writes += 1
		self.value = update(self.value)
		return self.value
	end
	local Econ = require("./Services/Econ")
	local room = Econ({ Economy = Eco }, {})
	room.bindStore(memory, "room-20")
	for i = 1, 20 do
		local state = { startYear = 1650, day = 0 }
		check("20명: 동일 항구 경제 화면 조회 " .. i, room.town(state, "london") ~= nil)
		room.give(state, "london", "wool", 1)
	end
	check("20명: 세계 저장소 최초 로드 1회", memory.reads == 1, memory.reads)
	local saved = room.sync({ startYear = 1650, day = 0 }, true)
	check("20명: 누적 거래 20건을 하나의 세계 스냅샷에 저장",
		saved and memory.writes == 1 and memory.value.revision == 1 and memory.value.towns.london.stock.wool > 20)
	local other = Econ({ Economy = Eco }, {})
	other.bindStore(memory, "room-new")
	check("서버 변경: 모든 이용자가 동일 저장 세계를 읽음",
		other.town({ startYear = 1700, day = 0 }, "london").year == 1650 and memory.reads == 2)
end

-- [시계 경합] 서로 다른 서버가 다른 일수까지 시뮬한 경우 새 판본에서 뒤처진 일수를 복원한다.
do
	local memory = { value = nil }
	function memory:GetAsync(_key) return self.value end
	function memory:UpdateAsync(_key, update)
		local nextValue = update(self.value)
		if nextValue ~= nil then self.value = nextValue end
		return nextValue
	end
	local Econ = require("./Services/Econ")
	local first = Econ({ Economy = Eco }, {})
	local second = Econ({ Economy = Eco }, {})
	first.bindStore(memory, "short")
	second.bindStore(memory, "long")
	local early, late = { startYear = 1650, day = 0 }, { startYear = 1650, day = 45 }
	first.advance(early)
	second.advance(late)
	local lateDay = second.town(late, "london").day
	check("낮은 일수 세계 먼저 저장", first.sync(early, true) and memory.value.day <= lateDay)
	second.give(late, "london", "wool", 1)
	check("시계 충돌 시 오래된 판본 덮지 않음", second.sync(late, true) == false)
	check("시계 충돌 시 더 진행한 경제 일수 보전", second.town(late, "london").day >= lateDay)
	check("경합 복구 및 교역 사건 최종 저장", second.sync(late, true)
		and memory.value.day >= lateDay and memory.value.revision == 2)
end

-- [20명 모바일 CPU] 시뮬 전체 레시피 대신 항구별 기존 가공 목록만 검사한다.
-- 세계·저장 형식 변경 없이 기존 전수 순회와 생산 재고·가격이 동일해야 한다.
do
	local Chains = require("./Shared/ProductionChains")
	local a = Eco.newWorld({ seed = 71, year = 1650 })
	local b = Eco.newWorld({ seed = 71, year = 1650 })
	local localCount = 0
	for _, t in pairs(a.towns) do
		for _, recipe in ipairs(t.industryRecipes) do
			check("항구 생산 레시피만 사전 배치 " .. t.id .. ":" .. recipe.id,
				t.produces[Chains.goodId(recipe)] == true)
			localCount += 1
		end
	end
	check("항구별 가공 목록으로 중복 검사 감소", localCount > 0 and localCount < #a.order * #Chains.Recipes)
	for _, t in pairs(b.towns) do t.industryRecipes = nil end -- 변경 전 전체 제작법 순회 방식
	Eco.run(a, 3)
	Eco.run(b, 3)
	for _, id in ipairs(a.order) do
		local t, previous = a.towns[id], b.towns[id]
		for _, g in ipairs(t.goods) do
			check("최적화 후 기존 생산 재고·가격 일치 " .. id .. ":" .. g,
				t.stock[g] == previous.stock[g] and t.price[g] == previous.price[g])
		end
	end
	local copy = Eco.restoreWorld(Eco.snapshot(a))
	check("세계 복원 시 항구별 가공 레시피 재구성", copy ~= nil and #copy.towns.london.industryRecipes > 0)
end

-- 서버 서비스: 날짜를 따라 진행하고 항구 요약을 낸다
do
	local Econ = require("./Services/Econ")({ Economy = Eco }, {})
	local st = { startYear = 1650, day = 100 }
	local n = Econ.advance(st)
	check("서비스: 따라잡기 최대 45일", n == 45, n)
	Econ.advance(st); Econ.advance(st)
	local town = Econ.town(st, "london")
	check("서비스: 항구 요약", town and town.pop > 0 and town.stage >= 1 and town.residents >= 6 and town.jobs.farmer > 0, town and town.pop)
	check("서비스: 건축물·주거·일자리", town.buildings.house > 0 and town.housing.cap > 0 and town.work.jobs > 0 and town.service.market ~= nil)
	do
		local w2 = Econ.macro(st, "world")
		local K = require("./Shared/KnowledgeTree")
		local mapped = 0
		for _, disc in ipairs(K.Disciplines) do
			local m = Econ.DISC_TECH[disc.id]
			check("57개 활성 학문 경제 연결 " .. disc.id, m ~= nil)
			if m then mapped += 1 end
		end
		check("활성 학문 전체 경제 매핑", mapped == #K.Disciplines and #K.Disciplines == 57, mapped)
		check("백과 기술 상태를 항구 조회에서 노출", Econ.town(st, "london").technology.total == #Eco.CIVIL_TECH)
		check("항구 브랜드 산업 단계를 기존 경제 화면으로 전달", #Econ.town(st, "london").industries > 0)
		local before = Econ.town(st, "london").tech
		Econ.teach(st, "london", "navigation", 10)
		local after = Econ.town(st, "london").tech
		check("지식카드 보고 → 마을 기술 상승", after > before, before .. "->" .. after)
		check("모르는 학문은 무시", Econ.teach(st, "london", "nope", 5) == nil and w2 ~= nil)
	end
	check("서비스: 해역 집계", Econ.macro(st, "region", "europe").pop > 0)
	do
		local Ports = require("./Shared/Ports")
		check("교역 주문 상한: 레벨 1은 20, 30은 크게", Eco.orderCap(1) == 20 and Eco.orderCap(10) > Eco.orderCap(5) and Eco.orderCap(30) > 150 and Eco.orderCap(30) < 600, Eco.orderCap(30))
		local port = Ports.Ports["london"]
		local gid = port.produces[1]
		local lim = Econ.limits(st, "london", gid)
		check("교역 한도: 특산품은 재고가 있고 사줄 양은 적다", lim and lim.supply > 50 and lim.absorb < lim.supply, lim and (lim.supply .. "/" .. lim.absorb))
		local dgid = port.demands[1]
		local dl = Econ.limits(st, "london", dgid)
		check("교역 한도: 수요품은 사줄 양이 재고보다 많다", dl and dl.absorb >= Eco.MIN_ABSORB and dl.absorb > dl.supply, dl and (dl.supply .. "/" .. dl.absorb))
		Econ.take(st, "london", gid, lim.supply)
		local after = Econ.limits(st, "london", gid)
		check("산 만큼 마을 재고가 줄어 한도가 줄어든다 (무한 아님)", after.supply < lim.supply and after.supply <= lim.supply * 0.8, lim.supply .. "->" .. after.supply)
		Econ.give(st, "london", dgid, dl.absorb)
		check("판 만큼 마을 재고가 늘어 사줄 양이 줄어든다", Econ.limits(st, "london", dgid).absorb < dl.absorb)
		check("취급 안 하는 물건은 한도 없음(nil)", Econ.limits(st, "london", "__none__") == nil)
	end
	check("서비스: 시뮬 없으면 nil", require("./Services/Econ")({}, {}).town(st, "london") == nil)
end
print(string.format("economy: %d passed, %d failed", passed, failed))
if failed > 0 then error("economy tests failed") end
