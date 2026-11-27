warn = warn or function() end -- 평범한 luau에는 warn이 없다
-- Roblox 엔진 목업 (스모크 테스트용). PortScene/PortCultures 앞에 붙여서 쓴다.
local State = require("./mockstate")
local function proxy(name)
	local p = {}
	local mt = {}
	mt.__index = function(_, k)
		-- [건축 접합 스모크] CFrame 기본 축과 벡터 내적은 숫자 성분을 반환한다.
		if k == "X" or k == "Y" or k == "Z" then
			if name == "RightVector" then return if k == "X" then 1 else 0 end
			if name == "UpVector" then return if k == "Y" then 1 else 0 end
			if name == "LookVector" then return if k == "Z" then -1 else 0 end
			return 10
		end
		if k == "Dot" then return function(self, other)
			return self.X * other.X + self.Y * other.Y + self.Z * other.Z
		end end
		if k == "R" or k == "G" or k == "B" or k == "Magnitude" then return 10 end
		if k == "Name" or k == "ClassName" then return name end
		if k == "Transparency" then return 0 end -- 실제 BasePart 기본값. 숫자 비교(< 1)가 가능해야 한다.
		if k == "IsA" then return function() return true end end
		if k == "FindFirstChild" or k == "FindFirstChildWhichIsA" or k == "WaitForChild" then
			return function(self, n)
				if n == "MareAssets" then return State.library end
				if n == "Baseplate" or n == "PortScene" then return nil end
				return proxy(tostring(n))
			end
		end
		if k == "GetDescendants" or k == "GetChildren" then return function() return { proxy("Part") } end end
		if k == "GetBoundingBox" then return function() return proxy("cf"), proxy("size") end end
		if k == "GetAttribute" then return function() return nil end end
		if k == "Clone" then return function(self) return self end end
		if k == "Connect" then return function() return proxy("conn") end end
		return proxy(tostring(k))
	end
	-- [스모크] 실제 Camera.FieldOfView는 대입 후 읽을 수 있어야 한다.
	-- 나머지 동적 Roblox 속성은 기존 경량 목업 동작을 유지한다.
	mt.__newindex = function(self, key, value)
		if name == "Camera" and key == "FieldOfView" then rawset(self, key, value) end
	end
	mt.__call = function() return proxy(name .. "()") end
	mt.__iter = function() return function() return nil end end
	for _, op in { "__add", "__sub", "__mul", "__div", "__idiv", "__mod", "__unm" } do
		mt[op] = function() return proxy(name) end
	end
	mt.__lt = function() return false end
	mt.__le = function() return false end
	mt.__len = function() return 0 end
	return setmetatable(p, mt)
