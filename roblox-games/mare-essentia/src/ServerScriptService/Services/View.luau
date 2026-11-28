--!nonstrict
-- View.luau · 지구 백과/확장 학문/관계 그래프 스냅샷, 기존 게임 저장·효과 보존
-- 클라이언트에 보낼 화면용 스냅샷. 모든 계산은 서버가 하고 클라이언트는 표시만 한다.

return function(D, S)
	local View = {}
	local DELIVER_SHOWN_MAX = 4 -- 주점 게시판에 한 번에 보여 주는 납품 의뢰 수
	-- [기존 21학문 연결] 소재 종류마다 연관 학문. 주학문은 실제 학문 트리의 노드/분야로 판정한다.
	-- 연관 표시는 추가 경험치를 만들지 않으며 기존 보고·숙련도·저장 시스템을 그대로 사용한다.
	local RELATED_BY_KIND = {
		terrain = { "geography", "navigation", "meteorology" },
		building = { "architecture", "history", "physics" },
		wonder = { "history", "archaeology", "mythology" },
		animal = { "zoology", "botany" },
		plant = { "botany", "medicine" },
		mineral = { "mineralogy", "chemistry", "geography" },
		relic = { "archaeology", "history", "physics" },
		archive = { "linguistics", "history", "philosophy" },
		person = { "history", "philosophy", "anthropology" },
		nation = { "history", "political_science", "commerce" },
		organization = { "commerce", "history", "political_science" },
		institution = { "political_science", "law", "history" },
		event = { "history", "political_science", "historiography" },
		finance = { "economics", "commerce", "law" },
		food = { "agronomy", "botany", "anthropology" },
		clothing = { "textiles", "anthropology", "commerce" },
		information = { "linguistics", "mathematics", "philology" },
		industry = { "mechanics", "physics", "commerce" },
		body = { "medicine", "biology", "history" },
		disease = { "public_health", "medicine", "history" },
		ecosystem = { "ecology", "geography", "zoology" },
		geology = { "geology", "mineralogy", "geography" },
		celestial = { "astronomy", "optics", "physics" },
		calendar = { "astronomy", "history", "mathematics" },
		performance = { "art", "anthropology", "history" },
		sport = { "art", "military_science", "history" },
		mathematics = { "mathematics", "linguistics", "commerce" },
		algorithm = { "mathematics", "logic", "commerce" },
		language = { "linguistics", "philology", "history" },
		religion = { "religious_studies", "anthropology", "history" },
		politics = { "political_science", "history", "law" },
		law = { "law", "political_science", "ethics" },
		custom = { "anthropology", "linguistics", "religious_studies" },
		map = { "navigation", "geography", "astronomy" },
		science = { "physics", "chemistry", "philosophy" },
		medicine = { "medicine", "botany", "chemistry" },
		ship = { "shipbuilding", "navigation", "physics", "history" },
		weather = { "meteorology", "astronomy", "geography" },
		art = { "art", "history", "philosophy" },
		goods = { "commerce", "botany", "chemistry" },
		legend = { "mythology", "mystery", "lostland" },
		military = { "history", "physics", "navigation" },
	}


	local function sortedKeys(t)
		local keys = {}
		for k in t do
			table.insert(keys, k)
		end
		table.sort(keys)
		return keys
	end

	function View.build(state, ctx)
		local port = D.Ports.Ports[state.portId]
		local def = S.State.shipDef(state)
		local year = S.State.year(state)
		local nation = D.Ports.Nations[state.nationId]

		local view = {}

		view.player = {
			nation = nation.name,
			coins = state.coins,
			fame = state.fame,
			year = year,
			day = state.day,
			portId = port.id,
			portName = port.name,
			hasShipyard = port.shipyard,
		}

		view.captain = S.Intro.viewOf(state)
		local og = state.origin and D.Specialties.OriginById[state.origin]
		view.captain.origin = og and { id = og.id, name = og.name, perkText = og.perkText } or nil

		view.ship = {
			id = def.id,
			name = def.name,
			steam = def.steam,
			-- [기함 정보] 기존 ShipDef 실측값. 저장/선박 규칙은 변경하지 않는다.
			price = def.price, baseCargo = D.Ships.Ships[state.ship.id].cargo, summary = def.summary, class = def.class, className = D.Ships.ClassNames[def.class],
			rowed = def.rowed, fuelPerDay = def.fuelPerDay,
			trait = def.trait, -- [현재 선박 고유 성능] 저장 변경 없이 화면에서 실제 적용률 표시
			cannonName = (D.Ships.CannonById[state.ship.cannon or "basic"] or D.Ships.CannonById.basic).name,
			cannonBonus = (D.Ships.CannonById[state.ship.cannon or "basic"] or D.Ships.CannonById.basic).mult,
			plating = state.ship.plating or 0,
			hull = state.ship.hull,
			maxHull = def.hull,
			crew = state.ship.crew,
			maxCrew = def.crew,
			supplies = state.ship.supplies,
			cannons = def.cannons,
			speed = def.speed,
			cargoUsed = S.State.cargoUsed(state),
			cargoCapacity = S.State.cargoCapacity(state),
			coal = state.cargo.coal or 0,
		}

		view.careers = {}
		view.battleStats = { battlesWon = state.stats.battlesWon or 0 }
		view.weaponPractice = table.clone(state.weaponPractice or {}) -- 전투 수치와 분리된 시각 숙련
		view.fieldStreakBest = math.floor(math.clamp(state.stats.fieldStreakBest or 0, 0, 500)) -- 서버 저장 개인 기록
		for _, id in D.Careers.IDS do
			local c = state.careers[id]
			table.insert(view.careers, {
				id = id,
				name = D.Careers.NAMES[id],
				level = c.level,
				xp = c.xp,
				nextXp = D.Careers.xpForNext(c.level),
			})
		end

		-- 시장 소식 (모든 항구의 진행 중인 사건)
		view.news = {}
		for _, e in ctx.market:activeEvents() do
			local pt, gd = D.Ports.Ports[e.portId], D.Ports.Goods[e.goodId]
			if pt and gd then
				local line = pt.name .. ": " .. (tostring(e.text):gsub("%%s", gd.name))
				local lv = S.Harbor.intel(state)
				if lv >= 3 then
					line ..= string.format(" (약 %+d%%)", math.floor((e.mult - 1) * 100 + 0.5))
				elseif lv >= 1 then
					line ..= if math.abs(e.mult - 1) >= 0.3 then " (크게)" else " (조금)"
				end
				table.insert(view.news, line)
			end
		end
		table.sort(view.news)

		-- 시장
		local rate = S.Trade.sellRateFor(state)
		view.sellRate = rate
		do
			-- [자동 흥정] 상인 전문 분야나 동료 장사 감각 보유 여부. 거래와 확률은 서버에서 판정한다.
			local h = state.haggle
			local intel = S.Harbor.intel(state)
			local merchant = state.specialty == "merchant" or state.subSpecialty == "merchant"
			view.haggle = {
				auto = intel >= 1 or merchant,
				source = if merchant then "상인 전문" elseif intel >= 1 then "승선 동료 장사 감각" else "관련 능력 없음",
				tried = if h and h.portId == port.id then h.tried or {} else {},
				deal = h and h.portId == port.id and h.deal and { goodId = h.deal.goodId, pct = math.floor((1 - h.deal.mult) * 100 + 0.5) } or nil,
				-- [흥정 미니게임] 진행 중인 문제(정답은 보내지 않음: 동전 진짜 번호·퀴즈 답·저울 판정은 서버만)
				pending = (function()
					local pend = h and h.portId == port.id and h.pending
					if not pend then return nil end
					return { goodId = pend.goodId, game = pend.game, period = pend.period, center = pend.center, width = pend.width,
						faces = pend.faces, count = pend.count, looks = (function()
							-- 동전 생김새(보고 고르는 게 놀이): 진짜 1개 + 가짜는 저마다 다른 흠(테두리 깨짐·색 다름·문양 흐림) — 맨 위 '정품 견본'과 비교
							if not pend.count then return nil end
							local l = {}
							local tells = { "edge", "color", "stamp" }
							for i = 1, pend.count do l[i] = if i == pend.real then "real" else tells[(i + #pend.goodId) % 3 + 1] end
							return l
						end)(),
						question = pend.quiz and pend.quiz.question, options = pend.quiz and pend.quiz.options }
				end)(),
			}
		end
		view.goods = {}
		-- [교역품 분류] 원본 자원 계열과 기존 가공 레시피를 사용한다.
		local kindNames = {
			food = "식량", drink = "음료", textile = "직물·섬유", animal = "피혁·동물", ore = "금속·광물",
			stone = "석재", gem = "귀금속·보석", marine = "해산 자원", spice = "향신료", crops = "농산물",
			timber = "목재", oil = "기름", energy = "연료", crafted = "가공품", chemical = "화학 원료",
		}
		view.orderCap = S.Econ.orderCap(state)
		local lv0 = D.Harbor.effLevel(D.Harbor.level(state.harbor[port.id] or 0), S.Knowledge.techSum(state, port.id))
		local rid0 = D.Regions.of(port).id
		local yr0 = state.startYear + math.floor(state.day / 365)
		for _, goodId in sortedKeys(D.Ports.Goods) do
			local good = D.Ports.Goods[goodId]
			local purpose = "타 항구 운송 및 판매"
			if goodId == "coal" then
				purpose = "증기선 연료 · 가공 산업 자원"
			elseif goodId == "timber" then
				purpose = "조선·건축 및 목재 가공"
			elseif D.ProductionChains.BrandById[goodId] then
				purpose = "원산지 명품 · 국제 수출 브랜드"
			elseif D.ProductionChains.ByGood[goodId] then
				purpose = "가공된 상품 · 지역 브랜드 재료"
			else
				for _, recipe in ipairs(D.ProductionChains.Recipes) do
					if table.find(recipe.inputs, goodId) then
						purpose = "가공 재료 · " .. recipe.output .. " 제작"
						break
					end
				end
			end
			local mult = ctx.market:get(port.id, goodId)
			-- [시장 화면] 실제 Trade.Buy/Sell과 동일하게 세계경제 가격 보정값을 적용한다.
			local ev = (ctx.market:eventMult(port.id, goodId) * S.History.mult(state, port.id, goodId)
				* (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, port.id, goodId) else 1))
			local tag = ""
			local stockLimit = S.Econ.limits(state, port.id, goodId) or {}
			local role = D.Harbor.role(port, rid0, yr0, lv0, goodId, S.Knowledge.disciplineOpens(state, port.id, goodId))
			if role == "produce" then
				tag = "특산"
			elseif role == "demand" then
				tag = "수요"
			end
			table.insert(view.goods, {
				id = goodId,
				name = good.name,
				category = kindNames[good.resourceKind or ""] or "일반 교역품",
				purpose = purpose, basePrice = good.basePrice, basis = state.basis[goodId] or 0,
				tag = tag,
				buy = D.TradeMath.getPrice(port.id, goodId, mult, ev * S.Knowledge.supplyMult(state, port.id, goodId)),
				cheaper = S.Knowledge.supplyMult(state, port.id, goodId) < 0.999 or nil,
				sell = D.TradeMath.sellPrice(port.id, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev),
				upgraded = S.Knowledge.goodsMult(state, goodId) > 1.001 or nil,
				trend = if ev > 1.01 then "up" elseif ev < 0.99 then "down" else nil,
				scarcity = S.Econ.scarcity(state, port.id, goodId),
				supply = stockLimit.supply,
				absorb = stockLimit.absorb,
				owned = state.cargo[goodId] or 0,
			})
		end

		-- 이 항구에서 다루는 물건만 보인다: 특산 > 수요 > 내가 가진 것. (너무 적으면 전부)
		do
			local shown = {}
			for _, g in view.goods do
				if g.tag ~= "" or g.owned > 0 then
					table.insert(shown, g)
				end
			end
			if #shown >= 4 then
				local rank = { ["특산"] = 1, ["수요"] = 2, [""] = 3 }
				table.sort(shown, function(a, b)
					if rank[a.tag] ~= rank[b.tag] then
						return rank[a.tag] < rank[b.tag]
					end
					return a.name < b.name
				end)
				view.goods = shown
			end
		end
		-- [실제 세계 평균시세] 현재 세계 각 항구의 매입시세를 산술 평균한다.
		-- 해당 항구의 특산·수요, 재고, 사건, 세계경제 보정을 포함하지만
		-- 특정 선장의 개인 할인은 평균에서 제외한다(매입·판매 판정과 저장값 불변).
		-- 화면에 노출한 상품만 계산하며 별도 캐시/저장 테이블은 만들지 않는다.
		for _, g in view.goods do
			local total, count = 0, 0
			for otherId in D.Ports.Ports do
				local marketMult = ctx.market:get(otherId, g.id)
				local eventMult = ctx.market:eventMult(otherId, g.id) * S.History.mult(state, otherId, g.id)
					* (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, otherId, g.id) else 1)
				total += D.TradeMath.getPrice(otherId, g.id, marketMult, eventMult)
				count += 1
			end
			g.avgPrice = if count > 0 then math.max(1, math.floor(total / count + 0.5)) else g.basePrice
		end

		-- [수량별 거래 견적] 기존 서버의 단가 변화/관세·이월 흥정 할인 계산을 읽기 전용으로 반복한다.
		-- 항구·원화·화폐 저장은 건드리지 않고 실제로 보여 주는 상품에 최대 20개 분량만 전송한다.
		local tax = S.Trade.tariffRate(state)
		for _, g in view.goods do
			local bm = ctx.market:get(port.id, g.id)
			local sm = bm
			local ev = (ctx.market:eventMult(port.id, g.id) * S.History.mult(state, port.id, g.id)
				* (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, port.id, g.id) else 1))
			local supplyK = S.Knowledge.supplyMult(state, port.id, g.id)
			local sellK = S.Knowledge.goodsMult(state, g.id)
			local h = state.haggle
			local deal = if h and h.portId == port.id and h.deal and h.deal.goodId == g.id then h.deal.mult else 1
			local bought, sold = 0, 0
			local buyTotals, sellTotals = {}, {}
			for q = 1, math.min(20, view.orderCap) do
				bought += D.TradeMath.getPrice(port.id, g.id, bm, ev * supplyK)
				sold += D.TradeMath.sellPrice(port.id, g.id, sm, rate * sellK, ev)
				buyTotals[q] = if deal < 1 then math.max(1, math.floor(bought * deal)) else bought
				sellTotals[q] = sold - math.floor(sold * tax)
				bm = D.TradeMath.nextStockMult(bm, 1, true)
				sm = D.TradeMath.nextStockMult(sm, 1, false)
			end
			g.buyTotals, g.sellTotals = buyTotals, sellTotals
		end
		view.intel = S.Harbor.intel(state)
		-- 다른 항구 시세 비교: 물건마다 팔값이 가장 높은 항구 3곳. 장사 감각(intel)이 높을수록 자세히 알려 준다.
		--   0: 알 수 없음 / 1: 항구 이름만 / 2 이상: 이름과 값
		view.compare = {}
		if view.intel >= 1 then
			for _, g in view.goods do
				local list = {}
				for otherId, other in D.Ports.Ports do
					if otherId ~= port.id then
						local m = ctx.market:get(otherId, g.id)
						-- [타 항구 비교] 실제 판매 비율 및 세계경제 영향을 같이 반영한다.
						local e = (ctx.market:eventMult(otherId, g.id) * S.History.mult(state, otherId, g.id)
							* (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, otherId, g.id) else 1))
						table.insert(list, { name = other.name, sell = D.TradeMath.sellPrice(otherId, g.id, m, rate * S.Knowledge.goodsMult(state, g.id), e) })
					end
				end
				table.sort(list, function(x, y)
					if x.sell ~= y.sell then
						return x.sell > y.sell
					end
					return x.name < y.name
				end)
				local top = {}
				for i = 1, math.min(3, #list) do
					table.insert(top, { name = list[i].name, sell = if view.intel >= 2 then list[i].sell else nil })
				end
				view.compare[g.id] = top
			end
		end
		if view.intel < 1 then
			-- 동료가 없어도: 직접 거래해 본 항구의 팔값은 수첩에서 알려 준다 (오래될수록 믿기 어렵다)
			for _, g in view.goods do
				local list = {}
				for pid, e in (state.priceBook and state.priceBook[g.id]) or {} do
					if pid ~= port.id then
						table.insert(list, { name = D.Ports.Ports[pid].name, sell = e.sell, ago = math.max(0, state.day - e.day), memory = true })
					end
				end
				table.sort(list, function(x, y)
					if x.sell ~= y.sell then
						return x.sell > y.sell
					end
					return x.name < y.name
				end)
				if #list > 0 then
					view.compare[g.id] = { table.unpack(list, 1, math.min(3, #list)) }
				end
			end
		end
		view.supplyMax = S.State.maxSupplies()
		view.board = {}
		for _, b in S.Harbor.boardHere(state) do
			local prog = state.bounty.taken[b.id]
			table.insert(view.board, {
				id = b.id, title = b.title, coins = b.coins, fame = b.fame, kind = b.kind,
				state = if state.bounty.done[b.id] then "done" elseif prog ~= nil then "taken" else "open",
				progress = if b.kind == "hunt" and prog ~= nil then math.min(b.count, state.stats.battlesWon - prog) else nil,
				count = b.count,
			})
		end
		view.fleet = { escorts = state.escorts, price = 1200, needFame = 30 + state.escorts * 30 }
		view.fleet.ships = {}
		for i, f in state.fleet do
			local fd = D.Ships.Ships[f.id]
			table.insert(view.fleet.ships, {
				index = i, id = f.id, name = fd.name, hull = f.hull, maxHull = fd.hull, cargo = fd.cargo, cannons = fd.cannons,
				speed = fd.speed, sell = math.floor(fd.price * 0.5),
			})
		end
		view.fleet.max = S.State.MAX_FLEET
		view.fleet.fameNeed = 20 + #state.fleet * 30
		view.fleet.upkeep = 25
		view.fleet.cargo = S.State.fleetCargo(state)
		view.fleet.speed = S.State.fleetSpeed(state, S.State.shipDef(state).speed)
		do
			local nat = D.Ports.Nations[port.country]
			view.rep = { name = if nat then nat.name else port.country, value = state.rep[port.country] or 0, bonus = S.Trade.repBonus(state), tariff = S.Trade.tariffRate(state) }
		end
		view.gear = { slots = D.Gear.SLOTS, list = {} }
		for _, g in D.Gear.Items do
			table.insert(view.gear.list, {
				id = g.id, name = g.name, price = g.price, summary = g.summary, minFame = g.minFame,
				owned = table.find(state.gear.owned, g.id) ~= nil, equipped = table.find(state.gear.equipped, g.id) ~= nil,
			})
		end
		view.maps = {}
		for _, m in state.maps do
			table.insert(view.maps, { toName = D.Ports.Ports[m.to].name })
		end
		do
			local w = D.Voyage.weather(state.day, state.portId)
			view.weather = { id = w.id, name = w.name, hint = w.hint, wind = w.wind }
			view.forecast = {}
			if table.find(state.companions, "t_navigator") then
				for i = 1, 3 do
					local f = D.Voyage.weather(state.day + i, state.portId)
					table.insert(view.forecast, { inDays = i, name = f.name })
				end
			end
		end
		view.morale = state.morale
		view.feastCost = math.max(10, state.ship.crew * 3)
		if state.rumor and state.rumor.portId == state.portId then
			view.rumor = state.rumor
		end
		view.talk = state.talk
		view.auto = state.auto
		view.actIntro = state.actIntro
		if state.voyageChoice then
			local vc = state.voyageChoice
			if vc.kind == "merchant" then
				view.voyageChoice = {
					title = "상선 조우", art = "harbor", npc = "상선 선장",
					lines = { "수평선에서 상선 한 척이 다가온다. 돛에는 낯선 깃발이 달려 있다.", "\"이쪽은 짐이 많소. 서로 이문을 나눌 수 있지 않겠소?\"" },
					choices = { { index = 1, text = "공정하게 거래한다" }, { index = 2, text = "대포를 겨누고 짐을 요구한다 (위험)" }, { index = 3, text = "정중히 인사하고 보낸다" } },
				}
			else
				view.voyageChoice = {
					title = "해상 봉쇄", art = "storm", npc = "해군 장교",
					lines = { "해군 함선들이 항로를 막고 있다. 깃발이 신호를 보낸다.", "\"통행료를 내시오. 아니면 되돌아가시오.\"" },
					choices = { { index = 1, text = "통행료를 낸다" }, { index = 2, text = "돌파를 시도한다 (위험)" }, { index = 3, text = "먼 길로 돌아간다 (하루 지연)" } },
				}
			end
		end
		do
			local tier = D.Regions.tierOf(port.id, port.lat, port.lon)
			view.act = D.Narrative.Regions[tier]
			if next(state.stats.visited) ~= nil then
				local n = 0
				for _ in state.stats.visited do
					n += 1
				end
				if n <= 1 and state.day <= 3 then
					view.prologue = D.Narrative.Prologues[state.nationId] or D.Narrative.Prologue
				end
			end
			local activeQuest
			for _, q in D.Quests.Quests do
				if state.quests.active[q.id] then
					activeQuest = q
					break
				end
			end
			local locked
			for ri, r in D.Regions.List do
				if not D.Regions.isOpen(state.careers.adventure.level, D.Regions.homeTier(D.Ports.Ports, D.Ports.Nations[state.nationId]), ri) then
					locked = r
					break
				end
			end
			local cargoAny = false
			for _, qty in state.cargo or {} do
				if type(qty) == "number" and qty > 0 then
					cargoAny = true
				end
			end
			-- 첫 항해 목표 체크리스트 (처음 몇 단계를 막힘 없이 따라가도록)
			do
				local visited = 0
				for _ in state.stats.visited do
					visited += 1
				end
				local hasQuest = next(state.quests.active) ~= nil or next(state.quests.done) ~= nil
				local steps = {
					{ "교역소에서 특산품을 사 보기", cargoAny or visited >= 2 or state.day > 1 },
					{ "다른 항구로 출항하기", visited >= 2 },
					{ "주점에서 동료 영입하기", #state.companions > 0 },
					{ "소문을 듣거나 사람과 이야기해 일지에 의뢰 올리기", hasQuest },
					{ "항구 3곳 방문하기", visited >= 3 },
				}
				local left = 0
				for _, st in steps do
					if not st[2] then
						left += 1
					end
				end
				if left > 0 then
					local list, marked = {}, false
					for _, st in steps do
						local mark = if st[2] then "✅" elseif not marked then "▶" else "⬜"
						if not st[2] then
							marked = true
						end
						table.insert(list, { text = st[1], done = st[2], mark = mark })
					end
					view.guide = { title = "첫 항해 목표", steps = list }
				end
			end
			local who = if #state.companions > 0 then D.Specialties.CompanionById[state.companions[1]].name else "늙은 항해사 베르나르"
			view.advice = { who = who, text = D.Narrative.advice({ coins = state.coins, ship = state.ship, morale = state.morale, cargoAny = cargoAny }, D.Regions, #state.companions > 0, activeQuest, locked) }
			-- 화면 중앙 상단 동료 말풍선: 인사 한마디와 '앞으로 할 일'
			do
				local companionId = state.companions[1]
				if companionId then
					local pool = D.CompanionTalk.Talk[companionId] and D.CompanionTalk.Talk[companionId][D.Specialties.affinityTier(state.affinity[companionId] or 0)]
					if pool and #pool > 0 then
						view.advice.line = pool[1 + state.day % #pool]
					end
					view.advice.companionId = companionId
				else
					view.advice.line = "선장님, 오늘도 좋은 바람입니다."
				end
				if view.guide then
					for _, st in view.guide.steps do
						if not st.done then
							view.advice.next = st.text
							break
						end
					end
				end
			end
		end

		-- 항해 미리보기
		view.routes = {}
		local questTargets = {}
		for _, q in D.Quests.Quests do
			if state.quests.active[q.id] and q.portId then
				questTargets[q.portId] = q.name
			end
		end
		for _, portId in sortedKeys(D.Ports.Ports) do
			if portId ~= port.id and D.PortEras.isOpen(portId, S.State.year(state)) then
				local plan = S.Sailing.preview(state, portId)
				local region = D.Regions.of(D.Ports.Ports[portId])
				table.insert(view.routes, {
					region = region.name,
					locked = if not D.Regions.isOpen(state.careers.adventure.level, D.Regions.homeTier(D.Ports.Ports, D.Ports.Nations[state.nationId]), D.Regions.tierOf(portId, D.Ports.Ports[portId].lat, D.Ports.Ports[portId].lon)) then string.format("모험 Lv.%d 필요", region.minLevel) else nil,
					id = portId,
					yard = D.Ports.Ports[portId].shipyard == true,
					quest = questTargets[portId],
					name = D.Ports.Ports[portId].name,
					days = plan.days,
					supplies = plan.supplies,
					coal = plan.coal,
					distanceKm = math.floor(plan.distanceKm),
					-- [교역 쉽게 보기 · 2026-11-28] 지금 실은 화물을 그 항구에 팔면 예상 이익(산 값 대비). 판정·저장 무관 표시용.
					cargoProfit = (function()
						local sum, any = 0, false
						for goodId, qty in state.cargo do
							if type(qty) == "number" and qty > 0 and D.Ports.Goods[goodId] then
								any = true
								local unit = D.TradeMath.sellPrice(portId, goodId, ctx.market:get(portId, goodId), rate * S.Knowledge.goodsMult(state, goodId),
									ctx.market:eventMult(portId, goodId) * S.History.mult(state, portId, goodId))
								sum += (unit - (state.basis[goodId] or unit)) * qty
							end
						end
						return if any then math.floor(sum) else nil
					end)(),
				})
			end
		end

		do
			-- 가장 가까운 조선소 (항로 목록에서 거리 순으로)
			local best
			for _, r in view.routes do
				if r.yard and not r.locked and (not best or r.distanceKm < best.distanceKm) then
					best = r
				end
			end
			view.nearestYard = best and { id = best.id, name = best.name, days = best.days, distanceKm = best.distanceKm, supplies = best.supplies } or nil
		end
		view.counsel = S.Advice.list(state) -- 동료 조언 (view.advice 는 항구 인사말이 이미 쓴다)
		-- 조선소
		view.shipyard = { available = port.shipyard, ships = {}, supplyCost = math.max(1, math.floor(S.Shipyard.SUPPLY_COST * S.Harbor.costMult(state))), hireCost = math.max(1, math.floor(S.Shipyard.HIRE_COST * S.Harbor.costMult(state))), repairCost = math.max(1, math.floor(S.Shipyard.REPAIR_COST * S.Harbor.costMult(state))) }
		do
			-- 수리: 기함과 선단의 부족한 선체 합계와 전부 고칠 때의 비용
			local def0 = S.State.shipDef(state)
			local capK = if port.shipyard then 1 else 0.6 -- 조선소 없는 항구는 응급 수리(선체 60%까지, 비용 2배)
			local missing, maxHull = math.max(0, math.floor(def0.hull * capK) - state.ship.hull), def0.hull
			local fullMissing = def0.hull - state.ship.hull
			for _, f in state.fleet do
				local fd = D.Ships.Ships[f.id]
				missing += math.max(0, math.floor(fd.hull * capK) - f.hull)
				fullMissing += fd.hull - f.hull
				maxHull += fd.hull
			end
			view.shipyard.missing = math.max(0, missing)
			view.shipyard.fullMissing = math.max(0, fullMissing)
			view.shipyard.maxHull = maxHull
			view.shipyard.field = not port.shipyard
			view.shipyard.repairTotal = math.floor(math.max(0, missing) * view.shipyard.repairCost
				* (if port.shipyard then 1 else 2)
				* (1 + (if def0.trait then def0.trait.repair or 0 else 0)) + 0.5)
		end
		local culture = D.CultureRegions.ofPort(D.Ports.Ports, state.portId)
		for _, shipId in D.Ships.Order do
			local s = D.Ships.Ships[shipId]
			-- [지역 조선소] 기존 28척의 목록은 보존. 신규 함종은 해당 문화권·특별 항구에서만 진열.
			local localShip = not s.newRegional or s.id == state.ship.id or
				(if s.specialPort then s.specialPort == state.portId
					else s.regions and culture and table.find(s.regions, culture) ~= nil)
			if localShip then
			local locked = nil
			if s.techReq and not state.tech[s.techReq] then
				locked = "연구 필요: " .. D.Tech.Tech[s.techReq].name
			end
			locked = locked or D.Ships.saleBlock(s, culture, state.nationId, state.portId, state.careers.adventure.level)
			table.insert(view.shipyard.ships, {
				id = s.id,
				rowed = s.rowed, nation = s.nation, regions = s.regions,
				trait = s.trait, newRegional = s.newRegional, specialPort = s.specialPort,
				name = s.name,
				steam = s.steam,
				price = s.price,
				cargo = s.cargo,
				speed = s.speed,
				hull = s.hull,
				cannons = s.cannons,
				crew = s.crew,
				fuelPerDay = s.fuelPerDay, rowed = s.rowed,
				-- [교체 예고] 기존 절반값 보상과 선단·기술을 포함한 실제 화물칸 예상치.
				tradeIn = math.floor(def.price * 0.5),
				netCost = s.price - math.floor(def.price * 0.5),
				capacityAfter = S.State.cargoCapacityFor(state, s),
				canCarry = S.State.cargoUsed(state) <= S.State.cargoCapacityFor(state, s),
				summary = s.summary,
				class = s.class,
				className = D.Ships.ClassNames[s.class],
				locked = locked or (if s.class >= 2 and state.license < s.class - 1 then "면허 필요: " .. D.Ships.Licenses[s.class - 1].name else nil),
				owned = (s.id == state.ship.id),
			})
			end
		end

		-- 탐험 지점
		view.sites = {}
		for _, site in D.Sites.Sites do
			if site.portId == port.id then
				local blocked = S.Discovery.siteBlockReason(state, site)
				local left = 0
				-- [탐험 도감] 보상 규칙을 바꾸지 않고 서버가 이미 검증한 미발견 카드만 현장 연출에 전달한다.
				local observableCards = {}
				local fieldQuest
				for _, q in D.Quests.Quests do
					if q.exploreSite == site.id and not state.quests.done[q.id] and S.Quest.visible(state, q) then
						fieldQuest = string.format("%d/5단 · %s", D.Quests.Grade(q), q.name)
						break
					end
				end
				for _, cardId in site.pool do
					if not state.discovered[cardId] then
						left += 1
						if not S.Discovery.cardBlockReason(state, D.Cards.ById[cardId]) then
							table.insert(observableCards, cardId)
						end
					end
				end
				table.insert(view.sites, {
					id = site.id,
					portId = site.portId, -- 기존 지상맵의 지역 문화권·배경 선택에 필요
					name = site.name,
					minLevel = site.minLevel,
					days = site.days,
					left = left,
					fieldQuest = fieldQuest, -- 현지 퀘스트 조건을 통과한 진행 단계만 알린다.
					observableCards = observableCards, -- 저장 상태가 아닌 탐험 화면용 임시 후보
					fromYear = site.fromYear,
					locked = blocked,
					unlocked = blocked == nil,
				})
			end
		end

		-- 지식 트리(보고·이해·효과)
		view.knowledge = S.Knowledge.viewOf(state)
		view.history = S.History.viewOf(state)
		view.exchange = S.Stock.viewOf(state)
		view.portBuildings = S.Build.viewOf(state)
		view.pace = S.Pace.viewOf(state)
		view.world = S.World.viewOf(state)
		view.diplo = S.Diplomacy.viewOf(state)
		view.worldNations = S.Econ and S.Econ.worldSummary and S.Econ.worldSummary(state) or nil
		view.autoStory = state.autoStory
	view.order = S.Order.viewOf(state)
	view.room = S.Room.viewOf(state)
		view.people = S.People.viewOf(state)

		-- 학자
		view.scholars = {}
		for _, sc in D.Scholars.Scholars do
			if sc.portId == port.id then
				local status = "ready"
				if state.scholarsMet[sc.id] then
					status = "met"
				elseif year < sc.fromYear then
					status = string.format("%d년부터", sc.fromYear)
				elseif year > sc.toYear then
					status = "만날 수 없음"
				elseif state.fame < sc.minFame then
					status = string.format("명성 %d 필요", sc.minFame)
				end
				table.insert(view.scholars, { id = sc.id, name = sc.name, status = status, reportable = if status == "ready" or status == "met" then S.Knowledge.reportableCount(state, sc) else 0 })
			end
		end

		-- 퀘스트
		view.quests = { active = {}, available = {}, doneCount = 0, otherPortDeliver = 0, done = {} }
		local shownDeliver = 0
		for id in state.quests.done do
			view.quests.doneCount += 1
			local dq = D.Quests.ById[id]
			if dq then
				local _, ending = S.Quest.storyOf(dq)
				-- [장 완료·결과 연출] 장 제목과 그 장의 마지막 단계인지(다음 단계 없음) 함께 보낸다.
				local chapterName = dq.chapter or (string.find(dq.summary or "", " — ", 1, true) and string.sub(dq.summary, 1, (string.find(dq.summary, " — ", 1, true) :: number) - 1)) or nil
				table.insert(view.quests.done, { id = dq.id, name = dq.name, summary = dq.summary, strand = dq.strand, grade = D.Quests.Grade(dq), ending = ending,
					chapter = chapterName, chapterEnd = chapterName ~= nil and D.Quests.NextOf[dq.id] == nil, result = dq.result })
			end
		end
		table.sort(view.quests.done, function(a, b) return a.name < b.name end)
		for _, q in D.Quests.Quests do
			if state.quests.active[q.id] then
				table.insert(view.quests.active, {
					id = q.id,
					name = q.name,
					summary = q.summary,
					story = (S.Quest.storyOf(q)),
					strand = q.strand or (if q.companionId then "companion" else nil),
					kind = q.kind,
					grade = D.Quests.Grade(q),
					progress = S.Quest.progress(state, q),
					amount = q.amount,
					rewardCoins = q.rewardCoins,
					rewardCard = q.rewardCardId and D.Cards.ById[q.rewardCardId] and D.Cards.ById[q.rewardCardId].name or nil,
					story2 = D.Quests.Kit.questExtras(state, q), -- [이야기 퀘스트 시스템] 선택지·대결 상대·인물 대사
					-- [다음 할 일 안내 · 2026-11-28] 목적지·상품·인과(문제→원인→결과)·장 표시용. 판정·저장은 그대로.
					portId = q.portId, portName = q.portId and D.Ports.Ports[q.portId] and D.Ports.Ports[q.portId].name or nil,
					goodId = q.goodId, goodName = q.goodId and D.Ports.Goods[q.goodId] and D.Ports.Goods[q.goodId].name or nil,
					exploreSite = q.exploreSite, warId = q.warId, leaderId = q.leaderId,
					problem = q.problem or (function()
						-- 따로 적은 문제가 없으면 사연의 첫 문장을 '왜?'로 쓴다
						local hook = S.Quest.storyOf(q)
						hook = string.gsub(tostring(hook or ""), "^제%d+장%. ", "")
						local cut = string.find(hook, ". ", 1, true) or string.find(hook, "? ", 1, true) or string.find(hook, "! ", 1, true)
						return if cut then string.sub(hook, 1, cut) elseif #hook > 0 then hook else nil
					end)(),
					cause = q.cause, result = q.result,
					chapter = q.chapter or (string.find(q.summary or "", " — ", 1, true) and string.sub(q.summary, 1, (string.find(q.summary, " — ", 1, true) :: number) - 1)) or nil,
					guide = q.guide,
					-- [지난 이야기·다음 이야기] 앞 단계의 결말과 다음 단계 이름
					prevName = q.after and D.Quests.ById[q.after] and D.Quests.ById[q.after].name or nil,
					prevEnding = q.after and D.Quests.ById[q.after] and select(2, S.Quest.storyOf(D.Quests.ById[q.after])) or nil,
					nextName = D.Quests.NextOf[q.id] and D.Quests.ById[D.Quests.NextOf[q.id]] and D.Quests.ById[D.Quests.NextOf[q.id]].name or nil,
				})
			elseif not state.quests.done[q.id] and S.Quest.visible(state, q) and q.kind == "deliver" and q.strand ~= "main" and (q.portId ~= state.portId or shownDeliver >= DELIVER_SHOWN_MAX) then
				-- 납품 의뢰는 지금 항구의 주점 게시판만, 최대 몇 개까지만 보여 준다 (나머지는 개수만 알린다)
				view.quests.otherPortDeliver += 1
			elseif not state.quests.done[q.id] and S.Quest.visible(state, q) then
				if q.kind == "deliver" then
					shownDeliver += 1
				end
				table.insert(view.quests.available, { id = q.id, name = q.name, summary = q.summary .. (if q.rewardCardId and D.Cards.ById[q.rewardCardId] then " · 지식카드 보상: " .. D.Cards.ById[q.rewardCardId].name else ""), story = (S.Quest.storyOf(q)), strand = q.strand or (if q.companionId then "companion" else nil), grade = D.Quests.Grade(q), rewardCoins = q.rewardCoins, rewardCard = q.rewardCardId and D.Cards.ById[q.rewardCardId] and D.Cards.ById[q.rewardCardId].name or nil, auto = S.Quest.isAuto(q), progress = S.Quest.progressAny(state, q), amount = q.amount })
			end
		end

		-- [세계 현장 탐험] 10대 지역별 이야기 항로의 다음 목적지와 단서 유형을 표시한다.
		-- 서버가 기존 완료 기록과 선행 단계로 계산하므로 새로운 저장 상태는 필요하지 않다.
		view.quests.fieldRoutes = {}
		local routeIds = {}
		for _, q in D.Quests.Quests do
			if q.routeId then routeIds[q.routeId] = true end
			if q.exploreSite and not state.quests.done[q.id] and (not q.after or state.quests.done[q.after]) then
				local destination = D.Ports.Ports[q.portId]
				table.insert(view.quests.fieldRoutes, {
					name = q.name, grade = D.Quests.Grade(q),
					port = destination and destination.name or q.portId,
					summary = q.summary, here = q.portId == state.portId,
					routeId = q.routeId, routeName = q.routeName, leadSource = q.leadSource,
				})
			end
		end
		view.quests.routeCount = 0
		for _ in routeIds do view.quests.routeCount += 1 end
		table.sort(view.quests.fieldRoutes, function(a, b)
			if a.here ~= b.here then return a.here end
			return a.name < b.name
		end)

		-- 도감
		view.codex = { maxLevel = S.Codex.MAX_LEVEL, animLevel = S.Codex.ANIM_LEVEL, total = #D.Cards.Cards, found = S.State.countDiscovered(state), cards = {}, fields = {}, methods = {}, kinds = {}, rarities = {}, resources = {}, resourceCounts = {}, worldCounts = {}, topicCounts = {}, evidenceCounts = {} }
		-- [독서 기록] 서버에서 검증된 현재 책갈피만 클라이언트에 전달한다.
		view.codex.bookmarkId = if state.encyclopediaBookmarkId and state.discovered[state.encyclopediaBookmarkId] then state.encyclopediaBookmarkId else nil
		local fieldDiscipline = {}
		for _, disc in D.KnowledgeTree.Disciplines do
			fieldDiscipline[disc.field] = disc
		end
		view.codex.disciplineCount = #D.KnowledgeTree.Disciplines
		view.codex.plannedDisciplineCount = #D.KnowledgeTree.Planned
		-- [개체 연결] 외부 식별자는 검증된 값만 표시. 내부 연결은 카드/상품/항구/탐험지의 원본 식별자를 참조한다.
		-- [자동 개체 그래프] 기존 정규 원천(탐험지 카드풀, 실물 상품→지식, 연구 선행 노드)에서 직접 연결한다.
		-- 새 카드/유적/교역품을 기존 표에 추가하면 관계도 자동 늘어나며 중복 저장/외부 서버 요청이 없다.
		local linkedSites, resourceLinks, explorationLinks = {}, {}, {}
		local scholarNames = {}
		for _, scholar in D.Scholars.Scholars do scholarNames[scholar.id] = scholar.name end
		-- [지식→다음 이야기] 방금 완수한 지역 카드가 다음 퀘스트를 여는 원인을 역산한다.
		-- 저장을 늘리거나 보상을 재발급하지 않고 기존 after·done 관계만 사용한다.
		local nextRouteByQuest, nextRouteByCard = {}, {}
		for _, q in D.Quests.Quests do
			if q.routeId and q.after then nextRouteByQuest[q.after] = q end
		end
		for _, q in D.Quests.Quests do
			if q.routeId and q.cardId and state.quests.done[q.id] then
				local nextQuest = nextRouteByQuest[q.id]
				if nextQuest and not state.quests.done[nextQuest.id] then
					nextRouteByCard[q.cardId] = nextQuest
				end
			end
		end
		for _, site in D.Sites.Sites do
			linkedSites[site.id] = site.name
			for _, cardId in site.pool do
				explorationLinks[cardId] = explorationLinks[cardId] or {}
				table.insert(explorationLinks[cardId], site.id)
			end
		end
		for goodId, good in D.Ports.Goods do
			if good.knowledgeId then
				resourceLinks[good.knowledgeId] = resourceLinks[good.knowledgeId] or {}
				table.insert(resourceLinks[good.knowledgeId], goodId)
			end
		end
		local function relatedEntities(c, found)
			local out, seen = {}, {}
			if not found then return out end
			local function add(kind, target)
				if #out >= 8 then return end -- 모바일 카드 상세에서 무한 목록이 생기지 않도록 제한한다.
				local key = kind .. ":" .. target
				if seen[key] then return end
				seen[key] = true
				local name, cardId = nil, nil
				if D.Cards.ById[target] then
					cardId = target
					name = if state.discovered[target] then D.Cards.ById[target].name else "미발견 지식"
				elseif string.sub(target, 1, 5) == "good:" then
					local good = D.Ports.Goods[string.sub(target, 6)]
					name = good and good.name
				elseif string.sub(target, 1, 5) == "port:" then
					local port = D.Ports.Ports[string.sub(target, 6)]
					name = port and port.name
				elseif string.sub(target, 1, 5) == "site:" then
					name = linkedSites[string.sub(target, 6)]
				end
				if name then table.insert(out, {
					name = name, relation = D.Cards.RelationNames[kind] or kind,
					cardId = cardId, found = cardId and state.discovered[cardId] == true or false,
				}) end
			end
			for _, rel in (c.meta and c.meta.relations or {}) do add(rel.type, rel.target) end
			local node = D.KnowledgeTree.ById[c.id]
			for _, needId in (node and node.needs or {}) do add("requires", needId) end
			for _, goodId in resourceLinks[c.id] or {} do add("tradedAs", "good:" .. goodId) end
			for _, siteId in explorationLinks[c.id] or {} do add("foundAt", "site:" .. siteId) end
			return out
		end
		local function relatedNames(c, kind, primaryId)
			local names, seen = {}, {}
			local function include(discId)
				if not discId or discId == primaryId or seen[discId] then return end
				local d = D.KnowledgeTree.DisciplineById[discId]
				if d then
					seen[discId] = true
					table.insert(names, d.name)
				end
			end
			-- 카드별 원본 선행 지식을 먼저 읽어, 실제 식물학→의학 연구 등 교차 학문을 우선 표시.
			local node = D.KnowledgeTree.ById[c.id]
			for _, needId in (node and node.needs or {}) do
				local parent = D.KnowledgeTree.ById[needId]
				if parent then include(parent.disc) end
			end
			for _, discId in D.KnowledgeTree.CardRelatedDisciplines[c.id] or {} do include(discId) end
			for _, discId in (c.meta and c.meta.relatedDisciplines or {}) do include(discId) end
			for _, discId in RELATED_BY_KIND[kind] or {} do include(discId) end
			return names
		end
		for _, c in D.Cards.Cards do
			local method = S.Discovery.methodOf(c)
			local kind = D.Cards.kindOf(c)
			local cardNode = D.KnowledgeTree.ById[c.id]
			local disc = (cardNode and D.KnowledgeTree.DisciplineById[cardNode.disc]) or fieldDiscipline[c.field]
			local domain = disc and D.KnowledgeTree.TaxonomyById[disc.id] and D.KnowledgeTree.TaxonomyById[disc.id].domain
			local defKind = D.Cards.KindById[kind]
			local topicId = D.Cards.topicOf(c)
			local evidenceId = D.Cards.evidenceOf(c)
			local worldId = defKind and defKind.group or "culture"
			view.codex.topicCounts[topicId] = (view.codex.topicCounts[topicId] or 0) + 1
			view.codex.worldCounts[worldId] = (view.codex.worldCounts[worldId] or 0) + 1
			for _, pair in { { view.codex.methods, method }, { view.codex.kinds, kind }, { view.codex.rarities, c.rarity } } do
				pair[1][pair[2]] = (pair[1][pair[2]] or 0) + 1
			end
			local found = state.discovered[c.id] == true
			-- [근거 분류] 미발견 카드는 근거 유형을 공개하지 않고, 완료된 카드만 집계.
			if found then view.codex.evidenceCounts[evidenceId] = (view.codex.evidenceCounts[evidenceId] or 0) + 1 end
			local art = D.CardArt.Art[c.id]
			local origin = found and state.cardOrigins and state.cardOrigins[c.id] or nil
			local originPort = origin and origin.portId and D.Ports.Ports[origin.portId] or nil
			local originQuest = origin and origin.questId and D.Quests.ById[origin.questId] or nil
			local originEvent = origin and origin.eventId and (D.Story.ById[origin.eventId] or D.HistoryEvents.ById[origin.eventId]) or nil
			local originNames = { explore = "현장 탐험", learn = "인물 전수", quest = "퀘스트 완료", visit = "항구 발견", research = "문헌 연구", event = "이야기 사건", discover = "발견", card = "카드 보상" }
			table.insert(view.codex.cards, {
				id = c.id,
				field = c.field,
				rarity = c.rarity,
				method = method,
				kind = kind,
				kindName = defKind and defKind.name or "기타",
				topicId = topicId,
				topic = D.Cards.TopicById[topicId] and D.Cards.TopicById[topicId].name or "기타",
				-- [검증 분리] 미발견 카드의 근거 세부 사항은 공개하지 않는다.
				evidenceId = if found then evidenceId else nil,
				evidence = if found then D.Cards.EvidenceNames[evidenceId] else nil,
				entityType = D.Cards.EntityTypes[D.Cards.entityTypeOf(c)] or "개체",
				tags = if found then D.Cards.tagsOf(c) else {},
				aliases = if found and c.meta then c.meta.aliases or {} else {},
				wikidata = if found and c.meta then c.meta.wikidata else nil,
				relations = relatedEntities(c, found),
				worldGroup = D.Cards.WorldGroupById[worldId] and D.Cards.WorldGroupById[worldId].name or "인류·역사·문화",
				subkind = D.Cards.subkindOf(c),
				discipline = disc and disc.name or "학문 외 자료",
				relatedDisciplines = relatedNames(c, kind, disc and disc.id),
				-- 존재 형태·시대·지역·선행 지식은 카드 종류와 독립적으로 도감에 전달한다.
				era = c.meta and c.meta.era or nil,
				region = c.meta and c.meta.region and D.Ports.Ports[c.meta.region] and D.Ports.Ports[c.meta.region].name or (c.visitPort and D.Ports.Ports[c.visitPort] and D.Ports.Ports[c.visitPort].name) or nil,
				-- [개인 백과] 자료의 대표 지역과 실제 플레이어 최초 습득 장소를 구별한다.
				nextClue = if found and nextRouteByCard[c.id] then {
					quest = nextRouteByCard[c.id].name,
					port = D.Ports.Ports[nextRouteByCard[c.id].portId] and D.Ports.Ports[nextRouteByCard[c.id].portId].name or nil,
					source = nextRouteByCard[c.id].leadSource,
				} else nil,
				provenance = if origin then {
					port = originPort and originPort.name or "위치 미상",
					day = origin.day,
					method = originNames[origin.method] or "발견",
					person = origin.scholarId and scholarNames[origin.scholarId] or nil,
					quest = originQuest and originQuest.name or nil,
					site = origin.siteId and linkedSites[origin.siteId] or nil,
					event = originEvent and originEvent.title or nil,
				} else nil,
				prerequisites = cardNode and cardNode.needs or {},
				domain = domain and D.KnowledgeTree.DomainById[domain] and D.KnowledgeTree.DomainById[domain].name or "기타",
				rarityGuide = S.Discovery.rarityGuide(c),
				found = found,
				name = if found then c.name else "???",
				description = if found then c.description else "발견 방법: " .. c.source,
				source = c.source,
				path = S.Discovery.pathOf(c),
				fromYear = c.fromYear,
				studyLocked = if not found and (c.research or c.fromYear) then S.Discovery.cardBlockReason(state, c) else nil,
				-- 서버 판정: 선행 보고를 끝낸 카드만 해당 항구에서 문헌 연구 버튼을 연다.
				studyReady = not found and c.visitPort == state.portId and c.research ~= nil and c.research.reported ~= nil
					and S.Discovery.cardBlockReason(state, c) == nil or false,
				fame = c.reward.fame,
				coins = c.reward.coins,
				image = if found and art then art.image else nil,
				credit = if found and art then art.credit else nil,
				level = if found then (state.codexLevel[c.id] or 0) else nil,
				lore = if found then D.Quests.Kit.loreFor(state, D.Quests.Kit.LORE, c.id) else nil, -- [이야기 카드] 완료한 이야기 단락
				quizDone = found and (state :: any).wikiQuiz ~= nil and (state :: any).wikiQuiz[c.id] == true, -- [백과 읽기 퀴즈] 보상 수령 여부
				upCost = if found and (state.codexLevel[c.id] or 0) < S.Codex.MAX_LEVEL then S.Codex.upgradeCost(c, state.codexLevel[c.id] or 0) else nil,
			})
		end
		do
			local fieldSums, overall = S.Codex.summary(state)
			local byId = {}
			for _, f in fieldSums do
				byId[f.id] = f
			end
			for _, def in D.Fields.Fields do
				local f = byId[def.id]
				table.insert(view.codex.fields, {
					id = def.id, name = def.name, color = def.color, summary = def.summary, detail = def.detail, tip = def.tip,
					total = f.total, found = f.found, tiers = f.tiers,
				})
			end
			view.codex.overall = overall
			view.codex.kindList = D.Cards.Kinds
			view.codex.topicList = D.Cards.Topics
			view.codex.evidenceList = D.Cards.EvidenceNames
			view.codex.worldGroups = D.Cards.WorldGroups
			view.codex.resourceKinds = D.Ports.ResourceKinds
			local resourceKindNames = {}
			for _, group in D.Ports.ResourceKinds do
				resourceKindNames[group.id] = group
			end
			-- [세계 자원 연결] 실제 69개 교역 자원 + 기존 제작법 가공품을 모두 원본 상품 데이터에서 조회한다.
			-- 원산지 색인은 포트별 생산 목록을 한 번만 훑는다 (20명 동접 화면 조회 예산 보존).
			local originIds = {}
			for portId, port in D.Ports.Ports do
				for _, goodId in ipairs(port.produces) do
					if not originIds[goodId] or portId < originIds[goodId] then
						originIds[goodId] = portId
					end
				end
			end
			-- 관련 지식카드는 원본 도감 카드 참조일 뿐 새 아이템/보상을 생성하지 않는다.
			for id, good in D.Ports.Goods do
				local kindId = good.resourceKind or "manufactured"
				local group = resourceKindNames[kindId] or resourceKindNames.manufactured
				local card = D.Cards.ById[good.knowledgeId]
				local subjectId = good.discipline or (group and group.discipline)
				local taxonomy = subjectId and D.KnowledgeTree.TaxonomyById[subjectId]
				while taxonomy and taxonomy.planned do
					taxonomy = taxonomy.parent and D.KnowledgeTree.TaxonomyById[taxonomy.parent]
				end
				local subject = taxonomy and D.KnowledgeTree.DisciplineById[taxonomy.id]
				-- [세계 산업 백과] 기존 상품 ID·지식카드·가공법으로 산업 경로를 조회한다.
				-- 상품·보상은 새로 만들지 않고 지역 원산지와 기존 목표 수출 항구만 안내한다.
				local originPortId = originIds[id]
				local brand = D.ProductionChains.BrandById[id]
				local recipe = if brand then D.ProductionChains.ById[brand.recipe] else D.ProductionChains.ByGood[id]
				local chain = nil
				if brand and recipe then
					local origins = D.Ports.Ports[brand.port]
					local markets = {}
					for _, portId in ipairs(brand.destinations) do
						local port = D.Ports.Ports[portId]
						if port then table.insert(markets, port.name) end
					end
					local raw = D.Ports.Goods[brand.source]
					local intermediate = D.Ports.Goods[D.ProductionChains.goodId(recipe)]
					chain = {
						raw = raw and raw.name or brand.source,
						processed = intermediate and intermediate.name or recipe.output,
						port = origins and origins.name or brand.port, markets = markets,
						research = D.KnowledgeTree.TaxonomyById[recipe.disc] and D.KnowledgeTree.TaxonomyById[recipe.disc].name or recipe.disc,
					}
				elseif recipe then
					local raw = D.Ports.Goods[recipe.inputs[1]]
					chain = {
						raw = raw and raw.name or recipe.inputs[1],
						processed = good.name,
						port = originPortId and D.Ports.Ports[originPortId].name or "지역 공방",
						markets = {}, research = D.KnowledgeTree.TaxonomyById[recipe.disc]
							and D.KnowledgeTree.TaxonomyById[recipe.disc].name or recipe.disc,
					}
				end
				table.insert(view.codex.resources, {
					id = id, name = good.name, category = kindId,
					categoryName = group and group.name or "가공품",
					discipline = subject and subject.name or "기타",
					appliedDiscipline = if good.discipline and D.KnowledgeTree.TaxonomyById[good.discipline] then D.KnowledgeTree.TaxonomyById[good.discipline].name else nil,
					cardId = card and card.id or nil,
					cardName = card and card.name or "연관 지식 미등록", chain = chain,
					origin = originPortId and D.Ports.Ports[originPortId].name or nil,
				})
				view.codex.resourceCounts[kindId] = (view.codex.resourceCounts[kindId] or 0) + 1
			end
			table.sort(view.codex.resources, function(a, b) return a.name < b.name end)
			view.codex.rank = S.Codex.rankTitle(state)
		end

		-- 연구
		view.tech = {}
		for _, id in D.Tech.Order do
			local t = D.Tech.Tech[id]
			table.insert(view.tech, {
				id = t.id,
				name = t.name,
				cost = t.cost,
				summary = t.summary,
				owned = state.tech[id] == true,
				blocked = S.Research.blockReason(state, t),
			})
		end

		-- 자동스킬
		view.loadout = { slots = D.Careers.loadoutSlots(state.careers.battle.level), equipped = table.clone(state.loadout), skills = {} }
		for _, id in D.Skills.Order do
			local s = D.Skills.Skills[id]
			table.insert(view.loadout.skills, {
				id = id,
				name = s.name,
				phase = s.phase,
				cooldown = s.cooldown,
				summary = s.summary,
				steamOnly = s.steamOnly,
				locked = S.Battle.skillBlock(state, s),
			})
		end

		local rec0 = S.Perk.recommendSpec(state, 1, nil)
		view.specialties = {
			current = state.specialty, changeFee = if state.specAuto then 0 else D.Specialties.CHANGE_FEE, list = {},
			auto = state.specAuto == true, sub = state.subSpecialty, recommend = rec0 and rec0.id or nil,
			unlockCards = D.Specialties.UNLOCK_CARDS,
			subOpen = state.specialty ~= nil and S.Perk.specLevel(state, state.specialty) >= D.Specialties.SUB_LEVEL,
		}
		for _, sp in D.Specialties.Specialties do
			local rec = state.specLevels[sp.id]
			local researchNames = {}
			for _, id in sp.disciplines or {} do
				local d = D.KnowledgeTree.DisciplineById[id]
				if d then table.insert(researchNames, d.name) end
			end
			table.insert(view.specialties.list, {
				id = sp.id,
				name = sp.name,
				summary = sp.summary .. " · 관련 학문: " .. table.concat(researchNames, "·"),
				disciplines = table.clone(sp.disciplines or {}),
				level = if rec then rec.level else 1,
				rank = D.Specialties.rankName(if rec then rec.level else 1),
				cards = S.Perk.cardsIn(state, sp),
				unlocked = S.Perk.specUnlocked(state, sp),
				domain = sp.domain and D.KnowledgeTree.DomainById[sp.domain] and D.KnowledgeTree.DomainById[sp.domain].name or nil,
				xp = if rec then rec.xp else 0,
				nextXp = if rec and rec.level >= D.Specialties.MAX_LEVEL then 0 else D.Specialties.xpForNext(if rec then rec.level else 1),
			})
		end
		view.companions = { max = D.Specialties.slotsFor(def.class), list = {}, stations = {} }
		do
			local vs, vc = S.Perk.vacancy(state)
			view.companions.vacancy = { speed = vs, cannon = vc }
		end
		for _, st in D.Specialties.Stations do
			local who = state.stations[st.id]
			local c = who and D.Specialties.CompanionById[who]
			table.insert(view.companions.stations, {
				id = st.id, name = st.name, summary = st.summary, seatId = who, seatName = c and c.name,
				matched = c ~= nil and D.Specialties.CompanionStation[who] == st.id,
			})
		end
		for _, c in D.Specialties.Companions do
			-- 영입 완료한 동료는 현재 국적과 무관하게 목록·항구·탐험 소환에 항상 포함한다.
			if not c.nation or c.nation == state.nationId or table.find(state.companions, c.id) ~= nil then
				local researchNames = {}
				for _, id in c.disciplines or {} do
					local d = D.KnowledgeTree.DisciplineById[id]
					if d then table.insert(researchNames, d.name) end
				end
			table.insert(view.companions.list, {
				id = c.id,
				name = c.name,
				summary = c.summary .. " · 연구 보조: " .. table.concat(researchNames, "·"),
				disciplines = table.clone(c.disciplines or {}),
				role = c.role,
				bestSeat = D.Specialties.StationById[D.Specialties.CompanionStation[c.id] or "boatswain"].name,
				fee = c.fee,
				joined = table.find(state.companions, c.id) ~= nil,
				affinity = state.affinity[c.id] or 0,
				tier = D.Specialties.affinityTier(state.affinity[c.id] or 0),
				blocked = S.Perk.recruitBlock(state, c),
			})
			end
		end

		view.wars, view.war = S.Battle.warView(state)
		view.tavern = S.Tavern.view(state)
		view.tavernQ = S.Tavern.questView(state)
		view.chron = S.Chronicle.view(state)
		view.village = S.Village.view(state)
		view.scenes = state._scenes -- 이번에 새로 생긴 퀘스트 이야기 장면 (한 번만 보낸다)
		state._scenes = nil
		view.bosses = {}
		for _, b in D.Bosses.Bosses do
			local rec = state.bosses[b.id]
			table.insert(view.bosses, {
				id = b.id,
				name = b.name,
				summary = b.summary,
				defeated = if rec then rec.defeated else 0,
				blocked = S.Boss.blockReason(state, b),
				ports = b.portIds,
			})
		end

		do
			local inv = S.Harbor.invested(state)
			local lv = S.Harbor.level(state)
			local rg = D.Harbor.regime(state.startYear + math.floor(state.day / 365))
			view.harbor = {
				regime = { id = rg.id, name = rg.name, kind = rg.kind, note = rg.note, price = rg.price },
				portType = D.Harbor.portType(port.produces),
				economy = S.Harbor.economyOf(state, port.id),
				sim = S.Econ.town(state, port.id),
				builtLandmarks = ((state.landmarks or {})[port.id] or {}),
				level = lv,
				name = D.Harbor.NAMES[lv],
				invested = inv,
				nextAt = D.Harbor.THRESHOLDS[lv + 1],
				sellBonus = D.Harbor.SELL_BONUS[lv],
				discount = D.Harbor.COST_DISCOUNT[lv],
				options = D.Harbor.OPTIONS,
				rumorCost = D.Harbor.RUMOR_COST,
				produces = {},
				demands = {},
			}
			local full = D.Harbor.producesOf(port.produces, rid0, yr0)
			local lvE = lv0
			for i, id in full do
				if lvE >= D.Harbor.unlockLevel(i) or S.Knowledge.disciplineOpens(state, port.id, id) then
					table.insert(view.harbor.produces, D.Ports.Goods[id].name)
				else
					view.harbor.nextProduce = view.harbor.nextProduce or { name = D.Ports.Goods[id].name, level = D.Harbor.unlockLevel(i) }
				end
			end
			local dem = D.Harbor.demandsOf(port.demands, rid0, yr0, port.produces)
			for i, id in dem do
				if lvE >= D.Harbor.unlockLevel(i) then
					table.insert(view.harbor.demands, D.Ports.Goods[id].name)
				else
					view.harbor.nextDemand = view.harbor.nextDemand or { name = D.Ports.Goods[id].name, level = D.Harbor.unlockLevel(i) }
				end
			end
		end

		do
			S.Facility.accrue(state)
			S.Facility.contractExpired(state)
			view.facilities = {}
			for _, kind in { "bank", "guild", "palace", "harbormaster" } do
				if D.Facilities.has(kind, port.id, S.Harbor.level(state)) then
					table.insert(view.facilities, kind)
				end
			end
			view.bank = {
				deposit = state.bank.deposit,
				loan = state.bank.loan,
				limit = S.Facility.loanLimit(state),
				depositRate = D.Facilities.bankAt(S.Harbor.level(state)).depositRate,
				loanRate = D.Facilities.bankAt(S.Harbor.level(state)).loanRate,
				name = D.Facilities.bankAt(S.Harbor.level(state)).name,
				level = S.Harbor.level(state),
			}
			view.guild = { offers = S.Facility.offers(state), contract = nil }
			if state.contract then
				local c = state.contract
				view.guild.contract = {
					goodName = D.Ports.Goods[c.goodId].name,
					amount = c.amount,
					toPortName = D.Ports.Ports[c.toPortId].name,
					toPortId = c.toPortId,
					reward = c.reward,
					daysLeft = c.deadline - state.day,
					have = state.cargo[c.goodId] or 0,
				}
			end
			local nextTitle = D.Facilities.TITLES[state.title + 1]
			-- 왕궁 화면의 단계·인구 지표는 세계경제와 동일한 시뮬 스냅샷에서 가져온다.
			local royalSim = view.harbor and view.harbor.sim
			local cityTier = math.clamp(math.floor((S.Harbor.level(state) + (royalSim and royalSim.stage or S.Harbor.level(state))) / 2 + 0.5), 1, 5)
			local prosperity = if royalSim then math.clamp((royalSim.prosperity or 100) / 100, 0.25, 1.4) else 1
			local royalTier = math.max(1, math.min(cityTier, math.floor(cityTier * (0.72 + prosperity * 0.28) + 0.5)))
			view.palace = {
				name = D.Facilities.palaceName(port.id),
				royalTier = royalTier,
				cityTier = cityTier,
				royalPlotScale = D.PortBuildings.RoyalCityPlots.plotScale[cityTier],
				worldPopulation = royalSim and royalSim.pop or nil,
				-- 장면과 동일한 기준으로 기존 거주자 중 왕궁 종사자 표본을 표시한다. 신규 경제 인구는 아니다.
				royalWorkers = D.PortBuildings.royalPopulation(royalSim and royalSim.residents, royalSim and royalSim.prosperity, royalTier),
				royalWorkersTarget = D.PortBuildings.RoyalCourtTargets[royalTier],
				title = if state.title > 0 then D.Facilities.TITLES[state.title].name else nil,
				nextTitle = if nextTitle then nextTitle.name else nil,
				nextFame = if nextTitle then nextTitle.fame else nil,
				nextCoins = if nextTitle then nextTitle.coins else nil,
			}
			view.story = {}
			for _, e in D.Story.Events do
				if e.portId == port.id then
					local reason = S.Story.blockReason(state, e)
					if not reason then
						table.insert(view.story, {
							id = e.id, title = e.title, chapter = e.chapter, art = e.art, npc = e.npc, lines = e.lines,
							choices = (function()
								local out = {}
								for i, c in e.choices do
									table.insert(out, { index = i, text = c.text, minFame = c.minFame, cost = c.cost })
								end
								return out
							end)(),
						})
					end
				end
			end
		end

		do
			local base = D.Ships.Ships[state.ship.id]
			local currentCannon = D.Ships.CannonById[state.ship.cannon or "basic"] or D.Ships.CannonById.basic
			view.refit = {
				class = base.class, className = D.Ships.ClassNames[base.class], cannons = {},
				cannonId = state.ship.cannon, cannonName = currentCannon.name, cannonMult = currentCannon.mult, plating = state.ship.plating,
			}
			for _, c in D.Ships.Cannons do
				local after = D.Ships.refit(base, c.id, state.ship.plating)
				table.insert(view.refit.cannons, {
					id = c.id, name = c.name, price = c.price, mult = c.mult, weight = c.weight, summary = c.summary,
					netCost = math.max(0, c.price - math.floor(currentCannon.price * 0.5)),
					capacityAfter = S.State.cargoCapacityFor(state, after),
					canCarry = S.State.cargoUsed(state) <= S.State.cargoCapacityFor(state, after),
					owned = c.id == state.ship.cannon, locked = S.Shipyard.cannonBlock(state, c),
				})
			end
			local nextPl = D.Ships.Plating[state.ship.plating + 1]
			if nextPl then
				local after = D.Ships.refit(base, state.ship.cannon, state.ship.plating + 1)
				view.refit.nextPlating = {
					name = nextPl.name, price = nextPl.price, hull = nextPl.hull, weight = nextPl.weight, speed = nextPl.speed,
					hullAfter = after.hull, speedAfter = after.speed,
					capacityAfter = S.State.cargoCapacityFor(state, after),
					canCarry = S.State.cargoUsed(state) <= S.State.cargoCapacityFor(state, after),
					locked = S.Shipyard.plateBlock(state, state.ship.plating + 1),
				}
			end
			local lic = D.Ships.Licenses[state.license + 1]
			view.harbormaster = {
				license = if state.license > 0 then D.Ships.Licenses[state.license].name else nil,
				nextLicense = if lic then { name = lic.name, fame = lic.fame, fee = lic.fee } else nil,
				insured = state.insured,
				insurancePrice = S.Facility.insurancePrice(state),
			}
		end

		-- 백병전 카드 패: 게임 곳곳의 성과가 카드가 된다. 효과는 해전 장면의 기동 점수에만 쓰인다 (전투 결과는 서버 판정).
		--  주인공·동료(스킬 카드) / 발견한 지식·유물·동물(분야별 카드) / 만난 항해자(우군 카드) / 지금 타는 배(선박 카드) / 라이벌의 인정
		do
			local STATION_SKILL = { gunner = "volley", surgeon = "heal", helm = "wind", boatswain = "banner", mate = "retreat", scholar = "analyze" }
			local FIELD_SKILL = {
				Zoology = "beast", Botany = "heal", Medicine = "heal", Astronomy = "snipe", Navigation = "focus", Geography = "scout",
				Weather = "ward", Physics = "armor", Chemistry = "volley", Mineral = "rally", Relic = "luck", Site = "luck", Art = "rally",
				Architecture = "ward", Language = "analyze", Philosophy = "analyze", Myth = "luck", Mystery = "luck", Lost = "scout", Shipbuilding = "ward", Goods = "rally",
			}
			local FIELD_KIND = { Zoology = "animal", Relic = "relic", Site = "relic", Art = "relic", Architecture = "relic", Mineral = "relic", Myth = "relic", Mystery = "relic", Lost = "relic" }
			local ROLE_SKILL = { soldier = "volley", privateer = "rally", merchant = "ward", explorer = "scout", pirate = "luck", pilgrim = "heal" }
			local SHIP_SKILL = { caravel = "focus", fluyt = "ward", frigate = "volley", galleon = "ward", paddle_steamer = "insight", ironclad_frigate = "ward" }
			local cards = {}
			local cap = view.captain
			table.insert(cards, { kind = "crew", name = (cap and cap.name) or "선장", skill = "command" })
			for _, cid in state.companions do
				local c = D.Specialties.CompanionById[cid]
				if c and #cards < 4 then
					local aff = (state.affinity and state.affinity[cid]) or 0
					table.insert(cards, { kind = "crew", name = c.name, skill = STATION_SKILL[D.Specialties.CompanionStation[cid] or ""] or "analyze", tier = math.clamp(1 + math.floor(aff / 40), 1, 3) })
				end
			end
			-- 분야마다 가장 귀한 발견 하나씩, 귀한 순서로 5장
			local rank = { Legendary = 5, Epic = 4, Rare = 3, Uncommon = 2, Common = 1 }
			local bestOf = {}
			for _, c in D.Cards.Cards do
				if state.discovered[c.id] and FIELD_SKILL[c.field] then
					local cur = bestOf[c.field]
					if not cur or rank[c.rarity] > rank[cur.rarity] or (rank[c.rarity] == rank[cur.rarity] and c.id < cur.id) then
						bestOf[c.field] = c
					end
				end
			end
			local picks = {}
			for _, c in bestOf do
				table.insert(picks, c)
			end
			table.sort(picks, function(a, b)
				if rank[a.rarity] ~= rank[b.rarity] then
					return rank[a.rarity] > rank[b.rarity]
				end
				return a.id < b.id
			end)
			for i = 1, math.min(5, #picks) do
				local c = picks[i]
				table.insert(cards, { kind = FIELD_KIND[c.field] or "book", name = c.name, skill = FIELD_SKILL[c.field] })
			end
			-- 만난 항해자는 우군이 된다
			local metIds = {}
			for id in (state.diplo and state.diplo.met) or {} do
				table.insert(metIds, id)
			end
			table.sort(metIds)
			local friends = 0
			for _, id in metIds do
				local v = D.Specialties.VoyagerById[id]
				if v and friends < 2 and not v.rival then
					friends += 1
					table.insert(cards, { kind = "friend", name = v.name, skill = ROLE_SKILL[v.role] or "scout" })
				end
			end
			if state.diplo and (state.diplo.rivalN or 0) >= 5 then
				table.insert(cards, { kind = "friend", name = "칼레브", skill = "luck" })
			end
			table.insert(cards, { kind = "ship", name = D.Ships.Ships[state.ship.id] and D.Ships.Ships[state.ship.id].name or "배", skill = SHIP_SKILL[state.ship.id] or "focus" })
			local faction = D.BoardingCards.factionOf(state.nationId)
			local spec = S.Cardbook.deckSpec(state)
			view.deck = { cards = cards, faction = faction, book = { ids = spec.ids, tier = spec.tier, bonus = spec.bonus, leader = spec.leader } }
			do
				local ns = S.Cardbook.navalSupport(state)
				view.navalSupport, view.navalEffects = ns.lines, ns.entries
			end
			-- [건축 시뮬] 이 항구 공사 진행. 곡물 품귀(흉년)면 공사가 멈춘다.
			local crisis = if S.Econ and S.Econ.crisis then S.Econ.crisis(state, state.portId) else nil
			D.PortBuildings.Projects.update(state, state.portId, crisis)
			view.buildProjects = D.PortBuildings.Projects.active(state, state.portId)
			-- [교역 재미] 상회 등급·축제 예고·라이벌 상단·희귀 화물
			view.tradeFun = if D.TradeFun then D.TradeFun.view(state, D.Ports, D.Regions) else nil
			view.buildCelebrate = D.PortBuildings.Projects.recentDone(state, state.portId)
			view.cardbook = { faction = faction, leader = spec.leader, bonus = spec.bonus, knowledgeCount = select(2, D.CardBook.knowledgeBonus(state.discovered, D.Cards.ById)), owned = S.Cardbook.get(state).owned, tier = spec.tier, deck = S.Cardbook.get(state).deck, ids = spec.ids, slots = S.Cardbook.get(state).slots, pick = S.Cardbook.get(state).pick and S.Cardbook.get(state).pick.ids, practiceIds = S.Cardbook.practiceBook(state).ids, practiceDone = S.Cardbook.get(state).practiceDone == true, day = math.floor(os.time() / 86400), duelSeed = S.Cardbook.get(state).duelSeed, duelFoe = (S.Cardbook.get(state) :: any).duelFoe, duelLeft = math.max(0, 3 - (if S.Cardbook.get(state).duelDay == math.floor(os.time() / 86400) then (S.Cardbook.get(state).duelWins or 0) else 0)) }
			if S.Battle and S.Battle.deckCache then
				S.Battle.deckCache[state] = cards
				S.Battle.deckFaction[state] = faction
			end
		end

		view.lastBattle = state.lastBattle
		view.voyageEvent = state.voyageEvent
		view.visitedPorts = state.stats.visited
		view.seaBoss = state.seaBoss
		-- 수동 항해에 반영되는 동료 효과: 항해 속도 보너스→고리 판정 확대, 의사 효과→충돌 후 멈춤 단축
		local extra: any = {
			crew = { speed = S.Perk.speedMult(state) - 1, heal = S.Perk.healReduction(state), rookie = D.Voyage.rookie(state.careers.adventure.level) },
			sailTutorial = not (state.stats :: any).sailTutorialDone,
		}
		for k, v in extra do
			(view :: any)[k] = v
		end
		return view
	end

	return View
end
