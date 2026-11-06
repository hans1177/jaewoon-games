# Mare Scientia 3D 자산 출처

17~18세기 유럽 항구 교역·항해·탐험 RPG용 실제 3D 모델 원본. 기존 저장소의 검증된 자산을 동일 Git blob으로 복사했으며 원본은 유지했다.

| 폴더 | 모델 | 제작자 · 라이선스 | 원본 |
|---|---|---|---|
| `naval/` | 범선·부두·항구 소품 GLB 11개 | Kenney · CC0-1.0 | https://kenney.nl/assets/pirate-kit |
| `town/` | 집·문·울타리·나무 OBJ 22개와 MTL 22개 | Tiny Treats · CC0-1.0 | https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0 |
| `town/` | 성벽·지붕·장터·우물·길·수목 등 GLB 24개 | Kenney · CC0-1.0 | https://kenney.nl/assets/fantasy-town-kit |
| `people/` | 선원·항구 노동자·주민·귀족·경비병·주점 직원·학자역·도시 주민 등 FBX 22개 | Quaternius · CC0-1.0 | https://opengameart.org/content/animated-characters-pack |

원본 위치:
- `web-games/ocean-voyage/assets/`
- `assets/shared/homely-house/`
- `assets/shared/party/` (license.txt, sources.json)
- `assets/roblox/actors/sources/quaternius-characters/FBX/` (manifest.json)

NPC 모델 22개는 모두 LFS 포인터가 아닌 원본 바이너리 Git 객체로 복사했다. 내역: Pirate, Worker, OldClassy, Casual, Soldier, Chef, Doctor, Casual2, Casual3, BlueSoldier 각 남녀. 직업 배치는 화면용 제안이며 실제 NPC의 게임 능력치·세계관 사실관계를 정의하지 않는다.

라이선스: 모든 자산이 CC0-1.0으로 상업적 이용·수정 가능하며 출처는 추적한다. 최종 사용 전에 해당 게임 시대에 맞는 외형·재질 재구성이 필요하다.

**실제 게임 적용 전 단계**: GLB/OBJ/FBX는 GitHub에 확보된 원본이다. Roblox Studio에서 MeshPart로 변환·가져오기, 앵커·충돌·크기 조정, 모델 배치 및 서버/클라이언트 로드 경로 검증을 거쳐야 한다. 이 작업만으로 Roblox 체험의 항구가 표시되거나 게시되는 것은 아니다.

## 2026-11-06 추가 확보: 항구·선박 3D 모델 32개

- 폴더: `naval/`. 원본: Kenney Pirate Kit 2.1, https://kenney.nl/assets/pirate-kit (CC0-1.0, 상업 이용 가능).
- 배·보트·난파선·돛대·대포·화물상자·성문·항구 방벽·잔교·감시탑 등 기존 자산과 Git blob SHA가 중복되지 않는 32개.
- 다운로드 방법: https://github.com/Hidencod/tge-assets 의 `packs/pirate-kit/` GLB 바이너리를 GitHub API로 받아 원본 Blob SHA와 일치하도록 저장.
- **상태:** GLB 바이너리 확보 및 해시 검증 완료. Studio 수입·런타임 로딩·게시 검증과 다름.

## 2026-11-06 추가 확보: 3D 모델 48개

기존 저장소와 모델 SHA가 겹치지 않는 자산만 내려받았다. 원본 바이너리 Git 해시와 크기를 확인했다.

| 폴더 | 수량 | 역할 | 라이선스 및 원본 |
|---|---:|---|---|
| `castle/` | 22 | 성곽·관청·도개교·탑·성벽 | Kenney Castle Kit, CC0-1.0, https://kenney.nl/assets/castle-kit |
| `interior/` | 7 | 서재·주점·길드 실내 가구 | Kenney Furniture Kit, CC0-1.0, https://kenney.nl/assets/furniture-kit |
| `relics/` | 8 | 동전·유물·탐험 장비 | Kenney Mini Dungeon, CC0-1.0, https://kenney.nl/assets/mini-dungeon |
| `terrain/` | 11 | 동굴·폭포·다리·탐험 지형 | Kenney Nature Kit, CC0-1.0, https://kenney.nl/assets/nature-kit |

원본 바이너리: https://github.com/Hidencod/tge-assets/tree/main/packs
이번 추가 확보 합계는 해양 32 + 성곽 22 + 실내 7 + 유물 8 + 지형 11 = **80개**다. 원본 SHA 불일치 0개, 동일 SHA 중복 0개. 게임에 실제 적용하려면 별도 Roblox Studio 모델 수입과 실행 검증이 필요하다.
