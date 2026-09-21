# Unity Web 1차 게임 중앙 동기화 문서

> 이 문서는 새 독립 정책이 아니다. 기계 정책 권한 원본은 `company-learning/platform-release-roadmap.json#unityWebFirstStage`다. 이 문서는 Vibe Maker, Unity 원본, Web 빌드, QA, 후속 플랫폼 플로우가 같은 규칙을 보도록 묶는 실행/동기화 문서다.

## 적용 범위

변경 대상은 **1차 Web 게임 제작/검증 단계만**이다.

```text
설계 PASS
→ Unity 프로젝트 제작
→ Unity Web Build
→ 모바일/PC 브라우저 1차 테스트
→ Unity Web 검증 관문
→ 기존 플랫폼별 후속 개발
→ 런타임
→ 독립 QA
→ 회귀검증
→ 내부 배포
→ 공개 배포
→ 사후검증
```

Unity Web 이후의 Roblox / Unity Android / Fortnite UEFN 후속 플로우는 기존 구조를 유지한다.

## 소스 권한

- Canonical Source: `unity-games/<gameId>/`
- Web Build Output: `web-games/<gameId>/`
- `web-games/<gameId>/`는 직접 HTML/JavaScript/Canvas 게임을 작성하는 원본 경로가 아니다.
- Unity Web 검증 완료 뒤에는 Unity 프로젝트가 본체다.
- 기존 HTML/Canvas/PlayCanvas 버전은 마이그레이션 중 참고/비교/비상 폴백으로만 보존한다.

## Unity 대상 게임

Unity 대상 게임은 Web판과 Android판을 따로 만들지 않는다.

```text
unity-games/<gameId>/
├─ Unity Web Build → web-games/<gameId>/
└─ Android Build → APK/AAB
```

Scene, Prefab, C#, ScriptableObject, Animator, Material, VFX, UI, 전투, AI, 퀘스트, 인벤토리, 게임 데이터는 같은 프로젝트를 사용한다.

## Roblox / UEFN 대상 게임

Unity Web은 공통 1차 실행/검증 표면일 뿐 Roblox나 UEFN 런타임을 대체하지 않는다.

- Unity Web PASS → 기존 Roblox 구현/런타임/독립 QA/회귀
- Unity Web PASS → 기존 UEFN 구현/런타임/독립 QA/회귀
- Unity Web PASS는 Roblox PASS 또는 UEFN PASS로 승격되지 않는다.

## Vibe Maker 동기화

Vibe Maker의 1차 게임 제작 기본 지식은 다음을 우선한다.

- C#
- Unity Scene
- Prefab
- MonoBehaviour
- ScriptableObject
- Animator
- Material
- Particle System
- Unity UI
- Input System
- Physics
- NavMesh / AI
- Audio
- Lighting
- Camera
- Unity Web Build
- 모바일 Web 최적화

HTML/CSS/JavaScript/Canvas/DOM 중심 직접 게임 제작은 신규 1차 Web 기본 경로에서 제외한다.

Vibe의 성공/실패 학습도 Unity Web 실제 실행 결과를 기존 verified RAG → trajectory → canonical distillation 체인으로만 반영한다. 별도 Unity Web 학습 파이프라인, shadow dataset, 별도 cron은 만들지 않는다.

## 기본 Unity 프로젝트 구조

```text
Assets/
├─ Scenes/
├─ Scripts/
├─ Prefabs/
├─ Art/
├─ Materials/
├─ Animations/
├─ Audio/
├─ UI/
├─ Data/
└─ Editor/
```

필요 시 `Assets/Addressables/`를 사용한다.

## 입력

모바일 입력은 Unity 프로젝트 내부에서 구현한다.

- Unity Input System
- On-Screen Stick
- On-Screen Button
- Pointer / Touch
- 필요 시 자체 Virtual Joystick

`_worker.js` 공통 조이스틱 주입은 장기 기본 입력 구조로 사용하지 않는다.

## 그래픽

1차 Web이라고 도형 중심 게임을 만들지 않는다.

우선순위:

```text
실제 게임 에셋
→ 부족한 부분만 임시 에셋
→ 디버그/충돌체 등 필요한 경우에만 Primitive
```

최종 검증 화면에서 플레이어, 몬스터, 환경, UI, VFX 등 핵심 표현이 placeholder 위주면 PASS하지 않는다.

## Unity Web QA

최소 확인:

1. Web Build 로딩
2. 첫 프레임
3. 시작 버튼
4. 모바일 입력
5. 플레이어 이동
6. 카메라
7. 공격
8. 적 피격
9. 적 사망
10. HP/XP/골드 등 상태
11. UI 버튼
12. 퀘스트
13. 포탈/맵 이동
14. 저장/로드 필요 시
15. Critical Console Error 없음
16. WebAssembly 오류 없음
17. 메모리 크래시 없음
18. Android Chrome
19. 필요 시 iOS Safari
20. 실제 장르 핵심 재미 증거

관문:

```text
Boot PASS
+ Input PASS
+ Gameplay PASS
+ Core Fun PASS
+ Mobile PASS
+ Performance PASS
+ No Critical Runtime Error
```

