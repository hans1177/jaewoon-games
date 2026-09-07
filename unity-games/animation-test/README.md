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

## 실행

Unity 6에서 이 폴더를 프로젝트로 연다.
Editor 스크립트가 `Assets/Scenes/Main.unity`를 만들고 Build Settings에 등록한다.
Play를 누르면 테스트가 시작된다.

## 검증 상태

소스/에셋 구조는 main에 반영됨.
현재 ChatGPT 연결에서는 Unity Editor/MCP를 직접 실행할 수 없으므로 실제 Editor 컴파일/PlayMode 검증은 수행하지 못했다.
