#!/usr/bin/env python3
"""배 디테일·렌더링·등급 기능 지시서 생성기.

출력: docs/ships/
- README.md          공통: 배 부위 체크리스트(선체·포·갑판·선미·선수·삭구·돛·깃발·선원), 질감/PBR, 손상 단계, 항적, LOD·모바일, 코드 위치
- grades.md          등급(class 1~4)·대포 5종·선체 보강 3단계·역할 특성별 기능 세분화와 외형 변화
- <ship_id>.md       33척: 현재 상태 점검(모델 출처·빌린 외형 여부) → 보완점 → 부위별 디테일 → 등급별 외형/기능 → 프롬프트
- ship_prompts.csv   가공 목표 프롬프트
데이터: Ships.luau(능력치·등급·문화권·특성), AssetIds(Naval/<id>-v5 등록 여부), NavalBattle(PLAYER_SHIP·대포 연출)
"""
import csv
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
SHARED = os.path.join(ROOT, "src", "ReplicatedStorage", "Shared")
OUT = os.path.join(ROOT, "docs", "ships")
sys.path.insert(0, HERE)
import gen_port_asset_prompts as curated  # noqa: E402

COMMON = curated.COMMON + ("Derive from the approved registered ship model (Naval/<id>-v5 or Kenney Pirate Kit hull) and refine it; "
                           "record source as derived in <asset_id>.license.json. ")

CLASS = {
    1: ("1급 소형", "1 deck, 1-2 masts, open waist", "선회포·소형포 4~6문, 단층 갑판", "근해 교역·정찰, 면허 불필요"),
    2: ("2급 중형", "1.5-2 decks, 2-3 masts, quarterdeck", "포갑판 1층 + 상갑판 포, 10~16문", "원양 교역·호위, 항만청 면허"),
    3: ("3급 대형", "2 gun decks, 3 masts, forecastle + quarterdeck + poop", "포갑판 2층 20~40문, 선미 갤러리", "함대 주력·대량 수송"),
    4: ("4급 특수·기함", "3 decks or steam/iron hull, flagship ornament", "포갑판 3층 또는 증기 포탑, 대형 장식", "기함·결전·증기/장갑"),
}

ROLE_KO = {"trade": "교역", "war": "전투", "explore": "탐험", "balanced": "균형", "raider": "습격", "escort": "호위",
           "transport": "수송", "flagship": "기함", "steam": "증기", "coastal": "연안", "pirate": "해적"}

ANATOMY = [
    ("선체(hull)", "판재 이음선이 보이는 클링커/카벨 판, 흘수선 위 띠(wale) 2~3줄, 흘수선 아래 구리 피복(초록 녹)·타르 검정, 선체 곡선(텀블홈)"),
    ("포문·대포(guns)", "포문 뚜껑(안쪽 빨강), 포차(바퀴 4개 나무 포가), 포신 길이로 종류 구분(장포 길게·카로네이드 짧고 굵게), 갑판별 포 줄"),
    ("갑판(deck)", "갑판 판자 줄, 해치·격자 덮개, 캡스턴(닻감개), 종(벨프리), 나침함(비너클), 키(타륜)/키손잡이(틸러), 보트 거치, 물통·밧줄 사리"),
    ("선미(stern)", "선미루 갤러리(창 줄·발코니), 선미 등불 1~3개, 조각 장식·국가 문장, 타(러더)와 경첩, 선장실 창 불빛(밤)"),
    ("선수(bow)", "선수상(피겨헤드: 나라·배 성격), 제1사장(바우스프릿)·지브붐, 닻 2개(캣헤드에 매달림), 선수루"),
    ("삭구(rigging)", "돛대 3단(하·중·상), 활대(야드), 횡삭·줄사다리(래틀린), 지삭, 블록(도르래), 톱(망대)"),
    ("돛(sails)", "캔버스 천 결·꿰맨 패널선, 낡은 얼룩·덧댄 천, 바람 받으면 부풀기, 축범(리프) 상태, 문화권 돛(삼각·대나무 살 돛·러그)"),
    ("깃발·장식", "국기(선미)·장기(돛대 꼭대기 긴 깃)·신호기, 등급 높을수록 장식 금박·조각 증가"),
    ("선원", "갑판 위 선원 6~20명(역할 포즈: 포수·키잡이·돛 담당·견시), 전투 시 포 옆 배치"),
    ("손상 단계", "0% 깨끗 → 30% 판재 구멍·밧줄 끊김 → 60% 돛 찢김·연기 → 85% 돛대 부러짐·불길·기울기 → 침몰(선수부터 가라앉고 거품·잔해)"),
    ("항적·물", "선수 물보라, 선체 옆 거품 띠, 선미 항적(속도 비례), 정지 시 잔물결"),
]

