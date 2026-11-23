#!/usr/bin/env python3
"""모든 항구(181곳) 테마·왕궁·발전도별 방문 건물 지시서 생성기.

출력
- docs/ports/<port_id>.md        항구별 ChatGPT 작업 지시서 (테마·왕궁/관저·단계별 방문 건물·외형·내부·프롬프트)
- docs/ports/README.md           전체 목록(문화권·테마·왕궁 여부)
- docs/port_asset_prompts_all.csv 전 항구 에셋 프롬프트(가공 목표)
데이터 출처: src/ReplicatedStorage/Shared/{Ports,PortCultures,Facilities,PortIdentity}.luau
시작 항구 15곳은 tools/gen_port_asset_prompts.py 의 상세 값을 우선 쓴다.
"""
import csv
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
SHARED = os.path.join(ROOT, "src", "ReplicatedStorage", "Shared")
sys.path.insert(0, HERE)
import gen_port_asset_prompts as curated  # noqa: E402

COMMON = curated.COMMON + ("Derive from an approved original CC0 asset (Kenney Castle/Fantasy Town/Pirate kits etc.) "
                           "and modify it to match this brief; record the source asset in <asset_id>.license.json as derived. ")

# ── 데이터 읽기 ──────────────────────────────────────────────────────────────

def read(name):
    return open(os.path.join(SHARED, name), encoding="utf-8").read()


def load_ports():
    src = read("Ports.luau")
    ports = {}
    for m in re.finditer(r'id = "([a-z_]+)", name = "([^"]+)", country = "([a-z_]+)", lat = (-?[\d.]+), lon = (-?[\d.]+)', src):
        pid, name, country, lat, lon = m.groups()
        tail = src[m.end():m.end() + 1600]
        prod = re.search(r'produces = \{([^}]*)\}', tail)
        yard = re.search(r'shipyard = (true|false)', tail)
        ports[pid] = dict(id=pid, name=name, country=country, lat=float(lat), lon=float(lon),
                          produces=[g.strip().strip('"') for g in (prod.group(1).split(",") if prod else []) if g.strip()],
                          shipyard=bool(yard and yard.group(1) == "true"))
    return ports


def load_cultures():
    src = read("PortCultures.luau")
    i = src.index("local REGION = {")
    j = src.index("\n}", i)
    cult = dict(re.findall(r'([a-z_]+) = "([a-z_]+)"', src[i:j]))
    k = src.index("for key, list in {", j)
    end = src.index("} do", k)
    for key, body in re.findall(r'([a-z_]+) = \{([^}]*)\}', src[k:end]):
        for pid in re.findall(r'"([a-z_]+)"', body):
            cult[pid] = key
    return cult


def load_facilities():
    src = read("Facilities.luau")
    fac = {}
    for kind in ("bank", "guild", "harbormaster", "palace"):
        m = re.search(kind + r' = \{([^}]*)\}', src)
        fac[kind] = set(re.findall(r'"([a-z_]+)"', m.group(1))) if m else set()
    names = dict(re.findall(r'([a-z_]+) = "([^"]+)"', src[src.index("PALACE_NAMES"):src.index("}", src.index("PALACE_NAMES"))]))
    return fac, names


