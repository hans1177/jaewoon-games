--!nonstrict
-- 항구 시설: 은행(예금·대출), 상인 길드(운송 계약), 왕궁(알현·작위).

return function(D, S)
	local F = D.Facilities
	local handlers = {}

	local function hereLevel(state)
		return S.Harbor.level(state)
	end

	local function hasHere(state, kind)
		return F.has(kind, state.portId, hereLevel(state))
	end

	-- 은행 --------------------------------------------------------------

	-- 30일마다 복리로 이자를 정산한다. 여러 번 호출해도 같은 기간은 한 번만 정산된다.
	local function accrue(state)
		local b = state.bank
		if b.deposit <= 0 and b.loan <= 0 then
			b.lastDay = state.day
			return
		end
		local periods = math.floor((state.day - b.lastDay) / F.BANK.PERIOD_DAYS)
		if periods > 0 then
			local bk = F.bankAt(if hasHere(state, "bank") then hereLevel(state) else 1)
			b.deposit = math.floor(b.deposit * (1 + bk.depositRate) ^ periods)
			b.loan = math.ceil(b.loan * (1 + bk.loanRate) ^ periods)
			b.lastDay += periods * F.BANK.PERIOD_DAYS
		end
	end

	local function loanLimit(state)
		local mult = F.bankAt(if hasHere(state, "bank") then hereLevel(state) else 1).loanMult
		return math.floor((F.BANK.LOAN_BASE + state.fame * F.BANK.LOAN_PER_FAME) * mult)
	end

	local function parse(p)
		local n = p.amount
		if type(n) ~= "number" or n ~= n or n < 1 then
			return nil
		end
		return math.floor(math.min(n, 1e9))
	end

	local function bankGuard(state, p): (number?, string?)
		if not hasHere(state, "bank") then
			return nil, "이 항구에는 은행이 없어요"
		end
		local n = parse(p)
		if not n then
			return nil, "잘못된 금액이에요"
		end
		accrue(state)
		return n
	end

	function handlers.Deposit(state, p)
		local n: any, err = bankGuard(state, p)
		if not n then
			return false, err
		end
		n = math.min(n, state.coins)
		if n <= 0 then
			return false, "맡길 코인이 없어요"
		end
		state.coins -= n
		state.bank.deposit += n
		return true, string.format("%d코인을 예금했다 (잔액 %d)", n, state.bank.deposit)
	end

	function handlers.Withdraw(state, p)
		local n: any, err = bankGuard(state, p)
		if not n then
			return false, err
		end
		n = math.min(n, state.bank.deposit)
		if n <= 0 then
			return false, "찾을 예금이 없어요"
		end
		state.bank.deposit -= n
		state.coins += n
		return true, string.format("%d코인을 찾았다 (잔액 %d)", n, state.bank.deposit)
	end

	function handlers.Borrow(state, p)
		local n: any, err = bankGuard(state, p)
		if not n then
			return false, err
		end
		local room = loanLimit(state) - state.bank.loan
		n = math.min(n, room)
		if n <= 0 then
			return false, "대출 한도를 넘었어요 (명성이 높을수록 한도가 늘어요)"
		end
		state.bank.loan += n
		state.coins += n
		return true, string.format("%d코인을 빌렸다 (빚 %d, 30일마다 이자 %d%%)", n, state.bank.loan, F.BANK.LOAN_RATE * 100)
	end

	function handlers.Repay(state, p)
		local n: any, err = bankGuard(state, p)
		if not n then
			return false, err
		end
		n = math.min(n, state.bank.loan, state.coins)
		if n <= 0 then
			return false, if state.bank.loan <= 0 then "갚을 빚이 없어요" else "코인이 부족해요"
		end
		state.bank.loan -= n
		state.coins -= n
		return true, string.format("%d코인을 갚았다 (남은 빚 %d)", n, state.bank.loan)
	end

	-- 길드 --------------------------------------------------------------

	local function hash(str, n)
		local h = 7
		for i = 1, #str do
			h = (h * 31 + string.byte(str, i)) % 2147483647
		end
		return (h * (n + 3) + n * 7919) % 2147483647
	end

	-- 이 항구의 오늘 계약 제안 (날짜 10일 단위로 바뀌며, 같은 날엔 항상 같다)
	local function offers(state)
		local port = D.Ports.Ports[state.portId]
		local list = {}
		if not hasHere(state, "guild") then
			return list
		end
		local slot = math.floor(state.day / F.GUILD.REFRESH_DAYS)
		local targets = {}
		for portId, p in D.Ports.Ports do
			if portId ~= port.id then
				table.insert(targets, portId)
			end
		end
		table.sort(targets)
		for i = 1, F.GUILD.OFFERS do
			local h = hash(port.id .. slot, i)
			local goodId = port.produces[h % #port.produces + 1]
			-- 그 상품을 필요로 하는 항구를 우선 고른다
			local wanting = {}
			for _, t in targets do
				if table.find(D.Ports.Ports[t].demands, goodId) then
					table.insert(wanting, t)
				end
			end
			local pool = if #wanting > 0 then wanting else targets
			local toId = pool[(h // 7) % #pool + 1]
			local amount = 5 + (h // 13) % 11
			local good = D.Ports.Goods[goodId]
			table.insert(list, {
				index = i,
				goodId = goodId,
				goodName = good.name,
				amount = amount,
				toPortId = toId,
				toPortName = D.Ports.Ports[toId].name,
				reward = math.floor(amount * good.basePrice * F.GUILD.PREMIUM),
				fame = math.ceil(amount / 5),
			})
		end
		return list
	end

	local function contractExpired(state)
		local c = state.contract
		if c and state.day > c.deadline then
			state.contract = nil
			return true
		end
		return false
	end

	function handlers.AcceptContract(state, p)
		if not hasHere(state, "guild") then
			return false, "이 항구에는 길드가 없어요"
		end
		contractExpired(state)
		if state.contract then
			return false, "이미 진행 중인 계약이 있어요"
		end
		local o: any = type(p.index) == "number" and offers(state)[math.floor(p.index)]
		if not o then
			return false, "잘못된 요청"
		end
		state.contract = {
			goodId = o.goodId, amount = o.amount, toPortId = o.toPortId, reward = o.reward, fame = o.fame,
			deadline = state.day + F.GUILD.DEADLINE_DAYS,
		}
		return true, string.format("계약 체결: %s %d개를 %s까지 (기한 %d일)", o.goodName, o.amount, o.toPortName, F.GUILD.DEADLINE_DAYS)
	end

	function handlers.TurnInContract(state)
		if contractExpired(state) then
			return false, "계약 기한이 지났어요"
		end
		local c = state.contract
		if not c then
			return false, "진행 중인 계약이 없어요"
		end
		if state.portId ~= c.toPortId then
			return false, string.format("%s에서 납품해야 해요", D.Ports.Ports[c.toPortId].name)
		end
		if (state.cargo[c.goodId] or 0) < c.amount then
			return false, "상품이 부족해요"
		end
		S.State.removeCargo(state, c.goodId, c.amount)
		state.coins += c.reward
		state.fame += c.fame
		state.contract = nil
		local msgs = { string.format("납품 완료! +%d코인, 명성 +%d", c.reward, c.fame) }
		S.State.gainXp(state, "trade", math.floor(c.reward / 20), msgs)
		S.Perk.gainSpec(state, "trade", math.floor(c.reward / 25), msgs)
		return true, table.concat(msgs, "\n")
	end

	function handlers.AbandonContract(state)
		if not state.contract then
			return false, "진행 중인 계약이 없어요"
		end
		state.contract = nil
		state.fame = math.max(0, state.fame - 2)
		return true, "계약을 포기했다 (명성 -2)"
	end

	-- 항만청 ------------------------------------------------------------

	local function insurancePrice(state)
		return math.max(100, math.floor(D.Ships.Ships[state.ship.id].price * F.INSURANCE_RATE))
	end

	function handlers.BuyLicense(state)
		if not hasHere(state, "harbormaster") then
			return false, "이 항구에는 항만청이 없어요"
		end
		local lic = D.Ships.Licenses[state.license + 1]
		if not lic then
			return false, "이미 최고 면허예요"
		end
		if state.fame < lic.fame then
			return false, string.format("명성 %d이 필요해요 (지금 %d)", lic.fame, state.fame)
		end
		if state.coins < lic.fee then
			return false, string.format("수수료 %d코인이 필요해요", lic.fee)
		end
		state.coins -= lic.fee
		state.license += 1
		return true, string.format("'%s'를 받았다 (-%d). 등급 %d 배를 살 수 있다", lic.name, lic.fee, state.license + 1)
	end

	function handlers.BuyInsurance(state)
		if not hasHere(state, "harbormaster") then
			return false, "이 항구에는 항만청이 없어요"
		end
		if state.insured then
			return false, "이미 보험에 들었어요"
		end
		local price = insurancePrice(state)
		if state.coins < price then
			return false, string.format("보험료 %d코인이 필요해요", price)
		end
		state.coins -= price
		state.insured = true
		return true, string.format("해상 보험에 가입했다 (-%d). 패배해도 이번 한 번은 화물과 코인을 지킨다", price)
	end

	-- 왕궁 --------------------------------------------------------------

	local function titleBonus(state)
		return state.title * F.TITLE_SELL_BONUS
	end

	function handlers.Audience(state)
		if not hasHere(state, "palace") then
			return false, "이 항구에는 왕궁이 없어요"
		end
		local nextTitle = F.TITLES[state.title + 1]
		if not nextTitle then
			return false, "이미 최고 작위예요"
		end
		if state.fame < nextTitle.fame then
			return false, string.format("명성 %d이 필요해요 (지금 %d)", nextTitle.fame, state.fame)
		end
		state.title += 1
		state.coins += nextTitle.coins
		return true, string.format("%s에서 알현했다. '%s' 작위를 받았다! (+%d코인, 판매 비율 +%.1f%%)", F.palaceName(state.portId), nextTitle.name, nextTitle.coins, F.TITLE_SELL_BONUS * 100)
	end

	return {
		handlers = handlers,
		accrue = accrue,
		loanLimit = loanLimit,
		offers = offers,
		contractExpired = contractExpired,
		titleBonus = titleBonus,
		insurancePrice = insurancePrice,
	}
end
