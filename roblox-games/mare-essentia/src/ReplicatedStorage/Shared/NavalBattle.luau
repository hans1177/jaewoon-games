--!nonstrict
-- 파일명: NavalBattle.luau
-- 해전 연출 (클라이언트 전용). 서버가 자동 해전을 계산한 뒤 돌려준 전투 기록(log)을
-- 두 배의 포격·접현 장면으로 다시 보여 준다. 결과는 서버가 이미 정했고, 이 장면은 보기용이다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local Pose = require(script.Parent:WaitForChild("Pose"))
local Sfx = require(script.Parent:WaitForChild("Sfx"))

local NavalBattle = {}

local ORIGIN = Vector3.new(6000, 0, 0)

-- 해상전투에서 사용하는 기존 등록 도감 이미지
local CARD_SEA = "CardArt/event_calm_seas"

-- 파일명: NavalBattle.luau / 해전 카드 원화 목록
-- 백과사전 화풍: 기존 등록 도판을 배경으로 사용하고, 역할과 맞는 승인된 모델·동작만 입힌다.
-- 묘사 대상이 없는 경우 임의 동물/문화권 복식/무기를 생성하지 않고 해당 해역 지도 도판을 쓴다.
-- 이 목록은 BoardingCards.luau 병종·특수 카드의 실제 id를 정확히 따라간다.
local CARD_STAGE = {
	swordsman = { art="CardArt/event_chart_north_sea", prop={"Naval","ship-pirate-small"}, motion="board", scene="소형 공격선 접현" },
	axeman = { art="CardArt/event_chart_west_europe", prop={"Naval","ship-pirate-medium"}, motion="board", scene="중형 공격선 돌격" },
	pikeman = { art="CardArt/event_chart_north_sea", prop={"Naval","ship-small"}, motion="board", scene="소형 범선 선수 돌진" },
	shieldman = { art="CardArt/event_chart_west_europe", prop={"Naval","ship-large"}, motion="guard", scene="대형 함선 방어" },
	boatswain = { art="CardArt/event_chart_world", prop={"Relics","rope-bundle-a"}, motion="command", scene="갑판장의 명령" },
	surgeon = { art="CardArt/event_chart_world", prop={"Cargo","mortar-pestle"}, motion="heal", scene="전장 치료소" },
	musketeer = { art="CardArt/event_chart_north_sea", prop={"Naval","ship-medium"}, motion="fire", scene="함포 엄호선" },
	sharpshooter = { art="CardArt/event_chart_mediterranean", prop={"Naval","ship-pirate-small"}, motion="aim", scene="소형선 정밀 사격" },
	scout = { art="CardArt/event_chart_world", prop={"Naval","boat-sail-a"}, motion="scout", scene="항로 정찰선" },
	gunner = { art="CardArt/event_chart_west_europe", prop={"Naval","cannon"}, motion="fire", scene="함포 발사" },
	swivel = { art="CardArt/event_chart_west_europe", prop={"Naval","cannon-mobile"}, motion="fire", scene="선회포 사격" },
	culverin = { art="CardArt/event_chart_west_europe", prop={"Naval","cannon"}, motion="fire", scene="장거리 함포" },
	hero_blade = { art="CardArt/event_chart_mediterranean", prop={"Naval","ship-pirate-large"}, motion="board", scene="기함 접현 작전" },
	hero_marksman = { art="CardArt/event_chart_north_sea", prop={"Naval","ship-large"}, motion="aim", scene="기함 사격 지휘" },
	hero_cannon = { art="CardArt/event_chart_west_europe", prop={"Naval","ship-large"}, motion="fire", scene="대형 함선 일제포격" },
	hero_spy = { art="CardArt/event_chart_caribbean", prop={"Naval","ship-pirate-small"}, motion="scout", scene="정찰선 비밀 항로" },
	hero_medic = { art="CardArt/event_chart_world", prop={"Cargo","mortar-pestle"}, motion="heal", scene="전장의 명의" },
	hero_captain = { art="CardArt/event_chart_world", prop={"Naval","ship-large"}, motion="command", scene="기함의 선장" },
	ironclad = { art="CardArt/event_chart_west_europe", prop={"Relics","shield-rectangle"}, motion="guard", scene="철갑 방어" },
	sniper = { art="CardArt/event_chart_west_europe", prop={"Naval","ship-small"}, motion="aim", scene="소형선 조준 사격" },
	-- 직접 제작한 고유 도판 5종. 3D 임의 모델 대신 원화 중심의 행동 장면으로 구분한다.
	-- Open Cloud 원화 등록 ID가 AssetIds에 있을 때만 전용 삽화를 사용한다.
	beast = { art="CardArt/event_uluru", newArt="CardArt/event_unit_beast", motion="pounce", scene="파도 헤치며 도약하는 호랑이" },
	-- 문화권별 실제 역할과 장비를 보존하고, 미확인 복식/3D 모델을 임의 대체하지 않는다.
	samurai = { art="CardArt/event_chart_east_asia", prop={"Relics","weapon-sword"}, motion="slash", scene="동아시아 검술" },
	firelance = { art="CardArt/event_chart_east_asia", newArt="CardArt/event_unit_firelance", motion="fire", scene="화창병의 화염 분출" },
	jaguar = { art="CardArt/event_chart_south_america", newArt="CardArt/event_unit_jaguar", motion="pounce", scene="흑요석 검의 재규어 전사" },
	janissary = { art="CardArt/event_chart_mediterranean", newArt="CardArt/event_unit_janissary", motion="aim", scene="오스만 예니체리의 일제 사격" },
	camel = { art="CardArt/event_chart_indian_ocean", newArt="CardArt/event_unit_camel", motion="gallop", scene="모래바람을 가르는 낙타 기병" },
	raider = { art="CardArt/event_chart_north_sea", prop={"Naval","ship-pirate-small"}, motion="board", scene="해상 습격대" },
	-- 특수 카드는 실제 규칙(날씨·소각·순풍·군기·회군)과 같은 사건으로 표현한다.
	scorch = { art="CardArt/event_harbor_fire", prop={"Naval","ship-wreck"}, motion="fire", scene="화염에 휩싸인 갑판" },
	fog = { art="CardArt/event_calm_seas", prop={"Naval","ship-small"}, motion="fog", scene="짙은 해무" },
	storm = { art="CardArt/event_storm", prop={"Naval","ship-pirate-medium"}, motion="storm", scene="거친 폭풍우" },
	melee_fog = { art="CardArt/event_hurricane", prop={"Naval","ship-pirate-small"}, motion="storm", scene="혼전과 시계 불량" },
	clear = { art="CardArt/event_calm_seas", prop={"Naval","boat-sail-a"}, motion="clear", scene="구름 걷힌 바다" },
	wind = { art="CardArt/event_calm_seas", prop={"Naval","boat-sail-b"}, motion="wind", scene="순풍을 받는 돛" },
	horn = { art="CardArt/event_royal_charter", prop={"Naval","flag-high"}, motion="command", scene="선단 군기 신호" },
	decoy = { art="CardArt/event_chart_north_sea", prop={"Naval","ship-pirate-small"}, motion="retreat", scene="후미에서 회군" },
}

-- [지역별 오브젝트 도판] 등록·승인된 개별 카드 그림을 우선하고, 없는 카드는 기존 도판을 보존한다.
local function cardArtworkKey(card)
	if type(card.id) == "string" then
		local individualArt = "CardArt/" .. card.id
		if AssetIds[individualArt] then return individualArt end
	end
	local spec = CARD_STAGE[card.id] or card.stage
	if not spec then return CARD_SEA end
	if spec.newArt and AssetIds[spec.newArt] then return spec.newArt end
	return spec.art or CARD_SEA
end

-- [카드 덱 표시] 기존 5개 지역 카드 ID만 읽어 테두리와 분류 표식을 구분한다.
local CARD_DECK = {
	eu = { ko = "유럽", en = "Europe", color = Color3.fromRGB(214, 174, 106) },
	ea = { ko = "동아시아", en = "East Asia", color = Color3.fromRGB(94, 192, 167) },
	me = { ko = "중동", en = "Middle East", color = Color3.fromRGB(220, 165, 101) },
	nw = { ko = "신대륙", en = "New World", color = Color3.fromRGB(104, 173, 216) },
	af = { ko = "아프리카", en = "Africa", color = Color3.fromRGB(204, 128, 94) },
}

local PLAYER_SHIP = {
	caravel = "ship-small", fluyt = "ship-medium", frigate = "ship-large", galleon = "ship-pirate-large",
	paddle_steamer = "ship-medium", ironclad_frigate = "ship-large",
}
-- 대포 종류: 사거리·탄속(비행시간)·포물선 높이·탄 크기가 다르다
local NC = {
	swivel = { name = "선회포", range = 62, dur = 0.34, arc = 5, ball = 1.0, cd = 0.8 },
	demi = { name = "중포", range = 95, dur = 0.5, arc = 14, ball = 1.5, cd = 1.15 },
	culverin = { name = "장포", range = 135, dur = 0.8, arc = 24, ball = 1.7, cd = 1.5 },
	mortar = { name = "구포", range = 85, dur = 1.0, arc = 42, ball = 2.2, cd = 2.0 },
}
local SHIP_CANNON = { caravel = "swivel", fluyt = "swivel", galley = "demi", xebec = "demi", frigate = "culverin", galleon = "mortar" }
-- 지역·나라 전용 배는 기본 배의 모델을 빌려 쓴다 (Ships.visual)
do
	local ShipsMod = require(script.Parent:WaitForChild("Ships"))
	for id, def in ShipsMod.Ships do
		if def.visual and not PLAYER_SHIP[id] then
			PLAYER_SHIP[id] = PLAYER_SHIP[def.visual]
		end
	end
end

local function part(parent, size, cf, color, material, shape)
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	if shape then
		p.Shape = shape
	end
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

local function placeShip(parent, asset, at, length, yaw, tint)
	local lib = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = lib and lib:FindFirstChild("Naval")
	local tpl = group and group:FindFirstChild(asset)
	if tpl and tpl:IsA("Model") then
		local m = tpl:Clone()
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
				d.CanCollide = false
				d.CanQuery = false
				if tint and d:IsA("MeshPart") then
					d.Color = tint
				end
			end
		end
		m.Parent = parent
		local ok = pcall(function()
			local _, ext = m:GetBoundingBox()
			local axis = math.max(ext.X, ext.Z)
			m:ScaleTo(length / math.max(axis, 0.01))
			local _, size = m:GetBoundingBox()
			-- 긴 쪽이 X축(옆면이 카메라를 향함)이 되도록 맞춘다
			if size.Z > size.X then
				m:PivotTo(CFrame.Angles(0, math.pi / 2, 0) * m:GetPivot())
			end
			m:PivotTo(CFrame.Angles(0, yaw, 0) * m:GetPivot())
			local center, sz = m:GetBoundingBox()
			local bottom = Vector3.new(center.Position.X, center.Position.Y - sz.Y / 2, center.Position.Z)
			m:PivotTo(CFrame.new(at - bottom) * m:GetPivot())
		end)
		if ok then
			return m
		end
		m:Destroy()
	end
	-- 모델이 없으면 간단한 도형 배
	local m = Instance.new("Model")
	part(m, Vector3.new(length, 4, 9), CFrame.new(at + Vector3.new(0, 2, 0)), Color3.fromRGB(110, 70, 40), Enum.Material.Wood)
	part(m, Vector3.new(1, 22, 1), CFrame.new(at + Vector3.new(0, 14, 0)), Color3.fromRGB(90, 64, 40), Enum.Material.Wood)
	part(m, Vector3.new(0.4, 14, 14), CFrame.new(at + Vector3.new(0, 15, 0)), Color3.fromRGB(240, 236, 226), Enum.Material.Fabric)
	m.Parent = parent
	return m
end

local function label(parent, text, size, color, bold)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Text = text
	l.TextSize = size
	l.Font = if bold == false then Enum.Font.Gotham else Enum.Font.GothamBold
	l.TextColor3 = color or Color3.fromRGB(250, 236, 200)
	l.TextStrokeTransparency = 0.45
	l.Parent = parent
	return l
end

-- 전투 기록을 장면 단위 사건으로 풀어 낸다
local function parseLog(log)
	local events = {}
	for _, line in log do
		local round, who, text = string.match(line, "^%[(%d+)%] (.-): (.+)$")
		if who then
			local hull = tonumber(string.match(text, "선체 %-(%d+)"))
			local crew = tonumber(string.match(text, "선원 %-(%d+)"))
			local melee = string.find(text, "적 선원", 1, true) ~= nil
			table.insert(events, { kind = if melee then "melee" else "fire", player = who == "우리 배", hull = hull or 0, crew = crew or 0, text = line })
		elseif string.find(line, "접현", 1, true) then
			table.insert(events, { kind = "board", text = line })
		elseif string.find(line, "항복", 1, true) or string.find(line, "이탈", 1, true) then
			table.insert(events, { kind = "note", text = line })
		else
			table.insert(events, { kind = "note", text = line })
		end
	end
	return events
end

