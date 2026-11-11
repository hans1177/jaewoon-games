--!nonstrict
-- 항구 치안: 값 계산(하루 0.5씩 목표로 이동), 순찰, 재해 충격, 판매 보너스.

return function(D, S)
	local O = D.PortOrder
	local handlers = {}

	local function targetOf(state, portId)
		local port = D.Ports.Ports[portId]
		local stage = state.portStages and state.portStages[portId] and state.portStages[portId].guard or 0
		local hl = D.Harbor.level(state.harbor[portId] or 0)
		local year = state.startYear + state.day / 365
		return O.target(D.Regions.of(port).id, portId, year, stage, hl)
	end

	local function currentOf(state, portId)
		local t = targetOf(state, portId)
		local rec = state.order[portId]
		if not rec then
			return t
		end
		local step = math.max(0, state.day - rec.day) * O.DRIFT_PER_DAY
		local v = rec.v
		if v < t then
			v = math.min(t, v + step)
		else
			v = math.max(t, v - step)
		end
		return v
	end

	local function setValue(state, portId, v)
		local rec = state.order[portId] or { v = 0, day = state.day, patrolDay = -1000 }
		rec.v = math.max(0, math.min(100, v))
		rec.day = state.day
		state.order[portId] = rec
	end

	local function sellBonus(state)
		return (currentOf(state, state.portId) - 50) * O.SELL_PER_POINT
	end

	-- 재해가 항구를 덮치면 치안이 흔들린다
	local function shock(state, portId, amount)
		if D.Ports.Ports[portId] then
			setValue(state, portId, currentOf(state, portId) - (amount or O.DISASTER_SHOCK))
		end
	end

	function handlers.OrderPatrol(state)
		local portId = state.portId
		local rec = state.order[portId]
		local last = rec and rec.patrolDay or -1000
		if state.day - last < O.PATROL_COOLDOWN then
			return false, string.format("순찰은 %d일에 한 번만 보낼 수 있어요 (%d일 남음)", O.PATROL_COOLDOWN, O.PATROL_COOLDOWN - (state.day - last))
		end
		if state.coins < O.PATROL_COST then
			return false, "코인이 부족해요"
		end
		local cur = currentOf(state, portId)
		if cur >= 100 then
			return false, "이미 더할 나위 없이 평온해요"
		end
		state.coins -= O.PATROL_COST
		setValue(state, portId, cur + O.PATROL_GAIN)
		state.order[portId].patrolDay = state.day
		state.orderPatrols += 1
		state.fame += 1
		local now = currentOf(state, portId)
		return true, string.format("순찰대를 보냈다. 치안 %d → %d (%s). 시간이 지나면 항구의 기본 치안으로 서서히 돌아가요.", math.floor(cur), math.floor(now), O.labelOf(now))
	end

	local function viewOf(state)
		local portId = state.portId
		local cur = currentOf(state, portId)
		local rec = state.order[portId]
		local left = math.max(0, O.PATROL_COOLDOWN - (state.day - (rec and rec.patrolDay or -1000)))
		local bonus = (cur - 50) * O.SELL_PER_POINT
		return {
			value = math.floor(cur + 0.5), target = math.floor(targetOf(state, portId) + 0.5), label = O.labelOf(cur),
			sellBonus = bonus, cost = O.PATROL_COST, gain = O.PATROL_GAIN, cooldownLeft = left, patrols = state.orderPatrols,
		}
	end

	return { handlers = handlers, currentOf = currentOf, targetOf = targetOf, sellBonus = sellBonus, shock = shock, viewOf = viewOf }
end
