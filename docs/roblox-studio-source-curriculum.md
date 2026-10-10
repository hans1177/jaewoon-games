# Roblox 제작 지식과 응용 코드

총 70개 주제: 기존 내부 소스와 연결되는 기본·응용·고급 20개 주제에 직접 작성한 스튜디오 제작 응용 예제 50개를 추가한다. 이 목록은 현재 범위의 교육 자료이며 Roblox의 모든 기술을 망라하거나 실제 게임 품질을 인증하지 않는다.

## 사용하는 경로

- 내부 소스: `tools/vibe3-roblox-distillation.mjs`의 `buildRobloxSourceCurriculum`이 현재 함수·경로·소스 해시와 원리/응용/실패/검증 항목을 연결한다.
- 고급 예제: `tools/vibe3-roblox-studio-lessons.mjs`의 각 ID에 직접 작성한 Luau 함수와 적용 전제조건이 있다. 통째로 교체할 완성 서브시스템이 아니다.
- 바이브: 기존 `buildRobloxSourceCoaching`이 현재 책임 파일이 있을 때 작업 관련 예제를 최대 2개, 코드 합계 3,200바이트까지 넣는다. 내부 단일 오브젝트 모션 작업은 기존 전용 코칭을 사용한다.
- 기록: 예제 코드의 SHA-256과 메타데이터만 결과에 남긴다. 실제 코드 본문은 저장소에서 읽어 프롬프트에 사용하며 검증 학습 원장에 넣지 않는다.
- 검증: 기존 Core QA의 practice 실행기가 공식 Luau 컴파일러로 전 예제를 컴파일하고 순수 로직의 경계 사례를 실행한다. Roblox Studio 실행·다중 클라이언트·모바일·실제 품질 검증은 별도로 필요하다.
- 기존 검증 증류의 exact revision/artifact/runtime/regression 조건과 승격 권한은 그대로 유지한다. 모델 가중치 학습 완료를 뜻하지 않는다.

## 고급·스튜디오 제작 50개

