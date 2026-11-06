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
		if def.class >= 2 and state.license < def.class - 1 then
			return false, string.format("항만청 면허가 필요해요: %s", D.Ships.Licenses[def.class - 1].name)
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
			cannon = "basic",
			plating = 0,
		}
		return true, string.format("%s 인수 (-%d)", def.name, net)
	end

	-- 현재 개조가 주는 대포 위력 보너스
	local function cannonMult(state)
		local c = D.Ships.CannonById[state.ship.cannon or "basic"]
		return if c then c.mult else 0
	end

	local function cannonBlock(state, c)
		if c.techReq and not state.tech[c.techReq] then
			return "연구 필요: " .. D.Tech.Tech[c.techReq].name
		end
		if c.storyReq and not state.story[c.storyReq] then
			return "이야기 필요"
		end
		return nil
	end

	local function plateBlock(state, level)
		local pl = D.Ships.Plating[level]
		if pl and pl.techReq and not state.tech[pl.techReq] then
			return "연구 필요: " .. D.Tech.Tech[pl.techReq].name
		end
		return nil
	end

	function handlers.BuyCannon(state, p)
		if not currentPort(state).shipyard then
			return false, "이 항구에는 조선소가 없어요"
		end
		local c = type(p.cannonId) == "string" and D.Ships.CannonById[p.cannonId]
		if not c then
			return false, "잘못된 요청"
		end
		if (state.ship.cannon or "basic") == c.id then
			return false, "이미 장착했어요"
		end
		local block = cannonBlock(state, c)
		if block then
			return false, block
		end
		local old = D.Ships.CannonById[state.ship.cannon or "basic"]
		local net = c.price - math.floor(old.price * 0.5)
		if net > state.coins then
			return false, string.format("코인이 부족해요 (필요 %d)", net)
		end
		local newDef = D.Ships.refit(D.Ships.Ships[state.ship.id], c.id, state.ship.plating)
		if S.State.cargoUsed(state) > S.State.cargoCapacityFor(state, newDef) then
			return false, "대포가 무거워 화물이 넘쳐요. 화물을 먼저 비워 주세요"
		end
		state.coins -= math.max(0, net)
		state.ship.cannon = c.id
		return true, string.format("%s 장착 (-%d)", c.name, math.max(0, net))
	end

	function handlers.BuyPlating(state)
		if not currentPort(state).shipyard then
			return false, "이 항구에는 조선소가 없어요"
		end
		local level = (state.ship.plating or 0) + 1
		local pl = D.Ships.Plating[level]
		if not pl then
			return false, "이미 최고 단계예요"
		end
		local block = plateBlock(state, level)
		if block then
			return false, block
		end
		if pl.price > state.coins then
			return false, string.format("코인이 부족해요 (필요 %d)", pl.price)
		end
		local newDef = D.Ships.refit(D.Ships.Ships[state.ship.id], state.ship.cannon, level)
		if S.State.cargoUsed(state) > S.State.cargoCapacityFor(state, newDef) then
			return false, "보강으로 무거워져 화물이 넘쳐요. 화물을 먼저 비워 주세요"
		end
		local oldDef = S.State.shipDef(state)
		state.coins -= pl.price
		state.ship.plating = level
		state.ship.hull += newDef.hull - oldDef.hull
		return true, string.format("%s 완료 (-%d)", pl.name, pl.price)
	end

	local function cost(state, base)
		return math.max(1, math.floor(base * S.Harbor.costMult(state)))
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
		local points = math.min(missing, math.floor(state.coins / cost(state, REPAIR_COST)))
		if points <= 0 then
			return false, "코인이 부족해요"
		end
		state.coins -= points * cost(state, REPAIR_COST)
		state.ship.hull += points
		return true, string.format("선체 +%d 수리 (-%d)", points, points * cost(state, REPAIR_COST))
	end

	function handlers.HireCrew(state, p)
		local def = S.State.shipDef(state)
		local want = math.floor(tonumber(p.amount) or 0)
		local room = def.crew - state.ship.crew
		local n = math.min(want, room, math.floor(state.coins / cost(state, HIRE_COST)))
		if n <= 0 then
			return false, if room <= 0 then "선원이 가득 찼어요" else "코인이 부족해요"
		end
		state.coins -= n * cost(state, HIRE_COST)
		state.ship.crew += n
		return true, string.format("선원 %d명 고용 (-%d)", n, n * cost(state, HIRE_COST))
	end

	function handlers.BuySupplies(state, p)
		local want = math.floor(tonumber(p.amount) or 0)
		local room = S.State.maxSupplies() - state.ship.supplies
		local n = math.min(want, room, math.floor(state.coins / cost(state, SUPPLY_COST)))
		if n <= 0 then
			return false, if room <= 0 then "보급품 창고가 가득 찼어요" else "코인이 부족해요"
		end
		state.coins -= n * cost(state, SUPPLY_COST)
		state.ship.supplies += n
		return true, string.format("보급품 %d개 구매 (-%d)", n, n * cost(state, SUPPLY_COST))
	end

	return {
		handlers = handlers,
		cannonMult = cannonMult,
		cannonBlock = cannonBlock,
		plateBlock = plateBlock,
		REPAIR_COST = REPAIR_COST,
		HIRE_COST = HIRE_COST,
		SUPPLY_COST = SUPPLY_COST,
	}
end
