# 세계 귀신·몬스터 스킨 100종

심야대탈출 같은 실내 공포 게임에 쓸 수 있도록 만든 **내부 Roblox 원형 자산**이다. 100개 ID 모두 실제 `Model`을 생성한다. 27가지 몸체에 얼굴·복장·귀·뿔·날개·꼬리·소품을 조합한다. 단순 색상 변경은 별도 종으로 세지 않는다.

이름과 큰 모티프는 세계 민속을 참고했다. 호텔 내 배치 역할, 복장 조합, 형상, 색은 이 프로젝트의 해석이다. 전통의 유일한 정답인 외형이나 다른 게임 모델의 복제품으로 표시하지 않는다. DOORS, The Mimic, Pressure의 공식 소개와 민속·박물관 자료는 `research.json`에 기록했다. 다른 게임의 메시·텍스처·스크립트는 가져오지 않았다.

## 현재 상태

- 실제 Luau 모델 생성 코드, 카탈로그, 독립 미리보기 프로젝트와 빌드된 Roblox 파일이 있다.
- 100종 × 3단계 레시피를 공식 Luau 인터프리터로 검사한다. 이는 Roblox Studio 실행이 아니다.
- `Create`/갤러리의 연결·부품 생성 검사는 Roblox API 모형을 쓴 단위 검사다.
- 대기·걷기·추격·공격·피격·쓰러짐의 6가지 절차적 외형 동작을 제공한다. 100종 × 6상태 × 6시점 = 3,600개 샘플을 검사했다. 공격 판정·데미지·NPC 이동은 만들지 않는다.
- 네이티브 외형, 실제 Studio 애니메이션 재생, 실제 Windows 성능, 게임 내 플레이는 **미검증**이다. 원형 조립 형상이므로 최종 제작 퀄리티 판정을 받지 않았다.
- `productionVerified=false`, `verifiedCompanyReusable=false`, 실제 적용 게임은 비어 있다. 심야대탈출 소스·세이브·AI·출시 설정을 수정하지 않는다.

## 직접 제작한 메시 시안: 처녀귀신

`native/mesh/bride.glb`는 기존 기본 부품 조립과 별도로 직접 모델링한 **실제 스킨 메시 1종**이다. `build-mesh.py`가 원본 제작 코드이며, 외부 모델이나 이미지 생성 결과를 쓰지 않는다. 100종 전체를 메시로 교체했다는 뜻은 아니다. 기존 100종 원형과 게임 로직은 보존한다.

- 연속 곡면 얼굴·한복, 직조 무늬, 손가락, 눈꺼풀, 시선, 머리카락·옷자락 관절.
- 80개 뼈, 14개 재질별 메시, 6개 내장 동작. 삼각형 수와 해시는 `native/mesh/evidence.json`에 기록한다.
- 대기·걷기·추격은 반복 클립, 공격·피격·쓰러짐은 단발 클립이다. 몸 위치 이동과 전투 판정은 포함하지 않는다.
- GLB에는 뼈대·스킨 가중치·재질·텍스처·동작이 들어 있다. Studio의 3D 가져오기로 별도 확인해야 한다. 기존 `Factory.Create`는 계속 기본 부품 원형을 만든다. 가져온 새 모델을 자동으로 게임에 삽입하거나 애니메이션 자산을 게시하지 않는다.
- **실제 Roblox Studio 가져오기·모바일 성능·게임 적용은 미검증이다.** 로컬 모델 렌더와 파일 검사만으로 최종 아트 또는 로블록스 검증을 통과했다고 표시하지 않는다.

재생성 환경: Python 3.11, `bpy==4.5.3`, Pillow. 명령:

```sh
python assets/roblox/world-ghosts/build-mesh.py
# 선택: 내려받기용 FBX와 실제 모델 렌더
python assets/roblox/world-ghosts/build-mesh.py --fbx --render /tmp/bride
```

Blender 원본 제작 설정으로 계산한 이미지와 동작 확인 영상은 메시 폴더의 `bride.png`, `bride.webm`이다. 그림을 움직이는 영상이 아닌, 내보낸 모델의 뼈와 스킨을 재생한 결과다.

## 사용

