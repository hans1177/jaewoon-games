# 동물 자동대전 · 안드로이드 앱

이 폴더는 구글 플레이에 제출할 게임 전용 Android 프로젝트 원본이야.

- 웹게임 정본: web-games/animal-auto-battle/index.html
- 패키지 후보: com.jaewoon.animalautobattle
- 최소 버전: Android 8.0 (API 26)
- 제출 대상: Android 16 (API 36)
- 수익화: 광고 없음, 인앱 결제 없음
- 연결 주소: https://hans1177.github.io/jaewoon-games/web-games/animal-auto-battle/
- 데이터 저장: 앱 WebView 안의 localStorage. 웹 브라우저나 다른 앱과 공유하지 않음.
- 권한: 인터넷 및 네트워크 상태만 사용
- 회사 관리용 android-app 원본과 분리

## 빌드
Android Studio에서 android-games/animal-auto-battle 폴더를 열어 SDK 36을 설치해.
앱 서명 업로드 키는 오너가 안전한 환경에서 보관하고 다음 환경 변수로 제공해.
ANDROID_UPLOAD_KEYSTORE, ANDROID_UPLOAD_STORE_PASSWORD, ANDROID_UPLOAD_KEY_ALIAS, ANDROID_UPLOAD_KEY_PASSWORD

키, 비밀번호, 구글 인증정보를 GitHub나 채팅에 올리면 안 돼.
서명 없이 생성한 앱 번들은 스토어에 제출할 수 없어.

## 출시 확인
실제 AAB 빌드 및 서명, 실기기 설치, 연결/터치/회전/저장/복구 테스트,
스토어 스크린샷과 실게임 예고 화면, 개인정보 안내, 데이터 보안 설문,
개발자 계정과 비공개 테스트, 구글 심사 통과가 필요해.

이 원본은 출시 준비 코드야. 프로젝트 파일만으로 빌드 성공이나 Play Console 배포를 증명하지 않아.
구글 개발자 계정은 신규 생성 시 미화 25달러의 등록비가 있어. 무료정책에 따라 자동 결제하지 않아.
