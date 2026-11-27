#!/usr/bin/env python3
"""항구별 3D 에셋 제작 지시서(CSV) 생성기.

출력: docs/port_asset_prompts.csv  (항구 × 에셋 한 줄 = 프롬프트 하나)
열: port_id, port, asset_id, category, tier, size_studs, tris, prompt_en, notes_ko
- prompt_en: 3D 생성 도구(Roblox generate_mesh, Meshy, Tripo 등)에 그대로 넣는 영어 프롬프트
- 모든 프롬프트 앞에 COMMON 이 붙는다. 문서: docs/PORT_VILLAGE_PROMPTS.md
"""
import csv
import os

COMMON = ("Stylized-realistic low-poly 3D game asset for Roblox, early-modern era 1500-1800, "
          "hand-painted PBR textures (albedo+normal+roughness), readable silhouette at 40-80 studs, "
          "clean quad topology, pivot at ground center facing -Z, no text, no logos, no modern objects, "
          "separate meshes for roof / walls / trim / props so colors can be tinted in-engine. ")

GOOD_PROPS = {
    "wool": "bales of raw wool and folded woollen cloth on a wooden counter",
    "coal": "sacks and a heap of black coal with a shovel",
    "tin": "stacked dull-silver tin ingots in a crate",
    "spice": "open burlap sacks of colourful spices with brass scoops",
    "cheese": "round yellow cheese wheels stacked on shelves",
    "tea": "lacquered tea chests and loose tea in baskets",
    "porcelain": "blue-and-white porcelain vases and bowls in straw",
    "wine": "oak wine barrels and clay amphorae",
    "cloth": "rolls of dyed linen cloth on a rack",
    "salt": "white salt cones and wooden salt tubs",
    "amber": "polished amber pieces in small wooden trays",
    "fish": "salted fish in barrels and dried fish hanging",
    "beer": "small beer casks with wooden tankards",
    "whale_oil": "wooden whale-oil barrels with iron hoops",
    "iron": "iron bars and wrought tools on a rack",
    "timber": "stacked sawn timber planks",
    "glass": "colourful blown-glass bottles and goblets on velvet",
    "silk": "bolts of shimmering silk in bright colours",
    "coffee": "sacks of roasted coffee beans and a copper roaster",
    "saffron": "tiny baskets of red saffron threads",
    "carpet": "rolled and hanging patterned carpets",
    "pearls": "strings of pearls in an open shell box",
    "cloves": "sacks of dark cloves and drying mats",
    "ivory": "carved ivory pieces on cloth (display only, no animals harmed depiction)",
    "ambergris": "small waxy grey ambergris lumps in a wooden box",
    "pepper": "sacks of black peppercorns and pepper vines bundle",
    "cinnamon": "bundles of cinnamon bark sticks",
    "cotton": "bales of raw white cotton",
    "copper": "stacked copper ingots and copper pots",
    "silver": "silver ingots and coins in an iron-bound chest",
    "lacquer": "glossy red-black lacquerware boxes and trays",
    "cochineal": "sacks of red cochineal dye and dyed cloth",
    "vanilla": "bundles of dark vanilla pods",
    "cocoa": "cocoa pods and sacks of cocoa beans",
    "sugar": "sugar loaves in paper cones and sugar sacks",
    "leather": "tanned leather hides hanging and saddles",
    "ginseng": "dried ginseng roots in bundles on a tray",
    "rice": "straw rice bales and wooden rice measures",
}

