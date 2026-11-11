# 마력숲 점검 기록 (바이브가 매번 읽고 갱신)

## 확인 완료
- 2026-11-09 03:12 Studio 점검 결과(run 42554813192): 클릭 10번 동작(모험 시작/스킬/자동질주/설정 등), errors 비어 있음. 이후 클릭 11~30은 NOT_FOUND(설정 창에서 더 누를 버튼 없음 → 점검 스크립트 클릭 목록 보강 필요).
- 같은 점검에서 Client/Server 로그: 아이템·야영지 소품(item_armor_*, item_backpack, item_bone, item_book1_closed, item_chalice, item_chickenleg, item_crystal1, tent/flag/plant 등) 'not authorized' 오류 — 재업로드 전 상태였음.
- 2026-11-09 03:19 owner-fantasy-assets 워크플로 성공(run 42555512683): 새 계정 자산 ID가 main 에 갱신됨(커밋 faa603a).

- 2026-11-09 13:39(KST) 점검 재확인: errors 비어 있음, 클릭 10번 정상. 서버/클라이언트 로그에 'not authorized' 31개 ID 잔존 → 원인: item_*/mon_* 약 80개가 재업로드 목록(reupload-map.json)에 없어 옛 ID 그대로였음(재배포 03:25Z 성공했으나 이 항목들은 대상 아님).
- 2026-11-09 바이브: 원본 파일이 저장소에 있는 18개(mon_sk*4, mon_ninja/goblin/king/farmer/adventurer/womansoldier/womanmedieval/knightchar/wingdemon, item_key1/scroll/crystal1/book1_closed/armor_metal)를 reupload-map.json 에 추가.
- 2026-11-09 15:25(KST) 바이브: 새 점검 결과 없음(마력숲 13:39 그대로, 대항해시대 10:57 그대로). owner-fantasy-assets 05:26Z 성공 확인(18개 반영) → owner-new-experience 재배포 요청함(마력숲). 다음 점검(37분)에서 not authorized 감소 확인.

- 2026-11-09 17:25(KST) 바이브: 새 점검 결과 없음(13:39 그대로, 24시간 이내라 재요청 안 함). 점검 클릭 우선 목록에 가방/제작/도감/기사단/스킬트리/설정/자동질주 추가(NOT_FOUND 줄이기, 큐 2번 완료). 다음 점검에서 클릭 수 늘었는지 확인.

## 알려진 미해결
- 'permission for Asset' 6개 ID(villageLantern·StoneWall·Well·Roof·Pillar, item_star) 잔존: 저장소 시크릿 ROBLOX_OPEN_CLOUD_API_KEY / ROBLOX_CREATOR_USER_ID 가 비어 있어 owner-fantasy-assets 가 MISSING_ENV 로 실패. 사람이 시크릿 복구 후 재실행해야 함.
- Player:Move 'no character' 경고 (점검 중 캐릭터 없음, 영향 미확인).
- Studio Play/MCP 가 가끔 꺼짐(아래 17:18 점검 참고).

## 다음에 볼 항목 큐
0. 시크릿 복구 → owner-fantasy-assets 재실행 → owner-new-experience 재배포 → 6개 ID 사라졌는지 확인. 원본이 저장소에 없는 62개(mon_trex/fox/horse 등, item_backpack/potion/ring 등)는 원본 파일을 새로 받아야 함(사람 확인 필요)
1. 다음 점검 로그에서 'permission for Asset' 잔여 ContentId 확인
2. 재배포가 409 busy 이면 다음 실행에서 재시도

- 2026-11-09 19:23~11-10 02:23(KST) 바이브: 새 점검 결과 없음. 실행기/Studio 정지(10:26Z cancelled 이후). 새로 고칠 것 없음.

- 2026-11-11 12:19(KST, run 42950597774) 새 점검 결과: 실행기 다시 동작. errors 에 screen_capture 'Target is not reachable (DMN_RSRVD_FOCUSED)' → Studio 가 Play 상태 아니거나 MCP 꺼짐. 클릭 0/30, 프레임 0장. 12:26 사람 확인 요청.

- 2026-11-11 13:30(KST, run 42955029603) 바이브: 점검 정상 — 클릭 30/30, 프레임 31장, errors 비어 있음. Client LOGS 'permission for Asset' 6개 ID 남음(위 미해결 참고). 이전 약 31개에서 감소. 코드 수정 없음.

- 2026-11-11 14:30(KST, run 42960411522) 바이브: 새 점검 정상 — 클릭 30/30, 프레임 31장. 같은 6개 ID 그대로. 코드 수정 없음, 재배포 안 함.

- 2026-11-11 17:30(KST, run 42984418690, 17:18 촬영) 바이브: 점검 실패 — errors 에 screen_capture 'Target is not reachable (DMN_RSRVD_FOCUSED)', 클릭 0/30, 프레임 0장, 2단계에서 중단(12:19 와 같은 증상 재발: Studio Play/MCP 꺼짐). 코드 문제 아님. 같은 날 13:30·14:30 은 정상이었으므로 일시적일 수 있음. 사람 확인: PC Studio 에서 마력숲 열고 오른쪽 아래 MCP 켜기. 코드 수정 없음, 재배포 안 함.

- 2026-11-11 18:12(KST, run 42990205792) 바이브: 점검 실패 — screen_capture DMN_RSRVD_FOCUSED, 클릭 0/30, 프레임 0장(17:18 과 같은 증상 반복: Studio Play/MCP 꺼짐). 코드 문제 아님. 사람 확인: PC Studio 에서 마력숲 열고 오른쪽 아래 MCP 켜기. 코드 수정 없음, 재배포 안 함.
