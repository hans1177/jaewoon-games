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


# ── 건축 시뮬레이션: 단계별 건물 카탈로그 ─────────────────────────────────────
# (id, 이름, 분류, 개방 단계, 조건, 영어 형태, 마을 효과(시뮬 설명))
# 조건: None | "coast" | "shipyard" | "goods:<a,b>" | "cold" | "warm" | "palace"
CATALOG = [
    ("hut", "오두막", "주거", 1, None, "one-room hut with chimney and fenced yard", "인구 +2"),
    ("well", "우물", "공공", 1, None, "stone well with wooden winch roof", "주민 행복 +, 화재 진압"),
    ("dock_shed", "부두 창고", "항만", 1, "coast", "small wooden dock shed with crates", "하역 속도 +"),
    ("fish_rack", "어망 건조대", "생산", 1, "goods:fish,whale_oil,salt,amber", "fish drying racks and net poles", "식량 +"),
    ("garden", "텃밭", "농업", 1, None, "fenced vegetable plots with scarecrow", "식량 +"),
    ("chapel", "작은 예배소", "종교", 1, None, "small shrine/chapel in local faith style", "신앙 +"),
    ("house_row", "연립 주택", "주거", 2, None, "row of two-storey townhouses sharing walls", "인구 +6"),
    ("bakery", "빵집·화덕", "식량", 2, None, "bakery with brick oven chimney and bread rack", "식량 가공 +"),
    ("smithy", "대장간", "공방", 2, None, "smithy with open forge, anvil and bellows", "도구·무기 +"),
    ("carpenter", "목공소", "공방", 2, None, "carpenter's workshop with timber stacks and saw horse", "건설 속도 +"),
    ("granary", "곡물 창고", "저장", 2, None, "raised granary on stone legs", "흉년 대비 +"),
    ("mill", "방앗간", "생산", 2, None, "watermill or windmill depending on terrain", "곡물 가공 +"),
    ("market_stalls", "장터", "상업", 2, None, "cluster of canopy market stalls around a small square", "교역 +"),
    ("watchtower", "망루", "방어", 2, "coast", "wooden coastal watchtower with signal brazier", "해적 경계 +"),
    ("temple", "성당·사원", "종교", 3, None, "main temple/church/mosque of the local faith", "신앙·명성 +"),
    ("school", "학당", "교육", 3, None, "schoolhouse with bell and courtyard", "연구 +"),
    ("infirmary", "의원·병원", "의료", 3, None, "infirmary with herb garden and beds", "질병 감소"),
    ("warehouse", "대형 창고", "저장", 3, None, "large stone warehouse with hoist beam and cart door", "재고 한도 +"),
    ("ropewalk", "밧줄 공장", "조선", 3, "shipyard", "long narrow ropewalk shed", "배 수리비 -"),
    ("brewery", "양조장", "식량", 3, "goods:beer,wine,rice,grain,sugar", "brewery/winery with vats and casks", "주민 만족 +"),
    ("tannery", "무두질장", "공방", 3, "goods:leather,wool", "tannery with soaking pits and hanging hides (on outskirts)", "가죽 +"),
    ("bathhouse", "공중목욕탕", "공공", 3, "warm", "public bathhouse with domes or tiled roof", "위생 +"),
    ("lighthouse", "등대", "항만", 3, "coast", "stone lighthouse with lantern room", "야간 입항 안전"),
    ("town_hall", "시청·관아", "행정", 4, None, "town hall / magistrate office with clock or drum tower", "세금·질서 +"),
    ("hospital", "대병원", "의료", 4, None, "large hospital around a cloister", "질병 크게 감소"),
    ("library", "도서관", "교육", 4, None, "library with reading hall and tall windows", "연구 ++"),
    ("customs", "세관", "항만", 4, "coast", "customs house with arcade facing the quay", "관세 수입 +"),
    ("fort_wall", "성벽·포대", "방어", 4, "coast", "stone harbour walls with gun battery and gate", "해적·전쟁 방어"),
    ("theater", "극장", "문화", 4, None, "theatre / performance hall in local style", "명성·만족 +"),
    ("guild_row", "공방 거리", "공방", 4, None, "street of specialist workshops with signs", "특산물 가공 +"),
    ("university", "대학·학술원", "교육", 5, None, "university/academy with quadrangle and observatory dome", "연구 +++"),
    ("exchange", "증권거래소", "상업", 5, None, "stock exchange with courtyard and clock tower", "투자·주식"),
    ("arsenal", "해군 공창", "조선", 5, "shipyard", "naval arsenal with dry docks and cranes", "대형선 건조"),
    ("botanic", "식물원", "과학", 5, None, "botanical garden with glasshouse", "연구·명성 +"),
    ("opera", "오페라 극장·궁정 극장", "문화", 5, "palace", "grand opera house / court theatre", "명성 ++"),
    ("suburb", "외곽 신시가지", "주거", 5, None, "new suburb block with wider streets and gardens", "인구 +20"),
]

