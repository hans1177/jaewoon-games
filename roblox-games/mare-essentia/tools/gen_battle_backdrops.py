#!/usr/bin/env python3
"""퀘스트·전투 배경 지시서 생성기 (해상·지상, 지역·대륙·항구·퀘스트별).

출력: docs/battle_backdrops/
- README.md                 공통 규칙(층 구성·하늘·물·조명·파티클·성능·코드 위치·검증)
- naval/<sea>.md            해역 26곳: 물·하늘·해안선 실루엣·근/중/원경 오브젝트·날씨·파티클·전투 종류별 변형·인접 항구 스카이라인
- field/<port>.md           항구별 탐험 지점(Sites.luau 592곳) 지상전 배경: 지형·식생·바위·구조물·적 복장·날씨·파티클
- quests.md                 전투가 있는 퀘스트·함대전·이야기 함대전 → 배경 지정표
- backdrop_prompts.csv      배경 에셋 프롬프트(승인 원본 가공 목표)
작업자(ChatGPT 등)는 README → 해당 파일 순서로 읽는다. 규칙: docs/RULES.md
"""
import csv
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
SHARED = os.path.join(ROOT, "src", "ReplicatedStorage", "Shared")
OUT = os.path.join(ROOT, "docs", "battle_backdrops")
sys.path.insert(0, HERE)
import gen_port_briefs_all as P  # noqa: E402

COMMON = P.COMMON

