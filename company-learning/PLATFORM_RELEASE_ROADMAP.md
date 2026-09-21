# 플랫폼 출시 로드맵 / 1차 Web 동기화 아키텍처

> 기계 정책 원본은 `company-learning/platform-release-roadmap.json`이다. 이 문서는 실행 이해용 미러이며 새 정책을 만들지 않는다.

## 1차 Web 단계

앞으로 모든 게임의 1차 Web 제작/검증 엔진은 **Unity Web**이다.

```text
설계 PASS
→ unity-games/<game-id>/ Unity 프로젝트
→ Unity Web 자동 빌드
→ web-games/<game-id>/
→ 모바일/PC 브라우저 실제 플레이 검증
→ Unity Web 관문 PASS
```

여기까지만 이번 전환 범위다.

## 이후 플로우

Unity Web 관문 이후 기존 플랫폼 플로우는 변경하지 않는다.

```text
Unity Web PASS
→ 선택 플랫폼 후속 개발
→ 런타임
→ 독립 QA
→ 회귀검증
→ 내부 배포
→ 공개 배포
→ 사후검증
```

- Unity 대상: 같은 `unity-games/<game-id>/` 프로젝트를 Android APK/AAB로 계속 빌드한다.
- Roblox 대상: 기존 `roblox-games/` 구현/검증 플로우를 유지한다.
- Fortnite UEFN 대상: 기존 UEFN 구현/검증 플로우를 유지한다.
- Unity Web 성공 근거는 Roblox/UEFN native 성공 근거를 대체하지 않는다.

## 원본/빌드 동기화

- Canonical Source: `unity-games/<game-id>/`
- Web Build Output: `web-games/<game-id>/`
- 홈페이지 Web Play: `/web-games/<game-id>/`
- `web-games/`에서 신규 HTML/JS/Canvas 게임을 직접 만드는 방식은 기본 경로가 아니다.
- 기존 Web 구현은 Unity Web 전환이 검증될 때까지 참고/비교/비상 폴백으로 보존한다.

## Vibe Maker 동기화

Vibe의 1차 게임 제작/학습 기본 스택도 Unity 중심으로 맞춘다.

- C# / Scene / Prefab / MonoBehaviour / ScriptableObject
- Animator / Material / Particle System
- Unity UI / Input System / Touch
- Physics / AI / Audio / Lighting / Camera
- 실제 에셋과 라이선스 추적
- Unity Web 빌드/브라우저 QA/모바일 성능 최적화

학습 성공 근거는 실제 Unity Web 실행 + QA 근거를 사용한다. 기존 canonical distillation/RAG/trajectory 체인은 그대로 재사용한다.

## Unity Web 관문

최소 조건:

```text
Boot PASS
+ Input PASS
+ Gameplay PASS
+ Core Fun PASS
+ Mobile PASS
+ Performance PASS
+ No Critical Runtime Error
```

실패 상태는 `REPAIR_REQUIRED`이며 재시도 횟수 제한은 두지 않는다.

## 대충 RPG

- 원본: `unity-games/daechung-rpg/`
- 공개 1차 Web 테스트 빌드: `web-games/daechung-rpg/`
- 기존 PlayCanvas/Web 구현: 참고/비교/비상 폴백
- Unity Web PASS 후 같은 Unity 프로젝트에서 Android 빌드로 이어간다.

## 범위 잠금

이번 변경은 **1차 Web 게임 제작/검증 방식만 Unity Web으로 전환**한다.

Roblox, Unity Android, Fortnite UEFN의 후속 개발/런타임/QA/릴리스 구조를 Unity Web으로 교체하지 않는다.
