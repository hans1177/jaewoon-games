# 재운게임즈

재운게임즈의 웹게임, Godot 원본 프로젝트, 웹 배포본, 공용 에셋을 관리하는 저장소입니다.

## 기본 구조

- `web-games/`: HTML/CSS/JavaScript 기반 게임
- `godot-games/`: Godot 원본 프로젝트
- `builds/`: Godot Web Export 배포본
- `assets/`: 여러 게임이 함께 쓰는 공용 에셋

기존 게임은 안전한 이전이 끝날 때까지 현재 경로를 유지합니다. 새 게임부터 표준 구조를 적용하고, 기존 게임은 링크와 저장 데이터가 깨지지 않도록 하나씩 이전합니다.

세부 원칙은 `STRUCTURE.md`, `GAME_RULES.md`, `ASSET_RULES.md`, `LICENSES.md`, `DEPLOY.md`를 따릅니다.
