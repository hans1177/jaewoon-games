--!nonstrict
-- 모든 서비스를 만들어 하나의 액션 표(handlers)로 묶는다.
-- 서비스는 Roblox API를 쓰지 않으므로 서버 밖(Luau CLI)에서도 테스트할 수 있다.

return function(D)
	local S = {}
	S.State = require(script.Parent.State)(D)
	S.MarketClass = require(script.Parent.Market)(D)
	S.Trade = require(script.Parent.Trade)(D, S)
	S.Perk = require(script.Parent.Perk)(D, S)
	S.Harbor = require(script.Parent.Harbor)(D, S)
	S.Order = require(script.Parent.Order)(D, S)
	S.Room = require(script.Parent.Room)(D, S)
	S.Shipyard = require(script.Parent.Shipyard)(D, S)
	S.Battle = require(script.Parent.Battle)(D, S)
	S.Boss = require(script.Parent.Boss)(D, S)
	S.Sailing = require(script.Parent.Sailing)(D, S)
	S.Discovery = require(script.Parent.Discovery)(D, S)
	S.Tactics = require(script.Parent.Tactics)(D, S)
	S.Facility = require(script.Parent.Facility)(D, S)
	S.Story = require(script.Parent.Story)(D, S)
	S.Codex = require(script.Parent.Codex)(D, S)
	S.Research = require(script.Parent.Research)(D, S)
	S.Knowledge = require(script.Parent.Knowledge)(D, S)
	S.History = require(script.Parent.History)(D, S)
	S.Stock = require(script.Parent.Stock)(D, S)
	S.People = require(script.Parent.People)(D, S)
	S.World = require(script.Parent.World)(D, S)
	S.Diplomacy = require(script.Parent.Diplomacy)(D, S)
	S.Pace = require(script.Parent.Pace)(D, S)
	S.Build = require(script.Parent.Build)(D, S)
	S.Cardbook = require(script.Parent.Cardbook)(D, S)
	S.Quest = require(script.Parent.Quest)(D, S)
	S.Intro = require(script.Parent.Intro)(D, S)
	S.View = require(script.Parent.View)(D, S)

	local handlers = {}
	for _, name in { "Cardbook", "Trade", "Harbor", "Order", "Perk", "Shipyard", "Battle", "Boss", "Sailing", "Discovery", "Tactics", "Facility", "Story", "Codex", "Research", "Knowledge", "History", "Stock", "People", "World", "Diplomacy", "Pace", "Build", "Quest", "Intro" } do
		for action, fn in S[name].handlers do
			assert(handlers[action] == nil, "duplicate action: " .. action)
			handlers[action] = fn
		end
	end

	-- 사람을 만나 이야기하면(동료 대화·인물 대화·항해자 인사·이야기 장면) 일지에 새 퀘스트가 자동으로 올라온다
	for _, name in { "Talk", "PeopleTalk", "VoyagerMeet", "PlayStory" } do
		local fn = handlers[name]
		if fn then
			handlers[name] = function(state, p, ctx)
				local ok, msg = fn(state, p, ctx)
				if ok then
					local extra = {}
					S.Quest.offer(state, extra, "이야기를 나누다 의뢰를 받았다", if type(p) == "table" and type(p.companionId) == "string" then p.companionId else nil)
					if #extra > 0 then
						msg = (if msg and msg ~= "" then msg .. "\n" else "") .. table.concat(extra, "\n")
					end
				end
				return ok, msg
			end
		end
	end

	return { S = S, handlers = handlers }
end
