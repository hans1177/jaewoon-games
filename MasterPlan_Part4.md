# 대충알피지 — 파트 4 작업계획서

> 게임 제목: **대충알피지**. 내부 ID: `simple-rpg` 유지.
> 아래는 요구 명세이며 게임 코드·유료 상점·배포가 완료되었다는 뜻은 아니다.

## 📜 파트 4: 상용화·플레이어 AI·몬스터 생태계·멀티버스 (요구사항 원문 보존)

로블록스 프로젝트에서 200개 이상의 정밀 모듈로 연결되는 완전한 프로덕션 아키텍처를 바로 적용하실 수 있도록, 유료 아이템(상점/비즈니스 모델), 플레이어 AI 동료, 몬스터 생태계 AI, 멀티버스 차원 이동, 유기적 상호작용까지 포함된 [파트 4: 상용화 & AI 생태계 완성형 시스템 (모듈 29~50)]과 [전체 200개 스크립트 아키텍처 완전 명세]를 한 번에 정리해 드립니다.

이 코드를 복사하여 GitHub 저장소의 MasterPlan_Part4.md에 저장하시면, 핸드폰에서 ChatGPT와 주고받는 지시 프롬프트와 Rojo 스튜디오 동기화 구조가 깔끔하게 완결됩니다.

### 🗺️ 1. 전체 200개 스크립트 아키텍처 완벽 명세 (Architecture Overview)

~~~text
src/
├── ReplicatedStorage/
│   ├── Modules/ [모듈 001~040] (데이터베이스, 타입, 상점, 레시피, 멀티버스, AI 데이터)
│   ├── Remotes/ [모듈 041~070] (통신 네트워크 모듈, 안전한 RemoteValidation)
│   └── Shared/  [모듈 071~090] (공통 수학 연산, 3D 그리드, IK 파스, 환경 셰이더)
├── StarterPlayer/
│   └── StarterPlayerScripts/
│       ├── UI/         [모듈 091~120] (유료 상점, HUD, 인벤토리, 테크, AI 지시, 거래소)
│       └── Controllers/[모듈 121~145] (콤보, 패링, 무적 회피, 카메라 셰이크, 터치 드래그)
└── ServerScriptService/
    └── Systems/
        ├── Monetization/ [모듈 146~155] (Developer Products, GamePass, 거래소, 비즈니스)
        ├── Multiverse/   [모듈 156~165] (차원 이동, 로비 허브, 개인 영지 인스턴스)
        ├── LivingWorld/  [모듈 166~180] (자율 AI NPC, 몹 생태계 FSM, 자원 리스폰, 날씨)
        └── CoreCombat/   [모듈 181~200] (서버 히트박스, DataStore, 안티치트, 스턴/노크백)
~~~

### 💻 2. 추가 핵심 프로덕션 Luau 소스코드 (모듈 29~35)

아래 예제는 사용자가 제공한 명세 원문이다. 모듈 36~50은 아직 개별 코드가 제시되지 않았으며, 파일명과 소스가 있다고 가정하지 않는다.

#### 📄 [29] src/ReplicatedStorage/Modules/ShopMonetizationData.luau

GamePass, Developer Products(로벅스 유료 상품), 한정판 종족 외형 및 패스권을 관리하는 상점 데이터 모듈입니다.

~~~luau
--!strict
local ShopMonetizationData = {}

export type ProductInfo = {
	ProductID: number, -- 로블록스 DeveloperProduct ID 또는 GamePass ID
	Name: string,
	Type: "GamePass" | "DevProduct",
	PriceRobux: number,
	Category: "Cosmetic" | "ResourcePack" | "VIPPass",
	Description: string,
}

local PRODUCTS: {[string]: ProductInfo} = {
	["VIP_CivilizationPass"] = {
		ProductID = 1000001,
		Name = "VIP 문명 특권 패스",
		Type = "GamePass",
		PriceRobux = 499,
		Category = "VIPPass",
		Description = "영지 세금 -50%, 채집 속도 +20%, 황금 테두리 칭호 지급"
	},
	["Resource_StarterPack"] = {
		ProductID = 2000001,
		Name = "초보 문명 지원 상자",
		Type = "DevProduct",
		PriceRobux = 99,
		Category = "ResourcePack",
		Description = "목재 x500, 석재 x300, 청동 주괴 x50 즉시 지급"
	},
	["RaceSkin_AncientGold"] = {
		ProductID = 1000002,
		Name = "고조선 황금 천부경 외형",
		Type = "GamePass",
		PriceRobux = 299,
		Category = "Cosmetic",
		Description = "고조선 종족 전용 황금 이펙트 및 스킨"
	}
}

