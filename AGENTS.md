# 저장소 작업 지침

이 저장소에서 작업하는 모든 GPT·코딩 에이전트는 작업 전에 최신 main의 다음 중앙문서를 읽어야 한다.

- company-learning/platform-release-roadmap.json
- company-learning/company-log-map.json
- company-learning/company-architecture-map.json
- company-learning/security-immune-system.json

## 한방패치

중앙정책 fixedAutonomousDevelopmentOperatingContract.ownerRequestedVibeOneShotPatch를 따른다.

직접 수정 → main 자동 병합 → 즉시 배포 → 배포 후 검증

- 사용자의 실제 코딩 요청은 에이전트가 기존 책임 함수에서 직접 구현한다. 자동개발 큐에 지시만 넣고 끝내지 않는다.
- main 병합은 기본 작업에 포함된다. 병합만으로 완료라고 보고하지 않는다.
- 일반 웹게임은 기존 magic-forest-pages.yml의 GitHub Pages 게시 경로를 사용한다. Cloudflare나 새 우회 배포 구조를 만들지 않는다.
- 로블록스 오너 한방패치는 실제 책임 Luau 소스를 직접 수정해 main에 병합하고 기존 Roblox source-drift-sync → F0~F9 → 기존 비공개/전용 Place 게시 → 게시 후 동일 버전 QA → 다음 F0의 반복 경로를 따른다. F9 전 정식 게시·공개 전환은 금지한다.
- F9 직후 다음 개발을 먼저 시작하지 않는다. 게시 성공과 동일 Place/버전 배포 후 검증이 성공하면 기존 F0 재시작 경로에 전달한다. 실패·미검증은 그 회차의 복구·재검증 대상이다.
- 일반 웹 한방패치의 QA·모바일·런타임 검증은 배포 후 수행한다. 사전 QA 점수나 F0~F9 완료 대기를 새 조건으로 붙이지 않는다.
- 중앙정책 확인, 인증정보 보호, 게임 저장·규칙·밸런스 보존, 네이티브 플랫폼의 기존 게시 권한·필수 조건은 유지한다.
- 후속 F0 및 기존 개발과정은 한방패치가 반영된 최신 main과 사용자 요구를 기준으로 영향받는 단계부터 이어간다. 옛 소스로 되돌리거나 새 파이프라인을 만들지 않는다.
- 한방패치는 오너의 명시적 지시만 유효하다. 개발 대기열 승인·F0~F9 완료를 기다리지 않고 기존 책임 소스에서 먼저 수정해 main에 반영한다. 기존 보안·권한 검증은 생략하지 않는다.
- 오너가 **게임 개발중지**를 명령하면 `game-catalog.json`의 `ownerStoppedGameIds`에 정확한 게임 ID를 기록하고 해당 게임에 `ownerDevelopmentStopped:true`, `lifecycleState:OWNER_STOPPED`를 지정한다. 게임 원본·세이브·과거 플레이 버전을 삭제하지 않으며, 설계·예약·복구·출시·홈페이지 타이틀 자동생성에서 격리한다.
- 오너가 그 게임의 개발 재개를 **명시적으로** 지시하기 전에는 자동으로 중지 플래그를 풀거나 다른 게임의 버그 복구 명목으로 재등록하지 않는다. 기존 영구삭제 목록은 그대로 보호한다.
- 실제 배포 리비전과 실행 결과를 확인한다. 검증하지 못한 부분은 미검증으로, 실패는 실패로 보고하고 원인 소스를 직접 수정한다.
- 기존 공용 자산 라이브러리를 먼저 사용한다. 외부 자산은 라이선스·원본·해시를 기록하고 실행 검증 전에는 검증된 게임 자산으로 승격하지 않는다.

상세 작업 기준은 DIRECT_DEV.md를 따른다. 문서와 중앙정책이 충돌하면 최신 사용자 요청과 최신 중앙정책에 맞춰 기존 책임 코드를 정리한다.