WORKSHOP = {
    "wool": "wool weaving workshop with a large wooden loom and dye vats",
    "cheese": "dairy and cheese house with pressing boards and ageing shelves",
    "wine": "wine press house with a big wooden screw press and barrel cellar door",
    "salt": "salt works shed beside shallow evaporation pans",
    "fish": "smokehouse with fish drying racks and a smoking chimney",
    "whale_oil": "try-works shed with brick furnace and iron cauldrons",
    "iron": "bloomery forge with water-powered hammer and charcoal pile",
    "timber": "water-wheel sawmill with log pond",
    "glass": "glass-blowing workshop with glowing furnace mouth and chimney",
    "silk": "silk workshop with silkworm racks and a draw loom",
    "coffee": "coffee roasting house with copper drum roaster",
    "carpet": "carpet weaving courtyard with vertical looms",
    "cloves": "clove drying yard with woven mats and a store hut",
    "pepper": "pepper drying platform with poles and sacks",
    "cotton": "cotton gin shed and dye works with cloth drying lines",
    "copper": "copper smelting hut with bellows and moulds",
    "silver": "silver mint / assay house with strongbox and scales",
    "lacquer": "lacquer workshop with drying shelves and brush tables",
    "porcelain": "climbing kiln (multi-chamber) with pottery workshop",
    "tea": "tea processing shed with wok-like roasting pans and rolling tables",
    "sugar": "sugar boiling house with cane crusher and chimney",
    "ginseng": "herb drying house with ginseng racks and shade cloth",
    "rice": "water-powered rice mill with raised granary",
    "coal": "coal mine adit entrance with timber frame and ore carts",
    "tin": "tin streaming works with sluice boxes",
    "cocoa": "cocoa fermentation boxes and drying patio",
    "vanilla": "vanilla curing shed with sweat boxes",
    "cochineal": "nopal cactus garden and dye-drying hut",
    "leather": "tannery with lime pits and hanging hides",
    "beer": "brewery with copper kettle and malt kiln",
    "amber": "amber polishing workshop with grindstones",
    "spice": "spice sorting warehouse with weighing scales",
    "saffron": "saffron flower drying room with sieves",
    "pearls": "pearl merchant's counting house with sorting trays",
    "cinnamon": "cinnamon bark peeling shed",
    "ivory": "carving workshop with lathes (display only)",
    "ambergris": "perfumer's workshop with stills",
    "cloth": "fulling mill and cloth hall",
}

LAMP = {
    "oil_lantern": "wrought-iron oil street lantern on a post, glass panes, warm glow, 12 studs tall",
    "paper_lantern": "red paper lantern hanging from a wooden post with small roof, 10 studs tall",
    "mosque_lamp": "Ottoman brass lantern with pierced pattern on a stone post, 11 studs tall",
    "stone_lantern": "Japanese granite tōrō stone lantern, 6 studs tall",
    "torch": "wooden torch on an iron bracket post, 9 studs tall",
    "gas_lamp": "cast-iron gas street lamp, 13 studs tall",
}