function ShopMonetizationData.GetProduct(productKey: string): ProductInfo?
	return PRODUCTS[productKey]
end

return ShopMonetizationData
~~~

#### 📄 [30] src/ServerScriptService/Systems/MonetizationServer.server.luau

MarketplaceService와 연동하여 결제 성공 시 유저 인벤토리 및 VIP 특권을 안전하게 부여하는 서버 스크립트입니다.

~~~luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ShopData = require(ReplicatedStorage.Modules.ShopMonetizationData)

-- Developer Product 결제 승인 처리
MarketplaceService.ProcessReceipt = function(receiptInfo)
	local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
	if not player then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	-- 리소스 팩 구입 시
	if receiptInfo.ProductId == 2000001 then
		print("[" .. player.Name .. "] 초보 지원 상자 구매 완료! 자원 지급 중...")
		player:SetAttribute("Wood", (player:GetAttribute("Wood") or 0) + 500)
		player:SetAttribute("Stone", (player:GetAttribute("Stone") or 0) + 300)
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	return Enum.ProductPurchaseDecision.PurchaseGranted
end

-- GamePass 소지 여부 검증
Players.PlayerAdded:Connect(function(player)
	local vipPass = ShopData.GetProduct("VIP_CivilizationPass")
	if vipPass then
		local hasPass = false
		pcall(function()
			hasPass = MarketplaceService:UserOwnsGamePassAsync(player.UserId, vipPass.ProductID)
		end)
		if hasPass then
			player:SetAttribute("IsVIP", true)
			print("⭐ [" .. player.Name .. "] VIP 유저 접속 확인!")
		end
	end
end)
~~~

#### 📄 [31] src/ServerScriptService/Systems/CompanionPlayerAI.server.luau

플레이어가 동료로 고용한 AI NPC가 플레이어를 추적하고, 전투 지원, 패링, 명령 수행(채집/공격/대기)을 수행하는 스크립트입니다.

~~~luau
--!strict
local Workspace = game:GetService("Workspace")

export type AICommand = "Follow" | "AttackTarget" | "GatherWood" | "GuardArea"

local CompanionPlayerAI = {}

function CompanionPlayerAI.CreateCompanion(ownerPlayer: Player, spawnCFrame: CFrame): Model
	local npc = Instance.new("Model")
	npc.Name = ownerPlayer.Name .. "의 AI 부족원"
	
	local humanoid = Instance.new("Humanoid")
	humanoid.Parent = npc
	
	local root = Instance.new("Part")
	root.Name = "HumanoidRootPart"
	root.Size = Vector3.new(2, 2, 1)
	root.CFrame = spawnCFrame
	root.Parent = npc
	npc.PrimaryPart = root
	
	npc.Parent = Workspace
	
	local currentCommand: AICommand = "Follow"
	
	-- AI 자율 행동 루프
	task.spawn(function()
		while humanoid.Health > 0 do
			task.wait(0.5)
			
			local ownerChar = ownerPlayer.Character
			if ownerChar and ownerChar:FindFirstChild("HumanoidRootPart") then
				local ownerRoot = ownerChar.HumanoidRootPart :: BasePart
				local dist = (root.Position - ownerRoot.Position).Magnitude
				
				if currentCommand == "Follow" then
					if dist > 8 then
						humanoid:MoveTo(ownerRoot.Position + Vector3.new(3, 0, 3))
					end
				end
			end
		end
	end)
	
	return npc
end

return CompanionPlayerAI
~~~

#### 📄 [32] src/ServerScriptService/Systems/EcosystemMonsterAI.server.luau

몬스터들이 서로 무리를 짓고, 초식 몬스터는 풀을 뜯으며, 포식자는 초식동물을 사냥하는 생태계 상호작용 AI 스크립트입니다.

~~~luau
--!strict
local Workspace = game:GetService("Workspace")

local EcosystemMonsterAI = {}

function EcosystemMonsterAI.RunEcosystemLoop(predator: Model, preyList: {Model})
	local pHum = predator:FindFirstChildOfClass("Humanoid")
	local pRoot = predator:FindFirstChild("HumanoidRootPart") :: BasePart
	if not pHum or not pRoot then return end
	
	task.spawn(function()
		while pHum.Health > 0 do
			task.wait(1.5)
			
			-- 주변 먹이(초식동물) 검색 및 습격
			for _, prey in preyList do
				if prey and prey:FindFirstChild("HumanoidRootPart") then
					local preyRoot = prey.HumanoidRootPart :: BasePart
					local dist = (preyRoot.Position - pRoot.Position).Magnitude
					
					if dist < 40 then
						print("🥩 [생태계 연동] 포식자가 초식동물을 발견하고 추적합니다!")
						pHum:MoveTo(preyRoot.Position)
						break
					end
				end
			end
		end
	end)
