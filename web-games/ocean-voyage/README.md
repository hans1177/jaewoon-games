# 푸른 항로 · 대양의 제국

오너 지시에 따라 기존 GitHub Pages 웹게임 배포 경로에 등록된 신규 3D 항해·교역·해전 게임이다.

- 게임 코드: `web-games/ocean-voyage/index.html`, `main.mjs`, `engine.mjs`, `ocean3d.mjs`
- 외부 자산: Kenney Pirate Kit CC0 GLB 선박·항구 등 11종 (`./assets/`)
- 게임 페이지: https://hans1177.github.io/jaewoon-games/web-games/ocean-voyage/
- 홈페이지: https://hans1177.github.io/jaewoon-games/
- 테스트: `node --test qa/ocean-voyage.test.mjs`
- 저장: 기존 게임과 격리된 `jg-ocean-voyage-v1` 키

## 오너 직접 게시 요청 · 2026-10-20

게임 소스는 PR #8684로 `main`에 이미 합쳐졌고 핵심 코드 QA와 보안 검사도 통과했다. 하지만 기존 `gh-pages`의 마지막 게시 버전은 게임 병합 이전이므로 신규 게임 경로가 없다.

이 문서만 추가해 기존 `main` push 이벤트로 `.github/workflows/magic-forest-pages.yml`의 **원래 GitHub Pages 게시 절차를 재실행**한다. 다른 게임, 메인 홈페이지, 저장 파일, 배포 정책은 변경하지 않는다. GitHub Pages 정적 라우트에 게임이 올라간 사실과 실제 브라우저 구동 검증은 구분해서 확인한다.
