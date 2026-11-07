--!nonstrict
-- 플레이어 간 기능: 우편(코인 송금·쪽지)과 거래소 게시판(경매 같은 고정가 매매).
-- DataStore 에 저장하며, 판정은 전부 서버에서 한다. 실패하면 코인·화물은 건드리지 않는다.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

return function(D, S)
	local social = {}
	local mailStore, boardStore
	pcall(function()
		mailStore = DataStoreService:GetDataStore("MareMail")
		boardStore = DataStoreService:GetDataStore("MareMarketBoard")
	end)

	local MAX_MAIL = 20
	local MAX_LISTINGS = 40
	local MAX_MAIL_COINS = 5000
	local FEE = 0.05

	local function mailKey(userId)
		return "M_" .. userId
	end

	-- 우편함에 한 통을 넣는다 (원자적). 성공 여부를 돌려준다.
	local function appendMail(userId, entry)
		if not mailStore then
			return false
		end
		local ok = pcall(function()
			mailStore:UpdateAsync(mailKey(userId), function(old)
				local list = if type(old) == "table" then old else {}
				if #list >= MAX_MAIL then
					table.remove(list, 1)
				end
				table.insert(list, entry)
				return list
			end)
		end)
		return ok
	end

	function social.MailSend(player, state, p)
		if not mailStore then
			return false, "우편을 쓸 수 없어요"
		end
		local toName, coins, text = p.to, math.floor(tonumber(p.coins) or 0), tostring(p.text or "")
		if type(toName) ~= "string" or #toName < 3 or #toName > 20 then
			return false, "받는 사람 이름을 확인해 주세요"
		end
		if coins < 0 or coins > MAX_MAIL_COINS or coins > state.coins then
			return false, "보낼 코인이 올바르지 않아요 (최대 " .. MAX_MAIL_COINS .. ")"
		end
		text = string.sub(text, 1, 60)
		if coins == 0 and text == "" then
			return false, "보낼 내용이 없어요"
		end
		local okId, userId = pcall(function()
			return Players:GetUserIdFromNameAsync(toName)
		end)
		if not okId or type(userId) ~= "number" then
			return false, "그 이름의 플레이어를 찾지 못했어요"
		end
		if userId == player.UserId then
			return false, "자신에게는 보낼 수 없어요"
		end
		if not appendMail(userId, { from = player.Name, coins = coins, text = text, at = os.time() }) then
			return false, "지금은 우편을 보낼 수 없어요. 코인은 그대로예요"
		end
		state.coins -= coins
		return true, string.format("%s님에게 우편을 보냈다%s", toName, if coins > 0 then string.format(" (-%d코인)", coins) else "")
	end

	function social.MailInbox(player, state)
		if not mailStore then
			return false, "우편을 쓸 수 없어요"
		end
		local ok, list = pcall(function()
			return mailStore:GetAsync(mailKey(player.UserId))
		end)
		if not ok then
			return false, "우편함을 열지 못했어요"
		end
		return true, "", { mail = if type(list) == "table" then list else {} }
	end

	function social.MailClaim(player, state)
		if not mailStore then
			return false, "우편을 쓸 수 없어요"
		end
		local taken
		local ok = pcall(function()
			mailStore:UpdateAsync(mailKey(player.UserId), function(old)
				taken = if type(old) == "table" then old else {}
				return {}
			end)
		end)
		if not ok or not taken then
			return false, "우편함을 열지 못했어요"
		end
		local total, count, texts = 0, 0, {}
		for _, m in taken do
			if type(m) == "table" then
				count += 1
				total += math.clamp(math.floor(tonumber(m.coins) or 0), 0, 1e6)
				if type(m.text) == "string" and m.text ~= "" then
					table.insert(texts, string.format("%s: %s", tostring(m.from), string.sub(m.text, 1, 60)))
				end
			end
		end
		state.coins += total
		if count == 0 then
			return true, "받을 우편이 없어요", { mail = {} }
		end
		return true, string.format("우편 %d통을 받았다 (+%d코인)\\n%s", count, total, table.concat(texts, "\\n")), { mail = {} }
	end

	-- 거래소 게시판 -----------------------------------------------------------
	local cache = { at = 0, list = {} }

	function social.MarketList(_player, _state)
		if not boardStore then
			return false, "거래소를 쓸 수 없어요"
		end
		if os.clock() - cache.at > 10 then
			local ok, list = pcall(function()
				return boardStore:GetAsync("Board")
			end)
			if ok then
				cache = { at = os.clock(), list = if type(list) == "table" then list else {} }
			end
		end
		return true, "", { market = cache.list }
	end

	function social.MarketPost(player, state, p)
		if not boardStore then
			return false, "거래소를 쓸 수 없어요"
		end
		local goodId, amount, price = p.goodId, math.floor(tonumber(p.amount) or 0), math.floor(tonumber(p.price) or 0)
		local good = type(goodId) == "string" and D.Ports.Goods[goodId]
		if not good or amount < 1 or amount > 99 then
			return false, "잘못된 요청"
		end
		if (state.cargo[goodId] or 0) < amount then
			return false, "가진 수량이 부족해요"
		end
		local lo, hi = math.floor(good.basePrice * amount * 0.5), math.floor(good.basePrice * amount * 3)
		if price < lo or price > hi then
			return false, string.format("가격은 %d ~ %d코인 사이여야 해요", lo, hi)
		end
		local posted = false
		local ok = pcall(function()
			boardStore:UpdateAsync("Board", function(old)
				local list = if type(old) == "table" then old else {}
				local mine = 0
				for _, l in list do
					if l.sellerId == player.UserId then
						mine += 1
					end
				end
				if #list >= MAX_LISTINGS or mine >= 5 then
					return nil -- 변경하지 않는다
				end
				table.insert(list, {
					id = string.format("%d_%d", player.UserId, os.time() * 1000 + math.random(0, 999)),
					sellerId = player.UserId, sellerName = player.Name, goodId = goodId, amount = amount, price = price, at = os.time(),
				})
				posted = true
				return list
			end)
		end)
		if not ok or not posted then
			return false, "등록하지 못했어요 (게시판이 가득 찼거나 내 등록이 5건이에요)"
		end
		S.State.removeCargo(state, goodId, amount)
		cache.at = 0
		return true, string.format("%s %d개를 %d코인에 올렸다", good.name, amount, price)
	end

	function social.MarketBuy(player, state, p)
		if not boardStore then
			return false, "거래소를 쓸 수 없어요"
		end
		local id = p.id
		if type(id) ~= "string" then
			return false, "잘못된 요청"
		end
		-- 먼저 목록에서 확인(코인·화물칸), 그다음 원자적으로 꺼낸다
		local target
		local okGet, list = pcall(function()
			return boardStore:GetAsync("Board")
		end)
		if not okGet or type(list) ~= "table" then
			return false, "게시판을 열지 못했어요"
		end
		for _, l in list do
			if l.id == id then
				target = l
			end
		end
		if not target then
			return false, "이미 팔린 물건이에요"
		end
		if target.sellerId == player.UserId then
			return false, "내가 올린 물건이에요 (취소로 되찾아요)"
		end
		if state.coins < target.price then
			return false, string.format("%d코인이 필요해요", target.price)
		end
		if target.amount > S.State.cargoCapacity(state) - S.State.cargoUsed(state) then
			return false, "화물칸이 부족해요"
		end
		local claimed
		local ok = pcall(function()
			boardStore:UpdateAsync("Board", function(old)
				local cur = if type(old) == "table" then old else {}
				for i, l in cur do
					if l.id == id then
						claimed = table.remove(cur, i)
						return cur
					end
				end
				return nil
			end)
		end)
		if not ok or not claimed then
			return false, "이미 팔린 물건이에요"
		end
		state.coins -= claimed.price
		state.cargo[claimed.goodId] = (state.cargo[claimed.goodId] or 0) + claimed.amount
		state.basis[claimed.goodId] = math.floor(claimed.price / claimed.amount)
		local proceeds = math.floor(claimed.price * (1 - FEE))
		appendMail(claimed.sellerId, { from = "거래소", coins = proceeds, text = string.format("%s %d개가 팔렸어요 (수수료 5%%)", D.Ports.Goods[claimed.goodId].name, claimed.amount), at = os.time() })
		cache.at = 0
		return true, string.format("%s %d개를 샀다 (-%d코인)", D.Ports.Goods[claimed.goodId].name, claimed.amount, claimed.price)
	end

	function social.MarketCancel(player, state, p)
		if not boardStore or type(p.id) ~= "string" then
			return false, "잘못된 요청"
		end
		local claimed
		local ok = pcall(function()
			boardStore:UpdateAsync("Board", function(old)
				local cur = if type(old) == "table" then old else {}
				for i, l in cur do
					if l.id == p.id and l.sellerId == player.UserId then
						claimed = table.remove(cur, i)
						return cur
					end
				end
				return nil
			end)
		end)
		if not ok or not claimed then
			return false, "내가 올린 물건이 아니거나 이미 팔렸어요"
		end
		if claimed.amount > S.State.cargoCapacity(state) - S.State.cargoUsed(state) then
			-- 화물칸이 모자라면 우편으로 돌려준다 (값어치 만큼 코인)
			appendMail(player.UserId, { from = "거래소", coins = claimed.price, text = "화물칸이 모자라 코인으로 돌려드려요", at = os.time() })
			cache.at = 0
			return true, "화물칸이 가득이라 판매가만큼 코인을 우편으로 보냈다"
		end
		state.cargo[claimed.goodId] = (state.cargo[claimed.goodId] or 0) + claimed.amount
		cache.at = 0
		return true, string.format("%s %d개를 되찾았다", D.Ports.Goods[claimed.goodId].name, claimed.amount)
	end

	return social
end
