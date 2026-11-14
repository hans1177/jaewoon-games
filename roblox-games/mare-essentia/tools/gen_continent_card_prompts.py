#!/usr/bin/env python3
"""대륙 카드(유럽·동아시아·중동·신대륙·아프리카·동남아·미지의 땅)와 지도자의 그림 프롬프트 목록 생성.
사용: python3 tools/gen_continent_card_prompts.py
  → docs/continent_card_art_prompts.csv (카드 244장), docs/leader_art_prompts.csv (지도자)
BoardingCards.luau 의 이름·분류·설명을 읽어 카드마다 복붙용 프롬프트를 만든다."""
import csv, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "src/ReplicatedStorage/Shared/BoardingCards.luau").read_text(encoding="utf-8")

CULTURE = {
    "eu": "유럽(15~19세기 항구·궁정·전장)", "ea": "동아시아(중국·한반도·일본·류큐)", "me": "중동·페르시아·오스만",
    "nw": "신대륙(마야·아즈텍·잉카·카리브·북미 원주민)", "af": "아프리카(서·동·북아프리카, 스와힐리 해안)",
    "sa": "동남아·인도양(말레이·크메르·촐라·무굴·말라바르)", "lo": "전설과 잃어버린 문명(상상 속 장면)",
}
HINT = {
    "선박": "배 한 척의 전신, 약간 비스듬한 측면, 돛·선체 구조가 또렷하게. 그 문화권의 실제 배 형태를 따른다",
    "유물": "박물관 유물 한 점을 정면에서 크게, 질감과 무늬가 또렷하게",
    "동물": "동물 도감 도판처럼 몸 전체가 보이는 동물 한 마리, 서식지를 옅게",
    "지형·원더": "유적·지형 전경, 옛 여행기 삽화처럼 넓은 구도",
    "사건": "역사적 사건의 한 장면을 상징하는 구도, 사람은 작게 또는 뒷모습",
    "기술": "그 기술을 보여 주는 도구·장치 한 점과 사용하는 손",
    "인물": "역사 인물을 상징하는 소품·복식·실루엣 중심(얼굴을 또렷하게 그리지 않는다: 뒷모습·그림자·투구)",
    "병종": "그 병종의 장비를 갖춘 병사 한 명",
    "미스터리": "수수께끼 같은 장면, 안개와 그림자",
    "전설 생물": "전설 속 생물이 바다·하늘 위에 나타난 장면, 옛 괴물 삽화처럼",
}
MOTION = {"fire": "불꽃이 번쩍이는", "storm": "폭풍·물보라가 이는", "wind": "바람에 흔들리는", "board": "접현·돌격하는",
          "scout": "먼 곳을 살피는", "clear": "구름이 걷히는", "guard": "방어하는", "slash": "베는", "thrust": "찌르는",
          "gallop": "달리는", "pounce": "덮치는", "heal": "치유하는", "retreat": "물러나는", "fog": "안개가 흐르는",
          "command": "명령을 내리는", "aim": "겨누는"}
STYLE = ("17세기 동판화 도판 느낌의 세피아 톤 그림, 낡은 양피지 질감, 가는 선 음영, 4:3 가로 구도, "
         "대상 하나를 중앙에 크게, 글자·숫자·서명·워터마크·테두리 절대 없음, 현대 물건·상표 없음")

