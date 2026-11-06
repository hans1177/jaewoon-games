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
0. 위 '첫 실제 화면 관찰'의 문제1~4를 고치고 `devloop-studio.yml`을 다시 돌려 사진으로 확인한다(수정→배포 없이 캡처로 먼저 검증).
1. 품질표 하위 10개 항구에 탐험지·이야기·퀘스트 보강 (점수 70 미만 없애기).
2. 도형(Part)으로 만든 둘째 잔교·말뚝을 승인된 부두 모델(Naval/dock-side, dock-corner, structure-platform-dock-small 등)로 교체.
3. 미사용 등록 에셋(Town/balcony-wall, overhang, house_chimney, gate_single 등)을 건물 다양화에 연결.
4. 마을 건물 방향(문이 길을 보게)·겹침 점검 규칙을 asset_check 옆 검사로 추가.
5. 항구 야간 조명(창문·가로등 켜짐), 부두 배 흔들림.
6. 동료 R15 NPC 대화·호감도 연출.

## 첫 실제 화면 관찰 (2026-11-07, Studio 캡처 7장)
- 오류 0, 에셋 로드 정상(Cargo118 Naval64 Town58 등), 마을 파츠 1015개·모델 1507개·집 116채. 파이프라인 정상.
- 문제1: 집이 전부 같은 모양의 나무 상자형 + 평평한 모래 바닥 → 여전히 단조롭고 휑함. 지붕·층수·높이·방향 다양화, 바닥 변화(풀·흙·돌길) 필요.
- 문제2: 광장 돌바닥이 과노출(노랗게 번짐) → Lighting.Brightness/Bloom/Atmosphere 낮추기.
- 문제3: 항만청 쪽 감시탑(tower-complete-large size18)과 갤리온이 화면을 압도, 크기 비율 어색 → 탑 크기·위치 축소, 배 크기 점검.
- 문제4: 캡처 카메라 7곳 중 여러 장이 비슷한 위치로 찍힘 → `ShotCF` 적용 확인 필요(카메라 스크립트가 덮어쓰는지 점검, 예: Game.client의 카메라 루프).

## 알려진 한계
- 화면 확인: 오너 PC의 로그인된 Studio 러너(기존 라벨 roblox-studio-authenticated)가 `devloop-studio.yml`(Actions에서 Run workflow, gh api dispatch 가능)로 마을을 띄워 캡처한다. 결과는 브랜치 `mare-studio-frames`(PNG 7장 + report.json). `git fetch origin mare-studio-frames` 후 PNG를 Read로 열어 눈으로 확인하고 고친다. 캡처 스크립트: `tools/devloop/studio-scripts/mare-town.json`.
- 화면은 `devloop-studio.yml` 캡처로 볼 수 있다(오너 PC가 켜져 있어야 함). 캡처는 Studio 편집기 안 재생이라 실제 서버 데이터는 없다.
- 텔레메트리는 `ROBLOX_OPEN_CLOUD_API_KEY`에 DataStore 읽기 권한이 있어야 문서에 채워진다.
- F0~F9(`company-development-roblox-*`) 파이프라인은 Mare Scientia를 받지 않는다(워크플로에 이 게임 경로 없음). 이 게임은 `owner-mare-scientia-direct-publish.yml`로만 배포된다.

## 최근 기록
- 2026-11-06: 마을 대개편(밀도·광장·부두·랜드마크·성벽), 동료 R15 따라다니기, 항로 16290개, 개발 루프(에셋 검사·품질표·텔레메트리·기억) 도입.
