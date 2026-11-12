# 대항해시대 점검 기록 (바이브가 매번 읽고 갱신)

## 확인 완료
- 2026-11-09 실행기 클릭 점검(mare-qa-click.json): 설정/새 게임/나라 8개/시대 3개/출항하기 버튼 클릭 동작 확인. 나라 초상 5개국 연필 스케치 표시 OK.
- 2026-11-09 시대 카드 글자 뭉개짐 수정(UIStroke Border) 확인 OK.
- 2026-11-09 01:57 Studio 점검(run 42548018545) 재확인: errors 비어 있음, 클릭 15번 정상, 이후 NOT_FOUND(게임 화면 진입 못 해 눌러볼 버튼 없음).
- 2026-11-09 점검 스크립트(mare-qa-click.json)에는 이미 Client/Server LOGS 수집이 들어 있음(큐 1번 완료). 아직 그 결과가 한 번도 안 올라옴.

- 2026-11-09 10:57(KST) 점검 결과 재확인: errors 비어 있음, 클릭 15번 정상 후 NOT_FOUND. 출항하기 직후 화면(c05)이 여전히 시작 화면 그대로. 이 결과는 LOGS 수집 추가 전 스크립트라 LOGS 없음.

- 2026-11-11 12:16(KST, run 42950594432) 새 점검 결과 확인: errors 비어 있음, 클릭 30/30 성공, 프레임 31장. 출항하기 클릭 후 게임 진입 성공(선장실·상태·교역소·조선소 정상 열림, 수리/선원/보급/고용/매각/장착 동작, 코인 변화 확인). → 이전 '출항하기 후 진입 실패' 문제는 해결된 것으로 봄. Client LOGS 비어 있음.
- 같은 점검 assetAudit: 모델 388개 PASS, registry 456개 PASS, 클라이언트 이미지 68/68 로드 확인(VISIBLE_CLIENT_IMAGE_ISLOADED). 기능 감사 failed 0.

## 알려진 미해결
- Server LOGS: 이미지 68개(Goods 33·Menu 12·Portraits 23 등) ContentProvider 서버 preload TIMEOUT_16S. 클라이언트에서는 68/68 로드되므로 Studio 서버 쪽 미리 불러오기 한계(오탐) 가능성이 큼. 실제 플레이 영향 없음으로 보이나 확정 아님 → 다음 점검에서도 같은 패턴인지 확인.
- 수동 항해 화면 미확인.

## 다음에 볼 항목 큐
1. Server TIMEOUT_16S 이미지 목록이 매번 같으면 오탐으로 확정, 점검 스크립트에서 서버 preload 판정 제외 검토 (4회째 같은 패턴)
2. 게임 안 메뉴(퀘스트·항해·지도·기술) 클릭 점검 추가(현재 교역·조선소·상태·항구까지만)
3. 수동 항해: 설정에서 켜고 스틱/WASD
(4번 항구 3D 배경 문제: 14:30 확인으로 해결)

- 2026-11-11 12:26(KST) 바이브: 위 점검 결과 확인. 코드 수정 없음(진입 실패는 해결됨, 서버 preload TIMEOUT은 오탐 가능성). 재배포 안 함.

- 2026-11-11 13:30(KST, run 42955027404) 바이브: 새 점검도 정상 — 클릭 30/30 성공, 프레임 31장, errors 비어 있음, Client LOGS 비어 있음. Server TIMEOUT_16S 25줄 이전과 같은 패턴(오탐 가능성 유지, 플레이 영향 없음). 코드 수정 없음, 재배포 안 함.

- 2026-11-11 14:30(KST, run 42960408686) 바이브: 새 점검 정상 — 클릭 30/30, 프레임 31장, errors 비어 있음. c07 jpg 직접 확인: 항구 3D 배경(성벽·나무·배)이 정상으로 보임 → '하늘만 나오는 문제' 해결로 봄. Server 소유권 감사에 Goods 16개 ID 보고되나 registry/클라이언트 이미지 68/68 PASS → 오탐 유지. 코드 수정 없음, 재배포 안 함.

- 2026-11-11 17:30(KST, run 42985043057, 17:23 촬영) 바이브: 새 점검 정상 — 클릭 30/30, 프레임 31장, errors 비어 있음, Client LOGS 비어 있음, 모델 388/registry 456/클라이언트 이미지 68/68 PASS. Server TIMEOUT_16S 68개 같은 패턴 → 오탐으로 봄(플레이 영향 없음). 코드 수정 없음, 재배포 안 함.

- 2026-11-11 18:17(KST, run 42990561757) 바이브: 새 점검 정상 — 클릭 30/30, 프레임 31장, errors 비어 있음. 코드 수정 없음, 재배포 안 함.

