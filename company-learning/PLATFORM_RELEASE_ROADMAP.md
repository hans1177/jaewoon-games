# 플랫폼 출시 로드맵

> 정책 원본은 `COMPANY_FLOW.md`다. 이 문서는 실행 이해용 미러이며 새 정책을 만들지 않는다.

## 현재 기본 우선순위

1. Roblox
2. Unity
3. Fortnite UEFN

이 순서는 기본 집중/경험 축적 우선순위다. 다른 플랫폼 개발을 잠그는 단계 게이트가 아니다.

## 현재 집중 상태

- 기본 집중: `ROBLOX_FAST_RELEASE_STABILIZATION`
- Roblox 원본: `roblox-games/`
- Roblox 실행 어댑터: `tools/vibe3-roblox-platform.mjs`
- 기본 게시 모드: Dry Run
- 실제 게시: 명시적 실행 + Open Cloud 인증 + 런타임/독립 QA/회귀/정확 리비전 근거 필요

## 기존 경로 보존

- 기존 Unity 개발은 계속 허용한다.
- Roblox 우선순위가 기존 Unity 프로젝트를 삭제하거나 교체하지 않는다.
- 기존 Web 공개판은 검증/보존 목적의 경로로 유지할 수 있다.
- 플랫폼별 성공 근거는 다른 플랫폼 성공으로 자동 이전하지 않는다.

## 학습 체인

Roblox/Unity/UEFN 모두 기존 V3/Vibe2 학습·검증 체인을 재사용한다. 플랫폼별 별도 증류 cron, shadow dataset, 별도 trainer를 만들지 않는다.