# ── 해역 26곳 ─────────────────────────────────────────────────────────────
# (id, 이름, 지역(Regions), 위경도 상자[lat0,lat1,lon0,lon1], 물색, 하늘, 해안 실루엣, 근경, 중경, 원경, 날씨들, 특수 파티클, 문화권)
SEAS = [
    ("north_sea", "북해", "europe", (50, 62, -5, 9), "slate grey-green, choppy", "low grey overcast, broken clouds",
     "chalk cliffs and flat dune coast with windmills and church spires", "floating kelp, seabirds, buoy", "fishing busses with brown sails, lighthouse on rock",
     "distant Dutch/English skyline with spires and windmills", ["비바람", "짙은 안개", "겨울 폭풍"], "물보라·빗줄기·갈매기 떼", "brick"),
    ("baltic", "발트해", "europe", (53, 66, 9, 31), "dark teal, low waves", "pale northern sky, long dusk",
     "pine forest shores, brick Hanseatic towers, granite skerries", "ice floes (winter), amber-coloured driftwood", "Hanseatic cogs, wooden piers",
     "copper spires and onion domes on the horizon", ["서리 안개", "눈보라", "백야 석양"], "눈발·얼음 조각·입김", "hanse"),
    ("channel", "영국 해협", "europe", (48, 51.5, -6, 2.5), "grey-blue, strong tide lines", "fast-moving clouds, sun breaks",
     "white chalk cliffs vs Norman coast with castles", "tide rips, flotsam crates", "naval patrol frigates, signal towers", "Dover-like cliff castle silhouette",
     ["돌풍", "비", "맑음"], "물보라·구름 그림자 이동", "britain"),
    ("biscay", "비스케이만", "europe", (43, 48, -10, -1), "deep blue, long Atlantic swell", "bright with towering cumulus",
     "rocky Basque/Breton headlands, fishing villages", "big swell foam, dolphins", "whaling boats, fortified headland", "green mountains behind coast",
     ["큰 너울", "폭풍", "맑음"], "큰 물보라·돌고래 점프", "france"),
    ("iberian_atlantic", "이베리아 대서양", "europe", (35, 43.5, -11, -6), "vivid Atlantic blue", "clear warm sky",
     "ochre cliffs, white towns, fortified river mouth", "fishing caravels, buoys", "Manueline tower on the river mouth", "hills with monasteries",
     ["맑음", "해무", "서풍"], "아지랑이·물보라", "iberia"),
    ("med_west", "서지중해", "europe", (35, 44, -6, 12), "clear turquoise to deep blue", "warm golden sunset",
     "terraced hills, olive groves, walled ports, Moorish forts", "fishing feluccas, amphora flotsam", "watchtowers on capes, galleys", "Sierra mountain silhouettes",
     ["석양", "미스트랄 강풍", "맑음"], "석양 빛 반짝임·바람 물결", "italy"),
    ("med_east", "동지중해·에게해", "europe", (30, 41, 12, 36), "crystal blue, white rocky shallows", "bright, white light",
     "white island villages, ancient ruins, Ottoman fortresses", "rocky islets, sponge boats", "Greek temple ruins on cape, windmills", "Ottoman domes and minarets",
     ["멜테미 강풍", "맑음", "뇌우"], "흰 파도 거품·햇빛 반짝임", "ottoman"),
    ("red_sea", "홍해", "indian", (12, 30, 32, 44), "brilliant turquoise over coral", "hazy white-hot sky",
     "barren red mountains, coral-stone towns, mosque minarets", "coral reefs visible underwater, dhows", "desert cliffs, palm oases", "Arabian mountain range",
     ["모래바람", "폭염", "맑음"], "모래 먼지·아지랑이", "desert"),
    ("arabian", "아라비아해·페르시아만", "indian", (10, 30, 44, 68), "warm teal", "pale dusty blue",
     "Omani forts, wind-tower houses, palm groves", "pearl diving boats, dhows", "fort on headland, date palms", "hazy mountains of Persia",
     ["샤말 바람", "몬순", "맑음"], "먼지·물보라", "swahili"),
    ("swahili", "동아프리카 해안", "indian", (-26, 10, 36, 55), "turquoise lagoon to indigo", "towering tropical clouds",
     "coral-stone towns, mangroves, baobabs", "outrigger canoes, mangrove roots", "dhows with lateen sails, coral mosques", "green hills and baobabs",
     ["몬순 소나기", "무더위", "맑음"], "굵은 빗방울·열대 새", "swahili"),
    ("cape", "희망봉·남대서양", "indian", (-45, -26, 10, 36), "dark navy, huge swells", "dramatic storm clouds",
     "Table Mountain-like flat summit, rocky cape", "kelp beds, seals, albatross", "Dutch fort and windmill", "flat-topped mountain",
     ["격랑", "폭풍", "맑음 강풍"], "거대 물보라·알바트로스", "brick"),
    ("malabar", "인도 서해안", "indian", (6, 24, 68, 78), "green-blue monsoon water", "heavy monsoon clouds",
     "coconut palm coast, temple gopurams, Portuguese forts", "fishing catamarans, floating coconuts", "Chinese fishing nets, palm groves", "Western Ghats mountains",
     ["몬순 폭우", "무더위", "맑음"], "폭우·물안개·반딧불(밤)", "malabar"),
    ("bengal", "벵골만", "indian", (5, 23, 78, 95), "silt-brown near coast, blue offshore", "humid haze",
     "river deltas, temple towers, mudflats", "river barges, floating water hyacinth", "pagodas and temples", "low jungle horizon",
     ["사이클론", "몬순", "습한 맑음"], "비·강풍·물안개", "malabar"),
    ("malacca", "말라카 해협", "far_east", (-6, 8, 95, 106), "emerald green, calm", "thunderheads in afternoon",
     "jungle coasts, stilt villages, Portuguese/Dutch forts", "floating logs, proas", "Chinese junks, mosque roofs", "volcanic jungle peaks",
     ["열대 뇌우", "무풍 무더위", "맑음"], "번개·빗줄기·열대 새", "seasia"),
    ("spice_islands", "향료 제도", "far_east", (-10, 3, 120, 135), "clear cobalt over reefs", "bright with volcano smoke",
     "volcanic cones, clove plantations, stilt houses", "kora-kora war canoes, reefs", "volcano with smoke plume, forts", "chain of volcanic islands",
     ["화산재", "열대 소나기", "맑음"], "화산재·연기·빗방울", "seasia"),
    ("south_china", "남중국해", "far_east", (5, 23, 105, 121), "jade green", "typhoon-prone grey",
     "karst islands, pagodas, fishing villages", "sampans, fishing nets", "junks with batten sails, pagoda on hill", "karst peaks",
     ["태풍", "몬순", "맑음"], "폭우·강풍·물보라", "china"),
    ("east_china", "동중국해·대한해협", "far_east", (23, 38, 118, 131), "blue-grey with strong currents", "soft hazy sky",
     "rocky islands, Joseon fortress walls, pine-covered hills", "fishing boats, seaweed farms", "panokseon and junks, beacon fires", "mountain ridges",
     ["해무", "봄비", "가을 맑음"], "해무·봉화 연기", "korea"),
    ("japan_sea", "일본 근해", "far_east", (30, 46, 128, 146), "deep blue, clear", "clean sky, cherry/maple season tints",
     "pine-covered cliffs, castle keeps, torii gates in water", "fishing boats, floating lanterns", "atakebune, shrine gates", "Fuji-like conical mountain",
     ["봄 벚꽃 바람", "장마", "눈"], "꽃잎·빗줄기·눈송이", "japan"),
    ("caribbean", "카리브해", "new_world", (9, 25, -88, -59), "brilliant turquoise, white sand shallows", "bright with cumulus",
     "palm islands, colonial forts, sugar plantations", "sandbars, wrecks, palm debris", "galleons, pirate sloops, fort with flag", "green volcanic islands",
     ["허리케인", "열대 소나기", "맑음"], "강풍 빗줄기·햇빛 반짝임", "colonial"),
    ("gulf_mexico", "멕시코만", "new_world", (18, 31, -98, -81), "green-brown coast, blue offshore", "humid, thunderstorms",
     "low mangrove coast, coral fortress, swamps", "logs, egrets", "treasure fleet galleons", "low jungle horizon",
     ["뇌우", "북풍(노르테)", "맑음"], "번개·비", "colonial"),
    ("brazil", "브라질 해안", "new_world", (-35, 0, -50, -34), "deep tropical blue", "towering clouds",
     "sugarloaf granite domes, rainforest, white churches", "jangadas (rafts), dolphins", "Portuguese forts, sugar mills", "granite domes and forest",
     ["열대 폭우", "맑음", "무더위"], "비·열대 새·물보라", "colonial"),
    ("pacific_south_america", "남미 태평양", "new_world", (-45, 0, -82, -70), "cold Humboldt blue-green", "desert-clear or fog",
     "Andes behind barren coast, adobe ports", "guano islands, sea lions", "Spanish galleons", "snow-capped Andes",
     ["가루아 해무", "맑음", "강풍"], "해무·바다사자 물튀김", "colonial"),
    ("north_atlantic_america", "북미 대서양", "new_world", (31, 52, -80, -52), "cold grey-blue", "changeable, fog banks",
     "rocky forested coast, clapboard towns, forts", "cod boats, ice (north)", "frigates, lighthouses", "pine forest hills",
     ["짙은 안개", "북동풍 폭풍", "맑음"], "안개·눈·물보라", "creole"),
    ("west_africa", "서아프리카 해안", "w_africa", (-15, 20, -25, 15), "warm green-blue, heavy surf", "harmattan haze or storm",
     "surf beaches, castle forts, palm groves, mud-brick towns", "surf canoes, palm debris", "coastal castles (Elmina-like)", "low green hills",
     ["하르마탄 먼지", "열대 폭우", "맑음"], "먼지 안개·큰 파도 거품", "wafrica"),
    ("atlantic_islands", "대서양 섬", "w_africa", (14, 40, -32, -13), "deep ocean blue", "trade-wind clouds",
     "volcanic islands, terraced vineyards, white churches", "whales, fishing boats", "volcano peak, harbour fort", "volcanic cones",
     ["무역풍", "맑음", "폭풍"], "고래 물줄기·물보라", "iberia"),
    ("south_pacific", "남태평양", "pacific", (-48, 23, 140, -120), "lagoon turquoise, deep ocean indigo", "huge clear sky, sunset colours",
     "coral atolls, volcanic peaks, thatched villages", "outrigger canoes, coral heads", "voyaging canoes, palm atolls", "volcanic peaks",
     ["사이클론", "무역풍 소나기", "맑음"], "물보라·열대 새·별빛(밤)", "pacific"),
    ("north_pacific", "북태평양", "pacific", (40, 62, 140, -122), "cold dark blue", "grey, misty",
     "fjord coast, rainforest, totem villages", "sea otters, kelp", "Russian/Spanish ships, forts", "snowy mountains",
     ["안개", "폭풍", "맑음 추위"], "안개·빗줄기·눈", "nordic"),
]