# ── 문화권 테마 ──────────────────────────────────────────────────────────────
# arch: 건축 프롬프트 / roof·wall / lamp / plaza / street(1~5) / landmark(문화권 기본 상징) / gov(총독 관저 양식)
CULT = {
    "britain": dict(ko="잉글랜드·스코틀랜드", arch="English brick and timber-framed townhouses, slate gables, tall chimneys, sash windows",
                    roof="gable", wall="brick", lamp="oil_lantern", plaza="market", street=["dirt", "gravel", "cobble", "cobble", "paved"],
                    landmark="Gothic parish church tower with clock", gov="Georgian brick governor's house with portico"),
    "brick": dict(ko="네덜란드·플랑드르", arch="Dutch/Flemish brick canal houses, stepped and bell gables, white window frames, hoist beams",
                  roof="gable", wall="brick", lamp="oil_lantern", plaza="quay", street=["plank", "brick", "brick", "brick", "paved"],
                  landmark="brick belfry tower over a cloth hall", gov="Dutch brick stadholder's residence with formal garden"),
    "hanse": dict(ko="한자 도시(북독일·발트)", arch="Hanseatic brick Gothic gabled merchant houses, tall decorated gables, warehouses",
                  roof="gable", wall="brick", lamp="oil_lantern", plaza="market", street=["dirt", "cobble", "cobble", "cobble", "paved"],
                  landmark="brick Gothic city gate (Holstentor-style) with twin towers", gov="brick Gothic town hall with arcades"),
    "nordic": dict(ko="스칸디나비아", arch="Scandinavian painted wooden houses (falu red, ochre, white trim), steep roofs, some turf roofs",
                   roof="gable", wall="wood", lamp="oil_lantern", plaza="quay", street=["dirt", "gravel", "gravel", "cobble", "paved"],
                   landmark="tall wooden stave-style church or copper-spired tower", gov="Baroque plastered royal residence with copper roof"),
    "stone": dict(ko="발트·러시아·스코틀랜드 석조", arch="grey stone and plastered houses, steep roofs, small windows, Baltic/Russian accents",
                  roof="hip", wall="stone", lamp="oil_lantern", plaza="parade", street=["dirt", "gravel", "cobble", "flagstone", "paved"],
                  landmark="stone fortress tower with onion or needle spire", gov="Baroque stone palace with colonnade"),
    "france": dict(ko="프랑스", arch="French stone and half-timbered houses, mansard and slate roofs, wrought-iron balconies",
                   roof="hip", wall="stone", lamp="oil_lantern", plaza="fountain", street=["dirt", "gravel", "cobble", "flagstone", "paved"],
                   landmark="Gothic cathedral spire or Vauban star fort", gov="French classical hôtel with mansard roof and courtyard"),
    "iberia": dict(ko="이베리아", arch="whitewashed and ochre stucco houses, hip tile roofs, iron window grilles, inner patios, azulejo accents",
                   roof="hip", wall="stucco", lamp="oil_lantern", plaza="fountain", street=["dirt", "gravel", "cobble", "flagstone", "paved"],
                   landmark="bell tower over a cathedral or Moorish-era fortress", gov="Iberian palace with arcaded patio and tiled fountain"),
    "italy": dict(ko="이탈리아·아드리아", arch="Italian stucco palazzi in warm ochre/pink, arched windows, loggias, terracotta hip roofs",
                  roof="hip", wall="stucco", lamp="oil_lantern", plaza="fountain", street=["dirt", "flagstone", "flagstone", "flagstone", "flagstone"],
                  landmark="brick campanile beside a domed church", gov="Renaissance palazzo with rusticated ground floor"),
    "med": dict(ko="지중해", arch="Mediterranean whitewashed houses, flat or low tile roofs, blue shutters, courtyards",
                roof="flat", wall="stucco", lamp="oil_lantern", plaza="fountain", street=["dirt", "gravel", "flagstone", "flagstone", "paved"],
                landmark="hilltop chapel with bell gable", gov="whitewashed governor's palace with arcade"),
    "desert": dict(ko="북아프리카·레반트", arch="adobe and stone houses, flat roofs, inner courtyards, horseshoe arches, wooden lattice windows",
                   roof="flat", wall="adobe", lamp="mosque_lamp", plaza="market", street=["sand", "dirt", "gravel", "flagstone", "flagstone"],
                   landmark="mosque with square minaret and courtyard", gov="kasbah palace with crenellated walls and riad garden"),
    "ottoman": dict(ko="오스만", arch="Ottoman houses with stone ground floor, projecting timber upper floor, lattice windows, red tile roofs",
                    roof="dome", wall="stone", lamp="mosque_lamp", plaza="temple_court", street=["dirt", "gravel", "cobble", "flagstone", "flagstone"],
                    landmark="domed mosque with slender pencil minarets", gov="Ottoman pasha's konak with kiosk pavilions"),
    "swahili": dict(ko="스와힐리·아라비아 해안", arch="coral-stone whitewashed houses, flat roofs, carved wooden doors, timber balconies",
                    roof="flat", wall="coral", lamp="oil_lantern", plaza="quay", street=["sand", "sand", "gravel", "flagstone", "flagstone"],
                    landmark="coral-stone mosque with mihrab and simple minaret", gov="sultan's coral-stone palace with veranda"),
    "malabar": dict(ko="인도 해안(말라바르·코로만델·벵골)", arch="Indian coastal houses, laterite/plaster walls, steep tiled roofs, deep eaves, carved wood",
                    roof="eave", wall="plaster", lamp="oil_lantern", plaza="market", street=["red_earth", "red_earth", "gravel", "flagstone", "paved"],
                    landmark="Hindu temple gateway with tiered roof or Indo-Islamic domed tomb", gov="Indo-Islamic palace with jharokha balconies"),
    "japan": dict(ko="일본", arch="Edo-period wooden machiya, tiled eaves, white plaster storehouses, lattice fronts",
                  roof="eave", wall="wood", lamp="stone_lantern", plaza="quay", street=["dirt", "gravel", "gravel", "flagstone", "flagstone"],
                  landmark="castle keep (tenshu) on stone base or pagoda", gov="daimyo residence with gate and garden"),
    "korea": dict(ko="조선", arch="Joseon giwa tiled-roof houses with curved eaves, plaster walls, stone fences, thatched outskirts",
                  roof="eave", wall="plaster", lamp="paper_lantern", plaza="market", street=["dirt", "dirt", "gravel", "flagstone", "flagstone"],
                  landmark="fortress gate pavilion on stone wall", gov="Joseon magistrate's office compound (gwanah)"),
    "china": dict(ko="중국 해안", arch="southern Chinese grey-brick houses, curved tiled eaves, lattice windows, courtyard walls",
                  roof="eave", wall="brick", lamp="paper_lantern", plaza="quay", street=["dirt", "gravel", "flagstone", "flagstone", "paved"],
                  landmark="multi-storey pagoda or city gate tower", gov="Qing yamen (government office) with courtyards"),
    "seasia": dict(ko="동남아", arch="stilted wooden houses, steep thatch or tile roofs, carved gables, palm groves",
                   roof="thatch", wall="wood", lamp="paper_lantern", plaza="market", street=["mud", "dirt", "gravel", "plank", "paved"],
                   landmark="stupa/pagoda or tiered-roof royal hall", gov="tiered-roof royal audience hall on stilts"),
    "pacific": dict(ko="태평양·오세아니아", arch="timber and thatch houses on platforms, colonial weatherboard cottages later",
                    roof="thatch", wall="wood", lamp="torch", plaza="quay", street=["sand", "sand", "gravel", "plank", "paved"],
                    landmark="great meeting house with carved posts", gov="weatherboard colonial residence with veranda"),
    "wafrica": dict(ko="서아프리카", arch="mud-brick houses with flat or thatched roofs, decorated walls, compounds; European forts on the coast",
                    roof="thatch", wall="adobe", lamp="torch", plaza="market", street=["red_earth", "red_earth", "gravel", "flagstone", "paved"],
                    landmark="mud-brick mosque with wooden torons or coastal castle", gov="whitewashed coastal castle residence"),
    "colonial": dict(ko="스페인·포르투갈 식민지", arch="Spanish/Portuguese colonial stucco houses, flat roofs, wrought-iron balconies, patios, arcades",
                     roof="flat", wall="stucco", lamp="oil_lantern", plaza="parade", street=["sand", "dirt", "gravel", "cobble", "paved"],
                     landmark="Baroque colonial cathedral facade with twin towers", gov="viceregal palace with arcade on the plaza de armas"),
    "creole": dict(ko="카리브·북미 해안", arch="creole and Georgian timber houses, verandas, louvered shutters, pastel colors",
                   roof="hip", wall="wood", lamp="oil_lantern", plaza="parade", street=["sand", "dirt", "gravel", "brick", "paved"],
                   landmark="coastal stone fort with signal tower", gov="Georgian governor's mansion with two-storey veranda"),
    "tropic": dict(ko="열대 교역지", arch="timber and plaster trading houses with verandas, palm-thatch outbuildings",
                   roof="hip", wall="plaster", lamp="oil_lantern", plaza="quay", street=["sand", "dirt", "gravel", "plank", "paved"],
                   landmark="trading-post fort with flag tower", gov="colonial residence with deep veranda"),
}

