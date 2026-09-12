# 재운게임즈 구조 원칙

## 목표 구조

```text
jaewoon-games/
├─ index.html
├─ README.md
├─ STRUCTURE.md
├─ GAME_RULES.md
├─ ASSET_RULES.md
├─ LICENSES.md
├─ DEPLOY.md
├─ .gitignore
├─ .gitattributes
├─ assets/
├─ web-games/
├─ roblox-games/
├─ godot-games/
├─ unity-games/
└─ builds/
```

## 기본 원칙

1. 새 HTML/JavaScript 게임은 `web-games/게임이름/`에 둡니다.
2. 새 Roblox 원본은 `roblox-games/게임이름/`에 두고, 기존 V3 Pump의 `tools/vibe3-roblox-platform.mjs` 어댑터를 사용합니다.
3. 새 Godot 원본 프로젝트는 `godot-games/게임이름/`에 둡니다.
4. 새 Unity 모바일 원본 프로젝트는 `unity-games/게임이름/`에 둡니다.
5. Godot Web Export 결과물은 `builds/게임이름/`에 둡니다.
6. Roblox 실제 게시 파일 `.rbxl`/`.rbxlx`는 해당 게임의 `roblox-games/게임이름/` 아래에 두며, 현재 리비전 런타임/독립 QA/회귀 검증 전에는 출시 성공으로 기록하지 않습니다.
7. Unity의 `Library/`, `Temp/`, `Logs/`, `UserSettings/`, 로컬 `Build/`/`Builds/`, APK/AAB는 소스 저장소에 커밋하지 않습니다.
8. 여러 게임에서 공통으로 쓰는 에셋만 루트 `assets/`에 둡니다.
9. 특정 게임만 쓰는 에셋은 해당 게임 폴더 안에 둡니다.
10. 게임 시작 파일은 가능하면 `index.html`로 통일합니다. Unity 원본 프로젝트는 `Assets/`, `Packages/`, `ProjectSettings/` 구조를 유지합니다.
11. 폴더명과 새 파일명은 영어 소문자와 `-`를 기본으로 사용합니다.
12. 임시 파일, 테스트 파일, 중복 빌드는 배포 전에 제거합니다.
13. 기존 게임 경로는 한 번에 바꾸지 않습니다. 게임별로 복사/이전 → 내부 경로 수정 → 대문 링크 수정 → 실제 실행 확인 → 구경로 정리 순서로 진행합니다.
14. 기존 저장 데이터, 게임 규칙, 수치, 진행도는 구조 정리 과정에서 변경하지 않습니다.
15. 기존 `web-games/survival2/unity/` Unity 2022 프로젝트는 보존하고, 새 Unity 6 모바일 3D 프로젝트와 분리합니다.
16. Roblox가 기본 우선 플랫폼이지만 기존 Unity/Web 프로젝트를 임의 포팅하거나 교체하지 않습니다. 프로젝트에 기록된 선택 플랫폼을 우선합니다.

## 현재 이전 정책

현재 루트에 있는 기존 게임들은 정상 서비스 보호를 위해 그대로 둡니다. 새 구조를 먼저 만들고 이후 게임을 하나씩 목적에 맞는 원본 프로젝트 경로로 이전합니다.
