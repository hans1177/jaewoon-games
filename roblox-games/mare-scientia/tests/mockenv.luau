--!nolint
-- Roblox 엔진 최소 모의 환경: PortScene 같은 3D 장면 코드를 엔진 없이 끝까지 돌려 런타임 오류를 잡는다.
local M = {}

-- Vector3 ---------------------------------------------------------------
local V = {}
V.__index = function(t, k)
	if k == "Magnitude" then return math.sqrt(t.X ^ 2 + t.Y ^ 2 + t.Z ^ 2) end
	if k == "Unit" then local m = math.sqrt(t.X ^ 2 + t.Y ^ 2 + t.Z ^ 2); if m == 0 then return t end return M.Vector3.new(t.X / m, t.Y / m, t.Z / m) end
	if k == "Dot" then return function(a, b) return a.X * b.X + a.Y * b.Y + a.Z * b.Z end end
	if k == "Cross" then return function(a, b) return M.Vector3.new(a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X) end end
	if k == "Lerp" then return function(a, b, f) return a + (b - a) * f end end
	return rawget(V, k)
end
local function vec(x, y, z) return setmetatable({ X = x, Y = y, Z = z }, V) end
V.__add = function(a, b) return vec(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
V.__sub = function(a, b) return vec(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
V.__unm = function(a) return vec(-a.X, -a.Y, -a.Z) end
V.__mul = function(a, b)
	if type(a) == "number" then return vec(a * b.X, a * b.Y, a * b.Z) end
	if type(b) == "number" then return vec(a.X * b, a.Y * b, a.Z * b) end
	return vec(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V.__div = function(a, b)
	if type(b) == "number" then return vec(a.X / b, a.Y / b, a.Z / b) end
	return vec(a.X / b.X, a.Y / b.Y, a.Z / b.Z)
end
V.__eq = function(a, b) return a.X == b.X and a.Y == b.Y and a.Z == b.Z end
M.Vector3 = { new = function(x, y, z) return vec(x or 0, y or 0, z or 0) end, zero = vec(0, 0, 0), one = vec(1, 1, 1), yAxis = vec(0, 1, 0), xAxis = vec(1, 0, 0), zAxis = vec(0, 0, 1) }

-- CFrame (회전은 무시하고 위치만 추적) ---------------------------------------
local CF = {}
CF.__index = function(t, k)
	if k == "Position" then return t.p end
	if k == "X" then return t.p.X end
	if k == "Y" then return t.p.Y end
	if k == "Z" then return t.p.Z end
	if k == "Inverse" then return function(a) return M.CFrame.new(-a.p) end end
	if k == "LookVector" or k == "RightVector" or k == "UpVector" then return vec(0, 0, -1) end
	if k == "ToWorldSpace" then return function(a, b) return M.CFrame.new(a.p + b.p) end end
	if k == "PointToObjectSpace" then return function(a, v) return v - a.p end end
	if k == "Lerp" then return function(a, b, f) return M.CFrame.new(a.p + (b.p - a.p) * f) end end
	if k == "GetComponents" then return function(a) return a.p.X, a.p.Y, a.p.Z, 1, 0, 0, 0, 1, 0, 0, 0, 1 end end
	return rawget(CF, k)
end
local function cf(p) return setmetatable({ p = p }, CF) end
CF.__mul = function(a, b)
	if getmetatable(b) == V then return a.p + b end
	return cf(a.p + b.p)
end
M.CFrame = {
	new = function(x, y, z)
		if type(x) == "table" then return cf(x) end
		return cf(vec(x or 0, y or 0, z or 0))
	end,
	Angles = function() return cf(vec(0, 0, 0)) end,
	fromEulerAnglesXYZ = function() return cf(vec(0, 0, 0)) end,
	fromEulerAnglesYXZ = function() return cf(vec(0, 0, 0)) end,
	fromOrientation = function() return cf(vec(0, 0, 0)) end,
	lookAt = function(a) return cf(a) end,
	identity = cf(vec(0, 0, 0)),
}

-- 값 타입 -----------------------------------------------------------------
local C3 = {}
C3.__index = function(t, k)
	if k == "Lerp" then return function(a, b, f) return M.Color3.new(a.R + (b.R - a.R) * f, a.G + (b.G - a.G) * f, a.B + (b.B - a.B) * f) end end
	return rawget(C3, k)
end
M.Color3 = {
	new = function(r, g, b) return setmetatable({ R = r or 0, G = g or 0, B = b or 0 }, C3) end,
	fromRGB = function(r, g, b) return setmetatable({ R = (r or 0) / 255, G = (g or 0) / 255, B = (b or 0) / 255 }, C3) end,
	fromHSV = function(h, s, v) return setmetatable({ R = v or 0, G = v or 0, B = v or 0 }, C3) end,
}
local function ctor(...) return { ... } end
local function bag() return setmetatable({}, { __index = function(_, _) return ctor end }) end
M.UDim = { new = function(s, o) return { Scale = s, Offset = o } end }
M.UDim2 = { new = function(a, b, c, d) return { X = { Scale = a, Offset = b }, Y = { Scale = c, Offset = d } } end, fromScale = function(a, b) return { X = { Scale = a, Offset = 0 }, Y = { Scale = b, Offset = 0 } } end, fromOffset = function(a, b) return { X = { Scale = 0, Offset = a }, Y = { Scale = 0, Offset = b } } end }
M.Vector2 = { new = function(x, y) return { X = x or 0, Y = y or 0 } end }
M.NumberRange = { new = ctor }
M.NumberSequence = { new = ctor }
M.ColorSequence = { new = ctor }
M.NumberSequenceKeypoint = { new = ctor }
M.ColorSequenceKeypoint = { new = ctor }
M.TweenInfo = { new = ctor }
M.Rect = { new = ctor }
M.Region3 = { new = ctor }
M.Ray = { new = ctor }
M.Font = { new = ctor, fromEnum = ctor }
M.Enum = setmetatable({}, { __index = function(_, k) return setmetatable({}, { __index = function(_, n) return k .. "." .. n end }) end })
M.Random = { new = function(seed)
	local s = (seed or 1) % 2147483647
	if s <= 0 then s += 2147483646 end
	local function nxt() s = (s * 48271) % 2147483647; return s / 2147483647 end
	return {
		NextNumber = function(_, a, b) local r = nxt(); if a then return a + r * ((b or 1) - a) end return r end,
		NextInteger = function(_, a, b) return a + math.floor(nxt() * (b - a + 1)) end,
	}
end }

-- Instance ------------------------------------------------------------------
local BASE = { Part = true, MeshPart = true, WedgePart = true, UnionOperation = true, SpawnLocation = true }
local EVENTS = { Triggered = true, Touched = true, Heartbeat = true, RenderStepped = true, Changed = true, ChildAdded = true, Activated = true, MouseButton1Click = true, InputBegan = true, InputEnded = true, Died = true, Destroying = true }
local signal = { Connect = function() return { Disconnect = function() end } end, Wait = function() end, Once = function() return { Disconnect = function() end } end }
local I = {}
local ids = 0
local function newInst(class)
	ids += 1
	local o = { ClassName = class, Name = class, _kids = {}, _attr = {}, _parent = false, _id = ids }
	if BASE[class] then o.Size = vec(1, 1, 1); o.CFrame = cf(vec(0, 0, 0)); o.Anchored = false; o.CanCollide = true end
	return setmetatable(o, I)
end
local function descendants(o, out)
	for _, k in o._kids do table.insert(out, k); descendants(k, out) end
	return out
end
local function allParts(o) local r = {} for _, d in descendants(o, {}) do if BASE[d.ClassName] then table.insert(r, d) end end return r end
local METHODS = {
	IsA = function(self, c) return self.ClassName == c or (c == "BasePart" and BASE[self.ClassName] == true) or (c == "PVInstance" and (BASE[self.ClassName] or self.ClassName == "Model")) or c == "Instance" end,
	FindFirstChild = function(self, n, rec)
		for _, k in (if rec then descendants(self, {}) else self._kids) do if k.Name == n then return k end end
		return nil
	end,
	WaitForChild = function(self, n) return self:FindFirstChild(n) end,
	FindFirstChildWhichIsA = function(self, c, rec)
		for _, k in (if rec then descendants(self, {}) else self._kids) do if k:IsA(c) then return k end end
		return nil
	end,
	FindFirstChildOfClass = function(self, c) for _, k in self._kids do if k.ClassName == c then return k end end return nil end,
	GetChildren = function(self) return table.clone(self._kids) end,
	GetDescendants = function(self) return descendants(self, {}) end,
	Clone = function(self)
		local c = newInst(self.ClassName)
		for k, v in self do
			if k ~= "_kids" and k ~= "_parent" and k ~= "_id" and k ~= "_attr" then rawset(c, k, v) end
		end
		for k, v in self._attr do c._attr[k] = v end
		for _, kid in self._kids do local kc = kid:Clone(); kc._parent = c; table.insert(c._kids, kc) end
		return c
	end,
	Destroy = function(self)
		local p = self._parent
		if p then local i = table.find(p._kids, self); if i then table.remove(p._kids, i) end end
		self._parent = false
	end,
	SetAttribute = function(self, k, v) self._attr[k] = v end,
	GetAttribute = function(self, k) return self._attr[k] end,
	GetBoundingBox = function(self)
		local parts = allParts(self)
		if #parts == 0 then return cf(vec(0, 0, 0)), vec(0, 0, 0) end
		local mn, mx
		for _, p in parts do
			local pp, s = p.CFrame.p, p.Size
			local lo, hi = vec(pp.X - s.X / 2, pp.Y - s.Y / 2, pp.Z - s.Z / 2), vec(pp.X + s.X / 2, pp.Y + s.Y / 2, pp.Z + s.Z / 2)
			if not mn then mn, mx = lo, hi else
				mn = vec(math.min(mn.X, lo.X), math.min(mn.Y, lo.Y), math.min(mn.Z, lo.Z))
				mx = vec(math.max(mx.X, hi.X), math.max(mx.Y, hi.Y), math.max(mx.Z, hi.Z))
			end
		end
		return cf((mn + mx) / 2), mx - mn
	end,
	GetPivot = function(self)
		local c = self:GetBoundingBox()
		return c
	end,
	PivotTo = function(self, target)
		local c = self:GetBoundingBox()
		local d = target.p - c.p
		for _, p in allParts(self) do p.CFrame = cf(p.CFrame.p + d) end
		if BASE[self.ClassName] then self.CFrame = target end
	end,
	ScaleTo = function(self, f)
		local c = self:GetBoundingBox()
		for _, p in allParts(self) do
			p.Size = p.Size * f
			p.CFrame = cf(c.p + (p.CFrame.p - c.p) * f)
		end
	end,
	MoveTo = function() end,
	SetPrimaryPartCFrame = function() end,
}
I.__index = function(t, k)
	local m = METHODS[k]
	if m then return m end
	if k == "Parent" then local p = rawget(t, "_parent"); return p or nil end
	if k == "Position" and BASE[t.ClassName] then return t.CFrame.p end
	if EVENTS[k] then return signal end
	if k == "PrimaryPart" then return allParts(t)[1] end
	return nil
end
I.__newindex = function(t, k, v)
	if k == "Parent" then
		local old = rawget(t, "_parent")
		if old then local i = table.find(old._kids, t); if i then table.remove(old._kids, i) end end
		rawset(t, "_parent", v or false)
		if v then table.insert(v._kids, t) end
		return
	end
	if k == "Position" and BASE[t.ClassName] then rawset(t, "CFrame", cf(v)); return end
	rawset(t, k, v)
end
M.Instance = { new = newInst }

-- 서비스·전역 ------------------------------------------------------------
local tree = {}
local function folder(name, parent) local f = newInst("Folder"); f.Name = name; if parent then f.Parent = parent end return f end
tree.ReplicatedStorage = folder("ReplicatedStorage")
tree.Lighting = folder("Lighting")
tree.Workspace = folder("Workspace")
local base = newInst("Part"); base.Name = "Baseplate"; base.Parent = tree.Workspace
local players = { LocalPlayer = { Character = nil }, CreateHumanoidModelFromDescriptionAsync = function() error("모의 환경: 사용 불가") end }
local services = { ReplicatedStorage = tree.ReplicatedStorage, Lighting = tree.Lighting, Workspace = tree.Workspace, Players = players,
	RunService = { Heartbeat = signal, RenderStepped = signal, BindToRenderStep = function() end, UnbindFromRenderStep = function() end, IsClient = function() return true end },
	TweenService = { Create = function() return { Play = function() end, Cancel = function() end, Completed = signal } end },
	Debris = { AddItem = function() end }, CollectionService = {}, UserInputService = {}, SoundService = {}, ContentProvider = {}, GuiService = {}, HttpService = {} }
M.game = { GetService = function(_, n) return services[n] or setmetatable({}, { __index = function() return function() end end }) end }
M.workspace = tree.Workspace
M.workspace.CurrentCamera = newInst("Camera")
M.tree = tree
M.task = { wait = function() return 0 end, spawn = function(f, ...) if type(f) == "function" then f(...) end end, defer = function() end, delay = function() end }
M.typeof = function(v) local mt = getmetatable(v) if mt == V then return "Vector3" elseif mt == CF then return "CFrame" elseif mt == C3 then return "Color3" elseif mt == I then return "Instance" end return type(v) end
M.warnings = {}
M.warn = function(...) table.insert(M.warnings, table.concat(table.pack(...), " ")) end

-- 승인된 에셋 라이브러리: AssetIds 항목마다 부품 하나짜리 Model 을 만든다 (MareAssets/<종류>/<이름>)
function M.populateAssets(ids)
	local lib = folder("MareAssets", tree.ReplicatedStorage)
	for key in ids do
		local kind, name = key:match("^([^/]+)/(.+)$")
		if kind then
			local g = lib:FindFirstChild(kind) or folder(kind, lib)
			local m = newInst("Model"); m.Name = name
			local p = newInst("MeshPart"); p.Size = vec(4, 4, 4); p.Parent = m
			m.Parent = g
		end
	end
end
return M
