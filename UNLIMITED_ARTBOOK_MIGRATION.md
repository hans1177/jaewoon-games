# Unlimited Artbook Throughput Migration

- 아트북 INITIAL / DEVELOPMENT_UPGRADE / RELEASE_UPGRADE / REVISION / SECOND_WORK는 일일·주간 개수 제한이 없다.
- 기존 `game-artbooks.json.policy.dailyFinalSubmissionLimit` 값은 레거시 데이터로 취급하며 스케줄러가 읽지 않는다.
- 신규 조립부터 `submissionCountPolicy: UNLIMITED`를 기록하고 `dailyFinalSubmissionLimit`은 사용하지 않는다.
- 아트북이 없는 기존 게임은 한 건 완료 후 다음 INITIAL을 같은 날 자동 호출한다.
- 자동 연속 실행은 기존 게임 INITIAL 공백을 채우는 동안만 계속되고, 공백이 없으면 종료한다.
- 직렬 실행은 Git/상태 파일 충돌 방지 목적이며 수량 제한이 아니다.
