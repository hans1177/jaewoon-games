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
		return {
			pop = math.floor(t.pop), stage = t.stage, stageName = v.name, residents = v.residents, buildingScale = v.buildingScale,
			houses = v.houses, mood = v.mood, jobs = jobs, facilities = E.facilities(t),
			prosperity = math.floor(t.prosperity * 100 + 0.5), stability = math.floor(t.stability * 100 + 0.5),
			wage = math.floor(t.wage * 100 + 0.5), grainPrice = math.floor(t.price.grain * 10 + 0.5) / 10,
			tech = math.floor((t.tech.agri + t.tech.craft + t.tech.commerce + t.tech.sea + t.tech.medicine + t.tech.gov) / 6 * 100 + 0.5),
			tradeOut = math.floor(t.tradeOut), tradeIn = math.floor(t.tradeIn),
			cycle = math.floor((w.cycle.lvl[t.region] or 0) * 100 + 0.5),
			day = w.day,
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

	function X.reset() world = nil end
	return X
end
