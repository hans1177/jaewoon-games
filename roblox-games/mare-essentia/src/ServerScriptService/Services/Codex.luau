--!nonstrict
-- 도감 완성 보상: 분야별/전체 진행도 단계마다 한 번씩 코인과 명성을 받는다.

return function(D, S)
	local C = D.Collection
	local handlers = {}

	local function fieldCounts(state)
		local total, found = {}, {}
		for _, c in D.Cards.Cards do
			total[c.field] = (total[c.field] or 0) + 1
			if state.discovered[c.id] then
				found[c.field] = (found[c.field] or 0) + 1
			end
		end
		return total, found
	end

	-- 단계별 상태 목록: { pct, need, coins, fame, claimed, claimable, title? }
	local function tiers(state, keyPrefix, defs, have, total)
		local out = {}
		for i, t in defs do
			local need = C.need(total, t.pct)
			local key = keyPrefix .. ":" .. i
			local claimed = state.collected[key] == true
			table.insert(out, {
				tier = i, pct = t.pct, need = need, coins = t.coins, fame = t.fame, title = t.title,
				claimed = claimed, claimable = (not claimed) and have >= need and total > 0,
			})
		end
		return out
	end

	local function summary(state)
		local total, found = fieldCounts(state)
		local fields = {}
		for _, f in D.Fields.Fields do
			local t, h = total[f.id] or 0, found[f.id] or 0
			table.insert(fields, { id = f.id, total = t, found = h, tiers = tiers(state, f.id, C.FIELD_TIERS, h, t) })
		end
		local all, have = #D.Cards.Cards, S.State.countDiscovered(state)
		return fields, tiers(state, "ALL", C.OVERALL_TIERS, have, all), have, all
	end

	-- 지금까지 받은 가장 높은 전체 칭호
	local function rankTitle(state)
		local title = nil
		for i, t in C.OVERALL_TIERS do
			if state.collected["ALL:" .. i] then
				title = t.title
			end
		end
		return title
	end

	-- 카드 강화: 1~3단계. 2단계부터 움직이는 삽화가 열린다.
	local MAX_LEVEL, ANIM_LEVEL = 3, 2
	local RARITY_MULT = { Common = 1, Uncommon = 2, Rare = 3, Epic = 5, Legendary = 8 }
	local function upgradeCost(card, level)
		return 150 * (level + 1) * (RARITY_MULT[card.rarity] or 1)
	end

	function handlers.UpgradeCodexCard(state, p)
		local card = type(p.id) == "string" and D.Cards.ById[p.id]
		if not card or not state.discovered[card.id] then
			return false, "발견한 카드만 강화할 수 있어요"
		end
		local level = state.codexLevel[card.id] or 0
		if level >= MAX_LEVEL then
			return false, "이미 최대 단계예요"
		end
		local cost = upgradeCost(card, level)
		if state.coins < cost then
			return false, string.format("%d코인이 필요해요", cost)
		end
		state.coins -= cost
		state.codexLevel[card.id] = level + 1
		local msg = string.format("'%s' 강화 %d단계! (-%d코인)", card.name, level + 1, cost)
		if level + 1 == ANIM_LEVEL then
			msg ..= "\n움직이는 삽화가 열렸어요"
		end
		return true, msg
	end

	function handlers.ClaimCollection(state, p)
		local scope = p.scope
		local tier = type(p.tier) == "number" and math.floor(p.tier)
		local fields, overall = summary(state)
		local list, def, label
		if scope == "all" then
			list, label = overall, "도감 전체"
		elseif type(scope) == "string" and D.Fields.ById[scope] then
			for _, f in fields do
				if f.id == scope then
					list = f.tiers
				end
			end
			label = D.Fields.ById[scope].name .. " 도감"
		end
		def = list and tier and list[tier]
		if not def then
			return false, "잘못된 요청"
		end
		if def.claimed then
			return false, "이미 받았어요"
		end
		if not def.claimable then
			return false, string.format("%d개를 모아야 해요", def.need)
		end
		state.collected[(if scope == "all" then "ALL" else scope) .. ":" .. tier] = true
		state.coins += def.coins
		state.fame += def.fame
		local msg = string.format("%s %d%% 달성! +%d코인, 명성 +%d", label, def.pct, def.coins, def.fame)
		if def.title then
			msg ..= string.format("\n칭호 '%s'를 얻었다", def.title)
		end
		return true, msg
	end

	return { handlers = handlers, summary = summary, rankTitle = rankTitle, upgradeCost = upgradeCost, MAX_LEVEL = MAX_LEVEL, ANIM_LEVEL = ANIM_LEVEL }
end
