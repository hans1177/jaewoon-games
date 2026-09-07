# Animation Test

바이브2 애니메이션 에셋 규칙 검증용 Unity 모바일 테스트 게임.

## 내용

- 플레이어: Pirate
- 적: Skeleton
- 캐릭터/적 모두 실제 애니메이션 스프라이트시트 사용
- 사용 상태: idle / walk / attack / hurt / death
- 화면 왼쪽 길게 누르기: 적에게 이동
- 화면 오른쪽 누르기: 공격
- 키보드 테스트: D 이동, Space 공격, R 재시작

## 에셋

- 원본: https://github.com/chongdashu/ai-pixel-snapped-game-sprites
- 라이선스: MIT
- 런타임에서 원본 GitHub raw 스프라이트시트와 manifest.json을 읽어 애니메이션을 구성한다.
- 정지 캐릭터, 원형/구체/primitive 캐릭터는 사용하지 않는다.

## Unity 실행

Unity 6에서 이 폴더를 프로젝트로 연다.
Editor 스크립트가 `Assets/Scenes/Main.unity`를 만들고 Build Settings에 등록한다.
Play를 누르면 테스트가 시작된다.

## Android APK 자동 빌드

워크플로우: `.github/workflows/unity-animation-test-android.yml`

다음 경우 자동 빌드한다.

- `main`에서 `unity-games/animation-test/**` 변경
- 워크플로우 파일 변경
- GitHub Actions에서 수동 `Run workflow`

빌드 결과는 GitHub Actions artifact에 아래 이름으로 올라간다.

`animation-test-android-<commit sha>`

artifact ZIP 안에는 다음 파일이 있다.

- `animation-test.apk`
- `animation-test.apk.sha256`
- `commit-sha.txt`

핸드폰에서는 GitHub의 Actions → `Unity Animation Test Android APK` → 최신 성공 run → Artifacts에서 ZIP을 받은 뒤 압축을 풀고 `animation-test.apk`를 설치하면 된다.

### Unity CI 라이선스

GitHub-hosted runner에서 Unity를 실행하려면 저장소 Actions secrets에 아래 값이 필요하다.

- `UNITY_LICENSE`
- `UNITY_EMAIL`
- `UNITY_PASSWORD`

GameCI `unity-builder@v4`를 사용하며 Unity 버전은 `ProjectSettings/ProjectVersion.txt`에서 자동으로 읽는다.

## 검증 상태

소스, 애니메이션 검증 규칙, Android CI 빌드 함수와 자동 APK workflow는 main에 반영됨.
실제 GitHub-hosted Unity 빌드는 위 Unity CI 라이선스 secrets가 설정되어 있어야 성공한다.
