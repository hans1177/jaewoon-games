--!nonstrict
-- 교역: 사고팔기. 평균 매입가 대비 이익이 교역 경험치가 된다.

return function(D, S)
	local T = D.TradeMath
	local handlers = {}
	local MAX_AMOUNT = 20

	-- 한 번 주문 상한: 교역 경험이 오를수록 커진다 (시뮬이 없으면 20)
	local function orderCap(state)
		return if S.Econ and S.Econ.orderCap then S.Econ.orderCap(state) else MAX_AMOUNT
	end

	local function parseAmount(value, state)
		if type(value) ~= "number" or value ~= value then
			return nil
		end
		local n = math.floor(value)
		if n < 1 or n > orderCap(state) then
			return nil
		end
		return n
	end

	local function limits(state, goodId)
		return S.Econ and S.Econ.limits and S.Econ.limits(state, state.portId, goodId)
	end

	-- 국가 우호도: 그 나라 항구에서 거래할수록 오른다. 우호도 100이면 관세 우대로 되파는 비율 +3%.
	local function repBonus(state)
		local port = D.Ports.Ports[state.portId]
		return math.min(0.03, (state.rep[port.country] or 0) / 100 * 0.03)
	end

	-- 관세: 다른 나라 항구에서 팔 때 붙는다. 우호도가 오를수록 줄어 100이면 0%.
	local function tariffRate(state)
		local port = D.Ports.Ports[state.portId]
		if port.country == state.nationId then
			return 0
		end
		-- [상선 교역 특화] 매매가격·재고·판매율 상한은 유지하고 외국 항구 관세만 최대 ±8% 상대 보정.
		local base = math.max(0, 0.05 - (state.rep[port.country] or 0) / 100 * 0.05)
		local trait = S.State.shipDef(state).trait or {}
		local rate = math.max(0, base * (1 - (trait.tariff or 0)))
		-- [국가 시뮬 연결] 항구 주인의 입장(동맹·중립·적대)과 식민지 독점에 따라 배율을 곱한다. 최대 12%.
		local policy = S.Econ and S.Econ.tariffPolicy and S.Econ.tariffPolicy(state, state.portId)
		if policy then rate = math.min(0.12, rate * policy.mult) end
		return rate
	end

	-- 금수: 본국과 전쟁 중이고 관계가 크게 나쁜 나라의 항구는 정식 거래가 막힌다 (암시장은 가능).
	local function embargoed(state)
		local policy = S.Econ and S.Econ.tariffPolicy and S.Econ.tariffPolicy(state, state.portId)
		return policy ~= nil and policy.closed == true
	end

	local function sellRateFor(state)
		local nation = D.Ports.Nations[state.nationId]
		return T.sellRate(D.Careers.sellBonus(state.careers.trade.level) + nation.sellBonus + S.Perk.sellBonus(state) + S.Harbor.sellBonus(state) + S.Order.sellBonus(state) + S.Facility.titleBonus(state) + repBonus(state) + S.Build.sellBonus(state))
	end

	-- 시세 수첩: 직접 거래한 물건은 그 항구의 팔값을 적어 둔다 (동료 없이도 나중에 비교할 수 있다)
	local function noteBook(state, ctx, goodId)
		local m = ctx.market:get(state.portId, goodId)
		local e = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		state.priceBook = state.priceBook or {}
		state.priceBook[goodId] = state.priceBook[goodId] or {}
		state.priceBook[goodId][state.portId] = { sell = T.sellPrice(state.portId, goodId, m, sellRateFor(state), e), day = state.day }
	end

	-- [특산품 단계 잠금 · 2026-11-28 오너 지시] 처음부터 특산품을 마음대로 살 수 없다.
	-- [오너 결정 2026-11-28: 어렵게, 이야기를 진행할수록 열리게 · 기존 거래 기록 예외 없음(초기화)]
	-- 일반품: 언제나 · 특산품: 우호도 25 이상 / 항구 투자 2단계 / 길드 허가증 중 하나 (시작 항구만 처음부터)
	-- 명품(그 항구 특산 중 가장 비싼 것, 특산 2개 이상일 때): 길드 허가증 + (우호도 50 또는 투자 3단계)
	-- 길드 허가증 의뢰는 시작 국가 서막을 마친 뒤 열린다(이야기 진행에 묶임).
	local SPECIAL_REP, PREMIUM_REP, PREMIUM_LEVEL, SPECIAL_LEVEL = 25, 50, 3, 2
	local function premiumOf(port)
		if type(port.produces) ~= "table" or #port.produces < 2 then return nil end
		local best, price = nil, -1
		for _, g in port.produces do
			local def = D.Ports.Goods[g]
			if def and (def.basePrice or 0) > price then best, price = g, def.basePrice or 0 end
		end
		return best
	end
	local function lockOf(state, portId, goodId)
		local port = D.Ports.Ports[portId]
		if not port or type(port.produces) ~= "table" or not table.find(port.produces, goodId) then return nil end
		local rep = state.rep[port.country] or 0
		local level = S.Harbor.level(state, portId)
		local permit = state.stats and state.stats.permits and state.stats.permits[portId] == true
		local nation = D.Ports.Nations[state.nationId]
		local home = nation and nation.startPort == portId
		local permitQuest = D.Quests.ById["permit_" .. portId]
		local questName = permitQuest and permitQuest.name or nil
		if goodId == premiumOf(port) then
			if permit and (rep >= PREMIUM_REP or level >= PREMIUM_LEVEL) then return nil end
			return { tier = "premium", tierName = "명품", rep = rep, needRep = PREMIUM_REP, level = level, needLevel = PREMIUM_LEVEL, quest = questName,
				text = string.format("명품 · 길드 허가증%s + (우호도 %d/%d 또는 투자 %d/%d단계)", if permit then "✔" else "✘", rep, PREMIUM_REP, level, PREMIUM_LEVEL) }
		end
		if home or permit or rep >= SPECIAL_REP or level >= SPECIAL_LEVEL then return nil end
		return { tier = "special", tierName = "특산품", rep = rep, needRep = SPECIAL_REP, level = level, needLevel = SPECIAL_LEVEL, quest = questName,
			text = string.format("특산품 · 우호도 %d/%d 또는 투자 %d단계 또는 길드 허가증", rep, SPECIAL_REP, SPECIAL_LEVEL) }
	end

	-- [판매 견적] 일반 판매와 물물교환이 동일한 시세·관세·상회/희귀 보너스를 사용한다.
	local function saleQuote(state, goodId, amount, ctx)
		local rate = sellRateFor(state)
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		local revenue = 0
		for _ = 1, amount do
			revenue += T.sellPrice(state.portId, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev)
			mult = T.nextStockMult(mult, 1, false)
		end
		local TF = D.TradeFun
		local tariff = math.floor(revenue * tariffRate(state) * (if TF then TF.tariffMult(state) else 1))
		revenue -= tariff
		-- [교역 재미] 신상품·축제·라이벌·상회 등급·희귀 화물 보너스
		local fun = if TF then TF.sellBonus(state, D.Ports, D.Regions, state.portId, goodId, amount, revenue) else nil
		if fun then revenue = math.max(0, revenue + fun.bonus) end
		return { revenue = revenue, mult = mult, tariff = tariff, fun = fun, lim = limits(state, goodId) }
	end

	-- [판매 확정] 양쪽 조건을 먼저 확인한 물물교환에서도 기존 판매 정산만 사용한다.
	local function settleSale(state, goodId, amount, quote, ctx)
		local revenue, mult, tariff, fun, lim = quote.revenue, quote.mult, quote.tariff, quote.fun, quote.lim
		local TF = D.TradeFun
		local profit = revenue - (state.basis[goodId] or 0) * amount
		state.coins += revenue
		S.State.removeCargo(state, goodId, amount)
		ctx.market:set(state.portId, goodId, mult)
		if lim then S.Econ.give(state, state.portId, goodId, amount) end

		local msgs = { string.format("%s %d개 판매 (+%d)%s", D.Ports.Goods[goodId].name, amount, revenue, if tariff > 0 then string.format(" · 관세 -%d", tariff) else "") }
		if fun then
			for _, line in fun.lines do table.insert(msgs, line) end
			local up = TF.commitSell(state, fun, profit, goodId, amount)
			if up then table.insert(msgs, up) end
		end
		do
			local country = D.Ports.Ports[state.portId].country
			local gain = math.min(3, math.floor(revenue / 150))
			if gain > 0 then
				local before = state.rep[country] or 0
				state.rep[country] = math.min(100, before + gain)
				if math.floor(state.rep[country] / 25) > math.floor(before / 25) then
					table.insert(msgs, "이 나라와의 우호도가 올랐다 (관세 우대 확대)")
				end
			end
		end
		state.harborTrade = state.harborTrade or {}
		state.harborTrade[state.portId] = (state.harborTrade[state.portId] or 0) + (tonumber(amount) or 0)
		noteBook(state, ctx, goodId)
		if profit > 0 then
			S.State.gainXp(state, "trade", math.floor(profit / 8) + 1, msgs)
			S.Perk.gainSpec(state, "trade", math.floor(profit / 10) + 1, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	function handlers.Buy(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		if embargoed(state) then
			return false, "전쟁 중인 나라의 항구라 정식 거래가 막혔어요 (암시장은 가능해요)"
		end
		local lock = lockOf(state, state.portId, goodId)
		if lock then
			return false, string.format("🔒 %s 아직 못 사요 — %s%s", D.Ports.Goods[goodId].name, lock.text,
				if lock.quest then " · 주점 의뢰 「" .. lock.quest .. "」" else "")
		end
		local lim = limits(state, goodId)
		if lim and amount > lim.supply then
			return false, if lim.supply <= 0 then "이 항구에 팔 물건이 없어요. 생산될 때까지 기다려 보세요" else string.format("이 항구 재고는 %d개뿐이에요", lim.supply)
		end
		-- [실물 교환] 협상으로 발급된 서버 제안만 허용한다. 판매·구매 양쪽을 먼저 검사한다.
		local exchange, exchangeQuote = nil, nil
		if p.haggleConfirm == true then
			local h = state.haggle
			if not h or h.portId ~= state.portId or not h.deal or h.deal.goodId ~= goodId or not h.deal.mode then
				return false, "이미 처리됐거나 계약을 찾을 수 없어요"
			end
		end
		if p.exchange == true then
			local h = state.haggle
			local deal = h and h.portId == state.portId and h.deal
			exchange = deal and deal.goodId == goodId and deal.exchange
			if not exchange or exchange.goodId == goodId or not D.Ports.Goods[exchange.goodId]
				or (state.cargo[exchange.goodId] or 0) < exchange.amount then return false, "교환 화물이 없거나 계약이 끝났어요" end
			local sellLimit = limits(state, exchange.goodId)
			if sellLimit and exchange.amount > sellLimit.absorb then return false, "교환 화물의 매입 여유가 부족해요" end
			exchangeQuote = saleQuote(state, exchange.goodId, exchange.amount, ctx)
		end
		local available = state.coins + (if exchangeQuote then exchangeQuote.revenue else 0)
		if amount > S.State.cargoCapacity(state) - S.State.cargoUsed(state) + (if exchange then exchange.amount else 0) then
			return false, "화물칸이 부족해요"
		end
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		local total = 0
		for _ = 1, amount do
			total += T.getPrice(state.portId, goodId, mult, ev * S.Knowledge.supplyMult(state, state.portId, goodId))
			mult = T.nextStockMult(mult, 1, true)
		end
		-- [자동 흥정] 기존 동료 장사 감각·상인 전문을 갖추면 구매 순간 자동 시도.
		-- 항구/상품별 1회, 원래 성공확률과 할인율을 그대로 유지한다.
		local h = state.haggle
		local intel = S.Harbor.intel(state)
		local skilled = intel >= 1 or state.specialty == "merchant" or state.subSpecialty == "merchant"
		if total > available and (not skilled or math.floor(total * 0.92) > available)
			and not (h and h.portId == state.portId and h.deal and h.deal.goodId == goodId) then
			return false, "코인이 부족해요"
		end
		local effect = ""
		local appliedDeal = false
		local autoAttempt = false
		if h and h.portId == state.portId and h.deal and h.deal.goodId == goodId then
			total = math.max(1, math.floor(total * h.deal.mult))
			appliedDeal = true
		elseif skilled and not (h and h.portId == state.portId and h.tried and h.tried[goodId]) then
			-- [구매 확정 전] 잔액 부족으로 거래가 취소되면 흥정 기회를 소비하지 않는다.
			autoAttempt = true
			local port = D.Ports.Ports[state.portId]
				local chance = math.clamp(0.35 + 0.1 * intel + (state.rep[port.country] or 0) / 100 * 0.2, 0.2, 0.9)
				if ctx.rng() < chance then
					local discount = 0.04 + ctx.rng() * 0.04
					local before = total
					total = math.max(1, math.floor(total * (1 - discount)))
					effect = string.format(" · 자동 흥정 성공! %d코인 절약", before - total)
			else
				effect = " · 자동 흥정 실패 (정가)"
			end
		end
		if total > available then
			return false, "코인이 부족해요" .. effect
		end
		-- 모든 실패 조건을 지난 뒤에만 기존 판매와 구매를 같은 서버 요청에서 확정한다.
		if exchangeQuote then
			local _, receipt = settleSale(state, exchange.goodId, exchange.amount, exchangeQuote, ctx)
			effect = effect .. "\n물물교환 · " .. receipt
		end
		if autoAttempt then
			if not h or h.portId ~= state.portId then
				h = { portId = state.portId, tried = {} }
				state.haggle = h
			end
			h.tried = h.tried or {}
			h.tried[goodId] = true
		end
		if appliedDeal then h.deal = nil end
		state.coins -= total
		local owned = state.cargo[goodId] or 0
		local basis = state.basis[goodId] or 0
		state.basis[goodId] = (basis * owned + total) / (owned + amount)
		state.cargo[goodId] = owned + amount
		ctx.market:set(state.portId, goodId, mult)
		if lim then S.Econ.take(state, state.portId, goodId, amount) end
		state.harborTrade = state.harborTrade or {}
		state.harborTrade[state.portId] = (state.harborTrade[state.portId] or 0) + amount
		noteBook(state, ctx, goodId)
		return true, string.format("%s %d개 구매 (-%d)%s", D.Ports.Goods[goodId].name, amount, total, effect)
	end

	-- [흥정 미니게임 · 2026-11-28 오너 지시] 강제 아님. 물건마다 항구에서 한 번(자동 흥정과 같은 기회).
	-- 저울 멈추기 · 상인 표정 읽기 · 진짜 동전 고르기 · 산지 퀴즈 중 하나. 판정은 서버가 한다.
	-- 결과 할인 4~12%(완벽 12%), 실패하면 정가(손해 없음). 동료 장사 감각·우호도가 높으면 쉬워진다.
	local HAGGLE_GAMES = { "scale", "face", "coin", "quiz", "negotiation", "auction", "appraisal", "weigh", "secret", "bulk", "contract", "inspection", "rush", "forecast", "barter", "antique" }
	-- [교역 협상] 실제 거래는 Buy 한 곳에서만 수행한다. 아래는 현재 상품/시세 기반의 가상 제안이며 정답/점수는 서버에만 둔다.
	local function tradeRounds(state, goodId, game, ctx)
		local port = D.Ports.Ports[state.portId]
		local good = D.Ports.Goods[goodId]
		local rng = ctx.rng
		local mult = ctx.market:get(state.portId, goodId)
		local ev = ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId)
			* (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1)
		local price = T.getPrice(state.portId, goodId, mult, ev * S.Knowledge.supplyMult(state, state.portId, goodId))
		local rounds, title = {}, ""
		local auction = game == "auction" or game == "antique"
		local function add(question, correct, wrong1, wrong2)
			local options = { correct, wrong1, wrong2 }
			local answer = math.floor(rng() * 3) + 1
			options[1], options[answer] = options[answer], options[1]
			table.insert(rounds, { question = question, options = options, answer = answer })
		end
		local function money(n) return tostring(n) .. "코인" end
		local role = if table.find(port.produces, goodId) then "산지" elseif table.find(port.demands, goodId) then "수요 항구" else "일반 항구"
		local persona = ({ "욕심 많은 상인", "신중한 상인", "자존심 강한 상인", "호의적인 상인", "교활한 상인" })[math.floor(rng() * 5) + 1]
		local n = 2 + math.floor(rng() * 3)
		local fee = math.max(2, math.floor(price * 0.1))
		if game == "negotiation" then
			title = "심리 흥정"
			local preferred = ({ ["욕심 많은 상인"] = "수량을 늘리는 조건 제안", ["신중한 상인"] = "견본과 거래 기록 제시", ["자존심 강한 상인"] = "상품의 장점부터 인정", ["호의적인 상인"] = "장기 거래 약속 제안", ["교활한 상인"] = "수량과 총액을 서면 확인" })[persona]
			add(persona .. "이 거래 조건을 살핀다. 어떤 접근이 적합할까?", preferred, "근거 없이 큰 할인 요구", "상인을 모욕하며 재촉")
			add("상인이 망설이며 거래 조건을 다시 확인한다.", "조건을 확인하고 절충안 제시", "일방적으로 가격을 확정", "확인하지 않고 서명")
		elseif game == "auction" or game == "antique" then
			title = if game == "auction" then "경쟁 상인 경매" else "골동품 경매 감정"
			local rivalName = "경쟁 상인"
			local rival = D.TradeFun and D.TradeFun.rival(D.Ports, D.Regions, D.Regions.of(port).id, state.day or 0)
			if rival then rivalName = rival.name end
			local opening = 13 + math.floor(rng() * 3)
			for round = 1, 3 do
				local rivalPct = math.max(5, opening - (round - 1) * (1 + math.floor(rng() * 3)))
				local bids = { 12, 8, 4 }
				local options = {}
				local best = nil
				for i, pct in bids do
					options[i] = string.format("입찰 %s · %d%% 할인", money(math.max(1, math.floor(price * (1 - pct / 100)))), pct)
					if not best and pct < rivalPct then best = i end
				end
				options[4] = "입찰 포기"
				table.insert(rounds, { question = string.format("%s의 입찰 · 기준가 %s / 경쟁가 %s", rivalName, money(price), money(math.max(1, math.floor(price * (1 - rivalPct / 100))))),
					options = options, answer = best or 3, bids = bids, rivalPct = rivalPct })
			end
		elseif game == "appraisal" or game == "inspection" then
			title = if game == "appraisal" then "상품 감정" else "견본 검사"
			local kind = good.resourceKind
			local defect = if kind == "textile" then "올 풀림과 얼룩" elseif kind == "spice" or kind == "crops" then "습기와 곰팡이" elseif kind == "gem" or kind == "crafted" then "균열과 파손" else "오염과 손상"
			add(good.name .. "의 가상 검수 기록: " .. defect .. "이 발견됐다.", "불량품을 분리해 재감정", "정상품으로 그대로 인정", "무게만 보고 품질 확정")
			add("봉인된 견본의 산지 기록과 수량이 장부와 다르다.", "실물과 장부를 대조해 수정 요청", "가격만 보고 승인", "기록을 무시하고 인수")
		elseif game == "weigh" then
			title = "저울 속임수"
			local tare = 1 + math.floor(rng() * 3)
			add(string.format("총 무게 %d근, 빈 포대 %d근. 실제 상품 무게는?", n + tare, tare), tostring(n) .. "근", tostring(n + tare) .. "근", tostring(n + tare + 1) .. "근")
			add("기준 추 5근을 올렸는데 저울이 6근을 표시한다.", "영점과 기준 추를 재검사", "표시값을 그대로 인정", "포장 무게를 더해서 결제")
		elseif game == "secret" then
			title = "비밀 거래 협상"
			add("상인이 희귀 화물의 거래 자격을 확인한다.", "길드 허가와 출처 기록 제시", "허가 없이 넘겨 달라고 요구", "신원을 숨기고 강요")
			add("별도 화물 제안이 들어왔다. 먼저 확인할 것은?", "공식 허가·재고·가격", "상인의 소문만 믿기", "계약 없이 선금 지급")
		elseif game == "bulk" then
			title = "대량 구매 협상"
			local total, stock = 0, mult
			for _ = 1, n do
				total += T.getPrice(state.portId, goodId, stock, ev * S.Knowledge.supplyMult(state, state.portId, goodId))
				stock = T.nextStockMult(stock, 1, true)
			end
			add(string.format("가상 %d개 견적 %d코인. 동일 수량, 운송 조건 동일. 가장 저렴한 제안은?", n, total), money(math.max(1, total - fee)), money(total), money(total + fee))
			add("대량 구매 전 반드시 확인할 항목은?", "실제 재고·화물칸·잔액", "할인율만 확인", "항구 이름만 확인")
		elseif game == "contract" then
			title = "무역 계약"
			add(string.format("동일 수량 계약: 물품 %d코인. 추가 비용까지 가장 낮은 계약은?", price),
				money(price) .. " · 추가 비용 없음", money(price) .. " · 수수료 " .. money(fee), money(price + fee) .. " · 추가 비용 없음")
			add("납기와 수량이 다른 두 계약이 제시됐다.", "실제 재고와 운송 가능 일정에 맞춰 계약", "납기를 확인하지 않고 계약", "빈 계약서에 먼저 서명")
		elseif game == "rush" then
			title = "경쟁 구매"
			add(string.format("가상 경쟁 구매 · 남은 재고 %d개. %d개가 필요하다.", n, n), tostring(n) .. "개 요청", tostring(n+1) .. "개 요청", tostring(n+2) .. "개 요청")
			add("경쟁 상인이 접근한다. 잔액과 선창이 충분하다면?", "검수한 수량의 견적을 확정", "다른 상인의 화물을 빼앗기", "가격을 확인하지 않고 모두 구매")
		elseif game == "forecast" then
			title = "시세 판단"
			add(good.name .. " · " .. port.name .. " 현재 분류: " .. role .. ". 현재 매입 기준가 " .. money(price) .. ".",
				role, if role == "산지" then "수요 항구" else "산지", if role == "일반 항구" then "수요 항구" else "일반 항구")
			add("다른 조건이 동일한 가상 시장에서 공급이 크게 감소하면?", "가격 상승 압력", "가격 하락 압력", "공급과 가격은 무관")
		elseif game == "barter" then
			title = "물물교환 협상"
			add(string.format("가상 교환 기준: 상품 1개 %d코인. 같은 품질의 %d개 가치는?", price, n),
				money(price * n), money(price * (n + 1)), money(price * (n - 1)))
			add("교환 제안을 확정하기 전에 확인해야 할 것은?", "보유 수량과 양쪽 교환 가치", "상대 물품의 이름만", "차액을 계산하지 않고 인수")
		end
		local support = nil
		for _, id in state.companions or {} do
			local companion = D.Specialties.CompanionById[id]
			local role = companion and companion.role or ""
			if string.find(role, "회계", 1, true) or string.find(role, "장부", 1, true) then support = companion.name .. " · 총액과 수수료를 확인해."
			elseif string.find(role, "감정", 1, true) then support = companion.name .. " · 견본과 기록을 대조해."
			elseif string.find(role, "통역", 1, true) then support = companion.name .. " · 계약 조건을 다시 확인해." end
			if support then break end
		end
		if not support and state.careers.trade.level >= 5 then support = "교역 숙련 · 실제 조건과 총액을 함께 확인해." end
		return { title = title, persona = persona, rounds = rounds, round = 1, correct = 0, support = support, auction = auction, deadline = if auction then os.time() + 12 else nil }
	end
	local function haggleState(state)
		local h = state.haggle
		if not h or h.portId ~= state.portId then
			h = { portId = state.portId, tried = {} }
			state.haggle = h
		end
		return h
	end
	local function quizFor(state, goodId, rng)
		local yes, no = {}, {}
		for id, port in D.Ports.Ports do
			if type(port.produces) == "table" then
				if table.find(port.produces, goodId) then table.insert(yes, id) else table.insert(no, id) end
			end
		end
		if #yes == 0 or #no < 3 then return nil end
		table.sort(yes); table.sort(no)
		local right = yes[math.floor(rng() * #yes) + 1]
		local options = { right }
		while #options < 4 do
			local pick = no[math.floor(rng() * #no) + 1]
			if not table.find(options, pick) then table.insert(options, pick) end
		end
		for i = #options, 2, -1 do
			local j = math.floor(rng() * i) + 1
			options[i], options[j] = options[j], options[i]
		end
		local names = {}
		for i, id in options do names[i] = D.Ports.Ports[id].name end
		return { question = string.format("%s은(는) 어느 항구의 특산품일까?", D.Ports.Goods[goodId].name), options = names, answer = table.find(options, right) }
	end

	function handlers.HaggleStart(state, p, ctx)
		local goodId = p.goodId
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] then
			return false, "잘못된 요청"
		end
		local h = haggleState(state)
		if h.tried[goodId] then
			return false, "이미 흥정해 봤어요. 다음 항구에서 다시 해 봐요"
		end
		if h.deal and h.deal.goodId == goodId then
			return false, "이미 흥정한 값이 있어요. 먼저 사세요"
		end
		local port = D.Ports.Ports[state.portId]
		local ease = math.clamp(S.Harbor.intel(state) * 0.12 + (state.rep[port.country] or 0) / 100 * 0.15, 0, 0.4)
		if h.pending and h.pending.goodId == goodId then return true, "기존 흥정을 이어가요" end
		local regional = if D.Regions.of(port).id == "europe" then { "auction", "antique" }
			elseif D.Regions.of(port).id == "indian" then { "barter", "appraisal" }
			elseif D.Regions.of(port).id == "far_east" then { "inspection", "contract" }
			else { "rush", "forecast" }
		local pool = table.clone(HAGGLE_GAMES)
		for _, mode in regional do table.insert(pool, mode) end
		local game = if type(p.game) == "string" and table.find(HAGGLE_GAMES, p.game) then p.game else pool[math.floor(ctx.rng() * #pool) + 1]
		local quiz = if game == "quiz" then quizFor(state, goodId, ctx.rng) else nil
		if game == "quiz" and not quiz then game = "scale" end
		local pending = { goodId = goodId, game = game, ease = ease }
		if game == "scale" then
			-- 바늘: 0~1 을 왕복(주기 period 초). 금색 구간 중심 center, 반폭 width.
			pending.period = 1.6 - ease
			pending.center = 0.3 + ctx.rng() * 0.4
			pending.width = 0.08 + ease * 0.12
		elseif game == "face" then
			-- 상인이 받아 줄 최대 할인(%). 표정 힌트: 제안이 한도보다 3% 이상 낮으면 웃음, 한도 안이면 망설임, 넘으면 찡그림.
			pending.limit = math.floor(5 + ctx.rng() * 7 + ease * 5)
			pending.faces = {}
			for pct = 4, 12 do
				pending.faces[pct] = if pct <= pending.limit - 3 then "smile" elseif pct <= pending.limit then "think" else "frown"
			end
		elseif game == "coin" then
			pending.count = if ease >= 0.2 then 3 else 4
			pending.real = math.floor(ctx.rng() * pending.count) + 1
			pending.fakeTell = ({ "edge", "color", "stamp" })[math.floor(ctx.rng() * 3) + 1]
		elseif game == "quiz" then
			pending.quiz = quiz
		else
			pending.trade = tradeRounds(state, goodId, game, ctx)
		end
		h.pending = pending
		return true, "흥정을 시작해요"
	end

	function handlers.HagglePlay(state, p, ctx)
		local h = state.haggle
		local pend = h and h.portId == state.portId and h.pending
		if not pend or pend.goodId ~= p.goodId then
			return false, "흥정을 먼저 시작해요"
		end
		if h.tried[pend.goodId] then h.pending = nil; return false, "이미 흥정한 품목이에요" end
		local pct = 0
		if pend.trade then
			local trade = pend.trade
			local current = trade.rounds[trade.round]
			if not current or p.round ~= trade.round or type(p.pick) ~= "number" or p.pick ~= math.floor(p.pick) or p.pick < 1 or p.pick > #current.options then return false, "현재 협상 차례를 확인해요" end
			if trade.auction then
				local bid = current.bids[p.pick]
				trade.bid = if os.time() < trade.deadline and bid and bid < current.rivalPct then bid else 0
				trade.feedback = if trade.bid > 0 then "현재 최고 입찰" else "경쟁 상인이 앞섰어요"
			else
				if p.pick == current.answer then trade.correct += 1 end
			end
			if trade.round < #trade.rounds then
				trade.round += 1
				if trade.auction then trade.deadline = os.time() + 12 end
				return true, "다음 협상 조건을 확인해요"
			end
			pct = if trade.auction then trade.bid or 0 elseif trade.correct == #trade.rounds then 12 elseif trade.correct > 0 then math.floor(4 + 4 * trade.correct / #trade.rounds) else 0
		end
		h.pending = nil
		h.tried[pend.goodId] = true
		if pend.game == "scale" then
			local t = tonumber(p.t) or -1
			if t >= 0 and t < 30 then
				local phase = (t / pend.period) % 2
				local pos = if phase < 1 then phase else 2 - phase
				local off = math.abs(pos - pend.center)
				if off <= pend.width * 0.25 then pct = 12
				elseif off <= pend.width * 0.6 then pct = 9
				elseif off <= pend.width then pct = 6 end
			end
		elseif pend.game == "face" then
			local offer = math.floor(tonumber(p.offer) or 0)
			if offer >= 4 and offer <= 12 and offer <= pend.limit then pct = offer end
		elseif pend.game == "coin" then
			if math.floor(tonumber(p.pick) or 0) == pend.real then pct = 8 + math.floor(pend.ease * 10) end
		elseif pend.game == "quiz" then
			if pend.quiz and math.floor(tonumber(p.pick) or 0) == pend.quiz.answer then pct = 10 end
		end
		pct = math.clamp(pct, 0, 12)
		local name = D.Ports.Goods[pend.goodId].name
		if pct > 0 then
			h.deal = { goodId = pend.goodId, mult = 1 - pct / 100, mode = pend.game }
			if pend.game == "barter" then
				-- 보유 화물의 실제 매입 여유가 있는 품목만 제안. 새 저장 키나 화물 생성 없음.
				local eligible = {}
				for id, amount in state.cargo do
					local lim = D.Ports.Goods[id] and limits(state, id)
					if id ~= pend.goodId and D.Ports.Goods[id] and amount >= 1 and (not lim or lim.absorb >= 1) then table.insert(eligible, id) end
				end
				table.sort(eligible)
				if #eligible > 0 then h.deal.exchange = { goodId = eligible[1], amount = 1 } end
			end
			return true, string.format("흥정 성공! %s 다음 구매가 %d%% 싸져요", name, pct)
		end
		return false, "상인이 고개를 젓네요. 정가대로 사요 (손해는 없어요)"
	end

	-- 흥정: 물건마다 항구에서 한 번만 시도할 수 있다. 성공하면 다음 구매가 4~8% 싸진다.
	-- 동료의 장사 감각(intel)과 그 나라 우호도가 높을수록 잘 통한다.
	function handlers.Haggle(state, p, ctx)
		local goodId = p.goodId
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] then
			return false, "잘못된 요청"
		end
		local h = state.haggle
		if not h or h.portId ~= state.portId then
			h = { portId = state.portId, tried = {} }
			state.haggle = h
		end
		if h.tried[goodId] then
			return false, "이미 흥정해 봤어요. 다음에 들러 보세요"
		end
		h.tried[goodId] = true
		local port = D.Ports.Ports[state.portId]
		local intel = S.Harbor.intel(state)
		local chance = math.clamp(0.35 + 0.1 * intel + (state.rep[port.country] or 0) / 100 * 0.2, 0.2, 0.9)
		if ctx.rng() < chance then
			local mult = 1 - (0.04 + ctx.rng() * 0.04)
			h.deal = { goodId = goodId, mult = mult }
			return true, string.format("흥정 성공! %s 다음 구매가 %d%% 싸져요", D.Ports.Goods[goodId].name, math.floor((1 - mult) * 100 + 0.5))
		end
		return false, "상인이 고개를 젓네요. 정가대로 사야 해요"
	end

	function handlers.Sell(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		local owned = state.cargo[goodId] or 0
		if owned < amount then
			return false, "가진 수량이 부족해요"
		end
		if embargoed(state) then
			return false, "전쟁 중인 나라의 항구라 정식 거래가 막혔어요 (암시장은 가능해요)"
		end
		local lim = limits(state, goodId)
		if lim and amount > lim.absorb then
			return false, if lim.absorb <= 0 then "이 항구는 이 물건이 넘쳐서 더 사지 않아요. 다른 항구에 팔아 보세요" else string.format("이 항구는 지금 %d개까지만 사줘요", lim.absorb)
		end
		return settleSale(state, goodId, amount, saleQuote(state, goodId, amount, ctx), ctx)
	end

	-- [교역 재미 7] 희귀 화물: 이 항구에 뜬 한정 화물을 통째로 산다. 지정 항구에 팔아야 이익.
	function handlers.BuyRareLot(state, p, _ctx)
		local TF = D.TradeFun
		if not TF then return false, "지금은 살 수 없어요" end
		local lot: any = TF.rareLot(D.Ports, D.Regions, state.portId, state.day or 0)
		if not lot then return false, "이 항구에는 지금 희귀 화물이 없어요" end
		if TF.get(state).lots[lot.key] then return false, "이미 산 화물이에요" end
		if p and p.haggleConfirm == true then
			local h = state.haggle
			if not h or h.portId ~= state.portId or not h.deal or h.deal.mode ~= "secret" or h.deal.goodId ~= p.contractGoodId
				or p.expectedGoodId ~= lot.goodId or p.expectedTotal ~= lot.unitPrice * lot.qty then return false, "희귀 화물 계약이 변경됐어요" end
			if embargoed(state) or lockOf(state, state.portId, lot.goodId) then return false, "거래 허가가 필요해요" end
		end
		if lot.qty > S.State.cargoCapacity(state) - S.State.cargoUsed(state) then return false, "화물칸이 부족해요" end
		local total: number = math.floor(tonumber(lot.unitPrice * lot.qty) or 0)
		if total > state.coins then return false, "코인이 부족해요" end
		state.coins -= total
		local owned = state.cargo[lot.goodId] or 0
		local basis = state.basis[lot.goodId] or 0
		state.basis[lot.goodId] = (basis * owned + total) / (owned + lot.qty)
		state.cargo[lot.goodId] = owned + lot.qty
		TF.commitRareBuy(state, lot)
		local names = {}
		for _, id in lot.targets do table.insert(names, D.Ports.Ports[id].name) end
		return true, string.format("희귀 %s %d개 구매 (-%d)\n%d일 안에 %s 중 한 곳에 팔면 %.1f배!", D.Ports.Goods[lot.goodId].name, lot.qty, total, TF.RARE_KEEP, table.concat(names, "·"), TF.RARE_SELL)
	end

	-- 암시장: 관세 없이 10% 더 받지만 들키면 압수·벌금. 우호도가 높을수록 덜 들킨다.
	function handlers.Smuggle(state, p, ctx)
		local goodId, amount = p.goodId, parseAmount(p.amount, state)
		if type(goodId) ~= "string" or not D.Ports.Goods[goodId] or not amount then
			return false, "잘못된 요청"
		end
		if (state.cargo[goodId] or 0) < amount then
			return false, "가진 수량이 부족해요"
		end
		local port = D.Ports.Ports[state.portId]
		local caught = 0.25 - (state.rep[port.country] or 0) * 0.002
		if ctx.rng() < caught then
			S.State.removeCargo(state, goodId, amount)
			local fine = math.min(state.coins, 150)
			state.coins -= fine
			state.rep[port.country] = math.max(0, (state.rep[port.country] or 0) - 8)
			return true, string.format("세관에 들켰다! %s %d개 압수, 벌금 %d, 우호도 -8", D.Ports.Goods[goodId].name, amount, fine)
		end
		local rate = sellRateFor(state)
		local mult = ctx.market:get(state.portId, goodId)
		local ev = (ctx.market:eventMult(state.portId, goodId) * S.History.mult(state, state.portId, goodId) * (if S.Econ and S.Econ.marketFactor then S.Econ.marketFactor(state, state.portId, goodId) else 1))
		local revenue = 0
		for _ = 1, amount do
			revenue += T.sellPrice(state.portId, goodId, mult, rate * S.Knowledge.goodsMult(state, goodId), ev)
			mult = T.nextStockMult(mult, 1, false)
		end
		revenue = math.floor(revenue * 1.1)
		state.coins += revenue
		S.State.removeCargo(state, goodId, amount)
		ctx.market:set(state.portId, goodId, mult)
		return true, string.format("%s %d개를 몰래 팔았다 (+%d, 관세 없음)", D.Ports.Goods[goodId].name, amount, revenue)
	end

	return { handlers = handlers, sellRateFor = sellRateFor, repBonus = repBonus, tariffRate = tariffRate, lockOf = lockOf, saleQuote = saleQuote }
end