실패 시 `REPAIR_REQUIRED`로 즉시 돌아가 수정 후 재검증한다. 재시도 횟수 제한은 두지 않는다.

## 멀티플레이

브라우저 호환 통신만 1차 Web 핵심 경로에 사용한다.

- WebSocket / HTTPS / 브라우저 호환 Realtime
- 실제 2명 이상 검증
- 이동 동기화
- 전투 동기화
- 입장/퇴장

Web에서 지원되지 않는 네이티브 Socket API를 핵심 Web 흐름에 의존하지 않는다.

## Cloudflare

Unity Web 배포가 정상 동작하도록 다음을 관리한다.

- `.wasm`
- `.data`
- `.framework.js`
- `.loader.js`
- `.json`
- StreamingAssets
- MIME type
- Cache-Control
- Content-Encoding
- Range
- 필요한 CORS
- Service Worker 캐시

## 성능

Unity Web은 Android보다 보수적인 예산을 사용한다.

- Texture Max Size / Compression
- Mesh Poly Count
- Draw Calls
- Material 수
- Shader 복잡도
- Shadow Distance
- Realtime Light 수
- Particle 수
- Audio 크기
- Scene 메모리
- Object Pooling
- Garbage Allocation
- Addressables / AssetBundle 필요 여부
- Web 메모리

목표는 Web에서 안정 실행되고, 같은 프로젝트의 Android 빌드에서는 더 높은 품질 설정을 사용할 수 있는 구조다.

## 대충 RPG

`daechung-rpg` 기준 본체는 `unity-games/daechung-rpg/`다.

기존 PlayCanvas/기존 Web 버전은 삭제하지 않고 마이그레이션 동안 참고/비교/비상 폴백으로 보존한다.

기본 공개 Web 경로는 Unity Web 검증 완료 후:

`/web-games/daechung-rpg/`

로 유지한다.

## 동기화 대상

이 문서와 함께 아래가 같은 의미를 유지해야 한다.

- `company-learning/platform-release-roadmap.json#unityWebFirstStage`
- `company-learning/vibe3-engine-contract.json#unityWebFirstStage`
- `company-learning/VIBE3_ENGINE.md`
- `unity-games/README.md`
- `COMPANY_FLOW.md`
- `.github/workflows/vibe3-engine-contract.yml`

충돌 시 `platform-release-roadmap.json`의 기계 계약이 우선한다.


## Unity Web 자동 QA 입력 계약

브라우저 자동 QA는 게임 상태를 임의 조작하지 않는다.

`?qa=1`에서 다음 키를 표준 테스트 입력으로 사용한다.

- `Digit1`: 실제 게임의 첫 플레이/첫 전투/첫 핵심 장면 진입
- `Space`: 실제 게임의 핵심 행동
- `KeyR`: 실제 게임의 안전 복귀/리셋

각 게임은 위 입력을 자기 기존 게임 함수에 연결한다. QA 전용 가짜 보상, 가짜 승리, 상태 직접 덮어쓰기는 금지한다.

표준 콘솔 증거 접두사는 `JAEWOON_UNITY_WEB_QA`다.

허용 증거:

- 부팅: `BOOT`
- 상태: `STATE`
- 플레이 진입: `START` 또는 `REGION`
- 핵심 행동: `ACTION` 또는 `ATTACK`
- 진행/보상: `PROGRESS` 또는 `REWARD`
- 실제 모바일 컨트롤 위치: `MOBILE_TARGET role=action x=<0..1> y=<0..1>`
- 실제 Pointer/Touch가 그 컨트롤을 작동시킨 결과: `MOBILE_INPUT role=action status=PASS`
- 장르 핵심 루프가 실제 상태 진행까지 완료된 결과: `CORE_FUN status=PASS loop=<genre-specific-loop>`

`Digit1 / Space / KeyR`는 자동화가 기존 게임 함수를 호출하기 위한 QA 입력일 뿐이다. 이 키 입력만으로 `Mobile PASS` 또는 `Core Fun PASS`를 만들 수 없다.

브라우저 검증기는 실제 Chromium touch event를 `MOBILE_TARGET`이 가리키는 실제 Unity 화면 컨트롤에 전달하고, 그 뒤 실제 게임이 `MOBILE_INPUT`을 기록했는지 확인한다. `CORE_FUN`은 시작 버튼이나 단순 액션 호출이 아니라 장르 핵심 루프의 실제 완료/진행/보상 상태에서만 기록한다.

실제 브라우저 검증기는 `tools/company-unity-web-gameplay-validation.mjs`를 사용한다.

초기 키보드 자동화만으로 최종 `Core Fun PASS`를 주장하지 않는다. 실제 터치 증거 + 실제 진행 증거 + 장르별 `CORE_FUN` 증거가 함께 있을 때만 자동 관문의 Core Fun/Mobile 항목을 만족할 수 있다. 최종 Unity Web 관문은 Boot/Input/Gameplay/Core Fun/Mobile/Performance/No Critical Runtime Error 전체를 만족해야 한다.
