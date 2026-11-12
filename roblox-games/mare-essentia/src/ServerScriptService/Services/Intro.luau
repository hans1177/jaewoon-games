--!nonstrict
-- 시작 안내: 교역소에서 이름을 적고(거래 장부), 주점에서 첫 동료를 만나고, 화가에게 초상화를 받는다.
-- 순서: name → companion → portrait → done

return function(D, S)
	local handlers = {}

	local function intro(state)
		state.intro = state.intro or { name = false, companion = false, portrait = false }
		state.captain = state.captain or {}
		return state.intro
	end

	local function step(state)
		local i = intro(state)
		if not i.name then
			return "name"
		elseif not i.companion then
			return "companion"
		elseif not i.portrait then
			return "portrait"
		end
		return "done"
	end

	-- 이름: 앞뒤 공백을 지우고 1~12글자, 제어문자 금지
	local function cleanName(raw)
		if type(raw) ~= "string" then
			return nil
		end
		local s = string.gsub(raw, "^%s+", "")
		s = string.gsub(s, "%s+$", "")
		if string.match(s, "%c") then
			return nil
		end
		local n = utf8.len(s)
		if not n or n < 1 or n > 12 then
			return nil
		end
		return s
	end

	-- 초상화 표기: "cp:<시트>:<칸>" (동료·인물 시트), 예전 "hero:<국가>", "npc:<항구>:<0~9>"
	local function validPortrait(p)
		if type(p) ~= "string" then
			return false
		end
		local nation = string.match(p, "^hero:([%w_]+)$")
		if nation then
			return D.Ports.Nations[nation] ~= nil
		end
		local sheet, idx = string.match(p, "^cp:([%w_]+):(%d+)$")
		if sheet then
			local count = D.Specialties.PortraitSheets[sheet]
			return count ~= nil and tonumber(idx) < count
		end
		local port, cell = string.match(p, "^npc:([%w_]+):(%d)$")
		return port ~= nil and cell ~= nil and D.Ports.Ports[port] ~= nil
	end

	function handlers.IntroName(state, p)
		local i = intro(state)
		if i.name then
			return false, "이미 장부에 올렸어요"
		end
		local name = cleanName(type(p) == "table" and p.name)
		if not name then
			return false, "이름은 1~12글자로 적어 주세요"
		end
		state.captain.name = name
		i.name = true
		return true, string.format("거래 장부에 '%s' 선장이 올랐다", name)
	end

	function handlers.IntroCompanion(state)
		local i = intro(state)
		if not i.name then
			return false, "먼저 교역소에서 이름을 올려요"
		end
		if i.companion then
			return false, "이미 동료가 있어요"
		end
		local id = "n_" .. state.nationId
		if not D.Specialties.CompanionById[id] then
			i.companion = true
			return true, "혼자 길을 나선다"
		end
		if not table.find(state.companions, id) then
			local ok, msg = S.Perk.handlers.Recruit(state, { companionId = id })
			if not ok then
				-- 시작 안내가 여기서 영영 막히면 안 된다: 자리가 가득 찬 경우 등은 사유만 알리고 다음 단계로 넘어간다
				i.companion = true
				return true, string.format("%s (동료는 나중에 주점에서 만날 수 있어요)", tostring(msg))
			end
			i.companion = true
			return true, msg
		end
		i.companion = true
		return true, "동료가 곁에 있다"
	end

	function handlers.IntroPortrait(state, p)
		local i = intro(state)
		if not i.companion then
			return false, "아직 때가 아니에요"
		end
		if i.portrait then
			return false, "이미 초상화를 받았어요"
		end
		local portrait = type(p) == "table" and p.portrait
		if not validPortrait(portrait) then
			return false, "알 수 없는 초상화예요"
		end
		state.captain.portrait = portrait
		i.portrait = true
		return true, "초상화가 완성되었다"
	end

	local function viewOf(state)
		local i = intro(state)
		local c = D.Specialties.CompanionById["n_" .. state.nationId]
		return {
			name = state.captain.name,
			portrait = state.captain.portrait,
			step = step(state),
			companion = c and { id = c.id, name = c.name, role = c.role } or nil,
		}
	end

	return { handlers = handlers, viewOf = viewOf, step = step }
end
