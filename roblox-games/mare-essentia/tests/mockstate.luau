-- 스모크 테스트 공용 상태: 에셋 라이브러리(등록된 에셋만 '있음')와 사용 기록
local AssetIds = require("./AssetIds")
local State = { used = {}, missing = {}, built = 0 }
local kinds = {}
for key in AssetIds do
	local k, n = key:match("^(%w+)/(.+)$")
	if k then kinds[k] = kinds[k] or {} kinds[k][n] = true end
end
local function model(proxy, kind, name)
	local m = proxy("Model")
	return setmetatable({}, { __index = function(_, k)
		if k == "IsA" then return function(_, c) return c == "Model" or c == "BasePart" or c == "MeshPart" end end
		if k == "GetScale" then return function() return 1 end end
		return m[k]
	end, __newindex = function() end, __iter = function() return function() return nil end end })
end
State.library = setmetatable({}, { __index = function(_, k)
	if k == "FindFirstChild" then
		return function(_, kind)
			if kind == "Ships" then return nil end
			if not kinds[kind] then State.missing[kind .. "/?"] = true return nil end
			return { FindFirstChild = function(_, name)
				State.used[kind .. "/" .. name] = true
				if not kinds[kind][name] then State.missing[kind .. "/" .. name] = true return nil end
				return model(State.proxy, kind, name)
			end }
		end
	end
	return nil
end })
return State
