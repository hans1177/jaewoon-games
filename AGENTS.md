# 재운컴퍼니 AI 작업 규칙

## 바이브2 ↔ 재운컴퍼니 한몸 동기화
- 바이브2와 재운컴퍼니는 별도 운영체계가 아니라 같은 `hans1177/jaewoon-games` 저장소를 단일 진실 소스로 사용하는 하나의 제작 시스템이다.
- 바이브2는 제작 규칙·에셋 검증·workbench·orchestrator·안전 실행계약을 담당하고, 재운컴퍼니는 사용자 지시 우선순위·부서 배정·구현·QA·빌드·운영 상태를 담당한다.
- 바이브2는 초안 전용 도구가 아니라 회사 전체 제작·분석·구현·그래픽·QA·검증에 쓰는 공용 핵심 엔진이다. 아트북 PROPOSAL은 그중 하나의 단계다.
- 모든 게임 제작/수정 작업은 재운컴퍼니가 지시를 받은 뒤 바이브2 규칙과 실행계약을 통과해서 실행한다. 회사가 바이브2 보호 규칙을 우회하는 별도 작업 경로를 만들지 않는다.
- `COMPANY_FLOW.md`와 `assets/vibe-company-orchestration-bridge.js`가 재운컴퍼니 단계와 바이브2 workbench/orchestrator를 연결하는 공식 브리지다.
- 바이브2 제작 규칙 변경은 같은 저장소의 `AGENTS.md`, `ASSET_RULES.md`, `assets/animated-assets.json`, 관련 vibe 모듈을 통해 재운컴퍼니 작업에 즉시 적용한다. 같은 규칙을 다른 파일에 복제해 따로 유지하지 않는다.
- 재운컴퍼니의 사용자 지시, 진행 상태, 빌드 상태는 `company-directive.json`, `company-status.json`에 기록하고 바이브2 실행계약은 이 운영 상태와 충돌하지 않게 따른다.
- 새 사용자 지시는 모든 자율 계획보다 우선한다. 유료 사용 금지, 에셋 권리/애니메이션 검증, 핵심 제작 결정 게이트는 우회할 수 없다.
- 게임 제작은 owner 3분류 정책을 따른다. **개수만 고정**하고 게임 ID/이름은 고정하지 않는다.
- 기존 Web 공개판은 분류 변경 때문에 삭제하지 않는다. 1분류 Web판은 안정판/참고 아카이브로 보존하고 기능 본개발은 Unity에서 한다. 3분류 Web판도 공개 아카이브로 보존하되 신규 자동 코드 개발은 하지 않는다.
- 게임/아트북의 홈페이지 노출은 정식 제작 승인과 별개다. 노출됐다는 이유만으로 본개발 PASS, 출시 승인, APK 다운로드 승인으로 처리하지 않는다.

## owner 3분류 제작 정책
- **1분류 출시확정(`release-confirmed`)은 항상 정확히 2개**다.
- **2분류 개발확정(`development-confirmed`)은 항상 정확히 3개**다.
- **3분류(`design-only`)는 나머지 전부**다.
- 분류의 **게임 목록은 고정하지 않는다**. 최신 개발 준비도, 5축 개발 근거, 완료 아트북/baseline 성숙도, 실제 source 존재, 플레이 가능 근거, 실제 Unity 프로젝트 준비도를 다시 평가해 자동 승격·하락한다.
- 한 게임이 승격되어 고정 인원을 초과하면 기존 게임이 자동 하락해 **2 / 3 / 나머지 개수는 절대 늘어나지 않는다**.
- 현재 분류 파일에 적힌 게임 목록은 그 시점의 스냅샷일 뿐 lock/owner pin이 아니다.
- 1분류의 제작 타깃은 **Unity Android**다. Web 아카이브에 신규 기능을 확장하지 않는다.
- 1분류 2개 중 **집중개발은 항상 1개만** 허용한다. 현재 1분류 안에서 실제 Unity 준비도와 검증 점수를 비교해 자동 선택하고, 나머지 1개는 next-focus로 둔다.
- 2분류는 **Unity Android 본개발 전 사전검증용 Web 테스트베드/밑그림**을 만든다. 최종 제품은 Web이 아니며, 핵심 루프·모바일 조작·밸런스·UX·시스템 연결·아트 방향이 Unity에서 구현할 가치가 있는지 확인하는 가장 작은 playable vertical slice만 만든다.
- 2분류에서는 Web 전용 장기 기능·대규모 콘텐츠·최종 그래픽 폴리시를 목표로 하지 않는다. 테스트 결과는 아트북/Unity 구현계획에 환류하고, 승격되면 Unity Android 본개발로 이어진다.
- 2분류 작업 순서는 최신 플레이 영향도 근거를 함께 사용한다. 반복해서 영향이 낮은 플로어는 우선순위를 낮추되 분류 개수 자체를 바꾸는 근거와 혼동하지 않는다.
- 3분류는 아트북, 컨셉, 정체성, 스토리, 시스템 구조, UI/UX, 밸런스 설계 최적화만 하고 자동 source-code 개발은 하지 않는다.
- 아트북은 1·2·3분류 모두의 살아 있는 설계도다. 구현·QA·밸런스·스토리·기술·콘텐츠 근거가 생기면 기존 이력을 덮어쓰지 않고 새 revision/baseline으로 계속 수정·보완한다.
- 자동 재분류는 `tools/company-status-sync.mjs`의 근거 순위를 사용하며 현재 `homepageCategory` 자체에는 가점을 주지 않는다. 기존 분류가 자기 자신을 영구 고정하는 피드백 루프를 만들지 않는다.

