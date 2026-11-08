# 코드 지도 (mare-scientia)

> `tools/devloop/code_map.py` 가 자동 생성. 직접 고치지 말 것. 파일이 크면 아래 함수 줄 번호로 바로 이동한다.

| 파일 | 줄 | 의존 |
|---|---|---|
| `ReplicatedStorage/Shared/AssetIds.luau` | 457 | - |
| `ReplicatedStorage/Shared/AudioIds.luau` | 24 | - |
| `ReplicatedStorage/Shared/Bosses.luau` | 91 | - |
| `ReplicatedStorage/Shared/Bounties.luau` | 49 | - |
| `ReplicatedStorage/Shared/CardArt.luau` | 30 | AssetIds, CardArtCredits |
| `ReplicatedStorage/Shared/CardArtCredits.luau` | 6 | - |
| `ReplicatedStorage/Shared/Careers.luau` | 59 | - |
| `ReplicatedStorage/Shared/Collection.luau` | 29 | - |
| `ReplicatedStorage/Shared/Combat.luau` | 351 | Skills |
| `ReplicatedStorage/Shared/CompanionTalk.luau` | 127 | - |
| `ReplicatedStorage/Shared/Facilities.luau` | 51 | - |
| `ReplicatedStorage/Shared/FieldScene.luau` | 514 | Pose |
| `ReplicatedStorage/Shared/Fields.luau` | 139 | - |
| `ReplicatedStorage/Shared/Gear.luau` | 21 | - |
| `ReplicatedStorage/Shared/Geo.luau` | 178 | - |
| `ReplicatedStorage/Shared/Harbor.luau` | 26 | - |
| `ReplicatedStorage/Shared/KnowledgeCards.luau` | 833 | - |
| `ReplicatedStorage/Shared/Narrative.luau` | 56 | - |
| `ReplicatedStorage/Shared/NavalBattle.luau` | 785 | - |
| `ReplicatedStorage/Shared/PortCultures.luau` | 177 | - |
| `ReplicatedStorage/Shared/PortScene.luau` | 1601 | PortCultures, Ports, Pose |
| `ReplicatedStorage/Shared/Ports.luau` | 902 | - |
| `ReplicatedStorage/Shared/Pose.luau` | 445 | - |
| `ReplicatedStorage/Shared/Quests.luau` | 207 | - |
| `ReplicatedStorage/Shared/Regions.luau` | 69 | - |
| `ReplicatedStorage/Shared/Scholars.luau` | 61 | - |
| `ReplicatedStorage/Shared/SeaRoutes.luau` | 78 | SeaRoutes1, SeaRoutes2, SeaRoutes3, SeaRoutes4, SeaRoutes5, SeaRoutes6 |
| `ReplicatedStorage/Shared/SeaRoutes1.luau` | 3207 | - |
| `ReplicatedStorage/Shared/SeaRoutes2.luau` | 3207 | - |
| `ReplicatedStorage/Shared/SeaRoutes3.luau` | 3207 | - |
| `ReplicatedStorage/Shared/SeaRoutes4.luau` | 3207 | - |
| `ReplicatedStorage/Shared/SeaRoutes5.luau` | 3207 | - |
| `ReplicatedStorage/Shared/SeaRoutes6.luau` | 297 | - |
| `ReplicatedStorage/Shared/Sfx.luau` | 163 | AudioIds |
| `ReplicatedStorage/Shared/Ships.luau` | 112 | - |
| `ReplicatedStorage/Shared/Sites.luau` | 572 | - |
| `ReplicatedStorage/Shared/Skills.luau` | 105 | - |
| `ReplicatedStorage/Shared/Specialties.luau` | 175 | - |
| `ReplicatedStorage/Shared/Story.luau` | 2035 | - |
| `ReplicatedStorage/Shared/Tech.luau` | 61 | - |
| `ReplicatedStorage/Shared/TradeMath.luau` | 63 | Ports |
| `ReplicatedStorage/Shared/VisualLadderState.luau` | 16 | - |
| `ReplicatedStorage/Shared/Voyage.luau` | 189 | - |
| `ReplicatedStorage/Shared/VoyageScene.luau` | 984 | Sfx |
| `ServerScriptService/AssetLoader.server.luau` | 84 | - |
| `ServerScriptService/Core.server.luau` | 327 | Social |
| `ServerScriptService/DevTelemetry.server.luau` | 121 | - |
| `ServerScriptService/Services/Battle.luau` | 213 | - |
| `ServerScriptService/Services/Boss.luau` | 99 | - |
| `ServerScriptService/Services/Codex.luau` | 93 | - |
| `ServerScriptService/Services/Discovery.luau` | 110 | - |
| `ServerScriptService/Services/Facility.luau` | 297 | - |
| `ServerScriptService/Services/Harbor.luau` | 214 | - |
| `ServerScriptService/Services/Market.luau` | 90 | - |
| `ServerScriptService/Services/Perk.luau` | 370 | - |
| `ServerScriptService/Services/Quest.luau` | 137 | - |
| `ServerScriptService/Services/Registry.luau` | 34 | Battle, Boss, Codex, Discovery, Facility, Harbor, Market, Perk, Quest, Research, Sailing, Shipyard, State, Story, Trade, View |
| `ServerScriptService/Services/Research.luau` | 46 | - |
| `ServerScriptService/Services/Sailing.luau` | 359 | - |
| `ServerScriptService/Services/Shipyard.luau` | 390 | - |
| `ServerScriptService/Services/State.luau` | 517 | - |
| `ServerScriptService/Services/Story.luau` | 84 | - |
| `ServerScriptService/Services/Trade.luau` | 178 | - |
| `ServerScriptService/Services/View.luau` | 621 | - |
| `ServerScriptService/Social.luau` | 272 | - |
| `StarterPlayer/DevReport.client.luau` | 44 | - |
| `StarterPlayer/Game.client.luau` | 4853 | - |
| `StarterPlayer/VisualLadder.client.luau` | 92 | - |

