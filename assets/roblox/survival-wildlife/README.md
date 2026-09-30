# Survival Wildlife Roblox Package

Roblox에서 바로 사용하는 3D 야생동물 패키지다.

## 구성
- `WildlifeCatalog.luau`: 종/스킨/체형 데이터
- `WildlifeFactory.luau`: 실제 3D Model + Motor6D 리그 생성
- `WildlifeAnimator.luau`: 발 접지, 어깨/골반 위상차, 척추 후행, 머리/귀/꼬리 secondary motion
- `SurvivalWildlife.luau`: 서버용 Spawn / 상태 / 속도 API
- `WildlifeClient.client.luau`: 태그된 동물의 클라이언트 애니메이션 자동 바인딩
- `BearWalkSample.server.luau`: 곰 1마리 샘플
- `default.project.json`: Rojo 프로젝트

## 서버 사용
```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Wildlife = require(ReplicatedStorage.SurvivalWildlife.SurvivalWildlife)

local bear = Wildlife.Spawn(
    "BEAR",
    "DARK_BROWN",
    CFrame.new(0, 0, 0),
    workspace
)

Wildlife.SetDesiredSpeed(bear, 6)
Wildlife.SetMotionState(bear, "LOCOMOTION")

-- 공격
Wildlife.SetDesiredSpeed(bear, 0)
Wildlife.SetMotionState(bear, "ATTACK", {
    attackDuration = 0.92,
})
```

## 클라이언트
`WildlifeClient.client.luau`가 `VibeSurvivalWildlife` 태그를 자동 감지해서 관절 애니메이션을 연결한다.

## 모션 원칙
- 2D Billboard / Sprite 동물 금지
- Root-only 미끄러짐 금지
- 4족 보행은 stance가 swing보다 길게 유지
- 발 접지 구간 유지
- 어깨/골반 반대 위상
- 척추와 머리 후행
- 공격은 anticipation → contact → follow-through → settle
- 걷기↔달리기 스프링 블렌드

이 패키지는 Roblox 네이티브 Runtime에서 사용하기 위한 자산이다.
