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

## 실물 3D 브라우저 검사 강제 · PR #9262 후속

- 기존 `qa/vibe2-development-web-browser-smoke.mjs`는 곤충생존기 페이지가 시작되기만 해도 PASS할 수 있었다. 게임 단독 검사에서는 이제 실제 `#insect3d` 캔버스의 **WebGL2 drawing buffer**, 렌더링 완료 프레임, 기존 `#cv` 숨김 여부를 확인한다. 2D 복구 화면만 뜨면 PASS할 수 없다.
- 월드 렌더러는 화면 표시를 변경하지 않는 읽기 전용 진단 `window.insect3DGroundingProof()`를 통해 CC0 바닥 타일 실제 메시 수(12), `THREE.Box3` 변환된 바닥 윗면 Y, 현재 애니메이션 캐릭터 메시의 최저점 Y를 제공한다. 단독 브라우저 QA에서 지표와 캐릭터 접지를 확인하고 기준 위반 시 실패한다.
- 기존 Core QA에서 실행하던 `qa/insect-survival.test.mjs`가 새 `qa/insect-survival-grounding.test.mjs`를 가져오므로 지면 정렬·오류 복구 집중 회귀 8개가 실제 CI 명령에 포함된다.
- 이 추가 검증 코드 자체는 로컬 시뮬레이션에서 통과했지만 **해당 CI 브라우저 검사 결과와 실제 모바일 기기 검증은 아직 별개**이며 미검증 상태를 유지한다.

## 로컬 개발·Vibe 엔진 동기화와 기술 공유

- 기존 시스템의 단일 권위 저장소는 `main`이며, 개발 후보는 별도 브랜치와 PR에서 검증한다. 로컬 Ollama 개발은 `tools/vibe2-local-web-develop.mjs`를 사용하고, 기존 Vibe QA·보안·F0~F9 릴리스 관문과 소유자 병합 승인은 그대로 유지한다.
- **로컬에서 소유자가 직접 승인 PR을 병합**하는 `node tools/vibe2-local-web-develop.mjs --merge-pr=번호` 흐름은 병합 검증 직후 동기화를 시도한다. 로컬이 원본 저장소의 **깨끗한 `main`**이고 원격이 현재 커밋의 후손이며 병합 커밋을 포함할 때만 `git merge --ff-only`를 실행한다. 그 외에는 `LOCAL_MAIN_SYNC=BLOCKED` 로그를 남기고 개발 파일·로컬 브랜치를 덮어쓰지 않는다.
- **웹 GitHub에서 병합한 경우** 원격은 사용자의 로컬 PC를 직접 조작하지 않는다. 다만 소유자가 PC의 `main`에서 기존 로컬 개발 명령(`--check` 또는 `--game=... --goal=...`)을 다음에 실행할 때, 소스 검토·모델 요청에 앞서 `syncLocalMain()`이 **깨끗한 main만 자동 fast-forward**한다. 필요한 시점에 `node tools/vibe2-local-web-develop.mjs --sync-main`으로 단독 동기화할 수도 있다. PC가 꺼져 있거나 개발 도구가 실행되지 않으면 자동으로 동기화되는 것이 아니며, 백그라운드 스케줄러를 새로 만들지 않는다.
- Vibe 엔진과의 **개발 방식 공유**는 새 학습 파이프라인을 생성하지 않는다. 기존 `company-learning/assistant-vibe-coauthoring-log.json`의 `assistant_insect_grounding_cc0_local_vibe_handoff_20261023` 기록과 기존 `tools/company-system-ai-external-learning-feed.mjs` 검증 단계가 연결된다. 현재 `learningState=TRACE_ONLY`; 검증되지 않은 후보 개발을 `PROMOTED`, 모델 학습 성공, 플랫폼별 실기기 QA PASS로 표시하지 않는다.
- 재사용 아이디어: ① CC0 지면 원본의 실제 경계 기준으로 타일 배치 ② 오리지널 리그 모션 실행 **후** 캐릭터 시각 접지 ③ HTML 시작 성공 대신 실 WebGL2 버퍼·캐릭터 바닥 좌표 검사 ④ 모바일 화면 모의뿐 아니라 실제 터치 입력과 동작 상태 변화 검증 ⑤ 실기기 Android/GPU 및 장시간 게임 QA는 별도 검증.
- 곤충생존기 PR #9262는 최신 코드·보안·전체 QA 및 소유자 승인 전까지 `Draft`, `main` 미병합 상태를 유지한다.

## GitHub도 개발 우선: 기존 Vibe 작업 경로 단순화

