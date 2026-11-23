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

-- 이 항구에서 공사 중인 것(진행률 0~1) 목록
function P.active(state: any, portId: string): any
	local out = {}
	for _, pr in P.list(state) do
		if pr.port == portId and state.day < pr.done then
			local span = math.max(1, pr.done - pr.start)
			table.insert(out, { name = pr.name, chain = pr.chain, left = pr.done - state.day, progress = math.clamp((state.day - pr.start) / span, 0, 1) })
		end
	end
	return out
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