## StarterPlayer/Game.client.luau (4853줄) — 최상위 함수 67개

`groupOf`:74, `overlayGui`:120, `corner`:133, `mkLabel`:139, `iconFor`:192, `addItemMotion`:216, `modelIcon`:244, `withIcon`:357, `mkButton`:368, `mkRow`:403, `mkHeader`:458, `setPortrait`:612, `hudStroke`:717, `hudText`:740, `updateHud`:897, `clearContent`:911, `call`:924, `amount`:1065, `hypot`:1073, `mkBox`:1077, `geoX`:1089, `geoY`:1090, `drawLand`:1092, `playVoyage`:1103, `sail`:1296, `confirmSail`:1427, `mkRound`:1500, `paintScene`:1522, `portraitPerson`:1595, `storyPortraitModel`:1634, `heroPortrait`:1650, `playEpilogue`:1700, `playStory`:1826, `nextOrder`:2088, `add`:2093, `renderHarbor`:2104, `renderStatus`:2321, `intelName`:2480, `addStoryPanel`:2490, `addRumorPanel`:2517, `closeTradeHall`:2532, `openTradeHall`:2541, `renderTrade`:2794, `renderRoute`:2994, `renderYard`:3037, `openYardHall`:3159, `startField`:3279, `renderExplore`:3305, `fieldColor`:3343, `findField`:3347, `paintCardArt`:3357, `showCardDetail`:3388, `tierRows`:3466, `renderCodexOverview`:3485, `renderCodexField`:3529, `renderCodex`:3607, `renderTech`:3615, `renderQuest`:3635, `renderBattle`:3660, `renderMap`:3745, `renderTabs`:3850, `closeOptions`:4010, `startNewGame`:4174, `tLabel`:4378, `setTitleMode`:4606, `render`:4617, `showTitle`:4663

## ReplicatedStorage/Shared/SeaRoutes1.luau (3207줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/SeaRoutes2.luau (3207줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/SeaRoutes3.luau (3207줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/SeaRoutes4.luau (3207줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/SeaRoutes5.luau (3207줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/Story.luau (2035줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/PortScene.luau (1601줄) — 최상위 함수 22개

`seeded`:50, `part`:58, `wedge`:75, `gableRoof`:89, `sign`:94, `prompt`:128, `importedModel`:153, `lantern`:200, `villager`:220, `uniformMaterial`:243, `house`:253, `buildShip`:307, `styleKeyOf`:445, `rotateAround`:452, `roadMat`:460, `roadColor`:463, `strip`:469, `smokeOn`:475, `palmOk`:489, `densify`:496, `PortScene.build`:936, `PortScene.placeModel`:1595

## ReplicatedStorage/Shared/VoyageScene.luau (984줄) — 최상위 함수 5개

`part`:19, `worldPath`:38, `positionAt`:69, `yawOf`:81, `VoyageScene.play`:87

## ReplicatedStorage/Shared/Ports.luau (902줄) — 최상위 함수 0개

(없음)

## ReplicatedStorage/Shared/KnowledgeCards.luau (833줄) — 최상위 함수 1개

`card`:16

## ReplicatedStorage/Shared/NavalBattle.luau (785줄) — 최상위 함수 5개

`part`:18, `placeShip`:36, `label`:81, `parseLog`:94, `NavalBattle.play`:117