| ID | 주제 | 분야 |
|---|---|---|
| REMOTE_PAYLOAD_SCHEMA | 리모트 입력 검증 | SECURITY |
| SERVER_RATE_LIMIT | 서버 요청 속도 제한 | SECURITY |
| SERVER_INTERACTION_GATE | 상호작용 권한과 거리 | SECURITY |
| SAVE_SCHEMA_MIGRATION | 저장 스키마 마이그레이션 | PERSISTENCE |
| SAVE_SESSION_FENCE | 저장 세션 소유권 | PERSISTENCE |
| BOUNDED_BACKOFF | 제한 있는 재시도 | PERSISTENCE |
| IDEMPOTENT_REWARD_COMMIT | 중복 보상 차단 | PERSISTENCE |
| REPLICATION_GENERATION_SEQUENCE | 복제 순서와 세대 | NETWORK |
| SNAPSHOT_INTERPOLATION | 스냅샷 보간 | NETWORK |
| STREAMED_TAG_LIFETIME | 스트리밍 오브젝트 수명 | WORLD |
| PHYSICS_NETWORK_OWNER | 물리 네트워크 소유권 | PHYSICS |
| PROJECTILE_SEGMENT_QUERY | 고속 발사체 충돌 | COMBAT |
| PATH_REQUEST_GENERATION | 경로 계산 취소와 최신성 | AI |
| AI_STATE_TRANSITIONS | 몹 상태 머신 | AI |
| TARGET_HYSTERESIS | 타깃 선택 안정화 | AI |
| SPATIAL_HASH_NEIGHBORS | 공간 분할 군집 조회 | PERFORMANCE |
| FIXED_STEP_COSMETICS | 고정 간격 보조 시뮬레이션 | PERFORMANCE |
| LOCAL_POSE_COMPOSITION | 관절 로컬 포즈 합성 | ANIMATION |
| FOOT_CONTACT_TARGET | 발 접지와 IK 타깃 | ANIMATION |
| ACTION_TIMELINE_PRESENTATION | 공격 예비·타격·회복 타이밍 | ANIMATION |
| LEASED_EFFECT_REUSE | 이펙트 재사용과 오래된 콜백 | VFX |
| COSMETIC_LOD_HYSTERESIS | 장식 LOD와 모바일 예산 | VFX |
| PARALLEL_PURE_COMPUTE | 병렬 계산과 직렬 반영 | PERFORMANCE |
| SCOPED_PROFILING | 프로파일 구간과 오류 정리 | PERFORMANCE |
| DETERMINISTIC_GENERATION | 재현 가능한 절차 생성 | WORLD |
| OWNED_RESOURCE_CLEANUP | 연결·타이머·인스턴스 소유권 | ARCHITECTURE |
| STUDIO_UNDO_TRANSACTION | 스튜디오 편집 도구 Undo | TOOLING |
| INPUT_ACTION_OWNERSHIP | 모바일·패드 공통 입력 | INPUT_UI |
| CAMERA_FRAME_INDEPENDENT_DAMPING | 프레임 독립 카메라 감쇠 | CAMERA |
| ANIMATION_MARKER_LIFETIME | 애니메이션 마커와 재생 수명 | ANIMATION |
| INTERNAL_ASSET_RESOLUTION | 내부 자산 매니페스트 바인딩 | ASSETS |
| WORLD_CIRCULATION_GRAPH | 월드·로비 동선과 연결성 | WORLD_DESIGN |
| LOBBY_SPACE_ALLOCATION | 로비 공간 활용과 여백 | WORLD_DESIGN |
| PLACEMENT_CLEARANCE | 배치 간격과 통행 여유 | WORLD_DESIGN |
| DISTANCE_SCREEN_READABILITY | 거리감과 화면상 크기 | WORLD_DESIGN |
| BALLISTIC_UNITS_AND_TIME | 중력·속도·시간의 일관성 | PHYSICS |
| MASS_AWARE_KNOCKBACK | 질량을 고려한 넉백 | PHYSICS |
| UI_NAVIGATION_STACK | 메뉴 깊이와 뒤로가기 | INPUT_UI |
| RESPONSIVE_UI_GRID | 반응형 UI 배치 | INPUT_UI |
| MENU_PROGRESSIVE_DISCLOSURE | 정보 깊이와 점진적 공개 | INPUT_UI |
| ECONOMY_BALANCED_JOURNAL | 게임 경제·회계 원장 | ECONOMY |
| ECONOMY_SOURCE_SINK_MODEL | 재화 유입·소모와 구매 시간 | ECONOMY |
| DAMAGE_MODIFIER_PIPELINE | 데미지 계산 순서 | BALANCE |
| STAT_DIMINISHING_RETURNS | 능력치 성장과 한계 효용 | BALANCE |
| ENCOUNTER_BUDGET | 몹 배치와 전투 압력 | BALANCE |
| VISUAL_HIERARCHY_ROLES | 미적 구성과 시선 우선순위 | ART_DIRECTION |
| STYLE_GRAMMAR_PROFILES | 다양한 화풍의 일관된 제작법 | ART_DIRECTION |
| PALETTE_ROLE_CONSISTENCY | 팔레트 역할과 의미 일관성 | ART_DIRECTION |
| DEPTH_LIGHTING_LAYERS | 조명·대기감과 공간 깊이 | ART_DIRECTION |
| REGRESSION_ACCEPTANCE_MATRIX | 소스·실행·회귀 증거 연결 | QA |

## 적용과 확인 순서

1. 현재 책임 파일과 실제 소유자, 데이터·리그·시계·좌표계 전제를 확인한다.
2. 작업에 맞는 원리와 함수만 응용하고 게임의 기존 상태·저장·공격 소유권에 통합한다.
3. 각 항목의 failureMode와 transferCheck를 기준으로 정상·실패·중단·재접속 사례를 실행한다.
4. 실제 수정 소스와 동일한 아티팩트의 native 실행·전후 화면·다중 클라이언트·성능 결과를 연결한다.
5. 기존 검증 경로를 통과한 결과만 학습·적용 성과로 집계한다. 코드 열람·작업 배정·실행기 종료는 성과가 아니다.

## API 확인 출처

예제는 직접 작성했다. API 동작은 2026-10-05 Roblox Creator Hub의 아래 문서를 확인했다.

- https://create.roblox.com/docs/scripting/security/client-server-boundary
- https://create.roblox.com/docs/cloud-services/data-stores
- https://create.roblox.com/docs/reference/engine/classes/CollectionService
- https://create.roblox.com/docs/physics/network-ownership
- https://create.roblox.com/docs/reference/engine/classes/WorldRoot
- https://create.roblox.com/docs/characters/pathfinding
- https://create.roblox.com/docs/scripting/multithreading
- https://create.roblox.com/docs/reference/engine/classes/ChangeHistoryService
- https://create.roblox.com/docs/reference/engine/classes/ContextActionService
- https://create.roblox.com/docs/reference/engine/classes/AnimationTrack

## 추가 요청 범위

