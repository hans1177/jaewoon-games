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
		for _, f in state.fleet do
			missing += D.Ships.Ships[f.id].hull - f.hull
		end
		if missing <= 0 then
			return false, "수리할 곳이 없어요"
		end
		local points = math.min(missing, math.floor(state.coins / cost(state, REPAIR_COST)))
		if points <= 0 then
			return false, "코인이 부족해요"
		end
		state.coins -= points * cost(state, REPAIR_COST)
		-- 기함부터, 남는 만큼 선단 배를 고친다
		local left = points
		local own = math.min(left, def.hull - state.ship.hull)
		state.ship.hull += own
		left -= own
		for _, f in state.fleet do
			local n = math.min(left, D.Ships.Ships[f.id].hull - f.hull)
			f.hull += n
			left -= n
		end
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

	-- 선단: 호위함을 최대 3척 거느린다. 포격 +8%/척, 속도 -3%/척, 항해 하루당 유지비 15코인/척.
	local ESCORT_PRICE = 1200
	function handlers.BuyEscort(state)
		if not currentPort(state).shipyard then
			return false, "호위함은 조선소가 있는 항구에서만 고용해요"
		end
		if state.escorts >= 3 then
			return false, "호위함은 최대 3척이에요"
		end
		if state.fame < 30 + state.escorts * 30 then
			return false, string.format("명성 %d 이상이 필요해요", 30 + state.escorts * 30)
		end
		if state.coins < ESCORT_PRICE then
			return false, string.format("%d코인이 필요해요", ESCORT_PRICE)
		end
		state.coins -= ESCORT_PRICE
		state.escorts += 1
		return true, string.format("호위함을 선단에 들였다 (%d척, -%d코인)", state.escorts, ESCORT_PRICE)
	end

	function handlers.DismissEscort(state)
		if state.escorts <= 0 then
			return false, "호위함이 없어요"
		end
		state.escorts -= 1
		return true, string.format("호위함 한 척을 돌려보냈다 (%d척)", state.escorts)
	end

	-- 선단 편성: 기함 외에 실제 배를 최대 3척 더 거느린다.
	-- 화물칸은 더해지고, 속도는 가장 느린 배에 맞춰지고, 해전에서는 포와 선체가 보태진다. 유지비 25코인/척/일.
	local FLEET_UPKEEP = 25
	local function fleetFameNeed(state)
		return 20 + #state.fleet * 30
	end

	function handlers.BuyFleetShip(state, p)
		local def = type(p.shipId) == "string" and D.Ships.Ships[p.shipId]
		if not def then
			return false, "잘못된 요청"
		end
		if not currentPort(state).shipyard then
			return false, "선단에 배를 들이려면 조선소가 있는 항구여야 해요"
		end
		if #state.fleet >= S.State.MAX_FLEET then
			return false, "선단은 기함 외에 최대 3척이에요"
		end
		if def.techReq and not state.tech[def.techReq] then
			return false, "연구가 필요해요: " .. D.Tech.Tech[def.techReq].name
		end
		if def.class >= 2 and state.license < def.class - 1 then
			return false, string.format("항만청 면허가 필요해요: %s", D.Ships.Licenses[def.class - 1].name)
		end
		if state.fame < fleetFameNeed(state) then
			return false, string.format("명성 %d 이상이 필요해요", fleetFameNeed(state))
		end
		if state.coins < def.price then
			return false, string.format("코인이 부족해요 (필요 %d)", def.price)
		end
		state.coins -= def.price
		table.insert(state.fleet, { id = def.id, hull = def.hull })
		return true, string.format("%s 한 척이 선단에 합류했다 (선단 %d척, -%d)", def.name, #state.fleet, def.price)
	end

	function handlers.SellFleetShip(state, p)
		local idx = math.floor(tonumber(p.index) or 0)
		local f = state.fleet[idx]
		if not f then
			return false, "그런 배가 없어요"
		end
		local def = D.Ships.Ships[f.id]
		local refund = math.floor(def.price * TRADE_IN_RATE)
		table.remove(state.fleet, idx)
		if S.State.cargoUsed(state) > S.State.cargoCapacity(state) then
			table.insert(state.fleet, idx, f)
			return false, "화물을 먼저 비워 주세요 (그 배의 화물칸이 줄어요)"
		end
		state.coins += refund
		return true, string.format("%s을(를) 팔았다 (+%d)", def.name, refund)
	end

	-- 선단 배를 기함으로 올린다 (기함과 자리를 맞바꾼다. 대포·보강은 기함 자리에 남는다)
	function handlers.SetFlagship(state, p)
		local idx = math.floor(tonumber(p.index) or 0)
		local f = state.fleet[idx]
		if not f then
			return false, "그런 배가 없어요"
		end
		local newDef = D.Ships.Ships[f.id]
		local oldDef = S.State.shipDef(state)
		local oldId, oldHull = state.ship.id, state.ship.hull
		state.fleet[idx] = { id = oldId, hull = oldHull }
		state.ship.id = f.id
		local rdef = S.State.shipDef(state)
		state.ship.hull = math.min(f.hull, rdef.hull)
		state.ship.crew = math.min(state.ship.crew, newDef.crew)
		if S.State.cargoUsed(state) > S.State.cargoCapacity(state) then
			state.fleet[idx] = f
			state.ship.id = oldId
			state.ship.hull = oldHull
			state.ship.crew = math.min(state.ship.crew, oldDef.crew)
			return false, "화물을 먼저 비워 주세요"
		end
		return true, string.format("%s이(가) 새 기함이 되었다", newDef.name)
	end

	-- 항해 후 유지비: 코인이 모자라면 호위함·선단 배가 떠난다
	local function payUpkeep(state, days, msgs)
		if state.escorts <= 0 and #state.fleet == 0 then
			return
		end
		local cost = (state.escorts * 15 + #state.fleet * FLEET_UPKEEP) * days
		if state.escorts <= 0 and #state.fleet > 0 and state.coins < cost then
			state.coins = 0
			local gone = table.remove(state.fleet)
			table.insert(msgs, string.format("유지비를 못 내서 %s 한 척이 떠났다", D.Ships.Ships[gone.id].name))
			return
		end
		if state.coins >= cost then
			state.coins -= cost
			table.insert(msgs, string.format("선단 유지비 -%d", cost))
		else
			state.coins = 0
			state.escorts -= 1
			table.insert(msgs, "유지비를 못 내서 호위함 한 척이 떠났다")
		end
	end

	-- 항구에서 한 번에 채우기 (조선소가 없어도 항구면 어디서나)
	function handlers.Resupply(state, p)
		local msgs = {}
		local what = p and p.what
		if what ~= "crew" and what ~= "supplies" and what ~= "both" then
			return false, "잘못된 요청"
		end
		local def = S.State.shipDef(state)
		if what ~= "supplies" then
			local n = math.min(def.crew - state.ship.crew, math.floor(state.coins / cost(state, HIRE_COST)))
			if n > 0 then
				state.coins -= n * cost(state, HIRE_COST)
				state.ship.crew += n
				table.insert(msgs, string.format("선원 %d명 충원 (-%d)", n, n * cost(state, HIRE_COST)))
			end
		end
		if what ~= "crew" then
			local n = math.min(S.State.maxSupplies() - state.ship.supplies, math.floor(state.coins / cost(state, SUPPLY_COST)))
			if n > 0 then
				state.coins -= n * cost(state, SUPPLY_COST)
				state.ship.supplies += n
				table.insert(msgs, string.format("보급품 %d개 보급 (-%d)", n, n * cost(state, SUPPLY_COST)))
			end
		end
		if #msgs == 0 then
			return false, "이미 가득 찼거나 코인이 부족해요"
		end
		return true, table.concat(msgs, "\n")
	end

	function handlers.SetAuto(state, p)
		if p.key ~= "supplies" and p.key ~= "crew" then
			return false, "잘못된 요청"
		end
		state.auto[p.key] = p.value == true
		return true, string.format("자동 %s: %s", if p.key == "supplies" then "보급" else "선원 충원", if p.value == true then "켜짐 (항구에 도착할 때마다 채워요)" else "꺼짐")
	end

	-- 입항할 때 자동으로 채운다 (켜 둔 항목만, 코인이 되는 만큼)
	local function autoTopUp(state, msgs)
		if state.auto.crew then
			local def = S.State.shipDef(state)
			local n = math.min(def.crew - state.ship.crew, math.floor(state.coins / cost(state, HIRE_COST)))
			if n > 0 then
				state.coins -= n * cost(state, HIRE_COST)
				state.ship.crew += n
				table.insert(msgs, string.format("[자동] 선원 %d명 충원 (-%d)", n, n * cost(state, HIRE_COST)))
			end
		end
		if state.auto.supplies then
			local n = math.min(S.State.maxSupplies() - state.ship.supplies, math.floor(state.coins / cost(state, SUPPLY_COST)))
			if n > 0 then
				state.coins -= n * cost(state, SUPPLY_COST)
				state.ship.supplies += n
				table.insert(msgs, string.format("[자동] 보급품 %d개 보급 (-%d)", n, n * cost(state, SUPPLY_COST)))
			end
		end
	end

	return {
		autoTopUp = autoTopUp,
		payUpkeep = payUpkeep,
		handlers = handlers,
		cannonMult = cannonMult,
		cannonBlock = cannonBlock,
		plateBlock = plateBlock,
		REPAIR_COST = REPAIR_COST,
		HIRE_COST = HIRE_COST,
		SUPPLY_COST = SUPPLY_COST,
	}
end