# 항구별 설정: name, house style, landmark(base/full), signatures(3), plaza prop, sign style, produces
PORTS = [
    ("london", "런던", "English brick and timber-framed townhouses, steep slate gables, tall chimneys, iron railings",
     "medieval stone bridge with shops on top", "oil_lantern",
     ["Royal Exchange colonnaded courtyard building", "riverside brewery with malt kiln", "naval dockyard ropewalk and slipway"],
     "market cross with stone steps", "hanging wrought-iron shop signs", ["wool", "coal", "tin"]),
    ("amsterdam", "암스테르담", "narrow Dutch canal houses, stepped and bell gables, red-brown brick, white window frames, hoist beams",
     "canal lock gate with a brick weigh house (Waag)", "oil_lantern",
     ["Dutch East India Company warehouse (VOC pakhuis)", "smock windmill grain mill", "merchant exchange hall"],
     "canal-side quay with mooring posts and cranes", "painted wooden gable plaques", ["spice", "cheese", "tea", "porcelain"]),
    ("rouen", "루앙", "Norman half-timbered houses with jettied upper floors, slate roofs",
     "Gothic cathedral spire with flying buttresses", "oil_lantern",
     ["covered cloth market hall", "great clock gate tower over the street", "vaulted wine cellar entrance"],
     "market square with a stone fountain", "carved wooden guild signs", ["wine", "cloth", "salt", "tin"]),
    ("copenhagen", "코펜하겐", "Danish plastered townhouses in ochre/yellow/rust, steep red tile roofs, green copper accents",
     "round brick observatory tower with spiral ramp", "oil_lantern",
     ["Sound toll customs house", "stock exchange with dragon-tail spire", "timber harbour warehouse"],
     "harbour quay with tall-ship mooring", "painted signboards", ["amber", "fish", "beer", "whale_oil"]),
    ("gothenburg", "예테보리", "Swedish falu-red wooden houses with white trim, some turf roofs",
     "hilltop star fort with crown-shaped tower", "oil_lantern",
     ["Swedish East India Company stone warehouse", "water-wheel sawmill", "wooden church with shingled tower"],
     "canal quay with wooden bridges", "carved wooden signs", ["iron", "timber", "fish"]),
    ("venice", "베네치아", "Venetian stucco palazzi in pink/ochre, pointed-arch windows, loggias, funnel chimneys, hip roofs",
     "brick campanile with pyramid spire", "oil_lantern",
     ["Murano glass furnace workshop", "lazaretto quarantine station", "Venetian Arsenal galley shed"],
     "piazza with a carved stone wellhead", "painted wooden signs", ["glass", "silk", "coffee"]),
    ("istanbul", "이스탄불", "Ottoman houses with stone ground floor, projecting timber upper floor, mashrabiya lattice windows, red tile roofs",
     "imperial mosque with central dome and four slender minarets", "mosque_lamp",
     ["covered Grand Bazaar domed arcade", "hammam bathhouse with small domes", "caravanserai courtyard inn"],
     "mosque forecourt with ablution fountain (şadırvan)", "calligraphy-free carved wooden panels", ["silk", "spice", "coffee", "porcelain", "saffron", "carpet", "pearls"]),
    ("zanzibar", "잔지바르", "Swahili coral-stone houses, whitewashed flat roofs, ornately carved wooden doors, timber balconies",
     "coral-stone sultan's palace with veranda", "oil_lantern",
     ["clove storehouse", "dhow landing with shade shelter", "coral-stone mosque with mihrab niche"],
     "beach quay with dhows", "painted wooden boards", ["cloves", "ivory", "ambergris"]),
    ("calicut", "캘리컷", "Kerala houses with laterite walls, steep tiled sloping roofs, deep eaves, wooden lattice",
     "Kerala temple gateway with tiered sloping roofs", "oil_lantern",
     ["pepper trading house", "cotton weaving shed", "beachside wooden shipbuilding yard"],
     "temple tank with stone steps", "palm-leaf signs", ["pepper", "cinnamon", "ivory", "cotton"]),
    ("nagasaki", "나가사키", "Edo-period Japanese wooden machiya, tiled eaves, white plaster storehouses (kura), lattice fronts",
     "Dejima fan-shaped trading island with warehouses and stone bridge", "stone_lantern",
     ["multi-chamber climbing kiln", "rice storehouse (kura)", "Shinto shrine torii gate"],
     "harbour quay with stone steps", "noren cloth curtains (plain colours)", ["copper", "silver", "lacquer", "porcelain"]),
    ("veracruz", "베라크루스", "Spanish colonial coral-stone and stucco houses, flat roofs, wrought-iron balconies, inner patios",
     "coral-stone sea fortress with bastions", "oil_lantern",
     ["silver loading wharf with strongroom", "royal customs house with arcade", "colonial cathedral facade"],
     "plaza de armas with arcades", "wrought-iron signs", ["silver", "cochineal", "vanilla", "cocoa"]),
    ("canton", "광저우", "southern Chinese grey-brick houses, curved tiled eaves, wooden lattice windows",
     "Thirteen Factories riverside row of Western-style hongs with flagpoles", "paper_lantern",
     ["tea market hall", "porcelain shop row", "imperial customs granary"],
     "riverside quay with sampans", "vertical wooden plaques (no characters)", ["tea", "porcelain", "silk", "lacquer"]),
    ("seville", "세비야", "Andalusian whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios",
     "Giralda-style brick bell tower", "oil_lantern",
     ["House of Trade (Casa de Contratación) arcaded building", "olive oil press house", "Torre del Oro riverside tower wharf"],
     "plaza with tiled fountain and orange trees", "painted tile signs (no text)", ["wine", "sugar", "leather", "pepper"]),
    ("busan", "부산", "Joseon giwa tiled-roof houses with curved eaves, plaster walls, stone fences, thatched houses on outskirts",
     "Joseon coastal fortress wall with gate pavilion", "paper_lantern",
     ["panokseon shipbuilding yard", "periodic market (jangsi) stalls", "Confucian school (hyanggyo) hall"],
     "market ground with a big zelkova tree", "cloth banners (plain)", ["ginseng", "rice", "fish", "cotton"]),
    ("lisbon", "리스본", "Portuguese pastel stucco houses, hip tile roofs, azulejo tile panels, iron balconies",
     "Manueline fortified river tower with ornate stonework", "oil_lantern",
     ["navigation school with armillary sphere", "spice warehouse (Casa da Índia)", "monastery cloister"],
     "riverside parade square with arcades", "azulejo tile signs (no text)", ["salt", "sugar", "spice", "porcelain", "pepper"]),
]


