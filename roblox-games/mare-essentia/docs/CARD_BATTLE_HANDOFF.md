# 카드배틀 원화 제작·자산등록 인수인계

> **후속 작업자 필독 · 2026-11-22 작업 기준.** 대상: `hans1177/jaewoon-games` / `main` / `roblox-games/mare-essentia/`. 이 문서는 카드 제작의 작업 이력·미완료 항목·원화 기준을 정리한 실행 지침이다. **등록 상태는 반드시 작업 시작 시 최신 `main`에서 재조회**한다. 충돌 시 최신 오너 지시와 `company-learning/platform-release-roadmap.json`을 포함한 네 중앙정책을 최우선으로 한다.

## 1. 반드시 선로드할 문서·원본

1. 저장소 루트 `AGENTS.md`, 중앙정책 4종(`company-learning/platform-release-roadmap.json`, `company-log-map.json`, `company-architecture-map.json`, `security-immune-system.json`). 큰 로드맵 파일은 GitHub Contents API에서 빈 콘텐츠로 응답할 수 있으므로 `platform-release-roadmap.brief.json`을 함께 보고 **전체 원본은 Git Blob/raw/clone**으로 읽는다.
2. `docs/CARD_ART_PROMPTS.md`(대륙 카드/지식카드 화풍 구별), `docs/continent_card_art_prompts.csv`(정확한 카드 ID·명칭·소재), `assets/cardart/region-art.json`(전투 카드 속성), 기존 승인 원화.
3. `assets/APPROVED_IMAGES.json`, `assets-registered.json`, `src/ReplicatedStorage/Shared/AssetIds.luau`, `assets/cardart/src/*-original.png`를 **현재 `main`에서 대조**한다. 이미 승인·등록된 카드를 같은 작업으로 덮어쓰거나 중복 업로드하지 않는다.

## 2. 오너가 확정한 카드 원화 화풍

- **실사 사진·스톡 사진·동물 도감의 정적인 정면 사진풍이 아니다.** 게임에서 강렬한 첫인상을 주는 **컬러 역사 회화·역동적인 유화/붓터치·입체적 명암**을 사용한다. 전방 돌진, 도약, 포효, 파도·포말, 흙먼지·파편, 극적인 원근, 광원과 깃발 움직임 등 소재에 맞는 동세를 살린다.
- 한 카드에 **카드 ID가 의미하는 주제 하나**를 그린다. `af_18`은 아프리카 코끼리, `af_19`는 아프리카사자, `af_20`은 기린, `af_21`은 하마, `af_22`는 검은코뿔소, `eu_03`은 갈레온. 동물을 다른 병종·인물·해전으로 바꾸거나 주제에 없는 군대·갑옷을 임의 추가하지 않는다.
- 대륙 카드 원화: **1:1 정사각형, 권장 1024×1024 PNG**, 최소 768px, 단일 완성 그림. **문자·수치·카드 금테·패널·등록 대시보드·여러 카드 콜라주·워터마크·스프라이트 시트 금지.** 카드 프레임과 공격력/비용/체력은 기존 게임 UI가 표시한다. 정지 PNG 한 장이어도 **그림 속 동작은 역동적**이어야 한다. 게임 내 움직임 기능을 새로 켜거나 규칙을 바꾸라는 의미가 아니다.
- **구별:** 지식카드는 별도 규칙(세피아 동판화 4:3), 이벤트 배경은 16:9, 지도자 원화는 별도 세로 규격. 대륙 카드에 지식카드 세피아·실사 사진 기준을 섞지 않는다.
- 로블록스 안전, 저작권·상업 이용, 지역·시대 고증을 시각 검수한다. 위험하거나 불명확하면 제외한다. 기존 게임의 카드 ID·병종·밸런스·데이터 저장 구조·모션·배포 체계를 임의 변경하지 않는다.

## 3. 실제 확인한 카드 자산 기록 (2026-11-22 `main` 기준)

아래 **등록 4종**은 `assets-registered.json`의 `CardArt/<id>`에 자산번호·`usePermissionGranted:true`가 있고, `APPROVED_IMAGES.json` 원본 해시·`modelOriginals` 기록과 일치했다. **실제 Studio 화면 표시와 최종 게임 게시 검증은 이 기록만으로 확정하지 않는다.**

