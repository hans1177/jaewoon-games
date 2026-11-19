--!nonstrict
-- 파일명: NavalBattle.luau
-- 해전 연출 (클라이언트 전용). 서버가 자동 해전을 계산한 뒤 돌려준 전투 기록(log)을
-- 두 배의 포격·접현 장면으로 다시 보여 준다. 결과는 서버가 이미 정했고, 이 장면은 보기용이다.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
-- [모바일 입자 예산] 효과 밀도만 조절한다. 명중·사거리·재사용 대기시간은 변경하지 않는다.
local MOBILE_VFX = game:GetService("UserInputService").TouchEnabled
local AssetIds = require(script.Parent:WaitForChild("AssetIds"))
local Pose = require(script.Parent:WaitForChild("Pose"))
local Sfx = require(script.Parent:WaitForChild("Sfx"))
local Combat = require(script.Parent:WaitForChild("Combat"))

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
	sa = { ko = "남·동남아", en = "South & Southeast Asia", color = Color3.fromRGB(109, 180, 144) },
	lo = { ko = "전설", en = "Legends", color = Color3.fromRGB(169, 139, 208) },
}

-- [지역 카드 프레임] 원화 ID만 조회하고 카드 능력·저장 데이터는 그대로 유지.
local REGION_FRAME = {
	eu = "CardArt/ui_frame_europe", ea = "CardArt/ui_frame_east_asia",
	me = "CardArt/ui_frame_middle_east", nw = "CardArt/ui_frame_new_world",
	af = "CardArt/ui_frame_africa", sa = "CardArt/ui_frame_southeast_asia",
}

-- 지도자 얼굴: 등록·업로드된 인물 초상만 연결한다 (없는 지도자는 이름 글자)
local LEADER_FACE = { napoleon = "Portraits/person_napoleon", elizabeth = "Portraits/person_elizabeth1" }
-- [오늘의 원화] 등록된 카드배틀 지도자 초상이 있으면 기존 초상보다 우선한다.
local NEW_LEADER_ART = {
	caesar = "CardArt/leader_caesar", elizabeth = "CardArt/leader_elizabeth",
	yisunsin = "CardArt/leader_yisunsin", pachacuti = "CardArt/leader_pachacuti",
	saladin = "CardArt/leader_saladin", suleiman = "CardArt/leader_suleiman",
	rajaraja = "CardArt/leader_rajaraja", mansa = "CardArt/leader_mansa",
}

local PLAYER_SHIP = {
	caravel = "ship-small", fluyt = "ship-medium",
	frigate = if AssetIds["Naval/frigate"] then "frigate" else "ship-large",
	galleon = if AssetIds["Naval/galleon-heritage"] then "galleon-heritage" else "ship-pirate-large",
	paddle_steamer = "ship-medium", ironclad_frigate = "ship-large",
}
-- 대포 종류: 사거리·탄속(비행시간)·포물선 높이·탄 크기가 다르다
local NC = {
	swivel = { name = "선회포", range = 95, dur = 0.34, arc = 5, ball = 1.0, cd = 0.8 },
	demi = { name = "중포", range = 140, dur = 0.5, arc = 14, ball = 1.5, cd = 1.15 },
	culverin = { name = "장포", range = 200, dur = 0.8, arc = 24, ball = 1.7, cd = 1.5 },
	mortar = { name = "구포", range = 130, dur = 1.0, arc = 42, ball = 2.2, cd = 2.0 },
}
local SHIP_CANNON = { caravel = "swivel", fluyt = "swivel", galley = "demi", xebec = "demi", frigate = "culverin", galleon = "mortar" }
-- [함종 원형 보호] 고유 갈레온·프리깃 원본은 본래 함종에만 적용한다.
-- 지역·국가별 visual 별칭은 기존 공용 범선 메시를 사용하여 잘못된 원형 상속을 방지한다.
do
	local ShipsMod = require(script.Parent:WaitForChild("Ships"))
	for id, def in ShipsMod.Ships do
		if def.visual and not PLAYER_SHIP[id] then
			if def.visual == "galleon" then
				PLAYER_SHIP[id] = "ship-large"
			elseif def.visual == "frigate" then
				PLAYER_SHIP[id] = "ship-pirate-medium"
			else
				PLAYER_SHIP[id] = PLAYER_SHIP[def.visual]
			end
		end
	end
end
-- [함종별 고유 선체] 새 모델은 등록번호가 발급된 경우에만 적용한다.
-- 불러오기 전에는 기존 해전 선체를 유지하며 전투 계산·저장에는 영향을 주지 않는다.
local CUSTOM_SHIP_FALLBACK = {
	privateer = "ship-pirate-medium",
	manila_galleon = "ship-pirate-large",
	paddle_steamer = "ship-medium",
	ironclad_frigate = "ship-large",
}
local ShipDefs = require(script.Parent:WaitForChild("Ships"))
for shipId in ShipDefs.Ships do
	local meshName = shipId .. "-custom"
	if AssetIds["Naval/" .. meshName] then
		-- [등록된 함종 전체] 종전 해전 메시를 안전하게 남기고 해당 함종 전용 모델을 우선한다.
		CUSTOM_SHIP_FALLBACK[shipId] = CUSTOM_SHIP_FALLBACK[shipId] or PLAYER_SHIP[shipId] or "ship-medium"
		PLAYER_SHIP[shipId] = meshName
	end
end

-- [7대륙 해전 연출] 기존 설계도의 36척·단계·문화권을 그대로 읽는다.
-- 색·연기·충격파·항적만 결정하며 구매 등급, 대포 성능, 서버 판정에는 관여하지 않는다.
local FX_THEMES = {
	europe = { flash = Color3.fromRGB(255, 199, 110), tracer = Color3.fromRGB(246, 235, 205), smoke = Color3.fromRGB(125, 124, 118), foam = Color3.fromRGB(236, 241, 244), spark = Color3.fromRGB(255, 216, 125) },
	east_asia = { flash = Color3.fromRGB(255, 130, 77), tracer = Color3.fromRGB(255, 193, 143), smoke = Color3.fromRGB(111, 105, 102), foam = Color3.fromRGB(229, 243, 246), spark = Color3.fromRGB(252, 85, 62) },
	new_world = { flash = Color3.fromRGB(255, 184, 105), tracer = Color3.fromRGB(255, 243, 218), smoke = Color3.fromRGB(156, 148, 130), foam = Color3.fromRGB(241, 250, 255), spark = Color3.fromRGB(255, 223, 161) },
	middle_east = { flash = Color3.fromRGB(255, 202, 118), tracer = Color3.fromRGB(255, 226, 166), smoke = Color3.fromRGB(155, 141, 119), foam = Color3.fromRGB(220, 245, 240), spark = Color3.fromRGB(250, 195, 108) },
	southeast_asia = { flash = Color3.fromRGB(255, 180, 114), tracer = Color3.fromRGB(247, 221, 180), smoke = Color3.fromRGB(135, 142, 137), foam = Color3.fromRGB(190, 246, 228), spark = Color3.fromRGB(251, 167, 104) },
	africa = { flash = Color3.fromRGB(255, 197, 135), tracer = Color3.fromRGB(242, 224, 193), smoke = Color3.fromRGB(145, 117, 97), foam = Color3.fromRGB(243, 244, 216), spark = Color3.fromRGB(231, 172, 111) },
	lost = { flash = Color3.fromRGB(108, 228, 236), tracer = Color3.fromRGB(172, 156, 255), smoke = Color3.fromRGB(90, 92, 141), foam = Color3.fromRGB(138, 239, 232), spark = Color3.fromRGB(174, 134, 255) },
}
local FX_PROFILES = {}
local DEFAULT_FX = { faction = "europe", stage = 2, theme = FX_THEMES.europe, rowed = false }
for _, blueprint in ShipDefs.Blueprints do
	local style = { faction = blueprint.faction, stage = blueprint.stage, theme = FX_THEMES[blueprint.faction] or FX_THEMES.europe, rowed = false }
	FX_PROFILES[blueprint.id] = style
	-- [기존 판매 함종] 별도 설계 이름이 있어도 원래 구매 ID에 외형 연출만 연결한다.
	if blueprint.existingId and not FX_PROFILES[blueprint.existingId] then
		FX_PROFILES[blueprint.existingId] = style
	end
end
local REGION_FX = {
	mediterranean = "europe", north_sea = "europe", atlantic_europe = "europe",
	americas = "new_world", east_asia = "east_asia",
	red_sea = "middle_east", south_asia = "southeast_asia", southeast_asia = "southeast_asia",
	east_africa = "africa", west_africa = "africa",
}
local NATION_FX = {
	england = "europe", netherlands = "europe", france = "europe", portugal = "europe",
	ottoman = "middle_east", swahili = "africa", malabar = "southeast_asia",
	japan = "east_asia", new_spain = "new_world",
}
for shipId, definition in ShipDefs.Ships do
	local style = FX_PROFILES[shipId]
	local faction = if style then style.faction elseif definition.nation then NATION_FX[definition.nation]
		elseif definition.regions then REGION_FX[definition.regions[1]] else "europe"
	faction = faction or "europe"
	FX_PROFILES[shipId] = {
		faction = faction,
		stage = if style then style.stage else math.clamp(definition.class or 1, 1, 4),
		theme = FX_THEMES[faction] or FX_THEMES.europe,
		rowed = definition.rowed == true,
	}
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
	-- [등록된 36척 V5] 원본 로딩이 지연되면 이전 실제 선체를 사용하고, 흰 도형 임시배로 바꾸지 않는다.
	local v5ShipId = string.match(asset, "^(.-)%-v5%-mobile$") or string.match(asset, "^(.-)%-v5$")
	if v5ShipId and not (tpl and tpl:IsA("Model")) then
		if string.find(asset, "-mobile", 1, true) then
			tpl = group and group:FindFirstChild(v5ShipId .. "-v5")
		end
		if not (tpl and tpl:IsA("Model")) then
			tpl = group and group:FindFirstChild(PLAYER_SHIP[v5ShipId] or "ship-medium")
		end
		if not (tpl and tpl:IsA("Model")) then
			tpl = group and group:FindFirstChild("ship-medium")
		end
	end
	-- [해전 3D] 상세 갈레온 로딩 지연 시 기존 해전 범선을 그대로 사용한다.
	if asset == "galleon-heritage" and not (tpl and tpl:IsA("Model")) then
		tpl = group and group:FindFirstChild("ship-pirate-large")
	elseif asset == "frigate" and not (tpl and tpl:IsA("Model")) then
		-- [기존 해전 보존] 전용 프리깃 모델 로드 지연 시 원래 대형 범선 외형을 사용한다.
		tpl = group and group:FindFirstChild("ship-large")
	elseif not (tpl and tpl:IsA("Model")) then
		-- [신규 4종 원본 복구] 로딩 중이어도 새 게임과 기존 해전 장면을 계속 표시한다.
		local shipId = string.match(asset, "^(.-)%-custom$")
		if shipId and CUSTOM_SHIP_FALLBACK[shipId] then
			tpl = group and group:FindFirstChild(CUSTOM_SHIP_FALLBACK[shipId])
		end
	end
	-- [선저 형태 보존] 원본 메시가 지연되면 등록된 입체 선체를 먼저 찾는다.
	-- 임시 사각형 선저는 모든 등록 선체가 없는 극단적 상태에서만 사용한다.
	if not (tpl and tpl:IsA("Model")) and group then
		local realHulls = if string.find(asset, "boat-", 1, true)
			then { "boat-row-large", "boat-sail-a", "ship-small" }
			else { "ship-medium", "ship-small", "ship-large" }
		for _, hullName in realHulls do
			local candidate = group:FindFirstChild(hullName)
			if AssetIds["Naval/" .. hullName] and candidate and candidate:IsA("Model") then
				tpl = candidate
				break
			end
		end
	end
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
	l.TextStrokeTransparency = 1 -- [해전 글씨] 그림자/중복 외곽선 제거: 폰트 자체만 렌더링
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
NavalBattle.cardArtworkKey = cardArtworkKey

