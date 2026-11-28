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
-- [시작 진단] 로딩 지연 위치를 실제 스튜디오에서 확인한다. 저장·게임 상태에는 영향이 없다.
gui:SetAttribute("StartupStage", "cover-created")

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
-- [로딩 관찰] 무거운 모듈을 기다리는 동안도 표지 문구를 계속 갱신한다.
-- 독립된 새 로딩 경로 없이 기존 StartLoading 표시와 StartupStage 진단값만 사용한다.
task.spawn(function()
    local started = os.clock()
    while H.startupCover and H.startupCover.Parent do
        task.wait(1)
        local stage = tostring(gui:GetAttribute("StartupStage") or "")
        if stage == "state-failed" or stage == "title-ready" then break end
        if H.startupLabel and H.startupLabel.Parent then
            local phase = if string.find(stage, "server-state", 1, true) then "항해 기록 확인"
                elseif stage == "client-ui-build" then "서재·항구 메뉴 구성"
                elseif stage == "await-GameAction" then "서버 연결 준비"
                else "항해 자료 준비"
            H.startupLabel.Text = string.format("학문의 바다\n%s 중... (%d초)", phase, math.floor(os.clock() - started))
        end
    end
end)

-- [캐릭터 스폰] 항구가 클라이언트에 만들어지기 전에는 바닥이 없으므로 추락을 막는다.
-- 실제 걸어 다니는 시점에는 아래 applyView에서 고정을 해제한다.
function H.placeCharacterOnSpawn(character)
	local root = character:WaitForChild("HumanoidRootPart", 10)
	if not root then return end
	-- [탐험·항해 보호] 다른 실제 장면이 캐릭터를 관리할 때는 항구로 돌려놓지 않는다.
	if workspace:FindFirstChild("FieldScene") or workspace:GetAttribute("VoyageActive") then return end
	-- [항구 스폰] 바닥이 생기기 전에는 보이지 않게 고정하고, 준비되면 실제 항구 위치로 이동한다.
	root.Anchored = true
	if sceneSpawn then
		local groundedSpawn = sceneSpawn
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			-- [지면 고정] 항구 실제 바닥과 R6/R15 발 높이를 맞춘다.
			local params = RaycastParams.new()
			params.FilterType = Enum.RaycastFilterType.Exclude
			params.FilterDescendantsInstances = { character }
			local ground = workspace:Raycast(sceneSpawn.Position + Vector3.new(0, 16, 0), Vector3.new(0, -48, 0), params)
			if ground then
				-- [높이 계산] R6는 다리 높이를 더해야 하고, R15는 HipHeight만 사용한다.
				local rootHeight = root.Size.Y * 0.5 + humanoid.HipHeight
				if humanoid.RigType == Enum.HumanoidRigType.R6 then
					local leg = character:FindFirstChild("Left Leg")
					if leg and leg:IsA("BasePart") then rootHeight += leg.Size.Y end
				end
				local targetY = ground.Position.Y + rootHeight + 0.05
				groundedSpawn = sceneSpawn + Vector3.new(0, targetY - sceneSpawn.Position.Y, 0)
			end
		end
		character:PivotTo(groundedSpawn)
	end
	for _, part in character:GetDescendants() do
		if part:IsA("BasePart") then
			part.LocalTransparencyModifier = if sceneSpawn then 0 else 1
		end
	end
	if sceneSpawn and not overview then root.Anchored = false end
end
player.CharacterAdded:Connect(H.placeCharacterOnSpawn)
player.CharacterAppearanceLoaded:Connect(H.placeCharacterOnSpawn)
if player.Character then
	task.defer(H.placeCharacterOnSpawn, player.Character)
end


gui:SetAttribute("StartupStage", "await-Shared")
local Shared = ReplicatedStorage:WaitForChild("Shared")
gui:SetAttribute("StartupStage", "require-CommonUI")
local CommonUI = require(Shared:WaitForChild("Common"):WaitForChild("RobloxCommonUI"))
gui:SetAttribute("StartupStage", "require-Ports")
local PortData = require(Shared:WaitForChild("Ports"))
gui:SetAttribute("StartupStage", "require-Ships")
local ShipsData = require(Shared:WaitForChild("Ships"))
gui:SetAttribute("StartupStage", "require-PortEras")
local PortEras = require(Shared:WaitForChild("PortEras"))
gui:SetAttribute("StartupStage", "require-Geo")
local Geo = require(Shared:WaitForChild("Geo"))
gui:SetAttribute("StartupStage", "require-SeaRoutes")
local SeaRoutes = require(Shared:WaitForChild("SeaRoutes"))
-- [로딩 분리] 시작 메뉴/서버 상태는 무거운 3D 항구 장면과 독립적으로 표시한다.
-- 단일 PortScene 정본을 계속 사용하고, 3D 장면은 같은 모듈을 비동기로 준비한다.
local PortScene = nil
-- [진입 시 로딩] 대형 항해·필드 모듈을 초기 표지 표시 전에 동기 호출하지 않는다.
-- 출항/탐험의 원래 책임 함수가 실제 사용 시 기존 정본 모듈을 불러온다.
local VoyageScene = nil
local FieldScene = nil
gui:SetAttribute("StartupStage", "require-Weapons")
local Weapons = require(Shared:WaitForChild("Weapons"))
gui:SetAttribute("StartupStage", "require-Pose")
local Pose = require(Shared:WaitForChild("Pose"))
gui:SetAttribute("StartupStage", "require-Sfx")
local Sfx = require(Shared:WaitForChild("Sfx"))
local audioLock = false -- 해전·항해 중에는 장면이 음악을 정한다
-- [진입 시 로딩] 3D 해전은 시작 화면 이후 전투 또는 카드 창에서 읽는다.
local NavalBattle = nil
gui:SetAttribute("StartupStage", "require-AssetIds")
local AssetIds = require(Shared:WaitForChild("AssetIds"))
gui:SetAttribute("StartupStage", "await-GameAction")
local remote = ReplicatedStorage:WaitForChild("GameAction")
gui:SetAttribute("StartupStage", "client-ui-build")
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
-- 메뉴·상점·전투·지도에서 행동의 우선순위를 같은 재질과 색으로 표현한다.
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
	blue = Color3.fromRGB(112, 80, 52), -- 오래된 해도에 찍은 갈색 잉크
	green = Color3.fromRGB(124, 104, 61), -- 황동·올리브 안료
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
	{ id = "market", name = "거래소·우편" },
	{ id = "status", name = "현황" },
	{ id = "harbor", name = "항구 정보" },
	{ id = "crew", name = "동료 관리" },
	{ id = "recruit", name = "동료 영입" },
	{ id = "scholar", name = "지식 보고" },
	{ id = "yard", name = "조선소" },
	{ id = "codex", name = "지식 카드" },
    { id = "encyclopedia", name = "백과사전" },
	{ id = "tech", name = "연구" },
	{ id = "map", name = "지도" },
	{ id = "diplomacy", name = "외교" },
	{ id = "explore", name = "지상 탐험" },
	{ id = "battle", name = "해적 사냥" },
	{ id = "gwent", name = "카드 대결" },
	{ id = "war", name = "함대전" },
}

-- 시설별 창: 건물에 들어가면 그 시설의 탭만 열린다
-- [메뉴 5묶음 · 2026-11-28 오너 지시: 직관·편의 완전 재배치] 탭 20개를 하는 일 기준 5묶음으로 모은다.
-- 하단 버튼 5개(항해·교역·모험·성장·기록)로 어디서든 열고, 3D 건물에 들어가면 그 건물 탭이 먼저 열린다.
-- 같은 묶음 안의 탭은 위쪽 가로 탭으로 바로 옮겨 다닌다. 저장·서버 동작은 그대로.
local GROUPS = {
	{ name = "항해", keeper = "항만 관리관", tabs = { "route", "map", "diplomacy" } },
	{ name = "교역", keeper = "상인 길드", tabs = { "trade", "market", "harbor" } },
	{ name = "모험", keeper = "주점 주인·전투 교관", tabs = { "board", "quest", "explore", "battle", "war", "gwent" } },
	{ name = "성장", keeper = "선장·조선 장인", tabs = { "status", "yard", "crew", "recruit", "tech" } },
	{ name = "기록", keeper = "학자", tabs = { "scholar", "codex", "encyclopedia" } },
}
-- 건물(시설) 단위 이름·담당자·초상은 예전 시설표를 그대로 쓴다.
H.FACILITY_GROUPS = {
	{ name = "교역소", keeper = "상인 길드", tabs = { "trade", "market", "harbor" } },
	{ name = "항만청", keeper = "항만 관리관", tabs = { "route", "map" } },
	{ name = "외교", keeper = "외교관", tabs = { "diplomacy" } },
	{ name = "조선소", keeper = "조선 장인", tabs = { "yard" } },
	{ name = "주점", keeper = "주점 주인", tabs = { "board", "quest", "recruit" } },
	{ name = "전투 본부", keeper = "전투 교관", tabs = { "battle", "explore", "war", "gwent" } },
	{ name = "학자의 서재", keeper = "학자", tabs = { "scholar", "codex", "tech", "encyclopedia" } },
	{ name = "선장실", keeper = "선장", tabs = { "status", "crew" } },
}
function H.facilityOf(tabId)
	for _, g in H.FACILITY_GROUPS do
		if table.find(g.tabs, tabId) then return g end
	end
	return H.FACILITY_GROUPS[1]
end
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
	trade = { "교역 장부", "시세 비교 → 수량 선택 → 매입·판매" , "상품 거래 보기" },
	harbor = { "항구 정보", "특산품·수요 → 시장·시설 → 발전 현황" , "항구 살펴보기" },
	route = { "항로 선택", "거리·위험 → 보급 확인 → 출항" , "항로 살펴보기" },
	map = { "세계 지도", "목적지 탐색 → 항구 정보 → 항로 연결" , "지도 살펴보기" },
	diplomacy = { "외교", "나라 정세 → 관계·전쟁 → 선물·개입", "외교 살펴보기" },
	yard = { "선박 관리", "선체·보급 → 선단·대포 → 새 배 비교" , "선박 비교 보기" },
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
    encyclopedia = { "세계 백과사전", "발견한 실물 사진 → 역사·과학 설명 → 개인 발견 기록", "책장 넘기기" },
	tech = { "기술 연구", "연구 조건 → 이해한 지식 → 기술 해금" , "연구 살펴보기" },
}

-- [교역 시세 통합] 화살표는 일별 등락이 아닌 현재 세계 항구 평균 대비 가격이다.
function H.marketPriceSignal(g)
	local average = tonumber(g.avgPrice) or tonumber(g.basePrice) or 0
	local buying = tonumber(g.buyTotals and g.buyTotals[1]) or tonumber(g.buy) or 0
	if average <= 0 then return "－", 0, "key" end
	local delta = (buying / average - 1) * 100
	-- [시세] 세계 평균 매입가보다 비싸면 빨강 ▲, 저렴하면 파랑 ▼. 하루 등락을 뜻하지 않는다.
	if delta < -0.5 then return "▼", delta, "good" end
	if delta > 0.5 then return "▲", delta, "key" end
	return "－", delta, "key"
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

local UI_MIN_TEXT = 17
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
	l.Font = if bold then Enum.Font.GothamBold else Enum.Font.Gotham
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
	entry.manualTurn = 0
	entry.gui.Active = true
	local dragging, lastX = false, 0
	entry.gui.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then
			dragging = true
			lastX = input.Position.X
		end
	end)
	entry.gui.InputChanged:Connect(function(input)
		if dragging and (input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseMovement) then
			entry.manualTurn += (input.Position.X - lastX) * 0.018
			lastX = input.Position.X
		end
	end)
	entry.gui.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch or input.UserInputType == Enum.UserInputType.MouseButton1 then dragging = false end
	end)
	table.insert(itemMotion, entry)
	if itemMotionConn then return end
	itemMotionConn = game:GetService("RunService").RenderStepped:Connect(function()
		local t = os.clock()
		for i = #itemMotion, 1, -1 do
			local e = itemMotion[i]
			if not e.gui.Parent or not e.gui:IsDescendantOf(game) then
				table.remove(itemMotion, i)
			elseif e.gui.AbsoluteSize.X > 0 then
				local a = t * 0.35 + e.phase + (e.manualTurn or 0)
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

H.facilityIconAtlas = AssetIds["CardArt/ui_facility_icons"]
-- [외교 손그림] 기존 승인된 황동 서신·깃펜 원화를 별도 시트에서 쓴다.
H.diplomacyIconAtlas = AssetIds["CardArt/ui_reserve_icons_2"]
H.facilityIconCells = {
	-- [승인 청동 원화 재사용] 신규 시트 미등록 상태에도 공통 메뉴는 같은 황동 실물 아이콘을 사용한다.
	nav = 2, tradeg = 0, adventure = 4, growth = 6, records = 7,
	nextstep = 2, reward = 0, recommend = 11, chapter = 7, problem = 4,
	cause = 11, todo = 7, result = 2, recap = 7, coach = 11, defeat = 4,
	hull = 3, cargo = 0, supply = 0, coin = 0, fame = 6, gift = 0, lock = 10, map_pin = 2, shipyard = 3,
	quest = 7, recruit = 1, crew = 6, explore = 2, war = 4, scholar = 5, tech = 10, chart = 2,
	trade = 0, market = 0, tavern = 1, board = 1, route = 2, map = 2, harbor = 2, yard = 3,
	battle = 4, codex = 5, encyclopedia = 5, status = 6, journal = 7,
	deck = 8, gwent = 8, view = 9, gear = 10, help = 11, diplomacy = 5, close = 15, -- 외교: 예비 손그림 2번 시트의 봉인 서신(2행 2열)
}
-- [청동 아이콘 통일] 기존 승인 청동 예비 시트(768px, 4×4)에서 도형 대신 쓸 칸.
-- {시트 번호, 칸}: 1 = ui_reserve_icons(닻·지도·두루마리…), 2 = ui_reserve_icons_2(선원·망원경·육분의…)
H.reserveIconAtlas = { AssetIds["CardArt/ui_reserve_icons"], AssetIds["CardArt/ui_reserve_icons_2"], AssetIds["CardArt/ui_menu_icons_3"], AssetIds["CardArt/ui_menu_icons_4"] }
H.reserveIconRowH = { 184, 189, 192, 192 } -- 시트 세로 739/758/768px ÷ 4
-- [메뉴 5묶음 청동 아이콘 · 2026-11-28] docs/MENU_UI_BRIEF.md 의 768px 4×4 시트(CardArt/ui_menu_icons_3)가 등록되면 자동 사용.
-- 칸 번호: 0 항해 1 교역 2 모험 3 성장 4 기록 5 다음할일 6 보상 7 추천 8 장도장 9 문제 10 원인 11 할일 12 결과 13 지난이야기 14 처음안내 15 패배조언
H.MENU_SHEET_CELLS = { nav = 0, tradeg = 1, adventure = 2, growth = 3, records = 4, nextstep = 5, reward = 6, recommend = 7,
	chapter = 8, problem = 9, cause = 10, todo = 11, result = 12, recap = 13, coach = 14, defeat = 15 }
H.reserveIconCells = {
	nav = { 3, 0 }, tradeg = { 3, 1 }, adventure = { 3, 2 }, growth = { 3, 3 }, records = { 3, 4 },
	nextstep = { 3, 5 }, reward = { 3, 6 }, recommend = { 3, 7 }, chapter = { 3, 8 },
	problem = { 3, 9 }, cause = { 3, 10 }, todo = { 3, 11 }, result = { 3, 12 },
	recap = { 3, 13 }, coach = { 3, 14 }, defeat = { 3, 15 },
	diplomacy = { 2, 5 }, quest = { 1, 8 }, recruit = { 2, 0 }, crew = { 2, 0 }, explore = { 2, 4 },
	harbor = { 1, 0 }, war = { 2, 8 }, scholar = { 2, 14 }, tech = { 2, 6 }, chart = { 1, 2 },
}
-- 추가 메뉴 시트는 등록된 경우에만 기존 칸을 교체한다. 미등록 시 원래 예비 시트를 유지.
if H.reserveIconAtlas[4] then
	for i, key in { "quest", "shipyard", "lock", "war", "gift", "star", "profit_up", "profit_down", "cargo", "supply", "hull", "crew", "coin", "fame", "map_pin", "close" } do
		H.reserveIconCells[key] = { 4, i - 1 }
	end
end
function H.hasIconArt(key)
	local r = H.reserveIconCells[key]
	if r and H.reserveIconAtlas[r[1]] ~= nil then return true end
	return H.facilityIconAtlas ~= nil and H.facilityIconCells[key] ~= nil
end
local function modelIcon(parent, kind, asset, tint, px, labelText, smallArt, portraitOffset)
	local reserve = if kind == "FacilityArt" then H.reserveIconCells[asset] else nil
	local reserveAtlas = reserve and H.reserveIconAtlas[reserve[1]]
	local atlas = if reserveAtlas then reserveAtlas else H.facilityIconAtlas
	local cell = if reserveAtlas then reserve[2] else (atlas and H.facilityIconCells[asset])
	if kind == "FacilityArt" and cell ~= nil then
		local icon = Instance.new("ImageLabel")
		icon.Size = UDim2.fromOffset(px, px)
		icon.BackgroundTransparency = 1
		icon.ScaleType = Enum.ScaleType.Fit
		-- [아이콘 아틀라스] 예비 시트는 192px 칸, 기존 시설 시트는 512px 시트의 128px 칸.
		local cellW = if reserveAtlas then 192 else 128
		local cellH = if reserveAtlas then H.reserveIconRowH[reserve[1]] else 128
		icon.Image = "rbxassetid://" .. tostring(atlas)
		icon.ImageRectOffset = Vector2.new(cell % 4 * cellW, math.floor(cell / 4) * cellH)
		icon.ImageRectSize = Vector2.new(cellW, cellH)
		icon:SetAttribute("FacilityArtKey", asset)
		icon.Parent = parent
		return icon
	end
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
	vf.Ambient = if kind == "Naval" then Color3.fromRGB(135, 140, 145)
		elseif kind == "Castle" and px <= 50 then Color3.fromRGB(255, 245, 220)
		else Color3.fromRGB(202, 195, 181)
	vf.LightColor = if kind == "Castle" and px <= 50 then Color3.fromRGB(255, 255, 245)
		elseif kind == "Naval" then Color3.fromRGB(255, 236, 209) else Color3.fromRGB(255, 247, 224)
	-- [투명 외교] 기존 등록 깃발 모델은 UI 받침·테두리 없이 아이콘만 남긴다.
	if kind == "Castle" and px <= 50 then
		vf.BackgroundTransparency = 1
		local border = vf:FindFirstChildOfClass("UIStroke")
		if border then border.Transparency = 1 end
		local wash = vf:FindFirstChildOfClass("UIGradient")
		if wash then wash:Destroy() end
	end
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
		-- [모바일 성능] 작은 거래 카드(96px 포함)는 정지 표본, 큰 전시장(144px 이상)만 회전한다.
		if px >= 144 then
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
	local good = active and color == COLORS.green
	local travel = active and color == COLORS.blue
	local back = active and color == COLORS.leather
	-- [장정 색채] 실행은 황동, 선택·확인은 양피지, 돌아가기는 가죽, 위험은 붉은 인주.
	-- 기존 color 식별값은 행동 의미 구분에만 사용하고 파랑·초록 단색 채움은 없앤다.
	local inkTint = if back then Color3.fromRGB(255, 241, 210)
		elseif danger then Color3.fromRGB(94, 25, 23)
		else INK
	b.BackgroundColor3 = if not active then Color3.fromRGB(174, 169, 159)
		elseif danger then Color3.fromRGB(225, 184, 155)
		elseif back then Color3.fromRGB(91, 67, 47)
		elseif highlighted then Color3.fromRGB(239, 202, 123)
		else Color3.fromRGB(232, 211, 174)
	b.TextColor3 = if active then inkTint else Color3.fromRGB(97, 93, 89)
	b.Font = Enum.Font.GothamBold
	b.TextSize = math.clamp(math.floor((size.Y.Offset > 0 and size.Y.Offset or 40) * 0.37), 14, 20)
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
			if not active then Color3.fromRGB(211, 206, 196)
				elseif danger then Color3.fromRGB(248, 209, 194)
				elseif good or travel then Color3.fromRGB(251, 237, 208)
				elseif back then Color3.fromRGB(131, 99, 69)
				elseif highlighted then Color3.fromRGB(254, 224, 158) else Color3.fromRGB(238, 219, 183),
			if not active then Color3.fromRGB(166, 157, 143)
				elseif danger then Color3.fromRGB(211, 127, 107)
				elseif good or travel then Color3.fromRGB(204, 169, 115)
				elseif back then Color3.fromRGB(74, 51, 35)
				elseif highlighted then Color3.fromRGB(193, 146, 72) else Color3.fromRGB(193, 156, 103)
		)
		grad.Rotation = 90
		grad.Parent = b
		local grain = bookMaterial(b, if parent == H.tabStrip or back then "leather" else "parchment", 148)
		-- 큰 실행 버튼에만 지시서의 승인된 원화 적용. 시설 탭은 자체 상태 원화를 쓴다.
		local skinKey = if not active then "grey" elseif highlighted then "gold" elseif good then "green" else nil
		local buttonArt = if skinKey and size.Y.Offset >= 44 and parent ~= H.tabStrip then AssetIds["CardArt/ui_button_" .. skinKey] else nil
		local initialColor = b.BackgroundColor3
		if grain then
			grain.ImageColor3 = if danger then Color3.fromRGB(248, 185, 169)
				elseif good or travel then Color3.fromRGB(242, 217, 175)
				elseif back then Color3.fromRGB(138, 111, 78)
				elseif highlighted then Color3.fromRGB(252, 220, 148)
				elseif active then Color3.fromRGB(251, 238, 212) else Color3.fromRGB(193, 183, 168)
			grain.ImageTransparency = if back then 0.58 elseif danger or good or travel then 0.64 else 0.55
			if buttonArt then
				grain.Image = "rbxassetid://" .. tostring(buttonArt)
				grain.ScaleType = Enum.ScaleType.Slice
				grain.SliceCenter = Rect.new(24, 24, 232, 72)
				grain.SliceScale = 0.5
				grain.ImageColor3 = Color3.new(1, 1, 1)
				grain.ImageTransparency = 0
			end
		end
		if grain and parent ~= H.tabStrip then
			-- 탭 재질은 renderTabs가 선택 상태와 함께 관리한다. 일반 버튼의 경고색만 여기서 갱신한다.
			b:GetPropertyChangedSignal("BackgroundColor3"):Connect(function()
				grain.ImageTransparency = if buttonArt then (if b.BackgroundColor3 == initialColor then 0 else 1) elseif b.BackgroundColor3 == COLORS.red then 1 else 0.55
			end)
		end
		local edge = Instance.new("UIStroke")
		edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		edge.Color = if not active then Color3.fromRGB(125, 121, 115)
			elseif danger then Color3.fromRGB(154, 47, 42)
			elseif good or travel then Color3.fromRGB(158, 108, 47)
			elseif back then Color3.fromRGB(205, 163, 93) else INK_EDGE
		edge.Thickness = if highlighted or danger or good or travel then 2.3 else 1.6
		edge.Transparency = if active then 0.02 else 0.4
		edge.Parent = b
		-- 깊이를 주는 안쪽 인쇄 테두리
		local bevel = Instance.new("Frame")
		bevel.Name = "PressedEdge"
		bevel.Visible = not buttonArt
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
		mark.BackgroundColor3 = if not active then COLORS.grey elseif danger then Color3.fromRGB(154, 47, 42) elseif highlighted then UI_BRASS else UI_BRASS_DARK
		mark.BackgroundTransparency = if active then 0.16 else 0.55
		mark.BorderSizePixel = 0
		mark.Position = UDim2.fromOffset(5, 8)
		mark.Size = UDim2.new(0, 4, 1, -16)
		mark.ZIndex = b.ZIndex + 1
		mark.Active = false
		mark.Parent = b
		mark.Visible = not buttonArt and (size.X.Scale > 0 or size.X.Offset >= 60)
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
		rivet.Visible = not buttonArt and (size.X.Scale > 0 or size.X.Offset >= 88)
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
			caption.TextTruncate = Enum.TextTruncate.AtEnd
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
	local btnWidth = if btnCount > 0 then btnCount * 112 + 8 else 0 -- [넓은 메뉴] 버튼마다 손가락 영역 확보
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
			local b = mkButton(row, spec.text, spec.color or COLORS.blue, UDim2.fromOffset(104, 54), spec.onClick, spec.enabled)
			b.AnchorPoint = Vector2.new(1, 0.5)
			b.Position = UDim2.new(1, -6 - (btnCount - i) * 112, 0.5, 0)
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
		-- [모바일 장부] 버튼이 많은 정보 카드에서는 글과 조작 영역을 세로로 나눈다.
        local left = textBox.Position.X.Offset
		local narrow = width > 0 and btnCount > 0 and width < math.max(520, left + btnWidth + 240)
		local buttonSpace = if narrow then 0 else btnWidth
		textBox.Size = UDim2.new(1, -(left + buttonSpace + 12), if narrow then 0 else 1, if narrow then math.max(30, layout.AbsoluteContentSize.Y + 10) else -8)
		local textHeight = layout.AbsoluteContentSize.Y + 12
		-- [모바일 조작] 좁은 화면의 3~4개 버튼을 두 줄로 나눠 읽기 쉬운 너비 확보.
        local buttonColumns = if narrow and width < 480 then math.min(2, btnCount) else btnCount
        local buttonRows = if narrow then math.ceil(btnCount / math.max(1, buttonColumns)) else 0
        local targetHeight = math.max(minH, textHeight + (row:GetAttribute("FooterHeight") or 0) + (if narrow then buttonRows * 60 + 6 else 0))
		if row.Size.Y.Offset ~= targetHeight then row.Size = UDim2.new(1, -6, 0, targetHeight) end
		for i, button in buttonRefs do
			if narrow then
				button.AnchorPoint = Vector2.new(0, 1)
                local rowIndex = math.floor((i - 1) / buttonColumns)
                local columnIndex = (i - 1) % buttonColumns
                button.Position = UDim2.new(columnIndex / buttonColumns, 5, 1, -5 - (buttonRows - rowIndex - 1) * 60)
                button.Size = UDim2.new(1 / buttonColumns, -10, 0, 54)
			else
				button.AnchorPoint = Vector2.new(1, 0.5)
				button.Position = UDim2.new(1, -6 - (btnCount - i) * 112, 0.5, 0)
				button.Size = UDim2.fromOffset(104, 54)
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
function H.tileGrid(items, parent, cellW, cellH, quick)
	-- [방문 메뉴] 주점의 원화 카드 문법을 유지하면서 시설 바로가기는 모바일 한눈형으로 압축한다.
	if quick then
		cellW, cellH = 216, 166
	else
		cellW, cellH = math.floor((cellW or 176) * 1.3), math.max(316, math.floor((cellH or 156) * 1.55))
		for _, it in items do
			if it.desc then cellH = math.max(cellH, 366)
			elseif it.portrait then cellH = math.max(cellH, 342) end
			if it.affinity ~= nil then cellH = math.max(cellH, 386) end
		end
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
		local iconPx = if quick then 66 elseif it.portrait then 164 else 148
		local ic = modelIcon(tile, if it.portrait then "Portraits" else (it.kind or "Menu"), if it.portrait then it.portrait.atlas else it.icon, nil, iconPx, it.title, nil, if it.portrait then it.portrait.offset else nil)
		ic.AnchorPoint = if quick then Vector2.zero else Vector2.new(0.5, 0)
		ic.Position = if quick then UDim2.fromOffset(10, 12) else UDim2.new(0.5, 0, 0, 8)
		local textY = iconPx + 14
		local nm = mkLabel(tile, it.title, if quick then 19 else 21, INK, true)
		nm.AutomaticSize = Enum.AutomaticSize.None
		nm.Position = if quick then UDim2.fromOffset(82, 12) else UDim2.fromOffset(4, textY)
		nm.Size = if quick then UDim2.new(1, -90, 0, 28) else UDim2.new(1, -8, 0, 26)
		nm.TextXAlignment = Enum.TextXAlignment.Center
		nm.TextTruncate = Enum.TextTruncate.AtEnd
		if it.sub then
			local sb = mkLabel(tile, it.sub, 17, INK_SOFT, false)
			sb.AutomaticSize = Enum.AutomaticSize.None
			sb.Position = if quick then UDim2.fromOffset(82, 42) else UDim2.fromOffset(4, textY + 28)
			sb.Size = if quick then UDim2.new(1, -90, 0, if it.affinity ~= nil then 44 else 54) else UDim2.new(1, -8, 0, 40)
			sb.TextSize = if quick then 14 else 17
			sb.TextWrapped = true
			sb.TextXAlignment = Enum.TextXAlignment.Center
			sb.TextTruncate = Enum.TextTruncate.AtEnd
		end
		if it.affinity ~= nil then
			local track = Instance.new("Frame")
			track.Name = "CompanionAffinityTrack"
			track.BackgroundColor3 = Color3.fromRGB(177, 151, 111)
			track.BorderSizePixel = 0
			track.Position = if quick then UDim2.fromOffset(82, 92) else UDim2.fromOffset(12, textY + 70)
			track.Size = if quick then UDim2.new(1, -94, 0, 8) else UDim2.new(1, -24, 0, 8)
			track.Parent = tile
			corner(track, 4)
			local fill = Instance.new("Frame")
			fill.Name = "CompanionAffinityFill"
			fill.Size = UDim2.fromScale(math.clamp(it.affinity / 100, 0, 1), 1)
			fill.BackgroundColor3 = Color3.fromRGB(77, 135, 91)
			fill.BorderSizePixel = 0
			fill.Parent = track
			corner(fill, 4)
		end
		if it.desc then
			local ds = mkLabel(tile, it.desc, 16, INK, false)
			ds.AutomaticSize = Enum.AutomaticSize.None
			ds.Position = UDim2.fromOffset(8, textY + (if it.affinity ~= nil then 85 else 69))
			ds.Size = UDim2.new(1, -16, 0, 58)
			ds.TextWrapped = true
			ds.TextYAlignment = Enum.TextYAlignment.Top
			ds.TextXAlignment = Enum.TextXAlignment.Center
			ds.TextTruncate = Enum.TextTruncate.AtEnd
		end
		local buttonHeight = if quick then 48 else 54
		if it.btn and it.btn2 then
			local b1 = mkButton(tile, it.btn, it.color or COLORS.gold, UDim2.new(0.5, -12, 0, buttonHeight), it.onClick, on)
			b1.Position = UDim2.new(0, 8, 1, -buttonHeight - 8)
			local b2 = mkButton(tile, it.btn2.text, it.btn2.color or COLORS.red, UDim2.new(0.5, -12, 0, buttonHeight), it.btn2.onClick, it.btn2.enabled ~= false)
			b2.Position = UDim2.new(0.5, 4, 1, -buttonHeight - 8)
		elseif it.btn then
			local b = mkButton(tile, it.btn, it.color or COLORS.gold, UDim2.new(1, -16, 0, buttonHeight), it.onClick, on)
			b.Position = UDim2.new(0, 8, 1, -buttonHeight - 8)
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
	-- [항해 장부 목차] 소제목과 본문을 명확히 구분한다.
    local l = mkLabel(parent, "◆ " .. text, 19, INK, true)
    l.Size = UDim2.new(1, -8, 0, 34)
	l.AutomaticSize = Enum.AutomaticSize.Y -- 좁은 화면에서 긴 소제목이 두 줄이 되어도 잘리지 않게 (26은 최소 높이)
	l.TextYAlignment = Enum.TextYAlignment.Center
	l.BackgroundTransparency = 0
	l.BackgroundColor3 = Color3.fromRGB(218, 190, 139)
    l.TextWrapped = true
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
local main, mainInner = CommonUI.CreatePanel({
	name = "Main", size = UDim2.new(1, -16, 1, -16), theme = H.bookTheme,
	-- 승인된 512×512 책 표지: 공용 패널의 기존 9분할 기능을 사용한다.
	surfaceTexture = if AssetIds["CardArt/ui_frame_book"] then "rbxassetid://" .. tostring(AssetIds["CardArt/ui_frame_book"]) else nil,
	sliceCenter = if AssetIds["CardArt/ui_frame_book"] then Rect.new(64, 64, 448, 448) else nil,
	sliceScale = if AssetIds["CardArt/ui_frame_book"] then 0.5 else nil,
})
main.AnchorPoint = Vector2.new(0.5, 0.5)
main.Position = UDim2.fromScale(0.5, 0.5)
main.BackgroundColor3 = COLORS.cover
main.Parent = gui
-- 시설 페이지는 읽을 수 있는 본문 면을 바로 노출한다.
mainInner.BackgroundColor3 = COLORS.coverRaised
mainInner.BackgroundTransparency = if AssetIds["CardArt/ui_frame_book"] then 0.45 else 0.08
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local sizeLimit = Instance.new("UISizeConstraint")
	sizeLimit.MaxSize = Vector2.new(4000, 3000)
	sizeLimit.Parent = main
end

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
headerLabel.Font = Enum.Font.GothamBold
headerLabel.TextColor3 = COLORS.ink
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local mastheadSize = Instance.new("UITextSizeConstraint")
	mastheadSize.MinTextSize = 15
	mastheadSize.MaxTextSize = 23
	mastheadSize.Parent = headerLabel
end
headerLabel.Text = "불러오는 중..."
headerLabel.Parent = mainInner

-- [초상화 위치] 표제지 y=4~62 안쪽에 52px 초상을 y=7~59로 정렬한다.
-- 시설 주인 초상화 (대항해시대 온라인의 NPC 얼굴 창처럼)
local portraitFrame = Instance.new("ViewportFrame")
portraitFrame.Position = UDim2.fromOffset(11, 7)
portraitFrame.Size = UDim2.fromOffset(52, 52)
portraitFrame.BackgroundTransparency = 1 -- [인물 초상] 회색 판 제거
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
portraitImage.Position = UDim2.fromOffset(11, 7)
portraitImage.Size = UDim2.fromOffset(52, 52)
portraitImage.BackgroundTransparency = 1 -- [인물 초상] 원화 뒤 회색 판 제거
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
captainPlaceholder.Position = UDim2.fromOffset(11, 7)
captainPlaceholder.Size = UDim2.fromOffset(52, 52)
captainPlaceholder.BackgroundTransparency = 1 -- [선장 미완성] 배경 없이 기호만 표시
captainPlaceholder.BorderSizePixel = 0
captainPlaceholder.Text = "?"
captainPlaceholder.Font = Enum.Font.GothamBlack
captainPlaceholder.TextSize = 38
captainPlaceholder.TextColor3 = Color3.fromRGB(234, 246, 255)
captainPlaceholder.Visible = false
captainPlaceholder.Parent = mainInner
corner(captainPlaceholder, 8)
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local pendingStroke = Instance.new("UIStroke")
	pendingStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	pendingStroke.Color = Color3.fromRGB(214, 170, 82)
	pendingStroke.Thickness = 2
	pendingStroke.Parent = captainPlaceholder
end

local portraitKey = nil
local PORTRAIT_ROLE = {
	["교역소"] = "Rogue", ["항만청"] = "Knight", ["조선소"] = "Barbarian",
	["주점"] = "Barbarian", ["전투 본부"] = "Knight", ["학자의 서재"] = "Mage", ["선장실"] = "Rogue_Hooded", ["외교"] = "Knight",
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
	["주점"] = "tavern", ["학자의 서재"] = "scholar", ["외교"] = "harbor", -- 외교관: 관리 초상
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
coinChip.Visible = false -- [중복 정리] 상단 공통 현황으로 통합, 코인 갱신 참조는 보존.
-- [공통 상단 현황] 양피지에 진한 잉크와 경계선을 둬 모든 시설에서 같은 위치·대비를 유지한다.
H.menuStatusLabel = mkLabel(mainInner, "", 18, Color3.fromRGB(255, 239, 183), true)
H.menuStatusLabel.Name = "MenuGlobalMoneyCargo"
H.menuStatusLabel.AnchorPoint = Vector2.new(0.5, 0)
H.menuStatusLabel.AutomaticSize = Enum.AutomaticSize.None
H.menuStatusLabel.TextXAlignment = Enum.TextXAlignment.Center
H.menuStatusLabel.TextYAlignment = Enum.TextYAlignment.Center
H.menuStatusLabel.TextTruncate = Enum.TextTruncate.AtEnd
H.menuStatusLabel.BackgroundTransparency = 0
H.menuStatusLabel.BackgroundColor3 = Color3.fromRGB(55, 40, 27) -- [자금·화물] 어두운 가죽판에 금빛 글씨
H.menuStatusLabel.ZIndex = 5
corner(H.menuStatusLabel, 6)
do
	-- [로컬 레지스터 예산] 장식 인스턴스는 여기서만 필요하며 장기 보유하지 않는다.
	local statusEdge = Instance.new("UIStroke")
	statusEdge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	statusEdge.Color = Color3.fromRGB(229, 181, 95)
	statusEdge.Thickness = 2
	statusEdge.Parent = H.menuStatusLabel
end
H.menuStatusLabel.Position = UDim2.new(0.5, 0, 0, 15)
H.menuStatusLabel.Size = UDim2.fromOffset(330, 34)
-- [공통 화물 상태] 숫자와 실제 적재율을 같은 현황판에 표시한다.
do
  local track = Instance.new("Frame")
  track.Name = "MenuCargoTrack"
  track.BackgroundColor3 = Color3.fromRGB(100, 77, 50)
  track.BorderSizePixel = 0
  track.Position = UDim2.new(0, 8, 1, -6)
  track.Size = UDim2.new(1, -16, 0, 3)
  track.ZIndex = H.menuStatusLabel.ZIndex + 1
  track.ClipsDescendants = true
  corner(track, 2)
  track.Parent = H.menuStatusLabel
  H.menuCargoFill = Instance.new("Frame")
  H.menuCargoFill.Name = "MenuCargoFill"
  H.menuCargoFill.BorderSizePixel = 0
  H.menuCargoFill.BackgroundColor3 = UI_BRASS
  H.menuCargoFill.Size = UDim2.fromScale(0, 1)
  H.menuCargoFill.ZIndex = track.ZIndex + 1
  corner(H.menuCargoFill, 2)
  H.menuCargoFill.Parent = track
end
-- [최근 메뉴] 기존 직전 탭 기억을 재사용. 모든 시설의 자금·화물 현황 바로 옆에 둔다.
H.menuRecentButton = mkButton(mainInner, "← 최근 메뉴", COLORS.leather,
	UDim2.fromOffset(126, 34), function()
		local recent = H.recentTab
		if recent and TAB_NAME[recent] and recent ~= currentTab then
			openTab(recent, if recent == "map" then "chart" else nil)
		end
	end, true)
H.menuRecentButton.Name = "RecentFacilityShortcut"
H.menuRecentButton.Visible = false
H.menuRecentButton.TextSize = 15
H.menuRecentButton.ZIndex = 9

-- [공통 시설 메뉴] 왼쪽 탭 전용 열을 없애고 창 오른쪽 상단에 가로 책갈피를 둔다.
local tabBar = Instance.new("Frame")
tabBar.Name = "FacilityTabBar"
tabBar.BackgroundTransparency = 1
tabBar.BorderSizePixel = 0
tabBar.AnchorPoint = Vector2.new(1, 0)
tabBar.Position = UDim2.new(1, -8, 0, 68)
tabBar.Size = UDim2.fromOffset(0, 58)
tabBar.Parent = mainInner
-- [모바일] 탭이 많으면 줄바꿈 대신 같은 상단 줄을 좌우로 밀어 모든 항목에 접근한다.
H.tabStrip = Instance.new("ScrollingFrame")
H.tabStrip.Name = "FacilityTabStrip"
H.tabStrip.BackgroundTransparency = 1
H.tabStrip.BorderSizePixel = 0
H.tabStrip.Size = UDim2.fromScale(1, 1)
H.tabStrip.ScrollBarThickness = 2
H.tabStrip.ScrollBarImageColor3 = UI_BRASS
H.tabStrip.ScrollingDirection = Enum.ScrollingDirection.X
H.tabStrip.CanvasSize = UDim2.new()
H.tabStrip.ClipsDescendants = true
H.tabStrip.Parent = tabBar
-- [모바일 한 줄 고정] 그리드는 좁은 부모 폭에서 자동 줄바꿈하므로 기존 탭 정렬을 가로 목록으로 바꾼다.
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local tabLayout = Instance.new("UIListLayout")
	tabLayout.FillDirection = Enum.FillDirection.Horizontal
	tabLayout.Wraps = false
	tabLayout.Padding = UDim.new(0, 6)
	tabLayout.SortOrder = Enum.SortOrder.LayoutOrder
	tabLayout.Parent = H.tabStrip
end

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
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local contentLayout = Instance.new("UIListLayout")
	contentLayout.Padding = UDim.new(0, 5)
	contentLayout.SortOrder = Enum.SortOrder.LayoutOrder
	contentLayout.Parent = content
end

-- [오른쪽 아래 고정 실행] 스크롤 내용과 분리해 조작 위치를 모든 시설에서 일정하게 유지한다.
-- 기존 수락·출항·연구·전투의 서버 확인과 저장 흐름은 그대로 호출한다.
H.menuActionDock = Instance.new("Frame")
H.menuActionDock.Name = "MenuActionDock"
H.menuActionDock.BackgroundColor3 = COLORS.paper
H.menuActionDock.BorderSizePixel = 0
H.menuActionDock.ZIndex = 9
H.menuActionDock.Visible = false
H.menuActionDock.Parent = mainInner
corner(H.menuActionDock, 7)
-- [실행 장부] 주요 행동판에는 작은 황동 경계만 사용한다.
bookMaterial(H.menuActionDock, "parchment", 192)
do
  local edge = Instance.new("UIStroke")
  edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
  edge.Color = UI_BRASS_DARK
  edge.Thickness = 1.6
  edge.Parent = H.menuActionDock
end
H.menuActionButton = mkButton(H.menuActionDock, "행동 확인", COLORS.gold, UDim2.new(1, -12, 0, 54), function()
	if H.invokeMenuPrimary then H.invokeMenuPrimary() end
end, true)
H.menuActionButton.Name = "MenuPrimaryAction"
H.menuActionButton.Position = UDim2.fromOffset(6, 6)
H.menuActionButton.ZIndex = 10
H.menuActionButton.TextSize = 20

-- [전체 시설 공통 전시장] 기존 시설별 content 렌더러는 그대로 보존하고, 교역소처럼 목록·원화·정보로 분리한다.
H.facilityGallery = Instance.new("Frame")
H.facilityGallery.Name = "FacilityGallery"
H.facilityGallery.BackgroundColor3 = COLORS.paper
H.facilityGallery.BorderSizePixel = 0
H.facilityGallery.Visible = false
H.facilityGallery.ClipsDescendants = true
H.facilityGallery.Parent = mainInner
corner(H.facilityGallery, 8)
bookMaterial(H.facilityGallery, "parchment", 204)
-- [왼쪽 원화 카드] 카드배틀과 같은 세로 7:10 틀. 기존 가로·정사각형 원화는 Fit으로 보존한다.
H.galleryCard = Instance.new("Frame")
H.galleryCard.Name = "FacilityArtCard7x10"
H.galleryCard.BackgroundColor3 = Color3.fromRGB(239, 224, 194)
H.galleryCard.BorderSizePixel = 0
H.galleryCard.ClipsDescendants = true
H.galleryCard.ZIndex = 4
H.galleryCard.Parent = H.facilityGallery
corner(H.galleryCard, 5)
do -- [로컬 레지스터 200 한도] 최상위 local 을 늘리지 않게 블록 안에 둔다.
	local galleryBorder = Instance.new("UIStroke")
	galleryBorder.Color = Color3.fromRGB(213, 164, 81)
	galleryBorder.Thickness = 1.5
	galleryBorder.Parent = H.galleryCard
end
H.galleryImage = Instance.new("ImageButton")
H.galleryImage.Name = "ApprovedFacilityArt"
H.galleryImage.BackgroundTransparency = 1
H.galleryImage.Size = UDim2.fromScale(1, 1)
H.galleryImage.ScaleType = Enum.ScaleType.Fit
H.galleryImage.AutoButtonColor = false
H.galleryImage.ZIndex = 5
H.galleryImage.Parent = H.galleryCard
do -- [반응형 배너 배경] 같은 원화를 흐리게 깔아 화면 폭 전체를 채운다. 본 원화(카드)는 자르지 않는다.
	local back = Instance.new("ImageLabel")
	back.Name = "FacilityArtBackdrop"
	back.BackgroundColor3 = Color3.fromRGB(30, 21, 13)
	back.BorderSizePixel = 0
	back.Size = UDim2.fromScale(1, 1)
	back.ScaleType = Enum.ScaleType.Crop
	back.ImageTransparency = 0.35
	back.ZIndex = 2
	back.Parent = H.facilityGallery
	H.galleryBackdrop = back
	local shade = Instance.new("Frame")
	shade.Name = "FacilityArtShade"
	shade.BackgroundColor3 = Color3.fromRGB(20, 13, 8)
	shade.BorderSizePixel = 0
	shade.Size = UDim2.fromScale(1, 1)
	shade.ZIndex = 3
	shade.Parent = H.facilityGallery
	local g = Instance.new("UIGradient")
	g.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.55), NumberSequenceKeypoint.new(0.45, 0.25), NumberSequenceKeypoint.new(1, 0.5) })
	g.Parent = shade
	H.galleryShadeGradient = g
end
H.galleryImage.Activated:Connect(function()
  if not view or not H.galleryImage.Image or H.galleryImage.Image == "" then return end
  -- [정확한 목적지] 연결된 발견 카드가 없으면 주제 검색으로 열고 무관한 백과 책갈피를 열지 않는다.
  H.galleryBookOpenRequested = H.galleryLinkCardId
    or ("search:" .. (H.gallerySearchTerm or ((H.FACILITY_GALLERY_TOPICS[currentTab] or { "대항해" })[1])))
  openTab("codex")
end)
H.galleryTitle = mkLabel(H.facilityGallery, "", 21, INK, true)
H.galleryTitle.Name = "FacilityGalleryHeading"
H.galleryTitle.Position = UDim2.new(0, 12, 1, -40)
H.galleryTitle.Size = UDim2.new(1, -24, 0, 30)
H.galleryTitle.AutomaticSize = Enum.AutomaticSize.None
H.galleryTitle.ZIndex = 6
H.galleryTitle.TextColor3 = Color3.fromRGB(255, 240, 205)
H.galleryTitle.TextStrokeColor3 = Color3.fromRGB(25, 16, 9)
H.galleryTitle.TextStrokeTransparency = 0.35
-- [공통 원화 안내] 승인된 그림 아래에 시설 이용 순서를 잉크로 함께 적는다.
H.galleryCaption = mkLabel(H.facilityGallery, "", 16, INK_SOFT, false)
H.galleryCaption.Name = "FacilityGalleryCaption"
H.galleryCaption.AutomaticSize = Enum.AutomaticSize.None
H.galleryCaption.Size = UDim2.new(1, -24, 0, 28)
H.galleryCaption.TextWrapped = true
H.galleryCaption.TextTruncate = Enum.TextTruncate.AtEnd
H.galleryCaption.TextSize = 14
H.galleryCaption.ZIndex = 6
H.galleryCaption.TextColor3 = Color3.fromRGB(236, 214, 170)
H.galleryCaption.TextStrokeColor3 = Color3.fromRGB(25, 16, 9)
H.galleryCaption.TextStrokeTransparency = 0.5
-- [원화 넘김] 기존 발견·승인 원화만 순환한다. 원화 가운데 터치는 계속 백과 이동이다.
for _, direction in { -1, 1 } do
  local button = Instance.new("TextButton")
  button.Name = if direction < 0 then "PreviousFacilityArt" else "NextFacilityArt"
  button.Size = UDim2.fromOffset(44, 44)
  button.Text = if direction < 0 then "◀" else "▶"
  button.TextSize = 24
  button.Font = Enum.Font.GothamBold
  button.TextColor3 = Color3.fromRGB(255, 236, 169)
  button.TextStrokeColor3 = Color3.fromRGB(41, 29, 18)
  button.TextStrokeTransparency = 0.1
  button.BackgroundTransparency = 1
  button.BorderSizePixel = 0
  button.AutoButtonColor = false
  button.Visible = false
  button.ZIndex = 7
  button.Parent = H.facilityGallery
  button.Activated:Connect(function()
    local total = #(H.galleryMatches or {})
    if total <= 1 then return end
    H.galleryIndex = ((H.galleryIndex or 1) - 1 + direction) % total + 1
    H.galleryTouchedAt = os.clock() -- 직접 넘기면 잠시 자동 넘김을 멈춘다
    H.renderFacilityGallery()
  end)
  if direction < 0 then H.galleryPrev = button else H.galleryNext = button end
end
-- [기존 승인 원화] 외부 유료 자료나 임의 메시 대신 백과·사건 카드 그림을 직접 재사용한다.
H.FACILITY_GALLERY_ART = {
  board = "event_royal_charter", quest = "event_cook_voyage", recruit = "event_merchant_lamu",
  crew = "event_merchant_coromandel", status = "event_title_ship",
  route = "event_new_route", harbor = "event_canton_system", map = "event_chart_world",
  trade = "event_trade_boom", yard = "event_title_ship",
  battle = "event_piracy", explore = "event_angkor", war = "event_anglo_dutch_war", gwent = "event_royal_charter",
  scholar = "event_principia", codex = "bot_herbarium", tech = "event_industrial_start",
  diplomacy = "event_title_parchment", -- 외교: 조약 문서(배 그림 기본값이면 조선소로 착각)
}
-- [자동 순환 원화] 메뉴마다 의미가 맞는 기존 승인 사건 원화 묶음. 발견 카드 뒤에 섞어 자동으로 넘긴다.
H.FACILITY_GALLERY_POOL = {
  trade = { "trade_boom", "merchant_coromandel", "merchant_hoi_an", "merchant_lamu", "merchant_naha", "canton_system", "zanzibar" },
  market = { "trade_boom", "merchant_hoi_an", "merchant_naha", "canton_system", "festival" },
  harbor = { "canton_system", "cape_colony", "zanzibar", "merchant_naha", "festival" },
  route = { "new_route", "cook_voyage", "calm_seas", "title_sea", "canal_opened" },
  diplomacy = { "title_parchment", "royal_charter", "boston_tea", "anglo_dutch_war" },
  yard = { "title_ship", "shipworm", "treasure_wreck" },
  board = { "royal_charter", "festival", "merchant_lamu" },
  quest = { "cook_voyage", "new_route", "treasure_wreck", "angkor", "machu_picchu" },
  recruit = { "merchant_lamu", "merchant_hoi_an", "merchant_coromandel" },
  crew = { "merchant_coromandel", "title_ship" }, status = { "title_ship", "title_sea" },
  battle = { "piracy", "anglo_dutch_war", "storm" }, war = { "anglo_dutch_war", "piracy" },
  gwent = { "royal_charter", "piracy" },
  explore = { "angkor", "petra", "machu_picchu", "giza", "moai", "chichen", "ellora_kailasa", "great_wall", "stonehenge", "uluru", "zimbabwe" },
  scholar = { "principia", "franklin_kite", "industrial_start", "new_plant" },
  codex = { "principia", "new_plant" }, encyclopedia = { "principia", "new_plant" },
  tech = { "industrial_start", "franklin_kite", "canal_opened" },
}
-- [실제 지식 연결] 메뉴 의미에 맞는 발견 원화를 우선 사용한다. 미발견 카드·미등록 자산은 노출하지 않는다.
H.FACILITY_GALLERY_TOPICS = {
  trade = { "교역", "상업", "무역" }, market = { "교역", "시장", "무역" },
  harbor = { "항구", "상업", "항만" }, route = { "항로", "항해", "해류" }, map = { "지도", "해도", "지리" },
  diplomacy = { "외교", "조약", "국가" }, yard = { "선박", "조선", "범선" },
  board = { "주점", "상인", "길드" }, quest = { "탐험", "항해", "모험" }, recruit = { "선원", "인물", "상인" },
  battle = { "해전", "해적", "전쟁" }, war = { "함대", "해전", "전쟁" }, gwent = { "갈레온", "해전", "전투" },
  explore = { "탐험", "유적", "지리" }, codex = { "학문", "지식", "기록" },
  encyclopedia = { "학문", "지식", "기록" }, scholar = { "학문", "연구", "과학" },
  tech = { "과학", "기술", "발명" }, status = { "항해", "선원", "인물" }, crew = { "선원", "항해", "인물" },
}
function H.renderFacilityGallery()
  local tab = currentTab
  if H.gallerySelectedTab ~= tab then
    H.gallerySelectedTab = tab
    H.galleryIndex = nil -- [랜덤 시작] 메뉴를 열 때마다 다른 원화부터 보여 준다
    H.gallerySelection = nil -- [시설 변경] 이전 국가·항구·항로 선택을 해제한다.
  end
  local focus = H.MENU_FOCUS[tab]
  local artName = H.FACILITY_GALLERY_ART[tab] or "event_calm_seas"
  local fallback = AssetIds["CardArt/" .. artName] or AssetIds["CardArt/event_calm_seas"]
  -- [지도 선택 연동] 플레이어가 고른 해역의 기존 승인 지도를 왼쪽 원화에도 그대로 보여 준다.
  local chartName = nil
  if tab == "map" and H.selectedChart then
    local chart = AssetIds["CardArt/event_chart_" .. H.selectedChart]
    if chart then
      fallback = chart
      for _, entry in H.CHART_REGIONS or {} do
        if entry[1] == H.selectedChart then chartName = entry[2]; break end
      end
    end
  end
  -- [현행 지식] 이미 발견한 카드만 사용하고 주제별 중복 카드를 제거한다.
  local matches, seen = {}, {}
  for _, token in H.FACILITY_GALLERY_TOPICS[tab] or {} do
    for _, card in ((view and view.codex and view.codex.cards) or {}) do
      if card.found == true and type(card.image) == "string" and card.image ~= "" and not seen[card.id] then
        local about = string.lower(tostring(card.name or "") .. " " .. tostring(card.topic or "")
          .. " " .. tostring(card.worldGroup or "") .. " " .. tostring(card.kindName or ""))
        if string.find(about, string.lower(token), 1, true) then
          table.insert(matches, card)
          seen[card.id] = true
        end
      end
    end
  end
  for _, key in H.FACILITY_GALLERY_POOL[tab] or {} do
    local id = AssetIds["CardArt/event_" .. key]
    if id then table.insert(matches, { image = "rbxassetid://" .. tostring(id), poolArt = true }) end
  end
  -- [드롭박스 자동 배치] CardArt/menu_<메뉴>_<번호> 로 등록된 원화는 그 메뉴 배너에 자동으로 섞인다.
  H.menuArtCache = H.menuArtCache or {}
  if H.menuArtCache[tab] == nil then
    local list, prefix = {}, "CardArt/menu_" .. tostring(tab) .. "_"
    for key, id in AssetIds :: any do
      if type(key) == "string" and string.sub(key, 1, #prefix) == prefix then table.insert(list, { key, id }) end
    end
    table.sort(list, function(x, y) return x[1] < y[1] end)
    H.menuArtCache[tab] = list
  end
  for _, kv in H.menuArtCache[tab] do
    table.insert(matches, { image = "rbxassetid://" .. tostring(kv[2]), poolArt = true })
  end
  H.galleryMatches = matches
  if H.galleryIndex == nil and #matches > 0 then H.galleryIndex = math.random(1, #matches) end
  H.galleryIndex = if #matches > 0 then math.clamp(H.galleryIndex or 1, 1, #matches) else 1
  local matched = if #matches > 0 then matches[H.galleryIndex] else nil
  -- [선택 원화] 클릭한 국가·항구·항로의 발견 카드/승인 해역도만 우선 전시한다.
  local selection = H.gallerySelection
  if selection and selection.tab == tab then
    matched = nil
    for _, card in ((view and view.codex and view.codex.cards) or {}) do
      if card.found == true and type(card.image) == "string" and card.image ~= ""
        and (card.name == selection.name
          or string.find(string.lower(tostring(card.name or "")), string.lower(selection.name), 1, true)) then
        matched = card
        break
      end
    end
    if selection.chart then
      fallback = AssetIds["CardArt/event_chart_" .. selection.chart] or fallback
    elseif selection.art then
      -- [등록 원화] 해당 국가와 실제 관련 있는 승인 사건 카드만 선택한다.
      fallback = AssetIds["CardArt/" .. selection.art] or fallback
    end
  else
    selection = nil
  end
  if (tab == "codex" or tab == "encyclopedia") and H.galleryReadingCard then
    matched = H.galleryReadingCard
  end
  if chartName and not selection then matched = nil end
  local image = if matched then matched.image elseif fallback then "rbxassetid://" .. tostring(fallback) else ""
  local realCard = matched ~= nil and not matched.poolArt
  H.galleryLinkCardId = if realCard then matched.id else nil
  H.gallerySearchTerm = if selection then selection.search or selection.name else chartName
  local canPage = #matches > 1 and not chartName and not selection
    and not ((tab == "codex" or tab == "encyclopedia") and H.galleryReadingCard)
  H.galleryPrev.Visible = canPage
  H.galleryNext.Visible = canPage
  H.galleryCanPage = canPage
  -- [공통 가로 원화] 선명한 배경과 투명한 전체 터치 영역을 분리한다.
  -- 원본 7:10 카드는 백과에서 자르지 않고 볼 수 있다.
  H.galleryCard.Visible = true
  H.galleryImage.ImageTransparency = 1
  if H.galleryImage.Image ~= image then
    H.galleryBackdrop.ImageTransparency = 0
    if H.galleryArtTween then H.galleryArtTween:Cancel(); H.galleryArtTween = nil end
    H.galleryImage.Image = image
    H.galleryBackdrop.Image = image
    if image ~= "" and not game:GetService("GuiService").ReducedMotionEnabled then
      H.galleryBackdrop.ImageTransparency = 1
      H.galleryArtTween = game:GetService("TweenService"):Create(H.galleryBackdrop,
        TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { ImageTransparency = 0 })
      H.galleryArtTween:Play()
    end
  end
  H.galleryTitle.Text = if selection then selection.name elseif chartName then chartName elseif realCard then matched.name
    elseif focus then focus[1] else TAB_NAME[tab] or "시설 안내"
  H.galleryCaption.Text = if canPage then string.format("%d/%d · 자동 넘김 · 원화 터치 → 백과", H.galleryIndex, #matches)
    elseif realCard then "원화 터치 · 해당 백과 항목"
    elseif selection or chartName then "원화 터치 · 관련 지식 검색" else "원화 터치 · 세계 백과 검색"
  H.galleryCaption.Visible = image ~= ""
end

-- [자동 넘김] 메뉴 원화 배너는 8초마다 다음 그림으로 부드럽게 바뀐다. 직접 넘기면 15초 쉰다.
task.spawn(function()
  while true do
    task.wait(8)
    if H.galleryCanPage and H.facilityGallery.Visible and main.Visible
      and os.clock() - (H.galleryTouchedAt or 0) > 15
      and not game:GetService("GuiService").ReducedMotionEnabled then
      local total = #(H.galleryMatches or {})
      if total > 1 then
        H.galleryIndex = (H.galleryIndex or 1) % total + 1
        pcall(H.renderFacilityGallery)
      end
    end
  end
end)

-- [교역소 기준] 가로는 3열, 세로는 큰 원화를 메뉴와 조작 사이에 놓는다.
H.bookSpine = pageRule(mainInner, UDim2.fromOffset(132, 68), UDim2.new(0, 1, 1, -76))
function H.layoutBook()
  local width, height = mainInner.AbsoluteSize.X, mainInner.AbsoluteSize.Y
  -- [공통 현황] 제목과 자금·화물칸이 작은 폰에서도 서로 겹치지 않게 한다.
  -- [상단 중앙] 모든 시설에서 자금·화물을 가로 중앙에 표시. 작은 폰은 두 번째 줄을 쓴다.
  -- [모든 시설] 공통 자금 표시와 직전 메뉴를 붙이고 두 영역을 동일한 기준선으로 정렬한다.
  local recent = view ~= nil and not newGameMode and H.recentTab ~= nil
    and TAB_NAME[H.recentTab] ~= nil and groupOf(H.recentTab) ~= groupOf(currentTab)
  local recentWidth = if width < 480 then 90 elseif width < 740 then 116 else 142
  local statusWidth = if width < 480 then math.max(140, math.min(252, width - 142))
    elseif width < 740 then math.min(290, width - 156)
    else math.clamp(math.floor(width * 0.36), 280, 380)
  local topY = if width < 740 then 64 else 15
  local rowH = if width < 740 then 44 else 34
  if width < 740 then
    -- [폰] 두 칸 전체를 가운데 정렬하며 폭이 작을수록 자금 표시만 줄인다.
    local reserve = if recent then recentWidth + 8 else 0
    statusWidth = math.min(statusWidth, math.max(110, width - reserve - 24))
    local groupWidth = statusWidth + recentWidth + 8
    local startX = math.max(8, math.floor((width - (if recent then groupWidth else statusWidth)) / 2))
    H.menuStatusLabel.AnchorPoint = Vector2.zero
    H.menuStatusLabel.Position = UDim2.fromOffset(startX, topY)
    H.menuRecentButton.Position = UDim2.fromOffset(startX + statusWidth + 8, topY)
  else
    -- [넓은 화면] 중앙 자금 표시의 위치를 유지한 채 바로 오른쪽에 최근 메뉴를 둔다.
    H.menuStatusLabel.AnchorPoint = Vector2.new(0.5, 0)
    H.menuStatusLabel.Position = UDim2.new(0.5, 0, 0, topY)
    H.menuRecentButton.Position = UDim2.fromOffset(math.floor(width * 0.5 + statusWidth * 0.5 + 8), topY)
  end
  H.menuStatusLabel.Size = UDim2.fromOffset(statusWidth, rowH)
  H.menuStatusLabel.TextSize = if width < 480 then 14 elseif width < 740 then 16 else 18
  H.menuRecentButton.Size = UDim2.fromOffset(recentWidth, rowH)
  H.menuRecentButton.TextSize = if width < 480 then 14 else 16
  H.menuRecentButton.Visible = recent
  H.menuRecentButton.Text = if recent then "← " .. groupOf(H.recentTab).name else ""
  headerLabel.Size = UDim2.fromOffset(if width < 740 then math.max(86, width - 152)
    else math.max(108, math.floor((width - statusWidth) * 0.5) - 82), 29)
  H.pageDetails.Size = UDim2.fromOffset(if width < 740 then math.max(86, width - 152)
    else math.max(100, math.floor((width - statusWidth) * 0.5) - 82), 18)
  local tabCount = #groupOf(currentTab).tabs
  -- [시설 탭 본문] 교역·조선의 기존 상세 화면은 같은 책 안에서 재사용한다.
  local facilityDetail = currentTab == "trade" or currentTab == "yard"
  -- [방문 메뉴 중복 제거] 교역·조선 상세장부에 동일한 자금/최근 메뉴가 있어
  -- 공통 헤더 표시만 숨긴다. 거래·정비·최근 이동 동작은 기존 상세장부를 사용한다.
  H.menuStatusLabel.Visible = not facilityDetail and currentTab ~= "encyclopedia"
  H.menuRecentButton.Visible = recent and not facilityDetail and currentTab ~= "encyclopedia"
  -- [깔끔한 도감] 도감 탭은 화면 자체가 원화 중심이라 위/옆 원화 배너를 겹쳐 띄우지 않는다.
  local dexTab = (currentTab == "codex" or currentTab == "encyclopedia") and H.dexClean ~= false
  local gallery = H.galleryImage.Image ~= "" and not facilityDetail and view ~= nil and not newGameMode and not dexTab
  local wide = width >= 740
  -- [중복 탭 제거] 단일 기능 시설(조선소)은 같은 이름의 탭을 다시 보여주지 않는다.
  local tabs = tabCount > 1 and tabBar.Visible
  -- [상단 오른쪽 가로 탭] 데스크톱은 한 줄 전체 표시, 작은 폰은 한 줄 가로 스크롤.
  local compactTabs = not wide and (height <= 0 or height >= 430)
  -- [가로폰] 낮은 화면에서는 아이콘을 글자 옆에 두고 본문 높이를 확보한다.
  local sectionTop = if not wide and not facilityDetail then 112 else 68
  -- [낮은 가로 화면] 가로폰·작은 창은 탭을 머리줄(제목·자금 오른쪽, X 왼쪽)로 올려 본문 높이를 확보한다.
  local headerTabs, headerTabW = false, 0
  if wide and tabs and height > 0 and height < 600 then
    -- 자금 표시는 머리줄 탭 모드에서 220px로 줄여 탭 4개(서재)도 한 줄에 들어가게 한다.
    local leftReserve = 236 + (if H.menuStatusLabel.Visible then math.min(statusWidth, 220) + 8 else 0)
    headerTabW = math.floor((width - leftReserve - 64 - math.max(0, tabCount - 1) * 6) / math.max(1, tabCount))
    headerTabs = headerTabW >= 104
  end
  H.headerTabs = headerTabs
  if headerTabs then
    sectionTop = 8
    H.menuRecentButton.Visible = false
    H.menuStatusLabel.AnchorPoint = Vector2.zero
    H.menuStatusLabel.Position = UDim2.fromOffset(236, topY)
    H.menuStatusLabel.Size = UDim2.fromOffset(math.min(statusWidth, 220), rowH)
    H.menuStatusLabel.TextSize = 15
    headerLabel.Size = UDim2.fromOffset(150, 29)
    H.pageDetails.Size = UDim2.fromOffset(150, 18)
  end
  local tabHeight = if compactTabs then 58 else 48
  local tabGap = if width < 340 then 4 else 6
  local tabList = H.tabStrip:FindFirstChildOfClass("UIListLayout")
  if tabList then tabList.Padding = UDim.new(0, tabGap) end
  local availableTabs = math.floor((width - 16 - math.max(0, tabCount - 1) * tabGap) / math.max(1, tabCount))
  -- [가변 폭] 넓은 화면은 6개 탭도 한눈에, 좁은 화면은 글자와 터치 폭을 유지하며 스크롤한다.
  local tabWidth = math.clamp(availableTabs, if compactTabs then 86 else 104, if compactTabs then 154 else 176)
  if headerTabs then tabWidth = math.min(176, headerTabW) end
  local allTabsWidth = tabCount * tabWidth + math.max(0, tabCount - 1) * tabGap
  local visibleTabsWidth = math.min(math.max(1, width - 16), allTabsWidth)
  tabBar.Position = UDim2.new(1, -8, 0, sectionTop)
  if headerTabs then tabBar.Position = UDim2.new(1, -60, 0, sectionTop) end
  tabBar.Size = UDim2.fromOffset(visibleTabsWidth, tabHeight + 3)
  -- [폰 너비 변경] 기존 버튼을 재생성하지 않고 현재 폭만 갱신한다.
  H.tabWidth = tabWidth
  for _, button in H.tabStrip:GetChildren() do
    if button:IsA("TextButton") then
      button.Size = UDim2.fromOffset(tabWidth, tabHeight)
      local icon = button:FindFirstChild("TabIcon")
      local caption = button:FindFirstChild("PrintedCaption")
      if icon then
        icon.Size = UDim2.fromOffset(32, 32)
        icon.Position = if compactTabs then UDim2.new(0.5, -16, 0, 3) else UDim2.new(0, 7, 0.5, -16)
      end
      if icon and caption then
        caption.Position = if compactTabs then UDim2.fromOffset(4, 36) else UDim2.fromOffset(45, 0)
        caption.Size = if compactTabs then UDim2.new(1, -8, 0, 18) else UDim2.new(1, -51, 1, -4)
        caption.TextXAlignment = if compactTabs then Enum.TextXAlignment.Center else Enum.TextXAlignment.Left
        local limit = caption:FindFirstChildOfClass("UITextSizeConstraint")
        if limit then
          limit.MinTextSize = 13
          limit.MaxTextSize = if compactTabs then 14 else 17
        end
      end
    end
  end
  H.tabStrip.CanvasSize = UDim2.fromOffset(allTabsWidth, 0)
  H.tabStrip.ScrollingEnabled = allTabsWidth > visibleTabsWidth
  H.tabStrip.ScrollBarThickness = if H.tabStrip.ScrollingEnabled then 2 else 0
  local selectedIndex = table.find(groupOf(currentTab).tabs, currentTab) or 1
  local selectedLeft = (selectedIndex - 1) * (tabWidth + tabGap)
  -- [탭 위치] 같은 화면의 데이터가 갱신될 때는 사용자가 밀어 놓은 위치를 유지한다.
  local tabViewport = Vector2.new(tabWidth, visibleTabsWidth)
  if H.lastTabLayoutId ~= currentTab or H.lastTabViewport ~= tabViewport then
    H.lastTabLayoutId, H.lastTabViewport = currentTab, tabViewport
    -- 이미 보이는 탭은 제자리에 두고, 화면 밖 탭만 가까운 가장자리까지 이동한다.
    local currentX = H.tabStrip.CanvasPosition.X
    local selectedRight = selectedLeft + tabWidth
    local desiredScroll = if visibleTabsWidth < tabWidth or selectedLeft < currentX then selectedLeft
      elseif selectedRight > currentX + visibleTabsWidth then selectedRight - visibleTabsWidth else currentX
    H.tabStrip.CanvasPosition = Vector2.new(math.clamp(desiredScroll, 0, math.max(0, allTabsWidth - visibleTabsWidth)), 0)
  end
  local bodyTop = if headerTabs then 68 else sectionTop + (if tabs then tabHeight + 8 else 0)
  H.bookSpine.Visible = false
  H.facilityGallery.Visible = gallery
  local primaryVisible = view ~= nil and not newGameMode and H.MENU_FOCUS[currentTab] ~= nil and not facilityDetail and not dexTab and currentTab ~= "board" and currentTab ~= "battle"
    and currentTab ~= "war" and currentTab ~= "route" and currentTab ~= "status"
    and currentTab ~= "scholar" and currentTab ~= "crew" and currentTab ~= "gwent"
  H.menuActionButton.Visible = primaryVisible
  H.menuActionDock.Visible = primaryVisible
  if facilityDetail then
    -- [교역·조선] 왼쪽 탭 자리까지 기존 장부·선박 본문의 가용 폭으로 돌린다.
    content.Position = UDim2.fromOffset(8, bodyTop)
    content.Size = UDim2.new(1, -16, 1, -bodyTop - 8)
    content.Visible = false
    H.menuActionDock.Visible = false
    local detail = mainInner:FindFirstChild("FacilityDetail")
    if detail then
      detail.Position = content.Position
      detail.Size = content.Size
    end
    return
  end
  content.Visible = true
  -- [공통 주요 행동] 원화 여부나 화면 방향과 무관하게 기존 버튼을 아래에 고정한다.
  H.menuActionButton.Parent = H.menuActionDock
  H.menuActionButton.Position = UDim2.fromOffset(6, 6)
  H.menuActionButton.Size = UDim2.new(1, -12, 0, 48)
  H.menuActionButton.TextSize = 18
  if H.menuFocusBanner and H.menuFocusBanner.Parent and currentTab ~= "codex" then
    local heading = H.menuFocusBanner:FindFirstChild("MenuFocusHeading")
    if heading then heading.TextSize = if wide then 18 else 16 end
    local explanation = H.menuFocusBanner:FindFirstChild("MenuFocusDescription")
    local bannerH = 82
    if explanation then
      explanation.Visible = explanation.Text ~= ""
      if explanation.Visible then
        explanation.TextSize = if wide then 15 else 14
        local measured = game:GetService("TextService"):GetTextSize(
          explanation.Text, explanation.TextSize, explanation.Font, Vector2.new(math.max(1, width - 52), 10000))
        explanation.Position = UDim2.fromOffset(14, 82)
        explanation.Size = UDim2.new(1, -28, 0, measured.Y + 4)
        bannerH = 94 + measured.Y
      end
    end
    H.menuFocusBanner.Size = UDim2.new(1, -6, 0, bannerH)
  end
  -- [모바일 본문 우선] 낮은 가로 창에는 장식용 포스터를 만들지 않는다.
  local dockH = if H.menuActionDock.Visible then 68 else 8
  local bodyH = height - bodyTop - dockH
  local showArt = gallery and bodyH >= (if wide then 340 else 360)
  H.facilityGallery.Visible = showArt
  H.galleryCard.Visible = true
  H.galleryCard.BackgroundTransparency = 1
  H.galleryImage.ImageTransparency = 1
  local st = H.galleryCard:FindFirstChildOfClass("UIStroke")
  if st then st.Enabled = false end
  if not H.galleryArtTween or H.galleryArtTween.PlaybackState ~= Enum.PlaybackState.Playing then
    H.galleryBackdrop.ImageTransparency = 0
  end
  if H.galleryShadeGradient then
    H.galleryShadeGradient.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.08), NumberSequenceKeypoint.new(0.5, 0.55), NumberSequenceKeypoint.new(1, 1) })
  end
  local artH = if showArt then math.clamp(math.floor(bodyH * 0.23), 92, if wide then 150 else 120) else 0
  H.facilityGallery.Position = UDim2.fromOffset(8, bodyTop)
  H.facilityGallery.Size = UDim2.new(1, -16, 0, artH)
  -- 원화 전체가 터치 영역(보이지 않는 카드), 글자는 왼쪽 어두운 쪽에
  H.galleryCard.Position = UDim2.fromOffset(0, 0)
  H.galleryCard.Size = UDim2.fromScale(1, 1)
  local textX = if wide then 22 else 14
  H.galleryTitle.TextWrapped = false
  H.galleryTitle.TextTruncate = Enum.TextTruncate.AtEnd
  H.galleryTitle.TextXAlignment = Enum.TextXAlignment.Left
  H.galleryTitle.TextSize = if wide then 26 else 21
  H.galleryTitle.Position = UDim2.new(0, textX, 1, if wide then -66 else -56)
  H.galleryTitle.Size = UDim2.new(1, -textX - 112, 0, 32)
  H.galleryCaption.TextWrapped = false
  H.galleryCaption.TextXAlignment = Enum.TextXAlignment.Left
  H.galleryCaption.Position = UDim2.new(0, textX, 1, -30)
  H.galleryCaption.Size = UDim2.new(1, -textX - 112, 0, 22)
  H.galleryPrev.Position = UDim2.new(1, -96, 1, -48)
  H.galleryNext.Position = UDim2.new(1, -50, 1, -48)
  local contentY = bodyTop + (if showArt then artH + 8 else 0)
  content.Position = UDim2.fromOffset(8, contentY)
  content.Size = UDim2.new(1, -16, 1, -contentY - dockH)
  H.menuActionDock.Position = UDim2.new(0, 8, 1, -64)
  H.menuActionDock.Size = UDim2.new(1, -16, 0, 60)
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
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local hullStroke = Instance.new("UIStroke")
	hullStroke.Color = Color3.fromRGB(214, 170, 82)
	hullStroke.Thickness = 1.5
	hullStroke.Parent = hullBack
end
hullFill = Instance.new("Frame")
hullFill.BackgroundColor3 = Color3.fromRGB(214, 40, 36)
hullFill.Size = UDim2.fromScale(1, 1)
hullFill.BorderSizePixel = 0
hullFill.Parent = hullBack
corner(hullFill, 4)
-- 질감: 위는 밝고 아래는 짙은 붉은 그라데이션 + 윗면 하이라이트 + 세로 줄무늬
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local hullGrad = Instance.new("UIGradient")
	hullGrad.Color = ColorSequence.new(Color3.fromRGB(255, 120, 96), Color3.fromRGB(150, 16, 20))
	hullGrad.Rotation = 90
	hullGrad.Parent = hullFill
end
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local hullShine = Instance.new("Frame")
	hullShine.BackgroundColor3 = Color3.new(1, 1, 1)
	hullShine.BackgroundTransparency = 0.72
	hullShine.Size = UDim2.new(1, -4, 0.32, 0)
	hullShine.Position = UDim2.fromOffset(2, 1)
	hullShine.BorderSizePixel = 0
	hullShine.Parent = hullFill
	corner(hullShine, 3)
end
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
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
banner.Size = UDim2.fromOffset(420, 54)
banner.BackgroundColor3 = Color3.fromRGB(90, 62, 28)
banner.Name = "FirstVoyageObjective"
H.goalBanner = banner
banner.Parent = hud
banner.Visible = false -- [항해 목표] 첫 안내가 있을 때만 보여 주는 중앙 목표 리본
corner(banner, 8)
hudStroke(banner, 2)
hudBanner = hudText(banner, UDim2.new(), UDim2.fromScale(1, 1), 20, Color3.fromRGB(255, 240, 200), Enum.TextXAlignment.Center)
hudBanner.TextSize = 17
hudBanner.TextWrapped = true
hudBanner.Font = Enum.Font.GothamBold
end

-- [코인 카드] 카드 생성 직후 임시 변수 해제.
do
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
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
end

-- [항해 도구] 선 조각 임시 아이콘 대신 기존 등록된 원화와 황동 테두리를 쓴다.
-- 시스템 4개는 시설 6개와 색으로 구분한다(같은 원화를 쓰는 곳은 색을 바꿔 중복처럼 안 보이게).
-- [항해 도구] 아이콘 데이터는 바로 아래 H.hudShortcut 메서드에만 유지한다.
local hudTop, hudTopGui -- 아이콘 애니메이션을 HUD 표시 상태와 연동한다.
do
local hudTweenService = game:GetService("TweenService")
-- [청동 컨셉 통일] 모든 HUD·도크 아이콘을 같은 청동 색으로 칠한다(아이콘마다 다른 색 금지).
local HUD_BRONZE = Color3.fromRGB(214, 152, 92)
local HUD_MENU_TINT = {}
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
	button.Size = UDim2.fromOffset(if dockItem then 58 else 44, if dockItem then 76 else 44)
	button.BackgroundColor3 = COLORS.leather
	button.BackgroundTransparency = 1
	button.BorderSizePixel = 0
	button.Text = ""
	button.AutoButtonColor = false
	-- [원형 테두리] 기존 사각 버튼 테두리 대신 아이콘 아래 동그란 음영만 둔다.
	local disc = Instance.new("Frame")
	disc.Name = "CircularSelection"
	disc.AnchorPoint = Vector2.new(0.5, 0.5)
	disc.Position = UDim2.new(0.5, 0, 0, 24)
	disc.Size = UDim2.fromOffset(50, 50)
	disc.BackgroundColor3 = Color3.fromRGB(225, 171, 83)
	disc.BackgroundTransparency = 1
	disc.BorderSizePixel = 0
	disc.ZIndex = 1
	disc.Parent = button
	local round = Instance.new("UICorner")
	round.CornerRadius = UDim.new(1, 0)
	round.Parent = disc
	local grad = Instance.new("UIGradient")
	grad.Color = ColorSequence.new(Color3.fromRGB(232, 170, 110), Color3.fromRGB(110, 62, 30)) -- 청동
	grad.Rotation = 90
	grad.Parent = disc
	local badgeStroke = Instance.new("UIStroke")
	badgeStroke.Name = "CircleBorder"
	badgeStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	badgeStroke.Color = UI_BRASS_DARK
	badgeStroke.Thickness = 1.5
	badgeStroke.Transparency = 1 -- [투명 아이콘] 기존 검사·선택 상태용 객체는 유지하되 외곽 사각 테두리는 그리지 않는다.
	badgeStroke.Parent = disc
	button:SetAttribute("ActionLabel", label)
	button.Parent = parent
	local specialGlyph = if key == "tavern" then "tavern" elseif key == "deck" then "gwent"
		elseif key == "journal" then "journal" elseif key == "gear" then "gear"
		elseif key == "help" then "help" elseif key == "status" then "captain" else nil
	local artId = if specialGlyph then nil else AssetIds["Menu/" .. (HUD_MENU_ART[key] or key)]
	-- [메뉴 규격] 투명 원화 그대로 사용. 3D 외교 깃발과 기존 시설 아이콘은 같은 크기·기준선.
	local facility = parent.Name == "Dock" and name:sub(1, 5) == "Menu_"
	local artSize = if facility then 46 elseif dockItem then 43 else 31
	local artTop = if dockItem then 3 else 4
	if H.hasIconArt(key) then -- [청동 통일] 승인 청동 원화가 있으면 도형보다 우선
		local icon = modelIcon(button, "FacilityArt", key, nil, artSize, label)
		icon.Name = "MenuArt"
		icon.AnchorPoint = Vector2.new(0.5, 0)
		icon.Position = UDim2.new(0.5, 0, 0, artTop)
		icon.ZIndex = 2
	elseif specialGlyph then
		-- [시설·시스템 통일] 투명 황동 아이콘: 주점 잔/카드/기록장/설정/도움말.
		local symbol = modelIcon(button, "Glyph", specialGlyph, nil, artSize, label)
		symbol.Name = "MenuArt"
		symbol.AnchorPoint = Vector2.new(0.5, 0)
		symbol.Position = UDim2.new(0.5, 0, 0, artTop)
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
			art.ImageColor3 = if i == 1 then Color3.fromRGB(52, 35, 18) else (HUD_MENU_TINT[key] or HUD_BRONZE)
			art.ImageTransparency = if i == 1 then 0.76 else 0
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
		caption.Position = UDim2.fromOffset(0, 53)
		caption.Size = UDim2.new(1, 0, 0, 19)
		caption.Font = Enum.Font.GothamBold
		caption.TextSize = 14
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
			-- [밝은 투명 원화] 배경 사각형 없이 원본 색을 최대한 유지한다.
			art.ImageColor3 = if selected then Color3.fromRGB(255, 253, 237) elseif art:GetAttribute("FacilityArtKey") then Color3.new(1, 1, 1) else (HUD_MENU_TINT[key] or HUD_BRONZE)
		elseif art and art:IsA("Frame") and art:GetAttribute("MenuGlyph") then
			-- [선택 색 동기화] 원화뿐 아니라 황동 도형도 같은 선택 강조를 받는다.
			local highlight = if selected then Color3.fromRGB(255, 243, 190) else Color3.fromRGB(255, 222, 155)
			for _, part in art:GetDescendants() do
				if part.Name == "GlyphShape" and part:IsA("Frame") then
					local shine = part:FindFirstChildOfClass("UIGradient")
					if shine then
						shine.Color = if selected then ColorSequence.new(Color3.fromRGB(255, 253, 228), Color3.fromRGB(247, 204, 125))
								else ColorSequence.new(Color3.fromRGB(255, 240, 190), Color3.fromRGB(232, 183, 109))
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
		badgeStroke.Color = Color3.fromRGB(255, 233, 170)
		badgeStroke.Transparency = if selected then 0.20 else 0.55
		disc.BackgroundTransparency = if selected then 0.52 else 0.90
		local caption = button:FindFirstChild("MenuName")
		if caption then caption.TextColor3 = if selected then Color3.fromRGB(255, 237, 172) else Color3.fromRGB(255, 244, 214) end
	end
	button:GetAttributeChangedSignal("SelectedFacility"):Connect(paintSelection)
	paintSelection()
	-- [메인 HUD 아이콘] 원화 자체만 심장박동처럼 커졌다 작아진다. 버튼과 글자는 고정한다.
	-- 아이콘당 금빛 광휘 1개와 원화 맥동 1개만 반복하며 프레임 업데이트를 만들지 않는다.
	local iconArt = button:FindFirstChild("MenuArt")
	local iconGlow = Instance.new("ImageLabel")
	iconGlow.Name = "IconBreathGlow"
	iconGlow.AnchorPoint = Vector2.new(0.5, 0.5)
	iconGlow.Position = UDim2.new(0.5, 0, 0, 23)
	iconGlow.Size = UDim2.fromOffset(51, 51)
	iconGlow.BackgroundTransparency = 1
	iconGlow.BorderSizePixel = 0
	iconGlow.Image = "rbxasset://textures/particles/sparkles_main.dds"
	iconGlow.ImageColor3 = Color3.fromRGB(255, 198, 91)
	iconGlow.ImageTransparency = 0.47
	iconGlow.Visible = false -- [알림 때만] 평소에는 숨김. IconAlert 속성이 켜질 때만 광휘·맥동.
	iconGlow.ZIndex = 1
	iconGlow.Active = false
	iconGlow.Parent = button
	local iconScale = nil
	local breathTween = nil
	if iconArt and iconArt:IsA("GuiObject") then
		iconScale = Instance.new("UIScale")
		iconScale.Name = "IconHeartbeat"
		iconScale.Scale = 1
		iconScale.Parent = iconArt
		breathTween = hudTweenService:Create(iconScale,
			TweenInfo.new(1.00 + (name:len() % 4) * 0.12, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
			{ Scale = 1.14 })
	end
	local glowTween = hudTweenService:Create(iconGlow,
		TweenInfo.new(1.22 + (name:len() % 3) * 0.15, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
		{ Size = UDim2.fromOffset(63, 63), ImageTransparency = 0.80, Rotation = 24 })
	local function syncIconMotion()
		local alerting = button:GetAttribute("IconAlert") == true or button:GetAttribute("GuideAlert") == true
		iconGlow.Visible = false -- [효과 정리] 반짝이 광휘 제거. 아이콘 맥동만 남긴다.
		local animate = alerting and not game:GetService("GuiService").ReducedMotionEnabled
			and (not hudTopGui or hudTopGui.Enabled) and button.Visible
		if animate then
			if breathTween then breathTween:Play() end
		else
			if breathTween then breathTween:Pause() end
			glowTween:Pause()
			if iconScale then iconScale.Scale = 1 end
			iconGlow.Size = UDim2.fromOffset(51, 51)
			iconGlow.ImageTransparency = 0.60
			iconGlow.Rotation = 0
		end
	end
	if hudTopGui then hudTopGui:GetPropertyChangedSignal("Enabled"):Connect(syncIconMotion) end
	button:GetPropertyChangedSignal("Visible"):Connect(syncIconMotion)
	button:GetAttributeChangedSignal("IconAlert"):Connect(syncIconMotion)
	button:GetAttributeChangedSignal("GuideAlert"):Connect(syncIconMotion)
	game:GetService("GuiService"):GetPropertyChangedSignal("ReducedMotionEnabled"):Connect(syncIconMotion)
	syncIconMotion()
	local art = button:FindFirstChild("MenuArt")
	if facility and art then
		local restPosition = art.Position
		local pulse = hudTweenService:Create(art, TweenInfo.new(0.16, Enum.EasingStyle.Sine, Enum.EasingDirection.Out, 0, true), {
			Rotation = if key == "tavern" then -9 elseif key == "route" then 8 else 0,
			Position = restPosition - UDim2.fromOffset(0, 2),
			Size = UDim2.fromOffset(50, 50),
		})
		H.dockMotion[name] = pulse
	end
	-- [터치 광휘] 12개 기존 메뉴에 투명 금빛 파동 1회. 연타 시 이전 파동을 재사용 없이 제거해 누적을 막는다.
	if dockItem then
		button.Activated:Connect(function()
			if game:GetService("GuiService").ReducedMotionEnabled then return end
			badgeStroke.Transparency = 0
			hudTweenService:Create(badgeStroke, TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Transparency = if button:GetAttribute("SelectedFacility") then 0.20 else 1,
			}):Play()
			-- [터치 파동] 눌린 아이콘 안에서만 짧게 퍼지므로 화면 전체를 덮지 않는다.
			local previousGlow = button:FindFirstChild("PressGlow")
			if previousGlow then previousGlow:Destroy() end
			local glow = Instance.new("Frame")
			glow.Name = "PressGlow"
			glow.AnchorPoint = Vector2.new(0.5, 0.5)
			glow.Position = UDim2.new(0.5, 0, 0, 23)
			glow.Size = UDim2.fromOffset(24, 24)
			glow.BackgroundColor3 = Color3.fromRGB(255, 213, 112)
			glow.BackgroundTransparency = 0.54
			glow.BorderSizePixel = 0
			glow.Active = false
			glow.ZIndex = 4
			glow.Parent = button
			local curve = Instance.new("UICorner")
			curve.CornerRadius = UDim.new(1, 0)
			curve.Parent = glow
			local rim = Instance.new("UIStroke")
			rim.Color = Color3.fromRGB(255, 243, 166)
			rim.Thickness = 2
			rim.Parent = glow
			hudTweenService:Create(rim, TweenInfo.new(0.48), { Transparency = 1 }):Play()
			local tw = hudTweenService:Create(glow,
				TweenInfo.new(0.48, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{ Size = UDim2.fromOffset(63, 63), BackgroundTransparency = 1 })
			tw.Completed:Connect(function() glow:Destroy() end)
			tw:Play()
			-- [정리] 누를 때 반짝이 파편은 제거(값싼 효과). 눌림 고리와 크기 반응만 남긴다.
		end)
	end
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
hudTopGui = Instance.new("ScreenGui")
hudTopGui.Name = "MareEssentiaHudTop"
hudTopGui.ResetOnSpawn = false
hudTopGui.IgnoreGuiInset = true
hudTopGui.DisplayOrder = gui.DisplayOrder
hudTopGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
hudTopGui.Enabled = hud.Visible
hudTopGui.Parent = player:WaitForChild("PlayerGui")
hudTop = Instance.new("Frame")
hudTop.Name = "HudTop"
hudTop.BackgroundTransparency = 1
hudTop.Size = UDim2.fromScale(1, 1)
hudTop.Parent = hudTopGui
do
-- [지상·해상 전환] 바탕화면 입자는 없애고 기존 걷기/전경 아이콘만 색광을 전환한다.
function H.updateScreenAtmosphere()
	local walk = H.viewFxButton
	if not walk then return end
	local aura = walk:FindFirstChild("IconBreathGlow")
	if aura then
		aura.ImageColor3 = if overview then Color3.fromRGB(108, 214, 255)
			else Color3.fromRGB(255, 190, 90)
	end
	local disc = walk:FindFirstChild("CircularSelection")
	if disc then disc.BackgroundTransparency = 1 end
end
H.updateScreenAtmosphere()
end
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
dock.ScrollBarThickness = 3
dock.ScrollBarImageColor3 = Color3.fromRGB(186, 141, 99)
dock.ScrollingDirection = Enum.ScrollingDirection.Y
dock.Parent = hudTop
-- [메뉴 도크] 주 메뉴 5개와 보조 도구 4개를 두 줄로 구분한다.
local dockGrid = Instance.new("UIGridLayout")
dockGrid.FillDirection = Enum.FillDirection.Horizontal
dockGrid.FillDirectionMaxCells = 5
dockGrid.SortOrder = Enum.SortOrder.LayoutOrder
dockGrid.HorizontalAlignment = Enum.HorizontalAlignment.Center
dockGrid.VerticalAlignment = Enum.VerticalAlignment.Center
dockGrid.CellPadding = UDim2.fromOffset(6, 6)
dockGrid.CellSize = UDim2.fromOffset(58, 76)
dockGrid.Parent = dock
do -- [최상위 local 한도 자동 조절] 이 구간 밖에서 쓰지 않는 변수
	local dockLimit = Instance.new("UISizeConstraint")
	dockLimit.MaxSize = Vector2.new(620, 200)
	dockLimit.Parent = dock
end

-- [시설 목차] 외교 포함 기존 8곳. 별도의 아이콘 아틀라스나 메뉴 구조를 만들지 않는다.
-- [하단 5묶음] 항해·교역·모험·성장·기록. 버튼 id 는 각 묶음의 첫 탭.
H.DOCK = {
	-- 새 청동 시트(ui_menu_icons_3)가 등록되면 묶음 전용 아이콘, 없으면 기존 시설 아이콘을 쓴다.
	{ "route", "항해", if H.reserveIconAtlas[3] then "nav" else "route" },
	{ "trade", "교역", if H.reserveIconAtlas[3] then "tradeg" else "trade" },
	{ "board", "모험", if H.reserveIconAtlas[3] then "adventure" else "battle" },
	{ "status", "성장", if H.reserveIconAtlas[3] then "growth" else "yard" },
	{ "scholar", "기록", if H.reserveIconAtlas[3] then "records" else "codex" },
}
H.dockButtons = {}
H.dockNotices = {}
H.dockMotion = {}
for i, d in H.DOCK do
	local b = H.hudShortcut(dock, "Menu_" .. d[1], d[3], d[2], true)
	b.LayoutOrder = i
	H.dockButtons[d[1]] = b
	local notice = Instance.new("ImageLabel")
	notice.Name = "FacilityNotice"
	notice.AnchorPoint = Vector2.new(0.5, 0.5)
	-- [알림 배지] 반짝이 대신 기존 청동 예비 시트의 '느낌표 깃발' 원화를 아이콘 우상단에 작게 단다.
	notice.Position = UDim2.new(0.5, 17, 0, 5)
	notice.Size = UDim2.fromOffset(20, 20)
	local flagSheet = H.reserveIconAtlas[2]
	notice.Image = if flagSheet then "rbxassetid://" .. tostring(flagSheet) else ""
	notice.ImageRectOffset = Vector2.new(3 * 192, 1 * 189)
	notice.ImageRectSize = Vector2.new(192, 189)
	notice.ScaleType = Enum.ScaleType.Fit
	notice.BackgroundTransparency = 1
	notice.BorderSizePixel = 0
	notice.ImageColor3 = Color3.new(1, 1, 1)
	notice.ZIndex = 7
	notice.Visible = false
	notice.Parent = b
	H.dockNotices[d[1]] = notice
	b.Activated:Connect(function()
		openTab(d[1])
	end)
end

-- [도구 목차] 설정·걷기·저널·내 카드 4개는 시설 8개와 동일한 6×2 도크에 배치한다.
-- 도움말은 기존 설정 > 게임 방법에서 열 수 있으므로 중복 HUD 버튼만 숨긴다.
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
	help.Visible = false -- [12개] 별도 HUD 아이콘만 숨김. 설정 > 게임 방법은 그대로 유지.
	help.Activated:Connect(function() openOptions(true) end)
	local walk = H.hudShortcut(hudTop, "ViewToggle", "view", "걷기", true)
	H.viewFxButton = walk
	H.updateScreenAtmosphere()
	walk.AnchorPoint = Vector2.new(1, 0)
	walk.Position = UDim2.new(1, -176, 0, SYS_Y)
	walk.Activated:Connect(function()
		overview = not overview
		H.updateScreenAtmosphere()
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
		-- [첫 항해 목표] 기존 튜토리얼 단계와 실제 서버 진행 상태를 저널의 한 카드에서 확인한다.
		head("첫 항해 목표")
		do
			local captain, p, ship = view.captain, view.player, view.ship
			local sailed = (p.day or 0) > 0
			if captain and not H.tutorialHidden and (captain.step ~= "done" or not sailed) then
				local steps = {
					{ done = captain.step ~= "name", text = "상인 길드 서기에게 이름 올리기" },
					{ done = captain.step == "portrait" or captain.step == "done", text = "주점 동료 맞이하기" },
					{ done = captain.step == "done", text = "떠돌이 화가에게 초상 받기" },
					{ done = sailed or (ship.cargoUsed or 0) > 0, text = "항구 특산품 구매하기" },
					{ done = sailed, text = "지도에서 다른 항구로 출항하기" },
				}
				local count, lines = 0, {}
				for _, step in steps do
					if step.done then count += 1 end
					table.insert(lines, (if step.done then "✓ " else "○ ") .. step.text)
				end
				goal(string.format("첫걸음 %d/%d", count, #steps), table.concat(lines, "\n"), count / #steps, COLORS.gold)
			elseif view.guide then
				local lines = {}
				for _, step in (view.guide.steps or {}) do
					table.insert(lines, tostring(step.mark or "○") .. " " .. tostring(step.text or ""))
				end
				goal(view.guide.title or "항해 목표", table.concat(lines, "\n"), nil)
			elseif view.actIntro or view.act then
				local mission = view.actIntro or view.act
				goal(mission.title or "항해 목표", tostring(mission.goal or "기록된 목표를 확인해"), nil)
			else
				goal("첫 항해 완료", "진행 중인 의뢰와 새로운 항해 목표는 아래에서 확인해.", nil)
			end
		end
		-- [메뉴 조언 단일화] 비서의 긴급·진행 권고는 저널에서만 보여 준다.
		head("지금 할 일")
		local todo = 0
		do
			local ship = view.ship
			local cue, detail, tab = nil, nil, nil
			if ship.maxHull > 0 and ship.hull < ship.maxHull * 0.4 then
				cue, detail, tab = "선체 수리 필요", string.format("내구도 %d/%d · 항해 전 수리 확인", ship.hull, ship.maxHull), "yard"
			elseif ship.supplies <= 5 then
				cue, detail, tab = "보급품 부족", "보급 " .. tostring(ship.supplies) .. "개 · 출항 전 보급 확인", "yard"
			elseif ship.cargoCapacity > 0 and ship.cargoUsed >= ship.cargoCapacity then
				cue, detail, tab = "화물칸 가득 참", string.format("%d/%d칸 · 거래 전 화물 정리", ship.cargoUsed, ship.cargoCapacity), "trade"
			end
			if not cue then
				for _, q in (view.quests and view.quests.active) or {} do
					if q.kind == "deliver" and q.progress >= q.amount then
						cue, detail, tab = "납품 가능한 의뢰", q.name .. " · 보상 수령 조건 확인", "quest"
						break
					end
				end
			end
			if not cue then
				for _, t in (view.tech or {}) do
					if not t.owned and not t.blocked and (t.cost or 0) <= view.player.coins then
						cue, detail, tab = "연구 가능한 기술", t.name .. " · 비용 " .. tostring(t.cost or 0) .. "코인", "tech"
						break
					end
				end
			end
			if cue then
				local covered = false
				for _, advice in (view.counsel or {}) do
					if advice.tab == tab then covered = true; break end
				end
				if not covered then
					todo += 1
					local urgent = tab == "yard" or tab == "trade"
					local card = goal((if urgent then "주의 · " else "다음 할 일 · ") .. cue, detail, nil)
					local go = mkButton(card, "해당 메뉴로 이동", if urgent then COLORS.red else COLORS.green,
						UDim2.new(1, 0, 0, 46), function()
							close()
							H.goAdvice(tab)
						end, true)
					go.LayoutOrder = 4
				end
			end
		end
		for _, c in view.counsel or {} do
			if todo >= 3 then break end
			-- [중복 제거] 튜토리얼 길잡이 문장은 바로 위 첫 항해 체크리스트와 중복 표시하지 않는다.
			if H.tutorialGoalActive and string.sub(tostring(c.id or ""), 1, 2) == "g_" then continue end
			todo += 1
			local card = goal(string.format("%s의 조언", c.who and c.who.name or "동료"), c.text, nil)
			if c.tab then
				local go = mkButton(card, c.label or "가 보기", COLORS.green, UDim2.new(1, 0, 0, 46), function()
					close()
					H.goAdvice(c.tab)
				end, true)
				go.LayoutOrder = 4
			end
			if c.dismissable and c.id then
				-- [기존 서버 동작 보존] 메뉴에서 없어진 '알겠어요'를 저널에 그대로 연결한다.
				local done = mkButton(card, "알겠어요 · 조언 닫기", COLORS.grey, UDim2.new(1, 0, 0, 46), function()
					close()
					call("AdviceDone", { id = c.id })
				end, true)
				done.LayoutOrder = 5
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
		-- [교역소 프롤로그 이동] 서버의 원문을 변경하지 않고 저널 이야기 기록에 보존한다.
		head("이야기 기록")
		if view.prologue then
			goal("프롤로그 · " .. tostring(view.prologue.title or "첫 항해"), tostring(view.prologue.text or ""), nil)
		end
		if view.actIntro then
			goal(tostring(view.actIntro.title or "시대의 시작"), tostring(view.actIntro.text or ""), nil)
		elseif view.act and view.act.text then
			goal(tostring(view.act.title or "항해 이야기"), tostring(view.act.text), nil)
		end
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
	local BC = nil -- [시작 속도] 내 카드가 열릴 때만 기존 카드 규칙 모듈 로드
	local KIND = { crew = "🃏 인물", relic = "💎 유물", animal = "🐾 동물", book = "📖 지식", friend = "🤝 우군", ship = "⚓ 배" }
	local deckBtn = H.hudShortcut(hudTop, "DeckButton", "deck", "내 카드", true)
	deckBtn.AnchorPoint = Vector2.new(1, 0)
	deckBtn.Position = UDim2.new(1, -120, 0, SYS_Y)
	local open = nil
	function H.openDeck(onlyOpen: boolean?, initialTab: string?)
		-- [첫 게임 보호] 시작 화면/선장 소개 중에는 내 카드 창 자동 개봉을 막는다.
		if not view or newGameMode or H.titleMenuOpen or H.openingPending or sceneHold
			or (view.captain and view.captain.step ~= "done") then return end
		if open then
			if onlyOpen then
				return
			end
			open:Destroy()
			open = nil
			return
		end
        -- [내 카드 진입] 시작 화면을 먼저 띄우고, 버튼을 눌렀을 때 정본 모듈을 준비한다.
        local ready, loaded = pcall(function()
            BC = BC or require(Shared:WaitForChild("BoardingCards"))
            return NavalBattle or require(Shared:WaitForChild("NavalBattle"))
        end)
        if not ready then
            warn("[MareEssentia] 카드 장부 로드 실패", loaded)
            return
        end
        NavalBattle = loaded
		local layer = overlayGui("DeckWindow", 56)
		layer.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
		open = layer
		local mainWasVisible, hudWasEnabled = main.Visible, hudTopGui.Enabled
		main.Visible, hudTopGui.Enabled = false, false
		layer.Destroying:Connect(function()
			main.Visible, hudTopGui.Enabled = mainWasVisible, hudWasEnabled
		end)
		local win = Instance.new("Frame")
		win.Size = UDim2.fromScale(1, 1)
		win.BackgroundColor3 = NAVY
		win.BorderSizePixel = 0
		win.Parent = layer
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
					local before = table.clone(bookOf().owned)
					local r = call(action, payload)
					if not r or not r.ok then return "b" end
					local reward
					for id, count in bookOf().owned do
						if count > (before[id] or 0) then
							if reward then return "a" end
							reward = id
						end
					end
					return "a", reward
				end,
				onDone = function(_, replay)
					inField = false
					main.Visible = true
					render()
					H.openDeck(true, if replay then "battle" else nil)
				end,
			})
		end
		local function startPractice()
			local bk = bookOf()
			playCardOnly("연습전", "CardPractice", {}, { kind = "boarding", seed = 51, my = {}, foe = {}, book = { ids = bk.practiceIds, tier = {}, bonus = {}, practice = true } })
		end
		local function startDuel(questId: string?)
			-- [이야기 카드 대결] questId 를 주면 서버가 정한 지도자 덱(duelFoe)과 겨룬다.
			local r = call("CardDuelStart", if questId then { questId = questId } else nil)
			local seed = view and view.cardbook and view.cardbook.duelSeed
			local foe = view and view.cardbook and view.cardbook.duelFoe
			if r and r.ok and seed then
				playCardOnly(if foe then "이야기 대결" else "카드 대결", "CardDuelEnd", {}, { kind = "boarding", seed = seed, my = {},
					foe = if foe then { faction = foe.faction, leader = foe.leader } else {} })
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
			initialTab = initialTab,
			CB = CBk, BC = BC, AssetIds = AssetIds, artKey = NavalBattle.cardArtworkKey,
			catalog = catalog, galleryCtx = galleryCtx,
			getBook = bookOf, getView = bookOf, getWant = function() return want end,
			onWant = onWant, act = act, startPractice = startPractice, startDuel = startDuel,
			onReplace = function(ids)
				want = {}
				for _, id in ids do want[id] = (want[id] or 0) + 1 end
				ui.refresh(false)
			end,
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
-- [자금·화물 단일 표기] 기존 HUD·시설 책·교역·조선소의 동일 서버 스냅샷 사용.
function H.statusMoneyCargo(p, ship, compact)
	if compact then
		return string.format("돈 %s · 짐 %d/%d", H.commas(p.coins), ship.cargoUsed, ship.cargoCapacity)
	end
	return string.format("자금 %s코인 · 화물 %d/%d", H.commas(p.coins), ship.cargoUsed, ship.cargoCapacity)
end

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
	-- [첫 항해 목표 단일화] 항구 현판의 목표 중복 노출을 막고 저널에서만 진행도를 보여 준다.
	hudBanner.Text = ""
	H.goalBanner.Visible = false
	hullFill.Size = UDim2.fromScale(math.clamp(ship.hull / math.max(1, ship.maxHull), 0, 1), 1)
	hullText.Text = string.format("선체 %d/%d", math.floor(ship.hull), math.floor(ship.maxHull))
	hullFill.BackgroundColor3 = if ship.hull / math.max(1, ship.maxHull) < 0.35 then Color3.fromRGB(255, 80, 40) else Color3.fromRGB(214, 40, 36)
	H.hudShip.Text = string.format("화물 %d/%d · 명성 %d", ship.cargoUsed, ship.cargoCapacity, p.fame)
	H.hudCoin.Text = tostring(p.coins) .. " 코인"
	H.menuStatusLabel.Text = H.statusMoneyCargo(p, ship, mainInner.AbsoluteSize.X < 740 or H.headerTabs == true)
	local cargoRatio = math.clamp((ship.cargoUsed or 0) / math.max(1, ship.cargoCapacity or 0), 0, 1)
	H.menuCargoFill.Size = UDim2.fromScale(cargoRatio, 1)
	H.menuCargoFill.BackgroundColor3 = if cargoRatio >= 0.95 then Color3.fromRGB(208, 105, 77)
		elseif cargoRatio >= 0.75 then UI_BRASS else Color3.fromRGB(119, 173, 119)
	-- [상황별 표시] 실제 서버 스냅샷의 현재 상태만 사용하고 새 저장 키를 만들지 않는다.
	local lowPrice = false
	if (ship.cargoCapacity or 0) > (ship.cargoUsed or 0) then
		for _, goods in (view and view.goods) or {} do
			local price = tonumber(goods.buyTotals and goods.buyTotals[1]) or tonumber(goods.buy)
			local average = tonumber(goods.avgPrice)
			if price and average and average > 0 and price <= average * 0.9
				and price <= (p.coins or 0) and (tonumber(goods.supply) or 0) >= 1 then
				lowPrice = true
				break
			end
		end
	end
	local readyDelivery = false
	for _, q in (view and view.quests and view.quests.active) or {} do
		if q.kind == "deliver" and (q.progress or 0) >= (q.amount or math.huge) then
			readyDelivery = true
			break
		end
	end
	local alerts = {
		trade = if lowPrice then "저가" else nil,
		status = if (ship.hull or 0) / math.max(1, ship.maxHull or 1) < 0.40 then "긴급"
			elseif (ship.hull or 0) < (ship.maxHull or 0) then "수리"
			elseif (ship.supplies or 0) <= 5 then "보급" else nil,
		-- [인원 부족] 선원이 정원의 절반 아래면 주점(선원 고용)에 알림
		board = if readyDelivery then "납품"
			elseif (ship.crew or 0) < (ship.maxCrew or 0) * 0.5 then "인원" else nil,
	}
	-- [알림 효과] 실제 게임 상태만 사용. 상태 변경 시 기존 배지 트윈을 정리한다.
	H.dockSignalTweens = H.dockSignalTweens or {}
	local signalTweenService = game:GetService("TweenService")
	local reducedMotion = game:GetService("GuiService").ReducedMotionEnabled
	for id, notice in H.dockNotices do
		local alert = alerts[id]
		local previous = notice:GetAttribute("SignalKind")
		local changed = (alert or "") ~= (previous or "")
		local motionChanged = notice:GetAttribute("ReducedMotionLast") ~= reducedMotion
		local button = H.dockButtons[id]
		-- [효과 정리] 숨겨진 광원 인스턴스 없이 청동 배지와 맥동만 사용한다.
		if changed or motionChanged or previous == nil then
			notice.Visible = alert ~= nil
			notice.ImageColor3 = if alert == "긴급" then Color3.fromRGB(255, 205, 190) else Color3.new(1, 1, 1)
			if button then button:SetAttribute("IconAlert", alert ~= nil) end -- 알림 있을 때만 아이콘이 커졌다 작아진다
		end
		if changed or motionChanged then
			notice:SetAttribute("SignalKind", alert or "")
			notice:SetAttribute("ReducedMotionLast", reducedMotion)
			local running = H.dockSignalTweens[id]
			if running then
				for _, oldTween in running do oldTween:Cancel() end
				H.dockSignalTweens[id] = nil
			end
			notice.Size = UDim2.fromOffset(20, 20)
			if alert and changed and not reducedMotion then
				-- 새 알림 순간 배지가 한 번 톡 튀어나온다(반복 없음).
				notice.Size = UDim2.fromOffset(8, 8)
				local tween = signalTweenService:Create(notice, TweenInfo.new(0.28, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
					{ Size = UDim2.fromOffset(20, 20) })
				H.dockSignalTweens[id] = { tween }
				tween:Play()
			end
		end
	end
		-- [시설 길잡이] 실제 진행 단계가 바뀔 때만 다음 시설을 한 번 강조한다.
	local captain = view and view.captain
	local tutorial = if not H.tutorialHidden and captain then captain.step else nil
	local destination, cue
	if tutorial == "companion" then
		destination, cue = "board", "첫 동료"
	elseif tutorial == "done" and day == 0 then
		if (ship.cargoUsed or 0) == 0 then
			destination, cue = "trade", "첫 특산품"
		else
			destination, cue = "route", "첫 출항"
		end
	elseif readyDelivery then
		destination, cue = "board", "납품"
	end
	if not cue then
		H.lastDockCue = nil
	elseif hudTopGui.Enabled and H.lastDockCue ~= cue then
		H.lastDockCue = cue
		local pulse = H.dockMotion["Menu_" .. destination]
		if pulse and not game:GetService("GuiService").ReducedMotionEnabled then pulse:Play() end
	end
	-- [글씨 알림 제거] 저가·긴급·수리·보급·납품·추천 상태는 청동 배지와 아이콘 맥동으로 표시한다.
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
		local width = math.max(320, hud.AbsoluteSize.X)
		local compact = width < 610
		-- [5개 주 메뉴 / 4개 도구] 기능 묶음과 보조 도구를 서로 다른 줄에 정렬한다.
		local GAP = if width < 420 then 4 else 6
		local CW = math.min(64, math.floor((width - 16 - GAP * 4) / 5))
		local CH = if CW < 54 then 70 else 76
		local dockW = CW * 5 + GAP * 4
		local dockH = CH * 2 + GAP
		dockGrid.CellPadding = UDim2.fromOffset(GAP, GAP)
		dockGrid.CellSize = UDim2.fromOffset(CW, CH)
		-- [정렬] 주 메뉴 다섯 개는 첫 줄, 걷기·일지·카드·설정은 다음 줄.
		local sysOrder = { "JournalButton", "DeckButton", "OptionsButton" }
		for i, d in H.DOCK do
			local fb = H.dockButtons[d[1]]
			if fb then fb.LayoutOrder = i end
		end
		local walkBtn = dock:FindFirstChild("ViewToggle") or hudTop:FindFirstChild("ViewToggle")
		if walkBtn then
			if walkBtn.Parent ~= dock then walkBtn.Parent = dock end
			walkBtn.LayoutOrder = #H.DOCK + 1
		end
		for i, name in sysOrder do
			local b = dock:FindFirstChild(name) or hudTop:FindFirstChild(name)
			if b then
				if b.Parent ~= dock then b.Parent = dock end
				b.LayoutOrder = #H.DOCK + 1 + i
			end
		end
		for _, item in dock:GetChildren() do
			if item:IsA("TextButton") then
				item.AnchorPoint = Vector2.zero
				item.Size = UDim2.fromOffset(CW, CH)
				local art = item:FindFirstChild("MenuArt")
				local artSize = math.min(46, CW - 6, CH - 26)
				if art and art:IsA("GuiObject") then
					art.Size = UDim2.fromOffset(artSize, artSize)
					art.Position = UDim2.new(0.5, 0, 0, 3)
				end
				local caption = item:FindFirstChild("MenuName")
				if caption and caption:IsA("TextLabel") then
					caption.Position = UDim2.fromOffset(0, CH - 23)
					caption.Size = UDim2.new(1, 0, 0, 19)
					caption.TextSize = if CW < 52 then 11 else 13
				end
			end
		end
		dock.AutomaticCanvasSize = Enum.AutomaticSize.None
		dock.ScrollingEnabled = false
		dock.CanvasSize = UDim2.fromOffset(dockW, dockH)
		dock.ScrollBarThickness = 0
		dock.AnchorPoint = if compact then Vector2.zero else Vector2.new(1, 0)
		dock.Position = if compact then UDim2.fromOffset(8, 6) else UDim2.new(1, -8, 0, 6)
		dock.Size = UDim2.fromOffset(dockW, dockH)
		-- [작은 폰] 선장 상태 카드와 조언은 두 줄 메뉴 아래에 배치한다.
		card.Position = UDim2.fromOffset(8, if compact then dockH + 12 else 8)
		card.Size = UDim2.fromOffset(if compact then math.min(252, width - 16) else 262, 114)
		local left = if width < 1050 then 8 else 282
		local right = if width < 1050 then 8 else 304
		local bubbleWidth = math.clamp(width - left - right, 1, 760)
		bubble.AnchorPoint = Vector2.zero
		bubble.Position = UDim2.fromOffset(left + math.max(0, (width - left - right - bubbleWidth) / 2),
			if compact then dockH + 134 elseif width < 1050 then dockH + 18 else 76)
		H.goalBanner.Position = UDim2.new(0.5, 0, 0, if compact then dockH + 250 elseif width < 790 then dockH + 20 else 8)
		H.goalBanner.Size = UDim2.fromOffset(if compact then math.max(170, width - 16)
			elseif width < 790 then math.min(530, width - 24)
			else math.clamp(width - 590, 204, 480), 54)
		bubble.Size = UDim2.fromOffset(bubbleWidth, 0)
	end
	H.layoutDock = layoutBubble
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
	local FLOOR = 16
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
local GUIDE_BTN = {}
for _, g in GROUPS do
	for _, t in g.tabs do GUIDE_BTN[t] = "Menu_" .. g.tabs[1] end -- [5묶음] 탭 → 그 묶음 하단 버튼
end
-- [시설 안내] 버튼 외곽 사각 테두리·30fps 흔들림 대신 원화 중심에만 금빛을 맥동시킨다.
function H.setGuidePulse(tab)
	-- [튜토리얼 안내] 반짝이 대신 해당 아이콘만 맥동(GuideAlert)시킨다.
	for _, holder in { dock, hudTop } do
		for _, n in GUIDE_BTN do
			local b = holder:FindFirstChild(n)
			if b then
				local old = b:FindFirstChild("GuidePulse")
				if old then old:Destroy() end
				b:SetAttribute("GuideAlert", false)
			end
		end
	end
	local name = tab and GUIDE_BTN[tab]
	if not name then return end
	local b = dock:FindFirstChild(name) or hudTop:FindFirstChild(name)
	if b then b:SetAttribute("GuideAlert", true) end
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
	-- [시설 메뉴] 첫 판단 카드의 실행 버튼을 보존한 뒤 이전 화면을 정리한다.
	if H.menuActionButton and H.menuActionDock and H.menuActionButton.Parent ~= H.menuActionDock then
		H.menuActionButton.Parent = H.menuActionDock
	end
	H.menuFocusBanner = nil
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
	-- [첫 접속] 저장 응답 확인 중에는 전체 게임 창을 그리지 않는다.
	local startupStateRequest = action == "State" and H.startupCover and H.startupCover.Parent ~= nil
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
	-- [첫 게임 카드 팝업] 서버 요청 이전에 실제 카드 선택 보상이 있었는지 기억한다.
	local oldPick = view and view.cardbook and view.cardbook.pick
	local pickBefore = if type(oldPick) == "table" and #oldPick > 0 then table.concat(oldPick, ",") else nil
	busy = true
	local done, ok, result = false, false, nil
	task.spawn(function()
		ok, result = pcall(function()
			return remote:InvokeServer(action, payload or {})
		end)
		done = true
	end)
	local t = 0
	local timeout = if startupStateRequest then 6 else 15
	while not done and t < timeout do
		task.wait(0.05)
		t += 0.05
	end
	busy = false
	lastCallAt = os.clock()
	if not done then
		message, messageOk = "서버 응답이 늦어요. 잠시 후 다시 눌러 주세요", false
		if not startupStateRequest then render() end
		return nil
	end
	if DEBUG_LOG then print("[Game] call", action, ok, type(result) == "table" and result.ok, type(result) == "table" and result.message or result) end
	if not ok or type(result) ~= "table" then
		message, messageOk = "서버와 연결하지 못했어요", false
		if not startupStateRequest then render() end
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
		elseif action == "CardUpgrade" or action == "UpgradeCodexCard" or action == "CardPick" or action == "ClaimCollection" or action == "WikiQuiz" then
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
	-- [카드 습득 연출] 카드 습득 연출(H.showCardGain) 뒤, 불가사의 카드를 '처음' 얻을 때만 원더 씬을 한 번 자동 재생한다
	-- (2026-11-28 오너 지시). 그 뒤로는 카드 상세의 '원더 연출 다시 보기'로만 본다.
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
		if H.checkWorldEvents then H.checkWorldEvents() end
		if H.checkQuestResults then H.checkQuestResults() end
		if H.checkQuestTalks then H.checkQuestTalks() end
		if view.scenes and #view.scenes > 0 and H.playQuestScenes then H.playQuestScenes(view.scenes) end
	end
	if result.message and result.message ~= "" then
		message, messageOk = result.message, result.ok
	end
	-- 서버 상태 로드가 끝날 때 제목 화면만 한 번 만들고, 실제 게임 창은 이어하기에서 구성한다.
	if not startupStateRequest then render() end
	if tradeHallRefresh then
		tradeHallRefresh()
	end
	if H.cabinRefresh then
		H.cabinRefresh()
	end
	-- [카드 보상 창] 새로 획득한 3장 선택 보상만 자동으로 연다.
	-- 첫 접속 State·NewGame·시작 안내 중 기존 선택 보상을 다시 띄우지 않는다.
	local pickIds = view and view.cardbook and view.cardbook.pick
	if type(pickIds) ~= "table" or #pickIds == 0 then
		H.deckPickShown = nil
	elseif result.ok and action ~= "State" and action ~= "NewGame" and action ~= "CardPick"
		and string.sub(action, 1, 5) ~= "Intro" -- 이름·동료·초상 안내는 카드 보상 이벤트가 아니다.
		and (not view.captain or view.captain.step == "done")
		and H.openDeck and not inField and not sceneHold and not newGameMode
		and not H.titleMenuOpen and not H.openingPending then
		local pickKey = table.concat(pickIds, ",")
		if pickBefore ~= pickKey and H.deckPickShown ~= pickKey then
			H.deckPickShown = pickKey
			task.delay(1.5, function()
				local currentPick = view and view.cardbook and view.cardbook.pick
				if type(currentPick) == "table" and #currentPick > 0
					and table.concat(currentPick, ",") == pickKey
					and not inField and not sceneHold and not newGameMode
					and (not view.captain or view.captain.step == "done")
					and not H.titleMenuOpen and not H.openingPending then
					H.openDeck(true)
				end
			end)
		end
	end
	-- 해전을 했다면 전투 기록을 3D 장면으로 보여 준다
	if result.ok and (action == "Hunt" or action == "ChallengeBoss" or action == "WarStart" or action == "WarNext" or action == "TavernJob") and view and view.lastBattle and not inField then
        -- [해전 진입] 기존 정본 전투 모듈만 늦게 읽는다. 실패하면 항구 메뉴를 유지한다.
        local ready, loaded = pcall(function()
            return NavalBattle or require(Shared:WaitForChild("NavalBattle"))
        end)
        if not ready then
            warn("[MareEssentia] 해전 장면 로드 실패", loaded)
            message, messageOk = "해전 장면을 불러오지 못했어.", false
            render()
            return result
        end
        NavalBattle = loaded
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
			-- [해역별 해전 연출] 기존 항구 좌표를 배경 선택에만 전달한다. 서버 전투·저장 불변.
			portId = view.player and view.player.portId,
			portLat = view.player and PortData.Ports[view.player.portId] and PortData.Ports[view.player.portId].lat,
			portLon = view.player and PortData.Ports[view.player.portId] and PortData.Ports[view.player.portId].lon,
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
				-- [실패 이유 · 2026-11-28] 졌으면 무엇이 모자랐는지와 다음 할 일 버튼
				if finalWinner == "b" and H.showDefeatAdvice then
					task.delay(0.8, function() pcall(H.showDefeatAdvice, lb.sim) end)
				end
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
	-- 항구 모델이 준비되기 전에는 서버의 출항 판정을 발생시키지 않는다.
	if not PortScene then
		message, messageOk = "항구 장면을 불러오는 중이야. 잠시 후 다시 눌러 줘.", false
		render()
		return
	end
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
		local ok, err, hits, ringTotal = pcall(function()
            VoyageScene = VoyageScene or require(Shared:WaitForChild("VoyageScene"))
            return VoyageScene.play({
			shipId = view.ship.id,
			steam = steam,
			days = days,
			departureDay = departureDay,
			path = SeaRoutes.path(fromId, portId, PortData.Ports),
			fromName = from,
			toName = view.player.portName,
			fromId = fromId, toId = portId, -- [자동 배치] 해역 배경 슬롯(voyage_/sea_<해역>_*)
			-- [해양 퀘스트 표시 · 2026-11-28] 도착하면 할 일·의뢰 목적지 여부(빛기둥 📜)
			nextStep = (function()
				local ok, st = pcall(function() return H.nextStep and H.nextStep() end)
				return ok and st and st.text or nil
			end)(),
			questTarget = (function()
				for _, q in (view.quests and view.quests.active) or {} do
					if q.portId == portId then return true end
				end
				return false
			end)(),
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
        end)
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
	local vessel = if PortScene then PortScene.placeModel(shipWorld, "Naval", "ship-large", Vector3.zero, 44)
		or PortScene.placeModel(shipWorld, "Naval", "ship-medium", Vector3.zero, 38)
		or PortScene.placeModel(shipWorld, "Naval", "boat-sail-a", Vector3.zero, 34) else nil
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


-- [역사 시네마틱 · 메인] 책이 열리면 실제 항구 좌표의 세계 해도와 등록 3D 역사 무대가 펼쳐진다.
-- 서버 선택/보상/저장에 개입하지 않고 기존 모델·음원만 사용하는 순수 클라이언트 연출.
function H.historyCinematic(parent, ev)
	local TS = game:GetService("TweenService")
	local lessMotion = game:GetService("GuiService").ReducedMotionEnabled
	local keyPorts = {
		magellan_circum = "seville", mercator_projection = "amsterdam", lepanto = "venice",
		imjin_war = "busan", armada = "plymouth", manila_galleon = "manila",
		great_fire = "london", great_plague = "london", principia = "london",
		lisbon_quake = "lisbon", boston_tea = "boston", independence = "boston",
		french_revolution = "rouen", cook_voyage = "plymouth", dutch_revolt = "amsterdam",
	}
	local regionPorts = { europe = "london", w_africa = "zanzibar", new_world = "kingston",
		indian = "calcutta", far_east = "edo", pacific = "sydney" }
	local referenceId = ev.portId or ev.port or keyPorts[ev.id] or (ev.regions and regionPorts[ev.regions[1]])
	local origin = PortData.Ports[view and view.player and view.player.portId or "london"] or PortData.Ports.london
	local located = referenceId and PortData.Ports[referenceId]
	local destination = located or origin
	local gold = Color3.fromRGB(248, 199, 113)
	local root = Instance.new("Frame")
	root.Name = "HistoryLivingScene"
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = Color3.fromRGB(33, 45, 53)
	root.BorderSizePixel = 0
	root.ClipsDescendants = true
	root.Parent = parent

	-- [일러스트 프레임 제거 · 2026-11-24 오너] 30프레임 원화판(history_open/map/record)은 256색·저해상도이고
	-- 로딩에 실패하면 정지 그림만 남아 아래 3D 연출이 막혔다. 퀘스트·사건 모두 아래 해도·3D 연출만 쓴다.
	-- [세계지도] 기존 승인된 세계 해도와 좌표·항로·사건 위치 표시.
	local map = Instance.new("Frame")
	map.Name = "HistoryWorldChart"
	map.AnchorPoint = Vector2.new(0.5, 0.5)
	map.Position = UDim2.fromScale(0.5, 0.5)
	map.Size = UDim2.fromScale(1, 1)
	map.BackgroundColor3 = Color3.fromRGB(65, 70, 69)
	map.BorderSizePixel = 0
	map.Parent = root
	local imageId = AssetIds["CardArt/event_chart_world"] or AssetIds["Menu/chart_folded_map"]
	if imageId then
		local chart = Instance.new("ImageLabel")
		chart.Name = "RegisteredHistoricalWorldMap"
		chart.Size = UDim2.fromScale(1, 1)
		chart.BackgroundTransparency = 1
		chart.Image = "rbxassetid://" .. tostring(imageId)
		chart.ImageTransparency = 0.24
		chart.ScaleType = Enum.ScaleType.Crop
		chart.Parent = map
	end
	local tint = Instance.new("Frame")
	tint.Size = UDim2.fromScale(1, 1)
	tint.BackgroundColor3 = Color3.fromRGB(17, 34, 44)
	tint.BackgroundTransparency = 0.55
	tint.BorderSizePixel = 0
	tint.Parent = map
	for i = 1, 5 do
		local longitude = Instance.new("Frame")
		longitude.Name = "MapLongitude"
		longitude.Position = UDim2.fromScale(i / 6, 0)
		longitude.Size = UDim2.new(0, 1, 1, 0)
		longitude.BackgroundColor3 = gold
		longitude.BackgroundTransparency = 0.83
		longitude.BorderSizePixel = 0
		longitude.Parent = map
	end
	for i = 1, 3 do
		local latitude = Instance.new("Frame")
		latitude.Name = "MapLatitude"
		latitude.Position = UDim2.fromScale(0, i / 4)
		latitude.Size = UDim2.new(1, 0, 0, 1)
		latitude.BackgroundColor3 = gold
		latitude.BackgroundTransparency = 0.83
		latitude.BorderSizePixel = 0
		latitude.Parent = map
	end
	local function coordinates(port)
		return Vector2.new(math.clamp((port.lon + 180) / 360, 0.03, 0.97),
			math.clamp((90 - port.lat) / 180, 0.06, 0.94))
	end
	local from = coordinates(origin)
	local target = coordinates(destination)
	if (from - target).Magnitude < 0.015 then from += Vector2.new(-0.10, 0.035) end
	local dots = if lessMotion then 5 else 10
	for i = 1, dots do
		local t = i / dots
		local point = from:Lerp(target, t) + Vector2.new(0, -0.09 * math.sin(math.pi * t))
		local dot = Instance.new("Frame")
		dot.Name = "AnimatedSeaRoute"
		dot.AnchorPoint = Vector2.new(0.5, 0.5)
		dot.Position = UDim2.fromScale(point.X, point.Y)
		dot.Size = UDim2.fromOffset(4, 4)
		dot.BackgroundColor3 = gold
		dot.BackgroundTransparency = if lessMotion then 0.12 else 1
		dot.BorderSizePixel = 0
		dot.Parent = map
		corner(dot, 20)
		if not lessMotion then
			task.delay(0.42 + i * 0.055, function()
				if dot.Parent then TS:Create(dot, TweenInfo.new(0.2), { BackgroundTransparency = 0.12 }):Play() end
			end)
		end
	end
	local marker = Instance.new("TextLabel")
	marker.Name = "HistoricMapBeacon"
	marker.AnchorPoint = Vector2.new(0.5, 0.5)
	marker.Position = UDim2.fromScale(target.X, target.Y)
	marker.Size = UDim2.fromOffset(34, 34)
	marker.BackgroundTransparency = 1
	marker.Text = "✦"
	marker.Font = Enum.Font.GothamBold
	marker.TextSize = 28
	marker.TextColor3 = gold
	marker.Parent = map
	local pulse = Instance.new("Frame")
	pulse.Name = "HistoricalMapPulse"
	pulse.AnchorPoint = Vector2.new(0.5, 0.5)
	pulse.Position = marker.Position
	pulse.Size = UDim2.fromOffset(22, 22)
	pulse.BackgroundTransparency = 1
	pulse.Parent = map
	corner(pulse, 100)
	local ring = Instance.new("UIStroke")
	ring.Color = gold
	ring.Thickness = 2
	ring.Parent = pulse
	if not lessMotion then
		TS:Create(pulse, TweenInfo.new(1.05, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
			Size = UDim2.fromOffset(94, 94),
		}):Play()
		TS:Create(ring, TweenInfo.new(1.05), { Transparency = 1 }):Play()
		TS:Create(map, TweenInfo.new(3.1, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), {
			Position = UDim2.fromScale(0.5 + (0.5 - target.X) * 0.18, 0.5 + (0.5 - target.Y) * 0.10),
			Size = UDim2.fromScale(1.10, 1.10),
		}):Play()
	end
	local place = Instance.new("TextLabel")
	place.Name = "HistoryMapPlace"
	place.AnchorPoint = Vector2.new(0, 1)
	place.Position = UDim2.fromScale(0.04, 0.97)
	place.Size = UDim2.new(0.53, 0, 0, 25)
	place.BackgroundTransparency = 1
	place.Text = "해도 · " .. (if located then located.name else "현재 항해 기준점")
	place.Font = Enum.Font.GothamBold
	place.TextSize = 14
	place.TextXAlignment = Enum.TextXAlignment.Left
	place.TextColor3 = gold
	place.TextStrokeTransparency = 0.4
	place.Parent = root

	-- [3D 역사 무대] 해전·학문·교역에 맞는 승인 원본 모델을 작은 뷰포트에 배치한다.
	local stage = Instance.new("ViewportFrame")
	stage.Name = "ApprovedHistory3DStage"
	stage.AnchorPoint = Vector2.new(1, 0)
	stage.Position = UDim2.fromScale(0.97, 0.06)
	stage.Size = UDim2.fromScale(0.44, 0.78)
	stage.BackgroundColor3 = Color3.fromRGB(27, 40, 52)
	stage.BackgroundTransparency = 1 -- 모델이 안 보일 때 빈 어두운 칸이 남지 않게
	stage.Ambient = Color3.fromRGB(169, 153, 147)
	stage.LightColor = Color3.fromRGB(255, 222, 161)
	stage.LightDirection = Vector3.new(-0.65, -0.75, -0.46).Unit
	stage.Parent = root
	corner(stage, 10)
	local world = Instance.new("WorldModel")
	world.Parent = stage
	local cam = Instance.new("Camera")
	cam.FieldOfView = 42
	cam.CFrame = CFrame.lookAt(Vector3.new(13, 9, 18), Vector3.new(0, 2, 0))
	cam.Parent = stage
	stage.CurrentCamera = cam
	local subject = tostring(ev.tag or "") .. " " .. tostring(ev.title or "") .. " " .. tostring(ev.art or "")
	local war = string.find(subject, "전쟁", 1, true) or string.find(subject, "해전", 1, true)
	local scholar = string.find(subject, "학문", 1, true) or string.find(subject, "과학", 1, true)
		or ev.art == "library" or ev.art == "observatory"
	local commerce = string.find(subject, "무역", 1, true) or string.find(subject, "경제", 1, true)
		or ev.art == "tavern"
	local selection = if war then { { "Naval", "ship-large" }, { "Naval", "ship-medium" }, { "People", "Soldier_Male" } }
		elseif scholar then { { "Interior", "bookcaseopenlow" }, { "People", "Doctor_Male_Old" }, { "Relics", "map" } }
		elseif commerce then { { "Naval", "ship-medium" }, { "Cargo", "box-open" }, { "People", "Worker_Male" } }
		else { { "Naval", "ship-medium" }, { "People", "Casual_Male" }, { "Relics", "map" } }
	task.spawn(function()
		local library = ReplicatedStorage:FindFirstChild("MareAssets") or ReplicatedStorage:WaitForChild("MareAssets", 2)
		if not library or not stage.Parent then return end
		local populated = 0
		for i, spec in selection do
			local group = library:FindFirstChild(spec[1])
			local modelSource = group and group:FindFirstChild(spec[2])
			if modelSource and modelSource:IsA("Model") and modelSource:FindFirstChildWhichIsA("BasePart", true)
				and stage.Parent then
				local model = modelSource:Clone()
				for _, p in model:GetDescendants() do
					if p:IsA("BasePart") then
						p.Anchored = true
						p.CanCollide = false
						p.CanTouch = false
						p.CanQuery = false
					end
				end
				model.Parent = world
				local _, bounds = model:GetBoundingBox()
				pcall(function()
					model:ScaleTo((if i == 1 then 7 else 4) / math.max(bounds.X, bounds.Y, bounds.Z, 0.1))
				end)
				local measured, size = model:GetBoundingBox()
				model:PivotTo(CFrame.new((i - 2) * 4.6,
					model:GetPivot().Position.Y - measured.Position.Y + size.Y / 2,
					(i - 2) * 0.7) * CFrame.Angles(0, math.rad(18 - i * 16), 0))
				populated += 1
			end
		end
		if populated > 0 and stage.Parent and not lessMotion then
			TS:Create(cam, TweenInfo.new(3.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), {
				CFrame = CFrame.lookAt(Vector3.new(10, 7, 13), Vector3.new(0, 2, 0)),
				FieldOfView = 37,
			}):Play()
		end
	end)

	-- [책 개봉] 양피지 두 장이 펼쳐지며 지도·3D 무대가 드러나고 기존 장부/해도 소리가 이어진다.
	local book = Instance.new("Frame")
	book.Name = "HistoricBookOpening"
	book.Size = UDim2.fromScale(1, 1)
	book.BackgroundTransparency = 1
	book.ZIndex = 10
	book.Parent = root
	for i = 1, 2 do
		local page = Instance.new("Frame")
		page.Name = if i == 1 then "BookLeft" else "BookRight"
		page.AnchorPoint = Vector2.new(if i == 1 then 1 else 0, 0.5)
		page.Position = UDim2.fromScale(0.5, 0.5)
		page.Size = UDim2.fromScale(0.5, 0.96)
		page.BackgroundColor3 = if i == 1 then Color3.fromRGB(214, 184, 132) else Color3.fromRGB(243, 218, 171)
		page.BorderSizePixel = 0
		page.ZIndex = 11
		page.Parent = book
		local glyph = Instance.new("TextLabel")
		glyph.Size = UDim2.fromScale(1, 1)
		glyph.BackgroundTransparency = 1
		glyph.Text = if i == 1 then "✦" else "역사"
		glyph.Font = Enum.Font.Antique
		glyph.TextSize = if i == 1 then 58 else 26
		glyph.TextColor3 = Color3.fromRGB(90, 61, 41)
		glyph.ZIndex = 12
		glyph.Parent = page
		task.delay(0.15, function()
			if not page.Parent then return end
			TS:Create(page, TweenInfo.new(if lessMotion then 0.16 else 0.60, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
				Size = UDim2.fromScale(0.006, 0.96), BackgroundTransparency = 1,
			}):Play()
			TS:Create(glyph, TweenInfo.new(0.23), { TextTransparency = 1 }):Play()
		end)
	end
	Sfx.play("sfx_book_turn", 0.25)
	task.delay(0.40, function()
		if root.Parent then Sfx.play("sfx_chart_unfold", 0.31, 1.04, "sfx_book_turn") end
	end)
	task.delay(1, function() if book.Parent then book:Destroy() end end)

	-- [서재 수납] 서버 승인 후 책장에 기록됐다는 황동 봉인을 띄운다.
	local recorded = false
	return function()
		if recorded or not root.Parent then return end
		recorded = true
		-- [사건 귀환] 현실로 펼쳐졌던 지도가 양쪽 책장 속으로 접히며 서재에 기록된다.
		local closeBook = Instance.new("Frame")
		closeBook.Name = "HistoricBookClosing"
		closeBook.Size = UDim2.fromScale(1, 1)
		closeBook.BackgroundTransparency = 1
		closeBook.ZIndex = 11
		closeBook.Parent = root
		for i = 1, 2 do
			local leaf = Instance.new("Frame")
			leaf.Name = if i == 1 then "ReturnLeftPage" else "ReturnRightPage"
			leaf.AnchorPoint = Vector2.new(if i == 1 then 0 else 1, 0.5)
			leaf.Position = UDim2.fromScale(if i == 1 then 0 else 1, 0.5)
			leaf.Size = UDim2.fromScale(0.006, 0.94)
			leaf.BackgroundColor3 = if i == 1 then Color3.fromRGB(229, 199, 146) else Color3.fromRGB(244, 219, 176)
			leaf.BorderSizePixel = 0
			leaf.ZIndex = 12
			leaf.Parent = closeBook
			TS:Create(leaf, TweenInfo.new(if lessMotion then 0.16 else 0.46, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
				Size = UDim2.fromScale(0.5, 0.94),
			}):Play()
		end
		Sfx.play("sfx_contract_stamp", 0.28, 1.03, "sfx_book_turn")
		task.delay(0.25, function()
			if root.Parent then Sfx.play("sfx_quest_book_close", 0.23, 1.03, "sfx_book_turn") end
		end)
		local seal = Instance.new("TextLabel")
		seal.Name = "HistoricalBookArchived"
		seal.AnchorPoint = Vector2.new(0.5, 0.5)
		seal.Position = UDim2.fromScale(0.5, 0.5)
		seal.Size = UDim2.fromScale(0.80, 0.34)
		seal.BackgroundColor3 = Color3.fromRGB(64, 44, 32)
		seal.BackgroundTransparency = 0.08
		seal.BorderSizePixel = 0
		seal.Font = Enum.Font.Antique
		seal.TextSize = 23
		seal.TextColor3 = gold
		seal.TextWrapped = true
		seal.Text = "✦ 역사 기록 완료 ✦" .. string.char(10) .. "서재에 새겨졌다"
		seal.TextTransparency = 1
		seal.ZIndex = 15
		seal.Parent = root
		corner(seal, 10)
		TS:Create(seal, TweenInfo.new(0.22), { TextTransparency = 0 }):Play()
		task.delay(0.46, function()
			if seal.Parent then TS:Create(seal, TweenInfo.new(0.29), {
				TextTransparency = 1, BackgroundTransparency = 1,
			}):Play() end
		end)
	end
end

-- [퀘스트 연출씬 · 2026-11-24 오너] 일러스트 없이 실제 3D 세계를 카메라가 천천히 훑는다.
--  · 목적지 항로: 해도 창에 현재 항구→목적지 점선과 배 표시가 따라간다.
--  · 분위기: 전쟁(흔들림·붉은 그늘·전쟁 효과음) / 학문(촛불 그늘·책장) / 교역(동전·항구) / 항해(바람·갈매기).
--  · 길이: 일반 의뢰는 짧게(3.5초), 연계·서막·역사·고난도는 길게(8초). 이미 본 장면은 짧게.
--  · 수락 도장: 선택을 마치면 밀랍 봉인이 찍히고 저널 아이콘으로 날아간다.
--  · 건너뛰기: H.sceneSkip 으로 카메라를 끝 위치로 보낸다.
-- 서버 선택/보상/저장에는 개입하지 않는 순수 클라이언트 연출이다.
function H.questCinematic(parent, ev, overlay)
	local TS = game:GetService("TweenService")
	local lessMotion = game:GetService("GuiService").ReducedMotionEnabled
	local seen = H.seenScenes and H.seenScenes[tostring(ev.id)] == true
	local long = ev.long == true and not seen
	local duration = if lessMotion then 0.01 elseif long then 8 else 3.5
	local mood = tostring(ev.mood or "voyage")
	local gold = Color3.fromRGB(248, 199, 113)
	local root = Instance.new("Frame")
	root.Name = "QuestLiveScene"
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundTransparency = 1
	root.Parent = parent

	-- 1) 실제 세계 카메라 무빙 (끝나면 원래 카메라로 되돌린다)
	local cam = workspace.CurrentCamera
	local oldType, oldCF, oldFov = cam.CameraType, cam.CFrame, cam.FieldOfView
	local focus = oldCF.Position + oldCF.LookVector * 42
	local startOffset = oldCF.Position - focus
	local alpha = Instance.new("NumberValue")
	local shake = mood == "war" and not lessMotion
	local bound = true
	cam.CameraType = Enum.CameraType.Scriptable
	local function place(t)
		local angle = math.rad(if long then 50 else 26) * t
		local off = CFrame.Angles(0, angle, 0):VectorToWorldSpace(startOffset) * (1 - 0.25 * t) + Vector3.new(0, 7 * t, 0)
		local cf = CFrame.lookAt(focus + off, focus)
		if shake then
			local k = 0.12 + 0.18 * math.abs(math.sin(os.clock() * 7))
			cf = cf * CFrame.new(math.noise(os.clock() * 9, 1) * k, math.noise(os.clock() * 9, 2) * k, 0)
		end
		cam.CFrame = cf
		cam.FieldOfView = oldFov - 6 * t
	end
	-- 다른 카메라 코드보다 뒤에 돌도록 마지막 순서로 묶는다.
	game:GetService("RunService"):BindToRenderStep("QuestLiveSceneCamera", Enum.RenderPriority.Last.Value, function()
		if root.Parent then place(alpha.Value) end
	end)
	local camTween = TS:Create(alpha, TweenInfo.new(duration, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), { Value = 1 })
	camTween:Play()
	-- 장면 동안 다른 화면(메뉴·HUD)을 숨겨 3D 세계만 보이게 한다.
	local hidden = {}
	local myGui = overlay:FindFirstAncestorOfClass("ScreenGui")
	for _, g in player:WaitForChild("PlayerGui"):GetChildren() do
		if g:IsA("ScreenGui") and g ~= myGui and g.Enabled then
			g.Enabled = false
			table.insert(hidden, g)
		end
	end
	local function restore()
		for _, g in hidden do if g.Parent then g.Enabled = true end end
		table.clear(hidden)
		if not bound then return end
		bound = false
		pcall(function() game:GetService("RunService"):UnbindFromRenderStep("QuestLiveSceneCamera") end)
		camTween:Cancel()
		cam.CameraType = oldType
		cam.CFrame = oldCF
		cam.FieldOfView = oldFov
	end
	overlay.Destroying:Connect(restore)
	root.Destroying:Connect(restore)
	H.sceneSkip = function()
		camTween:Cancel()
		alpha.Value = 1
	end

	-- 영화 띠(위)와 아래 대화창 쪽으로 부드럽게 어두워지는 그늘
	local bar = Instance.new("Frame")
	bar.Name = "CinemaBar"
	bar.Size = UDim2.new(1, 0, 0, 10)
	bar.BackgroundColor3 = Color3.new(0, 0, 0)
	bar.BorderSizePixel = 0
	bar.Parent = root
	TS:Create(bar, TweenInfo.new(0.5), { Size = UDim2.new(1, 0, 0.09, 0) }):Play()
	local fade = Instance.new("Frame")
	fade.Name = "SceneBottomFade"
	fade.AnchorPoint = Vector2.new(0, 1)
	fade.Position = UDim2.fromScale(0, 1)
	fade.Size = UDim2.fromScale(1, 0.35)
	fade.BackgroundColor3 = Color3.fromRGB(24, 28, 38)
	fade.BorderSizePixel = 0
	fade.Parent = root
	local fg = Instance.new("UIGradient")
	fg.Rotation = 90
	fg.Transparency = NumberSequence.new(1, 0)
	fg.Parent = fade

	-- 2) 분위기 효과
	local moodTint = if mood == "war" then Color3.fromRGB(120, 24, 16)
		elseif mood == "scholar" then Color3.fromRGB(150, 96, 30)
		elseif mood == "commerce" then Color3.fromRGB(150, 120, 40)
		else Color3.fromRGB(30, 70, 110)
	local vignette = Instance.new("Frame")
	vignette.Name = "SceneMoodVignette"
	vignette.Size = UDim2.fromScale(1, 1)
	vignette.BackgroundColor3 = moodTint
	vignette.BackgroundTransparency = 1
	vignette.BorderSizePixel = 0
	vignette.Parent = root
	local vg = Instance.new("UIGradient")
	vg.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.2), NumberSequenceKeypoint.new(0.3, 1), NumberSequenceKeypoint.new(0.7, 1), NumberSequenceKeypoint.new(1, 0.2) })
	vg.Parent = vignette
	TS:Create(vignette, TweenInfo.new(0.8), { BackgroundTransparency = if mood == "voyage" then 0.75 else 0.55 }):Play()
	if mood == "scholar" and not lessMotion then
		-- 촛불처럼 은은하게 흔들리는 그늘
		TS:Create(vignette, TweenInfo.new(0.9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), { BackgroundTransparency = 0.68 }):Play()
	end
	if mood == "war" then
		Sfx.play("sfx_event_war", 0.32, 1, "sfx_cannon")
		task.delay(0.9, function() if root.Parent then Sfx.play("sfx_naval_cannon", 0.18, 0.9, "sfx_cannon") end end)
	elseif mood == "scholar" then
		Sfx.play("sfx_book_turn", 0.28)
		task.delay(0.8, function() if root.Parent then Sfx.play("sfx_story_library", 0.2, 1, "sfx_book_turn") end end)
	elseif mood == "commerce" then
		Sfx.play("sfx_coin_pouch", 0.3, 1, "sfx_coin")
		task.delay(0.7, function() if root.Parent then Sfx.play("sfx_event_trade", 0.22, 1, "sfx_bell") end end)
	else
		Sfx.play("sfx_wind", 0.22)
		task.delay(0.6, function() if root.Parent then Sfx.play("sfx_gull", 0.2) end end)
	end

	-- 3) 목적지 항로 해도 창
	local origin = PortData.Ports[view and view.player and view.player.portId or "london"] or PortData.Ports.london
	local dest = ev.portId and PortData.Ports[ev.portId]
	if dest and dest ~= origin then
		local chart = Instance.new("Frame")
		chart.Name = "QuestRouteChart"
		chart.AnchorPoint = Vector2.new(0, 1)
		chart.Position = UDim2.new(0, 16, 1, -10)
		chart.Size = UDim2.new(0.30, 0, 0.58, 0)
		chart.BackgroundColor3 = Color3.fromRGB(40, 48, 52)
		chart.BorderSizePixel = 0
		chart.ClipsDescendants = true
		chart.Parent = root
		corner(chart, 8)
		local edge = Instance.new("UIStroke")
		edge.Color = gold
		edge.Thickness = 1.5
		edge.Parent = chart
		local mapId = AssetIds["CardArt/event_chart_world"]
		if mapId then
			local img = Instance.new("ImageLabel")
			img.BackgroundTransparency = 1
			img.Size = UDim2.fromScale(1, 1)
			img.ScaleType = Enum.ScaleType.Crop
			img.Image = "rbxassetid://" .. tostring(mapId)
			img.ImageTransparency = 0.15
			img.Parent = chart
		end
		local function at(port)
			return Vector2.new(math.clamp((port.lon + 180) / 360, 0.04, 0.96), math.clamp((90 - port.lat) / 180, 0.06, 0.94))
		end
		local a, b = at(origin), at(dest)
		local dots = 12
		local points = {}
		for i = 0, dots do
			local t = i / dots
			table.insert(points, a:Lerp(b, t) + Vector2.new(0, -0.12 * math.sin(math.pi * t)))
		end
		for i, pt in points do
			local d = Instance.new("Frame")
			d.Name = "QuestRouteDot"
			d.AnchorPoint = Vector2.new(0.5, 0.5)
			d.Position = UDim2.fromScale(pt.X, pt.Y)
			d.Size = UDim2.fromOffset(4, 4)
			d.BackgroundColor3 = gold
			d.BackgroundTransparency = if lessMotion then 0.1 else 1
			d.BorderSizePixel = 0
			d.Parent = chart
			corner(d, 10)
			if not lessMotion then
				task.delay(0.3 + i * (duration * 0.5 / dots), function()
					if d.Parent then TS:Create(d, TweenInfo.new(0.18), { BackgroundTransparency = 0.1 }):Play() end
				end)
			end
		end
		local ship = Instance.new("TextLabel")
		ship.Name = "QuestRouteShip"
		ship.AnchorPoint = Vector2.new(0.5, 0.5)
		ship.Position = UDim2.fromScale(a.X, a.Y)
		ship.Size = UDim2.fromOffset(22, 22)
		ship.BackgroundTransparency = 1
		ship.Text = "⛵"
		ship.TextSize = 18
		ship.TextColor3 = Color3.new(1, 1, 1)
		ship.ZIndex = 3
		ship.Parent = chart
		if not lessMotion then
			task.spawn(function()
				for i, pt in points do
					if not ship.Parent then return end
					TS:Create(ship, TweenInfo.new(duration * 0.5 / dots, Enum.EasingStyle.Linear), { Position = UDim2.fromScale(pt.X, pt.Y) }):Play()
					task.wait(duration * 0.5 / dots)
					if i == #points then break end
				end
			end)
		else
			ship.Position = UDim2.fromScale(b.X, b.Y)
		end
		local label = Instance.new("TextLabel")
		label.Name = "QuestRouteLabel"
		label.AnchorPoint = Vector2.new(0, 1)
		label.Position = UDim2.new(0, 6, 1, -4)
		label.Size = UDim2.new(1, -12, 0, 22)
		label.BackgroundColor3 = Color3.fromRGB(20, 16, 12)
		label.BackgroundTransparency = 0.25
		label.Text = string.format("%s → %s", origin.name, dest.name)
		label.Font = Enum.Font.GothamBold
		label.TextSize = 14
		label.TextColor3 = Color3.fromRGB(255, 236, 190)
		label.ZIndex = 4
		label.Parent = chart
		corner(label, 5)
		Sfx.play("sfx_chart_unfold", 0.22, 1.04, "sfx_book_turn")
	end

	-- 4) 수락 도장: 선택을 마치면 봉인이 찍히고 저널로 날아간다
	return function()
		if not root.Parent then return end
		local sheet = AssetIds["CardArt/ui_reserve_icons"]
		Sfx.play("sfx_contract_stamp", 0.34, 1, "sfx_quest_accept")
		if not sheet then return end
		local seal = Instance.new("ImageLabel")
		seal.Name = "QuestAcceptSeal"
		seal.AnchorPoint = Vector2.new(0.5, 0.5)
		seal.Position = UDim2.fromScale(0.5, 0.5)
		seal.Size = UDim2.fromOffset(300, 300)
		seal.BackgroundTransparency = 1
		seal.Image = "rbxassetid://" .. tostring(sheet)
		seal.ImageRectOffset = Vector2.new(0, 2 * 184) -- 두루마리·밀랍 봉인 칸
		seal.ImageRectSize = Vector2.new(192, 184)
		seal.ScaleType = Enum.ScaleType.Fit
		seal.ImageTransparency = 0.2
		seal.ZIndex = 20
		seal.Parent = root
		if lessMotion then
			seal.Size = UDim2.fromOffset(120, 120)
			task.delay(0.6, function() if seal.Parent then seal:Destroy() end end)
			return
		end
		TS:Create(seal, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(130, 130), ImageTransparency = 0 }):Play()
		task.delay(0.75, function()
			if not seal.Parent then return end
			-- 저널 아이콘 위치로 날아간다(없으면 위로 사라진다)
			local target = UDim2.fromScale(0.95, -0.2)
			local journal = hudTop and hudTop:FindFirstChild("JournalButton")
			if journal and journal.AbsoluteSize.X > 0 then
				local p0 = root.AbsolutePosition
				local center = journal.AbsolutePosition + journal.AbsoluteSize / 2
				target = UDim2.fromOffset(center.X - p0.X, center.Y - p0.Y)
			end
			TS:Create(seal, TweenInfo.new(0.55, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Position = target, Size = UDim2.fromOffset(28, 28), ImageTransparency = 0.4 }):Play()
			task.delay(0.6, function() if seal.Parent then seal:Destroy() end end)
		end)
	end
end

function playStory(ev)
	local overlay = Instance.new("Frame")
	overlay.Name = "StoryScene"
	if game:GetService("RunService"):IsStudio() then overlay:SetAttribute("StudioStoryId", tostring(ev.id)) end
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
	-- [연출씬 · 2026-11-24 오너] 퀘스트 장면은 일러스트 없이 실제 3D 세계를 카메라가 훑고,
	-- 목적지 항로·분위기 효과·수락 도장으로 연출한다. 그 밖의 사건은 기존 해도 연출.
	local liveScene = string.sub(tostring(ev.id or ""), 1, 6) == "quest_" and H.questCinematic ~= nil
	if liveScene then
		overlay.BackgroundTransparency = 1
		picture.BackgroundTransparency = 1
	end
	local recordHistory = if liveScene then H.questCinematic(picture, ev, overlay) else H.historyCinematic(picture, ev)

	-- [초상 원본 화질] 256폭 지역 아틀라스를 330px로 확장하지 않고 원본 이하로 표시한다.
	local storyViewport = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600)
	local portraitWidth = math.min(256, math.max(110, math.floor(storyViewport.Y * 0.56 * 0.76)))
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
		ph.Size = UDim2.new(0, portraitWidth, 1, -14)
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
		photo.Size = UDim2.new(0, portraitWidth, 1, -14)
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
		vf.Size = UDim2.new(0, portraitWidth, 1, -14)
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

	if liveScene then
		-- 초상은 오른쪽 아래로 비켜 실제 장면이 가운데 보이게 한다.
		for _, c in picture:GetChildren() do
			if c.Name == "NpcPortrait" or c:IsA("ViewportFrame") then
				c.AnchorPoint = Vector2.new(1, 1)
				c.Position = UDim2.new(1, -18, 1, 0)
				c.Size = UDim2.new(0, math.floor(portraitWidth * 0.8), 0.86, 0)
			end
		end
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
		if game:GetService("RunService"):IsStudio() then overlay:SetAttribute("StudioStoryChoices", #ev.choices) end
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
					recordHistory()
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
	-- [건너뛰기] 연출·대사를 건너뛰고 바로 선택지로. 한 번 본 장면은 다음부터 짧게 나온다.
	do
		local skip = Instance.new("TextButton")
		skip.Name = "StorySkip"
		skip.AnchorPoint = Vector2.new(1, 0)
		skip.Position = UDim2.new(1, -12, 0, 12)
		skip.Size = UDim2.fromOffset(112, 36)
		skip.BackgroundColor3 = Color3.fromRGB(24, 20, 16)
		skip.BackgroundTransparency = 0.25
		skip.Text = "건너뛰기 ▶▶"
		skip.Font = Enum.Font.GothamBold
		skip.TextSize = 16
		skip.TextColor3 = Color3.fromRGB(246, 222, 170)
		skip.ZIndex = 70
		skip.Parent = overlay
		corner(skip, 8)
		skip.Activated:Connect(function()
			skip:Destroy()
			if H.sceneSkip then pcall(H.sceneSkip) end
			if next.Parent then
				idx = #ev.lines
				advancing = true
				showChoices()
				advancing = false
			end
		end)
		H.seenScenes = H.seenScenes or {}
		H.seenScenes[tostring(ev.id)] = true
	end
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
-- [메뉴 중복 정리] 코인·선박 숫자는 상단 현황에 한 번만 표시한다.
-- 보급·수리·납품은 기존 서버 요청 그대로, 실제 실행할 일이 있을 때만 노출한다.
function H.walletBar(mode)
	local sh, sy = view.ship, view.shipyard
	local needCrew = math.max(0, sh.maxCrew - sh.crew)
	local needSup = math.max(0, (view.supplyMax or 100) - sh.supplies)
	local cost = needCrew * sy.hireCost + needSup * sy.supplyCost
	local turnIns = 0
	if mode == "tavern" then
		for _, q in view.quests.active do
			if q.kind == "deliver" and q.progress >= q.amount then turnIns += 1 end
		end
	end
	local repair = mode ~= "tavern" and (sy.missing or 0) > 0
	if cost <= 0 and turnIns == 0 and not repair then return end

	add(function()
		local f = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, 56), Color3.fromRGB(58, 42, 28))
		f.Name = "MenuQuickActions"
		corner(f, 8)
		local caption = mkLabel(f, "필요한 정비", 16, Color3.fromRGB(255, 231, 179), true)
		caption.Position = UDim2.fromOffset(10, 12)
		caption.Size = UDim2.new(0.28, -12, 0, 30)
		caption.AutomaticSize = Enum.AutomaticSize.None
		local buttons = {}
		if cost > 0 then
			table.insert(buttons, mkButton(f, string.format("보급·선원 채우기 %s코인", H.commas(cost)), COLORS.gold,
				UDim2.fromOffset(88, 48), function() call("Resupply", { what = "both" }) end, true))
		end
		if turnIns > 0 then
			table.insert(buttons, mkButton(f, string.format("의뢰 납품 %d건", turnIns), COLORS.green,
				UDim2.fromOffset(88, 48), function()
					task.spawn(function()
						for _, q in view.quests.active do
							if q.kind == "deliver" and q.progress >= q.amount then
								call("TurnIn", { questId = q.id })
							end
						end
					end)
				end, true))
		elseif repair then
			table.insert(buttons, mkButton(f, string.format("%s %s코인",
				if sy.field then "응급 수리" else "선체 수리", H.commas(sy.repairTotal or 0)),
				COLORS.green, UDim2.fromOffset(88, 48), function() call("Repair") end, true))
		end
		local function fitWallet()
			local width = f.AbsoluteSize.X
			if width <= 0 then return end
			local compact = width < 430
			caption.Visible = not compact
			local begin = if compact then 0 else 0.28
			for i, button in buttons do
				button.AnchorPoint = Vector2.zero
				button.Position = UDim2.new(begin + (i - 1) * (1 - begin) / #buttons, 5, 0, 4)
				button.Size = UDim2.new((1 - begin) / #buttons, -10, 0, 48)
				button.TextSize = 16
			end
		end
		f:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitWallet)
		task.defer(fitWallet)
		return f
	end)
end

function H.statStrip(items)
	local metricArt = { ["선체"] = "hull", ["화물"] = "cargo", ["화물칸"] = "cargo", ["명성"] = "fame", ["코인"] = "coin", ["보유 코인"] = "coin", ["승조원"] = "crew", ["승선 동료"] = "crew", ["동료"] = "crew", ["조건 잠금"] = "lock", ["잠긴 지점"] = "lock", ["오늘 보상"] = "gift", ["함대전"] = "war" }
	-- [전체 메뉴 공통 지표] 작은 화면은 2열로 나눠 수치가 잘리지 않게 한다.
	add(function()
		local strip = Instance.new("Frame")
		strip.Name = "MenuSummaryMetrics"
		strip.BackgroundTransparency = 1
		strip.Size = UDim2.new(1, -6, 0, 56)
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
			lb.TextSize = 14
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
			vl.TextSize = 20
			vl.TextXAlignment = Enum.TextXAlignment.Left
			vl.TextTruncate = Enum.TextTruncate.AtEnd
			vl.TextColor3 = H.TONE[it.tone or "key"] or INK
			vl.Text = it[2]
			vl.Parent = chip
			local key = metricArt[it[1]]
			if key and H.reserveIconAtlas[4] and H.hasIconArt(key) then
				local icon = modelIcon(chip, "FacilityArt", key, nil, 20, it[1])
				icon.Position = UDim2.fromOffset(6, 3)
				icon.Active = false
				lb.Position = UDim2.fromOffset(30, 4)
				lb.Size = UDim2.new(1, -38, 0, 16)
			end
		end
		local function fitStrip()
			local width = strip.AbsoluteSize.X
			if width <= 0 then return end
			local cols = if width < 460 and #items >= 3 then 2 else math.max(1, #items)
			local rows = math.ceil(#items / cols)
			lay.CellSize = UDim2.new(1 / cols, -6 * (cols - 1) / cols, 0, 56)
			local height = rows * 56 + (rows - 1) * 6
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
	-- [교역 재미] 상회 등급·축제 예고·라이벌 상단·희귀 화물·신상품 열풍
	local tf = view.tradeFun
	if tf then
		add(function() return mkHeader(content, "교역 소식") end)
		add(function()
			local rk = tf.rank
			local sub = if rk.nextName then string.format("누적 이익 %s / 다음 %s %s · 판매 +%d%% · 관세 -%d%%", tostring(rk.profit), rk.nextName, tostring(rk.nextNeed), rk.level, rk.level * 10)
				else string.format("누적 이익 %s · 최고 등급 · 판매 +%d%% · 관세 -%d%%", tostring(rk.profit), rk.level, rk.level * 10)
			local row = mkRow(content, "상회 등급 · " .. rk.name, sub, {}, 64)
			row.Name = "TradeFunRank"
			return row
		end)
		if tf.lot then
			add(function()
				local lot = tf.lot
				local sub = string.format("%d개 · 개당 %d코인 (총 %d) · %d일 남음\n%s 중 한 곳에 팔면 2.2배, 다른 곳은 손해",
					lot.qty, lot.unitPrice, lot.total, lot.untilIn, table.concat(lot.targets, "·"))
				local buttons = {}
				if not lot.bought then
					table.insert(buttons, { text = "통째로 사기", color = COLORS.gold, onClick = function() call("BuyRareLot", {}) end })
				end
				local row = mkRow(content, (if lot.bought then "희귀 화물 (구매함) · " else "희귀 화물 입고! · ") .. lot.good, sub, buttons, 82)
				row.Name = "TradeFunRareLot"
				return row
			end)
		end
		for _, r in tf.rare or {} do
			add(function()
				return mkRow(content, "싣고 있는 희귀 화물 · " .. r.good .. " " .. r.qty .. "개",
					string.format("%s에 팔면 2.2배 · %d일 남음", table.concat(r.targets, "·"), r.left), {}, 60)
			end)
		end
		if #(tf.festivals or {}) > 0 then
			add(function()
				local lines = {}
				for _, f in tf.festivals do
					table.insert(lines, if f.active then string.format("● %s 축제 중 (%d일 남음) · %s 수요 +60%%", f.port, f.endIn + 1, f.good)
						else string.format("○ %s 축제 %d일 뒤 · %s 수요 +60%%", f.port, f.inDays, f.good))
				end
				local row = mkRow(content, "항구 축제 예고", table.concat(lines, "\n"), {}, 28 + 20 * #lines)
				row.Name = "TradeFunFestivals"
				return row
			end)
		end
		if tf.rival then
			add(function()
				local rv = tf.rival
				local sub = if rv.arrived then string.format("%s의 %s 시장을 휩쓸었다 · %d일간 -15%%", rv.port, rv.good, math.max(0, rv.endIn) + 1)
					else string.format("%d일 뒤 %s에 %s를 풀 예정 · 먼저 팔면 +15%%", rv.inDays, rv.port, rv.good)
				local row = mkRow(content, "라이벌 상단 · " .. rv.name, sub, {}, 64)
				row.Name = "TradeFunRival"
				return row
			end)
		end
		if #(tf.crazes or {}) > 0 then
			add(function()
				local names = {}
				for _, c in tf.crazes do table.insert(names, string.format("%s(%d일)", c.good, c.left)) end
				return mkRow(content, "신상품 열풍 · 이 항구", table.concat(names, ", ") .. " · 판매 +12%", {}, 60)
			end)
		end
		add(function()
			return mkLabel(content, "팁: 이 항구 특산이 아닌 상품을 처음 팔면 '최초 수입' +25%, 이후 5일 열풍 +12%.", 14, COLORS.text, true)
		end)
	end
	add(function() return mkHeader(content, view.player.portName .. " · " .. h.name .. " (" .. h.level .. "단계)") end)
	add(function()
		return mkLabel(content, string.format("특산: %s\n수요: %s", table.concat(h.produces, ", "), table.concat(h.demands, ", ")), 16, COLORS.text, true)
	end)
	-- [국가·지도자·항구] 항구 주인 나라의 지도자·군사·연구와 이 항구의 문화권·입장·관세 (시뮬 표시 전용)
	if h.sim and h.sim.nation and h.sim.nation.lines then
		add(function() return mkHeader(content, "국가 · 지도자 · 항구 정보") end)
		add(function()
			return mkLabel(content, table.concat(h.sim.nation.lines, "\n"), 15, COLORS.text, true)
		end)
	end
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
		add(function()
			local heading = mkHeader(content, title)
			if title == "은행" then heading.Name = "BankEntry" end
			return heading
		end)
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
	local selected = nil
	for _, c in list do if c.id == H.recruitDetailId then selected = c; break end end
	if not selected then H.recruitDetailId = nil end
	if selected then
		add(function()
			return mkButton(content, "동료 목록", COLORS.leather, UDim2.new(1, -6, 0, 44), function()
				H.recruitDetailId = nil; render()
			end, true)
		end)
	end
	add(function() return mkHeader(content, if selected then "동료 상세" else "주점 동료") end)
	if #list == 0 then
		add(function() return mkLabel(content, "이 항구의 주점에는 영입할 동료가 없어요.", 14, COLORS.muted, true) end)
	end
	add(function()
		local tiles = {}
		for _, c in (if selected then { selected } else list) do
			local sub = if c.joined then string.format("합류 중 · 호감도 %d", c.affinity)
				else string.format("영입 %d코인 · 호감도 %d", c.fee, c.affinity)
			local desc = if c.blocked and not c.joined then c.blocked else c.summary
			local scholarId = string.match(c.id, "^c_(.+)$")
			local portrait = COMPANION_PORTRAIT[c.id]
			local tile: any = { title = string.format("[%s] %s", c.role, c.name), sub = sub, desc = if selected then desc else nil, icon = "status", affinity = c.affinity }
			if portrait then
				tile.portrait = { atlas = portrait.atlas, offset = portrait.offset }
			elseif scholarId and SCHOLAR_SKETCH and AssetIds["Portraits/scholar_" .. scholarId] then
				tile.portrait = { atlas = "scholar_" .. scholarId }
			elseif COMPANION_MODEL[c.id] then
				tile.kind, tile.icon = "People", COMPANION_MODEL[c.id]
			end
			if not selected then
				tile.btn, tile.color = "상세", COLORS.leather
				tile.onClick = function() H.recruitDetailId = c.id; render() end
			elseif c.joined then
				tile.btn, tile.color = "대화", COLORS.blue
				tile.onClick = function() call("Talk", { companionId = c.id }) end
				tile.btn2 = { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
			else
				tile.btn, tile.color, tile.enabled = "영입", COLORS.green, c.blocked == nil
				tile.onClick = function() call("Recruit", { companionId = c.id }) end
			end
			table.insert(tiles, tile)
		end
		return H.tileGrid(tiles, content, 190, 210, not selected)
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
		{ "직책 배치", tostring(filled) .. "/" .. tostring(#(view.companions.stations or {})), tone = "good" },
		{ "미배치", tostring(math.max(0, joined - filled)) .. "명", tone = if joined > filled then "bad" else "good" },
		{ "빈 직책", tostring(#(view.companions.stations or {}) - filled) .. "곳", tone = "key" },
	})
	add(function() return mkHeader(content, string.format("내 배 · 동료 자리 %d칸", view.companions.max)) end)
	add(function()
		local sh = view.ship
		local row = mkRow(content, sh.name, string.format("직책 %d개 · 적합 배치 %d명", #(view.companions.stations or {}), matched), {
			{ text = "직책 배치", color = COLORS.gold, onClick = function() H.openCabin() end },
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
		return mkLabel(content, "직책 일치 ×1.2 · 다른 직책 ×0.6" .. warn, 12, COLORS.muted, true)
	end)
	local stations = {}
	for _, st in view.companions.stations do if not st.seatId then table.insert(stations, st) end end
	for _, st in view.companions.stations do if st.seatId then table.insert(stations, st) end end
	for _, st in stations do
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
	local selected = nil
	for _, c in view.companions.list do if c.id == H.crewDetailId then selected = c; break end end
	if not selected then H.crewDetailId = nil end
	add(function() return mkHeader(content, if selected then "동료 상세" else "동료") end)
	if selected then
		add(function()
			return mkButton(content, "동료 목록", COLORS.leather, UDim2.new(1, -6, 0, 44), function()
				H.crewDetailId = nil; render()
			end, true)
		end)
	end
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
		for _, c in (if selected then { selected } else view.companions.list) do
			local tier = ({ "낯선 사이", "믿는 사이", "오랜 벗" })[c.tier]
			local tile: any = {
				title = c.name .. (if c.joined then " (합류)" else ""),
				sub = string.format("호감도 %d · %s", c.affinity, tier),
				desc = if selected then string.format("%s · 어울리는 자리 %s%s", c.summary, c.bestSeat, if c.blocked and not c.joined then " · " .. c.blocked else "") else nil,
				icon = "status", affinity = c.affinity,
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
			if not selected then
				tile.btn, tile.color = "상세", COLORS.leather
				tile.onClick = function() H.crewDetailId = c.id; render() end
			elseif c.joined then
				tile.btn, tile.color = "대화", COLORS.blue
				tile.onClick = function() call("Talk", { companionId = c.id }) end
				tile.btn2 = { text = "작별", color = COLORS.red, onClick = function() call("Dismiss", { companionId = c.id }) end }
			else
				tile.btn, tile.color, tile.enabled = string.format("영입 %d코인", c.fee), COLORS.green, c.blocked == nil
				tile.onClick = function() call("Recruit", { companionId = c.id }) end
			end
			table.insert(tiles, tile)
		end
		return H.tileGrid(tiles, content, 190, 210, not selected)
	end)
end

function RENDERERS.status()
	local p, ship = view.player, view.ship
	H.counselRows(1)
	add(function() return mkHeader(content, "선박") end)
	H.statStrip({
		{ "선체", string.format("%d/%d", ship.hull, ship.maxHull), tone = if ship.hull < ship.maxHull * 0.5 then "bad" else "good" },
		{ "화물", string.format("%d/%d", ship.cargoUsed, ship.cargoCapacity), tone = "key" },
		{ "명성", tostring(p.fame or 0), tone = "key" },
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

-- [프롤로그·시대 이야기] 교역 메뉴가 아니라 개인 저널의 이야기 기록에서만 표시한다.

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
  -- [시설 탭 정리] 탭의 상세 본문만 제거한다. 공통 시설 책은 그대로 둔다.
  local detail = mainInner:FindFirstChild("FacilityDetail")
  if detail then detail:Destroy() end
  tradeHallRefresh = nil
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
	-- [교역 탭] 기존 3열 교역 장부를 시설 책 본문에 사용한다.
	local root = Instance.new("Frame")
	root.Name = "FacilityDetail"
	root.BackgroundColor3 = Color3.fromRGB(34, 26, 20)
	root.BorderSizePixel = 0
	root.ClipsDescendants = true
	root.Parent = mainInner
	H.layoutBook()
	local lastScroll, detailScroll = 0, 0
	local detailOpen = false
	local query = ""

	local function build()
		if not root.Parent or not view then
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
		local narrow = width < 920
        -- [작은 가로폰] 헤더와 고정 거래판을 줄여 읽을 수 있는 장부 공간을 확보한다.
        local shortScreen = root.AbsoluteSize.Y > 0 and root.AbsoluteSize.Y < 530
		local showMerchant = width >= 1550
		local inset = if showMerchant then 258 else 8
		local availableW = width - inset - 16
		local listWidth = if narrow then availableW else math.max(185, math.floor(availableW * 0.24))
		local detailWidth = if narrow then availableW else math.max(270, math.floor(availableW * 0.34))
		local heroX = inset + listWidth + 4
		local heroW = math.max(140, availableW - listWidth - detailWidth - 8)
		local compactList = not narrow or listWidth < 420
		-- [교역 장부] 목록 24% · 승인 원화·백과 약 42% · 판단 수치·거래 약 34%. 세로는 목록/상세 전환.
		-- [교역 머리줄] 공통 머리줄의 시설·항구 이름을 반복하지 않는다.
		-- 자금·최근 메뉴 한 줄, 실제 거래 결과나 목록 복귀가 있을 때만 두 번째 줄.
		local backToList = narrow and detailOpen
		local headH = if backToList or message ~= "" then 100 else 50
		local menuY = headH + 12

		-- 윗줄: 항구 이름, 코인, 화물칸, 나가기
		local top = mkBox(root, UDim2.fromOffset(8, 8), UDim2.new(1, -16, 0, headH), COLORS.paper)
		corner(top, 6)
		bookMaterial(top, "parchment", 220)
		-- [교역 상단] 자금과 직전 메뉴를 이웃한 한 줄로 배치하고 거래 안내 중복은 숨긴다.
		-- [교역소] 자금·화물과 최근 메뉴를 중앙 한 줄에 나란히, 같은 높이로 둔다.
		local recent = H.recentTab
		local showRecent = recent and TAB_NAME[recent] ~= nil and groupOf(recent) ~= groupOf("trade")
		local recentWidth = if width < 330 then 84 elseif narrow then 104 else 136
		local cashWidth = if narrow then math.max(110, math.min(274, width - (if showRecent then recentWidth + 44 else 40)))
			else math.clamp(math.floor(width * 0.36), 220, 315)
		local groupWidth = cashWidth + (if showRecent then recentWidth + 8 else 0)
		local groupX = math.max(8, math.floor((width - 16 - groupWidth) / 2))
		local rowY = 4
		local commonStatus = mkLabel(top, H.statusMoneyCargo(p, ship, narrow), if narrow then 15 else 18, INK, true)
		commonStatus.Name = "TradeGlobalMoneyCargo"
        -- [교역 자금] 황동 테두리로 상단의 거래 자금을 별도 현판 처리.
        commonStatus.BackgroundColor3 = PARCHMENT_TOP
        commonStatus.BackgroundTransparency = 0.08
        corner(commonStatus, 5)
        local moneyEdge = Instance.new("UIStroke")
        moneyEdge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        moneyEdge.Color = UI_BRASS_DARK
        moneyEdge.Thickness = 1.4
        moneyEdge.Parent = commonStatus
        commonStatus.AnchorPoint = Vector2.zero
		commonStatus.Position = UDim2.fromOffset(groupX, rowY)
		commonStatus.Size = UDim2.fromOffset(cashWidth, 44)
		commonStatus.AutomaticSize = Enum.AutomaticSize.None
		commonStatus.TextTruncate = Enum.TextTruncate.AtEnd
		commonStatus.TextXAlignment = Enum.TextXAlignment.Center
		commonStatus.TextYAlignment = Enum.TextYAlignment.Center
		if showRecent then
			local recentBtn = mkButton(top, "← " .. groupOf(recent).name, COLORS.leather,
				UDim2.fromOffset(recentWidth, 44), function()
					closeTradeHall()
					openTab(recent, if recent == "map" then "chart" else nil)
				end, true)
			recentBtn.Name = "TradeRecentFacility"
			recentBtn.TextSize = if width < 330 then 13 else 15
			recentBtn.Position = UDim2.fromOffset(groupX + cashWidth + 8, rowY)
		end
		-- [중복 설명 제거] 조언은 저널에서, 거래 알림은 결과가 있을 때만 보여 준다.
		local toastLbl = mkLabel(top, message, 15, INK_SOFT, true)
		toastLbl.Visible = message ~= ""
		toastLbl.Position = UDim2.fromOffset(12, 52)
		toastLbl.Size = UDim2.new(1, if backToList then -108 else -24, 0, 44)
		toastLbl.AutomaticSize = Enum.AutomaticSize.None
		toastLbl.TextWrapped = true
		toastLbl.TextTruncate = Enum.TextTruncate.AtEnd
		local leave = mkButton(top, if backToList then "목록" else "닫기", COLORS.leather, UDim2.fromOffset(78, 44), function()
			if backToList then
				detailOpen = false
				build()
			else
				closeTradeHall()
				main.Visible = false
				menuToggle.Visible = true
			end
		end, true)
		leave.AnchorPoint = Vector2.new(1, 0.5)
		leave.Position = UDim2.new(1, -9, 0, 74)
		-- [닫기 중복 제거] 시설 책 오른쪽 위 X가 이미 닫기를 맡는다. 좁은 화면의 "목록"만 남긴다.
		leave.Visible = backToList

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
		list.Position = UDim2.fromOffset(inset, menuY + (if compactList then 150 else 98))
		list.Size = UDim2.new(0, listWidth, 1, -menuY - (if compactList then 158 else 106))
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
		search.Size = UDim2.new(0, listWidth, 0, 42)
		search.BackgroundColor3 = COLORS.paper
		search.BorderSizePixel = 0
		search.TextColor3 = INK
		search.PlaceholderColor3 = INK_SOFT
		search.TextXAlignment = Enum.TextXAlignment.Left
		search.Font = Enum.Font.GothamMedium
		search.TextSize = 17
		search.ClearTextOnFocus = false
		search.PlaceholderText = "상품 이름·분류 검색"
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
		-- [세계 백과] 기존 서버 자원·발견 지식만 읽는다. 미발견 내용은 노출하지 않는다.
		local bookResource, bookCard = nil, nil
		if sel then
			for _, resource in ((view.codex and view.codex.resources) or {}) do
				if resource.id == sel.id then bookResource = resource; break end
			end
			if bookResource and bookResource.cardId then
				for _, card in ((view.codex and view.codex.cards) or {}) do
					if card.id == bookResource.cardId and card.found == true then bookCard = card; break end
				end
			end
		end
		local bookSummary = if sel and sel.id == "coal" then
			"석탄은 오래된 식물이 퇴적돼 오랜 시간 열과 압력을 받아 형성된 탄소질 화석 연료야. 증기선과 제련 산업의 열원으로 사용돼."
			else (sel and sel.purpose or "항구에서 거래하는 상품")
		if bookResource then
			bookSummary ..= "\n분류 " .. (bookResource.categoryName or sel.category or "교역품")
				.. " · 학문 " .. (bookResource.discipline or "미분류")
			if bookResource.origin then bookSummary ..= "\n원산지 " .. bookResource.origin end
			if bookResource.appliedDiscipline then bookSummary ..= " · 가공 " .. bookResource.appliedDiscipline end
			if bookResource.chain then
				bookSummary ..= "\n생산·가공 " .. tostring(bookResource.chain.raw or "원료")
					.. " → " .. tostring(bookResource.chain.processed or "가공품")
			end
		end
		if bookCard and type(bookCard.description) == "string" and bookCard.description ~= "" then
			bookSummary ..= "\n발견 지식: " .. bookCard.description
		elseif bookResource and bookResource.cardId then
			bookSummary ..= "\n연관 지식은 서재에서 발견하면 읽을 수 있어."
		else
			bookSummary ..= "\n백과 기록은 학자의 서재에서 이어 볼 수 있어."
		end
		-- [원화 클릭] 발견한 상품 지식은 해당 장으로, 미발견 상품은 기존 자원 백과로 간다.
		local function openSelectedGoodEncyclopedia()
			if not sel then return end
			H.tradeBookGood = sel.id
			if bookCard then
				H.galleryBookOpenRequested = bookCard.id
			else
				H.tradeBookOpenRequested = true
			end
			closeTradeHall()
			openTab("codex")
		end
		-- [기존 시세 함수] 서버의 실제 1개 가격은 기존 흥정 이월 할인까지 포함한다.
		local function unitBuyOf(g)
			return if g.buyTotals and g.buyTotals[1] then g.buyTotals[1] else g.buy
		end
		do
			-- 걸러 보기 칩 + 보유 전부 팔기 (일괄)
			local chips = mkBox(root, UDim2.fromOffset(inset, menuY + 46), UDim2.new(0, listWidth, 0, if compactList then 96 else 46), Color3.fromRGB(34, 26, 20))
			chips.BackgroundTransparency = 1
			chips.Visible = list.Visible
			local cl = Instance.new("UIListLayout")
			cl.FillDirection = Enum.FillDirection.Horizontal
			cl.Padding = UDim.new(0, 5)
			if not compactList then cl.Parent = chips end
			local chipIndex = 0
			local function chip(id, text)
				local c = mkButton(chips, text, if H.hallFilter == id then COLORS.gold else COLORS.paper, if compactList then UDim2.new(0.25, -4, 0, 44) else UDim2.new(0.17, -4, 1, 0), function()
					H.hallFilter = id
					build()
				end)
				-- [교역 필터] 활성화된 분류는 황동 책갈피로 표식한다.
                c.Name = "TradeFilter_" .. id
                c:SetAttribute("SelectedFilter", H.hallFilter == id)
                if H.hallFilter == id then
                    local selectedRule = Instance.new("Frame")
                    selectedRule.Name = "SelectedFilterRule"
                    selectedRule.BackgroundColor3 = UI_BRASS_DARK
                    selectedRule.BorderSizePixel = 0
                    selectedRule.Position = UDim2.new(0, 8, 1, -5)
                    selectedRule.Size = UDim2.new(1, -16, 0, 3)
                    selectedRule.ZIndex = c.ZIndex + 3
                    selectedRule.Parent = c
                end
                c.TextSize = 16
				if compactList then c.Position = UDim2.new(chipIndex * 0.25, 2, 0, 0) end
				chipIndex += 1
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
			local sellAll = mkButton(chips, if narrow then "일괄 판매" else string.format("보유 전부 팔기 (+%d)", ownedValue), COLORS.green, if compactList then UDim2.new(1, -4, 0, 44) else UDim2.new(0.32, -4, 1, 0), function()
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
			sellAll.TextSize = 16
			if compactList then sellAll.Position = UDim2.fromOffset(2, 50) end
		end
		-- [교역품 정렬 복구] 기존 싼 순·판매이익·보유순·이름순을 교역 장부 목록 위에 그대로 둔다.
		H.tradeSort = H.tradeSort or "price"
		local sortBar = Instance.new("Frame")
		sortBar.Name = "TradeSort"
		sortBar.BackgroundTransparency = 1
		sortBar.Size = UDim2.new(1, -8, 0, 42)
		sortBar.LayoutOrder = -1
		sortBar.Parent = list
		for i, spec in { { "싼 순", "price" }, { "판매이익", "profit" }, { "보유순", "owned" }, { "이름순", "name" } } do
			local key = spec[2]
			local button = mkButton(sortBar, spec[1], if H.tradeSort == key then COLORS.gold else COLORS.paper,
				UDim2.new(0.25, -4, 0, 38), function()
					H.tradeSort = key
					list.CanvasPosition = Vector2.zero
					build()
				end, true)
			button.Position = UDim2.new((i - 1) * 0.25, 2, 0, 0)
			button.TextSize = 13
		end
		local sortedGoods = table.clone(goods)
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
		local indexed = {}
		for i, g in (if list.Visible then sortedGoods else {}) do
			local show = H.hallFilter == "all" or (H.hallFilter == "specialty" and g.tag == "특산") or (H.hallFilter == "demand" and g.tag == "수요") or (H.hallFilter == "owned" and g.owned > 0)
			if not show then
				continue
			end
			local row = Instance.new("TextButton")
			row.Text = ""
			row.LayoutOrder = i
			-- [물품 목록] 거래 정보·보유 손익·특산 도장이 서로 침범하지 않도록 아래 여백을 넓힌다.
            row.Size = UDim2.new(1, -8, 0, 204)
            row:SetAttribute("SelectedGood", g.id == hallGood)
			row.BackgroundColor3 = if g.id == hallGood then Color3.fromRGB(236, 210, 156) else COLORS.paper
			row.BorderSizePixel = 0
			row.AutoButtonColor = true
			corner(row, 10)
			row.Parent = list
			table.insert(indexed, { name = string.lower(g.name .. " " .. (g.category or "") .. " " .. (g.purpose or "")), row = row })
			local rule = Instance.new("UIStroke")
			rule.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			rule.Color = if g.id == hallGood then UI_BRASS_DARK else INK_EDGE
            rule.Thickness = if g.id == hallGood then 2.4 else 1
            rule.Parent = row
            -- [선택한 물품] 페이지 가장자리의 황동 책갈피로 표시한다.
            if g.id == hallGood then
                local mark = Instance.new("Frame")
                mark.Name = "SelectedGoodBookmark"
                mark.BackgroundColor3 = UI_BRASS_DARK
                mark.BorderSizePixel = 0
                mark.Position = UDim2.fromOffset(2, 8)
                mark.Size = UDim2.new(0, 5, 1, -16)
                mark.Parent = row
            end
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
			-- [교역품 2D] 승인된 큰 원화 우선. 표현 제한 화물의 중립 외형은 바꾸지 않는다.
			if AssetIds["Goods/" .. g.id] and not RESTRICTED_CARGO_ICON[g.id]
				and not (gi and gi[1] == "Cargo" and gi[2] == "barrel") then gi = { "Goods", g.id } end
			local listArtId = AssetIds["Goods/" .. g.id]
			local listPx = if listWidth < 230 then 82 else 102
			local icon
			if listArtId and not RESTRICTED_CARGO_ICON[g.id] and not (gi and gi[1] == "Cargo" and gi[2] == "barrel") then
				-- [상품 사진] 원본 512px 승인 원화를 102px로 선명하게 표시한다.
				icon = Instance.new("ImageLabel")
				icon.Name = "TradeIndexArt"
				icon.Image = "rbxassetid://" .. tostring(listArtId)
				icon.ScaleType = Enum.ScaleType.Fit
				icon.BackgroundTransparency = 1
				icon.Size = UDim2.fromOffset(listPx, listPx)
				icon.Parent = row
			else
				icon = if gi then modelIcon(row, gi[1], gi[2], gi[3], listPx, g.name, gi[4]) else modelIcon(row, nil, nil, nil, listPx, g.name)
			end
			icon.Position = UDim2.fromOffset(8, 8)
			local indicator, pct = H.marketPriceSignal(g)
			local nm = mkLabel(row, g.name .. (if g.upgraded then " (신상)" else "") .. (if g.cheaper then " (할인)" else "") .. (if g.scarcity and ladderHas("goods", "scarcity") then " 〔" .. g.scarcity .. "〕" else ""), 19, INK, true)
			nm.RichText = true
			nm.Text = '<font color="' .. (if pct > 0.5 then "#B12F39" elseif pct < -0.5 then "#236BAC" else "#655849") .. '"><b>' .. indicator .. '</b></font> ' .. nm.Text
			nm.Position = UDim2.fromOffset(listPx + 16, 8)
			nm.Size = UDim2.new(1, -listPx - 22, 0, 44)
			nm.TextSize = 18
			nm.TextWrapped = true
			nm.TextTruncate = Enum.TextTruncate.AtEnd
			nm.AutomaticSize = Enum.AutomaticSize.None
			-- [상품 시세 시각화] 세계 평균을 중앙 기준선으로 쓰는 실제 가격 차이 막대.
			if (tonumber(g.avgPrice) or tonumber(g.basePrice) or 0) > 0 then
				local track = Instance.new("Frame")
				track.Name = "TradeIndexPriceMeter"
				track.Position = UDim2.fromOffset(10, 136)
				track.Size = UDim2.new(1, if g.lock or (g.tag and g.tag ~= "") then -98 else -20, 0, 7)
				track.BackgroundColor3 = Color3.fromRGB(199, 181, 151)
				track.BorderSizePixel = 0
				track.Parent = row
				corner(track, 3)
				local fill = Instance.new("Frame")
				fill.BackgroundColor3 = if pct > 0.5 then Color3.fromRGB(177, 47, 57) else Color3.fromRGB(35, 107, 177)
				fill.BorderSizePixel = 0
				fill.AnchorPoint = Vector2.new(if pct < 0 then 1 else 0, 0)
				fill.Position = UDim2.fromScale(0.5, 0)
				fill.Size = UDim2.fromScale(math.min(math.abs(pct) / 100, 0.5), 1)
				fill.Parent = track
				local center = Instance.new("Frame")
				center.BackgroundColor3 = INK
				center.BorderSizePixel = 0
				center.Position = UDim2.new(0.5, -1, 0, 0)
				center.Size = UDim2.new(0, 2, 1, 0)
				center.Parent = track
			end
			local profit = H.tradeProfit(g, 1)
			local profitText = if profit == nil then "세후손익 미확인"
				elseif profit >= 0 then "세후 이익 +" .. H.commas(profit) else "세후 손실 -" .. H.commas(-profit)
			local budgetQty = 0
			for n = 1, if g.lock then 0 else math.min(20, view.orderCap or 20, free0, g.supply or 20) do
				local cost = if g.buyTotals and g.buyTotals[n] then g.buyTotals[n] else unitBuyOf(g) * n
				if cost <= p.coins then budgetQty = n end
			end
			-- [교역품 읽기 순서] 가격 → 세계 평균 화살표 → 세후 손익 → 현재 보유·구매 가능.
			-- [상품 목록] 가격만 짧게, 이익·보유는 아랫줄로 분리한다.
			local priceText = string.format("매입 %s\n판매 %s\n재고 %s",
				H.commas(unitBuyOf(g)), H.commas(g.sell), H.commas(g.supply or 0))
			local pr = mkLabel(row, priceText, 17, INK, false)
			pr.RichText = true
			pr.Text = priceText:gsub("▲", '<font color="#B12F39"><b>▲</b></font>'):gsub("▼", '<font color="#236BAC"><b>▼</b></font>')
			pr.TextWrapped = true
			pr.Position = UDim2.fromOffset(listPx + 16, 55)
			pr.Size = UDim2.new(1, -listPx - 22, 0, 70)
			pr.TextSize = if listWidth < 230 then 15 else 17
			pr.AutomaticSize = Enum.AutomaticSize.None
			local ownedLine = mkLabel(row,
				string.format("보유 %d개 · %s\n%s", g.owned, if g.lock then "구매 잠김" else "구매 가능 " .. tostring(budgetQty) .. "개", profitText), 16, if profit and profit < 0 then COLORS.red elseif profit and profit > 0 then Color3.fromRGB(38, 111, 60) else INK_SOFT, true)
			ownedLine.Position = UDim2.fromOffset(10, 147)
            ownedLine.Size = UDim2.new(1, -20, 0, 50)
            ownedLine.TextWrapped = true
            ownedLine.TextSize = if listWidth < 230 then 14 else 16
			ownedLine.AutomaticSize = Enum.AutomaticSize.None
			ownedLine.TextTruncate = Enum.TextTruncate.AtEnd
			if g.lock or (g.tag and g.tag ~= "") then
				local badge = Instance.new("TextLabel")
				badge.Name = "TradeAccessBadge"
				badge.Text = if g.lock then tostring(g.lock.tierName or "특산") .. " 잠김" else g.tag
				badge.TextSize = 13
				badge.Font = Enum.Font.GothamBold
				badge.TextColor3 = if g.lock then Color3.fromRGB(255, 235, 217) else INK
				badge.BackgroundColor3 = if g.lock then Color3.fromRGB(126, 54, 42) elseif g.tag == "특산" then Color3.fromRGB(216, 197, 143) else Color3.fromRGB(236, 201, 139)
				badge.Size = UDim2.fromOffset(82, 26)
				badge.AnchorPoint = Vector2.new(1, 0)
				badge.Position = UDim2.new(1, -10, 0, 117)
				badge.TextTruncate = Enum.TextTruncate.AtEnd
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

		-- [중앙] 승인 원화와 세계 백과를 한 장의 책처럼 이어 읽는다.
		if sel and not narrow then
			local exhibit = mkBox(root, UDim2.fromOffset(heroX, menuY),
				UDim2.new(0, heroW, 1, -menuY - 8), Color3.fromRGB(230, 209, 171))
			exhibit.Name = "TradeEncyclopediaGallery"
			exhibit.ClipsDescendants = true
			corner(exhibit, 8)
			bookMaterial(exhibit, "parchment", 220)
			local pages = Instance.new("ScrollingFrame")
			pages.Name = "TradeEncyclopediaPages"
			pages.Size = UDim2.fromScale(1, 1)
			pages.BackgroundTransparency = 1
			pages.BorderSizePixel = 0
			pages.ScrollBarThickness = 4
			pages.ScrollingDirection = Enum.ScrollingDirection.Y
			pages.Parent = exhibit
			local heroPx = math.floor(math.clamp(heroW - 22, 164, 380))
			local heroH = math.floor(heroPx * 10 / 7)
			local artId = AssetIds["Goods/" .. sel.id]
			local gi = GOOD_ICON[sel.id]
			if artId and not RESTRICTED_CARGO_ICON[sel.id] and not (gi and gi[1] == "Cargo" and gi[2] == "barrel") then
				-- [실제 등록 2D] 512px 원본을 480px 이하 Fit으로 표시해 확대 흐림을 피한다.
				local art = Instance.new("ImageLabel")
				art.Name = "TradeHighResArt"
				art.Size = UDim2.fromOffset(heroPx, heroH)
				art.AnchorPoint = Vector2.new(0.5, 0)
				art.Position = UDim2.new(0.5, 0, 0, 32)
				art.Image = "rbxassetid://" .. tostring(artId)
				art.ScaleType = Enum.ScaleType.Fit
				art.BackgroundTransparency = 1
				art.Parent = pages
			else
				local icon = if gi then modelIcon(pages, gi[1], gi[2], gi[3], heroPx, sel.name, gi[4])
					else modelIcon(pages, nil, nil, nil, heroPx, sel.name)
				icon.Size = UDim2.fromOffset(heroPx, heroH)
				icon.AnchorPoint = Vector2.new(0.5, 0)
				icon.Position = UDim2.new(0.5, 0, 0, 32)
			end
			local artTap = Instance.new("TextButton")
			artTap.Name = "TradeArtToCodex"
			artTap.Text = ""
			artTap.BackgroundTransparency = 1
			artTap.BorderSizePixel = 0
			artTap.AutoButtonColor = false
			artTap.Size = UDim2.fromOffset(heroPx, heroH)
			artTap.AnchorPoint = Vector2.new(0.5, 0)
			artTap.Position = UDim2.new(0.5, 0, 0, 32)
			artTap.ZIndex = 8
			artTap.Parent = pages
			artTap.Activated:Connect(openSelectedGoodEncyclopedia)
			local ribbon = mkLabel(pages, "세계 교역 · 산업 백과 · 원화 터치 시 이동", 17, INK_SOFT, true)
			ribbon.Position = UDim2.fromOffset(12, 6)
			ribbon.Size = UDim2.new(1, -24, 0, 25)
			ribbon.AutomaticSize = Enum.AutomaticSize.None
			local title = mkLabel(pages, sel.name .. (if sel.tag ~= "" then " · " .. sel.tag else ""), 22, INK, true)
			title.Position = UDim2.fromOffset(12, heroH + 40)
			title.Size = UDim2.new(1, -24, 0, 35)
			title.AutomaticSize = Enum.AutomaticSize.None
			title.TextXAlignment = Enum.TextXAlignment.Center
			local sheet = mkBox(pages, UDim2.fromOffset(10, heroH + 86),
				UDim2.new(1, -20, 0, 250), COLORS.paper)
			sheet.Name = "TradeBookPage"
			corner(sheet, 6)
			bookMaterial(sheet, "parchment", 180)
			local heading = mkLabel(sheet, "제1장 · " .. (bookResource and bookResource.categoryName or sel.category or "교역품"),
				18, INK, true)
			heading.Position = UDim2.fromOffset(10, 8)
			heading.Size = UDim2.new(1, -20, 0, 28)
			heading.AutomaticSize = Enum.AutomaticSize.None
			local story = mkLabel(sheet, bookSummary, 17, INK_SOFT, false)
			story.Position = UDim2.fromOffset(12, 42)
			story.Size = UDim2.new(1, -24, 0, 148)
			story.AutomaticSize = Enum.AutomaticSize.None
			story.TextWrapped = true
			story.TextTruncate = Enum.TextTruncate.AtEnd
			story.TextYAlignment = Enum.TextYAlignment.Top
			local openBook = mkButton(sheet, "서재 백과사전에서 읽기", COLORS.blue,
				UDim2.new(1, -24, 0, 46), openSelectedGoodEncyclopedia, true)
			openBook.Position = UDim2.fromOffset(12, 198)
			pages.CanvasSize = UDim2.fromOffset(0, heroH + 350)
		end

		-- 오른쪽: 선택한 물품의 거래 상자
		local detail = Instance.new("ScrollingFrame")
		detail.Name = "TradeSpecimen"
		detail.Position = if narrow then UDim2.fromOffset(8, menuY) else UDim2.fromOffset(width - detailWidth - 8, menuY)
		detail.Size = if narrow then UDim2.new(1, -16, 1, -menuY - 8) else UDim2.new(0, detailWidth, 1, -menuY - 8)
		if sel then detail.Size = detail.Size - UDim2.fromOffset(0, if shortScreen then 158 else 190) end
		detail.BackgroundColor3 = COLORS.paper
		detail.BorderSizePixel = 0
		detail.ScrollBarThickness = 4
		local bigPx = if narrow then math.floor(math.min(width - 54, math.max(170, root.AbsoluteSize.Y * 0.48), 330)) else 0
		local bigH = math.floor(bigPx * 10 / 7)
		-- [모바일 세로] 원화는 카드배틀과 같은 7:10, 원본 이미지는 Fit으로 읽는다.
		local infoTop = 80
		local articleTop = infoTop + 812
		local detailHeight = articleTop + (if narrow then bigH + 242 else 0)
		detail.CanvasSize = UDim2.fromOffset(0, detailHeight)
		detail.ScrollingDirection = Enum.ScrollingDirection.Y
		detail.Visible = not narrow or detailOpen
		detail.Parent = root
		corner(detail, 7)
		local right = mkBox(detail, UDim2.fromOffset(0, 0), UDim2.new(1, -6, 0, detailHeight), COLORS.paper)
		bookMaterial(right, "parchment", 220)
		if sel and detail.Visible then
			local gi = GOOD_ICON[sel.id]
			if AssetIds["Goods/" .. sel.id] and not RESTRICTED_CARGO_ICON[sel.id]
				and not (gi and gi[1] == "Cargo" and gi[2] == "barrel") then gi = { "Goods", sel.id } end
			local detailIcon, diff = H.marketPriceSignal(sel)
			local hn = mkLabel(right, sel.name, 22, INK, true)
			hn.RichText = true
			hn.Text = '<font color="' .. (if diff > 0.5 then "#B12F39" elseif diff < -0.5 then "#236BAC" else "#655849") .. '"><b>' .. detailIcon .. '</b></font> ' .. hn.Text
			hn.Position = UDim2.fromOffset(12, 8)
			hn.Size = UDim2.new(1, -24, 0, 30)
			hn.AutomaticSize = Enum.AutomaticSize.None
			local note = (sel.category or "교역품") .. " · " .. (sel.purpose or "항구 간 판매")
			local hnote = mkLabel(right, note, 16, INK_SOFT, false)
			hnote.Position = UDim2.fromOffset(12, 42)
			hnote.Size = UDim2.new(1, -24, 0, 38)
			hnote.AutomaticSize = Enum.AutomaticSize.None
			if narrow then
				local artId = AssetIds["Goods/" .. sel.id]
				local big
				if artId and not RESTRICTED_CARGO_ICON[sel.id] and not (gi and gi[1] == "Cargo" and gi[2] == "barrel") then
					big = Instance.new("ImageLabel")
					big.Name = "TradeHighResArt"
					big.Image = "rbxassetid://" .. tostring(artId)
					big.ScaleType = Enum.ScaleType.Fit
					big.Size = UDim2.fromOffset(bigPx, bigH)
					big.BackgroundTransparency = 1
					big.Parent = right
				else
					big = if gi then modelIcon(right, gi[1], gi[2], gi[3], bigPx, sel.name, gi[4])
						else modelIcon(right, nil, nil, nil, bigPx, sel.name)
				end
				big.Size = UDim2.fromOffset(bigPx, bigH)
				big.AnchorPoint = Vector2.new(0.5, 0)
				big.Position = UDim2.new(0.5, 0, 0, articleTop + 8)
				local artTap = Instance.new("TextButton")
				artTap.Name = "TradeArtToCodex"
				artTap.Text = ""
				artTap.BackgroundTransparency = 1
				artTap.BorderSizePixel = 0
				artTap.AutoButtonColor = false
				artTap.Size = UDim2.fromOffset(bigPx, bigH)
				artTap.AnchorPoint = Vector2.new(0.5, 0)
				artTap.Position = UDim2.new(0.5, 0, 0, articleTop + 8)
				artTap.ZIndex = 8
				artTap.Parent = right
				artTap.Activated:Connect(openSelectedGoodEncyclopedia)
				local sheet = mkBox(right, UDim2.fromOffset(12, articleTop + bigH + 20),
					UDim2.new(1, -24, 0, 148), COLORS.paper)
				sheet.Name = "TradeBookPage"
				bookMaterial(sheet, "parchment", 180)
				local summaryTitle = mkLabel(sheet, "세계 백과 · " .. sel.name, 18, INK, true)
				summaryTitle.Position = UDim2.fromOffset(8, 5)
				summaryTitle.Size = UDim2.new(1, -16, 0, 25)
				summaryTitle.AutomaticSize = Enum.AutomaticSize.None
				local summary = mkLabel(sheet, bookSummary, 17, INK_SOFT, false)
				summary.Position = UDim2.fromOffset(8, 32)
				summary.Size = UDim2.new(1, -16, 0, 70)
				summary.AutomaticSize = Enum.AutomaticSize.None
				summary.TextWrapped = true
				summary.TextTruncate = Enum.TextTruncate.AtEnd
				local openBook = mkButton(sheet, "서재 백과사전", COLORS.blue, UDim2.new(1, -16, 0, 44),
					openSelectedGoodEncyclopedia, true)
				openBook.Position = UDim2.fromOffset(8, 106)
			end
			local qty = math.clamp(hallQty, 1, 20)
			local free = ship.cargoCapacity - ship.cargoUsed
			local deal = view.haggle and view.haggle.deal
			local dealPct = (deal and deal.goodId == sel.id) and deal.pct or 0
			local unitBuy = unitBuyOf(sel)
			-- [실제 수량 한도] 상품을 살수록 단가가 오르므로 단가×수량 추정으로 구매를 허용하지 않는다.
			local maxBuy = 0
			for n = 1, if sel.lock then 0 else math.min(20, view.orderCap or 20, free, sel.supply or 20) do
				local cost = if sel.buyTotals and sel.buyTotals[n] then sel.buyTotals[n] else unitBuy * n
				if cost <= p.coins then maxBuy = n end
			end
			local maxSell = math.min(20, view.orderCap or 20, sel.owned, sel.absorb or 20)
			local basis = if (sel.basis or 0) > 0 then H.commas(math.floor(sel.basis + 0.5)) else "미구매"
			local profit = H.tradeProfit(sel, 1)
			local profitText = if profit == nil then "미보유"
				elseif profit >= 0 then "+" .. H.commas(profit) else "-" .. H.commas(-profit)
			-- [교역 핵심] 실제 서버 매입·판매가 → 세계 평균 비교 → 현재 보유·세후손익.
			-- [교역 판단] 실제 서버 단가·세계 평균·세후손익을 큰 숫자로 분리한다.
			local prices = mkBox(right, UDim2.fromOffset(10, infoTop),
				UDim2.new(1, -20, 0, 94), Color3.fromRGB(61, 48, 34))
			prices.Name = "TradeDecisionPrices"
			corner(prices, 7)
			local buyPrice = mkLabel(prices, "매입가\n" .. H.commas(unitBuy) .. "코인",
				22, Color3.fromRGB(255, 226, 135), true)
			buyPrice.Position = UDim2.fromOffset(8, 5)
			buyPrice.Size = UDim2.new(0.5, -10, 0, 58)
			buyPrice.AutomaticSize = Enum.AutomaticSize.None
			buyPrice.TextWrapped = true
			local sellPrice = mkLabel(prices, "판매가\n" .. H.commas(sel.sell) .. "코인",
				22, Color3.fromRGB(246, 217, 161), true)
			sellPrice.Position = UDim2.new(0.5, 4, 0, 5)
			sellPrice.Size = UDim2.new(0.5, -12, 0, 58)
			sellPrice.AutomaticSize = Enum.AutomaticSize.None
			sellPrice.TextWrapped = true
			-- [매입·판매 비교] 동일 기준의 막대 길이로 실제 서버 단가를 비교한다.
			local priceMax = math.max(1, unitBuy, sel.sell)
			for index, value in { unitBuy, sel.sell } do
				local track = Instance.new("Frame")
				track.Name = if index == 1 then "TradeBuyMeter" else "TradeSellMeter"
				track.Position = UDim2.new((index - 1) * 0.5, 8, 0, 72)
				track.Size = UDim2.new(0.5, -16, 0, 10)
				track.BackgroundColor3 = Color3.fromRGB(91, 75, 55)
				track.BorderSizePixel = 0
				track.Parent = prices
				corner(track, 4)
				local fill = Instance.new("Frame")
				fill.Size = UDim2.fromScale(math.clamp(value / priceMax, 0, 1), 1)
				fill.BackgroundColor3 = if index == 1 then UI_BRASS else Color3.fromRGB(112, 161, 123)
				fill.BorderSizePixel = 0
				fill.Parent = track
				corner(fill, 4)
			end
			local average = tonumber(sel.avgPrice) or tonumber(sel.basePrice) or 0
			local meanStatus = if average <= 0 then "세계 평균 자료 없음" elseif diff > 0.5 then string.format("▲ 평균보다 %.1f%% 비쌈", diff)
				elseif diff < -0.5 then string.format("▼ 평균보다 %.1f%% 저렴", -diff)
				else "－ 세계 평균과 비슷함"
			local meanLabel = mkLabel(right, meanStatus, 23,
				if diff > 0.5 then Color3.fromRGB(177, 47, 57)
					elseif diff < -0.5 then Color3.fromRGB(35, 107, 177) else INK_SOFT, true)
			meanLabel.Position = UDim2.fromOffset(12, infoTop + 105)
			meanLabel.Size = UDim2.new(1, -24, 0, 32)
			meanLabel.AutomaticSize = Enum.AutomaticSize.None
			local worldPrice = mkLabel(right, (if average > 0 then "세계 평균 매입가 " .. H.commas(average) .. "코인" else "비교 기준가 미확인")
				.. (if dealPct > 0 then " · 흥정 할인 적용" else ""), 16, INK_SOFT, false)
			worldPrice.Position = UDim2.fromOffset(12, infoTop + 143)
			worldPrice.Size = UDim2.new(1, -24, 0, 46)
			worldPrice.AutomaticSize = Enum.AutomaticSize.None
			worldPrice.TextWrapped = true
			local profitBox = mkBox(right, UDim2.fromOffset(10, infoTop + 198),
				UDim2.new(1, -20, 0, 74), Color3.fromRGB(242, 220, 176))
			profitBox.Name = "TradeDecisionProfit"
			corner(profitBox, 6)
			local profitLabel = mkLabel(profitBox,
				"1개 세후 예상손익\n" .. (if profit == nil then "매입 기록 없음" else profitText .. "코인"),
				22, if profit and profit < 0 then Color3.fromRGB(177, 47, 57)
					elseif profit and profit > 0 then Color3.fromRGB(38, 111, 60)
					else Color3.fromRGB(96, 78, 41), true)
			profitLabel.Position = UDim2.fromOffset(10, 5)
			profitLabel.Size = UDim2.new(1, -20, 0, 64)
			profitLabel.AutomaticSize = Enum.AutomaticSize.None
			profitLabel.TextWrapped = true
			local inventory = mkLabel(right, string.format("내 보유 %d개 · %s\n내 평균 매입가 %s\n빈 화물칸 %d · 이번 판매 한도 %d개",
				sel.owned, if sel.lock then "구매 잠김" else "구매 가능 " .. tostring(maxBuy) .. "개",
				if basis == "미구매" then basis else basis .. "코인", free, maxSell), 18, INK, true)
			inventory.Position = UDim2.fromOffset(12, infoTop + 283)
			inventory.Size = UDim2.new(1, -24, 0, 80)
			inventory.AutomaticSize = Enum.AutomaticSize.None
			inventory.TextWrapped = true
			local cargoTrack = Instance.new("Frame")
			cargoTrack.Name = "TradeCargoMeter"
			cargoTrack.Position = UDim2.fromOffset(12, infoTop + 369)
			cargoTrack.Size = UDim2.new(1, -24, 0, 12)
			cargoTrack.BackgroundColor3 = Color3.fromRGB(199, 181, 151)
			cargoTrack.BorderSizePixel = 0
			cargoTrack.Parent = right
			corner(cargoTrack, 4)
			local cargoFill = Instance.new("Frame")
			cargoFill.Size = UDim2.fromScale(math.clamp(ship.cargoUsed / math.max(1, ship.cargoCapacity), 0, 1), 1)
			cargoFill.BackgroundColor3 = if free <= 0 then COLORS.red else UI_BRASS_DARK
			cargoFill.BorderSizePixel = 0
			cargoFill.Parent = cargoTrack
			corner(cargoFill, 4)
			-- 상세 페이지를 스크롤해도 수량과 거래 버튼은 화면 아래에 남긴다.
			local desk = mkBox(root, UDim2.new(detail.Position.X.Scale, detail.Position.X.Offset, 1, if shortScreen then -150 else -182),
                UDim2.new(detail.Size.X.Scale, detail.Size.X.Offset, 0, if shortScreen then 142 else 174), COLORS.leather)
			corner(desk, 7)
			bookMaterial(desk, "leather", 144)
			local receipt = mkLabel(desk, "", 17, COLORS.text, false)
			receipt.Position = UDim2.fromOffset(8, if shortScreen then 3 else 5)
            receipt.Size = UDim2.new(1, -16, 0, if shortScreen then 34 else 38)
			receipt.AutomaticSize = Enum.AutomaticSize.None
			receipt.TextXAlignment = Enum.TextXAlignment.Center
			local buy, sell
			local function refreshReceipt()
				local pay = if sel.buyTotals and sel.buyTotals[qty] then sel.buyTotals[qty] else unitBuy * qty
				local sellQty = math.min(qty, maxSell)
				local get = if sellQty < 1 then 0 elseif sel.sellTotals and sel.sellTotals[sellQty] then sel.sellTotals[sellQty] else sel.sell * sellQty
				local profit = H.tradeProfit(sel, sellQty)
				receipt.Text = string.format("매입 %d개 %s · 잔액 %s\n매각 %d개 %s · 손익 %s",
					qty, H.commas(pay), H.commas(p.coins - pay),
					sellQty, H.commas(get), if profit == nil then "미보유" else string.format("%+d", profit))
				receipt.TextColor3 = if qty > maxBuy then COLORS.red else COLORS.text
				if buy then
					local canBuy = maxBuy >= qty
					buy.Text = if canBuy then "구매 " .. tostring(qty) .. "개" elseif sel.lock then "특산품 잠김" elseif free < qty then "화물 부족" elseif (sel.supply or 20) < qty then "재고 부족" else "코인·한도 부족"
					buy.Interactable, buy.Active, buy.Selectable, buy.AutoButtonColor = canBuy, canBuy, canBuy, canBuy
					buy.TextColor3 = if canBuy then INK else Color3.fromRGB(97, 93, 89)
					buy.BackgroundColor3 = if canBuy then Color3.fromRGB(239, 202, 123) else Color3.fromRGB(174, 169, 159)
					local grad = buy:FindFirstChildOfClass("UIGradient")
					if grad then grad.Color = if canBuy then ColorSequence.new(Color3.fromRGB(254,224,158), Color3.fromRGB(193,146,72)) else ColorSequence.new(Color3.fromRGB(211,206,196), Color3.fromRGB(166,157,143)) end
				end
				if sell then sell.Text = if maxSell >= qty then "판매 " .. tostring(qty) .. "개" elseif maxSell > 0 then "판매 " .. tostring(maxSell) .. "개" else "판매 불가" end
			end
			local function setQuantity(value)
				qty = math.clamp(value, 1, 20)
				hallQty = qty
				-- [버튼 상태] 수량만 변하면 원화·목록을 재생성하지 않고 영수증과 실행 버튼만 갱신한다.
				refreshReceipt()
			end
			local function quantityButton(index, label, action, enabled)
				local b = mkButton(desk, label, COLORS.paper, UDim2.new(0.25, -8, 0, if shortScreen then 44 else 50), action, enabled)
                b.Position = UDim2.new((index - 1) / 4, 4, 0, if shortScreen then 39 else 47)
				b.TextSize = 17
			end
			quantityButton(1, "−", function() setQuantity(qty - 1) end)
			quantityButton(2, "+", function() setQuantity(qty + 1) end)
			quantityButton(3, "10개", function() setQuantity(10) end)
			quantityButton(4, "최대 구매", function() setQuantity(maxBuy) end, maxBuy > 0)
			buy = mkButton(desk, "구매", COLORS.gold, UDim2.new(1/3, -8, 0, if shortScreen then 52 else 60), function() if maxBuy >= qty then call("Buy", { goodId = sel.id, amount = qty }) end end, true)
			buy.Position = UDim2.fromOffset(4, if shortScreen then 84 else 106)
			buy.TextSize = if narrow then 15 else 17
			sell = mkButton(desk, "판매", COLORS.green, UDim2.new(1/3, -8, 0, if shortScreen then 52 else 60), function() call("Sell", { goodId = sel.id, amount = math.min(qty, maxSell) }) end, maxSell > 0)
			sell.Position = UDim2.new(2/3, 4, 0, if shortScreen then 84 else 106)
			sell.TextSize = if narrow then 15 else 17
			refreshReceipt()
			-- [자동 흥정] 수동 버튼 없이 상인 전문/승선 동료가 구매 순간 협상한다.
			local bargain = view.haggle or {}
			local tried = bargain.tried and bargain.tried[sel.id]
			local status = if not bargain.auto then "자동 흥정: 관련 능력 없음 · 정가 거래"
				elseif tried then "자동 흥정: 이번 항구·품목 협상 시도 완료"
				else "자동 흥정 준비 · " .. tostring(bargain.source or "상인 능력") .. "\n첫 구매 때 4~8% 할인 자동 시도"
			local dealHere = bargain.deal and bargain.deal.goodId == sel.id
			if dealHere then status = string.format("흥정 성공 · 다음 구매 %d%% 할인 적용", bargain.deal.pct or 0) end
			-- [특산품 잠금 이유] 무엇이 모자란지 + 여는 의뢰(주점)
			if sel.lock then
				status = "🔒 " .. tostring(sel.lock.text) .. (if sel.lock.quest then " · 여는 의뢰: 「" .. sel.lock.quest .. "」(주점)" else "")
				tried = true
			end
			local alert = mkLabel(right, status, 14, if sel.lock then Color3.fromRGB(150, 60, 40) elseif bargain.auto or dealHere then Color3.fromRGB(38, 111, 60) else INK_SOFT, true)
			alert.Position = UDim2.fromOffset(14, infoTop + 390)
			alert.Size = UDim2.new(1, -28, 0, 58)
			alert.AutomaticSize = Enum.AutomaticSize.None
			alert.TextWrapped = true
			-- [흥정 미니게임] 강제 아님: 저울·표정·동전·퀴즈 중 하나로 4~12% 할인(물건마다 항구에서 한 번)
			local hg = mkButton(desk, if sel.lock then "잠김" elseif dealHere then tostring(bargain.deal.pct or 0) .. "% 할인" elseif tried then "흥정 완료" else "흥정 게임", COLORS.grey, UDim2.new(1/3, -8, 0, if shortScreen then 52 else 60), function() H.openHaggle(sel.id, sel.name) end, not tried and not dealHere and H.openHaggle ~= nil)
			hg.Name = "HaggleGameButton"
			hg.Position = UDim2.new(1/3, 4, 0, if shortScreen then 84 else 106)
			hg.TextSize = if narrow then 14 else 16
			local sm = mkButton(right, "암시장 판매 · 압수 위험", COLORS.red, UDim2.new(1, -24, 0, 44), function() call("Smuggle", { goodId = sel.id, amount = math.min(qty, maxSell) }) end, maxSell > 0)
			sm.Position = UDim2.fromOffset(12, infoTop + 456)
			local allB = mkButton(right, "보유분 최대 20개 판매", COLORS.grey, UDim2.new(1, -24, 0, 44), function() call("Sell", { goodId = sel.id, amount = maxSell }) end, maxSell > 0)
			allB.Position = UDim2.fromOffset(12, infoTop + 519)
			allB.TextSize = 18
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
				cl.Position = UDim2.fromOffset(14, infoTop + 587)
				cl.Size = UDim2.new(1, -28, 0, 128)
				cl.AutomaticSize = Enum.AutomaticSize.None
			end
			local hint = mkLabel(right, string.format("장사 정보 %s · 거래 도중 시세 변동 · 판매 때 관세 차감", intelName(view.intel or 0)), 13, INK_SOFT, false)
			hint.Position = UDim2.fromOffset(14, infoTop + 729)
			hint.Size = UDim2.new(1, -28, 0, 58)
			hint.AutomaticSize = Enum.AutomaticSize.None
		end
		detail.CanvasPosition = Vector2.new(0, detailScroll)
		-- [교역] 전체 화면 확대는 제거하고 원화·정보·거래를 한 화면에 유지한다.
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

-- [교역소 서비스 탭] 실제 교역은 기존 장부 탭에서, 게시판·시장 소식·우편은 별도 탭에서 사용한다.
-- 서버 거래·저장·우편·게시물 처리 로직은 기존 호출을 그대로 유지한다.
function RENDERERS.market()
	-- [시설 역할 분리] 상인 길드 계약을 거래소 첫 화면으로 이동한다. 기존 서버 호출 유지.
	if view.guild and table.find(view.facilities or {}, "guild") then
		add(function() return mkHeader(content, "상인 길드 계약") end)
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

	-- 거래소 등록 수량은 기존 공통 선택값을 사용한다.
	add(function()
		local frame = Instance.new("Frame")
		frame.BackgroundTransparency = 1
		frame.Size = UDim2.new(1, -6, 0, 40)
		local label = mkLabel(frame, "게시 수량", 14, COLORS.muted, false)
		label.Size = UDim2.new(0.4, 0, 1, 0)
		label.AutomaticSize = Enum.AutomaticSize.None
		label.TextYAlignment = Enum.TextYAlignment.Center
		for i, qty in AMOUNTS do
			local button = mkButton(frame, tostring(qty), if i == amountIndex then COLORS.gold else COLORS.grey, UDim2.fromOffset(52, 34), function()
				amountIndex = i
				render()
			end, true)
			button.AnchorPoint = Vector2.new(1, 0.5)
			button.Position = UDim2.new(1, -6 - (#AMOUNTS - i) * 58, 0.5, 0)
		end
		frame.Parent = content
		return frame
	end)
	-- [교역소 부가 정보] 소문과 시장 소식은 즉시 거래할 상품 아래에 정리한다.
	if view.news and #view.news > 0 then
		add(function() return mkHeader(content, "시장 소식") end)
		add(function() return mkLabel(content, table.concat(view.news, "\n"), 16, COLORS.gold, true) end)
	end
	addRumorPanel()

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
	local selected
	for _, r in view.routes do
		if r.id == H.routeDetailId then selected = r; break end
	end
	if not selected then H.routeDetailId = nil end
	if selected then
		add(function()
			return mkButton(content, "항로 목록", COLORS.leather, UDim2.new(1, -6, 0, 44), function() H.routeDetailId = nil; render() end, true)
		end)
		-- [항해 상세 해도] 세계지도 화면과 같은 승인 원화 및 정규 바닷길 좌표를 사용한다.
		if not selected.locked and PortData.Ports[view.player.portId] and PortData.Ports[selected.id] then
			add(function()
				local path = SeaRoutes.path(view.player.portId, selected.id, PortData.Ports)
				local worldImg = AssetIds["CardArt/event_chart_world"]
				local box = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, 210), COLORS.paper)
				box.Name = "RouteMiniChart"
				local caption = mkLabel(box, view.player.portName .. " → " .. selected.name, 16, INK, true)
				caption.Size = UDim2.new(1, -16, 0, 28)
				caption.Position = UDim2.fromOffset(8, 4)
				caption.AutomaticSize = Enum.AutomaticSize.None
				caption.TextTruncate = Enum.TextTruncate.AtEnd
				local map = Instance.new("ImageLabel")
				map.Name = "RouteMiniChartMap"
				map.Position = UDim2.fromOffset(8, 34)
				map.Size = UDim2.new(1, -16, 1, -62)
				map.BackgroundColor3 = Color3.fromRGB(38, 82, 120)
				map.BorderSizePixel = 0
				map.Image = if worldImg then "rbxassetid://" .. tostring(worldImg) else ""
				map.ScaleType = Enum.ScaleType.Stretch
				map.ClipsDescendants = true
				map.Parent = box
				local function point(lat, lon)
					local x = if worldImg then (31 + (lon + 180) / 360 * 1522) / 1587 else (lon + 180) / 360
					local y = if worldImg then (98 + (80.6 - lat) / 145.4 * 822) / 991 else (90 - lat) / 180
					return UDim2.fromScale(math.clamp(x, 0.02, 0.98), math.clamp(y, 0.02, 0.98))
				end
				for i = 1, #path - 1 do
					local a, b = path[i], path[i + 1]
					local dl = (b[2] - a[2] + 180) % 360 - 180
					local count = math.clamp(math.ceil(math.max(math.abs(dl), math.abs(b[1] - a[1])) / 2), 1, 24)
					for k = 0, count - 1 do
						local t = k / count
						local lon = (a[2] + dl * t + 180) % 360 - 180
						local dot = Instance.new("Frame")
						dot.Name = "RouteWaypoint"
						dot.AnchorPoint = Vector2.new(0.5, 0.5)
						dot.Position = point(a[1] + (b[1] - a[1]) * t, lon)
						dot.Size = UDim2.fromOffset(3, 3)
						dot.BackgroundColor3 = Color3.fromRGB(255, 224, 118)
						dot.BorderSizePixel = 0
						dot.Parent = map
					end
				end
				for _, index in { 1, #path } do
					local p = path[index]
					local mark = Instance.new("Frame")
					mark.Name = if index == 1 then "RouteOrigin" else "RouteDestination"
					mark.AnchorPoint = Vector2.new(0.5, 0.5)
					mark.Position = point(p[1], p[2])
					mark.Size = UDim2.fromOffset(10, 10)
					mark.BackgroundColor3 = if index == 1 then Color3.fromRGB(112, 207, 146) else Color3.fromRGB(249, 191, 61)
					mark.BorderSizePixel = 0
					mark.ZIndex = 3
					mark.Parent = map
					corner(mark, 5)
				end
				local legend = mkLabel(box, "초록 출발 · 금색 목적지" .. (if worldImg then "" else " · 좌표 개략도"), 13, INK_SOFT, false)
				legend.Position = UDim2.new(0, 8, 1, -24)
				legend.Size = UDim2.new(1, -16, 0, 20)
				legend.AutomaticSize = Enum.AutomaticSize.None
				return box
			end)
		end
	elseif view.weather then
		add(function()
			local fc = ""
			if view.forecast and #view.forecast > 0 then
				local parts = {}
				for _, f in view.forecast do
					table.insert(parts, string.format("%d일 뒤 %s", f.inDays, f.name))
				end
				fc = "\n항해사의 예보: " .. table.concat(parts, " · ")
			end
			local weatherAlert = if view.weather.id == "storm" then "폭풍 · 지연·사고 주의"
				elseif view.weather.id == "rain" then "비 · 안개·암초 주의"
				elseif view.weather.id == "head" or view.weather.id == "calm" then "역풍·무풍 · 지연 주의"
				else "기상 경보 없음"
			return mkRow(content, "날씨 · " .. view.weather.name, string.format("%s · 바람 x%.2f%s", weatherAlert, view.weather.wind, "\n" .. (view.weather.hint or "") .. fc), {
				{ text = "하루 대기", color = COLORS.grey, onClick = function() call("WaitDay", {}) end },
			}, 78)
		end)
	end
	-- 정렬: 가까운 순(기본) · 의뢰 목적지 · 조선소 · 이름 · 해역
	H.routeSort = H.routeSort or "near"
	if not selected then
	add(function()
		local row = mkRow(content, "항로 정렬", "", {
			{ text = "가까운 순", color = if H.routeSort == "near" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "near"; render() end },
			{ text = "의뢰", color = if H.routeSort == "quest" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "quest"; render() end },
			{ text = "조선소", color = if H.routeSort == "yard" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "yard"; render() end },
			{ text = "해역", color = if H.routeSort == "region" then COLORS.gold else COLORS.blue, onClick = function() H.routeSort = "region"; render() end },
			{ text = "이익", color = if H.routeSort == "profit" then COLORS.gold else COLORS.green, onClick = function() H.routeSort = "profit"; render() end },
		}, 60)
		return row
	end)
	add(function()
		return mkLabel(content, "현재 항구 기상 기준 · 해적과 돌발 사건 별도", 13, COLORS.muted, false)
	end)
	end
	local sorted = if selected then { selected } else table.clone(view.routes)
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
		elseif mode == "profit" and (a.cargoProfit or -math.huge) ~= (b.cargoProfit or -math.huge) then
			return (a.cargoProfit or -math.huge) > (b.cargoProfit or -math.huge)
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
			local warn = if supplyLeft < 0 then string.format("보급 %d 부족", -supplyLeft)
				elseif (r.coal or 0) > 0 and coalLeft < 0 then string.format("석탄 %d 부족", -coalLeft)
				else string.format("출항 가능 · 보급 %d 남음", supplyLeft)
			if view.weather and (view.weather.id == "storm" or view.weather.id == "rain") then
				warn ..= if view.weather.id == "storm" then " · 폭풍 주의" else " · 비 주의"
			end
			if r.locked then
				return mkRow(content, r.name, string.format("%s · 잠김: %s", r.region, r.locked), {
					{ text = "잠김", color = COLORS.grey, onClick = function() message = r.region .. " 해역은 " .. r.locked; messageOk = false; render() end },
				}, 56)
			end
			-- [교역 쉽게 보기] 실은 화물을 거기 팔면 예상 이익: 초록 ▲ / 빨강 ▼
			local profitTag = if r.cargoProfit == nil then ""
				elseif r.cargoProfit > 0 then string.format(" · 이익 +%s", H.commas(r.cargoProfit))
				elseif r.cargoProfit < 0 then string.format(" · 손해 -%s", H.commas(-r.cargoProfit)) else " · 손익 0"
			local tags = (if r.yard then " · 조선소" else "") .. (if r.quest then " · " .. r.quest else "") .. profitTag
			if not selected then
				local item = mkRow(content, r.name, string.format("%d일 · %d km%s%s", r.days, r.distanceKm, tags, if supplyLeft < 0 or coalLeft < 0 then " · 보급 부족" else ""), {
					{ text = "상세", color = COLORS.grey, onClick = function()
						H.routeDetailId = r.id
						H.gallerySelection = { tab = "route", name = r.name, search = r.name, chart = H.chartForPort(r.id) }
						render()
					end },
				}, 78)
				local key = if r.quest then "quest" elseif r.yard then "shipyard" else "route"
				if H.hasIconArt(key) then withIcon(item, "FacilityArt", key, nil, 44) end
				local accent = item:FindFirstChild("AccentBar")
				if accent and accent:IsA("Frame") then
					accent.BackgroundColor3 = if supplyLeft < 0 or coalLeft < 0 then COLORS.red
						elseif (r.cargoProfit or 0) > 0 then COLORS.green
						elseif (r.cargoProfit or 0) < 0 then COLORS.red else UI_BRASS
				end
				return item
			end
			local row = mkRow(content, r.name, string.format("%s · %d일 · %d km%s\n%s", r.region, r.days, r.distanceKm, tags, warn), {
				{ text = if supplyLeft < 0 or coalLeft < 0 then "출항 확인" else "출항", color = COLORS.gold, onClick = function() H.routeDetailId = nil; confirmSail(r) end },
			}, 104)
			-- [항해 준비 시각화] 현재 보유량 대비 실제 항로 필요량. 부족하면 빨강으로 표시.
			local textBox = row:FindFirstChild("RowText")
			if textBox then
				for index, data in { { "보급", r.supplies, ship.supplies, "harbor" }, { "석탄", r.coal or 0, ship.coal or 0, "yard" } } do
					if index == 1 or data[2] > 0 then
						local meter = Instance.new("Frame")
						meter.Name = if index == 1 then "RouteSupplyMeter" else "RouteCoalMeter"
						meter.Size = UDim2.new(1, 0, 0, 25)
						meter.BackgroundTransparency = 1
						meter.Parent = textBox
						local key = if index == 1 and H.hasIconArt("supply") then "supply" else data[4]
						local iconLeft = 0
						if H.hasIconArt(key) then
							local icon = modelIcon(meter, "FacilityArt", key, nil, 22, data[1])
							icon.Position = UDim2.fromOffset(0, 1)
							iconLeft = 26
						end
						local label = mkLabel(meter, string.format("%s %d/%d", data[1], data[3], data[2]), 13, INK, true)
						label.Position = UDim2.fromOffset(iconLeft, 0)
						label.Size = UDim2.new(0.55, -iconLeft, 1, 0)
						label.AutomaticSize = Enum.AutomaticSize.None
						label.TextTruncate = Enum.TextTruncate.AtEnd
						local track = Instance.new("Frame")
						track.Position = UDim2.new(0.55, 0, 0, 8)
						track.Size = UDim2.new(0.45, -4, 0, 9)
						track.BackgroundColor3 = Color3.fromRGB(199, 181, 151)
						track.BorderSizePixel = 0
						track.Parent = meter
						corner(track, 3)
						local fill = Instance.new("Frame")
						fill.Size = UDim2.fromScale(math.clamp(data[3] / math.max(1, data[2]), 0, 1), 1)
						fill.BackgroundColor3 = if data[3] < data[2] then COLORS.red else Color3.fromRGB(77, 125, 81)
						fill.BorderSizePixel = 0
						fill.Parent = track
						corner(fill, 3)
					end
				end
			end
			-- [항로 원화] 목적지 제목을 누르면 승인된 지역 해역도로 바뀐다. 출항 버튼과 겹치지 않는다.
			local choose = Instance.new("TextButton")
			choose.Name = "RouteArtwork_" .. tostring(r.id)
			choose.Text = ""
			choose.BackgroundTransparency = 1
			choose.BorderSizePixel = 0
			choose.Size = UDim2.new(1, -124, 0, 42)
			choose.ZIndex = row.ZIndex + 3
			choose.Parent = row
			choose.Activated:Connect(function()
				H.gallerySelection = { tab = "route", name = r.name, search = r.name, chart = H.chartForPort(r.id) }
				H.renderFacilityGallery()
			end)
			return row
		end)
	end
end

local openYardHall
-- 동료 조언 줄: 말하는 동료의 초상과 말, 그리고 바로 가는 버튼 (최대 n개)
function H.counselRows(n)
	-- [중복 방지] 핵심 판단이 있는 시설의 동료 조언은 저널에서만 보여 준다.
	if H.MENU_FOCUS[currentTab] or H.contextAdviceShown or not view then return end
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
			if cs.tab ~= currentTab and TAB_NAME[cs.tab] and groupOf(cs.tab) ~= groupOf(currentTab) then
				table.insert(buttons, { text = cs.label or "이동", color = COLORS.green, onClick = function() H.goAdvice(cs.tab) end })
			elseif cs.tab == currentTab and (currentTab == "trade" or currentTab == "yard") then
				table.insert(buttons, { text = "상세 보기", color = COLORS.green, onClick = function() if H.invokeMenuPrimary then H.invokeMenuPrimary() end end })
			elseif cs.tab == currentTab and currentTab == "crew" then
				table.insert(buttons, { text = "영입", color = COLORS.green, onClick = function() openTab("recruit") end })
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

local function renderYard(page)
	local yard, sh = view.shipyard, view.ship
	if not page or page == "maintenance" then
		H.walletBar("yard")
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
			}, content, nil, nil, true)
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
	end
	if not page or page == "blueprints" then
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
	end
	if page and page ~= "compare" then return end
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
	if previewShip then H.shipPreviewId = previewShip.id end
	if previewShip and not H.yardHallActive then
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
	-- 선택 함종만 비교 막대와 구매 조건을 펼친다. 나머지는 가벼운 목록으로 유지한다.
	for _, s in (if previewShip then { previewShip } else {}) do
		add(function()
			local pay = math.max(0, s.netCost)
			local refund = if s.netCost < 0 then " · 차액 환급 " .. H.commas(-s.netCost) else ""
			-- [선박 비교 중복 제거] 화물·속도·내구·포문·승조원은 바로 아래 5개 비교 막대에서 확인.
			-- 상세 글에는 실제 구매 판단을 좌우하는 정가·보상·실결제와 필수 적재 한도만 남긴다.
			local sub = string.format("%s\n실결제 %s코인%s\n정가 %s · 기함 보상 %s\n교체 후 적재 한도 %d칸",
				s.summary, H.commas(pay), refund, H.commas(s.price), H.commas(s.tradeIn), s.capacityAfter)
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
			local row = mkRow(content, string.format("[등급%d] %s%s", s.class, s.name, if s.id == H.shipPreviewId then " · 중앙 3D 선택" elseif s.owned then " · 현재 기함" elseif s.steam then " · 증기" else ""),
				sub, {
					{ text = if s.owned then "현재 배" elseif s.locked then "잠김" elseif not s.canCarry then "화물 초과" elseif s.netCost > view.player.coins then "코인 부족" else "교체\n" .. H.commas(pay),
						color = if s.steam then COLORS.steam else COLORS.gold,
						enabled = yard.available and not s.owned and not s.locked and s.canCarry and s.netCost <= view.player.coins,
						onClick = function() call("BuyShip", { shipId = s.id }) end },
				}, if s.id == "galleon" and AssetIds["Naval/galleon-heritage"] then 236 else 210)
			-- [선택 강조] 중앙 3D로 연결된 선박만 황동 선·두꺼운 테두리로 표시한다.
			if s.id == H.shipPreviewId then
				local border = row:FindFirstChildOfClass("UIStroke")
				if border then
					border.Color = UI_BRASS_DARK
					border.Thickness = 2.5
				end
				local accent = row:FindFirstChild("AccentBar")
				if accent then accent.BackgroundColor3 = COLORS.gold end
			end
			local si = SHIP_ICON[s.id]
			if si then withIcon(row, si[1], si[2], si[3], 100) end
			-- [선박 원화 선택] 상세장부에서도 이름·사진을 누르면 중앙 7:10 선박이 바뀐다.
			-- 선택만 하는 터치 영역이며 기존 실제 교체/구매 버튼과 겹치지 않는다.
			local selectArea = Instance.new("TextButton")
			selectArea.Name = "SelectShip3D_" .. tostring(s.id)
			selectArea.Text = ""
			selectArea.BackgroundTransparency = 1
			selectArea.BorderSizePixel = 0
			selectArea.AutoButtonColor = false
			selectArea.Size = UDim2.new(1, -4, 0, 78)
			selectArea.ZIndex = 4
			selectArea.Parent = row
			local inYardHall = H.yardHallActive
			selectArea.Activated:Connect(function()
				if H.shipPreviewId == s.id then return end
				H.shipPreviewId = s.id
				-- [선택 원화 갱신] 콜백 시점에는 H.yardHallActive가 false이므로 생성 시의 소속을 사용한다.
				if inYardHall and tradeHallRefresh then tradeHallRefresh() else render() end
			end)
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
				local textBox = row:FindFirstChild("RowText")
				local left = if textBox and textBox:IsA("Frame") then textBox.Position.X.Offset else 8
				-- mkRow의 버튼 전환 기준과 동일: 좁으면 하단 66px 버튼 영역을 비운다.
				local narrow = row.AbsoluteSize.X < math.max(520, left + 120 + 240)
				chart.Position = UDim2.new(0, if narrow then 12 else left, 1, if narrow then -178 else -112)
				chart.Size = UDim2.new(1, if narrow then -24 else -left - 132, 0, 100)
			end
			row:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitChart)
			task.defer(fitChart)
			return row
		end)
	end
	if #yard.ships > 1 then
		add(function() return mkHeader(content, "다른 선박 선택") end)
	end
	for _, s in yard.ships do
		if s ~= previewShip then
			add(function()
				local status = if s.owned then "현재 기함" elseif s.locked then tostring(s.locked)
					elseif not s.canCarry then "화물 초과" elseif s.netCost > view.player.coins then "자금 부족"
					else "실결제 " .. H.commas(math.max(0, s.netCost)) .. "코인"
				local inYardHall = H.yardHallActive
				local row = mkRow(content, s.name, string.format("등급 %d · %s", s.class, status), {{
					text = "비교", color = COLORS.leather, onClick = function()
						H.shipPreviewId = s.id
						if inYardHall and tradeHallRefresh then tradeHallRefresh() else render() end
					end,
				}}, 82)
				row.Name = "YardShipChoice_" .. tostring(s.id)
				local si = SHIP_ICON[s.id]
				if si then withIcon(row, si[1], si[2], si[3], 56) end
				return row
			end)
		end
	end
end


-- 조선소 별도 화면: 조선 장인과 마주 보고 정비·보급·배 구입·개조를 한다 (기존 조선소 목록을 큰 화면에 그대로 쓴다)
function openYardHall()
	Sfx.play("sfx_creak")
	Sfx.facilityCue("yard")
	closeTradeHall()
	-- [조선 탭] 기존 선박 비교·정비·구매 내용 그대로 시설 책 본문에 사용한다.
	local root = Instance.new("Frame")
	root.Name = "FacilityDetail"
	root.BackgroundColor3 = COLORS.cover
	root.BorderSizePixel = 0
	root.ClipsDescendants = true
	root.Parent = mainInner
	H.layoutBook()
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
	local zoomOpen = false
	local page = "maintenance"

	local function build()
		if not root.Parent or not view then
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
		local showPortrait = width >= 1800
		local inset = if showPortrait then 258 else 8
		local landscape = width >= 740
		local compactNav = not landscape
		local availableH = math.max(300, root.AbsoluteSize.Y)
		-- [조선소도 교역소형] 가로: 왼쪽 18% 항목 / 중앙 36% 선박 / 오른쪽 실제 정비·구매.
		-- [세로] 기존 항목 버튼 두 줄 → 배 그림 → 정비 목록 순서를 유지한다.
		local navWidth = if landscape then math.clamp(math.floor((width - inset - 16) * 0.18), 136, 230) else 0
		local heroTop = if landscape then 92 else 150
		local heroWidth = if landscape then math.floor((width - inset - navWidth - 24) * 0.46) else width - inset - 8
		local heroHeight = if landscape then availableH - heroTop - 8 else math.clamp(math.floor(availableH * 0.24), 98, 172)
		scroll.Position = if landscape then UDim2.fromOffset(inset + navWidth + heroWidth + 16, heroTop)
			else UDim2.fromOffset(inset, heroTop + heroHeight + 8)
		scroll.Size = if landscape then UDim2.new(1, -inset - navWidth - heroWidth - 24, 1, -heroTop - 8)
			else UDim2.new(1, -inset - 8, 1, -heroTop - heroHeight - 16)
		local top = mkBox(root, UDim2.fromOffset(8, 8), UDim2.new(1, -16, 0, 74), COLORS.paper)
        corner(top, 6)
        bookMaterial(top, "parchment", 220)
        local title = mkLabel(top, "조선 도감 · " .. p.portName, 19, INK, true)
		title.Position = UDim2.fromOffset(12, 7)
		title.Size = UDim2.new(1, -104, 0, 25)
		title.AutomaticSize = Enum.AutomaticSize.None
		title.TextTruncate = Enum.TextTruncate.AtEnd
		-- [조선소 상단] 기함 이름의 중복 표기를 빼고 자금·최근 메뉴를 나란히 둔다.
		-- [조선소] 자금 표시 옆으로 최근 시설을 옮기고 교역소와 같은 간격으로 정렬한다.
		local recent = H.recentTab
		local showRecent = recent and TAB_NAME[recent] ~= nil and groupOf(recent) ~= groupOf("yard")
		local recentWidth = if width < 380 then 78 elseif width < 740 then 94 else 132
		local cashWidth = if width < 740 then math.max(100, math.min(260, width - (if showRecent then recentWidth + 44 else 40)))
			else math.clamp(math.floor(width * 0.38), 230, 330)
		local groupWidth = cashWidth + (if showRecent then recentWidth + 8 else 0)
		local groupX = math.max(8, math.floor((width - 16 - groupWidth) / 2))
		local cashText = if width < 480 then "돈 " .. H.commas(p.coins)
			else H.statusMoneyCargo(p, ship, width < 740)
		local hold = mkLabel(top, cashText, if width < 480 then 14 else 17, INK_SOFT, true)
		-- [조선소 자금] 교역소와 같은 황동 양피지 현판.
        hold.BackgroundColor3 = PARCHMENT_TOP
        hold.BackgroundTransparency = 0.08
        corner(hold, 5)
        local moneyEdge = Instance.new("UIStroke")
        moneyEdge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        moneyEdge.Color = UI_BRASS_DARK
        moneyEdge.Thickness = 1.4
        moneyEdge.Parent = hold
        hold.AnchorPoint = Vector2.zero
        hold.Position = UDim2.fromOffset(groupX, 36)
		hold.Size = UDim2.fromOffset(cashWidth, 34)
		hold.AutomaticSize = Enum.AutomaticSize.None
		hold.TextTruncate = Enum.TextTruncate.AtEnd
		hold.TextXAlignment = Enum.TextXAlignment.Center
		hold.TextYAlignment = Enum.TextYAlignment.Center
		if showRecent then
			local recentBtn = mkButton(top, "← " .. groupOf(recent).name, COLORS.leather,
				UDim2.fromOffset(recentWidth, 34), function()
					closeTradeHall()
					openTab(recent, if recent == "map" then "chart" else nil)
				end, true)
			recentBtn.Name = "YardRecentFacility"
			recentBtn.Position = UDim2.fromOffset(groupX + cashWidth + 8, 36)
			recentBtn.TextSize = if width < 480 then 13 else 15
		end
		local leave = mkButton(top, "닫기", COLORS.leather, UDim2.fromOffset(78, 44), function()
			closeTradeHall()
			main.Visible = false
			menuToggle.Visible = true
		end, true)
		leave.AnchorPoint = Vector2.new(1, 0.5)
		leave.Position = UDim2.new(1, -9, 0.5, 0)
		-- [닫기 중복 제거] 시설 책 오른쪽 위 X가 이미 닫기를 맡는다.
		leave.Visible = false

		local nav = mkBox(root, if landscape then UDim2.fromOffset(inset, heroTop) else UDim2.fromOffset(inset, 90),
			if landscape then UDim2.new(0, navWidth, 1, -heroTop - 8) else UDim2.new(1, -inset - 8, 0, 52), COLORS.leather)
		for i, entry in { { "정비", "maintenance", "shipyard" }, { "선박 비교", "compare", "yard" }, { "지역 설계", "blueprints", "chart" } } do
			local selected = page == entry[2]
			local button = mkButton(nav, entry[1], if selected then COLORS.gold else COLORS.paper,
				if landscape then UDim2.new(1, -8, 0, 52) else UDim2.new(1 / 3, -6, 0, 46), function()
					if page == entry[2] then return end
					page = entry[2]
					scroll.CanvasPosition = Vector2.zero
					build()
				end, true)
			button.Name = "YardTab_" .. entry[2]
			button:SetAttribute("SelectedTab", selected)
			if selected then
				local activeRule = Instance.new("Frame")
				activeRule.Name = "ActiveTabRule"
				activeRule.BackgroundColor3 = INK
				activeRule.BorderSizePixel = 0
				activeRule.Position = UDim2.new(0, 8, 1, -5)
				activeRule.Size = UDim2.new(1, -16, 0, 3)
				activeRule.ZIndex = button.ZIndex + 3
				activeRule.Parent = button
			end
			button.Position = if landscape then UDim2.fromOffset(4, 4 + (i - 1) * 56) else UDim2.new((i - 1) / 3, 4, 0, 3)
			button.TextSize = 14
			-- [조선 탭] 공통 청동 원화와 짧은 이름을 같은 줄에 배치한다.
			local caption = button:FindFirstChild("PrintedCaption")
			if caption and H.hasIconArt(entry[3]) then
				local icon = modelIcon(button, "FacilityArt", entry[3], nil, 22, entry[1])
				icon.Name = "YardTabIcon"
				icon.Position = UDim2.new(0, 5, 0.5, -11)
				icon.ZIndex = button.ZIndex + 2
				caption.Position = UDim2.fromOffset(29, 0)
				caption.Size = UDim2.new(1, -34, 1, -4)
				caption.TextWrapped = true
				caption.TextScaled = true
				local limit = Instance.new("UITextSizeConstraint")
				limit.MinTextSize = 13
				limit.MaxTextSize = 16
				limit.Parent = caption
			end
		end
		-- [선박 전시장] 기존 등록된 함종에만 적용, 함선 성능·구매 규칙 불변.
		local preview = nil
		H.shipPreviewId = H.shipPreviewId or ship.id
		for _, candidate in (view.shipyard and view.shipyard.ships or {}) do
			if candidate.id == H.shipPreviewId then preview = candidate; break end
		end
		if not preview then
			for _, candidate in (view.shipyard and view.shipyard.ships or {}) do
				if candidate.id == ship.id then preview = candidate; break end
			end
		end
		if preview then H.shipPreviewId = preview.id end
		local gallery = mkBox(root, UDim2.fromOffset(inset + (if landscape then navWidth + 8 else 0), heroTop),
			UDim2.fromOffset(heroWidth, heroHeight), Color3.fromRGB(230, 209, 171))
		gallery.Name = "YardShipGallery"
		corner(gallery, 8)
		bookMaterial(gallery, "parchment", 220)
		local shipName = preview and preview.name or ship.name
		local shipId = preview and preview.id or ship.id
		local shipArt = SHIP_ICON[shipId]
		-- [조선소 원화 카드] 기존 승인 선박 모델을 세로 7:10 슬롯에 맞춰 전시한다.
		local availableArtH = math.max(44, heroHeight - 72)
		local cardW = math.floor(math.max(34, math.min(heroWidth - 20, availableArtH * 0.7)))
		local cardH = math.floor(cardW * 10 / 7)
		local card = Instance.new("Frame")
		card.Name = "YardShipCard7x10"
		card.Size = UDim2.fromOffset(cardW, cardH)
		card.AnchorPoint = Vector2.new(0.5, 0)
		card.Position = UDim2.new(0.5, 0, 0, 7)
		card.BackgroundTransparency = 1
		card.ClipsDescendants = true
		card.Parent = gallery
		if shipArt then
			local model = modelIcon(card, shipArt[1], shipArt[2], shipArt[3], math.max(cardW, 44), shipName)
			model.Size = UDim2.fromScale(1, 1)
			model.Position = UDim2.fromOffset(0, 0)
			model.BackgroundTransparency = 1
			local bookCard = nil
			for _, item in ((view.codex and view.codex.cards) or {}) do
				if item.found and item.name == shipName then bookCard = item; break end
			end
			local link = Instance.new("TextButton")
			link.Name = "YardArtToCodex"
			link.Size = UDim2.fromScale(1, 1)
			link.BackgroundTransparency = 1
			link.Text = ""
			link.ZIndex = model.ZIndex + 1
			link.Parent = card
			link.Activated:Connect(function()
				H.galleryBookOpenRequested = if bookCard then bookCard.id else "search:" .. shipName
				openTab("codex")
			end)
		end
		local label = mkLabel(gallery, shipName .. (if preview and preview.owned then " · 현재 기함" else ""), 21, INK, true)
		label.Position = UDim2.new(0, 12, 1, -60)
		label.Size = UDim2.new(1, -24, 0, 22)
		label.AutomaticSize = Enum.AutomaticSize.None
		label.TextTruncate = Enum.TextTruncate.AtEnd
		label.TextXAlignment = Enum.TextXAlignment.Center
		local inspect = mkButton(gallery, "선박 확대", COLORS.gold, UDim2.fromOffset(128, 44), function() zoomOpen = true; build() end, shipArt ~= nil)
		inspect.AnchorPoint = Vector2.new(0.5, 1)
		inspect.Position = UDim2.new(0.5, 0, 1, -5)
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
		H.yardHallActive = true
		local ok, err = pcall(renderYard, page)
		H.yardHallActive = false
		content, H.contextAdviceShown = saved, previousAdvice
		if not ok then
			warn("[Game] 조선소 화면 오류", err)
		end
		scroll.CanvasPosition = Vector2.new(0, lastScroll)
		if zoomOpen then
			local shade = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(35, 26, 19))
			shade.ZIndex = 50
			local px = math.floor(math.min(root.AbsoluteSize.X * 0.78, root.AbsoluteSize.Y * 0.76, 520))
			if shipArt then
				local art = modelIcon(shade, shipArt[1], shipArt[2], shipArt[3], px, shipName)
				art.AnchorPoint = Vector2.new(0.5, 0.5)
				art.Position = UDim2.fromScale(0.5, 0.5)
			end
			local title = mkLabel(shade, "선박 도감 · " .. shipName, 20, COLORS.paper, true)
			title.Position = UDim2.fromOffset(12, 8)
			title.Size = UDim2.new(1, -130, 0, 32)
			title.AutomaticSize = Enum.AutomaticSize.None
			local done = mkButton(shade, "닫기", COLORS.gold, UDim2.fromOffset(94, 44), function() zoomOpen = false; build() end, true)
			done.AnchorPoint = Vector2.new(1, 0)
			done.Position = UDim2.new(1, -10, 0, 8)
		end
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
    -- [지상 탐험 진입] 최초 탐험 때만 기존 필드 정본을 로드한다.
    local sceneOk, loaded = pcall(function()
        return FieldScene or require(Shared:WaitForChild("FieldScene"))
    end)
    if not sceneOk then
        workspace:SetAttribute("FieldEntryFailure", "FIELD_MODULE_UNAVAILABLE")
        warn("[MareEssentia] 지상 탐험 모듈 로드 실패", loaded)
        message, messageOk = "지상 탐험을 준비하지 못했어.", false
        render()
        return
    end
    FieldScene = loaded
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
		reserveWeapon = Weapons.originSidearm(view and view.captain and view.captain.origin and view.captain.origin.id,
			view and view.player and view.player.year).id, -- 집안별 2번 무기, 별도 저장 불필요
		year = view and view.player and view.player.year, -- 실제 역사 시대로 활·총기 발화방식 결정
		name = s.name,
		portId = s.portId,
		siteId = s.id, -- 기존 Sites의 지역·도감 후보를 탐험 시각 연출에 그대로 연결한다.
		portScenery = PortScene and PortScene.Signatures and PortScene.Signatures[s.portId], -- 항구 경관 정본, 시각 전용
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
				sub = if s.left == 0 then "모두 조사했어요" elseif not s.unlocked then s.locked or "연구 조건 필요" else string.format("난이도 %d/5단 · 발견 %d · %d일%s", math.clamp(s.minLevel or 1, 1, 5), s.left, s.days,
					if s.fieldQuest then "\n현장 의뢰: " .. s.fieldQuest else ""),
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
local function paintCardArt(parent, card, fieldDef)
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
		img.ScaleType = Enum.ScaleType.Fit
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
	-- [원화 자리] 세로 7:10 빈 틀. 등록된 원화가 없으면 분야 색 틀만 보이고, 원화가 생기면 그 자리에 들어간다.
	local artRow = Instance.new("Frame")
	artRow.LayoutOrder = 2
	artRow.BackgroundTransparency = 1
	local camera = workspace.CurrentCamera
	local viewportHeight = if camera then camera.ViewportSize.Y else 600
	local artH = math.clamp(math.floor(viewportHeight * 0.43), 140, 410)
	artRow.Size = UDim2.new(1, -8, 0, artH)
	artRow.Parent = body
	local art = Instance.new("Frame")
	art.AnchorPoint = Vector2.new(0.5, 0)
	art.Position = UDim2.fromScale(0.5, 0)
	art.Size = UDim2.fromOffset(math.floor(artH * 0.7), artH)
	local artBorder = Instance.new("UIStroke")
	artBorder.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	artBorder.Color = brown
	artBorder.Parent = art
	corner(art, 5)
	art.Parent = artRow
	paintCardArt(art, card, fieldDef)

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
	-- [개인 탐험 백과] 원본 백과 정의와 내 최초 발견 경위를 구분해서 보여 준다.
	if card.found then
		local first = card.provenance
		if first then
			local notes = { "내 최초 발견: " .. (first.port or "위치 미상") .. " · 항해 " .. tostring(first.day or 0) .. "일째" }
			table.insert(notes, "획득 방식: " .. (first.method or "발견"))
			if first.site then table.insert(notes, "현장: " .. first.site) end
			if first.person then table.insert(notes, "배운 인물: " .. first.person) end
			if first.quest then table.insert(notes, "획득 퀘스트: " .. first.quest) end
			if first.event then table.insert(notes, "관련 사건: " .. first.event) end
			mkLabel(body, table.concat(notes, "\n"), 14, ink, true, 4)
		else
			mkLabel(body, "개인 발견 기록: 이전에 획득한 카드 · 당시 항구와 인물 정보 없음", 12, brown, false, 4)
		end
	end
	-- [지식→후속 이야기] 카드 하나가 연속 퀘스트의 다음 원인이 된 경우만 표시한다.
	if card.found and card.nextClue then
		local clue = card.nextClue
		mkLabel(body, "이 발견으로 열린 다음 이야기: " .. clue.quest
			.. "\n다음 목적지: " .. (clue.port or "항해 지도 확인")
			.. " · 단서: " .. (clue.source or "지역 탐험"), 14, ink, true, 4)
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
		local wiki = require(Shared:WaitForChild("KnowledgeWiki")).Wiki[card.id]
		if wiki then
			-- [위키식 해설] 한 줄 요약 + 접는 섹션(첫 섹션만 펼침). 기존 본문은 아래에 그대로 둔다.
			mkLabel(body, wiki.summary, 16, brown, true, 4)
			for i, sec in wiki.sections do
				local open = i == 1
				local head = Instance.new("TextButton")
				head.LayoutOrder = 40 + i * 2
				head.Size = UDim2.new(1, -8, 0, 36)
				head.BackgroundTransparency = 1
				head.AutoButtonColor = false
				head.TextXAlignment = Enum.TextXAlignment.Left
				head.Font = Enum.Font.GothamBold
				head.TextSize = 17
				head.TextColor3 = ink
				head.Parent = body
				local txt = mkLabel(body, sec.body, 15, ink, false, 41 + i * 2)
				txt.Visible = open
				local function sync()
					head.Text = (if txt.Visible then "▾ " else "▸ ") .. sec.title
				end
				sync()
				head.Activated:Connect(function()
					txt.Visible = not txt.Visible
					sync()
				end)
			end
			if wiki.quiz then
				-- [읽기 퀴즈] 3문제를 모두 맞히면 카드당 한 번 보상. 정답·중복 판정은 서버가 한다.
				local reward = require(Shared:WaitForChild("KnowledgeCards")).QuizReward
				if card.quizDone then
					mkLabel(body, "읽기 퀴즈 완료 · 보상을 받았어요", 14, brown, true, 56)
				else
					local quizHead = Instance.new("TextButton")
					quizHead.LayoutOrder = 56
					quizHead.Size = UDim2.new(1, -8, 0, 40)
					quizHead.BackgroundColor3 = Color3.fromRGB(239, 202, 123)
					quizHead.AutoButtonColor = true
					quizHead.Font = Enum.Font.GothamBold
					quizHead.TextSize = 16
					quizHead.TextColor3 = ink
					quizHead.TextWrapped = true
					quizHead.Parent = body
					corner(quizHead, 6)
					local quizBox = Instance.new("Frame")
					quizBox.LayoutOrder = 57
					quizBox.BackgroundTransparency = 1
					quizBox.Size = UDim2.new(1, -8, 0, 0)
					quizBox.AutomaticSize = Enum.AutomaticSize.Y
					quizBox.Visible = false
					quizBox.Parent = body
					local quizLay = Instance.new("UIListLayout")
					quizLay.Padding = UDim.new(0, 5)
					quizLay.SortOrder = Enum.SortOrder.LayoutOrder
					quizLay.Parent = quizBox
					local function syncQuizHead()
						quizHead.Text = (if quizBox.Visible then "▾ " else "▸ ") .. string.format("읽기 퀴즈 (+%d코인 · 명성 +%d, 카드당 한 번)", reward.coins, reward.fame)
					end
					syncQuizHead()
					quizHead.Activated:Connect(function()
						quizBox.Visible = not quizBox.Visible
						syncQuizHead()
					end)
					local picks = {}
					local order = 0
					for qi, q in wiki.quiz do
						order += 1
						mkLabel(quizBox, string.format("%d. %s", qi, q.q), 15, ink, true, order)
						local optButtons = {}
						for oi, optionText in q.options do
							order += 1
							local ob = mkButton(quizBox, optionText, COLORS.blue, UDim2.new(1, 0, 0, 34), function()
								picks[qi] = oi
								for k, other in optButtons do
									other.BackgroundColor3 = if k == oi then Color3.fromRGB(239, 202, 123) else Color3.fromRGB(232, 211, 174)
								end
							end, true)
							ob.LayoutOrder = order
							optButtons[oi] = ob
						end
					end
					order += 1
					local quizMsg = mkLabel(quizBox, "", 14, COLORS.red, true, order + 1)
					local submit = mkButton(quizBox, "정답 제출", COLORS.gold, UDim2.new(1, 0, 0, 38), function()
						local res = call("WikiQuiz", { id = card.id, answers = picks })
						if res and res.ok and view and view.codex then
							for _, c in view.codex.cards do
								if c.id == card.id then
									overlay:Destroy()
									H.showCardDetail(c)
									break
								end
							end
						elseif res then
							quizMsg.Text = res.message or "다시 도전해 보세요"
						end
					end, true)
					submit.LayoutOrder = order
				end
			end
			mkLabel(body, "해설 참고  위키백과 · " .. wiki.topic:gsub("_", " ") .. " (CC BY-SA 4.0)", 12, brown, false, 60)
		end
		-- [이야기 카드] 이 카드가 등장한 이야기를 끝내면 한 단락씩 열린다(가상의 이야기).
		for li, lore in card.lore or {} do
			mkLabel(body, "이야기 · " .. lore.title .. " (가상의 이야기)", 15, brown, true, 61 + li * 2)
			mkLabel(body, lore.text, 15, ink, false, 62 + li * 2)
		end
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
		-- [실루엣 힌트] 지상 탐험에서 어디서·어떻게 찾는지(대표 모양 매핑표)
		local okDF, DFm = pcall(function() return require(Shared:WaitForChild("DiscoveryForms")) end)
		local hintText = okDF and DFm and DFm.hint(card)
		if hintText then
			local hl = mkLabel(body, "실루엣 힌트 · " .. hintText, 13, brown, true, 6)
			hl.Name = "CodexDiscoveryHint"
		end
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

-- [카드 습득] 실제 서버 신규 발견 시 중앙 공개 → 등급별 금빛·효과음 → 이름 강조 → 서재 도크 귀속.
-- 서버 보상·도감 저장은 그대로 사용하며 장면·전투 중에는 기존 대기열에서 안전하게 재생한다.
local GAIN_COLOR = {
	Common = Color3.fromRGB(190, 170, 130), Uncommon = Color3.fromRGB(110, 190, 120),
	Rare = Color3.fromRGB(90, 150, 230), Epic = Color3.fromRGB(180, 110, 230),
	Legendary = Color3.fromRGB(245, 200, 80),
}
local GAIN_RARITY = { Common = "흔함", Uncommon = "보통", Rare = "희귀", Epic = "영웅급", Legendary = "전설" }

function H.showCardGain(card, moreCount)
	if not card then return end
	-- [카드 획득 · 메인] 기존 카드/도감 원화만 표시한다. 보상과 저장값에는 관여하지 않는다.
	-- [모바일] 7:10 카드 비율, 비차단 알림, 등급별 가벼운 트윈 및 기존 SFX만 사용한다.
	local pg = player:WaitForChild("PlayerGui")
	local previous = pg:FindFirstChild("CardGain")
	if previous then previous:Destroy() end
	local g = overlayGui("CardGain", 95)
	g:SetAttribute("NonBlockingCardNotice", true)
	local TS = game:GetService("TweenService")
	local isCombat = card.gainType == "combat"
	local tone = GAIN_COLOR[card.rarity] or GAIN_COLOR.Common
	local rarityLevel = ({ Common = 0, Uncommon = 1, Rare = 2, Epic = 3, Legendary = 4 })[card.rarity] or 0
	local gold = Color3.fromRGB(255, 217, 124):Lerp(tone, if rarityLevel >= 2 then 0.22 else 0.5)
	local viewport = if workspace.CurrentCamera then workspace.CurrentCamera.ViewportSize else Vector2.new(720, 900)
	-- 세로 7:10은 유지하고 가로/세로 화면의 제목 안전 여백 안에서 크게 표시한다.
	local revealHeight = math.floor(math.max(80, math.min(if rarityLevel >= 3 then 500 else 460,
		viewport.Y * (if rarityLevel >= 3 then 0.72 else 0.68), viewport.Y * 0.92 - 88, viewport.X * 0.72 / 0.7)))
	local revealWidth = math.floor(revealHeight * 0.7)
	local center = UDim2.fromScale(0.5, 0.46)
	local reducedMotion = game:GetService("GuiService").ReducedMotionEnabled
	-- [획득 연출] 유럽 원화의 동일 품질 검수 제외 규칙을 전투·도감과 똑같이 적용한다.
	local excludedEuropeanArt = type(card.id) == "string"
		and string.match(card.id, "^eu_%d%d$") ~= nil
		and not require(Shared:WaitForChild("CardArt")).Art[card.id]
	local imageId = if excludedEuropeanArt then nil else AssetIds["CardArt/" .. tostring(card.id)]
	local artImage = if excludedEuropeanArt then "" elseif imageId then "rbxassetid://" .. tostring(imageId)
		elseif type(card.image) == "string" and card.image ~= "" then card.image
		elseif type(card.stageArt) == "string" and AssetIds[card.stageArt] then "rbxassetid://" .. tostring(AssetIds[card.stageArt])
		else ""

	-- [등급 광륜] 고급 이상일 때만 빛살을 추가한다. 텍스처·반복 루프·파츠를 만들지 않는다.
	local rayCount = if rarityLevel >= 4 then 6 elseif rarityLevel >= 2 then 4 else 0
	for i = 1, rayCount do
		local ray = Instance.new("Frame")
		ray.Name = "RarityRay"
		ray.AnchorPoint = Vector2.new(0.5, 0.5)
		ray.Position = center
		ray.Size = UDim2.fromOffset(9, revealHeight * 0.45)
		ray.Rotation = (i - 1) * 180 / rayCount
		ray.BackgroundColor3 = gold
		ray.BackgroundTransparency = 0.69
		ray.BorderSizePixel = 0
		ray.ZIndex = 5
		ray.Parent = g
		task.delay(0.38, function()
			if ray.Parent then
				TS:Create(ray, TweenInfo.new(0.78, Enum.EasingStyle.Quad), {
					Size = UDim2.fromOffset(3, revealHeight * 1.48), BackgroundTransparency = 1,
				}):Play()
			end
		end)
	end

	-- [발견 아우라] 책의 금박이 열릴 때 카드 뒤에서 번지는 부드러운 빛.
	if not reducedMotion then
		local bloom = Instance.new("Frame")
		bloom.Name = "CardDiscoveryBloom"
		bloom.AnchorPoint = Vector2.new(0.5, 0.5)
		bloom.Position = center
		bloom.Size = UDim2.fromOffset(48, 48)
		bloom.BackgroundColor3 = gold
		bloom.BackgroundTransparency = 0.66
		bloom.BorderSizePixel = 0
		bloom.ZIndex = 5
		bloom.Parent = g
		corner(bloom, 100)
		TS:Create(bloom, TweenInfo.new(0.69, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
			Size = UDim2.fromOffset(math.floor(revealWidth * 1.8), math.floor(revealHeight * 1.75)),
			BackgroundTransparency = 1,
		}):Play()
	end

	local frame = Instance.new("Frame")
	frame.Name = "AcquiredCardReveal"
	frame.AnchorPoint = Vector2.new(0.5, 0.5)
	frame.Position = center
	frame.Size = UDim2.fromOffset(8, math.floor(revealHeight * 0.38))
	frame.BackgroundColor3 = Color3.fromRGB(234, 212, 166)
	frame.BorderSizePixel = 0
	frame.Rotation = 0
	frame.ClipsDescendants = true
	frame.ZIndex = 8
	frame.Parent = g
	corner(frame, 10)
	local rim = Instance.new("UIStroke")
	rim.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	rim.Color = gold
	rim.Thickness = if rarityLevel >= 3 then 4 else 3
	rim.Parent = frame
	local paper = Instance.new("UIGradient")
	paper.Color = ColorSequence.new(Color3.fromRGB(252, 238, 205), Color3.fromRGB(173, 136, 88))
	paper.Rotation = 90
	paper.Parent = frame
	local art = Instance.new("ImageLabel")
	art.Name = "ApprovedCardArt"
	art.BackgroundTransparency = 1
	art.Position = UDim2.fromOffset(8, 9)
	art.Size = UDim2.new(1, -16, 1, -76)
	art.Image = artImage
	art.ImageTransparency = 1
	art.ScaleType = Enum.ScaleType.Fit
	art.ZIndex = 9
	art.Parent = frame
	if artImage == "" then
		local missing = Instance.new("TextLabel")
		missing.Name = "ArtworkPending"
		missing.BackgroundTransparency = 1
		missing.Position = art.Position
		missing.Size = art.Size
		missing.Font = Enum.Font.Antique
		missing.TextColor3 = Color3.fromRGB(98, 75, 49)
		missing.TextSize = 15
		missing.TextWrapped = true
		missing.Text = "원화 준비 중"
		missing.ZIndex = 9
		missing.Parent = frame
	end
	local name = Instance.new("TextLabel")
	name.Name = "CardName"
	name.BackgroundTransparency = 1
	name.Position = UDim2.new(0, 6, 1, -61)
	name.Size = UDim2.new(1, -12, 0, 31)
	name.Font = Enum.Font.GothamBold
	name.TextSize = 18
	name.TextColor3 = Color3.fromRGB(52, 36, 24)
	name.TextTruncate = Enum.TextTruncate.AtEnd
	name.Text = tostring(card.name or "새 카드")
	name.ZIndex = 9
	name.Parent = frame
	local rarity = Instance.new("TextLabel")
	rarity.BackgroundTransparency = 1
	rarity.Position = UDim2.new(0, 6, 1, -29)
	rarity.Size = UDim2.new(1, -12, 0, 22)
	rarity.Font = Enum.Font.GothamBold
	rarity.TextSize = 13
	rarity.TextColor3 = Color3.fromRGB(75, 54, 34)
	rarity.Text = if isCombat then
		(if card.isHero then "영웅 카드" elseif card.isSpecial then "특수 카드" else "전투 카드") .. " · 덱에 보관"
		else (GAIN_RARITY[card.rarity] or "지식") .. " · 서재에 보관"
	rarity.ZIndex = 9
	rarity.Parent = frame
	-- [금박 측면] 팽이 회전 시 세로 축으로 접혔다 펼쳐지는 두께와 반사광을 보이게 한다.
	local foil = Instance.new("Frame")
	foil.Name = "CardFoilEdge"
	foil.AnchorPoint = Vector2.new(1, 0)
	foil.Position = UDim2.fromScale(1, 0)
	foil.Size = UDim2.new(0, 5, 1, 0)
	foil.BackgroundColor3 = gold
	foil.BackgroundTransparency = 0.58
	foil.BorderSizePixel = 0
	foil.ZIndex = 12
	foil.Parent = frame

	-- [봉인 해제] 황동 문장으로 뒷면을 먼저 보여 주고, 가로 축을 좁혔다 펴며 실제 원화를 드러낸다.
	local seal = Instance.new("TextLabel")
	seal.Name = "CardSeal"
	seal.Size = UDim2.fromScale(1, 1)
	seal.BackgroundColor3 = Color3.fromRGB(62, 47, 37)
	seal.BorderSizePixel = 0
	seal.Font = Enum.Font.Antique
	seal.Text = "✦"
	seal.TextSize = 60
	seal.TextColor3 = gold
	seal.ZIndex = 11
	seal.Parent = frame
	corner(seal, 10)
	local sealGradient = Instance.new("UIGradient")
	sealGradient.Color = ColorSequence.new(Color3.fromRGB(103, 72, 49), Color3.fromRGB(44, 39, 41))
	sealGradient.Rotation = 35
	sealGradient.Parent = seal
	-- 기존 승인 뒷면 원화를 실제 양면 회전에 재사용한다(없으면 기존 봉인 문장 유지).
	local backId = AssetIds["CardArt/battle_card_back"]
	local backArt: ImageLabel? = nil
	if backId then
		backArt = Instance.new("ImageLabel")
		backArt.Name = "CardGainBackArt"
		backArt.Size = UDim2.fromScale(1, 1)
		backArt.BackgroundTransparency = 1
		backArt.Image = "rbxassetid://" .. tostring(backId)
		backArt.ScaleType = Enum.ScaleType.Stretch
		backArt.ZIndex = 11
		backArt.Parent = seal
		corner(backArt, 10)
		seal.TextTransparency = 1
	end

	local spotlightName = Instance.new("TextLabel")
	spotlightName.Name = "CardGainTitle"
	spotlightName.AnchorPoint = Vector2.new(0.5, 0)
	spotlightName.Position = UDim2.new(0.5, 0, 0.46, math.floor(revealHeight * 0.5) + 5)
	spotlightName.Size = UDim2.new(0.88, 0, 0, 38)
	spotlightName.BackgroundTransparency = 1
	spotlightName.Font = Enum.Font.GothamBold
	spotlightName.TextSize = if rarityLevel >= 2 then 25 else 22
	spotlightName.TextColor3 = gold
	spotlightName.TextStrokeColor3 = Color3.fromRGB(33, 25, 18)
	spotlightName.TextStrokeTransparency = 0.74
	spotlightName.TextWrapped = true
	spotlightName.TextTruncate = Enum.TextTruncate.AtEnd
	spotlightName.Text = tostring(card.name or "새 카드")
	spotlightName.TextTransparency = 1
	spotlightName.ZIndex = 12
	spotlightName.Parent = g

	local rings = {}
	for i = 1, 2 + (if rarityLevel >= 3 then 2 elseif rarityLevel >= 2 then 1 else 0) do
		local ring = Instance.new("Frame")
		ring.Name = "DiscoveryHalo"
		ring.AnchorPoint = Vector2.new(0.5, 0.5)
		ring.Position = center
		ring.Size = UDim2.fromOffset(85, 85)
		ring.BackgroundTransparency = 1
		ring.ZIndex = 6
		ring.Parent = g
		corner(ring, 100)
		local stroke = Instance.new("UIStroke")
		stroke.Color = gold
		stroke.Thickness = if i == 1 then 3.5 else 1.5
		stroke.Transparency = 0.08
		stroke.Parent = ring
		table.insert(rings, { ring, stroke })
	end
	local caption = Instance.new("TextLabel")
	caption.Name = "CardAcquired"
	caption.AnchorPoint = Vector2.new(0.5, 0)
	local captionY = -math.floor(revealHeight * 0.5) - 38
	caption.Position = UDim2.new(0.5, 0, 0.46, captionY - 3)
	caption.Size = UDim2.new(0.92, 0, 0, 36)
	caption.BackgroundTransparency = 1
	caption.Font = Enum.Font.GothamBold
	caption.TextSize = 19
	caption.TextColor3 = gold
	caption.TextStrokeColor3 = Color3.fromRGB(18, 15, 12)
	caption.TextStrokeTransparency = 0.82
	local headline = if card.isDuplicate then "카드 추가 획득!" elseif isCombat then "새 전투 카드 획득!" else "새 지식 발견!"
	caption.Text = if (moreCount or 0) > 0 then string.format("%s · 추가 %d장", headline, moreCount) else headline
	caption.ZIndex = 10
	caption.Parent = g

	local sparkleCount = if reducedMotion then 0 elseif viewport.X < 540 or viewport.Y < 480 then 4 + rarityLevel * 2 else 6 + rarityLevel * 3
	for i = 1, sparkleCount do
		local angle = (i - 1) * math.pi * 2 / sparkleCount
		local glint = Instance.new("TextLabel")
		glint.Name = "CardSparkle"
		glint.AnchorPoint = Vector2.new(0.5, 0.5)
		glint.Position = center
		glint.Size = UDim2.fromOffset(23, 23)
		glint.BackgroundTransparency = 1
		glint.Font = Enum.Font.GothamBold
		glint.Text = "✦"
		glint.TextSize = if i % 2 == 0 then 18 else 25
		glint.TextColor3 = gold
		glint.ZIndex = 7
		glint.Parent = g
		TS:Create(glint, TweenInfo.new(0.85, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
			Position = UDim2.new(0.5, math.cos(angle) * (110 + rarityLevel * 12), 0.46, math.sin(angle) * (94 + rarityLevel * 8)),
			TextTransparency = 1,
		}):Play()
	end

	-- [화려한 획득 · 2026-11-28 오너] 등급별 예고 빛·전면 섬광·흔들림·홀로그램 광택·색종이·등급 도장.
	if H.cardGainFlair then
		pcall(H.cardGainFlair, { g = g, frame = frame, center = center, level = rarityLevel, tone = tone, gold = gold,
			w = revealWidth, h = revealHeight, reduced = reducedMotion, viewport = viewport, combat = isCombat, hero = card.isHero == true })
	end
	-- [효과음] 기존 등록 음원만 사용하며 모바일에서 과도하게 중첩하지 않는다.
	Sfx.play("sfx_card_deal", 0.35, 1.05, "sfx_book_turn")
	if rarityLevel >= 2 then Sfx.play("sfx_card_ring", 0.24, 0.92 + rarityLevel * 0.025, "sfx_card_coin") end
	TS:Create(frame, TweenInfo.new(0.36, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
		Size = UDim2.fromOffset(revealWidth, revealHeight),
	}):Play()
	for i, pair in rings do
		TS:Create(pair[1], TweenInfo.new(0.85 + i * 0.13, Enum.EasingStyle.Quart), {
			Size = UDim2.fromOffset(190 + i * (32 + rarityLevel * 6), 190 + i * (32 + rarityLevel * 6)),
		}):Play()
		TS:Create(pair[2], TweenInfo.new(0.9 + i * 0.15), { Transparency = 1 }):Play()
	end
	TS:Create(caption, TweenInfo.new(0.47, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Position = UDim2.new(0.5, 0, 0.46, captionY),
	}):Play()

	task.delay(0.37, function()
		if not frame.Parent then return end
		TS:Create(frame, TweenInfo.new(0.13, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
			Size = UDim2.fromOffset(6, revealHeight),
		}):Play()
		task.delay(0.14, function()
			if not frame.Parent then return end
			seal.Visible = false
			-- [공개 충격파] 카드가 펼쳐지는 바로 그 순간 황동 문장 파편이 튀고 한 번 크게 울린다.
			Sfx.play("sfx_card_page", 0.32, 1.13, "sfx_book_turn")
			if rarityLevel >= 2 then
				Sfx.play("sfx_card_magic", if rarityLevel >= 3 then 0.40 else 0.25, 1.05, "sfx_bell")
			end
			if rarityLevel >= 3 then
				task.delay(0.18, function()
					if g.Parent then Sfx.play("sfx_fanfare", if rarityLevel == 4 then 0.64 else 0.40, 1.02) end
				end)
			end
			if not reducedMotion then
				local impact = Instance.new("Frame")
				impact.Name = "CardSealShockwave"
				impact.AnchorPoint = Vector2.new(0.5, 0.5)
				impact.Position = center
				impact.Size = UDim2.fromOffset(32, 32)
				impact.BackgroundTransparency = 1
				impact.ZIndex = 7
				impact.Parent = g
				corner(impact, 100)
				local outline = Instance.new("UIStroke")
				outline.Color = gold
				outline.Thickness = if rarityLevel >= 3 then 4 else 2.5
				outline.Transparency = 0.12
				outline.Parent = impact
				TS:Create(impact, TweenInfo.new(0.52, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
					Size = UDim2.fromOffset(math.floor(revealHeight * 1.5), math.floor(revealHeight * 1.5)),
				}):Play()
				TS:Create(outline, TweenInfo.new(0.52), { Transparency = 1 }):Play()
				local fragments = (if viewport.X < 540 then 5 else 8) + (if rarityLevel >= 3 then 3 else 0)
				for i = 1, fragments do
					local shard = Instance.new("TextLabel")
					shard.Name = "CardSealFragment"
					shard.AnchorPoint = Vector2.new(0.5, 0.5)
					shard.Position = center
					shard.Size = UDim2.fromOffset(17, 17)
					shard.BackgroundTransparency = 1
					shard.Text = "✦"
					shard.Font = Enum.Font.GothamBold
					shard.TextSize = if i % 2 == 0 then 14 else 20
					shard.TextColor3 = gold
					shard.ZIndex = 10
					shard.Parent = g
					local angle = i * math.pi * 2 / fragments
					TS:Create(shard, TweenInfo.new(0.52, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
						Position = UDim2.new(center.X.Scale, math.cos(angle) * (86 + rarityLevel * 9),
							center.Y.Scale, math.sin(angle) * (110 + rarityLevel * 12)),
						Rotation = math.deg(angle) + 90,
						TextTransparency = 1,
					}):Play()
				end
			end
			TS:Create(frame, TweenInfo.new(0.27, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
				Size = UDim2.fromOffset(revealWidth, revealHeight),
			}):Play()
			TS:Create(art, TweenInfo.new(0.25), { ImageTransparency = 0 }):Play()
			TS:Create(spotlightName, TweenInfo.new(0.28), { TextTransparency = 0 }):Play()
			local sheen = Instance.new("Frame")
			sheen.Name = "CardLightSweep"
			sheen.Position = UDim2.fromOffset(-36, 0)
			sheen.Size = UDim2.new(0, 23, 1, 0)
			sheen.Rotation = 13
			sheen.BorderSizePixel = 0
			sheen.BackgroundColor3 = Color3.fromRGB(255, 249, 221)
			sheen.BackgroundTransparency = 0.69
			sheen.ZIndex = 10
			sheen.Parent = frame
			TS:Create(sheen, TweenInfo.new(0.48, Enum.EasingStyle.Quad), {
				Position = UDim2.new(1, 36, 0, 0), BackgroundTransparency = 1,
			}):Play()
			-- [공개 무게감] 가볍게 부풀었다가 정규 7:10 비율로 정확히 돌아오는 한 박자.
			if not reducedMotion then
				task.delay(0.22, function()
					if not frame.Parent then return end
					TS:Create(frame, TweenInfo.new(0.12, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
						Size = UDim2.fromOffset(math.floor(revealWidth * 1.07), math.floor(revealHeight * 1.07)),
					}):Play()
					task.delay(0.13, function()
						if frame.Parent then
							TS:Create(frame, TweenInfo.new(0.19, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
								Size = UDim2.fromOffset(revealWidth, revealHeight),
							}):Play()
						end
					end)
				end)
			end
		end)
	end)
	-- [팽이 수납 · 메인] 원화 공개 후 가속 회전·곡선 축소·잔상을 거쳐 기존 서재/내 카드 버튼으로 흡수한다.
	-- 별도 UI 시스템·음원·저장 경로를 만들지 않으며, 움직임 감소 설정과 모바일 도크 스크롤을 존중한다.
	task.delay(1.65, function()
		if not g.Parent or not frame.Parent then return end
		local icon = if isCombat then hudTop:FindFirstChild("DeckButton", true) else H.dockButtons and (H.dockButtons.scholar or H.dockButtons.codex)
		local canTarget = icon and icon.Parent and icon.Visible and hudTopGui.Enabled and icon.AbsoluteSize.X > 0
		-- [모바일 서재] 가로 도크에 가려진 서재 버튼은 기존 스크롤만 움직여 수납 목적지를 보여 준다.
		if canTarget and not isCombat and icon:IsDescendantOf(dock) then
			local left = dock.AbsolutePosition.X
			local right = left + dock.AbsoluteSize.X
			local iconX = icon.AbsolutePosition.X + icon.AbsoluteSize.X * 0.5
			if iconX < left + 22 or iconX > right - 22 then
				local maxScroll = math.max(0, dock.AbsoluteCanvasSize.X - dock.AbsoluteSize.X)
				local desired = math.clamp(dock.CanvasPosition.X + iconX - (left + dock.AbsoluteSize.X * 0.68), 0, maxScroll)
				TS:Create(dock, TweenInfo.new(0.26, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
					CanvasPosition = Vector2.new(desired, dock.CanvasPosition.Y),
				}):Play()
			end
		end

		local startPoint = Vector2.new(viewport.X * center.X.Scale, viewport.Y * center.Y.Scale)
		local fallbackPoint = Vector2.new(viewport.X - 44, 70)
		local revolutions = if rarityLevel >= 4 then 4 elseif rarityLevel >= 3 then 3
			elseif rarityLevel >= 2 then 3 else 2
		local trails, ribbons, orbit = {}, {}, {}
		if not reducedMotion then
			-- [빛 궤적] 카드 바퀴 뒤에서 길게 휘어지는 황동빛 선과 주변의 작은 마법 문장.
			for i = 1, if viewport.X < 540 then 2 else 3 do
				local ribbon = Instance.new("Frame")
				ribbon.Name = "CardArchiveLightRibbon"
				ribbon.AnchorPoint = Vector2.new(0.5, 0.5)
				ribbon.Position = center
				ribbon.Size = UDim2.fromOffset(2, 3)
				ribbon.BackgroundColor3 = gold
				ribbon.BackgroundTransparency = 1
				ribbon.BorderSizePixel = 0
				ribbon.ZIndex = 6
				ribbon.Parent = g
				corner(ribbon, 100)
				table.insert(ribbons, ribbon)
			end
			local motes = if viewport.X < 540 then (if rarityLevel >= 3 then 5 else 3)
				else (if rarityLevel >= 3 then 7 else 5)
			for i = 1, motes do
				local light = Instance.new("TextLabel")
				light.Name = "CardArchiveOrbit"
				light.AnchorPoint = Vector2.new(0.5, 0.5)
				light.Position = center
				light.Size = UDim2.fromOffset(20, 20)
				light.BackgroundTransparency = 1
				light.Font = Enum.Font.GothamBold
				light.Text = "✦"
				light.TextSize = if i % 2 == 0 then 12 else 18
				light.TextColor3 = gold
				light.ZIndex = 10
				light.Parent = g
				table.insert(orbit, light)
			end
			for i = 1, if viewport.X < 540 then 2 else 3 do
				local ghost = Instance.new("Frame")
				ghost.Name = "CardSpinAfterimage"
				ghost.AnchorPoint = Vector2.new(0.5, 0.5)
				ghost.Position = center
				ghost.Size = UDim2.fromOffset(revealWidth, revealHeight)
				ghost.BackgroundTransparency = 1
				ghost.ZIndex = 7
				ghost.Parent = g
				corner(ghost, 8)
				local outline = Instance.new("UIStroke")
				outline.Color = gold
				outline.Thickness = if rarityLevel >= 3 then 2.5 else 1.7
				outline.Transparency = 0.55 + i * 0.11
				outline.Parent = ghost
				table.insert(trails, { ghost, outline })
			end
		end
		Sfx.play("sfx_card_swing", 0.34, 1.05, "sfx_card_deal")
		if not reducedMotion then
			task.delay(0.32, function()
				if g.Parent then Sfx.play("sfx_card_page", 0.18, 1.22, "sfx_card_deal") end
			end)
		end
		TS:Create(caption, TweenInfo.new(0.32), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
		TS:Create(spotlightName, TweenInfo.new(0.3), { TextTransparency = 1 }):Play()

		local progress = Instance.new("NumberValue")
		progress.Name = "CardArchiveProgress"
		progress.Parent = g
		local changed = progress.Changed:Connect(function(value)
			if not g.Parent or not frame.Parent then return end
			local t = math.clamp(value, 0, 1)
			-- 도크가 펼쳐지거나 스크롤되는 동안에도 버튼의 실제 화면 좌표를 매 프레임 따라간다.
			local target = fallbackPoint
			if canTarget and icon.Parent and icon.Visible and hudTopGui.Enabled then
				target = icon.AbsolutePosition + icon.AbsoluteSize * 0.5
			end
			local bend = math.min(86, viewport.Y * 0.13)
			local control = Vector2.new(
				startPoint.X + (target.X - startPoint.X) * 0.40,
				math.min(startPoint.Y, target.Y) - bend)
			local current = if reducedMotion then startPoint:Lerp(target, t)
				else startPoint * ((1 - t) ^ 2) + control * (2 * (1 - t) * t) + target * (t ^ 2)
			local spin = if reducedMotion then 0 else revolutions * 360 * t
			local scale = math.max(0.035, (1 - t) ^ 1.35)
			-- 동전처럼 선 상태로 세로축 회전: 옆면에서는 폭만 좁아지고 앞/뒷면이 교대된다.
			local facing = math.cos(math.rad(spin))
			local widthRipple = if reducedMotion then 1 else math.max(0.035, math.abs(facing))
			seal.Visible = not reducedMotion and facing < 0
			seal.BackgroundTransparency = math.clamp((t - 0.72) / 0.28, 0, 1)
			if backArt then backArt.ImageTransparency = seal.BackgroundTransparency end
			frame.Position = UDim2.fromOffset(current.X, current.Y)
			frame.Size = UDim2.fromOffset(
				math.max(2, math.floor(revealWidth * scale * widthRipple)),
				math.max(3, math.floor(revealHeight * scale)))
			frame.Rotation = 0
			paper.Rotation = 90
			foil.Size = UDim2.new(0, math.max(1, math.min(frame.Size.X.Offset, math.floor((3 + (1 - widthRipple) * 9) * scale))), 1, 0)
			foil.AnchorPoint = Vector2.new(if math.sin(math.rad(spin)) >= 0 then 1 else 0, 0)
			foil.Position = UDim2.fromScale(foil.AnchorPoint.X, 0)
			foil.BackgroundTransparency = math.clamp(0.34 + t * 0.65, 0, 1)
			frame.BackgroundTransparency = math.clamp((t - 0.72) / 0.28, 0, 1)
			art.ImageTransparency = math.clamp((t - 0.74) / 0.26, 0, 1)
			rim.Transparency = math.clamp((t - 0.70) / 0.30, 0, 1)
			name.TextTransparency = math.clamp((t - 0.36) / 0.42, 0, 1)
			rarity.TextTransparency = name.TextTransparency
			for i, light in orbit do
				local angle = (i - 1) * math.pi * 2 / #orbit + math.rad(spin * 1.35)
				local radius = math.max(4, revealWidth * scale * 0.69)
				light.Position = UDim2.fromOffset(
					current.X + math.cos(angle) * radius,
					current.Y + math.sin(angle) * radius * 1.18)
				light.Rotation = spin * 0.62
				light.TextTransparency = math.clamp(0.15 + t * 0.74, 0, 1)
			end
			for i, ribbon in ribbons do
				local a = math.max(0, t - (i - 1) * 0.046)
				local b = math.max(0, t - i * 0.046)
				local pa = startPoint * ((1 - a) ^ 2) + control * (2 * (1 - a) * a) + target * (a ^ 2)
				local pb = startPoint * ((1 - b) ^ 2) + control * (2 * (1 - b) * b) + target * (b ^ 2)
				local delta = pa - pb
				ribbon.Position = UDim2.fromOffset((pa.X + pb.X) * 0.5, (pa.Y + pb.Y) * 0.5)
				ribbon.Size = UDim2.fromOffset(math.max(1, delta.Magnitude), math.max(1, 6 - i))
				ribbon.Rotation = math.deg(math.atan2(delta.Y, delta.X))
				ribbon.BackgroundTransparency = if a <= b then 1 else math.clamp(0.28 + i * 0.13 + t * 0.25, 0, 1)
			end
			for i, pair in trails do
				local lag = math.max(0, t - i * 0.09)
				local echoPos = startPoint * ((1 - lag) ^ 2) + control * (2 * (1 - lag) * lag) + target * (lag ^ 2)
				pair[1].Position = UDim2.fromOffset(echoPos.X, echoPos.Y)
				pair[1].Size = UDim2.fromOffset(
					math.max(2, math.floor(revealWidth * (1 - lag) ^ 1.35 * math.max(0.035, math.abs(math.cos(revolutions * 2 * math.pi * lag))))),
					math.max(3, math.floor(revealHeight * (1 - lag) ^ 1.35)))
				pair[1].Rotation = 0
				pair[2].Transparency = math.clamp(0.55 + i * 0.11 + t * 0.20, 0, 1)
			end
		end)
		local flight = TS:Create(progress, TweenInfo.new(
			if reducedMotion then 0.38 else 0.90, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Value = 1 })
		flight.Completed:Once(function()
			changed:Disconnect()
			progress:Destroy()
			if not g.Parent then return end
			frame.Visible = false
			for _, pair in trails do pair[1]:Destroy() end
			for _, ribbon in ribbons do ribbon:Destroy() end
			for _, light in orbit do light:Destroy() end
			local landed = fallbackPoint
			if canTarget and icon.Parent and icon.Visible and hudTopGui.Enabled then
				landed = icon.AbsolutePosition + icon.AbsoluteSize * 0.5
			end
			-- [수납 완료] 기존 등록 책장/카드장 효과음과 아이콘 위 황동 파동 1회.
			Sfx.play(if isCombat then "sfx_card_page" else "sfx_book_turn", 0.30, 1.08, "sfx_book_turn")
			task.delay(0.07, Sfx.play, "sfx_quest_book_close", 0.22, 1.15, "sfx_click")
			local pulse = Instance.new("Frame")
			pulse.Name = "CardArchivePulse"
			pulse.AnchorPoint = Vector2.new(0.5, 0.5)
			pulse.Position = UDim2.fromOffset(landed.X, landed.Y)
			pulse.Size = UDim2.fromOffset(20, 20)
			pulse.BackgroundTransparency = 1
			pulse.ZIndex = 13
			pulse.Parent = g
			corner(pulse, 100)
			local pulseStroke = Instance.new("UIStroke")
			pulseStroke.Color = gold
			pulseStroke.Thickness = if rarityLevel >= 3 then 3.5 else 2.5
			pulseStroke.Transparency = 0.08
			pulseStroke.Parent = pulse
			TS:Create(pulse, TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
				Size = UDim2.fromOffset(if rarityLevel >= 3 then 96 else 78, if rarityLevel >= 3 then 96 else 78),
			}):Play()
			TS:Create(pulseStroke, TweenInfo.new(0.28), { Transparency = 1 }):Play()
			-- [수납 착지] 기존 메뉴 아이콘이 짧게 숨을 쉬고 작은 기록 문구와 빛점이 남는다.
			if not reducedMotion and canTarget and icon.Parent and icon.Visible and hudTopGui.Enabled then
				local bounce = Instance.new("UIScale")
				bounce.Name = "CardArchiveIconBounce"
				bounce.Scale = 0.94
				bounce.Parent = icon
				TS:Create(bounce, TweenInfo.new(0.17, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
					Scale = 1.16,
				}):Play()
				task.delay(0.18, function()
					if bounce.Parent then
						TS:Create(bounce, TweenInfo.new(0.2, Enum.EasingStyle.Quad), { Scale = 1 }):Play()
					end
				end)
				task.delay(0.45, function()
					if bounce.Parent then bounce:Destroy() end
				end)
			end
			if not reducedMotion then
				for i = 1, if rarityLevel >= 3 then 6 else 3 do
					local spark = Instance.new("TextLabel")
					spark.Name = "CardArchiveLandingSpark"
					spark.AnchorPoint = Vector2.new(0.5, 0.5)
					spark.Position = UDim2.fromOffset(landed.X, landed.Y)
					spark.Size = UDim2.fromOffset(16, 16)
					spark.BackgroundTransparency = 1
					spark.Text = "✦"
					spark.Font = Enum.Font.GothamBold
					spark.TextSize = 16
					spark.TextColor3 = gold
					spark.ZIndex = 14
					spark.Parent = g
					local angle = (i - 1) * math.pi * 2 / (if rarityLevel >= 3 then 6 else 3)
					TS:Create(spark, TweenInfo.new(0.42, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {
						Position = UDim2.fromOffset(landed.X + math.cos(angle) * 42, landed.Y + math.sin(angle) * 42),
						TextTransparency = 1,
					}):Play()
				end
			end
			local stamp = Instance.new("TextLabel")
			stamp.Name = "CardArchivedConfirmation"
			stamp.AnchorPoint = Vector2.new(0.5, 0)
			stamp.Position = UDim2.fromOffset(math.clamp(landed.X, 100, viewport.X - 100), landed.Y + 29)
			stamp.Size = UDim2.fromOffset(190, 28)
			stamp.BackgroundColor3 = Color3.fromRGB(60, 44, 34)
			stamp.BackgroundTransparency = 0.12
			stamp.BorderSizePixel = 0
			stamp.Font = Enum.Font.GothamBold
			stamp.TextSize = 14
			stamp.TextColor3 = gold
			stamp.Text = if isCombat then "✦ 내 카드에 기록됨" else "✦ 서재에 기록됨"
			stamp.TextTransparency = 1
			stamp.ZIndex = 15
			stamp.Parent = g
			corner(stamp, 8)
			TS:Create(stamp, TweenInfo.new(0.14), { TextTransparency = 0 }):Play()
			task.delay(0.45, function()
				if stamp.Parent then
					TS:Create(stamp, TweenInfo.new(0.20), { TextTransparency = 1, BackgroundTransparency = 1 }):Play()
				end
			end)
		end)
		flight:Play()
	end)
	task.delay(3.30, function()
		if g.Parent then g:Destroy() end
	end)
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
						-- [연출씬] 목적지 항로·분위기·길이·수락 도장
						portId = sc.portId, mood = sc.mood, long = sc.long == true, questKind = sc.kind,
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
	if not game:GetService("RunService"):IsStudio() then return end
	local id = workspace:GetAttribute("DevStory")
	if type(id) == "string" and id ~= "" and view then
		task.spawn(function()
			local ev = require(Shared:WaitForChild("Story")).ById[id]
			if ev then
				-- [Studio 이야기 촬영] 원본 장면·선택지는 유지하고 미리보기에서 서버 선택/보상 호출만 차단한다.
				local preview = table.clone(ev)
				preview.submit = function()
					return { ok = false, message = "촬영 미리보기: 선택은 저장하지 않아요." }
				end
				local ok, err = pcall(playStory, preview)
				if not ok then warn("[Game] 이야기 촬영 오류:", err) end
			end
		end)
	end
end)

-- 개발 확인용: 별도 큰 창 대신 현재 교역소의 방문 화면을 연다.
workspace:GetAttributeChangedSignal("DevTradeHall"):Connect(function()
	if workspace:GetAttribute("DevTradeHall") and view then
		openTab("trade")
	end
end)

-- 개발 확인용: workspace 속성 DevCardGain 에 카드 id 를 넣으면 그 카드의 습득 연출을 보여 준다
workspace:GetAttributeChangedSignal("DevCardGain"):Connect(function()
	local id = workspace:GetAttribute("DevCardGain")
	if type(id) ~= "string" or id == "" or not view then return end
	for _, c in (view.codex and view.codex.cards or {}) do
		if c.id == id then
			H.showCardGain(if c.found then c else { id = c.id, name = c.name ~= "???" and c.name or id, field = c.field, rarity = c.rarity, description = c.description, found = true }, 0)
			return
		end
	end
	local CB = require(Shared:WaitForChild("CardBook"))
	local def = CB.def(id)
	if def then
		H.showCardGain({ id = id, name = def.name, rarity = if def.hero then "Legendary" else "Common",
			gainType = "combat", isHero = def.hero == true, isSpecial = CB.isSpecial(id), stageArt = def.stage and def.stage.art }, 0)
	end
end)

-- [도감 획득] 최초 카드부터 이후 카드까지 저장·발견 표시만 갱신한다.
-- 강제 전면 이벤트/사운드/클릭 대기는 없으며, 도감과 덱 상세 기능은 그대로 이용할 수 있다.
-- [이벤트·카드 연출 묶음 · 2026-11-28 오너 지시 '모두 적용, 카드 습득 더 화려하게']
-- 최상위 local 을 늘리지 않도록 모두 H 필드로 둔다. 보상·저장값은 건드리지 않는다.
do
	local TS = game:GetService("TweenService")
	local RARITY_STAMP = { [0] = nil, [1] = nil, [2] = "희귀!", [3] = "영웅급!", [4] = "전설!" }

	-- 사건 원화 찾기: event_<id> → 낱말로 비슷한 원화 → 재해/행운 기본
	local KEYWORDS = {
		{ { "plague", "pox", "fever", "scurvy", "역병", "전염", "천연두", "괴혈" }, "event_plague_wave" },
		{ { "quake", "지진" }, "event_earthquake" },
		{ { "vesuvius", "fuji", "huaynaputina", "volcano", "화산" }, "event_volcano" },
		{ { "fire", "화재", "불" }, "event_harbor_fire" },
		{ { "famine", "흉작", "기근" }, "event_famine" },
		{ { "cyclone", "hurricane", "태풍", "허리케인" }, "event_hurricane" },
		{ { "tsunami", "해일" }, "event_tsunami" },
		{ { "storm", "폭풍" }, "event_storm" },
		{ { "pirate", "piracy", "mutiny", "blockade", "embargo", "uprising", "war", "해적", "반란", "봉쇄", "전쟁" }, "event_piracy" },
		{ { "gold", "silver", "diamant", "boom", "bank", "mocha", "금광", "은", "호황" }, "event_trade_boom" },
		{ { "route", "founded", "nystad", "peace", "treaty", "항로", "조약", "평화" }, "event_new_route" },
		{ { "scholar", "학자", "학회" }, "event_principia" },
		{ { "patron", "charter", "royal", "왕실", "특허" }, "event_royal_charter" },
		{ { "wreck", "cargo", "보물", "난파" }, "event_treasure_wreck" },
		{ { "festival", "축제" }, "event_festival" },
	}
	function H.eventArtFor(id, tag, title, kind)
		local key = tostring(id or "")
		local direct = AssetIds["CardArt/event_" .. key] or AssetIds["CardArt/" .. key]
		if direct and key ~= "" then return direct end
		local text = string.lower(key .. " " .. tostring(tag or "") .. " " .. tostring(title or ""))
		for _, row in KEYWORDS do
			for _, word in row[1] do
				if string.find(text, word, 1, true) and AssetIds["CardArt/" .. row[2]] then return AssetIds["CardArt/" .. row[2]] end
			end
		end
		if kind == "disaster" then return AssetIds["CardArt/event_storm"] end
		if kind == "fortune" then return AssetIds["CardArt/event_calm_seas"] end
		return AssetIds["CardArt/event_chart_world"]
	end

	-- [영화 띠] 위아래 검은 띠가 들어왔다가(지속 dur초) 나간다.
	function H.cinemaBars(layer, dur)
		local bars = {}
		for i, y in { 0, 1 } do
			local bar = Instance.new("Frame")
			bar.Name = "CinemaBar" .. i
			bar.AnchorPoint = Vector2.new(0, y)
			bar.Position = UDim2.fromScale(0, y)
			bar.Size = UDim2.fromScale(1, 0)
			bar.BackgroundColor3 = Color3.new(0, 0, 0)
			bar.BorderSizePixel = 0
			bar.ZIndex = 40
			bar.Parent = layer
			TS:Create(bar, TweenInfo.new(0.35, Enum.EasingStyle.Quad), { Size = UDim2.fromScale(1, 0.09) }):Play()
			table.insert(bars, bar)
		end
		task.delay(dur or 1, function()
			for _, bar in bars do
				if bar.Parent then
					TS:Create(bar, TweenInfo.new(0.4, Enum.EasingStyle.Quad), { Size = UDim2.fromScale(1, 0) }):Play()
					task.delay(0.42, function() if bar.Parent then bar:Destroy() end end)
				end
			end
		end)
	end

	-- [글자 한 자씩] 움직임 줄이기 설정이면 바로 다 보여 준다.
	function H.typewrite(label, text, speed)
		label.Text = text
		if game:GetService("GuiService").ReducedMotionEnabled then return end
		label.MaxVisibleGraphemes = 0
		task.spawn(function()
			local n = utf8.len(text) or #text
			for i = 1, n do
				if not label.Parent then return end
				label.MaxVisibleGraphemes = i
				task.wait(speed or 0.025)
			end
			label.MaxVisibleGraphemes = -1
		end)
	end

	-- [화려한 카드 습득] showCardGain 이 부른다. 카드 뒤집힘(약 0.51초) 순간에 맞춰 터진다.
	function H.cardGainFlair(o)
		local g, frame, level, gold = o.g, o.frame, o.level, o.gold
		if o.hero then level = math.max(level, 4) end
		local flip = 0.51
		local tone = o.tone or gold
		-- 1) 배경 어둡게 + 등급색 후광(비차단 알림이라 입력은 막지 않음)
		local veil = Instance.new("Frame")
		veil.Name = "CardGainVeil"
		veil.Size = UDim2.fromScale(1, 1)
		veil.BackgroundColor3 = Color3.new(0, 0, 0)
		veil.BackgroundTransparency = 1
		veil.BorderSizePixel = 0
		veil.Active = false
		veil.ZIndex = 1
		veil.Parent = g
		local grad = Instance.new("UIGradient")
		grad.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.35), NumberSequenceKeypoint.new(0.5, 1), NumberSequenceKeypoint.new(1, 0.35) })
		grad.Parent = veil
		TS:Create(veil, TweenInfo.new(0.3), { BackgroundTransparency = if level >= 3 then 0.35 elseif level >= 2 then 0.5 else 0.68 }):Play()
		task.delay(2.6, function()
			if veil.Parent then TS:Create(veil, TweenInfo.new(0.4), { BackgroundTransparency = 1 }):Play() end
		end)
		-- 2) 뒤집기 전 예고: 등급색 맥동 고리(희귀 이상)
		if level >= 2 and not o.reduced then
			for i = 1, level - 1 do
				task.delay((i - 1) * 0.12, function()
					if not g.Parent then return end
					local pulse = Instance.new("Frame")
					pulse.Name = "CardRarityPulse"
					pulse.AnchorPoint = Vector2.new(0.5, 0.5)
					pulse.Position = o.center
					pulse.Size = UDim2.fromOffset(o.w * 0.6, o.h * 0.6)
					pulse.BackgroundTransparency = 1
					pulse.ZIndex = 6
					pulse.Parent = g
					corner(pulse, 18)
					local st = Instance.new("UIStroke")
					st.Color = tone
					st.Thickness = 5
					st.Transparency = 0.1
					st.Parent = pulse
					TS:Create(pulse, TweenInfo.new(0.5, Enum.EasingStyle.Quad), { Size = UDim2.fromOffset(o.w * 1.25, o.h * 1.2) }):Play()
					TS:Create(st, TweenInfo.new(0.5), { Transparency = 1 }):Play()
					task.delay(0.55, function() pulse:Destroy() end)
				end)
			end
		end
		task.delay(flip, function()
			if not g.Parent then return end
			-- 3) 전면 섬광(등급색, 전설은 흰빛)
			if level >= 2 and not o.reduced then
				local flash = Instance.new("Frame")
				flash.Name = "CardGainFlash"
				flash.Size = UDim2.fromScale(1, 1)
				flash.BackgroundColor3 = if level >= 4 then Color3.fromRGB(255, 250, 230) else tone
				flash.BackgroundTransparency = if level >= 4 then 0.48 else 0.62
				flash.BorderSizePixel = 0
				flash.ZIndex = 30
				flash.Parent = g
				TS:Create(flash, TweenInfo.new(if level >= 4 then 0.6 else 0.35), { BackgroundTransparency = 1 }):Play()
				task.delay(0.65, function() flash:Destroy() end)
			end
			-- 4) 흔들림(영웅급 이상)
			if level >= 3 and not o.reduced and frame.Parent then
				local base = frame.Position
				task.spawn(function()
					for i = 1, 7 do
						if not frame.Parent then return end
						local amp = (8 - i) * (if level >= 4 then 2.2 else 1.4)
						frame.Position = base + UDim2.fromOffset(math.random(-10, 10) / 10 * amp, math.random(-10, 10) / 10 * amp)
						task.wait(0.035)
					end
					if frame.Parent then frame.Position = base end
				end)
			end
			-- 5) 홀로그램 광택(영웅급 이상): 무지개 띠가 카드 위를 한 번 쓸고 지나간다
			if level >= 3 and frame.Parent then
				local holo = Instance.new("Frame")
				holo.Name = "CardHoloSheen"
				holo.Size = UDim2.fromScale(1, 1)
				holo.BackgroundColor3 = Color3.new(1, 1, 1)
				holo.BackgroundTransparency = 0.55
				holo.BorderSizePixel = 0
				holo.ZIndex = 10
				holo.Parent = frame
				local hg = Instance.new("UIGradient")
				hg.Color = ColorSequence.new({
					ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 120, 160)), ColorSequenceKeypoint.new(0.25, Color3.fromRGB(255, 230, 120)),
					ColorSequenceKeypoint.new(0.5, Color3.fromRGB(130, 255, 200)), ColorSequenceKeypoint.new(0.75, Color3.fromRGB(120, 180, 255)),
					ColorSequenceKeypoint.new(1, Color3.fromRGB(220, 140, 255)),
				})
				hg.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.45, 0.35), NumberSequenceKeypoint.new(0.55, 0.35), NumberSequenceKeypoint.new(1, 1) })
				hg.Offset = Vector2.new(-1, 0)
				hg.Rotation = 25
				hg.Parent = holo
				TS:Create(hg, TweenInfo.new(0.9, Enum.EasingStyle.Quad), { Offset = Vector2.new(1, 0) }):Play()
				task.delay(0.95, function() holo:Destroy() end)
			end
			-- 6) 색종이·금가루(희귀 이상, 전설은 많이)
			if level >= 2 and not o.reduced then
				local small = o.viewport.X < 540 or o.viewport.Y < 480
				local count = (if level >= 4 then 30 elseif level >= 3 then 20 else 10) // (if small then 2 else 1)
				local palette = { gold, tone, Color3.fromRGB(255, 255, 255), Color3.fromRGB(255, 196, 92) }
				for i = 1, count do
					local bit = Instance.new("Frame")
					bit.Name = "CardConfetti"
					bit.AnchorPoint = Vector2.new(0.5, 0.5)
					local x = math.random(5, 95) / 100
					bit.Position = UDim2.fromScale(x, -0.03)
					bit.Size = UDim2.fromOffset(math.random(5, 9), math.random(9, 15))
					bit.BackgroundColor3 = palette[(i % #palette) + 1]
					bit.BorderSizePixel = 0
					bit.Rotation = math.random(0, 180)
					bit.ZIndex = 20
					bit.Parent = g
					local fall = 1.4 + math.random() * 1.1
					TS:Create(bit, TweenInfo.new(fall, Enum.EasingStyle.Sine, Enum.EasingDirection.In), {
						Position = UDim2.fromScale(x + (math.random() - 0.5) * 0.18, 1.04),
						Rotation = bit.Rotation + math.random(180, 540),
					}):Play()
					task.delay(fall + 0.05, function() bit:Destroy() end)
				end
			end
			-- 7) 등급 도장(희귀 이상): 크게 찍혔다가 카드 모서리에 남는다
			local stampText = RARITY_STAMP[level]
			if o.combat and o.hero then stampText = "영웅!" end
			if stampText and frame.Parent then
				local stamp = Instance.new("TextLabel")
				stamp.Name = "CardRarityStamp"
				stamp.AnchorPoint = Vector2.new(0.5, 0.5)
				stamp.Position = UDim2.new(o.center.X.Scale, math.min(o.w * 0.36, o.viewport.X * 0.30), o.center.Y.Scale, -o.h * 0.36)
				stamp.Size = UDim2.fromOffset(150, 56)
				stamp.BackgroundColor3 = Color3.fromRGB(120, 24, 20)
				stamp.BackgroundTransparency = 0.05
				stamp.BorderSizePixel = 0
				stamp.Font = Enum.Font.GothamBlack
				stamp.Text = stampText
				stamp.TextColor3 = Color3.fromRGB(255, 236, 190)
				stamp.TextScaled = true
				stamp.Rotation = -14
				stamp.ZIndex = 25
				stamp.Parent = g
				corner(stamp, 8)
				local ss = Instance.new("UIStroke")
				ss.Color = gold
				ss.Thickness = 2
				ss.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
				ss.Parent = stamp
				local sc = Instance.new("UIScale")
				sc.Scale = 2.6
				sc.Parent = stamp
				TS:Create(sc, TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = if o.viewport.X < 540 then 0.7 else 0.85 }):Play()
				task.delay(0.24, function() Sfx.play("sfx_card_coin", 0.35, 0.8) end)
				task.delay(1.0, function()
					if stamp.Parent then TS:Create(stamp, TweenInfo.new(0.3), { TextTransparency = 1, BackgroundTransparency = 1 }):Play() ; TS:Create(ss, TweenInfo.new(0.3), { Transparency = 1 }):Play() end
				end)
			end
			-- 8) 느리게 도는 빛살(전설): 기존 빛살 위에 한 바퀴 반
			if level >= 4 and not o.reduced then
				local spin = Instance.new("Frame")
				spin.Name = "LegendRaySpin"
				spin.AnchorPoint = Vector2.new(0.5, 0.5)
				spin.Position = o.center
				spin.Size = UDim2.fromOffset(o.h * 1.9, o.h * 1.9)
				spin.BackgroundTransparency = 1
				spin.ZIndex = 4
				spin.Parent = g
				for i = 1, 8 do
					local ray = Instance.new("Frame")
					ray.AnchorPoint = Vector2.new(0.5, 0.5)
					ray.Position = UDim2.fromScale(0.5, 0.5)
					ray.Size = UDim2.new(0, 14, 1, 0)
					ray.Rotation = i * 22.5
					ray.BackgroundColor3 = gold
					ray.BackgroundTransparency = 0.72
					ray.BorderSizePixel = 0
					ray.ZIndex = 4
					ray.Parent = spin
					local rg = Instance.new("UIGradient")
					rg.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(0.5, 0), NumberSequenceKeypoint.new(1, 1) })
					rg.Rotation = 90
					rg.Parent = ray
				end
				TS:Create(spin, TweenInfo.new(2.2, Enum.EasingStyle.Linear), { Rotation = 140 }):Play()
				task.delay(1.6, function()
					for _, r in spin:GetChildren() do
						if r:IsA("Frame") then TS:Create(r, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play() end
					end
				end)
			end
		end)
	end

	-- 카드 원화 이미지 찾기(습득 연출과 같은 규칙)
	local function cardImage(card)
		local id = AssetIds["CardArt/" .. tostring(card.id)]
		if id then return "rbxassetid://" .. tostring(id) end
		if type(card.image) == "string" and card.image ~= "" then return card.image end
		if type(card.stageArt) == "string" and AssetIds[card.stageArt] then return "rbxassetid://" .. tostring(AssetIds[card.stageArt]) end
		return ""
	end
	local function miniCard(parent, card, w)
		local h = math.floor(w / 0.7)
		local f = Instance.new("Frame")
		f.AnchorPoint = Vector2.new(0.5, 0.5)
		f.Size = UDim2.fromOffset(w, h)
		f.BackgroundColor3 = Color3.fromRGB(234, 212, 166)
		f.BorderSizePixel = 0
		f.ZIndex = 12
		f.Parent = parent
		corner(f, 8)
		local st = Instance.new("UIStroke")
		st.Color = ({ Rare = Color3.fromRGB(90, 150, 230), Epic = Color3.fromRGB(180, 110, 230), Legendary = Color3.fromRGB(245, 200, 80) })[card.rarity]
			or Color3.fromRGB(205, 170, 105)
		st.Thickness = if card.rarity == "Legendary" or card.isHero then 3.5 else 2.5
		st.Parent = f
		local img = Instance.new("ImageLabel")
		img.BackgroundTransparency = 1
		img.Position = UDim2.fromOffset(5, 5)
		img.Size = UDim2.new(1, -10, 1, -30)
		img.Image = cardImage(card)
		img.ScaleType = Enum.ScaleType.Crop
		img.ZIndex = 13
		img.Parent = f
		local nm = Instance.new("TextLabel")
		nm.BackgroundTransparency = 1
		nm.Position = UDim2.new(0, 4, 1, -24)
		nm.Size = UDim2.new(1, -8, 0, 20)
		nm.Font = Enum.Font.GothamBold
		nm.TextScaled = true
		nm.TextColor3 = Color3.fromRGB(52, 36, 24)
		nm.Text = tostring(card.name or "새 카드")
		nm.ZIndex = 13
		nm.Parent = f
		local back = Instance.new("TextLabel")
		back.Name = "MiniCardBack"
		back.Size = UDim2.fromScale(1, 1)
		back.BackgroundColor3 = Color3.fromRGB(62, 47, 37)
		back.BorderSizePixel = 0
		back.Font = Enum.Font.Antique
		back.Text = "✦"
		back.TextScaled = true
		back.TextColor3 = Color3.fromRGB(255, 217, 124)
		back.ZIndex = 14
		back.Parent = f
		corner(back, 8)
		return f, back
	end

	-- [여러 장 부채꼴] 3~5장을 펼쳐 차례로 뒤집고 서재/덱으로 날려 보낸다.
	function H.showCardFan(batch)
		local pg = player:WaitForChild("PlayerGui")
		local old = pg:FindFirstChild("CardFan")
		if old then old:Destroy() end
		local g = overlayGui("CardFan", 95)
		g:SetAttribute("NonBlockingCardNotice", true)
		local vp = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600)
		local w = math.floor(math.clamp(vp.X / (#batch + 2.2), 70, 130))
		local title = Instance.new("TextLabel")
		title.AnchorPoint = Vector2.new(0.5, 0)
		title.Position = UDim2.fromScale(0.5, 0.16)
		title.Size = UDim2.new(0.9, 0, 0, 40)
		title.BackgroundTransparency = 1
		title.Font = Enum.Font.GothamBlack
		title.TextSize = 26
		title.TextColor3 = Color3.fromRGB(255, 217, 124)
		title.TextStrokeTransparency = 0.6
		title.Text = string.format("카드 %d장 획득!", #batch)
		title.ZIndex = 15
		-- [겹침 수정] 뒤 메뉴 글자와 섞이지 않게 어두운 띠 위에 쓴다
		title.Size = UDim2.new(0, 300, 0, 44)
		title.BackgroundColor3 = Color3.fromRGB(40, 28, 18)
		title.BackgroundTransparency = 0.15
		corner(title, 12)
		title.Parent = g
		Sfx.play("sfx_card_deal", 0.4, 1)
		local n = #batch
		for i, entry in batch do
			local f, back = miniCard(g, entry.card, w)
			local t = (i - (n + 1) / 2)
			f.Position = UDim2.fromScale(0.5, 1.2)
			f.Rotation = 0
			TS:Create(f, TweenInfo.new(0.42 + i * 0.06, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {
				Position = UDim2.new(0.5, t * w * 0.82, 0.52, math.abs(t) * w * 0.12),
				Rotation = t * 9,
			}):Play()
			task.delay(0.7 + i * 0.22, function()
				if not back.Parent then return end
				TS:Create(f, TweenInfo.new(0.1), { Size = UDim2.fromOffset(4, math.floor(w / 0.7)) }):Play()
				task.delay(0.1, function()
					if back.Parent then back:Destroy() end
					Sfx.play("sfx_card_page", 0.22, 1.05 + i * 0.04)
					TS:Create(f, TweenInfo.new(0.18, Enum.EasingStyle.Back), { Size = UDim2.fromOffset(w, math.floor(w / 0.7)) }):Play()
				end)
			end)
			task.delay(2.4 + i * 0.05, function()
				if not f.Parent then return end
				local icon = if entry.card.gainType == "combat" then hudTop:FindFirstChild("DeckButton", true) else H.dockButtons and (H.dockButtons.scholar or H.dockButtons.codex)
				local target = if icon and icon.Parent and icon.AbsoluteSize.X > 0 then icon.AbsolutePosition + icon.AbsoluteSize / 2 else Vector2.new(vp.X - 44, 70)
				TS:Create(f, TweenInfo.new(0.45, Enum.EasingStyle.Quad, Enum.EasingDirection.In), {
					Position = UDim2.fromOffset(target.X, target.Y), Size = UDim2.fromOffset(12, 17), Rotation = 360,
				}):Play()
			end)
		end
		task.delay(3.1, function() if g.Parent then g:Destroy() end end)
	end

	-- [중복 카드 +1] 오른쪽에서 작은 카드가 미끄러져 들어와 '+N' 을 보여 주고 사라진다.
	function H.showCardPlusOne(card, count)
		local pg = player:WaitForChild("PlayerGui")
		local g = pg:FindFirstChild("CardPlusOne") or overlayGui("CardPlusOne", 94)
		g:SetAttribute("NonBlockingCardNotice", true)
		local f = miniCard(g, card, 62)
		local back = f:FindFirstChild("MiniCardBack")
		if back then back:Destroy() end
		f.Position = UDim2.new(1, 60, 0.3, 0)
		local plus = Instance.new("TextLabel")
		plus.AnchorPoint = Vector2.new(1, 0.5)
		plus.Position = UDim2.new(0, -6, 0.5, 0)
		plus.Size = UDim2.fromOffset(70, 34)
		plus.BackgroundTransparency = 1
		plus.Font = Enum.Font.GothamBlack
		plus.TextSize = 28
		plus.TextXAlignment = Enum.TextXAlignment.Right
		plus.TextColor3 = Color3.fromRGB(255, 217, 124)
		plus.TextStrokeTransparency = 0.4
		plus.Text = "+" .. tostring(count or 1)
		plus.ZIndex = 15
		plus.Parent = f
		Sfx.play("sfx_card_coin", 0.3, 1.15)
		TS:Create(f, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Position = UDim2.new(1, -54, 0.3, 0) }):Play()
		task.delay(1.1, function()
			if f.Parent then
				TS:Create(f, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.In), { Position = UDim2.new(1, 60, 0.3, 0) }):Play()
				task.delay(0.27, function() f:Destroy() end)
			end
		end)
	end

	-- [세트 완성] 같은 묶음(지역 묶음)의 카드를 모두 모으면 축하 띠.
	H.setsCelebrated = H.setsCelebrated or {}
	function H.checkSetComplete(card, force)
		local cards = view and view.codex and view.codex.cards
		if not cards or not card then return end
		local group = nil
		for _, c in cards do
			if c.id == card.id then group = c.worldGroup; break end
		end
		if not group or group == "" or H.setsCelebrated[group] then return end
		local total, found = 0, 0
		for _, c in cards do
			if c.worldGroup == group then
				total += 1
				if c.found then found += 1 end
			end
		end
		if total < 3 or (found < total and not force) then return end
		H.setsCelebrated[group] = true
		H.showSetComplete(tostring(group), total)
	end
	function H.showSetComplete(group, total)
		local g = overlayGui("CardSetComplete", 96)
		g:SetAttribute("NonBlockingCardNotice", true)
		local band = Instance.new("Frame")
		band.AnchorPoint = Vector2.new(0.5, 0.5)
		band.Position = UDim2.fromScale(0.5, 0.3)
		band.Size = UDim2.new(0, 0, 0, 74)
		band.BackgroundColor3 = Color3.fromRGB(70, 44, 24)
		band.BorderSizePixel = 0
		band.ClipsDescendants = true
		band.ZIndex = 20
		band.Parent = g
		corner(band, 12)
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(255, 217, 124)
		st.Thickness = 3
		st.Parent = band
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.GothamBlack
		label.TextSize = 24
		label.TextColor3 = Color3.fromRGB(255, 230, 160)
		label.Text = string.format("★ %s 세트 완성! (%d장) ★", group, total)
		label.ZIndex = 21
		label.Parent = band
		Sfx.play("sfx_fanfare", 0.5, 1.05)
		TS:Create(band, TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Size = UDim2.new(0.8, 0, 0, 74) }):Play()
		if H.cardGainFlair then
			pcall(H.cardGainFlair, { g = g, frame = band, center = UDim2.fromScale(0.5, 0.3), level = 4, gold = Color3.fromRGB(255, 217, 124),
				tone = Color3.fromRGB(255, 196, 92), w = 300, h = 120, reduced = game:GetService("GuiService").ReducedMotionEnabled,
				viewport = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600), combat = false, hero = false })
		end
		task.delay(3.2, function() if g.Parent then g:Destroy() end end)
	end

	-- [세계 사건 알림씬] 새 재해·행운이 시작되면 그 원화로 2~3초 장면. 재해는 어둡고 붉게, 행운은 금빛.
	function H.showWorldEventScene(a)
		local pg = player:WaitForChild("PlayerGui")
		local old = pg:FindFirstChild("WorldEventScene")
		if old then old:Destroy() end
		local g = overlayGui("WorldEventScene", 70)
		local disaster = a.kind == "disaster"
		local root = Instance.new("TextButton")
		root.Name = "WorldEventRoot"
		root.Size = UDim2.fromScale(1, 1)
		root.AutoButtonColor = false
		root.Text = ""
		root.BackgroundColor3 = Color3.new(0, 0, 0)
		root.BackgroundTransparency = 0.25
		root.BorderSizePixel = 0
		root.Parent = g
		local artId = H.eventArtFor(a.id, a.tag, a.title, a.kind)
		local art = Instance.new("ImageLabel")
		art.Name = "WorldEventArt"
		art.AnchorPoint = Vector2.new(0.5, 0.5)
		art.Position = UDim2.fromScale(0.5, 0.46)
		art.Size = UDim2.fromScale(1.08, 1.08)
		art.BackgroundTransparency = 1
		art.Image = if artId then "rbxassetid://" .. tostring(artId) else ""
		art.ScaleType = Enum.ScaleType.Crop
		art.ImageTransparency = 1
		art.ZIndex = 2
		art.Parent = root
		local tint = Instance.new("Frame")
		tint.Size = UDim2.fromScale(1, 1)
		tint.BackgroundColor3 = if disaster then Color3.fromRGB(60, 8, 6) else Color3.fromRGB(120, 86, 20)
		tint.BackgroundTransparency = 0.62
		tint.BorderSizePixel = 0
		tint.ZIndex = 3
		tint.Parent = root
		local tag = Instance.new("TextLabel")
		tag.AnchorPoint = Vector2.new(0.5, 1)
		tag.Position = UDim2.fromScale(0.5, 0.7)
		tag.Size = UDim2.new(0.9, 0, 0, 30)
		tag.BackgroundTransparency = 1
		tag.Font = Enum.Font.GothamBold
		tag.TextSize = 18
		tag.TextColor3 = if disaster then Color3.fromRGB(255, 140, 120) else Color3.fromRGB(255, 220, 140)
		tag.Text = (if disaster then "⚠ 세계 재해 · " else "✦ 세계 행운 · ") .. tostring(a.region or "")
		tag.ZIndex = 5
		tag.Parent = root
		local title = Instance.new("TextLabel")
		title.AnchorPoint = Vector2.new(0.5, 0)
		title.Position = UDim2.fromScale(0.5, 0.7)
		title.Size = UDim2.new(0.9, 0, 0, 44)
		title.BackgroundTransparency = 1
		title.Font = Enum.Font.GothamBlack
		title.TextSize = 34
		title.TextColor3 = Color3.fromRGB(255, 244, 220)
		title.TextStrokeTransparency = 0.4
		title.Text = tostring(a.title or "")
		title.ZIndex = 5
		title.Parent = root
		local body = Instance.new("TextLabel")
		body.AnchorPoint = Vector2.new(0.5, 0)
		body.Position = UDim2.new(0.5, 0, 0.7, 50)
		body.Size = UDim2.new(0.82, 0, 0, 50)
		body.BackgroundTransparency = 1
		body.Font = Enum.Font.Gotham
		body.TextSize = 17
		body.TextWrapped = true
		body.TextColor3 = Color3.fromRGB(240, 230, 210)
		body.ZIndex = 5
		body.Parent = root
		H.typewrite(body, tostring(a.text or ""), 0.02)
		H.cinemaBars(g, 3.2)
		Sfx.play(if disaster then "sfx_horn" else "sfx_fanfare", 0.4, if disaster then 0.8 else 1, "sfx_bell")
		TS:Create(art, TweenInfo.new(0.5), { ImageTransparency = 0 }):Play()
		TS:Create(art, TweenInfo.new(4, Enum.EasingStyle.Linear), { Size = UDim2.fromScale(1.0, 1.0) }):Play()
		if disaster and not game:GetService("GuiService").ReducedMotionEnabled then
			task.spawn(function()
				for i = 1, 6 do
					if not art.Parent then return end
					art.Position = UDim2.new(0.5, math.random(-6, 6), 0.46, math.random(-4, 4))
					task.wait(0.04)
				end
				if art.Parent then art.Position = UDim2.fromScale(0.5, 0.46) end
			end)
		end
		local function close()
			if not g.Parent then return end
			TS:Create(root, TweenInfo.new(0.3), { BackgroundTransparency = 1 }):Play()
			TS:Create(art, TweenInfo.new(0.3), { ImageTransparency = 1 }):Play()
			task.delay(0.32, function() if g.Parent then g:Destroy() end end)
		end
		root.Activated:Connect(close)
		task.delay(3.6, close)
	end

	-- 새로 시작된 세계 사건만 감지(첫 화면은 기준선). 다른 장면 중이면 기다렸다가 보여 준다.
	function H.checkWorldEvents()
		local active = view and view.world and view.world.active
		if type(active) ~= "table" then return end
		local first = H.seenWorldEvents == nil
		H.seenWorldEvents = H.seenWorldEvents or {}
		local fresh = {}
		for _, a in active do
			local key = tostring(a.id or "") .. "|" .. tostring(a.title) .. "|" .. tostring(a.region)
			if not H.seenWorldEvents[key] then
				H.seenWorldEvents[key] = true
				if not first then table.insert(fresh, a) end
			end
		end
		if #fresh == 0 then return end
		task.spawn(function()
			local pg = player:WaitForChild("PlayerGui")
			for _, a in fresh do
				while player.Parent and (newGameMode or sceneHold or H.sceneBusy or H.questScenesPlaying
					or pg:FindFirstChild("StoryScene", true) or pg:FindFirstChild("WonderScene", true)
					or pg:FindFirstChild("HistoryEvent", true) or pg:FindFirstChild("CardGain") or pg:FindFirstChild("CardFan")) do
					task.wait(0.3)
				end
				if not player.Parent then return end
				H.showWorldEventScene(a)
				task.wait(3.9)
			end
		end)
	end

	-- [개발 촬영] FxCheck:<legend|epic|rare|fan|plus|set|world|disaster>
	function H.fxCheck(what)
		local cards = (view and view.codex and view.codex.cards) or {}
		local function pick(rarity)
			for _, c in cards do
				if (rarity == nil or c.rarity == rarity) and AssetIds["CardArt/" .. tostring(c.id)] then
					return { id = c.id, name = if c.name ~= "???" then c.name else c.id, rarity = c.rarity, image = c.image, found = true, worldGroup = c.worldGroup }
				end
			end
			return { id = "dev", name = "점검 카드", rarity = rarity or "Common", found = true }
		end
		if what == "legend" then H.showCardGain(pick("Legendary") or pick(nil), 0)
		elseif what == "epic" then H.showCardGain(pick("Epic"), 0)
		elseif what == "rare" then H.showCardGain(pick("Rare"), 0)
		elseif what == "fan" then H.showCardFan({ { card = pick("Common") }, { card = pick("Uncommon") }, { card = pick("Rare") }, { card = pick("Epic") } })
		elseif what == "plus" then H.showCardPlusOne(pick(nil), 2)
		elseif what == "set" then H.showSetComplete("점검 묶음", 6)
		elseif what == "world" then H.showWorldEventScene({ id = "bumper_harvest", kind = "fortune", title = "유럽 대풍작", region = "유럽", text = "올해는 햇볕과 비가 맞아떨어졌다. 곡식과 설탕이 넘쳐 값이 내린다." })
		elseif what == "disaster" then H.showWorldEventScene({ id = "fx_vesuvius", kind = "disaster", title = "베수비오 화산 분화", region = "지중해", text = "하늘이 잿빛으로 덮였다. 나폴리 항구가 멈췄다." })
		end
		return what
	end
end

-- [쉬운 흐름 · 2026-11-28 오너 지시] '다음 할 일' 하나만 크게 · 목적지 표시 · 메뉴 첫 줄 3칸(지금 할 일/추천/보상).
-- 최상위 local 을 늘리지 않도록 H 필드만 쓴다. 판정·저장은 서버 그대로.
do
	local TS = game:GetService("TweenService")
	-- 탭 → 3D 항구 건물(FacilityIdentity) : 같은 건물에서 열리는 탭끼리 묶는다
	local BUILDING_OF = {
		trade = "trade", market = "market", harbor = "harbor",
		board = "board", quest = "board", recruit = "board",
		route = "route", map = "route", diplomacy = "route",
		tech = "tech", scholar = "tech", codex = "codex", encyclopedia = "codex",
	}
	local KIND_TAB = {
		visit = "route", field = "explore", discover = "explore", war_clear = "war", win = "battle",
		duel_leader = "gwent", understand = "scholar", understand_card = "scholar", chronicle = "quest", choice = "quest",
	}

	-- 지금 해야 할 단 하나: { text, why, tab, portId }
	function H.nextStep()
		if not view or not view.player then return nil end
		local p, ship = view.player, view.ship or {}
		local here = p.portId
		local captain = view.captain
		local sailed = (p.day or 0) > 0
		if captain and not H.tutorialHidden and (captain.step ~= "done" or not sailed) then
			if captain.step == "name" then return { text = "상인 길드 서기에게 이름 올리기", why = "선장 등록을 해야 교역을 할 수 있어", tab = "trade" } end
			if captain.step == "companion" then return { text = "주점에서 첫 동료 맞이하기", why = "혼자서는 배를 몰 수 없어", tab = "board" } end
			if captain.step ~= "done" then return { text = "떠돌이 화가에게 초상 받기", why = "선장 증명서에 쓸 초상이 필요해", tab = "status" } end
			if (ship.cargoUsed or 0) == 0 then return { text = "교역소에서 이 항구 특산품 사기", why = "싸게 사서 다른 항구에 비싸게 파는 게 돈 버는 첫걸음", tab = "trade" } end
			return { text = "항만청에서 다른 항구로 출항하기", why = "산 물건은 다른 항구에서 비싸게 팔려", tab = "route" }
		end
		local active = (view.quests and view.quests.active) or {}
		local pick = nil
		for _, q in active do
			if q.strand == "main" then pick = q; break end
		end
		pick = pick or active[1]
		if pick then
			local why = pick.problem or pick.summary
			local done = (pick.progress or 0) >= (pick.amount or math.huge)
			if pick.kind == "deliver" then
				local good, port = pick.goodName or "물건", pick.portName or "목적지"
				if done then
					if pick.portId and pick.portId ~= here then
						return { text = string.format("%s(으)로 출항해 납품하기", port), why = why, tab = "route", portId = pick.portId, quest = pick }
					end
					return { text = "주점에서 납품하고 보상 받기", why = why, tab = "board", quest = pick }
				end
				if (ship.cargoUsed or 0) > 0 and pick.portId and pick.portId ~= here then
					return { text = string.format("%s 싣고 %s(으)로 출항하기 (%d/%d)", good, port, pick.progress or 0, pick.amount or 0), why = why, tab = "route", portId = pick.portId, quest = pick }
				end
				return { text = string.format("교역소에서 %s 사기 → %s에 납품 (%d/%d)", good, port, pick.progress or 0, pick.amount or 0), why = why, tab = "trade", portId = pick.portId, quest = pick }
			end
			local tab = KIND_TAB[pick.kind] or "quest"
			if (pick.kind == "field" or pick.kind == "visit") and pick.portId and pick.portId ~= here then
				return { text = string.format("%s(으)로 출항하기 · %s", pick.portName or "목적지", pick.name or ""), why = why, tab = "route", portId = pick.portId, quest = pick }
			end
			if done then return { text = "진행 일지에서 보상 받기 · " .. tostring(pick.name or ""), why = why, tab = "quest", quest = pick } end
			return { text = tostring(pick.summary or pick.name or "의뢰 진행하기"), why = if pick.problem then why else nil, tab = tab, portId = pick.portId, quest = pick }
		end
		local counsel = view.counsel and view.counsel[1]
		if counsel and counsel.tab then return { text = tostring(counsel.text), tab = counsel.tab } end
		return { text = "주점 게시판에서 새 의뢰 받기", why = "의뢰가 다음 이야기와 돈벌이를 이어 줘", tab = "board" }
	end

	-- 3D 항구 건물 표시: 금빛 테두리 + '여기' 화살표(부품 도형 대신 UI 표시만)
	function H.markFacility(tab)
		for _, old in H.facilityMarkers or {} do
			if old.Parent then old:Destroy() end
		end
		H.facilityMarkers = {}
		local target = tab and BUILDING_OF[tab]
		if not target then return end
		local port = workspace:FindFirstChild("PortScene", true)
		if not port then return end
		for _, d in port:GetDescendants() do
			if d:GetAttribute("FacilityIdentity") == target and (d:IsA("Model") or d:IsA("BasePart")) then
				local hl = Instance.new("Highlight")
				hl.Name = "NextStepHighlight"
				hl.FillTransparency = 1
				hl.OutlineColor = Color3.fromRGB(255, 214, 110)
				hl.OutlineTransparency = 0.1
				hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
				hl.Adornee = d
				hl.Parent = d
				local bb = Instance.new("BillboardGui")
				bb.Name = "NextStepArrow"
				bb.Size = UDim2.fromOffset(150, 60)
				bb.StudsOffsetWorldSpace = Vector3.new(0, 16, 0)
				bb.AlwaysOnTop = true
				bb.LightInfluence = 0
				bb.Adornee = if d:IsA("Model") then (d.PrimaryPart or d:FindFirstChildWhichIsA("BasePart", true)) else d
				bb.Parent = d
				local t = Instance.new("TextLabel")
				t.Size = UDim2.fromScale(1, 1)
				t.BackgroundTransparency = 1
				t.Font = Enum.Font.GothamBlack
				t.TextScaled = true
				t.TextColor3 = Color3.fromRGB(255, 220, 120)
				t.TextStrokeTransparency = 0.3
				t.Text = "여기!\n▼"
				t.Parent = bb
				if not game:GetService("GuiService").ReducedMotionEnabled then
					TS:Create(bb, TweenInfo.new(0.7, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
						{ StudsOffsetWorldSpace = Vector3.new(0, 19, 0) }):Play()
				end
				table.insert(H.facilityMarkers, hl)
				table.insert(H.facilityMarkers, bb)
				break
			end
		end
	end

	-- 하단 버튼 바로 위의 '다음 할 일' 띠
	function H.refreshNextStep()
		local gui = dock:FindFirstAncestorOfClass("ScreenGui")
		if not gui then return end
		local chip = H.nextStepChip
		if not chip or not chip.Parent then
			chip = Instance.new("TextButton")
			chip.Name = "NextStepChip"
			chip.AnchorPoint = Vector2.new(0.5, 1)
			chip.Size = UDim2.fromOffset(420, 46)
			chip.AutoButtonColor = true
			chip.BackgroundColor3 = Color3.fromRGB(46, 34, 24)
			chip.BackgroundTransparency = 0.08
			chip.BorderSizePixel = 0
			chip.Text = ""
			chip.ZIndex = 20
			chip.Parent = gui
			corner(chip, 12)
			-- 지시서의 512×128 청동 띠: 등록된 원화만 사용하고 기존 조작 영역은 그대로 둔다.
			local chipArt = AssetIds["CardArt/ui_frame_chip"]
			if chipArt then
				local art = Instance.new("ImageLabel")
				art.Name = "NextStepFrameArt"
				art.Size = UDim2.fromScale(1, 1)
				art.BackgroundTransparency = 1
				art.Image = "rbxassetid://" .. tostring(chipArt)
				art.ScaleType = Enum.ScaleType.Slice
				art.SliceCenter = Rect.new(24, 24, 488, 104)
				art.SliceScale = 0.5
				art.ZIndex = chip.ZIndex
				art.Active = false
				art.Parent = chip
			end
			local st = Instance.new("UIStroke")
			st.Color = Color3.fromRGB(214, 170, 82)
			st.Thickness = 2
			st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			st.Parent = chip
			local arrow = Instance.new("TextLabel")
			arrow.Name = "Arrow"
			arrow.BackgroundTransparency = 1
			arrow.Position = UDim2.fromOffset(10, 0)
			arrow.Size = UDim2.new(0, 50, 1, 0)
			arrow.Font = Enum.Font.GothamBlack
			arrow.TextSize = 15
			arrow.TextColor3 = Color3.fromRGB(255, 214, 110)
			arrow.Text = "▶ 다음"
			arrow.TextXAlignment = Enum.TextXAlignment.Left
			arrow.ZIndex = 21
			arrow.Parent = chip
			if H.hasIconArt("nextstep") then
				local icon = modelIcon(chip, "FacilityArt", "nextstep", nil, 26, "다음")
				icon.Name = "NextStepArt"
				icon.Position = UDim2.new(0, 7, 0.5, -13)
				icon.ZIndex = 21
				icon.Active = false
				arrow.Text = "다음"
				arrow.TextSize = 12
				arrow.Position = UDim2.fromOffset(34, 0)
				arrow.Size = UDim2.new(0, 29, 1, 0)
			end
			local label = Instance.new("TextLabel")
			label.Name = "StepText"
			label.BackgroundTransparency = 1
			label.Position = UDim2.fromOffset(64, 3)
			label.Size = UDim2.new(1, -74, 0, 22)
			label.Font = Enum.Font.GothamBold
			label.TextSize = 15
			label.TextColor3 = Color3.fromRGB(255, 244, 222)
			label.TextXAlignment = Enum.TextXAlignment.Left
			label.TextTruncate = Enum.TextTruncate.AtEnd
			label.ZIndex = 21
			label.Parent = chip
			local why = Instance.new("TextLabel")
			why.Name = "WhyText"
			why.BackgroundTransparency = 1
			why.Position = UDim2.fromOffset(64, 24)
			why.Size = UDim2.new(1, -74, 0, 18)
			why.Font = Enum.Font.Gotham
			why.TextSize = 12
			why.TextColor3 = Color3.fromRGB(214, 196, 160)
			why.TextXAlignment = Enum.TextXAlignment.Left
			why.TextTruncate = Enum.TextTruncate.AtEnd
			why.ZIndex = 21
			why.Parent = chip
			chip.Activated:Connect(function()
				local step = H.currentStep
				if not step then return end
				Sfx.play("sfx_click", 0.4)
				H.hideBubble()
				menuToggle.Visible = false
				openTab(step.tab)
			end)
			H.nextStepChip = chip
		end
		local show = gui.Enabled and view ~= nil and hud.Visible and not main.Visible and not newGameMode and not inField and not sailingNow
			and not H.sceneBusy and not H.questScenesPlaying
		local step = if show then H.nextStep() else nil
		H.currentStep = step
		chip.Visible = step ~= nil
		if not step then
			if H.lastStepKey then H.markFacility(nil); H.lastStepKey = nil end
			return
		end
		local vp = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600)
		-- [다음 할 일] 상단 도크 위치에서 빼면 화면 밖으로 나간다. 하단 중앙에서 이동 조작 영역을 피한다.
		local touch = game:GetService("UserInputService").TouchEnabled
		local w = math.max(1, math.min(460, vp.X - 24))
		local chipHeight = if step.why then 52 else 44
		local bottomInset = if touch then math.min(132, math.floor(vp.Y * 0.25)) else 16
		chip.Size = UDim2.fromOffset(w, chipHeight)
		chip.Position = UDim2.fromOffset(vp.X / 2, math.max(chipHeight + 8, vp.Y - bottomInset))
		chip.StepText.Text = step.text
		chip.WhyText.Text = if step.why then "왜? " .. tostring(step.why) else ""
		chip.WhyText.Visible = step.why ~= nil
		chip.StepText.Position = UDim2.fromOffset(64, if step.why then 5 else 11)
		local key = tostring(step.tab) .. "|" .. tostring(step.text)
		if key ~= H.lastStepKey then
			H.lastStepKey = key
			H.markFacility(step.tab)
			if H.setGuidePulse then H.setGuidePulse(step.tab) end
			-- 새 목표가 생기면 띠가 한 번 톡 튀어나온다
			if not game:GetService("GuiService").ReducedMotionEnabled then
				local sc = chip:FindFirstChildOfClass("UIScale") or Instance.new("UIScale")
				sc.Parent = chip
				sc.Scale = 0.8
				TS:Create(sc, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
			end
		end
	end

	-- 메뉴 첫 줄 3칸: 지금 할 일 / 추천 / 보상 받기
	function H.menuHomeStrip()
		if not view or currentTab == "trade" or currentTab == "yard" then return end
		local step = H.nextStep()
		local counsel = view.counsel and view.counsel[1]
		local rewards = 0
		for _, q in (view.quests and view.quests.active) or {} do
			if q.kind ~= "deliver" and (q.progress or 0) >= (q.amount or math.huge) then rewards += 1 end
		end
		add(function()
			local row = Instance.new("Frame")
			row.Name = "MenuHomeStrip"
			local compact = mainInner.AbsoluteSize.X > 0 and mainInner.AbsoluteSize.X < 350
			row.Size = UDim2.new(1, -6, 0, if compact then 168 else 76)
			row.BackgroundTransparency = 1
			local grid = Instance.new("UIGridLayout")
			grid.CellSize = if compact then UDim2.new(1, 0, 0, 52) else UDim2.new(1 / 3, -4, 1, 0)
			grid.CellPadding = UDim2.fromOffset(6, if compact then 6 else 0)
			grid.FillDirectionMaxCells = if compact then 1 else 3
			grid.SortOrder = Enum.SortOrder.LayoutOrder
			grid.Parent = row
			local function cell(order, title, body, color, tab)
				local b = Instance.new("TextButton")
				b.LayoutOrder = order
				b.AutoButtonColor = true
				b.BackgroundColor3 = COLORS.coverRaised
				b.BorderSizePixel = 0
				b.Text = ""
				b.Active = tab ~= nil
				b.Parent = row
				corner(b, 6)
				local edge = Instance.new("UIStroke")
				edge.Color = if order == 1 then UI_BRASS elseif order == 3 and tab then color else INK_EDGE
				edge.Thickness = if order == 1 then 1.5 else 1
				edge.Parent = b
				local frameArt = AssetIds["CardArt/ui_frame_card"]
				if frameArt then
					local art = Instance.new("ImageLabel")
					art.Name = "MenuHomeFrameArt"
					art.Size = UDim2.fromScale(1, 1)
					art.BackgroundTransparency = 1
					art.Image = "rbxassetid://" .. tostring(frameArt)
					art.ScaleType = Enum.ScaleType.Slice
					art.SliceCenter = Rect.new(24, 24, 232, 232)
					art.SliceScale = 0.5
					art.ZIndex = b.ZIndex
					art.Active = false
					art.Parent = b
				end
				local key = ({ "nextstep", "recommend", "reward" })[order]
				local hasArt = H.hasIconArt(key)
				local inset = if hasArt then 30 else 0
				if hasArt then
					local icon = modelIcon(b, "FacilityArt", key, nil, 24, title)
					icon.Name = "MenuHomeIcon"
					icon.Position = if compact then UDim2.new(0, 5, 0.5, -12) else UDim2.fromOffset(5, 3)
					icon.ZIndex = b.ZIndex + 1
					icon.Active = false
					title = if order == 1 then "지금 할 일" elseif order == 2 then "추천" else "보상 받기"
				end
				local t = mkLabel(b, title, 14, if frameArt then INK else Color3.fromRGB(255, 236, 196), true)
				t.ZIndex = b.ZIndex + 1
				t.Position = UDim2.fromOffset(8 + inset, 5)
				t.Size = if compact then UDim2.new(0.36, -12 - inset, 1, -10) else UDim2.new(1, -16 - inset, 0, 20)
				t.TextWrapped = true
				t.AutomaticSize = Enum.AutomaticSize.None
				local d = mkLabel(b, body, 14, if frameArt then INK else Color3.fromRGB(250, 244, 230), false)
				d.ZIndex = b.ZIndex + 1
				d.Position = if compact then UDim2.new(0.36, 4, 0, 5) else UDim2.fromOffset(8, 27)
				d.Size = if compact then UDim2.new(0.64, -12, 1, -10) else UDim2.new(1, -16, 0, 44)
				d.TextWrapped = true
				d.AutomaticSize = Enum.AutomaticSize.None
				d.TextTruncate = Enum.TextTruncate.AtEnd
				if tab then
					b.Activated:Connect(function()
						Sfx.play("sfx_click", 0.4)
						openTab(tab)
					end)
				end
			end
			cell(1, "지금 할 일", step and step.text or "자유롭게 교역해 봐", Color3.fromRGB(58, 98, 64), step and step.tab or nil)
			cell(2, "추천", counsel and tostring(counsel.text) or "시세가 싼 특산품을 찾아봐", Color3.fromRGB(64, 78, 112), counsel and counsel.tab or "trade")
			cell(3, "보상 받기", if rewards > 0 then string.format("받을 보상 %d개", rewards) else "받을 보상 없음", if rewards > 0 then Color3.fromRGB(140, 98, 34) else Color3.fromRGB(90, 84, 76), if rewards > 0 then "quest" else nil)
			return row
		end)
	end
end

-- [이야기 흐름 · 2026-11-28 오너 지시] 문제 → 원인 → 할 일 → 바뀌는 것 · 지난 이야기 · 결과 · 장 완료.
do
	local TS = game:GetService("TweenService")
	local CHIP = {
		{ "문제", Color3.fromRGB(150, 58, 46) }, { "원인", Color3.fromRGB(120, 92, 46) },
		{ "할 일", Color3.fromRGB(52, 96, 70) }, { "바뀌는 것", Color3.fromRGB(56, 82, 128) },
	}
	-- 일지의 인과 카드: 장 제목 + 4칸 + 지난/다음 이야기 + 바로 가기
	function H.questCauseCard(q)
		if not (q.problem or q.chapter or q.prevEnding) then return end
		local step = H.nextStep and H.nextStep()
		local doText = if step and step.quest and step.quest.id == q.id then step.text else q.summary
		add(function()
			local frameArt = AssetIds["CardArt/ui_frame_card"]
			-- 자체 배경을 가진 카드로 생성해 자동 높이/UIListLayout 자식 수를 바꾸지 않는다.
			local card = Instance.new(if frameArt then "ImageLabel" else "Frame")
			if card:IsA("ImageLabel") then
				card.Image = "rbxassetid://" .. tostring(frameArt)
				card.ScaleType = Enum.ScaleType.Slice
				card.SliceCenter = Rect.new(24, 24, 232, 232)
				card.SliceScale = 0.5
				card.Active = false
			end
			card.Name = "QuestCauseCard"
			card.Size = UDim2.new(1, -6, 0, 0)
			card.AutomaticSize = Enum.AutomaticSize.Y
			card.BackgroundColor3 = Color3.fromRGB(242, 228, 196)
			card.BorderSizePixel = 0
			corner(card, 10)
			local pad = Instance.new("UIPadding")
			pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 8), UDim.new(0, 10), UDim.new(0, 10)
			pad.Parent = card
			local list = Instance.new("UIListLayout")
			list.Padding = UDim.new(0, 5)
			list.SortOrder = Enum.SortOrder.LayoutOrder
			list.Parent = card
			if q.chapter then
				local t = mkLabel(card, tostring(q.chapter) .. (if q.guide then " · 안내: " .. tostring(q.guide) else ""), 15, Color3.fromRGB(110, 70, 30), true, 1)
				t.Size = UDim2.new(1, 0, 0, 0)
			end
			if q.talk then
				-- [화자] 등록된 동일 인물/역할 초상만 사용한다. 이름만 있는 창작 인물은 임의 얼굴을 붙이지 않는다.
				local talk = q.talk
				local portraitTalk = if talk.key ~= "name" then talk else nil
				if not portraitTalk then
					for _, member in (view.companions and view.companions.list) or {} do
						if member.name == talk.name then portraitTalk = { key = "comp:" .. member.id }; break end
					end
				end
				local imageId, offset, imageSize
				if portraitTalk and H.portraitFor then imageId, offset, imageSize = H.portraitFor(portraitTalk, true) end
				local speaker = Instance.new("Frame")
				speaker.Name = "QuestSpeaker"
				speaker.Size = UDim2.new(1, 0, 0, 0)
				speaker.AutomaticSize = Enum.AutomaticSize.Y
				speaker.BackgroundTransparency = 1
				speaker.LayoutOrder = 2
				speaker.Parent = card
				if imageId then
					local face = Instance.new("ImageLabel")
					face.Name = "QuestSpeakerPortrait"
					face.Size = UDim2.fromOffset(62, 80)
					face.BackgroundTransparency = 1
					face.ScaleType = Enum.ScaleType.Fit
					face.Image = "rbxassetid://" .. tostring(imageId)
					face.ImageRectOffset = offset or Vector2.zero
					face.ImageRectSize = imageSize or Vector2.zero
					face.Parent = speaker
					local minimum = Instance.new("UISizeConstraint")
					minimum.MinSize = Vector2.new(0, 80)
					minimum.Parent = speaker
				end
				local ex = q.story2
				local line = tostring(talk.name or "안내 인물") .. (if talk.role and talk.role ~= "" then " · " .. talk.role else "")
				if ex and ex.line and ex.line ~= "" then line ..= "\n“" .. tostring(ex.line) .. "”" end
				local description = mkLabel(speaker, line, 15, INK, true)
				description.Position = UDim2.fromOffset(if imageId then 70 else 0, 0)
				description.Size = UDim2.new(1, if imageId then -70 else 0, 0, 0)
				description.TextWrapped = true
			end
			if q.prevEnding then
				local prev = mkLabel(card, "지난 이야기 — " .. tostring(q.prevName or "") .. ": " .. tostring(q.prevEnding), 12, Color3.fromRGB(96, 80, 60), false, 3)
				prev.Size = UDim2.new(1, 0, 0, 0)
			end
			local values = { q.problem, q.cause, doText, q.result }
			local order = 4
			for i, spec in CHIP do
				local v = values[i]
				if v and v ~= "" then
					local row = Instance.new("Frame")
					row.Size = UDim2.new(1, 0, 0, 0)
					row.AutomaticSize = Enum.AutomaticSize.Y
					row.BackgroundTransparency = 1
					row.LayoutOrder = order
					row.Parent = card
					order += 1
					local tag = Instance.new("TextLabel")
					tag.Size = UDim2.fromOffset(70, 22)
					tag.BackgroundColor3 = spec[2]
					tag.BorderSizePixel = 0
					tag.Font = Enum.Font.GothamBold
					tag.TextSize = 12
					tag.TextColor3 = Color3.new(1, 1, 1)
					tag.Text = (if i > 1 then "→ " else "") .. spec[1]
					tag.Parent = row
					corner(tag, 6)
					local key = ({ "problem", "cause", "todo", "result" })[i]
					if H.hasIconArt(key) then
						local icon = modelIcon(tag, "FacilityArt", key, nil, 16, spec[1])
						icon.Position = UDim2.fromOffset(2, 3)
						icon.ZIndex = tag.ZIndex + 1
						icon.Active = false
						tag.Text = spec[1] .. " "
						tag.TextXAlignment = Enum.TextXAlignment.Right
					end
					local body = mkLabel(row, tostring(v), 13, Color3.fromRGB(52, 38, 24), i == 3)
					body.Position = UDim2.fromOffset(78, 2)
					body.Size = UDim2.new(1, -78, 0, 0)
				end
			end
			if q.nextName then
				local nx = mkLabel(card, "다음 이야기 — " .. tostring(q.nextName) .. " (끝내면 열림)", 12, Color3.fromRGB(96, 80, 60), false, 20)
				nx.Size = UDim2.new(1, 0, 0, 0)
			end
			if step and step.quest and step.quest.id == q.id and step.tab then
				local go = mkButton(card, "▶ 지금 할 일로 가기", COLORS.green, UDim2.new(1, 0, 0, 44), function() openTab(step.tab) end, true)
				go.LayoutOrder = 21
			end
			return card
		end)
	end

	-- 결과 연출: 퀘스트를 끝내면 '당신 덕분에' 결말 + 장의 마지막이면 장 완료 장면
	function H.showQuestResult(d)
		local g = overlayGui("QuestResult", 72)
		local root = Instance.new("TextButton")
		root.Size = UDim2.fromScale(1, 1)
		root.AutoButtonColor = false
		root.Text = ""
		root.BackgroundColor3 = Color3.new(0, 0, 0)
		root.BackgroundTransparency = 0.45
		root.BorderSizePixel = 0
		root.Parent = g
		local box = Instance.new("Frame")
		box.AnchorPoint = Vector2.new(0.5, 0.5)
		box.Position = UDim2.fromScale(0.5, 0.5)
		box.Size = UDim2.new(1, -24, 0, 0)
		box.AutomaticSize = Enum.AutomaticSize.Y
		box.BackgroundColor3 = Color3.fromRGB(246, 234, 206)
		box.BorderSizePixel = 0
		box.Parent = root
		corner(box, 14)
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(520, 560)
		lim.Parent = box
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(196, 150, 70)
		st.Thickness = 3
		st.Parent = box
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 16), UDim.new(0, 16), UDim.new(0, 18), UDim.new(0, 18)
		pad.Parent = box
		local list = Instance.new("UIListLayout")
		list.Padding = UDim.new(0, 8)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.HorizontalAlignment = Enum.HorizontalAlignment.Center
		list.Parent = box
		local chapterEnd = d.chapterEnd == true
		-- [대화 연출] 의뢰를 준 사람이 결말을 말한다(초상)
		local talk = d.id and H.questTalkMemo and H.questTalkMemo[d.id]
		if talk and H.portraitFor then
			local img, off, size = H.portraitFor(talk)
			if img then
				local face = Instance.new("ImageLabel")
				face.Name = "ResultSpeaker"
				face.LayoutOrder = 0
				face.Size = UDim2.fromOffset(96, 126)
				face.BackgroundColor3 = Color3.fromRGB(40, 30, 22)
				face.BorderSizePixel = 0
				face.Image = "rbxassetid://" .. tostring(img)
				face.ImageRectOffset = off or Vector2.zero
				face.ImageRectSize = size or Vector2.zero
				face.ScaleType = Enum.ScaleType.Crop
				face.Parent = box
				corner(face, 10)
				local who = mkLabel(box, tostring(talk.name) .. (if talk.role and talk.role ~= "" then " · " .. tostring(talk.role) else ""), 13, Color3.fromRGB(110, 80, 40), true, 0)
				who.Size = UDim2.new(1, 0, 0, 0)
				who.TextXAlignment = Enum.TextXAlignment.Center
			end
		end
		local chapterArt = if chapterEnd then AssetIds["CardArt/ui_banner_chapter"] else nil
		local heading = if chapterEnd then "📖 " .. tostring(d.chapter) .. " 완료!" else "✔ 의뢰 완료 · " .. tostring(d.name)
		if chapterArt then
			local banner = Instance.new("ImageLabel")
			banner.Name = "ChapterCompletionBanner"
			banner.LayoutOrder = 1
			banner.Size = UDim2.new(1, 0, 0, 64)
			banner.BackgroundTransparency = 1
			banner.Image = "rbxassetid://" .. tostring(chapterArt)
			banner.ScaleType = Enum.ScaleType.Fit
			banner.Active = false
			banner.Parent = box
			local title = mkLabel(banner, tostring(d.chapter) .. " 완료!", 24, Color3.fromRGB(255, 242, 208), true)
			title.AutomaticSize = Enum.AutomaticSize.None
			title.Position = UDim2.fromScale(0.15, 0.15)
			title.Size = UDim2.fromScale(0.7, 0.7)
			title.TextScaled = true
			title.TextXAlignment = Enum.TextXAlignment.Center
			title.TextYAlignment = Enum.TextYAlignment.Center
			title.ZIndex = banner.ZIndex + 1
			local fontLimit = Instance.new("UITextSizeConstraint")
			fontLimit.MinTextSize = 12
			fontLimit.MaxTextSize = 24
			fontLimit.Parent = title
		else
			local head = mkLabel(box, heading, if chapterEnd then 24 else 19, Color3.fromRGB(120, 70, 20), true, 1)
			head.Size = UDim2.new(1, 0, 0, 0)
			head.TextXAlignment = Enum.TextXAlignment.Center
		end
		if d.result then
			local res = mkLabel(box, "당신 덕분에 — " .. tostring(d.result), 15, Color3.fromRGB(40, 90, 50), true, 2)
			res.Size = UDim2.new(1, 0, 0, 0)
		end
		local body = mkLabel(box, "", 15, Color3.fromRGB(52, 38, 24), false, 3)
		body.Size = UDim2.new(1, 0, 0, 0)
		if H.typewrite then H.typewrite(body, tostring(d.ending or ""), 0.018) else body.Text = tostring(d.ending or "") end
		local hint = mkLabel(box, if chapterEnd then "다음 장이 주점 게시판과 일지에 열렸어요." else "화면을 누르면 닫혀요.", 12, Color3.fromRGB(110, 96, 76), false, 4)
		hint.Size = UDim2.new(1, 0, 0, 0)
		hint.TextXAlignment = Enum.TextXAlignment.Center
		if H.cinemaBars then H.cinemaBars(g, if chapterEnd then 4.5 else 3) end
		Sfx.play(if chapterEnd then "sfx_fanfare" else "sfx_bell", if chapterEnd then 0.55 else 0.35, 1, "sfx_card_coin")
		local sc = Instance.new("UIScale")
		sc.Scale = 0.85
		sc.Parent = box
		TS:Create(sc, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 }):Play()
		if chapterEnd and H.cardGainFlair then
			pcall(H.cardGainFlair, { g = g, frame = box, center = UDim2.fromScale(0.5, 0.5), level = 4, gold = Color3.fromRGB(255, 217, 124),
				tone = Color3.fromRGB(255, 196, 92), w = 360, h = 220, reduced = game:GetService("GuiService").ReducedMotionEnabled,
				viewport = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600), combat = false, hero = false })
		end
		local closed = false
		local function close()
			if closed then return end
			closed = true
			if g.Parent then g:Destroy() end
		end
		root.Activated:Connect(close)
		task.delay(if chapterEnd then 9 else 6, close)
	end

	-- 새로 끝난 퀘스트 감지(첫 화면은 기준선) → 결과 장면을 차례로
	function H.checkQuestResults()
		local done = view and view.quests and view.quests.done
		if type(done) ~= "table" then return end
		local first = H.seenDoneQuests == nil
		H.seenDoneQuests = H.seenDoneQuests or {}
		local fresh = {}
		for _, d in done do
			local key = tostring(d.id or d.name)
			if not H.seenDoneQuests[key] then
				H.seenDoneQuests[key] = true
				if not first and (d.result or d.chapter or d.strand == "main") then table.insert(fresh, d) end
			end
		end
		if #fresh == 0 then return end
		task.spawn(function()
			local pg = player:WaitForChild("PlayerGui")
			for _, d in fresh do
				while player.Parent and (newGameMode or sceneHold or H.sceneBusy or H.questScenesPlaying
					or pg:FindFirstChild("StoryScene", true) or pg:FindFirstChild("WonderScene", true) or pg:FindFirstChild("CardGain")
					or pg:FindFirstChild("CardFan") or pg:FindFirstChild("QuestResult")) do
					task.wait(0.3)
				end
				if not player.Parent then return end
				H.showQuestResult(d)
				while player.Parent and pg:FindFirstChild("QuestResult") do task.wait(0.3) end
			end
		end)
	end

	-- 지난 이야기: 접속 뒤 첫 화면에서 한 번, 진행 중 이야기의 앞 단계 결말과 지금 할 일을 보여 준다
	function H.showRecap()
		if H.recapShown or not view or not view.quests then return end
		local pick = nil
		for _, q in view.quests.active or {} do
			if q.prevEnding and (q.strand == "main" or q.chapter) then pick = q; break end
		end
		H.recapShown = true
		if not pick then return end
		H.showQuestResult({ name = "지난 이야기", chapter = pick.chapter, chapterEnd = false,
			ending = tostring(pick.prevName or "") .. " — " .. tostring(pick.prevEnding) .. "\n\n지금: " .. tostring(pick.problem or pick.summary),
			result = nil })
		local g = player.PlayerGui:FindFirstChild("QuestResult")
		local head = g and g:FindFirstChildWhichIsA("TextLabel", true)
		if head then head.Text = "📜 지난 이야기" .. (if pick.chapter then " · " .. tostring(pick.chapter) else "") end
	end
end

-- [첫 경험·실패 이유·한눈에 보기 · 2026-11-28 오너 지시] 글 설명 대신 3단계 그림 카드, 진 이유와 다음 할 일, 막대 그림 현황.
do
	local COACH = {
		trade = { "처음 교역", { { "📊", "시세 보기", "파란 표시 = 평균보다 저렴" }, { "🔢", "수량 고르기", "화물칸만큼만 실린다" }, { "💰", "사기 → 다른 항구에서 팔기", "항해 탭 '이익' 정렬로 팔 곳 찾기" } } },
		route = { "처음 출항", { { "🗺", "목적지 고르기", "의뢰 표시 = 목적지" }, { "🍞", "보급 확인", "빨간 글씨면 보급부터 채우기" }, { "⛵", "출항", "도착하면 그 항구 시세로 팔기" } } },
		battle = { "처음 해전", { { "🎯", "옆으로 붙기", "대포는 배 옆면으로 쏜다" }, { "💥", "사거리 안에서 발사", "'사거리 밖'이면 더 다가가기" }, { "🏳", "위험하면 물러나기", "선체가 30% 아래면 후퇴도 작전" } } },
		war = { "처음 함대전", { { "⚓", "작전 고르기", "추천 레벨을 먼저 확인" }, { "🌊", "파도마다 적 격파", "파도 사이엔 회복이 없다" }, { "🏆", "마지막 파도까지", "이기면 해역이 안전해진다" } } },
		explore = { "처음 지상 탐험", { { "👣", "천천히 다가가기", "뛰면 동물이 달아난다" }, { "🔍", "길게 눌러 조사", "스케치·채집·탁본" }, { "📖", "카드로 기록", "발견하면 백과에 꽂힌다" } } },
		gwent = { "처음 카드 대결", { { "🃏", "카드 내기", "줄마다 힘이 합쳐진다" }, { "⚖", "세 판 두 선승", "아끼는 것도 작전" }, { "👑", "지도자 능력", "한 판에 한 번" } } },
	}
	H.coachSeen = H.coachSeen or {}
	-- 그 탭을 처음 열 때 한 번(이번 접속 기준), 실제로 처음일 때만
	function H.firstTimeCoach(tab)
		local spec = COACH[tab]
		if not spec or H.coachSeen[tab] or not view then return end
		local p, ship = view.player or {}, view.ship or {}
		local wins = view.battleStats and view.battleStats.battlesWon or 0
		local fresh = (tab == "trade" and (p.day or 0) == 0)
			or (tab == "route" and (p.day or 0) == 0)
			or ((tab == "battle" or tab == "war") and wins == 0)
			or (tab == "explore" and (view.codex and (view.codex.found or 0) <= 1))
			or (tab == "gwent" and (p.day or 0) < 30)
		if not fresh then return end
		H.coachSeen[tab] = true
		add(function()
			local card = Instance.new("Frame")
			card.Name = "FirstTimeCoach"
			card.Size = UDim2.new(1, -6, 0, 132)
			card.BackgroundColor3 = COLORS.coverRaised
			card.BorderSizePixel = 0
			corner(card, 12)
			local coachArt = modelIcon(card, "FacilityArt", "coach", nil, 24, "처음 안내")
			coachArt.Position = UDim2.fromOffset(8, 6)
			local title = mkLabel(card, spec[1], 16, Color3.fromRGB(255, 230, 170), true)
			title.Position = UDim2.fromOffset(38, 8)
			title.Size = UDim2.new(1, -50, 0, 22)
			title.AutomaticSize = Enum.AutomaticSize.None
			local row = Instance.new("Frame")
			row.Position = UDim2.fromOffset(8, 36)
			row.Size = UDim2.new(1, -16, 0, 88)
			row.BackgroundTransparency = 1
			row.Parent = card
			local grid = Instance.new("UIGridLayout")
			grid.CellSize = UDim2.new(1 / 3, -6, 1, 0)
			grid.CellPadding = UDim2.fromOffset(6, 0)
			grid.SortOrder = Enum.SortOrder.LayoutOrder
			grid.Parent = row
			for i, step in spec[2] do
				local cell = Instance.new("Frame")
				cell.LayoutOrder = i
				cell.BackgroundColor3 = COLORS.leather
				cell.BorderSizePixel = 0
				cell.Parent = row
				corner(cell, 8)
				local keys = ({ trade = {"trade", "cargo", "coin"}, route = {"map", "supply", "route"}, battle = {"route", "battle", "hull"}, war = {"harbor", "war", "reward"}, explore = {"explore", "scholar", "codex"}, gwent = {"gwent", "battle", "status"} })[tab]
				local icon = modelIcon(cell, "FacilityArt", keys[i], nil, 28, step[2])
				icon.Name = "CoachStepArt"
				icon.Position = UDim2.new(0.5, -14, 0, 2)
				local stepNumber = mkLabel(cell, tostring(i), 14, Color3.fromRGB(255, 236, 196), true)
				stepNumber.Position = UDim2.fromOffset(6, 5)
				stepNumber.Size = UDim2.fromOffset(16, 20)
				stepNumber.AutomaticSize = Enum.AutomaticSize.None
				local head = mkLabel(cell, step[2], 13, Color3.fromRGB(255, 236, 196), true)
				head.Position = UDim2.fromOffset(6, 32)
				head.Size = UDim2.new(1, -12, 0, 18)
				head.AutomaticSize = Enum.AutomaticSize.None
				local tip = mkLabel(cell, step[3], 11, Color3.fromRGB(210, 230, 216), false)
				tip.Position = UDim2.fromOffset(6, 52)
				tip.Size = UDim2.new(1, -12, 0, 32)
				tip.AutomaticSize = Enum.AutomaticSize.None
				tip.TextWrapped = true
			end
			return card
		end)
	end

	-- 해전에서 졌을 때: 무엇이 모자랐는지 비교하고 다음 할 일 버튼
	function H.showDefeatAdvice(sim)
		local me, foe = sim and sim.me, sim and sim.foe
		local reasons = {}
		if me and foe then
			if (me.cannons or 0) < (foe.cannons or 0) then
				table.insert(reasons, { string.format("대포가 적보다 적었어 (%d vs %d)", me.cannons or 0, foe.cannons or 0), "조선소에서 대포 늘리기", "yard" })
			end
			if (me.maxHull or 0) < (foe.maxHull or 0) * 0.85 then
				table.insert(reasons, { string.format("배가 약했어 (선체 %d vs %d)", me.maxHull or 0, foe.maxHull or 0), "조선소에서 더 튼튼한 배 보기", "yard" })
			end
			if (me.crew or 0) < (foe.crew or 0) then
				table.insert(reasons, { string.format("선원이 모자랐어 (%d vs %d)", me.crew or 0, foe.crew or 0), "주점에서 선원·동료 채우기", "recruit" })
			end
			if (me.level or 1) < (foe.level or 1) then
				table.insert(reasons, { string.format("적 레벨이 높았어 (Lv.%d vs Lv.%d)", me.level or 1, foe.level or 1), "쉬운 해적부터 이겨 경험 쌓기", "battle" })
			end
		end
		if #reasons == 0 then
			table.insert(reasons, { "운이 나빴거나 사거리 밖에서 쏘았어", "옆으로 붙어 사거리 안에서 쏘기", "battle" })
		end
		local g = overlayGui("DefeatAdvice", 73)
		local box = Instance.new("Frame")
		box.AnchorPoint = Vector2.new(0.5, 0.5)
		box.Position = UDim2.fromScale(0.5, 0.5)
		box.Size = UDim2.new(0, 460, 0, 0)
		box.AutomaticSize = Enum.AutomaticSize.Y
		box.BackgroundColor3 = Color3.fromRGB(44, 30, 28)
		box.BorderSizePixel = 0
		box.Parent = g
		corner(box, 14)
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(460, 520)
		lim.Parent = box
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 14), UDim.new(0, 14), UDim.new(0, 16), UDim.new(0, 16)
		pad.Parent = box
		local list = Instance.new("UIListLayout")
		list.Padding = UDim.new(0, 8)
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Parent = box
		local head = mkLabel(box, "다음엔 이길 수 있어 — 진 이유", 19, Color3.fromRGB(255, 190, 170), true, 0)
		head.Size = UDim2.new(1, 0, 0, 0)
		for i, r in reasons do
			if i > 3 then break end
			local line = mkLabel(box, "• " .. r[1], 14, Color3.fromRGB(245, 230, 214), false, i * 2 - 1)
			line.Size = UDim2.new(1, 0, 0, 0)
			local go = mkButton(box, "→ " .. r[2], COLORS.green, UDim2.new(1, 0, 0, 44), function()
				g:Destroy()
				openTab(r[3])
			end, true)
			go.LayoutOrder = i * 2
		end
		local close = mkButton(box, "닫기", COLORS.grey, UDim2.new(1, 0, 0, 40), function() g:Destroy() end, true)
		close.LayoutOrder = 99
	end

	-- 선장 현황 맨 위: 선체·선원·보급·화물을 막대 그림으로
	function H.visualStatus()
		local ship = view and view.ship
		if not ship then return end
		add(function()
			local card = Instance.new("Frame")
			card.Name = "StatusAtAGlance"
			card.Size = UDim2.new(1, -6, 0, 0)
			card.AutomaticSize = Enum.AutomaticSize.Y
			card.BackgroundColor3 = Color3.fromRGB(242, 228, 196)
			card.BorderSizePixel = 0
			corner(card, 10)
			local pad = Instance.new("UIPadding")
			pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 8), UDim.new(0, 8), UDim.new(0, 10), UDim.new(0, 10)
			pad.Parent = card
			local list = Instance.new("UIListLayout")
			list.Padding = UDim.new(0, 6)
			list.SortOrder = Enum.SortOrder.LayoutOrder
			list.Parent = card
			local t = mkLabel(card, "한눈에 보기", 15, Color3.fromRGB(110, 70, 30), true, 0)
			t.Size = UDim2.new(1, 0, 0, 0)
			local rows = {
				{ "선체", ship.hull or 0, ship.maxHull or 1, "yard", "hull" },
				{ "선원", ship.crew or 0, ship.maxCrew or 1, "recruit", "crew" },
				{ "보급", ship.supplies or 0, math.max(ship.supplies or 0, view.supplyMax or 60), "yard", "supply" },
				{ "화물", ship.cargoUsed or 0, ship.cargoCapacity or 1, "trade", "cargo" },
			}
			for i, r in rows do
				local ratio = math.clamp(r[2] / math.max(1, r[3]), 0, 1)
				local row = Instance.new("TextButton")
				row.LayoutOrder = i
				row.Size = UDim2.new(1, 0, 0, 44)
				row.BackgroundTransparency = 1
				row.Text = ""
				row.AutoButtonColor = false
				row.Parent = card
				local icon = modelIcon(row, "FacilityArt", r[5], nil, 32, r[1])
				icon.Name = "StatusMetricArt"
				icon.Position = UDim2.fromOffset(0, 6)
				local name = mkLabel(row, r[1], 14, Color3.fromRGB(52, 38, 24), true)
				name.Position = UDim2.fromOffset(36, 3)
				name.Size = UDim2.new(1, -118, 0, 18)
				name.AutomaticSize = Enum.AutomaticSize.None
				local track = Instance.new("Frame")
				track.Position = UDim2.new(0, 36, 0, 27)
				track.Size = UDim2.new(1, -40, 0, 12)
				track.BackgroundColor3 = Color3.fromRGB(210, 196, 166)
				track.BorderSizePixel = 0
				track.Parent = row
				corner(track, 6)
				local fill = Instance.new("Frame")
				fill.Size = UDim2.fromScale(ratio, 1)
				fill.BackgroundColor3 = if r[5] == "cargo" then (if ratio >= 1 then COLORS.red else UI_BRASS_DARK)
					elseif ratio < 0.35 then Color3.fromRGB(196, 70, 56) elseif ratio < 0.7 then Color3.fromRGB(214, 160, 60) else Color3.fromRGB(70, 150, 90)
				fill.BorderSizePixel = 0
				fill.Parent = track
				corner(fill, 6)
				local num = mkLabel(row, string.format("%d/%d", r[2], r[3]), 12, Color3.fromRGB(80, 64, 44), false)
				num.Position = UDim2.new(1, -72, 0, 3)
				num.Size = UDim2.fromOffset(72, 18)
				num.AutomaticSize = Enum.AutomaticSize.None
				num.TextXAlignment = Enum.TextXAlignment.Right
				row.Activated:Connect(function() openTab(r[4]) end)
				if (r[5] ~= "cargo" and ratio < 0.35) or (r[5] == "cargo" and ratio >= 1) then
					num.TextColor3 = COLORS.red
				end
			end
			return card
		end)
	end
end

-- [흥정 미니게임 · 2026-11-28 오너 지시] 강제 아님: 저울 멈추기·상인 표정 읽기·진짜 동전·산지 퀴즈.
-- 원화(docs/HAGGLE_MINIGAME_BRIEF.md)가 등록되면 그림·움직임을 쓰고, 없으면 같은 자리 UI 로 돈다. 판정은 서버.
do
	local TS = game:GetService("TweenService")
	local RS = game:GetService("RunService")
	local function art(key) local id = AssetIds["CardArt/" .. key]; return if id then "rbxassetid://" .. tostring(id) else nil end
	local INK = Color3.fromRGB(52, 38, 24)
	local PAPER = Color3.fromRGB(246, 234, 206)
	local GOLD = Color3.fromRGB(214, 170, 82)
	local FACE_TEXT = { smile = "😊 \"그 정도야 뭐…\"", think = "🤔 \"음… 글쎄요.\"", frown = "😠 \"장난하시오?\"" }
	local FACE_ROW = { smile = 0, think = 1, frown = 2 }

	-- 상인 얼굴: 시트(4프레임×3표정)가 있으면 눈 깜빡·끄덕 움직임, 없으면 이모지 말풍선
	local function merchantFace(parent, mood)
		local holder = parent:FindFirstChild("MerchantFace")
		if not holder then
			holder = Instance.new("ImageLabel")
			holder.Name = "MerchantFace"
			holder.AnchorPoint = Vector2.new(0.5, 0)
			holder.Position = UDim2.new(0.5, 0, 0, 6)
			holder.Size = UDim2.fromOffset(150, 150)
			holder.BackgroundTransparency = 1
			holder.ScaleType = Enum.ScaleType.Fit
			holder.Parent = parent
			local say = Instance.new("TextLabel")
			say.Name = "Say"
			say.AnchorPoint = Vector2.new(0.5, 0)
			say.Position = UDim2.new(0.5, 0, 1, 2)
			say.Size = UDim2.fromOffset(300, 26)
			say.BackgroundTransparency = 1
			say.Font = Enum.Font.GothamBold
			say.TextSize = 16
			say.TextColor3 = INK
			say.Parent = holder
		end
		local sheet = art("ui_haggle_merchant_sheet")
		holder.Say.Text = FACE_TEXT[mood] or ""
		local stageWidth = parent.AbsoluteSize.X
		holder.Say.Size = UDim2.fromOffset(math.min(300, if stageWidth > 0 then math.max(100, stageWidth - 8) else 260), 32)
		holder.Say.TextWrapped = true
		if sheet then
			holder.Say.Position = UDim2.new(0.5, 0, 1, 2)
			holder.Image = sheet
			holder.ImageRectSize = Vector2.new(256, 256)
			holder:SetAttribute("Row", FACE_ROW[mood] or 1)
			holder.ImageRectOffset = Vector2.new(0, (FACE_ROW[mood] or 1) * 256)
			if not game:GetService("GuiService").ReducedMotionEnabled and not holder:GetAttribute("Animating") then
				holder:SetAttribute("Animating", true)
				task.spawn(function()
					local f = 0
					while holder:IsDescendantOf(game) and not game:GetService("GuiService").ReducedMotionEnabled do
						holder.ImageRectOffset = Vector2.new(f * 256, (holder:GetAttribute("Row") or 1) * 256)
						task.wait(if f == 0 then 1.2 else 0.12)
						f = (f + 1) % 4 -- 가만히 있다가 깜빡·끄덕
					end
					if holder:IsDescendantOf(game) then
						holder.ImageRectOffset = Vector2.new(0, (holder:GetAttribute("Row") or 1) * 256)
						holder:SetAttribute("Animating", false)
					end
				end)
			end
		else
			holder.Image = ""
			holder.Say.Position = UDim2.new(0.5, 0, 0.5, -13)
		end
		-- 표정이 바뀔 때 살짝 들썩
		if not game:GetService("GuiService").ReducedMotionEnabled then
			local base = UDim2.new(0.5, 0, 0, 6)
			holder.Position = base + UDim2.fromOffset(0, -6)
			TS:Create(holder, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Position = base }):Play()
		end
	end

	function H.openHaggle(goodId, goodName)
		local pg = player:FindFirstChildOfClass("PlayerGui")
		if pg and pg:FindFirstChild("HaggleGame") then return end
		if H.haggleOpening then return end
		H.haggleOpening = true
		local r = H.call("HaggleStart", { goodId = goodId })
		H.haggleOpening = false
		local pend = view and view.haggle and view.haggle.pending
		if not (r and r.ok ~= false) or not pend or pend.goodId ~= goodId then return end
		local g = overlayGui("HaggleGame", 80)
		local dim = Instance.new("Frame")
		dim.Size = UDim2.fromScale(1, 1)
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.45
		dim.BorderSizePixel = 0
		dim.Parent = g
		local box = Instance.new("ImageLabel")
		box.Name = "HaggleBox"
		box.AnchorPoint = Vector2.new(0.5, 0.5)
		box.Position = UDim2.fromScale(0.5, 0.5)
		box.Size = UDim2.fromOffset(460, 460)
		box.BackgroundColor3 = PAPER
		box.Image = art("ui_haggle_bg") or ""
		box.ScaleType = Enum.ScaleType.Crop
		box.BorderSizePixel = 0
		box.Parent = g
		corner(box, 16)
		local lim = Instance.new("UISizeConstraint")
		lim.MaxSize = Vector2.new(460, 460)
		lim.Parent = box
		local st = Instance.new("UIStroke")
		st.Color = GOLD
		st.Thickness = 3
		st.Parent = box
		local vp = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600)
		local boxWidth, boxHeight = math.min(460, math.max(1, vp.X - 24)), math.min(460, math.max(1, vp.Y - 24))
		box.Size = UDim2.fromOffset(boxWidth, boxHeight)
		local reduced = game:GetService("GuiService").ReducedMotionEnabled
		local title = mkLabel(box, "흥정 · " .. tostring(goodName or ""), 18, INK, true)
		title.Position = UDim2.fromOffset(14, 10)
		title.Size = UDim2.new(1, -120, 0, 40)
		title.TextTruncate = Enum.TextTruncate.AtEnd
		title.AutomaticSize = Enum.AutomaticSize.None
		local skip = mkButton(box, "그냥 사기", COLORS.grey, UDim2.fromOffset(96, 44), function() g:Destroy() end, true)
		skip.Position = UDim2.new(1, -106, 0, 8)
		local scroll = Instance.new("ScrollingFrame")
		scroll.Name = "StageScroll"
		scroll.Position = UDim2.fromOffset(12, 56)
		scroll.Size = UDim2.new(1, -24, 1, -68)
		scroll.BackgroundTransparency = 1
		scroll.BorderSizePixel = 0
		scroll.ScrollBarThickness = 4
		scroll.ScrollingDirection = Enum.ScrollingDirection.Y
		scroll.Parent = box
		local stageHeight = math.max(336, boxHeight - 68)
		scroll.CanvasSize = UDim2.fromOffset(0, stageHeight)
		local stage = Instance.new("Frame")
		stage.Name = "Stage"
		stage.Size = UDim2.new(1, -6, 0, stageHeight)
		stage.BackgroundTransparency = 1
		stage.Parent = scroll
		local finished, selecting = false, false
		local function finish(payload)
			if finished or not g.Parent then return end
			finished = true
			payload.goodId = goodId
			local res = H.call("HagglePlay", payload)
			if not g.Parent then return end
			local ok = res and res.ok ~= false
			local deal = view and view.haggle and view.haggle.deal
			local pct = if ok and deal and deal.goodId == goodId then tonumber(deal.pct) else nil
			if ok then Sfx.play("sfx_card_coin", 0.5) end -- 실패 음향은 기존 H.call에서 재생
			scroll.Visible = false
			local banner = mkLabel(box, if not res then "결과 확인 불가" elseif ok then "흥정 성공!" else "정가대로…", 26, Color3.fromRGB(255, 239, 202), true)
			banner.AnchorPoint = Vector2.new(0.5, 0.5)
			banner.Position = UDim2.fromScale(0.5, 0.44)
			banner.Size = UDim2.new(1, -32, 0, 58)
			banner.AutomaticSize = Enum.AutomaticSize.None
			banner.TextXAlignment = Enum.TextXAlignment.Center
			banner.BackgroundColor3 = if ok then Color3.fromRGB(43, 82, 52) else Color3.fromRGB(101, 60, 45)
			banner.BackgroundTransparency = 0
			banner.ZIndex = 30
			corner(banner, 8)
			local detail = mkLabel(box, if pct then string.format("다음 구매 %d%% 할인", pct) elseif not res then "서버 응답을 확인하지 못했어." elseif ok then "다음 구매에 적용돼." else "추가 손해 없이 정가 구매", 17, INK, true)
			detail.AnchorPoint = Vector2.new(0.5, 0.5)
			detail.Position = UDim2.fromScale(0.5, 0.64)
			detail.Size = UDim2.new(1, -32, 0, 44)
			detail.AutomaticSize = Enum.AutomaticSize.None
			detail.TextWrapped = true
			detail.TextXAlignment = Enum.TextXAlignment.Center
			detail.BackgroundColor3 = PAPER
			detail.BackgroundTransparency = 0.08
			detail.ZIndex = 30
			corner(detail, 6)
			if not reduced then
				local scale = Instance.new("UIScale")
				scale.Scale = 0.9
				scale.Parent = banner
				TS:Create(scale, TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Scale = 1 }):Play()
			end
			task.delay(1.8, function() if g.Parent then g:Destroy() end end)
		end

		local hint = mkLabel(stage, "", 14, INK, false)
		hint.Position = UDim2.new(0, 0, 1, -48)
		hint.Size = UDim2.new(1, 0, 0, 44)
		hint.AutomaticSize = Enum.AutomaticSize.None
		hint.TextWrapped = true

		if pend.game == "scale" then
			-- 1) 저울 멈추기: 바늘이 왕복, 금색 구간에서 탭
			hint.Text = "바늘이 금색 칸에 올 때 '지금!'을 눌러. 가운데일수록 많이 깎여."
			local track = Instance.new("ImageLabel")
			track.Name = "ScaleTrack"
			track.Position = UDim2.new(0, 10, 0, 120)
			track.Size = UDim2.new(1, -20, 0, 40)
			track.BackgroundColor3 = Color3.fromRGB(120, 92, 60)
			track.Image = art("ui_haggle_scale") or ""
			track.ScaleType = if track.Image ~= "" then Enum.ScaleType.Slice else Enum.ScaleType.Stretch
			track.SliceCenter = Rect.new(64, 24, 960, 104)
			track.SliceScale = 0.5
			track.BorderSizePixel = 0
			track.Parent = stage
			corner(track, 10)
			local zone = Instance.new("Frame")
			zone.Name = "GoldZone"
			zone.AnchorPoint = Vector2.new(0.5, 0)
			zone.Position = UDim2.fromScale(pend.center, 0)
			zone.Size = UDim2.fromScale(pend.width * 2, 1)
			zone.BackgroundColor3 = Color3.fromRGB(240, 200, 90)
			zone.BackgroundTransparency = 0.15
			zone.BorderSizePixel = 0
			zone.Parent = track
			local core = zone:Clone()
			core.Name = "PerfectZone"
			core.Position = UDim2.fromScale(0.5, 0)
			core.Size = UDim2.fromScale(0.25, 1)
			core.BackgroundColor3 = Color3.fromRGB(255, 240, 170)
			core.BackgroundTransparency = 0
			core.Parent = zone
			local needle = Instance.new("ImageLabel")
			needle.Name = "Needle"
			needle.AnchorPoint = Vector2.new(0.5, 0.5)
			needle.Position = UDim2.fromScale(0, 0.5)
			needle.Size = UDim2.new(0, 8, 1.6, 0)
			needle.BackgroundColor3 = Color3.fromRGB(60, 30, 20)
			needle.Image = art("ui_haggle_needle") or ""
			if needle.Image ~= "" then
				needle.BackgroundTransparency = 1
				needle.Size = UDim2.new(0, 16, 1.6, 0)
				needle.ScaleType = Enum.ScaleType.Fit
			end
			needle.BorderSizePixel = 0
			needle.ZIndex = 5
			needle.Parent = track
			local t0 = os.clock()
			local conn
			conn = RS.RenderStepped:Connect(function()
				if not g.Parent or not needle.Parent or finished then conn:Disconnect() return end
				local phase = ((os.clock() - t0) / pend.period) % 2
				needle.Position = UDim2.fromScale(if phase < 1 then phase else 2 - phase, 0.5)
			end)
			local go = mkButton(stage, "지금!", COLORS.gold, UDim2.new(1, -20, 0, 56), function()
				finish({ t = os.clock() - t0 })
			end, true)
			go.Position = UDim2.new(0, 10, 0, 200)
			go.TextSize = 24
		elseif pend.game == "face" then
			-- 2) 상인 표정 읽기: 할인을 불러 보고 표정을 본다. 3번 안에 '이걸로 하자'
			hint.Text = "깎을 만큼 불러 봐. 웃으면 더 불러도 되고, 찡그리면 너무 많이 부른 거야. 3번 안에 정해."
			local offer, tries = 6, 0
			merchantFace(stage, "think")
			local label = mkLabel(stage, "", 22, INK, true)
			label.Position = UDim2.new(0, 0, 0, 186)
			label.Size = UDim2.new(1, 0, 0, 30)
			label.AutomaticSize = Enum.AutomaticSize.None
			label.TextXAlignment = Enum.TextXAlignment.Center
			local function show() label.Text = string.format("%d%% 깎아 주세요 (남은 시도 %d)", offer, 3 - tries) end
			show()
			local function ask(delta)
				if finished or selecting or not g.Parent or tries >= 3 then return end
				offer = math.clamp(offer + delta, 4, 12)
				tries += 1
				merchantFace(stage, pend.faces and pend.faces[offer] or "think")
				show()
				if tries >= 3 then
					selecting = true
					local finalOffer = offer
					task.delay(0.6, function() finish({ offer = finalOffer }) end)
				end
			end
			local less = mkButton(stage, "− 덜 깎기", COLORS.blue, UDim2.new(0.32, -6, 0, 48), function() ask(-2) end, true)
			less.Position = UDim2.new(0, 0, 0, 226)
			local more = mkButton(stage, "+ 더 깎기", COLORS.red, UDim2.new(0.32, -6, 0, 48), function() ask(2) end, true)
			more.Position = UDim2.new(0.34, 0, 0, 226)
			local deal = mkButton(stage, "이걸로 하자", COLORS.green, UDim2.new(0.32, 0, 0, 48), function() if not selecting then finish({ offer = offer }) end end, true)
			deal.Position = UDim2.new(0.68, 0, 0, 226)
		elseif pend.game == "coin" then
			-- 3) 진짜 동전 고르기: 맨 위 정품 견본과 같은 동전
			hint.Text = "맨 위 '정품 견본'과 똑같은 동전을 골라. 테두리·색·문양을 잘 봐."
			local function coin(parent, look, size)
				local c = Instance.new("ImageButton")
				c.Size = UDim2.fromOffset(size, size)
				c.BackgroundColor3 = if look == "color" then Color3.fromRGB(196, 170, 120) else Color3.fromRGB(214, 176, 72)
				c.AutoButtonColor = true
				c.Image = art("ui_haggle_coin_" .. look) or ""
				c.Parent = parent
				corner(c, 100)
				if c.Image == "" then
					local ring = Instance.new("UIStroke")
					ring.Color = Color3.fromRGB(120, 90, 30)
					ring.Thickness = if look == "edge" then 1 else 4
					ring.Parent = c
					local stamp = Instance.new("TextLabel")
					stamp.Size = UDim2.fromScale(1, 1)
					stamp.BackgroundTransparency = 1
					stamp.Font = Enum.Font.Antique
					stamp.TextScaled = true
					stamp.Text = if look == "stamp" then "♛?" else "♛"
					stamp.TextColor3 = Color3.fromRGB(110, 80, 20)
					stamp.TextTransparency = if look == "stamp" then 0.55 else 0
					stamp.Parent = c
				end
				return c
			end
			local sample = coin(stage, "real", 64)
			sample.Position = UDim2.new(0.5, -32, 0, 4)
			sample.Active = false
			local cap = mkLabel(stage, "정품 견본", 12, INK, true)
			cap.Position = UDim2.new(0, 0, 0, 70)
			cap.Size = UDim2.new(1, 0, 0, 16)
			cap.AutomaticSize = Enum.AutomaticSize.None
			cap.TextXAlignment = Enum.TextXAlignment.Center
			local row = Instance.new("Frame")
			row.Position = UDim2.new(0, 0, 0, 110)
			row.Size = UDim2.new(1, 0, 0, 96)
			row.BackgroundTransparency = 1
			row.Parent = stage
			local lay = Instance.new("UIListLayout")
			lay.FillDirection = Enum.FillDirection.Horizontal
			lay.HorizontalAlignment = Enum.HorizontalAlignment.Center
			lay.Padding = UDim.new(0, 14)
			lay.Parent = row
			local coinCount = math.max(1, #(pend.looks or {}))
			local coinSize = math.max(44, math.min(80, math.floor((boxWidth - 30 - 14 * (coinCount - 1)) / coinCount)))
			for i, look in pend.looks or {} do
				-- 고정 슬롯 안의 동전만 세로축 회전: 옆 동전과 터치 위치는 움직이지 않는다.
				local slot = Instance.new("Frame")
				slot.Name = "CoinSlot"
				slot.LayoutOrder = i
				slot.Size = UDim2.fromOffset(coinSize, coinSize)
				slot.BackgroundTransparency = 1
				slot.Parent = row
				local c = coin(slot, look, coinSize)
				c.AnchorPoint = Vector2.new(0.5, 0.5)
				c.Position = UDim2.fromScale(0.5, 0.5)
				c.Activated:Connect(function()
					if finished or selecting or not g.Parent then return end
					selecting = true
					if reduced then finish({ pick = i }); return end
					-- 첫 선택만 뒤집고, 닫힌 창에는 지연 연출을 실행하지 않는다.
					TS:Create(c, TweenInfo.new(0.12, Enum.EasingStyle.Sine, Enum.EasingDirection.In), { Size = UDim2.fromOffset(6, coinSize) }):Play()
					task.delay(0.13, function()
						if g.Parent and c.Parent then TS:Create(c, TweenInfo.new(0.15, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), { Size = UDim2.fromOffset(coinSize, coinSize) }):Play() end
					end)
					task.delay(0.35, function() finish({ pick = i }) end)
				end)
			end
		else
			-- 6) 산지 퀴즈: 정답이면 10% (백과 카드와 연결)
			hint.Text = "맞히면 상인이 '물건 좀 아시네' 하며 깎아 줘. 백과에서 산지를 미리 봐 두면 쉬워."
			local q = mkLabel(stage, tostring(pend.question or ""), 18, INK, true)
			q.Position = UDim2.fromOffset(0, 10)
			q.Size = UDim2.new(1, 0, 0, 50)
			q.AutomaticSize = Enum.AutomaticSize.None
			q.TextWrapped = true
			for i, name in pend.options or {} do
				local b = mkButton(stage, string.format("%d. %s", i, name), COLORS.blue, UDim2.new(0.5, -6, 0, 52), function() finish({ pick = i }) end, true)
				b.Position = UDim2.new(if i % 2 == 1 then 0 else 0.5, if i % 2 == 1 then 0 else 6, 0, 70 + math.floor((i - 1) / 2) * 60)
			end
		end
		if not reduced then
			local sc = Instance.new("UIScale")
			sc.Scale = 0.85
			sc.Parent = box
			TS:Create(sc, TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Scale = 1 }):Play()
		end
		Sfx.play("sfx_card_deal", 0.35)
	end
end

-- [퀘스트 대화 연출 · 2026-11-28 오너 지시: 퀘스트 전체 자연스러운 이야기 — 초상화·대사]
-- 새 의뢰를 받으면 말하는 사람 초상 + 사연을 2~4마디로 나눠 대화처럼 보여 주고(누르면 다음, 건너뛰기),
-- 마지막에 '지금 할 일'을 한 줄로. 끝내면 같은 사람이 결말을 말한다(결과 장면에 초상).
-- 새 개별 초상(Portraits/comp_<id>, npc_keeper_<시설>, hero_<국가>)이 등록되면 그것부터 쓴다.
do
	local TS = game:GetService("TweenService")
	local KEEPER_ROLE = { trade = "merchant", tavern = "tavern", scholar = "scholar", harbor = "harbor", yard = "yard", battle = "tavern" }
	H.questTalkMemo = H.questTalkMemo or {}

	-- 초상: (이미지, 칸 위치, 칸 크기) — 개별 파일이면 칸 없음
	function H.portraitFor(talk, exact)
		if type(talk) ~= "table" then return nil end
		local key = tostring(talk.key or "")
		local kind, id = string.match(key, "^(%a+):(.+)$")
		if kind == "comp" then
			local own = AssetIds["Portraits/comp_" .. id]
			if own then return own end
			local spec = COMPANION_PORTRAIT[id]
			if spec and AssetIds["Portraits/" .. spec.atlas] then
				local k = sheetK(spec.atlas)
				return AssetIds["Portraits/" .. spec.atlas], spec.offset * k, Vector2.new(256, 336) * k
			end
			if string.sub(id, 1, 2) == "h_" then
				local hid, hoff = H.heroPortraitAsset(string.sub(id, 3))
				if hid then return hid, hoff, Vector2.new(256, 336) end
			end
		elseif kind == "keeper" then
			local own = AssetIds["Portraits/npc_keeper_" .. id]
			if own then return own end
			local role = KEEPER_ROLE[id] or "tavern"
			local rid, roff, rsize = H.facilityPortraitAsset(view and view.player and view.player.portId, role)
			if rid then return rid, roff, rsize end
			if FACILITY_ATLAS and FACILITY_TILE[role] then
				local k = sheetK("crew_facilities")
				return FACILITY_ATLAS, FACILITY_TILE[role] * k, Vector2.new(256, 336) * k
			end
		elseif kind == "hero" then
			local own = AssetIds["Portraits/hero_" .. id]
			if own then return own end
			local hid, hoff = H.heroPortraitAsset(id)
			if hid then return hid, hoff, Vector2.new(256, 336) end
		end
		-- 정확한 화자 초상이 없을 때 상세 화면은 이름만 표시한다.
		if exact then return nil end
		-- 이름만 있는 인물(장 이야기): 동료 목록에서 같은 이름을 찾는다
		if view and view.companions and view.companions.list then
			for _, m in view.companions.list do
				if m.name == talk.name then return H.portraitFor({ key = "comp:" .. m.id }) end
			end
		end
		return H.portraitFor({ key = "keeper:tavern" }, true)
	end

	-- 사연을 말풍선 단위로 자른다: 따옴표 대사는 인물, 나머지는 해설. 한 마디 최대 두 문장.
	local function beats(text, talk)
		local out = {}
		text = string.gsub(tostring(text or ""), "^제%d+장%. ", "")
		local sentences = {}
		for piece in string.gmatch(text .. " ", "(.-[%.%?!…\"]+)%s+") do
			if #piece > 1 then table.insert(sentences, piece) end
		end
		if #sentences == 0 and #text > 0 then sentences = { text } end
		local buf, bufQuote = {}, nil
		local function flush()
			if #buf == 0 then return end
			table.insert(out, { quote = bufQuote, text = table.concat(buf, " ") })
			buf, bufQuote = {}, nil
		end
		for _, sen in sentences do
			local q = string.find(sen, "\"", 1, true) ~= nil
			if bufQuote ~= nil and bufQuote ~= q then flush() end
			bufQuote = q
			table.insert(buf, sen)
			if #buf >= 2 then flush() end
		end
		flush()
		while #out > 4 do
			local last = table.remove(out)
			out[#out].text ..= " " .. last.text
		end
		return out
	end

	-- 대화 장면: lines = { {speaker, role, talk, text, narration} ... }, onDone
	function H.storyTalk(lines, onDone)
		local pg = player:WaitForChild("PlayerGui")
		local old = pg:FindFirstChild("QuestTalk")
		if old then old:Destroy() end
		local g = overlayGui("QuestTalk", 71)
		local dim = Instance.new("TextButton")
		dim.Name = "TalkDim"
		dim.Size = UDim2.fromScale(1, 1)
		dim.AutoButtonColor = false
		dim.Text = ""
		dim.BackgroundColor3 = Color3.new(0, 0, 0)
		dim.BackgroundTransparency = 0.5
		dim.BorderSizePixel = 0
		dim.Parent = g
		if H.cinemaBars then H.cinemaBars(g, 60) end
		local vp = workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(800, 600)
		local narrow = vp.X < 600
		-- 초상(왼쪽 아래, 크게)
		local face = Instance.new("ImageLabel")
		face.Name = "TalkPortrait"
		face.AnchorPoint = Vector2.new(0, 1)
		face.Position = UDim2.new(0, 16, 1, if narrow then -170 else -150)
		face.Size = if narrow then UDim2.fromOffset(150, 196) else UDim2.fromOffset(220, 288)
		face.BackgroundColor3 = Color3.fromRGB(40, 30, 22)
		face.BorderSizePixel = 0
		face.ScaleType = Enum.ScaleType.Crop
		face.ZIndex = 5
		face.Parent = g
		corner(face, 12)
		local fs = Instance.new("UIStroke")
		fs.Color = Color3.fromRGB(214, 170, 82)
		fs.Thickness = 3
		fs.Parent = face
		-- 대사 상자(아래 전체 폭)
		local box = Instance.new("Frame")
		box.Name = "TalkBox"
		box.AnchorPoint = Vector2.new(0.5, 1)
		box.Position = UDim2.new(0.5, 0, 1, -16)
		box.Size = UDim2.new(1, -32, 0, if narrow then 150 else 132)
		box.BackgroundColor3 = Color3.fromRGB(246, 234, 206)
		box.BorderSizePixel = 0
		box.ZIndex = 6
		box.Parent = g
		corner(box, 12)
		local bs = Instance.new("UIStroke")
		bs.Color = Color3.fromRGB(196, 150, 70)
		bs.Thickness = 3
		bs.Parent = box
		local nameTag = Instance.new("TextLabel")
		nameTag.Name = "TalkName"
		nameTag.Position = UDim2.fromOffset(14, -18)
		nameTag.Size = UDim2.fromOffset(240, 32)
		nameTag.BackgroundColor3 = Color3.fromRGB(70, 44, 24)
		nameTag.BorderSizePixel = 0
		nameTag.Font = Enum.Font.GothamBlack
		nameTag.TextSize = 16
		nameTag.TextColor3 = Color3.fromRGB(255, 230, 170)
		nameTag.ZIndex = 7
		nameTag.Parent = box
		corner(nameTag, 8)
		local body = Instance.new("TextLabel")
		body.Name = "TalkText"
		body.Position = UDim2.fromOffset(18, 22)
		body.Size = UDim2.new(1, -36, 1, -48)
		body.BackgroundTransparency = 1
		body.Font = Enum.Font.Gotham
		body.TextSize = if narrow then 15 else 17
		body.TextWrapped = true
		body.TextXAlignment = Enum.TextXAlignment.Left
		body.TextYAlignment = Enum.TextYAlignment.Top
		body.TextColor3 = Color3.fromRGB(52, 38, 24)
		body.ZIndex = 7
		body.Parent = box
		local next = Instance.new("TextLabel")
		next.AnchorPoint = Vector2.new(1, 1)
		next.Position = UDim2.new(1, -14, 1, -6)
		next.Size = UDim2.fromOffset(160, 20)
		next.BackgroundTransparency = 1
		next.Font = Enum.Font.GothamBold
		next.TextSize = 12
		next.TextXAlignment = Enum.TextXAlignment.Right
		next.TextColor3 = Color3.fromRGB(130, 100, 60)
		next.ZIndex = 7
		next.Parent = box
		local skip = mkButton(g, "건너뛰기 ▶▶", COLORS.grey, UDim2.fromOffset(120, 40), function() end, true)
		skip.AnchorPoint = Vector2.new(1, 0)
		skip.Position = UDim2.new(1, -16, 0, 70)
		skip.ZIndex = 8
		local index, closed = 0, false
		local function close()
			if closed then return end
			closed = true
			if g.Parent then g:Destroy() end
			if onDone then task.spawn(onDone) end
		end
		local lastFace = nil
		local function show()
			index += 1
			local ln = lines[index]
			if not ln then close() return end
			local narration = ln.narration == true
			nameTag.Text = if narration then "이야기" else (tostring(ln.speaker or "") .. (if ln.role and ln.role ~= "" then " · " .. ln.role else ""))
			nameTag.BackgroundColor3 = if narration then Color3.fromRGB(70, 70, 80) else Color3.fromRGB(70, 44, 24)
			body.Font = if narration then Enum.Font.GothamMedium else Enum.Font.Gotham
			body.TextColor3 = if narration then Color3.fromRGB(86, 74, 60) else Color3.fromRGB(52, 38, 24)
			next.Text = if index < #lines then "누르면 다음 ▼" else "누르면 닫기"
			-- 초상: 해설일 땐 흐리게, 말할 땐 또렷하게 + 바뀌면 살짝 튀어나옴
			local img, off, size = H.portraitFor(ln.talk)
			face.Visible = img ~= nil
			if img then
				face.Image = "rbxassetid://" .. tostring(img)
				face.ImageRectOffset = off or Vector2.zero
				face.ImageRectSize = size or Vector2.zero
			end
			face.ImageTransparency = if narration then 0.45 else 0
			local faceKey = tostring(img) .. tostring(off)
			if faceKey ~= lastFace and not game:GetService("GuiService").ReducedMotionEnabled then
				local base = face.Position
				face.Position = base + UDim2.fromOffset(-30, 0)
				TS:Create(face, TweenInfo.new(0.25, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Position = base }):Play()
			end
			lastFace = faceKey
			if H.typewrite then H.typewrite(body, tostring(ln.text or ""), 0.02) else body.Text = tostring(ln.text or "") end
			Sfx.play("sfx_card_page", 0.25, 1)
		end
		dim.Activated:Connect(function()
			-- 글자가 아직 나오는 중이면 한 번에 다 보여 주고, 다 나왔으면 다음
			if body.MaxVisibleGraphemes ~= -1 then body.MaxVisibleGraphemes = -1 return end
			show()
		end)
		skip.Activated:Connect(close)
		show()
	end

	-- 의뢰 하나를 대화로: 사연 → (인물 한마디) → 지금 할 일
	function H.questTalkLines(q)
		local talk = q.talk or { name = "주점 주인", role = "주점", key = "keeper:tavern" }
		local lines = {}
		if q.chapter then
			table.insert(lines, { narration = true, text = "📖 " .. tostring(q.chapter) .. " — " .. tostring(q.name or ""), talk = talk })
		end
		for _, b in beats(q.story, talk) do
			table.insert(lines, { speaker = talk.name, role = talk.role, talk = talk, text = b.text, narration = not b.quote })
		end
		local extra = q.story2
		if extra and extra.speaker and extra.line then
			table.insert(lines, { speaker = extra.speaker, role = talk.role, talk = { name = extra.speaker, key = talk.key }, text = "\"" .. tostring(extra.line) .. "\"" })
		end
		local step = H.nextStep and H.nextStep()
		local todo = if step and step.quest and step.quest.id == q.id then step.text else q.summary
		table.insert(lines, { speaker = talk.name, role = talk.role, talk = talk,
			text = (if q.problem then "왜? " .. tostring(q.problem) .. "\n" else "") .. "▶ 할 일: " .. tostring(todo) .. (if q.result then "\n✦ 하면: " .. tostring(q.result) else "") })
		return lines
	end

	-- 새로 받은 의뢰 감지(첫 화면은 기준선) → 차례로 대화
	function H.checkQuestTalks()
		local active = view and view.quests and view.quests.active
		if type(active) ~= "table" then return end
		for _, q in active do H.questTalkMemo[q.id] = q.talk end
		local first = H.seenActiveQuests == nil
		H.seenActiveQuests = H.seenActiveQuests or {}
		local fresh = {}
		for _, q in active do
			if not H.seenActiveQuests[q.id] then
				H.seenActiveQuests[q.id] = true
				if not first and q.story and #tostring(q.story) > 0 then table.insert(fresh, q) end
			end
		end
		if #fresh == 0 then return end
		task.spawn(function()
			local pg = player:WaitForChild("PlayerGui")
			for i, q in fresh do
				if i > 2 then break end -- 한꺼번에 여러 개 받으면 앞의 둘만(나머지는 일지에)
				while player.Parent and (newGameMode or sceneHold or H.sceneBusy or H.questScenesPlaying
					or pg:FindFirstChild("StoryScene", true) or pg:FindFirstChild("WonderScene", true) or pg:FindFirstChild("CardGain")
					or pg:FindFirstChild("CardFan") or pg:FindFirstChild("QuestResult") or pg:FindFirstChild("QuestTalk") or pg:FindFirstChild("IntroDialog")) do
					task.wait(0.3)
				end
				if not player.Parent then return end
				local done = false
				H.storyTalk(H.questTalkLines(q), function() done = true end)
				while player.Parent and not done do task.wait(0.2) end
			end
		end)
	end
end

function H.checkNewCards()
	local cards = view and view.codex and view.codex.cards
	local owned = view and view.cardbook and view.cardbook.owned
	if not cards and type(owned) ~= "table" then return end
	-- [저장 보호] 최초 서버 스냅샷은 양쪽 컬렉션의 기준선으로만 삼아 재접속 중복 연출을 막는다.
	local acquired, gainedIds = {}, {}
	if cards then
		local firstKnowledgeSnapshot = H.seenCards == nil
		H.seenCards = H.seenCards or {}
		for _, c in cards do
			if c.found and not H.seenCards[c.id] then
				H.seenCards[c.id] = true
				if not firstKnowledgeSnapshot then
					table.insert(acquired, { card = c, extra = 0 })
					gainedIds[c.id] = true
				end
			end
		end
	end
	-- [전투 카드] 서버가 실제로 늘려 준 보유 수만 감지한다. 지식카드와 같은 ID는 이중 표시하지 않는다.
	-- 이미 있던 카드의 추가 1장도 획득으로 표시하되, 강화 등 수량 감소로는 연출하지 않는다.
	if type(owned) == "table" then
		local firstCombatSnapshot = H.seenCombatCards == nil
		local oldOwned = H.seenCombatCards or {}
		if not firstCombatSnapshot then
			local CB = require(Shared:WaitForChild("CardBook"))
			for id, amount in owned do
				if type(id) == "string" and type(amount) == "number" and amount > (oldOwned[id] or 0)
					and not gainedIds[id] then
					local def = CB.def(id)
					if def then
						local oldCount = oldOwned[id] or 0
						table.insert(acquired, {
							card = {
								id = id, name = def.name,
								rarity = if def.hero then "Legendary" else "Common",
								gainType = "combat", isHero = def.hero == true,
								isSpecial = CB.isSpecial(id),
								isDuplicate = oldCount > 0,
								stageArt = def.stage and def.stage.art,
							},
							extra = math.max(0, amount - oldCount - 1),
						})
						gainedIds[id] = true
					end
				end
			end
		end
		H.seenCombatCards = table.clone(owned)
	end
	if #acquired == 0 then return end
	-- [단일 연출 큐] 퀘스트/전투/카드선택 중 끼어들지 않고, 획득순으로 비차단 표시한다.
	H.cardGainQueue = H.cardGainQueue or {}
	for _, entry in acquired do
		table.insert(H.cardGainQueue, entry)
	end
	if H.cardGainPlaying then return end
	H.cardGainPlaying = true
	task.spawn(function()
		while #H.cardGainQueue > 0 and player.Parent do
			local pg = player:WaitForChild("PlayerGui")
			-- [연결 수정 · 2026-11-28] 지상 탐험 중 발견한 카드도 바로 보여 준다(예전엔 탐험이 끝날 때까지 밀렸다).
			while player.Parent and (newGameMode or sceneHold or H.sceneBusy
				or H.questScenesPlaying or pg:FindFirstChild("StoryScene", true)
				or pg:FindFirstChild("WonderScene", true) or pg:FindFirstChild("HistoryEvent", true)) do
				task.wait(0.2)
			end
			if not player.Parent then break end
			-- [여러 장 한꺼번에] 새 카드 3장 이상이면 부채꼴로 한 번에 펼친 뒤, 영웅급 이상만 따로 크게 보여 준다.
			local freshCount = 0
			for _, entry in H.cardGainQueue do
				if not entry.card.isDuplicate and not entry.card.fanShown then freshCount += 1 end
			end
			if freshCount >= 3 and H.showCardFan then
				local batch = {}
				for i = #H.cardGainQueue, 1, -1 do
					local entry = H.cardGainQueue[i]
					if not entry.card.isDuplicate and not entry.card.fanShown and #batch < 5 then
						table.insert(batch, 1, entry)
						table.remove(H.cardGainQueue, i)
					end
				end
				H.showCardFan(batch)
				task.wait(3.3)
				for _, entry in batch do
					local lv = ({ Epic = 3, Legendary = 4 })[entry.card.rarity] or (if entry.card.isHero then 4 else 0)
					entry.card.fanShown = true
					if lv >= 3 then table.insert(H.cardGainQueue, 1, entry) end
					if H.checkSetComplete then H.checkSetComplete(entry.card) end
				end
				continue
			end
			local found = table.remove(H.cardGainQueue, 1)
			if found.card.isDuplicate and H.showCardPlusOne then
				-- [중복 카드] 흐름을 끊지 않는 작은 '+N' 알림만
				H.showCardPlusOne(found.card, 1 + (found.extra or 0))
				task.wait(1.3)
			else
				H.showCardGain(found.card, found.extra)
				task.wait(3.40)
				if H.checkSetComplete then H.checkSetComplete(found.card) end
				-- [원더 첫 습득] 불가사의 카드를 처음 얻으면 원더 연출씬을 한 번 자동 재생(이후엔 '다시 보기')
				local okW, WS = pcall(function() return require(Shared:WaitForChild("WonderScenes")) end)
				if okW and WS and WS.Scenes and WS.Scenes[found.card.id] and H.playWonderScene then
					H.playWonderScene(found.card.id)
					while player.Parent and pg:FindFirstChild("WonderScene", true) do task.wait(0.3) end
				end
			end
		end
		H.cardGainPlaying = false
	end)
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

	-- [지식 백과] 기존 도감에서 백과사전 양장본으로 연결한다.
	add(function()
		return mkRow(content, "대항해 지식 대백과", "대표 삽화 1장 · 역사 해설 · 관련 지식 · 책갈피", {
			{ text = "책 펼치기", color = COLORS.gold, onClick = function()
				codexField = "book"
				render()
			end },
		}, 76)
	end)
	-- [서재 빠른 길] 긴 설명 카드 대신 네 가지 목적지를 손가락 두 번 이내에 연다.
	add(function()
		local quick = Instance.new("Frame")
		quick.Name = "CodexQuickNavigation"
		quick.BackgroundTransparency = 1
		local compact = content.AbsoluteSize.X < 600
		quick.Size = UDim2.new(1, -6, 0, if compact then 122 else 56)
		local layout = Instance.new("UIGridLayout")
		layout.CellSize = UDim2.new(if compact then 0.5 else 0.25, -6, 0, 54)
		layout.CellPadding = UDim2.fromOffset(6, 6)
		layout.SortOrder = Enum.SortOrder.LayoutOrder
		layout.Parent = quick
		for index, action in {
			{ "이름 검색", "search" },
			{ "자원 도감", "r:all" },
			{ "14개 주제", "o:all" },
			{ "근거 보기", "e:all" },
		} do
			local button = mkButton(quick, action[1], if index == 1 then COLORS.gold else COLORS.blue,
				UDim2.new(), function()
					codexField = action[2]
					H.tradeBookGood = nil
					render()
				end, true)
			button.LayoutOrder = index
		end
		return quick
	end)
	add(function() return mkHeader(content, "지식 탐색 · 7개 영역") end)
	add(function()
		local row = mkRow(content, "접현 전투 카드", "병종·영웅·특수 카드 효과", {
			{ text = "카드 보기", color = COLORS.blue, onClick = function() codexField = "boarding"; render() end },
		}, 60)
		withIcon(row, "Menu", "battle", nil, 44)
		return row
	end)
	for _, group in cx.worldGroups or {} do
		add(function()
			return mkRow(content, group.name .. " · " .. tostring(cx.worldCounts[group.id] or 0) .. "장", "지형·생명·원자재·건축·기술·학문·인류의 기록", {
				{ text = "보기", color = COLORS.blue, onClick = function() codexField = "w:" .. group.id; render() end },
			}, 52)
		end)
	end
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
		-- [책 판면] 기존 자원·도감 데이터를 두 페이지로 읽는다. 모바일은 손가락으로 한 쪽씩 넘긴다.
		-- 다른 품목도 같은 책을 열며, 자원·카드·가격·저장 구조는 변경하지 않는다.
		for _, item in view.codex.resources or {} do
			if item.id == H.tradeBookGood and item.category == selected then
				add(function()
					local book = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, 396), COLORS.leather)
					book.Name = "ScholarTradeEncyclopediaBook"
					corner(book, 9)
					bookMaterial(book, "leather", 192)
					local heading = mkLabel(book, "세계 산업 백과  ·  " .. item.name, 23, Color3.fromRGB(255, 232, 177), true)
					heading.Position = UDim2.fromOffset(14, 9)
					heading.Size = UDim2.new(1, -28, 0, 30)
					heading.AutomaticSize = Enum.AutomaticSize.None
					local left = mkBox(book, UDim2.fromOffset(12, 48), UDim2.new(0.5, -17, 1, -116), COLORS.paper)
					left.Name = "CodexBookLeftPage"
					corner(left, 4)
					bookMaterial(left, "parchment", 180)
					local right = mkBox(book, UDim2.new(0.5, 5, 0, 48), UDim2.new(0.5, -17, 1, -116), COLORS.paper)
					right.Name = "CodexBookRightPage"
					corner(right, 4)
					bookMaterial(right, "parchment", 180)
					local spine = Instance.new("Frame")
					spine.Name = "CodexBookSpine"
					spine.BackgroundColor3 = INK_EDGE
					spine.BorderSizePixel = 0
					spine.Position = UDim2.new(0.5, -3, 0, 49)
					spine.Size = UDim2.new(0, 6, 1, -119)
					spine.Parent = book
					local figureHead = mkLabel(left, "01  ·  그림과 분류", 19, INK, true)
					figureHead.Position = UDim2.fromOffset(12, 10)
					figureHead.Size = UDim2.new(1, -24, 0, 25)
					figureHead.AutomaticSize = Enum.AutomaticSize.None
					local artId = AssetIds["Goods/" .. item.id]
					if artId and not RESTRICTED_CARGO_ICON[item.id] then
						local picture = Instance.new("ImageLabel")
						picture.Name = "ScholarTradeArt"
						picture.Image = "rbxassetid://" .. tostring(artId)
						picture.ScaleType = Enum.ScaleType.Fit
						picture.BackgroundTransparency = 1
						picture.Position = UDim2.fromOffset(12, 41)
						picture.Size = UDim2.new(1, -24, 1, -116)
						picture.Parent = left
					else
						local noArt = mkLabel(left, "등록된 대표 원화가 없어요", 17, INK_SOFT, false)
						noArt.Position = UDim2.fromOffset(12, 90)
						noArt.Size = UDim2.new(1, -24, 0, 70)
						noArt.AutomaticSize = Enum.AutomaticSize.None
					end
					local caption = mkLabel(left, "분류  " .. (item.categoryName or "자원")
						.. "\n연관 학문  " .. (item.discipline or "기타"), 16, INK_SOFT, true)
					caption.Position = UDim2.new(0, 12, 1, -66)
					caption.Size = UDim2.new(1, -24, 0, 62)
					caption.AutomaticSize = Enum.AutomaticSize.None
					caption.TextWrapped = true
					local card = item.cardId and cardById[item.cardId]
					local definition = if item.id == "coal" then
						"석탄은 오래된 식물이 퇴적돼 오랜 시간 열과 압력을 받아 형성된 탄소질 화석 연료야. 증기선과 제련 산업의 열원으로 쓰여."
						elseif card and card.found and type(card.description) == "string" and card.description ~= "" then card.description
						else "이 품목에 연결된 지식은 아직 발견되지 않았어. 현재는 분류와 생산 기록만 확인할 수 있어."
					local noteHead = mkLabel(right, "02  ·  뜻과 활용", 19, INK, true)
					noteHead.Position = UDim2.fromOffset(12, 10)
					noteHead.Size = UDim2.new(1, -24, 0, 26)
					noteHead.AutomaticSize = Enum.AutomaticSize.None
					local detail = mkLabel(right, definition, 18, INK, false)
					detail.Position = UDim2.fromOffset(12, 42)
					detail.Size = UDim2.new(1, -24, 0, 145)
					detail.AutomaticSize = Enum.AutomaticSize.None
					detail.TextWrapped = true
					detail.TextTruncate = Enum.TextTruncate.AtEnd
					local source = "기록 원산지  " .. (item.origin or "기록 없음")
					if item.chain then
						source ..= "\n가공 경로  " .. tostring(item.chain.raw or "원료")
							.. " → " .. tostring(item.chain.processed or "가공품")
					elseif item.appliedDiscipline then
						source ..= "\n가공 학문  " .. item.appliedDiscipline
					end
					local sourceText = mkLabel(right, source, 16, INK_SOFT, false)
					sourceText.Position = UDim2.new(0, 12, 1, -78)
					sourceText.Size = UDim2.new(1, -24, 0, 72)
					sourceText.AutomaticSize = Enum.AutomaticSize.None
					sourceText.TextWrapped = true
					local back = mkButton(book, "목록", COLORS.leather, UDim2.fromOffset(110, 46), function()
						H.tradeBookGood = nil
						render()
					end, true)
					local showingNotes = false
					local flip = mkButton(book, "다음 쪽", COLORS.gold, UDim2.fromOffset(120, 46), function()
						showingNotes = not showingNotes
						left.Visible = not showingNotes
						right.Visible = showingNotes
						flip.Text = if showingNotes then "이전 쪽" else "다음 쪽"
					end, true)
					local open = mkButton(book, "연관 지식", COLORS.blue, UDim2.fromOffset(160, 46),
						function() if card and card.found then H.showCardDetail(card) end end,
						card ~= nil and card.found == true)
					local function layoutPages()
						local spread = book.AbsoluteSize.X >= 620
						local width = if spread then UDim2.new(0.5, -18, 1, -116) else UDim2.new(1, -24, 1, -116)
						left.Position = UDim2.fromOffset(12, 48)
						left.Size = width
						right.Position = if spread then UDim2.new(0.5, 6, 0, 48) else UDim2.fromOffset(12, 48)
						right.Size = width
						spine.Visible = spread
						left.Visible = spread or not showingNotes
						right.Visible = spread or showingNotes
						back.Position = UDim2.new(0, 12, 1, -55)
						if spread then
							back.Size = UDim2.fromOffset(122, 46)
							flip.Visible = false
							open.Position = UDim2.new(1, -191, 1, -55)
							open.Size = UDim2.fromOffset(179, 46)
						else
							back.Size = UDim2.new(0.25, -12, 0, 46)
							flip.Visible = true
							flip.Position = UDim2.new(0.25, 4, 1, -55)
							flip.Size = UDim2.new(0.38, -11, 0, 46)
							open.Position = UDim2.new(0.63, 4, 1, -55)
							open.Size = UDim2.new(0.37, -16, 0, 46)
						end
					end
					book:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutPages)
					task.defer(layoutPages)
					return book
				end)
				break
			end
		end
		for _, item in view.codex.resources or {} do
			if item.category == selected and item.id ~= H.tradeBookGood then
				add(function()
					local card = item.cardId and cardById[item.cardId]
					local hint = (item.origin and "원산지 " .. item.origin or "원산지 기록 없음")
						.. " · " .. (item.discipline or "관련 학문 없음")
						.. " · " .. (if card and card.found then "지식 발견" else "지식 미발견")
					return mkRow(content, item.name, hint, {
						{ text = "책 펼치기", color = COLORS.blue, onClick = function()
							H.tradeBookGood = item.id
							render()
						end },
					}, 76)
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
	-- [서재 전환] 책장을 닫은 경우에만 이전 장의 왼쪽 원화 선택을 해제한다.
	if codexField ~= "book" and H.galleryReadingCard then
		H.galleryReadingCard = nil
		H.renderFacilityGallery()
	end
	-- [지식 백과의 책 펼치기] 기존 검색·분류·카드 기능은 보존한다.
	if codexField == "book" then
		RENDERERS.encyclopedia()
	elseif codexField then
		H.renderCodexField()
	else
		renderCodexOverview()
	end
end

-- [세계 백과사전] 새 저장소·카드 목록을 만들지 않고 기존 발견된 지식과 승인 사진만 책 페이지로 편집한다.
-- [세계 백과사전 · 양장본] 이미 승인된 삽화와 편집된 자료만 사용한다.
-- 금지된 외부 그림 자동 수집은 하지 않으며 보상·저장·게임 규칙은 변경하지 않는다.
-- [백과사전 시각화 · 2026-11-28 오너 지시: 허접 → 도감다운 화면] 한눈에 보기 표·분포 지도·연표·크기 비교·관련 카드·수집률.
-- 해설 원고(ENCYCLOPEDIA_BRIEF 2절: latin·summary·looks·facts·trivia)가 들어오면 그대로 쓰고, 없으면 있는 정보로만 그린다(지어내지 않음).
do
	local INK_C = Color3.fromRGB(52, 38, 24)
	local SOFT = Color3.fromRGB(110, 90, 66)
	local GOLD = Color3.fromRGB(196, 150, 60)
	local function boxed(parent, order, height)
		local f = Instance.new("Frame")
		f.Size = UDim2.new(1, -8, 0, height or 0)
		if not height then f.AutomaticSize = Enum.AutomaticSize.Y end
		-- [고딕 필사본] 현대식 둥근 정보 상자 대신 종이 위 얇은 금박 테두리.
		f.BackgroundColor3 = Color3.fromRGB(236, 220, 186)
		f.BackgroundTransparency = 0.84
		f.BorderSizePixel = 0
		f.LayoutOrder = order
		f.Parent = parent
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(152, 110, 49)
		st.Thickness = 1
		st.Transparency = 0.28
		st.Parent = f
		return f
	end
	local function yearsOf(card)
		local y1 = tonumber(card.fromYear)
		local era = tostring(card.era or "")
		local a, b = string.match(era, "(%d%d%d%d?)%D+(%d%d%d%d?)")
		if a then return tonumber(a), tonumber(b) end
		local c = string.match(era, "(%d%d%d%d?)")
		if c then return tonumber(c), tonumber(c) end
		local cent = tonumber(string.match(era, "(%d+)세기"))
		if cent then return (cent - 1) * 100, cent * 100 end
		if y1 then return y1, y1 end
		return nil, nil
	end

	-- 머리 장식: 분야 도장 + 희귀도 별 + 학명
	function H.encyHeader(sheet, order, card, article, category)
		local row = Instance.new("Frame")
		row.Name = "EncyHeaderBadges"
		row.Size = UDim2.new(1, -8, 0, 30)
		row.BackgroundTransparency = 1
		row.LayoutOrder = order
		row.Parent = sheet
		local stamp = Instance.new("TextLabel")
		stamp.Size = UDim2.fromOffset(120, 26)
		stamp.BackgroundColor3 = Color3.fromRGB(table.unpack(category.color or { 122, 89, 48 }))
		stamp.Font = Enum.Font.GothamBold
		stamp.TextSize = 13
		stamp.TextColor3 = Color3.new(1, 1, 1)
		stamp.Text = tostring(category.name or "")
		stamp.Parent = row
		corner(stamp, 6)
		local stars = ({ Common = 1, Uncommon = 2, Rare = 3, Epic = 4, Legendary = 5 })[card.rarity] or 1
		local st = Instance.new("TextLabel")
		st.Position = UDim2.fromOffset(128, 0)
		st.Size = UDim2.fromOffset(110, 26)
		st.BackgroundTransparency = 1
		st.Font = Enum.Font.GothamBlack
		st.TextSize = 16
		st.TextXAlignment = Enum.TextXAlignment.Left
		st.TextColor3 = GOLD
		st.Text = string.rep("★", stars) .. string.rep("☆", 5 - stars)
		st.Parent = row
		if article and article.latin then
			local lt = Instance.new("TextLabel")
			lt.Position = UDim2.fromOffset(240, 0)
			lt.Size = UDim2.new(1, -240, 0, 26)
			lt.BackgroundTransparency = 1
			lt.Font = Enum.Font.SourceSansItalic
			lt.TextSize = 17
			lt.TextXAlignment = Enum.TextXAlignment.Left
			lt.TextColor3 = SOFT
			lt.Text = tostring(article.latin)
			lt.TextTruncate = Enum.TextTruncate.AtEnd
			lt.Parent = row
		end
	end

	-- 한눈에 보기 표: 원고 facts 우선, 없으면 있는 분류 정보
	function H.encyFacts(sheet, order, card, article)
		local rows = {}
		if article and type(article.facts) == "table" and #article.facts > 0 then
			for _, r in article.facts do
				if type(r) == "table" and r[1] and r[2] then table.insert(rows, { tostring(r[1]), tostring(r[2]) }) end
			end
		else
			table.insert(rows, { "분류", tostring(card.kindName or card.topic or "기타") })
			if card.region then table.insert(rows, { "지역", tostring(card.region) }) end
			if card.era then table.insert(rows, { "시대", tostring(card.era) }) end
			table.insert(rows, { "학문", tostring(card.discipline or "미분류") })
			if card.entityType then table.insert(rows, { "존재 형태", tostring(card.entityType) }) end
		end
		if #rows == 0 then return end
		local box = boxed(sheet, order, nil)
		box.Name = "EncyAtAGlance"
		local pad = Instance.new("UIPadding")
		pad.PaddingTop, pad.PaddingBottom, pad.PaddingLeft, pad.PaddingRight = UDim.new(0, 6), UDim.new(0, 6), UDim.new(0, 8), UDim.new(0, 8)
		pad.Parent = box
		local list = Instance.new("UIListLayout")
		list.SortOrder = Enum.SortOrder.LayoutOrder
		list.Padding = UDim.new(0, 2)
		list.Parent = box
		local head = mkLabel(box, "📋 한눈에 보기", 15, INK_C, true, 0)
		head.Size = UDim2.new(1, 0, 0, 22)
		head.AutomaticSize = Enum.AutomaticSize.None
		for i, r in rows do
			local line = Instance.new("Frame")
			line.Size = UDim2.new(1, 0, 0, 0)
			line.AutomaticSize = Enum.AutomaticSize.Y
			line.BackgroundColor3 = if i % 2 == 0 then Color3.fromRGB(228, 210, 172) else Color3.fromRGB(242, 228, 198)
			line.BorderSizePixel = 0
			line.LayoutOrder = i
			line.Parent = box
			local k = mkLabel(line, r[1], 14, SOFT, true)
			k.Position = UDim2.fromOffset(6, 3)
			k.Size = UDim2.fromOffset(90, 18)
			k.AutomaticSize = Enum.AutomaticSize.None
			local v = mkLabel(line, r[2], 14, INK_C, false)
			v.Position = UDim2.fromOffset(100, 3)
			v.Size = UDim2.new(1, -106, 0, 0)
			v.AutomaticSize = Enum.AutomaticSize.Y
			v.TextWrapped = true
			local pad2 = Instance.new("UIPadding")
			pad2.PaddingBottom = UDim.new(0, 3)
			pad2.Parent = line
		end
	end

	-- 분포 지도: 옛 세계지도 원화(있으면) 위 금색 점, 없으면 경위선 양피지
	function H.encyMap(sheet, order, card)
		local pts = card.mapPoints
		if type(pts) ~= "table" or #pts == 0 then return end
		local box = boxed(sheet, order, 190)
		box.Name = "EncyRangeMap"
		box.ClipsDescendants = true
		local mapId = AssetIds["CardArt/ency_map_world"]
		local map = Instance.new("ImageLabel")
		map.Size = UDim2.fromScale(1, 1)
		map.BackgroundColor3 = Color3.fromRGB(214, 196, 156)
		map.Image = if mapId then "rbxassetid://" .. tostring(mapId) else ""
		map.ScaleType = Enum.ScaleType.Stretch
		map.Parent = box
		if not mapId then
			for i = 1, 5 do
				local v = Instance.new("Frame")
				v.Position = UDim2.fromScale(i / 6, 0)
				v.Size = UDim2.new(0, 1, 1, 0)
				v.BackgroundColor3 = Color3.fromRGB(176, 150, 106)
				v.BorderSizePixel = 0
				v.Parent = map
			end
			for i = 1, 3 do
				local h = Instance.new("Frame")
				h.Position = UDim2.fromScale(0, i / 4)
				h.Size = UDim2.new(1, 0, 0, 1)
				h.BackgroundColor3 = Color3.fromRGB(176, 150, 106)
				h.BorderSizePixel = 0
				h.Parent = map
			end
		end
		local title = mkLabel(box, "분포와 발견 지도", 14, INK_C, true)
		title.Position = UDim2.fromOffset(8, 4)
		title.Size = UDim2.new(1, -16, 0, 18)
		title.AutomaticSize = Enum.AutomaticSize.None
		title.ZIndex = 3
		for _, p in pts do
			local x, y = (p.lon + 180) / 360, (90 - p.lat) / 180
			local dot = Instance.new("Frame")
			dot.AnchorPoint = Vector2.new(0.5, 0.5)
			dot.Position = UDim2.fromScale(x, y)
			dot.Size = UDim2.fromOffset(14, 14)
			dot.BackgroundColor3 = if p.label == "내가 발견" then Color3.fromRGB(70, 150, 90) else Color3.fromRGB(230, 180, 60)
			dot.BorderSizePixel = 0
			dot.ZIndex = 4
			dot.Parent = map
			corner(dot, 7)
			local ring = Instance.new("UIStroke")
			ring.Color = Color3.fromRGB(90, 60, 20)
			ring.Thickness = 2
			ring.Parent = dot
			local tag = mkLabel(map, tostring(p.name) .. " · " .. tostring(p.label), 12, INK_C, true)
			tag.Position = UDim2.new(x, 10, y, -8)
			tag.Size = UDim2.fromOffset(160, 16)
			tag.AutomaticSize = Enum.AutomaticSize.None
			tag.ZIndex = 4
		end
	end

	-- 연표: 1400~1900 막대 위에 이 항목의 시대(범위) + 게임 속 지금
	function H.encyTimeline(sheet, order, card)
		local a, b = yearsOf(card)
		if not a then return end
		local box = boxed(sheet, order, 70)
		box.Name = "EncyTimeline"
		local title = mkLabel(box, "시대 연표", 14, INK_C, true)
		title.Position = UDim2.fromOffset(8, 4)
		title.Size = UDim2.new(1, -16, 0, 18)
		title.AutomaticSize = Enum.AutomaticSize.None
		local lo, hi = math.min(a, 1400), math.max(b or a, 1900)
		local track = Instance.new("Frame")
		track.Position = UDim2.new(0, 10, 0, 34)
		track.Size = UDim2.new(1, -20, 0, 8)
		track.BackgroundColor3 = Color3.fromRGB(196, 176, 136)
		track.BorderSizePixel = 0
		track.Parent = box
		corner(track, 4)
		local function x(y) return math.clamp((y - lo) / math.max(1, hi - lo), 0, 1) end
		local span = Instance.new("Frame")
		span.Position = UDim2.fromScale(x(a), -0.5)
		span.Size = UDim2.new(math.max(0.012, x(b or a) - x(a)), 0, 2, 0)
		span.BackgroundColor3 = GOLD
		span.BorderSizePixel = 0
		span.Parent = track
		corner(span, 4)
		local now = view and view.player and tonumber(view.player.year)
		if now then
			local mark = Instance.new("Frame")
			mark.AnchorPoint = Vector2.new(0.5, 0.5)
			mark.Position = UDim2.fromScale(x(now), 0.5)
			mark.Size = UDim2.fromOffset(3, 22)
			mark.BackgroundColor3 = Color3.fromRGB(150, 50, 40)
			mark.BorderSizePixel = 0
			mark.Parent = track
		end
		for _, edge in { { lo, 0 }, { hi, 1 } } do
			local t = mkLabel(box, tostring(edge[1]), 11, SOFT, false)
			t.Position = UDim2.new(edge[2], if edge[2] == 0 then 10 else -50, 0, 48)
			t.Size = UDim2.fromOffset(40, 14)
			t.AutomaticSize = Enum.AutomaticSize.None
			t.TextXAlignment = if edge[2] == 0 then Enum.TextXAlignment.Left else Enum.TextXAlignment.Right
		end
		local label = mkLabel(box, (if b and b ~= a then string.format("%d ~ %d", a, b) else tostring(a)) .. (if now then string.format("   (지금 %d년 — 빨간 선)", now) else ""), 12, INK_C, true)
		label.Position = UDim2.new(0, 60, 0, 48)
		label.Size = UDim2.new(1, -120, 0, 14)
		label.AutomaticSize = Enum.AutomaticSize.None
		label.TextXAlignment = Enum.TextXAlignment.Center
	end

	-- 크기 비교: 원고 facts 의 "크기" 숫자(m·cm)가 있을 때만 사람(1.7m)과 비교
	function H.encySize(sheet, order, article)
		local text = nil
		for _, r in (article and article.facts) or {} do
			if type(r) == "table" and (r[1] == "크기" or r[1] == "몸길이" or r[1] == "높이" or r[1] == "길이") then text = tostring(r[2]) end
		end
		if not text then return end
		local num, unit = string.match(text, "([%d%.]+)%s*(c?m)")
		local meters = tonumber(num)
		if not meters then return end
		if unit == "cm" then meters /= 100 end
		local box = boxed(sheet, order, 120)
		box.Name = "EncySizeCompare"
		local title = mkLabel(box, "크기 비교 · 사람 1.7m", 14, INK_C, true)
		title.Position = UDim2.fromOffset(8, 4)
		title.Size = UDim2.new(1, -16, 0, 18)
		title.AutomaticSize = Enum.AutomaticSize.None
		local maxH = 84
		local scale = maxH / math.max(1.7, meters)
		local person = Instance.new("ImageLabel")
		person.AnchorPoint = Vector2.new(0.5, 1)
		person.Position = UDim2.new(0.3, 0, 1, -8)
		person.Size = UDim2.fromOffset(math.max(8, 1.7 * scale * 0.4), math.max(6, 1.7 * scale))
		person.BackgroundColor3 = Color3.fromRGB(90, 70, 50)
		person.Image = if AssetIds["CardArt/ency_scale_people"] then "rbxassetid://" .. tostring(AssetIds["CardArt/ency_scale_people"]) else ""
		person.BackgroundTransparency = if person.Image ~= "" then 1 else 0
		person.Parent = box
		local thing = Instance.new("Frame")
		thing.AnchorPoint = Vector2.new(0.5, 1)
		thing.Position = UDim2.new(0.65, 0, 1, -8)
		thing.Size = UDim2.fromOffset(math.max(6, meters * scale * 0.8), math.max(4, meters * scale))
		thing.BackgroundColor3 = GOLD
		thing.BorderSizePixel = 0
		thing.Parent = box
		corner(thing, 4)
		local t = mkLabel(box, text, 12, INK_C, true)
		t.Position = UDim2.new(0.65, 20, 1, -26)
		t.Size = UDim2.fromOffset(140, 16)
		t.AutomaticSize = Enum.AutomaticSize.None
	end

	-- 관련 카드 썸네일 줄(발견한 것은 그림, 못 한 것은 '?') — 누르면 그 장으로
	function H.encyRelated(sheet, order, card, byIdAll)
		local rel = {}
		for _, r in card.relations or {} do
			if r.cardId then table.insert(rel, r) end
			if #rel >= 6 then break end
		end
		if #rel == 0 then return end
		local box = boxed(sheet, order, 128)
		box.Name = "EncyRelatedCards"
		local title = mkLabel(box, "관련 도판", 14, INK_C, true)
		title.Position = UDim2.fromOffset(8, 4)
		title.Size = UDim2.new(1, -16, 0, 18)
		title.AutomaticSize = Enum.AutomaticSize.None
		local row = Instance.new("ScrollingFrame")
		row.Name = "EncyRelatedScroll"
		row.Position = UDim2.fromOffset(8, 26)
		row.Size = UDim2.new(1, -16, 0, 96)
		row.BackgroundTransparency = 1
		row.BorderSizePixel = 0
		row.ScrollingDirection = Enum.ScrollingDirection.X
		row.CanvasSize = UDim2.new()
		row.AutomaticCanvasSize = Enum.AutomaticSize.X
		row.ScrollBarThickness = 3
		row.Parent = box
		local lay = Instance.new("UIListLayout")
		lay.FillDirection = Enum.FillDirection.Horizontal
		lay.Padding = UDim.new(0, 6)
		lay.Parent = row
		for _, r in rel do
			local other = byIdAll[r.cardId]
			local b = Instance.new("ImageButton")
			b.Size = UDim2.fromOffset(66, 92)
			b.BackgroundColor3 = if r.found then Color3.fromRGB(240, 226, 196) else Color3.fromRGB(150, 136, 112)
			b.Image = if r.found and other and type(other.image) == "string" then other.image else ""
			b.ScaleType = Enum.ScaleType.Fit
			b.AutoButtonColor = r.found == true
			b.Parent = row
			corner(b, 6)
			local nm = mkLabel(b, if r.found then tostring(r.name) else "?", 11, if r.found then INK_C else Color3.new(1, 1, 1), true)
			nm.AnchorPoint = Vector2.new(0, 1)
			nm.Position = UDim2.new(0, 2, 1, -2)
			nm.Size = UDim2.new(1, -4, 0, 28)
			nm.AutomaticSize = Enum.AutomaticSize.None
			nm.TextWrapped = true
			nm.BackgroundTransparency = 0.25
			nm.BackgroundColor3 = Color3.fromRGB(246, 234, 206)
			if r.found then
				b.Activated:Connect(function()
					H.encyclopediaTargetId = r.cardId
					H.encyclopediaCategoryId = "all"
					H.encyclopediaSearchText = ""
					H.encyclopediaIndexOpen = false
					H.dexPlateIndex = false
					H.dexAppendixScroll = nil
					Sfx.play("sfx_book_turn", 0.3)
					render()
				end)
			end
		end
	end

	-- 분야 수집률 막대
	function H.encyCollection(sheet, order, card, allCards)
		local total, got = 0, 0
		for _, c in allCards or {} do
			if c.field == card.field then
				total += 1
				if c.found then got += 1 end
			end
		end
		if total == 0 then return end
		local box = boxed(sheet, order, 46)
		box.Name = "EncyCollectionRate"
		local t = mkLabel(box, string.format("📚 이 분야 수집 %d / %d (%d%%)", got, total, math.floor(got / total * 100)), 13, INK_C, true)
		t.Position = UDim2.fromOffset(8, 4)
		t.Size = UDim2.new(1, -16, 0, 16)
		t.AutomaticSize = Enum.AutomaticSize.None
		local track = Instance.new("Frame")
		track.Position = UDim2.fromOffset(8, 26)
		track.Size = UDim2.new(1, -16, 0, 10)
		track.BackgroundColor3 = Color3.fromRGB(196, 176, 136)
		track.BorderSizePixel = 0
		track.Parent = box
		corner(track, 5)
		local fill = Instance.new("Frame")
		fill.Size = UDim2.fromScale(got / total, 1)
		fill.BackgroundColor3 = Color3.fromRGB(70, 140, 90)
		fill.BorderSizePixel = 0
		fill.Parent = track
		corner(fill, 5)
	end
end

-- [깔끔한 도감 · 2026-11-28 오너 지시: "답답·복잡, 원화 살려서 깔끔하게, 백과사전 보듯이, 카드 원화 중심"]
-- 위 배너 원화 없이 이 화면 자체가 원화 중심: 왼쪽 원화 썸네일 격자 · 오른쪽 큰 원화 + 이름 + 3칸 정보 + 짧은 개요,
-- 긴 해설은 '자세히 ▼' 를 눌렀을 때만. 장식·표·지도는 '자세히' 안으로. 데이터·저장·검색 규칙은 기존 그대로.
do
	local PAPER = Color3.fromRGB(246, 238, 220)
	local INKD = Color3.fromRGB(44, 34, 24)
	local SOFTT = Color3.fromRGB(120, 104, 84)
	local LINE = Color3.fromRGB(214, 196, 160)
	H.dexExpanded = H.dexExpanded or false

	local function artOf(card)
		if type(card.image) == "string" and card.image ~= "" then return card.image end
		local id = AssetIds["CardArt/" .. tostring(card.id)]
		return if id then "rbxassetid://" .. tostring(id) else ""
	end
	local function chip(parent, text, color)
		local c = Instance.new("TextLabel")
		c.AutomaticSize = Enum.AutomaticSize.X
		c.Size = UDim2.fromOffset(0, 28)
		c.BackgroundColor3 = color or Color3.fromRGB(236, 224, 198)
		c.BorderSizePixel = 0
		c.Font = Enum.Font.GothamBold
		c.TextSize = 13
		c.TextColor3 = INKD
		c.Text = "  " .. tostring(text) .. "  "
		c.Parent = parent
		corner(c, 14)
		return c
	end

	-- found: 지금 보이는 목록, current: 펼친 카드, article, category, cx
	function H.renderDex(found, current, article, category, cx, onPick)
		local W = math.max(280, content.AbsoluteSize.X)
		local wide = W >= 660
		local pageNo = H.encyclopediaPage or 1
		add(function()
			local root = Instance.new("Frame")
			root.Name = "DexRoot"
			root.BackgroundColor3 = Color3.fromRGB(79, 50, 30)
			root.BorderSizePixel = 0
			local height = math.clamp(content.AbsoluteSize.Y - 8, 300, 850)
			root.Size = UDim2.new(1, -6, 0, height)
			root.ClipsDescendants = true
			corner(root, 8)
			bookMaterial(root, "leather", 192)
			-- 실제 제작 책 배경은 승인 등록 키가 존재할 때만 연결한다.
			local bookId = AssetIds["CardArt/ency_bg_book"]
			if bookId then
				local art = Instance.new("ImageLabel")
				art.Name = "EncyclopediaBookArt"
				art.BackgroundTransparency = 1
				art.Image = "rbxassetid://" .. tostring(bookId)
				art.Size = UDim2.new(1, 0, 1, -55)
				art.ScaleType = Enum.ScaleType.Stretch
				-- 단면에서도 같은 원본의 왼쪽/오른쪽 삽화 페이지를 각각 사용한다.
				if not wide then
					art.Size = UDim2.new(2, 0, 1, -55)
					art.Position = UDim2.fromScale(if H.dexReading then -1 else 0, 0)
				end
				art.Parent = root
			end
			local leaf = Instance.new("Frame")
			leaf.Name = "EncyclopediaLeaves"
			leaf.BackgroundTransparency = 1
			leaf.Position = UDim2.fromOffset(12, 10)
			leaf.Size = UDim2.new(1, -24, 1, -66)
			if bookId then
				-- 바깥쪽 금박 삽화(약 15%)와 중앙 제본선을 가리지 않는다.
				leaf.Position = UDim2.new(if wide then 0.15 elseif H.dexReading then 0.08 else 0.27, 0, 0.10, 0)
				leaf.Size = UDim2.new(if wide then 0.70 else 0.65, 0, 0.82, -45)
			end
			leaf.Parent = root

			-- 넓은 화면은 양면 책, 세로폰은 도판/해설 한 장씩 넘긴다.
			local reading = wide or H.dexReading == true
			local plate = Instance.new("Frame")
			plate.Name = "EncyclopediaPlate"
			plate.BackgroundColor3 = PAPER
			plate.BackgroundTransparency = if bookId then 1 else 0
			plate.BorderSizePixel = 0
			plate.Size = if wide then UDim2.new(0.5, -4, 1, 0) else UDim2.fromScale(1, 1)
			plate.Visible = wide or not reading
			plate.Parent = leaf
			corner(plate, 3)
			if not bookId then
				local grain = bookMaterial(plate, "parchment", 192)
				if grain then grain.ImageTransparency = 0.45 end
			end
			local heading = mkLabel(plate, tostring(category.name or "세계 지식") .. "  ·  도판 " .. string.format("%03d", pageNo), 15, SOFTT, true)
			heading.Position = UDim2.fromOffset(10, 6)
			heading.Size = UDim2.new(1, -20, 0, 24)
			heading.AutomaticSize = Enum.AutomaticSize.None
			heading.TextXAlignment = Enum.TextXAlignment.Center
			heading.Font = Enum.Font.Garamond
			heading.TextColor3 = Color3.fromRGB(37, 71, 98)
			local hero = Instance.new("ImageLabel")
			hero.Name = "DexHero"
			hero.Position = UDim2.fromOffset(12, 34)
			hero.Size = UDim2.new(1, -24, 1, -112)
			hero.BackgroundTransparency = 1
			hero.Image = artOf(current)
			hero.ScaleType = Enum.ScaleType.Fit
			hero.Parent = plate
			-- 기존 승인 24프레임 시트만 사용한다. 숨긴 도판은 프레임 갱신을 멈춘다.
			if current.combatArt and current.motionSheet then
				hero.Image = "rbxassetid://" .. tostring(current.motionSheet)
				hero.ImageRectSize = Vector2.new(256, 256)
				hero.ImageRectOffset = Vector2.zero
				if not game:GetService("GuiService").ReducedMotionEnabled then
					task.spawn(function()
						local frame = 0
						while hero.Parent and hero:IsDescendantOf(game) do
							if plate.Visible and leaf.Visible then
								hero.ImageRectOffset = Vector2.new((frame % 6) * 256, math.floor(frame / 6) * 256)
								frame = (frame + 1) % 24
							end
							task.wait(0.15)
						end
					end)
				end
			end
			if hero.Image == "" then
				local missing = mkLabel(hero, "도판 미등록", 16, SOFTT, false)
				missing.Size = UDim2.fromScale(1, 1)
				missing.AutomaticSize = Enum.AutomaticSize.None
				missing.TextXAlignment = Enum.TextXAlignment.Center
			end
			local title = mkLabel(plate, tostring(current.name), 22, Color3.fromRGB(110, 39, 33), true)
			title.Position = UDim2.new(0, 10, 1, -72)
			title.Size = UDim2.new(1, -20, 0, 66)
			title.AutomaticSize = Enum.AutomaticSize.None
			title.TextWrapped = true
			title.TextXAlignment = Enum.TextXAlignment.Center
			title.Font = Enum.Font.Garamond

			local page = Instance.new("ScrollingFrame")
			page.Name = "DexPage"
			page.BackgroundColor3 = PAPER
			page.BackgroundTransparency = if bookId then 1 else 0
			page.BorderSizePixel = 0
			page.ScrollBarThickness = 4
			page.AutomaticCanvasSize = Enum.AutomaticSize.Y
			page.CanvasSize = UDim2.new()
			page.ScrollingDirection = Enum.ScrollingDirection.Y
			page.Position = if wide then UDim2.new(0.5, 4, 0, 0) else UDim2.new()
			page.Size = if wide then UDim2.new(0.5, -4, 1, 0) else UDim2.fromScale(1, 1)
			page.Visible = reading
			page.Parent = leaf
			corner(page, 3)
			local pp = Instance.new("UIPadding")
			pp.PaddingTop, pp.PaddingBottom, pp.PaddingLeft, pp.PaddingRight = UDim.new(0, 14), UDim.new(0, 18), UDim.new(0, 16), UDim.new(0, 16)
			pp.Parent = page
			local pl = Instance.new("UIListLayout")
			pl.Padding = UDim.new(0, 8)
			pl.SortOrder = Enum.SortOrder.LayoutOrder
			pl.Parent = page
			local order = 0
			local function nextOrder() order += 1; return order end
			local function para(value, size, color, bold)
				local l = mkLabel(page, tostring(value), size, color or INKD, bold, nextOrder())
				l.Size = UDim2.new(1, 0, 0, 0)
				l.AutomaticSize = Enum.AutomaticSize.Y
				l.TextWrapped = true
				l.TextTruncate = Enum.TextTruncate.None
				l.Font = if bold then Enum.Font.Garamond else Enum.Font.SourceSans
				l.LineHeight = 1.18
				return l
			end
			para(tostring(category.name or "세계 지식"), 14, Color3.fromRGB(37, 71, 98), true)
			para(current.name, 26, Color3.fromRGB(110, 39, 33), true)
			if article and article.latin then
				local latin = para(article.latin, 16, SOFTT, false)
				latin.Font = Enum.Font.Garamond
			end
			local meta = {}
			if current.region then table.insert(meta, tostring(current.region)) end
			if current.era then table.insert(meta, tostring(current.era)) end
			local rarityName = ({ Common = "일반", Uncommon = "고급", Rare = "희귀", Epic = "영웅", Legendary = "전설" })[current.rarity or ""]
			if rarityName then
				local stars = ({ Common = 1, Uncommon = 2, Rare = 3, Epic = 4, Legendary = 5 })[current.rarity] or 1
				table.insert(meta, string.rep("★", stars) .. " " .. rarityName)
			end
			if #meta > 0 then para(table.concat(meta, " · "), 14, SOFTT, false) end
			local function section(titleText, value)
				if not value or value == "" then return end
				local rubric = para(titleText, 18, Color3.fromRGB(110, 39, 33), true)
				rubric.Name = "EncyclopediaRubric"
				local rule = Instance.new("Frame")
				rule.Name = "EncyclopediaGoldRule"
				rule.LayoutOrder = nextOrder()
				rule.Size = UDim2.new(1, 0, 0, 1)
				rule.BackgroundColor3 = Color3.fromRGB(152, 110, 49)
				rule.BackgroundTransparency = 0.25
				rule.BorderSizePixel = 0
				rule.Parent = page
				para(value, 18, INKD, false)
			end
			section("개요", if article and article.summary and article.summary ~= "" then article.summary else current.description)
			if article then
				section("생김새·구조", article.looks)
				section("특징", article.details)
				section("쓰임과 배경", article.context)
				section("역사", article.history)
				section("흥미로운 사실", article.trivia)
			end
			if not current.combatArt then
				-- [자료 구분] 새 고서에도 기존 사실·전승·가설 구분과 원고 상태를 보존한다.
				if current.evidenceId == "fiction" then
					para("게임 속 가상 설정", 14, SOFTT, true)
				elseif current.evidenceId == "legend" or current.evidenceId == "hypothesis" then
					para("전승 또는 가설 · 확정된 사실과 구분", 14, SOFTT, true)
				elseif current.evidenceId == "unreviewed" then
					para("개별 자료 검증 대기", 14, SOFTT, true)
				end
				if not article then para("상세 해설 원고 준비 중", 14, SOFTT, false) end
				-- [부록] 긴 원고는 그대로 읽고 지도·연표·관련 도판은 필요할 때만 생성한다.
				local appendix = Instance.new("TextButton")
				appendix.Name = "EncyclopediaAppendix"
				appendix.LayoutOrder = nextOrder()
				appendix.Size = UDim2.new(1, 0, 0, 44)
				appendix.BackgroundColor3 = Color3.fromRGB(225, 204, 162)
				appendix.BorderSizePixel = 0
				appendix.TextColor3 = Color3.fromRGB(110, 39, 33)
				appendix.Font = Enum.Font.Garamond
				appendix.TextSize = 18
				appendix.TextWrapped = true
				appendix.Text = if H.dexExpanded then "부록 접기" else "부록 펼치기 · 지도와 연표"
				appendix.Parent = page
				appendix.Activated:Connect(function()
					H.dexExpanded = not H.dexExpanded
					H.dexAppendixScroll = page.CanvasPosition.Y
					render()
				end)
			end
			if not current.combatArt and H.dexExpanded then
				if H.encyFacts then H.encyFacts(page, nextOrder(), current, article) end
				if H.encyMap then H.encyMap(page, nextOrder(), current) end
				if H.encyTimeline then H.encyTimeline(page, nextOrder(), current) end
				if H.encySize then H.encySize(page, nextOrder(), article) end
				local allById = {}
				for _, c in (cx.cards or {}) do allById[c.id] = c end
				if H.encyRelated then H.encyRelated(page, nextOrder(), current, allById) end
				if H.encyCollection then H.encyCollection(page, nextOrder(), current, cx.cards) end
				local places = {}
				for _, rel in current.relations or {} do
					if not rel.cardId and rel.name and #places < 4 then
						table.insert(places, tostring(rel.name) .. " · " .. tostring(rel.relation or "연관 장소·상품"))
					end
				end
				if #places > 0 then section("관련 장소·상품·사료", table.concat(places, "\n")) end
				local more = mkButton(page, "카드 원문 · 추가 연구 기록", COLORS.gold, UDim2.new(1, 0, 0, 44), function()
					H.showCardDetail(current)
				end, true)
				more.LayoutOrder = nextOrder()
				more.TextSize = 15
			end
			local first = current.provenance
			if first then
				section("내 발견 기록", "첫 발견: " .. tostring(first.port or "위치 미상")
					.. (if first.day then " · 항해 " .. tostring(first.day) .. "일째" else "")
					.. " · " .. tostring(first.method or "발견")
					.. (if first.person then "\n전수한 인물: " .. tostring(first.person) else "")
					.. (if first.site then "\n탐험 현장: " .. tostring(first.site) else "")
					.. (if first.quest then "\n관련 의뢰: " .. tostring(first.quest) else "")
					.. (if first.event then "\n관련 사건: " .. tostring(first.event) else ""))
			end
			if article and type(article.sources) == "table" and #article.sources > 0 then
				para("참고: " .. table.concat(article.sources, " · "), 13, SOFTT, false)
			elseif article and article.topic and article.topic ~= "" then
				para("본문 참고: 위키백과 · " .. string.gsub(article.topic, "_", " "), 13, SOFTT, false)
			end
			if current.credit and current.credit ~= "" then
				para("도판 출처: " .. current.credit, 13, SOFTT, false)
			end

			-- 부록을 열고 닫을 때 읽던 위치를 유지한다. 다른 책장 이동에는 적용하지 않는다.
			local resumeY = H.dexAppendixScroll
			H.dexAppendixScroll = nil
			if resumeY then
				task.defer(function()
					if page.Parent then
						page.CanvasPosition = Vector2.new(0, math.clamp(resumeY, 0, math.max(0, page.AbsoluteCanvasSize.Y - page.AbsoluteWindowSize.Y)))
					end
				end)
			end

			-- 도판 목차는 펼친 책 위에 12장 단위로만 표시한다.
			if H.dexPlateIndex then
				leaf.Visible = false
				local grid = Instance.new("ScrollingFrame")
				grid.Name = "DexGrid"
				grid.BackgroundColor3 = PAPER
				grid.BorderSizePixel = 0
				grid.Position = leaf.Position
				grid.Size = leaf.Size
				grid.AutomaticCanvasSize = Enum.AutomaticSize.Y
				grid.CanvasSize = UDim2.new()
				grid.ScrollBarThickness = 4
				grid.Parent = root
				local gl = Instance.new("UIGridLayout")
				local cols = if wide then 6 else 3
				local gridW = if bookId then W * (if wide then 0.70 else 0.65) else W - 30
				local cw = math.max(48, math.floor((gridW - 12 - (cols - 1) * 6) / cols))
				gl.CellSize = UDim2.fromOffset(cw, math.floor(cw * 1.4) + 26)
				gl.CellPadding = UDim2.fromOffset(6, 6)
				gl.SortOrder = Enum.SortOrder.LayoutOrder
				gl.Parent = grid
				local block = math.floor((pageNo - 1) / 12) * 12 + 1
				for i = block, math.min(block + 11, #found) do
					local card = found[i]
					local b = Instance.new("ImageButton")
					b.Name = "DexThumb"
					b.LayoutOrder = i
					b.BackgroundColor3 = PAPER
					b.Image = artOf(card)
					b.BorderSizePixel = 0
					b.AutoButtonColor = false
					b.ScaleType = Enum.ScaleType.Fit
					b.Parent = grid
					if card.id == current.id then
						local edge = Instance.new("UIStroke")
						edge.Name = "SelectedPlateGold"
						edge.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
						edge.Color = Color3.fromRGB(177, 128, 44)
						edge.Thickness = 2.5
						edge.Parent = b
					end
					local nm = mkLabel(b, card.name, 13, INKD, true)
					nm.Font = Enum.Font.Garamond
					nm.AnchorPoint = Vector2.new(0, 1)
					nm.Position = UDim2.fromScale(0, 1)
					nm.Size = UDim2.new(1, 0, 0, 26)
					nm.AutomaticSize = Enum.AutomaticSize.None
					nm.BackgroundColor3 = PAPER
					nm.BackgroundTransparency = 0
					nm.TextTruncate = Enum.TextTruncate.AtEnd
					b.Activated:Connect(function() H.dexPlateIndex = false; H.dexReading = false; onPick(i) end)
				end
			end
			local footer = Instance.new("Frame")
			footer.Name = "EncyclopediaPageFooter"
			footer.BackgroundTransparency = 1
			footer.Position = UDim2.new(0, 10, 1, -51)
			footer.Size = UDim2.new(1, -20, 0, 44)
			footer.Parent = root
			local function button(text, x, width, action, enabled)
				local b = Instance.new("TextButton")
				b.Name = "EncyclopediaPrintedButton"
				b.Size = UDim2.new(width, -4, 1, 0)
				b.Position = UDim2.new(x, 2, 0, 0)
				b.BackgroundColor3 = if enabled then Color3.fromRGB(226, 205, 162) else Color3.fromRGB(166, 149, 123)
				b.BorderSizePixel = 0
				b.TextColor3 = if enabled then Color3.fromRGB(83, 37, 30) else Color3.fromRGB(75, 65, 53)
				b.Font = Enum.Font.Garamond
				b.TextSize = 17
				b.TextWrapped = true
				b.Text = text
				b.AutoButtonColor = enabled
				b.Active = enabled
				b.Interactable = enabled
				b.Selectable = enabled
				b.Parent = footer
				if enabled then b.Activated:Connect(action) end
				return b
			end
			local stride = if H.dexPlateIndex then 12 else 1
			button("이전", 0, 0.19, function() onPick(math.max(1, pageNo - stride)) end, pageNo > 1)
			button(if H.dexPlateIndex then "책으로" else "도판", 0.19, 0.19, function() H.dexPlateIndex = not H.dexPlateIndex; render() end, true)
			button(if wide then string.format("%d/%d", pageNo, #found) else (if reading then "도판 보기" else "해설 읽기"), 0.38, 0.24, function() if not wide then H.dexReading = not reading; H.dexPlateIndex = false; render() end end, not wide)
			if not current.combatArt then
				button(if H.encyclopediaBookmarkId == current.id then "책갈피 빼기" else "책갈피", 0.62, 0.19, function()
					local result = call("SetEncyclopediaBookmark", { id = current.id })
					if result and result.ok then Sfx.play("sfx_book_turn", 0.3) end
				end, true)
			end
			button("다음", 0.81, 0.19, function() onPick(math.min(#found, pageNo + stride)) end, pageNo < #found)
			-- 실제 페이지 이동에서만 짧은 종이 넘김 연출. 모션 감소 설정이면 즉시 표시한다.
			local direction = H.dexTurnDirection
			H.dexTurnDirection = nil
			if direction and not H.dexPlateIndex and not game:GetService("GuiService").ReducedMotionEnabled then
				local finalPosition = leaf.Position
				leaf.Position = finalPosition + UDim2.fromOffset(18 * direction, 0)
				local fold = Instance.new("Frame")
				fold.Name = "EncyclopediaPageTurnShade"
				fold.BackgroundColor3 = Color3.fromRGB(91, 57, 29)
				fold.BackgroundTransparency = 0.55
				fold.BorderSizePixel = 0
				fold.Size = UDim2.new(0, 20, 1, 0)
				fold.Position = UDim2.new(if direction > 0 then 0 else 1, if direction > 0 then 0 else -20, 0, 0)
				fold.ZIndex = 5
				fold.Parent = leaf
				local tween = game:GetService("TweenService")
				tween:Create(leaf, TweenInfo.new(0.20, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), { Position = finalPosition }):Play()
				local fade = tween:Create(fold, TweenInfo.new(0.20), { BackgroundTransparency = 1 })
				fade.Completed:Once(function() fold:Destroy() end)
				fade:Play()
			end
			return root
		end)
	end
end

function RENDERERS.encyclopedia()
	local cx = view.codex or {}
	-- [계정별 책갈피] 이전 접속의 서버 저장을 진실값으로 쓴다.
	H.encyclopediaBookmarkId = cx.bookmarkId
	local articles = require(Shared:WaitForChild("KnowledgeCards")).Articles
	local all, groups, known, byId = {}, { { id = "all", name = "전체" } }, {}, {}
	local fieldCounts, explained, pictured = {}, 0, 0
	local collectedOriginals = 0
	-- [해전 원화 화첩] 기존 소장 목록과 등록된 동일 ID의 승인 원화만 가져온다.
	-- 백과 발견 수, 전투 카드 수, 강화, 보상, 저장 구조에는 영향을 주지 않는다.
	local owned = (view.cardbook and view.cardbook.owned) or {}
	local boarding = require(Shared:WaitForChild("BoardingCards"))
	local registeredArt = require(Shared:WaitForChild("CardArt")).Art
	local motionCards = { ea_03 = true, ea_04 = true, ea_05 = true, ea_08 = true, ea_09 = true,
		ea_10 = true, ea_12 = true, ea_13 = true, ea_14 = true, ea_15 = true, ea_16 = true, ea_17 = true }
	for _, card in (cx.cards or {}) do
		if card.found then
			table.insert(all, card)
			byId[card.id] = card
			fieldCounts[card.field or ""] = (fieldCounts[card.field or ""] or 0) + 1
			if articles[card.id] then explained += 1 end
			if type(card.image) == "string" and card.image ~= "" then pictured += 1 end
			if card.field and not known[card.field] then
				known[card.field] = true
				local group = findField(card.field)
				table.insert(groups, { id = card.field, name = if group then group.name else tostring(card.field) })
			end
		end
	end
	for cardId, quantity in owned do
		if type(cardId) == "string" and type(quantity) == "number" and quantity > 0
			and string.match(cardId, "^%a%a_%d%d$") and not byId[cardId] then
			local unit = boarding.Units[cardId] or boarding.Specials[cardId]
			local art = registeredArt[cardId]
			if unit and art and type(art.image) == "string" and art.image ~= "" then
				-- [24프레임 전용] 시트는 기존 승인·업로드 경로에서 등록된 경우에만 사용.
				-- 미등록된 JPG 시안을 로컬/외부 주소로 불러오거나 원화를 대체하지 않는다.
				local sheetId = if motionCards[cardId] then AssetIds["CardArt/" .. cardId .. "_24f"] else nil
				local item = {
					id = cardId, name = unit.name, description = unit.lore or "해전 카드에서 수집한 원화야.",
					field = "ArtGallery", found = true, combatArt = true, motionCandidate = motionCards[cardId] == true,
					motionSheet = if type(sheetId) == "number" and sheetId > 0 then sheetId else nil,
					topic = unit.category or "전투 카드", kindName = unit.category or "해전 카드",
					worldGroup = "해전 수집 원화", entityType = "보유 전투 카드",
					discipline = "해양 문화·전투 카드", source = "내 카드 수집책 · 현재 보유 중",
					image = art.image, credit = art.credit, tags = { unit.category or "해전 카드" },
				}
				table.insert(all, item)
				byId[cardId] = item
				collectedOriginals += 1
				pictured += 1
			end
		end
	end
	if collectedOriginals > 0 then
		fieldCounts.ArtGallery = collectedOriginals
		table.insert(groups, { id = "ArtGallery", name = "해전 원화 화첩" })
		known.ArtGallery = true
	end
	table.sort(all, function(a, b)
		if a.field ~= b.field then return tostring(a.field) < tostring(b.field) end
		return tostring(a.name) < tostring(b.name)
	end)
	table.sort(groups, function(a, b) return a.name < b.name end)
	local fieldId = H.encyclopediaCategoryId or "all"
	if fieldId ~= "all" and not known[fieldId] then fieldId = "all"; H.encyclopediaCategoryId = fieldId end
	local groupName = "전체"
	for _, g in groups do
		if g.id == fieldId then groupName = g.name; break end
	end
	-- [정규 본문 검색] 실제 장문 해설까지 찾는다. 여러 단어는 모두 일치해야 한다.
	local queryWords = {}
	for term in string.gmatch(string.lower(string.sub(H.encyclopediaSearchText or "", 1, 120)), "%S+") do
		if #queryWords >= 6 then break end
		table.insert(queryWords, term)
	end
	local found = {}
	for _, card in all do
		if fieldId == "all" or card.field == fieldId then
			local article = articles[card.id]
			local words = { card.name or "", card.description or "", card.discipline or "",
				card.era or "", card.region or "", card.topic or "", card.kindName or "",
				card.source or "", card.evidence or "", card.worldGroup or "" }
			if article then
				for _, key in { "topic", "latin", "summary", "looks", "details", "context", "history", "trivia" } do
					table.insert(words, tostring(article[key] or ""))
				end
				for _, fact in article.facts or {} do
					if type(fact) == "table" then
						table.insert(words, tostring(fact[1] or ""))
						table.insert(words, tostring(fact[2] or ""))
					end
				end
			end
			for _, tag in (card.tags or {}) do table.insert(words, tostring(tag)) end
			for _, alias in (card.aliases or {}) do table.insert(words, tostring(alias)) end
			local haystack = string.lower(table.concat(words, " "))
			local matches = true
			for _, term in queryWords do
				if not string.find(haystack, term, 1, true) then matches = false; break end
			end
			if matches then table.insert(found, card) end
		end
	end
	if H.dexClean ~= false then
		add(function() return mkHeader(content, string.format("세계 백과 · %d / %d", cx.found or (#all - collectedOriginals), cx.total or #all)) end)
	else
	add(function() return mkHeader(content, string.format("대항해 지식 대백과 · 지식 %d / %d · 해전 원화 %d",
		cx.found or (#all - collectedOriginals), cx.total or #all, collectedOriginals)) end)
	add(function() return mkLabel(content, string.format("장문 해설 %d장 · 등록 도판 %d장 · 미발견 지식은 비공개", explained, pictured), 15, INK_SOFT, false) end)
	end
	if #queryWords > 0 or fieldId ~= "all" then
		add(function() return mkLabel(content, string.format("분야 · %s / 검색 결과 %d장", groupName, #found), 16, INK, true) end)
	end
	-- [목차] 검색과 분야 선택은 이 접속의 UI에만 기억한다.
	add(function()
		local panel = mkBox(content, UDim2.new(), UDim2.new(1, -8, 0, 107), COLORS.paper)
		panel.Name = "EncyclopediaIndex"
		corner(panel, 7)
		local search = Instance.new("TextBox")
		search.Name = "EncyclopediaSearch"
		search.Position = UDim2.fromOffset(8, 8)
		search.Size = UDim2.new(1, -109, 0, 42)
		search.BackgroundColor3 = Color3.fromRGB(249, 236, 208)
		search.TextColor3 = INK
		search.PlaceholderColor3 = INK_SOFT
		search.PlaceholderText = "이름 · 본문 · 역사 · 지역"
		search.Text = H.encyclopediaSearchText or ""
		search.ClearTextOnFocus = false
		search.Font = Enum.Font.Gotham
		search.TextSize = 16
		search.Parent = panel
		corner(search, 5)
		search:GetPropertyChangedSignal("Text"):Connect(function() H.encyclopediaSearchText = search.Text end)
		search.FocusLost:Connect(function(enter)
			if enter then H.encyclopediaPage = 1; render() end
		end)
		local submit = mkButton(panel, "검색", COLORS.gold, UDim2.fromOffset(90, 42), function()
			H.encyclopediaSearchText = search.Text
			H.encyclopediaPage = 1
			render()
		end, true)
		submit.Position = UDim2.new(1, -98, 0, 8)
		local group = mkButton(panel, (if H.encyclopediaIndexOpen then "목차 닫기 · " else "목차 열기 · ") .. groupName, COLORS.leather,
			UDim2.new(0.62, -12, 0, 42), function()
				H.encyclopediaIndexOpen = not H.encyclopediaIndexOpen
				H.encyclopediaIndexPage = 1
				render()
			end, true)
		group.Position = UDim2.fromOffset(8, 58)
		group.TextSize = 15
		local reset = mkButton(panel, "전체 목차", COLORS.blue, UDim2.new(0.38, -8, 0, 42), function()
			H.encyclopediaCategoryId = "all"
			H.encyclopediaSearchText = ""
			H.encyclopediaPage = 1
			H.encyclopediaIndexPage = 1
			render()
		end, true)
		reset.Position = UDim2.new(0.62, 0, 0, 58)
		reset.TextSize = 15
		return panel
	end)

	-- [분야/장 목차] 발견 기록을 재활용하며 12장 단위로만 표시해 모바일 부하를 줄인다.
	if H.encyclopediaIndexOpen then
		add(function() return mkLabel(content, "분야별 목차 · 발견한 지식", 18, INK, true) end)
		add(function()
			local columns = if content.AbsoluteSize.X >= 620 then 3 else 2
			local frame = Instance.new("Frame")
			frame.Name = "EncyclopediaFieldIndex"
			frame.BackgroundTransparency = 1
			frame.Size = UDim2.new(1, -8, 0, math.ceil(#groups / columns) * 49 + 6)
			-- [중세 문양 책갈피] 한 장의 승인 삽화 시트를 모든 분야에 재사용한다.
			local sheet = AssetIds["CardArt/ency_tab_sheet"]
			local cells = { Zoology = 0, Botany = 1, Mineral = 2, Site = 3, Architecture = 3,
				Relic = 4, Geography = 5, terrain = 5, Navigation = 6, Weather = 7,
				Medicine = 8, Chemistry = 8, Astronomy = 9, Physics = 9, Art = 10, Culture = 10,
				Language = 11, Philosophy = 11, Myth = 12, Mystery = 12, Religion = 12,
				Goods = 13, Law = 13, Politics = 13, Shipbuilding = 14, ArtGallery = 10, Lost = 15, all = 15 }
			for i, g in groups do
				local col = (i - 1) % columns
				local row = math.floor((i - 1) / columns)
				local total = if g.id == "all" then #all else fieldCounts[g.id] or 0
				local selectedField = g.id
				local button = mkButton(frame, g.name .. " · " .. tostring(total),
					if g.id == fieldId then COLORS.gold else COLORS.blue,
					UDim2.new(1 / columns, -7, 0, 43), function()
						H.encyclopediaCategoryId = selectedField
						H.encyclopediaIndexOpen = false
						H.encyclopediaPage = 1
						H.encyclopediaIndexPage = 1
						render()
					end, true)
				button.Position = UDim2.new(col / columns, 3, 0, row * 49 + 3)
				button.TextSize = 15
				local cell = cells[g.id] or 15
				if sheet then
					local holder = Instance.new("Frame")
					holder.Name = "EncyclopediaFieldMedallion"
					holder.BackgroundTransparency = 1
					holder.ClipsDescendants = true
					holder.Size = UDim2.fromOffset(36, 36)
					holder.Position = UDim2.fromOffset(4, 3)
					holder.ZIndex = button.ZIndex + 2
					holder.Parent = button
					local art = Instance.new("ImageLabel")
					art.BackgroundTransparency = 1
					art.Size = UDim2.fromScale(4, 4)
					art.Position = UDim2.fromScale(-(cell % 4), -math.floor(cell / 4))
					art.Image = "rbxassetid://" .. tostring(sheet)
					art.ScaleType = Enum.ScaleType.Stretch
					art.ZIndex = holder.ZIndex
					art.Parent = holder
					local caption = button:FindFirstChild("PrintedCaption")
					if not caption then
						caption = Instance.new("TextLabel")
						caption.Name = "PrintedCaption"
						caption.BackgroundTransparency = 1
						caption.Text = button.Text
						caption.TextColor3 = button.TextColor3
						caption.Font = button.Font
						caption.TextSize = 15
						caption.ZIndex = button.ZIndex + 2
						caption.Parent = button
					end
					button.TextTransparency = 1
					if caption:IsA("TextLabel") then
						caption.Position = UDim2.fromOffset(44, 1)
						caption.Size = UDim2.new(1, -49, 1, -2)
						caption.TextWrapped = true
						caption.TextSize = 14
						caption.TextXAlignment = Enum.TextXAlignment.Left
					end
				end
			end
			return frame
		end)
		if #found > 0 and H.dexClean == false then -- 깔끔한 도감은 왼쪽 원화 격자가 장 목록을 대신함
			local pageCount = math.ceil(#found / 12)
			H.encyclopediaIndexPage = math.clamp(H.encyclopediaIndexPage or 1, 1, pageCount)
			local indexPage = H.encyclopediaIndexPage
			add(function()
				return mkLabel(content, string.format("장 제목 목록 · %d건 중 %d쪽 / %d쪽", #found, indexPage, pageCount), 17, INK, true)
			end)
			for i = (indexPage - 1) * 12 + 1, math.min(#found, indexPage * 12) do
				local entryIndex, entry = i, found[i]
				add(function()
					local button = mkButton(content, string.format("%03d. %s", entryIndex, entry.name),
						if H.encyclopediaPage == entryIndex then COLORS.gold else COLORS.blue,
						UDim2.new(1, -8, 0, 42), function()
							H.encyclopediaPage = entryIndex
							H.encyclopediaIndexOpen = false
							Sfx.play("sfx_book_turn", 0.3)
							render()
						end, true)
					button.Name = "EncyclopediaIndexEntry"
					button.TextSize = 17
					return button
				end)
			end
			add(function()
				local nav = Instance.new("Frame")
				nav.Name = "EncyclopediaIndexPages"
				nav.BackgroundTransparency = 1
				nav.Size = UDim2.new(1, -8, 0, 46)
				local previous = mkButton(nav, "◀ 앞 목차", COLORS.leather, UDim2.new(0.5, -4, 0, 44), function()
					H.encyclopediaIndexPage = math.max(1, indexPage - 1)
					render()
				end, indexPage > 1)
				previous.Position = UDim2.fromOffset(0, 1)
				local following = mkButton(nav, "뒤 목차 ▶", COLORS.leather, UDim2.new(0.5, -4, 0, 44), function()
					H.encyclopediaIndexPage = math.min(pageCount, indexPage + 1)
					render()
				end, indexPage < pageCount)
				following.Position = UDim2.new(0.5, 4, 0, 1)
				return nav
			end)
		end
	end
	if #found == 0 then
		add(function()
			local hint = if #all == 0 then "탐험과 학자 보고로 발견하면 이곳에 기록돼."
				else "검색어 또는 분야에 해당하는 책이 없어. 전체 목차를 열어 줘."
			return mkRow(content, "읽을 지식이 없어", hint, {}, 80)
		end)
		return
	end
	-- [원화 직접 이동] 발견한 카드 ID를 찾아 해당 장을 열고, 없는 기록은 임의로 해금하지 않는다.
	if H.encyclopediaTargetId then
		local target = H.encyclopediaTargetId
		H.encyclopediaTargetId = nil
		H.encyclopediaPage = nil
		for index, entry in found do
			if entry.id == target then H.encyclopediaPage = index; break end
		end
	end
	-- [이어 읽기] 새 접속에서 책갈피가 있으면 해당 장을 처음 펼친다.
	if not H.encyclopediaPage and H.encyclopediaBookmarkId then
		for i, entry in found do
			if entry.id == H.encyclopediaBookmarkId then H.encyclopediaPage = i; break end
		end
	end
	H.encyclopediaPage = math.clamp(H.encyclopediaPage or 1, 1, #found)
	local current = found[H.encyclopediaPage]
	-- [백과-원화 동기화] 책장을 넘기면 왼쪽 카드도 현재 읽는 발견 원화로 갱신한다.
	if (currentTab == "codex" or currentTab == "encyclopedia") and H.dexClean == false then
		H.galleryReadingCard = if current.found and type(current.image) == "string" and current.image ~= "" then current else nil
		H.renderFacilityGallery()
	end
	local category = if current.combatArt then {
		name = "해전 원화 화첩", color = { 122, 89, 48 },
		detail = "해전 카드에서 수집한 물건·배·유물의 원화를 정리한 도판이야. 실제 역사 지식과 게임 카드 설정을 구분해 읽어 줘.",
		tip = "내 카드 수집책에서 보유 중인 원화만 여기에 나타나.",
	} else findField(current.field) or { name = tostring(current.field or "세계 지식"), color = { 122, 89, 48 } }
	local article = articles[current.id]
	if H.dexClean ~= false then
		H.galleryReadingCard = nil
		local saved = H.encyclopediaBookmarkId and byId[H.encyclopediaBookmarkId]
		if saved and saved.id ~= current.id then
			add(function()
				local jump = mkButton(content, "책갈피 · " .. saved.name, COLORS.leather, UDim2.new(1, -6, 0, 44), function()
					H.encyclopediaCategoryId = "all"
					H.encyclopediaSearchText = ""
					H.encyclopediaTargetId = saved.id
					H.dexPlateIndex = false
					H.dexAppendixScroll = nil
					Sfx.play("sfx_book_turn", 0.3)
					render()
				end, true)
				jump.Name = "EncyclopediaBookmarkJump"
				jump.TextSize = 15
				return jump
			end)
		end
		H.renderDex(found, current, article, category, cx, function(i)
			if i ~= H.encyclopediaPage then H.dexTurnDirection = if i > H.encyclopediaPage then 1 else -1 end
			H.encyclopediaPage = i
			Sfx.play("sfx_book_turn", 0.3)
			render()
		end)
		return
	end
	-- [가죽 표지·양피지] 한 장의 사진과 전체 길이 해설. 말줄임 없이 책 안에서 읽는다.
	local bookFrame
	add(function()
		local book = Instance.new("Frame")
		book.Name = "EncyclopediaBookPage"
		bookFrame = book
		book.Size = UDim2.new(1, -8, 0, math.clamp(math.max(content.AbsoluteSize.Y, 530) - 120, 410, 690))
		book.BackgroundColor3 = COLORS.leather
		book.BorderSizePixel = 0
		corner(book, 9)
		bookMaterial(book, "leather", 192)
		local border = Instance.new("UIStroke")
		border.Color = UI_BRASS
		border.Thickness = 2
		border.Parent = book
		local paper = mkBox(book, UDim2.fromOffset(9, 9), UDim2.new(1, -18, 1, -137), COLORS.paper)
		corner(paper, 5)
		bookMaterial(paper, "parchment", 192)
		local sheet = Instance.new("ScrollingFrame")
		sheet.Name = "EncyclopediaFullArticle"
		sheet.BackgroundTransparency = 1
		sheet.BorderSizePixel = 0
		sheet.Position = UDim2.fromOffset(6, 6)
		sheet.Size = UDim2.new(1, -12, 1, -12)
		sheet.ScrollBarThickness = 4
		sheet.ScrollingDirection = Enum.ScrollingDirection.Y
		sheet.CanvasSize = UDim2.new()
		sheet.AutomaticCanvasSize = Enum.AutomaticSize.Y
		sheet.Parent = paper
		local pad = Instance.new("UIPadding")
		pad.PaddingTop = UDim.new(0, 12)
		pad.PaddingBottom = UDim.new(0, 18)
		pad.PaddingLeft = UDim.new(0, 12)
		pad.PaddingRight = UDim.new(0, 12)
		pad.Parent = sheet
		local layout = Instance.new("UIListLayout")
		layout.Padding = UDim.new(0, 9)
		layout.SortOrder = Enum.SortOrder.LayoutOrder
		layout.Parent = sheet
		local order = 0
		local function line(textValue, size, strong, tone)
			local label = mkLabel(sheet, tostring(textValue), size, tone or INK, strong, order)
			label.Size = UDim2.new(1, -8, 0, 0)
			label.AutomaticSize = Enum.AutomaticSize.Y
			label.TextTruncate = Enum.TextTruncate.None
			order += 1
			return label
		end
		line(string.format("대항해 지식 대백과  ·  제%03d장 / %d", H.encyclopediaPage, #found), 16, true, INK_SOFT)
		line(current.name, 25, true, INK)
		if H.encyHeader and not current.combatArt then H.encyHeader(sheet, order, current, article, category); order += 1 end
		line(category.name .. " · " .. (current.discipline or "세계 지식")
			.. (if current.era then " · " .. current.era else ""), 16, true, INK_SOFT)
		local art = Instance.new("Frame")
		art.Name = "EncyclopediaIllustration"
		art.Size = UDim2.new(1, -8, 0, if type(current.image) ~= "string" or current.image == "" then 115 elseif content.AbsoluteSize.X >= 620 then 270 else 200)
		art.BackgroundColor3 = Color3.fromRGB(208, 185, 146)
		art.BorderSizePixel = 0
		art.LayoutOrder = order
		order += 1
		corner(art, 5)
		art.Parent = sheet
		-- [원화 표시 규칙] 정확히 24프레임으로 등록된 원화만 시트 애니메이션.
		-- 나머지는 기존 등록 원화를 정지 상태 그대로 보여 주며 미등록은 빈칸이다.
		if current.combatArt and current.motionSheet then
			local image = Instance.new("ImageLabel")
			image.Name = "Encyclopedia24FrameArt"
			image.BackgroundTransparency = 1
			image.Size = UDim2.fromScale(1, 1)
			image.ScaleType = Enum.ScaleType.Fit
			image.Image = "rbxassetid://" .. tostring(current.motionSheet)
			image.ImageRectSize = Vector2.new(256, 256)
			image.ImageRectOffset = Vector2.new(0, 0)
			image.Parent = art
			-- [모바일 성능] 현재 펼쳐 놓은 장에서만 6열×4행, 24장의 원본 프레임을 순환한다.
			task.spawn(function()
				local frame = 0
				while image.Parent and image:IsDescendantOf(game) do
					image.ImageRectOffset = Vector2.new((frame % 6) * 256, math.floor(frame / 6) * 256)
					frame = (frame + 1) % 24
					task.wait(0.15)
				end
			end)
		elseif type(current.image) == "string" and current.image ~= "" then
			paintCardArt(art, current, category)
		end
		line(if current.combatArt and current.motionSheet then "24프레임 움직이는 원화 · " .. current.name
			elseif current.combatArt and current.motionCandidate then "24프레임 시트 미등록 · 정지 원화 표시"
			elseif type(current.image) == "string" and current.image ~= "" then "정지 원화 · " .. current.name
			else "대표 그림 자리 · 추후 등록", 14, false, INK_SOFT)
		-- [백과 시각화] 한눈에 보기 · 분포 지도 · 연표 · 크기 비교
		if not current.combatArt then
			if H.encyFacts then H.encyFacts(sheet, order, current, article); order += 1 end
			if H.encyMap then H.encyMap(sheet, order, current); order += 1 end
			if H.encyTimeline then H.encyTimeline(sheet, order, current); order += 1 end
			if H.encySize then H.encySize(sheet, order, article); order += 1 end
		end
		line("Ⅰ. 개요", 19, true)
		line(if article and article.summary then current.description .. "\n\n" .. article.summary else (current.description or "등록된 개요가 없어."), 17, false)
		if article and article.looks and article.looks ~= "" then
			line("생김새·구조", 19, true)
			line(article.looks, 17, false)
		end
		if current.combatArt then
			line("Ⅱ. 원화 기록", 19, true)
			line("현재 소장한 해전 카드에 등록된 원화를 보여 주고 있어. 실제 역사적 고증과 게임 속 전투 설정은 구분해서 읽어야 해.", 17, false)
			line("Ⅲ. 카드 수집 정보", 19, true)
			line("분류: " .. tostring(current.topic or "해전 카드")
				.. "\n원화 출처: " .. tostring(current.credit or "기존 등록 자료")
				.. "\n등록 방식: " .. (if current.motionSheet then "24프레임 애니메이션"
					elseif current.motionCandidate then "정지 원화 · 24프레임 시트 등록 대기" else "정지 원화"), 16, false)
		elseif article then
			if article.details and article.details ~= "" then
				line("Ⅱ. 특징과 구조", 19, true)
				line(article.details, 17, false)
			end
			if article.context and article.context ~= "" then
				line("Ⅲ. 쓰임과 배경", 19, true)
				line(article.context, 17, false)
			end
			if article.history and article.history ~= "" then
				line("Ⅳ. 역사 속 이야기", 19, true)
				line(article.history, 17, false)
			end
			if article.trivia and article.trivia ~= "" then
				line("💡 알고 나면 재미있는 이야기", 19, true)
				line(article.trivia, 17, false)
			end
			if type(article.sources) == "table" and #article.sources > 0 then
				line("참고 자료: " .. table.concat(article.sources, " · "), 14, false, INK_SOFT)
			end
		else
			-- [전 항목 독서 본문] 장문 원고가 없는 항목도 기존 정규 설명·분야 사료·탐구 경로로 장을 구성한다.
			-- 해당 개체만의 고유 역사나 효과를 임의로 생성하지 않는다.
			line("Ⅱ. 이 분야의 학문적·역사적 배경", 19, true)
			line(category.detail or category.summary or "이 지식은 현장에서 발견한 원본 기록을 통해 연구할 수 있어.", 17, false)
			line("Ⅲ. 조사와 기록 방법", 19, true)
			line((category.tip or "관찰 자료와 문헌을 대조해 기록을 정리한다.")
				.. (if current.source and current.source ~= "" then "\n원본 카드의 확인 경로: " .. current.source else ""), 17, false)
			local notes = {}
			if current.era then
				table.insert(notes, "시대: " .. current.era .. " · 이 항목에 부여된 시대 분류를 따라 읽어야 해.")
			end
			if current.region then
				table.insert(notes, "지역: " .. current.region .. " · 기록에 연결된 대표 지역이야.")
			end
			if current.domain then
				table.insert(notes, "연구 계통: " .. current.domain)
			end
			if current.relatedDisciplines and #current.relatedDisciplines > 0 then
				table.insert(notes, "연계 학문: " .. table.concat(current.relatedDisciplines, " · "))
			end
			if current.path and current.path ~= "" then
				table.insert(notes, "탐구 경로: " .. tostring(current.path))
			end
			if #notes > 0 then
				line("Ⅳ. 시대·지역·연계 연구", 19, true)
				line(table.concat(notes, "\n"), 17, false)
			end
		end
		line("분류와 시대", 19, true)
		line("대분류: " .. (current.worldGroup or "세계 지식")
			.. "\n주제: " .. (current.topic or "기타")
			.. "\n자료 유형: " .. (current.kindName or "기타")
			.. "\n존재 형태: " .. (current.entityType or "기록")
			.. "\n학문: " .. (current.discipline or "미분류")
			.. (if current.era then "\n시대: " .. current.era else "")
			.. (if current.region then "\n관련 지역: " .. current.region else "")
			.. (if current.evidence then "\n자료 검증 구분: " .. current.evidence else "")
			.. (if current.fromYear then "\n게임 내 등장 가능 연도: " .. tostring(current.fromYear) else ""), 16, false)
		if current.evidenceId == "fiction" then
			line("※ 이 항목은 실제 역사 자료가 아닌 게임 속 가상 설정이야.", 16, true, INK_SOFT)
		elseif current.evidenceId == "legend" or current.evidenceId == "hypothesis" then
			line("※ 전승 또는 가설을 다룬 자료로, 사실로 확정되지 않은 내용이 포함돼.", 16, false, INK_SOFT)
		elseif current.evidenceId == "unreviewed" then
			line("※ 개별 자료의 검증이 아직 완료되지 않았어. 기록과 해석을 구분해서 읽어 줘.", 16, false, INK_SOFT)
		end
		if current.relatedDisciplines and #current.relatedDisciplines > 0 then
			local disciplines = {}
			for _, name in current.relatedDisciplines do table.insert(disciplines, tostring(name)) end
			line("함께 살펴볼 학문", 19, true)
			line(table.concat(disciplines, " · "), 16, false)
		end
		if current.source and current.source ~= "" then
			line("원본 기록의 발견 경로", 19, true)
			line(current.source, 16, false)
		end
		-- [백과 시각화] 관련 카드 썸네일 · 분야 수집률
		if not current.combatArt then
			local allById = {}
			for _, c in (cx.cards or {}) do allById[c.id] = c end
			if H.encyRelated then H.encyRelated(sheet, order, current, allById); order += 1 end
			if H.encyCollection then H.encyCollection(sheet, order, current, cx.cards); order += 1 end
		end
		line("내 항해 기록", 19, true)
		local first = current.provenance
		line(if first then "첫 발견: " .. tostring(first.port or "위치 미상")
			.. " · 항해 " .. tostring(first.day or 0) .. "일째 · " .. tostring(first.method or "발견")
			.. (if first.person then "\n전수한 인물: " .. first.person else "")
			.. (if first.site then "\n탐험 현장: " .. first.site else "")
			.. (if first.quest then "\n관련 의뢰: " .. first.quest else "")
			.. (if first.event then "\n관련 사건: " .. first.event else "")
			else "이전에 획득한 지식 · 자세한 발견 위치는 기록되지 않았어.", 16, false)
		line("자료·저작권", 19, true)
		line(if article and article.topic then "본문 참고: 위키백과 · " .. string.gsub(article.topic, "_", " ")
			.. "\n해설은 게임에 편집·수록된 자료야. 실시간 연동은 아니야."
			else "본문: 게임 지식카드 · 외부 참고 자료 확인 대기", 15, false, INK_SOFT)
		-- [외부 참고 주소] Roblox 안에서 외부 페이지를 강제로 띄우지 않는다.
		-- 승인된 상세 원고는 위키백과 원문 주소를, 그 외는 검색 주소를 구별하여 표시한다.
		if not current.combatArt and current.evidenceId ~= "fiction" then
			local referenceUrl = if article and article.topic and article.topic ~= ""
				then "https://en.wikipedia.org/wiki/" .. article.topic
				else "https://ko.wikipedia.org/w/index.php?search=" .. game:GetService("HttpService"):UrlEncode(current.name)
			line(if article and article.topic then "참고 원문 주소" else "위키백과 검색 주소 · 내용 미검증", 18, true)
			local reference = Instance.new("TextBox")
			reference.Name = "EncyclopediaReferenceUrl"
			reference.Size = UDim2.new(1, -12, 0, 55)
			reference.BackgroundColor3 = Color3.fromRGB(249, 236, 208)
			reference.TextColor3 = INK
			reference.TextWrapped = true
			reference.TextXAlignment = Enum.TextXAlignment.Left
			reference.Font = Enum.Font.Gotham
			reference.TextSize = 15
			reference.TextEditable = false
			reference.ClearTextOnFocus = false
			reference.Text = referenceUrl
			reference.LayoutOrder = order
			order += 1
			reference.Parent = sheet
		end
		if current.wikidata then line("위키데이터 항목: " .. tostring(current.wikidata), 15, false, INK_SOFT) end
		if current.nextClue then
			line("이어지는 탐구 단서", 19, true)
			line((current.nextClue.quest or "관련 연구")
				.. (if current.nextClue.port then " · " .. current.nextClue.port else "")
				.. (if current.nextClue.source then "\n" .. current.nextClue.source else ""), 16, false)
		end
		if current.credit and current.credit ~= "" then
			line("대표 그림 출처: " .. current.credit, 15, false, INK_SOFT)
		end
		-- [관련 항목] 발견된 다른 지식도 백과 안에서 계속 읽고, 장소/상품은 별도 텍스트로 보여 준다.
		local linked, places = 0, {}
		for _, rel in (current.relations or {}) do
			local target = rel.cardId and byId[rel.cardId]
			if target and rel.found and linked < 5 then
				if linked == 0 then line("이어 읽을 지식", 19, true) end
				linked += 1
				local related = mkButton(sheet, target.name .. " · " .. tostring(rel.relation or "관련 항목"), COLORS.blue,
					UDim2.new(1, -12, 0, 42), function()
						H.encyclopediaCategoryId = "all"
						H.encyclopediaSearchText = ""
						for i, discovered in all do
							if discovered.id == target.id then H.encyclopediaPage = i; break end
						end
						Sfx.play("sfx_book_turn", 0.3)
						render()
					end, true)
				related.LayoutOrder = order
				order += 1
				related.TextSize = 16
			elseif not rel.cardId and rel.name and #places < 4 then
				table.insert(places, tostring(rel.name) .. " · " .. tostring(rel.relation or "연관 장소·상품"))
			end
		end
		if #places > 0 then
			line("연관된 장소·상품·사료", 19, true)
			line(table.concat(places, "\n"), 16, false)
		end
		if not current.combatArt then
			local more = mkButton(sheet, "카드 원문 · 추가 연구 기록", COLORS.gold,
				UDim2.new(1, -12, 0, 46), function() H.showCardDetail(current) end, true)
			more.LayoutOrder = order
			more.TextSize = 16
		end
		return book
	end)
	-- [책 하단 고정] 본문을 읽는 동안 이전/다음 장과 책갈피 버튼은 제자리에 둔다.
	-- 기존 저장 키에 책갈피 카드 1개만 추가하며 발견 여부를 서버에서 검증한다.
	do
		local nav = Instance.new("Frame")
		nav.Parent = bookFrame
		nav.Position = UDim2.new(0, 9, 1, -117)
		nav.Name = "EncyclopediaPageNavigation"
		nav.BackgroundTransparency = 1
		nav.Size = UDim2.new(1, -8, 0, 108)
		local prev = mkButton(nav, "◀ 이전 장", COLORS.leather, UDim2.new(0.35, -5, 0, 46), function()
			H.encyclopediaPage = math.max(1, H.encyclopediaPage - 1)
			Sfx.play("sfx_book_turn", 0.3)
			render()
		end, H.encyclopediaPage > 1)
		prev.Position = UDim2.fromOffset(0, 3)
		local count = mkLabel(nav, string.format("%d / %d", H.encyclopediaPage, #found), 17, COLORS.gold, true)
		count.Position = UDim2.new(0.35, 0, 0, 13)
		count.Size = UDim2.new(0.3, 0, 0, 28)
		count.AutomaticSize = Enum.AutomaticSize.None
		count.TextXAlignment = Enum.TextXAlignment.Center
		local nextPage = mkButton(nav, "다음 장 ▶", COLORS.gold, UDim2.new(0.35, -5, 0, 46), function()
			H.encyclopediaPage = math.min(#found, H.encyclopediaPage + 1)
			Sfx.play("sfx_book_turn", 0.3)
			render()
		end, H.encyclopediaPage < #found)
		nextPage.Position = UDim2.new(0.65, 5, 0, 3)
		local save = mkButton(nav, if current.combatArt then "지식 책갈피 전용" elseif H.encyclopediaBookmarkId == current.id then "책갈피 빼기" else "책갈피 꽂기",
			COLORS.leather, UDim2.new(0.5, -5, 0, 44), function()
				local result = call("SetEncyclopediaBookmark", { id = current.id })
				if result and result.ok then Sfx.play("sfx_book_turn", 0.3) end
			end, not current.combatArt)
		save.Position = UDim2.fromOffset(0, 59)
		save.TextSize = 16
		local saved = H.encyclopediaBookmarkId and byId[H.encyclopediaBookmarkId]
		local jump = mkButton(nav, if saved then "책갈피 · " .. saved.name else "책갈피 없음",
			COLORS.blue, UDim2.new(0.5, -5, 0, 44), function()
				if not saved then return end
				H.encyclopediaCategoryId = "all"
				H.encyclopediaSearchText = ""
				H.encyclopediaPage = 1
				for i, card in all do
					if card.id == saved.id then H.encyclopediaPage = i; break end
				end
				render()
			end, saved ~= nil)
		jump.Position = UDim2.new(0.5, 5, 0, 59)
		jump.TextSize = 15
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
		{ "연구 가능", tostring(affordable), tone = "key" },
		{ "조건 잠금", tostring(blocked), tone = "key" },
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
	local autos = {}
	for _, q in view.quests.available do
		if q.auto then table.insert(autos, q) end
	end
	local section = H.questSection or "active"
	add(function()
		return mkRow(content, "일지", "", {
			{ text = string.format("진행 %d", #view.quests.active), color = if section == "active" then COLORS.gold else COLORS.grey, onClick = function() H.questSection = "active"; H.questDetailId = nil; render() end },
			{ text = string.format("목표 %d", #autos), color = if section == "auto" then COLORS.gold else COLORS.grey, onClick = function() H.questSection = "auto"; render() end },
			{ text = "탐험", color = if section == "field" then COLORS.gold else COLORS.grey, onClick = function() H.questSection = "field"; render() end },
			{ text = string.format("완료 %d", #view.quests.done), color = if section == "done" then COLORS.gold else COLORS.grey, onClick = function() H.questSection = "done"; render() end },
		}, 78)
	end)
	-- 일지: 모든 퀘스트가 여기 기록된다. 소문을 듣거나 사람을 만나 이야기하면 저절로 올라오고, 조건을 채우면 저절로 보상이 들어온다.
	local STRAND = { main = "서막", companion = "동료 이야기", history = "역사의 현장", person = "인물과 연구" }
	local GRADE = { "입문", "일반", "숙련", "위험", "전설" }
	local function strandText(q)
		local grade = math.clamp(math.floor(tonumber(q.grade) or 1), 1, 5)
		return string.format("[난이도 %d/5 · %s] ", grade, GRADE[grade])
			.. (if q.strand then "[" .. (STRAND[q.strand] or "이야기") .. "] " else "")
			.. q.summary .. (if q.story then "\n" .. q.story else "")
	end
	if section == "active" then
	if #view.quests.active == 0 then
		add(function() return mkLabel(content, "아직 기록이 없어요. 소문을 듣거나 사람과 이야기해 보세요.", 13, COLORS.muted, true) end)
	end
	local active = table.clone(view.quests.active)
	local order = {}
	for index, quest in active do order[quest] = index end
	table.sort(active, function(a, b)
		local readyA = a.kind == "deliver" and a.progress >= a.amount
		local readyB = b.kind == "deliver" and b.progress >= b.amount
		if readyA ~= readyB then return readyA end
		return order[a] < order[b]
	end)
	for _, q in active do
		local expanded = H.questDetailId == q.id
		add(function()
			local buttons = {
				{ text = if expanded then "접기" else "상세", color = COLORS.grey, onClick = function()
					H.questDetailId = if expanded then nil else q.id
					render()
				end },
			}
			if expanded then
			if q.kind == "deliver" then
				table.insert(buttons, { text = "납품", color = COLORS.blue, onClick = function() call("TurnIn", { questId = q.id }) end })
			end
			-- [이야기 퀘스트 시스템] 선택 분기·지도자 대결·이야기 함대전 버튼
			local ex = q.story2
			if ex and ex.choices and not ex.picked then
				for _, opt in ex.choices do
					table.insert(buttons, { text = opt.label, color = COLORS.gold, onClick = function() call("StoryChoose", { questId = q.id, value = opt.value }) end })
				end
			elseif ex and ex.duel then
				table.insert(buttons, { text = "대결", color = COLORS.red, onClick = function()
					if H.openDeck then H.openDeck(true) end
					task.defer(function() if H.devCards and H.devCards.duel then H.devCards.duel(q.id) end end)
				end })
			elseif ex and ex.warId then
				table.insert(buttons, { text = "작전", color = COLORS.red, onClick = function() openTab("war") end })
			end
			end
			local done, total = math.min(q.progress, q.amount), math.max(1, q.amount)
			local said = if ex and ex.speaker then string.format("\n%s: \"%s\"", ex.speaker, ex.line) else ""
			local compact = (if q.chapter and not string.find(q.summary, tostring(q.chapter), 1, true) then tostring(q.chapter) .. "\n" else "") .. q.summary
			local row = mkRow(content, q.name, if expanded then strandText(q) .. (if q.problem or q.chapter or q.prevEnding then "" else said) else compact, buttons, 92)
			local stamp = if q.chapter and H.hasIconArt("chapter") then "chapter" else "quest"
			if H.hasIconArt(stamp) then withIcon(row, "FacilityArt", stamp, nil, 44) end
			local textBox = row:FindFirstChild("RowText")
			if textBox then
				local meter = Instance.new("Frame")
				meter.Name = "QuestProgressMeter"
				meter.Size = UDim2.new(1, 0, 0, 46)
				meter.BackgroundTransparency = 1
				meter.Parent = textBox
				local iconLeft = 0
				if H.hasIconArt("reward") then
					local icon = modelIcon(meter, "FacilityArt", "reward", nil, 24, "보상")
					icon.Position = UDim2.fromOffset(0, 0)
					iconLeft = 28
				end
				local label = mkLabel(meter, string.format("%d/%d · 보상 %s코인", done, q.amount, H.commas(q.rewardCoins)), 14, INK, true)
				label.Position = UDim2.fromOffset(iconLeft, 0)
				label.Size = UDim2.new(1, -iconLeft, 0, 24)
				label.AutomaticSize = Enum.AutomaticSize.None
				label.TextTruncate = Enum.TextTruncate.AtEnd
				local track = Instance.new("Frame")
				track.Position = UDim2.fromOffset(0, 29)
				track.Size = UDim2.new(1, -4, 0, 12)
				track.BackgroundColor3 = Color3.fromRGB(199, 181, 151)
				track.BorderSizePixel = 0
				track.Parent = meter
				corner(track, 4)
				local fill = Instance.new("Frame")
				fill.Size = UDim2.fromScale(math.clamp(done / total, 0, 1), 1)
				fill.BackgroundColor3 = if done >= q.amount then Color3.fromRGB(77, 125, 81) else UI_BRASS_DARK
				fill.BorderSizePixel = 0
				fill.Parent = track
				corner(fill, 4)
			end
			return row
		end)
		if expanded and H.questCauseCard then H.questCauseCard(q) end
	end
	elseif section == "auto" then
	if #autos == 0 then
		add(function() return mkLabel(content, "기록 중인 목표 없음", 14, INK_SOFT, true) end)
	else
 		for _, q in autos do
			add(function()
				return mkRow(content, q.name, string.format("%s\n진행 %d/%d · 보상 %d코인", strandText(q), math.min(q.progress or 0, q.amount or 0), q.amount or 0, q.rewardCoins), nil, if q.story then 116 else 64)
			end)
		end
	end
	elseif section == "field" then
	-- [세계 현장 탐험] 10대 이야기 항로의 다음 1~5단 목적지와 단서 출처 표시.
	-- 현지라면 탐험 탭으로, 먼 지역이면 기존 항해 지도로 안내한다.
	if view.quests.fieldRoutes and #view.quests.fieldRoutes > 0 then
		add(function() return mkHeader(content, string.format("세계 탐험 · %d대 항로", view.quests.routeCount or 10)) end)
		for _, route in view.quests.fieldRoutes do
			add(function()
				local action = if route.here then "탐험지" else "항해 지도"
				local targetTab = if route.here then "explore" else "map"
				return mkRow(content, route.name,
					string.format("%d/5단 · %s · 단서: %s\n%s", route.grade or 1, route.port, route.leadSource or "현지 탐험", route.summary),
					{ { text = action, color = COLORS.blue, onClick = function() openTab(targetTab) end } }, 112)
			end)
		end
	else
		add(function() return mkLabel(content, "기록된 탐험 항로 없음", 14, INK_SOFT, true) end)
	end
	elseif section == "done" then
	if #view.quests.done == 0 then
		add(function() return mkLabel(content, "완료한 기록 없음", 14, INK_SOFT, true) end)
	end
	if (view.quests.otherPortDeliver or 0) > 0 or #view.quests.available > #autos then
		add(function()
			return mkLabel(content, "다른 항구의 소문과 사람들에게서 더 많은 의뢰를 들을 수 있어요.", 12, COLORS.muted, true)
		end)
	end
	if #view.quests.done > 0 then
		for _, q in view.quests.done do
			add(function()
				return mkLabel(content, string.format("(완료 · %d/5단) ", q.grade or 1) .. q.name .. " — " .. q.summary .. (if q.ending then "\n   " .. q.ending else ""), 12, COLORS.muted, true)
			end)
		end
	end
	end
end

-- 주점의 지식 카드 배틀: 카드 덱을 짜고 연습전·오늘의 퍼즐로 카드 대결을 즐긴다 (해상전과는 별개).
function RENDERERS.gwent()
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
		{ "덱 진영", fac and fac.name or "기본", tone = "key" },
		{ "보관함", string.format("%d장", total), tone = "key" },
		{ "근접 · 사격", string.format("%d · %d", cnt.melee, cnt.ranged), tone = "key" },
		{ "포 · 특수", string.format("%d · %d", cnt.cannon, cnt.special), tone = "key" },
		{ "오늘 보상", string.format("%d회", (bk and bk.duelLeft) or 0), tone = "good" },
	})
	add(function()
		return H.tileGrid({
			{ icon = "codex", title = "덱 짜기", sub = "카드를 골라 덱 구성", btn = "열기", color = COLORS.blue, onClick = function() if H.openDeck then H.openDeck() end end },
			{ icon = "cc0_shield", title = "연습전", sub = "기본 카드로 규칙 배우기", btn = "시작", color = COLORS.green, onClick = function()
				if H.openDeck then H.openDeck(true) end
				task.defer(function() if H.devCards and H.devCards.practice then H.devCards.practice() end end)
			end },
			{ icon = "cc0_sword", title = "카드 대결", sub = "이기면 새 지식 카드", btn = "대결", color = COLORS.red, onClick = function()
				if H.openDeck then H.openDeck(true) end
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
		return mkRow(content, "대규모 해전 의뢰", "전 차수 승리 시 완료 · 차수 사이 선체 회복 없음", nil, 60)
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
-- [외교] 나라 정세·관계·전쟁·선물·개입·항해자를 한 곳에 모은 탭 (항만청). 기존 지도 탭 하단의 외교 목록을 옮겨 왔다.
function RENDERERS.diplomacy()
	-- [외교 화면] 조선소 정비 바(보급·수리)는 외교와 무관해 조선소로 착각되므로 띄우지 않는다.
	local dp = view.diplo
	if not dp then
		add(function() return mkLabel(content, "아직 외교 정보가 없어요.", 14, COLORS.muted, false) end)
		return
	end
	local STATUS = { war = "⚔ 전쟁", hostile = "적대", neutral = "중립", friend = "우호", ally = "동맹", own = "우리" }
	-- [외교 승인 원화] 국가와 직접 관련 있는 기존 사건·상인 카드만 사용한다. 신규 에셋 없음.
	local nationArt = {
		england = "event_royal_charter", netherlands = "event_anglo_dutch_war",
		china = "event_canton_system", japan = "event_merchant_naha",
		swahili = "event_zanzibar", malabar = "event_merchant_coromandel",
	}
	-- 1) 한눈에: 우리 나라 · 이 항구 나라 · 전쟁 수
	H.statStrip({
		{ "우리 나라", dp.power.name, tone = "key" },
		{ "이 항구", if dp.here and dp.here.power then string.format("%s · %s", dp.here.power, STATUS[dp.here.status] or "") else "-", tone = "key" },
		{ "큰 전쟁", tostring(#dp.wars) .. "건", tone = if #dp.wars > 0 then "bad" else "good" },
	})
	-- 2) 이 항구 나라: 지도자·군사·연구·문화권·관세 (국가 시뮬 요약)
	local nat = view.harbor and view.harbor.sim and view.harbor.sim.nation
	if nat and nat.lines then
		add(function() return mkHeader(content, "이 항구의 나라") end)
		add(function() return mkLabel(content, table.concat(nat.lines, "\n"), 14, COLORS.text, true) end)
	end
	-- 3) 세계 정세: 국력 순위
	if view.worldNations and #view.worldNations > 0 then
		add(function() return mkHeader(content, "세계 정세 · 국력 순위") end)
		for _, n in view.worldNations do
			add(function()
				local sub = string.format("%s · %s\n육군 %.0f · 해군 %.0f · 발견 %d종%s%s", n.leader, n.regime, n.army, n.navy, n.techs,
					if n.war then " · 전쟁: " .. n.war else "", if n.allies > 0 then string.format(" · 동맹 %d", n.allies) else "")
				local natInfo = PortData.Nations[n.id]
				local nationName = if natInfo then natInfo.name else tostring(n.id)
				local row = mkRow(content, string.format("%d위 %s%s", n.rank, nationName, if n.hegemon then " · 패권국" else ""), sub, {}, 70)
				-- [외교 원화] 국가 순위의 이름을 누르면 같은 시설 원화 카드에 해당 국가를 표시한다.
				local choose = Instance.new("TextButton")
				choose.Name = "DiplomacyArtwork_" .. tostring(n.id)
				choose.Text = ""
				choose.BackgroundTransparency = 1
				choose.BorderSizePixel = 0
				choose.Size = UDim2.fromScale(1, 1)
				choose.ZIndex = row.ZIndex + 3
				choose.Parent = row
				choose.Activated:Connect(function()
					H.gallerySelection = { tab = "diplomacy", name = nationName, search = nationName, art = nationArt[n.id] }
					H.renderFacilityGallery()
				end)
				return row
			end)
		end
	end
	-- 4) 관계·전쟁, 외교 행동(선물·증서·전쟁 개입), 항해자
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
		return mkRow(content, "전쟁 개입", "이 항구 나라가 전쟁 중이면 군수 물자(전쟁 점수↑), 중재(휴전 시도), 용병 해군(6개월)을 쓸 수 있어요. 성공할 때만 코인이 나가요.", {
			{ text = "군수 500", color = COLORS.green, onClick = function() call("DiploAid", { kind = "supply", amount = 500 }) end, enabled = true },
			{ text = "중재 500", color = COLORS.blue, onClick = function() call("DiploAid", { kind = "mediate", amount = 500 }) end, enabled = true },
			{ text = "용병 500", color = COLORS.gold, onClick = function() call("DiploAid", { kind = "mercenary", amount = 500 }) end, enabled = true },
		}, 96)
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

function RENDERERS.map()
	-- [항구 선택 원화] 지도 점 또는 해역 목록에서 고른 항구에 맞는 승인 해역 원화를 사용한다.
	if selectedPort and PortData.Ports[selectedPort] then
		local port = PortData.Ports[selectedPort]
		H.gallerySelection = { tab = "map", name = port.name, search = port.name,
			chart = H.chartForPort(selectedPort) }
	else
		H.gallerySelection = nil
	end
	H.renderFacilityGallery()
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
				-- [해양 퀘스트 표시 · 2026-11-28] 길드 허가증 의뢰 중인 항구 🔒, 함대전 의뢰 해역 항구 ⚔
				local permitHere, warHere = false, false
				for _, q in (view.quests and view.quests.active) or {} do
					if q.id == "permit_" .. id then permitHere = true end
					if q.kind == "war_clear" and q.portId == id then warHere = true end
				end
				tag.Text = (if warHere then "⚔" else "") .. (if permitHere then "🔒" else "") .. (if isQuest then "📜" elseif isYard and H.mapMark ~= "all" then "🔧" else "") .. pt.name .. (if id == nearYardId then " ⚓가까운 조선소" else "")
				tag.Size = UDim2.fromOffset(if permitHere or warHere then 90 else 60, 14)
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
	route = { "Menu", "route" }, map = { "Menu", "map" }, trade = { "Menu", "trade" }, market = { "Menu", "trade" }, harbor = { "Menu", "harbor" },
	yard = { "Menu", "yard" }, battle = { "Menu", "battle" }, war = { "Glyph", "war" }, gwent = { "Glyph", "gwent" },
	scholar = { "Glyph", "scholar" }, codex = { "Menu", "codex" }, encyclopedia = { "Menu", "codex" }, tech = { "Glyph", "research" },
	status = { "Glyph", "captain" }, crew = { "Glyph", "crew" },
	diplomacy = { "Castle", "flag-banner-short" }, -- 승인된 외교 서신 원화가 없을 때만 기존 모델 사용
}
H.TAB_CAPTION = { route = "항로", map = "해도", diplomacy = "외교", trade = "거래", market = "시장", harbor = "항구",
	board = "의뢰", quest = "일지", explore = "탐험", battle = "해전", war = "함대전", gwent = "카드",
	status = "선장", yard = "조선소", crew = "승조원", recruit = "영입", tech = "연구", scholar = "보고", codex = "지식 카드", encyclopedia = "백과" }
function H.renderTabs()
	-- [시설 아이콘 동작] 기존 탭 아이콘에만 터치 선택·마우스 반응을 적용한다.
	-- 매 프레임 갱신이나 무한 반복은 사용하지 않아 모바일 배터리·입력 성능을 유지한다.
	local motionService = game:GetService("TweenService")
	local motionSettings = game:GetService("GuiService")
	-- 두 상태 원화가 모두 등록됐을 때만 기존 탭 재질을 교체한다.
	local tabOn, tabOff = AssetIds["CardArt/ui_frame_tab_on"], AssetIds["CardArt/ui_frame_tab_off"]
	local tabSkins = tabOn ~= nil and tabOff ~= nil
	-- [시설 탭 재사용] 같은 시설 안에서 이동할 때 아이콘·원화를 다시 생성하지 않는다.
	-- 소속 시설이 바뀌거나 버튼이 없을 때에만 기존 생성 경로를 사용한다.
	local g = groupOf(currentTab)
	local cached = H.renderedTabGroup == g.name
	if cached then
		for _, id in g.tabs do
			if not H.tabStrip:FindFirstChild("FacilityTab_" .. id) then cached = false; break end
		end
	end
	if cached then
		if H.renderedTabId ~= currentTab then
			for _, id in g.tabs do
				local b = H.tabStrip:FindFirstChild("FacilityTab_" .. id)
				local selected = id == currentTab
				b:SetAttribute("SelectedTab", selected)
				b.BackgroundColor3 = if selected then Color3.fromRGB(239, 202, 123) else Color3.fromRGB(91, 67, 47)
				b.TextColor3 = if selected then INK else Color3.fromRGB(255, 241, 210)
				local caption = b:FindFirstChild("PrintedCaption")
				if caption then caption.TextColor3 = b.TextColor3 end
				local gradient = b:FindFirstChildOfClass("UIGradient")
				if gradient then
					gradient.Color = ColorSequence.new(
						if selected then Color3.fromRGB(254, 224, 158) else Color3.fromRGB(131, 99, 69),
						if selected then Color3.fromRGB(193, 146, 72) else Color3.fromRGB(74, 51, 35))
				end
				local grain = b:FindFirstChild("BookMaterial")
				if grain then
					if tabSkins then
						grain.Image = "rbxassetid://" .. tostring(if selected then tabOn else tabOff)
						grain.ImageColor3 = Color3.new(1, 1, 1)
						grain.ImageTransparency = 0
					else
						grain.ImageColor3 = if selected then Color3.fromRGB(252, 220, 148) else Color3.fromRGB(138, 111, 78)
						grain.ImageTransparency = if selected then 0.55 else 0.58
					end
				end
				local border = b:FindFirstChildOfClass("UIStroke")
				if border then
					border.Color = if selected then UI_BRASS_DARK else Color3.fromRGB(205, 163, 93)
					border.Thickness = if selected then 2.5 else 1.6
				end
				local underline = b:FindFirstChild("ActiveTabRule")
				if underline then underline.Visible = selected end
				local icon = b:FindFirstChild("TabIcon")
				local rim = icon and icon:FindFirstChild("TabIconRim")
				if rim then
					rim.Color = if selected then UI_BRASS_DARK else UI_BRASS
					rim.Transparency = if selected then 0.12 else 0.55
				end
				local iconScale = icon and icon:FindFirstChild("TabIconScale")
				if selected and iconScale and not motionSettings.ReducedMotionEnabled then
					motionService:Create(iconScale, TweenInfo.new(0.2, Enum.EasingStyle.Sine, Enum.EasingDirection.Out, 0, true), {
						Scale = 1.15,
					}):Play()
				end
			end
		end
		H.renderedTabId = currentTab
		return
	end
	for _, child in H.tabStrip:GetChildren() do
		if child:IsA("TextButton") then child:Destroy() end
	end
	for i, id in g.tabs do
		local selected = currentTab == id
		local compactTabs = mainInner.AbsoluteSize.X < 740 and (mainInner.AbsoluteSize.Y <= 0 or mainInner.AbsoluteSize.Y >= 430)
		local b = mkButton(H.tabStrip, TAB_NAME[id], if selected then COLORS.gold else COLORS.leather, UDim2.fromOffset(H.tabWidth or 144, if compactTabs then 58 else 48), function()
			-- [시설 탭 정본] 모든 시설은 같은 탭 전환 함수를 사용하며 별도 전체창은 만들지 않는다.
			openTab(id)
		end, true)
		b.Name = "FacilityTab_" .. id
		b.LayoutOrder = i
		b:SetAttribute("SelectedTab", selected)
		b.TextColor3 = if selected then INK else Color3.fromRGB(255, 241, 210)
		b.TextSize = 18
		local grain = b:FindFirstChild("BookMaterial")
		if tabSkins and grain and grain:IsA("ImageLabel") then
			-- 원래 인쇄 글자와 아이콘 층은 유지하고 기존 재질만 9분할 원화로 바꾼다.
			grain.Image = "rbxassetid://" .. tostring(if selected then tabOn else tabOff)
			grain.ScaleType = Enum.ScaleType.Slice
			grain.SliceCenter = Rect.new(24, 24, 232, 72)
			grain.SliceScale = 0.5
			grain.ImageColor3 = Color3.new(1, 1, 1)
			grain.ImageTransparency = 0
		elseif grain and grain:IsA("ImageLabel") then
			grain.ImageColor3 = if selected then Color3.fromRGB(252, 220, 148) else Color3.fromRGB(138, 111, 78)
			grain.ImageTransparency = if selected then 0.55 else 0.58
		end
		for _, name in { "PressedEdge", "BookRibbon", "BrassRivet" } do
			local decoration = b:FindFirstChild(name)
			if decoration then decoration.Visible = false end
		end
		local ti = H.TAB_ICON[id]
		if ti then
			-- [공통 규격] 도크는 40px, 시설별 탭은 26px. 아이콘과 인쇄 글자를 겹치지 않게 나눈다.
			local atlas = H.hasIconArt(id)
			local icon = modelIcon(b, if atlas then "FacilityArt" else ti[1], if atlas then id else ti[2], nil, 32, TAB_NAME[id])
			icon.Name = "TabIcon"
			-- [시설 탭 최초 배치] 화면 크기 갱신 전에 생성된 아이콘도 현재 모바일 규격을 따른다.
			icon.Position = if compactTabs then UDim2.new(0.5, -16, 0, 3) else UDim2.new(0, 7, 0.5, -16)
			icon.ClipsDescendants = true
			icon.ZIndex = b.ZIndex + 2
			icon.Parent = b
			-- [청동 원형 테두리] HUD와 탭 모두 같은 원화·둥근 금속 테두리로 통일한다.
			local round = Instance.new("UICorner")
			round.CornerRadius = UDim.new(1, 0)
			round.Parent = icon
			local rim = Instance.new("UIStroke")
			rim.Name = "TabIconRim"
			rim.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
			rim.Thickness = 1.5
			rim.Color = if selected then UI_BRASS_DARK else UI_BRASS
			rim.Transparency = if selected then 0.12 else 0.55
			rim.Parent = icon
			-- [아이콘 일관성] 원화 아틀라스와 기존 황동 도형 모두 같은 15% 선택 확대를 쓴다.
			-- UIScale은 버튼의 클릭 영역·스크롤 탭 크기·원본 이미지 자산을 바꾸지 않는다.
			local iconScale = Instance.new("UIScale")
			iconScale.Name = "TabIconScale"
			iconScale.Scale = 1
			iconScale.Parent = icon
			b.MouseEnter:Connect(function()
				if not motionSettings.ReducedMotionEnabled then
					motionService:Create(iconScale, TweenInfo.new(0.16, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), {
						Scale = 1.1,
					}):Play()
				end
			end)
			b.MouseLeave:Connect(function()
				if iconScale.Parent then
					motionService:Create(iconScale, TweenInfo.new(0.18, Enum.EasingStyle.Sine, Enum.EasingDirection.Out), {
						Scale = 1,
					}):Play()
				end
			end)
			if selected and not motionSettings.ReducedMotionEnabled then
				motionService:Create(iconScale, TweenInfo.new(0.2, Enum.EasingStyle.Sine, Enum.EasingDirection.Out, 0, true), {
					Scale = 1.15,
				}):Play()
			end
			local caption = b:FindFirstChild("PrintedCaption")
			if caption and caption:IsA("TextLabel") then
				caption.Text = H.TAB_CAPTION[id] or TAB_NAME[id]
				caption.TextColor3 = b.TextColor3
				caption.Position = if compactTabs then UDim2.fromOffset(4, 36) else UDim2.fromOffset(45, 0)
				caption.Size = if compactTabs then UDim2.new(1, -8, 0, 18) else UDim2.new(1, -51, 1, -4)
				caption.TextWrapped = false
				caption.TextScaled = true
				caption.TextXAlignment = if compactTabs then Enum.TextXAlignment.Center else Enum.TextXAlignment.Left
				local textLimit = Instance.new("UITextSizeConstraint")
				textLimit.MinTextSize = 13
				textLimit.MaxTextSize = if compactTabs then 14 else 17
				textLimit.Parent = caption
			else
				b.TextXAlignment = Enum.TextXAlignment.Right
				b.TextSize = 14
			end
		end
		if selected then
            -- [선택한 책갈피] 황동 가장자리와 얇은 가죽 표식을 더해 색면 없이 위치를 구분한다.
            local border = b:FindFirstChildOfClass("UIStroke")
            if border then border.Color = UI_BRASS_DARK; border.Thickness = 2.5 end
		else
			local border = b:FindFirstChildOfClass("UIStroke")
			if border then border.Color = Color3.fromRGB(205, 163, 93); border.Thickness = 1.6 end
		end
		-- [선택 띠 재사용] 모든 탭에 한 번 만들고 선택 시 보이기만 전환한다.
		local rule = Instance.new("Frame")
		rule.Name = "ActiveTabRule"
		rule.BackgroundColor3 = UI_BRASS_DARK
		rule.BorderSizePixel = 0
		rule.Position = UDim2.new(0, 8, 1, -4)
		rule.Size = UDim2.new(1, -16, 0, 3)
		rule.ZIndex = b.ZIndex + 3
		rule.Visible = selected
		rule.Parent = b
	end
	H.renderedTabGroup = g.name
	H.renderedTabId = currentTab
end

-- 모든 시설 창 오른쪽 위 모서리의 × 닫기 버튼
H.closeX = Instance.new("TextButton")
H.closeX.Name = "CloseX"
H.closeX.AnchorPoint = Vector2.new(1, 0)
H.closeX.Position = UDim2.new(1, -8, 0, 8)
H.closeX.Size = UDim2.fromOffset(44, 44)
H.closeX.BackgroundColor3 = COLORS.leather
H.closeX.Text = "×"
H.closeX.Font = Enum.Font.GothamBold
H.closeX.TextSize = 30
H.closeX.TextColor3 = Color3.fromRGB(255, 244, 214)
H.closeX.AutoButtonColor = true
H.closeX.ZIndex = 30
H.closeX.Parent = mainInner
if H.facilityIconAtlas then
	local icon = modelIcon(H.closeX, "FacilityArt", "close", nil, 22, "닫기")
	icon.AnchorPoint = Vector2.new(0.5, 0.5)
	icon.Position = UDim2.fromScale(0.5, 0.5)
	icon.ZIndex = H.closeX.ZIndex + 1
	H.closeX.TextTransparency = 1
end
corner(H.closeX, 8)
hudStroke(H.closeX, 1.5)
H.closeX.Activated:Connect(function()
	Sfx.play("sfx_click")
	main.Visible = false
	menuToggle.Visible = true
end)

-- 3D 항구 장면: 항구나 배가 바뀔 때만 다시 만든다
syncScene = function()
	if not PortScene then return end -- 메뉴·저장 상태는 3D 항구 준비와 무관하게 정상 응답한다.
	if sceneHold or inField then
		return -- 항해 중·지상 탐험 중에는 항구 장면을 다시 짓거나 캐릭터를 항구로 되돌리지 않는다
	end
	-- [시작 로딩 단축] 첫 장면 모델만 최대 5초 기다리고 기존 항구를 만든다.
	-- 전체 모델 수입 종료 후 현재 항구를 한 번 갱신하며 메뉴·저장·항해는 기다리지 않는다.
	local RS = game:GetService("ReplicatedStorage")
	if not H.assetWaitDone then
		if not assetWaitStarted then
			assetWaitStarted = true
			task.spawn(function()
				local t0 = os.clock()
				while not RS:GetAttribute("MareAssetsReady") and os.clock() - t0 < 5 and player.Parent do
					task.wait(0.2)
				end
				if not player.Parent then return end
				local assetsSettled = RS:GetAttribute("MareAssetsSettled") == true
				H.assetWaitDone = true
				sceneKey = nil
				if view and not sceneHold and not inField then
					syncScene()
				end
				if not assetsSettled then
					-- 초기 준비가 먼저 끝나도 전체 수입 종료까지 한 번만 기다린다.
					-- 출항·탐험 중 장면을 빼앗지 않고 다음 항구 진입에서 최신 모델을 사용한다.
					while not RS:GetAttribute("MareAssetsSettled") and player.Parent do
						task.wait(0.5)
					end
					if player.Parent and RS:GetAttribute("MareAssetsSettled") and view then
						sceneKey = nil
						if not sceneHold and not inField then
							syncScene()
						end
					end
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
	-- [종합 발전도로 마을 단계 · 2026-11-29 오너: "경제·건축·발전·연구 모두 연결돼 있지 않아? 항구마다"]
	-- 예전엔 마을 크기를 항구 투자 레벨(view.harbor.level)만으로 정했다. 서버 종합 발전도(Village.portDev:
	-- 투자 5점 + 지은 건물 단계 3점 + 항구 연구 2점 + 특수 건축물 4점)는 장면 단계에 반영되지 않았다.
	-- 이제 둘 중 큰 값(최대 5)을 쓴다. 투자만 한 항구는 그대로, 건축·연구·상징물로 키운 항구도 커진다.
	local investLevel = (view.harbor and view.harbor.level) or 1
	local devHere = view.village and view.village.here
	local devLevel = devHere and tonumber(devHere.level) or 0
	local portLevel = math.clamp(math.max(investLevel, devLevel), 1, 5)
	-- 발전도가 오르면 마을이 바로 바뀌지 않고, 공사 기간(일꾼이 짓는 모습)을 거친 뒤 새 단계로 바뀐다
	H.shownLv = H.shownLv or {}
	H.buildDue = H.buildDue or {}
	local shownLv = H.shownLv[p.portId]
	if shownLv == nil or portLevel < shownLv then
		shownLv = portLevel
		H.shownLv[p.portId] = portLevel
	end
	local construction = nil
	-- [건축 시뮬] 플레이어가 지은 건물의 공사 기간에는 공사장(비계·일꾼)과 진행 공정을 보여 준다.
	local proj = view and view.buildProjects and view.buildProjects[1]
	if proj then
		construction = { to = portLevel, seconds = 0, progress = proj.progress, label = proj.name, paused = proj.paused ~= nil }
	end
	H.buildCelebrate = view and view.buildCelebrate or nil
	if portLevel > shownLv then
		local secs = math.clamp(40 * (portLevel - shownLv), 40, 120)
		construction = { to = portLevel, seconds = secs }
		if not H.buildDue[p.portId] then
			H.buildDue[p.portId] = true
			local pid = p.portId
			task.delay(secs, function()
				H.buildDue[pid] = nil
				H.shownLv[pid] = nil -- 다음 동기화에서 현재 단계로 확정
				-- [항구 중복 생성 방지] 다른 항구의 공사 완료는 그 항구를 다시 방문할 때 반영한다.
				if view and view.player and view.player.portId == pid then
					sceneKey = nil
					if syncScene then pcall(syncScene) end
				end
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
		-- [시설 자동 확장] 선술집 신축 및 경제 회복/침체 경계에서만 마을 건축 갱신.
		math.floor(math.sqrt(math.max(0, bld.tavern or 0))),
		if (tonumber(sim and sim.prosperity) or 100) >= 90 then "P1" else "P0",
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
	-- [분할 생성 재진입 방지] 기존 키와 같더라도 생성 중에는 최신 상태 확인을 예약한다.
	-- A→B 생성 중 다시 A로 돌아오면 이전 A의 키만 보고 갱신을 누락하지 않는다.
	if H.portBuilding then
		H.portBuildPending = true
		return
	end
	if key == sceneKey then
		if sceneCtl and sceneCtl.setDay then sceneCtl.setDay(p.day) end
		return
	end
	workspace:SetAttribute("PortMood", sim and sim.mood or "steady")
	H.portBuilding = true
	H.portBuildPending = false
	-- [상태 갱신과 장면 생성 분리] 분할 생성(약 6.5초)을 호출한 쪽이 끝까지 기다리면 State 갱신·탭 전환 같은
	-- 같은 스레드의 다음 동작이 그동안 막혔다(정밀검사 233단계 4초 대기 초과 반복: 44980792550, 44980939526).
	-- 생성은 별도 스레드에서 진행하고, 재진입은 기존 portBuilding/portBuildPending 장치가 막는다.
	task.spawn(function()
	-- [항구 전환 체감 시간] 생성 시간만이 아니라 첫 화면 표시·실제 조작 가능 시점을 따로 잰다.
	local transitionStart = os.clock()
	local timing = H.measurePortTransition(transitionStart, p.portId)
	local ok, res = pcall(PortScene.build, {
		portId = p.portId,
		portName = p.portName,
		level = portLevel,
		construction = construction,
		celebrate = H.buildCelebrate, -- [완공 축하] 최근 완공 건물: 깃발·축하 인파
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
	}, function(tab, facility)
		-- [방문 단일화] 건물·HUD 이동은 동일한 탭 함수를 사용한다. 건물명만 UI에 전달한다.
		if TAB_NAME[tab] then openTab(tab, nil, facility) end
	end)
	H.portBuilding = false
	timing.buildEnd = os.clock()
	if H.portBuildPending then
		-- 생성 중 들어온 갱신은 최신 view로 다시 맞춘다. 같은 열쇠면 곧바로 끝난다.
		H.portBuildPending = false
		task.defer(function() if syncScene then syncScene() end end)
	end
	if not ok then
		warn("[Game] 항구 장면 오류", res)
		if H.portLoadingLabel then H.portLoadingLabel.Text = "항구 준비 오류 · 다시 접속해 줘." end
		return
	end
	local postStart = os.clock()
	sceneKey = key
	sceneCtl = res.controls
	arriveNext = false
	sceneSpawn = res.spawn
	applyView()
	-- [준비 완료] 실제 항구가 설치된 뒤에만 시작 배경을 닫는다.
	if H.setTitleMode then H.setTitleMode(not view or newGameMode) end
	-- [멈춤 원인 실측] 생성 직후 화면 적용(카메라·UI) 구간도 따로 잰다.
	workspace:SetAttribute("PortPostBuildMs", math.floor((os.clock() - postStart) * 1000))
	end)
end

-- [항구 전환 체감 시간] 생성(빌드)·첫 화면·조작 가능 시점을 각각 기록한다.
-- 빌드가 메인 스레드를 막는 동안에는 Heartbeat가 오지 않으므로 첫 Heartbeat 간격이 실제 멈춤 시간이다.
-- 조작 가능 = 첫 화면 뒤 프레임 간격이 100ms 미만으로 돌아온 첫 시점. 출력 로그는 남기지 않고 속성만 쓴다.
-- 분할 생성 중에는 기존 항구가 보이고 입력도 처리되므로, 측정은 생성 시작부터 한다.
-- buildMs = 새 항구 생성 완료, firstFrameMs = 새 항구가 처음 그려진 프레임, inputReadyMs = 시작 후 프레임 간격이 처음 100ms 미만,
-- maxStallMs = 전환 전체에서 가장 긴 멈춤.
function H.measurePortTransition(startedAt: number, portId: string)
	local timing = { buildEnd = nil :: number?, stallAt = nil :: number?, stallPhase = nil :: string? }
	local last = startedAt
	local firstFrameAt: number? = nil
	local readyAt: number? = nil
	local maxStall = 0
	local conn
	conn = RunService.Heartbeat:Connect(function()
		local now = os.clock()
		local dt = now - last
		last = now
		if dt > maxStall then
			maxStall = dt
			-- [최장 멈춤 위치] 시작 후 몇 ms에, 생성 중/후 어느 단계에서 났는지 남긴다.
			timing.stallAt = math.floor((now - startedAt) * 1000)
			timing.stallPhase = if timing.buildEnd then (if now - timing.buildEnd < 0.5 then "afterBuild" else "late") else "duringBuild"
		end
		if not readyAt and dt < 0.1 then readyAt = now end
		if timing.buildEnd and not firstFrameAt then firstFrameAt = now end
		local buildEnd = timing.buildEnd
		if (buildEnd and firstFrameAt and readyAt and now - startedAt > 3) or now - startedAt > 30 then
			conn:Disconnect()
			buildEnd = buildEnd or now
			workspace:SetAttribute("PortTransitionBuildMs", math.floor((buildEnd - startedAt) * 1000))
			workspace:SetAttribute("PortTransitionFirstFrameMs", math.floor(((firstFrameAt or now) - startedAt) * 1000))
			workspace:SetAttribute("PortTransitionInputReadyMs", if readyAt then math.floor((readyAt - startedAt) * 1000) else -1)
			workspace:SetAttribute("PortTransitionMaxStallMs", math.floor(maxStall * 1000))
			workspace:SetAttribute("PortTransitionStallAt", tostring(timing.stallAt) .. "ms:" .. tostring(timing.stallPhase))
			workspace:SetAttribute("PortTransitionPort", portId)
			workspace:SetAttribute("PortTransitionSeq", (workspace:GetAttribute("PortTransitionSeq") or 0) + 1)
		end
	end)
	return timing
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
				-- [전경] 실제 항구 바닥에 맞춘 캐릭터를 고정한다.
				H.placeCharacterOnSpawn(char)
			end
		else
			camera.CameraType = Enum.CameraType.Custom
			camera.FieldOfView = 70
			local hum = char and char:FindFirstChildOfClass("Humanoid")
			if hum then
				camera.CameraSubject = hum
			end
			if char and root and sceneSpawn then
				-- [걷기] 발을 지면에 맞춘 뒤 이동을 복구한다.
				H.placeCharacterOnSpawn(char)
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
					H.placeCharacterOnSpawn(char)
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
	-- [원더/유적 모바일 액자] 16:9 그림은 유지하되 화면 세로 높이에서 제목·건너뛰기·자막 공간을 먼저 확보한다.
	-- 큰 액자를 94% 화면에 곧장 확대하면 가로로 짧은 휴대폰에서 상하가 잘리고 터치 글씨와 겹친다.
	local frame = Instance.new("Frame")
	frame.AnchorPoint = Vector2.new(0.5, 0.5)
	frame.Position = UDim2.fromScale(0.5, 0.5)
	frame.Size = UDim2.fromOffset(0, 0)
	frame.BackgroundColor3 = Color3.fromRGB(236, 222, 190)
	frame.BackgroundTransparency = 0
	frame.ZIndex = 101
	frame.ClipsDescendants = true
	frame.Parent = root
	local function fitWonderArt()
		local screen = root.AbsoluteSize
		if screen.X <= 0 or screen.Y <= 0 then return end
		local height = math.max(1, math.min(screen.X * 0.94 * 9 / 16, screen.Y - 180))
		frame.Size = UDim2.fromOffset(math.floor(height * 16 / 9), math.floor(height))
	end
	local artResize = root:GetPropertyChangedSignal("AbsoluteSize"):Connect(fitWonderArt)
	fitWonderArt()
	local fstroke = Instance.new("UIStroke")
	fstroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	fstroke.Thickness = 3
	fstroke.Color = Color3.fromRGB(212, 168, 74)
	fstroke.Parent = frame
	-- [원더/유적 이미지] 실제 등록된 원화 ID를 직접 로드해야 썸네일 자리표시자로 깨지지 않는다.
	local image = "rbxassetid://" .. tostring(assetId)
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
	cap.Position = UDim2.new(0.5, 0, 1, -8)
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
	ttl.Position = UDim2.new(0.5, 0, 0, 32)
	ttl.Size = UDim2.new(0.9, 0, 0, 40)
	ttl.BackgroundTransparency = 1
	ttl.TextTransparency = 1
	ttl.TextColor3 = Color3.fromRGB(246, 214, 120)
	ttl.TextStrokeTransparency = 1
	ttl.Font = Enum.Font.GothamBold
	ttl.TextSize = 28
	-- [긴 유적 이름] 세로 화면에서도 제목이 액자를 벗어나지 않게 글자만 화면 너비에 맞춘다.
	ttl.TextScaled = true
	local titleLimit = Instance.new("UITextSizeConstraint")
	titleLimit.MinTextSize = 14
	titleLimit.MaxTextSize = 28
	titleLimit.Parent = ttl
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
		artResize:Disconnect()
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
	H.openingPending = true -- 시작 응답을 기다리는 사이 카드 창이 겹치지 않도록 선점한다.
	sceneHold = true -- 오프닝이 끝날 때까지 마을 장면을 먼저 짓지 않는다
	local result = call("NewGame", { nationId = chosenNation, startYear = chosenYear, origin = H.chosenOrigin, restart = restart, room = H.roomMode == true })
	if not (result and result.ok) then
		sceneHold = false
		H.openingPending = false
	end
	if not (result and result.ok) and restart then
		newGameMode = true
		render()
	end
	-- 프롤로그 없이 곧바로 시작 항구에서 시작한다 (플레이어는 3인칭 이야기 속 새 선장)
	if result and result.ok then
		arriveNext = false
		sceneKey = nil
		-- [새 항해] 이전 항구 스폰을 재사용해 공중에 나타나는 일을 막는다.
		sceneSpawn = nil
		if player.Character then H.placeCharacterOnSpawn(player.Character) end
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
	local root = mkBox(titleGui, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(54, 38, 27))
	root.ClipsDescendants = true
	-- [바닥 준비 대기] 원본 표지 배경 위에 상태만 표시한다. 새 화면·우회 로딩 파이프라인은 만들지 않는다.
	H.portLoadingLabel = Instance.new("TextLabel")
	H.portLoadingLabel.Name = "PortLoadingMessage"
	H.portLoadingLabel.AnchorPoint = Vector2.new(0.5, 0.5)
	H.portLoadingLabel.Position = UDim2.fromScale(0.5, 0.55)
	H.portLoadingLabel.Size = UDim2.new(0.84, 0, 0, 58)
	H.portLoadingLabel.BackgroundColor3 = Color3.fromRGB(42, 32, 25)
	H.portLoadingLabel.BackgroundTransparency = 0.16
	H.portLoadingLabel.Text = "항구를 준비하는 중..."
	H.portLoadingLabel.TextColor3 = Color3.fromRGB(247, 220, 172)
	H.portLoadingLabel.TextScaled = true
	H.portLoadingLabel.TextWrapped = true
	H.portLoadingLabel.Font = Enum.Font.Antique
	H.portLoadingLabel.ZIndex = 20
	H.portLoadingLabel.Visible = false
	H.portLoadingLabel.Parent = root
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

	local shade = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(41, 28, 21), 0.28)
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
	local curtain = mkBox(root, UDim2.fromScale(0, 0), UDim2.fromScale(1, 1), Color3.fromRGB(36, 25, 19), 1)
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
				-- [표지 배] 원본 이미지는 유지하고, 빠른 떨림 대신 긴 파도와 미세한 수평 이동만 적용한다.
				local slowWave = t * 0.48
				local pitch = math.sin(slowWave - 0.68) * 0.72 + math.sin(t * 0.29) * 0.15
				local drift = math.sin(t * 0.23) * math.min(18, ship.AbsoluteSize.X * 0.034)
				local pivotShift = math.sin(math.rad(pitch)) * ship.AbsoluteSize.Y * 0.34
				local bob = math.sin(t * 0.76) * waveHeight * 0.68 + math.sin(t * 0.41 + 0.8) * waveHeight * 0.22
				ship.Position = UDim2.fromOffset(shipX + drift + pivotShift, shipY + bob)
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
	local previousScroll = titleScroll.CanvasPosition.Y
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

	-- [첫 화면 단일화] 저장된 항해와 새 항해 준비를 기존 표지의 같은 페이지에서 선택한다.
	local setupOpen = not view or newGameMode or H.titleSetupOpen
	if view then
		local current = view.player
		tLabel(titleScroll, string.format("기존 항해 · %s · %d년 · %s코인",
			current.portName, current.year, H.commas(current.coins)), 16, INK_SOFT, false, nxt())
		local firstActions = Instance.new("Frame")
		firstActions.Name = "TitleQuickActions"
		firstActions.BackgroundTransparency = 1
		firstActions.Size = UDim2.new(1, 0, 0, 58)
		firstActions.LayoutOrder = nxt()
		firstActions.ZIndex = 12
		firstActions.Parent = titleScroll
		local resume = mkButton(firstActions, "▶ 이어하기", COLORS.gold, UDim2.new(0.55, -4, 1, 0), function()
			H.titleMenuOpen = false
			H.titleSetupOpen = false
			H.titleConfirmRestart = false
			newGameMode = false
			H.setTitleMode(false) -- [이어하기] 기존 항구가 준비될 때까지는 로딩 표지를 유지한다.
			render()
			menuToggle.Visible = false
		end, true)
		resume.Position = UDim2.new(0, 0, 0, 0)
		resume.ZIndex = 13
		local prepare = mkButton(firstActions, if setupOpen then "설정 접기" else "＋ 새 항해", COLORS.blue, UDim2.new(0.45, -4, 1, 0), function()
			H.titleSetupOpen = not setupOpen
			newGameMode = H.titleSetupOpen
			H.titleConfirmRestart = false
			renderTitle()
		end, true)
		prepare.Position = UDim2.new(0.55, 4, 0, 0)
		prepare.ZIndex = 13
		if not setupOpen then
			tLabel(titleScroll, "새 항해를 준비해도 기존 기록은 출항 확인 전까지 유지돼.", 15, INK_SOFT, false, nxt())
		end
	end
	local optionRow = Instance.new("Frame")
	optionRow.Name = "TitleControls"
	optionRow.BackgroundTransparency = 1
	optionRow.Size = UDim2.new(1, 0, 0, 46)
	-- [표제지 동선] 새 항해에서는 출신·나라·출항을 설정과 음악보다 먼저 보여 준다.
	optionRow.LayoutOrder = if setupOpen then 1000 else nxt()
	optionRow.ZIndex = 12
	optionRow.Parent = titleScroll
	local settings = mkButton(optionRow, "설정", COLORS.paper, UDim2.new(0.5, -4, 1, 0), openOptions, true)
	settings.ZIndex = 13
	local music
	music = mkButton(optionRow, if Sfx.state() then "음악 켜짐" else "음악 꺼짐", COLORS.paper,
		UDim2.new(0.5, -4, 1, 0), function()
			Sfx.setMusicEnabled(not Sfx.state())
			music.Text = if Sfx.state() then "음악 켜짐" else "음악 꺼짐"
		end, true)
	music.Position = UDim2.new(0.5, 4, 0, 0)
	music.ZIndex = 13
	if not setupOpen then
		titleScroll.CanvasPosition = Vector2.new(0, previousScroll)
		return
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
		st.Color = if selected then UI_BRASS_DARK else Color3.fromRGB(151, 114, 75)
        st.Parent = card
        -- [나라 선택] 현재 페이지의 황동 책갈피. 국기·이름·항구 글씨는 보존.
        if selected then
            local mark = Instance.new("Frame")
            mark.Name = "SelectedNationBookmark"
            mark.BackgroundColor3 = UI_BRASS_DARK
            mark.BorderSizePixel = 0
            mark.Position = UDim2.new(0, 5, 1, -5)
            mark.Size = UDim2.new(1, -10, 0, 3)
            mark.ZIndex = 16
            mark.Parent = card
        end
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
			bst.Color = if sel then UI_BRASS_DARK else Color3.fromRGB(151, 114, 75)
            bst.Parent = b
            -- [집안 선택] 나라 선택과 같은 책갈피 사용.
            if sel then
                local mark = Instance.new("Frame")
                mark.Name = "SelectedOriginBookmark"
                mark.BackgroundColor3 = UI_BRASS_DARK
                mark.BorderSizePixel = 0
                mark.Position = UDim2.new(0, 5, 1, -5)
                mark.Size = UDim2.new(1, -10, 0, 3)
                mark.ZIndex = 15
                mark.Parent = b
            end
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
			local n3 = mkLabel(b, "⚔ 주: " .. originWeapon.name .. " · 보조: " .. Weapons.originSidearm(o.id, chosenYear).name, 16, INK, true)
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
			tLabel(titleScroll, "탐험 2무기: " .. initialWeapon.name .. " ↔ " .. Weapons.originSidearm(H.chosenOrigin, chosenYear).name .. " · 전투 중 교체", 19, INK, true, nxt())
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

	-- [새 항해 출항] 저장된 기록이 있으면 기존 확인 절차를 같은 화면의 버튼에서 수행한다.
	if view then
		tLabel(titleScroll, "주의 · 새 항해를 출항하면 현재 저장 기록을 교체해.", 16, COLORS.red, true, nxt())
	end
	local go = mkButton(titleScroll,
		if view and H.titleConfirmRestart then "기존 기록 교체 · 출항 확인"
			elseif view then "⚓ 새 항해 출항" else "⚓ 출항하기",
		if view and H.titleConfirmRestart then COLORS.red else COLORS.gold,
		UDim2.new(1, 0, 0, 62), function()
			if view and not H.titleConfirmRestart then
				H.titleConfirmRestart = true
				renderTitle()
				return
			end
			H.titleMenuOpen = false
			H.titleSetupOpen = false
			H.titleConfirmRestart = false
			H.startNewGame()
		end, true)
	go.LayoutOrder = nxt()
	go.ZIndex = 13
	go.TextSize = 22
	go.TextColor3 = INK
	-- 선택 항목을 바꿔 다시 그려도 사용자가 보던 위치를 유지한다.
	task.defer(function()
		if titleScroll.Parent then
			titleScroll.CanvasPosition = Vector2.new(0, previousScroll)
		end
	end)
end

H.wasTitle = false
H.titleMenuOpen = false
H.titleSetupOpen = false -- 이어하기와 새 항해 준비를 같은 화면에서 펼친다.
H.titleConfirmRestart = false -- 기존 진행 데이터 교체는 출항 버튼 재확인 후에만 진행한다.
function H.setTitleMode(on)
	-- [공중 캐릭터 방지] 서버 스냅샷만 왔다고 3D 항구가 준비된 것은 아니다.
	local waitingPort = view ~= nil and not inField and sceneSpawn == nil and not on and not H.titleMenuOpen
	local titleVisible = on or H.titleMenuOpen
	-- [항구 시작] 표지·메뉴·항구 준비 중 하나를 노출해 로딩 중 공중 캐릭터가 보이지 않게 한다.
	titleGui.Enabled = on or H.titleMenuOpen or waitingPort
	titlePanel.Visible = titleVisible
	if H.portLoadingLabel then H.portLoadingLabel.Visible = waitingPort and not H.titleMenuOpen end
	local currentCamera = workspace.CurrentCamera
	local screen = if currentCamera then currentCamera.ViewportSize else Vector2.new(1280, 720)
	local portrait = screen.Y > screen.X
	titlePanel.AnchorPoint = if portrait then Vector2.new(0.5, 1) else Vector2.new(1, 0.5)
	titlePanel.Position = if portrait then UDim2.new(0.5, 0, 1, -8) else UDim2.new(1, -14, 0.5, 0)
	titlePanel.Size = if portrait then UDim2.new(0.94, 0, 0.70, 0) else UDim2.new(0.58, 0, 1, -28)
	if titleVisible then
		main.Visible = false
	elseif H.wasTitle then
		main.Visible = true
	end
	H.wasTitle = titleVisible
end

-- [긴 설명 접기 · 2026-11-28 오너: "메뉴창 등 긴 설명 표시 다 → 직관적 시각적 표현으로"]
-- 메뉴 본문을 다 그린 뒤 한 번: 64자 넘는 본문 설명은 첫 문장(최대 40자) + ⓘ 로 줄이고,
-- 누르면 작은 말풍선에 항목별(•) 전체 설명을 보여 준다. 제목·숫자·버튼·도감 본문·대화·이야기 장면은 건드리지 않는다.
do
	local SKIP_ANCESTOR = { "Dex", "Story", "Talk", "Dialogue", "Article", "Encyclopedia", "Cinema", "Recap",
		"QuestResult", "Haggle", "Coach", "FullTextPopup", "Title", "Epilogue", "Prologue" }
	local function ulen(s) return utf8.len(s) or #s end
	local function usub(s, n)
		local i = utf8.offset(s, n + 1)
		return if i then string.sub(s, 1, i - 1) else s
	end
	function H.shortText(s, n)
		s = tostring(s or "")
		local first = string.split(s, "\n")[1]
		local stop = string.find(first, "[%.!?] ") -- lint:ok (문장 끝 패턴 의도)
		if stop and ulen(string.sub(first, 1, stop)) <= n then first = string.sub(first, 1, stop) end
		if ulen(first) > n then
			local parts = string.split(first, " · ")
			if #parts >= 2 and ulen(parts[1] .. " · " .. parts[2]) <= n then first = parts[1] .. " · " .. parts[2]
			elseif ulen(parts[1]) <= n then first = parts[1]
			else first = usub(first, n - 1) .. "…" end
		end
		return first
	end
	local function skipped(label)
		local node = label.Parent
		while node and node ~= gui do
			for _, k in SKIP_ANCESTOR do
				if string.find(node.Name, k, 1, true) then return true end
			end
			node = node.Parent
		end
		return false
	end
	function H.showFullText(anchor, text)
		local old = gui:FindFirstChild("FullTextPopup")
		if old then old:Destroy() end
		local lines = {}
		for _, line in string.split(tostring(text), "\n") do
			for _, part in string.split(line, " · ") do
				if part ~= "" then table.insert(lines, "• " .. part) end
			end
		end
		local pop = Instance.new("TextButton")
		pop.Name = "FullTextPopup"
		pop.AutoButtonColor = false
		pop.ZIndex = 60
		pop.BackgroundColor3 = Color3.fromRGB(40, 31, 24)
		pop.BackgroundTransparency = 0.04
		pop.Font = Enum.Font.GothamMedium
		pop.TextSize = 16
		pop.TextColor3 = Color3.fromRGB(250, 236, 206)
		pop.TextWrapped = true
		pop.TextXAlignment = Enum.TextXAlignment.Left
		pop.TextYAlignment = Enum.TextYAlignment.Top
		pop.Text = table.concat(lines, "\n")
		local w = math.clamp(anchor.AbsoluteSize.X, 260, 420)
		local size = game:GetService("TextService"):GetTextSize(pop.Text, 16, pop.Font, Vector2.new(w - 24, 2000))
		local view = gui.AbsoluteSize
		local x = math.clamp(anchor.AbsolutePosition.X, 8, math.max(8, view.X - w - 8))
		local y = anchor.AbsolutePosition.Y + anchor.AbsoluteSize.Y + 4
		if y + size.Y + 24 > view.Y - 8 then y = math.max(8, anchor.AbsolutePosition.Y - size.Y - 28) end
		pop.Position = UDim2.fromOffset(x, y)
		pop.Size = UDim2.fromOffset(w, size.Y + 22)
		local pad = Instance.new("UIPadding")
		pad.PaddingLeft, pad.PaddingRight, pad.PaddingTop = UDim.new(0, 12), UDim.new(0, 12), UDim.new(0, 10)
		pad.Parent = pop
		corner(pop, 10)
		local st = Instance.new("UIStroke")
		st.Color = Color3.fromRGB(214, 170, 82)
		st.Thickness = 1.5
		st.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
		st.Parent = pop
		pop.Parent = gui
		pop.Activated:Connect(function() pop:Destroy() end)
		task.delay(8, function() if pop.Parent then pop:Destroy() end end)
	end
	-- 짧은 줄 여러 개(시세표·목록)는 설명이 아니라 자료라서 그대로 둔다.
	local function isList(text)
		local lines = string.split(text, "\n")
		if #lines < 3 then return false end
		local total = 0
		for _, line in lines do total += ulen(line) end
		return total / #lines < 32
	end
	-- [청동 아이콘 통일 · 2026-11-28 오너: "메뉴창 아이콘 통일한 거 맞아?" → 아니었음]
	-- 메뉴 글자 맨 앞 이모지를 승인 청동 아이콘 시트 칸으로 바꾼다. 맞는 칸이 없으면 이모지만 지운다.
	-- 상태 점(🔴🟡🟢)·등급 별(★★★)·펼침 표시(▸▾)는 뜻이 있어 그대로 둔다.
	local EMOJI_ICON = {
		["▶"] = "nextstep", ["★"] = "recommend", ["🎁"] = "reward", ["🔒"] = "lock", ["⚓"] = "harbor",
		["📜"] = "quest", ["⚔"] = "war", ["⛵"] = "nav", ["📦"] = "cargo", ["📖"] = "codex", ["🗺"] = "map",
		["💡"] = "coach", ["⚠"] = "defeat", ["🔧"] = "shipyard", ["🌊"] = "nav", ["🏳"] = "diplomacy",
		["📍"] = "map_pin", ["⏳"] = "chapter", ["🔖"] = "journal", ["💰"] = "coin", ["🍞"] = "supply",
		["⚙"] = "gear", ["✦"] = false, ["💎"] = "fame", ["♛"] = "fame",
	}
	function H.bronzeEmoji(root)
		local n = 0
		for _, d in root:GetDescendants() do
			if (d:IsA("TextLabel") or d:IsA("TextButton")) and not d.RichText and not d:GetAttribute("BronzeDone") then
				local text = d.Text
				local first, rest = nil, nil
				for e in EMOJI_ICON do
					local len = #e
					if string.sub(text, 1, len) == e and string.sub(text, len + 1, len + 1) == " " then
						first, rest = e, string.sub(text, len + 2)
						break
					end
				end
				if first and rest ~= "" then
					d:SetAttribute("BronzeDone", true)
					d.Text = rest
					local key = EMOJI_ICON[first]
					if key and d.TextXAlignment == Enum.TextXAlignment.Left and H.hasIconArt(key) then
						local px = math.max(16, d.TextSize + 4)
						local icon = modelIcon(d, "FacilityArt", key, nil, px, rest)
						icon.Name = "BronzeEmojiIcon"
						icon.AnchorPoint = Vector2.new(0, 0.5)
						icon.Position = UDim2.new(0, -px - 4, 0.5, 0)
						icon.ZIndex = d.ZIndex + 1
						local pad = d:FindFirstChildOfClass("UIPadding")
						if not pad then
							pad = Instance.new("UIPadding")
							pad.Parent = d
						end
						pad.PaddingLeft = UDim.new(pad.PaddingLeft.Scale, pad.PaddingLeft.Offset + px + 6)
						icon.Position = UDim2.new(0, -px - 4, 0.5, 0)
					end
					n += 1
				end
			end
		end
		return n
	end
	function H.compactLongText(root)
		if not root or currentTab == "codex" or currentTab == "encyclopedia" then return 0 end
		local changed = 0
		for _, d in root:GetDescendants() do
			if d:IsA("TextLabel") and d.Visible and not d.RichText and not d:GetAttribute("CompactDone")
				and d.TextSize <= 19 and ulen(d.Text) > 64 and not isList(d.Text) and not skipped(d) then
				local full = d.Text
				d:SetAttribute("CompactDone", true)
				d:SetAttribute("FullText", full)
				d.Text = H.shortText(full, 40) .. "  ⓘ"
				local hit = Instance.new("TextButton")
				hit.Name = "FullTextHit"
				hit.BackgroundTransparency = 1
				hit.Text = ""
				hit.Size = UDim2.fromScale(1, 1)
				hit.ZIndex = d.ZIndex + 1
				hit.Parent = d
				hit.Activated:Connect(function() H.showFullText(d, full) end)
				changed += 1
			end
		end
		return changed
	end
end

function render()
	-- [시설 메뉴 스크롤] 서버 응답으로 같은 탭을 다시 그릴 때 읽던 위치를 유지한다.
	-- 탭을 바꾸거나 새 게임을 열면 기존처럼 첫 줄부터 시작한다.
	local retainScroll = view ~= nil and not newGameMode and not H.bankVisitPending
		and H.contentRenderedTab == currentTab
		and H.contentRenderedPortId == (view.player and view.player.portId)
		and currentTab ~= "trade" and currentTab ~= "yard"
	local savedScroll = if retainScroll then content.CanvasPosition.Y else 0
	H.contentRenderSerial = (H.contentRenderSerial or 0) + 1
	local renderSerial = H.contentRenderSerial
	order = 0
	H.contextAdviceShown = false
	H.clearContent()
	if not retainScroll then content.CanvasPosition = Vector2.zero end
	if not audioLock then
		Sfx.portMusic(view and view.player and PortData.Ports[view.player.portId],
			view ~= nil and currentTab == "trade")
		if view then
			Sfx.portAmbient(PortData.Ports[view.player.portId])
		end
	end

	H.setTitleMode(not view or newGameMode)
	if not view or newGameMode then
		H.contentRenderedTab = nil
		H.contentRenderedPortId = nil
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

	-- [시설 탭] 선택지가 두 개 이상인 시설에만 공통 탭을 표시한다.
	tabBar.Visible = #groupOf(currentTab).tabs > 1
	H.renderTabs()
	H.renderFacilityGallery()
	H.layoutBook()

	local p, ship = view.player, view.ship
	local grp = groupOf(currentTab)
	local facilityGroup = H.facilityOf(currentTab)
	setPortrait(facilityGroup.name) -- 초상·담당자는 건물(시설) 기준
	-- [중복 이름 제거] 화면 제목에서 조선소·은행·길드 이름을 반복하지 않는다.
	local placeName = H.visitFacility or grp.name
	-- 시설은 제목, 현재 기능은 선택 탭, 항구와 담당자는 보조 줄에서 표시한다.
	local tabName = TAB_NAME[currentTab] or ""
	headerLabel.Text = if #grp.tabs <= 1 and currentTab ~= "yard" and placeName ~= tabName
		then placeName .. " · " .. tabName else placeName
	H.pageDetails.Text = string.format("%s · %s · %s", p.portName, facilityGroup.name, facilityGroup.keeper)
	coinValue.Text = tostring(p.coins)
	H.updateHud(p, ship)
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
	-- [메뉴 첫 줄 · 2026-11-28] 지금 할 일 / 추천 / 보상 받기 3칸 + 처음 해 보는 기능이면 3단계 그림 안내
	-- [중복 안내 제거] 묶음 첫 화면에만 전체 목표 요약을 표시하고 세부 탭은 고유 정보부터 보여 준다.
	if H.menuHomeStrip and (currentTab == grp.tabs[1] or currentTab == "market") then H.menuHomeStrip() end
	if H.firstTimeCoach then H.firstTimeCoach(currentTab) end
	if currentTab == "status" and H.visualStatus then H.visualStatus() end
	-- [오른쪽 상단 판단 정보] 교역소 기준: 실제 서버 값 → 조건 → 실행을 순서대로 읽는다.
	-- 보상·위험·연구 효과·선박 능력은 표시만 하며 기존 규칙과 서버 판정을 바꾸지 않는다.
	local focus = if currentTab == "trade" or currentTab == "yard" or currentTab == "gwent" then nil else H.MENU_FOCUS[currentTab]
	H.menuPrimaryRoute = nil
	if focus then
		local fact, context, urgent = "", "", false
		local actionText = focus[3] or "첫 동작 확인"
		if currentTab == "board" then
			-- [주점] 주점 전용 의뢰가 일지 의뢰와 다르므로 tavernQ의 보상·제한을 표시한다.
			local q = view.tavernQ or {}
			local job = q.active or (q.offer or {})[1]
			if job then
				fact = if job.kind == "event" then "선택 사건 · 결과 확인"
					else string.format("보상 %s코인 · 명성 +%d", H.commas(job.coins or 0), job.fame or 0)
				local grade = if job.shady then "고위험" elseif job.kind == "hunt" then "해전" else "일반"
				local condition = if job.blocked then tostring(job.blocked) elseif q.active then "실행 가능"
					else "수락 가능 · 현재 진행 의뢰 없음"
				context = string.format("%s · 난이도 %s\n조건: %s%s", job.name or "의뢰", grade, condition,
					if q.active and job.left then string.format(" · 남은 %d일", job.left) else "")
				urgent = job.blocked ~= nil or job.shady == true
				actionText = if q.active and job.blocked == nil and job.kind ~= "event" then "진행 중 의뢰 실행"
					else "의뢰 조건·선택 확인"
			else
				fact = string.format("새 일감 %d건", #(q.offer or {}))
				context = "받은 의뢰 없음 · 소문을 듣고 수락 조건과 보상을 확인해."
				actionText = "새 의뢰 찾기"
			end
		elseif currentTab == "quest" then
			local qs = view.quests or {}
			local active = (qs.active or {})[1]
			fact = string.format("진행 중 %d건 · 새 의뢰 %d건", #(qs.active or {}), #(qs.available or {}))
			context = if active then string.format("현재 목표: %s\n난이도 %d/5 · 조건과 보상은 일지에서 확인", active.name or active.summary or "진행 중", tonumber(active.grade) or 1)
				else string.format("완료 기록 %d건 · 다음 의뢰의 보상과 조건 확인", qs.doneCount or 0)
		elseif currentTab == "route" or currentTab == "map" then
			-- [항만청] 가까운 해상 항로의 실제 거리·기간·소모량을 보여 준다.
			local nearest, ready = nil, 0
			for _, r in (view.routes or {}) do
				if not r.locked then
					if not nearest or (r.distanceKm or math.huge) < (nearest.distanceKm or math.huge) then nearest = r end
					if (r.supplies or 0) <= (ship.supplies or 0) and (r.coal or 0) <= (ship.coal or 0) then ready += 1 end
				end
			end
			if nearest then
				fact = string.format("%d km · %d일 · 보급 %d개", nearest.distanceKm or 0, nearest.days or 0, nearest.supplies or 0)
				local safe = (ship.supplies or 0) >= (nearest.supplies or 0) and (ship.coal or 0) >= (nearest.coal or 0)
				local risk = if view.weather and view.weather.id == "storm" then "폭풍 주의"
					elseif view.weather and view.weather.id == "rain" then "비·시야 주의" else "항해 중 해적·돌발 사건 가능"
				context = string.format("가까운 항구 %s · 석탄 %d개 필요\n출항 가능 %d항로 · 현재 석탄 %d · %s",
					nearest.name, nearest.coal or 0, ready, ship.coal or 0, risk)
				urgent = not safe
				H.menuPrimaryRoute = if safe then nearest else nil
				actionText = if safe then "가까운 항구 출항 확인" else "보급 부족 · 항로 확인"
			else
				fact = string.format("출항 가능 %d / %d항로", ready, #(view.routes or {}))
				context = string.format("보급 %d개 · 석탄 %d개", ship.supplies or 0, ship.coal or 0)
				urgent = ready == 0
			end
		elseif currentTab == "recruit" or currentTab == "crew" or currentTab == "status" or currentTab == "yard" then
			-- [선장실] 이미 계산된 배와 동료 배치 수치만 읽어 전력·빈 자리를 강조한다.
			local joined, filled, matched = 0, 0, 0
			for _, c in ((view.companions and view.companions.list) or {}) do
				if c.joined then joined += 1 end
			end
			for _, station in ((view.companions and view.companions.stations) or {}) do
				if station.seatId then
					filled += 1
					if station.matched then matched += 1 end
				end
			end
			fact = string.format("선체 %d/%d · 동료 %d명", ship.hull or 0, ship.maxHull or 0, joined)
			context = string.format("적합 직책 %d/%d · 포 %d문 · 선원 %d명\n보급 %d개",
				matched, filled, ship.cannons or 0, ship.crew or 0, ship.supplies or 0)
			urgent = (ship.maxHull or 0) > 0 and (ship.hull or 0) < (ship.maxHull or 1) * 0.4
			actionText = if currentTab == "crew" or currentTab == "status" then "동료 직책 배치"
				elseif currentTab == "yard" then "조선소 관리 열기" else "동료 영입 조건 확인"
		elseif currentTab == "trade" or currentTab == "harbor" then
			-- 항구 정보 본문과 공통 자금 헤더가 이미 표시하므로 반복 안내는 만들지 않는다.
			fact, context = "", ""
		elseif currentTab == "battle" or currentTab == "war" then
			-- [전투 본부] 적 전력을 공개하지 않은 경우 임의 수치를 만들지 않는다.
			local mission = (view.wars or {})[1]
			local enemy = (view.bosses or {})[1]
			if currentTab == "war" and view.war then
				fact = string.format("진행 %d/%d파도 · 선체 %d/%d", view.war.wave or 0, view.war.total or 0, ship.hull or 0, ship.maxHull or 0)
				context = string.format("상대: %s · 승리: 마지막 파도까지 전부 격파\n패배 시 작전 실패 · 파도 사이 선체 회복 없음", view.war.name or "적 함대")
				actionText = if view.war.next then "다음 파도 전투" else "현재 전투 상태 확인"
			elseif currentTab == "war" and mission then
				fact = string.format("적 함대 %d파도 · 보상 %s코인", mission.waves or 0, H.commas(mission.coins or 0))
				context = string.format("%s · 승리: 전 파도 격파\n수락 조건: %s", mission.name or "해전 의뢰",
					mission.blocked or string.format("전투 Lv.%d 이상", mission.minLevel or 0))
				actionText = "해전 작전 선택"
				urgent = mission.blocked ~= nil
			else
				fact = string.format("대포 %d문 · 선체 %d/%d", ship.cannons or 0, ship.hull or 0, ship.maxHull or 0)
				context = string.format("상대: %s · 적 전력 미공개\n승리: 적 함선 격파 · 출격 전에 선체와 자동스킬 확인",
					if enemy then enemy.name or "해적" else "해적 함선")
				actionText = "사략선 사냥 출격"
			end
			urgent = urgent or ((ship.maxHull or 0) > 0 and (ship.hull or 0) < (ship.maxHull or 1) * 0.4)
		elseif currentTab == "explore" then
			local available = 0
			for _, site in (view.sites or {}) do
				if site.unlocked and (site.left or 0) > 0 then available += 1 end
			end
			fact = string.format("탐험 가능 %d / %d지역", available, #(view.sites or {}))
			context = string.format("보급품 %d개", ship.supplies or 0)
		elseif currentTab == "scholar" or currentTab == "codex" then
			local cx = view.codex or {}
			fact = string.format("지식 발견 %d / %d장", cx.found or 0, cx.total or 0)
			context = string.format("만난 학자 %d명", #(view.scholars or {}))
			if currentTab == "scholar" then
				-- [학자의 서재] 보고 화면에서도 연구 효과·해금 조건을 잊지 않게 연결한다.
				for _, t in (view.tech or {}) do
					if not t.owned then
						context = string.format("연계 연구: %s · %s\n해금: %s", t.name or "기술", t.summary or "연구 효과 확인",
							t.blocked or string.format("비용 %s코인", H.commas(t.cost or 0)))
						break
					end
				end
				actionText = "연구 효과·해금 조건 보기"
			end
		elseif currentTab == "tech" then
			-- [학자의 서재] 실제 연구 요약·필요 선행지식·비용을 우선 보여 준다.
			local researchable, candidate = 0, nil
			for _, t in (view.tech or {}) do
				if not t.owned then
					if not candidate then candidate = t end
					if not t.blocked and (t.cost or 0) <= p.coins then
						researchable += 1
						if not candidate or candidate.blocked then candidate = t end
					end
				end
			end
			fact = string.format("연구 가능 %d개", researchable)
			if candidate then
				local reason = if candidate.blocked then tostring(candidate.blocked)
					elseif (candidate.cost or 0) > p.coins then string.format("코인 %s 부족", H.commas((candidate.cost or 0) - p.coins))
					else string.format("해금 충족 · 비용 %s코인", H.commas(candidate.cost or 0))
				context = string.format("%s 효과: %s\n해금: %s", candidate.name or "연구", candidate.summary or "연구 효과 확인", reason)
				urgent = candidate.blocked ~= nil
			else
				context = "연구 완료"
			end
			actionText = "연구 효과·조건 확인"
		end
		H.menuActionButton.Name = "MenuPrimaryAction_" .. currentTab -- [기존 런타임 QA 이름 계약 유지]
		H.menuActionButton.Text = actionText
		-- [서재 중복 제거] 백과 표지에 발견 진행도가 있으므로 같은 숫자·설명 배너를 다시 넣지 않는다.
		if currentTab ~= "codex" and currentTab ~= "encyclopedia" and currentTab ~= "status" and (fact ~= "" or context ~= "") then
		add(function()
			-- [전 시설 공통 첫 카드] 제목 → 핵심 수치 → 조건 → 정본 실행 버튼 순으로 읽는다.
			local wide = mainInner.AbsoluteSize.X >= 740
			local short = mainInner.AbsoluteSize.Y < 500
			local bannerH = if wide then (if short then 210 else 242) else (if short then 140 else 178)
			local banner = mkBox(content, UDim2.new(), UDim2.new(1, -6, 0, bannerH), Color3.fromRGB(64, 48, 35))
			banner.Name = "MenuFocus_" .. currentTab
			corner(banner, 8)
			local bookmark = Instance.new("Frame")
			bookmark.Name = "MenuFocusBookmark"
			bookmark.BackgroundColor3 = if urgent then WAX else UI_BRASS
			bookmark.BorderSizePixel = 0
			bookmark.Position = UDim2.fromOffset(4, 10)
			bookmark.Size = UDim2.new(0, 5, 1, -20)
			bookmark.Parent = banner
			local tabIcon = H.TAB_ICON[currentTab]
			if tabIcon then
				local atlas = H.hasIconArt(currentTab)
				local icon = modelIcon(banner, if atlas then "FacilityArt" else tabIcon[1], if atlas then currentTab else tabIcon[2], nil, 26, TAB_NAME[currentTab])
				icon.Name = "MenuFocusIcon"
				icon.Position = UDim2.fromOffset(14, 7)
				icon.ZIndex = banner.ZIndex + 1
			end
			local heading = mkLabel(banner, H.TAB_CAPTION[currentTab] or TAB_NAME[currentTab], if wide then 20 else 18, Color3.fromRGB(255, 222, 144), true)
			heading.Name = "MenuFocusHeading"
			heading.Position = UDim2.fromOffset(if tabIcon then 46 else 14, 7)
			heading.Size = UDim2.new(1, if tabIcon then -60 else -28, 0, 26)
			heading.AutomaticSize = Enum.AutomaticSize.None
			heading.TextTruncate = Enum.TextTruncate.AtEnd
			local values = string.split(fact, " · ")
			local metrics = Instance.new("Frame")
			metrics.Name = "MenuFocusValue"
			metrics.BackgroundTransparency = 1
			metrics.Position = UDim2.fromOffset(14, 34)
			metrics.Size = UDim2.new(1, -28, 0, 42)
			metrics.Parent = banner
			local count = #values
			for index, value in values do
				local metric = mkLabel(metrics, value, 18, if urgent then Color3.fromRGB(255, 165, 151) else Color3.fromRGB(255, 238, 187), true)
				metric.AutomaticSize = Enum.AutomaticSize.None
				metric.Position = UDim2.new((index - 1) / count, 2, 0, 0)
				metric.Size = UDim2.new(1 / count, -4, 1, 0)
				metric.BackgroundColor3 = Color3.fromRGB(43, 34, 28)
				metric.BackgroundTransparency = 0
				metric.TextXAlignment = Enum.TextXAlignment.Center
				metric.TextWrapped = true
				metric.TextScaled = true
				local limit = Instance.new("UITextSizeConstraint")
				limit.MinTextSize = 13
				limit.MaxTextSize = 19
				limit.Parent = metric
				corner(metric, 5)
			end
			local explanation = mkLabel(banner, context, if wide then 18 else 17, Color3.fromRGB(249, 232, 207), true)
			explanation.Name = "MenuFocusDescription"
			explanation.Position = UDim2.fromOffset(14, if wide then 88 else 84)
			explanation.Size = UDim2.new(1, -28, 0, if wide then (if short then 59 else 85) else (if short then 49 else 86))
			explanation.TextTruncate = Enum.TextTruncate.AtEnd
			explanation.AutomaticSize = Enum.AutomaticSize.None
			explanation.TextWrapped = true
			explanation.TextYAlignment = Enum.TextYAlignment.Top
			-- [단일 행동] 클릭/검사 이름/서버 호출을 가진 기존 버튼을 이동한다.
			H.menuFocusBanner = banner
			H.layoutBook()
			return banner
		end)
		end
		-- [고정 하단 버튼] 기존 실행 함수를 재사용한다. 출항만 기존 확인 창으로 보낸다.
		H.invokeMenuPrimary = function()
			-- [시설 내 바로가기] 조선소 목록은 기존 스크롤 위치로 안내한다.
			if currentTab == "yard" then
				local target = content:FindFirstChild("YardSectionShips", true)
				if target then
					local y = target.AbsolutePosition.Y - content.AbsolutePosition.Y + content.CanvasPosition.Y - 8
					content.CanvasPosition = Vector2.new(0, math.max(0, y))
				end
				return
			end
			if currentTab == "scholar" then openTab("tech") return end
			if (currentTab == "crew" or currentTab == "status") and H.openCabin then H.openCabin() return end
			if currentTab == "route" and H.menuPrimaryRoute then confirmSail(H.menuPrimaryRoute) return end
			if currentTab == "board" then
				local active = view.tavernQ and view.tavernQ.active
				if active and not active.blocked and active.kind ~= "event" then
					call("TavernJob", { id = active.id })
					return
				end
			end
			if currentTab == "war" and view.war and view.war.next then call("WarNext") return end
			if currentTab == "battle" then call("Hunt") return end
			-- 연구·전투 작전·수락 후보가 여러 개면 플레이어가 목록에서 직접 고른다.
			local tile = content:FindFirstChild("BookTile", true)
			if tile then
				local y = tile.AbsolutePosition.Y - content.AbsolutePosition.Y + content.CanvasPosition.Y - 8
				content.CanvasPosition = Vector2.new(0, math.max(0, y))
			else
				for _, section in content:GetChildren() do
					if section.Name ~= "MenuQuickActions"
						and section.Name ~= "MenuSummaryMetrics" and string.sub(section.Name, 1, 10) ~= "MenuFocus_" then
						local button = section:FindFirstChildWhichIsA("TextButton", true)
						if button and button.Interactable and button.Visible then
							local y = section.AbsolutePosition.Y - content.AbsolutePosition.Y + content.CanvasPosition.Y - 8
							content.CanvasPosition = Vector2.new(0, math.max(0, y))
							break
						end
					end
				end
			end
		end
	else
		H.invokeMenuPrimary = nil
		H.menuActionDock.Visible = false
	end
	-- [시설별 기존 콘텐츠] 교역·조선은 기존 상세 렌더러를 탭 본문에 바로 표시한다.
	-- 서재의 보고·도감·연구·백과는 기존 탭 렌더러를 그대로 사용한다.
	if currentTab == "trade" then
		if not mainInner:FindFirstChild("FacilityDetail") then H.tradeHall() end
	elseif currentTab == "yard" then
		if not mainInner:FindFirstChild("FacilityDetail") then H.yardHall() end
	else
		H.counselRows(1)
		RENDERERS[currentTab]()
		if currentTab == "harbor" and H.bankVisitPending then
			H.bankVisitPending = false
			-- [은행 방문] 실제 건물에서 처음 들어왔을 때만 금융 메뉴로 이동한다.
			task.defer(function()
				-- 실제 UIListLayout이 배치된 다음 은행 섹션 위치를 사용한다.
				game:GetService("RunService").Heartbeat:Wait()
				if currentTab ~= "harbor" or H.visitFacility ~= "은행" then return end
				local bank = content:FindFirstChild("BankEntry")
				if bank then
					local y = bank.AbsolutePosition.Y - content.AbsolutePosition.Y + content.CanvasPosition.Y
					content.CanvasPosition = Vector2.new(0, math.max(0, y - 8))
				end
			end)
		end
	end
	-- [긴 설명 접기] 다 그린 다음 프레임에 본문·시설 상세의 긴 설명을 한 줄 + ⓘ 로 줄인다.
	task.defer(function()
		if H.contentRenderSerial ~= renderSerial then return end
		local n = H.compactLongText(content)
		local detail = mainInner:FindFirstChild("FacilityDetail")
		if detail then n += H.compactLongText(detail) end
		H.bronzeEmoji(mainInner)
		if n > 0 then H.layoutBook() end
	end)
	H.contentRenderedTab = currentTab
	H.contentRenderedPortId = view.player and view.player.portId
	if retainScroll and savedScroll > 0 then
		-- [재배치 후 복원] UIListLayout이 실제 콘텐츠 높이를 계산한 다음 복원한다.
		task.defer(function()
			game:GetService("RunService").Heartbeat:Wait()
			if H.contentRenderSerial ~= renderSerial or H.contentRenderedTab ~= currentTab then return end
			local limit = math.max(0, content.AbsoluteCanvasSize.Y - content.AbsoluteSize.Y)
			content.CanvasPosition = Vector2.new(0, math.clamp(savedScroll, 0, limit))
		end)
	end
end

-- [단일 시작 화면] 기존 항해 일지 팝업을 새로 생성하지 않고 한 장의 타이틀을 연다.
-- 상태·나라·집안·이어하기·음악 설정은 위 renderTitle의 정본 UI를 사용한다.
function H.showTitle()
	H.titleMenuOpen = true
	H.titleSetupOpen = not view
	H.titleConfirmRestart = false
	titleScroll.CanvasPosition = Vector2.zero
	H.setTitleMode(true)
	renderTitle()
	menuToggle.Visible = false
	Sfx.music("music_harbor")
end

-- 시작 --------------------------------------------------------------------
-- [3D 항구 모듈] 실제 항구 장면은 기존 정본을 한 번만 비동기로 불러온다.
-- 첫 시작 화면은 저장 응답을 우선 표시하고, 완료 후 현재 항구를 그대로 그린다.
gui:SetAttribute("PortSceneLoadState", "loading")
task.spawn(function()
    -- [시작 응답 우선] 저장 상태와 타이틀이 실제 표시된 뒤에 무거운 정본 항구를 불러온다.
    -- 렌더링·저장·입항 함수는 건드리지 않고 기존 비동기 항구 준비의 시작 시점만 조정한다.
    while H.startupCover and H.startupCover.Parent and player.Parent do
        task.wait(0.1)
    end
    if not player.Parent then return end
	local ok, scene = pcall(function()
		return require(Shared:WaitForChild("PortScene"))
	end)
	if ok and type(scene) == "table" then
		PortScene = scene
		gui:SetAttribute("PortSceneLoadState", "ready")
		if view and syncScene then task.defer(syncScene) end
	else
		gui:SetAttribute("PortSceneLoadState", "failed")
		warn("[MareEssentia] 항구 장면 초기화 실패", scene)
	end
end)
gui:SetAttribute("StartupStage", "server-state-request")

task.spawn(function()
	-- [표지 갱신 단일화] 모듈 대기 전부터 시작된 같은 로딩 표시를 사용한다.
    for attempt = 1, 8 do
		gui:SetAttribute("StartupStage", "server-state-" .. tostring(attempt))
		local result = call("State")
		if result and (result.view or result.needsNewGame) then
			H.roomInfo = result.room
			message = ""
			-- 화면을 그리다 오류가 나도 로딩 화면에 갇히지 않게 하고, 오류 내용을 보여 준다.
			local okDraw, errDraw = pcall(function()
				H.showTitle()
			end)
			if not okDraw then
				warn("[MareEssentia] 시작 화면 오류: " .. tostring(errDraw))
				if H.startupLabel then
					H.startupLabel.Text = "시작 화면 오류\n" .. string.sub(tostring(errDraw), 1, 160)
				end
				gui:SetAttribute("StartupStage", "title-failed")
				return
			end
			-- 실제 시작 메뉴가 완성된 뒤에만 로딩 화면을 닫는다.
			if H.startupCover then
				H.startupCover:Destroy()
				H.startupCover = nil
			end
			gui:SetAttribute("StartupStage", "title-ready")
			return
		end
		-- 그 밖의 응답(너무 빨라요 등)은 멈추지 말고 다시 시도한다
		task.wait(0.5)
	end
	gui:SetAttribute("StartupStage", "state-failed")
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
	local root = Instance.new("ScrollingFrame")
	root.Size = UDim2.fromScale(1, 1)
	root.BackgroundColor3 = COLORS.cover
	root.BorderSizePixel = 0
	root.ScrollingDirection = Enum.ScrollingDirection.Y
	root.ScrollBarThickness = 4
	root.CanvasSize = UDim2.new()
	root.Parent = g
	local selected = nil -- 눌러서 고른 동료 id
	local pendingStation = nil
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
		selected, pendingStation = nil, nil
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
			if pendingStation then
				place(d.id, pendingStation)
				return
			end
			selected = if selected == d.id then nil else d.id
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
		root.ScrollingEnabled = not wide
		if wide then root.CanvasSize = UDim2.new(); root.CanvasPosition = Vector2.zero end

		-- 윗줄
		local top = mkBox(root, UDim2.fromOffset(8, 8), UDim2.new(1, -16, 0, 58), COLORS.paper)
		corner(top, 6)
		local title = mkLabel(top, "선장실 · " .. sh.name, 19, Color3.fromRGB(50, 36, 24), true)
		title.Position = UDim2.fromOffset(12, 6)
		title.Size = UDim2.new(1, -184, 0, 24)
		title.AutomaticSize = Enum.AutomaticSize.None
		local hint = mkLabel(top, "직책을 고르고 동료 선택", 12, Color3.fromRGB(90, 70, 50), false)
		hint.Position = UDim2.fromOffset(12, 32)
		hint.Size = UDim2.new(1, -184, 0, 20)
		hint.AutomaticSize = Enum.AutomaticSize.None
		local closeBtn = mkButton(top, "닫기", COLORS.leather, UDim2.fromOffset(70, 40), close, true)
		closeBtn.AnchorPoint = Vector2.new(1, 0.5)
		closeBtn.Position = UDim2.new(1, -8, 0.5, 0)
		local autoBtn = mkButton(top, "자동 배치", COLORS.green, UDim2.fromOffset(88, 40), function() selected, pendingStation = nil, nil; call("AutoStations") end, #v.stations > 0)
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
			if selected or pendingStation == st.id then
				local stroke = Instance.new("UIStroke")
				stroke.Color = COLORS.gold
				stroke.Thickness = 2
				stroke.Parent = slot
			end
			slotFrames[st.id] = slot
			slot.Activated:Connect(function()
				if selected then
					place(selected, st.id)
				else
					pendingStation = if pendingStation == st.id then nil else st.id
					build()
				end
			end)
			local nm = mkLabel(slot, st.name, 14, COLORS.gold, true)
			nm.Position = UDim2.fromOffset(78, 6)
			nm.Size = UDim2.new(1, -84, 0, 20)
			nm.AutomaticSize = Enum.AutomaticSize.None
			local desc = mkLabel(slot, if st.seatName then (st.seatName .. (if st.matched then "  (딱 맞음 x1.2)" else "  (다른 직책 x0.6)")) elseif pendingStation == st.id then "아래에서 동료 선택" else "빈 직책", 12, COLORS.text, false)
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
		local joined = 0
		for _, c in v.list do if c.joined then joined += 1 end end
		local columns = math.max(1, math.floor((W - 28 + 8) / 112))
		local listHeight = 38 + math.max(1, math.ceil(joined / columns)) * 128
		if not wide then root.CanvasSize = UDim2.fromOffset(0, listY + listHeight + 8) end
		local listBox = mkBox(root, if wide then UDim2.new(rx, 4, 0, listY) else UDim2.fromOffset(8, listY), if wide then UDim2.new(1 - rx, -12, 1, -listY - 8) else UDim2.new(1, -16, 0, listHeight), COLORS.leather)
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
		sc.ScrollBarThickness = if wide then 5 else 0
		sc.ScrollingEnabled = wide
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

-- [방문 단일화] 조언 바로가기도 주점과 같은 시설 책을 연다.
function H.goAdvice(tab)
	H.hideBubble()
	menuToggle.Visible = false
	openTab(tab)
end

openTab = function(tabId, mapPage, facility)
	-- [같은 메뉴 재진입] 이미 열린 탭이면 장부·버튼·원화를 불필요하게 다시 만들지 않는다.
	-- 숨겨진 창 재개방·지도 페이지 변경·건물 방문·백과 연결은 기존 흐름으로 연다.
	local origin = if facility == "은행" or facility == "상인 길드" then facility else nil
	if main.Visible and view and not newGameMode and not H.titleMenuOpen
		and currentTab == tabId and H.mapPage == mapPage
		and H.visitFacility == origin and not H.tradeBookOpenRequested and not H.galleryBookOpenRequested then
		return
	end
	-- [시설 방문 표시] 출입 건물명은 실행 중 화면에만 사용한다. 저장 구조 변경 없음.
	H.visitFacility = origin
	H.bankVisitPending = origin == "은행"
	-- [교역 장부→서재] 선택한 상품의 분류는 백과 상태 변수 선언 이후,
	-- 기존 탭 전환 함수에서만 지정한다. 별도 화면·저장 키를 생성하지 않는다.
	if tabId == "codex" and H.galleryBookOpenRequested then
		local target = H.galleryBookOpenRequested
		H.galleryBookOpenRequested = nil
		H.tradeBookOpenRequested = nil
		if type(target) == "string" and string.sub(target, 1, 7) == "search:" then
			-- [연결 원화 없음] 기존 검색 화면에서 관련 주제만 보여 주고 임의 발견 처리하지 않는다.
			H.codexSearchTerm = string.sub(target, 8)
			H.encyclopediaTargetId = nil
			codexField = "search"
		else
			H.encyclopediaTargetId = if type(target) == "string" then target else nil
			H.encyclopediaCategoryId = "all"
			H.encyclopediaSearchText = ""
			H.encyclopediaIndexOpen = false
			H.encyclopediaPage = nil
			codexField = "book"
		end
	elseif tabId == "codex" and H.tradeBookOpenRequested then
		H.tradeBookOpenRequested = nil
		codexField = "r:all"
		for _, resource in ((view and view.codex and view.codex.resources) or {}) do
			if resource.id == H.tradeBookGood then
				codexField = "r:" .. resource.category
				break
			end
		end
	end
	-- [최근 사용] 영구 저장 키 변경 없이 이 실행 중 직전 메뉴만 기억한다.
	-- [이전 시설] 같은 창의 탭을 넘겨도 돌아갈 시설과 탭을 보존한다.
	if TAB_NAME[currentTab] and groupOf(currentTab) ~= groupOf(tabId) then
		H.recentTab = currentTab
	end
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
	-- [시설 탭 이동] 이전 탭 본문을 정리하고 같은 시설 책 안에서 표시한다.
	closeTradeHall()
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
		-- [역사 이벤트] 책에서 지도와 기존 3D 무대가 등장한 뒤 선택창이 나타난다.
		local recordHistory = H.historyCinematic(layer, ev)
		local win = Instance.new("Frame")
		win.AnchorPoint = Vector2.new(0.5, 0.5)
		win.Position = UDim2.fromScale(0.5, 0.5)
		win.Size = UDim2.new(0, 520, 0, 0)
		win.AutomaticSize = Enum.AutomaticSize.Y
		win.BackgroundColor3 = COLORS.cover
		win.BorderSizePixel = 0
		win.Visible = false
		win.Parent = layer
		task.delay(1.18, function()
			if win.Parent then win.Visible = true end
		end)
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
		-- [역사 사건 원화 · 2026-11-28] 맞는 사건 원화(없으면 세계 해도)를 창 맨 위에 띄우고 영화 띠를 두른다.
		if H.eventArtFor then
			local artId = H.eventArtFor(ev.art or ev.id, ev.tag, ev.title, ev.kind)
			if artId then
				local banner = Instance.new("ImageLabel")
				banner.Name = "HistoryEventArt"
				banner.Size = UDim2.new(1, 0, 0, 150)
				banner.BackgroundColor3 = Color3.fromRGB(20, 18, 16)
				banner.BorderSizePixel = 0
				banner.Image = "rbxassetid://" .. tostring(artId)
				banner.ScaleType = Enum.ScaleType.Crop
				banner.LayoutOrder = 0
				banner.Parent = win
				corner(banner, 10)
			end
		end
		if H.cinemaBars then H.cinemaBars(layer, 0.9) end
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
				-- 서버가 선택을 승인해야만 책에 기록되는 효과를 준다. 판정과 보상은 그대로.
				if not popupGui or popupFor ~= ev.id then return end
				local response = call("HistoryChoose", { choice = ch.index })
				if response and response.ok then
					-- [수납 화면] 기존 선택창을 숨겨 책으로 되접히는 최종 연출이 가려지지 않게 한다.
					win.Visible = false
					recordHistory()
					-- 신규 30프레임 책 수납이 있으면 마지막 장면이 끝난 뒤 닫는다.
					local archiveDelay = if AssetIds["CardArt/history_record"] then 1.08 else 0.62
					task.delay(archiveDelay, function()
						if popupFor == ev.id then closePopup() end
					end)
				else
					closePopup()
				end
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
	-- [Studio 진단] 시작 안내 창 열림·닫힘 순서와 그때의 서버 단계를 시간순으로 남긴다(Studio 실행에서만).
	local function introTrace(event: string)
		if not game:GetService("RunService"):IsStudio() then return end
		local stepNow = view and view.captain and view.captain.step or "-"
		local line = string.format("%.1f:%s:%s", os.clock() % 1000, event, tostring(stepNow))
		local old = tostring(workspace:GetAttribute("IntroQATrace") or "")
		workspace:SetAttribute("IntroQATrace", string.sub(old .. "|" .. line, -900))
	end
	local dlgPrevMusic = nil
	local function closeDlg()
		if dlg then introTrace("close:" .. tostring(H.introDlgStep) .. ":" .. string.sub(debug.traceback("", 2):gsub("%s+", " "), 1, 120)) end
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
		introTrace("open:" .. tostring(spec.speaker))
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
		-- [빈 초상 방지 · 2026-11-28] 새 개별 담당자 초상(npc_keeper_*)이 있으면 그것, 없고 칸도 못 찾으면 공용 초상 찾기
		do
			local keeperKey = if tile == "scholar" and string.find(spec.speaker, "서기", 1, true) then "trade" elseif tile ~= "hero" then tile else nil
			local own = keeperKey and AssetIds["Portraits/npc_keeper_" .. keeperKey]
			if own then
				face.Image = "rbxassetid://" .. tostring(own)
				face.ImageRectOffset, face.ImageRectSize = Vector2.zero, Vector2.zero
			elseif not portraitId and H.portraitFor then
				local img, off, size = H.portraitFor({ key = "keeper:" .. tostring(keeperKey or "tavern") })
				if img then
					face.Image = "rbxassetid://" .. tostring(img)
					face.ImageRectOffset, face.ImageRectSize = off or Vector2.zero, size or Vector2.zero
					face:SetAttribute("PortraitFallback", true)
				end
			end
		end
		if not face:GetAttribute("PortraitFallback") and not (tile ~= "hero" and AssetIds["Portraits/npc_keeper_" .. (if tile == "scholar" and string.find(spec.speaker, "서기", 1, true) then "trade" else tile)]) then
			face.ImageRectSize = if regId then regSize elseif portraitOffset then PORTRAIT_SIZE * fk else Vector2.zero
		end
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
				if (msg == "이미 초상화를 받았어요" or msg == "이미 장부에 올렸어요") and dlg == layer then
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

	local runStepBody
	local function runStep(step)
		runStepBody(step)
		if dlg then H.introDlgStep = step end
	end
	function runStepBody(step)
		-- [안내창 단계 기록] 지연(task.defer) 기록은 다음 단계 창이 열린 뒤에 옛 단계 이름을 덮어써
		-- 서버와 다르다고 새 창을 닫는 경합을 만들었다(Studio 44921931706: stale=name>companion, 동료 단계 영구 정지).
		-- 창을 연 직후 같은 스레드에서 기록한다(openDlg가 먼저 closeDlg로 지운 뒤).
		local c = view.captain
		local role = if step == "name" then "상인 길드" elseif step == "companion" then "주점" else "떠돌이 화가"
		if step == "name" then
			openDlg({ speaker = "길드 서기", role = role, music = "music_market", sting = "sfx_bell", input = "이름을 적으세요 (12글자까지)", button = "장부에 올린다",
				text = "(배에서 내리는 당신에게 상인 길드의 서기가 다가온다) 처음 보는 얼굴이군요. 이 항구에서 거래하려면 거래 장부에 이름이 있어야 합니다. 값을 치르고 영수증을 받는 사람의 이름이니까요. 뭐라고 적을까요?" },
				function(v)
					-- [자기 창만 닫기] 서버 응답을 기다리는 사이 다음 단계 창이 열렸을 수 있다(Studio 44925289818:
					-- 이름 응답이 늦게 돌아와 막 열린 동료 창을 닫음 → 동료 단계 영구 정지). 응답 뒤에는 자기 창일 때만 닫는다.
					local mine = dlg
					local r = call("IntroName", { name = v })
					if r and r.ok then
						Sfx.play("sfx_contract_stamp", 0.7)
						if dlg == mine then closeDlg() end
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
					local mine = dlg
					local r = call("IntroCompanion", {})
					-- [Studio 진단] 시작 안내가 동료 단계에서 멈추는 회차(44912240071 등)의 실제 서버 응답을 남긴다.
					if game:GetService("RunService"):IsStudio() then
						workspace:SetAttribute("IntroQACompanionReply", tostring(r and r.ok) .. "|" .. tostring(r and r.message))
					end
					if r and r.ok then
						Sfx.play("sfx_quest_accept", 0.6)
						if dlg == mine then closeDlg() end
					end
					return r and r.ok, r and r.message
				end)
		else
			openDlg({ speaker = "떠돌이 화가", role = role, music = "music_story_harbor", sting = "sfx_story_library", portraits = nationPortraits(), button = "이 얼굴로 그려 주세요",
				text = string.format("%s 선장님이시죠? 저는 항구를 떠돌며 항해자 화첩을 만들고 있어요. 바다로 나간 사람들의 얼굴을 남기면, 훗날 그들의 이야기가 사라지지 않거든요. 대가는 받지 않을게요. 어떤 모습으로 그려 드릴까요?", c.name or "선장") },
				function(v)
					local name = c.name or "선장"
					local mine = dlg
					local r = call("IntroPortrait", { portrait = v })
					if r and r.ok then
						if dlg == mine then closeDlg() end
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

	-- [첫 항해 목표] 기존 튜토리얼 상태만 갱신한다. 목표와 행동 단계는 저널 한 곳에 표시.
	local function refreshGoal()
		local c = view and view.captain
		if not c or newGameMode or H.tutorialHidden then
			H.tutorialGoalActive = false
			return
		end
		local sailed = view.player and (view.player.day or 0) > 0
		H.tutorialGoalActive = c.step ~= "done" or not sailed
		if not H.tutorialGoalActive then H.tutorialHidden = true end
	end

	task.spawn(function()
		local last = nil
		local openingShown = false
		while true do
			task.wait(0.7)
			pcall(refreshChip)
			pcall(refreshGoal)
			if H.refreshNextStep then pcall(H.refreshNextStep) end
			-- [지난 이야기] 첫 화면이 안정되면 한 번(오프닝·대화·장면 중이면 미룸)
			if H.showRecap and not H.recapShown and view and main.Visible == false and hud.Visible and not newGameMode
				and not H.openingPending and not dlg and not sceneHold and not H.sceneBusy and (view.player and (view.player.day or 0) > 0) then
				pcall(H.showRecap)
			end
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
				if game:GetService("RunService"):IsStudio() then
					workspace:SetAttribute("IntroQAStaleClose", tostring(H.introDlgStep) .. ">" .. tostring(c.step))
				end
				H.introDlgStep = nil
				closeDlg()
				-- 닫은 뒤 현재 서버 단계의 창을 다시 연다(이미 열었던 단계로 기억돼 영영 멈추지 않게).
				last = nil
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
		if workspace:GetAttribute("DevCall") == "QuestScene" then
			-- 개발 캡처용: 퀘스트 수주 장면(연출씬)을 그대로 재생해 촬영한다(서버 변경 없음)
			workspace:SetAttribute("DevCall", nil)
			if H.playQuestScenes then
				H.playQuestScenes({ { kind = "start", name = "연출 점검 의뢰", text = "항구에 낯선 배가 들어왔다. 선장은 비밀 지도를 들고 있다고 한다. 그를 찾아 이야기를 들어 보자.", summary = "연출 점검", portId = "lisbon", mood = "war", long = true } })
			end
		end
		local fx = workspace:GetAttribute("DevCall")
		if type(fx) == "string" and fx:sub(1, 8) == "FxCheck:" and H.fxCheck then
			-- 개발 캡처용: 카드 습득·부채꼴·+1·세트 완성·세계 사건 연출을 강제로 띄워 촬영한다(저장 변경 없음)
			workspace:SetAttribute("DevCall", nil)
			local okFx, errFx = pcall(H.fxCheck, fx:sub(9))
			workspace:SetAttribute("DevResult", "FX " .. tostring(okFx) .. " " .. tostring(errFx))
		end
		if workspace:GetAttribute("DevCall") == "Hall" then
			workspace:SetAttribute("DevCall", nil)
			openTab("trade")
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
			openTab("yard")
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