PBR = [
    ("나무 선체", "albedo 따뜻한 갈색 변주(판마다 명도 ±8%), roughness 0.7~0.85, normal 판 이음·나뭇결"),
    ("타르·흘수선", "검정/짙은 갈색, roughness 0.5(약간 광택), 물 닿는 곳 젖은 어두움"),
    ("구리 피복", "구리색~청록 녹 혼합, metallic 0.6, roughness 0.4~0.6, 판 리벳"),
    ("철·대포", "검은 주철, metallic 0.8, roughness 0.5, 포구 그을음"),
    ("돛 캔버스", "미색~회갈, 천 결 normal, 얼룩·덧댄 천, 반투명감 없이 두께감"),
    ("밧줄", "꼬인 섬유 normal, 갈색 roughness 0.9"),
    ("금박 장식", "금색 metallic 0.9 roughness 0.3 — 4급 기함만 넓게, 1급은 없음"),
    ("페인트", "선체 띠·포문 테두리 나라 색(노랑·빨강·파랑), 벗겨진 자국"),
]


def read(name):
    return open(os.path.join(SHARED, name), encoding="utf-8").read()


def load_ships():
    src = read("Ships.luau")
    ships = []
    for m in re.finditer(r'(\b[a-z_0-9]+) = \{\s*id = "([a-z_0-9]+)"(.*?)\n\t?\}?,?\n', src, re.S):
        pass
    # 단순 파서: id = "..." 가 있는 블록을 다음 id 전까지로 자른다
    starts = [m.start() for m in re.finditer(r'\bid = "[a-z_0-9]+"', src)]
    for i, s in enumerate(starts):
        block = src[s: starts[i + 1] if i + 1 < len(starts) else len(src)]
        if "class =" not in block or "cannons =" not in block:
            continue
        g = lambda k, d=None: (re.search(k + r' = ("?)([^",}\n]+)\1', block) or [None, None, d])[2]
        sid = re.search(r'id = "([a-z_0-9]+)"', block).group(1)
        regions = re.search(r'regions = \{([^}]*)\}', block)
        role = re.search(r'role = "([a-z_]+)"', block)
        ships.append(dict(id=sid, name=g("name"), cls=int(g("class", "1")), cannons=int(g("cannons", "0")), crew=int(g("crew", "0")),
                          hull=int(g("hull", "100")), speed=float(g("speed", "6")), cargo=int(g("cargo", "20")),
                          steam=g("steam") == "true", rowed="rowed = true" in block, visual=g("visual"),
                          nation=g("nation"), summary=g("summary", ""),
                          regions=re.findall(r'"([a-z_]+)"', regions.group(1)) if regions else [],
                          role=role.group(1) if role else None, tint=re.search(r'tint = \{([^}]*)\}', block)))
    traits = dict((k, (r, w)) for k, r, w in re.findall(r'\n\t([a-z_0-9]+) = \{ role = "([^"]+)", weak = "([^"]+)"', src))
    for s in ships:
        if s["id"] in traits:
            s["role"], s["weak"] = traits[s["id"]]
        else:
            s["weak"] = "-"
    return ships


