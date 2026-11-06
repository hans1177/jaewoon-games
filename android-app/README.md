# 재운컴퍼니 Android 앱

- 설치 형식: Android APK
- 패키지: `com.jaewoon.company`
- 기본 서버 화면: `https://jaewoon-games.pages.dev/command.html?native=1`
- 네트워크: HTTPS 서버 통신 사용
- 보안: HTTP 차단, 허용 호스트 제한, SSL 오류 차단, Safe Browsing, WebView 디버깅 비활성화
- 빌드: `.github/workflows/build-jaewoon-company-apk.yml`
- 게시 파일: `/downloads/jaewoon-company.apk`

이 앱은 PWA 설치가 아니라 Android WebView 기반 APK 앱이다. 자녀안심/보호자 통제를 우회하거나 비활성화하지 않는다.