BATTLE_KINDS = [
    ("pirate", "해적 사냥(일반 해전·q_pirate_hunt 계열)", "smugglers' cove rocks, wreck masts, hidden coves, black-flag sloops"),
    ("blockade", "항구 봉쇄 돌파(blockade)", "the nearest port skyline in background, harbour forts firing, boom chain, burning hulks"),
    ("convoy", "호송선단 습격(convoy_raid)", "open sea, convoy merchant sails on horizon, escort frigates, cargo flotsam"),
    ("decisive", "함대 결전(fleet_decisive)", "line-of-battle ships in formation, heavy smoke banks, flagships, dramatic sky"),
    ("regional", "해역별 함대전(war_<region>)", "region signature: coastline culture, local ship types, weather typical of the region"),
    ("story", "이야기 함대전(questOnly)", "story-specific landmark or event: e.g. burning signal lamp, ghost fog, treasure fleet"),
    ("storm", "폭풍 조우", "storm wall, lightning, giant waves, torn sails debris"),
    ("night", "야간전", "moonlight path on water, lantern-lit ships, muzzle flash lighting, stars"),
]

# 지상 생물군(지점 이름 단어 → 지형). FieldScene BIOMES 확장
FIELD_BIOMES = [
    ("coast", ["해안", "갯벌", "바위", "절벽", "만", "섬", "부두", "어장", "군도", "곶", "등대", "모래"], "rocky shore and beach", "tide pools, driftwood, beached boats, fishing huts, cliffs"),
    ("plains", ["고지", "봉분", "평원", "열석", "들판", "돌", "초원", "선돌"], "open grassland", "standing stones, hedgerows, lone trees, sheep, farm walls"),
    ("mine", ["광산", "탄광", "채석", "동굴"], "mine and quarry", "headframes, ore carts, tunnels, slag heaps, lanterns"),
    ("forest", ["숲", "과수원", "호수", "농장", "아마", "정원", "버드나무", "약초"], "forest and garden", "dense trees, undergrowth, streams, hunting lodge, fallen logs"),
    ("ruins", ["유적", "신전", "폐허", "성", "피라미드", "사원", "궁"], "ancient ruins", "broken columns, overgrown walls, statues, stairs, vines"),
    ("archive", ["기록", "보관소", "도서관", "천문대", "진열실", "약방", "학회", "관측", "대학", "수도원"], "institution grounds", "courtyard, garden walls, observatory dome, carts of books, scholars"),
    ("desert", ["사막", "오아시스", "모래언덕", "와디"], "desert and oasis", "dunes, palms, caravan camp, mud-brick ruins"),
    ("jungle", ["정글", "밀림", "우림", "맹그로브", "늪"], "jungle and swamp", "giant trees, vines, mangrove roots, mist, stilt huts"),
    ("mountain", ["산", "화산", "고개", "봉우리", "빙하"], "mountain and volcano", "steep rocks, snow line or lava rock, mountain path, cairns"),
]

