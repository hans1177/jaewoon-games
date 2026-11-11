--!nonstrict
-- 방 시계(서버 하나 = 방 하나): 현실 시간으로 흐르는 공통 시대. 방에 들어온 사람의 날짜는 방 날짜로 맞춰진다.
-- 사건 추첨 결과(방 전체 공통)도 여기에 한 번만 기록해 모두가 같은 사건을 겪게 한다.

return function(D, S)
	local R = D.RoomClock
	local Room = { info = nil, nowFn = os.time }

	local function newId()
		return tostring(Room.nowFn()) .. "-" .. tostring(math.random(1000, 9999))
	end

	-- 방이 없으면 만든다. startYear/baseDay 는 처음 만든 사람 기준.
	local function ensure(startYear, baseDay)
		if not Room.info then
			Room.info = { id = newId(), startYear = startYear, baseDay = baseDay or 0, epoch = Room.nowFn(), seed = math.random(1, 2147483000), rolls = {} }
		end
		return Room.info
	end

	function Room.reset()
		Room.info = nil
	end

	function Room.dayNow()
		local i = Room.info
		if not i then
			return nil
		end
		return i.baseDay + R.daysFor(Room.nowFn() - i.epoch)
	end

	-- 새 게임에서 방에 들어간다. 이미 방이 있으면 그 시대로 고정된다.
	function Room.join(state)
		local i = ensure(state.startYear, 0)
		state.startYear = i.startYear
		state.day = Room.dayNow() or 0
		state.room = { id = i.id }
		return i
	end

	-- 요청마다 방 날짜로 맞춘다. 서버가 새로 떠서 방이 사라졌다면 이 사람의 날짜를 기준으로 방을 다시 연다.
	function Room.sync(state)
		if not state.room then
			return
		end
		if not Room.info or Room.info.id ~= state.room.id then
			if Room.info then
				-- 이미 다른 방이 열려 있으면 그 방에 합류 (시대가 다르면 이 사람의 연도를 방 시대로 맞춘다)
				state.startYear = Room.info.startYear
				state.room = { id = Room.info.id }
				state.day = Room.dayNow() or state.day
				return
			end
			Room.info = { id = state.room.id, startYear = state.startYear, baseDay = state.day, epoch = Room.nowFn(), seed = math.random(1, 2147483000), rolls = {} }
		end
		state.day = math.max(state.day, Room.dayNow() or 0)
	end

	function Room.publicInfo()
		local i = Room.info
		if not i then
			return nil
		end
		return { year = i.startYear + math.floor((Room.dayNow() or 0) / 365), startYear = i.startYear }
	end

	function Room.seed()
		return Room.info and Room.info.seed or 1
	end

	-- 방 전체 공통 사건 추첨 기록 (rollIndex → { id, region })
	function Room.roll(index, make)
		local i = Room.info
		if not i then
			return make()
		end
		local c = i.rolls[index]
		if c == nil then
			c = make() or false
			i.rolls[index] = c
		end
		return c or nil
	end

	function Room.viewOf(state)
		if not state.room then
			return { on = false }
		end
		return { on = true, perMinute = R.DAYS_PER_MINUTE, year = S.State.year(state) }
	end

	return Room
end
