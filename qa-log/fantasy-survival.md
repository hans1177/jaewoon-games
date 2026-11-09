# 마력숲 점검 기록 (바이브가 매번 읽고 갱신)

## 확인 완료
- 2026-11-09 03:12 Studio 점검 결과(run 42554813192): 클릭 10번 동작(모험 시작/스킬/자동질주/설정 등), errors 비어 있음. 이후 클릭 11~30은 NOT_FOUND(설정 창에서 더 누를 버튼 없음 → 점검 스크립트 클릭 목록 보강 필요).
- 같은 점검에서 Client/Server 로그: 아이템·야영지 소품(item_armor_*, item_backpack, item_bone, item_book1_closed, item_chalice, item_chickenleg, item_crystal1, tent/flag/plant 등) 'not authorized' 오류 — 재업로드 전 상태였음.
- 2026-11-09 03:19 owner-fantasy-assets 워크플로 성공(run 42555512683): 새 계정 자산 ID가 main 에 갱신됨(커밋 faa603a).

## 알려진 미해결
- 재업로드 반영본이 아직 Studio 점검에서 검증 안 됨(점검 시각이 재업로드보다 빠름). 재배포(owner-new-experience) 요청함 → 다음 점검(매시 37분)에서 not authorized 로그가 사라졌는지 확인.
- Player:Move 'no character' 경고 (점검 중 캐릭터 없음, 영향 미확인).

## 다음에 볼 항목 큐
1. 다음 점검 로그에서 'not authorized' 잔여 ContentId 목록 확인 → 남은 것만 reupload-map.json 에 추가
2. 점검 스크립트 클릭 목록 보강(가방/제작/도감/스킬트리 버튼) — NOT_FOUND 줄이기
3. 재배포가 409 busy 이면 다음 실행에서 재시도
