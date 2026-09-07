# 재운컴퍼니 원격 자동화

## 목표

한재운이 휴대폰/외부에서 ChatGPT에 게임 제작·수정 요청을 하면 개인 PC에서 PowerShell, Git pull, Unity 빌드 명령을 직접 실행하지 않는 것을 기본 운영 방식으로 한다.

## 기본 원격 흐름

1. 한재운이 ChatGPT에서 게임 제작 또는 수정 지시
2. 지시를 `company-directive.json`과 관련 GitHub 파일에 반영
3. 기획/개발/QA/그래픽/밸런스 작업을 GitHub 기준으로 진행
4. Unity 프로젝트가 Android 외부 테스트 가능한 상태가 되면 빌드·배포 AI가 `.build-requests/unity/<gameId>.json` 갱신
5. GitHub Actions `Unity Cloud Android Test`가 GitHub-hosted runner에서 Unity Android APK 빌드
6. APK 파일 크기와 SHA-256 검증
7. GitHub prerelease에 APK 업로드
8. 한재운에게 GitHub prerelease APK 다운로드 링크 직접 전달
9. 한재운은 휴대폰에서 APK 다운로드 후 설치·테스트

## 홈페이지 게시 규칙

- 게임 제작·수정 요청 자체는 홈페이지 게시 요청이 아니다.
- 새 게임, 새 Unity 프로젝트, 새 APK, 새 다운로드 링크를 홈페이지에 자동 올리지 않는다.
- 사용자가 명시적으로 `홈피 올려`, `홈페이지에 올려`, `홈페이지 게시`라고 요청했을 때만 공개 홈페이지 게시 작업을 진행한다.
- GitHub prerelease 테스트 링크를 사용자에게 직접 전달하는 것은 홈페이지 게시가 아니다.
- `company.html`의 회사 운영 정보와 공개 게임 목록 게시 승인은 서로 별개다.
- 이미 공개된 홈페이지의 링크 오류, 모바일 깨짐, 검색/필터, 접근성, 성능 같은 유지보수는 자동 운영할 수 있다.

## PC 정책

- 일반 원격 제작/수정 요청: 개인 PC 필수 아님
- 일반 Android 테스트 빌드: self-hosted PC runner 사용 안 함
- `unity-local-pc-android.yml`: 레거시 수동 복구용이며 자동 트리거하지 않음
- 로컬 Unity/MCP: 고급 장면 편집, 로컬 전용 진단, 클라우드로 재현하기 어려운 문제의 선택적 복구 경로

## 비용 정책

- 공개 저장소의 표준 GitHub-hosted runner만 사용
- larger runner 자동 사용 금지
- 유료 Unity Build Automation 자동 전환 금지
- 유료 AI API/추가 크레딧 자동 사용 금지

## Unity Personal 라이선스 1회 준비

GitHub-hosted Unity 빌드는 Unity 라이선스가 필요하다. Unity Personal을 쓰는 경우 GitHub Actions secrets에 아래 3개가 한 번 등록돼 있어야 한다.

- `UNITY_LICENSE`
- `UNITY_EMAIL`
- `UNITY_PASSWORD`

이 값은 저장소 파일에 기록하지 않는다. 준비되지 않은 상태에서는 클라우드 APK 빌드가 실패하도록 막고, 테스트 가능하다고 보고하지 않는다.

라이선스 secrets가 한 번 준비된 뒤에는 정상 원격 빌드마다 PC를 켜거나 Unity를 직접 실행할 필요가 없다.

## 빌드 요청 형식

`.build-requests/unity/<gameId>.json`

```json
{
  "version": 1,
  "requestId": "example-001",
  "gameId": "example-game",
  "projectPath": "unity-games/example-game"
}
```

빌드가 성공하면 GitHub prerelease에 테스트 APK와 SHA-256이 생성된다. 공개 홈페이지 반영은 별도의 사용자 게시 지시가 있을 때만 수행한다.

## 보호 규칙

- `web-games/`는 계속 읽기 전용
- APK가 실제 생성되지 않으면 테스트 가능이라고 보고하지 않음
- SHA-256 검증 전 테스트 링크 완료 처리 금지
- 정식 출시/스토어 배포는 테스트 APK와 별도 단계
- 과금/플랫폼/핵심 게임 방향 등 핵심 결정은 기존 owner-decision 규칙 유지