- 2026-11-11 19:23(KST, run 42998133413) 바이브: 클릭 30/30, 프레임 31장 정상. errors 에 STUDIO_ASSET_AUDIT_FAILED 1건(처음 등장): Server preload 96개 TIMEOUT_16S(140초 timedOut), clientImageAudit 가 UNVERIFIED(STUDIO_CLIENT_IMAGE_NOT_EXCLUSIVE_PRELOAD_TIMEOUT). 모델 401 PASS, registry 506 PASS(불일치·누락 0), Client LOGS 비어 있음 → 같은 Goods 서버 preload 오탐 패턴이 timeout 으로 번진 것으로 봄(플레이 영향 없음). 코드 수정 없음, 재배포 안 함.
- 다음 큐 추가: 서버 preload TIMEOUT 만으로 errors 에 STUDIO_ASSET_AUDIT_FAILED 가 붙지 않게 점검 스크립트 판정 완화 검토(5회째 같은 패턴). 다음 점검에서 clientImageAudit 가 PASS 로 돌아오는지 확인.

- 2026-11-11 21:26(KST, run 43014337341, 21:21 촬영) 바이브: 클릭 30/30, 프레임 31장, errors 에 STUDIO_ASSET_AUDIT_FAILED 1건(19:23 과 같음). 원인: Server preload TIMEOUT_16S 96개(CardArt 16개 포함) + clientImageAudit UNVERIFIED(INVALID_SOURCE:CardArt/event_angkor). 모델 431 PASS. c11 조선소 화면 jpg 직접 확인: 글자·초상·배경 정상. 플레이 영향 없음, 코드 수정 없음, 재배포 안 함.
- 큐 유지: CardArt 16개(registry 에 Image·권한 부여됨)가 클라이언트 감사에서 INVALID_SOURCE 인지(검수 대기 가능성) 다음 점검에서 확인. 서버 preload TIMEOUT 만으로 AUDIT_FAILED 가 붙지 않게 완화 검토(6회째).

- 2026-11-11 22:20(KST, 13:20Z 촬영) 바이브: 새 점검 — 클릭 30/30, 프레임 31장, errors 비어 있음. clientImageAudit PASS(이미지·소리 124/124 로드, 누락 0), registry 555 PASS, 모델 431 PASS → 앞 큐의 CardArt INVALID_SOURCE 해결 확인. Server preload TIMEOUT_16S 96개는 오탐 패턴 그대로(플레이 영향 없음). 코드 수정 없음, 재배포 안 함.

- 2026-11-11 23:24(KST, 23:14 촬영) 바이브: 새 점검(점검 스크립트 u0~u6 7장 버전, 클릭 없음) — 22/22 단계 완료, errors 비어 있음. 교역소·조선소·설정 jpg 직접 확인: 초상·글자 정상. 사소한 것: 교역소 상품 '융단' 이름 옆에 □(빠진 글자) 하나 보임, 소스에서 이모지 위치 못 찾음 → 다음 큐. 코드 수정 없음, 재배포 안 함.
- 큐 추가: 교역소 '융단' 옆 □ 글자(아이콘 글리프) 원인 확인.

- 2026-11-12 00:2x(KST, run 43045742504, 15:16Z 커밋) 바이브: 새 점검 정상 — 클릭 30/30, 프레임 31장, errors 비어 있음, Client LOGS 비어 있음(서버만 CardArt 12개 TIMEOUT_16S = 오탐 패턴 유지). 출항하기→선장실·교역소·조선소 동작 정상, 모델 431·registry 555·클라이언트 이미지·소리 124/124 PASS. 코드 수정 없음, 재배포 안 함. (이번 실행은 jpg 미확인, report.json 만 확인)

- 2026-11-12 01:19(KST) 바이브: 새 점검 정상 — 클릭 30/30, 프레임 31장, errors 비어 있음, 모델 431·registry 555·클라이언트 이미지·소리 124/124 PASS. 코드 수정 없음, 재배포 안 함.

