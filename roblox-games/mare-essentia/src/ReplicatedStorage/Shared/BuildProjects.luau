--!nonstrict
-- [건축 시뮬] 플레이어가 지은 항구 건물(BuildStage)의 공사 기간·진행·완공 알림.
-- 효과(단계 상승)는 기존대로 즉시 적용하고, 화면에는 공사 기간 동안 공사장(비계·일꾼)과 진행률을 보여 준 뒤
-- 완공 알림을 한 번 띄운다. 기록은 state.stats.buildProjects (stats 는 통째 저장, 저장 구조 변경 없음).
local P = {}

P.MAX = 12 -- 기록 상한(오래된 완공 기록부터 정리)

-- 공사 기간(게임일): 건축비 비례, 2~20일
function P.daysFor(cost: number): number
	return math.clamp(math.floor(2 + (cost or 0) / 900), 2, 20)
end

function P.list(state: any): any
	local st = state.stats
	st.buildProjects = st.buildProjects or {}
	return st.buildProjects
end

function P.start(state: any, portId: string, chainId: string, stageName: string, cost: number)
	local list = P.list(state)
	local days = P.daysFor(cost)
	table.insert(list, { port = portId, chain = chainId, name = stageName, start = state.day, done = state.day + days, told = false })
	while #list > P.MAX do
		local removed = false
		for i, pr in list do
			if pr.told then
				table.remove(list, i)
				removed = true
				break
			end
		end
		if not removed then
			table.remove(list, 1)
		end
	end
	return days
end

-- [경제 연동] 흉년(곡물 품귀)·위기 동안에는 공사가 멈춘다: 지난 확인 이후 흐른 날만큼 완공일을 미룬다.
function P.update(state: any, portId: string, crisis: string?)
	for _, pr in P.list(state) do
		if pr.port == portId and state.day < pr.done then
			local last = pr.seen or state.day
			local delta = math.max(0, state.day - last)
			if crisis and delta > 0 then
				pr.done += delta
			end
			pr.paused = crisis
			pr.seen = state.day
		end
	end
end

-- 이 항구에서 공사 중인 것(진행률 0~1) 목록
function P.active(state: any, portId: string): any
	local out = {}
	for _, pr in P.list(state) do
		if pr.port == portId and state.day < pr.done then
			local span = math.max(1, pr.done - pr.start)
			table.insert(out, { name = pr.name, chain = pr.chain, left = pr.done - state.day, progress = math.clamp((state.day - pr.start) / span, 0, 1), paused = pr.paused })
		end
	end
	return out
end

-- [완공 축하] 이 항구에서 최근 3일 안에 완공된 건물(마을에 깃발·축하 인파 표시용)
function P.recentDone(state: any, portId: string): any
	for _, pr in P.list(state) do
		if pr.port == portId and state.day >= pr.done and state.day - pr.done <= 3 then
			return { name = pr.name, chain = pr.chain }
		end
	end
	return nil
end

-- 완공됐지만 아직 알리지 않은 것 하나를 꺼내 '알림 완료'로 표시
function P.popFinished(state: any): any
	for _, pr in P.list(state) do
		if not pr.told and state.day >= pr.done then
			pr.told = true
			return pr
		end
	end
	return nil
end

-- [경제 연결] 항구 투자금이 그 항구 공사를 앞당긴다: 투자 300코인당 1일, 최소 1일은 남긴다.
function P.boost(state: any, portId: string, coins: number): number
	local saved = 0
	local days = math.floor((coins or 0) / 300)
	if days <= 0 then
		return 0
	end
	for _, pr in P.list(state) do
		if pr.port == portId and state.day < pr.done then
			local cut = math.min(days, pr.done - state.day - 1)
			if cut > 0 then
				pr.done -= cut
				saved += cut
			end
		end
	end
	return saved
end

-- 저장 복원(서버 load 에서): 형식이 맞는 것만 남긴다
function P.sanitize(saved: any): any
	if type(saved) ~= "table" then
		return nil
	end
	local out = {}
	for _, pr in saved do
		if type(pr) == "table" and type(pr.port) == "string" and type(pr.chain) == "string" and type(pr.name) == "string"
			and type(pr.start) == "number" and type(pr.done) == "number" and #out < P.MAX then
			table.insert(out, { port = pr.port, chain = pr.chain, name = string.sub(pr.name, 1, 60), start = math.floor(pr.start),
				done = math.floor(pr.done), told = pr.told == true })
		end
	end
	return out
end

return P
