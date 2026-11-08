--!nonstrict
-- 탐험과 학자 방문: 도감 카드를 발견하면 코인, 명성, 모험 경험치를 받는다.

return function(D, S)
	local handlers = {}

	local RARITY_XP = { Common = 15, Uncommon = 25, Rare = 45, Epic = 80, Legendary = 150 }

	-- 카드 발견 처리. 새로 발견했으면 true.
	local function grantCard(state, cardId, msgs)
		local card = D.Cards.ById[cardId]
		if not card or state.discovered[cardId] then
			return false
		end
		state.discovered[cardId] = true
		local coins = math.floor(card.reward.coins * S.Perk.coinMult(state, card.field))
		state.coins += coins
		state.fame += card.reward.fame
		table.insert(msgs, string.format("도감 등록: %s [%s] (+%d코인, 명성 +%d)", card.name, card.rarity, coins, card.reward.fame))
		S.State.gainXp(state, "adventure", RARITY_XP[card.rarity] or 15, msgs)
		S.Perk.gainSpec(state, card.field, RARITY_XP[card.rarity] or 15, msgs)
		S.Perk.addAffinity(state, 1, msgs)
		return true
	end

	local function findSite(siteId)
		for _, site in D.Sites.Sites do
			if site.id == siteId then
				return site
			end
		end
		return nil
	end

	function handlers.Explore(state, p, ctx)
		local site = type(p.siteId) == "string" and findSite(p.siteId)
		if not site then
			return false, "잘못된 요청"
		end
		if site.portId ~= state.portId then
			return false, "이 항구의 탐험 지점이 아니에요"
		end
		local lv = state.careers.adventure.level
		if lv < site.minLevel then
			return false, string.format("모험 레벨 %d 이상이 필요해요", site.minLevel)
		end

		local remaining = {}
		for _, cardId in site.pool do
			if not state.discovered[cardId] then
				table.insert(remaining, cardId)
			end
		end
		if #remaining == 0 then
			return false, "이곳은 이미 모두 조사했어요"
		end

		local need = D.Voyage.suppliesPerDay(S.State.totalCrew(state)) * site.days
		if state.ship.supplies < need then
			return false, string.format("보급품이 부족해요 (필요 %d)", need)
		end
		state.ship.supplies -= need
		S.State.advanceDays(state, site.days)
		state.stats.explored += 1

		local msgs = { string.format("%s 탐험 (%d일)", site.name, site.days) }
		local cardId = remaining[1 + math.floor(ctx.rng() * #remaining) % #remaining]
		local field = D.Cards.ById[cardId].field
		local chance = math.min(0.95, 0.55 + D.Careers.discoverBonus(lv) + S.Perk.discoverBonus(state, field))
		if ctx.rng() < chance then
			grantCard(state, cardId, msgs)
		else
			table.insert(msgs, "이번에는 아무것도 찾지 못했다")
			S.State.gainXp(state, "adventure", 5, msgs)
		end
		return true, table.concat(msgs, "\n")
	end

	function handlers.Visit(state, p)
		local scholar
		for _, s in D.Scholars.Scholars do
			if s.id == p.scholarId then
				scholar = s
			end
		end
		if not scholar then
			return false, "잘못된 요청"
		end
		if scholar.portId ~= state.portId then
			return false, "이 항구에 있지 않아요"
		end
		local year = S.State.year(state)
		if year < scholar.fromYear or year > scholar.toYear then
			return false, string.format("지금(%d년)은 만날 수 없어요", year)
		end
		if state.scholarsMet[scholar.id] then
			return false, "이미 지식을 전수받았어요"
		end
		if state.fame < scholar.minFame then
			return false, string.format("명성 %d 이상이 필요해요", scholar.minFame)
		end
		state.scholarsMet[scholar.id] = true
		local msgs = { string.format("%s: \"%s\"", scholar.name, scholar.line) }
		grantCard(state, scholar.cardId, msgs)
		return true, table.concat(msgs, "\n")
	end

	return { handlers = handlers, grantCard = grantCard }
end
