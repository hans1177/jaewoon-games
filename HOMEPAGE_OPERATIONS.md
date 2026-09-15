# 재운게임즈 홈페이지 운영 기준

이 문서는 `COMPANY_FLOW.md`의 `homepageOperations`와 `homepageTesting`을 사람이 읽기 쉽게 미러링하는 작업 문서다. 정책 원본이 아니며 충돌 시 `COMPANY_FLOW.md`와 최신 owner 직접 지시가 우선한다.

## 운영 구조

```text
중앙정책 + 실제 개발 상태/빌드/런타임 근거
→ DEVELOPMENT_CONFIRMED 게임은 개발 진행 목록에 즉시 자동 표시
→ Web 강심사/하드게이트 통과 후보만 별도 canonical Top30으로 순위화
→ Homepage Manager self-QA
→ 기존 Director 1개가 사후 감독
→ 자동화 브랜치/PR을 통해 main에 반영
→ 검증된 결과만 공개 상태로 인정
```

별도 홈페이지 관리자나 별도 홈페이지 감독 파이프라인을 만들지 않는다. `company-runtime`은 서버측 실행 상태 저장소이며 그대로 공개 원본으로 취급하지 않는다.

## 개발게임 자동 표시와 Top30 분리

홈페이지에는 **개발 진행 목록**과 **Top30 승격 목록**을 분리한다.

### 개발 진행 목록

- 입력 원본: `company-runtime:development-queue.json`
- `productionClass=DEVELOPMENT_CONFIRMED`이면 검증 점수와 무관하게 자동 표시한다.
- `homepageTestEligible`, Web strict 점수, 30분 최종검증, 아트북은 개발 진행 목록의 등록 조건이 아니다.
- 표시 정보는 게임명과 `status`, `currentStep`, `selectedPlatform`, **현재 유효한 플레이 검증 점수**를 표시한다.
- 개발 점수는 현재 소스/설계에 연결된 schema13 `webInitialCycleStrictScore`만 사용하며, 초기 플레이 사이클·음악 검증이 통과한 경우에만 현재 점수로 인정한다.
- 재작업/재검증 상태의 과거 `webStrictScore`, `strictImplementationScore`, `homepageTestScore`는 현재 개발 점수로 표시하지 않고 `재검증 필요`로 표시한다.
- 개발게임은 현재 유효한 점수 높은 순으로 자동 정렬하고, 재검증 필요/미평가 게임은 아래에 둔다. 같은 점수면 ACTIVE 상태와 최근 업데이트 순을 보조 기준으로 사용한다.
- 검증 실패/대기 상태여도 개발게임 카드는 유지하며 현재 진행 상태를 표시한다.
- 개발 진행 카드는 출시 승인, Top30 통과를 의미하지 않는다.
- 모든 개발 카드에 `웹 테스트` 버튼을 별도로 표시하고 현재 Web 개발본으로 바로 접속한다.
- 플랫폼 개발 게임은 Web 버튼과 별개로 `Unity 테스트`, `Roblox 테스트`, `Fortnite 테스트`처럼 플랫폼 전용 테스트 버튼을 표시한다.
- Unity는 현재 회사 상태의 해당 게임 test build 다운로드가 있으면 그 APK를 직접 열고, 그 외 플랫폼은 명시적인 플랫폼 테스트 URL이 있을 때 해당 플랫폼 테스트로 연결한다.
- 플랫폼 테스트 대상이 아직 없으면 Web 테스트는 그대로 유지하고 플랫폼 버튼만 `플랫폼 테스트 준비 중`으로 비활성화한다.
- `company-runtime` 전체를 main에 복사하지 않고 브라우저가 개발 큐를 읽어 필요한 표시 필드만 사용한다.

### canonical Web Top30

- 입력 원본: `test-game-candidates.json`
- 최대 표시: 30개
- 최소 Web strict 점수: 80
- 하드게이트: 전부 통과 필수
- 최종 30분 콘텐츠 깊이 검증과 아트북 등 기존 승격 조건을 그대로 유지한다.
- 정렬: `STRICT_IMPLEMENTATION_SCORE_DESC`
- Top30 검증 기준은 개발 진행 목록 노출 여부에 영향을 주지 않는다.
- Top30 후보는 정식 `homepageOfficialCard` 승격과 별개이며 승격 전에는 테스트/후보 상태를 명확히 표시한다.
- 히어로/대표 게임은 canonical Top30의 현재 1위 후보를 우선 사용할 수 있다.

## APK 설치 배치

owner 최신 지시에 따라 **재운컴퍼니 APK 설치 컨트롤은 홈페이지 대문 상단에 두지 않는다.** 기능은 삭제하지 않고 개발팀/회사 영역 하단으로 이동한다.

