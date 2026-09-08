# 아트북 부서 제출 계약

이 파일은 `planning / graphics / development / qa / balance` 다섯 부서가 공통으로 따르는 **형식 계약**만 정의한다. 창작 내용은 각 부서가 자기 전문 영역에서 독립적으로 작성한다.

## 제출 경로

그날 `artbook-submission-queue.json`의 `currentDailyTarget`과 한국시간 날짜를 사용한다.

`artbook-submissions/<gameId>/<YYYY-MM-DD>/<department>.json`

예:

`artbook-submissions/daechung-rpg/2026-09-08/planning.json`

부서는 **자기 파일 1개만** 작성한다. 다른 부서 파일과 최종 `artbook.json`을 작성하지 않는다.

## 필수 JSON

새 계약 제출은 `version: 5`를 사용한다.

```json
{
  "version": 5,
  "gameId": "daechung-rpg",
  "date": "2026-09-08",
  "department": "planning",
  "status": "SUBMITTED",
  "headline": "이 부서 판단의 짧은 제목",
  "evidence": [
    "실제 확인한 저장소 경로/테스트/로그/프로토타입 근거"
  ],
  "section": {
    "부서 고유 내용": "빈 객체 금지"
  },
  "conceptPlan": {
    "creativeIdeas": [
      "자기 전문 범위에서 제안하는 창작 아이디어. 구현/검증 전이면 확정 사실처럼 쓰지 않는다."
    ],
    "implementationPlan": [
      "Unity/에셋/시스템으로 옮길 기본 구현 계획"
    ],
    "demoValidation": [
      "실제 시연에서 확인할 테스트 조건과 관찰 항목"
    ]
  },
  "unverified": [
    "확인하지 못한 항목은 추측 완료하지 말고 여기에 기록"
  ],
  "cuts": []
}
```

## conceptPlan 계약

`conceptPlan`은 아트북의 **아이디어 창작 → 구현 기본 계획 → 실제 시연 검증**을 연결한다.

- `creativeIdeas`는 최소 1개 이상의 비어 있지 않은 항목이 필요하다.
- `implementationPlan`은 최소 1개 이상의 비어 있지 않은 항목이 필요하다.
- `demoValidation`은 최소 1개 이상의 비어 있지 않은 항목이 필요하다.
- 세 항목은 자기 부서의 전문 범위에서 작성한다.
- `creativeIdeas`는 창작 제안이며 현재 구현된 사실과 분리한다. 구현 전 아이디어를 `이미 구현됨`, `검증됨`으로 쓰지 않는다.
- 기존 근거를 출발점으로 새 아이디어를 제안할 수 있다. 단, 다른 부서 소유 설정을 대신 확정하지 않는다.
- `implementationPlan`은 상세 코드가 아니라 필요한 씬·프리팹·에셋·애니메이션·VFX·UI·데이터·시스템 연결과 기술 위험을 식별하는 기본 계획이다.
- `demoValidation`은 실제 Unity 시연에서 무엇을 비교하고 확인할지 적는다. 가능하면 아트북 기준 A안과 개선 B안을 같은 조건으로 비교한다.
- 완료 아트북의 잠긴 핵심 컨셉을 바꾸는 창작안은 일반 구현 계획으로 밀어 넣지 않고 `ARTBOOK_CHANGE_REQUEST` 대상으로 분리한다.

부서별 권장 초점:

- `planning` → 세계관/스토리/캐릭터 동기/지역·퀘스트 인과 아이디어 + 게임 흐름 구현 연결 + 시연 장면 검증
- `graphics` → 캐릭터/몬스터/보스/배경/UI 시각 아이디어 + 에셋/애니메이션/VFX 기본 계획 + 화면 가독성 비교
- `development` → 구현 구조/씬/프리팹/데이터/기술 위험 + 최소 플레이어블 구성 + 빌드/성능 검증
- `qa` → 플레이 흐름/문제 장면 + 검증 가능한 시연 시나리오 + 회귀/모바일 확인
- `balance` → 전투/성장/보상 아이디어 + 조정 가능한 수치 구조 + 실제 플레이 측정 계획

## 필수 규칙

- `gameId`는 그날 대상 게임과 같아야 한다.
- `date`는 제출 날짜(KST)와 같아야 한다.
- `department`는 자신의 부서명과 같아야 한다.
- `status`는 실제 작성 완료 후에만 `SUBMITTED`다.
- `evidence`는 최소 1개 이상의 실제 근거가 있어야 한다.
- `section`은 비어 있으면 안 된다.
- 새 계약(`version >= 5`) 제출은 `conceptPlan.creativeIdeas`, `conceptPlan.implementationPlan`, `conceptPlan.demoValidation`을 모두 가져야 한다.
- 최초 통합 아트북에서는 `NO_CHANGE` 제출을 허용하지 않는다.
- 확인하지 않은 것은 `unverified`로 분리한다.
- 다른 부서 판단을 대신 작성하지 않는다.
- 총괄/ChatGPT가 누락 부서를 대신 채우도록 요청하지 않는다.
- `web-games/`는 읽기 전용이며 어떤 제출 작업에서도 수정하지 않는다.
- 기존 계약으로 이미 완료된 역사적 제출은 새 계약 추가만으로 무효화하지 않는다.

## cuts

`cuts`는 선택사항이다. 부서가 실제 이미지 근거를 가진 경우에만 넣는다.

```json
{
  "kind": "concept",
  "title": "컷 제목",
  "body": "짧은 설명",
  "image": "assets/verified-image.webp"
}
```

통합 조립기는 제출된 컷만 순서대로 복사하며 최대 10컷으로 제한한다. 컷이 없다고 총괄이 이미지를 창작해서 채우지 않는다.

## 자동 게이트

- `tools/artbook-gate.mjs`가 다섯 제출 파일의 실재/소유권/근거/비어 있지 않은 section을 검사한다.
- `version >= 5` 제출은 `conceptPlan` 3개 필수 축도 검사한다.
- 5/5가 아니면 총괄 조립은 차단된다.
- 5/5가 되면 `tools/artbook-assemble.mjs`가 제출 내용을 그대로 묶어 최종 `artbook.json`을 생성한다.
- 조립 자체는 정식 제작 승인이나 출시 승인이 아니다.
- 회사 전체 최종 통합 아트북은 하루 1권만 허용한다.