def rows():
    out = []
    for pid, name, style, landmark, lamp, sigs, plaza, signs, goods in PORTS:
        def add(aid, cat, tier, size, tris, prompt, note):
            out.append([pid, name, f"{pid}_{aid}", cat, tier, size, "", COMMON + prompt, note])
        # 상징물 기초/완성
        add("landmark_base", "landmark", 2, "40x40x30", "15k",
            f"Under-construction version of {landmark}: lower half built, wooden scaffolding, cranes, stone blocks on ground.",
            "2단계 상징물 기초(공사 중)")
        add("landmark_full", "landmark", 4, "40x40x70", "25k",
            f"Completed {landmark}, the city's signature landmark, ornate but game-readable, weathered stone.",
            "4단계 상징물 완성")
        # 주택 3종(단계별 층수)
        for i, (tier, floors, extra) in enumerate([(1, "1-storey", "humble, small yard, wooden fence"),
                                                    (3, "2-storey", "shop on ground floor, awning"),
                                                    (5, "3-storey", "wealthy merchant house, decorative trim")], 1):
            add(f"house_{i}", "house", tier, "16x14x(12-26)", "6k",
                f"{floors} {style}, {extra}. Provide 3 colour-variant material slots.",
                f"{tier}단계 주택 변형 {i}")
        # 특산 건물 3종
        for i, sig in enumerate(sigs, 1):
            add(f"signature_{i}", "district", 3, "30x24x24", "12k", f"{sig}, in local style: {style}.", "3단계 구역 특산 건물")
        # 광장 중심물
        add("plaza_center", "plaza", 2, "20x20x10", "5k", f"{plaza}, cobbled base, benches around.", "2단계 중앙 광장 중심물")
        # 가로등
        add("street_lamp", "lamp", 3, "2x2x12", "1.5k", LAMP[lamp] + ", emissive glass material slot for night.", "3단계 가로등(밤 발광)")
        # 상점 간판
        add("shop_sign", "sign", 3, "3x0.5x3", "1k", f"set of 6 pictorial {signs}: fish, barrel, cloth roll, bread, anvil, key. No letters.", "상점 그림 간판 세트")
        # 가판대 + 특산물 진열 / 공방
        for g in goods:
            if g in GOOD_PROPS:
                add(f"stall_{g}", "goods", 2, "8x5x6", "3k",
                    f"Market stall with canopy displaying {GOOD_PROPS[g]}, local style of {name}.", f"특산물 가판대: {g}")
            if g in WORKSHOP:
                add(f"workshop_{g}", "workshop", 3, "24x20x16", "10k",
                    f"{WORKSHOP[g]}, built in local style: {style}. Include worker spots and tools.", f"특산물 공방: {g}")
        # 창고 적재 3단계
        add("warehouse_stock", "goods", 2, "20x16x10", "6k",
            f"Warehouse yard with 3 stacking states (low / medium / full) of crates, barrels and sacks for {', '.join(goods[:3])}.",
            "창고 마당 재고 3단계")
    return out


IDENT = {}  # PortIdentity.luau 에서 읽은 항구별 길·조명·땅 (간단 파서)