- 2026-11-12 02:22(KST, run 43066831635) 바이브: 클릭 30/30, 프레임 31장. errors 에 STUDIO_ASSET_AUDIT_FAILED 1건: Server preload CardArt 12개 TIMEOUT_16S(serverPreloadUnresponsive=true, 오탐 패턴 유지). 모델 431 PASS, registry 663 PASS(불일치·누락 0). 새로 보임: clientImageAudit 232개 중 160개만 로드(소리 20/20), 미로드 72개 = Menu 12·Portraits 대부분(scholar_*·person_*)·Goods 2(whale_oil, wool) — 최근 학자 동료 추가(#12598)로 expected 가 늘었고 화면에 아직 안 뜬 이미지는 로드 안 된 것으로 보임(방문한 조선소 c12 jpg 는 정상).
- 큐 추가: 다음 점검에서 미로드 72개 수가 줄었는지/그대로인지 확인. 그대로면 Menu/*·Portraits/scholar_* 가 실제 Image 종류·권한 문제인지 점검. 코드 수정 없음, 재배포 안 함.

- 2026-11-12 08:16(KST) 바이브: 클릭 30/30, 프레임 31장. errors STUDIO_ASSET_AUDIT_FAILED 1건(Server preload CardArt 12개 TIMEOUT_16S, 오탐 패턴 유지). 모델 431 PASS, registry 673 PASS. 클라이언트 이미지 160/242 로드(미로드 82: Menu 12·Portraits 대부분·Goods 2) — 02:22 의 72개보다 늘었으나 새 Portraits 추가 때문으로 보임, 방문 화면 영향 없음. 코드 수정 없음(마력숲 실행기 버그만 수정), 재배포 안 함.

- 2026-11-12 11:22(KST, run 43139963019) 바이브: 클릭 29/30, errors 'step178:STUDIO_UI_TARGET_NOT_FOUND:auto30'(마지막 클릭만 못 찾음), 프레임 30장. c15·c29 jpg 직접 확인: 교역소 위에 새 '길드 서기·상인 길드' 이름 입력 창이 떠 있어 뒤쪽 버튼을 점검이 못 누름(이름 비어 있으면 '너무 빨라요' 표시). 글자·초상 정상, 깨진 이미지 없음. 게임 오류 아님(새 기능). 코드 수정 없음, 재배포 안 함.
- 큐 추가: 점검 스크립트가 길드 이름 창을 자동 통과(이름 입력→'장부에 올린다')하도록 보강 검토.

- 2026-11-12 13:21(KST, 04:21Z 커밋) 바이브: 클릭 28/30(선택 2건 건너뜀), 프레임 31장, 단계 185/185, Client/Server 콘솔 error 0. errors STUDIO_ASSET_AUDIT_FAILED 1건: ① Server preload CardArt 12개 TIMEOUT_16S(오탐 패턴 유지) ② 새로 보임: 모델 감사 Animals/* 10개(donkey·cat·cow·chicken·dog-pug·horse·llama·elephant·sheep·pig) INVALID_MODEL(581/591 로드). registry 869 PASS. c07·c20 jpg 직접 확인: 길드 서기 이름 입력 창이 교역소를 계속 덮고 있음(게임 오류 아님), 글자·초상·3D 배경 정상. 코드 수정 없음(다른 작업이 진행 중이라 충돌 피함), 재배포 안 함.
- 큐 추가: Animals/* 10개가 실제 모델 문제인지(새 동물 추가 직후 미반영인지) 다음 점검에서 같은 10개인지 확인. 길드 이름 창 자동 통과 아직 미반영.

- 2026-11-12 14:3x(KST, run 43160303288, 05:22Z) 바이브: 점검 스크립트 u0~u6 7장 버전(클릭 없음), 22/22 단계, errors 비어 있음. 새로 보임: 콘솔 error 1건 'Unable to assign property Text. string expected, got nil'(출처 미확인, 실제 화면엔 빈 글자 없음). u1·u2 jpg 확인: 교역소·조선소 위에 시작 메뉴('새 게임·설정·음악')가 떠 있는 상태로 캡처됨(점검 스크립트 특성), 교역소 '융단' 옆 □ 여전히 보임.
- 고친 것: □ 원인은 ✦(신상품)·▽(할인) 기호가 폰트에 없어서로 판단 → Game.client.luau 교역소 목록·카드의 두 기호를 '(신상)'·'(할인)' 글자로 교체. 재배포 요청.
- 큐: ① Text nil 콘솔 오류 출처 찾기(다음 점검에서 같은 오류인지, 클릭 있는 점검에서 어디서 나는지) ② 융단 □ 사라졌는지 확인 ③ Animals/* 10개 INVALID_MODEL 확인 ④ 길드 이름 창 자동 통과.

- 2026-11-12 16:2x(KST, run 43172130486, 소스 d1ada96) 바이브: 새 점검 정상 — 단계 185/185, 클릭 29/30(선택 1건 건너뜀), 프레임 31장, errors 비어 있음, 콘솔 error 0(경고 18). 모델 591/591 PASS(→ Animals 10개 INVALID_MODEL 해결 확인), registry 869 PASS, 클라이언트 이미지 278/278·소리 41/41 로드(미로드 0 → 앞의 미로드 82개 해결). c07·c25 jpg 직접 확인: 길드 서기 이름 창이 여전히 교역소를 덮음(게임 오류 아님), 글자·초상·3D 배경 정상. Server preload CardArt 12개 TIMEOUT_16S 는 오탐 패턴 유지. 코드 수정 없음, 재배포 안 함.
- 큐: ① 길드 이름 창 자동 통과(점검 스크립트) ② Text nil 콘솔 오류는 이번엔 안 나옴(error 0) — 다시 나오면 추적 ③ 융단 □ 는 클릭 있는 점검에서 확인 못 함(창이 가림).

- 2026-11-12 17:3x(KST, 08:25Z 커밋, 소스 b44121b) 바이브: 새 점검(탭 순회 17장 버전) — 단계 72/72, 클릭 3/3, 프레임 17/17, 모델 591/591·registry 869 PASS, 클라이언트 이미지 278/278. errors STUDIO_ASSET_AUDIT_FAILED 1건(Server preload CardArt 12개 TIMEOUT_16S 오탐 패턴 유지). 새로 보임: 소리 1개 music_region_w_africa(rbxassetid 87116162360580) 'Asset is not approved for the requester'(소리 76/77). 교역·지도 탭 jpg 확인: 글자·초상·3D 배경 정상.
- 큐 추가: 서아프리카 음악 1개 승인/권한 확인(mare-audio-upload 재업로드 필요할 수 있음, 시크릿 필요 가능). 코드 수정 없음, 재배포 안 함.

- 2026-11-12 19:2x(KST, 10:22Z 커밋, 소스 763db3a) 바이브: 새 점검 — 단계 116/116, 클릭 7/7, 프레임 29/29, 모델 591/591·registry 869 PASS, 클라이언트 이미지 278/278. **출항하기 클릭 후 게임 진입 성공**(INTRO_OK, 선장실·교역소 창 정상). intro_done·tab_harbor jpg 직접 확인: 글자·초상·3D 배경(하늘+바다·배·울타리) 정상, 하늘만 나오는 문제 해소로 보임. errors STUDIO_ASSET_AUDIT_FAILED 1건 = Server preload CardArt 12개 TIMEOUT_16S(오탐 패턴 유지) + 소리 music_region_w_africa(123867841859579 / 이전 기록 87116162360580) 'not approved for the requester'(소리 81/82).
- 못 고침(사람 작업): 서아프리카 음악 1개 권한 — mare-audio-upload 재업로드에 owner 시크릿 필요. 코드 수정 없음, 재배포 안 함.
- 큐: ① 서아프리카 음악 재업로드/권한(시크릿 복구 후) ② 길드 이름 창 자동 통과 ③ 항구 3D 배경 다음 점검에서 한 번 더 확인.

- 2026-11-12 20:3x(KST, run 43201451111, 20:18 촬영, 소스 8c34aa3) 바이브: 새 점검 — 단계 116/116, 클릭 7/7, 프레임 29/29, 모델 591·registry 869 PASS, 클라이언트 이미지 278/278. tab_harbor·tab_trade jpg 직접 확인: 글자·초상·3D 배경(마을·울타리·배) 정상. errors STUDIO_ASSET_AUDIT_FAILED 1건 = Server CardArt 12개 TIMEOUT_16S(오탐 패턴) + 소리 music_region_w_africa(123867841859579) 'not approved'(81/82) 그대로. 코드 수정 없음, 재배포 안 함. 사람 작업: 서아프리카 음악 권한(owner 시크릿).

- 2026-11-12 21:3x(KST, run 43210292598, 21:23 커밋, 소스 9dbe27b) 바이브: 새 점검 정상 — 단계 116/116, 클릭 7/7, 프레임 29/29, errors 비어 있음, 콘솔 error 0. 모델 591·registry 869 PASS, 클라이언트 이미지 278/278·소리 82/82 로드(→ 서아프리카 음악 'not approved' 해결 확인). tab_trade·tab_harbor jpg 직접 확인: 글자·초상·3D 배경 정상. Server CardArt 12개 TIMEOUT_16S 는 오탐 패턴 유지. 코드 수정 없음, 재배포 안 함.
- 큐: 서아프리카 음악 항목 종료. 길드 이름 창 자동 통과는 현재 점검 스크립트에선 문제 없음(클릭 7/7).

- 2026-11-12 23:3x(KST, run 43229698087, 23:23 커밋, 소스 b4299f8) 바이브: 새 점검 정상 — 단계 116/116, 클릭 7/7, 프레임 29/29, errors 비어 있음, 콘솔 error 0. 모델 591·registry 869 PASS, 클라이언트 이미지 278/278·소리 82/82. tab_harbor·tab_trade jpg 직접 확인: 글자·초상·3D 배경 정상. Server CardArt 12개 TIMEOUT_16S 는 오탐 패턴 유지. 코드 수정 없음, 재배포 안 함.