- 다운로드 대상은 기존 `/downloads/jaewoon-company.apk`를 유지한다.
- 홈페이지 상단의 대표 영역은 Top30 게임과 게임 정보에 집중한다.
- PWA 설치 계약과 `/install.html`, `/command.html`, service worker는 그대로 보존한다.
- APK 설치 컨트롤 이동은 표시 위치 변경이며 APK/PWA 기능 삭제가 아니다.

## Homepage Manager AI 자율 권한

- 대문/히어로 구성
- 홈페이지 틀/레이아웃
- Top30 카드 그리드/정보 밀도
- 검색·필터·정렬·탭·메뉴 표시
- 대표 이미지 표시 방식
- 모바일 반응형 UI와 터치 영역
- 아트북 진입 구조
- 실제 근거에 맞춘 플랫폼/단계/상태/링크 표시 동기화
- 링크·이미지·접근성·레이아웃·로딩 등 저위험 홈페이지 오류 수정
- `Company Status Sync` 성공 뒤 `company-runtime`과 공개 `main`의 상태 차이 탐지
- 상태 동기화 지연, 오래된 카탈로그/회사상태, 깨진 공개 링크 등 홈페이지 운영 병목 탐지
- 검증된 `company-status.json`, `game-catalog.json`, canonical Top30 표시 차이를 자동화 브랜치/PR로 동기화

대문에 특정 게임이나 플랫폼을 강조할 때는 canonical Top30 순위와 중앙정책 및 실제 상태 근거가 있어야 한다. 런타임 브랜치의 미검증 값이나 실패 중간상태를 그대로 공개하지 않는다.

## 서버↔홈페이지 동기화

홈페이지 상태 동기화 책임은 **단일 Homepage Manager AI**에 있다.

1. `Company Status Sync`가 성공한 뒤에만 `company-runtime`의 공개 대상 상태를 읽는다.
2. 개발 진행 목록은 `company-runtime:development-queue.json`에서 `DEVELOPMENT_CONFIRMED` 상태를 읽고 검증 게이트와 무관하게 표시한다.
3. Top30은 `test-game-candidates.json` canonical manifest를 읽으며 기존 승격 게이트를 유지한다. `game-catalog.json`과 `company-status.json`은 이름/이미지/플랫폼 등 보조 메타데이터에 사용한다.
4. 동기화 후보에 대해 Homepage Manager self-QA를 먼저 수행한다.
5. 기존 Director가 동일 후보를 사후 검증한다.
6. 통과한 차이만 `automation/homepage-runtime-sync-*` 브랜치와 PR로 전달한다.
7. 자동화가 `main`에 직접 push하지 않는다.
8. `company-runtime` 전체, 개발 큐, 내부 증거 파일을 홈페이지 공개 파일로 복사하지 않는다.
9. 같은 상태가 이미 main과 같으면 PR을 만들지 않는다.
10. 후보 브랜치 생성 뒤 PR 생성/병합 권한이 없거나 PR 생성이 실패하면 해당 브랜치를 복구 근거로 보존하되 **게시 완료로 처리하지 않고 workflow를 BLOCK/FAIL**한다. `BRANCH_READY`는 완료 증거가 아니다.
11. Top30/아트북의 의미 상태가 기존 공개 상태와 같으면 기존 `updatedAt`을 보존한다. `updatedAt`만 바꾸는 timestamp-only diff, 후보 브랜치, PR은 만들지 않는다.

이 흐름은 기존 `Company Status Sync → Homepage Manager → Director` 체인을 확장하는 것이며 별도 동기화 파이프라인을 만들지 않는다.

## Owner 고정 기능

다음은 레이아웃 관리 대상이 아니라 **보존 대상**이다.

- PWA 설치 기능
- 오프라인 실행 기능
- `/command.html` PWA 개발 대화창
- 대화 입력/첨부/전송/기기등록/provider 연결 흐름
- `manifest.webmanifest`
- `install.html`
- `sw.js`
- `offline.html`
- owner가 별도로 고정 기능이라고 지정한 기존 홈페이지 기능

최신 owner 직접 지시가 없으면 동작, 진입점, 핵심 DOM/API, 데이터 소스 계약을 변경·삭제·비활성화하지 않는다.

현재 PWA 기준 계약은 다음과 같다.

- manifest `id`와 `start_url`은 `/command.html`
- PWA scope는 `/`
- install page는 `/manifest.webmanifest`와 `/sw.js`를 사용한다.
- service worker는 `/command.html`, `/install.html`, `/offline.html`, manifest와 PWA icon을 앱 셸로 유지한다.
- `/command.html`은 service worker를 등록하고 채팅 입력·첨부·전송·기기 등록 흐름을 유지한다.

## 홈페이지 정보 소스

