# 세계 귀신·몬스터 스킨 100종

심야대탈출 같은 실내 공포 게임에 쓸 수 있도록 만든 **내부 Roblox 원형 자산**이다. 100개 ID 모두 실제 `Model`을 생성한다. 27가지 몸체에 얼굴·복장·귀·뿔·날개·꼬리·소품을 조합한다. 단순 색상 변경은 별도 종으로 세지 않는다.

이름과 큰 모티프는 세계 민속을 참고했다. 호텔 내 배치 역할, 복장 조합, 형상, 색은 이 프로젝트의 해석이다. 전통의 유일한 정답인 외형이나 다른 게임 모델의 복제품으로 표시하지 않는다. DOORS, The Mimic, Pressure의 공식 소개와 민속·박물관 자료는 `research.json`에 기록했다. 다른 게임의 메시·텍스처·스크립트는 가져오지 않았다.

## 현재 상태

- 실제 Luau 모델 생성 코드, 카탈로그, 독립 미리보기 프로젝트가 있다.
- 100종 × 3단계 레시피를 공식 Luau 인터프리터로 검사한다. 이는 Roblox Studio 실행이 아니다.
- `Create`/갤러리의 연결·부품 생성 검사는 Roblox API 모형을 쓴 단위 검사다.
- 네이티브 외형, 애니메이션 재생, 실제 Windows 성능, 게임 내 플레이는 **미검증**이다. 원형 조립 형상이므로 최종 제작 퀄리티 판정을 받지 않았다.
- `productionVerified=false`, `verifiedCompanyReusable=false`, 실제 적용 게임은 비어 있다. 심야대탈출 소스·세이브·AI·출시 설정을 수정하지 않는다.

## 사용

`GhostSkinFactory.luau`와 `GhostSkinCatalog.luau`를 같은 Roblox 폴더에 ModuleScript로 넣는다.

```lua
local Factory = require(game.ReplicatedStorage.WorldGhostSkins.GhostSkinFactory)
local skin = Factory.Create("gumiho", {
    parent = workspace,
    quality = "mid", -- far / mid / near
    pivot = CFrame.new(0, 0, 0),
    anchored = true,
})
-- 자신이 생성한 모델만 정리한다.
skin:Destroy()
```

`List()`는 100종의 ID·이름·지역·형태·권장 장소를 반환한다. `Describe(id, quality)`는 Roblox 인스턴스 없이 검사할 수 있는 실제 형상 데이터다. 기본 `mid`; `far`는 머리카락·장식 일부를 줄이고 `near`는 눈의 세부 표현을 더한다. 외부 다운로드나 프레임별 반복 작업은 없다.

`Create`는 보이지 않는 루트와 7개 `Motor6D` 연결, 부위에 용접된 비충돌 스킨, `AnimationController/Animator`를 만든다. 기본 루트는 고정이다. `anchored=false`는 통합자가 자신의 NPC 루트에 연결할 때 쓴다. 이 루트는 충돌판이 아니므로 단독으로 물리 캐릭터처럼 떨어뜨리지 않는다. 전투 판정·이동·R6/R15 어댑터·애니메이션 클립은 게임 쪽 별도 책임이다. 기존 NPC 구조를 자동 교체하지 않는다.

## 느린 PC용 독립 미리보기

```sh
rojo build assets/roblox/world-ghosts/default.project.json -o /tmp/world-ghosts-gallery.rbxlx
```

기존 Studio가 완전히 유휴 상태가 된 뒤 **같은 한 창**에서 산출물을 연다. 보호된 게임에 덮어쓰지 않는다. Play에서 8종씩 13쪽으로 확인한다. 이전 페이지는 제거한 다음 새 페이지를 만든다. `far/mid/near` 버튼과 좌우 키를 지원한다. 갤러리의 표시는 검증 PASS가 아니다.

## 카탈로그와 검증

`catalog.tsv`가 원본이며, `GhostSkinCatalog.luau`는 생성 산출물이다.

```sh
node assets/roblox/world-ghosts/generate-catalog.mjs
node assets/roblox/world-ghosts/generate-catalog.mjs --check
VIBE2_LUAU_BINARY=/path/to/official/luau node --test qa/roblox-world-ghost-skins.test.mjs
```

지역 구성: 한국 12, 일본 24, 중국 8, 말레이권 4, 인도네시아 1, 필리핀 4, 태국 5, 남아시아 6, 중동 4, 유럽 16, 아프리카 6, 아메리카 10. 민속의 선악·국경·외형을 고정한 분류가 아니라 검색 편의를 위한 묶음이다. 전체 이름과 사용 후보 장소는 `catalog.tsv`에 있다.