CLIMATE = [(23.5, "열대", "tropical palms, heavy rain, deep green foliage"),
           (40, "온대 남부(지중해형)", "olive and cypress, dry summers"),
           (55, "온대 북부", "oak and beech, frequent rain"),
           (90, "한대", "pine and birch, snow in winter")]

THEME_BY_GOODS = [
    ({"spice", "pepper", "cloves", "cinnamon", "nutmeg", "saffron"}, "향신료 항구", "spice warehouses and sorting yards"),
    ({"silver", "gold", "copper", "tin", "iron", "coal", "gems"}, "광산·금속 항구", "ore wharf, smelters and mint"),
    ({"fish", "whale_oil", "salt", "amber"}, "어업·염장 항구", "fish market hall, drying racks and salt works"),
    ({"silk", "cloth", "cotton", "wool", "carpet"}, "직물 항구", "weaving workshops, dye works and cloth hall"),
    ({"tea", "coffee", "cocoa", "sugar", "vanilla"}, "플랜테이션·기호품 항구", "plantation storehouses, roasting and boiling houses"),
    ({"porcelain", "glass", "lacquer"}, "공예 항구", "kilns, glass furnaces and craft streets"),
    ({"timber", "mahogany", "logwood", "brazilwood"}, "목재·조선 항구", "log ponds, sawmills and shipyards"),
    ({"wine", "beer", "olive_oil", "cheese", "rice", "grain", "dates"}, "농산물 항구", "granaries, presses and market halls"),
    ({"ivory", "pearls", "ambergris", "coral"}, "진귀품 항구", "treasure counting houses and guarded storerooms"),
]