`native/world-ghost-skins.rbxmx`를 Studio에서 불러오고 생성된 `WorldGhostSkins` 폴더를 `ReplicatedStorage`로 옮긴다. 4개 ModuleScript(Factory/Catalog/Motion/Audit)가 들어 있다. 소스에서 사용할 때도 같은 폴더에 둔다.

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

`Create`는 보이지 않는 루트, 몸체별 `Motor6D`, 부위에 용접된 비충돌 스킨, `AnimationController/Animator`를 만든다. 네발짐승의 네 다리, 거미의 다리·무릎 16관절, 양 날개, 꼬리 부채와 뱀 마디가 독립 연결된다. 기본 루트는 고정이다. `anchored=false`는 통합자가 자신의 NPC 루트에 연결할 때 쓴다. 이 루트는 충돌판이 아니므로 단독으로 물리 캐릭터처럼 떨어뜨리지 않는다. 전투 판정·이동·R6/R15 어댑터·외부 애니메이션 클립은 게임 쪽 별도 책임이다. 기존 NPC 구조를 자동 교체하지 않는다.

```lua
local Motion = require(game.ReplicatedStorage.WorldGhostSkins.GhostSkinMotion)
local binding = Motion.Bind(skin)
binding.step(0.2, "walk") -- 게임의 기존 업데이트 루프에서 시간/외형 상태를 전달
binding.reset()          -- 원래 관절 자세 복구
binding.destroy()        -- 모델을 없애기 전에 연결 참조 해제
```

`Bind`는 자체 반복 루프를 만들지 않는다. 갤러리는 한 개 업데이트 연결을 공유하고 최대 30Hz로 표시한다. 같은 Motor6D에 다른 애니메이터를 동시에 적용하지 않는다. 원점·NPC 위치·게임 상태를 수정하지 않는다.

## 느린 PC용 독립 미리보기

바로 열 파일은 `native/world-ghosts-gallery.rbxlx`다. 재생성:

```sh
VIBE2_ROJO_BINARY=/path/to/rojo VIBE2_LUAU_COMPILER=/path/to/luau-compile \
  node assets/roblox/world-ghosts/build-native.mjs
```

기존 Studio가 완전히 유휴 상태가 된 뒤 **같은 한 창**에서 산출물을 연다. 보호된 게임에 덮어쓰지 않는다. Play에서 8종씩 13쪽으로 확인한다. 이전 페이지는 제거한 다음 새 페이지를 만든다. `far/mid/near`, 동작 전환·멈춤, 개별 확대, 시점 회전과 좌우 키를 지원한다. 작은 화면은 컨트롤 영역을 스크롤한다.

`100종 구조 검사`는 보이던 모델을 먼저 제거하고 한 번에 1종씩 실제 Roblox 인스턴스·용접·관절 연결과 여섯 동작을 확인한다. 결과는 Output의 `WORLD_GHOST_NATIVE_AUDIT=` JSON과 GUI 속성에 남는다. 검사 창을 없애면 남은 순회를 중단한다. **이 구조 검사가 통과해도 최종 외형·성능·게임·다인 플레이 PASS는 아니다.** 이 저장소에 실행하지 않은 네이티브 결과를 미리 기록하지 않는다.

빌드 시 공식 Luau 컴파일과 Rojo 7.7.0 패키징을 수행하고 `native/build-evidence.json`에 소스·파일 SHA256을 남긴다. 전용 CI도 두 파일을 재생성하고 내장 소스 일치를 검사한다. Studio 성공 플래그는 항상 별도다.

## 카탈로그와 검증

`catalog.tsv`가 원본이며, `GhostSkinCatalog.luau`는 생성 산출물이다.

```sh
node assets/roblox/world-ghosts/generate-catalog.mjs
node assets/roblox/world-ghosts/generate-catalog.mjs --check
VIBE2_LUAU_BINARY=/path/to/official/luau node --test qa/roblox-world-ghost-skins.test.mjs
```

지역 구성: 한국 12, 일본 24, 중국 8, 말레이권 4, 인도네시아 1, 필리핀 4, 태국 5, 남아시아 6, 중동 4, 유럽 16, 아프리카 6, 아메리카 10. 민속의 선악·국경·외형을 고정한 분류가 아니라 검색 편의를 위한 묶음이다. 전체 이름과 사용 후보 장소는 `catalog.tsv`에 있다.
