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

	-- 항구 주인 나라의 지도자·군사·발견·문화권 요약 (표시 전용). 실패해도 경제 화면은 그대로 나온다.
	function X.nationSummary(state: any, w: any, portId: any): any
		local ok, result = pcall(function()
			if not w.nations then return nil end
			local N = E.Nations
			local home = D.Specialties and D.Specialties.NationPower and D.Specialties.NationPower[state.nationId] or nil
			return N.summary(w.nations, w, portId, home)
		end)
		if ok then return result end
		return nil
	end

	-- [항구-국가 연결 · 2026-11-29 오너: "항구별 국가별 연결"] 화면·발전 계산용 구조화 요약.
	-- owner(현재 주인 나라, 점령 반영)·colony·unrest·war·rank·hegemon. 실패하면 nil(기존 화면 유지).
	function X.portNation(state: any, w: any, portId: any): any
		local ok, result = pcall(function()
			if not w or not w.nations then return nil end
			local N = E.Nations
			local pv = N.portView(w.nations, w, portId)
			if not pv then return nil end
			local st = w.nations.states[pv.owner]
			local v = N.view(w.nations, pv.owner)
			return {
				owner = pv.owner, colony = pv.colony == true,
				unrest = math.floor((tonumber(pv.unrest) or 0) * 100 + 0.5),
				war = st ~= nil and st.war ~= nil, foe = st and st.war and st.war.foe or nil,
				rank = v and v.rank or nil, hegemon = w.nations.hegemon == pv.owner,
			}
		end)
		if ok then return result end
		return nil
	end

	-- 플레이어의 외교 개입(군수 납품·중재·용병 해군). 반환: ok, 설명. 재화 차감은 호출한 쪽이 처리한다.
	function X.aid(state: any, kind: any, targetNation: any, amount: any): (boolean, string)
		local ok, success, text = pcall(function()
			local w = ensure(state)
			if not w or not w.nations then return false, "세계 정보가 아직 없어요" end
			local home = D.Specialties and D.Specialties.NationPower and D.Specialties.NationPower[state.nationId] or nil
			local okA, msg = E.Nations.aid(w.nations, w, home, kind, targetNation, amount)
			if okA then worldDirty = true end
			return okA, msg
		end)
		if ok then return success, text end
		return false, "지금은 개입할 수 없어요"
	end

	-- 거래 관세 정책 (배율·금수). 세계나 국가 정보가 없거나 오류면 nil → 기존 관세 그대로.
	function X.tariffPolicy(state: any, portId: any): any
		local ok, result = pcall(function()
			local w = ensure(state)
			if not w or not w.nations then return nil end
			local home = D.Specialties and D.Specialties.NationPower and D.Specialties.NationPower[state.nationId] or nil
			if not home then return nil end
			return E.Nations.tariffPolicy(w.nations, w, portId, home)
		end)
		if ok then return result end
		return nil
	end

	-- 외교 탭용 세계 정세 표 (국력 순위). 실패하면 nil.
	function X.worldSummary(state)
		local ok, result = pcall(function()
			local w = ensure(state)
			if not w or not w.nations then return nil end
			return E.Nations.worldSummary(w.nations, 8)
		end)
		if ok then return result end
		return nil
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
		for _, industry in ipairs(industries) do
			local disc = D.KnowledgeTree and D.KnowledgeTree.DisciplineById[industry.research]
			industry.researchName = disc and disc.name or industry.research
		end
		local bld, svc = {}, {}
		for _, b in ipairs(E.BUILDINGS) do
			bld[b.id] = math.floor(t.bld[b.id] + 0.5)
			if b.serves then svc[b.id] = math.floor((t.cov[b.id] or 1) * 100 + 0.5) end
		end
		-- 기존 경제 목표·실제 건축비 지출을 변경 없이 시각 건설현장에 전달.
		local targets = E.buildingTargets(t)
		local construction = { spending = math.floor((t.buildSpend or 0) * 100 + 0.5) / 100 }
		local needed = 0
		for _, id in { "house", "farm", "workshop", "market", "warehouse", "school", "hall" } do
			construction[id] = math.max(0, math.floor(((targets[id] or 0) - (t.bld[id] or 0)) * 100 + 0.5) / 100)
			needed += construction[id]
		end
		construction.active = construction.spending > 0.01 and needed > 0.01
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
			service = svc, construction = construction,
			nation = X.nationSummary(state, w, portId),
			nationLink = X.portNation(state, w, portId),
		}
	end

	-- 교역품 수급 표시: 시뮬 가격이 기준보다 크게 높으면 품귀, 낮으면 풍부 (표시 전용)
	-- [건축·경제 연동] 이 항구가 위기인가: 흉작 충격(식량 효과 < 0.9) 또는 치안 붕괴(안정도 < 0.3)
	function X.crisis(state: any, portId: any): any
		local w = ensure(state)
		local t = w and w.towns[portId]
		if not t then return nil end
		if t.fx and type(t.fx.food) == "number" and t.fx.food < 0.9 then return "흉년" end
		if type(t.stability) == "number" and t.stability < 0.3 then return "치안 붕괴" end
		return nil
	end

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

	-- 해역·나라·세계 집계 (신문·거시 화면용)
	function X.macro(state, kind, id)
		local w = ensure(state)
		if not w then return nil end
		local a = E.aggregate(w, kind, id)
		return { pop = math.floor(a.pop), gdp = math.floor(a.gdp), gdpPerCap = math.floor(a.gdpPerCap * 10) / 10, priceIdx = math.floor(a.priceIdx * 100), trade = math.floor(a.tradeOut), tech = math.floor(a.techAvg * 100), stability = math.floor(a.stability * 100), towns = a.towns }
	end

	-- 게임의 세계 이벤트가 일어나면 경제 충격으로 넣는다.
	function X.shock(state, ev, regionId)
		local w = ensure(state)
		if not w then return end
		E.addShock(w, E.shockFromEvent(ev, regionId))
		worldDirty = true
		table.insert(pendingOps, { kind = "shock", event = ev, regionId = regionId })
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
