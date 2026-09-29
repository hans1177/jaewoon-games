# Web Games

`web-games/<game-id>/`는 앞으로 **Unity Web 빌드/배포 결과 경로**다.

## 원본

게임 원본은:

```text
unity-games/<game-id>/
```

이다.

## 이 경로에 들어오는 것

- Unity Web `index.html`
- loader
- `.wasm`
- `.data`
- `.framework.js`
- StreamingAssets
- 기타 Unity Web 빌드 산출물

## 금지

신규 1차 게임을 이 폴더에서 HTML/CSS/JavaScript/Canvas로 직접 제작하지 않는다.

## 기존 게임

기존 HTML/Canvas/PlayCanvas 게임은 Unity Web 전환 검증 전까지 Legacy/참고/비상 폴백으로 보존할 수 있다.

Unity Web PASS 후에는 `unity-games/<game-id>/`가 Canonical Source이며 이 폴더는 빌드 결과로 취급한다.

정책 원본: `company-learning/platform-release-roadmap.json` → `unityWebFirstStage`