월드·로비 동선/면적/통행 여유, 원근 거리감, 중력·넉백, 메뉴 깊이/정보 공개/반응형 UI, 경제 원장·유입/소모, 데미지/능력치/전투 배치, 구도/팔레트/조명 깊이와 8가지 화풍 제작 규칙을 포함한다. 화풍은 실제 내부 자산의 형태·텍스처·재질·조명 작업으로 구현하고 같은 카메라에서 비교해야 한다. 표의 수치는 튜닝 예시이며 미적 품질이나 밸런스의 자동 합격 기준이 아니다.


## 3D 메쉬·모션 외부 연구 응용 (2026-10-10)

이 문서는 **기존 내부 파이프라인의 알고리즘 응용 근거**만 기록한다. 아래 논문의 학습된 모델·가중치가 실제로 실행됐다는 의미는 아니고, 정식 원본/상업 이용권과 GPU 요건을 충족하기 전에는 자동 생성 PASS로 승격하지 않는다.

| 근거 | 기존 책임 경로 | 실제 응용 내용 | 제한 |
| --- | --- | --- | --- |
| [RigMo (CVPR 2026)](https://openaccess.thecvf.com/content/CVPR2026/html/Zhang_RigMo_Unifying_Rig_and_Motion_Learning_for_Generative_Animation_CVPR_2026_paper.html) | `assets/vibe-motion-director.js` | 휴머노이드/크리처 리그 정합성, 스킨 바인딩, 골격 길이 변화 계측 | 합동 신경망 추론·오토리깅을 실행한 것은 아님 |
| [PhysSkin (CVPR 2026)](https://openaccess.thecvf.com/content/CVPR2026/html/Lei_PhysSkin_Real-Time_and_Generalizable_Physics-Based_Animation_via_Self-Supervised_Neural_Skinning_CVPR_2026_paper.html) | 동일 기존 QA | 스킨 가중치 정규화 편차 및 관절 변형의 근거 필수화 | 학습된 스킨 신경망은 별도 라이선스·설치·검증 필요 |
| [MotionMaster (CVPR 2026)](https://openaccess.thecvf.com/content/CVPR2026/html/Jiang_MotionMaster_Generalizable_Text-Driven_Motion_Generation_and_Editing_CVPR_2026_paper.html) | `assets/vibe-motion-director.js` | 기존 모션 DNA·액션 단계·합성/전환 의미 정합성 유지 | 자연어→모션 기반 모델 학습/실행 주장이 아님 |
| [PhyMotion (2026)](https://arxiv.org/abs/2605.14269) | 기존 모션 접촉 QA | 무게중심 지지영역 이탈, 관절 변화율, 접촉·균형 위반 증거 | MuJoCo 물리 시뮬레이션은 미실행 |
| [Hunyuan3D 2.1 논문 (2025)](https://arxiv.org/abs/2506.15442) | `assets/native-authoring/build-game-visual.py` | 실제 GLB의 UV·노멀·PBR 재질 채널·다중 시점 렌더 검증 | [원본 라이선스](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE)가 **대한민국을 제외**하므로 모델·코드·가중치 사용 금지 |

- [DeepMotion 발 고정 공식 설명](https://www.deepmotion.com/post/animate-3d-v2-6-release-foot-locking-modes): Auto/Always/Never/Grounding 모드의 구분을 참고하고 기존 `author-motion.py`의 접지·도약·낙하 동작별 타당성에 적용한다. DeepMotion 클라우드 추론은 연결하지 않았다.
- Cascadeur의 AutoPhysics/포즈 보정과 [Blender 커뮤니티의 리타겟 문제 사례](https://www.reddit.com/r/blender/comments/1u9470x/feet_slipping_mocap_correction/), [Cascadeur 반입/내보내기 리그 오류](https://www.reddit.com/r/Cascadeur/comments/1rvk6as/glitches_when_importing_cascadeur_animations_into/)를 참고해 엉덩이·다리 길이/레스트 포즈 불일치, 발 접촉 위치 및 튀는 관절 검사 항목을 추가한다. 상용 Cascadeur 엔진 알고리즘을 복제하지 않는다.
- 실제 GLB 미리보기는 기존 `asset-library.html`, `assets/asset-library.js`, `assets/asset-library-viewer.js` 안에서 동작한다. 원본 스킨 메시와 내장 애니메이션을 사용하며, 라이브러리 미리보기 자체를 게임 플랫폼 런타임 QA로 간주하지 않는다.
- 기존 대미지·이동·충돌·저장·게임 세이브·권한 흐름은 그대로 두고 별도의 새 파이프라인·모델 서버·게임 워커는 만들지 않는다. 품질 판정은 기존 F0~F9 런타임·모바일 증거로만 가능하다.