end
State.proxy = proxy
local function vec(x, y, z)
	local v = { X = x, Y = y, Z = z }
	v.Magnitude = math.sqrt(x * x + y * y + z * z)
	return setmetatable(v, {
		-- [스모크 벡터] 실제 Roblox Vector3의 정규화 방향을 모사한다.
		__index = function(self, key)
			if key == "Dot" then return function(a, b) return a.X * b.X + a.Y * b.Y + a.Z * b.Z end end
			if key == "Unit" then
				local length = self.Magnitude
				if length <= 0 then return vec(0, 0, 0) end
				return vec(self.X / length, self.Y / length, self.Z / length)
			end
			return nil
		end,
		__add = function(a, b) return vec(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end,
		__sub = function(a, b) return vec(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end,
		__mul = function(a, b)
			if type(a) == "number" then return vec(a * b.X, a * b.Y, a * b.Z) end
			if type(b) == "number" then return vec(a.X * b, a.Y * b, a.Z * b) end
			return vec(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
		end,
		__div = function(a, b) return vec(a.X / b, a.Y / b, a.Z / b) end,
		__unm = function(a) return vec(-a.X, -a.Y, -a.Z) end,
	})
end
Vector3 = { new = function(x, y, z) return vec(x or 0, y or 0, z or 0) end, zero = vec(0, 0, 0), yAxis = vec(0, 1, 0), xAxis = vec(1, 0, 0), zAxis = vec(0, 0, 1) }
Vector2 = { new = function(x, y) return { X = x or 0, Y = y or 0 } end }
-- [Roblox Color3 모의] 실제 0~1 RGB와 HSV 상호변환을 재현해 181개 항구의 색상 변형을 스모크에서 검증한다.
local colorMethods = {}
colorMethods.__index = colorMethods
local function colorOf(r, g, b)
	return setmetatable({ R = r or 0, G = g or 0, B = b or 0 }, colorMethods)
end
function colorMethods:ToHSV()
	local r, g, b = self.R, self.G, self.B
	local highest, lowest = math.max(r, g, b), math.min(r, g, b)
	local delta, hue = highest - lowest, 0
	if delta > 0 then
		if highest == r then hue = ((g - b) / delta) % 6
		elseif highest == g then hue = (b - r) / delta + 2
		else hue = (r - g) / delta + 4 end
		hue /= 6
	end
	return hue, if highest > 0 then delta / highest else 0, highest
end
function colorMethods:Lerp(other, alpha)
	return colorOf(self.R + (other.R - self.R) * alpha,
		self.G + (other.G - self.G) * alpha, self.B + (other.B - self.B) * alpha)
end
local function colorFromHSV(hue, saturation, value)
	local function channel(offset)
		local k = (offset + 6 * hue) % 6
		return value - value * saturation * math.max(math.min(k, 4 - k, 1), 0)
	end
	return colorOf(channel(5), channel(3), channel(1))
end
Color3 = {
	new = colorOf,
	fromRGB = function(r, g, b) return colorOf((r or 0) / 255, (g or 0) / 255, (b or 0) / 255) end,
	fromHSV = colorFromHSV,
}
CFrame = setmetatable({ new = function() return proxy("CFrame") end, lookAt = function() return proxy("CFrame") end, Angles = function() return proxy("CFrame") end, identity = proxy("CFrame") }, {})
-- 접합 계산이 수치 내적을 사용하도록 실제 축의 부호와 직교성을 검증한다.
assert(CFrame.identity.RightVector:Dot(Vector3.xAxis) == 1)
assert(CFrame.identity.UpVector:Dot(Vector3.yAxis) == 1)
assert(CFrame.identity.LookVector:Dot(Vector3.zAxis) == -1)
assert(CFrame.identity.RightVector:Dot(Vector3.yAxis) == 0)
assert(Vector3.new(2, 3, 4):Dot(Vector3.new(5, 6, 7)) == 56)
UDim2 = setmetatable({}, { __index = function() return function() return proxy("UDim2") end end })
UDim = UDim2
Enum = setmetatable({}, { __index = function(_, k) return setmetatable({}, { __index = function(_, n) return k .. "." .. n end }) end })
-- [엔진 스모크 목업] 항구 지면 접지의 실제 RaycastParams 생성·속성 지정을 재현한다.
-- 게임 소스가 아닌 검사용 Roblox API 표면이다. Raycast 결과의 성공 여부는 임의로 만들지 않는다.
RaycastParams = { new = function()
	return { FilterType = Enum.RaycastFilterType.Exclude, RespectCanCollide = false }
end }
Instance = { new = function(cls) return proxy(cls) end }
Random = { new = function(seed)
	local s = (seed or 1) % 2147483647
	local function nextf() s = (s * 48271) % 2147483647 return s / 2147483647 end
	return { NextNumber = function(self, a, b) if a then return a + (b - a) * nextf() end return nextf() end,
		NextInteger = function(self, a, b) return a + math.floor(nextf() * (b - a + 1)) end }
end }
TweenInfo = { new = function() return proxy("TweenInfo") end }
NumberSequence = { new = function() return proxy("NumberSequence") end }
ColorSequence = NumberSequence
NumberRange = NumberSequence
Rect = { new = function() return proxy("Rect") end }
Ray = Rect
local services = setmetatable({}, { __index = function(t, k) local p = proxy(k) rawset(t, k, p) return p end })
game = { GetService = function(_, n) return services[n] end, Players = services.Players }
workspace = proxy("workspace")
task = { spawn = function() end, defer = function() end, delay = function() end, wait = function() return 0 end }
script = { Parent = proxy("script") }
