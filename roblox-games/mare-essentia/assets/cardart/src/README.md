# 해상전투 지역별 오브젝트 카드 원화

> **카드배틀 후속 작업 필독:** [제작·등록 인수인계](../../../docs/CARD_BATTLE_HANDOFF.md) 및 [원화 프롬프트 규칙](../../../docs/CARD_ART_PROMPTS.md)을 먼저 읽어야 한다. 등록 완료와 시안/미등록을 구분하고, 기존 `main` 자산과 SHA-256을 대조한다.

기존 `BoardingCards.luau` 의 `eu_01`~`af_30` 150장에 대응하는 신규 원본 벡터 삽화(SVG)다.

- 유럽·동아시아·중동·신대륙·아프리카 각 30장(선박 10·유물 7·동물 6·지형·원더 7).
- **사람·초상화는 포함하지 않는다.** 원화 구분 정보, 역사 소재 설명, 스킬/모션은 `../region-art.json` 참조.
- 상업 외부 이미지 무단 사용 없음. 작업용 원본 저작물: `PROJECT_ORIGINAL_ART`.
- 이 폴더는 원화 **소스**다. SVG는 게임에서 직접 표시되지 않는다. 검수된 PNG를 기존 `assets/cardart/`에 같은 카드 ID(예: `eu_01.png`)로 두고, `assets/APPROVED_IMAGES.json`에 해당 `CardArt/eu_01`의 실제 SHA-256을 승인한 뒤 기존 `tools/mare-essentia-upload-assets.mjs` 경로에서만 등록해야 게임에서 표시된다. 미승인 원본은 자동 등록하지 않는다.
- 기존 등록기는 5대륙 × 30장 이미지 파일명을 지원하지만, **현재 등록 증거는 별개**다. 승인·등록·Studio 화면 검증 전에는 카드 원화의 실제 게임 표시나 배포 완료를 주장하지 않는다.
- 기존 카드 밸런스, 저장 식별자, 카드 덱 최대치 30장, 전투 엔진은 이 원화 추가로 변경하지 않는다.

## 해전 카드게임판 배경 (원본 단일 이미지)

- 16:9 `1536×864` JPG `assets/cardart/battle_board.jpg` 원화 시안이 2026-11-13 제작됐다. 배치: 푸른 황금 대리석 전장, 6개 배치 줄에 맞는 나침반, 범선·항구·횃불 장식. 캐릭터·카드·버튼·글자 없는 **배경 전용** 이미지다.
- 생성 결과는 현재 대화 파일 `mare_battle_board.jpg`(SHA-256: `8673d3c0400c070031b10bc38bb941015a52d002f4a95c556cbdcc6d3fbe1b44`)이다. PNG 원화도 별도 보관.
- **아직 GitHub에 실제 JPG 바이너리 미업로드, `APPROVED_IMAGES.json`에 SHA 미등록, Roblox AssetIds에 `CardArt/battle_board` 미등록**. 이미 등록됐거나 게임이 새 원화로 동작했다고 주장하지 않는다.
- 기존 `NavalBattle.luau`의 단일 `CardArt/battle_board` 키로만 연결한다. 등록 전에는 기존 승인 `CardArt/event_chart_world`를 깔고 6개 전투 줄·손패 금속 테두리·색상 대비를 같은 함수 안에서 보여 준다.
- 승인 시 실제 JPG를 **기존 `assets/cardart/`에 직접 저장**하고 기존 `tools/mare-essentia-upload-assets.mjs`와 `assets/APPROVED_IMAGES.json` 승인 경로를 그대로 사용해야 한다. 승인 우회·새 업로더·자동 공개 배포는 금지.
- 전투 규칙·카드 150장·덱 제한·저장 구조 및 터치 확대 변경 없음. 배경 실화면 품질·폰에서의 가독성·Roblox Studio 검증 전에는 품질 완료로 표시하지 않는다.

## 신규 원화 후보 12장과 24프레임 모션 시트 (2026-11-14)

