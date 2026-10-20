# 푸른 항로 · 영국편: CC0 에셋 사용 기록

모든 추가 그래픽·UI·초상화·배경 음악은 **원작 대항해시대 4의 파일을 복제하지 않고** 공개 CC0 자산을 사용한다. 별도 판매 여부와 무관하게 원작의 보호 대상 음악/이미지/캐릭터를 포함하지 않는다.

## 출처가 확인된 CC0 자산

1. **Kenney — UI Pack - Adventure** (CC0): 갈색 판넬, 버튼, 프레임 PNG의 색·크기·테두리를 CSS로 변형. 원본: https://kenney.nl/assets/ui-pack-adventure / 보관소: https://github.com/shorepine/kenney/tree/3694c6879e487c108f55677be7dd2ca75b07cc3b/ui/UI%20Pack%20-%20Adventure
2. **Kenney — Cartography Pack** (CC0): 항구 건물·등대·선박·고전 해도 지도 아이콘을 재배치·색 보정. 원본 파일: https://github.com/shorepine/kenney/tree/3694c6879e487c108f55677be7dd2ca75b07cc3b/2d/Cartography%20Pack
3. **Buch — RPG portraits** (CC0): https://opengameart.org/content/rpg-portraits (9×3 32픽셀 픽셀 초상화). 영국·포르투갈·네덜란드·북유럽·스페인 승무원을 다른 원본 칸으로 분리하고 화면에서 확대/액자 적용.
4. **beardalaxy — Pirate Ship Theme Loop** (CC0): https://opengameart.org/content/pirate-ship-theme-loop — `pirate_ship_in_game.ogg`; 사용자가 음악 버튼을 눌렀을 때 재생.
5. **Bobjt — Crowded Pub** (CC0): https://opengameart.org/content/crowded-pub — `crowded_pub_2025.ogg`; 항구·선술집 장면에서 재생.
6. **Kenney — Pirate Kit** (CC0): 기존 `web-games/ocean-voyage/assets/*.glb` 선박·항구·조형물 11개를 그대로 사용.

## 다운로드 · 편집 · 배포 상태 (2026-10-20)

- **Kenney 13개 PNG**: 기존 Kenney UI Adventure(5개), Cartography(6개), Mobile Controls(2개)의 진짜 바이너리를 GitHub에 직접 가져와 `assets/cc0/ui`, `map`, `controls` 하위에 보관했다. 화면에서는 원본을 수정하지 않고 색·크기·프레임 배치를 CSS로 조정한다.
- **Buch CC0 RPG 초상화 1개 PNG**: 원본 `rpgportraits.png`를 `assets/cc0/portraits`에 직접 보관했다. **원본 328×112 픽셀 / 9×3 캐릭터** 아틀라스를 2배 확대한 다음 4픽셀 간격을 고려해 지역별 인물을 골라 보여 준다.
- **beardalaxy CC0 항해 OGG 1개**: `assets/cc0/music/pirate_ship_in_game.ogg`를 직접 보관하고 항해 중 재생한다. 브라우저 자동 재생 정책을 고려해 사용자 음악 버튼 이후에만 소리 재생을 시도한다.
- **항구·선술집 추가곡**: Bobjt의 CC0 `crowded_pub_2025.ogg`는 **아직 원격 URL에서 재생되는 외부 자산**이므로 자체 파일 패키징 완료로 표시하지 않는다. URL을 불러올 수 없는 상황에서는 음악이 재생되지 않을 수 있다.
- **기존 3D CC0 GLB 11개**: `assets/*.glb` 자체 호스팅 보존.
- GitHub 바이너리 Blob SHA1과 원본 주소 및 바이트 수는 `assets/cc0/manifest.json`에 기록했다. **15개의 새 CC0 바이너리는 원본과 Git Blob SHA1이 일치함**을 업로드할 때 확인했다.
- 원작 대항해시대 4의 이미지·음악·캐릭터 파일은 사용하지 않는다.

