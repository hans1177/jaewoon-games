# Unity Web 1차 단계 — 비활성 레거시 기록

이 문서는 현재 실행 정책이 아니다.

기계 정책 권한은 `company-learning/platform-release-roadmap.json`이며, 현재 활성 개발 구조는 `company-learning/DIRECT_NATIVE_DUAL_PLATFORM.md`를 따른다.

현재 상태:

- Unity Web 신규 제작: 비활성
- Unity Web 개발 입장 관문: 비활성
- Web 빌드 검증을 Roblox/Unity 앱 개발의 선행 조건으로 사용: 금지
- 신규 네이티브 개발 대상: Roblox + Unity 앱
- 한쪽 요청 시 같은 게임의 두 플랫폼 자동 동시개발

기존 Unity Web 코드, 빌드 산출물, QA 도구는 과거 증거와 마이그레이션 참고용 레거시로만 남길 수 있다. 새 게임 개발 자격이나 출시 자격을 만들지 않는다.

현재 흐름:

```text
공통 핵심 설계
→ Roblox 전용 설계 + Unity 앱 전용 설계
→ MINIMUM_DESIGN_CONTRACT_READY
→ Roblox 네이티브 개발 || Unity 앱 네이티브 개발
→ 각 플랫폼 런타임
→ 각 플랫폼 독립 QA
→ 각 플랫폼 회귀검증
→ 내부 출시
→ 내부 플레이테스트/수리
→ 플랫폼별 외부 공개
```

충돌 시 `platform-release-roadmap.json#directNativeDualPlatformDevelopment`가 우선한다.
