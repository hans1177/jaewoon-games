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