def load_identity(root):
    import re
    src = open(os.path.join(root, "src", "ReplicatedStorage", "Shared", "PortIdentity.luau"), encoding="utf-8").read()
    for m in re.finditer(r"\n\t([a-z_]+) = \{ landmark = \{ id = \"([^\"]+)\", name = \"([^\"]+)\", kind = \"([a-z_]+)\"([\s\S]*?)signature = \{([^}]*)\} \}", src):
        pid, lid, lname, kind, body, sig = m.groups()
        get = lambda k: (re.search(k + r' = "([a-z_]+)"', body) or [None, None])[1]
        street = re.search(r"street = \{([^}]*)\}", body).group(1).replace('"', "").replace(" ", "").split(",")
        IDENT[pid] = dict(landmark_id=lid, landmark=lname, kind=kind, roof=get("roof"), wall=get("wall"), layout=get("layout"),
                          plaza=get("plaza"), lamp=get("lamp"), ground=get("ground"), weather=get("weatherGround"), street=street,
                          signature=[s.strip().strip('"') for s in sig.split(",")])


LAYOUT_KO = {
    "grid": "바둑판: 큰길과 직각 골목, 블록마다 4~6필지",
    "canal": "운하: 물길 양쪽으로 집 한 줄씩, 다리로 연결",
    "terrace": "계단식: 언덕 등고선 따라 계단 단지, 위로 갈수록 종교·관청",
    "radial": "방사형: 광장에서 길이 사방으로",
    "organic": "골목형: 구불구불한 골목, 불규칙 필지",
}
PLAZA_KO = {"fountain": "분수 광장", "market": "시장 광장", "temple_court": "사원 앞마당", "quay": "부두 광장", "parade": "연병장 광장"}