| 카드 | 소재 | Roblox 자산번호 | SHA-256 원본 해시 | 상태 |
|---|---|---|---|---|
| `af_18` | 아프리카 코끼리(돌진) | `118991943570083` | `0e291db8baf6e17979261a2fa3ce55d346df9a76ee46704fb4eafa2ed878abbb` | 등록·권한 확인 |
| `af_19` | 아프리카사자(도약·포효) | `140089768483999` | `84776f8b521083e660b28e64d7656a31d879bdab33a273ce7ba32858b113b985` | 등록·권한 확인 |
| `af_20` | 기린(질주) | `107734944778682` | `da0d6624beacdc1cb58a0df2505941336d51901ab993061e0d147081afddd2ba` | 등록·권한 확인 |
| `eu_03` | 갈레온(포격 해전) | `108123992109157` | `a44f9424cdf12af58f0709cecb82c9dfc1c60aaf89373b55b3da5fe8dae06349` | 등록·권한 확인 |

아래 **미등록 2종**은 이 대화에서 원화 PNG와 해시를 생성하고 전달용 압축파일 `cardbattle_af21_af22_ready.zip`에 넣었으나, 당시 `main`에는 원본·승인·등록이 없었다. **로컬 대화 파일은 새 작업자에게 자동 마운트된다고 가정하지 않는다.** 원본 PNG를 확보해 바이트 해시부터 확인할 것. 확보할 수 없다면 재제작하되 구 해시를 새 그림에 사용하면 안 된다.

| 카드 | 원본 후보 | SHA-256 후보 해시 | 다음 작업 |
|---|---|---|---|
| `af_21` 하마 | `af_21-original.png` (하천 돌진·물보라) | `9f78606ca37b156d8577ad66e1589444e22a1f03c8515eec7b5f881b71b00808` | 원본 확보 → 시각검수 → 승인·등록 |
| `af_22` 검은코뿔소 | `af_22-original.png` (흙먼지 돌진) | `a43f1037436280d6b12eecb21f0a7f94753131e90b4ee40a7976abfe5ca33acd` | 원본 확보 → 시각검수 → 승인·등록 |

**후속 제작 우선순위:** `af_21`, `af_22`의 미등록분을 정리하고, `af_23` 얼룩말부터 `continent_card_art_prompts.csv`에 있는 미등록 카드 순으로 계속 제작한다. 실제 등록상태가 바뀌었으면 새 `main`을 기준으로 건너뛴다.

## 4. 기존 정식 등록 절차만 사용

1. **현재 상태 대조:** `assets/cardart/src/`, `assets/cardart/`, 승인표·등록표와 실제 `AssetIds.luau`를 확인해 중복 및 주제 오류를 막는다.
2. **원화 생성·시각검수:** ID·이름·카테고리를 원본 목록과 대조하고, 화풍·동세·시대성·안전성·상업 권리·단일 완성 그림 여부를 직접 확인한다. 잘못 생성된 대시보드, 다른 카드 소재, 가짜 완료 화면은 **폐기**한다.
3. **PNG 규격·해시:** 1024×1024 권장; 등록기는 PNG 헤더/IHDR, 가로·세로 768~4096, 파일 50KB~20MB, SHA-256 일치를 검사한다. 이미지 최적화/색상변환 후에는 **최종 PNG 바이트**를 기준으로 새 해시를 계산하고 화질 열화를 재검수한다.
4. **원본 커밋:** `assets/cardart/src/<id>-original.png`에 완성 원본을 저장하고, **같은 변경**으로 `assets/APPROVED_IMAGES.json`의 `approved["CardArt/<id>"] = "<sha256>"` 및 `modelOriginals["CardArt/<id>"]` 기록을 추가해 `main`에 반영한다. 승인 항목은 `sourceType:"IMAGE_GENERATION_MODEL"`, `sourceFile:"assets/cardart/src/<id>-original.png"`, `sourceSha256`, `reviewer:"VIBE_AGENT_VISUAL_REVIEW"`, `reviewedAt`, `license:"PROJECT_ORIGINAL_ART"`, `subjectMatch`, `historicalContext`, `houseStyle`, `singleFinishedScene`, `noPartsOrSprites`, `robloxSafety`, `commercialRights`의 **실제 확인 결과**를 요구한다. 7개 검사 항목은 모두 참일 때만 승인한다.
5. **바이너리 업로드:** 기존 작업 사례처럼 GitHub Blob API의 `encoding:"base64"` 또는 Contents API의 Base64 `content`로 **실제 PNG 바이트**를 전송한다. 성공 반환된 Git Blob SHA 및 원본 SHA-256을 대조한다. 채팅의 Base64 문자열/압축 파일 생성만으로 원격 업로드를 완료했다고 말하지 않는다.
6. **기존 작업 자동 실행:** `main`의 자산 경로 변경으로 `.github/workflows/owner-mare-essentia-assets.yml`이 실행된다. 기존 `tools/mare-essentia-upload-assets.mjs`가 승인 해시와 원본을 검증해 `assets/cardart/<id>.png`로 승격하고 Roblox Open Cloud에 등록·사용 권한을 확인한 후 `assets-registered.json`·`AssetIds.luau`를 갱신한다. **새 업로더/랩퍼/우회 파이프라인·유료 API를 만들지 않는다.**
7. **성공 판정:** `main`의 실제 커밋, 자동등록 워크플로 **성공 로그**, 각 자산번호, `usePermissionGranted:true`, `sourceSha256`·승인 해시·실제 원본 일치, `AssetIds.luau` 바인딩을 모두 재검증한다. 게임 게시와 Roblox Studio **실제 표시**는 별도 검증한다. 한 단계라도 미검증이면 그 단계는 미완료로 기록한다.

