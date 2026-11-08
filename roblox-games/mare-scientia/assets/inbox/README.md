# 에셋 inbox

새 에셋은 여기에 넣고 `python3 tools/devloop/register_asset.py <게임폴더>` 를 실행한다.

규칙
- 폴더 = 에셋 종류: `inbox/Cargo/foo.glb`, `inbox/Portraits/name.png` (3D는 .glb/.fbx, 그림은 .png/.jpg).
- 파일마다 `foo.glb.license.json` 필요: `{"license": "CC0-1.0", "author": "...", "source": "https://..."}`
  - 허용 라이선스: CC0-1.0, CC-BY-3.0, CC-BY-4.0, PUBLIC-DOMAIN, PROJECT_ORIGINAL_ART
  - 실존 인물 사진은 `PUBLIC-DOMAIN`(저작권 만료 그림·사진)일 때만, source 에 위키미디어 공용 등 원본 URL 필수.
- 등록되면 파일이 `assets/<종류>/` 로 옮겨지고 `SOURCES.md` 에 한 줄이 추가된다. 그 뒤 업로드 워크플로(owner-mare-scientia-assets)를 돌리면 AssetIds 에 반영된다.