end

return EcosystemMonsterAI
~~~

#### 📄 [33] src/ServerScriptService/Systems/MultiverseTeleport.server.luau

TeleportService를 활용해 허브 광장에서 다른 시대로 이동하거나 대규모 전쟁 플레이스(Place)로 이동하는 멀티버스 이동 서버 모듈입니다.

~~~luau
--!strict
local TeleportService = game:GetService("TeleportService")
local Players = game:GetService("Players")

local MultiverseTeleport = {}

-- 특정 차원/시대 Place ID로 이동
function MultiverseTeleport.TeleportToEra(player: Player, targetPlaceID: number)
	print("[" .. player.Name .. "] 차원문 통과 중... PlaceID: " .. targetPlaceID)
	
	local success, err = pcall(function()
		TeleportService:Teleport(targetPlaceID, player)
	end)
	
	if not success then
		warn("텔레포트 실패: " .. tostring(err))
	end
end

return MultiverseTeleport
~~~

#### 📄 [34] src/StarterPlayer/StarterPlayerScripts/InteractiveWorldClient.client.luau

마을 주민 NPC, 고대 유적 상자, 우물 등 오브젝트 근처 접근 시 [E] 상호작용 프롬프트를 띄우고 연출을 처리하는 스크립트입니다.

~~~luau
--!strict
local ProximityPromptService = game:GetService("ProximityPromptService")
local Players = game:GetService("Players")

local LocalPlayer = Players.LocalPlayer

ProximityPromptService.PromptTriggered:Connect(function(prompt, player)
	if player == LocalPlayer then
		print("오브젝트 상호작용 실행: " .. prompt.ObjectText .. " - " .. prompt.ActionText)
		-- 상호작용 연출 및 사운드 재생
	end
end)
~~~

#### 📄 [35] src/StarterPlayer/StarterPlayerScripts/ShopUIController.client.luau

유료 로벅스 아이템 상점 및 지원 상자 구매창을 시각적으로 구현한 UI 스크립트입니다.

~~~luau
--!strict
local MarketplaceService = game:GetService("MarketplaceService")
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")

local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui") :: PlayerGui

local shopGui = Instance.new("ScreenGui")
shopGui.Name = "CivShopGui"
shopGui.ResetOnSpawn = false
shopGui.Parent = PlayerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 500, 0, 380)
frame.Position = UDim2.new(0.5, -250, 0.5, -190)
frame.BackgroundColor3 = Color3.fromRGB(35, 30, 25)
frame.Visible = false
frame.Parent = shopGui

local buyBtn = Instance.new("TextButton")
buyBtn.Size = UDim2.new(0, 200, 0, 50)
buyBtn.Position = UDim2.new(0.5, -100, 0.7, 0)
buyBtn.BackgroundColor3 = Color3.fromRGB(220, 160, 40)
buyBtn.Text = "초보 지원 상자 (99 Robux)"
buyBtn.Parent = frame

buyBtn.MouseButton1Click:Connect(function()
	MarketplaceService:PromptProductPurchase(LocalPlayer, 2000001)
end)

UserInputService.InputBegan:Connect(function(input, gp)
	if gp then return end
	if input.KeyCode == Enum.KeyCode.P then
		frame.Visible = not frame.Visible
	end
end)
~~~

### 🛠️ 3. 핸드폰 ChatGPT & Rojo 200개 모듈 지시 가이드

200개 모듈 확장 방식: 위 구조도(Modules 001~200)를 기준으로, 핸드폰 ChatGPT 창에 "045번 RemoteValidation 스크립트 써줘" 또는 "125번 터치 드래그 UI 컨트롤러 작성해줘"라고 개별 지시하면 완벽한 코드가 출력됩니다.

통합 관리: GitHub 저장소에 Part1.md부터 Part4.md까지 차례대로 저장해 두시면 모바일과 PC 스튜디오 개발 환경이 완벽히 동기화.

---

## 대충알피지 실제 구현 작업계획 (기존 구조 대응)

**기본 원칙:** 위 src/ 목록은 책임 범위도다. 실제 Roblox Rojo 프로젝트에서는 기존 roblox-games/simple-rpg/shared/, server/, client/ 및 default.project.json을 우선 재사용하며, 파일 수를 채우기 위해 200개를 무조건 생성하지 않는다. 원본 코드는 예시로 보관하고 바로 실행하지 않는다.