## 작업 우선순위
1. 사용자 직접 지시 / owner-immediate.
2. **1분류 집중 Unity 개발** — 현재 자동 선정된 1개 deep focus.
3. **1분류 공개 Web 안정판 사고 복구** — 실제 runtime incident가 있을 때만 FAST로 보호한다.
4. **2분류 Unity 전 사전검증 테스트베드** — 현재 3개 중 플레이 영향도/실행 근거에 따라 작은 playable vertical slice로 Unity 본개발 가설을 검증한다.
5. **3분류 아트북/컨셉/설계 최적화** — 코드 worker로 보내지 않는다.
6. 기타 운영 점검.
- 같은 source root는 여전히 한 플로어만 점유한다.
- 특정 게임 ID를 1·2분류나 집중 슬롯에 영구 고정하지 않는다.

## 기본 원칙
- 1분류는 Unity Android 본개발이 기본이다. 기존 Web판은 참고/안정 아카이브로 유지하고 runtime 사고 복구 외 신규 기능 본개발 대상이 아니다.
- 2분류 Web은 **최종 게임 제작 대상이 아니라 Unity 전 테스트 수단**이다. 핵심 루프 1개가 실제로 플레이되고 모바일 입력·전투/상호작용·밸런스·UX 가설을 검증할 수 있는 최소 일관형 구현이면 충분하다.
- 2분류 테스트베드의 결과물은 `KEEP / CHANGE / DROP / UNITY_IMPLEMENTATION_NOTE` 같은 결론을 남겨 Unity 제작에 재사용한다. Web 자체의 장기 유지·콘텐츠 확장·최종 폴리시는 우선순위가 아니다.
- 3분류는 source-code 자동 수정 금지다. 설계도·아트북·컨셉·스토리·구조·밸런스를 먼저 보완한다.
- 기존 웹게임의 핵심 규칙, 밸런스, 세이브 의미, 대규모 콘텐츠 방향은 사용자 결정 없이 자율 변경하지 않는다.
- 임시 래퍼, 패치 누적, 함수 덮어쓰기 체인 대신 담당 시스템을 직접 수정한다.
- 기존 기능과 저장 의미를 불필요하게 삭제하거나 바꾸지 않는다.
- 모든 새 게임의 최종 모바일 제작 방향은 Android 우선이다. 2분류 Web은 모바일 브라우저에서 검증하기 쉬운 사전 테스트 표면으로만 사용한다.
- 유료 AI/유료 에셋/유료 runner/추가 크레딧 자동결제 금지.
- 외부 공개 포트 금지. Unity MCP는 `127.0.0.1` 로컬만 사용한다.

