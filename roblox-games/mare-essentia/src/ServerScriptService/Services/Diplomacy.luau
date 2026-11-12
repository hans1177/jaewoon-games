--!nonstrict
-- 국가 관계·전쟁·다른 항해자.
-- 전쟁은 역사 속 연도에 따라 저절로 일어나고 끝난다. 우리 세력과 싸우는 나라의 항구에 들어가면 입항세를 물고,
-- 전쟁 중인 나라의 항구에서는 무기·건축 자재 값이 오른다. 선물로 호감을 쌓고, 통행 증서로 적국 항구에도 안전히 들어간다.
-- 항해자(상인·탐험가·군인·사략선장·해적·순례자)는 정해진 항로를 돌며 항구에 머문다 (날짜만으로 위치가 정해진다).

return function(D, S)
	local X = D.Specialties
	local handlers = {}
	local GIFT_COST, PASS_COST, PASS_DAYS = 200, 400, 60
	local WAR_MULT = 1.18

	local function dip(state)
		local d = state.diplo
		if type(d) ~= "table" then
			d = { rep = {}, passUntil = 0, met = {}, honor = {}, warSeen = {} }
			state.diplo = d
		end
		d.rep = d.rep or {}
		d.met = d.met or {}
		d.honor = d.honor or {}
		d.warSeen = d.warSeen or {}
		d.passUntil = d.passUntil or 0
		return d
	end
	local function year(state)
		return state.startYear + state.day / 365
	end
	local function myPower(state)
		return X.NationPower[state.nationId] or state.nationId
	end
	local function powerOfPort(portId)
		local p = D.Ports.Ports[portId]
		return p and X.CountryPower[p.country] or nil
	end
	local function isActive(w, y)
		return y >= w.from and y < w.to
	end
	-- 두 세력의 관계: "war"(서로 다른 편) / "ally"(같은 편) / nil
	local function relation(a, b, y)
		if a == b then
			return nil
		end
		local ally = false
		for _, w in X.Wars do
			if isActive(w, y) then
				local aa, ab = table.find(w.a, a), table.find(w.a, b)
				local ba, bb = table.find(w.b, a), table.find(w.b, b)
				if (aa and bb) or (ba and ab) then
					return "war"
				end
				if (aa and ab) or (ba and bb) then
					ally = true
				end
			end
		end
		return if ally then "ally" else nil
	end
	local function statusOf(state, power)
		local d = dip(state)
		if power == myPower(state) then
			return "own"
		end
		local rel = relation(myPower(state), power, year(state))
		if rel == "war" then
			return "war"
		end
		local rep = d.rep[power] or 0
		if rel == "ally" then
			return "ally"
		end
		if rep >= 25 then
			return "friend"
		elseif rep <= -25 then
			return "hostile"
		end
		return "neutral"
	end

	-- 전쟁 중인 세력의 항구에서는 무기·건축 자재 수요가 늘어 값이 오른다 (History.mult 에 곱해진다)
	local function mult(state, portId, goodId)
		if not table.find(X.WarGoods, goodId) then
			return 1
		end
		local power = powerOfPort(portId)
		if not power then
			return 1
		end
		local y = year(state)
		for _, w in X.Wars do
			if isActive(w, y) and (table.find(w.a, power) or table.find(w.b, power)) then
				return WAR_MULT
			end
		end
		return 1
	end

	local function names(list)
		local out = {}
		for _, id in list do
			table.insert(out, X.PowerName[id] or id)
		end
		return table.concat(out, "·")
	end

	local function tick(state)
		local d = dip(state)
		local y = year(state)
		local msgs = {}
		local mine = myPower(state)
		for _, w in X.Wars do
			local seen = d.warSeen[w.id]
			if isActive(w, y) and seen == nil then
				d.warSeen[w.id] = "on"
				-- 시작한 지 오래된 전쟁은 조용히 기록만 한다
				if y - w.from <= 1 then
					local involved = table.find(w.a, mine) or table.find(w.b, mine)
					table.insert(msgs, string.format("[전쟁] %s이(가) 터졌다 — %s 대 %s%s", w.title, names(w.a), names(w.b), if involved then ". 우리 쪽도 휘말렸다: 적국 항구에는 입항세가 붙는다" else ""))
				end
			elseif seen == "on" and not isActive(w, y) then
				d.warSeen[w.id] = "end"
				table.insert(msgs, string.format("[평화] %s이(가) 끝났다. 항구들이 다시 문을 연다", w.title))
			end
		end
		-- 새 항구에 닿으면: 입항세 / 호감
		local last = d.last
		if last ~= state.portId then
			d.last = state.portId
			local power = powerOfPort(state.portId)
			if last ~= nil and power and power ~= mine then
				local rel = relation(mine, power, y)
				local pname = X.PowerName[power]
				if rel == "war" then
					if d.passUntil > state.day then
						table.insert(msgs, string.format("[%s 항구] 통행 증서 덕에 무사히 입항했다", pname))
					else
						local toll = math.min(math.floor(state.coins * 0.06), 400)
						state.coins -= toll
						d.rep[power] = math.max(-100, (d.rep[power] or 0) - 2)
						table.insert(msgs, string.format("[적국 항구] %s과(와) 전쟁 중이다! 입항세 -%d코인 (통행 증서가 있으면 면제)", pname, toll))
					end
				else
					d.rep[power] = math.min(100, (d.rep[power] or 0) + (if rel == "ally" then 2 else 1))
					if d.rep[power] >= 60 and not d.honor[power] then
						d.honor[power] = true
						state.fame += 20
						table.insert(msgs, string.format("[%s] 우호가 깊어 명예 시민으로 불렸다. 명성 +20", pname))
					end
				end
			end
		end
		return msgs
	end

	function handlers.DiploGift(state)
		local d = dip(state)
		local power = powerOfPort(state.portId)
		if not power then
			return false, "이 항구는 어느 나라에도 속하지 않아요"
		end
		if power == myPower(state) then
			return false, "우리 나라 항구에는 선물할 필요가 없어요"
		end
		if relation(myPower(state), power, year(state)) == "war" then
			return false, "전쟁 중인 나라는 선물을 받아 주지 않아요"
		end
		if state.coins < GIFT_COST then
			return false, string.format("%d코인이 필요해요", GIFT_COST)
		end
		state.coins -= GIFT_COST
		d.rep[power] = math.min(100, (d.rep[power] or 0) + 12)
		return true, string.format("%s 관리에게 선물을 건넸다. 호감 +12 (지금 %d)", X.PowerName[power], d.rep[power])
	end

	function handlers.DiploPass(state)
		local d = dip(state)
		if d.passUntil >= state.day + PASS_DAYS - 5 then
			return false, "통행 증서가 아직 넉넉해요"
		end
		if state.coins < PASS_COST then
			return false, string.format("%d코인이 필요해요", PASS_COST)
		end
		state.coins -= PASS_COST
		d.passUntil = state.day + PASS_DAYS
		return true, string.format("중립국 통행 증서를 샀다. %d일 동안 적국 항구의 입항세를 면한다", PASS_DAYS)
	end

	-- 항해자 위치: 항구에 stay 일 머문 뒤 leg 일 동안 다음 항구로 항해한다.
	local function voyagerAt(v, day)
		local n = #v.circuit
		local cycle = v.stay + v.leg
		local seed = 0
		for i = 1, #v.id do
			seed += string.byte(v.id, i) * i
		end
		local t = (day + seed) % (n * cycle)
		local idx = t // cycle
		local r = t - idx * cycle
		local from = v.circuit[idx + 1]
		local to = v.circuit[(idx + 1) % n + 1]
		local prev = v.circuit[(idx - 1) % n + 1]
		if r < v.stay then
			return { docked = from, prev = prev, to = to }
		end
		return { sea = true, from = from, to = to, pct = (r - v.stay) / v.leg }
	end

	local ROLE_NAME = { merchant = "상선 선장", explorer = "탐험가", soldier = "군인", privateer = "사략선장", pirate = "해적", pilgrim = "순례 사제" }

	local function portName(id)
		local p = D.Ports.Ports[id]
		return p and p.name or id
	end
	local function goodName(portId)
		local p = D.Ports.Ports[portId]
		local g = p and p.produces and p.produces[1]
		return g and D.Ports.Goods[g] and D.Ports.Goods[g].name or nil
	end

	local function rumor(state, v, at)
		local mine = myPower(state)
		local prevName, toName = portName(at.prev), portName(at.to)
		local rel = if v.power ~= "none" then relation(mine, v.power, year(state)) else nil
		local good = goodName(at.prev)
		local text
		if v.role == "merchant" then
			text = string.format("%s에서 %s을(를) 싣고 왔소. 다음은 %s요.", prevName, good or "여러 물건", toName)
		elseif v.role == "explorer" then
			text = string.format("%s에서 오는 길이오. %s에서 새 소식을 모아 아직 지도에 없는 바다로 나갈 참이오.", prevName, toName)
		elseif v.role == "soldier" then
			text = string.format("%s 군 소속이오. %s에서 %s로 수비대를 옮기는 중이오.", X.PowerName[v.power] or "해안", prevName, toName)
		elseif v.role == "privateer" then
			text = "나라의 면허를 쥔 사략선장이오. 적국의 짐배가 지나는 길목은 내 손바닥이지."
		elseif v.role == "pirate" then
			text = "깃발은 없소. 값나가는 짐이면 누구 것이든 상관없지. 당신이 이 바다를 밤에 지날 때를 조심하시오."
		else
			text = string.format("%s에서 %s로 가는 순례길이오. 바다가 잔잔하도록 기도해 주시오.", prevName, toName)
		end
		if rel == "war" then
			text ..= " (우리 나라와는 지금 전쟁 중이라 경계하는 눈빛이다)"
		elseif rel == "ally" then
			text ..= " (같은 편이라 반갑게 맞아 준다)"
		end
		return text, good
	end

	function handlers.VoyagerMeet(state, p)
		local d = dip(state)
		local id = type(p) == "table" and p.id
		local v = type(id) == "string" and X.VoyagerById[id]
		if not v or (v.from and year(state) < v.from) then
			return false, "그런 항해자는 없어요"
		end
		local at = voyagerAt(v, state.day)
		if at.docked ~= state.portId then
			return false, "그 사람은 이 항구에 없어요"
		end
		local text, good = rumor(state, v, at)
		local msg = string.format("%s(%s): \"%s\"", v.name, ROLE_NAME[v.role], text)
		if not d.met[id] then
			d.met[id] = true
			state.fame += 1
			if v.power ~= "none" then
				d.rep[v.power] = math.min(100, (d.rep[v.power] or 0) + 2)
			end
			msg ..= "\n처음 인사를 나눴다. 명성 +1"
		end
		if good then
			msg ..= string.format("\n(소문) %s에서는 %s이(가) 흔하다더라", portName(at.prev), tostring(good))
		end
		return true, msg
	end

	local function viewOf(state)
		local d = dip(state)
		local y = year(state)
		local mine = myPower(state)
		local out = { power = { id = mine, name = X.PowerName[mine] or mine }, wars = {}, rel = {}, voyagers = {}, sea = {}, giftCost = GIFT_COST, passCost = PASS_COST }
		for _, w in X.Wars do
			if isActive(w, y) then
				table.insert(out.wars, { title = w.title, text = w.text, a = names(w.a), b = names(w.b), until_ = w.to, mine = (table.find(w.a, mine) or table.find(w.b, mine)) ~= nil })
			end
		end
		table.sort(out.wars, function(a, b)
			if a.mine ~= b.mine then
				return a.mine
			end
			return a.until_ < b.until_
		end)
		local order = { war = 1, hostile = 2, neutral = 3, friend = 4, ally = 5, own = 6 }
		for _, pw in X.Powers do
			if pw.id ~= mine then
				table.insert(out.rel, { id = pw.id, name = pw.name, status = statusOf(state, pw.id), rep = d.rep[pw.id] or 0 })
			end
		end
		table.sort(out.rel, function(a, b)
			if order[a.status] ~= order[b.status] then
				return order[a.status] < order[b.status]
			end
			return a.name < b.name
		end)
		local hp = powerOfPort(state.portId)
		out.here = { power = hp and (X.PowerName[hp] or hp) or nil, status = if hp then statusOf(state, hp) else nil, passLeft = math.max(0, d.passUntil - state.day) }
		out.here.canGift = hp ~= nil and hp ~= mine and out.here.status ~= "war"
		for _, v in X.Voyagers do
			if not (v.from and y < v.from) then
				local at = voyagerAt(v, state.day)
				if at.docked then
					if at.docked == state.portId then
						local text = rumor(state, v, at)
						table.insert(out.voyagers, { id = v.id, name = v.name, role = ROLE_NAME[v.role], power = X.PowerName[v.power] or "무국적", text = text, met = d.met[v.id] == true })
					end
				elseif #out.sea < 8 then
					table.insert(out.sea, { name = v.name, role = ROLE_NAME[v.role], from = portName(at.from), to = portName(at.to), pct = math.floor(at.pct * 100) })
				end
			end
		end
		return out
	end

	return { handlers = handlers, tick = tick, mult = mult, viewOf = viewOf, relation = relation, voyagerAt = voyagerAt }
end