PALACE = {  # 왕궁(실존 시설 9+1)
    "london": ("잉글랜드 왕궁", "Tudor-Jacobean red-brick riverside palace with octagonal towers, great hall, gatehouse (Whitehall/Hampton style)",
               ["알현실(옥좌·태피스트리)", "추밀원 회의실", "왕실 예배당", "강변 계단 선착장"]),
    "amsterdam": ("총독 관저", "Dutch classical stone town hall-palace with central cupola and pediment (Paleis op de Dam style)",
                  ["시민 대강당(대리석 바닥 세계지도)", "총독 집무실", "금고", "시계탑 큐폴라"]),
    "copenhagen": ("덴마크 왕궁", "Danish Renaissance red-brick palace with copper spires and moat (Rosenborg/Frederiksborg style)",
                   ["기사의 홀", "왕관 보물실", "해군 지도실", "해자 다리"]),
    "stockholm": ("스웨덴 왕궁", "massive Baroque square palace in ochre stone around a courtyard, on the waterfront",
                  ["국가 홀", "왕실 무기고", "해군 사령부", "의장 광장"]),
    "st_petersburg": ("러시아 황궁", "Russian Baroque riverside palace in pale green and white with gilded details and long facade",
                      ["황금 알현실", "대사 계단", "해군 본부 회랑", "네바강 선착장"]),
    "istanbul": ("술탄의 궁전", "Ottoman palace complex on a promontory: gate of salutation, courtyards, domed kiosks, harem towers (Topkapı style)",
                 ["디반(국정 회의실)", "알현 정자", "보물고", "제국 주방 굴뚝 줄"]),
    "venice": ("총독궁", "Venetian Gothic doge's palace: pink-white diamond-pattern facade over open double arcades",
               ["대평의회실", "10인 위원회실", "탄식의 다리 감옥", "부두 계단"]),
    "lisbon": ("포르투갈 왕궁", "Manueline/Baroque riverside royal palace with arcaded terreiro square facing the Tagus",
               ["알현실", "인도청(향신료 관청)", "왕실 도서관", "강변 광장"]),
    "seville": ("스페인 궁정", "Mudéjar royal Alcázar with tiled courtyards, horseshoe arches, water gardens",
                ["대사의 방(금빛 돔)", "인도 무역원 사무실", "정원 연못", "타일 회랑"]),
    "naples": ("나폴리 왕궁", "Italian Baroque royal palace with long red-and-grey facade and statue niches facing a great piazza",
               ["옥좌실", "왕실 극장", "근위대 계단", "바다 테라스"]),
}

