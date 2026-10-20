# 곤충생존기 · CC0 원본 에셋 계보 및 화면 개편

이 게임은 `company-learning/platform-release-roadmap.json#ownerCanonicalRules.rule5`를 따른다. UI는 이전 2.5D 대시보드 CSS를 제거하고 생존 게임형 레이아웃을 다시 배치했다. 3D 렌더러는 게임별 수정(루트 비율·색·카메라·장면 구성)을 적용하지만 원본 자산 바이트를 덮어쓰지 않는다.

## 실제 3D 모델 바인딩

| 용도 | CC0 원본/저장소 경로 | 원본 증거/해시 |
| --- | --- | --- |
| 작은 탐험가 | `assets/roblox/actors/native/rogue.glb` | KayKit Adventures CC0-1.0, 원본 SHA-256 `e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d`, 저장소 파생본 SHA-256 `9b41cc7c6300299d46477fea5175d222bdec0aed5f215d16c1de4d8711761683`; `assets/roblox/actors/manifest.json` |
| 작은 곤충 모델 후보 | `assets/shared/forest/caterpillar.glb` | Kenney Cube Pets CC0-1.0, SHA-256 `7a8f6d5e4fb6bd6f073334a2425b559eaaa2d5de3749ccc373a53621006a2c4f` |
| 거미 모델 | `assets/shared/forest/monster-53.obj` | isaiah658 50+ Monsters Pack 3D CC0-1.0, SHA-256 `73a08230391b74ee9293619e63ca7ab9f183282d7bf64d56a6668d12b8ad1d53` |
| 거대한 풀숲 소품 | `assets/shared/forest/tree.fbx` | Quaternius Cute Animated Monsters CC0-1.0, SHA-256 `03330f2622b48c465447e8314aabdd2c7533a4af9f41d2bd765c52a23f237cc6` |
| 버섯 소품 | `assets/shared/forest/mushroom.fbx` | Quaternius Cute Animated Monsters CC0-1.0, SHA-256 `d329b5cdc503c500aa9d915969e228fed103597f3885a7b0b9ee1aa0f1406158` |
| 바닥·자갈·잎사귀 | `assets/shared/homely-house/{floor_base,cobblestones,foliage_A}.obj` | Tiny Treats Homely House CC0, 저장소 출처: `assets/asset-license-ledger.json#tinytreats-homely-house-cc0-v1`, 원본 commit `75ad29a12b4e26dd1c7abda1e1486d6d731d8e16`; 개별 원본 blob/해시는 `company-asset-library.json`에서 재확인 필요 |

원본 증거: [Kenney Cube Pets](https://opengameart.org/content/cube-pets), [Quaternius Textured Cute Monsters](https://opengameart.org/content/textured-cute-monster-pack), [isaiah658 Monsters](https://opengameart.org/content/50-monsters-pack-3d), [KayKit Character Pack Adventures](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), [Tiny Treats Homely House](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0/tree/75ad29a12b4e26dd1c7abda1e1486d6d731d8e16).

## 게임별 파생·시각화

- 원본 삼각형·리깅을 유지하면서 `world3d.mjs#derived`의 **크기 정규화·비파괴 색 보정·재질·월드 위치·카메라 추적**만 변경한다. 이 파생은 **브라우저 메모리에서 생성**되므로 별도의 배포용 파생 GLB·SHA-256은 아직 없다. 최종 에셋 검증은 해당 게임 렌더러 소스 해시와 실제 런타임 화면을 묶어야 한다.
- 원본 캐릭터 및 곤충 모델은 이 단계에서 **정적 소스와 코드 연결만 확인**되며 정확한 종별 외형/애니메이션·모바일 실기기 QA는 **미완료**다. 특히 개미·딱정벌레·진드기는 Kenney CC0 caterpillar 원본을 임시 시각 프록시로 파생했으므로 **종별 완성 아트 PASS를 주장하지 않는다.** 검증된 해당 종 CC0 원본 확보 전까지 아트 완료가 아니다.
- 기존 2D 렌더러는 정상 3D 로딩 후 숨겨지며, 3D 자산 로딩 실패 시 기존 저장·조작·전투 기능을 살리는 장애 복구 수단으로만 남는다. 과거 HUD CSS는 제거했다.
- 게임 규칙·저장 키 `jaewoon_insect_survival_v3`는 유지한다. 추가 레벨/특성은 기존 상태 데이터에 기본값 병합으로 확장한다.
- 다른 게임이 사용하는 공용 모델을 삭제하거나 변경하지 않는다. 자체 제작 저품질 모델의 영구 삭제는 소비자 조사·CC0 대체 실기기 검증 후 필요한 경우 별도로 수행한다.
