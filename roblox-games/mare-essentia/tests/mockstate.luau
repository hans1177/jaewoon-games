-- 스모크 테스트 공용 상태: 에셋 라이브러리(등록된 에셋만 '있음')와 사용 기록
local AssetIds = require("./AssetIds")
local State = { used = {}, missing = {}, built = 0 }
local kinds = {}
for key in AssetIds do
	local k, n = key:match("^(%w+)/(.+)$")
	if k then kinds[k] = kinds[k] or {} kinds[k][n] = true end
end
-- [수입 모델 스모크] 실제 Model:GetScale/ScaleTo는 절대 배율을 다룬다.
-- 원본 크기(스모크 10)를 유지하고 ScaleTo 후 GetBoundingBox에서 변경된 크기를 돌려준다.
-- 동물 수입본이 모델 배율·실측 크기 검증을 통과하는지 수치로 검사한다.
local function model(proxy, kind, name)
	local m = proxy("Model")
	local scale = 1
	return setmetatable({}, { __index = function(_, k)
		if k == "IsA" then return function(_, c) return c == "Model" or c == "BasePart" or c == "MeshPart" end end
		if k == "Clone" then return function() return model(proxy, kind, name) end end
		if k == "GetScale" then return function() return scale end end
		if k == "ScaleTo" then return function(_, value)
			if type(value) ~= "number" or value ~= value or value <= 0 or value == math.huge then error("잘못된 모델 배율") end
			scale = value
		end end
		if k == "GetBoundingBox" then return function()
			local center, original = m:GetBoundingBox()
			return center, { X = original.X * scale, Y = original.Y * scale, Z = original.Z * scale }
		end end
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