- ID: `ea_03`, `ea_04`, `ea_05`, `ea_08`, `ea_09`, `ea_10`, `ea_12`~`ea_17`.
- 이 폴더의 `ea_XX.png`는 직접 제작한 512×512 원화 시안이고, `ea_XX_24f.jpg`는 256×256 × 6열4행 = 24프레임 애니메이션 시트의 경량 미리보기 소스다. 고화질 PNG 시트와 움직이는 미리보기 GIF는 별도 제작 원본 묶음에 보존한다.
- 원본 합성 이미지 SHA-256: 선박 6장 `7cf40631f6731b7a1cd96aa558e7673aa0254432c7f531e8f5a6135f3a85dc22`, 유물 6장 `66a2f29c181141d6aa3a83e6068f0bb018cc3e795bd6e3ba23d0205bda049658`.
- 각 카드 24프레임의 픽셀 중복 및 루프 연결 수치만 오프라인 검사했다. 피사체 리깅·퀜트급 실제 동작·Roblox Studio 시각 검증은 **미완료**다.
- **2026-11-19 기존 24프레임 보조 자산 검수:** 위의 JPG 12장은 GPT가 시각 확인하고 별도 원본 SHA-256을 `assets/APPROVED_IMAGES.json`에 등록했다. 완성된 단일 원화 PNG를 덮어쓰지 않으며 24프레임 시트는 보조 애니메이션 자산에만 쓴다. 기존 `assets/cardart/<카드id>_24f.jpg`로 같은 Git 원본 바이트를 복사하고, 기존 Roblox 자산 등록기 및 사용 권한 확인을 통과했을 때만 `AssetIds`에 번호가 기입된다. 그 전에는 백과에서 정지 원화를 보여 준다. 움직임과 Studio 런타임은 별도 검증한다. 전투 규칙·저장값 변경 없음.

## 원화 제작·검수·등록 분리 (2026-11-16)

- **원화 제작:** 이미지 생성 모델이 카드별 단일 완성 PNG를 제작한다. SVG 파츠 조합·16/24프레임 시트·미리보기는 완성 원화로 인정하지 않는다.
- **바이브 검수:** 주제 일치, 역사 고증, 대항해시대 화풍 일관성, 단일 완성 그림, 파츠·시트 아님, 로블록스 콘텐츠 안전, 상업 이용 권리를 실제 이미지로 확인한다. 불확실하면 등록하지 않는다.
- **GitHub 인입:** 검수한 원본을 기존 `assets/cardart/src/<카드번호>-original.png`에 넣고, 같은 커밋에서 `assets/APPROVED_IMAGES.json`의 `approved` SHA-256 및 `modelOriginals` 증빙을 기록한다. **이미지 생성 모델에서 GitHub까지의 바이너리 전달은 제작 주체/ChatGPT가 수행한다**. GitHub Actions가 모델을 대신 호출하거나 유료 API를 사용하지 않는다.
- **기존 자동 등록기:** 승인 해시와 품질 증빙을 검증해 `assets/cardart/<카드번호>.png`로 승격하고 기존 로블록스 자산 업로드, 권한 부여, `assets-registered.json`·`AssetIds.luau` 갱신을 수행한다. 작업 성공 시에만 승격 PNG를 기존 GitHub Contents API로 `main`에 반영한다.
- **검수 증빙 예:** `modelOriginals["CardArt/eu_01"] = {"sourceType":"IMAGE_GENERATION_MODEL","sourceFile":"assets/cardart/src/eu_01-original.png","sourceSha256":"<실제 PNG SHA256>","reviewer":"VIBE_AGENT_VISUAL_REVIEW","reviewedAt":"2026-11-16","license":"PROJECT_ORIGINAL_ART","subjectMatch":true,"historicalContext":true,"houseStyle":true,"singleFinishedScene":true,"noPartsOrSprites":true,"robloxSafety":true,"commercialRights":true}`. 각 항목은 실제 검수한 뒤 참일 때만 기록한다.
- **보호:** 기존 20장 및 카드 번호·게임 규칙·저장 구조를 바꾸지 않는다. 신규 또는 바뀐 카드 원화는 검수 증빙이 없거나 PNG 최소 768px·해시가 다르면 실패 처리한다. 실제 카드 게임 화면 품질과 최종 게시 결과는 별도 확인한다.


## 원화 1장씩 등록·재등록 방침 (2026-11-23)

