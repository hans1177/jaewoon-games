--!nonstrict
-- 살아 있는 세계 경제: Economy(순수 시뮬)를 서버에서 하루씩 돌려 항구마다 인구·발전 단계·직업·번영도를 낸다.
-- 세계는 서버에 하나다. 플레이어의 날짜(state.day)를 따라 한 번에 MAX_CATCHUP 일까지만 따라잡는다(끊김 방지).
-- 저장에는 넣지 않는다: 같은 시드로 다시 시작하면 같은 역사가 다시 흐른다. 시뮬이 없으면(D.Economy == nil) 아무것도 하지 않는다.

return function(D, S)
	local E = D.Economy
	local X = { handlers = {} }
	local MAX_CATCHUP = 45
	local world = nil

	local function ensure(state)
		if not E then return nil end
		if not world then
			world = E.newWorld({ seed = 20260 + (state.startYear or 1650), year = state.startYear or 1650 })
		end
		return world
	end

	-- 플레이어 날짜까지 세계를 진행한다 (일부만 따라잡고 남는 날은 다음 호출에서).
	function X.advance(state)
		local w = ensure(state)
		if not w then return 0 end
		local target = state.day or 0
		local n = math.clamp(target - w.day, 0, MAX_CATCHUP)
		for _ = 1, n do E.step(w) end
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
			day = w.day,
			buildings = bld, housing = { cap = math.floor(E.housingCap(t)), ratio = math.floor(t.housingRatio * 100 + 0.5) },
			work = { jobs = math.floor(E.jobsCap(t)), unemployment = math.floor(t.unemp * 100 + 0.5) },
			service = svc,
		}
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
	end

	-- 지식카드(학문) → 마을 경제 기술 분야. 한 학문이 여러 분야에 가중치로 퍼진다.
	local DISC_TECH = {
		botany = { agri = 1 }, zoology = { agri = 0.6 }, chemistry = { agri = 0.4, craft = 0.6 },
		architecture = { craft = 1 }, mineralogy = { craft = 0.8 }, physics = { craft = 0.7 }, art = { craft = 0.4, gov = 0.3 },
		commerce = { commerce = 1 }, linguistics = { commerce = 0.5, gov = 0.5 }, philosophy = { gov = 0.5, commerce = 0.2 },
		geography = { sea = 0.7 }, navigation = { sea = 1 }, astronomy = { sea = 0.5 }, meteorology = { sea = 0.6, agri = 0.3 }, shipbuilding = { sea = 0.8, craft = 0.3 },
		medicine = { medicine = 1 },
		history = { gov = 0.8 }, archaeology = { gov = 0.4 }, mythology = { gov = 0.2 },
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
			end
		end
		return town
	end

	function X.reset() world = nil end
	return X
end
