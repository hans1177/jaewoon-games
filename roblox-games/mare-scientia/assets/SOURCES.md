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

이름이 없는 보석의 광물 종류 및 직물의 섬유 종류는 확정하지 않는다. 항구별 특산품·가격·저장 구조는 변경하지 않는다. Roblox 등록은 기존 `owner-mare-scientia-assets.yml` 및 `mare-scientia-upload-assets.mjs` 사용. 실제 등록 ID·Universe 사용 권한·게임 내 표시 결과 확인 전까지 미검증.

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