function NavalBattle.play(opts)
	-- 일반 해전은 함선 조종·포격·백병전만 실행한다. 카드는 주점의 카드 전용 대결에서만 사용한다.
	if not opts.cardOnly then opts.card = nil end
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

	-- [해상전투 배경] 유리판처럼 비치는 가짜 수면을 제거하고 기존 항해 장면의 수면 재질로 통일한다.
	local sea = part(folder, Vector3.new(2600, 2, 2600), CFrame.new(ORIGIN + Vector3.new(0, -1, 0)), Color3.fromRGB(34, 112, 156), Enum.Material.SmoothPlastic)
	sea.Name = "NavalSeaSurface"
	sea.Transparency = 0
	sea.Reflectance = 0.06
	sea.CastShadow = false
	if opts.cardOnly then
		-- 주점 카드 대결: 바다가 아니라 나무 탁자 위에서 한다 (배는 숨기고 그 자리에 탁자 판을 깐다)
		sea.Material = Enum.Material.Wood
		sea.Color = Color3.fromRGB(58, 40, 26)
		sea.Transparency = 0
		sea.Reflectance = 0
	end


	-- [16해역 통합 연출] 위치·기상·교전 정보에 따라 배경을 고른다. 실제 전투·저장·포격 수치는 건드리지 않는다.
	-- [모바일] 등록된 지형 메시를 우선 재사용하고, 원경·입자·수면 갱신만 경량화한다.
	if not opts.cardOnly then
		local coasts = {
			{ id="caribbean", name="카리브 해적 해역", water=Color3.fromRGB(31, 157, 170), sky=Color3.fromRGB(132, 207, 230),
				props={{"platform-beach",175,-453,351},{"tropical-palm-tall",63,-421,327},{"cliff-rock",135,455,-372},{"tropical-palm-short",55,426,-347}} },
			{ id="atlantic_storm", name="북대서양 폭풍", water=Color3.fromRGB(36, 79, 107), sky=Color3.fromRGB(78, 104, 129),
				props={{"cliff-waterfall-rock",167,435,-386},{"cliff-steps-rock",162,-463,353},{"tree-pinedefaulta",56,-432,335},{"cliff-cave-rock",95,467,-365}} },
			{ id="mediterranean", name="지중해 석양", water=Color3.fromRGB(44, 129, 157), sky=Color3.fromRGB(247, 176, 128),
				props={{"cliff-rock",170,-436,-373},{"greek-ruins-a",67,-414,-351},{"cliff-steps-rock",143,460,377},{"greek-column",57,436,352}} },
			{ id="japan", name="일본 열도", water=Color3.fromRGB(44, 116, 148), sky=Color3.fromRGB(171, 196, 211),
				props={{"cliff-steps-rock",169,453,-371},{"north-pine-fall",64,425,-340},{"cliff-rock",153,-454,367},{"tree-pinedefaulta",61,-435,345}} },
			{ id="china", name="중국 남해", water=Color3.fromRGB(35, 139, 139), sky=Color3.fromRGB(168, 218, 212),
				props={{"cliff-waterfall-rock",174,-451,-387},{"east-bamboo-grove",72,-430,-354},{"cliff-steps-rock",168,455,373},{"east-bamboo-grove",60,427,341}} },
			{ id="indian_monsoon", name="인도양 계절풍", water=Color3.fromRGB(30, 121, 142), sky=Color3.fromRGB(119, 174, 179),
				props={{"cliff-waterfall-rock",160,462,-375},{"tropical-palm-tall",61,434,-347},{"platform-beach",156,-461,373},{"tropical-palm-short",51,-434,348}} },
			{ id="north_sea", name="북해 겨울 전투", water=Color3.fromRGB(60, 93, 119), sky=Color3.fromRGB(135, 151, 166),
				props={{"cliff-cave-rock",170,-455,366},{"north-pine-fall",60,-430,342},{"cliff-rock",165,457,-374},{"tree-pinedefaulta",57,430,-350}} },
			{ id="arctic", name="북극 유빙", water=Color3.fromRGB(68, 126, 151), sky=Color3.fromRGB(178, 211, 231),
				props={{"cliff-steps-rock",153,-453,-373},{"cliff-rock",153,465,390},{"cliff-cave-rock",125,438,365},{"cliff-steps-rock",112,-429,-345}} },
			{ id="cape", name="희망봉 격랑", water=Color3.fromRGB(39, 96, 121), sky=Color3.fromRGB(112, 144, 161),
				props={{"cliff-steps-rock",183,444,-387},{"cliff-waterfall-rock",155,-462,368},{"cliff-rock",172,466,375},{"north-pine-fall",54,-433,342}} },
			{ id="volcanic", name="화산섬 해전", water=Color3.fromRGB(46, 80, 91), sky=Color3.fromRGB(147, 104, 100),
				props={{"cliff-rock",205,456,-390},{"cliff-steps-rock",144,435,-366},{"cliff-cave-rock",156,-458,385},{"cliff-rock",110,-431,360}} },
			{ id="tropical", name="열대 무인도", water=Color3.fromRGB(30, 169, 168), sky=Color3.fromRGB(152, 218, 230),
				props={{"platform-beach",190,443,-379},{"tropical-palm-tall",70,422,-352},{"platform-beach",161,-460,382},{"tropical-palm-short",53,-433,357}} },
			{ id="ghost", name="안개 속 유령 해역", water=Color3.fromRGB(49, 83, 100), sky=Color3.fromRGB(100, 121, 133),
				props={{"cliff-cave-rock",178,-454,-377},{"haunted-pine-crooked",60,-427,-352},{"cliff-waterfall-rock",142,467,389},{"haunted-gravestone-broken",49,439,360}} },
			{ id="harbor", name="유럽 항구 봉쇄전", water=Color3.fromRGB(46, 118, 146), sky=Color3.fromRGB(179, 184, 199),
				props={{"cliff-steps-rock",175,450,-380},{"greek-ruins-b",66,424,-351},{"ruins-wall-arched",95,-440,365},{"greek-column",55,-412,346}} },
			{ id="strait", name="좁은 해협 전투", water=Color3.fromRGB(39, 126, 146), sky=Color3.fromRGB(158, 199, 211),
				props={{"cliff-steps-rock",195,-447,-357},{"cliff-rock",202,458,360},{"ruins-pillar-decorated",58,-426,-333},{"cliff-waterfall-rock",119,436,336}} },
			{ id="gold_coast", name="아프리카 황금 해안", water=Color3.fromRGB(41, 133, 145), sky=Color3.fromRGB(226, 169, 124),
				props={{"platform-beach",181,-458,371},{"tropical-palm-tall",64,-430,346},{"cliff-rock",171,450,-378},{"tropical-palm-short",49,426,-349}} },
			{ id="moonlight", name="달빛 해상전", water=Color3.fromRGB(29, 66, 110), sky=Color3.fromRGB(73, 94, 144),
				props={{"cliff-steps-rock",159,458,-384},{"north-pine-fall",57,432,-357},{"cliff-rock",150,-462,375},{"cliff-cave-rock",105,-436,346}} },
		}
		local locationKey = tostring(opts.portId or "") .. "|" .. tostring(opts.shipId or "") .. "|"
			.. tostring(opts.enemyName or "") .. "|" .. tostring(opts.weatherName or "")
		local sceneSeed = 17
		for i = 1, #locationKey do sceneSeed = (sceneSeed * 131 + string.byte(locationKey, i)) % 2147483647 end
		local portLat, portLon = tonumber(opts.portLat), tonumber(opts.portLon)
		-- [지리 배경] 현재 항구의 실제 좌표를 우선하며 해역마다 다른 풍경 풀을 사용한다.
		local regions = {1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16}
		if portLat and portLon then
			if portLat >= 63 then regions = {8,7,2,16}
			elseif portLat >= 50 and portLon > -18 and portLon < 34 then regions = {7,2,13,12}
			elseif portLat >= 8 and portLat < 33 and portLon > -100 and portLon < -54 then regions = {1,11,12,16}
			elseif portLat >= 30 and portLat < 46 and portLon > 127 and portLon < 150 then regions = {4,10,16,14}
			elseif portLat >= 1 and portLat < 32 and portLon > 104 and portLon < 129 then regions = {5,14,10,6}
			elseif portLat >= 30 and portLat < 47 and portLon > -12 and portLon < 43 then regions = {3,13,14,16}
			elseif portLat < -25 and portLon > 12 and portLon < 48 then regions = {9,2,15,14}
			elseif portLat > -7 and portLat < 28 and portLon > -25 and portLon < 23 then regions = {15,11,13,12}
			elseif portLat > -25 and portLat < 30 and portLon > 40 and portLon < 104 then regions = {6,11,14,9}
			elseif portLat > -24 and portLat < 26 and portLon > 95 and portLon < 158 then regions = {10,11,5,6}
			elseif portLat > -25 and portLat < 30 and portLon < -110 then regions = {11,1,16,10}
			elseif portLat >= 38 and portLon > -78 and portLon < 18 then regions = {2,7,13,12}
			end
		end
		-- [해역 시간대] 매 전투마다 낮·밤이 무작위로 바뀌지 않고 해역 분위기를 따른다.
		local phase = "day"
		local mode = if roughSeas then "storm"
			elseif string.find(weather, "안개", 1, true) or string.find(weather, "fog", 1, true) then "fog"
			elseif string.find(weather, "비", 1, true) or string.find(weather, "rain", 1, true) then "rain"
			elseif string.find(weather, "맑", 1, true) or string.find(weather, "clear", 1, true) then "clear"
			elseif sceneSeed % 3 == 0 then "rain" else "clear"
		local coastIndex = regions[sceneSeed % #regions + 1]
		if mode == "fog" and sceneSeed % 3 == 0 then coastIndex = 12 end
		if roughSeas and sceneSeed % 4 == 0 then coastIndex = 2 end
		local coast = coasts[coastIndex]
		-- [해역 고유 정체성] 지중해는 노을, 야간 해역은 달빛, 유령 해역은 해무를 반드시 유지한다.
		if coast.id == "mediterranean" or coast.id == "gold_coast" then phase = "sunset"
		elseif coast.id == "moonlight" or coast.id == "ghost" then phase = "night" end
		if coast.id == "ghost" then mode = "fog"
		elseif coast.id == "atlantic_storm" or coast.id == "cape" then mode = "storm" end
		if mode == "storm" and not roughSeas then
			Sfx.ambient({ "sfx_ambience_storm", "sfx_waves" }, 0.55)
		end
		sea.Color = coast.water:Lerp(Color3.fromRGB(17, 37, 54), 0.12)
		folder:SetAttribute("NavalEnvironment", coast.id)
		folder:SetAttribute("NavalEnvironmentName", coast.name)
		folder:SetAttribute("NavalEnvironmentCount", #coasts)
		folder:SetAttribute("NavalTimePhase", phase)
		folder:SetAttribute("NavalWeatherMode", mode)
		local palette = if phase == "night" then Color3.fromRGB(78, 99, 149)
			elseif phase == "sunset" then Color3.fromRGB(255, 190, 142) else Color3.fromRGB(210, 235, 249)
		local skyColor = coast.sky:Lerp(palette, if phase == "night" then 0.60 else 0.32)
		local cloudColor = if mode == "storm" then Color3.fromRGB(70, 78, 99)
			elseif phase == "night" then Color3.fromRGB(110, 124, 157)
			elseif phase == "sunset" then Color3.fromRGB(230, 171, 146) else Color3.fromRGB(233, 232, 220)
		local foamColor = if phase == "night" then Color3.fromRGB(123, 163, 198) else Color3.fromRGB(198, 238, 237)
		-- [해전 자연광] 가짜 하늘 벽 대신 실제 Roblox 하늘·대기·구름. 원래 월드 설정은 복원한다.
		local lighting = game:GetService("Lighting")
		local savedLighting = {
			clock = lighting.ClockTime, fogColor = lighting.FogColor,
			fogStart = lighting.FogStart, fogEnd = lighting.FogEnd,
			ambient = lighting.OutdoorAmbient,
		}
		lighting.ClockTime = if phase == "night" then 21.15 elseif phase == "sunset" then 17.45 else 11.8
		lighting.FogColor = skyColor
		lighting.FogStart = if mode == "fog" then 210 elseif mode == "storm" then 370 else 690
		lighting.FogEnd = if mode == "fog" then 950 elseif mode == "storm" then 1250 else 1900
		lighting.OutdoorAmbient = if phase == "night" then Color3.fromRGB(72, 96, 132)
			elseif mode == "storm" then Color3.fromRGB(101, 117, 130)
			else Color3.fromRGB(153, 174, 184)
		local originalAtmosphere = lighting:FindFirstChildOfClass("Atmosphere")
		local atmosphere = originalAtmosphere or Instance.new("Atmosphere")
		local savedAtmosphere = if originalAtmosphere then {
			density = atmosphere.Density, offset = atmosphere.Offset,
			color = atmosphere.Color, decay = atmosphere.Decay,
			glare = atmosphere.Glare, haze = atmosphere.Haze,
		} else nil
		if not originalAtmosphere then atmosphere.Name = "NavalOceanAtmosphere" end
		atmosphere.Color = skyColor:Lerp(Color3.fromRGB(222, 231, 238), if phase == "night" then 0.2 else 0.35)
		atmosphere.Decay = if phase == "sunset" then Color3.fromRGB(234, 158, 114)
			elseif phase == "night" then Color3.fromRGB(90, 125, 170)
			else coast.sky
		atmosphere.Density = if mode == "fog" then 0.43 elseif mode == "storm" then 0.34 else 0.20
		atmosphere.Offset = if mode == "fog" then 0.05 else 0.22
		atmosphere.Haze = if mode == "fog" then 3.1 elseif mode == "storm" then 2.0 else 0.85
		atmosphere.Glare = if mode == "storm" or phase == "night" then 0 else 0.22
		if not originalAtmosphere then atmosphere.Parent = lighting end
		local terrain = workspace.Terrain
		local originalClouds = terrain:FindFirstChildOfClass("Clouds")
		local clouds = originalClouds or Instance.new("Clouds")
		local savedClouds = if originalClouds then {
			cover = clouds.Cover, density = clouds.Density, color = clouds.Color,
		} else nil
		if not originalClouds then clouds.Name = "NavalWeatherClouds" end
		clouds.Color = cloudColor
		clouds.Cover = if mode == "storm" then 0.77 elseif mode == "fog" then 0.56
			elseif mode == "rain" then 0.62 elseif phase == "night" then 0.34 else 0.22
		clouds.Density = if mode == "storm" then 0.74 elseif mode == "rain" then 0.53 else 0.38
		if not originalClouds then clouds.Parent = terrain end
		local bloom = Instance.new("BloomEffect")
		bloom.Name = "NavalSeaGlow"
		bloom.Intensity = if MOBILE_VFX then 0.10 else 0.19
		bloom.Size = 18
		bloom.Threshold = 1.4
		bloom.Parent = lighting
		local sunRays = Instance.new("SunRaysEffect")
		sunRays.Name = "NavalSeaSunRays"
		sunRays.Intensity = if mode == "storm" or phase == "night" then 0 else (if MOBILE_VFX then 0.025 else 0.07)
		sunRays.Spread = 0.62
		sunRays.Parent = lighting
		local colorGrade = Instance.new("ColorCorrectionEffect")
		colorGrade.Name = "NavalBattleEnvironmentGrade"
		colorGrade.TintColor = if phase == "night" then Color3.fromRGB(162, 181, 219)
			elseif phase == "sunset" then Color3.fromRGB(255, 220, 188) else Color3.fromRGB(241, 249, 255)
		colorGrade.Brightness = if phase == "night" then -0.12 elseif phase == "sunset" then 0.015 else 0.025
		colorGrade.Contrast = if mode == "storm" then 0.09 else 0.035
		colorGrade.Saturation = if mode == "storm" then -0.24 elseif phase == "night" then -0.12 else 0
		colorGrade.Parent = lighting
		-- [수평선 정리] 네모 하늘벽·공 구름·태양 구체·직사각형 파도판을 전부 폐기.
		-- [수면 결] 네이티브 불꽃 입자로 만든 낮은 거품은 보이지 않는 Terrain Attachment만 이용한다.
		local oceanNodes = {}
		for i = 1, (if MOBILE_VFX then 12 else 20) do
			local x, z = (i * 197 % 950) - 475, (i * 283 % 950) - 475
			local anchor = Instance.new("Attachment")
			anchor.Name = "NavalOceanFoam"
			anchor.WorldCFrame = CFrame.new(ORIGIN + Vector3.new(x, 0.18, z))
			anchor.Parent = terrain
			local foam = Instance.new("ParticleEmitter")
			foam.Texture = "rbxasset://textures/particles/sparkles_main.dds"
			foam.Color = ColorSequence.new(foamColor, coast.water:Lerp(Color3.fromRGB(234, 251, 253), 0.60))
			foam.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.78),
				NumberSequenceKeypoint.new(0.35, 0.52),
				NumberSequenceKeypoint.new(1, 1),
			})
			foam.Size = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.18),
				NumberSequenceKeypoint.new(0.30, if mode == "storm" then 0.85 else 0.48),
				NumberSequenceKeypoint.new(1, 0),
			})
			foam.Lifetime = NumberRange.new(0.52, 0.95)
			foam.Speed = NumberRange.new(0.6, if mode == "storm" then 4.2 else 2.5)
			foam.SpreadAngle = Vector2.new(165, 12)
			foam.EmissionDirection = Enum.NormalId.Top
			foam.Drag = 3.5
			foam.Rate = if MOBILE_VFX then 1.2 else (if mode == "storm" then 3.1 else 1.8)
			foam.LightEmission = 0.28
			foam.Parent = anchor
			table.insert(oceanNodes, anchor)
		end
		local weatherNodes = {}
		if mode == "rain" or mode == "storm" or coast.id == "north_sea" or coast.id == "arctic" then
			local snowfall = coast.id == "north_sea" or coast.id == "arctic"
			-- [기상 입자] 등록된 엔진 기본 입자만 사용. 터치 기기에서는 발생률 제한.
			for i = 1, (if MOBILE_VFX then 2 else 4) do
				local source = Instance.new("Attachment")
				source.Name = "NavalWeatherEmitter"
				source.WorldCFrame = CFrame.new(ORIGIN + Vector3.new(-240 + i * 96, 125, -170 + i * 68))
				source.Parent = terrain
				table.insert(weatherNodes, source)
				local rain = Instance.new("ParticleEmitter")
				rain.Texture = "rbxasset://textures/particles/sparkles_main.dds"
				rain.EmissionDirection = Enum.NormalId.Bottom
				rain.SpreadAngle = Vector2.new(73, 73)
				rain.Speed = if snowfall then NumberRange.new(7, 13)
					else NumberRange.new(if mode == "storm" then 66 else 45, if mode == "storm" then 84 else 59)
				rain.Lifetime = if snowfall then NumberRange.new(3, 5) else NumberRange.new(1.4, 1.9)
				rain.Size = NumberSequence.new(if snowfall then 0.38 else 0.22)
				rain.Transparency = NumberSequence.new(0.40, 0.90)
				rain.Color = ColorSequence.new(if snowfall then Color3.fromRGB(237, 246, 255) else Color3.fromRGB(176, 216, 231))
				rain.Rate = if snowfall then (if MOBILE_VFX then 18 else 42) else (if MOBILE_VFX then 26 else 72)
				rain.Parent = source
			end
		end
		-- [해무/특수 해역] 안개는 Atmosphere가 처리한다.
		-- 원형 빙산·네온 화산구·네모 등대는 실물 모델이 없어 새로 만들지 않는다.
		if coast.id == "volcanic" then
			local ashOrigin = Instance.new("Attachment")
			ashOrigin.Name = "NavalVolcanicAsh"
			ashOrigin.WorldCFrame = CFrame.new(ORIGIN + Vector3.new(445, 86, -388))
			ashOrigin.Parent = terrain
			table.insert(oceanNodes, ashOrigin)
			local ash = Instance.new("ParticleEmitter")
			ash.Texture = "rbxasset://textures/particles/smoke_main.dds"
			ash.Rate = if MOBILE_VFX then 3 else 9
			ash.Speed = NumberRange.new(4, 10)
			ash.Lifetime = NumberRange.new(2, 3.5)
			ash.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 2), NumberSequenceKeypoint.new(1, 7) })
			ash.Color = ColorSequence.new(Color3.fromRGB(72, 65, 63), Color3.fromRGB(127, 105, 100))
			ash.Transparency = NumberSequence.new(0.67, 1)
			ash.EmissionDirection = Enum.NormalId.Top
			ash.Parent = ashOrigin
		end
		-- [승인된 실물 지형] 라이선스 등록·실제 로딩이 완료된 모델만 복제한다.
		local distantShips = {}
		task.delay(1.0, function()
			if not folder.Parent then return end
			local lib = ReplicatedStorage:FindFirstChild("MareAssets")
			local terrain = lib and lib:FindFirstChild("Terrain")
			if not terrain then return end
			for index, spec in coast.props do
				if MOBILE_VFX and index > 3 then break end
				local template = terrain:FindFirstChild(spec[1])
				if template and template:IsA("Model") and AssetIds["Terrain/" .. spec[1]] then
					local model = template:Clone()
					for _, node in model:GetDescendants() do
						if node:IsA("BasePart") then
							node.Anchored = true
							node.CanCollide, node.CanTouch, node.CanQuery = false, false, false
						end
					end
					model.Name = "NavalCoast"
					model.Parent = folder
					local ok = pcall(function()
						local _, dims = model:GetBoundingBox()
						model:ScaleTo(spec[2] / math.max(dims.X, dims.Z, 0.01))
						local box, ext = model:GetBoundingBox()
						local bottom = box.Position - Vector3.new(0, ext.Y * 0.5, 0)
						local target = ORIGIN + Vector3.new(spec[3], 0, spec[4])
						model:PivotTo(CFrame.new(target - bottom) * model:GetPivot())
					end)
					if not ok then model:Destroy() end
				end
			end
			-- [원경 항해선] 실물 범선이 이미 로드된 경우에만 멀리 이동하는 해상 교통을 표현한다.
			local naval = lib:FindFirstChild("Naval")
			if naval and not MOBILE_VFX and coast.id ~= "arctic" then
				for i = 1, 2 do
					local shipName = if i == 1 then "boat-sail-a" else "ship-small"
					local template = naval:FindFirstChild(shipName)
					if template and template:IsA("Model") and AssetIds["Naval/" .. shipName] then
						local distant = placeShip(folder, shipName,
							ORIGIN + Vector3.new(-365 + i * 740, 0, -485 + i * 70), 23 + i * 5, i * 0.45)
						distant.Name = "NavalDistantMerchant"
						table.insert(distantShips, { model=distant, start=distant:GetPivot(), speed=i })
					end
				end
			end
		end)
		-- [연출 갱신] 움직이는 구름·거품·해무·번개만 저빈도로 갱신한다.
		local tickSum = 0
		local elapsed = 0
		local envConnection
		envConnection = RunService.Heartbeat:Connect(function(dt)
			if not folder.Parent then
				envConnection:Disconnect()
				return
			end
			tickSum += dt
			if tickSum < (if MOBILE_VFX then 0.20 else 0.10) then return end
			elapsed += tickSum
			tickSum = 0
			-- 기본 파도·하늘은 엔진이 움직인다. 매 프레임 사각형/구체를 갱신하지 않는다.
			for _, merchant in distantShips do
				if merchant.model.Parent then
					merchant.model:PivotTo(merchant.start * CFrame.new(math.sin(elapsed * 0.055 + merchant.speed) * 50,
						math.sin(elapsed * 1.2 + merchant.speed) * 0.27, 0))
				end
			end
			sea.Color = coast.water:Lerp(foamColor,
				0.035 + math.sin(elapsed * (if mode == "storm" then 1.5 else 0.6)) * 0.012)
			if mode == "storm" then
				local flash = math.sin(elapsed * 0.47 + sceneSeed) > 0.994
				colorGrade.Brightness = (if phase == "night" then -0.12 else 0.025) + (if flash then 0.23 else 0)
			end
		end)
		folder.Destroying:Connect(function()
			envConnection:Disconnect()
			-- [전투 종료 복원] 해상전용 하늘/바다 효과를 남기지 않아 탐험·항해 장면을 보호한다.
			for _, anchor in oceanNodes do anchor:Destroy() end
			for _, anchor in weatherNodes do anchor:Destroy() end
			lighting.ClockTime, lighting.FogColor = savedLighting.clock, savedLighting.fogColor
			lighting.FogStart, lighting.FogEnd = savedLighting.fogStart, savedLighting.fogEnd
			lighting.OutdoorAmbient = savedLighting.ambient
			if savedAtmosphere and atmosphere.Parent then
				atmosphere.Density, atmosphere.Offset = savedAtmosphere.density, savedAtmosphere.offset
				atmosphere.Color, atmosphere.Decay = savedAtmosphere.color, savedAtmosphere.decay
				atmosphere.Glare, atmosphere.Haze = savedAtmosphere.glare, savedAtmosphere.haze
			elseif not originalAtmosphere then atmosphere:Destroy() end
			if savedClouds and clouds.Parent then
				clouds.Cover, clouds.Density, clouds.Color = savedClouds.cover, savedClouds.density, savedClouds.color
			elseif not originalClouds then clouds:Destroy() end
			bloom:Destroy()
			sunRays:Destroy()
			colorGrade:Destroy()
		end)
	end

	-- [36척 해전 실물] 선박 구매·저장 ID를 유지하면서 등록된 V5 모델만 우선 수입한다.
	-- 터치 기기에서는 경량판을, 미등록 모델은 기존 원본을 그대로 사용한다.
	local function newShip(asset, length, pos, theta, tint, shipId)
		if shipId and AssetIds["Naval/" .. shipId .. "-v5"] then
			local light = shipId .. "-v5-mobile"
			asset = if MOBILE_VFX and AssetIds["Naval/" .. light] then light else shipId .. "-v5"
		end
		local m = placeShip(folder, asset, ORIGIN + pos, length, 0, tint)
		local base = m:GetPivot()
		local rot = base - base.Position
		return { model = m, pos = pos, theta = theta, speed = 0, rot = rot, y = base.Position.Y - ORIGIN.Y,
			length = length, fx = FX_PROFILES[shipId] or DEFAULT_FX, shipId = shipId }
	end
	local shipDef = ShipDefs.Ships[opts.shipId or ""]
	local myLen = if shipDef then math.clamp(26 + shipDef.hull * 0.1, 30, 52) else 40
	local myTop = if shipDef then 12 + shipDef.speed * 1.2 else 19
	local cannon = NC[SHIP_CANNON[opts.shipId or ""] or "demi"]
	local me = newShip(PLAYER_SHIP[opts.shipId] or "ship-medium", myLen, Vector3.new(-80, 0, 50), 0, nil, opts.shipId)
	local foe = newShip(if opts.isBoss then "ship-pirate-large" else "ship-pirate-medium", if opts.isBoss then 54 else 40, Vector3.new(80, 0, -50), math.pi)
	-- 해적 호위선: 연출용 (싸움 결과에는 영향 없음)
	local escorts = {}
	local escortCount = if opts.isBoss or opts.cardOnly then 0 else 2
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
				local al = newShip(PLAYER_SHIP[id] or "ship-small", len, me.pos + Vector3.new(-26 * math.ceil(i / 2), 0, 22 * side * math.ceil(i / 2)), 0, nil, id)
				al.nc = NC[SHIP_CANNON[id] or "demi"]
				al.slot = Vector3.new(-30 * math.ceil(i / 2), 0, 24 * side * math.ceil(i / 2))
				al.topSpeed = 12 + fd.speed * 1.2
				al.nextFire = os.clock() + 2 + i * 0.6
				table.insert(allies, al)
			end
		end
	end

	-- 주점 카드 대결 무대: 등록된 실내 소품(책장·램프·통·의자)으로 술집 안을 꾸민다
	if opts.cardOnly then
		local lib = ReplicatedStorage:FindFirstChild("MareAssets")
		local function prop(group, name, pos, height, yaw)
			local g = lib and lib:FindFirstChild(group)
			local tpl = g and g:FindFirstChild(name)
			if not (tpl and tpl:IsA("Model")) then
				return nil
			end
			local m = tpl:Clone()
			for _, d in m:GetDescendants() do
				if d:IsA("BasePart") then
					d.Anchored = true
					d.CanCollide = false
					d.CanQuery = false
				end
			end
			m.Parent = folder
			pcall(function()
				local _, ext = m:GetBoundingBox()
				m:ScaleTo(height / math.max(ext.Y, 0.01))
				m:PivotTo(CFrame.Angles(0, yaw, 0) * m:GetPivot())
				local c, sz = m:GetBoundingBox()
				m:PivotTo(CFrame.new(ORIGIN + pos - Vector3.new(c.Position.X - ORIGIN.X, c.Position.Y - sz.Y / 2 - ORIGIN.Y, c.Position.Z - ORIGIN.Z)) * m:GetPivot())
			end)
			return m
		end
		local mid = (me.pos + foe.pos) / 2
		local dir = (foe.pos - me.pos).Unit
		local back = Vector3.new(dir.Z, 0, -dir.X) -- 카메라 반대쪽(벽 쪽)
		local yawWall = math.atan2(-back.X, -back.Z)
		-- 뒷벽 쪽에 책장·통·램프를 늘어놓는다
		for i = -4, 4 do
			local at = mid + back * 82 + dir * (i * 26)
			if i % 3 == 0 then
				prop("Cargo", "barrel", at + Vector3.new(0, 0, 0), 12, yawWall)
			else
				prop("Interior", "bookcaseclosedwide", at, 26, yawWall)
			end
		end
		for i = -3, 3, 2 do
			local at = mid + back * 76 + dir * (i * 26) + Vector3.new(0, 20, 0)
			prop("Interior", "lampwall", at, 7, yawWall)
		end
		-- 탁자 둘레: 러그, 의자, 통, 술잔
		for _, sh in { me, foe } do
			prop("Interior", "rugrectangle", sh.pos + Vector3.new(0, 0.05, 0), 0.4, yawWall)
			prop("Interior", "stoolbar", sh.pos + back * 14 + dir * 14, 6, 0)
			prop("Interior", "stoolbar", sh.pos + back * 14 - dir * 14, 6, 0)
			prop("Cargo", "mug", sh.pos + dir * 6 + Vector3.new(0, 4.6, 0), 1.6, 0)
		end
		prop("Cargo", "chest", mid + back * 38, 6, yawWall)
		-- 따뜻한 촛불·램프 빛
		for i, pos in { mid + Vector3.new(0, 28, 0), me.pos + Vector3.new(0, 18, 0), foe.pos + Vector3.new(0, 18, 0) } do
			local lp = part(folder, Vector3.new(0.5, 0.5, 0.5), CFrame.new(ORIGIN + pos), Color3.fromRGB(255, 190, 110), Enum.Material.Neon, Enum.PartType.Ball)
			lp.Transparency = 1
			local light = Instance.new("PointLight")
			light.Color = Color3.fromRGB(255, 190, 110)
			light.Brightness = if i == 1 then 2.4 else 1.6
			light.Range = if i == 1 then 120 else 70
			light.Parent = lp
		end
	end

	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	cam.FieldOfView = 62

	local battleViewport = cam.ViewportSize -- [상단 HUD] 폰 가로/세로에서 체력·바람·전술을 분리한다.
	local gui = Instance.new("ScreenGui")
	gui.Name = "BattleGui"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 30
	gui.Parent = player:WaitForChild("PlayerGui")

	local function bar(side, name)
		local back = Instance.new("Frame")
		back.AnchorPoint = Vector2.new(if side == "L" then 0 else 1, 0)
		back.Position = UDim2.new(if side == "L" then 0 else 1, if side == "L" then 16 else -16, 0, 34)
		back.Size = UDim2.new(if battleViewport.X < 480 then 0.23 elseif battleViewport.X < 720 then 0.27 else 0.33, 0, 0, 22)
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
		nm.Position = UDim2.new(if side == "L" then 0 else 1, if side == "L" then 16 else -16, 0, 12)
		nm.Size = UDim2.new(if battleViewport.X < 480 then 0.23 elseif battleViewport.X < 720 then 0.27 else 0.33, 0, 0, 20)
		nm.TextTruncate = Enum.TextTruncate.AtEnd
		nm.TextXAlignment = if side == "L" then Enum.TextXAlignment.Left else Enum.TextXAlignment.Right
		nm.TextSize = if battleViewport.X < 480 then 11 else 14
		-- 막대 위에 선체 % 숫자를 크게 표시한다
		local pct = label(back, "100%", 14, Color3.fromRGB(255, 255, 255), true)
		pct.TextStrokeColor3 = Color3.fromRGB(12, 24, 35)
		pct.TextStrokeTransparency = 0.55
		pct.Size = UDim2.fromScale(1, 1)
		pct.ZIndex = 5
		return fill, pct, nm
	end
	local meFill, mePct, meName = bar("L", "우리 배")
	local foeFill, foePct = bar("R", opts.enemyName or "해적선")
	-- [함선 버프 표시] 기함 내구 막대의 아래쪽 3픽셀을 실제 스킬 남은 시간 표시로 쓴다.
	local buffFill = Instance.new("Frame")
	buffFill.Name = "ShipSkillBuffProgress"
	buffFill.Position = UDim2.new(0, 0, 1, -3)
	buffFill.Size = UDim2.new(0, 0, 0, 3)
	buffFill.BorderSizePixel = 0
	buffFill.BackgroundColor3 = Color3.fromRGB(160, 226, 255)
	buffFill.ZIndex = 6
	buffFill.Parent = meFill.Parent

	-- 선단 카드: 대항해시대 온라인처럼 우리 배와 적 배를 카드로 늘어놓고, 배마다 선체 막대를 보여 준다
	local function cardRow(anchorX, posX, posY, color)
		local row = Instance.new("Frame")
		row.AnchorPoint = Vector2.new(anchorX, 0)
		row.Position = UDim2.new(posX, if anchorX == 1 then -16 else 16, 0, posY)
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
		f.Visible = star or battleViewport.X >= 720 -- [좁은 화면] 양쪽 함대 카드가 서로 겹치지 않도록 기함 우선.
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
		local mine = cardRow(0, 0, 66)
		table.insert(myCards, { c = card(mine, opts.shipName or "기함", Color3.fromRGB(91, 181, 120), true), share = 1 })
		for _, f in opts.fleet or {} do
			table.insert(myCards, { c = card(mine, f, Color3.fromRGB(91, 181, 120), false), share = 0.5 })
		end
		local theirs = cardRow(1, 1, 66)
		table.insert(foeCards, { c = card(theirs, opts.enemyName or "해적선", Color3.fromRGB(214, 82, 76), true), share = 1 })
		for i = 1, if opts.isBoss then 0 else 2 do
			table.insert(foeCards, { c = card(theirs, "호위선", Color3.fromRGB(214, 120, 76), false), share = 0.4 })
		end
	end
	-- 바람 표시: 날씨와 바람 세기를 위쪽 가운데에 보여 준다
	do
		local wind = Instance.new("Frame")
		wind.AnchorPoint = Vector2.new(0.5, 0)
		wind.Position = UDim2.new(0.5, 0, 0, 10)
		wind.Size = UDim2.fromOffset(if battleViewport.X < 480 then 120 elseif battleViewport.X < 720 then 160 else 190, 32)
		wind.BackgroundColor3 = Color3.fromRGB(26, 34, 40)
		wind.BackgroundTransparency = 0.15
		wind.BorderSizePixel = 0
		wind.Parent = gui
		local wc = Instance.new("UICorner")
		wc.CornerRadius = UDim.new(0, 8)
		wc.Parent = wind
		local arrow = label(wind, "➤", 22, Color3.fromRGB(150, 220, 255))
		arrow.Position = UDim2.fromOffset(4, 4)
		arrow.Size = UDim2.fromOffset(24, 24)
		arrow.Rotation = opts.windAngle or 0
		local wl = label(wind, string.format("%s · 바람 %d%%", opts.weatherName or "맑음", math.floor((opts.wind or 1) * 100 + 0.5)), 14, Color3.fromRGB(250, 236, 200))
		wl.Position = UDim2.fromOffset(29, 6)
		wl.Size = UDim2.new(1, -34, 0, 20)
		wl.TextSize = if battleViewport.X < 480 then 10 else 12
		wl.TextTruncate = Enum.TextTruncate.AtEnd
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
	-- 동료 조언 띠: 항해사·포수 등이 상황을 보고 한마디 (한 번에 하나, 같은 말은 두 번까지)
	local adviceLine = label(gui, "", 14, Color3.fromRGB(255, 236, 190))
	adviceLine.AnchorPoint = Vector2.new(0.5, 0)
	adviceLine.Position = UDim2.new(0.5, 0, 0, 174)
	adviceLine.Size = UDim2.fromOffset(math.min(420, battleViewport.X - 32), 24)
	adviceLine.Visible = battleViewport.X >= 1000 -- [상단 안전 영역] 지원판·전술판 사이 조언 띠는 넓은 화면에서만 노출.
	adviceLine.BackgroundColor3 = Color3.fromRGB(34, 28, 22)
	adviceLine.BackgroundTransparency = 1
	adviceLine.TextTransparency = 1
	adviceLine.TextStrokeTransparency = 1
	adviceLine.TextWrapped = true
	local adviceCorner = Instance.new("UICorner")
	adviceCorner.CornerRadius = UDim.new(0, 8)
	adviceCorner.Parent = adviceLine
	local adviceNext, adviceShown = 0, {}
	local function navalSay(key, text, now)
		if now < adviceNext or (adviceShown[key] or 0) >= 2 then return false end
		adviceShown[key] = (adviceShown[key] or 0) + 1
		adviceNext = now + 9
		adviceLine.Text = string.format("%s: %s", opts.advisorName or "동료", text)
		adviceLine.BackgroundTransparency = 0.35
		adviceLine.TextTransparency = 0
		adviceLine.TextStrokeTransparency = 1
		local Tw = game:GetService("TweenService")
		task.delay(5.5, function()
			if adviceLine.Parent then
				Tw:Create(adviceLine, TweenInfo.new(0.6), { BackgroundTransparency = 1, TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
			end
		end)
		Sfx.play("sfx_bell", 0.25, 1.4, "sfx_click")
		return true
	end
	local rangeLabel = label(gui, string.format("🎯 %s · 사거리 %d · 탄속 %.1f초", cannon.name, cannon.range, cannon.dur), 13, Color3.fromRGB(255, 226, 150))
	rangeLabel.AnchorPoint = Vector2.new(0.5, 1)
	rangeLabel.Position = UDim2.new(0.5, 0, 1, -12)
	rangeLabel.Size = UDim2.fromOffset(math.min(460, math.max(180, battleViewport.X - 440)), 20)
	rangeLabel.Visible = battleViewport.X >= 720 -- [모바일] 조타·기술·가속과 겹치는 하단 중복 포각을 숨기고 전술판에 표시.
	rangeLabel.TextSize = if battleViewport.X < 480 then 11 else 13
	rangeLabel.TextTruncate = Enum.TextTruncate.AtEnd
	-- [해전 전술 판넬] 실제 적과의 거리·선측 각·장전 시간으로 다음 행동을 시각화한다.
	-- 중앙 아래쪽은 기존 장전 게이지, 위쪽은 전술 판단만 표시한다.
	local tactic = label(gui, "① 적선에 접근 중", 15, Color3.fromRGB(255, 224, 159), true)
	tactic.Name = "BattleTacticalReadout"
	tactic.AnchorPoint = Vector2.new(0.5, 0)
	tactic.Position = UDim2.new(0.5, 0, 0, 119)
	-- [중앙 해전 글씨] 축소·외곽선 번짐을 없애고 충분한 폭의 인쇄판에 고정 크기로 표시한다.
    tactic.Size = UDim2.new(if battleViewport.X < 480 then 0.66 elseif battleViewport.X < 720 then 0.60 else 0.50, 0, 0, 54)
    tactic.TextSize = if battleViewport.X < 480 then 15 else 18
    tactic.Font = Enum.Font.GothamBold
    tactic.TextScaled = false
    tactic.TextStrokeTransparency = 1
    tactic.TextTruncate = Enum.TextTruncate.AtEnd
    tactic.TextWrapped = true
    tactic.BackgroundColor3 = Color3.fromRGB(21, 29, 35)
    tactic.BackgroundTransparency = 0.04
	tactic.BorderSizePixel = 0
	tactic.Visible = not opts.cardOnly
	tactic.ZIndex = 10
	local tacticCorner = Instance.new("UICorner")
	tacticCorner.CornerRadius = UDim.new(0, 9)
	tacticCorner.Parent = tactic
	local tacticStroke = Instance.new("UIStroke")
	-- 전술판 테두리만 그려 한글 획이 두꺼워지는 현상을 막는다.
	tacticStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	tacticStroke.Color = Color3.fromRGB(178, 153, 106)
	tacticStroke.Thickness = 1.5
	tacticStroke.Parent = tactic
	local lastTacticText, lastTacticColor = "", nil
	-- [실전 사거리 나침반] 기존 사거리 원주 조각 재사용: 좌·우 선측포 영역, 회전 탐색광, 장전·포격·명중 펄스.
	-- 판정값은 원래 cannon.range와 각도 그대로 사용하며 장식용 기본 파츠를 추가하지 않는다.
	local rangeRing = { segments = {}, volleyUntil = 0, impactUntil = 0, hitUntil = 0, fade = 1 }
	do
		local count = if MOBILE_VFX then 28 else 40 -- [깨끗한 탐지 원] 모바일 포각 윤곽을 다듬되 고정 파츠만 재사용
		local segmentLength = 2 * math.pi * cannon.range / count * 0.86
		for i = 1, count do
			local seg = part(folder, Vector3.new(0.72, 0.12, segmentLength), CFrame.new(ORIGIN), Color3.fromRGB(255, 210, 128), Enum.Material.Neon)
			seg.Transparency = 0.78
			rangeRing.segments[i] = seg
		end
		-- 기존 등록 선박 메시와 사거리 원주에 광선만 연결한다. 새 Part·선박·외부 에셋은 만들지 않는다.
		local hullPart = me.model:FindFirstChildWhichIsA("BasePart", true)
		if hullPart then
			local origin = Instance.new("Attachment")
			origin.Name = "RangeSweepOrigin"
			origin.Parent = hullPart
			local edge = Instance.new("Attachment")
			edge.Name = "RangeSweepEdge"
			edge.Parent = rangeRing.segments[1]
			local sweep = Instance.new("Beam")
			sweep.Name = "RangeSweepBeam"
			sweep.Attachment0 = origin
			sweep.Attachment1 = edge
			sweep.FaceCamera = true
			sweep.LightEmission = 0.85
			sweep.Width0, sweep.Width1 = 0.035, if MOBILE_VFX then 0.17 else 0.25 -- [탐지 안테나] 얇은 단일 광선으로 정리
			sweep.Color = ColorSequence.new(Color3.fromRGB(160, 235, 215), Color3.fromRGB(255, 217, 139))
			sweep.Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.97),
				NumberSequenceKeypoint.new(0.56, 0.89),
				NumberSequenceKeypoint.new(1, 0.66),
			})
			sweep.Enabled = false
			sweep.Parent = folder
			rangeRing.radar = { hull = hullPart, origin = origin, edge = edge, beam = sweep }
		end
	end
	local trajDots = {}
	for i = 1, 14 do
		local d = part(folder, Vector3.new(0.8, 0.8, 0.8), CFrame.new(ORIGIN), Color3.fromRGB(255, 255, 255), Enum.Material.Neon, Enum.PartType.Ball)
		d.Transparency = 1
		trajDots[i] = d
	end
	sailLabel.AnchorPoint = Vector2.new(0.5, 0)
	sailLabel.Position = UDim2.new(0.5, 0, 0, if battleViewport.X < 480 then 69 else 44)
	sailLabel.Size = UDim2.fromOffset(if battleViewport.X < 480 then math.max(80, battleViewport.X - 240) elseif battleViewport.X < 720 then 160 else 190, 20)
	sailLabel.TextSize = if battleViewport.X < 480 then 11 else 14
	sailLabel.TextTruncate = Enum.TextTruncate.AtEnd
	-- 기동 점수: 포탄 낙하 경고를 피하면 올라간다 (결과와는 별개로 명성 보너스만 준다)
	local flair, combo, dodged = 0, 0, 0
	-- [지상 연타형 해전] 숫자를 매 프레임 늘였다 줄이는 대신 고정 픽셀 서체로 선명하게 표시한다.
	-- 좁은 폰에서는 왼편 해역에 배치해 우측 지원 카드·하단 기술 버튼과 겹치지 않는다.
	local comboLabel = label(gui, "", if battleViewport.X < 480 then 26 else 37, Color3.fromRGB(255, 226, 120))
	comboLabel.Name = "NavalHitStreak"
	comboLabel.Font = Enum.Font.GothamBold
	comboLabel.AnchorPoint = if battleViewport.X < 480 then Vector2.new(0, 0) else Vector2.new(0.5, 0)
	comboLabel.Position = if battleViewport.X < 480 then UDim2.fromOffset(12, 179)
		else UDim2.new(0.5, 0, 0, 202)
	comboLabel.Size = if battleViewport.X < 480 then UDim2.fromOffset(166, 42)
		else UDim2.fromOffset(math.min(380, battleViewport.X - 40), 48)
	comboLabel.TextStrokeColor3 = Color3.fromRGB(11, 17, 27)
	comboLabel.TextStrokeTransparency = 0.88
	comboLabel.TextTransparency = 1
	comboLabel.TextXAlignment = if battleViewport.X < 480 then Enum.TextXAlignment.Left else Enum.TextXAlignment.Center
	comboLabel.ZIndex = 19
	comboLabel.Visible = not opts.cardOnly
	local navalHitStreak, navalHitAt, streakNoticeToken = 0, -100, 0

	local subtitle = label(gui, "", 16)
	subtitle.AnchorPoint = Vector2.new(0.5, 1)
	subtitle.Position = UDim2.new(0.5, 0, 1, -96)
	subtitle.Size = UDim2.new(0.7, 0, 0, 40)
	subtitle.TextWrapped = true
	subtitle.Visible = opts.cardOnly or battleViewport.X >= 1000 -- [전술 화면] 짧은 화면 하단 조작과 설명 자막 분리

	local hint = label(gui, if opts.sim ~= nil and not opts.card and not opts.cardOnly then "배의 옆면을 적선 쪽으로 돌리면 대포가 나가요! 붉은 원은 적 포탄 낙하 지점 — 벗어나서 피하세요. 맞닿으면 백병전! 해역 가장자리까지 달리면 도망칠 수 있어요." elseif opts.card then "적선 가까이 다가가면 카드 대결이 시작돼요. 카드에서 이기면 전투 승리! 해역 가장자리까지 달리면 도망칠 수 있어요." else "가까이 가면 대포가 자동으로 나가고, 배가 맞닿으면 백병전! 해역 가장자리까지 달리면 도망칠 수 있어요.", 14, Color3.fromRGB(255, 226, 170))
	hint.AnchorPoint = Vector2.new(0.5, 1)
	hint.Position = UDim2.new(0.5, 0, 1, -150)
	hint.Size = UDim2.new(0.8, 0, 0, 36)
	hint.TextWrapped = true
	hint.Visible = not MOBILE_VFX or opts.cardOnly -- [폰트 정돈] 긴 도움말 대신 두 줄 전술 패널을 남긴다.

	local banner = label(gui, "", 44)
	banner.AnchorPoint = Vector2.new(0.5, 0.5)
	banner.Position = UDim2.fromScale(0.5, 0.4)
	banner.Size = UDim2.fromOffset(400, 70)
	banner.TextTransparency = 1
	banner.TextStrokeTransparency = 1
	-- [승패 시네마] 기존 승패 배너 아래에 실제 종료 원인만 표시한다. 임의 보상 금액은 만들지 않는다.
	local endingCaption = label(gui, "", 17, Color3.fromRGB(246, 224, 190), true)
	endingCaption.Name = "NavalOutcomeCaption"
	endingCaption.AnchorPoint = Vector2.new(0.5, 0.5)
	endingCaption.Position = UDim2.fromScale(0.5, 0.53)
	endingCaption.Size = UDim2.new(0.72, 0, 0, 45)
	endingCaption.BackgroundColor3 = Color3.fromRGB(20, 27, 35)
	endingCaption.BackgroundTransparency = 0.18
	endingCaption.TextWrapped = true
	endingCaption.ZIndex = 18
	endingCaption.Visible = false

	-- 카드 지원 표시판: 덱의 지식 카드가 해전을 자동으로 거드는 효과. 발동할 때마다 해당 줄이 번쩍이고 문구가 떠오른다.
	local CH = { chips = {}, shown = {} }
	do
		local entries = opts.cardEffects or {}
		if #entries > 0 and not opts.cardOnly then
			-- [카드 지원 겹침 방지] 실제 효과/칩은 모두 유지하고 보이는 높이만 남은 조작 공간에 맞춘다.
			local panel = Instance.new("ScrollingFrame")
			panel.AnchorPoint = Vector2.new(1, 0)
			panel.Position = UDim2.new(1, -16, 0, if battleViewport.X < 720 then 173 else 122)
			local entriesHeight = 24 + #entries * 30
			local availableHeight = if battleViewport.X < 480 then math.max(34, battleViewport.Y - 520)
				elseif battleViewport.X < 720 then math.max(54, battleViewport.Y - 405)
				else math.max(54, battleViewport.Y - 330)
			panel.Size = UDim2.fromOffset(if battleViewport.X < 480 then 166 else 190,
				math.min(entriesHeight, availableHeight))
			panel.CanvasSize = UDim2.fromOffset(0, entriesHeight)
			panel.ScrollingDirection = Enum.ScrollingDirection.Y
			panel.ScrollBarThickness = 3
			panel.ClipsDescendants = true
			panel.Visible = battleViewport.Y >= 380 and (battleViewport.X >= 720 or battleViewport.Y >= 520)
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

	-- [해전 원형 버튼] 기존 터치·키보드·쿨타임 함수는 유지하고 승인 원화만 교체한다.
	-- AssetIds 등록 전에는 기존 글자 버튼을 표시하므로 원화 등록 실패 시에도 조작이 살아 있다.
	local function mkBtn(text, pos, size, anchor, iconKey)
		local b = Instance.new("TextButton")
		b.Text = text
		b.AnchorPoint = anchor or Vector2.new(0, 1)
		b.Position = pos
		b.Size = size
		b.BackgroundColor3 = Color3.fromRGB(50, 83, 106)
		b.TextColor3 = Color3.fromRGB(250, 236, 200)
		b.Font = Enum.Font.GothamBold
		b.TextSize = 22
		b.ClipsDescendants = true
		b.BorderSizePixel = 0
		b.Parent = gui
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 14)
		c.Parent = b
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 2
        st.Parent = b
        -- [해상 기술] 버튼에 고유 확대 상태를 두고 재사용 완료 순간만 한 번 반짝인다.
        local readyScale = Instance.new("UIScale")
        readyScale.Name = "NavalReadyScale"
        readyScale.Scale = 1
        readyScale.Parent = b
		local assetId = iconKey and AssetIds[iconKey]
		if assetId then
			b.BackgroundTransparency = 1
			b.TextTransparency = 1
			b.ClipsDescendants = true
			b.AutoButtonColor = false
			st.Transparency = 0.08
			local art = Instance.new("ImageLabel")
			art.Name = "NavalButtonArtwork"
			art.AnchorPoint = Vector2.new(0.5, 0.5)
			art.Position = UDim2.fromScale(0.5, 0.5)
			art.Size = UDim2.fromScale(1, 1)
			art.BackgroundTransparency = 1
			art.Image = "rbxassetid://" .. tostring(assetId)
			art.ScaleType = Enum.ScaleType.Fit
			art.ZIndex = b.ZIndex + 1
			art.Active = false
			art.Parent = b
			local caption = Instance.new("TextLabel")
			caption.Name = "NavalButtonCaption"
			caption.AnchorPoint = Vector2.new(0.5, 1)
			caption.Position = UDim2.new(0.5, 0, 1, -4)
			caption.Size = UDim2.new(1, -8, 0, 17)
			caption.BackgroundTransparency = 1
			caption.Text = text
			caption.Font = Enum.Font.GothamBold
			caption.TextSize = if size.X.Offset >= 90 then 16 else 14
			caption.TextColor3 = Color3.fromRGB(255, 242, 211)
			caption.TextStrokeColor3 = Color3.fromRGB(14, 26, 44)
			caption.TextStrokeTransparency = 1
			caption.TextTruncate = Enum.TextTruncate.AtEnd
			caption.ZIndex = b.ZIndex + 2
			caption.Parent = b
		end
		-- [해상 기술 쿨타임] 숫자 대신 원형 아이콘 위 음영으로만 남은 비율을 표현한다.
		local cooling = Instance.new("Frame")
		cooling.Name = "NavalCooldownShade"
		cooling.Size = UDim2.fromScale(1, 1)
		cooling.BackgroundColor3 = Color3.fromRGB(12, 20, 32)
		cooling.BackgroundTransparency = 0.26
		cooling.BorderSizePixel = 0
		cooling.ZIndex = b.ZIndex + 3
		cooling.Visible = false
		cooling.Active = false
		cooling.Parent = b
		local mask = Instance.new("UICorner")
		mask.CornerRadius = UDim.new(1, 0)
		mask.Parent = cooling
		return b
	end
	local steerDir, throttle = 0, 1
	local speedBtn = mkBtn("가속", UDim2.new(1, -24, 1, -24), UDim2.fromOffset(96, 96), Vector2.new(1, 1), "Menu/naval_speed")
	speedBtn.TextSize = 20
	speedBtn:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
	local skip = mkBtn("건너뛰기", UDim2.new(0, 12, 0, if battleViewport.X < 480 then 181 else 119),
		UDim2.fromOffset(if battleViewport.X < 480 then 56 else 96, if battleViewport.X < 480 then 36 else 30), Vector2.new(0, 0)) -- [좌상단] 전술판·우측 카드 지원·왼쪽 조타와 분리
	skip.TextSize = if battleViewport.X < 480 then 11 else 14
	skip.TextWrapped = battleViewport.X < 480
	skip:FindFirstChildOfClass("UIStroke").ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	skip.Activated:Connect(finish)
	local phase = "duel" -- duel → board → end (도주 중엔 fleeing)
	-- [함선 특화 2스킬] 기존 Ships.trait에서 선박 역할을 읽는다. 모든 기함은 포 사격(Q) + 특화(E) 정확히 두 개.
	-- 백병형은 접현 돌진, 철갑·화물보호형은 2초 철벽, 정찰선은 회피, 포격형은 기존 일제사격.
	-- 기존 함종값·저장키·피해 공식은 수정하지 않고, 실시간 해전에서만 방어 판정을 적용한다.
	local SKILLS
	do
		local id = opts.shipId or ""
		local trait = if shipDef then shipDef.trait or {} else {}
		local special = if (trait.melee or 0) >= 0.08 or id == "galley" or id == "kadirga" or id == "privateer" or id == "xebec" then
			{ id = "dash", text = "접현 돌진", key = Enum.KeyCode.E, cd = 22, dur = 2.6, col = Color3.fromRGB(245, 153, 87) }
			elseif (trait.cargoGuard or 0) >= 0.08 or id == "ironclad_frigate" or id == "panokseon" or id == "junk" then
			{ id = "guard", text = "철벽 방어", key = Enum.KeyCode.E, cd = 32, dur = 2, col = Color3.fromRGB(118, 197, 244) }
			elseif (trait.evade or 0) > 0 or (trait.sail or 0) >= 0.10 or (trait.explore or 0) >= 0.08
				or id == "corvette" or id == "brigantine" then
			{ id = "evade", text = "회피 기동", key = Enum.KeyCode.E, cd = 16, dur = 4, col = Color3.fromRGB(70, 168, 198) }
			else
			{ id = "rapid", text = "일제사격", key = Enum.KeyCode.E, cd = 20, dur = 6, col = Color3.fromRGB(198, 105, 70) }
		-- [실제 함종별 조작감] 저장된 함선 이름·종류·행동 성향을 설명과 시청각 표현에 활용한다.
		-- 기술 개수·쿨타임·지속시간과 서버 전투 수치는 모두 기존 값 그대로 둔다.
		if special.id == "dash" then
			if id == "geobukseon" then
				special.text, special.cue = "철갑 돌진", "거북선 선수 돌격"
			elseif shipDef and shipDef.rowed then
				special.text, special.cue = "노선 돌진", "노잡이 일제 가속"
			else
				special.text, special.cue = "접현 돌진", "선수로 접근"
			end
		elseif special.id == "guard" then
			if id == "ironclad_frigate" then
				special.text, special.cue = "철갑 폐쇄", "장갑으로 포탄 방어"
			elseif id == "panokseon" then
				special.text, special.cue = "방패 갑판", "판옥선 방어 태세"
			elseif (trait.cargoGuard or 0) >= 0.08 then
				special.text, special.cue = "화물 격벽", "선창 피해 차단"
			else
				special.text, special.cue = "철벽 방어", "선체 피해 차단"
			end
		elseif special.id == "evade" then
			if id == "mist_seeker" or id == "flying_dutchman" then
				special.text, special.cue = "해무 기동", "안개를 타고 회피"
			elseif shipDef and shipDef.rowed then
				special.text, special.cue = "노선 회피", "빠른 노 방향 전환"
			elseif (trait.wind or 0) >= 0.08 then
				special.text, special.cue = "풍향 회피", "바람을 타고 선회"
			else
				special.cue = "측면 포격 회피"
			end
		elseif special.id == "rapid" then
			if id == "ship_of_line" then
				special.text, special.cue = "전열 일제", "양현 포문 개방"
			elseif id == "galleon" then
				special.text, special.cue = "갈레온 포격", "중포 연속 사격"
			elseif id == "frigate" then
				special.text, special.cue = "프리깃 포격", "장포 집중 사격"
			elseif (trait.cannon or 0) >= 0.08 then
				special.text, special.cue = "집중 일제", "화포 집중 사격"
			else
				special.cue = "포격 속도 증가"
			end
		end
		SKILLS = {
			{ id = "fire", text = "포 사격", cue = cannon.name .. " 발사", key = Enum.KeyCode.Q, cd = 7, dur = 0.7, col = Color3.fromRGB(204, 163, 98) },
			special,
		}
		if meName then
			local role = if trait.role then trait.role elseif shipDef and shipDef.rowed then "노선"
				elseif shipDef and shipDef.cannons >= 12 then "포격선" else "일반 함선"
			meName.Text = string.format("%s · %s", opts.shipName or shipDef and shipDef.name or "기함", role)
			meName.TextSize = if MOBILE_VFX then 12 else 14
			meName.TextTruncate = Enum.TextTruncate.AtEnd
		end
	end
	-- 스킬은 가속 버튼(오른쪽 아래) 둘레의 반원에 놓는다 (엄지로 닿기 쉽게)
	for i, sk in SKILLS do
		if battleViewport.X < 480 then
			-- [세로 폰 우측 열] 기술 2개를 가속 위로 쌓아 왼쪽 조타와 겹치지 않게 한다.
			sk.x = -72
			sk.y = if i == 1 then -300 else -184
		else
			local n = #SKILLS
			local ang = math.rad(if n == 1 then 135 else 120 + (i - 1) * (55 / (n - 1)))
			sk.x = -72 + math.floor(math.cos(ang) * 132)
			sk.y = -72 - math.floor(math.sin(ang) * 132)
		end
	end
	local skillPop = function(_text, _color) end -- popText 가 만들어진 뒤 연결된다
	local skillFx = function(_id, _dur) end -- FX 가 만들어진 뒤 연결된다
	local skillUntil, skillReady = { fire = 0, rapid = 0, evade = 0, dash = 0, guard = 0 },
		{ fire = 0, rapid = 0, evade = 0, dash = 0, guard = 0 }
	local fireOrderUntil = 0
	local nextMeFire = os.clock() + 0.9
	local skillBtn = {}
	local function useSkill(sk)
		local now = os.clock()
		if now < skillReady[sk.id] or opts.cardOnly or opts.card or phase ~= "duel" then return end
		if sk.id == "fire" then
			-- [실제 포 사격] 사거리/선측 조건을 만족할 때만 발동. 다음 자동 포격을 즉시 당겨 온다.
			-- 기존 포탄·명중·피해 계산은 원래 해전 책임 함수가 수행한다.
			local target = foe.pos - me.pos
			if target.Magnitude >= cannon.range or target.Magnitude < 0.1 then
				skillPop("사거리 밖!", Color3.fromRGB(255, 188, 112))
				return
			end
			local heading = Vector3.new(math.cos(me.theta), 0, math.sin(me.theta))
			if math.abs(heading:Cross(target.Unit).Y) <= 0.5 then
				skillPop("선측을 맞춰!", Color3.fromRGB(255, 188, 112))
				return
			end
			fireOrderUntil = now + 0.5
			nextMeFire = math.min(nextMeFire, now)
		end
		skillReady[sk.id] = now + sk.cd
		skillUntil[sk.id] = now + sk.dur
		skillPop(sk.text .. " · " .. (sk.cue or "발동") .. "!", sk.col)
		skillFx(sk.id, sk.dur)
		if sk.id == "rapid" or sk.id == "fire" then
			Sfx.play("sfx_skill_rapid", 0.65, 1, "sfx_horn")
			Sfx.play("sfx_naval_cannon", if sk.id == "fire" then 0.38 else 0.5, 0.82, "sfx_cannon")
		elseif sk.id == "guard" then
			Sfx.play("sfx_metal_clash", 0.75, if opts.shipId == "ironclad_frigate" then 0.62 else 0.82, "sfx_hit")
			Sfx.play(if opts.shipId == "panokseon" then "sfx_naval_wood" else "sfx_skill_evade", 0.44, 0.73, "sfx_horn")
		else
			Sfx.play("sfx_skill_evade", 0.8, if sk.id == "dash" then 1.18 else 1, "sfx_sail")
			Sfx.play("sfx_naval_splash", 0.45, 1.2, "sfx_splash")
			if sk.id == "dash" then
				Sfx.play(if shipDef and shipDef.rowed then "sfx_rope_pull" else "sfx_naval_ram", 0.46, 1.1, "sfx_creak")
			elseif opts.shipId == "mist_seeker" or opts.shipId == "flying_dutchman" then
				Sfx.play("sfx_wind", 0.38, 1.28, "sfx_sail")
			end
		end
	end
	for _, sk in SKILLS do
		local actionSize = if battleViewport.X < 520 or (MOBILE_VFX and battleViewport.Y < 330) then 104
			elseif MOBILE_VFX then 116 else 112
		local b = mkBtn(sk.text, UDim2.new(1, sk.x, 1, sk.y), UDim2.fromOffset(actionSize, actionSize), Vector2.new(0.5, 0.5),
			if sk.id == "fire" then "Menu/naval_fire" else "Menu/naval_skill")
		b.TextSize = 14
		b.TextWrapped = true
		b:FindFirstChildOfClass("UICorner").CornerRadius = UDim.new(1, 0)
		b.BackgroundColor3 = sk.col
		b.Visible = not opts.cardOnly
		b.Activated:Connect(function()
			useSkill(sk)
		end)
		skillBtn[sk.id] = b
	end
	-- 장전 게이지: 다음 포격까지 얼마나 남았는지 (사정거리 밖이면 회색)
	local reloadBack = Instance.new("Frame")
	reloadBack.AnchorPoint = Vector2.new(0.5, 1)
	reloadBack.Position = UDim2.new(0.5, 0, 1, if battleViewport.X < 480 then -295 elseif battleViewport.X < 720 then -212 else -62)
	reloadBack.Size = UDim2.fromOffset(if battleViewport.X < 480 then math.min(260, battleViewport.X - 40)
		elseif battleViewport.X < 720 then math.min(280, battleViewport.X - 48) else 300, 20)
	reloadBack.BackgroundColor3 = Color3.fromRGB(26, 34, 40)
	reloadBack.BackgroundTransparency = 0.15
	reloadBack.BorderSizePixel = 0
	reloadBack.Visible = not opts.cardOnly and (battleViewport.X >= 720 or (battleViewport.X < 480 and battleViewport.Y >= 620) or (battleViewport.X >= 480 and battleViewport.Y >= 520))
	reloadBack.Parent = gui
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = reloadBack
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 1.5
		st.Parent = reloadBack
	end
	local reloadFill = Instance.new("Frame")
	reloadFill.Size = UDim2.fromScale(1, 1)
	reloadFill.BackgroundColor3 = Color3.fromRGB(240, 180, 80)
	reloadFill.BorderSizePixel = 0
	reloadFill.Parent = reloadBack
	do
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0, 8)
		c.Parent = reloadFill
	end
	local reloadText = label(reloadBack, "포 장전", 12, Color3.fromRGB(255, 255, 255), true)
	reloadText.Size = UDim2.fromScale(1, 1)
	reloadText.ZIndex = 5
	-- 적선까지 거리 표시
	local distLabel = label(gui, "", 15, Color3.fromRGB(255, 255, 255))
	distLabel.AnchorPoint = Vector2.new(0.5, 1)
	distLabel.Position = UDim2.new(0.5, 0, 1, -36)
	distLabel.Size = UDim2.fromOffset(math.min(340, math.max(180, battleViewport.X - 440)), 22)
	distLabel.Visible = not opts.cardOnly and battleViewport.X >= 720 -- [모바일] 전술판에 거리·장전 상태 통합
	-- 적선이 화면 밖이면 가장자리에 방향 화살표
	local foeArrow = label(gui, "➤", 34, Color3.fromRGB(255, 96, 84))
	foeArrow.AnchorPoint = Vector2.new(0.5, 0.5)
	foeArrow.Size = UDim2.fromOffset(40, 40)
	foeArrow.Visible = false
	foeArrow.ZIndex = 18
	local foeArrowTag = label(gui, "", 12, Color3.fromRGB(255, 190, 180))
	foeArrowTag.AnchorPoint = Vector2.new(0.5, 0.5)
	foeArrowTag.Size = UDim2.fromOffset(90, 16)
	foeArrowTag.Visible = false
	foeArrowTag.ZIndex = 18
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
		steerDir = if math.abs(nx) < 0.12 then 0 else nx -- [조타 입력] 화면 오른쪽을 +로 고정하고 실제 화면 방향은 선회 루프에서 보정
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
		local caption = speedBtn:FindFirstChild("NavalButtonCaption")
		if caption and caption:IsA("TextLabel") then caption.Text = speedBtn.Text end
		local art = speedBtn:FindFirstChild("NavalButtonArtwork")
		if art and art:IsA("ImageLabel") then
			art.ImageTransparency = if throttle == 0 then 0.38 elseif throttle < 1 then 0.16 else 0
		end
	end)
	-- 키보드(PC): A/D 또는 방향키
	local UIS = game:GetService("UserInputService")
	table.insert(conns, UIS.InputBegan:Connect(function(i, gp)
		if gp then
			return
		end
		for _, sk in SKILLS do
			if i.KeyCode == sk.key then
				useSkill(sk)
			end
		end
		if i.KeyCode == Enum.KeyCode.A or i.KeyCode == Enum.KeyCode.Left then
			steerDir = -1 -- [좌현 조향] 스틱과 키보드 좌측을 일치시킨다
		elseif i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then
			steerDir = 1
		end
	end))
	table.insert(conns, UIS.InputEnded:Connect(function(i)
		if i.KeyCode == Enum.KeyCode.A or i.KeyCode == Enum.KeyCode.Left or i.KeyCode == Enum.KeyCode.D or i.KeyCode == Enum.KeyCode.Right then
			steerDir = 0
		end
	end))

	-- 전투 기록: 서로 순서대로 맞는 포격 큐와 마무리 백병전 큐
	local events = parseLog(if opts.sim ~= nil and not opts.card and not opts.cardOnly then {} else (opts.log or {}))
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
	-- 실시간 해전: 두 배의 선체·선원을 장면 안에서 직접 깎는다. 서버는 끝난 뒤 보고만 검사한다.
	local RT = opts.sim ~= nil and not opts.card and not opts.cardOnly
	local rt = nil
	if RT then
		rt = {
			meHull = opts.sim.me.hull, meMax = opts.sim.me.maxHull, meCrew = opts.sim.me.crew,
			foeHull = opts.sim.foe.hull, foeMax = opts.sim.foe.maxHull, foeCrew = opts.sim.foe.crew,
			start = os.clock(), ended = false, contact = 0, shots = 0, hits = 0,
		}
		meHp = rt.meHull / rt.meMax
		foeHp = rt.foeHull / rt.foeMax
	end
	local meDone, foeDone = 0, 0 -- 소비한 포격 수

	local dmgPop = function(_toPlayer, _amount) end -- 피해 숫자 (popText 근처에서 연결)
	local function applyHit(toPlayer, e)
		dmgPop(toPlayer, e and e.hull or 0)
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
	-- 접현 카드 전투: 배가 맞닿으면 화면이 카드판으로 바뀐다. 규칙은 BoardingCards (2줄 × 3판 2선승, 한 판 5장).
	-- 전투 결과 자체는 서버 판정 그대로이고, 카드전의 승패는 기동 점수(명성 보너스)에만 반영된다.