## Vibe2 자동 개발 병목 방지
- 자동 개발 작업은 가능한 한 **문제 1개 + 책임 파일 1개**의 micro-task로 축소한다. `세이브 시스템 안정화` 같은 큰 목표 대신 실제 함수/DOM/경로/조건 1곳을 지목한다.
- 모델 호출 전에 `tools/autonomous-diagnostics.mjs`가 모바일 viewport, 깨진 로컬 경로, 손상 저장값 파싱 위험, DOM null 이벤트 연결, 중복 이벤트 리스너, 반복 타이머 정리 위험, 대형 단일 파일, 터치 정책, 접근성 신호를 결정론적으로 점검한다.
- 진단 결과가 정확한 규칙 수정으로 증명될 때만 `RULE_PATCH`를 사용한다. 현재 안전 규칙 패치는 모바일 viewport 추가와 연속 중복 이벤트 리스너 1개 제거처럼 exact edit로 검증 가능한 항목으로 제한한다.
- `RULE_PATCH`는 모델을 호출하지 않는다. 저장키/핵심 규칙/공개 안정판 보호검증과 동일한 QA를 그대로 통과해야 한다.
- 모델이 필요한 작업은 구조화 JSON Schema를 사용하고 최대 2회까지만 생성할 수 있다. 1차 실패 시 실패 유형을 기록하고 책임 파일 중심으로 컨텍스트를 줄여 2차를 시도한다.
- 동일한 넓은 요청을 그대로 반복하지 않는다. 2차도 실패하면 해당 작업을 실패 근거와 함께 넘기고 다음 게임 큐를 진행한다.
- 수정 파일 0개, 저장키 변경, exact-edit 불일치, 문법 오류는 후보 실패다. 임의 복구나 공개판 직접 수정으로 우회하지 않는다.
- 1분류의 feature 개발은 Unity 집중 슬롯에서만 한다. Web판은 실제 health/runtime 사고가 있을 때 FAST 복구만 허용한다.
- 2분류의 첫 구현은 전체 아트북 재현이나 Web 완성판을 목표로 하지 않는다. 작은 테스트 질문을 검증한 뒤 결과를 아트북/Unity 구현계획에 기록하고 다음 테스트 또는 승격 판단으로 넘어간다.
- 3분류는 진단 문제가 보여도 자동 코드 worker로 밀지 않고 Vibe2·아트북·기획/설계 게이트로 돌린다.

## Vibe2 병렬 플로어 / 충돌 방지
- 한 개발 플로어는 **한 게임 source root를 독점**한다. 같은 source root를 다른 플로어나 AI가 동시에 수정하지 않는다.
- 플로어 내부에서는 planning/development/graphics/QA/balance 5개 부서 리뷰를 병렬로 실행한다.
- planning-final이 결과를 통합하고 파일 소유권을 정한 뒤 development/graphics/QA/balance는 **서로 겹치지 않는 책임 파일**을 격리 code workspace에서 병렬 수정할 수 있다.
- `NO_SCOPE`는 해당 부서가 이번 플로어에서 분리 가능한 책임 파일을 갖지 않았다는 정상 결과이며 실패가 아니다.
- 비충돌 변경은 공통 baseline에서 자동 통합하고, 같은 파일의 실제 충돌만 별도 conflict 해결 단계로 보낸다.
- 공유 branch 쓰기는 최종 통합 후보 생성 이후에만 직렬로 수행한다. 별도 `.vibe2` Work Lock 파일은 운영 경로에 사용하지 않는다.
- 자율 개발의 실행 상태는 `autonomous-dev` 브랜치의 `.autonomous/queue-state.json` 예약 기록과 GitHub Actions `autonomous-dev-writer` concurrency가 실제 운영 기준이다. 아트북 대상/순서는 `artbook-submission-queue.json`과 `game-artbooks.json`을 기준으로 한다.
- ChatGPT/다른 AI는 최신 `Autonomous Continuous Development` 실행과 `autonomous-dev` 예약의 source path를 확인하고, 실행 중인 동일 source root를 동시에 수정하지 않는다.
- Vibe2 source worker는 `main`을 직접 수정하지 않고 항상 최신 `origin/main`에서 후보 브랜치를 만든다.
- 후보 생성 시 `baseMainSha`를 기록한다. QA/승격 직전 최신 `main`과 다시 비교한다.
- `baseMainSha` 이후 동일 게임 source root가 바뀌었으면 자동 병합/승격하지 않고 재계획한다.
- 변경이 검증되지 않은 후보는 `main`에 자동 반영하지 않는다.
- 후보가 QA/빌드/배포 게이트를 기다리는 동안 해당 source root는 점유 상태로 보고 다음 AI가 같은 파일을 병행 수정하지 않는다.

