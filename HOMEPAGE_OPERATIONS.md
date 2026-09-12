# 재운게임즈 홈페이지 운영 기준

이 문서는 `COMPANY_FLOW.md`의 `homepageOperations`를 사람이 읽기 쉽게 미러링하는 작업 문서다. 정책 원본이 아니며 충돌 시 `COMPANY_FLOW.md`와 최신 owner 직접 지시가 우선한다.

## 운영 구조

```text
중앙정책 + 실제 상태/빌드/런타임 근거
→ Homepage Manager AI 1개가 서버↔홈페이지 차이와 병목을 탐지
→ 검증된 공개 상태 파일만 동기화 후보로 준비
→ Homepage Manager self-QA
→ 기존 Director 1개가 사후 감독
→ 자동화 브랜치/PR을 통해 main에 반영
→ 검증된 결과만 완료/공개 상태로 인정
```

별도 홈페이지 관리자나 별도 홈페이지 감독 파이프라인을 만들지 않는다. `company-runtime`은 서버측 실행 상태 저장소이며 그대로 공개 원본으로 취급하지 않는다.

## Homepage Manager AI 자율 권한

- 대문/히어로 구성
- 홈페이지 틀/레이아웃
- 섹션 순서와 정보 밀도
- 게임 카드 그리드/크기/배치
- 검색·필터·정렬·탭·메뉴 표시
- 대표 이미지 표시 방식
- 모바일 반응형 UI와 터치 영역
- 아트북 진입 구조
- 실제 근거에 맞춘 플랫폼/단계/상태/링크 표시 동기화
- 링크·이미지·접근성·레이아웃·로딩 등 저위험 홈페이지 오류 수정
- `Company Status Sync` 성공 뒤 `company-runtime`과 공개 `main`의 상태 차이 탐지
- 상태 동기화 지연, 오래된 카탈로그/회사상태, 깨진 공개 링크 등 홈페이지 운영 병목 탐지
- 검증된 `company-status.json`, `game-catalog.json` 차이를 자동화 브랜치/PR로 동기화

대문에 특정 게임이나 플랫폼을 강조할 때는 중앙정책 및 실제 상태 근거가 있어야 한다. 런타임 브랜치의 미검증 값이나 실패 중간상태를 그대로 공개하지 않는다.

## 서버↔홈페이지 동기화

홈페이지 상태 동기화 책임은 **단일 Homepage Manager AI**에 있다.

1. `Company Status Sync`가 성공한 뒤에만 `company-runtime`의 공개 대상 상태를 읽는다.
2. 공개 동기화 대상은 현재 홈페이지가 소비하는 정규 상태 파일로 제한한다.
   - `company-status.json`
   - `game-catalog.json`
3. 동기화 후보에 대해 Homepage Manager self-QA를 먼저 수행한다.
4. 기존 Director가 동일 후보를 사후 검증한다.
5. 통과한 차이만 `automation/homepage-runtime-sync-*` 브랜치와 PR로 전달한다.
6. 자동화가 `main`에 직접 push하지 않는다.
7. `company-runtime` 전체, 개발 큐, 내부 증거 파일을 홈페이지 공개 파일로 복사하지 않는다.
8. 같은 상태가 이미 main과 같으면 PR을 만들지 않는다.

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
- `company-directive.json` — 실행값 미러
- `company-runtime:company-status.json` — 검증된 서버측 최신 상태 후보
- `company-runtime:game-catalog.json` — 검증된 서버측 최신 카탈로그 후보
- `game-catalog.json` — 홈페이지 공개 게임 카드와 공개 경로
- `company-status.json` — 홈페이지 공개 프로젝트/빌드/운영 상태
- `game-artbooks.json` — 공개 가능한 아트북 상태
- `public-release-baselines.json` — 검증된 공개 빌드 기준
- `public-game-health.json` — 공개 Web 런타임 상태

홈페이지 표시 데이터가 위 근거보다 앞서가면 안 된다. 서버측 후보가 검증되지 않았거나 `Company Status Sync`가 실패했으면 공개 동기화를 중단한다.

## 금지

- 회사 정책 자체 변경
- 게임 제작/출시 상태 조작
- 근거 없는 다운로드·플레이 링크 생성
- 게임 본체/게임플레이 수정
- 광고·과금·개인정보·유료 서비스 정책 자동 결정
- PWA/대화창/owner 고정 기능 변경 또는 삭제
- 실패한 런타임 상태를 main 공개 상태로 동기화
- 자동화의 main 직접 push
- 별도 홈페이지 관리자/별도 상태 동기화 관리자 신설

## Self-QA

Homepage Manager 작업 후 최소 다음을 검사한다.

1. HTML/JS 구문
2. 360px 모바일 배치와 가로 넘침
3. 검색/필터/정렬/카드/링크 동작 계약
4. 상태 JSON 및 카탈로그 참조
5. 서버 상태와 공개 상태의 차이 및 동기화 대상 제한
6. 대표 이미지 누락/중복/placeholder
7. 검증 없는 다운로드/플레이 표시 없음
8. `manifest.webmanifest`, `install.html`, `sw.js`, `offline.html`, `command.html` 존재
9. manifest `/command.html` start URL 보존
10. install page의 service worker 등록 보존
11. service worker 앱 셸과 command/offline fallback 보존
12. command chat의 입력·첨부·전송·기기등록·service worker 등록 계약 보존
13. 자동화가 `main`을 직접 쓰지 않고 브랜치/PR 경로만 사용하는지 확인

## 사후 감독

기존 Director 하나가 Homepage Manager 작업 뒤 다음을 검증한다.

- 작업 증거 존재
- 결과 파일 존재
- self-QA PASS
- 중앙정책/실제 상태와 표시 일치
- 서버→홈페이지 동기화 후보가 검증된 파일만 포함
- owner 고정 기능 회귀 없음
- 검증되지 않은 공개 주장 없음
- main 직접 write 없음

Director는 검증/차단/재작업 반환을 담당하며 Homepage Manager 결과를 몰래 대신 수정하지 않는다.

## 완료 정의

`running` 문자열은 완료 증거가 아니다. 실제 동기화 차이 탐지 + self-QA + Director 사후 감독 + 필요 시 자동화 PR 결과가 있어야 완료로 본다.
