# 대충 RPG 3D 외부 에셋

이 폴더의 외부 3D 에셋은 모두 CC0 1.0 범위에서 사용한다.

## Quaternius RPG Characters
- Files: Warrior.gltf, Ranger.gltf, Wizard.gltf
- Source: Quaternius RPG Characters
- License: CC0 1.0
- Provenance mirror used for vendoring: euuuuuuan/cairnfall-public
- Upstream reference: https://quaternius.com/packs/rpgcharacters.html

## Quaternius Animated Monsters
- File: slime-data.mjs (Slime.glb의 base64 vendored form)
- Source: Quaternius LowPoly Animated Monsters
- License: CC0 1.0
- Provenance mirror used for vendoring: euuuuuuan/cairnfall-public
- Upstream reference: https://quaternius.itch.io/lowpoly-animated-monsters

게임 실행은 외부 CDN의 모델 파일에 의존하지 않는다. 모델 로딩 실패 시 기존 경량 primitive가 폴백으로 남는다.