# 방문 가능 건물(게임 시설) 정의: 탭·기능·단계별 외형 크기
BUILDINGS = [
    ("trade", "교역소", "상품 매입·판매, 시세 비교", 1,
     ["open-air trading post with awning and scales", "covered market hall with arcades", "grand merchant exchange with columns and clock"]),
    ("tavern", "주점", "동료 영입, 소문·의뢰, 카드 대결", 1,
     ["small tavern shack with hanging sign", "two-storey inn with stable yard", "grand inn with balconies and courtyard"]),
    ("harbor", "항만청", "출항·항로·지도, 입항세", 1,
     ["dock office hut beside the pier", "customs house with flag", "admiralty building with signal mast and arcade"]),
    ("yard", "조선소", "배 구매·개조·수리·보급 (조선소 있는 항구만)", 1,
     ["open slipway with timber shed", "covered slipways with rope walk", "dry dock arsenal with cranes and warehouses"]),
    ("scholar", "학자의 서재", "지식 보고·연구·백과", 2,
     ["scribe's room in a townhouse", "library with reading hall", "academy with observatory dome"]),
    ("battle", "전투 본부", "해적 사냥·함대전·지상 탐험·카드 대결", 2,
     ["watch post with palisade", "barracks with drill yard", "naval command fortress with bastions"]),
    ("diplomacy", "외교관 거처", "나라 정세·관계·선물·개입", 3,
     ["consul's house with national flags", "consulate with walled garden", "embassy quarter with several flag houses"]),
    ("bank", "은행", "예금·대출·투자 (3단계부터 또는 지정 항구)", 3,
     ["money changer's counting house", "stone bank with vault", "exchange bank with trading floor"]),
    ("guild", "상인 길드", "운송 계약 (지정 항구)", 3,
     ["guild hall with carved sign", "guild hall with meeting hall", "grand guild hall with tower"]),
    ("palace", "왕궁·총독 관저", "알현·작위 (왕궁 도시 또는 5단계 관저)", 5,
     ["governor's residence", "governor's residence", "governor's residence"]),
]


INTERIOR = {
    "trade": "저울·장부 책상·견본 상품 선반·시세 칠판(그림), 특산물 견본 진열, 거래 상인 2명",
    "tavern": "긴 나무 탁자·술통 카운터·벽난로/화덕·소문 게시판·카드 탁자, 2층 숙소 계단",
    "harbor": "대형 해도 탁자·항로 지도 벽·입항 장부·나침반 진열·창밖 부두 전망",
    "yard": "건조 중인 선체 골조·밧줄 더미·돛천 작업대·대포 진열·목재 적치",
    "scholar": "책장 벽·지구의·천체 관측기구·표본 상자·보고서 책상, 5단계 관측 돔",
    "battle": "무기 거치대·작전 지도 탁자·훈련장 허수아비·함대 모형·카드 대결 탁자",
    "diplomacy": "여러 나라 깃발·선물 진열장·협상 탁자·국력 순위 게시판",
    "bank": "금고 문·환전 카운터·주화 저울·대출 장부·경비병",
    "guild": "계약 게시판·길드 문장 벽걸이·운송 견본 상자·회의 탁자",
}


def climate_of(lat):
    a = abs(lat)
    for limit, ko, en in CLIMATE:
        if a <= limit:
            return ko, en
    return CLIMATE[-1][1], CLIMATE[-1][2]


def theme_of(goods):
    best, score = ("종합 교역 항구", "mixed warehouses and a busy market"), 0
    for keys, ko, en in THEME_BY_GOODS:
        s = len(keys & set(goods))
        if s > score:
            best, score = (ko, en), s
    return best


def tier_label(t):
    return ["", "1 개척", "2 마을", "3 읍", "4 도시", "5 대도시"][t]


# ── 문서 생성 ────────────────────────────────────────────────────────────────

