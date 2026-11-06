# 개발 루프 기억 파일 (Mare Scientia)

> 다음에 깨어나는 Claude가 가장 먼저 읽는다. 한 바퀴 끝날 때마다 "최근 기록"과 "할 일"을 갱신한다.

## 목표
대항해시대 온라인처럼 보이고 플레이되는 로블록스 게임. 볼륨(항구·교역품·탐험·카드)과 마을 완성도를 함께 올린다.

## 규칙 (어기지 않는다)
- 작업 범위: `roblox-games/mare-scientia` 안만. 다른 게임·공용 시스템은 건드리지 않는다.
- 에셋: 승인된 CC0 모델만(`assets-registered.json`에 등록된 것). 도형(Part) 조립 외형을 새로 늘리지 않는다. 없으면 부족 항목을 이 파일에 적고 넘어간다.
- 배포: 직전 배포 후 15분 이상 지났을 때만. 한 바퀴에 최대 1번. 409면 약 20분 뒤 한 번만 재시도.
- 푸시 전 필수: `tools/devloop/asset_check.py` 통과, `LUAU_DIR=... tests/run.sh` 통과.
- 거짓 보고 금지: 화면을 못 봤으면 "못 봤다"고 쓴다. 배포 성공 ≠ 잘 보임.
- 한국어로 짧고 쉽게 보고한다.

## 한 바퀴 절차
1. `git pull` 후 이 파일, `docs/devloop/TELEMETRY.md`(게임 오류·FPS), `docs/devloop/QUALITY.md`(항구 점수)를 읽는다.
2. TELEMETRY의 오류가 있으면 그것을 먼저 고친다.
3. 없으면 아래 "할 일" 맨 위 1~2개를 한다. 항구 품질표 하위 항구부터 보강한다.
4. 검사 통과 확인 → 커밋·푸시 → (15분 규칙 지켜서) 배포.
5. "최근 기록"에 한 줄 남기고 `QUALITY.md`를 다시 생성한다 (`tests/run.sh quality > docs/devloop/QUALITY.md`).

## 할 일 (위가 먼저)
1. 품질표 하위 10개 항구에 탐험지·이야기·퀘스트 보강 (점수 70 미만 없애기).
2. 도형(Part)으로 만든 둘째 잔교·말뚝을 승인된 부두 모델(Naval/dock-side, dock-corner, structure-platform-dock-small 등)로 교체.
3. 미사용 등록 에셋(Town/balcony-wall, overhang, house_chimney, gate_single 등)을 건물 다양화에 연결.
4. 마을 건물 방향(문이 길을 보게)·겹침 점검 규칙을 asset_check 옆 검사로 추가.
5. 항구 야간 조명(창문·가로등 켜짐), 부두 배 흔들림.
6. 동료 R15 NPC 대화·호감도 연출.

## 알려진 한계
- 이 환경에서는 게임 화면을 볼 수 없다. 화면 확인은 오너의 스크린샷 또는 텔레메트리에 의존한다.
- 텔레메트리는 `ROBLOX_OPEN_CLOUD_API_KEY`에 DataStore 읽기 권한이 있어야 문서에 채워진다.
- F0~F9(`company-development-roblox-*`) 파이프라인은 Mare Scientia를 받지 않는다(워크플로에 이 게임 경로 없음). 이 게임은 `owner-mare-scientia-direct-publish.yml`로만 배포된다.

## 최근 기록
- 2026-11-06: 마을 대개편(밀도·광장·부두·랜드마크·성벽), 동료 R15 따라다니기, 항로 16290개, 개발 루프(에셋 검사·품질표·텔레메트리·기억) 도입.