rows = []
for kind in ("Units", "Specials"):
    for blk in re.split(r"(?m)^(?=B\.%s\.)" % kind, src):
        m = re.match(r'B\.%s\.((?:eu|ea|me|nw|af|sa|lo)_\d\d) = \{ id="[^"]+", name="([^"]+)", category="([^"]+)"(?:, lore="([^"]*)")?' % kind, blk)
        if not m:
            continue
        cid, name, cat, lore = m.groups()
        mo = re.search(r'motion="(\w+)"', blk)
        art = re.search(r'art="([^"]+)"', blk)
        has = bool(art and not art.group(1).startswith("CardArt/event_chart_") and art.group(1) not in ("CardArt/event_calm_seas", "CardArt/event_title_ship", "CardArt/event_storm"))
        lore = lore or ""
        prompt = f"{name}. {lore}. {CULTURE[cid[:2]]} 문화권 배경. {HINT.get(cat, '대상 하나')}. {STYLE}"
        rows.append([cid, name, cat, "주제 그림 연결됨(맞는지 확인 필요)" if has else "없음(대륙 지도 공용)", MOTION.get(mo.group(1), "은은히 움직이는") if mo else "", prompt])
<<<<<<< HEAD
rows.sort(key=lambda r: (r[2], r[0]))  # 분류별로 묶고, 안에서는 대륙 순
=======
rows.sort()
>>>>>>> origin/main
out = ROOT / "docs/continent_card_art_prompts.csv"
with out.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["card_id", "name", "category", "현재 그림", "게임 안 움직임", "prompt"])
    w.writerows(rows)
print(out, len(rows), "cards;", sum(1 for r in rows if r[3].startswith("없음")), "need art")

leaders = re.findall(r'id = "(\w+)", name = "([^"]+)", text = "([^"]*)"[^}]*?(?:faction = "(\w+)", era = "([^"]+)")', src)
LSTYLE = ("17세기 동판화 도판 느낌의 세피아 톤, 낡은 양피지 질감, 가는 선 음영, 세로 3:4, 전신, 역동적인 자세, "
          "글자·서명·워터마크·테두리 없음. 그 시대 복식과 무기를 역사적으로 정확하게")
FAC = {"europe": "유럽", "east_asia": "동아시아", "middle_east": "중동", "new_world": "신대륙", "africa": "아프리카", "southeast_asia": "동남아"}
lo = ROOT / "docs/leader_art_prompts.csv"
with lo.open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["leader_id", "name", "faction", "era", "prompt"])
    for lid, name, text, fac, era in leaders:
        w.writerow([lid, name, FAC.get(fac, fac), era, f"{name}({FAC.get(fac, fac)} {era}). 지도자 카드 그림: 말이나 전차·배 위, 또는 군대 앞에 선 전신 구도. {LSTYLE}"])
print(lo, len(leaders), "leaders")
<<<<<<< HEAD

# 분류별 제작 안내 (docs/CARD_ART_BY_CATEGORY.md)
from collections import defaultdict
by = defaultdict(list)
for r in rows:
    by[r[2]].append(r)
CONT = {"eu": "유럽", "ea": "동아시아", "me": "중동", "nw": "신대륙", "af": "아프리카", "sa": "동남아", "lo": "미지의 땅"}
md = ["# 대륙 카드 그림 — 분류별 제작 목록", "", "자동 생성 (`python3 tools/gen_continent_card_prompts.py`). 프롬프트 전문은 `continent_card_art_prompts.csv`.",
      "한 분류는 한 번에 몰아서 만든다 (같은 분류는 같은 느낌으로 통일). 그림은 가만히 있는 한 장이면 되고 움직임은 게임이 입힌다.", ""]
for cat, lst in by.items():
    need = [r for r in lst if r[3].startswith("없음")]
    md.append(f"## {cat} — {len(lst)}장 (그림 필요 {len(need)}장)")
    md.append(f"- 만드는 법: {HINT.get(cat, '대상 하나')}")
    cont = defaultdict(list)
    for r in lst:
        cont[CONT[r[0][:2]]].append(f"{r[1]}{'' if r[3].startswith('없음') else '(연결됨)'}")
    for c, names in cont.items():
        md.append(f"- {c}: " + ", ".join(names))
    md.append("")
(ROOT / "docs/CARD_ART_BY_CATEGORY.md").write_text("\n".join(md), encoding="utf-8")
print("CARD_ART_BY_CATEGORY.md written")
=======
>>>>>>> origin/main
