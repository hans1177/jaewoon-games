--!nonstrict
-- 역사의 속도: 건물·기술 사건은 시대(연도)순으로 열리지만, 플레이어가 일찍 발견하고 보고하고 연구를 돕고 퀘스트를 해내면
-- 그만큼 역사가 앞당겨진다. 너무 빨라지지 않게 세 가지로 속도를 조절한다.
--  1) 총 앞당김은 최대 CAP_YEARS 년까지   2) 90일마다 얻을 수 있는 앞당김에 한도(WINDOW_CAP일)   3) 앞서 갈수록 얻는 양이 줄어든다.

return function(D, S)
	local CAP_DAYS = 365 * 10
	local WINDOW, WINDOW_CAP = 90, 30
	local RARITY_DAYS = { Common = 1, Uncommon = 2, Rare = 4, Epic = 8, Legendary = 12 }

	local P = { CAP_DAYS = CAP_DAYS, RARITY_DAYS = RARITY_DAYS }

	local function pace(state)
		state.pace = state.pace or { days = 0, window = 0, used = 0 }
		return state.pace
	end

	-- 앞당겨진 날수
	function P.days(state)
		return state.pace and state.pace.days or 0
	end

	-- 건물·기술 조건에 쓰는 '실질 연도' (게임 연도 + 앞당김)
	function P.effYear(state)
		return state.startYear + (state.day + P.days(state)) / 365
	end

	-- 앞당김을 쌓는다. 실제로 쌓인 날수를 돌려준다 (한도 때문에 0일 수도 있다).
	function P.add(state, days)
		local p = pace(state)
		if state.day - p.window >= WINDOW then
			p.window, p.used = state.day, 0
		end
		-- 앞서 갈수록 덜 쌓인다
		local scaled = days * (1 - p.days / CAP_DAYS)
		local room = math.min(WINDOW_CAP - p.used, CAP_DAYS - p.days)
		local gain = math.floor(math.min(scaled, room) + 0.5)
		if gain <= 0 then
			return 0
		end
		p.days += gain
		p.used += gain
		return gain
	end

	-- 메시지로 알릴 때 쓴다
	function P.addMsg(state, days, msgs, why)
		local g = P.add(state, days)
		if g > 0 and msgs then
			table.insert(msgs, string.format("역사가 %d일 앞당겨졌다 (%s)", g, why))
		end
		return g
	end

	function P.viewOf(state)
		local p = pace(state)
		return {
			days = p.days, capDays = CAP_DAYS, years = math.floor(p.days / 36.5) / 10,
			windowLeft = math.max(0, WINDOW_CAP - (if state.day - p.window >= WINDOW then 0 else p.used)),
			windowCap = WINDOW_CAP, windowDays = WINDOW,
		}
	end

	return { handlers = {}, days = P.days, effYear = P.effYear, add = P.add, addMsg = P.addMsg, viewOf = P.viewOf, RARITY_DAYS = RARITY_DAYS }
end
