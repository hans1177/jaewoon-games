# Mare Essentia 3D 자산 출처

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


## 2026-11-06 항해·항구 심화 모델 44개 (원본·변환 이력)

1600~1700년대 대항해시대풍 항구 장면에서 선박·상업·항구 하역·도시·성곽·탐험에 직접 쓰일 CC0 모델만 선별했다. 중복 판단은 저장소 기존 경로와 Git 바이너리 SHA로 수행했다. 현대식 선박·자동차는 대상에서 제외했다.

| 출처 팩 | 신규 수 | 원본 라이선스 확인 |
|---|---:|---|
| Watercraft Kit | 7 | https://kenney.nl/assets/watercraft-kit |
| Retro Fantasy Kit | 7 | https://kenney.nl/assets/retro-fantasy-kit |
| Fantasy Town Kit | 12 | https://kenney.nl/assets/fantasy-town-kit |
| Castle Kit | 7 | https://kenney.nl/assets/castle-kit |
| Survival Kit | 6 | https://kenney.nl/assets/survival-kit |
| Modular Cave Kit | 5 | https://kenney.nl/assets/modular-cave-kit |
| 합계 | **44** | Kenney · CC0-1.0 (상업 이용 가능) |

원본 보관소: https://github.com/shorepine/kenney/tree/main/3d . 원본 GLB는 `Textures/` 외부 이미지를 참조하는 경우가 있으므로 원본 PNG를 GLB 내부 바이너리에 병합했다. 검증된 원본 Git SHA는 기록하고 결과 GLB는 기존 자산 폴더에만 배치했다. 외부 텍스처가 없는 모델은 원본을 유지한다.

| 자산 파일 (assets/ 상대 경로) | 원본 팩 | 원본 SHA | 변환 후 SHA |
|---|---|---|---|
| `naval/boat-sail-a.glb` | `watercraft` | `9f3ef55ee1c156adef2092a9afb5ad3789c0def6` | `635f1dd7ec4464c9b1c40fe7e1742cbcc5ed836b` |
| `naval/boat-sail-b.glb` | `watercraft` | `c6adaf1f95c5c6e4dc9a79ddc572be592d03b507` | `a84df4760e4383831307be29e8f4d860179d1a80` |
| `naval/boat-fishing-small.glb` | `watercraft` | `b7eb2124bd13de8fcc7494ae2b686277b7c0eb94` | `d2882048cd45795de5cdcedcf303c5f200f34dde` |
| `naval/buoy.glb` | `watercraft` | `82dabeea8174dafc09fbb48a152588856afb52db` | `07466c626cf938ac62fafa36497022552ea67561` |
| `naval/buoy-flag.glb` | `watercraft` | `060d8b28cd4d5d4546da2dce49207f8e5f96e52a` | `bb3124be4259998dca55e90bc5d9cdb2e4094472` |
| `naval/cargo-pile-a.glb` | `watercraft` | `33c4f4c4e515a3d4e615fb32f9ee69d344f6c1ae` | `9d56c9fe7c76f8cc93a6f3c5c964b206ea834a87` |
| `naval/cargo-pile-b.glb` | `watercraft` | `ff6c63831ef30beaa72d84b3b28bc0f9ee8affe7` | `188bb8f405547d1d52ec8dd77c05d549730f7bdc` |
| `naval/dock-corner.glb` | `retro-fantasy` | `e55271744d02e727e7ff89491718691f62b5d950` | `b2d61de3cb92e31db7a76a712278cf38b25dc916` |
| `naval/dock-side.glb` | `retro-fantasy` | `b2daebf8ac9afdff328236f9df6c315558195c5d` | `1109c1345533f13194670817290cf8f3a43d82f8` |
| `naval/pulley-crate.glb` | `retro-fantasy` | `95bf64a3018df0fcd06bf79926c7cbdb9cc4f907` | `9b213f236367bea0f5a06f48947d30489fbc2907` |
| `naval/pulley.glb` | `retro-fantasy` | `7942814af44f8619ef7657b027fabb57138f64fc` | `202a693c4ecaf3fa32783d4e7c42bc7e23aac270` |
| `naval/detail-crate-ropes.glb` | `retro-fantasy` | `38153f8f5e920a02b9e2c60b7a64a2d91d333df8` | `81aaef04c00fa2ca8b9837662b7808025c57c600` |
| `naval/detail-crate-small.glb` | `retro-fantasy` | `7aee620a69b06a4510ff78ec693f370db04a4e47` | `62674c9fb0bdef63189c0c6bdb96dbf00891679e` |
| `naval/ladder.glb` | `retro-fantasy` | `6dd4968d0d38b836785c2e2591a577245246adfa` | `bf80b3aeab292fc54003838d19dbbc7e27282c24` |
| `town/stall-green.glb` | `fantasy-town` | `f2c404cc822ff2699655759313f40414db644575` | `97120efc6a5939f7cb001d4db567efde45054c2e` |
| `town/stall-red.glb` | `fantasy-town` | `8c42e92b7cde4416a9abad62aaca126b3115be4c` | `4a7bbecec6985267879c8a927564db687341b863` |
| `town/stall-bench.glb` | `fantasy-town` | `c3c40b772b7a48a4ee63d6c4276cc174ead87773` | `b6a9b20c0bdbc4689986df19ac9962a80c201a05` |
| `town/stall-stool.glb` | `fantasy-town` | `86226c9419fa46c8575e538b58e08ba765e500bc` | `37c655236e017d5c23e33d184d4248c8fc7a145a` |
| `town/balcony-wall-fence.glb` | `fantasy-town` | `f11e1e56fcc8204c484d150e64f3ea58de40cb7a` | `e64b88eee8eb69023b77b7f2b7eca3083e84431b` |
| `town/balcony-wall.glb` | `fantasy-town` | `5d137c5f534655328b736818f14b7b10a1e053d1` | `01e6de705762ecd48aa60c3a9bb0717084a5300c` |
| `town/chimney-base.glb` | `fantasy-town` | `0599f2170914788685077ac1133e3506368d5381` | `f8c9b7e18cf0670092fe81dfb32898cdcef22b02` |
| `town/chimney-top.glb` | `fantasy-town` | `7e0046fb2d3d5fe06ebae30c9280224fa7dcb583` | `a885ae025ef2c786a3eaf99f75cf435e1fcf6d8e` |
| `town/fountain-square.glb` | `fantasy-town` | `63ba864c03f153c658206f54995461f2f657c150` | `88a3adbeb7509baa0b81068d25ad305cb03de225` |
| `town/roof-high-window.glb` | `fantasy-town` | `f733120c84b81ebe654b4c5e9e92dcb9c3f9136f` | `a439b026848581d4d89f6d5ab9c8427b95185176` |
| `town/wall-detail-cross.glb` | `fantasy-town` | `d1263d7aa36a0951f960464ef6d5b2cd67bc359f` | `0bcf94412c9be3c2025bfa34f35833473eab05da` |
| `town/overhang.glb` | `fantasy-town` | `f9c4a03c9418236ac4a62b29905a7a954adeb755` | `a7884f49f23ee6d3391ed0be6b1bfa334e2f2306` |
| `castle/flag-banner-short.glb` | `castle` | `866e6a4df4d581d67b7ec36ee3ddae7bbfbd8758` | `0d9bd15c549bc8cc2e2a7fef12688cfea46bc19e` |
| `castle/tower-hexagon-top.glb` | `castle` | `b6be4052a30d087dfaaef8e82becf06aebb165f1` | `5ab8d3d8b08fb2c215e87798d84a7f8901b38710` |
| `castle/tower-hexagon-top-wood.glb` | `castle` | `be5026ae4987581d3f3b52ca2ad49cc301f49546` | `defe94397cf7780906c325bb74b00d77fece5f3f` |
| `castle/tower-square-mid-windows.glb` | `castle` | `1cee8fb75fb0a3868e551ec0ba52132659858ab5` | `e86eb6dcd263afc1b289358ca3c0763f68a42832` |
| `castle/tower-square-mid-door.glb` | `castle` | `cddb5eada681ac388b1108835a192c9b62b676db` | `7010ce0b1fe8b831ad804624212b5ed59a857f01` |
| `castle/wall-corner-half-tower.glb` | `castle` | `2e4f83a21442aa5b437db695c010669d809edeae` | `63e4675f4b7fce9d7c1c683b2b58bbee9d00492d` |
| `castle/wall-narrow-wood-fence.glb` | `castle` | `76b6d9a9d83146b2eea0d870ee136751bd614c0b` | `a397159128383a2e9861ac7bcd66b125b878e964` |
| `cargo/barrel-open.glb` | `survival` | `575b549969286c70b373de71c9a30975a1383b63` | `10535836d704e0b42d3fdd8c42f980595225b733` |
| `cargo/bucket.glb` | `survival` | `25cdd1f278c0c55cef4f319f429b1e8f69eb5343` | `e6feb1a202f2b996bdee01f2a5b4c35b66dc4c54` |
| `cargo/resource-wood.glb` | `survival` | `8ccf9b02fc6395eba4530625118f739b48730462` | `8042250eefa1d21084b579becd4c3f28bbf851d0` |
| `cargo/box-open.glb` | `survival` | `2155d3297139335208ce1a7074bbcc5763be67cf` | `c9d63f7b93fe152b7779a429796035bff33e2a25` |
| `cargo/fish-large.glb` | `survival` | `60949555b71d44e42e85e7357b703738fe047c87` | `f86c2c2756fae7e836d802a6d464dcbfde261528` |
| `cargo/chest.glb` | `survival` | `b2ea6da074bcf316201c3cafd08ce46eee98a9c5` | `96079727e7841971f57250381bc4c684c8d35317` |
| `terrain/gate-rock.glb` | `modular-cave` | `4e784f959a00c9ba25a0eb57e0ce9c80b720c329` | `4b6f7957c243c52e712955aeae6b62909d9c26ac` |
| `terrain/gate-overhang.glb` | `modular-cave` | `8697677a002c325db6b0c917ad732d5050a44ff1` | `5665bae52fea2773d8b48710a04c10ef70978292` |
| `terrain/gate-metal-bars.glb` | `modular-cave` | `f150aa6694bb7cc305dd086439d1e21cb3c96ba7` | `fd4cbfd328e0b5911bd01d61fd48b3e60a16424a` |
| `terrain/template-floor-layer-hole.glb` | `modular-cave` | `5b64f27866f0765eeb4a0e058f00d578afc19378` | `59beaa5c2cd0c431f21fbf29da25cc96750b79c0` |
| `terrain/template-wall-stairs.glb` | `modular-cave` | `ca465753ed99a1ea9fd6a13f3a4342918edc9061` | `f32afaf0fcea8bf81d59480c36db8187a7085b2f` |

검증: 원본 SHA 일치 및 변환 결과 GLB 헤더와 파일 길이 일치, 저장소 내 신규 바이너리 중복 0. 신규 파일 **44개**다. 실제 Roblox 자산 ID 등록은 `tools/mare-essentia-upload-assets.mjs`와 기존 수동 워크플로가 담당하며, 승인된 ID를 생성하기 전에는 `assets-registered.json`에 가짜 ID를 넣지 않는다. 엔진 구동·모바일·게시 검증 전에는 게임 적용 완료로 표시하지 않는다.


## 2026-11-06 교역물품 긴급 보강: 저장소 검증 원본 9종

마리 에센시아 교역 화면용 실물 3D 물품을 신규 확보했다. 기존 `fantasy-survival`의 실제 Kenney CC0 GLB 원본 Git 객체를 재사용한다. 파일 자체를 변경하지 않으므로 SHA와 라이선스 증거를 보존한다. Roblox 자산 발급 ID는 기존 `owner-mare-essentia-assets.yml`과 `tools/mare-essentia-upload-assets.mjs`를 통해 실제 등록된 경우에만 기록한다.

| 신규 교역 자산 | 기존 검증 원본 | SHA256 | 공식 라이선스 |
|---|---|---|---|
| `cargo/cabbage.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-cabbage.glb` | `5d008e7ee6e8c6f5d0dd6ed5d7ef48c0b4d760d0cfc14066e54c00c1ae203ad8` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/carrot.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-carrot.glb` | `76d52ef42f985d6bee2b4f6a763e049b008484e528181e1bbca8dda9bbb00f2c` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/corn.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-corn.glb` | `0306694d119f64f779e6c531010ee34f3d80eca2a0a7f32083ad4a7e70b902cf` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/loaf-baguette.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-loaf-baguette.glb` | `0f0ba68e0f6140a48541c6bf2898dea47488a6ab22201d04e2a4b70430f6069b` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/meat-cooked.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-meat-cooked.glb` | `8e8f680dcb5fbf3f439235fe8b6d489ea8ec5f4d546c3cd9dc5c6f73c27ae305` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/pie.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-pie.glb` | `1e4d8b334dcedf7a572ab6f7d17030b30bb7c5799c5ad4580eb2e82641d967e9` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/pumpkin.glb` | `roblox-games/fantasy-survival/assets/village-extra2/food-pumpkin.glb` | `df2ae59e7bfa8649ce66e75956462a13d55969009654e982188c9655aa734d00` | https://kenney.nl/assets/food-kit · CC0-1.0 |
| `cargo/resource-planks.glb` | `roblox-games/fantasy-survival/assets/village-extra2/survival-resource-planks.glb` | `0605b3c34f5f4d6e02e60a48c575044a28611a06c24ce1fad7a9429c37492124` | https://kenney.nl/assets/survival-kit · CC0-1.0 |
| `cargo/resource-stone.glb` | `roblox-games/fantasy-survival/assets/village-extra2/survival-resource-stone.glb` | `76e2e7412a5ccc726852dd74705c4070dbb8bce6768674a474bdde66e56f28aa` | https://kenney.nl/assets/survival-kit · CC0-1.0 |

상태 구분: 저장소 바이너리 확보 및 원본 라이선스 확인은 로블록스 서버 실물 로딩·게시 성공을 의미하지 않는다. 게임 경제의 상품 수·가격·밸런스·저장 구조는 변경하지 않았다.


## 2026-11-06 2차 긴급 교역물품 8종 (원본 바이너리 직접 다운로드)

Kenney Food Kit 2.0 · CC0-1.0, 공식 원본 및 라이선스: https://kenney.nl/assets/food-kit. 바이너리 미러: https://github.com/Hidencod/tge-assets, 소스 리비전 `ea2f2aa1ca8da0898330c97df8a5489976b051d0`. 원본과 저장소 Git Blob SHA 완전 일치. 무역 관련 모델 확보 단계이며 Roblox 게임 경제의 상품 목록은 변경하지 않는다.

