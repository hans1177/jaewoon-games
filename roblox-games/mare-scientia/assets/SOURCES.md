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

검증: 원본 SHA 일치 및 변환 결과 GLB 헤더와 파일 길이 일치, 저장소 내 신규 바이너리 중복 0. 신규 파일 **44개**다. 실제 Roblox 자산 ID 등록은 `tools/mare-scientia-upload-assets.mjs`와 기존 수동 워크플로가 담당하며, 승인된 ID를 생성하기 전에는 `assets-registered.json`에 가짜 ID를 넣지 않는다. 엔진 구동·모바일·게시 검증 전에는 게임 적용 완료로 표시하지 않는다.


## 2026-11-06 교역물품 긴급 보강: 저장소 검증 원본 9종

마리 에센시아 교역 화면용 실물 3D 물품을 신규 확보했다. 기존 `fantasy-survival`의 실제 Kenney CC0 GLB 원본 Git 객체를 재사용한다. 파일 자체를 변경하지 않으므로 SHA와 라이선스 증거를 보존한다. Roblox 자산 발급 ID는 기존 `owner-mare-scientia-assets.yml`과 `tools/mare-scientia-upload-assets.mjs`를 통해 실제 등록된 경우에만 기록한다.

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
