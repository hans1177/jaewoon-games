--!nonstrict
-- [항구 상징물 조립 키트] 3D 원본이 등록되기 전, 블록(Part/WedgePart)으로 항구별 상징물을 짓는다.
-- kind 는 PortIdentity.landmark.kind. stage: "base"(공사 중, 비계) | "full"(완성).
-- 크기 기준: 바닥 약 36x36 스터드, 완성 높이 30~70 스터드. 충돌은 몸체만, 장식은 비충돌.
local K = {}

local C = Color3.fromRGB
local M = Enum.Material

local function mk(parent, cls, size, cf, color, mat, solid)
	local p = Instance.new(cls)
	p.Anchored = true
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = mat or M.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.CanCollide = solid ~= false
	p.CanTouch = false
	p.CastShadow = true
	p.Parent = parent
	return p
end
local function box(m, s, cf, c, mat, solid) return mk(m, "Part", s, cf, c, mat, solid) end
local function wedge(m, s, cf, c, mat) return mk(m, "WedgePart", s, cf, c, mat, false) end
local function cyl(m, d, h, cf, c, mat, solid)
	local p = mk(m, "Part", Vector3.new(h, d, d), cf * CFrame.Angles(0, 0, math.pi / 2), c, mat, solid)
	p.Shape = Enum.PartType.Cylinder
	return p
end
local function ball(m, d, cf, c, mat)
	local p = mk(m, "Part", Vector3.new(d, d, d), cf, c, mat, false)
	p.Shape = Enum.PartType.Ball
	return p
end
-- 박공 지붕(두 쐐기)
local function gable(m, w, d, h, cf, c, mat)
	wedge(m, Vector3.new(d, h, w / 2), cf * CFrame.new(-w / 4, h / 2, 0) * CFrame.Angles(0, math.pi / 2, 0), c, mat)
	wedge(m, Vector3.new(d, h, w / 2), cf * CFrame.new(w / 4, h / 2, 0) * CFrame.Angles(0, -math.pi / 2, 0), c, mat)
end
-- 피라미드 첨탑(4쐐기 근사)
local function spire(m, w, h, cf, c, mat)
	for i = 0, 3 do
		wedge(m, Vector3.new(w, h, w / 2), cf * CFrame.Angles(0, i * math.pi / 2, 0) * CFrame.new(0, h / 2, w / 4), c, mat)
	end
end
local function windows(m, w, h, floors, cf, wall)
	local glass = C(52, 60, 72)
	for f = 1, floors do
		for i = -1, 1 do
			box(m, Vector3.new(1.6, 2.6, 0.3), cf * CFrame.new(i * w / 3.2, f * h / (floors + 1), -0.2), glass, M.Glass, false)
		end
	end
	_ = wall
end

local PAL = {
	stone = { wall = C(196, 188, 170), trim = C(150, 142, 128), roof = C(92, 96, 104) },
	brick = { wall = C(150, 74, 56), trim = C(214, 204, 186), roof = C(72, 60, 56) },
	stucco = { wall = C(232, 206, 168), trim = C(246, 240, 228), roof = C(184, 96, 64) },
	coral = { wall = C(240, 236, 226), trim = C(196, 170, 130), roof = C(220, 214, 200) },
	wood = { wall = C(150, 56, 44), trim = C(240, 236, 226), roof = C(70, 62, 58) },
	plaster = { wall = C(236, 228, 212), trim = C(120, 86, 60), roof = C(66, 70, 78) },
	timber = { wall = C(230, 220, 196), trim = C(92, 64, 44), roof = C(84, 84, 92) },
}

-- 비계(공사 중): 기둥·발판 격자
local function scaffold(m, w, h, cf)
	local wood = C(150, 112, 74)
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			box(m, Vector3.new(0.6, h, 0.6), cf * CFrame.new(sx * (w / 2 + 1.5), h / 2, sz * (w / 2 + 1.5)), wood, M.Wood, false)
		end
	end
	for y = 6, h, 6 do
		for _, sz in { -1, 1 } do
			box(m, Vector3.new(w + 4, 0.4, 2), cf * CFrame.new(0, y, sz * (w / 2 + 1.5)), wood, M.WoodPlanks, false)
		end
	end
	-- 바닥 석재 더미
	for i = 1, 4 do
		box(m, Vector3.new(3, 2, 2), cf * CFrame.new(-w / 2 - 6 + i * 3.2, 1, w / 2 + 6), C(186, 178, 160), M.Slate, false)
	end