- **기본 단위는 카드 원화 1장**이다. 풀컬러 원본을 하나씩 검수 → GitHub 원본 저장 → 기존 자산 등록기 → Roblox 자산번호·사용권한 확인 → 다음 장 순서로 진행한다. 1장마다 결과를 기록하고 실패한 장을 건너뛰어 전체가 성공했다고 보고하지 않는다.
- **이미지 품질**: 신규 원화는 세로 7:10, 권장 1400×2000, RGB/RGBA 풀컬러 PNG(8비트×3/4채널)로 보관한다. 256색(P 모드/팔레트)으로 색상을 양자화하여 용량을 줄이지 않는다. 원본을 256색 파일로부터 재확대·색상 복원한 것을 풀컬러 원본이라고 부르지 않는다. 1400×2000 미만이면 업스케일만으로 화질 통과 처리하지 않는다.
- **256색 검수 후보 제거**: 2026-11-23 사용자 지시에 따라 `assets/inbox/CardArt/`의 팔레트 최적화 후보 `eu_01`, `eu_02`, `eu_03`, `eu_21`, `eu_22`, `eu_23` PNG 6개와 각각의 `.license.json` 6개(총 12개)를 현재 `main`에서 제거한다. 과거 Git 이력에만 남으며, 해당 후보는 승인·등록에 사용하지 않는다. `assets/cardart/`의 과거 등록본과 자산번호는 **새 풀컬러 원본의 실제 등록 및 사용권한 확인 전까지 게임 표시 안전을 위해 임의로 지우지 않는다**. 신규 자산번호 발급 성공으로 보고하지 않는다.
- **풀컬러 교체 등록 대기**: 기존 제작 풀컬러 PNG `eu_01`~`eu_23`의 여섯 원본은 별도 확보된 상태이며, GitHub 원본 바이트 업로드·실화면 화풍 검수·해시 승인·Roblox API 등록을 모두 통과해야 정식 승격한다. `eu_03`(1049×1500)·`eu_23`(1049×1499)은 1400×2000 목표 미달이다. 기존 256색 후보만 삭제했다는 이유로 승인하거나 이미 Roblox에 재등록했다고 주장하지 않는다.
- **기존 등록본 보존**: `assets/cardart/<id>.png`, `assets-registered.json`, `src/ReplicatedStorage/Shared/AssetIds.luau`, 저장 데이터 및 카드 규칙은 실제 신규 승인·등록·권한 검증 전 변경하지 않는다. 기존 `CardArt/eu_XX`에 이미 번호가 있으면 재업로드 없이 재사용하는 것이 기본이다. 새 버전으로 **교체**하려면 `modelOriginals`에 `replacesSha256`, `replacesAssetId`를 정확히 증빙한 다음 기존 등록기의 보호 검증을 통과해야 한다. 별도 등록기·래퍼·숨은 파이프라인을 만들지 않는다.
- **한 장 검수**: 카드 이름/소재 일치, 그림 1장(프레임·콜라주·테두리·문자 금지), 시대 고증, 기존 컬러 회화 화풍, 노출·선정성·현대 사진 금지, 실제 크기·색상·손상·출처·SHA-256을 검증한다. 확인되지 않으면 후보를 그대로 두고 승인 해시를 적지 않는다.
- **한 장 GitHub 반영**: 검수 통과 원본 1개만 `assets/cardart/src/<id>-original.png` 또는 기존 교체용 `<id>-1400x2000.png`에 넣는다. `assets/APPROVED_IMAGES.json`의 `approved["CardArt/<id>"]` 및 `modelOriginals["CardArt/<id>"]`는 **검증된 실제 원본 SHA-256**에만 일치시킨다. 원본과 승인 기록을 검증할 수 있는 단위로 반영하고 다음 원화로 넘어간다.
- **로블록스 등록**: 기존 `.github/workflows/owner-mare-essentia-assets.yml` → `tools/mare-essentia-upload-assets.mjs`만 사용한다. 그 작업은 승인된 원본을 `assets/cardart/<id>.png`로 승격하고, 업로드·개별 Universe 사용권한 확인 뒤 `assets-registered.json`·`AssetIds.luau`에 실제 번호를 저장한다. 작업 전체 성공 표시만 보고 신규 번호를 가정하지 말고, 해당 `CardArt/<id>`의 새 번호와 원본 해시를 확인한다. `SKIP_ALREADY_REGISTERED`면 기존 번호 재사용이다.
- **대체 직접 등록**: GitHub를 거치지 않고 Roblox Studio의 파일 가져오기 또는 Creator Dashboard의 개발용 이미지 업로드로 1장씩 등록할 수 있다. 다만 Roblox에서 번호가 발급됐다는 것과 **이 게임에 적용**됐다는 것은 별개다. 외부에서 업로드한 번호도 원본 SHA·소유자·사용권한·게임 내 표시를 검증하고 기존 정본 등록 경로에 일치시켜야 한다. 등록번호를 임의로 덮어쓰거나 공개 게시를 동시 실행하지 않는다.
- **실패 기준**: 업로드 요청 실패·심사 대기·사용권한 미확인·실화면 미검증이면 그 단계의 상태를 그대로 보고한다. 재시도해도 이전 성공 자산/저장키는 지우지 않는다. 무료 기존 기능만 사용한다.

