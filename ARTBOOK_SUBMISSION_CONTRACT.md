# 아트북 부서 제출 계약

이 파일은 `planning / graphics / development / qa / balance` 다섯 부서가 공통으로 따르는 **형식 계약**만 정의한다. 창작 내용은 각 부서가 자기 전문 영역에서 독립적으로 작성한다.

## 제출 경로

그날 `artbook-submission-queue.json`의 `currentDailyTarget`과 한국시간 날짜를 사용한다.

`artbook-submissions/<gameId>/<YYYY-MM-DD>/<department>.json`

예:

`artbook-submissions/daechung-rpg/2026-09-08/planning.json`

부서는 **자기 파일 1개만** 작성한다. 다른 부서 파일과 최종 `artbook.json`을 작성하지 않는다.

## 필수 JSON

```json
{
  "version": 1,
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
  "unverified": [
    "확인하지 못한 항목은 추측 완료하지 말고 여기에 기록"
  ],
  "cuts": []
}
```

## 필수 규칙

- `gameId`는 그날 대상 게임과 같아야 한다.
- `date`는 제출 날짜(KST)와 같아야 한다.
- `department`는 자신의 부서명과 같아야 한다.
- `status`는 실제 작성 완료 후에만 `SUBMITTED`다.
- `evidence`는 최소 1개 이상의 실제 근거가 있어야 한다.
- `section`은 비어 있으면 안 된다.
- 최초 통합 아트북에서는 `NO_CHANGE` 제출을 허용하지 않는다.
- 확인하지 않은 것은 `unverified`로 분리한다.
- 다른 부서 판단을 대신 작성하지 않는다.
- 총괄/ChatGPT가 누락 부서를 대신 채우도록 요청하지 않는다.
- `web-games/`는 읽기 전용이며 어떤 제출 작업에서도 수정하지 않는다.

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
- 5/5가 아니면 총괄 조립은 차단된다.
- 5/5가 되면 `tools/artbook-assemble.mjs`가 제출 내용을 그대로 묶어 최종 `artbook.json`을 생성한다.
- 조립 자체는 정식 제작 승인이나 출시 승인이 아니다.
- 회사 전체 최종 통합 아트북은 하루 1권만 허용한다.
