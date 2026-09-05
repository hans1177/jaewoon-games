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
├─ assets/
├─ web-games/
├─ godot-games/
└─ builds/
```

## 기본 원칙

1. 새 HTML/JavaScript 게임은 `web-games/게임이름/`에 둡니다.
2. 새 Godot 원본 프로젝트는 `godot-games/게임이름/`에 둡니다.
3. Godot Web Export 결과물은 `builds/게임이름/`에 둡니다.
4. 여러 게임에서 공통으로 쓰는 에셋만 루트 `assets/`에 둡니다.
5. 특정 게임만 쓰는 에셋은 해당 게임 폴더 안에 둡니다.
6. 게임 시작 파일은 가능하면 `index.html`로 통일합니다.
7. 폴더명과 새 파일명은 영어 소문자와 `-`를 기본으로 사용합니다.
8. 임시 파일, 테스트 파일, 중복 빌드는 배포 전에 제거합니다.
9. 기존 게임 경로는 한 번에 바꾸지 않습니다. 게임별로 복사/이전 → 내부 경로 수정 → 대문 링크 수정 → 실제 실행 확인 → 구경로 정리 순서로 진행합니다.
10. 기존 저장 데이터, 게임 규칙, 수치, 진행도는 구조 정리 과정에서 변경하지 않습니다.

## 현재 이전 정책

현재 루트에 있는 기존 게임들은 정상 서비스 보호를 위해 그대로 둡니다. 새 구조를 먼저 만들고 이후 게임을 하나씩 `web-games/`로 이전합니다.
