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


## 2026-11-06 추가 확보: 기존 저장소 전체 중복 제외 59개

1600~1700년대 항구 교역, 학자·주점 실내, 해양 및 유적 탐험에 필요한 GLB 원본을 추가했다. 모든 모델은 Kenney CC0-1.0(상업 이용·수정 가능)이며, 바이너리 출처는 [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets/tree/main/packs)이다. 저장소 전체 Git blob SHA를 대조했고 이미 존재한 동일 바이너리 5개(`books`, `bookcaseopen`, `desk`, `chair`, `chairdesk`)는 다시 넣지 않았다.

| 범주 | 신규 수량 | 공식 출처 |
|---|---:|---|
| 실내 가구 (`interior/`) | 7 | https://kenney.nl/assets/furniture-kit |
| 교역품·식품 (`cargo/`) | 20 | https://kenney.nl/assets/food-kit |
| 나무·유적·지형 (`terrain/`) | 18 | https://kenney.nl/assets/nature-kit |
| 납골당·촛불·유적 (`terrain/`) | 7 | https://kenney.nl/assets/graveyard-kit |
| 유령선·항구 소품 (`naval/`) | 3 | https://kenney.nl/assets/pirate-kit |
| 유적 구조물 (`terrain/`) | 4 | https://kenney.nl/assets/mini-dungeon |
| **합계** | **59** | **CC0-1.0** |

각 모델은 원본 Git blob SHA와 저장소에 업로드한 바이너리 SHA를 1:1 대조해 일치했다. 총 크기 1,450,976바이트. 기존 80개 신규 확보 모델과 별개다.