end

local BUILD = {}

-- 원형/사각 탑(벨렝·천문탑·종탑 공용 몸체)
local function tower(m, cf, pal, w, h, round)
	if round then
		cyl(m, w, h, cf * CFrame.new(0, h / 2, 0), pal.wall, M.Brick)
	else
		box(m, Vector3.new(w, h, w), cf * CFrame.new(0, h / 2, 0), pal.wall, M.Limestone)
	end
	for y = 8, h - 4, 10 do
		box(m, Vector3.new(w + 0.6, 0.8, w + 0.6), cf * CFrame.new(0, y, 0), pal.trim, M.Limestone, false)
	end
	windows(m, w, h, math.floor(h / 10), cf * CFrame.new(0, 0, -w / 2), pal.wall)
end

BUILD.tower = function(m, cf, pal, full)
	local h = if full then 40 else 20
	tower(m, cf, pal, 12, h, false)
	if full then
		-- 망루 총안
		for i = -1, 1, 2 do
			for j = -1, 1, 2 do
				box(m, Vector3.new(2, 2.4, 2), cf * CFrame.new(i * 5, h + 1.2, j * 5), pal.trim, M.Limestone, false)
			end
		end
		box(m, Vector3.new(14, 1, 14), cf * CFrame.new(0, h + 0.5, 0), pal.trim, M.Limestone)
		box(m, Vector3.new(22, 8, 16), cf * CFrame.new(0, 4, 12), pal.wall, M.Limestone) -- 앞 보루
	end
end

BUILD.campanile = function(m, cf, pal, full)
	local h = if full then 52 else 24
	tower(m, cf, pal, 10, h, false)
	if full then
		-- 종실 아치(열린 기둥 4)
		for i = -1, 1, 2 do
			for j = -1, 1, 2 do
				box(m, Vector3.new(1.4, 6, 1.4), cf * CFrame.new(i * 4.3, h + 3, j * 4.3), pal.trim, M.Limestone)
			end
		end
		box(m, Vector3.new(11, 1, 11), cf * CFrame.new(0, h + 6.5, 0), pal.trim, M.Limestone)
		spire(m, 10, 12, cf * CFrame.new(0, h + 7, 0), C(70, 120, 96), M.Metal)
	end
end

BUILD.spire = function(m, cf, pal, full)
	-- 고딕 성당: 본당 + 첨탑 + 버팀벽
	box(m, Vector3.new(16, 18, 30), cf * CFrame.new(0, 9, 4), pal.wall, M.Limestone)
	gable(m, 16, 30, 8, cf * CFrame.new(0, 18, 4), pal.roof, M.Slate)
	local h = if full then 46 else 22
	box(m, Vector3.new(9, h, 9), cf * CFrame.new(0, h / 2, -13), pal.wall, M.Limestone)
	if full then
		spire(m, 9, 22, cf * CFrame.new(0, h, -13), pal.roof, M.Slate)
		for i = -1, 1, 2 do
			for z = -6, 14, 10 do
				wedge(m, Vector3.new(1.4, 12, 5), cf * CFrame.new(i * 10, 6, z + 4) * CFrame.Angles(0, if i > 0 then -math.pi / 2 else math.pi / 2, 0), pal.trim, M.Limestone)
			end
		end
		cyl(m, 5, 0.4, cf * CFrame.new(0, 13, -17.6) * CFrame.Angles(0, math.pi / 2, 0), C(120, 40, 60), M.Glass, false) -- 장미창
	end
end