**원화 1장 작업 증빙:** `카드 ID / 원본 파일명 / 원본 해상도·RGB 여부 / SHA-256 / 품질 검수 / Roblox 신규·기존 자산번호 / Universe 사용권한 / Studio 실제 표시 / main 커밋`.

**2026-11-24 오너 승인 40종 해상도 예외:** `docs/CARD_BATTLE_HANDOFF.md`의 40종 재제작 대상은 **직접 생성한 1049×1499 이상·약 7:10·8비트 RGB/RGBA PNG**를 허용한다. 단순 확대·팔레트 복원 금지와 품질·권리·원본 해시 검증, **한 장씩 GitHub 원본 승인 → 기존 Roblox 자산등록·사용권한·게임 연결·실화면 검증 후 다음 장** 순서는 유지한다. 그 밖의 기존 자산·지식카드·기존 등록번호에는 적용하지 않는다.


**2026-11-26 오너 해상도 승인:** `eu_22` 유라시아스라소니의 직접 생성 원본 1049×1500 RGB PNG도 허용한다. Dropbox `/Vibe2Transfer/eu_22-original.png` 실물 3,661,308바이트, SHA-256 `c1b73e8f60595b1c2dedded74650ec26e78b91c39c18e27402285bb9d133e4ab`; PNG 무결성 및 단독 스라소니 원화 시각 확인. 기존 1400×2000 원본과 다른 파일이며 해상도 승인만으로 기존 승인 해시나 등록 번호를 변경하지 않는다. 실제 바이너리와 검수 증빙을 동일 변경 단위로 반영한 뒤 기존 등록기에서 재등록·권한·게임 표시를 검증한다. 단순 확대, 256색 복원, 자동검사 우회 금지는 유지한다.

## 5장 원본 업로드 용량·복원 실행 기록 (2026-11-23)

- 최신 정확한 원본 용량·해시·분할 수와 검증 방법: [CARD_BATTLE_HANDOFF.md](../../../docs/CARD_BATTLE_HANDOFF.md#2026-11-23-풀컬러-원본-5장-실제-용량분할-전송-지시). 대상은 `eu_01`, `eu_02`, `eu_03`, `eu_21`, `eu_22`; 원본 바이트 각각 4,809,325 / 5,311,825 / 3,749,059 / 5,617,593 / 5,387,317바이트다.
- **웹 업로드 최우선:** 각 PNG를 `src/<id>-original.png`로 1장씩 GitHub에 올리고 SHA-256으로 확인한다. GitHub는 압축파일이나 분할 조각을 자동으로 복원하지 않는다.
- **대용량 GitHub API 장애 때:** 기존 `.transfer/<id>/partNN.b64`의 700,000문자 단위 Base64 분할을 사용한다. 실제 `src/<id>-original.png`가 없으면 업로드 미완료다.
- 기존 `.github/workflows/owner-mare-essentia-assets.yml`에는 분할 조각의 SHA-256을 검증해 원본 PNG를 main에 복원하는 정식 단계가 이미 있다. `eu_01`의 10조각은 main에 존재하나, 워크플로 실행 결과와 원본 복원 여부를 **별도로 확인**해야 한다.
- 256색 후보를 원본으로 사용하거나 원화 내용을 다시 그려서 대체하지 않는다. 원본/승인/Roblox ID/게임 표시 모두 개별 검증한다.
