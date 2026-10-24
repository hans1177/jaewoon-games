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


## 유럽 픽셀 항해 개편 · 2026-10-25

- `assets/world.mjs`: Natural Earth `ne_110m_land.geojson`의 좌표를 경도×12, 위도×−12 게임 좌표로 변환했다. 원본: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- `assets/countries.mjs`: 같은 프로젝트의 `ne_110m_admin_0_countries.geojson`에서 유럽 및 인접국 경계를 추출했다. 경계는 현대 지리 참고선이며 1590년 역사 국경 재현이 아니다. Natural Earth는 Public Domain: https://www.naturalearthdata.com/about/terms-of-use/
- `assets/captains.webp`: 사용자가 요청한 실사풍 5개 지역 주인공을 위한 독자 생성 초상화. 원작 인물·이미지·상표를 복제하지 않았다. 생성 도구 imagegen. 최종 프롬프트: 1590년 항해자 5인 동일 너비 초상화 아틀라스, 잉글랜드 여성 선장·이집트 여성 학자·스와힐리 남성 상인·인도 남성 항해사·일본 여성 항해사, 사실적 유화, 글자 없음. 생성 PNG를 1500×600 WebP로 최적화했다.
- 픽셀 선박·마을·시설 배경은 게임 렌더러에서 직접 구성한 독자 그래픽이다. 기존 Kenney GLB와 CC0 원본들은 삭제하지 않았다. 기존 Buch 초상화는 동료 표시에서 계속 사용한다.
- 배경음악은 Web Audio 선법·선율·저음으로 직접 구성한 독자 절차 작곡이다. 항해·항구·왕궁·탐험 장면에 따라 선율이 바뀌며 사용자 음악 버튼 이후 재생한다. 기존 OGG는 보존되지만 새 재생 경로에서는 사용하지 않는다.
- 이 기록은 런타임 검증 통과 주장이 아니다. 실제 배포와 검증 결과는 별도로 확인한다.

- `captains.webp`: 216018 bytes · SHA-256 `3ef9e881080bdfa6f84d149c4b90c8b25cfc188072fadf4edbaf1e06a124a134`
- `world.mjs`: 104708 bytes · SHA-256 `338a49bb5fd4070537c33db9e234d4b139606409e876594e79f66f39a0279a9c`
- `countries.mjs`: 16163 bytes · SHA-256 `c439d7b0fc3a9fcdd02d204fb3d297c61b605d2efbd838014fb269adddb36e96`

- `harbor.webp`: 독자 생성 유럽 픽셀 항구 배경. 프롬프트: 1590년 유럽 항구, 시장·선술집·길드·왕궁·탐험가 사무실·조선소 2열 3행, 중앙대로와 부두, 글자 없는 정밀 16비트 픽셀아트. 이미지 생성 스킬로 제작하고 768×1152 WebP로 최적화. 400352 bytes · SHA-256 `eeaf9f0027ee12bfa7fb416dd522e71de891fc57fcb41818b75b6ca2379d0dd8`