참고: [기존 6대륙 원화 정식 병합 #14168](https://github.com/hans1177/jaewoon-games/pull/14168), [기존 등록 작업 워크플로](https://github.com/hans1177/jaewoon-games/blob/main/.github/workflows/owner-mare-essentia-assets.yml). 이미 있는 `main` 커밋·자동등록 시스템을 따른다.

## 5. 실패·금지 사례 / 후속 작업자 보고 형식

- 이미지 생성 모델이 **실제 실행하지 않은 GitHub/Roblox/Studio 완료 대시보드, 임의 AssetId, 가짜 검증표**를 그린 사례가 있었다. 그런 이미지는 자산·검증 증거가 아니며 **승인 금지**. 등록 성공 주장은 GitHub API·워크플로·실제 게임 화면 증거만 사용한다.
- 원화의 의미가 다르거나(기린 대신 군함, 하마 대신 장군 등) 전투 카드가 아닌 일반 사진풍이면 등록하지 않는다. 대화에 원본이 있다 하더라도 **실제 GitHub PNG 바이너리 커밋 전**에는 등록 완료로 말하지 않는다.
- 원본이 없는 승인 내역은 미등록 보류하며, 기존 잘 등록된 카드번호·저장·밸런스·UI를 임의 변경하지 않는다.
- 각 카드 작업 결과는 **`카드 ID / 소재 / PNG 원본 SHA-256 / main 커밋 / Roblox 자산번호 / 권한 / AssetIds 바인딩 / Studio 실화면 / 게시 검증`** 순서로 기록한다. 증거 없는 항목은 `미완료` 또는 `미검증`으로 명시한다.
- 사용자가 **“계속”, “진행”, “제작후 자산등록”**을 지시하면 미등록분부터 다음 단일 원화 제작→정식 등록→검증까지 실제 작업한다. 작업 지시서 작성만으로 완료로 보고하지 않는다.

**이 문서는 후속 작업을 시작하는 에이전트가 사전에 읽어야 하는 인수인계다.** 본문의 숫자·상태는 2026-11-22 기록이고, 후속 작업의 최종 진실은 항상 새 `main`과 원격 실증 데이터다.

## 6. 2026-11-22 후속 등록 실측

이 절은 앞의 초기 인수인계 표 **이후** 확인한 결과다. 후속 작업자는 항상 최신 `main`의 승인표·등록표·`AssetIds.luau`에서 다시 검증한다.

| 카드 | 소재 | Roblox 자산번호 | 원본 SHA-256 | 결과 |
|---|---|---|---|---|
| `af_21` | 하마 | `139202302026948` | `9f78606ca37b156d8577ad66e1589444e22a1f03c8515eec7b5f881b71b00808` | `main` 원본·승인 해시·권한·바인딩 확인 |
| `af_22` | 검은코뿔소 | `112968614735458` | `a43f1037436280d6b12eecb21f0a7f94753131e90b4ee40a7976abfe5ca33acd` | `main` 원본·승인 해시·권한·바인딩 확인 |
| `af_23` | 얼룩말 | `137895732576949` | `727c31c8d1e5444f1a1a248265b022cec4352d152cd3ae1bb830cd2042184cc9` | `main` 원본·승인 해시·권한·바인딩 확인 |

- `af_21`·`af_22` 원본 및 승인표 반영 커밋: `a14d0e3acdf0ca431b64dd882efee86588efd35e`.
- `af_23` 원본 및 승인표 반영 커밋: `84f9382f8082fa52c9240acb8a4fa8da0237bbcf`. 원본 1024×1024 PNG·바이너리 Git 객체 해시 `a29a356a94695981e373e7e94a7659f5aca333b2` 일치.
- **다음 제작 후보는 `af_24` 기자 피라미드.** 이미지 생성 시 사자 그림이 잘못 출력돼 **해당 후보 시안은 폐기**했다. 주제에 맞는 피라미드 원화를 새로 제작하기 전에는 승인·업로드하지 않는다.
- Studio 실제 게임 카드 표시와 최종 Place 게시 결과는 이 자산 등록 증거만으로 통과 판정하지 않는다. 게임 코드/저장·전투 규칙 변경 없음.