| 번호 구간 | 담당 기능 | 기존 게임 책임/검증 |
| --- | --- | --- |
| 001~040 | 종족·기술·상품·레시피·AI 설정 | shared/GameConfig.luau, RaceData.luau, TechTreeData.luau |
| 041~070 | 원격 이벤트와 입력 검증 | server/Game.server.luau 기존 RemoteEvent/속도제한 및 서버 권한 |
| 071~090 | 공용 좌표·3차원 맵·환경 수학 | 기존 구현을 확인한 뒤 같은 담당 로직에 통합 |
| 091~120 | 모바일 UI·가방·상점·기술·동료 지시 | client/Game.client.luau |
| 121~145 | 액션·패링·회피·카메라·터치 | 기존 client/Game.client.luau와 server/Game.server.luau |
| 146~155 | 유료 패스·소모형 상품·구매 복구 | 상품 ID와 결제 승인 별도 확인, 서버 저장 트랜잭션 필수 |
| 156~165 | 로비·차원·영지 | 기존 문명 지역 이동 유지, 승인된 Roblox Place만 허용 |
| 166~180 | 동료·몬스터 생태계·자원·날씨 | 기존 서버 적 생성·추적·지역/자원 루프에 직접 통합 |
| 181~200 | 서버 전투·보상·세이브·보안 | 기존 서버 판정·DataStore 키·저장 의미·기존 QA 유지 |

### 모듈 [29]~[35] 수용 및 추가 구현

1. **29 상점 데이터:** 코드의 1000001, 1000002, 2000001은 실제 상품으로 확인되지 않은 예시 ID. 계정 소유·유효 가격·상품 종류 확인 전 구매 UI 비활성.
2. **30 결제 서버:** 원본은 처리 성공 전에 지급 내용의 영구 저장/영수증 중복 지급 방지가 없고, 모르는 상품도 PurchaseGranted 처리하므로 **그대로 운영 반영 금지**. 기존 게임은 CivWood/CivStone/CivBronze를 사용하므로 원본의 Wood/Stone과 불일치. 실제 적용 시 기존 저장/복구 책임 함수와 일관된 영수증 멱등 보장 필요.
3. **31 플레이어 AI 동료:** 원본은 Follow 이동만 작성되어 있고 공격·채집·패링·GuardArea·명령 전환은 아직 없음. 소유권·멈춤·리스폰·추적 제한·서버 전투 검증 연결 필요.
4. **32 몬스터 생태계:** 원본은 포식자 주변 먹이 추적 예시. 초식 행동, 군집, 먹이 사망, 개체수·CPU 예산, 보상 남용 방지 추가 설계 필요.
5. **33 멀티버스:** 실제 사용 가능한 Place 확인, 안전한 목적지 허용목록 및 서버 사용자 권한/이동 실패 복구 필요. 단순 임의 ID 이동 허용 금지.
6. **34 상호작용:** 원본은 상호작용 로그뿐. 서버에서 대상 존재/거리/재사용 제한 검증하고 상자·우물·주민 대화의 실제 상태 변화를 연결.
7. **35 상점 화면:** 고정 500×380 화면은 모바일 화면 잘림 검증이 필요. 실구매 호출은 검증된 상품일 때만 노출.

### 단계별 작업 및 완료 증거

| 순서 | 작업 | 수용 조건 |
| --- | --- | --- |
| 1 | 최신 main/중앙정책/기존 코드를 읽고 파트 4 기능별 책임 함수를 확인 | 기존 게임 기능·저장 키·패링 및 보상 수치 변경 없음 |
| 2 | 동료 명령·몬스터 생태계·상호작용 서버 구현 | 중복 서버 루프 없이 서버 검증, 멀티플레이·모바일 QA |
| 3 | 문명별 지역·멀티버스 이동·AI 지시 UI | 실제 허용 Place, 소유권·거리·경로·실패 복구 테스트 |
| 4 | 유료 상품 데이터 및 결제 설계 독립 검토 | 실제 상품 ID 확인, 영수증 멱등·저장 성공 증거, 소유자 승인 |
| 5 | 정적 QA→빌드→기존 F0~F9→독립 QA→검증된 대상 게시 | 정확한 소스·아티팩트·버전/배포 증거 없으면 완료 선언 금지 |

**미제공:** Part1~Part3 실제 원문, 개별 모듈 36~50 코드, 001~200 각 파일의 전체 소스. 따라서 해당 내용을 추측해서 완성했다고 기록하지 않는다.  
**현재 상태:** 요구사항 문서 보존. 유료 상품 판매·200개 스크립트 구현·실제 Roblox 공개 배포는 수행하지 않음.
