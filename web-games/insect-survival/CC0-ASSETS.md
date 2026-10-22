# 곤충생존기 · CC0 원본 에셋 계보 및 화면 개편

이 게임은 `company-learning/platform-release-roadmap.json#ownerCanonicalRules.rule5`를 따른다. UI는 이전 2.5D 대시보드 CSS를 제거하고 생존 게임형 레이아웃을 다시 배치했다. 3D 렌더러는 게임별 수정(루트 비율·색·카메라·장면 구성)을 적용하지만 원본 자산 바이트를 덮어쓰지 않는다.

## 실제 3D 모델 바인딩

| 용도 | CC0 원본/저장소 경로 | 원본 증거/해시 |
| --- | --- | --- |
| 작은 탐험가 | `assets/roblox/actors/native/rogue.glb` | KayKit Adventures CC0-1.0, 원본 SHA-256 `e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d`, 저장소 파생본 SHA-256 `9b41cc7c6300299d46477fea5175d222bdec0aed5f215d16c1de4d8711761683`; `assets/roblox/actors/manifest.json` |
| 작은 곤충 모델 후보 | `assets/shared/forest/caterpillar.glb` | Kenney Cube Pets CC0-1.0, SHA-256 `7a8f6d5e4fb6bd6f073334a2425b559eaaa2d5de3749ccc373a53621006a2c4f` |
| 거미 모델 | `assets/shared/forest/monster-53.obj` | isaiah658 50+ Monsters Pack 3D CC0-1.0, SHA-256 `73a08230391b74ee9293619e63ca7ab9f183282d7bf64d56a6668d12b8ad1d53` |
| 거대한 나무 소품 | `assets/shared/homely-house/tree_large.obj` | Tiny Treats Homely House CC0, 공용 라이브러리 `external-tinytreats-tree-large-v1`, 원본 SHA-256 `33b7a5a40b579a6790bea2662ff51ae2fcb2e5736c153337c6e760e46d351e3d`; [고정 원본 CC0 증거](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0/blob/75ad29a12b4e26dd1c7abda1e1486d6d731d8e16/LICENSE.txt). 기존 Quaternius tree.fbx를 이 게임의 나무 표현에서만 교체. 원본 파일은 다른 소비자 확인 전 삭제하지 않음. |
| 버섯 소품 | `assets/shared/forest/mushroom.fbx` | Quaternius Cute Animated Monsters CC0-1.0, SHA-256 `d329b5cdc503c500aa9d915969e228fed103597f3885a7b0b9ee1aa0f1406158` |
| 바닥·자갈·잎사귀 | `assets/shared/homely-house/floor_base.obj`, `assets/shared/homely-house/cobblestones.obj`, `assets/shared/homely-house/foliage_A.obj` | Tiny Treats Homely House CC0, 저장소 출처: `assets/asset-license-ledger.json#tinytreats-homely-house-cc0-v1`, 원본 commit `75ad29a12b4e26dd1c7abda1e1486d6d731d8e16`; 개별 원본 blob/해시는 `company-asset-library.json`에서 재확인 필요 |

