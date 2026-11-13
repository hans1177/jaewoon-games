warn = warn or function() end -- 평범한 luau에는 warn이 없다
-- Roblox 엔진 목업 (스모크 테스트용). PortScene/PortCultures 앞에 붙여서 쓴다.
local State = require("./mockstate")
local function proxy(name)
	local p = {}
	local mt = {}
	mt.__index = function(_, k)
		if k == "X" or k == "Y" or k == "Z" or k == "R" or k == "G" or k == "B" or k == "Magnitude" then return 10 end
		if k == "Name" or k == "ClassName" then return name end
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
local function colorOf(r, g, b) return { R = r or 0, G = g or 0, B = b or 0, Lerp = function(self) return self end } end
Color3 = { fromRGB = colorOf, new = colorOf, fromHSV = colorOf }
CFrame = setmetatable({ new = function() return proxy("CFrame") end, lookAt = function() return proxy("CFrame") end, Angles = function() return proxy("CFrame") end, identity = proxy("CFrame") }, {})
UDim2 = setmetatable({}, { __index = function() return function() return proxy("UDim2") end end })
UDim = UDim2
Enum = setmetatable({}, { __index = function(_, k) return setmetatable({}, { __index = function(_, n) return k .. "." .. n end }) end })
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