BUILD.dome = function(m, cf, pal, full)
	-- 대모스크: 사각 기단 + 중앙 돔 + 반돔 + 첨탑 4
	box(m, Vector3.new(26, 12, 26), cf * CFrame.new(0, 6, 0), pal.wall, M.Limestone)
	if full then
		ball(m, 20, cf * CFrame.new(0, 14, 0), C(120, 128, 136), M.Metal)
		cyl(m, 21, 3, cf * CFrame.new(0, 13, 0) * CFrame.Angles(0, 0, math.pi / 2), pal.trim, M.Limestone)
		for i = -1, 1, 2 do
			ball(m, 11, cf * CFrame.new(i * 10, 11, 0), C(120, 128, 136), M.Metal)
		end
		for i = -1, 1, 2 do
			for j = -1, 1, 2 do
				local at = cf * CFrame.new(i * 15, 0, j * 15)
				cyl(m, 2.2, 34, at * CFrame.new(0, 17, 0) * CFrame.Angles(0, 0, math.pi / 2), pal.trim, M.Limestone)
				box(m, Vector3.new(3.4, 0.8, 3.4), at * CFrame.new(0, 26, 0), pal.trim, M.Limestone, false)
				spire(m, 2.4, 6, at * CFrame.new(0, 34, 0), C(120, 128, 136), M.Metal)
			end
		end
	else
		ball(m, 12, cf * CFrame.new(0, 12, 0), C(150, 150, 150), M.Concrete)
	end
end

BUILD.fort = function(m, cf, pal, full)
	-- 별모양 요새 근사: 사각 성벽 + 모서리 능보(45도) + 중앙 탑
	local wh = if full then 9 else 5
	for i = 0, 3 do
		local r = cf * CFrame.Angles(0, i * math.pi / 2, 0)
		box(m, Vector3.new(30, wh, 2.4), r * CFrame.new(0, wh / 2, 15), pal.wall, M.Slate)
		box(m, Vector3.new(8, wh + 1, 8), r * CFrame.new(15, (wh + 1) / 2, 15) * CFrame.Angles(0, math.pi / 4, 0), pal.wall, M.Slate)
	end
	if full then
		box(m, Vector3.new(8, 18, 8), cf * CFrame.new(0, 9, 0), pal.trim, M.Slate)
		spire(m, 8, 6, cf * CFrame.new(0, 18, 0), pal.roof, M.Slate)
		for i = -1, 1, 2 do
			cyl(m, 1, 4, cf * CFrame.new(i * 6, wh + 0.6, -15.8) * CFrame.Angles(0, math.pi / 2, 0), C(40, 40, 44), M.Metal, false) -- 포
		end
		box(m, Vector3.new(0.3, 6, 0.3), cf * CFrame.new(0, 21, 0), C(90, 70, 50), M.Wood, false)
	end
end

BUILD.bridge = function(m, cf, pal, full)
	-- 상점 다리: 아치 교각 + 위 상점 줄
	box(m, Vector3.new(40, 2, 10), cf * CFrame.new(0, 6, 0), pal.trim, M.Cobblestone)
	for x = -15, 15, 10 do
		box(m, Vector3.new(3, 6, 10), cf * CFrame.new(x, 3, 0), pal.trim, M.Cobblestone)
	end
	if full then
		for x = -16, 16, 8 do
			box(m, Vector3.new(7, 8, 4), cf * CFrame.new(x, 11, 3), pal.wall, M.Brick)
			gable(m, 7, 4, 3, cf * CFrame.new(x, 15, 3), pal.roof, M.Slate)
		end
	end
end

BUILD.canal_gate = function(m, cf, pal, full)
	-- 수문 + 계량소(계단 박공)
	box(m, Vector3.new(4, 8, 14), cf * CFrame.new(-8, 4, 0), pal.trim, M.Brick)
	box(m, Vector3.new(4, 8, 14), cf * CFrame.new(8, 4, 0), pal.trim, M.Brick)
	box(m, Vector3.new(12, 6, 1), cf * CFrame.new(0, 3, 0), C(96, 72, 50), M.WoodPlanks)
	if full then
		box(m, Vector3.new(14, 14, 12), cf * CFrame.new(0, 7, 16), pal.wall, M.Brick)
		for s = 0, 3 do
			box(m, Vector3.new(14 - s * 3.4, 2.2, 1), cf * CFrame.new(0, 15 + s * 2.2, 10), pal.wall, M.Brick)
		end
		gable(m, 14, 12, 7, cf * CFrame.new(0, 14, 16), pal.roof, M.Slate)
		windows(m, 14, 14, 2, cf * CFrame.new(0, 0, 9.8), pal.wall)
	end
end

