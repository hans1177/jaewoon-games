--!nonstrict
-- 개발 루프의 "눈": 게임에서 난 오류·경고와 프레임 속도를 하루 단위로 모아 DataStore("MeadowDevLog")에 쓴다.
-- 개인정보는 담지 않는다 (플레이어 이름·ID 없음). 깃허브 워크플로(devloop-report)가 이 값을 읽어 docs/devloop/TELEMETRY.md 로 만든다.
-- Studio 실행에서는 아무것도 하지 않는다.
local RunService = game:GetService("RunService")
if RunService:IsStudio() then
	return
end
local LogService = game:GetService("LogService")
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local STORE = "MeadowDevLog"
local MAX_UNIQUE = 60
local FLUSH_SECONDS = 90

local remote = Instance.new("RemoteEvent")
remote.Name = "DevReport"
remote.Parent = ReplicatedStorage

local msgs = {} -- key -> { n, side, kind, text }
local unique = 0
local stats = { sessions = 0, fpsN = 0, fpsSum = 0, fpsMin = 1e9 }
local dirty = false

local function add(side, kind, text)
	text = string.sub(tostring(text), 1, 200)
	local key = side .. "|" .. kind .. "|" .. text
	local m = msgs[key]
	if m then
		m.n += 1
	elseif unique < MAX_UNIQUE then
		unique += 1
		msgs[key] = { n = 1, side = side, kind = kind, text = text }
	else
		return
	end
	dirty = true
end

LogService.MessageOut:Connect(function(text, kind)
	if kind == Enum.MessageType.MessageError then
		add("server", "error", text)
	elseif kind == Enum.MessageType.MessageWarning then
		add("server", "warn", text)
	end
end)

Players.PlayerAdded:Connect(function()
	stats.sessions += 1
	dirty = true
end)

local lastReport = {}
remote.OnServerEvent:Connect(function(player, kind, value)
	local now = os.clock()
	local rec = lastReport[player] or { t = now, n = 0 }
	if now - rec.t > 60 then
		rec.t, rec.n = now, 0
	end
	rec.n += 1
	lastReport[player] = rec
	if rec.n > 30 then
		return
	end
	if kind == "fps" and type(value) == "number" and value > 0 and value < 1000 then
		stats.fpsN += 1
		stats.fpsSum += value
		stats.fpsMin = math.min(stats.fpsMin, value)
		dirty = true
	elseif (kind == "error" or kind == "warn") and type(value) == "string" then
		add("client", kind, value)
	end
end)
Players.PlayerRemoving:Connect(function(p)
	lastReport[p] = nil
end)

local function flush()
	if not dirty then
		return
	end
	local key = "d" .. os.date("!%Y%m%d")
	local mine = { msgs = msgs, stats = stats }
	msgs, unique, stats, dirty = {}, 0, { sessions = 0, fpsN = 0, fpsSum = 0, fpsMin = 1e9 }, false
	pcall(function()
		DataStoreService:GetDataStore(STORE):UpdateAsync(key, function(old)
			old = if type(old) == "table" then old else { msgs = {}, stats = { sessions = 0, fpsN = 0, fpsSum = 0, fpsMin = 1e9 } }
			old.msgs = old.msgs or {}
			old.stats = old.stats or { sessions = 0, fpsN = 0, fpsSum = 0, fpsMin = 1e9 }
			local count = 0
			for _ in old.msgs do
				count += 1
			end
			for k, m in mine.msgs do
				local o = old.msgs[k]
				if o then
					o.n += m.n
				elseif count < 120 then
					count += 1
					old.msgs[k] = m
				end
			end
			old.stats.sessions += mine.stats.sessions
			old.stats.fpsN += mine.stats.fpsN
			old.stats.fpsSum += mine.stats.fpsSum
			old.stats.fpsMin = math.min(old.stats.fpsMin, mine.stats.fpsMin)
			return old
		end)
	end)
end

task.spawn(function()
	while true do
		task.wait(FLUSH_SECONDS)
		flush()
	end
end)
game:BindToClose(flush)
