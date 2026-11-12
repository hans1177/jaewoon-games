# 에셋 inbox

새 에셋은 여기에 넣고 `python3 tools/devloop/register_asset.py <게임폴더>` 를 실행한다.

규칙
- 폴더 = 에셋 종류: `inbox/Cargo/foo.glb`, `inbox/Portraits/name.png` (3D는 .glb/.fbx, 그림은 .png/.jpg).
- 파일마다 `foo.glb.license.json` 필요: `{"license": "CC0-1.0", "author": "...", "source": "https://..."}`
  - 허용 라이선스: CC0-1.0, CC-BY-3.0, CC-BY-4.0, PUBLIC-DOMAIN, PROJECT_ORIGINAL_ART
  - 실존 인물 사진은 `PUBLIC-DOMAIN`(저작권 만료 그림·사진)일 때만, source 에 위키미디어 공용 등 원본 URL 필수.
- 등록되면 파일이 `assets/<종류>/` 로 옮겨지고 `SOURCES.md` 에 한 줄이 추가된다. 그 뒤 업로드 워크플로(owner-mare-essentia-assets)를 돌리면 AssetIds 에 반영된다.

## NPC 복장 원본 후보 (26개 · 무료 표준팩)

- 원본: [Quaternius Modular Character Outfits - Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html), [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html)
- 출처 증거: 원본 무료 배포판 `License_Standard.txt` 에 CC0 1.0 명시. 모델마다 `.license.json` 에 원본 링크 및 Git blob SHA-1 기록.
- 실제 파일: `inbox/People/`에 성별 2종 × 주민/척후 계열 2종의 몸통·팔·다리·신발 16개, 후드 2개, 어깨 보호구 2개, 머리/수염 6개 = 총 26개 GLB.
- 적용 기준: 유럽 후기 중세의 선원·상인·주민·척후를 위한 후보. 오스만·일본·스와힐리 등의 전통 의상으로 위장하여 사용하지 않는다.
- **차단 조건**: 일반 휴머노이드 GLB이지 Roblox R15 의상으로 검증된 모델이 아니다. R15 리타깃·부착·모션·장면 시각검사를 통과하기 전에는 실제 NPC에 적용하거나 승인 키를 true로 만들지 않는다.
- 게임 시작 연도·선택지·역사 사건·저장·직업 밸런스는 이 파일들로 변경하지 않는다.