CLIMATE_FIELD = {
    "tropical": ("palms, broadleaf jungle, bright flowers", "red/brown laterite, sand", "후덥지근한 햇빛·소나기", "빗줄기·나비·반딧불(밤)"),
    "temperate_south": ("olive, cypress, umbrella pine, maquis shrubs", "ochre earth, limestone", "강한 햇빛·건조", "먼지·꽃가루·매미 소리"),
    "temperate_north": ("oak, beech, birch, ferns", "dark loam, grass, granite", "흐림·비·안개", "빗줄기·안개·낙엽"),
    "cold": ("pine, spruce, birch, moss", "rock, snow patches, tundra", "눈·서리·짧은 낮", "눈송이·입김·서리 반짝임"),
    "arid": ("date palms, acacia, scrub", "sand, red rock", "열기·모래바람", "모래 먼지·아지랑이"),
}

ENEMY_DRESS = {
    "europe": "European bandits/deserters in coats, tricorns, muskets and sabres",
    "w_africa": "coastal raiders in wrapped cloth with spears and trade muskets",
    "new_world": "buccaneers and colonial deserters, bandanas, cutlasses",
    "indian": "Arabian/Indian Ocean corsairs with turbans, curved swords",
    "far_east": "wokou-style pirates / bandits with straw hats, spears and swords",
    "pacific": "island raiders with clubs and spears; colonial deserters",
}


def read(name):
    return open(os.path.join(SHARED, name), encoding="utf-8").read()


def in_box(lat, lon, box):
    la0, la1, lo0, lo1 = box
    if not (la0 <= lat <= la1):
        return False
    if lo0 <= lo1:
        return lo0 <= lon <= lo1
    return lon >= lo0 or lon <= lo1  # 날짜변경선을 넘는 상자


