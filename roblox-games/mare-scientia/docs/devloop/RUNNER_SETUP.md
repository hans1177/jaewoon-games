# 내 컴퓨터를 개발 루프의 "눈"으로 만들기 (한 번만 설치)

목표: 깃허브가 네 Windows 컴퓨터에서 Roblox Studio를 열어 화면과 오류를 가져오게 한다.

## 준비물
- Roblox Studio 설치 + 로그인 (이미 됨)
- 컴퓨터 24시간 켜 둠, **윈도우에 로그인된 상태 유지** (화면 캡처는 로그인된 바탕화면이 필요하다)
- 절전·화면 잠금 끄기 (설정 → 시스템 → 전원)

## 설치 (5분)
1. 깃허브 저장소 `hans1177/jaewoon-games` → Settings → Actions → Runners → **New self-hosted runner** → Windows 선택.
2. 화면에 나오는 명령을 PowerShell에 차례로 붙여 넣는다 (다운로드 → `config.cmd`).
3. `config.cmd` 질문에서:
   - runner group: 엔터(기본)
   - 이름: 엔터 또는 `studio-pc`
   - **추가 라벨(labels): `studio`** 입력 (필수)
   - 서비스로 설치할지 물으면 **N** (서비스로 하면 화면 캡처가 안 된다)
4. `run.cmd` 를 실행한 창을 열어 둔다. 윈도우 시작 시 자동 실행하려면 시작프로그램 폴더에 `run.cmd` 바로가기를 넣는다.
5. 깃허브 Actions 탭 → "Devloop Studio Probe (Mare Scientia)" → Run workflow 로 첫 시험.

## 안전
- 이 러너는 `devloop-studio.yml` 하나만 쓴다. 다른 워크플로의 `runs-on` 에 `studio` 를 쓰지 않는다.
- 외부 PR·포크에서는 실행되지 않게 되어 있다. 저장소에 모르는 사람이 쓰기 권한을 갖지 않게 유지한다.

## 결과 위치
- 깃허브 Actions → 실행 → Artifacts `studio-evidence` (스크린샷, 오류 줄)
- 저장소 `roblox-games/mare-scientia/docs/devloop/studio/` (다음 Claude가 읽음)

## 한계 (1차)
- 지금은 Studio를 Edit 모드로 열어 첫 화면을 찍는 수준이다. 플레이 모드로 항구 장면을 만들어 찍으려면 Studio 플러그인 또는 Studio MCP 연결이 2차로 필요하다.