-- opts: { shipId, enemyName, log, winner, reason, isBoss, onDone }
-- 직접 조종하는 해전: 왼쪽·오른쪽으로 배를 돌리고 가속하면, 사정거리 안에서 대포가 자동으로 나간다.
-- 맞는 순서와 피해량은 서버가 계산한 전투 기록을 따르므로 결과는 서버 판정과 같다.
function NavalBattle.play(opts)
	local player = Players.LocalPlayer
	local old = workspace:FindFirstChild("BattleScene")
	if old then
		old:Destroy()
	end
	local folder = Instance.new("Folder")
	folder.Name = "BattleScene"
	folder.Parent = workspace

	-- 해전 전용 파도·바람·폭풍 환경음. 포격을 가리지 않도록 배경 음량을 낮춘다.
	local weather = string.lower(tostring(opts.weatherName or ""))
	local roughSeas = string.find(weather, "폭풍", 1, true) ~= nil
		or string.find(weather, "태풍", 1, true) ~= nil
		or string.find(weather, "폭우", 1, true) ~= nil
		or string.find(weather, "storm", 1, true) ~= nil
		or string.find(weather, "squall", 1, true) ~= nil
	Sfx.ambient(if roughSeas then { "sfx_ambience_storm", "sfx_waves" } else { "sfx_waves", "sfx_wind" }, 0.55)

	local sea = part(folder, Vector3.new(1200, 2, 1200), CFrame.new(ORIGIN + Vector3.new(0, -1, 0)), Color3.fromRGB(34, 112, 156), Enum.Material.Glass)
	sea.Transparency = 0.15
	sea.Reflectance = 0.08
	if opts.cardOnly then
		-- 주점 카드 대결: 바다가 아니라 나무 탁자 위에서 한다 (배는 숨기고 그 자리에 탁자 판을 깐다)
		sea.Material = Enum.Material.Wood
		sea.Color = Color3.fromRGB(58, 40, 26)
		sea.Transparency = 0
		sea.Reflectance = 0
	end

	-- 배들: 위치, 방향(θ), 속도를 우리가 직접 움직인다
	local function newShip(asset, length, pos, theta, tint)
		local m = placeShip(folder, asset, ORIGIN + pos, length, 0, tint)
		local base = m:GetPivot()
		local rot = base - base.Position
		return { model = m, pos = pos, theta = theta, speed = 0, rot = rot, y = base.Position.Y - ORIGIN.Y, length = length }
	end
	local shipDef = require(script.Parent:WaitForChild("Ships")).Ships[opts.shipId or ""]
	local myLen = if shipDef then math.clamp(26 + shipDef.hull * 0.1, 30, 52) else 40
	local myTop = if shipDef then 12 + shipDef.speed * 1.2 else 19
	local cannon = NC[SHIP_CANNON[opts.shipId or ""] or "demi"]
	local me = newShip(PLAYER_SHIP[opts.shipId] or "ship-medium", myLen, Vector3.new(-45, 0, 30), 0)
	local foe = newShip(if opts.isBoss then "ship-pirate-large" else "ship-pirate-medium", if opts.isBoss then 54 else 40, Vector3.new(45, 0, -30), math.pi)
	-- 해적 호위선: 연출용 (싸움 결과에는 영향 없음)
	local escorts = {}
	local escortCount = if opts.isBoss then 0 else 2
	for i = 1, escortCount do
		local e = newShip("ship-pirate-small", 28, Vector3.new(80 + i * 40, 0, -70 + i * 80), math.pi + (i - 1.5) * 0.4)
		e.speed = 5
		table.insert(escorts, e)
	end

	-- 아군 함대: 기함 뒤에서 대형을 짜고 따라오며 함께 포격한다 (연출용, 결과는 서버가 정한 대로)
	local allies = {}
	do
		local ShipsMod = require(script.Parent:WaitForChild("Ships")).Ships
		for i, id in (opts.fleetIds or {}) do
			if i > 4 then
				break
			end
			local fd = ShipsMod[id]
			if fd then
				local len = math.clamp(24 + fd.hull * 0.08, 26, 44)
				local side = if i % 2 == 1 then 1 else -1
				local al = newShip(PLAYER_SHIP[id] or "ship-small", len, me.pos + Vector3.new(-26 * math.ceil(i / 2), 0, 22 * side * math.ceil(i / 2)), 0)
				al.nc = NC[SHIP_CANNON[id] or "demi"]
				al.slot = Vector3.new(-30 * math.ceil(i / 2), 0, 24 * side * math.ceil(i / 2))
				al.topSpeed = 12 + fd.speed * 1.2
				al.nextFire = os.clock() + 2 + i * 0.6
				table.insert(allies, al)
			end
		end
	end

	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = 62

	local gui = Instance.new("ScreenGui")
	gui.Name = "BattleGui"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 30
	gui.Parent = player:WaitForChild("PlayerGui")

	local function bar(side, name)
		local back = Instance.new("Frame")
		back.AnchorPoint = Vector2.new(if side == "L" then 0 else 1, 0)
		back.Position = UDim2.new(if side == "L" then 0 else 1, if side == "L" then 16 else -16, 0, 62)
		back.Size = UDim2.fromOffset(230, 16)
		back.BackgroundColor3 = Color3.fromRGB(26, 34, 40)
		back.BorderSizePixel = 0
		back.Parent = gui
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = back
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 1.5
		st.Parent = back
		local fill = Instance.new("Frame")
		fill.Size = UDim2.fromScale(1, 1)
		fill.BackgroundColor3 = if side == "L" then Color3.fromRGB(91, 181, 120) else Color3.fromRGB(214, 82, 76)
		fill.BorderSizePixel = 0
		fill.Parent = back
		local c2 = Instance.new("UICorner")
		c2.CornerRadius = UDim.new(0, 8)
		c2.Parent = fill
		local nm = label(gui, name, 14)
		nm.AnchorPoint = Vector2.new(if side == "L" then 0 else 1, 0)
		nm.Position = UDim2.new(if side == "L" then 0 else 1, if side == "L" then 16 else -16, 0, 40)
		nm.Size = UDim2.fromOffset(230, 20)
		nm.TextXAlignment = if side == "L" then Enum.TextXAlignment.Left else Enum.TextXAlignment.Right
		return fill
	end
	local meFill = bar("L", "우리 배")
	local foeFill = bar("R", opts.enemyName or "해적선")

	-- 선단 카드: 대항해시대 온라인처럼 우리 배와 적 배를 카드로 늘어놓고, 배마다 선체 막대를 보여 준다
	local function cardRow(anchorX, posX, posY, color)
		local row = Instance.new("Frame")
		row.AnchorPoint = Vector2.new(anchorX, 0)
		row.Position = UDim2.new(posX, 0, 0, posY)
		row.Size = UDim2.fromOffset(0, 46)
		row.AutomaticSize = Enum.AutomaticSize.X
		row.BackgroundTransparency = 1
		row.Parent = gui
		local l = Instance.new("UIListLayout")
		l.FillDirection = Enum.FillDirection.Horizontal
		l.Padding = UDim.new(0, 6)
		l.HorizontalAlignment = if anchorX == 1 then Enum.HorizontalAlignment.Right else Enum.HorizontalAlignment.Left
		l.Parent = row
		return row
	end
	local function card(row, name, color, star)
		local f = Instance.new("Frame")
		f.Size = UDim2.fromOffset(if star then 96 else 82, 46)
		f.BackgroundColor3 = Color3.fromRGB(26, 34, 40)
		f.BackgroundTransparency = 0.15
		f.BorderSizePixel = 0
		f.Parent = row
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = f
		local st = Instance.new("UIStroke")
		st.Color = if star then Color3.fromRGB(240, 205, 120) else Color3.fromRGB(110, 120, 140)
		st.Thickness = if star then 2 else 1
		st.Parent = f
		local nm = label(f, (if star then "★ " else "") .. name, 12, Color3.fromRGB(250, 236, 200))
		nm.Position = UDim2.fromOffset(4, 3)
		nm.Size = UDim2.new(1, -8, 0, 16)
		local back = Instance.new("Frame")
		back.Position = UDim2.new(0, 6, 0, 28)
		back.Size = UDim2.new(1, -12, 0, 8)
		back.BackgroundColor3 = Color3.fromRGB(40, 48, 62)
		back.BorderSizePixel = 0
		back.Parent = f
		local bc = Instance.new("UICorner")
		bc.CornerRadius = UDim.new(0, 4)
		bc.Parent = back
		local fill = Instance.new("Frame")
		fill.Size = UDim2.fromScale(1, 1)
		fill.BackgroundColor3 = color
		fill.BorderSizePixel = 0
		fill.Parent = back
		local fc = Instance.new("UICorner")
		fc.CornerRadius = UDim.new(0, 4)
		fc.Parent = fill
		return { frame = f, fill = fill, name = nm, color = color }
	end
	local myCards, foeCards = {}, {}
	do
		local mine = cardRow(0, 0, 112)
		table.insert(myCards, { c = card(mine, opts.shipName or "기함", Color3.fromRGB(91, 181, 120), true), share = 1 })
		for _, f in opts.fleet or {} do
			table.insert(myCards, { c = card(mine, f, Color3.fromRGB(91, 181, 120), false), share = 0.5 })
		end
		local theirs = cardRow(1, 1, 112)
		table.insert(foeCards, { c = card(theirs, opts.enemyName or "해적선", Color3.fromRGB(214, 82, 76), true), share = 1 })
		for i = 1, if opts.isBoss then 0 else 2 do
			table.insert(foeCards, { c = card(theirs, "호위선", Color3.fromRGB(214, 120, 76), false), share = 0.4 })
		end
	end
	-- 바람 표시: 날씨와 바람 세기를 위쪽 가운데에 보여 준다
	do
		local wind = Instance.new("Frame")
		wind.AnchorPoint = Vector2.new(0.5, 0)
		wind.Position = UDim2.new(0.5, 0, 0, 24)
		wind.Size = UDim2.fromOffset(190, 34)
		wind.BackgroundColor3 = Color3.fromRGB(26, 34, 40)
		wind.BackgroundTransparency = 0.15
		wind.BorderSizePixel = 0
		wind.Parent = gui
		local wc = Instance.new("UICorner")
		wc.CornerRadius = UDim.new(0, 8)
		wc.Parent = wind
		local arrow = label(wind, "➤", 22, Color3.fromRGB(150, 220, 255))
		arrow.Position = UDim2.fromOffset(6, 3)
		arrow.Size = UDim2.fromOffset(28, 28)
		arrow.Rotation = opts.windAngle or 0
		local wl = label(wind, string.format("%s · 바람 %d%%", opts.weatherName or "맑음", math.floor((opts.wind or 1) * 100 + 0.5)), 14, Color3.fromRGB(250, 236, 200))
		wl.Position = UDim2.fromOffset(38, 6)
		wl.Size = UDim2.new(1, -44, 0, 22)
		wl.TextXAlignment = Enum.TextXAlignment.Left
	end

	-- 돛 조종: 바람을 등지면 빠르고 맞바람이면 느리다 (바람 방향은 화살표와 같다)
	local windRad = math.rad(opts.windAngle or 0)
	local windPower = math.clamp(opts.wind or 1, 0.4, 1.6)
	local function windFactor(theta)
		-- 배의 진행 방향과 바람이 불어가는 방향이 같으면 +1(순풍), 반대면 -1(맞바람)
		local c = math.cos(theta - windRad)
		return 1 + c * 0.32 * windPower
	end
	local sailLabel = label(gui, "", 14, Color3.fromRGB(150, 220, 255))
	local rangeLabel = label(gui, string.format("🎯 %s · 사거리 %d · 탄속 %.1f초", cannon.name, cannon.range, cannon.dur), 13, Color3.fromRGB(255, 226, 150))
	rangeLabel.AnchorPoint = Vector2.new(0.5, 1)
	rangeLabel.Position = UDim2.new(0.5, 0, 1, -12)
	rangeLabel.Size = UDim2.fromOffset(300, 20)
	-- 사거리 링 + 탄도 점선 미리보기 (사거리 안이면 초록, 밖이면 빨강)
	local rangeRing = part(folder, Vector3.new(0.3, cannon.range * 2, cannon.range * 2), CFrame.new(ORIGIN) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(255, 226, 150), Enum.Material.Neon, Enum.PartType.Cylinder)
	rangeRing.Transparency = 0.9
	local trajDots = {}
	for i = 1, 14 do
		local d = part(folder, Vector3.new(0.8, 0.8, 0.8), CFrame.new(ORIGIN), Color3.fromRGB(255, 255, 255), Enum.Material.Neon, Enum.PartType.Ball)
		d.Transparency = 1
		trajDots[i] = d
	end
	sailLabel.AnchorPoint = Vector2.new(0.5, 0)
	sailLabel.Position = UDim2.new(0.5, 0, 0, 62)
	sailLabel.Size = UDim2.fromOffset(190, 20)
	-- 기동 점수: 포탄 낙하 경고를 피하면 올라간다 (결과와는 별개로 명성 보너스만 준다)
	local flair, combo, dodged = 0, 0, 0
	local comboLabel = label(gui, "", 22, Color3.fromRGB(255, 226, 120))
	comboLabel.AnchorPoint = Vector2.new(0.5, 0)
	comboLabel.Position = UDim2.new(0.5, 0, 0, 200)
	comboLabel.Size = UDim2.fromOffset(300, 30)

	local subtitle = label(gui, "", 16)
	subtitle.AnchorPoint = Vector2.new(0.5, 1)
	subtitle.Position = UDim2.new(0.5, 0, 1, -76)
	subtitle.Size = UDim2.new(0.7, 0, 0, 40)
	subtitle.TextWrapped = true

	local hint = label(gui, if opts.card then "적선 가까이 다가가면 카드 대결이 시작돼요. 카드에서 이기면 전투 승리! 해역 가장자리까지 달리면 도망칠 수 있어요." else "가까이 가면 대포가 자동으로 나가고, 배가 맞닿으면 백병전! 해역 가장자리까지 달리면 도망칠 수 있어요.", 14, Color3.fromRGB(255, 226, 170))
	hint.AnchorPoint = Vector2.new(0.5, 0)
	hint.Position = UDim2.new(0.5, 0, 0, 164)
	hint.Size = UDim2.new(0.8, 0, 0, 36)
	hint.TextWrapped = true

	local banner = label(gui, "", 44)
	banner.AnchorPoint = Vector2.new(0.5, 0.5)
	banner.Position = UDim2.fromScale(0.5, 0.4)
	banner.Size = UDim2.fromOffset(400, 70)
	banner.TextTransparency = 1
	banner.TextStrokeTransparency = 1

	-- 카드 지원 표시판: 덱의 지식 카드가 해전을 자동으로 거드는 효과. 발동할 때마다 해당 줄이 번쩍이고 문구가 떠오른다.
	local CH = { chips = {}, shown = {} }
	do
		local entries = opts.cardEffects or {}
		if #entries > 0 and not opts.cardOnly then
			local panel = Instance.new("Frame")
			panel.Position = UDim2.new(0, 10, 0.3, 0)
			panel.Size = UDim2.fromOffset(190, 24 + #entries * 30)
			panel.BackgroundColor3 = Color3.fromRGB(30, 24, 20)
			panel.BackgroundTransparency = 0.35
			panel.BorderSizePixel = 0
			panel.Parent = gui
			local pc = Instance.new("UICorner")
			pc.CornerRadius = UDim.new(0, 8)
			pc.Parent = panel
			local head = label(panel, "🃏 카드 지원 (자동)", 12, Color3.fromRGB(246, 208, 130))
			head.Position = UDim2.fromOffset(8, 3)
			head.Size = UDim2.new(1, -16, 0, 18)
			head.TextXAlignment = Enum.TextXAlignment.Left
			for i, e in entries do
				local chip = Instance.new("Frame")
				chip.Position = UDim2.fromOffset(6, 24 + (i - 1) * 30)
				chip.Size = UDim2.new(1, -12, 0, 26)
				chip.BackgroundColor3 = Color3.fromRGB(70, 56, 42)
				chip.BorderSizePixel = 0
				chip.Parent = panel
				local cc = Instance.new("UICorner")
				cc.CornerRadius = UDim.new(0, 6)
				cc.Parent = chip
				local cn = table.concat(e.cards or {}, "·")
				local t = label(chip, string.format("%s  %s", e.text, cn), 11, Color3.fromRGB(240, 226, 190), false)
				t.Size = UDim2.new(1, -8, 1, 0)
				t.Position = UDim2.fromOffset(6, 0)
				t.TextXAlignment = Enum.TextXAlignment.Left
				t.TextTruncate = Enum.TextTruncate.AtEnd
				CH.chips[e.kind] = { frame = chip, entry = e }
			end
		end
	end
	local KIND_COLOR = { melee = Color3.fromRGB(220, 120, 90), cannon = Color3.fromRGB(240, 180, 80), speed = Color3.fromRGB(110, 190, 230), pump = Color3.fromRGB(110, 200, 160), medic = Color3.fromRGB(150, 220, 130) }
	local KIND_PHRASE = { melee = "접현 카드가 칼날을 벼린다", cannon = "포 카드가 조준을 돕는다", speed = "항해 카드가 바람을 읽는다", pump = "조선 카드가 물을 막는다", medic = "의학 카드가 부상자를 살린다" }
	function CH.flash(kind)
		local c = CH.chips[kind]
		if not c or CH.shown[kind] and os.clock() - CH.shown[kind] < 2.5 then
			return
		end
		CH.shown[kind] = os.clock()
		local TweenService = game:GetService("TweenService")
		local col = KIND_COLOR[kind] or Color3.fromRGB(240, 200, 100)
		c.frame.BackgroundColor3 = col
		TweenService:Create(c.frame, TweenInfo.new(0.9), { BackgroundColor3 = Color3.fromRGB(70, 56, 42) }):Play()
		-- 화면 가운데 위로 효과 문구가 떠올랐다 사라진다
		local pop = label(gui, string.format("✦ %s · %s", (c.entry.cards or {})[1] or "카드", c.entry.text), 22, col)
		pop.AnchorPoint = Vector2.new(0.5, 0.5)
		pop.Position = UDim2.fromScale(0.5, 0.3)
		pop.Size = UDim2.fromOffset(420, 30)
		pop.ZIndex = 30
		local sub = label(gui, KIND_PHRASE[kind] or "", 14, Color3.fromRGB(240, 230, 200), false)
		sub.AnchorPoint = Vector2.new(0.5, 0.5)
		sub.Position = UDim2.fromScale(0.5, 0.3)
		sub.Size = UDim2.fromOffset(420, 20)
		sub.ZIndex = 30
		sub.Position = UDim2.fromScale(0.5, 0.3) + UDim2.fromOffset(0, 26)
		for _, l in { pop, sub } do
			TweenService:Create(l, TweenInfo.new(1.6, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Position = l.Position - UDim2.fromOffset(0, 40), TextTransparency = 1, TextStrokeTransparency = 1,
			}):Play()
			task.delay(1.7, function() l:Destroy() end)
		end
	end
	-- 전투가 시작되면 지원 효과를 차례로 알린다
	task.spawn(function()
		task.wait(1.2)
		for _, kind in { "speed", "cannon", "melee", "pump" } do
			if CH.chips[kind] then
				CH.flash(kind)
				task.wait(0.7)
			end
		end
	end)

	local finished = false
	local conns = {}
	-- 모바일: 기본 이동 스틱/점프 버튼이 조종 버튼을 가리므로 해전 중에는 끈다
	local controls = nil
	pcall(function()
		controls = require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule")):GetControls()
		controls:Disable()
	end)
	local function finish()
		if finished then
			return
		end
		finished = true
		if controls then
			pcall(function()
				controls:Enable()
			end)
		end
		for _, c in conns do
			c:Disconnect()
		end
		gui:Destroy()
		folder:Destroy()
		if opts.onDone then
			opts.onDone(math.floor(flair))
		end
	end

	local function mkBtn(text, pos, size, anchor)
		local b = Instance.new("TextButton")
		b.Text = text
		b.AnchorPoint = anchor or Vector2.new(0, 1)
		b.Position = pos
		b.Size = size
		b.BackgroundColor3 = Color3.fromRGB(50, 83, 106)
		b.TextColor3 = Color3.fromRGB(250, 236, 200)
		b.Font = Enum.Font.GothamBold
		b.TextSize = 26
		b.BorderSizePixel = 0
		b.Parent = gui
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 14)
		c.Parent = b
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
		st.Parent = b
		return b
	end
	local steerDir, throttle = 0, 1
	local speedBtn = mkBtn("가속", UDim2.new(1, -24, 1, -24), UDim2.fromOffset(120, 70), Vector2.new(1, 1))
	speedBtn.TextSize = 18
	local skip = mkBtn("건너뛰기", UDim2.new(0.5, 0, 0, 62), UDim2.fromOffset(96, 30), Vector2.new(0.5, 0))
	skip.TextSize = 14
	skip.Activated:Connect(finish)
	-- 가상 스틱: 좌우 = 방향 전환, 위/아래 = 속도 (모바일 중심)
	local stickBase = Instance.new("Frame")
	stickBase.AnchorPoint = Vector2.new(0, 1)
	stickBase.Position = UDim2.new(0, 28, 1, -28)
	stickBase.Size = UDim2.fromOffset(170, 170)
	stickBase.BackgroundColor3 = Color3.fromRGB(20, 34, 54)
	stickBase.BackgroundTransparency = 0.35
	stickBase.BorderSizePixel = 0
	stickBase.Parent = gui
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(1, 0)
		c.Parent = stickBase
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
		st.Parent = stickBase
	end
	local knob = Instance.new("Frame")
	knob.AnchorPoint = Vector2.new(0.5, 0.5)
	knob.Position = UDim2.fromScale(0.5, 0.5)
	knob.Size = UDim2.fromOffset(72, 72)
	knob.BackgroundColor3 = Color3.fromRGB(240, 205, 120)
	knob.BorderSizePixel = 0
	knob.Parent = stickBase
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(1, 0)
		c.Parent = knob
	end
	local stickTouch = nil
	local stickThrottle = nil
	local function stickUpdate(pos)
		local center = stickBase.AbsolutePosition + stickBase.AbsoluteSize / 2
		local d = Vector2.new(pos.X, pos.Y) - center
		local r = stickBase.AbsoluteSize.X / 2
		if d.Magnitude > r then
			d = d.Unit * r
		end
		knob.Position = UDim2.new(0.5, d.X, 0.5, d.Y)
		local nx, ny = d.X / r, -d.Y / r
		steerDir = if math.abs(nx) < 0.12 then 0 else -nx
		stickThrottle = math.clamp(0.6 + ny * 0.5, 0.1, 1)
	end
	local function stickRelease()
		stickTouch = nil
		stickThrottle = nil
		steerDir = 0
		knob.Position = UDim2.fromScale(0.5, 0.5)
	end
	stickBase.InputBegan:Connect(function(i)
		if i.UserInputType == Enum.UserInputType.Touch or i.UserInputType == Enum.UserInputType.MouseButton1 then
			stickTouch = i
			stickUpdate(i.Position)
		end
	end)
	table.insert(conns, game:GetService("UserInputService").InputChanged:Connect(function(i)
		if stickTouch and (i == stickTouch or (stickTouch.UserInputType == Enum.UserInputType.MouseButton1 and i.UserInputType == Enum.UserInputType.MouseMovement)) then
			stickUpdate(i.Position)
		end
	end))
	table.insert(conns, game:GetService("UserInputService").InputEnded:Connect(function(i)
		if stickTouch and (i == stickTouch or i.UserInputType == Enum.UserInputType.MouseButton1) then
			stickRelease()
		end
	end))
	speedBtn.Activated:Connect(function()
		throttle = if throttle >= 1 then 0.45 elseif throttle > 0.4 then 0 else 1
		speedBtn.Text = if throttle >= 1 then "가속" elseif throttle > 0.4 then "순항" else "정지"
	end)
	-- 키보드(PC): A/D 또는 방향키
	local UIS = game:GetService("UserInputService")
	table.insert(conns, UIS.InputBegan:Connect(function(i, gp)
		if gp then
			return
		end
		if i.KeyCode == Enum.KeyCode.A or i.KeyCode == Enum.KeyCode.Left then
			steerDir = 1
		elseif i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then
			steerDir = -1
		end
	end))
	table.insert(conns, UIS.InputEnded:Connect(function(i)
		if i.KeyCode == Enum.KeyCode.A or i.KeyCode == Enum.KeyCode.Left or i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then
			steerDir = 0
		end
	end))

	-- 전투 기록: 서로 순서대로 맞는 포격 큐와 마무리 백병전 큐
	local events = parseLog(opts.log or {})
	local meQueue, foeQueue, meleeQueue = {}, {}, {}
	local dmgToMe, dmgToFoe = 0, 0
	for _, e in events do
		if e.kind == "fire" then
			if e.player then
				table.insert(meQueue, e)
				dmgToFoe += e.hull
			else
				table.insert(foeQueue, e)
				dmgToMe += e.hull
			end
		elseif e.kind == "melee" then
			table.insert(meleeQueue, e)
		end
	end
	local meEnd, foeEnd = 1, 1
	if opts.winner == "a" then
		foeEnd = 0
		meEnd = math.clamp(1 - dmgToMe / math.max(1, dmgToMe + dmgToFoe * 0.6), 0.2, 1)
	elseif opts.winner == "b" then
		meEnd = 0
		foeEnd = math.clamp(1 - dmgToFoe / math.max(1, dmgToFoe + dmgToMe * 0.6), 0.2, 1)
	else
		meEnd, foeEnd = 0.45, 0.45
	end
	-- 카드 대결 모드: 승패는 카드 대결이 정한다 (카드에서 이기면 전체 승리). 그 전까지 선체는 멀쩡하게 둔다.
	local cardStarted, cardBusy, cardDone = false, false, false
	if opts.card then
		meEnd, foeEnd = 1, 1
	end
	local meHp, foeHp = 1, 1
	local meDone, foeDone = 0, 0 -- 소비한 포격 수

	local function applyHit(toPlayer, e)
		if toPlayer then
			meDone += 1
			meHp = math.clamp(1 - (1 - meEnd) * (meDone / math.max(1, #foeQueue)), meEnd, 1)
			if meHp < 0.5 then CH.flash("pump") end
		else
			foeDone += 1
			foeHp = math.clamp(1 - (1 - foeEnd) * (foeDone / math.max(1, #meQueue)), foeEnd, 1)
			if foeDone % 3 == 1 then CH.flash("cannon") end
		end
		subtitle.Text = e.text
	end

	local shake = 0
	-- 접현 카드 전투: 배가 맞닿으면 화면이 카드판으로 바뀐다. 규칙은 BoardingCards (3줄 × 3판 2선승, 병종 상성).
	-- 전투 결과 자체는 서버 판정 그대로이고, 카드전의 승패는 기동 점수(명성 보너스)에만 반영된다.
	local BC = require(script.Parent:WaitForChild("BoardingCards"))
	local boardingOn = false
	-- 능력의 본래 효과를 유지하면서 카드 인장·선택 설명에 동일하게 표시한다.
	local ROW_ICON = { melee = "근접", ranged = "사격", cannon = "포격" }
	local function startBoarding(cfg, onEnd, onPlay)
		boardingOn = true
		local TweenService = game:GetService("TweenService")
		local rng = function()
			return math.random()
		end
		local m
		local actions = {} -- 내가 한 행동 기록: 서버가 같은 시드로 다시 돌려 승패를 확인한다
		if cfg and cfg.prebuilt then
			BC.useKind("boarding")
			m = cfg.prebuilt()
		elseif cfg then
			BC.useKind(cfg.kind)
			m = BC.build(cfg.kind, cfg.seed, { fighter = cfg.my, deckCards = opts.deck and opts.deck.cards, faction = opts.deck and opts.deck.faction, book = opts.deck and opts.deck.book }, { fighter = cfg.foe, boss = opts.isBoss == true })
		else
			BC.useKind("boarding")
			local myDeck, myLeader = BC.playerDeck(opts.deck and opts.deck.cards, rng)
			local foeDeck, foeLeader = BC.enemyDeck(opts.isBoss == true, rng)
			m = BC.newMatch(myDeck, myLeader, foeDeck, foeLeader, rng)
		end

		-- [다국어 카드] 원화와 규칙은 공용, 이름·설명·UI만 플레이어 언어로 출력한다.
		local locale = string.lower(tostring(player.LocaleId or "en-us"))
		local english = string.sub(locale, 1, 2) ~= "ko"
		local function t(ko, en) return if english then en else ko end
		local ABIL = { bond="결속", morale="사기", spy="첩자", medic="치료", armor="철갑", snipe="저격" }
		local ABIL_DETAIL = {
			bond="같은 병종 결속 · 최대 3배", morale="같은 줄 강화 · 동아시아 보너스",
			spy="적진에 배치하고 카드 2장 확보 · 신대륙 3장", medic="버린 일반 카드 중 가장 강한 병종 복귀",
			armor="폭풍·안개 등 날씨 감점 무효", snipe="조건을 만족한 적 부대를 저격",
		}

		local englishRows = { melee = "Melee", ranged = "Ranged", cannon = "Cannon" }
		local englishCategories = { ["선박"] = "Ship", ["유물"] = "Artifact", ["동물"] = "Animal", ["지형·원더"] = "Landmark" }
		local englishAbilities = { bond = "Bond", morale = "Morale", spy = "Spy", medic = "Medic", armor = "Armor", snipe = "Snipe" }
		local englishDetails = {
			bond = "Matching units bond together for up to triple strength",
			morale = "Boost units in this row; East Asia gains an extra bonus",
			spy = "Play in the enemy row and draw 2 cards; New World draws 3",
			medic = "Restore the strongest discarded ordinary unit",
			armor = "Unaffected by weather penalties",
			snipe = "Snipe a qualifying enemy unit",
		}
		local englishNames = {
			swordsman = "Swordsman", axeman = "Axeman", pikeman = "Pikeman", shieldman = "Shieldbearer",
			boatswain = "Boatswain", surgeon = "Surgeon", musketeer = "Musketeer", sharpshooter = "Sharpshooter",
			scout = "Scout", gunner = "Gunner", swivel = "Swivel Gun", culverin = "Culverin",
			ironclad = "Armored Guard", sniper = "Sniper", beast = "Wild Beast", samurai = "Samurai",
			firelance = "Fire Lance", jaguar = "Jaguar Warrior", janissary = "Janissary", camel = "Camel Rider",
			raider = "Sea Raider", hero_blade = "Veteran", hero_marksman = "Master Marksman",
			hero_cannon = "Master Gunner", hero_spy = "Master Spy", hero_medic = "Master Healer",
			hero_captain = "Captain", scorch = "Scorch", fog = "Fog", storm = "Storm",
			melee_fog = "Melee Fog", clear = "Clear Weather", wind = "Tailwind",
			horn = "War Horn", decoy = "Decoy", boss_kraken = "Kraken's Tentacle",
			boss_serpent = "Sea Serpent's Fang", boss_siren = "Siren's Song",
		}
		local englishFactions = { europe = "Europe", east_asia = "East Asia", middle_east = "Middle East", new_world = "New World", africa = "Africa" }
		local englishLeaders = { draw = "Command", clear = "Open Sea Route", snipe = "Snipe" }
		local function cardName(c)
			if not english then return c.name end
			local en = BC.CardEnglish[c.id]
			return if en then en.name else englishNames[c.id] or c.name
		end
		local function cardLore(c)
			local en = english and BC.CardEnglish[c.id]
			return if en then en.lore else c.lore
		end
		local function rowName(row)
			return if english then englishRows[row] or "" else BC.ROW_NAME[row] or ""
		end
		local function cardDescription(c)
			if not english then
				if c.special then return c.text or "전술 카드" end
				if c.ability then return ABIL_DETAIL[c.ability] or "" end
				return if c.hero then "영웅 · 날씨와 소각의 영향을 받지 않음" else "병종 상성을 고려해 전투 줄에 배치"
			end
			if c.special == "weather" then return "Set ordinary units in the " .. rowName(c.row) .. " row to 1 strength" end
			if c.special == "horn" then return "Double the ordinary unit score in your strongest row" end
			if c.special == "wind" then return "Clear weather effects and draw one card" end
			if c.special == "clear" then return "Clear all weather effects" end
			if c.special == "scorch" then return "Remove the strongest non-hero units" end
			if c.special == "decoy" then return "Return a weak field card to your hand" end
			if c.ability then return englishDetails[c.ability] or "Use in its matching combat row" end
			return if c.hero then "Hero · Unaffected by weather or Scorch" else "Use row matchups to deploy this card"
		end
		local function mine(ok, msg, res, act, card)
			if ok and act then table.insert(actions, act) end
			return ok, msg, res, card, "me"
		end
		local TITLE = if english then (if cfg then "Naval Card Battle" else "Boarding Battle") elseif cfg and cfg.title then cfg.title elseif cfg then "해전 카드 대결" else "접현 전투"

		local g = Instance.new("ScreenGui")
		g.Name = "BoardingGui"
		g.ResetOnSpawn = false
		g.DisplayOrder = 40
		g.Parent = player:WaitForChild("PlayerGui")
		table.insert(conns, { Disconnect = function()
			if g.Parent then
				g:Destroy()
			end
		end })
		local paper = Color3.fromRGB(224, 205, 163)
		local ink = Color3.fromRGB(49, 37, 27)
		local brass = Color3.fromRGB(158, 113, 59)
		local rowIcons = { melee = "Menu/battle", ranged = "Menu/chart_compass", cannon = "Menu/chart_anchor" }

		local function frameEdge(gui, color, radius)
			local curve = Instance.new("UICorner")
			curve.CornerRadius = UDim.new(0, radius)
			curve.Parent = gui
			local stroke = Instance.new("UIStroke")
			stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			stroke.Color = color
			stroke.Parent = gui
			return stroke
		end

		local function emblem(parent, assetKey, position, size)
			local icon = Instance.new("ImageLabel")
			icon.AnchorPoint = Vector2.new(0, 0.5)
			icon.Position = position
			icon.Size = size
			icon.BackgroundColor3 = paper
			icon.BorderSizePixel = 0
			icon.ScaleType = Enum.ScaleType.Fit
			icon.Image = "rbxassetid://" .. AssetIds[assetKey]
			icon.ImageColor3 = Color3.fromRGB(114, 75, 43)
			icon.Parent = parent
			frameEdge(icon, brass, 4)
			return icon
		end

		local bg = Instance.new("Frame")
		bg.Size = UDim2.fromScale(1, 1)
		bg.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		bg.BorderSizePixel = 0
		bg.Parent = g
		TweenService:Create(bg, TweenInfo.new(0.6), { BackgroundColor3 = Color3.fromRGB(38, 28, 22) }):Play()
		if cfg then
			bg.BackgroundTransparency = 0.42 -- 뒤로 3D 해상 무대(두 배와 선원)가 비쳐 보인다
		end
		-- 카드 대전판: 짙은 목재 탁자 위에 항해도 문양, 가운데 전선, 네 모서리 황동 장식
		local wood = Instance.new("UIGradient")
		wood.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(70, 48, 34)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(34, 25, 20)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(58, 40, 29)),
		})
		wood.Rotation = 90
		wood.Parent = bg
		-- [전투판 배경] 오너 원화는 기존 CardArt 업로더의 SHA 승인 및 Roblox 등록 후만 표시한다.
		-- 아직 미등록이면 기존 등록 세계 해도를 은은한 바탕으로 사용하며, 카드 규칙은 그대로 둔다.
		local boardArtKey = if AssetIds["CardArt/battle_board"] then "CardArt/battle_board" else "CardArt/event_chart_world"
		local boardArt = Instance.new("ImageLabel")
		boardArt.Name = "NavalCardBattleBoard"
		boardArt.Size = UDim2.fromScale(1, 1)
		boardArt.BackgroundTransparency = 1
		boardArt.BorderSizePixel = 0
		boardArt.ScaleType = Enum.ScaleType.Crop
		boardArt.Image = if AssetIds[boardArtKey] then "rbxassetid://" .. tostring(AssetIds[boardArtKey]) else ""
		boardArt.ImageTransparency = if cfg then 0.64 elseif boardArtKey == "CardArt/battle_board" then 0.07 else 0.58
		boardArt.ZIndex = 1
		boardArt.Parent = bg
		-- [가독성] 6개 카드 줄·손패·버튼은 이미지보다 위의 원래 UI 인스턴스를 사용한다.
		local boardWash = Instance.new("Frame")
		boardWash.Name = "BattleBoardContrast"
		boardWash.Size = UDim2.fromScale(1, 1)
		boardWash.BackgroundColor3 = Color3.fromRGB(15, 24, 40)
		boardWash.BackgroundTransparency = if cfg then 0.84 else 0.73
		boardWash.BorderSizePixel = 0
		boardWash.ZIndex = 1
		boardWash.Parent = bg
		local boardShade = Instance.new("UIGradient")
		boardShade.Rotation = 90
		boardShade.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.06),
			NumberSequenceKeypoint.new(0.52, 0.38),
			NumberSequenceKeypoint.new(1, 0.10),
		})
		boardShade.Parent = boardWash
		local chartMark = Instance.new("ImageLabel")
		chartMark.AnchorPoint = Vector2.new(0.5, 0.5)
		chartMark.Position = UDim2.fromScale(0.6, 0.42)
		chartMark.Size = UDim2.fromScale(0.5, 0.78)
		chartMark.BackgroundTransparency = 1
		chartMark.ScaleType = Enum.ScaleType.Fit
		chartMark.Image = "rbxassetid://" .. AssetIds["Menu/chart_compass"]
		chartMark.ImageTransparency = if boardArtKey == "CardArt/battle_board" then 1 else 0.92
		chartMark.ImageColor3 = Color3.fromRGB(214, 170, 96)
		chartMark.Parent = bg
		local battleLine = Instance.new("Frame")
		battleLine.AnchorPoint = Vector2.new(0, 0.5)
		battleLine.Position = UDim2.fromScale(0.2, 0.42)
		battleLine.Size = UDim2.fromScale(0.78, 0.004)
		battleLine.BackgroundColor3 = Color3.fromRGB(214, 170, 96)
		battleLine.BorderSizePixel = 0
		battleLine.ZIndex = 3
		battleLine.Parent = bg
		local lineFade = Instance.new("UIGradient")
		lineFade.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.9), NumberSequenceKeypoint.new(0.5, 0), NumberSequenceKeypoint.new(1, 0.9) })
		lineFade.Parent = battleLine

		local titleBar = Instance.new("Frame")
		titleBar.Position = UDim2.fromScale(0.02, 0.012)
		titleBar.Size = UDim2.fromScale(0.96, 0.063)
		titleBar.BackgroundColor3 = paper
		titleBar.BorderSizePixel = 0
		titleBar.Parent = g
		frameEdge(titleBar, brass, 5)
		emblem(titleBar, "Menu/codex", UDim2.fromScale(0.015, 0.5), UDim2.fromScale(0.065, 0.88))
		local header = label(titleBar, "", 18, ink)
		header.Position = UDim2.fromScale(0.09, 0)
		header.Size = UDim2.fromScale(0.89, 1)
		header.TextXAlignment = Enum.TextXAlignment.Left
		header.TextStrokeTransparency = 1
		header.TextScaled = true
		header.TextWrapped = true
		local headerLimit = Instance.new("UITextSizeConstraint")
		headerLimit.MaxTextSize = 18
		headerLimit.Parent = header
		local info = label(g, "", 15, Color3.fromRGB(250, 236, 200))
		info.Position = UDim2.fromScale(0.02, 0.08)
		info.Size = UDim2.fromScale(0.96, 0.05)
		info.TextXAlignment = Enum.TextXAlignment.Left
		info.TextTruncate = Enum.TextTruncate.AtEnd

		local boardFrame = Instance.new("Frame")
		boardFrame.Position = UDim2.fromScale(0.2, 0.14)
		boardFrame.Size = UDim2.fromScale(0.78, 0.56)
		boardFrame.BackgroundTransparency = 1
		boardFrame.Parent = g
		-- 왼쪽 정보판: 양쪽 합계 원, 목숨 보석, 멈춤 표시, 날씨
		local panel = Instance.new("Frame")
		panel.Position = UDim2.fromScale(0.02, 0.14)
		panel.Size = UDim2.fromScale(0.17, 0.56)
		panel.BackgroundColor3 = Color3.fromRGB(30, 23, 19)
		panel.BorderSizePixel = 0
		panel.Parent = g
		frameEdge(panel, brass, 6)
		local function sidePlate(y, color)
			local plate = Instance.new("Frame")
			plate.Position = UDim2.fromScale(0.05, y)
			plate.Size = UDim2.fromScale(0.9, 0.4)
			plate.BackgroundColor3 = color
			plate.BorderSizePixel = 0
			plate.Parent = panel
			frameEdge(plate, brass, 5)
			local who = label(plate, "", 14, Color3.fromRGB(250, 236, 200), true)
			who.Position = UDim2.fromScale(0.04, 0.02)
			who.Size = UDim2.fromScale(0.92, 0.2)
			who.TextScaled = true
			local total = label(plate, "0", 30, Color3.fromRGB(46, 33, 22), true)
			total.AnchorPoint = Vector2.new(0.5, 0.5)
			total.Position = UDim2.fromScale(0.5, 0.52)
			total.Size = UDim2.fromScale(0.6, 0.42)
			total.BackgroundColor3 = Color3.fromRGB(232, 194, 120)
			total.BackgroundTransparency = 0
			total.TextScaled = true
			total.TextStrokeTransparency = 1
			frameEdge(total, Color3.fromRGB(255, 226, 150), 99)
			local gems = label(plate, "", 18, Color3.fromRGB(255, 120, 96), true)
			gems.Position = UDim2.fromScale(0.04, 0.78)
			gems.Size = UDim2.fromScale(0.92, 0.2)
			gems.TextScaled = true
			return { who = who, total = total, gems = gems, plate = plate }
		end
		local foePlate = sidePlate(0.02, Color3.fromRGB(88, 58, 50))
		local mePlate = sidePlate(0.58, Color3.fromRGB(58, 74, 62))
		local weatherTag = label(panel, "", 13, Color3.fromRGB(192, 212, 239), true)
		weatherTag.Position = UDim2.fromScale(0.04, 0.435)
		weatherTag.Size = UDim2.fromScale(0.92, 0.13)
		weatherTag.TextScaled = true
		weatherTag.TextWrapped = true
		-- 동료 조언·적 정찰 말풍선 (한 판에 한 번, 한 전투에 최대 3번)
		-- 점수판(panel) 안에 두면 내 점수 칸과 겹치므로, 안내 줄(info) 자리에 잠깐 덮어 보여 준다
		local adviceTag = label(g, "", 14, Color3.fromRGB(255, 233, 170), true)
		adviceTag.Position = UDim2.fromScale(0.02, 0.08)
		adviceTag.Size = UDim2.fromScale(0.96, 0.05)
		adviceTag.TextScaled = true
		adviceTag.TextWrapped = true
		adviceTag.BackgroundColor3 = Color3.fromRGB(40, 33, 26)
		adviceTag.BackgroundTransparency = 0.25
		adviceTag.Visible = false
		adviceTag.ZIndex = 20
		local adviceRound, adviceCount, adviceToken = 0, 0, 0

		local function sayAdvice(text, seconds)
			if english then
				if string.find(text, "정찰:", 1, true) then
					text = "Scout: counter the enemy's weakest row."
				elseif string.find(text, "상대가 멈췄어요. 지금 멈추면", 1, true) then
					text = "The opponent passed. Pass now to win this round!"
				elseif string.find(text, "상대가 멈췄어요. 이기려면", 1, true) then
					text = "The opponent passed. Take the lead before passing."
				elseif string.find(text, "많이 밀려요", 1, true) then
					text = "You are behind. Scorch or Snipe can remove a powerful enemy."
				elseif string.find(text, "점수가 크게 밀려요", 1, true) then
					text = "You are far behind. Consider saving cards for the next round."
				elseif string.find(text, "상성에서 밀려요", 1, true) then
					text = "This row has a disadvantage. Use a more favorable row."
				elseif string.find(text, "손패가 얼마", 1, true) then
					text = "Your hand is almost empty. Consider passing to save cards."
				else
					text = "Check the row matchups before choosing a card."
				end
			end
			adviceToken += 1
			local mine = adviceToken
			adviceTag.Text = text
			adviceTag.Visible = true
			task.delay(seconds or 7, function()
				if adviceToken == mine and adviceTag.Parent then adviceTag.Visible = false end
			end)
		end
		do
			local sc = BC.scout(cfg and cfg.seed or 1, { boss = opts.isBoss == true })
			task.delay(0.6, function()
				if adviceTag.Parent then
					sayAdvice(string.format("정찰: 적은 %s · %s · %s. 약한 줄은 %s이니 %s 줄 카드가 유리해요.", sc.faction, sc.style, sc.sea, sc.weakName, BC.ROW_NAME[sc.counterRow]), 9)
				end
			end)
		end
		-- [손패 받침대] 카드 아이콘·터치 확대 기능은 기존 ScrollingFrame에서 처리한다.
		local handTray = Instance.new("Frame")
		handTray.Name = "NavalCardHandTray"
		handTray.Position = UDim2.fromScale(0.015, 0.715)
		handTray.Size = UDim2.fromScale(0.75, 0.275)
		handTray.BackgroundColor3 = Color3.fromRGB(18, 39, 58)
		handTray.BackgroundTransparency = 0.27
		handTray.BorderSizePixel = 0
		handTray.Parent = g
		local trayStroke = frameEdge(handTray, Color3.fromRGB(203, 157, 86), 8)
		trayStroke.Thickness = 2
		local trayGradient = Instance.new("UIGradient")
		trayGradient.Color = ColorSequence.new({
			ColorSequenceKeypoint.new(0, Color3.fromRGB(32, 58, 79)),
			ColorSequenceKeypoint.new(0.5, Color3.fromRGB(12, 28, 48)),
			ColorSequenceKeypoint.new(1, Color3.fromRGB(27, 55, 72)),
		})
		trayGradient.Rotation = 90
		trayGradient.Parent = handTray
		local handFrame = Instance.new("ScrollingFrame")
		handFrame.Position = UDim2.fromScale(0.02, 0.72)
		handFrame.Size = UDim2.fromScale(0.74, 0.26)
		handFrame.BackgroundTransparency = 1
		handFrame.BorderSizePixel = 0
		handFrame.ScrollingDirection = Enum.ScrollingDirection.X
		handFrame.AutomaticCanvasSize = Enum.AutomaticSize.X
		handFrame.CanvasSize = UDim2.fromOffset(0, 0)
		handFrame.ScrollBarThickness = 4
		handFrame.ScrollBarImageColor3 = Color3.fromRGB(186, 141, 73)
		local handPadding = Instance.new("UIPadding")
		handPadding.PaddingTop = UDim.new(0, 10)
		handPadding.PaddingBottom = UDim.new(0, 8)
		handPadding.PaddingLeft = UDim.new(0, 3)
		handPadding.Parent = handFrame
		handFrame.Parent = g
		local handLay = Instance.new("UIListLayout")
		handLay.FillDirection = Enum.FillDirection.Horizontal
		handLay.SortOrder = Enum.SortOrder.LayoutOrder
		handLay.Padding = UDim.new(0, 5)
		handLay.Parent = handFrame

		local function mkSide(text, y, color, assetKey, onClick)
			local b = Instance.new("TextButton")
			b.Text = ""
			b.Position = UDim2.fromScale(0.78, y)
			b.Size = UDim2.fromScale(0.2, 0.075)
			b.BackgroundColor3 = color
			b.BorderSizePixel = 0
			b.Parent = g
			frameEdge(b, brass, 5)
			emblem(b, assetKey, UDim2.fromScale(0.05, 0.5), UDim2.fromScale(0.25, 0.78))
			local title = label(b, text, 14, Color3.fromRGB(250, 236, 200))
			title.Name = "Caption"
			title.Position = UDim2.fromScale(0.34, 0)
			title.Size = UDim2.fromScale(0.62, 1)
			title.TextScaled = true
			title.TextWrapped = true
			local limit = Instance.new("UITextSizeConstraint")
			limit.MaxTextSize = 15
			limit.Parent = title
			b.Activated:Connect(onClick)
			return b
		end

		local render
		local auto = false
		local playing = false
		local selected
		local cardMotions = {}
		-- 모든 카드가 공유하는 단일 프레임 갱신. 손패 10장 + 최근 전장 2장도 모바일에서 관리한다.
		local lastPlayed = { me = nil, foe = nil }
		local cardMotionStep = RunService.RenderStepped:Connect(function(dt)
			for _, moving in cardMotions do moving.step(dt) end
		end)
		g.Destroying:Connect(function()
			cardMotionStep:Disconnect()
			for _, moving in cardMotions do moving.stop() end
			table.clear(cardMotions)
		end)
		local rowTargets = { me = {}, foe = {} }
		local function afterAction(ok, msg, res, card, side)
			if ok and card and not card.special then lastPlayed[side] = card end
			if ok and card and onPlay then onPlay(side, card) end
			if not ok then
				info.Text = if english then "Action unavailable" else msg or ""
				return
			end
			info.Text = if english then (if msg == "멈췄다" then "Passed" else "Card played") else msg or ""
			if res then
				info.Text = if english then string.format("Round %d — You %d : Pirates %d %s", res.round, res.me, res.foe,
					if res.winner == "me" then "(Victory!)" elseif res.winner == "foe" then "(Defeat)" else "(Draw)")
					else string.format("%d판 결과 — 우리 %d : 해적 %d  %s", res.round, res.me, res.foe,
						if res.winner == "me" then "(우리가 이겼다!)" elseif res.winner == "foe" then "(해적이 이겼다)" else "(무승부)")
				Sfx.play(if res.winner == "me" then "sfx_fanfare" else "sfx_hit", 0.6, 1)
				Sfx.play("sfx_metal_clash", 0.7, 1)
			else
				Sfx.play("sfx_boarding_draw", 0.7, 1) -- 카드를 내는 손짓(칼 뽑는 소리)
			end
			render()
		end
		local passBtn = mkSide(t("멈추기", "Pass"), 0.72, Color3.fromRGB(97, 55, 42), "Menu/chart_anchor", function()
			if not playing and not auto and not finished and m.turn == "me" and not m.over then
				afterAction(mine(BC.pass(m, "me")))
			end
		end)
		local leaderBtn = mkSide(t("지도자 능력", "Leader Ability"), 0.81, Color3.fromRGB(89, 67, 46), "Menu/chart_compass", function()
			if not playing and not auto and not finished and m.turn == "me" and not m.over then
				afterAction(mine(BC.useLeader(m, "me")))
			end
		end)
		mkSide(t("자동 진행", "Auto Play"), 0.9, Color3.fromRGB(46, 72, 69), "Menu/route", function()
			auto = true
		end)

		-- 전투판에 내려놓은 카드는 손패와 같은 판화·금박·점수 인장을 쓴다.
		local animateCardArt
		local function chip(parent, c, w, power, moving)
			local f = Instance.new("TextButton")
			f.Text = ""
			f.AutoButtonColor = false
			f.Size = UDim2.new(0, w, 1, 0)
			f.BackgroundColor3 = if c.hero then Color3.fromRGB(121, 76, 41) else Color3.fromRGB(61, 45, 31)
			f.BorderSizePixel = 0
			f.Parent = parent
			-- [전투판 카드] 이미 펼친 소형 카드도 5개 지역의 덱 색상을 유지한다.
			local regionId = if type(c.id) == "string" then string.match(c.id, "^(%a%a)_%d%d$") else nil
			local regionDeck = if regionId then CARD_DECK[regionId] else nil
			frameEdge(f, if c.hero then Color3.fromRGB(246, 209, 120) elseif regionDeck then regionDeck.color else brass, 4)
			local plate = Instance.new("Frame")
			plate.Size = UDim2.fromScale(1, 0.8)
			plate.BackgroundColor3 = Color3.fromRGB(90, 68, 46)
			plate.ClipsDescendants = true
			plate.BorderSizePixel = 0
			plate.Parent = f
			local painting = Instance.new("ImageLabel")
			painting.Name = "EncyclopediaPlate"
			painting.AnchorPoint = Vector2.new(0.5, 0.5)
			painting.Position = UDim2.fromScale(0.5, 0.5)
			painting.Size = UDim2.fromScale(1.12, 1.12)
			painting.BackgroundTransparency = 1
			painting.ScaleType = Enum.ScaleType.Crop
			painting.ImageColor3 = Color3.fromRGB(236, 211, 165)
			local artKey = cardArtworkKey(c)
			painting.Image = if AssetIds[artKey] then "rbxassetid://" .. tostring(AssetIds[artKey]) else ""
			painting.Parent = plate
			if moving then table.insert(cardMotions, animateCardArt(plate, painting, c)) end
			local blackWash = Instance.new("UIGradient")
			blackWash.Rotation = 90
			blackWash.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.35),
				NumberSequenceKeypoint.new(0.48, 1),
				NumberSequenceKeypoint.new(1, 0.3),
			})
			blackWash.Parent = painting
			local tag = label(f, cardName(c), 11, Color3.fromRGB(255, 237, 188), true)
			tag.Position = UDim2.fromScale(0.03, 0.04)
			tag.Size = UDim2.fromScale(0.94, 0.38)
			tag.TextScaled = true
			-- [배치 카드 식별] 작은 카드도 5대륙과 선박·유물·동물·원더를 원화 위에서 구분한다.
			local category = if c.category then (if english then englishCategories[c.category] or c.category else c.category)
				elseif c.special then t("전술", "Tactic") elseif c.hero then t("영웅", "Hero") else rowName(c.row)
			local origin = if regionDeck then (if english then string.upper(regionId) else regionDeck.ko) .. " · " else ""
			local identity = label(f, origin .. category, 9, Color3.fromRGB(255, 245, 218), true)
			identity.Name = "PlayedCardIdentity"
			identity.Position = UDim2.fromScale(0.025, 0.48)
			identity.Size = UDim2.fromScale(0.95, 0.16)
			identity.BackgroundColor3 = if regionDeck then regionDeck.color else Color3.fromRGB(75, 56, 40)
			identity.BackgroundTransparency = 0.13
			identity.TextScaled = true
			identity.TextStrokeTransparency = 0.48
			identity.ZIndex = 8
			local stamp = label(f, tostring(power or c.power or ""), 15, ink, true)
			stamp.AnchorPoint = Vector2.new(0.5, 1)
			stamp.Position = UDim2.fromScale(0.5, 0.97)
			stamp.Size = UDim2.fromScale(0.62, 0.29)
			stamp.TextScaled = true
			stamp.TextStrokeTransparency = 1
			stamp.BackgroundColor3 = paper
			stamp.BackgroundTransparency = 0
			frameEdge(stamp, brass, 4)
			return f
		end
		-- 선택 전에도 모든 손패 카드에서 움직이는 백과사전 삽화가 동작한다.
		-- 기존 실물 모델만 복제하며 손패 변경/종료 시 재생을 완전히 해제한다.
		animateCardArt = function(art, image, card)
			local spec = CARD_STAGE[card.id] or card.stage or {}
			local assets = ReplicatedStorage:FindFirstChild("MareAssets")
			local function template(key)
				local folder = key and assets and assets:FindFirstChild(key[1])
				local source = folder and folder:FindFirstChild(key[2])
				return if source and source:IsA("Model") and source:FindFirstChildWhichIsA("BasePart", true) then source else nil
			end
			local actorSource, propSource = template(spec.actor), template(spec.prop)
			local view, actor, prop, actorPivot, propPivot, shoulder, camera
			local sceneFailed = false
			-- 모바일 최적화: 손패 전체는 2D 판화로 표시하고, 선택·확대된 카드만 실제 모델을 렌더한다.
			local function releaseScene()
				if view then view:Destroy() end
				view, actor, prop, actorPivot, propPivot, shoulder, camera = nil, nil, nil, nil, nil, nil, nil
			end
			local function ensureScene()
				if view or sceneFailed or (not actorSource and not propSource) then return end
				view = Instance.new("ViewportFrame")
				view.Name = "AnimatedEncyclopedia"
				view.Size = UDim2.fromScale(1, 1)
				view.BackgroundTransparency = 1
				view.Ambient = Color3.fromRGB(131, 108, 85)
				view.LightColor = Color3.fromRGB(250, 222, 171)
				view.LightDirection = Vector3.new(-0.7, -1, -0.3).Unit
				view.ZIndex = image.ZIndex + 1
				view.Parent = art
				local world = Instance.new("WorldModel")
				world.Parent = view
				camera = Instance.new("Camera")
				camera.FieldOfView = 38
				camera.CFrame = CFrame.lookAt(Vector3.new(6, 4.3, 11.5), Vector3.new(0, 2.3, 0))
				camera.Parent = view
				view.CurrentCamera = camera
				local function mount(source, extent, x, y, z, person)
					local model = source:Clone()
					model.Parent = world
					for _, part in model:GetDescendants() do
						if part:IsA("BasePart") then
							part.Anchored = true
							part.CanCollide = false
							part.CanTouch = false
							part.CanQuery = false
						end
					end
					local ok = pcall(function()
						local _, dim = model:GetBoundingBox()
						local maxdim = if person then dim.Y else math.max(dim.X, dim.Y, dim.Z)
						model:ScaleTo(model:GetScale() * extent / math.max(maxdim, 0.05))
						local box = model:GetBoundingBox()
						model:PivotTo(CFrame.new(x, y, z) * CFrame.new(-box.Position) * model:GetPivot())
					end)
					if not ok then model:Destroy(); return nil, nil end
					return model, model:GetPivot()
				end
				if actorSource then
					actor, actorPivot = mount(actorSource, 4.6, if propSource then -1.2 else 0, 2.4, 0, true)
					if actor then shoulder = actor:FindFirstChild("RightShoulder", true) end
				end
				if propSource then
					local ship = (spec.prop and spec.prop[1] == "Naval" and (string.sub(spec.prop[2], 1, 5) == "ship-" or string.sub(spec.prop[2], 1, 5) == "boat-")) or spec.motion == "fog" or spec.motion == "storm" or card.id == "hero_captain" or card.id == "scorch"
					prop, propPivot = mount(propSource, if ship then 5.5 elseif card.row == "cannon" then 3.2 else 2.3,
						if actorSource then 1.95 else 0, if ship then 1.75 else 1.95, if ship then -1.5 else 0.6, false)
				end
				if not actor and not prop then
					sceneFailed = true
					releaseScene()
				end
			end

			-- 판화와 움직이는 오브젝트를 한 카드 내부에 한정한다.
			local wash = Instance.new("Frame")
			wash.Size = UDim2.fromScale(1, 1)
			wash.BackgroundColor3 = if spec.motion == "fire" then Color3.fromRGB(165, 82, 39)
				elseif spec.motion == "storm" then Color3.fromRGB(65, 82, 95)
				else Color3.fromRGB(147, 116, 72)
			wash.BackgroundTransparency = 0.84
			wash.BorderSizePixel = 0
			wash.ZIndex = image.ZIndex + 2
			wash.Parent = art
			local vignette = Instance.new("UIGradient")
			vignette.Rotation = 90
			vignette.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.28), NumberSequenceKeypoint.new(0.35, 1),
				NumberSequenceKeypoint.new(0.73, 1), NumberSequenceKeypoint.new(1, 0.22),
			})
			vignette.Parent = wash
			local mist = Instance.new("Frame")
			mist.Name = "MovingSeaSpray"
			mist.Position = UDim2.fromScale(-0.25, 0.72)
			mist.Size = UDim2.fromScale(1.5, 0.28)
			mist.BackgroundColor3 = if spec.motion == "fire" then Color3.fromRGB(244, 183, 114)
				else Color3.fromRGB(209, 215, 197)
			mist.BackgroundTransparency = 0.75
			mist.BorderSizePixel = 0
			mist.ZIndex = image.ZIndex + 3
			mist.Parent = art
			local fade = Instance.new("UIGradient")
			fade.Rotation = 90
			fade.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.45, 0.65),
				NumberSequenceKeypoint.new(0.8, 0.33), NumberSequenceKeypoint.new(1, 1),
			})
			fade.Parent = mist
			local shine = Instance.new("Frame")
			shine.Size = UDim2.fromScale(0.19, 1.4)
			shine.Position = UDim2.fromScale(-0.5, -0.2)
			shine.BackgroundColor3 = Color3.fromRGB(255, 229, 160)
			shine.BackgroundTransparency = 0.88
			shine.BorderSizePixel = 0
			shine.Rotation = 23
			shine.ZIndex = image.ZIndex + 4
			shine.Parent = art
			local beam = Instance.new("UIGradient")
			beam.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.5, 0.2),
				NumberSequenceKeypoint.new(1, 1),
			})
			beam.Parent = shine
			local active, elapsed, sampled = true, 0, 0
			local destroying
			-- 같은 회화풍의 고서 캡션이 그림 위에 겹치되 카드 이름·전투력은 가리지 않는다.
			local inscription = Instance.new("TextLabel")
			inscription.Name = "EngravingCaption"
			inscription.Position = UDim2.fromScale(0.04, 0.03)
			inscription.Size = UDim2.fromScale(0.92, 0.19)
			inscription.BackgroundColor3 = Color3.fromRGB(39, 32, 28)
			inscription.BackgroundTransparency = 0.49
			inscription.BorderSizePixel = 0
			inscription.Text = if english then cardName(card) else spec.scene or card.name
			inscription.TextColor3 = Color3.fromRGB(249, 223, 178)
			inscription.TextSize = 11
			inscription.TextScaled = true
			inscription.Font = Enum.Font.Antique
			inscription.TextStrokeTransparency = 0.5
			inscription.ZIndex = image.ZIndex + 5
			inscription.Parent = art
			local combatFlash = Instance.new("Frame")
			combatFlash.Name = "WeatherAndMuzzleFlash"
			combatFlash.Position = UDim2.fromScale(0, 0)
			combatFlash.Size = UDim2.fromScale(1, 1)
			combatFlash.BackgroundColor3 = if spec.motion == "fire" then Color3.fromRGB(255, 171, 69)
				elseif spec.motion == "heal" or spec.motion == "clear" then Color3.fromRGB(225, 235, 193)
				elseif spec.motion == "storm" then Color3.fromRGB(185, 207, 247)
				else Color3.fromRGB(237, 204, 136)
			combatFlash.BackgroundTransparency = 1
			combatFlash.BorderSizePixel = 0
			combatFlash.ZIndex = image.ZIndex + 4
			combatFlash.Parent = art
			local function stop()
				if not active then return end
				active = false
				if destroying then destroying:Disconnect() end
				releaseScene()
				wash:Destroy()
				mist:Destroy()
				shine:Destroy()
				inscription:Destroy()
				combatFlash:Destroy()
			end
			local function step(dt)
				if not active then return end
				elapsed += math.min(dt, 0.1)
				local focused = art.Parent and art.Parent:GetAttribute("ArtFocused") == true
				if focused then ensureScene() elseif view then releaseScene() end
				-- [모션] 확대 도판은 실제 렌더 프레임마다, 나머지 카드는 최대 30fps로 갱신한다.
				-- 실제 갱신율은 기기 성능과 Roblox 렌더링에 따른다.
				if not focused and elapsed - sampled < 1 / 30 - 0.002 then return end
				sampled = elapsed
				local motion = spec.motion or "wind"
				local wave = math.sin(elapsed * (if motion == "storm" then 3.5 elseif motion == "gallop" then 5.5 else 2.1))
				local wind = math.sin(elapsed * 1.17)
				local beat = (elapsed % (if motion == "storm" then 3.8 else 2.9)) / (if motion == "storm" then 3.8 else 2.9)
				local impact = math.exp(-((beat - 0.48) * 15) ^ 2)
				local prepare = math.exp(-((beat - 0.31) * 6) ^ 2)
				local attack = motion == "slash" or motion == "thrust" or motion == "board"
				local gunshot = motion == "fire" or motion == "aim"
				local leap = motion == "pounce" or motion == "gallop"
				local recoil = if gunshot then 0.46 * impact else 0
				local lunge = if attack then 0.8 * impact elseif motion == "pounce" then 0.9 * impact else 0
				-- 배경은 가볍게 패럴랙스, 캐릭터·무기·함선은 독립된 장면 안에서 실제 동작한다.
				local pan = (if motion == "retreat" then 0.07 else 0.018) * wind
				image.Position = UDim2.fromScale(0.5 + pan - 0.045 * lunge + 0.02 * recoil,
					0.5 + (if motion == "storm" then 0.039 else 0.019) * wave - 0.015 * impact)
				image.Rotation = if motion == "storm" then 1.2 * wave elseif motion == "gallop" then 0.8 * wave else 0
				image.Size = UDim2.fromScale(1.17 + (if focused then 0.04 else 0) + 0.025 * impact, 1.17 + (if focused then 0.04 else 0) + 0.025 * impact)
				mist.Position = UDim2.fromScale(-0.25 + math.sin(elapsed * 0.55) * 0.11, 0.72 + wave * 0.038)
				mist.BackgroundTransparency = if motion == "storm" or motion == "fog" then 0.44 + 0.15 * wave
					elseif motion == "fire" then 0.65 - 0.2 * impact
					elseif leap then 0.64 + 0.2 * wave
					elseif motion == "clear" or motion == "wind" then 0.83 + 0.05 * wave
					else 0.75 + 0.05 * wave
				combatFlash.BackgroundTransparency = if gunshot then 1 - 0.65 * impact
					elseif motion == "storm" then if math.sin(elapsed * 0.54) > 0.978 then 0.36 else 1
					elseif attack or motion == "pounce" then 1 - 0.24 * impact
					elseif motion == "heal" or motion == "clear" then 0.94 + 0.05 * wind
					else 1
				shine.Position = UDim2.fromScale((elapsed % 5.5) / 5.5 * 1.8 - 0.5, -0.2)
				shine.BackgroundTransparency = if focused or card.hero then 0.74 else 0.94
				if actor and actorPivot then
					local jump = if motion == "pounce" then 0.95 * impact
						elseif motion == "gallop" then 0.24 * math.abs(wave)
						elseif motion == "heal" then -0.22 * prepare else 0.06 * wave
					local advance = if motion == "retreat" then 0.7 * wind elseif leap then 0.55 * impact else lunge
					local turn = if motion == "scout" then -0.3 * wind
						elseif motion == "guard" then 0.2 * prepare
						elseif attack then -0.55 * impact
						elseif gunshot then 0.12 * impact else 0.05 * wave
					actor:PivotTo(actorPivot * CFrame.new(0, jump, -advance + recoil)
						* CFrame.Angles(if gunshot then 0.16 * impact else 0,
							turn, if motion == "slash" then -0.13 * impact else 0.022 * wave))
					if shoulder and shoulder:IsA("Motor6D") then
						shoulder.Transform = CFrame.Angles(
							if attack then -1.08 * impact + 0.28 * prepare
							elseif motion == "command" then -0.75 * prepare
							elseif gunshot then -0.22 + 0.32 * impact
							elseif motion == "heal" then -0.34 * prepare
							else -0.08 * wave, 0, if motion == "slash" then 0.38 * impact else 0)
					end
				end
				if prop and propPivot then
					local ship = (spec.prop and spec.prop[1] == "Naval" and (string.sub(spec.prop[2], 1, 5) == "ship-" or string.sub(spec.prop[2], 1, 5) == "boat-")) or motion == "storm" or motion == "fog" or motion == "wind" or motion == "retreat" or motion == "clear" or motion == "board"
					local roll = if ship then (if motion == "storm" then 0.3 else 0.13) * wave
						elseif motion == "slash" then -1.05 * impact + 0.36 * prepare
						elseif motion == "thrust" then -0.48 * impact
						elseif motion == "guard" then -0.28 * prepare
						elseif gunshot then 0.16 * impact else 0.08 * wave
					local slide = if motion == "fire" then -0.54 * impact elseif motion == "retreat" then -0.6 * wind elseif attack then -0.3 * impact else 0
					prop:PivotTo(propPivot * CFrame.new(slide, 0.07 * wave, if motion == "thrust" then -0.8 * impact else 0)
						* CFrame.Angles(0, 0.09 * wind, roll))
				end
				if view and camera then
					local shake = if gunshot then 0.15 * impact elseif motion == "storm" then 0.08 * wave else 0
					camera.CFrame = CFrame.lookAt(Vector3.new(6 + shake, 4.3 + 0.08 * wave, 11.5 - 0.18 * impact), Vector3.new(0, 2.3 + 0.07 * wave, 0))
					view.LightColor = if gunshot and impact > 0.5 then Color3.fromRGB(255, 175, 98) else Color3.fromRGB(250, 222, 171)
				end
			end
			destroying = art.Destroying:Connect(stop)
			return { step = step, stop = stop }
		end


		-- 규칙·원화를 읽을 수 있는 확대 도판: 두 번 누르기 조작은 그대로 보존한다.
		local focusFrame = Instance.new("Frame")
		focusFrame.Name = "NavalCardCodexPreview"
		focusFrame.AnchorPoint = Vector2.new(0.5, 0.5)
		focusFrame.Position = UDim2.fromScale(0.5, 0.5)
		focusFrame.Size = UDim2.fromScale(0.9, 0.82)
		local focusBounds = Instance.new("UISizeConstraint")
		focusBounds.MaxSize = Vector2.new(430, 620)
		focusBounds.MinSize = Vector2.new(145, 210)
		focusBounds.Parent = focusFrame
		local focusRatio = Instance.new("UIAspectRatioConstraint")
		focusRatio.AspectRatio = 0.69
		focusRatio.DominantAxis = Enum.DominantAxis.Height
		focusRatio.Parent = focusFrame
		focusFrame.BackgroundColor3 = Color3.fromRGB(50, 35, 25)
		focusFrame.BackgroundTransparency = 0.02
		focusFrame.BorderSizePixel = 0
		focusFrame.ClipsDescendants = true
		focusFrame.Visible = false
		focusFrame.ZIndex = 50
		-- [확대 카드] 어두운 배경을 터치하면 선택을 취소하고 기존 카드 대전으로 돌아간다.
		local focusShade = Instance.new("TextButton")
		focusShade.Name = "CardFocusBackdrop"
		focusShade.Size = UDim2.fromScale(1, 1)
		focusShade.BackgroundColor3 = Color3.new(0, 0, 0)
		focusShade.BackgroundTransparency = 1
		focusShade.BorderSizePixel = 0
		focusShade.Text = ""
		focusShade.AutoButtonColor = false
		focusShade.Visible = false
		focusShade.ZIndex = 49
		focusShade.Parent = g
		focusFrame.Parent = g
		local focusScale = Instance.new("UIScale")
		focusScale.Scale = 1
		focusScale.Parent = focusFrame
		local focusTween
		local focusEdge = frameEdge(focusFrame, Color3.fromRGB(224, 179, 99), 7)
		focusEdge.Thickness = 3
		local focusPaper = Instance.new("ImageLabel")
		focusPaper.Size = UDim2.fromScale(1, 1)
		focusPaper.BackgroundTransparency = 1
		focusPaper.Image = if AssetIds["Menu/parchment_grain"] then "rbxassetid://" .. tostring(AssetIds["Menu/parchment_grain"]) else ""
		focusPaper.ImageColor3 = Color3.fromRGB(174, 134, 83)
		focusPaper.ImageTransparency = 0.43
		focusPaper.ScaleType = Enum.ScaleType.Crop
		focusPaper.ZIndex = 50
		focusPaper.Parent = focusFrame
		local focusArtwork = Instance.new("Frame")
		focusArtwork.Name = "CodexPainting"
		focusArtwork.Position = UDim2.fromScale(0.035, 0.095)
		focusArtwork.Size = UDim2.fromScale(0.93, 0.64)
		focusArtwork.BackgroundColor3 = Color3.fromRGB(77, 58, 43)
		focusArtwork.BorderSizePixel = 0
		focusArtwork.ClipsDescendants = true
		focusArtwork.ZIndex = 51
		focusArtwork.Parent = focusFrame
		local focusTap = Instance.new("TextButton")
		focusTap.Name = "UseEnlargedCard"
		focusTap.Size = UDim2.fromScale(1, 1)
		focusTap.BackgroundTransparency = 1
		focusTap.BorderSizePixel = 0
		focusTap.Text = ""
		focusTap.AutoButtonColor = false
		focusTap.ZIndex = 59
		focusTap.Parent = focusArtwork
		local focusImage = Instance.new("ImageLabel")
		focusImage.AnchorPoint = Vector2.new(0.5, 0.5)
		focusImage.Position = UDim2.fromScale(0.5, 0.5)
		focusImage.Size = UDim2.fromScale(1.14, 1.14)
		focusImage.BackgroundTransparency = 1
		focusImage.ScaleType = Enum.ScaleType.Crop
		focusImage.ImageColor3 = Color3.fromRGB(239, 214, 174)
		focusImage.ZIndex = 52
		focusImage.Parent = focusArtwork
		local focusName = label(focusFrame, "", 17, Color3.fromRGB(247, 211, 151), true)
		focusName.Position = UDim2.fromScale(0.045, 0.017)
		focusName.Size = UDim2.fromScale(0.8, 0.075)
		focusName.TextStrokeTransparency = 0.38
		focusName.Font = Enum.Font.Antique
		focusName.ZIndex = 53
		local focusRule = label(focusFrame, "", 14, ink, true)
		focusRule.Position = UDim2.fromScale(0.035, 0.75)
		focusRule.Size = UDim2.fromScale(0.93, 0.17)
		focusRule.BackgroundColor3 = Color3.fromRGB(233, 213, 170)
		focusRule.BackgroundTransparency = 0.08
		focusRule.BorderSizePixel = 0
		focusRule.TextScaled = true
		focusRule.TextWrapped = true
		focusRule.TextStrokeTransparency = 1
		focusRule.Font = Enum.Font.Antique
		focusRule.ZIndex = 52
		frameEdge(focusRule, brass, 4)
		-- 확대 도판에서도 기존 두 번 누르기와 동일한 전투 판정을 호출한다.
		local focusUse = Instance.new("TextButton")
		focusUse.Name = "UseCard"
		focusUse.Position = UDim2.fromScale(0.035, 0.926)
		focusUse.Size = UDim2.fromScale(0.93, 0.067)
		focusUse.Text = t("카드 사용", "Play Card")
		focusUse.TextScaled = true
		focusUse.Font = Enum.Font.Antique
		focusUse.TextColor3 = Color3.fromRGB(51, 36, 24)
		focusUse.BackgroundColor3 = Color3.fromRGB(232, 194, 120)
		focusUse.ZIndex = 55
		focusUse.Parent = focusFrame
		frameEdge(focusUse, brass, 4)
		local focusClose = Instance.new("TextButton")
		focusClose.Name = "CloseCard"
		focusClose.Position = UDim2.fromScale(0.85, 0.017)
		focusClose.Size = UDim2.fromScale(0.11, 0.075)
		focusClose.BackgroundColor3 = Color3.fromRGB(85, 55, 41)
		focusClose.TextColor3 = Color3.fromRGB(247, 226, 181)
		focusClose.Text = "×"
		focusClose.TextScaled = true
		focusClose.ZIndex = 55
		focusClose.Parent = focusFrame
		frameEdge(focusClose, brass, 4)
		local selectedPlay
		local focusMotion
		local function showCardCodex(card, readOnly)
			if focusMotion then
				focusMotion.stop()
				for i = #cardMotions, 1, -1 do
					if cardMotions[i] == focusMotion then table.remove(cardMotions, i); break end
				end
				focusMotion = nil
			end
			if focusTween then focusTween:Cancel(); focusTween = nil end
			if not card then
				focusArtwork:SetAttribute("ArtFocused", false)
				focusFrame.Visible = false
				focusShade.Visible = false
				return
			end
			-- [배치 카드] 손패가 아닌 전장 카드는 읽기 전용 확대만 허용한다.
			focusUse.Visible = not readOnly
			-- [크기] 화면 가장자리 여백을 남기고 0.69 비율로 최대 620px까지 확대한다.
			local screenSize = bg.AbsoluteSize
			local height = math.floor(math.max(210, math.min(screenSize.Y * 0.86, screenSize.X * 0.9 / 0.69, 620)))
			focusFrame.Size = UDim2.fromOffset(math.floor(height * 0.69), height)
			focusScale.Scale = 0.78
			focusShade.BackgroundTransparency = 1
			focusShade.Visible = true
			focusArtwork:SetAttribute("ArtFocused", true)
			focusFrame.Visible = true
			TweenService:Create(focusShade, TweenInfo.new(0.2), { BackgroundTransparency = 0.3 }):Play()
			focusTween = TweenService:Create(focusScale, TweenInfo.new(0.26, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), { Scale = 1 })
			focusTween:Play()
			local artKey = cardArtworkKey(card)
			focusImage.Image = if AssetIds[artKey] then "rbxassetid://" .. tostring(AssetIds[artKey]) else ""
			-- [확대 카드] 지역 덱과 선박·유물·동물·원더 분류를 판독할 수 있게 표시한다.
			local regionId = if type(card.id) == "string" then string.match(card.id, "^(%a%a)_%d%d$") else nil
			local regionDeck = if regionId then CARD_DECK[regionId] else nil
			focusEdge.Color = if regionDeck then regionDeck.color else brass
			focusName.Text = if regionDeck then (if english then regionDeck.en else regionDeck.ko) .. " · " .. cardName(card) else cardName(card)
			local row = if card.row then rowName(card.row) else t("전술", "Tactic")
			local category = if card.category then (if english then englishCategories[card.category] or card.category else card.category) .. " · " else ""
			local strength = if card.power then t(" · 전투력 ", " · Power ") .. tostring(card.power) else ""
			local description = cardDescription(card)
			local lore = cardLore(card)
			focusRule.Text = category .. row .. strength .. "\n" .. description .. (if lore then "\n" .. lore else "")
			focusMotion = animateCardArt(focusArtwork, focusImage, card)
			table.insert(cardMotions, focusMotion)
		end
		local function closeCardCodex()
			if selected and selected.Parent then
				selected.Rotation = 0
				selected.UIStroke.Color = brass
				selected:SetAttribute("ArtFocused", false)
			end
			selected = nil
			selectedPlay = nil
			showCardCodex(nil)
		end
		focusClose.Activated:Connect(closeCardCodex)
		focusShade.Activated:Connect(closeCardCodex)
		focusUse.Activated:Connect(function()
			if selectedPlay then selectedPlay() end
		end)
		focusTap.Activated:Connect(function()
			if selectedPlay then selectedPlay() else closeCardCodex() end
		end)
		render = function()
			selectedPlay = nil
			showCardCodex(nil)
			for _, moving in cardMotions do moving.stop() end
			table.clear(cardMotions)
			selected = nil
			for _, ch in boardFrame:GetChildren() do
				ch:Destroy()
			end
			for _, ch in handFrame:GetChildren() do
				if ch:IsA("TextButton") then
					ch:Destroy()
				end
			end
			local weather = {}
			for _, row in BC.ROWS do
				if m.weather[row] then
					table.insert(weather, rowName(row) .. t(" 약화", " weakened"))
				end
			end
			local foeCulture = m.faction and m.faction.foe and BC.Factions[m.faction.foe]
			local myCulture = m.faction and m.faction.me and BC.Factions[m.faction.me]
			foePlate.who.Text = (if english then "Pirates" else opts.enemyName or "해적")
				.. (if foeCulture then " · " .. (if english then englishFactions[m.faction.foe] or foeCulture.name else foeCulture.name) else "")
				.. (if m.passed.foe then t(" · 멈춤", " · Passed") elseif m.turn == "foe" and not m.over then t(" · 차례", " · Turn") else "")
			mePlate.who.Text = (if english then "Your ship" else opts.shipName or "우리 배")
				.. (if myCulture then " · " .. (if english then englishFactions[m.faction.me] or myCulture.name else myCulture.name) else "")
				.. (if m.passed.me then t(" · 멈춤", " · Passed") elseif m.turn == "me" and not m.over then t(" · 내 차례", " · Your turn") else "")
			foePlate.total.Text = tostring(BC.total(m, "foe"))
			mePlate.total.Text = tostring(BC.total(m, "me"))
			foePlate.gems.Text = string.rep("◆", 2 - m.wins.me) .. string.rep("◇", m.wins.me)
			mePlate.gems.Text = string.rep("◆", 2 - m.wins.foe) .. string.rep("◇", m.wins.foe)
			mePlate.gems.TextColor3 = Color3.fromRGB(120, 220, 140)
			weatherTag.Text = (if #weather > 0 then table.concat(weather, " · ") else t(string.format("%d판째", m.round), string.format("Round %d", m.round)))
				.. (if m.sea and m.sea.id ~= "calm" and not english then " · " .. m.sea.name else "")
			if m.turn == "me" and not m.over and adviceRound ~= m.round and adviceCount < 3 then
				local tip = BC.advice(m, "me")
				if tip then
					adviceRound, adviceCount = m.round, adviceCount + 1
					sayAdvice(if english then tip else string.format("%s: %s", opts.advisorName or "동료", tip), 7)
				end
			end
			header.Text = if english then string.format("%s · Round %d   You %d : %d Pirates · %s",
				TITLE, m.round, BC.total(m, "me"), BC.total(m, "foe"),
				if m.over then "Battle Over" elseif m.turn == "me" then "Your Turn" else "Enemy Turn")
				else string.format("%s · %d판   우리 %d : %d 해적   ·   %s",
					TITLE, m.round, BC.total(m, "me"), BC.total(m, "foe"),
					if m.over then "전투 종료" elseif m.turn == "me" then "내 차례" else "해적 차례")
			header.Text ..= if english then string.format("\nWins %d:%d   Hand %d:%d%s", m.wins.me, m.wins.foe,
				#m.hand.me, #m.hand.foe, if #weather > 0 then " · " .. table.concat(weather, ", ") else "")
				else string.format("\n승리 %d:%d   손패 %d:%d%s", m.wins.me, m.wins.foe,
					#m.hand.me, #m.hand.foe, if #weather > 0 then " · " .. table.concat(weather, ", ") else "")
			-- 줄: 위 3줄은 해적(포·사격·근접), 아래 3줄은 우리(근접·사격·포)
			local order = { { "foe", "cannon" }, { "foe", "ranged" }, { "foe", "melee" }, { "me", "melee" }, { "me", "ranged" }, { "me", "cannon" } }
			for k, o in order do
				local side, row = o[1], o[2]
				local rf = Instance.new("Frame")
				rf.Position = UDim2.fromScale(0, (k - 1) / 6)
				rf.Size = UDim2.fromScale(1, 1 / 6 - 0.012)
				-- [6열 고급 전장] 적은 진홍, 아군은 남청으로 표시한다. 전투 위치와 계산은 불변.
				rf.BackgroundColor3 = if side == "me" then Color3.fromRGB(18, 57, 74) else Color3.fromRGB(65, 35, 54)
				rf.BackgroundTransparency = if cfg then 0.53 else 0.32
				rf.BorderSizePixel = 0
				rf.Parent = boardFrame
				local laneGradient = Instance.new("UIGradient")
				laneGradient.Color = if side == "me" then ColorSequence.new({
					ColorSequenceKeypoint.new(0, Color3.fromRGB(21, 68, 91)),
					ColorSequenceKeypoint.new(0.5, Color3.fromRGB(12, 32, 52)),
					ColorSequenceKeypoint.new(1, Color3.fromRGB(27, 58, 76)),
				}) else ColorSequence.new({
					ColorSequenceKeypoint.new(0, Color3.fromRGB(91, 45, 60)),
					ColorSequenceKeypoint.new(0.5, Color3.fromRGB(43, 26, 47)),
					ColorSequenceKeypoint.new(1, Color3.fromRGB(74, 34, 53)),
				})
				laneGradient.Rotation = 0
				laneGradient.Parent = rf
				local laneStroke = frameEdge(rf, Color3.fromRGB(188, 142, 79), 4)
				laneStroke.Transparency = 0.14
				laneStroke.Thickness = 1
				local laneAccent = Instance.new("Frame")
				laneAccent.Name = "SideLaneAccent"
				laneAccent.Size = UDim2.new(0, 3, 1, 0)
				laneAccent.BackgroundColor3 = if side == "me" then Color3.fromRGB(88, 170, 212) else Color3.fromRGB(214, 115, 110)
				laneAccent.BorderSizePixel = 0
				laneAccent.Parent = rf
				emblem(rf, rowIcons[row], UDim2.new(0, 4, 0.5, 0), UDim2.new(0, 21, 0.8, 0))
				local mult, adv, dis = BC.rowMatchup(m, side, row)
				local tag = label(rf, string.format("%s\n%d%s", rowName(row), BC.rowTotal(m, side, row), if adv and dis then " ▲▼" elseif adv then t(" ▲상성", " ▲Adv") elseif dis then t(" ▼불리", " ▼Dis") else ""), 13, Color3.fromRGB(246, 208, 130))
				tag.Position = UDim2.fromOffset(29, 0)
				tag.Size = UDim2.new(0, 68, 1, 0)
				tag.TextXAlignment = Enum.TextXAlignment.Left
				tag.TextColor3 = if adv and not dis then Color3.fromRGB(150, 235, 150) elseif dis and not adv then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(246, 208, 130)
				local cards = Instance.new("Frame")
				cards.Position = UDim2.fromOffset(104, 3)
				cards.Size = UDim2.new(1, -108, 1, -6)
				cards.BackgroundTransparency = 1
				cards.Parent = rf
				rowTargets[side][row] = cards
				local lay = Instance.new("UIListLayout")
				lay.FillDirection = Enum.FillDirection.Horizontal
				lay.Padding = UDim.new(0, 4)
				lay.Parent = cards
				for idx, c in m.rows[side][row] do
					local playedCard = chip(cards, c, 62, BC.cardPower(m, side, row, idx), c == lastPlayed.me or c == lastPlayed.foe)
					playedCard.Activated:Connect(function()
						if playing or finished then return end
						closeCardCodex()
						showCardCodex(c, true)
					end)
				end
			end
			-- 손패 (내 차례에는 카드마다 '추천 수' 점수 변화를 보여 준다)
			local hints, bestHint = {}, nil
			if m.turn == "me" and not m.over then
				hints, bestHint = BC.hint(m, "me")
			end
			for i, c in m.hand.me do
				local b = Instance.new("TextButton")
				b.Size = UDim2.new(0, 140, 1, -10)
				local cardRatio = Instance.new("UIAspectRatioConstraint")
				cardRatio.AspectRatio = 0.69
				cardRatio.DominantAxis = Enum.DominantAxis.Height
				cardRatio.Parent = b
				b.LayoutOrder = i
				local regionId = if type(c.id) == "string" then string.match(c.id, "^(%a%a)_%d%d$") else nil
				local regionDeck = if regionId then CARD_DECK[regionId] else nil
				b.BackgroundColor3 = if c.hero then Color3.fromRGB(107, 72, 40)
					elseif c.special then Color3.fromRGB(66, 75, 76) else Color3.fromRGB(78, 58, 39)
				b.TextColor3 = Color3.fromRGB(250, 236, 200)
				b.Font = Enum.Font.GothamBold
				b.TextScaled = true
				b.BorderSizePixel = 0
				b.BackgroundTransparency = if m.turn == "me" then 0 else 0.5
				local sub = if c.special then cardDescription(c) else rowName(c.row) .. (if c.ability then " · " .. (if english then englishAbilities[c.ability] or "" else ABIL[c.ability] or "") else "")
				b.Text = ""
				local art = Instance.new("Frame")
				art.Name = "Artwork"
				art.Archivable = false
				art.Position = UDim2.fromOffset(3, 3)
				art.Size = UDim2.new(1, -6, 0.69, -3)
				art.BackgroundColor3 = Color3.fromRGB(88, 67, 46)
				art.BorderSizePixel = 0
				art.ClipsDescendants = true
				art.Parent = b
				frameEdge(art, if c.hero then Color3.fromRGB(231, 188, 104) elseif regionDeck then regionDeck.color else Color3.fromRGB(153, 115, 70), 3)
				if regionDeck then
					local origin = label(b, if english then regionDeck.en else regionDeck.ko, 10, Color3.fromRGB(255, 248, 222), true)
					origin.Name = "CardDeckOrigin"
					origin.Position = UDim2.fromScale(0.57, 0.56)
					origin.Size = UDim2.fromScale(0.4, 0.1)
					origin.BackgroundColor3 = regionDeck.color
					origin.BackgroundTransparency = 0.24
					origin.TextScaled = true
					origin.TextXAlignment = Enum.TextXAlignment.Center
					origin.ZIndex = 8
				end
				local kindText = if c.category then (if english then englishCategories[c.category] or c.category else c.category)
					elseif c.special then t("전술", "Tactic") elseif c.hero then t("영웅", "Hero")
					elseif c.ability then (if english then englishAbilities[c.ability] or "" else ABIL[c.ability] or "")
					else rowName(c.row)
				local kindLabel = label(b, kindText, 10, if c.hero then Color3.fromRGB(255, 226, 143) else Color3.fromRGB(238, 220, 180), true)
				kindLabel.Position = UDim2.fromScale(0.48, 0.03)
				kindLabel.Size = UDim2.fromScale(0.48, 0.14)
				kindLabel.TextXAlignment = Enum.TextXAlignment.Right
				kindLabel.TextStrokeTransparency = 0.28
				kindLabel.ZIndex = 8
				-- 정보부는 낡은 양피지 띠, 그림부는 움직이는 판화로 분리한다.
				local parchmentBand = Instance.new("Frame")
				parchmentBand.Name = "ParchmentCaption"
				parchmentBand.Position = UDim2.fromScale(0.025, 0.69)
				parchmentBand.Size = UDim2.fromScale(0.95, 0.29)
				parchmentBand.BackgroundColor3 = if c.hero then Color3.fromRGB(243, 215, 153) else paper
				parchmentBand.BorderSizePixel = 0
				parchmentBand.Parent = b
				frameEdge(parchmentBand, brass, 3)
				local image = Instance.new("ImageLabel")
				image.AnchorPoint = Vector2.new(0.5, 0.5)
				image.Position = UDim2.fromScale(0.5, 0.5)
				image.Size = UDim2.fromScale(1.17, 1.17)
				image.BackgroundTransparency = 1
				image.ScaleType = Enum.ScaleType.Crop
				local artKey = cardArtworkKey(c)
				image.Image = if AssetIds[artKey] then "rbxassetid://" .. tostring(AssetIds[artKey]) else ""
				image.ImageColor3 = Color3.fromRGB(236, 214, 175)
				image.Parent = art
				table.insert(cardMotions, animateCardArt(art, image, c))
				local caption = label(b, cardName(c), 13, ink, true)
				caption.Position = UDim2.fromScale(0.25, 0.7)
				caption.Size = UDim2.fromScale(0.71, 0.27)
				caption.TextScaled = true
				caption.TextStrokeTransparency = 1
				caption.Font = Enum.Font.Antique
				local iconKey = if c.special then "Menu/tech" elseif c.ability == "spy" then "Menu/explore" else rowIcons[c.row]
				emblem(b, iconKey, UDim2.fromScale(0.035, 0.83), UDim2.fromScale(0.20, 0.22))
				local power = label(b, if c.special then "◆" else tostring(c.power or ""), 13, ink, true)
				power.Position = UDim2.fromOffset(5, 5)
				power.Size = UDim2.fromOffset(21, 20)
				power.BackgroundColor3 = paper
				power.BackgroundTransparency = 0
				power.TextStrokeTransparency = 1
				power.ZIndex = 4
				frameEdge(power, brass, 5)
				if hints[i] then
					local g = hints[i]
					local tipLabel = label(b, string.format("%s%d", if g >= 0 then "+" else "", g), 13, if g > 0 then Color3.fromRGB(150, 235, 150) elseif g < 0 then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(230, 220, 200), true)
					tipLabel.AnchorPoint = Vector2.new(1, 0)
					tipLabel.Position = UDim2.new(1, -4, 0, 5)
					tipLabel.Size = UDim2.fromOffset(if i == bestHint then 40 else 28, 20)
					tipLabel.Text = (if i == bestHint then t("추천 ", "Best ") else "") .. tipLabel.Text
					tipLabel.TextStrokeTransparency = 1
					tipLabel.BackgroundColor3 = Color3.fromRGB(34, 28, 22)
					tipLabel.BackgroundTransparency = 0.2
					tipLabel.ZIndex = 8
				end
				b.Parent = handFrame
				local edge = frameEdge(b, if c.hero then Color3.fromRGB(243, 206, 118) else brass, 6)

				local function playChosenCard()
					if playing or auto or finished or m.turn ~= "me" or m.over or selected ~= b or not b.Parent then return end
					playing = true
					showCardCodex(nil)
					local side = if c.ability == "spy" then "foe" else "me"
					local target = if c.special then boardFrame else rowTargets[side][c.row]
					local flight = b:Clone()
					flight.Active = false
					flight.Interactable = false
					flight.AnchorPoint = Vector2.new(0.5, 0.5)
					flight.Size = UDim2.fromOffset(b.AbsoluteSize.X, b.AbsoluteSize.Y)
					local start = b.AbsolutePosition + b.AbsoluteSize / 2 - bg.AbsolutePosition
					local finishAt = target.AbsolutePosition - bg.AbsolutePosition + Vector2.new(
						if c.special then target.AbsoluteSize.X / 2 else math.min(math.max(31, target.AbsoluteSize.X - 31), 31 + 66 * #m.rows[side][c.row]),
						target.AbsoluteSize.Y / 2
					)
					flight.Position = UDim2.fromOffset(start.X, start.Y)
					flight.ZIndex = 20
					flight.Parent = bg
					art.Parent = flight
					b.Visible = false
					local flightTween = TweenService:Create(flight, TweenInfo.new(0.34, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
						Position = UDim2.fromOffset(finishAt.X, finishAt.Y),
						Size = UDim2.fromOffset(if c.special then 76 else 62, math.min(b.AbsoluteSize.Y, target.AbsoluteSize.Y)),
						Rotation = 0,
					})
					flightTween:Play()
					flightTween.Completed:Wait()
					playing = false
					if finished or not g.Parent then return end
					art.Parent = b
					flight:Destroy()
					b.Visible = true
					afterAction(mine(BC.play(m, "me", i)))
				end
				b.Activated:Connect(function()
					if playing or auto or finished or m.turn ~= "me" or m.over then return end
					if selected ~= b then
						if selected and selected.Parent then
							selected.Rotation = 0
							selected.UIStroke.Color = brass
							selected:SetAttribute("ArtFocused", false)
						end
						b:SetAttribute("ArtFocused", true)
						showCardCodex(c)
						selected = b
						selectedPlay = playChosenCard
						edge.Color = Color3.fromRGB(255, 215, 126)
						TweenService:Create(b, TweenInfo.new(0.18, Enum.EasingStyle.Back), { Rotation = -4 }):Play()
						info.Text = cardName(c) .. " · " .. cardDescription(c)
							.. (if c.hero then t(" · 영웅: 날씨·소각 면역", " · Hero: weather and Scorch immune") else "")
							.. t(" · 크게 보고 사용 버튼 또는 다시 눌러 사용", " · Enlarge to inspect; tap again or Play Card")
						return
					end
					playChosenCard()
				end)
			end
			passBtn.BackgroundTransparency = if m.turn == "me" then 0 else 0.5
			leaderBtn.Caption.Text = if m.leaderUsed.me then t("지도자 (사용함)", "Leader (Used)")
				else t("지도자: ", "Leader: ") .. (if english then englishLeaders[m.leader.me] or "" else BC.Leaders[m.leader.me].name)
			leaderBtn.BackgroundTransparency = if m.leaderUsed.me then 0.6 else 0
		end
		render()
		info.Text = if english then string.format("Row advantage: Melee > Cannon > Ranged > Melee. Leader: %s",
			englishLeaders[m.leader.me] or "Command")
			else string.format("병종 상성 — 근접 > 포 > 사격 > 근접. 지도자: %s (%s)", BC.Leaders[m.leader.me].name, BC.Leaders[m.leader.me].text)

		task.spawn(function()
			task.wait(1.0)
			local guard = 0
			while not m.over and not finished and guard < 600 do
				guard += 1
				if playing then
					task.wait(0.1)
				elseif m.turn == "foe" then
					task.wait(0.9)
					if finished then break end
					local ok, msg, res, _, playedCard = BC.ai(m, "foe")
					if ok then
						afterAction(ok, if english then "Pirates" else "해적: " .. (msg or ""), res, playedCard, "foe")
					end
				elseif auto then
					task.wait(0.5)
					if finished or playing or m.turn ~= "me" or m.over then continue end
					local ok, msg, res, act, playedCard = BC.ai(m, "me")
					if ok then
						mine(ok, msg, res, act, playedCard)
						afterAction(ok, msg, res, playedCard, "me")
					end
				else
					task.wait(0.1)
				end
			end
			if finished then
				return
			end
			local wonMatch = m.winner == "me"
			flair += m.wins.me * 40 + (if wonMatch then 110 else 0)
			if cfg then
				info.Text = if wonMatch then t("카드 대결에서 이겼다! 전투 승리!", "You won the card battle!")
					elseif m.winner == "foe" then t("카드 대결에서 졌다...", "You lost the card battle.")
					else t("승부가 나지 않았다.", "The battle ended in a draw.")
			else
				info.Text = if wonMatch then t("갑판을 제압했다!", "You seized the deck!")
					elseif m.winner == "foe" then t("갑판에서 밀렸다...", "Your crew was pushed back.")
					else t("승부가 나지 않았다.", "The battle ended in a draw.")
			end
			task.wait(1.8)
			TweenService:Create(bg, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
			task.wait(0.5)
			g:Destroy()
			boardingOn = false
			onEnd(m, actions)
		end)
	end

	-- 적 포탄 낙하 경고: 바다 위 붉은 원. 포탄이 떨어질 때 원 밖에 있으면 "회피"로 콤보가 쌓인다.
	local function warnRing(center)
		local ring = part(folder, Vector3.new(0.4, 26, 26), CFrame.new(ORIGIN + center + Vector3.new(0, 0.6, 0)) * CFrame.Angles(0, 0, math.pi / 2), Color3.fromRGB(235, 60, 50), Enum.Material.Neon, Enum.PartType.Cylinder)
		ring.Transparency = 0.45
		local t0 = os.clock()
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local k = (os.clock() - t0) / 0.9
			if k >= 1 or finished then
				conn:Disconnect()
				ring:Destroy()
				return
			end
			ring.Transparency = 0.45 + k * 0.5
			ring.Size = Vector3.new(0.4, 26 - k * 8, 26 - k * 8)
		end)
		task.delay(0.9, function()
			if finished then
				return
			end
			if (me.pos - center).Magnitude > 20 then
				dodged += 1
				combo += 1
				flair += 10 + combo * 2
				comboLabel.Text = string.format("회피! 콤보 x%d", combo)
				Sfx.play("sfx_click", 0.6, 1.2 + combo * 0.05)
				task.delay(1.2, function()
					if comboLabel.Text:sub(1, 6) == "회피!" then
						comboLabel.Text = ""
					end
				end)
			else
				combo = 0
				comboLabel.Text = ""
			end
		end)
	end
	-- [해전 이펙트] 연기·파편·불꽃·물기둥·항적을 한 목록으로 관리한다 (함수 안 지역 변수 수를 아끼려고 한 표에 모음)
	local FX = { list = {}, wakeAt = {}, dmgAt = {}, cam = nil }
	local C_SMOKE, C_DARK, C_WATER, C_WOOD = Color3.fromRGB(215, 215, 220), Color3.fromRGB(62, 62, 68), Color3.fromRGB(200, 232, 245), Color3.fromRGB(104, 70, 40)
	function FX.spawn(size, pos, color, material, shape, vel, life, o)
		if #FX.list > 260 then
			return
		end
		o = o or {}
		local p = part(folder, size, if o.upright then CFrame.new(pos) * CFrame.Angles(0, 0, math.pi / 2) else CFrame.new(pos), color, material, shape)
		p.Transparency = o.t0 or 0
		table.insert(FX.list, { p = p, vel = vel or Vector3.zero, life = life, age = 0, grow = o.grow or 0, g = o.g or 0, t0 = o.t0 or 0, size = size, flat = o.flat, ring = o.ring })
	end
	function FX.update(dt)
		for i = #FX.list, 1, -1 do
			local f = FX.list[i]
			f.age += dt
			local k = f.age / f.life
			if k >= 1 then
				f.p:Destroy()
				table.remove(FX.list, i)
			else
				f.vel += Vector3.new(0, -f.g * dt, 0)
				local grow = 1 + f.grow * k
				f.p.Size = if f.ring then Vector3.new(f.size.X, f.size.Y * grow, f.size.Z * grow) elseif f.flat then Vector3.new(f.size.X * grow, f.size.Y, f.size.Z * grow) else f.size * grow
				f.p.Position += f.vel * dt
				f.p.Transparency = f.t0 + (1 - f.t0) * k * k
			end
		end
	end
	-- 연기 덩어리 n개 (dark = 불탄 검은 연기)
	function FX.smoke(pos, n, scale, dark)
		for _ = 1, n do
			local r = scale * (0.7 + math.random() * 0.6)
			FX.spawn(Vector3.new(r, r, r), pos + Vector3.new((math.random() - 0.5) * 3, 0, (math.random() - 0.5) * 3),
				if dark then C_DARK else C_SMOKE, Enum.Material.SmoothPlastic, Enum.PartType.Ball,
				Vector3.new((math.random() - 0.5) * 3, 3 + math.random() * 4, (math.random() - 0.5) * 3), 1.3 + math.random() * 0.6, { grow = if dark then 1.6 else 2.4, t0 = if dark then 0.55 else 0.3 })
		end
	end
	-- 나무 파편과 불똥
	function FX.splinters(pos, n)
		for _ = 1, n do
			local w = 0.3 + math.random() * 0.7
			FX.spawn(Vector3.new(w, w * 0.4, w * 2.2), pos, C_WOOD, Enum.Material.Wood, nil,
				Vector3.new((math.random() - 0.5) * 26, 8 + math.random() * 14, (math.random() - 0.5) * 26), 1.1 + math.random() * 0.6, { g = 38 })
		end
		for _ = 1, math.floor(n / 2) do
			FX.spawn(Vector3.new(0.5, 0.5, 0.5), pos, Color3.fromRGB(255, 190, 80), Enum.Material.Neon, Enum.PartType.Ball,
				Vector3.new((math.random() - 0.5) * 34, 6 + math.random() * 16, (math.random() - 0.5) * 34), 0.6 + math.random() * 0.3, { g = 30 })
		end
	end
	function FX.flame(pos, scale)
		FX.spawn(Vector3.new(scale, scale, scale), pos + Vector3.new((math.random() - 0.5) * 4, 0, (math.random() - 0.5) * 4), Color3.fromRGB(255, 130, 40), Enum.Material.Neon, Enum.PartType.Ball,
			Vector3.new((math.random() - 0.5) * 2, 6 + math.random() * 3, (math.random() - 0.5) * 2), 0.8, { grow = -0.6 })
	end
	-- 물기둥과 퍼지는 물결
	function FX.splash(pos)
		FX.spawn(Vector3.new(3, 2.4, 2.4), pos + Vector3.new(0, 1.5, 0), C_WATER, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder, Vector3.new(0, 11, 0), 0.9, { grow = 0.8, t0 = 0.2, g = 14, upright = true })
		FX.spawn(Vector3.new(0.3, 3, 3), pos + Vector3.new(0, 0.3, 0), C_WATER, Enum.Material.Neon, Enum.PartType.Cylinder, Vector3.zero, 1.1, { grow = 7, t0 = 0.35, ring = true, upright = true })
		for _ = 1, 6 do
			FX.spawn(Vector3.new(0.6, 0.6, 0.6), pos, C_WATER, Enum.Material.SmoothPlastic, Enum.PartType.Ball,
				Vector3.new((math.random() - 0.5) * 12, 8 + math.random() * 8, (math.random() - 0.5) * 12), 0.9, { g = 30, t0 = 0.2 })
		end
	end
	-- 포구 화염과 연기
	function FX.muzzle(from, dir)
		FX.spawn(Vector3.new(4.5, 4.5, 4.5), from, Color3.fromRGB(255, 205, 100), Enum.Material.Neon, Enum.PartType.Ball, dir * 8, 0.25, { grow = 1.2 })
		FX.smoke(from + dir * 3, 3, 3.2, false)
	end
	-- 배 뒤로 길게 남는 항적
	function FX.wake(sh, key, now)
		local last = FX.wakeAt[key]
		local moved = last and (sh.pos - last.pos).Magnitude or 0
		if not last or now - last.t >= 0.09 then
			FX.wakeAt[key] = { pos = sh.pos, t = now }
			if moved > 0.15 then
				local back = ORIGIN + sh.pos - Vector3.new(math.cos(sh.theta), 0, math.sin(sh.theta)) * (sh.length * 0.46) + Vector3.new(0, 0.25, 0)
				FX.spawn(Vector3.new(2.6, 0.2, 2.6), back, Color3.fromRGB(240, 248, 252), Enum.Material.SmoothPlastic, nil, Vector3.zero, 1.7, { grow = 2.4, t0 = 0.3, flat = true })
				FX.spawn(Vector3.new(1.4, 0.2, 1.4), ORIGIN + sh.pos + Vector3.new(math.cos(sh.theta) * sh.length * 0.5, 0.25, math.sin(sh.theta) * sh.length * 0.5), Color3.fromRGB(240, 248, 252), Enum.Material.SmoothPlastic, nil, Vector3.zero, 0.9, { grow = 1.6, t0 = 0.4, flat = true })
			end
		end
	end
	-- 피해가 쌓이면 연기가 오르고, 더 심하면 불이 붙는다
	function FX.damage(sh, key, now)
		local hp = sh.hp or 1
		if hp >= 0.65 or (FX.dmgAt[key] or 0) > now then
			return
		end
		FX.dmgAt[key] = now + (if hp < 0.35 then 0.16 else 0.3)
		local at = ORIGIN + sh.pos + Vector3.new(math.cos(sh.theta), 0, math.sin(sh.theta)) * ((math.random() - 0.5) * sh.length * 0.6) + Vector3.new(0, 9, 0)
		FX.smoke(at, 1, 2 + (1 - hp) * 2, true)
		if hp < 0.35 then
			FX.flame(at, 2.6)
		end
	end

	-- 대포 한 발
	local kick = 0 -- 포격·피격 때 순간적으로 화각이 튀는 정도
	-- 화면 가운데 잠깐 뜨는 한 줄 연출 글자
	local function popText(text, color)
		local l = label(gui, text, 30, color)
		l.AnchorPoint = Vector2.new(0.5, 0.5)
		l.Position = UDim2.new(0.5, 0, 0.3, 0)
		l.Size = UDim2.fromOffset(420, 44)
		l.TextStrokeTransparency = 0.2
		l.ZIndex = 20
		local t0 = os.clock()
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local k = (os.clock() - t0) / 1.4
			if k >= 1 or finished then
				conn:Disconnect()
				l:Destroy()
				return
			end
			l.Position = UDim2.new(0.5, 0, 0.3 - k * 0.06, 0)
			l.TextTransparency = math.max(0, (k - 0.6) / 0.4)
			l.TextStrokeTransparency = 0.2 + l.TextTransparency * 0.8
			l.TextSize = 30 + (1 - k) * 8
		end)
	end
	-- 돛대가 부러져 바다로 쓰러진다 (체력이 크게 줄어든 첫 순간)
	local function dismast(sh)
		sh.dismasted = true
		local base = ORIGIN + sh.pos + Vector3.new(0, 6, 0)
		local pole = part(folder, Vector3.new(22, 1.4, 1.4), CFrame.new(base + Vector3.new(0, 11, 0)), Color3.fromRGB(110, 76, 44), Enum.Material.Wood, Enum.PartType.Cylinder)
		local sail = part(folder, Vector3.new(14, 10, 0.3), CFrame.new(base + Vector3.new(0, 16, 0)), Color3.fromRGB(235, 228, 205), Enum.Material.Fabric)
		local dirSide = if math.random() < 0.5 then 1 else -1
		local t0 = os.clock()
		Sfx.play("sfx_creak", 0.7, 0.7)
		FX.splinters(base + Vector3.new(0, 4, 0), 14)
		FX.smoke(base + Vector3.new(0, 3, 0), 3, 3.2, true)
		shake = math.max(shake, 2)
		kick = math.max(kick, 8)
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local k = math.clamp((os.clock() - t0) / 1.6, 0, 1)
			if finished then
				conn:Disconnect()
				pole:Destroy()
				sail:Destroy()
				return
			end
			local ang = k * k * 1.45
			local cf = CFrame.new(base) * CFrame.Angles(0, 0, ang * dirSide) * CFrame.new(0, 11 - k * 4, 0)
			pole.CFrame = cf * CFrame.Angles(0, 0, math.pi / 2)
			sail.CFrame = CFrame.new(base) * CFrame.Angles(0, 0, ang * dirSide) * CFrame.new(0, 16 - k * 6, 0)
			if k >= 1 then
				conn:Disconnect()
				local at = Vector3.new(pole.Position.X, 0, pole.Position.Z)
				FX.splash(at)
				Sfx.play("sfx_naval_splash", 0.7, 0.75)
				shake = math.max(shake, 1.2)
				task.delay(2.5, function()
					pole:Destroy()
					sail:Destroy()
				end)
			end
		end)
	end
	local function shoot(fromPos, toPos, fx, nc)
		nc = nc or NC.demi
		local from = ORIGIN + fromPos + Vector3.new(0, 8, 0)
		-- 서버 기록의 확정 타격만 선체에 맞히고, 나머지 포탄은 수면에 떨어뜨린다.
		local hullHit = fx ~= nil
		local to = ORIGIN + toPos + Vector3.new(
			(math.random() - 0.5) * 10,
			if hullHit then 6 + math.random() * 3 else 0.4,
			(math.random() - 0.5) * 6
		)
		Sfx.play("sfx_naval_cannon", 0.82, 0.92 + math.random() * 0.16, "sfx_cannon")
		FX.muzzle(from, (to - from).Unit)
		shake = math.max(shake, if hullHit then 0.7 else 0.35)
		kick = math.max(kick, nc.ball * 1.6)
		if hullHit then
			task.delay(0.9, function()
				if not finished then
					Sfx.play("sfx_cannon_reload", 0.34, 0.95 + math.random() * 0.1)
				end
			end)
		end
		local flash = part(folder, Vector3.new(3, 3, 3), CFrame.new(from), Color3.fromRGB(255, 200, 90), Enum.Material.Neon, Enum.PartType.Ball)
		task.delay(0.15, function()
			flash:Destroy()
		end)
		local ball = part(folder, Vector3.new(nc.ball, nc.ball, nc.ball), CFrame.new(from), Color3.fromRGB(30, 30, 34), Enum.Material.Metal, Enum.PartType.Ball)
		local t0 = os.clock()
		local dur = nc.dur
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local u = math.clamp((os.clock() - t0) / dur, 0, 1)
			local bpos = from:Lerp(to, u) + Vector3.new(0, math.sin(u * math.pi) * nc.arc, 0)
			ball.CFrame = CFrame.new(bpos)
			if u < 1 and math.random() < 0.5 then
				FX.spawn(Vector3.new(0.9, 0.9, 0.9), bpos, C_SMOKE, Enum.Material.SmoothPlastic, Enum.PartType.Ball, Vector3.zero, 0.5, { grow = 1.5, t0 = 0.4 }) -- 포탄 꼬리
			end
			if u >= 1 then
				conn:Disconnect()
				ball:Destroy()
				if finished then
					return
				end
				-- 착탄과 물보라를 실제 포탄 충돌 프레임에 맞춰 별도 재생한다.
				if hullHit then
					Sfx.play("sfx_naval_hull_hit", 0.78, 0.88 + math.random() * 0.2, "sfx_hit")
					if math.random() < 0.4 then
						Sfx.play("sfx_creak", 0.3, 0.85 + math.random() * 0.18)
					end
				else
					Sfx.play("sfx_naval_splash", 0.55, 0.9 + math.random() * 0.22, "sfx_splash")
				end
				if hullHit then
					FX.splinters(to, 9)
					FX.smoke(to + Vector3.new(0, 2, 0), 3, 3.4, true)
					shake = math.max(shake, 1.3)
					kick = math.max(kick, 5 + nc.ball)
				else
					FX.splash(to)
				end
				local boom = part(folder, Vector3.new(2, 2, 2), CFrame.new(to),
					if hullHit then Color3.fromRGB(255, 150, 60) else Color3.fromRGB(150, 225, 245),
					Enum.Material.Neon, Enum.PartType.Ball)
				local smoke = part(folder, Vector3.new(2, 2, 2), CFrame.new(to + Vector3.new(0, 1, 0)),
					if hullHit then Color3.fromRGB(90, 90, 96) else Color3.fromRGB(205, 232, 240),
					Enum.Material.SmoothPlastic, Enum.PartType.Ball)
				smoke.Transparency = if hullHit then 0.3 else 0.52
				local s0 = os.clock()
				local c2
				c2 = RunService.Heartbeat:Connect(function()
					local k = (os.clock() - s0) / 1.0
					if k >= 1 or finished then
						c2:Disconnect()
						boom:Destroy()
						smoke:Destroy()
						return
					end
					boom.Size = Vector3.new(1, 1, 1) * (2 + k * 8)
					boom.Transparency = k
					smoke.Size = Vector3.new(1, 1, 1) * (3 + k * 10)
					smoke.Position = to + Vector3.new(0, 1 + k * 6, 0)
					smoke.Transparency = 0.3 + k * 0.7
				end)
				if fx then
					fx()
				end
			end
		end)
	end

	local function forward(theta)
		return Vector3.new(math.cos(theta), 0, math.sin(theta))
	end
	-- sink: nil 또는 { k = 0~1 침몰 진행, side = ±1 기우는 쪽 }
	local function poseShip(sh, t, sink)
		-- 방향을 틀면 바깥쪽으로 기울고(롤), 속도가 붙으면 선수가 살짝 든다. 피해가 쌓이면 한쪽으로 기울며 가라앉는다.
		local dTheta = (sh.theta - (sh.lastTheta or sh.theta) + math.pi) % (math.pi * 2) - math.pi
		sh.lastTheta = sh.theta
		sh.roll = (sh.roll or 0) + (math.clamp(dTheta * 9, -0.3, 0.3) - (sh.roll or 0)) * 0.12
		local hp = sh.hp or 1
		local heel = (1 - hp) * 0.28 * (sh.heelSide or 1)
		local pitch = math.clamp((sh.speed or 0) / 90, 0, 0.1) + math.sin(t * 0.9 + sh.length) * 0.03
		local dip, rollAdd, pitchAdd = -(1 - hp) * 1.6, 0, 0
		if sink then
			local k = sink.k
			dip -= k * k * 22
			rollAdd = sink.side * k * 1.15
			pitchAdd = -k * 0.42 -- 선수부터 가라앉는다
		end
		local bob = CFrame.new(0, math.sin(t * 1.3 + sh.length) * 0.5 + dip, 0) * CFrame.Angles(-sh.roll + heel + rollAdd, 0, pitch + pitchAdd)
		sh.model:PivotTo(CFrame.new(ORIGIN + Vector3.new(sh.pos.X, sh.y, sh.pos.Z)) * CFrame.Angles(0, -sh.theta, 0) * bob * sh.rot)
	end

	-- 카드 대결 무대: 두 배 갑판 위에 로블록스 캐릭터 선원이 서 있고, 카드를 낼 때마다 그 줄의 병종이 움직인다
	local crews = { me = {}, foe = {} }
	local crewMode = { me = nil, foe = nil } -- { kind, untilT }
	local function spawnCrew(sh, side, coat, role)
		local box, size = sh.model:GetBoundingBox()
		local deckY = box.Position.Y - size.Y / 2 + size.Y * 0.3
		local along = size.X >= size.Z
		if opts.cardOnly and not sh.tabled then
			sh.tabled = true
			for _, d in sh.model:GetDescendants() do
				if d:IsA("BasePart") then
					d.Transparency = 1
				end
			end
			local slab = part(folder, Vector3.new(size.X + 6, 1.4, size.Z + 6), CFrame.new(box.Position.X, deckY - 0.7, box.Position.Z), Color3.fromRGB(122, 84, 52), Enum.Material.WoodPlanks)
			slab.Name = "TavernTable"
		end
		local pivot = sh.model:GetPivot()
		for i = 1, 4 do
			local seed = i * 17 + (if side == "me" then 1 else 99)
			local ok, rig = pcall(Pose.createR15, folder, Vector3.zero, 0, coat, Random.new(seed), role, 5)
			if ok and rig then
				for _, d in rig:GetDescendants() do
					if d:IsA("BasePart") then
						d.Anchored = true
						d.CanCollide = false
						d.CanQuery = false
					end
				end
				local slide = (i - 2.5) * (if along then size.X else size.Z) * 0.16
				local side2 = if i % 2 == 0 then 1.6 else -1.6
				local world = Vector3.new(box.Position.X + (if along then slide else side2), deckY + 2.6, box.Position.Z + (if along then side2 else slide))
				table.insert(crews[side], { rig = rig, off = pivot:ToObjectSpace(CFrame.new(world)), idx = i })
			end
		end
	end
	if opts.card then
		task.spawn(function()
			spawnCrew(me, "me", Color3.fromRGB(60, 87, 107), "Sailor")
			spawnCrew(foe, "foe", Color3.fromRGB(117, 48, 39), "Rogue")
		end)
	end
	local function crewAct(side, card)
		if not card then return end
		local kind = if card.special then "cheer" elseif card.row == "cannon" then "gun" elseif card.row == "ranged" then "shoot" else "melee"
		crewMode[side] = { kind = kind, untilT = os.clock() + 1.6 }
		local from, to = (if side == "me" then me else foe), (if side == "me" then foe else me)
		if kind == "gun" or kind == "shoot" then
			for k = 0, (if kind == "gun" then 2 else 0) do
				task.delay(0.25 + k * 0.22, function()
					if not finished then
						shoot(from.pos, to.pos, function() shake = 1.0 end)
					end
				end)
			end
		else
			shake = 0.8
			Sfx.play("sfx_hit", 0.5, 1.3 + math.random() * 0.3)
		end
	end
	local function updateCrews(now)
		for side, list in crews do
			local sh = if side == "me" then me else foe
			local other = if side == "me" then foe else me
			local mode = crewMode[side]
			local active = mode and now < mode.untilT
			for _, c in list do
				local pos = (sh.model:GetPivot() * c.off).Position
				local look = Vector3.new(other.model:GetPivot().Position.X, pos.Y, other.model:GetPivot().Position.Z)
				if (look - pos).Magnitude > 1 then
					c.rig:PivotTo(CFrame.lookAt(pos, look))
				end
				if active and mode.kind == "gun" then
					Pose.work(c.rig, "hammer", now + c.idx * 0.3)
				elseif active and (mode.kind == "melee" or mode.kind == "shoot") then
					Pose.makeR15Action(c.rig, if mode.kind == "shoot" then "shoot" else "attack", math.clamp(((now + c.idx * 0.15) % 0.8) / 0.4, 0, 1), now)
				else
					Pose.makeR15Action(c.rig, "idle", 0, now + c.idx)
				end
			end
		end
	end

	local function steerToward(sh, targetTheta, dt, rate)
		local diff = (targetTheta - sh.theta + math.pi) % (math.pi * 2) - math.pi
		sh.theta += math.clamp(diff, -rate * dt, rate * dt)
	end

	local sinkStart = nil
	local loser = if opts.winner == "a" then "foe" elseif opts.winner == "b" then "me" else nil
	local phase = "duel" -- duel → board → end (도주 중엔 fleeing)
	local fleeProgress, fleeTried = 0, false
	local nextMeFire, nextFoeFire = os.clock() + 0.9, os.clock() + 1.7
	local boardStart = nil
	local endAt = nil
	local melIdx = 0
	local lastT = os.clock()
	local escortFire = os.clock() + 3
	local nextHullSound = os.clock() + 5

	table.insert(conns, RunService.Heartbeat:Connect(function()
		if finished then
			return
		end
		local now = os.clock()
		local dt = math.min(now - lastT, 0.1)
		lastT = now

		if phase == "duel" or phase == "board" then
			-- 우리 배: 방향키로 돌리고 가속 설정만큼 앞으로
			me.theta += steerDir * 1.5 * dt
			-- 조종 보조: 스틱을 놓고 있으면 적선에 옆면(포 방향)을 자동으로 맞춘다
			if steerDir == 0 and phase == "duel" then
				local dv = foe.pos - me.pos
				if dv.Magnitude < 110 then
					local ang = math.atan2(dv.Z, dv.X)
					local a1, a2 = ang + math.pi / 2, ang - math.pi / 2
					local function gap(t)
						return math.abs((t - me.theta + math.pi) % (math.pi * 2) - math.pi)
					end
					steerToward(me, if gap(a1) < gap(a2) then a1 else a2, dt, 0.8)
				end
			end
			local wf = windFactor(me.theta)
			me.speed = myTop * (stickThrottle or throttle) * wf
			sailLabel.Text = if wf > 1.12 then "⛵ 순풍 — 속도 증가" elseif wf < 0.88 then "⛵ 맞바람 — 속도 감소" else "⛵ 옆바람"
			sailLabel.TextColor3 = if wf > 1.12 then Color3.fromRGB(130, 235, 150) elseif wf < 0.88 then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(150, 220, 255)
			if cardBusy then me.speed = 0 end
			me.pos += forward(me.theta) * me.speed * dt
			-- 아군 함선은 기함 옆 대형 자리를 향해 따라간다
			for _, al in allies do
				local rot = CFrame.Angles(0, -me.theta, 0)
				local slot = me.pos + rot:VectorToWorldSpace(al.slot)
				local dv = slot - al.pos
				al.theta = al.theta + (((math.atan2(dv.Z, dv.X) - al.theta + math.pi) % (math.pi * 2)) - math.pi) * math.min(1, dt * 2)
				al.speed = math.min(al.topSpeed * 1.3, dv.Magnitude * 1.2)
				al.pos += forward(al.theta) * al.speed * dt
			end

			-- 적선: 우리 배와 거리를 유지하며 옆면을 대려고 맴돈다
			local toMe = me.pos - foe.pos
			local dist = toMe.Magnitude
			local bearing = math.atan2(toMe.Z, toMe.X)
			local want = bearing + (if dist > 55 then 0.15 elseif dist < 32 then -1.9 else 1.45)
			steerToward(foe, want, dt, 1.1)
			foe.speed = (if dist > 55 then 17 else 11) * windFactor(foe.theta)
			if cardBusy then foe.speed = 0 end
			foe.pos += forward(foe.theta) * foe.speed * dt
			if phase == "board" then
				-- 접현: 서로 가까이 붙는다
				foe.pos = foe.pos:Lerp(me.pos + Vector3.new(0, 0, -16), dt * 1.6)
			end
			-- 함선이 파도를 가르는 목재·돛천 소리: 5~9초에 한 번만 재생한다.
			if now >= nextHullSound then
				nextHullSound = now + 5 + math.random() * 4
				if me.speed > 5 then
					Sfx.play(if math.random() < 0.7 then "sfx_creak" else "sfx_sail_fabric",
						0.24, 0.88 + math.random() * 0.16)
				end
			end
			-- 경계 밖으로 나가지 않게 가운데로 되돌린다
			for _, sh in (if opts.canFlee and not fleeTried then { foe } else { me, foe }) do
				if sh.pos.Magnitude > 260 then
					steerToward(sh, math.atan2(-sh.pos.Z, -sh.pos.X), dt, 1.5)
				end
			end

			-- 도주: 해역 가장자리 밖으로 몇 초 버티면 도망 시도 (서버가 성공 여부를 판정)
			if phase == "duel" and opts.canFlee and not fleeTried then
				if me.pos.Magnitude > 230 then
					fleeProgress += dt
					hint.Text = string.format("도주 중... %d%%", math.floor(math.min(1, fleeProgress / 2.5) * 100))
					if fleeProgress >= 2.5 then
						fleeTried = true
						phase = "fleeing"
						subtitle.Text = "돛을 올리고 전속력으로 도주한다!"
						task.spawn(function()
							local ok = opts.onFlee and opts.onFlee()
							if finished then
								return
							end
							if ok then
								phase = "end"
								endAt = os.clock()
								banner.Text = "도망 성공!"
								banner.TextColor3 = Color3.fromRGB(150, 220, 255)
								banner.TextTransparency = 0
								banner.TextStrokeTransparency = 0.3
								subtitle.Text = ""
							else
								subtitle.Text = "도망 실패! 해적이 따라붙었다"
								me.pos = me.pos * 0.35
								phase = "duel"
								hint.Text = ""
							end
						end)
					end
				else
					fleeProgress = math.max(0, fleeProgress - dt * 2)
					if fleeProgress == 0 and hint.Text:sub(1, 3) == "도주" then
						hint.Text = ""
					end
				end
			end
			if phase == "duel" then
				local d = (foe.pos - me.pos).Magnitude
				if d < 45 then CH.flash("melee") end
				-- 자동 포격: 사정거리 안이면 쿨타임마다 한 발씩 기록을 소비한다
				if not opts.card and d < cannon.range and now >= nextMeFire and meDone + 0 < #meQueue and foeDone + meDone >= 0 then
					nextMeFire = now + cannon.cd
					local idx = #meQueue - (#meQueue - (meDone - (0)) ) -- 순서대로
					local e = meQueue[math.min(foeDone, #meQueue) + 0 > 0 and (foeDone + 0 == 0 and 1 or foeDone) or 1]
					e = meQueue[math.min(#meQueue, (foeDone + 1))]
					local volley = math.clamp(math.floor((e and e.hull or 8) / 8) + 1, 1, 4)
					if volley >= 3 then
						popText(if volley >= 4 then "일제 사격!!" else "일제 사격!", Color3.fromRGB(255, 200, 90))
					end
					for k = 0, volley - 1 do
						task.delay(k * 0.08, function()
							if not finished then
								shoot(me.pos, foe.pos, if k == volley - 1 then function()
									shake = 1.2
									applyHit(false, e)
								end else nil, cannon)
							end
						end)
					end
				end
				if not opts.card and d < 95 and now >= nextFoeFire and meDone < #foeQueue then
					nextFoeFire = now + 1.45
					warnRing(me.pos + forward(me.theta) * me.speed * 0.9)
					local e = foeQueue[math.min(#foeQueue, meDone + 1)]
					local volley = math.clamp(math.floor((e and e.hull or 8) / 8) + 1, 1, 4)
					for k = 0, volley - 1 do
						task.delay(k * 0.08, function()
							if not finished then
								shoot(foe.pos, me.pos, if k == volley - 1 then function()
									shake = 1.6
									applyHit(true, e)
								end else nil)
							end
						end)
					end
				end
				-- 두 배가 맞닿으면 바로 접현 (백병전)
				if opts.card and not cardStarted and (d < 95 or opts.cardOnly) then
					cardStarted, cardBusy = true, true
					hint.Text = ""
					if opts.cardOnly then
						-- 순수 카드 대결: 해전 표시(체력줄·바람·조타·함대칸)는 모두 숨긴다
						for _, c in gui:GetChildren() do
							pcall(function()
								c.Visible = false
							end)
						end
						rangeRing.Transparency = 1
						rangeLabel.Visible = false
					end
					subtitle.Text = "사정거리 안! 카드 대결 시작!"
					shake = 1.6
					Sfx.play("sfx_horn")
					Sfx.play("sfx_naval_ram", 0.5, 1.05, "sfx_creak")
					task.delay(1.0, function()
						if finished then return end
						startBoarding(opts.card, function(m, acts)
							-- 서버가 기록을 다시 돌려 확정한 승패를 따른다 (서버가 거부하면 서버의 기존 판정)
							local res = opts.onCards and opts.onCards(acts)
							local w = res or (if m.winner == "me" then "a" elseif m.winner == "foe" then "b" else "draw")
							opts.winner = if w == "a" or w == "b" then w else nil
							loser = if w == "a" then "foe" elseif w == "b" then "me" else nil
							if w == "a" then
								foeEnd, meEnd = 0, math.clamp(1 - 0.25 * m.wins.foe, 0.3, 1)
							elseif w == "b" then
								meEnd, foeEnd = 0, math.clamp(1 - 0.25 * m.wins.me, 0.3, 1)
							else
								meEnd, foeEnd = 0.45, 0.45
							end
							cardBusy, cardDone = false, true
							melIdx = #meleeQueue
							boardStart = os.clock() - 100
							phase = "board"
							subtitle.Text = if w == "a" then "적선이 항복하고 가라앉는다!" elseif w == "b" then "우리 배가 무너진다..." else "서로 물러났다."
						end, function(side, card)
							crewAct(side, card)
						end)
					end)
				end
				if not opts.card and (d < 30 or (foeDone >= #meQueue and meDone >= #foeQueue)) then
					phase = "board"
					boardStart = now
					hint.Text = ""
					subtitle.Text = "두 배가 접현했다! 백병전!"
					shake = 2.2
					Sfx.play("sfx_horn")
					Sfx.play("sfx_naval_ram", 0.68, 0.96, "sfx_creak")
					Sfx.play("sfx_boarding_slash", 0.46, 1)
				end
			else
				-- 백병전: 남은 기록을 차례로 보여 준다
				if boardingOn then
					-- 카드 대결 장면이 진행 중이다
				elseif now - boardStart > 0.7 + melIdx * 0.55 and melIdx < #meleeQueue then
					melIdx += 1
					local e = meleeQueue[melIdx]
					shake = 1.4
					-- 칼날 부딪히는 소리: 효과음 한 가지를 높낮이를 바꿔 겹쳐 백병전 소리로 쓴다
					Sfx.play("sfx_hit", 0.9, 1.25 + math.random() * 0.35)
					task.delay(0.14, function()
						if not finished then
							Sfx.play("sfx_hit", 0.7, 1.55 + math.random() * 0.4)
						end
					end)
					if melIdx % 2 == 0 then
						Sfx.play("sfx_creak", 0.5, 1.2)
					end
					subtitle.Text = e.text
					if e.player then
						foeHp = math.max(foeEnd, foeHp - 0.05)
					else
						meHp = math.max(meEnd, meHp - 0.05)
					end
				end
				if melIdx >= #meleeQueue and now - boardStart > 1.6 + #meleeQueue * 0.55 then
					phase = "end"
					endAt = now
					meHp, foeHp = meEnd, foeEnd
					if loser then
						sinkStart = now
						-- CC0 함선 침몰 효과음을 한 번만 재생한다. 미등록이면 기존 물보라로 대체한다.
						Sfx.play("sfx_naval_sink", 0.64, 0.94, "sfx_splash")
					end
					banner.Text = if opts.winner == "a" then "승리!" elseif opts.winner == "b" then "패배..." else "물러났다"
					CH.flash("medic")
					banner.TextColor3 = if opts.winner == "a" then Color3.fromRGB(255, 214, 120) elseif opts.winner == "b" then Color3.fromRGB(230, 110, 100) else Color3.fromRGB(220, 220, 230)
					banner.TextTransparency = 0
					banner.TextStrokeTransparency = 0.3
					subtitle.Text = ""
				end
			end
		elseif phase == "end" then
			if now - endAt > 2.4 then
				finish()
				return
			end
		end

		-- 호위선: 적 주변을 돌며 가끔 대포를 쏜다 (연출)
		for i, e in escorts do
			local center = foe.pos + Vector3.new(math.cos(now * 0.2 + i * 2.4) * 80, 0, math.sin(now * 0.2 + i * 2.4) * 80)
			steerToward(e, math.atan2(center.Z - e.pos.Z, center.X - e.pos.X), dt, 0.5)
			e.pos += forward(e.theta) * 6 * dt
		end
		if now >= escortFire and #escorts > 0 and phase == "duel" then
			escortFire = now + 2.8
			local e = escorts[math.random(1, #escorts)]
			if (e.pos - me.pos).Magnitude < 150 then
				shoot(e.pos, me.pos + Vector3.new((math.random() - 0.5) * 60, 0, (math.random() - 0.5) * 60), nil)
			end
		end

		if phase == "duel" and not opts.card then
			for _, al in allies do
				if now >= al.nextFire and (foe.pos - al.pos).Magnitude < al.nc.range then
					al.nextFire = now + al.nc.cd * 2.2 + math.random()
					shoot(al.pos, foe.pos, nil, al.nc)
				end
			end
		end
		-- 배 그리기 (침몰 연출 포함)
		me.hp, foe.hp = meHp, foeHp
		local meSink, foeSink
		if sinkStart then
			local k = math.clamp((now - sinkStart) / 2.8, 0, 1)
			local sink = { k = k, side = if loser == "me" then -1 else 1 }
			if loser == "me" then
				meSink = sink
			else
				foeSink = sink
			end
			-- 가라앉는 동안 연기·파편·거품
			local sunk = if loser == "me" then me else foe
			if k < 0.95 and math.random() < 0.55 then
				local at = ORIGIN + sunk.pos + Vector3.new(0, 7 - k * 10, 0) + Vector3.new((math.random() - 0.5) * sunk.length * 0.7, 0, (math.random() - 0.5) * 8)
				if math.random() < 0.3 then
					FX.smoke(at, 1, 2.6, true)
				end
				if math.random() < 0.5 then
					FX.flame(at, 3)
				end
				if math.random() < 0.3 then
					FX.splinters(at, 3)
				end
				if k > 0.5 and math.random() < 0.5 then
					FX.splash(Vector3.new(at.X, 0, at.Z))
				end
			end
		end
		-- 손상 연출: 체력이 줄수록 연기, 더 줄면 불길이 오른다
		for _, side in { { me, meHp, loser == "me" }, { foe, foeHp, loser == "foe" } } do
			local sh, hp = side[1] :: any, side[2] :: number
			if not side[3] and hp < 0.5 and not sh.dismasted then
				dismast(sh)
				popText(if sh == me then "돛대가 부러졌다!" else "적선의 돛대가 부러졌다!", if sh == me then Color3.fromRGB(255, 130, 110) else Color3.fromRGB(255, 226, 120))
			end
			if not side[3] and hp < 0.55 and math.random() < (0.55 - hp) * 0.5 then
				local at = ORIGIN + sh.pos + Vector3.new((math.random() - 0.5) * sh.length * 0.6, 8 + math.random() * 5, (math.random() - 0.5) * 6)
				FX.smoke(at, 1, 2.2, true)
				if hp < 0.3 and math.random() < 0.5 then
					FX.flame(at, 2.5)
				end
			end
		end
		poseShip(me, now, meSink)
		poseShip(foe, now, foeSink)
		updateCrews(now)
		for _, e in escorts do
			poseShip(e, now, nil)
		end
		for _, al in allies do
			poseShip(al, now, nil)
		end
		do
			-- 사거리 링은 내 배를 따라다니고, 탄도 점선은 적선까지의 포물선을 보여준다
			rangeRing.CFrame = CFrame.new(ORIGIN + me.pos + Vector3.new(0, 0.7, 0)) * CFrame.Angles(0, 0, math.pi / 2)
			local dd = (foe.pos - me.pos).Magnitude
			local inRange = dd < cannon.range
			rangeRing.Color = if inRange then Color3.fromRGB(130, 235, 150) else Color3.fromRGB(255, 226, 150)
			rangeRing.Transparency = if opts.cardOnly then 1 elseif inRange then 0.93 else 0.82
			rangeLabel.TextColor3 = if inRange then Color3.fromRGB(130, 235, 150) else Color3.fromRGB(255, 226, 150)
			local aim = phase == "duel" and not opts.card and dd < cannon.range * 1.25
			local a0 = ORIGIN + me.pos + Vector3.new(0, 8, 0)
			local a1 = ORIGIN + foe.pos + Vector3.new(0, 6, 0)
			for i, dot in trajDots do
				if aim then
					local u = i / (#trajDots + 1)
					dot.CFrame = CFrame.new(a0:Lerp(a1, u) + Vector3.new(0, math.sin(u * math.pi) * cannon.arc, 0))
					dot.Transparency = if inRange then 0.35 else 0.8
					dot.Color = if inRange then Color3.fromRGB(130, 235, 150) else Color3.fromRGB(255, 130, 110)
				else
					dot.Transparency = 1
				end
			end
		end
		FX.wake(me, "me", now)
		FX.wake(foe, "foe", now)
		for i, e in escorts do
			FX.wake(e, "e" .. i, now)
		end
		FX.damage(me, "me", now)
		FX.damage(foe, "foe", now)
		FX.update(dt)
		meFill.Size = UDim2.fromScale(meHp, 1)
		foeFill.Size = UDim2.fromScale(foeHp, 1)
		-- 배 카드: 기함은 전체 막대를, 선단 배는 피해의 절반만 받은 것으로 보여 준다
		for _, mc in myCards do
			local v = 1 - (1 - meHp) * mc.share
			mc.c.fill.Size = UDim2.fromScale(math.clamp(v, 0, 1), 1)
			mc.c.fill.BackgroundColor3 = if v < 0.35 then Color3.fromRGB(214, 82, 76) else mc.c.color
			if loser == "me" and sinkStart and mc.share == 1 then
				mc.c.frame.BackgroundTransparency = 0.6
			end
		end
		for _, fc in foeCards do
			local v = 1 - (1 - foeHp) * fc.share
			fc.c.fill.Size = UDim2.fromScale(math.clamp(v, 0, 1), 1)
			if loser == "foe" and sinkStart and fc.share == 1 then
				fc.c.frame.BackgroundTransparency = 0.6
			end
		end

		-- 카메라: 두 배가 모두 보이도록 넓게 잡는다. 거리가 벌어질수록 뒤로·위로 물러나고, 부드럽게 따라간다.
		shake = math.max(0, shake - 0.06)
		local killZoom = if sinkStart then -math.clamp((now - sinkStart) / 1.4, 0, 1) * 8 else 0
		kick = kick * 0.86
		cam.FieldOfView = 84 - kick * 0.6 + math.min(shake, 2.5) * 2 + (me.speed / myTop) * 5 + killZoom
		local f = forward(me.theta)
		local sep = (foe.pos - me.pos)
		local dist = sep.Magnitude
		local focus = ORIGIN + me.pos + sep * 0.5 + Vector3.new(0, 4, 0)
		local camPos = ORIGIN + me.pos - f * (74 + dist * 0.4) + Vector3.new(0, 46 + dist * 0.25, 0)
		if cardBusy then
			-- 카드 대결 중: 두 배의 옆면이 한 화면에 들어오는 무대 시점
			local mid = (me.pos + foe.pos) / 2
			local dir = foe.pos - me.pos
			local perp = Vector3.new(-dir.Z, 0, dir.X)
			perp = if perp.Magnitude > 0.1 then perp.Unit else Vector3.new(0, 0, 1)
			focus = ORIGIN + mid + Vector3.new(0, 2, 0)
			camPos = ORIGIN + mid + perp * 112 + Vector3.new(0, 40, 0)
		end
		local a = 1 - math.exp(-dt * (if cardBusy then 6 else 2.6))
		FX.cam = if FX.cam then { pos = FX.cam.pos:Lerp(camPos, a), focus = FX.cam.focus:Lerp(focus, a) } else { pos = camPos, focus = focus }
		cam.CFrame = CFrame.lookAt(FX.cam.pos + Vector3.new((math.random() - 0.5) * shake, (math.random() - 0.5) * shake, 0), FX.cam.focus)
	end))

	-- 일정 시간 안에 끝나지 않으면 자동으로 마무리한다
	task.delay(130, function()
		while cardBusy and not finished do -- 카드 대결 중에는 시간을 재촉하지 않는다
			task.wait(1)
		end
		if not finished then
			finish()
		end
	end)

	return { finish = finish }
end

return NavalBattle