def sea_of(p):
    for s in SEAS:
        if in_box(p["lat"], p["lon"], s[3]):
            return s
    # 가장 가까운 상자 중심
    def dist(s):
        la = (s[3][0] + s[3][1]) / 2
        lo = (s[3][2] + s[3][3]) / 2
        return (la - p["lat"]) ** 2 + (lo - p["lon"]) ** 2
    return min(SEAS, key=dist)


def region_of(pid):
    src = read("Regions.luau")
    return src


def main():
    os.makedirs(os.path.join(OUT, "naval"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "field"), exist_ok=True)
    ports = P.load_ports()
    cult = P.load_cultures()
    sites = re.findall(r'\{ id = "([a-z_0-9]+)", name = "([^"]+)", portId = "([a-z_]+)"', read("Sites.luau"))
    rows = []

    def asset(aid, cat, prompt, note):
        rows.append([aid, cat, COMMON + prompt, note])

    # 항구 → 해역
    port_sea = {pid: sea_of(p) for pid, p in ports.items()}

    # README
    readme = ["# 퀘스트·전투 배경 지시서", "",
              "> 대상: 해전(NavalBattle)·지상전(FieldScene) 배경. 지역·대륙·항구·퀘스트마다 다르게. 먼저 `docs/RULES.md`.", "",
              "## 지금 문제 (Studio 확인)", "",
              "- 해전: 해역 테마 15종이 있지만 각 테마 소품이 **4개뿐**이고 ±450 스터드 가장자리에만 있어 넓은 빈 바다 + 어울리지 않는 바위만 보인다.",
              "- 지상전: 생물군 4종(해안·평원·광산·숲)뿐이라 지역 차이가 없고, 나무가 옅은 청록 단색이라 평면적이다.", "",
              "## 공통 구성 원칙", "",
              "| 층 | 거리(스터드) | 내용 | 규칙 |", "|---|---|---|---|",
              "| 근경 | 0~120 | 부유물·암초·물새·해초 / 풀·바위·소품 | 전투 공간을 가리지 않게 가장자리, 움직임(흔들림·물결) |",
              "| 중경 | 120~400 | 배·등대·요새·섬 / 나무숲·건물·유적 | 지역 특징이 가장 잘 보이는 층. 3~6개 묶음 |",
              "| 원경 | 400~1500 | 해안선·산맥·도시 스카이라인 실루엣 | 단순 실루엣 + 대기 원근(멀수록 하늘색에 섞임) |",
              "| 하늘 | - | 구름 종류·태양 각도·색 | 지역 기후·시간·날씨에 맞춤 |", "",
              "- 물: 해역별 색·투명도·파고. 얕은 곳은 밝게(산호·모래), 깊은 곳 어둡게.",
              "- 조명: 낮은 해(측광)로 그림자 길게, 대비 살짝↑. 안개는 원경에만(근경 선명).",
              "- 파티클: 날씨별(비·눈·모래·물보라·화산재·꽃잎). 모바일은 절반.",
              "- 근처 항구가 있으면 원경에 그 항구 스카이라인(`docs/ports/<항구>.md`의 상징물)을 실루엣으로.",
              "- 성능: 원경은 단일 메시 실루엣, 중경 LOD, 근경만 디테일. 전투 시작 시 한 번 생성.", "",
              "## 코드 위치", "",
              "- 해전 배경: `src/ReplicatedStorage/Shared/NavalBattle.luau` 의 `coasts` 표(해역 테마: water/sky/props). 해역 선택 로직을 이 문서의 해역 id로 확장.",
              "- 지상전 배경: `src/ReplicatedStorage/Shared/FieldScene.luau` 의 `BIOMES`(지점 이름 단어 → 지형). 이 문서의 생물군·기후·항구 문화로 확장.",
              "- 탐험 지점: `src/ReplicatedStorage/Shared/Sites.luau` (592곳, 지점 id로 배경 지정 가능).",
              "- 코드 한도: `Game.client.luau` 맨 바깥 local 금지(`tests/run.sh` 검사).", "",
              "## 파일", "", "- `naval/<해역>.md` 해역 26곳 · `field/<항구>.md` 항구별 탐험 지점 · `quests.md` 퀘스트→배경 표 · `backdrop_prompts.csv` 에셋 프롬프트", "",
              "## 검증", "", "- Studio `mare-navalrt.json`(해전)·`mare-field.json`(지상전) 촬영: 근/중/원경이 모두 보이고 지역이 한눈에 구분되는지.", ""]
    open(os.path.join(OUT, "README.md"), "w", encoding="utf-8").write("\n".join(readme))

    # 해역
    for s in SEAS:
        sid, name, region, box, water, sky, coast, near, mid, far, weathers, fx, culture = s
        near_ports = [ports[pid]["name"] + f"(`{pid}`)" for pid, ss in port_sea.items() if ss[0] == sid]
        c = P.CULT.get(culture, P.CULT["tropic"])
        L = [f"# {name} (`{sid}`) — 해전 배경", "", f"- 지역: `{region}` · 문화권 기준: {c['ko']}",
             f"- 이 해역 항구: {', '.join(near_ports) or '-'}", "",
             "## 기본 모습", "", "| 항목 | 내용 |", "|---|---|",
             f"| 물 | {water} |", f"| 하늘 | {sky} |", f"| 해안 실루엣(원경) | {coast}; {far} |",
             f"| 중경 | {mid} |", f"| 근경 | {near} |", f"| 날씨 | {', '.join(weathers)} |", f"| 파티클 | {fx} |", "",
             "## 전투 종류별 변형", "", "| 전투 | 배경 변화 |", "|---|---|"]
        for kid, kko, ken in BATTLE_KINDS:
            L.append(f"| {kko} | {ken} — {name} 버전 |")
        L += ["", "## 배치 지시", "",
              "- 원경: 해안 실루엣을 전투 공간 두 방향(앞·옆)에 길게, 가까운 항구가 있으면 그 상징물 실루엣 포함.",
              "- 중경: 3~6개 묶음(배 2~3척 정박/항해, 등대·요새 1, 섬 1~2). 전투 원(반경 250) 밖.",
              "- 근경: 부유물·물새·암초를 6~12개, 전투 동선을 막지 않게.",
              f"- 날씨 순환: {' → '.join(weathers)} (전투마다 무작위 1개, 지역 기후 가중)", ""]
        open(os.path.join(OUT, "naval", sid + ".md"), "w", encoding="utf-8").write("\n".join(L))
        asset(f"sea_{sid}_far", "naval-far", f"Long low-poly coastline silhouette for {name}: {coast}; {far}. Single mesh, 1500 studs wide, atmospheric colours.", f"{name} 원경 해안선")
        asset(f"sea_{sid}_mid", "naval-mid", f"Mid-distance set for {name}: {mid}. 4-6 pieces, LOD-friendly.", f"{name} 중경 세트")
        asset(f"sea_{sid}_near", "naval-near", f"Near-water props for {name}: {near}. Small floating/animated pieces.", f"{name} 근경 소품")

    # 지상: 항구별 탐험 지점
    by_port = {}
    for sid_, sname, pid in sites:
        by_port.setdefault(pid, []).append((sid_, sname))
    regions = dict(re.findall(r'([a-z_]+) = "(europe|w_africa|new_world|indian|far_east|pacific)"', read("Regions.luau")))
    for pid, p in ports.items():
        culture = cult.get(pid, "tropic")
        c = P.CULT.get(culture, P.CULT["tropic"])
        wk = P.weather_key(p["lat"], culture)
        veg, soil, mood, fx = CLIMATE_FIELD[wk]
        reg = regions.get(pid) or ("europe" if culture in ("britain", "brick", "hanse", "nordic", "stone", "france", "iberia", "italy", "med") else
                                   "far_east" if culture in ("japan", "korea", "china", "seasia") else
                                   "indian" if culture in ("malabar", "swahili", "desert", "ottoman") else
                                   "w_africa" if culture == "wafrica" else "pacific" if culture == "pacific" else "new_world")
        L = [f"# {p['name']} (`{pid}`) — 지상전·탐험 배경", "",
             f"- 문화권 {c['ko']} · 기후 {wk} · 지역 `{reg}` · 근처 해역 `{port_sea[pid][0]}`",
             f"- 식생: {veg} · 땅: {soil} · 분위기: {mood} · 파티클: {fx}",
             f"- 적 복장: {ENEMY_DRESS.get(reg, ENEMY_DRESS['europe'])}",
             f"- 원경: {c['ko']} 양식 마을/항구 실루엣({p['name']}), 상징물 `docs/ports/{pid}.md` 참고", ""]
        lst = by_port.get(pid, [])
        if lst:
            L += ["## 탐험 지점별 배경", "", "| 지점 | 지형 | 근경 | 중경 | 원경 |", "|---|---|---|---|---|"]
            for site_id, sname in lst:
                biome = next((b for b in FIELD_BIOMES if any(w in sname for w in b[1])), FIELD_BIOMES[1])
                L.append(f"| {sname} (`{site_id}`) | {biome[0]} — {biome[2]} | {biome[3].split(',')[0]}, 풀·돌({soil}) | {biome[3]} ({veg}) | {p['name']} 실루엣·산/해안 |")
                asset(f"field_{site_id}", "field", f"Field battle backdrop set for '{sname}' near {p['name']}: {biome[2]} with {biome[3]}; vegetation {veg}; ground {soil}; {c['ko']} architecture accents.", f"{sname} 지상 배경")
        else:
            L += ["## 탐험 지점", "", "- 등록된 지점 없음 → 항구 근교 기본 배경(평원·해안 혼합) 사용", ""]
        L += ["", "## 공통 지시", "", "- 나무·덤불: 단색 금지, 잎·줄기·그늘 색 구분 + 기후 색.",
              "- 지형 높낮이: 전투 원 바깥에 언덕·절벽으로 테두리(평평한 바닥만 금지).",
              "- 빛: 측광 그림자, 원경만 안개. 날씨 파티클 모바일 절반.", ""]
        open(os.path.join(OUT, "field", pid + ".md"), "w", encoding="utf-8").write("\n".join(L))

    # 퀘스트 → 배경
    q = read("Quests.luau")
    Q = ["# 퀘스트·작전별 배경 지정표", "", "| 퀘스트/작전 | 종류 | 배경 |", "|---|---|---|"]
    for m in re.finditer(r'\{ id = "([a-z_0-9]+)", name = "([^"]+)", summary = "([^"]+)", kind = "(field|war_clear|win|landmark|duel_leader|choice)"([^\n]*)', q):
        qid, qname, summ, kind, rest = m.groups()
        reg = re.search(r'regionId = "([a-z_]+)"', rest)
        if kind == "war_clear" and reg:
            seas = [s[0] for s in SEAS if s[2] == reg.group(1)]
            bg = f"해역별 함대전: {', '.join('naval/' + x + '.md' for x in seas[:4])} 중 전투 위치 해역"
        elif kind == "win":
            bg = "현재 위치 해역의 해적 사냥 변형(naval/<해역>.md · pirate). 북해 계열 퀘스트는 north_sea"
        elif kind == "field":
            bg = "탐험 지점의 field/<항구>.md (지점 행). 학자 퀘스트는 기관 정원(archive) 배경"
        else:
            bg = "항구 원경 + 상징물(docs/ports/<항구>.md)"
        Q.append(f"| {qname} (`{qid}`) | {kind} | {bg} |")
    battle = read(os.path.join("..", "..", "ServerScriptService", "Services", "Battle.luau")) if False else open(os.path.join(ROOT, "src", "ServerScriptService", "Services", "Battle.luau"), encoding="utf-8").read()
    for wid, wname in re.findall(r'\{ id = "((?:war_[a-z_]+)|blockade|convoy_raid|fleet_decisive)",(?: region = "[a-z_]+",)? name = "([^"]+)"', battle):
        kind = {"blockade": "blockade", "convoy_raid": "convoy", "fleet_decisive": "decisive"}.get(wid, "regional")
        Q.append(f"| {wname} (`{wid}`) | 함대전 | 전투 위치 해역의 `{kind}` 변형 |")
    Q += ["", "- 이야기 함대전(`questOnly`)·지도자 대결 퀘스트는 이야기 데이터에 `backdrop = \"<해역 id 또는 지점 id>\"`를 함께 적는다(StoryKit 연결 예정).", ""]
    open(os.path.join(OUT, "quests.md"), "w", encoding="utf-8").write("\n".join(Q))

    with open(os.path.join(OUT, "backdrop_prompts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["asset_id", "category", "prompt_en", "notes_ko"])
        w.writerows(rows)
    print(f"seas={len(SEAS)} field_ports={len(ports)} sites={len(sites)} prompts={len(rows)}")


if __name__ == "__main__":
    main()
