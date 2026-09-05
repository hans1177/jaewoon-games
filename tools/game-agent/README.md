# game-agent

재운게임즈 장애 진단·복구용 로컬 에이전트 1차 코어.

## 현재 범위

- `main` 직접 실행 차단
- 작업 시작/종료 시 원격 `main` SHA 비교
- 필수 규칙 문서 자동 로드
- merge conflict 흔적 검사
- JSON 손상 검사
- JavaScript 문법 검사
- 장애가 있을 때만 무료 AI 순차 진단
- Gemini API 완전 제외
- 세 AI 모두 실패하면 유료 fallback 없이 종료

1차 버전은 안전성을 위해 AI가 파일을 자동 덮어쓰지 않는다. 실제 장애 사례로 진단 정확도를 확인한 뒤 최소 수정·테스트·반영 단계를 추가한다.

## 무료 AI 순서

1. Groq Free Plan
2. OpenRouter `openrouter/free`
3. Mistral Free Mode

무료 정책과 모델은 제공자 정책에 따라 바뀔 수 있다. 각 계정에서 종량제/유료 전환을 켜지 않고 Free 상태를 유지한다.

Gemini 키는 이 도구에서 읽지 않는다.

## API 키

```bash
export AGENT_GROQ_KEY="..."
export AGENT_OPENROUTER_KEY="..."
export AGENT_MISTRAL_KEY="..."
```

선택적으로 모델을 바꿀 수 있다.

```bash
export AGENT_GROQ_MODEL="openai/gpt-oss-120b"
export AGENT_MISTRAL_MODEL="mistral-small-latest"
```

## 실행

반드시 `main`이 아닌 복구 브랜치에서 실행한다.

```bash
node tools/game-agent/agent.mjs check
```

정적 장애가 발견되면 종료 코드 2로 끝난다.

AI 원인 진단까지 실행:

```bash
node tools/game-agent/agent.mjs diagnose
```

## 안전 원칙

세부 규칙은 저장소 루트 `AGENT_RULES.md`를 따른다.

- 기존 작업 트리가 더러우면 실행 중단
- 작업 중 원격 `main`이 바뀌면 중단
- 장애 관련 파일 최대 5개만 AI 문맥에 포함
- AI는 실패할 때만 다음 제공자로 전환
- 게임 밸런스/저장 구조/신규 기능은 자동수정 대상 아님