BUILD.gopuram = function(m, cf, pal, full)
	-- 케랄라 사원 문: 층층 경사 지붕
	box(m, Vector3.new(18, 9, 12), cf * CFrame.new(0, 4.5, 0), pal.wall, M.Plaster)
	local layers = if full then 3 else 1
	for i = 1, layers do
		local w = 22 - i * 4
		gable(m, w, 14 - i * 2, 4, cf * CFrame.new(0, 9 + (i - 1) * 5, 0), C(150, 72, 50), M.Brick)
	end
	box(m, Vector3.new(6, 7, 1), cf * CFrame.new(0, 3.5, -6.2), C(80, 50, 30), M.Wood, false)
end

BUILD.island_post = function(m, cf, pal, full)
	-- 데지마: 부채꼴 섬(판석) + 창고 줄 + 다리
	for i = -2, 2 do
		box(m, Vector3.new(8, 1.2, 18), cf * CFrame.new(i * 7, 0.6, 0) * CFrame.Angles(0, i * 0.12, 0), C(170, 162, 148), M.Slate)
	end
	if full then
		for i = -2, 2 do
			box(m, Vector3.new(6, 6, 7), cf * CFrame.new(i * 7, 4.2, 3) * CFrame.Angles(0, i * 0.12, 0), C(240, 236, 226), M.Plaster)
			gable(m, 6.6, 7.6, 2.6, cf * CFrame.new(i * 7, 7.2, 3) * CFrame.Angles(0, i * 0.12, 0), C(60, 64, 72), M.Slate)
		end
		box(m, Vector3.new(3, 0.6, 12), cf * CFrame.new(0, 1, -14), C(150, 120, 90), M.WoodPlanks)
		box(m, Vector3.new(0.3, 10, 0.3), cf * CFrame.new(10, 6, -4), C(90, 70, 50), M.Wood, false)
	end
end

BUILD.trade_row = function(m, cf, pal, full)
	-- 십삼행: 서양식 상관 줄 + 깃대
	local n = if full then 5 else 2
	for i = 1, n do
		local x = (i - (n + 1) / 2) * 8
		box(m, Vector3.new(7, 10, 10), cf * CFrame.new(x, 5, 0), if i % 2 == 0 then pal.wall else C(226, 220, 204), M.Plaster)
		box(m, Vector3.new(7, 1, 2), cf * CFrame.new(x, 4, -5.5), pal.trim, M.Wood, false) -- 베란다
		if full then box(m, Vector3.new(0.3, 9, 0.3), cf * CFrame.new(x, 14.5, -3), C(90, 70, 50), M.Wood, false) end
	end
end

BUILD.palace = function(m, cf, pal, full)
	-- 산호석 궁전: 평지붕 2~3층 + 베란다 기둥
	local floors = if full then 3 else 1
	box(m, Vector3.new(24, floors * 6, 14), cf * CFrame.new(0, floors * 3, 0), pal.wall, M.Limestone)
	if full then
		for x = -10, 10, 4 do
			box(m, Vector3.new(0.8, 12, 0.8), cf * CFrame.new(x, 6, -8), pal.trim, M.Wood)
		end
		box(m, Vector3.new(24, 0.6, 3), cf * CFrame.new(0, 12, -8), pal.trim, M.WoodPlanks, false)
		box(m, Vector3.new(4, 6, 0.6), cf * CFrame.new(0, 3, -7.3), C(110, 70, 40), M.Wood, false) -- 조각문
	end
	windows(m, 24, floors * 6, floors, cf * CFrame.new(0, 0, -7.1), pal.wall)
end

K.KINDS = { "tower", "campanile", "spire", "dome", "fort", "bridge", "canal_gate", "gopuram", "island_post", "trade_row", "palace" }

-- 상징물 모델을 만든다. cf: 바닥 중심(앞=-Z). wall: PortIdentity.wall
function K.build(parent: Instance, kind: string, stage: string, cf: CFrame, wall: string?, name: string?): Model?
	local fn = BUILD[kind]
	if not fn then
		return nil
	end
	local m = Instance.new("Model")
	m.Name = "PortLandmark_" .. kind
	local pal = PAL[wall or "stone"] or PAL.stone
	local full = stage == "full"
	fn(m, cf, pal, full)
	if not full then
		scaffold(m, 24, 22, cf)
	end
	m:SetAttribute("PortLandmarkKind", kind)
	m:SetAttribute("PortLandmarkStage", stage)
	if name then
		m:SetAttribute("PortLandmarkName", name)
	end
	m.Parent = parent
	return m
end

return K