| 신규 파일 (assets/ 상대 경로) | 원본 팩 | 원본 및 저장 Git SHA |
|---|---|---|
| `interior/bookcaseopenlow.glb` | `furniture-kit` | `3daa396e11c843a5da87ab6547a279731e6eba58` |
| `interior/bookcaseclosedwide.glb` | `furniture-kit` | `e508f7738fc99a383242c6d0a013351026f6c25e` |
| `interior/coatrackstanding.glb` | `furniture-kit` | `1ea916e1dbe4964c77ecaad7d7893e5231546bc3` |
| `interior/tablecross.glb` | `furniture-kit` | `54b42407d0acd3c793f6e2553d4aec98944d3e6e` |
| `interior/beddouble.glb` | `furniture-kit` | `1b0efacc4dda050a6abc34974cb692010d29b81c` |
| `interior/ruground.glb` | `furniture-kit` | `ed464bca440a58a90319b80195576caaf75e7ab9` |
| `interior/sidetable.glb` | `furniture-kit` | `061724e768063fae18b226fdee0e31ca0a133969` |
| `cargo/cheese.glb` | `food-kit` | `f523d7a6e3885626d4a69c74e81d9363a959c502` |
| `cargo/fish.glb` | `food-kit` | `8997ccb79bc4cfa1b08d22ce5d3567d0921294bd` |
| `cargo/wine-red.glb` | `food-kit` | `6ddd9f2ddfe0d7f1d82d2f2cf4ac8c0d4939fa7c` |
| `cargo/wine-white.glb` | `food-kit` | `149f7a8c316aed123982058a35d70860a49f29eb` |
| `cargo/honey.glb` | `food-kit` | `3970c5ca45b4f5b5bc4f54ad34230a04757ac1b8` |
| `cargo/grapes.glb` | `food-kit` | `9d41038868d54c4708c423fae894f3c07ab0cc5b` |
| `cargo/loaf-round.glb` | `food-kit` | `2c19dc82d807e8ad9411e523ba3eef3f5b024443` |
| `cargo/bread.glb` | `food-kit` | `69dc08551a23995a07adf7eb8c705981c1b68d51` |
| `cargo/meat-raw.glb` | `food-kit` | `c6cb99629071f793bd5110daee3fdb3d74fa9db1` |
| `cargo/mortar-pestle.glb` | `food-kit` | `b68dbfeb3d0a02554c9e7fd310d2f80898b13853` |
| `cargo/mug.glb` | `food-kit` | `b8675756a4703267505cf10a1e5ee8c27cad2394` |
| `cargo/pot-stew.glb` | `food-kit` | `979fed26757f79984effcf7b7e7f70929abde68c` |
| `cargo/mushroom.glb` | `food-kit` | `6103f326994036d80f7b92c41af1ffc46f8fb524` |
| `cargo/apple.glb` | `food-kit` | `ca37b42743688c2f12b5af8032002836ef8b3f68` |
| `cargo/pear.glb` | `food-kit` | `a02024157d51797aa186e5eb3d0933b78a70ec3d` |
| `cargo/onion.glb` | `food-kit` | `54d6574030837c67f4c02243bb27409eb530efa7` |
| `cargo/egg.glb` | `food-kit` | `5b0adebd45851c35febe61ab078f6202887f1559` |
| `cargo/whole-ham.glb` | `food-kit` | `cca4419ff1e5e9861e7dd669bce7cfaa1124a35b` |
| `cargo/glass-wine.glb` | `food-kit` | `c8e9c99469961019631be3a20e2216b0a0fb356a` |
| `cargo/plate.glb` | `food-kit` | `4b0db4357f090fff180fbd3b853df828d1189330` |
| `terrain/tree-pinedefaulta.glb` | `nature-kit` | `f1217a9ee5b1d8f2027d39fe6bd151d20be5ab84` |
| `terrain/tree-oak.glb` | `nature-kit` | `b136723ada4b5574b71f727120ab21fa579bf2fb` |
| `terrain/tree-default-fall.glb` | `nature-kit` | `8a514472fe5a76bb2fe3111b07d8cc8aabc4b747` |
| `terrain/plant-bush.glb` | `nature-kit` | `185be95ecccc59f8edc874587508c44b6a39431b` |
| `terrain/statue-ring.glb` | `nature-kit` | `bd23caa179555b43231d948ba1df469344eaa898` |
| `terrain/statue-obelisk.glb` | `nature-kit` | `656884e6de99216b6fe3a086f5aee30e2fa188ef` |
| `terrain/statue-column.glb` | `nature-kit` | `2d9a5ceef355d101d14b616794250a498724cf4c` |
| `terrain/statue-columndamaged.glb` | `nature-kit` | `429c8307c0c426d5ed556c0ddee894955c8a12fe` |
| `terrain/statue-head.glb` | `nature-kit` | `2a56399bf11c1ab605f52430b6c6d8a2463dfda4` |
| `terrain/cliff-rock.glb` | `nature-kit` | `8f459cb36a34408717b0f94d2decd0c19769cc8d` |
| `terrain/cliff-steps-rock.glb` | `nature-kit` | `0900c6f1ccb1d7caffbc5f168547e53a0cca3422` |
| `terrain/cliff-waterfalltop-rock.glb` | `nature-kit` | `0cac0d2d35f8b146cb63c64cbbb0a4ebc15d9083` |
| `terrain/ground-riverstraight.glb` | `nature-kit` | `07f61bdd1088480952c203c42b8f6244e1b4237c` |
| `terrain/ground-rivercross.glb` | `nature-kit` | `f25cf3b9c1b9e76a1a5e977c94d7f1372121b7c5` |
| `terrain/platform-beach.glb` | `nature-kit` | `022004611a07e047b651e1ce2834961a9a5ba54d` |
| `terrain/hanging-moss.glb` | `nature-kit` | `3bcee23f43a3247699ef6aeb36a13ba6f692de08` |
| `terrain/tent-detailedopen.glb` | `nature-kit` | `2da465c639533893e97a27d975f37cd1066dbf02` |
| `terrain/log-large.glb` | `nature-kit` | `52e362e62522cc0b14d7102b5bdd4216935f5d3b` |
| `terrain/candle.glb` | `graveyard-kit` | `717fcda0b5370b61c20ab4945bdc9189038ebea6` |
| `terrain/candle-multiple.glb` | `graveyard-kit` | `28ccf153b5b09638c7ee3c7830a1516a530c4bfd` |
| `terrain/altar-stone.glb` | `graveyard-kit` | `515adee803cb835346d32e06455795216d7a51bf` |
| `terrain/debris.glb` | `graveyard-kit` | `6b3127e2588cd43da267cf053ee9edb759375f85` |
| `terrain/crypt-large.glb` | `graveyard-kit` | `a81c77835a237ab826be88a684d123b3b43a20cf` |
| `terrain/lantern-candle.glb` | `graveyard-kit` | `c05c1959722b029bdbf626600987ea3411bddcfe` |
| `terrain/pillar-obelisk.glb` | `graveyard-kit` | `3b314e43f82ca6e9ede30d90e1e207a5776f9035` |
| `naval/ship-ghost.glb` | `pirate-kit` | `61a6d57a6ff37c237d1af1b0cf5e72aa1dbabd96` |
| `naval/bottle-large.glb` | `pirate-kit` | `cb8eaf09d69df178cb5010b899ec130ab38c0f66` |
| `naval/flag-high-pennant.glb` | `pirate-kit` | `d98728aa957ebed7744c1feb2a68832cf9900107` |
| `terrain/column.glb` | `mini-dungeon` | `b02503a9148449d579a13b7bd811c859d872b4bd` |
| `terrain/trap.glb` | `mini-dungeon` | `d54094ff7982094d1a8f0664b2f52b23513bcd69` |
| `terrain/wood-structure.glb` | `mini-dungeon` | `a17f12921ad3c9bda33e610de55cba39bd505303` |
| `terrain/wood-support.glb` | `mini-dungeon` | `04ea1715b727af2f29d2ae8e55aeda8d6c24d62c` |

**수입·게시 미확인:** GitHub GLB 확보는 Roblox 체험 내 MeshPart 수입, 게임 장면 표시, 터치·저장·실행 검증이나 게시 성공을 뜻하지 않는다.