| 신규 파일 | 원본 SHA |
|---|---|
| `cargo/bag.glb` | `6aa5459a0135a51aeb771b814985b68516b67559` |
| `cargo/bag-flat.glb` | `d12f4823498076ba9f58dba8ec8484ed3f428e39` |
| `cargo/banana.glb` | `86df90926907e9645b7bca4e3b4d9c04a7baede1` |
| `cargo/beet.glb` | `6ce4cb7366466f04e6734a48223cb01b668527cb` |
| `cargo/bottle-oil.glb` | `09ca2ea87c231a59a4f659213e1d45da89433c1b` |
| `cargo/coconut.glb` | `eb6e810cc029f80cff28d985076e41106be33736` |
| `cargo/cup-coffee.glb` | `37cff52a462ec1c843ba8abe0ac45e0e7905af50` |
| `cargo/cup-tea.glb` | `6a2009a2092053ecc445f6fac0f4df1a1cf856ee` |

로블록스 모델 업로드와 게임 내 외형·텍스처 검증은 별도로 필요하다.


## 2026-11-06 3차 교역 농산물 8종

Kenney Food Kit CC0 (https://kenney.nl/assets/food-kit) 신규 원본 모델, 바이너리 미러 `Hidencod/tge-assets` 고정 리비전 `ea2f2aa1ca8da0898330c97df8a5489976b051d0`. 소스와 대상 Git Blob SHA가 동일하며 `cargo/`에 파일 추가. 실제 Roblox Asset ID 및 게임 표시 성공은 기존 등록 흐름의 결과 확인 전까지 미검증이다.

| 신규 파일 | SHA |
|---|---|
| `cargo/cauliflower.glb` | `71d5a5285fefa7cee6a70464948ce213bfdbbc73` |
| `cargo/cherries.glb` | `6af993dfe8a5d611d8b36d4853cccc99a8286a36` |
| `cargo/eggplant.glb` | `7072b23301dd8bc660b28d3b425ea1cfeefd3328` |
| `cargo/leek.glb` | `1c7cc7e186a00df723f4e4e1a04d32e7144f127c` |
| `cargo/lemon.glb` | `25d5c40f52fc76482ea1076d85f1fab2c2833a2f` |
| `cargo/orange.glb` | `98c6e4b44e020b4e715fefad54c575e81f02c143` |
| `cargo/pineapple.glb` | `f9ce8b314b4e3d37376db7697653493883d28350` |
| `cargo/strawberry.glb` | `1320622041f4c0854ff160126a70d02429084e72` |


## 2026-11-06 4차 교역 해산물·향신료·식량 8종

Kenney Food Kit · CC0-1.0 공식 허용: https://kenney.nl/assets/food-kit. 원본 저장소: https://github.com/Hidencod/tge-assets, 고정 리비전 `ea2f2aa1ca8da0898330c97df8a5489976b051d0`. 아래의 Git Blob SHA로 원본과 저장소 바이너리 동일성을 확인했다. 소금통·후추 분쇄기는 교역소 연출용 소품이며 대량 화물 그 자체는 아니다.

| 신규 파일 | 원본 SHA |
|---|---|
| `cargo/mussel.glb` | `290e382f21a861c1d6195a234e73baed37f71b47` |
| `cargo/mussel-open.glb` | `09702eb91de443ead61eee17333b0056a700d481` |
| `cargo/pepper-mill.glb` | `31055728a7f25a9aa34a7763daaf25cd35f97ab0` |
| `cargo/shaker-salt.glb` | `5279d993aa46427c8a229f17ea05ffb8a580b566` |
| `cargo/radish.glb` | `26bdc90a0c71f868f77c145e2133ff58742df3a6` |
| `cargo/tomato.glb` | `47068b912f517c7aa67cdcfa4c25362134b56fc4` |
| `cargo/meat-ribs.glb` | `0189c968be79815c38f5f361ccbd59e278ec8acc` |
| `cargo/sausage.glb` | `1ab2174d07093b9657b7681b76a60a6c4e4c7c4f` |

미검증: Roblox 실물 모델 업로드/권한/배치/텍스처/모바일 런타임/배포.


## 2026-11-06 교역 원자재·직물·보석·화물 34종

KayKit Resource Bits 1.0, 제작자 Kay Lousberg. CC0-1.0, 상업 이용·수정 허용. 공식 출처: https://kaylousberg.itch.io/resource-bits 및 https://kaylousberg.com/game-assets/resource-bits . 원본 미러: https://github.com/GeorgeQLe/assets-kaykit-3d-props , 고정 리비전 `4376b8becf4218424edaba18c0e43a5989c189f6`. 미러 동봉 `LICENSES/KayKit-CC0-License.txt` 확인. 원본 GLTF+BIN+텍스처 69개와 라이선스 1개의 Git Blob SHA 검증. GLB는 원본 메시·재질·UV를 바꾸지 않고 외부 버퍼와 텍스처만 내장해 패키징했다.

이름이 없는 보석의 광물 종류 및 직물의 섬유 종류는 확정하지 않는다. 항구별 특산품·가격·저장 구조는 변경하지 않는다. Roblox 등록은 기존 `owner-mare-essentia-assets.yml` 및 `mare-essentia-upload-assets.mjs` 사용. 실제 등록 ID·Universe 사용 권한·게임 내 표시 결과 확인 전까지 미검증.

| 파일 | 원본 GLTF Git SHA | 원본 BIN Git SHA | GLB SHA-256 |
|---|---|---|---|
| `cargo/copper-bar.glb` | `62ba03eb45d9f3bab7d37e3a5466749fbdece4c3` | `dd4213281bcd636f92ecd6cf3d5e2161a0ab1d21` | `6e6e3d7a4287860f43dd5f2fe948e5077ddef291dfb05120d1901c2780816dc2` |
| `cargo/copper-bars.glb` | `3b1b595ab692c26e9d6fd4282bae12cb7fb8fe9b` | `137101244d5bfcc87cfc0750aa4693d80ef80734` | `65468366a31b1549c154fd31597d8198a39d0fb1c151fb91ee951ae0afa9bca4` |
| `cargo/copper-nuggets.glb` | `2060ff1f8ce67a809563869a0f59ae9dd92b8b31` | `cf96594265205429f42b01eb1fd4048ae1427b13` | `5bbdde0572d7ae4a850be0408689c8926290407dc60185bb08444480a7fdd90a` |
| `cargo/gold-bar.glb` | `2f19e6c9a05e85248e0e7a36f1fa956689aa69ff` | `52e56cc45dca6b90569b0f18515dee31a1ba2b6e` | `385e7342e94daaf4b0c13cd7d893970c9095f4d41cc71274479c2bcffccb28d4` |
| `cargo/gold-bars.glb` | `8294e75b86d4473645b54d9230eec4957978f4fd` | `6dfdc31d8145b7a6052e73eb94cc2797495cd6ab` | `0454f8d78dda205b0dd23de4be4dc21647550ea9a09ca6b6cad42fc1d19dc93e` |
| `cargo/gold-nuggets.glb` | `8ed7406393b242664b7d5e084a96be26e014a0a3` | `5e878550ccf32bcabd31196dc8ec7a380f0ff51e` | `83e2a9f255b52ec267bb39f3820ba1be7adacd853b0cb334874bf904259ca5b9` |
| `cargo/iron-bar.glb` | `fb11fcda2eaeff16f6df39957f20605bb30df670` | `f960cffc97ecc006516dca6cd2da72256313743c` | `be7b4ee78a37a470ed6cd08deaaadb8df1e406476d7c5d5104762a290cb19693` |
| `cargo/iron-bars.glb` | `6522f0286d5cb3a5e2a0d3e62021ac124f9c1252` | `e30c8686f6c6bcddf60c5e8e9fa10e1b04720403` | `b6c05e0db465b6379952912f4a506da7cd2b2c2d5d9292c768d6cf74d64405ff` |
| `cargo/iron-nuggets.glb` | `d936e84917b1b9eec9e16e69d712496c0aaef156` | `21f0323678c70b4340b1e4dd360ff00c6cacea82` | `c3a77d0ae92201288cd7979c1127b8958d73671d688062b63a113aaa168842aa` |
| `cargo/silver-bar.glb` | `31d1c7551862f74f948b0bd234da22eb0f27f5f5` | `489f0ba637bd550ee640803c9e7f2c0e0c057508` | `c6ca3f618246a3ded65c93611878e60d3d8a25b77c38576e51a83b95eddcf525` |
| `cargo/silver-bars.glb` | `aa17f92ff8596dd6c0a21587d7934303d3175c05` | `c48208008f973c4221b732b650201cae42b0fe97` | `25dca8a8d1dc1235e2e859b0e45fea23662d4f83ff8780a437d5d97aba02805d` |
| `cargo/silver-nuggets.glb` | `fef1a3645862fa71de05aace640900bd9b89a73d` | `e980b4fa657a47e4c369b55fd495d4e0fca7b670` | `166b0e3ccd49bd81b73051034bb24d3c087818a519ef31593673e6ebdd240e20` |
| `cargo/textiles-a.glb` | `b6328eb10fd79e0af4248822ca1dfba9fe10af3a` | `5742c9f7a16665da9ad31661df1c05cd40c8ea6f` | `ce81c2c7c15b73a3b3380eaeac3a32852321945c8d3d6a8b7425a8989eb19bee` |
| `cargo/textiles-b.glb` | `f027aa68c654329da624df0a9424a13b3bf942a4` | `e22d2223f3c39b402416f265b4c83a2d34eb4e43` | `f2fc9d3425946826ed7d5da0e979f06573c43cd6a65b35318f83ab68367ec4e0` |
| `cargo/textiles-c.glb` | `18db3f7fdbbb3bbe014f4ad70757d10a9adf5677` | `7aeca4fbbc19ff8164b2818bfefec116f6c704db` | `2d7a5aa760ba9f6803bba6da1f5eba1585a07c8f8b5383411386bdca7fbe9345` |
| `cargo/textiles-stack-large.glb` | `505b7c6c27f2e2e3c6ad95399c4a44fc62d7d482` | `2144078092c2ae33916c37fd7ac775de0d9a914f` | `a01b0aee6e25bd22a444b841d2597180b7d4790f0c9b0defd40dd8667b86f136` |
| `cargo/textiles-stack-large-colored.glb` | `0bcfd91eadecdb280543c033c453544a7bfbe4cf` | `fc59ce4a46ff39996f4ca0254195dd0f56745706` | `0ec3ba2ca20072155c3d170f0c4f4848df602d10611fe5508a70d92e1ae58a08` |
| `cargo/textiles-stack-small.glb` | `3b83155ac8ca20146b1188a7e49c7387456fb287` | `62976a4c9f50dad3b6105063fab56ab07a0388e9` | `ec57565a62acf4b1d76902561f39500425f9e9d5acdbd2857a061a3d205fd616` |
| `cargo/wood-log-a.glb` | `bed16dd56de2ccea7ae840ece7eaa30c8a4cde3b` | `3462f8a449c6e73b0bb893c40fc3e83c16182e8c` | `7c814dcee624df429aa81828b219c58c1cb18dce49bf737919aef8342e071dd9` |
| `cargo/wood-log-stack.glb` | `2a781efd80d3c717bc5e5a1aab5f09c8f01e18d1` | `fb078a5a53156a19dcd6f253df69b513f2233b3a` | `457874838bb6ec6c0019a7087330b895b704d1ac572700b57077216f2ac43824` |
| `cargo/wood-plank-a.glb` | `b6308fb681f8082683d848fd853c0f16a13505d2` | `896485350d44bc086e69f18a709e0c5a1c40822f` | `cf6f3f72f0359bb926b6d7c060dae2cfbcf772f0ac0551963d64cf97736cbc52` |
| `cargo/wood-planks-stack-small.glb` | `98b3bf8593c9d26a31b2e9205559299faa2a16a0` | `a4a22af0f593543f676b45ddf5567b8c6f4a215d` | `a5deaf27ca5221bf32e35236f75c2d20734ec03f6ca5c3c800501ef952c64a71` |
| `cargo/stone-brick.glb` | `2ee9ea4be57dbd023018a14ea9cc44837a5a69c6` | `0c5cfef320479d2b608fe2ed2ab67fb3f1228301` | `1795e9b294990e94f54ac6f3b5406a2ac7057cfe7a86cb99bb29822c444639c8` |
| `cargo/stone-bricks-stack-small.glb` | `cc0c13efbbcd127c073a66813943e790d98a481a` | `8723d0f56f059449d33a60cab661bb98876d1f9a` | `881d3a6b4b2c86dd0d66c2882fbb93775104f4650eeec03203c60c8fadbecb97` |
| `cargo/parts-cog.glb` | `b6ced1c10f64431274e31d98a8bee6dbdbe82897` | `55041d3412870e244a15df36bb7e5f0a66a55af7` | `c0a02c3d894ae231e3d6f18b65e157a291ac923445287c9143c77b02e0c0ece9` |
| `cargo/parts-pile-small.glb` | `ff5604d340e4d00c0a3fa868284ccc4d78ccec28` | `57e3ff2136ec04bb87a729e3968542199cbb6b88` | `77bf70bb33da6316b8726e65b2aea63db910f231a918320ba2e72e74784adaa3` |
| `cargo/gem-large.glb` | `2f653f9f4bf6d3e8fa1228a7e698ed92c51f6ae5` | `fedb6b6354311ec998ef90d7e791f6ed5d80b099` | `083942d6365accab2dfddb381097a9f57f502269b29470c9c66631bf859f26ad` |
| `cargo/gem-medium.glb` | `0f88ed6a8fb40afe65de2f4c7580853a5a633432` | `0eb08cc52131fb0d016cdfa96d4e52bb261a71d9` | `47dcca396ae4eb7904068cd8842a1211ad828ffbb16210d789b8d287d06b4f05` |
| `cargo/gem-small.glb` | `f9148255bd694e8fd48f829e689ae323ca2d3cd5` | `6c8e87900598651ca2559630632e5126f5790410` | `2ed43c725331a7d26ffec361d5a5579818e2835e9976cf014bdd87cfb3a61cf6` |
| `cargo/gems-sack.glb` | `9b13bd371dfdae856c1441700fbe97c413f2404a` | `b4e9fba27a1efb8ade7ef345cc25bc19ed5b6bbe` | `c0f370505c8cec22c7bb4d8e05f0e935666b69e7860b42bd35954244334d3e8d` |
| `cargo/food-flour.glb` | `e5769fb746e3974871f1df52497c9fa9810cafea` | `bb2a69c4adb6301318c14c8e12d947272613845f` | `a3a7c3a6a9160cc2e71d205b85dea84184f3fb9067e63c1a46a4cccc9747df9d` |
| `cargo/food-barrel-fish.glb` | `8fc4ac8127a99018f41370dd8f6890290b03fa24` | `016b92abea9d726824fa7758c9aeff94a491a08a` | `3f190e1410c001b2f047afcd227fa92deadd5749566c4be63a80bccf1f4a0d54` |
| `cargo/food-basket-a-berries.glb` | `01c244e9265ec9eb31f4ca6ee0891374e61fd068` | `429abfb5b2cd376aeee0ab0b9ee01382fd5a0627` | `7c52e814b8d2b920da1013684a2ba0d5ca2d20d9968ba7fb43f2b6ab845003c5` |
| `cargo/food-crate-large-apples.glb` | `da44ed07390e36b98c3157542d665724431a6912` | `1f9a659851c18788e75666cd34feb6ce670e1a16` | `43e77fc185893c8a3239d56ec5e352b1aeb347a99cc2dc9c92417d9721eb4836` |

공유 텍스처 Git Blob SHA: `b0e6fab6acb6af12a5eb81c50e9a125b39ca8c80`. 원본 라이선스 Git Blob SHA: `0db19d25d701192a4d5dc58860ce161f75f73968`.


## 2026-11-06 메뉴 아이콘 12종

출처: https://game-icons.net/about.html , 원본 저장소 https://github.com/game-icons/icons , 고정 리비전 `82d948812bfe3f269ef8f731dcdb07b08160edc4`. CC BY 3.0, 저작자 Lorc, Delapouite, Lord Berandas. 상업 이용·수정 가능, 저작자 표시 필수. 상태 메뉴에 저작자·출처·라이선스·변경 내용을 표시한다. 원본 실루엣 보존, 투명 배경·황동 색상·512×512 PNG 변환. Roblox Decal 등록·표시 결과 별도 확인.

| 파일 | 원본 | 원본 Git SHA | PNG SHA-256 |
|---|---|---|---|
| `icons/view.png` | `lorc/leather-boot.svg` | `32438660f191785b7f796a1bd4583a3b45f5f024` | `c72e8da52044913348d047e03eb949e6c87f7620c836ca94ea49bed2005118fa` |
| `icons/trade.png` | `lorc/swap-bag.svg` | `f60dbae65165df3a0d875c504c5aaae11d2c57ab` | `b734f67c49eded9e74218f1e99f7476a5a93a8a907417b7f72e2fc3a5d42cdd3` |
| `icons/harbor.png` | `lorc/anchor.svg` | `9d52b18992dde7d9fabd6c0d94eba258047f3d53` | `9eabd7e1abe11fb37539937d76c2b0cdfd86b06b74316cbed071ced1d712ddc3` |
| `icons/route.png` | `lorc/compass.svg` | `82985d65f6a03f47c2398a5c7f567bf4bfa1eab5` | `74370520a2630d9280974e4bad694c4d14bf46bb4bef91a110d4fe3784a90f49` |
| `icons/map.png` | `lorc/treasure-map.svg` | `29a7bc4c52c4931e889753738e1a3d076956f772` | `b2b1ea42f06390b1a377b79d71483aa749b11717c5dc356607d15b2c5150878a` |
| `icons/yard.png` | `delapouite/sailboat.svg` | `698a70a0b9d818649eda28ea912659af82e856a9` | `5bee15b39fee42d509c94d82e4362f0eea25da334078af53b0a08d7444ab40bc` |
| `icons/explore.png` | `lorc/spyglass.svg` | `13342c695e861724a747e393f8162083be7770de` | `0ebb8a02bc6e257534d822d219cd7a6495be991954c33491cccc41624c5e7ea1` |
| `icons/codex.png` | `lorc/book-cover.svg` | `739e94747990a3596e7a915e712a55091cfa7e06` | `86e3653206fc358f147ddc8c99da9e125d1b69e3a411745fe18dbb1aec98eec2` |
| `icons/tech.png` | `lord-berandas/microscope.svg` | `572a249dba5e13ec049716e9345d6bed1a3db3cc` | `f86e4d9b0a64048435f7cdf92c52ec4bd06a2204bee1267e67dd193a1392b452` |
| `icons/quest.png` | `delapouite/scroll-quill.svg` | `7712bda49c0244aa4304355f48c7ecdbc042f245` | `667e088e15f20f8aea319ca5720480cc572e73dfcd380e112817f12cc6f8ff25` |
| `icons/battle.png` | `lorc/crossed-sabres.svg` | `e5250e622ce85de087d54997ba488a8b5f7b4008` | `482381e2617bb6b4cd706677bc9afd0fec44461723c8ebee979eccde47ad4ee8` |
| `icons/status.png` | `delapouite/pirate-hat.svg` | `236c2b4772507c1376034510027fa6200c1a6e9d` | `269bc97cb9ee247d6927835bb8e5bd8799ca85da978fc24ea720a5bebfe3bfdf` |

## 2026-11-06 추가 확보: 3D 교역품·항구·마을 소품 26개

- 목적: 교역품 디테일, 항구의 화물 장식, 탐험 및 생산지 환경 모델 추가.
- 제작 및 권리: Kenney / Creative Commons CC0-1.0. 상업 이용 및 수정 가능. 원본 공식 페이지: https://kenney.nl/assets/food-kit, https://kenney.nl/assets/furniture-kit, https://kenney.nl/assets/nature-kit, https://kenney.nl/assets/pirate-kit.
- 바이너리 경로: https://github.com/Hidencod/tge-assets/tree/main/packs. 메쉬와 재질은 원본 자체 완성 GLB이며 임의 도형 생성물이 아님.
- 검증: 아래 26개 각각의 GitHub 원본 blob SHA와 대상 저장소 새 blob SHA가 일치하고 GLB 매직 헤더 확인됨. 기존 마리 에센시아 자산 및 저장소 전체의 동일 SHA 파일은 제외함.
- 적용 상태: **GitHub 원본 확보 완료. Roblox asset ID 발급, Universe 사용 권한, Studio/런타임 표시 및 게임 게시 여부는 별도 검증 필요**. `tools/mare-essentia-upload-assets.mjs`의 기존 자산 등록 경로가 스캔함.

| 저장소 경로 (assets/ 기준) | 원본 팩 | 원본 Git blob SHA | 바이트 |
|---|---|---|---:|
| `cargo/barrel.glb` | `food-kit` | `936bb5a946f4ac4693ef3c833a15e134205851a6` | 37544 |
| `cargo/bowl.glb` | `food-kit` | `28377e1ceff70380a07f42d097690e313a0fd3ea` | 17080 |
| `cargo/chocolate.glb` | `food-kit` | `a40f0690707b51407d105d7d06f232f5db03236a` | 23396 |
| `cargo/cheese-cut.glb` | `food-kit` | `bd63dbca1440c238cfdabf231475a2f092fba5d1` | 24192 |
| `cargo/croissant.glb` | `food-kit` | `228048f2bc0f1e1f9b966a945294f1051136f174` | 25100 |
| `cargo/fish-bones.glb` | `food-kit` | `efdbeda1ad4aedc3f48caf173f0cb006c992c1e1` | 44808 |
| `cargo/glass.glb` | `food-kit` | `0a4f2f1844b0d0e95b3145f59b5a35ef2f5f505b` | 14956 |
| `cargo/mortar.glb` | `food-kit` | `a99fe6638ed57b35ca1ae42520942b53f0e6a8b1` | 20948 |
| `cargo/plate-dinner.glb` | `food-kit` | `36c3757f3d04fae7120718854c5d1b62c8cbc2d9` | 38644 |
| `cargo/shaker-pepper.glb` | `food-kit` | `4d287a015ad22e63bb516a6a3673efd0e8f89fe9` | 20044 |
| `cargo/turkey.glb` | `food-kit` | `6341e793faf4bd371189028e94b9e5b9367e9fda` | 47864 |
| `cargo/coconut-half.glb` | `food-kit` | `d55c25f04f3ecec3c80e6d533140c72b26c0fa21` | 19056 |
| `cargo/lemon-half.glb` | `food-kit` | `be6290019a74734605ba4a32c94ab0dfcca889d5` | 21024 |
| `interior/tablecrosscloth.glb` | `furniture-kit` | `e55c74e4176ce0129619ee7dd984c58bf4024d1e` | 13852 |
| `interior/rugrounded.glb` | `furniture-kit` | `4827425a7448104a65b9109f8c2fffa53af8c72c` | 10876 |
| `interior/coatrack.glb` | `furniture-kit` | `3cddd8beed819c9553749ccd75a2475b1ca1f7d4` | 9948 |
| `terrain/crop-carrot.glb` | `nature-kit` | `045d5758f5c7ba263a1fb804b324c4429fe73362` | 12664 |
| `terrain/crop-melon.glb` | `nature-kit` | `225d5cf61c626d0bf6343034fc8b457f0787c5d7` | 13328 |
| `terrain/crop-turnip.glb` | `nature-kit` | `ac03d00ea292037d3e2024cb7229e6fd8c88927e` | 14308 |
| `terrain/crops-cornstagec.glb` | `nature-kit` | `3cc31d597809d0ff3b5a6a24d27fb3c52d44c862` | 11960 |
| `terrain/crops-wheatstagea.glb` | `nature-kit` | `7c710d2363c1b1804b5b77fe92e9320dedd39654` | 56228 |
| `terrain/campfire-logs.glb` | `nature-kit` | `bd23b59c1b662eb8e1f8675758fc507e5d7b109d` | 9284 |
| `naval/flag-pirate-high.glb` | `pirate-kit` | `75c2215a7c0fc1554ede772d9129846bf40456a2` | 25312 |
| `naval/grass-plant.glb` | `pirate-kit` | `a095edfb5bf6ff4df197f44d3ab2f055f45ac223` | 24492 |
| `naval/palm-bend.glb` | `pirate-kit` | `e4bba77d41664206bb32bcb353b38f6672426dd1` | 46624 |
| `naval/tower-roof.glb` | `pirate-kit` | `76be3cb9bd4083512d6168d92ff65d67c89dae44` | 21868 |

해당 모델의 실제 개별 로블록스 등록 및 권한이 확인되기 전에는 제작 완료/게시 완료로 간주하지 않는다.



## 2026-11-06 교역품·특산품 그림 전체 36종 및 실물 화물 연결

기존 상품 ID 36종 전부에 전용 512×512 PNG를 연결한다. 상품을 다른 물건의 3D 모델로 표시하던 연결을 제거하고 분류를 나타내는 품목별 그림으로 교체했다. 새 화물·품목·가격·드랍·보상은 만들지 않는다. 아이콘은 상품을 식별하는 UI용 그림이며 정확한 광물/섬유의 실물 3D 인증을 의미하지 않는다. 보유 실물 모델 중 철·목재·직물·생선·치즈·와인·오일·차·커피는 기존 항구 생산품 목록에 따라 부두에 배치한다.

Game-icons 원본 33종: https://game-icons.net/about.html , 고정 리비전 `82d948812bfe3f269ef8f731dcdb07b08160edc4`, CC BY 3.0. Lorc·Delapouite·Skoll 원본 실루엣 보존, 투명 배경·품목별 재질 그라데이션·PNG 변환. 상태 화면 저작자 표시 포함.

사프란: Tiny Speck Glitch CC0 원화, Bart SVG 변환. https://openclipart.org/detail/210622/spice-saffron , 다운로드 https://openclipart.org/download/210622/spice-saffron.svg . 원본 라이선스 https://github.com/tinyspeck/glitch-items/blob/master/README.md , 교차 확인 https://freesvg.org/spice-saffron . 대추야자·건포도: 사용자의 품목별 고퀄리티 제작 요청에 따라 기존 벡터 아이콘 체계에 맞춰 작성한 게임 전용 2D 원화. 외부 자산/검증된 3D 모델이라고 주장하지 않는다. 원본 SVG도 함께 보존한다.

| 파일 | 원본 경로/제작 | 원본 해시 | PNG SHA-256 |
|---|---|---|---|
| `goods/amber.png` | `delapouite/amber-mosquito.svg` | `a7029c419426de146169cc644fa5cc004ab29756` | `a877e6f1ce23507d0e0d3751772ee1be307d8c6216218e881d8b3ca01d00b6f1` |
| `goods/beer.png` | `lorc/beer-stein.svg` | `7f9c5145d4429cd95f1b0fa49cf3054dc3aca282` | `d8f7f47bb64e26fd664c933efc3f967d877791d47cd6e9bc7241b7ae51a76e20` |
| `goods/carpet.png` | `delapouite/red-carpet.svg` | `1a0002d612ee539a800d61721d78c87a77d36c71` | `9fe676f2d9113a747a5c9c25561a10dff96923ef42fdf28ba0a15ff6af38a568` |
| `goods/cheese.png` | `lorc/cheese-wedge.svg` | `a8e8286f2d10e84d21ad1fa5d3e9b53775343aef` | `aa5b130054b6df35b8988f17bd2c1bdf35839ba3334cd5a790387fe89866cd03` |
| `goods/cloth.png` | `delapouite/rolled-cloth.svg` | `94df554744be50f0526a42abc81cb2918a7ea484` | `50dad120c6ecd311ceb3ef1f3d3078c1430042d510b27a8125cfe17eace7e47b` |
| `goods/coal.png` | `delapouite/coal-pile.svg` | `11e232932f2cb87897261b784b14c2123c600c7b` | `ee6c1a4ad20a9c63e951c053b8ff6dfee4da058f2ac7951d9307c6799aed3828` |
| `goods/coffee.png` | `delapouite/coffee-beans.svg` | `a18f376c4fa9a9799713554d8428024dd286154f` | `3b08c23209e927bd62b634dcc1d12ece417ec5455eff5362b049be06abc69bab` |
| `goods/coral.png` | `delapouite/coral.svg` | `207d1beb5c1f8afe3d721c7244bc71368239d84e` | `afc9fc7bc86db735cc79dc2873298a9af2909e99513d9e22b58b904a43c2cb2b` |
| `goods/cotton.png` | `delapouite/cotton-flower.svg` | `07121b977b19fe082fecea01a61868928966da72` | `f04bca862f6c06b778a7e1a5300f1232db8d710b6df793c4e31d4c2fe60c6624` |
| `goods/dates.png` | `PROJECT_ORIGINAL_VECTOR` | `6c297716c3663d0a49e9ffa6b7df0ce6addd6d026f7623d8161b79503e2ef5f7` | `6286d804124223d8825ddc4fd48c6601708552723c6ca8b71949e92c06429948` |
| `goods/fish.png` | `delapouite/fish-bucket.svg` | `d2fcf238e1f2288ec32909bba3540ddf955ec615` | `a3ff8663a1b46a7e4aff32d7b136258efa71614cfe77d95dc19224b1130db97f` |
| `goods/fur.png` | `delapouite/fur-shirt.svg` | `aec7643b78bfc31edaec40f1bcd49b56fd6aeaa5` | `7fb6ea50c938702adba3bfc0ec40a887fc97459832efc3c724a36bfe517ca7ad` |
| `goods/glass.png` | `lorc/glass-shot.svg` | `78de84b784c103e516d197c5a8044667f21aebd7` | `adc79b19da843a4155f2eb255e4cb6d4d5481548ae52823883f5588ecd5350e7` |
| `goods/incense.png` | `lorc/incense.svg` | `93497f033ffbaa0dbf9446ddf5a13ff93cd969d2` | `bd73aa48af06b4a85430280235a520008a805148220dbae4913088057c7b6e29` |
| `goods/iron.png` | `lorc/metal-bar.svg` | `22b3353ea033ab36de2fd3c58eba41fa76cc374b` | `5ea2682b4b7cd2b8fb7f11f91ab15c01a084c869fca6a95a4897ef93f98d2d57` |
| `goods/ivory.png` | `delapouite/ivory-tusks.svg` | `c9aa008aba4ed2f876ab79c0a2baa145ff458d1b` | `60d53b3072c21a133da48934fab447a0ba9ea4cfc1a7c9ea7daafd4bb3b4906c` |
| `goods/leather.png` | `delapouite/animal-hide.svg` | `f790db5952f75300708d836e4ff6a13f83c390f1` | `07772533a568a5e445484ee9cac6843baf293b02d873b65b3249d665639d6c8c` |
| `goods/linen.png` | `delapouite/flax.svg` | `f3615d7db5b57ee7efb9c3787f7e3735d162649b` | `a369c463a02d46e604044eef661689d23d7a2cf8b15d8285e187513fe12936e5` |
| `goods/marble.png` | `lorc/stone-block.svg` | `08c13b99a24a505376e02c021c4debd80e1d46b1` | `97f84dec855fcea784dbd78f8f2fdeca426ad9bdb4316f587bd4d6b4e9bacd23` |
| `goods/olive_oil.png` | `delapouite/olive.svg` | `bbb4f901b1f5e66e835f72ec91e5460d24e705c7` | `6833560fa3a6868d519e554bdf1297586fd874813aa0ab5f78719cfbc83da1d3` |
| `goods/pearls.png` | `delapouite/oyster-pearl.svg` | `faa3c6dc3e3bb3a6fd0ffdcdc5d6ef47b82c22f9` | `76bf61be7471d4415124a19a2fdd4e0a51a9a879f457b9e020a6dd63eaea9cec` |
| `goods/pepper.png` | `skoll/pestle-mortar.svg` | `2760b1393d4190c2c38628a55edffa925472035e` | `adfc6519c11da73eb6db50134e2c58e3773e00b6969cda2c7a504ddb98afb299` |
| `goods/porcelain.png` | `delapouite/porcelain-vase.svg` | `51e82fce8a175b0fe2b6a091ddd2d266af0593a9` | `78290a23eec120ec8a541e47a2a717315d43c3594ee2f559e44773fc9a651ce6` |
| `goods/raisins.png` | `PROJECT_ORIGINAL_VECTOR` | `0c48a5790b606654cdc7f2f9cd5bb186f63ff9971d0050e0e3f6ca0cc52dd9f5` | `fb480707a0c56ab070c5312d32c0d6256da141af49ea552f5663271d9bd23faf` |
| `goods/saffron.png` | `Tiny Speck / Bart / Openclipart 210622` | `3a735a58e15484d241b0ffec01d31cb3006be3ae1526828f8eaee0f0f53c1d2b` | `dabdaa9a41aaba420a1c7c45ff3c28a3a0045c25475c1eb4edfb85d3e36863be` |
| `goods/salt.png` | `lorc/salt-shaker.svg` | `d569eea35621e0297ad4c3779006ac9cfdf6797d` | `6fe921dd185ebc451aaaca3bc79cb2d3383842f9d47b5bd7579a535743e2d9b8` |
| `goods/silk.png` | `delapouite/cloth-jar.svg` | `cca965ba289402607dbb2faba3e752646731192f` | `227ae7119914aa0fb1e760a073c82acf8ec5806054289ae438ceee567eaf098f` |
| `goods/spice.png` | `lorc/cool-spices.svg` | `1208fd1731e4284d34016346f93fc68be67d5d00` | `fce85ea596d50af77aa9640cb97167de69f10e02a6a1d73c717648d21192ddc5` |
| `goods/sugar.png` | `delapouite/powder-bag.svg` | `c487d31556c4c585fe46a4e2837cdc66333c5dde` | `fee9b472e1b67b6a6b8df8e6e47ba8e8fa0a21470d0b4d78dc6a653ae681d127` |
| `goods/tea.png` | `delapouite/teapot-leaves.svg` | `f1cbd06789f5ea8c606bb6b49497d9ab8c1c04ee` | `65542fb0d6de0c8023664c3f02ffd427d8986cecac622060c4d8d2478e9ac39b` |
| `goods/timber.png` | `delapouite/wood-pile.svg` | `fe7cbe03b6a76f81b8e6a8a5cd6b3005461a84ea` | `a23a87a464e76a3f4940a1d92c0133502434ccf8968884a56ae96a92e9c2eb68` |
| `goods/tin.png` | `delapouite/metal-plate.svg` | `9c7993fb176fe88b4b17c929c0238ea2cb20bc38` | `d899d264a0e1b98f6d4a565bc6e82244c8c93fef0c462ad4d23ae7459327b63d` |
| `goods/whale_oil.png` | `skoll/oil-drum.svg` | `50d181e257fb817f4a7b6b4fd2b124a6de8d02a0` | `63c5f04a327f7b2027dedb107d596be0788f36202ae27fdf87b069b8d1332cf5` |
| `goods/wool.png` | `delapouite/wool.svg` | `2d0d52cb6c7f95652cac363c2f22d99f8c63f33d` | `642d8c61c61ec8a14589076ff0860ccdd4eaceccb64e961d34f7dc9d9a9aa290` |




## 2026-11-06 추가 확보: 금속 적재·원광·보석 화물 12종

KayKit Resource Bits 1.0 / Kay Lousberg / CC0-1.0. 공식 출처 https://kaylousberg.itch.io/resource-bits , 원본 미러 https://github.com/GeorgeQLe/assets-kaykit-3d-props , 고정 리비전 `4376b8becf4218424edaba18c0e43a5989c189f6`. 원본 GLTF·BIN 24개와 공유 텍스처 1개 Git SHA 일치 확인. 원본 메시·재질·UV를 변경하지 않고 버퍼와 텍스처만 GLB에 내장했다. 기존 파일명과 중복하지 않는 12종이며 신규 상품·가격·보상 규칙을 만들지 않는다. 모델 원본 확보와 실제 Roblox 등록/개별 사용 권한/게임 배치는 별도 단계다.

| 파일 | 원본 GLTF Git SHA | 원본 BIN Git SHA | GLB SHA-256 |
|---|---|---|---|
| `cargo/copper-bars-stack-large.glb` | `5593072e47a8b07323849da48c8a373f4ffffb8f` | `1c4f881108b922dd320a40480a79954c28557529` | `967dc1e3f235cf2077ed6f0ed50f67c08ed26245ee66a0b2ca08f1b15c2ad1e2` |
| `cargo/gold-bars-stack-large.glb` | `6039f562582993c8146aaef12e88cda508d3dce1` | `298560bb67df92813ce743078880f67a03335d2b` | `6a17926f88e598f7b0bc5c4a5f317161e44f72fda45713fb5b3e2da52b1bda4e` |
| `cargo/iron-bars-stack-large.glb` | `dccb0c2c9f67f9b136f771d5f48ce00f3bcabbcf` | `74cfa733530face980a0bdd64dd5ab6f1536ff09` | `22be1deeb426c172f1596715e159efa913eb364458fabf01900d47f335dd1112` |
| `cargo/silver-bars-stack-large.glb` | `f1ccf2e6df716948fce2d9552981f3fb9262f843` | `d1c0cf7b19dd304c7c51cbf53be29703b953801e` | `978f0d5592b169f3092f386beb2c20ff0531805281b5800be76b963654d6cf6d` |
| `cargo/copper-nugget-large.glb` | `31ff9b6533a63286c19ef2be61c0195e6992e2cf` | `ea10a0160cdb63a11bd87bc45567dbae8340b115` | `e655a113d8ccd4a517fabbb590924621dbe4e01af8777fa6f0af50bb93d643c7` |
| `cargo/gold-nugget-large.glb` | `6e1810f368b7b46a6c8aa15d0cfe028cdc15fdaf` | `0d4196d37e33e0045aeeee2bdd48b0c69d3a7abf` | `583c0a1fefaeaf1a1002b450e426edf1c9e2e9d95bba2000b7a269482acd99d7` |
| `cargo/iron-nugget-large.glb` | `babbac0923225f23180381755e796bdcb86c144d` | `41e8d81ef1f7586bb62ab4c23ca1ab8262547de3` | `72f2a5fdaa757e638688a2334a3c4fd00eb9415f43d42b66e0d9696aee26a8ca` |
| `cargo/silver-nugget-large.glb` | `99c41f6301962dcebe5bd147c4faeeed15e30b8e` | `7da38c5ce114a033e713d404540adcecb77c7720` | `77e5686bcd6b3f01e7a959a0ffac035f53da961b49ccfa67343f51e4f4d4f6b8` |
| `cargo/gems-chest.glb` | `ba43724f7a03d16f206df22569328925f6aa007a` | `6bc450de0a37ad54751e1c754852f9541aab1eba` | `eccf6cdb798db5cfbd002ac2d4654bfdf6743043292bfe244c1138880d08a55b` |
| `cargo/gems-chest-empty.glb` | `6bb4e1c08ae82a62e15812bd216729fd59081101` | `f3499738d3326283c5ff56275058424172f7ef3f` | `5bea5fba04eb59b86f0b9b3033695457f494fab7aced9bd387a3e9637b68d714` |
| `cargo/gems-pile-large.glb` | `bf6a4e60ef5a2b7c75a72399b57764f821b66133` | `d6b4f5a75b747c96d02cb3c8e5695e0c944de8da` | `81cdf4e5eb014cfc2a29ce1f6aacb1c8644dab3935bd37307dc32c25a8e40fbb` |
| `cargo/gems-pile-small.glb` | `962e19e08fc77bc151ad9ce2bb637544fd51c122` | `59981a82ec4c20de3fb1eef76f4c291167fb763d` | `5c17b5815d452f184e4bea1708ee92d28ac0f3343285e5d4f3b4af09a9f33c56` |


## 2026-11-06 항해·연구·조선 도구 16종 추가 확보

KayKit RPG Tools Bits 1.0 / Kay Lousberg / CC0-1.0. 공식 출처 https://kaylousberg.itch.io/rpg-tools-bits . 원본 미러 https://github.com/GeorgeQLe/assets-kaykit-3d-props , 고정 리비전 `4376b8becf4218424edaba18c0e43a5989c189f6`, 원본 하위 경로 `assets/kaykit/rpg-tools-bits-1.0/Assets/gltf/`. 원본 36개 파일의 Git Blob SHA를 확인하고 메시·재질·UV를 보존하며 버퍼·텍스처만 GLB에 내장했다. 기존 relics 파일명과 중복 없음. 로블록스 계정 제재 응답이 확인된 상태이므로 원본 확보/저장과 실제 등록/사용 권한/배치를 구분한다. 신규 게임 규칙·제작법·보상은 추가하지 않는다.

| 파일 | 원본 GLTF Git SHA | 원본 BIN Git SHA | GLB SHA-256 |
|---|---|---|---|
| `relics/map.glb` | `6ef4311fe7ce7c23a689563bd272eec9ce392bb5` | `3f164177802e95a20f68021d4980ad3b1c6e3a96` | `c4e14e14d1c4bf7227131c0f4e4fdcbb01e687afc7b1d2f5456e09bdced8d0d6` |
| `relics/map-rolled.glb` | `a7da7ab4728b72bf97cc0194bc4e503b9992eb6b` | `3615db6661fcb150b59b610023e3303f9cb7ea4e` | `210f21ccd6a0d7a2fd3f1410c9578980a234150ee4d73fada0ce06a0bcf85b21` |
| `relics/compass-base.glb` | `aae3a305e2b3f0bdf3539f0a4e75f3d4694625f9` | `943885bdb15b05e5b235de82a1e2effcb68c505a` | `6218562607b1cade58538a814a135a88cad54ddf6d19bcfb6613c19d6fe68a86` |
| `relics/drafting-compass.glb` | `f2c83f14f8f3b980d8700df315d74ac3366a1678` | `e35d18d7f989d2204b598f3f71315224f188f4e0` | `8173fe34b8cdc3383ccb6212d2b45bdc5662bc2cfb234055f9a767d531fee808` |
| `relics/journal-open.glb` | `2bc8935f2a0d9f881953da6886fdf36e13c3522c` | `7ce61a8e245dc8abfa68d260eba1834c389cc806` | `a9e77e569b15f9fd6d3cb04d414229ca1e19bff1463253a082855d74249fd17e` |
| `relics/journal-closed.glb` | `204088668f200d1d1fd2d61225f506cc6ac5108c` | `a202d8dfeae53164733cf68d007b07e9b6d09f22` | `effe7f517a9dfd4b211f397c56f390b396598383f9afa57b43acaaaf3b71fc32` |
| `relics/magnifying-glass.glb` | `4bd7b4fd16a81ae61d851c842de8ffd777ad4e82` | `211dd02eb430aed6e3533b01df4bac5508eb49b8` | `419bc8f0516824a0b88e39a76b2f0a3bd074d72821aaad4b1106a29c1b28e3db` |
| `relics/blueprint.glb` | `c2ed249e80986d0f5f6155743e07a3c6d0f88775` | `073a2b2ea3c86a2e61fa96b23bcca349892369f0` | `d77d708c09a6f197124314748c6bea2258dba4571f77953bd61dfce22f13c883` |
| `relics/blueprint-stacked.glb` | `e57368d5c8f7eb408c7b0614d9fc54f8f0c30c5d` | `3befa299f859e25da854070555cbf28387211a96` | `369a4c55bc64040b97ee46a5c5635cb8b63e0d0cf5b7920f4def3d990ccf2885` |
| `relics/rope-bundle-a.glb` | `12c877e44925c001dcb7ff1757e828d8241d1411` | `13f6886a262190f1316fe4e13ef15294265cebd4` | `02c2890f3d6a375c6131a25f8544167c24d44373a991b97c6265df54684537e2` |
| `relics/rope-bundle-b.glb` | `2faa81270dafd75944a7d9e9f8b37994f5122b91` | `036a1a9ba0777e5c8c6237eeb1b4d3695db729d4` | `15fabc2a88d95c02a630caddbb48f46b1ad3d01cdad5ef214b282a4c7e469590` |
| `relics/lantern.glb` | `b5122dfc77f9486acc7c22639c99446c4959ebb0` | `04a3ae5eb418d604bd26fd77506d4da39703fe0b` | `42f22ecd2597d795ed96815d5f84b45211f5940a33113af9cc9a59a7e5b3f34c` |
| `relics/hammer.glb` | `49479694d07d925e2a0dcf44395cce54aa7b348e` | `0f78ead27f6f5284883d5b105c377ed9122ee810` | `eaf072acd7daf1047a5dfda8771bd434524bc20c1c1d9a05ce3abaad7f2be460` |
| `relics/handplane.glb` | `e4c2886a04b3ae65e7ee43772ca8feab8c7d09d3` | `ef59ac447cf16d7067e0b32276e6795eb2a8ebd2` | `04b0d1fe8099f1fec099062f75ca276b058eadd2affb3d8e8d692b0190d88b67` |
| `relics/saw.glb` | `446a6a3c90ac15456f7ad2b181497518ce03a9d6` | `62bad658e864338a137cf7f0f8e79e8c037e237f` | `bb254d14e7850ada07173edb8b655285770307db343ada6a3c4455aa8af7eed0` |
| `relics/chisel.glb` | `e8647d7fea0e6c4f3778a621737ef0cb3d59da9a` | `3b4cd13ae353553e6a562f9fb9678f74a9aa4ea1` | `4bd9ede379cfc8642a6d68c8a03ba68ccf33cd22a507d13c48720c6374f72773` |

### 기존 지형 파일의 확인된 규격 위반 수정

원본 지형 35개에서 `scene.nodes`의 최상위 노드가 사용되지 않는 `tmpParent.children`에도 등록된 구조를 확인했다. glTF 2.0은 최상위 노드가 어느 노드의 자식으로도 연결되지 않도록 요구한다: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html . 기존 업로드 정규화 책임 코드에서 장면 밖 부모의 해당 연결만 분리하고 빈 확장 배열을 제거한다. 실제 정규화 코드로 35개를 대조하여 원본 버퍼(정점·UV 포함), 노드 좌표, 삼각형 인덱스 값의 보존과 루트 구조 수정 확인. 이 결과는 Roblox 가져오기/실행 성공을 뜻하지 않는다. 계정 제재 응답 시 남은 업로드·권한 쓰기를 즉시 중단해 반복 실패 요청을 막는다.

## 2026-11-08 NPC 대화 실사 초상화

- `assets/portraits/merchant.jpg`: 교역소 상인용 게임 전용 신규 생성 초상화(원본 이미지에서 대화 UI에 맞춰 잘라 JPEG로 최적화).
- 권리: 프로젝트 전용 직접 생성 이미지 `PROJECT_ORIGINAL_ART`; 외부 저작물이나 타인의 사진을 사용하지 않음.
- 시각 확인: 피·고어·규제 상품 연출 없음. 게임 자산 등록 전에 해당 이미지 재확인.
- 적용: `Portraits/merchant` 실등록 ID가 `AssetIds.luau`에 생성되면 교역소·상인 이야기 대화·시설 아이콘에 사용. ID 미등록 시 기존 3D 인물 초상을 유지.

## 2026-11-08 시설 및 주인공 초상화 시트

- `assets/portraits/characters.jpg`: 게임 전용으로 제작한 여섯 인물 초상 원화를 이미지 레이아웃만 재배치한 시트(3열×2행; 각 칸 256×336).
- 좌상부터: 교역소 상인(성인 여성), 항만 관리관(장년 남성), 조선 장인(청년 여성), 주점 주인(중년 남성), 서재 학자(청년 남성), 항해가(청년 남성).
- 출처: 게임 제작 대화에서 생성된 초상화. 외부 사진·상업용 자산 재사용 없음. 권리: PROJECT_ORIGINAL_ART.
- 기등록 상인 사진 `merchant.jpg`은 신규 시트 등록 이전의 폴백으로 유지한다.
- 문화권·성별이 맞지 않는 국가 주인공은 전용 시트가 준비될 때까지 기존 국가별 3D 초상을 유지한다.

## 2026-11-08 국가별 주인공 9명 초상화

- `assets/portraits/heroes.jpg`: 3열×3행, 각 칸 256×336의 고유 인물 초상. 선택 화면·항해 프롤로그·에필로그·선장실에 같은 얼굴을 연결한다.
- 1행: 엘리너 렌(기존 조선 장인 초상 원화), 얀 데 흐로트(기존 서재 학자 원화), 마리온 델라크루아(기존 상인 원화).
- 2행: 레일라 하미디(역사 오스만 여성 회화), 아민 살림(잔지바르 스와힐리 남성 역사 사진), 라마 나이르(케랄라 나이르 남성 역사 사진).
- 3행: 사쿠라이 하루카(일본 여성 역사 사진), 디에고 모랄레스(기존 항해가 원화), 이네스 카브랄(기존 상인 초상 원화).
- 원화 출처: 기존 `characters.jpg`, `merchant.jpg` (`PROJECT_ORIGINAL_ART`).
- 역사 자료 출처 및 권리 (`PUBLIC_DOMAIN`, Wikimedia Commons 파일 설명과 저작권 종료 확인):
  - 레일라 대역 이미지: Théodore Ralli, `Young Ottoman Woman` (1879, 작가 1909년 사망), https://commons.wikimedia.org/wiki/File:Young_Ottoman_Woman.jpg
  - 아민 대역 이미지: `A Swahili of Zanzibar` (1920), https://commons.wikimedia.org/wiki/File:A_Swahili_of_Zanzibar.png
  - 라마 대역 이미지: Teodoro Viero, `A man of Malabar` (1785, 작가 1819년 사망, 역사 인물 삽화), https://commons.wikimedia.org/wiki/File:A_man_of_Malabar.jpg
  - 하루카 대역 이미지: Felice Beato, `Felice Beato Courtisane` (1860년대, 작가 1909년 사망), https://commons.wikimedia.org/wiki/File:Felice_Beato_Courtisane.jpg
- 역사 이미지의 실제 인물이 주인공을 연기하거나 해당 국적·시대의 정확한 인물이라는 뜻은 아니다. NPC용 허구 배역 이미지이며, 독립적으로 식별되는 실제 초상임을 밝힌다.
- 외부 자산은 기존 오너 자산 등록 워크플로의 입력을 생성할 때 원본 출처에서 읽고 `heroes.jpg`로 합성하며, 새로운 업로드/게시 파이프라인을 만들지 않는다.


## 2026-11-08 신규 게임 전용 인물 초상화

- `assets/portraits/heroes_new.jpg`: 3열×3행, 총 9개 원화 프레임. 최종 크기 768×1008, 프레임당 256×336. SHA-256: `7d89664973cdc5b7da730d7737d8f4f71b247dbef9c6b8f8029a5ea7932bf4c8`.
- `assets/portraits/npcs_new.jpg`: 3열×2행, 총 6개 원화 프레임. 최종 크기 768×672, 프레임당 256×336. SHA-256: `d366349a8e26592cedce32d76aa0c375f96f61309694ef83fa5e394b278e1e95`.
- 원본: 프로젝트 제작 대화에서 직접 생성한 게임 전용 항해시대 인물 원화. 상업 화보·타인 사진을 전사하지 않은 `PROJECT_ORIGINAL_ART`. 인물의 나이·직업·생활 흔적을 강조하며 1600~1700년대 증기 대체역사와의 일관성을 우선한다.
- 안전 확인: 인물 얼굴·복식 중심 초상 시트이며 피·고어·규제 상품 묘사 없음. 기존 등록 도구의 콘텐츠 차단 정책은 그대로 적용한다.
- 적용: `Portraits/npcs_new` 자산 등록 후 시설·NPC 대화창의 기존 6역할 이미지를 대체한다. `Portraits/heroes_new`는 외형·역할이 맞는 일부 국가 주인공에 한정하며, 맞지 않는 국가는 기존 `heroes` 자산을 유지한다. 신규 ID/게임별 사용 권한/실제 게시 여부는 각기 확인 전까지 미검증이다.

## 2026-11-11 교역품 CC0 원본: 쌀·인디고

원본 제작: OpenFarm 기여자, Open Crop Icons. 전체 이미지 원본은 CC0-1.0으로 공개되며 상업 이용·수정·게임 업로드 가능. 사용 전 시각 검수에서 일반 식물 그림(쌀 이삭·인디고 식물) 외 피·술·담배·실존 인물 없음 확인. 원본 64px PNG. 두 이미지는 각 상품의 재배 식물을 나타내며 곡물 낱알 또는 염료 가공품의 실사 이미지는 아니다.

| 원본 저장 위치 | 원본 파일 | 제작자·라이선스 | 원본 URL | PNG SHA-256 |
|---|---|---|---|---|
| `assets/goods/rice.png` | `rice-64px.png` | OpenFarm 기여자 · CC0-1.0 | https://github.com/openfarmcc/open-crop-icons/blob/5c17291ded7409b4a6a25d2d060667b0a1e3e32f/icons/rice/rice-64px.png | `30f7d91cbe2be2c7fefffdd9c6b35e9a447a704c0054800a1a2ea27b786f642f` |
| `assets/goods/indigo.png` | `indigo-64px.png` | OpenFarm 기여자 · CC0-1.0 | https://github.com/openfarmcc/open-crop-icons/blob/5c17291ded7409b4a6a25d2d060667b0a1e3e32f/icons/indigo/indigo-64px.png | `fba95d8b105a648168ebcd570b7471ebb1367feebcf98513e121582e5d9180c4` |

전용 이미지는 기존 `Goods/<상품 ID>` 조회 경로를 사용한다. Roblox 업로드 자산 ID와 체험 사용 권한 검증 전에는 게임 내 표시를 PASS로 판정하지 않는다.

## 2026-11-11 CC0 항구 배경 7종

제작자: Kenney. 오리지널 배경 GLB 7종. 공식 Kenney 페이지에서 CC0 확인. 원본 그대로 보존, 캐릭터·피·술·담배·로고 없음(원본 썸네일 시각 확인). 상업 이용·수정 허용.

| 저장 경로 | 쓰임 | 원본·라이선스 | 원본 Git SHA |
|---|---|---|---|
| `assets/naval/rocks-sand-a.glb` | 열대 모래 암석 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/pirate-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/pirate-kit/rocks-sand-a.glb) | `adcc106a71647d1df305966bf69322a594b95a32` |
| `assets/naval/rocks-sand-b.glb` | 열대 모래 암석 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/pirate-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/pirate-kit/rocks-sand-b.glb) | `cbd3a76fa4c7f098aacfded108967f8cc388587c` |
| `assets/naval/rocks-sand-c.glb` | 열대 모래 암석 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/pirate-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/pirate-kit/rocks-sand-c.glb) | `6b5c22ebf6409d305d33210f72f5256f2534a92f` |
| `assets/naval/rocks-a.glb` | 북부 암초 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/pirate-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/pirate-kit/rocks-a.glb) | `91923f9062623a257426cfaf0da98bf1592facc2` |
| `assets/naval/rocks-b.glb` | 북부 암초 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/pirate-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/pirate-kit/rocks-b.glb) | `08868717d77aa6edffaa245b209e269640cbad4b` |
| `assets/naval/patch-sand-foliage.glb` | 열대 해안 수풀 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/pirate-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/pirate-kit/patch-sand-foliage.glb) | `8e59ffa6dee87552b616fe1d45c7719c7f850759` |
| `assets/castle/ground-hills.glb` | 북부 배경 언덕 | Kenney CC0-1.0 [공식](https://kenney.nl/assets/castle-kit) · [원본 GLB](https://github.com/Hidencod/tge-assets/blob/main/packs/castle-kit/ground-hills.glb) | `9f068afc5065911194d866a1e0a5251c75a4e951` |

기존 `PortScene`/`AssetIds`/Open Cloud 업로더만 이용. ID가 등록되기 전엔 새 배경 표시를 보류한다. 실제 로블록스 Studio 수입, 런타임, 모바일, 배포는 별도 확인이 필요하다.

## 2026-11-11 건축 랜드마크 CC0 원본 6종

실제 제작자의 원본 CC0 모델만 확보했다. 파일은 기존 `town/`·`castle/` 폴더에 저장해 기존 Roblox 자산 등록 체계를 그대로 사용한다. AI 생성물이나 도형을 조립한 새 모델은 추가하지 않았다. 3D 모델 원본은 저작자 표시 의무 없이 상업 이용·수정이 가능한 CC0-1.0이다.

| 파일 (assets/ 기준) | 제작자 · 건축물 | 공식 CC0 모델 | 검증된 원본 Git blob SHA |
|---|---|---|---|
| `town/church.glb` | CreativeTrio · 유럽풍 교회 | https://poly.pizza/m/GHzPfvoyzX | `f976bc45c59fc42d9362e76f35b30efadc031cd1` |
| `town/bell-tower.glb` | Quaternius · 종탑 | https://poly.pizza/m/ux44tbeQvj | `cb21c1134c157428b6e6289db3d1af6e623cdaf9` |
| `town/windmill.glb` | Quaternius · 풍차 | https://poly.pizza/m/52yaPyaAAG | `58f1d27c27e4405dab0dd9c486b8eeb622cf502a` |
| `town/temple-stone.glb` | Quaternius · 탑형 신전 A | https://poly.pizza/m/CE2Mn7lh6A | `215b0a373be72c4980f39b9253bd5ebfabb30a0a` |
| `town/temple-tower.glb` | Quaternius · 탑형 신전 B | https://poly.pizza/m/v36uJiErXS | `0185f370fc7de6b83b6496aff595e0d09acd5a22` |
| `castle/fortress.glb` | Quaternius · 성채 | https://poly.pizza/m/3r6gq3ow6O | `490d2f06408a82972e03db92ff6203562e63600a` |

바이너리 보관 원본: https://github.com/ivy00johns/petri-dish-of-madness/tree/main/web/public/models/poly (교회·종탑·풍차), https://github.com/cgsdev0/buccaneers-beak/tree/main/Fantasy%20Pack (신전·성채). 두 번째 원본 폴더의 Temple 모델 파일명에는 Poly Pizza의 모델 식별자가 들어 있으므로 해당 공식 CC0 페이지와 직접 일치한다. 저장소에 생성된 Git blob SHA가 원본과 6/6 일치함을 확인했다.

**표현 범위:** 신전 A/B는 실제 불교 탑·힌두 사원이라고 주장하지 않으며, 교회는 대성당을 대신하는 CC0 저폴리 모델이다. 특정 모스크·대성당·불교 탑·힌두 사원 원본은 저작·제작 방식/원본 전송을 검증할 때까지 미확보로 둔다. GitHub 보관은 Roblox 모델 등록·스튜디오 런타임·모바일 표시·체험 게시 성공을 의미하지 않는다.

## 대항해시대 시대복 초상화 99명

- 게임 전용 생성 판화풍 초상화. 외부 사진이나 스캔을 사용하지 않은 창작 원화 `PROJECT_ORIGINAL_ART`. 실존 학자 초상은 회화적 재구성이다.
- 각 칸은 256×336. 위에서 아래로 행을 읽고 각 행은 왼쪽에서 오른쪽으로 읽는다. 주인공·동료·시설은 3열×3행이고 나머지는 4열×3행이다. 등록 해시는 `APPROVED_IMAGES.json`에 기록한다.
- 기존 주인공·동료·시설은 해당 이미지가 등록되면 새 그림을 사용한다. 궁정·군인·지역 교역상·항구 직업·학자 시트는 추가 배역 원화다.
- `portraits/heroes_period.jpg` · 엘리너 렌, 얀 데 흐로트, 마리온 델라크루아 / 레일라 하미디, 아민 살림, 라마 나이르 / 사쿠라이 하루카, 디에고 모랄레스, 이네스 카브랄
- `portraits/crew_facilities.jpg` · 항해사 마르코, 포수 아나, 회계사 얀 / 의사 엘레나, 교역소 상인, 항만청 서기 / 조선 장인, 주점 주인, 서재 학자
- `portraits/crew_nations.jpg` · 조수 윌, 장부원 피터, 시종 로랑 / 도선사 페드루, 대상 상인 카심, 선원 주마 / 후추 농부 쿠티, 사무라이 겐지, 광부 출신 마테오
- `portraits/scholars_a.jpg` · 데카르트, 하위헌스, 보일, 뉴턴 / 레이우엔훅, 파팽, 세이버리, 뉴커먼 / 메리안, 핼리, 라이프니츠, 슬론
- `portraits/court.jpg` · 왕, 왕비, 궁정 집사, 궁정 관리인 / 스웨덴 왕실 서기관, 오스만 궁정 관리, 에도 성 관리, 포르투갈 왕실 전령 / 누에바에스파냐 총독, 프랑스 궁정 회계사, 왕립 사서, 궁정 조리사
- `portraits/soldiers.jpg` · 네덜란드 항만 경비병, 스코틀랜드 보병 노병, 오스만 수비대 하사, 해안 감시대 장교 / 에도 보병, 베네치아 성채 경비병, 포르투갈 해병, 스와힐리 항구 경비병 / 몰타 기사, 프랑스 군사 공병, 스페인 망루 감시병, 발트 성문지기
- `portraits/workers.jpg` · 오슬로 대장장이, 바르셀로나 조선공, 리스본 돛 제작자, 베르겐 생선 장수 / 라로셸 염전 일꾼, 카탈루냐 밧줄 제작자, 콘월 부두 짐꾼, 코르시카 양치기 / 튀니스 발굴 일꾼, 팔레르모 수도사, 트리에스테 세관 서기, 코르푸 사제
- `portraits/market_varied.jpg` · 리스본 감귤 상인, 베네치아 책 상인, 네덜란드 직물상, 오스만 향신료 상인 / 이집트 면화 중개상, 알제 항구 길잡이, 라구사 상인, 리가 목재상 / 말라바르 후추 농부, 서아프리카 소금 상인, 일본 직물상, 누에바에스파냐 약제사
- `portraits/port_varied.jpg` · 포르투갈 항만 책임자, 아일랜드 부두 짐꾼, 발트 여관 주인, 노르웨이 어부 / 안달루시아 조선공, 스웨덴 대장장이, 런던 세관 서기, 베네치아 지도 판각공 / 코르시카 등대지기, 그리스 돛 수선공, 튀니스 선박 통역사, 프랑스 왕실 집사

## 탐험 도감용 갈색 잉크 스케치 24종

- `cardart/heritage_sketch.jpg`: 기자 피라미드, 만리장성, 마추픽추, 스톤헨지 / 페트라, 앙코르와트, 치첸이트사, 라파누이 모아이 / 자이언츠 코즈웨이, 성산일출봉, 카파도키아, 그랜드캐니언.
- `cardart/relic_sketch.jpg`: 로제타석, 그리스 흑회식 암포라, 청동 솥 정, 로마 모자이크 / 그리스 신화 스핑크스 청동상, 엑스칼리버, 걀라르호른, 야마타노오로치 / 암모나이트, 삼엽충, 시조새, 어룡 화석.
- 각 시트 1024×768. 칸당 256×256, 4열×3행. 각 목록의 슬래시는 행 구분, 각 행은 왼쪽부터 읽는다.
- 게임용 직접 생성 스케치 `PROJECT_ORIGINAL_ART`. 기관 사진을 복제하지 않았으며, 유물 표면의 글자나 화석 자세는 도감 삽화용 재구성이다. 신화 속 소재는 전승 삽화로 쓴다.
- 소재 참고: [유네스코 세계유산 목록](https://whc.unesco.org/en/list/), [메트로폴리탄 미술관 그리스 청동 스핑크스](https://www.metmuseum.org/art/collection/search/329999), [스미스소니언 암모나이트](https://www.si.edu/object/ammonite%3Anmnheducation_14537758).

## 실존 학자 200명 초상화

- 1600~1800년 활동기와 겹치는 학자를 모은 갈색 잉크 판화풍 초상화. 출생·사망 연도가 범위 밖인 인물도 해당 기간에 활동했다면 포함했다.
- 인물과 생몰 연도 참고: [세인트앤드루스대 수학사 인명 목록](https://mathshistory.st-andrews.ac.uk/Biographies/chronological/), [트리니티 칼리지 더블린 17~18세기 수학자 전기](https://www.maths.tcd.ie/pub/HistMath/People/RBallHist.html), [루벤대 계몽주의 철학 자료](https://hiw.kuleuven.be/nl/nieuws-agenda/nieuwsbrief/bijlagen/filosofische-wandeling-in-leuven/%40%40download/file/Philosophy%2520in%2520Leuven-DEF.pdf), 게임의 기존 학자 전기.
- 그림은 게임용 직접 생성 원화 `PROJECT_ORIGINAL_ART`. 기록이 알려진 인물은 알려진 외형을 참고하도록 제작했고, 나머지 얼굴과 복식은 당시 모습의 회화적 재구성이다. 그림마다 실제 생전 초상과의 일치 여부는 확인되지 않았다.
- 각 시트 960×1008, 5열×4행. 각 칸 192×252. 왼쪽에서 오른쪽으로 읽고, 슬래시는 다음 행을 뜻한다. 기존 학자의 등장 조건과 도감·대화 데이터는 별도다.

- `portraits/academics_01.jpg` · John Locke (1632–1704), Baruch Spinoza (1632–1677), David Hume (1711–1776), Immanuel Kant (1724–1804), Mary Wollstonecraft (1759–1797) / Anna Maria van Schurman (1607–1678), Giambattista Vico (1668–1744), Jean-Jacques Rousseau (1712–1778), Denis Diderot (1713–1784), Johann Gottfried Herder (1744–1803) / Maria Sibylla Merian (1647–1717), Carl Linnaeus (1707–1778), Hans Sloane (1660–1753), Francesco Redi (1626–1697), Marcello Malpighi (1628–1694) / Wang Zhenyi (1768–1797), Anders Celsius (1701–1744), Émilie du Châtelet (1706–1749), Caroline Herschel (1750–1848), Maria Gaetana Agnesi (1718–1799)
- `portraits/academics_02.jpg` · René Descartes (1596–1650), Pierre de Fermat (1601–1665), Blaise Pascal (1623–1662), Christiaan Huygens (1629–1695), Robert Boyle (1627–1691) / Isaac Newton (1643–1727), Edmond Halley (1656–1742), Robert Hooke (1635–1703), Leonhard Euler (1707–1783), Daniel Bernoulli (1700–1782) / Joseph-Louis Lagrange (1736–1813), Pierre-Simon Laplace (1749–1827), Gabriel Cramer (1704–1752), Benjamin Franklin (1706–1790), Thomas Bayes (1702–1761) / Georges Buffon (1707–1788), Mei Wending (1633–1721), Takebe Katahiro (1664–1739), Laura Bassi (1711–1778), Nicole-Reine Lepaute (1723–1788)
- `portraits/academics_03.jpg` · Gottfried Wilhelm Leibniz (1646–1716), Antonie van Leeuwenhoek (1632–1723), Denis Papin (1647–1713), Seki Takakazu (1642–1708), Joseph Priestley (1733–1804) / Antoine Lavoisier (1743–1794), Maria Margarethe Kirch (1670–1720), Ole Rømer (1644–1710), Johann Faulhaber (1580–1635), Pierre Hérigone (1580–1643) / Claude Gaspar Bachet (1581–1638), Jean-Baptiste Morin (1583–1656), Orazio Grassi (1583–1654), Pierre Vernier (1584–1638), Peter Turner (1586–1652) / Joachim Jungius (1587–1657), Étienne Pascal (1588–1651), Thomas Hobbes (1588–1679), Jean Beaugrand (1590–1640), Pierre Gassendi (1592–1655)
- `portraits/academics_04.jpg` · Pierre Petit (1594–1677), Albert Girard (1595–1632), Henry Gellibrand (1597–1637), Bonaventura Cavalieri (1598–1647), Giovanni Battista Riccioli (1598–1671) / Adriaan Vlacq (1600–1667), Richard Delamain (1600–1644), Gilles Roberval (1602–1675), Jacques de Billy (1602–1679), Frénicle de Bessy (1604–1674) / Juan Caramuel (1606–1682), Maria Cunitz (1607–1664), Giovanni Alfonso Borelli (1608–1679), Jacques Le Tenneur (1610–1660), Jan Stampioen (1610–1653) / John Pell (1611–1685), Antoine Arnauld (1612–1694), Henry More (1614–1687), Frans van Schooten (1615–1660), John Wallis (1616–1703)
- `portraits/academics_05.jpg` · Claude Mylon (1618–1660), Francesco Grimaldi (1618–1663), Michelangelo Ricci (1619–1682), Nicolaus Mercator (1620–1687), William Brouncker (1620–1684) / Adrien Auzout (1622–1691), René de Sluze (1622–1685), Vincenzo Viviani (1622–1703), Stephano degli Angeli (1623–1697), John Collins (1624–1683) / Erasmus Bartholin (1625–1698), Jan de Witt (1625–1672), Pietro Mengoli (1626–1686), Jonas Moore (1627–1679), Isaac Barrow (1630–1677) / Edward Cocker (1631–1676), Henry Coley (1633–1704), Hendrik van Heuraet (1634–1660), William Neile (1637–1670), Nicolas Malebranche (1638–1715)
- `portraits/academics_06.jpg` · Bernard Lamy (1640–1715), Jacques Ozanam (1640–1718), William Sanders (1640–1705), Choi Seok-jeong (1646–1715), Siguenza y Gongora (1645–1700) / Kamalakara (1616–1700), John Flamsteed (1646–1719), Giovanni Ceva (1647–1734), Tommaso Ceva (1648–1737), Jean Le Fèvre (1652–1706) / Michel Rolle (1652–1719), Pierre Varignon (1654–1722), Charles René Reyneau (1656–1728), William Molyneux (1656–1698), David Gregory (1659–1708) / Thomas Fantet de Lagny (1660–1734), Guillaume de l'Hôpital (1661–1704), Louis Carré (1663–1711), Giovanni Saccheri (1667–1733), Johann Bernoulli (1667–1748)
- `portraits/academics_07.jpg` · William Whiston (1667–1752), Leonty Filippovich Magnitsky (1669–1739), Giovanni Domenico Cassini (1625–1712), John Keill (1671–1721), Samuel Clarke (1675–1729) / Jacopo Riccati (1676–1754), Jacques Cassini (1677–1756), Joseph Privat de Molières (1677–1742), Jakob Hermann (1678–1733), Pierre Rémond de Montmort (1678–1719) / John Machin (1680–1751), Mei Juecheng (1681–1763), Giulio Fagnano (1682–1766), Nicholas Saunderson (1682–1739), Giovanni Poleni (1683–1761) / Brook Taylor (1685–1731), Nicolaus (I) Bernoulli (1687–1759), Louis Castel (1688–1757), Roger Paman (1688–1748), Samuel Molyneux (1689–1728)
- `portraits/academics_08.jpg` · James Stirling (1692–1770), Johann Penther (1693–1749), Nicolaus (II) Bernoulli (1695–1726), Colin Maclaurin (1698–1746), Pierre-Louis Moreau de Maupertuis (1698–1759) / Charles-Étienne Camus (1699–1768), Nathaniel Bliss (1700–1764), Charles-Marie de La Condamine (1701–1774), William Emerson (1701–1782), Augustin Hallerstein (1703–1774) / Alexis Fontaine (1704–1771), Johann Castillon (1704–1791), Benjamin Robins (1706–1751), Giordano Riccati (1709–1790), Thomas Fuller (1710–1790) / Thomas Simpson (1710–1761), Ruggero Giuseppe Boscovich (1711–1787), Alexis Clairaut (1713–1765), Jorge Juan (1713–1773), Alexander Wilson (1714–1786)
- `portraits/academics_09.jpg` · Giovanni Fagnano (1715–1797), Jean d'Alembert (1717–1783), István Hatvani (1718–1786), Abraham Kästner (1719–1800), John Landen (1719–1790) / Richard Price (1723–1791), Franz Aepinus (1724–1802), Étienne Montucla (1725–1799), James Hutton (1726–1797), Paolo Frisi (1728–1784) / Charles Bossut (1730–1814), Étienne Bézout (1730–1783), Francis Maseres (1731–1824), David Rittenhouse (1732–1796), Jérôme Lalande (1732–1807) / Naonobu Ajima (1732–1798), Wenceslaus Johann Gustav Karsten (1732–1787), Jean-Charles de Borda (1733–1799), Monteiro da Rocha (1734–1819), Antonio Mario Lorgna (1735–1796)
- `portraits/academics_10.jpg` · Jesse Ramsden (1735–1800), Edward Waring (1736–1798), Johannes Tetens (1736–1807), Charles Hutton (1737–1823), William Herschel (1738–1822) / Anders Lexell (1740–1784), Carl Friedrich Hindenburg (1741–1808), John Wilson (1741–1793), Anastácio da Cunha (1744–1787), Pierre Méchain (1744–1804) / Adrien Quentin Buée (1745–1825), George Atwood (1745–1807), Giuseppe Piazzi (1746–1826), William Trail (1746–1831), Charles Tinseau (1748–1822) / John Playfair (1748–1819), Jean-Baptiste-Joseph Delambre (1749–1822), Samuel Vince (1749–1821), Lorenzo Mascheroni (1750–1800), William Morgan (1750–1833)

## 발견 이벤트 건축물 원화 4장

- `cardart/event_giza.jpg` · [기자 피라미드](https://whc.unesco.org/en/list/86/).
- `cardart/event_great_wall.jpg` · [만리장성](https://whc.unesco.org/en/list/438/).
- `cardart/event_machu_picchu.jpg` · [마추픽추](https://whc.unesco.org/en/list/274/).
- `cardart/event_stonehenge.jpg` · [스톤헨지](https://whc.unesco.org/en/list/373/).
- 모두 1672×941, 가로형 발견 이벤트용 단독 구도. 잉크 선과 옅은 수채 채색을 담은 게임 전용 생성 원화 `PROJECT_ORIGINAL_ART`. 배경 지형과 조명은 회화적 재구성이다.

## 2026-11-11 세계 유적·신비 지형 CC0 원본 30종

원본 제작사 Polygonal Mind(2018~2023)가 CC0로 공개한 3D 모델을 기존 폴더에 확보했다. ToxSam의 원본 FBX→GLB 변환 공개본을 **바이너리 무수정 그대로** 사용한다. 제작자 직접 공개·라이선스: https://github.com/ToxSam/cc0-models-Polygonal-Mind 및 https://github.com/PolygonalMind/initiative-opensource-release (CC0-1.0, 상업적 이용·수정·재배포 가능). AI가 생성하거나 스크립트로 새 기하구조를 조립한 자산은 추가하지 않았다.

| 저장 파일 (assets/ 기준) | 용도 | 제작자 원본 GLB | 원본·저장 Git SHA |
|---|---|---|---|
| `terrain/egypt-obelisk.glb` | 이집트 오벨리스크 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/Obelisk_Art.glb) | `cc6084f93d8d09688521447329e5b28fbf9a4f80` |
| `terrain/egypt-temple-arch-a.glb` | 이집트 신전 아치 A | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/TempleArch01_Art.glb) | `2693560b56e4192bc0e80ca74efc0614b020f13d` |
| `terrain/egypt-temple-arch-b.glb` | 이집트 신전 아치 B | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/TempleArch02_Art.glb) | `55b6de2e059cf4ef791a2c851c6a6374b319b680` |
| `terrain/egypt-column.glb` | 이집트 기둥 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/Column_Art.glb) | `cd61c6be01a2bad9fb3c169ab0a51e1c76cbc856` |
| `terrain/egypt-temple-floor.glb` | 이집트 신전 바닥 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/TempleFloor01_Art.glb) | `4ee2f71d182b6bb79050a60e9c258071cd47868d` |
| `terrain/egypt-temple-door.glb` | 이집트 신전 문 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/Door_Art.glb) | `9fd54dd4498e0d196ff73c11820747225b841cda` |
| `terrain/egypt-temple-wall.glb` | 이집트 신전 벽 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/Wall01_Art.glb) | `571a356427de505949e2e3c4da3f2be78dfd293d` |
| `terrain/egypt-temple-detail.glb` | 이집트 신전 장식 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/tomb-chaser-1/TempleEmbelisher01_Art.glb) | `dd1eebdc5c35661c689903b930d131eae89a3d78` |
| `terrain/mystic-broken-wall.glb` | 고대 파손 벽 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Wall_Broken_01.glb) | `454e754188bddd83d64365d2d4a860f00d1b0ab2` |
| `terrain/mystic-broken-column.glb` | 고대 부서진 기둥 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Column_SmallBroken_01.glb) | `3692003ac9c185526ba067b23a321cb40d75418a` |
| `terrain/mystic-stairs.glb` | 고산 유적 계단 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Platform_Stairs_01.glb) | `5ed1c8cf2faaaac4101248beac857c713559001a` |
| `terrain/mystic-sand-dune.glb` | 모래언덕 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Dune_Sand.glb) | `62e84fb9b8b8d6bac9770f5f9ad5e430ac49716c` |
| `terrain/mystic-crystal-circle.glb` | 신비한 수정 군락 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Crystal_ClusterSurrounded.glb) | `c6165728d5e26044a8cd653db90f984f3c32d848` |
| `terrain/mystic-stone-arch.glb` | 유적 아치 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Arc.glb) | `b732fa4c83511645eb5edcb734b9646a42c111a7` |
| `terrain/mystic-column.glb` | 석조 기둥 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Column_Regular.glb) | `b5778a46dcbad1fa3c1e3ed74eb2479c6a29c0a4` |
| `terrain/mystic-wall-corner.glb` | 파손 벽 모서리 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Wall_CornerBroken.glb) | `b8825a01c5e80715b21ff2de19d9b6aea5ac0551` |
| `terrain/mystic-crystals.glb` | 수정 덩어리 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/crystal-crossroads/Crystal_Cluster.glb) | `ed55b8d726985edbf0a57238105fa268d25e30b4` |
| `terrain/greek-amphitheater.glb` | 그리스풍 원형극장 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Str_Amphitheater_01_Art.glb) | `9d9bf1a175cd69939922408f757a4aec0499db2e` |
| `terrain/greek-ruins-a.glb` | 고전 유적 A | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Str_Ruins_01_Art.glb) | `7718918ca9ce539b4acddb1718eac11de1c4a66f` |
| `terrain/greek-column.glb` | 고전 기둥 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Str_Column_04_Art.glb) | `1b22f04452d98559466388a52df0b1d0b3ba4a46` |
| `terrain/greek-statue.glb` | 고전 조각상 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Statue_greek_01_Art.glb) | `44c132ba56ec0b151f2fdae4e35f49396acedc92` |
| `terrain/greek-ruins-b.glb` | 고전 유적 B | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Str_Ruins_02_Art.glb) | `2dabe3ed029849238960f877ba289cb65a9be1ff` |
| `terrain/greek-ruins-c.glb` | 고전 유적 C | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Str_Ruins_03_Art.glb) | `685369fba0e29d07798d65ca56a51f4d247a9c66` |
| `terrain/land-waterfall.glb` | 폭포 지형 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Water_Fall_01_Art.glb) | `a8fface77486c0a6d0b3013bad3b658f59ee447d` |
| `terrain/land-floating-island.glb` | 부유섬 지형 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/MomusPark/Floating_Island_4_Art.glb) | `8cefa508e7732dc69bd6a5ce466424f9cfab49ec` |
| `town/eastasia-roof.glb` | 동아시아 기와지붕 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/lunar-year/RoomRoof.glb) | `a5e7cdd973e12e6fedef75ed5aee73baa73fa50f` |
| `town/eastasia-stairs.glb` | 동아시아 계단 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/lunar-year/EntranceStairs.glb) | `c15c732cb00ae6e9aca173c672f55c3fb4d0b699` |
| `town/eastasia-base.glb` | 동아시아 건축 기단 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/lunar-year/BuildingBase.glb) | `1c6da7d4fa6a793e0f1cbbeb137a418b756be285` |
| `town/eastasia-column-base.glb` | 동아시아 기둥 기단 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/lunar-year/ColumnBase.glb) | `b637e6d43ef4a7908acb1ebb2255a43fc2ad5c69` |
| `town/eastasia-bell.glb` | 동아시아 종 | [원본](https://github.com/ToxSam/cc0-models-Polygonal-Mind/blob/main/projects/lunar-year/Bell.glb) | `0e5e8ad15934b08e3c520494c2d8d5b63f4690d7` |

**보증 범위:** 30/30개는 GLB 파일 헤더와 Git blob SHA를 소스와 대조했고 일치했다. 이집트 고분/신전풍, 고전 지중해 유적풍, 동아시아 전통 건축풍, 환상 유적 지형을 위한 **독립 모델 부품**이다. 실제 피라미드·마추픽추·스톤헨지·앙코르와트 등 실존 유적을 측량·복원한 모델은 아니므로 실제 문화재 이름으로 등록·표시하지 않는다. 마추픽추풍은 고산 계단·석조 벽 같은 환경구성에만 참고하고, 스톤헨지는 저작자 원본을 직접 확보하기 전까지 미확보다. 고유 퀘스트·보상·진행도·저장값은 변경하지 않는다.

**로블록스 적용 상태:** GitHub 원본 보관과 Roblox 클라우드 모델 등록·게임 런타임 장면 표시·모바일 실행 검증·실제 체험 게시는 분리되며, 자동 등록 성공과 런타임 QA가 확인되기 전에는 게임 내 표현을 완료로 보지 않는다.

## 세계 발견물 스케치와 대형 이벤트 원화

- `cardart/world-catalog.json`에 발견물의 지역, 도감 식별자, 그림 위치를 기록한다. 스케치가 연결된 항목만 제작된 그림이다.
- `world_01.jpg`부터 이어지는 시트는 각각 1000×800, 5열×4행이다. 칸은 200×200이며 왼쪽 위부터 읽는다.
- `event_*.jpg`는 같은 소재를 큰 화면에 표시하기 위한 가로형 독립 원화다. 현재 그림 자산이며 이벤트 애니메이션 연결 상태는 목록에 기록한다.
- 생성 원화 `PROJECT_ORIGINAL_ART`. 고증 참고는 항목별 출처를 확인한다. 살아 있는 사람, 인물 초상, 군중은 발견물 그림에서 제외했다. 모아이는 석상 유적이다. 신화 소재는 전승 삽화다.

## 교역품과 사건 삽화 원본

- 아래 원본은 프로젝트를 위해 생성한 삽화다. 역사 사건 그림은 분위기를 재현한 창작 장면이다.
- 교역품: brazilwood, cocoa, copper, ebony, gems, gold, jade, kauri, logwood, mahogany, maize, palm_oil, pearl_shell, sandalwood, sandalwood_hi, silver.
- 사건 삽화: anglo_dutch_war, bumper_harvest, cape_colony, drought, earthquake, great_fire, plague_wave, storm, volcano.
- 로블록스 게시용 이미지 승인 및 사용 권한 검증은 별도로 기록한다.

### 후속 사건 삽화 원본

- 프로젝트 창작 원화 27장. 역사 사건은 상황을 재현한 창작 장면이다.
- 세계 이벤트: hurricane, monsoon_fail, tsunami, harbor_fire, hard_winter, famine, locusts, shipworm, piracy, trade_boom, calm_seas, new_route, treasure_wreck, fish_shoal, new_plant, canal_opened, royal_charter, festival.
- 역사 사건: principia, zanzibar, lisbon_quake, industrial_start, cook_voyage, boston_tea, harrison_h4, franklin_kite, canton_system.
- 로블록스 게시용 이미지 승인 및 사용 권한 검증은 별도로 기록한다.

## 대항해시대 교류 유물과 항구 상인 원화

- `cardart/world_45.jpg`는 유물·직물·항해 기록 12종의 프로젝트 창작 스케치다. 박물관·백과사전 자료는 형태와 시대를 확인하는 참고 문헌으로 썼다. 항목별 시대와 참고 주소는 `world-catalog.json`에 있다.
- 아래 1600×900 원화의 상인과 선원은 가상 인물이다. 사람 검수와 로블록스 등록 및 이벤트 재생 연결은 대기 상태다.

| 원화 | 장면 | 시대와 배경 참고 |
|---|---|---|
| `event_merchant_coromandel.jpg` | 코로만델 면직물 상인이 무늬와 납품 수량을 확인하는 장면 | [메트로폴리탄 미술관의 코로만델 수출 면직물](https://www.metmuseum.org/art/collection/search/231243) |
| `event_merchant_lamu.jpg` | 스와힐리 항구 라무에서 천을 거래하는 장면 | [유네스코 라무 구시가지](https://whc.unesco.org/en/list/1055/) |
| `event_merchant_naha.jpg` | 류큐 나하에서 옻칠 문서함과 화물을 확인하는 장면 | [스미스소니언의 17세기 나하 문서함](https://collections.si.edu/search/record/ark:/65665/ye3397c57054fa94f81bd3dba926c6f18ef) |

## 세계 유적·항구 도감 원화

- `cardart/world_46.jpg`는 유네스코 세계유산 기록을 참고해 대항해시대에 맞춰 그린 유적·항구 창작 삽화 20종이다. 시대와 참고 주소는 도감 목록에 기록했다.
- `cardart/event_merchant_hoi_an.jpg`는 호이안 투본강의 가상 상인과 화물 거래를 그린 1600×900 창작 원화다. [유네스코 호이안 옛 도시](https://whc.unesco.org/en/list/948/)를 배경 참고 자료로 썼다. 사람 검수·로블록스 등록과 장면 재생 연결은 대기 상태다.
| `portraits/` | person_charles2.png | Jan van der Vaart · PUBLIC-DOMAIN | https://www.nga.gov/artworks/37922-charles-ii |
| `portraits/` | person_cromwell.png | William Faithorne · PUBLIC-DOMAIN | https://www.nga.gov/artworks/40959-oliver-cromwell |
| `portraits/` | person_drake.png | Nicolas de Larmessin IV · PUBLIC-DOMAIN | https://www.nga.gov/artworks/38006-sir-francis-drake |
| `portraits/` | person_elizabeth1.png | Willem de Passe and John Payne · PUBLIC-DOMAIN | https://www.nga.gov/artworks/40594-queen-elizabeth |
| `portraits/` | person_hume.png | Simon Charles Miger after Charles-Nicolas Cochin II · PUBLIC-DOMAIN | https://www.nga.gov/artworks/71513-m-david-hume |
| `portraits/` | person_milton.png | William Faithorne · PUBLIC-DOMAIN | https://www.nga.gov/artworks/58207-john-milton |
| `portraits/` | person_napoleon.png | Jacques-Louis David · PUBLIC-DOMAIN | https://www.nga.gov/artworks/46114-emperor-napoleon-his-study-tuileries |
| `portraits/` | person_peter1.png | Augustin de Saint-Aubin · PUBLIC-DOMAIN | https://www.nga.gov/artworks/70232-peter-great |
| `portraits/` | person_shakespeare.png | Martin Droeshout · PUBLIC-DOMAIN | https://www.nga.gov/artworks/38733-william-shakespeare |
| `portraits/` | person_washington.png | Gilbert Stuart · PUBLIC-DOMAIN | https://www.nga.gov/artworks/127695-george-washington |
| `portraits/` | scholar_franklin.png | Joseph Siffred Duplessis · PUBLIC-DOMAIN | https://www.metmuseum.org/art/collection/search/436236 |
| `portraits/` | scholar_galileo.png | Galgano Cipriani, after Justus Susterman and Raphael Morghen · CC0-1.0 | https://www.si.edu/object/portrait-galileo-galilei-1562-1642:chndm_1931-94-91 |
| `portraits/` | scholar_harvey.png | Unknown engraver · PUBLIC-DOMAIN | https://wellcomecollection.org/works/h72dm4n9 |
| `portraits/` | scholar_johnson.png | James Watson (after Joshua Reynolds) · PUBLIC-DOMAIN | https://www.nga.gov/artworks/10857-samuel-johnson |
| `portraits/` | scholar_rembrandt.png | Rembrandt van Rijn · PUBLIC-DOMAIN | https://www.nga.gov/artworks/9844-self-portrait |
| `portraits/` | scholar_wren.png | S. Coignard · PUBLIC-DOMAIN | https://www.nga.gov/artworks/41157-sir-christopher-wren-architect |

## 시대·항구별 창작 초상화

- `portraits/heroes_1517.jpg` · 기존 가상 주인공 9명의 1517년 복식 원화. 기존과 같은 3열×3행, 칸당 256×336.
- `portraits/npc_north_sea.jpg`, `portraits/npc_east_africa.jpg` · 1700년대 북해·동아프리카 항구의 가상 인물 40명. 5열×4행, 칸당 200×200. 위 두 줄은 교역소, 아래 두 줄은 주점·여관 인물이다.
- 프로젝트 창작 원화. 연도·항구·시설에 맞는 등록 자산이 있을 때 표시한다. 사람 검수와 로블록스 이미지 등록은 대기 상태다.
- `portraits/npc_east_asia.jpg` · 1700년대 동아시아 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/npc_south_asia.jpg` · 1700년대 남아시아 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/npc_southeast_asia.jpg` · 1700년대 동남아시아 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/heroes_color.jpg` · 1700년 이후용 기존 가상 주인공 9명의 채색 원화. 3열×3행, 칸당 256×336.
- `portraits/npc_atlantic_europe.jpg` · 1700년대 유럽 대서양 연안 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/npc_mediterranean.jpg` · 1700년대 지중해 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/npc_red_sea.jpg` · 1700년대 홍해 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/npc_west_africa.jpg` · 1700년대 서아프리카 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
- `portraits/npc_americas.jpg` · 1700년대 아메리카 가상 교역소·주점 인물 20명. 5열×4행, 칸당 200×200.
| `town/` | kenney_banner_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_castle_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_arch_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_border_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_broken_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_corner_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_door_round_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_door_square_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_pole_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_short_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_slanted_pole_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_slanted_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_small_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_triangle_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_window_narrow_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_window_round_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_window_round_long_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_window_round_sill_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_window_square_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_grey_win_sq_sill_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_iron_door_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_lightpost_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_plate_corner_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_plate_curve_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_plate_pavement_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_plate_road_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_plate_sidewalk_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_plate_wood_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_corner_green_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_corner_red_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_in_corner_grn_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_inner_corner_red_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_point_green_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_point_red_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_slant_green_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_slant_red_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_straight_green_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_roof_straight_red_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_shield_green_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_shield_red_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_stairs_stone_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_stairs_wood_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_tree_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_arch_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_border_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_broken_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_corner_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_door_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_door_round_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_door_square_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_pole_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_railing_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_slanted_pole_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_slanted_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_small_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_tiny_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_triangle_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_wall_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_wall_cross_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_wall_double_cross_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_window_narrow_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_window_round_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_window_round_long_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_window_round_sill_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_window_square_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | kenney_wood_win_sq_sill_01.glb | Kenney · CC0-1.0 | https://opengameart.org/content/medieval-town-base-3d-assets |
| `town/` | quaternius_banner.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_bridge.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_door.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_large_simple_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_large_square_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_lg_sq_tower_brick.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_large_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_pointy_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_simple_tower_bricks.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_simpletower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_small_square_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_sm_sq_tower_brick.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_small_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_tall_wall.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_tall_wall_bricks.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_tall_wall_entrance.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_tower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_tunnel.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_wall.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_wall_bricks.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_wall_entrance.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_wall_entrance_bricks.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_watch_tower_wroof.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_watchtower.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_well.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_window_gothic.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |
| `town/` | quaternius_window_square.glb | Quaternius · CC0-1.0 | https://opengameart.org/content/lowpoly-medieval-buildings |


## 2026-11-12 동물·항구 생활 모델 (CC0 원본, 런타임 미검증)

품목별 일치가 확인된 원본만 사용하며, 게임 규칙·경제·저장·기존 자산 ID를 변경하지 않았다. 모델 원본 확보는 Roblox Asset ID 발급·Universe 권한·게임 화면 품질 검증이 아니며, 등록은 기존 업로드 워크플로와 런타임 검사를 따른다. 술 관련 소품은 포함하지 않는다.

농장 동물 6종의 출처는 Quaternius Farm Animal Pack (CC0): https://quaternius.com/packs/farmanimal.html . 바이너리 수급 고정 커밋: https://github.com/MichaelJBaumli/VR-Ag-Demo/tree/8c8ed64b7f6c8d8a4b0768d44490a120cbe5e6f6/VR-Ag-Demo-Godot/assets/Farm%20Animals%20Animated%20by%20Quaternius/FBX . 바이너리 Git SHA는 원본과 동일함을 확인했다. 닭은 기존 Quaternius 공용 원본, 건물·소품은 기존 fantasy-survival Kenney 공용 원본을 복제 없이 재사용한다.

| 파일 | 대상 | 제작자·라이선스 | 라이선스 출처 | SHA-256 |
|---|---|---|---|---|
| `animals/cow.fbx` | 소 | Quaternius · CC0-1.0 | https://quaternius.com/packs/farmanimal.html | `0202789cad8c1debb8ae5b4a47d1a5d2e5f93a0875878bc0b05a80e42ae37e8d` |
| `animals/horse.fbx` | 말 | Quaternius · CC0-1.0 | https://quaternius.com/packs/farmanimal.html | `6db270ddc7591e9a013f96eab445031381fa6d5d68d2feba567f964e0fe68d90` |
| `animals/sheep.fbx` | 양 | Quaternius · CC0-1.0 | https://quaternius.com/packs/farmanimal.html | `4a3fc559cc9f37e3e3f216af1dab30cb411ec9b268eb98676f1d5c18a430d33e` |
| `animals/pig.fbx` | 돼지 | Quaternius · CC0-1.0 | https://quaternius.com/packs/farmanimal.html | `bdf5e149a974ffc2431546f30ea568d7c41f916d7bd87187f1532c45778a9a23` |
| `animals/llama.fbx` | 라마 | Quaternius · CC0-1.0 | https://quaternius.com/packs/farmanimal.html | `3ff44fd03d5793701b228cf88f00e776f89afefdb3de0b226fee807908ae79c9` |
| `animals/dog-pug.fbx` | 개(퍼그) | Quaternius · CC0-1.0 | https://quaternius.com/packs/farmanimal.html | `c05e127a5b10edd059478113f542f691717635b47d7a57317d07e7310a764ff0` |
| `animals/chicken.fbx` | 닭 | Quaternius · CC0-1.0 | https://opengameart.org/content/textured-cute-monster-pack | `e5d51fa328f466fc74290c3fa51d769c9b254d771a4b066dd7947bae899a7794` |
| `town/watermill.glb` | 물레방아 | Kenney · CC0-1.0 | https://kenney.nl/assets/fantasy-town-kit | `38dac94afcf84ea072603f558d96a843d45eea2f64321ad8f31c6a5cbff1b498` |
| `town/wheel.glb` | 수레바퀴 | Kenney · CC0-1.0 | https://kenney.nl/assets/fantasy-town-kit | `9dcffeb5b591f949b8488775592c224a8ba7988d94b0ba205fe5486730c28b30` |
| `town/workbench-anvil.glb` | 모루 작업대 | Kenney · CC0-1.0 | https://kenney.nl/assets/survival-kit | `b92fb534e0f6db92565529a8cc15753fb0ddbf35c3f5bcc718aaabb7d31e4a07` |

추가 확보 필요: 염소·당나귀·고양이·비둘기·낙타·코끼리·살아 있는 칠면조, 어망·어망 건조틀·닻·빨래줄·연·공. `cargo/turkey.glb`는 조리된 요리이므로 살아 있는 칠면조를 대신하지 않는다. 바다 갈매기·기존 밧줄·수레·풍차는 중복 등록하지 않는다.


### 2026-11-12 항구 하역·대장간 확장 2종

사용자 요청에 맞춘 항구 하역 수레와 연마 작업대를 기존 Kenney CC0 원본에서 직접 재사용한다. 실제 게임 화면·Roblox 권한을 검증하기 전에는 제작 품질 완료로 표시하지 않는다.

| 원본 파일 | 용도 | 제작자·라이선스 | 공식 원본 | SHA-256 |
|---|---|---|---|---|
| `town/cart-high.glb` | 항구 하역·마차용 높이 있는 수레 | Kenney Fantasy Town Kit 2.0 · CC0-1.0 | https://kenney.nl/assets/fantasy-town-kit | `c9d656399c42e6fb47f406ae31eb637ad0c1bfea45300209f4e2f2c405e94eb6` |
| `town/workbench-grind.glb` | 대장간 공구 연마 작업대 | Kenney Survival Kit · CC0-1.0 | https://kenney.nl/assets/survival-kit | `6da609c418bba7ee8f8402d8f6783fa1d45c3c6391202c31cd4d25a710d37a20` |


### 2026-11-12 시대·지역별 추가 실물 3종 (원본 보존·게임 배치 보류)

*출처 보증*: Kenney Cube Pets 2.0 동봉 `License.txt`는 CC0(개인·상업 이용 가능)를 명시하며, Quaternius 닻의 공개 모델 페이지에도 CC0가 명시된다. 아래 원본은 각각 고정 Git Blob SHA와 신규 Blob SHA 일치를 검증했고 GLB 2.0 메시를 확인했다. 목록은 소유권·원본 검수용이며 **로블록스 업로드·Universe 사용 권한·실제 Studio 화풍/성능 성공을 뜻하지 않는다.**

| 원본 | 대상 | 제작자/무료 권한 | 원본 링크 | 원본 Git Blob | SHA-256 |
|---|---|---|---|---|---|
| `animals/cat.glb` | 고양이 | Kenney Cube Pets 2.0 · CC0-1.0 | https://kenney.nl/assets/cube-pets / [바이너리 출처](https://github.com/mPhpMaster/wavebreak-godot-game/blob/HEAD/assets/kenney/cube-pets/animal-cat.glb) | `91f9b1bccbe0aa4c4c563b298def62b4f8054dcc` | `1e73aaf7d497dd7d2946badf92d189d2333f163e66dced91feb446bc9bdee850` |
| `animals/elephant.glb` | 코끼리 | Kenney Cube Pets 2.0 · CC0-1.0 | https://kenney.nl/assets/cube-pets / [바이너리 출처](https://github.com/mPhpMaster/wavebreak-godot-game/blob/HEAD/assets/kenney/cube-pets/animal-elephant.glb) | `19e27278610ed24d0fa89cd3f2dbbaab4683c3d2` | `0831346fb8ddb8e99e42e3f92fb48858551049dc7ea49e641d90fdfc65e057be` |
| `naval/anchor.glb` | 닻 | Quaternius · CC0-1.0 | https://poly.pizza/m/ejWQny9Gcz / [바이너리 출처](https://github.com/amarnotcool/ABYSS/blob/468cd31632ebf7f7a466713a1dc483d02a965ca2/public/assets/models/anchor.glb) | `7744e423c1f71f16af058a7ecc99ed4cc30239ba` | `f629c05a217c380daf5b04d00e21ac398829eb746f908db4ecefd760c3892dc7` |

**시대 배치 제한:** 고양이는 항구 창고·거리, 코끼리는 인도양/말라바르 지역 장식, 닻은 돛단배 항구에 한정한다. 저다각형 동물의 비례·눈·재질이 기존 게임 화풍에 맞는지는 반드시 실제 화면으로 확인하고, 화면 검증 전 자동 배치하거나 고급 완성품으로 승격하지 않는다. 종교·지역에 따른 돼지 배치도 무차별 자동 적용하지 않는다. 20세기식 기계·현대 어구·주류 소품은 제외한다.


### 2026-11-12 당나귀 원본 정적 메시 등록 (애니메이션 미검증)

Quaternius **Ultimate Animated Animal Pack** 정품 **Donkey.obj / Donkey.mtl**을 고정 원본 리비전 `a3aaca61260eee91a1ffb05904b90b03094d829d`에서 확보했다. CC0 1.0 Universal 원본 License.txt 확인.
원본: https://quaternius.com/packs/ultimateanimatedanimals.html
배포 이력: https://github.com/xxfrigorizxx/The-Legacy-Of-Seroka/tree/a3aaca61260eee91a1ffb05904b90b03094d829d/_tmp_quaternius_animals/OBJ

- `animals/donkey-source.obj`: **원본 Git Blob SHA-1** `31869de9664710b0b035b4441cab17cacf6e3925`, 1,002개 위치, 1,020개 법선, 1,022개 면
- `animals/donkey-source.mtl`: **원본 Git Blob SHA-1** `8637f52251852454564167b8e71839108fa1b5b7`, 원본 8종 재질의 색상
- `animals/donkey.glb`: **형식 변환 결과 Git Blob SHA-1** `408de349a14a3d270441fc61033f09646cdca866`, 148,700바이트 GLB 2.0, 원본 정점/법선과 8재질을 그대로 재구성하고 기존 면을 2,000개 삼각형으로만 나눴다.

기존 오픈 클라우드 업로더는 `.glb`만 모델 등록하고 `.obj/.mtl` 원본은 건드리지 않는다. **애니메이션 0개**인 정적 원본이므로 움직이는 당나귀로 자동 사용하거나 이동 동작을 성공 처리하지 않는다. Roblox Model ID·Universe 권한·실제 마레 에센티아 화면 검증 후에만 게임에서 배치한다.
