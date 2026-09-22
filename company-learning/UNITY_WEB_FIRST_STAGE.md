# Unity Web 검증 표면

기계 정책 권한은 `company-learning/platform-release-roadmap.json`이다.

Unity WebGL은 Roblox/Unity 앱 개발의 선행 관문이나 출시 플랫폼이 아니다. 같은 `unity-games/<gameId>/` 원본에서 소유자 플레이테스트와 브라우저 검증을 위한 WebGL 산출물을 병렬 생성하는 검증 표면이다.

현재 규칙:

- Unity 앱 네이티브 개발: 계속 활성
- Unity WebGL 자동 검증 빌드: 활성
- Unity WebGL 개발 진입 권한: 없음
- Unity WebGL 네이티브 런타임/출시 권한: 없음
- Unity WebGL 실패가 Roblox/Unity 앱 개발을 취소: 금지
- 출력: `web-games/<gameId>/`
- 홈페이지 노출: 검증된 `unity-web-build.json`이 실제 존재할 때만 **Unity Web 테스트** 버튼 표시
- WebGL 검증 빌드는 실제 Unity 씬/프리팹/C# 코어를 재사용해야 하며 별도 게임 코드베이스로 분기하지 않는다.

흐름:

```text
공통 핵심 설계
→ Roblox 네이티브 개발 || Unity 앱 네이티브 개발
                         || Unity WebGL 검증 빌드(가능한 프로젝트만)
→ Unity Web 브라우저 부트/게임플레이 검증
→ 홈페이지 Unity Web 테스트 링크
→ 네이티브 런타임/독립 QA/회귀검증은 각 플랫폼에서 별도 진행
```

충돌 시 `platform-release-roadmap.json#directNativeDualPlatformDevelopment`와 `#unityWebFirstStage`가 우선한다.