def brief(p, culture, fac, palace_names, cur):
    c = CULT.get(culture, CULT["tropic"])
    clim_ko, clim_en = climate_of(p["lat"])
    theme_ko, theme_en = theme_of(p["produces"])
    goods = p["produces"] or ["mixed goods"]
    cur_spec = cur.get(p["id"])
    arch = cur_spec[2] if cur_spec else c["arch"]
    landmark = cur_spec[3] if cur_spec else c["landmark"]
    has_palace = p["id"] in fac["palace"] or p["id"] in PALACE
    pal_name, pal_style, pal_rooms = PALACE.get(p["id"], (palace_names.get(p["id"], "총독 관저"), c["gov"],
                                                         ["집무실", "알현실", "문서고", "정원"]))
    rows, lines = [], []
    pid, name = p["id"], p["name"]

    def asset(aid, cat, tier, size, tris, prompt, note):
        rows.append([pid, name, f"{pid}_{aid}", cat, tier, size, tris, COMMON + prompt, note])
        lines.extend([f"#### `{pid}_{aid}` — {note}", f"- {cat} · {tier}단계 · 크기 {size} · 폴리곤 ≤ {tris}", "```", COMMON + prompt, "```", ""])

    head = [f"# {name} ({pid}) — 항구 작업 지시서", "",
            "> 공통 규칙: `docs/RULES.md`(원본 가공·라이선스·코드 한도) → `docs/PORT_VILLAGE_PROMPTS.md`. 이 문서만으로 이 항구의 테마·왕궁·방문 건물을 만든다.", "",
            "## 1. 항구 테마", "", "| 항목 | 값 |", "|---|---|",
            f"| 문화권 | {c['ko']} (`{culture}`) |", f"| 나라 | {p['country']} |",
            f"| 기후 | {clim_ko} — {clim_en} |", f"| 테마 | **{theme_ko}** — {theme_en} |",
            f"| 특산물 | {', '.join(goods)} |", f"| 건축 | {arch} |",
            f"| 지붕·벽 | {c['roof']} · {c['wall']} |", f"| 광장 | {c['plaza']} |",
            f"| 길 1→5단계 | {' → '.join(c['street'])} |", f"| 밤 조명 | {c['lamp']} |",
            f"| 상징물 | {landmark} (2단계 공사 중 → 4단계 완성) |",
            f"| 조선소 | {'있음' if p['shipyard'] else '없음(응급 수리만)'} |",
            f"| 왕궁 | {'**' + pal_name + '** (처음부터)' if has_palace else '없음 → 5단계에 총독 관저'} |", ""]
    lines.extend(head)
    lines += ["## 2. 발전도별 마을", "", "| 단계 | 마을 모습 | 새로 방문 가능 |", "|---|---|---|"]
    for t in range(1, 6):
        new = [b[1] for b in BUILDINGS if b[3] == t and (b[0] != "yard" or p["shipyard"])
               and (b[0] != "guild" or pid in fac["guild"]) and (b[0] != "palace" or True)]
        if t == 1 and has_palace:
            new.append(pal_name)
        if t == 5 and not has_palace:
            new = [n if n != "왕궁·총독 관저" else "총독 관저" for n in new]
        elif t == 5:
            new = [n for n in new if n != "왕궁·총독 관저"]
        look = ["오두막 6채·흙길·횃불, 부두 옆 교역소·주점·항만청",
                f"광장({c['plaza']})·상징물 기초, 집 10채, 큰길 {c['street'][1]}",
                f"시장·종교·주거·공방 구역 분리, {theme_ko} 특색 공방, 가로등 3칸마다",
                f"상징물 완성, 2층 상점 주택, 창고 마당, 길 {c['street'][3]}, 가로등 2칸마다",
                f"3층 주택·외곽 구역, 길 {c['street'][4]}, 모든 길 가로등, 농촌 가공소"][t - 1]
        lines.append(f"| {tier_label(t)} | {look} | {', '.join(new) if new else '-'} |")
    lines += ["", "## 3. 방문 가능 건물 (외형·내부·기능)", ""]
    for key, ko, func, open_t, looks in BUILDINGS:
        if key == "yard" and not p["shipyard"]:
            continue
        if key == "guild" and pid not in fac["guild"]:
            continue
        if key == "palace":
            continue
        lines += [f"### {ko} — {open_t}단계부터", f"- 기능: {func}",
                  f"- 외형 단계: ① {looks[0]} → ③ {looks[1]} → ⑤ {looks[2]} (모두 {c['ko']} 양식)",
                  f"- 내부: {INTERIOR.get(key, '')} — {c['ko']} 실내 양식(바닥·조명 {c['lamp']})",
                  f"- 단계 변화: ① 작은 1칸 → ③ 2~3칸·직원 증가 → ⑤ 넓은 홀·장식·{theme_ko} 상징 소품",
                  "- 밤: 창문 불빛·입구 등. 간판은 글자 없이 기능 그림", ""]
        for i, tier in enumerate((open_t, max(open_t, 3), 5)):
            asset(f"{key}_{i + 1}", "building", tier, "24x20x(12-26)", "12k",
                  f"{looks[i]}, a visitable {ko} building for a port game, built in local style: {arch}. Clear door, readable sign shape (no text).",
                  f"{ko} 외형 {i + 1}단계")
    lines += [f"### {pal_name if has_palace else '총독 관저'} — {'처음부터' if has_palace else '5단계'}",
              "- 기능: 알현·작위·국가 의뢰", f"- 외형: {pal_style}",
              f"- 내부 방: {', '.join(pal_rooms)}", "- 크기: 마을 건물의 3~4배, 단 마을을 가리지 않게 마을 뒤쪽 언덕·물가에 둔다", ""]
    asset("palace", "palace", 1 if has_palace else 5, "80x60x40", "40k",
          f"{pal_style}. Royal/governor seat of {name}, grand but game-readable, with a ceremonial entrance and courtyard.",
          (pal_name if has_palace else "총독 관저") + " 외형")
    lines += ["## 4. 마을 에셋", ""]
    asset("landmark_base", "landmark", 2, "40x40x30", "15k", f"Under-construction {landmark}: lower half built, scaffolding, cranes, stone blocks.", "상징물 공사 중")
    asset("landmark_full", "landmark", 4, "40x40x70", "25k", f"Completed {landmark}, signature landmark of {name}.", "상징물 완성")
    for i, (t, fl, ex) in enumerate([(1, "1-storey", "humble, small yard"), (3, "2-storey", "shop on ground floor"), (5, "3-storey", "wealthy merchant house")], 1):
        asset(f"house_{i}", "house", t, "16x14x(12-26)", "6k", f"{fl} {arch}, {ex}. 3 colour-variant material slots.", f"주택 {i}단계")
    asset("street_lamp", "lamp", 3, "2x2x12", "1.5k", curated.LAMP.get(c["lamp"], curated.LAMP["oil_lantern"]) + ", emissive glass slot.", "가로등")
    for g in goods[:4]:
        if g in curated.GOOD_PROPS:
            asset(f"stall_{g}", "goods", 2, "8x5x6", "3k", f"Market stall displaying {curated.GOOD_PROPS[g]}, style: {arch}.", f"가판대 {g}")
        if g in curated.WORKSHOP:
            asset(f"workshop_{g}", "workshop", 3, "24x20x16", "10k", f"{curated.WORKSHOP[g]}, built in local style: {arch}.", f"공방 {g}")
    lines += ["## 5. 완료 체크", "", "- [ ] 에셋 `assets/inbox/Town/<asset_id>.glb` + `.license.json`(원본·derived)",
              "- [ ] 단계 1~5 Studio 항공 사진: 구역 분리·광장·상징물·방문 건물 위치", "- [ ] `tests/run.sh` 통과(코드 한도 포함)", ""]
    return "\n".join(lines), rows, dict(theme=theme_ko, culture=c["ko"], palace=pal_name if has_palace else "")


