# 재운게임즈 홈페이지 운영 기준

이 문서는 `COMPANY_FLOW.md`의 `homepageOperations`를 사람이 읽기 쉽게 미러링하는 작업 문서다. 정책 원본이 아니며 충돌 시 `COMPANY_FLOW.md`가 우선한다.

## 운영 구조

```text
중앙정책 + 실제 상태/빌드/런타임 근거
→ Homepage Manager 1개가 홈페이지 관리
→ Homepage Manager self-QA
→ 기존 Director 1개가 사후 감독
→ 검증된 결과만 완료/공개 상태로 인정
```

별도 홈페이지 관리자나 별도 홈페이지 감독 파이프라인을 만들지 않는다.

## Homepage Manager 자율 권한

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

대문에 특정 게임이나 플랫폼을 강조할 때는 중앙정책 및 실제 상태 근거가 있어야 한다.

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
- `game-catalog.json` — 게임 카드와 공개 경로
- `company-status.json` — 프로젝트/빌드/운영 상태
- `game-artbooks.json` — 공개 가능한 아트북 상태
- `public-release-baselines.json` — 검증된 공개 빌드 기준
- `public-game-health.json` — 공개 Web 런타임 상태

홈페이지 표시 데이터가 위 근거보다 앞서가면 안 된다.

## 금지

- 회사 정책 자체 변경
- 게임 제작/출시 상태 조작
- 근거 없는 다운로드·플레이 링크 생성
- 게임 본체/게임플레이 수정
- 광고·과금·개인정보·유료 서비스 정책 자동 결정
- PWA/대화창/owner 고정 기능 변경 또는 삭제

## Self-QA

Homepage Manager 작업 후 최소 다음을 검사한다.

1. HTML/JS 구문
2. 360px 모바일 배치와 가로 넘침
3. 검색/필터/정렬/카드/링크 동작 계약
4. 상태 JSON 및 카탈로그 참조
5. 대표 이미지 누락/중복/placeholder
6. 검증 없는 다운로드/플레이 표시 없음
7. `manifest.webmanifest`, `install.html`, `sw.js`, `offline.html`, `command.html` 존재
8. manifest `/command.html` start URL 보존
9. install page의 service worker 등록 보존
10. service worker 앱 셸과 command/offline fallback 보존
11. command chat의 입력·첨부·전송·기기등록·service worker 등록 계약 보존

## 사후 감독

기존 Director 하나가 Homepage Manager 작업 뒤 다음을 검증한다.

- 작업 증거 존재
- 결과 파일 존재
- self-QA PASS
- 중앙정책/실제 상태와 표시 일치
- owner 고정 기능 회귀 없음
- 검증되지 않은 공개 주장 없음

Director는 검증/차단/재작업 반환을 담당하며 Homepage Manager 결과를 몰래 대신 수정하지 않는다.

## 완료 정의

`running` 문자열은 완료 증거가 아니다. 실제 commit + self-QA + Director 사후 감독 결과가 있어야 완료로 본다.
