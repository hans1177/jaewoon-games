# 재운컴퍼니 AI 작업 부트스트랩

- 사용자의 최신 직접 지시가 최우선이다.
- 제작 정책 원본은 `company-policy.json` 하나다.
- 실행 설정은 `company-directive.json`을 사용하되 정책을 만들거나 덮어쓸 수 없다.
- AI/자동화는 작업 시작 전에 `company-policy.json`의 `policyVersion`, `ruleRegistry`, 관련 계약을 확인한다.
- 상태·감사·빌드·QA·학습 근거는 정책이 아니며 정책과 충돌하면 무효다.
- 유료 AI/유료 runner/자동 초과결제 금지.
- 기존 공개 빌드, 저장 의미, 핵심 게임 규칙은 사용자 결정 없이 바꾸지 않는다.
- 의미 있는 수정은 격리 후보 → 통합 → 독립 QA → release gate 순서로 검증한다.
- 기존 소스는 `PRESERVE_PATCH`를 기본으로 하며 wrapper/override 체인 대신 담당 시스템을 직접 수정한다.
- Web은 실제 브라우저·입력·모바일·저장/재로드·런타임 오류를 검증한다.
- Unity/Android는 실제 빌드 아티팩트와 런타임 증거를 요구한다.
- 수정된 범위는 기존 QA 판정을 자동 승계하지 않는다.
- 검증된 근거만 Vibe2/Vibe3 학습과 승격에 사용한다.

세부 규칙을 이 파일에 추가하지 말고 `company-policy.json`에 고유 `ruleRegistry[].id`로 추가한다.
