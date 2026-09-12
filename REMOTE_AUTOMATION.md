# 재운컴퍼니 원격 자동화

이 문서는 `COMPANY_FLOW.md`를 실행 관점에서 미러링한다. 충돌 시 중앙문서가 우선한다.

## 목표

한재운이 휴대폰/외부에서 ChatGPT에 제작·수정 요청을 하면 개인 PC에서 반복 명령을 직접 실행하지 않는 것을 기본 운영 방식으로 한다. 기존 승인된 GitHub 파이프라인을 재사용하며 같은 단계의 새 우회 파이프라인을 만들지 않는다.

## 기본 원격 흐름

1. 최신 owner 지시를 `COMPANY_FLOW.md`에 먼저 반영한다.
2. `company-directive.json`과 관련 작업문서를 중앙정책에 동기화한다.
3. 관련 구현을 기존 책임 코드/워크플로에서 직접 수정한다.
4. 실제 build/test/runtime/QA 증거를 확인한다.
5. 검증된 결과만 다음 단계와 공개 표시로 넘긴다.

## 홈페이지 운영

홈페이지는 **Homepage Manager 1개**가 관리하고 작업 뒤 **기존 Director 1개**가 사후 감독한다.

Homepage Manager는 별도 owner 확인 없이 다음을 관리할 수 있다.

- 대문/히어로와 홈페이지 틀·배치
- 섹션 순서와 카드 구성
- 검색·필터·정렬·탭·메뉴 표시
- 대표 이미지 표시
- 모바일 반응형 UI
- 아트북 진입 구조
- 중앙정책과 실제 상태 근거에 따른 표시 데이터 동기화
- 링크·이미지·접근성·레이아웃 등 저위험 홈페이지 유지보수

새 게임·플레이 링크·다운로드 링크·출시 표시는 임의로 만들지 않는다. 실제 카탈로그/빌드/런타임/QA 근거가 있어야 한다. 홈페이지에 보이는 문구가 생산/출시 승인을 생성하지 않는다.

## Owner 고정 홈페이지/PWA 기능

최신 owner 직접 지시 없이 다음 기능을 변경·삭제·비활성화하지 않는다.

- `manifest.webmanifest` 기반 PWA 앱 계약
- `install.html` 설치 기능
- `sw.js` 오프라인/앱셸 기능
- `offline.html` fallback
- `/command.html` 개발 대화창
- 대화 입력, 첨부, 전송, 기기 등록, provider 연결 및 service worker 등록 흐름
- owner가 추가로 고정 기능으로 지정한 기존 기능

홈페이지 레이아웃을 바꾸는 것은 허용되지만 위 고정 기능의 동작, 진입점, DOM/API/데이터 계약을 깨뜨려서는 안 된다. 변경이 필요하면 owner 결정으로 올린다.

## 홈페이지 완료 흐름

```text
Homepage Manager 수정
→ Homepage Manager self-QA
→ 기존 Director 단일 사후 감독
→ 고정 기능 회귀 없음 확인
→ 완료/공개 상태 확정
```

두 번째 홈페이지 관리자나 별도 홈페이지 감독 파이프라인은 만들지 않는다.

## Unity 원격 빌드

Unity 프로젝트가 Android 외부 테스트 가능한 상태가 되면 기존 `.build-requests/unity/<gameId>.json` 및 승인된 Unity build workflow를 사용한다. APK 파일 크기와 SHA-256, 실제 다운로드 주소를 확인하기 전에는 테스트 가능으로 표시하지 않는다.

`.build-requests/unity/<gameId>.json` 예시:

```json
{
  "version": 1,
  "requestId": "example-001",
  "gameId": "example-game",
  "projectPath": "unity-games/example-game"
}
```

정식 출시/스토어 공개는 테스트 APK와 별도 단계다.

## PC 정책

- 일반 원격 제작/수정 요청: 개인 PC 필수 아님
- 일반 Android 테스트 빌드: self-hosted PC runner 사용 안 함
- `unity-local-pc-android.yml`: 레거시 수동 복구용이며 자동 트리거하지 않음
- 로컬 Unity/MCP 및 Roblox Studio: 실제 로컬 런타임이 필요한 검증의 선택적/필수 경로로 사용

## 비용 정책

- 공개 저장소의 표준 GitHub-hosted runner 우선
- larger runner 자동 사용 금지
- 유료 Unity Build Automation 자동 전환 금지
- 유료 AI API/추가 크레딧 자동 사용 금지

## Unity Personal 라이선스

Unity Personal 빌드가 라이선스를 요구하는 경우 `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD`를 저장소 파일에 기록하지 않는다. 준비되지 않았으면 빌드 성공으로 보고하지 않는다.

## 보호 규칙

- 중앙문서 우선, 작업문서 동기화 후 구현
- 기존 canonical workflow 재사용
- 실패한 테스트를 PASS로 보고하지 않음
- 검증 없는 다운로드·플레이·출시 표시 금지
- 저장 의미/핵심 게임 방향/과금/개인정보는 owner gate 유지
- PWA/대화창 등 owner 고정 기능 자동 변경 금지
