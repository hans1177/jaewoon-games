# Unity cloud build requests

이 폴더의 `<gameId>.json` 변경은 `.github/workflows/unity-cloud-android-test.yml`을 트리거한다.

형식:

```json
{
  "version": 1,
  "requestId": "game-id-test-001",
  "gameId": "game-id",
  "projectPath": "unity-games/game-id"
}
```

규칙:

- `gameId`: 소문자 영문/숫자/하이픈
- `projectPath`: `unity-games/` 바로 아래 Unity 프로젝트
- 한 커밋에서 build request JSON은 1개만 변경
- 개발/QA가 외부 테스트 가능 상태를 확인한 뒤에만 갱신
- 성공한 빌드만 `company-status.json.testBuilds`에 반영
- Unity Personal GitHub Actions secrets가 준비되지 않으면 build는 차단됨
- 정상 운영은 GitHub-hosted runner 사용, self-hosted PC runner는 레거시 수동 복구용
