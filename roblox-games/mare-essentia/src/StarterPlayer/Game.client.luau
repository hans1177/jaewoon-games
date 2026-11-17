--!nonstrict
-- 파일명: roblox-games/mare-essentia/src/StarterPlayer/Game.client.luau
-- 클라이언트 UI: 서버(GameAction)가 보내 준 스냅샷(view)을 표시하고 요청만 보낸다.
-- 판정은 모두 서버가 하므로 여기서는 값을 계산해 믿지 않는다.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
-- 캐릭터와 로딩 표시는 모듈·서버 대기보다 먼저 준비한다.
local overview = true -- 항구 전경(고정 시점) / 걷기 전환
local sceneSpawn = nil
local H: { [string]: any } = {} -- 화면 보조 상태는 사용 전 먼저 준비한다. 제목/아이콘 런타임 오류 방지.
local gui = Instance.new("ScreenGui")
gui.Name = "MareEssentiaGui"
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

-- [시작 화면] 서버 상태를 받는 동안 공중 캐릭터와 빈 하늘이 노출되지 않도록 UI를 즉시 덮는다.
-- 월드/저장 데이터는 손대지 않고 서버 응답 직후 기존 시작 메뉴로 넘긴다.
H.startupCover = Instance.new("Frame")
H.startupCover.Name = "StartLoading"
H.startupCover.Size = UDim2.fromScale(1, 1)
H.startupCover.BackgroundColor3 = Color3.fromRGB(54, 40, 28)
H.startupCover.BorderSizePixel = 0
H.startupCover.ZIndex = 200
H.startupCover.Parent = gui
H.startupLabel = Instance.new("TextLabel")
H.startupLabel.Name = "LoadingMessage"
H.startupLabel.AnchorPoint = Vector2.new(0.5, 0.5)
H.startupLabel.Position = UDim2.fromScale(0.5, 0.5)
H.startupLabel.Size = UDim2.fromScale(0.88, 0.2)
H.startupLabel.BackgroundTransparency = 1
H.startupLabel.Text = "학문의 바다\n항구와 항해 기록을 불러오는 중..."
H.startupLabel.Font = Enum.Font.Antique
H.startupLabel.TextColor3 = Color3.fromRGB(242, 216, 171)
H.startupLabel.TextScaled = true
H.startupLabel.TextWrapped = true
H.startupLabel.ZIndex = 201
H.startupLabel.Parent = H.startupCover
do
	local size = Instance.new("UITextSizeConstraint")
	size.MaxTextSize = 27
	size.MinTextSize = 13
	size.Parent = H.startupLabel
end

-- [캐릭터 스폰] 항구가 클라이언트에 만들어지기 전에는 바닥이 없으므로 추락을 막는다.
-- 실제 걸어 다니는 시점에는 아래 applyView에서 고정을 해제한다.
function H.placeCharacterOnSpawn(character)
	local root = character:WaitForChild("HumanoidRootPart", 10)
	if not root then return end
	if sceneSpawn and not overview then
		character:PivotTo(sceneSpawn)
		root.Anchored = false
	else
		root.Anchored = true
	end
end
player.CharacterAdded:Connect(H.placeCharacterOnSpawn)
if player.Character then
	task.defer(H.placeCharacterOnSpawn, player.Character)
end


local Shared = ReplicatedStorage:WaitForChild("Shared")
local CommonUI = require(Shared:WaitForChild("Common"):WaitForChild("RobloxCommonUI"))
local PortData = require(Shared:WaitForChild("Ports"))
local ShipsData = require(Shared:WaitForChild("Ships"))
local PortEras = require(Shared:WaitForChild("PortEras"))
local Geo = require(Shared:WaitForChild("Geo"))
local SeaRoutes = require(Shared:WaitForChild("SeaRoutes"))
local PortScene = require(Shared:WaitForChild("PortScene"))
local VoyageScene = require(Shared:WaitForChild("VoyageScene"))
local FieldScene = require(Shared:WaitForChild("FieldScene"))
local Weapons = require(Shared:WaitForChild("Weapons"))
local Pose = require(Shared:WaitForChild("Pose"))
local Sfx = require(Shared:WaitForChild("Sfx"))
local audioLock = false -- 해전·항해 중에는 장면이 음악을 정한다
local NavalBattle = require(Shared:WaitForChild("NavalBattle"))
local AssetIds = require(Shared:WaitForChild("AssetIds"))
local remote = ReplicatedStorage:WaitForChild("GameAction")
local DEBUG_LOG = true -- 개발 중에는 서버 응답을 출력창에 남긴다 (출시 전에 false)

-- 기본 채팅창이 게임 창 위 탭을 가려서 끈다 (이 게임은 채팅이 필요 없다)
task.spawn(function()
	-- 시작 직후에는 코어 UI가 아직 준비되지 않아 한 번에 실패할 수 있어서 여러 번 시도하고, 남은 기본 채팅창은 지운다.
	for _ = 1, 20 do
		pcall(function()
			game:GetService("StarterGui"):SetCoreGuiEnabled(Enum.CoreGuiType.Chat, false)
		end)
		-- 새 채팅(TextChatService)의 창·입력줄이 왼쪽 위에 회색 테두리로 남는 것도 끈다
		pcall(function()
			local tcs = game:GetService("TextChatService")
			local win = tcs:FindFirstChildOfClass("ChatWindowConfiguration")
			if win then win.Enabled = false end
			local bar = tcs:FindFirstChildOfClass("ChatInputBarConfiguration")
			if bar then bar.Enabled = false end
		end)
		local legacyChat = player:FindFirstChild("PlayerGui") and player.PlayerGui:FindFirstChild("Chat")
		if legacyChat then
			legacyChat:Destroy()
		end
		task.wait(0.5)
	end
end)
pcall(function()
	local tcs = game:GetService("TextChatService")
	tcs.ChatWindowConfiguration.Enabled = false
	tcs.ChatInputBarConfiguration.Enabled = false
end)

-- 백과사전 공통 표지와 본문 색
-- [고서적 UI] 표지=낡은 가죽, 내지=미색 양피지, 버튼=색을 아끼는 황동·잉크 인쇄.
-- 메뉴·상점·전투·지도는 기존 사건/입력 흐름을 그대로 두고 색상만 통일한다.
local COLORS = {
	cover = Color3.fromRGB(42, 32, 25),
	coverRaised = Color3.fromRGB(74, 53, 39),
	leather = Color3.fromRGB(66, 44, 31),
	paper = Color3.fromRGB(225, 202, 159),
	ink = Color3.fromRGB(49, 35, 23),
	brown = Color3.fromRGB(103, 69, 42),
	text = Color3.fromRGB(244, 226, 190),
	muted = Color3.fromRGB(191, 165, 121),
	row = Color3.fromRGB(60, 44, 32),
	blue = Color3.fromRGB(64, 80, 78),
	green = Color3.fromRGB(71, 99, 75),
	red = Color3.fromRGB(137, 58, 44),
	gold = Color3.fromRGB(207, 159, 77),
	grey = Color3.fromRGB(108, 88, 65),
	steam = Color3.fromRGB(150, 110, 70),
}
-- 양피지·잉크 테마: 가죽 책상 위에 놓인 양피지 줄, 잉크 글씨, 밀랍 인장
local PARCHMENT_TOP, PARCHMENT_BOTTOM = Color3.fromRGB(241, 224, 185), Color3.fromRGB(201, 169, 119)
local INK, INK_SOFT, INK_EDGE = Color3.fromRGB(52, 36, 24), Color3.fromRGB(108, 82, 56), Color3.fromRGB(96, 68, 40)
local WAX = Color3.fromRGB(150, 44, 38)
local UI_BRASS = Color3.fromRGB(205, 160, 76)
local UI_BRASS_DARK = Color3.fromRGB(111, 76, 39)

local AMOUNTS = { 1, 5, 10 }
local TABS = {
	{ id = "board", name = "의뢰 받기" },
	{ id = "quest", name = "진행 일지" },
	{ id = "route", name = "항해" },
	{ id = "trade", name = "교역" },
	{ id = "status", name = "현황" },
	{ id = "harbor", name = "항구 정보" },
	{ id = "crew", name = "동료 관리" },
	{ id = "recruit", name = "동료 영입" },
	{ id = "scholar", name = "지식 보고" },
	{ id = "yard", name = "조선소" },
	{ id = "codex", name = "지식 백과" },
	{ id = "tech", name = "연구" },
	{ id = "map", name = "지도" },
	{ id = "explore", name = "지상 탐험" },
	{ id = "battle", name = "해적 사냥" },
	{ id = "gwent", name = "카드 대결" },
	{ id = "war", name = "함대전" },
}

-- 시설별 창: 건물에 들어가면 그 시설의 탭만 열린다
local GROUPS = {
	{ name = "교역소", keeper = "상인 길드", tabs = { "trade", "harbor" } },
	{ name = "항만청", keeper = "항만 관리관", tabs = { "route", "map" } },
	{ name = "조선소", keeper = "조선 장인", tabs = { "yard" } },
	{ name = "주점", keeper = "주점 주인", tabs = { "board", "quest", "recruit" } }, -- 주점: 의뢰·동료
	{ name = "전투 본부", keeper = "전투 교관", tabs = { "battle", "explore", "war", "gwent" } }, -- 전투·지상 탐험·함대전·카드 배틀
	{ name = "학자의 서재", keeper = "학자", tabs = { "scholar", "codex", "tech" } },
	{ name = "선장실", keeper = "선장", tabs = { "status", "crew" } },
}
local function groupOf(tabId)
	for _, g in GROUPS do
		if table.find(g.tabs, tabId) then
			return g
		end
	end
	return GROUPS[1]
end
local TAB_NAME = {}
for _, t in TABS do
	TAB_NAME[t.id] = t.name
end

-- [전체 메뉴 리뉴얼] 기존 시설 동작은 유지하고 메뉴마다 목적·순서를 짧게 표시한다.
H.MENU_FOCUS = {
	trade = { "교역 장부", "시세 비교 → 수량 선택 → 매입·판매" , "교역 장부 열기" },
	harbor = { "항구 정보", "특산품·수요 → 시장·시설 → 발전 현황" , "항구 살펴보기" },
	route = { "항로 선택", "거리·위험 → 보급 확인 → 출항" , "항로 살펴보기" },
	map = { "세계 지도", "목적지 탐색 → 항구 정보 → 항로 연결" , "지도 살펴보기" },
	yard = { "선박 관리", "선체·보급 → 선단·대포 → 새 배 비교" , "새 배 비교" },
	board = { "주점 의뢰", "의뢰 조건 → 위험·보상 → 수락·납품" , "의뢰 살펴보기" },
	quest = { "진행 일지", "현재 목표 → 달성 조건 → 보상 받기" , "진행 목표 보기" },
	recruit = { "동료 영입", "직업·특기 → 영입 조건 → 선원 배치" , "동료 비교하기" },
	crew = { "동료 관리", "동료 능력 → 직책 배치 → 승조 효과" , "직책 살펴보기" },
	status = { "선장 현황", "선체·화물 → 명성·직업 → 다음 목표" , "상태 살펴보기" },
	battle = { "전투 준비", "적 위험 → 선체·대포 → 해적 사냥" , "전투 준비 보기" },
	explore = { "지상 탐험", "지역 위험 → 탐험 준비 → 지식 발견" , "탐험 준비 보기" },
	war = { "함대 지휘", "보유 함선 → 진형·전술 → 해전" , "함대 살펴보기" },
	gwent = { "카드 대결", "덱 구성 → 병종 배치 → 카드 대결" , "덱 살펴보기" },
	scholar = { "학자와 보고", "새 발견 → 학자에게 보고 → 이해한 지식" , "발견 보고 보기" },
	codex = { "지식 백과", "분야 선택 → 발견물 확인 → 미수집 목표" , "도감 살펴보기" },
	tech = { "기술 연구", "연구 조건 → 이해한 지식 → 기술 해금" , "연구 살펴보기" },
}

-- [교역 시세 통합] 화살표는 일별 등락이 아닌 현재 세계 항구 평균 대비 가격이다.
function H.marketPriceSignal(g)
	local average = tonumber(g.avgPrice) or tonumber(g.basePrice) or 0
	local buying = tonumber(g.buyTotals and g.buyTotals[1]) or tonumber(g.buy) or 0
	if average <= 0 then return "➖", 0, "key" end
	local delta = (buying / average - 1) * 100
	if delta < -0.5 then return "⬇️", delta, "good" end
	if delta > 0.5 then return "⬆️", delta, "key" end
	return "➖", delta, "key"
end

-- [실제 예상 손익] 보유분 평균 매입가와 관세가 반영된 서버 판매 견적만 비교한다.
function H.tradeProfit(g, qty)
	if (tonumber(g.owned) or 0) <= 0 or (tonumber(g.basis) or 0) <= 0 or (tonumber(qty) or 1) < 1 then return nil end
	local amount = math.min(math.max(1, qty or 1), g.owned)
	local net = g.sellTotals and g.sellTotals[amount]
	if not net then return nil end
	return math.floor(net - g.basis * amount + 0.5)
end

local view = nil -- 서버가 보낸 최신 스냅샷
local currentTab = "status"
local syncScene
local openTab
local applyView
local inField = false -- 필드 탐험 장면 중에는 항구 전경 카메라를 멈춘다
local assetWaitStarted = false
local sceneKey = nil
local sceneCtl = nil -- 현재 3D 장면의 제어(출항 연출 등)
local sceneHold = false -- 항해 중에는 장면을 바꾸지 않는다
local sailingNow = false -- 출항 중 중복 클릭 방지
local departureEventPhase = false -- 출항 직전 지역·역사 이벤트만 재생 허용
local arriveNext = false -- 다음 장면은 입항 연출로 시작
local amountIndex = 1
local message = ""
local messageOk = true
local ranking = nil
local mailBox, marketList = nil, nil
local mailDraft = { to = "", coins = "", text = "" }
local postPrice = {}
local busy = false
local equipped = nil -- 자동스킬 편집 중인 목록
local chosenNation = "england"
local chosenYear = 1517
local newGameMode = false -- 저장된 게임이 있어도 새로 시작하는 선택 화면을 보여 준다

-- 전체 화면 장면(항해 연출, 이야기, 카드 상세)은 별도 ScreenGui에 띄운다.
-- 같은 화면에 두면 ZIndex 규칙 때문에 장면의 그림이 배경 뒤로 숨는 문제가 있었다.
local function overlayGui(name, order)
	local g = Instance.new("ScreenGui")
	g.Name = name
	g.ResetOnSpawn = false
	g.IgnoreGuiInset = true
	g.DisplayOrder = order
	g.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	g.Parent = player:WaitForChild("PlayerGui")
	return g
end

-- UI 도우미 ---------------------------------------------------------------

local function corner(obj, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = obj
end

-- 모든 시설 창 공통: 숫자+단위는 진한 호박색, 잠김/부족은 붉은색, 이득은 초록색으로 강조한다.
local RICH_UNITS = { "코인", "척", "명", "일", "개", "단계", "km", "점", "%" }
function H.rich(text: string): string
	local t = text:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;")
	for _, u in RICH_UNITS do
		local up = u:gsub("%%", "%%%%")
		t = t:gsub("([%+%-]?%d[%d,%.]*)" .. up, '<font color="#9a4f0a"><b>%1' .. up .. "</b></font>")
	end
	t = t:gsub("(🔒[^\n]*)", '<font color="#a62a1f">%1</font>')
	t = t:gsub("(장착중)", '<font color="#2f7a3a"><b>%1</b></font>')
	return t
end
H.richParent = nil -- 시설 창 본문(content)이 만들어지면 지정된다

local UI_MIN_TEXT = 14
local function mkLabel(parent, text, size, color, bold, order)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(1, -8, 0, 0)
	l.AutomaticSize = Enum.AutomaticSize.Y
	l.Text = text
	l.TextWrapped = true
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.TextYAlignment = Enum.TextYAlignment.Top
	l.TextSize = math.max(size or 14, UI_MIN_TEXT) -- 메뉴 전체에서 이보다 작은 글씨는 쓰지 않는다 (통일·가독성)
	l.TextColor3 = color or COLORS.text
	l.Font = if bold then Enum.Font.Antique else Enum.Font.Gotham
	if order then
		l.LayoutOrder = order
	end
	l.Parent = parent
	if H.richParent and (parent == H.richParent or (parent.Name == "RowText" and parent.Parent and parent.Parent.Parent == H.richParent)) and not bold then
		l.RichText = true
		l.Text = H.rich(text)
	end
	return l
end

-- [양피지·가죽 원본 재질] 승인된 원화를 바탕으로 화면 요소의 실제 표면에 반복 인쇄한다.
-- 하나의 기존 게임 UI 흐름에서만 사용한다. 미등록 자산은 종전 배경색으로 안전하게 표시한다.
local function bookMaterial(gui, finish, tilePx)
	local key = if finish == "leather" then "Menu/leather_grain" else "Menu/parchment_grain"
	local id = AssetIds[key]
	if not id then return nil end
	local grain = Instance.new("ImageLabel")
	grain.Name = "BookMaterial"
	grain.BackgroundTransparency = 1
	grain.BorderSizePixel = 0
	grain.Image = "rbxassetid://" .. tostring(id)
	grain.ScaleType = Enum.ScaleType.Tile
	grain.TileSize = UDim2.fromOffset(tilePx or 192, tilePx or 192)
	grain.Size = UDim2.fromScale(1, 1)
	grain.ImageTransparency = 0.06
	grain.ZIndex = gui.ZIndex
	grain.Active = false
	grain.Parent = gui
	corner(grain, if finish == "leather" then 8 else 5)
	return grain
end

-- 교역품: 일반 상품은 승인된 전용 원본을 쓴다. 표현 제한 상품만 기존 중립 화물 외형을 사용한다.
local GOOD_ICON = {}
-- [표현 제한] 술 4종은 동일한 승인 나무통 메시의 색상만 변경한다.
-- Roblox 연령/지역 제한 및 표현 검수는 외형 변경만으로 면제되지 않는다.
local RESTRICTED_CARGO_ICON = {
	beer = { "Cargo", "barrel", Color3.fromRGB(174, 115, 48) }, -- 맥주: 황토색
	sake = { "Cargo", "barrel", Color3.fromRGB(196, 181, 150) }, -- 청주: 미색
	wine = { "Cargo", "barrel", Color3.fromRGB(112, 45, 64) }, -- 와인: 자주색
	rum = { "Cargo", "barrel", Color3.fromRGB(96, 56, 39) }, -- 럼주: 진갈색
}
for id in PortData.Goods do
	local neutral = RESTRICTED_CARGO_ICON[id]
	if neutral then
		-- 기존 허가된 메시가 보이지 않으면 제한 품목 전용 이미지 대신 일반 교역 표시를 유지한다.
		GOOD_ICON[id] = if AssetIds[neutral[1] .. "/" .. neutral[2]] then neutral else { "Menu", "trade" }
	else
		GOOD_ICON[id] = { "Goods", id }
	end
end
-- 승인된 그림이 없는 상품 중, 같은 물건의 3D 모델이 있는 것은 그것을 쓴다
for id, spec in {
	gold = { "Cargo", "gold-bar" }, silver = { "Cargo", "silver-bar" }, copper = { "Cargo", "copper-bar" },
	gems = { "Cargo", "gems-sack" }, jade = { "Cargo", "gem-medium", Color3.fromRGB(80, 170, 120) },
	pearl_shell = { "Cargo", "mussel-open" },
	mahogany = { "Cargo", "wood-log-a", Color3.fromRGB(110, 54, 40) }, ebony = { "Cargo", "wood-log-a", Color3.fromRGB(40, 32, 30) },
	kauri = { "Cargo", "wood-log-a", Color3.fromRGB(176, 132, 82) }, logwood = { "Cargo", "wood-log-a", Color3.fromRGB(120, 50, 70) },
	brazilwood = { "Cargo", "wood-log-a", Color3.fromRGB(160, 62, 48) }, sandalwood = { "Cargo", "wood-log-a", Color3.fromRGB(190, 150, 96) },
	sandalwood_hi = { "Cargo", "wood-log-a", Color3.fromRGB(200, 160, 100) },
	palm_oil = { "Cargo", "barrel-open" },
	cocoa = { "Cargo", "chocolate" }, maize = { "Cargo", "corn" },
	-- 가공품: 원료와 같은 계열의 승인된 기존 Cargo 모델을 쓴다 (새 모델·도형 없음)
	p_smelt_iron = { "Cargo", "iron-bar" }, p_smelt_copper = { "Cargo", "copper-bar" }, p_leather = { "Cargo", "leather" },
	p_spice_blend = { "Cargo", "spice" }, p_amber_craft = { "Cargo", "amber" }, p_tea_cure = { "Cargo", "cup-tea" },
	p_fish_cure = { "Cargo", "food-barrel-fish" }, p_glass = { "Cargo", "glass" }, p_gunpowder = { "Cargo", "nitrate" },
	p_fertilizer = { "Cargo", "guano" }, p_marble_carving = { "Cargo", "marble" }, p_resin = { "Cargo", "gum_arabic" },
	p_fine_wood = { "Cargo", "mahogany" }, p_fur_goods = { "Cargo", "fur" }, p_perfume = { "Cargo", "ambergris" },
	p_ivory_carving = { "Cargo", "ivory" }, p_timber_plank = { "Cargo", "wood-plank-a" }, p_cloth_cotton = { "Cargo", "cotton" },
	p_cloth_wool = { "Cargo", "wool" }, p_whale_oil = { "Cargo", "whale_oil" }, p_dye = { "Cargo", "indigo" },
	p_jewelry = { "Cargo", "gem-medium" }, p_olive = { "Cargo", "bottle-oil" }, p_silver_coin = { "Relics", "coin" },
} do
	GOOD_ICON[id] = spec
end
-- 술 가공품도 원료 술과 같은 중립 나무통 표현 (표현 제한 규칙 유지)
for pid, base in { p_beer = "beer", p_wine = "wine", p_sake = "sake", p_sugar_rum = "rum" } do
	local neutral = RESTRICTED_CARGO_ICON[base]
	if neutral and AssetIds[neutral[1] .. "/" .. neutral[2]] then
		GOOD_ICON[pid] = neutral
	end
end
-- [3D 교역품] 승인된 원본 Cargo 메시가 실제 상품과 일치할 때만 상세 아이콘에 재사용한다.
-- 교역품 목록과 상세 화면은 동일한 승인 3D 모델을 사용한다.
for goodsId, cargoAsset in {
	cheese = "cheese", cloth = "textiles-a", coffee = "cup-coffee", fish = "fish",
	glass = "glass", iron = "iron-bars", olive_oil = "bottle-oil", pepper = "pepper-mill",
	salt = "shaker-salt", tea = "cup-tea", timber = "wood-log-stack",
	-- [교역품 3D 확대] 등록된 동일 품목 실물만 추가한다. 새 도형/임의 모델 없음.
	maize = "corn", copper = "copper-bar", silver = "silver-bar", gems = "gems-sack",
} do
	if AssetIds["Cargo/" .. cargoAsset] and AssetIds["Goods/" .. goodsId] then
		GOOD_ICON[goodsId] = { "Cargo", cargoAsset, nil, "Goods/" .. goodsId }
	end
end
-- [교역품 자동 3D 연결] 기존 등록기가 동일 상품 이름으로 만든 전용 Cargo 모델을 인식한다.
-- 체험 권한·원본 검증은 기존 업로더와 서버 AssetLoader가 담당한다. 미등록은 승인 원화 유지.
-- 제한 상품은 위 RESTRICTED_CARGO_ICON의 승인된 중립 화물 표현을 유지한다.
for goodsId in PortData.Goods do
	if not RESTRICTED_CARGO_ICON[goodsId]
		and AssetIds["Cargo/" .. goodsId] and AssetIds["Goods/" .. goodsId] then
		GOOD_ICON[goodsId] = { "Cargo", goodsId, nil, "Goods/" .. goodsId }
	end
end

-- 줄 제목·부제 글자로 알맞은 아이콘을 고른다 (항구·퀘스트·도감 창)
H.TITLE_ICONS = {
	-- 전투 기술: 이름에 맞는 3D 아이콘 (연구 필요 문구의 물약 아이콘으로 떨어지지 않게 먼저 찾는다)
	{ "갈고리", "Naval", "anchor" }, { "맹수", "Animals", "elephant" }, { "울음", "Animals", "cat" }, { "약초", "Cargo", "mortar-pestle" },
	{ "치료", "Cargo", "mortar-pestle" }, { "포격", "Naval", "cannon" }, { "돌격", "Relics", "weapon-sword" }, { "방어", "Relics", "shield-round" },
	{ "왜관", "Castle", "gate" }, { "학자 · 비어", "Interior", "bookcaseclosed" },
	{ "식물", "Cargo", "apple" }, { "동물", "Cargo", "fish-large" }, { "광물", "Relics", "coin" }, { "유물", "Relics", "pot" },
	{ "유적", "Castle", "tower-square-base" }, { "천문", "Relics", "compass-base" }, { "화학", "Relics", "potion" }, { "물리", "Cargo", "parts-cog" },
	{ "지리", "Naval", "ship-small" }, { "철학", "Interior", "bookcaseclosed" }, { "의학", "Cargo", "mortar-pestle" }, { "신화", "Relics", "weapon-sword" },
	{ "항해술", "Naval", "ship-medium" }, { "기상", "Naval", "flag-pennant" }, { "건축", "Town", "house" }, { "예술", "Relics", "shield-round" },
	{ "교역품", "Cargo", "box-open" }, { "조선", "Naval", "ship-large" }, { "언어", "Interior", "bookcaseopenlow" },
}
H.TEXT_ICONS = {
	{ "코인 투자", "Relics", "coin" }, { "예금", "Relics", "coin" }, { "→", "Cargo", "box-open" }, { "면허", "Relics", "shield-round" },
	{ "보험", "Relics", "shield-rectangle" }, { "알현", "Castle", "flag-banner-short" }, { "소문", "Cargo", "mug" },
	{ "납품", "Cargo", "box-open" }, { "해전", "Relics", "weapon-sword" }, { "승리", "Relics", "weapon-sword" }, { "방문", "Naval", "ship-small" },
	{ "연구", "Relics", "potion" }, { "도감 카드", "Relics", "journal-open" }, { "카드", "Relics", "journal-open" }, { "발견", "Relics", "map-rolled" },
	{ "이야기", "Relics", "key" },
}
function H.iconFor(title, subtitle)
	for _, t in H.TITLE_ICONS do
		if string.find(title, t[1], 1, true) then
			return t
		end
	end
	local both = title .. " " .. (subtitle or "")
	for _, t in H.TEXT_ICONS do
		if string.find(both, t[1], 1, true) then
			return t
		end
	end
	return nil
end
local SHIP_ICON = {
	caravel = { "Naval", "ship-small" }, fluyt = { "Naval", "ship-medium" }, frigate = { "Naval", "frigate" },
	galleon = { "Naval", "ship-pirate-large" }, paddle_steamer = { "Naval", "ship-medium", Color3.fromRGB(70, 70, 78) },
	ironclad_frigate = { "Naval", "ship-large", Color3.fromRGB(96, 102, 112) },
}
do
	local ShipsMod = require(Shared:WaitForChild("Ships"))
	for id, def in ShipsMod.Ships do
		if def.visual and SHIP_ICON[def.visual] and not SHIP_ICON[id] then
			local base = SHIP_ICON[def.visual]
			SHIP_ICON[id] = { base[1], base[2], if def.tint then Color3.fromRGB(def.tint[1], def.tint[2], def.tint[3]) else base[3] }
		end
	end
	-- [36척 실제 배색] 등록된 설계 전용 3D 원본으로 모든 조선소 그림을 교체한다.
	-- 기존 공용 범선 그림·색칠 방식은 자산 로딩에 실패할 때만 남긴다.
	local touch = game:GetService("UserInputService").TouchEnabled
	for _, blueprint in ShipsMod.Blueprints do
		local model = blueprint.id .. "-v5"
		local light = blueprint.id .. "-v5-mobile"
		if AssetIds["Naval/" .. model] then
			SHIP_ICON[blueprint.id] = { "Naval", if touch and AssetIds["Naval/" .. light] then light else model }
		end
	end
end

-- 화면에 남아 있는 큰 입체 표본만 최대 10개까지 회전시킨다.
local itemMotion = {}
local itemMotionConn
local function addItemMotion(entry)
	if #itemMotion >= 10 then return end
	entry.phase = (#itemMotion * 1.7) % 6.28
	table.insert(itemMotion, entry)
	if itemMotionConn then return end
	itemMotionConn = game:GetService("RunService").RenderStepped:Connect(function()
		local t = os.clock()
		for i = #itemMotion, 1, -1 do
			local e = itemMotion[i]
			if not e.gui.Parent or not e.gui:IsDescendantOf(game) then
				table.remove(itemMotion, i)
			elseif e.gui.AbsoluteSize.X > 0 then
				local a = t * 0.8 + e.phase
				e.model:PivotTo(CFrame.new(e.center) * CFrame.Angles(0, a, 0) * CFrame.new(-e.center) * e.base)
			end
		end
		if #itemMotion == 0 and itemMotionConn then
			itemMotionConn:Disconnect()
			itemMotionConn = nil
		end
	end)
end

-- 삽화·초상·입체 표본은 같은 백과사전 받침 위에 표시한다.
function H.iconPaper(gui, px)
	gui.BackgroundColor3 = COLORS.paper
	gui.BackgroundTransparency = 0
	gui.BorderSizePixel = 0
	gui.ClipsDescendants = true
	corner(gui, if px < 36 then 4 else 6)
	local wash = Instance.new("UIGradient")
	wash.Color = ColorSequence.new(PARCHMENT_TOP, PARCHMENT_BOTTOM)
	wash.Rotation = 90
	wash.Parent = gui
	if gui:IsA("Frame") then bookMaterial(gui, "parchment", 108) end
	local border = Instance.new("UIStroke")
	border.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	border.Color = INK_EDGE
	border.Thickness = if px < 36 then 1 else 1.4
	border.Transparency = 0.1
	border.Parent = gui
	if px >= 60 then
		local inset = Instance.new("Frame")
		inset.Name = "EngravedMargin"
		inset.Position = UDim2.fromOffset(4, 4)
		inset.Size = UDim2.new(1, -8, 1, -8)
		inset.BackgroundTransparency = 1
		inset.BorderSizePixel = 0
		inset.Parent = gui
		corner(inset, 3)
		local line = Instance.new("UIStroke")
		line.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		line.Color = INK_SOFT
		line.Transparency = 0.52
		line.Parent = inset
	end
end

-- 한 변이 1024px 를 넘는 이미지는 로블록스가 1024 이하로 줄여 쓴다. 칸 좌표도 같은 비율로 줄여야 한다.
-- companions_* 시트: 1280x1344(대부분)는 x0.762, 1280x672(faith_indian_ocean)는 x0.8.
local function sheetK(atlasName: string?): number
	if type(atlasName) ~= "string" or string.sub(atlasName, 1, 11) ~= "companions_" then
		return 1
	end
	if atlasName == "companions_faith_indian_ocean" then
		return 1024 / 1280
	end
	return 1024 / 1344
end
H.sheetK = sheetK

local function modelIcon(parent, kind, asset, tint, px, labelText, smallArt, portraitOffset)
	-- [투명 황동 메뉴 아이콘] 미등록·배경이 있는 그림 대신 같은 팔레트의 작은 도형을
	-- 기존 메뉴 렌더러 안에서 그린다. 클릭·저장·에셋 등록 흐름은 그대로 둔다.
	if kind == "Glyph" then
		local icon = Instance.new("Frame")
		icon.Name = "MenuGlyph_" .. tostring(asset)
		icon:SetAttribute("MenuGlyph", tostring(asset)) -- UI 자동검사가 실제 메뉴 의미를 추적한다.
		icon.Size = UDim2.fromOffset(px, px)
		icon.BackgroundTransparency = 1
		icon.BorderSizePixel = 0
		-- [아이콘 광학 규격] 26px 탭 문양은 원화의 2px 안쪽 여백에 맞춰 축소한다.
		-- 탭은 같은 황동 잉크, HUD는 밝은 무광 황동으로 유지한다.
		local ink = if px <= 28 then Color3.fromRGB(139, 113, 102) else Color3.fromRGB(226, 174, 84)
		local fit = if px <= 28 then 0.86 else 0.94
		local function rect(x, y, w, h)
			return 0.5 + (x - 0.5) * fit, 0.5 + (y - 0.5) * fit, w * fit, h * fit
		end
		local function shape(x, y, w, h, rotation, radius)
			x, y, w, h = rect(x, y, w, h)
			-- [모바일 선 굵기] 깃펜·책등처럼 1px 미만으로 사라지는 획만 보강한다.
			local minLine = (if px <= 28 then 1.6 else 2.2) / px
			if w < minLine then x -= (minLine - w) * 0.5; w = minLine end
			if h < minLine then y -= (minLine - h) * 0.5; h = minLine end
			local piece = Instance.new("Frame")
			piece.Name = "GlyphShape"
			-- UIGradient가 곱해지므로 밝은 메뉴는 흰 바탕에 황동 그라데이션 1회만 적용.
			piece.BackgroundColor3 = if px > 28 then Color3.new(1, 1, 1) else ink
			piece.BorderSizePixel = 0
			piece.Size = UDim2.fromScale(w, h)
			piece.Position = UDim2.fromScale(x, y)
			piece.Rotation = rotation or 0
			if radius then
				local curve = Instance.new("UICorner")
				curve.CornerRadius = UDim.new(radius, 0)
				curve.Parent = piece
			end
			if px > 28 then
				local shade = Instance.new("UIGradient")
				shade.Color = ColorSequence.new(Color3.fromRGB(249, 211, 139), Color3.fromRGB(193, 137, 57))
				shade.Rotation = 90
				shade.Parent = piece
			end
			piece.Parent = icon
			return piece
		end
		local function outline(x, y, w, h, radius)
			x, y, w, h = rect(x, y, w, h)
			local frame = Instance.new("Frame")
			frame.Name = "GlyphOutline"
			frame.Size = UDim2.fromScale(w, h)
			frame.Position = UDim2.fromScale(x, y)
			frame.BackgroundTransparency = 1
			frame.BorderSizePixel = 0
			local curve = Instance.new("UICorner")
			curve.CornerRadius = UDim.new(radius or 0.12, 0)
			curve.Parent = frame
			local edge = Instance.new("UIStroke")
			edge.Color = ink
			edge.Thickness = if px <= 28 then 1.6 else 2.2
			edge.Parent = frame
			frame.Parent = icon
		end
		if asset == "tavern" then
			-- 주점: 잔과 손잡이·증기. 기록책·항해 지도와 혼동하지 않게 한다.
			shape(0.18, 0.29, 0.46, 0.52, 0, 0.18)
			shape(0.14, 0.27, 0.53, 0.09, 0, 0.15)
			shape(0.62, 0.36, 0.20, 0.09, 0, 0.15)
			shape(0.74, 0.40, 0.09, 0.30, 0, 0.25)
			shape(0.62, 0.61, 0.20, 0.09, 0, 0.15)
			shape(0.25, 0.13, 0.07, 0.11, -15, 0.30)
			shape(0.46, 0.11, 0.07, 0.12, 14, 0.30)
		elseif asset == "board" then
			-- 의뢰판: 공고판+두 줄의 종이. 퀘스트 두루마리와 별개다.
			outline(0.11, 0.18, 0.78, 0.64, 0.08)
			shape(0.17, 0.21, 0.10, 0.58, 0, 0.08)
			shape(0.23, 0.29, 0.54, 0.09, 0, 0.08)
			shape(0.23, 0.46, 0.43, 0.08, 0, 0.08)
			shape(0.23, 0.62, 0.48, 0.08, 0, 0.08)
		elseif asset == "crew" then
			-- 동료·고용: 두 사람의 머리와 어깨.
			shape(0.14, 0.12, 0.29, 0.29, 0, 1)
			shape(0.57, 0.12, 0.29, 0.29, 0, 1)
			shape(0.05, 0.50, 0.44, 0.31, 0, 0.35)
			shape(0.51, 0.50, 0.44, 0.31, 0, 0.35)
		elseif asset == "recruit" then
			-- [동료 영입] 후보 한 사람과 추가 표식: 선장실의 동료 관리(두 사람)와 시각적으로 구분한다.
			shape(0.15, 0.12, 0.32, 0.32, 0, 1)
			shape(0.10, 0.53, 0.48, 0.29, 0, 0.32)
			shape(0.64, 0.40, 0.28, 0.09, 0, 0.12)
			shape(0.73, 0.30, 0.09, 0.29, 0, 0.12)
		elseif asset == "war" then
			-- 함대전: 포신과 포차 두 바퀴. 조선소의 범선과 구별한다.
			shape(0.24, 0.25, 0.61, 0.14, -23, 0.2)
			shape(0.14, 0.50, 0.66, 0.13, 0, 0.12)
			shape(0.19, 0.58, 0.25, 0.25, 0, 1)
			shape(0.60, 0.58, 0.25, 0.25, 0, 1)
		elseif asset == "gwent" then
			-- 카드 배틀·내 카드: 투명 카드 외곽과 한 가지 트럼프 문양.
			outline(0.20, 0.08, 0.60, 0.85, 0.10)
			local suit = Instance.new("TextLabel")
			suit.Name = "CardSuit"
			suit.Size = UDim2.fromScale(0.6, 0.61)
			suit.Position = UDim2.fromScale(0.20, 0.20)
			suit.BackgroundTransparency = 1
			suit.Text = "♠"
			suit.Font = Enum.Font.GothamBlack
			suit.TextScaled = true
			suit.TextColor3 = ink
			suit.Parent = icon
		elseif asset == "scholar" then
			-- 지식 보고: 깃펜과 잉크병. 백과사전 책 모양과 분리한다.
			shape(0.23, 0.57, 0.34, 0.30, 0, 0.18)
			shape(0.28, 0.48, 0.23, 0.12, 0, 0.1)
			shape(0.53, 0.14, 0.12, 0.57, 36, 0.35)
			shape(0.64, 0.06, 0.20, 0.28, 36, 1)
		elseif asset == "captain" then
			-- 선장실·상태: 선장 모자·얼굴·어깨. 해적 해골 깃발을 인물 상태에 쓰지 않는다.
			shape(0.29, 0.21, 0.42, 0.29, 0, 0.35)
			shape(0.12, 0.38, 0.76, 0.16, 0, 0.18)
			shape(0.36, 0.51, 0.28, 0.24, 0, 1)
			shape(0.19, 0.75, 0.62, 0.15, 0, 0.32)
		elseif asset == "research" then
			-- 학문 연구: 초기 근대의 약액병·기구. 후대형 현미경을 시대 구분 없이 쓰지 않는다.
			shape(0.42, 0.13, 0.16, 0.34, 0, 0.14)
			shape(0.34, 0.42, 0.32, 0.13, 0, 0.18)
			shape(0.21, 0.51, 0.58, 0.32, 0, 0.35)
			shape(0.27, 0.72, 0.45, 0.07, 0, 0.12)
		elseif asset == "journal" then
			-- 저널: 펼친 기록장. 항만청의 바다 지도와 구분한다.
			outline(0.10, 0.16, 0.36, 0.69, 0.10)
			outline(0.54, 0.16, 0.36, 0.69, 0.10)
			shape(0.48, 0.16, 0.04, 0.68, 0, 0.12)
			shape(0.18, 0.37, 0.18, 0.065, 0, 0.05)
			shape(0.18, 0.55, 0.18, 0.065, 0, 0.05)
			shape(0.64, 0.37, 0.18, 0.065, 0, 0.05)
			shape(0.64, 0.55, 0.18, 0.065, 0, 0.05)
		elseif asset == "gear" then
			-- 설정: 단색 톱니바퀴. 기기별 색상이 다른 이모지 글리프를 쓰지 않는다.
			outline(0.19, 0.19, 0.62, 0.62, 1)
			outline(0.37, 0.37, 0.26, 0.26, 1)
			for i = 0, 7 do
				local angle = i * math.pi / 4
				shape(0.45 + math.cos(angle) * 0.39, 0.45 + math.sin(angle) * 0.39, 0.13, 0.13, math.deg(angle), 0.15)
			end
		elseif asset == "help" then
			-- 도움말: 다른 시설·시스템과 같은 황동 계열 물음표.
			local question = Instance.new("TextLabel")
			question.Name = "HelpMark"
			question.Size = UDim2.fromScale(0.82, 0.86)
			question.Position = UDim2.fromScale(0.09, 0.05)
			question.BackgroundTransparency = 1
			question.Font = Enum.Font.GothamBlack
			question.Text = "?"
			question.TextScaled = true
			question.TextColor3 = ink
			question.Parent = icon
		end
		icon.Parent = parent
		return icon
	end
	if kind == "Portraits" and AssetIds["Portraits/" .. asset] then
		local portrait = Instance.new("ImageLabel")
		portrait.Size = UDim2.fromOffset(px, px)
		portrait.Image = "rbxassetid://" .. tostring(AssetIds["Portraits/" .. asset])
		if portraitOffset then
			local k = sheetK(asset)
			portrait.ImageRectOffset = portraitOffset * k
			-- 정사각 칸에 세로로 긴 초상(256x336)을 넣으면 위아래가 잘려 머리가 잘린다: 위쪽 정사각(머리~어깨)만 쓴다.
			portrait.ImageRectSize = Vector2.new(256, 256) * k
		end
		portrait.ScaleType = if portraitOffset then Enum.ScaleType.Crop else Enum.ScaleType.Fit
		H.iconPaper(portrait, px)
		portrait.Parent = parent
		return portrait
	end
	-- [3D 통일] 3D 모델이 있는 상품은 작은 목록과 상세 모두 같은 3D 모델로 보여 준다 (그림과 모델이 섞여 보이지 않게).
	if kind == "Goods" or kind == "Menu" then
		local card = Instance.new("Frame")
		card.Name = kind .. "_" .. asset
		card.Size = UDim2.fromOffset(px, px)
		-- [메뉴 아이콘] 장정·종이 받침 없이 원화의 투명 영역을 그대로 보여 준다. 상품 카드는 기존 양피지를 유지한다.
		if kind == "Menu" then
			card.BackgroundTransparency = 1
			card.BorderSizePixel = 0
		else
			H.iconPaper(card, px)
		end
		local assetId = AssetIds[kind .. "/" .. asset]
		if assetId then
			-- [메뉴 아이콘 크기] 원화의 빈 여백 차이를 8% 안쪽 여백으로 정규화한다.
			local inset = if kind == "Menu" then math.max(1, math.floor(px * 0.08 + 0.5)) else math.max(2, math.floor(px * 0.12))
			local art = Instance.new("ImageLabel")
			art.Name = "OriginalArt"
			art.Size = UDim2.new(1, -2 * inset, 1, -2 * inset)
			art.Position = UDim2.fromOffset(inset, inset)
			art.BackgroundTransparency = 1
			art.Image = "rbxassetid://" .. tostring(assetId)
			art.ScaleType = Enum.ScaleType.Fit
			if kind == "Menu" then
				-- 이미 황동색으로 등록된 원화를 다시 짙은 갈색으로 곱해 검게 만들지 않는다.
				-- 문서 탭(양피지)과 HUD(바다 배경)에서 도형 아이콘과 유사한 밝기로 보정.
				art.ImageColor3 = if px <= 28 then Color3.fromRGB(139, 113, 102) else Color3.fromRGB(255, 240, 204)
			end
			art.Parent = card
		else
			-- 등록된 그림이 없는 경우 기존 상품 이름을 보존한다.
			local nameTile = Instance.new("TextLabel")
			nameTile.Size = UDim2.fromScale(1, 1)
			nameTile.BackgroundTransparency = 1
			nameTile.Text = labelText or tostring(asset)
			nameTile.TextWrapped = true
			nameTile.TextScaled = true
			nameTile.Font = Enum.Font.GothamBold
			nameTile.TextColor3 = COLORS.ink
			local pad = Instance.new("UIPadding")
			pad.PaddingLeft, pad.PaddingRight, pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 5), UDim.new(0, 5), UDim.new(0, 8), UDim.new(0, 8)
			pad.Parent = nameTile
			nameTile.Parent = card
		end
		card.Parent = parent
		return card
	end
	-- [교역품 3D] 승인된 Cargo 모델만 표시하고, 지연 로딩 동안에는 동일 상품 원화를 유지한다.
	local vf = Instance.new("ViewportFrame")
	vf.Size = UDim2.fromOffset(px, px)
	H.iconPaper(vf, px)
	-- [배 표면 가독성] 선체 나뭇결·금속·돛천은 과도한 주변광에서 하얗게 떠 보인다.
	-- 기존 교역품 조명은 유지하고 선박 뷰포트만 대비 있는 경사광으로 조절한다.
	vf.Ambient = if kind == "Naval" then Color3.fromRGB(135, 140, 145) else Color3.fromRGB(202, 195, 181)
	vf.LightColor = if kind == "Naval" then Color3.fromRGB(255, 236, 209) else Color3.fromRGB(255, 247, 224)
	vf.LightDirection = Vector3.new(-0.8, -1.6, -0.55).Unit
	local cam = Instance.new("Camera")
	cam.FieldOfView = 35
	cam.Parent = vf
	vf.CurrentCamera = cam
	local world = Instance.new("WorldModel")
	world.Name = "Display"
	world.Parent = vf
	local lib = ReplicatedStorage:FindFirstChild("MareAssets")
	local group = kind and lib and lib:FindFirstChild(kind)
	local currentModel, readyConnection, fallback = nil, nil, nil

	-- [모델 적용] 등록된 실제 모델의 메시·텍스처를 유지하며 복제한다.
	local function showRegisteredModel(template)
		if currentModel or not template or not template:IsA("Model") or not template:FindFirstChildWhichIsA("BasePart", true) then
			return false
		end
		local model = template:Clone()
		for _, part in model:GetDescendants() do
			if part:IsA("BasePart") then
				part.Anchored = true
				if tint and part:IsA("MeshPart") then part.Color = tint end
			end
		end
		model.Parent = world
		local cf, size = model:GetBoundingBox()
		local radius = math.max(size.Magnitude * 0.5, 0.1)
		local reach = radius / math.sin(math.rad(cam.FieldOfView * 0.5)) * 1.08
		if kind == "People" then
			local focus = cf.Position + Vector3.new(0, size.Y * 0.30, 0)
			cam.FieldOfView = 34
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.12, 0.08, 1).Unit * (size.Y * 0.88), focus)
		else
			local direction = Vector3.new(0.85, 0.65, 1.2).Unit
			-- [모바일 교역품] 작은 정사각형 화면은 메시의 실제 투영 외곽을 기준으로 빈 여백을 줄인다.
			-- 8개 모서리의 원근 거리로 맞추므로 기다란 병·천·상자도 잘리지 않는다.
			if kind == "Cargo" and px < 90 then
				local viewFrame = CFrame.lookAt(cf.Position + direction, cf.Position)
				local half = size * 0.5
				local tangent = math.tan(math.rad(cam.FieldOfView * 0.5))
				local fitted = 0.1
				for x = -1, 1, 2 do
					for y = -1, 1, 2 do
						for z = -1, 1, 2 do
							local delta = cf:VectorToWorldSpace(Vector3.new(half.X * x, half.Y * y, half.Z * z))
							local extent = math.max(math.abs(delta:Dot(viewFrame.RightVector)), math.abs(delta:Dot(viewFrame.UpVector)))
							fitted = math.max(fitted, delta:Dot(direction) + extent / tangent)
						end
					end
				end
				reach = fitted * 1.06
			end
			cam.CFrame = CFrame.lookAt(cf.Position + direction * reach, cf.Position)
		end
		currentModel = model
		if fallback then fallback:Destroy(); fallback = nil end
		if readyConnection then readyConnection:Disconnect(); readyConnection = nil end
		-- [모바일 성능] 52/60px 목록 카드는 정지 표본, 상세(96px)만 회전한다.
		if px >= 90 then
			addItemMotion({ gui = vf, model = model, center = cf.Position, base = model:GetPivot() })
		end
		return true
	end

	local template = group and asset and group:FindFirstChild(asset)
	if not showRegisteredModel(template) then
		-- [원화 대기] 정확히 동일한 교역품 승인 PNG 우선. 임의 상품 그림은 사용하지 않는다.
		local originalId = if type(smallArt) == "string" then AssetIds[smallArt] else nil
		local knownId = if kind and asset then AssetIds[kind .. "/" .. asset] else nil
		if originalId or knownId then
			local image = Instance.new("ImageLabel")
			image.Name = if originalId then "ApprovedGoodsArt" else "RegisteredModelThumbnail"
			local inset = math.max(2, math.floor(px * 0.10))
			image.Size = UDim2.new(1, -2 * inset, 1, -2 * inset)
			image.Position = UDim2.fromOffset(inset, inset)
			image.BackgroundTransparency = 1
			image.Image = if originalId then "rbxassetid://" .. tostring(originalId)
				else "rbxthumb://type=Asset&id=" .. tostring(knownId) .. "&w=150&h=150"
			image.ScaleType = Enum.ScaleType.Fit
			image.Parent = vf
			fallback = image
		else
			local nameTile = Instance.new("TextLabel")
			nameTile.Name = "UnregisteredAssetLabel"
			nameTile.BackgroundTransparency = 1
			nameTile.Size = UDim2.fromScale(1, 1)
			nameTile.Text = labelText or "자산 준비"
			nameTile.TextWrapped = true
			nameTile.TextColor3 = COLORS.ink
			nameTile.Font = Enum.Font.GothamBold
			nameTile.TextSize = math.min(14, math.max(10, px / 4))
			nameTile.Parent = vf
			fallback = nameTile
		end
		-- [지연 전환] 교역품·선박 모두 등록 원본이 늦게 도착하면 썸네일을 3D로 교체한다.
		if (kind == "Cargo" or kind == "Naval") and group and asset and knownId then
			readyConnection = group.ChildAdded:Connect(function(child)
				if child.Name == asset then showRegisteredModel(child) end
			end)
			vf.Destroying:Connect(function()
				if readyConnection then readyConnection:Disconnect(); readyConnection = nil end
			end)
			showRegisteredModel(group:FindFirstChild(asset))
		end
	end
	vf.Parent = parent
	return vf
end

-- 줄(row) 왼쪽에 아이콘을 붙이고 글자 상자를 오른쪽으로 민다
local function withIcon(row, kind, asset, tint, px, portraitOffset)
	local previous = row:FindFirstChild("RowIcon")
	if previous then previous:Destroy() end
	local icon = modelIcon(row, kind, asset, tint, px, nil, nil, portraitOffset)
	icon.Name = "RowIcon"
	icon.Position = UDim2.new(0, 8, 0.5, -px / 2)
	local box = row:FindFirstChild("RowText")
	if box then
		local inset = px + 16
		local delta = inset - box.Position.X.Offset
		box.Position = UDim2.fromOffset(inset, box.Position.Y.Offset)
		box.Size = UDim2.new(box.Size.X.Scale, box.Size.X.Offset - delta, box.Size.Y.Scale, box.Size.Y.Offset)
	end
	return icon
end

-- [가죽 장정의 양피지 버튼] 재질·음각·손으로 찍힌 황동 리벳. 클릭·활성/비활성 로직 보존.
local function mkButton(parent, text, color, size, onClick, enabled)
	local b = Instance.new("TextButton")
	b.Text = text
	b.Size = size
	local active = enabled ~= false
	local highlighted = color == COLORS.gold or color == UI_BRASS
	local danger = active and color == COLORS.red
	local inkTint = if danger then Color3.fromRGB(97, 34, 24) else INK
	b.BackgroundColor3 = if not active then Color3.fromRGB(174, 151, 116)
		elseif danger then Color3.fromRGB(224, 166, 138) elseif highlighted then Color3.fromRGB(232, 198, 140) else COLORS.paper
	b.TextColor3 = if active then inkTint else Color3.fromRGB(108, 92, 69)
	b.Font = Enum.Font.GothamBold
	b.TextSize = math.clamp(math.floor((size.Y.Offset > 0 and size.Y.Offset or 32) * 0.42), 13, 19)
	b.TextWrapped = true
	-- [모바일 실제 입력] 장식용 종이·황동 테두리가 클릭을 가리지 않도록 버튼이 카드보다 앞에서 입력을 받는다.
	b.AutoButtonColor = active
	b.Active = active
	b.Interactable = active
	b.Selectable = active
	b.ZIndex = (if parent:IsA("GuiObject") then parent.ZIndex else 1) + 2
	b.BorderSizePixel = 0
	corner(b, 6)
	b.Parent = parent
	do
		local grad = Instance.new("UIGradient")
		grad.Color = ColorSequence.new(
			if highlighted then Color3.fromRGB(241, 210, 146) else Color3.fromRGB(231, 207, 166),
			if highlighted then Color3.fromRGB(187, 142, 77) else Color3.fromRGB(192, 153, 100)
		)
		grad.Rotation = 90
		grad.Parent = b
		local grain = bookMaterial(b, "parchment", 148)
		if grain then
			grain.ImageColor3 = if danger then Color3.fromRGB(237, 171, 145)
				elseif highlighted then Color3.fromRGB(249, 218, 148)
				elseif active then Color3.fromRGB(251, 238, 212) else Color3.fromRGB(193, 172, 139)
		end
		if grain then
			-- 저장 초기화 재확인처럼 상태가 붉게 바뀌는 경우 종이가 경고색을 가리지 않게 한다.
			b:GetPropertyChangedSignal("BackgroundColor3"):Connect(function()
				grain.ImageTransparency = if b.BackgroundColor3 == COLORS.red then 1 else 0.06
			end)
		end
		local edge = Instance.new("UIStroke")
		edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		edge.Color = if active then INK_EDGE else Color3.fromRGB(128, 108, 82)
		edge.Thickness = if highlighted then 2.3 else 1.6
		edge.Transparency = if active then 0.06 else 0.38
		edge.Parent = b
		-- 깊이를 주는 안쪽 인쇄 테두리
		local bevel = Instance.new("Frame")
		bevel.Name = "PressedEdge"
		bevel.BackgroundTransparency = 1
		bevel.BorderSizePixel = 0
		bevel.Position = UDim2.fromOffset(3, 3)
		bevel.Size = UDim2.new(1, -6, 1, -6)
		bevel.ZIndex = b.ZIndex + 1
		bevel.Active = false
		bevel.Parent = b
		corner(bevel, 4)
		local inner = Instance.new("UIStroke")
		inner.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		inner.Color = Color3.fromRGB(120, 84, 43)
		inner.Thickness = 1
		inner.Transparency = 0.72
		inner.Parent = bevel
		local mark = Instance.new("Frame")
		mark.Name = "BookRibbon"
		mark.BackgroundColor3 = if not active then COLORS.grey else (color or INK_EDGE)
		mark.BackgroundTransparency = if active then 0.16 else 0.55
		mark.BorderSizePixel = 0
		mark.Position = UDim2.fromOffset(5, 8)
		mark.Size = UDim2.new(0, 4, 1, -16)
		mark.ZIndex = b.ZIndex + 1
		mark.Active = false
		mark.Parent = b
		mark.Visible = size.X.Scale > 0 or size.X.Offset >= 60
		corner(mark, 2)
		local rivet = Instance.new("Frame")
		rivet.Name = "BrassRivet"
		rivet.AnchorPoint = Vector2.new(1, 0.5)
		rivet.Position = UDim2.new(1, -7, 0.5, 0)
		rivet.Size = UDim2.fromOffset(5, 5)
		rivet.BackgroundColor3 = UI_BRASS_DARK
		rivet.BackgroundTransparency = 0.18
		rivet.BorderSizePixel = 0
		rivet.ZIndex = b.ZIndex + 1
		rivet.Active = false
		rivet.Parent = b
		rivet.Visible = size.X.Scale > 0 or size.X.Offset >= 88
		corner(rivet, 3)
		-- 인쇄 글자가 실제 종이 텍스처 아래로 가라앉지 않도록 별도 잉크 층을 둔다.
		-- TextButton.Text 자체는 그대로 유지해 기존 상태 변경과 접근성을 보존한다.
		if grain then
			b.TextTransparency = 1
			local caption = Instance.new("TextLabel")
			caption.Name = "PrintedCaption"
			caption.BackgroundTransparency = 1
			caption.Position = UDim2.fromOffset(9, 1)
			caption.Size = UDim2.new(1, -18, 1, -2)
			caption.Text = b.Text
			caption.TextColor3 = b.TextColor3
			caption.TextSize = b.TextSize
			caption.Font = b.Font
			caption.TextWrapped = true
			caption.TextXAlignment = Enum.TextXAlignment.Center
			caption.TextYAlignment = Enum.TextYAlignment.Center
			caption.ZIndex = b.ZIndex + 2
			caption.Active = false
			caption.Parent = b
			b:GetPropertyChangedSignal("Text"):Connect(function() caption.Text = b.Text end)
			b:GetPropertyChangedSignal("TextColor3"):Connect(function() caption.TextColor3 = b.TextColor3 end)
			b:GetPropertyChangedSignal("TextSize"):Connect(function() caption.TextSize = b.TextSize end)
		end
	end
	if active and onClick then
		b.Activated:Connect(function()
			Sfx.play("sfx_click")
			onClick()
		end)
	end
	return b
end

-- 제목, 부제, 오른쪽 버튼들로 이루어진 한 줄
local function mkRow(parent, title, subtitle, buttons, height)
	local row = Instance.new("Frame")
	row.Size = UDim2.new(1, -6, 0, height or 60)
	row.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
	row.BorderSizePixel = 0
	corner(row, 4)
	row.Parent = parent
	do
		local rs = Instance.new("UIStroke")
		rs.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		rs.Color = INK_EDGE
		rs.Thickness = 1.3
		rs.Transparency = 0.15
		rs.Parent = row
		-- 낡은 양피지: 위는 밝고 아래는 누렇게 바랜 그라데이션
		local grad = Instance.new("UIGradient")
		grad.Color = ColorSequence.new(PARCHMENT_TOP, PARCHMENT_BOTTOM)
		grad.Rotation = 90
		grad.Parent = row
		-- 종이 표면은 실제 섬유 이미지, 테두리에는 옅게 스민 잉크.
		bookMaterial(row, "parchment", 192)
		local patina = Instance.new("Frame")
		patina.Name = "AgedEdge"
		patina.BackgroundColor3 = Color3.fromRGB(122, 71, 31)
		patina.BackgroundTransparency = 0.93
		patina.BorderSizePixel = 0
		patina.Size = UDim2.fromScale(1, 1)
		patina.ZIndex = 1
		patina.Parent = row
		corner(patina, 4)
		local burn = Instance.new("UIGradient")
		burn.Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0.18), NumberSequenceKeypoint.new(0.08, 0.95),
			NumberSequenceKeypoint.new(0.92, 0.95), NumberSequenceKeypoint.new(1, 0.2),
		})
		burn.Parent = patina
		local bar = Instance.new("Frame")
		bar.Name = "AccentBar"
		bar.BackgroundColor3 = UI_BRASS
		bar.BorderSizePixel = 0
		bar.Size = UDim2.new(0, 3, 1, -12)
		bar.Position = UDim2.fromOffset(0, 6)
		bar.Parent = row
	end

	local btnCount = buttons and #buttons or 0
	local btnWidth = btnCount * 100 + 8 -- 넓은 화면에서는 기존 오른쪽 행동 칸을 유지한다
	local buttonRefs = {}

	local textBox = Instance.new("Frame")
	textBox.Name = "RowText"
	textBox.BackgroundTransparency = 1
	textBox.Position = UDim2.fromOffset(8, 4)
	textBox.Size = UDim2.new(1, -(btnWidth + 12), 1, -8)
	textBox.Parent = row
	local layout = Instance.new("UIListLayout")
	layout.Parent = textBox
	mkLabel(textBox, title, 19, INK, true) -- 메뉴 글씨·그림을 시원하게 키운다
	if subtitle and subtitle ~= "" then
		mkLabel(textBox, subtitle, 16, INK_SOFT, false)
	end

	if buttons then
		for i, spec in buttons do
			local b = mkButton(row, spec.text, spec.color or COLORS.blue, UDim2.fromOffset(92, 48), spec.onClick, spec.enabled)
			b.AnchorPoint = Vector2.new(1, 0.5)
			b.Position = UDim2.new(1, -6 - (btnCount - i) * 100, 0.5, 0)
			table.insert(buttonRefs, b)
		end
	end
	local minH = math.max(height or 60, 78)
	local ic = H.iconFor(title, subtitle)
	if ic and minH >= 50 then
		withIcon(row, ic[2], ic[3], nil, math.min(66, minH - 12))
	end
	-- [전체 메뉴 공통 가독성] 휴대폰에서는 긴 설명 위에 행동 버튼이 겹치지 않도록
	-- 한 카드 안에서 '내용 위 / 버튼 아래'로 배치한다. 넓은 화면의 오른쪽 버튼 배치는 유지.
	local function fitRow()
		local width = row.AbsoluteSize.X
		local narrow = width > 0 and width < 450 and btnCount > 0
		local left = textBox.Position.X.Offset
		local buttonSpace = if narrow then 0 else btnWidth
		textBox.Size = UDim2.new(1, -(left + buttonSpace + 12), if narrow then 0 else 1, if narrow then math.max(30, layout.AbsoluteContentSize.Y + 10) else -8)
		local textHeight = layout.AbsoluteContentSize.Y + 12
		local targetHeight = math.max(minH, textHeight + (row:GetAttribute("FooterHeight") or 0) + (if narrow then 54 else 0))
		if row.Size.Y.Offset ~= targetHeight then row.Size = UDim2.new(1, -6, 0, targetHeight) end
		for i, button in buttonRefs do
			if narrow then
				button.AnchorPoint = Vector2.new(0, 1)
				button.Position = UDim2.new((i - 1) / btnCount, 5, 1, -5)
				button.Size = UDim2.new(1 / btnCount, -10, 0, 44)
			else
				button.AnchorPoint = Vector2.new(1, 0.5)
				button.Position = UDim2.new(1, -6 - (btnCount - i) * 100, 0.5, 0)
				button.Size = UDim2.fromOffset(92, 48)
			end
		end
		local rowIcon = row:FindFirstChild("RowIcon")
		if rowIcon then
			rowIcon.Position = if narrow then UDim2.fromOffset(8, 8)
				else UDim2.new(0, 8, 0.5, -rowIcon.Size.Y.Offset / 2)
		end
	end
	layout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(fitRow)
	row:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitRow)
	row:GetAttributeChangedSignal("FooterHeight"):Connect(fitRow)
	task.defer(fitRow)
	return row
end

-- [시설 공통 카드] 기존 그림·양피지·황동 디자인을 모바일과 PC에 같은 비율로 배치한다.
function H.tileGrid(items, parent, cellW, cellH)
	cellW, cellH = math.floor((cellW or 176) * 1.3), math.max(216, math.floor((cellH or 156) * 1.3))
	for _, it in items do
		if it.desc then cellH = math.max(cellH, 260)
		elseif it.portrait then cellH = math.max(cellH, 240) end
	end
	local grid = Instance.new("Frame")
	grid.BackgroundTransparency = 1
	grid.Size = UDim2.new(1, -6, 0, 0)
	grid.AutomaticSize = Enum.AutomaticSize.Y
	local gl = Instance.new("UIGridLayout")
	gl.CellSize = UDim2.fromOffset(cellW, cellH)
	gl.CellPadding = UDim2.fromOffset(8, 8)
	gl.SortOrder = Enum.SortOrder.LayoutOrder
	gl.Parent = grid
	for i, it in items do
		local on = it.enabled ~= false
		local tile = Instance.new("Frame")
		tile.LayoutOrder = i
		tile.Name = "BookTile"
		tile.BackgroundColor3 = if on then COLORS.paper else Color3.fromRGB(193, 177, 149)
		tile.BorderSizePixel = 0
		corner(tile, 8)
		local paperGradient = Instance.new("UIGradient")
		paperGradient.Color = ColorSequence.new(PARCHMENT_TOP, PARCHMENT_BOTTOM)
		paperGradient.Rotation = 90
		paperGradient.Parent = tile
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Color = if on then INK_EDGE else COLORS.grey
		st.Thickness = 1.5
		st.Parent = tile
		tile.Parent = grid
		local seal = Instance.new("Frame")
		seal.Name = "BrassRule"
		seal.BackgroundColor3 = if on then UI_BRASS else COLORS.grey
		seal.BackgroundTransparency = if on then 0.1 else 0.5
		seal.BorderSizePixel = 0
		seal.Position = UDim2.fromOffset(6, 5)
		seal.Size = UDim2.new(1, -12, 0, 3)
		seal.Parent = tile
		-- 초상(주점 동료 등)은 더 크게. 아래 글자는 그만큼 내려간다.
		local iconPx = if it.portrait then 104 else 78
		local ic = modelIcon(tile, if it.portrait then "Portraits" else (it.kind or "Menu"), if it.portrait then it.portrait.atlas else it.icon, nil, iconPx, it.title, nil, if it.portrait then it.portrait.offset else nil)
		ic.AnchorPoint = Vector2.new(0.5, 0)
		ic.Position = UDim2.new(0.5, 0, 0, 8)
		local textY = iconPx + 14
		local nm = mkLabel(tile, it.title, 19, INK, true)
		nm.AutomaticSize = Enum.AutomaticSize.None
		nm.Position = UDim2.fromOffset(4, textY)
		nm.Size = UDim2.new(1, -8, 0, 26)
		nm.TextXAlignment = Enum.TextXAlignment.Center
		nm.TextTruncate = Enum.TextTruncate.AtEnd
		if it.sub then
			local sb = mkLabel(tile, it.sub, 15, INK_SOFT, false)
			sb.AutomaticSize = Enum.AutomaticSize.None
			sb.Position = UDim2.fromOffset(4, textY + 28)
			sb.Size = UDim2.new(1, -8, 0, 20)
			sb.TextXAlignment = Enum.TextXAlignment.Center
			sb.TextTruncate = Enum.TextTruncate.AtEnd
		end
		if it.desc then
			local ds = mkLabel(tile, it.desc, 14, INK, false)
			ds.AutomaticSize = Enum.AutomaticSize.None
			ds.Position = UDim2.fromOffset(8, textY + 50)
			ds.Size = UDim2.new(1, -16, 0, 40)
			ds.TextWrapped = true
			ds.TextYAlignment = Enum.TextYAlignment.Top
			ds.TextXAlignment = Enum.TextXAlignment.Center
			ds.TextTruncate = Enum.TextTruncate.AtEnd
		end
		if it.btn and it.btn2 then
			local b1 = mkButton(tile, it.btn, it.color or COLORS.gold, UDim2.new(0.5, -12, 0, 44), it.onClick, on)
			b1.Position = UDim2.new(0, 8, 1, -52)
			local b2 = mkButton(tile, it.btn2.text, it.btn2.color or COLORS.red, UDim2.new(0.5, -12, 0, 44), it.btn2.onClick, it.btn2.enabled ~= false)
			b2.Position = UDim2.new(0.5, 4, 1, -52)
		elseif it.btn then
			local b = mkButton(tile, it.btn, it.color or COLORS.gold, UDim2.new(1, -16, 0, 44), it.onClick, on)
			b.Position = UDim2.new(0, 8, 1, -52)
		end
	end
	grid.Parent = parent
	-- [모바일] 카드 수·실제 화면 너비에 따라 열 수와 카드 너비를 조정한다.
	local function fitGrid()
		local width = grid.AbsoluteSize.X
		if width <= 0 then return end
		local gap = 8
		local columns = math.max(1, math.floor((width + gap) / (cellW + gap)))
		columns = math.min(columns, math.max(1, #items))
		gl.CellSize = UDim2.fromOffset(math.max(120, math.floor((width - gap * (columns - 1)) / columns)), cellH)
	end
	grid:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitGrid)
	task.defer(fitGrid)
	return grid
end

local function mkHeader(parent, text)
	local l = mkLabel(parent, "◆ " .. text, 17, INK, true)
	l.Size = UDim2.new(1, -8, 0, 30)
	l.AutomaticSize = Enum.AutomaticSize.Y -- 좁은 화면에서 긴 소제목이 두 줄이 되어도 잘리지 않게 (26은 최소 높이)
	l.TextYAlignment = Enum.TextYAlignment.Center
	l.BackgroundTransparency = 0
	l.BackgroundColor3 = Color3.fromRGB(218, 190, 139)
	corner(l, 3)
	local headingWash = Instance.new("UIGradient")
	headingWash.Color = ColorSequence.new(Color3.fromRGB(239, 218, 174), Color3.fromRGB(191, 155, 105))
	headingWash.Rotation = 90
	headingWash.Parent = l
	local pad = Instance.new("UIPadding")
	pad.PaddingLeft = UDim.new(0, 10)
	pad.Parent = l
	local ribbonEdge = Instance.new("UIStroke")
	ribbonEdge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border -- 글자가 아니라 테두리에만 (기본값은 글자에 번짐)
	ribbonEdge.Color = INK_EDGE
	ribbonEdge.Thickness = 1.2
	ribbonEdge.Parent = l
	local rule = Instance.new("Frame")
	rule.Name = "Rule"
	rule.BackgroundColor3 = INK_EDGE
	rule.BackgroundTransparency = 0.3
	rule.BorderSizePixel = 0
	rule.AnchorPoint = Vector2.new(0, 1)
	rule.Position = UDim2.new(0, 0, 1, 0)
	rule.Size = UDim2.new(1, 0, 0, 1)
	rule.Parent = l
	return l
end

-- 메인 화면 구조 ------------------------------------------------------------

H.bookTheme = CommonUI.CreateTheme({
	Panel = COLORS.cover, PanelRaised = COLORS.coverRaised, PanelInset = COLORS.leather,
	Border = UI_BRASS_DARK, BorderBright = UI_BRASS, Text = COLORS.text, MutedText = COLORS.muted,
	Primary = COLORS.brown, PrimaryTop = Color3.fromRGB(163, 115, 65), PrimaryBottom = COLORS.leather,
	Accent = COLORS.gold, Positive = COLORS.green, Danger = COLORS.red,
})
local main, mainInner = CommonUI.CreatePanel({ name = "Main", size = UDim2.new(1, -16, 1, -16), theme = H.bookTheme })
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = COLORS.cover
main.Parent = gui
-- 시설 페이지는 읽을 수 있는 본문 면을 바로 노출한다.
mainInner.BackgroundColor3 = COLORS.coverRaised
mainInner.BackgroundTransparency = 0.08
local sizeLimit = Instance.new("UISizeConstraint")
sizeLimit.MaxSize = Vector2.new(4000, 3000)
sizeLimit.Parent = main

-- 항해 기록의 표제지: 시설 이름, 현재 항구와 선박 정보를 분리한다.
H.pageMasthead = Instance.new("Frame")
H.pageMasthead.Name = "BookMasthead"
H.pageMasthead.Position = UDim2.fromOffset(4, 4)
H.pageMasthead.Size = UDim2.new(1, -8, 0, 58)
H.pageMasthead.BackgroundColor3 = COLORS.paper
H.pageMasthead.BorderSizePixel = 0
H.pageMasthead.Parent = mainInner
corner(H.pageMasthead, 5)
do
	local wash = Instance.new("UIGradient")
	wash.Color = ColorSequence.new(PARCHMENT_TOP, PARCHMENT_BOTTOM)
	wash.Rotation = 90
	wash.Parent = H.pageMasthead
	bookMaterial(H.pageMasthead, "parchment", 236)
	local edge = Instance.new("UIStroke")
	edge.Color = INK_EDGE
	edge.Thickness = 1.5
	edge.Transparency = 0.12
	edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	edge.Parent = H.pageMasthead
end
local function pageRule(parent, position, size)
	local rule = Instance.new("Frame")
	rule.BorderSizePixel = 0
	rule.BackgroundColor3 = UI_BRASS_DARK
	rule.BackgroundTransparency = 0.35
	rule.Position = position
	rule.Size = size
	rule.Parent = parent
	return rule
end
pageRule(H.pageMasthead, UDim2.new(0, 64, 1, -4), UDim2.new(1, -72, 0, 1))
H.pageDetails = mkLabel(H.pageMasthead, "", 11, COLORS.brown, true)
H.pageDetails.TextSize = 14
H.pageDetails.AutomaticSize = Enum.AutomaticSize.None
H.pageDetails.Position = UDim2.fromOffset(65, 33)
H.pageDetails.Size = UDim2.new(1, -230, 0, 18)
H.pageDetails.TextTruncate = Enum.TextTruncate.AtEnd

local headerLabel = Instance.new("TextLabel")
headerLabel.BackgroundTransparency = 1
headerLabel.Position = UDim2.fromOffset(69, 8)
headerLabel.Size = UDim2.new(1, -230, 0, 29)
headerLabel.TextXAlignment = Enum.TextXAlignment.Left
headerLabel.TextYAlignment = Enum.TextYAlignment.Top
headerLabel.TextScaled = true
headerLabel.TextTruncate = Enum.TextTruncate.AtEnd
headerLabel.TextSize = 23
headerLabel.Font = Enum.Font.Antique
headerLabel.TextColor3 = COLORS.ink
local mastheadSize = Instance.new("UITextSizeConstraint")
mastheadSize.MaxTextSize = 23
mastheadSize.Parent = headerLabel
headerLabel.Text = "불러오는 중..."
headerLabel.Parent = mainInner

-- 시설 주인 초상화 (대항해시대 온라인의 NPC 얼굴 창처럼)
local portraitFrame = Instance.new("ViewportFrame")
portraitFrame.Position = UDim2.fromOffset(11, 12)
portraitFrame.Size = UDim2.fromOffset(52, 52)
portraitFrame.BackgroundColor3 = Color3.fromRGB(40, 56, 80)
portraitFrame.Ambient = Color3.fromRGB(190, 190, 200)
portraitFrame.LightColor = Color3.fromRGB(255, 244, 220)
portraitFrame.Parent = mainInner
do
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 8)
	c.Parent = portraitFrame
	local st = Instance.new("UIStroke")
	st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = portraitFrame
end
local portraitCam = Instance.new("Camera")
portraitCam.FieldOfView = 30
portraitCam.Parent = portraitFrame
portraitFrame.CurrentCamera = portraitCam
-- 등록된 실사 NPC 초상화가 있으면 기존 3D 초상 위에 표시한다.
local portraitImage = Instance.new("ImageLabel")
portraitImage.Name = "NpcPortrait"
portraitImage.Position = UDim2.fromOffset(11, 12)
portraitImage.Size = UDim2.fromOffset(52, 52)
portraitImage.BackgroundColor3 = Color3.fromRGB(40, 56, 80)
portraitImage.BorderSizePixel = 0
portraitImage.ScaleType = Enum.ScaleType.Crop
portraitImage.Visible = false
portraitImage.Parent = mainInner
do
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 8)
	c.Parent = portraitImage
	local st = Instance.new("UIStroke")
	st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	st.Color = Color3.fromRGB(214, 170, 82)
	st.Thickness = 2
	st.Parent = portraitImage
end
-- [선장실] 초상화가 완성되기 전에는 파란 물음표를 표시한다.
local captainPlaceholder = Instance.new("TextLabel")
captainPlaceholder.Name = "CaptainPortraitPending"
captainPlaceholder.Position = UDim2.fromOffset(11, 12)
captainPlaceholder.Size = UDim2.fromOffset(52, 52)
captainPlaceholder.BackgroundColor3 = Color3.fromRGB(35, 88, 150)
captainPlaceholder.BorderSizePixel = 0
captainPlaceholder.Text = "?"
captainPlaceholder.Font = Enum.Font.GothamBlack
captainPlaceholder.TextSize = 38
captainPlaceholder.TextColor3 = Color3.fromRGB(234, 246, 255)
captainPlaceholder.Visible = false
captainPlaceholder.Parent = mainInner
corner(captainPlaceholder, 8)
local pendingStroke = Instance.new("UIStroke")
pendingStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
pendingStroke.Color = Color3.fromRGB(214, 170, 82)
pendingStroke.Thickness = 2
pendingStroke.Parent = captainPlaceholder

local portraitKey = nil
local PORTRAIT_ROLE = {
	["교역소"] = "Rogue", ["항만청"] = "Knight", ["조선소"] = "Barbarian",
	["주점"] = "Barbarian", ["전투 본부"] = "Knight", ["학자의 서재"] = "Mage", ["선장실"] = "Rogue_Hooded",
}
-- 동료별 실제 등록된 인물 모델. 기존 3D 원본과 역할을 재사용하며 저장 데이터는 건드리지 않는다.
-- 문화권·성별이 맞지 않는 공용 2D 얼굴을 다른 사람에게 강제로 할당하지 않는다.
local COMPANION_MODEL = {
	c_merian = "Casual3_Female", c_halley = "OldClassy_Male", c_leeuwenhoek = "Doctor_Male_Old",
	c_linnaeus = "Doctor_Male_Young", c_boyle = "Casual2_Male", c_papin = "Worker_Male",
	t_navigator = "Pirate_Male", t_gunner = "Pirate_Female", t_purser = "OldClassy_Male",
	t_surgeon = "Doctor_Female_Young", t_helmsman = "Pirate_Male", t_mate = "Casual3_Female",
	t_boatswain = "Worker_Male", t_master_gunner = "Pirate_Female",
	n_england = "Casual3_Male", n_netherlands = "Casual2_Male", n_france = "OldClassy_Male",
	n_portugal = "Casual_Male", n_ottoman = "Casual2_Male", n_swahili = "Worker_Male",
	n_malabar = "Worker_Male", n_japan = "Soldier_Male", n_new_spain = "Worker_Male",
	-- 초상이 아직 없는 인물도 빈칸 대신 알맞은 인물 모델로 연결한다
	c_harrison = "OldClassy_Male", c_lind = "Doctor_Male_Old", n_china = "Casual_Male", n_spain = "Casual2_Male", n_korea = "Casual_Male",
}
-- 초상화 시트: 왼쪽부터 상인·항만 관리관·조선 장인 / 주점 주인·학자·항해가.
-- 나이와 직업이 다른 인물을 사용한다. 나라·역할이 맞지 않으면 기존 인물 모델을 보존한다.
-- 새 시설 NPC 초상화는 등록·권한 승인된 ID가 있을 때만 사용한다.
-- 등록 전에는 기존 초상화 시트를 그대로 표시하므로 화면이 비지 않는다.
-- 흑백 스케치 시트(npcs_new·characters)는 더 이상 쓰지 않는다. 색 있는 시설 초상(FACILITY_ATLAS)과 3D 인물 모델만 쓴다.
local PORTRAIT_ATLAS: number? = nil
local PORTRAIT_SIZE = Vector2.new(256, 336)
local PORTRAIT_TILE = {
	merchant = Vector2.new(0, 0),
	harbor = Vector2.new(PORTRAIT_SIZE.X, 0),
	yard = Vector2.new(PORTRAIT_SIZE.X * 2, 0),
	tavern = Vector2.new(0, PORTRAIT_SIZE.Y),
	scholar = Vector2.new(PORTRAIT_SIZE.X, PORTRAIT_SIZE.Y),
	hero = Vector2.new(PORTRAIT_SIZE.X * 2, PORTRAIT_SIZE.Y),
}
-- 색 없는 스케치 초상(학자·상인 시트)은 쓰지 않는다. 색 있는 지역 초상과 3D 인물 모델만 쓴다.
local SCHOLAR_SKETCH = false
local FACILITY_ATLAS = AssetIds["Portraits/crew_facilities"]
local FACILITY_TILE = {
	merchant = Vector2.new(256, 336), harbor = Vector2.new(512, 336),
	yard = Vector2.new(0, 672), tavern = Vector2.new(256, 672), scholar = Vector2.new(512, 672),
}
local COMPANION_PORTRAIT = {}
for atlas, ids in {
	crew_facilities = { "t_navigator", "t_gunner", "t_purser", "t_surgeon" },
	crew_nations = { "n_england", "n_netherlands", "n_france", "n_portugal", "n_ottoman", "n_swahili", "n_malabar", "n_japan", "n_new_spain" },
} do
	if AssetIds["Portraits/" .. atlas] then
		for index, id in ids do
			local cell = index - 1
			COMPANION_PORTRAIT[id] = { atlas = atlas, offset = Vector2.new(cell % 3 * 256, math.floor(cell / 3) * 336) }
		end
	end
end
-- 동료 초상: 새 시트(5열)의 칸을 배정한다. 아랫줄(15~19)은 여성, 윗줄은 남성 인물 위주.
for id, spec in {
	t_helmsman = { "mediterranean", 4 }, t_mate = { "mediterranean", 16 }, t_boatswain = { "west_africa", 2 }, t_master_gunner = { "north_atlantic", 17 },
	h_england = { "north_atlantic", 15 }, h_netherlands = { "north_atlantic", 1 }, h_france = { "north_atlantic", 16 },
	h_ottoman = { "mediterranean", 19 }, h_swahili = { "east_africa_red_sea", 5 }, h_malabar = { "indian", 1 },
	h_japan = { "pacific", 15 }, h_new_spain = { "americas", 3 }, h_portugal = { "mediterranean", 15 },
	t_priest = { "faith_christian", 0 }, t_nun = { "faith_christian", 16 }, t_monk = { "faith_buddhist", 3 }, t_bhikkhuni = { "faith_buddhist", 17 },
	t_scribe = { "faith_indian_ocean", 3 }, t_pilgrim = { "faith_indian_ocean", 4 },
} do
	if AssetIds["Portraits/companions_" .. spec[1]] then
		COMPANION_PORTRAIT[id] = { atlas = "companions_" .. spec[1], offset = Vector2.new(spec[2] % 5 * 256, math.floor(spec[2] / 5) * 336) }
	end
end
-- 초상 배정표: 한 칸은 한 사람만 쓴다. 이미 동료가 쓰는 칸은 H.portraitUsed 에 적어 두고,
-- 국가 고향 동료(n_*)와 주인공 후보는 그 나라 시트의 빈 칸에서 겹치지 않게 고른다.
-- 나라마다 먼저 쓰는 시트(어울리는 지역 순서). 칸이 모자라면 다른 시트의 빈 칸으로 넘어간다.
do
local PortraitSheetsN = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("Specialties")).PortraitSheets
H.NATION_SHEET = {
	england = { "north_atlantic", "atlantic" }, netherlands = { "north_atlantic", "atlantic" }, denmark = { "north_atlantic" }, sweden = { "north_atlantic" },
	france = { "atlantic", "north_atlantic" }, spain = { "atlantic", "mediterranean" }, portugal = { "atlantic", "africa" }, new_spain = { "americas" },
	venice = { "mediterranean" }, ottoman = { "mediterranean", "east_africa_red_sea" }, swahili = { "east_africa_red_sea", "africa" }, malabar = { "indian" },
	china = { "pacific", "oceania" }, japan = { "pacific", "oceania" }, korea = { "pacific", "oceania" },
}
local SHEET_FALLBACK = { "west_africa", "africa", "oceania", "indian", "americas", "pacific", "mediterranean", "atlantic", "east_africa_red_sea", "north_atlantic" }
H.portraitUsed = {}
for _, spec in {
	{ "mediterranean", 4 }, { "mediterranean", 16 }, { "west_africa", 2 }, { "north_atlantic", 17 },
	{ "north_atlantic", 15 }, { "north_atlantic", 1 }, { "north_atlantic", 16 }, { "mediterranean", 19 }, { "east_africa_red_sea", 5 },
	{ "indian", 1 }, { "pacific", 15 }, { "americas", 3 }, { "mediterranean", 15 },
	{ "faith_christian", 0 }, { "faith_christian", 16 }, { "faith_buddhist", 3 }, { "faith_buddhist", 17 }, { "faith_indian_ocean", 3 }, { "faith_indian_ocean", 4 },
} do
	H.portraitUsed[spec[1] .. ":" .. spec[2]] = true
end
-- 나라의 시트 목록(+ 예비 시트)에서 아직 아무도 안 쓴 칸 하나를 집는다. 집은 칸은 바로 사용 처리된다.
function H.freeCell(nid, from, to)
	local lists = { H.NATION_SHEET[nid] or {}, SHEET_FALLBACK }
	for _, list in lists do
		for _, sheet in list do
			if AssetIds["Portraits/companions_" .. sheet] and PortraitSheetsN[sheet] then
				for c = from, math.min(to, PortraitSheetsN[sheet] - 1) do
					local key = sheet .. ":" .. c
					if not H.portraitUsed[key] then
						H.portraitUsed[key] = true
						return sheet, c
					end
				end
			end
		end
	end
	return nil, nil
end
local NATION_LIST = { "england", "netherlands", "france", "spain", "portugal", "denmark", "sweden", "venice", "ottoman", "swahili", "malabar", "china", "japan", "korea", "new_spain" }
for _, nid in NATION_LIST do
	local sheet, cell = H.freeCell(nid, 0, 14)
	if sheet then
		COMPANION_PORTRAIT["n_" .. nid] = { atlas = "companions_" .. sheet, offset = Vector2.new(cell % 5 * 256, math.floor(cell / 5) * 336) }
	end
end
-- 주인공 후보 6칸: 남성풍 윗줄 4칸 + 여성풍 아랫줄 2칸 (동료가 쓰는 칸은 빼고, 한 번 고른 칸은 다른 국가 후보와도 겹치지 않는다)
H.captainChoices = {}
for _, nid in NATION_LIST do
	local out = {}
	for i = 1, 6 do
		local sheet, c
		if i <= 4 then
			sheet, c = H.freeCell(nid, 0, 14)
		else
			sheet, c = H.freeCell(nid, 15, 19)
		end
		if not sheet and i > 4 then sheet, c = H.freeCell(nid, 0, 14) end
		if sheet then table.insert(out, "cp:" .. sheet .. ":" .. c) end
	end
	H.captainChoices[nid] = out
end
end
local PORTRAIT_GROUP = {
	["교역소"] = "merchant", ["항만청"] = "harbor", ["조선소"] = "yard",
	["주점"] = "tavern", ["학자의 서재"] = "scholar",
}
-- 국가별 주인공 9명은 3x3 시트의 서로 다른 실제 인물 사진/원화를 사용한다.
-- 이 시트를 기존 초상화 컴포넌트에서 공유하므로 새 UI 구조는 필요 없다.
-- [초상] 메서드 외부에서는 쓰지 않는 데이터의 지역변수 수명 제한.
do
local HERO_ATLAS = AssetIds["Portraits/heroes"]
local HERO_SIZE = Vector2.new(256, 336)
-- 제작 원화와 직업·문화권이 맞는 주인공부터 새 초상화로 교체한다.
-- 외형이 안 맞는 국가 주인공은 기존에 등록된 고유 초상화를 보존한다.
local HERO_PERIOD_ATLAS = AssetIds["Portraits/heroes_period"]
local HERO_NEW_ATLAS = HERO_PERIOD_ATLAS -- 흑백 스케치 시트(heroes_new)는 쓰지 않는다
local HERO_NEW_SIZE = Vector2.new(256, 336)
local HERO_NEW_TILE = {
	england = Vector2.new(0, 0), -- 엘리너: 해류 관측 학자
	netherlands = Vector2.new(256, 336), -- 얀: 젊은 상사 설립자
	france = Vector2.new(256, 672), -- 마리온: 몰락 귀족 가문
	swahili = Vector2.new(0, 672), -- 아민: 잔지바르 선장
	new_spain = Vector2.new(512, 672), -- 디에고: 광산 마을 출신
}
local HERO_TILE = {
	england = Vector2.new(0, 0), -- 엘리너 렌
	netherlands = Vector2.new(256, 0), -- 얀 데 흐로트
	france = Vector2.new(512, 0), -- 마리온 델라크루아
	ottoman = Vector2.new(0, 336), -- 레일라 하미디
	swahili = Vector2.new(256, 336), -- 아민 살림
	malabar = Vector2.new(512, 336), -- 라마 나이르
	japan = Vector2.new(0, 672), -- 사쿠라이 하루카
	new_spain = Vector2.new(256, 672), -- 디에고 모랄레스
	portugal = Vector2.new(512, 672), -- 이네스 카브랄
}
-- 연도와 항구에 맞는 승인·등록 초상을 고른다.
function H.heroPortraitAsset(nationId)
	local year = if view and view.player and not newGameMode then view.player.year else chosenYear
	local atlas = if year and year >= 1700 then AssetIds["Portraits/heroes_color"]
		elseif year and year < 1600 then AssetIds["Portraits/heroes_1517"] else nil
	local tile = HERO_TILE[nationId]
	if atlas and tile then
		return atlas, tile, HERO_SIZE
	end
	local oldTile = if HERO_NEW_ATLAS then (if HERO_PERIOD_ATLAS then HERO_TILE else HERO_NEW_TILE)[nationId] else nil
	if oldTile then
		return HERO_NEW_ATLAS, oldTile, HERO_NEW_SIZE
	end
	-- 색 있는 시트에 없는 나라는 흑백 시트(heroes)로 대신하지 않고 비워 둔다(호출하는 쪽이 모델·다른 초상을 쓴다).
	return nil, nil, nil
end
end

do
	local CultureRegions = require(Shared:WaitForChild("CultureRegions"))
	local countries = CultureRegions.Countries
	local mediterraneanPorts = CultureRegions.MediterraneanPorts
	local regionByCountry = CultureRegions.RegionByCountry

	-- 항구가 속한 해역 id (초상화 시트 고르기용)
	function H.regionOfPort(portId)
		local port = portId and PortData.Ports[portId]
		if not port then
			return nil
		end
		return if mediterraneanPorts[portId] then "mediterranean" else regionByCountry[port.country]
	end

	-- 화가가 그려 주는 초상 후보: 그 지역 교역소 사람들 10칸 (1700년 이후 화풍)
	function H.npcCellAsset(portId, cell)
		local port = portId and PortData.Ports[portId]
		if not port then
			return nil
		end
		local region = if mediterraneanPorts[portId] then "mediterranean" else regionByCountry[port.country]
		local atlas = region and AssetIds["Portraits/npc_" .. region]
		if not atlas or type(cell) ~= "number" or cell < 0 or cell > 9 then
			return nil
		end
		return atlas, Vector2.new(cell % 5 * 200, math.floor(cell / 5) * 200), Vector2.new(200, 200)
	end

	local RegionSheetOf = require(Shared:WaitForChild("Specialties")).RegionSheets
	-- 해역 시트(5열×2행 교역소 칸 0~9)에서 항만 관리관(장부 쓰는 사람)·조선 장인(짐 나르는 일꾼)에 맞는 칸. 직접 보고 골랐다.
	local REGION_ROLE_CELL = {
		americas = { harbor = 2, yard = 4 }, atlantic_europe = { harbor = 2, yard = 6 }, east_africa = { harbor = 4, yard = 0 },
		east_asia = { harbor = 2, yard = 3 }, mediterranean = { harbor = 2, yard = 1 }, north_sea = { harbor = 9, yard = 3 },
		red_sea = { harbor = 2, yard = 8 }, south_asia = { harbor = 2, yard = 3 }, southeast_asia = { harbor = 2, yard = 3 },
		west_africa = { harbor = 2, yard = 6 },
	}
	function H.facilityPortraitAsset(portId, role)
		local playerView = view and view.player
		local port = portId and PortData.Ports[portId]
		if not port or not playerView or (role ~= "merchant" and role ~= "tavern" and role ~= "harbor" and role ~= "yard" and role ~= "scholar") then -- 연도와 상관없이 그 지역 사람 얼굴을 쓴다
			return nil
		end
		local region = if mediterraneanPorts[portId] then "mediterranean" else regionByCountry[port.country]
		local atlas = region and AssetIds["Portraits/npc_" .. region]
		if not atlas then
			return nil
		end
		-- 항만 관리관은 장부를 쓰는 사람(2번 칸), 조선 장인은 짐·목재를 나르는 일꾼(3번 칸): 그 지역 시트에서 고정
		local reserved = REGION_ROLE_CELL[region] or { harbor = 2, yard = 3 }
		if role == "harbor" or role == "yard" then
			local c = reserved[role]
			return atlas, Vector2.new(c % 5 * 200, math.floor(c / 5) * 200), Vector2.new(200, 200)
		end
		local seed = 0
		for index = 1, #portId do
			seed = (seed * 31 + string.byte(portId, index)) % 101
		end
		if role == "scholar" then
			-- 학자: 같은 지역 시트의 교역소 칸 중 항만 관리관·조선 장인 칸을 뺀 한 칸(항구마다 고정)
			local c = (seed * 3 + 5) % 10
			while c == reserved.harbor or c == reserved.yard do
				c = (c + 1) % 10
			end
			return atlas, Vector2.new(c % 5 * 200, math.floor(c / 5) * 200), Vector2.new(200, 200)
		end
		local rotation = math.floor((playerView.day or 0) / 30)
		-- 격달로 새 지역 인물 시트의 젊은 인물이 가게를 맡는다
		local sheet = RegionSheetOf and RegionSheetOf[region]
		local fresh = sheet and AssetIds["Portraits/companions_" .. sheet]
		if fresh and (seed + rotation) % 2 == 1 then
			local c = (seed * 7 + rotation * 3 + (if role == "tavern" then 11 else 0)) % 20
			local k = sheetK("companions_" .. sheet)
			return fresh, Vector2.new(c % 5 * 256 * k, math.floor(c / 5) * 336 * k), Vector2.new(256 * k, 336 * k)
		end
		local cell = (seed + rotation) % 10 + (if role == "tavern" then 10 else 0)
		if role == "merchant" then -- 항만 관리관·조선 장인 칸은 건너뛴다
			while cell == reserved.harbor or cell == reserved.yard do
				cell = (cell + 1) % 10
			end
		end
		-- 술잔을 든 칸(북해 주점 19번)은 술 그림 금지 규칙에 따라 건너뛴다.
		if region == "north_sea" and cell == 19 then
			cell = 18
		end
		return atlas, Vector2.new(cell % 5 * 200, math.floor(cell / 5) * 200), Vector2.new(200, 200)
	end
end

local function setPortrait(groupName)
	local heroNation = nil
	local tile = PORTRAIT_GROUP[groupName]
	local portId = view and view.player and view.player.portId
	local regionalId, regionalOffset, regionalSize = H.facilityPortraitAsset(portId, tile)
	local heroId, heroOffset, heroSize
	if heroNation then
		heroId, heroOffset, heroSize = H.heroPortraitAsset(heroNation)
	end
	-- 선장실에는 시작할 때 화가가 그려 준 내 초상이 걸린다
	local capValue = nil
	if groupName == "선장실" and view and view.captain and type(view.captain.portrait) == "string" and H.capPortraitAsset then
		heroId, heroOffset, heroSize = H.capPortraitAsset(view.captain.portrait)
		capValue = if heroId then view.captain.portrait else nil
	end
	local imageId = heroId or regionalId
		or (if tile and FACILITY_ATLAS then FACILITY_ATLAS
			elseif tile and PORTRAIT_ATLAS then PORTRAIT_ATLAS
			else nil)
	local offset = heroOffset or regionalOffset
		or (if imageId and imageId == FACILITY_ATLAS and tile then FACILITY_TILE[tile]
			elseif imageId and imageId == PORTRAIT_ATLAS and tile then PORTRAIT_TILE[tile] else nil)
	local identity = groupName .. ":" .. tostring(capValue or heroNation or portId or "") .. ":" .. tostring(imageId) .. ":" .. tostring(offset)
	if portraitKey == identity then
		return
	end
	portraitKey = identity
	local pendingCaptainPortrait = groupName == "선장실" and heroId == nil
	captainPlaceholder.Visible = pendingCaptainPortrait
	portraitImage.Visible = imageId ~= nil and not pendingCaptainPortrait
	portraitFrame.Visible = imageId == nil and not pendingCaptainPortrait
	portraitImage.Image = if imageId then "rbxassetid://" .. tostring(imageId) else ""
	portraitImage.ImageRectOffset = offset or Vector2.zero
	portraitImage.ImageRectSize = heroSize or regionalSize or (if offset then PORTRAIT_SIZE else Vector2.zero)
	-- 이미지 전환 시 이전 3D 모델까지 정리해 불필요한 뷰포트 객체가 남지 않도록 한다.
	for _, c in portraitFrame:GetChildren() do
		if c:IsA("Model") then
			c:Destroy()
		end
	end
	if imageId or pendingCaptainPortrait then
		return
	end
	local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
	local people = lib and lib:FindFirstChild("People")
	local tpl = people and people:FindFirstChild("KayKit_" .. (PORTRAIT_ROLE[groupName] or "Knight"))
	if not tpl then
		portraitKey = nil -- 모델이 아직 없으면 다음 갱신에서 다시 시도한다
		return
	end
	local m = tpl:Clone()
	for _, d in m:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = true
		end
	end
	m.Parent = portraitFrame
	Pose.relaxArms(m)
	local cf, size = m:GetBoundingBox()
	local head = cf.Position + Vector3.new(0, size.Y * 0.32, 0)
	portraitCam.CFrame = CFrame.lookAt(head + Vector3.new(0, 0.2, size.Y * 1.2), head)
end

local coinChip, _, coinValue = CommonUI.CreateCurrencyChip({ name = "Coins", size = UDim2.fromOffset(124, 28), text = "0", theme = H.bookTheme })
coinChip.AnchorPoint = Vector2.new(1, 0)
coinChip.Position = UDim2.new(1, -56, 0, 15)
coinChip.Parent = mainInner

local tabBar = Instance.new("Frame")
tabBar.BackgroundTransparency = 1
tabBar.BorderSizePixel = 0
tabBar.Position = UDim2.fromOffset(8, 52)
tabBar.Size = UDim2.new(1, -16, 0, 40) -- 시설별로 관련 탭만 한 줄에 보여준다
tabBar.Parent = mainInner
local tabLayout = Instance.new("UIGridLayout")
tabLayout.CellSize = UDim2.new(0.25, -5, 0, 38)
tabLayout.CellPadding = UDim2.fromOffset(5, 0)
tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
tabLayout.Parent = tabBar

local content = Instance.new("ScrollingFrame")
content.BackgroundTransparency = 1
content.BorderSizePixel = 0
content.Position = UDim2.fromOffset(8, 100)
content.Size = UDim2.new(1, -16, 1, -108)
content.CanvasSize = UDim2.new()
content.AutomaticCanvasSize = Enum.AutomaticSize.Y
content.ScrollBarThickness = 4
content.Parent = mainInner
H.richParent = content
local contentLayout = Instance.new("UIListLayout")
contentLayout.Padding = UDim.new(0, 5)
contentLayout.SortOrder = Enum.SortOrder.LayoutOrder
contentLayout.Parent = content

-- 넓은 화면은 왼쪽 책갈피, 좁은 화면은 상단 한 줄 목차를 사용한다.
H.bookSpine = pageRule(mainInner, UDim2.fromOffset(132, 68), UDim2.new(0, 1, 1, -76))
function H.layoutBook()
	local wide = mainInner.AbsoluteSize.X >= 610
	local tabs = tabBar.Visible
	H.bookSpine.Visible = tabs and wide
	if tabs and wide then
		tabBar.Position = UDim2.fromOffset(8, 68)
		tabBar.Size = UDim2.new(0, 116, 1, -76)
		tabLayout.CellSize = UDim2.new(1, 0, 0, 44)
		tabLayout.CellPadding = UDim2.fromOffset(0, 6)
		content.Position = UDim2.fromOffset(142, 68)
		content.Size = UDim2.new(1, -150, 1, -76)
	else
		tabBar.Position = UDim2.fromOffset(8, 68)
		-- [모바일] 좁은 세로 화면의 전투 본부 4개 탭은 2열×2행으로 읽기 쉽게 표시한다.
		local tabCount = #groupOf(currentTab).tabs
		local compact = tabs and tabCount >= 4 and mainInner.AbsoluteSize.X < 480
		tabBar.Size = UDim2.new(1, -16, 0, if compact then 85 else 40)
		tabLayout.CellSize = UDim2.new(1 / (if compact then 2 else math.max(1, math.min(4, tabCount))), -5, 0, 40)
		tabLayout.CellPadding = UDim2.fromOffset(5, if compact then 5 else 0)
		local top = if tabs then (if compact then 161 else 116) else 68
		content.Position = UDim2.fromOffset(8, top)
		content.Size = UDim2.new(1, -16, 1, -top - 8)
	end
end
mainInner:GetPropertyChangedSignal("AbsoluteSize"):Connect(H.layoutBook)
tabBar:GetPropertyChangedSignal("Visible"):Connect(H.layoutBook)
H.layoutBook()

local menuToggle = CommonUI.CreatePrimaryButton({ name = "MenuToggle", text = "메뉴", size = UDim2.fromOffset(80, 40), minHeight = 40, minWidth = 60 })
menuToggle.AnchorPoint = Vector2.new(0, 0)
menuToggle.Position = UDim2.fromOffset(8, 8)
menuToggle.Visible = false
menuToggle.Parent = gui
menuToggle.Size = UDim2.fromOffset(0, 0) -- 옛 "메뉴" 버튼은 HUD가 대신한다 (표시 상태 신호만 사용)
menuToggle.BackgroundTransparency = 1
menuToggle.Text = ""

-- 대항해시대 온라인풍 HUD: 좌상단 선장 카드, 우상단 소지금, 하단 메뉴 독 -----------------
local NAVY = COLORS.cover
local NAVY2 = COLORS.coverRaised
local BRASS = Color3.fromRGB(214, 170, 82)

local function hudStroke(obj, thickness)
	local st = Instance.new("UIStroke")
	st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border -- 글자가 아니라 테두리에만 (기본값은 글자에 번짐)
	st.Color = BRASS
	st.Thickness = thickness or 1.5
	st.Parent = obj
end

local hud = Instance.new("Frame")
hud.Name = "Hud"
hud.BackgroundTransparency = 1
hud.Size = UDim2.fromScale(1, 1)
hud.Visible = false
hud.Parent = gui

local card = Instance.new("Frame")
card.BackgroundTransparency = 1 -- 배경 없이 글자만 (읽기 쉬운 크림색 + 1픽셀 그림자)
card.BorderSizePixel = 0
card.Position = UDim2.fromOffset(8, 8)
card.Size = UDim2.fromOffset(290, 114)
H.hudCard = card
card.Parent = hud

local function hudText(parent, pos, size, textSize, color, align)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Position = pos
	l.Size = size
	l.Font = Enum.Font.GothamMedium
	l.TextSize = textSize
	l.TextColor3 = color
	l.TextXAlignment = align or Enum.TextXAlignment.Left
	l.Text = ""
	l.Parent = parent
	return l
end

-- [왼쪽 정보] 날짜 · 코인 · 항구 · 내구도 · 화물을 일정 간격으로 표시한다.
H.hudName = hudText(card, UDim2.fromOffset(70, 8), UDim2.new(1, -78, 0, 20), 16, Color3.fromRGB(47, 30, 20))
H.hudCoin = hudText(card, UDim2.fromOffset(70, 28), UDim2.new(1, -78, 0, 20), 16, Color3.fromRGB(91, 49, 20))
H.hudPort = hudText(card, UDim2.fromOffset(70, 48), UDim2.new(1, -78, 0, 20), 15, Color3.fromRGB(56, 40, 27))
local hullFill, hullText
-- [HUD] 외부 렌더러가 쓰는 두 값만 남기고 장식 구성 변수는 여기서 해제한다.
do
local hullBack = Instance.new("Frame")
hullBack.BackgroundColor3 = Color3.fromRGB(70, 52, 33)
hullBack.Position = UDim2.fromOffset(72, 70)
hullBack.Size = UDim2.fromOffset(150, 14)
hullBack.BorderSizePixel = 0
hullBack.Parent = card
corner(hullBack, 4)
local hullStroke = Instance.new("UIStroke")
hullStroke.Color = Color3.fromRGB(214, 170, 82)
hullStroke.Thickness = 1.5
hullStroke.Parent = hullBack
hullFill = Instance.new("Frame")
hullFill.BackgroundColor3 = Color3.fromRGB(214, 40, 36)
hullFill.Size = UDim2.fromScale(1, 1)
hullFill.BorderSizePixel = 0
hullFill.Parent = hullBack
corner(hullFill, 4)
-- 질감: 위는 밝고 아래는 짙은 붉은 그라데이션 + 윗면 하이라이트 + 세로 줄무늬
local hullGrad = Instance.new("UIGradient")
hullGrad.Color = ColorSequence.new(Color3.fromRGB(255, 120, 96), Color3.fromRGB(150, 16, 20))
hullGrad.Rotation = 90
hullGrad.Parent = hullFill
local hullShine = Instance.new("Frame")
hullShine.BackgroundColor3 = Color3.new(1, 1, 1)
hullShine.BackgroundTransparency = 0.72
hullShine.Size = UDim2.new(1, -4, 0.32, 0)
hullShine.Position = UDim2.fromOffset(2, 1)
hullShine.BorderSizePixel = 0
hullShine.Parent = hullFill
corner(hullShine, 3)
local hullTicks = Instance.new("Frame")
hullTicks.BackgroundTransparency = 1
hullTicks.Size = UDim2.fromScale(1, 1)
hullTicks.ZIndex = 3
hullTicks.Parent = hullBack
for t = 1, 9 do
	local tick = Instance.new("Frame")
	tick.BackgroundColor3 = Color3.fromRGB(40, 8, 8)
	tick.BackgroundTransparency = 0.6
	tick.BorderSizePixel = 0
	tick.Position = UDim2.new(t / 10, 0, 0, 0)
	tick.Size = UDim2.new(0, 1, 1, 0)
	tick.Parent = hullTicks
end
hullText = Instance.new("TextLabel")
hullText.BackgroundTransparency = 1
hullText.Size = UDim2.fromScale(1, 1)
hullText.Font = Enum.Font.GothamBold
hullText.TextSize = 11
hullText.TextColor3 = Color3.new(1, 1, 1)
hullText.TextStrokeColor3 = Color3.fromRGB(40, 6, 6)
hullText.TextStrokeTransparency = 0.25
hullText.ZIndex = 5
hullText.Text = ""
hullText.Parent = hullBack
H.hudShip = hudText(card, UDim2.fromOffset(70, 86), UDim2.new(1, -78, 0, 16), 14, Color3.fromRGB(54, 37, 25))
-- 글자 그림자: 글자 바깥에 번지는 효과(UIStroke) 대신 같은 글자를 1픽셀 아래에 어둡게 깔아 또렷하게 읽히게 한다.
function H.shadowOf(label: TextLabel)
	local sh = label:Clone()
	sh.Name = label.Name .. "Shadow"
	sh.TextColor3 = Color3.fromRGB(18, 12, 8)
	sh.TextTransparency = 0.25
	sh.ZIndex = label.ZIndex - 1
	sh.Position = label.Position + UDim2.fromOffset(1, 1)
	sh.Parent = label.Parent
	local function sync()
		sh.Text = label.Text
		sh.Visible = label.Visible
		sh.TextSize = label.TextSize
	end
	label:GetPropertyChangedSignal("Text"):Connect(sync)
	label:GetPropertyChangedSignal("TextSize"):Connect(sync)
	label:GetPropertyChangedSignal("Visible"):Connect(sync)
	sync()
	return sh
end
for _, label in { H.hudName, H.hudCoin, H.hudPort, H.hudShip } do
	label.Font = Enum.Font.GothamBold
	label.TextStrokeTransparency = 1
	label.TextTruncate = Enum.TextTruncate.AtEnd
	label.TextColor3 = Color3.fromRGB(255, 244, 214)
end
H.hudCoin.TextColor3 = Color3.fromRGB(255, 218, 120)
for _, label in { H.hudName, H.hudCoin, H.hudPort, H.hudShip } do
	H.shadowOf(label)
end
hullBack.BackgroundColor3 = Color3.fromRGB(22, 16, 11)
end

-- 상단 중앙 항구 현판 (대항해시대 온라인의 항구 이름 리본처럼)
local hudBanner
-- [상단 현판] 임시 프레임의 스코프를 분리하고 실제 텍스트 참조만 남긴다.
do
local banner = Instance.new("Frame")
banner.AnchorPoint = Vector2.new(0.5, 0)
banner.Position = UDim2.new(0.5, 0, 0, 8)
banner.Size = UDim2.fromOffset(130, 28)
banner.BackgroundColor3 = Color3.fromRGB(90, 62, 28)
banner.Parent = hud
banner.Visible = false -- 상단 중앙 항구 이름은 쓰지 않는다
corner(banner, 8)
hudStroke(banner, 2)
hudBanner = hudText(banner, UDim2.new(), UDim2.fromScale(1, 1), 20, Color3.fromRGB(255, 240, 200), Enum.TextXAlignment.Center)
hudBanner.TextSize = 15
end

-- [코인 카드] 카드 생성 직후 임시 변수 해제.
do
local coinCard = Instance.new("Frame")
coinCard.BackgroundColor3 = NAVY
coinCard.BackgroundTransparency = 0.08
coinCard.AnchorPoint = Vector2.new(1, 0)
coinCard.Position = UDim2.new(1, -8, 0, 8)
coinCard.Size = UDim2.fromOffset(120, 30)
coinCard.Parent = hud
coinCard.Visible = false -- 코인은 왼쪽 카드에 표시
corner(coinCard, 10)
hudStroke(coinCard, 2)
end

-- [항해 도구] 선 조각 임시 아이콘 대신 기존 등록된 원화와 황동 테두리를 쓴다.
-- 시스템 4개는 시설 6개와 색으로 구분한다(같은 원화를 쓰는 곳은 색을 바꿔 중복처럼 안 보이게).
-- [항해 도구] 아이콘 데이터는 바로 아래 H.hudShortcut 메서드에만 유지한다.
do
local HUD_MENU_TINT = {
	view = Color3.fromRGB(196, 222, 246), gear = Color3.fromRGB(196, 222, 246),
	deck = Color3.fromRGB(255, 176, 150), help = Color3.fromRGB(255, 255, 255),
}
local HUD_MENU_ART = {
	gear = "", deck = "", auto = "harbor", help = "",
	view = "view", trade = "trade", crew = "", recruit = "", scholar = "tech", route = "route",
	journal = "map", chart = "map", yard = "yard", explore = "explore",
	codex = "codex", tech = "tech", quest = "quest", battle = "battle", status = "status",
}
function H.hudShortcut(parent, name, key, label, dockItem)
	local button = Instance.new("TextButton")
	button.Name = name
	-- [시설 아이콘] 기존 등록 원화만 투명 배경 위에 표시한다. 클릭 영역·글자·선택 상태는 유지한다.
	button.Size = UDim2.fromOffset(if dockItem then 52 else 44, if dockItem then 64 else 44)
	button.BackgroundColor3 = COLORS.leather
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.Text = ""
	button.AutoButtonColor = false
	corner(button, 8)
	local badgeStroke = Instance.new("UIStroke")
	badgeStroke.Name = "DockBorder"
	badgeStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	badgeStroke.Color = UI_BRASS_DARK
	badgeStroke.Thickness = 1.5
	badgeStroke.Transparency = 1 -- [투명 아이콘] 기존 검사·선택 상태용 객체는 유지하되 외곽 사각 테두리는 그리지 않는다.
	badgeStroke.Parent = button
	button:SetAttribute("ActionLabel", label)
	button.Parent = parent
	local specialGlyph = if key == "tavern" then "tavern" elseif key == "deck" then "gwent"
		elseif key == "journal" then "journal" elseif key == "gear" then "gear"
		elseif key == "help" then "help" elseif key == "status" then "captain" else nil
	local artId = if specialGlyph then nil else AssetIds["Menu/" .. (HUD_MENU_ART[key] or key)]
	-- [메뉴 공통 규격] 시설/시스템 도크는 36px, 개별 버튼은 31px.
	local artSize = if dockItem then 36 else 31
	local artTop = if dockItem then 3 else 4
	if specialGlyph then
		-- [시설·시스템 통일] 투명 황동 아이콘: 주점 잔/카드/기록장/설정/도움말.
		local symbol = modelIcon(button, "Glyph", specialGlyph, nil, artSize, label)
		symbol.Name = "MenuArt"
		symbol.Position = UDim2.new(0.5, -artSize / 2, 0, artTop)
		symbol.ZIndex = 2
	elseif artId then
		for i = 1, 2 do
			local art = Instance.new("ImageLabel")
			art.Name = if i == 1 then "MenuArtShadow" else "MenuArt"
			art.AnchorPoint = Vector2.new(0.5, 0)
			art.Position = UDim2.new(0.5, if i == 1 then 1 else 0, 0, artTop + (if i == 1 then 2 else 0))
			art.Size = UDim2.fromOffset(artSize, artSize)
			art.BackgroundTransparency = 1
			art.Image = "rbxassetid://" .. tostring(artId)
			art.ImageColor3 = if i == 1 then Color3.fromRGB(10, 6, 3) else (HUD_MENU_TINT[key] or Color3.fromRGB(232, 199, 148))
			art.ImageTransparency = if i == 1 then 0.45 else 0
			art.ScaleType = Enum.ScaleType.Fit
			art.ZIndex = i
			art.Parent = button
		end
	else
		button.Text = if key == "help" then "?" elseif key == "gear" then "⚙" else string.sub(label, 1, 1)
		button.TextSize = 34
		button.TextYAlignment = Enum.TextYAlignment.Top
		button.Font = Enum.Font.GothamBlack
		button.TextColor3 = Color3.fromRGB(255, 240, 204)
	end
	if dockItem then
		local caption = Instance.new("TextLabel")
		caption.Name = "MenuName"
		caption.BackgroundTransparency = 1
		caption.Position = UDim2.fromOffset(0, 42)
		caption.Size = UDim2.new(1, 0, 0, 19)
		caption.Font = Enum.Font.GothamBold
		caption.TextSize = 13
		caption.TextWrapped = false
		caption.ZIndex = 3
		caption.TextColor3 = Color3.fromRGB(255, 244, 214)
		caption.Text = label
		caption.Parent = button
		H.shadowOf(caption)
	end
	-- [시설 선택] 배경 박스 대신 아이콘·이름 색으로 현재 시설을 알린다.
	local function paintSelection()
		local selected = button:GetAttribute("SelectedFacility") == true
		local art = button:FindFirstChild("MenuArt")
		if art and art:IsA("ImageLabel") then
			-- [선택 대비] 선택 원화는 밝아지고 기본 원화는 무광 황동으로 차분하게 표시한다.
			art.ImageColor3 = if selected then Color3.fromRGB(255, 238, 192) else (HUD_MENU_TINT[key] or Color3.fromRGB(232, 199, 148))
		elseif art and art:IsA("Frame") and art:GetAttribute("MenuGlyph") then
			-- [선택 색 동기화] 원화뿐 아니라 황동 도형도 같은 선택 강조를 받는다.
			local highlight = if selected then Color3.fromRGB(248, 207, 126) else Color3.fromRGB(226, 174, 84)
			for _, part in art:GetDescendants() do
				if part.Name == "GlyphShape" and part:IsA("Frame") then
					local shine = part:FindFirstChildOfClass("UIGradient")
					if shine then
						shine.Color = if selected then ColorSequence.new(Color3.fromRGB(255, 232, 175), Color3.fromRGB(218, 170, 89))
								else ColorSequence.new(Color3.fromRGB(249, 211, 139), Color3.fromRGB(193, 137, 57))
					else
						part.BackgroundColor3 = highlight
					end
				elseif part.Name == "GlyphOutline" and part:IsA("Frame") then
					local edge = part:FindFirstChildOfClass("UIStroke")
					if edge then edge.Color = highlight end
				elseif (part.Name == "CardSuit" or part.Name == "HelpMark") and part:IsA("TextLabel") then
					part.TextColor3 = highlight
				end
			end
		end
		local caption = button:FindFirstChild("MenuName")
		if caption then caption.TextColor3 = if selected then COLORS.gold else Color3.fromRGB(255, 244, 214) end
	end
	button:GetAttributeChangedSignal("SelectedFacility"):Connect(paintSelection)
	paintSelection()
	local scale = Instance.new("UIScale")
	scale.Parent = button
	button.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			scale.Scale = 0.92
		end
	end)
	button.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			scale.Scale = 1
		end
	end)
	return button
end
end

-- 오른쪽 아이콘은 로블록스 상단 바 높이를 무시하고 화면 맨 위에 붙인다(왼쪽 카드는 기존 위치 유지).
local hudTopGui = Instance.new("ScreenGui")
hudTopGui.Name = "MareEssentiaHudTop"
hudTopGui.ResetOnSpawn = false
hudTopGui.IgnoreGuiInset = true
hudTopGui.DisplayOrder = gui.DisplayOrder
hudTopGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
hudTopGui.Enabled = hud.Visible
hudTopGui.Parent = player:WaitForChild("PlayerGui")
local hudTop = Instance.new("Frame")
hudTop.Name = "HudTop"
hudTop.BackgroundTransparency = 1
hudTop.Size = UDim2.fromScale(1, 1)
hudTop.Parent = hudTopGui
hud:GetPropertyChangedSignal("Visible"):Connect(function()
	hudTopGui.Enabled = hud.Visible and player.PlayerGui:FindFirstChild("TradeHallGui") == nil
end)

local dock = Instance.new("ScrollingFrame")
dock.Name = "Dock"
dock.BackgroundTransparency = 1
dock.BorderSizePixel = 0
dock.AnchorPoint = Vector2.new(1, 0)
dock.Position = UDim2.new(1, -8, 0, 4)
dock.Size = UDim2.fromOffset(228, 164)
dock.CanvasSize = UDim2.new()
dock.AutomaticCanvasSize = Enum.AutomaticSize.Y
dock.ScrollBarThickness = 2
dock.ScrollBarImageColor3 = Color3.fromRGB(186, 141, 99)
dock.ScrollingDirection = Enum.ScrollingDirection.Y
dock.Parent = hudTop
local dockGrid = Instance.new("UIGridLayout")
dockGrid.CellSize = UDim2.fromOffset(52, 64)
dockGrid.CellPadding = UDim2.fromOffset(4, 4)
dockGrid.SortOrder = Enum.SortOrder.LayoutOrder
dockGrid.HorizontalAlignment = Enum.HorizontalAlignment.Right
dockGrid.FillDirectionMaxCells = 4
dockGrid.Parent = dock
local dockLimit = Instance.new("UISizeConstraint")
dockLimit.MaxSize = Vector2.new(300, 200)
dockLimit.Parent = dock

-- [시설 목차] 시설 7곳은 기존 도크 그대로, 세부 기능은 각 시설의 탭 안에만 둔다.
H.DOCK = {
	{ "trade", "교역소", "trade" }, { "route", "항만청", "route" }, { "yard", "조선소", "yard" },
	{ "board", "주점", "tavern" }, { "battle", "전투", "battle" }, { "codex", "서재", "codex" }, { "status", "선장실", "status" },
}
H.dockButtons = {}
for i, d in H.DOCK do
	local b = H.hudShortcut(dock, "Menu_" .. d[1], d[3], d[2], true)
	b.LayoutOrder = i
	H.dockButtons[d[1]] = b
	b.Activated:Connect(function()
		openTab(d[1])
	end)
end

-- [도구 목차] 시설 7곳과 별개인 일지·걷기·내 카드·설정·도움말 5개를 같은 56px 간격으로 정렬한다.
local render
local openOptions
local SYS_Y = 170
local gear = H.hudShortcut(hudTop, "OptionsButton", "gear", "설정", true)
gear.AnchorPoint = Vector2.new(1, 0)
gear.Position = UDim2.new(1, -64, 0, SYS_Y)
do
	local help = H.hudShortcut(hudTop, "HelpButton", "help", "도움말", true)
	help.AnchorPoint = Vector2.new(1, 0)
	help.Position = UDim2.new(1, -8, 0, SYS_Y)
	help.Activated:Connect(function() openOptions(true) end)
	local walk = H.hudShortcut(hudTop, "ViewToggle", "view", "걷기", true)
	walk.AnchorPoint = Vector2.new(1, 0)
	walk.Position = UDim2.new(1, -176, 0, SYS_Y)
	walk.Activated:Connect(function()
		overview = not overview
		local cap = walk:FindFirstChild("MenuName")
		if cap then cap.Text = if overview then "걷기" else "전경" end
		applyView()
	end)
end
gear.Activated:Connect(function()
	Sfx.play("sfx_click")
	openOptions()
end)

-- 개인 저널 창: 지금 할 일(동료 조언)과 진행 목표(의뢰·직업·도감)를 한 화면에 모아 보여 준다 (오른쪽 위 버튼)
do
	local jBtn = H.hudShortcut(hudTop, "JournalButton", "journal", "저널", true)
	jBtn.AnchorPoint = Vector2.new(1, 0)
	jBtn.Position = UDim2.new(1, -232, 0, SYS_Y)
	local open = nil
	local function bar(parent, ratio, color)
		local back = Instance.new("Frame")
		back.Size = UDim2.new(1, 0, 0, 10)
		back.BackgroundColor3 = Color3.fromRGB(190, 168, 128)
		back.BorderSizePixel = 0
		corner(back, 5)
		back.Parent = parent
		local fill = Instance.new("Frame")
		fill.Size = UDim2.fromScale(math.clamp(ratio, 0, 1), 1)
		fill.BackgroundColor3 = color
		fill.BorderSizePixel = 0
		corner(fill, 5)
		fill.Parent = back
		return back
	end
	function H.openJournal()
		if open then
			open:Destroy()
			open = nil
			return
		end
		if not view then return end
		local layer = overlayGui("JournalWindow", 57)
		open = layer
		local function close()
			if open then open:Destroy() open = nil end
		end
		local dim = Instance.new("TextButton")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.5
		dim.Text = ""
		dim.AutoButtonColor = false
		dim.Activated:Connect(close)
		dim.Parent = layer
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.fromScale(0.9, 0.94)
		win.BackgroundColor3 = COLORS.paper
		win.BorderSizePixel = 0
		corner(win, 12)
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(760, 640)
		lim.Parent = win
		win.Parent = layer
		local ws = Instance.new("UIStroke")
		ws.Color = COLORS.brown
		ws.Thickness = 3
		ws.Parent = win
		local title = mkLabel(win, "저널", 26, COLORS.ink, true)
		title.AutomaticSize = Enum.AutomaticSize.None
		title.Position = UDim2.fromOffset(16, 8)
		title.Size = UDim2.new(1, -120, 0, 36)
		local x = mkButton(win, "닫기", COLORS.gold, UDim2.fromOffset(84, 40), close, true)
		x.AnchorPoint = Vector2.new(1, 0)
		x.Position = UDim2.new(1, -12, 0, 8)
		local body = Instance.new("ScrollingFrame")
		body.Position = UDim2.fromOffset(12, 54)
		body.Size = UDim2.new(1, -24, 1, -64)
		body.BackgroundTransparency = 1
		body.BorderSizePixel = 0
		body.CanvasSize = UDim2.new()
		body.AutomaticCanvasSize = Enum.AutomaticSize.Y
		body.ScrollBarThickness = 5
		body.Parent = win
		local lay = Instance.new("UIListLayout")
		lay.Padding = UDim.new(0, 8)
		lay.SortOrder = Enum.SortOrder.LayoutOrder
		lay.Parent = body
		local order = 0
		local function nxt() order += 1 return order end
		local function head(text)
			local h = mkHeader(body, text)
			h.LayoutOrder = nxt()
		end
		local function goal(name, detail, ratio, color)
			local card = Instance.new("Frame")
			card.LayoutOrder = nxt()
			card.Size = UDim2.new(1, -8, 0, 0) -- 소제목(mkHeader)과 같은 너비로 좌우 끝을 맞춘다
			card.AutomaticSize = Enum.AutomaticSize.Y
			card.BackgroundColor3 = Color3.fromRGB(240, 224, 190)
			card.BorderSizePixel = 0
			corner(card, 8)
			local pad = Instance.new("UIPadding")
			pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 8), UDim.new(0, 10), UDim.new(0, 10)
			pad.Parent = card
			local l = Instance.new("UIListLayout")
			l.Padding = UDim.new(0, 4)
			l.SortOrder = Enum.SortOrder.LayoutOrder
			l.Parent = card
			-- 카드 안쪽은 패딩만큼 이미 줄었으므로 줄 너비는 꽉 채운다(1,0): 제목·설명·진행 막대·버튼의 오른쪽 끝이 한 줄로 맞는다
			local n = mkLabel(card, name, 18, COLORS.ink, true, 1)
			n.Size = UDim2.new(1, 0, 0, 0)
			if detail then
				local d = mkLabel(card, detail, 15, COLORS.muted, false, 2)
				d.Size = UDim2.new(1, 0, 0, 0)
			end
			if ratio then bar(card, ratio, color or COLORS.green).LayoutOrder = 3 end
			card.Parent = body
			return card
		end
		-- 1) 지금 할 일
		head("지금 할 일")
		local todo = 0
		for _, c in view.counsel or {} do
			if todo >= 3 then break end
			todo += 1
			local card = goal(string.format("%s의 조언", c.who and c.who.name or "동료"), c.text, nil)
			if c.tab then
				local go = mkButton(card, c.label or "가 보기", COLORS.green, UDim2.new(1, 0, 0, 40), function()
					close()
					H.goAdvice(c.tab)
				end, true)
				go.LayoutOrder = 4
			end
		end
		if todo == 0 then
			goal("할 일이 없어요", "항구를 둘러보고 새 의뢰를 찾아보세요.", nil)
		end
		-- 2) 진행 목표
		head("진행 목표")
		local q = view.tavernQ and view.tavernQ.active
		if q then
			goal("[주점 의뢰] " .. tostring(q.name), string.format("기한 %d일 남음", q.left or 0), nil)
		end
		for _, a in view.quests.active do
			goal(a.name, string.format("%d / %d · 보상 %d코인", math.min(a.progress, a.amount), a.amount, a.rewardCoins), a.progress / math.max(1, a.amount), COLORS.blue)
		end
		local shown = 0
		for _, a in view.quests.available do
			if a.auto and shown < 4 then
				shown += 1
				goal(a.name, string.format("%d / %d", math.min(a.progress or 0, a.amount or 0), a.amount or 0), (a.progress or 0) / math.max(1, a.amount or 1), COLORS.blue)
			end
		end
		for _, c in view.careers or {} do
			goal(string.format("직업 %s Lv.%d", c.name, c.level), string.format("경험치 %d / %d", c.xp, c.nextXp), c.xp / math.max(1, c.nextXp), COLORS.gold)
		end
		local cx = view.codex
		if cx then
			goal("백과 도감", string.format("발견 %d / %d", cx.found, cx.total), cx.found / math.max(1, cx.total), COLORS.green)
		end
		-- 3) 이야기 기록: 겪은 일을 일기처럼 자세히 남긴다 (최근 것이 위)
		head("이야기 기록")
		local logged = 0
		local hv = view.history
		for i = #(hv and hv.recent or {}), 1, -1 do
			local r = hv.recent[i]
			logged += 1
			goal(string.format("%d년  %s", r.year, r.title), "선택: " .. tostring(r.choice), nil)
		end
		for _, sn in (view.chron and view.chron.seen) or {} do
			logged += 1
			goal(string.format("%d년  %s  [%s]", sn.year, sn.title, sn.disc or ""), sn.fact .. (if sn.lore then string.format("\n(%s) %s", sn.loreTag or "소문", sn.lore) else ""), nil)
		end
		for i = #view.quests.done, 1, -1 do
			local d = view.quests.done[i]
			logged += 1
			local text = tostring(d.summary or "")
			if d.ending then text ..= "\n" .. d.ending end
			goal(d.name, text, nil)
		end
		if logged == 0 then
			goal("아직 기록이 없어요", "사람을 만나고 의뢰를 끝내면 이야기가 이곳에 남아요.", nil)
		end
	end
	jBtn.Activated:Connect(function()
		Sfx.play("sfx_click")
		H.openJournal()
	end)
end

-- 개인 카드 창: 내가 가진 카드(주인공·동료·지식·유물·동물·우군·배)와 지도자 능력을 보여 준다 (오른쪽 위 버튼)
do
	local BC = require(Shared:WaitForChild("BoardingCards"))
	local KIND = { crew = "🃏 인물", relic = "💎 유물", animal = "🐾 동물", book = "📖 지식", friend = "🤝 우군", ship = "⚓ 배" }
	local deckBtn = H.hudShortcut(hudTop, "DeckButton", "deck", "내 카드", true)
	deckBtn.AnchorPoint = Vector2.new(1, 0)
	deckBtn.Position = UDim2.new(1, -120, 0, SYS_Y)
	local open = nil
	function H.openDeck(onlyOpen: boolean?)
		if open then
			if onlyOpen then
				return
			end
			open:Destroy()
			open = nil
			return
		end
		local layer = overlayGui("DeckWindow", 56)
		open = layer
		local dim = Instance.new("TextButton")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.5
		dim.Text = ""
		dim.AutoButtonColor = false
		dim.Parent = layer
		dim.Activated:Connect(function()
			layer:Destroy()
			open = nil
		end)
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.fromScale(0.98, 0.96)
		win.BackgroundColor3 = NAVY
		win.BorderSizePixel = 0
		win.Parent = layer
		corner(win, 14)
		hudStroke(win, 2)
		local cons = Instance.new("UISizeConstraint")
		cons.MaxSize = Vector2.new(4000, 3000)
		cons.Parent = win
		local deck = view and view.deck
		local cards = (deck and deck.cards) or {}
		local CBk = require(Shared:WaitForChild("CardBook"))
		local DeckBuilder = require(Shared:WaitForChild("DeckBuilder"))
		local want = {}
		local ui
		local function bookOf() return (view and view.cardbook) or { owned = {}, tier = {}, ids = {} } end
		local function resetWant()
			want = {}
			for _, id in bookOf().ids do want[id] = (want[id] or 0) + 1 end
		end
		local function act(action, payload)
			call(action, payload)
			if open then
				resetWant()
				if ui then ui.refresh(false) end
			end
		end
		local function onWant(id, delta)
			want[id] = (want[id] or 0) + delta
			if want[id] <= 0 then want[id] = nil end
			if ui then ui.refresh(true) end
		end
		local function playCardOnly(title, action, payload, cardCfg)
			if inField then return end
			inField = true
			if open then
				open:Destroy()
				open = nil
			end
			main.Visible = false
			NavalBattle.play({
				shipId = view and view.ship and view.ship.id,
				enemyName = title,
				cardOnly = true,
				card = cardCfg or { prebuilt = nil, title = title },
				deck = view and view.deck,
				onCards = function(acts)
					payload.actions = acts
					local r = call(action, payload)
					return if r and r.ok then "a" else "b"
				end,
				onDone = function()
					inField = false
					main.Visible = true
					render()
				end,
			})
		end
		local function startPractice()
			local bk = bookOf()
			playCardOnly("연습전", "CardPractice", {}, { kind = "boarding", seed = 51, my = {}, foe = {}, book = { ids = bk.practiceIds, tier = {}, bonus = {} } })
		end
		local function startDuel()
			local r = call("CardDuelStart")
			local seed = view and view.cardbook and view.cardbook.duelSeed
			if r and r.ok and seed then
				playCardOnly("카드 대결", "CardDuelEnd", {}, { kind = "boarding", seed = seed, my = {}, foe = {} })
			end
		end
		H.devCards = { duel = startDuel, practice = startPractice }
		-- 전체 카드 목록: 보유한 것을 앞에, 영웅 → 일반 → 특수, 점수 순
		local catalog = {}
		for id in BC.Units do table.insert(catalog, id) end
		for id in BC.Specials do table.insert(catalog, id) end
		local ownedAtOpen = bookOf().owned
		table.sort(catalog, function(x, y)
			local dx, dy = CBk.def(x), CBk.def(y)
			local ox, oy = (ownedAtOpen[x] or 0) > 0, (ownedAtOpen[y] or 0) > 0
			if ox ~= oy then return ox end
			local kx = (dx.hero and 0 or dx.special and 3 or 1)
			local ky = (dy.hero and 0 or dy.special and 3 or 1)
			if kx ~= ky then return kx < ky end
			if (dx.power or 0) ~= (dy.power or 0) then return (dx.power or 0) > (dy.power or 0) end
			return x < y
		end)
		-- 동료·발견 카드 칸(필터 '동료')
		local function buildCrew(frame)
			local lay2 = Instance.new("UIListLayout")
			lay2.Padding = UDim.new(0, 6)
			lay2.Parent = frame
			local head = mkLabel(frame, "동료·발견 카드 (자동으로 합류해요)", 16, Color3.fromRGB(246, 208, 130), true)
			head.Size = UDim2.new(1, -8, 0, 24)
			for _, c in deck and deck.cards or {} do
				local info = BC.SkillInfo[c.skill]
				local unitId = BC.SkillCard[c.skill]
				local unit = unitId and (BC.Units[unitId] or BC.Specials[unitId])
				local unitText = ""
				if unit then
					unitText = if unit.special then "특수 카드" else string.format("%s 줄 · 전투력 %d%s", BC.ROW_NAME[unit.row], unit.power, if unit.hero then " · 영웅" else "")
				end
				local row = mkLabel(frame, string.format("%s  %s\n스킬: %s — %s\n%s", KIND[c.kind] or "🃏", c.name, info and info.name or c.skill, info and info.text or "", unitText), 14, COLORS.text, false)
				row.AutomaticSize = Enum.AutomaticSize.Y
				row.Size = UDim2.new(1, -8, 0, 0)
				row.TextWrapped = true
				row.TextXAlignment = Enum.TextXAlignment.Left
				row.BackgroundTransparency = 0.2
				row.BackgroundColor3 = NAVY2
				corner(row, 8)
				if unit then
					mkButton(frame, "전투 카드 펼치기", COLORS.blue, UDim2.new(1, -8, 0, 38), function()
						H.showCombatCard(unit, c.name, info)
					end)
				end
			end
		end
		local galleryCtx = {
			CB = CBk, BC = BC, AssetIds = AssetIds, artKey = NavalBattle.cardArtworkKey, overlay = win,
			getBook = bookOf, getWant = function() return want end,
			onWant = function(id, delta) onWant(id, delta) end,
			onUpgrade = function(id) act("CardUpgrade", { id = id }) end,
		}
		resetWant()
		ui = DeckBuilder.build(win, {
			CB = CBk, BC = BC, AssetIds = AssetIds, artKey = NavalBattle.cardArtworkKey,
			catalog = catalog, galleryCtx = galleryCtx,
			getBook = bookOf, getView = bookOf, getWant = function() return want end,
			onWant = onWant, act = act, startPractice = startPractice, startDuel = startDuel,
			buildExtra = buildCrew,
			onClose = function()
				if open then
					open:Destroy()
					open = nil
				end
			end,
		})
	end
	deckBtn.Activated:Connect(function()
		Sfx.play("sfx_click")
		H.openDeck()
	end)
end

H.hudCalendar = {
	months = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 },
	seasons = { "겨울", "봄", "여름", "가을" },
	voyage = require(Shared:WaitForChild("Voyage")),
}
function H.updateHud(p, ship)
	local calendar = H.hudCalendar
	local day = math.floor(p.day or 0)
	local monthDay = day % 365 + 1
	local month = 1
	while monthDay > calendar.months[month] do
		monthDay -= calendar.months[month]
		month += 1
	end
	local port = PortData.Ports[p.portId]
	local season = calendar.seasons[calendar.voyage.season(day, port and port.lat or 0)]
	H.hudName.Text = string.format("%d년 %d월 %d일 · %s", p.year, month, monthDay, season)
	H.hudPort.Text = tostring(p.portName) .. " · " .. tostring(ship.name)
	hudBanner.Text = tostring(p.portName)
	hullFill.Size = UDim2.fromScale(math.clamp(ship.hull / math.max(1, ship.maxHull), 0, 1), 1)
	hullText.Text = string.format("선체 %d/%d", math.floor(ship.hull), math.floor(ship.maxHull))
	hullFill.BackgroundColor3 = if ship.hull / math.max(1, ship.maxHull) < 0.35 then Color3.fromRGB(255, 80, 40) else Color3.fromRGB(214, 40, 36)
	H.hudShip.Text = string.format("화물 %d/%d · 명성 %d", ship.cargoUsed, ship.cargoCapacity, p.fame)
	H.hudCoin.Text = tostring(p.coins) .. " 코인"
end

-- 화면 중앙 상단 동료 말풍선: 게임을 시작하거나 새 항구에 닿으면 동료가 인사하고 앞으로 할 일을 조언한다.
local bubble = Instance.new("Frame")
bubble.Name = "CompanionBubble"
bubble.AnchorPoint = Vector2.new(0.5, 0)
bubble.Position = UDim2.new(0.5, 0, 0, 8)
bubble.Size = UDim2.new(0.34, 0, 0, 0)
bubble.AutomaticSize = Enum.AutomaticSize.Y
bubble.BackgroundColor3 = NAVY
bubble.BackgroundTransparency = 0.05
bubble.Visible = false
bubble.Active = true
bubble.ZIndex = 20
bubble.Parent = hud
corner(bubble, 12)
hudStroke(bubble, 2)
do
	local function layoutBubble()
		local width, height = hud.AbsoluteSize.X, hud.AbsoluteSize.Y
		local compact = width < 610
		-- 오른쪽 위: 시설 6개 한 줄, 그 아래 시스템 5개를 같은 칸(오른쪽 4칸)에 맞춰 둔다.
		local CW, CH, GAP = 44, 58, 4
		local cols = if compact then 3 else 6
		dockGrid.FillDirectionMaxCells = cols
		dockGrid.CellSize = UDim2.fromOffset(CW, CH)
		dockGrid.CellPadding = UDim2.fromOffset(GAP, GAP)
		local rows = math.ceil(6 / cols)
		local dockH = rows * CH + (rows - 1) * GAP
		dock.Position = UDim2.new(1, -8, 0, 6)
		dock.Size = UDim2.fromOffset(cols * CW + (cols - 1) * GAP, dockH)
		local sysOrder = { "HelpButton", "OptionsButton", "DeckButton", "JournalButton", "ViewToggle" } -- 저널도 같은 칸에 맞춘다 (빠지면 혼자 제자리에 남아 줄이 어긋난다)
		for i, n in sysOrder do
			local b = hudTop:FindFirstChild(n)
			if b then
				b.Size = UDim2.fromOffset(CW, CH)
				b.AnchorPoint = Vector2.new(1, 0)
				local col = (i - 1) % cols
				local row = math.floor((i - 1) / cols)
				b.Position = UDim2.new(1, -8 - col * (CW + GAP), 0, 6 + dockH + GAP + row * (CH + GAP))
			end
		end
		card.Position = UDim2.fromOffset(8, if width < 405 then 51 else 8)
		card.Size = UDim2.fromOffset(if compact then 252 else 262, 114)
		-- [모바일 조언] 상단 메뉴 아이콘보다 아래에 한 줄로 펼쳐 작은 화면에서도 읽고 누를 수 있게 한다.
		local left = if width < 1050 then 8 else 282
		local right = if width < 1050 then 8 else 304
		local bubbleWidth = math.clamp(width - left - right, 1, 760)
		bubble.AnchorPoint = Vector2.new(0, 0)
		bubble.Position = UDim2.fromOffset(left + math.max(0, (width - left - right - bubbleWidth) / 2),
			if width < 610 then 262 elseif width < 1050 then 142 else 8)
		bubble.Size = UDim2.fromOffset(bubbleWidth, 0)
	end
	hud:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutBubble)
	layoutBubble()
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 8), UDim.new(0, 10), UDim.new(0, 10)
	pad.Parent = bubble
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 3)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = bubble
end
local function bubbleLabel(order, textSize, color)
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Size = UDim2.new(1, 0, 0, 0)
	l.AutomaticSize = Enum.AutomaticSize.Y
	l.Font = Enum.Font.GothamMedium
	l.TextSize = textSize
	l.TextColor3 = color
	l.TextWrapped = true
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.RichText = false
	l.Text = ""
	l.LayoutOrder = order
	l.ZIndex = 21
	l.Parent = bubble
	return l
end
H.bubbleWho = bubbleLabel(1, 19, COLORS.gold)
H.bubbleLine = bubbleLabel(2, 18, COLORS.text)
H.bubbleAdvice = bubbleLabel(3, 17, Color3.fromRGB(190, 230, 200))
local bubbleNext = bubbleLabel(4, 15, COLORS.muted)
-- 동료 조언 말풍선의 행동 버튼: 누르면 그 화면(조선소·교역소 등)으로 바로 간다
local function bubbleButton(order, color)
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(1, 0, 0, 42)
	b.LayoutOrder = order
	b.BackgroundColor3 = color
	b.TextColor3 = Color3.fromRGB(250, 246, 235)
	b.Font = Enum.Font.GothamBold
	b.TextSize = 18
	b.ZIndex = 22
	b.AutoButtonColor = true
	b.Visible = false
	b.BorderSizePixel = 0
	b.Parent = bubble
	corner(b, 6)
	return b
end
H.bubbleGo = bubbleButton(5, Color3.fromRGB(70, 130, 84))
H.bubbleSkip = bubbleButton(6, Color3.fromRGB(96, 96, 104))
do
	local textSizes = {
		[H.hudName] = 16, [H.hudCoin] = 16, [H.hudPort] = 15, [H.hudShip] = 14,
		[H.bubbleWho] = 19, [H.bubbleLine] = 18, [H.bubbleAdvice] = 17, [bubbleNext] = 16, -- 알림은 메뉴와 경쟁하지 않도록 간결하게
	}
	local function updateSize()
		local extra = if player:GetAttribute("LargeHudText") then 3 else 0
		for label, size in textSizes do
			label.TextSize = size + extra
		end
	end
	player:GetAttributeChangedSignal("LargeHudText"):Connect(updateSize)
	updateSize()
end
-- [글씨 하한] 화면 어디서 만든 글씨든 15보다 작으면 15로 올린다 (대화·이벤트·시작 화면 포함).
do
	local FLOOR = 15
	local function lift(obj)
		if (obj:IsA("TextLabel") or obj:IsA("TextButton") or obj:IsA("TextBox")) and not obj.TextScaled and obj.TextSize < FLOOR then
			obj.TextSize = FLOOR
		end
	end
	local gui = player:WaitForChild("PlayerGui")
	for _, d in gui:GetDescendants() do
		lift(d)
	end
	gui.DescendantAdded:Connect(lift)
end
local bubbleKey, bubbleToken = nil, 0
local adviceLastShownAt, adviceLastPort = -math.huge, nil
function H.hideBubble()
	bubbleToken += 1
	bubble.Visible = false
	-- [조언 닫기] 말풍선을 닫았으면 메뉴 아이콘의 가리킴 효과도 즉시 해제한다.
	if H.setGuidePulse then H.setGuidePulse(nil) end
end
bubble.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
		H.hideBubble()
	end
end)
-- 길잡이 가리킴: 지금 눌러야 할 메뉴 버튼이 금빛으로 맥동하며 살짝 흔들린다 (참고: 흔들리는 버튼·움직이는 화살표로 시선을 이끄는 튜토리얼 관례).
-- 오래 쓰면 거슬리므로 초반 길잡이(g_...)에서만 켜고, 다른 조언으로 넘어가거나 닫으면 끈다.
-- [메뉴 길찾기] 실제 기능이 속한 시설을 가리킨다. 카드를 여는 도구와 카드 대결 시설을 혼동하지 않는다.
local GUIDE_BTN = {
	trade = "Menu_trade", harbor = "Menu_trade",
	route = "Menu_route", map = "Menu_route", yard = "Menu_yard",
	board = "Menu_board", quest = "Menu_board", recruit = "Menu_board",
	battle = "Menu_battle", explore = "Menu_battle", war = "Menu_battle", gwent = "Menu_battle",
	tech = "Menu_codex", codex = "Menu_codex", scholar = "Menu_codex",
	crew = "Menu_status", status = "Menu_status",
}
local guidePulseToken = 0
function H.setGuidePulse(tab)
	guidePulseToken += 1
	local token = guidePulseToken
	for _, holder in { dock, hudTop } do
		for _, n in GUIDE_BTN do
			local b = holder:FindFirstChild(n)
			local old = b and b:FindFirstChild("GuidePulse")
			if old then old:Destroy() end
			if b then b.Rotation = 0 end
		end
	end
	local name = tab and GUIDE_BTN[tab]
	if not name then return end
	local b = dock:FindFirstChild(name) or hudTop:FindFirstChild(name)
	if not b then return end
	local stroke = Instance.new("UIStroke")
	stroke.Name = "GuidePulse"
	stroke.Color = Color3.fromRGB(255, 214, 96)
	stroke.Thickness = 3
	stroke.Parent = b
	task.spawn(function()
		local t0 = os.clock()
		while guidePulseToken == token and b.Parent do
			local t = os.clock() - t0
			stroke.Thickness = 3 + math.abs(math.sin(t * 4)) * 3
			b.Rotation = math.sin(t * 9) * 4 * math.max(0, math.sin(t * 1.5)) -- 숨 쉬듯 이따금 흔들림
			task.wait(0.03)
		end
		if stroke.Parent then stroke:Destroy() end
		if b.Parent then b.Rotation = 0 end
	end)
end
local function refreshBubble()
	local adv = view and view.advice
	if not adv or not hud.Visible or main.Visible or newGameMode or inField then
		H.hideBubble()
		return
	end
	local counsel = view.counsel and view.counsel[1]
	-- [안내 통합] 초반 길잡이는 첫걸음·저널에서만 본다. 상단에 같은 설명을 두 번 띄우지 않는다.
	if not counsel or string.sub(tostring(counsel.id), 1, 2) == "g_" then
		bubbleKey = nil
		H.bubbleCounsel = nil
		H.hideBubble()
		return
	end
	local urgent = counsel.id == "hull_low" or counsel.id == "hull_low_far"
		or counsel.id == "supplies_low" or counsel.id == "crew_low"
	if H.tutorialGoalActive and not urgent then
		H.hideBubble()
		return
	end
	local portId = view.player and view.player.portId
	local key = tostring(portId) .. "|" .. tostring(counsel.id)
	if key == bubbleKey then
		return
	end
	-- [알림 절제] 평상시 조언은 항구별 한 번, 최소 150초 간격. 긴급 보급·선체 경고는 즉시 알린다.
	if not urgent and (adviceLastPort == portId or os.clock() - adviceLastShownAt < 150) then
		H.hideBubble()
		return
	end
	bubbleKey = key
	H.bubbleCounsel = counsel
	H.setGuidePulse(nil)
	H.bubbleWho.Text = string.format("💬 %s (%s)", counsel.who.name, counsel.who.role or "동료")
	H.bubbleLine.Text = "\"" .. counsel.text .. "\""
	H.bubbleAdvice.Text = ""
	bubbleNext.Text = ""
	bubbleNext.Visible = false
	H.bubbleGo.Text = "▶ " .. (counsel.label or "자세히 보기")
	H.bubbleGo.Visible = counsel.tab ~= nil
	H.bubbleSkip.Text = if counsel.dismissable then "알겠어요" else "나중에"
	H.bubbleSkip.Visible = true
	adviceLastShownAt = os.clock()
	if not urgent then adviceLastPort = portId end
	bubbleToken += 1
	local token = bubbleToken
	bubble.Visible = true
	task.delay(if urgent then 18 else 12, function()
		if bubbleToken == token then H.hideBubble() end
	end)
end

menuToggle:GetPropertyChangedSignal("Visible"):Connect(function()
	hud.Visible = menuToggle.Visible
	if hud.Visible then
		refreshBubble()
	end
end)

function H.clearContent()
	for _, child in content:GetChildren() do
		if not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
end

-- 서버 호출 -----------------------------------------------------------------

local tradeHallRefresh -- 교역소 별도 화면이 열려 있으면 서버 응답 뒤에 다시 그린다

local lastCallAt = 0
local function call(action, payload)
	-- 앞선 요청이 끝나길 잠깐 기다린다 (버튼을 눌렀는데 아무 반응이 없던 문제 방지). 너무 오래 걸리면 풀어 준다.
	local waited = 0
	while busy and waited < 8 do
		task.wait(0.1)
		waited += 0.1
	end
	-- 서버는 0.1초 안에 온 요청을 거절하므로 간격을 둔다
	local gap = os.clock() - lastCallAt
	if gap < 0.13 then
		task.wait(0.13 - gap)
	end
	busy = true
	local done, ok, result = false, false, nil
	task.spawn(function()
		ok, result = pcall(function()
			return remote:InvokeServer(action, payload or {})
		end)
		done = true
	end)
	local t = 0
	while not done and t < 15 do
		task.wait(0.05)
		t += 0.05
	end
	busy = false
	lastCallAt = os.clock()
	if not done then
		message, messageOk = "서버 응답이 늦어요. 잠시 후 다시 눌러 주세요", false
		render()
		return nil
	end
	if DEBUG_LOG then print("[Game] call", action, ok, type(result) == "table" and result.ok, type(result) == "table" and result.message or result) end
	if not ok or type(result) ~= "table" then
		message, messageOk = "서버와 연결하지 못했어요", false
		render()
		return nil
	end
	do
		local good = result.ok
		local snd = nil
		if not good then
			snd = if result.message and result.message ~= "" and result.message ~= "너무 빨라요" then "sfx_error" else nil
		elseif action == "Buy" or action == "MarketBuy" then
			snd = "sfx_buy"
			task.delay(0.18, Sfx.play, "sfx_cargo_drop", 0.7)
			-- [발동 효과] 협상 성공 시 금화 효과음을 별도로 들려준다.
			if action == "Buy" and string.find(result.message or "", "자동 흥정 성공", 1, true) then
				task.delay(0.28, Sfx.play, "sfx_coin", 0.85)
			end -- 짐 싣는 소리
		elseif action == "Sell" or action == "Smuggle" or action == "MarketPost" then
			snd = "sfx_sell"
			task.delay(0.12, Sfx.play, "sfx_coin_pouch", 0.7) -- 동전 주머니
		elseif action == "TurnInContract" then
			snd = "sfx_contract_stamp"
		elseif action == "TurnInBounty" or action == "MailClaim" or action == "Audience" or action == "Recruit" then
			snd = "sfx_fanfare"
		elseif action == "BuyGear" or action == "ToggleGear" then
			snd = "sfx_equipment_wear"
		elseif action == "BuyShip" or action == "BuyEscort" or action == "Invest" or action == "Feast" then
			snd = "sfx_coin"
		elseif action == "Repair" then
			snd = "sfx_workshop_chop" -- 조선소 망치질
		elseif action == "HistoryChoose" then
			snd = "sfx_horn" -- 수동 출항 효과음은 이벤트가 끝난 후 sail()에서 재생
		elseif action == "Accept" then
			snd = "sfx_quest_accept"
		elseif action == "PlayStory" then
			snd = "sfx_bell" -- 이야기의 시작을 알리는 종
		elseif action == "Claim" or action == "TurnIn" then
			snd = "sfx_quest_reward" -- 퀘스트 완료
			task.delay(0.9, Sfx.play, "sfx_quest_book_close", 0.7) -- 의뢰 장부를 덮는 소리
		elseif action == "IntroCompanion" then
			snd = "sfx_fanfare" -- 새 동료
		elseif action == "IntroName" then
			snd = "sfx_buy" -- 장부에 도장 찍는 소리
		elseif action == "TavernDrink" then
			snd = "sfx_coin_pouch" -- 술값을 치르는 소리
			task.delay(0.25, Sfx.play, "sfx_ship_cabin_door", 0.25) -- 잔이 놓이는 소리 대용
		elseif action == "TavernPick" then
			snd = "sfx_quest_accept"
		elseif action == "TavernAbandon" or action == "TavernDecline" then
			snd = "sfx_quest_book_close"
		elseif action == "TavernRumor" or action == "Rumor" then
			snd = "sfx_book_turn"
		elseif action == "TavernStranger" then
			snd = "sfx_ship_cabin_door"
		elseif action == "TavernTalk" or action == "Talk" or action == "TalkChoice" or action == "PeopleTalk" then
			snd = "sfx_ui_select"
		elseif action == "TavernJob" then
			snd = "sfx_quest_reward"
			task.delay(0.9, Sfx.play, "sfx_quest_book_close", 0.7)
		elseif action == "Resupply" or action == "HireCrew" or action == "BuySupplies" then
			snd = "sfx_cargo_drop"
		elseif action == "BuyCannon" or action == "BuyPlating" then
			snd = "sfx_workshop_chop"
		elseif action == "Research" or action == "StudyKnowledgeCard" or action == "ReportKnowledge" or action == "BuyMap" then
			snd = "sfx_book_turn"
			if action == "ReportKnowledge" then
				task.delay(0.35, Sfx.play, "sfx_quest_book_close", 0.5)
			end
		elseif action == "Explore" or action == "Visit" then
			snd = "sfx_deck_step"
		elseif action == "CardSetDeck" or action == "CardSlotSave" or action == "CardSlotUse" or action == "CardAutoDeck" or action == "CardRecommend" or action == "CardSetLeader" then
			snd = "sfx_card_place"
		elseif action == "CardUpgrade" or action == "UpgradeCodexCard" or action == "CardPick" or action == "ClaimCollection" then
			snd = "sfx_card_magic"
		end
		local msg = result.message or ""
		if not snd and string.find(msg, "퀘스트 조건 달성", 1, true) then
			snd = "sfx_bell"
		elseif (action == "Claim" or action == "Accept") and string.find(msg, "+", 1, true) and string.find(msg, "코인", 1, true) then
			task.delay(0.5, Sfx.play, "sfx_coin") -- 보상 코인이 들어오는 소리
		end
		if snd then
			Sfx.play(snd)
		end
		if good and string.find(msg, "보물", 1, true) then
			task.delay(0.4, Sfx.play, "sfx_treasure_chest", 0.8)
		end
	end
	if result.scene and action ~= "Sail" then
		-- 발견 연출 역시 이야기·항해가 모두 끝난 뒤에 띄운다.
		local sceneId = result.scene
		task.spawn(function()
			local pg = player:WaitForChild("PlayerGui")
			while player.Parent and (sceneHold or inField or H.questScenesPlaying or H.sceneBusy
				or pg:FindFirstChild("StoryScene", true) or pg:FindFirstChild("WonderScene", true)) do
				task.wait(0.2)
			end
			if player.Parent then H.playWonderScene(sceneId) end
		end)
	end
	if result.ranking then
		ranking = result.ranking
	end
	if result.mail then
		mailBox = result.mail
	end
	if result.market then
		marketList = result.market
	end
	if result.view then
		view = result.view
		if currentTab ~= "battle" then
			equipped = nil
		end
		refreshBubble()
		if H.checkNewCards then H.checkNewCards() end
		if view.scenes and #view.scenes > 0 and H.playQuestScenes then H.playQuestScenes(view.scenes) end
	end
	if result.message and result.message ~= "" then
		message, messageOk = result.message, result.ok
	end
	render()
	if tradeHallRefresh then
		tradeHallRefresh()
	end
	if H.cabinRefresh then
		H.cabinRefresh()
	end
	-- 이긴 뒤 카드 고르기 보상이 생기면 덱 창을 열어 준다
	-- (같은 보상은 한 번만 연다: 안 고르고 다른 행동을 해도 창이 계속 뜨지 않게)
	local pickIds = view and view.cardbook and view.cardbook.pick
	if pickIds == nil then
		H.deckPickShown = nil
	end
	if result.ok and action ~= "CardPick" and pickIds and H.openDeck and not inField then
		local pickKey = table.concat(pickIds, ",")
		if H.deckPickShown ~= pickKey then
			H.deckPickShown = pickKey
			task.delay(1.5, function()
				if view and view.cardbook and view.cardbook.pick and not inField then H.openDeck(true) end
			end)
		end
	end
	-- 해전을 했다면 전투 기록을 3D 장면으로 보여 준다
	if result.ok and (action == "Hunt" or action == "ChallengeBoss" or action == "WarStart" or action == "WarNext" or action == "TavernJob") and view and view.lastBattle and not inField then
		local lb = view.lastBattle
		local resolved = false
		inField = true
		main.Visible = false
		audioLock = true
		Sfx.music("music_battle")
		-- 포격·착탄·파도·선체 충격음은 실제 해전 3D 장면에 맞춰 재생한다.
		NavalBattle.play({
			shipId = view.ship and view.ship.id,
			shipName = view.ship and view.ship.name,
			fleetIds = (function()
				local ids = {}
				for _, f in (view.fleet and view.fleet.ships) or {} do
					table.insert(ids, f.id)
				end
				return ids
			end)(),
			fleet = (function()
				local names = {}
				for _, f in (view.fleet and view.fleet.ships) or {} do
					table.insert(names, f.name)
				end
				for _ = 1, (view.fleet and view.fleet.escorts) or 0 do
					table.insert(names, "호위함")
				end
				return names
			end)(),
			weatherName = view.weather and view.weather.name,
			advisorName = (function()
				for _, c in (view.companions and view.companions.list) or {} do
					if c.joined then return c.name end
				end
				return nil
			end)(),
			wind = view.weather and view.weather.wind,
			windAngle = ((view.weather and string.byte(view.weather.id or "x", 1) or 0) * 47) % 360,
			enemyName = lb.enemy,
			log = lb.log,
			winner = lb.winner,
			reason = lb.reason,
			isBoss = action == "ChallengeBoss",
			sim = if lb.pending then lb.sim else nil, -- 실시간 해전: 서버 판정·저장 규칙을 유지한다
			onResult = function(claim)
				call("NavalResult", claim)
				return view and view.lastBattle and view.lastBattle.winner
			end,
			canFlee = lb.canFlee == true,
			onFlee = function()
				resolved = true
				call("ResolveBattle", { flee = true })
				return view ~= nil and view.lastBattle ~= nil and view.lastBattle.fled == true
			end,
			onDone = function(flairScore)
				if flairScore and flairScore > 0 and not lb.pending then
					task.spawn(function()
						call("BattleFlair", { score = flairScore })
					end)
				end
				if lb.pending and not resolved then
					resolved = true
					call("ResolveBattle", { flee = false })
				end
				inField = false
				audioLock = false
				local finalWinner = (view and view.lastBattle and view.lastBattle.winner) or lb.winner
				Sfx.play(if finalWinner == "a" then "sfx_fanfare" else "sfx_error")
				Sfx.music(if finalWinner == "a" then Sfx.questEndMusic(true) else Sfx.questEndMusic(false))
				applyView()
				main.Visible = true
				render()
				task.delay(1.6, function()
					if view and view.war and view.war.next and not inField then
						call("WarNext")
					end
				end)
			end,
		})
	end
	return result
end
H.call = call
H.bubbleGo.Activated:Connect(function()
	local cs = H.bubbleCounsel
	if cs then
		H.hideBubble()
		H.goAdvice(cs.tab)
	end
end)
H.bubbleSkip.Activated:Connect(function()
	local cs = H.bubbleCounsel
	if cs then
		H.hideBubble()
		-- [나중에] 상황 경고는 서버의 영구 완료 목록에 넣지 않고 이번 표시만 닫는다.
		if cs.dismissable then
			H.call("AdviceDone", { id = cs.id })
		end
	end
end)

local function amount()
	return AMOUNTS[amountIndex]
end

-- 항해 연출: 바다 위를 달리는 배, 날아다니는 갈매기, 일렁이는 파도 ----------------------

local RunService = game:GetService("RunService")

local function hypot(a, b) -- Luau에는 math.hypot이 없다
	return math.sqrt(a * a + b * b)
end

local function mkBox(parent, pos, size, color, alpha)
	local f = Instance.new("Frame")
	f.Position = pos
	f.Size = size
	f.BackgroundColor3 = color
	f.BackgroundTransparency = alpha or 0
	f.BorderSizePixel = 0
	f.Parent = parent
	return f
end

local MAP_RATIO = (Geo.cols * 0.66) / Geo.rows
local function geoX(lon) return (lon - Geo.lonMin) / (Geo.lonMax - Geo.lonMin) end
local function geoY(lat) return (Geo.latMax - lat) / (Geo.latMax - Geo.latMin) end

local function drawLand(frame)
	for _, st in Geo.landStrips do
		local land = Instance.new("Frame")
		land.Position = UDim2.fromScale(st[2] / Geo.cols, st[1] / Geo.rows)
		land.Size = UDim2.fromScale((st[3] - st[2]) / Geo.cols, 1 / Geo.rows + 0.002)
		land.BackgroundColor3 = Color3.fromRGB(122, 140, 96)
		land.BorderSizePixel = 0
		land.Parent = frame
	end
end

function H.playVoyage(fromName, toName, days, steam, path)
	local overlay = Instance.new("TextButton") -- 누르면 건너뛰기
	overlay.Name = "VoyageScene"
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.Text = ""
	overlay.AutoButtonColor = false
	overlay.BackgroundColor3 = Color3.fromRGB(120, 180, 225)
	overlay.BorderSizePixel = 0
	overlay.ZIndex = 50
	local layer = overlayGui("Overlay", 20)
	overlay.Parent = layer
	overlay.Destroying:Connect(function() task.defer(function() layer:Destroy() end) end)

	-- 하늘 위쪽, 바다 아래쪽
	mkBox(overlay, UDim2.fromScale(0, 0.5), UDim2.fromScale(1, 0.5), Color3.fromRGB(34, 96, 150))
	mkBox(overlay, UDim2.fromScale(0, 0.5), UDim2.new(1, 0, 0, 2), Color3.fromRGB(220, 240, 255), 0.3)
	mkBox(overlay, UDim2.fromScale(0.78, 0.12), UDim2.fromOffset(46, 46), Color3.fromRGB(255, 236, 170)).Parent = overlay -- 해
	local sun = overlay:GetChildren()[#overlay:GetChildren()]
	local sc = Instance.new("UICorner")
	sc.CornerRadius = UDim.new(1, 0)
	sc.Parent = sun

	-- 구름
	local clouds = {}
	for i = 1, 3 do
		local c = mkBox(overlay, UDim2.fromScale(0.2 * i + 0.1, 0.08 + 0.07 * i), UDim2.fromOffset(70 + 20 * i, 16), Color3.new(1, 1, 1), 0.25)
		local cc = Instance.new("UICorner")
		cc.CornerRadius = UDim.new(1, 0)
		cc.Parent = c
		table.insert(clouds, c)
	end

	-- 파도 줄무늬
	local waves = {}
	for i = 1, 14 do
		local w = mkBox(overlay, UDim2.fromScale((i * 0.37) % 1, 0.54 + (i % 7) * 0.065), UDim2.fromOffset(40 + (i % 3) * 18, 3), Color3.new(1, 1, 1), 0.6)
		table.insert(waves, { f = w, speed = 0.12 + (i % 4) * 0.05 })
	end

	-- 배 (도형으로 그린 범선)
	local ship = Instance.new("Frame")
	ship.AnchorPoint = Vector2.new(0.5, 0.8)
	ship.Position = UDim2.fromScale(0.5, 0.56)
	ship.Size = UDim2.fromOffset(150, 120)
	ship.BackgroundTransparency = 1
	ship.Parent = overlay
	local hull = mkBox(ship, UDim2.fromOffset(10, 86), UDim2.fromOffset(130, 26), Color3.fromRGB(110, 70, 40))
	local hc = Instance.new("UICorner")
	hc.CornerRadius = UDim.new(0.45, 0)
	hc.Parent = hull
	mkBox(ship, UDim2.fromOffset(10, 90), UDim2.fromOffset(130, 3), Color3.fromRGB(224, 170, 69))
	mkBox(ship, UDim2.fromOffset(72, 8), UDim2.fromOffset(4, 80), Color3.fromRGB(70, 45, 28)) -- 돛대
	mkBox(ship, UDim2.fromOffset(78, 14), UDim2.fromOffset(46, 34), Color3.fromRGB(245, 238, 220))
	mkBox(ship, UDim2.fromOffset(78, 52), UDim2.fromOffset(52, 30), Color3.fromRGB(235, 226, 204))
	mkBox(ship, UDim2.fromOffset(30, 34), UDim2.fromOffset(38, 46), Color3.fromRGB(240, 232, 212))
	mkBox(ship, UDim2.fromOffset(76, 2), UDim2.fromOffset(18, 8), Color3.fromRGB(214, 82, 76)) -- 깃발
	local smoke = {}
	if steam then
		mkBox(ship, UDim2.fromOffset(112, 56), UDim2.fromOffset(12, 30), Color3.fromRGB(60, 60, 66))
		for i = 1, 4 do
			local p = mkBox(ship, UDim2.fromOffset(112, 50), UDim2.fromOffset(14, 14), Color3.fromRGB(190, 190, 195), 0.3)
			local pc = Instance.new("UICorner")
			pc.CornerRadius = UDim.new(1, 0)
			pc.Parent = p
			table.insert(smoke, p)
		end
	end

	-- 갈매기: 두 날개(회전하는 얇은 막대)가 퍼덕인다
	local gulls = {}
	for i = 1, 5 do
		local g = Instance.new("Frame")
		g.BackgroundTransparency = 1
		g.AnchorPoint = Vector2.new(0.5, 0.5)
		g.Size = UDim2.fromOffset(34, 14)
		g.Parent = overlay
		local l = mkBox(g, UDim2.fromOffset(0, 6), UDim2.fromOffset(18, 3), Color3.new(1, 1, 1))
		local r = mkBox(g, UDim2.fromOffset(16, 6), UDim2.fromOffset(18, 3), Color3.new(1, 1, 1))
		l.AnchorPoint, r.AnchorPoint = Vector2.new(1, 0.5), Vector2.new(0, 0.5)
		l.Position, r.Position = UDim2.fromOffset(17, 7), UDim2.fromOffset(17, 7)
		table.insert(gulls, { f = g, l = l, r = r, y = 0.1 + 0.07 * i, phase = i * 1.3, speed = 0.09 + 0.03 * (i % 3), x0 = (i * 0.23) % 1 })
	end

	-- 오른쪽 위 작은 지도: 바닷길을 따라 배 표시가 움직인다
	local inset = mkBox(overlay, UDim2.new(1, -10, 0, 46), UDim2.fromOffset(190, 190 / MAP_RATIO), Color3.fromRGB(38, 82, 120))
	inset.AnchorPoint = Vector2.new(1, 0)
	inset.ClipsDescendants = true
	inset.ZIndex = 52
	drawLand(inset)
	local cum, total = { 0 }, 0
	for i = 1, #path - 1 do
		total += hypot((path[i + 1][1] - path[i][1]), (path[i + 1][2] - path[i][2]) * 0.66)
		cum[i + 1] = total
		for kk = 0, 6 do
			local f = kk / 6
			local dp = mkBox(inset, UDim2.fromScale(geoX(path[i][2] + (path[i + 1][2] - path[i][2]) * f), geoY(path[i][1] + (path[i + 1][1] - path[i][1]) * f)), UDim2.fromOffset(2, 2), Color3.fromRGB(255, 226, 120))
			dp.AnchorPoint = Vector2.new(0.5, 0.5)
		end
	end
	local marker = mkBox(inset, UDim2.fromScale(geoX(path[1][2]), geoY(path[1][1])), UDim2.fromOffset(9, 9), COLORS.red)
	marker.AnchorPoint = Vector2.new(0.5, 0.5)
	marker.ZIndex = 53
	local mc = Instance.new("UICorner")
	mc.CornerRadius = UDim.new(1, 0)
	mc.Parent = marker

	-- 안내 글자와 진행 막대
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.new(0, 0, 0, 14)
	title.Size = UDim2.new(1, 0, 0, 26)
	title.Font = Enum.Font.GothamBold
	title.TextSize = 20
	title.TextColor3 = Color3.new(1, 1, 1)
	title.Text = string.format("%s → %s", fromName, toName)
	title.ZIndex = 51
	title.Parent = overlay
	local dayLabel = Instance.new("TextLabel")
	dayLabel.BackgroundTransparency = 1
	dayLabel.Position = UDim2.new(0, 0, 1, -60)
	dayLabel.Size = UDim2.new(1, 0, 0, 20)
	dayLabel.Font = Enum.Font.Gotham
	dayLabel.TextSize = 14
	dayLabel.TextColor3 = Color3.fromRGB(230, 240, 250)
	dayLabel.ZIndex = 51
	dayLabel.Parent = overlay
	local barBack = mkBox(overlay, UDim2.new(0.1, 0, 1, -34), UDim2.new(0.8, 0, 0, 6), Color3.fromRGB(20, 50, 80))
	local bar = mkBox(barBack, UDim2.fromScale(0, 0), UDim2.fromScale(0, 1), Color3.fromRGB(224, 170, 69))
	local hint = Instance.new("TextLabel")
	hint.BackgroundTransparency = 1
	hint.Position = UDim2.new(0, 0, 1, -22)
	hint.Size = UDim2.new(1, 0, 0, 16)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 11
	hint.TextColor3 = Color3.fromRGB(200, 215, 230)
	hint.Text = "화면을 누르면 건너뛰어요"
	hint.ZIndex = 51
	hint.Parent = overlay

	local DURATION = math.clamp(2 + days * 0.4, 3, 6)
	local skipped = false
	overlay.Activated:Connect(function() skipped = true end)
	local t = 0
	while t < DURATION and not skipped and overlay.Parent do
		local dt = RunService.Heartbeat:Wait()
		t += dt
		local k = math.clamp(t / DURATION, 0, 1)
		bar.Size = UDim2.fromScale(k, 1)
		do -- 지도 위 배 위치: 누적 길이로 구간을 찾는다
			local target = k * total
			for i = 1, #path - 1 do
				if target <= cum[i + 1] or i == #path - 1 then
					local seg = cum[i + 1] - cum[i]
					local f = if seg > 0 then math.clamp((target - cum[i]) / seg, 0, 1) else 1
					marker.Position = UDim2.fromScale(
						geoX(path[i][2] + (path[i + 1][2] - path[i][2]) * f),
						geoY(path[i][1] + (path[i + 1][1] - path[i][1]) * f)
					)
					break
				end
			end
		end
		dayLabel.Text = string.format("%d / %d일째", math.max(1, math.ceil(k * days)), days)
		ship.Position = UDim2.new(0.5, 0, 0.56 + math.sin(t * 2.2) * 0.008, 0)
		ship.Rotation = math.sin(t * 1.7) * 3
		for i, w in waves do
			local x = (w.f.Position.X.Scale - w.speed * dt) % 1.1
			w.f.Position = UDim2.new(x - 0.05, 0, w.f.Position.Y.Scale, 0)
		end
		for _, c in clouds do
			c.Position = UDim2.new((c.Position.X.Scale + 0.01 * dt) % 1.2 - 0.1, 0, c.Position.Y.Scale, 0)
		end
		for i, p in smoke do
			local q = (t * 0.8 + i * 0.25) % 1
			p.Position = UDim2.fromOffset(112 - q * 38, 50 - q * 46)
			p.BackgroundTransparency = 0.3 + q * 0.7
		end
		for _, g in gulls do
			local x = (g.x0 + t * g.speed) % 1.2 - 0.1
			g.f.Position = UDim2.new(x, 0, g.y + math.sin(t * 1.5 + g.phase) * 0.02, 0)
			local flap = math.sin(t * 9 + g.phase) * 28
			g.l.Rotation = -flap
			g.r.Rotation = flap
		end
	end
	overlay:Destroy()
end

local playStory
local renderTitle
local epilogueMessage = nil

local function sail(portId)
	if sailingNow or sceneHold or inField or not (view and view.player and view.ship) then return end
	sailingNow = true
	-- [출항 순서] 현재 지역·역사·중요 인물 이벤트를 끝내야 항해를 시작할 수 있다.
	-- 기존 이벤트 큐를 그대로 사용하며 선택/보상/서버 저장 흐름은 바꾸지 않는다.
	local function finishRegionEvents()
		if H.playQuestScenes then H.playQuestScenes({}, true) end
		local playerGui = player:WaitForChild("PlayerGui")
		while player.Parent and (playerGui:FindFirstChild("StoryScene", true) or playerGui:FindFirstChild("WonderScene", true) or H.sceneBusy) do
			task.wait(0.15)
		end
		local pendingId = view and view.autoStory
		if pendingId and pendingId ~= H.autoStoryShown then
			for _, ev in view.story or {} do
				if ev.id == pendingId then
					H.autoStoryShown = ev.id
					local ok, err = pcall(playStory, ev)
					if not ok then warn("[Game] 출항 전 지역 이벤트 오류:", err) end
					break
				end
			end
		end
		if H.playQuestScenes then H.playQuestScenes({}, true) end
		while player.Parent and (playerGui:FindFirstChild("StoryScene", true) or playerGui:FindFirstChild("WonderScene", true) or H.sceneBusy) do
			task.wait(0.15)
		end
	end
	finishRegionEvents()
	if not player.Parent then
		sailingNow = false
		return
	end
	local from = view.player.portName
	local fromId = view.player.portId
	local departureDay = view.player.day
	local days, steam = 1, view.ship.steam
	for _, r in view.routes do
		if r.id == portId then
			days = r.days
		end
	end
	-- 처음 가는 항구는 자동 항해를 쓸 수 없다 (Sail 호출 전에 확인: 도착하면 방문 기록이 생긴다)
	local firstVisit = not (view.visitedPorts and view.visitedPorts[portId])
	sceneHold = true -- 서버 갱신 중에도 출발 항구 장면을 유지한다.
	departureEventPhase = true -- Sail 응답이 만든 지역 이벤트는 바다 장면 전에 보여 준다.
	local result = call("Sail", { portId = portId })
	-- 서버 속도 제한("너무 빨라요")에 걸리면 출항이 조용히 사라지던 문제: 잠깐 뒤 몇 번 다시 시도한다
	for _ = 1, 5 do
		if result and result.ok == false and result.message == "너무 빨라요" then
			task.wait(0.45)
			result = call("Sail", { portId = portId })
		else
			break
		end
	end
	workspace:SetAttribute("DevSailResult", tostring(result and result.ok) .. ":" .. tostring(result and result.message))
	if result and result.ok then
		-- 서버가 새 항구·시대 사건을 큐에 넣어도 먼저 모두 끝내고 출항한다.
		finishRegionEvents()
		if result.scene then
			H.playWonderScene(result.scene)
			local playerGui = player:WaitForChild("PlayerGui")
			while player.Parent and (H.sceneBusy or playerGui:FindFirstChild("WonderScene", true)) do
				task.wait(0.15)
			end
		end
		departureEventPhase = false
		audioLock = true
		-- 지역 이벤트를 닫은 뒤에만 출항 음악·닻줄 연출을 시작한다.
		local destination = PortData.Ports[portId]
		if destination then
			Sfx.portMusic(destination, false)
		else
			Sfx.music("music_sea")
		end
		Sfx.ambient({ "sfx_waves", "sfx_wind" })
		Sfx.play("sfx_horn")
		task.delay(0.2, Sfx.play, "sfx_rope_pull", 0.8)
		Sfx.play("sfx_sail")
		Sfx.play("sfx_sail_fabric", 0.25)
		local vk = view and view.voyageEvent and view.voyageEvent.kind
		if vk == "dolphins" or vk == "whale" then
			task.delay(4, function()
				Sfx.play("sfx_splash")
				task.wait(1.2)
				Sfx.play("sfx_splash", 0.5)
			end)
		end
		-- 바다 위의 소리: 갈매기와 삐걱거리는 선체가 가끔 들린다
		task.spawn(function()
			local names = { "sfx_gull", "sfx_creak", "sfx_bell", "sfx_gull" }
			local n = 0
			while audioLock and n < 8 do
				task.wait(3 + math.random() * 3)
				if audioLock then
					Sfx.play(names[1 + n % #names], 0.45)
				end
				n += 1
			end
		end)
		-- 1) 3D 항구에서 배가 실제로 부두를 떠나는 장면 (카메라가 배를 따라간다)
		pcall(function()
			if not sceneCtl then
				return
			end
			local dur = sceneCtl.depart(5)
			local cam = workspace.CurrentCamera
			local hull = sceneCtl.hull()
			local hum = player.Character and player.Character:FindFirstChildOfClass("Humanoid")
			main.Visible = false
			-- 배 진행 방향(+X, 바다 쪽)을 따라가는 추적 카메라: 배 뒤쪽 위에서 바라본다
			local RS = game:GetService("RunService")
			local camName = "MareDepartCam"
			if cam and hull then
				workspace:SetAttribute("VoyageActive", true)
				pcall(function() RS:UnbindFromRenderStep(camName) end)
				local t0 = os.clock()
				RS:BindToRenderStep(camName, Enum.RenderPriority.Last.Value + 1, function()
					local c = workspace.CurrentCamera
					if not (c and hull.Parent) then
						return
					end
					local p = hull.Position
					local k = math.clamp((os.clock() - t0) / dur, 0, 1)
					-- 처음엔 부두 쪽 옆에서, 점점 뒤쪽으로 돌아가며 멀어지는 배를 보여 준다
					local back = 34 + k * 26
					local side = 22 * (1 - k * 0.7)
					c.CameraType = Enum.CameraType.Scriptable
					c.FieldOfView = 60 + k * 10 -- 멀어질수록 화각이 넓어져 바다가 펼쳐진다
					c.CFrame = CFrame.lookAt(p + Vector3.new(-back, 13 + k * 5, side), p + Vector3.new(16 + k * 10, 2, 0))
				end)
			end
			task.wait(dur)
			pcall(function() RS:UnbindFromRenderStep(camName) end)
			workspace:SetAttribute("VoyageActive", nil)
			if cam and hum then
				cam.CameraType = Enum.CameraType.Custom
				cam.CameraSubject = hum
			end
		end)
		-- 3D 바다 항해 (끝날 때까지 메뉴는 숨겨 둔다). 실패하면 예전 2D 연출로 대신한다.
		local ok, err, hits, ringTotal = pcall(VoyageScene.play, {
			shipId = view.ship.id,
			steam = steam,
			days = days,
			departureDay = departureDay,
			path = SeaRoutes.path(fromId, portId, PortData.Ports),
			fromName = from,
			toName = view.player.portName,
			makeShip = PortScene.makeShip,
			place = PortScene.placeModel,
			escorts = math.min(3, (view.fleet and view.fleet.escorts or 0) + (view.fleet and view.fleet.ships and #view.fleet.ships or 0)),
			weatherId = view.weather and view.weather.id,
			event = view.voyageEvent,
			rings = player:GetAttribute("ManualHelm") ~= false or firstVisit, -- 기본은 직접 항해(바람 고리). 처음 가는 항구는 반드시 직접 항해
			firstVisit = firstVisit,
			crew = view.crew,
			tutorial = view.sailTutorial,
			traffic = (function()
				-- 이 해역의 교역선(지역 전통 배)과 여러 나라 함대
				local POOL = {
					europe = { "cog", "carrack", "galley", "fluyt", "caravel" },
					w_africa = { "pirogue", "caravel", "nau", "fluyt" },
					new_world = { "brigantine", "privateer", "manila_galleon", "caravel" },
					indian = { "dhow", "baghlah", "mtepe", "pattamar", "kotia", "jahazi" },
					far_east = { "junk", "prau", "sekibune", "geobukseon", "dhow" },
					pacific = { "prau", "junk", "manila_galleon" },
				}
				local dest = PortData.Ports[portId]
				local rid = dest and require(Shared:WaitForChild("Regions")).of(dest).id or "europe"
				local ships = require(Shared:WaitForChild("Ships")).Ships
				local names = {}
				for id, def in ships do
					names[id] = def.name
				end
				local fleets = {}
				for _, f in { { "frigate", "영국 함대" }, { "galleon", "스페인 함대" }, { "corvette", "프랑스 함대" }, { "east_indiaman", "네덜란드 함대" }, { "nau", "포르투갈 함대" } } do
					if ships[f[1]] then
						table.insert(fleets, { id = f[1], name = f[2] })
					end
				end
				return { merchants = POOL[rid] or POOL.europe, fleets = fleets, names = names }
			end)(),
		})
		if not ok then
			warn("[Game] 3D 항해 오류, 2D로 대체:", err)
			local cam = workspace.CurrentCamera
			cam.CameraType = Enum.CameraType.Custom
			for _, n in { "VoyageHud" } do
				local g = player.PlayerGui:FindFirstChild(n)
				if g then g:Destroy() end
			end
			local vf = workspace:FindFirstChild("VoyageScene")
			if vf then vf:Destroy() end
			ok, err = pcall(H.playVoyage, from, view.player.portName, days, steam, SeaRoutes.path(fromId, portId, PortData.Ports))
		end
		if not ok then
			warn("[Game] voyage scene error:", err)
			for _, g in player.PlayerGui:GetChildren() do
				if g.Name == "Overlay" then
					g:Destroy()
				end
			end
		end
		-- 바람 고리 점수 보상 (직접 항해를 한 경우만 점수가 온다)
		if ok and type(err) == "number" then
			call("VoyageBonus", { score = err })
		elseif ok then
			call("VoyageBonus", { auto = true }) -- 자동 항해: 최근 수동 실력에 따른 낮은 점수
		end
		-- 2) 도착한 항구의 3D 장면: 배가 먼 바다에서 들어와 정박
		arriveNext = true
	end
	main.Visible = true
	menuToggle.Visible = false
	-- 선택 이벤트·해전 처리가 끝날 때까지 다른 지역 장면은 대기한다.
	-- 바다에서 크라켄·유령선을 만났다면 도착 뒤 해상전투로 싸운다
	if view and view.seaBoss then
		call("ChallengeBoss", { bossId = view.seaBoss, sea = true })
	end
	if view and view.voyageChoice then
		local vc = view.voyageChoice
		vc.id = "voyage"
		vc.submit = function(i) return call("VoyageChoice", { index = i }) end
		playStory(vc)
	end
	departureEventPhase = false
	sceneHold = false
	sceneKey = nil
	audioLock = false
	sailingNow = false
	Sfx.play("sfx_bell")
	-- 정박: 종소리 뒤에 닻이 내려가고 닻줄이 풀린다
	task.delay(0.7, Sfx.play, "sfx_anchor_lower", 0.85)
	task.delay(1.1, Sfx.play, "sfx_rope_release", 0.6)
	Sfx.ambient({ "sfx_waves" })
	syncScene()
end


-- 출항 준비 화면: 항로·일수·보급·날씨를 확인하고 닻을 올린다 -----------------------------------
local function confirmSail(r)
	if r.locked then
		sail(r.id)
		return
	end
	local layer = overlayGui("DepartConfirm", 25)
	local dim = mkBox(layer, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.new(0, 0, 0), 0.45)
	dim.ZIndex = 50
	local card = mkBox(dim, UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(420, 300), Color3.fromRGB(24, 28, 38))
	card.AnchorPoint = Vector2.new(0.5, 0.5)
	card.ZIndex = 51
	local cc = Instance.new("UICorner")
	cc.CornerRadius = UDim.new(0, 10)
	cc.Parent = card
	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.fromOffset(14, 10)
	title.Size = UDim2.new(1, -28, 0, 26)
	title.Font = Enum.Font.GothamBold
	title.TextSize = 20
	title.TextColor3 = COLORS.gold
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Text = string.format("출항 준비 · %s → %s", view.player.portName, r.name)
	title.ZIndex = 52
	title.Parent = card
	local enough = view.ship.supplies >= (r.supplies or 0)
	local lines = {
		string.format("해역: %s · 거리 약 %d km · 예상 %d일", r.region or "", r.distanceKm or 0, r.days or 1),
		string.format("보급품: %d / 필요 약 %d%s", view.ship.supplies, r.supplies or 0, if enough then "" else "  부족해요"),
		string.format("선원: %d / %d · 선체: %d / %d", view.ship.crew, view.ship.maxCrew, view.ship.hull, view.ship.maxHull),
		string.format("날씨: %s · 사기: %s", view.weather and view.weather.name or "맑음", tostring(view.morale or "-")),
		"닻을 올리면 항해가 시작돼요. 바다에서 무슨 일이 생길지 아무도 몰라요.",
	}
	local info = Instance.new("TextLabel")
	info.BackgroundTransparency = 1
	info.Position = UDim2.fromOffset(14, 46)
	info.Size = UDim2.new(1, -28, 0, 130)
	info.Font = Enum.Font.Gotham
	info.TextSize = 15
	info.TextWrapped = true
	info.TextXAlignment = Enum.TextXAlignment.Left
	info.TextYAlignment = Enum.TextYAlignment.Top
	info.TextColor3 = COLORS.text
	info.Text = table.concat(lines, "\n")
	info.ZIndex = 52
	info.Parent = card
	local modeBtn
	local function paintMode()
		-- 항해 장면은 ManualHelm 속성을 읽는다. 이 버튼도 같은 속성을 바꿔야 실제로 수동 항해가 된다.
		local manualOn = player:GetAttribute("ManualHelm") ~= false
		modeBtn.Text = if manualOn then "항해 방식: 직접 항해 (바람 고리 · 언제든 자동 전환)" else "항해 방식: 자동 항해"
		modeBtn.BackgroundColor3 = if manualOn then COLORS.gold else COLORS.blue
	end
	modeBtn = mkButton(card, "", COLORS.blue, UDim2.new(1, -28, 0, 34), function()
		player:SetAttribute("ManualHelm", not (player:GetAttribute("ManualHelm") ~= false))
		paintMode()
	end, true)
	modeBtn.Position = UDim2.fromOffset(14, 182)
	modeBtn.ZIndex = 52
	paintMode()
	local go = mkButton(card, "⚓ 닻 올리기", COLORS.green, UDim2.new(0.5, -20, 0, 40), function()
		layer:Destroy()
		sail(r.id)
	end, true)
	go.Position = UDim2.new(0, 14, 1, -54)
	go.ZIndex = 52
	local cancel = mkButton(card, "취소", COLORS.red, UDim2.new(0.5, -20, 0, 40), function()
		layer:Destroy()
	end, true)
	cancel.Position = UDim2.new(0.5, 6, 1, -54)
	cancel.ZIndex = 52
end

-- 이야기 장면: 코드로 그린 일러스트 + 대화 + 선택지 ----------------------------------------

local function mkRound(parent, pos, size, color, alpha, anchor)
	local f = mkBox(parent, pos, size, color, alpha)
	if anchor then
		f.AnchorPoint = anchor
	end
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(1, 0)
	c.Parent = f
	return f
end

local ART = {
	palace = { sky = Color3.fromRGB(235, 214, 170), floor = Color3.fromRGB(120, 60, 60) },
	tavern = { sky = Color3.fromRGB(90, 56, 38), floor = Color3.fromRGB(60, 38, 26) },
	harbor = { sky = Color3.fromRGB(240, 170, 110), floor = Color3.fromRGB(46, 96, 140) },
	ruins = { sky = Color3.fromRGB(170, 150, 140), floor = Color3.fromRGB(88, 80, 74) },
	observatory = { sky = Color3.fromRGB(16, 22, 52), floor = Color3.fromRGB(40, 44, 60) },
	storm = { sky = Color3.fromRGB(52, 62, 78), floor = Color3.fromRGB(28, 52, 80) },
	library = { sky = Color3.fromRGB(110, 76, 50), floor = Color3.fromRGB(70, 46, 32) },
	epilogue = { sky = Color3.fromRGB(246, 150, 96), floor = Color3.fromRGB(34, 62, 110) },
}

function H.paintScene(parent, art, t)
	local pal = ART[art] or ART.harbor
	parent.BackgroundColor3 = pal.sky
	mkBox(parent, UDim2.fromScale(0, 0.62), UDim2.fromScale(1, 0.38), pal.floor)
	if art == "palace" then
		for i = 0, 3 do
			mkBox(parent, UDim2.fromScale(0.08 + i * 0.28, 0.1), UDim2.fromScale(0.06, 0.52), Color3.fromRGB(245, 235, 210))
			mkBox(parent, UDim2.fromScale(0.07 + i * 0.28, 0.08), UDim2.fromScale(0.08, 0.03), Color3.fromRGB(224, 190, 110))
		end
		mkBox(parent, UDim2.fromScale(0.3, 0.12), UDim2.fromScale(0.4, 0.4), Color3.fromRGB(170, 200, 230))
		mkBox(parent, UDim2.fromScale(0.42, 0.04), UDim2.fromScale(0.16, 0.16), Color3.fromRGB(150, 30, 40))
		mkBox(parent, UDim2.fromScale(0.28, 0.62), UDim2.fromScale(0.44, 0.38), Color3.fromRGB(150, 30, 40))
	elseif art == "tavern" then
		for i = 0, 6 do
			mkBox(parent, UDim2.fromScale(i / 7, 0), UDim2.fromScale(0.005, 0.62), Color3.fromRGB(60, 38, 26))
		end
		mkRound(parent, UDim2.fromScale(0.82, 0.22), UDim2.fromOffset(60, 60), Color3.fromRGB(255, 210, 110), 0.35, Vector2.new(0.5, 0.5))
		mkBox(parent, UDim2.fromScale(0.8, 0.22), UDim2.fromOffset(6, 18), Color3.fromRGB(255, 240, 200))
		for i = 0, 2 do
			mkBox(parent, UDim2.fromScale(0.05 + i * 0.1, 0.5), UDim2.fromScale(0.08, 0.2), Color3.fromRGB(120, 80, 46))
		end
		mkBox(parent, UDim2.fromScale(0, 0.7), UDim2.fromScale(1, 0.06), Color3.fromRGB(130, 88, 52))
	elseif art == "harbor" then
		mkRound(parent, UDim2.fromScale(0.72, 0.3), UDim2.fromOffset(64, 64), Color3.fromRGB(255, 226, 150), 0, Vector2.new(0.5, 0.5))
		mkBox(parent, UDim2.fromScale(0, 0.6), UDim2.fromScale(1, 0.02), Color3.fromRGB(255, 220, 180), 0.4)
		for i = 0, 2 do
			mkBox(parent, UDim2.fromScale(0.1 + i * 0.12, 0.3 - i * 0.03), UDim2.fromOffset(4, 90), Color3.fromRGB(70, 45, 28))
			mkBox(parent, UDim2.fromScale(0.1 + i * 0.12, 0.34 - i * 0.03), UDim2.fromOffset(34, 38), Color3.fromRGB(245, 238, 220))
		end
		mkBox(parent, UDim2.fromScale(0, 0.78), UDim2.fromScale(0.5, 0.04), Color3.fromRGB(110, 80, 56))
	elseif art == "epilogue" then
		-- 석양, 수평선 위의 하얀 돛배, 날아가는 새
		mkRound(parent, UDim2.fromScale(0.5, 0.5), UDim2.fromOffset(120, 120), Color3.fromRGB(255, 226, 150), 0.1, Vector2.new(0.5, 0.5))
		mkBox(parent, UDim2.fromScale(0, 0.6), UDim2.fromScale(1, 0.02), Color3.fromRGB(255, 214, 160), 0.3)
		mkBox(parent, UDim2.fromScale(0.58, 0.5), UDim2.fromOffset(5, 80), Color3.fromRGB(60, 40, 28))
		mkBox(parent, UDim2.fromScale(0.59, 0.5), UDim2.fromOffset(46, 52), Color3.fromRGB(250, 244, 226))
		mkBox(parent, UDim2.fromScale(0.55, 0.62), UDim2.fromOffset(72, 14), Color3.fromRGB(100, 62, 40))
		for i = 0, 2 do
			mkBox(parent, UDim2.fromScale(0.2 + i * 0.07, 0.22 + (i % 2) * 0.05), UDim2.fromOffset(16, 3), Color3.fromRGB(70, 50, 50))
		end
	elseif art == "ruins" then
		for i = 0, 4 do
			mkBox(parent, UDim2.fromScale(0.08 + i * 0.19, 0.62 - (0.16 + (i % 3) * 0.08)), UDim2.fromScale(0.07, 0.16 + (i % 3) * 0.08), Color3.fromRGB(200, 190, 175))
		end
		local v = mkBox(parent, UDim2.fromScale(0.6, 0.12), UDim2.fromScale(0.36, 0.5), Color3.fromRGB(80, 66, 62))
		v.Rotation = 0
		mkRound(parent, UDim2.fromScale(0.78, 0.1), UDim2.fromOffset(70, 40), Color3.fromRGB(110, 100, 100), 0.3, Vector2.new(0.5, 0.5))
	elseif art == "observatory" then
		for i = 1, 26 do
			mkBox(parent, UDim2.fromScale((i * 0.137) % 1, (i * 0.091) % 0.55), UDim2.fromOffset(2, 2), Color3.new(1, 1, 1), 0.2)
		end
		mkRound(parent, UDim2.fromScale(0.18, 0.18), UDim2.fromOffset(44, 44), Color3.fromRGB(240, 236, 210), 0, Vector2.new(0.5, 0.5))
		local dome = mkRound(parent, UDim2.fromScale(0.7, 0.62), UDim2.fromOffset(190, 150), Color3.fromRGB(86, 90, 112), 0, Vector2.new(0.5, 1))
		mkBox(dome, UDim2.fromScale(0.45, 0), UDim2.fromScale(0.1, 0.6), Color3.fromRGB(20, 24, 40))
	elseif art == "storm" then
		for i = 0, 3 do
			mkRound(parent, UDim2.fromScale(0.1 + i * 0.25, 0.1 + (i % 2) * 0.07), UDim2.fromOffset(150, 46), Color3.fromRGB(34, 40, 52), 0.1, Vector2.new(0.5, 0.5))
		end
		mkBox(parent, UDim2.fromScale(0.62, 0.15), UDim2.fromOffset(5, 80), Color3.fromRGB(255, 245, 180))
		for i = 1, 12 do
			mkBox(parent, UDim2.fromScale((i * 0.19) % 1, 0.64 + (i % 5) * 0.06), UDim2.fromOffset(46, 3), Color3.new(1, 1, 1), 0.5)
		end
	elseif art == "library" then
		for i = 0, 3 do
			mkBox(parent, UDim2.fromScale(0.04 + i * 0.25, 0.08), UDim2.fromScale(0.2, 0.54), Color3.fromRGB(88, 56, 36))
			for r = 0, 3 do
				mkBox(parent, UDim2.fromScale(0.05 + i * 0.25, 0.12 + r * 0.13), UDim2.fromScale(0.18, 0.09), Color3.fromRGB(150 - i * 14, 100 + r * 20, 70))
			end
		end
	end
end

-- 초상화용 인물: 색·재질이 있는 R15 모델을 우선 쓰고, 만들 수 없으면 승인된 People 모델을 쓴다
local function portraitPerson(world, key, role, tpl)
	local seed = 0
	for i = 1, #key do
		seed = (seed * 31 + string.byte(key, i)) % 100000
	end
	local m = Pose.createR15(world, Vector3.zero, 0, nil, Random.new(seed), role, 6)
	if m then
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		pcall(Pose.animateR15, m, { phase = 0, moving = false, t = 0.6 })
		return m
	end
	if tpl then
		local c = tpl:Clone()
		for _, d in c:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		c.Parent = world
		pcall(Pose.relaxArms, c)
		return c
	end
	return nil
end

-- 이야기 속 인물 → 승인된 People 모델. 직함 낱말로 고르고, 없으면 이름으로 항상 같은 사람을 고른다.
local STORY_PEOPLE = {
	{ { "해적", "사략", "뱃사람", "선원", "선장", "항해사" }, { "Pirate_Male", "Pirate_Female" } },
	{ { "학자", "박사", "의사", "약", "연금" }, { "Doctor_Male_Old", "Doctor_Female_Old", "Doctor_Male_Young" } },
	{ { "여왕", "왕", "귀족", "총독", "제독", "백작", "공작", "대사" }, { "OldClassy_Male", "OldClassy_Female" } },
	{ { "병사", "수비", "군인", "근위" }, { "Soldier_Male", "Soldier_Female", "BlueSoldier_Male" } },
	{ { "주조", "대장", "목수", "상인", "장인", "어부", "정비" }, { "Worker_Male", "Worker_Female" } },
	{ { "요리", "주방", "포도주", "양조" }, { "Chef_Male", "Chef_Female" } },
}
local STORY_DEFAULT = { "Casual_Male", "Casual2_Female", "Casual3_Male", "Casual_Female", "Casual2_Male", "Casual3_Female" }
local function storyPortraitModel(npcName, id)
	local seed = 0
	for i = 1, #npcName + #id do
		seed = (seed * 31 + string.byte((npcName .. id), i)) % 9973
	end
	for _, row in STORY_PEOPLE do
		for _, kw in row[1] do
			if string.find(npcName, kw, 1, true) then
				return row[2][seed % #row[2] + 1]
			end
		end
	end
	return STORY_DEFAULT[seed % #STORY_DEFAULT + 1]
end

-- 주인공 초상 대신 국가 국기를 보여 준다 (선택 화면·오프닝·에필로그)
local function heroPortrait(parent, nationId, w, h)
	return require(Shared:WaitForChild("Flags")).build(parent, nationId, w, math.floor(w * 0.68))
end

local function playEpilogue(msg, opts)
	opts = opts or {}
	local TweenService = game:GetService("TweenService")
	local layer = overlayGui("Epilogue", 30)
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.new(0, 0, 0)
	root.BorderSizePixel = 0
	root.Parent = layer
	-- 프롤로그·에필로그의 배경은 임의 도형 범선 대신 기존 승인된 항해선 모델을 사용한다.
	-- 광원 색과 카메라 움직임만 UI/ViewportFrame에서 처리하며 새 Part는 만들지 않는다.
	local scene = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(30, 48, 69))
	scene.ClipsDescendants = true
	local sky = Instance.new("UIGradient")
	sky.Rotation = 90
	sky.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(24, 38, 64)),
		ColorSequenceKeypoint.new(0.52, Color3.fromRGB(173, 104, 83)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(31, 59, 87)),
	})
	sky.Parent = scene

	local voyageView = Instance.new("ViewportFrame")
	voyageView.Name = "IntroApprovedShip"
	voyageView.Size = UDim2.fromScale(1, 1)
	voyageView.BackgroundTransparency = 1
	voyageView.Ambient = Color3.fromRGB(175, 160, 155)
	voyageView.LightColor = Color3.fromRGB(255, 218, 163)
	voyageView.LightDirection = Vector3.new(-0.55, -0.72, -0.43).Unit
	voyageView.Parent = scene
	local shipWorld = Instance.new("WorldModel")
	shipWorld.Parent = voyageView
	local shipCamera = Instance.new("Camera")
	shipCamera.FieldOfView = 40
	shipCamera.Parent = voyageView
	voyageView.CurrentCamera = shipCamera

	local library = ReplicatedStorage:FindFirstChild("MareAssets")
	local naval = library and library:FindFirstChild("Naval")
	if naval and not naval:FindFirstChild("ship-large") then
		naval:WaitForChild("ship-large", 6)
	end
	-- placeModel은 기존 등록 Mesh를 복제하며, 없으면 nil을 반환한다.
	local vessel = PortScene.placeModel(shipWorld, "Naval", "ship-large", Vector3.zero, 44)
		or PortScene.placeModel(shipWorld, "Naval", "ship-medium", Vector3.zero, 38)
		or PortScene.placeModel(shipWorld, "Naval", "boat-sail-a", Vector3.zero, 34)
	if vessel then
		local cf, size = vessel:GetBoundingBox()
		local focus = cf.Position + Vector3.new(0, size.Y * 0.06, 0)
		local camera = workspace.CurrentCamera
		local aspect = if camera then camera.ViewportSize.X / math.max(camera.ViewportSize.Y, 1) else 1
		local distance = math.max(size.X, size.Y, size.Z) * (if aspect < 0.9 then 3 else 1.9)
		shipCamera.CFrame = CFrame.lookAt(focus + Vector3.new(distance * 0.6, size.Y * 0.65, distance), focus)
		TweenService:Create(shipCamera, TweenInfo.new(22, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
			CFrame = CFrame.lookAt(focus + Vector3.new(distance * 0.37, size.Y * 0.37, distance * 0.78), focus),
			FieldOfView = 37,
		}):Play()
	end
	if opts.hero then
		local hp = heroPortrait(root, opts.hero, 150, 190)
		hp.AnchorPoint = Vector2.new(0, 0.5)
		hp.Position = UDim2.new(0, 28, 0.5, 0)
		hp.ZIndex = 9
	end
	-- 위아래 검은 띠 (영화 같은 화면 비율)
	local top = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.12), Color3.new(0, 0, 0))
	local bot = mkBox(root, UDim2.fromScale(0, 0.88), UDim2.fromScale(1, 0.12), Color3.new(0, 0, 0))
	top.ZIndex, bot.ZIndex = 5, 5
	local shade = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.new(0, 0, 0))
	shade.ZIndex = 4
	local function say(text, y, size, color, hold)
		local l = mkLabel(root, text, size, color, true)
		l.AutomaticSize = Enum.AutomaticSize.None
		l.Size = UDim2.new(if opts.hero then 0.62 else 0.8, 0, 0, size * 3)
		l.AnchorPoint = Vector2.new(0.5, 0)
		l.Position = UDim2.fromScale(if opts.hero then 0.6 else 0.5, y)
		l.TextXAlignment = Enum.TextXAlignment.Center
		l.TextTransparency = 1
		l.ZIndex = 8
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Thickness = 1.5
		st.Color = Color3.new(0, 0, 0)
		st.Transparency = 1
		st.Parent = l
		TweenService:Create(l, TweenInfo.new(1.2), { TextTransparency = 0 }):Play()
		TweenService:Create(st, TweenInfo.new(1.2), { Transparency = 0.3 }):Play()
		task.wait(hold or 3)
		return l
	end
	-- 검은 화면에서 서서히 실제 범선 연출이 드러난다.
	TweenService:Create(shade, TweenInfo.new(2.5), { BackgroundTransparency = 0.45 }):Play()
	task.wait(1.5)
	if opts.lines then
		say(opts.title or "프롤로그", 0.16, 28, Color3.fromRGB(240, 200, 120), 2.5)
		for i, line in opts.lines do
			local l = say(line, 0.3, 19, COLORS.text, 3.8)
			if i < #opts.lines then
				TweenService:Create(l, TweenInfo.new(0.8), { TextTransparency = 1 }):Play()
				task.wait(0.8)
				l:Destroy()
			end
		end
	else
		local p = view and view.player
		say("에필로그", 0.2, 30, Color3.fromRGB(240, 200, 120), 2.5)
		say(tostring(msg or ""), 0.32, 18, COLORS.text, 4.5)
		if p then
			say(string.format("항해 %d일 · 명성 %d · 보유 코인 %d", p.day or 0, math.floor(p.fame or 0), math.floor(p.coins or 0)), 0.5, 16, Color3.fromRGB(190, 200, 215), 3.5)
		end
		say("그러나 바다는 끝나지 않는다.\n당신의 항해는 계속된다.", 0.62, 18, Color3.fromRGB(240, 200, 120), 2.5)
	end
	local finished = false
	local b = mkButton(root, opts.button or "계속 항해하기", COLORS.gold, UDim2.fromOffset(200, 48), function() finished = true end, true)
	b.AnchorPoint = Vector2.new(0.5, 0)
	b.Position = UDim2.fromScale(0.5, 0.78)
	b.ZIndex = 9
	b.TextSize = 17
	local t0 = os.clock()
	while not finished and os.clock() - t0 < 120 do
		task.wait(0.2)
	end
	TweenService:Create(shade, TweenInfo.new(1), { BackgroundTransparency = 0 }):Play()
	task.wait(1)
	layer:Destroy()
end

-- 주점 소문: 삽화 위에 주점 주인이 귀띔해 주는 장면으로 보여 준다 (정보 내용은 그대로, 말투만 대사로)
function H.playRumorScene(r)
	local portId = view and view.player and view.player.portId
	local port = portId and PortData.Ports[portId]
	local lines = { "(잔을 닦다 슬쩍 몸을 기울인다) 선장, 술값은 받았으니 귀 좀 빌려 드리죠." }
	for i, line in r.lines do
		local speech = string.gsub(line, "^(.-): ", "%1 말이오? ", 1)
		table.insert(lines, (if i == 1 then "(목소리를 낮추며) " elseif i == #r.lines then "(주위를 둘러보며) " else "") .. speech)
	end
	table.insert(lines, "이 얘기는 내가 했다고 하지 마시오. (다시 술잔을 닦기 시작한다)")
	local atlas, offset, size = H.facilityPortraitAsset(portId, "tavern")
	playStory({
		id = "rumor", title = "주점 소문", chapter = if port then port.name else nil,
		npc = "주점 주인", art = "tavern", lines = lines,
		choices = { { text = "고맙소, 잘 들었소", index = 1 } },
		submit = function() return { ok = true, message = "귀띔을 머릿속에 새겼다.\n(주점 화면의 '뱃사람 귀띔'에서 다시 볼 수 있어요)" } end,
		regionalPortrait = if atlas then { assetId = atlas, offset = offset, size = size } else nil,
	})
end

function playStory(ev)
	local overlay = Instance.new("Frame")
	overlay.Name = "StoryScene"
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BorderSizePixel = 0
	overlay.ZIndex = 60
	local layer = overlayGui("Overlay", 20)
	overlay.Parent = layer
	-- 스토리 성격에 맞춰 기존 오디오 제어기에서 BGM·시작 효과음을 선택한다.
	local prevStoryMusic = Sfx.currentName()
	Sfx.music(Sfx.storyMusic(ev))
	Sfx.play(Sfx.storyCue(ev), 0.38)
	overlay.Destroying:Connect(function()
		if prevStoryMusic then
			Sfx.music(prevStoryMusic)
		end
		task.defer(function() layer:Destroy() end)
	end)
	local picture = mkBox(overlay, UDim2.fromScale(0, 0), UDim2.fromScale(1, 0.56), Color3.new(0, 0, 0))
	picture.ClipsDescendants = true
	-- 배경 그림 우선순위: ① 이 이벤트 전용 그림(CardArt/story_<이벤트id>) ② 이 이벤트가 주는 지식카드의 그림 ③ 장면 종류별 공용 그림.
	-- 어느 것도 없으면 UI 도형으로 그린 임시 배경은 쓰지 않고, 지금 서 있는 항구의 실제 3D 풍경을 어둡게 깔아 보여 준다.
	do
		local ILLUST = { tavern = "event_festival", harbor = "event_trade_boom", storm = "event_storm", palace = "event_royal_charter", ruins = "event_stonehenge", observatory = "event_principia", library = "event_principia" }
		local img = AssetIds["CardArt/story_" .. tostring(ev.id or "")]
		if not img then
			pcall(function()
				for _, choice in ev.choices or {} do
					local cid = choice.effect and choice.effect.cardId
					if cid and AssetIds["CardArt/" .. cid] then
						img = AssetIds["CardArt/" .. cid]
						break
					end
				end
			end)
		end
		img = img or AssetIds["CardArt/" .. (ILLUST[ev.art or ""] or "none")]
		if not img then
			if ev.art == "epilogue" then
				H.paintScene(picture, ev.art) -- 에필로그만 기존 연출 유지
			else
				overlay.BackgroundTransparency = 1
				picture.BackgroundTransparency = 1
				local dim = mkBox(overlay, UDim2.fromScale(0, 0.56), UDim2.fromScale(1, 0.44), Color3.new(0, 0, 0))
				dim.BackgroundTransparency = 0.12
				local top = mkBox(picture, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.new(0, 0, 0))
				top.BackgroundTransparency = 0.78
			end
		end
		if img then
			local bg = Instance.new("ImageLabel")
			bg.Name = "Illustration"
			bg.AnchorPoint = Vector2.new(0.5, 0.5)
			bg.Position = UDim2.fromScale(0.5, 0.5)
			bg.Size = UDim2.fromScale(1.02, 1.02)
			bg.BackgroundTransparency = 1
			bg.ScaleType = Enum.ScaleType.Crop
			bg.Image = "rbxassetid://" .. tostring(img)
			bg.Parent = picture
			local shade = Instance.new("UIGradient")
			shade.Rotation = 90
			shade.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 0.25) })
			shade.Parent = bg
			game:GetService("TweenService"):Create(bg, TweenInfo.new(20, Enum.EasingStyle.Sine), { Size = UDim2.fromScale(1.14, 1.14) }):Play()
		end
	end

	-- 등장 인물: 승인된 3D 인물 모델을 반신 초상으로 보여 준다 (모델이 없으면 실루엣)
	local portraitModel = storyPortraitModel(ev.npc or "", ev.id or "")
	local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
	local tpl = portraitModel and lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(portraitModel)
	-- 이야기 대화는 인물의 직업·나이를 우선한다. 이름만으로 맞지 않는 외형을 강제하지 않는다.
	local npcName = ev.npc or ""
	local tile = nil
	if string.find(npcName, "늙", 1, true) or string.find(npcName, "노인", 1, true) then
		tile = "tavern"
	elseif string.find(npcName, "주조", 1, true) or string.find(npcName, "조선", 1, true)
		or string.find(npcName, "목수", 1, true) or string.find(npcName, "장인", 1, true) then
		tile = "yard"
	elseif string.find(npcName, "항만청", 1, true) or string.find(npcName, "제독", 1, true)
		or string.find(npcName, "총독", 1, true) or string.find(npcName, "장교", 1, true) then
		tile = "harbor"
	elseif string.find(npcName, "학자", 1, true) or string.find(npcName, "학회", 1, true)
		or string.find(npcName, "서기", 1, true) or string.find(npcName, "천문", 1, true)
		or string.find(npcName, "지도", 1, true) or string.find(npcName, "연구", 1, true) then
		tile = "scholar"
	elseif string.find(npcName, "상인", 1, true) or string.find(npcName, "중개", 1, true)
		or string.find(npcName, "무역", 1, true) then
		tile = "merchant"
	elseif string.find(npcName, "항해사", 1, true) or string.find(npcName, "선장", 1, true)
		or string.find(npcName, "도선사", 1, true) then
		tile = "hero"
	elseif string.find(npcName, "주점", 1, true) or string.find(npcName, "선술집", 1, true) then
		tile = "tavern"
	end
	-- 빈 초상화 방지: 직업이 시설 초상과 안 맞아도 이벤트가 열린 항구의 지역 사람 얼굴을 쓴다(문화권은 항구가 정한다).
	-- 항해사·도선사는 항만 일꾼 칸, 그 밖의 일반 인물은 주점 손님 칸.
	if tile == "hero" then
		tile = "harbor"
	elseif not tile then
		tile = "tavern"
	end
	-- 동료 사연이면 그 동료의 그린 초상을 쓴다
	local cid = ev.id and string.match(ev.id, "^(h_[%w_]+)_%d+$")
	local cport = cid and COMPANION_PORTRAIT[cid]
	if not cport and ev.regionalPortrait then -- 주점 소문 등: 그 항구 지역 사람 얼굴
		cport = ev.regionalPortrait
	end
	if cport then
		local ph = Instance.new("ImageLabel")
		ph.Name = "NpcPortrait"
		ph.AnchorPoint = Vector2.new(0.5, 1)
		ph.Position = UDim2.fromScale(0.5, 1)
		ph.Size = UDim2.new(0, 250, 1, -14)
		ph.BackgroundTransparency = 1
		ph.ScaleType = Enum.ScaleType.Crop
		ph.Image = "rbxassetid://" .. tostring(cport.assetId or AssetIds["Portraits/" .. cport.atlas])
		local pk = if cport.atlas then sheetK(cport.atlas) else 1
		ph.ImageRectOffset = cport.offset * pk
		ph.ImageRectSize = (cport.size or Vector2.new(256, 336)) * pk
		corner(ph, 10)
		local pst = Instance.new("UIStroke")
		pst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		pst.Color = Color3.fromRGB(214, 170, 82)
		pst.Thickness = 3
		pst.Parent = ph
		ph.Parent = picture
		tile = nil
		tpl = nil
	end
	-- 흑백 스케치 시트(npcs_new·characters·merchant)는 쓰지 않는다. 색이 있는 시설 초상만 쓰고, 없으면 아래 3D 인물 모델로 대신한다.
	-- 지역(인종·문화권)에 맞는 현재 항구 사람 얼굴을 먼저 쓰고, 없을 때만 공용 시설 초상을 쓴다.
	local regId, regOffset, regSize
	if tile and not cport then
		local curPort = ev.portId or (view and view.player and view.player.portId)
		regId, regOffset, regSize = H.facilityPortraitAsset(curPort, tile)
	end
	local storyImageId = if regId then regId
		elseif tile and FACILITY_ATLAS and FACILITY_TILE[tile] then FACILITY_ATLAS else nil
	if storyImageId then
		local photo = Instance.new("ImageLabel")
		photo.Name = "NpcPortrait"
		photo.AnchorPoint = Vector2.new(0.5, 1)
		photo.Position = UDim2.fromScale(0.5, 1)
		photo.Size = UDim2.new(0, 330, 1, 6)
		photo.BackgroundTransparency = 1
		photo.BorderSizePixel = 0
		photo.ScaleType = Enum.ScaleType.Crop
		photo.Image = "rbxassetid://" .. tostring(storyImageId)
		photo.ImageRectOffset = if regId then regOffset else FACILITY_TILE[tile]
		photo.ImageRectSize = if regId then regSize else PORTRAIT_SIZE
		photo.Parent = picture
	elseif cport then
		-- 그린 초상을 이미 올렸다
	elseif tpl then
		local vf = Instance.new("ViewportFrame")
		vf.BackgroundTransparency = 1
		vf.AnchorPoint = Vector2.new(0.5, 1)
		vf.Position = UDim2.fromScale(0.5, 1)
		vf.Size = UDim2.new(0, 330, 1, 6)
		vf.Ambient = Color3.fromRGB(170, 170, 178)
		vf.LightColor = Color3.fromRGB(255, 236, 205)
		vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
		vf.Parent = picture
		local cam = Instance.new("Camera")
		cam.FieldOfView = 32
		cam.Parent = vf
		vf.CurrentCamera = cam
		local world = Instance.new("WorldModel")
		world.Parent = vf
		local m = tpl:Clone()
		for _, d in m:GetDescendants() do
			if d:IsA("BasePart") then
				d.Anchored = true
			end
		end
		m.Parent = world
		pcall(Pose.relaxArms, m)
		local cf, size = m:GetBoundingBox()
		local head = m:FindFirstChild("Head", true)
		if head and head:IsA("BasePart") then
			-- 머리와 어깨가 보이게: 머리 높이를 기준으로 가까이 잡는다
			local hp = head.Position
			local focus = hp - Vector3.new(0, head.Size.Y * 0.9, 0)
			cam.FieldOfView = 30
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.25, 0.1, -1).Unit * (head.Size.Y * 7.5), focus)
		else
			local focus = cf.Position + Vector3.new(0, size.Y * 0.2, 0)
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.3, 0.12, -1).Unit * (size.Y * 1.05), focus)
		end
	else
		local npc = mkBox(picture, UDim2.fromScale(0.5, 0.95), UDim2.fromOffset(90, 150), Color3.new(0, 0, 0), 1)
		npc.AnchorPoint = Vector2.new(0.5, 1)
		local body = mkBox(npc, UDim2.fromOffset(10, 56), UDim2.fromOffset(70, 94), Color3.fromRGB(58, 44, 70))
		local bc = Instance.new("UICorner")
		bc.CornerRadius = UDim.new(0.3, 0)
		bc.Parent = body
		mkRound(npc, UDim2.fromOffset(45, 34), UDim2.fromOffset(40, 40), Color3.fromRGB(232, 196, 160), 0, Vector2.new(0.5, 0.5))
	end

	local chapter = Instance.new("TextLabel")
	chapter.BackgroundTransparency = 1
	chapter.Position = UDim2.fromOffset(0, 14)
	chapter.Size = UDim2.new(1, 0, 0, 30)
	chapter.Font = Enum.Font.GothamBold
	chapter.TextSize = 21
	chapter.TextXAlignment = Enum.TextXAlignment.Center
	chapter.TextColor3 = Color3.new(1, 1, 1)
	chapter.TextStrokeTransparency = 1
	chapter.Text = (if ev.chapter then ev.chapter .. " · " else "") .. ev.title
	chapter.ZIndex = 61
	chapter.Parent = overlay

	-- 대화창
	local box = mkBox(overlay, UDim2.fromScale(0, 0.5), UDim2.fromScale(1, 0.5), Color3.fromRGB(24, 28, 38))
	local nameTag = Instance.new("TextLabel")
	nameTag.BackgroundTransparency = 1
	nameTag.Position = UDim2.fromOffset(14, 6)
	nameTag.Size = UDim2.new(1, -28, 0, 28)
	nameTag.Font = Enum.Font.GothamBold
	nameTag.TextSize = 20
	nameTag.TextXAlignment = Enum.TextXAlignment.Left
	nameTag.TextColor3 = COLORS.gold
	nameTag.Text = ev.npc
	nameTag.Parent = box
	local text = Instance.new("TextLabel")
	text.BackgroundTransparency = 1
	text.Position = UDim2.fromOffset(14, 38)
	text.Size = UDim2.new(1, -28, 1, -56)
	text.Font = Enum.Font.Gotham
	text.TextSize = 21
	text.TextWrapped = true
	text.TextXAlignment = Enum.TextXAlignment.Left
	text.TextYAlignment = Enum.TextYAlignment.Top
	text.TextColor3 = COLORS.text
	text.Parent = box
	local next = Instance.new("TextButton")
	next.BackgroundTransparency = 1
	next.Size = UDim2.fromScale(1, 1)
	next.Text = ""
	next.ZIndex = 2
	next.Parent = box
	local hint = Instance.new("TextLabel")
	hint.BackgroundTransparency = 1
	hint.Position = UDim2.new(0, 0, 1, -24)
	hint.Size = UDim2.new(1, -12, 0, 20)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 15
	hint.TextXAlignment = Enum.TextXAlignment.Right
	hint.TextColor3 = COLORS.muted
	hint.Text = "화면을 누르면 다음"
	hint.Parent = box

	local function typeLine(line)
		text.Text = line
		text.MaxVisibleGraphemes = 0
		local n = utf8.len(line) or #line
		for i = 1, n do
			if not overlay.Parent then
				return
			end
			text.MaxVisibleGraphemes = i
			task.wait(0.015)
		end
		text.MaxVisibleGraphemes = -1
	end

	local done = false
	local function close()
		done = true
		overlay:Destroy()
	end
	local idx = 1
	local advancing = false
	local function showChoices()
		next:Destroy()
		hint.Text = ""
		text.Size = UDim2.new(1, -28, 0, 64)
		text.Text = ev.lines[#ev.lines]
		text.TextSize = 19
		local list = Instance.new("Frame")
		list.BackgroundTransparency = 1
		list.Position = UDim2.fromOffset(14, 108)
		list.Size = UDim2.new(1, -28, 1, -114)
		list.Parent = box
		local lay = Instance.new("UIListLayout")
		lay.Padding = UDim.new(0, 5)
		lay.Parent = list
		for _, ch in ev.choices do
			local label = ch.text
			local b = mkButton(list, label, COLORS.blue, UDim2.new(1, 0, 0, 46), function()
				local result = if ev.submit then ev.submit(ch.index) else call("PlayStory", { eventId = ev.id, choice = ch.index })
				if not result then
					hint.Text = "잠시 후 다시 눌러 주세요"
				elseif not result.ok then
					-- 실패 이유를 대화창 안에 바로 보여 준다
					hint.Text = tostring(result.message or "처리하지 못했어요")
					hint.TextColor3 = COLORS.red
					hint.TextSize = 16
				end
				if result and result.ok then
					for _, c in list:GetChildren() do
						if c:IsA("TextButton") then
							c:Destroy()
						end
					end
					nameTag.Text = ""
					text.TextSize = 20
					text.Size = UDim2.new(1, -28, 1, -90)
					text.Text = result.message
					text.MaxVisibleGraphemes = -1
					if ev.art == "epilogue" then
						epilogueMessage = result.message
					end
					local ok = mkButton(list, "닫기", COLORS.gold, UDim2.new(1, 0, 0, 46), close, true)
					ok.LayoutOrder = 9
					list.Position = UDim2.new(0, 14, 1, -56)
					list.Size = UDim2.new(1, -28, 0, 48)
				end
			end, true)
			b.TextSize = 18
		end
	end
	next.Activated:Connect(function()
		if advancing then
			return
		end
		advancing = true
		idx += 1
		if idx > #ev.lines then
			showChoices()
		else
			typeLine(ev.lines[idx])
		end
		advancing = false
	end)
	task.spawn(function()
		typeLine(ev.lines[1])
	end)
	while not done and overlay.Parent do
		task.wait(0.2)
	end
	if epilogueMessage then
		local m = epilogueMessage
		epilogueMessage = nil
		task.wait(0.3)
		playEpilogue(m)
	end
end

-- 탭 화면 -------------------------------------------------------------------

local order = 0
function H.nextOrder()
	order += 1
	return order
end

local function add(builder)
	local obj = builder()
	obj.LayoutOrder = H.nextOrder()
	if obj.Parent == nil then
		obj.Parent = content -- 직접 만든 프레임(지도, 카드 격자)도 목록에 넣는다
	end
	return obj
end

-- 핵심 수치 띠: 칸마다 작은 이름 + 큰 값(색으로 좋음/나쁨/중요 구분). 모든 시설 창 공통.
-- items = { { label, value, tone = "good" | "bad" | "key" | nil }, ... }
H.TONE = { good = Color3.fromRGB(47, 122, 58), bad = Color3.fromRGB(166, 42, 31), key = Color3.fromRGB(154, 79, 10) }
-- 지갑 줄: 가운데에 내 코인을 크게, 양옆에 지금 한 번에 처리할 일 (채우기·수리·납품)
function H.walletBar(mode)
	add(function()
		local sh, sy, p = view.ship, view.shipyard, view.player
		local f = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, 70), Color3.fromRGB(58, 42, 28))
		corner(f, 10)
		local coin = mkLabel(f, "💰 " .. H.commas(p.coins), 24, Color3.fromRGB(255, 226, 120), true)
		coin.AnchorPoint = Vector2.new(0.5, 0)
		coin.Position = UDim2.new(0.5, 0, 0, 6)
		coin.Size = UDim2.fromOffset(220, 30)
		coin.AutomaticSize = Enum.AutomaticSize.None
		coin.TextXAlignment = Enum.TextXAlignment.Center
		local needCrew = math.max(0, sh.maxCrew - sh.crew)
		local needSup = math.max(0, (view.supplyMax or 100) - sh.supplies)
		local info = mkLabel(f, string.format("선원 %d/%d · 보급 %d/%d · 선체 %d%%", sh.crew, sh.maxCrew, sh.supplies, view.supplyMax or 100, math.floor(sh.hull / math.max(1, sh.maxHull) * 100 + 0.5)), 12, Color3.fromRGB(230, 214, 180), false)
		info.AnchorPoint = Vector2.new(0.5, 0)
		info.Position = UDim2.new(0.5, 0, 0, 40)
		info.Size = UDim2.fromOffset(300, 22)
		info.AutomaticSize = Enum.AutomaticSize.None
		info.TextXAlignment = Enum.TextXAlignment.Center
		local cost = needCrew * sy.hireCost + needSup * sy.supplyCost
		local fill = mkButton(f, if cost > 0 then string.format("채우기\n%d", cost) else "준비 완료", COLORS.gold, UDim2.fromOffset(86, 54), function() call("Resupply", { what = "both" }) end, cost > 0)
		fill.Position = UDim2.fromOffset(8, 8)
		local right
		if mode == "tavern" then
			local n = 0
			for _, q in view.quests.active do
				if q.kind == "deliver" and q.progress >= q.amount then
					n += 1
				end
			end
			-- 납품할 퀘스트가 없을 땐 버튼 자체를 숨겨 화면을 비운다
			right = if n == 0 then nil else mkButton(f, string.format("의뢰 납품\n%d건", n), COLORS.green, UDim2.fromOffset(86, 54), function()
				task.spawn(function()
					for _, q in view.quests.active do
						if q.kind == "deliver" and q.progress >= q.amount then
							call("TurnIn", { questId = q.id })
						end
					end
				end)
			end, n > 0)
		else
			right = mkButton(f, if (sy.missing or 0) > 0 then string.format("%s\n%d", if sy.field then "응급 수리" else "수리", sy.repairTotal) else "선체 튼튼", COLORS.green, UDim2.fromOffset(86, 54), function() call("Repair") end, (sy.missing or 0) > 0)
		end
		if right then
			right.AnchorPoint = Vector2.new(1, 0)
			right.Position = UDim2.new(1, -8, 0, 8)
		end
		-- [모바일] 재화와 선체 상태 위, 정비·납품 버튼 아래의 2단 배치.
		local function fitWallet()
			local compact = f.AbsoluteSize.X > 0 and f.AbsoluteSize.X < 460
			f.Size = UDim2.new(1, -6, 0, if compact then 122 else 70)
			coin.Size = if compact then UDim2.new(1, -24, 0, 30) else UDim2.fromOffset(220, 30)
			coin.TextSize = if compact then 22 else 24
			info.Size = if compact then UDim2.new(1, -20, 0, 22) else UDim2.fromOffset(300, 22)
			info.Position = UDim2.new(0.5, 0, 0, if compact then 37 else 40)
			fill.Position = if compact then UDim2.fromOffset(8, 68) else UDim2.fromOffset(8, 8)
			fill.Size = if compact then UDim2.new(if right then 0.5 else 1, if right then -12 else -16, 0, 46) else UDim2.fromOffset(86, 54)
			if right then
				right.AnchorPoint = if compact then Vector2.new(0, 0) else Vector2.new(1, 0)
				right.Position = if compact then UDim2.new(0.5, 4, 0, 68) else UDim2.new(1, -8, 0, 8)
				right.Size = if compact then UDim2.new(0.5, -12, 0, 46) else UDim2.fromOffset(86, 54)
			end
		end
		f:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitWallet)
		task.defer(fitWallet)
		return f
	end)
end

function H.statStrip(items)
	-- [전체 메뉴 공통 지표] 작은 화면은 2열로 나눠 수치가 잘리지 않게 한다.
	add(function()
		local strip = Instance.new("Frame")
		strip.Name = "MenuSummaryMetrics"
		strip.BackgroundTransparency = 1
		strip.Size = UDim2.new(1, -6, 0, 50)
		local lay = Instance.new("UIGridLayout")
		lay.CellPadding = UDim2.fromOffset(6, 6)
		lay.SortOrder = Enum.SortOrder.LayoutOrder
		lay.Parent = strip
		for i, it in items do
			local chip = Instance.new("Frame")
			chip.LayoutOrder = i
			chip.BackgroundColor3 = Color3.fromRGB(236, 214, 170)
			chip.BorderSizePixel = 0
			corner(chip, 6)
			chip.Parent = strip
			local st = Instance.new("UIStroke")
			st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			st.Color = INK_EDGE
			st.Transparency = 0.4
			st.Parent = chip
			local lb = Instance.new("TextLabel")
			lb.BackgroundTransparency = 1
			lb.Position = UDim2.fromOffset(8, 4)
			lb.Size = UDim2.new(1, -16, 0, 16)
			lb.Font = Enum.Font.Gotham
			lb.TextSize = 12
			lb.TextXAlignment = Enum.TextXAlignment.Left
			lb.TextTruncate = Enum.TextTruncate.AtEnd
			lb.TextColor3 = INK_SOFT
			lb.Text = it[1]
			lb.Parent = chip
			local vl = Instance.new("TextLabel")
			vl.BackgroundTransparency = 1
			vl.Position = UDim2.fromOffset(8, 20)
			vl.Size = UDim2.new(1, -16, 0, 26)
			vl.Font = Enum.Font.GothamBold
			vl.TextSize = 18
			vl.TextXAlignment = Enum.TextXAlignment.Left
			vl.TextTruncate = Enum.TextTruncate.AtEnd
			vl.TextColor3 = H.TONE[it.tone or "key"] or INK
			vl.Text = it[2]
			vl.Parent = chip
		end
		local function fitStrip()
			local width = strip.AbsoluteSize.X
			if width <= 0 then return end
			local cols = if width < 460 and #items >= 3 then 2 else math.max(1, #items)
			local rows = math.ceil(#items / cols)
			lay.CellSize = UDim2.new(1 / cols, -6 * (cols - 1) / cols, 0, 50)
			local height = rows * 50 + (rows - 1) * 6
			if strip.Size.Y.Offset ~= height then
				strip.Size = UDim2.new(1, -6, 0, height)
			end
		end
		strip:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitStrip)
		task.defer(fitStrip)
		return strip
	end)
end

local intelName
local addRumorPanel
local RENDERERS: { [string]: any } = {}

function RENDERERS.harbor()
	local h = view.harbor
	H.walletBar("harbor")
	-- [항구 수요·산업] 특산/수요/발전의 실측 항목을 한눈에 확인.
	H.statStrip({
		{ "지역 특산", tostring(#(h.produces or {})) .. "종", tone = "good" },
		{ "항구 수요", tostring(#(h.demands or {})) .. "종", tone = "key" },
		{ "항구 발전", tostring(h.level) .. "단계", tone = "key" },
	})
	add(function() return mkHeader(content, view.player.portName .. " · " .. h.name .. " (" .. h.level .. "단계)") end)
	add(function()
		return mkLabel(content, string.format("특산: %s\n수요: %s", table.concat(h.produces, ", "), table.concat(h.demands, ", ")), 16, COLORS.text, true)
	end)
	-- [항구별 특산 산업] 실물경제 시뮬의 품목별 생산·재고·가격·기술 발전을 표시한다.
	if h.sim and h.sim.specialties and #h.sim.specialties > 0 then
		add(function() return mkHeader(content, "지역 특산품 · 산업 발전") end)
		for _, sp in ipairs(h.sim.specialties) do
			add(function()
				local status = string.format("%s · %d단계 · 생산 %.2f · 재고 %d · 시세 %.1f",
					sp.industry, sp.level, sp.produced, sp.stock, sp.price)
				if sp.input then status ..= "\n투입 원료 " .. sp.input end
				if sp.nextProduct then status ..= "\n다음 가공 " .. sp.nextProduct end
				if sp.researchName then status ..= " · 관련 학문 " .. sp.researchName end
				return mkRow(content, sp.name, status, {}, if sp.input or sp.nextProduct then 88 else 64)
			end)
		end
	end
	-- [항구 산업] 백과 가공법과 재고가 실제 지역 브랜드 및 해외 수출로 이어진다.
	if h.sim and h.sim.industries and #h.sim.industries > 0 then
		add(function() return mkHeader(content, "항구별 명품 산업 · 4단계 발전") end)
		for _, industry in ipairs(h.sim.industries) do
			add(function()
				local detail = string.format("원료 %s %d → 가공 %s %d → 특산품 %s %d\n%s · 생산 %.2f · 수입 %.2f · 수출 %.2f\n학문 %s · 공급 항구 %s\n다음 목표: %s",
					industry.raw, industry.rawStock or 0, industry.processed, industry.processedStock or 0,
					industry.name, industry.stock, industry.status, industry.produced, industry.imported or 0,
					industry.exported, industry.researchName or industry.research or "-",
					industry.supplier or "현지 자급", industry.nextStep or "-")
				return mkRow(content, industry.name .. " · " .. industry.stage .. "/4", detail, {}, 132)
			end)
		end
	end
	if h.economy then
		local e = h.economy
		H.statStrip({
			{ "경기지수", tostring(e.index), tone = if e.index >= 100 then "good" else "bad" },
			{ "물가지수", tostring(e.priceIndex), tone = "key" },
			{ "실업률", string.format("%d%%", e.unemployment), tone = if e.unemployment > 12 then "bad" else "good" },
			{ "인구", (if e.migration >= 0 then "+" else "") .. tostring(e.migration), tone = if e.migration >= 0 then "good" else "bad" },
		})
		local lines = { string.format("%s · %s · 금리 %.1f%% · %s 가치 %d", e.regimeName, h.portType or "", e.interest, e.currency.name, e.currency.index) }
		if e.festival then table.insert(lines, "축제: " .. e.festival) end
		for _, b in e.boosts or {} do
			table.insert(lines, string.format("부흥: %s (%d일 남음)", b.name, b.left))
		end
		for _, ev in e.events or {} do
			table.insert(lines, string.format("%s: %s (%d일 남음)", if ev.kind == "disaster" then "재해" else "행운", ev.title, ev.left))
		end
		for i, n in e.news or {} do
			if i <= 2 then table.insert(lines, "소식: " .. n) end
		end
		if h.nextProduce then table.insert(lines, string.format("다음 특산 %s: %d단계 또는 관련 학문 기술", h.nextProduce.name, h.nextProduce.level)) end
		add(function() return mkLabel(content, table.concat(lines, "\n"), 13, COLORS.text, false) end)
	end
	add(function()
		local nextText = if h.nextAt then string.format("다음 단계까지 %d 더 투자", h.nextAt - h.invested) else "최고 단계예요"
		return mkLabel(content, string.format("누적 투자 %d · %s\n혜택: 이 항구에서 팔 때 +%d%%, 수리·고용·보급 비용 -%d%%", h.invested, nextText, math.floor(h.sellBonus * 100 + 0.5), math.floor(h.discount * 100 + 0.5)), 13, COLORS.text, false)
	end)
	local function section(title)
		add(function() return mkHeader(content, title) end)
	end
	local fac = {}
	for _, k in view.facilities do
		fac[k] = true
	end

	if fac.bank then
		local b = view.bank
		section("은행")
		add(function()
			return mkLabel(content, string.format("%s (항구 %d단계) — 발전할수록 이자·한도가 좋아져요\n예금 %d (30일 이자 %.2f%%)\n대출 %d / 한도 %d (30일 이자 %.2f%%)", b.name or "은행", b.level or 1, b.deposit, b.depositRate * 100, b.loan, b.limit, b.loanRate * 100), 13, COLORS.text, false)
		end)
		for _, amt in { 100, 1000, 10000 } do
			add(function()
				return mkRow(content, string.format("%d 코인", amt), "예금 / 인출 / 대출 / 상환", {
					{ text = "예금", color = COLORS.green, onClick = function() call("Deposit", { amount = amt }) end },
					{ text = "인출", color = COLORS.grey, onClick = function() call("Withdraw", { amount = amt }) end },
					{ text = "대출", color = COLORS.gold, onClick = function() call("Borrow", { amount = amt }) end },
					{ text = "상환", color = COLORS.blue, onClick = function() call("Repay", { amount = amt }) end },
				}, 56)
			end)
		end
	end

	if view.exchange then
		local ex = view.exchange
		section(ex.name)
		add(function()
			return mkLabel(content, string.format("주식은 날짜에 따라 실제 역사처럼 오르내려요. 수수료 %.1f%% (상업·경제학 지식을 이해할수록 줄어요) · 다음 배당까지 %d일 · 지금까지 배당 %d코인", ex.fee, ex.nextDividend, ex.divTotal), 12, COLORS.muted, false)
		end)
		for _, r in ex.rows do
			if r.listed then
				add(function()
					local arrow = if r.change > 0 then "▲" elseif r.change < 0 then "▼" else "－"
					local sub = string.format("%s %d%% (30일)  ·  배당 연 %d%%  ·  보유 %d주%s\n%s", arrow, math.abs(r.change), r.dividend, r.held, if r.held > 0 then string.format(" (평균 %d)", r.avg) else "", r.summary)
					return mkRow(content, string.format("%s  %d코인", r.name, r.price), sub, {
						{ text = "10주 사기", color = COLORS.green, onClick = function() call("StockBuy", { id = r.id, amount = 10 }) end },
						{ text = "전부 팔기", color = COLORS.red, onClick = function() call("StockSell", { id = r.id, amount = 1000000 }) end, enabled = r.held > 0 },
					}, 76)
				end)
			end
		end
	end

	if view.portBuildings then
		section("항구 건물 계통 (상인 조합소에서 은행까지, 항구도 단계마다 발전해요)")
		for _, ch in view.portBuildings do
			add(function()
				local sub = string.format("%d / %d단계%s", ch.stage, ch.total, if ch.built ~= "" then " · " .. ch.built else "")
				if ch.next then
					sub ..= string.format("\n다음: %s (%d코인) — %s\n%s", ch.next.name, ch.next.cost, if ch.next.can then "지을 수 있어요" else tostring(ch.next.why), ch.next.lore)
				end
				return mkRow(content, ch.name, sub, {
					{ text = "건축", color = COLORS.gold, onClick = function() call("BuildStage", { chain = ch.id }) end, enabled = ch.next ~= nil and ch.next.can },
				}, 112)
			end)
		end
	end

	if fac.guild then
		section("상인 길드")
		local g = view.guild
		if g.contract then
			local c = g.contract
			add(function()
				return mkRow(content, string.format("진행 중: %s %d개 → %s", c.goodName, c.amount, c.toPortName), string.format("보상 %d · 남은 %d일 · 보유 %d", c.reward, c.daysLeft, c.have), {
					{ text = "납품", color = COLORS.green, onClick = function() call("TurnInContract", {}) end },
					{ text = "포기", color = COLORS.red, onClick = function() call("AbandonContract", {}) end },
				}, 60)
			end)
		end
		for _, o in g.offers do
			add(function()
				return mkRow(content, string.format("%s %d개 → %s", o.goodName, o.amount, o.toPortName), string.format("보상 %d코인 · 명성 +%d", o.reward, o.fame), {
					{ text = "계약", color = COLORS.blue, onClick = function() call("AcceptContract", { index = o.index }) end },
				}, 56)
			end)
		end
	end

	if fac.harbormaster then
		local hm = view.harbormaster
		section("항만청")
		add(function()
			local lic = if hm.nextLicense then string.format("다음 면허 '%s': 명성 %d · 수수료 %d", hm.nextLicense.name, hm.nextLicense.fame, hm.nextLicense.fee) else "최고 면허를 받았어요"
			return mkLabel(content, string.format("현재 면허: %s\n%s\n등급 N+1 배를 사려면 면허 N단계가 필요해요.", hm.license or "없음", lic), 13, COLORS.text, false)
		end)
		if hm.nextLicense then
			add(function()
				return mkRow(content, hm.nextLicense.name, string.format("명성 %d · 수수료 %d코인", hm.nextLicense.fame, hm.nextLicense.fee), {
					{ text = "발급", color = COLORS.gold, onClick = function() call("BuyLicense", {}) end },
				}, 52)
			end)
		end
		add(function()
			return mkRow(content, "해상 보험", if hm.insured then "가입 중 (패배 손실을 한 번 막아 줘요)" else string.format("보험료 %d코인 · 패배 시 코인·화물 손실 방지 1회", hm.insurancePrice), {
				{ text = if hm.insured then "가입중" else "가입", color = COLORS.blue, onClick = function() call("BuyInsurance", {}) end, enabled = not hm.insured },
			}, 56)
		end)
	end

	if fac.palace then
		local pl = view.palace
		section(pl.name)
		add(function()
			local t = if pl.nextTitle then string.format("다음 작위 '%s': 명성 %d 필요 (보상 %d코인)", pl.nextTitle, pl.nextFame, pl.nextCoins) else "최고 작위를 받았어요"
			local royal = if pl.royalTier then string.format("\n왕궁 구역 %d단계 / 도시 %d단계 · 일반 항구보다 필지 %.2f배", pl.royalTier, pl.cityTier, pl.royalPlotScale) else ""
			local population = if pl.worldPopulation then string.format("\n세계경제 실제 인구: %d명 · 왕궁 주변 시설은 발전도·번영에 따라 변함", pl.worldPopulation) else ""
			return mkLabel(content, string.format("현재 작위: %s\n%s%s%s", pl.title or "없음", t, royal, population), 13, COLORS.text, false)
		end)
		if pl.nextTitle then
			add(function()
				return mkRow(content, "알현하기", "명성이 충분하면 작위를 받아요", {
					{ text = "알현", color = COLORS.gold, onClick = function() call("Audience", {}) end },
				}, 52)
			end)
		end
	end

	add(function() return mkHeader(content, "길드 의뢰 보드 (7일마다 바뀌어요)") end)
	for _, b in view.board or {} do
		add(function()
			local sub = string.format("보상 %d코인 · 명성 %d%s", b.coins, b.fame, if b.progress then string.format(" · 진행 %d/%d", b.progress, b.count) else "")
			local btn
			if b.state == "done" then
				btn = { text = "완료", color = COLORS.grey, enabled = false, onClick = function() end }
			elseif b.state == "taken" then
				btn = { text = "제출", color = COLORS.green, onClick = function() call("TurnInBounty", { bountyId = b.id }) end }
			else
				btn = { text = "수락", color = COLORS.blue, onClick = function() call("AcceptBounty", { bountyId = b.id }) end }
			end
			local brow = mkRow(content, b.title, sub, { btn }, 60)
			withIcon(brow, "Cargo", if b.kind == "hunt" then "box-open" else "crate" , nil, 44)
			return brow
		end)
	end
	add(function() return mkHeader(content, "출항 준비") end)
	add(function()
		local sh = view.ship
		local sy = view.shipyard
		local m = view.morale or 80
		local mText = if m >= 70 then "높음" elseif m >= 40 then "보통" elseif m >= 25 then "낮음" else "바닥 탈영 위험"
		local needCrew = math.max(0, sh.maxCrew - sh.crew)
		local needSup = math.max(0, (view.supplyMax or 100) - sh.supplies)
		local cost = needCrew * sy.hireCost + needSup * sy.supplyCost
		local full = needCrew == 0 and needSup == 0
		local row = mkRow(content, if full then "출항 준비 완료" else "채울 게 있어요",
			string.format("선원 %d/%d · 보급품 %d/%d · 사기 %s", sh.crew, sh.maxCrew, sh.supplies, view.supplyMax or 100, mText), {
			{ text = if full then "가득 참" else string.format("모두 채우기\n%d코인", cost), color = COLORS.gold,
				onClick = function() call("Resupply", { what = "both" }) end },
		}, 76)
		return row
	end)
	add(function()
		local a = view.auto or {}
		local both = a.supplies and a.crew
		return mkRow(content, "자동 채움 " .. (if both then "● 켜짐" else "○ 꺼짐"), "항구에 도착하면 보급품과 선원을 알아서 채워요", {
			{ text = if both then "끄기" else "켜기", color = if both then COLORS.red else COLORS.green, onClick = function()
				local v = not both
				call("SetAuto", { key = "supplies", value = v })
				call("SetAuto", { key = "crew", value = v })
			end },
		}, 64)
	end)
	add(function() return mkHeader(content, "교역소 투자") end)
	for _, amt in h.options do
		add(function()
			return mkRow(content, string.format("%d 코인 투자", amt), string.format("명성 +%d", math.floor(amt / 100)), {
				{ text = "투자", color = COLORS.gold, onClick = function() call("Invest", { amount = amt }) end },
			}, 52)
		end)
	end
	add(function()
		local o = view.order
		if not o then return mkLabel(content, "", 4, COLORS.text, false) end
		local sub = string.format("치안 %d (%s) · 기본 %d · 판매 비율 %+.1f%%", o.value, o.label, o.target, o.sellBonus * 100)
		local btn = if o.cooldownLeft > 0 then string.format("%d일 뒤", o.cooldownLeft) else string.format("순찰 %d코인", o.cost)
		return mkRow(content, "항구 치안", sub .. "\n순찰을 보내면 치안 +" .. o.gain .. " (재해가 닥치면 떨어지고, 방어 건물·교역소 투자로 기본이 올라요)", {
			{ text = btn, color = COLORS.gold, enabled = o.cooldownLeft <= 0, onClick = function() call("OrderPatrol", {}) end },
		}, 88)
	end)
	add(function() return mkHeader(content, "주점") end)
	add(function()
		return mkRow(content, "소문 듣기", string.format("술값 %d · 지금 여기서 사서 다른 항구에 팔면 남는 상품\n(지금 정보 수준: %s)", h.rumorCost, intelName(view.intel or 0)), {
			{ text = "듣기", color = COLORS.blue, onClick = function()
				local res = call("Rumor", {})
				if res and res.ok and view and view.rumor and #view.rumor.lines > 0 then
					H.playRumorScene(view.rumor)
				end
			end },
		}, 72)
	end)
	addRumorPanel()
	add(function()
		return mkRow(content, "선원 회식", string.format("%d코인 · 사기 +30 (사기가 낮으면 탈영하고, 긴 항해에는 괴혈병이 돌아요)", view.feastCost or 30), {
			{ text = "한턱", color = COLORS.gold, onClick = function() call("Feast", {}) end },
		}, 72)
	end)
	add(function()
		local names = {}
		for _, m in view.maps or {} do
			table.insert(names, m.toName)
		end
		local mrow = mkRow(content, "보물지도 사기", string.format("200코인 · 가진 지도 %d/3%s\n표시된 항구로 가면 보물을 찾아요", #names, if #names > 0 then (": " .. table.concat(names, ", ")) else ""), {
			{ text = "구입", color = COLORS.gold, onClick = function() call("BuyMap", {}) end },
		}, 72)
		withIcon(mrow, "Relics", "map-rolled", nil, 52)
		return mrow
	end)
end

-- 주점 '동료' 탭: 영입할 수 있는 동료를 위에 모아 표시한다
function RENDERERS.recruit()
	local list = {}
	local open = 0
	for _, c in view.companions.list do
		if c.role then
			table.insert(list, c)
			if not c.joined and c.blocked == nil then open += 1 end
		end
	end
	-- 영입 가능 → 영입 불가 → 이미 합류 순서
	local function rank(c)
		if c.joined then return 3 end
		if c.blocked == nil then return 1 end
		return 2
	end
	table.sort(list, function(a, b)
		if rank(a) ~= rank(b) then return rank(a) < rank(b) end
		return a.fee < b.fee
	end)
	local joined = 0
	for _, c in view.companions.list do if c.joined then joined += 1 end end
	H.statStrip({
		{ "영입 가능", tostring(open) .. "명", tone = "good" },
		{ "승선 동료", tostring(joined) .. "명", tone = "key" },
		{ "배치 가능", tostring(math.max(0, (view.companions.max or 0) - joined)) .. "자리", tone = "key" },
		{ "보유 코인", H.commas(view.player.coins), tone = "key" },
	})
	add(function() return mkHeader(content, string.format("주점 동료 · 영입 가능 %d명 (자리 %d칸)", open, view.companions.max or 0)) end)
	if #list == 0 then
		add(function() return mkLabel(content, "이 항구의 주점에는 영입할 동료가 없어요.", 14, COLORS.muted, true) end)
	end
	add(function()
		local tiles = {}
		for _, c in list do
			local sub = if c.joined then string.format("합류 중 · 호감도 %d", c.affinity)
				else string.format("영입 %d코인 · 호감도 %d", c.fee, c.affinity)
			local desc = if c.blocked and not c.joined then c.blocked else c.summary
			local scholarId = string.match(c.id, "^c_(.+)$")
			local portrait = COMPANION_PORTRAIT[c.id]
			local tile: any = { title = string.format("[%s] %s", c.role, c.name), sub = sub, desc = desc, icon = "status" }
			if portrait then
				tile.portrait = { atlas = portrait.atlas, offset = portrait.offset }
			elseif scholarId and SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. scholarId] then
				tile.portrait = { atlas = "scholar_" .. scholarId }
			elseif COMPANION_MODEL[c.id] then
				tile.kind, tile.icon = "People", COMPANION_MODEL[c.id]
			end
			if c.joined then
				tile.btn, tile.color = "대화", COLORS.blue
				tile.onClick = function() call("Talk", { companionId = c.id }) end
				tile.btn2 = { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
			else
				tile.btn, tile.color, tile.enabled = "영입", COLORS.green, c.blocked == nil
				tile.onClick = function() call("Recruit", { companionId = c.id }) end
			end
			table.insert(tiles, tile)
		end
		return H.tileGrid(tiles, content, 190, 210)
	end)
end

function RENDERERS.crew()
	-- [동료 배치 현황] 기존 선장실 배치 데이터를 그대로 요약한다.
	local joined, filled, matched = 0, 0, 0
	for _, c in (view.companions.list or {}) do if c.joined then joined += 1 end end
	for _, st in (view.companions.stations or {}) do
		if st.seatId then filled += 1; if st.matched then matched += 1 end end
	end
	H.statStrip({
		{ "승선 동료", tostring(joined) .. "명", tone = "key" },
		{ "직책 배치", tostring(filled) .. "/" .. tostring(#(view.companions.stations or {})), tone = "good" },
		{ "적합 직책", tostring(matched) .. "자리", tone = "good" },
		{ "미배치", tostring(math.max(0, joined - filled)) .. "명", tone = if joined > filled then "bad" else "good" },
	})
	add(function() return mkHeader(content, "동료와 대화") end)
	add(function()
		return mkLabel(content, "배에 탄 동료의 [대화] 버튼을 누르면 이야기를 나눌 수 있어요. 대화할수록 호감도가 올라 새 이야기와 선물이 열려요.", 13, COLORS.muted, true)
	end)
	add(function() return mkHeader(content, string.format("내 배 · 동료 자리 %d칸", view.companions.max)) end)
	add(function()
		local sh = view.ship
		local row = mkRow(content, sh.name .. "  (눌러서 선장실 열기)", string.format("선체 %d/%d · 선원 %d/%d · 포 %d · 속도 %d\n동료를 끌어다 자리에 앉힐 수 있어요", sh.hull, sh.maxHull, sh.crew, sh.maxCrew, sh.cannons, sh.speed), {
			{ text = "선장실", color = COLORS.gold, onClick = function() H.openCabin() end },
			{ text = "자동 배치", color = COLORS.green, onClick = function() call("AutoStations") end },
		}, 120)
		local si = SHIP_ICON[sh.id]
		if si then withIcon(row, si[1], si[2], si[3], 96) end
		return row
	end)
	add(function() return mkHeader(content, string.format("배의 자리 (이 배는 동료 %d명까지)", view.companions.max)) end)
	add(function()
		local vac = view.companions.vacancy
		local warn = ""
		if vac and (vac.speed < 0 or vac.cannon < 0) then
			warn = "\n조타수/포술장 자리가 비어 있어 " .. (if vac.speed < 0 then "항해 속도 -2% " else "") .. (if vac.cannon < 0 then "포격 -2%" else "")
		end
		return mkLabel(content, "동료는 자기 직책 자리에 앉으면 효과 x1.2, 다른 자리에 앉으면 x0.6이에요. 버튼을 누르면 자리를 바꿔요." .. warn, 12, COLORS.muted, true)
	end)
	for _, st in view.companions.stations do
		add(function()
			local joined = {}
			for _, c in view.companions.list do
				if c.joined and c.id ~= st.seatId then
					table.insert(joined, c)
				end
			end
			H.stationPick = H.stationPick or {}
			local idx = (H.stationPick[st.id] or 0) % math.max(1, #joined) + 1
			local nxt = joined[idx]
			local seatText = if st.seatName then (st.seatName .. (if st.matched then "  (딱 맞음)" else "  (다른 직책)")) else "비어 있음"
			local btns = {}
			local fit = nil
			for _, c in joined do
				if c.bestSeat == st.name then fit = c; break end
			end
			if fit and fit ~= nxt then
				table.insert(btns, { text = "추천 " .. fit.name, color = COLORS.green or COLORS.blue, onClick = function()
					call("Station", { companionId = fit.id, station = st.id })
				end })
			end
			if nxt then
				table.insert(btns, { text = "▶ " .. nxt.name, color = COLORS.blue, onClick = function()
					H.stationPick[st.id] = idx
					call("Station", { companionId = nxt.id, station = st.id })
				end })
			end
			return mkRow(content, st.name .. " · " .. seatText, st.summary, btns, 60)
		end)
	end
	add(function() return mkHeader(content, "동료") end)
	if view.talk then
		add(function()
			-- 실제 동료 대화에 기존 등록 초상화를 연결한다. 호감도·대화·저장은 그대로 둔다.
			local talkId = nil
			for _, companion in view.companions.list do
				if companion.name == view.talk.name then
					talkId = companion.id
					break
				end
			end
			local row = mkRow(content, view.talk.name, "\"" .. view.talk.line .. "\"\n" .. (view.talk.note or ""), nil, 136)
			local scholarId = if talkId then string.match(talkId, "^c_(.+)$") else nil
			local portrait = COMPANION_PORTRAIT[talkId]
			if portrait then
				withIcon(row, "Portraits", portrait.atlas, nil, 68, portrait.offset)
			elseif scholarId and SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. scholarId] then
				withIcon(row, "Portraits", "scholar_" .. scholarId, nil, 68)
			elseif talkId and COMPANION_MODEL[talkId] then
				withIcon(row, "People", COMPANION_MODEL[talkId], nil, 68)
			end
			return row
		end)
	end
	if view.talk and view.talk.options then
		add(function()
			return mkLabel(content, view.talk.question or "", 16, COLORS.gold, true)
		end)
		for i, text in view.talk.options do
			add(function()
				return mkRow(content, text, "", { { text = "대답", color = COLORS.green, onClick = function() call("TalkChoice", { index = i }) end } }, 48)
			end)
		end
	end
	add(function()
		local tiles = {}
		for _, c in view.companions.list do
			local tier = ({ "낯선 사이", "믿는 사이", "오랜 벗" })[c.tier]
			local tile: any = {
				title = c.name .. (if c.joined then " (합류)" else ""),
				sub = string.format("호감도 %d · %s", c.affinity, tier),
				desc = string.format("%s · 어울리는 자리 %s%s", c.summary, c.bestSeat, if c.blocked and not c.joined then " · " .. c.blocked else ""),
				icon = "status",
			}
			local scholarId = string.match(c.id, "^c_(.+)$")
			local portrait = COMPANION_PORTRAIT[c.id]
			if portrait then
				tile.portrait = { atlas = portrait.atlas, offset = portrait.offset }
			elseif scholarId and SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. scholarId] then
				tile.portrait = { atlas = "scholar_" .. scholarId }
			elseif COMPANION_MODEL[c.id] then
				tile.kind, tile.icon = "People", COMPANION_MODEL[c.id]
			end
			if c.joined then
				tile.btn, tile.color = "대화", COLORS.blue
				tile.onClick = function() call("Talk", { companionId = c.id }) end
				tile.btn2 = { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
			else
				tile.btn, tile.color, tile.enabled = string.format("영입 %d코인", c.fee), COLORS.green, c.blocked == nil
				tile.onClick = function() call("Recruit", { companionId = c.id }) end
			end
			table.insert(tiles, tile)
		end
		return H.tileGrid(tiles, content, 190, 210)
	end)
end

function RENDERERS.status()
	local p, ship = view.player, view.ship
	H.counselRows(1)
	add(function() return mkHeader(content, "선박") end)
	H.statStrip({
		{ ship.name .. (if ship.steam then " (증기)" else ""), string.format("선체 %d/%d", ship.hull, ship.maxHull), tone = if ship.hull < ship.maxHull * 0.5 then "bad" else "good" },
		{ "선원", string.format("%d/%d", ship.crew, ship.maxCrew), tone = "key" },
		{ "포 · 속도", string.format("%d · %d", ship.cannons, ship.speed), tone = "key" },
	})
	H.statStrip({
		{ "화물", string.format("%d/%d", ship.cargoUsed, ship.cargoCapacity), tone = "key" },
		{ "보급품", tostring(ship.supplies), tone = if ship.supplies <= 8 then "bad" else "key" },
		{ "석탄", tostring(ship.coal), tone = "key" },
	})
	-- [선장 현황] 현재 배의 역할·갑판 대포·개조 효과를 숫자와 설명으로 연결한다.
	add(function()
		local kind = if ship.steam then "증기선 · 석탄 " .. tostring(ship.fuelPerDay) .. "개/일"
			elseif ship.rowed then "노젓기 병행 · 무풍 항해" else "바람을 이용하는 범선"
		return mkRow(content, ship.name .. " · " .. ship.className,
			ship.summary .. "\n" .. kind .. " · " .. ship.cannonName
				.. string.format("\n대포 개조 포격 +%d%% · 선체 보강 %d단계", math.floor(ship.cannonBonus * 100 + 0.5), ship.plating), {
				{ text = "조선소 비교", color = COLORS.blue, onClick = function() openTab("yard") end },
			}, 110)
	end)
	add(function() return mkHeader(content, "해전 카드 지원 (자동)") end)
	add(function()
		local lines = view.navalSupport or {}
		local text = if #lines > 0 then table.concat(lines, "\n") else "덱에 근접·사격·포 카드를 넣으면 해전에서 자동으로 거들어요."
		return mkRow(content, "내 덱이 해전을 돕는 효과", text .. "\n해전에서는 카드를 직접 내지 않아요. 카드 배틀은 전투 본부에서 해요.", {
			{ text = "덱 짜기", color = COLORS.blue, onClick = function() if H.openDeck then H.openDeck() end end },
		}, 110)
	end)
	add(function() return mkHeader(content, "직업") end)
	for _, c in view.careers do
		add(function()
			return mkRow(content, string.format("%s Lv.%d", c.name, c.level), string.format("경험치 %d / %d", c.xp, c.nextXp), nil, 48)
		end)
	end
	if view.village then
		add(function() return mkHeader(content, "마을 발전 (학문을 이해할수록 자라요)") end)
		H.statStrip({
			{ "마을", string.format("Lv.%d %s", view.village.level, view.village.name), tone = "key" },
			{ "들어선 건물", string.format("%d/%d", view.village.built, view.village.total), tone = "key" },
			{ "다음 단계", if view.village.nextAt then string.format("학문 점수 %d/%d", view.village.score, view.village.nextAt) else "최고 단계", tone = "key" },
		})
		add(function()
			local ICON = { food = "harbor", cloth = "trade", home = "yard", industry = "tech", public = "board" }
			local items = {}
			for _, c in view.village.cats do
				table.insert(items, { icon = ICON[c.id] or "map", title = c.name, sub = string.format("%d / %d", c.built, c.total) })
			end
			return H.tileGrid(items, content, 150, 110)
		end)
		if view.village.ports and #view.village.ports > 0 then
			add(function() return mkHeader(content, "항구별 발전도 (점수 = 투자 5 + 건물 단계 3 + 기술 2 + 특수 건축물 4)") end)
			for _, pd in view.village.ports do
				add(function()
					local nextTxt = if pd.nextAt then string.format("다음 %d점", pd.nextAt) else "최고 단계"
					local actual = if pd.worldPopulation then string.format("\n실물경제 %d명 · 대표 주민 %d명 · 화면 필지 %.2f배 · 도시 면적 %.1f배", pd.worldPopulation, pd.worldResidents, pd.worldPlotScale, pd.worldAreaScale) else ""
					return mkRow(content, string.format("%s  Lv.%d %s  (%d점)", pd.name, pd.level, pd.levelName, pd.score),
						string.format("투자 %d단계 · 건물 %d단계 · 기술 %d단계 · 특수 건축물 %d  /  %s\n도시 규모 %s · %d구획 · 소구역 %d곳\n구역 %d개: %s%s\n의식주: %s · 의식주 추정 인구 %d명 · %s\n문화권 %s: %s\n학문 시설 %d곳 · 학문 직업 %d종: %s\n직업 %d종 (새 직업: %s)\n원자재: %s\n가공 가능: %s%s", pd.harbor, pd.stages, pd.tech, pd.landmarks, nextTxt,
							pd.sizeName, pd.blocks, #pd.subDistricts, #pd.districts, table.concat(pd.districts, ", "), if pd.nextDistrict then "  → 다음: " .. pd.nextDistrict else "",
							(function()
								local t = {}
								for _, a in pd.sim.axes do
									table.insert(t, string.format("%s %d%%(%s)%s", a.name, math.floor(math.min(a.pct, 1.5) * 100 + 0.5), a.status, if a.tip then " ▶" .. a.tip else ""))
								end
								return table.concat(t, "  ")
							end)(), pd.sim.pop, "분위기 " .. pd.sim.mood, pd.culture, if #pd.cultureBuildings > 0 then table.concat(pd.cultureBuildings, ", ") else "아직 없음",
							#pd.discFacilities, #pd.discJobs, if #pd.discJobs > 0 then table.concat(pd.discJobs, ", ", 1, math.min(#pd.discJobs, 8)) else "아직 없음", #pd.jobs, table.concat(pd.newJobs, ", "),
							if #pd.raw > 0 then table.concat(pd.raw, " · ") else "없음", if #pd.crafts > 0 then table.concat(pd.crafts, ", ") else "아직 없음", actual), nil, 280)
				end)
			end
		end
		if #view.village.discs > 0 then
			add(function()
				local parts = {}
				for _, d in view.village.discs do
					table.insert(parts, string.format("%s %d단계(%s)", d.name, d.tier, d.tierName))
				end
				return mkLabel(content, "발전한 학문  " .. table.concat(parts, " · "), 15, COLORS.muted, false)
			end)
		end
	end
	add(function() return mkHeader(content, "설정") end)
	add(function()
		local manualOn = player:GetAttribute("ManualHelm") ~= false
		local musicOn, sfxOn = Sfx.state()
		return H.tileGrid({
			{ icon = "route", title = "수동 항해", sub = if manualOn then "켜짐 · 직접 조종" else "꺼짐 · 자동", btn = if manualOn then "자동으로" else "직접 조종", color = if manualOn then COLORS.grey else COLORS.blue,
				onClick = function() player:SetAttribute("ManualHelm", not manualOn) render() end },
			{ icon = "codex", title = "음악", sub = if musicOn then "켜짐" else "꺼짐", btn = if musicOn then "끄기" else "켜기", color = if musicOn then COLORS.grey else COLORS.blue,
				onClick = function() Sfx.setMusicEnabled(not musicOn) render() end },
			{ icon = "battle", title = "효과음", sub = if sfxOn then "켜짐" else "꺼짐", btn = if sfxOn then "끄기" else "켜기", color = if sfxOn then COLORS.grey else COLORS.blue,
				onClick = function() Sfx.setSfxEnabled(not sfxOn) render() end },
		}, content, 176, 150)
	end)
	add(function()
		local ml, sl = Sfx.levels()
		return mkRow(content, string.format("음악 크기 %d%%", math.floor(ml / 1.5 * 100 + 0.5)), "소리가 작으면 크게를 눌러 보세요", {
			{ text = "작게", color = COLORS.grey, onClick = function() Sfx.stepMusic(-1); render() end },
			{ text = "크게", color = COLORS.blue, onClick = function() Sfx.stepMusic(1); render() end },
		}, 52)
	end)
	add(function()
		local ml, sl = Sfx.levels()
		return mkRow(content, string.format("효과음 크기 %d%%", math.floor(sl / 1.5 * 100 + 0.5)), nil, {
			{ text = "작게", color = COLORS.grey, onClick = function() Sfx.stepSfx(-1); render() end },
			{ text = "크게", color = COLORS.blue, onClick = function() Sfx.stepSfx(1); render() end },
		}, 52)
	end)
	add(function() return mkHeader(content, "전문 분야 · 21개 학문은 직업과 무관하게 연구 가능") end)
	add(function()
		local sv = view.specialties
		local msg = "전문 분야 15개는 선택 사항이에요. 직업을 고르지 않아도 21개 학문을 모두 연구하고 숙련도를 올릴 수 있어요. 전문 분야는 관련 연구만 지원해요. 선택하려면 관련 카드가 " .. sv.unlockCards .. "장 필요해요. 전문 숙련: 견습 → 숙련 → 명인 → 대가 → 거장"
		if sv.auto then
			msg ..= "  (예전 저장에서 자동 배정된 전문 분야: 최초 변경은 무료)"
		end
		return mkLabel(content, msg, 12, COLORS.muted, false)
	end)
	for _, sp in view.specialties.list do
		add(function()
			local sv = view.specialties
			local mine = sv.current == sp.id
			local isSub = sv.sub == sp.id
			local sub = sp.summary .. string.format(" · [%s] 전문 Lv.%d", sp.rank, sp.level) .. (if sp.nextXp > 0 then string.format(" (%d/%d)", sp.xp, sp.nextXp) else " (최대)")
			if sp.domain then
				sub = "[" .. sp.domain .. "] " .. sub
			end
			if not sp.unlocked then
				sub ..= string.format(" · 잠김: 관련 카드 %d/%d장", sp.cards, sv.unlockCards)
			elseif sv.current and not mine and sv.changeFee > 0 then
				sub ..= string.format(" · 변경 %d코인", sv.changeFee)
			end
			local title = sp.name .. (if mine then "  (주전문)" elseif isSub then "  (부전문)" else "") .. (if sv.recommend == sp.id and not mine then "  (추천)" else "")
			local buttons = {
				{ text = if mine then "선택됨" else if sp.unlocked then "선택" else "잠김", color = if mine then COLORS.gold else if sp.unlocked then COLORS.blue else COLORS.grey,
					enabled = (not mine) and sp.unlocked, onClick = function() call("SetSpecialty", { specialtyId = sp.id }) end },
			}
			if sv.subOpen and not mine and sp.unlocked then
				table.insert(buttons, { text = if isSub then "부직업 해제" else "부직업", color = COLORS.green, onClick = function() call("SetSubSpecialty", { specialtyId = sp.id }) end })
			end
			return mkRow(content, title, sub, buttons, 64)
		end)
	end
	add(function() return mkHeader(content, string.format("항해 장비 (장착 최대 %d개)", view.gear.slots)) end)
	for _, g in view.gear.list do
		add(function()
			local btn
			if g.owned then
				btn = { text = if g.equipped then "해제" else "장착", color = if g.equipped then COLORS.red else COLORS.green, onClick = function() call("ToggleGear", { gearId = g.id }) end }
			else
				local okFame = view.player.fame >= g.minFame
				btn = { text = tostring(g.price), color = if okFame then COLORS.gold else COLORS.grey, onClick = function()
					if not okFame then
						message, messageOk = string.format("명성이 부족해요 (필요 %d / 현재 %d). 퀘스트·이야기·발견으로 명성을 모으세요", g.minFame, view.player.fame), false
						render()
						return
					end
					call("BuyGear", { gearId = g.id })
				end }
			end
			local grow = mkRow(content, g.name .. (if g.equipped then "  (장착)" else ""), g.summary .. (if not g.owned then string.format(" · 명성 %d 필요", g.minFame) else ""), { btn }, 60)
			local gi = ({
				sextant = { "Relics", "compass-base" }, brass_telescope = { "Relics", "magnifying-glass" }, ledger = { "Relics", "journal-closed" },
				medicine_chest = { "Cargo", "mortar" }, lucky_charm = { "Cargo", "gem-medium" }, naval_chart = { "Relics", "map-rolled" },
			})[g.id]
			if gi then
				withIcon(grow, gi[1], gi[2], nil, 44)
			end
			return grow
		end)
	end
	add(function() return mkHeader(content, "명성 랭킹 (서버 전체 상위 10)") end)
	add(function()
		return mkRow(content, "랭킹 보기", "다른 항해자들의 명성 순위를 불러와요", {
			{ text = "보기", color = COLORS.blue, onClick = function() call("Ranking", {}) end },
		}, 52)
	end)
	if ranking then
		add(function()
			if #ranking == 0 then
				return mkLabel(content, "아직 기록이 없어요 (저장 후 반영돼요)", 15, COLORS.muted, false)
			end
			local lines = {}
			for _, r in ranking do
				table.insert(lines, string.format("%d위  %s  ·  명성 %d", r.rank, r.name, r.fame))
			end
			return mkLabel(content, table.concat(lines, "\n"), 16, COLORS.gold, true)
		end)
	end
	add(function() return mkHeader(content, "기록") end)
	add(function()
		return mkRow(content, string.format("%s · %d년 (항해 %d일째)", p.nation, p.year, p.day),
			string.format("명성 %d · 도감 %d/%d · 완료한 퀘스트 %d", p.fame, view.codex.found, view.codex.total, view.quests.doneCount), nil, 52)
	end)
end

function intelName(level)
	if level >= 3 then
		return "정확한 수치"
	elseif level >= 1 then
		return "대략적인 범위"
	end
	return "감만 잡는 힌트"
end

-- 이야기와 조언: 프롤로그, 새 해역의 막, 동료의 한마디
function H.addStoryPanel()
	if view.prologue then
		add(function() return mkHeader(content, view.prologue.title) end)
		add(function() return mkLabel(content, view.prologue.text, 16, COLORS.gold, true) end)
	end
	if view.actIntro then
		add(function() return mkHeader(content, view.actIntro.title) end)
		add(function() return mkLabel(content, view.actIntro.text .. "\n목표: " .. view.actIntro.goal, 16, COLORS.gold, true) end)
	elseif view.act then
		add(function() return mkLabel(content, view.act.title .. " — 목표: " .. view.act.goal, 15, COLORS.gold, true) end)
	end
	if view.guide then
		add(function() return mkHeader(content, "🧭 " .. view.guide.title) end)
		add(function()
			local lines = {}
			for _, st in view.guide.steps do
				table.insert(lines, st.mark .. " " .. st.text)
			end
			return mkLabel(content, table.concat(lines, "\n"), 15, COLORS.text, true)
		end)
	end
	if view.advice then
		add(function() return mkLabel(content, string.format("💬 %s의 조언\n\"%s\"", view.advice.who, view.advice.text), 16, COLORS.gold, true) end)
	end
end

-- 뱃사람 귀띔: 크게, 눈에 잘 띄게
function addRumorPanel()
	local r = view.rumor
	if not r then
		return
	end
	add(function() return mkHeader(content, "뱃사람 귀띔 · " .. intelName(r.level)) end)
	add(function()
		return mkLabel(content, "· " .. table.concat(r.lines, "\n· "), 17, COLORS.gold, true)
	end)
end


-- 교역소 별도 화면: 상인과 마주 보고 물건을 고르고, 수량을 정하고, 흥정하고, 사고판다 ------------------
local hallQty = 1
function H.commas(n)
	local str = tostring(math.floor(n))
	local out = str:reverse():gsub("(%d%d%d)", "%1,"):reverse()
	return (out:gsub("^,", ""))
end
local hallGood = nil
local function closeTradeHall()
	local g = player.PlayerGui:FindFirstChild("TradeHallGui")
	if g then
		g:Destroy()
	end
	tradeHallRefresh = nil
	-- [복귀 화면 단일화] 조언 바로가기 취소 후 책 메뉴와 도크 아이콘이 동시에 남지 않도록 한다.
	-- 교역·조선소에서 돌아올 때는 시설 책만 연다. 거래·저장 데이터는 그대로 둔다.
	menuToggle.Visible = false
	hud.Visible = false
	hudTopGui.Enabled = false
	main.Visible = true
end

-- 비주얼 래더가 켜 준 기능인지 (Shared.VisualLadderState.Features[분야][이름])
local ladderFeatures = nil
local function ladderHas(cat, name)
	if ladderFeatures == nil then
		ladderFeatures = {}
		local ok, data = pcall(function() return require(ReplicatedStorage.Shared:WaitForChild("VisualLadderState", 5)) end)
		if ok and typeof(data) == "table" and data.Features then ladderFeatures = data.Features end
	end
	local list = ladderFeatures[cat]
	return list ~= nil and table.find(list, name) ~= nil
end

local function openTradeHall()
	Sfx.facilityCue("trade")
	closeTradeHall()
	-- 상인이 교역소 입장 시 현지어로 짧게 인사한다. 별도 인사 자막은 넣지 않는다.
	if view and view.player then
		Sfx.merchantGreeting(PortData.Ports[view.player.portId])
	end
	local layer = overlayGui("TradeHallGui", 15)
	main.Visible = false
	-- [전용 화면] 교역·조선소 위로 이전 HUD 및 도크 아이콘이 남지 않게 숨긴다.
	hud.Visible = false
	hudTopGui.Enabled = false
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(34, 26, 20)
	root.BorderSizePixel = 0
	root.Parent = layer
	local lastScroll, detailScroll = 0, 0
	local detailOpen = false
	local query = ""

	local function build()
		if not layer.Parent or not view then
			return
		end
		for _, c in root:GetChildren() do
			if c:IsA("ScrollingFrame") and c.Visible then
				if c.Name == "TradeIndex" then lastScroll = c.CanvasPosition.Y end
				if c.Name == "TradeSpecimen" then detailScroll = c.CanvasPosition.Y end
			end
			c:Destroy()
		end
		local goods = view.goods or {}
		if not hallGood or not (function() for _, g in goods do if g.id == hallGood then return true end end return false end)() then
			hallGood = goods[1] and goods[1].id
		end
		local sel
		for _, g in goods do
			if g.id == hallGood then
				sel = g
			end
		end
		local p, ship = view.player, view.ship
		local width = root.AbsoluteSize.X
		if width <= 0 and workspace.CurrentCamera then width = workspace.CurrentCamera.ViewportSize.X end
		local narrow = width < 740
		local showMerchant = width >= 1040
		local inset = if showMerchant then 258 else 10
		-- [모바일 메뉴] 지갑·화물·알림을 각각 다른 높이에 배치한다.
		local headH = if narrow then 140 else 62
		local menuY = headH + 16

		-- 윗줄: 항구 이름, 코인, 화물칸, 나가기
		local top = mkBox(root, UDim2.fromOffset(8, 8), UDim2.new(1, -16, 0, headH), COLORS.paper)
		corner(top, 6)
		bookMaterial(top, "parchment", 220)
		local title = mkLabel(top, "교역 장부 · " .. p.portName, if narrow then 15 else 19, INK, true)
		title.Position = UDim2.fromOffset(12, 7)
		title.Size = if narrow then UDim2.new(1, -110, 0, 25) else UDim2.new(0.32, 0, 0, 25)
		title.AutomaticSize = Enum.AutomaticSize.None
		title.TextTruncate = Enum.TextTruncate.AtEnd
		-- 화면 가운데에 내 코인을 크게: 사고팔 때마다 바로 보인다
		local coinBox = mkBox(top, UDim2.new(0.5, 0, 0.5, 0), UDim2.fromOffset(if narrow then 150 else 210, 46), Color3.fromRGB(58, 42, 28))
		coinBox.AnchorPoint = Vector2.new(0.5, 0.5)
		if narrow then
			coinBox.Position = UDim2.new(0.5, 0, 0, 87)
			coinBox.Size = UDim2.fromOffset(178, 38)
		end
		corner(coinBox, 10)
		local coinText = mkLabel(coinBox, string.format("💰 %s", H.commas and H.commas(p.coins) or tostring(p.coins)), if narrow then 20 else 26, Color3.fromRGB(255, 226, 120), true)
		coinText.Size = UDim2.fromScale(1, 1)
		coinText.AutomaticSize = Enum.AutomaticSize.None
		coinText.TextXAlignment = Enum.TextXAlignment.Center
		local hold = mkLabel(top, string.format("화물 %d/%d", ship.cargoUsed, ship.cargoCapacity), 13, INK_SOFT, false)
		-- [교역소 동료 조언] 전용 매매 화면에서도 관련 조언이 사라지지 않게 표시한다.
		local tradeHint = "시세와 화물칸을 비교한 뒤 매입·판매하세요."
		for _, counsel in (view.counsel or {}) do
			if counsel.id == "menu_trade" then
				tradeHint = (counsel.who and counsel.who.name or "동료") .. ": 특산품 시세를 비교하세요."
				break
			end
		end
		local toastLbl = mkLabel(top, if message ~= "" then message else tradeHint, 13, Color3.fromRGB(60, 100, 50), true)
		toastLbl.Position = if narrow then UDim2.fromOffset(12, 114) else UDim2.new(0.5, 112, 0, 8)
		toastLbl.Size = if narrow then UDim2.new(1, -24, 0, 20) else UDim2.new(0.5, -210, 0, 44)
		toastLbl.AutomaticSize = Enum.AutomaticSize.None
		toastLbl.TextWrapped = true
		toastLbl.TextTruncate = Enum.TextTruncate.AtEnd
		hold.Position = UDim2.fromOffset(12, if narrow then 40 else 34)
		hold.Size = UDim2.new(if narrow then 0.3 else 0.32, 0, 0, 20)
		hold.AutomaticSize = Enum.AutomaticSize.None
		local backToList = narrow and detailOpen
		local leave = mkButton(top, if backToList then "목록" else "나가기", COLORS.leather, UDim2.fromOffset(78, 44), function()
			if backToList then
				detailOpen = false
				build()
			else
				closeTradeHall()
			end
		end, true)
		leave.AnchorPoint = Vector2.new(1, 0.5)
		leave.Position = if narrow then UDim2.new(1, -9, 0, 32) else UDim2.new(1, -9, 0.5, 0)

		-- 왼쪽: 상인 초상과 말풍선
		local left = mkBox(root, UDim2.fromOffset(8, 78), UDim2.new(0, 240, 1, -86), Color3.fromRGB(46, 34, 26))
		left.Visible = showMerchant
		local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
		local tpl = lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(storyPortraitModel("상인", p.portId or ""))
		local regionalId, regionalOffset, regionalSize = H.facilityPortraitAsset(p.portId, "merchant")
		local merchantImageId = regionalId or FACILITY_ATLAS or PORTRAIT_ATLAS
		if merchantImageId then
			local photo = Instance.new("ImageLabel")
			photo.Name = "MerchantPortrait"
			photo.Size = UDim2.new(1, 0, 1, -150)
			photo.Position = UDim2.fromOffset(0, 0)
			photo.BackgroundTransparency = 1
			photo.BorderSizePixel = 0
			photo.ScaleType = Enum.ScaleType.Crop
			photo.Image = "rbxassetid://" .. tostring(merchantImageId)
			photo.ImageRectOffset = regionalOffset or (if FACILITY_ATLAS then FACILITY_TILE.merchant elseif PORTRAIT_ATLAS then PORTRAIT_TILE.merchant else Vector2.zero)
			photo.ImageRectSize = regionalSize or (if FACILITY_ATLAS or PORTRAIT_ATLAS then PORTRAIT_SIZE else Vector2.zero)
			photo.Parent = left
			-- 가로로 넓은 칸에 세로 초상을 넣으면 가운데만 보여 얼굴 윗부분이 잘린다: 위쪽부터 칸 비율만큼만 쓴다
			local baseRect = photo.ImageRectSize
			if baseRect.X > 0 and baseRect.Y > 0 then
				local function fitTop()
					local a2 = photo.AbsoluteSize
					if a2.X > 0 and a2.Y > 0 then
						photo.ImageRectSize = Vector2.new(baseRect.X, math.min(baseRect.Y, baseRect.X * a2.Y / a2.X))
					end
				end
				fitTop()
				photo:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitTop)
			end
		else
			local vf = Instance.new("ViewportFrame")
			vf.BackgroundTransparency = 1
			vf.Size = UDim2.new(1, 0, 1, -150)
			vf.Position = UDim2.fromOffset(0, 0)
			vf.Ambient = Color3.fromRGB(170, 170, 178)
			vf.LightColor = Color3.fromRGB(255, 236, 205)
			vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
			vf.Parent = left
			local cam = Instance.new("Camera")
			cam.FieldOfView = 32
			cam.Parent = vf
			vf.CurrentCamera = cam
			local world = Instance.new("WorldModel")
			world.Parent = vf
			local m = portraitPerson(world, "merchant" .. (p.portId or ""), "Rogue", tpl)
			if not m then
				vf:Destroy()
			end
			local cf, size = CFrame.new(), Vector3.new(4, 6, 2)
			if m then
				cf, size = m:GetBoundingBox()
			end
			local focus = cf.Position + Vector3.new(0, size.Y * 0.1, 0)
			cam.FieldOfView = 40
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.25, 0.08, -1).Unit * (math.max(size.X, size.Y, size.Z) * 1.7), focus)
		end
		local bubble = mkBox(left, UDim2.new(0, 10, 1, -146), UDim2.new(1, -20, 0, 136), Color3.fromRGB(240, 228, 200))
		corner(bubble, 12)
		local say = (message ~= "" and message) or string.format("%s 시세는 날마다 달라진다오.", p.portName)
		local sl = mkLabel(bubble, say, 16, Color3.fromRGB(50, 36, 24), true)
		sl.Position = UDim2.fromOffset(10, 8)
		sl.Size = UDim2.new(1, -20, 1, -16)
		sl.AutomaticSize = Enum.AutomaticSize.None
		sl.TextWrapped = true
		sl.TextYAlignment = Enum.TextYAlignment.Top

		-- 가운데: 물품 목록
		local list = Instance.new("ScrollingFrame")
		list.Name = "TradeIndex"
		list.Position = UDim2.fromOffset(inset, menuY + 92)
		list.Size = UDim2.new(1, -inset - (if narrow then 8 else 336), 1, -menuY - 100)
		list.Visible = not narrow or not detailOpen
		list.BackgroundTransparency = 1
		list.BorderSizePixel = 0
		list.ScrollBarThickness = 6
		list.AutomaticCanvasSize = Enum.AutomaticSize.Y
		list.CanvasSize = UDim2.new()
		list.Parent = root
		local ll = Instance.new("UIListLayout")
		ll.Padding = UDim.new(0, 6)
		ll.SortOrder = Enum.SortOrder.LayoutOrder
		ll.Parent = list
		local search = Instance.new("TextBox")
		search.Name = "TradeSearch"
		search.Position = UDim2.fromOffset(inset, menuY)
		search.Size = UDim2.new(list.Size.X.Scale, list.Size.X.Offset - 8, 0, 42)
		search.BackgroundColor3 = COLORS.paper
		search.BorderSizePixel = 0
		search.TextColor3 = INK
		search.PlaceholderColor3 = INK_SOFT
		search.TextXAlignment = Enum.TextXAlignment.Left
		search.Font = Enum.Font.GothamMedium
		search.TextSize = 14
		search.ClearTextOnFocus = false
		search.PlaceholderText = "품목 검색 · ⬇️ 평균보다 저렴 · ⬆️ 비쌈"
		search.Text = query
		search.Visible = list.Visible
		search.Parent = root
		corner(search, 5)
		local searchPad = Instance.new("UIPadding")
		searchPad.PaddingLeft = UDim.new(0, 12)
		searchPad.PaddingRight = UDim.new(0, 12)
		searchPad.Parent = search
		H.hallFilter = H.hallFilter or "all"
		local free0 = ship.cargoCapacity - ship.cargoUsed
		-- [기존 시세 함수] 서버의 실제 1개 가격은 기존 흥정 이월 할인까지 포함한다.
		local function unitBuyOf(g)
			return if g.buyTotals and g.buyTotals[1] then g.buyTotals[1] else g.buy
		end
		do
			-- 걸러 보기 칩 + 보유 전부 팔기 (일괄)
			local chips = mkBox(root, UDim2.fromOffset(inset, menuY + 46), UDim2.new(1, -inset - (if narrow then 8 else 336), 0, 40), Color3.fromRGB(34, 26, 20))
			chips.BackgroundTransparency = 1
			chips.Visible = list.Visible
			local cl = Instance.new("UIListLayout")
			cl.FillDirection = Enum.FillDirection.Horizontal
			cl.Padding = UDim.new(0, 5)
			cl.Parent = chips
			local function chip(id, text)
				local c = mkButton(chips, text, if H.hallFilter == id then COLORS.gold else COLORS.paper, UDim2.new(0.17, -4, 1, 0), function()
					H.hallFilter = id
					build()
				end)
				c.TextSize = 14
			end
			chip("all", "전체")
			chip("specialty", "특산")
			chip("demand", "수요")
			chip("owned", "보유")
			local ownedCount, ownedValue = 0, 0
			for _, g in goods do
				if g.owned > 0 then
					ownedCount += 1
					ownedValue += g.sell * g.owned
				end
			end
			local sellAll = mkButton(chips, if narrow then "일괄 판매" else string.format("보유 전부 팔기 (+%d)", ownedValue), COLORS.green, UDim2.new(0.32, -4, 1, 0), function()
				task.spawn(function()
					for _, g in goods do
						local left = g.owned
						while left > 0 do
							local n = math.min(left, 20)
							call("Sell", { goodId = g.id, amount = n })
							left -= n
						end
					end
				end)
			end, ownedCount > 0)
			sellAll.TextSize = 12
		end
		local indexed = {}
		for i, g in (if list.Visible then goods else {}) do
			local show = H.hallFilter == "all" or (H.hallFilter == "specialty" and g.tag == "특산") or (H.hallFilter == "demand" and g.tag == "수요") or (H.hallFilter == "owned" and g.owned > 0)
			if not show then
				continue
			end
			local row = Instance.new("TextButton")
			row.Text = ""
			row.LayoutOrder = i
			row.Size = UDim2.new(1, -8, 0, 190)
			row.BackgroundColor3 = if g.id == hallGood then Color3.fromRGB(236, 210, 156) else COLORS.paper
			row.BorderSizePixel = 0
			row.AutoButtonColor = true
			corner(row, 10)
			row.Parent = list
			table.insert(indexed, { name = string.lower(g.name .. " " .. (g.category or "") .. " " .. (g.purpose or "")), row = row })
			local rule = Instance.new("UIStroke")
			rule.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			rule.Color = INK_EDGE
			rule.Thickness = if g.id == hallGood then 2 else 1
			rule.Parent = row
			row.Activated:Connect(function()
				hallGood = g.id
				detailOpen = true
				detailScroll = 0
				local oldDetail = root:FindFirstChild("TradeSpecimen")
				if oldDetail then oldDetail.CanvasPosition = Vector2.zero end
				Sfx.play("sfx_click")
				build()
			end)
			local gi = GOOD_ICON[g.id]
			if gi and gi[4] == "Goods/" .. g.id then gi = { "Goods", g.id } end
			local icon = if gi then modelIcon(row, gi[1], gi[2], gi[3], 78, g.name, gi[4]) else modelIcon(row, nil, nil, nil, 78, g.name)
			icon.Position = UDim2.fromOffset(8, 8)
			local indicator, pct = H.marketPriceSignal(g)
			local nm = mkLabel(row, indicator .. " " .. g.name .. (if g.upgraded then " (신상)" else "") .. (if g.cheaper then " (할인)" else "") .. (if g.scarcity and ladderHas("goods", "scarcity") then " 〔" .. g.scarcity .. "〕" else ""), 17, INK, true)
			nm.Position = UDim2.fromOffset(94, 8)
			nm.Size = UDim2.new(1, if g.tag ~= "" then -150 else -104, 0, 26)
			nm.TextTruncate = Enum.TextTruncate.AtEnd
			nm.AutomaticSize = Enum.AutomaticSize.None
			local profit = H.tradeProfit(g, 1)
			local profitText = if profit == nil then "세후손익 미확인"
				elseif profit >= 0 then "세후 이익 +" .. H.commas(profit) else "세후 손실 -" .. H.commas(-profit)
			local budgetQty = 0
			for n = 1, math.min(20, view.orderCap or 20, free0, g.supply or 20) do
				local cost = if g.buyTotals and g.buyTotals[n] then g.buyTotals[n] else unitBuyOf(g) * n
				if cost <= p.coins then budgetQty = n end
			end
			-- [교역품 읽기 순서] 가격 → 세계 평균 화살표 → 세후 손익 → 현재 보유·구매 가능.
			local priceText = string.format("매입 %s · 판매 %s\n%s 세계평균 %s (%+.1f%%)\n보유 %d · 구매 가능 %d\n%s",
				H.commas(unitBuyOf(g)), H.commas(g.sell), indicator, H.commas(g.avgPrice or g.basePrice or 0), pct,
				g.owned, budgetQty, profitText)
			local pr = mkLabel(row, priceText, 14, INK, false)
			pr.TextWrapped = true
			pr.Position = UDim2.fromOffset(94, 34)
			pr.Size = UDim2.new(1, -102, 0, 76)
			pr.AutomaticSize = Enum.AutomaticSize.None
			local use = mkLabel(row, (g.category or "교역품") .. " · " .. (g.purpose or "항구 간 판매"), 12, INK_SOFT, false)
			use.Position = UDim2.fromOffset(94, 116)
			use.Size = UDim2.new(1, -102, 0, 20)
			use.AutomaticSize = Enum.AutomaticSize.None
			use.TextTruncate = Enum.TextTruncate.AtEnd
			-- [세계 평균 그래프] 가운데 세로선이 실시간 세계 항구 평균, 채움은 현재 매입시세.
			local average = g.avgPrice or g.basePrice or 0
			if average > 0 then
				local pm = unitBuyOf(g) / average
				local gauge = Instance.new("Frame")
				gauge.BackgroundColor3 = Color3.fromRGB(200, 184, 150)
				gauge.BorderSizePixel = 0
				gauge.Position = UDim2.new(0, 94, 0, 142)
				gauge.Size = UDim2.new(1, -102, 0, 5)
				corner(gauge, 3)
				gauge.Parent = row
				local ratio = math.clamp((pm - 0.5) / 1.0, 0, 1) -- 세계평균(1.0배)은 50% 위치
				local fill = Instance.new("Frame")
				fill.BorderSizePixel = 0
				fill.Size = UDim2.fromScale(ratio, 1)
				fill.BackgroundColor3 = if pct < -0.5 then COLORS.green elseif pct > 0.5 then COLORS.gold else Color3.fromRGB(150, 140, 120)
				corner(fill, 3)
				fill.Parent = gauge
				local tick = Instance.new("Frame")
				tick.BorderSizePixel = 0
				tick.BackgroundColor3 = INK
				tick.Position = UDim2.fromScale(0.5, -0.4)
				tick.Size = UDim2.new(0, 2, 1.8, 0)
				tick.Parent = gauge
			end
			-- 바로 사고팔기: 수량 고르는 화면 없이 한 번에
			local oc = view.orderCap or 20
			local canBuy = budgetQty
			local canSell = math.min(g.owned, oc, g.absorb or oc)
			local bar = Instance.new("Frame")
			bar.BackgroundTransparency = 1
			bar.Position = UDim2.fromOffset(94, 152)
			bar.Size = UDim2.new(1, -100, 0, 34)
			bar.Parent = row
			local bl = Instance.new("UIListLayout")
			bl.FillDirection = Enum.FillDirection.Horizontal
			bl.Padding = UDim.new(0, 4)
			bl.Parent = bar
			local function quick(text, color, enabled, fn, w)
				local b = mkButton(bar, text, color, UDim2.new(w or 0.25, -3, 1, 0), fn, enabled)
				b.TextSize = 12
			end
			quick("구매 1", COLORS.gold, canBuy >= 1, function() call("Buy", { goodId = g.id, amount = 1 }) end)
			quick("구매 5", COLORS.gold, canBuy >= 5, function() call("Buy", { goodId = g.id, amount = 5 }) end)
			quick(string.format("일괄 구매 %d", canBuy), COLORS.gold, canBuy >= 1, function() call("Buy", { goodId = g.id, amount = canBuy }) end)
			quick(string.format("판매 %d", canSell), COLORS.green, canSell >= 1, function() call("Sell", { goodId = g.id, amount = canSell }) end)
			if g.tag ~= "" then
				local badge = Instance.new("TextLabel")
				badge.Text = g.tag
				badge.TextSize = 16
				badge.Font = Enum.Font.GothamBold
				badge.TextColor3 = Color3.new(1, 1, 1)
				badge.BackgroundColor3 = if g.tag == "특산" then COLORS.green else COLORS.gold
				badge.Size = UDim2.fromOffset(56, 26)
				badge.AnchorPoint = Vector2.new(1, 0)
				badge.Position = UDim2.new(1, -10, 0, 8)
				corner(badge, 6)
				badge.Parent = row
			end
		end
		local empty = mkLabel(list, "검색 결과가 없어.", 14, COLORS.text, false, #goods + 1)
		local function filter()
			query = search.Text
			local needle = string.lower(query:match("^%s*(.-)%s*$") or "")
			local found = false
			for _, item in indexed do
				item.row.Visible = string.find(item.name, needle, 1, true) ~= nil
				found = found or item.row.Visible
			end
			empty.Visible = not found
		end
		search:GetPropertyChangedSignal("Text"):Connect(function()
			filter()
			list.CanvasPosition = Vector2.zero
		end)
		filter()
		list.CanvasPosition = Vector2.new(0, lastScroll)

		-- 오른쪽: 선택한 물품의 거래 상자
		local detail = Instance.new("ScrollingFrame")
		detail.Name = "TradeSpecimen"
		detail.Position = if narrow then UDim2.fromOffset(8, menuY) else UDim2.new(1, -326, 0, menuY)
		detail.Size = if narrow then UDim2.new(1, -16, 1, -menuY - 8) else UDim2.new(0, 318, 1, -menuY - 8)
		if sel then detail.Size = detail.Size - UDim2.fromOffset(0, 162) end
		detail.BackgroundColor3 = COLORS.paper
		detail.BorderSizePixel = 0
		detail.ScrollBarThickness = 4
		detail.CanvasSize = UDim2.fromOffset(0, 760)
		detail.ScrollingDirection = Enum.ScrollingDirection.Y
		detail.Visible = not narrow or detailOpen
		detail.Parent = root
		corner(detail, 7)
		local right = mkBox(detail, UDim2.fromOffset(0, 0), UDim2.new(1, -6, 0, 760), COLORS.paper)
		bookMaterial(right, "parchment", 220)
		if sel and detail.Visible then
			local gi = GOOD_ICON[sel.id]
			local big = if gi then modelIcon(right, gi[1], gi[2], gi[3], 96, sel.name, gi[4]) else modelIcon(right, nil, nil, nil, 96, sel.name)
			big.Position = UDim2.fromOffset(12, 12)
			local detailIcon, diff = H.marketPriceSignal(sel)
			local hn = mkLabel(right, detailIcon .. " " .. sel.name, 24, INK, true)
			hn.Position = UDim2.fromOffset(120, 16)
			hn.Size = UDim2.new(1, -130, 0, 30)
			hn.AutomaticSize = Enum.AutomaticSize.None
			local note = (sel.category or "교역품") .. "\n" .. (sel.purpose or "다른 항구에 운송해 판매")
			local hnote = mkLabel(right, note, 14, INK_SOFT, false)
			hnote.Position = UDim2.fromOffset(120, 48)
			hnote.Size = UDim2.new(1, -130, 0, 68)
			hnote.AutomaticSize = Enum.AutomaticSize.None
			local qty = math.clamp(hallQty, 1, 20)
			local free = ship.cargoCapacity - ship.cargoUsed
			local deal = view.haggle and view.haggle.deal
			local dealPct = (deal and deal.goodId == sel.id) and deal.pct or 0
			local unitBuy = unitBuyOf(sel)
			-- [실제 수량 한도] 상품을 살수록 단가가 오르므로 단가×수량 추정으로 구매를 허용하지 않는다.
			local maxBuy = 0
			for n = 1, math.min(20, view.orderCap or 20, free, sel.supply or 20) do
				local cost = if sel.buyTotals and sel.buyTotals[n] then sel.buyTotals[n] else unitBuy * n
				if cost <= p.coins then maxBuy = n end
			end
			local maxSell = math.min(20, view.orderCap or 20, sel.owned, sel.absorb or 20)
			local basis = if (sel.basis or 0) > 0 then H.commas(math.floor(sel.basis + 0.5)) else "미구매"
			local profit = H.tradeProfit(sel, 1)
			local profitText = if profit == nil then "미보유"
				elseif profit >= 0 then "+" .. H.commas(profit) else "-" .. H.commas(-profit)
			local info = mkLabel(right, string.format("매입 %s%s · 판매 %s\n%s 세계 평균시세 %s · %+.1f%%\n내 평균 매입가 %s · 보유 %d개\n판매 1개 예상손익 %s (관세 후)\n내 돈 %s · 살 수 있는 수량 %d\n빈 화물 %d · 항구 구매한도 %s / 판매한도 %s",
				H.commas(unitBuy), if dealPct > 0 then " (할인중)" else "", H.commas(sel.sell),
				detailIcon, H.commas(sel.avgPrice or sel.basePrice or 0), diff, basis, sel.owned, profitText, H.commas(p.coins),
				maxBuy, free, if sel.supply then tostring(sel.supply) else "-", if sel.absorb then tostring(sel.absorb) else "-"), 15, INK, true)
			info.Position = UDim2.fromOffset(14, 124)
			info.Size = UDim2.new(1, -28, 0, 184)
			info.AutomaticSize = Enum.AutomaticSize.None
			-- 상세 페이지를 스크롤해도 수량과 거래 버튼은 화면 아래에 남긴다.
			local desk = mkBox(root, UDim2.new(detail.Position.X.Scale, detail.Position.X.Offset, 1, -156),
				UDim2.new(detail.Size.X.Scale, detail.Size.X.Offset, 0, 148), COLORS.leather)
			corner(desk, 7)
			bookMaterial(desk, "leather", 144)
			local receipt = mkLabel(desk, "", 12, COLORS.text, false)
			receipt.Position = UDim2.fromOffset(8, 5)
			receipt.Size = UDim2.new(1, -16, 0, 38)
			receipt.AutomaticSize = Enum.AutomaticSize.None
			receipt.TextXAlignment = Enum.TextXAlignment.Center
			local function refreshReceipt()
				local pay = if sel.buyTotals and sel.buyTotals[qty] then sel.buyTotals[qty] else unitBuy * qty
				local sellQty = math.min(qty, maxSell)
				local get = if sellQty < 1 then 0 elseif sel.sellTotals and sel.sellTotals[sellQty] then sel.sellTotals[sellQty] else sel.sell * sellQty
				local profit = H.tradeProfit(sel, sellQty)
				receipt.Text = string.format("매입 %d개 %s · 잔액 %s\n매각 %d개 %s · 손익 %s",
					qty, H.commas(pay), H.commas(p.coins - pay),
					sellQty, H.commas(get), if profit == nil then "미보유" else string.format("%+d", profit))
				receipt.TextColor3 = if qty > maxBuy then COLORS.red else COLORS.text
			end
			local function setQuantity(value)
				qty = math.clamp(value, 1, 20)
				hallQty = qty
				-- [버튼 상태] 수량 변경 즉시 실제 구매·판매 가능 여부까지 함께 다시 그린다.
				build()
			end
			local function quantityButton(index, label, action, enabled)
				local b = mkButton(desk, label, COLORS.paper, UDim2.new(0.25, -8, 0, 44), action, enabled)
				b.Position = UDim2.new((index - 1) / 4, 4, 0, 46)
			end
			quantityButton(1, "−", function() setQuantity(qty - 1) end)
			quantityButton(2, "+", function() setQuantity(qty + 1) end)
			quantityButton(3, "10개", function() setQuantity(10) end)
			quantityButton(4, "최대 구매", function() setQuantity(maxBuy) end, maxBuy > 0)
			refreshReceipt()
			local buy = mkButton(desk, if maxBuy >= qty then "구매" else "구매 불가", COLORS.gold, UDim2.new(0.5, -8, 0, 44), function() call("Buy", { goodId = sel.id, amount = qty }) end, maxBuy >= qty)
			buy.Position = UDim2.fromOffset(4, 98)
			local sell = mkButton(desk, if maxSell >= qty then "판매" else "판매 가능 " .. tostring(maxSell), COLORS.green, UDim2.new(0.5, -8, 0, 44), function() call("Sell", { goodId = sel.id, amount = math.min(qty, maxSell) }) end, maxSell > 0)
			sell.Position = UDim2.new(0.5, 4, 0, 98)
			-- [자동 흥정] 수동 버튼 없이 상인 전문/승선 동료가 구매 순간 협상한다.
			local bargain = view.haggle or {}
			local tried = bargain.tried and bargain.tried[sel.id]
			local status = if not bargain.auto then "자동 흥정: 관련 능력 없음 · 정가 거래"
				elseif tried then "자동 흥정: 이번 항구·품목 협상 시도 완료"
				else "자동 흥정 준비 · " .. tostring(bargain.source or "상인 능력") .. "\n첫 구매 때 4~8% 할인 자동 시도"
			local alert = mkLabel(right, status, 14, if bargain.auto then Color3.fromRGB(38, 111, 60) else INK_SOFT, true)
			alert.Position = UDim2.fromOffset(14, 326)
			alert.Size = UDim2.new(1, -28, 0, 58)
			alert.AutomaticSize = Enum.AutomaticSize.None
			local sm = mkButton(right, "암시장 판매 · 압수 위험", COLORS.red, UDim2.new(1, -24, 0, 44), function() call("Smuggle", { goodId = sel.id, amount = math.min(qty, maxSell) }) end, maxSell > 0)
			sm.Position = UDim2.fromOffset(12, 394)
			local allB = mkButton(right, "보유분 최대 20개 판매", COLORS.grey, UDim2.new(1, -24, 0, 44), function() call("Sell", { goodId = sel.id, amount = maxSell }) end, maxSell > 0)
			allB.Position = UDim2.fromOffset(12, 446)
			allB.TextSize = 15
			do
				local top = view.compare and view.compare[sel.id]
				local lines = {}
				if top then
					for _, t in top do
						table.insert(lines, if t.memory then string.format("%s  %d (%d일 전 거래 기억)", t.name, t.sell, t.ago) elseif t.sell then string.format("%s  %d", t.name, t.sell) else t.name)
					end
				end
				local cmpText = if (view.intel or 0) <= 0 and #lines == 0 then "다른 항구 시세: 장사 감각이 있는 동료를 태우거나, 이 물건을 다른 항구에서 직접 거래해 보세요 (거래한 값은 수첩에 적혀요)"
					elseif (view.intel or 0) <= 0 then "내 시세 수첩 (직접 거래한 항구, 값은 그때 기준)\n" .. table.concat(lines, "\n")
					elseif #lines == 0 then "다른 항구 시세 정보 없음"
					else (if view.intel >= 2 then "비싸게 팔리는 항구 (팔기 시세)\n" else "비싸게 팔릴 듯한 항구\n") .. table.concat(lines, "\n")
				local cl = mkLabel(right, cmpText, 15, INK, false)
				cl.Position = UDim2.fromOffset(14, 510)
				cl.Size = UDim2.new(1, -28, 0, 128)
				cl.AutomaticSize = Enum.AutomaticSize.None
			end
			local hint = mkLabel(right, string.format("장사 정보 %s · 거래 도중 시세 변동 · 판매 때 관세 차감", intelName(view.intel or 0)), 13, INK_SOFT, false)
			hint.Position = UDim2.fromOffset(14, 658)
			hint.Size = UDim2.new(1, -28, 0, 58)
			hint.AutomaticSize = Enum.AutomaticSize.None
		end
		detail.CanvasPosition = Vector2.new(0, detailScroll)
	end
	local lastWidth
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		local width = root.AbsoluteSize.X
		if width > 0 and width ~= lastWidth then lastWidth = width; build() end
	end)
	tradeHallRefresh = build
	build()
end
H.tradeHall = openTradeHall

function RENDERERS.trade()
	H.counselRows(1)
	add(function() return mkLabel(content, "⬇️ 세계 평균보다 저렴 · ⬆️ 평균보다 비쌈 · ➖ 비슷함\n예상 판매손익은 내 매입원가와 관세를 반영해 표시해.", 14, COLORS.gold, true) end)
	if view.rep then
		local r = view.rep
		H.statStrip({
			{ r.name .. " 우호", string.format("%d/100", r.value), tone = if r.value >= 50 then "good" else "key" },
			{ "되파는 비율", string.format("+%.1f%%", r.bonus * 100), tone = "good" },
			{ "관세", string.format("%.1f%%", r.tariff * 100), tone = if r.tariff > 0.1 then "bad" else "key" },
			{ "동료 감각", intelName(view.intel or 0), tone = "key" },
		})
	end
	add(function()
		return H.tileGrid({
			{ icon = "trade", title = "교역 장부", sub = "용도 · 시세 · 예산 · 자동 흥정", btn = "열기", color = COLORS.gold, onClick = function() openTradeHall() end },
			{ icon = "cc0_chest", title = "특산품", sub = "싸게 사서 비싼 곳에 팔기", enabled = false },
			{ icon = "cc0_goldcoins", title = "암시장", sub = "관세 없음 +10% · 압수 위험", enabled = false },
		}, content)
	end)
	H.addStoryPanel()
	if view.news and #view.news > 0 then
		add(function() return mkHeader(content, "시장 소식") end)
		add(function() return mkLabel(content, table.concat(view.news, "\n"), 16, COLORS.gold, true) end)
	end
	addRumorPanel()
	add(function()
		local frame = Instance.new("Frame")
		frame.BackgroundTransparency = 1
		frame.Size = UDim2.new(1, -6, 0, 40)
		local lbl = mkLabel(frame, string.format("수량 선택 (되파는 비율 %d%%)", math.floor(view.sellRate * 100 + 0.5)), 12, COLORS.muted, false)
		lbl.Size = UDim2.new(0.5, 0, 1, 0)
		lbl.AutomaticSize = Enum.AutomaticSize.None
		lbl.TextYAlignment = Enum.TextYAlignment.Center
		for i, a in AMOUNTS do
			local b = mkButton(frame, tostring(a), if i == amountIndex then COLORS.gold else COLORS.grey, UDim2.fromOffset(52, 34), function()
				amountIndex = i
				render()
			end, true)
			b.AnchorPoint = Vector2.new(1, 0.5)
			b.Position = UDim2.new(1, -6 - (#AMOUNTS - i) * 58, 0.5, 0)
		end
		frame.Parent = content
		return frame
	end)
	-- [교역 정렬] 실제 세계 평균시세·서버 판매견적·보유 수량으로 화면 순서만 바꾼다.
	H.tradeSort = H.tradeSort or "price"
	add(function()
		local buttons = {}
		for _, option in { { "싼 순", "price" }, { "판매이익", "profit" }, { "보유순", "owned" }, { "이름순", "name" } } do
			local key = option[2]
			table.insert(buttons, { text = option[1], color = if H.tradeSort == key then COLORS.gold else COLORS.blue,
				onClick = function() H.tradeSort = key; render() end })
		end
		return mkRow(content, "교역품 정렬", "평균 대비 매입 할인과 내 보유분 세후손익은 다른 기준이야.", buttons, 72)
	end)
	local sortedGoods = table.clone(view.goods)
	table.sort(sortedGoods, function(a, b)
		local function score(g)
			if H.tradeSort == "profit" then return H.tradeProfit(g, 1) or -math.huge end
			if H.tradeSort == "owned" then return tonumber(g.owned) or 0 end
			if H.tradeSort == "name" then return 0 end
			local _, pct = H.marketPriceSignal(g)
			return pct
		end
		local left, right = score(a), score(b)
		if left ~= right then return if H.tradeSort == "price" then left < right else left > right end
		return a.name < b.name
	end)
	-- 우편·거래소 (아래쪽에서 이어서 그린다)
	-- 상품 카드 격자: 한눈에 보고 바로 사고판다 (대항해시대 온라인 교역소처럼)
	add(function()
		local grid = Instance.new("Frame")
		grid.BackgroundTransparency = 1
		grid.Size = UDim2.new(1, -6, 0, 0)
		grid.AutomaticSize = Enum.AutomaticSize.Y
		local gl = Instance.new("UIGridLayout")
		gl.CellSize = UDim2.new(1, -6, 0, 228)
		gl.CellPadding = UDim2.fromOffset(6, 6)
		gl.SortOrder = Enum.SortOrder.LayoutOrder
		gl.Parent = grid
		for i, g in sortedGoods do
			local priceIcon, deviation = H.marketPriceSignal(g)
			local cardF = Instance.new("Frame")
			cardF.LayoutOrder = i
			cardF.BackgroundColor3 = COLORS.row
			cardF.BorderSizePixel = 0
			corner(cardF, 10)
			cardF.Parent = grid
			local st = Instance.new("UIStroke")
			st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			st.Color = if priceIcon == "⬇️" then COLORS.green elseif priceIcon == "⬆️" then COLORS.gold else Color3.fromRGB(70, 84, 104)
			st.Thickness = 1.5
			st.Parent = cardF
			local gi = GOOD_ICON[g.id]
			local icon = if gi then modelIcon(cardF, gi[1], gi[2], gi[3], 60, g.name, gi[4])
				else modelIcon(cardF, nil, nil, nil, 60, g.name)
			icon.Position = UDim2.fromOffset(8, 8)
			local nm = mkLabel(cardF, priceIcon .. " " .. g.name .. (if g.upgraded then " (신상)" else "") .. (if g.cheaper then " (할인)" else ""), 18, COLORS.text, true)
			nm.Position = UDim2.fromOffset(76, 6)
			nm.Size = UDim2.new(1, -150, 0, 24)
			nm.AutomaticSize = Enum.AutomaticSize.None
			if g.tag ~= "" then
				local badge = Instance.new("TextLabel")
				badge.Text = g.tag
				badge.TextSize = 15
				badge.Font = Enum.Font.GothamBold
				badge.TextColor3 = Color3.new(1, 1, 1)
				badge.BackgroundColor3 = if g.tag == "특산" then COLORS.green else COLORS.gold
				badge.Size = UDim2.fromOffset(52, 24)
				badge.AnchorPoint = Vector2.new(1, 0)
				badge.Position = UDim2.new(1, -8, 0, 6)
				corner(badge, 6)
				badge.Parent = cardF
			end
			local profit = H.tradeProfit(g, 1)
			local profitLabel = if profit == nil then "세후손익 미확인"
				elseif profit >= 0 then "세후이익 +" .. H.commas(profit) else "세후손실 -" .. H.commas(-profit)
			local info = mkLabel(cardF, string.format("매입 %s · 판매 %s\n%s 평균 %s (%+.1f%%)\n보유 %d · %s",
				H.commas(g.buyTotals and g.buyTotals[1] or g.buy), H.commas(g.sell),
				priceIcon, H.commas(g.avgPrice or g.basePrice or 0), deviation, g.owned, profitLabel), 14, COLORS.text, false)
			info.TextWrapped = true
			info.Position = UDim2.fromOffset(76, 34)
			info.Size = UDim2.new(1, -84, 0, 70)
			info.AutomaticSize = Enum.AutomaticSize.None
			-- [교역 카드 가격 비교] 중앙 표식은 모든 항구의 현재 평균 매입가, 채움은 이 항구 매입가다.
			local average = tonumber(g.avgPrice) or tonumber(g.basePrice) or 0
			if average > 0 then
				local price = tonumber(g.buyTotals and g.buyTotals[1]) or tonumber(g.buy) or 0
				local track = Instance.new("Frame")
				track.Name = "WorldAverageBar"
				track.Position = UDim2.fromOffset(76, 114)
				track.Size = UDim2.new(1, -84, 0, 9)
				track.BorderSizePixel = 0
				track.BackgroundColor3 = Color3.fromRGB(118, 99, 76)
				track.Parent = cardF
				corner(track, 4)
				local fill = Instance.new("Frame")
				fill.Name = "PortPriceFill"
				fill.Size = UDim2.fromScale(math.clamp(price / average - 0.5, 0, 1), 1)
				fill.BackgroundColor3 = if deviation < -0.5 then COLORS.green elseif deviation > 0.5 then COLORS.gold else COLORS.grey
				fill.BorderSizePixel = 0
				fill.Parent = track
				corner(fill, 4)
				local mid = Instance.new("Frame")
				mid.Name = "WorldAverageMark"
				mid.Position = UDim2.new(0.5, -1, -0.25, 0)
				mid.Size = UDim2.new(0, 2, 1.5, 0)
				mid.BackgroundColor3 = INK
				mid.BorderSizePixel = 0
				mid.Parent = track
				local legend = mkLabel(cardF, if deviation < -0.5 then "● 저렴 · 중앙선=세계평균" elseif deviation > 0.5 then "● 비쌈 · 중앙선=세계평균" else "● 평균 근처 · 중앙선=세계평균", 11, INK_SOFT, false)
				legend.Position = UDim2.fromOffset(76, 126)
				legend.Size = UDim2.new(1, -84, 0, 18)
				legend.AutomaticSize = Enum.AutomaticSize.None
				legend.TextTruncate = Enum.TextTruncate.AtEnd
			end
			-- [실거래 조건] 선택 수량·현재 재고·선창·자금·판매한도 안내.
			local qty = amount()
			local freeCargo = math.max(0, view.ship.cargoCapacity - view.ship.cargoUsed)
			local buyCost = if g.buyTotals and g.buyTotals[qty] then g.buyTotals[qty] else (g.buy or 0) * qty
			local canBuy = qty <= math.min(freeCargo, view.orderCap or qty, g.supply or qty) and buyCost <= view.player.coins
			local canSell = qty <= math.min(g.owned or 0, view.orderCap or qty, g.absorb or qty)
			local buyReason = if canBuy then "매입 가능" elseif freeCargo < qty then "화물칸 부족"
				elseif (g.supply or qty) < qty then "항구 재고 부족"
				elseif (view.orderCap or qty) < qty then "거래한도 초과" else "코인 부족"
			local sellReason = if canSell then "판매 가능" elseif (g.owned or 0) < qty then "보유 수량 부족" else "판매한도 초과"
			local observed = view.compare and view.compare[g.id]
			local bestName, bestPrice, fromMemory = nil, -math.huge, false
			for _, dest in observed or {} do
				if dest.sell and dest.sell > bestPrice then
					bestName, bestPrice, fromMemory = dest.name, dest.sell, dest.memory == true
				end
			end
			local destination = mkLabel(cardF, if bestName then string.format("관측 최고 매각: %s %s%s", bestName, H.commas(bestPrice), if fromMemory then " (거래 기억)" else "")
				else "다른 항구 시세: 장부에서 확인", 12, COLORS.muted, false)
			destination.Position = UDim2.fromOffset(76, 147)
			destination.Size = UDim2.new(1, -84, 0, 19)
			destination.AutomaticSize = Enum.AutomaticSize.None
			destination.TextTruncate = Enum.TextTruncate.AtEnd
			local condition = mkLabel(cardF, "매입: " .. buyReason .. " · 매각: " .. sellReason, 12, if canBuy or canSell then COLORS.text else COLORS.red, true)
			condition.Position = UDim2.fromOffset(10, 171)
			condition.Size = UDim2.new(1, -20, 0, 19)
			condition.AutomaticSize = Enum.AutomaticSize.None
			condition.TextTruncate = Enum.TextTruncate.AtEnd
			local buy = mkButton(cardF, "구매 " .. tostring(qty), COLORS.blue, UDim2.new(0.5, -10, 0, 36), function() call("Buy", { goodId = g.id, amount = amount() }) end, canBuy)
			buy.Position = UDim2.new(0, 6, 1, -42)
			local sell = mkButton(cardF, "판매 " .. tostring(qty), COLORS.green, UDim2.new(0.5, -10, 0, 36), function() call("Sell", { goodId = g.id, amount = amount() }) end, canSell)
			sell.Position = UDim2.new(0.5, 4, 1, -42)
			if g.owned > 0 then
				local sm = mkButton(cardF, "암", COLORS.red, UDim2.fromOffset(34, 24), function() call("Smuggle", { goodId = g.id, amount = amount() }) end, true)
				sm.AnchorPoint = Vector2.new(1, 0)
				sm.Position = UDim2.new(1, -8, 0, 34)
			end
		end
		-- [모바일 교역 카드] 좁은 화면은 1열, 중간은 2열, 넓은 화면은 3열로 글자가 잘리지 않게 한다.
		local function fitGrid()
			local width = grid.AbsoluteSize.X
			if width <= 0 then return end
			local columns = if width < 460 then 1 elseif width < 910 then 2 else 3
			gl.CellSize = UDim2.new(1 / columns, -6 * (columns - 1) / columns, 0, 228)
		end
		grid:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitGrid)
		task.defer(fitGrid)
		return grid
	end)

	-- 거래소 게시판: 다른 항해자와 고정가로 사고판다 (수수료 5%)
	local function mkInput(parent, placeholder, text, width, onChanged)
		local box = Instance.new("TextBox")
		box.Size = UDim2.new(0, width, 0, 34)
		box.BackgroundColor3 = COLORS.coverRaised
		box.TextColor3 = COLORS.text
		box.PlaceholderText = placeholder
		box.PlaceholderColor3 = COLORS.muted
		box.Text = text
		box.TextSize = 15
		box.Font = Enum.Font.Gotham
		box.ClearTextOnFocus = false
		corner(box, 6)
		box.FocusLost:Connect(function()
			onChanged(box.Text)
		end)
		box.Parent = parent
		return box
	end
	add(function() return mkHeader(content, "거래소 게시판 (다른 항해자와 거래)") end)
	add(function()
		return mkRow(content, "게시판 보기", "다른 항해자가 올린 물건을 불러와요", {
			{ text = "새로고침", color = COLORS.blue, onClick = function() call("MarketList", {}) end },
		}, 52)
	end)
	for _, l in marketList or {} do
		add(function()
			local mine = l.sellerId == player.UserId
			local btn = if mine
				then { text = "취소", color = COLORS.red, onClick = function() call("MarketCancel", { id = l.id }) end }
				else { text = "구매", color = COLORS.green, onClick = function() call("MarketBuy", { id = l.id }) end }
			local name = (PortData.Goods[l.goodId] and PortData.Goods[l.goodId].name) or l.goodId
			return mkRow(content, string.format("%s %d개 · %d코인", name, l.amount, l.price), string.format("판매자 %s", l.sellerName), { btn }, 52)
		end)
	end
	for _, g in view.goods do
		if g.owned > 0 then
			add(function()
				local frame = Instance.new("Frame")
				frame.Size = UDim2.new(1, -6, 0, 44)
				frame.BackgroundColor3 = COLORS.row
				frame.BorderSizePixel = 0
				corner(frame, 8)
				local lbl = mkLabel(frame, string.format("%s (보유 %d)", g.name, g.owned), 14, COLORS.text, true)
				lbl.Position = UDim2.fromOffset(8, 12)
				lbl.Size = UDim2.new(0.4, 0, 0, 20)
				lbl.AutomaticSize = Enum.AutomaticSize.None
				local qty = math.min(amount(), g.owned)
				local input = mkInput(frame, "총 가격", tostring(postPrice[g.id] or (g.sell * qty)), 90, function(t) postPrice[g.id] = tonumber(t) end)
				input.AnchorPoint = Vector2.new(1, 0.5)
				input.Position = UDim2.new(1, -86, 0.5, 0)
				local post = mkButton(frame, "등록", COLORS.gold, UDim2.fromOffset(70, 34), function()
					call("MarketPost", { goodId = g.id, amount = qty, price = tonumber(input.Text) or 0 })
				end, true)
				post.AnchorPoint = Vector2.new(1, 0.5)
				post.Position = UDim2.new(1, -8, 0.5, 0)
				frame.Parent = content
				return frame
			end)
		end
	end

	-- 우편
	add(function() return mkHeader(content, "우편 (코인·쪽지 보내기)") end)
	add(function()
		local count = if mailBox then #mailBox else nil
		return mkRow(content, "내 우편함", if count then string.format("받을 우편 %d통", count) else "열어서 확인해요", {
			{ text = "열기", color = COLORS.blue, onClick = function() call("MailInbox", {}) end },
			{ text = "받기", color = COLORS.green, onClick = function() call("MailClaim", {}) end },
		}, 56)
	end)
	add(function()
		local frame = Instance.new("Frame")
		frame.Size = UDim2.new(1, -6, 0, 86)
		frame.BackgroundColor3 = COLORS.row
		frame.BorderSizePixel = 0
		corner(frame, 8)
		local a = mkInput(frame, "받는 사람 이름", mailDraft.to, 150, function(t) mailDraft.to = t end)
		a.Position = UDim2.fromOffset(8, 6)
		local b = mkInput(frame, "코인", mailDraft.coins, 80, function(t) mailDraft.coins = t end)
		b.Position = UDim2.fromOffset(166, 6)
		local c = mkInput(frame, "한마디 (60자)", mailDraft.text, 240, function(t) mailDraft.text = t end)
		c.Position = UDim2.fromOffset(8, 46)
		local send = mkButton(frame, "보내기", COLORS.gold, UDim2.fromOffset(80, 34), function()
			call("MailSend", { to = a.Text, coins = tonumber(b.Text) or 0, text = c.Text })
		end, true)
		send.Position = UDim2.fromOffset(256, 46)
		frame.Parent = content
		return frame
	end)
end

function RENDERERS.route()
	local ship = view.ship
	local possible = 0
	for _, r in (view.routes or {}) do
		if not r.locked and r.supplies <= ship.supplies and (r.coal or 0) <= (ship.coal or 0) then possible += 1 end
	end
	H.statStrip({
		{ "보급품", tostring(ship.supplies), tone = if ship.supplies <= 5 then "bad" else "key" },
		{ "석탄", tostring(ship.coal or 0), tone = "key" },
		{ "준비된 항로", tostring(possible) .. "/" .. tostring(#(view.routes or {})), tone = "good" },
	})
	if view.weather then
		add(function()
			local fc = ""
			if view.forecast and #view.forecast > 0 then
				local parts = {}
				for _, f in view.forecast do
					table.insert(parts, string.format("%d일 뒤 %s", f.inDays, f.name))
				end
				fc = "\n항해사의 예보: " .. table.concat(parts, " · ")
			end
			local weatherAlert = if view.weather.id == "storm" then "🔴 폭풍 접근 · 항해 지연·사고 주의"
				elseif view.weather.id == "rain" then "🟡 비 · 안개·암초 주의"
				elseif view.weather.id == "head" or view.weather.id == "calm" then "🟡 역풍·무풍 · 항해 지연 주의"
				else "🟢 현재 날씨에 큰 기상 경보 없음"
			return mkLabel(content, string.format("오늘 날씨: %s (바람 x%.2f)\n%s\n%s%s", view.weather.name, view.weather.wind, weatherAlert, view.weather.hint, fc), 15,
				if view.weather.id == "storm" then COLORS.red else COLORS.gold, true)
		end)
		add(function()
			return H.tileGrid({
				{ icon = "route", title = "하루 기다리기", sub = "날씨가 나쁠 때 · 사기 +2", btn = "대기", color = COLORS.blue, onClick = function() call("WaitDay", {}) end },
				{ icon = "map", title = "해도 보기", sub = "항구 위치 한눈에", btn = "지도", color = COLORS.green, onClick = function() openTab("map", "chart") end },
			}, content, 176, 150)
		end)
	end
	add(function()
		return mkLabel(content, string.format("보급품 %d · 석탄 %d%s", ship.supplies, ship.coal, if ship.steam then " (증기선은 석탄을 태워요)" else ""), 13, COLORS.muted, false)
	end)
	-- 정렬: 가까운 순(기본) · 의뢰 목적지 · 조선소 · 이름 · 해역
	H.routeSort = H.routeSort or "near"
	add(function()
		local row = mkRow(content, "항로 정렬", "지금 선택: " .. ({ near = "가까운 순", quest = "의뢰 목적지 먼저", yard = "조선소 먼저", name = "이름순", region = "해역별" })[H.routeSort], {
			{ text = "가까운 순", color = if H.routeSort == "near" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "near"; render() end },
			{ text = "의뢰", color = if H.routeSort == "quest" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "quest"; render() end },
			{ text = "조선소", color = if H.routeSort == "yard" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "yard"; render() end },
			{ text = "해역", color = if H.routeSort == "region" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "region"; render() end },
			{ text = "지도", color = COLORS.green, onClick = function() openTab("map", "chart") end },
		}, 60)
		return row
	end)
	add(function()
		return mkLabel(content, "기상 경고는 현재 항구 날씨 기준이야. 해적·돌발 사건은 항해 중 발생하므로 미리 안전을 보장할 수 없어.", 12, COLORS.muted, false)
	end)
	local sorted = table.clone(view.routes)
	local mode = H.routeSort
	table.sort(sorted, function(a, b)
		if (a.locked ~= nil) ~= (b.locked ~= nil) then
			return a.locked == nil
		end
		if mode == "quest" and (a.quest ~= nil) ~= (b.quest ~= nil) then
			return a.quest ~= nil
		elseif mode == "yard" and a.yard ~= b.yard then
			return a.yard
		elseif mode == "region" and a.region ~= b.region then
			return a.region < b.region
		end
		if a.distanceKm ~= b.distanceKm then
			return a.distanceKm < b.distanceKm
		end
		return a.name < b.name
	end)
	for _, r in sorted do
		add(function()
			local supplyLeft = ship.supplies - r.supplies
			local coalLeft = (ship.coal or 0) - (r.coal or 0)
			local warn = if supplyLeft < 0 then string.format("🔴 보급 %d 부족", -supplyLeft)
				elseif (r.coal or 0) > 0 and coalLeft < 0 then string.format("🔴 석탄 %d 부족", -coalLeft)
				else string.format("🟢 보급 충분 · 예상 잔량 %d", supplyLeft)
			if view.weather and (view.weather.id == "storm" or view.weather.id == "rain") then
				warn ..= if view.weather.id == "storm" then " · 🔴 현재 폭풍 주의" else " · 🟡 현재 비 주의"
			end
			if r.locked then
				return mkRow(content, r.name, string.format("%s · 🔒 %s", r.region, r.locked), {
					{ text = "잠김", color = COLORS.grey, onClick = function() message = r.region .. " 해역은 " .. r.locked; messageOk = false; render() end },
				}, 56)
			end
			local tags = (if r.yard then " 🔧조선소" else "") .. (if r.quest then " 📜" .. r.quest else "")
			return mkRow(content, r.name .. tags, string.format("%s · %d일 · %d km\n필요 보급 %d%s · %s", r.region, r.days, r.distanceKm, r.supplies, if r.coal > 0 then (" · 석탄 " .. r.coal) else "", warn), {
				{ text = "출항", color = COLORS.blue, onClick = function() confirmSail(r) end },
			}, 56)
		end)
	end
end

local openYardHall
-- 동료 조언 줄: 말하는 동료의 초상과 말, 그리고 바로 가는 버튼 (최대 n개)
function H.counselRows(n)
	if H.contextAdviceShown or not view then return end
	local relevant = {}
	for _, counsel in (view.counsel or {}) do
		-- 교역 화면에는 교역, 조선소에는 선박 조언만 표시한다.
		if counsel.tab == currentTab then table.insert(relevant, counsel) end
	end
	if #relevant == 0 and H.MENU_FOCUS[currentTab] then
		-- 새 조언이 없어도 실제 승선 동료가 현재 시설의 할 일을 말한다.
		local speaker = { name = "선장 항해 비서", role = "항해 안내" }
		for _, companion in (view.companions and view.companions.list) or {} do
			if companion.joined then
				speaker = { id = companion.id, name = companion.name, role = companion.role or "동료" }
				break
			end
		end
		local adviceText = H.MENU_FOCUS[currentTab][2]
		if currentTab == "trade" then
			local cheapest, bestPct = nil, 0
			for _, good in (view.goods or {}) do
				local _, pct = H.marketPriceSignal(good)
				if pct < bestPct then
					cheapest, bestPct = good, pct
				end
			end
			if cheapest and bestPct < -0.5 then
				adviceText = string.format("%s는 세계 평균보다 %.1f%% 저렴해. 매입 전에 수량을 확인하고 판매손익과 구분해.", cheapest.name, -bestPct)
			else
				adviceText = "세계 평균보다 크게 저렴한 상품이 없어. 보유 상품의 세후 판매손익을 먼저 확인해."
			end
		elseif currentTab == "yard" and view.ship then
			local ship = view.ship
			if ship.maxHull > 0 and ship.hull < ship.maxHull * 0.5 then
				adviceText = string.format("기함 선체 %d/%d야. 수리를 먼저 확인하고 화물·속도·선체·포문·승조원까지 비교해.", ship.hull, ship.maxHull)
			else
				adviceText = "새 배와 현재 기함의 다섯 성능을 비교해. 교체하면 기존 개조는 초기화돼."
			end
		elseif currentTab == "route" then
			local missing = nil
			for _, r in (view.routes or {}) do
				if not r.locked and (r.supplies > view.ship.supplies or (r.coal or 0) > (view.ship.coal or 0)) then missing = r; break end
			end
			adviceText = if missing then missing.name .. " 항로는 보급품·석탄이 모자라. 출항 전 준비량을 확인해."
				else "항로별 항해일과 보급 필요량·의뢰 목적지를 비교하고 지도를 확인해."
		elseif currentTab == "map" then
			adviceText = "항구를 누르면 거리·항해일·보급량이 보여. 금색=현재, 주황=의뢰, 초록=조선소야."
		elseif currentTab == "battle" then
			adviceText = if view.ship.hull < view.ship.maxHull * 0.5 then "기함 내구도가 절반 이하여서 위험해. 수리 후 자동스킬을 확인해."
				else "출격 전에 선체·포문·승조원과 자동스킬 발동 순서를 확인해."
		elseif currentTab == "war" then
			adviceText = if view.war then string.format("함대전 %d/%d파도 진행 중이야. 파도 사이에 선체가 회복되지 않아.", view.war.wave, view.war.total)
				else "함대전은 여러 파도에 걸쳐 싸워. 선체·포문·승조원을 먼저 확인해."
		elseif currentTab == "quest" or currentTab == "board" then
			local ready = 0
			for _, q in (view.quests and view.quests.active) or {} do
				if q.kind == "deliver" and q.progress >= q.amount then ready += 1 end
			end
			adviceText = if ready > 0 then string.format("납품 준비가 끝난 의뢰가 %d건이야. 진행 일지에서 보상을 확인해.", ready)
				else "현재 의뢰의 진행도·보상과 주점 의뢰의 남은 기한을 확인해."
		elseif currentTab == "status" then
			adviceText = string.format("선체 %d/%d · 화물 %d/%d · 보급 %d. 부족한 상태부터 정비해.", view.ship.hull, view.ship.maxHull, view.ship.cargoUsed, view.ship.cargoCapacity, view.ship.supplies)
		elseif currentTab == "crew" then
			local joined = 0
			for _, c in (view.companions and view.companions.list) or {} do if c.joined then joined += 1 end end
			adviceText = string.format("승선 동료 %d명 · 정원 %d명. 직책 적합도를 확인하고 배치해.", joined, view.companions.max or 0)
		elseif currentTab == "recruit" then
			adviceText = "초상·직업·특기·영입 비용을 비교해. 합류한 동료는 직책에 맞게 배치해."
		elseif currentTab == "harbor" then
			adviceText = view.player.portName .. "의 특산품·수요와 산업 발전 상태를 확인하면 교역 계획을 세우기 쉬워."
		elseif currentTab == "explore" then
			adviceText = "탐험 지점의 위험·보상·발견물을 비교하고 준비 상태를 확인해."
		elseif currentTab == "gwent" then
			adviceText = "근접·사격·포·특수 카드 비중과 병종 상성을 보고 덱을 편성해."
		elseif currentTab == "tech" then
			local ready = 0
			for _, t in (view.tech or {}) do
				if not t.owned and not t.blocked and (t.cost or 0) <= view.player.coins then ready += 1 end
			end
			adviceText = if ready > 0 then string.format("현재 연구 가능한 기술이 %d개야. 비용과 효과를 비교해.", ready)
				else "잠긴 기술의 선행 조건과 필요한 코인을 확인해."
		elseif currentTab == "scholar" then
			adviceText = "항구 학자에게 발견물을 보고하고 연구 성과와 해금 가능한 지식을 확인해."
		elseif currentTab == "codex" then
			adviceText = "지식 백과에서 발견·미발견 항목을 구분하고 다음 수집 목표를 정해."
		end
		table.insert(relevant, {
			who = speaker, text = adviceText, tab = currentTab,
		})
	end
	local shown = 0
	for _, cs in relevant do
		if shown >= (n or 1) then break end
		shown += 1
		add(function()
			local buttons = {}
			if cs.tab ~= currentTab then
				table.insert(buttons, { text = cs.label or "이동", color = COLORS.green, onClick = function() H.goAdvice(cs.tab) end })
			elseif currentTab == "trade" then
				table.insert(buttons, { text = "교역 장부", color = COLORS.green, onClick = function() if H.tradeHall then H.tradeHall() end end })
			elseif currentTab == "yard" then
				table.insert(buttons, { text = "선박 관리", color = COLORS.green, onClick = function() if H.yardHall then H.yardHall() end end })
			elseif currentTab == "route" then
				table.insert(buttons, { text = "지도", color = COLORS.green, onClick = function() openTab("map", "chart") end })
			elseif currentTab == "map" then
				table.insert(buttons, { text = "항로", color = COLORS.green, onClick = function() openTab("route") end })
			elseif currentTab == "crew" then
				table.insert(buttons, { text = "영입", color = COLORS.green, onClick = function() openTab("recruit") end })
			elseif currentTab == "quest" then
				table.insert(buttons, { text = "의뢰판", color = COLORS.green, onClick = function() openTab("board") end })
			end
			if cs.dismissable then
				table.insert(buttons, { text = "알겠어요", color = COLORS.grey, onClick = function() call("AdviceDone", { id = cs.id }) end })
			end
			local role = cs.who and cs.who.role or "동료"
			local name = cs.who and cs.who.name or "시설 길잡이"
			local row = mkRow(content, string.format("조언 · %s (%s)", name, role), cs.text, buttons, 96)
			row.Name = "MenuAdvice_" .. currentTab
			if cs.who and cs.who.id then H.companionFace(row, cs.who.id, 64) end
			return row
		end)
	end
	H.contextAdviceShown = shown > 0
end

-- 동료 얼굴을 줄 왼쪽에 붙인다 (그린 초상 → 학자 초상 → 입체 모델 순서)
function H.companionFace(row, id, px)
	if not id then
		return nil
	end
	local scholarId = string.match(id, "^c_(.+)$")
	local portrait = COMPANION_PORTRAIT[id]
	if portrait then
		return withIcon(row, "Portraits", portrait.atlas, nil, px, portrait.offset)
	elseif scholarId and SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. scholarId] then
		return withIcon(row, "Portraits", "scholar_" .. scholarId, nil, px)
	elseif COMPANION_MODEL[id] then
		return withIcon(row, "People", COMPANION_MODEL[id], nil, px)
	end
	return nil
end

local function renderYard()
	local yard = view.shipyard
	H.walletBar("yard")
	-- [조선소 첫 화면] 기함 특징과 실측 수치를 가장 먼저 보여준다. 갑판 대포와 승조원을 분리한다.
	local sh = view.ship
	local active = add(function() return mkHeader(content, "내 기함 · " .. sh.className) end)
	active.Name = "YardSectionShip"
	H.statStrip({
		{ "선체", string.format("%d / %d", sh.hull, sh.maxHull), tone = if sh.hull < sh.maxHull * 0.5 then "bad" else "good" },
		{ "화물칸", string.format("%d / %d", sh.cargoUsed, sh.cargoCapacity), tone = "key" },
		{ "속도 · 포문", string.format("%.1f · %d", sh.speed, sh.cannons), tone = "key" },
	})
	add(function()
		local kind = if sh.steam then "증기 추진 · 석탄 " .. tostring(sh.fuelPerDay) .. "개/일"
			elseif sh.rowed then "노젓기 병행 · 무풍 항해 특성" else "바람으로 이동하는 범선"
		local row = mkRow(content, sh.name .. " · 지금 타는 배", sh.summary .. "\n" ..
			string.format("갑판 승조원 %d/%d · 포 %d문\n%s · %s · 포격 개조 +%d%% · 보강 %d단계",
			sh.crew, sh.maxCrew, sh.cannons, sh.cannonName, kind, math.floor(sh.cannonBonus * 100 + 0.5), sh.plating), nil, 132)
		local icon = SHIP_ICON[sh.id]
		if icon then withIcon(row, icon[1], icon[2], icon[3], 102) end
		return row
	end)
	H.counselRows(1)
	-- [선박 고유 능력] 현재 기함 성능과 약점을 실제 서버 운용 보정치로 안내한다.
	if sh.trait then
		add(function()
			local t = sh.trait
			return mkRow(content, "기함 특화 · " .. t.role,
				string.format("약점: %s\n항해 %+d%% · 장거리 %+d%% · 역풍대응 %+d%%\n보급 %+d%% · 선창 %+d%% · 관세절감 %+d%%\n포격 %+d%% · 백병 %+d%% · 폭풍피해 감소 %+d%% · 탐사 %+d%%",
				t.weak or "없음",
				math.floor((t.sail or 0) * 100 + 0.5), math.floor((t.long or 0) * 100 + 0.5),
				math.floor((t.wind or 0) * 100 + 0.5), math.floor((t.supplies or 0) * 100 + 0.5),
				math.floor((t.cargo or 0) * 100 + 0.5), math.floor((t.tariff or 0) * 100 + 0.5),
				math.floor((t.cannon or 0) * 100 + 0.5), math.floor((t.melee or 0) * 100 + 0.5),
				math.floor((t.storm or 0) * 100 + 0.5), math.floor((t.explore or 0) * 100 + 0.5)),
				nil, 125)
		end)
	end
	add(function() return mkHeader(content, "정비 · 보급 · 선원") end)
	if not yard.available and view.nearestYard then
		add(function()
			local ny = view.nearestYard
			local r
			for _, x in view.routes do
				if x.id == ny.id then
					r = x
				end
			end
			return mkRow(content, "가장 가까운 조선소: " .. ny.name, string.format("%d일 · %d km · 보급품 %d\n여기서는 응급 수리만 돼요", ny.days, ny.distanceKm, ny.supplies), {
				{ text = "그곳으로 출항", color = COLORS.blue, onClick = function() if r then confirmSail(r) end end },
			}, 76)
		end)
	end
	add(function()
		local sh = view.ship
		local maxH = math.max(1, yard.maxHull or sh.maxHull)
		local cur = maxH - (yard.fullMissing or yard.missing or 0)
		local pct = math.floor(cur / maxH * 100 + 0.5)
		local need = (yard.missing or 0) > 0
		return H.tileGrid({
			{ icon = "yard", title = if yard.field then "응급 수리" else "선체 수리", sub = if need then string.format("선체 %d%% · %d코인", pct, yard.repairTotal) else string.format("선체 %d%% 튼튼해요", pct),
				btn = if need then "수리" else "불필요", color = COLORS.green, enabled = need, onClick = function() call("Repair") end },
			{ icon = "cc0_helmet", title = "선원 고용", sub = string.format("%d코인/명 · %d/%d", yard.hireCost, sh.crew, sh.maxCrew), btn = "+5명", color = COLORS.blue, onClick = function() call("HireCrew", { amount = 5 }) end },
			{ icon = "cc0_chest", title = "보급품", sub = string.format("%d코인/개 · 보유 %d", yard.supplyCost, sh.supplies), btn = "+20", color = COLORS.blue, onClick = function() call("BuySupplies", { amount = 20 }) end },
			{ icon = "harbor", title = "조선소 입장", sub = "배·대포·보강 고르기", btn = "입장", color = COLORS.gold, enabled = yard.available, onClick = function() openYardHall() end },
		}, content)
	end)
	if not yard.available then
		add(function() return mkLabel(content, "이 항구엔 조선소가 없어 배 구매·수리가 안 돼요.", 13, COLORS.gold, false) end)
	end
	local rf = view.refit
	add(function()
		return mkRow(content, string.format("선단 · 호위함 %d/3척", view.fleet.escorts), string.format("고용 %d코인 · 명성 %d 필요\n포격 +8%%/척 · 속도 -3%%/척 · 유지 15코인/일", view.fleet.price, view.fleet.needFame), {
			{ text = "고용", color = COLORS.blue, enabled = yard.available and view.fleet.escorts < 3, onClick = function() call("BuyEscort") end },
			{ text = "해산", color = COLORS.red, enabled = view.fleet.escorts > 0, onClick = function() call("DismissEscort") end },
		}, 84)
	end)
	-- 선단 편성: 기함 외에 실제 배를 최대 3척 거느린다
	local fleetHeader = add(function() return mkHeader(content, string.format("선단 편성 (기함 + %d/%d척)", #view.fleet.ships, view.fleet.max)) end)
	fleetHeader.Name = "YardSectionFleet"
	add(function()
		return mkLabel(content, string.format("화물 +%d · 속도 %d(가장 느린 배 기준) · 유지 %d코인/척/일 · 다음 배 명성 %d", view.fleet.cargo, view.fleet.speed, view.fleet.upkeep, view.fleet.fameNeed), 12, COLORS.muted, false)
	end)
	for _, f in view.fleet.ships do
		add(function()
			local frow = mkRow(content, string.format("%d번함 · %s", f.index, f.name), string.format("선체 %d/%d · 포 %d · 화물 %d · 속도 %d", f.hull, f.maxHull, f.cannons, f.cargo, f.speed), {
				{ text = "기함으로", color = COLORS.blue, onClick = function() call("SetFlagship", { index = f.index }) end },
				{ text = string.format("매각 %d", f.sell), color = COLORS.red, onClick = function() call("SellFleetShip", { index = f.index }) end },
			}, 96)
			local fsi = SHIP_ICON[f.id or ""] or SHIP_ICON.frigate
			withIcon(frow, fsi[1], fsi[2], fsi[3], 80)
			return frow
		end)
	end
	if #view.fleet.ships < view.fleet.max then
		for _, s in yard.ships do
			if not s.locked and s.price > 0 then
				add(function()
					return mkRow(content, string.format("선단에 추가: %s", s.name), string.format("포 %d · 화물 %d · 속도 %d · 선체 %d", s.cannons, s.cargo, s.speed, s.hull), {
						{ text = tostring(s.price), color = COLORS.green, enabled = yard.available, onClick = function() call("BuyFleetShip", { shipId = s.id }) end },
					}, 56)
				end)
			end
		end
	end
	local upgradeHeader = add(function() return mkHeader(content, string.format("대포 · 선체 개조 (등급 %d · %s)", rf.class, rf.className)) end)
	upgradeHeader.Name = "YardSectionRefit"
	add(function()
		return mkLabel(content, "현재 장착: " .. rf.cannonName .. string.format(" (포격 +%d%%) · 보강 %d단계\n교체 전후 화물·내구·대포 성능과 실제 결제 금액을 확인해. 새 배를 사면 개조가 초기화돼.", math.floor(rf.cannonMult * 100 + 0.5), rf.plating), 14, COLORS.muted, false)
	end)
	for _, c in rf.cannons do
		add(function()
			local delta = math.floor((c.mult - rf.cannonMult) * 100 + 0.5)
			local cargoDelta = c.capacityAfter - sh.cargoCapacity
			local sub = string.format("%s\n포격 보너스 +%d%% (현재 대비 %+d%%)\n화물 %d → %d (%+d칸) · 실결제 %s / 소지금 %s",
				c.summary, math.floor(c.mult * 100 + 0.5), delta, sh.cargoCapacity, c.capacityAfter, cargoDelta,
				H.commas(c.netCost), H.commas(view.player.coins))
			if not c.canCarry then sub ..= "\n화물 초과: 장착 전 짐을 내려야 해" end
			if c.locked then sub ..= "\n" .. c.locked end
			local crow = mkRow(content, c.name .. (if c.owned then " · 현재 장착" else ""), sub, {
				{ text = if c.owned then "장착 중" else "장착\n" .. H.commas(c.netCost), color = COLORS.steam,
					enabled = yard.available and not c.owned and not c.locked and c.canCarry and view.player.coins >= c.netCost,
					onClick = function() call("BuyCannon", { cannonId = c.id }) end },
			}, 144)
			withIcon(crow, "Naval", if c.id == "basic" then "cannon" else "cannon-mobile", if c.id == "steam_gun" then Color3.fromRGB(150, 110, 70) else nil, 88)
			return crow
		end)
	end
	if rf.nextPlating then
		local np = rf.nextPlating
		add(function()
			local sub = string.format("최대 선체 %d → %d (%+d) · 속도 %.1f → %.1f\n화물칸 %d → %d (%+d칸)\n실결제 %s / 소지금 %s · 현재 보강 %d단계",
				sh.maxHull, np.hullAfter, np.hullAfter - sh.maxHull, sh.speed, np.speedAfter,
				sh.cargoCapacity, np.capacityAfter, np.capacityAfter - sh.cargoCapacity,
				H.commas(np.price), H.commas(view.player.coins), rf.plating)
			if not np.canCarry then sub ..= "\n화물이 무거워 보강 불가" end
			if np.locked then sub ..= "\n" .. np.locked end
			local row = mkRow(content, "다음 선체 보강 · " .. np.name, sub, {
				{ text = "보강\n" .. H.commas(np.price), color = COLORS.green,
					enabled = yard.available and not np.locked and np.canCarry and view.player.coins >= np.price,
					onClick = function() call("BuyPlating", {}) end },
			}, 135)
			withIcon(row, "Naval", "ship-large", Color3.fromRGB(110, 96, 82), 88)
			return row
		end)
	else
		add(function() return mkLabel(content, "선체 보강: 최고 단계 · 추가 개조 없음", 14, COLORS.green, true) end)
	end
	-- [7대륙 36척] 지역별 신규 선박은 기존 조선소 구매 목록에 연결하고 지역·면허·모험 제한을 안내한다.
	-- 모델·구매/저장·전투 구조는 기존 시스템을 재사용한다.
	local blueprintHead = add(function()
		return mkHeader(content, string.format("7대륙 선박 %d종 · 3D 원본 설계", #ShipsData.Blueprints))
	end)
	blueprintHead.Name = "YardSectionBlueprints"
	H.shipBlueprintFaction = H.shipBlueprintFaction or "europe"
	add(function() return mkLabel(content,
		"실존 6대륙 1~5단계 · 미지의 땅 1~6단계. 36척 모두 3D 원본·개별 항해·교역·전투 성능 적용. 신규 23척은 해당 지역 조선소에서, 미지 선박은 호놀룰루에서 구매해.",
		13, COLORS.muted, false) end)
	local stageScenes = {
		"얇은 포염·가벼운 물보라", "선측 불티·파편 증가", "연장된 포탄 잔상·진한 포연",
		"확산 섬광·2지점 화재", "무거운 포성·3지점 화재·2중 물결", "미지 선박의 발광 궤적·해무·최종 충격파",
	}
	local regionScenes = {
		europe = "황금 포염·굵은 화약 연기", east_asia = "붉은 화포 불티·노선 거품",
		new_world = "흰 포탄 잔상·날렵한 항적", middle_east = "황금 포염·연한 물보라",
		southeast_asia = "청록 파도·기동 항적", africa = "목재 파편·노선 물결",
		lost = "청록·보라 발광 충격파",
	}
	-- [지역 조선소 배색 해설] 실제 38색 원본 재질을 손상 없이 복원했는지 눈으로 비교할 수 있다.
	local regionMaterials = {
		europe = "호두빛 판재·황동 장식·상아색 캔버스 돛",
		east_asia = "짙은 목재·주홍 선체 장식·노선 갑판",
		new_world = "밝은 목재·미색 돛천·철제 난간",
		middle_east = "황갈색 목재·삼각돛·황동 선수 장식",
		southeast_asia = "거친 열대 목재·직물 돛·노",
		africa = "갈대 편조·무광 목재·천연 섬유 돛",
		lost = "암청·청록 선체·보라 장식·은빛 금속",
	}
	local regionPaint = {
		europe = Color3.fromRGB(156, 93, 53), east_asia = Color3.fromRGB(142, 59, 45),
		new_world = Color3.fromRGB(172, 128, 84), middle_east = Color3.fromRGB(205, 158, 89),
		southeast_asia = Color3.fromRGB(97, 132, 116), africa = Color3.fromRGB(164, 125, 80),
		lost = Color3.fromRGB(67, 151, 167),
	}
	for _, category in ShipsData.BlueprintFactions do
		add(function()
			return mkRow(content, category.name .. " · 선박 " .. (if category.id == "lost" then "6" else "5") .. "종",
			if category.id == "lost" then "호놀룰루 비밀 조선소 · 모험 레벨 필요" else "지역 조선소에서만 구매 · 선박별 운용 특화", {
				{ text = if H.shipBlueprintFaction == category.id then "선택 중" else "선택", color = if H.shipBlueprintFaction == category.id then COLORS.gold else COLORS.blue,
					onClick = function() H.shipBlueprintFaction = category.id; if tradeHallRefresh then tradeHallRefresh() else render() end end },
			}, 70)
		end)
	end
	for _, plan in ShipsData.Blueprints do
		if plan.faction == H.shipBlueprintFaction then
			add(function()
				-- 36척 실제 등록번호와 조선소 구매 개방을 따로 보여주고 전투 효과는 시각 전용임을 명시한다.
				local hasFull = AssetIds["Naval/" .. plan.id .. "-v5"] ~= nil
				local hasMobile = AssetIds["Naval/" .. plan.id .. "-v5-mobile"] ~= nil
				local definition = ShipsData.Ships[plan.id]
				local shop = nil
				for _, item in yard.ships do
					if item.id == plan.id then shop = item; break end
				end
				local status = if shop then (if shop.owned then "현재 기함" elseif shop.locked then shop.locked else "이 조선소에서 구매 가능")
					elseif plan.faction == "lost" then "호놀룰루 전용"
					else "해당 지역의 조선소에서 구매"
				local visual = if hasFull and hasMobile then "원본·모바일 경량판 등록" elseif hasFull then "원본 등록·경량판 미등록" else "자산 등록 대기"
				local role = definition and definition.trait and definition.trait.role or "고유 특화"
				local weak = definition and definition.trait and definition.trait.weak or "없음"
				local info = string.format("⚓ %s · %s\n🎨 배색·질감: %s\n🪵 선체: %s\n⛵ 돛·노: %s\n갑판: %s\n3D: %s\n전투 연출: %s\n%d단계 포격: %s\n주특화: %s\n약점: %s\n구매 위치·조건: %s",
					plan.era, plan.sailingZone, regionMaterials[plan.faction] or "원본 배색",
					plan.hull, plan.rig, plan.deck, visual, regionScenes[plan.faction] or "기본 해전 연출",
					plan.stage, stageScenes[plan.stage] or "기본 해전 연출", role, weak, status)
				-- [지역 전용선 바로 구매] 기존 BuyShip 서버 검사만 호출한다. 이 화면에서 우회 구매는 불가능하다.
				local purchase = nil
				if shop then
					local pay = math.max(0, shop.netCost)
					info ..= string.format("\n정가 %s · 기함 매각 보상 %s · 실결제 %s",
						H.commas(shop.price), H.commas(shop.tradeIn), H.commas(pay))
					if not shop.canCarry then info ..= "\n화물을 먼저 내려야 구매 가능" end
					purchase = {{
						text = if shop.owned then "현재 기함" elseif shop.locked then "잠김" else "교체\n" .. H.commas(pay),
						color = if shop.owned then COLORS.gold else COLORS.blue,
						enabled = yard.available and not shop.owned and not shop.locked and shop.canCarry and shop.netCost <= view.player.coins,
						onClick = function() call("BuyShip", { shipId = shop.id }) end
					}}
				end
				local row = mkRow(content, string.format("[%d단계] %s", plan.stage, plan.name), info, purchase, 300)
				-- 설명이 긴 선박도 기존 가변 높이 카드가 끝까지 표시하고, 모바일에서는 정지 3D로 성능을 아낀다.
				local icon = SHIP_ICON[plan.id]
				if icon then withIcon(row, icon[1], icon[2], icon[3], 76) end
				local swatch = row:FindFirstChild("AccentBar")
				if swatch then swatch.BackgroundColor3 = regionPaint[plan.faction] or UI_BRASS end
				return row
			end)
		end
	end
	local shipHeader = add(function() return mkHeader(content, "새 배 비교 · 실제 구매 가격") end)
	shipHeader.Name = "YardSectionShips"
	add(function() return mkLabel(content, "막대 색=새 배 · 흰 선=현재 기함 · ▲ 향상 / ▼ 감소\n실결제는 기함 매각 보상을 뺀 금액이고, 교체하면 기존 대포·보강은 초기화돼.", 14, COLORS.muted, false) end)
	-- [선박 원형 미리보기] 등록된 Naval 원본만 큰 회전 뷰에 표시한다.
	-- 이용 가능한 선박 목록의 ID만 사용하며 게임 데이터와 구매 규칙은 그대로 둔다.
	local previewShip = nil
	for _, candidate in yard.ships do
		if candidate.id == H.shipPreviewId then previewShip = candidate; break end
	end
	if not previewShip then previewShip = yard.ships[1] end
	if previewShip then
		H.shipPreviewId = previewShip.id
		add(function()
			local f = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, 164), Color3.fromRGB(229, 208, 169))
			f.Name = "YardSelectedShipPreview"
			corner(f, 8)
			local si = SHIP_ICON[previewShip.id]
			if si then
				local model = modelIcon(f, si[1], si[2], si[3], 144, previewShip.name)
				model.Position = UDim2.fromOffset(8, 10)
			else
				local unavailable = mkLabel(f, "해당 함종\n검증된 모형 없음", 13, INK_SOFT, true)
				unavailable.Position = UDim2.fromOffset(8, 40)
				unavailable.Size = UDim2.fromOffset(144, 60)
				unavailable.AutomaticSize = Enum.AutomaticSize.None
				unavailable.TextWrapped = true
			end
			local title = mkLabel(f, "선택 함종 · " .. previewShip.name, 17, INK, true)
			title.Position = UDim2.fromOffset(160, 9)
			title.Size = UDim2.new(1, -168, 0, 27)
			title.AutomaticSize = Enum.AutomaticSize.None
			title.TextTruncate = Enum.TextTruncate.AtEnd
			local detail = mkLabel(f, string.format("화물 %d · 속도 %.1f\n선체 %d · 포문 %d · 승조원 %d\n실결제 %s코인%s",
				previewShip.capacityAfter or previewShip.cargo, previewShip.speed, previewShip.hull,
				previewShip.cannons, previewShip.crew, H.commas(math.max(0, previewShip.netCost)),
				if previewShip.locked then "\n잠김: " .. tostring(previewShip.locked) else ""), 13, INK_SOFT, false)
			detail.Position = UDim2.fromOffset(160, 42)
			detail.Size = UDim2.new(1, -168, 0, 112)
			detail.AutomaticSize = Enum.AutomaticSize.None
			detail.TextWrapped = true
			detail.TextYAlignment = Enum.TextYAlignment.Top
			return f
		end)
	end
	local maxCargo, maxSpeed, maxHull = sh.cargoCapacity, sh.speed, sh.maxHull
	local maxCannons, maxCrew = sh.cannons, sh.maxCrew
	for _, s in yard.ships do
		maxCargo, maxSpeed, maxHull = math.max(maxCargo, s.capacityAfter or s.cargo), math.max(maxSpeed, s.speed), math.max(maxHull, s.hull)
		maxCannons, maxCrew = math.max(maxCannons, s.cannons), math.max(maxCrew, s.crew)
	end
	for _, s in yard.ships do
		add(function()
			local pay = math.max(0, s.netCost)
			local refund = if s.netCost < 0 then " · 차액 환급 " .. H.commas(-s.netCost) else ""
			local diffCargo = s.capacityAfter - sh.cargoCapacity
			local sub = string.format("%s\n정가 %s - 내 기함 보상 %s = 실결제 %s%s\n화물 %+d칸 · 속도 %+.1f · 선체 %+d · 포 %+d\n승조원 정원 %+d · 현재 화물 %d/%d · 내 돈 %s",
				s.summary, H.commas(s.price), H.commas(s.tradeIn), H.commas(pay), refund,
				diffCargo, s.speed - sh.speed, s.hull - sh.maxHull, s.cannons - sh.cannons,
				s.crew - sh.maxCrew, sh.cargoUsed, s.capacityAfter, H.commas(view.player.coins))
			if s.trait then
				local t = s.trait
				sub ..= string.format("\n특화: %s · 약점: %s", t.role or "일반", t.weak or "없음")
				local labels = {}
				for _, trait in {
					{ "항해", t.sail }, { "장거리", t.long }, { "풍향", t.wind },
					{ "보급 소모", t.supplies }, { "적재", t.cargo }, { "관세 절감", t.tariff },
					{ "포격", t.cannon }, { "백병전", t.melee }, { "폭풍 감소", t.storm },
					{ "탐사 경험", t.explore }, { "수리 비용", t.repair },
				} do
					if trait[2] and trait[2] ~= 0 then
						table.insert(labels, string.format("%s %+d%%", trait[1], math.floor(trait[2] * 100 + 0.5)))
					end
				end
				sub ..= "\n" .. table.concat(labels, " · ")
			end
			if s.newRegional then sub ..= "\n지역 전용 조선소 입고 함종" end
			if s.id == "galleon" and AssetIds["Naval/galleon-heritage"] then
			sub ..= "\n선박 원형: Nautical Galleon · R-LAB (rakshaan), CC BY 4.0 · 전시대 제거"
		end
		if s.rowed then sub ..= "\n노젓기 병행 · 무풍 항해 특성" end
			if s.steam then sub ..= "\n석탄 소모 " .. tostring(s.fuelPerDay) .. "개/일" end
			if not s.canCarry then sub ..= "\n화물 부족: 교체 전에 짐을 내려야 해" end
			if s.locked then sub ..= "\n" .. s.locked end
			if not s.owned and s.netCost > view.player.coins then sub ..= "\n자금 부족 " .. H.commas(s.netCost - view.player.coins) .. "코인" end
			local row = mkRow(content, string.format("[등급%d] %s%s", s.class, s.name, if s.owned then " · 현재 기함" elseif s.steam then " · 증기" else ""),
				sub, {
					{ text = if s.id == H.shipPreviewId then "미리보기 중" else "모형 보기", color = COLORS.gold,
						onClick = function()
							H.shipPreviewId = s.id
							if tradeHallRefresh then tradeHallRefresh() else render() end
						end },
					{ text = if s.owned then "현재 배" elseif s.locked then "잠김" else "교체\n" .. H.commas(pay),
						color = if s.steam then COLORS.steam else COLORS.blue,
						enabled = yard.available and not s.owned and not s.locked and s.canCarry and s.netCost <= view.player.coins,
						onClick = function() call("BuyShip", { shipId = s.id }) end },
				}, if s.id == "galleon" and AssetIds["Naval/galleon-heritage"] then 236 else 210)
			local si = SHIP_ICON[s.id]
			if si then withIcon(row, si[1], si[2], si[3], 100) end
			-- [선박 시각 비교] 실제 교체 후 화물칸·속도·선체를 표시한다.
			-- 공통 카드의 본문 높이에 비교 영역을 예약해 모바일에서도 버튼·설명과 겹치지 않게 한다.
			row:SetAttribute("FooterHeight", 118)
			local chart = Instance.new("Frame")
			chart.Name = "ShipComparisonBars"
			chart.BackgroundTransparency = 1
			chart.Parent = row
			local stats = {
				{ "화물", s.capacityAfter or s.cargo, sh.cargoCapacity, maxCargo, COLORS.gold },
				{ "속도", s.speed, sh.speed, maxSpeed, COLORS.blue },
				{ "선체", s.hull, sh.maxHull, maxHull, COLORS.green },
				{ "포문", s.cannons, sh.cannons, maxCannons, COLORS.red },
				{ "승조", s.crew, sh.maxCrew, maxCrew, COLORS.grey },
			}
			for i, st in stats do
				local y = (i - 1) * 20
				local delta = st[2] - st[3]
				local arrow = if delta > 0.05 then "▲" elseif delta < -0.05 then "▼" else "━"
				local currentValue = if st[1] == "속도" then string.format("%.1f", st[3]) else string.format("%d", st[3])
				local nextValue = if st[1] == "속도" then string.format("%.1f", st[2]) else string.format("%d", st[2])
				local label = mkLabel(chart, st[1] .. " " .. arrow .. " " .. nextValue .. "/" .. currentValue, 12, if delta >= 0 then INK_SOFT else COLORS.red, true)
				label.Position = UDim2.fromOffset(0, y)
				label.Size = UDim2.fromOffset(119, 18)
				label.AutomaticSize = Enum.AutomaticSize.None
				local track = Instance.new("Frame")
				track.BackgroundColor3 = Color3.fromRGB(80, 68, 57)
				track.BorderSizePixel = 0
				track.Position = UDim2.new(0, 122, 0, y + 5)
				track.Size = UDim2.new(1, -126, 0, 9)
				track.Parent = chart
				corner(track, 4)
				local fill = Instance.new("Frame")
				fill.BackgroundColor3 = st[5]
				fill.BorderSizePixel = 0
				fill.Size = UDim2.fromScale(math.clamp(st[2] / math.max(1, st[4]), 0, 1), 1)
				fill.Parent = track
				corner(fill, 4)
				local current = Instance.new("Frame")
				current.Name = "CurrentShipMark"
				current.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
				current.BorderSizePixel = 0
				current.Position = UDim2.new(math.clamp(st[3] / math.max(1, st[4]), 0, 1), -1, -0.3, 0)
				current.Size = UDim2.new(0, 3, 1.6, 0)
				current.Parent = track
			end
			local function fitChart()
				local narrow = row.AbsoluteSize.X < 450
				chart.Position = UDim2.new(0, if narrow then 12 else 118, 1, if narrow then -161 else -112)
				chart.Size = UDim2.new(1, if narrow then -24 else -232, 0, 100)
			end
			row:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitChart)
			task.defer(fitChart)
			return row
		end)
	end
end


-- 조선소 별도 화면: 조선 장인과 마주 보고 정비·보급·배 구입·개조를 한다 (기존 조선소 목록을 큰 화면에 그대로 쓴다)
function openYardHall()
	Sfx.play("sfx_creak")
	Sfx.facilityCue("yard")
	closeTradeHall()
	local layer = overlayGui("TradeHallGui", 15)
	main.Visible = false
	-- [전용 화면] 교역·조선소 위로 이전 HUD 및 도크 아이콘이 남지 않게 숨긴다.
	hud.Visible = false
	hudTopGui.Enabled = false
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = COLORS.cover
	root.BorderSizePixel = 0
	root.Parent = layer
	local scroll = Instance.new("ScrollingFrame")
	scroll.Position = UDim2.fromOffset(258, 62)
	scroll.Size = UDim2.new(1, -266, 1, -70)
	scroll.BackgroundTransparency = 1
	scroll.BorderSizePixel = 0
	scroll.ScrollBarThickness = 6
	scroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scroll.CanvasSize = UDim2.new()
	scroll.Parent = root
	local sl = Instance.new("UIListLayout")
	sl.Padding = UDim.new(0, 8)
	sl.SortOrder = Enum.SortOrder.LayoutOrder
	sl.Parent = scroll
	local lastScroll = 0

	local function build()
		if not layer.Parent or not view then
			return
		end
		lastScroll = scroll.CanvasPosition.Y
		for _, c in root:GetChildren() do
			if c ~= scroll then
				c:Destroy()
			end
		end
		for _, c in scroll:GetChildren() do
			if not c:IsA("UIListLayout") then
				c:Destroy()
			end
		end
		local p, ship = view.player, view.ship
		local width = root.AbsoluteSize.X
		if width <= 0 and workspace.CurrentCamera then width = workspace.CurrentCamera.ViewportSize.X end
		local showPortrait = width >= 760
		local inset = if showPortrait then 258 else 10
		local compactNav = not showPortrait
		-- [조선소 모바일 길찾기] 다섯 목차 버튼을 3열×2행으로 배치하고 본문과 겹치지 않게 내린다.
		scroll.Position = UDim2.fromOffset(inset, if compactNav then 172 else 128)
		scroll.Size = UDim2.new(1, -inset - 8, 1, if compactNav then -180 else -136)
		local top = mkBox(root, UDim2.fromOffset(8, 8), UDim2.new(1, -16, 0, 62), COLORS.paper)
		corner(top, 6)
		bookMaterial(top, "parchment", 220)
		local title = mkLabel(top, "조선 도감 · " .. p.portName, 19, INK, true)
		title.Position = UDim2.fromOffset(12, 7)
		title.Size = UDim2.new(1, -104, 0, 25)
		title.AutomaticSize = Enum.AutomaticSize.None
		title.TextTruncate = Enum.TextTruncate.AtEnd
		local hold = mkLabel(top, string.format("소지금 %s · 기함 %s · 선체 %d/%d · 화물 %d/%d",
			H.commas(p.coins), ship.name, ship.hull, ship.maxHull, ship.cargoUsed, ship.cargoCapacity), 14, INK_SOFT, false)
		hold.Position = UDim2.fromOffset(12, 34)
		hold.Size = UDim2.new(1, -100, 0, 20)
		hold.AutomaticSize = Enum.AutomaticSize.None
		hold.TextTruncate = Enum.TextTruncate.AtEnd
		local leave = mkButton(top, "나가기", COLORS.leather, UDim2.fromOffset(78, 44), closeTradeHall, true)
		leave.AnchorPoint = Vector2.new(1, 0.5)
		leave.Position = UDim2.new(1, -9, 0.5, 0)

		-- [조선소 항목 탐색] 기존 renderYard의 제목으로 바로 이동. 별도 메뉴/저장 구조를 만들지 않는다.
		local nav = mkBox(root, UDim2.fromOffset(inset, 76), UDim2.new(1, -inset - 8, 0, if compactNav then 88 else 44), COLORS.leather)
		local navColumns = if compactNav then 3 else 5
		for i, entry in { { "내 배·정비", "YardSectionShip" }, { "선단", "YardSectionFleet" }, { "대포·보강", "YardSectionRefit" }, { "7대륙 설계", "YardSectionBlueprints" }, { "새 배 비교", "YardSectionShips" } } do
			local btn0 = mkButton(nav, entry[1], COLORS.paper, UDim2.new(1 / navColumns, -6, 0, 40), function()
				local target = scroll:FindFirstChild(entry[2])
				if target then
					scroll.CanvasPosition = Vector2.new(0, math.max(0, target.AbsolutePosition.Y - scroll.AbsolutePosition.Y + scroll.CanvasPosition.Y))
				end
			end, true)
			btn0.Position = UDim2.new(((i - 1) % navColumns) / navColumns, 4, 0, 2 + math.floor((i - 1) / navColumns) * 44)
			btn0.TextSize = 14
		end
		local left = mkBox(root, UDim2.fromOffset(8, 128), UDim2.new(0, 240, 1, -136), COLORS.leather)
		left.Visible = showPortrait
		local lib = game:GetService("ReplicatedStorage"):FindFirstChild("MareAssets")
		local tpl = lib and lib:FindFirstChild("People") and lib.People:FindFirstChild(storyPortraitModel("조선 장인", p.portId or ""))
		local yardRegionalId, yardRegionalOffset, yardRegionalSize = H.facilityPortraitAsset(p.portId, "yard")
		local yardImageId = yardRegionalId or FACILITY_ATLAS or PORTRAIT_ATLAS
		if yardImageId then
			local photo = Instance.new("ImageLabel")
			photo.Name = "ShipwrightPortrait"
			photo.Size = UDim2.new(1, 0, 1, -150)
			photo.BackgroundTransparency = 1
			photo.BorderSizePixel = 0
			photo.ScaleType = Enum.ScaleType.Crop
			photo.Image = "rbxassetid://" .. tostring(yardImageId)
			photo.ImageRectOffset = yardRegionalOffset or (if FACILITY_ATLAS then FACILITY_TILE.yard else PORTRAIT_TILE.yard)
			photo.ImageRectSize = yardRegionalSize or PORTRAIT_SIZE
			photo.Parent = left
		else
			local vf = Instance.new("ViewportFrame")
			vf.BackgroundTransparency = 1
			vf.Size = UDim2.new(1, 0, 1, -150)
			vf.Ambient = Color3.fromRGB(170, 170, 178)
			vf.LightColor = Color3.fromRGB(255, 236, 205)
			vf.LightDirection = Vector3.new(-0.6, -0.8, -1).Unit
			vf.Parent = left
			local cam = Instance.new("Camera")
			cam.FieldOfView = 40
			cam.Parent = vf
			vf.CurrentCamera = cam
			local world = Instance.new("WorldModel")
			world.Parent = vf
			local m = portraitPerson(world, "yard" .. (p.portId or ""), "Knight", tpl)
			if not m then
				vf:Destroy()
			end
			local cf, size = CFrame.new(), Vector3.new(4, 6, 2)
			if m then
				cf, size = m:GetBoundingBox()
			end
			local focus = cf.Position + Vector3.new(0, size.Y * 0.1, 0)
			cam.CFrame = CFrame.lookAt(focus + Vector3.new(0.25, 0.08, -1).Unit * (math.max(size.X, size.Y, size.Z) * 1.7), focus)
		end
		local bubble = mkBox(left, UDim2.new(0, 10, 1, -146), UDim2.new(1, -20, 0, 136), Color3.fromRGB(240, 228, 200))
		corner(bubble, 12)
		local say = (message ~= "" and message) or "어서 오게. 배는 뱃사람의 목숨이지. 손볼 데가 있나?"
		local sayL = mkLabel(bubble, say, 16, Color3.fromRGB(50, 36, 24), true)
		sayL.Position = UDim2.fromOffset(10, 8)
		sayL.Size = UDim2.new(1, -20, 1, -16)
		sayL.AutomaticSize = Enum.AutomaticSize.None
		sayL.TextWrapped = true
		sayL.TextYAlignment = Enum.TextYAlignment.Top

		-- 기존 조선소 화면 내용을 이 스크롤 영역에 그린다
		local saved, previousAdvice = content, H.contextAdviceShown
		content = scroll
		H.contextAdviceShown = false
		local ok, err = pcall(renderYard)
		content, H.contextAdviceShown = saved, previousAdvice
		if not ok then
			warn("[Game] 조선소 화면 오류", err)
		end
		scroll.CanvasPosition = Vector2.new(0, lastScroll)
	end
	local lastWidth
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		local width = root.AbsoluteSize.X
		if width > 0 and width ~= lastWidth then
			lastWidth = width
			build()
		end
	end)
	tradeHallRefresh = build
	build()
end
H.yardHall = openYardHall

function H.startField(s)
	-- [입장 추적] 입력 전달 여부와 실제 지상맵 생성 단계를 별도로 검증한다(저장/보상과 무관).
	workspace:SetAttribute("FieldEntryAttempt", tostring(s.id))
	workspace:SetAttribute("FieldEntryStage", "BUTTON")
	if inField then
		workspace:SetAttribute("FieldEntryFailure", "ACTIVE_SCENE_BUSY")
		return
	end
	-- [입장 규칙] 지역·모험 레벨·잔여 발견물은 기존 서버 기준을 그대로 따른다.
	if not s.unlocked or (s.left or 0) <= 0 then
		message = if (s.left or 0) <= 0 then "이미 조사를 마친 탐험지예요" else string.format("모험 Lv.%d부터 입장할 수 있어요", s.minLevel)
		messageOk = false
		render()
		return
	end
	workspace:SetAttribute("FieldEntryFailure", nil)
	-- 필드 생성 오류가 나더라도 항구 시점·조작·기존 캐릭터 상태를 되돌릴 수 있게 보관한다.
	local returnCharacter = player.Character
	local returnCFrame = returnCharacter and returnCharacter:GetPivot()
	local returnHumanoid = returnCharacter and returnCharacter:FindFirstChildOfClass("Humanoid")
	local returnSpeed = returnHumanoid and returnHumanoid.WalkSpeed
	local returnJumpPower = returnHumanoid and returnHumanoid.JumpPower
	local lighting = game:GetService("Lighting")
	local returnLighting = { FogColor = lighting.FogColor, FogStart = lighting.FogStart, FogEnd = lighting.FogEnd, ClockTime = lighting.ClockTime }
	local oldFieldGui = player:FindFirstChildOfClass("PlayerGui") and player.PlayerGui:FindFirstChild("FieldGui")
	if oldFieldGui then oldFieldGui:Destroy() end
	inField = true
	-- 모바일에서 큰 지상맵을 구성하는 동안 빈 화면으로 보이지 않게 현재 탐험 화면에 안내를 유지한다.
	message = "지상맵을 여는 중..."
	messageOk = true
	render()
	task.wait() -- 안내를 실제로 한 프레임 그린 뒤 필드 장면을 만든다.
	local allyNames = {}
	for _, c in (view and view.companions and view.companions.list) or {} do
		if c.joined and #allyNames < 2 then
			table.insert(allyNames, { id = c.id, name = c.name, role = c.role }) -- 기존 영입 ID로 실제 동료만 한 번 소환
		end
	end
	local cardSkills = {}
	for _, c in (view and view.deck and view.deck.cards) or {} do
		if c.skill and c.kind ~= "ship" and #cardSkills < 3 then
			-- [전투 원화] 이미 등록된 원본 카드 ID를 지상 스킬 슬롯에 전달한다. 판정·덱은 그대로.
			table.insert(cardSkills, { id = c.id, name = c.name, skill = c.skill })
		end
	end
	local battleLevel = 1
	for _, c in (view and view.careers) or {} do
		if c.id == "battle" then battleLevel = c.level end
	end
	-- [탐험 HUD/원본 초상] 선장실·동료 화면에서 쓰는 같은 초상 시트와 좌표를 그대로 전달한다.
	-- 저장 상태를 읽기만 하며 별도의 초상 DB나 인물 복제본을 만들지 않는다.
	local heroPortrait = nil
	if H.capPortraitAsset and view and view.captain then
		local id, offset, size = H.capPortraitAsset(view.captain.portrait)
		if id then heroPortrait = { id = id, offset = offset, size = size } end
	end
	local allyPortraits = {}
	for _, ally in allyNames do
		local image = COMPANION_PORTRAIT[ally.id]
		local id = image and AssetIds["Portraits/" .. image.atlas]
		if id then
			local scale = sheetK(image.atlas)
			allyPortraits[ally.id] = { id = id, offset = image.offset * scale,
				size = (image.size or Vector2.new(256, 336)) * scale }
		end
	end
	local usesMana = false
	for _, card in cardSkills do
		if card.skill == "heal" or card.skill == "ward" or card.skill == "armor" or card.skill == "read" then
			usesMana = true
			break
		end
	end
	-- [무기 숙련] 기존 서버 탐험 자격을 확인하고 이번 탐험의 정산 시작 시각을 기록한다.
	local beginResult = call("FieldPracticeBegin", { siteId = s.id })
	local practiceAllowed = beginResult ~= nil and beginResult.ok == true
	workspace:SetAttribute("FieldEntryStage", "BUILDING")
	local startOk, startResult = pcall(FieldScene.start, {
		battleLevel = battleLevel,
		battleStats = view and view.battleStats,
		weaponPractice = view and view.weaponPractice, -- 영구 저장된 무기별 숙련 복원
		fieldStreakBest = view and view.fieldStreakBest or 0, -- 기존 서버 저장 최고 기록
		heroName = view and view.captain and view.captain.name or player.DisplayName,
		heroPortrait = heroPortrait,
		allyPortraits = allyPortraits,
		heroUsesMana = usesMana,
		cardSkills = cardSkills,
		allies = allyNames,
		-- [선택 집안] 기존 저장된 선장 출신을 공식 Weapons 정의로 변환. 기존 저장 키와 전투 수치는 그대로 사용한다.
		weapon = Weapons.originWeapon(view and view.captain and view.captain.origin and view.captain.origin.id,
			view and view.player and view.player.year).id,
		year = view and view.player and view.player.year, -- 실제 역사 시대로 활·총기 발화방식 결정
		name = s.name,
		portId = s.portId,
		siteId = s.id, -- 기존 Sites의 지역·도감 후보를 탐험 시각 연출에 그대로 연결한다.
		observableCards = s.observableCards, -- 서버에서 미발견/시대/선행지식 검증한 카드만 표시한다.
		nodes = math.clamp(s.days, 1, 3),
		danger = s.minLevel,
		seed = #s.id * 31 + s.days,
		onFinish = function(result, observedCardId, gainedPractice, streakRecord)
			inField = false
			applyView()
			main.Visible = true
			-- [귀환 저장] 클리어·패배·철수 모두 기존 저장 흐름에 숙련 경험치만 기록한다.
			-- 기존 Explore 보상은 이 기록과 무관하게 원래 서버 판정으로만 지급한다.
			if practiceAllowed then
				call("FieldPracticeCommit", { siteId = s.id, hits = gainedPractice or {},
					record = streakRecord and streakRecord.hits or 0 })
			end
			if result == "clear" then
				-- [현장 관찰] 서버가 기존 탐험지 pool·시대·미발견 상태를 재검증한 뒤 카드 후보를 선택한다.
				call("Explore", { siteId = s.id, observedCardId = observedCardId })
			else
				message = if result == "defeat" then "산적에게 쫓겨 탐험을 접었어요" else "탐험을 중단하고 항구로 돌아왔어요"
				messageOk = false
				render()
			end
		end,
	})
	-- [철수 중 입장 취소] 대형 필드 생성 도중 철수하면 onFinish가 이미 항구 복귀를 마쳤다.
	-- 완료된 철수를 입장 실패로 다시 처리해 UI와 캐릭터를 이중 복구하지 않는다.
	if startOk and type(startResult) == "table" and startResult.cancelled == true then
		workspace:SetAttribute("FieldEntryStage", "CANCELLED")
		return
	end
	-- [실제 입장 판정] 필드 생성 직후의 캐릭터 위치 복제 지연을 입장 실패로 오판하지 않는다.
	-- 기존 FieldScene의 실제 출발 좌표만 사용하고, 지형·전투 UI·조작 준비가 갖춰진 경우에만 재배치한다.
	local startErr = if startOk then nil else startResult
	if startOk then
		local ready = false
		for attempt = 1, 12 do
			local field = workspace:FindFirstChild("FieldScene")
			local ground = field and field:FindFirstChild("FieldGround")
			local fieldGui = player.PlayerGui:FindFirstChild("FieldGui")
			local char = player.Character
			local root = char and char:FindFirstChild("HumanoidRootPart")
			local combat = workspace:GetAttribute("FieldCombatReady") == true
			if ground and fieldGui and root and combat then
				if root.Position.X <= 2500 and attempt == 1 and type(startResult) == "table" and typeof(startResult.spawn) == "CFrame" then
					char:PivotTo(startResult.spawn)
					root.Anchored = false
				end
				if root.Position.X > 2500 and not root.Anchored then
					ready = true
					break
				end
			end
			if attempt < 12 then task.wait(0.12) end
		end
		if not ready then
			local field = workspace:FindFirstChild("FieldScene")
			local ground = field and field:FindFirstChild("FieldGround")
			local fieldGui = player.PlayerGui:FindFirstChild("FieldGui")
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			startOk = false
			startErr = string.format("FIELD_ENTRY_NOT_READY ground=%s gui=%s root=%s combat=%s", tostring(ground ~= nil), tostring(fieldGui ~= nil), tostring(root and root.Position.X), tostring(workspace:GetAttribute("FieldCombatReady")))
		else
			workspace:SetAttribute("FieldEntryStage", "ACTIVE")
			main.Visible = false
			message = ""
		end
	end
	if not startOk then
		workspace:SetAttribute("FieldEntryStage", "FAILED")
		workspace:SetAttribute("FieldEntryFailure", tostring(startErr):sub(1, 200))
		workspace:SetAttribute("FieldCombatReady", nil)
		-- 필드 생성 중 멈추면 지도·전투 조작 화면까지 정리하고 캐릭터·시점을 복구한다.
		warn("[Game] 탐험지 열기 실패", startErr)
		local partialField = workspace:FindFirstChild("FieldScene")
		if partialField then partialField:Destroy() end
		local partialGui = player:FindFirstChildOfClass("PlayerGui") and player.PlayerGui:FindFirstChild("FieldGui")
		if partialGui then partialGui:Destroy() end
		workspace:SetAttribute("FieldTouchPad", nil)
		pcall(function()
			local scripts = player:FindFirstChild("PlayerScripts")
			local module = scripts and scripts:FindFirstChild("PlayerModule")
			if module then require(module):GetControls():Enable() end
		end)
		lighting.FogColor, lighting.FogStart, lighting.FogEnd, lighting.ClockTime = returnLighting.FogColor, returnLighting.FogStart, returnLighting.FogEnd, returnLighting.ClockTime
		if returnCharacter and returnCharacter.Parent and returnCFrame then
			returnCharacter:PivotTo(returnCFrame)
			if returnHumanoid then
				returnHumanoid.WalkSpeed = returnSpeed
				returnHumanoid.JumpPower = returnJumpPower
			end
		end
		inField = false
		applyView()
		main.Visible = true
		message = "탐험지 이동 실패 · 항구로 복귀했어요. 다시 시도해 주세요"
		messageOk = false
		render()
	end
end

function RENDERERS.explore()
	H.walletBar(if H.exploreScholarView then "tavern" else "battle")
	local availableSites, pendingSites, remain = 0, 0, 0
	for _, site in (view.sites or {}) do
		if site.unlocked and site.left > 0 then availableSites += 1
		elseif not site.unlocked and site.left > 0 then pendingSites += 1 end
		remain += math.max(0, site.left or 0)
	end
	H.statStrip({
		{ "탐험 가능", tostring(availableSites) .. "곳", tone = "good" },
		{ "잠긴 지점", tostring(pendingSites) .. "곳", tone = "key" },
		{ "남은 기회", tostring(remain), tone = "key" },
	})
	if not H.exploreScholarView then -- 서재의 보고 탭에서는 탐험 지점을 보이지 않는다
	add(function() return mkHeader(content, "탐험 지점") end)
	if #view.sites == 0 then
		add(function() return mkLabel(content, "이 항구 근처에는 탐험 지점이 없어요.", 13, COLORS.muted, false) end)
	end
	-- [탐험 안내] 미개방 탐험지만 남았다면 이동 불가 이유를 지점 위에 안내한다.
	local openCount, nextLevel, nextYear = 0, nil, nil
	for _, site in view.sites do
		if site.unlocked and site.left > 0 then
			openCount += 1
		elseif not site.unlocked and site.left > 0 then
			if site.locked and string.find(site.locked, "모험 Lv.", 1, true) then
				nextLevel = math.min(nextLevel or site.minLevel, site.minLevel)
			elseif site.fromYear and view.player.year < site.fromYear then
				nextYear = math.min(nextYear or site.fromYear, site.fromYear)
			end
		end
	end
	if #view.sites > 0 and openCount == 0 then
		local reason = if nextLevel then string.format("현재 항구의 탐험지는 모험 Lv.%d 이상이 필요해요.", nextLevel)
			elseif nextYear then string.format("현재 항구의 연구기관은 %d년 이후에 열려요. 앞선 시대에는 강변·수도원·약방에서 조사할 수 있어요.", nextYear)
			else "이 항구의 남은 지식에는 선행 연구·동료·퀘스트 조건이 있어요."
		add(function() return mkLabel(content, reason, 14, COLORS.muted, false) end)
	end
	-- [탐험 길찾기] 현지에서 모두 잠긴 경우, 기존 항해 경로 중 지금 레벨로 조사 가능한 다른 항구를 안내한다.
	-- 항구 이동은 반드시 원래 항해 화면에서 수행하며 레벨·발견·보상·저장 규칙을 바꾸지 않는다.
	if openCount == 0 then
		local adventureLevel = 1
		for _, career in (view.careers or {}) do
			if career.id == "adventure" then adventureLevel = career.level break end
		end
		local eligiblePorts = {}
		for _, site in require(Shared:WaitForChild("Sites")).Sites do
			if site.minLevel <= adventureLevel and (not site.fromYear or (view.player and view.player.year or 1700) >= site.fromYear) then eligiblePorts[site.portId] = true end
		end
		local nearest = nil
		for _, route in (view.routes or {}) do
			if not route.locked and eligiblePorts[route.id] and (not nearest or route.distanceKm < nearest.distanceKm) then
				nearest = route
			end
		end
		if nearest then
			add(function() return mkLabel(content, string.format("현재 레벨로 탐험할 수 있는 가까운 항구: %s · 약 %d일 항해", nearest.name, nearest.days), 13, COLORS.blue, true) end)
			add(function() return mkButton(content, "항해 지도에서 탐험 항구 찾기", COLORS.blue, UDim2.new(1, -6, 0, 44), function() openTab("map") end) end)
		end
	end
	add(function()
		local tiles = {}
		for _, s in view.sites do
			table.insert(tiles, { icon = "explore", title = s.name,
				sub = if s.left == 0 then "모두 조사했어요" elseif not s.unlocked then s.locked or "연구 조건 필요" else string.format("발견 %d · %d일", s.left, s.days),
				-- [탐험 진입] 이용할 수 없는 버튼을 "지상맵 입장"으로 오인하지 않도록 실제 상태를 표시한다. 해금·발견 규칙은 그대로.
				btn = if s.left == 0 then "조사 완료" elseif not s.unlocked then "연구 조건" else "지상맵 입장",
				color = COLORS.green, enabled = s.unlocked and s.left > 0, onClick = function() H.startField(s) end })
		end
		-- [모바일 클릭 영역] 아이콘(86)·이름(26)·설명(20)·버튼(44)을 겹치지 않는 높이에 배치한다.
		-- 기존 156px에서는 설명과 입장 버튼이 최대 36px 겹쳐 실제 터치 대상이 불명확했다.
		return H.tileGrid(tiles, content, 176, 210)
	end)
	end
	-- 학자 방문·지식 보고·학회 발표는 서재(보고 탭)에서만 한다. 전투 본부의 탐험 탭은 여기서 끝난다.
	if not H.exploreScholarView then return end
	-- 연구 논문: 관찰 노트 -> 초안 -> 학회 발표 -> 출판 (플레이어도 학자처럼 단계별로 올라간다)
	if view.chron then
		local ch = view.chron
		add(function() return mkHeader(content, "연구 논문 · " .. ch.next) end)
		add(function()
			return H.tileGrid({
				{ icon = "cc0_book", title = "관찰 노트", sub = if ch.topDisc then string.format("%s %d/%d", ch.topDisc, ch.topN, ch.need) else string.format("0 / %d", ch.need), enabled = false },
				{ icon = "codex", title = "논문 초안", sub = string.format("보유 %d · %d코인", ch.drafts, ch.cost), btn = "쓰기", color = COLORS.blue, enabled = ch.canWrite, onClick = function() call("WriteDraft") end },
				{ icon = "tech", title = "학회 발표", sub = string.format("발표 %d회", ch.presented), enabled = false },
				{ icon = "cc0_chest", title = "출판", sub = string.format("출판 %d편", ch.papers), btn = "출판", color = COLORS.gold, enabled = ch.canPublish, onClick = function() call("PublishPaper") end },
			}, content, 176, 156)
		end)
		add(function() return mkLabel(content, "역사의 현장은 학문과 이어져요. 같은 학문의 노트 3개와 그 학문 지식으로 초안을 쓰고, 아래 학회에서 발표한 뒤 출판해요.", 14, COLORS.muted, false) end)
	end
	add(function() return mkHeader(content, "이 항구의 학자") end)
	if #view.scholars == 0 then
		add(function() return mkLabel(content, "지금 이 항구에는 학자가 없어요. 지식 카드 보고는 학자가 있는 항구의 서재에서만 받아 줘요.", 13, COLORS.muted, false) end)
		-- 어디로 가면 되는지 알려 준다: 올해 활동 중인 학자와 그 항구
		local where = {}
		for _, sc in require(Shared:WaitForChild("Scholars")).Scholars do
			local port = PortData.Ports[sc.portId]
			if port and view.player.year >= sc.fromYear and view.player.year <= sc.toYear and not (view.knowledge and view.knowledge.met and view.knowledge.met[sc.id]) then
				table.insert(where, string.format("%s — %s", port.name, sc.name))
			end
		end
		if #where > 0 then
			add(function() return mkLabel(content, "조언: 지금(" .. view.player.year .. "년) 만날 수 있는 학자\n" .. table.concat(where, "\n", 1, math.min(#where, 8)), 12, COLORS.gold, true) end)
		end
	end
	if #view.scholars > 0 then
		add(function()
			local tiles = {}
			for _, sc in view.scholars do
				local sub = if sc.status == "ready" then "만날 수 있어요" elseif sc.status == "met" then "지식을 전수받았어요" else sc.status
				local tile: any = { title = sc.name, sub = sub, icon = "codex" }
				-- 실존 학자의 퍼블릭 도메인 초상(자동 수집·등록된 것만)
				if SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. sc.id] then
					tile.portrait = { atlas = "scholar_" .. sc.id }
				end
				tile.btn, tile.color, tile.enabled = "방문", COLORS.gold, sc.status == "ready"
				tile.onClick = function() call("Visit", { scholarId = sc.id }) end
				local rep = sc.reportable or 0
				tile.btn2 = { text = if rep > 0 then string.format("보고 (%d)", rep) else "보고", color = COLORS.green, enabled = rep > 0,
					onClick = function() call("ReportKnowledge", { scholarId = sc.id }) end }
				table.insert(tiles, tile)
			end
			return H.tileGrid(tiles, content, 190, 150)
		end)
	end
				local ac = view.knowledge and view.knowledge.academy
				if ac and #ac.disciplines > 0 then
					add(function() return mkHeader(content, string.format("학술 행사 · 이 항구의 연구 성과 %d%%", ac.research)) end)
					add(function()
						return mkLabel(content, string.format("이 항구의 학문: %s. 항구에 투자할수록 학자들의 연구가 늘어 관련 교역품이 싸져요 (교역소 %d단계). 지금까지 발표 %d회 · 박람회 %d회.", table.concat(ac.disciplines, ", "), ac.harborLevel, ac.presented, ac.expos), 12, COLORS.muted, false)
					end)
					for _, pr in ac.present do
						add(function()
							local sub = string.format("이해한 지식 %d개 (%d개 이상 필요)%s", pr.understood, ac.presentMin, if pr.wait > 0 then string.format(" · %d일 뒤 가능", pr.wait) else "")
							return mkRow(content, "학회 발표 — " .. pr.name, sub, {
								{ text = "발표", color = COLORS.gold, onClick = function() call("Present", { disc = pr.disc }) end, enabled = pr.understood >= ac.presentMin and pr.wait == 0 },
							}, 56)
						end)
						if pr.jointScholar then
							add(function()
								local sub = string.format("%s 학자와 함께 · 기술 %d단계 (%d점%s) · 이해한 지식·교역품·퀘스트 기여 · 전문 분야·동료 연구 지원 +%d점%s", pr.jointScholar, pr.techLevel, pr.techPoints, if pr.techNext then "/" .. pr.techNext else " 최고", pr.researchHelp or 0, if pr.jointWait > 0 then string.format(" · %d일 뒤 가능", pr.jointWait) else "")
								return mkRow(content, "공동 발표 — " .. pr.name, sub, {
									{ text = "함께 발표", color = COLORS.gold, onClick = function() call("JointPresent", { disc = pr.disc }) end, enabled = pr.understood >= 1 and pr.jointWait == 0 },
								}, 64)
							end)
						end
					end
					for _, lr in ac.launch do
						add(function()
							local sub = string.format("개량 +%d%% · 싣고 있는 %d개 (%d개 필요)%s", lr.up, lr.have, lr.need, if not lr.open then " · 교역소 3단계 이상" elseif lr.wait > 0 then string.format(" · %d일 뒤 가능", lr.wait) else "")
							return mkRow(content, "신제품 출시 — " .. lr.name .. " ✦", sub, {
								{ text = "출시", color = COLORS.gold, onClick = function() call("Launch", { goodId = lr.goodId }) end, enabled = lr.open and lr.wait == 0 and lr.have >= lr.need },
							}, 56)
						end)
					end
					for _, b in ac.buildings do
						add(function()
							local sub = if b.built then b.summary .. " (건축 완료)" else string.format("%s · 건축비 %d코인%s", b.summary, b.cost, if b.can then "" else " · " .. tostring(b.why))
							return mkRow(content, "특수 건축물 — " .. b.name, sub, {
								{ text = if b.built then "완료" else "건축", color = COLORS.gold, onClick = function() call("BuildLandmark", { id = b.id }) end, enabled = b.can },
							}, 64)
						end)
					end
					add(function()
					local pv = ac.expoPreview
					local sub = if not ac.expoOpen then "교역소 2단계 이상에서 열려요" elseif ac.expoWait > 0 then string.format("%d일 뒤 열려요", ac.expoWait) else string.format("발견한 동물·식물·광물·화석·유물 중 가치 높은 %d점 + 개량 교역품(✦). 수상 %d회", ac.expoSlots, ac.medals)
					if pv and ac.expoOpen and ac.expoWait == 0 then
						sub ..= string.format("\n예상 점수 표본 %d · 박제 %d(-%d코인) · 생체 %d(-%d코인)", pv.specimen.score, pv.taxidermy.score, pv.taxidermy.fee, pv.live.score, pv.live.fee)
					end
					local can = ac.expoOpen and ac.expoWait == 0
					return mkRow(content, "박람회 출품", sub, {
						{ text = "표본", color = COLORS.green, onClick = function() call("Expo", { form = "specimen" }) end, enabled = can },
						{ text = "박제", color = COLORS.gold, onClick = function() call("Expo", { form = "taxidermy" }) end, enabled = can },
						{ text = "생체", color = COLORS.blue, onClick = function() call("Expo", { form = "live" }) end, enabled = can },
					}, 72)
					end)
				end
			end

local RARITY_COLOR = {
	Common = COLORS.muted, Uncommon = COLORS.green, Rare = COLORS.blue, Epic = Color3.fromRGB(170, 110, 210), Legendary = COLORS.gold,
}
local RARITY_NAMES = { Common = "일반", Uncommon = "고급", Rare = "희귀", Epic = "영웅", Legendary = "전설" }
local codexField = nil -- nil이면 분야 목록, 값이 있으면 그 분야의 카드 화면

local function fieldColor(f)
	return Color3.fromRGB(f.color[1], f.color[2], f.color[3])
end

local function findField(id)
	for _, f in view.codex.fields do
		if f.id == id then
			return f
		end
	end
	return nil
end

-- 카드 그림: 등록된 이미지가 표시될 때까지 분야 색과 이름을 보여준다.
local function paintCardArt(parent, card, fieldDef, fitImage)
	parent.ClipsDescendants = true
	local base = if card.found then fieldColor(fieldDef) else Color3.fromRGB(46, 52, 64)
	parent.BackgroundColor3 = base
	local shade = Instance.new("UIGradient")
	shade.Color = ColorSequence.new(base:Lerp(Color3.new(1, 1, 1), 0.25), base:Lerp(Color3.new(0, 0, 0), 0.45))
	shade.Rotation = 90
	shade.Parent = parent
	local mark = Instance.new("TextLabel")
	mark.BackgroundTransparency = 1
	mark.Size = UDim2.fromScale(1, 1)
	mark.Font = Enum.Font.GothamBold
	mark.TextScaled = true
	mark.TextTransparency = 0.35
	mark.TextColor3 = Color3.new(1, 1, 1)
	mark.Text = if card.found then fieldDef.name else "?"
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0.2, 0), UDim.new(0.2, 0)
	pad.Parent = mark
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0.08, 0), UDim.new(0.08, 0)
	mark.Parent = parent
	if card.found and type(card.image) == "string" and card.image ~= "" then
		local img = Instance.new("ImageLabel")
		img.Size = UDim2.fromScale(1, 1)
		img.BackgroundTransparency = 1
		img.ScaleType = if fitImage then Enum.ScaleType.Fit else Enum.ScaleType.Crop
		img.Image = card.image
		img.Parent = parent
		img:GetPropertyChangedSignal("IsLoaded"):Connect(function()
			mark.Visible = not img.IsLoaded
		end)
		mark.Visible = not img.IsLoaded
	end
end

function H.combatCardImage(unit)
	local artKey = if unit.special == "scorch" then "event_harbor_fire"
		elseif unit.special == "weather" then "event_storm" else "event_calm_seas"
	return "rbxassetid://" .. AssetIds["CardArt/" .. artKey]
end

function H.codexCardTile(grid, card, field, badge, tint, onClick)
	local tile = Instance.new("TextButton")
	tile.AutoButtonColor = false
	tile.Text = ""
	tile.BackgroundColor3 = COLORS.row
	tile.BorderSizePixel = 0
	corner(tile, 8)
	local stroke = Instance.new("UIStroke")
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	stroke.Thickness = 2
	stroke.Color = tint
	stroke.Parent = tile

	local art = Instance.new("Frame")
	art.Position = UDim2.fromOffset(5, 5)
	art.Size = UDim2.new(1, -10, 1, -46)
	corner(art, 5)
	art.Parent = tile
	paintCardArt(art, card, field)
	local name = mkLabel(tile, card.name, 13, if card.found then COLORS.text else COLORS.muted, true)
	name.AutomaticSize = Enum.AutomaticSize.None
	name.Position = UDim2.new(0, 5, 1, -40)
	name.Size = UDim2.new(1, -10, 0, 24)
	name.TextScaled = true
	name.TextXAlignment = Enum.TextXAlignment.Center
	name.TextYAlignment = Enum.TextYAlignment.Center
	local size = Instance.new("UITextSizeConstraint")
	size.MaxTextSize = 13
	size.Parent = name
	local rank = mkLabel(tile, badge, 11, tint, true)
	rank.AutomaticSize = Enum.AutomaticSize.None
	rank.Position = UDim2.new(0, 5, 1, -16)
	rank.Size = UDim2.new(1, -10, 0, 14)
	rank.TextXAlignment = Enum.TextXAlignment.Center
	tile.Activated:Connect(onClick)
	tile.Parent = grid
	return tile
end

function H.showCardDetail(card)
	local fieldDef = if card.combat and not card.field then { name = "접현 전투 카드", color = { 70, 92, 96 } } else findField(card.field)
	local article = if card.found then require(Shared:WaitForChild("KnowledgeCards")).Articles[card.id] else nil
	local tweens = game:GetService("TweenService")
	local paper, ink, brown = COLORS.paper, COLORS.ink, COLORS.brown
	local overlay = Instance.new("TextButton")
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = Color3.new(0, 0, 0)
	overlay.BackgroundTransparency = 1
	overlay.Text = ""
	overlay.AutoButtonColor = false
	overlay.ZIndex = 40
	local layer = overlayGui("Overlay", 60)
	overlay.Parent = layer
	overlay.Destroying:Connect(function() task.defer(function() layer:Destroy() end) end)

	local box = Instance.new("Frame")
	box.AnchorPoint = Vector2.new(0.5, 0.5)
	box.Position = UDim2.fromScale(0.5, 0.5)
	box.Size = UDim2.fromScale(0.18, 0.94)
	box.BackgroundColor3 = brown
	box.BorderSizePixel = 0
	box.ClipsDescendants = true
	box.ZIndex = 41
	local bounds = Instance.new("UISizeConstraint")
	bounds.MaxSize = Vector2.new(920, 960)
	bounds.Parent = box
	corner(box, 8)
	box.Parent = overlay

	local body = Instance.new("ScrollingFrame")
	body.Position = UDim2.fromOffset(8, 8)
	body.Size = UDim2.new(1, -16, 1, -62)
	body.BackgroundColor3 = paper
	body.BorderSizePixel = 0
	body.CanvasSize = UDim2.new()
	body.AutomaticCanvasSize = Enum.AutomaticSize.Y
	body.ScrollingDirection = Enum.ScrollingDirection.Y
	body.ScrollBarThickness = 4
	body.ScrollBarImageColor3 = brown
	body.ZIndex = 42
	body.Parent = box
	local margin = Instance.new("UIPadding")
	margin.PaddingTop = UDim.new(0, 14)
	margin.PaddingBottom = UDim.new(0, 14)
	margin.PaddingLeft = UDim.new(0, 14)
	margin.PaddingRight = UDim.new(0, 10)
	margin.Parent = body
	local lay = Instance.new("UIListLayout")
	lay.Padding = UDim.new(0, 7)
	lay.SortOrder = Enum.SortOrder.LayoutOrder
	lay.Parent = body

	local rarity = RARITY_NAMES[card.rarity] or card.rarity
	local function encHeading(text, order)
		local h = mkLabel(body, text, 18, ink, true, order)
		local rule = Instance.new("Frame")
		rule.Size = UDim2.new(1, 0, 0, 2)
		rule.Position = UDim2.new(0, 0, 1, 0)
		rule.BackgroundColor3 = brown
		rule.BorderSizePixel = 0
		rule.Parent = h
		return h
	end
	mkLabel(body, fieldDef.name .. "  ·  " .. rarity, 14, brown, true, 0)
	encHeading(card.name, 1).TextSize = 28
	local art = Instance.new("Frame")
	art.LayoutOrder = 2
	local camera = workspace.CurrentCamera
	local viewportHeight = if camera then camera.ViewportSize.Y else 600
	art.Size = UDim2.new(1, -8, 0, math.clamp(math.floor(viewportHeight * 0.43), 140, 410))
	local artBorder = Instance.new("UIStroke")
	artBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	artBorder.Color = brown
	artBorder.Parent = art
	corner(art, 5)
	art.Parent = body
	paintCardArt(art, card, fieldDef, true)

	-- 강화 2단계부터 삽화가 움직인다 (천천히 확대·이동 + 반짝임)
	local maxLevel = (view and view.codex and view.codex.maxLevel) or 3
	-- 모든 발견한 카드(지식·전투 동일)의 삽화가 항상 움직인다. 강화 단계는 움직임 해금과 무관하다.
	local animated = card.found == true or card.combat == true
	local artImg = art:FindFirstChildOfClass("ImageLabel")
	if animated and artImg then
		artImg.AnchorPoint = Vector2.new(0.5, 0.5)
		artImg.Position = UDim2.fromScale(0.5, 0.5)
		local loop = TweenInfo.new(9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
		tweens:Create(artImg, loop, { Size = UDim2.fromScale(1.18, 1.18), Position = UDim2.fromScale(0.46, 0.52) }):Play()
		local glow = Instance.new("Frame")
		glow.Size = UDim2.fromScale(0.35, 1.6)
		glow.Position = UDim2.fromScale(-0.4, -0.3)
		glow.Rotation = 20
		glow.BackgroundColor3 = Color3.new(1, 1, 1)
		glow.BackgroundTransparency = 0.88
		glow.BorderSizePixel = 0
		glow.ZIndex = artImg.ZIndex + 1
		glow.Parent = art
		tweens:Create(glow, TweenInfo.new(5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, false, 2), { Position = UDim2.fromScale(1.1, -0.3) }):Play()
	end

	do
		local cap = Instance.new("TextLabel")
		cap.Size = UDim2.new(1, 0, 0, 24)
		cap.Position = UDim2.new(0, 0, 1, -24)
		cap.BackgroundColor3 = Color3.new(0, 0, 0)
		cap.BackgroundTransparency = 0.45
		cap.Text = "  그림  " .. card.name
		cap.TextXAlignment = Enum.TextXAlignment.Left
		cap.Font = Enum.Font.GothamBold
		cap.TextSize = 14
		cap.TextColor3 = Color3.new(1, 1, 1)
		cap.ZIndex = 60
		cap.Parent = art
	end
	if card.found and not card.combat then
		-- 백과 정보 상자: 한눈에 보는 요약 칸 (분야·등급·발견·보상)
		local box2 = Instance.new("Frame")
		box2.LayoutOrder = 3
		box2.Size = UDim2.new(1, -8, 0, 0)
		box2.AutomaticSize = Enum.AutomaticSize.Y
		box2.BackgroundColor3 = Color3.fromRGB(236, 220, 186)
		box2.BorderSizePixel = 0
		corner(box2, 6)
		local bs = Instance.new("UIStroke")
		bs.Color = brown
		bs.Thickness = 1.5
		bs.Parent = box2
		local g2 = Instance.new("UIGridLayout")
		g2.CellSize = UDim2.new(0.5, -6, 0, 46)
		g2.CellPadding = UDim2.fromOffset(4, 4)
		g2.Parent = box2
		local pad2 = Instance.new("UIPadding")
		pad2.PaddingTop, pad2.PaddingBottom, pad2.PaddingLeft, pad2.PaddingRight = UDim.new(0, 6), UDim.new(0, 6), UDim.new(0, 8), UDim.new(0, 4)
		pad2.Parent = box2
		for _, kv in { { "분야", fieldDef.name }, { "등급", tostring(rarity) }, { "발견", tostring(card.source) }, { "등록 보상", string.format("%d코인 · 명성 +%d", card.coins, card.fame) } } do
			local cell = Instance.new("Frame")
			cell.BackgroundTransparency = 1
			cell.Parent = box2
			local k = mkLabel(cell, kv[1], 13, brown, false)
			k.AutomaticSize = Enum.AutomaticSize.None
			k.Size = UDim2.new(1, 0, 0, 16)
			local v = mkLabel(cell, kv[2], 15, ink, true)
			v.AutomaticSize = Enum.AutomaticSize.None
			v.Position = UDim2.fromOffset(0, 18)
			v.Size = UDim2.new(1, 0, 0, 24)
			v.TextTruncate = Enum.TextTruncate.AtEnd
		end
		box2.Parent = body
	end
	mkLabel(body, card.description, 17, ink, false, 3)
	if card.kindName then
		mkLabel(body, "상위 분야: " .. (card.worldGroup or "세계 지식") .. " · 카드 종류: " .. card.kindName .. (if card.subkind then " / " .. card.subkind else "") .. " · 주학문: " .. (card.discipline or "기타") .. " · " .. (card.domain or "기타"), 13, brown, false, 4)
		if card.relatedDisciplines and #card.relatedDisciplines > 0 then
			mkLabel(body, "연관 학문: " .. table.concat(card.relatedDisciplines, " · "), 13, brown, false, 4)
		end
	end
	if card.found and card.entityType then
		mkLabel(body, "백과 개체: " .. card.entityType, 13, brown, false, 4)
		-- [세계 백과 14영역] 소재·연구 학문과 독립된 주제 및 근거 분류.
		if card.topic then mkLabel(body, "백과 주제: " .. card.topic, 13, brown, false, 4) end
		if card.evidence then mkLabel(body, "지식 구분: " .. card.evidence .. " (사료의 개별 검증 여부와 별개)", 13, brown, false, 4) end
		if card.era or card.region then
			mkLabel(body, "시대·지역: " .. (card.era or "시대 미상") .. " · " .. (card.region or "지역 미상"), 13, brown, false, 4)
		end
		if card.prerequisites and #card.prerequisites > 0 then
			local names = {}
			for _, needId in card.prerequisites do
				local name = "미발견 지식"
				for _, known in view.codex.cards do
					if known.id == needId then
						if known.found then name = known.name end
						break
					end
				end
				table.insert(names, name)
			end
			mkLabel(body, "연구 선행 지식: " .. table.concat(names, " · "), 13, brown, false, 4)
		end
		if card.tags and #card.tags > 0 then
			mkLabel(body, "분류 태그: " .. table.concat(card.tags, " · "), 13, brown, false, 4)
		end
		if card.aliases and #card.aliases > 0 then
			mkLabel(body, "다른 이름: " .. table.concat(card.aliases, " · "), 13, brown, false, 4)
		end
		if card.wikidata then
			mkLabel(body, "외부 개체 식별자: 위키데이터 " .. card.wikidata .. " (구조화 자료)", 12, brown, false, 4)
		end
		if card.relations and #card.relations > 0 then
			mkLabel(body, "연결된 세계 지식", 15, ink, true, 4)
			for _, rel in card.relations do
				if rel.cardId and rel.found then
					local link = mkButton(body, rel.relation .. " · " .. rel.name, COLORS.blue, UDim2.new(1, -8, 0, 36), function()
						for _, target in view.codex.cards do
							if target.id == rel.cardId then
								overlay:Destroy()
								H.showCardDetail(target)
								break
							end
						end
					end, true)
					link.LayoutOrder = 4
				else
					mkLabel(body, "· " .. rel.relation .. ": " .. rel.name, 13, brown, false, 4)
				end
			end
		end
	end
	if card.method then
		local text = if card.method == "discover" then "발견" elseif card.method == "research" then "연구" else "탐험"
		mkLabel(body, "습득 경로: " .. text .. " · 등급별 조사: " .. (card.rarityGuide or "일반 조사"), 13, brown, false, 4)
	end
	if card.path then
		mkLabel(body, "획득 과정: " .. card.path .. " · " .. tostring(card.source) .. (if card.studyLocked then "\n현재 조건: " .. card.studyLocked else ""), 13, brown, false, 4)
	end
	-- [문헌 연구] 학자 보고가 끝난 장소별 연구 카드만 직접 학습할 수 있다.
	if card.studyReady and not card.found then
		local study = mkButton(body, "문헌 해독·비교 연구 시작", COLORS.blue, UDim2.new(1, -8, 0, 38), function()
			local res = call("StudyKnowledgeCard", { cardId = card.id })
			if res and res.ok and view and view.codex then
				for _, updated in view.codex.cards do
					if updated.id == card.id then
						overlay:Destroy()
						H.showCardDetail(updated)
						break
					end
				end
			end
		end, true)
		study.LayoutOrder = 4
	end
	if card.found and not card.combat and card.level ~= nil then
		local lv = card.level
		local text = string.format("강화 %d / %d단계", lv, maxLevel)
		if animated then
			text ..= "  ·  움직이는 삽화 감상 중"
		end
		if not card.upCost then
			mkLabel(body, text, 13, brown, true, 4)
		else
			local up = mkButton(body, string.format("카드 강화 (%d코인)  ·  %s", card.upCost, text), COLORS.blue, UDim2.new(1, -8, 0, 38), function()
				local res = call("UpgradeCodexCard", { id = card.id })
				if res and res.ok and view and view.codex then
					for _, c in view.codex.cards do
						if c.id == card.id then
							overlay:Destroy()
							H.showCardDetail(c)
							break
						end
					end
				end
			end, true)
			up.LayoutOrder = 4
		end
	end
	if card.combat then
		encHeading("전투에서 하는 일", 5)
		mkLabel(body, card.combat.effect, 15, ink, false, 6)
		if card.combat.origin then
			mkLabel(body, "연결된 카드  " .. card.combat.origin, 13, brown, false, 7)
		end
	elseif card.found then
		if article then
			encHeading("특징과 원리", 5)
			mkLabel(body, article.details, 15, ink, false, 6)
			encHeading("쓰임과 배경", 7)
			mkLabel(body, article.context, 15, ink, false, 8)
			if article.history then
				encHeading("역사 속 이야기", 9)
				mkLabel(body, article.history, 15, ink, false, 10)
			end
		end
		if article then
			local topic = article.topic:gsub("_", " "):gsub("%%27", "'")
			mkLabel(body, "본문 참고  위키백과 · " .. topic, 12, brown, false, 11)
		end
		if card.credit then
			mkLabel(body, "삽화 출처  " .. card.credit, 11, brown, false, 12)
		end
	else
		mkLabel(body, "발견하면 이 항목의 삽화와 해설을 읽을 수 있어요.", 13, brown, false, 5)
	end

	local replayScene = require(Shared:WaitForChild("WonderScenes")).Scenes[card.id]
	if not card.combat and card.found and replayScene then
		local replay = mkButton(body, "원더 연출 다시 보기", COLORS.blue, UDim2.new(1, -8, 0, 40), function()
			overlay:Destroy()
			H.playWonderScene(card.id)
		end, true)
		replay.LayoutOrder = 13
	end
	for _, child in body:GetDescendants() do
		if child:IsA("GuiObject") then
			child.ZIndex = 43
		end
	end
	local close = mkButton(box, "책 덮기", COLORS.gold, UDim2.new(1, -16, 0, 42), function()
		overlay:Destroy()
	end, true)
	close.AnchorPoint = Vector2.new(0.5, 1)
	close.Position = UDim2.new(0.5, 0, 1, -7)
	close.ZIndex = 43
	overlay.Activated:Connect(function()
		overlay:Destroy()
	end)

	-- 책등 폭에서 펼쳐지며 종이 위로 접힌 면의 그림자가 스쳐 간다.
	local fold = Instance.new("Frame")
	fold.Size = UDim2.fromScale(1, 1)
	fold.BackgroundColor3 = brown
	fold.BorderSizePixel = 0
	fold.ZIndex = 44
	fold.Parent = box
	local foldGradient = Instance.new("UIGradient")
	foldGradient.Transparency = NumberSequence.new(0.16, 1)
	foldGradient.Parent = fold
	tweens:Create(overlay, TweenInfo.new(0.22), { BackgroundTransparency = 0.44 }):Play()
	tweens:Create(box, TweenInfo.new(0.32, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), { Size = UDim2.fromScale(0.97, 0.95) }):Play()
	local reveal = tweens:Create(fold, TweenInfo.new(0.36, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = UDim2.fromScale(1, 0), BackgroundTransparency = 1,
	})
	reveal.Completed:Once(function() fold:Destroy() end)
	reveal:Play()
end

function H.showCombatCard(unit, origin, skill)
	local BC = require(Shared:WaitForChild("BoardingCards"))
	local effects = {
		bond = "같은 이름의 결속 카드가 같은 줄에 모이면 위력이 커져요.",
		morale = "같은 줄의 다른 아군 카드에 위력 1을 더해요.",
		spy = "적군 줄에 배치하고 내 손패에 카드 두 장을 뽑아요.",
		medic = "버린 일반 카드 가운데 위력이 가장 높은 카드를 되살려요.",
		armor = "날씨(안개·폭풍·혼전)에 점수가 줄지 않아요.",
		snipe = "낼 때 점수 10 이상인 적 줄에서 가장 센 일반 카드를 쓰러뜨려요.",
	}
	local effect = unit.text or effects[unit.ability] or "지정된 병종 줄에 배치해 전투력을 더해요."
	if unit.hero then
		effect ..= "\n영웅은 날씨와 소각의 영향을 받지 않아요."
	end
	if skill then
		effect ..= "\n" .. skill.name .. " · " .. skill.text
	end
	-- 지식 카드 = 전투 카드: 도감의 그림·설명·분야를 그대로 쓴다
	local kc = nil
	if unit.knowledge and view and view.codex then
		for _, c in view.codex.cards do
			if c.id == unit.id then kc = c break end
		end
	end
	H.showCardDetail({
		id = unit.id,
		name = unit.name,
		found = true,
		field = if kc then kc.field else nil,
		rarity = if kc then kc.rarity elseif unit.special then "특수" elseif unit.hero then "영웅" else "병종",
		description = if kc then kc.description .. (if unit.special then "" else string.format("\n%s 줄  ·  기본 전투력 %d", BC.ROW_NAME[unit.row], unit.power))
			elseif unit.special then "접현전에서 즉시 효과를 내는 카드예요."
			else string.format("%s 줄  ·  기본 전투력 %d", BC.ROW_NAME[unit.row], unit.power),
		image = if kc and kc.image then kc.image else H.combatCardImage(unit),
		combat = { effect = effect, origin = origin },
	})
end

-- ───── 지식 카드를 새로 얻을 때의 연출: 카드가 튀어나와 뒤집히고 희귀도 빛이 퍼진다 ─────
local GAIN_COLOR = {
	Common = Color3.fromRGB(190, 170, 130), Uncommon = Color3.fromRGB(110, 190, 120), Rare = Color3.fromRGB(90, 150, 230),
	Epic = Color3.fromRGB(180, 110, 230), Legendary = Color3.fromRGB(245, 200, 80),
}
local GAIN_RARITY = { Common = "흔함", Uncommon = "보통", Rare = "희귀", Epic = "영웅급", Legendary = "전설" }
H.gainQueue = {}
H.gainBusy = false

function H.showCardGain(card, moreCount)
	local BC = require(Shared:WaitForChild("BoardingCards"))
	local tw = game:GetService("TweenService")
	local tint = GAIN_COLOR[card.rarity] or GAIN_COLOR.Common
	-- 효과음: 흔한 카드는 동전 소리, 희귀 이상은 종소리, 전설은 팡파르 (등록된 기존 효과음만 쓴다)
	Sfx.play(if card.rarity == "Legendary" then "sfx_fanfare" elseif card.rarity == "Epic" or card.rarity == "Rare" then "sfx_bell" else "sfx_coin", 0.7, 1, "sfx_click")
	local g = overlayGui("CardGain", 95)
	local dim = Instance.new("TextButton")
	dim.Size = UDim2.fromScale(1, 1)
	dim.BackgroundColor3 = Color3.new(0, 0, 0)
	dim.BackgroundTransparency = 1
	dim.Text = ""
	dim.AutoButtonColor = false
	dim.Parent = g
	tw:Create(dim, TweenInfo.new(0.25), { BackgroundTransparency = 0.35 }):Play()

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.AnchorPoint = Vector2.new(0.5, 0)
	title.Position = UDim2.fromScale(0.5, 0.06)
	title.Size = UDim2.fromOffset(320, 30)
	title.Font = Enum.Font.Antique
	title.TextSize = 24
	title.TextColor3 = tint
	title.Text = "새 지식 카드 발견!"
	title.TextTransparency = 1
	title.Parent = dim
	tw:Create(title, TweenInfo.new(0.4), { TextTransparency = 0 }):Play()

	local stage = Instance.new("Frame")
	stage.AnchorPoint = Vector2.new(0.5, 0.5)
	stage.Position = UDim2.fromScale(0.5, 0.52)
	stage.Size = UDim2.fromOffset(260, 360)
	stage.BackgroundTransparency = 1
	stage.Parent = dim

	-- 뒤에서 퍼지는 빛줄기
	for i = 1, 8 do
		local ray = Instance.new("Frame")
		ray.AnchorPoint = Vector2.new(0.5, 0.5)
		ray.Position = UDim2.fromScale(0.5, 0.5)
		ray.Size = UDim2.fromOffset(6, 20)
		ray.Rotation = i * 45
		ray.BackgroundColor3 = tint
		ray.BackgroundTransparency = 0.3
		ray.BorderSizePixel = 0
		ray.ZIndex = 1
		ray.Parent = stage
		local grow = tw:Create(ray, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(6, 330), BackgroundTransparency = 1 })
		grow:Play()
	end

	-- 카드 본체 (작게 시작해 튀어나오며 뒤집힌다)
	local face = Instance.new("Frame")
	face.AnchorPoint = Vector2.new(0.5, 0.5)
	face.Position = UDim2.fromScale(0.5, 0.5)
	face.Size = UDim2.fromOffset(0, 0)
	face.BackgroundColor3 = Color3.fromRGB(226, 205, 165)
	face.BorderSizePixel = 0
	face.ClipsDescendants = true
	face.ZIndex = 5
	face.Parent = stage
	corner(face, 12)
	local stroke = Instance.new("UIStroke")
	stroke.Color = tint
	stroke.Thickness = 2
	stroke.Parent = face
	local art = Instance.new("Frame")
	art.Position = UDim2.fromOffset(10, 10)
	art.Size = UDim2.new(1, -20, 0, 160)
	art.ZIndex = 6
	art.Parent = face
	corner(art, 8)
	local fieldDef = findField(card.field) or { name = "?", color = { 90, 90, 100 } }
	paintCardArt(art, card, fieldDef, false)
	for _, d in art:GetDescendants() do
		if d:IsA("GuiObject") then d.ZIndex = 7 end
	end
	local function line(text, y, size, color, font)
		local l = Instance.new("TextLabel")
		l.BackgroundTransparency = 1
		l.Position = UDim2.fromOffset(12, y)
		l.Size = UDim2.new(1, -24, 0, size + 6)
		l.Font = font or Enum.Font.Gotham
		l.TextSize = size
		l.TextColor3 = color
		l.TextWrapped = true
		l.TextXAlignment = Enum.TextXAlignment.Center
		l.TextYAlignment = Enum.TextYAlignment.Top
		l.Text = text
		l.ZIndex = 8
		l.Parent = face
		return l
	end
	local ink = Color3.fromRGB(50, 36, 24)
	line(card.name, 178, 20, ink, Enum.Font.Antique)
	line(string.format("%s · %s", fieldDef.name, GAIN_RARITY[card.rarity] or card.rarity), 206, 13, Color3.fromRGB(110, 80, 50))
	local d = BC.Units[card.id] or BC.Specials[card.id]
	local battle = if d == nil then "" elseif d.special then "전투: 즉시 효과 카드" else string.format("전투: %s 줄 · 위력 %d%s", BC.ROW_NAME[d.row], d.power, if d.hero then " · 영웅" else "")
	line(battle, 228, 13, Color3.fromRGB(70, 90, 70), Enum.Font.GothamBold)
	local desc = line(card.description or "", 250, 12, ink)
	desc.Size = UDim2.new(1, -24, 0, 70)

	-- 튀어나오기 → 가로로 뒤집히는 느낌(폭을 줄였다 키움) → 안착
	local pop = tw:Create(face, TweenInfo.new(0.45, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(220, 330), Rotation = 0 })
	face.Rotation = -12
	pop:Play()
	task.delay(0.45, function()
		if not face.Parent then return end
		tw:Create(face, TweenInfo.new(0.16), { Size = UDim2.fromOffset(20, 330) }):Play()
		task.delay(0.16, function()
			if not face.Parent then return end
			tw:Create(face, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(240, 340) }):Play()
			tw:Create(stroke, TweenInfo.new(0.9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { Thickness = if card.rarity == "Legendary" or card.rarity == "Epic" then 6 else 4 }):Play()
		end)
	end)
	-- 반짝이 조각이 위로 날아오른다
	for i = 1, 14 do
		task.delay(0.5 + i * 0.05, function()
			if not stage.Parent then return end
			local sp = Instance.new("TextLabel")
			sp.BackgroundTransparency = 1
			sp.Size = UDim2.fromOffset(20, 20)
			sp.AnchorPoint = Vector2.new(0.5, 0.5)
			sp.Position = UDim2.fromScale(0.15 + (i * 0.37 % 0.7), 0.65)
			sp.Font = Enum.Font.GothamBold
			sp.TextSize = 16 + (i % 3) * 4
			sp.TextColor3 = tint
			sp.Text = "✦"
			sp.ZIndex = 9
			sp.Parent = stage
			local up = tw:Create(sp, TweenInfo.new(1.1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = UDim2.fromScale(sp.Position.X.Scale + 0.1 * ((i % 2) * 2 - 1), 0.1), TextTransparency = 1 })
			up:Play()
			up.Completed:Once(function() sp:Destroy() end)
		end)
	end

	local hint = Instance.new("TextLabel")
	hint.BackgroundTransparency = 1
	hint.AnchorPoint = Vector2.new(0.5, 1)
	hint.Position = UDim2.fromScale(0.5, 0.96)
	hint.Size = UDim2.fromOffset(320, 22)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 13
	hint.TextColor3 = Color3.fromRGB(230, 220, 190)
	hint.Text = if moreCount and moreCount > 0 then string.format("화면을 누르면 다음 카드 (외 %d장)", moreCount) else "화면을 누르면 닫혀요 · 이 카드는 카드 배틀 덱에 쓸 수 있어요"
	hint.Parent = dim

	local closed = false
	local function close()
		if closed then return end
		closed = true
		g:Destroy()
		H.gainBusy = false
		local nextCard = table.remove(H.gainQueue, 1)
		if nextCard then
			H.gainBusy = true
			H.showCardGain(nextCard, #H.gainQueue)
		end
	end
	dim.Activated:Connect(close)
	task.delay(4.5, close)
end

-- 개발 확인용: workspace 속성 DevSail 에 항구 id 를 넣으면 그 항구로 출항 연출을 보여 준다
workspace:GetAttributeChangedSignal("DevSail"):Connect(function()
	local id = workspace:GetAttribute("DevSail")
	if type(id) == "string" and id ~= "" and view then
		task.spawn(function()
			if H.titleMenuOpen then
				H.titleMenuOpen = false
				local tg = player:WaitForChild("PlayerGui"):FindFirstChild("TitleGui")
				if tg then tg:Destroy() end
				titleGui.Enabled = false
				menuToggle.Visible = false
			end
			sail(id)
		end)
	end
end)

-- 퀘스트 이야기: 새 의뢰가 일지에 적히거나 끝났을 때, 그 이야기를 대화창 이벤트 씬으로 들려준다 (여러 개면 차례로).
do
	local playing = false
	local pending = {}
	local function sentences(text)
		local lines, cur = {}, ""
		for part in string.gmatch(text, "[^\n]+") do
			for sent in string.gmatch(part, "[^%.!?]+[%.!?]?%s*") do
				cur ..= sent
				if utf8.len(cur) and utf8.len(cur) > 46 then
					table.insert(lines, (cur:gsub("%s+$", "")))
					cur = ""
				end
			end
			if cur ~= "" then
				table.insert(lines, (cur:gsub("%s+$", "")))
				cur = ""
			end
		end
		if #lines == 0 then lines = { text } end
		return lines
	end
	function H.playQuestScenes(list, awaitFinished)
		for _, sc in list or {} do
			table.insert(pending, sc)
		end
		if not playing and #pending > 0 then
			playing = true
			H.questScenesPlaying = true
			task.spawn(function()
				while #pending > 0 do
					-- 출항 전 사건은 완료하고, 바다·전투 중 사건은 뒤로 미룬다.
					while inField or (sceneHold and not departureEventPhase) or workspace:GetAttribute("VoyageActive")
						or H.sceneBusy or player.PlayerGui:FindFirstChild("StoryScene", true)
						or player.PlayerGui:FindFirstChild("WonderScene", true) do
						task.wait(0.2)
					end
					local sc = table.remove(pending, 1)
					local isStart = sc.kind == "start"
					local isChron = sc.kind == "chronicle"
					local ok, err = pcall(playStory, {
						id = "quest_" .. tostring(sc.name), title = tostring(sc.name),
						chapter = if isChron then string.format("%d년 · 역사의 현장", sc.year or 0) elseif isStart then "새 이야기" else "이야기의 끝",
						npc = if isChron then tostring(sc.npc or "학자") elseif isStart then "의뢰인" else "일지", art = if isChron then tostring(sc.art or "library") else "tavern",
						lines = if isChron then sc.lines else sentences(tostring(sc.text or "")),
						choices = { { text = if isChron then "기록을 마친다" elseif isStart then "알겠다, 맡아 보자" else "마음에 새긴다", index = 1 } },
						submit = function()
							return { ok = true, message = if isChron then (tostring(sc.summary or "") .. "\n(서재에서 관찰 노트로 논문을 쓸 수 있어요)") elseif isStart then (tostring(sc.summary or "") .. "\n(저널에서 진행 상황을 볼 수 있어요)") else "이야기를 일지에 적었다. (저널에서 다시 읽을 수 있어요)" }
						end,
					})
					if not ok then warn("[Game] 이야기 재생 오류:", err) end
					if ok then
						task.wait(0.6)
						while player:WaitForChild("PlayerGui"):FindFirstChild("StoryScene", true) do
							task.wait(0.4)
						end
					end
				end
				playing = false
				H.questScenesPlaying = false
			end)
		end
		if awaitFinished then
			while playing do task.wait(0.1) end
		end
	end
end

-- 개발 확인용: workspace 속성 DevStory 에 이벤트 id 를 넣으면 그 이야기 장면을 바로 보여 준다(선택해도 저장되지 않는 미리보기)
workspace:GetAttributeChangedSignal("DevStory"):Connect(function()
	local id = workspace:GetAttribute("DevStory")
	if type(id) == "string" and id ~= "" and view then
		task.spawn(function()
			local ev = require(Shared:WaitForChild("Story")).ById[id]
			if ev then
				pcall(playStory, ev)
			end
		end)
	end
end)

-- 개발 확인용: workspace 속성 DevTradeHall 를 켜면 교역소 화면을 연다
workspace:GetAttributeChangedSignal("DevTradeHall"):Connect(function()
	if workspace:GetAttribute("DevTradeHall") and view then
		openTradeHall()
	end
end)

-- 개발 확인용: workspace 속성 DevCardGain 에 카드 id 를 넣으면 그 카드의 습득 연출을 보여 준다
workspace:GetAttributeChangedSignal("DevCardGain"):Connect(function()
	local id = workspace:GetAttribute("DevCardGain")
	if type(id) ~= "string" or id == "" or not (view and view.codex) then return end
	for _, c in view.codex.cards do
		if c.id == id then
			H.showCardGain(if c.found then c else { id = c.id, name = c.name ~= "???" and c.name or id, field = c.field, rarity = c.rarity, description = c.description, found = true }, 0)
			break
		end
	end
end)

-- 도감에 새로 들어온 카드를 찾아 연출을 띄운다 (처음 한 번은 기록만 하고 띄우지 않는다)
function H.checkNewCards()
	local cards = view and view.codex and view.codex.cards
	if not cards then return end
	local first = H.seenCards == nil
	H.seenCards = H.seenCards or {}
	for _, c in cards do
		if c.found and not H.seenCards[c.id] then
			H.seenCards[c.id] = true
			if not first then
				if H.gainBusy then
					table.insert(H.gainQueue, c)
				else
					H.gainBusy = true
					H.showCardGain(c, 0)
				end
			end
		end
	end
end

local function tierRows(list: { any }, scope: string, labelFmt: string)
	for _, t in list do
		add(function()
			local sub = string.format("%d개 이상 · +%d코인 · 명성 +%d", t.need, t.coins, t.fame)
			if t.title then
				sub ..= " · 칭호 '" .. t.title .. "'"
			end
			return mkRow(content, string.format(labelFmt, t.pct), sub, {
				{
					text = if t.claimed then "받음" else "받기",
					color = if t.claimed then COLORS.grey else COLORS.gold,
					enabled = t.claimable,
					onClick = function() call("ClaimCollection", { scope = scope, tier = t.tier }) end,
				},
			}, 52)
		end)
	end
end

local function renderCodexOverview()
	local cx = view.codex
	add(function()
		local cover = Instance.new("Frame")
		cover.Size = UDim2.new(1, -6, 0, 126)
		cover.BackgroundColor3 = COLORS.paper
		cover.BorderSizePixel = 0
		cover.ClipsDescendants = true
		corner(cover, 8)
		local illustration = Instance.new("ImageLabel")
		illustration.BackgroundTransparency = 1
		illustration.Size = UDim2.fromScale(0.35, 1)
		illustration.Image = "rbxassetid://" .. AssetIds["CardArt/event_calm_seas"]
		illustration.ScaleType = Enum.ScaleType.Crop
		illustration.Parent = cover
		pageRule(cover, UDim2.fromScale(0.35, 0), UDim2.new(0, 2, 1, 0))
		local title = mkLabel(cover, "세계 백과", 23, COLORS.ink, true)
		title.Position = UDim2.new(0.35, 13, 0, 13)
		title.Size = UDim2.new(0.65, -22, 0, 30)
		title.AutomaticSize = Enum.AutomaticSize.None
		local status = mkLabel(cover, string.format("발견 %d / %d", cx.found, cx.total), 15, COLORS.brown, true)
		status.Position = UDim2.new(0.35, 13, 0, 51)
		status.Size = UDim2.new(0.65, -22, 0, 22)
		status.AutomaticSize = Enum.AutomaticSize.None
		local track = pageRule(cover, UDim2.new(0.35, 13, 0, 81), UDim2.new(0.65, -26, 0, 4))
		local fill = pageRule(track, UDim2.fromOffset(0, 0), UDim2.fromScale(math.clamp(cx.found / math.max(1, cx.total), 0, 1), 1))
		fill.BackgroundColor3 = COLORS.brown
		fill.BackgroundTransparency = 0
		if cx.rank then
			local rank = mkLabel(cover, cx.rank, 12, COLORS.ink, false)
			rank.Position = UDim2.new(0.35, 13, 0, 93)
			rank.Size = UDim2.new(0.65, -22, 0, 22)
			rank.AutomaticSize = Enum.AutomaticSize.None
		end
		return cover
	end)

	add(function()
		local row = mkRow(content, "접현 전투 카드", "병종·영웅·특수 카드의 위력과 효과", {
			{ text = "열기", color = COLORS.blue, onClick = function() codexField = "boarding"; render() end },
		}, 60)
		withIcon(row, "Menu", "battle", nil, 44)
		return row
	end)
	-- [지구·인류 오브젝트] 기존 7개 세계 영역·42종 소재와 독립된 백과 14대 주제를 제공한다.
	add(function() return mkHeader(content, "지구·인류 전체 오브젝트") end)
	add(function()
		return mkRow(content, "백과 통합 검색", "카드 이름·별칭·소재 태그·학문을 한곳에서 찾기", {
			{ text = "검색", color = COLORS.blue, onClick = function() codexField = "search"; render() end },
		}, 54)
	end)
	-- [모바일 백과] 한 번 탭해 14대 주제를 연다. 기존 7대 세계 분류·학문/소재 탐색은 유지.
	add(function()
		return mkRow(content, "세계 백과 · 14대 주제", "인물·국가·역사·경제부터 우주·수학까지", {
			{ text = "주제별 보기", color = COLORS.blue, onClick = function() codexField = "o:all"; render() end },
		}, 54)
	end)
	add(function()
		return mkRow(content, "사실·가설·전설·창작", "발견한 지식의 근거 분류별 보기", {
			{ text = "근거별 보기", color = COLORS.blue, onClick = function() codexField = "e:all"; render() end },
		}, 54)
	end)
	for _, group in cx.worldGroups or {} do
		add(function()
			return mkRow(content, group.name .. " · " .. tostring(cx.worldCounts[group.id] or 0) .. "장", "지형·생명·원자재·건축·기술·학문·인류의 기록", {
				{ text = "보기", color = COLORS.blue, onClick = function() codexField = "w:" .. group.id; render() end },
			}, 52)
		end)
	end
	add(function()
		return mkRow(content, "세계 교역·자원 목록 · " .. tostring(#(cx.resources or {})) .. "종", "광석·금속·목재·식량·섬유·연료·가공품까지 기존 상품 원본 연결", {
			{ text = "보기", color = COLORS.blue, onClick = function() codexField = "r:all"; render() end },
		}, 58)
	end)
	-- [새 분류] 습득 방식은 카드 종류·희귀도·학문과 독립된다. 기존 학문 화면도 그대로 유지한다.
	add(function() return mkHeader(content, "습득 방식 · 3가지") end)
	for _, row in { { id = "discover", name = "발견", hint = "항구 방문·항해 중 관찰·단순 사건" },
		{ id = "research", name = "연구", hint = "선행 지식·학자·동료·연속 퀘스트" },
		{ id = "explore", name = "탐험", hint = "현장 조사·지형·동물·유적·유물" } } do
		add(function()
			return mkRow(content, row.name .. " · " .. tostring(cx.methods[row.id] or 0) .. "장", row.hint, {
				{ text = "보기", color = COLORS.blue, onClick = function() codexField = "a:" .. row.id; render() end },
			}, 56)
		end)
	end
	add(function() return mkHeader(content, "카드 소재") end)
	add(function()
		return mkRow(content, string.format("세부 종류 · %d가지", #cx.kindList), "지형·선박·광물·화석·건축물·동물·문화·원자재 등", {
			{ text = "보기", color = COLORS.blue, onClick = function() codexField = "t:all"; render() end },
		}, 54)
	end)
	-- [백과사전 문명 기술 트리] 기존 항구 경제 정보를 모바일에서 접어 보는 방식으로 재사용한다.
	-- 연구 가능과 실제 실용화를 구분하며, 발견·학자 보고·보상은 이 화면에서 변경하지 않는다.
	do
		local tech = view.harbor and view.harbor.sim and view.harbor.sim.technology
		if tech and tech.rows then
			add(function()
				return mkRow(content, string.format("현지 문명 기술 · %d / %d", tech.adopted, tech.total),
					string.format("%d년 · 학문·자원·교역·건축이 연결된 기술 계통", tech.year), {
						{ text = if H.civilTechOpen then "접기" else "열기", color = COLORS.blue, onClick = function() H.civilTechOpen = not H.civilTechOpen; render() end },
					}, 62)
			end)
			if H.civilTechOpen then
				local techNames = {}
				for _, node in ipairs(tech.rows) do techNames[node.id] = node.name end
				add(function() return mkHeader(content, "기술 실용화 · 시대와 지역마다 다르게 발전") end)
				for _, node in ipairs(tech.rows) do
					add(function()
						local status = ({
							adopted = "실용화", future = "역사적 등장 전", city = "도시 규모 부족",
							prerequisite = "선행 발명 필요", research = "학문 연구 진행",
							resource = "지역 자원 부족", capital = "건설 자본 부족", ready = "도입 가능",
						})[node.status] or "준비 중"
						local prereq = {}
						for _, id in ipairs(node.requires or {}) do
							table.insert(prereq, techNames[id] or id)
						end
						local detail = string.format("%d년부터 · %s · %s", node.since, node.disciplineName or node.discipline, status)
						if #prereq > 0 then detail ..= " · 선행 " .. table.concat(prereq, ", ") end
						if node.resource then
							detail ..= " · 자원 " .. (({ coal = "석탄", iron = "철", timber = "목재" })[node.resource] or node.resource)
						end
						return mkRow(content, node.name, detail, {}, 60)
					end)
				end
			end
		end
	end
	-- [백과사전] 기존 가공법·학문·원산지 브랜드와 국제 수출 달성도를 연결한다.
	do
		local sim = view.harbor and view.harbor.sim
		if sim and sim.industries then
			add(function() return mkHeader(content, "문명 산업 발전 · 원료에서 국제 수출까지") end)
			for _, industry in ipairs(sim.industries) do
				add(function()
					return mkRow(content, industry.name .. " · " .. industry.status,
						string.format("%s → %s → 원산지 명품\n국제 시장 %d곳 · 누적 수출 %.2f",
							industry.raw, industry.processed, #industry.destinations, industry.exported), {}, 86)
				end)
			end
		end
	end
	add(function() return mkHeader(content, string.format("학문 · 연구 중 %d개 / 앞으로 확장 %d개", cx.disciplineCount or 52, cx.plannedDisciplineCount or 0)) end)
	local samples = {}
	for _, card in cx.cards do
		if card.found and card.image and card.image ~= "" and not samples[card.field] then
			samples[card.field] = card
		end
	end
	for _, f in cx.fields do
		add(function()
			local claimable = 0
			for _, t in f.tiers do
				if t.claimable then
					claimable += 1
				end
			end
			local row = mkRow(content, string.format("%s  %d / %d%s", f.name, f.found, f.total, if claimable > 0 then "  (보상 있음)" else ""), f.summary, {
				{ text = "열기", color = fieldColor(f), onClick = function() codexField = f.id; render() end },
			}, 64)
			row.AccentBar.BackgroundColor3 = fieldColor(f)
			if samples[f.id] then
				local old = row:FindFirstChild("RowIcon")
				if old then old:Destroy() end
				local art = Instance.new("Frame")
				art.Position = UDim2.fromOffset(8, 6)
				art.Size = UDim2.fromOffset(52, 48)
				corner(art, 5)
				art.Parent = row
				paintCardArt(art, samples[f.id], f)
				local box = row.RowText
				local delta = 68 - box.Position.X.Offset
				box.Position = UDim2.fromOffset(68, box.Position.Y.Offset)
				box.Size = UDim2.new(1, box.Size.X.Offset - delta, 1, -8)
			end
			local barBack = Instance.new("Frame")
			barBack.AnchorPoint = Vector2.new(0, 1)
			barBack.Position = UDim2.new(0, 8, 1, -3)
			barBack.Size = UDim2.new(1, -90, 0, 4)
			barBack.BackgroundColor3 = COLORS.grey
			barBack.BorderSizePixel = 0
			barBack.Parent = row
			local bar = Instance.new("Frame")
			bar.Size = UDim2.fromScale(f.found / math.max(1, f.total), 1)
			bar.BackgroundColor3 = fieldColor(f)
			bar.BorderSizePixel = 0
			bar.Parent = barBack
			return row
		end)
	end
	add(function() return mkHeader(content, "지식 트리") end)
	add(function()
		return mkLabel(content, "발견 → 학자에게 보고 → 이해 → 항해·포격·교역 효과", 14, COLORS.muted, false)
	end)
	if view.knowledge and view.knowledge.era then
		local er = view.knowledge.era
		add(function() return mkHeader(content, string.format("인류의 시대 — %s", er.name)) end)
		add(function()
			local nxt = if er.nextName then string.format(" 다음 시대(%s)까지 이해한 지식 %d/%d개.", er.nextName, er.count, er.nextNeed) else " 마지막 시대에 이르렀어요."
			return mkLabel(content, er.story .. nxt, 14, COLORS.muted, false)
		end)
	end
	if view.pace then
		local pc = view.pace
		add(function() return mkHeader(content, "역사의 속도") end)
		add(function()
			return mkLabel(content, string.format("지금 역사가 %.1f년 앞서 있어요 (최대 %d년). 이번 %d일 앞당김 %d/%d일.", pc.years, math.floor(pc.capDays / 365), pc.windowDays, pc.windowLeft, pc.windowCap), 14, COLORS.muted, false)
		end)
	end
	if view.people then
		local PEOPLE_CAT_RELIC = { ruler = "shield-round", explorer = "map-rolled", military = "weapon-spear", science = "magnifying-glass", inventor = "hammer", thought = "journal-open",
			art = "chisel", letters = "journal-closed", merchant = "coin", pirate = "weapon-sword", faith = "lantern" }
		local pv = view.people
		add(function() return mkHeader(content, string.format("인물 백과 (기록 %d / %d명)", pv.known, pv.total)) end)
		add(function() return mkLabel(content, "항구·학자·역사 사건에서 인물이 기록돼요.", 14, COLORS.muted, false) end)
		for _, t in pv.tiers do
			add(function()
				local label = string.format("%d명 기록 보상: %d코인 · 명성 %d", t.need, t.coins, t.fame)
				return mkRow(content, label, if t.claimed then "받았어요" elseif t.ready then "받을 수 있어요" else string.format("%d명 더 기록하면 열려요", math.max(0, t.need - pv.known)), {
					{ text = if t.claimed then "완료" else "받기", color = COLORS.gold, onClick = function() call("PeopleClaim", { need = t.need }) end, enabled = t.ready },
				}, 52)
			end)
		end
		for _, c in pv.cats do
			add(function()
				local row = mkRow(content, string.format("%s  %d / %d", c.name, c.known, c.total), "", {
					{ text = "열기", color = COLORS.blue, onClick = function() codexField = "p:" .. c.id; render() end },
				}, 56)
				withIcon(row, "Relics", PEOPLE_CAT_RELIC[c.id] or "key", nil, 40)
				return row
			end)
		end
	end
	if view.world then
		local wv = view.world
		add(function() return mkHeader(content, string.format("세계 소식 · 재해와 행운 (구호 %d번)", wv.aided or 0)) end)
		add(function() return mkLabel(content, "20일마다 세계 어딘가에서 재해나 행운이 닥쳐요. 그 지역 항구에 있으면 피해나 이득을 직접 받고, 아니어도 시세가 변해요. 해당 학문 지식과 방어 건물이 재해 피해를 줄여요.", 12, COLORS.muted, false) end)
		if #wv.active == 0 then
			add(function() return mkLabel(content, "지금 진행 중인 세계 사건이 없어요.", 12, COLORS.muted, false) end)
		end
		for _, a in wv.active do
			add(function()
				local sub = string.format("%s · %s — %d일 남음\n%s", a.region, if a.kind == "disaster" then "재해" else "행운", a.left, a.text)
				if a.here and a.kind == "disaster" and a.cut then
					sub ..= string.format("\n이 항구라면 대비로 피해 %d%% 감소", a.cut)
				end
				local btn = {}
				if a.kind == "disaster" then
					table.insert(btn, { text = if a.aided then "구호함" else string.format("구호 %d코인", wv.aidCost), color = COLORS.green, onClick = function() call("WorldAid", { index = a.index }) end, enabled = a.canAid })
				end
				return mkRow(content, (if a.kind == "disaster" then "[재난] " else "[기회] ") .. a.title .. (if a.here then "  [여기]" else ""), sub, btn, 100)
			end)
		end
		for _, l in wv.log do
			add(function() return mkLabel(content, string.format("%d년 %s (%s) — %s", l.year, l.title, if l.kind == "disaster" then "재해" else "행운", l.result), 12, COLORS.muted, false) end)
		end
	end
	if view.history then
		local hv = view.history
		add(function() return mkHeader(content, string.format("역사의 분기점 (겪은 사건 %d / %d)", hv.seenCount or 0, hv.total or 0)) end)
		if hv.pending then
			add(function() return mkLabel(content, string.format("⚑ 지금 기다리는 사건: %d년 %s — 화면에 뜨는 선택 창에서 정하세요.", hv.pending.year, hv.pending.title), 15, COLORS.gold, true) end)
		end
		for _, r in hv.recent do
			add(function() return mkLabel(content, string.format("%d년 %s — %s", r.year, r.title, r.choice), 12, COLORS.muted, false) end)
		end
		add(function() return mkHeader(content, "역사서 · 연대기 (시대가 지나야 읽을 수 있어요)") end)
		for _, ch in hv.chronicle or {} do
			add(function()
				local sub = if ch.known then ch.text .. (if ch.choice then "\n▶ 나의 선택: " .. ch.choice else "") else ch.text
				return mkRow(content, string.format("%d년 · %s%s", ch.year, ch.title, if ch.tag then "  [" .. ch.tag .. "]" else ""), sub, {}, if ch.known then 84 else 44)
			end)
		end
		for _, e in hv.effects do
			add(function() return mkLabel(content, string.format("진행 중인 시세 변화: %s (%d일 남음)", e.title or "", e.left), 12, COLORS.green, false) end)
		end
	end
	add(function() return mkHeader(content, "먼 바다로 가는 길 (항해 지식을 이해해야 열려요)") end)
	for _, g in (view.knowledge and view.knowledge.gates or {}) do
		add(function()
			local parts = {}
			for _, nd in g.need do
				table.insert(parts, (if nd.done then "완료 " else "미완 ") .. nd.name)
			end
			return mkLabel(content, g.region .. (if g.open then " (열림)" else "") .. " — " .. table.concat(parts, "  "), 13, if g.open then COLORS.green else COLORS.text, false)
		end)
	end
	add(function() return mkHeader(content, "인류 학문 7대 분류 (연구 중인 분야 표시)") end)
	for _, dm in (view.knowledge and view.knowledge.domains or {}) do
		add(function()
			return mkLabel(content, string.format("■ %s — 연구 중 %d / 전체 %d  · %s", dm.name, dm.active, dm.count, dm.summary), 13, COLORS.gold, false)
		end)
		for _, r in dm.rows do
			add(function()
				local mark = if r.planned then "·" else "완료"
				local tail = if r.planned then "  (연구 예정)" else string.format("  이해 %d/%d%s", r.done or 0, r.total or 0, if r.open then "" else " · 잠김")
				return mkLabel(content, string.rep("    ", r.depth + 1) .. mark .. " " .. r.name .. tail, 12, if r.planned then COLORS.muted else COLORS.text, false)
			end)
		end
	end
	add(function() return mkHeader(content, "학문 계통도 (뿌리에서 갈라져 나온 순서)") end)
	for _, t in (view.knowledge and view.knowledge.tree or {}) do
		add(function()
			local sub = if t.open then "열림" else string.format("잠김 — %s 지식 %d/%d개 이해하면 열려요", t.parentName or "", t.parentDone, t.openAt or 0)
			return mkLabel(content, string.rep("    ", t.depth) .. (if t.depth > 0 then "└ " else "") .. t.name .. "  · " .. sub, 13, if t.open then COLORS.text else COLORS.muted, false)
		end)
	end
	for _, d in (view.knowledge and view.knowledge.disciplines or {}) do
		add(function()
			local sub = d.summary
			if not d.open then
				sub = string.format("[잠김: %s 지식 %d/%d개] ", d.parentName or "", d.parentDone, d.openAt or 0) .. sub
			end
			-- [학문 숙련] 조건식은 숙련 문구만 계산하고, 기존 도감 항목·열기 버튼은 보존한다.
			local masteryText = ""
			if d.mastery then
				masteryText = string.format("숙련 점수 %d%s · ", d.mastery.points, if d.mastery.next > 0 then "/" .. d.mastery.next else " (최고)")
			end
			return mkRow(content, string.format("%s  이해 %d / %d · 학문 Lv.%d", d.name, d.done, d.total, d.mastery and d.mastery.level or 1), masteryText .. sub, {
				{ text = "열기", color = COLORS.blue, onClick = function() codexField = "k:" .. d.id; render() end },
			}, 64)
		end)
	end
	add(function() return mkHeader(content, "전체 도감 보상") end)
	tierRows(cx.overall, "all", "전체 %d%% 달성")
	end

function H.renderCodexField()
-- [백과 검색] 기존 도감 화면 자체에서 검색. 외부 통신이나 별도 저장/인덱스 DB는 쓰지 않는다.
if codexField == "search" then
	add(function()
		return mkRow(content, "← 세계 백과", "검색 결과에서 카드 상세를 열 수 있어요", {
			{ text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end },
		}, 52)
	end)
	add(function()
		local box = Instance.new("TextBox")
		box.Name = "KnowledgeSearch"
		box.Size = UDim2.new(1, -10, 0, 42)
		box.BackgroundColor3 = COLORS.paper
		box.TextColor3 = COLORS.ink
		box.PlaceholderColor3 = COLORS.grey
		box.PlaceholderText = "이름·별칭·태그·학문 검색"
		box.Text = H.codexSearchTerm or ""
		box.TextSize = 16
		box.Font = Enum.Font.Gotham
		box.ClearTextOnFocus = false
		corner(box, 6)
		box:GetPropertyChangedSignal("Text"):Connect(function()
			H.codexSearchTerm = box.Text
		end)
		box.FocusLost:Connect(function(enterPressed)
			if enterPressed then render() end
		end)
		return box
	end)
	add(function()
		return mkRow(content, "지식 검색", "검색어를 입력한 뒤 버튼을 누르거나 엔터를 눌러 확인", {
			{ text = "검색", color = COLORS.blue, onClick = function() render() end },
		}, 50)
	end)
	local query = string.lower(H.codexSearchTerm or "")
	if #query > 0 then
		local matches = {}
		for _, card in view.codex.cards do
			local parts = { card.name, card.kindName, card.discipline, card.entityType, card.subkind, card.topic, card.evidence, card.era, card.region }
			for _, tag in card.tags or {} do table.insert(parts, tag) end
			for _, alias in card.aliases or {} do table.insert(parts, alias) end
			local hit = false
			for _, part in parts do
				if part and string.find(string.lower(part), query, 1, true) then hit = true; break end
			end
			if hit then table.insert(matches, card) end
		end
		add(function()
			return mkLabel(content, string.format("검색 결과 %d건 · 최대 60장 표시", #matches), 14, COLORS.muted, false)
		end)
		add(function()
			local grid = Instance.new("Frame")
			grid.BackgroundTransparency = 1
			grid.Size = UDim2.new(1, -6, 0, 0)
			grid.AutomaticSize = Enum.AutomaticSize.Y
			local layout = Instance.new("UIGridLayout")
			layout.CellSize = UDim2.new(1 / 3, -6, 0, 118)
			layout.CellPadding = UDim2.fromOffset(6, 6)
			layout.SortOrder = Enum.SortOrder.LayoutOrder
			layout.Parent = grid
			for i = 1, math.min(#matches, 60) do
				local card = matches[i]
				local tint = if card.found then (RARITY_COLOR[card.rarity] or COLORS.muted) else COLORS.grey
				local badge = if card.found then (RARITY_NAMES[card.rarity] or card.rarity) else "미발견"
				local tile = H.codexCardTile(grid, card, findField(card.field), badge, tint, function() H.showCardDetail(card) end)
				tile.LayoutOrder = i
			end
			return grid
		end)
	end
	return
end
-- [분류 별 목록] 도감의 발견·연구·탐험 또는 카드 소재로 걸러서 본다. 저장 상태/발견 조건은 변경하지 않는다.
if string.sub(codexField, 1, 2) == "a:" or string.sub(codexField, 1, 2) == "t:" or string.sub(codexField, 1, 2) == "w:" or string.sub(codexField, 1, 2) == "o:" or string.sub(codexField, 1, 2) == "e:" then
	local mode, key = string.sub(codexField, 1, 2), string.sub(codexField, 3)
	local label = if mode == "a:" then (if key == "discover" then "발견" elseif key == "research" then "연구" else "탐험")
		elseif mode == "w:" then ((function()
			for _, g in view.codex.worldGroups or {} do if g.id == key then return g.name end end
			return "지구·인류 오브젝트"
		end)())
		elseif mode == "o:" then ((function()
			for _, row in view.codex.topicList or {} do if row.id == key then return row.name end end
			return "세계 백과 14대 주제"
		end)())
		elseif mode == "e:" then ((view.codex.evidenceList or {})[key] or "지식 근거 분류")
		else ((view.codex.kindList and (function()
			for _, k in view.codex.kindList do if k.id == key then return k.name end end
			return nil
		end)()) or "카드 종류")
	add(function()
		return mkRow(content, "← 분류 목록", label, { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 50)
	end)

	-- 14개 주제와 근거 5종은 모바일에서 한 화면씩 목록으로 확인한다.
	if mode == "o:" and key == "all" then
		for _, topic in view.codex.topicList or {} do
			add(function()
				return mkRow(content, topic.name .. " · " .. tostring((view.codex.topicCounts or {})[topic.id] or 0) .. "장", "유형·무형 통합 지식카드", {
					{ text = "보기", color = COLORS.blue, onClick = function() codexField = "o:" .. topic.id; render() end },
				}, 52)
			end)
		end
		return
	end
	if mode == "e:" and key == "all" then
		for _, status in { "documented", "hypothesis", "legend", "fiction", "unreviewed" } do
			add(function()
				return mkRow(content, ((view.codex.evidenceList or {})[status] or status) .. " · " .. tostring((view.codex.evidenceCounts or {})[status] or 0) .. "장", "발견한 카드만 분류 · 출처 검증과 별개", {
					{ text = "보기", color = COLORS.blue, onClick = function() codexField = "e:" .. status; render() end },
				}, 52)
			end)
		end
		return
	end
	if mode == "t:" and key == "all" then
		for _, kind in view.codex.kindList or {} do
			add(function()
				return mkRow(content, kind.name .. " · " .. tostring(view.codex.kinds[kind.id] or 0) .. "장", "카드 종류별 목록", {
					{ text = "보기", color = COLORS.blue, onClick = function() codexField = "t:" .. kind.id; render() end },
				}, 52)
			end)
		end
		return
	end
	add(function()
		local grid = Instance.new("Frame")
		grid.BackgroundTransparency = 1
		grid.Size = UDim2.new(1, -6, 0, 0)
		grid.AutomaticSize = Enum.AutomaticSize.Y
		local g = Instance.new("UIGridLayout")
		g.CellSize = UDim2.new(1 / 3, -6, 0, 118)
		g.CellPadding = UDim2.fromOffset(6, 6)
		g.SortOrder = Enum.SortOrder.LayoutOrder
		g.Parent = grid
		local n = 0
		for _, c in view.codex.cards do
			if (mode == "a:" and c.method == key) or (mode == "t:" and c.kind == key) or (mode == "o:" and c.topicId == key) or (mode == "e:" and c.evidenceId == key) or (mode == "w:" and (function() for _, k in view.codex.kindList or {} do if k.id == c.kind then return k.group == key end end return false end)()) then
				n += 1
				local tint = if c.found then (RARITY_COLOR[c.rarity] or COLORS.muted) else COLORS.grey
				local badge = if c.found then (RARITY_NAMES[c.rarity] or c.rarity) else "미발견"
				local tile = H.codexCardTile(grid, c, findField(c.field), badge, tint, function() H.showCardDetail(c) end)
				tile.LayoutOrder = n
			end
		end
		return grid
	end)
	return
end
-- [자원 백과] 물건/가공품은 기존 시장 상품을 인용한다. 연관 지식의 카드가 있으면 도감 상세로 연결한다.
if string.sub(codexField, 1, 2) == "r:" then
	local selected = string.sub(codexField, 3)
	add(function() return mkRow(content, "← 세계 백과", "실제 시장 교역품과 연관 지식", {
		{ text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end },
	}, 52) end)
	if selected == "all" then
		add(function() return mkHeader(content, "자원·원자재·상품 하위 분류") end)
		for _, group in view.codex.resourceKinds or {} do
			add(function()
				return mkRow(content, group.name .. " · " .. tostring(view.codex.resourceCounts[group.id] or 0) .. "종", "교역품·원료·관련 학문", {
					{ text = "보기", color = COLORS.blue, onClick = function() codexField = "r:" .. group.id; render() end },
				}, 52)
			end)
		end
	else
		local groupName = "자원·원자재"
		for _, group in view.codex.resourceKinds or {} do
			if group.id == selected then groupName = group.name break end
		end
		add(function() return mkHeader(content, groupName) end)
		add(function() return mkRow(content, "← 자원 분류", "다른 자원 보기", {
			{ text = "뒤로", color = COLORS.grey, onClick = function() codexField = "r:all"; render() end },
		}, 52) end)
		local cardById = {}
		for _, card in view.codex.cards do cardById[card.id] = card end
		for _, item in view.codex.resources or {} do
			if item.category == selected then
				add(function()
					local card = item.cardId and cardById[item.cardId]
					local detail = "연결 학문: " .. item.discipline
						.. (if item.appliedDiscipline then " · 가공법: " .. item.appliedDiscipline else "")
						.. " · 연관 지식: " .. item.cardName
					if item.chain then
						local destinations = item.chain.markets or {}
						if #destinations > 0 then
							detail ..= string.format("\n%s → %s → 지역 명품\n원산지 %s · 관련 학문 %s\n수출 목표 %s%s",
								item.chain.raw, item.chain.processed, item.chain.port, item.chain.research,
								destinations[1], if #destinations > 1 then " 외 " .. tostring(#destinations - 1) .. "개 항구" else "")
						else
							detail ..= string.format("\n원료 %s → 가공품 %s\n생산 항구 %s · 관련 학문 %s",
								item.chain.raw, item.chain.processed, item.chain.port, item.chain.research)
						end
					elseif item.origin then
						detail ..= "\n생산 항구: " .. item.origin
					end
					return mkRow(content, item.name, detail, {
						{ text = if card then "지식" else "미등록", color = COLORS.blue, enabled = card ~= nil,
							onClick = function() if card then H.showCardDetail(card) end end },
					}, if item.chain then 114 elseif item.origin then 82 else 62)
				end)
			end
		end
	end
	return
end
if codexField == "boarding" then
	local BC = require(Shared:WaitForChild("BoardingCards"))
	BC.useKind("boarding") -- 주점 카드 대결에서 사용하는 기본 줄 이름을 복원한다
	local ROW_SEA = { melee = "충각", ranged = "소포", cannon = "주포" }
	add(function()
		return mkRow(content, "주점 카드 대결 도감", "주점에서는 지식 카드로 대결해요. 해적과의 해전 승패는 함선 조종·포격·접현 전투로 결정돼요.", {
			{ text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end },
		}, 58)
	end)
	-- 규칙 요약
	add(function() return mkHeader(content, "대결 규칙") end)
	for _, rule in {
		{ "3줄 × 3판 2선승", "주점 카드 대결은 근접·사격·포 세 줄을 사용해요. 세 줄 합계가 큰 쪽이 그 판을 이겨요." },
		{ "내 차례에 할 수 있는 일", "카드 한 장 내기 · 이번 판 멈추기 · 지도자 능력(한 판에 한 번). 둘 다 멈추면 그 판이 끝나요." },
		{ "줄과 판", "전열(근접)과 후열(사격·포) 두 줄이에요. 한 판에 카드를 5장까지 내고, 판이 끝나면 카드를 3장 더 뽑아요(손패 최대 10장)." },
		{ "무기 상성", "근접 줄끼리는 검 > 도끼 > 창 > 검. 유리하면 위력 +1, 불리하면 -1이에요." },
		{ "날씨와 소각", "안개·폭풍·혼전은 한 줄을 모두 1로 줄여요. 맑음이 걷어 내요. 소각은 가장 센 일반 카드를 쓰러뜨려요. 영웅은 안전해요." },
	} do
		add(function() return mkRow(content, rule[1], rule[2], {}, 64) end)
	end
	add(function() return mkHeader(content, "능력") end)
	for _, ab in {
		{ "결속", "같은 이름의 카드가 같은 줄에 모이면 각각 위력이 배가 돼요." },
		{ "사기", "같은 줄의 다른 아군 카드에 위력 +1을 줘요." },
		{ "첩자", "적 줄에 놓이지만 내 손패에 카드 두 장을 뽑아요." },
		{ "치료", "버린 일반 카드 중 가장 센 것을 되살려요." },
	} do
		add(function() return mkRow(content, ab[1], ab[2], {}, 50) end)
	end
	add(function() return mkHeader(content, "지도자 능력 (한 판에 한 번)") end)
	for _, id in { "draw", "clear", "snipe" } do
		local ld = BC.Leaders[id]
		add(function() return mkRow(content, ld.name, ld.text, {}, 50) end)
	end
	-- 내가 가진 카드: 게임에서 이룬 일이 카드가 된다
	local owned = view.deck and view.deck.cards or {}
	if #owned > 0 then
		add(function() return mkHeader(content, string.format("내 특별 카드 %d장 (영웅·특수)", #owned)) end)
		for _, c in owned do
			local info = BC.SkillInfo[c.skill]
			add(function() return mkRow(content, c.name, if info then info.name .. " · " .. info.text else "", {}, 56) end)
		end
	end
	add(function() return mkHeader(content, string.format("병종 카드 전체 %d종", (function() local n = 0 for _ in BC.Units do n += 1 end for _ in BC.Specials do n += 1 end return n end)())) end)
	for _, rowId in { "melee", "ranged", "cannon", "special" } do
		local units = {}
		for _, unit in (if rowId == "special" then BC.Specials else BC.Units) do
			if rowId == "special" or unit.row == rowId then table.insert(units, unit) end
		end
		table.sort(units, function(a, b) return a.name < b.name end)
		add(function() return mkLabel(content, if rowId == "special" then "특수 카드" else string.format("%s 줄  (해전: %s)", BC.ROW_NAME[rowId], ROW_SEA[rowId]), 16, COLORS.gold, true) end)
		add(function()
			local grid = Instance.new("Frame")
			grid.BackgroundTransparency = 1
			grid.Size = UDim2.new(1, -6, 0, 0)
			grid.AutomaticSize = Enum.AutomaticSize.Y
			local layout = Instance.new("UIGridLayout")
			layout.CellSize = UDim2.new(1 / 3, -5, 0, 106)
			layout.CellPadding = UDim2.fromOffset(5, 5)
			layout.SortOrder = Enum.SortOrder.LayoutOrder
			layout.Parent = grid
			local field = { name = BC.ROW_NAME[rowId] or "특수", color = { 70, 92, 96 } }
			for index, unit in units do
				local badge = if unit.special then "특수" elseif unit.hero then "영웅 · " .. unit.power else "위력 " .. unit.power
				local tint = if unit.hero then COLORS.gold elseif unit.special then Color3.fromRGB(193, 166, 221) else Color3.fromRGB(176, 201, 215)
				local tile = H.codexCardTile(grid, { name = unit.name, found = true, image = H.combatCardImage(unit) },
					field, badge, tint, function() H.showCombatCard(unit) end)
				tile.LayoutOrder = index
			end
			return grid
		end)
	end
	return
end
if string.sub(codexField, 1, 2) == "p:" then
	local cid = string.sub(codexField, 3)
	local cat = nil
	for _, c in (view.people and view.people.cats or {}) do
		if c.id == cid then
			cat = c
		end
	end
	if not cat then
		codexField = nil
		renderCodexOverview()
		return
	end
	add(function()
		return mkRow(content, "← 분야 목록", "", { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 44)
	end)
	add(function() return mkLabel(content, string.format("인물 백과 · %s  %d / %d", cat.name, cat.known, cat.total), 17, COLORS.gold, true) end)
	local PEOPLE_RELIC = { ruler = "shield-round", explorer = "map-rolled", military = "weapon-spear", science = "magnifying-glass", inventor = "hammer", thought = "journal-open",
		art = "chisel", letters = "journal-closed", merchant = "coin", pirate = "weapon-sword", faith = "lantern" }
	local n = 0
	for _, p in view.people.list do
		if p.cat == cid then
			n += 1
			add(function()
				if p.known then
					local sub = p.bio .. (if p.legacy ~= "" then "\n" .. p.legacy else "") .. (if p.rel then "\n" .. p.rel else "")
					local talkLabel = if p.talked then "다시 듣기" else "대화 (+40)"
					local row = mkRow(content, p.name .. "  (" .. p.years .. ")", sub, { { text = talkLabel, color = COLORS.blue or COLORS.gold, onClick = function() call("PeopleTalk", { id = p.id }) end } }, 104)
					-- 등록된 초상이 있으면 초상, 없으면 분야 유물 그림 (학자: scholar_<id>, 그 밖의 인물: person_<id>)
					local key = if SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. p.id] then "scholar_" .. p.id elseif AssetIds["Portraits/person_" .. p.id] then "person_" .. p.id else nil
					if key then
						withIcon(row, "Portraits", key, nil, 72)
					else
						withIcon(row, "Relics", PEOPLE_RELIC[cid] or "key", nil, 56)
					end
					return row
				end
				local row = mkRow(content, string.format("??? #%d", n), p.hint, {}, 60)
				withIcon(row, "Relics", "key", nil, 44)
				return row
			end)
		end
	end
	return
end
if string.sub(codexField, 1, 2) == "k:" then
	local did = string.sub(codexField, 3)
	local disc = nil
	for _, d in (view.knowledge and view.knowledge.disciplines or {}) do
		if d.id == did then
			disc = d
		end
	end
	if not disc then
		codexField = nil
		renderCodexOverview()
		return
	end
	add(function()
		return mkRow(content, "← 분야 목록", "", { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 44)
	end)
	add(function() return mkLabel(content, string.format("%s  이해 %d / %d · 학문 Lv.%d", disc.name, disc.done, disc.total, disc.mastery and disc.mastery.level or 1), 17, COLORS.gold, true) end)
	add(function()
		-- [학문 상세] 숙련 정보는 기존 조건식 안에서 계산해 문법과 빈 숙련 상태를 모두 보존한다.
		local masteryInfo = ""
		if disc.mastery then
			masteryInfo = string.format(" · 학문 숙련 %d점%s", disc.mastery.points, if disc.mastery.next > 0 then "/" .. disc.mastery.next else " (최고)")
		end
		return mkLabel(content, disc.summary .. masteryInfo, 13, COLORS.text, false)
	end)
	local pd = view.people and view.people.byDisc and view.people.byDisc[disc.id]
	if pd then
		add(function() return mkLabel(content, string.format("이 학문과 이어진 인물 %d / %d명 기록 — 인물을 기록할수록 이 학문의 연구가 조금씩 빨라져요.", pd.known, pd.total), 12, COLORS.green, false) end)
	end
	local kv = view.knowledge
	add(function()
		return mkLabel(content, string.format("지금 효과: 항해 속도 +%d%% · 포격 +%d%%", math.floor(kv.speedBonus * 100 + 0.5), math.floor(kv.cannonBonus * 100 + 0.5)), 12, COLORS.green, false)
	end)
	if (disc.hidden or 0) > 0 then
		add(function() return mkLabel(content, string.format("아직 발견하지 못한 지식 %d개는 발견하면 이곳에 나타나요.", disc.hidden), 12, COLORS.muted, false) end)
	end
	for _, nd in disc.nodes do
		add(function()
			local mark, col
			if nd.status == "done" then
				mark, col = "이해함", COLORS.green
			elseif nd.status == "ready" then
				mark, col = "● 보고 가능", COLORS.gold
			elseif nd.status == "blocked" then
				mark, col = "선행 필요", COLORS.red
			elseif nd.status == "closed" then
				mark, col = "🔒 학문이 아직 열리지 않음", COLORS.muted
			else
				mark, col = "? 아직 발견 못 함", COLORS.muted
			end
			local sub = mark
			if #nd.needs > 0 then
				sub ..= "  ·  선행: " .. table.concat(nd.needs, ", ")
			end
			if nd.linked and #nd.linked > 0 then
				sub ..= "  ·  융합 학문: " .. table.concat(nd.linked, "·")
			end
			if nd.effect then
				sub ..= "\n효과: " .. nd.effect
			end
			local row = mkRow(content, nd.name, sub, {}, if nd.effect or (nd.linked and #nd.linked > 0) then 64 else 52)
			local stripe = Instance.new("Frame")
			stripe.Size = UDim2.new(0, 4, 1, -12)
			stripe.Position = UDim2.fromOffset(0, 6)
			stripe.BackgroundColor3 = col
			stripe.BorderSizePixel = 0
			stripe.Parent = row
			return row
		end)
	end
	return
end
local f = findField(codexField)
	if not f then
		codexField = nil
		renderCodexOverview()
		return
	end
	add(function()
		return mkRow(content, "← 분야 목록", "", { { text = "뒤로", color = COLORS.grey, onClick = function() codexField = nil; render() end } }, 44)
	end)
	add(function()
		return mkLabel(content, string.format("%s  %d / %d", tostring(f.name), f.found, f.total), 17, fieldColor(f), true)
	end)
	add(function() return mkLabel(content, f.detail, 13, COLORS.text, false) end)
	add(function() return mkLabel(content, "모으는 방법: " .. f.tip, 12, COLORS.gold, false) end)
	add(function() return mkHeader(content, "완성 보상") end)
	tierRows(f.tiers, f.id, f.name .. " %d%% 달성")
	add(function() return mkHeader(content, "카드") end)
	add(function()
		local grid = Instance.new("Frame")
		grid.BackgroundTransparency = 1
		grid.Size = UDim2.new(1, -6, 0, 0)
		grid.AutomaticSize = Enum.AutomaticSize.Y
		local g = Instance.new("UIGridLayout")
		g.CellSize = UDim2.new(1 / 3, -6, 0, 118)
		g.CellPadding = UDim2.fromOffset(6, 6)
		g.SortOrder = Enum.SortOrder.LayoutOrder
		g.Parent = grid
		local n = 0
		for _, c in view.codex.cards do
			if c.field == f.id then
				n += 1
				local tint = if c.found then (RARITY_COLOR[c.rarity] or COLORS.muted) else COLORS.grey
				local badge = if c.found then (RARITY_NAMES[c.rarity] or c.rarity) else "미발견"
				local tile = H.codexCardTile(grid, c, f, badge, tint, function() H.showCardDetail(c) end)
				tile.LayoutOrder = n
			end
		end
		return grid
	end)
end

function RENDERERS.codex()
	if not codexField then H.counselRows(1) end
	if codexField then
		H.renderCodexField()
	else
		renderCodexOverview()
	end
end

function RENDERERS.scholar()
	H.exploreScholarView = true
	local ok, err = pcall(RENDERERS.explore)
	H.exploreScholarView = nil
	if not ok then
		error(err, 0)
	end
end

function RENDERERS.tech()
	-- [연구소] 해금 상태와 자금 조건을 서버 스냅샷으로 분리해 보여 준다.
	local completed, affordable, blocked = 0, 0, 0
	for _, t in view.tech do
		if t.owned then completed += 1
		elseif t.blocked then blocked += 1
		elseif (t.cost or 0) <= view.player.coins then affordable += 1 end
	end
	H.statStrip({
		{ "연구 완료", tostring(completed), tone = "good" },
		{ "지금 가능", tostring(affordable), tone = "good" },
		{ "조건 잠금", tostring(blocked), tone = "key" },
		{ "보유 코인", H.commas(view.player.coins), tone = "key" },
	})
	add(function()
		return mkLabel(content, "기술은 선행 지식과 보유 코인을 확인해 연구해. 증기 장비는 석탄을 사용해.", 14, COLORS.muted, false)
	end)
	add(function()
		local tiles = {}
		for _, t in view.tech do
			local affordableNow = (t.cost or 0) <= view.player.coins
			local reason = if t.owned then "연구 완료" elseif t.blocked then t.blocked
				elseif not affordableNow then string.format("코인 %s 부족 · %s", H.commas((t.cost or 0) - view.player.coins), t.summary)
				else "연구 가능 · " .. t.summary
			table.insert(tiles, { icon = if t.owned then "cc0_yes" else "tech", title = t.name, sub = reason,
				btn = if t.owned then "완료" elseif not affordableNow and not t.blocked then "자금 부족" else tostring(t.cost) .. " 코인",
				color = COLORS.steam, enabled = not t.owned and t.blocked == nil and affordableNow,
				onClick = function() call("Research", { techId = t.id }) end })
		end
		return H.tileGrid(tiles, content, 176, 160)
	end)
end

function RENDERERS.quest()
	H.walletBar("tavern")
	-- 일지: 모든 퀘스트가 여기 기록된다. 소문을 듣거나 사람을 만나 이야기하면 저절로 올라오고, 조건을 채우면 저절로 보상이 들어온다.
	local STRAND = { main = "서막", companion = "동료 이야기", history = "역사의 현장", person = "인물과 연구" }
	local function strandText(q)
		return (if q.strand then "[" .. STRAND[q.strand] .. "] " else "") .. q.summary .. (if q.story then "\n" .. q.story else "")
	end
	add(function() return mkHeader(content, string.format("일지 · 진행 중 %d", #view.quests.active)) end)
	if #view.quests.active == 0 then
		add(function() return mkLabel(content, "아직 기록이 없어요. 소문을 듣거나 사람과 이야기해 보세요.", 13, COLORS.muted, true) end)
	end
	for _, q in view.quests.active do
		add(function()
			local buttons = {}
			if q.kind == "deliver" then
				table.insert(buttons, { text = "납품", color = COLORS.blue, onClick = function() call("TurnIn", { questId = q.id }) end })
			end
			local done, total = math.min(q.progress, q.amount), math.max(1, q.amount)
			local filled = math.clamp(math.floor(done / total * 10 + 0.5), 0, 10)
			local progress = string.rep("▰", filled) .. string.rep("▱", 10 - filled)
			return mkRow(content, q.name, string.format("%s\n%s  %d/%d · 보상 %d코인", strandText(q), progress, done, q.amount, q.rewardCoins), buttons, if q.story then 136 else 92)
		end)
	end
	-- 자동으로 기록되는 발견·방문·연구 목표 (진행도만 보여 준다)
	local autos = {}
	for _, q in view.quests.available do
		if q.auto then table.insert(autos, q) end
	end
	if #autos > 0 then
		add(function() return mkHeader(content, "자동 기록 중인 목표") end)
		for _, q in autos do
			add(function()
				return mkRow(content, q.name, string.format("%s\n진행 %d/%d · 보상 %d코인", strandText(q), math.min(q.progress or 0, q.amount or 0), q.amount or 0, q.rewardCoins), nil, if q.story then 116 else 64)
			end)
		end
	end
	if (view.quests.otherPortDeliver or 0) > 0 or #view.quests.available > #autos then
		add(function()
			return mkLabel(content, "다른 항구의 소문과 사람들에게서 더 많은 의뢰를 들을 수 있어요.", 12, COLORS.muted, true)
		end)
	end
	if #view.quests.done > 0 then
		add(function() return mkHeader(content, string.format("완료한 기록 %d", #view.quests.done)) end)
		for _, q in view.quests.done do
			add(function()
				return mkLabel(content, "(완료) " .. q.name .. " — " .. q.summary .. (if q.ending then "\n   " .. q.ending else ""), 12, COLORS.muted, true)
			end)
		end
	end
end

-- 주점의 지식 카드 배틀: 카드 덱을 짜고 연습전·오늘의 퍼즐로 카드 대결을 즐긴다 (해상전과는 별개).
function RENDERERS.gwent()
	H.walletBar("tavern")
	local BC = require(Shared:WaitForChild("BoardingCards"))
	local bk = view and view.cardbook
	local fac = view and view.deck and BC.Factions[view.deck.faction or ""]
	local cnt = { melee = 0, ranged = 0, cannon = 0, special = 0 }
	for _, id in (bk and bk.ids) or {} do
		local d = BC.Units[id] or BC.Specials[id]
		if d then
			if d.special then cnt.special += 1 else cnt[d.row] += 1 end
		end
	end
	local total = cnt.melee + cnt.ranged + cnt.cannon + cnt.special
	H.statStrip({
		{ "내 덱", string.format("%s · %d장", fac and fac.name or "기본", total), tone = "key" },
		{ "근접 · 사격", string.format("%d · %d", cnt.melee, cnt.ranged), tone = "key" },
		{ "포 · 특수", string.format("%d · %d", cnt.cannon, cnt.special), tone = "key" },
		{ "오늘 보상", string.format("%d회", (bk and bk.duelLeft) or 0), tone = "good" },
	})
	add(function()
		return H.tileGrid({
			{ icon = "codex", title = "덱 짜기", sub = "카드를 골라 덱 구성", btn = "열기", color = COLORS.blue, onClick = function() if H.openDeck then H.openDeck() end end },
			{ icon = "cc0_shield", title = "연습전", sub = "기본 카드로 규칙 배우기", btn = "시작", color = COLORS.green, onClick = function()
				if H.openDeck then H.openDeck() end
				task.defer(function() if H.devCards and H.devCards.practice then H.devCards.practice() end end)
			end },
			{ icon = "cc0_sword", title = "카드 대결", sub = "이기면 새 지식 카드", btn = "대결", color = COLORS.red, onClick = function()
				if H.openDeck then H.openDeck() end
				task.defer(function() if H.devCards and H.devCards.duel then H.devCards.duel() end end)
			end },
		}, content, 176, 150)
	end)
	add(function()
		return mkLabel(content, "한 판 5장 · 3판 2선승 · 학문 카드를 모을수록 같은 계열 줄이 강해져요.", 14, COLORS.muted, false)
	end)
end

-- 전투 본부의 대규모 해전 의뢰: 여러 파도로 이어지는 작전
function RENDERERS.board()
	H.walletBar("tavern")
	H.counselRows(1) -- 맨 위 "지금 할 일": 동료가 지금 가장 급한 조언을 큰 카드로
	local q = view.tavernQ or {}
	local KIND = { hunt = "전투", deliver = "납품", event = "선택" }
	local function money(j)
		if j.kind == "event" then return "" end
		return string.format("\n보상 %d코인 · 명성 +%d%s", j.coins or 0, j.fame or 0, if j.shady then string.format("  (실패·포기 시 명성 -%d)", j.failFame or 0) else "")
	end
	local function detail(j)
		local sub = j.text
		if j.kind == "hunt" then sub ..= "\n상대: " .. tostring(j.enemy) end
		if j.kind == "deliver" and j.good then sub ..= string.format("\n%s %d개 납품", j.good, j.amount or 0) end
		return sub .. money(j)
	end
	if q.note then
		add(function() return mkRow(content, "알림", q.note, nil, 64) end)
	end
	-- 1) 지금 맡은 의뢰
	add(function() return mkHeader(content, "맡은 의뢰") end)
	if q.active then
		local j = q.active
		add(function()
			local tagText = if j.shady then "수상한 손님" elseif j.src == "grand" then "큰 사건" elseif j.src == "legend" then "전설" else "의뢰"
			local sub = string.format("%s\n기한 %d일 남음", detail(j), j.left or 0)
			if j.blocked then sub ..= "\n" .. j.blocked end
			local buttons = {}
			if j.kind ~= "event" then
				table.insert(buttons, { text = if j.kind == "hunt" then "출격" else "납품", color = COLORS.red, enabled = j.blocked == nil, onClick = function() call("TavernJob", { id = j.id }) end })
			end
			table.insert(buttons, { text = "포기", color = COLORS.grey, onClick = function() call("TavernAbandon") end })
			local note = if j.shady then "\n포기하면 명성이 떨어져요." else "\n포기해도 벌은 없어요."
			return mkRow(content, string.format("[%s·%s] %s", tagText, j.tag or KIND[j.kind] or "", j.name), sub .. note, buttons, 140)
		end)
		if j.kind == "event" then
			for i, c in j.choices or {} do
				add(function()
					return mkRow(content, c.label, c.hint, { { text = "선택", color = COLORS.red, enabled = not c.locked, onClick = function() call("TavernJob", { id = j.id, choice = i }) end } }, 56)
				end)
			end
		end
	else
		add(function() return mkLabel(content, "맡은 의뢰가 없어요. 아래에서 소문을 듣거나 술을 사 주고 일감을 받아 보세요.", 15, COLORS.muted, true) end)
	end
	-- 2) 제안 중인 일감 (고르면 맡는다)
	if #(q.offer or {}) > 0 then
		local who = if q.offerKind == "shady" then "수상한 손님의 제안 (둘 중 하나)" elseif q.offerKind == "job" then "주인의 일감 (둘 중 하나)" else "새 일감"
		add(function() return mkHeader(content, who) end)
		for i, j in q.offer do
			add(function()
				local sub = detail(j) .. (if j.shady then "\n실패하거나 포기하면 명성이 떨어져요." else "\n실패해도, 도중에 접어도 명성은 그대로예요.")
				return mkRow(content, string.format("[%s] %s", j.tag or KIND[j.kind] or "", j.name), sub, {
					{ text = "맡는다", color = if j.shady then COLORS.red else COLORS.green, enabled = q.active == nil, onClick = function() call("TavernPick", { index = i }) end },
				}, 150)
			end)
		end
		add(function()
			return mkRow(content, "거절하고 돌아선다", "고르지 않아도 괜찮아요.", { { text = "거절", color = COLORS.grey, onClick = function() call("TavernDecline") end } }, 64)
		end)
	end
	-- 3) 주점에서 할 수 있는 일
	add(function() return mkHeader(content, "주점에서") end)
	add(function()
		return H.tileGrid({
			{ icon = "quest", title = "소문 듣기", sub = "무료 · 무작위 소식", btn = "듣기", color = COLORS.blue, onClick = function() call("TavernRumor") end },
			{ icon = "cc0_goldcoins", title = "술 사 주기", sub = string.format("%d코인 · 일감 2택", q.drinkCost or 30), btn = "술 사기", color = COLORS.gold, enabled = q.active == nil, onClick = function() call("TavernDrink") end },
			{ icon = "cc0_helmet", title = "동료와 대화", sub = "호감도 · 이야기", btn = "대화", color = COLORS.blue, onClick = function() call("TavernTalk") end },
			if q.stranger
				then { icon = "status", title = "수상한 손님", sub = "어렵지만 보상 큼", btn = "말 걸기", color = COLORS.red, enabled = q.active == nil, onClick = function() call("TavernStranger") end }
				else { icon = "status", title = "구석 자리", sub = "오늘은 비어 있어요", enabled = false },
		}, content)
	end)
	-- 4) 소문에서 나온 선택 사건
	if q.rumorEvent then
		local j = q.rumorEvent
		add(function() return mkHeader(content, "소문의 사건") end)
		add(function()
			return mkRow(content, string.format("[%s] %s", j.tag or "", j.name), j.text, nil, 90)
		end)
		for i, c in j.choices or {} do
			add(function()
				return mkRow(content, c.label, c.hint, { { text = "선택", color = COLORS.red, enabled = not c.locked, onClick = function() call("TavernJob", { id = j.id, choice = i }) end } }, 56)
			end)
		end
	end
	-- 5) 이 항구의 이야기 (수상한 손님이 광장에 서 있던 시절의 이야기도 이곳에서 들어요)
	if view.story and #view.story > 0 then
		add(function() return mkHeader(content, "이 항구의 이야기") end)
		for _, ev in view.story do
			add(function()
				return mkRow(content, ev.title, (if ev.chapter then ev.chapter .. " · " else "") .. ev.npc, {
					{ text = "듣기", color = COLORS.gold, onClick = function() playStory(ev) end },
				}, 56)
			end)
		end
	end
end

function RENDERERS.war()
	H.walletBar("tavern")
	H.statStrip({
		{ "선체", string.format("%d/%d", view.ship.hull, view.ship.maxHull), tone = if view.ship.hull < view.ship.maxHull * 0.5 then "bad" else "good" },
		{ "함대전", if view.war then string.format("%d/%d파도", view.war.wave, view.war.total) else "미진행", tone = "key" },
		{ "작전 후보", tostring(#(view.wars or {})) .. "개", tone = "key" },
	})
	add(function()
		return mkRow(content, "대규모 해전 의뢰", "한 번의 출격이 아니라 여러 척을 차례로 상대하는 작전이에요. 파도마다 실시간으로 싸우고, 모두 돌파하면 큰 보상! 한 번이라도 지면 작전 실패예요. 파도 사이에 선체는 회복되지 않으니 아껴 싸우세요.", nil, 92)
	end)
	local w = view.war
	if w then
		add(function()
			return mkRow(content, string.format("진행 중: %s (%d/%d파도)", w.name, w.wave, w.total), if w.next then "다음 적이 기다려요" else "전투를 마무리하세요", {
				{ text = "계속", color = COLORS.red, enabled = w.next == true, onClick = function() call("WarNext") end },
			}, 64)
		end)
	end
	add(function() return mkHeader(content, "작전 의뢰") end)
	add(function()
		local tiles = {}
		for _, c in view.wars do
			table.insert(tiles, { icon = "cc0_shield", title = c.name, sub = if c.blocked then c.blocked else string.format("%d파도 · %d코인 · Lv.%d", c.waves, c.coins, c.minLevel), btn = "참전", color = COLORS.red, enabled = c.blocked == nil and w == nil, onClick = function() call("WarStart", { id = c.id }) end })
		end
		return H.tileGrid(tiles, content)
	end)
end

function RENDERERS.battle()
	H.walletBar("battle")
	H.statStrip({
		{ "선체", string.format("%d/%d", view.ship.hull, view.ship.maxHull), tone = if view.ship.hull < view.ship.maxHull * 0.5 then "bad" else "good" },
		{ "포문", tostring(view.ship.cannons), tone = "key" },
		{ "승조원", string.format("%d/%d", view.ship.crew, view.ship.maxCrew), tone = "key" },
		{ "속도", string.format("%.1f", view.ship.speed), tone = "key" },
	})
	if view.ship.hull < view.ship.maxHull * 0.5 then
		add(function() return mkLabel(content, "🔴 내구도 절반 이하 · 출격 전 선체 수리를 권장해.", 15, COLORS.red, true) end)
	end
	local lo = view.loadout
	if not equipped then
		equipped = table.clone(lo.equipped)
	end
	add(function()
		local tiles = { { icon = "cc0_sword", title = "사략선 사냥", sub = "해적과 해전 · 1일", btn = "출격", color = COLORS.red, onClick = function() call("Hunt") end } }
		for _, b in view.bosses do
			table.insert(tiles, { icon = "battle", title = b.name, sub = if b.blocked then b.blocked else string.format("격파 %d회", b.defeated), btn = "도전", color = COLORS.red, enabled = b.blocked == nil, onClick = function() call("ChallengeBoss", { bossId = b.id }) end })
		end
		return H.tileGrid(tiles, content)
	end)
	add(function()
		return mkLabel(content, string.format("자동스킬 슬롯 %d개 · 위에 있을수록 먼저 발동해요 (현재 %d개 선택)", lo.slots, #equipped), 13, COLORS.muted, false)
	end)

	local function indexOf(id)
		for i, v in equipped do
			if v == id then
				return i
			end
		end
		return nil
	end

	for _, s in lo.skills do
		add(function()
			local idx = indexOf(s.id)
			local sub = string.format("%s · 쿨타임 %d라운드%s", s.summary, s.cooldown, if s.steamOnly then " · 증기선 전용(석탄)" else "")
			if s.locked then
				sub ..= "\n" .. s.locked
			end
			local title = (if idx then string.format("%d. ", idx) else "") .. s.name
			local buttons = {
				{ text = if idx then "해제" else "장착", color = if idx then COLORS.red else COLORS.blue, enabled = not s.locked,
					onClick = function()
						if idx then
							table.remove(equipped, idx)
						elseif #equipped < lo.slots then
							table.insert(equipped, s.id)
						else
							message, messageOk = "슬롯이 가득 찼어요", false
						end
						render()
					end },
			}
			if idx and idx > 1 then
				table.insert(buttons, { text = "위로", color = COLORS.grey, onClick = function()
					equipped[idx], equipped[idx - 1] = equipped[idx - 1], equipped[idx]
					render()
				end })
			end
			return mkRow(content, title, sub, buttons, 76)
		end)
	end
	add(function()
		local b = mkButton(content, "자동스킬 저장", COLORS.green, UDim2.new(1, -6, 0, 40), function()
			call("SetLoadout", { skills = equipped })
		end, true)
		return b
	end)

	if view.lastBattle then
		add(function() return mkHeader(content, "최근 해전: " .. view.lastBattle.enemy) end)
		for _, line in view.lastBattle.log do
			add(function() return mkLabel(content, line, 12, COLORS.muted, false) end)
		end
	end
end

local selectedPort = nil
H.selectedChart = nil
H.showChartPicker = false
H.CHART_REGIONS = {
	{ "north_sea", "북해" }, { "west_europe", "서유럽" },
	{ "mediterranean", "지중해" }, { "west_africa", "서아프리카" },
	{ "indian_ocean", "인도양" }, { "southeast_asia", "동남아시아" },
	{ "east_asia", "동아시아" }, { "caribbean", "카리브해·북아메리카" },
	{ "south_america", "남아메리카" }, { "pacific", "태평양" },
}
H.CHART_BY_PORT_REGION = {
	north_sea = "north_sea", atlantic_europe = "west_europe", mediterranean = "mediterranean",
	west_africa = "west_africa", east_africa = "indian_ocean", red_sea = "indian_ocean",
	south_asia = "indian_ocean", southeast_asia = "southeast_asia", east_asia = "east_asia",
}

function H.chartForPort(portId)
	local pt = PortData.Ports[portId]
	if not pt then return nil end
	local region = H.regionOfPort(portId)
	if region == "americas" then
		-- 남아메리카의 태평양 연안 항구도 태평양 해역도에서 고를 수 있다.
		if pt.lat < 12 and pt.lon < -70 then return "pacific", "south_america" end
		return if pt.lat < 12 then "south_america" else "caribbean"
	end
	return H.CHART_BY_PORT_REGION[region or ""]
end

H.SEA_NAMES = {
	{ "북해", 56.2, 3.2 }, { "대서양", 47.5, -9 }, { "지중해", 38.6, 4 }, { "발트해", 57.3, 19.5 },
	{ "영국해협", 50.0, -2.0 }, { "비스케이만", 45.0, -5.2 }, { "티레니아해", 40.0, 11.8 }, { "아드리아해", 43.0, 15.6 },
	{ "아일랜드해", 53.9, -4.9 }, { "노르웨이해", 61.6, 1 }, { "이오니아해", 37.8, 18.5 }, { "리구리아해", 43.4, 8.3 },
}

-- 실제 위도·경도 위에 항구를 찍은 세계지도 (Natural Earth 해안선)
function RENDERERS.map()
	-- 상단 바로가기는 지도를, 항해 일지는 기록을 먼저 펼친다.
	if H.mapPage ~= "chart" then
		local p = view.player
		add(function() return mkHeader(content, "항해 일지") end)
		local crewN = 0
		for _, c in (view.companions and view.companions.list) or {} do
			if c.joined then crewN += 1 end
		end
		add(function() return mkLabel(content, string.format("%s · %d년 %d일째 · %s 정박", p.nation, p.year, p.day, p.portName), 16, COLORS.text, true) end)
		H.statStrip({
			{ "코인", tostring(p.coins), tone = "good" },
			{ "명성", tostring(p.fame or 0), tone = "key" },
			{ "동료", tostring(crewN) .. "명", tone = "key" },
		})
		local hv = view.history
		if hv then
			if hv.pending then
				add(function() return mkLabel(content, string.format("기다리는 사건: %d년 %s", hv.pending.year, hv.pending.title), 15, COLORS.gold, true) end)
			end
			for _, r in hv.recent or {} do
				add(function() return mkLabel(content, string.format("%d년 %s — %s", r.year, r.title, r.choice), 12, COLORS.muted, false) end)
			end
		end
		if H.mapPage == "journal" then
			add(function()
				return mkButton(content, "항해 지도 펼치기", COLORS.blue, UDim2.new(1, -6, 0, 44), function()
					openTab("map", "chart")
				end)
			end)
			return
		end
	end
	add(function() return mkHeader(content, "항해 지도") end)
	-- 한 번에 현재 보고 있는 지도 한 장만 화면에 붙인다.
	local chartImage = H.selectedChart and AssetIds["CardArt/event_chart_" .. H.selectedChart]
	add(function()
		local controls = Instance.new("Frame")
		controls.Size = UDim2.new(1, -6, 0, 44)
		controls.BackgroundTransparency = 1
		mkButton(controls, "세계지도", if chartImage then COLORS.grey else COLORS.blue, UDim2.new(0.5, -3, 1, 0), function()
			H.selectedChart = nil
			H.showChartPicker = false
			render()
		end)
		local regions = mkButton(controls, if H.showChartPicker then "해역 목록 닫기" else "해역 선택", COLORS.blue, UDim2.new(0.5, -3, 1, 0), function()
			H.showChartPicker = not H.showChartPicker
			render()
		end)
		regions.Position = UDim2.new(0.5, 3, 0, 0)
		return controls
	end)
	if H.showChartPicker then
		for _, entry in H.CHART_REGIONS do
			local key, label = entry[1], entry[2]
			if AssetIds["CardArt/event_chart_" .. key] then
				add(function()
					return mkButton(content, label, if key == H.selectedChart then COLORS.gold else COLORS.grey, UDim2.new(1, -6, 0, 44), function()
						H.selectedChart = key
						selectedPort = nil
						H.showChartPicker = false
						render()
					end)
				end)
			end
		end
	end

	if chartImage then
		for _, entry in H.CHART_REGIONS do
			if entry[1] == H.selectedChart then
				add(function() return mkHeader(content, entry[2]) end)
				break
			end
		end
		add(function()
			local pic = Instance.new("ImageLabel")
			local mapW = math.max(200, content.AbsoluteSize.X - 10)
			pic.Size = UDim2.new(1, -6, 0, math.floor(mapW * 992 / 1586))
			pic.BackgroundTransparency = 1
			pic.Image = "rbxassetid://" .. tostring(chartImage)
			pic.ScaleType = Enum.ScaleType.Fit
			corner(pic, 8)
			return pic
		end)
	else
		local cosLat = 0.66 -- 유럽 위도에서 가로를 줄여 비율을 맞춘다
		-- 손으로 그린 세계지도(1587x991, 지도 영역 x 31~1553, y 98~920)가 있으면 그 위에 항구를 얹는다
		local worldImg = AssetIds["CardArt/event_chart_world"]
		local function mapX(lon)
			if worldImg then
				return (31 + (lon + 180) / 360 * 1522) / 1587
			end
			return (lon - Geo.lonMin) / (Geo.lonMax - Geo.lonMin)
		end
		local function mapY(lat)
			if worldImg then
				return (98 + (80.6 - lat) / 145.4 * 822) / 991
			end
			return (Geo.latMax - lat) / (Geo.latMax - Geo.latMin)
		end
		add(function()
			local frame = Instance.new("Frame")
			-- 지도 비율(가로/세로)에 맞춰 높이를 직접 정한다 (UIAspectRatioConstraint는 스크롤 목록 안에서 높이가 0이 됐다)
			local mapW = math.max(200, content.AbsoluteSize.X - 10)
			frame.Size = UDim2.new(1, -6, 0, if worldImg then math.floor(mapW * 991 / 1587) else math.floor(mapW / ((Geo.cols * cosLat) / Geo.rows)))
			frame.BackgroundColor3 = Color3.fromRGB(38, 82, 120)
			frame.BorderSizePixel = 0
			frame.ClipsDescendants = true
			if worldImg then
				local bg = Instance.new("ImageLabel")
				bg.Size = UDim2.fromScale(1, 1)
				bg.BackgroundTransparency = 1
				bg.Image = "rbxassetid://" .. tostring(worldImg)
				bg.ScaleType = Enum.ScaleType.Stretch
				bg.Parent = frame
				local compass = AssetIds["Menu/chart_compass"]
				if compass then
					local c = Instance.new("ImageLabel")
					c.AnchorPoint = Vector2.new(1, 1)
					c.Position = UDim2.new(1, -8, 1, -8)
					c.Size = UDim2.fromOffset(46, 46)
					c.BackgroundTransparency = 1
					c.Image = "rbxassetid://" .. tostring(compass)
					c.Parent = frame
				end
			else
				drawLand(frame)
			end
			-- 해역 이름
			for _, sea in (if worldImg then {} else H.SEA_NAMES) do
				local lb = Instance.new("TextLabel")
				lb.AnchorPoint = Vector2.new(0.5, 0.5)
				lb.Position = UDim2.fromScale(mapX(sea[3]), mapY(sea[2]))
				lb.Size = UDim2.fromOffset(70, 14)
				lb.BackgroundTransparency = 1
				lb.Text = sea[1]
				lb.Font = Enum.Font.GothamMedium
				lb.TextSize = 11
				lb.TextColor3 = Color3.fromRGB(160, 205, 240)
				lb.TextTransparency = 0.15
				lb.Parent = frame
			end
			-- 선택한 항구까지의 항로선 (실제 해안선을 피한 바닷길)
			if selectedPort and selectedPort ~= view.player.portId then
				local path = SeaRoutes.path(view.player.portId, selectedPort, PortData.Ports)
				for i = 1, #path - 1 do
					local a, b = path[i], path[i + 1]
					local dx = (mapX(b[2]) - mapX(a[2])) * mapW
					local dy = (mapY(b[1]) - mapY(a[1])) * frame.Size.Y.Offset
					local steps = math.max(1, math.ceil(hypot(dx, dy) / 6))
					for k = 1, steps do
						local t = k / steps
						local dotm = Instance.new("Frame")
						dotm.AnchorPoint = Vector2.new(0.5, 0.5)
						dotm.Position = UDim2.fromScale(mapX(a[2] + (b[2] - a[2]) * t), mapY(a[1] + (b[1] - a[1]) * t))
						dotm.Size = UDim2.fromOffset(4, 4)
						dotm.BackgroundColor3 = Color3.fromRGB(255, 226, 120)
						dotm.BorderSizePixel = 0
						dotm.Parent = frame
					end
				end
			end
			local questAt = {}
			for _, r in view.routes do
				if r.quest then
					questAt[r.id] = r.quest
				end
			end
			local nearYardId = view.nearestYard and view.nearestYard.id
			H.mapMark = H.mapMark or "all"
			for id, pt in PortData.Ports do
				local isHere = (id == view.player.portId)
				local dot = Instance.new("TextButton")
				dot.AnchorPoint = Vector2.new(0.5, 0.5)
				dot.Position = UDim2.fromScale(mapX(pt.lon), mapY(pt.lat))
				local small = worldImg ~= nil
				dot.Size = UDim2.fromOffset(if isHere then (if small then 12 else 18) else (if small then 8 else 14), if isHere then (if small then 12 else 18) else (if small then 8 else 14))
				dot.Text = ""
				dot.BackgroundColor3 = if isHere then COLORS.gold elseif id == selectedPort then COLORS.blue else COLORS.red
				local isYard, isQuest = pt.shipyard == true, questAt[id] ~= nil
				if not isHere and id ~= selectedPort then
					if isQuest then
						dot.BackgroundColor3 = Color3.fromRGB(255, 150, 40)
					elseif isYard then
						dot.BackgroundColor3 = COLORS.green
					end
				end
				if id == nearYardId then
					dot.Size = UDim2.fromOffset(if small then 14 else 20, if small then 14 else 20) -- 가장 가까운 조선소는 크게
				end
				if H.mapMark == "yard" and not isYard and not isHere then
					dot.BackgroundTransparency = 0.8
				elseif H.mapMark == "quest" and not isQuest and not isHere then
					dot.BackgroundTransparency = 0.8
				end
				dot.BorderSizePixel = 1
				dot.Parent = frame
				-- 현재 항구는 닻 아이콘으로 크게 표시
				local anchorIcon = if isHere and worldImg then AssetIds["Menu/chart_anchor"] else nil
				if anchorIcon then
					local ai = Instance.new("ImageLabel")
					ai.AnchorPoint = Vector2.new(0.5, 0.5)
					ai.Position = UDim2.fromScale(0.5, 0.5)
					ai.Size = UDim2.fromOffset(30, 30)
					ai.BackgroundTransparency = 1
					ai.Image = "rbxassetid://" .. tostring(anchorIcon)
					ai.ZIndex = 5
					ai.Parent = dot
				end
				local corner = Instance.new("UICorner")
				corner.CornerRadius = UDim.new(1, 0)
				corner.Parent = dot
				local tag = Instance.new("TextLabel")
				tag.BackgroundTransparency = 1
				tag.Position = UDim2.fromOffset(12, -8)
				tag.Size = UDim2.fromOffset(60, 14)
				tag.Text = (if isQuest then "📜" elseif isYard and H.mapMark ~= "all" then "🔧" else "") .. pt.name .. (if id == nearYardId then " ⚓가까운 조선소" else "")
				tag.Font = Enum.Font.GothamBold
				tag.TextSize = 10
				tag.TextColor3 = Color3.new(1, 1, 1)
				tag.TextXAlignment = Enum.TextXAlignment.Left
				tag.Parent = dot
				dot.Activated:Connect(function()
					selectedPort = id
					render()
				end)
			end
			return frame
		end)
		add(function()
			return mkLabel(content, "금색=현재 항구 · 초록=조선소 · 주황=의뢰 목적지 · 빨강=항구 · 항구를 누르면 항로 정보가 나와요", 12, COLORS.muted, false)
		end)
		add(function()
			return mkRow(content, "지도 보기", "강조할 항구를 고르세요", {
				{ text = "전체", color = if H.mapMark == "all" then COLORS.gold else COLORS.blue, onClick = function() H.mapMark = "all"; render() end },
				{ text = "조선소", color = if H.mapMark == "yard" then COLORS.gold else COLORS.blue, onClick = function() H.mapMark = "yard"; render() end },
				{ text = "의뢰", color = if H.mapMark == "quest" then COLORS.gold else COLORS.blue, onClick = function() H.mapMark = "quest"; render() end },
			}, 56)
		end)
	end
	-- 국가 관계·전쟁·다른 항해자
	if view.diplo then
		local dp = view.diplo
		local STATUS = { war = "⚔ 전쟁", hostile = "적대", neutral = "중립", friend = "우호", ally = "동맹", own = "우리" }
		add(function()
			return mkLabel(content, string.format("🏳 국가 관계 — 우리는 %s%s", dp.power.name, if dp.here and dp.here.power then string.format(" · 이 항구: %s (%s)", dp.here.power, STATUS[dp.here.status] or "") else " · 이 항구: 자유 항구"), 15, COLORS.gold, true)
		end)
		if #dp.wars == 0 then
			add(function() return mkLabel(content, "지금은 큰 전쟁이 없어요. 항구들이 평화롭게 오가요.", 12, COLORS.muted, false) end)
		end
		for _, w in dp.wars do
			add(function()
				return mkRow(content, (if w.mine then "⚔ [우리 편 연루] " else "⚔ ") .. w.title, string.format("%s 대 %s · %d년까지\n%s", w.a, w.b, w.until_, w.text), {}, 84)
			end)
		end
		add(function()
			local parts = {}
			for _, r in dp.rel do
				table.insert(parts, string.format("%s %s(%d)", r.name, STATUS[r.status] or "", r.rep))
			end
			return mkLabel(content, table.concat(parts, "  ·  "), 11, COLORS.muted, false)
		end)
		add(function()
			return mkRow(content, "외교", string.format("선물로 호감을 쌓거나, 통행 증서(%d일)로 적국 항구의 입항세를 면해요.%s", 60, if dp.here and dp.here.passLeft > 0 then string.format(" 증서 %d일 남음", dp.here.passLeft) else ""), {
				{ text = string.format("선물 %d", dp.giftCost), color = COLORS.green, onClick = function() call("DiploGift", {}) end, enabled = dp.here ~= nil and dp.here.canGift == true },
				{ text = string.format("증서 %d", dp.passCost), color = COLORS.blue, onClick = function() call("DiploPass", {}) end, enabled = true },
			}, 84)
		end)
		add(function()
			return mkLabel(content, "⚓ 이 항구의 항해자", 14, COLORS.gold, true)
		end)
		if #dp.voyagers == 0 then
			add(function() return mkLabel(content, "지금 이 항구에 머무는 다른 항해자는 없어요.", 12, COLORS.muted, false) end)
		end
		for _, v in dp.voyagers do
			add(function()
				return mkRow(content, string.format("%s · %s (%s)", v.name, v.role, v.power), v.text, {
					{ text = if v.met then "대화" else "인사", color = COLORS.green, onClick = function() call("VoyagerMeet", { id = v.id }) end, enabled = true },
				}, 96)
			end)
		end
		if #dp.sea > 0 then
			add(function()
				local lines = {}
				for _, v in dp.sea do
					table.insert(lines, string.format("%s(%s) %s → %s %d%%", v.name, v.role, v.from, v.to, v.pct))
				end
				return mkLabel(content, "🌊 항해 중: " .. table.concat(lines, " · "), 11, COLORS.muted, false)
			end)
		end
	end
	local function addSelectedRoute()
		if selectedPort and selectedPort ~= view.player.portId then
			for _, r in view.routes do
				if r.id == selectedPort then
					add(function()
						if r.locked then
							return mkRow(content, r.name, string.format("%s · 🔒 %s", r.region, r.locked), {
								{ text = "잠김", color = COLORS.grey, onClick = function() message = r.region .. " 해역은 " .. r.locked; messageOk = false; render() end },
							}, 56)
						end
						local supplyLeft = view.ship.supplies - r.supplies
						local coalLeft = (view.ship.coal or 0) - (r.coal or 0)
						local status = if supplyLeft < 0 then string.format("🔴 보급 %d 부족", -supplyLeft)
							elseif coalLeft < 0 then string.format("🔴 석탄 %d 부족", -coalLeft)
							else string.format("🟢 보급 여유 %d", supplyLeft)
						if view.weather and (view.weather.id == "storm" or view.weather.id == "rain") then
							status ..= if view.weather.id == "storm" then " · 폭풍 주의" else " · 비 주의"
						end
						return mkRow(content, r.name .. (if r.quest then " 📜의뢰" else "") .. (if r.yard then " 🔧조선소" else ""),
							string.format("%s · 항해 %d일 · %d km\n필요 보급 %d%s · %s", r.region, r.days, r.distanceKm, r.supplies, if r.coal > 0 then (" · 석탄 " .. r.coal) else "", status), {
							{ text = "출항 확인", color = if supplyLeft < 0 or coalLeft < 0 then COLORS.red else COLORS.blue, onClick = function() selectedPort = nil; confirmSail(r) end },
						}, 82)
					end)
				end
			end
		end
	end
	if chartImage then
		local ports = {}
		for id, port in PortData.Ports do
			local primary, secondary = H.chartForPort(id)
			if primary == H.selectedChart or secondary == H.selectedChart then
				table.insert(ports, { id = id, name = port.name })
			end
		end
		table.sort(ports, function(a, b)
			if a.name == b.name then return a.id < b.id end
			return a.name < b.name
		end)
		for _, port in ports do
			add(function()
				local label = if port.id == view.player.portId then port.name .. " · 현재 항구" else port.name
				return mkButton(content, label, if port.id == selectedPort then COLORS.blue else COLORS.grey, UDim2.new(1, -6, 0, 44), function()
					selectedPort = port.id
					render()
				end)
			end)
			if port.id == selectedPort then addSelectedRoute() end
		end
		if #ports == 0 then
			add(function() return mkLabel(content, "이 해역에는 선택할 항구가 없어요.", 13, COLORS.muted, false) end)
		end
	elseif selectedPort then
		addSelectedRoute()
		local chart = H.chartForPort(selectedPort)
		if chart and AssetIds["CardArt/event_chart_" .. chart] then
			add(function()
				return mkButton(content, "선택한 항구의 해역 확대", COLORS.blue, UDim2.new(1, -6, 0, 44), function()
					H.selectedChart = chart
					H.showChartPicker = false
					render()
				end)
			end)
		end
	end
end

RENDERERS.yard = renderYard

-- 새 게임 선택 화면 -------------------------------------------------------------

-- 전체 그리기 -----------------------------------------------------------------

-- 탭 아이콘: 이미 등록된 3D 모델(Relics·Naval·People)을 한 가지 표현으로 통일해 쓴다.
H.TAB_ICON = {
	-- [의미 통일] 등록된 투명 황동 원화 우선. 별도 원화가 없는 메뉴만 기존 렌더러의 황동 도형을 쓴다.
	-- 주점: 의뢰판/퀘스트/동료, 전투: 전투/탐험/함대전/카드, 서재: 보고/백과/연구.
	board = { "Glyph", "board" }, quest = { "Menu", "quest" }, recruit = { "Glyph", "recruit" }, explore = { "Menu", "explore" },
	route = { "Menu", "route" }, map = { "Menu", "map" }, trade = { "Menu", "trade" }, harbor = { "Menu", "harbor" },
	yard = { "Menu", "yard" }, battle = { "Menu", "battle" }, war = { "Glyph", "war" }, gwent = { "Glyph", "gwent" },
	scholar = { "Glyph", "scholar" }, codex = { "Menu", "codex" }, tech = { "Glyph", "research" },
	status = { "Glyph", "captain" }, crew = { "Glyph", "crew" },
}
function H.renderTabs()
	-- [중복 렌더 제거] 같은 탭의 상태/재화가 바뀌어도 메뉴 버튼과 원화를 매번 파괴하지 않는다.
	-- 탭 전환 시에만 다시 만들고, 화면 크기 변경은 기존 UIGridLayout이 맡는다.
	if H.renderedTabId == currentTab and tabBar:FindFirstChild("FacilityTab_" .. currentTab) then
		return
	end
	for _, child in tabBar:GetChildren() do
		if child:IsA("TextButton") then
			child:Destroy()
		end
	end
	local g = groupOf(currentTab)
	for i, id in g.tabs do
		local selected = currentTab == id
		local b = mkButton(tabBar, TAB_NAME[id], if selected then COLORS.gold else COLORS.leather, UDim2.fromOffset(68, 38), function()
			currentTab = id
			Sfx.facilityCue(id)
			message = "" -- 지난 탭의 안내 문구가 새 탭 맨 위에 남지 않게
			H.mapPage = nil
			if id ~= "battle" then
				equipped = nil
			end
			render()
		end, true)
		b.Name = "FacilityTab_" .. id
		b.LayoutOrder = i
		b:SetAttribute("SelectedTab", selected)
		b.TextColor3 = if selected then INK else INK_SOFT
		b.TextSize = 16
		local ti = H.TAB_ICON[id]
		if ti then
			-- [공통 규격] 도크는 36px, 시설별 탭은 26px. 아이콘과 인쇄 글자를 겹치지 않게 나눈다.
			local icon = modelIcon(b, ti[1], ti[2], nil, 26, TAB_NAME[id])
			icon.Name = "TabIcon"
			icon.Position = UDim2.new(0, 7, 0.5, -13)
			icon.ClipsDescendants = true
			icon.ZIndex = b.ZIndex + 2
			icon.Parent = b
			local pad = Instance.new("UIPadding")
			pad.PaddingLeft = UDim.new(0, 35)
			pad.Parent = b
			local caption = b:FindFirstChild("PrintedCaption")
			if caption and caption:IsA("TextLabel") then
				caption.Position = UDim2.fromOffset(35, 1)
				caption.Size = UDim2.new(1, -39, 1, -2)
				caption.TextWrapped = false
				caption.TextScaled = true
				local textLimit = Instance.new("UITextSizeConstraint")
				textLimit.MinTextSize = 10
				textLimit.MaxTextSize = 14
				textLimit.Parent = caption
			else
				b.TextXAlignment = Enum.TextXAlignment.Right
				b.TextSize = 14
			end
		end
		if selected then
			-- [선택 상태] 글자색 외에 황동 밑줄을 넣어 원화 색을 바꾸지 않고도 선택 탭이 드러나게 한다.
			local rule = Instance.new("Frame")
			rule.Name = "ActiveTabRule"
			rule.BackgroundColor3 = UI_BRASS_DARK
			rule.BorderSizePixel = 0
			rule.Position = UDim2.new(0, 8, 1, -4)
			rule.Size = UDim2.new(1, -16, 0, 3)
			rule.ZIndex = b.ZIndex + 3
			rule.Parent = b
		end
	end
	H.renderedTabId = currentTab
end

-- 모든 시설 창 오른쪽 위 모서리의 × 닫기 버튼
H.closeX = Instance.new("TextButton")
H.closeX.Name = "CloseX"
H.closeX.AnchorPoint = Vector2.new(1, 0)
H.closeX.Position = UDim2.new(1, -8, 0, 8)
H.closeX.Size = UDim2.fromOffset(40, 40)
H.closeX.BackgroundColor3 = COLORS.leather
H.closeX.Text = "×"
H.closeX.Font = Enum.Font.GothamBold
H.closeX.TextSize = 30
H.closeX.TextColor3 = Color3.fromRGB(255, 244, 214)
H.closeX.AutoButtonColor = true
H.closeX.ZIndex = 30
H.closeX.Parent = mainInner
corner(H.closeX, 8)
hudStroke(H.closeX, 1.5)
H.closeX.Activated:Connect(function()
	Sfx.play("sfx_click")
	main.Visible = false
	menuToggle.Visible = true
end)

-- 3D 항구 장면: 항구나 배가 바뀔 때만 다시 만든다
syncScene = function()
	if sceneHold or inField then
		return -- 항해 중·지상 탐험 중에는 항구 장면을 다시 짓거나 캐릭터를 항구로 되돌리지 않는다
	end
	-- 서버가 CC0 모델을 불러오는 동안(최대 약 25초) 기다렸다가 장면을 만든다
	local RS = game:GetService("ReplicatedStorage")
	if not RS:GetAttribute("MareAssetsReady") and not H.assetWaitDone then
		if not assetWaitStarted then
			assetWaitStarted = true
			task.spawn(function()
				local t0 = os.clock()
				while not RS:GetAttribute("MareAssetsReady") and os.clock() - t0 < 45 do
					task.wait(0.3)
				end
				H.assetWaitDone = true -- 모델이 덜 와도 장면은 만든다 (하늘에 캐릭터만 뜨는 것 방지)
				sceneKey = nil
				if view then
					syncScene()
				end
			end)
		end
		return
	end
	local p, ship = view.player, view.ship
	local crew = {}
	for _, c in (view.companions and view.companions.list) or {} do
		if c.joined then
			table.insert(crew, { id = c.id, name = c.name })
		end
	end
	local crewIds = {}
	for _, c in crew do
		table.insert(crewIds, c.id)
	end
	local portLevel = (view.harbor and view.harbor.level) or 1
	-- 발전도가 오르면 마을이 바로 바뀌지 않고, 공사 기간(일꾼이 짓는 모습)을 거친 뒤 새 단계로 바뀐다
	H.shownLv = H.shownLv or {}
	H.buildDue = H.buildDue or {}
	local shownLv = H.shownLv[p.portId]
	if shownLv == nil or portLevel < shownLv then
		shownLv = portLevel
		H.shownLv[p.portId] = portLevel
	end
	local construction = nil
	if portLevel > shownLv then
		local secs = math.clamp(40 * (portLevel - shownLv), 40, 120)
		construction = { to = portLevel, seconds = secs }
		if not H.buildDue[p.portId] then
			H.buildDue[p.portId] = true
			local pid = p.portId
			task.delay(secs, function()
				H.buildDue[pid] = nil
				H.shownLv[pid] = nil -- 다음 동기화에서 현재 단계로 확정
				sceneKey = nil
				if syncScene then pcall(syncScene) end
			end)
		end
		portLevel = shownLv
	end
	local econKind = view.harbor and view.harbor.regime and view.harbor.regime.kind or "normal"
	local eco = view.harbor and view.harbor.economy or {}
	-- [실물경제·시대] 기존 항구 정적 경기가 아니라 공통 세계의 최신 기술·인구를 3D 장면에 연결한다.
	local sim = view.harbor and view.harbor.sim
	local techStamp = sim and sim.technology and sim.technology.adopted or 0
	local industryStamp = 0
	for _, row in ipairs((sim and sim.industries) or {}) do industryStamp += row.stage end
	-- 세계경제 건물 재고가 변할 때 장면이 정지한 상태로 남지 않도록 단계 버킷만 캐시에 반영한다.
	-- 방문할 때마다 무조건 재생성하지 않고, 시장·창고·부두·주택의 의미 있는 변화에서만 갱신한다.
	local bld = sim and sim.buildings or {}
	local buildStamp = table.concat({
		math.floor(math.sqrt(math.max(0, bld.house or 0)) / 2),
		math.floor(math.sqrt(math.max(0, bld.market or 0))),
		math.floor(math.sqrt(math.max(0, bld.warehouse or 0))),
		math.floor(math.sqrt(math.max(0, bld.dock or 0))),
		math.floor(math.sqrt(math.max(0, bld.farm or 0))),
		math.floor(math.sqrt(math.max(0, bld.workshop or 0))),
		math.floor(math.sqrt(math.max(0, bld.school or 0))),
		math.floor(math.sqrt(math.max(0, bld.hall or 0))),
	}, ":")
	local developed = view.village and view.village.here
	local owned = (view.harbor and view.harbor.builtLandmarks) or {}
	local builtIds = {}
	for id, has in pairs(owned) do if has == true then table.insert(builtIds, id) end end
	table.sort(builtIds)
	local siteStamp = tostring(developed and developed.blocks or 4) .. "|"
		.. tostring(sim and sim.construction and sim.construction.active or false)
		.. "|" .. table.concat(builtIds, ",")
	local boostIds = {}
	for _, b in eco.boosts or {} do
		table.insert(boostIds, b.id or b.name)
	end
	local econBucket = tostring(math.floor((eco.index or 100) / 25)) .. "u" .. tostring(math.floor((eco.unemployment or 12) / 5)) .. table.concat(boostIds, "+")
	local key = p.portId .. "|Y" .. tostring(p.year) .. "|E" .. econKind .. econBucket .. "|L" .. portLevel .. "|S" .. tostring(sim and (sim.stage .. "_" .. math.floor(sim.residents / 4) .. "_T" .. techStamp .. "_I" .. industryStamp .. "_B" .. buildStamp) or "-") .. "|V" .. siteStamp .. (if construction then "|C" else "") .. "|" .. ship.id .. "|" .. table.concat(view.facilities or {}, ",") .. "|" .. tostring(p.hasShipyard) .. "|" .. tostring(#(view.story or {}) > 0) .. "|" .. table.concat(crewIds, ",") .. "|v" .. #((view.diplo and view.diplo.voyagers) or {})
	if key == sceneKey then
		if sceneCtl and sceneCtl.setDay then sceneCtl.setDay(p.day) end
		return
	end
	workspace:SetAttribute("PortMood", sim and sim.mood or "steady")
	local ok, res = pcall(PortScene.build, {
		portId = p.portId,
		portName = p.portName,
		level = portLevel,
		construction = construction,
		econ = econKind,
		econIndex = eco.index,
		sim = sim,
		unemployment = eco.unemployment,
		vacancy = eco.vacancy,
		migration = eco.migration,
		boosts = boostIds,
		shipId = ship.id,
		hasShipyard = p.hasShipyard,
		facilities = view.facilities,
		palaceName = view.palace and view.palace.name,
		development = view.village and view.village.here,
		builtLandmarks = view.harbor and view.harbor.builtLandmarks,
		year = p.year,
		day = p.day,
		storyCount = #(view.story or {}),
		companions = crew,
		voyagers = view.diplo and view.diplo.voyagers,
		arrive = arriveNext,
	}, function(tab)
		currentTab = tab
		H.mapPage = nil
		menuToggle.Visible = false
		if tab == "trade" then
			openTradeHall()
		elseif tab == "yard" then
			openYardHall()
		else
			main.Visible = true
			render()
		end
	end)
	if not ok then
		warn("[Game] 항구 장면 오류", res)
		return
	end
	sceneKey = key
	sceneCtl = res.controls
	arriveNext = false
	sceneSpawn = res.spawn
	local char = player.Character
	if char and char:FindFirstChild("HumanoidRootPart") then
		char:PivotTo(res.spawn)
	end
	applyView()
end

-- 항구 전경: 대항해시대 온라인처럼 항구 전체를 보여 주는 고정 시점 (천천히 흔들린다)
do
	local camBase = CFrame.lookAt(Vector3.new(72, 20, 54), Vector3.new(-28, 9, -4))
	applyView = function()
		if inField then
			return -- 지상 탐험 중에는 항구 전경이 캐릭터를 고정하거나 카메라를 빼앗지 못한다
		end
		local camera = workspace.CurrentCamera
		local char = player.Character
		local root = char and char:FindFirstChild("HumanoidRootPart")
		if overview then
			camera.CameraType = Enum.CameraType.Scriptable
			camera.FieldOfView = 62
			if root and sceneSpawn then
				-- 전경에서도 캐릭터를 실제 항구 바닥에 세운다. 허공(-200, 8, 0) 대기를 금지한다.
				char:PivotTo(sceneSpawn)
				root.Anchored = true
			end
		else
			camera.CameraType = Enum.CameraType.Custom
			camera.FieldOfView = 70
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			if hum then
				camera.CameraSubject = hum
			end
			if char and root and sceneSpawn then
				char:PivotTo(sceneSpawn)
				root.Anchored = false -- 실제 항구 바닥에 옮긴 뒤 걷기 조작 복구
			end
		end
	end
	-- 걷는 발소리: 항구·갑판을 걸을 때 두 소리를 번갈아 낸다
	task.spawn(function()
		local alt = false
		while true do
			task.wait(0.4)
			local c = player.Character
			local hum = c and c:FindFirstChildOfClass("Humanoid")
			local rt = c and c:FindFirstChild("HumanoidRootPart")
			if hum and rt and not rt.Anchored and hum.MoveDirection.Magnitude > 0.1 and hum.FloorMaterial ~= Enum.Material.Air then
				alt = not alt
				Sfx.play(if alt then "sfx_deck_step" else "sfx_deck_step_alt", 0.28, 0.95 + math.random() * 0.15)
			end
		end
	end)
	-- 바다·바닥 아래로 떨어지면 항구 시작 지점으로 되돌린다 (걷다가 물에 빠지는 사고 방지)
	task.spawn(function()
		while true do
			task.wait(0.4)
			local char = player.Character
			local root = char and char:FindFirstChild("HumanoidRootPart")
			if root and sceneSpawn and not inField and not workspace:GetAttribute("VoyageActive") then
				local p = root.Position
				if p.Y < -3 and p.X < 400 and p.X > -900 then
					root.AssemblyLinearVelocity = Vector3.zero
					char:PivotTo(sceneSpawn)
				end
			end
		end
	end)
	game:GetService("RunService").RenderStepped:Connect(function()
		local camera = workspace.CurrentCamera
		if workspace:GetAttribute("ShotCF") or workspace:GetAttribute("VoyageActive") then
			return -- 개발용 캡처 카메라(devloop-studio)가 켜져 있으면 전경 카메라는 양보한다
		end
		if overview and not inField and not sceneHold and camera.CameraType == Enum.CameraType.Scriptable then
			local t = os.clock()
			camera.CFrame = camBase * CFrame.new(math.sin(t * 0.25) * 5, math.sin(t * 0.4) * 0.7, 0)
		end
	end)
end

local optionsGui = nil
local function closeOptions()
	if optionsGui then
		optionsGui:Destroy()
		optionsGui = nil
	end
end
H.HELP_LINES = {
	"⚓ 기본 흐름",
	"1. 교역소에서 특산품을 싸게 삽니다.",
	"2. 항만청(지도)에서 수요가 높은 항구로 출항합니다.",
	"3. 도착한 항구에서 팔아 이익을 남깁니다.",
	"4. 주점에서 동료를 영입하고 의뢰를 받습니다.",
	"5. 명성과 모험 레벨이 오르면 먼 바다가 열려요.",
	"",
	"🧭 조작",
	"· 오른쪽 메뉴 버튼으로 교역·항해·조선소 등 화면을 엽니다.",
	"· '걷기' 버튼으로 항구 전경과 걷기 시점을 바꿉니다.",
	"· 항해 중 화면을 누르면 연출을 건너뜁니다.",
}
openOptions = function(helpOnly)
	closeOptions()
	local layer = overlayGui("Options", 60)
	optionsGui = layer
	local helpOpen, confirmNew = helpOnly == true, false
	local dim = Instance.new("TextButton")
	dim.Size = UDim2.fromScale(1, 1)
	dim.BackgroundColor3 = Color3.new(0, 0, 0)
	dim.BackgroundTransparency = 0.45
	dim.Text = ""
	dim.AutoButtonColor = false
	dim.BorderSizePixel = 0
	dim.Parent = layer
	dim.Activated:Connect(closeOptions)
	local win = Instance.new("Frame")
	win.AnchorPoint = Vector2.new(0.5, 0.5)
	win.Position = UDim2.fromScale(0.5, 0.5)
	win.Size = UDim2.fromScale(0.94, 0.86)
	win.BackgroundColor3 = COLORS.cover
	win.BorderSizePixel = 0
	win.Parent = layer
	corner(win, 16)
	local wst = Instance.new("UIStroke")
	wst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	wst.Color = BRASS
	wst.Thickness = 2.5
	wst.Parent = win
	local limit = Instance.new("UISizeConstraint")
	limit.MaxSize = Vector2.new(560, 520)
	limit.MinSize = Vector2.new(0, 0)
	limit.Parent = win
	local bar = mkBox(win, UDim2.fromScale(0, 0), UDim2.new(1, 0, 0, 46), Color3.fromRGB(40, 32, 18))
	corner(bar, 16)
	local ttl = mkLabel(bar, if helpOnly then "항해 도움말" else "시스템 설정", 20, Color3.fromRGB(246, 208, 130), true)
	ttl.Position = UDim2.fromOffset(16, 9)
	ttl.Size = UDim2.new(1, -70, 0, 28)
	ttl.AutomaticSize = Enum.AutomaticSize.None
	local x = mkButton(bar, "X", Color3.fromRGB(150, 54, 54), UDim2.fromOffset(38, 32), closeOptions, true)
	x.AnchorPoint = Vector2.new(1, 0.5)
	x.Position = UDim2.new(1, -8, 0.5, 0)
	x.TextSize = 16
	local body = Instance.new("ScrollingFrame")
	body.BackgroundTransparency = 1
	body.BorderSizePixel = 0
	body.Position = UDim2.fromOffset(12, 54)
	body.Size = UDim2.new(1, -24, 1, -64)
	body.ScrollBarThickness = 4
	body.AutomaticCanvasSize = Enum.AutomaticSize.Y
	body.CanvasSize = UDim2.new()
	body.Parent = win
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 8)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = body

	local function draw()
		for _, c in body:GetChildren() do
			if not c:IsA("UIListLayout") then
				c:Destroy()
			end
		end
		local order = 0
		local function nxt()
			order += 1
			return order
		end
		local function section(text)
			local l = mkLabel(body, text, 14, Color3.fromRGB(226, 182, 92), true, nxt())
			l.Size = UDim2.new(1, 0, 0, 22)
			l.AutomaticSize = Enum.AutomaticSize.None
		end
		-- 한 줄: 이름 + 오른쪽 버튼들
		local function row(name, sub, buttons)
			local r = mkBox(body, UDim2.new(), UDim2.new(1, -4, 0, 52), Color3.fromRGB(24, 34, 50))
			r.LayoutOrder = nxt()
			corner(r, 10)
			local n = mkLabel(r, name, 15, COLORS.text, true)
			n.Position = UDim2.fromOffset(12, if sub then 7 else 15)
			n.Size = UDim2.new(1, -24 - #buttons * 76, 0, 20)
			n.AutomaticSize = Enum.AutomaticSize.None
			if sub then
				local sl = mkLabel(r, sub, 12, COLORS.muted, false)
				sl.Position = UDim2.fromOffset(12, 28)
				sl.Size = UDim2.new(1, -24 - #buttons * 76, 0, 18)
				sl.AutomaticSize = Enum.AutomaticSize.None
			end
			for i, b in buttons do
				local btn = mkButton(r, b.text, b.color or COLORS.blue, UDim2.fromOffset(68, 36), b.onClick, true)
				btn.AnchorPoint = Vector2.new(1, 0.5)
				btn.Position = UDim2.new(1, -8 - (#buttons - i) * 76, 0.5, 0)
				btn.TextSize = 13
			end
		end
		if not helpOnly then
			section("⛵ 항해 방식")
			do
				local manualOn = player:GetAttribute("ManualHelm") ~= false
				row("수동 항해", if manualOn then "켜짐(기본): 바람 고리 항해" else "꺼짐: 자동 항해", {
					{ text = if manualOn then "자동으로" else "직접 조종", color = if manualOn then COLORS.grey else COLORS.green, onClick = function() player:SetAttribute("ManualHelm", not manualOn); draw() end },
				})
			end
			section("🔊 소리")
			do
				local musicOn, sfxOn = Sfx.state()
				local ml, sl = Sfx.levels()
				row("음악  " .. math.floor(ml / 1.5 * 100 + 0.5) .. "%", if musicOn then "켜짐" else "꺼짐", {
					{ text = if musicOn then "끄기" else "켜기", color = if musicOn then COLORS.grey else COLORS.green, onClick = function() Sfx.setMusicEnabled(not musicOn); draw() end },
					{ text = "－", color = COLORS.grey, onClick = function() Sfx.stepMusic(-1); draw() end },
					{ text = "＋", color = COLORS.blue, onClick = function() Sfx.stepMusic(1); draw() end },
				})
				row("효과음  " .. math.floor(sl / 1.5 * 100 + 0.5) .. "%", if sfxOn then "켜짐" else "꺼짐", {
					{ text = if sfxOn then "끄기" else "켜기", color = if sfxOn then COLORS.grey else COLORS.green, onClick = function() Sfx.setSfxEnabled(not sfxOn); draw() end },
					{ text = "－", color = COLORS.grey, onClick = function() Sfx.stepSfx(-1); draw() end },
					{ text = "＋", color = COLORS.blue, onClick = function() Sfx.stepSfx(1); draw() end },
				})
			end
			section("🖥 화면")
			row("항구 보기", if overview then "전경 시점" else "걷기 시점", {
				{ text = if overview then "걷기" else "전경", color = COLORS.blue, onClick = function() overview = not overview; applyView(); draw() end },
			})
			local large = player:GetAttribute("LargeHudText") == true
			row("글자 크기", "선장 정보 · 대화 · 도움말", {
				{ text = if large then "보통" else "크게", onClick = function()
					player:SetAttribute("LargeHudText", not large)
					draw()
				end },
			})
		end
		section("📖 도움말")
		if not helpOnly then
			row("게임 방법", "교역 · 항해 · 의뢰의 기본 흐름", {
				{ text = if helpOpen then "접기" else "보기", color = COLORS.blue, onClick = function() helpOpen = not helpOpen; draw() end },
			})
		end
		if helpOpen then
			local hl = mkLabel(body, table.concat(H.HELP_LINES, "\n"), if player:GetAttribute("LargeHudText") then 18 else 15, COLORS.text, false, nxt())
			hl.Size = UDim2.new(1, -16, 0, 0)
		end
		if not helpOnly then
			section("🗂 게임")
			row("저장", "진행은 자동으로 저장돼요", {})
			if view then
				if confirmNew then
					row("정말 새로 시작할까요?", "지금 진행 상황은 사라져요", {
						{ text = "취소", color = COLORS.grey, onClick = function() confirmNew = false; draw() end },
						{ text = "시작", color = COLORS.red, onClick = function()
							closeOptions()
							newGameMode = true
							render()
						end },
					})
				else
					row("새 게임", "나라를 다시 고릅니다 (1517년 시작)", {
						{ text = "새 게임", color = COLORS.red, onClick = function() confirmNew = true; draw() end },
					})
				end
			end
		end
		if not helpOnly then
			section("그림 출처")
			local credits = mkLabel(body, "메뉴·상품 그림: Lorc · Delapouite · Lord Berandas · Skoll / game-icons.net / CC BY 3.0\n사프란: Tiny Speck·Bart / CC0 · 대추야자·건포도: 게임 전용 원화", 12, COLORS.text, false, nxt())
			credits.Size = UDim2.new(1, -12, 0, 0)
			credits.AutomaticSize = Enum.AutomaticSize.Y
		end
		local back = mkButton(body, "게임으로 돌아가기", COLORS.gold, UDim2.new(1, -4, 0, 46), closeOptions, true)
		back.LayoutOrder = nxt()
		back.TextSize = 17
		back.TextColor3 = Color3.fromRGB(22, 14, 4)
	end
	draw()
end

-- 원더 연출: 큰 원화가 연필 스케치 → 채색 순서로 스스로 그려지고 음악이 흐른다 (약 10초, 눌러서 건너뛰기)
function H.playWonderScene(cardId)
	local WS = require(Shared:WaitForChild("WonderScenes"))
	local sc = WS.Scenes[cardId]
	local assetId = sc and AssetIds["CardArt/" .. sc.art]
	if not sc or not assetId or H.sceneBusy then
		return
	end
	H.sceneBusy = true
	local TS = game:GetService("TweenService")
	local mood = WS.Moods[sc.mood] or WS.Moods.temple
	local prevMusic = Sfx.current()
	local layer = overlayGui("WonderScene", 60)
	local alive = true
	local root = Instance.new("TextButton")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(10, 8, 6)
	root.BackgroundTransparency = 1
	root.Text = ""
	root.AutoButtonColor = false
	root.ZIndex = 100
	root.Parent = layer
	TS:Create(root, TweenInfo.new(0.8), { BackgroundTransparency = 0 }):Play()
	-- 16:9 액자
	local frame = Instance.new("Frame")
	frame.AnchorPoint = Vector2.new(0.5, 0.5)
	frame.Position = UDim2.fromScale(0.5, 0.46)
	frame.Size = UDim2.fromScale(0.94, 0.94)
	frame.BackgroundColor3 = Color3.fromRGB(236, 222, 190)
	frame.BackgroundTransparency = 0
	frame.ZIndex = 101
	frame.ClipsDescendants = true
	frame.Parent = root
	local ratio = Instance.new("UIAspectRatioConstraint")
	ratio.AspectRatio = 16 / 9
	ratio.Parent = frame
	local fstroke = Instance.new("UIStroke")
	fstroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	fstroke.Thickness = 3
	fstroke.Color = Color3.fromRGB(212, 168, 74)
	fstroke.Parent = frame
	local image = "rbxthumb://type=Asset&id=" .. tostring(assetId) .. "&w=768&h=432"
	local N = 14
	local zoom = Instance.new("Frame") -- 천천히 다가가는 화면 (Ken Burns)
	zoom.AnchorPoint = Vector2.new(0.5, 0.5)
	zoom.Position = UDim2.fromScale(0.5, 0.5)
	zoom.Size = UDim2.fromScale(1, 1)
	zoom.BackgroundTransparency = 1
	zoom.ZIndex = 102
	zoom.Parent = frame
	-- 두 겹: 스케치(바랜 갈색, 윗줄부터 붓질처럼) → 채색(왼쪽에서 오른쪽으로 번져 가며)
	local strips = {}
	for i = 1, N do
		local x0 = (i - 1) / N
		local sk = Instance.new("Frame") -- 스케치 줄
		sk.Position = UDim2.fromScale(x0, 0)
		sk.Size = UDim2.new(1 / N + 0.002, 0, 0, 0)
		sk.BackgroundTransparency = 1
		sk.ClipsDescendants = true
		sk.ZIndex = 103
		sk.Parent = zoom
		local ski = Instance.new("ImageLabel")
		ski.BackgroundTransparency = 1
		ski.Image = image
		ski.ImageColor3 = Color3.fromRGB(150, 120, 86)
		ski.ImageTransparency = 0.5
		ski.Position = UDim2.fromScale(-x0 * N, 0)
		ski.Size = UDim2.fromScale(N, 1)
		ski.ZIndex = 103
		ski.Parent = sk
		sk:SetAttribute("full", 1)
		local co = Instance.new("Frame") -- 채색 줄
		co.Position = UDim2.fromScale(x0, 0)
		co.Size = UDim2.new(1 / N + 0.002, 0, 1, 0)
		co.BackgroundTransparency = 1
		co.ClipsDescendants = true
		co.ZIndex = 104
		co.Parent = zoom
		local coi = Instance.new("ImageLabel")
		coi.BackgroundTransparency = 1
		coi.Image = image
		coi.ImageTransparency = 1
		coi.Position = UDim2.fromScale(-x0 * N, 0)
		coi.Size = UDim2.fromScale(N, 1)
		coi.ZIndex = 104
		coi.Parent = co
		strips[i] = { sk = sk, coi = coi }
	end
	local D = WS.Duration
	-- 자막
	local cap = Instance.new("TextLabel")
	cap.AnchorPoint = Vector2.new(0.5, 1)
	cap.Position = UDim2.fromScale(0.5, 0.985)
	cap.Size = UDim2.new(0.9, 0, 0, 74)
	cap.BackgroundTransparency = 1
	cap.TextColor3 = Color3.fromRGB(246, 232, 200)
	cap.TextStrokeTransparency = 1
	cap.Font = Enum.Font.Gotham
	cap.TextSize = 17
	cap.TextWrapped = true
	cap.Text = ""
	cap.ZIndex = 110
	cap.Parent = root
	local ttl = Instance.new("TextLabel")
	ttl.AnchorPoint = Vector2.new(0.5, 0)
	ttl.Position = UDim2.fromScale(0.5, 0.02)
	ttl.Size = UDim2.new(0.9, 0, 0, 40)
	ttl.BackgroundTransparency = 1
	ttl.TextTransparency = 1
	ttl.TextColor3 = Color3.fromRGB(246, 214, 120)
	ttl.TextStrokeTransparency = 1
	ttl.Font = Enum.Font.GothamBold
	ttl.TextSize = 28
	ttl.Text = sc.title
	ttl.ZIndex = 110
	ttl.Parent = root
	local hint = Instance.new("TextLabel")
	hint.AnchorPoint = Vector2.new(1, 0)
	hint.Position = UDim2.new(1, -12, 0, 8)
	hint.Size = UDim2.fromOffset(140, 20)
	hint.BackgroundTransparency = 1
	hint.TextColor3 = Color3.fromRGB(180, 168, 140)
	hint.Font = Enum.Font.Gotham
	hint.TextSize = 12
	hint.TextXAlignment = Enum.TextXAlignment.Right
	hint.Text = "화면을 누르면 건너뛰기"
	hint.ZIndex = 110
	hint.Parent = root
	Sfx.music(Sfx.wonderMusic(sc.mood, mood.music))
	Sfx.play(Sfx.wonderCue(sc.mood, mood.sfx))

	local function finish()
		if not alive then
			return
		end
		alive = false
		H.sceneBusy = false
		Sfx.play("sfx_fanfare", 0.6)
		Sfx.music(prevMusic)
		local tw = TS:Create(root, TweenInfo.new(0.6), { BackgroundTransparency = 1 })
		tw:Play()
		for _, d in root:GetDescendants() do
			if d:IsA("ImageLabel") then
				TS:Create(d, TweenInfo.new(0.6), { ImageTransparency = 1 }):Play()
			elseif d:IsA("TextLabel") then
				TS:Create(d, TweenInfo.new(0.6), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
			end
		end
		task.delay(0.7, function()
			layer:Destroy()
		end)
	end
	root.Activated:Connect(finish)

	task.spawn(function()
		task.wait(0.8)
		-- 1) 스케치: 줄마다 위에서 아래로 붓질 (약 3.5초, 줄은 엇갈려 시작)
		for i, s in strips do
			local delay = (i - 1) * 0.12
			task.delay(delay, function()
				if alive then
					TS:Create(s.sk, TweenInfo.new(1.6, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), { Size = UDim2.new(1 / N + 0.002, 0, 1, 0) }):Play()
				end
			end)
		end
		-- 2) 채색: 왼쪽에서 오른쪽으로 색이 번진다 (3초부터 약 4.5초)
		task.delay(3, function()
			for i, s in strips do
				task.delay((i - 1) * 0.2, function()
					if alive then
						TS:Create(s.coi, TweenInfo.new(1.4, Enum.EasingStyle.Sine), { ImageTransparency = 0 }):Play()
					end
				end)
			end
		end)
		-- 천천히 다가가기
		TS:Create(zoom, TweenInfo.new(D, Enum.EasingStyle.Linear), { Size = UDim2.fromScale(1.1, 1.1) }):Play()
		-- 3) 제목과 자막
		task.delay(4.5, function()
			if alive then
				TS:Create(ttl, TweenInfo.new(1), { TextTransparency = 0, TextStrokeTransparency = 1 }):Play()
			end
		end)
		for i, line in sc.lines do
			task.delay(5.5 + (i - 1) * 1.4, function()
				if alive then
					cap.Text = line
					cap.TextTransparency = 1
					TS:Create(cap, TweenInfo.new(0.5), { TextTransparency = 0 }):Play()
				end
			end)
		end
		task.wait(D)
		finish()
	end)
end

function H.startNewGame()
	local restart = view ~= nil
	newGameMode = false
	sceneHold = true -- 오프닝이 끝날 때까지 마을 장면을 먼저 짓지 않는다
	local result = call("NewGame", { nationId = chosenNation, startYear = chosenYear, origin = H.chosenOrigin, restart = restart, room = H.roomMode == true })
	if not (result and result.ok) then
		sceneHold = false
	end
	if not (result and result.ok) and restart then
		newGameMode = true
		render()
	end
	-- 프롤로그 없이 곧바로 시작 항구에서 시작한다 (플레이어는 3인칭 이야기 속 새 선장)
	if result and result.ok then
		arriveNext = false
		sceneKey = nil
		sceneHold = false
		main.Visible = true
		menuToggle.Visible = false
		H.openingPending = true
		H.tutorialHidden = false
		render()
	end
end

-- 시작 화면: 백과사전 원화와 표지 제목
local titleGui = overlayGui("TitleBackdrop", 1)
titleGui.ScreenInsets = Enum.ScreenInsets.None
titleGui.ClipToDeviceSafeArea = false
titleGui.Enabled = false
;(function()
	local root = mkBox(titleGui, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(40, 76, 98))
	root.ClipsDescendants = true
	local seaId = AssetIds["CardArt/event_title_sea"]
	local shipId = AssetIds["CardArt/event_title_ship"]
	local layered = seaId ~= nil and shipId ~= nil
	local art = Instance.new("ImageLabel")
	art.Name = "TitleSea"
	art.AnchorPoint = Vector2.new(0.5, 1)
	art.Position = UDim2.fromScale(0.5, 1)
	art.Size = UDim2.fromScale(1, 1)
	art.BackgroundTransparency = 1
	art.Image = "rbxassetid://" .. tostring(if layered then seaId else AssetIds["CardArt/event_calm_seas"])
	art.ScaleType = if layered then Enum.ScaleType.Stretch else Enum.ScaleType.Crop
	art.Parent = root
	local ship = Instance.new("ImageLabel")
	ship.Name = "TitlePaintedShip"
	ship.BackgroundTransparency = 1
	ship.AnchorPoint = Vector2.new(0.5, 0.5)
	ship.ZIndex = 3
	ship.Visible = layered
	if shipId then ship.Image = "rbxassetid://" .. tostring(shipId) end
	ship.Parent = root
	local water = Instance.new("Frame")
	water.Name = "TitleForegroundWater"
	water.BackgroundTransparency = 1
	water.ClipsDescendants = true
	water.ZIndex = 4
	water.Visible = layered
	water.Parent = root
	local surface = art:Clone()
	surface.Name = "WaterSurface"
	surface.ZIndex = 4
	surface.Parent = water
	local shipX, shipY, waveHeight = 0, 0, 0

	local rays = mkBox(root, UDim2.fromScale(0.03, 0), UDim2.fromScale(0.72, 0.68), Color3.fromRGB(255, 226, 170), 0.62)
	rays.ZIndex = 2
	local rayFade = Instance.new("UIGradient")
	rayFade.Rotation = 30
	rayFade.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.38, 1),
		NumberSequenceKeypoint.new(0.49, 0.48), NumberSequenceKeypoint.new(0.60, 1),
		NumberSequenceKeypoint.new(1, 1),
	})
	rayFade.Parent = rays

	local shade = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(23, 26, 30), 0.28)
	shade.ZIndex = 5
	local shadeFade = Instance.new("UIGradient")
	shadeFade.Transparency = NumberSequence.new(1, 0)
	shadeFade.Parent = shade
	local heading = mkLabel(root, "마레 에센시아", 46, COLORS.paper, true)
	heading.Font = Enum.Font.Antique
	heading.AutomaticSize = Enum.AutomaticSize.None
	heading.TextScaled = true
	heading.TextWrapped = false
	heading.TextStrokeColor3 = COLORS.ink
	heading.TextStrokeTransparency = 0.48
	heading.ZIndex = 6
	local limit = Instance.new("UITextSizeConstraint")
	limit.MaxTextSize = 46
	limit.Parent = heading
	local subtitle = mkLabel(root, "학문의 바다", 19, Color3.fromRGB(251, 223, 167), true)
	subtitle.Font = Enum.Font.Antique
	subtitle.AutomaticSize = Enum.AutomaticSize.None
	subtitle.TextStrokeColor3 = COLORS.ink
	subtitle.TextStrokeTransparency = 0.6
	subtitle.ZIndex = 6
	local curtain = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(19, 24, 30), 1)
	curtain.ZIndex = 8

	local function layout()
		local width, height = root.AbsoluteSize.X, root.AbsoluteSize.Y
		local portrait = width < height
		if layered then
			local seaHeight = if portrait then height * 2.05 else math.max(height, math.min(width * 0.68, height * 1.5))
			art.Size = UDim2.fromOffset(math.max(width, seaHeight * 0.72), seaHeight)
			surface.Size = art.Size
			local waterline = height - seaHeight * 0.14
			local shipSize = math.min(width * (if portrait then 0.81 else 0.39), waterline * (if portrait then 0.69 else 0.72))
			water.Position = UDim2.fromOffset(0, waterline)
			water.Size = UDim2.new(1, 0, 0, height - waterline)
			shipX = width * (if portrait then 0.5 else 0.29)
			shipY = waterline - shipSize * 0.408
			waveHeight = math.clamp(shipSize * 0.009, 1.5, 4.5)
			ship.Size = UDim2.fromOffset(shipSize, shipSize)
			ship.Position = UDim2.fromOffset(shipX, shipY)
		end
		shadeFade.Rotation = if portrait then 90 else 0
		heading.Position = if portrait then UDim2.new(0.07, 0, 0, 74) else UDim2.new(0.04, 0, 0, 48)
		heading.Size = if portrait then UDim2.new(0.86, 0, 0, 46) else UDim2.new(0.48, 0, 0, 49)
		heading.TextXAlignment = if portrait then Enum.TextXAlignment.Center else Enum.TextXAlignment.Left
		subtitle.Position = heading.Position + UDim2.fromOffset(0, heading.Size.Y.Offset + 2)
		subtitle.Size = UDim2.new(heading.Size.X.Scale, 0, 0, 26)
		subtitle.TextXAlignment = heading.TextXAlignment
	end
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(layout)
	layout()

	local connection, previousTouch
	local playerGui = player:WaitForChild("PlayerGui")
	local function hideTouch(guiObject)
		if guiObject.Name == "TouchGui" and guiObject:IsA("ScreenGui") and titleGui.Enabled then
			previousTouch = guiObject.Enabled
			guiObject.Enabled = false
		end
	end
	playerGui.ChildAdded:Connect(hideTouch)
	titleGui:GetPropertyChangedSignal("Enabled"):Connect(function()
		if connection then connection:Disconnect(); connection = nil end
		local touch = playerGui:FindFirstChild("TouchGui")
		if not titleGui.Enabled then
			if touch and previousTouch ~= nil then touch.Enabled = previousTouch end
			previousTouch = nil
			return
		end
		if touch then hideTouch(touch) end
		local started = os.clock()
		curtain.BackgroundTransparency = 0
		connection = game:GetService("RunService").RenderStepped:Connect(function()
			local now = os.clock()
			local t = now - started
			curtain.BackgroundTransparency = math.clamp(t / 1.1, 0, 1)
			rayFade.Offset = Vector2.new(math.sin(t * 0.31) * 0.24, 0)
			if layered then
				local swell = t * 0.91
				local pitch = math.sin(swell - 0.68) * 1.05 + math.sin(t * 1.44) * 0.22
				local pivotShift = math.sin(math.rad(pitch)) * ship.AbsoluteSize.Y * 0.34
				ship.Position = UDim2.fromOffset(shipX + pivotShift, shipY + math.sin(swell) * waveHeight)
				ship.Rotation = pitch
			end
		end)
	end)
end)()
-- 타이틀 오른쪽 선택 패널: 나라(3열 카드) → 시대(3칸) → 출항 버튼 순서로, 스크롤 없이 한눈에 보이게 짠다
local GOLD = Color3.fromRGB(226, 182, 92)
local titlePanel = Instance.new("Frame")
titlePanel.Name = "TitlePanel"
titlePanel.AnchorPoint = Vector2.new(1, 0.5)
titlePanel.Position = UDim2.new(1, -14, 0.5, 0)
titlePanel.Size = UDim2.new(0.58, 0, 1, -28)
do
	local lim = Instance.new("UISizeConstraint")
	lim.MaxSize = Vector2.new(720, 9999)
	lim.Parent = titlePanel
end
titlePanel.BackgroundColor3 = COLORS.paper
titlePanel.BackgroundTransparency = 0
titlePanel.BorderSizePixel = 0
titlePanel.Visible = false
titlePanel.ZIndex = 10
titlePanel.Parent = titleGui
corner(titlePanel, 6)
do
	-- [타이틀] 책장을 뜯어낸 듯한 종이 가장자리와 양쪽 갈색 테두리.
	local wash = Instance.new("UIGradient")
	wash.Color = ColorSequence.new(PARCHMENT_TOP, Color3.fromRGB(191, 158, 106))
	wash.Rotation = 90
	wash.Parent = titlePanel
	bookMaterial(titlePanel, "parchment", 228)
	local st = Instance.new("UIStroke")
	st.Color = INK_EDGE
	st.Thickness = 2.5
	st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	st.Parent = titlePanel
	local margin = Instance.new("Frame")
	margin.Name = "WornPaperMargin"
	margin.Position = UDim2.fromOffset(5, 5)
	margin.Size = UDim2.new(1, -10, 1, -10)
	margin.BackgroundTransparency = 1
	margin.BorderSizePixel = 0
	margin.ZIndex = 10
	margin.Parent = titlePanel
	local line = Instance.new("UIStroke")
	line.Color = Color3.fromRGB(140, 99, 56)
	line.Thickness = 1
	line.Transparency = 0.42
	line.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	line.Parent = margin
	-- 황동 압정: 찢긴 장정이 아니라 실제 항해일지의 귀퉁이를 고정한 흔적.
	for _, xy in { Vector2.new(10, 10), Vector2.new(0, 10), Vector2.new(10, 0), Vector2.new(0, 0) } do
		local nail = Instance.new("Frame")
		nail.Name = "BrassStud"
		nail.AnchorPoint = Vector2.new(if xy.X == 0 then 1 else 0, if xy.Y == 0 then 1 else 0)
		nail.Position = UDim2.new(if xy.X == 0 then 1 else 0, if xy.X == 0 then -12 else 12,
			if xy.Y == 0 then 1 else 0, if xy.Y == 0 then -12 else 12)
		nail.Size = UDim2.fromOffset(7, 7)
		nail.BackgroundColor3 = UI_BRASS
		nail.ZIndex = 12
		nail.BorderSizePixel = 0
		nail.Parent = titlePanel
		corner(nail, 4)
		local engraving = Instance.new("UIStroke")
		engraving.Color = UI_BRASS_DARK
		engraving.Thickness = 1
		engraving.Parent = nail
	end
end
local titleScroll = Instance.new("ScrollingFrame")
titleScroll.BackgroundTransparency = 1
titleScroll.BorderSizePixel = 0
titleScroll.Size = UDim2.new(1, -8, 1, -8)
titleScroll.Position = UDim2.fromOffset(4, 4)
titleScroll.ScrollBarThickness = 4
titleScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
titleScroll.CanvasSize = UDim2.new()
titleScroll.ZIndex = 11
titleScroll.Parent = titlePanel
do
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 12), UDim.new(0, 12)
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14)
	pad.Parent = titleScroll
	local ly = Instance.new("UIListLayout")
	ly.Padding = UDim.new(0, 8)
	ly.SortOrder = Enum.SortOrder.LayoutOrder
	ly.Parent = titleScroll
end

local function tLabel(parent, text, size, color, bold, order)
	-- 표제지의 모든 설명은 진한 먹색: 옛 남색 패널용 밝은 글씨를 양피지에 남기지 않는다.
	local inkColor = if color == COLORS.text then INK
		elseif color == COLORS.muted then INK_SOFT
		elseif color == GOLD then INK_EDGE else color
	local l = mkLabel(parent, text, size, inkColor, bold, order)
	l.Size = UDim2.new(1, 0, 0, 0)
	l.ZIndex = 12
	return l
end

renderTitle = function()
	for _, c in titleScroll:GetChildren() do
		if not c:IsA("UIListLayout") and not c:IsA("UIPadding") then
			c:Destroy()
		end
	end
	local order = 0
	local function nxt()
		order += 1
		return order
	end
	local list = {}
	for id, n in PortData.Nations do
		if not n.hidden then
			table.insert(list, n)
		end
	end
	local NATION_ORDER = { "england", "netherlands", "france", "spain", "portugal", "denmark", "sweden", "venice", "ottoman", "swahili", "malabar", "china", "japan", "korea", "new_spain" }
	table.sort(list, function(a, b)
		local ia, ib = table.find(NATION_ORDER, a.id) or 99, table.find(NATION_ORDER, b.id) or 99
		if ia ~= ib then return ia < ib end
		return a.id < b.id
	end)
	local cur = PortData.Nations[chosenNation]
	if not cur or cur.hidden then
		chosenNation = list[1].id
		cur = list[1]
	end

	local head = tLabel(titleScroll, "항해자의 연대기", 28, INK, true, nxt())
	head.TextXAlignment = Enum.TextXAlignment.Center
	do
		local rule = Instance.new("Frame")
		rule.Size = UDim2.new(1, 0, 0, 2)
		rule.BackgroundColor3 = GOLD
		rule.BackgroundTransparency = 0.35
		rule.BorderSizePixel = 0
		rule.LayoutOrder = nxt()
		rule.ZIndex = 12
		rule.Parent = titleScroll
	end
	if message ~= "" then
		tLabel(titleScroll, message, 17, if messageOk then GOLD else COLORS.red, true, nxt())
	end

	-- ① 나라
	tLabel(titleScroll, "① 출발할 나라를 선택해", 22, COLORS.muted, true, nxt())
	local grid = Instance.new("Frame")
	grid.BackgroundTransparency = 1
	grid.Size = UDim2.new(1, 0, 0, 0)
	grid.AutomaticSize = Enum.AutomaticSize.Y
	grid.LayoutOrder = nxt()
	grid.ZIndex = 12
	grid.Parent = titleScroll
	local gl = Instance.new("UIGridLayout")
	gl.CellSize = UDim2.new(if workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize.Y > workspace.CurrentCamera.ViewportSize.X then 0.5 else 1 / 3, -6, 0, 72)
	gl.CellPadding = UDim2.fromOffset(8, 8)
	gl.SortOrder = Enum.SortOrder.LayoutOrder
	gl.Parent = grid
	for i, n in list do
		local selected = chosenNation == n.id
		local card = Instance.new("TextButton")
		card.LayoutOrder = i
		card.Text = ""
		card.AutoButtonColor = false
		card.BorderSizePixel = 0
		card.ZIndex = 13
		card.BackgroundColor3 = if selected then Color3.fromRGB(226, 190, 128) else Color3.fromRGB(234, 214, 177)
		corner(card, 8)
		bookMaterial(card, "parchment", 146)
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Thickness = if selected then 2.5 else 1
		st.Color = if selected then INK_EDGE else Color3.fromRGB(151, 114, 75)
		st.Parent = card
		local flag = require(Shared:WaitForChild("Flags")).build(card, n.id, 34, 24)
		flag.Position = UDim2.fromOffset(8, 13)
		flag.ZIndex = 14
		for _, d in flag:GetDescendants() do
			if d:IsA("GuiObject") then
				d.ZIndex = 15
			end
		end
		local nm = mkLabel(card, n.name, 19, INK, true)
		nm.Position = UDim2.fromOffset(48, 6)
		nm.Size = UDim2.new(1, -52, 0, 26)
		nm.AutomaticSize = Enum.AutomaticSize.None
		nm.ZIndex = 14
		local sub = mkLabel(card, "⚓ " .. PortData.Ports[PortEras.startPortFor(n, 1517)].name, 15, INK_SOFT, false)
		sub.Position = UDim2.fromOffset(48, 36)
		sub.Size = UDim2.new(1, -52, 0, 20)
		sub.AutomaticSize = Enum.AutomaticSize.None
		sub.ZIndex = 14
		card.Activated:Connect(function()
			Sfx.play("sfx_click")
			chosenNation = n.id
			renderTitle()
		end)
		card.Parent = grid
	end

	-- 선택한 나라의 주인공 소개
	local box = Instance.new("Frame")
	box.Size = UDim2.new(1, 0, 0, 0)
	box.AutomaticSize = Enum.AutomaticSize.Y
	box.BackgroundColor3 = Color3.fromRGB(236, 215, 177)
	box.BorderSizePixel = 0
	box.LayoutOrder = nxt()
	box.ZIndex = 12
	corner(box, 10)
	bookMaterial(box, "parchment", 170)
	do
		local st = Instance.new("UIStroke")
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Color = GOLD
		st.Transparency = 0.55
		st.Parent = box
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 8), UDim.new(0, 8)
		pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 10)
		pad.Parent = box
		local hl = Instance.new("UIListLayout")
		hl.FillDirection = Enum.FillDirection.Horizontal
		hl.Padding = UDim.new(0, 10)
		hl.Parent = box
	end
	local hp = heroPortrait(box, cur.id, 78, 98)
	hp.ZIndex = 13
	local info = Instance.new("Frame")
	info.BackgroundTransparency = 1
	info.Size = UDim2.new(1, -92, 0, 0)
	info.AutomaticSize = Enum.AutomaticSize.Y
	info.ZIndex = 13
	info.Parent = box
	do
		local ll = Instance.new("UIListLayout")
		ll.Padding = UDim.new(0, 3)
		ll.Parent = info
	end
	local N = require(game:GetService("ReplicatedStorage"):WaitForChild("Shared"):WaitForChild("Narrative"))
	local pro = N.Prologues[cur.id]
	tLabel(info, cur.name, 22, GOLD, true)
	tLabel(info, "출발 항구  " .. PortData.Ports[PortEras.startPortFor(cur, 1517)].name, 17, COLORS.text, true)
	tLabel(info, cur.summary, 16, COLORS.muted, false)

	-- ② 출신 성분
	tLabel(titleScroll, "② 집안 선택 · 탐험 기본 무기", 22, COLORS.muted, true, nxt())
	do
		local Sp = require(Shared:WaitForChild("Specialties"))
		H.chosenOrigin = H.chosenOrigin or "merchant"
		local og = Instance.new("Frame")
		og.BackgroundTransparency = 1
		og.Size = UDim2.new(1, 0, 0, 0)
		og.AutomaticSize = Enum.AutomaticSize.Y
		og.LayoutOrder = nxt()
		og.ZIndex = 12
		local ogl = Instance.new("UIGridLayout")
		ogl.CellSize = UDim2.new(0.5, -4, 0, 120)
		ogl.CellPadding = UDim2.fromOffset(8, 8)
		ogl.SortOrder = Enum.SortOrder.LayoutOrder
		ogl.Parent = og
		for i, o in Sp.Origins do
			local sel = H.chosenOrigin == o.id
			local b = Instance.new("TextButton")
			b.LayoutOrder = i
			b.Text = ""
			b.AutoButtonColor = false
			b.BorderSizePixel = 0
			b.ZIndex = 13
			b.BackgroundColor3 = if sel then Color3.fromRGB(226, 190, 128) else Color3.fromRGB(234, 214, 177)
			corner(b, 10)
			local bst = Instance.new("UIStroke")
			bst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			bst.Thickness = if sel then 2.5 else 1
			bst.Color = if sel then INK_EDGE else Color3.fromRGB(151, 114, 75)
			bst.Parent = b
			local n1 = mkLabel(b, o.name, 19, INK, true)
			n1.Position = UDim2.fromOffset(8, 4)
			n1.Size = UDim2.new(1, -12, 0, 24)
			n1.AutomaticSize = Enum.AutomaticSize.None
			n1.ZIndex = 14
			local n2 = mkLabel(b, o.perkText, 16, INK_SOFT, false)
			n2.Position = UDim2.fromOffset(8, 30)
			n2.Size = UDim2.new(1, -12, 0, 50)
			n2.AutomaticSize = Enum.AutomaticSize.None
			n2.TextWrapped = true
			n2.TextYAlignment = Enum.TextYAlignment.Top
			n2.ZIndex = 14
			local originWeapon = Weapons.originWeapon(o.id, chosenYear)
			local n3 = mkLabel(b, "⚔ " .. originWeapon.name .. " · " .. originWeapon.note, 16, INK, true)
			n3.Name = "OriginStartingWeapon"
			n3.Position = UDim2.fromOffset(8, 83)
			n3.Size = UDim2.new(1, -12, 0, 33)
			n3.TextWrapped = true
			n3.TextYAlignment = Enum.TextYAlignment.Top
			n3.AutomaticSize = Enum.AutomaticSize.None
			n3.ZIndex = 14
			b.Activated:Connect(function()
				Sfx.play("sfx_click")
				H.chosenOrigin = o.id
				renderTitle()
			end)
			b.Parent = og
		end
		og.Parent = titleScroll
		local cur2 = Sp.OriginById[H.chosenOrigin]
		if cur2 then
			tLabel(titleScroll, "선택: " .. cur2.name .. " · " .. cur2.story, 18, COLORS.muted, false, nxt())
			local initialWeapon = Weapons.originWeapon(H.chosenOrigin, chosenYear)
			tLabel(titleScroll, "첫 탐험 기본 무기: " .. initialWeapon.name .. " (" .. initialWeapon.note .. ")", 19, INK, true, nxt())
		end
	end

	-- 같이 하기 (방 시계)
	do
		local on = H.roomMode == true
		local ri = H.roomInfo
		local sub = if on then
			(if ri then string.format("지금 열린 방은 %d년 시대예요 (현재 %d년). 같은 시대만 고를 수 있어요.", ri.startYear, ri.year) else "첫 번째로 방을 열어요. 고른 시대로 시작하고, 다른 사람이 들어오면 같은 시계를 써요.")
			else "혼자 하기: 항해할 때마다 날짜가 흘러요."
		local row = mkRow(titleScroll, if on then "같이 하기 · 켜짐" else "같이 하기 · 꺼짐", sub .. "\n(켜면 시대가 현실 시간으로 흘러요: 현실 1분 = 게임 6일)", {
			{ text = if on then "끄기" else "켜기", color = if on then COLORS.grey else COLORS.gold, onClick = function()
				H.roomMode = not on
				if H.roomMode and H.roomInfo then chosenYear = H.roomInfo.startYear end
				renderTitle()
			end },
		}, 88)
		row.LayoutOrder = nxt()
		row.ZIndex = 12
	end

	-- 출발
	local actions = Instance.new("Frame")
	actions.BackgroundTransparency = 1
	actions.Size = UDim2.new(1, 0, 0, 68)
	actions.LayoutOrder = nxt()
	actions.ZIndex = 12
	actions.Parent = titleScroll
	local al = Instance.new("UIListLayout")
	al.FillDirection = Enum.FillDirection.Horizontal
	al.Padding = UDim.new(0, 8)
	al.Parent = actions
	if view then
		local cancel = mkButton(actions, "이어서 하기", Color3.fromRGB(44, 56, 74), UDim2.new(0.28, 0, 1, 0), function()
			newGameMode = false
			render()
		end, true)
		cancel.ZIndex = 13
		cancel.TextSize = 18
	end
	local go = mkButton(actions, "⚓  출항하기", Color3.fromRGB(206, 154, 56), UDim2.new(if view then 0.72 else 1, if view then -8 else 0, 1, 0), H.startNewGame, true)
	go.ZIndex = 13
	go.TextSize = 26
	go.TextColor3 = INK
	do
		local gst = Instance.new("UIStroke")
		gst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		gst.Color = Color3.fromRGB(255, 226, 150)
		gst.Thickness = 2
		gst.Parent = go
	end
end

H.wasTitle = false
H.titleMenuOpen = false
function H.setTitleMode(on)
	titleGui.Enabled = on or H.titleMenuOpen
	titlePanel.Visible = on and not H.titleMenuOpen
	local currentCamera = workspace.CurrentCamera
	local screen = if currentCamera then currentCamera.ViewportSize else Vector2.new(1280, 720)
	local portrait = screen.Y > screen.X
	titlePanel.AnchorPoint = if portrait then Vector2.new(0.5, 1) else Vector2.new(1, 0.5)
	titlePanel.Position = if portrait then UDim2.new(0.5, 0, 1, -8) else UDim2.new(1, -14, 0.5, 0)
	titlePanel.Size = if portrait then UDim2.new(0.94, 0, 0.70, 0) else UDim2.new(0.58, 0, 1, -28)
	if on then
		main.Visible = false
	elseif H.wasTitle then
		main.Visible = true
	end
	H.wasTitle = on
end

function render()
	order = 0
	H.contextAdviceShown = false
	H.clearContent()
	if not audioLock then
		Sfx.portMusic(view and view.player and PortData.Ports[view.player.portId],
			view ~= nil and currentTab == "trade")
		if view then
			Sfx.portAmbient(PortData.Ports[view.player.portId])
		end
	end

	H.setTitleMode(not view or newGameMode)
	if not view or newGameMode then
		headerLabel.Text = "새 게임"
		setPortrait("선장실")
		tabBar.Visible = false
		H.pageDetails.Text = ""
		H.layoutBook()
		if message ~= "" then
			add(function() return mkLabel(content, message, 17, if messageOk then COLORS.gold else COLORS.red, true) end)
		end
		renderTitle()
		return
	end

	tabBar.Visible = #groupOf(currentTab).tabs > 1 -- 탭이 하나뿐이면 시설 이름과 겹치므로 탭 줄을 숨긴다
	H.layoutBook()

	local p, ship = view.player, view.ship
	local grp = groupOf(currentTab)
	setPortrait(grp.name)
	headerLabel.Text = grp.name
	-- [현재 위치] 모바일에는 항구·선택 탭만, 넓은 화면에는 담당자까지 표시한다.
	H.pageDetails.Text = if mainInner.AbsoluteSize.X < 480
		then string.format("%s · %s", p.portName, TAB_NAME[currentTab])
		else string.format("%s · %s · %s", p.portName, grp.keeper, TAB_NAME[currentTab])
	coinValue.Text = tostring(p.coins)
	H.updateHud(p, ship)
	H.renderTabs()
	-- [현재 시설 표시] 가죽 도크의 선택 상태와 실제 열려 있는 시설을 동기화한다.
	for _, spec in H.DOCK do
		local dockButton = H.dockButtons[spec[1]]
		if dockButton then
			dockButton:SetAttribute("SelectedFacility", groupOf(spec[1]).name == grp.name)
		end
	end
	syncScene()

	if message ~= "" then
		add(function() return mkLabel(content, message, 17, if messageOk then COLORS.gold else COLORS.red, true) end)
	end
	-- [전체 메뉴 1순위 행동] 단계 안내와 핵심 진입 버튼을 첫 화면에 둔다.
	local focus = H.MENU_FOCUS[currentTab]
	if focus then
		add(function()
			local compact = mainInner.AbsoluteSize.X < 480
			local banner = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, if compact then 136 else 76), Color3.fromRGB(64, 48, 35))
			banner.Name = "MenuFocus_" .. currentTab
			corner(banner, 8)
			local heading = mkLabel(banner, "◆ " .. focus[1], 18, Color3.fromRGB(255, 222, 144), true)
			heading.Position = UDim2.fromOffset(12, 5)
			heading.Size = UDim2.new(1, if compact then -24 else -142, 0, 25)
			heading.AutomaticSize = Enum.AutomaticSize.None
			local stages = string.split(focus[2], " → ")
			local guide = if compact and #stages >= 3
				then "① " .. stages[1] .. "   ② " .. stages[2] .. "\n③ " .. stages[3]
				else "① " .. table.concat(stages, "   →   ")
			local steps = mkLabel(banner, guide, if compact then 13 else 14, Color3.fromRGB(243, 231, 204), false)
			steps.Position = UDim2.fromOffset(12, 34)
			steps.Size = UDim2.new(1, if compact then -24 else -132, 0, if compact then 48 else 34)
			steps.AutomaticSize = Enum.AutomaticSize.None
			steps.TextWrapped = true
			local action = mkButton(banner, focus[3] or "바로 보기",
				COLORS.gold, if compact then UDim2.new(1, -24, 0, 38) else UDim2.fromOffset(110, 42), function()
					if currentTab == "trade" and H.tradeHall then H.tradeHall() return end
					if currentTab == "yard" and H.yardHall then H.yardHall() return end
					-- 다른 메뉴는 실제 화면의 첫 조작 버튼으로 스크롤한다. 구매·보상 판정은 실행하지 않는다.
					for _, element in content:GetDescendants() do
						if element:IsA("TextButton") and element.Interactable
							and not element:FindFirstAncestor("MenuFocus_" .. currentTab)
							and not element:FindFirstAncestor("MenuAdvice_" .. currentTab) then
							local y = element.AbsolutePosition.Y - content.AbsolutePosition.Y + content.CanvasPosition.Y - 12
							content.CanvasPosition = Vector2.new(0, math.max(0, y))
							break
						end
					end
				end, true)
			action.Name = "MenuPrimaryAction_" .. currentTab
			action.AnchorPoint = if compact then Vector2.new(0, 0) else Vector2.new(1, 0.5)
			action.Position = if compact then UDim2.fromOffset(12, 91) else UDim2.new(1, -10, 0.5, 0)
			return banner
		end)
	end
	-- [선장 항해 비서] 서버 실측 상태에서 가장 시급한 일 한 개만 추천. 자원 조작은 실행하지 않는다.
	local cue, detail, target = nil, nil, nil
	if ship.maxHull > 0 and ship.hull < ship.maxHull * 0.4 then
		cue, detail, target = "선체 수리 필요", string.format("내구도 %d/%d · 항해 전 수리 상태를 확인해.", ship.hull, ship.maxHull), "yard"
	elseif ship.supplies <= 5 then
		cue, detail, target = "보급품 부족", "현재 보유 " .. tostring(ship.supplies) .. "개 · 필요한 보급과 비용을 확인해.", "yard"
	elseif ship.cargoCapacity > 0 and ship.cargoUsed >= ship.cargoCapacity then
		cue, detail, target = "화물칸 가득 참", string.format("%d/%d칸 · 거래 전에 적재 화물을 정리해.", ship.cargoUsed, ship.cargoCapacity), "trade"
	else
		for _, q in (view.quests and view.quests.active) or {} do
			if q.kind == "deliver" and q.progress >= q.amount then
				cue, detail, target = "납품 가능한 의뢰", q.name .. " · 보상 수령 조건을 확인해.", "quest"
				break
			end
		end
		if not cue then
			for _, t in (view.tech or {}) do
				if not t.owned and not t.blocked and (t.cost or 0) <= p.coins then
					cue, detail, target = "연구 가능한 기술", t.name .. " · 비용 " .. H.commas(t.cost or 0) .. "코인", "tech"
					break
				end
			end
		end
	end
	if cue and target ~= currentTab then
		add(function()
			local row = mkRow(content, "🧭 항해 비서 · " .. cue, detail, {
				{ text = TAB_NAME[target] .. " 보기", color = COLORS.green, onClick = function() openTab(target) end },
			}, 76)
			row.Name = "CaptainPriorityAdvice"
			return row
		end)
	end
	if H.recentTab and H.recentTab ~= currentTab and TAB_NAME[H.recentTab] then
		local recent = H.recentTab
		add(function()
			local b = mkButton(content, "↶ 최근 메뉴: " .. TAB_NAME[recent], COLORS.grey, UDim2.new(1, -6, 0, 36), function()
				openTab(recent, if recent == "map" then "chart" else nil)
			end)
			b.Name = "RecentFacilityShortcut"
			b.TextSize = 14
			return b
		end)
	end
	H.counselRows(1)
	RENDERERS[currentTab]()
end

-- 시작 화면: 이어하기 / 새 게임 / 소리 ---------------------------------------------

function H.showTitle()
	local layer = overlayGui("TitleGui", 40)
	local wasMain = main.Visible
	main.Visible = false
	menuToggle.Visible = false
	H.titleMenuOpen = true
	titleGui.Enabled = true
	titlePanel.Visible = false
	local visibility = main:GetPropertyChangedSignal("Visible"):Connect(function()
		if H.titleMenuOpen and main.Visible then main.Visible = false end
	end)
	layer.Destroying:Connect(function() visibility:Disconnect() end)
	local function leave()
		H.titleMenuOpen = false
		layer:Destroy()
	end

	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundTransparency = 1
	root.Parent = layer
	-- 한 장의 항해 기록. 종이결은 본문과 조작 뒤에만 깐다.
	local box = Instance.new("Frame")
	box.Name = "VoyageLogPage"
	box.BackgroundColor3 = COLORS.paper
	box.BorderSizePixel = 0
	box.Parent = root
	corner(box, 5)
	local paperId = AssetIds["CardArt/event_title_parchment"]
	if paperId then
		box.BackgroundTransparency = 1
		local sheet = Instance.new("ImageLabel")
		sheet.Name = "TornParchment"
		sheet.BackgroundTransparency = 1
		sheet.Size = UDim2.fromScale(1, 1)
		sheet.Image = "rbxassetid://" .. tostring(paperId)
		sheet.Parent = box
	else
		local grain = bookMaterial(box, "parchment", 360)
		if grain then grain.ImageTransparency = 0.22 end
	end
	local bounds = Instance.new("UISizeConstraint")
	-- [첫 화면 가독성] 모바일/가로 화면에서 이어하기·새 항해·설정 세 동작을 한눈에 보여 준다.
	bounds.MaxSize = Vector2.new(500, if view then 440 else 350)
	bounds.Parent = box

	local pages = Instance.new("ScrollingFrame")
	pages.Size = UDim2.fromScale(1, 1)
	pages.BackgroundTransparency = 1
	pages.BorderSizePixel = 0
	pages.ScrollBarThickness = 3
	pages.ScrollBarImageColor3 = COLORS.brown
	pages.ScrollingDirection = Enum.ScrollingDirection.Y
	pages.AutomaticCanvasSize = Enum.AutomaticSize.Y
	pages.CanvasSize = UDim2.new()
	pages.ZIndex = box.ZIndex + 1
	pages.Parent = box
	local pad = Instance.new("UIPadding")
	pad.PaddingTop, pad.PaddingBottom = UDim.new(0, 18), UDim.new(0, 18)
	pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 25), UDim.new(0, 25)
	pad.Parent = pages
	local list = Instance.new("UIListLayout")
	list.Padding = UDim.new(0, 8)
	list.SortOrder = Enum.SortOrder.LayoutOrder
	list.Parent = pages

	local function placeMenu()
		local portrait = root.AbsoluteSize.Y > root.AbsoluteSize.X
		box.AnchorPoint = if portrait then Vector2.new(0.5, 1) else Vector2.new(1, 0.5)
		box.Position = if portrait then UDim2.new(0.5, 0, 1, -16) else UDim2.new(1, -22, 0.5, 0)
		box.Size = if portrait then UDim2.fromScale(0.94, 0.68) else UDim2.new(0.46, 0, 0.88, 0)
	end
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(placeMenu)
	placeMenu()

	local head = Instance.new("Frame")
	head.LayoutOrder = 1
	head.Size = UDim2.new(1, 0, 0, 62)
	head.BackgroundTransparency = 1
	head.BorderSizePixel = 0
	head.Parent = pages
	pageRule(head, UDim2.new(0, 2, 1, -3), UDim2.new(1, -4, 0, 1))
	local seal = Instance.new("ImageLabel")
	seal.Size = UDim2.fromOffset(34, 34)
	seal.Position = UDim2.fromOffset(10, 9)
	seal.BackgroundTransparency = 1
	seal.ScaleType = Enum.ScaleType.Fit
	seal.Image = "rbxassetid://" .. AssetIds["Menu/chart_compass"]
	seal.ImageColor3 = COLORS.brown
	seal.Parent = head
	local title = mkLabel(head, "선장의 항해 일지", 27, COLORS.ink, true)
	title.Position = UDim2.fromOffset(53, 0)
	title.Size = UDim2.new(1, -60, 1, 0)
	title.AutomaticSize = Enum.AutomaticSize.None
	title.TextYAlignment = Enum.TextYAlignment.Center
	title.Font = Enum.Font.Antique
	title.TextStrokeColor3 = INK_SOFT
	title.TextStrokeTransparency = 0.75

	local function action(parent, text, size, primary, callback)
		local b = Instance.new("TextButton")
		b.Size = size
		b.Text = text
		b.Font = if primary then Enum.Font.GothamBold else Enum.Font.GothamMedium
		b.TextSize = if primary then 23 else 19
		b.TextColor3 = if primary then Color3.fromRGB(250, 232, 193) else INK
		b.BackgroundColor3 = if primary then Color3.fromRGB(35, 54, 59) else Color3.fromRGB(225, 204, 166)
		b.BackgroundTransparency = if primary then 0 else 0.06
		b.BorderSizePixel = 0
		b.TextWrapped = true
		b.Parent = parent
		corner(b, 9)
		local stroke = Instance.new("UIStroke")
		stroke.Color = if primary then Color3.fromRGB(235, 195, 118) else INK_EDGE
		stroke.Thickness = if primary then 2.2 else 1.5
		stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		stroke.Parent = b
		b.Activated:Connect(function()
			Sfx.play("sfx_click")
			callback()
		end)
		return b
	end
	if view then
		local log = mkLabel(pages, string.format("진행 중인 항해 · %s · %d년\n소지금 %d코인", view.player.portName, view.player.year, view.player.coins), 18, INK_SOFT, false, 2)
		log.Size = UDim2.new(1, 0, 0, 0)
		local resume = action(pages, "▶ 이어하기 · 기존 항해", UDim2.new(1, 0, 0, 60), true, function()
			leave()
			titleGui.Enabled = false
			main.Visible = wasMain
			menuToggle.Visible = not wasMain
		end)
		resume.LayoutOrder = 3
	end
	if not view then
		local guide = mkLabel(pages, "나라와 집안을 고르고, 출발 무기를 확인한 뒤 항해해.", 18, INK_SOFT, false, 2)
		guide.TextWrapped = true
		guide.Size = UDim2.new(1, 0, 0, 50)
	end
	local confirmed = false
	local newBtn
	newBtn = action(pages, if view then "＋ 새 항해 시작" else "⚓ 새 게임 시작", UDim2.new(1, 0, 0, 60), not view, function()
		if view and not confirmed then
			confirmed = true
			newBtn.Text = "저장을 지우고 새로 시작"
			newBtn.TextColor3 = COLORS.text
			newBtn.BackgroundColor3 = COLORS.red
			newBtn.BackgroundTransparency = 0
			return
		end
		leave()
		newGameMode = true
		render()
	end)
	newBtn.LayoutOrder = 4

	local controls = Instance.new("Frame")
	controls.BackgroundTransparency = 1
	controls.Size = UDim2.new(1, 0, 0, 60)
	controls.LayoutOrder = 5
	controls.Parent = pages
	pageRule(controls, UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 1))
	action(controls, "⚙ 설정", UDim2.new(0.48, 0, 1, 0), false, openOptions)
	local function musicLabel()
		return if Sfx.state() then "음악 켜짐" else "음악 꺼짐"
	end
	local musicBtn
	musicBtn = action(controls, musicLabel(), UDim2.new(0.48, 0, 1, 0), false, function()
		Sfx.setMusicEnabled(not Sfx.state())
		musicBtn.Text = musicLabel()
	end)
	musicBtn.Position = UDim2.fromScale(0.52, 0)
	Sfx.music("music_harbor")
end

-- 시작 --------------------------------------------------------------------

task.spawn(function()
	-- 서버가 늦으면 얼마나 기다렸는지 화면에 보여 준다(멈춘 것처럼 보이지 않게)
	local startedAt = os.clock()
	task.spawn(function()
		while H.startupCover and H.startupLabel do
			task.wait(1)
			if H.startupCover and H.startupLabel then
				H.startupLabel.Text = string.format("학문의 바다\n항구와 항해 기록을 불러오는 중... (%d초)", math.floor(os.clock() - startedAt))
			end
		end
	end)
	for _ = 1, 30 do
		local result = call("State")
		if result and (result.view or result.needsNewGame) then
			H.roomInfo = result.room
			message = ""
			-- 화면을 그리다 오류가 나도 로딩 화면에 갇히지 않게 하고, 오류 내용을 보여 준다.
			local okDraw, errDraw = pcall(function()
				render()
				H.showTitle()
			end)
			if not okDraw then
				warn("[MareEssentia] 시작 화면 오류: " .. tostring(errDraw))
				if H.startupLabel then
					H.startupLabel.Text = "시작 화면 오류\n" .. string.sub(tostring(errDraw), 1, 160)
				end
				task.wait(8)
			end
			-- 실제 시작 메뉴가 완성된 뒤에만 로딩 화면을 닫는다.
			if H.startupCover then
				H.startupCover:Destroy()
				H.startupCover = nil
			end
			return
		end
		-- 그 밖의 응답(너무 빨라요 등)은 멈추지 말고 다시 시도한다
		task.wait(0.5)
	end
	message, messageOk = "서버에 연결하지 못했어요", false
	if H.startupLabel then
		H.startupLabel.Text = "서버 연결에 실패했어.\n재접속해서 다시 시도해 줘."
	end
	warn("[MareEssentia] 시작 상태 수신 실패: 게임 시작 메뉴를 열지 않음")
end)

-- ───── 선장실(내 배) 확대 화면: 동료 초상화를 끌어다 자리에 앉힌다 ─────
-- 끌어 놓기가 어려운 기기를 위해 초상을 한 번 누른 뒤 자리를 누르는 방법도 된다. "자동 배치"는 직책에 가장 잘 맞게 한 번에 앉힌다.
function H.openCabin()
	if H.cabinGui then
		H.cabinGui:Destroy()
		H.cabinGui = nil
	end
	local UIS = game:GetService("UserInputService")
	local g = overlayGui("CabinGui", 40)
	H.cabinGui = g
	local root = Instance.new("Frame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = COLORS.cover
	root.BorderSizePixel = 0
	root.Parent = g
	local selected = nil -- 눌러서 고른 동료 id
	local drag = nil -- { id, ghost, startPos, moved }
	local slotFrames = {}
	local build

	local function close()
		H.cabinRefresh = nil
		if H.cabinGui then
			H.cabinGui:Destroy()
			H.cabinGui = nil
		end
	end
	local function place(id, stationId)
		selected = nil
		call("Station", { companionId = id, station = stationId })
	end
	local function slotAt(pos)
		for stId, f in slotFrames do
			if f.Parent then
				local a, s = f.AbsolutePosition, f.AbsoluteSize
				if pos.X >= a.X and pos.X <= a.X + s.X and pos.Y >= a.Y and pos.Y <= a.Y + s.Y then
					return stId
				end
			end
		end
		return nil
	end
	local function endDrag(pos)
		if not drag then
			return
		end
		local d = drag
		drag = nil
		d.ghost:Destroy()
		if d.moved then
			local stId = slotAt(pos)
			if stId then
				place(d.id, stId)
			else
				build()
			end
		else
			selected = if selected == d.id then nil else d.id -- 누르기만 했으면 선택/해제
			build()
		end
	end
	local function startDrag(id, label, input)
		if drag then
			return
		end
		local ghost = Instance.new("TextLabel")
		ghost.Size = UDim2.fromOffset(120, 34)
		ghost.AnchorPoint = Vector2.new(0.5, 0.5)
		ghost.Position = UDim2.fromOffset(input.Position.X, input.Position.Y)
		ghost.BackgroundColor3 = COLORS.gold
		ghost.BackgroundTransparency = 0.1
		ghost.TextColor3 = Color3.fromRGB(40, 28, 18)
		ghost.Font = Enum.Font.GothamBold
		ghost.TextSize = 14
		ghost.Text = label
		ghost.ZIndex = 100
		ghost.Active = false
		ghost.Parent = g
		corner(ghost, 8)
		drag = { id = id, ghost = ghost, startPos = Vector2.new(input.Position.X, input.Position.Y), moved = false }
	end
	local connMove = UIS.InputChanged:Connect(function(i)
		if drag and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
			local p = Vector2.new(i.Position.X, i.Position.Y)
			drag.ghost.Position = UDim2.fromOffset(p.X, p.Y)
			if (p - drag.startPos).Magnitude > 8 then
				drag.moved = true
			end
		end
	end)
	local connEnd = UIS.InputEnded:Connect(function(i)
		if drag and (i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch) then
			endDrag(Vector2.new(i.Position.X, i.Position.Y))
		end
	end)
	g.Destroying:Connect(function()
		connMove:Disconnect()
		connEnd:Disconnect()
	end)

	build = function()
		if not g.Parent or not view then
			return
		end
		for _, ch in root:GetChildren() do
			ch:Destroy()
		end
		slotFrames = {}
		local v = view.companions
		local sh = view.ship
		local W = root.AbsoluteSize.X
		local wide = W >= 760

		-- 윗줄
		local top = mkBox(root, UDim2.fromOffset(8, 8), UDim2.new(1, -16, 0, 58), COLORS.paper)
		corner(top, 6)
		local title = mkLabel(top, "선장실 · " .. sh.name, 19, Color3.fromRGB(50, 36, 24), true)
		title.Position = UDim2.fromOffset(12, 6)
		title.Size = UDim2.new(1, -330, 0, 24)
		title.AutomaticSize = Enum.AutomaticSize.None
		local hint = mkLabel(top, "동료 초상을 끌어서 자리에 놓으세요 (누른 뒤 자리를 눌러도 돼요)", 12, Color3.fromRGB(90, 70, 50), false)
		hint.Position = UDim2.fromOffset(12, 32)
		hint.Size = UDim2.new(1, -330, 0, 20)
		hint.AutomaticSize = Enum.AutomaticSize.None
		local closeBtn = mkButton(top, "닫기", COLORS.leather, UDim2.fromOffset(70, 40), close, true)
		closeBtn.AnchorPoint = Vector2.new(1, 0.5)
		closeBtn.Position = UDim2.new(1, -8, 0.5, 0)
		local autoBtn = mkButton(top, "자동 배치 (추천)", COLORS.green, UDim2.fromOffset(160, 40), function() selected = nil; call("AutoStations") end, #v.stations > 0)
		autoBtn.AnchorPoint = Vector2.new(1, 0.5)
		autoBtn.Position = UDim2.new(1, -86, 0.5, 0)

		-- 왼쪽: 큰 배 그림과 능력
		local shipW = if wide then 0.42 else 1
		local shipH = if wide then 1 else 0
		local shipBox = mkBox(root, UDim2.fromOffset(8, 74), if wide then UDim2.new(shipW, -12, 1, -82) else UDim2.new(1, -16, 0, 190), COLORS.leather)
		corner(shipBox, 8)
		local si = SHIP_ICON[sh.id]
		local px = if wide then 230 else 130
		if si then
			local icon = modelIcon(shipBox, si[1], si[2], si[3], px)
			icon.AnchorPoint = Vector2.new(0.5, 0)
			icon.Position = UDim2.new(0.5, 0, 0, 14)
		end
		local info = mkLabel(shipBox, string.format("%s\n선체 %d/%d · 포 %d · 속도 %d\n화물 %d/%d · 선원 %d/%d\n동료 자리 %d칸", sh.name, sh.hull, sh.maxHull, sh.cannons, sh.speed, sh.cargoUsed, sh.cargoCapacity, sh.crew, sh.maxCrew, v.max), 14, COLORS.text, false)
		info.Position = UDim2.new(0, 10, 0, px + 24)
		info.Size = UDim2.new(1, -20, 0, 90)
		info.AutomaticSize = Enum.AutomaticSize.None
		info.TextXAlignment = Enum.TextXAlignment.Center
		local vac = v.vacancy
		if vac and (vac.speed < 0 or vac.cannon < 0) then
			local w = mkLabel(shipBox, "조타수/포술장 자리가 비어 있어요 (" .. (if vac.speed < 0 then "속도 -2% " else "") .. (if vac.cannon < 0 then "포격 -2%" else "") .. ")", 12, COLORS.gold, true)
			w.Position = UDim2.new(0, 10, 1, -44)
			w.Size = UDim2.new(1, -20, 0, 36)
			w.AutomaticSize = Enum.AutomaticSize.None
		end

		-- 오른쪽 위: 자리 칸 (2열)
		local rx = if wide then shipW else 0
		local rightPos = if wide then UDim2.new(rx, 4, 0, 74) else UDim2.fromOffset(8, 272)
		local slotsH = math.ceil(#v.stations / 2) * 96 + 8
		local slotsBox = mkBox(root, rightPos, if wide then UDim2.new(1 - rx, -12, 0, slotsH) else UDim2.new(1, -16, 0, slotsH), COLORS.leather)
		corner(slotsBox, 8)
		local grid = Instance.new("UIGridLayout")
		grid.CellSize = UDim2.new(0.5, -8, 0, 88)
		grid.CellPadding = UDim2.fromOffset(6, 8)
		grid.SortOrder = Enum.SortOrder.LayoutOrder
		grid.Parent = slotsBox
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingLeft, pad.PaddingRight, pad.PaddingBottom = UDim.new(0, 6), UDim.new(0, 6), UDim.new(0, 6), UDim.new(0, 6)
		pad.Parent = slotsBox
		for idx, st in v.stations do
			local slot = Instance.new("TextButton")
			slot.LayoutOrder = idx
			slot.Text = ""
			slot.AutoButtonColor = false
			slot.BackgroundColor3 = if st.seatId then (if st.matched then Color3.fromRGB(70, 104, 76) else Color3.fromRGB(112, 92, 62)) else Color3.fromRGB(58, 48, 40)
			slot.BorderSizePixel = 0
			slot.Parent = slotsBox
			corner(slot, 8)
			if selected then
				local stroke = Instance.new("UIStroke")
				stroke.Color = COLORS.gold
				stroke.Thickness = 2
				stroke.Parent = slot
			end
			slotFrames[st.id] = slot
			slot.Activated:Connect(function()
				if selected then
					place(selected, st.id)
				end
			end)
			local nm = mkLabel(slot, st.name, 14, COLORS.gold, true)
			nm.Position = UDim2.fromOffset(78, 6)
			nm.Size = UDim2.new(1, -84, 0, 20)
			nm.AutomaticSize = Enum.AutomaticSize.None
			local desc = mkLabel(slot, if st.seatName then (st.seatName .. (if st.matched then "  (딱 맞음 x1.2)" else "  (다른 직책 x0.6)")) else "비어 있음 — 동료를 놓으세요", 12, COLORS.text, false)
			desc.Position = UDim2.fromOffset(78, 28)
			desc.Size = UDim2.new(1, -84, 0, 54)
			desc.AutomaticSize = Enum.AutomaticSize.None
			desc.TextYAlignment = Enum.TextYAlignment.Top
			if st.seatId then
				local face = H.companionFace(slot, st.seatId, 64)
				if face then
					face.Position = UDim2.fromOffset(8, 12)
				end
			end
		end

		-- 오른쪽 아래: 함께하는 동료 초상 (끌어서 놓기)
		local listY = if wide then 74 + slotsH + 8 else 272 + slotsH + 8
		local listBox = mkBox(root, if wide then UDim2.new(rx, 4, 0, listY) else UDim2.fromOffset(8, listY), if wide then UDim2.new(1 - rx, -12, 1, -listY - 8) else UDim2.new(1, -16, 1, -listY - 8), COLORS.leather)
		corner(listBox, 8)
		local lt = mkLabel(listBox, string.format("함께하는 동료 (%d/%d)", (function() local n = 0 for _, c in v.list do if c.joined then n += 1 end end return n end)(), v.max), 14, COLORS.gold, true)
		lt.Position = UDim2.fromOffset(10, 6)
		lt.Size = UDim2.new(1, -20, 0, 22)
		lt.AutomaticSize = Enum.AutomaticSize.None
		local sc = Instance.new("ScrollingFrame")
		sc.Position = UDim2.fromOffset(6, 32)
		sc.Size = UDim2.new(1, -12, 1, -38)
		sc.BackgroundTransparency = 1
		sc.BorderSizePixel = 0
		sc.ScrollBarThickness = 5
		sc.AutomaticCanvasSize = Enum.AutomaticSize.Y
		sc.CanvasSize = UDim2.new()
		sc.Parent = listBox
		local tg = Instance.new("UIGridLayout")
		tg.CellSize = UDim2.fromOffset(104, 120)
		tg.CellPadding = UDim2.fromOffset(8, 8)
		tg.SortOrder = Enum.SortOrder.LayoutOrder
		tg.Parent = sc
		local any = false
		for idx, c in v.list do
			if c.joined then
				any = true
				local tile = Instance.new("TextButton")
				tile.LayoutOrder = idx
				tile.Text = ""
				tile.AutoButtonColor = false
				tile.BackgroundColor3 = if selected == c.id then Color3.fromRGB(150, 118, 52) else Color3.fromRGB(72, 58, 46)
				tile.BorderSizePixel = 0
				tile.Parent = sc
				corner(tile, 8)
				local face = H.companionFace(tile, c.id, 64)
				if face then
					face.Position = UDim2.new(0.5, -32, 0, 6)
				end
				local nl = mkLabel(tile, c.name, 12, COLORS.text, true)
				nl.Position = UDim2.fromOffset(4, 72)
				nl.Size = UDim2.new(1, -8, 0, 18)
				nl.AutomaticSize = Enum.AutomaticSize.None
				nl.TextXAlignment = Enum.TextXAlignment.Center
				nl.TextTruncate = Enum.TextTruncate.AtEnd
				local bl = mkLabel(tile, "어울림: " .. c.bestSeat, 11, COLORS.muted, false)
				bl.Position = UDim2.fromOffset(4, 92)
				bl.Size = UDim2.new(1, -8, 0, 22)
				bl.AutomaticSize = Enum.AutomaticSize.None
				bl.TextXAlignment = Enum.TextXAlignment.Center
				tile.InputBegan:Connect(function(input)
					if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
						startDrag(c.id, c.name, input)
					end
				end)
			end
		end
		if not any then
			local none = mkLabel(sc, "아직 함께하는 동료가 없어요. 주점에서 동료를 만나 보세요.", 13, COLORS.muted, false)
			none.Size = UDim2.new(1, -12, 0, 40)
		end
	end
	root:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
		if root.AbsoluteSize.X > 0 then
			build()
		end
	end)
	H.cabinRefresh = build
	build()
end

-- 조언을 눌렀을 때 그 화면으로 바로 간다 (조선소·교역소는 전용 큰 화면)
function H.goAdvice(tab)
	-- [동료 바로가기] 산책 HUD와 시설 책의 표시 상태를 먼저 정리한다.
	H.hideBubble()
	menuToggle.Visible = false
	if tab == "yard" then
		currentTab = "yard"
		openYardHall()
	elseif tab == "trade" then
		currentTab = "trade"
		openTradeHall()
	else
		openTab(tab)
	end
end

openTab = function(tabId, mapPage)
	-- [최근 사용] 영구 저장 키 변경 없이 이 실행 중 직전 메뉴만 기억한다.
	if currentTab ~= tabId and TAB_NAME[currentTab] then H.recentTab = currentTab end
	currentTab = tabId
	message = "" -- 창을 새로 열 때 지난 안내 문구는 지운다
	H.mapPage = mapPage
	-- 지도·서책·선장실은 등록된 CC0 효과음이 있을 때만 추가 연출한다.
	if mapPage == "journal" then
		Sfx.play("sfx_book_turn", 0.24)
	else
		Sfx.facilityCue(tabId)
	end
	if tabId ~= "battle" then
		equipped = nil
	end
	main.Visible = true
	menuToggle.Visible = false
	render()
end

menuToggle.Activated:Connect(function()
	main.Visible = true
	menuToggle.Visible = false
end)


-- 역사 사건: 게임 날짜가 실제 사건의 해에 닿으면 선택 창이 뜬다. 고를 때까지 다른 행동은 계속할 수 있다 (창은 닫기만 하면 잠시 숨는다).
do
	local popupFor, popupGui = nil, nil
	local dismissed = {}
	local histPrev = nil
	local function closePopup()
		if popupGui then
			popupGui:Destroy()
			popupGui = nil
			popupFor = nil
			if histPrev then
				Sfx.music(histPrev)
				histPrev = nil
			end
		end
	end
	local function openPopup(ev)
		closePopup()
		popupFor = ev.id
		histPrev = Sfx.currentName()
		Sfx.music(Sfx.historyMusic(ev)) -- 사건의 종류(전쟁·재난·교역·탐험 등)에 맞는 곡으로 전환
		Sfx.play(Sfx.historyCue(ev), 0.4)
		local layer = overlayGui("HistoryEvent", 55)
		popupGui = layer
		local dim = Instance.new("Frame")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.5
		dim.BorderSizePixel = 0
		dim.Parent = layer
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.new(0, 520, 0, 0)
		win.AutomaticSize = Enum.AutomaticSize.Y
		win.BackgroundColor3 = COLORS.cover
		win.BorderSizePixel = 0
		win.Parent = layer
		corner(win, 16)
		local wst = Instance.new("UIStroke")
		wst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		wst.Color = BRASS
		wst.Thickness = 2.5
		wst.Parent = win
		local limit = Instance.new("UISizeConstraint")
		limit.MaxSize = Vector2.new(560, 640)
		limit.MinSize = Vector2.new(280, 200)
		limit.Parent = win
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14), UDim.new(0, 16), UDim.new(0, 16)
		pad.Parent = win
		local list = Instance.new("UIListLayout")
		list.Padding = UDim.new(0, 10)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Parent = win
		mkLabel(win, string.format("%d년 · %s", ev.year, ev.tag or "역사"), 13, COLORS.muted, false, 1)
		mkLabel(win, ev.title, 22, Color3.fromRGB(246, 208, 130), true, 2)
		mkLabel(win, ev.text, 15, COLORS.text, false, 3)
		for i, ch in ev.choices do
			local row = Instance.new("Frame")
			row.BackgroundTransparency = 1
			row.Size = UDim2.new(1, 0, 0, 0)
			row.AutomaticSize = Enum.AutomaticSize.Y
			row.LayoutOrder = 3 + i
			row.Parent = win
			local rl = Instance.new("UIListLayout")
			rl.Padding = UDim.new(0, 2)
			rl.Parent = row
			local ok = (view and view.player and view.player.coins or 0) >= ch.cost
			local b = mkButton(row, ch.label, COLORS.gold, UDim2.new(1, 0, 0, 40), function()
				closePopup()
				call("HistoryChoose", { choice = ch.index })
			end, ok)
			b.LayoutOrder = 1
			local hint = mkLabel(row, ch.hint or "", 12, COLORS.muted, false, 2)
			hint.LayoutOrder = 2
		end
		if ev.lockedInsight then
			mkLabel(win, string.format("🔒 %s (지식 필요: %s)", ev.lockedInsight.label, ev.lockedInsight.need), 12, COLORS.muted, false, 18)
		end
		if ev.relatedDisc or (ev.relatedGoods and ev.relatedGoods ~= "") then
			mkLabel(win, string.format("이어진 것 — 학문: %s · 교역품: %s", ev.relatedDisc or "-", if ev.relatedGoods ~= "" then ev.relatedGoods else "-"), 12, COLORS.muted, false, 19)
		end
		if ev.people and #ev.people > 0 then
			local names = {}
			for _, pp in ev.people do
				table.insert(names, pp.name .. (if pp.met then " (만난 적 있음)" else ""))
			end
			mkLabel(win, "얽힌 인물: " .. table.concat(names, ", ") .. " — 만난 적이 있으면 지식 활용 보상이 커져요", 12, COLORS.muted, false, 17)
		end
		local later = mkButton(win, "나중에 정하기", COLORS.grey, UDim2.new(1, 0, 0, 34), function()
			dismissed[ev.id] = true
			closePopup()
		end, true)
		later.LayoutOrder = 20
	end
	task.spawn(function()
		while true do
			task.wait(0.8)
			local hv = view and view.history
			local pend = hv and hv.pending
			if pend and not dismissed[pend.id] and popupFor ~= pend.id and not newGameMode then
				openPopup(pend)
			elseif not pend and popupGui then
				closePopup()
			end
		end
	end)
end

-- 시작 안내: 교역소(이름) → 주점(첫 동료) → 화가(초상화) / 선장 초상 칩
(function()
	local TweenService = game:GetService("TweenService")
	local dlg = nil
	local dlgPrevMusic = nil
	local function closeDlg()
		H.introDlgStep = nil
		if dlg then
			dlg:Destroy()
			dlg = nil
			-- 장면 음악이 있었다면 원래 곡으로 되돌린다
			if dlgPrevMusic ~= nil then
				local prev = dlgPrevMusic
				dlgPrevMusic = nil
				pcall(Sfx.music, prev or nil)
			end
		end
	end
	-- value: "hero:국가" | "npc:항구:칸" → 이미지, 오프셋, 크기
	function H.capPortraitAsset(value)
		if type(value) ~= "string" then
			return nil
		end
		local sheet, idx = string.match(value, "^cp:([%w_]+):(%d+)$")
		if sheet then
			local atlas = AssetIds["Portraits/companions_" .. sheet]
			local c = tonumber(idx)
			if not atlas or not c then
				return nil
			end
			-- 큰 시트는 로블록스가 1024 이하로 줄여 쓰므로 칸 좌표도 같은 비율로 줄인다
			local k = sheetK("companions_" .. sheet)
			return atlas, Vector2.new(c % 5 * 256 * k, math.floor(c / 5) * 336 * k), Vector2.new(256 * k, 336 * k)
		end
		local nation = string.match(value, "^hero:([%w_]+)$")
		if nation then
			return H.heroPortraitAsset(nation)
		end
		local port, cell = string.match(value, "^npc:([%w_]+):(%d)$")
		if port then
			return H.npcCellAsset(port, tonumber(cell))
		end
		return nil
	end
	local function portraitImg(parent, value, w, h, paper)
		local atlas, off, size = H.capPortraitAsset(value)
		if not atlas then
			return nil
		end
		local im = Instance.new("ImageLabel")
		im.Size = UDim2.fromOffset(w, h)
		im.BackgroundColor3 = Color3.fromRGB(30, 42, 62)
		im.BackgroundTransparency = if paper then 1 else 0
		im.BorderSizePixel = 0
		im.ScaleType = Enum.ScaleType.Crop
		im.Image = "rbxassetid://" .. tostring(atlas)
		im.ImageRectOffset = off
		im.ImageRectSize = size
		-- 칸이 타일보다 넓으면 머리가 있는 위쪽부터 맞춰 자른다 (가운데 자르기는 정수리가 잘림)
		if size.X > 0 and size.Y > 0 and w / h > size.X / size.Y then
			im.ImageRectSize = Vector2.new(size.X, math.floor(size.X * h / w))
		end
		corner(im, if paper then 2 else 8)
		if not paper then
			local st = Instance.new("UIStroke")
			st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			st.Color = Color3.fromRGB(214, 170, 82)
			st.Thickness = 2
			st.Parent = im
		end
		im.Parent = parent
		return im
	end

	-- spec: speaker, role, text, input(placeholder), choices(list of {label,value}), portraits(list of values), button
	local function openDlg(spec, onDone)
		closeDlg()
		local layer = overlayGui("IntroDialog", 58)
		dlg = layer
		local dim = Instance.new("Frame")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.55
		dim.BorderSizePixel = 0
		dim.Active = true -- 대화 뒤의 탭·버튼이 눌리지 않게 입력을 막는다
		dim.Parent = layer
		-- [화가 연출] 전체 화면 검은 띠는 초상화를 그리는 장면에만 적용한다.
		if spec.portraits then
		for _, top in { true, false } do
			local bar = Instance.new("Frame")
			bar.AnchorPoint = Vector2.new(0, if top then 0 else 1)
			bar.Position = UDim2.new(0, 0, if top then 0 else 1, 0)
			bar.Size = UDim2.new(1, 0, 0, 0)
			bar.BackgroundColor3 = Color3.new(0, 0, 0)
			bar.BorderSizePixel = 0
			bar.Parent = layer
			TweenService:Create(bar, TweenInfo.new(0.7, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Size = UDim2.new(1, 0, 0.09, 0) }):Play()
		end
		end
		if spec.music then
			if dlgPrevMusic == nil then
				dlgPrevMusic = Sfx.currentName() or false
			end
			pcall(Sfx.music, spec.music)
		end
		if spec.sting then
			Sfx.play(spec.sting, 0.55)
		end
		local win = Instance.new("Frame")
		win.Name = "IntroWindow"
		local narration = spec.speaker == "이야기"
		-- [시작 프롤로그] 이야기·길드·동료·화가 장면 모두 화면 중앙을 기준으로 배치한다.
		local viewport = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(1280, 720)
		local introBodySize = if viewport.X < 520 then 20 else 24
		local introTitleSize = if viewport.X < 520 then 22 else 26
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.new(0.9, 0, 0, 0)
		win.AutomaticSize = Enum.AutomaticSize.Y
		win.BackgroundColor3 = COLORS.cover
		win.BorderSizePixel = 0
		win.Parent = layer
		corner(win, 16)
		local wst = Instance.new("UIStroke")
		wst.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		wst.Color = BRASS
		wst.Thickness = 2.5
		wst.Parent = win
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(700, 700)
		lim.MinSize = Vector2.new(280, 120)
		lim.Parent = win
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14), UDim.new(0, 16), UDim.new(0, 16)
		pad.Parent = win
		local list = Instance.new("UIListLayout")
		list.Padding = UDim.new(0, 10)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Parent = win
		-- [인물 대화] 페드루와 동료는 각자의 실제 등록 초상을 보여 준다.
		local speakerBar = Instance.new("Frame")
		speakerBar.Name = "SpeakerPortraitHeader"
		speakerBar.Size = UDim2.new(1, 0, 0, 86)
		speakerBar.BackgroundColor3 = Color3.fromRGB(65, 48, 35)
		speakerBar.BorderSizePixel = 0
		speakerBar.LayoutOrder = 1
		speakerBar.Parent = win
		if narration then
			speakerBar.Size = UDim2.new(1, 0, 0, 60)
			speakerBar.BackgroundTransparency = 1
		end
		corner(speakerBar, 8)
		local portraitSpec = nil
		if string.find(spec.speaker, "페드루", 1, true) then
			portraitSpec = COMPANION_PORTRAIT.n_portugal
		elseif view and view.companions and view.companions.list then
			for _, member in view.companions.list do
				if member.name == spec.speaker then
					portraitSpec = COMPANION_PORTRAIT[member.id]
					break
				end
			end
		end
		local tile = if string.find(spec.speaker, "서기", 1, true) or string.find(spec.speaker, "화가", 1, true) then "scholar"
			elseif string.find(spec.speaker, "상인", 1, true) then "merchant"
			elseif string.find(spec.speaker, "주점", 1, true) then "tavern"
			else "hero"
		local heroId, heroOffset
		if not portraitSpec and tile == "hero" then
			heroId, heroOffset = H.heroPortraitAsset(chosenNation)
		end
		local regId, regOffset, regSize
		if not portraitSpec and tile ~= "hero" then
			regId, regOffset, regSize = H.facilityPortraitAsset(view and view.player and view.player.portId, tile)
		end
		local portraitId = if portraitSpec then AssetIds["Portraits/" .. portraitSpec.atlas]
			elseif regId then regId
			elseif FACILITY_ATLAS and FACILITY_TILE[tile] then FACILITY_ATLAS
			else heroId
		local portraitOffset = if portraitSpec then portraitSpec.offset
			elseif regId then regOffset
			elseif portraitId == FACILITY_ATLAS and FACILITY_TILE[tile] then FACILITY_TILE[tile]
			else heroOffset
		local face = Instance.new("ImageLabel")
		face.Name = "SpeakerFace"
		face.Position = UDim2.fromOffset(6, 5)
		face.Size = UDim2.fromOffset(65, 76)
		face.BackgroundColor3 = Color3.fromRGB(52, 77, 105)
		face.BorderSizePixel = 0
		face.Image = if portraitId then "rbxassetid://" .. tostring(portraitId) else ""
		local fk = if portraitSpec then sheetK(portraitSpec.atlas) else 1
		face.ImageRectOffset = (portraitOffset or Vector2.zero) * fk
		face.ImageRectSize = if regId then regSize elseif portraitOffset then PORTRAIT_SIZE * fk else Vector2.zero
		face.ScaleType = Enum.ScaleType.Crop
		face.Parent = speakerBar
		face.Visible = not narration
		corner(face, 6)
		local faceBorder = Instance.new("UIStroke")
		faceBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		faceBorder.Color = BRASS
		faceBorder.Thickness = 1.5
		faceBorder.Parent = face
		local speakerName = mkLabel(speakerBar, spec.speaker, introTitleSize, Color3.fromRGB(249, 223, 169), true)
		speakerName.Name = "IntroSpeakerName"
		speakerName.Position = UDim2.fromOffset(if narration then 0 else 82, 9)
		speakerName.Size = UDim2.new(1, if narration then 0 else -92, 0, 32)
		if narration then
			speakerName.TextXAlignment = Enum.TextXAlignment.Center
		end
		speakerName.AutomaticSize = Enum.AutomaticSize.None
		local speakerRole = mkLabel(speakerBar, spec.role or "항해 기록", 18, Color3.fromRGB(225, 198, 165), false)
		speakerRole.Name = "IntroSpeakerRole"
		speakerRole.Position = UDim2.fromOffset(if narration then 0 else 82, 44)
		speakerRole.Size = UDim2.new(1, if narration then 0 else -92, 0, 25)
		if narration then
			speakerRole.TextXAlignment = Enum.TextXAlignment.Center
		end
		speakerRole.AutomaticSize = Enum.AutomaticSize.None
		local bodyLabel = mkLabel(win, spec.text, introBodySize, COLORS.text, false, 2)
		bodyLabel.Name = "IntroBody"
		-- 글자가 한 자씩 나타나고, 몇 글자마다 작은 소리가 난다. 글을 누르면 한꺼번에 보인다.
		do
			local total = utf8.len(spec.text) or #spec.text
			if bodyLabel and total > 0 and not workspace:GetAttribute("QAAutoIntro") then
				bodyLabel.MaxVisibleGraphemes = 0
				local skipped = false
				local hit = Instance.new("TextButton")
				hit.BackgroundTransparency = 1
				hit.Text = ""
				hit.Size = UDim2.fromScale(1, 1)
				hit.ZIndex = 5
				hit.Parent = bodyLabel
				hit.Activated:Connect(function() skipped = true end)
				task.spawn(function()
					for i = 1, total do
						if skipped or not bodyLabel.Parent then break end
						bodyLabel.MaxVisibleGraphemes = i
						if i % 5 == 0 then Sfx.play("sfx_click", 0.1, 1.7) end
						task.wait(0.022)
					end
					if bodyLabel.Parent then bodyLabel.MaxVisibleGraphemes = -1 end
					hit:Destroy()
				end)
			end
		end
		local box
		if spec.input then
			box = Instance.new("TextBox")
			box.Size = UDim2.new(1, 0, 0, 40)
			box.BackgroundColor3 = COLORS.coverRaised
			box.BorderSizePixel = 0
			box.TextColor3 = COLORS.text
			box.PlaceholderText = spec.input
			box.PlaceholderColor3 = COLORS.muted
			box.Text = ""
			box.TextSize = 18
			box.Font = Enum.Font.GothamBold
			box.ClearTextOnFocus = false
			box.LayoutOrder = 3
			corner(box, 8)
			box.Parent = win
		end
		local picked = nil
		if spec.portraits then
			local grid = Instance.new("Frame")
			grid.BackgroundTransparency = 1
			grid.Size = UDim2.new(1, 0, 0, 0)
			grid.AutomaticSize = Enum.AutomaticSize.Y
			grid.LayoutOrder = 3
			local gl = Instance.new("UIGridLayout")
			gl.CellSize = UDim2.fromOffset(84, 84)
			gl.CellPadding = UDim2.fromOffset(8, 8)
			gl.SortOrder = Enum.SortOrder.LayoutOrder
			gl.Parent = grid
			local frames = {}
			for i, v in spec.portraits do
				local cell = Instance.new("TextButton")
				cell.LayoutOrder = i
				cell.Text = ""
				cell.AutoButtonColor = false
				cell.BackgroundTransparency = 1
				cell.BorderSizePixel = 0
				local im = portraitImg(cell, v, 84, 84)
				local st = im and im:FindFirstChildOfClass("UIStroke")
				frames[v] = st
				cell.Activated:Connect(function()
					Sfx.play("sfx_click")
					picked = v
					for pv, pst in frames do
						pst.Color = if pv == v then Color3.fromRGB(120, 230, 140) else Color3.fromRGB(214, 170, 82)
						pst.Thickness = if pv == v then 4 else 2
					end
				end)
				cell.Parent = grid
			end
			grid.Parent = win
		end
		local note = mkLabel(win, "", 13, Color3.fromRGB(240, 150, 120), false, 4)
		local submit
		local go = mkButton(win, spec.button or "확인", COLORS.gold, UDim2.new(1, 0, 0, 42), function() submit() end, true)
		function submit()
			local value = nil
			if box then
				value = box.Text
				-- Studio 자동 점검은 글자를 입력할 수 없다: 비워 두면 기본 이름으로 진행한다
				if (value == nil or string.match(value, "^%s*$")) and game:GetService("RunService"):IsStudio() then
					value = "새 선장"
				end
			elseif spec.portraits then
				value = picked
				if not value and game:GetService("RunService"):IsStudio() and spec.portraits[1] then
					value = spec.portraits[1] -- Studio 자동 점검은 초상을 고를 수 없어 첫 초상으로 진행
				end
				if not value then
					note.Text = "마음에 드는 초상을 골라 주세요"
					return
				end
			end
			local okCall, ok, msg = pcall(onDone, value)
			if not okCall then
				-- 서버에는 이미 반영됐을 수 있으니 화면이 멈추지 않게 다음 단계로 넘어갈 수 있게 한다
				warn("[Game] 시작 안내 대화 오류:", ok)
				note.Text = "화면 처리 중 문제가 생겼어요. 다시 눌러 주세요."
				if view and view.captain and view.captain.portrait and spec.portraits then
					closeDlg()
				end
			elseif ok == nil then
				note.Text = "서버 응답이 늦어요. 잠시 후 다시 눌러 주세요."
			elseif ok == false and msg == "너무 빨라요" and (spec.retries or 0) < 5 then
				spec.retries = (spec.retries or 0) + 1
				note.Text = ""
				task.delay(0.7, function() if dlg == layer then submit() end end) -- 조용히 몇 번 더
			elseif ok == false then
				note.Text = tostring(msg or "")
				if msg == "이미 초상화를 받았어요" or msg == "이미 장부에 올렸어요" then
					closeDlg()
				end
			end
		end
		go.LayoutOrder = 5
		if workspace:GetAttribute("QAAutoIntro") then
			-- Studio 자동 점검: 클릭 좌표가 어긋나도 안내 대화가 스스로 넘어가게 한다
			task.spawn(function()
				for _ = 1, 4 do
					task.wait(1.2)
					if dlg ~= layer then return end
					submit()
				end
			end)
		end
		if box then
			-- 엔터로도 확인한다
			box.FocusLost:Connect(function(enterPressed)
				if enterPressed and dlg == layer then
					submit()
				end
			end)
		end
	end

	-- 화면 왼쪽 선장 초상 칩 (초상화를 받으면 얼굴, 그 전에는 국기). 위쪽 정보창 아래에 둔다.
	local chip = Instance.new("Frame")
	chip.AnchorPoint = Vector2.new(0, 0)
	chip.Position = UDim2.fromOffset(7, 9)
	chip.Size = UDim2.fromOffset(56, 82)
	chip.BackgroundTransparency = 1
	chip.BorderSizePixel = 0
	chip.Visible = false
	chip.Parent = H.hudCard
	corner(chip, 3)
	local chipKey = nil
	local chipName = mkLabel(chip, "", 13, Color3.fromRGB(246, 208, 130), true)
	chipName.AnchorPoint = Vector2.new(0.5, 0)
	chipName.Visible = false
	chipName.Position = UDim2.new(0.5, 0, 0, 104)
	chipName.Size = UDim2.new(1, -8, 0, 18)
	chipName.AutomaticSize = Enum.AutomaticSize.None
	chipName.TextXAlignment = Enum.TextXAlignment.Center
	chipName.TextTruncate = Enum.TextTruncate.AtEnd
	local chipSub = mkLabel(chip, "", 10, COLORS.muted, false)
	chipSub.AnchorPoint = Vector2.new(0.5, 0)
	chipSub.Visible = false
	chipSub.Position = UDim2.new(0.5, 0, 0, 123)
	chipSub.Size = UDim2.new(1, -8, 0, 16)
	chipSub.AutomaticSize = Enum.AutomaticSize.None
	chipSub.TextXAlignment = Enum.TextXAlignment.Center
	chipSub.TextTruncate = Enum.TextTruncate.AtEnd
	chipSub.TextColor3 = Color3.fromRGB(150, 205, 255)
	local chipSub2 = mkLabel(chip, "", 10, COLORS.muted, false)
	chipSub2.AnchorPoint = Vector2.new(0.5, 0)
	chipSub2.Visible = false
	chipSub2.Position = UDim2.new(0.5, 0, 0, 142)
	chipSub2.Size = UDim2.new(1, -8, 0, 16)
	chipSub2.AutomaticSize = Enum.AutomaticSize.None
	chipSub2.TextXAlignment = Enum.TextXAlignment.Center
	chipSub2.TextTruncate = Enum.TextTruncate.AtEnd
	local function refreshChip()
		local c = view and view.captain
		local show = c ~= nil and not newGameMode
		chip.Visible = show
		if not show then
			return
		end
		local key = tostring(c.portrait) .. "|" .. tostring(c.name) .. "|" .. tostring(view.player and view.player.nation) .. "|" .. tostring(view.player and view.player.year)
		if key == chipKey then
			return
		end
		chipKey = key
		for _, ch in chip:GetChildren() do
			if ch.Name == "ChipFace" then
				ch:Destroy()
			end
		end
		chipName.Text = c.name or "선장"
		chipSub.Text = "🏳 " .. tostring(view.player.nation)
		chipSub2.Text = if c.origin then c.origin.name else ""
		local face = portraitImg(chip, c.portrait, 54, 80, true)
		if not face then
			local nid = nil
			for id, n in PortData.Nations do
				if n.name == view.player.nation then
					nid = id
				end
			end
			face = require(Shared:WaitForChild("Flags")).build(chip, nid, 52, 34)
			face.Position = UDim2.fromOffset(2, 6)
		else
			face.Position = UDim2.fromOffset(1, 1)
		end
		face.Name = "ChipFace"
		if not face:FindFirstChildOfClass("UIStroke") then
			local gold = Instance.new("UIStroke")
			gold.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			gold.Color = BRASS
			gold.Thickness = 2
			gold.Parent = face
		end
	end

	-- 화가가 완성한 초상을 크게 보여 준 뒤 칩으로 줄어든다
	local function reveal(value, name)
		-- 화가 연출: 어두워진 화면 한가운데 화첩이 열리고, 붓질 소리와 함께 초상이 위에서 아래로 그려진 뒤
		-- 화첩의 종이 초상으로 완성된다.
		local layer = overlayGui("PortraitReveal", 59)
		local shade = Instance.new("Frame")
		shade.Size = UDim2.fromScale(1, 1)
		shade.BackgroundColor3 = Color3.new(0, 0, 0)
		shade.BackgroundTransparency = 1
		shade.BorderSizePixel = 0
		shade.Parent = layer
		TweenService:Create(shade, TweenInfo.new(0.6), { BackgroundTransparency = 0.25 }):Play()
		local prevMusic = Sfx.currentName()
		local closed = false
		local function closeReveal()
			if closed then return end
			closed = true
			layer:Destroy()
			pcall(Sfx.music, prevMusic or nil)
			portraitKey = nil
		end
		local skip = mkButton(layer, "넘기기", COLORS.leather, UDim2.fromOffset(92, 44), closeReveal)
		skip.AnchorPoint = Vector2.new(1, 0)
		skip.Position = UDim2.new(1, -18, 0, 54)
		skip.ZIndex = 12
		task.delay(9, closeReveal)
		pcall(Sfx.music, "music_story_palace")
		Sfx.play("sfx_book_turn", 0.7)
		local camera = workspace.CurrentCamera
		local viewHeight = if camera then camera.ViewportSize.Y else 600
		local pictureHeight = math.clamp(math.floor(viewHeight * 0.64), 136, 328)
		local pictureWidth = math.floor(pictureHeight * 268 / 328)
		local frame = Instance.new("Frame")
		frame.AnchorPoint = Vector2.new(0.5, 0.5)
		frame.Position = UDim2.fromScale(0.5, 0.46)
		frame.Size = UDim2.fromOffset(0, 0)
		frame.BackgroundColor3 = Color3.fromRGB(224, 198, 153)
		frame.BorderSizePixel = 0
		frame.Parent = layer
		corner(frame, 3)
		local paperId = AssetIds["CardArt/event_title_parchment"]
		if paperId then
			frame.BackgroundTransparency = 1
			local sheet = Instance.new("ImageLabel")
			sheet.BackgroundTransparency = 1
			sheet.Size = UDim2.fromScale(1, 1)
			sheet.Image = "rbxassetid://" .. tostring(paperId)
			sheet.Parent = frame
		else
			local grain = bookMaterial(frame, "parchment", 128)
			if grain then grain.ImageTransparency = 0.19 end
		end
		TweenService:Create(frame, TweenInfo.new(0.7, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(pictureWidth, pictureHeight) }):Play()
		task.wait(0.8)
		if closed then return end
		local canvas = Instance.new("Frame")
		canvas.AnchorPoint = Vector2.new(0.5, 0.5)
		canvas.Position = UDim2.fromScale(0.5, 0.5)
		canvas.Size = UDim2.new(1, -18, 1, -18)
		canvas.BackgroundTransparency = 1
		canvas.BorderSizePixel = 0
		canvas.ClipsDescendants = true
		canvas.Parent = frame
		local big = portraitImg(canvas, value, pictureWidth - 18, pictureHeight - 18, true)
		local cap = mkLabel(layer, "", 24, COLORS.paper, true)
		cap.AnchorPoint = Vector2.new(0.5, 0)
		cap.Position = UDim2.new(0.5, 0, 0.46, pictureHeight / 2 + 12)
		cap.Size = UDim2.new(0.84, 0, 0, 42)
		cap.AutomaticSize = Enum.AutomaticSize.None
		cap.TextXAlignment = Enum.TextXAlignment.Center
		if big then
			big.AnchorPoint = Vector2.new(0.5, 0.5)
			big.Position = UDim2.fromScale(0.5, 0.5)
			-- 위에서 아래로 그려지는 붓질: 그림 아래쪽부터 투명하다가 점점 드러난다
			local wipe = Instance.new("UIGradient")
			wipe.Rotation = 90
			wipe.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(0.001, 1), NumberSequenceKeypoint.new(1, 1) })
			wipe.Parent = big
			for step = 1, 11 do
				local edge = step / 12
				wipe.Transparency = NumberSequence.new({
					NumberSequenceKeypoint.new(0, 0),
					NumberSequenceKeypoint.new(math.max(edge - 0.001, 0), 0),
					NumberSequenceKeypoint.new(math.min(edge + 0.04, 1), 1),
					NumberSequenceKeypoint.new(1, 1),
				})
				if step % 3 == 1 then Sfx.play("sfx_sail_fabric", 0.35, 1.5) end -- 붓이 캔버스를 쓰는 소리
				task.wait(0.22)
				if closed then return end
			end
			wipe:Destroy()
		else
			task.wait(2)
			if closed then return end
		end
		Sfx.play("sfx_fanfare", 0.6)
		Sfx.play("sfx_bell", 0.5)
		cap.Text = name
		task.wait(2.2)
		if closed then return end
		-- 종이 초상이 작아져 선장실 초상 자리로 이동한다
		cap.Text = "초상이 선장 칸에 올랐다"
		Sfx.play("sfx_ship_cabin_door", 0.6)
		-- 화면 왼쪽 위 선장 초상 칸(HUD)으로 줄어들며 사라진다
		local target = UDim2.new(0, 70, 0.36, 60)
		local tsize = UDim2.fromOffset(56, 82)
		pcall(function()
			local ap, asz = chip.AbsolutePosition, chip.AbsoluteSize
			local base = layer.AbsolutePosition
			target = UDim2.fromOffset(ap.X - base.X + asz.X / 2, ap.Y - base.Y + asz.Y / 2)
			tsize = UDim2.fromOffset(asz.X, asz.Y)
		end)
		TweenService:Create(frame, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut), {
			Size = tsize, Position = target,
		}):Play()
		TweenService:Create(shade, TweenInfo.new(0.9), { BackgroundTransparency = 1 }):Play()
		TweenService:Create(cap, TweenInfo.new(0.6), { TextTransparency = 1 }):Play()
		task.wait(0.8)
		-- 도착하면 종이가 투명해지며 HUD 초상이 그 자리에 남는다
		for _, d in frame:GetDescendants() do
			if d:IsA("ImageLabel") then
				TweenService:Create(d, TweenInfo.new(0.3), { ImageTransparency = 1 }):Play()
			elseif d:IsA("Frame") then
				TweenService:Create(d, TweenInfo.new(0.3), { BackgroundTransparency = 1 }):Play()
			end
		end
		TweenService:Create(frame, TweenInfo.new(0.3), { BackgroundTransparency = 1 }):Play()
		task.wait(0.35)
		closeReveal()
	end

	local function nationPortraits()
		local out = {}
		local nid = nil
		for id, n in PortData.Nations do
			if n.name == view.player.nation then
				nid = id
			end
		end
		for _, v in H.captainChoices[nid or ""] or {} do
			table.insert(out, v)
		end
		if #out == 0 then
			for id in PortData.Nations do
				table.insert(out, "hero:" .. id)
			end
			table.sort(out)
		end
		return out
	end

	local function runStep(step)
		task.defer(function() H.introDlgStep = step end) -- 안내창이 열린 뒤에 기록한다 (closeDlg가 지우므로)
		local c = view.captain
		local role = if step == "name" then "상인 길드" elseif step == "companion" then "주점" else "떠돌이 화가"
		if step == "name" then
			openDlg({ speaker = "길드 서기", role = role, music = "music_market", sting = "sfx_bell", input = "이름을 적으세요 (12글자까지)", button = "장부에 올린다",
				text = "(배에서 내리는 당신에게 상인 길드의 서기가 다가온다) 처음 보는 얼굴이군요. 이 항구에서 거래하려면 거래 장부에 이름이 있어야 합니다. 값을 치르고 영수증을 받는 사람의 이름이니까요. 뭐라고 적을까요?" },
				function(v)
					local r = call("IntroName", { name = v })
					if r and r.ok then
						Sfx.play("sfx_contract_stamp", 0.7)
						closeDlg()
					end
					return r and r.ok, r and r.message
				end)
		elseif step == "companion" then
			local who = c.companion
			if not who then
				call("IntroCompanion", {})
				return
			end
			openDlg({ speaker = who.name, role = who.role, music = "music_story_tavern", sting = "sfx_story_tavern", button = "함께 가자",
				text = string.format("(주점 구석에서 다가온다) 당신이 새로 온 선장이군요. 소문을 들었어요. 대가는 필요 없습니다. 같은 고향 사람끼리, 항해에 보탬이 되고 싶어요. 저를 태워 주시겠어요? (%s)", who.role) },
				function()
					local r = call("IntroCompanion", {})
					if r and r.ok then
						Sfx.play("sfx_quest_accept", 0.6)
						closeDlg()
					end
					return r and r.ok, r and r.message
				end)
		else
			openDlg({ speaker = "떠돌이 화가", role = role, music = "music_story_harbor", sting = "sfx_story_library", portraits = nationPortraits(), button = "이 얼굴로 그려 주세요",
				text = string.format("%s 선장님이시죠? 저는 항구를 떠돌며 항해자 화첩을 만들고 있어요. 바다로 나간 사람들의 얼굴을 남기면, 훗날 그들의 이야기가 사라지지 않거든요. 대가는 받지 않을게요. 어떤 모습으로 그려 드릴까요?", c.name or "선장") },
				function(v)
					local name = c.name or "선장"
					local r = call("IntroPortrait", { portrait = v })
					if r and r.ok then
						closeDlg()
						task.spawn(function()
							reveal(v, name)
						end)
					end
					return r and r.ok, r and r.message
				end)
		end
	end

	-- 오프닝 이벤트 장면: 시작 항구에 닿자마자 3인칭 서술로 이야기를 열고, 곧바로 이름·동료·초상 안내로 이어진다
	function H.openingScene()
		local pro = require(Shared:WaitForChild("Narrative")).Prologues[chosenNation]
		local portName = view and view.player and PortData.Ports[view.player.portId] and PortData.Ports[view.player.portId].name or "항구"
		openDlg({ speaker = "이야기", role = (pro and pro.title) or ("프롤로그 · " .. portName), music = "music_sea", sting = "sfx_horn",
			text = (pro and pro.text) or (portName .. " 부두에 새 선장이 첫발을 디딘다."), button = "항해를 시작한다" },
			function()
				closeDlg()
				Sfx.play("sfx_fanfare", 0.5)
				H.openingPending = false
				return true
			end)
	end

	-- 첫걸음 안내 띠: 지금 할 일을 한 줄로 보여 준다 (끝나면 사라진다)
	local goalGui = overlayGui("TutorialGoal", 11)
	local goalBar = Instance.new("TextButton")
	goalBar.AnchorPoint = Vector2.new(0.5, 0)
	goalBar.Position = UDim2.new(0.5, 0, 0, 8)
	goalBar.Size = UDim2.new(1, -20, 0, 48)
	local goalMax = Instance.new("UISizeConstraint")
	goalMax.MaxSize = Vector2.new(430, 48)
	goalMax.Parent = goalBar
	goalBar.BackgroundColor3 = COLORS.cover
	goalBar.BackgroundTransparency = 0.1
	goalBar.AutoButtonColor = false
	goalBar.Font = Enum.Font.GothamBold
	goalBar.TextSize = 15
	goalBar.TextWrapped = true
	goalBar.TextColor3 = Color3.fromRGB(246, 208, 130)
	goalBar.TextStrokeTransparency = 1 -- 작은 글자에 테두리가 겹쳐 번져 보이던 문제
	goalBar.TextTruncate = Enum.TextTruncate.AtEnd
	goalBar.Text = ""
	goalBar.Visible = false
	goalBar.Parent = goalGui
	corner(goalBar, 14)
	do
		local gs = Instance.new("UIStroke")
		gs.Color = BRASS
		gs.Thickness = 1.5
		gs.ApplyStrokeMode = Enum.ApplyStrokeMode.Border -- 기본값(Contextual)은 버튼 글자에도 테두리를 입혀 번져 보인다
		gs.Parent = goalBar
	end
	goalBar.Activated:Connect(function()
		-- [안내 통합] 첫걸음을 누르면 별도 팝업 대신 기존 저널의 상세 조언을 보여 준다.
		H.openJournal()
	end)
	local function refreshGoal()
		local c = view and view.captain
		if not c or newGameMode or H.tutorialHidden then
			H.tutorialGoalActive = false
			goalBar.Visible = false
			return
		end
		local p, ship = view.player, view.ship
		local sailed = p and (p.day or 0) > 0
		local goals = {
			{ done = c.step ~= "name", text = "상인 길드 서기에게 이름을 올리세요" },
			{ done = c.step == "portrait" or c.step == "done", text = "주점 동료를 맞이하세요" },
			{ done = c.step == "done", text = "떠돌이 화가에게 초상을 받으세요" },
			{ done = sailed or (ship and ship.cargoUsed or 0) > 0, text = "교역 탭에서 이 항구의 특산품을 사세요" },
			{ done = sailed, text = "지도 탭에서 다른 항구로 출항하세요" },
		}
		local n, next_ = 0, nil
		for _, g in goals do
			if g.done then n += 1 elseif not next_ then next_ = g end
		end
		if not next_ then
			H.tutorialHidden = true
			H.tutorialGoalActive = false
			goalBar.Visible = false
			return
		end
		H.tutorialGoalActive = true
		-- [첫걸음 전용 위치] 책 메뉴·대화 중에는 숨기고, 모바일에서는 도크 아이콘 아래에 둔다.
		goalBar.Visible = not main.Visible and hud.Visible and not bubble.Visible
			and not H.openingPending and not dlg and not inField and not sceneHold
		local width = hud.AbsoluteSize.X
		goalBar.Position = UDim2.new(0.5, 0, 0, if width < 610 then 260 elseif width < 1050 then 142 else 8)
		goalBar.Text = string.format("첫걸음 %d/%d · %s\n눌러서 동료 조언·일지 보기", n, #goals, next_.text)
	end

	task.spawn(function()
		local last = nil
		local openingShown = false
		while true do
			task.wait(0.7)
			pcall(refreshChip)
			pcall(refreshGoal)
			-- 중요 인물이 항구에서 찾아오면 일러스트 연출 장면이 저절로 열린다
			if view and view.autoStory and view.autoStory ~= H.autoStoryShown and not newGameMode and not sailingNow and not H.questScenesPlaying and not H.sceneBusy and not sceneHold and not dlg and not H.openingPending and main.Visible and not workspace:FindFirstChild("StoryScene", true) then
				for _, ev in view.story or {} do
					if ev.id == view.autoStory then
						H.autoStoryShown = ev.id
						pcall(playStory, ev)
						break
					end
				end
			end
			if H.openingPending and not openingShown and view and not newGameMode and not sceneHold and not dlg and main.Visible then
				openingShown = true
				pcall(H.openingScene)
			end
			if not H.openingPending then
				openingShown = false
			end
			local c = view and view.captain
			-- 서버에서 이미 다음 단계로 넘어갔는데 옛 안내창이 남아 있으면 닫는다 (화면에 갇히지 않게)
			if dlg and c and H.introDlgStep and c.step ~= H.introDlgStep and not H.openingPending then
				H.introDlgStep = nil
				closeDlg()
			end
			if c and not newGameMode and not sceneHold and not dlg and c.step ~= "done" then
				local want = main.Visible and not H.openingPending
				if want and last ~= c.step then
					last = c.step
					task.wait(0.4)
					if view and view.captain and view.captain.step == c.step and not dlg then
						local ok, err = pcall(runStep, c.step)
						if not ok then
							warn("[Game] 시작 안내 오류:", err)
						end
					end
				elseif not want then
					last = nil
				end
			end
		end
	end)
end)()

-- 개발 캡처용: 로컬에서 "DevCall" 속성에 State 를 넣으면 화면을 서버 상태로 새로 그린다 (읽기 전용 요청만)
task.spawn(function()
	while true do
		task.wait(1)
		if workspace:GetAttribute("DevCall") == "State" then
			workspace:SetAttribute("DevCall", nil)
			call("State")
		end
		if workspace:GetAttribute("DevCall") == "StoryPick" then
			workspace:SetAttribute("DevCall", nil)
			local ok, err = pcall(function()
				return call("PlayStory", { eventId = view.story[1].id, choice = 1 })
			end)
			workspace:SetAttribute("DevResult", tostring(ok) .. " " .. tostring(if type(err) == "table" then err.message else err))
		end
		if workspace:GetAttribute("DevCall") == "Hall" then
			workspace:SetAttribute("DevCall", nil)
			openTradeHall()
		end
		local dc = workspace:GetAttribute("DevCall")
		if type(dc) == "string" and dc:sub(1, 4) == "Tab:" then
			-- 개발 캡처용: 시설 창(trade/route/yard/quest/codex/status)을 이름으로 연다
			workspace:SetAttribute("DevCall", nil)
			local okTab, errTab = pcall(function()
				-- 타이틀 메뉴가 열려 있으면 먼저 닫는다(게임 화면 위에 창이 열리게)
				if H.titleMenuOpen then
					H.titleMenuOpen = false
					local tg = player:WaitForChild("PlayerGui"):FindFirstChild("TitleGui")
					if tg then tg:Destroy() end
					titleGui.Enabled = false
					menuToggle.Visible = false
				end
				openTab(dc:sub(5))
			end)
			workspace:SetAttribute("DevResult", dc .. " " .. tostring(okTab) .. " " .. tostring(errTab))
		elseif dc == "Yard" then
			workspace:SetAttribute("DevCall", nil)
			openYardHall()
		elseif dc == "Deck" then
			workspace:SetAttribute("DevCall", nil)
			pcall(function() H.openDeck() end)
		elseif dc == "Practice" or dc == "Puzzle" then
			workspace:SetAttribute("DevCall", nil)
			local ok2, err2 = pcall(function()
				H.devCards[if dc == "Practice" then "practice" else "puzzle"]()
			end)
			workspace:SetAttribute("DevResult", dc .. " " .. tostring(ok2) .. " " .. tostring(err2))
		elseif dc == "Options" then
			workspace:SetAttribute("DevCall", nil)
			openOptions()
		elseif type(dc) == "string" and string.sub(dc, 1, 7) == "CodexK_" then
			-- 개발 캡처용: 백과사전의 지식 트리 화면(개요 또는 학문 상세)을 바로 연다
			workspace:SetAttribute("DevCall", nil)
			local which = string.sub(dc, 8)
			codexField = if which == "overview" then nil else "k:" .. which
			openTab("codex")
		elseif type(dc) == "string" and string.sub(dc, 1, 4) == "Tab_" then
			workspace:SetAttribute("DevCall", nil)
			openTab(string.sub(dc, 5))
		end
	end
end)

-- 시작 직후(항구 정보가 오기 전)에도 고정 시점 카메라를 쓰고 캐릭터를 치워, 빈 하늘에 캐릭터만 떠 보이지 않게 한다
task.spawn(function()
	for _ = 1, 40 do
		if player.Character and player.Character:FindFirstChild("HumanoidRootPart") then break end
		task.wait(0.25)
	end
	local ok, err = pcall(applyView)
	if not ok then warn("[Game] 시작 시점 설정 실패", err) end
end)