# 문화권별 공사 방식: (주재료, 공정 특징, 일꾼 복장/도구, 완공 의식)
BUILD_STYLE = {
    "britain": ("brick, oak timber, slate", "벽돌 쌓기와 목골조, 슬레이트 지붕 잇기", "앞치마·모자 차림 석공과 목수, 벽돌 운반 짐꾼", "지붕 위 나뭇가지 꽂기(상량식)·맥주 돌리기"),
    "brick": ("brick, timber piles", "말뚝 박기(간척지) → 벽돌 → 계단 박공", "나막신 신은 인부, 말뚝 해머", "박공 꼭대기 깃발 달기"),
    "hanse": ("brick, oak", "벽돌 고딕 박공 쌓기", "길드 표식 단 석공", "길드 깃발 행진"),
    "nordic": ("pine logs, turf, tar", "통나무 짜기 → 타르 칠 → 잔디 지붕", "털모자 목수, 도끼", "지붕 위 전나무 꽂기"),
    "stone": ("granite, lime plaster", "석재 다듬기와 회반죽 바르기", "털 외투 석공, 정과 망치", "성직자 축복"),
    "france": ("limestone, oak, slate", "석회암 블록 → 맨사드 지붕", "작업복 석공, 기중기 바퀴", "준공 축하 연회"),
    "iberia": ("stucco over brick, clay tile", "벽돌 → 회칠 → 기와, 타일 붙이기", "밀짚모자 인부, 회칠 붓", "성인 조각상 축복"),
    "italy": ("brick, travertine, terracotta", "벽돌 아치 → 회반죽 → 테라코타 지붕", "석공 길드, 나무 비계 탑", "종 울리기"),
    "med": ("whitewashed stone", "돌 쌓기 → 석회 흰칠", "맨머리 인부, 석회 통", "흰칠 마무리 잔치"),
    "desert": ("adobe mud brick, palm beams", "흙벽돌 틀 찍기 → 햇볕 건조 → 쌓기 → 흙 미장", "터번 인부, 벽돌 틀", "기도와 대추야자 나눔"),
    "ottoman": ("stone, timber upper floor, lead domes", "석조 1층 → 목조 돌출 2층 → 돔에 납판", "페즈 모자 석공, 목수", "희생 제물·기도"),
    "swahili": ("coral rag stone, lime, mangrove poles", "산호석 쌓기 → 맹그로브 들보 → 석회", "칸가 두른 인부, 맹그로브 장대", "북 연주와 축복"),
    "malabar": ("laterite blocks, teak, clay tile", "라테라이트 블록 → 티크 지붕틀 → 기와", "도티 차림 장인, 코끼리 목재 운반", "길일 택일·기름등 점화"),
    "japan": ("cedar/cypress timber, clay tile, plaster", "목조 짜맞춤(못 없음) → 상량 → 기와 → 흰 회벽", "핫피 입은 목수(다이쿠), 끌·대패", "상량식(조토시키) 떡 뿌리기"),
    "korea": ("pine timber, clay tile, mud plaster", "주춧돌 → 기둥·대들보 → 상량 → 기와 → 흙벽", "갓·두건 목수, 먹줄", "상량문 걸기·고사"),
    "china": ("grey brick, timber, glazed tile", "벽돌 담 → 목조 지붕틀 → 곡선 기와", "두건 장인, 대나무 비계", "폭죽과 붉은 천 달기"),
    "seasia": ("hardwood stilts, bamboo, thatch/tile", "기둥 세우기(고상) → 대나무 엮기 → 지붕", "사롱 인부, 대나무 비계", "승려 축복·꽃 공양"),
    "pacific": ("timber posts, pandanus thatch, coral lime", "기둥·서까래 묶기 → 이엉", "맨발 인부, 밧줄 묶기", "공동 연회"),
    "wafrica": ("mud brick, palm thatch, timber torons", "흙벽돌 → 흙 미장 → 이엉·나무 돌출목", "천 두른 인부, 흙 바구니", "북과 춤"),
    "colonial": ("stucco over stone, clay tile", "석재 → 회칠 → 철 발코니", "솜브레로 인부, 노새 수레", "사제 축복·종"),
    "creole": ("timber frame, weatherboard, shingles", "목조 골조 → 판자 → 베란다", "밀짚모자 목수", "준공 파티"),
    "tropic": ("timber, plaster, palm thatch", "목조 → 회벽 → 베란다", "밀짚모자 인부", "깃발 게양"),
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


FAITH = {  # 문화권별 예배소·대사원 이름(한글, 영어)
    "desert": ("작은 모스크", "대모스크", "small mosque with minaret", "great congregational mosque with courtyard"),
    "ottoman": ("작은 모스크", "대모스크", "small mosque with pencil minaret", "domed mosque complex with madrasa"),
    "swahili": ("산호석 모스크", "금요 모스크", "small coral-stone mosque", "Friday mosque with mihrab"),
    "malabar": ("작은 사원", "대사원", "small Hindu shrine", "large temple with gopuram and tank"),
    "japan": ("신사", "사원", "small Shinto shrine with torii", "Buddhist temple hall with pagoda"),
    "korea": ("서낭당", "향교·사찰", "village shrine with sacred tree", "Confucian school shrine and Buddhist temple"),
    "china": ("토지묘", "사원·문묘", "small earth-god shrine", "temple with pagoda and Confucian hall"),
    "seasia": ("작은 사당", "불탑 사원", "small spirit house", "stupa temple complex"),
    "pacific": ("작은 성소", "대회관·교회", "small sacred platform", "great meeting house / mission church"),
    "wafrica": ("작은 사당", "흙 모스크·교회", "small shrine", "mud-brick mosque or mission church"),
}


def faith_names(culture):
    return FAITH.get(culture, ("작은 예배당", "성당", "small chapel with bell", "stone church with bell tower"))


def catalog_ok(cond, p, has_palace):
    if cond is None:
        return True
    if cond == "coast":
        return True
    if cond == "shipyard":
        return p["shipyard"]
    if cond == "palace":
        return has_palace
    if cond == "warm":
        return abs(p["lat"]) < 45
    if cond == "cold":
        return abs(p["lat"]) >= 50
    if cond.startswith("goods:"):
        return bool(set(cond[6:].split(",")) & set(p["produces"]))
    return True


def construction_section(p, culture, c, has_palace, asset, lines):
    bs = BUILD_STYLE.get(culture, BUILD_STYLE["tropic"])
    lines += ["## 4. 건축 시뮬레이션 (단계별 건물 카탈로그)", "",
              "마을 경제 시뮬(인구·번영·자금)이 건설을 결정하면 아래 순서로 **공사 현장 → 완공**이 실제로 보인다. 단계가 오를수록 새 건물 종류가 열린다.", "",
              "| 단계 | 건물 | 분류 | 마을 효과 |", "|---|---|---|---|"]
    f1, f2, e1, e2 = faith_names(culture)
    local_cat = []
    for bid, ko, cat, tier, cond, en, eff in CATALOG:
        if bid == "chapel":
            ko, en = f1, e1
        elif bid == "temple":
            ko, en = f2, e2
        if catalog_ok(cond, p, has_palace):
            local_cat.append((bid, ko, cat, tier, en, eff))
            lines.append(f"| {tier} | {ko} | {cat} | {eff} |")
    lines += ["", f"### 공사 과정 ({c['ko']} 방식)", "",
              f"- 주재료: {bs[0]}", f"- 공정: {bs[1]}", f"- 일꾼: {bs[2]}", f"- 완공 의식: {bs[3]}", "",
              "| 공정 | 화면에 보이는 것 | 일꾼 동작 | 걸리는 시간(게임일) |", "|---|---|---|---|",
              "| ① 측량 | 말뚝·줄 띄우기, 설계도 탁자 | 감독이 도면 확인, 측량꾼 줄 당기기 | 1 |",
              "| ② 터 닦기 | 흙 파기, 흙더미, 수레 | 삽질·수레 끌기(2~3명) | 1~2 |",
              f"| ③ 기초 | 주춧돌/말뚝, 재료 더미({bs[0].split(',')[0]}) | 돌 나르기·망치질 | 2 |",
              "| ④ 골조·비계 | 기둥·들보 + 나무 비계, 도르래 기중기 | 목수 톱질·망치, 짐꾼 사다리 오르기 | 2~3 |",
              "| ⑤ 벽 | 벽이 아래부터 차오름(절반→가득) | 석공/미장 동작 | 2~3 |",
              "| ⑥ 지붕 | 지붕틀 → 기와/이엉 잇기 | 지붕 위 일꾼 2명 | 2 |",
              "| ⑦ 마감 | 창·문·간판·색칠, 비계 철거 | 붓질·청소 | 1 |",
              f"| ⑧ 완공 | 비계 사라짐, 깃발·꽃장식, {bs[3]} | 주민 모여 박수, 감독 인사 | 행사 1일 |", "",
              "- 일꾼 수: 1단계 건물 2명 → 5단계 건물 6~8명. 감독 1명(도면), 목수·석공·짐꾼 구분.",
              "- 공사 중 소리: 망치·톱·수레바퀴(기존 효과음). 밤에는 작업 중단, 현장 등불만.",
              "- 자금 부족·흉년이면 공사 정지(비계만 남고 일꾼 없음). 재개되면 일꾼 복귀.",
              "- 완공 순간: 건물 등장 연출(먼지 걷힘) + 알림 \"○○ 완공\" + 해당 효과 적용.", ""]
    asset("construction_kit", "construction", 1, "kit", "8k",
          f"Construction site kit for {c['ko']} style: survey stakes and string, dirt piles, foundation stones, timber scaffold modules (1/2/3 floors), wooden pulley crane, material piles of {bs[0]}, wheelbarrow, ladder, plan table.",
          "공사 현장 소품 세트")
    asset("construction_stages", "construction", 1, "per building", "10k",
          f"Generic building in 5 construction stages (foundation, frame+scaffold, half walls, roof framing, finished) in local style: {c['arch']}. Each stage a separate mesh.",
          "공사 단계 5개 메시")
    asset("workers", "people", 1, "R15 outfits", "4k",
          f"Construction worker outfit set (foreman with plan scroll, carpenter, mason, porter) for {c['ko']}: {bs[2]}. Period-accurate clothing accessories only (R15 layered).",
          "공사 일꾼 복장 세트")
    for bid, ko, cat, tier, en, eff in local_cat:
        asset(f"bld_{bid}", "building", tier, "auto", "8k", f"{en}, built in local style: {c['arch']}.", f"{ko}({cat}) {tier}단계")

# ── 구획 세분화·주거 등급·배치 소품·주민 직업·동선 ───────────────────────────
DISTRICTS = [
    # (id, 이름, 위치 규칙, 개방 단계, 건물/필지, 배치 소품, 주민 직업)
    ("harbor", "항만 구역", "부두와 해안선 따라, 광장 동쪽", 1,
     "부두 창고·세관·선원 숙소·밧줄 공장", "화물 상자·통·자루 더미, 기중기, 계류 말뚝, 그물, 수레, 갈매기", "하역꾼·선원·세관원·어부·밧줄공"),
    ("market", "시장 구역", "광장 둘레, 큰길 시작점", 1,
     "가판대 줄·상점 주택·교역소·여관", "천막 가판대·특산물 진열·저울·바구니·손수레·간판·우물", "상인·행상·짐꾼·손님·소매치기 경비"),
    ("civic", "행정·종교 구역", "광장 반대편 높은 곳(언덕이면 꼭대기)", 2,
     "예배소→대사원·시청·학당·의원·도서관", "종탑, 계단, 동상/분수, 벤치, 게시판, 화단", "성직자·관리·학생·의사·경비병"),
    ("craft", "공방 구역", "물가/강가·바람 아래쪽 외곽(냄새·연기)", 2,
     "대장간·목공소·무두질장·양조장·특산물 공방", "작업대·재료 더미·화덕 연기·물레방아·건조대·폐자재", "대장장이·목수·직공·도공·염색공·견습생"),
    ("residential", "주거 구역", "큰길 뒤 골목, 시장·공방 사이", 1,
     "노동자 오두막→장인 주택→상인 연립→부유층 저택", "빨랫줄·화분·장작더미·닭장·벤치·놀이하는 아이·고양이", "주부·아이·노인·야경꾼·물장수"),
    ("elite", "부유층 구역", "광장 가까운 조용한 언덕/물가", 4,
     "부유 상인 저택·정원 주택·관저", "정원 담장·분수·마차·하인·화분 장식", "상인 가족·하인·정원사·마부"),
    ("rural", "농촌·목장 구역", "마을 바깥 테두리", 1,
     "텃밭→밭·목초지·축사·방앗간·곡물 창고", "울타리·건초더미·가축·허수아비·수로·농기구", "농부·목동·방앗간지기·나무꾼"),
    ("defense", "방어 구역", "항구 입구 곶·성문", 2,
     "망루→포대·성벽·병영·전투 본부", "대포·포탄 더미·깃발·초소·훈련 허수아비", "병사·포수·보초·훈련 교관"),
]

HOUSING = [  # 주거 등급: (등급, 개방 단계, 형태, 거주 직업)
    ("노동자 오두막", 1, "1-room cottage with small yard, shared well", "하역꾼·농부·어부"),
    ("장인 주택", 2, "2-storey house with ground-floor workshop", "대장장이·목수·직공"),
    ("상인 연립", 3, "3-storey townhouse with shop front and storage attic", "상인·선장"),
    ("부유층 저택", 4, "detached mansion with garden wall and courtyard", "대상인·관리"),
    ("정원 빌라", 5, "villa with formal garden on the outskirts", "귀족·은행가"),
]

ROUTINE = [  # 시간대별 동선
    ("새벽 5~7시", "어부·하역꾼 집→부두, 빵집 화덕 불, 농부 집→밭, 종 울림"),
    ("오전 7~12시", "상인 집→시장 가판대, 장인 공방 작업, 학생 학당, 공사 현장 일꾼 출근"),
    ("정오", "광장 우물 물 긷기, 노점 식사, 휴식(더운 지역은 낮잠으로 거리 한산)"),
    ("오후 13~18시", "하역·운반 수레(농촌→시장→부두), 관리 순찰, 아이들 골목 놀이"),
    ("저녁 18~21시", "주점 붐빔, 예배/기도, 가로등 점등꾼, 가족 귀가"),
    ("밤 21~5시", "야경꾼 순찰·등불, 주점 몇 명, 고양이·개, 공사 중단(현장 등불)"),
]

# 기후별 날씨·바닥·파티클
WEATHER = {
    "tropical": [("소나기·몬순", "길 웅덩이(물 반사), 흙길 진흙 바퀴자국, 지붕 물받이 낙수", "굵은 빗줄기, 지붕 물튀김, 웅덩이 파문, 짙은 물안개"),
                 ("무더위", "마른 흙길 갈라짐, 먼지", "열기 아지랑이, 날벌레"),
                 ("태풍(드묾)", "쓰러진 가판대 천막, 흩어진 잎", "강풍 비, 잎 날림, 파도 물보라")],
    "temperate_south": [("건기·맑음", "흙먼지, 흰 회벽 반사광", "바람 먼지, 꽃가루"),
                        ("가을비", "포석 젖은 반사, 배수로 물줄기", "가는 비, 처마 낙수"),
                        ("시로코·열풍", "모래 얇게 쌓임", "황사 바람")],
    "temperate_north": [("비", "포석·자갈 젖은 반사, 길 웅덩이, 진흙 자국", "비 줄기, 웅덩이 파문, 처마 낙수"),
                        ("안개", "젖은 바닥", "낮게 깔린 안개, 가로등 빛 번짐"),
                        ("겨울 눈", "지붕·길가·울타리 위 눈 쌓임(단계적), 밟힌 길 눈 녹음", "눈송이, 굴뚝 연기 짙어짐, 입김")],
    "cold": [("폭설", "지붕·길·광장 두꺼운 눈, 썰매 자국, 얼음 부두", "눈보라, 바람에 날리는 눈가루"),
             ("서리", "하얀 서리 바닥, 얼어붙은 웅덩이", "입김, 반짝이는 서리"),
             ("해빙기", "질척한 눈녹은 물, 진흙", "낙수, 물방울")],
    "arid": [("모래바람", "길·계단 모래 쌓임, 가판대 천 덮개", "모래 폭풍 파티클, 시야 흐림"),
             ("한낮 더위", "마른 흙·갈라진 바닥", "아지랑이"),
             ("드문 비", "흙길 짙게 젖음, 짧은 웅덩이", "가는 비, 흙냄새 먼지 가라앉음")],
}


def weather_key(lat, culture):
    a = abs(lat)
    if culture in ("desert", "ottoman") and a < 38:
        return "arid"
    if a < 23.5:
        return "tropical"
    if a < 42:
        return "temperate_south"
    if a < 56:
        return "temperate_north"
    return "cold"


def life_section(p, culture, c, asset, lines):
    lines += ["## 5. 구획·주거·배치·주민 동선", "",
              "| 구획 | 위치 | 열리는 단계 | 건물/필지 | 배치 소품 | 주민 직업 |", "|---|---|---|---|---|---|"]
    for did, ko, where, tier, blds, props, jobs in DISTRICTS:
        lines.append(f"| {ko} | {where} | {tier} | {blds} | {props} | {jobs} |")
    goods = p["produces"] or []
    ws = [g for g in goods if g in curated.WORKSHOP][:3]
    theme_ko, _ = theme_of(goods)
    lines += ["", f"**{p['name']} 특색** — 테마 *{theme_ko}*",
              f"- 시장: {', '.join(goods[:4]) or '혼합 상품'} 진열이 중심, 장날엔 가판대 2배",
              f"- 공방: {', '.join(ws) + ' 공방이 줄지어' if ws else '수리·잡화 공방'} (연기·소리·작업 주민)",
              f"- 항만: {'조선소와 밧줄 공장이 붙은 큰 항만' if p['shipyard'] else '작은 잔교와 하역장 위주'}",
              f"- 생활: {c['ko']} 양식 집, 밤 조명 {c['lamp']}, 광장 {c['plaza']}"]
    lines += ["", "### 주거 등급 (구획 안에서 세분화)", "", "| 등급 | 단계 | 형태 | 사는 사람 |", "|---|---|---|---|"]
    for ko, tier, en, who in HOUSING:
        lines.append(f"| {ko} | {tier} | {en} ({c['ko']} 양식) | {who} |")
    lines += ["", "- 배치 규칙: 광장→큰길→골목 순으로 높고 촘촘하게 → 낮고 성기게. 같은 집 연속 금지(색·높이·문 위치 변형).",
              "- 공방 구역은 바람 아래·물가, 부유층은 조용한 언덕/물가, 농촌은 테두리. 구획 사이 작은 골목·계단·다리로 연결.", "",
              "### 하루 동선 (주민 일정)", "", "| 시간 | 움직임 |", "|---|---|"]
    for when, what in ROUTINE:
        lines.append(f"| {when} | {what} |")
    lines += ["", f"- {c['ko']} 생활 특색: 예배 시간·장날·축제일에 광장 인파 증가, 흉년엔 빈 가판대·줄 선 주민.", ""]
    wk = weather_key(p["lat"], culture)
    lines += ["## 6. 날씨·바닥·파티클", "", f"기후 유형: **{wk}**", "",
              "| 날씨 | 바닥 표현 | 파티클·효과 |", "|---|---|---|"]
    for name, ground, fx in WEATHER[wk]:
        lines.append(f"| {name} | {ground} | {fx} |")
    lines += ["", "- 눈은 단계적으로 쌓인다(얇게→덮임→두껍게), 사람 다니는 길은 먼저 녹고 발자국 자국.",
              "- 비 그친 뒤 웅덩이는 서서히 마른다(반사 강도 감소). 진흙길은 수레 바퀴자국이 남는다.",
              "- 모바일은 파티클 수 절반, 원거리 바닥 효과 생략.", ""]
    asset("weather_ground", "texture", 1, "1024 tile", "-",
          f"Tileable ground overlay decals for {wk} weather on {', '.join(c['street'][1:4])} streets: puddles with reflections, wet sheen, wheel ruts in mud, snow cover (3 thickness levels), sand drift, frost. Alpha decals for overlay.",
          "날씨 바닥 오버레이")
    asset("weather_props", "props", 1, "kit", "3k",
          f"Weather props for {c['ko']}: roof snow caps (3 sizes), icicles, gutter downspout splash, puddle meshes, awning rain drips, sand drift piles, covered market stall cloth.",
          "날씨 소품 세트")
    asset("district_props", "props", 1, "kit", "6k",
          f"District prop kit for {c['ko']} port: laundry lines, firewood stacks, chicken coop, flower pots, benches, wells, signposts, carts, barrels, market baskets, notice board, statue base.",
          "구획 생활 소품 세트")
    for ko, tier, en, who in HOUSING:
        asset("house_" + ["worker", "artisan", "merchant", "mansion", "villa"][HOUSING.index((ko, tier, en, who))],
              "house", tier, "auto", "7k", f"{en}, built in local style: {c['arch']}. 3 colour slots.", f"주거 {ko}")

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
        rows.append([pid, name, f"{pid}_{aid}", cat, tier, size, "", COMMON + prompt, note])
        lines.extend([f"#### `{pid}_{aid}` — {note}", f"- {cat} · {tier}단계 · 크기 {size}", "```", COMMON + prompt, "```", ""])

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
    construction_section(p, culture, c, has_palace, asset, lines)
    life_section(p, culture, c, asset, lines)
    lines += ["## 7. 마을 기본 에셋", ""]
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
    lines += ["## 8. 완료 체크", "", "- [ ] 에셋 `assets/inbox/Town/<asset_id>.glb` + `.license.json`(원본·derived)",
              "- [ ] 단계 1~5 Studio 항공 사진: 구역 분리·광장·상징물·방문 건물 위치", "- [ ] 공사 현장 ①~⑧ 공정과 일꾼 동작, 완공 연출 확인", "- [ ] 구획 8종·주거 5등급·하루 동선 확인", "- [ ] 날씨별 바닥(눈·웅덩이·진흙·모래)과 파티클 확인(모바일 절반)", "- [ ] `tests/run.sh` 통과(코드 한도 포함)", ""]
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
