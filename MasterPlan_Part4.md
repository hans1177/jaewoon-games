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