## 에셋 규칙 / 학습
- 에셋 작업 전에는 반드시 `ASSET_RULES.md`를 읽는다.
- 캐릭터/몬스터/보스/VFX가 필요하면 `assets/animated-assets.json`과 `assets/asset-manifest.json`의 검증 후보를 먼저 확인한다.
- 캐릭터, 몬스터, 보스는 움직임이 있는 검증 애니메이션 에셋만 사용한다.
- 정지 이미지, 단일 포즈, 원형/구체/도형/이모지/임시 모델을 캐릭터·몬스터·보스로 사용하는 것은 금지한다.
- 라이선스가 수정/상업 사용을 허용하면 원본 에셋을 게임 컨셉/완료 아트북에 맞게 색상·재질·텍스처·형태·장비·모션·VFX 등을 수정/조합/재제작할 수 있다.
- **완료 아트북/게임 컨셉 > 에셋 원본 스타일** 순서다. 에셋 때문에 게임 컨셉을 바꾸지 않는다.
- 고정 안전 규칙(라이선스, 상업사용, 출처, 애니메이션 증거, 모바일 성능/용량)은 학습으로 완화하거나 덮어쓸 수 없다.
- 스타일 적합도, 모션 품질, 모바일 성능, QA 통과율, 다른 게임 재사용 성공 같은 선호 신호는 검증된 결과만 경험으로 학습한다.
- 부서 검토와 독립 QA를 통과한 개발/릴리즈 성공·실패 증거만 기존 Company DNA/Vibe 학습 경로에 반영한다.

## 수정 → QA → 자동배포
- Vibe2 worker와 부서 workspace의 직접 `main` 쓰기는 금지한다.
- **Web:** 2분류 Unity 전 사전검증 테스트베드 또는 허용된 FAST 복구 → 부서 병렬 수정 → 통합 후보 → 독립 Promotion QA → 최신 main 충돌검사 → 검증 결과를 아트북/Unity 구현계획에 환류. 2분류 Web을 최종 제품으로 승격하지 않는다.
- **Unity:** 1분류 집중 후보 생성 → 후보 브랜치 Android APK 빌드/검증 → 최신 main 충돌검사 → 승인된 Unity source root만 main 승격 → runtime/test release 검증.
- QA 실패, 빌드 실패, source root freshness 실패, 현재 출시/개발 승인 취소 시 자동배포 금지 및 재시도/재계획한다.
- 릴리즈 성공/실패 검증 뒤 Company DNA/Vibe 학습과 필요 시 `ARTBOOK_REVISION_REQUEST` 또는 baseline upgrade를 수행한 다음 다음 개발 플로어로 간다.
- Play Store 정식 공개는 자동 테스트 APK/프리릴리스와 별개이며 출시확정 또는 명시적 사용자 승인 정책을 따른다.
- Unreal 자동배포는 승인된 Unreal toolchain/runner가 실제로 연결되고 빌드 성공이 검증되기 전까지 활성화하지 않는다.

## 총괄 / 병목 / 빌드 권한
- 총괄은 `company-directive.json`의 owner-immediate 우선권을 집행한다.
- 총괄은 부서별 TASK_ASSIGNED / EXECUTION_EVIDENCE / RESULT_EVIDENCE / VERIFICATION / BLOCKER / ACTION을 확인한다.
- 승인된 workflow가 멈췄고 같은 workflow가 active가 아닐 때, 아트북 backlog 정지나 자율개발 recovery 누락 같은 **저위험 운영 병목**은 기존 workflow를 재-dispatch해 복구할 수 있다.
- 같은 workflow가 queued/in_progress면 중복 dispatch하지 않는다.
- 총괄은 부서 전문 결과를 대신 작성하거나 QA를 우회하거나 locked 게임 핵심 결정을 임의 변경하지 않는다.
- 빌드 책임은 로컬 총괄 AI 한 명에게 독점시키지 않는다.
- 연결된 ChatGPT 총괄, 로컬 총괄, 승인된 다른 총괄 AI 모두 검증된 빌드 요청을 만들 수 있다.
- 외부 총괄은 GitHub의 `.build-requests/` 파일을 갱신해 빌드를 요청할 수 있다.
- 일반 원격 Unity Android 테스트는 `.github/workflows/unity-hybrid-android-build.yml`을 통해 검증된 경로로 실행한다.
- Unity 라이선스/runner가 준비되지 않았거나 빌드가 실제 성공하지 않았다면 테스트 가능이라고 표시하지 않는다.
- 테스트 APK prerelease 생성은 홈페이지 노출과 별개다. 실제 APK 다운로드 링크는 빌드 성공·비어 있지 않은 APK·SHA-256·다운로드 가능 여부까지 검증된 뒤에만 표시한다.