def main():
    ports = load_ports()
    cult = load_cultures()
    fac, palace_names = load_facilities()
    cur = {spec[0]: spec for spec in curated.PORTS}
    out_dir = os.path.join(ROOT, "docs", "ports")
    os.makedirs(out_dir, exist_ok=True)
    all_rows, index = [], []
    for pid in sorted(ports):
        p = ports[pid]
        md, rows, meta = brief(p, cult.get(pid, "tropic"), fac, palace_names, cur)
        with open(os.path.join(out_dir, pid + ".md"), "w", encoding="utf-8") as f:
            f.write(md)
        all_rows += rows
        index.append((pid, p["name"], meta["culture"], meta["theme"], meta["palace"]))
    with open(os.path.join(out_dir, "README.md"), "w", encoding="utf-8") as f:
        f.write("# 항구 작업 지시서 목록\n\n전체 " + str(len(index)) + "곳. 생성기: `python3 tools/gen_port_briefs_all.py`\n\n| 항구 | 문화권 | 테마 | 왕궁 |\n|---|---|---|---|\n")
        for pid, name, cu, th, pal in index:
            f.write(f"| [{name}]({pid}.md) | {cu} | {th} | {pal} |\n")
    with open(os.path.join(ROOT, "docs", "port_asset_prompts_all.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["port_id", "port", "asset_id", "category", "tier", "size_studs", "tris", "prompt_en", "notes_ko"])
        w.writerows(all_rows)
    print(f"{len(index)} briefs, {len(all_rows)} asset prompts")


if __name__ == "__main__":
    main()