def port_doc(pid, name, style, landmark, lamp, sigs, plaza, signs, goods, data):
    idt = IDENT.get(pid, {})
    lines = [f"# {name} ({pid}) — ChatGPT 작업 지시서", "",
             "> 이 문서 하나로 이 항구의 3D 에셋 제작과 마을 배치를 진행한다. 공통 규칙은 `docs/PORT_VILLAGE_PROMPTS.md`.", "",
             "## 0. 작업 환경", "",
             "- 게임: Mare Essentia (Roblox, Luau). 배경 1500~1800년 대항해시대. 저장소 `roblox-games/mare-essentia`",
             "- 마을 생성 코드: `src/ReplicatedStorage/Shared/PortScene.luau` (마을 짓기 `densify`, 대표 경관 `placeSignature`/`SIG`, 기념물 `placeLandmarks`)",
             "- 항구 정체성 데이터: `src/ReplicatedStorage/Shared/PortIdentity.luau` (아래 표의 값이 여기 있음)",
             "- 에셋 등록: 파일을 `assets/inbox/Town/<asset_id>.glb`(라이선스 `<asset_id>.license.json` 동봉)에 넣고 main 반영 → `owner-mare-essentia-assets` 워크플로가 Roblox 등록 → 코드에서 `AssetIds[\"Town/<asset_id>\"]`, 배치는 `importedModel(folder, \"Town\", \"<asset_id>\", 위치, 크기)`",
             "- 지키기: 저장 데이터·경제 수치·보행 충돌벽 변경 금지. 원본 없으면 기존 승인 에셋으로 대체(이미 있는 방식).",
             "- 코드 한도: `Game.client.luau` 맨 바깥에 `local` 새로 만들기 금지(레지스터 200 한도 → 화면 안 뜸). `do ... end` 또는 `H.이름`에. `tests/run.sh`가 검사.",
             "- 에셋 규칙: `docs/RULES.md` 를 먼저 읽는다. 3D는 **승인 원본 에셋을 가공**해서 만든다(아래 프롬프트 = 가공 목표). `.license.json`에 원본 이름·URL·라이선스·\"derived\"·가공 내용 기록. 원본 없이 처음부터 AI 생성은 보류.",
             "- 색감: 지상전·마을 나무/덤불은 옅은 청록 단색 금지 — 잎·줄기·그늘 색을 나누고 지역 기후 색(열대 진녹, 건조 올리브, 한대 청록)을 쓴다.",
             "- 검증: `LUAU_DIR=... bash tests/run.sh`(스모크 905건), Studio `tools/devloop/studio-scripts/mare-town.json` 항공·광장 촬영", "",
             "## 1. 항구 정체성", "",
             "| 항목 | 값 |", "|---|---|",
             f"| 상징물 | {idt.get('landmark', landmark)} (`{idt.get('landmark_id', '')}`, 종류 {idt.get('kind', '')}) |",
             f"| 건축 | {style} (지붕 {idt.get('roof', '')}, 벽 {idt.get('wall', '')}) |",
             f"| 구획 | {LAYOUT_KO.get(idt.get('layout'), idt.get('layout', ''))} |",
             f"| 광장 | {PLAZA_KO.get(idt.get('plaza'), idt.get('plaza', ''))} — {plaza} |",
             f"| 길 1→5단계 | {' → '.join(idt.get('street', []))} |",
             f"| 밤 조명 | {idt.get('lamp', lamp)} |",
             f"| 길 밖 땅 / 날씨 | {idt.get('ground', '')} / {idt.get('weather', '')} |",
             f"| 특산물(교역품) | {', '.join(goods)} |", "",
             "## 2. 발전도별 배치 지시", "",
             "| 단계 | 필지 | 무엇을 어디에 |", "|---|---|---|",
             f"| 1 | 6 | 부두 옆 오두막 `{pid}_house_1` 6채, 길 {(idt.get('street') or ['dirt'])[0]}, 횃불 2~3. 외곽: {goods[0]} 관련 텃밭/작업장 1 |",
             f"| 2 | 10 | 부두와 마을 사이 중앙 광장 + `{pid}_plaza_center`. 광장 옆에 `{pid}_landmark_base`(공사 중). 가판대 `{pid}_stall_*` 2개 |",
             f"| 3 | 14 | 구역 분리: 시장(광장 동쪽·부두 쪽) / 종교·관청(광장 반대편) / 주거(골목) / 공방(외곽 강·물가). `{pid}_signature_1~3` 구역별 1채, `{pid}_workshop_*` 공방 구역, 가로등 `{pid}_street_lamp` 길 3칸마다, 간판 `{pid}_shop_sign` |",
             f"| 4 | 18 | `{pid}_landmark_full`로 교체, `{pid}_house_2`(2층 상점) 큰길 앞, 창고 `{pid}_warehouse_stock`(재고 단계) 부두 뒤, 가로등 2칸마다 |",
             f"| 5 | 24 | `{pid}_house_3`(3층) 광장 둘레, 외곽 구역 신설, 가로등 모든 길, 농촌 가공소 |", "",
             "- 건물은 중앙에 몰지 말고 구역별로 나눈다. 광장 → 큰길 → 골목 순으로 밀도가 낮아지게.",
             "- 같은 집 연속 배치 금지(색 슬롯·회전·높이 변형). 땅은 길(포장)과 길 밖(기후 재질)을 구분.", "",
             "## 3. 3D 에셋 프롬프트", "",
             "모든 프롬프트는 공통 문구 포함(그대로 3D 생성 도구에 붙여 넣기).", ""]
    for r in data:
        if r[0] != pid:
            continue
        lines += [f"### `{r[2]}` — {r[8]}", f"- 분류 {r[3]} · 등장 {r[4]}단계 · 크기 {r[5]}", "```", r[7], "```", ""]
    lines += ["## 4. 완료 체크", "",
              "- [ ] 에셋 파일·라이선스 inbox 등록, `AssetIds` 반영 확인",
              "- [ ] 단계 1~5 Studio 항공 사진에서 구역 분리·광장·상징물 확인",
              "- [ ] 스모크 905건·로직 테스트 통과", ""]
    return "\n".join(lines)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "..", "docs", "port_asset_prompts.csv")
    data = rows()
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["port_id", "port", "asset_id", "category", "tier", "size_studs", "tris", "prompt_en", "notes_ko"])
        w.writerows(data)
    print(f"{len(data)} rows -> {os.path.normpath(path)}")
    root = os.path.join(here, "..")
    load_identity(root)
    out_dir = os.path.join(root, "docs", "ports")
    os.makedirs(out_dir, exist_ok=True)
    # 항구별 md 는 tools/gen_port_briefs_all.py 가 전 항구 대상으로 만든다(여기서는 쓰지 않음).
    _ = out_dir
    print(f"{len(PORTS)} port briefs -> {os.path.normpath(out_dir)} (identity parsed {len(IDENT)})")


if __name__ == "__main__":
    main()
