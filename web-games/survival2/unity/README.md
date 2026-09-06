# 생존2 유니티 버전

기존 웹버전은 유지하고, 캐릭터/애니메이션/동료 AI/전투 표현을 유니티 2D 아이소메트릭으로 옮기는 작업용 프로젝트야.

기준: Unity 2022.3.62f1, WebGL 빌드 대상.

## 캐릭터

선택 적용: **1번 2DPIXX Warrior**

- CC-BY 3.0
- 프레임: 128x160
- 4방향
- Idle / Walk / Attack
- 원본 PNG를 런타임에서 프레임 단위로 읽어 사용
- 회색 배경 제거용 변환 없음. 원본 PNG의 알파를 그대로 사용

원본 출처:
https://opengameart.org/content/warrior-animated-character-isometric

## 현재 구성

`Assets/Scenes/Survival2.unity`가 기본 실행 씬이고, `Survival2Bootstrap`가 플레이어와 날짜 조건에 따른 여성 동료(유나/세라/미라/리아)를 생성한다.

`IsometricCharacterAnimator.cs`가 실제 원본 PNG의 Idle/Walk/Attack 프레임과 방향을 처리한다.

`CompanionAI.cs`는 플레이어 추적과 이동 애니메이션을 연결한다.

`DaySaveSystem.cs`는 기존 저장 키 `jaewoon-survival2-v3`를 유지하고, 날짜가 넘어갈 때만 자동 저장한다.

기존 웹버전은 별도로 유지한다. 웹버전도 같은 1번 2DPIXX 원본 PNG 3장을 사용하도록 교체했다.
