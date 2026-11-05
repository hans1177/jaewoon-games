--!nonstrict
-- 조선소: 배 구매(교체), 수리, 선원 고용, 보급품.

return function(D, S)
	local handlers = {}

	local REPAIR_COST = 2 -- 선체 1당 코인
	local HIRE_COST = 8 -- 선원 1명당 코인
	local SUPPLY_COST = 4 -- 보급품 1개당 코인
	local TRADE_IN_RATE = 0.5

	local function currentPort(state)
		return D.Ports.Ports[state.portId]
	end

	function handlers.BuyShip(state, p)
		local def = D.Ships.Ships[p.shipId]
		if not def then
			return false, "잘못된 요청"
		end
		if not currentPort(state).shipyard then
			return false, "이 항구에는 조선소가 없어요"
		end
		if state.ship.id == def.id then
			return false, "이미 이 배를 가지고 있어요"
		end
		if def.techReq and not state.tech[def.techReq] then
			return false, "연구가 필요해요: " .. D.Tech.Tech[def.techReq].name
		end
		local old = S.State.shipDef(state)
		local net = def.price - math.floor(old.price * TRADE_IN_RATE)
		if net > state.coins then
			return false, string.format("코인이 부족해요 (필요 %d)", net)
		end
		if S.State.cargoUsed(state) > S.State.cargoCapacityFor(state, def) then
			return false, "화물을 먼저 비워 주세요"
		end
		state.coins -= net
		state.ship = {
			id = def.id,
			hull = def.hull,
			crew = math.min(state.ship.crew, def.crew),
			supplies = state.ship.supplies,
		}
		return true, string.format("%s 인수 (-%d)", def.name, net)
	end

	function handlers.Repair(state)
		if not currentPort(state).shipyard then
			return false, "이 항구에는 조선소가 없어요"
		end
		local def = S.State.shipDef(state)
		local missing = def.hull - state.ship.hull
		if missing <= 0 then
			return false, "수리할 곳이 없어요"
		end
		local points = math.min(missing, math.floor(state.coins / REPAIR_COST))
		if points <= 0 then
			return false, "코인이 부족해요"
		end
		state.coins -= points * REPAIR_COST
		state.ship.hull += points
		return true, string.format("선체 +%d 수리 (-%d)", points, points * REPAIR_COST)
	end

	function handlers.HireCrew(state, p)
		local def = S.State.shipDef(state)
		local want = math.floor(tonumber(p.amount) or 0)
		local room = def.crew - state.ship.crew
		local n = math.min(want, room, math.floor(state.coins / HIRE_COST))
		if n <= 0 then
			return false, if room <= 0 then "선원이 가득 찼어요" else "코인이 부족해요"
		end
		state.coins -= n * HIRE_COST
		state.ship.crew += n
		return true, string.format("선원 %d명 고용 (-%d)", n, n * HIRE_COST)
	end

	function handlers.BuySupplies(state, p)
		local want = math.floor(tonumber(p.amount) or 0)
		local room = S.State.maxSupplies() - state.ship.supplies
		local n = math.min(want, room, math.floor(state.coins / SUPPLY_COST))
		if n <= 0 then
			return false, if room <= 0 then "보급품 창고가 가득 찼어요" else "코인이 부족해요"
		end
		state.coins -= n * SUPPLY_COST
		state.ship.supplies += n
		return true, string.format("보급품 %d개 구매 (-%d)", n, n * SUPPLY_COST)
	end

	return {
		handlers = handlers,
		REPAIR_COST = REPAIR_COST,
		HIRE_COST = HIRE_COST,
		SUPPLY_COST = SUPPLY_COST,
	}
end