원본 증거: [Kenney Cube Pets](https://opengameart.org/content/cube-pets), [Quaternius Textured Cute Monsters](https://opengameart.org/content/textured-cute-monster-pack), [isaiah658 Monsters](https://opengameart.org/content/50-monsters-pack-3d), [KayKit Character Pack Adventures](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), [Tiny Treats Homely House](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0/tree/75ad29a12b4e26dd1c7abda1e1486d6d731d8e16).

## 게임별 파생·시각화

- 원본 삼각형·리깅을 유지하면서 `world3d.mjs#derived`의 **크기 정규화·비파괴 색 보정·재질·월드 위치·카메라 추적**만 변경한다. 이 파생은 **브라우저 메모리에서 생성**되므로 별도의 배포용 파생 GLB·SHA-256은 아직 없다. 최종 에셋 검증은 해당 게임 렌더러 소스 해시와 실제 런타임 화면을 묶어야 한다.
- 원본 캐릭터 및 곤충 모델은 이 단계에서 **정적 소스와 코드 연결만 확인**되며 정확한 종별 외형/애니메이션·모바일 실기기 QA는 **미완료**다. 특히 개미·딱정벌레·진드기는 Kenney CC0 caterpillar 원본을 임시 시각 프록시로 파생했으므로 **종별 완성 아트 PASS를 주장하지 않는다.** 검증된 해당 종 CC0 원본 확보 전까지 아트 완료가 아니다.
- 기존 2D 렌더러는 정상 3D 로딩 후 숨겨지며, 3D 자산 로딩 실패 시 기존 저장·조작·전투 기능을 살리는 장애 복구 수단으로만 남는다. 과거 HUD CSS는 제거했다.
- 게임 규칙·저장 키 `jaewoon_insect_survival_v3`는 유지한다. 추가 레벨/특성은 기존 상태 데이터에 기본값 병합으로 확장한다.
- 다른 게임이 사용하는 공용 모델을 삭제하거나 변경하지 않는다. 자체 제작 저품질 모델의 영구 삭제는 소비자 조사·CC0 대체 실기기 검증 후 필요한 경우 별도로 수행한다.

## CC0 액션 연결 점검

찌르기·회전 베기·회피·피격·사망은 원본 KayKit 클립을 사용한다. 이동·대기는 반복하고 액션·사망은 단발 재생한다. 성공한 게임 행동의 표현용 일련번호로 연속 공격을 재시작하며, 실패한 스킬 입력은 모션을 재시작하지 않는다. 모션 메타데이터는 플레이어 저장 레코드에 추가하지 않는다. 실제 화면·모바일 모션 품질은 별도 검증 전까지 미확인이다.

## 지형 침하 오류 수정 · 로컬 그래픽 참고

- 기존 `floor_base.obj`의 실제 로컬 경계는 X=-5..5, Y=-0.5..0, Z=-4..4이다. 기존 0.18 높이로 크기를 정규화한 뒤 X/Z를 13.8배 확장하면 한 장의 땅 크기가 약 49.7×39.7이 되며, 14 간격으로 배치된 지형이 겹친다. Y 윗면 또한 캐릭터 발보다 0.18 높아서 파묻히는 표현이 생긴다.
- `world3d.mjs`는 **CC0 원본을 손대지 않고** 정규화된 원본 모델의 `Box3` 경계를 측정해 X/Z 실측 비율별 14 간격 타일로 맞춘다. 타일 윗면 Y=0, 캐릭터·곤충·자원 원점 Y=0.035로 고정한다. 원본 타일의 모서리 틈 아래에는 Y=-0.025의 로컬 3D 메시를 깔아 비어 보이는 곳만 메운다. 캐릭터 공격 판정·세계좌표·세이브는 바꾸지 않는다.
- 로컬 그래픽 후속 제작은 기존 Blender 기반 책임 파일 `assets/native-authoring/build-game-visual.py`를 참고한다. 원본 CC0의 라이선스, 원본 SHA-256, 부모 자산 ID를 추적하고 모델이 **미터 단위 / Y축 높이 / 바닥 접점 Y=0 / 애니메이션 리그 원점**을 유지하도록 검증해야 한다. 출력 파일은 승인된 기존 GRAPHICS_PRODUCTION 경로에서만 만들며 새 자산으로 간주해 검증 없이 배포하지 않는다.
- 자동 회귀 `qa/insect-survival-grounding.test.mjs`는 실제 원본 OBJ 경계와 소스 코드의 좌표·애니메이션 유지 조건을 검사한다. **실제 모바일 브라우저의 3D 렌더링·성능·접지 장면 검증은 별도**로 필요하며 아직 PASS가 아니다.

## 런타임 오류 복구 보강

- WebGL 컨텍스트 손실(`webglcontextlost`) 또는 3D 프레임 렌더링 예외 발생 시 `insectScene3DReady=false`로 되돌리고 `#cv` 2D 원본 캔버스를 다시 보이게 한다. 3D 캔버스는 숨기며 전투·제작·저장 로직은 계속 원래 `index.html`에서 실행한다.
- 로딩 실패도 같은 복구 함수로 처리한다. 복구 검증은 `qa/insect-survival-grounding.test.mjs`에 추가했고 총 7개 집중 검사를 확인했다. 이는 오류 상황 모의 검증이며 WebGL 컨텍스트 재생성이나 실제 모바일 장면 QA 완료를 뜻하지 않는다.
- 2026-10-22 기준 브라우저 시작 smoke 기록에서 `DEVELOPMENT_WEB_BROWSER_GAME=insect-survival` 및 `DEVELOPMENT_WEB_BROWSER_SMOKE=PASS`를 확인했다. 이는 이전 후보 커밋에 대한 시작 검사이므로 최신 코드와 실기기 접지 결과를 인증하지 않는다.
