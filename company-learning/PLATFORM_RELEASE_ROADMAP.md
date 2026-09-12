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

## Web 학습의 Roblox 활용

검증된 Web 게임 경험 중 터치 입력, 모바일 UI, 저장/불러오기·재개, 성능, 반응형 화면, 회귀 방지, 핵심 루프 구현 같은 **이식 가능한 패턴**은 V3 공통 메모리를 통해 Roblox 작업 문맥으로 재사용할 수 있다.

단, Web의 PASS는 Roblox PASS가 아니다. Web 증거는 Roblox 데이터셋/어댑터/런타임/게시 게이트를 충족하지 못하며 Roblox 학습 lane은 실제 검증된 Roblox 증거를 별도로 요구한다.

## 24시간 학습 체인

Roblox/Unity/UEFN 모두 기존 V3/Vibe2 학습·검증 체인을 재사용한다. `Vibe2 Distillation Sample Ingest`가 기존 매시간 refresh를 담당하며 별도 증류 cron, shadow dataset, 별도 trainer를 만들지 않는다.

모델 학습은 하나의 canonical self-hosted 단계다. 서버 self-hosted가 현재 우선 백엔드이고 기존 로컬 self-hosted 경로는 삭제하지 않고 보존한다. 두 백엔드는 같은 deterministic training request와 같은 dataset/trainer 계약을 사용하며 동일 요청을 동시에 중복 학습하지 않는다. GitHub-hosted 모델 학습과 자동 server→local fallback은 허용하지 않는다.