## 작업 순서
1. `company-directive.json`, `company-status.json`, `game-catalog.json`, `autonomous-portfolio.json`과 현재 구조를 읽는다.
2. 사용자 직접 지시와 `1분류 집중 Unity > 1분류 Web 사고 FAST > 2분류 Unity 전 사전검증 테스트베드 > 3분류 아트북/설계 > 기타 운영` 우선순위를 적용한다.
3. `productionTierState`는 현재 자동 배치 스냅샷으로만 읽고 게임 ID 고정 규칙으로 해석하지 않는다.
4. 게임 source 수정 전 최신 `Autonomous Continuous Development` 실행과 `autonomous-dev:.autonomous/queue-state.json`을 확인한다. 아트북 작업은 `artbook-submission-queue.json`과 `game-artbooks.json`의 실제 완료 상태를 확인한다.
5. 자동 유지보수라면 모델 전에 결정론적 진단으로 문제 1개와 책임 파일을 정한다.
6. 안전 규칙 패치 가능 여부를 먼저 판단하고, 불가능할 때만 Vibe2 모델을 사용한다.
7. 에셋이 필요한 작업이면 `ASSET_RULES.md`, `assets/animated-assets.json`, `assets/asset-manifest.json`을 확인한다.
8. 5개 부서 리뷰는 병렬로 실행하고 planning-final이 통합/파일 소유권을 정한다.
9. development/graphics/QA/balance는 겹치지 않는 책임 파일을 격리 workspace에서 병렬 수정한다. `NO_SCOPE`는 정상 처리한다.
10. 비충돌 변경을 자동 통합하고 진짜 same-file conflict만 해결한 뒤 하나의 통합 후보를 만든다.
11. 컴파일/문법/브라우저/모바일/입력/저장 회귀를 대상 엔진에 맞게 검증한다.
12. `baseMainSha` 이후 동일 source root 변경을 다시 검사한다. 겹치면 자동 승격하지 않고 재계획한다.
13. Unity는 실제 APK/runtime까지 검증하고, 2분류 Web은 테스트 질문에 대한 결론과 Unity 이식 메모가 남았는지까지 검증한다.
14. 검증 PASS만 기존 릴리즈 게이트를 통해 `main`에 승격한다. 실패는 제한된 재시도 또는 재계획한다.
15. 검증된 결과만 Company DNA/Vibe 학습, 자동 분류 재평가, 아트북 업데이트 판단에 반영한다.
16. 총괄은 backlog/개발 체인이 멈추면 원인을 분류하고 중복 active run이 없을 때 저위험 복구 workflow를 재기동한다.

## 부서 역할
- 기획 AI: 핵심 루프, 지역, 퀘스트, 콘텐츠 구조, planning-final 통합과 책임 파일 배정.
- 개발 AI: 1분류 Unity Android 본개발과 2분류 Unity 전 Web 테스트베드 구현을 담당하고, 2분류 결과를 Unity 구현 메모로 환류한다. 허용된 FAST 안정화만 기존 Web 아카이브에 적용한다.
- QA AI: 컴파일, 플레이 막힘, 회귀, Android 위험과 2분류 테스트 질문/모바일 브라우저 위험을 검증하고 필요한 테스트 코드를 책임 범위 안에서 구현한다.
- 그래픽 AI: 1분류 Unity 씬/에셋/가독성/모바일 UI를 본개발하고, 2분류에서는 Unity 아트 방향·실루엣·피드백·터치 UX를 판단할 수 있는 최소 대표 시각 테스트만 만든다.
- 밸런스 AI: 전투, 성장, 보상 수치 검증과 분리 가능한 밸런스 데이터 수정.
- 홈페이지 운영 AI: 공개/준비 게임의 분류, 검색, 압축 배치, 링크, 모바일 UX를 관리하며 노출 상태를 제작 승인으로 오해시키지 않는다.
- 빌드·배포 AI: 원격 테스트 빌드 요청, APK 검증, 직접 테스트 링크 관리.
- 총괄 AI: 부서 작업 분배, 바이브2 실행계약 연결, 우선순위 집행, 병목 해결, 충돌/인계/단계 완료 판정. 아트북에서는 실제 5개 부서 제출 전 missing section을 대신 작성하지 않는다.

## 대충 RPG 보존 기준
- 탐험 → 전투 → 성장 핵심 루프.
- 지역/포탈 진행.
- 메인/히든 퀘스트.
- 전사·궁수·마법사 전직.
- 무기·갑옷·물약·보스 보상.

## 대충 RPG 재구축 기준
- 웹판의 v15~v18 패치 체인은 Unity로 이식하지 않는다.
- 지역, 포탈, 퀘스트 상태를 단일 데이터 모델로 통합한다.
- 전투, 몬스터, 상점, 세이브를 독립 시스템으로 분리한다.
- 모바일 입력/UI는 Unity 입력 체계에 맞춰 새로 구성한다.