local BC = require(script.Parent:WaitForChild("BoardingCards"))
	local boardingOn = false
	-- 능력의 본래 효과를 유지하면서 카드 인장·선택 설명에 동일하게 표시한다.
	local ROW_ICON = { melee = "근접", ranged = "사격", cannon = "포격" }
	-- 카드 종류별 효과음 (공용 CC0 음원 파생). 새 소리가 아직 등록 전이면 기존 소리로 대신한다.
	local function cardSfx(c, side)
		local q = if side == "foe" then 0.8 else 1
		local function s(name, vol, speed, fb, wait)
			if wait then
				task.delay(wait, function() Sfx.play(name, vol * q, speed, fb) end)
			else
				Sfx.play(name, vol * q, speed, fb)
			end
		end
		s("sfx_card_place", 0.6, 1, "sfx_boarding_draw")
		local sp = c.special
		if sp == "scorch" then
			s("sfx_card_fire", 0.8, 1, "sfx_naval_cannon")
			s("sfx_naval_hull_hit", 0.6, 0.9, "sfx_hit", 0.25)
		elseif sp == "weather" then
			s("sfx_card_magic", 0.7, 1, "sfx_wind")
			s(if c.row == "cannon" then "sfx_ambience_storm" else "sfx_wind", 0.5, 1, nil, 0.2)
		elseif sp == "clear" then
			s("sfx_card_magic", 0.6, 1.2, "sfx_wind")
			s("sfx_gull", 0.4, 1, nil, 0.3)
		elseif sp == "wind" then
			s("sfx_sail", 0.7, 1, "sfx_sail_fabric", 0.1)
			s("sfx_card_deal", 0.6, 1, "sfx_book_turn", 0.35)
		elseif sp == "horn" then
			s("sfx_horn", 0.7, 1, nil, 0.1)
		elseif sp == "decoy" then
			s("sfx_rope_pull", 0.6, 1, nil, 0.1)
		elseif sp then
			s("sfx_book_turn", 0.6, 1, nil, 0.1)
		else
			if c.row == "ranged" then
				s("sfx_card_volley", 0.7, 1, "sfx_rope_release", 0.08)
			elseif c.row == "cannon" then
				s("sfx_naval_cannon", 0.6, 1.1, "sfx_cannon", 0.08)
			else
				s("sfx_card_swing", 0.7, 1, "sfx_metal_clash", 0.08)
			end
			local ab = c.ability
			if ab == "spy" then s("sfx_ship_cabin_door", 0.6, 1, nil, 0.3)
			elseif ab == "medic" then s("sfx_card_ring", 0.6, 1, "sfx_bell", 0.3)
			elseif ab == "bond" then s("sfx_card_armor", 0.6, 1, "sfx_rope_pull", 0.3)
			elseif ab == "morale" then s("sfx_card_chain", 0.6, 1, "sfx_horn", 0.3)
			elseif ab == "snipe" then s("sfx_naval_cannon", 0.7, 0.9, "sfx_cannon", 0.3) end
			if c.hero then s("sfx_card_blade", 0.6, 1, "sfx_fanfare", 0.15) end
		end
	end
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
			m = BC.build(cfg.kind, cfg.seed, { fighter = cfg.my, deckCards = if cfg.book then nil else (opts.deck and opts.deck.cards), faction = opts.deck and opts.deck.faction, book = cfg.book or (opts.deck and opts.deck.book) }, { fighter = cfg.foe, boss = opts.isBoss == true })
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

		local englishRows = { melee = "Front", ranged = "Back", cannon = "Back" }
		local englishCategories = { ["선박"] = "Ship", ["유물"] = "Artifact", ["동물"] = "Animal", ["지형·원더"] = "Landmark", ["인물"] = "Person", ["사건"] = "Event", ["기술"] = "Technology", ["병종"] = "Troop", ["전설 생물"] = "Legendary Creature", ["미스터리"] = "Mystery" }
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
		local englishLeaders = { draw = "Command", clear = "Open Sea Route", snipe = "Snipe", napoleon = "Napoleon", caesar = "Caesar", alexander = "Alexander", charlemagne = "Charlemagne", elizabeth = "Elizabeth I", genghis = "Genghis Khan", qinshi = "Qin Shi Huang", yisunsin = "Yi Sun-sin", nobunaga = "Oda Nobunaga", pachacuti = "Pachacuti", montezuma = "Montezuma II", sittingbull = "Sitting Bull", saladin = "Saladin", suleiman = "Suleiman the Magnificent", cyrus = "Cyrus the Great", mansa = "Mansa Musa", hannibal = "Hannibal", shaka = "Shaka Zulu", rajaraja = "Rajaraja I", tranhungdao = "Tran Hung Dao", akbar = "Akbar" }
		local function cardName(c)
			if c.pigForm then return t("돼지", "Pig") end
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
		local function baseCardDescription(c)
			local translation = BC.CardEnglish[c.id]
			local tactic = if translation and translation.text then (if english then translation.text else c.text) else nil
			if c.cause or c.fuse then
				local function nm(id)
					local d = BC.Units[id] or BC.Specials[id]
					local en = BC.CardEnglish[id]
					return if english and en then en.name else (d and d.name or id)
				end
				if c.cause then
					local chain = if english then "Chain: +2 while " .. nm(c.cause) .. " is on your field" else "연쇄: " .. nm(c.cause) .. "이(가) 내 필드에 있으면 +2"
					return if tactic then tactic .. "\n" .. chain else chain
				end
				local fuse = if english then "Fuse: " .. nm(c.fuse[1]) .. " + " .. nm(c.fuse[2]) .. " merge into one, +3, free play" else "합치기: " .. nm(c.fuse[1]) .. " + " .. nm(c.fuse[2]) .. "이(가) 있으면 하나로 합쳐 +3, 낸 수에 안 셈"
				return if tactic then tactic .. "\n" .. fuse else fuse
			end
			if tactic then return tactic end
			if c.refuteKind then
				return if english then "Refute: cut the enemy's " .. c.refuteKind .. " chains" else c.text or "반증"
			end
			if not english then
				if c.special then return c.text or "전술 카드" end
				if c.ability then return ABIL_DETAIL[c.ability] or "" end
				return if c.hero then "영웅 · 날씨와 소각의 영향을 받지 않음" else "병종에 맞는 줄(근접=전열, 사격·포=후열)에 배치"
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
		local function cardDescription(c)
			local description = baseCardDescription(c)
			local role = c.starterRole and BC.StarterText[c.starterRole]
			if role then
				local text = role[if english then 2 else 1]
				if c.cause or c.fuse or c.ability then return text .. "\n" .. description end
				return text
			end
			return description
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
		-- [카드배틀 모바일] 전투 계산은 그대로 두고 표시 구역만 화면 폭에 맞춘다.
		local compactCards = opts.cardOnly and (battleViewport.X < 720 or battleViewport.X < battleViewport.Y or battleViewport.Y < 480)
		-- [카드 대전 실조작] 기존 종료 버튼을 카드판 최상위에 표시한다. 전투 판정과 종료 콜백은 그대로 사용한다.
		if opts.cardOnly then
			skip.Parent = g
			-- 카드판 시작 시 원래 해전 GUI를 숨겼으므로 실제 종료 버튼은 이 화면에서 다시 표시해야 한다.
			skip.Visible = true
			skip.Active = true
			skip.Interactable = true
			skip.AnchorPoint = Vector2.zero
			skip.Position = if compactCards then UDim2.new(0.98, -96, 0.012, 0) else UDim2.fromScale(0.02, 0.84)
			skip.Size = if compactCards then UDim2.fromOffset(96, 40) else UDim2.fromOffset(112, 44)
			skip.ZIndex = 30
		end
		table.insert(conns, { Disconnect = function()
			if g.Parent then
				g:Destroy()
			end
		end })
		local paper = Color3.fromRGB(224, 205, 163)
		local ink = Color3.fromRGB(49, 37, 27)
		local brass = Color3.fromRGB(158, 113, 59)
		local rowIcons = {
			melee = if opts.cardOnly and AssetIds["CardArt/ui_icon_shield"] then "CardArt/ui_icon_shield" else "Menu/cc0_sword",
			ranged = if opts.cardOnly and AssetIds["CardArt/ui_icon_bow"] then "CardArt/ui_icon_bow" else "Menu/cc0_crossbow",
			cannon = "Menu/cc0_fireball",
		}

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

		-- 공용 CC0 그림 아이콘(Menu/cc0_*)은 업로드 전이면 예전 단색 아이콘으로 대신한다.
		local LEGACY_ICON = {
			["Menu/cc0_sword"] = "Menu/battle", ["Menu/cc0_crossbow"] = "Menu/chart_compass",
			["Menu/cc0_fireball"] = "Menu/chart_anchor", ["Menu/cc0_shield"] = "Menu/chart_anchor",
			["Menu/cc0_helmet"] = "Menu/chart_compass", ["Menu/cc0_glove"] = "Menu/route",
			["Menu/cc0_yes"] = "Menu/route", ["Menu/cc0_book"] = "Menu/tech",
		}
		local function emblem(parent, assetKey, position, size)
			local colored = false
			if LEGACY_ICON[assetKey] then
				if AssetIds[assetKey] then colored = true else assetKey = LEGACY_ICON[assetKey] end
			end
			local icon = Instance.new("ImageLabel")
			icon.AnchorPoint = Vector2.new(0, 0.5)
			icon.Position = position
			icon.Size = size
			icon.BackgroundColor3 = paper
			icon.BorderSizePixel = 0
			icon.ScaleType = Enum.ScaleType.Fit
			icon.Image = "rbxassetid://" .. AssetIds[assetKey]
			icon.ImageColor3 = if colored then Color3.new(1, 1, 1) else Color3.fromRGB(114, 75, 43)
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
			bg.BackgroundTransparency = if opts.cardOnly then 0 else 0.42 -- 뒤로 3D 무대(두 배 또는 술집 탁자와 선원)가 비쳐 보인다
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
		local regionBattleArt = {
			europe = "CardArt/battle_europe", east_asia = "CardArt/battle_east_asia",
			middle_east = "CardArt/battle_middle_east", new_world = "CardArt/battle_new_world",
			africa = "CardArt/battle_africa", southeast_asia = "CardArt/battle_southeast_asia",
		}
		local regionArtKey = opts.cardOnly and m.faction and regionBattleArt[m.faction.me]
		local boardArtKey = if regionArtKey and AssetIds[regionArtKey] then regionArtKey
			elseif AssetIds["CardArt/battle_board"] then "CardArt/battle_board" else "CardArt/event_chart_world"
		local boardArt = Instance.new("ImageLabel")
		boardArt.Name = "NavalCardBattleBoard"
		boardArt.Size = UDim2.fromScale(1, 1)
		boardArt.BackgroundTransparency = 1
		boardArt.BorderSizePixel = 0
		boardArt.ScaleType = Enum.ScaleType.Crop
		boardArt.Image = if AssetIds[boardArtKey] then "rbxassetid://" .. tostring(AssetIds[boardArtKey]) else ""
		boardArt.ImageTransparency = if opts.cardOnly then (if regionArtKey and AssetIds[regionArtKey] then 0.25 else 0.9)
			elseif cfg then 0.64 elseif boardArtKey == "CardArt/battle_board" then 0.07 else 0.58
		boardArt.ZIndex = 1
		boardArt.Parent = bg
		-- [가독성] 6개 카드 줄·손패·버튼은 이미지보다 위의 원래 UI 인스턴스를 사용한다.
		local boardWash = Instance.new("Frame")
		boardWash.Name = "BattleBoardContrast"
		boardWash.Size = UDim2.fromScale(1, 1)
		boardWash.BackgroundColor3 = Color3.fromRGB(15, 24, 40)
		boardWash.BackgroundTransparency = if opts.cardOnly then 0.53 elseif cfg then 0.84 else 0.73
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
		chartMark.ImageTransparency = if string.find(boardArtKey, "CardArt/battle_", 1, true) == 1 then 1 else 0.92
		chartMark.ImageColor3 = Color3.fromRGB(214, 170, 96)
		chartMark.Parent = bg
		local battleLine = Instance.new("Frame")
		battleLine.AnchorPoint = Vector2.new(0, 0.5)
		battleLine.Position = if compactCards then UDim2.fromScale(0.01, 0.463) else UDim2.fromScale(if opts.cardOnly then 0.21 else 0.2, if opts.cardOnly then 0.39 else 0.42)
		battleLine.Size = UDim2.fromScale(if compactCards then 0.98 elseif opts.cardOnly then 0.57 else 0.78, 0.004)
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
		header.Size = if compactCards then UDim2.new(0.89, -84, 1, 0) else UDim2.fromScale(0.89, 1)
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
		info.BackgroundTransparency = 0.45
		info.BackgroundColor3 = Color3.fromRGB(46, 40, 34)
		local infoCorner = Instance.new("UICorner")
		infoCorner.CornerRadius = UDim.new(0, 8)
		infoCorner.Parent = info
		local infoPad = Instance.new("UIPadding")
		infoPad.PaddingLeft = UDim.new(0, 10)
		infoPad.Parent = info
		-- [라운드 결과] 승리·무승부·패배 원화는 안내 문자 위에 짧게 표시한다.
		local roundResult = Instance.new("ImageLabel")
		roundResult.Name = "CardBattleRoundResult"
		roundResult.AnchorPoint = Vector2.new(0.5, 0)
		roundResult.Position = if compactCards then UDim2.fromScale(0.5, 0.235) else UDim2.fromScale(0.5, 0.13)
		roundResult.Size = UDim2.fromOffset(70, 70)
		roundResult.BackgroundTransparency = 1
		roundResult.ScaleType = Enum.ScaleType.Fit
		roundResult.ZIndex = 27
		roundResult.Visible = false
		roundResult.Parent = g
		local roundResultTick = 0

		local boardFrame = Instance.new("Frame")
		boardFrame.Position = if compactCards then UDim2.fromScale(0.012, 0.233) else UDim2.fromScale(if opts.cardOnly then 0.21 else 0.2, if opts.cardOnly then 0.13 else 0.14)
		boardFrame.Size = if compactCards then UDim2.fromScale(0.976, 0.46) else UDim2.fromScale(if opts.cardOnly then 0.57 else 0.78, if opts.cardOnly then 0.52 else 0.56)
		boardFrame.BackgroundTransparency = 1
		boardFrame.Parent = g
		-- 왼쪽 정보판: 양쪽 합계 원, 목숨 보석, 멈춤 표시, 날씨
		local panel = Instance.new("Frame")
		panel.Position = if compactCards then UDim2.fromScale(0.012, 0.133) else UDim2.fromScale(if opts.cardOnly then 0.79 else 0.02, 0.14)
		panel.Size = if compactCards then UDim2.fromScale(0.976, 0.091) else UDim2.fromScale(0.17, 0.56)
		panel.BackgroundColor3 = Color3.fromRGB(30, 23, 19)
		panel.BorderSizePixel = 0
		panel.Parent = g
		frameEdge(panel, brass, 6)
		local function sidePlate(y, color)
			local plate = Instance.new("Frame")
			plate.Position = if compactCards then UDim2.fromScale(if y < 0.5 then 0.015 else 0.515, 0.04) else UDim2.fromScale(0.05, y)
			plate.Size = if compactCards then UDim2.fromScale(0.47, 0.92) else UDim2.fromScale(0.9, 0.4)
			plate.BackgroundColor3 = color
			plate.BorderSizePixel = 0
			plate.Parent = panel
			frameEdge(plate, brass, 5)
			-- [실제 점수판 원화] 적은 벽돌색, 내 편은 남색 아카이브 판.
			local scoreKey = if y < 0.5 then "CardArt/ui_score_enemy" else "CardArt/ui_score_player"
			if opts.cardOnly and AssetIds[scoreKey] then
				local scoreArt = Instance.new("ImageLabel")
				scoreArt.Name = "BattleScoreArtwork"
				scoreArt.Size = UDim2.fromScale(1, 1)
				scoreArt.BackgroundTransparency = 1
				scoreArt.Image = "rbxassetid://" .. tostring(AssetIds[scoreKey])
				scoreArt.ImageTransparency = 0.22
				scoreArt.ScaleType = Enum.ScaleType.Stretch
				scoreArt.Parent = plate
			end
			local who = label(plate, "", 14, Color3.fromRGB(250, 236, 200), true)
			who.Position = UDim2.fromScale(0.04, 0.02)
			who.Size = UDim2.fromScale(0.92, 0.2)
			who.TextScaled = true
			local total = label(plate, "0", 30, Color3.fromRGB(46, 33, 22), true)
			total.AnchorPoint = Vector2.new(0.5, 0.5)
			total.Position = UDim2.fromScale(0.5, 0.52)
			total.Size = UDim2.fromScale(0.4, 0.42)
			total.BackgroundColor3 = Color3.fromRGB(232, 194, 120)
			total.BackgroundTransparency = 0
			total.TextScaled = true
			total.TextStrokeTransparency = 1
			frameEdge(total, Color3.fromRGB(255, 226, 150), 99)
			local gems = label(plate, "", 18, Color3.fromRGB(255, 120, 96), true)
			gems.Position = UDim2.fromScale(0.04, 0.78)
			gems.Size = UDim2.fromScale(0.92, 0.2)
			gems.TextScaled = true
			-- [카드 전투] 옛 원형 지도자 초상 제거, 비카드 접현전은 기존 기능 유지.
			local leader
			if not opts.cardOnly then
				-- 지도자 초상(왼쪽 원)과 덱 더미(오른쪽 겹친 카드 + 남은 장수)
				leader = label(plate, "", 16, Color3.fromRGB(46, 33, 22), true)
				leader.AnchorPoint = Vector2.new(0, 0.5)
				leader.Position = UDim2.fromScale(0.03, 0.52)
				leader.Size = UDim2.fromScale(0.27, 0.36)
				leader.BackgroundColor3 = Color3.fromRGB(214, 176, 104)
				leader.BackgroundTransparency = 0
				leader.TextScaled = true
				leader.TextStrokeTransparency = 1
				local ar = Instance.new("UIAspectRatioConstraint")
				ar.Parent = leader
				local rc = Instance.new("UICorner")
				rc.CornerRadius = UDim.new(1, 0)
				rc.Parent = leader
				frameEdge(leader, Color3.fromRGB(255, 226, 150), 99)
			end
			local pile = Instance.new("Frame")
			pile.AnchorPoint = Vector2.new(1, 0.5)
			pile.Position = UDim2.fromScale(0.97, 0.52)
			pile.Size = UDim2.fromScale(0.24, 0.4)
			pile.BackgroundTransparency = 1
			pile.Parent = plate
			for k = 2, 0, -1 do
				local sheet = Instance.new("Frame")
				sheet.Position = UDim2.fromScale(0.0 + k * 0.08, 0.0 + k * 0.05)
				sheet.Size = UDim2.fromScale(0.72, 0.82)
				sheet.BackgroundColor3 = Color3.fromRGB(34 + k * 8, 56 + k * 8, 84 + k * 8)
				sheet.BorderSizePixel = 0
				sheet.Parent = pile
				frameEdge(sheet, brass, 3)
				-- [카드 뒷면] 오늘의 항해 나침반 원화는 실제 등록번호가 있을 때만 덮는다.
				if opts.cardOnly and AssetIds["CardArt/battle_card_back"] then
					local backArt = Instance.new("ImageLabel")
					backArt.Name = "CardBackArtwork"
					backArt.Size = UDim2.fromScale(1, 1)
					backArt.BackgroundTransparency = 1
					backArt.ScaleType = Enum.ScaleType.Crop
					backArt.Image = "rbxassetid://" .. tostring(AssetIds["CardArt/battle_card_back"])
					backArt.Parent = sheet
					local backCorner = Instance.new("UICorner")
					backCorner.CornerRadius = UDim.new(0, 3)
					backCorner.Parent = backArt
				end
			end
			local deckCount = label(pile, "", 14, Color3.fromRGB(250, 236, 200), true)
			deckCount.Size = UDim2.fromScale(0.72, 0.82)
			deckCount.TextScaled = true
			deckCount.ZIndex = 5
			return { who = who, total = total, gems = gems, plate = plate, leader = leader, deck = deckCount }
		end
		local foePlate = sidePlate(0.02, Color3.fromRGB(88, 58, 50))
		local mePlate = sidePlate(0.58, Color3.fromRGB(58, 74, 62))
		local weatherTag = label(panel, "", 13, Color3.fromRGB(192, 212, 239), true)
		weatherTag.Position = UDim2.fromScale(0.04, 0.435)
		weatherTag.Size = UDim2.fromScale(0.92, 0.13)
		weatherTag.TextScaled = true
		weatherTag.TextWrapped = true
		weatherTag.Visible = not compactCards
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
					sayAdvice(if opts.cardOnly then string.format("정찰: 상대는 %s · %s 덱. 약한 줄은 %s이니 %s 줄 카드가 유리해요.", sc.faction, sc.style, sc.weakName, BC.ROW_NAME[sc.counterRow]) else string.format("정찰: 적은 %s · %s · %s. 약한 줄은 %s이니 %s 줄 카드가 유리해요.", sc.faction, sc.style, sc.sea, sc.weakName, BC.ROW_NAME[sc.counterRow]), 9)
				end
			end)
		end
		-- [손패 받침대] 카드 아이콘·터치 확대 기능은 기존 ScrollingFrame에서 처리한다.
		local handTray = Instance.new("Frame")
		handTray.Name = "NavalCardHandTray"
		handTray.Position = if compactCards then UDim2.fromScale(0.012, 0.773) else UDim2.fromScale(if opts.cardOnly then 0.21 else 0.015, if opts.cardOnly then 0.66 else 0.715)
		handTray.Size = if compactCards then UDim2.fromScale(0.976, 0.219) else UDim2.fromScale(if opts.cardOnly then 0.57 else 0.75, if opts.cardOnly then 0.335 else 0.275)
		handTray.BackgroundColor3 = Color3.fromRGB(18, 39, 58)
		handTray.BackgroundTransparency = if opts.cardOnly then 0.6 else 0.27
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
		handFrame.Position = if compactCards then UDim2.fromScale(0.018, 0.777) else UDim2.fromScale(if opts.cardOnly then 0.215 else 0.02, if opts.cardOnly then 0.665 else 0.72)
		handFrame.Size = if compactCards then UDim2.fromScale(0.964, 0.211) else UDim2.fromScale(if opts.cardOnly then 0.56 else 0.74, if opts.cardOnly then 0.325 else 0.26)
		handFrame.BackgroundTransparency = 1
		handFrame.BorderSizePixel = 0
		handFrame.ScrollingDirection = Enum.ScrollingDirection.X
		handFrame.AutomaticCanvasSize = Enum.AutomaticSize.X
		handFrame.CanvasSize = UDim2.fromOffset(0, 0)
		handFrame.ScrollBarThickness = 4
		handFrame.ScrollBarImageColor3 = Color3.fromRGB(186, 141, 73)
		local handPadding = Instance.new("UIPadding")
		handPadding.PaddingTop = UDim.new(0, if compactCards then 3 else 10)
		handPadding.PaddingBottom = UDim.new(0, if compactCards then 3 else 8)
		handPadding.PaddingLeft = UDim.new(0, 3)
		handPadding.Parent = handFrame
		handFrame.Parent = g
		local handLay = Instance.new("UIListLayout")
		handLay.FillDirection = Enum.FillDirection.Horizontal
		handLay.SortOrder = Enum.SortOrder.LayoutOrder
		handLay.Padding = UDim.new(0, 5)
		handLay.Parent = handFrame

		local showLeaderCard -- [전투 중 지도자 카드] 기존 카드 확대 UI를 사용한다.
		local function mkSide(text, y, color, assetKey, onClick)
			local b = Instance.new("TextButton")
			b.Text = ""
			if compactCards then
				local index = if y == 0.765 then 0 elseif y == 0.83 then 1 elseif y == 0.70 then 2 else 3
				b.Position = UDim2.fromScale(0.015 + 0.246 * index, 0.7)
				b.Size = UDim2.fromScale(0.231, 0.068)
			else
				b.Position = UDim2.fromScale(0.78, y)
				b.Size = UDim2.fromScale(0.2, 0.058)
			end
			b.BackgroundColor3 = color
			b.BorderSizePixel = 0
			b.Parent = g
			-- [실제 조작 버튼] 원화는 배경만 담당하며 기존 클릭 입력을 가리지 않는다.
			local buttonArtId = opts.cardOnly and AssetIds["CardArt/ui_button_ink"]
			if buttonArtId then
				local buttonArt = Instance.new("ImageLabel")
				buttonArt.Name = "CardBattleButtonArtwork"
				buttonArt.Size = UDim2.fromScale(1, 1)
				buttonArt.BackgroundTransparency = 1
				buttonArt.ScaleType = Enum.ScaleType.Stretch
				buttonArt.Image = "rbxassetid://" .. tostring(buttonArtId)
				buttonArt.ImageTransparency = 0.28
				buttonArt.Parent = b
			end
			frameEdge(b, brass, 5)
			local icon = emblem(b, assetKey, UDim2.fromScale(0.05, 0.5), UDim2.fromScale(0.25, 0.78))
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
			return b, icon
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
		-- 카드를 고르면 그 카드가 놓일 줄(특수 카드는 판 전체)이 금빛으로 깜빡여 어디에 놓이는지 바로 보이게 한다.
		local dropGlow
		local forecastGlows = {}
		local function clearDropHint()
			for _, glow in forecastGlows do glow:Destroy() end
			table.clear(forecastGlows)
			if dropGlow then
				pcall(function() dropGlow:Destroy() end)
				dropGlow = nil
			end
		end
		local function dropHint(c)
			local side = if c.ability == "spy" or c.ability == "defect" or c.ability == "feigned" then "foe" else "me"
			local target = if c.special then boardFrame else (rowTargets[side][BC.lane(c)] and rowTargets[side][BC.lane(c)].Parent)
			if not target then return end
			local st = Instance.new("UIStroke")
			st.Name = "DropHint"
			st.Color = Color3.fromRGB(255, 218, 120)
			st.Thickness = 3
			st.Parent = target
			dropGlow = st
			TweenService:Create(st, TweenInfo.new(0.55, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Transparency = 0.7 }):Play()
		end
		local boardCards, previousBoard, previousOrder, previousLeaders = {}, {}, {}, {}
		local deployAbilities = {
			spy = true, medic = true, snipe = true, relay = true, eastWind = true, orleans = true,
			humbaba = true, egyptChariot = true, urChariot = true, mactanGuard = true, anaconda = true,
			apache = true, bachDangLure = true, anansi = true, pigHex = true, sirenSong = true,
			unweave = true, musketeerAid = true, monkeyStrike = true, pigGuard = true, sandCleanse = true,
			witchCurse = true, witchBind = true, witchGuard = true, rats = true, quixote = true,
			savannaLion = true, savannaElephant = true, savannaGiraffe = true, savannaZebra = true,
			gilgamesh = true, enkidu = true, saladinCavalry = true, ishida = true, chaski = true,
		}
		local deployRoles = {
			pierce = true, survey = true, evacuate = true, vanguard = true,
			rearGuard = true, rally = true, mobilize = true,
		}
		local function cardTiming(c)
			local ability, role, special = c.ability, c.starterRole, c.special
			if role == "raid" then return t("매 내 턴", "Each turn") end
			if ability == "charge" then return t("충전 3회", "3 charges") end
			if ability == "lastOrder" then return t("패스할 때", "On pass") end
			if ability == "supply" then return t("다음 라운드", "Next round") end
			if role == "bombard" or ability == "marathon" or ability == "defect" or ability == "feigned"
				or ability == "amazonJaguar" or special == "strait" then
				return t("다음 내 턴", "Next turn")
			end
			if ability == "stakes" or ability == "counter" or ability == "hittiteChariot" or ability == "lakota"
				or ability == "electricEel" or ability == "cyclops" or ability == "musketeerGuard" or ability == "musketeerShield"
				or ability == "legacy" or role == "reinforce" or special == "ambush" or special == "falseOrder"
				or special == "rallyFlag" or special == "mactanShoal" or special == "kadeshTreaty" then
				return t("조건 발동", "Reaction")
			end
			if ability == "comanche" or role == "coverFire" then return t("이동할 때", "On move") end
			if special or deployAbilities[ability] or deployRoles[role] then return t("내는 즉시", "On play") end
			return nil
		end
		local function cardPlacement(c)
			if c.special then return t("전술", "Tactic") end
			if c.ability == "spy" or c.ability == "defect" or c.ability == "feigned" then
				return t("적군 ", "Enemy ") .. rowName(BC.lane(c))
			end
			return rowName(BC.lane(c))
		end
		local function cardBadge(c)
			if c.hero then return t("영웅", "Hero"), Color3.fromRGB(111, 77, 35) end
			if c.fuse then return t("합치기", "Fuse"), Color3.fromRGB(90, 58, 116) end
			if c.cause then return t("연쇄", "Chain"), Color3.fromRGB(90, 58, 116) end
			if c.special then return t("전술", "Tactic"), Color3.fromRGB(126, 70, 40) end
			if BC.StorySeries[c.id] then return t("이야기", "Story"), Color3.fromRGB(46, 78, 107) end
			if c.starterRole == "rearGuard" or c.ability == "armor" then
				return t("엄호", "Guard"), Color3.fromRGB(78, 79, 42)
			end
			return nil
		end
		local function cardStatus(c)
			if c.pigForm then return t("변신", "Shift"), Color3.fromRGB(119, 69, 116) end
			if c.sealedAbility then return t("봉인", "Seal"), Color3.fromRGB(119, 69, 116) end
			if c.anchored then return t("이동 제한", "Pinned"), Color3.fromRGB(125, 64, 50) end
			if c.bachDangRound == m.round then return t("유인", "Lured"), Color3.fromRGB(37, 81, 105) end
			if c.shaken then return t("강화 차단", "Jam"), Color3.fromRGB(117, 66, 97) end
			if c.cover or c.deployCover then return t("엄호", "Guard"), Color3.fromRGB(101, 78, 38) end
			if c.ability == "charge" and (c.charges or 0) < 3 then
				return t("축적 ", "Charge ") .. tostring(c.charges or 0) .. "/3", Color3.fromRGB(52, 84, 101)
			end
			return nil
		end
		local function effectTrace(from, to, tint, at)
			local delta = to - from
			local length = delta.Magnitude
			if length < 4 then return end
			task.delay(at, function()
				if not bg.Parent then return end
				local trail = Instance.new("Frame")
				trail.Size = UDim2.fromOffset(0, 3)
				trail.Rotation = math.deg(math.atan2(delta.Y, delta.X))
				-- Roblox rotates around the center; set the midpoint once and extend symmetrically.
				local midpoint = from + delta / 2
				trail.AnchorPoint = Vector2.new(0.5, 0.5)
				trail.Position = UDim2.fromOffset(midpoint.X, midpoint.Y)
				trail.BackgroundColor3 = tint
				trail.BorderSizePixel = 0
				trail.ZIndex = 34
				trail.Parent = bg
				TweenService:Create(trail, TweenInfo.new(0.16), {
					Size = UDim2.fromOffset(length, 2), BackgroundTransparency = 1,
				}):Play()
				task.delay(0.18, function() trail:Destroy() end)
			end)
		end
		local function effectAt(position, size, caption, tint, delay, style)
			task.delay(delay, function()
				if not g.Parent or not bg.Parent then return end
				if size.X < 1 or size.Y < 1 then return end
				local burst = Instance.new("Frame")
				burst.AnchorPoint = Vector2.new(0.5, 0.5)
				burst.Position = UDim2.fromOffset(position.X, position.Y)
				burst.Size = if style == "hit" then UDim2.fromOffset(size.X * 0.72, 4)
					elseif style == "heal" then UDim2.fromOffset(size.X * 0.76, size.Y * 0.45)
					else UDim2.fromOffset(size.X, size.Y)
				if style == "hit" then burst.Rotation = -23 end
				if style == "stakes" then
					burst.BackgroundColor3 = Color3.fromRGB(71, 161, 199)
					for tooth = 1, 3 do
						local stake = Instance.new("Frame")
						stake.AnchorPoint = Vector2.new(0.5, 1)
						stake.Position = UDim2.fromScale(tooth / 4, 0.94)
						stake.Size = UDim2.fromScale(0.055, 0)
						stake.BackgroundColor3 = Color3.fromRGB(251, 199, 120)
						stake.BorderSizePixel = 0
						stake.Rotation = -10
						stake.ZIndex = 35
						stake.Parent = burst
						TweenService:Create(stake, TweenInfo.new(0.22), { Size = UDim2.fromScale(0.055, 0.6), BackgroundTransparency = 0.18 }):Play()
					end
				elseif style == "vanish" then
					burst.BackgroundTransparency = 1
				end
				burst.BackgroundColor3 = tint
				burst.BackgroundTransparency = 0.72
				burst.BorderSizePixel = 0
				burst.ZIndex = 35
				burst.Parent = bg
				local rim = frameEdge(burst, tint, if style == "guard" then 12 else 5)
				if style == "vanish" then rim.Thickness = 3 end
				rim.Thickness = if style == "guard" then 3 else 1
				TweenService:Create(rim, TweenInfo.new(0.42), { Transparency = 1 }):Play()
				TweenService:Create(burst, TweenInfo.new(0.42), {
					Size = if style == "hit" then UDim2.fromOffset(size.X + 16, 2) else UDim2.fromOffset(size.X + 10, size.Y + 10), BackgroundTransparency = 1,
				}):Play()
				local flash = label(bg, caption, 15, tint, true)
				local captionY = position.Y + (if style == "guard" then 12 elseif style == "hit" then -12 else 0)
				flash.AnchorPoint = Vector2.new(0.5, 0.5)
				flash.Position = UDim2.fromOffset(position.X, captionY)
				flash.Size = UDim2.fromOffset(math.max(62, size.X, (utf8.len(caption) or #caption) * 10), math.max(22, math.min(32, size.Y)))
				flash.BackgroundColor3 = Color3.fromRGB(38, 28, 22)
				flash.BackgroundTransparency = 0.15
				flash.ZIndex = 36
				flash.TextStrokeTransparency = 0.7
				frameEdge(flash, tint, 5)
				TweenService:Create(flash, TweenInfo.new(0.48, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					Position = UDim2.fromOffset(position.X, captionY - 17), BackgroundTransparency = 1, TextTransparency = 1,
				}):Play()
				task.delay(0.5, function() flash:Destroy(); burst:Destroy() end)
			end)
		end
		local function cardCenter(widget)
			if not widget or not widget.Parent or widget.AbsoluteSize.X < 1 then return nil end
			local center = widget.AbsolutePosition + widget.AbsoluteSize / 2
			local lane = widget.Parent
			if center.X < lane.AbsolutePosition.X or center.X > lane.AbsolutePosition.X + lane.AbsoluteSize.X then return nil end
			return center - bg.AbsolutePosition
		end
		local function playBoardEffects(before, order, card, leader)
			local damage, aid, other = {}, {}, {}
			local volley = {}
			local source = card and boardCards[card]
			local sourceCenter = cardCenter(source)
			if sourceCenter then
				local scale = Instance.new("UIScale")
				scale.Scale = 0.9
				scale.Parent = source
				local unfold = TweenService:Create(scale, TweenInfo.new(0.20, Enum.EasingStyle.Back), { Scale = 1 })
				unfold:Play()
				task.delay(0.25, function() scale:Destroy() end)
			end
			if leader == "elizabeth" and m.armadaShots then
				for i, shot in m.armadaShots do
					local at = (i - 1) * 0.14
					volley[shot.target] = at + 0.07
					local ship, target = boardCards[shot.ship], boardCards[shot.target]
					local source, destination = cardCenter(ship), cardCenter(target)
					if source then
						effectAt(source, ship.AbsoluteSize, t("포격", "Fire"), Color3.fromRGB(255, 213, 136), at)
						if destination then effectTrace(source, destination, Color3.fromRGB(255, 188, 111), at) end
					end
				end
			end
			for _, unit in order do
				local old, now = before[unit], previousBoard[unit]
				local dst = if now then boardCards[unit] else nil
				local size = if dst then dst.AbsoluteSize else old.size
				local pos = if dst then dst.AbsolutePosition + size / 2 - bg.AbsolutePosition else old.pos
				if dst then
					local row = dst.Parent
					local absolute = dst.AbsolutePosition + size / 2
					if absolute.X < row.AbsolutePosition.X or absolute.X > row.AbsolutePosition.X + row.AbsoluteSize.X then continue end
				end
				local function add(list, name, tint, style)
					table.insert(list, { pos, size, name, tint, style })
				end
				if now then
					local delta = now.power - old.power
					local blocked = now.blocked - old.blocked
					if blocked > 0 then add(aid, t("막음 ", "Block ") .. tostring(blocked), Color3.fromRGB(253, 212, 124), "guard") end
					if delta < 0 then
						local tag = if card and card.id == "sa_36" then t("말뚝 ", "Stakes ") elseif leader == "elizabeth" then t("포격 ", "Volley ") else ""
						local caption = tag .. "−" .. tostring(-delta)
						local stain = if card and card.id == "sa_36" then "stakes" else "hit"
						local tint = Color3.fromRGB(255, 143, 120)
						if volley[unit] then effectAt(pos, size, caption, tint, volley[unit], "hit") else add(damage, caption, tint, stain) end
					elseif delta > 0 then
						local tag = if old.penalty < 0 and now.penalty == 0 then t("회복 ", "Heal ") else ""
						add(aid, tag .. "+" .. tostring(delta), Color3.fromRGB(154, 233, 182), "heal")
					end
					if now.status and old.status ~= now.status and blocked == 0 then
						add(other, now.status, Color3.fromRGB(200, 166, 242))
					end
					if now.chain and not old.chain then
						add(other, t("연쇄 발동", "Chain active"), Color3.fromRGB(226, 186, 249))
					end
					if old.row ~= now.row or old.side ~= now.side then
						if pos and old.pos and old.visible then effectTrace(old.pos, pos, Color3.fromRGB(140, 211, 242), 0.1) end
						add(other, if unit.bachDangRound == m.round then t("유인", "Lured") else t("이동", "Moved"), Color3.fromRGB(142, 213, 244))
					end
				elseif old.visible then
					add(other, t("전장 이탈", "Left field"), Color3.fromRGB(214, 191, 153))
				end
			end
			local delay = 0
			for _, list in { aid, damage, other } do
				for _, entry in list do
					effectAt(entry[1], entry[2], entry[3], entry[4], delay, entry[5])
					delay = math.min(0.56, delay + (if leader == "elizabeth" then 0.13 else 0.07))
				end
			end
			if card and card.id == "eu_36" then
				local size = boardFrame.AbsoluteSize
				local pos = boardFrame.AbsolutePosition + size / 2 - bg.AbsolutePosition
				effectAt(pos, Vector2.new(100, 30), t("잔 다르크 · 소멸", "Joan of Arc · Vanished"), Color3.fromRGB(255, 216, 132), delay, "vanish")
			end
		end
		local function afterAction(ok, msg, res, card, side)
			if ok and card and not card.special then lastPlayed[side] = card end
			if ok and card and onPlay then onPlay(side, card) end
			if not ok then
				info.Text = if english then "Action unavailable" else msg or ""
				Sfx.play("sfx_error", 0.5, 1)
				return
			end
			if card then
				cardSfx(card, side)
			elseif side == "foe" then
				Sfx.play("sfx_anchor_lower", 0.4, 1.1, "sfx_rope_pull")
			end
			info.Text = if english then (if msg == "멈췄다" then "Passed" else "Card played") else msg or ""
			if res then
				if opts.cardOnly then
					local resultName = if res.winner == "me" then "ui_result_win" elseif res.winner == "foe" then "ui_result_loss" else "ui_result_draw"
					local resultArtId = AssetIds["CardArt/" .. resultName]
					if resultArtId then
						roundResultTick += 1
						local currentResult = roundResultTick
						roundResult.Image = "rbxassetid://" .. tostring(resultArtId)
						roundResult.Visible = true
						task.delay(1.6, function()
							if currentResult == roundResultTick and roundResult.Parent then roundResult.Visible = false end
						end)
					end
				end
				info.Text = if english then string.format("Round %d — You %d : Pirates %d %s", res.round, res.me, res.foe,
					if res.winner == "me" then "(Victory!)" elseif res.winner == "foe" then "(Defeat)" else "(Draw)")
					else string.format("%d판 결과 — 우리 %d : 해적 %d  %s", res.round, res.me, res.foe,
						if res.winner == "me" then "(우리가 이겼다!)" elseif res.winner == "foe" then "(해적이 이겼다)" else "(무승부)")
				task.delay(0.5, function()
					Sfx.play(if res.winner == "me" then "sfx_fanfare" else "sfx_naval_hull_hit", 0.6, 1, "sfx_hit")
					Sfx.play("sfx_metal_clash", 0.5, 1)
				end)
			end
			local before, order = previousBoard, previousOrder
			for unit, widget in boardCards do
				local entry = before[unit]
				entry.size = widget.AbsoluteSize
				entry.pos = widget.AbsolutePosition + entry.size / 2 - bg.AbsolutePosition
				entry.visible = cardCenter(widget) ~= nil
			end
			local leader = if side and not previousLeaders[side] and m.leaderUsed[side] then m.leader[side] else nil
			render()
			if opts.cardOnly and not res then
				local rendered = previousBoard
				task.defer(function()
					if g.Parent and rendered == previousBoard then playBoardEffects(before, order, card, leader) end
				end)
			end
		end
		local passBtn = mkSide(t("멈추기", "Pass"), 0.765, Color3.fromRGB(97, 55, 42), if opts.cardOnly and AssetIds["CardArt/ui_icon_hourglass"] then "CardArt/ui_icon_hourglass" else "Menu/cc0_shield", function()
			if not playing and not auto and not finished and m.turn == "me" and not m.over then
				Sfx.play("sfx_anchor_lower", 0.55, 1.1, "sfx_rope_pull")
				afterAction(mine(BC.pass(m, "me")))
			end
		end)
		local leaderBtn, leaderIcon = mkSide(t(if opts.cardOnly then "지도자 카드" else "지도자 능력", if opts.cardOnly then "Leader Card" else "Leader Ability"), 0.83, Color3.fromRGB(89, 67, 46), "Menu/cc0_helmet", function()
			if opts.cardOnly then
				if not finished and showLeaderCard then showLeaderCard("me") end
			elseif not playing and not auto and not finished and m.turn == "me" and not m.over then
				-- 카드 대전이 아닌 접현전은 기존 단일 터치 능력 사용 방식을 보존한다.
				Sfx.play("sfx_card_spell", 0.7, 1, "sfx_horn")
				afterAction(mine(BC.useLeader(m, "me")))
			end
		end)
		local leaderPortrait, leaderStatus, foePortrait
		if opts.cardOnly then
			local foeBtn, foeIcon = mkSide(t("적장", "Leader"), 0.83, Color3.fromRGB(89, 67, 46), "Menu/cc0_helmet", function()
				if not finished and showLeaderCard then showLeaderCard("foe") end
			end)
			foeBtn.Name = "OpponentLeader"
			foeBtn.Position = UDim2.fromScale(0.025, 0.25)
			foeBtn.Size = UDim2.fromScale(0.25, 0.54)
			foeBtn.Parent = foePlate.plate
			foeBtn.Caption.Visible = false
			foeIcon.Position = UDim2.fromScale(0.06, 0.5)
			foeIcon.Size = UDim2.fromScale(0.88, 0.88)
			for _, side in { "me", "foe" } do
				local icon = if side == "me" then leaderIcon else foeIcon
				local leaderId = m.leader[side]
				local portraitKey = NEW_LEADER_ART[leaderId]
				local portraitId = (portraitKey and AssetIds[portraitKey]) or AssetIds["CardArt/leader_" .. leaderId]
				local fallbackKey = LEADER_FACE[leaderId]
				portraitId = portraitId or (fallbackKey and AssetIds[fallbackKey])
				if portraitId then
					-- 기존 먹색 버튼에 황동 테두리를 두르고 얼굴과 이름을 나란히 배치한다.
					icon.ImageTransparency = 1
					if side == "me" then
						icon.Position = UDim2.fromScale(0.04, 0.5)
						icon.Size = UDim2.fromScale(0.28, 0.86)
					end
					icon.BackgroundColor3 = Color3.fromRGB(47, 32, 22)
					icon.BackgroundTransparency = 0
					icon.ClipsDescendants = true

					-- 세로 원화의 위쪽을 얼굴 창에 맞춰 보여 준다.
					local portrait = Instance.new("ImageLabel")
					portrait.Name = "LeaderPortrait"
					portrait.SizeConstraint = Enum.SizeConstraint.RelativeXX
					portrait.Size = UDim2.fromScale(1, 4 / 3)
					portrait.BackgroundTransparency = 1
					portrait.ScaleType = Enum.ScaleType.Fit
					portrait.Image = "rbxassetid://" .. tostring(portraitId)
					portrait.Parent = icon
					if side == "foe" then
						foePortrait = portrait
						continue
					end
					leaderPortrait = portrait

					local caption = leaderBtn.Caption
					caption.Position = UDim2.fromScale(0.38, 0.07)
					caption.Size = UDim2.fromScale(0.57, 0.53)
					caption.TextXAlignment = Enum.TextXAlignment.Left

					leaderStatus = label(leaderBtn, "", 10, Color3.fromRGB(219, 185, 119))
					leaderStatus.Position = UDim2.fromScale(0.38, 0.59)
					leaderStatus.Size = UDim2.fromScale(0.57, 0.3)
					leaderStatus.TextXAlignment = Enum.TextXAlignment.Left
					leaderStatus.TextScaled = true
					local statusLimit = Instance.new("UITextSizeConstraint")
					statusLimit.MaxTextSize = 11
					statusLimit.Parent = leaderStatus
				end
			end
		end
		local mullBtn
		mullBtn = mkSide(t("손패 교체", "Swap Card"), 0.70, Color3.fromRGB(70, 58, 38), "Menu/cc0_glove", function()
			if playing or auto or finished or m.turn ~= "me" or m.over then return end
			local idx = selected and selected.Parent and selected:GetAttribute("HandIdx")
			if not idx then
				info.Text = t("바꿀 카드를 먼저 눌러 고르세요", "Tap a card to swap first")
				return
			end
			local ok, msg, _res, act = BC.mulligan(m, "me", idx)
			selected = nil
			if ok and act then table.insert(actions, act) end
			if not ok then
				info.Text = if english then "Cannot swap now" else msg or ""
				return
			end
			info.Text = if english then "Swapped one card" else msg or ""
			Sfx.play("sfx_card_deal", 0.6, 1, "sfx_book_turn")
			render()
		end)
		mkSide(t("자동 진행", "Auto Play"), 0.895, Color3.fromRGB(46, 72, 69), if opts.cardOnly and AssetIds["CardArt/ui_icon_victory"] then "CardArt/ui_icon_victory" else "Menu/cc0_yes", function()
			Sfx.play("sfx_ui_confirm", 0.5, 1, "sfx_click")
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
			if opts.cardOnly then
				-- 줄 높이에 맞춰 커지는 세로 카드(퀜트 느낌)
				local chipRatio = Instance.new("UIAspectRatioConstraint")
				chipRatio.AspectRatio = 0.74
				chipRatio.DominantAxis = Enum.DominantAxis.Height
				chipRatio.Parent = f
			end
			f.Parent = parent
			-- [전투판 카드] 이미 펼친 소형 카드도 5개 지역의 덱 색상을 유지한다.
			local regionId = if type(c.id) == "string" then BC.cardRegionPrefix(c.id) else nil
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
			painting.ImageColor3 = if type(c.id) == "string" and AssetIds["CardArt/" .. c.id] then Color3.new(1, 1, 1) else Color3.fromRGB(236, 211, 165)
			local artKey = cardArtworkKey(c)
			painting.Image = if AssetIds[artKey] then "rbxassetid://" .. tostring(AssetIds[artKey]) else ""
			painting.Parent = plate
			local frameArtId = regionId and REGION_FRAME[regionId] and AssetIds[REGION_FRAME[regionId]]
			if opts.cardOnly and frameArtId then
				local regionBorder = Instance.new("ImageLabel")
				regionBorder.Name = "PlayedCardRegionFrame"
				regionBorder.Size = UDim2.fromScale(1, 1)
				regionBorder.BackgroundTransparency = 1
				regionBorder.Image = "rbxassetid://" .. tostring(frameArtId)
				regionBorder.ScaleType = Enum.ScaleType.Stretch
				regionBorder.ZIndex = 4
				regionBorder.Parent = f
			end
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
			identity.TextStrokeTransparency = 1
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
			inscription.TextStrokeTransparency = 1
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
				-- [모션] 확대 도판은 실제 렌더 프레임마다, 나머지 카드는 최대 18fps로 갱신한다.
				-- 실제 갱신율은 기기 성능과 Roblox 렌더링에 따른다.
				-- 손패 10장이 모두 같이 움직이면 속성 쓰기가 많아 모바일이 느려진다. 확대하지 않은 카드는 18fps면 충분하다.
				if not focused and elapsed - sampled < 1 / 18 - 0.002 then return end
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
					if shoulder and (shoulder:IsA("Motor6D") or shoulder:IsA("AnimationConstraint")) then
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
		-- 카드 대전(cardOnly): 확대 카드는 화면을 덮지 않고 왼쪽 설명 칸에 고정해 보여 준다 (퀜트식).
		local previewHint
		if opts.cardOnly then
			focusFrame.AnchorPoint = Vector2.new(0, 0)
			focusFrame.Position = UDim2.fromScale(0.01, 0.135)
			if compactCards then
				focusFrame.AnchorPoint = Vector2.new(0.5, 0.5)
				focusFrame.Position = UDim2.fromScale(0.5, 0.5)
				focusBounds.MinSize = Vector2.new(0, 0)
			end
			previewHint = Instance.new("TextLabel")
			previewHint.Name = "CardPreviewHint"
			previewHint.Position = UDim2.fromScale(0.01, 0.135)
			previewHint.Size = UDim2.fromScale(0.19, 0.5)
			previewHint.BackgroundColor3 = Color3.fromRGB(30, 23, 19)
			previewHint.BackgroundTransparency = 0.25
			previewHint.BorderSizePixel = 0
			previewHint.Font = Enum.Font.Gotham
			previewHint.TextColor3 = Color3.fromRGB(226, 208, 170)
			previewHint.TextSize = 15
			previewHint.TextWrapped = true
			previewHint.Text = t("카드를 누르면\n설명이 여기에 나와요.\n\n한 번 더 누르면\n카드를 내요.", "Tap a card to read it here.\n\nTap again to play it.")
			previewHint.Parent = g
			previewHint.Visible = not compactCards
			frameEdge(previewHint, brass, 6)
			-- 왼쪽 아래: 최근 전황 기록 (안내 띠의 문장이 지나가 버려도 다시 읽을 수 있다)
			local logBox = Instance.new("TextLabel")
			logBox.Name = "BattleLog"
			logBox.Position = UDim2.fromScale(0.01, 0.66)
			logBox.Size = UDim2.fromScale(0.19, 0.325)
			logBox.BackgroundColor3 = Color3.fromRGB(30, 23, 19)
			logBox.BackgroundTransparency = 0.25
			logBox.BorderSizePixel = 0
			logBox.Font = Enum.Font.Gotham
			logBox.TextColor3 = Color3.fromRGB(226, 208, 170)
			logBox.TextSize = 14
			logBox.TextWrapped = true
			logBox.TextXAlignment = Enum.TextXAlignment.Left
			logBox.TextYAlignment = Enum.TextYAlignment.Bottom
			logBox.Text = ""
			logBox.Parent = g
			logBox.Visible = not compactCards
			local logPad = Instance.new("UIPadding")
			logPad.PaddingLeft, logPad.PaddingRight, logPad.PaddingBottom = UDim.new(0, 8), UDim.new(0, 6), UDim.new(0, 6)
			logPad.Parent = logBox
			frameEdge(logBox, brass, 6)
			local lines = {}
			info:GetPropertyChangedSignal("Text"):Connect(function()
				local txt = info.Text
				if txt == "" or txt == lines[#lines] or string.find(txt, "카드를 눌러", 1, true) or string.find(txt, "Your turn", 1, true) then return end
				table.insert(lines, txt)
				while #lines > 5 do table.remove(lines, 1) end
				logBox.Text = table.concat(lines, "\n\n")
			end)
		end
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
		local cardParchment = AssetIds["CardArt/ui_parchment"] or AssetIds["CardArt/battle_parchment"]
		focusPaper.Image = if cardParchment then "rbxassetid://" .. tostring(cardParchment)
			elseif AssetIds["Menu/parchment_grain"] then "rbxassetid://" .. tostring(AssetIds["Menu/parchment_grain"]) else ""
		focusPaper.ImageColor3 = if cardParchment then Color3.new(1, 1, 1) else Color3.fromRGB(174, 134, 83)
		focusPaper.ImageTransparency = if cardParchment then 0.12 else 0.43
		focusPaper.ScaleType = Enum.ScaleType.Crop
		focusPaper.ZIndex = 50
		focusPaper.Parent = focusFrame
		local focusBorder = Instance.new("ImageLabel")
		focusBorder.Name = "EnlargedCardRegionFrame"
		focusBorder.Size = UDim2.fromScale(1, 1)
		focusBorder.BackgroundTransparency = 1
		focusBorder.ScaleType = Enum.ScaleType.Stretch
		focusBorder.ZIndex = 54
		focusBorder.Visible = false
		focusBorder.Parent = focusFrame
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
		focusName.TextStrokeTransparency = 1
		focusName.Font = Enum.Font.Antique
		focusName.ZIndex = 53
		local focusRule = label(focusFrame, "", 14, ink, true)
		focusRule.Position = UDim2.fromScale(0.035, if opts.cardOnly then 0.72 else 0.75)
		focusRule.Size = UDim2.fromScale(0.93, if opts.cardOnly then 0.20 else 0.17)
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
		local leaderPreviewId
		local function selectionForecast(card)
			local index = table.find(m.hand.me, card)
			if not opts.cardOnly or not index then return nil end
			local result = BC.previewPlay(m, "me", index)
			if not result then return nil end
			if result.blocked == "stakes" then
				return t("예상 · 말뚝과 후열 유인 대상이 필요해. 이미 발동한 말뚝은 다시 쓸 수 없어.",
					"Preview · Requires unused Stakes and a lured enemy in the back row.")
			end
			if result.random then return t("예상 · 징조가 무작위로 정해져.", "Preview · The omen is random.") end
			if result.roundEnds then return t("예상 · 이 수로 라운드가 끝나.", "Preview · This play ends the round.") end
			local items = {}
			for _, target in (result.targets or {}) do
				local widget = boardCards[target.card]
				local tint = if target.left or (target.delta or 0) < 0 then Color3.fromRGB(245, 130, 112)
					elseif (target.delta or 0) > 0 then Color3.fromRGB(146, 222, 175) else Color3.fromRGB(144, 208, 242)
				if #forecastGlows < 8 and cardCenter(widget) then
					local glow = Instance.new("UIStroke")
					glow.Name = "ForecastTarget"
					glow.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
					glow.Thickness = 2
					glow.Color = tint
					glow.Parent = widget
					table.insert(forecastGlows, glow)
				end
				if #items < 3 then
					local change = if target.left then t("이탈", "leaves")
						elseif target.moved then rowName(target.row) else ""
					if target.delta and target.delta ~= 0 then
						change ..= (if change == "" then "" else " ") .. string.format("%+d", target.delta)
					end
					table.insert(items, cardName(target.card) .. " " .. change)
				end
			end
			if #items == 0 then return nil end
			return t("예상 · ", "Preview · ") .. table.concat(items, " / ")
				.. (if #result.targets > #items then t(" 외 ", " +") .. tostring(#result.targets - #items) else "")
		end
		local function showCardCodex(card, readOnly)
			if focusMotion then
				focusMotion.stop()
				for i = #cardMotions, 1, -1 do
					if cardMotions[i] == focusMotion then table.remove(cardMotions, i); break end
				end
				focusMotion = nil
			end
			if focusTween then focusTween:Cancel(); focusTween = nil end
			if previewHint then previewHint.Visible = card == nil and not compactCards end
			if not card then
				leaderPreviewId = nil
				focusArtwork:SetAttribute("ArtFocused", false)
				focusFrame.Visible = false
				focusShade.Visible = false
				return
			end
			-- [지도자 카드] 원화와 능력을 카드 형태로 보여 주고, 사용은 기존 BC.useLeader 흐름을 따른다.
			local leaderProfile = card.leaderId and BC.Leaders[card.leaderId]
			leaderPreviewId = if leaderProfile and card.leaderSide == "me" then card.leaderId else nil
			focusUse.Visible = if leaderProfile then (leaderPreviewId ~= nil and m.turn == "me" and not m.over and not m.leaderUsed.me and not playing and not auto)
				else not readOnly
			focusUse.Text = if leaderProfile then t("지도자 능력 사용", "Use Leader Ability") else t("카드 사용", "Play Card")
			-- [크기] 화면 가장자리 여백을 남기고 0.69 비율로 최대 620px까지 확대한다.
			local screenSize = bg.AbsoluteSize
			local height = math.floor(math.max(210, math.min(screenSize.Y * 0.86, screenSize.X * 0.9 / 0.69, 620)))
			if opts.cardOnly then
				height = if compactCards then math.floor(math.max(1, math.min(screenSize.Y * 0.88, screenSize.X * 0.94 / 0.69, 620)))
				else math.floor(math.max(210, math.min(screenSize.Y * 0.85, screenSize.X * 0.19 / 0.69)))
			end
			focusFrame.Size = UDim2.fromOffset(math.floor(height * 0.69), height)
			focusScale.Scale = 0.78
			focusShade.BackgroundTransparency = 1
			focusShade.Visible = not opts.cardOnly or compactCards -- 좁은 화면은 카드 설명만 겹쳐 띄운다
			focusArtwork:SetAttribute("ArtFocused", true)
			focusFrame.Visible = true
			if not opts.cardOnly or compactCards then TweenService:Create(focusShade, TweenInfo.new(0.2), { BackgroundTransparency = 0.3 }):Play() end
			focusTween = TweenService:Create(focusScale, TweenInfo.new(0.26, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), { Scale = 1 })
			focusTween:Play()
			local artKey = if leaderProfile then (NEW_LEADER_ART[card.leaderId] and AssetIds[NEW_LEADER_ART[card.leaderId]] and NEW_LEADER_ART[card.leaderId]) or (AssetIds["CardArt/leader_" .. card.leaderId] and "CardArt/leader_" .. card.leaderId) or LEADER_FACE[card.leaderId] else cardArtworkKey(card)
			focusImage.Image = if artKey and AssetIds[artKey] then "rbxassetid://" .. tostring(AssetIds[artKey]) else ""
			focusImage.ImageColor3 = if leaderProfile or (type(card.id) == "string" and AssetIds["CardArt/" .. card.id]) then Color3.new(1, 1, 1) else Color3.fromRGB(239, 214, 174)
			focusImage.ScaleType = if leaderProfile then Enum.ScaleType.Fit else Enum.ScaleType.Crop
			focusImage.Size = if leaderProfile then UDim2.fromScale(1, 1) else UDim2.fromScale(1.14, 1.14)
			local regionId = if leaderProfile then m.faction[card.leaderSide] elseif type(card.id) == "string" then BC.cardRegionPrefix(card.id) else nil
			local regionDeck = if regionId then CARD_DECK[regionId] else nil
			local focusFrameArtId = regionId and REGION_FRAME[regionId] and AssetIds[REGION_FRAME[regionId]]
			focusBorder.Image = if focusFrameArtId then "rbxassetid://" .. tostring(focusFrameArtId) else ""
			focusBorder.Visible = focusFrameArtId ~= nil
			focusEdge.Color = if regionDeck then regionDeck.color else brass
			if leaderProfile then
				focusName.Text = t("지도자 · ", "Leader · ") .. leaderProfile.name
				focusRule.Text = t("지도자 능력: ", "Leader Ability: ") .. (if english then leaderProfile.textEn or leaderProfile.text else leaderProfile.text)
					.. t(" · 보급 +", " · Provision +") .. tostring(leaderProfile.provision or 0)
					.. (if m.leaderUsed[card.leaderSide] then t("\n이번 대결에서 사용함", "\nAlready used in this match") else "")
					.. (if BC.CardLines[card.leaderId] then "\n「" .. BC.CardLines[card.leaderId][if english then 2 else 1] .. "」" else "")
			else
				focusName.Text = if regionDeck then (if english then regionDeck.en else regionDeck.ko) .. " · " .. cardName(card) else cardName(card)
				local row = cardPlacement(card)
				local timing = cardTiming(card)
				local category = if card.category then (if english then englishCategories[card.category] or card.category else card.category) .. " · " else ""
				local strength = if card.power then t(" · 전투력 ", " · Power ") .. tostring(card.power) else ""
				local description = cardDescription(card)
				local forecast = if not readOnly then selectionForecast(card) else nil
				local lore = cardLore(card)
				local series = BC.StorySeries[card.id]
				local kind = if card.cause or card.fuse then t("연쇄·조합", "Combo")
					elseif card.special then t("전술", "Tactic") elseif card.hero then t("영웅", "Hero") else t("능력", "Ability")
				focusRule.Text = category .. row .. strength .. (if timing then " · " .. timing else "") .. "\n" .. kind .. " · " .. description
					.. (if series then "\n" .. t("이야기 · ", "Story · ") .. series[if english then 2 else 1] elseif lore then "\n" .. t("이야기 · ", "Story · ") .. lore else "")
					.. (if forecast then "\n" .. forecast else "")
					.. (if cardStatus(card) then "\n" .. t("상태 · ", "Status · ") .. cardStatus(card) else "")
					.. (if BC.CardLines[card.id] then "\n「" .. BC.CardLines[card.id][if english then 2 else 1] .. "」" else "")
				focusMotion = animateCardArt(focusArtwork, focusImage, card)
				table.insert(cardMotions, focusMotion)
			end
		end
		local function closeCardCodex()
			clearDropHint()
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
			if leaderPreviewId then
				if playing or auto or finished or m.over or m.turn ~= "me" or m.leaderUsed.me or leaderPreviewId ~= m.leader.me then return end
				Sfx.play("sfx_card_spell", 0.7, 1, "sfx_horn")
				afterAction(mine(BC.useLeader(m, "me")))
			elseif selectedPlay then
				selectedPlay()
			end
		end)
		showLeaderCard = function(side)
			closeCardCodex()
			showCardCodex({ leaderId = m.leader[side], leaderSide = side }, true)
		end
		focusTap.Activated:Connect(function()
			if selectedPlay then selectedPlay() else closeCardCodex() end
		end)
		render = function()
			boardCards, previousBoard, previousOrder = {}, {}, {}
			previousLeaders = { me = m.leaderUsed.me, foe = m.leaderUsed.foe }
			clearDropHint()
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
				.. (if m.plans and m.plans.foe.falseOrder == m.round then t(" · 후열 유인", " · Rear lure") else "")
			mePlate.who.Text = (if english then (if opts.cardOnly then "You" else "Your ship") elseif opts.cardOnly then "나" else opts.shipName or "우리 배")
				.. (if myCulture then " · " .. (if english then englishFactions[m.faction.me] or myCulture.name else myCulture.name) else "")
				.. (if m.passed.me then t(" · 멈춤", " · Passed") elseif m.turn == "me" and not m.over then t(" · 내 차례", " · Your turn") else "")
				.. (if m.plans and m.plans.me.falseOrder == m.round then t(" · 후열 유인", " · Rear lure") else "")
			if opts.cardOnly and m.roundStarter then
				for _, side in { "me", "foe" } do
					local plate = if side == "me" then mePlate else foePlate
					local first = side == m.roundStarter
					plate.who.Text = (if first then t("선공", "First") else t("후공", "Second")) .. " · " .. plate.who.Text
					plate.who.TextColor3 = if first then Color3.fromRGB(255, 223, 152) else Color3.fromRGB(202, 224, 246)
					local outline = plate.plate:FindFirstChildOfClass("UIStroke")
					if outline then
						local active = m.turn == side and not m.over and not m.passed[side]
						outline.Color = if active then Color3.fromRGB(255, 221, 132) else brass
						outline.Thickness = if active then 2 else 1
					end
				end
			end
			-- [카드전] 점수판의 원형 지도자 표시 제거. 접현전만 기존 초상 유지.
			if not opts.cardOnly then
				foePlate.leader.Text = string.sub(BC.Leaders[m.leader.foe] and BC.Leaders[m.leader.foe].name or "적", 1, 3)
				mePlate.leader.Text = string.sub(BC.Leaders[m.leader.me] and BC.Leaders[m.leader.me].name or "나", 1, 3)
				-- 등록된 인물 초상이 있는 지도자는 글자 대신 얼굴을 보여 준다
				for _, pair in { { mePlate, m.leader.me }, { foePlate, m.leader.foe } } do
					local face = NEW_LEADER_ART[pair[2]]
					local img = face and AssetIds[face]
					if not img then
						face = LEADER_FACE[pair[2]]
						img = face and AssetIds[face]
					end
					local old = pair[1].leader:FindFirstChild("Face")
					if old then old:Destroy() end
					if img then
						pair[1].leader.Text = ""
						local f = Instance.new("ImageLabel")
						f.Name = "Face"
						f.Size = UDim2.fromScale(1, 1)
						f.BackgroundTransparency = 1
						f.ScaleType = Enum.ScaleType.Crop
						f.Image = "rbxassetid://" .. tostring(img)
						local fc = Instance.new("UICorner")
						fc.CornerRadius = UDim.new(1, 0)
						fc.Parent = f
						f.Parent = pair[1].leader
					end
				end
			end
			foePlate.deck.Text = tostring(#(m.deck and m.deck.foe or {}))
			mePlate.deck.Text = tostring(#(m.deck and m.deck.me or {}))
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
			-- 차례 띠: 내 차례는 초록, 적 차례는 붉은색. 안내 문구가 비어 있으면 할 일을 알려 준다.
			info.BackgroundColor3 = if m.over then Color3.fromRGB(54, 46, 38)
				elseif m.turn == "me" then Color3.fromRGB(34, 84, 52) else Color3.fromRGB(96, 42, 36)
			if info.Text == "" and not m.over then
				info.Text = if m.turn == "me" then t("내 차례 — 카드를 눌러 고르세요 (한 번 더 누르면 냅니다)", "Your turn — tap a card, tap again to play")
					else t("해적이 생각 중…", "Pirates are thinking…")
			end
			header.Text = if english then string.format("%s · Round %d   You %d : %d Pirates · %s",
				TITLE, m.round, BC.total(m, "me"), BC.total(m, "foe"),
				if m.over then "Battle Over" elseif m.turn == "me" then "Your Turn" else "Enemy Turn")
				else string.format("%s · %d판   우리 %d : %d 해적   ·   %s",
					TITLE, m.round, BC.total(m, "me"), BC.total(m, "foe"),
					if m.over then "전투 종료" elseif m.turn == "me" then "내 차례" else "해적 차례")
			header.Text ..= if english then string.format("   ·   Wins %d:%d   Hand %d:%d%s", m.wins.me, m.wins.foe,
				#m.hand.me, #m.hand.foe, if #weather > 0 then " · " .. table.concat(weather, ", ") else "")
				else string.format("   ·   승리 %d:%d   손패 %d:%d%s", m.wins.me, m.wins.foe,
					#m.hand.me, #m.hand.foe, if #weather > 0 then " · " .. table.concat(weather, ", ") else "")
			-- 줄: 위 2줄은 상대(후열·전열), 아래 2줄은 우리(전열·후열)
			local order = { { "foe", "ranged" }, { "foe", "melee" }, { "me", "melee" }, { "me", "ranged" } }
			for k, o in order do
				local side, row = o[1], o[2]
				local rf = Instance.new("Frame")
				rf.Position = UDim2.fromScale(0, (k - 1) / 4)
				rf.Size = UDim2.fromScale(1, 1 / 4 - 0.016)
				-- [6열 고급 전장] 적은 진홍, 아군은 남청으로 표시한다. 전투 위치와 계산은 불변.
				rf.BackgroundColor3 = if side == "me" then Color3.fromRGB(18, 57, 74) else Color3.fromRGB(65, 35, 54)
				rf.BackgroundTransparency = if opts.cardOnly then 0.82 elseif cfg then 0.53 else 0.32
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
				laneStroke.Transparency = if opts.cardOnly then 0.6 else 0.14
				laneStroke.Thickness = 1
				local laneAccent = Instance.new("Frame")
				laneAccent.Name = "SideLaneAccent"
				laneAccent.Size = UDim2.new(0, 3, 1, 0)
				laneAccent.BackgroundColor3 = if side == "me" then Color3.fromRGB(88, 170, 212) else Color3.fromRGB(214, 115, 110)
				laneAccent.BorderSizePixel = 0
				laneAccent.Parent = rf
				if not compactCards then emblem(rf, rowIcons[row], UDim2.new(0, 4, 0.5, 0), UDim2.new(0, 21, 0.8, 0)) end
				local mult, adv, dis = BC.rowMatchup(m, side, row)
				local tag = label(rf, string.format("%s\n%d%s", rowName(row), BC.rowTotal(m, side, row), if adv and dis then " ▲▼" elseif adv then t(" ▲상성", " ▲Adv") elseif dis then t(" ▼불리", " ▼Dis") else "") .. (if BC.activeTactic(m.rows[side][row]) then "\n" .. BC.activeTactic(m.rows[side][row]) else ""), 13, Color3.fromRGB(246, 208, 130))
				tag.Position = UDim2.fromOffset(if compactCards then 6 else 29, 0)
				tag.Size = UDim2.new(0, if compactCards then 42 else 68, 1, 0)
				if compactCards then
					tag.Text = rowName(row)
					tag.TextSize = 11
					tag.TextWrapped = true
				end
				tag.TextXAlignment = Enum.TextXAlignment.Left
				tag.TextColor3 = if adv and not dis then Color3.fromRGB(150, 235, 150) elseif dis and not adv then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(246, 208, 130)
				local cards = if opts.cardOnly then Instance.new("ScrollingFrame") else Instance.new("Frame")
				cards.Position = UDim2.fromOffset(if compactCards then 48 else 104, 3)
				cards.Size = UDim2.new(1, if compactCards then -90 elseif opts.cardOnly then -160 else -108, 1, -6)
				if cards:IsA("ScrollingFrame") then
					cards.BorderSizePixel = 0
					cards.ScrollingDirection = Enum.ScrollingDirection.X
					cards.AutomaticCanvasSize = Enum.AutomaticSize.X
					cards.CanvasSize = UDim2.new()
					cards.ScrollBarThickness = 3
				end
				cards.BackgroundTransparency = 1
				cards.Parent = rf
				rowTargets[side][row] = cards
				if opts.cardOnly then
					-- 줄 점수 원형 배지 (퀜트식)
					local badge = Instance.new("TextLabel")
					badge.Name = "RowScoreBadge"
					badge.AnchorPoint = Vector2.new(1, 0.5)
					badge.Position = UDim2.new(1, -6, 0.5, 0)
					badge.Size = if compactCards then UDim2.new(0, 32, 0.72, 0) else UDim2.fromOffset(44, 44)
					badge.BackgroundColor3 = if adv and not dis then Color3.fromRGB(60, 120, 70) elseif dis and not adv then Color3.fromRGB(130, 60, 50) else Color3.fromRGB(32, 24, 18)
					badge.BorderSizePixel = 0
					badge.Font = Enum.Font.GothamBlack
					badge.TextScaled = true
					badge.TextColor3 = Color3.fromRGB(255, 232, 170)
					badge.Text = tostring(BC.rowTotal(m, side, row))
					badge.Parent = rf
					local bc = Instance.new("UICorner")
					bc.CornerRadius = UDim.new(1, 0)
					bc.Parent = badge
					local bs = Instance.new("UIStroke")
					bs.Color = Color3.fromRGB(203, 157, 86)
					bs.Thickness = 2
					bs.Parent = badge
					local bt = Instance.new("UITextSizeConstraint")
					bt.MaxTextSize = 24
					bt.Parent = badge
				end
				local lay = Instance.new("UIListLayout")
				lay.FillDirection = Enum.FillDirection.Horizontal
				lay.Padding = UDim.new(0, 4)
				lay.Parent = cards
				for idx, c in m.rows[side][row] do
					local power = BC.cardPower(m, side, row, idx)
					local playedCard = chip(cards, c, 62, power, c == lastPlayed.me or c == lastPlayed.foe)
					if opts.cardOnly then
						boardCards[c] = playedCard
						local status, statusColor = cardStatus(c)
						local chain = c.cause ~= nil and BC.chainActive(m, side, c)
						previousBoard[c] = { power = power, penalty = c.tacticPower or 0, blocked = c.blockedPower or 0, row = row, side = side, status = status, chain = chain, size = Vector2.zero, pos = Vector2.zero }
						table.insert(previousOrder, c)
						local badge, badgeColor = cardBadge(c)
						if chain and not status then badge, badgeColor = t("연쇄 켜짐", "Linked"), Color3.fromRGB(112, 72, 144) end
						local caption = status or badge
						if caption then
							playedCard.PlayedCardIdentity.Visible = false
							local mark = label(playedCard, caption, 10, Color3.fromRGB(255, 243, 221), true)
							mark.Name = if status then "CardStatus" else "CardRole"
							mark.Size = UDim2.fromScale(0.94, 0.17)
							mark.Position = UDim2.fromScale(0.03, 0.47)
							mark.BackgroundColor3 = statusColor or badgeColor
							mark.BackgroundTransparency = 0.05
							mark.TextScaled = true
							mark.ZIndex = 11
							local limit = Instance.new("UITextSizeConstraint")
							limit.MaxTextSize = 11
							limit.Parent = mark
							frameEdge(mark, Color3.fromRGB(203, 173, 118), 3)
						end
					end
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
				b.Size = UDim2.new(0, 140, 1, if compactCards then -3 else -10)
				local cardRatio = Instance.new("UIAspectRatioConstraint")
				cardRatio.AspectRatio = 0.69
				cardRatio.DominantAxis = Enum.DominantAxis.Height
				cardRatio.Parent = b
				b.LayoutOrder = i
				local regionId = if type(c.id) == "string" then BC.cardRegionPrefix(c.id) else nil
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
				local badge, badgeColor = cardBadge(c)
				local kindLabel = label(b, if opts.cardOnly then badge or kindText else kindText, 10, if c.hero then Color3.fromRGB(255, 226, 143) else Color3.fromRGB(238, 220, 180), true)
				kindLabel.Position = UDim2.fromScale(0.48, 0.03)
				kindLabel.Size = UDim2.fromScale(0.48, 0.14)
				kindLabel.TextXAlignment = Enum.TextXAlignment.Right
				kindLabel.TextStrokeTransparency = 1
				kindLabel.ZIndex = 8
				if opts.cardOnly and badgeColor then
					kindLabel.BackgroundColor3 = badgeColor
					kindLabel.BackgroundTransparency = 0.1
					kindLabel.TextScaled = true
					kindLabel.TextXAlignment = Enum.TextXAlignment.Center
					local limit = Instance.new("UITextSizeConstraint")
					limit.MaxTextSize = 12
					limit.Parent = kindLabel
					frameEdge(kindLabel, brass, 3)
				end
				if opts.cardOnly then
					kindLabel.Position = UDim2.fromScale(0.48, 0.20)
					local timing = cardTiming(c)
					local ribbon = label(b, cardPlacement(c) .. (if timing then " · " .. timing else ""), 11, Color3.fromRGB(250, 232, 197), true)
					ribbon.Name = "CardPlacementTiming"
					ribbon.Position = UDim2.fromScale(0.045, 0.50)
					ribbon.Size = UDim2.fromScale(0.91, 0.15)
					ribbon.BackgroundColor3 = if c.special then Color3.fromRGB(112, 63, 40)
						elseif BC.lane(c) == "melee" then Color3.fromRGB(100, 57, 46) else Color3.fromRGB(39, 73, 97)
					ribbon.BackgroundTransparency = 0.14
					ribbon.TextScaled = true
					ribbon.ZIndex = 10
					local limit = Instance.new("UITextSizeConstraint")
					limit.MaxTextSize = 12
					limit.Parent = ribbon
					frameEdge(ribbon, brass, 3)
					local origin = b:FindFirstChild("CardDeckOrigin")
					if origin then origin.Visible = false end
				end
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
				image.ImageColor3 = if type(c.id) == "string" and AssetIds["CardArt/" .. c.id] then Color3.new(1, 1, 1) else Color3.fromRGB(236, 214, 175)
				image.Parent = art
				local handFrameId = regionId and REGION_FRAME[regionId] and AssetIds[REGION_FRAME[regionId]]
				if opts.cardOnly and handFrameId then
					local handBorder = Instance.new("ImageLabel")
					handBorder.Name = "HandCardRegionFrame"
					handBorder.Size = UDim2.fromScale(1, 1)
					handBorder.BackgroundTransparency = 1
					handBorder.Image = "rbxassetid://" .. tostring(handFrameId)
					handBorder.ScaleType = Enum.ScaleType.Stretch
					handBorder.ZIndex = 3
					handBorder.Parent = b
				end
				table.insert(cardMotions, animateCardArt(art, image, c))
				local caption = label(b, cardName(c), 13, ink, true)
				caption.Position = UDim2.fromScale(0.25, 0.7)
				caption.Size = UDim2.fromScale(0.71, 0.27)
				caption.TextScaled = true
				caption.TextStrokeTransparency = 1
				caption.Font = Enum.Font.Antique
				local iconKey = if c.special then "Menu/cc0_book" elseif c.ability == "spy" then "Menu/explore" else rowIcons[c.row]
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
				b:SetAttribute("HandIdx", i)
				local edge = frameEdge(b, if c.hero then Color3.fromRGB(243, 206, 118) else brass, 6)

				local function playChosenCard()
					if playing or auto or finished or m.turn ~= "me" or m.over or selected ~= b or not b.Parent then return end
					playing = true
					showCardCodex(nil)
					local side = if c.ability == "spy" or c.ability == "defect" or c.ability == "feigned" then "foe" else "me"
					local target = if c.special then boardFrame else rowTargets[side][BC.lane(c)]
					local flight = b:Clone()
					flight.Active = false
					flight.Interactable = false
					flight.AnchorPoint = Vector2.new(0.5, 0.5)
					flight.Size = UDim2.fromOffset(b.AbsoluteSize.X, b.AbsoluteSize.Y)
					local start = b.AbsolutePosition + b.AbsoluteSize / 2 - bg.AbsolutePosition
					local rowWidth = if opts.cardOnly then target.AbsoluteSize.Y * 0.74 else 62
					local canvasOffset = if target:IsA("ScrollingFrame") then target.CanvasPosition.X else 0
					local finishAt = target.AbsolutePosition - bg.AbsolutePosition + Vector2.new(
						if c.special then target.AbsoluteSize.X / 2 else math.clamp(rowWidth / 2 + (rowWidth + 4) * #m.rows[side][BC.lane(c)] - canvasOffset, 0, target.AbsoluteSize.X),
						target.AbsoluteSize.Y / 2
					)
					flight.Position = UDim2.fromOffset(start.X, start.Y)
					flight.ZIndex = 20
					flight.Parent = bg
					art.Parent = flight
					b.Visible = false
					local flightTween = TweenService:Create(flight, TweenInfo.new(0.34, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
						Position = UDim2.fromOffset(finishAt.X, finishAt.Y),
						Size = UDim2.fromOffset(if c.special then 76 else rowWidth, math.min(b.AbsoluteSize.Y, target.AbsoluteSize.Y)),
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
						Sfx.play("sfx_ui_select", 0.5, 1, "sfx_click")
						clearDropHint()
						showCardCodex(c)
						dropHint(c)
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
			-- 부채꼴 손패: 가운데 카드는 곧게, 가장자리로 갈수록 기울인다
			do
				local cards = {}
				for _, ch in handFrame:GetChildren() do
					if ch:IsA("TextButton") then
						table.insert(cards, ch)
					end
				end
				table.sort(cards, function(a, b2) return a.LayoutOrder < b2.LayoutOrder end)
				local mid = (#cards + 1) / 2
				for idx, ch in cards do
					if ch ~= selected then
						ch.Rotation = if opts.cardOnly then 0 else math.clamp((idx - mid) * 2.2, -9, 9)
					end
				end
			end
			passBtn.BackgroundTransparency = if m.turn == "me" then 0 else 0.5
			do
				local left = if m.round == 1 and (m.played.me or 0) == 0 then (m.mulligan and m.mulligan.me or 0) else 0
				mullBtn.Caption.Text = if left > 0 then t(string.format("손패 교체 (%d)", left), string.format("Swap Card (%d)", left)) else t("손패 교체 (끝)", "Swap Card (done)")
				mullBtn.BackgroundTransparency = if left > 0 then 0 else 0.6
			end
			leaderBtn.Caption.Text = if opts.cardOnly then
				(if m.leaderUsed.me then t("지도자 카드 (사용함)", "Leader Card (Used)")
				else t("지도자 카드 · ", "Leader Card · ") .. (if english then englishLeaders[m.leader.me] or "" else BC.Leaders[m.leader.me].name))
				elseif m.leaderUsed.me then t("지도자 (사용함)", "Leader (Used)")
				else t("지도자: ", "Leader: ") .. (if english then englishLeaders[m.leader.me] or "" else BC.Leaders[m.leader.me].name)
			leaderBtn.BackgroundTransparency = if m.leaderUsed.me then (if opts.cardOnly then 0.34 else 0.6) else 0
			if leaderPortrait and leaderStatus then
				leaderBtn.Caption.Text = if english then englishLeaders[m.leader.me] or "Leader" else BC.Leaders[m.leader.me].name
				leaderStatus.Text = if m.leaderUsed.me then t("사용함", "Used") else t("사용 가능", "Ready")
				leaderPortrait.ImageColor3 = if m.leaderUsed.me then Color3.fromRGB(165, 165, 165) else Color3.new(1, 1, 1)
			end
			if foePortrait then
				foePortrait.ImageColor3 = if m.leaderUsed.foe then Color3.fromRGB(165, 165, 165) else Color3.new(1, 1, 1)
			end
		end
		render()
		info.Text = if english then string.format("Row advantage: Melee > Cannon > Ranged > Melee. Leader: %s",
			englishLeaders[m.leader.me] or "Command")
			else string.format("전열(근접)·후열(사격·포), 한 판 5장. 지도자: %s (%s)", BC.Leaders[m.leader.me].name, BC.Leaders[m.leader.me].text)

		if cfg and cfg.book and cfg.book.practice then
			local names = {}
			for _, id in (BC.PracticeOpening[m.faction] or {}) do
				local card = BC.Units[id] or BC.Specials[id]
				if card then table.insert(names, cardName(card)) end
			end
			if #names > 0 then info.Text = t("연습전 첫 손패 조합 · ", "Practice opening combo · ") .. table.concat(names, " → ") end
		end

		task.spawn(function()
			task.wait(1.0)
			local guard = 0 -- 실제로 낸 수만 센다 (생각하는 시간은 세지 않는다: 예전엔 60초가 지나면 판이 갑자기 끝났다)
			-- 연습전은 시간제한 없음. 그 밖의 대결은 한 판 10분을 넘기면 "물러남"으로 끝낸다.
			local deadline = if opts.enemyName == "연습전" then math.huge else os.clock() + 600
			while not m.over and not finished and guard < 400 and os.clock() < deadline do
				if playing then
					task.wait(0.1)
				elseif m.turn == "foe" then
					task.wait(0.9)
					if finished then break end
					local ok, msg, res, _, playedCard = BC.ai(m, "foe")
					guard += 1
					if ok then
						afterAction(ok, if english then "Pirates" else "해적: " .. (msg or ""), res, playedCard, "foe")
					end
				elseif auto then
					task.wait(0.5)
					if finished or playing or m.turn ~= "me" or m.over then continue end
					local ok, msg, res, act, playedCard = BC.ai(m, "me")
					guard += 1
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
			if wonMatch then Sfx.play("sfx_quest_reward", 0.7, 1, "sfx_fanfare")
			elseif m.winner == "foe" then Sfx.play("sfx_naval_sink", 0.6, 1, "sfx_hit") end
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
	local function warnRing(center, onLand)
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
			local radius = if os.clock() < skillUntil.evade then 11 else 20
			if onLand then
				onLand((me.pos - center).Magnitude <= radius)
			end
			if (me.pos - center).Magnitude > radius then
				dodged += 1
				combo += 1
				flair += 10 + combo * 2
				streakNoticeToken += 1
				local token = streakNoticeToken
				comboLabel.Text = string.format("회피 %d연속!", combo)
				comboLabel.TextColor3 = Color3.fromRGB(144, 243, 226)
				comboLabel.TextTransparency = 0
				Sfx.play("sfx_skill_evade", 0.35, 1.15 + math.min(combo, 8) * 0.035, "sfx_click")
				task.delay(1.2, function()
					if not finished and streakNoticeToken == token and comboLabel.Parent then
						game:GetService("TweenService"):Create(comboLabel, TweenInfo.new(0.32), { TextTransparency = 1 }):Play()
					end
				end)
			else
				combo = 0
			end
		end)
	end
	-- [해전 이펙트] 연기·파편·불꽃·물기둥·항적을 한 목록으로 관리한다 (함수 안 지역 변수 수를 아끼려고 한 표에 모음)
	-- [전투 맵 아이템] 기존 등록 3D 보급 부표/화약폭탄 모델을 재사용한다. 미등록이면 생성하지 않는다.
	local FX = { wakeAt = {}, dmgAt = {}, fireStates = {}, boardZoom = 0, cam = nil,
		sink = nil, outcomeReason = nil, items = {}, itemSerial = 0, nextItemAt = os.clock() + 6,
		mineCharges = 0 }
	local C_SMOKE, C_DARK, C_WATER = Color3.fromRGB(215, 215, 220), Color3.fromRGB(62, 62, 68), Color3.fromRGB(200, 232, 245)
	-- [해상전투 이펙트] 임의 원통·구·사각 파편과 매 프레임 크기 변경을 폐기한다.
	-- 기존 ParticleEmitter/Attachment를 사용하며 포탄·판정·함선 모델은 건드리지 않는다.
	-- 연기 덩어리 n개 (dark = 불탄 검은 연기)
	function FX.smoke(pos, n, scale, dark)
		-- [연기 재질] 불투명 공 대신 기존 파티클 재사용. 모바일 배출량 상한 유지.
		FX.burst(pos, nil, {
			{ tex = "smoke", c0 = if dark then C_DARK else C_SMOKE, c1 = C_SMOKE,
				s0 = scale * 1.8, s1 = scale * 5, life = 2.4,
				v0 = 5, v1 = 12, spread = 48, n = if MOBILE_VFX then math.min(n + 1, 5) else n * 3,
				a0 = if dark then 0.28 else 0.38, acc = Vector3.new(0, 6, 0), drag = 1.3 },
		})
	end
	-- 나무 파편과 불똥
	function FX.splinters(pos, n)
		-- [선체 파손] 나무 상자 조각을 생성하지 않고 짧은 황갈색 가시 불티가 비산한다.
		local count = math.clamp(n, 1, if MOBILE_VFX then 6 else 18)
		FX.burst(pos, nil, {
			{ tex = "spark", c0 = Color3.fromRGB(240, 185, 112), c1 = Color3.fromRGB(127, 81, 49),
				s0 = 0.30, s1 = 0.06, life = 0.62, v0 = 13, v1 = 29, spread = 130,
				n = count, glow = 0.33, acc = Vector3.new(0, -34, 0), drag = 1.4, a0 = 0.08 },
			{ tex = "spark", c0 = Color3.fromRGB(255, 222, 145), c1 = Color3.fromRGB(242, 140, 77),
				s0 = 0.22, s1 = 0.04, life = 0.37, v0 = 20, v1 = 37, spread = 140,
				n = if MOBILE_VFX then 2 else math.max(3, math.floor(count * 0.65)),
				glow = 0.8, acc = Vector3.new(0, -32, 0), a0 = 0.05 },
		})
	end
	-- [침몰 화재] 단순 주황색 구 대신 유기적으로 상승하는 불꽃·그을음 스프라이트.
	function FX.flame(pos, scale, profile)
		local style = profile or DEFAULT_FX
		local theme = style.theme or FX_THEMES.europe
		local stage = math.clamp(style.stage or 2, 1, 6)
		FX.burst(pos + Vector3.new(0, scale * 0.2, 0), nil, {
			{ tex = "fire", c0 = theme.flash, c1 = if style.faction == "lost" then theme.spark else Color3.fromRGB(190, 52, 28),
				s0 = scale * 1.95, s1 = scale * 0.70, life = 1.40, v0 = 6, v1 = 12,
				spread = 35, glow = 1, n = if MOBILE_VFX then 4 else 5 + stage * 2, a0 = 0.04 },
			{ tex = "smoke", c0 = C_DARK, c1 = theme.smoke, s0 = scale * 1.55,
				s1 = scale * (3.1 + stage * 0.24), life = 3.1, v0 = 5, v1 = 12, spread = 32,
				n = if MOBILE_VFX then 3 else 3 + stage, a0 = 0.3 },
		}, { color = theme.flash, bright = if MOBILE_VFX then 1.6 else 2 + stage * 0.2, range = 18, dur = 0.4 })
	end
	-- [4단계 수면 충돌] 기존 등록된 엔진 물 입자만 사용: 수면 충격 → 물기둥 → 낙하 물방울 → 잔여 거품.
	-- 기존 단색 원기둥·구체 물보라를 생성하지 않는다. 위치·규모는 실제 포탄 착탄 좌표로 정한다.
	function FX.splash(pos, profile, power)
		-- [4단계 수면 물보라] 큰 네모 연기판 대신 물방울·하얀 포말을 실제 착수점에서 확산한다.
		-- 탄종/선체/침몰 물보라 강도는 기존 power 그대로 유지한다.
		local style = profile or DEFAULT_FX
		local theme = style.theme or FX_THEMES.europe
		local strength = math.clamp(power or 1, 0.65, 3.2)
		local surface = Vector3.new(pos.X, ORIGIN.Y + 0.35, pos.Z)
		-- 1차: 물속 충돌 직후 수면 양옆으로 튀는 미세 거품.
		FX.burst(surface, nil, {
			{ tex = "spark", c0 = Color3.fromRGB(241, 254, 255), c1 = theme.foam,
				s0 = 0.75 * strength, s1 = 0.06, life = 0.44,
				v0 = 7, v1 = 16 * strength, spread = 170, glow = 0.35,
				n = if MOBILE_VFX then 8 else 16, a0 = 0.18,
				acc = Vector3.new(0, -9, 0), drag = 4 },
		})
		-- 2차: 세로 물기둥. 기존 함수는 낙하 운동만 시각화한다.
		FX.waterColumn(surface, style, strength)
		task.delay(0.20, function()
			if finished then return end
			-- 3차: 물기둥 꼭대기에서 중력으로 떨어지는 빛나는 물방울.
			FX.burst(surface + Vector3.new(0, 4 * strength, 0), Vector3.new(0, 1, 0), {
				{ tex = "spark", c0 = Color3.fromRGB(240, 252, 255), c1 = theme.foam,
					s0 = math.min(1.15, 0.58 * strength), s1 = 0.05,
					life = 0.7 + strength * 0.1, v0 = 6, v1 = 15 * strength,
					spread = 80, n = if MOBILE_VFX then 9 else 19,
					acc = Vector3.new(0, -44, 0), drag = 0.8, a0 = 0.12 },
			})
		end)
		task.delay(0.53, function()
			if finished then return end
			-- 4차: 내려앉은 거품이 수면 위로 퍼지고 투명하게 사라진다.
			FX.burst(surface, nil, {
				{ tex = "spark", c0 = Color3.fromRGB(247, 255, 255), c1 = theme.foam,
					s0 = math.min(1.3, 0.8 * strength), s1 = 0.02, life = 0.95,
					v0 = 3, v1 = 8 * strength, spread = 175,
					n = if MOBILE_VFX then 6 else 12, a0 = 0.35, drag = 6 },
			})
		end)
	end
	do -- 입자 연출용 지역 변수는 이 블록 안에만 둔다 (함수당 지역 변수 한도 때문)
	local TweenService = game:GetService("TweenService")
	-- [입자 연출] 엔진 입자(ParticleEmitter)를 한 번 터뜨리고 자동으로 치운다. 부품 수를 늘리지 않아 모바일에서도 가볍다.
	local TEX = {
		fire = "rbxasset://textures/particles/fire_main.dds",
		smoke = "rbxasset://textures/particles/smoke_main.dds",
		spark = "rbxasset://textures/particles/sparkles_main.dds",
	}
	local function emitterOn(parent, e)
		local pe = Instance.new("ParticleEmitter")
		pe.Texture = TEX[e.tex] or TEX.smoke
		pe.Color = ColorSequence.new(e.c0, e.c1 or e.c0)
		pe.Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, e.s0), NumberSequenceKeypoint.new(1, e.s1 or e.s0) })
		pe.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, e.a0 or 0.1), NumberSequenceKeypoint.new(0.7, e.a1 or 0.5), NumberSequenceKeypoint.new(1, 1) })
		pe.Lifetime = NumberRange.new(e.life * 0.7, e.life)
		pe.Speed = NumberRange.new(e.v0 or 0, e.v1 or e.v0 or 0)
		pe.SpreadAngle = Vector2.new(e.spreadX or e.spread or 180, e.spreadY or e.spread or 180)
		-- [포탄 방향] 발사 화염/불티는 포신 전방, 물보라·선체 파편은 지면 위로 뿜는다.
		pe.EmissionDirection = if e.axis == "forward" then Enum.NormalId.Front else Enum.NormalId.Top
		pe.Acceleration = e.acc or Vector3.zero
		pe.Drag = e.drag or 0
		pe.Rotation = NumberRange.new(0, 360)
		pe.RotSpeed = NumberRange.new(-120, 120)
		pe.LightEmission = e.glow or 0
		pe.LockedToPart = false
		pe.Rate = e.rate or 0
		pe.Enabled = (e.rate or 0) > 0
		pe.Parent = parent
		return pe
	end
	local function lightFlash(parent, color, bright, range, dur)
		local l = Instance.new("PointLight")
		l.Color = color
		l.Brightness = bright
		l.Range = range
		l.Parent = parent
		TweenService:Create(l, TweenInfo.new(dur, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Brightness = 0 }):Play()
	end
	function FX.burst(pos, dir, list, light)
		local anchor = Instance.new("Attachment") -- 보이는 부품 없이 지형에 붙여 입자만 터뜨린다
		anchor.WorldCFrame = if dir then CFrame.lookAt(pos, pos + dir) else CFrame.new(pos)
		anchor.Parent = workspace.Terrain
		local longest = 1
		for _, e in list do
			local pe = emitterOn(anchor, e)
			pe:Emit(math.min(e.n or 8, if MOBILE_VFX then 12 else 26))
			longest = math.max(longest, e.life + 0.2)
		end
		if light then
			lightFlash(anchor, light.color, light.bright, light.range, light.dur or 0.3)
		end
		task.delay(longest, function() anchor:Destroy() end)
	end
	local ORANGE, YELLOW, RED = Color3.fromRGB(255, 150, 50), Color3.fromRGB(255, 226, 130), Color3.fromRGB(190, 52, 28)
	local GREY, SOOT = Color3.fromRGB(150, 150, 155), Color3.fromRGB(48, 46, 46)
	local FOAM, SEA = Color3.fromRGB(245, 252, 255), Color3.fromRGB(150, 205, 230)
	-- 충격파 고리: 수면 위로 납작하게 퍼지는 링
	function FX.shockRing(pos, color, size, life)
		-- [수면 파문] 기본 원통 파츠 대신 수평으로 번지는 미세 포말·불티.
		-- 이펙트 전용이므로 충돌/타격/선체 데이터에 관여하지 않는다.
		local duration = math.clamp(life or 0.6, 0.2, 1.1)
		local radius = math.clamp(size or 14, 4, 42)
		FX.burst(pos + Vector3.new(0, 0.2, 0), nil, {
			{ tex = "spark", c0 = color, c1 = color:Lerp(Color3.new(1, 1, 1), 0.55),
				s0 = if MOBILE_VFX then 0.30 else 0.42, s1 = 0.03,
				life = duration, v0 = radius * 0.34 / duration,
				v1 = math.min(40, radius * 0.58 / duration), spread = 165,
				n = if MOBILE_VFX then 5 else 12, a0 = 0.10, drag = 4, glow = 0.45,
				acc = Vector3.new(0, -7, 0) },
		})
	end
	-- [지역별 함포] 단계 1은 짧은 포염, 3부터 긴 화약 연기, 4 이상은 추가 분산 섬광.
	-- 동아시아는 화약 불티, 유럽은 진한 포연, 미지의 땅은 신비로운 색 궤적을 강조한다.
	function FX.muzzle(from, dir, profile, cannonProfile)
		-- [포종별 포염] 선회포는 빠른 섬광, 중포는 붉은 화약, 장포는 긴 직선 포화,
		-- 구포는 위로 퍼지는 묵직한 포연. 지역 색은 기존 함선 테마를 그대로 사용한다.
		local style = profile or DEFAULT_FX
		local stage = math.clamp(style.stage or 2, 1, 6)
		local theme = style.theme or FX_THEMES.europe
		local cannon = cannonProfile or NC.demi
		local swivel = cannon.dur <= 0.36
		local mortar = cannon.arc >= 35
		local longGun = cannon.range >= 180
		local density = if MOBILE_VFX then 0.56 else 1
		local spread = if swivel then 14 elseif longGun then 8 elseif mortar then 34
			elseif style.faction == "east_asia" then 30 else 19
		local flash = if swivel then 1.15 elseif longGun then 1.55 elseif mortar then 2.2 else 1.85
		FX.burst(from + dir * 1.6, dir, {
			{ tex = "spark", c0 = theme.flash, c1 = if style.faction == "lost" then theme.spark else Color3.fromRGB(255, 156, 82),
				s0 = flash, s1 = 0.08, life = if swivel then 0.17 elseif mortar then 0.37 else 0.25,
				v0 = if longGun then 35 else 18, v1 = if longGun then 54 else 30 + stage * 2,
				spread = spread, glow = 1, axis = "forward",
				n = math.max(2, math.floor((4 + stage * 1.1) * density)), a0 = 0.01 },
			{ tex = "spark", c0 = theme.spark, c1 = theme.tracer, s0 = if longGun then 0.53 else 0.35,
				s1 = 0.04, life = if longGun then 0.48 else 0.30,
				v0 = 27, v1 = if longGun then 62 else 43, spread = spread + 12,
				glow = 1, axis = "forward",
				n = math.floor((5 + stage * 1.6) * density), acc = Vector3.new(0, -18, 0), a0 = 0.03 },
			{ tex = "smoke", c0 = theme.smoke, c1 = if style.faction == "lost" then theme.tracer else Color3.fromRGB(160, 151, 139),
				s0 = if mortar then 2.4 else 1.3, s1 = if mortar then 5.1 else 3.3,
				life = if mortar then 1.8 else 1.1 + stage * 0.09, v0 = 3, v1 = 8,
				spread = if mortar then 58 else 36, axis = "forward",
				n = math.max(1, math.floor((2 + stage * 0.8) * density)),
				a0 = 0.56, drag = 2.5, acc = Vector3.new(0, 4, 0) },
			-- [선측 포연] 포구 앞에서 짧은 그을음이 올라가 배와 화포가 한 몸처럼 보이게 한다.
			{ tex = "smoke", c0 = Color3.fromRGB(108, 106, 106), c1 = theme.smoke,
				s0 = 0.8, s1 = if mortar then 3.3 else 2.4, life = 0.85,
				v0 = 2.0, v1 = 4.3, spread = 68, axis = "forward",
				n = if MOBILE_VFX then 2 else 4, a0 = 0.67,
				drag = 2.7, acc = Vector3.new(0, 4, 0) },
		}, { color = theme.flash, bright = if MOBILE_VFX then 1.65 else 2.5 + stage * 0.27,
			range = if mortar then 25 else 19, dur = if swivel then 0.12 else 0.23 })
		if (longGun or mortar) and not MOBILE_VFX then
			FX.burst(from + dir * 3.2, dir, {
				{ tex = "spark", c0 = theme.tracer, c1 = theme.flash,
					s0 = 0.40, s1 = 0.02, life = 0.32,
					v0 = if longGun then 38 else 19, v1 = if longGun then 64 else 43,
					spread = if longGun then 8 else 42, axis = "forward", glow = 0.75,
					n = if longGun then 6 else 9, a0 = 0.06 },
			})
		end
	end
	-- [지역·단계별 명중] 공격이 이미 적중한 프레임에만 파편·매연·충격파를 그린다.
	function FX.impact(pos, power, profile, cannonProfile)
		-- [실제 명중] 선체 화약섬광 → 금속/목재 불티 → 연무 → 입자 충격파.
		-- 선회포는 날렵하고, 장포는 선형 관통, 구포는 무거운 파쇄로만 구별한다.
		local style = profile or DEFAULT_FX
		local stage = math.clamp(style.stage or 2, 1, 6)
		local theme = style.theme or FX_THEMES.europe
		local cannon = cannonProfile or NC.demi
		local density = if MOBILE_VFX then 0.5 else 1
		local heavy = cannon.arc >= 35
		local piercing = cannon.range >= 180
		local quick = cannon.dur <= 0.36
		local force = math.clamp(power or 1, 0.8, 2.5)
		FX.burst(pos, nil, {
			{ tex = "spark", c0 = theme.flash, c1 = if style.faction == "lost" then theme.spark else Color3.fromRGB(237, 126, 75),
				s0 = (if heavy then 0.93 else 0.63) * force, s1 = 0.05,
				life = if quick then 0.25 else 0.42, v0 = if piercing then 26 else 12,
				v1 = if piercing then 45 else 27 + stage * 2, spread = if piercing then 42 else 145,
				glow = 1, n = math.max(2, math.floor((4 + stage * 1.6) * density)), a0 = 0.03 },
			{ tex = "spark", c0 = theme.spark, c1 = theme.tracer,
				s0 = if heavy then 0.65 else 0.38, s1 = 0.04, life = 0.55,
				v0 = if quick then 24 else 15, v1 = if piercing then 51 else 33 + stage * 2,
				spread = if piercing then 75 else 170, glow = 0.9,
				n = math.floor((7 + stage * 2) * density),
				acc = Vector3.new(0, -42, 0), a0 = 0.08 },
			{ tex = "smoke", c0 = Color3.fromRGB(69, 67, 66), c1 = theme.smoke,
				s0 = if heavy then 2.9 else 1.9, s1 = if heavy then 6.9 else 4.9,
				life = 1.25 + stage * 0.12, v0 = 3, v1 = if heavy then 11 else 7,
				spread = if heavy then 70 else 48,
				n = math.max(2, math.floor((3 + stage * 0.9) * density)),
				a0 = 0.60, acc = Vector3.new(0, 6, 0), drag = 1.8 },
		}, { color = theme.flash, bright = if MOBILE_VFX then 1.8 else 3.1 + stage * 0.3,
			range = 20 + stage * 2, dur = 0.20 + stage * 0.018 })
		FX.shockRing(pos - Vector3.new(0, 4, 0), theme.flash,
			9 + stage * 2.3 + force * (if heavy then 2.2 else 1), 0.40 + stage * 0.03)
		if heavy and not MOBILE_VFX then
			FX.shockRing(pos - Vector3.new(0, 3.7, 0), theme.foam, 12 + stage * 1.8, 0.72)
		end
	end
	-- [상황별 물기둥] 같은 실제 수면 충돌 좌표를 사용한다. 크기는 대포 구경·침몰 단계에만 따른다.
	function FX.waterColumn(pos, profile, power)
		-- [수면 기둥] 파란 사각 스프라이트 대신 작은 물방울 무리가 수직으로 솟아 떨어진다.
		local style = profile or DEFAULT_FX
		local stage = math.clamp(style.stage or 2, 1, 6)
		local theme = style.theme or FX_THEMES.europe
		local strength = math.clamp(power or 1, 0.65, 3.2)
		local spread = if style.faction == "southeast_asia" then 35
			elseif style.faction == "new_world" then 30 else 23
		FX.burst(pos + Vector3.new(0, 1, 0), Vector3.new(0, 1, 0), {
			{ tex = "spark", c0 = Color3.fromRGB(246, 255, 255), c1 = theme.foam,
				s0 = math.min(1.5, (0.61 + stage * 0.06) * strength), s1 = 0.05,
				life = (0.77 + stage * 0.055) * math.sqrt(strength),
				v0 = 13 * strength, v1 = (22 + stage * 1.3) * strength,
				spread = spread, n = if MOBILE_VFX then 12 else math.min(25, math.floor((12 + stage * 2) * strength)),
				a0 = 0.08, acc = Vector3.new(0, -50, 0), drag = 0.5, glow = 0.26 },
			{ tex = "smoke", c0 = Color3.fromRGB(229, 250, 255), c1 = theme.foam,
				s0 = math.min(1.3, 0.65 * strength), s1 = math.min(2.6, 1.9 * strength),
				life = 0.45, v0 = 8 * strength, v1 = 14 * strength,
				spread = spread * 0.7, n = if MOBILE_VFX then 2 else 5,
				a0 = 0.78, acc = Vector3.new(0, -14, 0), drag = 1.5 },
		})
		FX.shockRing(pos, theme.foam, (7 + stage * 1.4) * strength, 0.6 + strength * 0.12)
	end
	-- 스킬 연출: 배에 붙은 입자를 지속시간 동안 켜 두고, 시작 순간 충격파를 낸다
	function FX.skill(sh, id, dur)
		local anchorPart = sh.model.PrimaryPart or sh.model:FindFirstChildWhichIsA("BasePart", true)
		if not anchorPart then
			return
		end
		local at = Instance.new("Attachment")
		at.Parent = anchorPart
		local list, light, ringColor
		local def = ShipDefs.Ships[sh.shipId or ""]
		local role = if def then def.trait or {} else {}
		local heavyGun = def and def.cannons >= 12
		local cargoHull = (role.cargoGuard or 0) >= 0.08
		local fogShip = sh.shipId == "mist_seeker" or sh.shipId == "flying_dutchman"
		if id == "fire" or id == "rapid" then
			ringColor = if id == "rapid" and heavyGun then Color3.fromRGB(255, 214, 117) else ORANGE
			list = {
				{ tex = "fire", c0 = YELLOW, c1 = RED, s0 = 3.5, s1 = 0.5, life = 0.8, v0 = 6, v1 = 14, spread = 60, glow = 1, rate = 38, a0 = 0 },
				{ tex = "spark", c0 = YELLOW, s0 = 0.8, s1 = 0.2, life = 0.9, v0 = 14, v1 = 30, glow = 1, rate = 30, acc = Vector3.new(0, -20, 0), a0 = 0 },
			}
			light = { color = ORANGE, bright = 3, range = 30 }
		elseif id == "guard" then
			-- [선창 격벽/철갑/방패 갑판] 실제 선체 역할에 맞춰 불티와 방어 파문 색을 구분한다.
			ringColor = if cargoHull then Color3.fromRGB(236, 190, 117)
				elseif sh.shipId == "panokseon" then Color3.fromRGB(180, 236, 189)
				else Color3.fromRGB(112, 211, 255)
			list = {
				{ tex = "spark", c0 = Color3.fromRGB(191, 233, 255), c1 = ringColor,
					s0 = 1.2, s1 = 0.15, life = 0.8, v0 = 5, v1 = 16, spread = 120,
					glow = 0.85, rate = if MOBILE_VFX then 9 else 20, a0 = 0.06 },
			}
			light = { color = ringColor, bright = 2.6, range = 25 }
		else
			-- [접현 돌진·회피] 노선의 포말 / 해무 함선의 안개 / 항해선의 역풍 파문.
			ringColor = if id == "dash" then Color3.fromRGB(255, 184, 104)
				elseif fogShip then Color3.fromRGB(192, 190, 248)
				elseif (role.wind or 0) >= 0.08 then Color3.fromRGB(147, 242, 204)
				else Color3.fromRGB(150, 220, 255)
			list = {
				{ tex = "smoke", c0 = FOAM, c1 = SEA, s0 = 2.5, s1 = 6, life = 0.9, v0 = 22, v1 = 40, spread = 18, rate = if MOBILE_VFX then 18 else 44, a0 = 0.35, drag = 3 },
				{ tex = "spark", c0 = ringColor, s0 = 0.9, s1 = 0.2, life = 0.7, v0 = 24, v1 = 50, spread = 25, glow = 1, rate = if MOBILE_VFX then 12 else 36, a0 = 0 },
			}
			light = { color = ringColor, bright = 2, range = 26 }
		end
		local ems = {}
		for _, e in list do
			table.insert(ems, emitterOn(at, e))
		end
		local lt = Instance.new("PointLight")
		lt.Color, lt.Brightness, lt.Range = light.color, light.bright, light.range
		lt.Parent = anchorPart
		FX.shockRing(ORIGIN + sh.pos, ringColor, 26, 0.8)
		FX.shockRing(ORIGIN + sh.pos, ringColor, 16, 0.55)
		-- [함종별 실제 선체 연출] 승인된 물/안개 입자를 재사용. 새 장식 Part·모형은 생성하지 않는다.
		local fwd = Vector3.new(math.cos(sh.theta), 0, math.sin(sh.theta))
		local right = Vector3.new(-fwd.Z, 0, fwd.X)
		if id == "dash" then
			-- 노선은 양옆 노가 물을 젓는 듯한 좌우 포말, 거북선은 선수 수면 돌파.
			local foamCount = if MOBILE_VFX then 3 else 7
			for side = -1, 1, 2 do
				local offset = ORIGIN + sh.pos - fwd * sh.length * 0.16 + right * side * sh.length * 0.18
				FX.burst(offset, nil, {
					{ tex = "smoke", c0 = FOAM, c1 = if sh.shipId == "geobukseon" then Color3.fromRGB(239, 220, 183) else SEA,
						s0 = 1.2, s1 = 4.5, life = 0.8, v0 = 6, v1 = 15, spread = 65,
						n = foamCount, a0 = 0.23, drag = 1.6 },
				})
			end
		elseif id == "rapid" and heavyGun and not MOBILE_VFX then
			-- 대구경 전열함의 양현 포문 충격. 실제 공격력/포탄 수치엔 변화가 없다.
			FX.shockRing(ORIGIN + sh.pos + right * sh.length * 0.17, ringColor, 11, 0.4)
			FX.shockRing(ORIGIN + sh.pos - right * sh.length * 0.17, ringColor, 11, 0.4)
		elseif id == "evade" and fogShip then
			FX.burst(ORIGIN + sh.pos - fwd * sh.length * 0.2, nil, {
				{ tex = "smoke", c0 = Color3.fromRGB(188, 207, 220), c1 = Color3.fromRGB(133, 158, 186),
					s0 = 3.2, s1 = 8.5, life = 1.3, v0 = 3, v1 = 9, spread = 100,
					n = if MOBILE_VFX then 4 else 11, a0 = 0.43, drag = 1.8 },
			})
		end
		-- [스킬 지역 문양] 원래 스킬 색은 보존하고 높은 단계에서 지역 색의 보조 파문을 표시한다.
		local profile = sh.fx or DEFAULT_FX
		if (profile.stage or 2) >= 3 then
			FX.shockRing(ORIGIN + sh.pos, profile.theme.flash, 11 + profile.stage * 2, 0.7)
		end
		-- 스킬 발동 순간 선체를 가로지르는 강한 빛·바람과 파편. 기존 공격 판정에는 영향 없음.
		FX.burst(ORIGIN + sh.pos + Vector3.new(0, 7, 0), nil, {
			{ tex = "spark", c0 = ringColor, c1 = light.color, s0 = 1.1, s1 = 0.18, life = 0.75, v0 = 14, v1 = 34, spread = 100, glow = 0.9, n = if MOBILE_VFX then 10 else 24, a0 = 0 },
			{ tex = if id == "rapid" then "fire" else "smoke", c0 = light.color, c1 = ringColor, s0 = 2.6, s1 = 5.2, life = 0.65, v0 = 3, v1 = 18, spread = 90, glow = 0.7, n = if MOBILE_VFX then 5 else 12, a0 = 0.22 },
		}, { color = ringColor, bright = if MOBILE_VFX then 2 else 4, range = 30, dur = 0.33 })
		task.delay(dur, function()
			for _, pe in ems do
				pe.Enabled = false
			end
			TweenService:Create(lt, TweenInfo.new(0.5), { Brightness = 0 }):Play()
			task.delay(2, function()
				at:Destroy()
				lt:Destroy()
			end)
		end)
	end
	-- [단계별 화재] 1~2단계 갑판 1지점, 3~4단계 2지점, 5~6단계 3지점.
	-- 로블록스 파티클을 선체의 기존 Part에 붙여 이동 중에도 불길이 떠다니지 않는다.
	function FX.shipFire(sh, key, hp, now)
		local state = FX.fireStates[key]
		local profile = sh.fx or DEFAULT_FX
		local theme = profile.theme or FX_THEMES.europe
		local stage = math.clamp(profile.stage or 2, 1, 6)
		if not state and hp < 0.62 then
			local root = sh.model.PrimaryPart or sh.model:FindFirstChildWhichIsA("BasePart", true)
			if not root then return end
			state = { next = 0, vents = {} }
			FX.fireStates[key] = state
			for i = 1, (if MOBILE_VFX then 1 elseif stage <= 2 then 1 elseif stage <= 4 then 2 else 3) do
				local along = Vector3.new(math.cos(sh.theta), 0, math.sin(sh.theta))
				local offset = if i == 1 then -0.23 elseif i == 2 then 0.2 else 0
				local origin = ORIGIN + sh.pos + along * (sh.length * offset) + Vector3.new(0, 7, 0)
				local vent = Instance.new("Attachment")
				vent.Name = "NavalDamageFire"
				vent.Position = root.CFrame:PointToObjectSpace(origin)
				vent.Parent = root
				local fire = emitterOn(vent, {
					tex = "fire", c0 = theme.flash,
					c1 = if profile.faction == "lost" then theme.spark else RED,
					s0 = 3.5 + stage * 0.62, s1 = 0.65, life = 1.2, v0 = 3, v1 = 8,
					spread = 24, glow = 1, rate = 0, a0 = 0.05, acc = Vector3.new(0, 7, 0)
				})
				local soot = emitterOn(vent, {
					tex = "smoke", c0 = if profile.faction == "lost" then theme.smoke else SOOT,
					c1 = theme.smoke, s0 = 2.8 + stage * 0.34, s1 = 10.0 + stage * 1.15,
					life = 3.2, v0 = 3, v1 = 11, spread = 26, rate = 0, a0 = 0.38,
					acc = Vector3.new(0, 6, 0), drag = 1.3
				})
				local glow = Instance.new("PointLight")
				glow.Name = "DeckFireLight"
				glow.Color = theme.flash
				glow.Range = 9 + stage * 2
				glow.Brightness = 0
				glow.Parent = vent
				table.insert(state.vents, { fire = fire, soot = soot, glow = glow })
			end
		end
		if not state or now < state.next then return end
		state.next = now + 0.14
		local severity = math.clamp((0.62 - hp) / 0.62, 0, 1)
		for _, vent in state.vents do
			vent.soot.Rate = math.floor(severity * (if MOBILE_VFX then 10 else (7 + stage * 3)))
			vent.fire.Rate = if hp < 0.42 then math.floor((0.42 - hp) * (if MOBILE_VFX then 46 else (38 + stage * 9))) else 0
			vent.soot.Enabled = vent.soot.Rate > 0
			vent.fire.Enabled = vent.fire.Rate > 0
			vent.glow.Brightness = if hp < 0.42 then severity * (if MOBILE_VFX then 1.1 else (1.0 + stage * 0.2)) * (0.85 + 0.15 * math.sin(now * 13)) else 0
		end
	end
	-- [접현 충돌] 사다리·닻줄이 맞닿는 순간의 물보라·목재 먼지·쇳조각, 시각 효과만 재생한다.
	function FX.boarding()
		FX.boardingActive = true
		local center = ORIGIN + (me.pos + foe.pos) * 0.5
		local theme = me.fx.theme or FX_THEMES.europe
		local stage = math.clamp(me.fx.stage or 2, 1, 6)
		FX.burst(center + Vector3.new(0, 6, 0), nil, {
			{ tex = "spark", c0 = theme.spark, c1 = theme.flash, s0 = 0.6 + stage * 0.08, s1 = 0.1,
				life = 0.55 + stage * 0.03, v0 = 9, v1 = 18 + stage * 2,
				spread = 120, glow = 0.7, n = if MOBILE_VFX then 7 else 8 + stage * 3, a0 = 0.08 },
			{ tex = "smoke", c0 = theme.smoke, c1 = SOOT, s0 = 2 + stage * 0.2, s1 = 5 + stage * 0.6,
				life = 1.35, v0 = 3, v1 = 8, spread = 85,
				n = if MOBILE_VFX then 4 else 5 + stage, a0 = 0.38 },
		})
		FX.waterColumn(Vector3.new(center.X, ORIGIN.Y, center.Z), me.fx, 1.15)
		Sfx.play("sfx_rope_pull", 0.38, 0.95, "sfx_creak")
		Sfx.play("sfx_boarding_draw", 0.35, 0.88, "sfx_metal_clash")
	end
	-- [포탄 비행] 원본 4종 포탄의 속도·사거리·탄도를 유지하며 지역·단계별 궤적만 바꾼다.
	function FX.projectile(ball, nc, profile)
		local style = profile or DEFAULT_FX
		local theme = style.theme or FX_THEMES.europe
		local stage = math.clamp(style.stage or 2, 1, 6)
		local a0 = Instance.new("Attachment")
		a0.Position = Vector3.new(0, nc.ball * 0.34, 0)
		a0.Parent = ball
		local a1 = Instance.new("Attachment")
		a1.Position = Vector3.new(0, -nc.ball * 0.34, 0)
		a1.Parent = ball
		local trail = Instance.new("Trail")
		trail.Attachment0, trail.Attachment1 = a0, a1
		trail.FaceCamera = true
		trail.Lifetime = if MOBILE_VFX then 0.12 + stage * 0.015 else 0.16 + stage * 0.035
		trail.MinLength = 0.08
		trail.Color = ColorSequence.new(theme.tracer, if style.faction == "lost" then theme.spark else theme.smoke)
		trail.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, if stage >= 4 then 0.08 else 0.27),
			NumberSequenceKeypoint.new(1, 1)
		})
		-- [탄도 잔광] 선회포는 짧고 빠르게, 장포는 가늘고 길게, 구포는 묵직하게.
		-- 네모난 리본 가장자리를 막기 위해 폭을 양 끝에서 0으로 좁힌다.
		trail.WidthScale = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(0.24, math.min(0.95, if nc.dur <= 0.36 then 0.30
				elseif nc.range >= 180 then 0.42 elseif nc.arc >= 35 then 0.82 else 0.58)),
			NumberSequenceKeypoint.new(1, 0)
		})
		trail.Parent = ball
		emitterOn(ball, {
			tex = "smoke", c0 = theme.smoke, c1 = if style.faction == "lost" then theme.tracer else C_SMOKE,
			s0 = 0.5 + stage * 0.1, s1 = 1.5 + stage * 0.32, life = 0.4 + stage * 0.06,
			v0 = 0.1, v1 = 1.8, rate = if MOBILE_VFX then 4 + stage else 7 + stage * 2,
			a0 = 0.46, spread = 45, drag = 2.4
		})
	end
	end
	-- [해역·노선별 항적] 대양 범선은 길고 얇은 흰 줄, 노선은 양측 거품, 미지 선박은 청록빛 잔류 파문.
	function FX.wake(sh, key, now)
		-- [항적·뱃머리 파도] 선박 이동 방향에 맞춰 선수 좌우 물보라와 V자형 포말을 생성한다.
		-- 새로운 3D 물/기본 도형 없이 승인된 선박 모델과 기존 spark 입자만 사용한다.
		local last = FX.wakeAt[key]
		local profile = sh.fx or DEFAULT_FX
		local theme = profile.theme or FX_THEMES.europe
		local step = if MOBILE_VFX then 0.31 else 0.22
		if last and now - last.t < step then return end
		local moved = last and (sh.pos - last.pos).Magnitude or 0
		FX.wakeAt[key] = { pos = sh.pos, t = now, frame = if last then (last.frame or 0) + 1 else 1 }
		if moved <= 0.35 or (sh.speed or 0) <= 1.5 then return end
		local heading = Vector3.new(math.cos(sh.theta), 0, math.sin(sh.theta))
		local right = Vector3.new(-heading.Z, 0, heading.X)
		local rowing = profile.rowed == true
		local drive = math.clamp((sh.speed or 0) / 18, 0.34, 1.75)
		local stern = ORIGIN + sh.pos - heading * sh.length * 0.49 + Vector3.new(0, 0.27, 0)
		-- [선미] 흰 선형 포말과 조금 굵은 물방울을 겹쳐 물살이 끊기지 않도록 한다.
		FX.burst(stern, Vector3.new(-heading.X, 0.1, -heading.Z), {
			{ tex = "spark", c0 = Color3.fromRGB(245, 255, 255), c1 = theme.foam,
				s0 = if rowing then 0.76 else 0.62, s1 = 0.025, life = if rowing then 0.88 else 0.72,
				v0 = 2 * drive, v1 = 7 * drive, spreadX = if rowing then 92 else 55, spreadY = 15,
				axis = "forward", n = if MOBILE_VFX then 5 else 9,
				a0 = 0.25, drag = 4.2, acc = Vector3.new(0, -4, 0), glow = 0.13 },
		})
		-- [선수] 좌현·우현 물보라가 배 앞에서 갈라진다. 모바일은 반씩 번갈아 표시한다.
		local bow = ORIGIN + sh.pos + heading * sh.length * 0.43 + Vector3.new(0, 0.33, 0)
		for side = -1, 1, 2 do
			if not MOBILE_VFX or side == (if FX.wakeAt[key].frame % 2 == 0 then 1 else -1) then
				local sprayDir = right * side * 0.72 - heading * 0.35 + Vector3.new(0, 0.7, 0)
				FX.burst(bow + right * side * sh.length * 0.075, sprayDir, {
					{ tex = "spark", c0 = Color3.fromRGB(248, 255, 255), c1 = theme.foam,
						s0 = math.min(0.95, 0.57 * drive), s1 = 0.04,
						life = 0.45, v0 = 7 * drive, v1 = 15 * drive,
						spreadX = 28, spreadY = 38, axis = "forward",
						n = if MOBILE_VFX then 5 else 9, a0 = 0.11,
						acc = Vector3.new(0, -20, 0), drag = 1.9, glow = 0.25 },
				})
			end
		end
		-- [노선] 실제 노로 젓는 함선은 양쪽에서 짧은 흰 물줄기를 추가한다.
		if rowing and not MOBILE_VFX and FX.wakeAt[key].frame % 2 == 0 then
			for side = -1, 1, 2 do
				local oar = ORIGIN + sh.pos - heading * sh.length * 0.15
					+ right * side * sh.length * 0.22 + Vector3.new(0, 0.30, 0)
				FX.burst(oar, right * side + Vector3.new(0, 0.35, 0), {
					{ tex = "spark", c0 = theme.foam, s0 = 0.45, s1 = 0.02,
						life = 0.42, v0 = 4, v1 = 10,
						spreadX = 32, spreadY = 40, axis = "forward", n = 5,
						a0 = 0.25, drag = 3.6, acc = Vector3.new(0, -11, 0) },
				})
			end
		end
	end
	-- [선체 손상 단계] 갑판 고정 불꽃과 매연이 피해율에 따라 진해지고 회복 시 사라진다.
	function FX.damage(sh, key, now)
		FX.shipFire(sh, key, sh.hp or 1, now)
	end

	-- 대포 한 발
	local kick = 0 -- 포격·피격 때 순간적으로 화각이 튀는 정도
	-- 화면 가운데 잠깐 뜨는 한 줄 연출 글자
	-- [해전 글씨 선명도] 전투 알림 한 개만 표시하고 폰트를 고정한다.
	-- 이전에는 매 프레임 TextSize를 바꿔 한글 윤곽이 뭉개지고 알림이 겹쳤다.
	local currentAnnouncement = nil
	local function popText(text, color)
		-- [해전 알림] 이 함수의 트윈 서비스는 함수 안에서 가져와 미정의 변수 오류를 막는다.
		local tweenService = game:GetService("TweenService")
		if currentAnnouncement and currentAnnouncement.Parent then currentAnnouncement:Destroy() end
		local l = label(gui, text, if battleViewport.X < 480 then 23 else 30, color)
        currentAnnouncement = l
        l.Name = "NavalBattleAnnouncement"
        l.Font = Enum.Font.GothamBold
        l.AnchorPoint = Vector2.new(0.5, 0.5)
        l.Position = UDim2.fromScale(0.5, if battleViewport.X < 480 then 0.25 else 0.27)
        l.Size = UDim2.fromOffset(math.min(410, battleViewport.X - 24), if battleViewport.X < 480 then 50 else 58)
        l.TextScaled = false
        l.TextWrapped = true
        l.TextStrokeTransparency = 1
        l.BackgroundColor3 = Color3.fromRGB(28, 25, 21)
        l.BackgroundTransparency = 0.08
        l.ZIndex = 28
        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 8)
        corner.Parent = l
        local edge = Instance.new("UIStroke")
        edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        edge.Color = Color3.fromRGB(216, 177, 104)
        edge.Thickness = 1.5
        edge.Parent = l
        -- 글자·배경·테두리를 함께 지워 빈 알림 테두리가 남지 않게 한다.
        task.delay(0.92, function()
            if not l.Parent then return end
            local fade = TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
            tweenService:Create(l, fade, { TextTransparency = 1, BackgroundTransparency = 1 }):Play()
            tweenService:Create(edge, fade, { Transparency = 1 }):Play()
        end)
		task.delay(1.28, function()
			if l.Parent then l:Destroy() end
			if currentAnnouncement == l then currentAnnouncement = nil end
		end)
	end
	skillPop = popText
	skillFx = function(id, dur)
		if not finished then FX.skill(me, id, dur) end
	end
	-- 피해 숫자: 맞은 배 위로 빨간(내 배)·노란(적) 숫자가 떠올랐다 사라진다
	dmgPop = function(toPlayer, amount)
		local sh = if toPlayer then me else foe
		if finished or not sh or amount <= 0 then
			return
		end
		-- [전술 원주 피격 반응] 실제 피해 숫자가 발생했을 때만 펄스를 준다.
		if toPlayer then
			rangeRing.hitUntil = os.clock() + 0.55
		else
			rangeRing.impactUntil = os.clock() + 0.48
		end
		-- [피해 방향] 표시용 실제 피격 방향과 피격 횟수만 기록한다. HP·서버 판정은 바꾸지 않는다.
		local incoming = if toPlayer then foe.pos - me.pos else me.pos - foe.pos
		local facing = Vector3.new(math.cos(sh.theta), 0, math.sin(sh.theta))
		sh.lastHitSide = if facing:Cross(incoming).Y >= 0 then 1 else -1
		sh.damageHits = (sh.damageHits or 0) + 1
		local v, on = cam:WorldToViewportPoint(ORIGIN + sh.pos + Vector3.new((math.random() - 0.5) * 12, 16, 0))
		if not on then
			return
		end
		local inset = game:GetService("GuiService"):GetGuiInset()
		local l = label(gui, "-" .. tostring(amount), 28, if toPlayer then Color3.fromRGB(255, 110, 96) else Color3.fromRGB(255, 226, 110))
		l.AnchorPoint = Vector2.new(0.5, 0.5)
		l.Size = UDim2.fromOffset(120, 36)
		l.Position = UDim2.fromOffset(v.X - inset.X, v.Y - inset.Y)
		l.Font = Enum.Font.GothamBold
		l.TextStrokeColor3 = Color3.fromRGB(16, 22, 30)
		l.TextStrokeTransparency = 0.82
		l.ZIndex = 22
		local TS = game:GetService("TweenService")
		TS:Create(l, TweenInfo.new(1.1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = l.Position - UDim2.fromOffset(0, 54), TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
		task.delay(1.2, function() l:Destroy() end)
		-- [포격 연타] 실명중 때만 집계하는 시각 피드백. 회피 콤보·피해 판정·보상에는 영향 없음.
		if not toPlayer and not opts.cardOnly then
			local nowHit = os.clock()
			navalHitStreak = if nowHit - navalHitAt <= 3.2 then navalHitStreak + 1 else 1
			navalHitAt = nowHit
			streakNoticeToken += 1
			local token = streakNoticeToken
			comboLabel.Text = string.format("%d연타! 포격", navalHitStreak)
			comboLabel.TextColor3 = if navalHitStreak >= 10 then Color3.fromRGB(255, 166, 109)
				elseif navalHitStreak >= 5 then Color3.fromRGB(255, 233, 137)
				else Color3.fromRGB(243, 249, 255)
			comboLabel.TextTransparency = 0
			if navalHitStreak == 3 or navalHitStreak == 5 or navalHitStreak == 10 then
				Sfx.play(if navalHitStreak >= 10 then "sfx_horn" else "sfx_card_ring",
					if MOBILE_VFX then 0.26 else 0.40,
					if navalHitStreak >= 10 then 1.12 else 1.30, "sfx_bell")
			end
			task.delay(1.35, function()
				if not finished and streakNoticeToken == token and comboLabel.Parent then
					game:GetService("TweenService"):Create(comboLabel, TweenInfo.new(0.30), { TextTransparency = 1 }):Play()
				end
			end)
		elseif toPlayer then
			navalHitStreak = 0
		end
	end
	-- [맵 보급 안내] 실제 등록 부표/기뢰만 배의 선수 기준 방향·거리를 상단에 보여 준다.
	local pickupCue = label(gui, "", if battleViewport.X < 480 then 13 else 15, Color3.fromRGB(156, 239, 247))
	pickupCue.Name = "NavalPickupDirection"
	pickupCue.AnchorPoint = Vector2.new(1, 0)
	pickupCue.Position = UDim2.new(1, -12, 0, if battleViewport.X < 480 then 93 else 77)
	pickupCue.Size = UDim2.fromOffset(if battleViewport.X < 480 then 158 else 200, 27)
	pickupCue.TextXAlignment = Enum.TextXAlignment.Center
	pickupCue.Font = Enum.Font.GothamBlack
	pickupCue.TextStrokeColor3 = Color3.fromRGB(13, 24, 35)
	pickupCue.TextStrokeTransparency = 0.36
	pickupCue.BackgroundColor3 = Color3.fromRGB(18, 36, 48)
	pickupCue.BackgroundTransparency = 0.28
	pickupCue.ZIndex = 18
	pickupCue.Visible = false
	Instance.new("UICorner", pickupCue).CornerRadius = UDim.new(0, 8)

	-- [실시간 해상전투 맵] 보급 부표·기뢰를 직접 조타해 회수한다.
	-- 저장·카드 전투·자동 재현에는 적용하지 않고 기존 실제 등록 모델만 복제한다.
	function FX.itemsStep(now)
		if not RT or not rt or rt.ended or phase ~= "duel" or finished then
			pickupCue.Visible = false
			return
		end
		if now >= FX.nextItemAt then
			FX.nextItemAt = now + (if MOBILE_VFX then 13 else 11)
			if #FX.items < 3 then
				FX.itemSerial += 1
				local kind = if FX.itemSerial % 3 == 0 then "mine" else "energy"
				local library = ReplicatedStorage:FindFirstChild("MareAssets")
				local group = library and library:FindFirstChild(if kind == "mine" then "Relics" else "Naval")
				local assetName = if kind == "mine" then "weapon-bomb" else "buoy"
				local tpl = group and group:FindFirstChild(assetName)
				if AssetIds[(if kind == "mine" then "Relics/" else "Naval/") .. assetName]
					and tpl and tpl:IsA("Model") then
					local heading = Vector3.new(math.cos(me.theta), 0, math.sin(me.theta))
					local right = Vector3.new(-heading.Z, 0, heading.X)
					local offset = heading * math.random(55, 92) + right * math.random(-48, 48)
					local pos = Vector3.new(math.clamp(me.pos.X + offset.X, -350, 350), 0,
						math.clamp(me.pos.Z + offset.Z, -350, 350))
					if (pos - foe.pos).Magnitude > 24 then
						local model = tpl:Clone()
						for _, d in model:GetDescendants() do
							if d:IsA("BasePart") then
								d.Anchored = true
								d.CanCollide = false
								d.CanQuery = false
								d.CanTouch = false
							end
						end
						model.Name = if kind == "mine" then "NavalMinePickup" else "NavalEnergyPickup"
						model.Parent = folder
						local ok = pcall(function()
							local _, ext = model:GetBoundingBox()
							model:ScaleTo((if kind == "mine" then 5.0 else 6.0)
								/ math.max(0.01, ext.X, ext.Y, ext.Z))
							local box, size = model:GetBoundingBox()
							local bottom = box.Position - Vector3.new(0, size.Y * 0.5, 0)
							model:PivotTo(CFrame.new(ORIGIN + pos + Vector3.new(0, 0.6, 0) - bottom) * model:GetPivot())
						end)
						local root = model.PrimaryPart or model:FindFirstChildWhichIsA("BasePart", true)
						if ok and root then
							model:SetAttribute("NavalPickupKind", kind)
							local tint = if kind == "mine" then Color3.fromRGB(255, 175, 113)
								else Color3.fromRGB(120, 238, 252)
							local highlight = Instance.new("Highlight")
							highlight.FillColor = tint
							highlight.OutlineColor = tint
							highlight.FillTransparency = 0.81
							highlight.OutlineTransparency = 0.22
							highlight.DepthMode = Enum.HighlightDepthMode.Occluded
							highlight.Parent = model
							local billboard = Instance.new("BillboardGui")
							billboard.Name = "NavalPickupName"
							billboard.Adornee = root
							billboard.Size = UDim2.fromOffset(118, 34)
							billboard.StudsOffsetWorldSpace = Vector3.new(0, 4.2, 0)
							billboard.AlwaysOnTop = true
							billboard.MaxDistance = 220
							billboard.Parent = gui
							local sign = label(billboard, if kind == "mine" then "기뢰 회수" else "기력 보급", 17, tint)
							sign.Size = UDim2.fromScale(1, 1)
							sign.Font = Enum.Font.GothamBlack
							sign.TextStrokeColor3 = Color3.fromRGB(17, 27, 35)
							sign.TextStrokeTransparency = 0.28
							table.insert(FX.items, {
								kind = kind, pos = pos, model = model, marker = billboard,
								pivot = model:GetPivot(), expires = now + 30,
								phase = math.random() * 6.28,
							})
						else
							model:Destroy() -- 해당 실제 모델 검증에 실패하면 대체 파츠를 만들지 않는다.
						end
					end
				end
			end
		end
		for i = #FX.items, 1, -1 do
			local item = FX.items[i]
			local picked = item.model.Parent and (me.pos - item.pos).Magnitude <= math.max(12, me.length * 0.25)
			if picked then
				if item.kind == "energy" then
					-- [기력] 포격/특화 재사용시간 각각 5초 단축. 기존 cd 값·지속시간은 보존한다.
					for _, sk in SKILLS do
						skillReady[sk.id] = math.max(now, skillReady[sk.id] - 5)
					end
					popText("기력 보급! 재사용 -5초", Color3.fromRGB(135, 247, 231))
					Sfx.play("sfx_card_ring", 0.54, 1.32, "sfx_bell")
					FX.burst(ORIGIN + item.pos + Vector3.new(0, 3, 0), nil, {
						{ tex = "spark", c0 = Color3.fromRGB(145, 247, 250), c1 = Color3.fromRGB(240, 255, 255),
							s0 = 0.55, s1 = 0.04, life = 0.55, v0 = 12, v1 = 23,
							spread = 130, glow = 0.9, n = if MOBILE_VFX then 5 else 11 },
					})
				else
					-- [기뢰] 다음 실제 적중 포격에만 소형 추가 폭발. 최대 두 발 보관, 저장/무제한 적립 없음.
					FX.mineCharges = math.min(2, FX.mineCharges + 1)
					popText(string.format("기뢰 확보! %d발 장전", FX.mineCharges), Color3.fromRGB(255, 199, 128))
					Sfx.play("sfx_metal_clash", 0.44, 1.17, "sfx_card_ring")
					FX.shockRing(ORIGIN + item.pos, Color3.fromRGB(255, 214, 142), 11, 0.42)
				end
			elseif item.model.Parent and now < item.expires then
				item.model:PivotTo(item.pivot * CFrame.new(0, math.sin(now * 1.9 + item.phase) * 0.42, 0)
					* CFrame.Angles(0, math.sin(now + item.phase) * 0.10, 0))
			end
			if picked or not item.model.Parent or now >= item.expires then
				if item.marker.Parent then item.marker:Destroy() end
				if item.model.Parent then item.model:Destroy() end
				table.remove(FX.items, i)
			end
		end
		-- [거리/방위] 매 프레임 연산·문구 갱신을 피하기 위해 0.2초에 한 번 가까운 아이템만 안내한다.
		if now >= (FX.pickupCueAt or 0) then
			FX.pickupCueAt = now + 0.20
			local closest, nearestDist = nil, math.huge
			for _, entry in FX.items do
				if entry.model.Parent then
					local dist = (entry.pos - me.pos).Magnitude
					if dist < nearestDist then closest, nearestDist = entry, dist end
				end
			end
			pickupCue.Visible = closest ~= nil
			if closest then
				local course = closest.pos - me.pos
				local heading = Vector3.new(math.cos(me.theta), 0, math.sin(me.theta))
				local right = Vector3.new(-heading.Z, 0, heading.X)
				local front = if nearestDist > 0.1 then course.Unit:Dot(heading) else 1
				local side = if nearestDist > 0.1 then course.Unit:Dot(right) else 0
				local direction = if front > 0.55 then "앞" elseif front < -0.55 then "뒤"
					elseif side >= 0 then "우현" else "좌현"
				pickupCue.Text = string.format("%s · %s %dm", direction,
					if closest.kind == "mine" then "기뢰" else "기력", math.floor(nearestDist + 0.5))
				pickupCue.TextColor3 = if closest.kind == "mine" then Color3.fromRGB(255, 204, 137)
					else Color3.fromRGB(146, 243, 247)
			end
		end
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
	-- [포격 시네마] 함선 중앙이 아닌 실제 좌·우 선측 포구에서 번갈아 발사한다.
	local function shoot(fromPos, toPos, fx, nc)
		nc = nc or NC.demi
		local from = ORIGIN + fromPos + Vector3.new(0, 7, 0)
		local shooter = nil
		do
			local nearest = nil
			local nearestDistance = 6
			for _, group in { { me, foe }, allies, escorts } do
				for _, sh in group do
					local gap = (fromPos - sh.pos).Magnitude
					if gap < nearestDistance then nearest, nearestDistance = sh, gap end
				end
			end
			if nearest then
				shooter = nearest
				local heading = Vector3.new(math.cos(nearest.theta), 0, math.sin(nearest.theta))
				local broadside = Vector3.new(-heading.Z, 0, heading.X)
				local aim = toPos - fromPos
				local sign = if broadside:Dot(aim) >= 0 then 1 else -1
				local barrel = (math.random() - 0.5) * nearest.length * 0.55
				from += broadside * sign * math.min(5, nearest.length * 0.11) + heading * barrel
			end
		end
		-- 기존 전투의 실제 명중 판정·피해량을 유지한다. 모델의 비행 경로만 풍부하게 그린다.
		local hullHit = fx ~= nil
		local to = ORIGIN + toPos + Vector3.new(
			(math.random() - 0.5) * 10,
			if hullHit then 6 + math.random() * 3 else 0.4,
			(math.random() - 0.5) * 6
		)
		-- [함종별 포성] 소형선은 날카롭게, 대형함은 낮고 무겁게. 등록된 원본 효과음만 층층이 재생한다.
		local style = if shooter then shooter.fx else DEFAULT_FX
		local stage = math.clamp(style.stage or 2, 1, 6)
		local nearShip = (fromPos - me.pos).Magnitude < 110
		Sfx.play("sfx_naval_cannon", (if nearShip then 0.71 else 0.42) + stage * 0.02,
			1.13 - stage * 0.045 + math.random() * 0.08, "sfx_cannon")
		if stage >= 4 and nearShip and not MOBILE_VFX then
			Sfx.play("sfx_cannon", 0.26 + stage * 0.025, 0.82 - stage * 0.016)
		end
		FX.muzzle(from, (to - from).Unit, style, nc)
		-- [실제 포구 반동] 발사한 승인 선체 메시의 포격 방향만 기록한다. 속도·피해·장전은 변경하지 않는다.
		if shooter then
			local fireAxis = toPos - fromPos
			local shipRight = Vector3.new(-math.sin(shooter.theta), 0, math.cos(shooter.theta))
			shooter.recoilAt = os.clock()
			shooter.recoilSide = if shipRight:Dot(fireAxis) >= 0 then -1 else 1
			shooter.recoilForce = math.clamp(nc.ball * 0.11, 0.08, 0.26)
		end
		if nearShip and stage >= 2 and not MOBILE_VFX then
			task.delay(math.min(0.22, nc.dur * 0.40), function()
				if not finished then Sfx.play("sfx_sail_fabric", 0.13, 1.35 + stage * 0.025) end
			end)
		end
		if stage >= 5 and not MOBILE_VFX then
			task.delay(0.14, function()
				if not finished then Sfx.play("sfx_cannon", 0.25, 0.78) end
			end)
		end
		shake = math.max(shake, if hullHit then 0.7 else 0.35)
		kick = math.max(kick, nc.ball * 1.6)
		if hullHit then
			task.delay(0.9, function()
				if not finished then
					Sfx.play("sfx_cannon_reload", 0.34, 0.95 + math.random() * 0.1)
				end
			end)
		end
		-- [발사 펄스] 우리 기함 실제 포구에서 발사된 경우 사거리 나침반이 순간적으로 밝아진다.
		if shooter == me then
			rangeRing.volleyUntil = os.clock() + 0.36
		end
		-- 발사 화염·조명은 FX.muzzle 입자가 담당한다. 구형 광구를 중복 생성하지 않는다.
		local ball = part(folder, Vector3.new(nc.ball, nc.ball, nc.ball), CFrame.new(from), Color3.fromRGB(30, 30, 34), Enum.Material.Metal, Enum.PartType.Ball)
		FX.projectile(ball, nc, style)
		-- 수면 그림자는 PC에서만 표시한다. 모바일에서는 비행 궤적을 우선한다.
		-- [탄도 그림자] 임의 납작한 원통을 만들지 않고 실제 포탄+꼬리만 표시한다.
		local t0 = os.clock()
		local dur = nc.dur
		local conn
		conn = RunService.Heartbeat:Connect(function()
			local u = math.clamp((os.clock() - t0) / dur, 0, 1)
			local bpos = from:Lerp(to, u) + Vector3.new(0, math.sin(u * math.pi) * nc.arc, 0)
			local velocity = (to - from) + Vector3.new(0, math.cos(u * math.pi) * nc.arc * math.pi, 0)
			ball.CFrame = CFrame.lookAt(bpos, bpos + velocity.Unit)
			if u >= 1 then
				conn:Disconnect()
				ball:Destroy()
				if finished then
					return
				end
				-- 착탄과 물보라를 실제 포탄 충돌 프레임에 맞춰 별도 재생한다.
				if hullHit then
					Sfx.play("sfx_naval_hull_hit", 0.72 + stage * 0.026, 1.05 - stage * 0.03 + math.random() * 0.08, "sfx_hit")
					Sfx.play("sfx_naval_wood", 0.45 + stage * 0.025, 1.12 - stage * 0.037, "sfx_creak")
					if math.random() < 0.42 then
						Sfx.play(if stage >= 4 then "sfx_rope_release" else "sfx_creak", 0.25, 0.78 + math.random() * 0.4)
					end
					if stage >= 4 and not MOBILE_VFX then
						Sfx.play("sfx_metal_clash", 0.23, 0.85, "sfx_hit")
					end
				else
					Sfx.play("sfx_naval_splash", 0.50 + nc.ball * 0.11, 1.1 - nc.ball * 0.1, "sfx_splash")
					if nc.ball >= 1.5 then Sfx.play("sfx_splash", 0.22, 1.16 + math.random() * 0.18) end
					if nc.ball >= 1.5 and not MOBILE_VFX then
						task.delay(0.15, function()
							if not finished then Sfx.play("sfx_splash", 0.22, 0.85) end
						end)
					end
				end
				if hullHit then
					FX.splinters(to, if MOBILE_VFX then 5 else 5 + stage * 2)
					FX.impact(to, nc.ball, style, nc)
					shake = math.max(shake, 1.3)
					kick = math.max(kick, 5 + nc.ball)
					if to.Y <= ORIGIN.Y + 9 then
						FX.splash(Vector3.new(to.X, ORIGIN.Y, to.Z), style, nc.ball * 0.78)
					end
				else
					FX.splash(to, style, nc.ball)
				end
				-- 충돌 시 거대한 광구·회색 공 대신 위의 실제 파편·입자 폭발과 물결만 사용한다.
				-- 별도 프레임 연결을 만들지 않아 모바일 부하도 줄인다.
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
		-- [발사 순간 반동] 실제 모델 Pivot만 아주 짧게 흔들린 뒤 감쇠한다.
		if sh.recoilAt then
			local age = t - sh.recoilAt
			if age >= 0 and age < 0.50 then
				local pulse = math.exp(-age * 9) * math.sin(age * 23)
				heel += (sh.recoilSide or 1) * (sh.recoilForce or 0.1) * pulse
				pitch += (sh.recoilForce or 0.1) * 0.32 * pulse
			end
		end
		local dip, rollAdd, pitchAdd = -(1 - hp) * 1.6, 0, 0
		if sink then
			-- [5가지 선체 침몰] 기존 승인 모델의 Pivot만 움직인다. 함종·피격 방향·화재 상태를 반영한다.
			local k = sink.k
			local mode = sink.mode or "bow"
			dip -= k * k * (12 + sh.length * 0.24)
			if mode == "bow" then
				pitchAdd, rollAdd = -k * 0.85, sink.side * k * 0.22
			elseif mode == "stern" then
				pitchAdd, rollAdd = k * 0.82, sink.side * k * 0.20
			elseif mode == "capsize" then
				rollAdd, pitchAdd = sink.side * k * 1.85, -k * 0.12
				dip -= math.max(0, k - 0.48) * 9
			elseif mode == "fire" then
				rollAdd, pitchAdd = sink.side * k * 0.62, -k * 0.36
				dip += (1 - k) * k * 3.5
			elseif mode == "mast" then
				rollAdd, pitchAdd = sink.side * k * 1.12, -k * 0.68
			end
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
		for i = 1, (if MOBILE_VFX then 2 else 4) do
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
	-- [실제 접현] 기존 R15 선원을 갑판에 재사용하고 검술 동작만 연출한다.
	-- 백병전 피해·승패·카드 상태에 간섭하지 않으며, 중복 소환은 막는다.
	local function updateCrews(now)
		-- [해전 백병전] 갑판에 별도 R15 인형을 만들지 않는다. 접현 연출과 카드 전용 선원만 유지한다.
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
				elseif FX.boardingActive then
					Pose.makeR15Action(c.rig, "attack", math.clamp(((now + c.idx * 0.2) % 1.0) / 0.65, 0, 1), now)
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
	local loser = if RT then nil elseif opts.winner == "a" then "foe" elseif opts.winner == "b" then "me" else nil
	local fleeProgress, fleeTried = 0, false
	local nextFoeFire = os.clock() + 1.7
	local boardStart = nil
	local endAt = nil
	local melIdx = 0
	local lastT = os.clock()
	local escortFire = os.clock() + 3
	local nextHullSound = os.clock() + 5

	-- ===== 실시간 해전 규칙 =====
	local function rtFinish(w, why, board, boardLog)
		if not rt or rt.ended then
			return
		end
		rt.ended = true
		FX.outcomeReason = why
		local now = os.clock()
		local claim = {
			winner = w, reason = why, elapsed = now - rt.start,
			meHull = rt.meHull, foeHull = rt.foeHull, meCrew = rt.meCrew, foeCrew = rt.foeCrew, board = board,
		}
		local function setWinner(x)
			opts.winner = if x == "a" or x == "b" then x else nil
			loser = if x == "a" then "foe" elseif x == "b" then "me" else nil
			local mh, fh = math.clamp(rt.meHull / rt.meMax, 0.12, 1), math.clamp(rt.foeHull / rt.foeMax, 0.12, 1)
			if x == "a" then
				meEnd, foeEnd = mh, 0
			elseif x == "b" then
				meEnd, foeEnd = 0, fh
			else
				meEnd, foeEnd = mh, fh
			end
		end
		setWinner(w)
		-- 서버에 결과를 알리고, 서버가 확인한 승패를 따른다
		task.spawn(function()
			local res = if opts.onResult then opts.onResult(claim) else nil
			if res ~= nil and not finished then
				setWinner(res)
			end
		end)
		meleeQueue = {}
		for _, e in parseLog(boardLog or {}) do
			if e.kind == "melee" then
				table.insert(meleeQueue, e)
			end
		end
		melIdx = 0
		rt.sunk = board == nil
		boardStart = if board then now else now - 0.3
		phase = "board"
		pickupCue.Visible = false
		hint.Text = ""
		if board then
			subtitle.Text = "두 배가 접현했다! 백병전!"
			shake = 2.2
			Sfx.play("sfx_horn")
			Sfx.play("sfx_naval_ram", 0.68, 0.96, "sfx_creak")
			Sfx.play("sfx_boarding_slash", 0.46, 1)
			FX.boarding()
		else
			subtitle.Text = if w == "a" then "적선이 침몰한다!" elseif w == "b" then "우리 배가 가라앉는다..." else "서로 물러났다."
		end
	end
	local function rtDamage(toPlayer, amount)
		if not rt or rt.ended or amount <= 0 then return end
		if not toPlayer and FX.mineCharges > 0 then
			-- [기뢰 발동] 회수한 기뢰만 실제 적중 1회에 한 발 소비한다.
			-- 기존 포탄 피해·장전시간·탄도는 그대로, 작은 추가 피해와 수면 폭발을 더한다.
			FX.mineCharges -= 1
			amount += 6
			FX.splash(ORIGIN + foe.pos, foe.fx, 0.85)
			FX.burst(ORIGIN + foe.pos + Vector3.new(0, 4, 0), nil, {
				{ tex = "spark", c0 = Color3.fromRGB(255, 223, 146), c1 = Color3.fromRGB(244, 140, 76),
					s0 = 0.65, s1 = 0.06, life = 0.44, v0 = 18, v1 = 33,
					spread = 150, glow = 0.9, n = if MOBILE_VFX then 5 else 13 },
			})
			Sfx.play("sfx_naval_ram", if MOBILE_VFX then 0.48 else 0.67, 1.13, "sfx_cannon")
			popText("기뢰 명중! 추가 피해 +6", Color3.fromRGB(255, 192, 119))
		end
		-- [2초 철벽] 실시간 해전 중 선체·선원 피해를 일시 차단. 서버 결과 신고에도 실제 남은 HP를 전달한다.
		if toPlayer and os.clock() < skillUntil.guard then
			if os.clock() >= (me.nextGuardCue or 0) then
				me.nextGuardCue = os.clock() + 0.65
				skillPop("철벽 방어!", Color3.fromRGB(149, 226, 255))
				Sfx.play("sfx_metal_clash", 0.48, 0.84, "sfx_hit")
			end
			return
		end
		if toPlayer then
			amount = amount * (1 - math.clamp(opts.sim.me.pumpReduction or 0, 0, 0.8))
			rt.meHull = math.max(0, rt.meHull - amount)
			rt.meCrew = math.max(1, rt.meCrew - amount * 0.06)
			meHp = rt.meHull / rt.meMax
			if meHp < 0.5 then CH.flash("pump") end
		else
			rt.foeHull = math.max(0, rt.foeHull - amount)
			rt.foeCrew = math.max(1, rt.foeCrew - amount * 0.06)
			foeHp = rt.foeHull / rt.foeMax
			if rt.hits % 3 == 1 then CH.flash("cannon") end
		end
		dmgPop(toPlayer, math.max(1, math.floor(amount + 0.5)))
		Sfx.play(if toPlayer then "sfx_hit" else "sfx_naval_hull_hit", 0.7, 0.9 + math.random() * 0.2, "sfx_hit")
		if rt.foeHull <= 0 then
			rt.foeHull = 0
			rtFinish("a", "sunk")
		elseif rt.meHull <= 0 then
			rt.meHull = 0
			rtFinish("b", "sunk")
		end
	end
	local function rtBoard()
		local fa = table.clone(opts.sim.me)
		fa.hull, fa.crew = math.max(1, rt.meHull), math.max(1, math.floor(rt.meCrew))
		local fb = table.clone(opts.sim.foe)
		fb.hull, fb.crew = math.max(1, rt.foeHull), math.max(1, math.floor(rt.foeCrew))
		local seed = math.random(1, 2000000000)
		local r2 = Combat.board(fa, fb, seed)
		local board = { seed = seed, meCrew = fa.crew, foeCrew = fb.crew }
		rt.meCrew, rt.foeCrew = r2.a.crew, r2.b.crew
		if r2.winner == "a" then
			rt.foeHull = 0
		elseif r2.winner == "b" then
			rt.meHull = 0
		end
		rtFinish(r2.winner, r2.reason, board, r2.log)
	end

	table.insert(conns, RunService.Heartbeat:Connect(function()
		if finished then
			return
		end
		local now = os.clock()
		local dt = math.min(now - lastT, 0.1)
		lastT = now

		if phase == "duel" or phase == "board" then
			-- 우리 배: 방향키로 돌리고 가속 설정만큼 앞으로
			-- [화면 기준 조타] 카메라가 접현/침몰 시 반대쪽으로 돌아가도 스틱 우측은 화면 우측 선회.
			local rightTurn = Vector3.new(-math.sin(me.theta), 0, math.cos(me.theta))
			local turnSign = if rightTurn:Dot(cam.CFrame.RightVector) < -0.05 then -1 else 1
			me.theta += steerDir * turnSign * (if now < skillUntil.evade then 2.6 else 1.5) * dt
			-- [접현 돌진] 수동 조타 중에는 그 방향 우선. 자동 조타일 때만 실제 적선으로 선수를 향한다.
			if now < skillUntil.dash and phase == "duel" and steerDir == 0 then
				local approach = foe.pos - me.pos
				if approach.Magnitude > 15 then
					steerToward(me, math.atan2(approach.Z, approach.X), dt, 2.6)
				end
			end
			-- 조종 보조: 스틱을 놓고 있으면 적선에 옆면(포 방향)을 자동으로 맞춘다
			if steerDir == 0 and phase == "duel" and now >= skillUntil.dash then
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
			if phase == "duel" and not opts.cardOnly and not finished then
				local dist = (foe.pos - me.pos).Magnitude
				if meHp < 0.35 then
					navalSay("hull", "선체가 위험해요! 회피 기동으로 빠지거나 적선과 거리를 벌려요.", now)
				elseif foeHp < 0.25 then
					navalSay("finish", "적이 거의 무너졌어요. 포격을 이어가요!", now)
				elseif dist > cannon.range * 1.15 then
					navalSay("range", "적이 사거리 밖이에요. 가까이 붙어요 (스틱을 위로).", now)
				elseif wf < 0.88 then
					navalSay("wind", "맞바람이에요. 바람을 등지게 뱃머리를 돌리면 빨라져요.", now)
				elseif SKILLS[2].id == "dash" and dist < 135 and now >= skillReady.dash then
					navalSay("dash", "접현 특화선이에요. 돌진(E)으로 선수를 적에게 맞추고 가까이 붙어요.", now)
				elseif SKILLS[2].id == "guard" and meHp < 0.75 and dist < 110 and now >= skillReady.guard then
					navalSay("guard", "방어 특화선이에요. 적 포탄이 닿기 직전 격벽(E)으로 선체를 지켜요.", now)
				elseif SKILLS[2].id == "rapid" and dist < cannon.range and now >= skillReady.rapid then
					navalSay("rapid", "포격 특화선이에요. 선측을 맞추고 일제사격(E)으로 포문을 열어요.", now)
				elseif SKILLS[2].id == "evade" and dist < 95 and now >= skillReady.evade then
					navalSay("evade", "기동 특화선이에요. 회피(E)로 포탄 낙하 지점을 벗어나요.", now)
				elseif dist < cannon.range and now >= skillReady.fire then
					navalSay("fire", "사거리 안이에요. 선측을 맞춰 포 사격(Q)을 쓰면 좋아요.", now)
				elseif dist < 60 then
					navalSay("close", "너무 가까워요. 옆면을 맞춰 일제 사격하거나 거리를 벌려요.", now)
				end
			end
			me.speed = myTop * (stickThrottle or throttle) * wf *
				(if now < skillUntil.dash then 2.0 elseif now < skillUntil.evade then 1.3 else 1)
			sailLabel.Text = if battleViewport.X < 480 then (if wf > 1.12 then "순풍" elseif wf < 0.88 then "맞바람" else "옆바람")
				else (if wf > 1.12 then "⛵ 순풍 — 속도 증가" elseif wf < 0.88 then "⛵ 맞바람 — 속도 감소" else "⛵ 옆바람")
			sailLabel.TextColor3 = if wf > 1.12 then Color3.fromRGB(130, 235, 150) elseif wf < 0.88 then Color3.fromRGB(240, 150, 130) else Color3.fromRGB(150, 220, 255)
			if cardBusy then me.speed = 0 end
			me.pos += forward(me.theta) * me.speed * dt
			-- [맵 아이템] 이동 직후 충돌을 계산해 터치·키보드 모두 접근만으로 획득한다.
			FX.itemsStep(now)
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
			local want = bearing + (if dist > 88 then 0.15 elseif dist < 52 then -1.9 else 1.45)
			steerToward(foe, want, dt, 1.1)
			foe.speed = (if dist > 88 then 17 else 11) * windFactor(foe.theta)
			if cardBusy then foe.speed = 0 end
			foe.pos += forward(foe.theta) * foe.speed * dt
			if phase == "board" and not (rt and rt.sunk) then
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
				if sh.pos.Magnitude > 440 then
					steerToward(sh, math.atan2(-sh.pos.Z, -sh.pos.X), dt, 1.5)
				end
			end

			-- 도주: 해역 가장자리 밖으로 몇 초 버티면 도망 시도 (서버가 성공 여부를 판정)
			if phase == "duel" and opts.canFlee and not fleeTried then
				if me.pos.Magnitude > 400 then
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
								banner.TextStrokeTransparency = 1
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
				if RT and not rt.ended then
					-- 내 포격: 사정거리 안에서 배의 옆면이 적선을 향할 때 나간다. 적이 움직인 만큼 빗나갈 수 있다.
					local fwdv = forward(me.theta)
					local toFoe = foe.pos - me.pos
					local side = if toFoe.Magnitude > 0.1 then math.abs(fwdv:Cross(toFoe.Unit).Y) else 0
					local inRange = d < cannon.range
					-- Q 포 사격 명령도 기존 실제 선측·사거리·명중 계산을 그대로 통과한다.
					if now < fireOrderUntil and inRange and side > 0.5 then
						nextMeFire = math.min(nextMeFire, now)
						fireOrderUntil = 0
					end
					if inRange and side > 0.5 and now >= nextMeFire then
						nextMeFire = now + cannon.cd * (if now < skillUntil.rapid then 0.4 else 1)
						local lead = foe.pos + forward(foe.theta) * foe.speed * cannon.dur
						local acc = math.clamp((side - 0.3) / 0.7, 0.35, 1) * (1 - 0.3 * d / cannon.range)
						local base = opts.sim.me.cannons * 1.6 * opts.sim.me.cannonMult * (0.85 + 0.3 * math.random()) * Combat.SIM.volley
						rt.shots += 1
						-- 대형 포격선은 포문 수에 맞춰 추가 포탄 궤적 한 발만 표현한다. 피해 판정은 마지막 포탄 1회 그대로.
						local volley = if now < skillUntil.rapid then (if shipDef and shipDef.cannons >= 14 and not MOBILE_VFX then 4 else 3) else 2
						for k = 0, volley - 1 do
							task.delay(k * 0.08, function()
								if finished or rt.ended then
									return
								end
								shoot(me.pos, lead, if k == volley - 1 then function()
									if rt.ended then
										return
									end
									shake = 1.2
									if (foe.pos - lead).Magnitude < 26 then
										rt.hits += 1
										rtDamage(false, base * acc)
									else
										popText("빗나감!", Color3.fromRGB(190, 200, 215))
									end
								end else nil, cannon)
							end)
						end
					end
					if now - rt.start > 9 and hint.Text:sub(1, 3) == "배의 " then
						hint.Text = "" -- 처음 안내는 잠깐만 보여 준다
					end
					if inRange and side <= 0.5 and (hint.Text == "" or hint.Text:sub(1, 1) == "⚓") then
						hint.Text = "⚓ 배의 옆면을 적선 쪽으로 돌리세요!"
					elseif hint.Text:sub(1, 1) == "⚓" then
						hint.Text = ""
					end
					-- 적의 포격: 낙하 지점에 붉은 원이 뜨고, 그 안에 있으면 맞는다
					if d < 105 and now >= nextFoeFire then
						nextFoeFire = now + 2.6
						local ringC = me.pos + forward(me.theta) * me.speed * 0.9
						local foeBase = opts.sim.foe.cannons * 1.6 * opts.sim.foe.cannonMult * (0.85 + 0.3 * math.random()) * Combat.SIM.volley
						warnRing(ringC, function(hit)
							if rt.ended then
								return
							end
							if hit then
								shake = 1.6
								rtDamage(true, foeBase)
							end
						end)
						shoot(foe.pos, ringC, nil)
					end
					-- 맞닿아 있으면 접현, 너무 오래 끌면 서로 물러난다
					if d < 30 then
						rt.contact += dt
					else
						rt.contact = math.max(0, rt.contact - dt)
					end
					if rt.contact >= 1.2 then
						rtBoard()
					elseif now - rt.start > 200 then
						rtFinish("draw", "stalemate")
					end
				end
				-- 자동 포격: 사정거리 안이면 쿨타임마다 한 발씩 기록을 소비한다
				if now < fireOrderUntil and not RT and d < cannon.range then
					nextMeFire = math.min(nextMeFire, now)
					fireOrderUntil = 0
				end
				if not opts.card and not RT and d < cannon.range and now >= nextMeFire and meDone + 0 < #meQueue and foeDone + meDone >= 0 then
					nextMeFire = now + cannon.cd * (if now < skillUntil.rapid then 0.4 else 1)
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
				if not opts.card and not RT and d < 95 and now >= nextFoeFire and meDone < #foeQueue then
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
						for _, segment in rangeRing.segments do segment.Transparency = 1 end
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
							local okCards, res = true, nil
							if opts.onCards then
								okCards, res = pcall(opts.onCards, acts) -- 서버 호출이 실패해도 장면이 멈추지 않게
								if not okCards then res = nil end
							end
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
				if not opts.card and not RT and (d < 30 or (foeDone >= #meQueue and meDone >= #foeQueue)) then
					phase = "board"
					boardStart = now
					hint.Text = ""
					subtitle.Text = "두 배가 접현했다! 백병전!"
					shake = 2.2
					Sfx.play("sfx_horn")
					Sfx.play("sfx_naval_ram", 0.68, 0.96, "sfx_creak")
					Sfx.play("sfx_boarding_slash", 0.46, 1)
					FX.boarding()
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
					local reason = FX.outcomeReason or opts.reason or ""
					local captured = reason == "boarded" or reason == "surrender" or reason == "fled"
						or reason == "escaped" or reason == "stalemate" or opts.card ~= nil or opts.cardOnly
					if loser and not captured then
						-- [상태 기반 침몰] 실제 패배함의 함종 크기·피격횟수·돛대 손상에 따라 다섯 장면을 분기한다.
						local sunk = if loser == "me" then me else foe
						local modes = { "bow", "stern", "capsize", "fire", "mast" }
						local seed = math.floor(sunk.length) + (sunk.damageHits or 0) * 7
							+ #(sunk.shipId or opts.enemyName or "")
						local mode = modes[seed % #modes + 1]
						if mode == "mast" and not sunk.dismasted then mode = "bow" end
						if mode == "fire" and (sunk.hp or 1) > 0.45 then mode = "stern" end
						FX.sink = { mode = mode, side = sunk.lastHitSide or 1,
							duration = if sunk.length >= 48 then 6.6 elseif sunk.length >= 38 then 5.2 else 3.9,
							nextSplash = now + 0.4, nextSound = now + 0.9,
							nextSmoke = now + 0.18, lastSplash = false }
						sinkStart = now
						Sfx.play("sfx_naval_sink", 0.64 + math.min(sunk.length / 200, 0.2), if sunk.length > 45 then 0.77 else 0.95, "sfx_splash")
					end
					banner.Text = if opts.winner == "a" then "승리!" elseif opts.winner == "b" then "패배..." else "물러났다"
					CH.flash("medic")
					banner.TextColor3 = if opts.winner == "a" then Color3.fromRGB(255, 214, 120) elseif opts.winner == "b" then Color3.fromRGB(230, 110, 100) else Color3.fromRGB(220, 220, 230)
					banner.TextTransparency = 0
					banner.TextStrokeTransparency = 1
					if opts.winner == "a" then
						Sfx.play("sfx_fanfare", 0.74, 1.0, "sfx_quest_reward")
						task.delay(0.28, function()
							if not finished then Sfx.play("sfx_horn", 0.42, 1.08) end
						end)
					elseif opts.winner == "b" then
						Sfx.play("sfx_event_danger", 0.54, 0.87, "sfx_horn")
						Sfx.play("sfx_creak", 0.50, 0.68)
					else
						Sfx.play("sfx_waves", 0.24, 0.95)
					end
					if not opts.cardOnly then
						endingCaption.Text = if captured and opts.winner == "a" then "접현·항복으로 적선을 제압했어."
							elseif captured and opts.winner == "b" then "기함이 제압됐어. 남은 승조원을 확인해."
							elseif FX.sink and opts.winner == "a" then "적선 침몰 · 승전 나팔과 함께 함대를 확인해."
							elseif FX.sink and opts.winner == "b" then "기함 침몰 · 패배 결과를 확인해."
							elseif opts.winner == "a" then "해전 승리 · 전투 결과를 확인해."
							elseif opts.winner == "b" then "해전 패배 · 피해 상태를 확인해."
							else "전투 종료 · 함선 상태를 확인해."
						endingCaption.Visible = true
					end
					subtitle.Text = ""
				end
			end
		elseif phase == "end" then
			-- [승패 카메라 길이] 침몰은 함종별 장면이 끝날 때까지 보여 주되 전투 판정은 이미 확정돼 있다.
			local outroDuration = if FX.sink then FX.sink.duration + 0.6 elseif opts.cardOnly then 2.4 else 3.5
			if now - endAt > outroDuration then
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
		-- [침몰 5종] 서버 확정 결과 이후 기존 함선 모델의 움직임·포말·선체 파열을 단계별로 재현한다.
		me.hp, foe.hp = meHp, foeHp
		local meSink, foeSink
		if sinkStart and FX.sink then
			local sink = FX.sink
			local k = math.clamp((now - sinkStart) / sink.duration, 0, 1)
			local pose = { k = k, side = sink.side, mode = sink.mode }
			local sunk = if loser == "me" then me else foe
			if loser == "me" then meSink = pose else foeSink = pose end
			local forwardShip = forward(sunk.theta)
			local along = if sink.mode == "stern" then -1 else 1
			local endPos = sunk.pos + forwardShip * sunk.length * 0.25 * along
			if now >= sink.nextSplash and k < 0.95 then
				sink.nextSplash = now + (if MOBILE_VFX then 0.85 else 0.50)
				FX.splash(ORIGIN + Vector3.new(endPos.X, 0, endPos.Z), sunk.fx,
					math.clamp(1.1 + k * 1.5 + sunk.length / 90, 1.0, 3.0))
				-- [침수선] 뱃전 양옆 포말이 함선과 함께 커진다. 새로운 원통·네모 도형은 사용하지 않는다.
				local beam = Vector3.new(-forwardShip.Z, 0, forwardShip.X)
				local foamTint = (sunk.fx and sunk.fx.theme and sunk.fx.theme.foam) or Color3.fromRGB(238, 248, 252)
				for side = -1, 1, 2 do
					FX.burst(ORIGIN + sunk.pos + beam * (side * sunk.length * 0.17)
						+ Vector3.new(0, 0.26, 0), beam * side + Vector3.new(0, 0.20, 0), {
						{ tex = "spark", c0 = Color3.fromRGB(246, 255, 255), c1 = foamTint,
							s0 = 0.45 + k * 0.25, s1 = 0.03, life = 0.61,
							v0 = 3, v1 = 8 + k * 5, spread = 65, axis = "forward",
							n = if MOBILE_VFX then 4 else 8, a0 = 0.23, drag = 3,
							acc = Vector3.new(0, -11, 0) },
					})
				end
				if k > 0.3 and not MOBILE_VFX then
					FX.splinters(ORIGIN + sunk.pos + Vector3.new(0, 4 - k * 6, 0), 4)
				end
			end
			-- [선체 침몰 연무] 진행 위치마다 큰 검은 매연을 솟게 한다. 모바일은 1초당 5개 상한.
			if now >= sink.nextSmoke and k < 0.93 then
				sink.nextSmoke = now + (if MOBILE_VFX then 1.05 else 0.65)
				local mist = (sunk.fx and sunk.fx.theme) or FX_THEMES.europe
				FX.burst(ORIGIN + sunk.pos + Vector3.new(0, 7 - k * 7, 0), nil, {
					-- [침몰 구도] 큰 연기가 선박 전체를 가리지 않도록 연기 입자의 크기와 불투명도를 줄인다.
					{ tex = "smoke", c0 = C_DARK, c1 = mist.smoke, s0 = 3.8 + k * 2, s1 = 11 + k * 9,
						life = 2.35, v0 = 5, v1 = 11, spread = 48, n = if MOBILE_VFX then 4 else 9,
						a0 = 0.43, acc = Vector3.new(0, 5, 0), drag = 1.6 },
				})
			end
			if sink.mode == "fire" and now >= (FX.sinkFlameAt or 0) and k < 0.88 then
				FX.sinkFlameAt = now + (if MOBILE_VFX then 1.0 else 0.5)
				FX.flame(ORIGIN + sunk.pos + Vector3.new(0, 6 - k * 8, 0), 4.8, sunk.fx)
			end
			if now >= sink.nextSound and k < 0.85 then
				sink.nextSound = now + (if MOBILE_VFX then 1.45 else 0.9)
				Sfx.play("sfx_naval_wood", 0.48 + k * 0.2, 0.95 - k * 0.23, "sfx_creak")
				if not MOBILE_VFX and k > 0.48 then
					Sfx.play("sfx_rope_release", 0.26, 0.78, "sfx_creak")
				end
			end
			if k >= 0.93 and not sink.lastSplash then
				sink.lastSplash = true
				FX.splash(ORIGIN + Vector3.new(sunk.pos.X, 0, sunk.pos.Z), sunk.fx,
					if sunk.length >= 48 then 3.1 else 2.35)
				Sfx.play("sfx_naval_splash", 0.78, if sunk.length >= 48 then 0.72 else 0.91, "sfx_splash")
				Sfx.play("sfx_splash", 0.34, if sunk.length >= 48 then 0.74 else 1.05) -- [침몰] 이중 물결 효과음
			end
		end
		-- 손상 연출: 체력이 줄수록 연기, 더 줄면 불길이 오른다
		for _, side in { { me, meHp, loser == "me" }, { foe, foeHp, loser == "foe" } } do
			local sh, hp = side[1] :: any, side[2] :: number
			if not side[3] and hp < 0.5 and not sh.dismasted then
				dismast(sh)
				popText(if sh == me then "돛대가 부러졌다!" else "적선의 돛대가 부러졌다!", if sh == me then Color3.fromRGB(255, 130, 110) else Color3.fromRGB(255, 226, 120))
			end
			-- 부유하는 임의 불덩이 대신 FX.damage에서 선체 고정 화재를 갱신한다.
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
			-- [해전 사거리 레이더] 실제 함선 위치/방위·실측 사거리로 반경이 움직인다.
			-- 기존 원주 조각을 재활용해 좌현·우현 포격 호, 8초 회전 스캔, 장전 진행, 적선 방위와 명중 펄스를 표시한다.
			local dd = (foe.pos - me.pos).Magnitude
			local inRange = dd < cannon.range
			local direction = foe.pos - me.pos
			local heading = Vector3.new(math.cos(me.theta), 0, math.sin(me.theta))
			local broadside = if dd > 0.1 then math.abs(heading:Cross(direction.Unit).Y) else 0
			local aligned = broadside > 0.5
			local sideCross = if dd > 0.1 then heading:Cross(direction.Unit).Y else 0
			local gunSide = if sideCross < 0 then "우현" else "좌현"
			local aimAngle = if dd > 0.1 then math.deg(math.acos(math.clamp(heading:Dot(direction.Unit), -1, 1))) else 0
			local sideDeviation = math.floor(math.abs(90 - aimAngle) + 0.5) -- [실제 포각] 선측 정면 90°, 양옆 60° 이내가 포격 가능
			-- [조향 가이드] 실제 명중 판정을 바꾸지 않고 가장 가까운 좌/우 선측 90° 위치만 안내한다.
			local enemyBearing = if dd > 0.1 then math.atan2(direction.Z, direction.X) else me.theta
			local turnLeft = (enemyBearing + math.pi / 2 - me.theta + math.pi) % (math.pi * 2) - math.pi
			local turnRight = (enemyBearing - math.pi / 2 - me.theta + math.pi) % (math.pi * 2) - math.pi
			local turnNeeded = if math.abs(turnRight) < math.abs(turnLeft) then turnRight else turnLeft
			local steerCue = (if turnNeeded >= 0 then "우로 " else "좌로 ") .. tostring(math.floor(math.abs(math.deg(turnNeeded)) + 0.5)) .. "°"
			local color = if not inRange then Color3.fromRGB(255, 205, 130) elseif aligned then Color3.fromRGB(124, 236, 161) else Color3.fromRGB(255, 178, 100)
			local tau = math.pi * 2
			local scanAngle = (now * 2.45) % tau -- [탐지광] 약 2.6초/회전, 조각 잔광은 점진적으로 감쇠
			local cd = cannon.cd * (if now < skillUntil.rapid then 0.4 else 1)
			local reloadProgress = if opts.card or not inRange then 0 else 1 - math.clamp((nextMeFire - now) / math.max(0.1, cd), 0, 1)
			local firing = now < rangeRing.volleyUntil
			local hitFoe = now < rangeRing.impactUntil
			local hitMe = now < rangeRing.hitUntil
			rangeRing.fade = math.clamp(rangeRing.fade + (if phase == "duel" then dt * 3.5 else -dt * 3.5), 0, 1)
			local enemyAngle = if dd > 0.1 then math.atan2(direction.Z, direction.X) else 0
			for i, seg in rangeRing.segments do
				local angle = (i - 1) * tau / #rangeRing.segments
				local radial = Vector3.new(math.cos(angle), 0, math.sin(angle))
				local tangent = Vector3.new(-radial.Z, 0, radial.X)
				local at = ORIGIN + me.pos + radial * cannon.range + Vector3.new(0, 0.2, 0)
				seg.CFrame = CFrame.lookAt(at, at + tangent)
				-- 좌·우 선측: 실제 조준 기준인 교차곱 0.5 이상인 방향만 두껍고 밝게.
				local sideArc = math.abs(heading:Cross(radial).Y) > 0.5
				local charged = ((angle - me.theta + tau) % tau) / tau <= reloadProgress
				local trailAngle = (scanAngle - angle + tau) % tau
				local trail = if trailAngle < 1.45 then (1 - trailAngle / 1.45) ^ 1.25 else 0 -- [잔광] 좁은 원주 잔상, 뒤쪽만 남는다
				local enemyGap = math.abs((angle - enemyAngle + math.pi) % tau - math.pi)
				local onEnemy = enemyGap < math.pi / #rangeRing.segments * 1.3
				local tint = if sideArc then (if inRange and aligned then Color3.fromRGB(100, 216, 158) else Color3.fromRGB(230, 178, 104))
					else Color3.fromRGB(94, 127, 138)
				local alpha = if sideArc then (if charged then 0.43 else 0.66) else 0.84
				if trail > 0 then
					tint = tint:Lerp(Color3.fromRGB(150, 247, 220), trail)
					alpha = math.min(alpha, 0.83 - 0.63 * trail)
				end
				if onEnemy then
					local pulse = 0.5 + 0.5 * math.sin(now * 6)
					tint = if inRange and aligned then Color3.fromRGB(114, 255, 177) else Color3.fromRGB(255, 155, 115)
					alpha = math.min(alpha, 0.3 - pulse * 0.19)
				end
				if now < skillUntil.guard and sideArc then
					tint, alpha = Color3.fromRGB(120, 220, 255), 0.12
				elseif now < skillUntil.dash and sideArc then
					tint, alpha = Color3.fromRGB(255, 190, 116), 0.22
				elseif now < skillUntil.rapid and sideArc then
					tint, alpha = Color3.fromRGB(255, 220, 116), 0.13
				elseif firing and sideArc then
					tint, alpha = Color3.fromRGB(255, 231, 136), 0.06
				elseif hitFoe and onEnemy then
					tint, alpha = Color3.fromRGB(255, 243, 192), 0.02
				elseif hitMe then
					tint, alpha = Color3.fromRGB(255, 119, 100), math.min(alpha, 0.34)
				end
				seg.Color = tint
				seg.Transparency = if opts.cardOnly then 1 else 1 - rangeRing.fade * (1 - alpha)
			end
			-- [회전 탐색광] 새 물체를 만들지 않고 기존 선박 메시·원주 Attachment 위치만 이동.
			if rangeRing.radar then
				local radar = rangeRing.radar
				local center = ORIGIN + me.pos + Vector3.new(0, 0.3, 0)
				local rim = center + Vector3.new(math.cos(scanAngle), 0, math.sin(scanAngle)) * cannon.range
				radar.origin.Position = radar.hull.CFrame:PointToObjectSpace(center)
				radar.edge.Position = rangeRing.segments[1].CFrame:PointToObjectSpace(rim)
				radar.beam.Enabled = not opts.cardOnly and rangeRing.fade > 0.08 and phase == "duel"
				radar.beam.Color = ColorSequence.new(Color3.fromRGB(135, 223, 210),
					if inRange and aligned then Color3.fromRGB(120, 255, 170) else Color3.fromRGB(255, 211, 136))
			end
			rangeLabel.Text = if battleViewport.X < 480 then
				string.format("포각 %s %d° · %s", gunSide, math.floor(aimAngle + 0.5),
					if not inRange then "거리 밖" elseif aligned then "발사 가능" else steerCue)
				else string.format("%s %dm/%dm · %s %d° · %s", cannon.name, math.floor(dd), cannon.range,
					gunSide, math.floor(aimAngle + 0.5),
					if not inRange then "거리 밖" elseif aligned then "발사 가능" else steerCue)
			rangeLabel.TextColor3 = color
			-- [전술 단계] 실제 사거리와 기존 시각용 장전 쿨타임만 표시한다.
			local status, tip, tone
			if phase == "board" then
				status, tip, tone = "④ 접현 백병전", "선체 내구도와 승조원 피해를 확인해.", Color3.fromRGB(255, 174, 123)
			elseif phase == "end" then
				status, tip, tone = "전투 종료", "확정된 결과를 확인해.", Color3.fromRGB(248, 220, 163)
			elseif now < skillUntil[SKILLS[2].id] then
				local sk = SKILLS[2]
				status = "특화 발동 · " .. sk.text
				tip = (sk.cue or "전투 기술") .. " · 효과 발동 중"
				tone = sk.col
			elseif not inRange then
				status, tip, tone = "① 적선 접근", string.format("포 사거리까지 %d m · 바람과 조타를 확인해.", math.ceil(dd - cannon.range)), Color3.fromRGB(255, 205, 130)
			elseif not aligned then
				status, tip, tone = "② 선측 정렬 · 포각 확인",
					string.format("%s %d° · 편차 %d° · %s", gunSide, math.floor(aimAngle + 0.5), sideDeviation, steerCue),
					Color3.fromRGB(255, 185, 123)
			elseif now < nextMeFire then
				status, tip, tone = "③ 대포 재장전", string.format("화포 준비 중 · 적선과의 거리 %dm", math.floor(dd)), Color3.fromRGB(242, 212, 138)
			else
				status, tip, tone = "③ 포격 준비", string.format("적선 %dm · 사거리 %dm · 자동 포격 대기", math.floor(dd), cannon.range), Color3.fromRGB(130, 237, 172)
			end
			local messageText = if battleViewport.X < 480 then status .. "\n" ..
				(if not inRange then "대포 사거리 밖" elseif not aligned then steerCue .. " 돌려"
					elseif now < nextMeFire then "장전 중" else "측면 포격 가능")
				else status .. "\n" .. tip -- [상단 가독성] 세로 폰에서 정보가 잘리지 않게 두 줄 압축
			if messageText ~= lastTacticText then
				tactic.Text, lastTacticText = messageText, messageText
			end
			if tone ~= lastTacticColor then
				tactic.TextColor3, tacticStroke.Color = tone, tone
				lastTacticColor = tone
			end
			local aim = phase == "duel" and not opts.card and dd < cannon.range * 1.25
			local a0 = ORIGIN + me.pos + Vector3.new(0, 8, 0)
			local a1 = ORIGIN + foe.pos + Vector3.new(0, 6, 0)
			for i, dot in trajDots do
				if aim then
					local u = i / (#trajDots + 1)
					dot.CFrame = CFrame.new(a0:Lerp(a1, u) + Vector3.new(0, math.sin(u * math.pi) * cannon.arc, 0))
					dot.Transparency = if not aligned then 0.88 elseif inRange then 0.3 else 0.78
					dot.Color = if inRange and aligned then Color3.fromRGB(130, 235, 150) else Color3.fromRGB(255, 166, 106)
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
		-- [아군 함대 포말] 기함과 동일한 물살/선수 물보라를 호출하고 모바일은 교대로 경량화한다.
		for i, al in allies do
			if not MOBILE_VFX or (i + math.floor(now * 3)) % 2 == 0 then
				FX.wake(al, "a" .. i, now)
			end
		end
		FX.damage(me, "me", now)
		FX.damage(foe, "foe", now)
		meFill.Size = UDim2.fromScale(meHp, 1)
		foeFill.Size = UDim2.fromScale(foeHp, 1)
		if not opts.cardOnly then
			local dv = (foe.pos - me.pos).Magnitude
			local inRange = dv < cannon.range
			distLabel.Text = string.format("적선 %d m · %s", math.floor(dv), if inRange then "사정거리 안 — 포격 중" elseif dv < cannon.range * 1.4 then "조금만 더 접근!" else "사정거리 밖")
			distLabel.TextColor3 = if inRange then Color3.fromRGB(130, 235, 150) elseif dv < cannon.range * 1.4 then Color3.fromRGB(255, 226, 120) else Color3.fromRGB(255, 255, 255)
			local cdNow = cannon.cd * (if now < skillUntil.rapid then 0.4 else 1)
			local prog = if opts.card or not inRange then 0 else 1 - math.clamp((nextMeFire - now) / math.max(0.1, cdNow), 0, 1)
			reloadFill.Size = UDim2.fromScale(prog, 1)
			reloadFill.BackgroundColor3 = if now < skillUntil.rapid then Color3.fromRGB(255, 120, 70) elseif prog >= 1 then Color3.fromRGB(130, 235, 150) else Color3.fromRGB(240, 180, 80)
			reloadText.Text = if not inRange then "포 — 사거리 밖"
				elseif prog >= 1 then "포 발사 준비!"
				else "포 장전 중"
			local v = cam:WorldToViewportPoint(ORIGIN + foe.pos)
			local vp = cam.ViewportSize
			local onScr = v.Z > 0 and v.X > 40 and v.X < vp.X - 40 and v.Y > 90 and v.Y < vp.Y - 90
			foeArrow.Visible, foeArrowTag.Visible = not onScr, not onScr
			if not onScr then
				local c0 = vp / 2
				local dir = Vector2.new(v.X, v.Y) - c0
				if v.Z < 0 then
					dir = -dir
				end
				if dir.Magnitude < 1 then
					dir = Vector2.new(1, 0)
				end
				dir = dir.Unit
				local kx = if math.abs(dir.X) > 1e-3 then (vp.X / 2 - 60) / math.abs(dir.X) else math.huge
				local ky = if math.abs(dir.Y) > 1e-3 then (vp.Y / 2 - 120) / math.abs(dir.Y) else math.huge
				local pt = c0 + dir * math.min(kx, ky)
				local inset = game:GetService("GuiService"):GetGuiInset()
				foeArrow.Position = UDim2.fromOffset(pt.X - inset.X, pt.Y - inset.Y)
				foeArrow.Rotation = math.deg(math.atan2(dir.Y, dir.X))
				foeArrowTag.Position = UDim2.fromOffset(pt.X - inset.X - dir.X * 34, pt.Y - inset.Y - dir.Y * 28)
				foeArrowTag.Text = string.format("적선 %dm", math.floor(dv))
			end
		end
		if rt then
			mePct.Text = string.format("%d / %d", math.ceil(meHp * rt.meMax), rt.meMax)
			foePct.Text = string.format("%d / %d", math.ceil(foeHp * rt.foeMax), rt.foeMax)
		else
			mePct.Text = string.format("%d%%", math.ceil(meHp * 100))
			foePct.Text = string.format("%d%%", math.ceil(foeHp * 100))
		end
		meFill.BackgroundColor3 = if meHp < 0.3 then Color3.fromRGB(214, 82, 76) elseif meHp < 0.6 then Color3.fromRGB(226, 178, 80) else Color3.fromRGB(91, 181, 120)
		-- [선체 숫자 선명도] 버프 문구 때문에 폰트가 10px까지 줄던 문제를 막는다.
		-- 선체 체력은 항상 14px로, 기존 활성 스킬 시간은 아래 3px 상태 막대로만 표현한다.
		buffFill.Visible = false
		mePct.TextSize = 14
		for _, sk in SKILLS do
			local remaining = math.max(0, skillUntil[sk.id] - now)
			if remaining > 0 and sk.id ~= "fire" then
				buffFill.BackgroundColor3 = sk.col
				buffFill.Size = UDim2.new(math.clamp(remaining / sk.dur, 0, 1), 0, 0, 3)
				buffFill.Visible = true
				break
			end
		end
		for _, sk in SKILLS do
			local b = skillBtn[sk.id]
			local left = skillReady[sk.id] - now
			local active = now < skillUntil[sk.id]
			local ready = left <= 0
			local ratio = math.clamp(left / math.max(sk.cd, 0.1), 0, 1)
			local shade = b:FindFirstChild("NavalCooldownShade")
			if shade then
				shade.Visible = not ready
				shade.BackgroundTransparency = 0.22 + (1 - ratio) * 0.70
			end
			-- [한글 선명도] 초 숫자·그림자 제거. 아이콘은 어두운 상태에서 점점 원래 색으로 복귀한다.
			b.Text = sk.text
			b.BackgroundColor3 = sk.col:Lerp(Color3.fromRGB(49, 59, 75), ratio)
			local art = b:FindFirstChild("NavalButtonArtwork")
			if art and art:IsA("ImageLabel") then
				art.ImageTransparency = if ready then 0 else ratio * 0.28
				art.ImageColor3 = Color3.fromRGB(255, 255, 255):Lerp(Color3.fromRGB(84, 96, 110), ratio)
				local caption = b:FindFirstChild("NavalButtonCaption")
				if caption and caption:IsA("TextLabel") then
					caption.Text = sk.text
					caption.TextStrokeTransparency = 1
				end
			end
			if not ready then
				if not b:GetAttribute("NavalWasCooling") then b:SetAttribute("NavalWasCooling", true) end
			elseif b:GetAttribute("NavalWasCooling") then
				b:SetAttribute("NavalWasCooling", false)
				b:SetAttribute("NavalReadyPulseUntil", now + 0.55)
                local readyScale = b:FindFirstChild("NavalReadyScale")
                if readyScale and readyScale:IsA("UIScale") then
                    readyScale.Scale = 1.12
                    game:GetService("TweenService"):Create(readyScale, TweenInfo.new(0.42, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
                end
			end
			b.Interactable = ready and phase == "duel" and not opts.cardOnly and not opts.card
			b.Active = b.Interactable
			b.AutoButtonColor = b.Interactable
			local rim = b:FindFirstChildOfClass("UIStroke")
			if rim then
				local pulse = math.clamp(((b:GetAttribute("NavalReadyPulseUntil") or 0) - now) / 0.55, 0, 1)
				local baseColor = if active then Color3.fromRGB(255, 234, 148)
					elseif ready then Color3.fromRGB(190, 244, 198) else Color3.fromRGB(96, 108, 123)
				rim.Color = baseColor:Lerp(Color3.fromRGB(255, 248, 164), pulse)
                rim.Thickness = 2.2 + 2.6 * pulse
                if art and art:IsA("ImageLabel") and pulse > 0 then
                    art.ImageColor3 = art.ImageColor3:Lerp(Color3.fromRGB(255, 232, 143), pulse * 0.9)
                end
				rim.Transparency = if ready or active then 0.06 else 0.28
			end
		end
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

		-- [접현 시네마] 포격 중에는 2척을 넓게, 백병전 중에는 갑판 높이로 부드럽게 줌인한다.
		-- 카드판과 침몰 연출은 종전 카메라 흐름을 유지한다. 화면 효과로만 쓰인다.
		shake = math.max(0, shake - 0.06)
		local killZoom = if sinkStart then -math.clamp((now - sinkStart) / 1.4, 0, 1) * 8 else 0
		kick = kick * 0.86
		local boardingView = phase == "board" and not cardBusy and not opts.cardOnly and not (rt and rt.sunk) and not sinkStart
		FX.boardZoom += ((if boardingView then 1 else 0) - FX.boardZoom) * (1 - math.exp(-dt * 4.2))
		cam.FieldOfView = (if MOBILE_VFX then 73 else 75) - kick * 0.6 + math.min(shake, 2.5) * 2 + (me.speed / myTop) * 5 + killZoom - FX.boardZoom * (17 + math.clamp(me.fx.stage or 2, 1, 6) * 0.6)
		local f = forward(me.theta)
		local sep = (foe.pos - me.pos)
		local dist = sep.Magnitude
		local focus = ORIGIN + me.pos + sep * 0.5 + Vector3.new(0, 4, 0)
		-- [선체 가독성] 선박 외형이 너무 작게 보이지 않게 카메라만 약간 가까이 이동한다.
		local camPos = ORIGIN + me.pos - f * ((if MOBILE_VFX then 147 else 160) + dist * (if MOBILE_VFX then 0.46 else 0.51))
			+ Vector3.new(0, math.min(78, 65 + dist * 0.11), 0)
		if cardBusy then
			local mid = (me.pos + foe.pos) / 2
			local dir = foe.pos - me.pos
			local perp = Vector3.new(-dir.Z, 0, dir.X)
			perp = if perp.Magnitude > 0.1 then perp.Unit else Vector3.new(0, 0, 1)
			focus = ORIGIN + mid + Vector3.new(0, 2, 0)
			camPos = ORIGIN + mid + perp * 112 + Vector3.new(0, 40, 0)
		elseif FX.boardZoom > 0.01 then
			local mid = (me.pos + foe.pos) / 2
			local dir = foe.pos - me.pos
			local perp = Vector3.new(-dir.Z, 0, dir.X)
			perp = if perp.Magnitude > 0.1 then perp.Unit else Vector3.new(0, 0, 1)
			local closePos = ORIGIN + mid + perp * (if MOBILE_VFX then 69 else 58) + Vector3.new(0, if MOBILE_VFX then 28 else 23, 0)
			local closeFocus = ORIGIN + mid + Vector3.new(0, 7, 0)
			camPos = camPos:Lerp(closePos, FX.boardZoom)
			focus = focus:Lerp(closeFocus, FX.boardZoom)
		end
		if phase == "end" and not opts.cardOnly and endAt then
			-- [종전 시네마] 초반에는 침몰 함선, 후반에는 승리한 함대를 낮은 각도로 보여 준다.
			-- 항복·접현 승리는 침몰을 연출하지 않고 두 함선을 보여 준다.
			local damaged = if loser == "me" then me else foe
			local winnerShip = if opts.winner == "a" then me elseif opts.winner == "b" then foe else me
			-- [침몰 시네마] 배가 수면 밑으로 사라질 때까지 선체를 따라 내려보고 이후 승전함으로 전환한다.
			local sinkingTime = if FX.sink then math.clamp((now - endAt) / FX.sink.duration, 0, 1) else 0
			local showingSinking = FX.sink and sinkingTime < 0.91
			local focusShip = if showingSinking then damaged else winnerShip
			local shot = ORIGIN + focusShip.pos + Vector3.new(0,
				if showingSinking then math.max(1, 7 - sinkingTime * 5) else 9, 0)
			local retreat = forward(focusShip.theta)
			local desired = shot - retreat * (if showingSinking then 95 - sinkingTime * 12 else 110)
				+ Vector3.new(35, if showingSinking then 27 - sinkingTime * 8 else 36, 22)
			focus = focus:Lerp(shot, 0.92)
			camPos = camPos:Lerp(desired, if MOBILE_VFX then 0.78 else 0.91)
			cam.FieldOfView = 66 - (if showingSinking then 7 else 3) * math.clamp((now - endAt) / 1.5, 0, 1)
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
