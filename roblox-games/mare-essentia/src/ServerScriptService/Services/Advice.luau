--!nonstrict
-- 동료 조언: 지금 상황(선체·보급·선원·자리·교역·탐험·직업)과 게임 초반 안내를 동료의 말로 들려준다.
-- 조언은 순서(priority)대로 상위 몇 개만 화면에 보이고, action 은 눌렀을 때 열 화면이다.
-- 새 조언은 아래 add(...) 한 줄을 더하면 된다.
return function(D, S)
	local A = { handlers = {} }
	local Sp = D.Specialties

	-- 주제별로 말해 줄 동료의 자리: 그 자리에 앉은 동료가 말하고, 없으면 아무 동료, 그것도 없으면 늙은 항해사
	local TOPIC_SEAT = { ship = "boatswain", crew = "boatswain", cargo = "mate", trade = "mate", medical = "surgeon", gun = "gunner", knowledge = "scholar", route = "helm", guide = "helm" }
	local DEFAULT_WHO = { id = nil, name = "늙은 항해사 베르나르", role = "항해사" }

	local function speaker(state, topic)
		local seat = TOPIC_SEAT[topic] or "helm"
		local id = state.stations[seat]
		if not id then
			id = state.companions[1]
		end
		local c = id and Sp.CompanionById[id]
		if c then
			return { id = c.id, name = c.name, role = c.role or "동료" }
		end
		return DEFAULT_WHO
	end

	-- 초반 안내 단계: done(state) 가 참이면 자동으로 끝난 것으로 본다. 사용자가 "알겠어요"를 눌러도 끝난다.
	local GUIDE = {
		{ id = "g_trade", topic = "trade", tab = "trade", label = "교역소로",
			text = "항구에 도착했어요. 교역소에서 이 항구의 특산품을 싸게 사서 다른 항구에 비싸게 팔면 이익이 남아요. 먼저 시세를 살펴볼까요?",
			done = function(state) return S.State.countVisited(state) >= 2 end },
		{ id = "g_route", topic = "route", tab = "route", label = "항만청으로",
			text = "항만청에서 항로를 고르면 다른 항구로 출항해요. 바람과 날씨, 보급품을 확인하고 떠나요.",
			done = function(state) return S.State.countVisited(state) >= 2 end },
		{ id = "g_explore", topic = "knowledge", tab = "explore", label = "탐험하러",
			text = "항구 근처 탐험 지점에서 도감 카드를 모을 수 있어요. 카드를 모으면 직업이 생기고 카드 배틀도 강해져요.",
			done = function(state) return next(state.discovered) ~= nil end },
		{ id = "g_quest", topic = "guide", tab = "quest", label = "주점으로",
			text = "주점에서는 소문과 의뢰를 들을 수 있어요. 의뢰를 끝내면 보상과 명성이 쌓여요.",
			done = function(state) return next(state.quests.active) ~= nil or next(state.quests.done) ~= nil end },
		{ id = "g_tech", topic = "knowledge", tab = "tech", label = "서재로",
			text = "학자를 찾아 발견한 카드를 보고하면 그 지식을 이해하게 돼요. 이해한 지식은 항해 속도와 교역에 실제로 도움이 돼요.",
			done = function(state) return D.KnowledgeTree.understoodCount(state) >= 1 end },
		{ id = "g_crew", topic = "ship", tab = "crew", label = "선장실로",
			text = "동료는 직책에 맞는 자리에 앉아야 효과가 커요. 선장실에서 자리를 정하거나 자동 배치를 눌러 보세요.",
			done = function(state) return #state.companions == 0 and false end },
		{ id = "g_cards", topic = "guide", tab = "gwent", label = "카드 배틀로",
			text = "카드 배틀은 주점이 본무대예요. 해전과 지상전에서는 같은 카드가 보조로 쓰이고, 학문 카드를 모을수록 강해져요.",
			done = function(state) return false end },
	}

	local function hullRatio(state)
		local def = S.State.shipDef(state)
		local cur, max = state.ship.hull, def.hull
		for _, f in state.fleet do
			cur += f.hull
			max += D.Ships.Ships[f.id].hull
		end
		return cur / math.max(1, max)
	end

	-- 지금 상황에서 줄 조언 목록 (priority 큰 순)
	function A.list(state)
		local out = {}
		local port = D.Ports.Ports[state.portId]
		local hasYard = port and port.shipyard
		local function add(id, priority, topic, text, tab, label, dismissable)
			if state.advDone[id] then
				return
			end
			table.insert(out, { id = id, priority = priority, who = speaker(state, topic), text = text, tab = tab, label = label, dismissable = dismissable == true })
		end

		-- 선체
		local hr = hullRatio(state)
		local pct = math.floor(hr * 100 + 0.5)
		if hr < 0.5 then
			if hasYard then
				add("hull_low", 120, "ship", string.format("선장님, 선체가 %d%%밖에 안 남았어요! 이대로 출항하면 위험해요. 조선소에서 수리하죠.", pct), "yard", "조선소로 가서 수리")
			else
				add("hull_low_far", 115, "ship", string.format("선체가 %d%%예요. 이 항구에는 조선소가 없어서 응급 수리(선체 60%%까지)만 돼요. 가까운 조선소로 가서 마저 고치죠.", pct), "yard", "수리 방법 보기")
			end
		elseif hr < 0.8 and hasYard then
			add("hull_mid", 60, "ship", string.format("선체가 %d%%예요. 여기 조선소에 온 김에 손봐 두면 어떨까요?", pct), "yard", "조선소로")
		end
		-- 보급·선원
		if state.ship.supplies <= 8 then
			add("supplies_low", 110, "crew", string.format("보급품이 %d개밖에 안 남았어요. 먼 바다로 나가기 전에 채워 두죠.", state.ship.supplies), if hasYard then "yard" else "route", if hasYard then "조선소로" else "항로 보기")
		end
		local def = S.State.shipDef(state)
		if state.ship.crew < math.floor(def.crew * 0.5) then
			add("crew_low", 105, "crew", string.format("선원이 %d명뿐이에요. 배가 제대로 움직이려면 더 필요해요.", state.ship.crew), if hasYard then "yard" else "route", if hasYard then "선원 고용" else "항로 보기")
		end
		-- 동료 자리
		if #state.companions > 0 then
			local empty, mismatch = 0, 0
			for _, st in Sp.Stations do
				local who = state.stations[st.id]
				if who == nil then
					empty += 1
				elseif Sp.CompanionStation[who] ~= st.id then
					mismatch += 1
				end
			end
			if empty > 0 and #state.companions > (#Sp.Stations - empty) then
				add("seat_empty", 55, "ship", "앉을 자리를 못 찾은 동료가 있어요. 선장실에서 자리를 정해 주세요.", "crew", "선장실로")
			elseif mismatch > 0 then
				add("seat_mismatch", 40, "ship", "직책에 안 맞는 자리에 앉은 동료가 있어요. 자동 배치를 누르면 가장 잘 맞게 앉혀 드려요.", "crew", "자동 배치하러")
			end
		end
		-- 화물
		if S.State.cargoUsed(state) >= S.State.cargoCapacityFor(state, def) and S.State.cargoUsed(state) > 0 then
			add("cargo_full", 50, "cargo", "화물칸이 가득 찼어요. 교역소에서 팔아 이익을 남겨 보죠.", "trade", "교역소로")
		end
		-- 직업
		if not state.specialty and state.day >= 5 then
			add("no_job", 45, "knowledge", "아직 직업이 없네요. 카드를 3장 모으면 그 계열 직업이 자동으로 정해지고, 직접 고를 수도 있어요.", "status", "직업 보기", true)
		end
		-- 돈이 남을 때
		if state.coins >= 4000 and (D.Ships.Ships[state.ship.id].class or 1) <= 1 and port and port.shipyard then
			add("rich", 30, "ship", "코인이 넉넉해요. 더 큰 배로 바꾸거나 대포를 손볼 때가 된 것 같아요.", "yard", "조선소로", true)
		end
		-- 진행 중인 의뢰
		if next(state.quests.active) ~= nil then
			add("quest_open", 25, "guide", "일지에 진행 중인 의뢰가 있어요. 조건을 확인해 볼까요?", "quest", "주점으로", true)
		end

		-- 초반 안내: 아직 안 끝난 첫 단계 하나만 보여 준다 (하루 120일 안에서만)
		if state.day < 120 then
			for i, g in GUIDE do
				if not state.advDone[g.id] and not g.done(state) then
					add(g.id, 100 - i, g.topic, g.text, g.tab, g.label, true)
					break
				end
			end
		end

		table.sort(out, function(a, b)
			return a.priority > b.priority
		end)
		return out
	end

	function A.handlers.AdviceDone(state, p)
		local id = type(p) == "table" and p.id
		if type(id) ~= "string" or #id > 40 then
			return false, "잘못된 요청"
		end
		state.advDone[id] = true
		return true, ""
	end

	A.GUIDE = GUIDE
	return A
end