- 새 GitHub 앱·새 워크플로우를 만들지 않는다. **기존** `.github/workflows/pwa-command-bridge.yml` → `tools/pwa-command-vibe2-task.mjs` → `vibe2` 소스 워커/검증 PR 흐름으로만 소유자 게임 아이디어를 전달한다.
- PWA 또는 인증된 GitHub 소유자 지시를 받으면 `[GITHUB_DEVELOPMENT_FIRST]`와 정확한 게임 ID/기존 소스 루트를 붙인다. 해당 게임의 **코드 수정 → 집중 QA → 실제 3D 브라우저·입력·저장 결과 → 기존 PR 검토** 순서로 실행하고, 무관한 홈페이지/회사 관리/다른 게임/별도 학습 엔진 작업으로 확대하지 않는다.
- `qa/pwa-command-vibe2-task.test.mjs`에서 게임과 소스 경계, 작업 우선순위, 기존 `department=development`·`type=implementation`, 안전 조건 및 기존 검증 증거를 검사한다.
- 실제 게임 소스 수정 없이 보고서나 계획만 작성한 작업은 개발 완료로 취급하지 않는다. 단, 중앙 정책·보안·F0~F9·독립 QA·소유자 승인·기존 릴리스 경로를 절대 생략하지 않는다.
- 이는 개발 작업 **우선순위와 책임 범위만 간결하게 지정**하는 변경이다. CI와 별도의 회사 운영 기능을 삭제하거나 이미 돌아가는 백그라운드 런너를 중단·경감했다고 주장하지 않는다.

## 개발 플랫폼 제외 조건

- 소유자 지시에 따라 **Unity 개발은 수행하지 않는다**. 과거 프로젝트 메타데이터가 있어도 `tools/pwa-command-vibe2-task.mjs`에서 Unity를 우선 선택하지 않는다. 웹 게임 지시는 `web-games/<gameId>`만 사용하고, 웹 소스가 없으면 다른 플랫폼으로 대체하지 않고 차단한다.
- Roblox 개발은 기존 전용 Roblox/Vibe 경로를 유지한다. 이 웹 지시 수신 도구는 Roblox 전용 경로까지 변경하거나 Roblox 소스를 Unity로 변환하지 않는다.
- `qa/pwa-command-vibe2-task.test.mjs`에 기존 Unity 프로젝트가 있어도 웹만 선택하며, 웹 소스가 없으면 fail-closed 처리하는 회귀 테스트를 추가했다.

## 실제 게임 성능 병목과 Vibe 진단 연동 (추가 후보)

- 게임 로컬 WebGL 렌더러(`world3d.mjs`)에 원본 CC0 모델과 애니메이션, 게임 충돌·전투·입력·저장 구조를 유지하면서 **프레임 간격 기반 픽셀 비율 조정**을 추가한다. 모바일은 기존 DPR 상한 1.3과 바닥값 0.8(기기 DPR 이하), 데스크톱은 기존 상한 1.65와 바닥값 1.0(기기 DPR 이하)을 사용한다. 지속적으로 느린 샘플에서만 3D 드로잉 해상도를 줄이고 충분한 회복 샘플이 쌓이면 복원한다. **전투 틱·이동·수집/저장 주기를 낮추지 않는다.**
- 탭이 숨겨졌을 때만 WebGL 렌더 호출을 생략하며, 다시 표시되면 정상적으로 렌더링한다. 캐릭터 발의 실제 메시 접지는 기존 원본 KayKit 리그/애니메이션과 매 프레임 계산을 유지하되, 임시 Box3·카메라 벡터를 재사용한다.
- 수집 노드 수가 변할 때 모든 CC0 자원 클론을 지웠다가 생성하던 부분을 슬롯별 조정으로 변경한다. 자원 유형이 변하면 정확한 CC0 원본 역할·색상을 다시 바인딩하며 유형이 유지되면 기존 메시를 재사용한다. 게임 데이터는 절대 변경하지 않는다.
- 실 Chromium 계측에서 **데스크톱 305 draw calls / 모바일 모의 189 draw calls**가 감지되었다. 이에 따라 안개 거리 너머의 **순수 장식** 나무·버섯·돌만 주기적으로 시각 숨김 처리한다(거리 히스테리시스 적용). 지면 CC0 패널, 플레이어, 곤충, 실제 채집 노드, 전투와 자원 생성 로직은 이 필터를 적용하지 않는다. 개선 후 호출 수는 새 CI 증거로 다시 확인한다.
- 실제 렌더러는 `window.insect3DPerformanceProof()`를 통해 프레임 샘플, WebGL 호출량, 실제 DPR 및 감소·복구 횟수, CC0 노드 재생성 횟수만 읽기 전용으로 제공한다. 기존 `tools/vibe2-performance-sanity.mjs`의 `diagnoseVibeWebFrameBottleneck`이 이를 진단한다. 별도 엔진이나 병렬 학습 시스템은 만들지 않는다.
- 기존 Chromium QA는 데스크톱 WebGL2와 모바일 모의 터치 검증을 유지하고, Vibe 진단 증거 `DEVELOPMENT_WEB_VIBE_BOTTLENECK_DIAGNOSIS_insect-survival`을 추가 기록한다. **소프트웨어 Chromium 결과를 실제 Android GPU FPS나 발열 성능 PASS로 간주하지 않는다.** Vibe 진단은 권고만 제공하고 자동 병합이나 QA 승인으로 승격되지 않는다.

## CC0 바닥 GPU 인스턴싱 성능 개선