def load_cannons():
    src = read("Ships.luau")
    return re.findall(r'\{ id = "([a-z_]+)", name = "([^"]+)", price = (\d+), mult = ([\d.]+)[^}]*summary = "([^"]+)"', src)


def main():
    os.makedirs(OUT, exist_ok=True)
    ships = load_ships()
    assets = read("AssetIds.luau")
    cannons = load_cannons()
    rows = []

    def prompt(aid, cat, text, note):
        rows.append([aid, cat, COMMON + text, note])

    R = ["# 배 디테일·렌더링 지시서", "", "> 대상: 해전(NavalBattle)·항해(VoyageScene)·조선소 미리보기에 쓰는 모든 배. 먼저 `docs/RULES.md`.", "",
         "## 현재 점검 요약", "",
         f"- 등록 배 {len(ships)}척. 전용 V5 모델이 등록된 배와, 다른 배 모델을 **빌려 색만 바꾼(visual+tint)** 배가 섞여 있다.",
         "- 빌린 외형 배는 문화권 특징(삼각돛·대나무 살 돛·노·선체 모양)이 안 보인다 → 최우선 보완.",
         "- 부위 디테일(포차·선미 갤러리·삭구·선수상)과 손상 단계·질감이 등급 차이를 못 보여 준다.", "",
         "## 부위별 체크리스트", "", "| 부위 | 표현 기준 |", "|---|---|"]
    R += [f"| {a} | {b} |" for a, b in ANATOMY]
    R += ["", "## 질감(PBR)", "", "| 재질 | 기준 |", "|---|---|"] + [f"| {a} | {b} |" for a, b in PBR]
    R += ["", "## 렌더링·성능", "",
          "- LOD 3단계: 근(전체 삭구·선원) / 중(삭구 단순화·선원 제거) / 원(실루엣 메시). 모바일은 V5-mobile 사용.",
          "- 돛 흔들림은 본(bone) 2~3개 또는 메시 교체 3단계(축범·반·만범). 깃발은 짧은 흔들림.",
          "- 밤: 선미 등불·선장실 창 PointLight 1~2개만(성능). 포구 섬광은 짧게.",
          "- 색 보정은 tint 대신 재질 슬롯(선체 띠·돛·깃발)으로 나라 색 적용.", "",
          "## 코드 위치", "", "- 능력치/등급/개조: `Shared/Ships.luau` (Cannons 5종, Plating 3단계, refit)",
          "- 해전 모델 선택: `Shared/NavalBattle.luau` `PLAYER_SHIP`·`placeShip`(Naval/<id>-v5, -mobile), 대포 연출 `NC`(선회포·중포·장포·구포)",
          "- 모델 등록: `assets/inbox/Naval/<id>-v5.glb` → AssetIds `Naval/<id>-v5`", "",
          "## 파일", "", "- `grades.md` 등급·개조 기능 세분화 · `<배id>.md` 배별 지시서 · `ship_prompts.csv`", ""]
    open(os.path.join(OUT, "README.md"), "w", encoding="utf-8").write("\n".join(R))

    G = ["# 등급·개조별 기능과 외형", "", "## 배 등급(class)", "", "| 등급 | 구조 | 무장 | 역할·조건 | 외형 차이 |", "|---|---|---|---|---|"]
    for k, (ko, struct, arm, role) in CLASS.items():
        G.append(f"| {ko} | {struct} | {arm} | {role} | 장식 {['없음', '간단한 선미 조각', '선미 갤러리·선수상', '금박·3층 갤러리·대형 깃발'][k - 1]} |")
    G += ["", "## 대포 5종 (Ships.Cannons) — 기능과 보이는 모습", "", "| 대포 | 가격 | 위력 | 기능 | 외형 |", "|---|---|---|---|---|"]
    look = {"basic": "짧은 주철 포·작은 포차", "culverin": "긴 포신·좁은 포구, 사거리↑(장포 연출)", "demi": "굵은 중포·큰 포차, 반동 큼",
            "carronade": "짧고 굵은 통·미끄럼 포가, 근거리 산탄 연기 큼", "steam_gun": "황동 압력통·배관이 붙은 포, 하얀 증기"}
    for cid, name, price, mult, summ in cannons:
        G.append(f"| {name} | {price} | +{int(float(mult) * 100)}% | {summ} | {look.get(cid, '')} |")
    G += ["", "## 선체 보강 3단계 (Ships.Plating)", "", "| 단계 | 기능 | 외형 |", "|---|---|---|",
          "| 목재 보강 | 내구 +8% | 흘수선 위 덧댄 판·볼트 |", "| 구리 피복 | 내구 +16%, 속도 +3% | 흘수선 아래 구리판(초록 녹) |",
          "| 철판 장갑 | 내구 +30%, 속도 -4% (증기 기술) | 검은 철판·리벳 띠, 포문 둘레 강화 |", "",
          "## 역할 특성(trait)별 세분화", "", "| 역할 | 강점 | 약점 | 보이는 표시 |", "|---|---|---|---|",
          "| 교역 | 화물·관세 | 포·근접 | 넓은 선복, 갑판 화물 상자, 큰 해치 |", "| 전투 | 포·근접 | 화물 | 포문 줄·두꺼운 띠, 전투 깃발 |",
          "| 탐험 | 탐험·장거리 | 화물 | 측량 기구·망원경 든 견시, 작은 보트 2척 |", "| 습격/해적 | 회피·기습 | 내구 | 낮은 선체·검은 돛 옵션·해골 장식 |",
          "| 호위 | 화물 보호 | 속도 | 선미 신호기 줄·호송 깃발 |", "| 연안·노선 | 얕은 물·무풍 | 폭풍 | 노 구멍 줄·노잡이 |", "| 증기 | 무풍 속도 | 석탄 소모 | 굴뚝 연기·외륜/스크루 물보라 |", "",
          "## 개조 레벨(제안) — 기능 세분화", "", "| 레벨 | 열리는 기능 | 외형 |", "|---|---|---|",
          "| ★1 기본 | 기본 능력치 | 깨끗한 기본형 |", "| ★2 | 돛 개량(순풍 +5%) | 새 돛천·추가 보조돛 |", "| ★3 | 포갑판 확장(포 +2) | 포문 추가·포차 교체 |",
          "| ★4 | 선원실 확장(선원 +10%) / 화물칸 확장 | 선체 조금 길어짐·해치 추가 |", "| ★5 | 고유 특기(역할별: 일제 사격·은밀 항해·대량 하역) | 금박·나라 문장·고유 깃발 |", ""]
    open(os.path.join(OUT, "grades.md"), "w", encoding="utf-8").write("\n".join(G))

    for s in ships:
        sid = s["id"]
        v5 = f'"Naval/{sid}-v5"' in assets
        custom = f'"Naval/{sid}-custom"' in assets
        borrowed = bool(s["visual"])
        ko, struct, arm, role = CLASS.get(s["cls"], CLASS[1])
        decks = 1 if s["cannons"] <= 8 else 2 if s["cannons"] <= 24 else 3
        issues = []
        if borrowed and not v5:
            issues.append(f"외형을 `{s['visual']}` 모델에서 빌리고 색(tint)만 바꿈 → 고유 모델 필요(최우선)")
        if not v5:
            issues.append("V5 상세 모델 미등록 → 근·중·원 LOD 포함 상세 모델 제작")
        if s["rowed"]:
            issues.append("노 젓는 배인데 노 구멍·노·노잡이 표현 확인 필요")
        if s["steam"]:
            issues.append("증기선: 굴뚝 연기·외륜/스크루 물보라·석탄 상자 표현")
        issues.append(f"대포 {s['cannons']}문이 포문 수와 일치해야 함(갑판 {decks}층 기준 배치)")
        issues.append("선미 갤러리·선수상·삭구 밀도가 등급(" + ko + ")에 맞는지 확인")
        L = [f"# {s['name']} (`{sid}`) — 배 지시서", "",
             "| 항목 | 값 |", "|---|---|",
             f"| 등급 | {ko} — {struct} |", f"| 능력 | 화물 {s['cargo']} · 속도 {s['speed']}노트 · 내구 {s['hull']} · 대포 {s['cannons']}문 · 선원 {s['crew']} |",
             f"| 역할 | {s['role'] or '-'} (약점: {s['weak']}) |", f"| 판매 | {', '.join(s['regions']) or '어디서나'}{' · 국가 전용 ' + s['nation'] if s['nation'] else ''} |",
             f"| 설명 | {s['summary']} |",
             f"| 현재 모델 | {'전용 V5 등록' if v5 else '없음'}{' · custom 원본' if custom else ''}{' · 빌린 외형 ' + s['visual'] if borrowed else ''} |", "",
             "## 보완점", ""] + [f"- {x}" for x in issues] + ["",
             "## 부위별 디테일 지시", "",
             f"- 선체: {struct}, {('노 구멍 줄과 노잡이 갑판' if s['rowed'] else '포문 ' + str(s['cannons']) + '개를 ' + str(decks) + '층에 나눠')}",
             f"- 포: 기본 {arm}. 대포 개조(장포·중포·카로네이드·증기포)에 따라 포신 모양 교체",
             f"- 갑판: 캡스턴·해치·비너클·{'타륜' if s['cls'] >= 2 else '틸러'}·보트 {1 if s['cls'] == 1 else 2}척, 화물 {'많이' if s['cargo'] >= 40 else '조금'}",
             f"- 선미: {['선미 등불 1개·간단한 판', '선미 창 1줄·등불 2개', '선미 갤러리 2줄·조각·등불 3개', '갤러리 3줄·금박·대형 문장'][s['cls'] - 1]}",
             f"- 선수: {['작은 선수상 없음', '단순 선수상', '나라 상징 선수상', '대형 금박 선수상'][s['cls'] - 1]}, 닻 2개",
             f"- 삭구·돛: {'증기 굴뚝 + 보조 돛' if s['steam'] else '문화권 돛 형태 반영'}, 낡은 정도는 등급 낮을수록↑",
             "- 손상 단계·항적·PBR은 README 기준", "",
             "## 개조·등급 외형 변화", "",
             "- 대포 교체 → 포신 모양, 선체 보강 → 덧판/구리/철판, ★레벨 → grades.md 표대로 장식·돛·포문 추가", ""]
        open(os.path.join(OUT, sid + ".md"), "w", encoding="utf-8").write("\n".join(L))
        prompt(f"ship_{sid}_v5", "ship", f"Detailed {s['name']} ({sid}) sailing ship, {struct}, {s['cannons']} guns on {decks} deck(s), "
               f"{'oars and rower benches, ' if s['rowed'] else ''}{'funnel and paddle wheels, ' if s['steam'] else ''}"
               f"period-accurate {', '.join(s['regions']) or 'European'} style, stern details and figurehead per class {s['cls']}, "
               "separate meshes: hull, sails (3 states), rigging, guns, deck props; 3 LODs.", f"{s['name']} 상세 모델")
        prompt(f"ship_{sid}_damage", "ship", f"Damage state kit for {s['name']}: hull holes decals, torn sails, broken mast pieces, fire/smoke anchor points.", f"{s['name']} 손상 세트")
    with open(os.path.join(OUT, "ship_prompts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["asset_id", "category", "prompt_en", "notes_ko"])
        w.writerows(rows)
    print(f"ships={len(ships)} prompts={len(rows)}")


if __name__ == "__main__":
    main()