- `COMPANY_FLOW.md` — 정책 원본
- `company-runtime:development-queue.json` — 개발 진행 목록 원본; 상태/단계/플랫폼만 공개 표시
- `test-game-candidates.json` — 검증된 canonical Top30 원본
- `company-directive.json` — 실행값 미러
- `company-runtime:company-status.json` — 검증된 서버측 최신 상태 후보
- `company-runtime:game-catalog.json` — Top30 카드 보조 메타데이터
- `game-artbooks.json` — 공개 가능한 아트북 상태
- `public-release-baselines.json` — 검증된 공개 빌드 기준
- `public-game-health.json` — 공개 Web 런타임 상태

홈페이지 표시 데이터가 위 근거보다 앞서가면 안 된다. 서버측 후보가 검증되지 않았거나 `Company Status Sync`가 실패했으면 상태 메타데이터 동기화를 중단한다. Top30 자체는 main의 canonical manifest 순서를 따른다.

## 금지

- 회사 정책 자체 변경
- 개발 진행 카드를 Top30 통과 또는 출시 승인 카드처럼 표시하기
- canonical Top30 순위를 홈페이지에서 임의 재정렬
- 승격 전 Top30 후보를 공식 카드로 표시
- APK 설치 컨트롤을 홈페이지 대문 상단에 다시 배치
- 근거 없는 다운로드·플레이 링크 생성
- 게임 본체/게임플레이 수정
- 광고·과금·개인정보·유료 서비스 정책 자동 결정
- PWA/대화창/owner 고정 기능 변경 또는 삭제
- 실패한 런타임 상태를 main 공개 상태로 동기화
- 자동화의 main 직접 push
- 별도 홈페이지 관리자/별도 상태 동기화 관리자 신설
- PR 생성/병합 실패를 성공 또는 게시 완료로 기록
- 의미 상태가 같은데 `updatedAt`만 갱신해 변경/PR을 만드는 timestamp-only churn

## Self-QA

Homepage Manager 작업 후 최소 다음을 검사한다.

1. HTML/JS 구문
2. 360px 모바일 배치와 가로 넘침
3. 개발 진행 카드는 `DEVELOPMENT_QUEUE`, Top30 카드는 `CANONICAL_TOP30` source인지 확인
4. Top30 카드 수가 30 이하인지 확인
5. strict 점수 80 미만 또는 hard failure 후보가 표시되지 않는지 확인
6. Top30 순서가 manifest 순서/strict 점수순과 일치하는지 확인
7. Web 플레이/아트북 링크 동작 계약
8. APK 설치 컨트롤이 대문 상단이 아니라 개발팀/회사 영역 하단으로 이동하는지 확인
9. 상태 JSON 및 카탈로그 참조
10. 서버 상태와 공개 상태의 차이 및 동기화 대상 제한
11. 검증 없는 다운로드/플레이 표시 없음
12. `manifest.webmanifest`, `install.html`, `sw.js`, `offline.html`, `command.html` 존재
13. manifest `/command.html` start URL 보존
14. install page의 service worker 등록 보존
15. service worker 앱 셸과 command/offline fallback 보존
16. command chat의 입력·첨부·전송·기기등록·service worker 등록 계약 보존
17. 자동화가 `main`을 직접 쓰지 않고 브랜치/PR 경로만 사용하는지 확인
18. PR 생성/병합 실패 시 게시 단계가 성공으로 종료되지 않는지 확인
19. Top30/아트북 의미 상태가 같을 때 `updatedAt`만 달라지는 timestamp-only diff가 생성되지 않는지 확인

## 사후 감독

기존 Director 하나가 Homepage Manager 작업 뒤 다음을 검증한다.

- 작업 증거 존재
- 결과 파일 존재
- self-QA PASS
- 개발 진행 목록이 DEVELOPMENT_CONFIRMED 큐와 일치하고 Top30 승격 목록은 canonical Top30과 일치
- APK 설치 컨트롤이 대문 상단에 남아 있지 않음
- 중앙정책/실제 상태와 표시 일치
- 서버→홈페이지 동기화 후보가 검증된 파일만 포함
- owner 고정 기능 회귀 없음
- 검증되지 않은 공개 주장 없음
- main 직접 write 없음

Director는 검증/차단/재작업 반환을 담당하며 Homepage Manager 결과를 몰래 대신 수정하지 않는다.

## 완료 정의

`running`, `BRANCH_READY`, 후보 브랜치 생성은 완료 증거가 아니다. DEVELOPMENT_CONFIRMED → 개발 진행 목록 즉시 미러 + canonical Top30 별도 승격 미러 + APK 설치 컨트롤 비대문 배치 + self-QA + Director 사후 감독 + 필요 시 자동화 PR 생성/병합 결과가 있어야 완료로 본다. 의미 상태가 같은 timestamp-only 변경은 동기화 차이로 보지 않는다. PR 권한 또는 생성 실패로 main 반영이 끝나지 않았으면 명시적으로 BLOCK/FAIL 상태로 남긴다.
