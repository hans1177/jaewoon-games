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
- 재업로드 반영본이 아직 Studio 점검에서 검증 안 됨(점검 시각이 재업로드보다 빠름). 재배포(owner-new-experience) 요청함 → 다음 점검(매시 37분)에서 not authorized 로그가 사라졌는지 확인.
- Player:Move 'no character' 경고 (점검 중 캐릭터 없음, 영향 미확인).

## 다음에 볼 항목 큐
0. owner-fantasy-assets 실행(병합 후) → owner-new-experience 재배포 → 다음 점검에서 not authorized 감소 확인. 원본이 저장소에 없는 62개(mon_trex/fox/horse 등 동물·공룡, item_backpack/potion/ring 등)는 원본 파일을 새로 받아야 함(사람 확인 필요).
1. 다음 점검 로그에서 'not authorized' 잔여 ContentId 목록 확인 → 남은 것만 reupload-map.json 에 추가
2. 점검 스크립트 클릭 목록 보강(가방/제작/도감/스킬트리 버튼) — NOT_FOUND 줄이기
3. 재배포가 409 busy 이면 다음 실행에서 재시도

- 2026-11-09 19:23(KST) 바이브: 새 점검 결과 없음(13:39 그대로). 점검 실행이 04:36Z 이후 멈춰 있어 재배포 효과 검증 대기 중. PC 실행기 확인 필요.

- 2026-11-09 21:25(KST) 바이브: 새 점검 결과 없음(결과 브랜치 그대로, 24시간 이내라 재요청 안 함). devloop-studio 10:26Z 실행도 cancelled → PC 실행기/Studio 멈춤 계속(사람 확인 필요: Studio 창 닫기·MCP 켜기). 새로 고칠 것 없음.