- 3D 장면의 **12개 바닥 패널**은 원본 `floor_base.obj`의 형상, 원본 3D 변환, 실제 지면 Y=0을 그대로 유지하면서 **GPU `THREE.InstancedMesh`**로 반복 그리기만 묶는다. 각 원본 CC0 패널은 런타임 접지 증명을 위해 보존한다(중복 렌더링을 피하려고 화면 출력만 숨김).
- InstancedMesh가 없는 환경이거나 바닥 원본의 하위 메시 구조가 달라지면 원래 바닥 패널을 보이도록 유지한다. 모델 원본 파일 및 이동·공격·판정·채집·저장 로직은 변경하지 않는다.
- 브라우저 QA는 기존 바닥의 실제 박스 표면·캐릭터 바닥 높이·모바일 회피 터치 검증에 더해 `floorGpuInstances=12`, 실제 렌더 가능한 `floorGpuVisible=true`, 바닥 메시 인스턴싱 묶음 수를 검사한다.
- Vibe가 읽는 기존 `window.insect3DPerformanceProof()`에 `floorGpuBatches`, `floorGpuInstances`, `renderCalls`를 그대로 노출한다. 기존 로컬 프로그램이나 Vibe 학습/배포 정책을 변경하지 않고 브라우저 실측으로 이전 298/184 draw calls(정적 헤드리스 Chromium 환경)와 비교한다.
- GPU 드로우 호출 수 감소가 **실기기 FPS·발열 개선을 인증하지는 않는다.** 실기기와 장시간 플레이는 별도로 검증해야 한다.

## CC0 장식물 GPU 인스턴싱과 Vibe 실측 병목 제거 후보

- 동일한 **원본 CC0 geometry + 파생 색상 material**을 사용하는 정적인 나무·돌·잎사귀·버섯 표현만 `THREE.InstancedMesh`로 묶는다. 원본 모델 파일과 개별 transform 및 색상·높이는 수정하지 않는다. 스킨 리그, 애니메이션 메시, 다른 geometry/material 및 단독 장식물은 기존 렌더 방식으로 남긴다.
- 이미 존재하던 안개 거리 렌더 최적화는 유지한다. 인스턴스별 거리 판단은 변경된 변환 행렬만 갱신하고, 원본 CC0 장식물의 그룹은 렌더 중복을 방지하기 위해 숨긴다. 이동·전투·곤충·채집 노드·12개 바닥 패널·저장 데이터에는 이 처리를 적용하지 않는다.
- `window.insect3DPerformanceProof()`가 `decorGpuBatches`, `decorGpuInstances`, `decorGpuProps`, 실제 `renderCalls`, `visibleDecor`를 읽기 전용으로 제공한다. 기존 `tools/vibe2-performance-sanity.mjs`에만 측정 결과를 전달한다. 새로운 성능 엔진이나 배포·학습 파이프라인은 만들지 않는다.
- 이전 병합 PR #9323 Chromium 한 장면에서 데스크톱 **284 draw calls**, 모바일 에뮬레이션 **178 draw calls**를 확인했다. 이번 GPU 장식물 묶음 후 감소량은 **같은 WebGL2 브라우저 QA로 재측정하기 전까지 미확정**이다.
- 소프트웨어/에뮬레이터 프레임 기록은 물리 Android 기기의 GPU FPS·발열 인증이 아니며, QA 완료 및 소유자 승인 전에는 별도 후보 PR에서 유지한다. **로컬 PC/파일 변경 없음.**


## 추가 후보: 채집 CC0 모델 GPU 인스턴스 병합

- 기존 병합 #9305/#9323/#9332의 프레임 계측에서 데스크톱 224, 모바일 모의 142 드로우 호출을 확인했다. 장식·지면 일괄 렌더링을 유지하면서 남은 **반복 채집 자원**만 별도 GPU 인스턴스로 묶는다.
- 기존 `index.html`의 권위 있는 채집/리스폰/전투/저장 코드는 변경하지 않는다. 화면용 자원 `Group`은 그대로 남겨두며, 정상 GPU 배치가 준비되면 원본 그룹의 중복 그리기만 숨긴다. `THREE.InstancedMesh`가 없거나 CC0 소재/리그 특성이 맞지 않으면 배치를 끄고 원래 자원 메시를 다시 보이게 한다.
- 메시는 **동일한 원본 geometry + presentation material** 단위로만 합친다. 채집 자원 목록과 좌표/종류가 같으면 GPU 인스턴스 행렬을 프레임마다 다시 업로드하지 않는다. 채집·재생성 변경에는 전체 활성을 재바인딩한다.
- 기존 Vibe 성능 진단은 `resourceGpuBatches`, `resourceGpuModels`, `resourceGpuUpdates`를 **읽기 전용**으로 받아 실제 WebGL 렌더 데이터와 함께 병목을 판단한다. 가상 FPS, 실제 Android 기기 성능, 모델 학습 성공은 주장하지 않는다.
- `qa/insect-survival-performance.test.mjs`의 변경 시 갱신/미변경 시 업로드 생략/오류 시 원본 복구 검사와 기존 Chromium 모바일 터치·캐릭터 접지·게임 저장 검증이 모두 필요하다. 실 브라우저 검사에서 실제 배치 활성화 및 호출 수를 확인하기 전에는 성능 완료로 인정하지 않는다.
